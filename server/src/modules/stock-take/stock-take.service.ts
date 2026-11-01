// Bulk stock take: start a count, record physical counts, then "Approve & Take All Stocks at Once".
//
// How variance works
//   When a count is entered we store the system balance at that moment (systemQuantity).
//   variance = counted - systemQuantity. On approval the variance is ADDED to the live balance,
//   so anything sold or moved between counting and approval is kept, not overwritten.
//
// Approval runs in ONE transaction: every counted line is adjusted, a STOCKTAKE_ADJUST ledger entry is
// written for each change, the report totals and the new stock valuation are frozen on the session.
// Either all of it commits or none of it does.
import { Decimal, prisma, type Tx } from "../../db.js";
import type { StockTakeSession } from "../../generated/prisma/client.js";
import { assertCan, PERM, type Actor } from "../../http/auth.js";
import { conflict, notFound, unprocessable } from "../../http/errors.js";
import { audit } from "../../lib/audit.js";
import { lockKey, nextDailyNumber } from "../../lib/numbering.js";
import { money, ZERO } from "../../lib/quantity.js";
import { withTx } from "../../lib/tx.js";

/** Department kinds that hold stock and can be counted. */
const STOCK_KINDS = ["STORE", "OUTLET"] as const;
const key = (departmentId: string, stockItemId: string) => `${departmentId}|${stockItemId}`;

export interface StartStockTakeInput {
  /** null = all departments that hold stock. */
  departmentId: string | null;
  /** Treat items nobody counted as counted at zero when approving. */
  uncountedAsZero: boolean;
  note?: string;
}

export interface CountInput {
  departmentId: string;
  stockItemId: string;
  /** null clears an earlier count. */
  countedQuantity: Decimal | null;
  narration?: string;
}

// ---------------------------------------------------------------- helpers

async function lockSession(tx: Tx, id: string): Promise<StockTakeSession> {
  // Row lock: a second approve / count on the same session waits here, then sees the new status.
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "StockTakeSession" WHERE id = ${id} FOR UPDATE`;
  if (!rows.length) throw notFound("Stock take");
  return tx.stockTakeSession.findUniqueOrThrow({ where: { id } });
}

function requireCounting(s: StockTakeSession): void {
  if (s.status === "APPROVED")
    throw conflict("STOCKTAKE_ALREADY_APPROVED", `Stock take ${s.number} is already approved`);
  if (s.status === "CANCELLED") throw conflict("STOCKTAKE_CANCELLED", `Stock take ${s.number} was cancelled`);
}

async function scopeDepartmentIds(tx: Tx, s: Pick<StockTakeSession, "departmentId">): Promise<string[]> {
  if (s.departmentId) return [s.departmentId];
  const ds = await tx.department.findMany({
    where: { active: true, kind: { in: [...STOCK_KINDS] } },
    select: { id: true }
  });
  return ds.map(d => d.id);
}

// ---------------------------------------------------------------- start

export async function startStockTake(input: StartStockTakeInput, actor: Actor) {
  assertCan(actor, PERM.stockCount);
  return prisma.$transaction(async tx => {
    // Serialise starts so two people can't open overlapping counts at the same moment.
    await lockKey(tx, "stocktake.start");

    if (input.departmentId) {
      const d = await tx.department.findUnique({ where: { id: input.departmentId } });
      if (!d || !d.active) throw notFound("Department");
      if (!(STOCK_KINDS as readonly string[]).includes(d.kind))
        throw unprocessable("DEPARTMENT_HOLDS_NO_STOCK", `${d.name} does not hold stock`);
    }

    // One count at a time per department; an all-departments count overlaps with everything.
    const open = await tx.stockTakeSession.findFirst({
      where: {
        status: "COUNTING",
        ...(input.departmentId ? { OR: [{ departmentId: null }, { departmentId: input.departmentId }] } : {})
      },
      include: { department: { select: { name: true } } }
    });
    if (open)
      throw conflict(
        "STOCKTAKE_IN_PROGRESS",
        `Stock take ${open.number} (${open.department?.name ?? "all departments"}) is still being counted. Approve or cancel it first.`,
        { stockTakeId: open.id }
      );

    const number = await nextDailyNumber(tx, "ST", startsWith =>
      tx.stockTakeSession.count({ where: { number: { startsWith } } })
    );
    const session = await tx.stockTakeSession.create({
      data: {
        number,
        departmentId: input.departmentId,
        uncountedAsZero: input.uncountedAsZero,
        note: input.note,
        startedById: actor.id
      }
    });

    // The count sheet: every active item that has a balance row in the departments in scope.
    const deptIds = await scopeDepartmentIds(tx, session);
    const rows = await tx.departmentInventory.findMany({
      where: { departmentId: { in: deptIds }, stockItem: { active: true } },
      select: { departmentId: true, stockItemId: true }
    });
    if (rows.length) await tx.stockTakeItem.createMany({ data: rows.map(r => ({ sessionId: session.id, ...r })) });

    await audit(tx, actor, "stocktake.start", "StockTakeSession", session.id, {
      number,
      departmentId: input.departmentId,
      lines: rows.length
    });
    return { ...session, lines: rows.length };
  });
}

// ---------------------------------------------------------------- counts

export async function recordCounts(sessionId: string, counts: CountInput[], actor: Actor, outerTx?: Tx) {
  assertCan(actor, PERM.stockCount);
  const seen = new Set<string>();
  for (const c of counts) {
    const k = key(c.departmentId, c.stockItemId);
    if (seen.has(k)) throw unprocessable("DUPLICATE_COUNT", "The same item and department appear twice", c);
    seen.add(k);
  }

  return withTx(outerTx, async tx => {
    const s = await lockSession(tx, sessionId);
    requireCounting(s);

    const inScope = new Set(await scopeDepartmentIds(tx, s));
    const outside = counts.filter(c => !inScope.has(c.departmentId));
    if (outside.length)
      throw unprocessable(
        "DEPARTMENT_NOT_IN_STOCKTAKE",
        "Some counts are for departments this stock take does not cover",
        outside.map(c => c.departmentId)
      );

    const itemIds = [...new Set(counts.map(c => c.stockItemId))];
    const known = new Set(
      (await tx.stockItem.findMany({ where: { id: { in: itemIds }, active: true }, select: { id: true } })).map(i => i.id)
    );
    const unknown = itemIds.filter(id => !known.has(id));
    if (unknown.length) throw unprocessable("UNKNOWN_STOCK_ITEM", "Unknown or inactive stock items", unknown);

    // System balance at the moment of counting (0 when the department has never held the item).
    const balances = await tx.departmentInventory.findMany({
      where: { OR: counts.map(c => ({ departmentId: c.departmentId, stockItemId: c.stockItemId })) }
    });
    const balance = new Map(balances.map(b => [key(b.departmentId, b.stockItemId), b.quantity]));
    const now = new Date();

    for (const c of counts) {
      const narration = c.narration === undefined ? {} : { narration: c.narration };
      const data =
        c.countedQuantity === null
          ? { countedQuantity: null, systemQuantity: null, countedById: null, countedAt: null, ...narration }
          : {
              countedQuantity: c.countedQuantity,
              systemQuantity: balance.get(key(c.departmentId, c.stockItemId)) ?? ZERO,
              countedById: actor.id,
              countedAt: now,
              ...narration
            };
      await tx.stockTakeItem.upsert({
        where: {
          sessionId_departmentId_stockItemId: { sessionId, departmentId: c.departmentId, stockItemId: c.stockItemId }
        },
        create: { sessionId, departmentId: c.departmentId, stockItemId: c.stockItemId, ...data },
        update: data
      });
    }
    return { updated: counts.length };
  });
}

// ---------------------------------------------------------------- view / report

export async function getStockTake(id: string) {
  const s = await prisma.stockTakeSession.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      startedBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
      items: {
        include: {
          stockItem: { select: { id: true, code: true, name: true, baseUnit: true, unitCost: true } },
          department: { select: { id: true, name: true } },
          countedBy: { select: { id: true, fullName: true } }
        },
        orderBy: [{ department: { name: "asc" } }, { stockItem: { name: "asc" } }]
      }
    }
  });
  if (!s) throw notFound("Stock take");

  // Approved: frozen values. Counting: a live preview of what approval would do.
  const approved = s.status === "APPROVED";
  let shrinkage = ZERO,
    surplus = ZERO,
    counted = 0;
  const lines = s.items.map(i => {
    const variance = approved
      ? i.varianceQuantity
      : i.countedQuantity && i.systemQuantity
        ? i.countedQuantity.minus(i.systemQuantity)
        : null;
    const unitCost = approved ? i.unitCost : i.stockItem.unitCost;
    const value = variance && unitCost ? money(variance.times(unitCost)) : null;
    if (variance) counted++;
    if (value?.lt(0)) shrinkage = shrinkage.plus(value.neg());
    else if (value) surplus = surplus.plus(value);
    return {
      id: i.id,
      department: i.department,
      stockItem: { id: i.stockItem.id, code: i.stockItem.code, name: i.stockItem.name, baseUnit: i.stockItem.baseUnit },
      systemQuantity: i.systemQuantity,
      countedQuantity: i.countedQuantity,
      varianceQuantity: variance,
      unitCost,
      varianceValue: value,
      countedBy: i.countedBy,
      countedAt: i.countedAt,
      narration: i.narration
    };
  });

  const { items: _items, ...session } = s;
  return {
    ...session,
    summary: approved
      ? {
          lines: lines.length,
          itemsCounted: s.itemsCounted,
          shrinkageValue: s.shrinkageValue,
          surplusValue: s.surplusValue,
          netVarianceValue: s.netVarianceValue,
          stockValueAfter: s.stockValueAfter
        }
      : {
          lines: lines.length,
          itemsCounted: counted,
          uncounted: lines.length - counted,
          shrinkageValue: shrinkage,
          surplusValue: surplus,
          netVarianceValue: surplus.minus(shrinkage),
          preview: true
        },
    lines
  };
}

/** The permanent audit report of an approved stock take: counted lines only. */
export async function getStockTakeReport(id: string) {
  const st = await getStockTake(id);
  if (st.status !== "APPROVED")
    throw conflict("STOCKTAKE_NOT_APPROVED", `Stock take ${st.number} has no report until it is approved`);
  return { ...st, lines: st.lines.filter(l => l.varianceQuantity !== null) };
}

// ---------------------------------------------------------------- approve & take all

export interface ApproveWarning {
  departmentId: string;
  stockItemId: string;
  stockItem: string;
  balanceAfter: string;
}

export async function approveStockTake(id: string, actor: Actor) {
  assertCan(actor, PERM.stockApprove);
  return prisma.$transaction(
    async tx => {
      const s = await lockSession(tx, id);
      requireCounting(s);

      const items = await tx.stockTakeItem.findMany({
        where: { sessionId: id },
        include: { stockItem: { select: { name: true, unitCost: true } } },
        orderBy: [{ departmentId: "asc" }, { stockItemId: "asc" }]
      });
      const deptIds = [...new Set([...(await scopeDepartmentIds(tx, s)), ...items.map(i => i.departmentId)])];

      // Lock every balance in scope: sales and transfers on these rows wait until we commit,
      // so the balances we read are the balances we overwrite.
      await tx.$queryRaw`SELECT 1 FROM "DepartmentInventory" WHERE "departmentId" = ANY(${deptIds}::text[]) FOR UPDATE`;
      const live = new Map(
        (await tx.departmentInventory.findMany({ where: { departmentId: { in: deptIds } } })).map(b => [
          key(b.departmentId, b.stockItemId),
          b.quantity
        ])
      );

      const now = new Date();
      let itemsCounted = 0,
        shrinkage = ZERO,
        surplus = ZERO;
      const warnings: ApproveWarning[] = [];
      const movements: {
        type: "STOCKTAKE_ADJUST";
        departmentId: string;
        stockItemId: string;
        quantity: Decimal;
        unitCost: Decimal;
        balanceAfter: Decimal;
        refType: string;
        refId: string;
        note: string;
        userId: string;
      }[] = [];

      for (const it of items) {
        const k = key(it.departmentId, it.stockItemId);
        const current = live.get(k);
        let counted = it.countedQuantity,
          system = it.systemQuantity,
          countedById = it.countedById,
          countedAt = it.countedAt;
        if (counted === null || system === null) {
          if (!s.uncountedAsZero) continue; // not counted: left exactly as it is
          counted = ZERO;
          system = current ?? ZERO;
          countedById = actor.id;
          countedAt = now;
        }
        itemsCounted++;

        const variance = counted.minus(system);
        const unitCost = it.stockItem.unitCost;
        const value = money(variance.times(unitCost));
        if (value.lt(0)) shrinkage = shrinkage.plus(value.neg());
        else surplus = surplus.plus(value);

        await tx.stockTakeItem.update({
          where: { id: it.id },
          data: {
            countedQuantity: counted,
            systemQuantity: system,
            countedById,
            countedAt,
            varianceQuantity: variance,
            unitCost,
            varianceValue: value
          }
        });

        if (!variance.isZero()) {
          const after = (current ?? ZERO).plus(variance);
          if (after.lt(0))
            warnings.push({
              departmentId: it.departmentId,
              stockItemId: it.stockItemId,
              stockItem: it.stockItem.name,
              balanceAfter: after.toString()
            });
          await tx.departmentInventory.upsert({
            where: { departmentId_stockItemId: { departmentId: it.departmentId, stockItemId: it.stockItemId } },
            create: { departmentId: it.departmentId, stockItemId: it.stockItemId, quantity: after },
            update: { quantity: after }
          });
          live.set(k, after);
          movements.push({
            type: "STOCKTAKE_ADJUST",
            departmentId: it.departmentId,
            stockItemId: it.stockItemId,
            quantity: variance,
            unitCost,
            balanceAfter: after,
            refType: "StockTakeSession",
            refId: s.id,
            note: `Stock take ${s.number}`,
            userId: actor.id
          });
        }
      }

      if (!itemsCounted)
        throw unprocessable(
          "NOTHING_COUNTED",
          "No item has been counted. Enter counts, or start the stock take with uncounted items treated as zero."
        );
      if (movements.length) await tx.stockMovement.createMany({ data: movements });

      // New valuation baseline for the departments in scope.
      const [row] = await tx.$queryRaw<{ value: unknown }[]>`
        SELECT COALESCE(SUM(di.quantity * si."unitCost"), 0) AS value
        FROM "DepartmentInventory" di JOIN "StockItem" si ON si.id = di."stockItemId"
        WHERE di."departmentId" = ANY(${deptIds}::text[])`;
      const stockValueAfter = money(new Decimal(String(row?.value ?? 0)));

      const session = await tx.stockTakeSession.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: actor.id,
          approvedAt: now,
          itemsCounted,
          shrinkageValue: shrinkage,
          surplusValue: surplus,
          netVarianceValue: surplus.minus(shrinkage),
          stockValueAfter
        }
      });
      await audit(tx, actor, "stocktake.approve", "StockTakeSession", id, {
        number: s.number,
        itemsCounted,
        adjustedLines: movements.length,
        shrinkageValue: shrinkage.toString(),
        surplusValue: surplus.toString(),
        stockValueAfter: stockValueAfter.toString()
      });
      return { session, adjustedLines: movements.length, warnings };
    },
    { maxWait: 10_000, timeout: 120_000 }
  );
}

// ---------------------------------------------------------------- cancel

export async function cancelStockTake(id: string, actor: Actor, reason?: string) {
  assertCan(actor, PERM.stockApprove);
  return prisma.$transaction(async tx => {
    const s = await lockSession(tx, id);
    requireCounting(s);
    const session = await tx.stockTakeSession.update({
      where: { id },
      data: { status: "CANCELLED", note: reason ? [s.note, `Cancelled: ${reason}`].filter(Boolean).join("\n") : s.note }
    });
    await audit(tx, actor, "stocktake.cancel", "StockTakeSession", id, { number: s.number, reason });
    return session;
  });
}

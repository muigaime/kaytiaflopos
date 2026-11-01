// Sync operation "pos.sale": a bill rung up on a terminal (paid, part paid, or sent to the kitchen unpaid).
//
// The terminal is trusted for what happened (items, the price it charged, money taken); the server
// recomputes totals and VAT, takes stock from the department through the recipes, records payments,
// links the cashier's open shift and queues the eTIMS receipt.
// Things that already happened are never rejected for business reasons: negative stock, a customer over
// their limit, a missing shift or a reused bill number become WARNINGS for the office to review.
import { z } from "zod";
import { Decimal, type Tx } from "../../../db.js";
import { assertCan, can, PERM, type Actor } from "../../auth/actor.js";
import { conflict, unprocessable } from "../../../http/errors.js";
import { audit } from "../../../lib/audit.js";
import { money, moneySchema, quantitySchema, TAX_RATES, ZERO } from "../../../lib/quantity.js";
import type { SyncContext, Warning } from "../sync.types.js";

export const posSaleSchema = z.object({
  orderId: z.uuid(),
  number: z.string().trim().min(1).max(40),
  departmentId: z.uuid(),
  tableLabel: z.string().trim().max(40).optional(),
  guestName: z.string().trim().max(120).optional(),
  covers: z.int().min(0).max(500).optional(),
  completedAt: z.iso.datetime({ offset: true }),
  items: z
    .array(
      z.object({
        id: z.uuid(),
        menuItemId: z.uuid(),
        quantity: quantitySchema.refine(q => q.gt(0), "Quantity must be above 0"),
        unitPrice: moneySchema,
        discount: moneySchema.default(new Decimal(0)),
        kitchenNote: z.string().trim().max(200).optional()
      })
    )
    .min(1)
    .max(500),
  payments: z
    .array(
      z.object({
        id: z.uuid(),
        method: z.enum(["CASH", "MPESA", "CARD", "DEBTOR", "BANK"]),
        amount: moneySchema.refine(a => a.gt(0), "Amount must be above 0"),
        currency: z.string().length(3).toUpperCase().default("KES"),
        exchangeRate: z
          .union([z.number(), z.string()])
          .transform(v => new Decimal(String(v)))
          .refine(r => r.gt(0), "Exchange rate must be above 0")
          .default(new Decimal(1)),
        reference: z.string().trim().max(60).optional(),
        mpesaPhone: z.string().trim().max(20).optional(),
        customerId: z.uuid().optional()
      })
    )
    .max(20)
    .default([])
});
export type PosSale = z.infer<typeof posSaleSchema>;

export async function applyPosSale(tx: Tx, p: PosSale, actor: Actor, ctx: SyncContext) {
  assertCan(actor, PERM.posSell);
  const warnings: Warning[] = [];

  if (await tx.order.findUnique({ where: { id: p.orderId }, select: { id: true } }))
    throw conflict("ORDER_EXISTS", "A bill with this id is already on the server");

  // Where it was sold.
  const dept = await tx.department.findUnique({ where: { id: p.departmentId } });
  if (!dept || !dept.active || dept.kind !== "OUTLET") throw unprocessable("NOT_AN_OUTLET", "Sales must come from an active outlet");
  if (ctx.terminal.departmentId && ctx.terminal.departmentId !== dept.id)
    throw unprocessable("WRONG_DEPARTMENT", "This terminal is registered to another department");
  if (!can(actor, "*") && !(await tx.userDepartment.count({ where: { userId: actor.id, departmentId: dept.id } })))
    throw unprocessable("NOT_ALLOCATED", `${actor.fullName} is not allocated to ${dept.name}`);

  // What was sold. Name, tax and station come from the server's menu; the price is what was charged.
  const menu = await tx.menuItem.findMany({
    where: { id: { in: [...new Set(p.items.map(i => i.menuItemId))] } },
    include: { recipe: { include: { stockItem: true } } }
  });
  const menuById = new Map(menu.map(m => [m.id, m]));
  const unknown = p.items.filter(i => menuById.get(i.menuItemId)?.departmentId !== dept.id).map(i => i.menuItemId);
  if (unknown.length) throw unprocessable("UNKNOWN_MENU_ITEM", `Items not on the ${dept.name} menu`, unknown);

  let gross = ZERO,
    discount = ZERO;
  const byTaxCode = new Map<string, Decimal>();
  const lines = p.items.map(i => {
    const m = menuById.get(i.menuItemId)!;
    const rate = TAX_RATES[m.taxCode];
    if (rate === undefined) throw unprocessable("UNKNOWN_TAX_CODE", `${m.name} has tax code "${m.taxCode}"`);
    const lineTotal = money(i.quantity.times(i.unitPrice).minus(i.discount));
    if (lineTotal.lt(0)) throw unprocessable("DISCOUNT_TOO_LARGE", `The discount on ${m.name} is more than the line`);
    gross = gross.plus(lineTotal);
    discount = discount.plus(i.discount);
    byTaxCode.set(m.taxCode, (byTaxCode.get(m.taxCode) ?? ZERO).plus(lineTotal));
    return { i, m, rate, lineTotal };
  });
  // VAT is worked out once per tax category on its VAT-inclusive total (as the eTIMS receipt shows it),
  // not rounded line by line.
  let tax = ZERO;
  for (const [code, taxable] of byTaxCode) {
    const rate = new Decimal(TAX_RATES[code]!).div(100);
    tax = tax.plus(money(taxable.minus(taxable.div(rate.plus(1)))));
  }

  // Payments, in KES.
  const payments = p.payments.map(pay => ({ ...pay, amountBase: money(pay.amount.times(pay.exchangeRate)) }));
  const paid = payments.reduce((a, pay) => a.plus(pay.amountBase), ZERO);
  for (const pay of payments.filter(x => x.method === "DEBTOR")) {
    if (!pay.customerId) throw unprocessable("CUSTOMER_REQUIRED", "A customer-account payment needs the customer");
    const c = await tx.customer.findUnique({ where: { id: pay.customerId } });
    if (!c || !c.active) throw unprocessable("UNKNOWN_CUSTOMER", "Unknown or inactive customer account");
  }
  const settled = paid.gte(gross.minus("0.005"));
  if (payments.length && !settled)
    warnings.push({ code: "PART_PAID", message: `KES ${gross.minus(paid).toFixed(2)} is still owed; the bill stays open` });
  if (paid.gt(gross.plus("0.005")))
    warnings.push({ code: "OVERPAID", message: `Payments exceed the bill by KES ${paid.minus(gross).toFixed(2)}` });

  // Bill numbers come from terminals; keep the sale even if two terminals used the same number.
  let number = p.number;
  if (await tx.order.findUnique({ where: { number }, select: { id: true } })) {
    number = `${p.number}-${p.orderId.slice(0, 6).toUpperCase()}`;
    warnings.push({ code: "NUMBER_CHANGED", message: `Bill number ${p.number} was already used; saved as ${number}` });
  }

  const shift = await tx.shift.findFirst({ where: { userId: actor.id, closedAt: null }, select: { id: true } });
  if (!shift) warnings.push({ code: "NO_OPEN_SHIFT", message: `${actor.fullName} had no open shift on the server` });

  const at = new Date(p.completedAt);
  await tx.order.create({
    data: {
      id: p.orderId,
      number,
      status: settled ? "SETTLED" : "OPEN",
      departmentId: dept.id,
      shiftId: shift?.id,
      waiterId: actor.id,
      cashierId: settled ? actor.id : null,
      tableLabel: p.tableLabel,
      guestName: p.guestName,
      covers: p.covers,
      netTotal: gross.minus(tax),
      taxTotal: tax,
      discountTotal: discount,
      grossTotal: gross,
      settledAt: settled ? at : null,
      originTerminalId: ctx.terminal.id,
      createdAt: at,
      items: {
        create: lines.map(({ i, m, rate, lineTotal }) => ({
          id: i.id,
          menuItemId: m.id,
          name: m.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxCode: m.taxCode,
          taxRate: rate,
          discount: i.discount,
          lineTotal,
          station: m.station,
          kitchenNote: i.kitchenNote,
          createdAt: at
        }))
      },
      payments: {
        create: payments.map(pay => ({
          id: pay.id,
          method: pay.method,
          status: "CONFIRMED" as const,
          customerId: pay.customerId,
          shiftId: shift?.id,
          amount: pay.amount,
          currency: pay.currency,
          exchangeRate: pay.exchangeRate,
          amountBase: pay.amountBase,
          reference: pay.reference,
          mpesaPhone: pay.mpesaPhone,
          userId: actor.id,
          originTerminalId: ctx.terminal.id,
          createdAt: at
        }))
      }
    }
  });

  // Customer accounts: the sale happened, so the debt is recorded even past the limit.
  for (const pay of payments.filter(x => x.method === "DEBTOR")) {
    const c = await tx.customer.update({
      where: { id: pay.customerId! },
      data: { balance: { increment: pay.amountBase } }
    });
    if (c.balance.gt(c.creditLimit))
      warnings.push({ code: "OVER_CREDIT_LIMIT", message: `${c.name} now owes KES ${c.balance.toFixed(2)}, above the limit` });
  }

  // Stock: one SALE movement per stock item. Recipe quantity is usable stock; raw stock used = qty / yield.
  const use = new Map<string, { item: (typeof menu)[number]["recipe"][number]["stockItem"]; qty: Decimal }>();
  for (const { i, m } of lines)
    for (const r of m.recipe) {
      const q = i.quantity.times(r.quantity).div(r.stockItem.yieldFactor);
      const prev = use.get(r.stockItemId);
      use.set(r.stockItemId, { item: r.stockItem, qty: (prev?.qty ?? ZERO).plus(q) });
    }
  for (const [stockItemId, { item, qty }] of use) {
    const used = qty.toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
    // Atomic: concurrent sales and an approving stock take (which locks these rows) are applied one after another.
    const [row] = await tx.$queryRaw<{ quantity: unknown }[]>`
      INSERT INTO "DepartmentInventory" ("departmentId", "stockItemId", quantity, "updatedAt")
      VALUES (${dept.id}, ${stockItemId}, ${used.neg().toString()}::numeric, now())
      ON CONFLICT ("departmentId", "stockItemId")
      DO UPDATE SET quantity = "DepartmentInventory".quantity + EXCLUDED.quantity, "updatedAt" = now()
      RETURNING quantity`;
    const after = new Decimal(String(row?.quantity ?? 0));
    await tx.stockMovement.create({
      data: {
        type: "SALE",
        departmentId: dept.id,
        stockItemId,
        quantity: used.neg(),
        unitCost: item.unitCost,
        balanceAfter: after,
        refType: "Order",
        refId: p.orderId,
        note: `Bill ${number}`,
        userId: actor.id,
        originTerminalId: ctx.terminal.id,
        createdAt: at
      }
    });
    if (after.lt(0))
      warnings.push({ code: "NEGATIVE_STOCK", message: `${item.name} in ${dept.name} is now ${after.toString()} ${item.baseUnit}` });
  }

  if (settled)
    await tx.integrationJob.create({
      data: { kind: "ETIMS_SIGN_RECEIPT", refType: "Order", refId: p.orderId, payload: { orderId: p.orderId, reason: "sale" } }
    });
  await audit(tx, actor, "order.synced_sale", "Order", p.orderId, {
    number,
    terminalId: ctx.terminal.id,
    gross: gross.toString(),
    paid: paid.toString(),
    warnings: warnings.map(w => w.code)
  });

  return {
    result: { orderId: p.orderId, number, status: settled ? "SETTLED" : "OPEN", grossTotal: gross, taxTotal: tax, paid },
    warnings
  };
}

import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Decimal, prisma } from "../src/db.js";
import { startStockTake } from "../src/modules/stock-take/stock-take.service.js";
import { registerTerminal, rotateTerminalKey } from "../src/modules/terminals/terminal.service.js";
import { actorFrom, qty, resetDb } from "./helpers.js";

const app = createApp();

async function seedShop() {
  const managerRole = await prisma.role.create({ data: { name: "Manager", isSuperCashier: true, permissions: ["*"] } });
  const cashierRole = await prisma.role.create({ data: { name: "Cashier", permissions: ["pos.sell", "stock.count"] } });
  const viewerRole = await prisma.role.create({ data: { name: "Viewer", permissions: [] } });
  const managerUser = await prisma.user.create({ data: { username: "peter", fullName: "Peter Mwangi", roleId: managerRole.id } });
  const cashier = await prisma.user.create({ data: { username: "wanjiru", fullName: "Wanjiru Kamau", roleId: cashierRole.id } });
  const viewer = await prisma.user.create({ data: { username: "guest", fullName: "Visitor", roleId: viewerRole.id } });

  const bar = await prisma.department.create({ data: { name: "Bar", kind: "OUTLET" } });
  const kitchen = await prisma.department.create({ data: { name: "Kitchen", kind: "OUTLET" } });
  await prisma.userDepartment.create({ data: { userId: cashier.id, departmentId: bar.id } });

  const whisky = await prisma.stockItem.create({ data: { code: "WHS", name: "Whiskey", baseUnit: "ml", unitCost: 4 } });
  const tusker = await prisma.stockItem.create({ data: { code: "TSK", name: "Tusker", baseUnit: "pc", unitCost: 180 } });
  const beef = await prisma.stockItem.create({
    data: { code: "BEEF", name: "Beef", baseUnit: "g", unitCost: new Decimal("0.8"), yieldFactor: new Decimal("0.85") }
  });
  await prisma.departmentInventory.createMany({
    data: [
      { departmentId: bar.id, stockItemId: whisky.id, quantity: 7500 },
      { departmentId: bar.id, stockItemId: tusker.id, quantity: 96 },
      { departmentId: kitchen.id, stockItemId: beef.id, quantity: 3500 }
    ]
  });
  const menu = (name: string, departmentId: string, price: number, station: "KOT" | "BOT", recipe: [string, number][]) =>
    prisma.menuItem.create({
      data: {
        name,
        departmentId,
        category: "Test",
        price,
        station,
        recipe: { create: recipe.map(([stockItemId, quantity]) => ({ stockItemId, quantity })) }
      }
    });
  const shot = await menu("Whiskey Shot", bar.id, 300, "BOT", [[whisky.id, 25]]);
  const beer = await menu("Tusker Lager", bar.id, 350, "BOT", [[tusker.id, 1]]);
  const stew = await menu("Beef Stew", kitchen.id, 400, "KOT", [[beef.id, 170]]); // 170 g cooked = 200 g raw at 85%

  const customer = await prisma.customer.create({ data: { name: "Kamau Hardware", creditLimit: 50000, balance: 49000 } });

  const day = await prisma.businessDay.create({ data: { date: new Date(), openedById: managerUser.id } });
  const shift = await prisma.shift.create({
    data: { businessDayId: day.id, userId: cashier.id, openedById: managerUser.id, openingFloat: 2000 }
  });

  const manager = actorFrom(managerUser, ["*"]);
  const barTill = await registerTerminal({ name: "Bar till 1", departmentId: bar.id }, manager);
  const roamer = await registerTerminal({ name: "Office PC", departmentId: null }, manager);
  return { managerUser, cashier, viewer, bar, kitchen, whisky, tusker, beef, shot, beer, stew, customer, shift, barTill, roamer };
}

let s: Awaited<ReturnType<typeof seedShop>>;
beforeEach(async () => {
  await resetDb();
  s = await seedShop();
});
afterAll(() => prisma.$disconnect());

type Term = { id: string; key: string };
const push = (t: Term, ops: object[]) =>
  request(app).post("/api/sync/push").set({ "x-terminal-id": t.id, "x-terminal-key": t.key }).send({ ops });

/** A sale operation; override anything. */
function saleOp(sequence: number, over: Record<string, unknown> = {}, payloadOver: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    sequence,
    type: "pos.sale",
    userId: s.cashier.id,
    clientTime: "2026-10-31T19:05:00+03:00",
    ...over,
    payload: {
      orderId: randomUUID(),
      number: `BAR1-${String(sequence).padStart(5, "0")}`,
      departmentId: s.bar.id,
      tableLabel: "T2",
      completedAt: "2026-10-31T19:05:00+03:00",
      items: [
        { id: randomUUID(), menuItemId: s.shot.id, quantity: 2, unitPrice: 300 },
        { id: randomUUID(), menuItemId: s.beer.id, quantity: 1, unitPrice: 350 }
      ],
      payments: [{ id: randomUUID(), method: "CASH", amount: 950 }],
      ...payloadOver
    }
  };
}

describe("applying offline sales", () => {
  it("records the sale, its VAT, payments, stock, shift and eTIMS receipt", async () => {
    const op = saleOp(1);
    const res = await push(s.barTill, [op]);
    expect(res.status).toBe(200);
    expect(res.body.nextSequence).toBe(2);
    expect(res.body.results[0]).toMatchObject({ status: "APPLIED", warnings: [], result: { status: "SETTLED", grossTotal: "950" } });

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: op.payload.orderId as string },
      include: { items: true, payments: true }
    });
    expect(order).toMatchObject({ number: "BAR1-00001", status: "SETTLED", shiftId: s.shift.id, originTerminalId: s.barTill.id });
    expect(order.taxTotal.toString()).toBe("131.03"); // 950 - 950/1.16
    expect(order.netTotal.toString()).toBe("818.97");
    expect(order.items.map(i => [i.name, i.station, i.lineTotal.toString()]).sort()).toEqual([
      ["Tusker Lager", "BOT", "350"],
      ["Whiskey Shot", "BOT", "600"]
    ]);
    expect(order.payments.map(p => [p.method, p.amountBase.toString(), p.shiftId])).toEqual([["CASH", "950", s.shift.id]]);

    expect(await qty(s.bar.id, s.whisky.id)).toBe("7450");
    expect(await qty(s.bar.id, s.tusker.id)).toBe("95");
    expect(await prisma.stockMovement.count({ where: { refId: order.id, type: "SALE" } })).toBe(2);
    expect(await prisma.integrationJob.count({ where: { refId: order.id, kind: "ETIMS_SIGN_RECEIPT" } })).toBe(1);
  });

  it("uses recipe yields: 170 g of cooked beef takes 200 g of raw beef", async () => {
    await prisma.userDepartment.create({ data: { userId: s.cashier.id, departmentId: s.kitchen.id } });
    const res = await push(
      s.roamer,
      [
        saleOp(
          1,
          {},
          {
            departmentId: s.kitchen.id,
            items: [{ id: randomUUID(), menuItemId: s.stew.id, quantity: 1, unitPrice: 400 }],
            payments: [{ id: randomUUID(), method: "MPESA", amount: 400, reference: "QGH7X2ABC1" }]
          }
        )
      ]
    );
    expect(res.body.results[0].status).toBe("APPLIED");
    expect(await qty(s.kitchen.id, s.beef.id)).toBe("3300");
  });

  it("keeps a sale that already happened, and flags what needs review", async () => {
    const ops = [
      // Customer account pushed past its limit.
      saleOp(1, {}, { payments: [{ id: randomUUID(), method: "DEBTOR", amount: 2000, customerId: s.customer.id }], items: [
        { id: randomUUID(), menuItemId: s.shot.id, quantity: 4, unitPrice: 300 },
        { id: randomUUID(), menuItemId: s.beer.id, quantity: 2, unitPrice: 400 }
      ] }),
      // More beer than the system thinks is there, and a bill number already used.
      saleOp(2, {}, { number: "BAR1-00001", items: [{ id: randomUUID(), menuItemId: s.beer.id, quantity: 100, unitPrice: 350 }], payments: [{ id: randomUUID(), method: "CASH", amount: 35000 }] }),
      // Sent to the kitchen, part paid: stays open.
      saleOp(3, {}, { payments: [{ id: randomUUID(), method: "CASH", amount: 500 }] }),
      // The manager has no shift open.
      saleOp(4, { userId: s.managerUser.id })
    ];
    const res = await push(s.barTill, ops);
    const codes = res.body.results.map((r: { warnings: { code: string }[] }) => r.warnings.map(w => w.code));
    expect(res.body.results.map((r: { status: string }) => r.status)).toEqual(["APPLIED", "APPLIED", "APPLIED", "APPLIED"]);
    // Once beer is below zero, every later sale that takes beer is flagged too.
    expect(codes).toEqual([
      ["OVER_CREDIT_LIMIT"],
      ["NUMBER_CHANGED", "NEGATIVE_STOCK"],
      ["PART_PAID", "NEGATIVE_STOCK"],
      ["NO_OPEN_SHIFT", "NEGATIVE_STOCK"]
    ]);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: s.customer.id } })).balance.toString()).toBe("51000");
    expect(await qty(s.bar.id, s.tusker.id)).toBe("-8"); // 96 - 2 - 100 - 1 - 1
    expect(res.body.results[2].result.status).toBe("OPEN");
  });
});

describe("protocol", () => {
  it("re-sent operations are answered again but not applied twice", async () => {
    const ops = [saleOp(1), saleOp(2)];
    const first = await push(s.barTill, ops);
    const again = await push(s.barTill, ops);
    expect(again.body.results.map((r: { duplicate?: boolean }) => r.duplicate)).toEqual([true, true]);
    expect(again.body.results[0].result).toEqual(first.body.results[0].result);
    expect(again.body.nextSequence).toBe(3);
    expect(await prisma.order.count()).toBe(2);
    expect(await qty(s.bar.id, s.whisky.id)).toBe("7400");
  });

  it("two pushes of the same batch at the same moment apply it once", async () => {
    const ops = [saleOp(1)];
    const [a, b] = await Promise.all([push(s.barTill, ops), push(s.barTill, ops)]);
    expect([a.body.results[0].duplicate ?? false, b.body.results[0].duplicate ?? false].sort()).toEqual([false, true]);
    expect(await prisma.order.count()).toBe(1);
  });

  it("refuses to skip a missing operation, then continues once it arrives", async () => {
    await push(s.barTill, [saleOp(1)]);
    const op2 = saleOp(2),
      op3 = saleOp(3);
    const gap = await push(s.barTill, [op3]);
    expect(gap.body).toMatchObject({ results: [], nextSequence: 2, stopped: { code: "SEQUENCE_GAP", sequence: 2, retryable: true } });
    expect(await prisma.order.count()).toBe(1);
    const filled = await push(s.barTill, [op3, op2]); // order in the batch does not matter
    expect(filled.body.results.map((r: { sequence: number }) => r.sequence)).toEqual([2, 3]);
    expect(filled.body.nextSequence).toBe(4);
  });

  it("rejects a bad operation, records why, and carries on with the next", async () => {
    const bad = saleOp(2, {}, { items: [{ id: randomUUID(), menuItemId: s.stew.id, quantity: 1, unitPrice: 400 }] }); // kitchen item
    const res = await push(s.barTill, [saleOp(1), bad, saleOp(3), { ...saleOp(4), type: "pos.teleport" }]);
    expect(res.body.results.map((r: { status: string }) => r.status)).toEqual(["APPLIED", "REJECTED", "APPLIED", "REJECTED"]);
    expect(res.body.results[1].error.code).toBe("UNKNOWN_MENU_ITEM");
    expect(res.body.results[3].error.code).toBe("UNKNOWN_OPERATION");
    expect(res.body.nextSequence).toBe(5);

    const status = await request(app).get("/api/sync/status").set({ "x-terminal-id": s.barTill.id, "x-terminal-key": s.barTill.key });
    expect(status.body.nextSequence).toBe(5);
    expect(status.body.recentRejections.map((r: { error: string }) => r.error)).toEqual(["UNKNOWN_OPERATION", "UNKNOWN_MENU_ITEM"]);
  });

  it("stops without recording when the server itself fails, so the terminal can retry", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_orders() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'disk full'; END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER fail_orders BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION fail_orders()`);
    const ops = [saleOp(1), saleOp(2)];
    let res;
    try {
      res = await push(s.barTill, ops);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER fail_orders ON "Order"`);
    }
    expect(res.body).toMatchObject({ results: [], nextSequence: 1, stopped: { code: "SERVER_ERROR", sequence: 1, retryable: true } });
    expect(await prisma.syncOperation.count()).toBe(0);
    expect(await qty(s.bar.id, s.whisky.id)).toBe("7500"); // nothing half-applied

    const retry = await push(s.barTill, ops);
    expect(retry.body.results.map((r: { status: string }) => r.status)).toEqual(["APPLIED", "APPLIED"]);
  });

  it("runs other operation types through the same services (stock counts)", async () => {
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, actorFrom(s.managerUser, ["*"]));
    const res = await push(s.barTill, [
      {
        id: randomUUID(),
        sequence: 1,
        type: "stocktake.count",
        userId: s.cashier.id,
        clientTime: "2026-10-31T20:00:00+03:00",
        payload: { stockTakeId: st.id, counts: [{ departmentId: s.bar.id, stockItemId: s.tusker.id, countedQuantity: 90 }] }
      }
    ]);
    expect(res.body.results[0]).toMatchObject({ status: "APPLIED", result: { updated: 1 } });
    const line = await prisma.stockTakeItem.findFirstOrThrow({ where: { sessionId: st.id, stockItemId: s.tusker.id } });
    expect(line.countedQuantity?.toString()).toBe("90");
    expect(line.countedById).toBe(s.cashier.id);
  });
});

describe("who may sync what", () => {
  it("needs a registered, active terminal with the right key", async () => {
    expect((await push({ id: s.barTill.id, key: "wrong" }, [saleOp(1)])).status).toBe(401);
    expect((await push({ id: randomUUID(), key: s.barTill.key }, [saleOp(1)])).status).toBe(401);
    await prisma.terminal.update({ where: { id: s.barTill.id }, data: { active: false } });
    const off = await push(s.barTill, [saleOp(1)]);
    expect(off.status).toBe(403);
    expect(off.body.error.code).toBe("TERMINAL_INACTIVE");
  });

  it("rejects staff without permission, unknown staff, other departments and malformed data", async () => {
    const res = await push(s.barTill, [
      saleOp(1, { userId: s.viewer.id }),
      saleOp(2, { userId: randomUUID() }),
      saleOp(3, {}, { departmentId: s.kitchen.id, items: [{ id: randomUUID(), menuItemId: s.stew.id, quantity: 1, unitPrice: 400 }] }),
      saleOp(4, {}, { items: [] })
    ]);
    expect(res.body.results.map((r: { error: { code: string } }) => r.error.code)).toEqual([
      "FORBIDDEN",
      "UNKNOWN_USER",
      "WRONG_DEPARTMENT",
      "INVALID_PAYLOAD"
    ]);
    expect(await prisma.order.count()).toBe(0);
  });

  it("only staff allowed to manage terminals can register them, and a new key replaces the old", async () => {
    const rotated = await rotateTerminalKey(s.barTill.id, actorFrom(s.managerUser, ["*"]));
    expect((await push(s.barTill, [saleOp(1)])).status).toBe(401); // old key
    expect((await push({ id: s.barTill.id, key: rotated.key }, [saleOp(1)])).status).toBe(200);
    await expect(registerTerminal({ name: "X", departmentId: null }, actorFrom(s.cashier, ["pos.sell"]))).rejects.toThrow(
      /admin.terminals/
    );
  });
});

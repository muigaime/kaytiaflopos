import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Decimal, prisma } from "../src/db.js";
import { AppError } from "../src/http/errors.js";
import {
  approveStockTake,
  cancelStockTake,
  getStockTake,
  getStockTakeReport,
  recordCounts,
  startStockTake
} from "../src/modules/stock-take/stock-take.service.js";
import { qty, resetDb, seed, tokenFor } from "./helpers.js";

let s: Awaited<ReturnType<typeof seed>>;
const d = (v: string | number) => new Decimal(v);
const rejectsWith = async (p: Promise<unknown>, status: number, code: string) => {
  const e = await p.then(
    () => null,
    (err: unknown) => err
  );
  expect(e).toBeInstanceOf(AppError);
  expect({ status: (e as AppError).status, code: (e as AppError).code }).toEqual({ status, code });
};

beforeEach(async () => {
  await resetDb();
  s = await seed();
});
afterAll(() => prisma.$disconnect());

describe("Approve & Take All", () => {
  it("adjusts every counted line in one go, keeps sales made after counting, and freezes the report", async () => {
    const st = await startStockTake({ departmentId: null, uncountedAsZero: false }, s.manager);
    expect(st.number).toMatch(/^ST-\d{8}-0001$/);
    expect(st.lines).toBe(6); // every balance row in Main Store, Bar, Kitchen (Front Desk holds no stock)

    await recordCounts(
      st.id,
      [
        { departmentId: s.bar.id, stockItemId: s.whisky.id, countedQuantity: d(7300) }, // system 7500: -200 ml
        { departmentId: s.bar.id, stockItemId: s.tusker.id, countedQuantity: d(90) }, // system 96: -6
        { departmentId: s.kitchen.id, stockItemId: s.beef.id, countedQuantity: d(3600) }, // system 3500: +100 g
        { departmentId: s.main.id, stockItemId: s.whisky.id, countedQuantity: d(10000) } // exact
      ],
      s.counter
    );

    // The bar keeps selling after the count: 10 Tuskers go out before approval.
    await prisma.departmentInventory.update({
      where: { departmentId_stockItemId: { departmentId: s.bar.id, stockItemId: s.tusker.id } },
      data: { quantity: 86 }
    });

    const preview = await getStockTake(st.id);
    expect(preview.summary).toMatchObject({ itemsCounted: 4, uncounted: 2, preview: true });
    expect(preview.summary.shrinkageValue?.toString()).toBe("1880"); // 200 x 4 + 6 x 180
    expect(preview.summary.surplusValue?.toString()).toBe("80"); // 100 x 0.8

    const result = await approveStockTake(st.id, s.manager);
    expect(result.adjustedLines).toBe(3);
    expect(result.warnings).toEqual([]);
    expect(result.session).toMatchObject({ status: "APPROVED", itemsCounted: 4, approvedById: s.managerUser.id });
    expect(result.session.shrinkageValue?.toString()).toBe("1880");
    expect(result.session.surplusValue?.toString()).toBe("80");
    expect(result.session.netVarianceValue?.toString()).toBe("-1800");
    // 7300x4 + 80x180 + 3600x0.8 + 10000x4 + 200x180 + 20000x0.8
    expect(result.session.stockValueAfter?.toString()).toBe("138480");

    expect(await qty(s.bar.id, s.whisky.id)).toBe("7300");
    expect(await qty(s.bar.id, s.tusker.id)).toBe("80"); // 86 live - 6 variance, the sale is kept
    expect(await qty(s.kitchen.id, s.beef.id)).toBe("3600");
    expect(await qty(s.main.id, s.whisky.id)).toBe("10000");
    expect(await qty(s.main.id, s.tusker.id)).toBe("200"); // not counted: untouched
    expect(await qty(s.main.id, s.beef.id)).toBe("20000");

    const moves = await prisma.stockMovement.findMany({ where: { refId: st.id }, orderBy: { quantity: "asc" } });
    expect(
      moves.map(m => [m.type, m.departmentId, m.stockItemId, m.quantity.toString(), m.balanceAfter.toString()])
    ).toEqual([
      ["STOCKTAKE_ADJUST", s.bar.id, s.whisky.id, "-200", "7300"],
      ["STOCKTAKE_ADJUST", s.bar.id, s.tusker.id, "-6", "80"],
      ["STOCKTAKE_ADJUST", s.kitchen.id, s.beef.id, "100", "3600"]
    ]);

    const report = await getStockTakeReport(st.id);
    expect(report.lines).toHaveLength(4);
    expect(report.lines.find(l => l.stockItem.code === "TSK")?.varianceValue?.toString()).toBe("-1080");

    const log = await prisma.auditLog.findMany({ where: { entityId: st.id }, orderBy: { createdAt: "asc" } });
    expect(log.map(l => l.action)).toEqual(["stocktake.start", "stocktake.approve"]);
  });

  it("treats uncounted items as zero only when the stock take says so", async () => {
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: true }, s.manager);
    expect(st.lines).toBe(2);
    await recordCounts(st.id, [{ departmentId: s.bar.id, stockItemId: s.whisky.id, countedQuantity: d(7500) }], s.counter);
    const r = await approveStockTake(st.id, s.manager);
    expect(r.session.itemsCounted).toBe(2);
    expect(await qty(s.bar.id, s.tusker.id)).toBe("0");
    expect(r.session.shrinkageValue?.toString()).toBe("17280"); // 96 x 180
    expect(await qty(s.main.id, s.tusker.id)).toBe("200"); // other departments untouched
  });

  it("can only be approved once, even when two managers press Approve at the same moment", async () => {
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.manager);
    await recordCounts(st.id, [{ departmentId: s.bar.id, stockItemId: s.tusker.id, countedQuantity: d(90) }], s.counter);
    const results = await Promise.allSettled([approveStockTake(st.id, s.manager), approveStockTake(st.id, s.manager)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find(r => r.status === "rejected") as PromiseRejectedResult;
    expect((failed.reason as AppError).code).toBe("STOCKTAKE_ALREADY_APPROVED");
    expect(await qty(s.bar.id, s.tusker.id)).toBe("90"); // adjusted once, not twice
    expect(await prisma.stockMovement.count({ where: { refId: st.id } })).toBe(1);
  });

  it("refuses to approve when nothing was counted", async () => {
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.manager);
    await rejectsWith(approveStockTake(st.id, s.manager), 422, "NOTHING_COUNTED");
    expect((await getStockTake(st.id)).status).toBe("COUNTING");
  });

  it("rolls everything back if approval fails part way", async () => {
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.manager);
    await recordCounts(
      st.id,
      [
        { departmentId: s.bar.id, stockItemId: s.whisky.id, countedQuantity: d(7000) },
        { departmentId: s.bar.id, stockItemId: s.tusker.id, countedQuantity: d(90) }
      ],
      s.counter
    );
    // Sabotage: a trigger that fails while the SECOND line is written (lines are processed in id order),
    // so the first line has already been adjusted when the failure happens.
    const [first, second] = [s.whisky, s.tusker].sort((a, b) => (a.id < b.id ? -1 : 1));
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_on_tusker() RETURNS trigger AS $$
      BEGIN IF NEW."stockItemId" = '${second!.id}' THEN RAISE EXCEPTION 'boom'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER fail_on_tusker BEFORE UPDATE ON "DepartmentInventory" FOR EACH ROW EXECUTE FUNCTION fail_on_tusker()`
    );
    try {
      await expect(approveStockTake(st.id, s.manager)).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER fail_on_tusker ON "DepartmentInventory"`);
    }
    expect(await qty(s.bar.id, first!.id)).toBe(first === s.whisky ? "7500" : "96"); // first line rolled back too
    expect(await qty(s.bar.id, second!.id)).toBe(second === s.whisky ? "7500" : "96");
    expect(await prisma.stockMovement.count()).toBe(0);
    expect((await getStockTake(st.id)).status).toBe("COUNTING");
  });
});

describe("starting and counting", () => {
  it("does not allow two overlapping counts", async () => {
    await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.manager);
    await rejectsWith(startStockTake({ departmentId: null, uncountedAsZero: false }, s.manager), 409, "STOCKTAKE_IN_PROGRESS");
    await rejectsWith(startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.manager), 409, "STOCKTAKE_IN_PROGRESS");
    const kitchen = await startStockTake({ departmentId: s.kitchen.id, uncountedAsZero: false }, s.manager);
    expect(kitchen.number).toMatch(/-0002$/);
  });

  it("rejects departments that hold no stock, and counts outside the stock take", async () => {
    await rejectsWith(
      startStockTake({ departmentId: s.frontDesk.id, uncountedAsZero: false }, s.manager),
      422,
      "DEPARTMENT_HOLDS_NO_STOCK"
    );
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.manager);
    await rejectsWith(
      recordCounts(st.id, [{ departmentId: s.kitchen.id, stockItemId: s.beef.id, countedQuantity: d(1) }], s.counter),
      422,
      "DEPARTMENT_NOT_IN_STOCKTAKE"
    );
  });

  it("lets a count be corrected or cleared before approval", async () => {
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.manager);
    const line = { departmentId: s.bar.id, stockItemId: s.tusker.id };
    await recordCounts(st.id, [{ ...line, countedQuantity: d(50) }], s.counter);
    await recordCounts(st.id, [{ ...line, countedQuantity: d(95), narration: "Recounted" }], s.counter);
    let view = await getStockTake(st.id);
    expect(view.lines.find(l => l.stockItem.id === s.tusker.id)).toMatchObject({ narration: "Recounted" });
    expect(view.summary.shrinkageValue?.toString()).toBe("180");
    await recordCounts(st.id, [{ ...line, countedQuantity: null }], s.counter);
    view = await getStockTake(st.id);
    expect(view.summary.itemsCounted).toBe(0);
  });

  it("only approvers can approve or cancel", async () => {
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.counter);
    await recordCounts(st.id, [{ departmentId: s.bar.id, stockItemId: s.tusker.id, countedQuantity: d(1) }], s.counter);
    await rejectsWith(approveStockTake(st.id, s.counter), 403, "FORBIDDEN");
    await rejectsWith(cancelStockTake(st.id, s.counter), 403, "FORBIDDEN");
    await cancelStockTake(st.id, s.manager, "Wrong day");
    await rejectsWith(approveStockTake(st.id, s.manager), 409, "STOCKTAKE_CANCELLED");
    await rejectsWith(getStockTakeReport(st.id), 409, "STOCKTAKE_NOT_APPROVED");
  });
});

describe("HTTP API", () => {
  const app = createApp();

  it("runs the whole flow over HTTP", async () => {
    const tokens = new Map([
      [s.managerUser.id, await tokenFor(s.managerUser.id)],
      [s.counterUser.id, await tokenFor(s.counterUser.id, "POS")]
    ]);
    const as = (u: { id: string }) => ({ authorization: `Bearer ${tokens.get(u.id)}` });
    const start = await request(app).post("/api/stock-takes").set(as(s.managerUser)).send({ departmentId: s.bar.id });
    expect(start.status).toBe(201);
    const id = start.body.id as string;

    const counts = await request(app)
      .put(`/api/stock-takes/${id}/counts`)
      .set(as(s.counterUser))
      .send({ counts: [{ departmentId: s.bar.id, stockItemId: s.whisky.id, countedQuantity: "7499.5" }] });
    expect(counts.status).toBe(200);

    const approve = await request(app).post(`/api/stock-takes/${id}/approve`).set(as(s.managerUser));
    expect(approve.status).toBe(200);
    expect(approve.body.session.shrinkageValue).toBe("2"); // 0.5 ml x 4

    const report = await request(app).get(`/api/stock-takes/${id}/report`).set(as(s.managerUser));
    expect(report.status).toBe(200);
    expect(report.body.lines[0]).toMatchObject({ countedQuantity: "7499.5", varianceQuantity: "-0.5" });
  });

  it("rejects bad input and unknown callers", async () => {
    expect((await request(app).post("/api/stock-takes").send({})).status).toBe(401);
    const st = await startStockTake({ departmentId: s.bar.id, uncountedAsZero: false }, s.manager);
    const counter = { authorization: `Bearer ${await tokenFor(s.counterUser.id, "POS")}` };
    const manager = { authorization: `Bearer ${await tokenFor(s.managerUser.id)}` };
    const bad = await request(app)
      .put(`/api/stock-takes/${st.id}/counts`)
      .set(counter)
      .send({ counts: [{ departmentId: s.bar.id, stockItemId: s.whisky.id, countedQuantity: -5 }] });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_INPUT");
    const missing = await request(app)
      .post("/api/stock-takes/00000000-0000-4000-8000-000000000000/approve")
      .set(manager);
    expect(missing.status).toBe(404);
  });
});

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { AppError } from "../src/http/errors.js";
import { getDashboard } from "../src/modules/dashboard/dashboard.service.js";
import { actorFrom, resetDb, tokenFor } from "./helpers.js";

// All on 30 Oct 2026 in Nairobi (UTC+3) unless the comment says otherwise.
let s: Awaited<ReturnType<typeof seed>>;

async function seed() {
  const role = await prisma.role.create({ data: { name: "Manager", isSuperCashier: true, permissions: ["*"] } });
  const viewerRole = await prisma.role.create({ data: { name: "Waiter", permissions: ["pos.sell"] } });
  const managerUser = await prisma.user.create({ data: { username: "peter", fullName: "Peter Mwangi", roleId: role.id } });
  const waiterUser = await prisma.user.create({ data: { username: "wanjiru", fullName: "Wanjiru Kamau", roleId: viewerRole.id } });
  const bar = await prisma.department.create({ data: { name: "Bar", kind: "OUTLET" } });
  const restaurant = await prisma.department.create({ data: { name: "Restaurant", kind: "OUTLET" } });

  const tusker = await prisma.menuItem.create({ data: { name: "Tusker", departmentId: bar.id, category: "Beer", price: 500, station: "BOT" } });
  const steak = await prisma.menuItem.create({ data: { name: "Steak", departmentId: restaurant.id, category: "Mains", price: 2000 } });
  const pilau = await prisma.menuItem.create({ data: { name: "Pilau", departmentId: restaurant.id, category: "Mains", price: 1500 } });

  let n = 0;
  const sale = async (
    departmentId: string,
    settledAtUtc: string,
    item: { id: string; name: string },
    qty: number,
    price: number,
    pay: "CASH" | "MPESA" | "ROOM_FOLIO",
    status: "SETTLED" | "TRANSFERRED_TO_ROOM" = "SETTLED"
  ) => {
    const gross = qty * price;
    const tax = Math.round((gross - gross / 1.16) * 100) / 100;
    const at = new Date(settledAtUtc);
    return prisma.order.create({
      data: {
        number: `B-${++n}`,
        status,
        departmentId,
        waiterId: waiterUser.id,
        grossTotal: gross,
        taxTotal: tax,
        netTotal: gross - tax,
        settledAt: at,
        items: { create: { menuItemId: item.id, name: item.name, quantity: qty, unitPrice: price, taxCode: "B", taxRate: 16, lineTotal: gross, station: "KOT" } },
        payments: { create: { method: pay, amount: gross, amountBase: gross, userId: waiterUser.id, createdAt: at } }
      }
    });
  };
  await sale(bar.id, "2026-10-30T05:30:00Z", tusker, 2, 500, "CASH"); // 08:30 local, 1000
  await sale(restaurant.id, "2026-10-30T17:10:00Z", steak, 1, 2000, "MPESA"); // 20:10 local, 2000
  await sale(bar.id, "2026-10-29T21:30:00Z", tusker, 1, 500, "CASH"); // 00:30 local on the 30th, 500
  await sale(restaurant.id, "2026-10-30T10:00:00Z", pilau, 1, 1500, "ROOM_FOLIO", "TRANSFERRED_TO_ROOM"); // 13:00 local, 1500
  await sale(bar.id, "2026-10-30T22:30:00Z", tusker, 1, 700, "CASH"); // 01:30 on the 31st: not in range
  await sale(restaurant.id, "2026-10-29T10:00:00Z", steak, 1, 2000, "CASH"); // 29th: previous period
  await prisma.order.create({
    data: { number: "B-OPEN", departmentId: bar.id, waiterId: waiterUser.id, grossTotal: 800, createdAt: new Date("2026-10-28T12:00:00Z") }
  });

  // Rooms: 101 + 102 occupied, 103 clean, 104 dirty, 105 out of order -> 4 sellable.
  const cat = await prisma.roomCategory.create({ data: { code: "DBL", name: "Double", baseRate: 4500, rateFloor: 3800 } });
  const room = (number: string, status: "OCCUPIED" | "VACANT_CLEAN" | "VACANT_DIRTY" | "OUT_OF_ORDER") =>
    prisma.room.create({ data: { number, categoryId: cat.id, status } });
  const r101 = await room("101", "OCCUPIED");
  const r102 = await room("102", "OCCUPIED");
  const r103 = await room("103", "VACANT_CLEAN");
  await room("104", "VACANT_DIRTY");
  await room("105", "OUT_OF_ORDER");
  const guest = (fullName: string) => prisma.guest.create({ data: { fullName } });
  const stay = async (
    number: string,
    roomId: string,
    status: "CHECKED_IN" | "RESERVED" | "CHECKED_OUT",
    arrival: string,
    departure: string,
    mealPlan: "RO" | "BB",
    adults: number,
    children: number,
    guestName: string
  ) =>
    prisma.reservation.create({
      data: {
        number,
        status,
        roomId,
        categoryId: cat.id,
        arrival: new Date(arrival),
        departure: new Date(departure),
        mealPlan,
        adults,
        children,
        roomRate: 4500,
        createdById: managerUser.id,
        guests: { create: { guestId: (await guest(guestName)).id, isLead: true } }
      }
    });
  const r1 = await stay("FO-1", r101.id, "CHECKED_IN", "2026-10-28", "2026-10-31", "BB", 2, 1, "Achieng Otieno");
  await stay("FO-2", r102.id, "CHECKED_IN", "2026-10-29", "2026-10-30", "RO", 1, 0, "John Doe"); // leaves today
  await stay("FO-3", r103.id, "RESERVED", "2026-10-30", "2026-11-01", "BB", 2, 0, "Mary Wambui"); // arrives today

  const charge = (type: "ROOM" | "MEAL_PLAN" | "DISCOUNT" | "FNB_TRANSFER" | "MINIBAR", amount: number, day: string) =>
    prisma.roomFolioCharge.create({
      data: { reservationId: r1.id, type, description: type, amount, amountBase: amount, serviceDate: new Date(day), postedById: managerUser.id }
    });
  await charge("ROOM", 4500, "2026-10-30");
  await charge("MEAL_PLAN", 800, "2026-10-30");
  await charge("DISCOUNT", -300, "2026-10-30");
  await charge("FNB_TRANSFER", 1500, "2026-10-30"); // already counted as F&B
  await charge("MINIBAR", 200, "2026-10-30");
  await charge("ROOM", 4500, "2026-10-31"); // next day
  await prisma.payment.create({
    data: { method: "CASH", reservationId: r1.id, amount: 3000, amountBase: 3000, userId: managerUser.id, createdAt: new Date("2026-10-30T12:00:00Z") }
  });

  // Stock in the bar.
  const item = (code: string, name: string, unitCost: number, reorderLevel: number, criticalLevel: number) =>
    prisma.stockItem.create({ data: { code, name, baseUnit: "pc", unitCost, reorderLevel, criticalLevel } });
  const sTusker = await item("TSK", "Tusker", 180, 24, 6);
  const sGin = await item("GIN", "Gin", 1500, 5, 0);
  const sWhisky = await item("WHS", "Whiskey", 4, 1000, 0);
  await prisma.departmentInventory.createMany({
    data: [
      { departmentId: bar.id, stockItemId: sTusker.id, quantity: 10 }, // low
      { departmentId: bar.id, stockItemId: sGin.id, quantity: 0 }, // critical
      { departmentId: bar.id, stockItemId: sWhisky.id, quantity: 5000 } // fine
    ]
  });
  const ago = (days: number) => new Date(Date.now() - days * 86_400_000);
  const move = (type: "SALE" | "STOCKTAKE_ADJUST" | "WASTAGE", stockItemId: string, quantity: number, unitCost: number, days: number) =>
    prisma.stockMovement.create({
      data: { type, departmentId: bar.id, stockItemId, quantity, unitCost, balanceAfter: 0, userId: managerUser.id, createdAt: ago(days) }
    });
  await move("SALE", sTusker.id, -70, 180, 1); // 5 a day over 14 days -> 2 days left
  await move("STOCKTAKE_ADJUST", sWhisky.id, -100, 4, 2); // KES 400 lost
  await move("WASTAGE", sTusker.id, -2, 180, 3); // KES 360 lost
  await prisma.integrationJob.create({ data: { kind: "ETIMS_SIGN_RECEIPT", status: "DEAD", payload: {} } });

  await prisma.auditLog.createMany({
    data: [
      { action: "stocktake.approve", entity: "StockTakeSession", userId: managerUser.id, createdAt: ago(0.2) },
      { action: "auth.login_failed", entity: "User", userId: managerUser.id, createdAt: ago(0.1) },
      { action: "order.transfer_to_room", entity: "Order", userId: waiterUser.id, createdAt: ago(0.05) }
    ]
  });

  return { manager: actorFrom(managerUser, ["*"]), waiter: actorFrom(waiterUser, ["pos.sell"]), managerUser, bar, restaurant };
}

beforeAll(async () => {
  await resetDb();
  s = await seed();
});
afterAll(() => prisma.$disconnect());

const day = { from: "2026-10-30", to: "2026-10-30", asOf: "2026-10-30" };
const str = (v: unknown) => String(v);

describe("sales", () => {
  it("adds up F&B and room revenue for the local day, without counting room-posted bills twice", async () => {
    const d = await getDashboard(day, s.manager);
    const t = d.sales.totals;
    expect(str(t.fnbRevenue)).toBe("5000"); // 1000 + 2000 + 500 (00:30 local) + 1500 posted to room
    expect(str(t.roomRevenue)).toBe("5000"); // 4500 + 800 - 300
    expect(str(t.otherFolioRevenue)).toBe("200");
    expect(str(t.revenue)).toBe("10200");
    expect(t.bills).toBe(4);
    expect(str(t.averageBill)).toBe("1250");
    expect(str(t.vat)).toBe("689.66");
    expect(d.sales.previous).toMatchObject({ from: "2026-10-29", to: "2026-10-29", changePct: 410 });
    expect(str(d.sales.previous.revenue)).toBe("2000");
  });

  it("splits payments by method, revenue by department, and lists top items and open bills", async () => {
    const d = await getDashboard(day, s.manager);
    const mix = Object.fromEntries(Object.entries(d.sales.paymentMix).map(([k, v]) => [k, str(v)]));
    expect(mix).toEqual({ CASH: "4500", MPESA: "2000", CARD: "0", DEBTOR: "0", BANK: "0", ROOM_FOLIO: "1500" });
    expect(d.sales.byDepartment.map(x => [x.name, str(x.revenue), x.bills])).toEqual([
      ["Restaurant", "3500", 2],
      ["Bar", "1500", 2]
    ]);
    expect(d.sales.topItems[0]).toMatchObject({ name: "Steak" });
    expect(str(d.sales.topItems.find(i => i.name === "Tusker")?.quantity)).toBe("3");
    expect(d.sales.openBills.count).toBe(1);
    expect(str(d.sales.openBills.value)).toBe("800");
  });

  it("charts a single day by local hour and a longer range by day", async () => {
    const d = await getDashboard(day, s.manager);
    expect(d.sales.series.unit).toBe("hour");
    expect(d.sales.series.points).toHaveLength(24);
    const nonZero = d.sales.series.points.filter(p => !p.revenue.isZero()).map(p => [p.at, str(p.revenue)]);
    expect(nonZero).toEqual([
      ["2026-10-30T00:00", "500"],
      ["2026-10-30T08:00", "1000"],
      ["2026-10-30T13:00", "1500"],
      ["2026-10-30T20:00", "2000"]
    ]);
    const week = await getDashboard({ from: "2026-10-29", to: "2026-10-31" }, s.manager);
    expect(week.sales.series.points.map(p => [p.at, str(p.revenue)])).toEqual([
      ["2026-10-29", "2000"],
      ["2026-10-30", "5000"],
      ["2026-10-31", "700"]
    ]);
  });

  it("filters to one department (room revenue then does not apply)", async () => {
    const d = await getDashboard({ ...day, departmentId: s.bar.id }, s.manager);
    expect(str(d.sales.totals.fnbRevenue)).toBe("1500");
    expect(d.sales.totals.roomRevenue).toBeNull();
    expect(str(d.sales.totals.revenue)).toBe("1500");
    expect(str(d.sales.paymentMix.CASH)).toBe("1500");
  });
});

describe("rooms", () => {
  it("gives occupancy, arrivals, departures and the breakfast list", async () => {
    const r = (await getDashboard(day, s.manager)).rooms;
    expect(r).toMatchObject({ totalRooms: 5, sellableRooms: 4, occupiedRooms: 2, occupancyPct: 50, inHouse: { stays: 2, guests: 4 } });
    expect(r.statusCounts).toMatchObject({ OCCUPIED: 2, VACANT_CLEAN: 1, VACANT_DIRTY: 1, OUT_OF_ORDER: 1 });
    expect(r.arrivals.map(a => [a.number, a.room, a.guest])).toEqual([["FO-3", "103", "Mary Wambui"]]);
    expect(r.departures.map(a => [a.number, a.room, a.guest])).toEqual([["FO-2", "102", "John Doe"]]);
    expect(r.breakfast).toEqual({ covers: 3, rooms: [{ room: "101", guest: "Achieng Otieno", mealPlan: "BB", adults: 2, children: 1 }] });
    // Night of the 30th: only FO-1 stays over (FO-2 leaves on the 30th).
    expect(r.occupancySeries).toEqual([{ day: "2026-10-30", occupiedRooms: 1, occupancyPct: 25 }]);
  });
});

describe("stock and insights", () => {
  it("lists low and critical stock and values each department", async () => {
    const d = await getDashboard(day, s.manager);
    expect(d.stock.lowStock.map(l => [l.name, l.level, str(l.quantity)])).toEqual([
      ["Gin", "CRITICAL", "0"],
      ["Tusker", "LOW", "10"]
    ]);
    expect(d.stock.valuation.byDepartment.map(v => [v.name, str(v.value)])).toEqual([["Bar", "21800"]]); // 10x180 + 5000x4
  });

  it("raises rule-based alerts, most serious first", async () => {
    const { method, items } = (await getDashboard(day, s.manager)).insights;
    expect(method).toMatch(/rule-based/);
    expect(items.map(i => i.code)).toEqual(["CRITICAL_STOCK", "INTEGRATION_FAILURES", "REORDER_SOON", "STOCK_LOSS", "OLD_OPEN_BILLS", "REVENUE_UP"]);
    expect(items.find(i => i.code === "REORDER_SOON")?.message).toBe("Tusker in Bar will run out in about 2.0 day(s) at the current rate of sale");
    expect(items.find(i => i.code === "STOCK_LOSS")?.message).toBe("Biggest stock losses in 30 days: Whiskey KES 400.00, Tusker KES 360.00");
  });
});

describe("activity, permissions and input", () => {
  it("shows recent activity newest first, without failed logins", async () => {
    const a = (await getDashboard(day, s.manager)).activity;
    expect(a.map(x => [x.label, x.user])).toEqual([
      ["Bill posted to room", "Wanjiru Kamau"],
      ["Stock take approved", "Peter Mwangi"]
    ]);
  });

  it("needs dashboard.view and a sensible range", async () => {
    const code = (p: Promise<unknown>) => p.then(() => "OK", (e: AppError) => e.code);
    expect(await code(getDashboard(day, s.waiter))).toBe("FORBIDDEN");
    expect(await code(getDashboard({ from: "2026-10-30", to: "2026-10-01" }, s.manager))).toBe("BAD_RANGE");
    expect(await code(getDashboard({ from: "2026-01-01", to: "2026-10-30" }, s.manager))).toBe("RANGE_TOO_LONG");
  });

  it("works over HTTP", async () => {
    const app = createApp();
    const auth = { authorization: `Bearer ${await tokenFor(s.managerUser.id)}` };
    const res = await request(app).get("/api/dashboard").query(day).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.sales.totals.revenue).toBe("10200");
    expect(res.body.range.timezone).toBe("Africa/Nairobi");
    expect((await request(app).get("/api/dashboard").query({ from: "30-10-2026" }).set(auth)).status).toBe(400);
  });
});

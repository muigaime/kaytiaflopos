import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { AppError } from "../src/http/errors.js";
import { setUserPin } from "../src/modules/auth/auth.service.js";
import {
  guestNameMatches,
  reverseRoomTransfer,
  transferOrderToRoom
} from "../src/modules/room-billing/room-billing.service.js";
import { actorFrom, resetDb, tokenFor } from "./helpers.js";

const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => "OK",
    (e: unknown) => (e instanceof AppError ? e.code : String(e))
  );

async function seedHotel() {
  const managerRole = await prisma.role.create({ data: { name: "Manager", isSuperCashier: true, permissions: ["*"] } });
  const waiterRole = await prisma.role.create({ data: { name: "Waiter", permissions: ["pos.room_charge"] } });
  const managerUser = await prisma.user.create({ data: { username: "peter", fullName: "Peter Mwangi", roleId: managerRole.id } });
  const waiterUser = await prisma.user.create({ data: { username: "wanjiru", fullName: "Wanjiru Kamau", roleId: waiterRole.id } });
  await setUserPin(managerUser.id, "0000");
  await setUserPin(waiterUser.id, "1234");

  const restaurant = await prisma.department.create({ data: { name: "Main Restaurant", kind: "OUTLET" } });
  const frontOffice = await prisma.department.create({ data: { name: "Front Desk", kind: "FRONT_OFFICE" } });
  const category = await prisma.roomCategory.create({ data: { code: "DBL", name: "Double", baseRate: 4500, rateFloor: 3800 } });
  const room101 = await prisma.room.create({ data: { number: "101", categoryId: category.id, status: "OCCUPIED" } });
  const room102 = await prisma.room.create({ data: { number: "102", categoryId: category.id } });
  const guest = await prisma.guest.create({ data: { fullName: "Achieng Otieno", nationality: "Kenyan", idNumber: "23456789" } });

  const stay = (number: string, roomId: string, status: "CHECKED_IN" | "RESERVED") =>
    prisma.reservation.create({
      data: {
        number,
        status,
        categoryId: category.id,
        roomId,
        arrival: new Date("2026-10-30"),
        departure: new Date("2026-11-02"),
        roomRate: 4500,
        createdById: managerUser.id,
        guests: { create: { guestId: guest.id, isLead: true } }
      }
    });
  const inHouse = await stay("FO-000001", room101.id, "CHECKED_IN");
  await stay("FO-000002", room102.id, "RESERVED");
  // Room nights already on the folio: 2 x 4500.
  await prisma.roomFolioCharge.create({
    data: { reservationId: inHouse.id, type: "ROOM", description: "Room 101", amount: 9000, amountBase: 9000, postedById: managerUser.id }
  });

  const menu = await prisma.menuItem.create({
    data: { name: "Beef Burger", departmentId: restaurant.id, category: "Burgers", price: 700 }
  });
  const order = (number: string, departmentId = restaurant.id) =>
    prisma.order.create({
      data: {
        number,
        departmentId,
        waiterId: waiterUser.id,
        tableLabel: "T4",
        netTotal: 1293.1,
        taxTotal: 206.9,
        grossTotal: 1500,
        items: {
          create: [
            { menuItemId: menu.id, name: "Beef Burger", quantity: 1, unitPrice: 700, taxCode: "B", taxRate: 16, lineTotal: 700, station: "KOT" },
            { menuItemId: menu.id, name: "Beef Burger", quantity: 1, unitPrice: 800, taxCode: "B", taxRate: 16, lineTotal: 800, station: "KOT" }
          ]
        }
      }
    });
  const bill = await order("B-1001");

  return {
    manager: actorFrom(managerUser, ["*"]),
    waiter: actorFrom(waiterUser, ["pos.room_charge"]),
    managerUser,
    waiterUser,
    restaurant,
    frontOffice,
    inHouse,
    bill,
    order
  };
}

let h: Awaited<ReturnType<typeof seedHotel>>;
beforeEach(async () => {
  await resetDb();
  h = await seedHotel();
});
afterAll(() => prisma.$disconnect());

describe("guest name check", () => {
  it("accepts a full name or one whole word of it, ignoring case and accents", () => {
    const reg = ["Achieng Otieno"];
    expect(guestNameMatches("otieno", reg)).toBe(true);
    expect(guestNameMatches("  ACHIENG   otieno ", reg)).toBe(true);
    expect(guestNameMatches("Achiéng", reg)).toBe(true);
    expect(guestNameMatches("Otien", reg)).toBe(false);
    expect(guestNameMatches("Achieng Kamau", reg)).toBe(false);
    expect(guestNameMatches("o", reg)).toBe(false);
  });
});

describe("post a bill to a room", () => {
  it("moves the bill onto the folio in one go", async () => {
    const r = await transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter);
    expect(r).toMatchObject({ orderNumber: "B-1001", roomNumber: "101", reservationNumber: "FO-000001", alreadyTransferred: false });
    expect(r.amount.toString()).toBe("1500");
    expect(r.folio.charged.toString()).toBe("10500"); // 9000 room + 1500 bill
    expect(r.folio.balance.toString()).toBe("10500");

    const charge = await prisma.roomFolioCharge.findUniqueOrThrow({ where: { sourceOrderId: h.bill.id } });
    expect(charge).toMatchObject({ type: "FNB_TRANSFER", description: "Main Restaurant bill B-1001 · T4 (2 items)" });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: h.bill.id }, include: { payments: true } });
    expect(order).toMatchObject({ status: "TRANSFERRED_TO_ROOM", roomReservationId: h.inHouse.id, cashierId: h.waiter.id });
    expect(order.payments.map(p => [p.method, p.status, p.amountBase.toString(), p.reservationId])).toEqual([
      ["ROOM_FOLIO", "CONFIRMED", "1500", null]
    ]);
    expect(await prisma.integrationJob.count({ where: { kind: "ETIMS_SIGN_RECEIPT", refId: h.bill.id, status: "QUEUED" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "order.transfer_to_room", entityId: h.bill.id } })).toBe(1);
  });

  it("posts only what is still owed when part was paid", async () => {
    await prisma.payment.create({
      data: { method: "CASH", orderId: h.bill.id, amount: 500, amountBase: 500, userId: h.waiter.id }
    });
    const r = await transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Achieng Otieno" }, h.waiter);
    expect(r.amount.toString()).toBe("1000");
  });

  it("checks the room and the guest, and writes nothing when the check fails", async () => {
    expect(await codeOf(transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Kamau" }, h.waiter))).toBe("GUEST_MISMATCH");
    expect(await codeOf(transferOrderToRoom(h.bill.id, { roomNumber: "102", guestName: "Otieno" }, h.waiter))).toBe("ROOM_NOT_IN_HOUSE"); // booked, not checked in
    expect(await codeOf(transferOrderToRoom(h.bill.id, { roomNumber: "999", guestName: "Otieno" }, h.waiter))).toBe("ROOM_NOT_IN_HOUSE");
    expect(await prisma.roomFolioCharge.count({ where: { type: "FNB_TRANSFER" } })).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: h.bill.id } })).status).toBe("OPEN");
    expect(await prisma.auditLog.count({ where: { action: "order.room_guest_check_failed" } })).toBe(1);
  });

  it("stops a waiter who keeps guessing guest names", async () => {
    for (let i = 0; i < 5; i++)
      expect(await codeOf(transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: `Guess${"x".repeat(i)}` }, h.waiter))).toBe("GUEST_MISMATCH");
    expect(await codeOf(transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter))).toBe("TOO_MANY_ATTEMPTS");
  });

  it("charges once even when sent twice at the same moment, and refuses another room", async () => {
    const [a, b] = await Promise.all([
      transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter),
      transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter)
    ]);
    expect([a.alreadyTransferred, b.alreadyTransferred].sort()).toEqual([false, true]);
    expect(a.chargeId).toBe(b.chargeId);
    expect(await prisma.roomFolioCharge.count({ where: { type: "FNB_TRANSFER" } })).toBe(1);
    expect(await prisma.payment.count({ where: { orderId: h.bill.id } })).toBe(1);
    expect(await codeOf(transferOrderToRoom(h.bill.id, { roomNumber: "102", guestName: "Otieno" }, h.waiter))).toBe(
      "ORDER_ALREADY_TRANSFERRED"
    );
  });

  it("refuses bills that are settled, still waiting on M-Pesa, already paid, or not from an outlet", async () => {
    const settled = await h.order("B-1002");
    await prisma.order.update({ where: { id: settled.id }, data: { status: "SETTLED" } });
    expect(await codeOf(transferOrderToRoom(settled.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter))).toBe("ORDER_NOT_OPEN");

    const mpesa = await h.order("B-1003");
    await prisma.payment.create({
      data: { method: "MPESA", status: "PENDING", orderId: mpesa.id, amount: 1500, amountBase: 1500, userId: h.waiter.id }
    });
    expect(await codeOf(transferOrderToRoom(mpesa.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter))).toBe("PAYMENT_PENDING");

    const paid = await h.order("B-1004");
    await prisma.payment.create({ data: { method: "CASH", orderId: paid.id, amount: 1500, amountBase: 1500, userId: h.waiter.id } });
    expect(await codeOf(transferOrderToRoom(paid.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter))).toBe("NOTHING_TO_CHARGE");

    const fd = await h.order("FD-1", h.frontOffice.id);
    expect(await codeOf(transferOrderToRoom(fd.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter))).toBe("NOT_AN_OUTLET_BILL");

    const noPerm = { ...h.waiter, permissions: [] };
    expect(await codeOf(transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Otieno" }, noPerm))).toBe("FORBIDDEN");
  });
});

describe("undo a room posting", () => {
  it("needs a supervisor, then reopens the bill so it can go to the right room", async () => {
    await transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter);
    expect(await codeOf(reverseRoomTransfer(h.bill.id, h.waiter))).toBe("OVERRIDE_REQUIRED");

    // The supervisor types their PIN on the waiter's device.
    const app = createApp();
    const waiterToken = await tokenFor(h.waiterUser.id, "POS");
    const grant = await request(app)
      .post("/api/auth/override")
      .set({ authorization: `Bearer ${waiterToken}` })
      .send({ action: "pos.room_charge_reverse", pin: "0000" });
    expect(grant.status).toBe(201);

    const res = await request(app)
      .post(`/api/orders/${h.bill.id}/reverse-room-transfer`)
      .set({ authorization: `Bearer ${waiterToken}`, "x-override-token": grant.body.overrideToken })
      .send({ reason: "Wrong room" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "OPEN", etimsAlreadySigned: false });
    expect(res.body.folio.balance).toBe("9000");

    const order = await prisma.order.findUniqueOrThrow({ where: { id: h.bill.id }, include: { payments: true } });
    expect(order).toMatchObject({ status: "OPEN", roomReservationId: null, settledAt: null });
    expect(order.payments.map(p => p.status)).toEqual(["REVERSED"]);
    expect(await prisma.roomFolioCharge.count({ where: { type: "FNB_TRANSFER", voided: true } })).toBe(1);
    expect(await prisma.integrationJob.count({ where: { refId: h.bill.id, status: "QUEUED" } })).toBe(0);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "order.room_transfer_reversed" } });
    expect(log).toMatchObject({ userId: h.waiter.id, authorizedById: h.manager.id });

    // Now it can go to the right room.
    const again = await transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter);
    expect(again.alreadyTransferred).toBe(false);
    expect(again.folio.balance.toString()).toBe("10500");
  });

  it("is refused after the guest checks out", async () => {
    await transferOrderToRoom(h.bill.id, { roomNumber: "101", guestName: "Otieno" }, h.waiter);
    await prisma.reservation.update({ where: { id: h.inHouse.id }, data: { status: "CHECKED_OUT" } });
    expect(await codeOf(reverseRoomTransfer(h.bill.id, h.manager))).toBe("GUEST_NOT_IN_HOUSE");
    expect(await codeOf(reverseRoomTransfer(h.bill.id, h.manager))).toBe("GUEST_NOT_IN_HOUSE");
  });
});

describe("HTTP", () => {
  it("posts to a room over the API and validates input", async () => {
    const app = createApp();
    const auth = { authorization: `Bearer ${await tokenFor(h.waiterUser.id, "POS")}` };
    const bad = await request(app).post(`/api/orders/${h.bill.id}/transfer-to-room`).set(auth).send({ roomNumber: "101" });
    expect(bad.status).toBe(400);
    const ok = await request(app)
      .post(`/api/orders/${h.bill.id}/transfer-to-room`)
      .set(auth)
      .send({ roomNumber: "101", guestName: "otieno" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ amount: "1500", roomNumber: "101", folio: { balance: "10500" } });
  });
});

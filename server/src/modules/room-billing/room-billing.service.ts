// F&B bill -> guest room folio ("post to room").
//
// Transfer, in ONE transaction:
//   the order row is locked; the room must have a checked-in stay whose registered guest name matches
//   what the guest told the waiter; the outstanding balance (gross - confirmed payments) becomes an
//   FNB_TRANSFER folio charge plus a ROOM_FOLIO payment on the order; the order is marked
//   TRANSFERRED_TO_ROOM; the eTIMS receipt is queued; the audit log records it.
// Safe to repeat: sending the same bill to the same room again returns the first result
// (double taps, offline re-sync). Sending it to a different room is refused.
//
// Reverse (wrong room): needs pos.room_charge_reverse or a supervisor override; only while the guest is
// still checked in. The charge is voided, the room payment reversed and the bill is open again.
import { prisma, type Tx } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { assertCan, PERM, type Actor } from "../../http/auth.js";
import { AppError, conflict, notFound, unprocessable } from "../../http/errors.js";
import { audit } from "../../lib/audit.js";
import { money, ZERO } from "../../lib/quantity.js";
import { FailureLimiter } from "../../lib/rate-limit.js";
import { withTx } from "../../lib/tx.js";
import { authorize } from "../auth/auth.service.js";
import { folioBalance } from "../folio/folio.js";

/** Wrong guest names per user: 5 per 10 minutes, so a room can't be "guessed" onto. */
export const guestCheckLimiter = new FailureLimiter(5, 10 * 60_000);

export interface TransferToRoomInput {
  roomNumber: string;
  /** What the guest says their name is: surname, first name or full name. */
  guestName: string;
  /** Only needed if the room somehow has two checked-in stays. */
  reservationId?: string;
}

const normalise = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** True when `given` is a registered guest's full name, or one whole word of it (e.g. the surname). */
export function guestNameMatches(given: string, registered: string[]): boolean {
  const g = normalise(given);
  if (g.length < 2) return false;
  return registered.some(name => {
    const full = normalise(name);
    return full === g || (!g.includes(" ") && full.split(" ").includes(g));
  });
}

type LockedOrder = Prisma.OrderGetPayload<{ include: { department: true; payments: true } }>;

async function lockOrder(tx: Tx, id: string): Promise<LockedOrder> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
  if (!rows.length) throw notFound("Bill");
  return tx.order.findUniqueOrThrow({ where: { id }, include: { department: true, payments: true } });
}

const startOfToday = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

// ---------------------------------------------------------------- transfer

export async function transferOrderToRoom(orderId: string, input: TransferToRoomInput, actor: Actor, outerTx?: Tx) {
  assertCan(actor, PERM.posRoomCharge);
  const limitKey = "guest-check:" + actor.id;
  const wait = guestCheckLimiter.blockedFor(limitKey);
  if (wait)
    throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many wrong guest names. Ask a supervisor or try again later.", {
      retryAfterSeconds: Math.ceil(wait / 1000)
    });
  const roomNumber = input.roomNumber.trim();

  try {
    return await withTx(outerTx, async tx => {
      const order = await lockOrder(tx, orderId);

      if (order.status === "TRANSFERRED_TO_ROOM") {
        const charge = await tx.roomFolioCharge.findUnique({
          where: { sourceOrderId: order.id },
          include: { reservation: { include: { room: true } } }
        });
        if (charge && charge.reservation.room?.number === roomNumber)
          return {
            orderId: order.id,
            orderNumber: order.number,
            roomNumber,
            reservationId: charge.reservationId,
            reservationNumber: charge.reservation.number,
            chargeId: charge.id,
            amount: charge.amountBase,
            folio: await folioBalance(tx, charge.reservationId),
            alreadyTransferred: true
          };
        throw conflict(
          "ORDER_ALREADY_TRANSFERRED",
          `Bill ${order.number} is already on room ${charge?.reservation.room?.number ?? "?"}. Reverse it first to move it.`
        );
      }
      if (order.status !== "OPEN" && order.status !== "PROFORMA_PRINTED")
        throw conflict("ORDER_NOT_OPEN", `Bill ${order.number} is ${order.status.toLowerCase().replace(/_/g, " ")}`);
      if (order.department.kind !== "OUTLET")
        throw unprocessable("NOT_AN_OUTLET_BILL", "Only restaurant, bar and other outlet bills can be posted to a room");
      if (order.payments.some(p => p.status === "PENDING"))
        throw conflict("PAYMENT_PENDING", "A payment on this bill (e.g. M-Pesa) is still waiting. Finish or cancel it first.");

      const paid = order.payments.filter(p => p.status === "CONFIRMED").reduce((a, p) => a.plus(p.amountBase), ZERO);
      const due = money(order.grossTotal.minus(paid));
      // Note: Decimal#isPositive() is true for 0, so compare explicitly.
      if (!due.gt(0)) throw conflict("NOTHING_TO_CHARGE", `Bill ${order.number} is already fully paid`);

      // The stay currently in the room.
      const room = await tx.room.findUnique({ where: { number: roomNumber } });
      const stays = room
        ? await tx.reservation.findMany({
            where: { roomId: room.id, status: "CHECKED_IN", ...(input.reservationId ? { id: input.reservationId } : {}) },
            include: { guests: { include: { guest: { select: { fullName: true } } } } }
          })
        : [];
      if (!room || !stays.length) throw unprocessable("ROOM_NOT_IN_HOUSE", `Room ${roomNumber} has no checked-in guest`);
      if (stays.length > 1)
        throw unprocessable(
          "ROOM_HAS_SEVERAL_STAYS",
          `Room ${roomNumber} has more than one checked-in stay. Choose the reservation.`,
          stays.map(s => ({ reservationId: s.id, number: s.number }))
        );
      const stay = stays[0]!;
      if (!guestNameMatches(input.guestName, stay.guests.map(g => g.guest.fullName)))
        // Deliberately does not say who is registered.
        throw unprocessable("GUEST_MISMATCH", `That name does not match the guest registered in room ${roomNumber}`);

      const now = new Date();
      const itemCount = await tx.orderItem.count({ where: { orderId: order.id, status: "SENT" } });
      const charge = await tx.roomFolioCharge.create({
        data: {
          reservationId: stay.id,
          type: "FNB_TRANSFER",
          description: `${order.department.name} bill ${order.number}${order.tableLabel ? " · " + order.tableLabel : ""} (${itemCount} item${itemCount === 1 ? "" : "s"})`,
          serviceDate: startOfToday(),
          amount: due,
          currency: "KES",
          amountBase: due,
          sourceOrderId: order.id,
          postedById: actor.id
        }
      });
      const shift = await tx.shift.findFirst({ where: { userId: actor.id, closedAt: null }, select: { id: true } });
      await tx.payment.create({
        data: {
          method: "ROOM_FOLIO",
          status: "CONFIRMED",
          orderId: order.id,
          amount: due,
          currency: "KES",
          exchangeRate: 1,
          amountBase: due,
          reference: `Room ${roomNumber} · ${stay.number}`,
          shiftId: shift?.id,
          userId: actor.id
        }
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "TRANSFERRED_TO_ROOM", roomReservationId: stay.id, cashierId: actor.id, settledAt: now }
      });
      if (order.etimsStatus === "PENDING")
        await tx.integrationJob.create({
          data: { kind: "ETIMS_SIGN_RECEIPT", refType: "Order", refId: order.id, payload: { orderId: order.id, reason: "room_transfer" } }
        });
      await audit(tx, actor, "order.transfer_to_room", "Order", order.id, {
        orderNumber: order.number,
        roomNumber,
        reservationId: stay.id,
        amount: due.toString(),
        chargeId: charge.id
      });

      return {
        orderId: order.id,
        orderNumber: order.number,
        roomNumber,
        reservationId: stay.id,
        reservationNumber: stay.number,
        chargeId: charge.id,
        amount: due,
        folio: await folioBalance(tx, stay.id),
        alreadyTransferred: false
      };
    });
  } catch (e) {
    if (e instanceof AppError && e.code === "GUEST_MISMATCH") {
      guestCheckLimiter.fail(limitKey);
      await audit(prisma, actor, "order.room_guest_check_failed", "Order", orderId, { roomNumber });
    }
    throw e;
  }
}

// ---------------------------------------------------------------- reverse

export async function reverseRoomTransfer(orderId: string, actor: Actor, opts: { overrideToken?: string; reason?: string } = {}) {
  return prisma.$transaction(async tx => {
    const order = await lockOrder(tx, orderId);
    if (order.status !== "TRANSFERRED_TO_ROOM")
      throw conflict("ORDER_NOT_TRANSFERRED", `Bill ${order.number} is not on a room`);
    const charge = await tx.roomFolioCharge.findUnique({
      where: { sourceOrderId: order.id },
      include: { reservation: { include: { room: true } } }
    });
    if (!charge) throw conflict("ORDER_NOT_TRANSFERRED", `Bill ${order.number} is not on a room`);
    if (charge.reservation.status !== "CHECKED_IN")
      throw conflict(
        "GUEST_NOT_IN_HOUSE",
        "The guest has checked out. Correct it on the guest's folio instead of reversing the bill."
      );

    // Checked last so an override is only spent on a reversal that will actually happen.
    const { authorizedById } = await authorize(tx, actor, PERM.posRoomChargeReverse, opts.overrideToken);

    // sourceOrderId is released so the bill can be posted again (to the right room).
    await tx.roomFolioCharge.update({ where: { id: charge.id }, data: { voided: true, sourceOrderId: null } });
    await tx.payment.updateMany({
      where: { orderId: order.id, method: "ROOM_FOLIO", status: "CONFIRMED" },
      data: { status: "REVERSED" }
    });
    const reopened = await tx.order.update({
      where: { id: order.id },
      data: {
        status: order.proformaPrintedAt ? "PROFORMA_PRINTED" : "OPEN",
        roomReservationId: null,
        cashierId: null,
        settledAt: null
      }
    });
    // A receipt not yet sent to eTIMS is no longer due; one already signed stays (the sale is real).
    await tx.integrationJob.updateMany({
      where: { kind: "ETIMS_SIGN_RECEIPT", refType: "Order", refId: order.id, status: "QUEUED" },
      data: { status: "DEAD", lastError: "Cancelled: room transfer reversed" }
    });
    await audit(
      tx,
      actor,
      "order.room_transfer_reversed",
      "Order",
      order.id,
      {
        orderNumber: order.number,
        roomNumber: charge.reservation.room?.number,
        reservationId: charge.reservationId,
        chargeId: charge.id,
        amount: charge.amountBase.toString(),
        reason: opts.reason
      },
      authorizedById ?? undefined
    );
    return {
      orderId: order.id,
      orderNumber: order.number,
      status: reopened.status,
      voidedChargeId: charge.id,
      etimsAlreadySigned: order.etimsStatus === "SIGNED",
      folio: await folioBalance(tx, charge.reservationId)
    };
  });
}

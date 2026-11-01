import { Router } from "express";
import { z } from "zod";
import { actorOf, overrideTokenOf } from "../../http/auth.js";
import { reverseRoomTransfer, transferOrderToRoom } from "./room-billing.service.js";

const params = z.object({ id: z.uuid() });

const transferBody = z.object({
  roomNumber: z.string().trim().min(1).max(20),
  guestName: z.string().trim().min(2).max(120),
  reservationId: z.uuid().optional()
});

const reverseBody = z.object({ reason: z.string().trim().max(500).optional() }).default({});

export const roomBillingRouter = Router();

/** Post a bill's outstanding balance to the folio of the guest checked in to `roomNumber`. */
roomBillingRouter.post("/:id/transfer-to-room", async (req, res) => {
  const { id } = params.parse(req.params);
  res.json(await transferOrderToRoom(id, transferBody.parse(req.body), actorOf(req)));
});

/** Undo a room posting (needs pos.room_charge_reverse or a supervisor override in x-override-token). */
roomBillingRouter.post("/:id/reverse-room-transfer", async (req, res) => {
  const { id } = params.parse(req.params);
  const { reason } = reverseBody.parse(req.body ?? {});
  res.json(await reverseRoomTransfer(id, actorOf(req), { overrideToken: overrideTokenOf(req), reason }));
});

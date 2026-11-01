import { Router } from "express";
import { z } from "zod";
import { actorOf } from "../../http/auth.js";
import {
  changeOwnPassword,
  changeOwnPin,
  grantOverride,
  loginWithPassword,
  loginWithPin,
  logout,
  me,
  type PinLoginInput
} from "./auth.service.js";

const pin = z.string().regex(/^\d{4,6}$/, "A PIN is 4 to 6 digits");
const ctx = (req: { ip?: string }) => ({ ip: req.ip });

const loginBody = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200)
});

// Exactly one way to sign in: { pin }, { username, pin } or { cardNo }.
const pinLoginBody = z
  .object({
    pin: pin.optional(),
    username: z.string().trim().min(1).max(64).optional(),
    cardNo: z.string().trim().min(1).max(64).optional(),
    departmentId: z.uuid().nullable().optional(),
    terminalId: z.string().trim().max(100).nullable().optional()
  })
  .refine(b => (b.cardNo ? !b.pin && !b.username : !!b.pin), {
    message: "Send { pin }, { username, pin } or { cardNo }"
  });

const overrideBody = z.object({
  action: z.string().regex(/^[a-z_]+(\.[a-z_]+)+$/, "An action looks like pos.void"),
  pin
});

/** No sign-in needed. */
export const publicAuthRouter = Router();

publicAuthRouter.post("/login", async (req, res) => {
  res.json(await loginWithPassword(loginBody.parse(req.body), ctx(req)));
});

publicAuthRouter.post("/pin-login", async (req, res) => {
  const b = pinLoginBody.parse(req.body);
  const how: PinLoginInput = b.cardNo
    ? { cardNo: b.cardNo }
    : b.username
      ? { username: b.username, pin: b.pin! }
      : { pin: b.pin! };
  res.json(await loginWithPin({ ...how, departmentId: b.departmentId, terminalId: b.terminalId }, ctx(req)));
});

/** Signed-in users only. */
export const authRouter = Router();

authRouter.post("/logout", async (req, res) => {
  await logout(actorOf(req));
  res.status(204).end();
});

authRouter.get("/me", async (req, res) => {
  res.json(await me(actorOf(req)));
});

authRouter.put("/me/pin", async (req, res) => {
  const b = z.object({ currentPin: pin.optional(), newPin: pin }).parse(req.body);
  await changeOwnPin(actorOf(req), b.currentPin, b.newPin);
  res.status(204).end();
});

authRouter.put("/me/password", async (req, res) => {
  const b = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().max(200) }).parse(req.body);
  await changeOwnPassword(actorOf(req), b.currentPassword, b.newPassword);
  res.status(204).end();
});

/** A super cashier types their PIN to allow one restricted action (e.g. pos.void) for this user.
 *  The returned overrideToken is sent with that action as the `x-override-token` header. */
authRouter.post("/override", async (req, res) => {
  res.status(201).json(await grantOverride(actorOf(req), overrideBody.parse(req.body), ctx(req)));
});

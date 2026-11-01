import type { RequestHandler } from "express";
import type { Actor } from "../modules/auth/actor.js";
import { resolveSession } from "../modules/auth/auth.service.js";
import { AppError } from "./errors.js";

export { assertCan, can, PERM, type Actor } from "../modules/auth/actor.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

/** Requires `Authorization: Bearer <token>` from /api/auth/login or /api/auth/pin-login. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const m = /^Bearer\s+(\S+)$/i.exec(req.header("authorization") ?? "");
  if (!m) throw new AppError(401, "UNAUTHENTICATED", "Please sign in");
  req.actor = await resolveSession(m[1]!);
  next();
};

export function actorOf(req: Express.Request): Actor {
  if (!req.actor) throw new AppError(401, "UNAUTHENTICATED", "Please sign in");
  return req.actor;
}

/** Override token for a restricted action, sent by the client as `x-override-token`. */
export const overrideTokenOf = (req: { header(name: string): string | undefined }) =>
  req.header("x-override-token") || undefined;

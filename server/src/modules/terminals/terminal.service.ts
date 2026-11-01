// Terminals (tills, waiter tablets, front desk PCs) and how they prove who they are to the master server.
// A terminal gets a random key when it is registered; the key is shown once and only its hash is kept.
import type { RequestHandler } from "express";
import { prisma } from "../../db.js";
import type { Terminal } from "../../generated/prisma/client.js";
import { AppError, conflict, notFound, unprocessable } from "../../http/errors.js";
import { audit } from "../../lib/audit.js";
import { burnVerifyTime, hashSecret, randomToken, verifySecret } from "../../lib/crypto.js";
import { assertCan, PERM, type Actor } from "../auth/actor.js";
import { guessLimiter } from "../auth/auth.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      terminal?: Terminal;
    }
  }
}

const view = (t: Terminal & { department?: { id: string; name: string } | null }) => ({
  id: t.id,
  name: t.name,
  department: t.department ?? null,
  active: t.active,
  lastSyncAt: t.lastSyncAt
});

export async function registerTerminal(input: { name: string; departmentId: string | null }, actor: Actor) {
  assertCan(actor, PERM.adminTerminals);
  if (input.departmentId) {
    const d = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!d || !d.active) throw notFound("Department");
  }
  if (await prisma.terminal.findUnique({ where: { name: input.name } }))
    throw conflict("TERMINAL_NAME_TAKEN", `A terminal called "${input.name}" already exists`);
  const key = randomToken();
  const t = await prisma.terminal.create({
    data: { name: input.name, departmentId: input.departmentId, secretHash: await hashSecret(key) },
    include: { department: { select: { id: true, name: true } } }
  });
  await audit(prisma, actor, "terminal.register", "Terminal", t.id, { name: t.name, departmentId: t.departmentId });
  return { ...view(t), key, note: "Store this key on the terminal now. It is not shown again." };
}

/** Issues a new key (old one stops working at once), e.g. when a device is lost or replaced. */
export async function rotateTerminalKey(id: string, actor: Actor) {
  assertCan(actor, PERM.adminTerminals);
  const key = randomToken();
  const t = await prisma.terminal
    .update({
      where: { id },
      data: { secretHash: await hashSecret(key) },
      include: { department: { select: { id: true, name: true } } }
    })
    .catch(() => {
      throw notFound("Terminal");
    });
  await audit(prisma, actor, "terminal.rotate_key", "Terminal", id);
  return { ...view(t), key, note: "Store this key on the terminal now. It is not shown again." };
}

export async function setTerminalActive(id: string, active: boolean, actor: Actor) {
  assertCan(actor, PERM.adminTerminals);
  const t = await prisma.terminal
    .update({ where: { id }, data: { active }, include: { department: { select: { id: true, name: true } } } })
    .catch(() => {
      throw notFound("Terminal");
    });
  await audit(prisma, actor, active ? "terminal.activate" : "terminal.deactivate", "Terminal", id);
  return view(t);
}

export async function listTerminals(actor: Actor) {
  assertCan(actor, PERM.adminTerminals);
  const ts = await prisma.terminal.findMany({
    include: { department: { select: { id: true, name: true } } },
    orderBy: { name: "asc" }
  });
  return ts.map(view);
}

/** Terminal requests carry `x-terminal-id` and `x-terminal-key`. Wrong keys count as guesses per IP. */
export const authenticateTerminal: RequestHandler = async (req, _res, next) => {
  const id = req.header("x-terminal-id") ?? "";
  const key = req.header("x-terminal-key") ?? "";
  const guessKey = "ip:" + (req.ip ?? "unknown");
  const wait = guessLimiter.blockedFor(guessKey);
  if (wait)
    throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many wrong terminal keys from this device", {
      retryAfterSeconds: Math.ceil(wait / 1000)
    });
  if (!/^[0-9a-f-]{36}$/i.test(id) || !key) throw new AppError(401, "TERMINAL_UNAUTHENTICATED", "Missing terminal id or key");
  const t = await prisma.terminal.findUnique({ where: { id } });
  if (!t) await burnVerifyTime(key);
  if (!t || !(await verifySecret(t.secretHash, key))) {
    guessLimiter.fail(guessKey);
    throw new AppError(401, "TERMINAL_UNAUTHENTICATED", "Unknown terminal or wrong key");
  }
  if (!t.active) throw new AppError(403, "TERMINAL_INACTIVE", `Terminal "${t.name}" has been deactivated`);
  req.terminal = t;
  next();
};

export function terminalOf(req: Express.Request): Terminal {
  if (!req.terminal) throw unprocessable("NO_TERMINAL", "Not a terminal request");
  return req.terminal;
}

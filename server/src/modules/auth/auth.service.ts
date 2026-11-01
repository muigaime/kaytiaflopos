// Sign-in, sessions and supervisor overrides.
//
// - Back Office: username + password.                       -> BACK_OFFICE session (12 h)
// - POS / Front Desk: PIN only, username + PIN, or staff card -> POS session (14 h), optionally
//   locked to one department the user is allocated to.
// - Sessions are random tokens; only their SHA-256 is stored. Logout revokes immediately.
// - Wrong passwords / PINs: 5 in a row lock that account for 5 minutes. Guesses that can't be tied to
//   an account (PIN-only, card) are limited per client IP: 10 failures per 5 minutes.
// - Overrides: a super cashier's PIN grants ONE use of ONE action to the requesting user, valid 2 minutes.
import { prisma, type Tx } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError, notFound } from "../../http/errors.js";
import { audit } from "../../lib/audit.js";
import { burnVerifyTime, hashSecret, pinFingerprint, randomToken, tokenHash, verifySecret } from "../../lib/crypto.js";
import { FailureLimiter } from "../../lib/rate-limit.js";
import { can, type Actor } from "./actor.js";

const MINUTE = 60_000;
const MAX_FAILS = 5;
const LOCK_MS = 5 * MINUTE;
const SESSION_TTL = { BACK_OFFICE: 12 * 60 * MINUTE, POS: 14 * 60 * MINUTE } as const;
const OVERRIDE_TTL = 2 * MINUTE;

export const PIN_RE = /^\d{4,6}$/;
export const PASSWORD_MIN = 8;

/** Unattributable guesses (PIN-only, card, override PINs), per client IP. */
export const guessLimiter = new FailureLimiter(10, 5 * MINUTE);

type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;
export interface ClientContext {
  ip?: string;
}

const wrong = (message: string) => new AppError(401, "INVALID_CREDENTIALS", message);
const secondsLeft = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

function lockedError(until: Date): AppError {
  const s = secondsLeft(until.getTime() - Date.now());
  return new AppError(429, "ACCOUNT_LOCKED", `Too many wrong attempts. Try again in ${Math.ceil(s / 60)} minute(s).`, {
    retryAfterSeconds: s
  });
}

function assertNotGuessing(key: string): void {
  const ms = guessLimiter.blockedFor(key);
  if (ms)
    throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many wrong attempts from this device. Wait and try again.", {
      retryAfterSeconds: secondsLeft(ms)
    });
}

export const publicUser = (u: UserWithRole) => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  role: u.role.name,
  permissions: u.role.permissions,
  isSuperCashier: u.role.isSuperCashier
});

// ---------------------------------------------------------------- failure bookkeeping

async function registerFailure(user: UserWithRole, action: string, ctx: ClientContext): Promise<void> {
  const u = await prisma.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } } });
  if (u.failedLogins >= MAX_FAILS)
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } });
  await audit(prisma, user, action, "User", user.id, { ip: ctx.ip, attempt: u.failedLogins });
}

async function registerSuccess(user: UserWithRole): Promise<void> {
  if (user.failedLogins || user.lockedUntil)
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
}

function assertNotLocked(user: UserWithRole): void {
  if (user.lockedUntil && user.lockedUntil > new Date()) throw lockedError(user.lockedUntil);
}

// ---------------------------------------------------------------- sessions

async function startSession(
  user: UserWithRole,
  kind: keyof typeof SESSION_TTL,
  opts: { departmentId?: string | null; terminalId?: string | null },
  ctx: ClientContext
) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL[kind]);
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash(token),
      kind,
      departmentId: opts.departmentId ?? null,
      terminalId: opts.terminalId ?? null,
      ip: ctx.ip,
      expiresAt
    }
  });
  await audit(prisma, user, "auth.login", "AuthSession", session.id, {
    kind,
    departmentId: session.departmentId,
    terminalId: session.terminalId,
    ip: ctx.ip
  });
  return { token, expiresAt, kind, departmentId: session.departmentId, user: publicUser(user) };
}

/** Turns a bearer token into the signed-in actor, or throws 401. */
export async function resolveSession(token: string): Promise<Actor> {
  const s = await prisma.authSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { include: { role: true } } }
  });
  const now = new Date();
  if (!s || s.revokedAt || !s.user.active) throw new AppError(401, "UNAUTHENTICATED", "Please sign in");
  if (s.expiresAt <= now) throw new AppError(401, "SESSION_EXPIRED", "Your session has ended. Please sign in again.");
  if (now.getTime() - s.lastSeenAt.getTime() > MINUTE)
    await prisma.authSession.update({ where: { id: s.id }, data: { lastSeenAt: now } });
  return {
    id: s.user.id,
    username: s.user.username,
    fullName: s.user.fullName,
    permissions: s.user.role.permissions,
    isSuperCashier: s.user.role.isSuperCashier,
    sessionId: s.id,
    sessionKind: s.kind,
    departmentId: s.departmentId
  };
}

export async function logout(actor: Actor): Promise<void> {
  await prisma.authSession.update({ where: { id: actor.sessionId }, data: { revokedAt: new Date() } });
  await audit(prisma, actor, "auth.logout", "AuthSession", actor.sessionId);
}

export async function me(actor: Actor) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    include: { role: true, departments: { include: { department: { select: { id: true, name: true } } } } }
  });
  return {
    ...publicUser(user),
    hasPin: !!user.pinHash,
    hasPassword: !!user.passwordHash,
    departments: user.departments.map(d => d.department),
    session: { id: actor.sessionId, kind: actor.sessionKind, departmentId: actor.departmentId }
  };
}

// ---------------------------------------------------------------- Back Office: password

export async function loginWithPassword(input: { username: string; password: string }, ctx: ClientContext) {
  const user = await prisma.user.findUnique({ where: { username: input.username.toLowerCase() }, include: { role: true } });
  if (!user || !user.active || !user.passwordHash) {
    await burnVerifyTime(input.password); // same response time whether or not the user exists
    throw wrong("Wrong username or password");
  }
  assertNotLocked(user);
  if (!(await verifySecret(user.passwordHash, input.password))) {
    await registerFailure(user, "auth.login_failed", ctx);
    throw wrong("Wrong username or password");
  }
  await registerSuccess(user);
  return startSession(user, "BACK_OFFICE", {}, ctx);
}

// ---------------------------------------------------------------- POS / Front Desk: PIN or card

export type PinLoginInput =
  | { pin: string; username?: undefined; cardNo?: undefined }
  | { username: string; pin: string; cardNo?: undefined }
  | { cardNo: string; pin?: undefined; username?: undefined };

export async function loginWithPin(
  input: PinLoginInput & { departmentId?: string | null; terminalId?: string | null },
  ctx: ClientContext
) {
  const guessKey = "ip:" + (ctx.ip ?? "unknown");
  let user: UserWithRole | null = null;

  if (input.username !== undefined) {
    // Front Desk style: pick yourself from the list, then PIN. Lockout is per account.
    user = await prisma.user.findUnique({ where: { username: input.username.toLowerCase() }, include: { role: true } });
    if (!user || !user.active || !user.pinHash) {
      await burnVerifyTime(input.pin);
      throw wrong("Wrong PIN");
    }
    assertNotLocked(user);
    if (!(await verifySecret(user.pinHash, input.pin))) {
      await registerFailure(user, "auth.pin_failed", ctx);
      throw wrong("Wrong PIN");
    }
  } else {
    // POS keypad (PIN only) or card swipe: the guess can't be tied to an account, so limit per device.
    assertNotGuessing(guessKey);
    if (input.cardNo !== undefined) {
      user = await prisma.user.findUnique({ where: { cardNo: input.cardNo }, include: { role: true } });
    } else {
      const found = await prisma.user.findUnique({ where: { pinLookup: pinFingerprint(input.pin) }, include: { role: true } });
      user = found?.pinHash && (await verifySecret(found.pinHash, input.pin)) ? found : null;
    }
    if (!user || !user.active) {
      guessLimiter.fail(guessKey);
      throw wrong(input.cardNo !== undefined ? "Card not recognised" : "Wrong PIN");
    }
    assertNotLocked(user);
  }

  if (input.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!dept || !dept.active) throw notFound("Department");
    const allocated =
      can(user.role, "*") ||
      (await prisma.userDepartment.count({ where: { userId: user.id, departmentId: dept.id } })) > 0;
    if (!allocated) throw new AppError(403, "NOT_ALLOCATED", `${user.fullName} is not allocated to ${dept.name}`);
  }

  await registerSuccess(user);
  return startSession(user, "POS", { departmentId: input.departmentId, terminalId: input.terminalId }, ctx);
}

// ---------------------------------------------------------------- PINs and passwords

/** Sets a user's PIN. PINs must be unique because the POS keypad signs in by PIN alone. */
export async function setUserPin(userId: string, pin: string): Promise<void> {
  if (!PIN_RE.test(pin)) throw new AppError(400, "INVALID_PIN", "A PIN is 4 to 6 digits");
  const lookup = pinFingerprint(pin);
  const taken = await prisma.user.findFirst({ where: { pinLookup: lookup, NOT: { id: userId } }, select: { id: true } });
  if (taken) throw new AppError(409, "PIN_TAKEN", "That PIN is already in use. Choose another.");
  await prisma.user.update({ where: { id: userId }, data: { pinHash: await hashSecret(pin), pinLookup: lookup } });
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
  if (password.length < PASSWORD_MIN)
    throw new AppError(400, "WEAK_PASSWORD", `A password needs at least ${PASSWORD_MIN} characters`);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashSecret(password) } });
}

export async function changeOwnPin(actor: Actor, currentPin: string | undefined, newPin: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id }, include: { role: true } });
  if (user.pinHash) {
    assertNotLocked(user);
    if (!currentPin || !(await verifySecret(user.pinHash, currentPin))) {
      await registerFailure(user, "auth.pin_change_failed", {});
      throw wrong("The current PIN is wrong");
    }
  }
  await setUserPin(actor.id, newPin);
  await audit(prisma, actor, "auth.pin_changed", "User", actor.id);
}

/** Changing the password signs the user out everywhere else. */
export async function changeOwnPassword(actor: Actor, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id }, include: { role: true } });
  assertNotLocked(user);
  if (!user.passwordHash || !(await verifySecret(user.passwordHash, currentPassword))) {
    await registerFailure(user, "auth.password_change_failed", {});
    throw wrong("The current password is wrong");
  }
  await setUserPassword(actor.id, newPassword);
  await prisma.authSession.updateMany({
    where: { userId: actor.id, revokedAt: null, NOT: { id: actor.sessionId } },
    data: { revokedAt: new Date() }
  });
  await audit(prisma, actor, "auth.password_changed", "User", actor.id);
}

// ---------------------------------------------------------------- supervisor overrides

/** A super cashier enters their PIN on the requester's device to allow one restricted action. */
export async function grantOverride(actor: Actor, input: { action: string; pin: string }, ctx: ClientContext) {
  const guessKey = "ip:" + (ctx.ip ?? "unknown");
  assertNotGuessing(guessKey);
  const found = await prisma.user.findUnique({ where: { pinLookup: pinFingerprint(input.pin) }, include: { role: true } });
  const supervisor = found?.pinHash && (await verifySecret(found.pinHash, input.pin)) ? found : null;
  if (!supervisor || !supervisor.active || !supervisor.role.isSuperCashier || !can(supervisor.role, input.action)) {
    guessLimiter.fail(guessKey);
    await audit(prisma, actor, "auth.override_denied", "User", actor.id, { action: input.action, ip: ctx.ip });
    throw new AppError(403, "OVERRIDE_DENIED", "That is not a supervisor PIN allowed to authorize this");
  }
  const token = randomToken();
  const grant = await prisma.overrideGrant.create({
    data: {
      tokenHash: tokenHash(token),
      action: input.action,
      requestedById: actor.id,
      authorizedById: supervisor.id,
      expiresAt: new Date(Date.now() + OVERRIDE_TTL)
    }
  });
  await audit(prisma, actor, "auth.override_granted", "OverrideGrant", grant.id, { action: input.action }, supervisor.id);
  return {
    overrideToken: token,
    action: grant.action,
    expiresAt: grant.expiresAt,
    authorizedBy: { id: supervisor.id, fullName: supervisor.fullName }
  };
}

/** For restricted actions: passes if the actor has the permission, otherwise consumes a valid override
 *  for exactly this action. Call inside the transaction that performs the action, so a failed action
 *  does not burn the override. Returns who authorized it (null when the actor's own permission sufficed). */
export async function authorize(
  tx: Tx,
  actor: Actor,
  permission: string,
  overrideToken?: string
): Promise<{ authorizedById: string | null }> {
  if (can(actor, permission)) return { authorizedById: null };
  if (!overrideToken)
    throw new AppError(403, "OVERRIDE_REQUIRED", "A supervisor must authorize this", { action: permission });
  const now = new Date();
  const used = await tx.overrideGrant.updateMany({
    where: { tokenHash: tokenHash(overrideToken), action: permission, requestedById: actor.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now }
  });
  if (used.count !== 1)
    throw new AppError(
      403,
      "OVERRIDE_INVALID",
      "The supervisor authorization has expired, was already used, or is for another action",
      { action: permission }
    );
  const grant = await tx.overrideGrant.findUniqueOrThrow({ where: { tokenHash: tokenHash(overrideToken) } });
  return { authorizedById: grant.authorizedById };
}

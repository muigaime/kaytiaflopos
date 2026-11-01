import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { AppError } from "../src/http/errors.js";
import { tokenHash } from "../src/lib/crypto.js";
import { authorize, resolveSession, setUserPassword, setUserPin } from "../src/modules/auth/auth.service.js";
import { resetDb } from "./helpers.js";

const app = createApp();
const api = () => request(app);
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

let ids: { manager: string; cashier: string; bar: string; kitchen: string };

beforeEach(async () => {
  await resetDb();
  const managerRole = await prisma.role.create({ data: { name: "Manager", isSuperCashier: true, permissions: ["*"] } });
  const cashierRole = await prisma.role.create({ data: { name: "Cashier", permissions: ["stock.count"] } });
  const bar = await prisma.department.create({ data: { name: "Bar", kind: "OUTLET" } });
  const kitchen = await prisma.department.create({ data: { name: "Kitchen", kind: "OUTLET" } });
  const manager = await prisma.user.create({
    data: { username: "peter", fullName: "Peter Mwangi", roleId: managerRole.id, cardNo: "KT0003" }
  });
  const cashier = await prisma.user.create({
    data: { username: "wanjiru", fullName: "Wanjiru Kamau", roleId: cashierRole.id, cardNo: "KT0001" }
  });
  await prisma.userDepartment.create({ data: { userId: cashier.id, departmentId: bar.id } });
  await setUserPassword(manager.id, "admin12345");
  await setUserPin(manager.id, "0000");
  await setUserPin(cashier.id, "1234");
  ids = { manager: manager.id, cashier: cashier.id, bar: bar.id, kitchen: kitchen.id };
});
afterAll(() => prisma.$disconnect());

const pinLogin = (body: object) => api().post("/api/auth/pin-login").send(body);

describe("Back Office password login", () => {
  it("signs in, works on protected endpoints, and stores only hashes", async () => {
    const res = await api().post("/api/auth/login").send({ username: "Peter", password: "admin12345" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ kind: "BACK_OFFICE", user: { username: "peter", role: "Manager", isSuperCashier: true } });

    const me = await api().get("/api/auth/me").set(bearer(res.body.token));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ fullName: "Peter Mwangi", hasPin: true, hasPassword: true });

    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: ids.manager } });
    expect(session.tokenHash).toBe(tokenHash(res.body.token));
    expect(session.tokenHash).not.toBe(res.body.token);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ids.manager } });
    expect(user.passwordHash).toMatch(/^scrypt\$/);
    expect(user.passwordHash).not.toContain("admin12345");
    expect(await prisma.auditLog.count({ where: { action: "auth.login", userId: ids.manager } })).toBe(1);
  });

  it("gives the same answer for a wrong password and an unknown user", async () => {
    const a = await api().post("/api/auth/login").send({ username: "peter", password: "nope-nope" });
    const b = await api().post("/api/auth/login").send({ username: "nobody", password: "nope-nope" });
    expect([a.status, b.status]).toEqual([401, 401]);
    expect(a.body.error).toEqual(b.body.error);
  });

  it("locks the account after 5 wrong passwords, then unlocks", async () => {
    for (let i = 0; i < 5; i++)
      expect((await api().post("/api/auth/login").send({ username: "peter", password: "wrong-pass" })).status).toBe(401);
    const locked = await api().post("/api/auth/login").send({ username: "peter", password: "admin12345" });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");

    await prisma.user.update({ where: { id: ids.manager }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect((await api().post("/api/auth/login").send({ username: "peter", password: "admin12345" })).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.manager } })).failedLogins).toBe(0);
  });
});

describe("POS / Front Desk login", () => {
  it("signs in by PIN alone, by staff + PIN, and by card", async () => {
    const byPin = await pinLogin({ pin: "1234" });
    expect(byPin.status).toBe(200);
    expect(byPin.body).toMatchObject({ kind: "POS", user: { username: "wanjiru" } });

    expect((await pinLogin({ username: "peter", pin: "0000" })).body.user.username).toBe("peter");
    expect((await pinLogin({ cardNo: "KT0001" })).body.user.username).toBe("wanjiru");

    expect((await pinLogin({ pin: "9999" })).status).toBe(401);
    expect((await pinLogin({ username: "peter", pin: "1234" })).status).toBe(401); // someone else's PIN
    expect((await pinLogin({ cardNo: "KT9999" })).body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("locks a session to a department the user is allocated to", async () => {
    const bar = await pinLogin({ pin: "1234", departmentId: ids.bar });
    expect(bar.status).toBe(200);
    expect((await api().get("/api/auth/me").set(bearer(bar.body.token))).body.session.departmentId).toBe(ids.bar);

    const kitchen = await pinLogin({ pin: "1234", departmentId: ids.kitchen });
    expect(kitchen.status).toBe(403);
    expect(kitchen.body.error.code).toBe("NOT_ALLOCATED");

    expect((await pinLogin({ pin: "0000", departmentId: ids.kitchen })).status).toBe(200); // manager: everywhere
  });

  it("blocks a device that keeps guessing PINs, even if it then guesses right", async () => {
    for (let i = 0; i < 10; i++) expect((await pinLogin({ pin: String(5000 + i) })).status).toBe(401);
    const blocked = await pinLogin({ pin: "1234" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("TOO_MANY_ATTEMPTS");
  });

  it("rejects mixed or incomplete login requests", async () => {
    expect((await pinLogin({ cardNo: "KT0001", pin: "1234" })).status).toBe(400);
    expect((await pinLogin({ username: "peter" })).status).toBe(400);
    expect((await pinLogin({ pin: "12" })).status).toBe(400);
  });
});

describe("sessions", () => {
  it("logout ends the session at once", async () => {
    const { token } = (await pinLogin({ pin: "1234" })).body;
    expect((await api().post("/api/auth/logout").set(bearer(token))).status).toBe(204);
    const after = await api().get("/api/auth/me").set(bearer(token));
    expect(after.status).toBe(401);
  });

  it("refuses expired sessions, deactivated users and missing tokens", async () => {
    const { token } = (await pinLogin({ pin: "1234" })).body;
    await prisma.authSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await api().get("/api/auth/me").set(bearer(token));
    expect(expired.body.error.code).toBe("SESSION_EXPIRED");

    const fresh = (await pinLogin({ pin: "0000" })).body.token;
    await prisma.user.update({ where: { id: ids.manager }, data: { active: false } });
    expect((await api().get("/api/auth/me").set(bearer(fresh))).status).toBe(401);
    expect((await api().get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/auth/me").set(bearer("made-up"))).status).toBe(401);
  });
});

describe("changing PIN and password", () => {
  it("keeps PINs unique and checks the current PIN", async () => {
    const { token } = (await pinLogin({ pin: "1234" })).body;
    const taken = await api().put("/api/auth/me/pin").set(bearer(token)).send({ currentPin: "1234", newPin: "0000" });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe("PIN_TAKEN");
    expect((await api().put("/api/auth/me/pin").set(bearer(token)).send({ currentPin: "1111", newPin: "4321" })).status).toBe(401);
    expect((await api().put("/api/auth/me/pin").set(bearer(token)).send({ currentPin: "1234", newPin: "4321" })).status).toBe(204);
    expect((await pinLogin({ pin: "4321" })).body.user.username).toBe("wanjiru");
    expect((await pinLogin({ pin: "1234" })).status).toBe(401);
  });

  it("a new password signs the user out everywhere else", async () => {
    const here = (await api().post("/api/auth/login").send({ username: "peter", password: "admin12345" })).body.token;
    const elsewhere = (await api().post("/api/auth/login").send({ username: "peter", password: "admin12345" })).body.token;
    const weak = await api().put("/api/auth/me/password").set(bearer(here)).send({ currentPassword: "admin12345", newPassword: "short" });
    expect(weak.status).toBe(400);
    const ok = await api()
      .put("/api/auth/me/password")
      .set(bearer(here))
      .send({ currentPassword: "admin12345", newPassword: "new-password-1" });
    expect(ok.status).toBe(204);
    expect((await api().get("/api/auth/me").set(bearer(here))).status).toBe(200);
    expect((await api().get("/api/auth/me").set(bearer(elsewhere))).status).toBe(401);
    expect((await api().post("/api/auth/login").send({ username: "peter", password: "new-password-1" })).status).toBe(200);
  });
});

describe("supervisor override", () => {
  const getCode = async (p: Promise<unknown>) =>
    p.then(
      () => "OK",
      (e: unknown) => (e instanceof AppError ? e.code : String(e))
    );

  it("a supervisor PIN allows one restricted action, once", async () => {
    const cashierToken = (await pinLogin({ pin: "1234" })).body.token;
    const cashier = await resolveSession(cashierToken);

    // The cashier can't authorize themselves.
    const self = await api().post("/api/auth/override").set(bearer(cashierToken)).send({ action: "pos.void", pin: "1234" });
    expect(self.status).toBe(403);
    expect(self.body.error.code).toBe("OVERRIDE_DENIED");

    const granted = await api().post("/api/auth/override").set(bearer(cashierToken)).send({ action: "pos.void", pin: "0000" });
    expect(granted.status).toBe(201);
    expect(granted.body.authorizedBy.fullName).toBe("Peter Mwangi");
    const override = granted.body.overrideToken as string;

    expect(await getCode(prisma.$transaction(tx => authorize(tx, cashier, "pos.void")))).toBe("OVERRIDE_REQUIRED");
    expect(await getCode(prisma.$transaction(tx => authorize(tx, cashier, "pos.discount", override)))).toBe("OVERRIDE_INVALID");
    const ok = await prisma.$transaction(tx => authorize(tx, cashier, "pos.void", override));
    expect(ok.authorizedById).toBe(ids.manager);
    expect(await getCode(prisma.$transaction(tx => authorize(tx, cashier, "pos.void", override)))).toBe("OVERRIDE_INVALID");

    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "auth.override_granted" } });
    expect(log).toMatchObject({ userId: ids.cashier, authorizedById: ids.manager });
  });

  it("an override only works for the user who asked for it, and expires", async () => {
    const cashierToken = (await pinLogin({ pin: "1234" })).body.token;
    const override = (await api().post("/api/auth/override").set(bearer(cashierToken)).send({ action: "pos.void", pin: "0000" }))
      .body.overrideToken as string;

    const other = await prisma.user.create({
      data: { username: "otieno", fullName: "Otieno", roleId: (await prisma.role.findFirstOrThrow({ where: { name: "Cashier" } })).id }
    });
    await setUserPin(other.id, "5678");
    const otherActor = await resolveSession((await pinLogin({ pin: "5678" })).body.token);
    expect(await getCode(prisma.$transaction(tx => authorize(tx, otherActor, "pos.void", override)))).toBe("OVERRIDE_INVALID");

    await prisma.overrideGrant.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const cashier = await resolveSession(cashierToken);
    expect(await getCode(prisma.$transaction(tx => authorize(tx, cashier, "pos.void", override)))).toBe("OVERRIDE_INVALID");
  });

  it("a user with the permission needs no override, and a failed action does not burn the override", async () => {
    const manager = await resolveSession((await pinLogin({ pin: "0000" })).body.token);
    expect(await prisma.$transaction(tx => authorize(tx, manager, "pos.void"))).toEqual({ authorizedById: null });

    const cashierToken = (await pinLogin({ pin: "1234" })).body.token;
    const cashier = await resolveSession(cashierToken);
    const override = (await api().post("/api/auth/override").set(bearer(cashierToken)).send({ action: "pos.void", pin: "0000" }))
      .body.overrideToken as string;
    await expect(
      prisma.$transaction(async tx => {
        await authorize(tx, cashier, "pos.void", override);
        throw new Error("the void itself failed");
      })
    ).rejects.toThrow("the void itself failed");
    expect((await prisma.$transaction(tx => authorize(tx, cashier, "pos.void", override))).authorizedById).toBe(ids.manager);
  });
});

import { Decimal, prisma } from "../src/db.js";
import type { Actor } from "../src/http/auth.js";
import { randomToken, tokenHash } from "../src/lib/crypto.js";
import { guessLimiter } from "../src/modules/auth/auth.service.js";
import { guestCheckLimiter } from "../src/modules/room-billing/room-billing.service.js";

/** Empties every table. Only ever runs against a database whose name ends in _test. */
export async function resetDb() {
  const [row] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  const db = row?.db ?? "";
  if (!db.endsWith("_test")) throw new Error(`Refusing to wipe "${db}": not a test database`);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map(t => `"${t.tablename}"`).join(", ")} CASCADE`);
  guessLimiter.clear();
  guestCheckLimiter.clear();
}

/** An actor for calling services directly (no HTTP). */
export const actorFrom = (u: { id: string; username: string; fullName: string }, permissions: string[]): Actor => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  permissions,
  isSuperCashier: permissions.includes("*"),
  sessionId: "test-session",
  sessionKind: "BACK_OFFICE",
  departmentId: null
});

/** A real session token for HTTP tests, without going through a login. */
export async function tokenFor(userId: string, kind: "BACK_OFFICE" | "POS" = "BACK_OFFICE"): Promise<string> {
  const token = randomToken();
  await prisma.authSession.create({
    data: { userId, kind, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 3_600_000) }
  });
  return token;
}

/** Manager (all permissions), a storekeeper who may only count, 3 departments, 3 stock items. */
export async function seed() {
  const managerRole = await prisma.role.create({ data: { name: "Manager", isSuperCashier: true, permissions: ["*"] } });
  const storeRole = await prisma.role.create({ data: { name: "Storekeeper", permissions: ["stock.count"] } });
  const manager = await prisma.user.create({ data: { username: "manager", fullName: "Peter Mwangi", roleId: managerRole.id } });
  const counter = await prisma.user.create({ data: { username: "store", fullName: "Otieno Odhiambo", roleId: storeRole.id } });

  const main = await prisma.department.create({ data: { name: "Main Store", kind: "STORE" } });
  const bar = await prisma.department.create({ data: { name: "Bar", kind: "OUTLET" } });
  const kitchen = await prisma.department.create({ data: { name: "Kitchen", kind: "OUTLET" } });
  const frontDesk = await prisma.department.create({ data: { name: "Front Desk", kind: "FRONT_OFFICE" } });

  const whisky = await prisma.stockItem.create({
    data: { code: "WHS", name: "Whiskey", baseUnit: "ml", purchaseUnit: "Bottle 750ml", unitsPerPurchase: 750, unitCost: 4 }
  });
  const tusker = await prisma.stockItem.create({ data: { code: "TSK", name: "Tusker", baseUnit: "pc", unitCost: 180 } });
  const beef = await prisma.stockItem.create({
    data: { code: "BEEF", name: "Beef", baseUnit: "g", unitCost: new Decimal("0.8"), yieldFactor: new Decimal("0.85") }
  });

  const bal = (departmentId: string, stockItemId: string, quantity: number) =>
    prisma.departmentInventory.create({ data: { departmentId, stockItemId, quantity } });
  await bal(main.id, whisky.id, 10000);
  await bal(main.id, tusker.id, 200);
  await bal(main.id, beef.id, 20000);
  await bal(bar.id, whisky.id, 7500);
  await bal(bar.id, tusker.id, 96);
  await bal(kitchen.id, beef.id, 3500);

  return {
    manager: actorFrom(manager, ["*"]),
    counter: actorFrom(counter, ["stock.count"]),
    managerUser: manager,
    counterUser: counter,
    main,
    bar,
    kitchen,
    frontDesk,
    whisky,
    tusker,
    beef
  };
}

export const qty = async (departmentId: string, stockItemId: string) =>
  (await prisma.departmentInventory.findUniqueOrThrow({ where: { departmentId_stockItemId: { departmentId, stockItemId } } }))
    .quantity.toString();

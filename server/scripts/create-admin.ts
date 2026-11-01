// Creates (or resets) an administrator with every permission.
//   npm run user:create-admin -- --username admin --name "Administrator" [--pin 0000]
// The password is asked for interactively (or read from ADMIN_PASSWORD), so it is not left in shell history.
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { assertSafeConfig } from "../src/config.js";
import { prisma } from "../src/db.js";
import { setUserPassword, setUserPin } from "../src/modules/auth/auth.service.js";

assertSafeConfig();
const { values } = parseArgs({
  options: { username: { type: "string" }, name: { type: "string" }, pin: { type: "string" } }
});
const username = (values.username ?? "admin").toLowerCase();
const fullName = values.name ?? "Administrator";

let password = process.env.ADMIN_PASSWORD ?? "";
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question(`Password for ${username} (8+ characters): `);
  rl.close();
}

const role = await prisma.role.upsert({
  where: { name: "Administrator" },
  create: { name: "Administrator", isSuperCashier: true, permissions: ["*"] },
  update: {}
});
const user = await prisma.user.upsert({
  where: { username },
  create: { username, fullName, roleId: role.id },
  update: { fullName, roleId: role.id, active: true, failedLogins: 0, lockedUntil: null }
});
await setUserPassword(user.id, password);
if (values.pin) await setUserPin(user.id, values.pin);
console.log(`Administrator "${username}" is ready.${values.pin ? " PIN set." : ""}`);
await prisma.$disconnect();

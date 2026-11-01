import type { Tx } from "../db.js";

const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/** Takes a transaction-scoped Postgres advisory lock. Concurrent transactions using the same key
 *  wait for each other, which makes check-then-insert sequences (numbering, overlap checks) safe. */
export async function lockKey(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

/** Next document number of the day, e.g. "ST-20261031-0003". Call under lockKey(tx, prefix). */
export async function nextDailyNumber(
  tx: Tx,
  prefix: string,
  countWithPrefix: (startsWith: string) => Promise<number>,
  now = new Date()
): Promise<string> {
  const base = `${prefix}-${ymd(now)}-`;
  const n = (await countWithPrefix(base)) + 1;
  return base + String(n).padStart(4, "0");
}

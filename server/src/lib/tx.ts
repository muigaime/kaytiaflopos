import { prisma, type Tx } from "../db.js";

/** Runs `fn` in the caller's transaction when one is given (e.g. a sync operation), otherwise in a new one.
 *  Lets the same service be called from an HTTP route and from inside the sync engine. */
export function withTx<T>(tx: Tx | undefined, fn: (tx: Tx) => Promise<T>, opts?: { timeout?: number }): Promise<T> {
  return tx ? fn(tx) : prisma.$transaction(fn, { maxWait: 10_000, timeout: opts?.timeout ?? 30_000 });
}

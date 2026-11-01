import type { z } from "zod";
import type { Tx } from "../../db.js";
import type { Terminal } from "../../generated/prisma/client.js";
import type { Actor } from "../auth/actor.js";

/** Something the office should review; the operation was still applied. */
export interface Warning {
  code: string;
  message: string;
}

export interface SyncContext {
  terminal: Terminal;
  operationId: string;
}

/** One kind of operation a terminal can push. `apply` runs inside the operation's transaction. */
export interface SyncHandler<S extends z.ZodType = z.ZodType> {
  /** Stored on the sync log, e.g. "Order". */
  entity: string;
  schema: S;
  apply(tx: Tx, payload: z.infer<S>, actor: Actor, ctx: SyncContext): Promise<{ result: unknown; warnings: Warning[] }>;
}

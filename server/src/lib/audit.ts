import type { Tx } from "../db.js";

/** Appends to the audit log inside the caller's transaction, so the log entry and the change
 *  it describes are committed (or rolled back) together. `who` is null when nobody is signed in
 *  (e.g. a failed login for an unknown user). */
export async function audit(
  tx: Tx,
  who: { id: string } | null,
  action: string,
  entity: string,
  entityId: string | null,
  data?: Record<string, unknown>,
  authorizedById?: string
): Promise<void> {
  await tx.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      userId: who?.id ?? null,
      authorizedById: authorizedById ?? null,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    }
  });
}

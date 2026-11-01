// POST /api/sync/push: a terminal hands over the operations it recorded (offline or online).
//
// Protocol
// - Each operation has a terminal-generated UUID `id` and a per-terminal `sequence` 1, 2, 3, ...
// - Operations are applied strictly in sequence order with no gaps. If the batch starts after the next
//   expected number, nothing is applied and the terminal is told which number to resend from.
// - Each operation runs in its own transaction together with its sync-log row: applied fully or not at all.
// - Re-sent operations (same id + sequence) are not applied again; the stored response is returned.
// - Business / validation errors REJECT that one operation (recorded, reported, sequence moves on).
//   Server faults (database down, ...) STOP the batch without recording, so the terminal simply retries.
// - Pushes from the same terminal are processed one at a time.
import { ZodError } from "zod";
import { prisma } from "../../db.js";
import { Prisma, type Terminal } from "../../generated/prisma/client.js";
import { AppError, unprocessable } from "../../http/errors.js";
import type { Actor } from "../auth/actor.js";
import { SYNC_HANDLERS } from "./sync.handlers.js";
import type { Warning } from "./sync.types.js";

export interface PushedOperation {
  id: string;
  sequence: number;
  type: string;
  userId: string;
  clientTime: string;
  payload: unknown;
}

interface OpError {
  code: string;
  message: string;
  details?: unknown;
}

export type OperationResult =
  | { id: string; sequence: number; status: "APPLIED"; result: unknown; warnings: Warning[]; duplicate?: boolean }
  | { id: string; sequence: number; status: "REJECTED"; error: OpError; duplicate?: boolean };

export interface PushResponse {
  results: OperationResult[];
  /** The sequence number the terminal should send next. */
  nextSequence: number;
  /** Present when processing stopped early; resend from `sequence`. */
  stopped?: { sequence: number; code: string; message: string; retryable: boolean };
}

// ---------------------------------------------------------------- one push at a time per terminal

const queues = new Map<string, Promise<unknown>>();
function oneAtATime<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).then(fn, fn);
  const tail = run.catch(() => undefined);
  queues.set(key, tail);
  void tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return run;
}

// ---------------------------------------------------------------- helpers

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

/** Business / validation problem with this operation -> reject it. Anything else -> stop and retry later. */
function asRejection(e: unknown): OpError | null {
  if (e instanceof AppError) return { code: e.code, message: e.message, details: e.details };
  if (e instanceof ZodError)
    return {
      code: "INVALID_PAYLOAD",
      message: "The operation's data is not valid",
      details: e.issues.map(i => ({ path: i.path.join("."), message: i.message }))
    };
  return null;
}

async function actorFor(userId: string, terminal: Terminal): Promise<Actor> {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!u || !u.active) throw unprocessable("UNKNOWN_USER", "The staff member is unknown or inactive on the server");
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    permissions: u.role.permissions,
    isSuperCashier: u.role.isSuperCashier,
    sessionId: `terminal:${terminal.id}`,
    sessionKind: "POS",
    departmentId: terminal.departmentId
  };
}

function fromLog(row: { id: string; sequence: number; status: string; response: unknown }): OperationResult {
  const r = (row.response ?? {}) as { result?: unknown; warnings?: Warning[]; error?: OpError };
  return row.status === "APPLIED"
    ? { id: row.id, sequence: row.sequence, status: "APPLIED", result: r.result, warnings: r.warnings ?? [], duplicate: true }
    : {
        id: row.id,
        sequence: row.sequence,
        status: "REJECTED",
        error: r.error ?? { code: "REJECTED", message: "Rejected" },
        duplicate: true
      };
}

// ---------------------------------------------------------------- push

export function pushOperations(terminal: Terminal, ops: PushedOperation[]): Promise<PushResponse> {
  return oneAtATime(terminal.id, async () => {
    const sorted = [...ops].sort((a, b) => a.sequence - b.sequence);
    const last = await prisma.syncOperation.aggregate({ where: { terminalId: terminal.id }, _max: { sequence: true } });
    let expected = (last._max.sequence ?? 0) + 1;
    const results: OperationResult[] = [];
    let stopped: PushResponse["stopped"];

    for (const op of sorted) {
      // Already received: answer again, apply nothing.
      if (op.sequence < expected) {
        const prev = await prisma.syncOperation.findUnique({ where: { id: op.id } });
        if (prev && prev.terminalId === terminal.id && prev.sequence === op.sequence) {
          results.push(fromLog(prev));
          continue;
        }
        stopped = {
          sequence: op.sequence,
          code: "SEQUENCE_REUSED",
          message: `Sequence ${op.sequence} was already used by another operation`,
          retryable: false
        };
        break;
      }
      if (op.sequence > expected) {
        stopped = {
          sequence: expected,
          code: "SEQUENCE_GAP",
          message: `Operation ${expected} is missing; resend from ${expected}`,
          retryable: true
        };
        break;
      }
      if (await prisma.syncOperation.findUnique({ where: { id: op.id }, select: { id: true } })) {
        stopped = { sequence: op.sequence, code: "OPERATION_ID_REUSED", message: `Operation id ${op.id} was already used`, retryable: false };
        break;
      }

      const handler = SYNC_HANDLERS[op.type];
      const base = {
        id: op.id,
        terminalId: terminal.id,
        sequence: op.sequence,
        entity: handler?.entity ?? "unknown",
        action: op.type,
        payload: json(op.payload ?? null),
        clientTime: new Date(op.clientTime),
        userId: op.userId
      };

      try {
        if (!handler) throw unprocessable("UNKNOWN_OPERATION", `Unknown operation type "${op.type}"`);
        const actor = await actorFor(op.userId, terminal);
        const payload = handler.schema.parse(op.payload);
        const out = await prisma.$transaction(
          async tx => {
            const applied = await handler.apply(tx, payload, actor, { terminal, operationId: op.id });
            const response = json({ result: applied.result, warnings: applied.warnings });
            await tx.syncOperation.create({ data: { ...base, status: "APPLIED", response } });
            return response as unknown as { result: unknown; warnings: Warning[] };
          },
          { maxWait: 10_000, timeout: 60_000 }
        );
        results.push({ id: op.id, sequence: op.sequence, status: "APPLIED", result: out.result, warnings: out.warnings });
      } catch (e) {
        const rejection = asRejection(e);
        if (!rejection) {
          console.error(`sync: terminal ${terminal.name} op ${op.sequence} failed`, e);
          stopped = { sequence: op.sequence, code: "SERVER_ERROR", message: "Temporary server problem; resend later", retryable: true };
          break;
        }
        try {
          await prisma.syncOperation.create({
            data: { ...base, status: "REJECTED", error: rejection.code, response: json({ error: rejection }) }
          });
        } catch (logError) {
          console.error("sync: could not record rejection", logError);
          stopped = { sequence: op.sequence, code: "SERVER_ERROR", message: "Temporary server problem; resend later", retryable: true };
          break;
        }
        results.push({ id: op.id, sequence: op.sequence, status: "REJECTED", error: rejection });
      }
      expected++;
    }

    await prisma.terminal.update({ where: { id: terminal.id }, data: { lastSyncAt: new Date() } });
    return { results, nextSequence: expected, ...(stopped ? { stopped } : {}) };
  });
}

/** Where a terminal stands, e.g. after reinstalling: the next sequence and the latest rejections. */
export async function syncStatus(terminal: Terminal) {
  const last = await prisma.syncOperation.aggregate({ where: { terminalId: terminal.id }, _max: { sequence: true } });
  const rejected = await prisma.syncOperation.findMany({
    where: { terminalId: terminal.id, status: "REJECTED" },
    orderBy: { sequence: "desc" },
    take: 50,
    select: { id: true, sequence: true, action: true, error: true, response: true, receivedAt: true }
  });
  return { terminalId: terminal.id, name: terminal.name, nextSequence: (last._max.sequence ?? 0) + 1, recentRejections: rejected };
}

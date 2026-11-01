import { Router } from "express";
import { z } from "zod";
import { authenticateTerminal, terminalOf } from "../terminals/terminal.service.js";
import { pushOperations, syncStatus } from "./sync.engine.js";

const pushBody = z.object({
  ops: z
    .array(
      z.object({
        id: z.uuid(),
        sequence: z.int().min(1),
        type: z.string().min(1).max(60),
        userId: z.uuid(),
        clientTime: z.iso.datetime({ offset: true }),
        payload: z.unknown()
      })
    )
    .min(1)
    .max(500)
    .refine(ops => new Set(ops.map(o => o.sequence)).size === ops.length, "Each sequence number may appear once")
    .refine(ops => new Set(ops.map(o => o.id)).size === ops.length, "Each operation id may appear once")
});

/** Terminal-authenticated (x-terminal-id + x-terminal-key), not user sessions. */
export const syncRouter = Router();
syncRouter.use(authenticateTerminal);

syncRouter.post("/push", async (req, res) => {
  const { ops } = pushBody.parse(req.body);
  res.json(await pushOperations(terminalOf(req), ops));
});

syncRouter.get("/status", async (req, res) => {
  res.json(await syncStatus(terminalOf(req)));
});

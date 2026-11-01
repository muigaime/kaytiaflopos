import { Router } from "express";
import { z } from "zod";
import { actorOf } from "../../http/auth.js";
import { listTerminals, registerTerminal, rotateTerminalKey, setTerminalActive } from "./terminal.service.js";

const params = z.object({ id: z.uuid() });

export const terminalRouter = Router();

terminalRouter.get("/", async (req, res) => {
  res.json(await listTerminals(actorOf(req)));
});

/** Register a terminal. The response holds its key, shown only this once. */
terminalRouter.post("/", async (req, res) => {
  const body = z
    .object({ name: z.string().trim().min(1).max(60), departmentId: z.uuid().nullable().default(null) })
    .parse(req.body);
  res.status(201).json(await registerTerminal(body, actorOf(req)));
});

terminalRouter.post("/:id/rotate-key", async (req, res) => {
  res.json(await rotateTerminalKey(params.parse(req.params).id, actorOf(req)));
});

terminalRouter.post("/:id/deactivate", async (req, res) => {
  res.json(await setTerminalActive(params.parse(req.params).id, false, actorOf(req)));
});

terminalRouter.post("/:id/activate", async (req, res) => {
  res.json(await setTerminalActive(params.parse(req.params).id, true, actorOf(req)));
});

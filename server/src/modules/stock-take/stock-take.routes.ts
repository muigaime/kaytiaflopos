import { Router } from "express";
import { z } from "zod";
import { actorOf } from "../../http/auth.js";
import { quantitySchema } from "../../lib/quantity.js";
import {
  approveStockTake,
  cancelStockTake,
  getStockTake,
  getStockTakeReport,
  recordCounts,
  startStockTake
} from "./stock-take.service.js";

const id = z.uuid();
const params = z.object({ id });

const startBody = z.object({
  departmentId: id.nullable().default(null),
  uncountedAsZero: z.boolean().default(false),
  note: z.string().trim().max(500).optional()
});

const countsBody = z.object({
  counts: z
    .array(
      z.object({
        departmentId: id,
        stockItemId: id,
        countedQuantity: quantitySchema.nullable(),
        narration: z.string().trim().max(500).optional()
      })
    )
    .min(1)
    .max(5000)
});

const cancelBody = z.object({ reason: z.string().trim().max(500).optional() }).default({});

export const stockTakeRouter = Router();

/** Start a stock take for one department (departmentId) or all of them (departmentId: null). */
stockTakeRouter.post("/", async (req, res) => {
  const body = startBody.parse(req.body ?? {});
  res.status(201).json(await startStockTake(body, actorOf(req)));
});

/** The count sheet with a live variance preview (or the frozen figures once approved). */
stockTakeRouter.get("/:id", async (req, res) => {
  res.json(await getStockTake(params.parse(req.params).id));
});

/** Enter or correct physical counts in bulk. countedQuantity: null clears a count. */
stockTakeRouter.put("/:id/counts", async (req, res) => {
  const { id } = params.parse(req.params);
  const { counts } = countsBody.parse(req.body);
  res.json(await recordCounts(id, counts, actorOf(req)));
});

/** "Approve & Take All Stocks at Once": commits every counted line in one transaction. */
stockTakeRouter.post("/:id/approve", async (req, res) => {
  res.json(await approveStockTake(params.parse(req.params).id, actorOf(req)));
});

stockTakeRouter.post("/:id/cancel", async (req, res) => {
  const { id } = params.parse(req.params);
  const { reason } = cancelBody.parse(req.body ?? {});
  res.json(await cancelStockTake(id, actorOf(req), reason));
});

/** Permanent audit report of an approved stock take. */
stockTakeRouter.get("/:id/report", async (req, res) => {
  res.json(await getStockTakeReport(params.parse(req.params).id));
});

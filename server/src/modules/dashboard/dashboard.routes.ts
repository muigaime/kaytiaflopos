import { Router } from "express";
import { z } from "zod";
import { actorOf } from "../../http/auth.js";
import { getDashboard } from "./dashboard.service.js";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const query = z.object({ from: ymd.optional(), to: ymd.optional(), asOf: ymd.optional(), departmentId: z.uuid().optional() });

export const dashboardRouter = Router();

/** GET /api/dashboard?from=2026-10-01&to=2026-10-31&departmentId=... (defaults: today, all departments) */
dashboardRouter.get("/", async (req, res) => {
  res.json(await getDashboard(query.parse(req.query), actorOf(req)));
});

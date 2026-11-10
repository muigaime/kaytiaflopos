import express from "express";
import { authenticate } from "./http/auth.js";
import { errorHandler } from "./http/errors.js";
import { authRouter, publicAuthRouter } from "./modules/auth/auth.routes.js";
import { cloudRouter } from "./modules/cloud/cloud.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { mailRouter } from "./modules/mail/mail.routes.js";
import { printRouter } from "./modules/printing/print.routes.js";
import { roomBillingRouter } from "./modules/room-billing/room-billing.routes.js";
import { stockTakeRouter } from "./modules/stock-take/stock-take.routes.js";
import { syncRouter } from "./modules/sync/sync.routes.js";
import { terminalRouter } from "./modules/terminals/terminal.routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Hotels' cloud copies: own key per site, and a larger body limit than the rest
  app.use("/api/cloud", cloudRouter);
  app.use(express.json({ limit: "5mb" }));

  // Public
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", publicAuthRouter);

  // Terminals (own key, not a user session)
  app.use("/api/sync", syncRouter);

  // Order tickets to network printers (own rule: this computer, or the print key)
  app.use("/api/print", printRouter);
  // Documents emailed to suppliers (same rule as printing)
  app.use("/api/mail", mailRouter);

  // Everything below requires a signed-in session
  app.use("/api", authenticate);
  app.use("/api/auth", authRouter);
  app.use("/api/terminals", terminalRouter);
  app.use("/api/stock-takes", stockTakeRouter);
  app.use("/api/orders", roomBillingRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "No such endpoint" } });
  });
  app.use(errorHandler);
  return app;
}

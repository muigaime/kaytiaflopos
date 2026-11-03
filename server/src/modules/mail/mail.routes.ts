import { Router, type Request, type Response } from "express";
import nodemailer from "nodemailer";
import { z } from "zod";
import { printAccess, printAllowed } from "../printing/print.routes.js";

// Emails a document to a supplier. Client terminals have no internet of their own, so they ask this
// server, which holds the mail account in its .env. It only sends a single PDF to a single address.

const mail = z.object({
  to: z.email().max(200),
  subject: z.string().trim().min(1).max(200),
  text: z.string().max(5000),
  filename: z.string().regex(/^[\w.-]{1,120}\.pdf$/),
  pdf: z.base64().max(4_000_000)
});

function account() {
  const host = process.env.SMTP_HOST,
    from = process.env.SMTP_FROM;
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT ?? 587),
    user = process.env.SMTP_USER,
    pass = process.env.SMTP_PASS;
  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user ? { auth: { user, pass } } : {}),
      connectionTimeout: 15000,
      socketTimeout: 20000
    })
  };
}

export const mailRouter = Router();

mailRouter.use(printAccess);

function refuse(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

mailRouter.post("/send", async (req: Request, res: Response) => {
  if (!printAllowed(req)) {
    return refuse(res, 403, "MAIL_FORBIDDEN", "This terminal needs the print key.");
  }
  const parsed = mail.safeParse(req.body);
  if (!parsed.success)
    return refuse(res, 400, "MAIL_INVALID", "Check the email address and message.");
  const { to, subject, text, filename, pdf } = parsed.data;
  const content = Buffer.from(pdf, "base64");
  if (content.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return refuse(res, 400, "MAIL_INVALID", "The attachment is not a PDF.");
  }
  const acc = account();
  if (!acc) return refuse(res, 503, "MAIL_NOT_SET", "Email isn't set up on the server.");
  try {
    await acc.transport.sendMail({
      from: acc.from,
      to,
      subject,
      text,
      attachments: [{ filename, content, contentType: "application/pdf" }]
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Email not sent:", (e as Error).message);
    refuse(res, 502, "MAIL_FAILED", "The mail server refused or did not answer. Nothing was sent.");
  }
});

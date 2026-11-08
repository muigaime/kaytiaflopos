import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { Router, type Request, type Response } from "express";
import nodemailer from "nodemailer";
import { z } from "zod";
import { printAccess, printAllowed } from "../printing/print.routes.js";

// Emails a document to a supplier. Client terminals have no internet of their own, so they ask this
// server, which holds the mail account in its .env. It sends one PDF, or one report email, to one address.

const mail = z
  .object({
    to: z.email().max(200),
    subject: z.string().trim().min(1).max(200),
    text: z.string().max(5000),
    filename: z
      .string()
      .regex(/^[\w.-]{1,120}\.pdf$/)
      .optional(),
    pdf: z.base64().max(4_000_000).optional(),
    html: z.string().max(3_000_000).optional()
  })
  .refine(m => m.html !== undefined || (m.pdf !== undefined && m.filename !== undefined));

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

// ---------------------------------------------------------------- the mail account
// Saved beside the program, on this computer only. The password never goes back to a screen.
let accountFile: string | null = null;
export function setMailAccountFile(file: string) {
  accountFile = file;
}
const oneLine = /^[^\r\n]*$/;
const accountForm = z.object({
  host: z.string().regex(/^[a-zA-Z0-9.-]{1,200}$/),
  port: z.number().int().min(1).max(65535),
  user: z.string().trim().min(1).max(200).regex(oneLine),
  pass: z.string().max(500).regex(oneLine).optional(),
  from: z.string().trim().min(3).max(200).regex(oneLine).includes("@")
});
/** Only someone at the computer that holds the account may see or change it, whatever key a till has. */
function onThisComputer(req: Request): boolean {
  const from = (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
  const own =
    from === "127.0.0.1" ||
    from === "::1" ||
    Object.values(networkInterfaces())
      .flat()
      .some(i => i?.address === from);
  const origin = req.get("origin");
  return own && (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}
function saveAccount(file: string, values: Record<string, string>) {
  const others = existsSync(file)
    ? readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter(l => l.trim() && !/^\s*SMTP_(HOST|PORT|USER|PASS|FROM)\s*=/.test(l))
    : [];
  const lines = Object.entries(values).map(([k, v]) => `${k}="${v}"`);
  writeFileSync(file + ".tmp", [...others, ...lines].join("\r\n") + "\r\n", { mode: 0o600 });
  renameSync(file + ".tmp", file);
}

export const mailRouter = Router();

mailRouter.use(printAccess);

function refuse(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

mailRouter.get("/account", (req: Request, res: Response) => {
  if (!onThisComputer(req))
    return refuse(res, 403, "MAIL_LOCAL_ONLY", "Set the email account on the main computer.");
  res.json({
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    from: process.env.SMTP_FROM ?? "",
    hasPass: Boolean(process.env.SMTP_PASS)
  });
});

mailRouter.post("/account", (req: Request, res: Response) => {
  if (!onThisComputer(req))
    return refuse(res, 403, "MAIL_LOCAL_ONLY", "Set the email account on the main computer.");
  if (!accountFile)
    return refuse(res, 503, "MAIL_NO_FILE", "This server keeps its mail account in its .env file.");
  const parsed = accountForm.safeParse(req.body);
  if (!parsed.success) return refuse(res, 400, "MAIL_INVALID", "Check the email account details.");
  const { host, port, user, pass, from } = parsed.data;
  const password = pass || process.env.SMTP_PASS || "";
  const values = {
    SMTP_HOST: host,
    SMTP_PORT: String(port),
    SMTP_USER: user,
    SMTP_PASS: password,
    SMTP_FROM: from
  };
  try {
    saveAccount(accountFile, values);
  } catch (e) {
    console.error("Email account not saved:", (e as Error).message);
    return refuse(res, 500, "MAIL_SAVE_FAILED", "The email account could not be saved.");
  }
  Object.assign(process.env, values);
  res.json({ ok: true });
});

mailRouter.post("/send", async (req: Request, res: Response) => {
  if (!printAllowed(req)) {
    return refuse(res, 403, "MAIL_FORBIDDEN", "This terminal needs the print key.");
  }
  const parsed = mail.safeParse(req.body);
  if (!parsed.success)
    return refuse(res, 400, "MAIL_INVALID", "Check the email address and message.");
  const { to, subject, text, filename, pdf, html } = parsed.data;
  const content = pdf === undefined ? null : Buffer.from(pdf, "base64");
  if (content && content.subarray(0, 5).toString("latin1") !== "%PDF-") {
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
      ...(html === undefined ? {} : { html }),
      ...(content ? { attachments: [{ filename, content, contentType: "application/pdf" }] } : {})
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Email not sent:", (e as Error).message);
    if ((e as { code?: string }).code === "EAUTH")
      return refuse(
        res,
        502,
        "MAIL_LOGIN",
        "The mail server refused the email address or password."
      );
    refuse(res, 502, "MAIL_FAILED", "The mail server refused or did not answer. Nothing was sent.");
  }
});

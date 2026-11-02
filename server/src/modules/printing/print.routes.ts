import net from "node:net";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

// Sends kitchen and bar tickets straight to network receipt printers (raw ESC/POS, normally port 9100).
// A browser cannot pick a printer by itself, so the POS asks this server to do it.

const job = z.object({
  printer: z.object({
    ip: z.ipv4(),
    port: z.int().min(9100).max(9109).default(9100)
  }),
  lines: z
    .array(
      z.object({
        t: z.string().max(200),
        bold: z.boolean().optional(),
        big: z.boolean().optional(),
        center: z.boolean().optional()
      })
    )
    .min(1)
    .max(300)
});

/** Only printers on the hotel's own network: this route must not reach anything else. */
export function isPrinterAddress(ip: string): boolean {
  const [a = 0, b = 0] = ip.split(".").map(Number);
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

const ESC = 0x1b;
const GS = 0x1d;
/** Printers read Latin-1. Control characters are dropped so ticket text cannot act as printer commands. */
const text = (s: string) =>
  Buffer.from(s.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/[^ -ÿ]/g, "?"), "latin1");

export function ticketBytes(lines: z.infer<typeof job>["lines"]): Buffer {
  const parts: Buffer[] = [Buffer.from([ESC, 0x40])];
  for (const l of lines) {
    parts.push(
      Buffer.from([
        ESC,
        0x61,
        l.center ? 1 : 0,
        ESC,
        0x45,
        l.bold ? 1 : 0,
        GS,
        0x21,
        l.big ? 0x11 : 0
      ]),
      text(l.t),
      Buffer.from([0x0a])
    );
  }
  parts.push(Buffer.from([ESC, 0x64, 4, GS, 0x56, 1]));
  return Buffer.concat(parts);
}

function send(ip: string, port: number, bytes: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = net.connect({ host: ip, port });
    s.setTimeout(4000, () => s.destroy(new Error("Printer did not answer")));
    s.on("error", reject);
    s.on("connect", () => s.end(bytes));
    s.on("close", hadError => {
      if (!hadError) resolve();
    });
  });
}

/** Browsers on the same computer may print. Anyone else needs PRINT_KEY from the server's .env. */
function allowed(req: Request): boolean {
  const key = process.env.PRINT_KEY;
  if (key) return req.get("x-print-key") === key;
  const from = req.socket.remoteAddress ?? "";
  const local = from === "127.0.0.1" || from === "::1" || from === "::ffff:127.0.0.1";
  const origin = req.get("origin");
  return local && (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}

export const printRouter = Router();

printRouter.use((req: Request, res: Response, next) => {
  const origin = req.get("origin");
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "content-type, x-print-key");
    res.set("Access-Control-Allow-Methods", "POST");
  }
  if (req.method === "OPTIONS") return void res.sendStatus(204);
  next();
});

printRouter.post("/ticket", async (req, res) => {
  if (!allowed(req)) {
    return void res
      .status(403)
      .json({ error: { code: "PRINT_FORBIDDEN", message: "This terminal needs the print key." } });
  }
  const parsed = job.safeParse(req.body);
  if (!parsed.success) {
    return void res
      .status(400)
      .json({ error: { code: "BAD_TICKET", message: "That is not a valid print job." } });
  }
  const { printer, lines } = parsed.data;
  if (!isPrinterAddress(printer.ip)) {
    return void res
      .status(400)
      .json({ error: { code: "BAD_PRINTER", message: "Printers must be on the local network." } });
  }
  try {
    await send(printer.ip, printer.port, ticketBytes(lines));
    res.json({ ok: true });
  } catch {
    res
      .status(502)
      .json({ error: { code: "PRINTER_OFFLINE", message: "The printer did not answer." } });
  }
});

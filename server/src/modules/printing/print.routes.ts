import { execFile } from "node:child_process";
import net from "node:net";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

// Sends kitchen and bar tickets straight to network receipt printers (raw ESC/POS, normally port 9100).
// A browser cannot pick a printer by itself, so the POS asks this server to do it.
// A printer can be on the network (ip and port) or installed in Windows on this computer (name).

const job = z.object({
  printer: z.union([
    z.object({
      ip: z.ipv4(),
      port: z.int().min(9100).max(9109).default(9100)
    }),
    z.object({ name: z.string().min(1).max(200) })
  ]),
  lines: z
    .array(
      z.object({
        t: z.string().max(200),
        bold: z.boolean().optional(),
        big: z.boolean().optional(),
        center: z.boolean().optional(),
        /** A black and white picture: w bytes per row, h rows, one bit a dot. */
        img: z
          .object({
            w: z.int().min(1).max(100),
            h: z.int().min(1).max(400),
            data: z.base64().max(60000)
          })
          .refine(i => Buffer.from(i.data, "base64").length === i.w * i.h)
          .optional()
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
    if (l.img) {
      const { w, h, data } = l.img;
      parts.push(
        Buffer.from([ESC, 0x61, 1, GS, 0x76, 0x30, 0, w & 255, w >> 8, h & 255, h >> 8]),
        Buffer.from(data, "base64")
      );
      continue;
    }
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

function powershell(script: string, input = "", env: NodeJS.ProcessEnv = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { env: { ...process.env, ...env }, timeout: 20000, maxBuffer: 1 << 22 },
      (err, out) => (err ? reject(err) : resolve(out))
    );
    p.stdin?.end(input);
  });
}

/** Virtual printers such as PDF, XPS, OneNote and fax make files or dialogs. They can't print a ticket. */
export function isTicketPrinter(port: string): boolean {
  return !/^(PORTPROMPT:|nul:|SHRFAX:|XPSPort:|FILE:|Microsoft\.)/i.test(port);
}

export async function installedPrinters(): Promise<string[]> {
  if (process.platform !== "win32") return [];
  const out = await powershell(
    "Get-Printer | Select-Object Name,PortName | ConvertTo-Json -Compress"
  );
  if (!out.trim()) return [];
  const found = JSON.parse(out) as
    { Name: string; PortName: string } | { Name: string; PortName: string }[];
  return (Array.isArray(found) ? found : [found])
    .filter(p => isTicketPrinter(p.PortName))
    .map(p => p.Name);
}

// Sends the ticket as it is, through the Windows spooler. The name goes in by environment, never into the script.
const SEND_RAW = `Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class KaytiaRaw {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class Doc { public string Name; public string File; public string Type; }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool OpenPrinterW(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern int StartDocPrinterW(IntPtr h, int level, Doc d);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int w);
  public static void Send(string name, byte[] bytes) {
    IntPtr h;
    if (!OpenPrinterW(name, out h, IntPtr.Zero)) throw new Exception("open");
    try {
      if (StartDocPrinterW(h, 1, new Doc { Name = "Kaytia Flow", Type = "RAW" }) == 0) throw new Exception("start");
      try {
        StartPagePrinter(h);
        int w;
        if (!WritePrinter(h, bytes, bytes.Length, out w) || w != bytes.Length) throw new Exception("write");
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
'@
[KaytiaRaw]::Send($env:KAYTIA_PRINTER, [Convert]::FromBase64String([Console]::In.ReadToEnd()))`;

export async function sendInstalled(name: string, bytes: Buffer): Promise<void> {
  await powershell(SEND_RAW, bytes.toString("base64"), { KAYTIA_PRINTER: name });
}

/** Browsers on the same computer may print. Anyone else needs PRINT_KEY from the server's .env. */
export function printAllowed(req: Request): boolean {
  const key = process.env.PRINT_KEY;
  if (key) return req.get("x-print-key") === key;
  const from = req.socket.remoteAddress ?? "";
  const local = from === "127.0.0.1" || from === "::1" || from === "::ffff:127.0.0.1";
  const origin = req.get("origin");
  return local && (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}

export const printRouter = Router();

export function printAccess(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("origin");
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "content-type, x-print-key");
    res.set("Access-Control-Allow-Methods", "GET, POST");
  }
  if (req.method === "OPTIONS") return void res.sendStatus(204);
  next();
}
printRouter.use(printAccess);

printRouter.get("/installed", async (req, res) => {
  if (!printAllowed(req)) {
    return void res
      .status(403)
      .json({ error: { code: "PRINT_FORBIDDEN", message: "This terminal needs the print key." } });
  }
  try {
    res.json({ printers: await installedPrinters() });
  } catch {
    res
      .status(502)
      .json({ error: { code: "PRINTERS_UNREAD", message: "Windows did not list the printers." } });
  }
});

printRouter.post("/ticket", async (req, res) => {
  if (!printAllowed(req)) {
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
  if ("ip" in printer && !isPrinterAddress(printer.ip)) {
    return void res
      .status(400)
      .json({ error: { code: "BAD_PRINTER", message: "Printers must be on the local network." } });
  }
  try {
    if ("ip" in printer) await send(printer.ip, printer.port, ticketBytes(lines));
    else {
      // Only a printer Windows lists here, so this route can't be pointed at anything else.
      if (!(await installedPrinters()).includes(printer.name)) {
        return void res.status(400).json({
          error: { code: "BAD_PRINTER", message: "That printer is not installed on this computer." }
        });
      }
      await sendInstalled(printer.name, ticketBytes(lines));
    }
    res.json({ ok: true });
  } catch {
    res
      .status(502)
      .json({ error: { code: "PRINTER_OFFLINE", message: "The printer did not answer." } });
  }
});

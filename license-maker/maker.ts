// ---- Kaytia License Maker: a small program, separate from Kaytia Flow, that makes license keys ----
// Keys are signed with the private key in license-private-key.json. That file is never built into this
// program: it is read from beside the program, or chosen on screen each time, and kept in memory only.
// The page is served to this computer only, under a random address, and opens in an app window.
import crypto from "node:crypto";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import sea from "node:sea";

declare const LIC_N_BUILD: string; // Kaytia Flow's public key, put in at build time

const EXE_DIR = path.dirname(process.execPath);
const KEY_FILE = path.join(EXE_DIR, "license-private-key.json");
const LOG_FILE = path.join(EXE_DIR, "KaytiaLicenses.json");
const TOKEN = crypto.randomBytes(18).toString("base64url");

type Issued = {
  at: number;
  c: string;
  i: string;
  t: string;
  e: string;
  days: number | null;
  m?: number;
  raw: string;
};
let signer: crypto.KeyObject | null = null;
let keyFrom = "";

const b64u = (b: Buffer) => b.toString("base64url");
/** The signing key, if it is an RSA private key that matches the public key inside Kaytia Flow. */
function useKey(jsonText: string, from: string): string {
  let jwk: crypto.JsonWebKey;
  try {
    jwk = JSON.parse(jsonText);
  } catch {
    return "That file isn't a signing key.";
  }
  if (jwk.kty !== "RSA" || !jwk.d || !jwk.n) return "That file isn't a private signing key.";
  if (jwk.n !== LIC_N_BUILD)
    return "That signing key doesn't belong to this Kaytia Flow. Keys made with it wouldn't be accepted.";
  try {
    const k = crypto.createPrivateKey({ key: jwk, format: "jwk" });
    const test = crypto.sign("sha256", Buffer.from("check"), k);
    const pub = crypto.createPublicKey({
      key: { kty: "RSA", n: jwk.n, e: jwk.e || "AQAB" },
      format: "jwk"
    });
    if (!crypto.verify("sha256", Buffer.from("check"), pub, test))
      return "That signing key doesn't work.";
    signer = k;
    keyFrom = from;
    return "";
  } catch {
    return "That signing key couldn't be opened.";
  }
}
if (fs.existsSync(KEY_FILE)) useKey(fs.readFileSync(KEY_FILE, "utf8"), "from beside this program");

function history(): Issued[] {
  try {
    const L = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
    return Array.isArray(L) ? L : [];
  } catch {
    return [];
  }
}
function saveHistory(L: Issued[]) {
  fs.writeFileSync(LOG_FILE + ".tmp", JSON.stringify(L, null, 1));
  fs.renameSync(LOG_FILE + ".tmp", LOG_FILE);
}
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A company key, exactly as Kaytia Flow reads it: KF1.<payload>.<RSA-SHA256 signature of the payload text>.
 * It works on any of the company's computers (i: "*"), up to m computers joined to its main computer. */
function make(b: Record<string, unknown>): { error?: string; key?: Issued } {
  if (!signer) return { error: "Load your signing key first." };
  const c = String(b.company ?? "")
      .trim()
      .replace(/\s+/g, " "),
    lifetime = b.lifetime === true,
    days = Math.floor(Number(b.days)),
    m = Math.floor(Number(b.machines));
  if (c.length < 2) return { error: "Enter the company name." };
  if (c.length > 80) return { error: "Keep the company name to 80 characters." };
  if (!lifetime && !(days >= 1 && days <= 3660))
    return { error: "Enter the license days, from 1 to 3660." };
  if (!(m >= 1 && m <= 500)) return { error: "Enter how many computers, from 1 to 500." };
  let e = "";
  if (!lifetime) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    e = ymd(d);
  }
  const at = Date.now(),
    p = b64u(Buffer.from(JSON.stringify({ c, i: "*", t: "full", e, at, m }))),
    sig = crypto.sign("sha256", Buffer.from(p), signer),
    raw = `KF1.${p}.${b64u(sig)}`,
    rec: Issued = { at, c, i: "*", t: "full", e, days: lifetime ? null : days, m, raw };
  const L = history();
  L.unshift(rec);
  saveHistory(L);
  return { key: rec };
}

const PAGE = Buffer.from(
  sea.isSea() ? (sea.getAsset("page.html") as ArrayBuffer) : new ArrayBuffer(0)
);
let lastSeen = Date.now();
function send(res: http.ServerResponse, status: number, body: unknown, type = "application/json") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise(ok => {
    let s = "";
    req.on("data", d => {
      s += d;
      if (s.length > 200000) req.destroy();
    });
    req.on("end", () => {
      try {
        ok(JSON.parse(s || "{}"));
      } catch {
        ok({});
      }
    });
  });
}
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || "/", "http://x");
  // Only this computer, only under the random address, only from this page.
  const host = String(req.headers.host || "");
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return send(res, 403, { error: "No." });
  if (!u.pathname.startsWith(`/${TOKEN}/`)) return send(res, 404, { error: "Not here." });
  const p = u.pathname.slice(TOKEN.length + 1);
  if (req.method === "POST" && req.headers.origin && req.headers.origin !== `http://${host}`)
    return send(res, 403, { error: "No." });
  lastSeen = Date.now();
  if (p === "/" && req.method === "GET") return send(res, 200, PAGE, "text/html; charset=utf-8");
  if (p === "/api/state")
    return send(res, 200, {
      loaded: !!signer,
      keyFrom,
      keyFile: KEY_FILE,
      logFile: LOG_FILE,
      list: history()
    });
  if (p === "/api/key" && req.method === "POST") {
    const b = await readBody(req),
      bad = useKey(String(b.text ?? ""), "from the file you chose");
    return bad ? send(res, 400, { error: bad }) : send(res, 200, { ok: true, keyFrom });
  }
  if (p === "/api/make" && req.method === "POST") {
    const r = make(await readBody(req));
    return r.error ? send(res, 400, { error: r.error }) : send(res, 200, r.key);
  }
  if (p === "/api/csv") {
    const rows = [
      ["Date", "Company", "Computers", "Days", "Last day", "Key"],
      ...history().map(x => [
        new Date(x.at).toISOString().slice(0, 10),
        x.c,
        x.m ?? 1,
        x.days ?? "Lifetime",
        x.e || "No end",
        x.raw
      ])
    ];
    res.writeHead(200, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="kaytia-licenses.csv"',
      "cache-control": "no-store"
    });
    return res.end("﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n"));
  }
  if (p === "/api/alive") return send(res, 200, { ok: true });
  if (p === "/api/bye" && req.method === "POST") {
    send(res, 200, { ok: true });
    return void setTimeout(() => process.exit(0), 200);
  }
  send(res, 404, { error: "Not here." });
});

function openWindow(url: string) {
  const roots = [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA
  ];
  const rels = [
    "Microsoft\\Edge\\Application\\msedge.exe",
    "Google\\Chrome\\Application\\chrome.exe"
  ];
  for (const rel of rels)
    for (const root of roots) {
      const exe = root ? path.join(root, rel) : "";
      if (exe && fs.existsSync(exe)) {
        spawn(exe, [`--app=${url}`, "--window-size=1180,860"], {
          detached: true,
          stdio: "ignore",
          windowsHide: true
        }).unref();
        return;
      }
    }
  execFile("cmd", ["/c", "start", "", url], { windowsHide: true });
}

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as { port: number }).port,
    url = `http://127.0.0.1:${port}/${TOKEN}/`;
  if (process.env.KAYTIA_LM_URL_FILE) fs.writeFileSync(process.env.KAYTIA_LM_URL_FILE, url); // for tests
  if (!process.env.KAYTIA_NO_BROWSER) openWindow(url);
});
// The window pings while it is open. When it has been closed for a minute, the program stops.
setInterval(() => {
  if (Date.now() - lastSeen > 60_000) process.exit(0);
}, 10_000).unref();

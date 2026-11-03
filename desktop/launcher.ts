// Kaytia Flow for Windows: installs itself to C:\KaytiaFlow, makes the Kaytia POS shortcut, serves the app to
// this computer's browser, prints, and shares data between computers on the local network.
// One computer is the Main: it keeps the shared data on its disk. Every other computer is a till, which
// works on its own and catches up with the Main whenever the network allows.
import { exec, execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import sea from "node:sea";
import zlib from "node:zlib";
import express, { type NextFunction, type Request, type Response } from "express";
import { mailRouter } from "../server/src/modules/mail/mail.routes.ts";
import { printRouter } from "../server/src/modules/printing/print.routes.ts";
import { CONNECT_PAGE } from "./connect-page.ts";
import { merge } from "./merge.js";

const HOME = process.env.KAYTIA_HOME ?? "C:\\KaytiaFlow";
const PORT = Number(process.env.KAYTIA_PORT ?? 5500);
const API_PORT = Number(process.env.KAYTIA_API_PORT ?? 4000);
const MAIN_PORT_DEFAULT = 5500;
const EXE = process.execPath;
const SHORTCUT = "Kaytia POS.lnk";
const CONFIG = path.join(HOME, "config.json");
const DATA = path.join(HOME, "data");
const REVS = path.join(DATA, "revisions");
const BACKUPS = path.join(HOME, "backups");
const KEEP_REVS = 500;
const KEEP_DAILY = 60;

type Config = {
  role: "main" | "till";
  chosen?: boolean;
  id: string; // this computer
  code: string; // what a till needs to join this Main
  epoch: string; // which set of shared data this is
  main?: string; // a till's Main computer, as host:port
  mainCode?: string;
  idx: number; // this computer's bill number series
  tills: Record<string, { idx: number; name: string; at: string }>;
};
const randomCode = () => {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.randomBytes(8), b => A[b % A.length]).join("");
};
function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
/** A power cut mid-save must not damage the file: the new one replaces the old in one step. */
function writeSafe(file: string, content: string | Buffer) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

// ---------------------------------------------------------------- installing
function powershell(script: string, env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((ok, no) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { env: { ...process.env, ...env }, timeout: 20000 },
      (err, out) => (err ? no(err) : ok(out))
    );
  });
}
/** The shortcut on this person's desktop. Names go in by environment, never into the script. */
async function makeShortcut(target: string) {
  const script = `$d = if ($env:KF_DESKTOP) { $env:KF_DESKTOP } else { [Environment]::GetFolderPath('Desktop') }
$s = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d $env:KF_NAME))
$s.TargetPath = $env:KF_TARGET
$s.WorkingDirectory = $env:KF_DIR
$s.IconLocation = $env:KF_TARGET + ',0'
$s.Description = 'Kaytia Flow POS'
$s.Save()`;
  await powershell(script, {
    KF_NAME: SHORTCUT,
    KF_TARGET: target,
    KF_DIR: path.dirname(target),
    KF_DESKTOP: process.env.KAYTIA_DESKTOP ?? ""
  });
}
/** Run from anywhere else: copy across to C:, make the shortcut, and start from there. */
async function installIfNeeded(): Promise<boolean> {
  if (path.dirname(EXE).toLowerCase() === HOME.toLowerCase()) return false;
  console.log(`Installing to ${HOME}...`);
  fs.mkdirSync(HOME, { recursive: true });
  const target = path.join(HOME, path.basename(EXE));
  try {
    fs.copyFileSync(EXE, target);
  } catch {
    console.log(`\nCould not update ${target}.`);
    console.log("Kaytia Flow may already be running. Close its window and try again.");
    await new Promise(r => setTimeout(r, 15000));
    process.exit(1);
  }
  for (const f of ["README.txt", "kaytia.env.example"]) {
    const from = path.join(path.dirname(EXE), f);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(HOME, f));
  }
  await makeShortcut(target).catch(e => console.log("Could not make the desktop shortcut:", e.message));
  console.log(`Done. "Kaytia POS" is on your desktop.`);
  spawn("cmd", ["/c", "start", "", target], { detached: true, stdio: "ignore", env: process.env }).unref();
  return true;
}

// ---------------------------------------------------------------- settings
function loadEnv() {
  const file = path.join(HOME, "kaytia.env");
  if (!fs.existsSync(file)) return false;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(raw);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return true;
}
function loadConfig(): Config {
  const c = readJson<Partial<Config>>(CONFIG, {});
  const cfg: Config = {
    role: c.role ?? "main",
    chosen: c.chosen,
    id: c.id ?? crypto.randomUUID(),
    code: c.code ?? randomCode(),
    epoch: c.epoch ?? crypto.randomUUID(),
    main: c.main,
    mainCode: c.mainCode,
    idx: c.idx ?? 0,
    tills: c.tills ?? {}
  };
  saveConfig(cfg);
  return cfg;
}
function saveConfig(c: Config) {
  fs.mkdirSync(HOME, { recursive: true });
  writeSafe(CONFIG, JSON.stringify(c, null, 2));
}

// ---------------------------------------------------------------- the shared data, on the Main's disk
type Store = { rev: number; data: unknown };
const currentFile = () => path.join(DATA, "current.json");
function readStore(): Store {
  return readJson<Store>(currentFile(), { rev: 0, data: null });
}
const revFile = (rev: number) => path.join(REVS, `${rev}.json.gz`);
function writeStore(rev: number, data: unknown): Store {
  const text = JSON.stringify(data);
  fs.mkdirSync(REVS, { recursive: true });
  writeSafe(revFile(rev), zlib.gzipSync(text));
  writeSafe(currentFile(), `{"rev":${rev},"data":${text}}`);
  prune(rev);
  dailyBackup(text);
  return { rev, data };
}
function prune(rev: number) {
  const old = rev - KEEP_REVS;
  if (old > 0) fs.rmSync(revFile(old), { force: true });
}
function dailyBackup(text: string) {
  fs.mkdirSync(BACKUPS, { recursive: true });
  const day = new Date().toISOString().slice(0, 10),
    file = path.join(BACKUPS, `kaytia-${day}.json.gz`);
  // Refreshed through the day, so that it always holds the day's latest.
  writeSafe(file, zlib.gzipSync(text));
  const all = fs.readdirSync(BACKUPS).filter(f => /^kaytia-\d{4}-\d\d-\d\d\.json\.gz$/.test(f)).sort();
  all.slice(0, Math.max(0, all.length - KEEP_DAILY)).forEach(f => fs.rmSync(path.join(BACKUPS, f), { force: true }));
}
function readRev(rev: number): unknown | null {
  try {
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(revFile(rev))).toString());
  } catch {
    return null;
  }
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
type SyncIn = { base: number | null; data: unknown; force?: boolean };
// What each computer last sent, and from which starting point. A computer that's busy, or that lost the answer,
// sends again from the same point. Its earlier changes are already in, so only what's new since then may count.
const clientFile = (id: string) => path.join(DATA, "clients", `${id.replace(/[^\w-]/g, "")}.json.gz`);
function readClient(id: string): { base: number | null; data: unknown } | null {
  try {
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(clientFile(id))).toString());
  } catch {
    return null;
  }
}
function writeClient(id: string, base: number | null, data: unknown) {
  fs.mkdirSync(path.dirname(clientFile(id)), { recursive: true });
  writeSafe(clientFile(id), zlib.gzipSync(JSON.stringify({ base, data })));
}
type SyncOut = { rev: number; same?: boolean; data?: unknown };
/** One save at a time, because this all runs in one go on the one Main computer. */
function syncOnMain(q: SyncIn, client: string): SyncOut {
  const cur = readStore();
  if (q.force && q.data) return { rev: writeStore(cur.rev + 1, q.data).rev, same: true };
  if (cur.rev === 0 || !cur.data) {
    if (!q.data) return { rev: 0, same: true };
    return { rev: writeStore(1, q.data).rev, same: true };
  }
  // Joining: take the Main's data, and keep a copy of what this computer had.
  if (q.base === null || q.base === undefined) {
    if (q.data) {
      fs.mkdirSync(BACKUPS, { recursive: true });
      writeSafe(path.join(BACKUPS, `joined-${Date.now()}.json.gz`), zlib.gzipSync(JSON.stringify(q.data)));
    }
    return { rev: cur.rev, data: cur.data };
  }
  if (q.base === cur.rev) {
    if (!q.data || same(q.data, cur.data)) return { rev: cur.rev, same: true };
    return { rev: writeStore(cur.rev + 1, q.data).rev, same: true };
  }
  if (!q.data) return { rev: cur.rev, data: cur.data };
  const last = readClient(client),
    from = last && last.base === q.base ? last.data : (readRev(q.base) ?? {}),
    merged = merge(from, q.data, cur.data);
  writeClient(client, q.base, q.data);
  const out = same(merged, cur.data) ? cur : writeStore(cur.rev + 1, merged);
  return same(merged, q.data) ? { rev: out.rev, same: true } : { rev: out.rev, data: out.data };
}

// ---------------------------------------------------------------- talking to the Main
async function toMain(cfg: Config, p: string, body?: unknown, timeoutMs = 20000) {
  const r = await fetch(`http://${cfg.main}${p}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-kaytia-code": cfg.mainCode ?? "" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> };
}
const lanAddresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter(a => a && a.family === "IPv4" && !a.internal)
    .map(a => a!.address);
const withPort = (host: string) => (/:\d+$/.test(host) ? host : `${host}:${MAIN_PORT_DEFAULT}`);

// ---------------------------------------------------------------- guards
const address = (req: Request) => (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
const isLocal = (req: Request) => ["127.0.0.1", "::1"].includes(address(req));
function isPrivate(ip: string) {
  if (["127.0.0.1", "::1"].includes(ip)) return true;
  const [a = 0, b = 0] = ip.split(".").map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}
/** Only this computer's own browser, on its own address: no other website can reach the data through it. */
function ownBrowserOnly(req: Request, res: Response, next: NextFunction) {
  const host = (req.get("host") ?? "").toLowerCase(),
    origin = req.get("origin"),
    okHost = [`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`].includes(host),
    okOrigin = !origin || origin === `http://${host}`;
  if (!isLocal(req) || !okHost || !okOrigin) return void res.status(403).json({ error: "This computer only." });
  next();
}
const tries = new Map<string, { n: number; at: number }>();
function tooMany(ip: string) {
  const t = tries.get(ip);
  return !!t && t.n >= 10 && Date.now() - t.at < 60000;
}
function badTry(ip: string) {
  const t = tries.get(ip);
  tries.set(ip, { n: t && Date.now() - t.at < 60000 ? t.n + 1 : 1, at: Date.now() });
}

async function main() {
  process.title = "Kaytia Flow";
  if (!process.env.KAYTIA_NO_INSTALL && (await installIfNeeded())) return void setTimeout(() => process.exit(0), 3000);
  const hasEnv = loadEnv();
  const cfg = loadConfig();
  if (!process.env.KAYTIA_NO_INSTALL) await makeShortcut(EXE).catch(() => {});

  const html = Buffer.from(sea.getAsset("app.html") as ArrayBuffer);
  const url = `http://localhost:${PORT}`;
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    // Other computers may only ever reach the tills' door below.
    if (!isLocal(req) && !req.path.startsWith("/net/")) return void res.status(403).end();
    next();
  });
  const big = express.json({ limit: "64mb" });

  // ---- the door for tills, on the Main
  const door = express.Router();
  door.use((req, res, next) => {
    const ip = address(req);
    if (!isPrivate(ip)) return void res.status(403).json({ error: "Local network only." });
    if (cfg.role !== "main") return void res.status(409).json({ error: "This computer is not the Main." });
    if (tooMany(ip)) return void res.status(429).json({ error: "Too many wrong codes. Wait a minute." });
    if (req.get("x-kaytia-code") !== cfg.code) {
      badTry(ip);
      return void res.status(401).json({ error: "That connect code isn't right." });
    }
    next();
  });
  door.post("/pair", big, (req, res) => {
    const id = String(req.body?.id ?? ""),
      name = String(req.body?.name ?? "Till").slice(0, 40);
    if (!id) return void res.status(400).json({ error: "No computer id." });
    let till = cfg.tills[id];
    if (!till) {
      const used = new Set(Object.values(cfg.tills).map(t => t.idx));
      let idx = 1;
      while (used.has(idx)) idx++;
      if (idx >= 20) return void res.status(409).json({ error: "This Main already has 19 tills." });
      till = { idx, name, at: new Date().toISOString() };
      cfg.tills[id] = till;
      saveConfig(cfg);
    }
    res.json({ idx: till.idx, epoch: cfg.epoch, name: os.hostname() });
  });
  door.get("/rev", (_req, res) => void res.json({ ok: true, rev: readStore().rev }));
  door.post("/sync", big, (req, res) => void res.json(syncOnMain(req.body as SyncIn, String(req.body?.client ?? "till"))));
  app.use("/net", door);

  // ---- this computer's own browser
  const lan = express.Router();
  lan.use(ownBrowserOnly);
  lan.get("/status", (_req, res) =>
    void res.json({
      kaytia: true,
      role: cfg.role,
      idx: cfg.idx,
      numbered: cfg.role === "till" || Object.keys(cfg.tills).length > 0,
      epoch: cfg.epoch,
      home: HOME,
      main: cfg.main ?? ""
    })
  );
  lan.get("/rev", async (_req, res) => {
    if (cfg.role === "main") return void res.json({ ok: true, rev: readStore().rev, numbered: Object.keys(cfg.tills).length > 0 });
    try {
      const r = await toMain(cfg, "/net/rev", undefined, 4000);
      res.json(r.status === 200 ? r.json : { ok: false });
    } catch {
      res.json({ ok: false });
    }
  });
  lan.post("/sync", big, async (req, res) => {
    if (cfg.role === "main") return void res.json(syncOnMain(req.body as SyncIn, "main"));
    try {
      const r = await toMain(cfg, "/net/sync", { ...req.body, client: cfg.id });
      res.status(r.status).json(r.json);
    } catch {
      res.status(503).json({ offline: true });
    }
  });
  lan.get("/info", (_req, res) =>
    void res.json({
      role: cfg.role,
      chosen: !!cfg.chosen,
      computer: os.hostname(),
      addresses: lanAddresses().map(a => (PORT === MAIN_PORT_DEFAULT ? a : `${a}:${PORT}`)),
      code: cfg.code,
      tills: Object.values(cfg.tills),
      main: cfg.main ?? "",
      rev: cfg.role === "main" ? readStore().rev : null,
      home: HOME
    })
  );
  lan.post("/main", big, (_req, res) => {
    if (cfg.role === "till") {
      // A former till starts its own set of shared data.
      cfg.epoch = crypto.randomUUID();
      cfg.main = undefined;
      cfg.mainCode = undefined;
    }
    cfg.role = "main";
    cfg.idx = 0;
    cfg.chosen = true;
    saveConfig(cfg);
    res.json({ ok: true });
  });
  lan.post("/connect", big, async (req, res) => {
    const host = withPort(String(req.body?.host ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")),
      code = String(req.body?.code ?? "").trim().toUpperCase();
    if (!/^[\w.-]+:\d+$/.test(host)) return void res.status(400).json({ error: "Enter the Main computer's address." });
    if (!code) return void res.status(400).json({ error: "Enter the connect code." });
    try {
      const r = await fetch(`http://${host}/net/pair`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-kaytia-code": code },
        body: JSON.stringify({ id: cfg.id, name: os.hostname() }),
        signal: AbortSignal.timeout(8000)
      });
      const j = (await r.json().catch(() => ({}))) as { idx?: number; epoch?: string; name?: string; error?: string };
      if (!r.ok || j.idx === undefined) return void res.status(400).json({ error: j.error ?? "The Main computer said no." });
      Object.assign(cfg, { role: "till", chosen: true, main: host, mainCode: code, idx: j.idx, epoch: j.epoch });
      saveConfig(cfg);
      res.json({ ok: true, main: j.name, idx: j.idx });
    } catch {
      res.status(400).json({ error: `Couldn't reach ${host}. Check the address, that Kaytia Flow is running there, and that its firewall allows it.` });
    }
  });
  app.use("/lan", lan);

  const page = (req: Request, res: Response) => {
    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.send(req.path === "/connect" ? CONNECT_PAGE : html);
  };
  app.get("/", page);
  app.get("/connect", page);
  app.use((_q, r) => void r.status(404).end());

  // ---- start: every address, because tills must be able to reach the Main. The guards above decide who gets what.
  const listen = (handler: http.RequestListener, port: number, host: string) =>
    new Promise<boolean>(ok => {
      const s = http.createServer(handler);
      s.once("error", () => ok(false));
      s.listen(port, host, () => ok(true));
    });
  console.log("Kaytia Flow\n");
  if (!(await listen(app as unknown as http.RequestListener, PORT, "0.0.0.0"))) {
    console.log(`Port ${PORT} is already in use, so Kaytia Flow may already be open.`);
    if (!process.env.KAYTIA_NO_BROWSER) exec(`start "" "${url}"`);
    return void setTimeout(() => process.exit(0), 4000);
  }
  await listen(app as unknown as http.RequestListener, PORT, "::1");

  const api = express();
  api.disable("x-powered-by");
  api.use(express.json({ limit: "5mb" }));
  api.get("/api/health", (_q, r) => void r.json({ ok: true }));
  api.use("/api/print", printRouter);
  api.use("/api/mail", mailRouter);
  api.use((_q, r) => void r.status(404).end());
  const apiOk = await listen(api as unknown as http.RequestListener, API_PORT, "127.0.0.1");
  await listen(api as unknown as http.RequestListener, API_PORT, "::1");

  console.log(`Running at ${url}`);
  console.log(cfg.role === "main" ? `This is the Main computer. Data is saved in ${DATA}` : `This is a till, connected to ${cfg.main}`);
  console.log(apiOk ? "Printing and email ready." : `Port ${API_PORT} is in use, so printing and email won't work from here.`);
  console.log(hasEnv ? "Mail settings loaded." : "Email isn't set up yet (see README.txt).");
  console.log("\nKeep this window open while you work. Close it to stop Kaytia Flow.");
  if (!process.env.KAYTIA_NO_BROWSER) exec(`start "" "${cfg.chosen ? url : `${url}/connect`}"`);
}
main().catch(e => {
  console.error("Kaytia Flow could not start:", e);
  setTimeout(() => process.exit(1), 20000);
});

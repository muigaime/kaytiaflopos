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
import {
  mailRouter,
  saveEnvValues,
  setMailAccountFile
} from "../server/src/modules/mail/mail.routes.ts";
import { printRouter } from "../server/src/modules/printing/print.routes.ts";
import { CONNECT_PAGE } from "./connect-page.ts";
import { merge } from "./merge.js";
import { createAttendance } from "./attendance.ts";
import { createEtims } from "./etims.ts";
import { createMpesa } from "./mpesa.ts";
import { readImage } from "./ocr.ts";

const HOME = process.env.KAYTIA_HOME ?? "C:\\KaytiaFlow";
const PORT = Number(process.env.KAYTIA_PORT ?? 5500);
const API_PORT = Number(process.env.KAYTIA_API_PORT ?? 4000);
const MAIN_PORT_DEFAULT = 5500;
const EXE = process.execPath;
const SHORTCUT = "Kaytia POS.lnk";
const INSTALLED = "KaytiaFlow.exe";
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
  tills: Record<string, { idx: number; name: string; at: string; ip?: string }>;
  net?: { user: string; salt: string; hash: string }; // the server login other computers join with
  machines?: { name: string; ip: string }[]; // computers added on the server before they join
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
function powershell(script: string, env: NodeJS.ProcessEnv, timeout = 20000): Promise<string> {
  return new Promise((ok, no) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { env: { ...process.env, ...env }, timeout },
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
/** The installed copy is locked while it runs, so a running one is closed first. Its data is already on disk. */
async function copyOverInstalled(target: string) {
  for (let i = 0; i < 6; i++) {
    try {
      fs.copyFileSync(EXE, target);
      return true;
    } catch {
      if (i === 0) {
        console.log("Closing the running Kaytia Flow...");
        await new Promise(r => execFile("taskkill", ["/IM", INSTALLED, "/F"], () => r(null)));
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return false;
}
/** Run from anywhere else, under any file name: install or update C:, make the shortcut, and start from there. */
async function installIfNeeded(): Promise<boolean> {
  if (path.dirname(EXE).toLowerCase() === HOME.toLowerCase()) return false;
  fs.mkdirSync(HOME, { recursive: true });
  const target = path.join(HOME, INSTALLED),
    updating = fs.existsSync(target);
  console.log(`${updating ? "Updating" : "Installing to"} ${HOME}...`);
  if (updating) {
    // The version before, in case this one has to be undone. Only the program: the data folders aren't touched.
    try {
      fs.copyFileSync(target, path.join(HOME, "KaytiaFlow.previous.exe"));
    } catch (e) {
      console.log("Could not keep a copy of the old version:", (e as Error).message);
    }
  }
  if (!(await copyOverInstalled(target))) {
    console.log(`\nCould not update ${target}.`);
    console.log("Close Kaytia Flow and try again.");
    await new Promise(r => setTimeout(r, 15000));
    process.exit(1);
  }
  for (const f of ["README.txt", "kaytia.env.example"]) {
    const from = path.join(path.dirname(EXE), f);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(HOME, f));
  }
  await makeShortcut(target).catch(e =>
    console.log("Could not make the desktop shortcut:", e.message)
  );
  console.log(
    updating
      ? "Updated. Your data was not touched. Refresh the browser page."
      : `Done. "Kaytia POS" is on your desktop.`
  );
  spawn("cmd", ["/c", "start", "", target], {
    detached: true,
    stdio: "ignore",
    env: process.env
  }).unref();
  return true;
}

// ---------------------------------------------------------------- the app window
const BROWSERS: Record<string, string[]> = {
  chrome: ["Google\\Chrome\\Application\\chrome.exe"],
  edge: ["Microsoft\\Edge\\Application\\msedge.exe"]
};
function browserPath(kind: string) {
  const roots = [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA
  ];
  for (const rel of BROWSERS[kind])
    for (const root of roots) {
      const full = root ? path.join(root, rel) : "";
      if (full && fs.existsSync(full)) return full;
    }
  return "";
}
/** Opens Kaytia Flow in a window of its own, with no tabs or address bar. The person's usual browser goes first, so their saved work is there. */
function openApp(url: string) {
  if (process.env.KAYTIA_NO_BROWSER) return;
  execFile(
    "reg",
    [
      "query",
      "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice",
      "/v",
      "ProgId"
    ],
    { timeout: 5000 },
    (_err, out) => {
      const order = /msedge/i.test(out ?? "") ? ["edge", "chrome"] : ["chrome", "edge"],
        exe = order.map(browserPath).find(Boolean);
      if (!exe) return void exec(`start "" "${url}"`);
      spawn(exe, [`--app=${url}`, "--start-maximized"], {
        detached: true,
        stdio: "ignore"
      }).unref();
    }
  );
}

// ---------------------------------------------------------------- settings
function loadEnv() {
  const file = path.join(HOME, "kaytia.env");
  if (!fs.existsSync(file)) return false;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(raw);
    if (m && process.env[m[1]] === undefined)
      process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
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
    tills: c.tills ?? {},
    net: c.net,
    machines: c.machines
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
  const all = fs
    .readdirSync(BACKUPS)
    .filter(f => /^kaytia-\d{4}-\d\d-\d\d\.json\.gz$/.test(f))
    .sort();
  all
    .slice(0, Math.max(0, all.length - KEEP_DAILY))
    .forEach(f => fs.rmSync(path.join(BACKUPS, f), { force: true }));
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
const clientFile = (id: string) =>
  path.join(DATA, "clients", `${id.replace(/[^\w-]/g, "")}.json.gz`);
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
      writeSafe(
        path.join(BACKUPS, `joined-${Date.now()}.json.gz`),
        zlib.gzipSync(JSON.stringify(q.data))
      );
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

// ---------------------------------------------------------------- the program's error log
const ERRLOG = path.join(HOME, "error.log");
function logError(msg: string) {
  try {
    fs.mkdirSync(HOME, { recursive: true });
    if (fs.existsSync(ERRLOG) && fs.statSync(ERRLOG).size > 1048576) {
      const text = fs.readFileSync(ERRLOG, "utf8");
      fs.writeFileSync(ERRLOG, text.slice(-524288));
    }
    fs.appendFileSync(
      ERRLOG,
      `${new Date().toISOString()} [Program] ${msg.replace(/\r?\n/g, " ").slice(0, 2000)}\n`
    );
  } catch {
    // A log that can't be written mustn't stop the program.
  }
}

// ---------------------------------------------------------------- the server login
const netHash = (pass: string, salt: string) => crypto.scryptSync(pass, salt, 32).toString("hex");
function netOk(c: Config, user: string, pass: string) {
  if (!c.net || user !== c.net.user) return false;
  const a = Buffer.from(netHash(pass, c.net.salt), "hex"),
    b = Buffer.from(c.net.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const USER_OK = /^[a-zA-Z_][a-zA-Z0-9_]{0,40}$/;
const passProblem = (p: string) =>
  p.length < 6
    ? "The password needs at least 6 characters."
    : p.length > 100 || /[\r\n]/.test(p)
      ? "That password can't be used."
      : "";

// ---------------------------------------------------------------- PostgreSQL (optional)
const PG_VERSION = "17.7-1";
const PG_URL = `https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-windows-x64.exe`;
const PG_ROOT = path.join(process.env.ProgramFiles ?? "C:\\Program Files", "PostgreSQL");
type PgJob = {
  stage: "idle" | "download" | "check" | "install" | "done" | "failed";
  got: number;
  total: number;
  msg: string;
};
const pgJob: PgJob = { stage: "idle", got: 0, total: 0, msg: "" };
const pgBusy = () => ["download", "check", "install"].includes(pgJob.stage);
function pgFind() {
  try {
    const v = fs
      .readdirSync(PG_ROOT)
      .filter(x => fs.existsSync(path.join(PG_ROOT, x, "bin", "psql.exe")))
      .sort((a, b) => parseFloat(b) - parseFloat(a))[0];
    return v ? { version: v, bin: path.join(PG_ROOT, v, "bin") } : null;
  } catch {
    return null;
  }
}
function psql(bin: string, user: string, pass: string, sql: string): Promise<string> {
  return new Promise((ok, no) => {
    execFile(
      path.join(bin, "psql.exe"),
      ["-h", "localhost", "-p", "5432", "-U", user, "-d", "postgres", "-w", "-tAc", sql],
      { env: { ...process.env, PGPASSWORD: pass }, timeout: 20000 },
      (err, stdout, stderr) => (err ? no(new Error(stderr || err.message)) : ok(stdout))
    );
  });
}
/** Check the login, make the kaytia database if it isn't there, and remember how to reach it. */
async function pgConnect(user: string, pass: string) {
  const pg = pgFind();
  if (!pg) throw new Error("PostgreSQL wasn't found on this computer.");
  try {
    await psql(pg.bin, user, pass, "SELECT 1");
  } catch (e) {
    throw new Error(
      /password authentication|role .* does not exist/i.test((e as Error).message)
        ? "PostgreSQL refused that username or password."
        : "PostgreSQL isn't answering on this computer."
    );
  }
  const has = await psql(pg.bin, user, pass, "SELECT 1 FROM pg_database WHERE datname='kaytia'");
  if (has.trim() !== "1") await psql(pg.bin, user, pass, "CREATE DATABASE kaytia");
  const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@localhost:5432/kaytia`;
  saveEnvValues(path.join(HOME, "kaytia.env"), { DATABASE_URL: url });
  process.env.DATABASE_URL = url;
}
/** Download, confirm it really comes from EnterpriseDB, install with Windows' permission, then connect. */
async function pgInstall(user: string, pass: string) {
  const file = path.join(os.tmpdir(), `kaytia-postgresql-${PG_VERSION}.exe`),
    options = path.join(os.tmpdir(), `kaytia-pg-${crypto.randomUUID()}.txt`);
  Object.assign(pgJob, { stage: "download", got: 0, total: 0, msg: "" });
  try {
    let r: globalThis.Response;
    try {
      r = await fetch(PG_URL, { signal: AbortSignal.timeout(3 * 3600 * 1000) });
    } catch {
      throw new Error("PostgreSQL could not be downloaded. Check the internet connection.");
    }
    if (!r.ok || !r.body) throw new Error("The PostgreSQL download isn't available right now.");
    pgJob.total = Number(r.headers.get("content-length") ?? 0);
    const out = await fs.promises.open(file, "w");
    try {
      for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
        await out.write(chunk);
        pgJob.got += chunk.length;
      }
    } finally {
      await out.close();
    }
    if (pgJob.total && pgJob.got !== pgJob.total)
      throw new Error("The PostgreSQL download stopped early. Try again.");

    pgJob.stage = "check";
    const signed = await powershell(
      "$s = Get-AuthenticodeSignature -LiteralPath $env:KF_FILE; if ($s.Status -eq 'Valid' -and $s.SignerCertificate.Subject -match 'EnterpriseDB') { 'yes' } else { 'no' }",
      { KF_FILE: file },
      300000
    );
    if (signed.trim() !== "yes")
      throw new Error("The download failed its safety check and was not run.");

    pgJob.stage = "install";
    // The password goes in a file, so it never shows in the list of running programs.
    fs.writeFileSync(
      options,
      [
        "mode=unattended",
        "unattendedmodeui=none",
        `superaccount=${user}`,
        `superpassword=${pass}`,
        "serverport=5432",
        "disable-components=pgAdmin,stackbuilder"
      ].join("\n"),
      { mode: 0o600 }
    );
    const code = await powershell(
      "$p = Start-Process -FilePath $env:KF_FILE -ArgumentList @('--optionfile', ('\"' + $env:KF_OPT + '\"')) -Verb RunAs -Wait -PassThru; $p.ExitCode",
      { KF_FILE: file, KF_OPT: options },
      40 * 60 * 1000
    ).catch(() => {
      throw new Error(
        "PostgreSQL was not installed. Windows needs an Administrator to approve it."
      );
    });
    if (code.trim() !== "0")
      throw new Error(`The PostgreSQL installer stopped (code ${code.trim()}).`);
    await pgConnect(user, pass);
    Object.assign(pgJob, { stage: "done", msg: "" });
  } catch (e) {
    Object.assign(pgJob, { stage: "failed", msg: (e as Error).message });
  } finally {
    fs.rmSync(options, { force: true });
    fs.rmSync(file, { force: true });
  }
}

// ---------------------------------------------------------------- exchange rates
/** Today's rates against the shilling, from a free public service. Nothing about the hotel is sent. */
async function fxLatest(): Promise<{ status: number; json: Record<string, unknown> }> {
  try {
    const r = await fetch(process.env.KAYTIA_FX_URL ?? "https://open.er-api.com/v6/latest/KES", {
      signal: AbortSignal.timeout(15000)
    });
    const j = (await r.json()) as { result?: string; rates?: Record<string, number> };
    if (!r.ok || j.result !== "success" || !j.rates)
      return { status: 502, json: { error: "The exchange rate service didn't answer properly." } };
    return { status: 200, json: { rates: j.rates } };
  } catch {
    return { status: 502, json: { error: "The exchange rate service can't be reached." } };
  }
}

// ---------------------------------------------------------------- guards
const address = (req: Request) => (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
const isLocal = (req: Request) => ["127.0.0.1", "::1"].includes(address(req));
function isPrivate(ip: string) {
  if (["127.0.0.1", "::1"].includes(ip)) return true;
  const [a = 0, b = 0] = ip.split(".").map(Number);
  return (
    a === 10 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254)
  );
}
/** Only this computer's own browser, on its own address: no other website can reach the data through it. */
function ownBrowserOnly(req: Request, res: Response, next: NextFunction) {
  const host = (req.get("host") ?? "").toLowerCase(),
    origin = req.get("origin"),
    okHost = [`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`].includes(host),
    okOrigin = !origin || origin === `http://${host}`;
  if (!isLocal(req) || !okHost || !okOrigin)
    return void res.status(403).json({ error: "This computer only." });
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
  if (!process.env.KAYTIA_NO_INSTALL && (await installIfNeeded()))
    return void setTimeout(() => process.exit(0), 3000);
  const showError = console.error.bind(console);
  console.error = (...a: unknown[]) => {
    logError(a.map(String).join(" "));
    showError(...a);
  };
  process.on("uncaughtExceptionMonitor", (e, origin) => logError(`${origin}: ${e.stack ?? e}`));
  const hasEnv = loadEnv();
  setMailAccountFile(path.join(HOME, "kaytia.env"));
  const mpesa = createMpesa(HOME, v => saveEnvValues(path.join(HOME, "kaytia.env"), v));
  const etims = createEtims(HOME, v => saveEnvValues(path.join(HOME, "kaytia.env"), v));
  const attendance = createAttendance(HOME, v => saveEnvValues(path.join(HOME, "kaytia.env"), v));
  const cfg = loadConfig();
  if (!process.env.KAYTIA_NO_INSTALL) await makeShortcut(EXE).catch(() => {});

  const html = Buffer.from(sea.getAsset("app.html") as ArrayBuffer);
  const url = `http://localhost:${PORT}`;
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    // Other computers may only ever reach the tills' door below.
    if (!isLocal(req) && !req.path.startsWith("/net/") && !req.path.startsWith("/iclock/"))
      return void res.status(403).end();
    next();
  });
  const big = express.json({ limit: "64mb" });

  // ---- the door for tills, on the Main
  const seen = new Map<string, number>(); // when each computer was last heard from
  const onlineNow = (ip?: string) => !!ip && Date.now() - (seen.get(ip) ?? 0) < 90000;
  const door = express.Router();
  door.use((req, res, next) => {
    const ip = address(req);
    if (!isPrivate(ip)) return void res.status(403).json({ error: "Local network only." });
    if (cfg.role !== "main")
      return void res.status(409).json({ error: "This computer is not the Main." });
    if (tooMany(ip))
      return void res.status(429).json({ error: "Too many wrong codes. Wait a minute." });
    if (req.path === "/join") return next();
    if (req.get("x-kaytia-code") !== cfg.code) {
      badTry(ip);
      return void res.status(401).json({ error: "That connect code isn't right." });
    }
    seen.set(ip, Date.now());
    next();
  });
  door.post("/join", big, (req, res) => {
    if (!cfg.net)
      return void res
        .status(409)
        .json({ error: "This server has no login yet. Use its connect code instead." });
    if (!netOk(cfg, String(req.body?.user ?? ""), String(req.body?.pass ?? ""))) {
      badTry(address(req));
      return void res.status(401).json({ error: "That username or password isn't right." });
    }
    res.json({ code: cfg.code });
  });
  const MPESA_OPS = ["status", "stk", "stk-state", "inbox", "check", "hold", "confirm"];
  door.post("/mpesa/:op", big, async (req, res) => {
    const op = String(req.params.op);
    if (!MPESA_OPS.includes(op)) return void res.status(404).end();
    const r = await mpesa.api(op, (req.body ?? {}) as Record<string, unknown>);
    res.status(r.status).json(r.json);
  });
  door.post("/etims/:op", big, async (req, res) => {
    const r = await etims.api(String(req.params.op), (req.body ?? {}) as Record<string, unknown>);
    res.status(r.status).json(r.json);
  });
  door.post("/fx", big, async (_req, res) => {
    const r = await fxLatest();
    res.status(r.status).json(r.json);
  });
  door.post("/pair", big, (req, res) => {
    const id = String(req.body?.id ?? ""),
      name = String(req.body?.name ?? "Till").slice(0, 40);
    if (!id) return void res.status(400).json({ error: "No computer id." });
    const ip = address(req),
      added = (cfg.machines ?? []).find(m => m.ip === ip);
    let till = cfg.tills[id];
    if (till && (till.ip !== ip || (added && till.name !== added.name))) {
      till.ip = ip;
      if (added) till.name = added.name;
      saveConfig(cfg);
    }
    if (!till) {
      const used = new Set(Object.values(cfg.tills).map(t => t.idx));
      let idx = 1;
      while (used.has(idx)) idx++;
      if (idx >= 20) return void res.status(409).json({ error: "This Main already has 19 tills." });
      till = { idx, name: added ? added.name : name, at: new Date().toISOString(), ip };
      cfg.tills[id] = till;
      saveConfig(cfg);
    }
    res.json({ idx: till.idx, epoch: cfg.epoch, name: os.hostname() });
  });
  door.get("/rev", (_req, res) => void res.json({ ok: true, rev: readStore().rev }));
  door.post(
    "/sync",
    big,
    (req, res) => void res.json(syncOnMain(req.body as SyncIn, String(req.body?.client ?? "till")))
  );
  app.use("/net", door);

  // ---- fingerprint and face readers
  const reader = express.Router();
  reader.use((req, res, next) => {
    if (!isPrivate(address(req))) return void res.status(403).end();
    next();
  });
  const raw = express.text({ type: () => true, limit: "4mb" });
  const sn = (req: Request) => String(req.query.SN ?? "");
  reader.get("/cdata", (req, res) => void res.type("text/plain").send(attendance.options(sn(req))));
  reader.post("/cdata", raw, (req, res) => {
    const body = typeof req.body === "string" ? req.body : "";
    res.type("text/plain").send(attendance.attlog(sn(req), String(req.query.table ?? ""), body));
  });
  reader.get(
    "/getrequest",
    (req, res) => void res.type("text/plain").send(attendance.poll(sn(req)))
  );
  reader.post("/devicecmd", raw, (_req, res) => void res.type("text/plain").send("OK"));
  reader.post("/punch", big, (req, res) => {
    const r = attendance.punch((req.body ?? {}) as Record<string, unknown>);
    res.status(r.status).json(r.json);
  });
  app.use("/iclock", reader);

  // ---- this computer's own browser
  const lan = express.Router();
  lan.use(ownBrowserOnly);
  lan.get(
    "/status",
    (_req, res) =>
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
    if (cfg.role === "main")
      return void res.json({
        ok: true,
        rev: readStore().rev,
        numbered: Object.keys(cfg.tills).length > 0
      });
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
  lan.get(
    "/info",
    (_req, res) =>
      void res.json({
        role: cfg.role,
        chosen: !!cfg.chosen,
        computer: os.hostname(),
        addresses: lanAddresses().map(a => (PORT === MAIN_PORT_DEFAULT ? a : `${a}:${PORT}`)),
        code: cfg.code,
        tills: Object.values(cfg.tills).map(t => ({ ...t, online: onlineNow(t.ip) })),
        machines: (cfg.machines ?? []).map(m => {
          const t = Object.values(cfg.tills).find(x => x.ip === m.ip);
          return { ...m, joined: !!t, online: onlineNow(m.ip) };
        }),
        netUser: cfg.net?.user ?? "",
        main: cfg.main ?? "",
        rev: cfg.role === "main" ? readStore().rev : null,
        home: HOME
      })
  );
  const becomeMain = () => {
    if (cfg.role === "till") {
      // A former till starts its own set of shared data.
      cfg.epoch = crypto.randomUUID();
      cfg.main = undefined;
      cfg.mainCode = undefined;
    }
    cfg.role = "main";
    cfg.idx = 0;
    cfg.chosen = true;
  };
  lan.post("/main", big, (_req, res) => {
    becomeMain();
    saveConfig(cfg);
    res.json({ ok: true });
  });
  lan.post("/server", big, (req, res) => {
    const user = String(req.body?.user ?? "").trim(),
      pass = String(req.body?.pass ?? "");
    if (!USER_OK.test(user))
      return void res.status(400).json({
        error: "Use only letters, numbers and _ in the username, starting with a letter."
      });
    const bad = passProblem(pass);
    if (bad) return void res.status(400).json({ error: bad });
    becomeMain();
    const salt = crypto.randomBytes(16).toString("hex");
    cfg.net = { user, salt, hash: netHash(pass, salt) };
    saveConfig(cfg);
    res.json({ ok: true });
  });
  lan.get("/pg", (_req, res) => {
    const found = pgFind();
    res.json({ found: found ? { version: found.version } : null, offer: PG_VERSION, job: pgJob });
  });
  lan.post("/pg", big, async (req, res) => {
    const mode = String(req.body?.mode ?? ""),
      user = String(req.body?.user ?? "").trim(),
      pass = String(req.body?.pass ?? "");
    if (!USER_OK.test(user) || passProblem(pass))
      return void res.status(400).json({ error: "Check the username and password." });
    if (pgBusy())
      return void res.status(409).json({ error: "PostgreSQL is already being installed." });
    if (mode === "use") {
      try {
        await pgConnect(user, pass);
        return void res.json({ ok: true });
      } catch (e) {
        return void res.status(400).json({ error: (e as Error).message });
      }
    }
    if (mode !== "install") return void res.status(400).json({ error: "Choose an option." });
    void pgInstall(user, pass);
    res.json({ started: true });
  });
  // M-Pesa: a till asks the server, which holds the keys, the modem and the one list of payments.
  lan.post("/mpesa/:op", big, async (req, res) => {
    const op = String(req.params.op),
      body = (req.body ?? {}) as Record<string, unknown>;
    if (!MPESA_OPS.includes(op)) return void res.status(404).end();
    try {
      const r =
        cfg.role === "main"
          ? await mpesa.api(op, body)
          : await toMain(cfg, `/net/mpesa/${op}`, body, 30000);
      res.status(r.status).json(r.json);
    } catch {
      res.status(503).json({ offline: true });
    }
  });
  lan.post("/etims/:op", big, async (req, res) => {
    const op = String(req.params.op),
      body = (req.body ?? {}) as Record<string, unknown>;
    try {
      const r =
        cfg.role === "main"
          ? await etims.api(op, body)
          : await toMain(cfg, `/net/etims/${op}`, body, 30000);
      res.status(r.status).json(r.json);
    } catch {
      res.status(503).json({ offline: true });
    }
  });
  lan.post("/etims-admin/:op", big, async (req, res) => {
    if (cfg.role !== "main")
      return void res.status(409).json({ error: "Set this up on the main computer." });
    const r = await etims.admin(String(req.params.op), (req.body ?? {}) as Record<string, unknown>);
    res.status(r.status).json(r.json);
  });
  lan.post("/ocr", big, async (req, res) => {
    const r = await readImage(String(req.body?.image ?? ""));
    res.status(r.status).json(r.json);
  });
  lan.post("/fx", big, async (_req, res) => {
    try {
      const r = cfg.role === "main" ? await fxLatest() : await toMain(cfg, "/net/fx", {}, 20000);
      res.status(r.status).json(r.json);
    } catch {
      res.status(503).json({ offline: true });
    }
  });
  lan.post("/attendance/:op", big, (req, res) => {
    if (cfg.role !== "main")
      return void res.status(409).json({ error: "Set this up on the main computer." });
    const op = String(req.params.op),
      body = (req.body ?? {}) as Record<string, unknown>;
    if (op === "pull") return void res.json(attendance.pull(Number(body.after) || 0));
    if (op === "info") return void res.json(attendance.info());
    if (op !== "save") return void res.status(404).end();
    const r = attendance.save(body);
    res.status(r.status).json(r.json);
  });
  lan.get("/errlog", (_req, res) => {
    let lines: string[] = [];
    try {
      lines = fs.readFileSync(ERRLOG, "utf8").split(/\r?\n/).filter(Boolean).slice(-300);
    } catch {
      lines = [];
    }
    res.json({ lines });
  });
  lan.post("/errlog/clear", (_req, res) => {
    fs.rmSync(ERRLOG, { force: true });
    res.json({ ok: true });
  });
  lan.post("/mpesa-admin/:op", big, async (req, res) => {
    if (cfg.role !== "main")
      return void res.status(409).json({ error: "Set this up on the main computer." });
    const r = await mpesa.admin(String(req.params.op), (req.body ?? {}) as Record<string, unknown>);
    res.status(r.status).json(r.json);
  });
  const machineIp = /^[a-zA-Z0-9.-]{1,100}$/;
  lan.post("/machine", big, (req, res) => {
    const name = String(req.body?.name ?? "")
        .trim()
        .slice(0, 40),
      ip = String(req.body?.ip ?? "").trim();
    if (cfg.role !== "main")
      return void res.status(409).json({ error: "This computer isn't the server." });
    if (!name) return void res.status(400).json({ error: "Enter the computer's name." });
    if (!machineIp.test(ip))
      return void res.status(400).json({ error: "Enter the computer's IP address." });
    cfg.machines = cfg.machines ?? [];
    if (cfg.machines.some(m => m.ip === ip))
      return void res.status(400).json({ error: "That IP address is already on the list." });
    cfg.machines.push({ name, ip });
    saveConfig(cfg);
    res.json({ ok: true });
  });
  lan.post("/machine/remove", big, (req, res) => {
    cfg.machines = (cfg.machines ?? []).filter(m => m.ip !== String(req.body?.ip ?? ""));
    saveConfig(cfg);
    res.json({ ok: true });
  });
  lan.post("/connect", big, async (req, res) => {
    const host = withPort(
        String(req.body?.host ?? "")
          .trim()
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, "")
      ),
      user = String(req.body?.user ?? "").trim(),
      pass = String(req.body?.pass ?? "");
    let code = String(req.body?.code ?? "")
      .trim()
      .toUpperCase();
    if (!/^[\w.-]+:\d+$/.test(host))
      return void res.status(400).json({ error: "Enter the server's IP address." });
    if (!code && !user)
      return void res.status(400).json({ error: "Enter the server's username and password." });
    try {
      if (!code) {
        const r = await fetch(`http://${host}/net/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ user, pass }),
          signal: AbortSignal.timeout(8000)
        });
        const j = (await r.json().catch(() => ({}))) as { code?: string; error?: string };
        if (!r.ok || !j.code)
          return void res.status(400).json({ error: j.error ?? "The server said no." });
        code = j.code;
      }
      const r = await fetch(`http://${host}/net/pair`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-kaytia-code": code },
        body: JSON.stringify({ id: cfg.id, name: os.hostname() }),
        signal: AbortSignal.timeout(8000)
      });
      const j = (await r.json().catch(() => ({}))) as {
        idx?: number;
        epoch?: string;
        name?: string;
        error?: string;
      };
      if (!r.ok || j.idx === undefined)
        return void res.status(400).json({ error: j.error ?? "The Main computer said no." });
      Object.assign(cfg, {
        role: "till",
        chosen: true,
        main: host,
        mainCode: code,
        idx: j.idx,
        epoch: j.epoch
      });
      saveConfig(cfg);
      res.json({ ok: true, main: j.name, idx: j.idx });
    } catch {
      res.status(400).json({
        error: `Couldn't reach ${host}. Check the address, that Kaytia Flow is running there, and that its firewall allows it.`
      });
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
    openApp(url);
    return void setTimeout(() => process.exit(0), 4000);
  }
  await listen(app as unknown as http.RequestListener, PORT, "::1");

  const api = express();
  api.disable("x-powered-by");
  api.use(express.json({ limit: "5mb" }));
  api.get("/api/health", (_q, r) => void r.json({ ok: true }));
  api.use("/api/print", printRouter);
  api.use("/api/mail", mailRouter);
  // Safaricom's answer, when the hotel gives it a public address. The long token in the address is the check.
  api.post("/api/mpesa/cb/:token", (req, res) => {
    const known = mpesa.callback(String(req.params.token), req.body);
    res.status(known ? 200 : 404).json({ ResultCode: 0, ResultDesc: "Accepted" });
  });
  if (cfg.role === "main") mpesa.startModem();
  api.use((_q, r) => void r.status(404).end());
  const apiOk = await listen(api as unknown as http.RequestListener, API_PORT, "127.0.0.1");
  await listen(api as unknown as http.RequestListener, API_PORT, "::1");

  console.log(`Running at ${url}`);
  console.log(
    cfg.role === "main"
      ? `This is the Main computer. Data is saved in ${DATA}`
      : `This is a till, connected to ${cfg.main}`
  );
  console.log(
    apiOk
      ? "Printing and email ready."
      : `Port ${API_PORT} is in use, so printing and email won't work from here.`
  );
  console.log(hasEnv ? "Mail settings loaded." : "Email isn't set up yet (see README.txt).");
  console.log("\nKeep this window open while you work. Close it to stop Kaytia Flow.");
  openApp(cfg.chosen ? url : `${url}/connect`);
}
main().catch(e => {
  console.error("Kaytia Flow could not start:", e);
  setTimeout(() => process.exit(1), 20000);
});

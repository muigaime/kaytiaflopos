// ---- Cloud copy: the Main computer keeps a copy of the hotel's data on a cloud server ----
// Tills never talk to the cloud: they sync with the Main over the local network, and the Main sends the
// latest data up whenever it changes. With no internet the hotel keeps working; the copy catches up later.
//
// The cloud server's side (server/src/modules/cloud/cloud.routes.ts is one):
//   GET  {url}/api/cloud/ping                 -> 200 { ok: true }
//   POST {url}/api/cloud/push  { site, rev, at, sha256, gz }  -> 200 { ok: true, rev }
//   GET  {url}/api/cloud/latest?site=SITE     -> 200 { site, rev, at, sha256, gz } or 404
// Every request carries   Authorization: Bearer <key>   and   x-kaytia-site: <site>.
// gz is the data as gzip, in base64. sha256 is of the unzipped JSON, so the cloud can check it arrived whole.
// The key is kept in kaytia.env on the Main only, and is never sent to the screens.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export type Reply = { status: number; json: Record<string, unknown> };
type State = {
  lastRev: number;
  lastAt: string;
  lastTry: string;
  lastError: string;
  online: boolean;
  checkedAt: string;
};

const EVERY = 60_000; // how often the Main looks for changes to send
const PING_EVERY = 5 * 60_000; // how often it checks the cloud when nothing has changed

/** https, or http to this computer or the local network (for a cloud server in the building or a test). */
export function cloudUrlOk(u: string) {
  if (/[\s"'\\<>]/.test(u)) return false;
  let x: URL;
  try {
    x = new URL(u);
  } catch {
    return false;
  }
  if (x.username || x.password || x.search || x.hash) return false;
  if (x.protocol === "https:") return true;
  return (
    x.protocol === "http:" &&
    /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
      x.hostname
    )
  );
}
const SITE_OK = /^[a-z0-9][a-z0-9-]{1,39}$/;
const KEY_OK = /^[A-Za-z0-9._~+/=-]{16,200}$/;

export function createCloud(
  home: string,
  saveEnv: (v: Record<string, string>) => void,
  readData: () => { rev: number; data: unknown }
) {
  const file = path.join(home, "cloud-state.json");
  const env = () => process.env;
  let st: State = {
    lastRev: 0,
    lastAt: "",
    lastTry: "",
    lastError: "",
    online: false,
    checkedAt: ""
  };
  try {
    st = { ...st, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    /* first run */
  }
  const save = () => {
    try {
      fs.writeFileSync(file + ".tmp", JSON.stringify(st));
      fs.renameSync(file + ".tmp", file);
    } catch {
      /* the next try writes it */
    }
  };
  const url = () => String(env().CLOUD_URL ?? "").replace(/\/+$/, "");
  const site = () => String(env().CLOUD_SITE ?? "");
  const key = () => String(env().CLOUD_KEY ?? "");
  const set = () => cloudUrlOk(url()) && SITE_OK.test(site()) && KEY_OK.test(key());
  const on = () => env().CLOUD_ON === "1" && set();
  const reply = (status: number, json: Record<string, unknown>): Reply => ({ status, json });
  const say = (status: number, error: string) => reply(status, { error });

  async function call(method: "GET" | "POST", p: string, body?: unknown, ms = 30_000) {
    const r = await fetch(url() + p, {
      method,
      headers: {
        authorization: `Bearer ${key()}`,
        "x-kaytia-site": site(),
        ...(body ? { "content-type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(ms),
      redirect: "error"
    });
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: r.status, json };
  }
  const why = (status: number) =>
    status === 401 || status === 403
      ? "The cloud refused the key. Check the site name and key."
      : status === 404
        ? "That address isn't a Kaytia cloud server."
        : status === 413
          ? "The cloud server won't take data this large."
          : `The cloud server answered ${status}.`;
  const offline = (e: unknown) =>
    /timeout|abort/i.test(String((e as Error)?.name ?? e))
      ? "The cloud didn't answer in time. Check the internet."
      : "The cloud can't be reached. Check the internet and the address.";

  async function ping(): Promise<string> {
    st.checkedAt = new Date().toISOString();
    try {
      const r = await call("GET", "/api/cloud/ping", undefined, 15_000);
      st.online = r.status === 200 && r.json.ok === true;
      st.lastError = st.online ? "" : why(r.status);
    } catch (e) {
      st.online = false;
      st.lastError = offline(e);
    }
    save();
    return st.lastError;
  }

  let inflight: Promise<string> | null = null;
  /** Sends the data if it changed since the last copy. A copy already on its way is waited for, not doubled. */
  function push(force = false): Promise<string> {
    if (inflight) return inflight;
    const cur = readData();
    if (!cur.data || (!force && cur.rev === st.lastRev && !st.lastError))
      return Promise.resolve("");
    inflight = send(cur).finally(() => (inflight = null));
    return inflight;
  }
  async function send(cur: { rev: number; data: unknown }): Promise<string> {
    st.lastTry = new Date().toISOString();
    try {
      const text = JSON.stringify(cur.data),
        body = {
          site: site(),
          rev: cur.rev,
          at: st.lastTry,
          sha256: crypto.createHash("sha256").update(text).digest("hex"),
          gz: zlib.gzipSync(text).toString("base64")
        };
      const r = await call("POST", "/api/cloud/push", body, 60_000);
      if (r.status === 200 && r.json.ok === true) {
        st.lastRev = cur.rev;
        st.lastAt = st.lastTry;
        st.lastError = "";
        st.online = true;
      } else {
        st.lastError = why(r.status);
        st.online = r.status !== 0;
      }
    } catch (e) {
      st.online = false;
      st.lastError = offline(e);
    } finally {
      st.checkedAt = new Date().toISOString();
      save();
    }
    return st.lastError;
  }

  function status() {
    const cur = readData();
    return {
      set: set(),
      on: on(),
      url: url(),
      site: site(),
      hasKey: !!key(),
      online: on() ? st.online : false,
      lastRev: st.lastRev,
      lastAt: st.lastAt,
      lastTry: st.lastTry,
      checkedAt: st.checkedAt,
      lastError: on() ? st.lastError : "",
      rev: cur.rev,
      behind: on() ? Math.max(0, cur.rev - st.lastRev) : 0
    };
  }

  /** Settings → Database sync, on the Main. */
  async function admin(op: string, b: Record<string, unknown>): Promise<Reply> {
    if (op === "status") return reply(200, status());
    if (op === "setup") {
      const u = String(b.url ?? "")
          .trim()
          .replace(/\/+$/, ""),
        s = String(b.site ?? "")
          .trim()
          .toLowerCase(),
        k = String(b.key ?? "").trim() || key();
      if (!cloudUrlOk(u))
        return say(
          400,
          "Enter the cloud address starting with https://, such as https://cloud.example.com."
        );
      if (!SITE_OK.test(s))
        return say(
          400,
          "Use 2 to 40 small letters, numbers or dashes for the site name, such as the-tide."
        );
      if (!KEY_OK.test(k))
        return say(400, "Enter the key the cloud gave you. It's at least 16 characters.");
      const v = { CLOUD_URL: u, CLOUD_SITE: s, CLOUD_KEY: k, CLOUD_ON: b.on === false ? "0" : "1" };
      Object.assign(process.env, v);
      saveEnv(v);
      st = { ...st, lastRev: 0, lastError: "", online: false };
      save();
      const bad = await ping();
      if (!bad && on()) void push(true);
      return reply(200, { ...status(), msg: bad || "Connected to the cloud." });
    }
    if (op === "onoff") {
      if (!set()) return say(409, "Connect to the cloud first.");
      const v = { CLOUD_ON: b.on ? "1" : "0" };
      Object.assign(process.env, v);
      saveEnv(v);
      if (on()) void ping().then(() => push(true));
      return reply(200, status());
    }
    if (op === "test") {
      if (!set()) return say(409, "Connect to the cloud first.");
      const bad = await ping();
      return bad ? say(502, bad) : reply(200, { ...status(), msg: "The cloud answered." });
    }
    if (op === "now") {
      if (!on()) return say(409, "Turn cloud copy on first.");
      const bad = await push(true);
      return bad ? say(502, bad) : reply(200, { ...status(), msg: "Copied to the cloud." });
    }
    if (op === "forget") {
      const v = { CLOUD_URL: "", CLOUD_SITE: "", CLOUD_KEY: "", CLOUD_ON: "0" };
      Object.assign(process.env, v);
      saveEnv(v);
      st = { lastRev: 0, lastAt: "", lastTry: "", lastError: "", online: false, checkedAt: "" };
      save();
      return reply(200, status());
    }
    return say(404, "Unknown action.");
  }

  let timer: NodeJS.Timeout | null = null;
  function start() {
    if (timer) return;
    let lastPing = 0;
    timer = setInterval(async () => {
      if (!on()) return;
      const sent = readData().rev !== st.lastRev || !!st.lastError;
      if (sent) await push();
      else if (Date.now() - lastPing > PING_EVERY) {
        lastPing = Date.now();
        await ping();
      }
    }, EVERY);
    timer.unref();
  }
  return { admin, status, start, push, ping };
}

// M-Pesa, two ways. Daraja asks the customer's phone for their PIN. A GSM modem reads the payment SMS that
// Safaricom sends to the SIM in it. Both land in one list on the server, so a payment can only be used once.
import { type ChildProcess, execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type Entry = {
  code: string;
  amt: number;
  name: string;
  phone: string;
  at: string;
  via: "modem" | "daraja" | "typed";
  held?: { by: string; until: number };
  used?: { bill: string; at: string; by: string };
};
type Job = {
  checkout: string;
  phone: string;
  amt: number;
  by: string;
  started: number;
  state: "waiting" | "paid" | "failed";
  code?: string;
  msg?: string;
  receipt?: string;
};
export type Reply = { status: number; json: Record<string, unknown> };

// ---------------------------------------------------------------- reading the SMS
/** A payment received, from Safaricom's message. Anything else (money sent, airtime, balance) gives null. */
export function parseMpesaSms(text: string) {
  const t = text.replace(/\s+/g, " ").trim(),
    c = /^([A-Z0-9]{10})\s+Confirmed/i.exec(t);
  if (!c) return null;
  const m =
    /received\s+Ksh\.?\s?([\d,]+(?:\.\d{1,2})?)\s+from\s+(.+?)(?:\s+on\s+\d|\.\s|\s+New\s|\.?$)/i.exec(
      t
    ) ??
    /Ksh\.?\s?([\d,]+(?:\.\d{1,2})?)\s+received\s+from\s+(.+?)(?:\s+on\s+\d|\.\s|\s+New\s|\.?$)/i.exec(
      t
    );
  if (!m) return null;
  const amt = parseFloat(m[1].replace(/,/g, ""));
  if (!(amt > 0)) return null;
  const phone = /(?:\+?254|0)[17][\d*]{5,8}/.exec(m[2])?.[0] ?? "",
    name = m[2].replace(phone, "").replace(/\s+/g, " ").trim();
  return { code: c[1].toUpperCase(), amt, name, phone };
}
/** The modem's answer to "list your messages". */
export function parseCmgl(raw: string) {
  const out: { index: number; sender: string; body: string }[] = [];
  const re =
    /\+CMGL:\s*(\d+),"[^"]*","([^"]*)"[^\r\n]*[\r\n]+([\s\S]*?)(?=\r?\n\+CMGL:|\r?\nOK\s*$|$)/g;
  for (let m = re.exec(raw); m; m = re.exec(raw))
    out.push({ index: Number(m[1]), sender: m[2], body: m[3].trim() });
  return out;
}

// The port and speed come in by environment, never into the script.
const MODEM_SCRIPT = String.raw`$ErrorActionPreference='Stop'
try {
  $p = New-Object System.IO.Ports.SerialPort $env:KF_PORT,([int]$env:KF_BAUD),'None',8,'One'
  $p.ReadTimeout=2000; $p.WriteTimeout=2000; $p.DtrEnable=$true; $p.RtsEnable=$true; $p.Open()
} catch { [Console]::Out.WriteLine('NOPORT'); exit 3 }
function At($c) { $p.DiscardInBuffer(); $p.Write($c + [char]13); $s=''; for($i=0;$i -lt 24;$i++){ Start-Sleep -Milliseconds 250; $s += $p.ReadExisting(); if($s -match '(?m)^(OK|ERROR|\+CM[ES] ERROR.*)\s*$'){ break } }; return $s }
if ((At 'ATE0') -notmatch 'OK') { [Console]::Out.WriteLine('NOMODEM'); $p.Close(); exit 3 }
[void](At 'AT+CMGF=1'); [void](At 'AT+CSCS="GSM"')
[Console]::Out.WriteLine('READY')
while ($true) {
  if (-not (Get-Process -Id ([int]$env:KF_PARENT) -ErrorAction SilentlyContinue)) { $p.Close(); exit 0 }
  $s = At 'AT+CMGL="ALL"'
  [Console]::Out.WriteLine('LIST ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($s)))
  foreach ($m in [regex]::Matches($s,'\+CMGL:\s*(\d+),')) { [void](At ('AT+CMGD=' + $m.Groups[1].Value)) }
  Start-Sleep -Seconds 5
}`;

const HOLD_MS = 10 * 60 * 1000;
const KEEP = 5000;
const FAILS: Record<string, string> = {
  "1": "The customer doesn't have enough on M-Pesa.",
  "1032": "The customer cancelled the request.",
  "1037": "The phone didn't answer. Check it is on and try again.",
  "2001": "The customer entered the wrong PIN."
};
const reply = (status: number, json: Record<string, unknown>): Reply => ({ status, json });
const say = (status: number, error: string) => reply(status, { error });

export function createMpesa(home: string, saveEnv: (v: Record<string, string>) => void) {
  const file = path.join(home, "mpesa-payments.json");
  let list: Entry[] = [];
  try {
    list = JSON.parse(fs.readFileSync(file, "utf8")) as Entry[];
  } catch {
    list = [];
  }
  const save = () => {
    list = list.slice(-KEEP);
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(list));
    fs.renameSync(`${file}.tmp`, file);
  };
  const find = (code: string) => list.find(e => e.code === code);
  const usedSay = (e: Entry) =>
    say(409, `That M-Pesa code was already used on bill ${e.used!.bill}.`);
  const code = (b: Record<string, unknown>) =>
    String(b.code ?? "")
      .trim()
      .toUpperCase();

  // ---- Daraja
  const env = () => process.env;
  const darajaSet = () =>
    !!(env().MPESA_KEY && env().MPESA_SECRET && env().MPESA_SHORTCODE && env().MPESA_PASSKEY);
  const base = () =>
    process.env.KAYTIA_DARAJA_URL ??
    (env().MPESA_ENV === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke");
  let token = { v: "", until: 0 };
  async function darajaToken() {
    if (token.v && Date.now() < token.until) return token.v;
    const r = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        authorization: `Basic ${Buffer.from(`${env().MPESA_KEY}:${env().MPESA_SECRET}`).toString("base64")}`
      },
      signal: AbortSignal.timeout(20000)
    });
    const j = (await r.json().catch(() => ({}))) as { access_token?: string };
    if (!r.ok || !j.access_token) throw new Error("login");
    token = { v: j.access_token, until: Date.now() + 50 * 60 * 1000 };
    return token.v;
  }
  /** Safaricom's clock is Nairobi time, whatever this computer is set to. */
  const stamp = () => {
    const t = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    return t.slice(0, 19).replace(/\D/g, "");
  };
  const secure = () => {
    const timestamp = stamp();
    return {
      BusinessShortCode: env().MPESA_SHORTCODE,
      Password: Buffer.from(`${env().MPESA_SHORTCODE}${env().MPESA_PASSKEY}${timestamp}`).toString(
        "base64"
      ),
      Timestamp: timestamp
    };
  };
  const post = async (p: string, body: unknown) => {
    const r = await fetch(base() + p, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await darajaToken()}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });
    return (await r.json().catch(() => ({}))) as Record<string, string | undefined>;
  };
  const callbackUrl = () =>
    env().MPESA_PUBLIC_URL
      ? `${env().MPESA_PUBLIC_URL!.replace(/\/$/, "")}/api/mpesa/cb/${env().MPESA_CB_TOKEN}`
      : // Daraja insists on an address. This reserved name goes nowhere, so nobody else gets the customer's details.
        "https://example.com/kaytia/mpesa/callback";
  const jobs = new Map<string, Job>();
  function finishPaid(j: Job) {
    if (j.state !== "waiting") return;
    const c = j.receipt ?? `STK${j.checkout.slice(-7).toUpperCase()}`;
    j.state = "paid";
    j.code = c;
    if (!find(c)) {
      list.push({
        code: c,
        amt: j.amt,
        name: "",
        phone: j.phone,
        at: new Date().toISOString(),
        via: "daraja",
        held: { by: j.by, until: Date.now() + HOLD_MS }
      });
      save();
    }
  }
  function finishFailed(j: Job, msg: string) {
    if (j.state === "waiting") Object.assign(j, { state: "failed", msg });
  }
  function watch(j: Job) {
    const again = (ms: number) => setTimeout(tick, ms);
    let paidAt = 0;
    const tick = async () => {
      if (j.state !== "waiting") return;
      if (j.receipt) return finishPaid(j);
      // With a callback address, the receipt number is on its way.
      if (paidAt) return Date.now() - paidAt > 12000 ? finishPaid(j) : void again(1500);
      if (Date.now() - j.started > 130000)
        return finishFailed(
          j,
          "No answer from the phone. Check M-Pesa messages before trying again."
        );
      try {
        const r = await post("/mpesa/stkpushquery/v1/query", {
          ...secure(),
          CheckoutRequestID: j.checkout
        });
        if (r.ResultCode !== undefined && j.state === "waiting") {
          if (String(r.ResultCode) === "0") {
            if (!env().MPESA_PUBLIC_URL) return finishPaid(j);
            paidAt = Date.now();
          } else
            return finishFailed(
              j,
              FAILS[String(r.ResultCode)] ?? r.ResultDesc ?? "M-Pesa didn't complete the payment."
            );
        }
      } catch {
        // A slow network isn't an answer. The next try may get one.
      }
      again(paidAt ? 1500 : 5000);
    };
    again(8000);
  }
  async function stk(b: Record<string, unknown>): Promise<Reply> {
    if (!darajaSet())
      return say(409, "M-Pesa requests aren't set up. Enter the M-Pesa code instead.");
    const phone = String(b.phone ?? ""),
      amt = Number(b.amount);
    if (!/^254[17]\d{8}$/.test(phone)) return say(400, "Enter the number as 07XXXXXXXX.");
    if (!Number.isInteger(amt) || amt < 1 || amt > 250000)
      return say(400, "M-Pesa requests must be whole shillings, up to 250,000.");
    const buy = env().MPESA_TYPE === "till";
    let r: Record<string, string | undefined>;
    try {
      r = await post("/mpesa/stkpush/v1/processrequest", {
        ...secure(),
        TransactionType: buy ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
        Amount: amt,
        PartyA: phone,
        PartyB: buy ? env().MPESA_TILL : env().MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: callbackUrl(),
        AccountReference:
          String(b.ref ?? "Bill")
            .replace(/[^\w -]/g, "")
            .slice(0, 12) || "Bill",
        TransactionDesc: "Payment"
      });
    } catch (e) {
      return say(
        502,
        (e as Error).message === "login"
          ? "Safaricom refused the Daraja keys. Check them in M-Pesa setup."
          : "Safaricom can't be reached. Check the internet, or enter the M-Pesa code."
      );
    }
    if (r.ResponseCode !== "0" || !r.CheckoutRequestID)
      return say(502, r.errorMessage ?? r.ResponseDescription ?? "Safaricom refused the request.");
    const id = crypto.randomUUID();
    const j: Job = {
      checkout: r.CheckoutRequestID,
      phone,
      amt,
      by: String(b.by ?? "").slice(0, 40),
      started: Date.now(),
      state: "waiting"
    };
    jobs.set(id, j);
    for (const [k, x] of jobs) if (Date.now() - x.started > 3600 * 1000) jobs.delete(k);
    watch(j);
    return reply(200, { id });
  }
  /** Safaricom calling back, when the hotel has a public address. */
  function callback(token2: string, body: unknown) {
    if (!env().MPESA_CB_TOKEN || token2 !== env().MPESA_CB_TOKEN) return false;
    const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } }).Body?.stkCallback;
    const j = [...jobs.values()].find(x => cb && x.checkout === cb.CheckoutRequestID);
    if (!cb || !j) return true;
    if (String(cb.ResultCode) !== "0") {
      finishFailed(j, FAILS[String(cb.ResultCode)] ?? String(cb.ResultDesc ?? "Not completed."));
      return true;
    }
    const items =
      (cb.CallbackMetadata as { Item?: { Name: string; Value?: unknown }[] })?.Item ?? [];
    const val = (n: string) => items.find(i => i.Name === n)?.Value;
    if (Number(val("Amount")) === j.amt && val("MpesaReceiptNumber")) {
      j.receipt = String(val("MpesaReceiptNumber")).toUpperCase();
      finishPaid(j);
    }
    return true;
  }

  // ---- the modem
  const modem: {
    state: string;
    msg: string;
    last: string;
    child: ChildProcess | null;
    retry?: NodeJS.Timeout;
  } = {
    state: "off",
    msg: "",
    last: "",
    child: null
  };
  function onSms(sender: string, body: string) {
    if (!/^M-?PESA$/i.test(sender.trim())) return;
    const p = parseMpesaSms(body);
    if (!p) return;
    modem.last = new Date().toISOString();
    const old = find(p.code);
    if (old) {
      // Typed by a cashier first: the SMS fills in who paid and how much.
      Object.assign(old, { amt: p.amt, name: p.name, phone: p.phone });
    } else list.push({ ...p, at: modem.last, via: "modem" });
    save();
  }
  function stopModem() {
    clearTimeout(modem.retry);
    modem.child?.kill();
    modem.child = null;
    modem.state = "off";
    modem.msg = "";
  }
  function startModem() {
    stopModem();
    if (env().MPESA_MODEM_ON !== "1" || !env().MPESA_MODEM_PORT) return;
    modem.state = "connecting";
    const c = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", MODEM_SCRIPT],
      {
        windowsHide: true,
        env: {
          ...process.env,
          KF_PORT: env().MPESA_MODEM_PORT,
          KF_BAUD: env().MPESA_MODEM_BAUD ?? "115200",
          KF_PARENT: String(process.pid)
        },
        windowsHide: true,
        stdio: ["ignore", "pipe", "ignore"]
      }
    );
    modem.child = c;
    let buf = "";
    c.stdout?.on("data", d => {
      buf += String(d);
      for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line === "READY") Object.assign(modem, { state: "ready", msg: "" });
        else if (line === "NOPORT")
          Object.assign(modem, {
            state: "error",
            msg: `${env().MPESA_MODEM_PORT} can't be opened.`
          });
        else if (line === "NOMODEM")
          Object.assign(modem, { state: "error", msg: "No modem answered on that port." });
        else if (line.startsWith("LIST "))
          parseCmgl(Buffer.from(line.slice(5), "base64").toString("utf8")).forEach(m =>
            onSms(m.sender, m.body)
          );
      }
    });
    c.on("exit", () => {
      if (modem.child !== c) return;
      modem.child = null;
      if (modem.state !== "error")
        Object.assign(modem, { state: "error", msg: "The modem stopped responding." });
      modem.retry = setTimeout(startModem, 20000);
    });
  }
  const ports = () =>
    new Promise<string[]>(ok =>
      execFile(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "[System.IO.Ports.SerialPort]::GetPortNames()"
        ],
        { timeout: 15000, windowsHide: true },
        (_e, out) =>
          ok(
            String(out ?? "")
              .split(/\r?\n/)
              .map(x => x.trim())
              .filter(Boolean)
              .sort()
          )
      )
    );

  // ---- what the tills may ask for
  const free = (e: Entry, by: string) =>
    !e.used && e.via !== "typed" && (!e.held || e.held.until < Date.now() || e.held.by === by);
  async function api(op: string, b: Record<string, unknown>): Promise<Reply> {
    const by = String(b.by ?? "").slice(0, 40);
    if (op === "status")
      return reply(200, {
        daraja: darajaSet(),
        modem: env().MPESA_MODEM_ON === "1",
        modemState: modem.state
      });
    if (op === "stk") return stk(b);
    if (op === "stk-state") {
      const j = jobs.get(String(b.id ?? ""));
      if (!j) return say(404, "That request has expired.");
      return reply(200, { state: j.state, code: j.code ?? "", msg: j.msg ?? "" });
    }
    if (op === "inbox")
      return reply(200, {
        list: list
          .filter(e => free(e, by))
          .slice(-40)
          .reverse()
          .map(({ code, amt, name, phone, at, via }) => ({ code, amt, name, phone, at, via }))
      });
    const c = code(b);
    if (!c) return say(400, "No M-Pesa code.");
    const e = find(c);
    if (op === "check") {
      if (e?.used) return usedSay(e);
      if (e && !free(e, by) && e.via !== "typed")
        return say(409, "Another till is using that payment.");
      return reply(200, {
        known: !!e && e.via !== "typed",
        amt: e && e.via !== "typed" ? e.amt : 0
      });
    }
    if (op === "hold") {
      if (!e) return say(404, "That payment isn't on the list.");
      if (e.used) return usedSay(e);
      if (!free(e, by)) return say(409, "Another till is using that payment.");
      e.held = { by, until: Date.now() + HOLD_MS };
      save();
      return reply(200, { amt: e.amt });
    }
    if (op === "confirm") {
      const bill = String(b.bill ?? "").slice(0, 40);
      if (e?.used && e.used.bill !== bill) return usedSay(e);
      const used = { bill, at: new Date().toISOString(), by };
      if (e) {
        e.used = used;
        delete e.held;
      } else
        // Typed from the customer's phone. Remembered, so the same code can't be used again.
        list.push({
          code: c,
          amt: Number(b.amt) || 0,
          name: "",
          phone: "",
          at: used.at,
          via: "typed",
          used
        });
      save();
      return reply(200, { ok: true });
    }
    return say(404, "Unknown request.");
  }

  // ---- setup, on the main computer only
  const hasText = (v: unknown) => String(v ?? "").trim();
  async function admin(op: string, b: Record<string, unknown>): Promise<Reply> {
    if (op === "info")
      return reply(200, {
        daraja: {
          set: darajaSet(),
          env: env().MPESA_ENV === "production" ? "production" : "sandbox",
          type: env().MPESA_TYPE === "till" ? "till" : "paybill",
          shortcode: env().MPESA_SHORTCODE ?? "",
          till: env().MPESA_TILL ?? "",
          publicUrl: env().MPESA_PUBLIC_URL ?? "",
          hasKey: !!env().MPESA_KEY,
          hasSecret: !!env().MPESA_SECRET,
          hasPasskey: !!env().MPESA_PASSKEY
        },
        modem: {
          on: env().MPESA_MODEM_ON === "1",
          port: env().MPESA_MODEM_PORT ?? "",
          baud: env().MPESA_MODEM_BAUD ?? "115200",
          state: modem.state,
          msg: modem.msg,
          last: modem.last
        },
        ports: await ports(),
        list: list.slice(-200).reverse()
      });
    if (op === "daraja") {
      const key = hasText(b.key) || env().MPESA_KEY || "",
        secret = hasText(b.secret) || env().MPESA_SECRET || "",
        passkey = hasText(b.passkey) || env().MPESA_PASSKEY || "",
        shortcode = hasText(b.shortcode),
        till = hasText(b.till),
        publicUrl = hasText(b.publicUrl),
        type = b.type === "till" ? "till" : "paybill";
      if (!key || !secret) return say(400, "Enter the consumer key and consumer secret.");
      if (!passkey) return say(400, "Enter the passkey.");
      if (!/^\d{5,8}$/.test(shortcode)) return say(400, "Enter the shortcode, using digits only.");
      if (type === "till" && !/^\d{5,8}$/.test(till)) return say(400, "Enter the till number.");
      if (publicUrl && !/^https:\/\/[^\s"]+$/.test(publicUrl))
        return say(400, "The public address must start with https://");
      if ([key, secret, passkey].some(x => /[\r\n"]/.test(x))) return say(400, "Check the keys.");
      const values = {
        MPESA_ENV: b.env === "production" ? "production" : "sandbox",
        MPESA_TYPE: type,
        MPESA_KEY: key,
        MPESA_SECRET: secret,
        MPESA_PASSKEY: passkey,
        MPESA_SHORTCODE: shortcode,
        MPESA_TILL: till,
        MPESA_PUBLIC_URL: publicUrl,
        MPESA_CB_TOKEN: env().MPESA_CB_TOKEN || crypto.randomBytes(24).toString("hex")
      };
      saveEnv(values);
      Object.assign(process.env, values);
      token = { v: "", until: 0 };
      return reply(200, { ok: true });
    }
    if (op === "test") {
      if (!darajaSet()) return say(409, "Save the Daraja details first.");
      token = { v: "", until: 0 };
      try {
        await darajaToken();
        return reply(200, { ok: true });
      } catch (e) {
        return say(
          502,
          (e as Error).message === "login"
            ? "Safaricom refused these keys."
            : "Safaricom can't be reached from this computer."
        );
      }
    }
    if (op === "modem") {
      const port = hasText(b.port),
        baud = hasText(b.baud) || "115200",
        on = b.on === true;
      if (on && !/^COM\d{1,3}$/i.test(port)) return say(400, "Choose the modem's COM port.");
      if (!/^\d{4,6}$/.test(baud)) return say(400, "Check the speed.");
      const values = {
        MPESA_MODEM_ON: on ? "1" : "0",
        MPESA_MODEM_PORT: port.toUpperCase(),
        MPESA_MODEM_BAUD: baud
      };
      saveEnv(values);
      Object.assign(process.env, values);
      startModem();
      return reply(200, { ok: true });
    }
    return say(404, "Unknown request.");
  }
  return { api, admin, callback, startModem, stopModem };
}

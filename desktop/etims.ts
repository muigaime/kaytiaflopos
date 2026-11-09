// KRA eTIMS, through the cloud. Tills send each settled bill to the server; only the server talks to the cloud.
//
// THE CONTRACT. To connect the real service, set Mode to Live in Back Office and change only liveSign(), liveCheck(),
// liveItems() and liveStock() below if the real API differs. Nothing else in the program knows how the cloud works.
//
//   POST {url}/invoices      Authorization: Bearer {key}
//     { "pin": "P000000000A", "branch": "00", "invoice": EtimsInvoice }
//   200 { "cuSerial": "...", "cuInvoiceNo": "...", "qrUrl": "https://...", "signedAt": "2026-11-09T10:00:00Z" }
//   4xx { "error": "why it was refused" }   the invoice needs fixing; it is not retried by itself
//   5xx or no answer                        it stays Waiting and is sent again
//
//   POST {url}/credit-notes  the same request and answers as /invoices. The invoice also has creditFor (the
//                            original bill) and reason. Amounts are positive.
//
//   GET  {url}/health        Authorization: Bearer {key}     200 when the address and key are good
//
//   POST {url}/items         { "pin", "branch", "items": [ { ref, name, taxCode, price, category, sellingPoint, trackStock } ] }
//   200 { "results": [ { "ref": "12", "etimsCode": "...", "etimsId": "..." } or { "ref": "12", "error": "why" } ] }
//   The provider's server assigns the eTIMS code and ID. Kaytia Flow only shows them.
//
//   POST {url}/stock         { "pin", "branch", "adjustments": [ { ref, etimsId, qty, reason } ] }
//   200 { "results": [ { "ref": "12" } or { "ref": "12", "error": "why" } ] }
//
// The same bill number may be sent more than once, so the real service should treat it as the invoice's identity.
import fs from "node:fs";
import path from "node:path";

export type EtimsInvoice = {
  bill: string;
  at: string;
  dept: string;
  buyer: { name: string; pin: string };
  items: { name: string; qty: number; price: number; taxCode: string; total: number }[];
  totals: { net: number; tax: number; gross: number };
  payments: { method: string; amount: number }[];
  creditFor?: string; // the bill this return reverses
  reason?: string;
};
export type EtimsSigned = { cu: string; inv: string; qr: string; at: string; test?: boolean };
type Rec = {
  status: "signed" | "waiting" | "failed";
  invoice: EtimsInvoice;
  result?: EtimsSigned;
  err?: string;
  at: string;
};
type Reply = { status: number; json: Record<string, unknown> };
const reply = (status: number, json: Record<string, unknown>): Reply => ({ status, json });
const say = (status: number, error: string) => reply(status, { error });
/** The cloud refused this invoice: sending it again unchanged won't help. */
class Refused extends Error {}
const KEEP = 5000;
const env = () => process.env;

// ---------------------------------------------------------------- the cloud: replace here
async function liveSign(invoice: EtimsInvoice): Promise<EtimsSigned> {
  const r = await fetch(`${env().ETIMS_URL}/${invoice.creditFor ? "credit-notes" : "invoices"}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env().ETIMS_KEY ?? ""}`
    },
    body: JSON.stringify({ pin: env().ETIMS_PIN, branch: env().ETIMS_BRANCH, invoice }),
    signal: AbortSignal.timeout(20000)
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, string | undefined>;
  if (r.status >= 400 && r.status < 500) throw new Refused(j.error ?? `Refused (${r.status}).`);
  if (!r.ok || !j.cuSerial || !j.cuInvoiceNo)
    throw new Error("The eTIMS service didn't answer properly.");
  return {
    cu: j.cuSerial,
    inv: j.cuInvoiceNo,
    qr: j.qrUrl ?? "",
    at: j.signedAt ?? new Date().toISOString()
  };
}
async function liveCheck() {
  const r = await fetch(`${env().ETIMS_URL}/health`, {
    headers: { authorization: `Bearer ${env().ETIMS_KEY ?? ""}` },
    signal: AbortSignal.timeout(15000)
  });
  return r.ok;
}

async function liveBatch(sub: string, payload: Record<string, unknown>) {
  const r = await fetch(`${env().ETIMS_URL}/${sub}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env().ETIMS_KEY ?? ""}`
    },
    body: JSON.stringify({ pin: env().ETIMS_PIN, branch: env().ETIMS_BRANCH, ...payload }),
    signal: AbortSignal.timeout(60000)
  });
  const j = (await r.json().catch(() => ({}))) as { results?: unknown[]; error?: string };
  if (!r.ok || !Array.isArray(j.results))
    throw new Refused(j.error ?? "The eTIMS service refused that.");
  return j.results;
}
const liveItems = (items: unknown[]) => liveBatch("items", { items });
const liveStock = (adjustments: unknown[]) => liveBatch("stock", { adjustments });

export function createEtims(home: string, saveEnv: (v: Record<string, string>) => void) {
  const file = path.join(home, "etims-invoices.json");
  let all: Record<string, Rec> = {};
  try {
    all = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Rec>;
  } catch {
    all = {};
  }
  const save = () => {
    const keys = Object.keys(all);
    keys.slice(0, Math.max(0, keys.length - KEEP)).forEach(k => delete all[k]);
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(all));
    fs.renameSync(`${file}.tmp`, file);
  };
  const mode = () => (env().ETIMS_MODE === "live" ? "live" : "standin");
  /** Answers like the cloud until the real one is connected, and every answer is marked as a test. */
  function standIn(invoice: EtimsInvoice): EtimsSigned {
    const n = Object.values(all).filter(x => x.result?.test).length + 1;
    return {
      cu: `TEST-CU-${String(n).padStart(6, "0")}`,
      inv: invoice.bill,
      qr: `https://example.com/etims-test/${encodeURIComponent(invoice.bill)}`,
      at: new Date().toISOString(),
      test: true
    };
  }
  const busy = new Set<string>();
  async function attempt(rec: Rec) {
    const bill = rec.invoice.bill;
    if (busy.has(bill)) return;
    busy.add(bill);
    try {
      rec.result = mode() === "live" ? await liveSign(rec.invoice) : standIn(rec.invoice);
      rec.status = "signed";
      delete rec.err;
    } catch (e) {
      rec.status = e instanceof Refused ? "failed" : "waiting";
      rec.err = e instanceof Refused ? e.message : "The eTIMS service can't be reached.";
    } finally {
      busy.delete(bill);
      save();
    }
  }
  const out = (r: Rec) =>
    reply(200, { status: r.status, result: r.result ?? null, err: r.err ?? "" });
  function valid(b: Record<string, unknown>): EtimsInvoice | null {
    const v = b as EtimsInvoice;
    const nums = (x: unknown) => Number.isFinite(x);
    if (typeof v.bill !== "string" || !/^[\w-]{1,40}$/.test(v.bill)) return null;
    if (!Array.isArray(v.items) || !v.items.length || v.items.length > 1000) return null;
    if (!v.totals || !nums(v.totals.net) || !nums(v.totals.tax) || !nums(v.totals.gross))
      return null;
    if (!Array.isArray(v.payments) || !v.buyer) return null;
    return v;
  }
  async function api(op: string, b: Record<string, unknown>): Promise<Reply> {
    if (op === "status") return reply(200, { live: mode() === "live" && !!env().ETIMS_URL });
    if (op === "items" || op === "stock") {
      const L = (op === "items" ? b.items : b.adjustments) as unknown[];
      if (!Array.isArray(L) || !L.length || L.length > 1000) return say(400, "Nothing to send.");
      if (mode() !== "live") {
        if (op === "stock") return say(409, "eTIMS isn't connected to a live service.");
        // The stand-in accepts products too, so the button can be tried. Each one is marked as a test.
        return reply(200, {
          results: (L as { ref?: unknown }[]).map(x => ({
            ref: String(x.ref ?? ""),
            etimsCode: "TEST-CODE-" + String(x.ref ?? ""),
            etimsId: "TEST-ITEM-" + String(x.ref ?? ""),
            test: true
          }))
        });
      }
      try {
        return reply(200, { results: await (op === "items" ? liveItems(L) : liveStock(L)) });
      } catch (e) {
        return say(502, e instanceof Refused ? e.message : "The eTIMS service can't be reached.");
      }
    }
    if (op !== "sign") return say(404, "Unknown request.");
    const invoice = valid(b);
    if (!invoice) return say(400, "That invoice can't be read.");
    let rec = all[invoice.bill];
    // Signed or refused already: sending it again changes nothing. A refused one is retried from the Back Office.
    if (rec && rec.status !== "waiting") return out(rec);
    rec ??= all[invoice.bill] = { status: "waiting", invoice, at: new Date().toISOString() };
    await attempt(rec);
    return out(rec);
  }
  async function admin(op: string, b: Record<string, unknown>): Promise<Reply> {
    if (op === "info") {
      const L = Object.values(all);
      return reply(200, {
        mode: mode(),
        url: env().ETIMS_URL ?? "",
        pin: env().ETIMS_PIN ?? "",
        branch: env().ETIMS_BRANCH ?? "00",
        hasKey: !!env().ETIMS_KEY,
        counts: {
          signed: L.filter(x => x.status === "signed").length,
          waiting: L.filter(x => x.status === "waiting").length,
          failed: L.filter(x => x.status === "failed").length
        },
        list: L.slice(-200)
          .reverse()
          .map(x => ({
            bill: x.invoice.bill,
            at: x.at,
            gross: x.invoice.totals.gross,
            status: x.status,
            err: x.err ?? "",
            cu: x.result?.cu ?? "",
            test: !!x.result?.test
          }))
      });
    }
    if (op === "save") {
      const live = b.mode === "live",
        url = String(b.url ?? "")
          .trim()
          .replace(/\/$/, ""),
        pin = String(b.pin ?? "")
          .trim()
          .toUpperCase(),
        branch = String(b.branch ?? "").trim() || "00",
        key = String(b.key ?? "").trim() || env().ETIMS_KEY || "";
      if (live && !/^https?:\/\/[^\s"]+$/.test(url))
        return say(400, "Enter the eTIMS service address.");
      if (live && !key) return say(400, "Enter the API key.");
      if (pin && !/^[A-Z]\d{9}[A-Z]$/.test(pin))
        return say(400, "A KRA PIN has a letter, nine digits and a letter.");
      if (!/^[\w-]{1,10}$/.test(branch)) return say(400, "Check the branch.");
      if (/[\r\n"]/.test(key)) return say(400, "Check the API key.");
      const values = {
        ETIMS_MODE: live ? "live" : "standin",
        ETIMS_URL: url,
        ETIMS_PIN: pin,
        ETIMS_BRANCH: branch,
        ETIMS_KEY: key
      };
      saveEnv(values);
      Object.assign(process.env, values);
      return reply(200, { ok: true });
    }
    if (op === "test") {
      if (mode() !== "live") return reply(200, { ok: true, standIn: true });
      try {
        return (await liveCheck())
          ? reply(200, { ok: true })
          : say(502, "The eTIMS service refused this address or key.");
      } catch {
        return say(502, "The eTIMS service can't be reached from this computer.");
      }
    }
    if (op === "retry") {
      const rec = all[String(b.bill ?? "")];
      if (!rec) return say(404, "That bill isn't on the list.");
      if (rec.status === "signed") return out(rec);
      rec.status = "waiting";
      await attempt(rec);
      return out(rec);
    }
    return say(404, "Unknown request.");
  }
  return { api, admin };
}

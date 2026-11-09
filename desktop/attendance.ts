// Fingerprint and face readers. The reader sends each punch to this computer, and the Back Office turns punches
// into clock-ins. ZKTeco-style readers use their "cloud server" (ADMS) setting: this computer's address, port 5500.
// Other brands, or their software, can POST /iclock/punch with { device, id, at: "YYYY-MM-DD HH:MM:SS", type }.
import fs from "node:fs";
import path from "node:path";

export type Punch = {
  seq: number;
  id: string;
  at: string;
  type: "in" | "out" | "";
  device: string;
};
const KEEP = 20000;

/** A reader's attendance lines: staff id, time, then details that vary by model. */
export function parseAttlog(text: string) {
  return text
    .split(/\r?\n/)
    .map(l => l.split("\t"))
    .filter(
      c => c.length >= 2 && c[0].trim() && /^\d{4}-\d\d-\d\d \d\d:\d\d(:\d\d)?$/.test(c[1].trim())
    )
    .map(c => ({ id: c[0].trim(), at: c[1].trim() }));
}

export function createAttendance(home: string, saveEnv: (v: Record<string, string>) => void) {
  const file = path.join(home, "attendance-punches.json");
  let list: Punch[] = [];
  try {
    list = JSON.parse(fs.readFileSync(file, "utf8")) as Punch[];
  } catch {
    list = [];
  }
  let lastSeen = { device: "", at: "" };
  const env = () => process.env;
  const devices = () =>
    String(env().ATT_DEVICES ?? "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  const allowed = (sn: string) => env().ATT_ON === "1" && devices().includes(sn);
  const seen = (sn: string) => {
    lastSeen = { device: sn, at: new Date().toISOString() };
  };
  function add(rows: { id: string; at: string; type?: string }[], device: string) {
    let n = 0;
    let seq = list.length ? list[list.length - 1].seq : 0;
    for (const r of rows) {
      if (list.some(x => x.id === r.id && x.at === r.at)) continue;
      list.push({
        seq: ++seq,
        id: r.id,
        at: r.at,
        type: r.type === "in" || r.type === "out" ? r.type : "",
        device
      });
      n++;
    }
    if (n) {
      list = list.slice(-KEEP);
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(list));
      fs.renameSync(`${file}.tmp`, file);
    }
    return n;
  }
  return {
    /** A reader starting up asks how to behave. An unknown one is told nothing useful. */
    options(sn: string) {
      if (!allowed(sn)) return "OK";
      seen(sn);
      return [
        `GET OPTION FROM: ${sn}`,
        "ATTLOGStamp=9999",
        "OPERLOGStamp=9999",
        "ATTPHOTOStamp=None",
        "ErrorDelay=30",
        "Delay=10",
        "TransTimes=",
        "TransInterval=1",
        "TransFlag=1000000000",
        "Realtime=1",
        "Encrypt=0",
        ""
      ].join("\n");
    },
    poll(sn: string) {
      if (allowed(sn)) seen(sn);
      return "OK";
    },
    attlog(sn: string, table: string, body: string) {
      if (!allowed(sn)) return "OK";
      seen(sn);
      if (table !== "ATTLOG") return "OK";
      const rows = parseAttlog(body);
      add(rows, sn);
      return `OK: ${rows.length}`;
    },
    punch(b: Record<string, unknown>) {
      const device = String(b.device ?? ""),
        id = String(b.id ?? "").trim(),
        at = String(b.at ?? "").trim();
      if (!allowed(device))
        return { status: 403, json: { error: "That device isn't registered." } };
      if (!id || !/^\d{4}-\d\d-\d\d \d\d:\d\d(:\d\d)?$/.test(at))
        return {
          status: 400,
          json: { error: "Send the staff id, and at as YYYY-MM-DD HH:MM:SS." }
        };
      seen(device);
      add([{ id, at, type: String(b.type ?? "") }], device);
      return { status: 200, json: { ok: true } };
    },
    pull(after: number) {
      return { punches: list.filter(p => p.seq > after).slice(0, 500) };
    },
    info() {
      return {
        on: env().ATT_ON === "1",
        devices: devices().join(", "),
        lastSeen,
        count: list.length
      };
    },
    save(b: Record<string, unknown>) {
      const names = String(b.devices ?? "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);
      if (names.some(x => !/^[\w-]{1,40}$/.test(x)))
        return { status: 400, json: { error: "Check the serial numbers." } };
      if (b.on === true && !names.length)
        return { status: 400, json: { error: "Enter the reader's serial number." } };
      const values = { ATT_ON: b.on === true ? "1" : "0", ATT_DEVICES: names.join(",") };
      saveEnv(values);
      Object.assign(process.env, values);
      return { status: 200, json: { ok: true } };
    }
  };
}

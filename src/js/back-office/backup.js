// ---- Settings → Backup and restore: all the business's data in one file, to keep or move to another computer ----
// What belongs to this computer stays out of it: its machine name, license, theme and remembered sign-in.
const BK_KIND = "kaytia-flow-backup",
  BK_VERSION = 1,
  BK_LAST = "kaytia_last_backup",
  BK_DONE = "kaytia_restored";
let bkPick = null, // the file chosen to restore: { name, file, sum } or { name, err }
  bkBusy = false;
const bkToBase64 = blob =>
  new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = () => no(r.error);
    r.readAsDataURL(blob);
  });
const bkFromBase64 = (b64, type) => {
  const s = atob(b64),
    a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return new Blob([a], { type });
};
/** Counts to show what's in the data, so the right file can be recognised. */
function bkSummary(d) {
  const fs = d.FS || {},
    hrd = fs.hr || {};
  return [
    ["Sales", (d.S || []).length],
    ["Open bills", (d.OR || []).length],
    ["Menu items", (d.I || []).length],
    ["Stock items", Object.keys(d.G || {}).length],
    ["POS staff", (d.U || []).length],
    ["Employees", (hrd.emps || []).length],
    ["Payrolls", (hrd.runs || []).length],
    ["Journal entries", ((fs.acct || {}).jv || []).length]
  ];
}
const bkFileName = () => {
  const now = new Date(),
    stamp = `${ymdOf(now)}_${now.toTimeString().slice(0, 5).replace(":", "")}`;
  return `Kaytia_Backup_${String(FD_SETTINGS.name || "Business").replace(/[^\w-]+/g, "_")}_${stamp}.json`;
};
function bkDownload(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
/** Everything in the main save, plus files attached to staff records. */
async function bkMake() {
  bosave();
  let files = [];
  try {
    files = await Promise.all(
      (await hrFiles.all()).map(async ([id, f]) => ({
        id,
        name: f.name || "",
        type: f.type || "",
        data: await bkToBase64(f)
      }))
    );
  } catch (e) {
    files = [];
  }
  return JSON.stringify({
    kind: BK_KIND,
    v: BK_VERSION,
    app: APP_VERSION,
    at: new Date().toISOString(),
    from: FD_SETTINGS.name || "",
    machine: MACHINE.name(),
    by: boUser.n,
    data: localStorage.getItem(LS),
    files
  });
}
function bkRead(text, name) {
  let f;
  try {
    f = JSON.parse(text);
  } catch (e) {
    return { name, err: "That isn't a Kaytia Flow backup file, or it's damaged." };
  }
  if (!f || f.kind !== BK_KIND) return { name, err: "That isn't a Kaytia Flow backup file." };
  if (f.v > BK_VERSION)
    return {
      name,
      err: "This backup came from a newer version of Kaytia Flow. Update this computer first."
    };
  let d;
  try {
    d = JSON.parse(f.data);
  } catch (e) {
    return { name, err: "This backup is damaged and can't be restored." };
  }
  if (!d || !Array.isArray(d.U) || !d.FS)
    return { name, err: "This backup is missing data and can't be restored." };
  return { name, file: f, data: d };
}
function backupHTML() {
  const last = localStorage.getItem(BK_LAST),
    days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 864e5) : null,
    live = bkSummary(JSON.parse(localStorage.getItem(LS) || "{}")),
    mgrs = USERS.filter(u => u.role === "Manager").length,
    P = bkPick;
  return `<div class="pn"><div class="inv-head"><h4>Back up</h4><span class="tag ${days === null || days > 7 ? "warn" : "ok"}">${last ? `Last backup ${docWhen(last)}` : "No backup yet"}</span></div><div class="stk">Saves all your sales, stock, staff, payroll, accounts and settings in one file. Keep a copy away from this computer, such as on a USB drive.</div>
  <div class="stm-tiles">${live.map(([l, n]) => msTile(l, n)).join("")}</div>
  <div class="status warn">The file holds salaries, staff PINs and customer details, and it isn't locked with a password. Keep it private.</div>
  <div class="pv-form"><button class="chip on" data-a="bk_make" ${bkBusy ? "disabled" : ""}>Download backup</button></div></div>
  <div class="pn"><h4>Restore</h4><div class="stk">Loads a backup onto this computer. <b>It replaces everything here</b>, so bring it across before anyone starts selling on this computer. Close any other Kaytia Flow tabs first.</div>
  <div class="pv-form"><label class="ac-wide">Backup file<input id="bkFile" type="file" accept=".json,application/json"></label></div>
  ${
    P && P.err
      ? `<div class="status bad">${esc(P.err)}</div>`
      : P
        ? `<div class="hr-next bk-pick"><b>${esc(P.file.from || "Backup")} · ${esc(docWhen(P.file.at))}</b><span>From ${esc(P.file.machine || "another computer")}, made by ${esc(P.file.by || "-")}, version ${esc(P.file.app || "-")}. File: ${esc(P.name)}</span></div>
  <div class="stm-tiles">${bkSummary(P.data)
    .map(([l, n]) => msTile(l, n))
    .join("")}${msTile("Attached files", (P.file.files || []).length)}</div>
  <div class="status bad">This replaces all ${live[0][1]} sales and everything else on this computer. A copy of what's here now downloads first, in case you need it back.</div>
  <div class="pv-form">${mgrs ? '<label>Manager PIN<input id="bkPin" type="password" inputmode="numeric" autocomplete="off"></label>' : ""}<button class="chip on" data-a="bk_restore" ${bkBusy ? "disabled" : ""}>Replace and restore</button><button class="mini" data-a="bk_cancel">Cancel</button></div>`
        : ""
  }
  <div class="stk">Staying with this computer: its machine name, license, theme and remembered sign-in. Set up its printers under Printers after restoring, because printer choices belong to each machine.</div></div>`;
}
async function bkAct(a) {
  if (!boCan("set.manage")) return boDenied();
  if (a === "bk_cancel") {
    bkPick = null;
    return all();
  }
  if (a === "bk_make") {
    bkBusy = true;
    all();
    try {
      bkDownload(await bkMake(), bkFileName());
      localStorage.setItem(BK_LAST, new Date().toISOString());
      auditAdd("Backup", `Backup downloaded by ${boUser.n}`, { mod: "Settings", pri: "Important" });
      toast("Backup downloaded. Keep it somewhere safe and private.");
    } catch (e) {
      toast("The backup could not be made.");
    }
    bkBusy = false;
    return all();
  }
  if (a === "bk_restore") {
    const P = bkPick;
    if (!P || P.err) return;
    const pinEl = $("#bkPin");
    if (pinEl && !USERS.some(u => u.role === "Manager" && u.pin === pinEl.value)) {
      pinEl.value = "";
      return toast("That is not a manager's PIN.");
    }
    bkBusy = true;
    all();
    try {
      // What's here now comes down first, so that nothing can be lost.
      bkDownload(await bkMake(), `Before_restore_${bkFileName()}`);
      const cur = JSON.parse(localStorage.getItem(LS) || "{}"),
        d = { ...P.data };
      // The license belongs to this computer.
      if (cur.LI === undefined) delete d.LI;
      else d.LI = cur.LI;
      // From here on nothing in memory may be saved over the restored data.
      boFrozen = true;
      localStorage.setItem(LS, JSON.stringify(d));
      if (LAN.on) localStorage.setItem(LAN_FORCE, "1");
      await hrFiles.clear();
      for (const f of P.file.files || [])
        await hrFiles.put(f.id, new File([bkFromBase64(f.data, f.type)], f.name, { type: f.type }));
      localStorage.setItem(
        BK_DONE,
        JSON.stringify({ at: P.file.at, from: P.file.machine, by: boUser.n, t: Date.now() })
      );
      location.reload();
    } catch (e) {
      boFrozen = false;
      bkBusy = false;
      toast(
        "Restoring failed, so this computer's data was left as it was. It may not have enough room."
      );
      all();
    }
  }
}
document.addEventListener("change", e => {
  if (e.target.id !== "bkFile") return;
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    bkPick = bkRead(String(r.result), f.name);
    all();
  };
  r.onerror = () => {
    bkPick = { name: f.name, err: "That file could not be read." };
    all();
  };
  r.readAsText(f);
});
// Another open tab mustn't save its old data over a restore.
addEventListener("storage", e => {
  if (e.key === BK_DONE && e.newValue) {
    boFrozen = true;
    location.reload();
  }
});
// The first start after a restore: put it on the record.
(() => {
  const note = localStorage.getItem(BK_DONE);
  if (!note) return;
  localStorage.removeItem(BK_DONE);
  try {
    const N = JSON.parse(note);
    auditAdd(
      "Restore",
      `Data restored by ${N.by} from a backup of ${docWhen(N.at)}, made on ${N.from || "another computer"}`,
      {
        who: N.by,
        mod: "Settings",
        pri: "Important"
      }
    );
  } catch (e) {}
})();

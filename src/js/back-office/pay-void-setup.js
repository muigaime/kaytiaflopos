// ---- Settings: payment modes and void reasons, both shown on the POS straight away ----
let pvEdit = null;
const pvRight = () => boCan("set.manage");
function payModesHTML() {
  const used = k => SALES.some(s => (s.mx || {})[k]),
    sw = (k, on, locked) =>
      locked
        ? '<span class="tag">Always on</span>'
        : `<button class="pv-sw ${on ? "on" : ""}" data-a="pv_pmtog" data-k="${esc(k)}" role="switch" aria-checked="${on}" aria-label="Show on the POS"><i></i></button>`,
    built = PAY_BUILT.filter(([k]) => k !== "room" || fdOn())
      .map(
        ([k, n, s]) =>
          `<tr><td><b>${esc(n)}</b><small class="pr-code">${esc(s)}</small></td><td><span class="tag">Built in</span></td><td class="n">${sw(k, payModeOn(k), k === "cash")}</td><td></td></tr>`
      )
      .join(""),
    mine = payMine()
      .map(c =>
        pvEdit && pvEdit.pm === c.k
          ? `<tr><td colspan="4"><div class="pv-form"><label>Name<input id="pvEN" maxlength="30" value="${esc(c.n)}"></label><label>Reference asked for<input id="pvEH" maxlength="40" value="${esc(c.ph || "")}"></label><button class="chip on" data-a="pv_pmsave" data-k="${esc(c.k)}">Save</button><button class="mini" data-a="pv_cancel">Cancel</button></div></td></tr>`
          : `<tr><td><b>${esc(c.n)}</b><small class="pr-code">${esc(c.ph || "No reference asked for")}</small></td><td><span class="tag ok">Yours</span></td><td class="n">${sw(c.k, c.on !== false)}</td><td class="n"><span class="sp-acts"><button class="mini" data-a="pv_pmedit" data-k="${esc(c.k)}">Edit</button>${used(c.k) ? "" : `<button class="mini cat-del" data-a="pv_pmdel" data-k="${esc(c.k)}">Delete</button>`}</span></td></tr>`
      )
      .join("");
  return `<div class="pn pv-panel"><h4>Payment modes</h4><div class="stk">What the cashier can choose on the Settle bill screen. Modes you add also appear in shift summaries and sales reports. A mode that has been used can only be turned off, so past sales keep their name.</div>
  <div class="pv-form pv-add"><label>New payment mode<input id="pvN" maxlength="30" placeholder="e.g. Bank transfer, Voucher" autocomplete="off"></label><label>Reference asked for (optional)<input id="pvH" maxlength="40" placeholder="e.g. Transaction number" autocomplete="off"></label><button class="chip on" data-a="pv_pmadd">Add payment mode</button></div>
  <div class="tw"><table class="t"><tr><th>Payment mode</th><th>Type</th><th class="n">On the POS</th><th></th></tr>${built}${mine}</table></div></div>`;
}
function voidReasonsHTML() {
  const L = voidReasons();
  return `<div class="pn pv-panel"><h4>Void reasons</h4><div class="stk">The reasons a cashier can tap when voiding items. They can still type their own, and every void goes to the Audit log.</div>
  <div class="pv-form pv-add"><label>New void reason<input id="pvV" maxlength="50" placeholder="e.g. Guest left before serving" autocomplete="off"></label><button class="chip on" data-a="pv_vradd">Add reason</button></div>
  ${
    L.length
      ? `<div class="pv-reasons">${L.map((r, i) =>
          pvEdit && pvEdit.vr === i
            ? `<div class="pv-reason pv-form"><label>Reason<input id="pvVE" maxlength="50" value="${esc(r)}"></label><button class="chip on" data-a="pv_vrsave" data-i="${i}">Save</button><button class="mini" data-a="pv_cancel">Cancel</button></div>`
            : `<div class="pv-reason"><span>${esc(r)}</span><span class="sp-acts"><button class="mini" data-a="pv_vredit" data-i="${i}">Edit</button><button class="mini cat-del" data-a="pv_vrdel" data-i="${i}">Delete</button></span></div>`
        ).join("")}</div>`
      : '<div class="empty">No reasons yet. The cashier will type one each time.</div>'
  }</div>`;
}
const pvVal = id => {
  const el = $("#" + id);
  return el ? el.value.trim().replace(/\s+/g, " ") : "";
};
const pvTaken = (n, not) =>
  [
    ...PAY_BUILT.map(x => x[1]),
    ...payMine()
      .filter(c => c.k !== not)
      .map(c => c.n)
  ].some(x => x.toLowerCase() === n.toLowerCase());
function pvAct(a, b) {
  if (!pvRight()) return boDenied();
  const k = b.dataset.k,
    i = +b.dataset.i,
    cfg = payCfg(),
    mode = payMine().find(c => c.k === k),
    reasons = () => FD_SETTINGS.voidReasons || (FD_SETTINGS.voidReasons = [...voidReasons()]),
    done = (nature, text, msg) => {
      pvEdit = null;
      auditAdd(nature, text, { mod: "Settings" });
      bosave();
      toast(msg);
      all();
    };
  if (a === "pv_cancel") {
    pvEdit = null;
    return all();
  }
  if (a === "pv_pmadd") {
    const n = pvVal("pvN");
    if (!n) return toast("Enter the payment mode's name.");
    if (pvTaken(n)) return toast(`${n} is already on the list.`);
    cfg.custom.push({ k: "pm_" + Date.now().toString(36), n, ph: pvVal("pvH"), on: true });
    return done("Settings", `Payment mode added: ${n}`, `${n} is on the POS now.`);
  }
  if (a === "pv_pmtog") {
    if (mode) mode.on = mode.on === false;
    else cfg.off[k] = !cfg.off[k];
    const on = mode ? mode.on : !cfg.off[k];
    return done(
      "Settings",
      `${payName(k)} turned ${on ? "on" : "off"} for the POS`,
      `${payName(k)} ${on ? "is on the POS." : "is off the POS."}`
    );
  }
  if (a === "pv_pmedit") {
    pvEdit = { pm: k };
    all();
    return $("#pvEN").focus();
  }
  if (a === "pv_pmsave") {
    const n = pvVal("pvEN");
    if (!n) return toast("Enter the payment mode's name.");
    if (pvTaken(n, k)) return toast(`${n} is already on the list.`);
    const was = mode.n;
    mode.n = n;
    mode.ph = pvVal("pvEH");
    return done("Settings", `Payment mode ${was} changed to ${n}`, `${n} saved.`);
  }
  if (a === "pv_pmdel") {
    if (SALES.some(s => (s.mx || {})[k])) return toast("It has been used. Turn it off instead.");
    cfg.custom = cfg.custom.filter(c => c.k !== k);
    return done("Settings", `Payment mode deleted: ${mode.n}`, `${mode.n} deleted.`);
  }
  if (a === "pv_vradd") {
    const n = pvVal("pvV");
    if (!n) return toast("Enter the reason.");
    if (reasons().some(r => r.toLowerCase() === n.toLowerCase()))
      return toast("That reason is already on the list.");
    reasons().push(n);
    return done("Settings", `Void reason added: ${n}`, "Reason added. It's on the POS now.");
  }
  if (a === "pv_vredit") {
    pvEdit = { vr: i };
    all();
    return $("#pvVE").focus();
  }
  if (a === "pv_vrsave") {
    const n = pvVal("pvVE");
    if (!n) return toast("Enter the reason.");
    if (reasons().some((r, j) => j !== i && r.toLowerCase() === n.toLowerCase()))
      return toast("That reason is already on the list.");
    const was = reasons()[i];
    reasons()[i] = n;
    return done("Settings", `Void reason ${was} changed to ${n}`, "Reason saved.");
  }
  if (a === "pv_vrdel") {
    const was = reasons()[i];
    reasons().splice(i, 1);
    return done("Settings", `Void reason deleted: ${was}`, "Reason deleted.");
  }
}

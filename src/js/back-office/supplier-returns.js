// ---- Purchasing → Returns to supplier: goods sent back against a GRN, once a manager authorises it ----
// Raising a return moves nothing. Approving it with a manager's PIN takes the stock out, reduces what's owed
// to the vendor, and makes the Goods Return Note ready to print.
const GR_REASONS = [
  "Damaged on delivery",
  "Expired or near expiry",
  "Wrong item delivered",
  "Delivered too many",
  "Poor quality"
];
let grF = { grn: "", qty: {}, why: "", note: "", q: "" };
const grList = () => FD_SETTINGS.grnReturns || (FD_SETTINGS.grnReturns = []);
const grLineOf = (g, k) => g.lines.find(l => l.k === k);
/** A base unit's value on the GRN, with its VAT. */
function grUnit(g, k) {
  const l = grLineOf(g, k),
    gross = l.gross !== undefined ? l.gross : l.q * l.c,
    tax = l.tax || 0;
  return { gross: l.q ? gross / l.q : 0, tax: l.q ? tax / l.q : 0 };
}
/** What's left to send back: returns already approved or waiting count against it. */
const grTaken = (grn, k) =>
  grList()
    .filter(r => r.grn === grn && r.status !== "Rejected")
    .reduce((a, r) => a + r.lines.filter(l => l.k === k).reduce((x, l) => x + l.q, 0), 0);
const grAmount = r => r.lines.reduce((a, l) => a + l.gross, 0);
const grTax = r => r.lines.reduce((a, l) => a + l.tax, 0);
function grOpts() {
  const q = grF.q.trim().toLowerCase(),
    L = GRNS.slice()
      .reverse()
      .filter(
        g => !q || `${g.id} ${g.sup} ${g.inv || ""} ${g.dnote || ""}`.toLowerCase().includes(q)
      );
  return `<option value="">Choose the GRN the goods came on…</option>${L.map(
    g =>
      `<option value="${esc(g.id)}" ${g.id === grF.grn ? "selected" : ""}>${esc(g.id)} · ${esc(g.sup)} · invoice ${esc(g.inv || g.ref || "–")} · ${dt2(g.at)}</option>`
  ).join("")}`;
}
function grFormHTML() {
  const g = GRNS.find(x => x.id === grF.grn);
  return `<div class="pn"><h4>New return</h4><div class="pv-form"><label>Find a GRN<input id="grFind" value="${esc(grF.q)}" placeholder="GRN no, supplier, invoice or delivery note"></label><label class="ac-wide">Goods Received Note<select data-gr="grn" id="grPick">${grOpts()}</select></label></div>
  ${
    !g
      ? ""
      : `<div class="stk">From <b>${esc(g.sup)}</b> into <b>${esc(g.store)}</b> · invoice ${esc(g.inv || g.ref || "–")} · delivery note ${esc(g.dnote || "–")}</div>
  <div class="tw"><table class="t"><tr><th>Item</th><th class="n">Received</th><th class="n">Already returned</th><th class="n">In ${esc(g.store)}</th><th class="n">Each (KES)</th><th class="n">Quantity to return</th></tr>${g.lines
    .map(l => {
      const u = itemInfo(l.k),
        taken = grTaken(g.id, l.k),
        left = Math.max(0, l.q - taken);
      return `<tr><td><b>${esc(u.name)}</b></td><td class="n">${qn(l.q)} ${esc(u.uom)}</td><td class="n">${qn(taken)}</td><td class="n">${qn(have(g.store, l.k))}</td><td class="n">${m2(grUnit(g, l.k).gross)}</td><td class="n">${left > 0 ? `<input class="pr-price" type="number" min="0" max="${left}" step="any" data-grq="${esc(l.k)}" value="${esc(grF.qty[l.k] || "")}" aria-label="Quantity of ${esc(u.name)} to return">` : "All returned"}</td></tr>`;
    })
    .join("")}</table></div>
  <div class="pv-form"><label>Reason<select id="grWhy" data-grv="why"><option value="">Choose a reason…</option>${GR_REASONS.map(r => `<option ${r === grF.why ? "selected" : ""}>${r}</option>`).join("")}<option ${grF.why === "Other" ? "selected" : ""}>Other</option></select></label><label class="ac-wide">Note<input id="grNote" data-grv="note" maxlength="120" value="${esc(grF.note)}" placeholder="Anything the supplier should know"></label><button class="chip on" data-a="gr_raise">Send for authorisation</button></div>
  <div class="stk">Nothing moves until a manager approves it with their PIN.</div>`
  }</div>`;
}
function grListHTML() {
  const L = grList().slice().reverse();
  return `<div class="pn tw"><h4>Returns to supplier (${L.length})</h4>${
    L.length
      ? `<table class="t gr-list"><tr><th>Date</th><th>Return no</th><th>Supplier</th><th>GRN</th><th>Items</th><th>Reason</th><th class="n">Value (KES)</th><th>Status</th><th></th></tr>${L.map(
          r =>
            `<tr><td>${dt2(r.at)}</td><td><b>${esc(r.id)}</b></td><td>${esc(r.sup)}</td><td>${esc(r.grn)}</td><td>${r.lines.map(l => `${esc(itemInfo(l.k).name)} ${qn(l.q)}`).join(", ")}</td><td>${esc(r.why)}</td><td class="n">${m2(grAmount(r))}</td><td><span class="tag ${r.status === "Returned" ? "ok" : r.status === "Rejected" ? "bad" : "warn"}">${esc(r.status)}</span>${apNote(r) ? `<small class="pr-code">${apNote(r)}</small>` : ""}</td><td class="n"><span class="sp-acts">${r.status === AWAIT ? apButtons("ret", r) : ""}${r.status === "Returned" ? docBtn("ret", r.id, "View or print") : ""}</span></td></tr>`
        ).join("")}</table>`
      : '<div class="empty">No returns yet.</div>'
  }</div>`;
}
const grReturnsHTML = () => grFormHTML() + grListHTML();
/** Approving: the stock leaves, unless the store has since used it. */
function grApply(r, who) {
  const short = r.lines.find(l => l.q > have(r.store, l.k) + 1e-9);
  if (short)
    return `Only ${qn(have(r.store, short.k))} ${itemInfo(short.k).uom} of ${itemInfo(short.k).name} left in ${r.store}. Reject this return, or raise it again for less.`;
  r.lines.forEach(l =>
    mvc(r.store, l.k, -l.q, "RETURN", `Return to ${r.sup}: ${r.why}`, "", r.id, who)
  );
  r.appr = { by: who, at: new Date().toISOString() };
  r.status = "Returned";
  auditAdd(
    "Return to supplier",
    `${r.id} · ${r.sup} · KES ${m2(grAmount(r))} · ${r.why} · authorised by ${who}`,
    { ref: r.id, mod: "Purchasing", pri: "Important" }
  );
  return "";
}
function grAct(a, b) {
  if (!boCan("pur.receive")) return boDenied();
  if (a === "gr_raise") {
    const g = GRNS.find(x => x.id === grF.grn),
      why = $("#grWhy").value,
      note = $("#grNote").value.trim();
    if (!g) return toast("Choose the Goods Received Note.");
    if (!why) return toast("Choose the reason for the return.");
    if (why === "Other" && !note) return toast("Say why in the note.");
    const lines = [];
    for (const l of g.lines) {
      const q = parseFloat(grF.qty[l.k]);
      if (!(q > 0)) continue;
      const left = l.q - grTaken(g.id, l.k),
        u = grUnit(g, l.k);
      if (q > left + 1e-9)
        return toast(`Only ${qn(left)} of ${itemInfo(l.k).name} can still be returned on ${g.id}.`);
      if (q > have(g.store, l.k) + 1e-9)
        return toast(
          `Only ${qn(have(g.store, l.k))} of ${itemInfo(l.k).name} is left in ${g.store}.`
        );
      lines.push({ k: l.k, q, gross: u.gross * q, tax: u.tax * q });
    }
    if (!lines.length) return toast("Enter the quantity to return.");
    const r = {
      id: nid("RTN"),
      at: new Date().toISOString(),
      grn: g.id,
      sup: g.sup,
      store: g.store,
      inv: g.inv || g.ref || "",
      dnote: g.dnote || "",
      why,
      note,
      by: boUser.n,
      status: AWAIT,
      lines
    };
    grList().push(r);
    grF = { grn: "", qty: {}, why: "", note: "", q: "" };
    auditAdd("Return to supplier", `${r.id} raised · ${r.sup} · KES ${m2(grAmount(r))}`, {
      ref: r.id,
      mod: "Purchasing"
    });
    bosave();
    toast(`${r.id} is waiting for a manager's approval.`);
    return all();
  }
}
document.addEventListener("change", e => {
  const s = e.target.dataset || {};
  if (s.gr) {
    grF[s.gr] = e.target.value;
    grF.qty = {};
    all();
  }
});
document.addEventListener("input", e => {
  const s = e.target.dataset || {};
  if (s.grq) grF.qty[s.grq] = e.target.value;
  if (s.grv) grF[s.grv] = e.target.value;
  if (e.target.id === "grFind") {
    grF.q = e.target.value;
    $("#grPick").innerHTML = grOpts();
  }
});

// ---- Selling points: promotions, such as buy 2 get 1 free, for a set number of days ----
let pmE = null;
const pmSaved = () => FD_SETTINGS.promos || (FD_SETTINGS.promos = []);
const pmItem = id => ITEMS.find(x => x.id === id);
const pmDeal = r => {
  const b = pmItem(r.buy),
    f = pmItem(r.free);
  return `Buy ${qn(r.n)} ${b ? esc(b.n) : "(removed)"}, get ${qn(r.m)} ${f ? esc(f.n) : "(removed)"} free`;
};
const pmState = r =>
  !r.on
    ? '<span class="tag">Off</span>'
    : bizDate() < r.from
      ? '<span class="tag warn">Coming up</span>'
      : bizDate() > r.to
        ? '<span class="tag">Ended</span>'
        : '<span class="tag ok">Running now</span>';
function promotionsHTML() {
  const R = pmSaved(),
    can = catRight();
  return `<div class="pn tw"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Promotions (${R.length})</h4><span class="fr" style="flex:none;align-items:center;margin:0"><button class="mini" data-a="pm_rep">Promotion report</button>${can ? '<button class="chip on" data-a="pm_new">New promotion</button>' : ""}</span></div>
  <div class="stk">Buy something and get one free, or get something else free, between two dates. The POS adds the free item by itself at no charge, and it still comes off stock.</div>
  ${
    R.length
      ? `<table class="t"><tr><th>Promotion</th><th>Selling point</th><th>Deal</th><th>Dates</th><th>Status</th><th></th></tr>${R.map(
          r =>
            `<tr><td><b>${esc(r.name)}</b></td><td>${esc((pmItem(r.buy) || {}).d || "-")}</td><td>${pmDeal(r)}</td><td>${dateGB(r.from)} to ${dateGB(r.to)}</td><td>${pmState(r)}</td><td class="n">${can ? `<button class="mini" data-a="pm_tog" data-id="${r.id}">Turn ${r.on ? "off" : "on"}</button> <button class="mini" data-a="pm_edit" data-id="${r.id}">Edit</button>` : ""}</td></tr>`
        ).join("")}</table>`
      : '<div class="empty">No promotions yet.</div>'
  }</div>${pmModal()}`;
}
function pmModal() {
  if (!pmE) return "";
  const F = pmE,
    P = ALLD.filter(posSells);
  if (!P.includes(F.pt)) F.pt = P[0] || "";
  const I = ITEMS.filter(i => i.d === F.pt && i.sell !== "acc").sort((a, b) =>
    a.n.localeCompare(b.n)
  );
  if (!I.some(i => String(i.id) === F.buy)) F.buy = I[0] ? String(I[0].id) : "";
  if (!I.some(i => String(i.id) === F.free)) F.free = I[0] ? String(I[0].id) : "";
  const list = v =>
      I.map(
        i =>
          `<option value="${i.id}" ${String(i.id) === v ? "selected" : ""}>${esc(i.n)} · KES ${m2(i.p)}</option>`
      ).join(""),
    n = parseFloat(F.n),
    m = parseFloat(F.m),
    b = I.find(i => String(i.id) === F.buy),
    f = F.same === "same" ? b : I.find(i => String(i.id) === F.free);
  return `<div class="modal show" id="pmEd" style="z-index:63"><div class="box itm">
  <header class="itm-h"><div><h3>${F.id ? "Edit promotion" : "New promotion"}</h3><p>Runs between the two dates, then stops by itself</p></div><button class="itm-x" data-a="pm_close" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><h4>Promotion</h4>
   <label class="hh-on"><input type="checkbox" id="pmOn" ${F.on ? "checked" : ""}> Promotion on</label>
   <div class="itm-g itm-g3"><label>Name<input id="pmName" maxlength="40" value="${esc(F.name)}" placeholder="e.g. Tusker weekend"></label>
   <label>Selling point<select data-pm="pt">${P.map(p => `<option ${p === F.pt ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label></div></section>
   <section class="itm-s"><h4>What the guest buys</h4><div class="itm-g itm-g3"><label>Product<select data-pm="buy">${list(F.buy)}</select></label><label>Quantity<input id="pmN" type="number" min="1" step="1" value="${esc(F.n)}"></label></div></section>
   <section class="itm-s"><h4>What the guest gets free</h4><div class="itm-g itm-g3"><label>Free item<select data-pm="same"><option value="same" ${F.same === "same" ? "selected" : ""}>The same product</option><option value="other" ${F.same === "other" ? "selected" : ""}>Something else</option></select></label>
   ${F.same === "other" ? `<label>Product<select data-pm="free">${list(F.free)}</select></label>` : ""}
   <label>Quantity free<input id="pmM" type="number" min="1" step="1" value="${esc(F.m)}"></label></div>
   ${b && f && n > 0 && m > 0 ? `<div class="itm-hint">Buy ${qn(n)} ${esc(b.n)}, get ${qn(m)} ${esc(f.n)} free. Buying twice as many gives twice as many free.</div>` : ""}</section>
   <section class="itm-s"><h4>Dates</h4><div class="itm-g itm-g3"><label>From<input id="pmFrom" type="date" value="${esc(F.from)}"></label><label>To<input id="pmTo" type="date" value="${esc(F.to)}"></label></div></section></div>
  <footer class="itm-f">${F.id ? '<button class="mini cat-del" style="margin-right:auto" data-a="pm_del">Delete promotion</button>' : ""}<button class="mini" data-a="pm_close">Cancel</button><button class="chip on" data-a="pm_save">Save promotion</button></footer></div></div>`;
}
function pmRead() {
  if (!pmE) return;
  pmE.on = $("#pmOn").checked;
  pmE.name = $("#pmName").value;
  pmE.n = $("#pmN").value;
  pmE.m = $("#pmM").value;
  pmE.from = $("#pmFrom").value;
  pmE.to = $("#pmTo").value;
  document.querySelectorAll("#pmEd [data-pm]").forEach(el => (pmE[el.dataset.pm] = el.value));
}
function pmSave() {
  pmRead();
  const F = pmE,
    name = F.name.trim(),
    n = parseFloat(F.n),
    m = parseFloat(F.m),
    buy = +F.buy,
    free = F.same === "same" ? buy : +F.free;
  if (!name) return toast("Give the promotion a name.");
  if (!pmItem(buy) || !pmItem(free)) return toast("Choose the products.");
  if (!(n >= 1) || !Number.isInteger(n)) return toast("Enter how many the guest buys.");
  if (!(m >= 1) || !Number.isInteger(m)) return toast("Enter how many the guest gets free.");
  if (!F.from || !F.to) return toast("Enter both dates.");
  if (F.from > F.to) return toast("The From date is after the To date.");
  const rule = { id: F.id || Date.now(), on: F.on, name, buy, n, free, m, from: F.from, to: F.to },
    L = pmSaved(),
    at = L.findIndex(r => r.id === F.id);
  at > -1 ? (L[at] = rule) : L.push(rule);
  pmE = null;
  spRefreshPos();
  bosave();
  auditAdd("Promotion", `Saved: ${name}, ${F.from} to ${F.to}`);
  toast("Promotion saved.");
  all();
}
function pmAct(a, b) {
  if (a === "pm_rep") {
    repPick("promo");
    return go("Reports");
  }
  if (!catRight()) return boDenied();
  const id = +b.dataset.id;
  if (a === "pm_new")
    pmE = {
      id: 0,
      on: true,
      name: "",
      pt: "",
      buy: "",
      n: "2",
      same: "same",
      free: "",
      m: "1",
      from: bizDate(),
      to: bizDate()
    };
  if (a === "pm_edit") {
    const r = pmSaved().find(x => x.id === id);
    pmE = {
      ...r,
      pt: (pmItem(r.buy) || {}).d || "",
      buy: String(r.buy),
      free: String(r.free),
      same: r.buy === r.free ? "same" : "other",
      n: String(r.n),
      m: String(r.m)
    };
  }
  if (a === "pm_close") pmE = null;
  if (a === "pm_tog") {
    const r = pmSaved().find(x => x.id === id);
    r.on = !r.on;
    spRefreshPos();
    bosave();
  }
  if (a === "pm_del") {
    FD_SETTINGS.promos = pmSaved().filter(r => r.id !== pmE.id);
    pmE = null;
    spRefreshPos();
    bosave();
    auditAdd("Promotion", "A promotion was deleted", { pri: "Important" });
    toast("Promotion deleted.");
  }
  if (a === "pm_save") return pmSave();
  all();
}
// The form follows its choices without losing what's been typed.
document.addEventListener("change", e => {
  if (!pmE || !e.target.closest("#pmEd") || !e.target.dataset.pm) return;
  pmRead();
  all();
});

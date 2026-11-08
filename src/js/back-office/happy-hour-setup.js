// ---- Selling points: happy hour rules on a whole category or one product ----
let hhE = null;
const HH_TYPES = [
  ["price", "Happy hour price"],
  ["amount", "Amount off"],
  ["pct", "Percentage off"]
];
const hhSaved = () => FD_SETTINGS.happy || (FD_SETTINGS.happy = []);
const hhDeal = r =>
  r.type === "price"
    ? `KES ${m2(r.v)}`
    : r.type === "pct"
      ? `${qn(r.v)}% off`
      : `KES ${m2(r.v)} off`;
const hhTarget = r => {
  if (!r.item) return `${esc(r.cat)} <small>category</small>`;
  const i = ITEMS.find(x => x.id == r.item);
  return i ? esc(i.n) : "Product removed";
};
function hhTimes(r) {
  const today = (r.days || {})[new Date().getDay()],
    n = Object.values(r.days || {}).filter(d => d.f && d.t).length;
  return `${today && today.f && today.t ? `Today ${today.f} to ${today.t}` : "Not today"} <small>· ${n} day${n === 1 ? "" : "s"} a week</small>`;
}
const hhState = r =>
  !r.on
    ? '<span class="tag">Off</span>'
    : happyOpen(r)
      ? '<span class="tag ok">Running now</span>'
      : '<span class="tag warn">Waiting</span>';
function happyHTML() {
  const R = hhSaved(),
    can = catRight();
  return `<div class="pn tw"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Happy hour (${R.length})</h4><span class="fr" style="flex:none;align-items:center;margin:0"><button class="mini" data-a="hh_rep">Happy hour report</button>${can ? '<button class="chip on" data-a="hh_new">New happy hour</button>' : ""}</span></div>
  <div class="stk">A lower price on a category or one product, at set times. When the time ends, the normal price comes back by itself. Items already on a bill keep the price they were added at.</div>
  ${
    R.length
      ? `<table class="t"><tr><th>Applies to</th><th>Selling point</th><th>Deal</th><th>Times</th><th>Status</th><th></th></tr>${R.map(
          r =>
            `<tr><td>${hhTarget(r)}</td><td>${r.pt === "All" ? "All selling points" : esc(r.pt)}</td><td>${hhDeal(r)}</td><td>${hhTimes(r)}</td><td>${hhState(r)}</td><td class="n">${can ? `<button class="mini" data-a="hh_tog" data-id="${r.id}">Turn ${r.on ? "off" : "on"}</button> <button class="mini" data-a="hh_edit" data-id="${r.id}">Edit</button>` : ""}</td></tr>`
        ).join("")}</table>`
      : '<div class="empty">No happy hours yet.</div>'
  }</div>${hhModal()}`;
}
const hhPoints = () => ALLD.filter(posSells);
const hhItems = pt =>
  ITEMS.filter(i => i.sell !== "acc" && (pt === "All" || i.d === pt)).sort((a, b) =>
    a.n.localeCompare(b.n)
  );
function hhModal() {
  if (!hhE) return "";
  const F = hhE,
    I = hhItems(F.pt),
    C = [...new Set(I.map(i => i.c))].sort((a, b) => a.localeCompare(b));
  if (!C.includes(F.cat)) F.cat = C[0] || "";
  if (!I.some(i => i.id == F.item)) F.item = I[0] ? String(I[0].id) : "";
  const sample = F.kind === "item" ? I.find(i => i.id == F.item) : I.find(i => i.c === F.cat),
    v = parseFloat(F.v),
    hint =
      sample && v > 0
        ? `${esc(sample.n)}: KES ${m2(sample.p)} becomes KES ${m2(happyDeal({ type: F.type, v }, sample.p))} during happy hour.`
        : "";
  return `<div class="modal show" id="hhEd" style="z-index:63"><div class="box itm">
  <header class="itm-h"><div><h3>${F.id ? "Edit happy hour" : "New happy hour"}</h3><p>Leave a day empty for no happy hour that day</p></div><button class="itm-x" data-a="hh_close" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><h4>What it applies to</h4>
   <label class="hh-on"><input type="checkbox" id="hhOn" ${F.on ? "checked" : ""}> Happy hour on</label>
   <div class="itm-g itm-g3"><label>Selling point<select data-hh="pt"><option value="All">All selling points</option>${hhPoints()
     .map(p => `<option ${p === F.pt ? "selected" : ""}>${esc(p)}</option>`)
     .join("")}</select></label>
   <label>Applies to<select data-hh="kind"><option value="cat" ${F.kind === "cat" ? "selected" : ""}>A whole category</option><option value="item" ${F.kind === "item" ? "selected" : ""}>One product</option></select></label>
   ${
     F.kind === "cat"
       ? `<label>Category<select data-hh="cat">${C.map(c => `<option ${c === F.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>`
       : `<label>Product<select data-hh="item">${I.map(i => `<option value="${i.id}" ${i.id == F.item ? "selected" : ""}>${esc(i.n)}${F.pt === "All" ? ` · ${esc(i.d)}` : ""}</option>`).join("")}</select></label>`
   }</div></section>
   <section class="itm-s"><h4>The deal</h4><div class="itm-g itm-g3"><label>Deal<select data-hh="type">${HH_TYPES.map(([k, l]) => `<option value="${k}" ${k === F.type ? "selected" : ""}>${l}</option>`).join("")}</select></label>
   <label>${F.type === "pct" ? "Percentage off" : F.type === "amount" ? "Amount off (KES)" : "Price (KES)"}<input id="hhV" type="number" min="0" step="any" value="${esc(F.v)}"></label></div>
   ${hint ? `<div class="itm-hint">${hint}</div>` : ""}</section>
   <section class="itm-s"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Days and times</h4><button class="mini" data-a="hh_copy" style="flex:none">Copy Monday to every day</button></div>
   <div class="hh-days">${[1, 2, 3, 4, 5, 6, 0]
     .map(
       d =>
         `<b>${HH_DAYS[d]}</b><label>From<input type="time" id="hhF${d}" value="${esc((F.days[d] || {}).f || "")}"></label><label>To<input type="time" id="hhT${d}" value="${esc((F.days[d] || {}).t || "")}"></label>`
     )
     .join("")}</div></section></div>
  <footer class="itm-f">${F.id ? '<button class="mini cat-del" style="margin-right:auto" data-a="hh_del">Delete happy hour</button>' : ""}<button class="mini" data-a="hh_close">Cancel</button><button class="chip on" data-a="hh_save">Save happy hour</button></footer></div></div>`;
}
function hhRead() {
  if (!hhE) return;
  hhE.on = $("#hhOn").checked;
  hhE.v = $("#hhV").value;
  document.querySelectorAll("#hhEd [data-hh]").forEach(el => (hhE[el.dataset.hh] = el.value));
  [0, 1, 2, 3, 4, 5, 6].forEach(d => {
    hhE.days[d] = { f: $("#hhF" + d).value, t: $("#hhT" + d).value };
  });
}
function hhSave() {
  hhRead();
  const F = hhE,
    v = parseFloat(F.v),
    item = F.kind === "item" ? ITEMS.find(i => i.id == F.item) : null;
  if (F.kind === "item" ? !item : !F.cat) return toast("Choose what it applies to.");
  if (!(v >= 0) || (F.type !== "price" && !(v > 0))) return toast("Enter the deal's value.");
  if (F.type === "pct" && v > 100) return toast("The percentage can't be over 100.");
  const D = Object.values(F.days);
  if (D.some(d => !!d.f !== !!d.t)) return toast("Enter both From and To for each day you use.");
  if (D.some(d => d.f && d.f === d.t)) return toast("From and To can't be the same time.");
  if (!D.some(d => d.f)) return toast("Enter the times for at least one day.");
  const rule = {
      id: F.id || Date.now(),
      on: F.on,
      pt: item ? item.d : F.pt,
      item: item ? item.id : null,
      cat: item ? "" : F.cat,
      type: F.type,
      v,
      days: F.days
    },
    L = hhSaved(),
    at = L.findIndex(r => r.id === F.id);
  at > -1 ? (L[at] = rule) : L.push(rule);
  hhE = null;
  spRefreshPos();
  bosave();
  auditAdd(
    "Happy hour",
    `Saved: ${rule.item ? (ITEMS.find(x => x.id === rule.item) || {}).n : rule.cat}, ${rule.pt === "All" ? "all selling points" : rule.pt}`
  );
  toast("Happy hour saved.");
  all();
}
function hhAct(a, b) {
  if (a === "hh_rep") {
    repPick("hh");
    return go("Reports");
  }
  if (!catRight()) return boDenied();
  const id = +b.dataset.id;
  if (a === "hh_new")
    hhE = {
      id: 0,
      on: true,
      pt: "All",
      kind: "cat",
      cat: "",
      item: "",
      type: "price",
      v: "",
      days: {}
    };
  if (a === "hh_edit") {
    const r = hhSaved().find(x => x.id === id);
    hhE = {
      ...r,
      kind: r.item ? "item" : "cat",
      item: r.item ? String(r.item) : "",
      v: String(r.v),
      days: JSON.parse(JSON.stringify(r.days || {}))
    };
  }
  if (a === "hh_close") hhE = null;
  if (a === "hh_tog") {
    const r = hhSaved().find(x => x.id === id);
    r.on = !r.on;
    spRefreshPos();
    bosave();
  }
  if (a === "hh_copy") {
    hhRead();
    [0, 2, 3, 4, 5, 6].forEach(d => (hhE.days[d] = { ...hhE.days[1] }));
  }
  if (a === "hh_del") {
    FD_SETTINGS.happy = hhSaved().filter(r => r.id !== hhE.id);
    hhE = null;
    spRefreshPos();
    bosave();
    auditAdd("Happy hour", "A happy hour was deleted", { pri: "Important" });
    toast("Happy hour deleted.");
  }
  if (a === "hh_save") return hhSave();
  all();
}
// The form follows its choices without losing what's been typed.
document.addEventListener("change", e => {
  if (!hhE || !e.target.closest("#hhEd") || !e.target.dataset.hh) return;
  hhRead();
  all();
});

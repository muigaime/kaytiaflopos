// ---- Products List: everything on sale, and one place to add to it ----
// Three ways in: sell what's already in stock, create a new stock item for a store, or a selling item with no stock.
let prE = null,
  prEdit = null,
  prPoint = "All";
const PR_WAYS = [
  [
    "stock",
    "Sell something in stock",
    "An item already in the Stock Master. Each sale takes it off the selling point's stock."
  ],
  ["new", "New stock item", "Something you buy and keep. Choose the store that receives it."],
  [
    "sell",
    "Selling item only",
    "Goes straight on the POS with no stock kept, such as corkage or a service."
  ]
];
const prPoints = () => ALLD.filter(posSells);
const prNoStock = i => !Object.keys(i.r || {}).length;
const prNewId = () => Math.max(0, ...ITEMS.map(i => i.id)) + 1;
const prOnBill = id => {
  const on = L => Object.keys(L || {}).some(k => k.split("~")[0] === String(id));
  return orders.some(o => on(o.lines)) || on(cart);
};
function prCanSell(i) {
  if (prNoStock(i)) return '<span class="tag">No stock kept</span>';
  const n = avail(i);
  return `<span class="tag ${n > 0 ? "ok" : "bad"}">${n > 0 ? qn(n) : "Out of stock"}</span>`;
}
function prRow(i) {
  return `<tr${findAttr("prod", i.n, i.c, i.d, i.id)}><td><b>${esc(i.n)}</b><small class="pr-code">Code ${i.id}</small></td><td>${esc(i.d)}</td><td><span class="pr-cat" style="--h:${hue(i.c)}">${esc(i.c)}</span></td><td>${TAX[i.t] > 0 ? `${qn(TAX[i.t])}%` : "None"}</td><td><input type="number" class="pr-price" value="${i.p}" data-pr="${i.id}" aria-label="Price of ${esc(i.n)}"></td><td class="n">${prCanSell(i)}</td><td>${modCell(i)}</td><td>${accCell(i)}</td><td>${cvCell(i)}</td><td class="n"><span class="sp-acts"><button class="mini" data-a="prl_edit" data-id="${i.id}">Edit</button><button class="mini cat-del" data-a="prl_del" data-id="${i.id}">Delete</button></span></td></tr>`;
}
function productsHTML() {
  const P = prPoints();
  if (prPoint !== "All" && !P.includes(prPoint)) prPoint = "All";
  const L = ITEMS.filter(i => i.sell !== "acc" || !prNoStock(i)),
    shown = L.filter(i => prPoint === "All" || i.d === prPoint).sort(
      (a, b) => a.d.localeCompare(b.d) || a.c.localeCompare(b.c) || a.n.localeCompare(b.n)
    ),
    out = L.filter(i => !prNoStock(i) && avail(i) <= 0).length,
    kpi = (l, v) => `<div class="sp-kpi"><span>${l}</span><b>${v}</b></div>`,
    pill = (k, l, n) =>
      `<button class="pr-pill ${k === prPoint ? "on" : ""}" data-a="prl_point" data-k="${esc(k)}">${esc(l)} <i>${n}</i></button>`;
  return `<div id="spPage" class="pr-page"><div class="pn pr-hero"><div class="sp-kpis">${kpi("Products", L.length)}${kpi("Selling points", P.length)}${kpi("Categories", new Set(L.map(i => i.c)).size)}${kpi("Out of stock", out)}</div><span class="inv-btns"><button class="mini" data-a="pur_go" data-l="${esc(STKT.loc)}" data-t="receive">Receive into a store</button><button class="chip on" data-a="prl_add">Add item</button></span></div>
  <div class="pn tw" data-findscope><div class="pr-bar">${findBox("prod", "Search product, category or code")}<div class="pr-pills">${pill("All", "All selling points", L.length)}${P.map(p => pill(p, p, L.filter(i => i.d === p).length)).join("")}</div></div>
  ${
    shown.length
      ? `<table class="t"><tr><th>Product</th><th>Selling point</th><th>Category</th><th>Tax</th><th>Price (KES)</th><th class="n">Can sell</th><th>Modifiers</th><th>Accompaniments</th><th>Stock conversion</th><th></th></tr>${shown.map(prRow).join("")}</table>`
      : '<div class="empty">Nothing here yet. Use Add item to put the first product on the POS.</div>'
  }</div></div>${prAddModal()}${prEditModal()}${itemPopupIfOpen()}${speModal()}`;
}
function prAddModal() {
  if (!prE) return "";
  const F = prE,
    keys = pickKeys().sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name)),
    P = prPoints();
  if (F.way === "stock" && !keys.includes(F.k)) F.k = keys[0] || "";
  const u = F.way === "stock" && F.k ? itemInfo(F.k) : null;
  return `<div class="modal show" id="prAdd" style="z-index:63"><div class="box itm">
  <header class="itm-h"><div><h3>Add item</h3><p>Choose how it comes into the system</p></div><button class="itm-x" data-a="prl_close" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><div class="pr-ways">${PR_WAYS.map(([k, t, s]) => `<button class="pr-way ${k === F.way ? "on" : ""}" data-a="prl_way" data-k="${k}"><b>${t}</b><span>${s}</span></button>`).join("")}</div></section>
  <section class="itm-s"><h4>Selling points</h4><div class="pr-ticks">${P.map(p => `<label><input type="checkbox" data-prp="${esc(p)}" ${F.pts.includes(p) ? "checked" : ""}> ${esc(p)}</label>`).join("")}</div></section>
  <section class="itm-s"><h4>Product</h4><div class="itm-g itm-g3">
   ${
     F.way === "stock"
       ? `<label>Stock item<select data-prf="k">${keys.map(k => `<option value="${esc(k)}" ${k === F.k ? "selected" : ""}>${esc(itemInfo(k).name)} (${esc(itemInfo(k).uom)})</option>`).join("")}</select></label><label>One sale uses${u ? ` (${esc(u.uom)})` : ""}<input data-prf="q" type="number" min="0" step="any" value="${esc(F.q)}"></label>`
       : ""
   }
   <label>Name on the POS<input data-prf="n" maxlength="60" value="${esc(F.n)}" placeholder="${u ? esc(u.name) : "e.g. Corkage"}"></label>
   <label>Category<input data-prf="c" list="prodCatL" value="${esc(F.c)}" placeholder="e.g. Beer, Mains"></label>
   <label>Selling price (KES)<input data-prf="p" type="number" min="0" step="any" value="${esc(F.p)}"></label>
   <label>Tax<select data-prf="t">${taxChoices()
     .map(([v, l]) => `<option value="${v}" ${v === F.t ? "selected" : ""}>${l}</option>`)
     .join("")}</select></label></div></section></div>
  <footer class="itm-f"><button class="mini" data-a="prl_close">Cancel</button><button class="chip on" data-a="prl_save">Add to the POS</button></footer></div></div>`;
}
function prRead() {
  document.querySelectorAll("#prAdd [data-prf]").forEach(el => (prE[el.dataset.prf] = el.value));
  prE.pts = [...document.querySelectorAll("#prAdd [data-prp]")]
    .filter(x => x.checked)
    .map(x => x.dataset.prp);
}
function prSave() {
  prRead();
  const F = prE,
    u = F.way === "stock" && F.k ? itemInfo(F.k) : null,
    n = F.n.trim() || (u ? u.name : ""),
    p = parseFloat(F.p),
    q = parseFloat(F.q);
  if (!F.pts.length) return toast("Tick at least one selling point.");
  if (!n) return toast("Enter the product's name.");
  if (F.way === "stock" && !u) return toast("Choose the stock item.");
  if (F.way === "stock" && !(q > 0)) return toast("Enter how much one sale uses.");
  if (!(p > 0)) return toast("Enter the selling price.");
  const taken = F.pts.filter(d =>
      ITEMS.some(i => i.d === d && i.n.toLowerCase() === n.toLowerCase())
    ),
    go = F.pts.filter(d => !taken.includes(d));
  if (!go.length) return toast(`${taken.join(", ")} already sells ${n}.`);
  go.forEach(d =>
    ITEMS.push({
      id: prNewId(),
      n,
      d,
      c: F.c.trim() || "General",
      p,
      t: F.t,
      r: F.way === "stock" ? { [F.k]: q } : {}
    })
  );
  auditAdd("Product", `${n} added at ${go.join(", ")}, KES ${p}`);
  prE = null;
  spRefreshPos();
  bosave();
  toast(
    `${n} is on the POS at ${go.join(", ")}.${taken.length ? ` ${taken.join(", ")} already sold it.` : ""}`
  );
  all();
}
function prEditModal() {
  if (!prEdit) return "";
  const F = prEdit;
  return `<div class="modal show" id="prEd" style="z-index:63"><div class="box itm">
  <header class="itm-h"><div><h3>Edit ${esc(F.was)}</h3><p>Sold at ${esc(F.d)} · no stock kept</p></div><button class="itm-x" data-a="prl_eclose" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><div class="itm-g itm-g3"><label>Name on the POS<input id="preN" maxlength="60" value="${esc(F.n)}"></label><label>Category<input id="preC" list="prodCatL" value="${esc(F.c)}"></label><label>Selling price (KES)<input id="preP" type="number" min="0" step="any" value="${esc(F.p)}"></label><label>Tax<select id="preT">${taxChoices()
    .map(([v, l]) => `<option value="${v}" ${v === F.t ? "selected" : ""}>${l}</option>`)
    .join("")}</select></label></div></section></div>
  <footer class="itm-f"><button class="mini" data-a="prl_eclose">Cancel</button><button class="chip on" data-a="prl_esave">Save changes</button></footer></div></div>`;
}
function prEditOpen(id) {
  const i = ITEMS.find(x => x.id === id);
  if (!i) return;
  if (!prNoStock(i)) return speOpen(id);
  prEdit = { id, was: i.n, d: i.d, n: i.n, c: i.c, p: String(i.p), t: i.t };
  all();
}
function prEditSave() {
  const i = ITEMS.find(x => x.id === prEdit.id),
    n = $("#preN").value.trim(),
    p = parseFloat($("#preP").value);
  if (!n) return toast("Enter the product's name.");
  if (!(p > 0)) return toast("Enter the selling price.");
  if (ITEMS.some(x => x !== i && x.d === i.d && x.n.toLowerCase() === n.toLowerCase()))
    return toast(`${i.d} already sells ${n}.`);
  Object.assign(i, { n, c: $("#preC").value.trim() || i.c, p, t: $("#preT").value });
  auditAdd("Product", `${n} edited at ${i.d}, KES ${p}`, { ref: String(i.id) });
  prEdit = null;
  spRefreshPos();
  bosave();
  toast(`${n} saved.`);
  all();
}
function prAct(a, b) {
  const d = b.dataset;
  if (a === "prl_point") {
    prPoint = d.k;
    return all();
  }
  if (!boCan("prod.manage")) return boDenied();
  if (a === "prl_add") {
    invF.it.open = false;
    prE = { way: d.m || "stock", pts: [], k: "", q: "1", n: "", c: "", p: "", t: "B" };
    return view === "prod" ? all() : go("Products List");
  }
  if (a === "prl_close") prE = null;
  if (a === "prl_way") {
    prRead();
    prE.way = d.k;
    if (d.k === "new") {
      prE = null;
      invF.it = { ...blankItemForm(invF.it.store), sp: "", open: true };
      return itOpened();
    }
  }
  if (a === "prl_save") return prSave();
  if (a === "prl_edit") return prEditOpen(+d.id);
  if (a === "prl_eclose") prEdit = null;
  if (a === "prl_esave") return prEditSave();
  if (a === "prl_del") {
    const i = ITEMS.find(x => x.id === +d.id);
    if (!i) return;
    if (prOnBill(i.id)) return toast("This product is on an open bill. Settle it first.");
    return tapConfirm(
      b,
      () => {
        ITEMS.splice(ITEMS.indexOf(i), 1);
        auditAdd("Product", `${i.n} deleted from ${i.d}`, { ref: String(i.id), pri: "Important" });
        spRefreshPos();
        bosave();
        toast(`${i.n} deleted from ${i.d}.`);
        all();
      },
      "Delete?"
    );
  }
  all();
}
/** Item form: also sell the new stock item on the POS. */
function itemSellHTML(F) {
  const P = prPoints(),
    on = F.sellPts || [];
  return `<section class="itm-s"><h4>Also sell it on the POS <span>optional</span></h4><div class="pr-ticks">${P.map(p => `<label><input type="checkbox" data-its="${esc(p)}" ${on.includes(p) ? "checked" : ""}> ${esc(p)}</label>`).join("")}</div>
    <div class="itm-g itm-g3"><label>Selling price (KES)<input id="itSellP" type="number" min="0" step="any" value="${esc(F.sellP || "")}"></label><label>One sale uses<input id="itSellQ" type="number" min="0" step="any" value="${esc(F.sellQ || "1")}"></label></div></section>`;
}
/** What the item form asked to sell: nothing, a problem to show, or the details. */
function itemSellRead() {
  const box = document.querySelectorAll("#itModal [data-its]"),
    pts = [...box].filter(x => x.checked).map(x => x.dataset.its);
  if (!pts.length) return null;
  const p = parseFloat($("#itSellP").value),
    q = parseFloat($("#itSellQ").value);
  if (!(p > 0)) return "Enter the selling price, or untick the selling points.";
  if (!(q > 0)) return "Enter how much one sale uses.";
  return { pts, p, q };
}
function itemSellAdd(k, name, group, tax, S) {
  const go = S.pts.filter(
    d => !ITEMS.some(i => i.d === d && i.n.toLowerCase() === name.toLowerCase())
  );
  go.forEach(d =>
    ITEMS.push({ id: prNewId(), n: name, d, c: group, p: S.p, t: tax, r: { [k]: S.q } })
  );
  spRefreshPos();
  return go.length ? ` On the POS at ${go.join(", ")}.` : "";
}

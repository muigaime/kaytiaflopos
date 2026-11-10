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
    "Goes straight on the POS with no stock kept, such as corkage or a service. You can add a recipe or production later."
  ]
];
const prPoints = () => ALLD.filter(posSells);
const prNoStock = i => !Object.keys(i.r || {}).length;
const prNewId = () => Math.max(0, ...ITEMS.map(i => i.id)) + 1;
const prOnBill = id => {
  const on = L => Object.keys(L || {}).some(k => k.split("~")[0] === String(id));
  return orders.some(o => on(o.lines)) || on(cart);
};
/** Buttons that give an item with no stock a recipe or production. */
function prGetStock(i) {
  if (!prNoStock(i) || !boCan("rec.view")) return "";
  const btn = (a, right, l) =>
      boCan(right) ? `<button class="mini" data-a="${a}" data-id="${i.id}">${l}</button>` : "",
    L = btn("rec_dirr", "rec.recipes", "Add recipe") + btn("rec_dirp", "rec.prod", "Production");
  return L ? `<span class="pr-gets">${L}</span>` : "";
}
function prCanSell(i) {
  if (prNoStock(i)) return '<span class="tag">No stock kept</span>';
  const n = avail(i);
  return `<span class="tag ${n > 0 ? "ok" : "bad"}">${n > 0 ? qn(n) : "Out of stock"}</span>`;
}
/** Counted as uploaded. A test upload doesn't count once a real service is connected. */
const prEtDone = i => !!i.etUp && !(i.etTest && prEt.live);
function prRow(i) {
  const up = prEtDone(i),
    track = !prNoStock(i);
  return `<tr${findAttr("prod", i.n, i.c, i.d, i.id, i.etCode || "", i.etId || "")}><td class="pr-sel"><input type="checkbox" data-a="prl_etsel" data-id="${i.id}" ${prEt.sel.has(i.id) ? "checked" : ""} aria-label="Select ${esc(i.n)}"></td><td class="pr-no">${i.id}</td><td><div class="pr-who"><span class="pr-av" style="--h:${hue(i.c)}" aria-hidden="true">${esc(i.n[0].toUpperCase())}</span><b>${esc(i.n)}</b></div></td><td>${esc(i.d)}</td><td><span class="pr-cat" style="--h:${hue(i.c)}">${esc(i.c)}</span></td><td><label class="pr-money"><i>KES</i><input type="number" class="pr-price" value="${i.p}" data-pr="${i.id}" aria-label="Selling price of ${esc(i.n)}"></label></td><td><span class="pr-yn ${track ? "yes" : ""}">${track ? "YES" : "NO"}</span></td><td><button class="pr-up ${up ? "yes" : ""}" data-a="prl_etone" data-id="${i.id}" title="${up ? "Send to eTIMS again" : "Send to eTIMS"}" aria-label="${up ? "Uploaded. Send " + esc(i.n) + " to eTIMS again" : "Not uploaded. Send " + esc(i.n) + " to eTIMS"}"><i class="pr-up-d" aria-hidden="true"></i><span>${up ? "YES" : "NO"}</span><span class="pr-up-i">${I("dl")}</span></button></td><td class="pr-eti" title="${esc(i.etCode || "")}">${esc(i.etCode || "-")}</td><td class="pr-eti" title="${esc(i.etId || "")}">${esc(i.etId || "-")}</td><td class="n"><span class="sp-acts"><button class="mini" data-a="prl_edit" data-id="${i.id}">Edit</button><button class="mini cat-del" data-a="prl_del" data-id="${i.id}">Delete</button></span></td></tr>`;
}
// ---------------------------------------------------------------- eTIMS on the Products List
// Upload and Adjust show only when a real eTIMS service is connected (M-Pesa & eTIMS, Mode: Live).
const prEt = { loaded: false, live: false, sel: new Set(), adj: null };
const prEtCall = (op, body) =>
  fetch("/lan/etims/" + op, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {})
  })
    .then(async r => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, j: { error: "The server can't be reached." } }));
async function prEtLoad() {
  prEt.loaded = true;
  const r = await prEtCall("status"),
    live = !!(r.ok && r.j.live);
  if (live === prEt.live) return;
  prEt.live = live;
  if (view === "prod") all();
}
const prEtShown = () => ITEMS.filter(i => i.sell !== "acc" || !prNoStock(i));
/** The ticked products, or every product when none are ticked. */
const prEtPool = () => {
  const L = prEtShown();
  if (prEt.sel.size) return L.filter(i => prEt.sel.has(i.id));
  const on = new Set(
    [...document.querySelectorAll("[data-a=prl_etsel]")]
      .filter(x => !x.closest("tr").hidden)
      .map(x => +x.dataset.id)
  );
  return L.filter(i => on.has(i.id));
};
const prEtSendWord = () =>
  prEt.sel.size ? `Send ${prEt.sel.size} ticked to eTIMS` : "Send all to eTIMS";
function prEtBar(L) {
  const up = L.filter(prEtDone).length,
    n = prEt.sel.size,
    scope = n ? `${n} ticked` : "All products";
  return `<section class="et-bar" aria-label="eTIMS"><div class="et-who"><i class="et-dot" aria-hidden="true"></i><div><b>eTIMS is live</b><small>${up} of ${plural(L.length, "product")} uploaded</small></div></div>
  <button class="et-key" data-a="prl_etup"><span class="et-ic et-up">${I("dl")}</span><span class="et-t"><b>Upload to eTIMS</b><small class="et-scope">${scope}</small></span></button>
  <button class="et-key" data-a="prl_etadj"><span class="et-ic">${I("box")}</span><span class="et-t"><b>Adjust eTIMS Stock</b><small class="et-scope">${scope}</small></span></button></section>`;
}
function prEtScope() {
  const n = prEt.sel.size;
  document
    .querySelectorAll(".et-scope")
    .forEach(x => (x.textContent = n ? `${n} ticked` : "All products"));
  if ($("#etSendAll")) $("#etSendAll").textContent = prEtSendWord();
}
async function prEtUpload(b) {
  const pool = prEtPool(),
    todo = pool.filter(i => !prEtDone(i));
  if (!todo.length) return toast("These products are already uploaded.");
  prEtSend(todo, b);
}
/** The YES / NO button on a row: this one product, to the eTIMS cloud. */
function prEtOne(id, b) {
  const i = ITEMS.find(x => x.id === id);
  if (!i) return;
  prEtSend([i], b);
}
async function prEtSend(todo, b) {
  b.disabled = true;
  toast("Sending to eTIMS...");
  const r = await prEtCall("items", {
    items: todo.map(i => ({
      ref: String(i.id),
      name: i.n,
      taxCode: i.t,
      price: i.p,
      category: i.c,
      sellingPoint: i.d,
      trackStock: !prNoStock(i)
    }))
  });
  b.disabled = false;
  if (!r.ok) return toast(r.j.error || "The upload didn't work.");
  let done = 0,
    why = "";
  (r.j.results || []).forEach(x => {
    const i = ITEMS.find(y => String(y.id) === x.ref);
    if (!i) return;
    if (x.etimsId) {
      // The provider's server assigns both of these.
      Object.assign(i, {
        etUp: true,
        etCode: x.etimsCode || "",
        etId: x.etimsId,
        etTest: !!x.test
      });
      done++;
    } else why = why || `${i.n}: ${x.error || "not accepted"}`;
  });
  auditAdd("eTIMS", `${plural(done, "product")} uploaded to eTIMS`);
  prEt.sel.clear();
  bosave();
  const test = !prEt.live && done ? " Test mode: nothing went to KRA." : "";
  toast(`${plural(done, "product")} uploaded.${test}${why ? ` ${why}` : ""}`);
  all();
}
function prEtAdjOpen() {
  const L = prEtPool().filter(i => prEtDone(i) && !prNoStock(i));
  if (!L.length) return toast("Upload products that keep stock first.");
  prEt.adj = { ids: L.map(i => i.id) };
  all();
}
function prEtAdjModal() {
  if (!prEt.adj) return "";
  const L = prEt.adj.ids.map(id => ITEMS.find(i => i.id === id)).filter(Boolean);
  return `<div class="modal show" id="etAdj" style="z-index:63"><div class="box itm"><header class="itm-h"><div><h3>Adjust eTIMS stock</h3><p>The quantity eTIMS should hold for each product.</p></div><button class="itm-x" data-a="prl_etadjno" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><div class="itm-g"><label>Reason<select id="etReason">${["Stock take", "Opening stock", "Damaged or expired", "Correction"].map(x => `<option>${x}</option>`).join("")}</select></label></div>
  <div class="tw"><table class="t"><thead><tr><th>Product</th><th>eTIMS ID</th><th class="n">On hand</th><th class="n">Set to</th></tr></thead><tbody>${L.map(i => `<tr><td><b>${esc(i.n)}</b><small class="pr-code">${esc(i.d)}</small></td><td>${esc(i.etId)}</td><td class="n">${qn(avail(i))}</td><td class="n"><input class="pr-price" type="number" min="0" step="any" data-etq="${i.id}" value="${avail(i)}" aria-label="Quantity for ${esc(i.n)}"></td></tr>`).join("")}</tbody></table></div></section></div>
  <footer class="itm-f"><button class="mini" data-a="prl_etadjno">Cancel</button><button class="chip on" data-a="prl_etadjgo">Send to eTIMS</button></footer></div></div>`;
}
async function prEtAdjSend(b) {
  const rows = [...document.querySelectorAll("#etAdj [data-etq]")].map(x => ({
      i: ITEMS.find(y => y.id === +x.dataset.etq),
      q: parseFloat(x.value)
    })),
    reason = $("#etReason").value;
  if (rows.some(x => !(x.q >= 0))) return toast("Enter a quantity of 0 or more.");
  b.disabled = true;
  const r = await prEtCall("stock", {
    adjustments: rows.map(({ i, q }) => ({ ref: String(i.id), etimsId: i.etId, qty: q, reason }))
  });
  b.disabled = false;
  if (!r.ok) return toast(r.j.error || "The adjustment didn't work.");
  const bad = (r.j.results || []).filter(x => x.error);
  auditAdd(
    "eTIMS",
    `Stock adjusted on eTIMS for ${plural(rows.length - bad.length, "product")}: ${reason}`
  );
  prEt.adj = null;
  prEt.sel.clear();
  toast(
    bad.length
      ? `${plural(bad.length, "product")} not accepted: ${bad[0].error}`
      : "eTIMS stock adjusted."
  );
  all();
}
function productsHTML() {
  if (!prEt.loaded) prEtLoad();
  const P = prPoints();
  if (prPoint !== "All" && !P.includes(prPoint)) prPoint = "All";
  const L = ITEMS.filter(i => i.sell !== "acc" || !prNoStock(i)),
    shown = L.filter(i => prPoint === "All" || i.d === prPoint).sort(
      (a, b) => a.d.localeCompare(b.d) || a.c.localeCompare(b.c) || a.n.localeCompare(b.n)
    ),
    out = L.filter(i => !prNoStock(i) && avail(i) <= 0).length,
    tile = (ic, l, v, s) =>
      `<div class="ph-t"><span class="ph-i">${I(ic)}</span><span class="ph-l">${l}</span><b>${v}</b><small>${s}</small></div>`,
    up = L.filter(prEtDone).length,
    pill = (k, l, n) =>
      `<button class="pr-pill ${k === prPoint ? "on" : ""}" data-a="prl_point" data-k="${esc(k)}">${esc(l)} <i>${n}</i></button>`;
  return `<div id="spPage" class="pr-page ph"><div class="ph-h pr-top"><div><h1>Products List</h1><p>Everything on sale at your selling points. Press Edit on a product for its tax, buying price and options.</p></div><span class="pr-acts"><button class="mini" data-a="prl_imp">Import</button><button class="mini" data-a="pur_go" data-l="${esc(STKT.loc)}" data-t="receive">Receive into a store</button><button class="chip on" data-a="prl_add">Add item</button></span></div>
  <div class="ph-ts">${tile("box", "Products", L.length, `${new Set(L.map(i => i.c)).size} categories`)}${tile("home", "Selling points", P.length, "Selling these products")}${tile("alert", "Out of stock", out, out ? "Need stock issued" : "All can sell")}${tile("shield", "On eTIMS", `${up} of ${L.length}`, prEt.live ? "Uploaded" : "Test mode")}</div>${prEt.live ? prEtBar(L) : ""}
  <div class="pn tw" data-findscope><div class="pr-bar">${findBox("prod", "Search product, category or code")}<div class="pr-pills">${pill("All", "All selling points", L.length)}${P.map(p => pill(p, p, L.filter(i => i.d === p).length)).join("")}</div></div>
  ${
    shown.length
      ? `<div class="tw"><table class="t pr-t"><thead><tr><th></th><th>Code</th><th>Product</th><th>Selling point</th><th>Category</th><th>Selling price</th><th>Track Stock</th><th>eTIMS Uploaded</th><th>eTIMS Code</th><th>eTIMS ID</th><th></th></tr></thead>${shown.map(prRow).join("")}</table></div><div class="pr-foot"><button class="mini" data-a="prl_usestock" title="Give the ticked products, or all shown, a stock item">Use in stock</button><button class="mini" data-a="prl_stk">Print stickers</button><label class="pr-selall"><input type="checkbox" data-a="prl_etall"> Select All</label><button class="chip on" id="etSendAll" data-a="prl_etup">${prEtSendWord()}</button></div>`
      : '<div class="empty">Nothing here yet. Use Add item to put the first product on the POS.</div>'
  }</div></div>${prAddModal()}${prEditModal()}${prEtAdjModal()}${prImportModal()}${stkModal()}${itemPopupIfOpen()}${speModal()}`;
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
  const F = prEdit,
    gets = prGetStock(ITEMS.find(x => x.id === F.id));
  return `<div class="modal show" id="prEd" style="z-index:62"><div class="box itm">
  <header class="itm-h"><div><h3>Edit ${esc(F.was)}</h3><p>Sold at ${esc(F.d)} · no stock kept</p></div><button class="itm-x" data-a="prl_eclose" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><div class="itm-g itm-g3"><label>Name on the POS<input id="preN" maxlength="60" value="${esc(F.n)}"></label><label>Category<input id="preC" list="prodCatL" value="${esc(F.c)}"></label><label>Selling price (KES)<input id="preP" type="number" min="0" step="any" value="${esc(F.p)}"></label><label>Buying price (KES)<input id="preB" type="number" min="0" step="any" value="${esc(F.buy)}"></label><label>Tax<select id="preT">${taxChoices()
    .map(([v, l]) => `<option value="${v}" ${v === F.t ? "selected" : ""}>${l}</option>`)
    .join(
      ""
    )}</select></label></div></section>${prEditExtras(F.id)}${gets ? `<section class="itm-s"><h4>Recipe or production</h4><div class="itm-hint">No stock is deducted when this sells. Give it a recipe to deduct ingredients, or make it under production to deduct finished items.</div>${gets}</section>` : ""}</div>
  <footer class="itm-f"><button class="mini" data-a="prl_eclose">Cancel</button><button class="chip on" data-a="prl_esave">Save changes</button></footer></div></div>`;
}
/** Modifiers and the rest, shown when editing rather than on every line of the list. */
function prEditExtras(id) {
  const i = ITEMS.find(x => x.id === id);
  return `<section class="itm-s"><h4>Can sell</h4><div class="mod-cell">${prCanSell(i)}</div></section><section class="itm-s"><h4>Modifiers</h4><div class="mod-cell">${modCell(i)}</div></section><section class="itm-s"><h4>Accompaniments</h4><div class="mod-cell">${accCell(i)}</div></section><section class="itm-s"><h4>Stock conversion</h4><div class="mod-cell">${cvCell(i)}</div></section>${prPromoSection(i)}`;
}
/** The deals this product is part of, with the way to add one. */
function prPromoSection(i) {
  const promos = pmSaved().filter(r => r.buy === i.id || r.free === i.id),
    happy = hhSaved().filter(r => r.item == i.id || (!r.item && r.cat === i.c)),
    rows = [
      ...promos.map(r => `<li><b>${esc(r.name)}</b> ${pmDeal(r)} ${pmState(r)}</li>`),
      ...happy.map(r => `<li><b>Happy hour</b> ${hhDeal(r)} ${hhState(r)}</li>`)
    ];
  return `<section class="itm-s"><h4>Promotions</h4>${rows.length ? `<ul class="pr-deals">${rows.join("")}</ul>` : '<div class="itm-hint">No promotions on this product.</div>'}<div class="pr-gets"><button class="mini" data-a="prl_promo" data-id="${i.id}">Add promotion</button></div></section>`;
}
/** Leave the product and open a new promotion with it already chosen. */
function prPromoStart(id) {
  const i = ITEMS.find(x => x.id === id);
  if (!i) return;
  invF.spe = null;
  prEdit = null;
  pmE = {
    id: 0,
    on: true,
    name: "",
    pt: i.d,
    buy: String(id),
    n: "2",
    same: "same",
    free: "",
    m: "1",
    from: bizDate(),
    to: bizDate()
  };
  spSel = null;
  spView = "promo";
  go("Selling points");
}
function prEditOpen(id) {
  const i = ITEMS.find(x => x.id === id);
  if (!i) return;
  if (!prNoStock(i)) return speOpen(id);
  prEdit = {
    id,
    was: i.n,
    d: i.d,
    n: i.n,
    c: i.c,
    p: String(i.p),
    t: i.t,
    buy: i.buy === undefined ? "" : String(i.buy)
  };
  all();
}
function prEditSave() {
  const i = ITEMS.find(x => x.id === prEdit.id),
    n = $("#preN").value.trim(),
    p = parseFloat($("#preP").value),
    b = $("#preB").value.trim();
  if (!n) return toast("Enter the product's name.");
  if (b !== "" && !(parseFloat(b) >= 0)) return toast("Enter a buying price of 0 or more.");
  if (!(p > 0)) return toast("Enter the selling price.");
  if (ITEMS.some(x => x !== i && x.d === i.d && x.n.toLowerCase() === n.toLowerCase()))
    return toast(`${i.d} already sells ${n}.`);
  Object.assign(i, {
    n,
    c: $("#preC").value.trim() || i.c,
    p,
    t: $("#preT").value,
    buy: b === "" ? undefined : parseFloat(b)
  });
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
  if (a.slice(0, 7) === "prl_imp") return priAct(a, b);
  if (a.slice(0, 7) === "prl_stk") return stkAct(a);
  if (!boCan("prod.manage")) return boDenied();
  if (a === "prl_add") {
    invF.it.open = false;
    prE = { way: d.m || "stock", pts: [], k: "", q: "1", n: "", c: "", p: "", t: "B" };
    return view === "prod" ? all() : go("Products List");
  }
  if (a === "prl_etsel") {
    if (b.checked) prEt.sel.add(+d.id);
    else prEt.sel.delete(+d.id);
    return prEtScope();
  }
  if (a === "prl_etall") {
    document.querySelectorAll("[data-a=prl_etsel]").forEach(x => {
      if (x.closest("tr").hidden) return;
      x.checked = b.checked;
      if (b.checked) prEt.sel.add(+x.dataset.id);
      else prEt.sel.delete(+x.dataset.id);
    });
    return prEtScope();
  }
  if (a === "prl_usestock") {
    const todo = prEtPool().filter(i => prNoStock(i) && i.sell !== "acc");
    if (!todo.length) return toast("These products already keep stock.");
    return tapConfirm(
      b,
      () => {
        todo.forEach(prMakeStock);
        auditAdd("Product", `${plural(todo.length, "product")} now kept in stock`, {
          mod: "Products"
        });
        spRefreshPos();
        bosave();
        toast(
          `${plural(todo.length, "product")} now in stock. Receive them into a store, then issue to the selling point.`
        );
        all();
      },
      `Tap again: ${todo.length} into stock`
    );
  }
  if (a === "prl_promo") return prPromoStart(+d.id);
  if (a === "prl_etone") return prEtOne(+d.id, b);
  if (a === "prl_etup") return prEtUpload(b);
  if (a === "prl_etadj") return prEtAdjOpen();
  if (a === "prl_etadjgo") return prEtAdjSend(b);
  if (a === "prl_etadjno") {
    prEt.adj = null;
    return all();
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

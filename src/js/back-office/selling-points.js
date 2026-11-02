// ---- selling points: bars, restaurants and kitchens that sell on the POS ----
// A selling point gets stock from a store (requisition / issue) and sells products made from that stock.
// Creating one, or adding a product to one, shows on the POS straight away.
const SP_TYPES = ["Bar", "Restaurant", "Kitchen", "Cafe", "Room service", MATERIALS, "Other"];
let spSel = null;
invF.spf = { name: "", type: "Bar", store: STORES[0] };
invF.spp = { k: "", q: "1", name: "", cat: "", price: "", tax: "B" };
invF.spr = { store: "", note: "", lines: [] };
invF.sptr = { to: "", note: "", lines: [] };

const spInfo = o => OUTLET_INFO[o] || { type: "Other", store: STORES[0] };
const spCanSell = i =>
  Math.min(...Object.entries(i.r).map(([k, v]) => Math.floor(have(i.from || i.d, k) / v + 1e-9)));
const spCost = i => Object.entries(i.r).reduce((a, [k, v]) => a + cst(k) * v, 0);

// ---- a new stock item created from a selling point (Manage → + New item) ----
// The item goes into the Stock Master like any other. The popup can also put it on this selling point's
// POS and get stock for it: request it from the store, or have the store receive it first.
/** The selling point the item popup was opened from ("" when opened elsewhere). */
const itemSpPoint = F => (F.sp && view === "outlets" && ALLD.includes(F.sp) ? F.sp : "");
const IT_SP_WAYS = [
  ["req", "Request from store", "The store has it. Sends a requisition."],
  ["recv", "Store receives first", "Opens Receive goods, then a requisition waits."],
  ["none", "Not now", "Only create it."]
];
/** Attached to production or a recipe: a product only, nothing new in the Stock Master. */
const itemSpNewProd = F => !F.edit && !!itemSpPoint(F) && F.spSrc === "prod" && F.srcPk === "new";
const itemSpLink = F => !F.edit && !!itemSpPoint(F) && F.spSrc !== "store" && !itemSpNewProd(F);
/** What the product would deduct: { r, from } or an error message. */
function itSrcResult(F) {
  const per = parseFloat(F.srcPer);
  if (F.spSrc === "prod") {
    const [k, at] = F.srcPk.split("|");
    if (!k || !at) return "Choose the finished item.";
    if (!(per > 0)) return "Enter how much one sale uses.";
    return { r: { [k]: per }, from: at };
  }
  if (!F.lines.length) return "Add at least one ingredient.";
  if (!isMaterials(F.srcFrom)) return "Choose where the ingredients come from.";
  return { r: Object.fromEntries(F.lines.map(x => [x.k, x.q])), from: F.srcFrom };
}
function itSrcHint(F) {
  if (!itemSpLink(F)) return "";
  const res = itSrcResult(F),
    price = parseFloat(F.spPrice);
  if (typeof res === "string") return "";
  const c = Object.entries(res.r).reduce((a, [k, q]) => a + q * cst(k), 0),
    can = Math.max(
      0,
      Math.min(...Object.entries(res.r).map(([k, q]) => Math.floor(have(res.from, k) / q + 1e-9)))
    );
  return (
    `Cost KES ${m2(c)} per sale` +
    (price > 0 ? ` · margin ${Math.round(((price - c) / price) * 100)}%` : "") +
    ` · ${res.from} can sell ${can}`
  );
}
/** Choices that change what the popup shows. */
function itSrcSync(f) {
  const F = invF.it;
  if (f === "srcCopy") {
    const r = ITEMS.find(i => String(i.id) === F.srcCopy);
    if (r) {
      F.lines = Object.entries(r.r).map(([k, q]) => ({ k, q }));
      F.srcFrom = r.from || r.d;
    }
    return itRedraw();
  }
  if (f === "srcPk" || f === "srcFrom") itRedraw();
}
/** "New product for …": the same layout as editing a product. Store stock (a finished product that is
 *  bought) is the default and keeps its buying and stock fields. */
function itemSpNewPopup(F) {
  const sp = F.sp,
    store = F.spSrc === "store",
    cats = [...new Set(ITEMS.filter(i => i.d === sp).map(i => i.c))],
    ways = [
      ["store", "Store stock", "Issued from a store to here"],
      ["prod", "Production", "Deducts from production balances"],
      ["recipe", "Recipe", "Deducts from Kitchen Materials"]
    ];
  let source = "";
  if (F.spSrc === "prod") {
    const pairs = balPairs("pbal");
    if (F.srcPk !== "new" && !pairs.some(p => p.k + "|" + p.loc === F.srcPk))
      F.srcPk = pairs[0] ? pairs[0].k + "|" + pairs[0].loc : "new";
    source = `<div class="itm-g itm-gn">
     <label>Finished item<select data-iv="it.srcPk">${pairs.map(p => `<option value="${esc(p.k + "|" + p.loc)}" ${p.k + "|" + p.loc === F.srcPk ? "selected" : ""}>${esc(itemInfo(p.k).name)} · ${esc(p.loc)} · ${qtyAt(p.loc, p.k)}</option>`).join("")}<option value="new" ${F.srcPk === "new" ? "selected" : ""}>New finished item, make it now</option></select></label>
     ${
       F.srcPk === "new"
         ? `<label>Unit of measure<input data-iv="it.uom" list="uomL" value="${esc(F.uom)}" placeholder="pcs, kg, ml"></label>`
         : `<label>One sale uses<input data-iv="it.srcPer" type="number" min="0" step="any" value="${esc(F.srcPer)}"></label>`
     }
    </div>${F.srcPk === "new" ? '<div class="itm-hint">Next you add the materials and run the production.</div>' : ""}`;
  } else if (F.spSrc === "recipe") {
    F.srcFrom = pick(F.srcFrom, materialStores());
    source = `<div class="itm-g itm-gn">
     <label>Copy ingredients from<select data-iv="it.srcCopy"><option value="">Start new</option>${recipeList()
       .map(
         r =>
           `<option value="${r.id}" ${String(r.id) === F.srcCopy ? "selected" : ""}>${esc(r.n)} · ${esc(r.d)}</option>`
       )
       .join("")}</select></label>
     ${recipeFromField("it.srcFrom", F.srcFrom)}
    </div>
    <div class="spe-lines">${recipeLineEditor("it", F.srcFrom)}</div>
    ${
      F.lines.length
        ? `<div class="tw"><table class="t"><tr><th>Ingredient</th><th class="n">Per portion</th><th class="n">In stores</th><th class="n">In ${esc(F.srcFrom)}</th><th></th></tr>${F.lines.map((x, j) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qn(x.q)} ${esc(itemInfo(x.k).uom)}</td>${recipeStockCells(x, F.srcFrom)}<td><button class="mini" data-a="rec_ldel" data-f="it" data-i="${j}">✕</button></td></tr>`).join("")}</table></div>`
        : ""
    }`;
  }
  return `<div class="modal show" id="itModal" style="z-index:60"><div class="box itm">
  <header class="itm-h"><div><h3>New product for ${esc(sp)}</h3><p>Sold at ${esc(sp)}</p></div><button class="itm-x" data-a="inv_itcancel" aria-label="Close">✕</button></header>
  <div class="itm-b" id="itBody">
   <section class="itm-s"><h4>Product</h4>
    <div class="itm-g itm-g4">
     <label>Product name<input data-iv="it.name" id="itName" value="${esc(F.name)}" placeholder="e.g. Chapati"></label>
     <label>Selling price (KES)<input data-iv="it.spPrice" type="number" min="0" step="any" value="${esc(F.spPrice)}" placeholder="${itemSpLink(F) ? "Needed" : "Empty = stock only"}"></label>
     <label>Category<input data-iv="it.spCat" list="prodCatL" value="${esc(F.spCat)}" placeholder="${esc(spInfo(sp).type)}"></label>
     <label>Tax<select data-iv="it.spTax">${taxChoices()
       .map(([v, l]) => `<option value="${v}" ${v === F.spTax ? "selected" : ""}>${l}</option>`)
       .join("")}</select></label>
    </div>
    <div class="itm-hint" id="itDup"></div>
   </section>
   <section class="itm-s"><h4>Each sale deducts from</h4>
    <div class="grn-modes it-ways">${ways.map(([w, l, s]) => `<button class="grn-mode ${F.spSrc === w ? "on" : ""}" data-a="inv_itsrc" data-w="${w}"><b>${l}</b><span>${s}</span></button>`).join("")}</div>
    ${source}
    <div class="itm-hint" id="itSrcInfo"></div>
   </section>
   ${
     store
       ? `<section class="itm-s"><h4>Item details</h4>
    <div class="itm-g itm-g3">
     <label>Item code<input data-iv="it.code" value="${esc(F.code)}" placeholder="${nextItemCode()}"></label>
     <label>Item group<input data-iv="it.group" list="grpL" value="${esc(F.group)}" placeholder="e.g. Beverages"></label>
     <label>Reorder level<input data-iv="it.reorder" type="number" min="0" step="any" value="${esc(F.reorder)}" placeholder="Optional"></label>
    </div>
   </section>
   <section class="itm-s"><h4>Units and cost</h4>
    <div class="itm-g itm-g4">
     <label>Unit of measure<input data-iv="it.uom" list="uomL" value="${esc(F.uom)}" placeholder="pcs, kg, ml"></label>
     <label>Buying unit<input data-iv="it.buyUnit" list="buyL" value="${esc(F.buyUnit)}" placeholder="e.g. Crate"></label>
     <label>Units per buying unit<input data-iv="it.perBuy" type="number" min="0" step="any" value="${esc(F.perBuy)}" placeholder="e.g. 24"></label>
     <label>Buying price (KES)<input data-iv="it.buyPrice" type="number" min="0" step="any" value="${esc(F.buyPrice)}" placeholder="Optional"></label>
    </div>
    <div class="itm-hint">Cost per unit: <b id="itCost"></b></div>
    <div class="itm-hint" id="itMargin"></div>
   </section>
   ${itemSpStock(F)}`
       : ""
   }
  </div>
  <footer class="itm-f"><button class="mini" data-a="inv_itcancel">Cancel</button><button class="chip on" id="itSave" data-a="inv_itsave">${itemSpNewProd(F) ? "Continue to production" : "Save product"}</button></footer>
 </div></div>`;
}
/** Getting stock for a bought product. */
function itemSpStock(F) {
  const sp = F.sp;
  F.store = pick(F.store, STORES);
  return `<section class="itm-s"><h4>Stock for ${esc(sp)}</h4>
    <div class="grn-modes it-ways">${IT_SP_WAYS.map(
      ([w, l, s]) =>
        `<button class="grn-mode ${F.spWay === w ? "on" : ""}" data-a="inv_itway" data-w="${w}"><b>${l}</b><span>${s}</span></button>`
    ).join("")}</div>
    ${
      F.spWay === "none"
        ? ""
        : `<div class="itm-g itm-g3">
     <label>${F.spWay === "req" ? "Request from store" : "Store receiving it"}<select data-iv="it.store">${opts(STORES, F.store)}</select></label>
     <label>Quantity (buying units)<input data-iv="it.qty" type="number" min="0" step="any" value="${esc(F.qty)}" placeholder="${F.spWay === "req" ? "Needed" : "Optional"}"></label>
     <div class="itm-eq" id="itEq"></div>
    </div>`
    }
   </section>`;
}
/** Save a product attached to production or a recipe. */
function itemSpLinkSave(F) {
  const sp = F.sp,
    name = F.name.trim(),
    price = parseFloat(F.spPrice),
    res = itSrcResult(F);
  if (!name) return toast("Enter the product name.");
  if (!(price > 0)) return toast("Enter the selling price.");
  if (typeof res === "string") return toast(res);
  if (ITEMS.some(i => i.d === sp && i.n.toLowerCase() === name.toLowerCase()))
    return toast(sp + " already sells a product called " + name + ".");
  const item = {
    id: Math.max(0, ...ITEMS.map(i => i.id)) + 1,
    n: name,
    d: sp,
    c: F.spCat.trim() || spInfo(sp).type,
    p: price,
    t: F.spTax,
    r: res.r
  };
  // A recipe always names its source; a finished item only when it is held somewhere else.
  if (F.spSrc === "recipe" || res.from !== sp) item.from = res.from;
  ITEMS.push(item);
  invF.it = blankItemForm(F.store);
  spRefreshPos();
  bosave();
  toast(
    `${name} is on the ${sp} POS at KES ${m2(price)}. Each sale deducts from ${res.from}.` +
      (F.spSrc === "recipe" ? recipeShort(res.r, res.from) : "")
  );
  all();
}
/** After saving an item from a selling point: product on the POS, then requisition / receive. */
function itemSpDone(k, sp, F, units, price, msg) {
  if (price > 0) {
    ITEMS.push({
      id: Math.max(0, ...ITEMS.map(i => i.id)) + 1,
      n: itemInfo(k).name,
      d: sp,
      c: F.spCat.trim() || spInfo(sp).type,
      p: price,
      t: F.spTax,
      r: { [k]: 1 }
    });
    spRefreshPos();
    msg += ` On the ${sp} POS at KES ${m2(price)}.`;
  }
  invF.spp.k = k; // ready in "Add a product" for other recipes
  invF.spr.store = F.store;
  const want = F.spWay !== "none" && units > 0;
  if (want) {
    const r = makeRequisition(sp, F.store, "New item " + itemInfo(k).name, [{ k, q: units }]);
    msg += ` Requisition ${r.id} sent to ${F.store} for approval.`;
  }
  bosave();
  if (F.spWay === "recv") {
    // The store receives it on a GRN (direct receive), then issues the requisition.
    const R = invF.rc;
    if (R.mode !== "direct")
      Object.assign(R, { mode: "direct", lines: [], lpo: null, lpoPick: "", sup: "" });
    STKT.loc = F.store;
    rcPick(k, false);
    R.eQty = want ? String(units / itemInfo(k).perBuy) : "";
    if (want && R.eUnits !== "buy") R.eQty = String(units);
    purT = "receive";
    toast(msg + ` Receive it into ${F.store} now.`);
    return go("Purchasing");
  }
  toast(msg);
  all();
}
/** The POS shows the new selling points / products without signing out. */
function spRefreshPos() {
  if (user) {
    DEPTS = user.d.filter(posSells);
    if (!DEPTS.length) DEPTS = [ALLD.filter(posSells)[0] || ALLD[0]];
    if (dept !== ALLP && !DEPTS.includes(dept)) dept = DEPTS[0];
    if (dept === ALLP && DEPTS.length < 2) dept = DEPTS[0];
  }
  try {
    drawDepts();
    renderCats();
    drawGrid();
  } catch (e) {}
}

function outletsView() {
  const F = invF.spf,
    t0 = d0();
  F.store = pick(F.store, STORES);
  const rows = ALLD.map(o => {
    const info = spInfo(o),
      sales = SALES.filter(s => s.dept === o && s.at >= t0).reduce((a, s) => a + s.g, 0);
    return `<tr class="${o === spSel ? "on" : ""}"><td><b>${esc(o)}</b></td><td>${esc(info.type)}</td><td>${esc(info.store)}</td><td class="n">${ITEMS.filter(i => i.d === o).length}</td><td class="n">${Object.keys(ING).filter(k => have(o, k) > 0).length}</td><td class="n">${m2(sales)}</td><td class="n">${USERS.filter(u => u.d.includes(o)).length}</td><td><div class="fr" style="flex-wrap:nowrap"><button class="mini" data-a="sp_open" data-o="${esc(o)}">Manage</button><button class="mini" data-a="sp_delask" data-o="${esc(o)}">Delete</button></div></td></tr>`;
  }).join("");
  return `<div class="pn"><h4>Create a selling point</h4><div class="fr"><label>Name<input data-iv="spf.name" value="${esc(F.name)}" placeholder="e.g. Pool Bar, Main Restaurant"></label><label>Type<select data-iv="spf.type">${opts(SP_TYPES, F.type)}</select></label><label>Gets stock from<select data-iv="spf.store">${opts(STORES, F.store)}</select></label><button class="chip on" data-a="sp_add">Create selling point</button></div><div class="stk">A new selling point shows on the POS straight away. Managers can sell there; choose other staff under Manage.</div></div>
 <div class="pn tw"><h4>Selling points (${ALLD.length})</h4><table class="t"><tr><th>Selling point</th><th>Type</th><th>Gets stock from</th><th class="n">Products</th><th class="n">Items in stock</th><th class="n">Sales today (KES)</th><th class="n">Staff</th><th></th></tr>${rows}</table></div>
 ${categoriesHTML()}
 ${spSel && ALLD.includes(spSel) ? spDetail(spSel) : ""}${itemPopupIfOpen()}${stModalIfOpen()}${apModalIfOpen()}${spDeleteModal()}${speModal()}`;
}

function spDetail(o) {
  const info = spInfo(o),
    P = invF.spp,
    keys = Object.keys(ING).sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name)),
    prods = ITEMS.filter(i => i.d === o),
    held = keys.filter(k => Math.abs(have(o, k)) > 1e-9);
  if (!P.k || ING[P.k] === undefined) P.k = keys[0] || "";
  const mat = isMaterials(o), // a materials store holds stock only: nothing is sold there
    made = i =>
      Object.entries(i.r)
        .map(([k, v]) => `${esc(itemInfo(k).name)} × ${qn(v)} ${esc(itemInfo(k).uom)}`)
        .join(", ");
  return `<div id="spDetail"><div class="pn"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">${esc(o)}</h4><div class="fr"><label>Type<select data-sp="type" data-o="${esc(o)}">${opts(SP_TYPES, info.type)}</select></label><label>Gets stock from<select data-sp="store" data-o="${esc(o)}">${opts(STORES, pick(info.store, STORES))}</select></label><button class="mini" data-a="sp_delask" data-o="${esc(o)}">Delete</button><button class="mini" data-a="sp_close">Close</button></div></div></div>

 ${
   mat
     ? `<div class="pn"><div class="stk">A materials store holds ingredients for the kitchen. Nothing is sold here; use them under Recipes &amp; Production.</div></div>`
     : ` <div class="pn"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Add a product to sell here</h4><span class="fr" style="flex:none;align-items:center;margin:0"><span class="stk">Not in the Stock Master yet?</span><button class="chip on" data-a="inv_itnew" data-sp="${esc(o)}">+ New item</button></span></div>
  <div class="fr"><label>Made from stock item<select data-iv="spp.k">${keys.map(k => `<option value="${k}" ${k === P.k ? "selected" : ""}>${esc(itemInfo(k).name)} (${esc(itemInfo(k).uom)})</option>`).join("")}</select></label>
   <label>Uses per sale<input data-iv="spp.q" type="number" min="0" step="any" value="${esc(P.q)}"></label>
   <label>Product name<input data-iv="spp.name" value="${esc(P.name)}" placeholder="Same as the stock item"></label>
   <label>Category<input data-iv="spp.cat" list="prodCatL" value="${esc(P.cat)}" placeholder="e.g. Beer, Mains"></label>
   <label>Selling price (KES)<input data-iv="spp.price" type="number" min="0" step="any" value="${esc(P.price)}"></label>
   <label>Tax<select data-iv="spp.tax">${taxChoices()
     .map(([v, l]) => `<option value="${v}" ${v === P.tax ? "selected" : ""}>${l}</option>`)
     .join("")}</select></label></div>
  <div class="stk" id="sppInfo"></div>
  <button class="chip on" data-a="sp_addprod">Add product</button></div>

 <div class="pn tw"><h4>Products sold here (${prods.length})</h4>${
   prods.length
     ? `<table class="t"><tr><th>Product</th><th>Category</th><th>VAT</th><th>Price (KES)</th><th>Deducts from</th><th>One sale uses</th><th class="n">Cost</th><th class="n">Margin</th><th class="n">Can sell</th><th></th></tr>${prods
         .map(i => {
           const c = spCost(i);
           return `<tr><td>${esc(i.n)}</td><td>${esc(i.c)}</td><td>${i.t}</td><td><input type="number" value="${i.p}" data-pr="${i.id}" style="max-width:100px"></td><td>${speSourceTag(i)}</td><td>${made(i)}</td><td class="n">${m2(c)}</td><td class="n">${i.p > 0 ? Math.round(((i.p - c) / i.p) * 100) + "%" : "-"}</td><td class="n">${Math.max(0, spCanSell(i))}</td><td><div class="fr" style="flex-wrap:nowrap"><button class="mini" data-a="sp_pedit" data-id="${i.id}">Edit</button><button class="mini" data-a="sp_delprod" data-id="${i.id}">Delete</button></div></td></tr>`;
         })
         .join("")}</table>`
     : '<div class="empty">No products yet. Add one above and it appears on this POS at once.</div>'
 }</div>

`
 }
 ${spRequestPanel(o, keys)}
 ${spRequisitions(o)}
 ${spTransferPanel(o)}
 ${spCountPanel(o, keys, held)}

 ${
   mat
     ? ""
     : ` <div class="pn"><h4>Staff who can sell here</h4><div class="fr">${USERS.map(
         (u, i) =>
           `<label style="margin-right:12px"><input type="checkbox" style="width:auto;min-width:0" data-sps="${i}" data-o="${esc(o)}" ${u.d.includes(o) ? "checked" : ""}> ${esc(u.n)} <span class="stk">(${esc(u.role || "")})</span></label>`
       ).join("")}</div></div>`
 }</div>`;
}

// ---- requesting stock (requisition): the selling point asks; the store issues it in Inventory ----
function spRequestPanel(o, keys) {
  const R = invF.spr;
  R.store = pick(R.store || spInfo(o).store, STORES);
  return `<div class="pn" id="spReq"><h4>Request stock from a store</h4>
  <div class="fr"><label>From store<select data-iv="spr.store">${opts(STORES, R.store)}</select></label><label>Note<input data-iv="spr.note" value="${esc(R.note)}" placeholder="e.g. Weekend stock"></label></div>
  <div class="fr" style="align-items:end"><label>Item<select id="spr_k" data-spunit>${keys.map(k => `<option value="${k}">${esc(itemInfo(k).name)} · ${esc(qtyBoth(k, have(R.store, k)))} in store</option>`).join("")}</select></label><label>Quantity<input id="spr_q" type="number" min="0" step="any"></label><label>Units${unitSel("spr_u", keys[0])}</label><button class="mini" data-a="sp_rqladd">Add line</button></div>
  ${
    R.lines.length
      ? `<div class="tw"><table class="t"><tr><th>Item</th><th class="n">Quantity</th><th class="n">In ${esc(R.store)}</th><th></th></tr>${R.lines.map((x, i) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qtyBoth(x.k, x.q)}</td><td class="n">${qtyBoth(x.k, have(R.store, x.k))}</td><td><button class="mini" data-a="sp_rqldel" data-i="${i}">✕</button></td></tr>`).join("")}</table></div>`
      : ""
  }
  <div class="fr" style="align-items:center"><button class="chip on" data-a="sp_rqmake">Send requisition</button><span class="stk">Bought it directly?</span><button class="mini" data-a="pur_rcsp" data-o="${esc(o)}">Receive goods here</button></div></div>`;
}
// ---- transfers between selling points only: stock leaves and arrives straight away ----
function spTransferPanel(o) {
  const F = invF.sptr,
    peers = ALLD.filter(x => x !== o),
    keys = Object.keys(ING)
      .filter(k => have(o, k) > 0)
      .sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name)),
    L = MOV.filter(m => m.t === "TRANS_OUT" && (m.loc === o || m.peer === o))
      .slice(-15)
      .reverse();
  F.to = pick(F.to, peers);
  const k0 = pick(F.pick, keys); // stays on the item just added
  return `<div class="pn" id="spTrf"><h4>Transfer stock to another selling point</h4>${
    !peers.length
      ? '<div class="stk">There is no other selling point to transfer to.</div>'
      : !keys.length
        ? `<div class="stk">${esc(o)} has no stock to transfer.</div>`
        : `<div class="fr"><label>From<input value="${esc(o)}" readonly></label><label>To<select data-iv="sptr.to">${opts(peers, F.to)}</select></label><label>Note<input data-iv="sptr.note" value="${esc(F.note)}" placeholder="Optional"></label></div>
  <div class="fr" style="align-items:end"><label>Item <select id="sptr_k" data-spunit="sptr_u" style="max-width:100%">${keys.map(k => `<option value="${k}" ${k === k0 ? "selected" : ""}>${esc(itemInfo(k).name)} · ${qn(have(o, k))} ${esc(itemInfo(k).uom)}</option>`).join("")}</select></label><label>Quantity<input id="sptr_q" type="number" min="0" step="any"></label><label>Units${unitSel("sptr_u", k0)}</label><button class="mini" data-a="sp_trladd">Add line</button></div>
  ${
    F.lines.length
      ? `<div class="tw"><table class="t"><tr><th>Item</th><th class="n">Quantity</th><th class="n">In ${esc(o)}</th><th></th></tr>${F.lines.map((x, i) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qtyBoth(x.k, x.q)}</td><td class="n">${qtyBoth(x.k, have(o, x.k))}</td><td><button class="mini" data-a="sp_trldel" data-i="${i}">✕</button></td></tr>`).join("")}</table></div>`
      : ""
  }
  <button class="chip on" data-a="sp_trpost">Transfer stock</button>`
  }
  ${
    L.length
      ? `<div class="tw"><table class="t"><tr><th>Date</th><th>Reference</th><th>From</th><th>To</th><th>Item</th><th class="n">Quantity</th><th>By</th></tr>${L.map(m => `<tr><td>${dt2(m.at)}</td><td>${esc(m.ref)}</td><td>${esc(m.loc)}</td><td>${esc(m.peer)}</td><td>${esc(itemInfo(m.k).name)}</td><td class="n">${qtyBoth(m.k, -m.q)}</td><td>${esc(m.by)}</td></tr>`).join("")}</table></div>`
      : ""
  }</div>`;
}
function spRequisitions(o) {
  const L = REQS.filter(r => r.dept === o)
    .slice()
    .reverse()
    .slice(0, 20);
  return `<div class="pn tw"><h4>Requisitions from ${esc(o)}</h4>${
    L.length
      ? `<table class="t"><tr><th>Date</th><th>Reference</th><th>From store</th><th>Items (issued / requested)</th><th>Status</th></tr>${L.map(
          r =>
            `<tr><td>${dt2(r.at)}</td><td>${r.id}</td><td>${esc(r.store || STORES[0])}</td><td>${r.lines.map(x => `${esc(itemInfo(x.k).name)} ${qn(x.issued)}/${qn(x.q)}`).join(", ")}</td><td><span class="tag ${r.status === "Issued" ? "ok" : r.status === "Rejected" ? "bad" : "warn"}">${r.status}</span>${apNote(r) ? `<div class="stk">${apNote(r)}</div>` : ""}<div class="fr" style="flex-wrap:nowrap">${apButtons("req", r)}</div></td></tr>`
        ).join(
          ""
        )}</table><div class="stk">A manager approves requisitions (Inventory → Approvals); the store then issues them in Inventory → Requisitions.</div>`
      : '<div class="empty">No requisitions yet.</div>'
  }</div>`;
}

// ---- stock take for this selling point only ----
let spCnt = { phys: {}, narr: {} };
function spCountPanel(o, keys, held) {
  // Items held here, or that have ever moved here (so a zero or negative balance can be counted too).
  const ks = keys.filter(k => held.includes(k) || MOV.some(m => m.loc === o && m.k === k));
  return `<div class="pn tw" id="spCount"><h4>Stock at ${esc(o)} · stock take</h4>${
    ks.length
      ? `<div class="stk">Enter what you physically count and post it. Only ${esc(o)}'s stock is adjusted.</div><table class="t"><tr><th>Item</th><th>Unit</th><th class="n">System</th><th class="n">Value (KES)</th><th>Physical count</th><th class="n">Variance</th><th>Narration</th></tr>${ks
          .map(k => {
            const p = spCnt.phys[k],
              has = p !== undefined && p !== "" && !isNaN(parseFloat(p)),
              v = has ? parseFloat(p) - have(o, k) : 0;
            return `<tr><td>${esc(itemInfo(k).name)}</td><td>${esc(itemInfo(k).uom)}</td><td class="n ${have(o, k) < 0 ? "neg" : ""}">${fq(have(o, k))}</td><td class="n">${m2(Math.max(0, have(o, k)) * cst(k))}</td><td><input type="number" min="0" step="any" data-spc="${k}" data-o="${esc(o)}" value="${has ? esc(p) : ""}" style="max-width:110px"></td><td class="n ${v < 0 ? "neg" : ""}" data-spv="${k}">${has ? fq(v) : ""}</td><td><input data-spn="${k}" value="${esc(spCnt.narr[k] || "")}" placeholder="Reason"></td></tr>`;
          })
          .join(
            ""
          )}</table><button class="chip on" data-a="sp_countrun" data-o="${esc(o)}">Post stock take</button>`
      : '<div class="empty">No stock here yet. Request stock from a store above.</div>'
  }</div>`;
}
/** Live variance while counting (no full redraw, so typing isn't interrupted). */
function spCountInput(t, s) {
  if (s.spn !== undefined) return void (spCnt.narr[s.spn] = t.value);
  const k = s.spc,
    v = t.value,
    cell = document.querySelector(`[data-spv="${k}"]`);
  spCnt.phys[k] = v;
  if (!cell) return;
  const has = v !== "" && !isNaN(parseFloat(v)),
    diff = has ? parseFloat(v) - have(s.o, k) : 0;
  cell.textContent = has ? fq(diff) : "";
  cell.classList.toggle("neg", has && diff < 0);
}
function spCountRun(o) {
  const ks = Object.keys(spCnt.phys).filter(
    k => spCnt.phys[k] !== "" && !isNaN(parseFloat(spCnt.phys[k]))
  );
  if (!ks.length) return toast("Enter at least one physical count.");
  if (ks.some(k => parseFloat(spCnt.phys[k]) < 0)) return toast("Counts cannot be below zero.");
  // Snapshot of every item on this selling point's sheet for the stock taking report (before adjusting).
  const last = COUNTS.filter(c => c.loc === o).pop(),
    from = last
      ? last.at
      : new Date(
          Math.min(Date.now(), ...MOV.filter(m => m.loc === o).map(m => m.at))
        ).toISOString(),
    A = stMovesAll(o, new Date(from).getTime()),
    sheet = Object.keys(ING).filter(
      k => Math.abs(have(o, k)) > 1e-9 || MOV.some(m => m.loc === o && m.k === k)
    ),
    rows = sheet.map(k => {
      const u = itemInfo(k),
        counted = ks.includes(k);
      return stSnapRow(
        {
          k,
          code: u.code || "",
          name: u.name,
          grp: u.group,
          cost: cst(k),
          div: 1,
          sys: have(o, k)
        },
        A,
        counted ? parseFloat(spCnt.phys[k]) : null,
        spCnt.narr[k]
      );
    });
  const id = nid("ST"),
    lines = ks.map(k => {
      const sys = have(o, k),
        phys = parseFloat(spCnt.phys[k]),
        v = phys - sys;
      if (Math.abs(v) > 1e-9) mv(o, k, v, "ADJUST", "Stock take " + id, "", id, boUser.n);
      return { k, name: iN(k), cost: cst(k), sys, phys, v, narr: spCnt.narr[k] || "" };
    });
  COUNTS.push({
    id,
    at: new Date().toISOString(),
    loc: o,
    kind: "raw",
    by: boUser.n,
    from,
    lines,
    rows
  });
  spCnt = { phys: {}, narr: {} };
  bosave();
  toast(
    `Stock take ${id} posted for ${o}: ${lines.length} counted, ${lines.filter(x => Math.abs(x.v) > 1e-9).length} with variances.`
  );
  stOpen(id); // show the stock taking report straight away
  all();
}

/** Live hint under "Add a product": the cost of one sale and the margin at the price typed. */
function spPreview() {
  const el = $("#sppInfo"),
    P = invF.spp;
  if (!el || !P.k) return;
  const q = parseFloat(P.q),
    p = parseFloat(P.price),
    u = itemInfo(P.k),
    c = q > 0 ? cst(P.k) * q : 0;
  el.textContent =
    q > 0
      ? `One sale uses ${qn(q)} ${u.uom} of ${u.name}: cost KES ${m2(c)}` +
        (p > 0 ? ` · margin ${Math.round(((p - c) / p) * 100)}%` : "")
      : "Enter how much stock one sale uses.";
}

function spAct(a, b) {
  const d = b.dataset;
  if (a === "delask") {
    spDel = d.o;
    return all();
  }
  if (a === "delno") {
    spDel = null;
    return all();
  }
  if (a === "delyes") return spDelete(spDel);
  if (a === "add") {
    const F = invF.spf,
      name = F.name.trim(),
      err = placeNameError(name);
    if (err) return toast(err);
    ALLD.push(name);
    OUTLET_INFO[name] = { type: F.type, store: pick(F.store, STORES) };
    syncLocs();
    USERS.forEach(u => {
      if (u.role === "Manager" && !u.d.includes(name) && posSells(name)) u.d.push(name);
    });
    refreshBRS();
    spRefreshPos();
    spSel = name;
    invF.spf = { name: "", type: F.type, store: F.store };
    invF.spp = { k: "", q: "1", name: "", cat: "", price: "", tax: "B" };
    bosave();
    toast(name + " created. It is on the POS now; add its products below.");
    all();
    const el = $("#spDetail");
    return el && el.scrollIntoView({ behavior: "smooth" });
  }
  if (a === "open") {
    spSel = d.o;
    invF.spp = { k: "", q: "1", name: "", cat: "", price: "", tax: "B" };
    invF.spr = { store: spInfo(d.o).store, note: "", lines: [] };
    invF.sptr = { to: "", note: "", lines: [] };
    spCnt = { phys: {}, narr: {} };
    all();
    setTimeout(spPreview);
    const el = $("#spDetail");
    return el && el.scrollIntoView({ behavior: "smooth" });
  }
  if (a === "close") {
    spSel = null;
    return all();
  }
  if (a === "addprod") {
    const o = spSel,
      P = invF.spp,
      q = parseFloat(P.q),
      price = parseFloat(P.price),
      name = P.name.trim() || (P.k ? itemInfo(P.k).name : "");
    if (!o || !ALLD.includes(o)) return toast("Choose a selling point.");
    if (!P.k) return toast("Create stock items in Inventory > Item setup first.");
    if (!(q > 0)) return toast("Enter how much stock one sale uses.");
    if (!(price > 0)) return toast("Enter the selling price.");
    if (ITEMS.some(i => i.d === o && i.n.toLowerCase() === name.toLowerCase()))
      return toast(o + " already sells " + name + ".");
    ITEMS.push({
      id: Math.max(0, ...ITEMS.map(i => i.id)) + 1,
      n: name,
      d: o,
      c: P.cat.trim() || spInfo(o).type,
      p: price,
      t: P.tax,
      r: { [P.k]: q }
    });
    invF.spp = { ...P, name: "", price: "" };
    spRefreshPos();
    bosave();
    toast(name + " is now on the " + o + " POS at KES " + m2(price) + ".");
    return all();
  }
  if (a === "delprod") {
    const id = +d.id,
      i = ITEMS.findIndex(x => x.id === id);
    if (i < 0) return;
    if (orders.some(x => x.lines[id]) || cart[id])
      return toast("This product is on an open bill. Settle it first.");
    return tapConfirm(
      b,
      () => {
        const n = ITEMS[i].n;
        ITEMS.splice(i, 1);
        spRefreshPos();
        bosave();
        toast(n + " deleted from " + spSel + ".");
        all();
      },
      "Delete?"
    );
  }
  if (a === "pedit") return speOpen(+d.id);
  if (a === "pno") {
    invF.spe = null;
    return all();
  }
  if (a === "pway") {
    invF.spe.way = d.w;
    return speRedraw();
  }
  if (a === "psave") return speSave();
  // ---- requisitions (the store issues them in Inventory)
  if (a === "rqladd") {
    const k = $("#spr_k").value,
      q = toUnits(k, parseFloat($("#spr_q").value), $("#spr_u").value); // crates → pcs

    if (!k) return toast("Create items in Inventory > Item setup first.");
    if (!(q > 0)) return toast("Enter the quantity needed.");
    const L = invF.spr.lines,
      ex = L.find(x => x.k === k);
    if (ex) ex.q += q;
    else L.push({ k, q });
    return all();
  }
  if (a === "rqldel") {
    invF.spr.lines.splice(+d.i, 1);
    return all();
  }
  if (a === "rqmake") {
    const R = invF.spr,
      o = spSel;
    if (!o || !ALLD.includes(o)) return toast("Choose a selling point.");
    if (!isStore(R.store)) return toast("Choose the store to ask.");
    if (!R.lines.length) return toast("Add at least one line.");
    const r = makeRequisition(o, R.store, R.note.trim(), R.lines);
    invF.spr = { store: R.store, note: "", lines: [] };
    toast(
      `Requisition ${r.id} sent to ${R.store}. A manager approves it, then the store issues it.`
    );
    return all();
  }
  // ---- transfers to another selling point
  if (a === "trladd") {
    const o = spSel,
      k = $("#sptr_k").value,
      q = toUnits(k, parseFloat($("#sptr_q").value), $("#sptr_u").value), // crates → pcs
      L = invF.sptr.lines,
      ex = L.find(x => x.k === k),
      want = q + (ex ? ex.q : 0);
    invF.sptr.pick = k;
    if (!(q > 0)) return toast("Enter the quantity to transfer.");
    if (want > have(o, k) + 1e-9)
      return toast("Only " + qtyBoth(k, have(o, k)) + " of " + itemInfo(k).name + " in " + o + ".");
    if (ex) ex.q = want;
    else L.push({ k, q });
    return all();
  }
  if (a === "trldel") {
    invF.sptr.lines.splice(+d.i, 1);
    return all();
  }
  if (a === "trpost") {
    const F = invF.sptr,
      o = spSel;
    if (!ALLD.includes(o) || F.to === o || !ALLD.includes(F.to))
      return toast("Choose the selling point to transfer to.");
    if (!F.lines.length) return toast("Add at least one line.");
    const bad = F.lines.find(x => x.q > have(o, x.k) + 1e-9);
    if (bad)
      return toast(
        "Only " + qtyBoth(bad.k, have(o, bad.k)) + " of " + itemInfo(bad.k).name + " in " + o + "."
      );
    const id = nid("TRF");
    F.lines.forEach(x => {
      mvc(o, x.k, -x.q, "TRANS_OUT", F.note || "Transfer " + id, F.to, id, boUser.n);
      mvc(F.to, x.k, x.q, "TRANS_IN", F.note || "Transfer " + id, o, id, boUser.n);
    });
    invF.sptr = { to: F.to, note: "", lines: [] };
    spRefreshPos();
    bosave();
    toast("Transferred from " + o + " to " + F.to + " (" + id + ").");
    return all();
  }
  // ---- stock take
  if (a === "countrun") return tapConfirm(b, () => spCountRun(d.o), "POST COUNT?");
}

// ---- editing a product: what it is called and costs, and where each sale deducts from ----
// store:  its own stock at the selling point, issued from a store (crates become pcs on the way).
// prod:   a finished item from production, at the place it was made for → Production balances.
// recipe: several ingredients from a materials store → Recipe balances.
invF.spe = null;
/** Finished items from production, wherever they are held. */
const speProdPairs = () => balPairs("pbal");
const speIsProd = i => {
  const K = Object.keys(i.r),
    at = i.from || i.d;
  return K.length === 1 && PRODS.some(x => x.k === K[0] && x.to === at);
};
const speWayOf = i =>
  speIsProd(i) ? "prod" : i.from || Object.keys(i.r).length > 1 ? "recipe" : "store";
/** "Production · Kitchen" for the products table. */
function speSourceTag(i) {
  const w = speWayOf(i),
    at = esc(i.from || i.d);
  return w === "prod"
    ? `<span class="tag ok">Production</span> ${at}`
    : w === "recipe"
      ? `<span class="tag warn">Recipe</span> ${at}`
      : `Store stock at ${at}`;
}
function speOpen(id) {
  const i = ITEMS.find(x => x.id === id);
  if (!i) return;
  const K = Object.keys(i.r),
    way = speWayOf(i);
  invF.spe = {
    id,
    name: i.n,
    cat: i.c,
    price: String(i.p),
    tax: i.t,
    way,
    k: K[0] || "",
    pk: way === "prod" ? K[0] + "|" + (i.from || i.d) : "",
    per: String(K.length ? i.r[K[0]] : 1),
    unit: "1",
    copy: "",
    from: i.from || "",
    lines: K.map(k => ({ k, q: i.r[k] }))
  };
  all();
}
/** Redraw the popup without losing the place in it. */
function speRedraw() {
  const y = $("#speBody") ? $("#speBody").scrollTop : 0;
  all();
  if ($("#speBody")) $("#speBody").scrollTop = y;
}
function speSync(f) {
  const F = invF.spe;
  if (f === "copy") {
    const r = ITEMS.find(i => String(i.id) === F.copy);
    if (r) {
      F.lines = Object.entries(r.r).map(([k, q]) => ({ k, q }));
      F.from = r.from || r.d;
    }
    return speRedraw();
  }
  if (f === "k") F.unit = "1";
  if (f === "k" || f === "pk" || f === "from" || f === "unit") return speRedraw();
  const el = $("#speInfo");
  if (el) el.textContent = speHint();
}
/** What the form would store: { r, from } or an error message. */
function speResult() {
  const F = invF.spe,
    per = parseFloat(F.per);
  if (F.way === "store") {
    if (!F.k || ING[F.k] === undefined) return "Choose the stock item.";
    if (!(per > 0)) return "Enter how much one sale uses.";
    return { r: { [F.k]: per * parseFloat(F.unit) }, from: "" };
  }
  if (F.way === "prod") {
    const [k, at] = F.pk.split("|");
    if (!k || !at) return "Choose the finished item.";
    if (!(per > 0)) return "Enter how much one sale uses.";
    return { r: { [k]: per }, from: at };
  }
  if (!F.lines.length) return "Add at least one ingredient.";
  if (!isMaterials(F.from)) return "Choose where the ingredients come from.";
  return { r: Object.fromEntries(F.lines.map(x => [x.k, x.q])), from: F.from };
}
function speHint() {
  const res = speResult(),
    price = parseFloat(invF.spe.price);
  if (typeof res === "string") return "";
  const at = res.from || ITEMS.find(x => x.id === invF.spe.id).d,
    c = Object.entries(res.r).reduce((a, [k, q]) => a + q * cst(k), 0),
    can = Math.max(
      0,
      Math.min(...Object.entries(res.r).map(([k, q]) => Math.floor(have(at, k) / q + 1e-9)))
    );
  return (
    `Cost KES ${m2(c)} per sale` +
    (price > 0 ? ` · margin ${Math.round(((price - c) / price) * 100)}%` : "") +
    ` · ${at} can sell ${can}`
  );
}
function speModal() {
  const F = invF.spe,
    i = F && ITEMS.find(x => x.id === F.id);
  if (!i) return "";
  const keys = itemsByName(),
    S = F.way === "store" ? keys : [],
    pairs = speProdPairs(),
    ways = [
      ["store", "Store stock", "Issued from a store to here"],
      ["prod", "Production", "Deducts from production balances"],
      ["recipe", "Recipe", "Deducts from Kitchen Materials"]
    ];
  if (F.way === "store" && !F.k) F.k = keys[0] || "";
  if (F.way === "prod" && !pairs.some(p => p.k + "|" + p.loc === F.pk))
    F.pk = pairs[0] ? pairs[0].k + "|" + pairs[0].loc : "";
  if (F.way === "recipe") F.from = pick(F.from, materialStores());
  const u = F.k ? itemInfo(F.k) : null,
    stores = u ? STORES.filter(l => have(l, F.k) > 0) : [];
  let source = "";
  if (F.way === "store")
    source = `<div class="itm-g itm-g3">
     <label>Stock item<select data-iv="spe.k">${S.map(k => `<option value="${k}" ${k === F.k ? "selected" : ""}>${esc(itemInfo(k).name)}</option>`).join("")}</select></label>
     <label>One sale uses<input data-iv="spe.per" type="number" min="0" step="any" value="${esc(F.per)}"></label>
     <label>Unit<select data-iv="spe.unit">${
       u
         ? prUnits(F.k)
             .map(
               ([n, x]) =>
                 `<option value="${x}" ${String(x) === F.unit ? "selected" : ""}>${esc(n)}</option>`
             )
             .join("")
         : ""
     }</select></label>
    </div>
    <div class="itm-hint">${
      u
        ? `Here: ${qtyBoth(F.k, have(i.d, F.k))}. ${stores.length ? stores.map(l => `${esc(l)}: ${qtyBoth(F.k, have(l, F.k))}`).join(" · ") + ". Send more with an issue or requisition; crates become " + esc(u.uom) + " on the way." : "No store holds it yet."}`
        : ""
    }</div>`;
  else if (F.way === "prod")
    source = pairs.length
      ? `<div class="itm-g itm-gn">
     <label>Finished item<select data-iv="spe.pk">${pairs.map(p => `<option value="${esc(p.k + "|" + p.loc)}" ${p.k + "|" + p.loc === F.pk ? "selected" : ""}>${esc(itemInfo(p.k).name)} · ${esc(p.loc)} · ${qtyAt(p.loc, p.k)}</option>`).join("")}</select></label>
     <label>One sale uses<input data-iv="spe.per" type="number" min="0" step="any" value="${esc(F.per)}"></label>
    </div>`
      : '<div class="itm-hint">No production yet. Run one under Recipes &amp; Production first.</div>';
  else
    source = `<div class="itm-g itm-gn">
     <label>Copy ingredients from<select data-iv="spe.copy"><option value="">Keep these ingredients</option>${recipeList()
       .filter(r => r.id !== i.id)
       .map(
         r =>
           `<option value="${r.id}" ${String(r.id) === F.copy ? "selected" : ""}>${esc(r.n)} · ${esc(r.d)}</option>`
       )
       .join("")}</select></label>
     ${recipeFromField("spe.from", F.from)}
    </div>
    <div class="spe-lines">${recipeLineEditor("spe", F.from)}</div>
    ${
      F.lines.length
        ? `<div class="tw"><table class="t"><tr><th>Ingredient</th><th class="n">Per portion</th><th class="n">In stores</th><th class="n">In ${esc(F.from)}</th><th></th></tr>${F.lines.map((x, j) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qn(x.q)} ${esc(itemInfo(x.k).uom)}</td>${recipeStockCells(x, F.from)}<td><button class="mini" data-a="rec_ldel" data-f="spe" data-i="${j}">✕</button></td></tr>`).join("")}</table></div>`
        : ""
    }`;
  return `<div class="modal show" id="speModal" style="z-index:62"><div class="box itm">
  <header class="itm-h"><div><h3>Edit ${esc(i.n)}</h3><p>Sold at ${esc(i.d)}</p></div><button class="itm-x" data-a="sp_pno" aria-label="Close">✕</button></header>
  <div class="itm-b" id="speBody">
   <section class="itm-s"><h4>Product</h4>
    <div class="itm-g itm-g4">
     <label>Product name<input data-iv="spe.name" value="${esc(F.name)}"></label>
     <label>Selling price (KES)<input data-iv="spe.price" type="number" min="0" step="any" value="${esc(F.price)}"></label>
     <label>Category<input data-iv="spe.cat" list="prodCatL" value="${esc(F.cat)}"></label>
     <label>Tax<select data-iv="spe.tax">${taxChoices()
       .map(([v, l]) => `<option value="${v}" ${v === F.tax ? "selected" : ""}>${l}</option>`)
       .join("")}</select></label>
    </div>
   </section>
   <section class="itm-s"><h4>Modifiers</h4><div class="mod-cell">${modCell(i)}</div></section>
   <section class="itm-s"><h4>Accompaniments</h4><div class="mod-cell">${accCell(i)}</div></section>
   <section class="itm-s"><h4>Each sale deducts from</h4>
    <div class="grn-modes it-ways">${ways.map(([w, l, s]) => `<button class="grn-mode ${F.way === w ? "on" : ""}" data-a="sp_pway" data-w="${w}"><b>${l}</b><span>${s}</span></button>`).join("")}</div>
    ${source}
    <div class="itm-hint" id="speInfo">${speHint()}</div>
   </section>
  </div>
  <footer class="itm-f"><button class="mini" data-a="sp_pno">Cancel</button><button class="chip on" data-a="sp_psave">Save changes</button></footer>
 </div></div>`;
}
function speSave() {
  const F = invF.spe,
    i = ITEMS.find(x => x.id === F.id),
    name = F.name.trim(),
    price = parseFloat(F.price),
    res = speResult();
  if (!name) return toast("Enter the product name.");
  if (!(price > 0)) return toast("Enter the selling price.");
  if (typeof res === "string") return toast(res);
  if (ITEMS.some(x => x.id !== i.id && x.d === i.d && x.n.toLowerCase() === name.toLowerCase()))
    return toast(i.d + " already sells a product called " + name + ".");
  const changed =
    JSON.stringify(res.r) !== JSON.stringify(i.r) || (res.from || "") !== (i.from || "");
  // Bills already sent used the old ingredients; a change now would put back the wrong stock on a return.
  if (changed && (orders.some(x => x.lines[i.id]) || cart[i.id]))
    return toast(i.n + " is on an open bill. Settle it before changing what it deducts from.");
  Object.assign(i, { n: name, p: price, c: F.cat.trim() || i.c, t: F.tax, r: res.r });
  if (res.from && res.from !== i.d) i.from = res.from;
  else if (F.way === "recipe" && res.from) i.from = res.from;
  else delete i.from;
  invF.spe = null;
  spRefreshPos();
  bosave();
  toast(
    `${name} saved. Each sale now deducts from ${i.from || i.d}.` +
      (F.way === "recipe" ? recipeShort(res.r, res.from) : "")
  );
  all();
}

// ---- deleting a selling point: refused while it holds anything that would be lost ----
let spDel = null; // the place the delete popup is open for
/** What stops the delete, and what the delete would change. */
function spDeleteCheck(o) {
  const stock = Object.keys(ING).filter(k => Math.abs(have(o, k)) > 1e-9),
    bills = orders.filter(x => billPoints(x.lines).includes(o)).length,
    reqs = REQS.filter(r => r.dept === o && (isOpenReq(r) || r.status === AWAIT)).length,
    notes = ISSUES.filter(x => x.status === AWAIT && (x.to === o || x.from === o)).length,
    recipes = ITEMS.filter(i => i.from === o && i.d !== o),
    block = [];
  if (posSells(o) && ALLD.filter(posSells).length < 2)
    block.push("It is the only selling point. The POS needs at least one.");
  if (isMaterials(o) && ALLD.filter(isMaterials).length < 2)
    block.push(
      "It is the only materials store. Recipes & Production needs one, so create another first."
    );
  if (stock.length)
    block.push(
      `It still holds ${stock.length} item(s), such as ${stock
        .slice(0, 3)
        .map(k => `${itemInfo(k).name} ${qn(have(o, k))} ${itemInfo(k).uom}`)
        .join(", ")}. Transfer them, or count them to zero in its stock take.`
    );
  if (bills) block.push(`It has ${bills} open bill(s). Settle them on the POS first.`);
  if (dept === o && Object.keys(cart).length) block.push("A sale is in progress on its POS.");
  if (reqs) block.push(`It has ${reqs} requisition(s) still open.`);
  if (notes) block.push(`${notes} issue note(s) for it are waiting for approval.`);
  if (recipes.length)
    block.push(
      `Recipes use it for their ingredients: ${recipes
        .slice(0, 3)
        .map(i => i.n)
        .join(", ")}. Change them under Recipes & Production.`
    );
  return {
    block,
    products: ITEMS.filter(i => i.d === o),
    staff: USERS.filter(u => u.d.includes(o))
  };
}
function spDeleteModal() {
  if (!spDel || !ALLD.includes(spDel)) return "";
  const o = spDel,
    C = spDeleteCheck(o),
    ok = !C.block.length;
  return `<div class="modal show" id="spDelModal" style="z-index:70"><div class="box itm" style="max-width:520px">
  <header class="itm-h"><div><h3>Delete ${esc(o)}?</h3><p>${esc(spInfo(o).type)} · gets stock from ${esc(spInfo(o).store)}</p></div><button class="itm-x" data-a="sp_delno" aria-label="Close">✕</button></header>
  <div class="itm-b">${
    ok
      ? `<section class="itm-s"><h4>This will</h4><ul class="sp-del">
     <li>Remove it from the POS, reports filter and stock lists.</li>
     ${
       C.products.length
         ? `<li>Remove ${C.products.length} product(s) sold there: ${C.products
             .slice(0, 4)
             .map(i => esc(i.n))
             .join(", ")}${C.products.length > 4 ? "…" : ""}.</li>`
         : ""
     }
     ${C.staff.length ? `<li>Take away access for ${C.staff.map(u => esc(u.n)).join(", ")}.</li>` : ""}
     <li>Keep past sales, stock movements and reports.</li></ul></section>`
      : `<section class="itm-s"><h4>It cannot be deleted yet</h4><ul class="sp-del bad">${C.block.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>`
  }</div>
  <footer class="itm-f"><button class="mini" data-a="sp_delno">${ok ? "Cancel" : "Close"}</button>${ok ? '<button class="chip on sp-del-go" data-a="sp_delyes">Delete selling point</button>' : ""}</footer>
 </div></div>`;
}
function spDelete(o) {
  if (!ALLD.includes(o) || spDeleteCheck(o).block.length) return all(); // something changed: show why
  const n = ITEMS.filter(i => i.d === o).length;
  for (let i = ITEMS.length - 1; i >= 0; i--) if (ITEMS[i].d === o) ITEMS.splice(i, 1);
  ALLD.splice(ALLD.indexOf(o), 1);
  delete OUTLET_INFO[o];
  delete STK[o];
  syncLocs();
  USERS.forEach(u => {
    u.d = u.d.filter(x => x !== o);
    if (!u.d.length) u.d = [ALLD.filter(posSells)[0] || ALLD[0]];
  });
  if (rd === o) rd = "All";
  if (spSel === o) spSel = null;
  spDel = null;
  refreshBRS();
  spRefreshPos();
  bosave();
  toast(
    o + " deleted" + (n ? ` with ${n} product(s)` : "") + ". Past sales and stock history are kept."
  );
  all();
}

function spChange(t, s) {
  if (s.sp !== undefined) {
    OUTLET_INFO[s.o] = { ...spInfo(s.o), [s.sp]: t.value };
    bosave();
    return all();
  }
  const u = USERS[+s.sps],
    o = s.o;
  if (t.checked) {
    if (!u.d.includes(o)) u.d.push(o);
  } else {
    if (u.d.filter(x => x !== o && ALLD.includes(x)).length === 0) {
      t.checked = true;
      return toast(u.n + " must keep at least one selling point.");
    }
    u.d = u.d.filter(x => x !== o);
  }
  spRefreshPos();
  bosave();
}

V.outlets = outletsView;

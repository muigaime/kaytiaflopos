// ---- selling points: bars, restaurants, kitchens and shops that sell on the POS ----
// A selling point gets stock from a store (requisition / issue) and sells products made from that stock.
// Creating one, or adding a product to one, shows on the POS straight away.
const SP_TYPES = ["Bar", "Restaurant", "Kitchen", "Shop", "Cafe", "Room service", "Other"];
let spSel = null;
invF.spf = { name: "", type: "Bar", store: STORES[0] };
invF.spp = { k: "", q: "1", name: "", cat: "", price: "", tax: "B" };
invF.spr = { store: "", note: "", lines: [] };

const spInfo = o => OUTLET_INFO[o] || { type: "Other", store: STORES[0] };
const spCanSell = i =>
  Math.min(...Object.entries(i.r).map(([k, v]) => Math.floor(have(i.d, k) / v)));
const spCost = i => Object.entries(i.r).reduce((a, [k, v]) => a + cst(k) * v, 0);

const SP_TAX = [
  ["B", "B · VAT 16%"],
  ["A", "A · Exempt"],
  ["C", "C · Zero-rated"]
];

// ---- a new stock item created from a selling point (Manage → + New item) ----
// The item goes into the Stock Master like any other. The popup can also put it on this selling point's
// POS and get stock for it: request it from the store, or have the store receive it first.
/** The selling point the item popup was opened from ("" when opened elsewhere). */
const itemSpPoint = F => (F.sp && view === "outlets" && ALLD.includes(F.sp) ? F.sp : "");
const IT_SP_WAYS = [
  [
    "req",
    "Request it from the store",
    "The store already has it: a requisition is sent and the store issues it"
  ],
  [
    "recv",
    "Store receives it first",
    "Opens Receive goods for the store with this item; a requisition waits for the issue"
  ],
  ["none", "Not now", "Only create the item (and product)"]
];
function itemSpSection(F) {
  const sp = F.sp;
  F.store = pick(F.store, STORES);
  return `<h4 style="margin:6px 0 0">Sell it at ${esc(sp)} <span class="stk" style="font-weight:400">(optional)</span></h4>
  <div class="fr"><label>Selling price (KES)<input data-iv="it.spPrice" type="number" min="0" step="any" value="${esc(F.spPrice)}" placeholder="Empty = stock item only"></label>
   <label>Category<input data-iv="it.spCat" value="${esc(F.spCat)}" placeholder="${esc(spInfo(sp).type)}"></label>
   <label>VAT<select data-iv="it.spTax">${SP_TAX.map(([v, l]) => `<option value="${v}" ${v === F.spTax ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
  <div class="stk">With a price it shows on the ${esc(sp)} POS at once; one sale uses 1 unit of measure.</div>
  <h4 style="margin:6px 0 0">Stock for ${esc(sp)}</h4>
  <div class="grn-modes it-ways">${IT_SP_WAYS.map(
    ([w, l, s]) =>
      `<button class="grn-mode ${F.spWay === w ? "on" : ""}" data-a="inv_itway" data-w="${w}"><b>${l}</b><span>${s}</span></button>`
  ).join("")}</div>
  ${
    F.spWay === "none"
      ? ""
      : `<div class="fr"><label>${F.spWay === "req" ? "Request from store" : "Store receiving it"}<select data-iv="it.store">${opts(STORES, F.store)}</select></label>
   <label>Quantity for ${esc(sp)} (in buying units)<input data-iv="it.qty" type="number" min="0" step="any" value="${esc(F.qty)}" placeholder="${F.spWay === "req" ? "Needed" : "Optional"}"></label><span class="stk" id="itEq"></span></div>`
  }`;
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
    DEPTS = user.d.filter(d => ALLD.includes(d));
    if (!DEPTS.length) DEPTS = [ALLD[0]];
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
    return `<tr class="${o === spSel ? "on" : ""}"><td><b>${esc(o)}</b></td><td>${esc(info.type)}</td><td>${esc(info.store)}</td><td class="n">${ITEMS.filter(i => i.d === o).length}</td><td class="n">${Object.keys(ING).filter(k => have(o, k) > 0).length}</td><td class="n">${m2(sales)}</td><td class="n">${USERS.filter(u => u.d.includes(o)).length}</td><td><button class="mini" data-a="sp_open" data-o="${esc(o)}">Manage</button></td></tr>`;
  }).join("");
  return `<div class="pn"><h4>Create a selling point</h4><div class="fr"><label>Name<input data-iv="spf.name" value="${esc(F.name)}" placeholder="e.g. Pool Bar, Main Restaurant"></label><label>Type<select data-iv="spf.type">${opts(SP_TYPES, F.type)}</select></label><label>Gets stock from<select data-iv="spf.store">${opts(STORES, F.store)}</select></label><button class="chip on" data-a="sp_add">Create selling point</button></div><div class="stk">A new selling point shows on the POS straight away. Managers can sell there; choose other staff under Manage.</div></div>
 <div class="pn tw"><h4>Selling points (${ALLD.length})</h4><table class="t"><tr><th>Selling point</th><th>Type</th><th>Gets stock from</th><th class="n">Products</th><th class="n">Items in stock</th><th class="n">Sales today (KES)</th><th class="n">Staff</th><th></th></tr>${rows}</table></div>
 ${spSel && ALLD.includes(spSel) ? spDetail(spSel) : ""}${itemPopupIfOpen()}${stModalIfOpen()}${apModalIfOpen()}`;
}

function spDetail(o) {
  const info = spInfo(o),
    P = invF.spp,
    keys = Object.keys(ING).sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name)),
    prods = ITEMS.filter(i => i.d === o),
    held = keys.filter(k => Math.abs(have(o, k)) > 1e-9);
  if (!P.k || ING[P.k] === undefined) P.k = keys[0] || "";
  const made = i =>
    Object.entries(i.r)
      .map(([k, v]) => `${esc(itemInfo(k).name)} × ${qn(v)} ${esc(itemInfo(k).uom)}`)
      .join(", ");
  return `<div id="spDetail"><div class="pn"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">${esc(o)}</h4><div class="fr"><label>Type<select data-sp="type" data-o="${esc(o)}">${opts(SP_TYPES, info.type)}</select></label><label>Gets stock from<select data-sp="store" data-o="${esc(o)}">${opts(STORES, pick(info.store, STORES))}</select></label><button class="mini" data-a="sp_close">Close</button></div></div></div>

 <div class="pn"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Add a product to sell here</h4><span class="fr" style="flex:none;align-items:center;margin:0"><span class="stk">Not in the Stock Master yet?</span><button class="chip on" data-a="inv_itnew" data-sp="${esc(o)}">+ New item</button></span></div>
  <div class="fr"><label>Made from stock item<select data-iv="spp.k">${keys.map(k => `<option value="${k}" ${k === P.k ? "selected" : ""}>${esc(itemInfo(k).name)} (${esc(itemInfo(k).uom)})</option>`).join("")}</select></label>
   <label>Uses per sale<input data-iv="spp.q" type="number" min="0" step="any" value="${esc(P.q)}"></label>
   <label>Product name<input data-iv="spp.name" value="${esc(P.name)}" placeholder="Same as the stock item"></label>
   <label>Category<input data-iv="spp.cat" value="${esc(P.cat)}" placeholder="e.g. Beer, Mains"></label>
   <label>Selling price (KES)<input data-iv="spp.price" type="number" min="0" step="any" value="${esc(P.price)}"></label>
   <label>VAT<select data-iv="spp.tax">${SP_TAX.map(
     ([v, l]) => `<option value="${v}" ${v === P.tax ? "selected" : ""}>${l}</option>`
   ).join("")}</select></label></div>
  <div class="stk" id="sppInfo"></div>
  <button class="chip on" data-a="sp_addprod">Add product</button></div>

 <div class="pn tw"><h4>Products sold here (${prods.length})</h4>${
   prods.length
     ? `<table class="t"><tr><th>Product</th><th>Category</th><th>VAT</th><th>Price (KES)</th><th>Made from</th><th class="n">Cost</th><th class="n">Margin</th><th class="n">Can sell</th><th></th></tr>${prods
         .map(i => {
           const c = spCost(i);
           return `<tr><td>${esc(i.n)}</td><td>${esc(i.c)}</td><td>${i.t}</td><td><input type="number" value="${i.p}" data-pr="${i.id}" style="max-width:100px"></td><td>${made(i)}</td><td class="n">${m2(c)}</td><td class="n">${i.p > 0 ? Math.round(((i.p - c) / i.p) * 100) + "%" : "-"}</td><td class="n">${Math.max(0, spCanSell(i))}</td><td><button class="mini" data-a="sp_delprod" data-id="${i.id}">Remove</button></td></tr>`;
         })
         .join("")}</table>`
     : '<div class="empty">No products yet. Add one above and it appears on this POS at once.</div>'
 }</div>

 ${spRequestPanel(o, keys)}
 ${spRequisitions(o)}
 ${spCountPanel(o, keys, held)}

 <div class="pn"><h4>Staff who can sell here</h4><div class="fr">${USERS.map(
   (u, i) =>
     `<label style="margin-right:12px"><input type="checkbox" style="width:auto;min-width:0" data-sps="${i}" data-o="${esc(o)}" ${u.d.includes(o) ? "checked" : ""}> ${esc(u.n)} <span class="stk">(${esc(u.role || "")})</span></label>`
 ).join("")}</div></div></div>`;
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
  if (a === "add") {
    const F = invF.spf,
      name = F.name.trim(),
      err = placeNameError(name);
    if (err) return toast(err);
    ALLD.push(name);
    OUTLET_INFO[name] = { type: F.type, store: pick(F.store, STORES) };
    syncLocs();
    USERS.forEach(u => {
      if (u.role === "Manager" && !u.d.includes(name)) u.d.push(name);
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
    const n = ITEMS[i].n;
    ITEMS.splice(i, 1);
    spRefreshPos();
    bosave();
    toast(n + " removed from " + spSel + ".");
    return all();
  }
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
  // ---- stock take
  if (a === "countrun") return tapConfirm(b, () => spCountRun(d.o), "POST COUNT?");
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

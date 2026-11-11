// ---- Direct Receive (goods received into a store) and vendor setup. Shown in Purchasing → Receive goods. ----
// Header (date, supplier, invoice, delivery note, store), an item entry row (batch, expiry, units, price,
// quantity, VAT) and a grid of lines. Posting adds the stock to the store at net cost (excl. VAT), records a
// GRN and, when loaded from an LPO, updates that LPO.
const RC_TAX = 16;
const rcBlank = (keep = {}) => ({
  mode: "direct", // lpo | direct | sp (see RC_MODES)
  sp: "", // receiving selling point (mode sp)
  supText: "", // supplier typed by hand when there is no vendor
  lpoPick: "",
  date: todayYmd(),
  sup: "",
  narr: "",
  dnote: "",
  inv: "",
  invAmt: "",
  incl: true,
  lines: [],
  lpo: null,
  eK: "",
  eName: "",
  eBatch: "",
  eExp: "",
  eUnits: "buy", // "uom": by the piece · "buy": by the box or crate
  eBox: "", // what the box is called: Crate, Carton...
  ePer: "", // pieces in one box
  ePrice: "",
  eQty: "",
  eTax: String(RC_TAX),
  lastGrn: null,
  dept: "", // the receiving store; empty means the default store
  ...keep
});
invF.rc = rcBlank();
const vnBlank = () => ({
  open: false,
  id: null,
  name: "",
  contact: "",
  phone: "",
  email: "",
  pin: "",
  address: "",
  terms: "Cash",
  ob: "", // balance already owed when the vendor is added (KES)
  obAt: ""
});
invF.vn = vnBlank();

const VN_TERMS = ["Cash", "7 days", "14 days", "30 days", "60 days"];
const vendorNames = () => VENDORS.filter(v => v.active !== false).map(v => v.name);

/** VAT split of a line. Inclusive: the price already contains VAT. */
function rcCalc(price, qty, rate, incl) {
  const amt = (+price || 0) * (+qty || 0),
    r = (+rate || 0) / 100;
  if (incl) {
    const net = amt / (1 + r);
    return { net, tax: amt - net, gross: amt };
  }
  return { net: amt, tax: amt * r, gross: amt * (1 + r) };
}
/** Units choice for an item: its buying unit (e.g. Crate of 24) or its stock unit (e.g. pcs). */
const rcUnitOpts = (k, cur) => {
  const u = itemInfo(k),
    buy =
      +u.perBuy === 1 && u.buyUnit === u.uom ? null : `${u.buyUnit} (${qn(+u.perBuy)} ${u.uom})`;
  return (
    (buy ? `<option value="buy" ${cur === "buy" ? "selected" : ""}>${esc(buy)}</option>` : "") +
    `<option value="uom" ${cur === "uom" || !buy ? "selected" : ""}>${esc(u.uom)}</option>`
  );
};
const RC_BOXES = [
  "Crate",
  "Box",
  "Carton",
  "Case",
  "Pack",
  "Dozen",
  "Tray",
  "Bale",
  "Sack",
  "Bundle"
];
/** The item has its own box size (e.g. Crate of 24), not just single pieces. */
const rcHasBox = k =>
  !!k && !(+itemInfo(k).perBuy === 1 && itemInfo(k).buyUnit === itemInfo(k).uom);
/** Price per piece from the item's last buying price. */
const rcPiecePrice = k => {
  const u = itemInfo(k);
  return +u.buyPrice ? +u.buyPrice / (+u.perBuy || 1) : 0;
};
/** "= 48 pcs into stock" while typing boxes. */
function rcConvText(R = invF.rc) {
  if (!R.eK || R.eUnits !== "buy") return "";
  const u = itemInfo(R.eK),
    per = parseFloat(R.ePer),
    q = parseFloat(R.eQty),
    box = R.eBox || "box";
  if (!(per > 0)) return `Type how many ${u.uom} are in one ${box.toLowerCase()}.`;
  return q > 0
    ? `${qn(q)} ${(q === 1 ? box : rcPlural(box)).toLowerCase()} × ${qn(per)} = ${qn(q * per)} ${u.uom} into stock`
    : `One ${box.toLowerCase()} holds ${qn(per)} ${u.uom}`;
}
/** Crate -> Crates, Box -> Boxes. */
const rcPlural = w => (/(x|s|ch|sh)$/i.test(w) ? w + "es" : w + "s");
const rcIsBuy = (k, units) =>
  units === "buy" && !(+itemInfo(k).perBuy === 1 && itemInfo(k).buyUnit === itemInfo(k).uom);
/** The item whose name (ignoring case, spaces and punctuation) or code is typed. */
const rcExact = text => {
  const n = itemNorm(text);
  return n
    ? rcKeys().find(k => itemNorm(itemInfo(k).name) === n || itemNorm(itemInfo(k).code) === n) || ""
    : "";
};

// ---------------------------------------------------------------- receipt types
// lpo:    against a purchase order: supplier, store and lines come from the LPO; quantities can be lowered
//         for a part delivery, never above what is still due.
// direct: straight into a store; a vendor is optional (cash / market / walk-in purchases).
// sp:     straight into a selling point (e.g. the bar buys and receives directly); vendor optional.
const RC_MODES = [
  ["lpo", "Against purchase order", "Receive what was ordered on an LPO"],
  ["direct", "Direct receive", "Into a store · vendor optional"],
  ["sp", "Direct to selling point", "Straight into a bar, kitchen or restaurant"]
];
const RC_MODE_LABEL = { lpo: "LPO", direct: "Direct", sp: "Selling point" };
const openLposAll = () =>
  LPOS.map((p, i) => [p, i]).filter(([p]) => p.status === "Open" || p.status === "Partly received");
/** Where the goods go: the LPO's store, the chosen store, or the chosen selling point. */
function rcDest(R = invF.rc) {
  if (R.mode === "sp") return (R.sp = pick(R.sp, ALLD));
  if (R.mode === "lpo" && R.lpo) {
    const p = LPOS.find(x => x.id === R.lpo);
    if (p) return p.store;
  }
  return isStore(R.dept) ? R.dept : defaultStore();
}
/** What can be received here: into a store, only the items that store holds. */
const rcKeys = (R = invF.rc) => {
  const d = rcDest(R);
  return pickKeys().filter(k => R.mode === "sp" || !isStore(d) || storeHolds(d, k));
};
/** Supplier recorded on the GRN: the vendor, a typed name, or "Cash purchase". */
const rcSupplier = (R = invF.rc) =>
  R.mode === "lpo" ? R.sup : R.sup || R.supText.trim() || "Cash purchase";

// ---------------------------------------------------------------- screen (Goods Received Note)
function recvHTML() {
  const R = invF.rc,
    dest = rcDest(R),
    lpoMode = R.mode === "lpo",
    keys = rcKeys(R),
    sups = vendorNames(),
    v = VENDORS.find(x => x.name === R.sup),
    lpo = R.lpo ? LPOS.find(x => x.id === R.lpo) : null,
    uom = R.eK ? itemInfo(R.eK).uom : "pcs",
    byBox = R.eUnits === "buy",
    boxWord = (R.eBox || "box").toLowerCase();
  if (R.sup && !sups.includes(R.sup)) sups.push(R.sup); // e.g. supplier of an older LPO
  let net = 0,
    tax = 0,
    gross = 0;
  const rows = R.lines.map((L, i) => {
    const c = rcCalc(L.unitPrice, L.qty, L.taxRate, R.incl);
    net += c.net;
    tax += c.tax;
    gross += c.gross;
    return `<tr class="${L.sel ? "grn-sel" : ""}"><td><input type="checkbox" data-rcsel="${i}" ${L.sel ? "checked" : ""} aria-label="Select line ${i + 1}"></td><td class="grn-no">${i + 1}</td><td><b>${esc(itemInfo(L.k).name)}</b>${itemInfo(L.k).code ? `<span class="grn-code">${esc(itemInfo(L.k).code)}</span>` : ""}${L.lpoMax !== undefined ? `<span class="grn-code">due ${qn(L.lpoMax)}</span>` : ""}</td><td>${esc(L.batch || "–")}</td><td>${esc(L.expiry || "–")}</td><td>${esc(L.units)}${L.isBuy ? `<span class="grn-code">= ${qn(L.qty * (+L.per || +itemInfo(L.k).perBuy))} ${esc(itemInfo(L.k).uom)}</span>` : ""}</td><td class="n"><input class="grn-q" type="number" min="0" step="any" data-rcq="${i}" value="${L.qty}" aria-label="Quantity, line ${i + 1}"></td><td class="n">${m2(L.unitPrice)}</td><td class="n">${qn(L.taxRate)}</td><td class="n">${m2(c.net)}</td><td class="n">${m2(c.tax)}</td><td class="n"><b>${m2(c.gross)}</b></td></tr>`;
  });
  const openReqs = REQS.filter(r => (r.store || STORES[0]) === dest && isOpenReq(r)).length,
    selN = R.lines.filter(l => l.sel).length,
    ab = (a, icon, label, badge, extra = "") =>
      `<button class="grn-ab" data-a="${a}" ${extra}>${I(icon)}<span>${label}</span>${badge ? `<b>${badge}</b>` : ""}</button>`,
    diff = R.invAmt === "" || !R.lines.length ? null : gross - +R.invAmt,
    check = rcCheck(R),
    lpos = openLposAll();

  // Vendor card differs per receipt type.
  const supplierCard = lpoMode
    ? `<label>Purchase order<select data-iv="rc.lpoPick"><option value="">${lpos.length ? "Choose an open LPO…" : "No open purchase orders"}</option>${lpos
        .map(([p, i]) => {
          const left = p.lines.reduce((a, x) => a + Math.max(0, x.qty - x.recv) * x.price, 0);
          return `<option value="${i}" ${p.id === R.lpo ? "selected" : ""}>${esc(p.id)} · ${esc(p.sup)} · ${esc(p.store)} · KES ${m2(left)} due</option>`;
        })
        .join("")}</select></label>
   <div class="grn-vend">${lpo ? `Vendor <b>${esc(lpo.sup)}</b> · raised ${dt2(lpo.at)} by ${esc(lpo.by)}${lpo.due ? " · due " + esc(lpo.due) : ""}${v && v.phone ? " · " + esc(v.phone) : ""}` : "Vendor, store and items come from the purchase order."}</div>`
    : `<label>Vendor <span class="grn-opt">optional</span><span class="grn-inl"><select data-iv="rc.sup"><option value="">No vendor · cash / walk-in purchase</option>${sups.map(s => `<option ${s === R.sup ? "selected" : ""}>${esc(s)}</option>`).join("")}</select><button class="mini" data-a="inv_vnopen" title="Add a vendor">+ New</button></span></label>
   ${
     R.sup
       ? `<div class="grn-vend">${[v && v.contact, v && v.phone, v && v.email, v && v.pin ? "KRA PIN " + v.pin : "", v && v.terms ? "Terms: " + v.terms : ""].filter(Boolean).map(esc).join(" · ") || "No contact details saved."}</div>`
       : `<label>Bought from <span class="grn-opt">optional</span><input data-iv="rc.supText" value="${esc(R.supText)}" placeholder="e.g. Wakulima market (blank = Cash purchase)"></label>`
   }`;
  const placeField =
    R.mode === "sp"
      ? `<label>Receiving selling point<select data-iv="rc.sp">${opts(ALLD, dest)}</select></label>`
      : lpoMode
        ? `<label>Receiving store<input value="${esc(lpo ? lpo.store : "From the LPO")}" readonly></label>`
        : `<label>Receiving store<select data-iv="rc.dept">${STORES.map(l => `<option value="${esc(l)}" ${l === dest ? "selected" : ""}>${esc(l)}${l === defaultStore() ? " (default)" : ""}</option>`).join("")}</select></label>`;

  return `<div class="grn">
 <div class="grn-head">
  <div><div class="grn-kicker">Purchasing · Receive goods</div><h2>Goods Received Note</h2>
   <div class="grn-meta"><span class="grn-chip draft">Draft · not posted</span><span class="grn-chip lpo">${RC_MODE_LABEL[R.mode]}</span><span>Into ${esc(dest)}${isStore(dest) ? "" : " (selling point)"}</span><span>Posted by ${esc(boUser ? boUser.n : "")}</span>${R.lpo ? `<span class="grn-chip lpo">Against ${esc(R.lpo)}</span>` : ""}</div></div>
  <div class="grn-head-act"><button class="mini" data-a="inv_rcexit">Clear</button><button class="chip on grn-post" data-a="inv_rcpost">${I("check")}Post GRN</button></div>
 </div>

 <div class="grn-modes">${RC_MODES.map(
   ([m, t, s]) =>
     `<button class="grn-mode ${R.mode === m ? "on" : ""}" data-a="inv_rcmode" data-m="${m}"><b>${t}${m === "lpo" && lpos.length ? ` <i>${lpos.length}</i>` : ""}</b><span>${s}</span></button>`
 ).join("")}</div>

 <div class="grn-bar">
  ${R.mode === "direct" ? ab("inv_rccopy", "swap", "Copy from requisitions", openReqs) : ""}
 ${lpoMode ? "" : ab("inv_itnew", "plus", "New item")}
  ${ab("inv_rcedit", "gear", "Edit item")}
  <i class="grn-sep"></i>
  ${ab("inv_rcdel", "alert", "Delete selected", selN, selN ? "" : 'disabled title="Tick lines in the table first"')}
  ${ab("inv_rcissue", "cart", "Issue items", "", R.lastGrn ? "" : 'disabled title="Post a GRN into a store first"')}
 </div>

 <div class="grn-cards">
  <section class="grn-card"><h4>Vendor</h4>
   ${supplierCard}
   <label>Narration<textarea data-iv="rc.narr" rows="2" placeholder="Optional note about this delivery">${esc(R.narr)}</textarea></label>
  </section>
  <section class="grn-card"><h4>Document</h4><div class="grn-grid2">
   <label>Date<input type="date" data-iv="rc.date" value="${esc(R.date)}"></label>
   ${placeField}
   <label><span>Invoice / receipt no <em class="grn-req">required</em></span><input data-iv="rc.inv" value="${esc(R.inv)}"></label>
   <label><span>Delivery note no <em class="grn-req">required</em></span><span class="grn-inl"><input data-iv="rc.dnote" value="${esc(R.dnote)}"><button class="mini" data-a="inv_rcdnsame" title="Use the invoice number">Same as invoice</button></span></label>
   <label><span>Invoice amount (KES) <em class="grn-req">required</em></span><input data-iv="rc.invAmt" type="number" min="0" step="any" value="${esc(R.invAmt)}"></label>
   <label>Posted by<input value="${esc(boUser ? boUser.n : "")}" readonly></label>
  </div></section>
 </div>

 <section class="grn-card grn-lines">
  <div class="grn-lines-h"><h4>Items received</h4><div class="seg2"><button class="${R.incl ? "on" : ""}" data-a="inv_rcvat" data-v="1">Prices include VAT</button><button class="${R.incl ? "" : "on"}" data-a="inv_rcvat" data-v="0">Prices exclude VAT</button></div></div>
  ${
    lpoMode
      ? `<div class="grn-hint">${lpo ? "Lines come from the purchase order. For a part delivery, lower the quantity in the table (it cannot go above what is still due)." : "Choose an open purchase order in the Vendor card to load its lines."}</div>`
      : `<div class="grn-entry">
   <label class="grn-e-item">Item<span class="grn-inl rc-combo"><input id="rcName" data-iv="rc.eName" value="${esc(R.eName)}" placeholder="Type a name, code or category" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="rcPick"><button class="mini" data-a="inv_rcfind">Find</button><div class="rc-pick" id="rcPick" role="listbox" hidden></div></span></label>
   <div class="grn-by"><span>Receive by</span><div class="seg2"><button class="${byBox ? "" : "on"}" data-a="inv_rcby" data-v="uom">Pieces${R.eK && uom !== "pcs" ? ` (${esc(uom)})` : ""}</button><button class="${byBox ? "on" : ""}" data-a="inv_rcby" data-v="buy">Boxes / crates</button></div></div>
   ${byBox ? `<label>Box or crate<select data-iv="rc.eBox">${[...new Set([R.eBox, ...RC_BOXES].filter(Boolean))].map(b => `<option ${b === R.eBox ? "selected" : ""}>${esc(b)}</option>`).join("")}</select></label><label>${esc(uom)} in one ${esc(boxWord)}<input id="rcPer" data-iv="rc.ePer" type="number" min="1" step="any" value="${esc(R.ePer)}" placeholder="e.g. 24"></label>` : ""}
   <label>${byBox ? `${esc(rcPlural(R.eBox || "Box"))} received` : `${esc(uom === "pcs" ? "Pieces" : uom)} received`}<input id="rcQty" data-iv="rc.eQty" type="number" min="0" step="any" value="${esc(R.eQty)}"></label>
   <label>Price per ${byBox ? esc(boxWord) : esc(uom === "pcs" ? "piece" : uom)}<input id="rcPrice" data-iv="rc.ePrice" type="number" min="0" step="any" value="${esc(R.ePrice)}"></label>
   <label>VAT %<input id="rcTaxBox" data-iv="rc.eTax" type="number" min="0" step="any" value="${esc(R.eTax)}"></label>
   <label>Batch no<input data-iv="rc.eBatch" value="${esc(R.eBatch)}"></label>
   <label>Expiry<input type="date" data-iv="rc.eExp" value="${esc(R.eExp)}"></label>
   <label>Line total<input id="rcTotal" readonly></label>
   <button class="chip on grn-add" data-a="inv_rcadd">${I("plus")}Add</button>
  </div>
  <div class="grn-hint" id="rcInfo">${esc(rcItemInfo(R.eK, dest))}</div><div class="grn-conv" id="rcConv">${esc(rcConvText(R))}</div>`
  }
  <div class="tw"><table class="t grn-t"><tr><th class="grn-cb"><input type="checkbox" data-rcall="1" ${R.lines.length && R.lines.every(l => l.sel) ? "checked" : ""} aria-label="Select all lines"></th><th>#</th><th>Item</th><th>Batch</th><th>Expiry</th><th>Units</th><th class="n">Qty</th><th class="n">Unit price</th><th class="n">VAT %</th><th class="n">Net</th><th class="n">VAT</th><th class="n">Gross</th></tr>${
    rows.join("") ||
    `<tr><td colspan="12" class="grn-empty">${lpoMode ? "No purchase order loaded yet." : "No items yet. Add them above."}</td></tr>`
  }</table></div>
  <div class="grn-foot"><div class="grn-check ${check[0]}" id="rcCheck">${check[1]}</div>
   <div class="grn-tot"><span>Net amount</span><b>${m2(net)}</b><span>VAT</span><b>${m2(tax)}</b><span class="g">Gross total (KES)</span><b class="g">${m2(gross)}</b></div></div>
 </section>

 ${rcRecent(dest)}
</div>`;
}

function rcRecent(place) {
  const L = GRNS.filter(g => (g.store || STORES[0]) === place)
    .slice()
    .reverse()
    .slice(0, 10);
  return `<section class="grn-card"><h4>Recent GRNs · ${esc(place)}</h4>${
    L.length
      ? `<div class="tw"><table class="t grn-t"><tr><th>Date</th><th>GRN</th><th>Type</th><th>Vendor</th><th>Invoice</th><th>Delivery note</th><th>LPO</th><th class="n">Lines</th><th class="n">Gross (KES)</th><th>Posted by</th><th></th></tr>${L.map(
          g =>
            `<tr><td>${dt2(g.at)}</td><td><b>${g.id}</b></td><td>${esc(g.mode || (g.lpo ? "LPO" : "Direct"))}</td><td>${esc(g.sup)}</td><td>${esc(g.inv || g.ref || "–")}</td><td>${esc(g.dnote || "–")}</td><td>${esc(g.lpo || "–")}</td><td class="n">${g.lines.length}</td><td class="n">${m2(g.gross !== undefined ? g.gross : g.lines.reduce((a, x) => a + x.q * x.c, 0))}</td><td>${esc(g.by || "")}</td><td class="n">${docBtn("grn", g.id)}</td></tr>`
        ).join("")}</table></div>`
      : `<div class="grn-empty">Nothing received into ${esc(place)} yet.</div>`
  }</section>`;
}

/** One line under the item field: what was picked and how much of it the place already holds. */
function rcItemInfo(k, place) {
  if (!k) return "Type an item name or code and pick it from the list, or press Find.";
  const u = itemInfo(k);
  return `${u.code ? u.code + " · " : ""}${u.name} · in ${place}: ${qn(have(place, k))} ${u.uom} · last price KES ${m2(+u.buyPrice || 0)} per ${u.buyUnit}`;
}

/** Live parts of the entry row, updated while typing (a full redraw would lose the cursor). */
/** The GRN's total, and whether the invoice amount agrees with it. */
const rcGross = R =>
  R.lines.reduce((a, L) => a + rcCalc(L.unitPrice, L.qty, L.taxRate, R.incl).gross, 0);
function rcCheck(R) {
  if (R.invAmt === "")
    return ["", R.lines.length ? "Enter the invoice amount. It must match the total." : ""];
  const diff = +R.invAmt - rcGross(R);
  return Math.abs(diff) < 0.01
    ? ["ok", "✓ Matches the invoice amount"]
    : [
        "bad",
        `⚠ Invoice is KES ${m2(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than the total. It can't be posted until they match.`
      ];
}
function rcSync(f) {
  const R = invF.rc;
  if (f === "invAmt" && $("#rcCheck")) {
    const c = rcCheck(R);
    $("#rcCheck").className = "grn-check " + c[0];
    $("#rcCheck").textContent = c[1];
    return;
  }
  if (f === "dept") {
    if (isStore(R.dept)) STKT.loc = R.dept;
    return all();
  }
  if (f === "sp" || f === "sup") return all();
  if (f === "lpoPick") {
    const p = LPOS[+R.lpoPick];
    if (R.lpoPick !== "" && p) rcLoadLpo(p);
    else Object.assign(R, { lpo: null, lines: [], sup: "" });
    return all();
  }
  if (f === "eBox") return all();
  if (f === "ePer" && R.eUnits === "buy" && R.eK) {
    const per = parseFloat(R.ePer),
      pp = rcPiecePrice(R.eK);
    if (per > 0 && pp) {
      R.ePrice = String(Math.round(pp * per * 100) / 100);
      const p = $("#rcPrice");
      if (p) p.value = R.ePrice;
    }
  }
  if (f === "eUnits" && R.eK) {
    // Switching Crate <-> pcs: show the matching price for that unit.
    const u = itemInfo(R.eK);
    R.ePrice = u.buyPrice
      ? String(R.eUnits === "buy" ? +u.buyPrice : +u.buyPrice / +u.perBuy)
      : R.ePrice;
    const p = $("#rcPrice");
    if (p) p.value = R.ePrice;
  }
  if (f === "eName") {
    rcPickShow(true);
    const k = rcExact(R.eName);
    if (k && k !== R.eK) rcPick(k, false);
    else if (!k && R.eK) R.eK = "";
  }
  const set = (id, v) => {
    const el = $("#" + id);
    if (el) el.value = v;
  };
  const info = $("#rcInfo");
  if (info) info.textContent = rcItemInfo(R.eK, rcDest(R));
  const conv = $("#rcConv");
  if (conv) conv.textContent = rcConvText(R);
  const t = rcCalc(R.ePrice, R.eQty, R.eTax, R.incl);
  set("rcTotal", R.ePrice !== "" && R.eQty !== "" ? m2(t.gross) : "");
}
// ---------------------------------------------------------------- the item picker
// One searchable list for Receive goods (#rcName) and purchase orders (#poName): only the items the store holds,
// with their code, category, unit, box size, stock in that store and last price.
const PICKERS = {
  rcName: {
    box: "rcPick",
    text: () => invF.rc.eName,
    keys: () => rcKeys(),
    dest: () => rcDest(),
    choose: k => {
      rcPick(k, false);
      const n = $("#rcName");
      if (n) n.value = itemInfo(k).name;
      const q = $("#rcQty");
      if (q) q.focus();
    }
  },
  poName: {
    box: "poPick",
    text: () => invF.po.eName || "",
    keys: () => poKeys(),
    dest: () => poStore(),
    choose: k => poPickItem(k)
  }
};
let rcHi = 0;
/** An item's name, even for older items whose name lives only in the item list. */
const pkName = k => itemInfo(k).name || iN(k) || k;
/** The items that match what is typed: name, code or category. */
function pkMatches(P) {
  const t = itemNorm(P.text()),
    L = P.keys().filter(
      k =>
        !t ||
        itemNorm(pkName(k)).includes(t) ||
        itemNorm(itemInfo(k).code).includes(t) ||
        itemNorm(itemInfo(k).group).includes(t)
    );
  return L.sort((a, b) => {
    const A = itemNorm(pkName(a)),
      B = itemNorm(pkName(b));
    return (t && B.startsWith(t)) - (t && A.startsWith(t)) || A.localeCompare(B);
  });
}
function pkHTML(P) {
  const dest = P.dest(),
    L = pkMatches(P),
    all = P.keys().length;
  rcHi = Math.min(rcHi, Math.max(0, L.length - 1));
  const rows = L.slice(0, 60)
    .map((k, i) => {
      const u = itemInfo(k),
        q = have(dest, k),
        box = +u.perBuy !== 1 || u.buyUnit !== u.uom;
      return `<button type="button" class="rc-opt ${i === rcHi ? "on" : ""}" data-rcpk="${esc(k)}" role="option" aria-selected="${i === rcHi}"><span class="rc-av">${esc((pkName(k) || "?")[0].toUpperCase())}</span><span class="rc-nm"><b>${esc(pkName(k))}</b><small>${u.code ? `<i>${esc(u.code)}</i>` : ""}${esc(u.group || "")} · ${esc(u.uom)}${box ? ` · ${esc(u.buyUnit)} of ${qn(+u.perBuy)}` : ""}</small></span><span class="rc-st"><b class="${q > 0 ? "" : "zero"}">${qn(q)} ${esc(u.uom)}</b><small>${+u.buyPrice ? `KES ${m2(+u.buyPrice)} / ${esc(u.buyUnit)}` : "No price yet"}</small></span></button>`;
    })
    .join("");
  return `<div class="rc-ph"><span>${isStore(dest) ? `Items kept in <b>${esc(dest)}</b>` : `Items for <b>${esc(dest)}</b>`}</span><small>${L.length === all ? plural(all, "item") : `${L.length} of ${all}`}</small></div>${rows || `<div class="rc-none">${all ? "Nothing matches. Try part of the name or the code." : `${esc(dest)} doesn't hold any items yet.`}<button type="button" class="mini" data-a="inv_itnew">New item</button></div>`}${L.length > 60 ? `<div class="rc-more">Keep typing to narrow down ${L.length} items.</div>` : ""}`;
}
function pkShow(id, on) {
  const P = PICKERS[id],
    box = P && $("#" + P.box),
    inp = $("#" + id);
  if (!box || !inp) return;
  if (on) box.innerHTML = pkHTML(P);
  box.hidden = !on;
  inp.setAttribute("aria-expanded", on ? "true" : "false");
}
const rcPickShow = on => pkShow("rcName", on);
function pkChoose(id, k) {
  pkShow(id, false);
  PICKERS[id].choose(k);
}
$("#vSub").addEventListener("focusin", e => {
  if (PICKERS[e.target.id]) {
    rcHi = 0;
    pkShow(e.target.id, true);
  }
});
$("#vSub").addEventListener("focusout", e => {
  // Closes when the person really leaves the box (not when a choice in the list is being clicked).
  const id = e.target.id;
  if (PICKERS[id])
    setTimeout(() => document.activeElement !== $("#" + id) && pkShow(id, false), 160);
});
$("#vSub").addEventListener("mousedown", e => {
  const o = e.target.closest && e.target.closest("[data-rcpk]");
  if (!o) return;
  e.preventDefault();
  const id = Object.keys(PICKERS).find(x => o.closest("#" + PICKERS[x].box));
  if (id) pkChoose(id, o.dataset.rcpk);
});
$("#vSub").addEventListener("keydown", e => {
  const id = e.target.id,
    P = PICKERS[id];
  if (!P) return;
  const box = $("#" + P.box),
    L = pkMatches(P).slice(0, 60);
  if (e.key === "Escape") return pkShow(id, false);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    rcHi = Math.max(0, Math.min(L.length - 1, rcHi + (e.key === "ArrowDown" ? 1 : -1)));
    pkShow(id, true);
    const on = $("#" + P.box + " .rc-opt.on");
    if (on) on.scrollIntoView({ block: "nearest" });
  }
  if (e.key === "Enter" && box && !box.hidden && L[rcHi]) {
    e.preventDefault();
    pkChoose(id, L[rcHi]);
  }
});
/** Choose item k in the entry row: default units = buying unit, price = last buying price. */
function rcPick(k, redraw = true) {
  const R = invF.rc,
    u = itemInfo(k);
  R.eK = k;
  R.eTax = String(itemTaxRate(k));
  const taxBox = $("#rcTaxBox");
  if (taxBox) taxBox.value = R.eTax;
  R.eName = u.name;
  const own = rcHasBox(k);
  R.eUnits = own ? "buy" : "uom";
  R.eBox = own ? u.buyUnit : R.eBox || "Crate";
  R.ePer = own ? String(+u.perBuy) : "";
  R.ePrice = u.buyPrice ? String(R.eUnits === "buy" ? +u.buyPrice : +u.buyPrice / +u.perBuy) : "";
  if (redraw || $("#rcPer") || own) return all();
  const units = $("#rcUnits"),
    price = $("#rcPrice");
  if (units) units.innerHTML = rcUnitOpts(k, R.eUnits);
  if (price) price.value = R.ePrice;
  const info = $("#rcInfo");
  if (info) info.textContent = rcItemInfo(k, rcDest(R));
}
/** Load what is still due on an LPO into the grid. */
function rcLoadLpo(p) {
  const R = invF.rc;
  R.lines = p.lines
    .map((x, j) => ({ x, j, left: x.qty - x.recv }))
    .filter(o => o.left > 1e-9)
    .map(({ x, j, left }) => {
      const u = itemInfo(x.k),
        per = lpoPer(x),
        unit = lpoUnit(x),
        isBuy = per !== 1 || unit !== u.uom;
      return {
        k: x.k,
        isBuy,
        units: isBuy ? `${unit} of ${qn(per)} ${u.uom}` : u.uom,
        per: isBuy ? per : undefined,
        box: isBuy ? unit : undefined,
        unitPrice: x.price,
        qty: left,
        lpoMax: left,
        taxRate: itemTaxRate(x.k),
        batch: "",
        expiry: "",
        sel: false,
        lpoLine: j
      };
    });
  R.lpo = p.id;
  R.lpoPick = String(LPOS.indexOf(p));
  R.sup = p.sup;
  if (isStore(p.store)) STKT.loc = p.store;
}
/** A quantity typed in the table. LPO lines cannot go above what is still due. */
function rcQtyChange(t, i) {
  const L = invF.rc.lines[i];
  if (!L) return;
  let q = parseFloat(t.value);
  if (!(q > 0)) {
    t.value = L.qty;
    return toast("A quantity must be more than 0. Use Delete selected to remove a line.");
  }
  if (L.lpoMax !== undefined && q > L.lpoMax + 1e-9) {
    q = L.lpoMax;
    toast(`Only ${qn(L.lpoMax)} ${L.units} is still due on ${invF.rc.lpo}.`);
  }
  L.qty = q;
  all();
}

// ---------------------------------------------------------------- vendors
/** Vendor setup as a popup (from Receive / LPO); the full page is People → Vendors (vendors.js). */
let vnPageNew = false;
function vendorPopupIfOpen() {
  if (!invF.vn.open) return "";
  return `<div class="modal show" id="vnModal" style="z-index:70"><div class="box" style="max-width:820px">
  <div class="fr" style="align-items:center;justify-content:space-between"><h3>Vendor setup</h3><button class="mini" data-a="inv_vnclose">✕</button></div>
  ${vendorFormHTML()}</div></div>`;
}
/** Vendor form plus the list of vendors (shared by the popup and the People → Vendors page). */
function vendorFormHTML() {
  return vendorFieldsHTML() + vendorListHTML();
}
function vendorFieldsHTML() {
  const F = invF.vn;
  return `<div class="fr"><label>Vendor name<input id="vnName" data-iv="vn.name" value="${esc(F.name)}" placeholder="e.g. East African Breweries"></label><label>Contact person<input data-iv="vn.contact" value="${esc(F.contact)}"></label><label>Phone<input data-iv="vn.phone" value="${esc(F.phone)}" inputmode="tel"></label></div>
  <div class="fr"><label>Email<input data-iv="vn.email" value="${esc(F.email)}" type="email"></label><label>KRA PIN<input data-iv="vn.pin" value="${esc(F.pin)}" placeholder="e.g. P051234567X"></label><label>Payment terms<select data-iv="vn.terms">${opts(VN_TERMS, F.terms)}</select></label></div>
  <div class="fr"><label style="flex:1">Address<input data-iv="vn.address" value="${esc(F.address)}"></label><label>Opening balance owed (KES)<input data-iv="vn.ob" type="number" min="0" step="any" value="${esc(F.ob)}" placeholder="Optional"></label><label>Owed as at<input data-iv="vn.obAt" type="date" value="${esc(F.obAt)}" max="${todayYmd()}"></label></div>
  <div class="fr" style="justify-content:flex-end">${F.open ? (F.id ? '<button class="mini" data-a="inv_vnnew">New vendor</button>' : "") : '<button class="mini" data-a="inv_vnnew">Cancel</button>'}<button class="chip on" data-a="inv_vnsave">${F.id ? "Save changes" : "Save vendor"}</button></div>`;
}
function vendorListHTML() {
  const F = invF.vn;
  return `<div class="tw"><table class="t"><tr><th>Vendor</th><th>Contact</th><th>Phone</th><th>Email</th><th>KRA PIN</th><th>Terms</th><th class="n">LPOs</th><th class="n">Receipts</th><th class="n">Purchased (KES)</th><th class="n">Balance (KES)</th><th></th></tr>${
    VENDORS.length
      ? VENDORS.map(v => {
          const g = GRNS.filter(x => x.sup === v.name),
            spent = g.reduce((a, x) => a + x.lines.reduce((b, l) => b + l.q * l.c, 0), 0);
          return `<tr ${v.id === F.id ? 'style="outline:2px solid var(--brass, #c7a25a)"' : ""}><td><b>${esc(v.name)}</b></td><td>${esc(v.contact || "")}</td><td>${esc(v.phone || "")}</td><td>${esc(v.email || "")}</td><td>${esc(v.pin || "")}</td><td>${esc(v.terms || "")}</td><td class="n">${LPOS.filter(p => p.sup === v.name).length}</td><td class="n">${g.length}</td><td class="n">${m2(spent)}</td><td class="n">${m2(vendorBalance(v))}</td><td><span class="fr" style="flex-wrap:nowrap;margin:0"><button class="mini" data-a="vs_open" data-id="${v.id}">Statement</button><button class="mini" data-a="inv_vnedit" data-id="${v.id}">Edit</button></span></td></tr>`;
        }).join("")
      : '<tr><td colspan="11" class="stk">No vendors yet.</td></tr>'
  }</table></div>`;
}

function vendorSave() {
  const F = invF.vn,
    name = F.name.trim(),
    n = itemNorm(name),
    email = F.email.trim(),
    pin = F.pin.trim().toUpperCase();
  if (!name) return toast("Enter the vendor name.");
  if (VENDORS.some(v => v.id !== F.id && itemNorm(v.name) === n))
    return toast(name + " is already a vendor.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return toast("That email address does not look right.");
  if (pin && !/^[A-Z]\d{9}[A-Z]$/.test(pin)) return toast("A KRA PIN looks like P051234567X.");
  const ob = F.ob === "" ? 0 : Math.round(parseFloat(F.ob) * 100) / 100;
  if (!(ob >= 0)) return toast("The opening balance must be zero or more.");
  if (F.obAt > todayYmd()) return toast("The opening balance date cannot be in the future.");
  const data = {
    name,
    contact: F.contact.trim(),
    phone: F.phone.trim(),
    email,
    pin,
    address: F.address.trim(),
    terms: F.terms,
    ob: ob || "",
    obAt: ob ? F.obAt || todayYmd() : "",
    active: true
  };
  if (F.id) {
    const v = VENDORS.find(x => x.id === F.id),
      old = v.name;
    Object.assign(v, data);
    if (old !== name)
      // keep this vendor's receipts, orders and payments on its statement
      [...GRNS, ...LPOS].forEach(x => x.sup === old && (x.sup = name));
    if (old !== name) VPAYS.forEach(p => p.vendor === old && (p.vendor = name));
    if (invF.rc.sup === old) invF.rc.sup = name;
  } else {
    VENDORS.push({ id: nid("VEN"), ...data });
    if (!invF.rc.sup) invF.rc.sup = name; // ready to use on the receive form
    if (!invF.po.sup) invF.po.sup = name;
  }
  invF.vn = { ...vnBlank(), open: F.open }; // stay in the popup, or on the Vendors page
  vnPageNew = false;
  bosave();
  toast(name + (F.id ? " updated." : " added as a vendor."));
  all();
}

// ---------------------------------------------------------------- actions
function rcAct(a, b) {
  const d = b.dataset,
    R = invF.rc,
    dest = rcDest(R);
  // vendors
  if (a === "vnopen") {
    invF.vn = { ...vnBlank(), open: true };
    all();
    const n = $("#vnName");
    return n && n.focus();
  }
  if (a === "vnclose") {
    invF.vn = vnBlank();
    return all();
  }
  if (a === "vnpage") {
    vnPageNew = true;
    all();
    return $("#vnName").focus();
  }
  if (a === "vnnew") {
    vnPageNew = false;
    invF.vn = { ...vnBlank(), open: invF.vn.open };
    return all();
  }
  if (a === "vnedit") {
    const v = VENDORS.find(x => x.id === d.id);
    invF.vn = { ...vnBlank(), ...v, open: invF.vn.open };
    all();
    const n = $("#vnName");
    return n && n.focus();
  }
  if (a === "vnsave") return vendorSave();

  // receipt type
  if (a === "rcmode") {
    const m = d.m;
    if (m === R.mode) return;
    // LPO lines only belong to an LPO receipt; hand-entered lines only to a direct one.
    if (R.mode === "lpo" || m === "lpo") {
      if (R.lines.length)
        toast("The lines were cleared: LPO and direct receipts are entered separately.");
      Object.assign(R, { lines: [], lpo: null, lpoPick: "", sup: m === "lpo" ? "" : R.sup });
      if (R.mode === "lpo") R.sup = "";
    }
    R.mode = m;
    if (m === "sp") R.sp = pick(R.sp, ALLD);
    return all();
  }

  // entry row and grid
  if (a === "rcfind") {
    const t = itemNorm(R.eName),
      k =
        rcExact(R.eName) ||
        rcKeys().find(
          x =>
            t && (itemNorm(itemInfo(x).name).includes(t) || itemNorm(itemInfo(x).code).includes(t))
        );
    if (!k) {
      const other = pickKeys().find(x => t && itemNorm(itemInfo(x).name).includes(t));
      if (other && isStore(dest))
        return toast(
          `${itemInfo(other).name} isn't kept in ${dest}. Choose its store, or add ${itemInfo(other).group || "its category"} to ${dest} in Inventory → Stores.`
        );
      return toast("No item matches. Use New item to add it.");
    }
    rcPick(k);
    const q = $("#rcQty");
    return q && q.focus();
  }
  if (a === "rcby") {
    const was = R.eUnits;
    R.eUnits = d.v === "buy" ? "buy" : "uom";
    if (R.eUnits === "buy" && !R.eBox) R.eBox = "Crate";
    // The price follows: a box costs as many pieces as it holds.
    const per = parseFloat(R.ePer),
      p = parseFloat(R.ePrice);
    if (was !== R.eUnits && p > 0 && per > 0)
      R.ePrice = String(Math.round((R.eUnits === "buy" ? p * per : p / per) * 100) / 100);
    else if (was !== R.eUnits && R.eK && rcPiecePrice(R.eK))
      R.ePrice =
        R.eUnits === "buy"
          ? per > 0
            ? String(Math.round(rcPiecePrice(R.eK) * per * 100) / 100)
            : ""
          : String(Math.round(rcPiecePrice(R.eK) * 100) / 100);
    all();
    const n = $(R.eUnits === "buy" && !(per > 0) ? "#rcPer" : "#rcQty");
    return n && n.focus();
  }
  if (a === "rcadd") {
    if (R.mode === "lpo") return toast("LPO lines come from the purchase order.");
    const k = R.eK || rcExact(R.eName),
      qty = parseFloat(R.eQty),
      price = parseFloat(R.ePrice),
      rate = parseFloat(R.eTax);
    if (!k) return toast("Choose an item (type its name, then Find).");
    if (!(qty > 0)) return toast("Enter the quantity received.");
    if (!(price >= 0) || R.ePrice === "") return toast("Enter the price.");
    if (!(rate >= 0)) return toast("The tax rate must be 0 or more.");
    if (R.eExp && R.eExp < todayYmd()) return toast("That expiry date has already passed.");
    const u = itemInfo(k),
      isBuy = R.eUnits === "buy",
      per = parseFloat(R.ePer),
      box = (R.eBox || "Crate").trim();
    if (isBuy && !(per > 0)) {
      const p = $("#rcPer");
      if (p) p.focus();
      return toast(`Enter how many ${u.uom} are in one ${box.toLowerCase()}.`);
    }
    R.lines.push({
      k,
      isBuy,
      units: isBuy ? `${box} of ${qn(per)} ${u.uom}` : u.uom,
      per: isBuy ? per : undefined,
      box: isBuy ? box : undefined,
      unitPrice: price,
      qty,
      taxRate: rate,
      batch: R.eBatch.trim(),
      expiry: R.eExp,
      sel: false
    });
    Object.assign(R, {
      eK: "",
      eName: "",
      eBatch: "",
      eExp: "",
      eUnits: "buy",
      ePer: "",
      ePrice: "",
      eQty: ""
    });
    all();
    const n = $("#rcName");
    return n && n.focus();
  }
  if (a === "rcdel") {
    const n = R.lines.filter(l => l.sel).length;
    if (!n) return toast("Tick the lines to delete first.");
    R.lines = R.lines.filter(l => !l.sel);
    toast(n + " line(s) removed.");
    return all();
  }
  if (a === "rcedit") {
    const k = R.eK || (R.lines.find(l => l.sel) || {}).k;
    if (!k) return toast("Choose an item in Item, or tick a line, then Edit item.");
    const u = itemInfo(k);
    invF.it = {
      ...blankItemForm(isStore(dest) ? dest : STORES[0]),
      open: true,
      edit: k,
      name: u.name,
      code: u.code,
      group: u.group,
      uom: u.uom,
      buyUnit: u.buyUnit,
      perBuy: String(u.perBuy),
      buyPrice: String(u.buyPrice),
      reorder: RO[k] !== undefined ? String(RO[k]) : ""
    };
    return itOpened();
  }
  if (a === "rcvat") {
    R.incl = d.v === "1";
    return all();
  }
  if (a === "rcexit") {
    invF.rc = rcBlank({ date: R.date, mode: R.mode, sp: R.sp, dept: R.dept });
    return all();
  }

  // copy what open requisitions need but this store does not have (direct receipts into a store)
  if (a === "rccopy") {
    const need = {};
    REQS.filter(r => (r.store || STORES[0]) === dest && isOpenReq(r)).forEach(r =>
      r.lines.forEach(x => (need[x.k] = (need[x.k] || 0) + Math.max(0, x.q - x.issued)))
    );
    let n = 0;
    Object.entries(need).forEach(([k, q]) => {
      const short = q - Math.max(0, have(dest, k));
      if (short <= 1e-9 || R.lines.some(l => l.k === k)) return;
      const u = itemInfo(k);
      R.lines.push({
        k,
        isBuy: false,
        units: u.uom,
        unitPrice: +u.perBuy ? +u.buyPrice / +u.perBuy : 0,
        qty: Math.round(short * 1000) / 1000,
        taxRate: itemTaxRate(k),
        batch: "",
        expiry: "",
        sel: false
      });
      n++;
    });
    toast(
      n
        ? `${n} item(s) copied: what open requisitions need beyond the stock in ${dest}.`
        : "Open requisitions to this store are fully covered by its stock."
    );
    return all();
  }

  if (a === "rcdnsame") {
    if (!R.inv.trim()) return toast("Enter the invoice number first.");
    R.dnote = R.inv;
    return all();
  }
  // post
  if (a === "rcpost") {
    if (R.mode === "lpo" && !R.lpo) return toast("Choose the purchase order being received.");
    if (R.mode === "sp" ? !ALLD.includes(dest) : !isStore(dest))
      return toast(
        R.mode === "sp" ? "Choose the receiving selling point." : "Choose the receiving store."
      );
    if (!R.lines.length) return toast("Add at least one item to the list.");
    if (!R.date || R.date > todayYmd()) return toast("The date cannot be in the future.");
    // A supplier's invoice or delivery note is received once only (named suppliers only).
    const sup = rcSupplier(R),
      same = (x, y) => x && y && x.trim().toLowerCase() === y.trim().toLowerCase(),
      named = sup !== "Cash purchase",
      dupInv = named && GRNS.find(g => g.sup === sup && same(g.inv, R.inv)),
      dupDn = named && GRNS.find(g => g.sup === sup && same(g.dnote, R.dnote));
    if (dupInv)
      return toast(
        `Invoice ${R.inv.trim()} from ${sup} was already received on ${dt2(dupInv.at)} (${dupInv.id}).`
      );
    if (dupDn)
      return toast(
        `Delivery note ${R.dnote.trim()} from ${sup} was already received on ${dt2(dupDn.at)} (${dupDn.id}).`
      );
    // The paperwork has to be complete, and the invoice has to agree with what was received.
    if (!R.inv.trim()) return toast("Enter the invoice number.");
    if (!R.dnote.trim())
      return toast("Enter the delivery note number. It can be the same as the invoice number.");
    if (R.invAmt === "") return toast("Enter the invoice amount.");
    const gross = rcGross(R);
    if (Math.abs(+R.invAmt - gross) >= 0.01)
      return toast(
        `The invoice says KES ${m2(+R.invAmt)} but the items come to KES ${m2(gross)}. They must match before posting.`
      );
    return rcPost();
  }
  if (a === "rcissue") {
    if (!R.lastGrn) return;
    STKT.loc = R.lastGrn.store;
    invF.is = {
      from: R.lastGrn.store,
      to: pick(invF.is.to, ALLD),
      note: "From " + R.lastGrn.id,
      lines: R.lastGrn.lines.map(x => ({ k: x.k, q: x.q, c: 0 }))
    };
    invT = "issue";
    return go("Inventory"); // issuing to selling points is an Inventory job
  }
}

function rcPost() {
  const R = invF.rc,
    dest = rcDest(R),
    sup = rcSupplier(R),
    now = new Date(),
    at =
      R.date === todayYmd()
        ? now
        : new Date(`${R.date}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:00`);
  const learnt = [];
  R.lines.forEach(L => {
    if (!L.isBuy || !(+L.per > 0) || L.lpoLine !== undefined) return;
    const u = itemInfo(L.k);
    if (+u.perBuy === +L.per && u.buyUnit === L.box) return;
    lpoKeepUnits(L.k);
    if (!INGU[L.k]) INGU[L.k] = { ...u };
    INGU[L.k].perBuy = +L.per;
    INGU[L.k].buyUnit = L.box;
    learnt.push(`${u.name}: one ${L.box.toLowerCase()} holds ${qn(+L.per)} ${u.uom}`);
  });
  const lines = R.lines.map(L => {
    const u = itemInfo(L.k),
      c = rcCalc(L.unitPrice, L.qty, L.taxRate, R.incl),
      q = L.isBuy ? L.qty * (+L.per || +u.perBuy) : L.qty;
    return {
      k: L.k,
      q,
      cost: q > 0 ? c.net / q : 0, // stock is valued excluding VAT
      buyPrice: (L.isBuy ? L.unitPrice / (+L.per || +u.perBuy) : L.unitPrice) * +u.perBuy,
      units: L.units,
      unitPrice: L.unitPrice,
      qty: L.qty,
      net: c.net,
      tax: c.tax,
      gross: c.gross,
      batch: L.batch,
      expiry: L.expiry,
      lpoLine: L.lpoLine,
      qtyBuy: L.lpoLine !== undefined ? q / (+L.per || 1) : q / +u.perBuy
    };
  });
  const r = receiveLines(dest, lines, sup, R.inv || R.dnote, R.lpo || "", {
    at: at.toISOString(),
    mode: RC_MODE_LABEL[R.mode],
    dnote: R.dnote.trim(),
    inv: R.inv.trim(),
    invAmt: R.invAmt === "" ? 0 : +R.invAmt,
    narr: R.narr.trim()
  });
  // Receiving against an LPO moves it on.
  if (R.lpo) {
    const p = LPOS.find(x => x.id === R.lpo);
    if (p) {
      lines.forEach(L => {
        if (L.lpoLine !== undefined && p.lines[L.lpoLine]) p.lines[L.lpoLine].recv += L.qtyBuy;
      });
      p.status = p.lines.every(x => x.recv >= x.qty - 1e-9) ? "Received" : "Partly received";
    }
  }
  const gross = lines.reduce((a, L) => a + L.gross, 0),
    intoStore = isStore(dest);
  invF.rc = rcBlank({
    date: R.date,
    mode: R.mode,
    sp: R.sp,
    dept: R.dept,
    // Goods in a store can be issued on to selling points; goods received at a selling point are already there.
    lastGrn: intoStore
      ? { id: r.id, store: dest, lines: r.lines.map(x => ({ k: x.k, q: x.q })) }
      : null
  });
  if (learnt.length)
    auditAdd("Stock item", `Box size set when receiving: ${learnt.join("; ")}`, {
      mod: "Inventory"
    });
  docOpen("grn", r.id);
  bosave();
  toast(
    `${r.id} posted: ${lines.length} item(s) into ${dest}, KES ${m2(gross)}.${R.lpo ? " " + R.lpo + " updated." : ""}${learnt.length ? " Remembered: " + learnt.join("; ") + "." : ""}${intoStore ? " Stock is kept in pieces: use Issue items to send them on." : ""}`
  );
  all();
}

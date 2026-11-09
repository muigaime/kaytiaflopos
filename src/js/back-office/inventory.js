// ---- inventory: stores, item setup, receive, purchase orders, requisitions, issue, damage, stock master ----
// Stores (STORES) hold purchased stock. Selling points (ALLD) get stock from a store by requisition or issue.
let invT = "home",
  invSdOpen = false,
  invPoNew = false;
const invF = {
    rc: { store: STORES[0], sup: "", ref: "", lines: [] },
    rq: { dept: ALLD[0], store: STORES[0], note: "", lines: [] },
    is: { from: STORES[0], to: "", note: "", lines: [] },
    dm: { loc: STORES[0], k: "", q: "", why: "Damaged" },
    st: { name: "" },
    po: { store: STORES[0], sup: "", due: "", note: "", lines: [] },
    // Item setup: create / edit form (edit = key being edited) and the "send stock to a store" form.
    it: {
      edit: null,
      name: "",
      code: "",
      group: "",
      uom: "pcs",
      buyUnit: "",
      perBuy: "1",
      buyPrice: "",
      reorder: "",
      store: STORES[0],
      qty: "",
      sup: ""
    },
    // Item setup → Send stock to a selling point
    sd: {
      k: "",
      sp: ALLD[0],
      store: "",
      qty: "",
      unit: "buy",
      name: "",
      price: "",
      per: "1",
      tax: "B"
    }
  },
  invR = [addDays(todayYmd(), -29), todayYmd()];
const fq = n =>
    (Math.round(n * 1000) / 1000).toLocaleString("en-KE", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }),
  iN = k => ING[k] || k,
  // A converted item costs its share of the bottle it comes from.
  cst = k => {
    const c = stockConvs()[k];
    return c ? ((INGC[c.from] || 0) * c.pq) / c.y : INGC[k] || 0;
  },
  have = (l, k) => STK[l][k] || 0,
  nid = p => p + "-" + Date.now().toString(36).slice(-5).toUpperCase(),
  dt2 = t => {
    const d = new Date(t);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + hm(d);
  };
const optK = (s0, place) =>
    pickKeys()
      .filter(k => !place || storeHolds(place, k))
      .map(k => `<option value="${k}" ${k === s0 ? "selected" : ""}>${esc(ING[k])}</option>`)
      .join(""),
  optL = (s0, ex) =>
    LOCS.filter(l => l !== ex)
      .map(l => `<option ${l === s0 ? "selected" : ""}>${esc(l)}</option>`)
      .join(""),
  /** <option>s for a list (stores, selling points...). */
  opts = (list, s0) =>
    list.map(l => `<option ${l === s0 ? "selected" : ""}>${esc(l)}</option>`).join(""),
  /** A saved choice that no longer exists falls back to the first in the list. */
  pick = (v, list) => (list.includes(v) ? v : list[0]);
// ---- item setup: units of measure, buying unit and price ----
const UOMS = [
    "pcs",
    "ml",
    "L",
    "g",
    "kg",
    "bottle",
    "can",
    "packet",
    "tray",
    "roll",
    "box",
    "dozen"
  ],
  BUY_UNITS = [
    "Piece",
    "Bottle",
    "Can",
    "Crate",
    "Carton",
    "Case",
    "Bag",
    "Box",
    "Packet",
    "Tray",
    "Dozen",
    "Sack",
    "Jerrycan"
  ],
  ITEM_GROUPS = [
    "Raw materials",
    "Beverages",
    "Spirits",
    "Food",
    "Dry goods",
    "Cleaning",
    "Packaging",
    "Other"
  ];
/** An item's tax, from Item setup. Items saved before this option are VAT, the way receiving treated them. */
const itemTax = k => itemInfo(k).tax || "B";
const itemTaxRate = k => TAX[itemTax(k)];
const itemTaxLabel = k => (taxChoices().find(x => x[0] === itemTax(k)) || [])[1] || "";
/** Item setup details. Items made before Item setup existed get defaults from their name, e.g. "Whiskey (ml)" -> ml. */
const itemInfo = k => {
  if (INGU[k]) return INGU[k];
  const label = ING[k] || k,
    m = /\(([^)]+)\)\s*$/.exec(label),
    uom = m ? m[1] : "pcs";
  return {
    code: "",
    name: label.replace(/\s*\([^)]*\)\s*$/, ""),
    group: "Raw materials",
    uom,
    buyUnit: uom,
    perBuy: 1,
    buyPrice: INGC[k] || 0
  };
};
const itemKey = name => {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "item";
  let k = base,
    i = 2;
  while (ING[k] !== undefined) k = base + "_" + i++;
  return k;
};
const nextItemCode = () => {
  const used = new Set(Object.values(INGU).map(u => u.code));
  let n = Object.keys(INGU).length + 1;
  while (used.has("IT" + String(n).padStart(4, "0"))) n++;
  return "IT" + String(n).padStart(4, "0");
};
/** Names compare without case, spaces or punctuation: "Tusker Lager 500ml" = "tusker-lager 500 ML". */
const itemNorm = s =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
/** Why an item name / code can't be used (it must be unique in the Stock Master), or "" if it can. */
function itemDuplicate(name, code, exceptKey) {
  const n = itemNorm(name),
    c = String(code || "")
      .trim()
      .toUpperCase();
  for (const k of Object.keys(ING)) {
    if (k === exceptKey) continue;
    const u = itemInfo(k);
    if (n && itemNorm(u.name) === n)
      return `Already in the Stock Master: ${u.name}${u.code ? " (" + u.code + ")" : ""}. Use Edit on it instead.`;
    if (c && u.code && u.code.toUpperCase() === c)
      return `Item code ${c} is already used by ${u.name}.`;
  }
  return "";
}
/** Has this item ever had stock or a movement? Then its unit of measure is fixed. */
const MASTER_ALL = "All stores";
const itemUsed = k => tot(k) !== 0 || MOV.some(m => m.k === k);
/** Plain quantity: 5, 2.5, 1,200 (no padded decimals). */
const qn = n => (Math.round(n * 1000) / 1000).toLocaleString("en-KE", { maximumFractionDigits: 3 });
const buyLabel = u =>
  +u.perBuy === 1 && u.buyUnit === u.uom ? u.uom : `${u.buyUnit} of ${+u.perBuy} ${u.uom}`;
/** Records a stock movement together with the item's cost at that moment, so reports value issues,
 *  transfers and damages at what the stock cost then (not at today's cost). */
function mvc(loc, k, q, t, note, peer, ref, by) {
  mv(loc, k, q, t, note, peer, ref, by);
  MOV[MOV.length - 1].c = cst(k);
}
/** Goods received into a store: one GRN for all lines. Item cost becomes the weighted average.
 *  A line is either { k, qtyBuy, price } (buying units, price per buying unit; 0 = keep the current cost)
 *  or { k, q, cost } (stock units, cost per stock unit excl. VAT) with optional
 *  { buyPrice, batch, expiry, units, unitPrice, qty, net, tax, gross } from the Direct Receive form.
 *  meta: optional GRN header { at, dnote, inv, invAmt, narr }. */
function receiveLines(store, lines, sup, ref, lpo, meta = {}) {
  // Goods come into a store, or straight into a selling point (Purchasing → Direct to selling point).
  if (!LOCS.includes(store)) throw new Error("Unknown place to receive into: " + store);
  const id = nid("GRN"),
    out = [];
  lines.forEach(L => {
    const k = L.k,
      u = { ...itemInfo(k) },
      q = L.q !== undefined ? L.q : L.qtyBuy * u.perBuy,
      given = L.cost !== undefined ? L.cost : L.price > 0 ? L.price / u.perBuy : 0,
      newCost = given > 0 ? given : cst(k),
      onHand = Math.max(0, tot(k));
    INGC[k] = onHand > 0 && cst(k) > 0 ? (onHand * cst(k) + q * newCost) / (onHand + q) : newCost;
    const buyPrice = L.buyPrice !== undefined ? L.buyPrice : L.price;
    if (buyPrice > 0) u.buyPrice = buyPrice;
    INGU[k] = u;
    mv(store, k, q, "RECEIVE", "GRN " + id + " · " + (sup || "Item setup"), "", id, boUser.n);
    MOV[MOV.length - 1].c = newCost;
    out.push({
      k,
      q,
      c: newCost,
      buyQty: L.qtyBuy,
      buyUnit: u.buyUnit,
      buyPrice,
      ...(L.units !== undefined
        ? {
            units: L.units,
            unitPrice: L.unitPrice,
            qty: L.qty,
            net: L.net,
            tax: L.tax,
            gross: L.gross,
            batch: L.batch || "",
            expiry: L.expiry || ""
          }
        : {})
    });
  });
  const totals = out.reduce(
    (a, x) => ({
      net: a.net + (x.net || 0),
      tax: a.tax + (x.tax || 0),
      gross: a.gross + (x.gross || 0)
    }),
    { net: 0, tax: 0, gross: 0 }
  );
  GRNS.push({
    id,
    at: meta.at || new Date().toISOString(),
    sup: sup || "Item setup",
    ref: ref || "",
    lpo: lpo || "",
    by: boUser.n,
    store,
    ...(meta.inv !== undefined
      ? {
          mode: meta.mode || "",
          dnote: meta.dnote || "",
          inv: meta.inv || "",
          invAmt: meta.invAmt || 0,
          narr: meta.narr || "",
          ...totals
        }
      : {}),
    lines: out
  });
  return { id, lines: out };
}
/** Receive one item into a store, counted in buying units. */
function sendToStore(k, store, qtyBuy, pricePerBuy, sup, ref) {
  const r = receiveLines(store, [{ k, qtyBuy, price: pricePerBuy }], sup, ref);
  return { id: r.id, q: r.lines[0].q, uom: itemInfo(k).uom };
}
// The place chosen in the picker (STKT.loc) drives every tab. Tabs marked "store" only exist for stores:
// a selling point never receives, orders or issues stock; it requests it (requisition).
const RAIL = [
  ["h", "Stock"],
  ["stores", "Stores", "home"],
  ["master", "Stock Master", "box"],
  ["items", "Item setup", "plus"],
  ["cats", "Categories", "book"],
  ["h", "Moving stock"],
  ["req", "Requisitions", "book"],
  ["issue", "Issue", "cart", "store"],
  ["damage", "Damage", "alert"],
  ["appr", "Approvals", "shield"],
  ["h", "Reports"],
  ["track", "Item tracking", "truck"],
  ["riss", "Issues", "cart"],
  ["rdmg", "Damage report", "alert"],
  ["position", "Stock position", "chart"],
  ["spstock", "Selling point stock", "box"],
  ["variance", "Stock take variance", "chart"],
  ["streps", "Stock take reports", "book"],
  "-",
  ["exit", "Exit", "home"]
];
// What each screen is for, shown at the top of it.
const INV_PAGES = {
  stores: [
    "Stores",
    "The places that hold your stock. Selling points get their stock from a store."
  ],
  master: [
    "Stock Master",
    "Every item in the chosen store, with its balance. Count the stock and post a stock take here."
  ],
  items: [
    "Item setup",
    "Create each item once, then receive it into a store and issue it to a selling point."
  ],
  cats: ["Categories", "The groups your store items are sorted into."],
  req: ["Requisitions", "Stock requests from selling points, waiting to be approved and issued."],
  issue: ["Issue stock", "Send stock from a store to a selling point, without a requisition."],
  damage: ["Damage", "Write off stock that was broken, spoiled or lost."],
  appr: ["Approvals", "Stock movements waiting for a manager to agree."],
  track: [
    "Item tracking",
    "Follow one item from the day it was bought until now: where it went, who moved it and what's left."
  ],
  riss: ["Issues report", "Everything issued from the stores, for the dates you choose."],
  rdmg: ["Damage report", "Everything written off, for the dates you choose."],
  position: ["Stock position", "How much of each item you hold and what it's worth."],
  spstock: [
    "Selling point stock",
    "What each selling point is holding right now, and what it's worth at cost."
  ],
  variance: ["Stock take variance", "The differences between the system and what was counted."],
  streps: ["Stock take reports", "Stock takes already posted."]
};
// The chosen store only matters on these screens.
const INV_NO_STORE = ["stores", "items", "cats", "track", "spstock"];
const tabAllowed = t => {
  const x = RAIL.find(r => r !== "-" && r[0] === t);
  return boTabOk("inv", t) && (!x || x[3] !== "store" || isStore(STKT.loc));
};
// Approved requisitions ("Pending" = approved before approvals existed) can be issued.
const isOpenReq = r =>
  r.status === "Approved" || r.status === "Pending" || r.status === "Partly issued";
/** Requisitions that concern the selected place: sent TO it (store) or made BY it (selling point). */
const reqsHere = () =>
  REQS.filter(r => (isStore(STKT.loc) ? (r.store || STORES[0]) === STKT.loc : r.dept === STKT.loc));
/** RAIL as groups, each with only the screens this person can open. */
const invGroups = () => {
  const G = [];
  RAIL.forEach(x => {
    if (x === "-" || x[0] === "exit") return;
    if (x[0] === "h") G.push({ name: x[1], tabs: [] });
    else if (tabAllowed(x[0])) G[G.length - 1].tabs.push(x);
  });
  return G.filter(g => g.tabs.length);
};
const invBadge = t => {
  const n = t === "req" ? reqsHere().filter(isOpenReq).length : t === "appr" ? apCount() : 0;
  return n ? `<b>${n}</b>` : "";
};
/** Across the top: the groups, then the screens of the group you're in. G is [{ name, tabs: [[t, label, icon]] }]. */
function phMenu(G, cur, act, label, badge = () => "") {
  const attrs = typeof act === "function" ? act : t => `data-a="${act}" data-t="${t}"`,
    btn = (t, ic, l, on, extra = "") =>
      `<button class="${on ? "on" : ""}" ${attrs(t)} ${on ? 'aria-current="page"' : ""}>${I(ic)}<span>${l}</span>${extra}</button>`;
  return `<nav class="ph-tabs" aria-label="${label}">${btn("home", "home", "Overview", false)}${G.map(
    g =>
      btn(
        g.tabs[0][0],
        g.tabs[0][2],
        g.name,
        g.tabs.some(x => x[0] === cur)
      )
  ).join("")}</nav>${G.map(
    g =>
      `<nav class="ph-subs" aria-label="${g.name}" ${g.tabs.some(x => x[0] === cur) ? "" : "hidden"}>${g.tabs.map(x => btn(x[0], x[2], x[1], x[0] === cur, badge(x[0]))).join("")}</nav>`
  ).join("")}`;
}
const invMenu = () => phMenu(invGroups(), invT, "inv_tab", "Inventory", invBadge);
/** The overview: figures, the things people come here to do, then every screen by group. */
function invHomeHTML(popups) {
  const items = Object.keys(ING).filter(k => STORES.some(l => have(l, k) > 0)).length,
    low = lowCount(),
    openReq = REQS.filter(isOpenReq).length,
    wait = apCount(),
    ok = tabAllowed,
    many = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`,
    tab = t => `data-a="inv_tab" data-t="${t}"`,
    tile = (ic, l, v, s, t, warn) =>
      `<${t && ok(t) ? `button ${tab(t)}` : "div"} class="ph-t ${warn ? "ph-warn" : ""}"><span class="ph-i">${I(ic)}</span><span class="ph-l">${l}</span><b>${v}</b><small>${s}</small></${t && ok(t) ? "button" : "div"}>`,
    quick = (ic, l, t) =>
      ok(t) ? `<button class="ph-q" ${tab(t)}><span class="ph-i">${I(ic)}</span>${l}</button>` : "",
    card = x => {
      const meta =
        x[0] === "req" && openReq
          ? `${openReq} open`
          : x[0] === "appr" && wait
            ? `${wait} waiting`
            : x[0] === "master" && low
              ? `${many(low, "line")} low`
              : "";
      return `<button class="ph-c" ${tab(x[0])}><span class="ph-i">${I(x[2])}</span><span class="ph-b"><b>${x[1]}</b><span>${INV_PAGES[x[0]][1]}</span>${meta ? `<em>${meta}</em>` : ""}</span><span class="ph-ch">${I("chev")}</span></button>`;
    },
    tiles = [
      tile("box", "Items in stock", items, `Across ${many(STORES.length, "store")}`, "master"),
      ok("position")
        ? tile("wal", "Stock value", "KES " + m2(sum(STORES, storeValue)), "At cost", "position")
        : "",
      tile(
        "alert",
        "Low stock",
        low,
        low ? "Below the reorder level" : "All above reorder level",
        "master",
        low > 0
      ),
      tile(
        "shield",
        "Waiting for you",
        openReq + wait,
        `${many(openReq, "requisition")} · ${many(wait, "approval")}`,
        wait ? "appr" : "req",
        openReq + wait > 0
      )
    ].join("");
  return `<div class="ph"><div class="ph-h"><h1>Inventory</h1><p>Your stores, stock levels and every movement in one place.</p></div><div class="ph-ts">${tiles}</div><div class="ph-qs">${quick("plus", "New item", "items")}${quick("box", "Count stock", "master")}${quick("cart", "Issue stock", "issue")}${quick("book", "Requisition", "req")}</div>${invGroups()
    .map(
      g =>
        `<section class="ph-sec"><h2>${g.name}</h2><div class="ph-cs">${g.tabs.map(card).join("")}</div></section>`
    )
    .join("")}${popups}</div>`;
}
/** Store picker. Inventory is for stores only; selling points are managed under "Selling points". */
const strip = () => {
  const ks = pickKeys(),
    chip = l =>
      `<button class="sc2 ${l === STKT.loc && !(STKT.all && invT === "master") ? "on" : ""}" data-a="inv_loc" data-l="${esc(l)}"><span>${esc(l)}</span><small>${ks.filter(k => storeHolds(l, k) && have(l, k) > 0).length} of ${ks.filter(k => storeHolds(l, k)).length} items in stock</small></button>`;
  const allOn = invT === "master";
  return `<div class="stgw"><div class="stgh">Store</div><div class="stg">${allOn ? `<button class="sc2 ${STKT.all ? "on" : ""}" data-a="inv_locall"><span>${MASTER_ALL}</span><small>${STORES.length === 1 ? "1 store" : `${STORES.length} stores together`}</small></button>` : ""}${STORES.map(chip).join("")}</div></div>`;
};
/** "Main Store" / "Pool Bar (selling point)" as shown in headings. */
const placeLabel = l => `<b>${esc(l)}</b>${isStore(l) ? "" : " (selling point)"}`;
// ---- buying units on issue / request / transfer: type crates or pcs, stock moves in pcs ----
/** Units <select> for item k (buying unit first, e.g. "Crate (24 pcs)", then the unit of measure). */
const unitSel = (id, k, cur = "buy", attr = "") =>
  `<select id="${id}" ${attr}>${k ? rcUnitOpts(k, cur) : ""}</select>`;
/** Quantity typed in "buy" or "uom" units → units of measure. */
const toUnits = (k, q, unit) => (rcIsBuy(k, unit) ? q * +itemInfo(k).perBuy : q);
/** "48 pcs (2 Crate)": units of measure, with the buying units when the item has its own buying unit. */
const qtyBoth = (k, units) => {
  const u = itemInfo(k);
  return (
    `${qn(units)} ${u.uom}` + (rcIsBuy(k, "buy") ? ` (${qn(units / +u.perBuy)} ${u.buyUnit})` : "")
  );
};
/** Hint next to a line editor: what the place holds, in both units. */
const unitHint = (k, place) => (k && place ? `${place} has ${qtyBoth(k, have(place, k))}` : "");
function lineEd(f, cost) {
  const L = invF[f].lines;
  const place = f === "is" ? invF.is.from : "",
    allowed = pickKeys().filter(k => !place || storeHolds(place, k)),
    k0 = allowed.includes(invF[f].pick) ? invF[f].pick : allowed[0];
  return `<div class="fr" style="align-items:end"><label>Item<select id="l_k_${f}" data-unitfor="${f}">${optK(k0, place)}</select></label><label>Quantity<input id="l_q_${f}" type="number" min="0" step="any" placeholder="Qty"></label><label>Units${unitSel("l_u_" + f, k0)}</label>${cost ? `<label>Unit cost (KES)<input id="l_c_${f}" type="number" step="any" placeholder="Optional"></label>` : ""}<button class="mini" data-a="inv_ladd" data-f="${f}">Add line</button></div><div class="stk" id="l_h_${f}">${unitHint(k0, STKT.loc)}</div>${L.length ? `<div class="tw"><table class="t"><tr><th>Item</th><th class="n">Qty</th>${cost ? '<th class="n">Unit cost</th>' : ""}<th></th></tr>${L.map((x, i) => `<tr><td>${esc(iN(x.k))}</td><td class="n">${qtyBoth(x.k, x.q)}</td>${cost ? `<td class="n">${x.c ? m2(x.c) : "-"}</td>` : ""}<td><button class="mini" data-a="inv_ldel" data-f="${f}" data-i="${i}">✕</button></td></tr>`).join("")}</table></div>` : ""}`;
}
let msOffList = 0;
function mRows() {
  const loc = STKT.loc,
    // Stores hold stock items only; finished products exist only at selling points.
    kind = isStore(loc) ? "raw" : STKT.kind,
    t0 = new Date(STKT.since).getTime(),
    agg = {},
    // The categories ticked on the store decide what it lists. Anything it really holds always shows too.
    kinds = isStore(loc) ? storeKinds(loc) : [],
    inKind = k => storeHolds(loc, k);
  MOV.filter(m => m.loc === loc && m.at >= t0).forEach(m => {
    const a = (agg[m.k] = agg[m.k] || { add: 0, inn: 0, sold: 0, dmg: 0, out: 0, prod: 0 });
    // Added: received, plus stock adjustments (either way). Damages: written off as damaged only.
    if (m.t === "RECEIVE" || m.t === "ADJUST") a.add += m.q;
    else if (m.t === "ISSUE_IN" || m.t === "TRANS_IN") a.inn += m.q;
    else if (m.t === "SALE" || m.t === "SALE_RET") a.sold -= m.q;
    else if (m.t === "DAMAGE") a.dmg -= m.q;
    else if (m.t === "PROD_IN" || m.t === "PROD_OUT" || m.t === "CONVERT") a.prod += m.q;
    else if (m.t === "ISSUE_OUT" || m.t === "TRANS_OUT" || m.t === "RETURN") a.out -= m.q;
  });
  const mk = (code, name, cost, grp, price, k, div) => {
    const a = agg[k] || { add: 0, inn: 0, sold: 0, dmg: 0, out: 0, prod: 0 },
      sys = have(loc, k) / div,
      A = a.add / div,
      In = a.inn / div,
      So = a.sold / div,
      Dm = a.dmg / div,
      Ou = a.out / div,
      Pr = a.prod / div;
    return {
      code,
      name,
      cost,
      grp,
      price,
      k,
      div,
      key: kind + "|" + loc + "|" + k + "|" + code,
      op: sys - (A + In - So - Dm - Ou + Pr),
      add: A,
      prod: Pr,
      inn: In,
      sold: So,
      dmg: Dm,
      out: Ou,
      sys
    };
  };
  let R =
    kind === "raw"
      ? pickKeys().map((k, i) => {
          const u = itemInfo(k);
          return mk(u.code || 100 + i, iN(k), cst(k), u.group || "Raw materials", "", k, 1);
        })
      : ITEMS.filter(i => Object.keys(i.r).length === 1 && i.d === loc).map(i => {
          const k = Object.keys(i.r)[0],
            v = i.r[k];
          return mk(i.id, i.n, cst(k) * v, i.c, i.p, k, v);
        });
  const moved = r => Math.abs(r.sys) > 1e-9 || r.add || r.inn || r.sold || r.dmg || r.out || r.prod;
  // Only what's ticked on the store. Stock held outside that is counted so it can be pointed out, not lost.
  msOffList = kinds.length ? R.filter(r => !inKind(r.k) && Math.abs(r.sys) > 1e-9).length : 0;
  if (kinds.length && STKT.offAt !== loc) R = R.filter(r => inKind(r.k));
  if (!STKT.zero)
    R = R.filter(
      r =>
        moved(r) ||
        // A store lists its ticked categories even at zero. With none ticked, a new item shows until it's used.
        (isStore(loc) && kind === "raw" && (kinds.length ? inKind(r.k) : !itemUsed(r.k)))
    );
  if (STKT.issued) R = R.filter(r => r.inn > 0 || r.out > 0);
  return R;
}
// ---- Stock Master: tiles, quick filters and items grouped by category ----
const MS_STATUS = [
  ["all", "All"],
  ["in", "In stock"],
  ["low", "Low"],
  ["out", "Out of stock"]
];
const MS_COUNT = [
  ["todo", "Not counted"],
  ["var", "Has variance"]
];
/** Which store the Stock Master shows, for the full-screen view where the store cards are out of sight. */
const masterStorePick = () =>
  STKT.full
    ? `<label class="m-store">Store<select data-m="loc"><option ${STKT.all ? "selected" : ""}>${MASTER_ALL}</option>${STORES.map(l => `<option ${!STKT.all && l === STKT.loc ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`
    : "";
const msLevel = (k, units) => (units <= 1e-9 ? "out" : RO[k] && units <= RO[k] ? "low" : "in");
const msTag = l =>
  l === "out"
    ? '<span class="tag bad">Out</span>'
    : l === "low"
      ? '<span class="tag warn">Low</span>'
      : "";
const msCounted = r => {
  const p = STKT.phys[r.key];
  return p !== undefined && p !== "" && !isNaN(parseFloat(p));
};
const msVar = r => (msCounted(r) ? parseFloat(STKT.phys[r.key]) - r.sys : 0);
const msSigned = v => (v > 0 ? "+" : "") + qn(v);
const msTile = (l, v, id, cls, extra) =>
  `<div class="stm-tile ${cls || ""}"><span>${l}</span><b ${id ? `id="${id}"` : ""}>${v}</b>${extra || ""}</div>`;
function msPills(list, key, on, act) {
  return list
    .map(
      ([v, l, n]) =>
        `<button class="pr-pill ${on === v ? "on" : ""}" data-a="${act}" data-v="${esc(v)}">${esc(l)}${n === undefined ? "" : ` <small>${n}</small>`}</button>`
    )
    .join("");
}
/** The category chooser with how many items each holds. A category no longer listed falls back to All. */
function msCats(R) {
  const C = {};
  R.forEach(r => (C[r.grp || "Other"] = (C[r.grp || "Other"] || 0) + 1));
  if (STKT.grp && !C[STKT.grp]) STKT.grp = "";
  return `<label class="stm-cat">Category<select data-m="grp"><option value="">All (${R.length})</option>${Object.keys(
    C
  )
    .sort((a, b) => a.localeCompare(b))
    .map(
      g =>
        `<option value="${esc(g)}" ${STKT.grp === g ? "selected" : ""}>${esc(g)} (${C[g]})</option>`
    )
    .join("")}</select></label>`;
}
const msClosed = () => STKT.closed || (STKT.closed = {});
/** Each category is a thin heading that folds its rows away. */
function msBands(R, cols, row) {
  const G = {};
  R.forEach(r => (G[r.grp || "Other"] = G[r.grp || "Other"] || []).push(r));
  return Object.keys(G)
    .sort((a, b) => a.localeCompare(b))
    .map(g => {
      const L = G[g].sort((a, b) => a.name.localeCompare(b.name)),
        value = L.reduce((a, r) => a + r.value, 0);
      return `<tbody class="stm-g ${msClosed()[g] ? "closed" : ""}"><tr class="stm-band" data-a="inv_mband" data-v="${esc(g)}" title="Show or hide this category"${findAttr("master", g, ...L.map(r => `${r.code} ${r.name}`))}><td colspan="${cols}"><div class="stm-bd"><i aria-hidden="true">▾</i><b>${esc(g)}</b><span>${L.length} ${L.length === 1 ? "item" : "items"}</span><em>KES ${m2(value)}</em></div></td></tr>${L.map(row).join("")}</tbody>`;
    })
    .join("");
}
const msFold =
  '<span class="stm-fold"><button class="mini" data-a="inv_mbandall" data-v="1">Collapse all</button><button class="mini" data-a="inv_mbandall" data-v="">Expand all</button></span>';
/** Every store side by side. Counting is done one store at a time. */
function masterAllRows() {
  return pickKeys()
    .map(k => {
      const u = itemInfo(k),
        at = STORES.map(l => have(l, k)),
        q = at.reduce((a, x) => a + x, 0);
      return {
        k,
        code: u.code || "-",
        name: iN(k),
        grp: u.group || "Other",
        at,
        q,
        cost: cst(k),
        value: q * cst(k),
        level: msLevel(k, q)
      };
    })
    .filter(r => STKT.zero || r.at.some(x => Math.abs(x) > 1e-9));
}
function masterAllTable() {
  const R = masterAllRows().sort((a, b) => a.name.localeCompare(b.name));
  return {
    c: ["Code", "Item", "Group", ...STORES.map(l => "#" + l), "#Total", "#Cost", "#Value (KES)"],
    r: R.map(r => [r.code, r.name, r.grp, ...r.at.map(qn), qn(r.q), m2(r.cost), m2(r.value)]),
    total: R.reduce((a, r) => a + r.value, 0)
  };
}
function masterAllHTML() {
  const R = masterAllRows(),
    st = MS_STATUS.some(([v]) => v === STKT.st) ? STKT.st : "all",
    count = v => R.filter(r => r.level === v).length,
    cats = msCats(R),
    V = R.filter(r => (st === "all" || r.level === st) && (!STKT.grp || r.grp === STKT.grp)),
    value = R.reduce((a, r) => a + r.value, 0),
    cols = STORES.length + 4;
  return `<div class="pn stm ${STKT.full ? "mfull" : ""}" data-findscope>
 <div class="stm-tiles">${msTile("Stores", STORES.length)}${msTile("Items listed", R.length)}${msTile("Stock value (KES)", m2(value), "", "gold")}${msTile("Low or out", count("low") + count("out"), "", count("low") + count("out") ? "warn" : "")}</div>
 <div class="stm-bar">${masterStorePick()}${findBox("master", "Search by name, code or category")}${cats}<span class="stm-acts"><button class="mini xl-btn" data-a="inv_mallx">Export to Excel</button><button class="mini" data-a="inv_mallp">Print</button><button class="mini" data-a="inv_full">${STKT.full ? "⤡ Collapse" : "⤢ Expand"}</button></span></div>
 <div class="stm-filters"><div class="pr-pills">${msPills(
   MS_STATUS.map(([v, l]) => [v, l, v === "all" ? R.length : count(v)]),
   "st",
   st,
   "inv_mst"
 )}</div><span class="stm-sw"><label class="sw"><input type="checkbox" data-m="zero" ${STKT.zero ? "checked" : ""}><span>Zero balances</span></label>${msFold}</span></div>
 <div class="stk stm-note">Stock in every store. To count stock, choose one store.</div>
 <div class="tw tall"><table class="t stm-t ${(FINDQ.master || "").trim() ? "stm-find" : ""}"><thead><tr><th>Item</th>${STORES.map(l => `<th class="n">${esc(l)}</th>`).join("")}<th class="n">Total</th><th class="n">Cost</th><th class="n">Value (KES)</th></tr></thead>${
   V.length
     ? msBands(
         V,
         cols,
         r =>
           `<tr${findAttr("master", r.code, r.name, r.grp)}><td class="stm-item"><b>${esc(r.name)}</b><small>${esc(r.code)}</small></td>${r.at.map(x => `<td class="n">${qn(x)}</td>`).join("")}<td class="n"><b>${qn(r.q)}</b> ${msTag(r.level)}</td><td class="n">${m2(r.cost)}</td><td class="n">${m2(r.value)}</td></tr>`
       )
     : `<tr><td colspan="${cols}" class="stm-empty">Nothing matches. Try All, or tick Zero balances to list every item.</td></tr>`
 }</table></div></div>`;
}
function masterHTML() {
  if (STKT.all) return masterAllHTML();
  const R = mRows().map(r => {
      const units = r.sys * r.div;
      return { ...r, value: r.sys * r.cost, level: msLevel(r.k, units) };
    }),
    loc = STKT.loc,
    done = R.filter(msCounted).length,
    pct = R.length ? Math.round((done / R.length) * 100) : 0,
    os = openShifts(),
    sh = curDay() ? (os.length ? os.map(x => x.id).join(", ") : curDay().id) : "-",
    count = v => R.filter(r => r.level === v).length,
    value = R.reduce((a, r) => a + r.value, 0),
    varVal = R.reduce((a, r) => a + msVar(r) * r.cost, 0),
    st = STKT.st || "all",
    cats = msCats(R),
    V = R.filter(
      r =>
        (st === "all" ||
          r.level === st ||
          (st === "todo" && !msCounted(r)) ||
          (st === "var" && Math.abs(msVar(r)) > 1e-9)) &&
        (!STKT.grp || (r.grp || "Other") === STKT.grp)
    ),
    D = !!STKT.detail,
    cols = D ? 14 : 11;
  return `<div class="pn stm ${STKT.full ? "mfull" : ""}" data-findscope>
 <div class="stm-tiles">${msTile("Items listed", R.length)}${msTile("Stock value (KES)", m2(value), "", "gold")}${msTile("Low or out", count("low") + count("out"), "", count("low") + count("out") ? "warn" : "")}${msTile("Counted", `${done} of ${R.length}`, "msDone", "", `<div class="pbar"><i style="width:${pct}%"></i><span>${pct}%</span></div>`)}${msTile("Variance (KES)", (varVal > 0 ? "+" : "") + m2(varVal), "msVar", varVal < 0 ? "bad" : "")}</div>
 <div class="stm-bar">${masterStorePick()}${findBox("master", "Search by name, code or category")}${cats}${isStore(loc) ? "" : `<div class="seg2"><button class="${STKT.kind === "raw" ? "on" : ""}" data-a="inv_kind" data-k="raw">Stock items</button><button class="${STKT.kind === "fin" ? "on" : ""}" data-a="inv_kind" data-k="fin">Finished products</button></div>`}<span class="stm-acts"><button class="mini" data-a="inv_tab" data-t="load" title="Reload balances from the latest stock movements">Load data</button><button class="mini" data-a="inv_tab" data-t="export" title="Copy the sheet for Excel">Export</button><button class="mini" data-a="inv_full">${STKT.full ? "⤡ Collapse" : "⤢ Expand"}</button><button class="chip on" data-a="inv_tab" data-t="run" title="Post the physical counts">Run stock take</button></span></div>
 <div class="stm-filters"><div class="pr-pills">${msPills(
   [
     ...MS_STATUS.map(([v, l]) => [v, l, v === "all" ? R.length : count(v)]),
     ...MS_COUNT.map(([v, l]) => [v, l])
   ],
   "st",
   st,
   "inv_mst"
 )}</div><span class="stm-sw"><label class="sw"><input type="checkbox" data-m="zero" ${STKT.zero ? "checked" : ""}><span>Zero balances</span></label><label class="sw"><input type="checkbox" data-m="issued" ${STKT.issued ? "checked" : ""}><span>Issued only</span></label><label class="sw"><input type="checkbox" data-a="inv_mdetail" ${D ? "checked" : ""}><span>All movements</span></label>${msFold}</span></div>
 <div class="stk stm-note">Stock take for ${placeLabel(loc)} · Shift ${esc(sh)}.${isStore(loc) && storeKinds(loc).length ? ` Lists ${storeKinds(loc).map(esc).join(", ")} only.` : ""} Type a count, then press Enter for the next item.</div>${msOffList ? `<div class="status warn stm-off">${plural(msOffList, "item")} outside ${esc(loc)}'s categories still ${msOffList === 1 ? "has" : "have"} stock here. <button class="mini" data-a="inv_moff">${STKT.offAt === loc ? "Hide them" : "Show them"}</button></div>` : ""}
 <div class="tw tall"><table class="t stm-t ${(FINDQ.master || "").trim() ? "stm-find" : ""} ${D ? "stm-wide" : ""}"><thead><tr><th>Item</th><th class="n">Cost</th>${D ? '<th class="n">Sale price</th>' : ""}<th class="n">Opening</th>${D ? '<th class="n">Added</th><th class="n">Production</th><th class="n">Stock in</th><th class="n">Sold</th>' : '<th class="n">In</th><th class="n">Sold</th>'}<th class="n">Damages</th><th class="n">${D ? "Stock out" : "Issued out"}</th><th class="n">System</th><th class="stm-count">Physical</th><th class="n">Variance</th><th>Reason</th></tr></thead>${
   V.length
     ? msBands(V, cols, r => {
         const p = STKT.phys[r.key],
           has = msCounted(r),
           v = msVar(r),
           tint = has && v < -1e-9 ? "stm-short" : has && v > 1e-9 ? "stm-over" : "";
         return `<tr class="${tint}"${findAttr("master", r.code, r.name, r.grp)}><td class="stm-item"><b>${esc(r.name)}</b><small>${esc(r.code)}</small></td><td class="n">${m2(r.cost)}</td>${D ? `<td class="n">${r.price === "" ? "" : m2(r.price)}</td>` : ""}<td class="n">${qn(r.op)}</td>${D ? `<td class="n">${qn(r.add)}</td><td class="n">${qn(r.prod)}</td><td class="n">${qn(r.inn)}</td>` : `<td class="n">${qn(r.add + r.prod + r.inn)}</td>`}<td class="n">${qn(r.sold)}</td><td class="n"><input type="number" min="0" step="any" class="dmg-in" data-dm="${esc(r.key)}" value="${Math.abs(r.dmg) < 1e-9 ? "" : +r.dmg.toFixed(3)}" placeholder="0" title="Type the quantity damaged: the change is written off (the Reason is the narration)" aria-label="Damages of ${esc(r.name)}"></td><td class="n">${qn(r.out)}</td><td class="n stm-sys"><b>${qn(r.sys)}</b> ${msTag(r.level)}</td><td class="stm-count"><input type="number" step="any" data-ph="${esc(r.key)}" value="${p === undefined ? "" : esc(p)}" aria-label="Physical count of ${esc(r.name)}"></td><td class="n ${v < 0 ? "neg" : ""}" data-vr="${esc(r.key)}" data-sys="${r.sys}">${has ? msSigned(v) : ""}</td><td><input data-pn="${esc(r.key)}" value="${esc(STKT.narr[r.key] || "")}" placeholder="Reason" aria-label="Reason for ${esc(r.name)}"></td></tr>`;
       })
     : `<tr><td colspan="${cols}" class="stm-empty">Nothing matches. Try All, or tick Zero balances to list every item.</td></tr>`
 }</table></div></div>`;
}
/** A selling point asks a store for stock (raised from the Selling points page). lines: [{ k, q }] in units. */
function makeRequisition(dept, store, note, lines, by) {
  const r = {
    id: nid("REQ"),
    at: new Date().toISOString(),
    dept,
    store,
    by: by || boUser.n,
    note,
    status: AWAIT, // a manager approves it before the store can issue (approvals.js)
    lines: lines.map(x => ({ k: x.k, q: x.q, issued: 0 }))
  };
  REQS.push(r);
  bosave();
  return r;
}
invF.nrq = { open: false, to: "", store: "", note: "", pick: "", lines: [] };
/** Raise a requisition from the Back Office, for any selling point or department. */
function reqNewHTML(here) {
  const F = invF.nrq,
    can = boCan("inv.req");
  if (!can) return "";
  if (!F.open)
    return '<div class="pn"><div class="inv-head"><h4>Need stock from a store?</h4><button class="chip on" data-a="inv_nrq">New requisition</button></div></div>';
  F.to = pick(F.to, ALLD);
  F.store = pick(F.store || (isStore(here) ? here : ""), STORES);
  return `<div class="pn"><div class="inv-head"><h4>New requisition</h4><button class="mini" data-a="inv_nrq">Close</button></div>
  <div class="fr"><label>For<select data-iv="nrq.to">${opts(ALLD, F.to)}</select></label><label>From store<select data-iv="nrq.store">${opts(STORES, F.store)}</select></label><label>Note<input data-iv="nrq.note" value="${esc(F.note)}" placeholder="Optional"></label></div>
  ${prLineEditor("nrq", itemsByName(), "Item", "Quantity")}
  ${F.lines.length ? `<div class="tw"><table class="t"><tr><th>Item</th><th class="n">Quantity</th><th class="n">In ${esc(F.store)}</th><th></th></tr>${F.lines.map((x, i) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qtyBoth(x.k, x.q)}</td><td class="n">${qtyAt(F.store, x.k)}</td><td><button class="mini" data-a="rec_ldel" data-f="nrq" data-i="${i}">✕</button></td></tr>`).join("")}</table></div>` : ""}
  <div class="fr"><button class="chip on" data-a="inv_nrqgo">Send requisition</button></div></div>`;
}
function reqNewSend() {
  const F = invF.nrq;
  if (!F.lines.length) return toast("Add at least one item.");
  const r = makeRequisition(F.to, F.store, F.note.trim(), F.lines);
  auditAdd("Requisition", `${r.id} raised for ${F.to} from ${F.store}`);
  invF.nrq = { ...invF.nrq, open: false, note: "", lines: [] };
  toast(`Requisition ${r.id} sent for approval.`);
  all();
}
// The Front Desk raises requisitions and posts room expenses through these.
window.fdReqApi = {
  stores: () => STORES.slice(),
  items: () => itemsByName().map(k => ({ k, name: itemInfo(k).name, uom: itemInfo(k).uom })),
  make(dept, store, note, lines, by) {
    if (!ALLD.includes(dept)) {
      ALLD.push(dept);
      OUTLET_INFO[dept] = { type: DEPARTMENT, store };
      syncLocs();
    }
    const r = makeRequisition(dept, store, note, lines, by);
    auditAdd("Requisition", `${r.id} raised for ${dept} from ${store}`, {
      who: by,
      mod: "Front Desk"
    });
    return r.id;
  },
  list: depts =>
    REQS.filter(r => depts.includes(r.dept))
      .slice(-30)
      .reverse()
      .map(r => ({
        id: r.id,
        date: dateGB(ymdOf(r.at)),
        dept: r.dept,
        store: r.store,
        by: r.by,
        status: r.status,
        items: r.lines.map(l => `${itemInfo(l.k).name} ${qn(l.q)}`).join(", ")
      }))
};
window.fdHkStaff = () =>
  ADM.filter(a => {
    const role = a.role || SUPER;
    return (
      !a.off && roleHas(role, "fo.hk") && !roleHas(role, "fo.hksup") && !roleHas(role, "fo.desk")
    );
  }).map(a => a.n);
const RX_ACCOUNT = { "Linen and towels": "6220", "Cleaning supplies": "6210", Amenities: "6210" };
const RX_MONEY = { Cash: "1000", "M-Pesa": "1020", "On credit": "2000" };
/** A room expense goes into the books. "" when posted; otherwise why it couldn't be. */
window.fdRoomExpPost = x => {
  const from =
    RX_MONEY[x.paid] || (acMoney().find(a => /bank/i.test(a.name)) || { code: "1000" }).code;
  // Accounts records who posted; at the Front Desk nobody is signed in to the Back Office.
  const signedIn = boUser;
  boUser = boUser || { n: x.by };
  const err = acPost({
    date: x.bd,
    narr: `Room ${x.room}: ${x.kind}, ${x.desc}`,
    ref: x.id,
    src: "Expense",
    who: x.by,
    lines: [
      { a: RX_ACCOUNT[x.kind] || "6200", dr: x.amt, cr: 0 },
      { a: from, dr: 0, cr: x.amt }
    ]
  });
  boUser = signedIn;
  return err || "";
};
function reqHTML() {
  // Requisitions SENT TO the selected store. Selling points raise them on their own page (Selling points).
  const here = STKT.loc,
    store = true,
    act = isOpenReq,
    canIssue = r => act(r);
  const L = REQS.map((r, i) => [r, i]).filter(([r]) => reqsHere().includes(r));
  return `${reqNewHTML(here)}<div class="pn"><div class="stk">Requisitions sent to ${placeLabel(here)} by selling points. Approving one moves the stock. Anything the store was short of stays open here to issue when it arrives.</div></div>
 <div class="pn"><h4>${store ? "Requisitions to " : "Requisitions from "}${esc(here)}</h4>${
   L.length
     ? L.reverse()
         .map(([r, i]) => {
           const st = r.store || STORES[0];
           return `<details ${act(r) || r.status === AWAIT ? "open" : ""}><summary>${dt2(r.at)} · ${r.id} · ${esc(r.dept)} ← ${esc(st)} · by ${esc(r.by)} <span class="tag ${r.status === "Issued" ? "ok" : r.status === "Rejected" ? "bad" : "warn"}" style="float:right">${r.status}</span></summary><div style="padding:8px 0"><div class="tw"><table class="t"><tr><th>Item</th><th class="n">Requested</th><th class="n">Issued</th><th class="n">Awaiting approval</th><th class="n">In ${esc(st)}</th>${canIssue(r) ? "<th>Issue now (pcs)</th>" : ""}</tr>${r.lines.map((x, j) => `<tr><td>${esc(iN(x.k))}</td><td class="n">${qtyBoth(x.k, x.q)}</td><td class="n">${qtyBoth(x.k, x.issued)}</td><td class="n">${reqPend(r, x.k) ? qtyBoth(x.k, reqPend(r, x.k)) : ""}</td><td class="n">${qtyBoth(x.k, have(st, x.k))}</td>${canIssue(r) ? `<td><input type="number" step="any" id="iq_${i}_${j}" value="${Math.max(0, Math.min(x.q - x.issued - reqPend(r, x.k), have(st, x.k)))}"></td>` : ""}</tr>`).join("")}</table></div>${r.note ? `<div class="stk">${esc(r.note)}</div>` : ""}${apNote(r) ? `<div class="stk">${apNote(r)}</div>` : ""}${ISSUES.filter(
             x => x.req === r.id && x.status === AWAIT
           )
             .map(
               x =>
                 `<div class="fr" style="align-items:center"><span class="stk">Issue note <b>${esc(x.id)}</b> (${x.lines.map(l => qtyBoth(l.k, l.q)).join(", ")}) is waiting for approval.</span>${apButtons("iss", x)}</div>`
             )
             .join(
               ""
             )}${r.status === AWAIT ? `<div class="stk">Waiting for a manager to approve it before ${esc(st)} can issue.</div><div class="fr">${apButtons("req", r)}${docBtn("req", r.id, "View or print")}</div>` : canIssue(r) ? `<div class="fr"><button class="chip on" data-a="inv_rqissue" data-i="${i}">Issue stock</button><button class="mini" data-a="inv_rqrej" data-i="${i}">Reject</button>${docBtn("req", r.id, "View or print")}</div>` : `<div class="fr">${docBtn("req", r.id, "View or print")}</div>`}</div></details>`;
         })
         .join("")
     : '<div class="empty">No requisitions here yet.</div>'
 }</div>`;
}
const recent = (types, n) =>
  MOV.filter(m => types.includes(m.t))
    .slice()
    .reverse()
    .slice(0, n);
function issHTML() {
  const F = invF.is,
    L = recent(["ISSUE_OUT"], 15).filter(m => m.loc === STKT.loc);
  F.from = STKT.loc;
  // Until someone chooses, stock goes to the store's materials store first (Recipes & Production).
  F.to = ALLD.includes(F.to) ? F.to : issueDefault(F.from);
  return `<div class="pn"><h4>Issue stock from ${placeLabel(F.from)} to a selling point</h4><div class="fr"><label>Issue to selling point<select data-iv="is.to">${opts(ALLD, F.to)}</select></label><label>Note<input data-iv="is.note" value="${esc(F.note)}" placeholder="Optional"></label></div>${lineEd("is")}<button class="chip on" data-a="inv_isspost">${boCan("inv.approve") ? "Issue stock" : "Raise issue note"}</button><div class="stk">${boCan("inv.approve") ? "No requisition needed. The stock moves as soon as you issue it." : "No requisition needed. The stock moves when a manager approves the issue note."}</div></div>
 ${apIssueNotes(F.from)}
 <div class="pn tw"><h4>Recent issues</h4>${tb(
   ["Date", "Reference", "From", "To", "Item", "#Quantity", "By"],
   L.map(m => [dt2(m.at), m.ref, m.loc, m.peer, iN(m.k), fq(-m.q), m.by]),
   null,
   "No stock issued yet."
 )}</div>`;
}
/** Damages typed in the Stock Master: the change from what is already recorded is written off as a damage
 *  (or, when lowered, put back as a correction). The row's Narration is the reason. */
function masterDamage(inp) {
  const r = mRows().find(x => x.key === inp.dataset.dm);
  if (!r) return;
  const loc = STKT.loc,
    val = inp.value.trim() === "" ? 0 : parseFloat(inp.value),
    diff = val - r.dmg,
    q = diff * r.div,
    u = itemInfo(r.k);
  if (!(val >= 0)) {
    toast("Damages cannot be below zero.");
    return all();
  }
  if (Math.abs(diff) < 1e-9) return;
  if (q > have(loc, r.k) + 1e-9) {
    toast(`Only ${fq(have(loc, r.k) / r.div)} ${u.uom} of ${u.name} in ${loc}.`);
    return all();
  }
  const why = (STKT.narr[r.key] || "").trim() || "Damaged";
  mvc(loc, r.k, -q, "DAMAGE", diff > 0 ? why : "Correction (Stock Master)", "", "DMG", boUser.n);
  bosave();
  toast(
    diff > 0
      ? `${fq(diff)} ${u.uom} of ${u.name} written off as ${why}. Stock reduced.`
      : `Damage of ${u.name} lowered by ${fq(-diff)} ${u.uom}. Stock put back.`
  );
  all();
}
function dmgHTML() {
  const F = invF.dm,
    L = recent(["DAMAGE"], 15).filter(m => m.loc === STKT.loc);
  F.loc = STKT.loc;
  // A store lists only its own items, so a choice left over from another store can't stand.
  if (!pickKeys().some(k => k === F.k && storeHolds(F.loc, k)))
    F.k = pickKeys().find(k => storeHolds(F.loc, k)) || "";
  return `<div class="pn"><h4>Record damaged or wasted stock in ${placeLabel(F.loc)}</h4><div class="fr"><label>Item<select data-iv="dm.k">${optK(F.k, F.loc)}</select></label><label>Quantity<input data-iv="dm.q" type="number" step="any" value="${esc(F.q)}"></label><label>Reason<select data-iv="dm.why">${["Damaged", "Expired", "Spilled", "Spoiled", "Theft or loss", "Other"].map(x => `<option ${F.why === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><button class="chip on" data-a="inv_dmpost">Record damage</button></div></div>
 <div class="pn tw"><h4>Recent damages</h4>${tb(
   ["Date", "Location", "Item", "#Quantity", "Reason", "By"],
   L.map(m => [dt2(m.at), m.loc, iN(m.k), fq(-m.q), m.note, m.by]),
   null,
   "No damages recorded yet."
 )}</div>`;
}
function posHTML() {
  let val = 0;
  const rows = Object.keys(ING).map(k => {
    const t = tot(k),
      v = t * cst(k);
    val += v;
    return [iN(k), ...LOCS.map(l => fq(have(l, k))), fq(t), m2(cst(k)), m2(v)];
  });
  return `<div class="pn tw"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Stock position report</h4><span class="fr" style="flex:none;margin:0"><button class="mini xl-btn" style="flex:none" data-a="rep_xlsxpage" data-title="Stock position report" data-like="st_posprint">Export to Excel</button><button class="chip on" style="flex:none" data-a="st_posprint">Print</button></span></div>${tb(["Item", ...LOCS.map(l => "#" + l), "#Total", "#Unit cost", "#Value"], rows, ["Total stock value", ...LOCS.map(() => ""), "", "", m2(val)])}</div>`;
}
// ---- what each selling point is holding ----
invF.sps = { pt: "All", zero: false };
function spStockRows() {
  const F = invF.sps,
    P = salePoints();
  if (F.pt !== "All" && !P.includes(F.pt)) F.pt = "All";
  return (F.pt === "All" ? P : [F.pt])
    .flatMap(p =>
      pickKeys()
        .filter(k => F.zero || Math.abs(have(p, k)) > 1e-9)
        .map(k => {
          const u = itemInfo(k),
            q = have(p, k);
          return {
            p,
            k,
            code: u.code || "-",
            name: iN(k),
            grp: u.group || "Other",
            q,
            cost: cst(k),
            value: Math.max(0, q) * cst(k),
            level: msLevel(k, q)
          };
        })
    )
    .sort((a, b) => a.p.localeCompare(b.p) || a.name.localeCompare(b.name));
}
function spStockTable() {
  const R = spStockRows();
  return {
    title: "Selling point stock",
    head: `${invF.sps.pt === "All" ? "All selling points" : invF.sps.pt} · as at ${slashDate(todayYmd())} ${hm(new Date())}`,
    c: [
      "Selling point",
      "Code",
      "Item",
      "Category",
      "#Quantity",
      "#Cost",
      "#Value (KES)",
      "Status"
    ],
    r: R.map(r => [
      r.p,
      r.code,
      r.name,
      r.grp,
      qn(r.q),
      m2(r.cost),
      m2(r.value),
      r.level === "out" ? "Out" : r.level === "low" ? "Low" : "In stock"
    ]),
    f: ["Total", "", "", "", "", "", m2(R.reduce((a, r) => a + r.value, 0)), ""]
  };
}
function spStockHTML() {
  const F = invF.sps,
    P = salePoints(),
    R = spStockRows(),
    low = R.filter(r => r.level !== "in").length,
    pill = (v, l) =>
      `<button class="pr-pill ${F.pt === v ? "on" : ""}" data-a="inv_spspt" data-v="${esc(v)}">${esc(l)}</button>`,
    tools = boCan("rep.print")
      ? '<span class="inv-btns"><button class="mini xl-btn" data-a="inv_spsxl">Export to Excel</button><button class="chip on" style="flex:none" data-a="inv_spsprint">Print</button></span>'
      : "";
  return `<div class="stm-tiles">${msTile("Selling points", F.pt === "All" ? P.length : 1)}${msTile("Items held", new Set(R.filter(r => r.q > 0).map(r => r.k)).size)}${msTile("Value at cost", "KES " + m2(R.reduce((a, r) => a + r.value, 0)))}${msTile("Low or out", low, "", low ? "warn" : "")}</div>
  <div class="pn" data-findscope><div class="inv-head"><span class="pr-pills">${pill("All", "All")}${P.map(p => pill(p, p)).join("")}</span>${tools}</div>
  <div class="stm-bar">${findBox("sps", "Search item, code or category")}<label class="sw"><input type="checkbox" data-a="inv_spszero" ${F.zero ? "checked" : ""}><span>Zero balances</span></label></div>
  <div class="tw tall"><table class="t"><thead><tr><th>Selling point</th><th>Code</th><th>Item</th><th>Category</th><th class="n">Quantity</th><th class="n">Cost</th><th class="n">Value (KES)</th><th></th></tr></thead><tbody>${
    R.map(
      r =>
        `<tr${findAttr("sps", r.code, r.name, r.grp, r.p)}><td>${esc(r.p)}</td><td>${esc(r.code)}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.grp)}</td><td class="n">${qn(r.q)}</td><td class="n">${m2(r.cost)}</td><td class="n">${m2(r.value)}</td><td>${msTag(r.level)}</td></tr>`
    ).join("") ||
    '<tr><td colspan="8" class="stm-empty">No stock at these selling points. Tick Zero balances to list every item.</td></tr>'
  }</tbody></table></div></div>`;
}
// ---- stores ----
const storeValue = l => Object.keys(ING).reduce((a, k) => a + Math.max(0, have(l, k)) * cst(k), 0);
function storesHTML() {
  const reqOpen = l => REQS.filter(r => (r.store || STORES[0]) === l && isOpenReq(r)).length,
    lpoOpenN = l =>
      LPOS.filter(p => p.store === l && (p.status === "Open" || p.status === "Partly received"))
        .length,
    supplies = l => ALLD.filter(o => (OUTLET_INFO[o] || {}).store === l);
  return `<div class="pn tw"><div class="inv-head"><h4>Stores (${STORES.length})</h4><button class="chip on" data-a="inv_stnew">New store</button></div><table class="t"><tr><th>Store</th><th>Holds</th><th class="n">Items in stock</th><th class="n">Stock value (KES)</th><th>Supplies</th><th class="n">Open requisitions</th><th class="n">Open LPOs</th><th></th></tr>${STORES.map(
    l =>
      `<tr><td><b>${esc(l)}</b></td><td>${storeKindCell(l)}</td><td class="n">${Object.keys(ING).filter(k => have(l, k) > 0).length}</td><td class="n">${m2(storeValue(l))}</td><td>${esc(supplies(l).join(", ") || "-")}</td><td class="n">${reqOpen(l)}</td><td class="n">${lpoOpenN(l)}</td><td class="n"><span class="sp-acts"><button class="mini" data-a="inv_loc" data-l="${esc(l)}">Stock master</button><button class="mini" data-a="pur_go" data-l="${esc(l)}" data-t="receive">Receive</button><button class="mini" data-a="pur_go" data-l="${esc(l)}" data-t="lpo">LPO</button><button class="mini" data-a="inv_stedit" data-l="${esc(l)}">Edit</button><button class="mini cat-del" data-a="inv_stdel" data-l="${esc(l)}">Delete</button></span></td></tr>`
  ).join("")}</table></div>`;
}
/** A new store or selling point name must be unique across all places. */
function placeNameError(name) {
  if (!name) return "Enter a name.";
  if (name.length > 40) return "Keep the name under 40 characters.";
  if (/[<>"'`&\\]/.test(name)) return "Use letters, numbers, spaces and - . ( ) only.";
  if (/^all\b/i.test(name)) return "Choose another name.";
  if (LOCS.some(l => l.toLowerCase() === name.toLowerCase())) return name + " already exists.";
  return "";
}

// ---- local purchase orders ----
const lpoTotal = p => p.lines.reduce((a, x) => a + x.qty * x.price, 0),
  lpoOpen = p => p.status === "Open" || p.status === "Partly received";
function lpoHTML() {
  const F = invF.po,
    keys = pickKeys().sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name));
  F.store = STKT.loc;
  const tag = s => (s === "Received" ? "ok" : s === "Cancelled" || s === "Closed" ? "bad" : "warn"),
    mine = LPOS.map((p, i) => [p, i]).filter(([p]) => p.store === F.store);
  const showForm = invPoNew || F.lines.length > 0 || !mine.length;
  return `${
    showForm
      ? `<div class="pn"><h4>New local purchase order (LPO) for ${placeLabel(F.store)}</h4>
  <div class="fr"><label>Vendor<span class="fr" style="flex-wrap:nowrap"><select data-iv="po.sup"><option value="">Choose a vendor…</option>${[...new Set([...vendorNames(), ...(F.sup ? [F.sup] : [])])].map(s => `<option ${s === F.sup ? "selected" : ""}>${esc(s)}</option>`).join("")}</select><button class="mini" data-a="inv_vnopen" title="Add a vendor">+</button></span></label><label>Expected delivery<input type="date" data-iv="po.due" value="${esc(F.due)}"></label><label>Note<input data-iv="po.note" value="${esc(F.note)}" placeholder="Optional"></label></div>
  <div class="fr" style="align-items:end"><label>Item<select id="po_k">${keys.map(k => `<option value="${k}">${esc(itemInfo(k).name)} · ${esc(buyLabel(itemInfo(k)))}</option>`).join("")}</select></label><label>Quantity (buying units)<input id="po_q" type="number" min="0" step="any"></label><label>Price per buying unit (KES)<input id="po_p" type="number" min="0" step="any" placeholder="Last price"></label><button class="mini" data-a="inv_poladd">Add line</button></div>
  ${
    F.lines.length
      ? `<div class="tw"><table class="t"><tr><th>Item</th><th class="n">Quantity</th><th class="n">Price</th><th class="n">Total (KES)</th><th></th></tr>${F.lines.map((x, i) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qn(x.qty)} ${esc(itemInfo(x.k).buyUnit)}</td><td class="n">${m2(x.price)}</td><td class="n">${m2(x.qty * x.price)}</td><td><button class="mini" data-a="inv_poldel" data-i="${i}">✕</button></td></tr>`).join("")}<tr><td colspan="3"><b>Order total</b></td><td class="n"><b>${m2(lpoTotal(F))}</b></td><td></td></tr></table></div>`
      : ""
  }
  <div class="fr"><button class="chip on" data-a="inv_pomake">Create LPO</button><button class="mini" data-a="inv_ponew">Cancel</button></div></div>`
      : ""
  }
 <div class="pn"><div class="inv-head"><h4>Purchase orders for ${esc(F.store)}</h4>${showForm ? "" : '<button class="chip on" data-a="inv_ponew">New purchase order</button>'}</div>${
   mine.length
     ? mine
         .reverse()
         .map(
           ([p, i]) =>
             `<details ${lpoOpen(p) ? "open" : ""}><summary>${dt2(p.at)} · ${p.id} · ${esc(p.sup)} → ${esc(p.store)} · KES ${m2(lpoTotal(p))}${p.due ? " · due " + esc(p.due) : ""} <span class="tag ${tag(p.status)}" style="float:right">${p.status}</span></summary><div style="padding:8px 0"><div class="tw"><table class="t"><tr><th>Item</th><th class="n">Ordered</th><th class="n">Received</th><th class="n">Remaining</th><th class="n">Price</th><th class="n">Total (KES)</th>${lpoOpen(p) ? "<th>Receive now</th>" : ""}</tr>${p.lines
               .map((x, j) => {
                 const left = Math.max(0, x.qty - x.recv);
                 return `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qn(x.qty)} ${esc(itemInfo(x.k).buyUnit)}</td><td class="n">${qn(x.recv)}</td><td class="n">${qn(left)}</td><td class="n">${m2(x.price)}</td><td class="n">${m2(x.qty * x.price)}</td>${lpoOpen(p) ? `<td><input type="number" min="0" step="any" id="pr_${i}_${j}" value="${left}" style="max-width:110px"></td>` : ""}</tr>`;
               })
               .join(
                 ""
               )}</table></div>${p.note ? `<div class="stk">${esc(p.note)}</div>` : ""}${apNote(p) ? `<div class="stk">${apNote(p)}</div>` : p.status === AWAIT ? `<div class="stk">Waiting for a manager to approve it before it can be received.</div>` : ""}<div class="fr">${lpoOpen(p) ? `<input id="prf_${i}" placeholder="Delivery note / invoice no." style="max-width:220px"><button class="chip on" data-a="inv_porecv" data-i="${i}">Receive delivery</button><button class="mini" data-a="pur_rclpo" data-i="${i}" title="Receive with VAT, batch and expiry">Open in GRN</button>` : ""}${docBtn("lpo", p.id, "View, print or email")}${apButtons("lpo", p)}${p.status === "Open" || p.status === AWAIT ? `<button class="mini" data-a="inv_pocancel" data-i="${i}">Cancel LPO</button>` : ""}${p.status === "Partly received" ? `<button class="mini" data-a="inv_poclose" data-i="${i}">Close (no more deliveries)</button>` : ""}</div></div></details>`
         )
         .join("")
     : '<div class="empty">No purchase orders yet.</div>'
 }</div>`;
}
/** Live "cost per unit" and "= N units" hints, updated while typing (no full redraw). */
function itPreview() {
  const F = invF.it,
    c = $("#itCost"),
    dupEl = $("#itDup");
  if (dupEl) {
    // A recipe or attached product is not a new stock item, so it may share a stock item's name.
    const dup =
        itemMadeWay(F) === "recipe" || itemSpLink(F) ? "" : itemDuplicate(F.name, F.code, F.edit),
      named = F.name.trim() !== "";
    dupEl.textContent = dup
      ? "⚠ " + dup
      : named
        ? "✓ " + (F.edit ? "Name is unique" : "New, unique item")
        : "";
    dupEl.style.color = dup ? "var(--bad)" : "var(--ok)";
    const save = $("#itSave");
    if (save) save.disabled = !!dup || !named;
  }
  if (c) {
    const per = parseFloat(F.perBuy),
      price = parseFloat(F.buyPrice),
      uom = F.uom.trim() || "unit";
    c.textContent =
      String(F.buyPrice).trim() === ""
        ? "set when it is produced or received"
        : per > 0 && price >= 0
          ? `KES ${m2(price / per)} per ${uom}`
          : "-";
    const q = parseFloat(F.qty),
      e = $("#itEq");
    if (e) e.textContent = q > 0 && per > 0 ? `= ${qn(q * per)} ${uom}` : "";
    // Margin as the selling price is typed (one sale uses one unit of measure).
    const sell = parseFloat(F.spPrice),
      unit = per > 0 && price >= 0 ? price / per : null,
      mg = $("#itMargin");
    if (mg)
      mg.textContent =
        sell > 0 && unit !== null
          ? `Cost KES ${m2(unit)} per sale · margin ${Math.round(((sell - unit) / sell) * 100)}%`
          : "With a price it shows on this POS at once. One sale uses one unit of measure.";
  }
  const srcInfo = $("#itSrcInfo");
  if (srcInfo) srcInfo.textContent = itSrcHint(F);
  const S = invF.sd,
    info = $("#sdInfo");
  if (info) {
    const u = S.k && ING[S.k] !== undefined ? itemInfo(S.k) : null,
      q = parseFloat(S.qty),
      p = parseFloat(S.price),
      per = parseFloat(S.per),
      c = per > 0 ? cst(S.k) * per : 0;
    info.textContent = u
      ? `${S.store}: ${qtyBoth(S.k, have(S.store, S.k))} · ${S.sp}: ${qtyBoth(S.k, have(S.sp, S.k))}` +
        (q > 0 ? ` · sending ${qtyBoth(S.k, toUnits(S.k, q, S.unit))}` : "") +
        (p > 0 && c > 0
          ? ` · cost per sale KES ${m2(c)}, margin ${Math.round(((p - c) / p) * 100)}%`
          : "")
      : "Choose an item.";
  }
}
/** Suggestion lists used by the item popup (units, buying units, groups). */
function itemDatalists() {
  const dl = (id, L) =>
      `<datalist id="${id}">${L.map(x => `<option value="${esc(x)}">`).join("")}</datalist>`,
    groups = [
      ...new Set([
        ...groupList(),
        ...Object.values(INGU)
          .map(u => u.group)
          .filter(Boolean)
      ])
    ];
  return `${dl("uomL", UOMS)}${dl("buyL", [...new Set([...BUY_UNITS, ...UOMS])])}${dl("grpL", groups)}`;
}
/** The item popup when it is open (shared by Item setup and Receive). */
function itemPopupIfOpen() {
  const F = invF.it,
    editing = F.edit && ING[F.edit] !== undefined;
  return F.open ? itemDatalists() + itemPopup(F, editing, editing && itemUsed(F.edit)) : "";
}
function itemsHTML() {
  const F = invF.it,
    S = invF.sd,
    editing = F.edit && ING[F.edit] !== undefined,
    lockUom = editing && itemUsed(F.edit),
    keys = pickKeys().sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name));
  if (!S.k || ING[S.k] === undefined) S.k = keys[0] || "";
  return `${itemDatalists()}
 ${F.open ? itemPopup(F, editing, lockUom) : ""}
 ${invSdOpen ? sendPanel(S, keys) : ""}
 ${itemsTable(keys)}`;
}
/** The create / edit item popup. */
function itemPopup(F, editing, lockUom) {
  if (!editing && itemSpPoint(F)) return itemSpNewPopup(F); // selling-points.js
  const sp = editing ? "" : itemSpPoint(F),
    M = itemMadeWay(F),
    title = editing ? "Edit item" : sp ? "New product for " + esc(sp) : "New item",
    sub = editing
      ? esc(itemInfo(F.edit).name)
      : M
        ? "Made in-house, so there is nothing to buy."
        : sp
          ? "Saved once in the Stock Master, then stocked and sold here."
          : "Saved once in the Stock Master, ready to receive into any store.";
  return `<div class="modal show" id="itModal" style="z-index:60"><div class="box itm">
  <header class="itm-h"><div><h3>${title}</h3><p>${sub}</p></div><button class="itm-x" data-a="inv_itcancel" aria-label="Close">✕</button></header>
  <div class="itm-b" id="itBody">
   <section class="itm-s"><h4>Item details</h4>
    <div class="itm-g itm-gn">
     <label>Item name<input data-iv="it.name" id="itName" value="${esc(F.name)}" placeholder="e.g. Tusker Lager 500ml"></label>
     ${
       M === "recipe"
         ? ""
         : `<label>Item code<input data-iv="it.code" value="${esc(F.code)}" placeholder="${editing ? "" : nextItemCode()}"></label>
     <label>Category<input data-iv="it.group" list="grpL" value="${esc(F.group)}" placeholder="e.g. Beverages"></label>`
     }
    </div>
    <div class="itm-hint" id="itDup"></div>
    ${itemMadeTick(F, editing)}
   </section>
   ${
     M
       ? itemMadeSection(F, sp)
       : `<section class="itm-s"><h4>Units and cost</h4>
    <div class="itm-g itm-g6">
     <label>Unit of measure<input data-iv="it.uom" list="uomL" value="${esc(F.uom)}" placeholder="pcs, kg, ml" ${lockUom ? 'disabled title="This item already has stock or history, so its unit cannot change."' : ""}></label>
     <label>Buying unit<input data-iv="it.buyUnit" list="buyL" value="${esc(F.buyUnit)}" placeholder="e.g. Crate"></label>
     <label>Units per buying unit<input data-iv="it.perBuy" type="number" min="0" step="any" value="${esc(F.perBuy)}" placeholder="e.g. 24"></label>
     <label>Buying price (KES)<input data-iv="it.buyPrice" type="number" min="0" step="any" value="${esc(F.buyPrice)}" placeholder="Optional"></label>
     <label>Reorder level<input data-iv="it.reorder" type="number" min="0" step="any" value="${esc(F.reorder)}" placeholder="Optional"></label>
     <label>VAT / tax<select data-iv="it.tax">${taxChoices()
       .map(([v, l]) => `<option value="${v}" ${v === F.tax ? "selected" : ""}>${l}</option>`)
       .join("")}</select></label>
    </div>
    <div class="itm-hint">Cost per unit: <b id="itCost"></b>${lockUom ? " · The unit is fixed because this item already has stock or history." : ""}</div>
   </section>`
   }
   ${
     editing || M
       ? ""
       : sp
         ? itemSpSection(F)
         : `<section class="itm-s"><h4>Store that receives it</h4>
    <div class="itm-g itm-g3">
     <label>Store<select data-iv="it.store">${opts(STORES, (F.store = pick(F.store, STORES)))}</select></label>
     <label>Quantity received (buying units)<input data-iv="it.qty" type="number" min="0" step="any" value="${esc(F.qty)}" placeholder="Empty = item only"></label>
     <label>Vendor<input data-iv="it.sup" value="${esc(F.sup)}" placeholder="Optional"></label>
    </div>
    <div class="itm-hint" id="itEq"></div>
    <div class="itm-hint" id="itStoreNote">${esc(storeKindNote(F.store, F.group))}</div>
    <div class="itm-hint">Only selling it, with no stock kept? <button class="mini" data-a="prl_add" data-m="sell">Create a selling item instead</button></div>
   </section>${itemSellHTML(F)}`
   }
  </div>
  <footer class="itm-f"><button class="mini" data-a="inv_itcancel">Cancel</button><button class="chip on" id="itSave" data-a="inv_itsave">${editing ? "Save changes" : M === "recipe" ? "Continue to recipe" : M ? "Continue to production" : sp ? "Save product" : "Save item"}</button></footer>
 </div></div>`;
}
/** Send stock to a selling point: issue it from a store and, with a price, sell it on that POS. */
const sdProduct = (k, sp) =>
  ITEMS.find(i => i.d === sp && Object.keys(i.r).length === 1 && i.r[k] !== undefined);
function sendPanel(S, keys) {
  S.sp = pick(S.sp, ALLD);
  S.store = pick(S.store || spInfo(S.sp).store, STORES);
  const u = S.k ? itemInfo(S.k) : null,
    prod = S.k ? sdProduct(S.k, S.sp) : null;
  if (S.filled !== S.k + "|" + S.sp) {
    // New item / selling point: show the product already sold there, or a blank one.
    S.filled = S.k + "|" + S.sp;
    Object.assign(
      S,
      prod
        ? { name: prod.n, price: String(prod.p), per: String(prod.r[S.k]), tax: prod.t }
        : { name: "", price: "", per: "1", tax: itemTax(S.k) }
    );
  }
  return `<div class="pn" id="sdPanel"><div class="inv-head"><h4>Send stock to a selling point</h4><button class="mini" data-a="inv_sdtog">Close</button></div>
  <div class="stk">Issues the stock from a store to the selling point${isMaterials(S.sp) ? "" : " and puts it on that selling point's POS"}.</div>
  <div class="fr"><label>Item<select data-iv="sd.k">${keys.map(k => `<option value="${k}" ${k === S.k ? "selected" : ""}>${esc(itemInfo(k).name)} (${esc(itemInfo(k).uom)})</option>`).join("")}</select></label>
   <label>Selling point<select data-iv="sd.sp">${opts(ALLD, S.sp)}</select></label>
   <label>From store<select data-iv="sd.store">${STORES.map(l => `<option value="${esc(l)}" ${l === S.store ? "selected" : ""}>${esc(l)}${S.k ? ` · ${qn(have(l, S.k))} ${esc(u.uom)}` : ""}</option>`).join("")}</select></label>
   <label>Quantity<input data-iv="sd.qty" type="number" min="0" step="any" value="${esc(S.qty)}"></label>
   <label>Units<select data-iv="sd.unit">${u ? rcUnitOpts(S.k, S.unit) : ""}</select></label></div>
  ${
    isMaterials(S.sp)
      ? ""
      : `<h4 style="margin:6px 0 0">Sell it on the ${esc(S.sp)} POS</h4>
  <div class="fr"><label>Product name<input data-iv="sd.name" value="${esc(S.name)}" placeholder="${esc(u ? u.name : "")}" ${prod ? "disabled" : ""}></label>
   <label>Selling price (KES)<input data-iv="sd.price" type="number" min="0" step="any" value="${esc(S.price)}" placeholder="${prod ? "" : "Empty = stock only"}"></label>
   <label>One sale uses (${esc(u ? u.uom : "units")})<input data-iv="sd.per" type="number" min="0" step="any" value="${esc(S.per)}" ${prod ? "disabled" : ""}></label>
   <label>Tax<select data-iv="sd.tax" ${prod ? "disabled" : ""}>${taxChoices()
     .map(([v, l]) => `<option value="${v}" ${v === S.tax ? "selected" : ""}>${l}</option>`)
     .join("")}</select></label></div>`
  }
  <div class="stk" id="sdInfo"></div>
  <button class="chip on" data-a="inv_itsend">Send to ${esc(S.sp)}</button></div>`;
}
/** Item or selling point changed: redraw with that pair's product. */
function sdSync(f) {
  if (f !== "k" && f !== "sp") return;
  const S = invF.sd;
  if (f === "sp") S.store = spInfo(S.sp).store; // the selling point's own store
  S.filled = ""; // fill the product fields again
  all();
}
function itemsTable(keys) {
  return `<div class="pn tw"><div class="inv-head"><h4>Items in the Stock Master (${keys.length})</h4><span class="inv-btns">${invSdOpen ? "" : '<button class="mini" data-a="inv_sdtog">Send stock to a selling point</button>'}<button class="mini" data-a="prl_imp" data-k="stock">Import</button><button class="chip on" data-a="inv_itnew">+ New item</button></span></div><table class="t"><tr><th>Code</th><th>Item</th><th>Category</th><th>VAT / tax</th><th>Unit</th><th>Buying unit</th><th class="n">Buying price</th><th class="n">Cost / unit</th><th class="n">In stores</th><th class="n">At selling points</th><th></th></tr>${keys
    .map(k => {
      const u = itemInfo(k),
        all = tot(k),
        inStores = STORES.reduce((a, l) => a + have(l, k), 0);
      return `<tr ${k === invF.itLast ? 'style="outline:2px solid var(--brass, #c7a25a)"' : ""}><td>${esc(u.code || "-")}</td><td>${esc(u.name)}</td><td>${esc(u.group || "")}</td><td>${esc(itemTaxLabel(k))}</td><td>${esc(u.uom)}</td><td>${esc(buyLabel(u))}</td><td class="n">${m2(u.buyPrice)}</td><td class="n">${m2(cst(k))}</td><td class="n">${fq(inStores)}</td><td class="n ${all - inStores < 0 ? "neg" : ""}">${fq(all - inStores)}</td><td><div class="fr" style="flex-wrap:nowrap"><button class="mini" data-a="inv_itedit" data-k="${k}">Edit</button><button class="mini" data-a="inv_itpick" data-k="${k}">Send</button><button class="mini" data-a="trk_go" data-k="${k}">Track</button></div></td></tr>`;
    })
    .join("")}</table></div>`;
}
function invView() {
  const B = {
    stores: storesHTML,
    items: itemsHTML,
    cats: storeCatsHTML,
    master: masterHTML,
    req: reqHTML,
    issue: issHTML,
    damage: dmgHTML,
    position: posHTML,
    spstock: spStockHTML,
    riss: () => invReportHTML("iss"),
    rdmg: () => invReportHTML("dmg"),
    variance: varHTML, // stock-take-report.js
    track: itemTrackHTML,
    streps: stHistHTML,
    appr: apView // approvals.js
  };
  if (!isStore(STKT.loc)) STKT.loc = STORES[0]; // Inventory works on stores only
  if (invT !== "home" && (!tabAllowed(invT) || !B[invT]))
    invT = tabAllowed("master")
      ? "master"
      : RAIL.filter(x => x !== "-" && B[x[0]] && tabAllowed(x[0]))[0][0]; // e.g. LPO / purchases now live in Purchasing
  if (invT === "items") setTimeout(itPreview); // fill the live hints once the page is on screen
  // Popups that can be opened from more than one tab (Item setup draws its own item popup).
  const popups =
    (invT !== "items" ? itemPopupIfOpen() : "") +
    vendorPopupIfOpen() +
    stModalIfOpen() +
    apModalIfOpen() +
    storeModal() +
    storeDeleteModal();
  if (invT === "home") return invHomeHTML(popups);
  const [title, what] = INV_PAGES[invT] || ["Inventory", ""];
  return `<div class="inv invx inv-solo"><div class="inv-main">${invMenu()}<div class="inv-title"><h1>${title}</h1><p>${what}</p></div>${INV_NO_STORE.includes(invT) ? "" : strip()}${(B[invT] || masterHTML)()}${popups}${prImportModal()}</div></div>`;
}
V.inv = invView;
function updMaster() {
  document.querySelectorAll("#vSub [data-vr]").forEach(td => {
    const p = STKT.phys[td.dataset.vr],
      has = p !== undefined && p !== "" && !isNaN(parseFloat(p)),
      v = has ? parseFloat(p) - parseFloat(td.dataset.sys) : 0,
      tr = td.closest("tr");
    td.textContent = has ? msSigned(v) : "";
    td.classList.toggle("neg", has && v < 0);
    tr.classList.toggle("stm-short", has && v < -1e-9);
    tr.classList.toggle("stm-over", has && v > 1e-9);
  });
  // The tiles count every item in the store, including any a filter is hiding.
  const R = mRows(),
    n = R.filter(msCounted).length,
    pc = R.length ? Math.round((n / R.length) * 100) : 0,
    val = R.reduce((a, r) => a + msVar(r) * r.cost, 0),
    pb = document.querySelector("#vSub .pbar"),
    d = $("#msDone"),
    mv = $("#msVar");
  if (pb) {
    pb.firstElementChild.style.width = pc + "%";
    pb.lastElementChild.textContent = pc + "%";
  }
  if (d) d.textContent = `${n} of ${R.length}`;
  if (mv) {
    mv.textContent = (val > 0 ? "+" : "") + m2(val);
    mv.parentElement.classList.toggle("bad", val < 0);
  }
}
// Enter on a count goes straight to the next item.
$("#vSub").addEventListener("keydown", e => {
  if (e.key !== "Enter" || e.target.dataset.ph === undefined) return;
  e.preventDefault();
  const L = [...document.querySelectorAll("#vSub [data-ph]")].filter(x => x.offsetParent),
    next = L[L.indexOf(e.target) + 1];
  if (next) {
    next.focus();
    next.select();
  }
});
function invRun() {
  const R = mRows(),
    ch = R.filter(r => {
      const p = STKT.phys[r.key];
      return p !== undefined && p !== "" && !isNaN(parseFloat(p));
    });
  if (!ch.length) return toast("Enter at least one physical balance first.");
  const id = nid("ST"),
    lines = [],
    // Snapshot of the whole count sheet for the stock taking report (before the stock is adjusted).
    A = stMovesAll(STKT.loc, new Date(STKT.since).getTime()),
    rows = R.map(r => {
      const p = STKT.phys[r.key],
        has = p !== undefined && p !== "" && !isNaN(parseFloat(p));
      return stSnapRow(r, A, has ? parseFloat(p) : null, STKT.narr[r.key]);
    });
  ch.forEach(r => {
    const p = parseFloat(STKT.phys[r.key]),
      v = p - r.sys;
    lines.push({
      k: r.k,
      name: r.name,
      cost: r.cost,
      sys: r.sys,
      phys: p,
      v,
      narr: STKT.narr[r.key] || ""
    });
    if (Math.abs(v) > 1e-9)
      mv(STKT.loc, r.k, v * r.div, "ADJUST", "Stock take " + id, "", id, boUser.n);
  });
  COUNTS.push({
    id,
    at: new Date().toISOString(),
    loc: STKT.loc,
    kind: STKT.kind,
    by: boUser.n,
    from: STKT.since,
    lines,
    rows
  });
  STKT.since = new Date(Date.now() + 2).toISOString();
  STKT.phys = {};
  STKT.narr = {};
  bosave();
  toast(
    "Stock take " +
      id +
      " posted: " +
      lines.length +
      " counted, " +
      lines.filter(x => Math.abs(x.v) > 1e-9).length +
      " with variances."
  );
  stOpen(id); // show the stock taking report straight away
  all();
}
function invExport() {
  const R = mRows(),
    H = [
      "Item Code",
      "Item Name",
      "Item Cost",
      "Item Group",
      "Sale Price",
      "Opening Bal",
      "Added",
      "Production",
      "Stock In",
      "Sold",
      "Damages",
      "Stock Out",
      "System Bal",
      "Physical Bal",
      "Variance",
      "Narration"
    ],
    T = [H.join("\t")]
      .concat(
        R.map(r => {
          const p = STKT.phys[r.key],
            has = p !== undefined && p !== "";
          return [
            r.code,
            r.name,
            r.cost,
            r.grp,
            r.price,
            r.op,
            r.add,
            r.prod,
            r.inn,
            r.sold,
            r.dmg,
            r.out,
            r.sys,
            has ? p : "",
            has ? parseFloat(p) - r.sys : "",
            STKT.narr[r.key] || ""
          ].join("\t");
        })
      )
      .join("\n"),
    ta = document.createElement("textarea");
  ta.value = T;
  ta.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {}
  ta.remove();
  try {
    navigator.clipboard.writeText(T).catch(() => {});
    ok = true;
  } catch (e) {}
  toast(ok ? "Stock master copied. Paste it into Excel." : "Could not copy. Try again.");
}
const blankItemForm = (store = STORES[0]) => ({
  open: false,
  edit: null,
  name: "",
  code: "",
  group: "",
  uom: "pcs",
  buyUnit: "",
  perBuy: "1",
  buyPrice: "",
  reorder: "",
  tax: "B",
  store,
  qty: "",
  sup: "",
  // Opened from a selling point (Selling points → Manage → + New item)
  sp: "",
  spWay: "req", // req: request it from the store · recv: the store receives it first · none
  spPrice: "",
  spCat: "",
  spTax: "B",
  // Ticked "Made in-house": it comes from a recipe or from production instead of being bought.
  made: false,
  madeWay: "recipe",
  madeFrom: "", // an existing recipe or production to copy
  madeSp: "",
  // Opened from a selling point: what each sale deducts from (store stock is a normal bought item).
  spSrc: "store",
  srcPk: "", // finished item + place, or "new"
  srcPer: "1",
  srcCopy: "",
  srcFrom: "",
  lines: []
});
/** Create or update an item from the Item setup form; on create, optionally send stock to a store. */
function itemSave() {
  if (itemSpLink(invF.it)) return itemSpLinkSave(invF.it); // attached: no new stock item
  if (itemSpNewProd(invF.it))
    Object.assign(invF.it, { made: true, madeWay: "prod", madeSp: invF.it.sp });
  const M = itemMadeWay(invF.it);
  if (M === "recipe") return itemToRecipe(invF.it); // a recipe needs no stock item
  // Production: a stock item with no buying details or opening stock; it comes in when it is made.
  const made = M && itemMadeStart(invF.it);
  const F = invF.it,
    editing = !!F.edit && ING[F.edit] !== undefined,
    before = editing ? itemInfo(F.edit) : null,
    name = F.name.trim(),
    uom = editing && itemUsed(F.edit) ? before.uom : F.uom.trim(),
    buyUnit = F.buyUnit.trim() || uom,
    perBuy = parseFloat(F.perBuy),
    // Optional: items made in production get their cost there. Left empty on an edit, the price stays.
    noPrice = String(F.buyPrice).trim() === "",
    price = noPrice ? (before ? +before.buyPrice : 0) : parseFloat(F.buyPrice),
    reorder = String(F.reorder).trim() === "" ? null : parseFloat(F.reorder),
    qty = parseFloat(F.qty),
    code = (F.code.trim() || (before && before.code) || nextItemCode()).toUpperCase();
  if (!name) return toast("Enter the item name.");
  if (!uom) return toast("Enter the unit of measure, e.g. pcs, ml or kg.");
  if (!(perBuy > 0)) return toast("Units in one buying unit must be more than 0.");
  if (!(price >= 0)) return toast("The buying price must be 0 or more.");
  if (reorder !== null && !(reorder >= 0)) return toast("The reorder level must be 0 or more.");
  if (!editing && String(F.qty).trim() !== "" && !(qty > 0))
    return toast("The quantity must be more than 0, or leave it empty.");
  if (!editing && qty > 0 && !isStore(F.store)) return toast("Choose the store to send it to.");
  const sp = editing ? "" : itemSpPoint(F),
    spPrice = parseFloat(F.spPrice);
  if (sp) {
    if (String(F.spPrice).trim() !== "" && !(spPrice > 0))
      return toast("The selling price must be more than 0, or leave it empty.");
    if (spPrice > 0 && ITEMS.some(i => i.d === sp && i.n.toLowerCase() === name.toLowerCase()))
      return toast(sp + " already sells " + name + ".");
    if (F.spWay === "req" && !(qty > 0))
      return toast("Enter the quantity to request from " + F.store + ", or choose Not now.");
  }
  const dup = itemDuplicate(name, code, F.edit);
  if (dup) return toast(dup);
  const sell = editing || sp || M ? null : itemSellRead();
  if (typeof sell === "string") return toast(sell);

  const k = editing ? F.edit : itemKey(name);
  INGU[k] = {
    code,
    name,
    group: F.group.trim() || "Raw materials",
    uom,
    buyUnit,
    perBuy,
    buyPrice: price,
    tax: F.tax
  };
  ING[k] = name + " (" + uom + ")";
  if (!editing) {
    LOCS.forEach(l => (STK[l][k] = STK[l][k] || 0));
    INGC[k] = price / perBuy;
  } else if (price !== +before.buyPrice || perBuy !== +before.perBuy) INGC[k] = price / perBuy;
  RO[k] =
    reorder !== null
      ? reorder
      : RO[k] !== undefined
        ? RO[k]
        : qty > 0
          ? Math.max(1, Math.round(qty * perBuy * 0.2))
          : 1;

  let msg = editing ? name + " updated." : name + " created (" + code + ").";
  if (!editing && !sp && qty > 0) {
    const r = sendToStore(k, F.store, qty, price, F.sup.trim(), "");
    msg += " " + qn(r.q) + " " + uom + " sent to " + F.store + ".";
  }
  if (sell) msg += itemSellAdd(k, name, F.group.trim() || "General", F.tax, sell);
  invF.it = blankItemForm(F.store);
  invF.sd.k = k;
  invF.itLast = k; // highlight the new / edited row
  if (view === "pur" && purT === "receive" && !editing) rcPick(k, false); // created from Receive goods: ready to add
  if (made) return itemToProduction(k, made, msg);
  if (sp) return itemSpDone(k, sp, F, qty * perBuy, spPrice, msg);
  auditAdd("Stock item", msg, { mod: "Inventory" });
  bosave();
  toast(msg);
  all();
}
/** After opening the item popup: draw it, fill the live hints, put the cursor in the name. */
/** Redraw the open popup without losing the place in it. */
function itRedraw() {
  const y = $("#itBody").scrollTop;
  all();
  itPreview();
  $("#itBody").scrollTop = y;
}
function itOpened() {
  all();
  itPreview();
  const n = $("#itName");
  if (n) n.focus();
}
function invAct(a, b) {
  const d = b.dataset,
    f = d.f;
  if (a.slice(0, 2) === "rp") return repAct(a, d); // inventory reports (inventory-reports.js)
  if (a.slice(0, 2) === "rc" || a.slice(0, 2) === "vn") return rcAct(a, b); // direct receive & vendors (receive.js)
  // ---- stores
  if (a === "stnew" || a === "stedit") {
    stE =
      a === "stnew"
        ? { was: "", name: "", kinds: [] }
        : { was: d.l, name: d.l, kinds: storeKinds(d.l) };
    all();
    return $("#stName").focus();
  }
  if (a === "stclose") {
    stE = null;
    return all();
  }
  if (a === "stsave") return storeSave();
  if (a === "stdel") {
    stDel = d.l;
    return all();
  }
  if (a === "stdelno") {
    stDel = null;
    return all();
  }
  if (a === "stdelyes") return storeDelete();
  if (a === "sdtog") {
    invSdOpen = !invSdOpen;
    return all();
  }
  if (a === "stadd") {
    const name = invF.st.name.trim(),
      err = placeNameError(name);
    if (err) return toast(err);
    STORES.push(name);
    syncLocs();
    invF.st.name = "";
    invStNew = false;
    bosave();
    toast(name + " created. Receive stock into it in Purchasing.");
    return all();
  }
  if (a === "stgo") {
    STKT.loc = d.l;
    STKT.phys = {};
    STKT.narr = {};
    invT = d.t;
    return all();
  }
  // ---- local purchase orders
  if (a === "poladd") {
    const k = $("#po_k").value,
      q = parseFloat($("#po_q").value),
      pv = $("#po_p").value.trim(),
      p = pv === "" ? +itemInfo(k).buyPrice : parseFloat(pv);
    if (!k) return toast("Create items in Item setup first.");
    if (!(q > 0)) return toast("Enter the quantity to order.");
    if (!(p >= 0)) return toast("The price must be 0 or more.");
    const L = invF.po.lines,
      ex = L.find(x => x.k === k && x.price === p);
    if (ex) ex.qty += q;
    else L.push({ k, qty: q, price: p });
    return all();
  }
  if (a === "poldel") {
    invF.po.lines.splice(+d.i, 1);
    return all();
  }
  if (a === "ponew") {
    invPoNew = !invPoNew;
    if (!invPoNew) invF.po = { ...invF.po, lines: [] };
    return all();
  }
  if (a === "pomake") {
    const F = invF.po;
    F.store = STKT.loc;
    if (!isStore(F.store)) return toast("Choose a store above. Only stores order from vendors.");
    if (!F.sup.trim()) return toast("Choose the vendor.");
    if (!F.lines.length) return toast("Add at least one line.");
    const p = {
      id: nid("LPO"),
      at: new Date().toISOString(),
      store: F.store,
      sup: F.sup.trim(),
      due: F.due,
      note: F.note.trim(),
      by: boUser.n,
      status: AWAIT, // approved → Open (approvals.js)
      lines: F.lines.map(x => ({ ...x, recv: 0 }))
    };
    LPOS.push(p);
    invF.po = { store: F.store, sup: "", due: "", note: "", lines: [] };
    invPoNew = false;
    docOpen("lpo", p.id);
    bosave();
    toast(
      `LPO ${p.id} created for ${p.sup} (KES ${m2(lpoTotal(p))}). It waits for a manager to approve it.`
    );
    return all();
  }
  if (a === "porecv") {
    const p = LPOS[+d.i],
      ref = ($("#prf_" + d.i) || {}).value || "",
      got = [];
    p.lines.forEach((x, j) => {
      const want = parseFloat(($("#pr_" + d.i + "_" + j) || {}).value) || 0,
        q = Math.min(Math.max(0, want), Math.max(0, x.qty - x.recv));
      if (q > 0) got.push({ x, q });
    });
    if (!got.length) return toast("Enter the quantities delivered.");
    const r = receiveLines(
      p.store,
      got.map(({ x, q }) => ({ k: x.k, qtyBuy: q, price: x.price })),
      p.sup,
      ref.trim(),
      p.id
    );
    got.forEach(({ x, q }) => (x.recv += q));
    p.status = p.lines.every(x => x.recv >= x.qty - 1e-9) ? "Received" : "Partly received";
    bosave();
    toast(
      "Delivery received into " + p.store + " (" + r.id + "). LPO " + p.status.toLowerCase() + "."
    );
    return all();
  }
  if (a === "pocancel" || a === "poclose") {
    const p = LPOS[+d.i];
    p.status = a === "pocancel" ? "Cancelled" : "Closed";
    bosave();
    toast("LPO " + p.id + " " + p.status.toLowerCase() + ".");
    return all();
  }
  // ---- item setup
  if (a === "itsave") return itemSave();
  if (a === "itnew") {
    // data-sp: opened from a selling point, which gets its stock from its own store by default
    const sp = d.sp || "";
    invF.it = { ...blankItemForm(sp ? spInfo(sp).store : invF.it.store), sp, open: true };
    return itOpened();
  }
  if (a === "itmade") {
    invF.it.made = b.checked;
    return itRedraw();
  }
  if (a === "itsrc") {
    invF.it.spSrc = d.w;
    return itRedraw();
  }
  if (a === "itmway") {
    invF.it.madeWay = d.w;
    invF.it.madeFrom = "";
    return itRedraw();
  }
  if (a === "itway") {
    invF.it.spWay = d.w;
    return itRedraw();
  }
  if (a === "itcancel") {
    invF.it = blankItemForm(invF.it.store);
    return all();
  }
  if (a === "itissue") {
    // Issue from the store that holds the most of this item, item already chosen.
    const k = d.k,
      st = STORES.slice().sort((x, y) => have(y, k) - have(x, k))[0];
    if (!(have(st, k) > 0))
      return toast(itemInfo(k).name + " is not in any store yet. Send stock to a store first.");
    STKT.loc = st;
    STKT.phys = {};
    STKT.narr = {};
    invF.is = { ...invF.is, from: st, to: pick(invF.is.to, ALLD), lines: [], pick: k };
    invT = "issue";
    all();
    const q = $("#l_q_is");
    return q && q.focus();
  }
  if (a === "itedit") {
    const u = itemInfo(d.k);
    invF.it = {
      ...blankItemForm(invF.it.store),
      open: true,
      edit: d.k,
      name: u.name,
      code: u.code,
      group: u.group,
      uom: u.uom,
      buyUnit: u.buyUnit,
      perBuy: String(u.perBuy),
      buyPrice: String(u.buyPrice),
      reorder: RO[d.k] !== undefined ? String(RO[d.k]) : "",
      tax: itemTax(d.k)
    };
    invT = "items";
    return itOpened();
  }
  if (a === "itpick") {
    invF.sd = { ...invF.sd, k: d.k, qty: "" };
    invSdOpen = true;
    all();
    sdSync("k");
    const p = $("#sdPanel");
    return p && p.scrollIntoView({ behavior: "smooth" });
  }
  if (a === "itsend") {
    // Issue from a store to a selling point; with a price, the item is sold on that POS.
    const S = invF.sd,
      q = parseFloat(S.qty),
      u = S.k && ING[S.k] !== undefined ? itemInfo(S.k) : null,
      units = u ? toUnits(S.k, q, S.unit) : 0, // crates → pcs
      prod = u && sdProduct(S.k, S.sp),
      // A materials store sells nothing, so it takes no price.
      price = isMaterials(S.sp) || String(S.price).trim() === "" ? null : parseFloat(S.price),
      per = parseFloat(S.per),
      name = (S.name.trim() || (u ? u.name : "")).trim();
    if (!u) return toast("Choose an item.");
    if (!ALLD.includes(S.sp)) return toast("Choose the selling point.");
    if (!isStore(S.store)) return toast("Choose the store the stock comes from.");
    if (!(q > 0)) return toast("Enter the quantity to send.");
    if (units > have(S.store, S.k) + 1e-9)
      return toast(
        `Only ${qtyBoth(S.k, have(S.store, S.k))} of ${u.name} in ${S.store}. Receive it first in Purchasing → Receive goods.`
      );
    if (price !== null && !(price > 0)) return toast("The selling price must be more than 0.");
    if (!prod && price !== null) {
      if (!(per > 0)) return toast("Enter how much stock one sale uses.");
      if (ITEMS.some(i => i.d === S.sp && i.n.toLowerCase() === name.toLowerCase()))
        return toast(S.sp + " already sells a product called " + name + ".");
    }
    // With the approve right the stock moves now; otherwise a manager approves the note.
    const now = boCan("inv.approve"),
      x = now
        ? issueNow(S.store, S.sp, [{ k: S.k, q: units }], "", "send", "", boUser.n)
        : raiseIssue(S.store, S.sp, [{ k: S.k, q: units }], "", "send");
    if (!x) return all();
    let msg = now
      ? `${x.id}: ${qtyBoth(S.k, units)} of ${u.name} moved from ${S.store} to ${S.sp}.`
      : `Issue note ${x.id}: ${qtyBoth(S.k, units)} of ${u.name} from ${S.store} to ${S.sp}, waiting for approval.`;
    if (prod && price !== null && price !== prod.p) {
      msg += ` ${prod.n} now KES ${m2(price)} (was ${m2(prod.p)}).`;
      prod.p = price;
    } else if (prod) msg += ` On the POS as ${prod.n} at KES ${m2(prod.p)}.`;
    else if (price !== null) {
      ITEMS.push({
        id: Math.max(0, ...ITEMS.map(i => i.id)) + 1,
        n: name,
        d: S.sp,
        c: u.group || spInfo(S.sp).type,
        p: price,
        t: S.tax,
        r: { [S.k]: per }
      });
      msg += ` Now on the ${S.sp} POS as ${name} at KES ${m2(price)}.`;
    } else msg += " Not on the POS yet: add a selling price to sell it.";
    if (price !== null) spRefreshPos();
    invF.sd = { ...S, qty: "" };
    bosave();
    toast(msg);
    sdSync("k"); // show the product as it is now
    return;
  }
  if (a === "full") {
    STKT.full = !STKT.full;
    return all();
  }
  if (a === "mst") {
    STKT.st = d.v;
    return all();
  }
  // Folding touches only the page, so counts being typed and the scroll position stay put.
  if (a === "mband") {
    msClosed()[d.v] = !msClosed()[d.v];
    b.parentElement.classList.toggle("closed", msClosed()[d.v]);
    return;
  }
  if (a === "mbandall") {
    document.querySelectorAll("#vSub .stm-g").forEach(g => {
      msClosed()[g.querySelector(".stm-band").dataset.v] = !!d.v;
      g.classList.toggle("closed", !!d.v);
    });
    return;
  }
  if (a === "mdetail") {
    STKT.detail = !STKT.detail;
    return all();
  }
  if (a === "locall") {
    STKT.all = true;
    return all();
  }
  if (a === "mallp" || a === "mallx") {
    const T = masterAllTable(),
      title = "Stock Master - all stores";
    if (a === "mallx") {
      XLSX.download(
        {
          company: FD_SETTINGS.name,
          title,
          head: `Total value KES ${m2(T.total)}`,
          by: xlsxBy(),
          sections: [{ c: T.c, r: T.r }]
        },
        `Stock_Master_all_stores_${bizDate()}`
      );
      return toast("Stock Master downloaded as Excel.");
    }
    const num = h => (h[0] === "#" ? ' class="n"' : "");
    return stPrint(
      title,
      `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>${title}</h2></div><table class="st-t"><thead><tr>${T.c.map(h => `<th${num(h)}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${T.r.map(r => `<tr>${r.map((v, i) => `<td${num(T.c[i])}>${esc(v)}</td>`).join("")}</tr>`).join("")}<tr class="st-tot"><td colspan="${T.c.length - 1}">Total value (KES)</td><td class="n">${m2(T.total)}</td></tr></tbody></table><div class="st-foot"><span>${printedBy()}</span></div></div>`
    );
  }
  if (a === "nrq") {
    invF.nrq.open = !invF.nrq.open;
    return all();
  }
  if (a === "nrqgo") return reqNewSend();
  if (a === "stall" || a === "stnone") {
    document.querySelectorAll("#stEd [data-stk]").forEach(x => (x.checked = a === "stall"));
    return;
  }
  if (a === "spspt") {
    invF.sps.pt = d.v;
    return all();
  }
  if (a === "spszero") {
    invF.sps.zero = b.checked;
    return all();
  }
  if (a === "spsprint" || a === "spsxl") {
    if (!boCan("rep.print")) return boDenied();
    const T = spStockTable();
    if (!T.r.length) return toast("There is nothing to print here.");
    if (a === "spsprint") return tablePrint(T.title, T.head, T.c, T.r, T.f);
    return XLSX.download(
      {
        company: FD_SETTINGS.name,
        title: T.title,
        head: T.head,
        by: xlsxBy(),
        sections: [{ t: T.title, c: T.c, r: T.r, f: T.f }]
      },
      `${T.title}_${todayYmd()}`
    );
  }
  if (a === "moff") {
    STKT.offAt = STKT.offAt === STKT.loc ? "" : STKT.loc;
    return all();
  }
  if (a === "loc") {
    STKT.all = false;
    STKT.loc = d.l;
    STKT.phys = {};
    STKT.narr = {};
    // Stay on the same job (requisitions, damage...) for the newly chosen place when it applies there.
    const placeTabs = ["master", "req", "issue", "damage"];
    invT = d.t || (placeTabs.includes(invT) && tabAllowed(invT) ? invT : "master");
    return all();
  }
  if (a === "kind") {
    STKT.kind = d.k;
    STKT.phys = {};
    STKT.narr = {};
    return all();
  }
  if (a === "tab") {
    const t = d.t;
    if (t === "exit") return go("Home");
    if (t === "load") {
      invT = "master";
      toast("Stock data loaded.");
      return all();
    }
    if (t === "export") return invExport();
    if (t === "run") {
      if (invT !== "master") {
        invT = "master";
        all();
        return toast("Enter physical balances, then press Run Stock Taking.");
      }
      return tapConfirm(b, invRun, "POST COUNTS?");
    }
    invT = t;
    STKT.full = false;
    return all();
  }
  if (a === "ladd") {
    const k = $("#l_k_" + f).value,
      typed = parseFloat($("#l_q_" + f).value),
      q = toUnits(k, typed, $("#l_u_" + f).value), // crates → pcs
      c = f === "rc" ? parseFloat($("#l_c_" + f).value) || 0 : 0;
    invF[f].pick = k;
    if (!(q > 0)) return toast("Enter a quantity above zero.");
    const src = f === "is" ? STKT.loc : null,
      L = invF[f].lines,
      ex = L.find(x => x.k === k),
      want = q + (ex ? ex.q : 0);
    if (src && want > have(src, k) + 1e-9)
      return toast(
        "Only " + qtyBoth(k, have(src, k)) + " of " + itemInfo(k).name + " in " + src + "."
      );
    if (ex) {
      ex.q = want;
      if (c) ex.c = c;
    } else L.push({ k, q, c });
    return all();
  }
  if (a === "ldel") {
    invF[f].lines.splice(+d.i, 1);
    return all();
  }
  if (a === "rqissue") {
    const r = REQS[+d.i],
      st = r.store || STORES[0];
    if (st !== STKT.loc)
      return toast("Only " + st + " can issue this requisition. Choose it above.");
    // Already approved, so the stock moves now (approvals.js).
    const lines = [];
    r.lines.forEach((x, j) => {
      const want = Math.max(0, parseFloat($("#iq_" + d.i + "_" + j).value) || 0),
        q = Math.min(want, x.q - x.issued - reqPend(r, x.k), have(st, x.k));
      if (q > 0) lines.push({ k: x.k, q });
    });
    if (!lines.length)
      return toast("Nothing to issue. Check the quantities and the stock in " + st + ".");
    const x = issueNow(st, r.dept, lines, "", "requisition", r.id, boUser.n);
    if (x) toast(`${x.id}: stock moved to ${r.dept} for ${r.id}.`);
    return all();
  }
  if (a === "rqrej") {
    const st = REQS[+d.i].store || STORES[0];
    if (st !== STKT.loc)
      return toast("Only " + st + " can reject this requisition. Choose it above.");
    REQS[+d.i].status = "Rejected";
    bosave();
    return all();
  }
  if (a === "isspost") {
    const F = invF.is;
    F.from = STKT.loc;
    if (!isStore(F.from))
      return toast("Stock is issued from a store. A selling point requests stock instead.");
    if (!ALLD.includes(F.to)) return toast("Choose the selling point to issue to.");
    if (!F.lines.length) return toast("Add at least one line.");
    const bad = F.lines.find(x => x.q > have(F.from, x.k) + 1e-9);
    if (bad) return toast("Not enough " + iN(bad.k) + " in " + F.from + ".");
    // No requisition needed. With the approve right the stock moves now; otherwise a manager approves it.
    const now = boCan("inv.approve"),
      x = now
        ? issueNow(F.from, F.to, F.lines, F.note, "issue", "", boUser.n)
        : raiseIssue(F.from, F.to, F.lines, F.note, "issue");
    if (!x) return all();
    invF.is = { from: F.from, to: F.to, note: "", lines: [] };
    docOpen("iss", x.id);
    toast(
      now
        ? `${x.id}: stock moved to ${F.to}.`
        : `Issue note ${x.id} to ${F.to} raised. It waits for a manager to approve it.`
    );
    return all();
  }
  if (a === "dmpost") {
    const F = invF.dm;
    F.loc = STKT.loc;
    const k = F.k || pickKeys()[0],
      q = parseFloat(F.q);
    if (!(q > 0)) return toast("Enter the quantity damaged.");
    if (q > have(F.loc, k) + 1e-9)
      return toast("Only " + fq(have(F.loc, k)) + " in " + F.loc + ".");
    mvc(F.loc, k, -q, "DAMAGE", F.why, "", "DMG", boUser.n);
    invF.dm = { loc: F.loc, k: "", q: "", why: "Damaged" };
    bosave();
    toast("Damage recorded.");
    return all();
  }
}
document.addEventListener("keydown", e => {
  if (e.key !== "Escape" || !$("#bo").classList.contains("show")) return;
  if (invF.it.open) {
    invF.it = blankItemForm(invF.it.store); // Esc closes the item popup
    all();
  } else if (STKT.full) {
    STKT.full = false;
    all();
  }
});
$("#vSub").oninput = e => {
  const s = e.target.dataset;
  if (s.bc !== undefined) return billFilter(s.bc, e.target.value);
  if (s.urf) return urFilter(s.urf, e.target.value);
  if (s.ws) return void (wsF[s.ws] = e.target.value);
  if (s.sq !== undefined) {
    salesF.q = e.target.value;
    return void ($("#salesList").innerHTML = salesList());
  }
  if (s.ph !== undefined) {
    STKT.phys[s.ph] = e.target.value;
    updMaster();
  } else if (s.pn !== undefined) STKT.narr[s.pn] = e.target.value;
  else if (s.spc !== undefined || s.spn !== undefined) spCountInput(e.target, s);
  else if (s.find !== undefined) stFind(e.target); // search boxes (stock-take-report.js)
  const mt = $(".stm-t");
  if (mt) mt.classList.toggle("stm-find", !!e.target.value.trim());
  else if (s.stloc !== undefined) {
    stVar.loc = e.target.value === "All places" ? "All" : e.target.value;
    all();
  } else if (s.iv !== undefined) {
    const [p, f] = s.iv.split(".");
    invF[p][f] = e.target.value;
    if (p === "it") itSrcSync(f); // selling-points.js
    if (p === "it" || p === "sd") itPreview();
    if (p === "it") itemStoreMatch(f);
    if (p === "sd") sdSync(f);
    if (p === "spp" && f === "k" && invF.spp.k) {
      // A new product starts with its stock item's tax. It can still be changed here.
      invF.spp.tax = itemTax(invF.spp.k);
      const tx = document.querySelector('[data-iv="spp.tax"]');
      if (tx) tx.value = invF.spp.tax;
    }
    if (p === "spp") spPreview();
    if (p === "spr" && f === "store") all(); // show the new store's quantities
    if (p === "rc") rcSync(f); // direct receive (receive.js)
    if (p === "vs") vsSync(f); // vendor statement (vendors.js)
    if (p === "pr" || p === "rcp" || p === "recb" || p === "recr") prSync(p, f);
    if (p === "spe") speSync(f); // editing a selling point product (selling-points.js) // Recipes & Production (production.js)
  }
};

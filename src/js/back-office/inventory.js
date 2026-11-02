// ---- inventory: stores, item setup, receive, purchase orders, requisitions, issue, damage, stock master ----
// Stores (STORES) hold purchased stock. Selling points (ALLD) get stock from a store by requisition or issue.
let invT = "stores";
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
  cst = k => INGC[k] || 0,
  have = (l, k) => STK[l][k] || 0,
  nid = p => p + "-" + Date.now().toString(36).slice(-5).toUpperCase(),
  dt2 = t => {
    const d = new Date(t);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + hm(d);
  };
const optK = s0 =>
    Object.keys(ING)
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
    "Groceries",
    "Cleaning",
    "Packaging",
    "Other"
  ];
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
  ["stores", "Stores", "home"],
  ["appr", "Approvals", "shield"],
  ["items", "Item setup", "plus"],
  ["master", "Stock Master", "box"],
  ["req", "Requisitions", "book"],
  ["issue", "Issue", "cart", "store"],
  ["damage", "Damage", "alert"],
  "-",
  ["h", "Reports"],
  ["riss", "Issues", "cart"],
  ["rdmg", "Damage report", "alert"],
  ["position", "Stock position", "chart"],
  ["variance", "Stock take variance", "chart"],
  ["streps", "Stock take reports", "book"],
  "-",
  ["exit", "Exit", "alert"]
];
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
const rail = () => {
  const pend = reqsHere().filter(isOpenReq).length;
  return RAIL.filter(x => x === "-" || tabAllowed(x[0]))
    .map(x =>
      x === "-"
        ? '<i class="rsep"></i>'
        : x[0] === "h"
          ? `<div class="rhd">${x[1]}</div>`
          : `<button class="ir ${x[0] === invT ? "on" : ""}" data-a="inv_tab" data-t="${x[0]}">${I(x[2])}<span>${x[1]}</span>${x[0] === "req" && pend ? `<b>${pend}</b>` : ""}${x[0] === "appr" && apCount() ? `<b>${apCount()}</b>` : ""}</button>`
    )
    .join("");
};
/** Store picker. Inventory is for stores only; selling points are managed under "Selling points". */
const strip = () => {
  const ks = Object.keys(ING),
    chip = l => {
      const inn = ks.filter(k => have(l, k) > 0).length,
        out = ks.length - inn;
      return `<button class="sc2 ${l === STKT.loc ? "on" : ""}" data-a="inv_loc" data-l="${esc(l)}"><span>${esc(l)}</span><b>${inn}<small>/${ks.length}</small></b><i><u style="width:${ks.length ? (inn / ks.length) * 100 : 0}%"></u></i><em>${out ? out + " out" : "&nbsp;"}</em></button>`;
    };
  return `<div class="stgw"><div class="stgh">Stores</div><div class="stg">${STORES.map(chip).join("")}</div></div>`;
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
  const k0 = invF[f].pick && ING[invF[f].pick] !== undefined ? invF[f].pick : Object.keys(ING)[0];
  return `<div class="fr" style="align-items:end"><label>Item<select id="l_k_${f}" data-unitfor="${f}">${optK(k0)}</select></label><label>Quantity<input id="l_q_${f}" type="number" min="0" step="any" placeholder="Qty"></label><label>Units${unitSel("l_u_" + f, k0)}</label>${cost ? `<label>Unit cost (KES)<input id="l_c_${f}" type="number" step="any" placeholder="Optional"></label>` : ""}<button class="mini" data-a="inv_ladd" data-f="${f}">Add line</button></div><div class="stk" id="l_h_${f}">${unitHint(k0, STKT.loc)}</div>${L.length ? `<div class="tw"><table class="t"><tr><th>Item</th><th class="n">Qty</th>${cost ? '<th class="n">Unit cost</th>' : ""}<th></th></tr>${L.map((x, i) => `<tr><td>${esc(iN(x.k))}</td><td class="n">${qtyBoth(x.k, x.q)}</td>${cost ? `<td class="n">${x.c ? m2(x.c) : "-"}</td>` : ""}<td><button class="mini" data-a="inv_ldel" data-f="${f}" data-i="${i}">✕</button></td></tr>`).join("")}</table></div>` : ""}`;
}
function mRows() {
  const loc = STKT.loc,
    // Stores hold stock items only; finished products exist only at selling points.
    kind = isStore(loc) ? "raw" : STKT.kind,
    t0 = new Date(STKT.since).getTime(),
    agg = {};
  MOV.filter(m => m.loc === loc && m.at >= t0).forEach(m => {
    const a = (agg[m.k] = agg[m.k] || { add: 0, inn: 0, sold: 0, dmg: 0, out: 0, prod: 0 });
    // Added: received, plus stock adjustments (either way). Damages: written off as damaged only.
    if (m.t === "RECEIVE" || m.t === "ADJUST") a.add += m.q;
    else if (m.t === "ISSUE_IN" || m.t === "TRANS_IN") a.inn += m.q;
    else if (m.t === "SALE" || m.t === "SALE_RET") a.sold -= m.q;
    else if (m.t === "DAMAGE") a.dmg -= m.q;
    else if (m.t === "PROD_IN" || m.t === "PROD_OUT") a.prod += m.q;
    else if (m.t === "ISSUE_OUT" || m.t === "TRANS_OUT") a.out -= m.q;
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
      ? Object.keys(ING).map((k, i) => {
          const u = itemInfo(k);
          return mk(u.code || 100 + i, iN(k), cst(k), u.group || "Raw materials", "", k, 1);
        })
      : ITEMS.filter(i => Object.keys(i.r).length === 1 && i.d === loc).map(i => {
          const k = Object.keys(i.r)[0],
            v = i.r[k];
          return mk(i.id, i.n, cst(k) * v, i.c, i.p, k, v);
        });
  if (!STKT.zero)
    R = R.filter(
      r =>
        Math.abs(r.sys) > 1e-9 ||
        r.add ||
        r.inn ||
        r.sold ||
        r.dmg ||
        r.out ||
        // A newly created item shows in every store's Stock Master before it has any stock.
        (isStore(loc) && kind === "raw" && !itemUsed(r.k))
    );
  if (STKT.issued) R = R.filter(r => r.inn > 0 || r.out > 0);
  return R;
}
function masterHTML() {
  const R = mRows(),
    loc = STKT.loc,
    done = R.filter(r => {
      const p = STKT.phys[r.key];
      return p !== undefined && p !== "";
    }).length,
    pct = R.length ? Math.round((done / R.length) * 100) : 0,
    os = openShifts(),
    sh = curDay() ? (os.length ? os.map(x => x.id).join(", ") : curDay().id) : "-";
  return `<div class="pn ${STKT.full ? "mfull" : ""}" data-findscope><div class="mtop">${findBox("master", "Search code, item or group")}${isStore(loc) ? '<span class="chip2">Stock items</span>' : `<div class="seg2"><button class="${STKT.kind === "raw" ? "on" : ""}" data-a="inv_kind" data-k="raw">Stock items</button><button class="${STKT.kind === "fin" ? "on" : ""}" data-a="inv_kind" data-k="fin">Finished products</button></div>`}<label class="sw"><input type="checkbox" data-m="zero" ${STKT.zero ? "checked" : ""}><span>Zero balances</span></label><label class="sw"><input type="checkbox" data-m="issued" ${STKT.issued ? "checked" : ""}><span>Issued only</span></label><span class="chip2">Stock take for ${placeLabel(loc)} · Shift ${sh}</span>${STKT.full ? `<select data-m="loc">${STORES.map(l => `<option ${l === loc ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : ""}<button class="mini" data-a="inv_tab" data-t="load" title="Reload balances from the latest stock movements">Load data</button><button class="mini" data-a="inv_tab" data-t="export" title="Copy the sheet for Excel">Export</button><button class="chip on" data-a="inv_tab" data-t="run" title="Post the physical counts">Run stock take</button><button class="mini" data-a="inv_full">${STKT.full ? "⤡ Collapse" : "⤢ Expand"}</button></div>
 <div class="pbar"><i style="width:${pct}%"></i><span>${pct}% counted</span></div>
 <div class="tw tall"><table class="t sm"><tr><th>Item code</th><th>Item name</th><th class="n">Item cost</th><th>Item group</th><th class="n">Sale price</th><th class="n">Opening bal</th><th class="n">Added</th><th class="n">Production</th><th class="n">Stock in</th><th class="n">Sold</th><th class="n">Damages</th><th class="n">Stock out</th><th class="n">System bal</th><th>Physical bal</th><th class="n">Variance</th><th>Narration</th></tr>${
   R.length
     ? R.map(r => {
         const p = STKT.phys[r.key],
           has = p !== undefined && p !== "" && !isNaN(parseFloat(p)),
           v = has ? parseFloat(p) - r.sys : 0;
         return `<tr${findAttr("master", r.code, r.name, r.grp)}><td>${r.code}</td><td>${esc(r.name)}</td><td class="n">${m2(r.cost)}</td><td>${esc(r.grp)}</td><td class="n">${r.price === "" ? "" : m2(r.price)}</td><td class="n">${fq(r.op)}</td><td class="n">${fq(r.add)}</td><td class="n">${fq(r.prod)}</td><td class="n">${fq(r.inn)}</td><td class="n">${fq(r.sold)}</td><td><input type="number" min="0" step="any" class="dmg-in" data-dm="${esc(r.key)}" value="${Math.abs(r.dmg) < 1e-9 ? "" : +r.dmg.toFixed(3)}" placeholder="0" title="Type the quantity damaged: the change is written off (the Narration is the reason)"></td><td class="n">${fq(r.out)}</td><td class="n"><b>${fq(r.sys)}</b></td><td><input type="number" step="any" data-ph="${esc(r.key)}" value="${p === undefined ? "" : esc(p)}" style="max-width:110px"></td><td class="n ${v < 0 ? "neg" : ""}" data-vr="${esc(r.key)}" data-sys="${r.sys}">${has ? fq(v) : ""}</td><td><input data-pn="${esc(r.key)}" value="${esc(STKT.narr[r.key] || "")}" placeholder="Reason"></td></tr>`;
       }).join("")
     : '<tr><td colspan="16" class="stk">No items for this source. Receive or issue stock first, or tick "Show stock with zero balances".</td></tr>'
 }</table></div></div>`;
}
/** A selling point asks a store for stock (raised from the Selling points page). lines: [{ k, q }] in units. */
function makeRequisition(dept, store, note, lines) {
  const r = {
    id: nid("REQ"),
    at: new Date().toISOString(),
    dept,
    store,
    by: boUser.n,
    note,
    status: AWAIT, // a manager approves it before the store can issue (approvals.js)
    lines: lines.map(x => ({ k: x.k, q: x.q, issued: 0 }))
  };
  REQS.push(r);
  bosave();
  return r;
}
function reqHTML() {
  // Requisitions SENT TO the selected store. Selling points raise them on their own page (Selling points).
  const here = STKT.loc,
    store = true,
    act = isOpenReq,
    canIssue = r => act(r);
  const L = REQS.map((r, i) => [r, i]).filter(([r]) => reqsHere().includes(r));
  return `<div class="pn"><div class="stk">Requisitions sent to ${placeLabel(here)} by selling points. A manager approves each one, then the store raises an issue note (also approved) to send the stock.</div></div>
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
             )}${r.status === AWAIT ? `<div class="stk">Waiting for a manager to approve it before ${esc(st)} can issue.</div><div class="fr">${apButtons("req", r)}</div>` : canIssue(r) ? `<div class="fr"><button class="chip on" data-a="inv_rqissue" data-i="${i}">Raise issue note</button><button class="mini" data-a="inv_rqrej" data-i="${i}">Reject</button></div>` : ""}</div></details>`;
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
  return `<div class="pn"><h4>Issue stock from ${placeLabel(F.from)} to a selling point</h4><div class="fr"><label>Issue to selling point<select data-iv="is.to">${opts(ALLD, F.to)}</select></label><label>Note<input data-iv="is.note" value="${esc(F.note)}" placeholder="Optional"></label></div>${lineEd("is")}<button class="chip on" data-a="inv_isspost">Raise issue note</button><div class="stk">The stock moves when a manager approves the issue note.</div></div>
 ${apIssueNotes(F.from)}
 <div class="pn tw"><h4>Recent issues</h4>${tb(
   ["Date", "Reference", "From", "To", "Item", "#Quantity", "By"],
   L.map(m => [dt2(m.at), m.ref, m.loc, m.peer, iN(m.k), fq(-m.q), m.by])
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
  return `<div class="pn"><h4>Record damaged or wasted stock in ${placeLabel(F.loc)}</h4><div class="fr"><label>Item<select data-iv="dm.k">${optK(F.k)}</select></label><label>Quantity<input data-iv="dm.q" type="number" step="any" value="${esc(F.q)}"></label><label>Reason<select data-iv="dm.why">${["Damaged", "Expired", "Spilled", "Spoiled", "Theft or loss", "Other"].map(x => `<option ${F.why === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><button class="chip on" data-a="inv_dmpost">Record damage</button></div></div>
 <div class="pn tw"><h4>Recent damages</h4>${tb(
   ["Date", "Location", "Item", "#Quantity", "Reason", "By"],
   L.map(m => [dt2(m.at), m.loc, iN(m.k), fq(-m.q), m.note, m.by])
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
  return `<div class="pn tw"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Stock position report</h4><button class="chip on" style="flex:none" data-a="st_posprint">Print</button></div>${tb(["Item", ...LOCS.map(l => "#" + l), "#Total", "#Unit cost", "#Value"], rows, ["Total stock value", ...LOCS.map(() => ""), "", "", m2(val)])}</div>`;
}
// ---- stores ----
const storeValue = l => Object.keys(ING).reduce((a, k) => a + Math.max(0, have(l, k)) * cst(k), 0);
function storesHTML() {
  const reqOpen = l => REQS.filter(r => (r.store || STORES[0]) === l && isOpenReq(r)).length,
    lpoOpenN = l =>
      LPOS.filter(p => p.store === l && (p.status === "Open" || p.status === "Partly received"))
        .length,
    supplies = l => ALLD.filter(o => (OUTLET_INFO[o] || {}).store === l);
  return `<div class="pn"><h4>Create a store</h4><div class="fr"><label>Store name<input data-iv="st.name" value="${esc(invF.st.name)}" placeholder="e.g. Beverages Store, Kitchen Store"></label><button class="chip on" data-a="inv_stadd">Create store</button></div><div class="stk">Stores hold the stock you buy (receive and purchase orders). Selling points get their stock from a store by requisition or issue.</div></div>
 <div class="pn tw"><h4>Stores (${STORES.length})</h4><table class="t"><tr><th>Store</th><th class="n">Items in stock</th><th class="n">Stock value (KES)</th><th>Supplies</th><th class="n">Open requisitions</th><th class="n">Open LPOs</th><th></th></tr>${STORES.map(
   l =>
     `<tr><td><b>${esc(l)}</b></td><td class="n">${Object.keys(ING).filter(k => have(l, k) > 0).length}</td><td class="n">${m2(storeValue(l))}</td><td>${esc(supplies(l).join(", ") || "-")}</td><td class="n">${reqOpen(l)}</td><td class="n">${lpoOpenN(l)}</td><td><div class="fr" style="flex-wrap:nowrap"><button class="mini" data-a="inv_loc" data-l="${esc(l)}">Stock master</button><button class="mini" data-a="pur_go" data-l="${esc(l)}" data-t="receive">Receive</button><button class="mini" data-a="pur_go" data-l="${esc(l)}" data-t="lpo">LPO</button></div></td></tr>`
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
    keys = Object.keys(ING).sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name));
  F.store = STKT.loc;
  const tag = s => (s === "Received" ? "ok" : s === "Cancelled" || s === "Closed" ? "bad" : "warn"),
    mine = LPOS.map((p, i) => [p, i]).filter(([p]) => p.store === F.store);
  return `<div class="pn"><h4>New local purchase order (LPO) for ${placeLabel(F.store)}</h4>
  <div class="fr"><label>Vendor<span class="fr" style="flex-wrap:nowrap"><select data-iv="po.sup"><option value="">Choose a vendor…</option>${[...new Set([...vendorNames(), ...(F.sup ? [F.sup] : [])])].map(s => `<option ${s === F.sup ? "selected" : ""}>${esc(s)}</option>`).join("")}</select><button class="mini" data-a="inv_vnopen" title="Add a vendor">+</button></span></label><label>Expected delivery<input type="date" data-iv="po.due" value="${esc(F.due)}"></label><label>Note<input data-iv="po.note" value="${esc(F.note)}" placeholder="Optional"></label></div>
  <div class="fr" style="align-items:end"><label>Item<select id="po_k">${keys.map(k => `<option value="${k}">${esc(itemInfo(k).name)} · ${esc(buyLabel(itemInfo(k)))}</option>`).join("")}</select></label><label>Quantity (buying units)<input id="po_q" type="number" min="0" step="any"></label><label>Price per buying unit (KES)<input id="po_p" type="number" min="0" step="any" placeholder="Last price"></label><button class="mini" data-a="inv_poladd">Add line</button></div>
  ${
    F.lines.length
      ? `<div class="tw"><table class="t"><tr><th>Item</th><th class="n">Quantity</th><th class="n">Price</th><th class="n">Total (KES)</th><th></th></tr>${F.lines.map((x, i) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qn(x.qty)} ${esc(itemInfo(x.k).buyUnit)}</td><td class="n">${m2(x.price)}</td><td class="n">${m2(x.qty * x.price)}</td><td><button class="mini" data-a="inv_poldel" data-i="${i}">✕</button></td></tr>`).join("")}<tr><td colspan="3"><b>Order total</b></td><td class="n"><b>${m2(lpoTotal(F))}</b></td><td></td></tr></table></div>`
      : ""
  }
  <button class="chip on" data-a="inv_pomake">Create LPO</button></div>
 <div class="pn"><h4>Purchase orders for ${esc(F.store)}</h4>${
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
               )}</table></div>${p.note ? `<div class="stk">${esc(p.note)}</div>` : ""}${apNote(p) ? `<div class="stk">${apNote(p)}</div>` : p.status === AWAIT ? `<div class="stk">Waiting for a manager to approve it before it can be received.</div>` : ""}<div class="fr">${lpoOpen(p) ? `<input id="prf_${i}" placeholder="Delivery note / invoice no." style="max-width:220px"><button class="chip on" data-a="inv_porecv" data-i="${i}">Receive delivery</button><button class="mini" data-a="pur_rclpo" data-i="${i}" title="Receive with VAT, batch and expiry">Open in GRN</button>` : ""}<button class="mini" data-a="inv_poprint" data-i="${i}">Print LPO</button>${apButtons("lpo", p)}${p.status === "Open" || p.status === AWAIT ? `<button class="mini" data-a="inv_pocancel" data-i="${i}">Cancel LPO</button>` : ""}${p.status === "Partly received" ? `<button class="mini" data-a="inv_poclose" data-i="${i}">Close (no more deliveries)</button>` : ""}</div></div></details>`
         )
         .join("")
     : '<div class="empty">No purchase orders yet.</div>'
 }</div>`;
}
function lpoPrint(p) {
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print the LPO.");
  const rows = p.lines
    .map(
      x =>
        `<tr><td>${esc(itemInfo(x.k).code || "")}</td><td>${esc(itemInfo(x.k).name)}</td><td>${esc(buyLabel(itemInfo(x.k)))}</td><td class="n">${qn(x.qty)}</td><td class="n">${m2(x.price)}</td><td class="n">${m2(x.qty * x.price)}</td></tr>`
    )
    .join("");
  w.document
    .write(`<!DOCTYPE html><html><head><title>${p.id}</title><style>body{font:14px Arial,sans-serif;margin:32px;color:#111}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #999;padding:6px 8px;text-align:left}.n{text-align:right}.g{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-top:12px}.s{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:48px}.s div{border-top:1px solid #111;padding-top:4px}</style></head><body>
<h1>${esc(FD_SETTINGS.name)}</h1><div>LOCAL PURCHASE ORDER</div>${p.appr ? "" : `<div style="margin-top:8px;padding:6px 10px;border:2px solid #b3261e;color:#b3261e;font-weight:700;display:inline-block">${p.status === "Rejected" ? "REJECTED" : "NOT APPROVED · NOT VALID FOR SUPPLY"}</div>`}
<div class="g"><div><b>LPO no:</b> ${p.id}</div><div><b>Date:</b> ${new Date(p.at).toLocaleDateString("en-GB")}</div><div><b>Vendor:</b> ${esc(p.sup)}</div><div><b>Deliver to:</b> ${esc(p.store)}</div><div><b>Expected delivery:</b> ${esc(p.due || "-")}</div><div><b>Raised by:</b> ${esc(p.by)}</div></div>
<table><tr><th>Code</th><th>Item</th><th>Unit</th><th class="n">Quantity</th><th class="n">Price (KES)</th><th class="n">Total (KES)</th></tr>${rows}<tr><td colspan="5"><b>Total</b></td><td class="n"><b>${m2(lpoTotal(p))}</b></td></tr></table>
${p.note ? `<p>${esc(p.note)}</p>` : ""}<div class="s"><div>Prepared by: ${esc(p.by)}</div><div>Approved by${p.appr ? ": " + esc(p.appr.by) + " · " + new Date(p.appr.at).toLocaleDateString("en-GB") : ""}</div></div><\/body><\/html>`); // "<\/" so tools scanning the page for </body> don't stop here
  w.document.close();
  w.focus();
  w.print();
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
        ...ITEM_GROUPS,
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
    keys = Object.keys(ING).sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name));
  if (!S.k || ING[S.k] === undefined) S.k = keys[0] || "";
  return `${itemDatalists()}
 <div class="pn"><div class="fr" style="align-items:center;justify-content:space-between"><div><h4 style="margin:0">Item setup</h4><div class="stk">Each item is created once and kept in the Stock Master. Receive it into a store, then issue it to any selling point.</div></div><button class="chip on" data-a="inv_itnew">+ New item</button></div></div>
 ${F.open ? itemPopup(F, editing, lockUom) : ""}
 ${sendPanel(S, keys)}
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
     <label>Item group<input data-iv="it.group" list="grpL" value="${esc(F.group)}" placeholder="e.g. Beverages"></label>`
     }
    </div>
    <div class="itm-hint" id="itDup"></div>
    ${itemMadeTick(F, editing)}
   </section>
   ${
     M
       ? itemMadeSection(F, sp)
       : `<section class="itm-s"><h4>Units and cost</h4>
    <div class="itm-g itm-g5">
     <label>Unit of measure<input data-iv="it.uom" list="uomL" value="${esc(F.uom)}" placeholder="pcs, kg, ml" ${lockUom ? 'disabled title="This item already has stock or history, so its unit cannot change."' : ""}></label>
     <label>Buying unit<input data-iv="it.buyUnit" list="buyL" value="${esc(F.buyUnit)}" placeholder="e.g. Crate"></label>
     <label>Units per buying unit<input data-iv="it.perBuy" type="number" min="0" step="any" value="${esc(F.perBuy)}" placeholder="e.g. 24"></label>
     <label>Buying price (KES)<input data-iv="it.buyPrice" type="number" min="0" step="any" value="${esc(F.buyPrice)}" placeholder="Optional"></label>
     <label>Reorder level<input data-iv="it.reorder" type="number" min="0" step="any" value="${esc(F.reorder)}" placeholder="Optional"></label>
    </div>
    <div class="itm-hint">Cost per unit: <b id="itCost"></b>${lockUom ? " · The unit is fixed because this item already has stock or history." : ""}</div>
   </section>`
   }
   ${
     editing || M
       ? ""
       : sp
         ? itemSpSection(F)
         : `<section class="itm-s"><h4>Opening stock <span>optional</span></h4>
    <div class="itm-g itm-g3">
     <label>Store<select data-iv="it.store">${opts(STORES, (F.store = pick(F.store, STORES)))}</select></label>
     <label>Quantity received (buying units)<input data-iv="it.qty" type="number" min="0" step="any" value="${esc(F.qty)}" placeholder="Empty = item only"></label>
     <label>Vendor<input data-iv="it.sup" value="${esc(F.sup)}" placeholder="Optional"></label>
    </div>
    <div class="itm-hint" id="itEq"></div>
   </section>`
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
        : { name: "", price: "", per: "1", tax: "B" }
    );
  }
  return `<div class="pn" id="sdPanel"><h4>Send stock to a selling point</h4>
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
   <label>VAT<select data-iv="sd.tax" ${prod ? "disabled" : ""}>${SP_TAX.map(([v, l]) => `<option value="${v}" ${v === S.tax ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>`
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
  return `<div class="pn tw"><h4>Items in the Stock Master (${keys.length})</h4><table class="t"><tr><th>Code</th><th>Item</th><th>Group</th><th>Unit</th><th>Buying unit</th><th class="n">Buying price</th><th class="n">Cost / unit</th><th class="n">In stores</th><th class="n">At selling points</th><th></th></tr>${keys
    .map(k => {
      const u = itemInfo(k),
        all = tot(k),
        inStores = STORES.reduce((a, l) => a + have(l, k), 0);
      return `<tr ${k === invF.itLast ? 'style="outline:2px solid #2ec4b6"' : ""}><td>${esc(u.code || "-")}</td><td>${esc(u.name)}</td><td>${esc(u.group || "")}</td><td>${esc(u.uom)}</td><td>${esc(buyLabel(u))}</td><td class="n">${m2(u.buyPrice)}</td><td class="n">${m2(cst(k))}</td><td class="n">${fq(inStores)}</td><td class="n ${all - inStores < 0 ? "neg" : ""}">${fq(all - inStores)}</td><td><div class="fr" style="flex-wrap:nowrap"><button class="mini" data-a="inv_itedit" data-k="${k}">Edit</button><button class="mini" data-a="inv_itpick" data-k="${k}">Send to selling point</button></div></td></tr>`;
    })
    .join("")}</table></div>`;
}
function invView() {
  const B = {
    stores: storesHTML,
    items: itemsHTML,
    master: masterHTML,
    req: reqHTML,
    issue: issHTML,
    damage: dmgHTML,
    position: posHTML,
    riss: () => invReportHTML("iss"),
    rdmg: () => invReportHTML("dmg"),
    variance: varHTML, // stock-take-report.js
    streps: stHistHTML,
    appr: apView // approvals.js
  };
  if (!isStore(STKT.loc)) STKT.loc = STORES[0]; // Inventory works on stores only
  if (!tabAllowed(invT) || !B[invT])
    invT = tabAllowed("master")
      ? "master"
      : RAIL.filter(x => x !== "-" && B[x[0]] && tabAllowed(x[0]))[0][0]; // e.g. LPO / purchases now live in Purchasing
  if (invT === "items") setTimeout(itPreview); // fill the live hints once the page is on screen
  // Popups that can be opened from more than one tab (Item setup draws its own item popup).
  const popups =
    (invT !== "items" ? itemPopupIfOpen() : "") +
    vendorPopupIfOpen() +
    stModalIfOpen() +
    apModalIfOpen();
  return `<div class="inv"><nav class="inv-rail">${rail()}</nav><div class="inv-main">${strip()}${(B[invT] || masterHTML)()}${popups}</div></div>`;
}
V.inv = invView;
function updMaster() {
  let n = 0,
    tt = 0;
  document.querySelectorAll("#vSub [data-vr]").forEach(td => {
    tt++;
    const p = STKT.phys[td.dataset.vr],
      has = p !== undefined && p !== "" && !isNaN(parseFloat(p)),
      v = has ? parseFloat(p) - parseFloat(td.dataset.sys) : 0;
    if (has) n++;
    td.textContent = has ? fq(v) : "";
    td.classList.toggle("neg", has && v < 0);
  });
  const pc = tt ? Math.round((n / tt) * 100) : 0,
    pb = document.querySelector("#vSub .pbar");
  if (pb) {
    pb.firstElementChild.style.width = pc + "%";
    pb.lastElementChild.textContent = pc + "%";
  }
}
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

  const k = editing ? F.edit : itemKey(name);
  INGU[k] = {
    code,
    name,
    group: F.group.trim() || "Raw materials",
    uom,
    buyUnit,
    perBuy,
    buyPrice: price
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
  invF.it = blankItemForm(F.store);
  invF.sd.k = k;
  invF.itLast = k; // highlight the new / edited row
  if (view === "pur" && purT === "receive" && !editing) rcPick(k, false); // created from Receive goods: ready to add
  if (made) return itemToProduction(k, made, msg);
  if (sp) return itemSpDone(k, sp, F, qty * perBuy, spPrice, msg);
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
  if (a === "stadd") {
    const name = invF.st.name.trim(),
      err = placeNameError(name);
    if (err) return toast(err);
    STORES.push(name);
    syncLocs();
    invF.st.name = "";
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
  if (a === "poprint") return lpoPrint(LPOS[+d.i]);
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
      reorder: RO[d.k] !== undefined ? String(RO[d.k]) : ""
    };
    invT = "items";
    return itOpened();
  }
  if (a === "itpick") {
    invF.sd = { ...invF.sd, k: d.k, qty: "" };
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
    // An issue note: the stock moves when a manager approves it (approvals.js).
    const x = raiseIssue(S.store, S.sp, [{ k: S.k, q: units }], "", "send");
    let msg = `Issue note ${x.id}: ${qtyBoth(S.k, units)} of ${u.name} from ${S.store} to ${S.sp}, waiting for approval.`;
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
  if (a === "loc") {
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
    // An issue note for the requisition: the stock moves when a manager approves it (approvals.js).
    const lines = [];
    r.lines.forEach((x, j) => {
      const want = Math.max(0, parseFloat($("#iq_" + d.i + "_" + j).value) || 0),
        q = Math.min(want, x.q - x.issued - reqPend(r, x.k), have(st, x.k));
      if (q > 0) lines.push({ k: x.k, q });
    });
    if (!lines.length)
      return toast("Nothing to issue. Check the quantities and the stock in " + st + ".");
    const x = raiseIssue(st, r.dept, lines, "", "requisition", r.id);
    toast(`Issue note ${x.id} for ${r.id} raised. The stock moves when a manager approves it.`);
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
    // An issue note: the stock moves when a manager approves it (approvals.js).
    const x = raiseIssue(F.from, F.to, F.lines, F.note, "issue");
    invF.is = { from: F.from, to: F.to, note: "", lines: [] };
    toast("Issue note " + x.id + " to " + F.to + " raised. It waits for a manager to approve it.");
    return all();
  }
  if (a === "dmpost") {
    const F = invF.dm;
    F.loc = STKT.loc;
    const k = F.k || Object.keys(ING)[0],
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
  else if (s.find !== undefined)
    stFind(e.target); // search boxes (stock-take-report.js)
  else if (s.stloc !== undefined) {
    stVar.loc = e.target.value === "All places" ? "All" : e.target.value;
    all();
  } else if (s.iv !== undefined) {
    const [p, f] = s.iv.split(".");
    invF[p][f] = e.target.value;
    if (p === "it") itSrcSync(f); // selling-points.js
    if (p === "it" || p === "sd") itPreview();
    if (p === "sd") sdSync(f);
    if (p === "spp") spPreview();
    if (p === "spr" && f === "store") all(); // show the new store's quantities
    if (p === "rc") rcSync(f); // direct receive (receive.js)
    if (p === "vs") vsSync(f); // vendor statement (vendors.js)
    if (p === "pr" || p === "rcp" || p === "recb" || p === "recr") prSync(p, f);
    if (p === "vh" || p === "hs") settingsPreview(); // settings.js
    if (p === "spe") speSync(f); // editing a selling point product (selling-points.js) // Recipes & Production (production.js)
  }
};

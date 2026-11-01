// ---- Recipes & Production: from kitchen materials to what is sold on the POS ----
// Flow: receive into a store (Purchasing) → issue to a materials store such as Kitchen Materials (a place
// under Selling points that never shows on the POS) → then either:
//  Production: convert materials into finished items now, e.g. 1 kg flour → 10 ugali. The cost of the
//              materials becomes the cost of the batch; the items go to a selling point's stock.
//  Recipe:     a product whose ingredients leave the materials store each time it is sold,
//              e.g. 0.25 kg flour + 0.1 L oil per portion (ITEMS entry with r + from, see itemLoc).
let recT = "overview";
const REC_TABS = [
  ["overview", "Kitchen materials", "box"],
  ["prod", "Production", "chef"],
  ["pbal", "Production balances", "chart"],
  ["recipes", "Recipes", "book"],
  ["allp", "All products", "box"],
  ["log", "Production log", "chart"]
];
const prBlank = () => ({
  from: "",
  to: "",
  outName: "",
  outUom: "pcs",
  outQty: "",
  price: "",
  tax: "B",
  note: "",
  lines: []
});
const rcpBlank = () => ({
  edit: null,
  name: "",
  sp: "",
  from: "",
  cat: "",
  price: "",
  tax: "B",
  lines: []
});
invF.pr = prBlank();
invF.rcp = rcpBlank();

const materialStores = () => ALLD.filter(isMaterials);
const salePoints = () => ALLD.filter(posSells);
const itemsByName = () =>
  Object.keys(ING).sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name));
/** Stock in place l, with its unit: "2.5 kg". */
const qtyAt = (l, k) => `${qn(have(l, k))} ${itemInfo(k).uom}`;

// ---------------------------------------------------------------- units
const UNIT_PAIR = {
  kg: ["g", 0.001],
  g: ["kg", 1000],
  L: ["ml", 0.001],
  l: ["ml", 0.001],
  ml: ["L", 1000]
};
/** Units a quantity of item k can be typed in: [label, how many units of measure one is]. */
function prUnits(k) {
  const u = itemInfo(k),
    L = [[u.uom, 1]],
    pair = UNIT_PAIR[u.uom];
  if (pair) L.push(pair);
  if (rcIsBuy(k, "buy") && !L.some(([n]) => n === u.buyUnit))
    L.push([`${u.buyUnit} (${qn(+u.perBuy)} ${u.uom})`, +u.perBuy]);
  return L;
}
const prUnitOpts = k =>
  k
    ? prUnits(k)
        .map(([n, f]) => `<option value="${f}">${esc(n)}</option>`)
        .join("")
    : "";
/** Item, quantity and unit fields for adding a line. id: "pr" or "rcp". */
function prLineEditor(id, keys, label, qtyLabel, place) {
  const k0 = pick(invF[id].pick, keys);
  return `<div class="fr" style="align-items:end"><label>${label}<select id="${id}_k" data-prunit="${id}_u" style="max-width:100%">${keys.map(k => `<option value="${k}" ${k === k0 ? "selected" : ""}>${esc(itemInfo(k).name)}${place ? " · " + place(k) : ""}</option>`).join("")}</select></label>
   <label>${qtyLabel}<input id="${id}_q" type="number" min="0" step="any" placeholder="e.g. 0.25"></label>
   <label>Unit<select id="${id}_u">${prUnitOpts(k0)}</select></label>
   <button class="mini" data-a="rec_ladd" data-f="${id}">Add line</button></div>`;
}
/** Read the line editor into form id; returns false after telling the user what is wrong. */
function prAddLine(id) {
  const F = invF[id],
    k = $("#" + id + "_k").value,
    q = parseFloat($("#" + id + "_q").value) * parseFloat($("#" + id + "_u").value);
  F.pick = k;
  if (!(q > 0)) return toast("Enter a quantity above zero, such as 0.5 or 0.25.");
  const ex = F.lines.find(x => x.k === k);
  if (ex) ex.q += q;
  else F.lines.push({ k, q });
  id === "spe" ? speRedraw() : id === "it" ? itRedraw() : all();
}

// ---------------------------------------------------------------- page
function recipesView() {
  const body =
    recT === "pbal" || recT === "allp"
      ? recBalHTML(recT)
      : recT === "prod"
        ? prodHTML()
        : recT === "recipes"
          ? recipesHTML()
          : recT === "log"
            ? prodLogHTML()
            : recOverviewHTML();
  return `<div class="inv"><nav class="inv-rail">${REC_TABS.map(
    ([t, l, ic]) =>
      `<button class="ir ${t === recT ? "on" : ""}" data-a="rec_tab" data-t="${t}">${I(ic)}<span>${l}</span></button>`
  ).join("")}</nav><div class="inv-main">${body}${apModalIfOpen()}</div></div>`;
}
V.rec = recipesView;

const noMaterials = () =>
  '<div class="pn"><div class="empty">No materials store yet. Under Selling points, create one with the type "Materials store".</div></div>';

/** Where an issue from a store goes unless someone chooses otherwise. */
const issueDefault = store =>
  materialStores().find(m => spInfo(m).store === store) || salePoints()[0] || ALLD[0];
/** What came into a materials store and where it went, per item. */
function materialFlow(m) {
  const A = {};
  MOV.forEach(x => {
    if (x.loc !== m) return;
    const a = (A[x.k] = A[x.k] || { inn: 0, prod: 0, rec: 0, other: 0 });
    if (x.t === "ISSUE_IN" || x.t === "TRANS_IN" || x.t === "RECEIVE") a.inn += x.q;
    else if (x.t === "PROD_OUT") a.prod -= x.q;
    else if (x.t === "SALE" || x.t === "SALE_RET") a.rec -= x.q;
    else a.other += x.q;
  });
  return A;
}
function recOverviewHTML() {
  const M = materialStores();
  if (!M.length) return noMaterials();
  const step = (n, t, s) =>
    `<div class="kst"><span>Step ${n}</span><b style="font-size:15px">${t}</b><div class="stk">${s}</div></div>`;
  return `<div class="kstg">
   ${step(1, "Receive", "Into the kitchen store, in Purchasing")}
   ${step(2, "Issue", "Everything comes here first, once a manager approves")}
   ${step(3, "Convert", "Production deducts when it runs")}
   ${step(4, "Sell", "Recipes deduct from here as they sell")}
  </div>
  ${M.map(m => {
    const flow = materialFlow(m),
      shown = itemsByName().filter(k => Math.abs(have(m, k)) > 1e-9 || flow[k]),
      value = shown.reduce((a, k) => a + Math.max(0, have(m, k)) * cst(k), 0),
      notes = ISSUES.filter(x => x.to === m && x.status === AWAIT),
      reqs = REQS.filter(r => r.dept === m && (r.status === AWAIT || isOpenReq(r)));
    return `<div class="pn tw"><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">${esc(m)} · KES ${m2(value)}</h4><span class="fr" style="flex:none;margin:0"><button class="mini" data-a="rec_issue" data-o="${esc(m)}">Issue from store</button><button class="mini" data-a="rec_manage" data-o="${esc(m)}">Requests and stock take</button></span></div>
    ${
      notes.length || reqs.length
        ? `<div class="km-wait"><h4>On the way here</h4>${notes
            .map(
              x =>
                `<div class="km-row"><span><b>Issue ${esc(x.id)}</b> from ${esc(x.from)}: ${x.lines.map(l => esc(itemInfo(l.k).name) + " " + qtyBoth(l.k, l.q)).join(", ")}. The stock arrives when a manager approves it.</span><span class="km-act">${apButtons("iss", x)}</span></div>`
            )
            .join("")}${reqs
            .map(
              r =>
                `<div class="km-row"><span><b>Requisition ${esc(r.id)}</b> to ${esc(r.store || STORES[0])}: ${r.lines.map(l => esc(itemInfo(l.k).name) + " " + qtyBoth(l.k, l.q)).join(", ")}. ${r.status === AWAIT ? "Waiting for approval." : "Approved. The store issues it next."}</span><span class="km-act">${apButtons("req", r)}</span></div>`
            )
            .join("")}</div>`
        : ""
    }${
      shown.length
        ? `<table class="t"><tr><th>Code</th><th>Material</th><th class="n">Issued here</th><th class="n">Used in production</th><th class="n">Used by recipes</th><th class="n">In stock</th><th class="n">Cost per unit</th><th class="n">Value (KES)</th></tr>${shown
            .map(k => {
              const a = flow[k] || { inn: 0, prod: 0, rec: 0 },
                u = itemInfo(k).uom;
              return `<tr><td>${esc(itemInfo(k).code || "")}</td><td>${esc(itemInfo(k).name)}</td><td class="n">${qn(a.inn)} ${esc(u)}</td><td class="n">${qn(a.prod)} ${esc(u)}</td><td class="n">${qn(a.rec)} ${esc(u)}</td><td class="n ${have(m, k) < 0 ? "neg" : ""}"><b>${qtyBoth(k, have(m, k))}</b></td><td class="n">${m2(cst(k))}</td><td class="n">${m2(Math.max(0, have(m, k)) * cst(k))}</td></tr>`;
            })
            .join("")}</table>`
        : notes.length
          ? ""
          : '<div class="empty">Nothing here yet. Issue materials from a store.</div>'
    }</div>`;
  }).join("")}`;
}

// ---------------------------------------------------------------- production
function prodHTML() {
  const M = materialStores(),
    F = invF.pr,
    S = salePoints();
  if (!M.length) return noMaterials();
  F.from = pick(F.from, M);
  F.to = pick(F.to, S);
  const keys = itemsByName().filter(k => have(F.from, k) > 0),
    cost = F.lines.reduce((a, x) => a + x.q * cst(x.k), 0),
    yq = parseFloat(F.outQty),
    outK = rcExact(F.outName),
    prod = outK ? sdProduct(outK, F.to) : null;
  return `<div class="pn"><h4>Convert materials into finished items</h4>
  <div class="stk">Example: 1 kg of flour makes 10 ugali. The materials leave ${esc(F.from)} and the finished items go to the selling point's stock.</div>
  <div class="fr"><label>Materials from<select data-iv="pr.from">${opts(M, F.from)}</select></label><label>Note<input data-iv="pr.note" value="${esc(F.note)}" placeholder="Optional, e.g. lunch batch"></label></div>
  ${
    keys.length
      ? prLineEditor("pr", keys, "Material", "Quantity used")
      : `<div class="fr" style="align-items:center"><span class="stk">${esc(F.from)} has no stock.</span><button class="mini" data-a="rec_issue" data-o="${esc(F.from)}">Issue from store</button></div>`
  }
  ${
    F.lines.length
      ? `<div class="tw"><table class="t"><tr><th>Material</th><th class="n">Quantity used</th><th class="n">In ${esc(F.from)}</th><th class="n">Cost (KES)</th><th></th></tr>${F.lines.map((x, i) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qn(x.q)} ${esc(itemInfo(x.k).uom)}</td><td class="n ${x.q > have(F.from, x.k) + 1e-9 ? "neg" : ""}">${qtyAt(F.from, x.k)}</td><td class="n">${m2(x.q * cst(x.k))}</td><td><button class="mini" data-a="rec_ldel" data-f="pr" data-i="${i}">✕</button></td></tr>`).join("")}<tr><td colspan="3"><b>Cost of materials</b></td><td class="n"><b>${m2(cost)}</b></td><td></td></tr></table></div>`
      : ""
  }
  <datalist id="prOutL">${itemsByName()
    .map(k => `<option value="${esc(itemInfo(k).name)}">`)
    .join("")}</datalist>
  <h4 style="margin:6px 0 0">What it makes</h4>
  <div class="fr"><label>Finished item<input data-iv="pr.outName" list="prOutL" value="${esc(F.outName)}" placeholder="e.g. Ugali"></label>
   <label>Quantity made<input data-iv="pr.outQty" type="number" min="0" step="any" value="${esc(F.outQty)}" placeholder="e.g. 10"></label>
   <label>Unit<input data-iv="pr.outUom" list="uomL" value="${esc(outK ? itemInfo(outK).uom : F.outUom)}" ${outK ? "disabled" : ""}></label>
   <label>Goes to<select data-iv="pr.to">${opts(S, F.to)}</select></label></div>
  <div class="fr"><label>Selling price on the POS (KES)<input data-iv="pr.price" type="number" min="0" step="any" value="${esc(F.price)}" placeholder="${prod ? "Now " + m2(prod.p) : "Empty = stock only"}"></label>
   <label>VAT<select data-iv="pr.tax">${SP_TAX.map(([v, l]) => `<option value="${v}" ${v === F.tax ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
  <div class="stk" id="prInfo">${yq > 0 && cost > 0 ? `Cost per item: KES ${m2(cost / yq)}` : ""}</div>
  <div class="fr"><button class="chip on" data-a="rec_run">Run production</button><button class="mini" data-a="rec_clear" data-f="pr">Clear</button></div></div>
  ${itemDatalists()}`;
}
/** Live cost per item while typing the quantity made. */
function prSync(p, f) {
  if (p === "recb" || p === "recr") return all(); // report dates
  if (p === "pr" && (f === "from" || f === "to" || f === "outName")) {
    if (f === "from") invF.pr.lines = [];
    // Keep the cursor in the finished item box unless the name now matches an item.
    if (f !== "outName") return all();
  }
  if (p === "rcp" && f === "from") return all();
  const el = $("#prInfo");
  if (p === "pr" && el) {
    const F = invF.pr,
      cost = F.lines.reduce((a, x) => a + x.q * cst(x.k), 0),
      y = parseFloat(F.outQty);
    el.textContent = y > 0 && cost > 0 ? `Cost per item: KES ${m2(cost / y)}` : "";
  }
}
function prodRun() {
  const F = invF.pr,
    name = F.outName.trim(),
    qty = parseFloat(F.outQty),
    price = String(F.price).trim() === "" ? null : parseFloat(F.price);
  if (!isMaterials(F.from)) return toast("Choose the materials store.");
  if (!F.lines.length) return toast("Add at least one material.");
  const short = F.lines.find(x => x.q > have(F.from, x.k) + 1e-9);
  if (short)
    return toast(`Only ${qtyAt(F.from, short.k)} of ${itemInfo(short.k).name} in ${F.from}.`);
  if (!name) return toast("Enter the finished item, such as Ugali.");
  if (!(qty > 0)) return toast("Enter how many it makes.");
  if (!posSells(F.to)) return toast("Choose the selling point it goes to.");
  if (price !== null && !(price > 0)) return toast("The selling price must be more than 0.");
  let k = rcExact(name);
  if (k && F.lines.some(x => x.k === k)) return toast(name + " cannot be made from itself.");
  const named = !k && ITEMS.some(i => i.d === F.to && i.n.toLowerCase() === name.toLowerCase());
  if (named && price !== null) return toast(F.to + " already sells a product called " + name + ".");
  if (!k) {
    const uom = F.outUom.trim() || "pcs";
    k = itemKey(name);
    INGU[k] = {
      code: nextItemCode(),
      name,
      group: "Production",
      uom,
      buyUnit: uom,
      perBuy: 1,
      buyPrice: 0
    };
    ING[k] = name + " (" + uom + ")";
    LOCS.forEach(l => (STK[l][k] = STK[l][k] || 0));
    INGC[k] = 0;
    RO[k] = 1;
  }
  const id = nid("PRD"),
    lines = F.lines.map(x => ({ k: x.k, q: x.q, c: cst(x.k) })),
    cost = lines.reduce((a, x) => a + x.q * x.c, 0),
    onHand = Math.max(0, tot(k));
  lines.forEach(x =>
    mvc(F.from, x.k, -x.q, "PROD_OUT", F.note || "Production " + id, F.to, id, boUser.n)
  );
  // The batch cost joins any stock already held, as a weighted average.
  INGC[k] = onHand + qty > 0 ? (onHand * cst(k) + cost) / (onHand + qty) : 0;
  mvc(F.to, k, qty, "PROD_IN", F.note || "Production " + id, F.from, id, boUser.n);
  PRODS.push({
    id,
    at: new Date().toISOString(),
    by: boUser.n,
    from: F.from,
    to: F.to,
    k,
    qty,
    cost,
    note: F.note.trim(),
    lines
  });
  let msg = `${id}: ${qn(qty)} ${itemInfo(k).uom} of ${itemInfo(k).name} made, KES ${m2(qty ? cost / qty : 0)} each.`;
  if (price !== null) {
    const prod = sdProduct(k, F.to);
    if (prod) prod.p = price;
    else
      ITEMS.push({
        id: Math.max(0, ...ITEMS.map(i => i.id)) + 1,
        n: itemInfo(k).name,
        d: F.to,
        c: (F.cat || "").trim() || itemInfo(k).group || spInfo(F.to).type,
        p: price,
        t: F.tax,
        r: { [k]: 1 }
      });
    spRefreshPos();
    msg += ` On the ${F.to} POS at KES ${m2(price)}.`;
  }
  invF.pr = { ...prBlank(), from: F.from, to: F.to };
  bosave();
  toast(msg);
  all();
}

function prodLogHTML() {
  const L = PRODS.slice().reverse().slice(0, 100),
    total = PRODS.reduce((a, x) => a + x.cost, 0);
  return `<div class="pn tw"><h4>Production log · KES ${m2(total)} of materials used</h4>${
    L.length
      ? `<table class="t"><tr><th>Date</th><th>No</th><th>Materials used</th><th>From</th><th>Made</th><th>To</th><th class="n">Cost (KES)</th><th class="n">Each (KES)</th><th>By</th><th></th></tr>${L.map(
          x =>
            `<tr><td>${dt2(x.at)}</td><td>${esc(x.id)}</td><td>${x.lines.map(l => `${esc(itemInfo(l.k).name)} ${qn(l.q)} ${esc(itemInfo(l.k).uom)}`).join(", ")}</td><td>${esc(x.from)}</td><td>${qn(x.qty)} ${esc(itemInfo(x.k).uom)} ${esc(itemInfo(x.k).name)}</td><td>${esc(x.to)}</td><td class="n">${m2(x.cost)}</td><td class="n">${m2(x.qty ? x.cost / x.qty : 0)}</td><td>${esc(x.by)}</td><td><button class="mini" data-a="rec_again" data-id="${esc(x.id)}">Run again</button></td></tr>`
        ).join("")}</table>`
      : '<div class="empty">No production yet.</div>'
  }</div>`;
}

// ---------------------------------------------------------------- recipes
// A product attached to production deducts a finished item: it belongs to Production balances.
const recipeList = () =>
  ITEMS.filter(i => !speIsProd(i) && (i.from || Object.keys(i.r || {}).length > 1));
const recipeCost = r => r.reduce((a, x) => a + x.q * cst(x.k), 0);
function recipesHTML() {
  const F = invF.rcp,
    S = salePoints(),
    M = materialStores();
  if (!S.length)
    return '<div class="pn"><div class="empty">Create a selling point first.</div></div>';
  F.sp = pick(F.sp, S);
  // Ingredients normally come from a materials store; the selling point's own stock is also allowed.
  if (!M.length) return noMaterials();
  F.from = pick(F.from, M);
  const keys = itemsByName(),
    cost = recipeCost(F.lines),
    price = parseFloat(F.price),
    can = F.lines.length ? recipeCan(F.lines, F.from) : 0;
  return `<div class="pn"><h4>${F.edit ? "Edit recipe" : "New recipe"}</h4>
  <div class="stk">One portion. Choose ingredients from the store; decimals such as 0.5, 0.25, 0.1 or 0.3 are fine. Each sale deducts them from what was issued to ${esc(F.from)}.</div>
  <div class="fr"><label>Product name<input id="rcpName" data-iv="rcp.name" value="${esc(F.name)}" placeholder="e.g. Beef stew"></label>
   <label>Sold at<select data-iv="rcp.sp">${opts(S, F.sp)}</select></label>
   ${recipeFromField("rcp.from", F.from)}</div>
  <div class="fr"><label>Selling price (KES)<input data-iv="rcp.price" type="number" min="0" step="any" value="${esc(F.price)}"></label>
   <label>Category<input data-iv="rcp.cat" value="${esc(F.cat)}" placeholder="e.g. Mains"></label>
   <label>VAT<select data-iv="rcp.tax">${SP_TAX.map(([v, l]) => `<option value="${v}" ${v === F.tax ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
  ${recipeLineEditor("rcp", F.from)}
  ${
    F.lines.length
      ? `<div class="tw"><table class="t"><tr><th>Ingredient</th><th class="n">Per portion</th><th class="n">In stores</th><th class="n">In ${esc(F.from)}</th><th class="n">Cost (KES)</th><th></th></tr>${F.lines.map((x, i) => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qn(x.q)} ${esc(itemInfo(x.k).uom)}</td>${recipeStockCells(x, F.from)}<td class="n">${m2(x.q * cst(x.k))}</td><td><button class="mini" data-a="rec_ldel" data-f="rcp" data-i="${i}">✕</button></td></tr>`).join("")}<tr><td colspan="4"><b>Cost per portion${price > 0 ? ` · margin ${Math.round(((price - cost) / price) * 100)}%` : ""} · can make ${can}</b></td><td class="n"><b>${m2(cost)}</b></td><td></td></tr></table></div>`
      : ""
  }
  <div class="fr"><button class="chip on" data-a="rec_rsave">${F.edit ? "Save recipe" : "Create recipe"}</button>${F.edit ? '<button class="mini" data-a="rec_clear" data-f="rcp">Cancel</button>' : ""}</div></div>
  <div class="pn tw"><h4>Recipes (${recipeList().length})</h4>${
    recipeList().length
      ? `<table class="t"><tr><th>Product</th><th>Sold at</th><th>Deducts from</th><th>Per portion</th><th class="n">Price</th><th class="n">Cost</th><th class="n">Margin</th><th class="n">Can make</th><th></th></tr>${recipeList()
          .map(i => {
            const r = Object.entries(i.r).map(([k, q]) => ({ k, q })),
              c = recipeCost(r),
              src = i.from || i.d;
            return `<tr><td>${esc(i.n)}</td><td>${esc(i.d)}</td><td>${esc(src)}</td><td>${r.map(x => `${esc(itemInfo(x.k).name)} ${qn(x.q)} ${esc(itemInfo(x.k).uom)}`).join(", ")}</td><td class="n">${m2(i.p)}</td><td class="n">${m2(c)}</td><td class="n">${i.p > 0 ? Math.round(((i.p - c) / i.p) * 100) + "%" : "-"}</td><td class="n">${recipeCan(r, src)}</td><td><div class="fr" style="flex-wrap:nowrap"><button class="mini" data-a="rec_redit" data-id="${i.id}">Edit</button><button class="mini" data-a="rec_rdel" data-id="${i.id}">Remove</button></div></td></tr>`;
          })
          .join("")}</table>`
      : '<div class="empty">No recipes yet.</div>'
  }</div>`;
}
/** How much of an item the stores hold, all together. */
const storeQty = k => STORES.reduce((a, l) => a + have(l, k), 0);
/** Ingredients a recipe can name: anything from the stores. Finished items from production are not ingredients. */
const recipeItems = from =>
  itemsByName().filter(k => !PRODS.some(x => x.k === k) || have(from, k) > 0);
/** The ingredient row of a recipe: chosen from the store, deducted from the materials store when sold. */
function recipeLineEditor(id, from) {
  const label = k => `Store ${qn(storeQty(k))} · ${from} ${qn(have(from, k))} ${itemInfo(k).uom}`;
  return prLineEditor(id, recipeItems(from), "Ingredient", "Per portion", label);
}
/** Ingredient quantity cells: what the stores hold, and what can be deducted when it sells. */
const recipeStockCells = (x, from) =>
  `<td class="n">${qn(storeQty(x.k))} ${esc(itemInfo(x.k).uom)}</td><td class="n ${have(from, x.k) < x.q - 1e-9 ? "neg" : ""}">${qtyAt(from, x.k)}</td>`;
/** " Issue Beef to Kitchen Materials before it can sell." when something is missing. */
function recipeShort(r, from) {
  const L = Object.entries(r)
    .filter(([k, q]) => have(from, k) < q - 1e-9)
    .map(([k]) => itemInfo(k).name);
  return L.length ? ` Issue ${L.join(", ")} to ${from} before it can sell.` : "";
}
/** Recipes deduct straight from a materials store: fixed, unless there are several to choose from. */
function recipeFromField(iv, from) {
  const M = materialStores();
  return M.length > 1
    ? `<label>Deducts from<select data-iv="${iv}">${opts(M, from)}</select></label>`
    : `<label>Deducts from<input data-iv="${iv}" value="${esc(from)}" readonly></label>`;
}
/** Whole portions the place's stock can make. */
const recipeCan = (r, place) =>
  r.length ? Math.max(0, Math.min(...r.map(x => Math.floor(have(place, x.k) / x.q + 1e-9)))) : 0;
function recipeSave() {
  const F = invF.rcp,
    name = F.name.trim(),
    price = parseFloat(F.price);
  if (!name) return toast("Enter the product name.");
  if (!posSells(F.sp)) return toast("Choose where it is sold.");
  if (!isMaterials(F.from)) return toast("Choose where the ingredients come from.");
  if (!(price > 0)) return toast("Enter the selling price.");
  if (!F.lines.length) return toast("Add at least one ingredient.");
  if (ITEMS.some(i => i.id !== F.edit && i.d === F.sp && i.n.toLowerCase() === name.toLowerCase()))
    return toast(F.sp + " already sells a product called " + name + ".");
  const r = Object.fromEntries(F.lines.map(x => [x.k, x.q])),
    data = {
      n: name,
      d: F.sp,
      c: F.cat.trim() || spInfo(F.sp).type,
      p: price,
      t: F.tax,
      r,
      from: F.from
    },
    was = ITEMS.find(i => i.id === F.edit);
  if (was) Object.assign(was, data);
  else ITEMS.push({ id: Math.max(0, ...ITEMS.map(i => i.id)) + 1, ...data });
  invF.rcp = { ...rcpBlank(), sp: F.sp, from: F.from };
  spRefreshPos();
  bosave();
  toast(
    `${name} ${was ? "updated" : "is now on the " + F.sp + " POS"} at KES ${m2(price)}.` +
      recipeShort(r, F.from)
  );
  all();
}

// ---------------------------------------------------------------- "Made in-house" on the item popup
/** "recipe" or "prod" when the open item form is ticked as made in-house, else "". */
const itemMadeOffered = F => !F.edit && view !== "pur"; // goods on a receipt are bought, not made
const itemMadeWay = F => (itemMadeOffered(F) && F.made ? F.madeWay : "");
function itemMadeTick(F, editing) {
  // A selling point chooses this in its own popup (each sale deducts from).
  if (editing || !itemMadeOffered(F) || itemSpPoint(F)) return "";
  return `<label class="itm-tick"><input type="checkbox" data-a="inv_itmade" ${F.made ? "checked" : ""}><span><b>Made in-house</b> Comes from a recipe or from production, not bought</span></label>`;
}
const madeRecipes = () => recipeList().map(i => [String(i.id), i.n + " · " + i.d]);
/** Latest production of each finished item. */
const madeProds = () => {
  const seen = new Set();
  return PRODS.slice()
    .reverse()
    .filter(x => !seen.has(x.k) && seen.add(x.k))
    .map(x => [
      x.id,
      `${itemInfo(x.k).name}: ${x.lines.map(l => qn(l.q) + " " + itemInfo(l.k).uom + " " + itemInfo(l.k).name).join(", ")} → ${qn(x.qty)}`
    ]);
};
function itemMadeSection(F, sp) {
  const recipe = F.madeWay === "recipe",
    S = salePoints(),
    L = recipe ? madeRecipes() : madeProds(),
    ways = [
      ["recipe", "From a recipe", "Ingredients deduct each time it sells"],
      ["prod", "From production", "Make a batch now, sell from stock"]
    ];
  F.madeSp = pick(F.madeSp || sp, S);
  return `<section class="itm-s"><h4>How it is made</h4>
    <div class="grn-modes it-ways it-ways2">${ways
      .map(
        ([w, l, s]) =>
          `<button class="grn-mode ${F.madeWay === w ? "on" : ""}" data-a="inv_itmway" data-w="${w}"><b>${l}</b><span>${s}</span></button>`
      )
      .join("")}</div>
    <div class="itm-g itm-g3">
     <label class="itm-span2">${recipe ? "Copy ingredients from" : "Copy materials from"}<select data-iv="it.madeFrom"><option value="">${L.length ? "Start new" : recipe ? "Start new · no recipes yet" : "Start new · no production yet"}</option>${L.map(([v, l]) => `<option value="${esc(v)}" ${v === F.madeFrom ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
     ${recipe ? "" : `<label>Unit of measure<input data-iv="it.uom" list="uomL" value="${esc(F.uom)}" placeholder="pcs, kg, ml"></label>`}
    </div>
   </section>
   <section class="itm-s"><h4>Sell it <span>${recipe ? "" : "optional"}</span></h4>
    <div class="itm-g itm-g4">
     <label>${recipe ? "Sold at" : "Goes to"}<select data-iv="it.madeSp">${opts(S, F.madeSp)}</select></label>
     <label>Selling price (KES)<input data-iv="it.spPrice" type="number" min="0" step="any" value="${esc(F.spPrice)}" placeholder="${recipe ? "Needed" : "Empty = stock only"}"></label>
     <label>Category<input data-iv="it.spCat" value="${esc(F.spCat)}" placeholder="e.g. Mains"></label>
     <label>VAT<select data-iv="it.spTax">${SP_TAX.map(([v, l]) => `<option value="${v}" ${v === F.spTax ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    </div>
    <div class="itm-hint">Next you add the ${recipe ? "ingredients and create the recipe" : "materials and run the production"}.</div>
   </section>`;
}
/** Recipe chosen: nothing is saved yet, the Recipes form opens filled in. */
function itemToRecipe(F) {
  const name = F.name.trim(),
    sp = pick(F.madeSp, salePoints()),
    was = ITEMS.find(i => String(i.id) === F.madeFrom);
  if (!name) return toast("Enter the item name.");
  invF.rcp = {
    ...rcpBlank(),
    name,
    sp,
    from: was ? was.from || was.d : "",
    cat: F.spCat,
    price: F.spPrice,
    tax: F.spTax,
    lines: was ? Object.entries(was.r).map(([k, q]) => ({ k, q })) : []
  };
  invF.it = blankItemForm(F.store);
  recT = "recipes";
  toast(`Add the ingredients for ${name}, then press Create recipe.`);
  return go("Recipes & Production");
}
/** Production chosen: prepare the form so the normal save makes the stock item only. */
function itemMadeStart(F) {
  const made = {
    sp: pick(F.madeSp, salePoints()),
    price: F.spPrice,
    cat: F.spCat,
    tax: F.spTax,
    from: PRODS.find(x => x.id === F.madeFrom)
  };
  Object.assign(F, {
    sp: "",
    qty: "",
    sup: "",
    buyUnit: "",
    perBuy: "1",
    buyPrice: "",
    group: F.group.trim() || "Production",
    made: false
  });
  return made;
}
/** After saving the item: the Production form opens with it as the finished item. */
function itemToProduction(k, M, msg) {
  invF.pr = {
    ...prBlank(),
    from: M.from ? M.from.from : "",
    to: M.sp,
    outName: itemInfo(k).name,
    outQty: M.from ? String(M.from.qty) : "",
    price: M.price,
    cat: M.cat,
    tax: M.tax,
    lines: M.from ? M.from.lines.map(l => ({ k: l.k, q: l.q })) : []
  };
  recT = "prod";
  bosave();
  toast(msg + " Add the materials, then press Run production.");
  return go("Recipes & Production");
}

// ---------------------------------------------------------------- balances
// Opening + added − used = remaining, for the chosen dates. Worked backwards from today's stock, so the
// figures always agree with the stock on hand. Total cost = what remains, at the item's cost now.
invF.recb = { from: todayYmd().slice(0, 8) + "01", to: todayYmd() };
// Items can be counted in stock units (production) or in sales (all products).
const BAL_KIND = {
  pbal: {
    title: "Production balances",
    what: "Finished items from production, at the selling point they went to.",
    item: "Finished item",
    added: "Added",
    used: "Sold / used",
    empty: "No production yet."
  },
  allp: {
    title: "All products in selling points",
    what: "Every product on the POS, counted in sales. Recipes show sales and how many can be made now; their ingredients are valued under Kitchen materials.",
    item: "Product",
    added: "Added",
    used: "Sold / used",
    empty: "No products yet."
  }
};
/** The item + place pairs a balance covers. */
function balPairs(kind) {
  const m = new Map(),
    pair = (k, loc, note) => {
      if (!LOCS.includes(loc) || ING[k] === undefined) return;
      const id = k + "|" + loc,
        o = m.get(id) || { k, loc, notes: new Set() };
      if (note) o.notes.add(note);
      m.set(id, o);
    };
  PRODS.forEach(x => pair(x.k, x.to));
  return [...m.values()].sort(
    (a, b) => itemInfo(a.k).name.localeCompare(itemInfo(b.k).name) || a.loc.localeCompare(b.loc)
  );
}
/** One row per product on the POS, in sales rather than stock units. */
function allProductRows() {
  const A = new Date(invF.recb.from + "T00:00:00").getTime(),
    Z = new Date(invF.recb.to + "T23:59:59.999").getTime();
  return ITEMS.filter(i => ALLD.includes(i.d))
    .sort((a, b) => a.d.localeCompare(b.d) || a.n.localeCompare(b.n))
    .map(i => {
      const K = Object.keys(i.r),
        at = i.from || i.d,
        cost = spCost(i),
        sold = SALES.filter(s => s.at >= A && s.at <= Z).reduce(
          (a, s) => a + s.lines.filter(l => l.id === i.id).reduce((b, l) => b + l.q, 0),
          0
        ),
        row = { i, cost, sold, recipe: K.length !== 1 || isMaterials(i.from) };
      if (row.recipe)
        // Recipes share their ingredients, so no total here: they are valued under Kitchen materials.
        return {
          ...row,
          opening: null,
          added: null,
          used: sold,
          remaining: recipeCan(
            K.map(k => ({ k, q: i.r[k] })),
            at
          ),
          total: null,
          addedCost: 0
        };
      const k = K[0],
        per = i.r[k],
        L = MOV.filter(x => x.k === k && x.loc === at),
        inside = L.filter(x => x.at >= A && x.at <= Z),
        rem = have(at, k) - L.filter(x => x.at > Z).reduce((a, x) => a + x.q, 0),
        added = inside.filter(x => x.q > 0).reduce((a, x) => a + x.q, 0),
        used = inside.filter(x => x.q < 0).reduce((a, x) => a - x.q, 0);
      return {
        ...row,
        opening: (rem - added + used) / per,
        added: added / per,
        used: used / per,
        remaining: rem / per,
        stockId: k + "|" + at,
        stockValue: Math.max(0, rem) * cst(k),
        total: (Math.max(0, rem) / per) * cost,
        addedCost: inside.filter(x => x.q > 0).reduce((a, x) => a + (x.q / per) * cost, 0)
      };
    });
}
function balRows(kind) {
  if (kind === "allp") return allProductRows();
  const A = new Date(invF.recb.from + "T00:00:00").getTime(),
    Z = new Date(invF.recb.to + "T23:59:59.999").getTime(),
    moves = {};
  MOV.forEach(x => (moves[x.k + "|" + x.loc] = moves[x.k + "|" + x.loc] || []).push(x));
  return balPairs(kind).map(p => {
    const L = moves[p.k + "|" + p.loc] || [],
      inside = L.filter(x => x.at >= A && x.at <= Z),
      remaining = have(p.loc, p.k) - L.filter(x => x.at > Z).reduce((a, x) => a + x.q, 0),
      added = inside.filter(x => x.q > 0).reduce((a, x) => a + x.q, 0),
      used = inside.filter(x => x.q < 0).reduce((a, x) => a - x.q, 0),
      cost = cst(p.k);
    return {
      ...p,
      u: itemInfo(p.k),
      opening: remaining - added + used,
      added,
      used,
      remaining,
      cost,
      total: Math.max(0, remaining) * cost,
      addedCost: inside
        .filter(x => x.q > 0)
        .reduce((a, x) => a + x.q * (x.c !== undefined ? x.c : cost), 0)
    };
  });
}
/** Stock worth, counting an item once even when two products sell it. */
const allProductTotal = R => {
  const seen = new Set();
  return R.reduce((a, r) => {
    if (!r.stockId || seen.has(r.stockId)) return a;
    seen.add(r.stockId);
    return a + r.stockValue;
  }, 0);
};
function allProductTable(R, print) {
  const q0 = n => (n === null ? "–" : qn(n)),
    total = allProductTotal(R);
  return `<table class="${print ? "st-t" : "t"}"><thead><tr><th>Product</th><th>Sold at</th><th>Deducts from</th><th class="n">Price</th><th class="n">Opening</th><th class="n">Added</th><th class="n">Sold / used</th><th class="n">Remaining</th><th class="n">Cost per sale</th><th class="n">Total cost (KES)</th></tr></thead><tbody>${R.map(
    r =>
      `<tr${print ? "" : findAttr("bal", r.i.n, r.i.d, r.i.from || "", r.i.c)}><td>${esc(r.i.n)}</td><td>${esc(r.i.d)}</td><td>${speSourceTag(r.i)}</td><td class="n">${m2(r.i.p)}</td><td class="n">${q0(r.opening)}</td><td class="n">${q0(r.added)}</td><td class="n">${qn(r.used)}</td><td class="n ${r.remaining < 0 ? "neg" : ""}"><b>${qn(r.remaining)}</b></td><td class="n">${m2(r.cost)}</td><td class="n">${r.total === null ? "–" : m2(r.total)}</td></tr>`
  ).join(
    ""
  )}<tr class="st-tot"><td colspan="9"><b>Total cost of what remains</b></td><td class="n"><b>${m2(total)}</b></td></tr></tbody></table>`;
}
function balTable(kind, R, print) {
  if (kind === "allp") return allProductTable(R, print);
  const K = BAL_KIND[kind],
    total = R.reduce((a, r) => a + r.total, 0);
  return `<table class="${print ? "st-t" : "t"}"><thead><tr><th>${K.item}</th><th>Held at</th><th>Unit</th><th class="n">Opening</th><th class="n">${K.added}</th><th class="n">${K.used}</th><th class="n">Remaining</th><th class="n">Unit cost</th><th class="n">Total cost (KES)</th></tr></thead><tbody>${R.map(
    r =>
      `<tr${print ? "" : findAttr("bal", r.u.name, r.loc, [...r.notes].join(" "))}><td>${esc(r.u.name)}</td><td>${esc(r.loc)}</td><td>${esc(r.u.uom)}</td><td class="n">${qn(r.opening)}</td><td class="n">${qn(r.added)}</td><td class="n">${qn(r.used)}</td><td class="n ${r.remaining < 0 ? "neg" : ""}"><b>${qn(r.remaining)}</b></td><td class="n">${m2(r.cost)}</td><td class="n">${m2(r.total)}</td></tr>`
  ).join(
    ""
  )}<tr class="st-tot"><td colspan="8"><b>Total cost of what remains</b></td><td class="n"><b>${m2(total)}</b></td></tr></tbody></table>`;
}
function recBalHTML(kind) {
  const K = BAL_KIND[kind],
    F = invF.recb,
    R = balRows(kind),
    bad = F.from > F.to,
    sum2 = f => R.reduce((a, r) => a + f(r), 0),
    kst = (l, v) => `<div class="kst"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="pn"><h4>${K.title}</h4><div class="stk">${K.what}</div>
  <div class="fr" style="align-items:end;margin-top:8px"><label>From<input type="date" data-iv="recb.from" value="${esc(F.from)}"></label><label>To<input type="date" data-iv="recb.to" value="${esc(F.to)}"></label><div class="seg2"><button data-a="rec_brange" data-rng="today">Today</button><button data-a="rec_brange" data-rng="month">This month</button></div><button class="chip on" style="flex:none" data-a="rec_bprint" ${R.length && !bad ? "" : "disabled"}>Print</button></div></div>
  ${
    bad
      ? '<div class="pn"><div class="empty">The From date is after the To date.</div></div>'
      : !R.length
        ? `<div class="pn"><div class="empty">${K.empty}</div></div>`
        : `<div class="kstg">${kst("Items", R.length)}${kst("Cost of what was added", "KES " + m2(sum2(r => r.addedCost)))}${kst("Total cost of what remains", "KES " + m2(kind === "allp" ? allProductTotal(R) : sum2(r => r.total)))}</div>
  <div class="pn tw" data-findscope><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">${slashDate(F.from)} to ${slashDate(F.to)}</h4>${findBox("bal", "Search item or place")}</div>${balTable(kind, R)}<div class="stk">Opening + added − ${K.used.toLowerCase()} = remaining. Total cost uses each item's cost today.</div></div>`
  }`;
}
/** The balance on paper (print rules are ST_CSS). */
function recBalDoc(kind) {
  const K = BAL_KIND[kind],
    F = invF.recb,
    R = balRows(kind),
    S = FD_SETTINGS.biz || {};
  return `<div class="st-doc"><div class="st-head">${[
    FD_SETTINGS.name,
    S.addr,
    S.phone && "Tel " + S.phone,
    S.email
  ]
    .filter(Boolean)
    .map(x => `<div>${esc(x)}</div>`)
    .join("")}<h2>${K.title}</h2></div>
 <div class="st-meta"><div><span>From date</span><b>${slashDate(F.from)}</b></div><div><span>To date</span><b>${slashDate(F.to)}</b></div><div><span>Items</span><b>${R.length}</b></div></div>
 ${balTable(kind, R, true)}
 <div class="st-sig"><div>Prepared by: ${esc(boUser ? boUser.n : "")}</div><div>Checked by</div><div>Approved by</div></div>
 <div class="st-foot"><span>Opening + added − ${esc(K.used.toLowerCase())} = remaining. Total cost uses each item's cost today (excl. VAT).</span><span>Printed ${slashDate(todayYmd())} ${hm(new Date())}</span></div></div>`;
}

// ---------------------------------------------------------------- Recipe & Production Report
// For each item in a materials store: opening + issued − used in production − used by recipes ± other
// = remaining, worked backwards from today's stock so it always agrees with the stock on hand.
invF.recr = { from: todayYmd().slice(0, 8) + "01", to: todayYmd() };
function recRepData() {
  const F = invF.recr,
    A = new Date(F.from + "T00:00:00").getTime(),
    Z = new Date(F.to + "T23:59:59.999").getTime(),
    items = [];
  materialStores().forEach(m => {
    const L = MOV.filter(x => x.loc === m);
    itemsByName().forEach(k => {
      const mine = L.filter(x => x.k === k),
        inside = mine.filter(x => x.at >= A && x.at <= Z),
        remaining = have(m, k) - mine.filter(x => x.at > Z).reduce((a, x) => a + x.q, 0);
      if (!inside.length && Math.abs(remaining) < 1e-9) return;
      const cost = cst(k),
        r = {
          k,
          m,
          cost,
          issued: 0,
          prod: 0,
          rec: 0,
          other: 0,
          prodCost: 0,
          recCost: 0,
          remaining
        };
      inside.forEach(x => {
        const c = x.c !== undefined ? x.c : cost;
        if (x.t === "ISSUE_IN" || x.t === "TRANS_IN" || x.t === "RECEIVE") r.issued += x.q;
        else if (x.t === "PROD_OUT") {
          r.prod -= x.q;
          r.prodCost -= x.q * c;
        } else if (x.t === "SALE" || x.t === "SALE_RET") {
          r.rec -= x.q;
          r.recCost -= x.q * c;
        } else r.other += x.q;
      });
      r.opening = remaining - r.issued + r.prod + r.rec - r.other;
      r.value = Math.max(0, remaining) * cost;
      items.push(r);
    });
  });
  // Recipes sold: portions, at each recipe's ingredients today.
  const sold = new Map();
  SALES.filter(s => s.at >= A && s.at <= Z).forEach(s =>
    s.lines.forEach(l => sold.set(l.id, (sold.get(l.id) || 0) + l.q))
  );
  const recipes = recipeList()
    .filter(i => sold.get(i.id))
    .map(i => ({ i, q: sold.get(i.id), cost: spCost(i) * sold.get(i.id) }));
  const runs = PRODS.filter(x => {
    const t = new Date(x.at).getTime();
    return t >= A && t <= Z;
  })
    .slice()
    .reverse();
  return { items, recipes, runs };
}
function recRepTables(D, print) {
  const cls = print ? "st-t" : "t",
    h = t => (print ? `<h3 class="rr-h">${t}</h3>` : `<h4>${t}</h4>`),
    wrap = html => (print ? html : `<div class="pn tw" data-findscope>${html}</div>`),
    sum2 = (L, f) => L.reduce((a, r) => a + f(r), 0),
    u = k => esc(itemInfo(k).uom),
    q0 = n => (Math.abs(n) < 1e-9 ? "–" : qn(n));
  const main = `${
    print
      ? h("How each item was used")
      : `<div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">How each item was used</h4>${findBox("rrp", "Search item or place")}</div>`
  }
  <table class="${cls}"><thead><tr><th>Item</th><th>Held at</th><th>Unit</th><th class="n">Opening</th><th class="n">Issued in</th><th class="n">Used in production</th><th class="n">Used by recipes</th><th class="n">Other</th><th class="n">Remaining</th><th class="n">Cost used (KES)</th><th class="n">Value left (KES)</th></tr></thead><tbody>${
    D.items.length
      ? D.items
          .map(
            r =>
              `<tr${print ? "" : findAttr("rrp", itemInfo(r.k).name, r.m, itemInfo(r.k).code || "")}><td>${esc(itemInfo(r.k).name)}</td><td>${esc(r.m)}</td><td>${u(r.k)}</td><td class="n">${qn(r.opening)}</td><td class="n">${q0(r.issued)}</td><td class="n">${q0(r.prod)}</td><td class="n">${q0(r.rec)}</td><td class="n">${q0(r.other)}</td><td class="n ${r.remaining < 0 ? "neg" : ""}"><b>${qn(r.remaining)}</b></td><td class="n">${m2(r.prodCost + r.recCost)}</td><td class="n">${m2(r.value)}</td></tr>`
          )
          .join("") +
        `<tr class="st-tot"><td colspan="9"><b>Total</b></td><td class="n"><b>${m2(sum2(D.items, r => r.prodCost + r.recCost))}</b></td><td class="n"><b>${m2(sum2(D.items, r => r.value))}</b></td></tr>`
      : '<tr><td colspan="11" class="stk">Nothing was used in these dates, and no materials are held.</td></tr>'
  }</tbody></table>`;
  const prod = `${h("Production runs")}
  <table class="${cls}"><thead><tr><th>Date</th><th>No</th><th>Materials used</th><th>Made</th><th>Went to</th><th class="n">Cost (KES)</th><th class="n">Each (KES)</th></tr></thead><tbody>${
    D.runs.length
      ? D.runs
          .map(
            x =>
              `<tr><td>${dt2(x.at)}</td><td>${esc(x.id)}</td><td>${x.lines.map(l => `${esc(itemInfo(l.k).name)} ${qn(l.q)} ${u(l.k)}`).join(", ")}</td><td>${qn(x.qty)} ${u(x.k)} ${esc(itemInfo(x.k).name)}</td><td>${esc(x.to)}</td><td class="n">${m2(x.cost)}</td><td class="n">${m2(x.qty ? x.cost / x.qty : 0)}</td></tr>`
          )
          .join("")
      : '<tr><td colspan="7" class="stk">No production in these dates.</td></tr>'
  }</tbody></table>`;
  const rec = `${h("Recipes sold")}
  <table class="${cls}"><thead><tr><th>Product</th><th>Sold at</th><th class="n">Portions sold</th><th>Ingredients used</th><th class="n">Cost (KES)</th></tr></thead><tbody>${
    D.recipes.length
      ? D.recipes
          .map(
            ({ i, q, cost }) =>
              `<tr><td>${esc(i.n)}</td><td>${esc(i.d)}</td><td class="n">${qn(q)}</td><td>${Object.entries(
                i.r
              )
                .map(([k, v]) => `${esc(itemInfo(k).name)} ${qn(v * q)} ${u(k)}`)
                .join(", ")}</td><td class="n">${m2(cost)}</td></tr>`
          )
          .join("")
      : '<tr><td colspan="5" class="stk">No recipes sold in these dates.</td></tr>'
  }</tbody></table>`;
  return wrap(main) + wrap(prod) + wrap(rec);
}
function recRepView() {
  const F = invF.recr,
    bad = F.from > F.to,
    D = bad ? null : recRepData(),
    sum2 = f => D.items.reduce((a, r) => a + f(r), 0),
    kst = (l, v) => `<div class="kst"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="inv" style="grid-template-columns:minmax(0,1fr)"><div class="inv-main">
  <div class="pn"><div class="fr" style="align-items:end"><label>From<input type="date" data-iv="recr.from" value="${esc(F.from)}"></label><label>To<input type="date" data-iv="recr.to" value="${esc(F.to)}"></label><div class="seg2"><button data-a="rec_rrange" data-rng="today">Today</button><button data-a="rec_rrange" data-rng="month">This month</button></div><button class="chip on" style="flex:none" data-a="rec_rprint" ${bad ? "disabled" : ""}>Print</button></div></div>
  ${
    bad
      ? '<div class="pn"><div class="empty">The From date is after the To date.</div></div>'
      : `<div class="kstg">${kst("Cost used in production", "KES " + m2(sum2(r => r.prodCost)))}${kst("Cost used by recipes", "KES " + m2(sum2(r => r.recCost)))}${kst("Value left", "KES " + m2(sum2(r => r.value)))}${kst("Production runs", D.runs.length)}</div>
  ${recRepTables(D)}
  <div class="stk">Opening + issued in − used in production − used by recipes ± other = remaining. Other is damages, stock takes and transfers out. Recipes sold uses each recipe's ingredients today, and counts settled sales only.</div>`
  }
 </div>${apModalIfOpen()}</div>`;
}
V.recrep = recRepView;
function recRepDoc() {
  const F = invF.recr,
    D = recRepData(),
    S = FD_SETTINGS.biz || {};
  return `<div class="st-doc"><div class="st-head">${[
    FD_SETTINGS.name,
    S.addr,
    S.phone && "Tel " + S.phone,
    S.email
  ]
    .filter(Boolean)
    .map(x => `<div>${esc(x)}</div>`)
    .join("")}<h2>Recipe &amp; Production Report</h2></div>
 <div class="st-meta"><div><span>From date</span><b>${slashDate(F.from)}</b></div><div><span>To date</span><b>${slashDate(F.to)}</b></div><div><span>Items</span><b>${D.items.length}</b></div></div>
 ${recRepTables(D, true)}
 <div class="st-sig"><div>Prepared by: ${esc(boUser ? boUser.n : "")}</div><div>Checked by</div><div>Approved by</div></div>
 <div class="st-foot"><span>Opening + issued in − used in production − used by recipes ± other = remaining. Values at cost (excl. VAT).</span><span>Printed ${slashDate(todayYmd())} ${hm(new Date())}</span></div></div>`;
}

// ---------------------------------------------------------------- actions (data-a="rec_…")
function recAct(a, b) {
  const d = b.dataset;
  if (a === "tab") {
    recT = d.t;
    return all();
  }
  if (a === "brange") {
    const t = todayYmd();
    invF.recb = { from: d.rng === "month" ? t.slice(0, 8) + "01" : t, to: t };
    return all();
  }
  if (a === "rrange") {
    const t = todayYmd();
    invF.recr = { from: d.rng === "month" ? t.slice(0, 8) + "01" : t, to: t };
    return all();
  }
  if (a === "rprint") return stPrint("Recipe & Production Report", recRepDoc());
  if (a === "bprint") return stPrint(BAL_KIND[recT].title, recBalDoc(recT));
  if (a === "ladd") return prAddLine(d.f);
  if (a === "ldel") {
    invF[d.f].lines.splice(+d.i, 1);
    return d.f === "spe" ? speRedraw() : d.f === "it" ? itRedraw() : all();
  }
  if (a === "clear") {
    invF[d.f] = d.f === "pr" ? prBlank() : rcpBlank();
    return all();
  }
  if (a === "issue") {
    // Stock reaches a materials store by an issue from a store. Close any form this was opened from.
    invF.spe = null;
    if (invF.it.open) invF.it = blankItemForm(invF.it.store);
    invF.is.to = d.o;
    STKT.loc = spInfo(d.o).store;
    invT = "issue";
    return go("Inventory");
  }
  if (a === "manage") {
    spSel = d.o;
    return go("Selling points");
  }
  if (a === "run") return prodRun();
  if (a === "again") {
    const x = PRODS.find(p => p.id === d.id);
    invF.pr = {
      ...prBlank(),
      from: x.from,
      to: x.to,
      outName: itemInfo(x.k).name,
      outQty: String(x.qty),
      lines: x.lines.map(l => ({ k: l.k, q: l.q }))
    };
    recT = "prod";
    return all();
  }
  if (a === "rsave") return recipeSave();
  if (a === "redit") {
    const i = ITEMS.find(x => x.id === +d.id);
    invF.rcp = {
      edit: i.id,
      name: i.n,
      sp: i.d,
      from: i.from || i.d,
      cat: i.c,
      price: String(i.p),
      tax: i.t,
      lines: Object.entries(i.r).map(([k, q]) => ({ k, q }))
    };
    all();
    const n = $("#rcpName");
    return n && n.focus();
  }
  if (a === "rdel") {
    const id = +d.id,
      at = ITEMS.findIndex(x => x.id === id);
    if (at < 0) return;
    if (orders.some(x => x.lines[id]) || cart[id])
      return toast("This product is on an open bill. Settle it first.");
    return tapConfirm(
      b,
      () => {
        const n = ITEMS[at].n;
        ITEMS.splice(at, 1);
        if (invF.rcp.edit === id) invF.rcp = rcpBlank();
        spRefreshPos();
        bosave();
        toast(n + " removed.");
        all();
      },
      "Remove?"
    );
  }
}

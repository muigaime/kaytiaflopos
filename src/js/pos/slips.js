// ---- printed slips: guest bill, receipt after clearing a bill, kitchen / bar order ----
// 80mm paper. Thermal printers only print black, so the look comes from type and rules, never from colour.
// Hotel details come from Back Office → Settings (FD_SETTINGS.name and FD_SETTINGS.biz).
const slipEsc = s =>
  String(s === undefined || s === null ? "" : s).replace(
    /[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
/** Options from Back Office → Settings. Each one starts the way the system worked before it existed. */
const POS_OPT_START = {
  showLogo: true,
  ordNoBill: true,
  taxBill: true,
  taxRcpt: true,
  signBill: true,
  signRcpt: false,
  waiterFoot: true,
  stopPrinted: true,
  mustSend: false,
  pricesOnOrders: false,
  orderAndBill: false,
  autoLogout: false,
  chefMsg: true,
  tips: true,
  boWaiterShift: true
};
const posOpt = k => {
  const o = FD_SETTINGS.opts || {};
  return k in o ? o[k] : POS_OPT_START[k];
};
/** Options that change a screen that's always there. */
function posOptsApply() {
  const km = $("#kmBtn");
  if (km) km.style.display = posOpt("chefMsg") ? "" : "none";
}
const slipBiz = () => {
  const lg = FD_SETTINGS.logos || {};
  return {
    name: FD_SETTINGS.name,
    ...(FD_SETTINGS.biz || {}),
    logo: posOpt("showLogo") ? lg.receipt : "",
    logoFit: ["contain", "cover", "fill"].includes(lg.fit) ? lg.fit : "contain"
  };
};
/** Cart or order lines → [{ q, n, p, t }]. */
const slipLines = (c, a) =>
  Object.entries(c).map(([id, q]) => ({
    q,
    n: get(id).n,
    p: itemPrice(get(id), a),
    t: get(id).t
  }));
const slipStamp = d =>
  d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
const slipNow = () => slipStamp(bizNow());
const slipPrinted = () =>
  bizNow().toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

/** Crest, hotel name, contact lines, then what this slip is. */
function slipHead(title, sub, B) {
  const name = (B.name || "H").trim();
  return `<div class="sl-head">${B.logo ? `<img class="sl-logo" src="${slipEsc(B.logo)}" alt="" style="object-fit:${B.logoFit || "contain"}">` : `<div class="sl-crest">${slipEsc(name.charAt(0).toUpperCase())}</div>`}<div class="sl-name">${slipEsc(name)}</div>${[
    B.addr,
    B.email,
    B.phone && "Tel " + B.phone,
    B.web,
    B.pin && "PIN " + B.pin
  ]
    .filter(Boolean)
    .map(x => `<div class="sl-co">${slipEsc(x)}</div>`)
    .join(
      ""
    )}<div class="sl-orn"><i></i><span>◆</span><i></i></div><div class="sl-title">${title}</div><div class="sl-sub">${slipEsc(sub)}</div></div>`;
}
/** Two columns of label and value; a pair with `wide` takes the whole row. */
const slipMeta = pairs =>
  `<div class="sl-meta">${pairs
    .map(
      ([l, v, wide]) =>
        `<div class="${wide ? "w" : ""}"><span>${l}</span><b>${slipEsc(v === "" || v === undefined || v === null ? "–" : v)}</b></div>`
    )
    .join("")}</div>`;
const slipMoneyRows = lines =>
  `<table class="sl-t"><tr><th>Qty</th><th>Item</th><th class="n">Price</th><th class="n">Total</th></tr>${lines
    .map(
      x =>
        `<tr><td>${x.q}</td><td>${slipEsc(x.n)}${x.showTax ? ` <small>${slipEsc(x.t)}</small>` : ""}</td><td class="n">${bill2(x.p)}</td><td class="n">${bill2(x.p * x.q)}</td></tr>`
    )
    .join("")}</table>`;
const slipRow = (l, v) => `<div class="sl-r"><span>${l}</span><span>${v}</span></div>`;
const slipTotals = (t, showTax = true) =>
  `<div class="sl-tots">${t.disc ? slipRow("Subtotal", bill2(t.sub)) + slipRow("Discount", "-" + bill2(t.disc)) : ""}${showTax ? slipRow("Net", bill2(t.net)) + slipRow(taxName(), bill2(t.tax)) : ""}<div class="sl-total"><span>Total</span><span>KES ${bill2(t.g)}</span></div>${t.cur ? `<div class="sl-fx">${slipEsc(t.cur.c)} ${bill2(t.g / t.cur.rate)} <small>at ${t.cur.rate}</small></div>` : ""}${t.pl ? `<div class="sl-small">Price list: ${slipEsc(t.pl.n)}</div>` : ""}</div>`;
const slipSign = () =>
  `<div class="sl-sign"><div><span>Guest name</span><i></i></div><div><span>Signature</span><i></i></div></div>`;
const slipTill = B =>
  B.till ? `<div class="sl-till"><span>Till number</span><b>${slipEsc(B.till)}</b></div>` : "";
const slipFoot = () => `<div class="sl-foot">${slipPrinted()}</div>`;
/** How to pay, at the foot of a guest bill: this sale point's methods and those set for all of them. */
function slipPayHTML(point) {
  const L = (FD_SETTINGS.billPay || []).filter(x => x.pt === "*" || x.pt === point);
  return L.length
    ? `<div class="sl-pay"><h5>Pay by</h5>${L.map(x => `<div class="sl-pm"><span>${slipEsc(x.m)}</span><b>${slipEsc(x.v)}</b>${x.a ? `<small>${slipEsc(x.a)}</small>` : ""}</div>`).join("")}</div>`
    : "";
}

/** d: { no, dept, label, guest, covers, room, waiter, rider, lines, t } */
function guestBillHTML(d, B = slipBiz()) {
  const footer = (USERS.find(u => u.n === d.waiter) || {}).footer;
  return `<div class="slip" data-pt="${slipEsc(d.pt || "")}">${slipHead("Guest Bill", d.dept, B)}${d.reprint ? `<div class="sl-stamp">Reprinted</div><div class="sl-copy">Copy ${d.reprint}</div>` : ""}${slipMeta(
    [
      ["Bill no", d.no],
      ...(posOpt("ordNoBill") ? [["Order no", d.ord]] : []),
      ["Covers", d.covers],
      ["Waiter", d.waiter],
      ["Table", d.label],
      ["Guest", d.guest || "N/A"],
      ["Room", d.room],
      ["Date / time", slipNow(), 1],
      ...(d.rider ? [["Rider", `${d.rider.n} ${d.rider.p}`, 1]] : [])
    ]
  )}${slipMoneyRows(d.lines)}${slipTotals(d.t, posOpt("taxBill"))}${posOpt("signBill") ? slipSign() : ""}${slipPayHTML(d.pt || String(d.dept || "").split(", ")[0]) || slipTill(B)}${footer && posOpt("waiterFoot") ? `<div class="sl-note">${slipEsc(footer)}</div>` : ""}<div class="sl-small">This is not a tax invoice. A tax invoice is issued on payment.</div>${slipFoot()}</div>`;
}
/** d as above, plus paid (payment rows), change, fiscal (CU lines and QR), credit (needs a signature). */
function receiptHTML(d, B = slipBiz()) {
  return `<div class="slip" data-pt="${slipEsc(d.pt || "")}">${slipHead("Receipt", d.dept, B)}${d.reprint ? `<div class="sl-stamp">Reprinted</div><div class="sl-copy">Copy ${d.reprint}</div>` : ""}${slipMeta(
    [
      ["Bill no", d.no],
      ["Order no", d.ord],
      ["Covers", d.covers],
      ["Served by", d.waiter],
      ["Table", d.label],
      ["Guest", d.guest || "N/A"],
      ["Room", d.room],
      ...(d.cust ? [["Customer", d.cust, 1]] : []),
      ...(d.custPin ? [["Customer PIN", d.custPin, 1]] : []),
      ["Date / time", d.at || slipNow(), 1]
    ]
  )}${slipMoneyRows(d.lines.map(x => ({ ...x, showTax: posOpt("taxRcpt") })))}${slipTotals(d.t, posOpt("taxRcpt"))}<div class="sl-paid"><h5>Paid by</h5>${d.paid || ""}${d.change > 0 ? slipRow("Change", bill2(d.change)) : ""}</div>${d.credit || posOpt("signRcpt") ? slipSign() : ""}<div class="sl-fiscal">${d.fiscal || ""}</div>${slipTill(B)}<div class="sl-thanks">${slipEsc(B.thanks || "Thank you for dining with us.")}</div>${slipFoot()}</div>`;
}
/** Where an item is prepared: a bar's whole order is the bar's; elsewhere drinks go to the bar. */
const orderStation = it =>
  (OUTLET_INFO[it.d] || {}).type === "Bar" ||
  /drink|beverage|beer|wine|spirit|whisk|gin\b|vodka|rum\b|cocktail|soda|juice|liquor|\bbar\b/i.test(
    it.c
  )
    ? "Bar"
    : "Kitchen";
/** The order slip has no hotel header: only who it is for and what to make. */
function orderSlipHTML(station, d) {
  return `<div class="slip sl-order">${d.swaps && d.swaps.length ? `<div class="sl-stamp">Swap</div>` : ""}<div class="sl-ot">${station} Order</div>${d.round > 1 ? `<div class="sl-round">Round ${d.round}</div>` : ""}${slipMeta(
    [
      ["Bill no", d.no],
      ["Order no", d.ord],
      ["Covers", d.covers],
      ["Waiter", d.waiter],
      ["Table", d.label],
      ["Guest", d.guest || "N/A"],
      ["Room", d.room],
      ["Date / time", slipNow(), 1],
      ...(d.rider ? [["Rider", `${d.rider.n} ${d.rider.p} ${d.rider.a}`, 1]] : [])
    ]
  )}<div class="sl-make">${d.lines
    .map(
      x =>
        `<div><b>${x.q}</b><span>${slipEsc(x.n)}${x.p === undefined ? "" : `<small class="sl-oprice">${bill2(x.p * x.q)}</small>`}</span></div>`
    )
    .join(
      ""
    )}</div>${d.swaps && d.swaps.length ? `<div class="sl-note">${d.swaps.map(s => `Swapped: ${slipEsc(swapText(s))}<br>Authorized by ${slipEsc(s.by)}`).join("<br>")}</div>` : ""}${d.note ? `<div class="sl-note">Note: ${slipEsc(d.note)}</div>` : ""}</div>`;
}
/** Tells the station that got the order to stop: the same layout, so it can't be mistaken for anything else. */
function voidSlipHTML(station, d) {
  return `<div class="slip sl-order sl-void"><div class="sl-ot">Void Alert</div><div class="sl-round">${station} · do not prepare</div>${slipMeta(
    [
      ["Bill no", d.no],
      ["Order no", d.ord],
      ["Table", d.label],
      ["Waiter", d.waiter],
      ["Voided by", d.by],
      ["Guest", d.guest || "N/A"],
      ["Room", d.room],
      ["Date / time", slipNow(), 1]
    ]
  )}<div class="sl-make">${d.lines
    .map(x => `<div><b>${x.q}</b><span>${slipEsc(x.n)}</span></div>`)
    .join(
      ""
    )}</div><div class="sl-note">Reason: ${slipEsc(d.why)}</div>${d.whole ? '<div class="sl-round">Whole bill cancelled</div>' : ""}</div>`;
}
/** One ticket per station and printer: { station, printer, d, html }. Each item follows its own sale point. */
function orderTickets(round, d, slip = orderSlipHTML) {
  const T = new Map();
  Object.entries(round).forEach(([id, q]) => {
    const it = get(id),
      station = orderStation(it),
      printer = stationPrinter(it.d, station),
      key = station + "|" + (printer ? printer.n : "");
    if (!T.has(key)) T.set(key, { station, printer, point: it.d, lines: [] });
    T.get(key).lines.push({
      q,
      n: it.n,
      ...(d.adj && posOpt("pricesOnOrders") ? { p: itemPrice(it, d.adj) } : {})
    });
  });
  return [...T.values()]
    .sort((a, b) => (a.station < b.station ? 1 : -1))
    .map(x => {
      const full = {
        ...d,
        lines: x.lines,
        swaps: (d.swaps || []).filter(s => x.lines.some(l => l.n === s.to))
      };
      return {
        station: x.station,
        printer: x.printer,
        point: x.point,
        d: full,
        html: slip(x.station, full)
      };
    });
}
function exchangeSlipHTML(d) {
  return `<div class="slip sl-order"><div class="sl-stamp">Swap</div><div class="sl-ot">${slipEsc(d.station || "")} Order Change</div>${slipMeta(
    [
      ["Bill no", d.no],
      ["Order no", d.ord],
      ["Table", d.label],
      ["Waiter", d.waiter],
      ["Sale point", d.dept],
      ["Authorized by", d.by],
      ["Date / time", slipNow(), 1]
    ]
  )}<h5 class="sl-h">Remove</h5><div class="sl-make"><div><b>${d.q}</b><span>${slipEsc(d.from)}</span></div></div><h5 class="sl-h">Add</h5><div class="sl-make"><div><b>${d.q}</b><span>${slipEsc(d.to)}</span></div></div><div class="sl-note">Reason: ${slipEsc(d.reason)}. ${d.back ? "Old item returned to stock." : "Old item not returned to stock."}</div></div>`;
}
/** Print only the slip, on a page with no margins. */
function rcPrint() {
  const r = document.documentElement;
  let st = $("#pgStyle");
  if (!st) {
    st = document.createElement("style");
    st.id = "pgStyle";
    document.head.appendChild(st);
  }
  const a4 = !!$("#rc .sl-a4");
  st.textContent = a4 ? "@page{size:A4;margin:12mm}" : "@page{margin:0}";
  r.classList.add("prc");
  r.classList.toggle("a4", a4);
  addEventListener(
    "afterprint",
    () => {
      r.classList.remove("prc", "a4");
      st.textContent = "";
    },
    { once: true }
  );
  window.print();
}
$("#rcPrint").onclick = async () => {
  if (!rcAsk) return rcPrint();
  rcAsk = false;
  $("#rcPrint").textContent = "Print";
  $("#rcPrint").className = "mini";
  $("#rcClose").textContent = "New sale";
  $("#rcClose").className = "chip on";
  const q = $("#rc .rc-ask");
  if (q) q.remove();
  const r = await printSlips("RECEIPT");
  if (r === "none")
    rcPrint(); // no receipt printer set up: the print dialog
  else if (r === "ok") $("#rcClose").click();
};

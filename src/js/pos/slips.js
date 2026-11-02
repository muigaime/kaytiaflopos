// ---- printed slips: guest bill, receipt after clearing a bill, kitchen / bar order ----
// 80mm paper. Thermal printers only print black, so the look comes from type and rules, never from colour.
// Hotel details come from Back Office → Settings (FD_SETTINGS.name and FD_SETTINGS.biz).
const slipEsc = s =>
  String(s === undefined || s === null ? "" : s).replace(
    /[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
const slipBiz = () => ({ name: FD_SETTINGS.name, ...(FD_SETTINGS.biz || {}) });
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
const slipNow = () => slipStamp(new Date());
const slipPrinted = () =>
  new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

/** Crest, hotel name, contact lines, then what this slip is. */
function slipHead(title, sub, B) {
  const name = (B.name || "H").trim();
  return `<div class="sl-head"><div class="sl-crest">${slipEsc(name.charAt(0).toUpperCase())}</div><div class="sl-name">${slipEsc(name)}</div>${[
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
const slipTotals = t =>
  `<div class="sl-tots">${t.disc ? slipRow("Subtotal", bill2(t.sub)) + slipRow("Discount", "-" + bill2(t.disc)) : ""}${slipRow("Net", bill2(t.net))}${slipRow("VAT", bill2(t.tax))}<div class="sl-total"><span>Total</span><span>KES ${bill2(t.g)}</span></div>${t.cur ? `<div class="sl-fx">${slipEsc(t.cur.c)} ${bill2(t.g / t.cur.rate)} <small>at ${t.cur.rate}</small></div>` : ""}${t.pl ? `<div class="sl-small">Price list: ${slipEsc(t.pl.n)}</div>` : ""}</div>`;
const slipSign = () =>
  `<div class="sl-sign"><div><span>Guest name</span><i></i></div><div><span>Signature</span><i></i></div></div>`;
const slipTill = B =>
  B.till ? `<div class="sl-till"><span>Till number</span><b>${slipEsc(B.till)}</b></div>` : "";
const slipFoot = () => `<div class="sl-foot">${slipPrinted()}</div>`;

/** d: { no, dept, label, guest, covers, room, waiter, rider, lines, t } */
function guestBillHTML(d, B = slipBiz()) {
  const footer = (USERS.find(u => u.n === d.waiter) || {}).footer;
  return `<div class="slip">${slipHead("Guest Bill", d.dept, B)}${slipMeta([
    ["Bill no", d.no],
    ["Order no", d.ord],
    ["Covers", d.covers],
    ["Waiter", d.waiter],
    ["Table", d.label],
    ["Guest", d.guest || "N/A"],
    ["Room", d.room],
    ["Date / time", slipNow(), 1],
    ...(d.rider ? [["Rider", `${d.rider.n} ${d.rider.p}`, 1]] : [])
  ])}${slipMoneyRows(d.lines)}${slipTotals(d.t)}${slipSign()}${slipTill(B)}${footer ? `<div class="sl-note">${slipEsc(footer)}</div>` : ""}<div class="sl-small">This is not a tax invoice. A tax invoice is issued on payment.</div>${slipFoot()}</div>`;
}
/** d as above, plus paid (payment rows), change, fiscal (CU lines and QR), credit (needs a signature). */
function receiptHTML(d, B = slipBiz()) {
  return `<div class="slip">${slipHead("Receipt", d.dept, B)}${d.reprint ? `<div class="sl-copy">Reprint · copy ${d.reprint}</div>` : ""}${slipMeta(
    [
      ["Bill no", d.no],
      ["Order no", d.ord],
      ["Covers", d.covers],
      ["Served by", d.waiter],
      ["Table", d.label],
      ["Guest", d.guest || "N/A"],
      ["Room", d.room],
      ["Date / time", d.at || slipNow(), 1]
    ]
  )}${slipMoneyRows(d.lines.map(x => ({ ...x, showTax: 1 })))}${slipTotals(d.t)}<div class="sl-paid"><h5>Paid by</h5>${d.paid || ""}${d.change > 0 ? slipRow("Change", bill2(d.change)) : ""}</div>${d.credit ? slipSign() : ""}<div class="sl-fiscal">${d.fiscal || ""}</div>${slipTill(B)}<div class="sl-thanks">${slipEsc(B.thanks || "Thank you for dining with us.")}</div>${slipFoot()}</div>`;
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
  return `<div class="slip sl-order"><div class="sl-ot">${station} Order</div>${d.round > 1 ? `<div class="sl-round">Round ${d.round}</div>` : ""}${slipMeta(
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
    .map(x => `<div><b>${x.q}</b><span>${slipEsc(x.n)}</span></div>`)
    .join("")}</div>${d.note ? `<div class="sl-note">Note: ${slipEsc(d.note)}</div>` : ""}</div>`;
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
    if (!T.has(key)) T.set(key, { station, printer, lines: [] });
    T.get(key).lines.push({ q, n: it.n });
  });
  return [...T.values()]
    .sort((a, b) => (a.station < b.station ? 1 : -1))
    .map(x => {
      const full = { ...d, lines: x.lines };
      return {
        station: x.station,
        printer: x.printer,
        d: full,
        html: slip(x.station, full)
      };
    });
}
function exchangeSlipHTML(d) {
  return `<div class="slip sl-order"><div class="sl-ot">Exchange</div>${slipMeta([
    ["Bill no", d.no],
    ["Order no", d.ord],
    ["Table", d.label],
    ["Waiter", d.waiter],
    ["Sale point", d.dept],
    ["Date / time", slipNow(), 1]
  ])}<h5 class="sl-h">Remove</h5><div class="sl-make"><div><b>${d.q}</b><span>${slipEsc(d.from)}</span></div></div><h5 class="sl-h">Add</h5><div class="sl-make"><div><b>${d.q}</b><span>${slipEsc(d.to)}</span></div></div><div class="sl-note">Reason: ${slipEsc(d.reason)}. ${d.back ? "Old item returned to stock." : "Old item not returned to stock."}</div></div>`;
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
$("#rcPrint").onclick = rcPrint;

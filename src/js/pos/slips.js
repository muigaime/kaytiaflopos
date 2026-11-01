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
const slipLines = c =>
  Object.entries(c).map(([id, q]) => ({ q, n: get(id).n, p: get(id).p, t: get(id).t }));
const slipNow = () =>
  new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
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
  `<div class="sl-tots">${slipRow("Net", bill2(t.net))}${slipRow("VAT", bill2(t.tax))}<div class="sl-total"><span>Total</span><span>KES ${bill2(t.g)}</span></div></div>`;
const slipSign = () =>
  `<div class="sl-sign"><div><span>Guest name</span><i></i></div><div><span>Signature</span><i></i></div></div>`;
const slipTill = B =>
  B.till ? `<div class="sl-till"><span>Till number</span><b>${slipEsc(B.till)}</b></div>` : "";
const slipFoot = () => `<div class="sl-foot">${slipPrinted()}</div>`;

/** d: { no, dept, label, guest, covers, room, waiter, rider, lines, t } */
function guestBillHTML(d, B = slipBiz()) {
  return `<div class="slip">${slipHead("Guest Bill", d.dept, B)}${slipMeta([
    ["Bill no", d.no],
    ["Covers", d.covers],
    ["Waiter", d.waiter],
    ["Table", d.label],
    ["Guest", d.guest || "N/A"],
    ["Room", d.room],
    ["Date / time", slipNow(), 1],
    ...(d.rider ? [["Rider", `${d.rider.n} ${d.rider.p}`, 1]] : [])
  ])}${slipMoneyRows(d.lines)}${slipTotals(d.t)}${slipSign()}${slipTill(B)}<div class="sl-small">This is not a tax invoice. A tax invoice is issued on payment.</div>${slipFoot()}</div>`;
}
/** d as above, plus paid (payment rows), change, fiscal (CU lines and QR), credit (needs a signature). */
function receiptHTML(d, B = slipBiz()) {
  return `<div class="slip">${slipHead("Receipt", d.dept, B)}${slipMeta([
    ["Invoice", d.no],
    ["Covers", d.covers],
    ["Served by", d.waiter],
    ["Table", d.label],
    ["Guest", d.guest || "N/A"],
    ["Room", d.room],
    ["Date / time", slipNow(), 1]
  ])}${slipMoneyRows(d.lines.map(x => ({ ...x, showTax: 1 })))}${slipTotals(d.t)}<div class="sl-paid"><h5>Paid by</h5>${d.paid || ""}${d.change > 0 ? slipRow("Change", bill2(d.change)) : ""}</div>${d.credit ? slipSign() : ""}<div class="sl-fiscal">${d.fiscal || ""}</div>${slipTill(B)}<div class="sl-thanks">${slipEsc(B.thanks || "Thank you for dining with us.")}</div>${slipFoot()}</div>`;
}
/** Where an item is prepared: a bar's whole order is the bar's; elsewhere drinks go to the bar. */
const orderStation = (it, dept) =>
  (OUTLET_INFO[dept] || {}).type === "Bar" ||
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
/** One slip per station, so a table's food and drinks print separately. */
function orderSlips(round, d) {
  const by = { Kitchen: [], Bar: [] };
  Object.entries(round).forEach(([id, q]) => {
    const it = get(id);
    by[orderStation(it, d.dept)].push({ q, n: it.n });
  });
  return ["Kitchen", "Bar"]
    .filter(s => by[s].length)
    .map(s => orderSlipHTML(s, { ...d, lines: by[s] }))
    .join("");
}
function exchangeSlipHTML(d) {
  return `<div class="slip sl-order"><div class="sl-ot">Exchange</div>${slipMeta([
    ["Bill no", d.no],
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
  st.textContent = "@page{margin:0}";
  r.classList.add("prc");
  addEventListener(
    "afterprint",
    () => {
      r.classList.remove("prc");
      st.textContent = "";
    },
    { once: true }
  );
  window.print();
}
$("#rcPrint").onclick = rcPrint;

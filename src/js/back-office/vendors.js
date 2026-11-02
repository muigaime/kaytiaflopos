// ---- Vendors (People → Vendors): vendor list, vendor statements and payments made to vendors ----
// A statement shows what the business owes a vendor: goods received (GRNs) are credits, payments are
// debits, balance = opening + credits − debits. Vendor setup itself lives in receive.js (shared with
// the quick-add popup on purchase orders and the GRN).
let vnT = "list";
const VN_TABS = [
  ["list", "Vendor list", "users"],
  ["stmt", "Statement", "book"],
  ["pay", "Payments made", "wal"]
];
const VPAY_METHODS = ["Bank transfer", "M-Pesa", "Cash", "Cheque"];
const vsBlank = () => {
  const t = todayYmd();
  return {
    vendor: "", // vendor id
    from: t.slice(0, 8) + "01",
    to: t,
    pDate: t,
    pAmt: "",
    pMethod: VPAY_METHODS[0],
    pRef: "",
    pNote: ""
  };
};
invF.vs = vsBlank();
// Letterhead on statements (business name comes from the front desk settings).
invF.vh = { addr: "", phone: "", email: "", web: "", pin: "", till: "", thanks: "" };

const slashDate = ymd => ymd.split("-").reverse().join("/"),
  daysApart = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5),
  termDays = v => parseInt(v.terms, 10) || 0, // "30 days" → 30, "Cash" → 0
  vsVendor = () => VENDORS.find(v => v.id === invF.vs.vendor) || VENDORS[0];

/** Value of a GRN including VAT (older receipts without totals: quantity × cost). */
const grnAmount = g =>
  g.gross > 0
    ? g.gross
    : g.lines.reduce((a, l) => a + (l.gross !== undefined ? l.gross : l.q * l.c), 0);

/** Every transaction with a vendor, oldest first: { t, day, ref, kind, narr, sub, dr, cr }. */
function vendorLedger(v) {
  const T = [],
    day = at => toYmd(new Date(at));
  if (+v.ob > 0 && v.obAt)
    T.push({
      t: new Date(v.obAt + "T00:00:00").getTime(),
      day: v.obAt,
      ref: "OPENING",
      kind: "Opening",
      narr: "Opening balance carried into the system",
      sub: "",
      dr: 0,
      cr: +v.ob
    });
  GRNS.filter(g => g.sup === v.name).forEach(g => {
    const amt = grnAmount(g);
    T.push({
      t: new Date(g.at).getTime(),
      day: day(g.at),
      ref: g.id,
      kind: "GRN",
      narr: `GRN No. ${g.id} · Invoice/D-Note: INV# ${g.inv || g.ref || "–"} · DN# ${g.dnote || "–"} · Amount ${m2(amt)}/= · Tax ${m2(g.tax || 0)}/=`,
      sub: `Into ${g.store}${g.lpo ? " · against " + g.lpo : ""} · received by ${g.by}`,
      dr: 0,
      cr: amt
    });
  });
  VPAYS.filter(p => p.vendor === v.name).forEach(p =>
    T.push({
      t: new Date(p.at).getTime(),
      day: p.date,
      ref: p.id,
      kind: "Payment",
      narr: `Payment by ${p.method}${p.ref ? " · Ref " + p.ref : ""} · Amount ${m2(p.amt)}/=`,
      sub: `${p.note ? p.note + " · " : ""}recorded by ${p.by}`,
      dr: p.amt,
      cr: 0
    })
  );
  return T.sort((a, b) => a.t - b.t);
}
/** What is owed to the vendor today. */
const vendorBalance = v => vendorLedger(v).reduce((a, x) => a + x.cr - x.dr, 0);

/** Statement for a period, with the closing balance aged (payments settle the oldest receipts first). */
function vendorStatement(v, from, to) {
  const L = vendorLedger(v),
    opening = L.filter(x => x.day < from).reduce((a, x) => a + x.cr - x.dr, 0),
    rows = L.filter(x => x.day >= from && x.day <= to);
  let bal = opening;
  rows.forEach(x => (x.bal = bal += x.cr - x.dr));
  const dr = sum(rows, x => x.dr),
    cr = sum(rows, x => x.cr),
    upTo = L.filter(x => x.day <= to),
    age = [0, 0, 0, 0],
    terms = termDays(v);
  let paid = sum(upTo, x => x.dr),
    overdue = 0;
  upTo
    .filter(x => x.cr > 0)
    .forEach(x => {
      const left = x.cr - Math.min(paid, x.cr);
      paid = Math.max(0, paid - x.cr);
      if (left < 0.005) return;
      const d = daysApart(x.day, to);
      age[d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3] += left;
      if (d > terms) overdue += left;
    });
  return { opening, rows, dr, cr, closing: opening + cr - dr, age, overdue };
}

const vsNo = (v, to) => `VS-${v.id.replace(/^VEN-/, "")}-${to.replace(/-/g, "")}`;

/** The statement itself, on paper: the same HTML is shown on screen and printed. */
function vsDocHTML(v, from, to) {
  const S = vendorStatement(v, from, to),
    B = FD_SETTINGS.biz || {},
    co = [
      FD_SETTINGS.name,
      B.addr,
      B.phone && "Tel " + B.phone,
      B.email,
      B.web,
      B.pin && "KRA PIN " + B.pin
    ].filter(Boolean),
    [stamp, cls] =
      S.closing < 0.005 && S.closing > -0.005
        ? ["SETTLED", "ok"]
        : S.closing < 0
          ? ["IN CREDIT", "ok"]
          : S.overdue > 0
            ? ["OVERDUE", "bad"]
            : ["OPEN", ""],
    row = (x, i) =>
      `<tr class="${x.kind === "Payment" ? "vs-pay" : ""}"><td>${i + 1}</td><td>${slashDate(x.day)}</td><td>${esc(x.ref)}</td><td>${esc(x.narr)}<small>${esc(x.sub)}</small></td><td class="n">${x.dr ? m2(x.dr) : ".00"}</td><td class="n">${x.cr ? m2(x.cr) : ".00"}</td><td class="n">${m2(x.bal)}</td></tr>`;
  return `<div class="vs-doc">
 <div class="vs-stamp ${cls}">${stamp}</div>
 <div class="vs-top">
  <table class="vs-box vs-co">${co.map(c => `<tr><td>${esc(c)}</td></tr>`).join("")}<tr class="vs-title"><td>VENDOR STATEMENT</td></tr></table>
  <table class="vs-box vs-meta">
   <tr><td>Statement no</td><td>${vsNo(v, to)}</td></tr>
   <tr><td>Vendor name</td><td>${esc(v.name)}</td></tr>
   ${v.pin ? `<tr><td>Vendor KRA PIN</td><td>${esc(v.pin)}</td></tr>` : ""}
   <tr><td>Payment terms</td><td>${esc(v.terms || "Cash")}</td></tr>
   <tr><td>From date</td><td>${slashDate(from)}</td></tr>
   <tr><td>To date</td><td>${slashDate(to)}</td></tr>
   <tr><td>Opening balance</td><td>${m2(S.opening)}</td></tr>
   <tr><td>Closing balance</td><td>${m2(S.closing)}</td></tr>
  </table>
 </div>
 <table class="vs-l">
  <tr><th>ID</th><th>Date</th><th>Ref number</th><th>Transaction narration</th><th class="n">Debit</th><th class="n">Credit</th><th class="n">Balance</th></tr>
  <tr class="vs-bf"><td></td><td>${slashDate(from)}</td><td></td><td>Balance brought forward</td><td class="n"></td><td class="n"></td><td class="n">${m2(S.opening)}</td></tr>
  ${S.rows.length ? S.rows.map(row).join("") : '<tr><td colspan="7" class="vs-none">No receipts or payments in this period.</td></tr>'}
  <tr class="vs-tot"><td colspan="4">Totals for the period · ${S.rows.length} transaction(s)</td><td class="n">${m2(S.dr)}</td><td class="n">${m2(S.cr)}</td><td class="n">${m2(S.closing)}</td></tr>
 </table>
 <div class="vs-age">${[
   ["Current (0–30 days)", S.age[0]],
   ["31–60 days", S.age[1]],
   ["61–90 days", S.age[2]],
   ["Over 90 days", S.age[3]],
   [`Past terms (${esc(v.terms || "Cash")})`, S.overdue, "od"]
 ]
   .map(([l, n, c]) => `<div class="${c && n > 0 ? c : ""}"><span>${l}</span><b>${m2(n)}</b></div>`)
   .join("")}</div>
 <div class="vs-sig"><div>Prepared by: ${esc(boUser ? boUser.n : "")}</div><div>Checked by</div><div>Vendor confirmation &amp; stamp</div></div>
 <div class="vs-foot"><span>Debit = payments made to the vendor · Credit = goods received on account. A positive balance is owed to the vendor.</span><span>Printed ${slashDate(todayYmd())} ${hm(new Date())}</span></div>
</div>`;
}

// Kept in JS (not a .css file) because the print window needs the same rules.
const VS_CSS = `.vs-doc{position:relative;background:#fff;color:#111;border-radius:6px;padding:28px 32px;font:13px/1.45 Arial,Helvetica,sans-serif;overflow-x:auto}
.vs-doc .vs-top{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:28px;align-items:start}
.vs-doc .vs-box{width:100%;border-collapse:collapse}
.vs-doc .vs-box td{border:1px solid #222;padding:4px 8px;font-weight:700;font-size:12px}
.vs-doc .vs-co td{text-align:center;text-transform:uppercase}
.vs-doc .vs-co tr:first-child td{font-size:15px;letter-spacing:.04em}
.vs-doc .vs-title td{text-align:left;background:#111;color:#fff;letter-spacing:.14em}
.vs-doc .vs-meta{margin-top:34px}
.vs-doc .vs-meta td:first-child{width:42%;background:#f3f5f7;white-space:nowrap}
.vs-doc .vs-l{width:100%;border-collapse:collapse;margin-top:24px}
.vs-doc .vs-l th{color:#7a0f0f;text-align:left;font-size:12px;border-bottom:2px solid #111;padding:6px}
.vs-doc .vs-l td{padding:7px 6px;border-bottom:1px dotted #888;vertical-align:top}
.vs-doc .vs-l small{display:block;color:#666;font-size:11px;margin-top:2px}
.vs-doc .n{text-align:right;white-space:nowrap}
.vs-doc .vs-bf td{font-style:italic;background:#f7f7f7}
.vs-doc .vs-pay td{background:#f0faf6}
.vs-doc .vs-none{text-align:center;color:#666;padding:18px}
.vs-doc .vs-tot td{border-top:2px solid #111;border-bottom:3px double #111;font-weight:700}
.vs-doc .vs-age{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));margin-top:20px;border:1px solid #222}
.vs-doc .vs-age div{padding:6px 10px;border-right:1px solid #222;display:grid;gap:2px}
.vs-doc .vs-age div:last-child{border-right:0}
.vs-doc .vs-age span{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#555}
.vs-doc .vs-age b{font-size:14px}
.vs-doc .vs-age .od{background:#fff1f0;color:#a40000}
.vs-doc .vs-sig{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin-top:48px}
.vs-doc .vs-sig div{border-top:1px solid #111;padding-top:4px;font-size:12px}
.vs-doc .vs-foot{margin-top:18px;font-size:11px;color:#555;display:flex;justify-content:space-between;gap:16px}
.vs-doc .vs-stamp{position:absolute;right:36px;top:20px;transform:rotate(-8deg);border:3px solid #555;color:#555;border-radius:8px;padding:2px 12px;font-weight:800;letter-spacing:.18em;font-size:13px;opacity:.75}
.vs-doc .vs-stamp.ok{border-color:#16805e;color:#16805e}
.vs-doc .vs-stamp.bad{border-color:#b3261e;color:#b3261e}`;

function vsPrint(v, from, to) {
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print the statement.");
  w.document.write(
    `<!DOCTYPE html><html><head><title>${vsNo(v, to)}</title><style>body{margin:24px}${VS_CSS}.vs-doc{padding:0}@page{size:A4;margin:12mm}</style></head><body>${vsDocHTML(v, from, to)}<\/body><\/html>` // "<\/" so tools scanning the page for </body> don't stop here
  );
  w.document.close();
  w.focus();
  w.print();
}

// ---------------------------------------------------------------- page
function vendorsView() {
  if (!boTabOk("vn", vnT)) vnT = "list";
  invF.vn.open = false; // the vendor form is on the page itself
  if (!VENDORS.some(v => v.id === invF.vs.vendor)) invF.vs.vendor = VENDORS[0] ? VENDORS[0].id : "";
  const body =
    vnT === "list"
      ? `<div class="pn"><h4>Vendors</h4>${vendorFormHTML()}</div>`
      : !VENDORS.length
        ? `<div class="pn"><div class="empty">Add a vendor first.</div><button class="chip on" data-a="vs_tab" data-t="list">Go to the vendor list</button></div>`
        : vnT === "stmt"
          ? vsStatementHTML()
          : vsPaymentsHTML();
  return `<div class="inv"><nav class="inv-rail">${VN_TABS.filter(([t]) => boTabOk("vn", t))
    .map(
      ([t, l, ic]) =>
        `<button class="ir ${t === vnT ? "on" : ""}" data-a="vs_tab" data-t="${t}">${I(ic)}<span>${l}</span></button>`
    )
    .join("")}</nav><div class="inv-main">${body}</div></div>`;
}

const vsVendorSelect = () =>
  `<label>Vendor<select data-iv="vs.vendor">${VENDORS.map(v => `<option value="${v.id}" ${v.id === invF.vs.vendor ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>`;

function vsStatementHTML() {
  const F = invF.vs,
    v = vsVendor(),
    bad = F.from > F.to,
    S = bad ? null : vendorStatement(v, F.from, F.to),
    H = invF.vh,
    kst = (l, n) => `<div class="kst"><span>${l}</span><b>${n}</b></div>`;
  return `<div class="pn"><h4>Vendor statement</h4>
  <div class="fr">${vsVendorSelect()}
   <label>From<input type="date" data-iv="vs.from" value="${esc(F.from)}"></label>
   <label>To<input type="date" data-iv="vs.to" value="${esc(F.to)}"></label></div>
  <div class="vs-bar">${[
    ["month", "This month"],
    ["last", "Last month"],
    ["year", "This year"],
    ["all", "All time"]
  ]
    .map(([r, l]) => `<button class="mini" data-a="vs_rng" data-rng="${r}">${l}</button>`)
    .join("")}<i></i>
   <button class="mini" data-a="vs_paynow">${I("wal")}Record payment</button>
   <button class="chip on" data-a="vs_print" ${bad ? "disabled" : ""}>${I("book")}Print statement</button></div>
  <details class="vs-lh"><summary>Letterhead on statements</summary>
   <div class="fr"><label>Postal address<input data-iv="vh.addr" value="${esc(H.addr)}" placeholder="e.g. P.O. Box 123-80100, Mombasa"></label><label>Phone<input data-iv="vh.phone" value="${esc(H.phone)}"></label><label>Email<input data-iv="vh.email" value="${esc(H.email)}"></label></div>
   <div class="fr"><label>Website<input data-iv="vh.web" value="${esc(H.web)}"></label><label>Business KRA PIN<input data-iv="vh.pin" value="${esc(H.pin)}"></label><button class="chip on" data-a="vs_hsave">Save letterhead</button></div>
  </details></div>
 ${
   bad
     ? '<div class="pn"><div class="empty">The From date is after the To date.</div></div>'
     : `<div class="kstg">${kst("Opening balance", m2(S.opening))}${kst("Goods received", m2(S.cr))}${kst("Payments made", m2(S.dr))}${kst("Closing balance", m2(S.closing))}${kst("Past terms", m2(S.overdue))}</div>
 <style>${VS_CSS}</style>${vsDocHTML(v, F.from, F.to)}`
 }`;
}

function vsPaymentsHTML() {
  const F = invF.vs,
    v = vsVendor(),
    bal = vendorBalance(v),
    S = vendorStatement(v, "0000-01-01", todayYmd()),
    list = VPAYS.filter(p => p.vendor === v.name)
      .slice()
      .reverse();
  return `<div class="pn"><h4>Record a payment to a vendor</h4>
  <div class="fr">${vsVendorSelect()}
   <label>Date paid<input type="date" data-iv="vs.pDate" value="${esc(F.pDate)}" max="${todayYmd()}"></label>
   <label>Amount (KES)<input id="vsAmt" data-iv="vs.pAmt" type="number" min="0" step="any" value="${esc(F.pAmt)}"></label></div>
  <div class="fr"><label>Paid by<select data-iv="vs.pMethod">${opts(VPAY_METHODS, F.pMethod)}</select></label>
   <label>Reference<input data-iv="vs.pRef" value="${esc(F.pRef)}" placeholder="Bank / M-Pesa / cheque no"></label>
   <label>Note<input data-iv="vs.pNote" value="${esc(F.pNote)}" placeholder="Optional, e.g. invoices paid"></label></div>
  <div class="fr" style="align-items:center"><span class="stk">${esc(v.name)} is owed <b>KES ${m2(bal)}</b>${S.overdue > 0 ? ` · KES ${m2(S.overdue)} is past its ${esc(v.terms)} terms` : ""}</span><span style="flex:1"></span>
   <button class="mini" data-a="vs_payall" ${bal > 0 ? "" : "disabled"}>Pay full balance</button>
   <button class="chip on" data-a="vs_pay">Record payment</button></div></div>
 <div class="pn"><h4>Payments to ${esc(v.name)}</h4><div class="tw"><table class="t"><tr><th>Date</th><th>Payment no</th><th>Paid by</th><th>Reference</th><th>Note</th><th class="n">Amount (KES)</th><th>Recorded by</th></tr>${
   list.length
     ? list
         .map(
           p =>
             `<tr><td>${slashDate(p.date)}</td><td>${esc(p.id)}</td><td>${esc(p.method)}</td><td>${esc(p.ref || "")}</td><td>${esc(p.note || "")}</td><td class="n">${m2(p.amt)}</td><td>${esc(p.by)}</td></tr>`
         )
         .join("")
     : '<tr><td colspan="7" class="stk">No payments recorded for this vendor yet.</td></tr>'
 }</table></div></div>`;
}

// ---------------------------------------------------------------- actions
/** Re-draw only for fields that change what is shown (typing in the payment form keeps focus). */
function vsSync(f) {
  if (f === "vendor" || f === "from" || f === "to") all();
}

function vsPay(b) {
  const F = invF.vs,
    v = vsVendor(),
    amt = Math.round(parseFloat(F.pAmt) * 100) / 100,
    ref = F.pRef.trim(),
    bal = vendorBalance(v);
  if (!(amt > 0)) return toast("Enter the amount paid.");
  if (!F.pDate || F.pDate > todayYmd()) return toast("The payment date cannot be in the future.");
  if (
    ref &&
    VPAYS.some(
      p => p.vendor === v.name && p.method === F.pMethod && itemNorm(p.ref) === itemNorm(ref)
    )
  )
    return toast(`${F.pMethod} reference ${ref} is already recorded for ${v.name}.`);
  const save = () => {
    const now = new Date();
    VPAYS.push({
      id: nid("VPY"),
      at:
        F.pDate === todayYmd() ? now.toISOString() : new Date(F.pDate + "T12:00:00").toISOString(),
      date: F.pDate,
      vendor: v.name,
      amt,
      method: F.pMethod,
      ref,
      note: F.pNote.trim(),
      by: boUser.n
    });
    Object.assign(F, { pAmt: "", pRef: "", pNote: "" });
    bosave();
    toast(`Payment of KES ${m2(amt)} to ${v.name} recorded.`);
    all();
  };
  // Paying more than is owed leaves the vendor in credit: ask once more.
  if (amt > bal + 0.005) return tapConfirm(b, save, `More than owed (KES ${m2(bal)}). Tap again`);
  save();
}

function vsAct(a, b) {
  const F = invF.vs,
    d = b.dataset;
  if (a === "tab") {
    vnT = d.t;
    return all();
  }
  if (a === "open") {
    // "Statement" on a row of the vendor list (also from the vendor popup in Purchasing)
    F.vendor = d.id;
    vnT = "stmt";
    return go("Vendors");
  }
  if (a === "rng") {
    const t = todayYmd(),
      [y, m] = t.split("-");
    if (d.rng === "month") [F.from, F.to] = [`${y}-${m}-01`, t];
    if (d.rng === "year") [F.from, F.to] = [`${y}-01-01`, t];
    if (d.rng === "last") {
      const first = new Date(+y, +m - 2, 1),
        last = new Date(+y, +m - 1, 0);
      [F.from, F.to] = [toYmd(first), toYmd(last)];
    }
    if (d.rng === "all") {
      const L = vendorLedger(vsVendor());
      [F.from, F.to] = [L.length ? L[0].day : t, t];
    }
    return all();
  }
  if (a === "print") return vsPrint(vsVendor(), F.from, F.to);
  if (a === "paynow") {
    vnT = "pay";
    all();
    const n = $("#vsAmt");
    return n && n.focus();
  }
  if (a === "payall") {
    F.pAmt = String(Math.round(vendorBalance(vsVendor()) * 100) / 100);
    return all();
  }
  if (a === "pay") return vsPay(b);
  if (a === "hsave") {
    FD_SETTINGS.biz = Object.fromEntries(Object.entries(invF.vh).map(([k, x]) => [k, x.trim()]));
    bosave();
    toast("Letterhead saved.");
    return all();
  }
}

Object.assign(invF.vh, FD_SETTINGS.biz || {});
V.vendors = vendorsView;

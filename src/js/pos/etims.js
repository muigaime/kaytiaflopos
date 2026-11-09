// ---- eTIMS at the till: each settled bill goes to the server, which gets it signed by the cloud ----
const etimsCall = body =>
  fetch("/lan/etims/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
/** The fiscal lines on a receipt. keep is the bill's saved slip. */
function etimsFiscal(no, keep) {
  const e = keep && keep.etims,
    body = e
      ? `${e.test ? "TEST: NOT A KRA TAX INVOICE<br>" : ""}CU serial: ${slipEsc(e.cu)}<br>CU invoice no: ${slipEsc(e.inv)}${qr(e.qr || no + e.cu)}${e.test ? "" : "Scan to verify on KRA eTIMS"}`
      : keep && keep.eq
        ? "eTIMS: waiting for signature.<br>Reprint this receipt for the KRA details."
        : "eTIMS: not signed.";
  return `<span data-etims="${slipEsc(no)}">${body}</span>`;
}
/** What the cloud needs to know about a bill. A bill can span several sale points, so it's put together here. */
function etimsInvoice(no) {
  const S = SALES.filter(s => s.no === no),
    A = S[0],
    paid = {},
    add = k => S.reduce((a, s) => a + (s[k] || 0), 0);
  S.forEach(s => Object.entries(s.mx || {}).forEach(([m, v]) => (paid[m] = (paid[m] || 0) + v)));
  return {
    bill: String(no),
    at: new Date(A.at).toISOString(),
    dept: S.map(s => s.dept).join(", "),
    buyer: { name: A.cust || "", pin: A.custPin || "" },
    items: S.flatMap(s =>
      s.lines.map(l => {
        const it = get(l.id) || {};
        return {
          name: l.n,
          qty: l.q,
          price: l.p,
          taxCode: l.t,
          total: l.p * l.q,
          itemCode: it.etCode || "",
          etimsId: it.etId || ""
        };
      })
    ),
    totals: { net: add("net"), tax: add("tax"), gross: add("g") },
    payments: Object.entries(paid).map(([method, amount]) => ({ method, amount }))
  };
}
const etimsSlip = no => (SALES.find(s => s.no === no && s.slip) || {}).slip;
const etimsBusy = new Set();
async function etimsSend(no) {
  const k = etimsSlip(no);
  if (!k || k.etims || etimsBusy.has(no)) return k && k.etims ? "signed" : "";
  etimsBusy.add(no);
  const r = await etimsCall(etimsInvoice(no));
  etimsBusy.delete(no);
  if (!r || r.status !== "signed" || !r.result) return (r && r.err) || "";
  k.etims = r.result;
  try {
    bosave();
  } catch (e) {}
  // The receipt may still be on the screen, waiting to be printed.
  const on = document.querySelector(`#rc [data-etims="${CSS.escape(String(no))}"]`);
  if (on) on.outerHTML = etimsFiscal(no, k);
  return "signed";
}
/** A return, told to eTIMS as a credit note against the bill it came from. */
async function etimsCredit(no) {
  const S = SALES.filter(s => s.no === no && s.ret);
  if (!S.length || S[0].etCn) return "signed";
  const inv = etimsInvoice(no),
    abs = x => Math.abs(x);
  inv.creditFor = S[0].ret.of;
  inv.reason = S[0].ret.why || "";
  inv.items.forEach(x => {
    x.qty = abs(x.qty);
    x.total = abs(x.total);
  });
  inv.totals = { net: abs(inv.totals.net), tax: abs(inv.totals.tax), gross: abs(inv.totals.gross) };
  inv.payments.forEach(x => (x.amount = abs(x.amount)));
  const r = await etimsCall(inv);
  if (!r || r.status !== "signed" || !r.result) return (r && r.err) || "";
  S[0].etCn = r.result;
  try {
    bosave();
  } catch (e) {}
  return "signed";
}
// A bill settled with the network or the cloud away goes when it can.
setInterval(() => {
  SALES.filter(s => s.slip && s.slip.eq && !s.slip.etims)
    .slice(-30)
    .forEach(s => etimsSend(s.no));
}, 60000);

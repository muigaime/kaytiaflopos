// ---- M-Pesa at the till: ask the customer's phone (Daraja), or pick a payment the modem has received ----
// The server keeps one list of payments. If it can't be reached, a cashier can still type the code.
const mpCall = (op, body) =>
  fetch("/lan/mpesa/" + op, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ by: user ? user.n : "", ...(body || {}) })
  })
    .then(async r => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, j: {}, offline: true }));
let mpPaid = {}; // code -> what was actually received
let mpBad = {}; // code -> why it can't be used
const mpOffline = "The server can't be reached. Enter the M-Pesa code instead.";
const mpPhone = s => {
  const d = String(s).replace(/\D/g, "");
  return /^0[17]\d{8}$/.test(d) ? "254" + d.slice(1) : d;
};
function mpReset() {
  mpPaid = {};
  mpBad = {};
}
function mpFill(code, amt) {
  mpPaid[code] = amt;
  delete mpBad[code];
  payRead();
  payVals.mpesa = { ...(payVals.mpesa || {}), n: code, a: String(amt) };
  drawPay();
  payCalc();
}
/** Why this M-Pesa line can't be accepted, or "". */
function mpProblem(code, amt) {
  if (mpBad[code]) return mpBad[code];
  if (mpPaid[code] !== undefined && amt > mpPaid[code] + 0.004)
    return `Only KES ${bill2(mpPaid[code])} was received on ${code}.`;
  return "";
}
async function mpSend(b) {
  payRead();
  const n = $('#pWrap [data-pn="mpesa"]'),
    ph = mpPhone(n.value.trim()),
    amt = payNum((payVals.mpesa || {}).a);
  if (!/^254[17]\d{8}$/.test(ph)) return fsNote("Enter the customer's number, 07XXXXXXXX.");
  if (!(amt > 0)) return fsNote("Enter the M-Pesa amount first.");
  if (amt % 1) return fsNote("M-Pesa requests must be whole shillings.");
  b.disabled = true;
  b.textContent = "Sending…";
  const label = (payT && payT[0] && payT[0].label) || "Bill",
    done = msg => {
      if (msg) fsNote(msg);
      if (!b.isConnected) return;
      b.disabled = false;
      b.textContent = "Send request";
    },
    r = await mpCall("stk", { phone: ph, amount: amt, ref: label });
  if (!r.ok) return done(r.offline ? mpOffline : r.j.error);
  b.textContent = "Waiting for PIN…";
  for (let i = 0; i < 70; i++) {
    await new Promise(ok => setTimeout(ok, 2000));
    if (!$("#mPay").classList.contains("show")) return;
    const s = await mpCall("stk-state", { id: r.j.id });
    if (!s.ok && !s.offline) return done(s.j.error);
    if (s.ok && s.j.state === "paid") {
      done();
      mpFill(s.j.code, amt);
      return fsNote("M-Pesa payment received.");
    }
    if (s.ok && s.j.state === "failed") return done(s.j.msg);
  }
  done("No answer yet. Check M-Pesa messages before trying again.");
}
const mpTime = at =>
  new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
async function mpInbox() {
  payRead();
  $("#mpList").innerHTML = '<div class="empty">Checking…</div>';
  $("#mMp").classList.add("show");
  const r = await mpCall("inbox");
  if (!$("#mMp").classList.contains("show")) return;
  if (!r.ok) {
    $("#mpList").innerHTML =
      `<div class="empty">${slipEsc(r.offline ? mpOffline : r.j.error)}</div>`;
    return;
  }
  const want = payNum((payVals.mpesa || {}).a) || payLeft();
  $("#mpList").innerHTML =
    (r.j.list || [])
      .map(
        x =>
          `<button class="mp-i ${Math.abs(x.amt - want) < 0.01 ? "match" : ""}" data-mpc="${slipEsc(x.code)}"><span><b>KES ${bill2(x.amt)}</b><small>${slipEsc(x.name || x.phone || "M-Pesa")} · ${mpTime(x.at)}</small></span><span class="mp-c">${slipEsc(x.code)}</span></button>`
      )
      .join("") || '<div class="empty">No new M-Pesa payments.</div>';
}
$("#mMp").addEventListener("click", async e => {
  if (e.target.closest("#mpClose")) return $("#mMp").classList.remove("show");
  if (e.target.closest("#mpAgain")) return mpInbox();
  const b = e.target.closest("[data-mpc]");
  if (!b) return;
  const r = await mpCall("hold", { code: b.dataset.mpc });
  if (!r.ok) return fsNote(r.offline ? mpOffline : r.j.error);
  $("#mMp").classList.remove("show");
  mpFill(b.dataset.mpc, r.j.amt);
});
// A typed code is checked as soon as it's entered, in case it has already been used.
$("#mPay").addEventListener("change", async e => {
  if (!e.target.matches('[data-pn="mpesa"]')) return;
  const c = e.target.value.trim().toUpperCase();
  if (!c || /^(254|0)\d{9}$/.test(c)) return;
  delete mpBad[c];
  const r = await mpCall("check", { code: c });
  if (r.ok) {
    if (r.j.known) mpPaid[c] = r.j.amt;
  } else if (!r.offline) {
    mpBad[c] = r.j.error;
    fsNote(r.j.error);
  }
});
/** After the bill is cleared: this payment can't be used again. */
function mpConfirm(pays, billNos) {
  pays
    .filter(p => p.m === "mpesa" && p.ref)
    .forEach(p => {
      mpCall("confirm", { code: p.ref.toUpperCase(), bill: billNos.join(","), amt: p.amt });
    });
  mpReset();
}

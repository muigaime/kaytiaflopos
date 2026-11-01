// payment
let pays = [],
  payT = null;
const SALES = [];
const CU = [
  { n: "Kamau Hardware", limit: 50000, owes: 12400 },
  { n: "Njeri Catering", limit: 30000, owes: 0 }
];
const c2 = n => Math.round(n * 100),
  MN = { cash: "Cash", mpesa: "M-Pesa", credit: "Credit" };
const payDue = () => (payT ? payT.reduce((a, o) => a + totals(o.lines).g, 0) : totals().g);
const payBal = () => (c2(payDue()) - c2(pays.reduce((a, p) => a + p.amt, 0))) / 100;
function openPay(tg) {
  if (!shiftOk()) return;
  payT = tg || null;
  pays = [];
  method = "cash";
  document
    .querySelectorAll("#mPay .tabs .chip")
    .forEach(b => b.classList.toggle("on", b.dataset.m === "cash"));
  $("#pTitle").textContent =
    payT && payT.length > 1 ? "Settle " + payT.length + " bills" : "Payment";
  renderPay();
  $("#mPay").classList.add("show");
}
function renderPay() {
  $("#pTotal").textContent = KES(payDue());
  $("#pBills").textContent = payT ? payT.map(o => o.label).join(" · ") : "Direct sale · " + dept;
  $("#pList").innerHTML = pays
    .map(
      (p, i) =>
        `<div class="r2"><span>${MN[p.m]}${p.ref ? " · " + p.ref : ""}${p.who ? " · " + p.who : ""}</span><b>${KES(p.amt)}</b>${p.m === "mpesa" ? "" : `<button class="mini" data-rm="${i}">×</button>`}</div>`
    )
    .join("");
  const bal = payBal(),
    chv = pays.reduce((a, p) => a + (p.chg || 0), 0);
  $("#pBal").textContent =
    bal > 0.004
      ? "Balance due: " + KES(bal)
      : "Fully paid" + (chv > 0 ? " · Change: " + KES(chv) : "");
  $("#pBal").className = "status " + (bal > 0.004 ? "bad" : "ok");
  $("#pOk").disabled = !(bal <= 0.004 && (pays.length || payDue() === 0));
  payBody();
}
function payBody() {
  const bal = Math.max(0, payBal()),
    amt = `<input id="pAmt" type="number" inputmode="decimal" min="0" value="${bal || ""}" placeholder="Amount">`;
  if (method === "cash")
    $("#pBody").innerHTML =
      amt + '<div class="stk">Enter the cash received. Any extra is returned as change.</div>';
  else if (method === "mpesa")
    $("#pBody").innerHTML =
      amt +
      '<input id="ph" inputmode="tel" placeholder="2547XXXXXXXX" value="2547"><div class="status" id="ms">Enter the customer’s Safaricom number, then press Add payment.</div>';
  else
    $("#pBody").innerHTML =
      amt +
      `<select id="cust">${CU.map((c, i) => `<option value="${i}">${c.n} (limit ${c.limit.toLocaleString()} · owes ${c.owes.toLocaleString()})</option>`).join("")}</select>`;
  $("#pAdd").disabled = bal <= 0.004;
}
$("#mPay .tabs").onclick = e => {
  const m = e.target.dataset.m;
  if (!m) return;
  method = m;
  document
    .querySelectorAll("#mPay .tabs .chip")
    .forEach(b => b.classList.toggle("on", b === e.target));
  payBody();
};
$("#pList").onclick = e => {
  const i = e.target.dataset.rm;
  if (i === undefined) return;
  pays.splice(+i, 1);
  renderPay();
};
$("#pCancel").onclick = () => {
  pays = [];
  $("#mPay").classList.remove("show");
};
$("#pAdd").onclick = () => {
  const bal = payBal(),
    a = parseFloat($("#pAmt").value);
  if (!(a > 0)) return fsNote("Enter an amount.");
  if (method === "cash") {
    const ap = Math.min(a, bal);
    pays.push({ m: "cash", amt: ap, chg: a > ap ? a - ap : 0 });
    return renderPay();
  }
  if (a > bal + 0.004) return fsNote("That is more than the balance due.");
  if (method === "credit") {
    const ci = +$("#cust").value,
      c = CU[ci],
      used = pays.filter(p => p.ci === ci).reduce((x, p) => x + p.amt, 0);
    if (c.owes + used + a > c.limit) return fsNote("Over the credit limit for " + c.n + ".");
    pays.push({ m: "credit", amt: a, who: c.n, ci });
    return renderPay();
  }
  const ph = $("#ph").value.trim();
  if (!/^2547\d{8}$|^2541\d{8}$/.test(ph)) return fsNote("Use the format 2547XXXXXXXX.");
  $("#ms").className = "status";
  $("#ms").textContent = "Request sent. Waiting for customer to enter PIN…";
  $("#pAdd").disabled = true;
  setTimeout(() => {
    pays.push({
      m: "mpesa",
      amt: a,
      ref: "QJ" + Math.random().toString(36).slice(2, 10).toUpperCase()
    });
    renderPay();
  }, 2800);
};
$("#pOk").onclick = () => {
  const direct = !payT,
    targets = direct
      ? [{ label: $("#fTable").value || "Direct sale", dept, lines: { ...cart } }]
      : payT;
  const q = pays.map(p => ({ ...p, left: c2(p.amt) }));
  let html = "",
    gsum = 0;
  const chv = pays.reduce((a, p) => a + (p.chg || 0), 0);
  targets.forEach((o, bi) => {
    const t = totals(o.lines),
      no = "NBO-" + pad(rno),
      lines = Object.entries(o.lines).map(([id, n]) => ({ it: get(id), q: n })),
      used = {};
    gsum += t.g;
    if (direct)
      lines.forEach(({ it, q: n }) => {
        itemStockMove(it, n);
        Object.entries(it.r).forEach(([k, v]) => (used[k] = (used[k] || 0) + v * n));
      });
    let need = c2(t.g);
    const al = [],
      mx = {};
    for (const p of q) {
      if (need <= 0) break;
      const take = Math.min(p.left, need);
      if (take > 0) {
        p.left -= take;
        need -= take;
        mx[p.m] = (mx[p.m] || 0) + take / 100;
        al.push(
          `<div class="r"><span>${MN[p.m]}${p.ref ? " " + p.ref : ""}${p.who ? " (" + p.who + ")" : ""}</span><span>${(take / 100).toFixed(2)}</span></div>`
        );
      }
    }
    SALES.push({
      no,
      at: new Date(),
      dept: o.dept,
      label: o.label,
      user: user ? user.n : "",
      net: t.net,
      tax: t.tax,
      g: t.g,
      lines: lines.map(({ it, q: n }) => ({ id: it.id, n: it.n, q: n, p: it.p, t: it.t })),
      mx
    });
    try {
      bosave();
    } catch (e) {}
    const cu = "KRACU0100" + Math.floor(1000 + Math.random() * 8999),
      inv = rno - 1000;
    rno++;
    html +=
      `<div style="page-break-after:always"><b>MWANGAZA SUPERMART</b><br>Nairobi CBD · PIN P051234567X<br>Tax Invoice ${no}<br>${direct ? "" : "Order: " + o.label + "<br>"}${new Date().toLocaleString("en-KE")}<br>Served by ${user ? user.n : ""} · ${o.dept}<hr>` +
      lines
        .map(
          ({ it, q: n }) =>
            `<div class="r"><span>${n} × ${it.n} (${it.t})</span><span>${(it.p * n).toFixed(2)}</span></div>`
        )
        .join("") +
      `<hr><div class="r"><span>Net</span><span>${t.net.toFixed(2)}</span></div><div class="r"><span>VAT</span><span>${t.tax.toFixed(2)}</span></div><div class="r"><b>TOTAL</b><b>${t.g.toFixed(2)}</b></div>${al.join("")}${chv > 0 && bi === targets.length - 1 ? `<div class="r"><span>Change</span><span>${chv.toFixed(2)}</span></div>` : ""}<hr>CU serial: ${cu}<br>CU invoice no: ${inv}<br>${qr(no + cu)}Scan to verify on KRA eTIMS<br>(demo QR)${
        direct
          ? `<hr><i>Stock used: ${Object.entries(used)
              .map(([k, v]) => ING[k] + " " + v)
              .join(", ")}</i>`
          : ""
      }<hr></div>`;
  });
  if (targets.length > 1)
    html +=
      `<div><b>SETTLEMENT SUMMARY</b><br>${targets.length} bills · ${KES(gsum)}<hr>` +
      pays
        .map(
          p =>
            `<div class="r"><span>${MN[p.m]}${p.ref ? " " + p.ref : ""}${p.who ? " (" + p.who + ")" : ""}</span><span>${p.amt.toFixed(2)}</span></div>`
        )
        .join("") +
      (chv > 0
        ? `<div class="r"><span>Change given</span><span>${chv.toFixed(2)}</span></div>`
        : "") +
      `</div>`;
  pays.filter(p => p.m === "credit").forEach(p => (CU[p.ci].owes += p.amt));
  if (direct) {
    cart = {};
    kmsg = "";
    rider = null;
    ["fTable", "fGuest", "fCov"].forEach(i => ($("#" + i).value = ""));
  } else
    targets.forEach(o => {
      const i = orders.indexOf(o);
      if (i > -1) orders.splice(i, 1);
    });
  pays = [];
  payT = null;
  if ($("#mSel").classList.contains("show")) selRender();
  $("#rc").innerHTML = html;
  $("#rcCharge").style.display = "none";
  $("#rcClose").textContent = "New sale";
  $("#mPay").classList.remove("show");
  $("#mRc").classList.add("show");
  drawCart();
};
// pseudo eTIMS QR (visual placeholder, real QR comes from KRA validation URL)
function qr(seed) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const N = 21;
  let s = "";
  const on = (x, y) => {
    const f = (a, b) => (a < 7 && b < 7) || (a > 13 && b < 7) || (a < 7 && b > 13);
    if (f(x, y)) {
      const lx = x % 14,
        ly = y % 14;
      const ex = x < 7 ? x : x - 14,
        ey = y < 7 ? y : y - 14;
      return (
        ex === 0 || ex === 6 || ey === 0 || ey === 6 || (ex >= 2 && ex <= 4 && ey >= 2 && ey <= 4)
      );
    }
    h = (h * 1664525 + 1013904223) >>> 0;
    return h >>> 28 > 6;
  };
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) if (on(x, y)) s += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return `<svg class="qr" viewBox="0 0 21 21" shape-rendering="crispEdges" fill="#000">${s}</svg>`;
}
$("#theme").onclick = () => {
  const r = document.documentElement,
    dark = r.dataset.theme
      ? r.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
  r.dataset.theme = dark ? "light" : "dark";
};

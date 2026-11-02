// payment
let pays = [],
  payT = null;
const SALES = [];
const CU = [
  { n: "Kamau Hardware", limit: 50000, owes: 12400 },
  { n: "Njeri Catering", limit: 30000, owes: 0 }
];
const c2 = n => Math.round(n * 100),
  MN = {
    cash: "Cash",
    mpesa: "M-Pesa",
    pdq: "PDQ",
    comp: "Complimentary",
    credit: "Credit",
    room: "Room"
  };
const payDue = () => (payT ? payT.reduce((a, o) => a + totals(o.lines, o).g, 0) : totals().g);
const payBal = () => (c2(payDue()) - c2(pays.reduce((a, p) => a + p.amt, 0))) / 100;
// ---- the Settle Bill screen: one line per paymode, with a tip and narration on each ----
const PAY_ROWS = [
  ["cash", "Cash", "Note, if any"],
  ["comp", "Complimentary", "Reason (required)"],
  ["pdq", "PDQ", "Card slip number"],
  ["mpesa", "M-Pesa", "M-Pesa code, or 2547… to send a request"]
];
const PAY_NOTES = [
  [1000, "n1"],
  [500, "n2"],
  [200, "n3"],
  [100, "n4"],
  [50, "n5"],
  [40, "c"],
  [20, "c"],
  [10, "c"],
  [5, "c"]
];
let payRow = "cash",
  payVals = {},
  payPost = [],
  payPanel = "",
  payNoRc = false,
  payCust = { n: "", p: "" },
  payTipsNow = {};
const payNum = v => {
  const n = parseFloat(v);
  return n > 0 ? n : 0;
};
function openPay(tg) {
  if (!can("clear")) return fsNote("You don't have the right to clear bills.");
  if (!tg && newBillBlock()) return fsNote(newBillBlock());
  const none = (tg || []).find(o => !Object.keys(o.lines).length);
  if (none) return fsNote(`Bill ${none.no} has no items yet.`);
  if (!shiftOk()) return;
  payT = tg || null;
  pays = [];
  payPost = [];
  payVals = {};
  payRow = "cash";
  payPanel = "";
  const one = payT && payT.length === 1 ? payT[0] : null;
  payCust = { n: one ? one.guest || "" : $("#fGuest").value.trim(), p: "" };
  drawPay();
  $("#mPay").classList.add("show");
  const c = $("#pAmt");
  if (c) c.focus();
}
function payBillInfo() {
  const many = payT && payT.length > 1,
    one = payT && payT.length === 1 ? payT[0] : null;
  return {
    no: many ? `${payT.length} bills` : one ? one.no : draft ? draft.no : pad(rno, 5),
    waiter: many ? "Several" : one ? one.waiter : user ? user.n : "",
    what: payT ? payT.map(o => o.label).join(" · ") : "Direct sale · " + billPlace(cart)
  };
}
function drawPay() {
  const B = payBillInfo(),
    payBill = !payT ? cartAdj : payT.length === 1 ? payT[0] : null,
    payCur = payBill && payBill.cur,
    val = (m, k) => slipEsc((payVals[m] || {})[k] || ""),
    rows = PAY_ROWS.map(
      ([m, l, ph]) =>
        `<tr class="pay-r ${m === payRow ? "on" : ""}" data-pr="${m}"><th>${l}</th><td><input ${m === "cash" ? 'id="pAmt"' : ""} data-pa="${m}" type="number" inputmode="decimal" min="0" step="any" value="${val(m, "a")}" placeholder="0.00"></td><td><input data-pt="${m}" type="number" inputmode="decimal" min="0" step="any" value="${val(m, "t")}" placeholder="0" ${m === "comp" ? "disabled" : ""}></td><td class="pay-n"><input data-pn="${m}" value="${val(m, "n")}" placeholder="${ph}" autocomplete="off">${m === "mpesa" ? '<button class="pay-stk" data-stk>Send request</button>' : ""}</td></tr>`
    ).join(""),
    posted = payPost
      .map(
        (p, i) =>
          `<tr class="pay-r posted"><th>${MN[p.m]}</th><td class="v">${bill2(p.amt)}</td><td class="v">–</td><td class="pay-n"><span>${slipEsc(p.who)}</span><button class="pay-x" data-rm="${i}" aria-label="Remove">×</button></td></tr>`
      )
      .join(""),
    custs = CU.map(c => `<option value="${slipEsc(c.n)}">`).join("");
  $("#pWrap").innerHTML =
    `<div class="pay-head"><h3 id="pTitle">Settle bill</h3><div class="stk" id="pBills">${slipEsc(B.what)}${payCur ? ` · ${slipEsc(payCur.c)} ${bill2(payDue() / payCur.rate)} at ${payCur.rate}` : ""}</div><button class="pay-exit" id="pCancel">Exit</button></div>
  ${payMoneyHTML(payT)}<div class="pay-info"><label>Customer name<input id="pCustN" list="pCustL" value="${slipEsc(payCust.n)}" placeholder="Optional" autocomplete="off"><datalist id="pCustL">${custs}</datalist></label><label>Customer PIN<input id="pCustP" value="${slipEsc(payCust.p)}" placeholder="Optional, for the receipt" autocomplete="off"></label><div class="pay-f"><span>Bill no</span><b>${slipEsc(B.no)}</b></div><div class="pay-f"><span>Waiter</span><b>${slipEsc(B.waiter)}</b></div><div class="pay-f pay-total"><span>Bill total</span><b id="pTotal">${KES(payDue())}</b></div></div>
  <table class="pay-t ${posOpt("tips") ? "" : "notip"}"><thead><tr><th>Paymode</th><th class="n">Amount</th><th class="n">Tip</th><th>Narration</th></tr></thead><tbody>${rows}${posted}</tbody></table>
  <div class="pay-pin" id="pCompPin" style="display:none">${actsAlone("comp") ? "" : '<input id="pPin" type="password" inputmode="numeric" autocomplete="off" placeholder="Manager or Super Cashier PIN for the complimentary">'}</div>
  ${payPanelHTML()}
  <div class="pay-low"><div><div class="pay-rc"><label><input type="radio" name="pRc" id="pRcY" ${payNoRc ? "" : "checked"}> Print receipt</label><label><input type="radio" name="pRc" id="pRcN" ${payNoRc ? "checked" : ""}> No receipt</label></div>
  <div class="pay-cash">${PAY_NOTES.map(([v, c]) => `<button class="pay-note ${c}" data-note="${v}"><small>KES</small>${v}</button>`).join("")}<button class="pay-reset" data-note="0">Reset</button></div></div>
  <div class="pay-sum"><div><span>Tendered total</span><b id="pTend">0.00</b></div><div id="pBal" class="status"></div></div></div>
  <div class="pay-go"><button class="pay-post" id="pAcct">Post to account</button><button class="pay-post" id="pRoom">Post to room</button><button class="pay-post" id="pMulti">Clear multiple bills</button><button class="pay-clear" id="pOk">Clear bill</button></div>`;
  applyRights();
  payCalc();
}
function payPanelHTML() {
  const due = Math.max(0, payLeft()).toFixed(2);
  if (payPanel === "acct")
    return `<div class="pay-panel"><h4>Post to account</h4><select id="pCu">${CU.map((c, i) => `<option value="${i}">${slipEsc(c.n)} · limit ${c.limit.toLocaleString()} · owes ${c.owes.toLocaleString()}</option>`).join("") || '<option value="">No credit customers yet</option>'}</select><input id="pPostA" type="number" inputmode="decimal" min="0" step="any" value="${due}"><button class="pay-mini" data-post="acct">Add</button><button class="pay-mini" data-panel="">Cancel</button></div>`;
  if (payPanel === "room") {
    const L = RESERVATIONS.filter(r => r.status === "inhouse");
    return `<div class="pay-panel"><h4>Post to room</h4><select id="pRm">${L.map(r => `<option value="${slipEsc(r.id)}">Room ${slipEsc(r.room)} · ${slipEsc(r.guest)}</option>`).join("") || '<option value="">No guests in-house</option>'}</select><input id="pPostA" type="number" inputmode="decimal" min="0" step="any" value="${due}"><button class="pay-mini" data-post="room">Add</button><button class="pay-mini" data-panel="">Cancel</button></div>`;
  }
  if (payPanel === "multi")
    return `<div class="pay-panel multi"><h4>Clear multiple bills</h4><div class="pay-bills">${visOrders()
      .filter(o => Object.keys(o.lines).length)
      .map(
        o =>
          `<label class="${o.printed ? "printed" : ""} ${o.billCopies ? "rep" : ""}"><input type="checkbox" data-pb="${slipEsc(o.no)}" ${payT && payT.includes(o) ? "checked" : ""}> <b>${slipEsc(o.no)}</b> ${slipEsc(o.label)} · ${slipEsc(o.waiter || "")}<span>${KES(totals(o.lines, o).g)}</span></label>`
      )
      .join("")}</div><button class="pay-mini" data-panel="">Done</button></div>`;
  return "";
}
/** What the screen holds now, read from the boxes. */
function payRead() {
  document.querySelectorAll("#pWrap [data-pa]").forEach(el => {
    const m = el.dataset.pa;
    payVals[m] = {
      a: el.value,
      t: $(`#pWrap [data-pt="${m}"]`).value,
      n: $(`#pWrap [data-pn="${m}"]`).value
    };
  });
  if ($("#pCustN")) payCust = { n: $("#pCustN").value, p: $("#pCustP").value };
}
const payTendered = () =>
  PAY_ROWS.reduce((a, [m]) => a + payNum((payVals[m] || {}).a), 0) +
  payPost.reduce((a, p) => a + p.amt, 0);
const payLeft = () => (c2(payDue()) - c2(payTendered())) / 100;
function payCalc() {
  payRead();
  const bal = payLeft();
  $("#pTend").textContent = bill2(payTendered());
  $("#pBal").textContent =
    bal > 0.004 ? "Balance due: " + KES(bal) : bal < -0.004 ? "Change: " + KES(-bal) : "Fully paid";
  $("#pBal").className = "status " + (bal > 0.004 ? "bad" : "ok");
  $("#pCompPin").style.display = payNum((payVals.comp || {}).a) > 0 ? "" : "none";
  document
    .querySelectorAll("#pWrap .pay-r[data-pr]")
    .forEach(r => r.classList.toggle("on", r.dataset.pr === payRow));
}
/** Turns the screen into payments, or says what's missing. */
function payCommit() {
  payRead();
  const V = m => payVals[m] || {},
    A = m => payNum(V(m).a),
    due = payDue(),
    others = A("comp") + A("pdq") + A("mpesa") + payPost.reduce((a, p) => a + p.amt, 0);
  if (payLeft() > 0.004) return (fsNote("Balance due: " + KES(payLeft())), false);
  if (others > due + 0.004) return (fsNote("Only cash can be more than the bill."), false);
  const mp = String(V("mpesa").n || "").trim();
  if (A("mpesa") > 0 && (!mp || /^254\d{9}$/.test(mp)))
    return (fsNote("Enter the M-Pesa code, or press Send request."), false);
  let by = "";
  if (A("comp") > 0) {
    if (!String(V("comp").n || "").trim())
      return (fsNote("Enter the reason for the complimentary."), false);
    if (actsAlone("comp")) by = user.n;
    else {
      if (Date.now() < boptLock) return (fsNote("Too many tries. Wait 30 seconds."), false);
      const u = USERS.find(x => BILL_AUTH.includes(x.role) && x.pin === $("#pPin").value);
      if (!u) {
        $("#pPin").value = "";
        if (++boptFails >= 5) {
          boptLock = Date.now() + 3e4;
          boptFails = 0;
        }
        return (fsNote("That PIN cannot authorize a complimentary."), false);
      }
      boptFails = 0;
      by = u.n;
    }
  }
  pays = [...payPost];
  if (A("mpesa") > 0) pays.push({ m: "mpesa", amt: A("mpesa"), ref: mp });
  if (A("pdq") > 0) pays.push({ m: "pdq", amt: A("pdq"), ref: String(V("pdq").n || "").trim() });
  if (A("comp") > 0)
    pays.push({ m: "comp", amt: A("comp"), ref: String(V("comp").n).trim(), who: by });
  const need = Math.max(0, due - others);
  if (A("cash") > 0 || need > 0.004) {
    const ap = Math.min(A("cash"), need);
    pays.push({
      m: "cash",
      amt: ap,
      chg: A("cash") > ap ? A("cash") - ap : 0,
      ref: String(V("cash").n || "").trim()
    });
  }
  payTipsNow = {};
  PAY_ROWS.forEach(([m]) => {
    const t = payNum(V(m).t);
    if (t > 0) payTipsNow[m] = t;
  });
  return true;
}
function payAddPost(kind) {
  const a = parseFloat($("#pPostA").value);
  if (!(a > 0)) return fsNote("Enter an amount.");
  if (a > payLeft() + 0.004) return fsNote("That is more than the balance due.");
  if (kind === "acct") {
    const ci = $("#pCu").value;
    if (ci === "") return fsNote("Add a credit customer first.");
    const c = CU[+ci],
      used = payPost.filter(p => p.ci === +ci).reduce((x, p) => x + p.amt, 0);
    if (c.owes + used + a > c.limit) return fsNote("Over the credit limit for " + c.n + ".");
    payPost.push({ m: "credit", amt: a, who: c.n, ci: +ci });
    if (!payCust.n) payCust.n = c.n;
  } else {
    const r = RESERVATIONS.find(x => String(x.id) === $("#pRm").value);
    if (!r) return fsNote("There are no guests in-house.");
    payPost = payPost.filter(p => p.m !== "room");
    payPost.push({ m: "room", amt: a, who: `Room ${r.room} · ${r.guest}`, rid: r.id });
    if (!payCust.n) payCust.n = r.guest;
  }
  payPanel = "";
  drawPay();
}
$("#mPay").addEventListener("input", e => {
  if (e.target.closest("#pWrap")) payCalc();
});
$("#mPay").addEventListener("focusin", e => {
  const r = e.target.closest("[data-pr]");
  if (r) {
    payRow = r.dataset.pr;
    payCalc();
  }
});
$("#mPay").addEventListener("change", e => {
  if (e.target.id === "pRcY" || e.target.id === "pRcN") payNoRc = $("#pRcN").checked;
  const no = e.target.dataset.pb;
  if (no) {
    payRead();
    const o = orders.find(x => x.no === no),
      L = payT || [];
    const next = e.target.checked ? [...L, o] : L.filter(x => x !== o);
    if (!next.length) {
      e.target.checked = true;
      return fsNote("Keep at least one bill.");
    }
    payT = next;
    payPost = [];
    drawPay();
  }
});
$("#mPay").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) {
    const r = e.target.closest("[data-pr]");
    if (r) {
      payRow = r.dataset.pr;
      payCalc();
    }
    return;
  }
  const d = b.dataset;
  if (b.id === "pCancel") {
    pays = [];
    return $("#mPay").classList.remove("show");
  }
  if (b.id === "pOk") return payClear();
  if (d.note !== undefined) {
    payRead();
    const v = (payVals[payRow] = payVals[payRow] || {});
    v.a = +d.note ? String(payNum(v.a) + +d.note) : "";
    $(`#pWrap [data-pa="${payRow}"]`).value = v.a;
    return payCalc();
  }
  if (d.rm !== undefined) {
    payRead();
    payPost.splice(+d.rm, 1);
    return drawPay();
  }
  if (b.id === "pAcct" || b.id === "pRoom" || b.id === "pMulti" || d.panel !== undefined) {
    payRead();
    if (b.id === "pMulti" && !payT)
      return fsNote("Send this sale first, then clear it with other bills.");
    payPanel =
      d.panel !== undefined ? d.panel : { pAcct: "acct", pRoom: "room", pMulti: "multi" }[b.id];
    return drawPay();
  }
  if (d.post) {
    payRead();
    return payAddPost(d.post);
  }
  if (d.stk !== undefined) {
    payRead();
    const n = $('#pWrap [data-pn="mpesa"]'),
      ph = n.value.trim();
    if (!/^2547\d{8}$|^2541\d{8}$/.test(ph)) return fsNote("Enter the number as 2547XXXXXXXX.");
    if (!(payNum((payVals.mpesa || {}).a) > 0)) return fsNote("Enter the M-Pesa amount first.");
    b.disabled = true;
    b.textContent = "Waiting for PIN…";
    setTimeout(() => {
      if (!$("#mPay").classList.contains("show")) return;
      const box = $('#pWrap [data-pn="mpesa"]');
      if (box) box.value = "QJ" + Math.random().toString(36).slice(2, 10).toUpperCase();
      b.disabled = false;
      b.textContent = "Send request";
      payCalc();
    }, 2800);
  }
});
/** A POS bill on a guest's folio. posOwed remembers it was already counted as a sale, so paying it isn't counted again. */
function roomCharge(id, amt, desc) {
  const r = RESERVATIONS.find(x => x.id === id);
  if (!r) return;
  r.charges.push({ at: new Date().toISOString(), cat: "F&B", desc, amt });
  r.posOwed = Math.max(0, (r.posOwed || 0) + amt);
}
function payClear() {
  if (!payCommit()) return;
  const direct = !payT,
    targets = direct
      ? [
          {
            label: $("#fTable").value || "Walk-in",
            guest: $("#fGuest").value,
            covers: $("#fCov").value,
            room: $("#fRoom").value,
            dept,
            lines: { ...cart },
            ...cartAdj,
            ...draftTake()
          }
        ]
      : payT;
  const q = pays.map(p => ({ ...p, left: c2(p.amt) }));
  let html = "",
    gsum = 0;
  const chv = pays.reduce((a, p) => a + (p.chg || 0), 0);
  targets.forEach((o, bi) => {
    const t = totals(o.lines, o),
      no = o.no || nextBill(),
      ord = o.ord || nextOrder(user ? user.n : ""),
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
    const cu = "KRACU0100" + Math.floor(1000 + Math.random() * 8999),
      inv = +no,
      change = bi === targets.length - 1 ? chv : 0,
      credit = pays.some(p => p.m === "credit" || p.m === "room"),
      tips = bi === 0 ? payTipsNow : {},
      roomPay = pays.find(p => p.m === "room"),
      cust = payCust.n.trim(),
      custPin = payCust.p.trim(),
      waiter = o.waiter || (user ? user.n : "");
    // Tips sit outside the sale: they aren't revenue and carry no tax.
    Object.values(tips).forEach(v =>
      al.push(`<div class="r"><span>Tip</span><span>${v.toFixed(2)}</span></div>`)
    );
    if (mx.room > 0) roomCharge(roomPay.rid, mx.room, `Bill ${no} · ${o.label}`);
    const shares = billPoints(o.lines);
    let leftMx = { ...mx },
      leftG = t.g,
      leftTax = t.tax,
      leftDisc = t.disc;
    shares.forEach((d, si) => {
      const part = Object.fromEntries(Object.entries(o.lines).filter(([id]) => get(id).d === d)),
        pt = totals(part, { ...o, disc: null }),
        last = si === shares.length - 1,
        k = t.sub ? pt.sub / t.sub : 1,
        cents = n => Math.round(n * 100) / 100,
        g = last ? leftG : cents(t.g * k),
        tax = last ? leftTax : cents(t.tax * k),
        dd = last ? leftDisc : cents(t.disc * k),
        pmx = {};
      Object.keys(mx).forEach(m => {
        pmx[m] = last ? leftMx[m] : cents(mx[m] * k);
        leftMx[m] -= pmx[m];
      });
      leftG -= g;
      leftTax -= tax;
      leftDisc -= dd;
      SALES.push({
        no,
        ord,
        at: new Date(),
        bd: bizDate(),
        billCopies: o.billCopies,
        dept: d,
        label: o.label,
        user: user ? user.n : "",
        waiter,
        guest: o.guest,
        covers: o.covers,
        room: o.room,
        cust,
        custPin,
        ...(si === 0 && Object.keys(tips).length ? { tips } : {}),
        ...(si === 0 && mx.comp
          ? {
              comp: {
                why: pays
                  .filter(p => p.m === "comp")
                  .map(p => p.ref)
                  .join(", "),
                by: pays
                  .filter(p => p.m === "comp")
                  .map(p => p.who)
                  .join(", ")
              }
            }
          : {}),
        ...(si === 0
          ? {
              slip: {
                paid: al.join(""),
                change,
                credit,
                credits: pays.filter(p => p.m === "credit").map(p => ({ ci: p.ci, amt: p.amt })),
                cu,
                inv,
                cur: t.cur,
                roomId: roomPay && roomPay.rid
              }
            }
          : {}),
        rates: { B: TAX.B, C: TAX.C },
        net: g - tax,
        tax,
        g,
        lines: lines
          .filter(({ it }) => it.d === d)
          .map(({ it, q: n }) => ({ id: it.id, n: it.n, q: n, p: itemPrice(it, o), t: it.t })),
        disc: dd,
        pl: t.pl ? t.pl.n : "",
        mx: pmx
      });
    });
    try {
      bosave();
    } catch (e) {}
    html += receiptHTML({
      pt: billPoints(o.lines)[0],
      no,
      ord,
      cust,
      custPin,
      dept: billPlace(o.lines),
      label: o.label,
      guest: o.guest,
      covers: o.covers,
      room: o.room,
      waiter,
      lines: lines.map(({ it, q: n }) => ({ q: n, n: it.n, p: itemPrice(it, o), t: it.t })),
      t,
      paid: al.join(""),
      change,
      credit,
      fiscal: `CU serial: ${cu}<br>CU invoice no: ${inv}${qr(no + cu)}Scan to verify on KRA eTIMS<br>(demo QR)`
    });
  });
  if (targets.length > 1)
    html +=
      `<div class="slip sl-order"><div class="sl-ot">Settlement summary</div><div class="sl-sub">${targets.length} bills · ${KES(gsum)}</div><div class="sl-paid">` +
      pays
        .map(
          p =>
            `<div class="r"><span>${MN[p.m]}${p.ref ? " " + p.ref : ""}${p.who ? " (" + p.who + ")" : ""}</span><span>${p.amt.toFixed(2)}</span></div>`
        )
        .join("") +
      (chv > 0
        ? `<div class="r"><span>Change given</span><span>${chv.toFixed(2)}</span></div>`
        : "") +
      `</div></div>`;
  pays.filter(p => p.m === "credit").forEach(p => (CU[p.ci].owes += p.amt));
  if (direct) {
    cart = {};
    kmsg = "";
    rider = null;
    ["fTable", "fGuest", "fCov", "fRoom"].forEach(i => ($("#" + i).value = ""));
  } else
    targets.forEach(o => {
      const i = orders.indexOf(o);
      if (i > -1) orders.splice(i, 1);
    });
  pays = [];
  payT = null;
  if ($("#mSel").classList.contains("show")) selRender();
  $("#mPay").classList.remove("show");
  if (payNoRc) {
    fsNote(targets.length > 1 ? `${targets.length} bills cleared.` : "Bill cleared.");
  } else {
    $("#rc").innerHTML = html;
    $("#rcCharge").style.display = "none";
    $("#rcClose").textContent = "New sale";
    $("#mRc").classList.add("show");
    printSlips("RECEIPT");
  }
  drawCart();
}
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

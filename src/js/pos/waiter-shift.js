// ---- A waiter's own shift screen: start, sales, pending bills, send them to a cashier, end ----
// Cashiers count a till and use Shift Management. A waiter only needs this.
const msSales = n => SALES.filter(s => (s.waiter || s.user) === n);
const msOn = (L, ymd) => L.filter(s => ymdOf(saleAt(s)) === ymd);
const msBills = L => new Set(L.filter(s => !s.ret).map(s => s.no)).size;
const msSum = L => L.reduce((a, s) => a + s.g, 0);
const msDay = (ymd, back) => {
  const [y, m, n] = ymd.split("-").map(Number);
  return ymdOf(new Date(y, m - 1, n - back));
};
const msCashiers = n =>
  USERS.filter(u => u.n !== n && BILL_ALL.includes(u.role) && shiftOf(u.n)).map(u => u.n);
function msChart(n) {
  const L = msSales(n),
    today = bizDate(),
    D = [6, 5, 4, 3, 2, 1, 0].map(back => {
      const ymd = msDay(today, back),
        S = msOn(L, ymd),
        [y, m, d] = ymd.split("-").map(Number);
      return {
        ymd,
        g: msSum(S),
        bills: msBills(S),
        day: new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short" }),
        full: new Date(y, m - 1, d).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short"
        })
      };
    }),
    top = Math.max(...D.map(x => x.g), 1);
  const bills = x => `${x.bills} bill${x.bills === 1 ? "" : "s"}`;
  return `<figure class="ms-chart"><figcaption>Your sales, last 7 days</figcaption><div class="ms-bars">${D.map(
    x =>
      `<div class="ms-col ${x.ymd === today ? "now" : ""}" tabindex="0" aria-label="${x.full}: KES ${R2(x.g)}, ${bills(x)}"><span class="ms-tip">${x.full}<b>KES ${R2(x.g)}</b>${bills(x)}</span>${x.ymd === today ? `<span class="ms-val">${R2(x.g)}</span>` : ""}<span class="ms-bar" style="height:${x.g > 0 ? Math.max(3, Math.round((x.g / top) * 100)) : 0}%"></span><span class="ms-day">${x.day}</span></div>`
  ).join(
    ""
  )}</div><details class="ms-tbl"><summary>Show as a table</summary><table class="sht"><tr><th>Day</th><th class="n">Bills</th><th class="n">Sales</th></tr>${D.map(x => `<tr><td>${x.full}</td><td class="n">${x.bills}</td><td class="n">${R2(x.g)}</td></tr>`).join("")}</table></details></figure>`;
}
// ---- Select: a bill that isn't cleared can be pushed to a cashier ----
let selPushOpen = false;
const selCanPush = () => !!user && user.role === "Waiter" && can("sendPending");
function selPushHTML(ch) {
  if (!selCanPush()) return "";
  const n = user.n,
    mine = ch.filter(o => pendingOf(n).includes(o));
  if (!selPushOpen)
    return `<button class="chip" id="selPushGo" ${mine.length ? "" : "disabled"}>Push to cashier (${mine.length})</button>`;
  const C = msCashiers(n);
  return C.length
    ? `<div class="sel-push"><label>Push ${mine.length} bill${mine.length === 1 ? "" : "s"} to<select id="selTo">${C.map(c => `<option>${hx(c)}</option>`).join("")}</select></label><button class="mini" id="selPushNo">Cancel</button><button class="chip on" id="selPushYes">Push</button></div>`
    : `<div class="sel-push"><div class="stk">No cashier has a shift open, so these bills can't be pushed yet.</div><button class="mini" id="selPushNo">Close</button></div>`;
}
/** The bill becomes the cashier's to clear. The waiter keeps the sales credit. */
function msHandover(o, to, n) {
  const at = new Date().toISOString();
  Object.assign(o, { handedTo: to, handedAt: at });
  BILLLOG.push({
    at,
    bd: bizDate(),
    act: "Handover",
    no: o.no,
    label: o.label,
    dept: billPlace(o.lines) || o.dept,
    waiter: o.waiter,
    by: n,
    user: n,
    why: "",
    detail: "Sent to " + to + ((o.money || []).length ? ": " + moneyText(o) : ""),
    amt: 0,
    points: billPoints(o.lines)
  });
}
function selPush() {
  const n = user.n,
    to = $("#selTo").value,
    T = myBills().filter(o => selSet.has(o.no) && pendingOf(n).includes(o));
  selPushOpen = false;
  if (!msCashiers(n).includes(to)) {
    selRender();
    return fsNote(`${to} no longer has a shift open.`);
  }
  T.forEach(o => msHandover(o, to, n));
  ordersKeep();
  selSet = new Set();
  selRender();
  fsNote(`${T.length} bill${T.length === 1 ? "" : "s"} pushed to ${to}.`);
}
$("#selPush").onclick = e => {
  const id = e.target.id;
  if (id === "selPushGo") selPushOpen = true;
  else if (id === "selPushNo") selPushOpen = false;
  else if (id === "selPushYes") return selPush();
  else return;
  selRender();
};
// Send to cashier: the waiter writes how the bill stands, by hand, and hands it over.
// What's written only helps the cashier. No sale, payment or till figure reads it.
let msEdit = null;
const moneyText = o =>
  (o.money || []).map(x => `${x.m} ${R2(x.amt)} ${x.paid ? "PAID" : "UNPAID"}`).join(", ");
function msSendHTML(o) {
  const C = msCashiers(user.n),
    rows = msEdit.rows.map(
      (x, i) =>
        `<div class="ms-nr" data-mn="${i}"><label>Payment method<input data-f="m" maxlength="30" value="${hx(x.m)}" placeholder="e.g. Cash, or M-Pesa QHJ7K2" autocomplete="off"></label><label>Amount (KES)<input data-f="amt" type="number" inputmode="decimal" min="0" step="any" value="${hx(x.amt)}" placeholder="0.00"></label><label>Status<select data-f="paid"><option value="0" ${x.paid ? "" : "selected"}>Unpaid</option><option value="1" ${x.paid ? "selected" : ""}>Paid</option></select></label><button class="mini" data-sa="ms_nrm" data-i="${i}" aria-label="Remove line ${i + 1}">Remove</button></div>`
    );
  return `<div class="ms-note"><h5>Send bill ${hx(o.no)} to a cashier · KES ${R2(totals(o.lines, o).g)}</h5><div class="stk">Write how it's being paid, if you know. The cashier clears the bill.</div>${rows.join("")}${C.length ? `<label class="ms-to">Send to<select id="msTo">${C.map(c => `<option ${msEdit.to === c ? "selected" : ""}>${hx(c)}</option>`).join("")}</select></label>` : `<div class="status bad">No cashier has a shift open, so this bill can't be sent yet.</div>`}<div class="ms-acts"><button class="mini" data-sa="ms_nadd">Add a line</button><button class="mini" data-sa="ms_ncancel">Cancel</button>${C.length ? `<button class="chip on" data-sa="ms_send">Send to cashier</button>` : ""}</div></div>`;
}
function msPendingHTML(n) {
  const P = pendingOf(n),
    open = msEdit && P.find(o => o.no === msEdit.no);
  return `<div class="shc"><h4>Pending bills</h4>${
    P.length
      ? `<div style="overflow:auto"><table class="sht"><tr><th>Bill</th><th>Table</th><th class="n">Total</th><th></th></tr>${P.map(o => `<tr><td>${hx(o.no)}</td><td>${hx(o.label)}</td><td class="n">${R2(totals(o.lines, o).g)}</td><td class="n">${can("sendPending") ? `<button class="mini" data-sa="ms_open" data-no="${hx(o.no)}">Send to cashier</button>` : ""}</td></tr>`).join("")}</table></div>${open ? msSendHTML(open) : ""}<div class="stk" style="margin-top:8px">You can't end your shift until these are cleared or sent to a cashier.</div>`
      : `<div class="stk">You have no pending bills.</div>`
  }</div>`;
}
/** What's in the boxes now, kept while lines are added or removed. */
function msRead() {
  msEdit.to = $("#msTo") ? $("#msTo").value : msEdit.to;
  msEdit.rows = [...document.querySelectorAll("#shMgr [data-mn]")].map(r => ({
    m: r.querySelector('[data-f="m"]').value,
    amt: r.querySelector('[data-f="amt"]').value,
    paid: r.querySelector('[data-f="paid"]').value === "1"
  }));
}
function msSendBill(n) {
  msRead();
  const o = orders.find(x => x.no === msEdit.no);
  if (!o) {
    msEdit = null;
    return msDraw("That bill is no longer pending.");
  }
  if (!can("sendPending")) return msDraw("You don't have the right to send bills to a cashier.");
  if (!msCashiers(n).includes(msEdit.to))
    return msDraw(`${hx(msEdit.to)} no longer has a shift open.`);
  const L = [];
  for (const x of msEdit.rows) {
    const m = x.m.trim(),
      a = parseFloat(x.amt);
    if (!m && !x.amt) continue;
    if (!m) return msDraw("Write the payment method on each line.");
    if (!(a > 0)) return msDraw(`Enter the amount for ${hx(m)}.`);
    L.push({ m, amt: a, paid: x.paid });
  }
  o.money = L;
  msHandover(o, msEdit.to, n);
  const to = msEdit.to;
  msEdit = null;
  ordersKeep();
  msDraw(`Bill ${hx(o.no)} sent to ${hx(to)}.`);
}
/** What the cashier sees when clearing: the waiter's notes, for reading only. */
function payMoneyHTML(L) {
  const T = (L || []).filter(o => (o.money || []).length);
  return T.length
    ? `<div class="pay-money"><h4>From the waiter <small>Not a payment. Enter what you receive below.</small></h4>${T.map(o => `<div class="pay-mb"><b>${slipEsc(o.no)} · ${slipEsc(o.waiter)}</b>${o.money.map(x => `<div class="pay-mr"><span>${slipEsc(x.m)}</span><span>${R2(x.amt)}</span><em class="${x.paid ? "paid" : ""}">${x.paid ? "Paid" : "Unpaid"}</em></div>`).join("")}</div>`).join("")}</div>`
    : "";
}
function msDraw(msg) {
  const n = user.n,
    d = curDay(),
    sh = shiftOf(n),
    L = msSales(n),
    today = msOn(L, bizDate()),
    week = L.filter(s => ymdOf(saleAt(s)) >= msDay(bizDate(), 6)),
    P = pendingOf(n),
    pend = P.reduce((a, o) => a + totals(o.lines, o).g, 0),
    tile = (l, v, s) =>
      `<div class="ms-t"><span>${l}</span><b>${v}</b>${s ? `<small>${s}</small>` : ""}</div>`;
  let main;
  if (!d)
    main = `<div class="shc"><div class="status bad">The day has not been started.</div>${canDay() ? `<div class="stk">The new business date will be <b>${dateGB(nextBizDate())}</b>.</div><button class="chip on" data-sa="dstart">Start new day</button>` : `<div class="stk">Back Office or a cashier has to start the new day. You can start your shift after that.</div>`}</div>`;
  else if (!sh && shiftHeld()) main = shiftHeldHTML();
  else if (!sh)
    main = `<div class="shc"><button class="chip on ms-go" data-sa="ms_start">Start shift</button></div>`;
  else
    main = `<div class="shc ms-open"><div class="status ok">Shift open since ${hm(sh.openedAt)}</div><div class="ms-acts"><button class="chip on" data-sa="ms_end">End shift</button></div></div>`;
  $("#shMgr").innerHTML =
    `<div class="shm"><div class="shm-top"><h2>My shift</h2><button class="mini" data-sa="exit">Exit</button></div>${msg ? `<div class="status">${msg}</div>` : ""}${main}
  <div class="ms-tiles">${tile("Sales today", "KES " + R2(msSum(today)))}${tile("Bills today", msBills(today))}${tile("Last 7 days", "KES " + R2(msSum(week)))}${tile("Pending bills", P.length, "KES " + R2(pend))}</div>
  <div class="shc">${msChart(n)}</div>${!sh && d && shiftHeld() ? "" : msPendingHTML(n)}</div>`;
}
/** A waiter counts no cash: the shift just ends, and nothing prints. */
function msEnd() {
  const sh = shiftOf(user.n),
    r = shiftEnd(sh, shiftCalc(sh).expected, user.n);
  if (r) return msDraw(r);
  shiftBadge();
  msDraw("Shift ended.");
}
function msAct(a, b) {
  const n = user.n;
  if (a === "ms_start") {
    const r = shiftStart(n, 0, n);
    if (r) return msDraw(r);
    shiftBadge();
    return $("#shMgr").classList.remove("show");
  }
  if (a === "ms_end") {
    const left = pendingOf(n).length;
    if (left)
      return msDraw(
        `You have ${left} pending bill${left === 1 ? "" : "s"}. Clear ${left === 1 ? "it" : "them"} or send ${left === 1 ? "it" : "them"} to a cashier before ending your shift.`
      );
    return msEnd();
  }
  if (a === "ms_open") {
    const o = orders.find(x => x.no === b.dataset.no);
    msEdit = {
      no: b.dataset.no,
      rows: (o.money || []).length
        ? o.money.map(x => ({ ...x }))
        : [{ m: "", amt: "", paid: false }]
    };
    return msDraw();
  }
  if (a === "ms_nadd") {
    msRead();
    msEdit.rows.push({ m: "", amt: "", paid: false });
    return msDraw();
  }
  if (a === "ms_nrm") {
    msRead();
    msEdit.rows.splice(+b.dataset.i, 1);
    return msDraw();
  }
  if (a === "ms_ncancel") {
    msEdit = null;
    return msDraw();
  }
  if (a === "ms_send") return msSendBill(n);
}

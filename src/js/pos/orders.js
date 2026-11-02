// ---- send order first, bill and charge later ----
let orders = [],
  cur = null,
  ono = 1,
  payOrder = null,
  selTbl = "";
/** Save when an open order changes: sending, adding, settling or any bill option all end by redrawing the cart. */
let ordersSaved = "[]";
function ordersKeep() {
  const now = JSON.stringify(orders);
  if (now === ordersSaved) return;
  ordersSaved = now;
  if (window.bosave) window.bosave();
}
const TBL = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "Takeaway"];
/** The sale points a bill's items belong to. A bill can hold several in the All sale points view. */
const billPoints = c => [
  ...new Set(
    Object.keys(c)
      .map(id => (get(id) || {}).d)
      .filter(Boolean)
  )
];
const billPlace = c => billPoints(c).join(", ");
const billAtPoints = (o, pts) =>
  pts.includes(o.dept) || billPoints(o.lines).some(d => pts.includes(d));
/** A waiter works on their own bills. These roles see every waiter's bills at their sale points. */
const BILL_ALL = ["Manager", "Super Cashier", "Cashier"];
const seesAllBills = u => !!u && BILL_ALL.includes(u.role);
const billsFor = (u, pts) =>
  orders.filter(o => (u && o.waiter === u.n) || (seesAllBills(u) && billAtPoints(o, pts)));
const visOrders = () => billsFor(user, DEPTS);
const hhmm = d => d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
const cnt = c => Object.values(c).reduce((a, b) => a + b, 0);
function showRc(html, charge, closeLbl) {
  $("#rc").innerHTML = html;
  $("#rcClose").textContent = closeLbl;
  const b = $("#rcCharge");
  b.style.display = charge ? "" : "none";
  b.onclick = charge
    ? () => {
        $("#mRc").classList.remove("show");
        openPay([charge]);
      }
    : null;
  $("#mRc").classList.add("show");
}
function drawTbl() {
  $("#tbls").innerHTML = TBL.map(
    t => `<button class="chip ${t === selTbl ? "on" : ""}" data-t="${t}">${t}</button>`
  ).join("");
}
$("#tbls").onclick = e => {
  const t = e.target.dataset.t;
  if (!t) return;
  selTbl = t;
  $("#lbl").value = t;
  drawTbl();
};
$("#sendBtn").onclick = () => {
  if (!Object.keys(cart).length) return;
  if (cur) return doSend(cur.label);
  const l0 = $("#fTable").value.trim() || $("#fGuest").value.trim();
  if (l0) return doSend(l0);
  selTbl = "";
  $("#lbl").value = "";
  drawTbl();
  $("#mSend").classList.add("show");
};
$("#sendGo").onclick = () => {
  const l = $("#lbl").value.trim();
  if (!l) {
    $("#lbl").focus();
    return;
  }
  doSend(l);
};
function doSend(label) {
  let tickets = [];
  const round = { ...cart };
  let o =
    cur ||
    (dept === ALLP
      ? orders.filter(x => billAtPoints(x, DEPTS))
      : orders.filter(x => x.dept === dept)
    ).find(x => x.label.toLowerCase() === label.toLowerCase());
  if (o && !cur && !visOrders().includes(o)) {
    $("#mSend").classList.remove("show");
    return fsNote(
      `${o.label} is open under ${o.waiter}. Use another name, or ask a manager to merge.`
    );
  }
  // This sale's discount or price list was authorized for this sale, not for the whole open bill.
  if (o && !cur && (cartAdj.disc || cartAdj.pl || cartAdj.cur)) {
    $("#mSend").classList.remove("show");
    return fsNote(
      `${o.label} is already open. Remove this sale's bill option, or add to that bill.`
    );
  }
  if (!o) {
    o = {
      no: "ORD-" + String(ono++).padStart(3, "0"),
      label,
      dept: dept === ALLP ? billPoints(round)[0] : dept,
      lines: {},
      rounds: 0,
      at: new Date(),
      guest: $("#fGuest").value.trim(),
      covers: $("#fCov").value.trim(),
      room: $("#fRoom").value.trim(),
      rider: rider,
      waiter: user ? user.n : "",
      ...cartAdj
    };
    orders.push(o);
  } else {
    if (rider && !o.rider) o.rider = rider;
    o.room = o.room || $("#fRoom").value.trim();
  }
  for (const [id, q] of Object.entries(round)) {
    o.lines[id] = (o.lines[id] || 0) + q;
    itemStockMove(get(id), q);
  }
  o.rounds++;
  cart = {};
  cur = null;
  $("#mSend").classList.remove("show");
  drawCart();
  showRc(
    (tickets = orderTickets(round, {
      no: o.no,
      dept: billPlace(o.lines),
      label: o.label,
      guest: o.guest,
      covers: o.covers,
      room: o.room,
      waiter: user ? user.n : o.waiter,
      rider: o.rider,
      round: o.rounds,
      note: kmsg
    }))
      .map(x => x.html)
      .join("") +
      '<div class="sl-scr" id="rcPrinted"></div><div class="sl-scr">Sent. Bill and charge later from Open orders.</div>',
    null,
    "Close"
  );
  printOrderTickets(tickets);
  kmsg = "";
  rider = null;
  ["fTable", "fGuest", "fCov", "fRoom"].forEach(i => ($("#" + i).value = ""));
  drawCart();
}
function ordList() {
  const L = visOrders();
  $("#ordList").innerHTML = L.length
    ? L.map(o => {
        const t = totals(o.lines, o);
        return `<div class="ord"><div class="h"><span>${o.label} · ${billPlace(o.lines)}</span><span>${KES(t.g)}</span></div><div class="m">${o.no} · ${seesAllBills(user) ? slipEsc(o.waiter || "No waiter") + " · " : ""}${cnt(o.lines)} items · ${o.rounds} round${o.rounds > 1 ? "s" : ""} · sent ${hhmm(o.at)} · <b>SENT</b></div><div class="row"><button class="mini" data-oa="add" data-o="${o.no}">Add items</button><button class="mini" data-oa="bill" data-o="${o.no}">Print bill</button><button class="mini" data-oa="swap" data-o="${o.no}">Swap</button><button class="chip on" data-oa="pay" data-o="${o.no}">Charge</button></div></div>`;
      }).join("")
    : '<div class="empty">No open orders. Use Send order to start one.</div>';
}
$("#ordBtn").onclick = () => {
  ordList();
  $("#mOrd").classList.add("show");
};
$("#ordList").onclick = e => {
  const a = e.target.dataset.oa;
  if (!a) return;
  const o = orders.find(x => x.no === e.target.dataset.o);
  if (!o) return;
  $("#mOrd").classList.remove("show");
  if (a === "swap") {
    exOpen(o);
    return;
  }
  if (a === "add") {
    if (dept === ALLP) spTab = o.dept;
    else dept = o.dept;
    cur = o;
    cart = {};
    drawDepts();
    drawCats();
    drawCart();
  }
  if (a === "pay") {
    openPay([o]);
  }
  if (a === "bill") {
    showRc(
      guestBillHTML({
        no: o.no,
        dept: billPlace(o.lines),
        label: o.label,
        guest: o.guest,
        covers: o.covers,
        room: o.room,
        waiter: o.waiter,
        rider: o.rider,
        lines: slipLines(o.lines, o),
        t: totals(o.lines, o)
      }),
      o,
      "Close"
    );
  }
};

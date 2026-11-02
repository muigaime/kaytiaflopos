// ---- send order first, bill and charge later ----
let orders = [],
  cur = null,
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
// Created in Back Office → Tables. A table only identifies a bill, so any waiter can use any table.
const TBL = [
  ...["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"].map(n => ({ n, t: "Table" })),
  { n: "Takeaway", t: "Takeaway" }
];
/** The sale points a bill's items belong to. A bill can hold several in the All sale points view. */
const billPoints = c => [
  ...new Set(
    Object.keys(c)
      .map(id => (get(id) || {}).d)
      .filter(Boolean)
  )
];
const billPlace = c => billPoints(c).join(", ");
/** Where a bill is from. An empty one has no items to tell, so it's where it was opened. */
const billWhere = o => billPlace(o.lines) || o.dept;
// A bill opened with no items waits 5 minutes to be used, then closes by itself.
const EMPTY_LIFE = 5 * 60e3;
const emptyMsLeft = o => Math.max(0, EMPTY_LIFE - (Date.now() - new Date(o.at)));
const emptyText = o => `${Math.ceil(emptyMsLeft(o) / 60e3)} min left`;
/** A note beside a bill number: time left on an empty bill, or who sent it over. */
const emptyTag = o =>
  Object.keys(o.lines).length
    ? `${o.handedTo ? ` · From ${slipEsc(o.waiter)}` : ""}${(o.money || []).length ? " · Payment details" : ""}${(o.ex || []).length ? " · Swapped" : ""}`
    : ` · <span class="bill-exp" data-exp="${slipEsc(o.no)}">${emptyText(o)}</span>`;
function billsExpire() {
  const busy = o =>
      o === cur ||
      (typeof tr !== "undefined" &&
        tr &&
        $("#mBopt").classList.contains("show") &&
        tr.target === o.no),
    gone = orders.filter(o => !Object.keys(o.lines).length && !emptyMsLeft(o) && !busy(o));
  document.querySelectorAll("[data-exp]").forEach(el => {
    const o = orders.find(x => x.no === el.dataset.exp);
    if (o) el.textContent = emptyText(o);
  });
  if (!gone.length) return;
  gone.forEach(o => {
    orders.splice(orders.indexOf(o), 1);
    selSet.delete(o.no);
    billNoBack(o.no);
    orderNoBack(o.waiter, o.ord, o.at);
    BILLLOG.push({
      at: new Date().toISOString(),
      act: "Expired",
      no: o.no,
      label: o.label,
      dept: o.dept,
      waiter: o.waiter,
      by: "System",
      user: o.waiter,
      why: "Not used for 5 minutes",
      detail: "Empty bill closed · number used again",
      amt: 0,
      points: [o.dept]
    });
    if (user && o.waiter === user.n) fsNote(`Empty bill ${o.no} (${o.label}) expired.`);
  });
  ordersKeep();
  drawCart();
  if ($("#mSel").classList.contains("show")) selRender();
  if ($("#mOrd").classList.contains("show")) ordList();
}
setInterval(billsExpire, 15e3);
const billAtPoints = (o, pts) =>
  pts.includes(o.dept) || billPoints(o.lines).some(d => pts.includes(d));
/** A waiter works on their own bills. These roles see every waiter's bills at their sale points. */
const BILL_ALL = ["Manager", "Super Cashier", "Cashier"];
const seesAllBills = u => !!u && (BILL_ALL.includes(u.role) || !!(u.perm && u.perm.allBills));
const billsFor = (u, pts) =>
  orders.filter(
    o =>
      (u && o.waiter === u.n && !o.handedTo) ||
      (u && o.handedTo === u.n) ||
      (seesAllBills(u) && (u.allSP || billAtPoints(o, pts)))
  );
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
function tblFill() {
  $("#tblL").innerHTML = TBL.map(t => `<option value="${slipEsc(t.n)}">`).join("");
}
function drawTbl() {
  const chips = type =>
    TBL.filter(t => t.t === type)
      .map(
        t =>
          `<button class="chip ${t.n === selTbl ? "on" : ""}" data-t="${slipEsc(t.n)}">${slipEsc(t.n)}</button>`
      )
      .join("");
  $("#tbls").innerHTML = chips("Table") + chips("Takeaway");
  tblFill();
}
$("#tbls").onclick = e => {
  const t = e.target.dataset.t;
  if (!t) return;
  selTbl = t;
  $("#lbl").value = t;
  drawTbl();
};
$("#sendBtn").onclick = () => {
  if (!Object.keys(cart).length && (cur || !draft)) return;
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
// Auto logout: the waiter sees what was sent, and closing that signs them out.
let logoutAfterRc = false;
document.addEventListener("click", () => {
  if (logoutAfterRc && !$("#mRc").classList.contains("show")) {
    logoutAfterRc = false;
    $("#lock").click();
  }
});
// A PIN box for anything a Manager or Super Cashier has to agree to, from the POS or Back Office.
const PIN_REPRINT =
  "A Manager or Super Cashier has to authorize this. The bill will show it was reprinted.";
let pinGo = null,
  pinFails = 0,
  pinLock = 0;
function pinAsk(title, note, go) {
  pinGo = go;
  $("#rpT").textContent = title;
  $("#rpNote").textContent = note;
  $("#rpPin").value = "";
  $("#rpMsg").textContent = "";
  $("#mRp").classList.add("show");
  $("#rpPin").focus();
}
function pinAuth() {
  const m = $("#rpMsg");
  if (Date.now() < pinLock) return (m.textContent = "Too many tries. Wait 30 seconds.");
  const a = USERS.find(x => BILL_AUTH.includes(x.role) && x.pin === $("#rpPin").value);
  $("#rpPin").value = "";
  if (!a) {
    if (++pinFails >= 3) {
      pinFails = 0;
      pinLock = Date.now() + 30000;
    }
    return (m.textContent = "A Manager or Super Cashier PIN is needed.");
  }
  pinFails = 0;
  $("#mRp").classList.remove("show");
  pinGo(a.n);
}
$("#rpGo").onclick = pinAuth;
$("#rpPin").onkeydown = e => {
  e.stopPropagation();
  if (e.key === "Enter") pinAuth();
};
/** A guest bill is going out. The first print is free; after that it's a counted, logged reprint. */
function billMark(o, by, who, lines = o.lines) {
  if (o.printed) {
    o.billCopies = (o.billCopies || 0) + 1;
    BILLLOG.push({
      at: new Date().toISOString(),
      bd: bizDate(),
      act: "Reprint",
      no: o.no,
      label: o.label || $("#fTable").value,
      dept: billPlace(lines) || o.dept,
      waiter: o.waiter || who,
      by,
      user: who,
      why: "",
      detail: `Guest bill, copy ${o.billCopies}`,
      amt: 0,
      points: billPoints(lines)
    });
  }
  o.printed = true;
}
function doSend(label) {
  if (!shiftOk()) return $("#mSend").classList.remove("show");
  let tickets = [];
  const round = { ...cart };
  // Only Add items on a chosen bill adds to it. Anything else is a new bill, whatever its table.
  let o = cur;
  const stop = !o
    ? newBillBlock()
    : o.printed && posOpt("stopPrinted") && !can("addPrinted")
      ? `${o.label} has been printed. You don't have the right to add to it.`
      : "";
  if (stop) {
    $("#mSend").classList.remove("show");
    return fsNote(stop);
  }
  const noItems = !Object.keys(round).length;
  if (!o) {
    o = {
      ...draftTake(),
      label,
      dept: dept === ALLP ? billPoints(round)[0] || shownPoint() : dept,
      lines: {},
      rounds: 0,
      at: new Date(),
      bd: bizDate(),
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
  if (noItems) {
    cart = {};
    cur = null;
    $("#mSend").classList.remove("show");
    ["fTable", "fGuest", "fCov", "fRoom"].forEach(i => ($("#" + i).value = ""));
    drawCart();
    ordersKeep();
    return fsNote(`Bill ${o.no} opened for ${o.label}.`);
  }
  for (const [id, q] of Object.entries(round)) {
    o.lines[id] = (o.lines[id] || 0) + q;
    itemStockMove(get(id), q);
  }
  o.rounds++;
  // Swaps made before sending go on this order's stamp, and into the report, now that it's a bill.
  const swaps = cartSwaps.filter(x => round[x.toId]);
  swaps.forEach(x => {
    swapLog(o, x);
    (o.ex = o.ex || []).push({
      at: new Date(),
      by: x.user,
      from: x.from,
      to: x.to,
      q: x.q,
      reason: x.reason,
      authBy: x.by
    });
  });
  cartSwaps = [];
  const both = posOpt("orderAndBill") && can("printGuest") && Object.keys(o.lines).length > 0;
  if (both) o.printed = true;
  cart = {};
  cur = null;
  $("#mSend").classList.remove("show");
  drawCart();
  showRc(
    (tickets = orderTickets(round, {
      no: o.no,
      ord: o.ord,
      dept: billPlace(o.lines),
      label: o.label,
      guest: o.guest,
      covers: o.covers,
      room: o.room,
      waiter: user ? user.n : o.waiter,
      rider: o.rider,
      round: o.rounds,
      note: kmsg,
      adj: o,
      swaps
    }))
      .map(x => x.html)
      .join("") +
      (both ? billSlip(o) : "") +
      '<div class="sl-scr" id="rcPrinted"></div><div class="sl-scr">Sent. Bill and charge later from Open orders.</div>',
    null,
    "Close"
  );
  printOrderTickets(tickets).then(() => both && printSlips("GUEST BILL", true));
  logoutAfterRc = posOpt("autoLogout");
  kmsg = "";
  rider = null;
  ["fTable", "fGuest", "fCov", "fRoom"].forEach(i => ($("#" + i).value = ""));
  drawCart();
}
/** The guest bill for an open bill, in as many copies as this waiter prints. */
const billSlip = o =>
  waiterCopies(
    guestBillHTML({
      pt: billPoints(o.lines)[0],
      reprint: o.billCopies,
      no: o.no,
      ord: o.ord,
      dept: billPlace(o.lines),
      label: o.label,
      guest: o.guest,
      covers: o.covers,
      room: o.room,
      waiter: o.waiter,
      rider: o.rider,
      lines: slipLines(o.lines, o),
      t: totals(o.lines, o)
    })
  );
function ordList() {
  const L = visOrders();
  $("#ordList").innerHTML = L.length
    ? L.map(o => {
        const t = totals(o.lines, o);
        return `<div class="ord ${o.printed ? "printed" : ""} ${o.billCopies ? "rep" : ""}"><div class="h"><span>${o.label} · ${billWhere(o)}</span><span>${KES(t.g)}</span></div><div class="m">Bill ${o.no} · Order ${o.ord}${emptyTag(o)} · ${seesAllBills(user) ? slipEsc(o.waiter || "No waiter") + " · " : ""}${cnt(o.lines)} items · ${o.rounds} round${o.rounds > 1 ? "s" : ""} · sent ${hhmm(o.at)} · <b>${o.billCopies ? "REPRINTED" : o.printed ? "PRINTED" : "SENT"}</b></div><div class="row"><button class="mini" data-oa="add" data-o="${o.no}">Add items</button><button class="mini" data-oa="bill" data-o="${o.no}">Print bill</button>${can("swap") ? `<button class="mini" data-oa="swap" data-o="${o.no}">Swap</button>` : ""}<button class="chip on" data-oa="pay" data-o="${o.no}">Charge</button></div></div>`;
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
  if (a === "add" && !canAddTo(o))
    return fsNote(`You don't have the right to add to ${o.waiter}'s bills.`);
  if (a === "add" && o.printed && posOpt("stopPrinted") && !can("addPrinted"))
    return fsNote(`${o.label} has been printed. You don't have the right to add to it.`);
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
    if (!can("printGuest")) return fsNote("You don't have the right to print guest bills.");
    const print = by => {
      billMark(o, by, user.n);
      ordersKeep();
      // Select stays open behind the bill, so its colour changes straight away.
      if ($("#mSel").classList.contains("show")) selRender();
      showRc(billSlip(o), o, "Close");
      printSlips("GUEST BILL");
    };
    if (o.printed && !BILL_AUTH.includes(user.role))
      return pinAsk("Reprint bill " + o.no, PIN_REPRINT, print);
    print(user.n);
  }
};

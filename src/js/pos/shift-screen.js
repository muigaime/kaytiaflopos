// ---- POS shift management screen ----
let shView = "main",
  shOpt = { thermal: false, auto: true },
  shDone = null,
  shLast = "",
  shAct = "";
const SI = {
  refresh: '<path d="M20 12a8 8 0 11-3-6.2M20 4v5h-5"/>',
  close: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  day: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4"/>',
  sum: '<path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6"/>',
  rep: '<path d="M3 4h3l2 11h10l2-8H7M9 20h.01M17 20h.01"/>',
  pay: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M16 13h2M3 11h18"/>',
  exit: '<path d="M6 6l12 12M18 6L6 18"/>'
};
const rb = (a, ic, l, c) =>
  `<button class="rb ${c || ""}" data-sa="${a}"><svg viewBox="0 0 24 24">${SI[ic]}</svg>${l}</button>`;
function posAccess() {
  document.body.classList.toggle("mgr", !!(user && user.role === "Manager"));
}
function shiftBadge() {
  const b = $("#shiftBtn"),
    sh = user && shiftOf(user.n);
  b.textContent = !curDay() ? "Day closed" : sh ? "● Shift open" : "Start shift";
  const ld = $("#ldate");
  if (ld)
    ld.textContent = onBizDate(bizDate()).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  b.style.background = sh ? "#12804a" : "";
  b.style.color = sh ? "#fff" : "";
}
function shiftOk() {
  if (!user) return true;
  if (!curDay()) {
    shiftOpen("The business day has not been started.");
    return false;
  }
  if (!shiftOf(user.n)) {
    shiftOpen("Start your shift before taking payments.");
    return false;
  }
  return true;
}
function shiftOpen(msg) {
  shView = "main";
  shDone = null;
  shAct = "";
  shDraw(msg);
  $("#shMgr").classList.add("show");
}
function shDraw(msg) {
  // Shift Management is for whoever counts a till. A waiter has My shift.
  if (user && user.role === "Waiter") return msDraw(msg);
  const d = curDay(),
    sh = user && shiftOf(user.n);
  let h = `<div class="shm"><div class="shm-top"><h2>Shift Management</h2><button class="mini" data-sa="exit">Exit</button></div>${msg ? `<div class="status">${msg}</div>` : ""}`;
  if (shDone) h += shDone;
  else if (!d)
    h += `<div class="shc"><h4>Business day</h4><div class="status bad">The day has not been started.</div>${canDay() ? `<div class="stk">The new business date will be <b>${dateGB(nextBizDate())}</b>.</div><button class="chip on" data-sa="dstart">Start new day</button>` : `<div class="stk">Back Office or a cashier with the right has to start the new day. Your shift can start after that.</div>`}</div>`;
  else if (!user)
    h += `<div class="shc"><div class="status ok">Day open since ${hm(d.openedAt)}</div><div class="stk">Sign in as a cashier to manage a shift.</div></div>`;
  else if (!sh && shiftHeld()) h += shiftHeldHTML();
  else if (!sh)
    h += `<div class="shc"><h4>Start your shift</h4><div class="status ok">Business date ${dateGB(dayDate(d))} · started by ${hx(d.openedBy)}</div>${bizLateNote()}<div class="shf"><span>Cashier</span><input readonly value="${hx(user.n)}"><span>Opening float (KES)</span><input id="shFloat" type="number" inputmode="decimal" placeholder="0.00"></div><button class="chip on" data-sa="sstart">Start my shift</button><div class="stk">${openShifts().length} shift(s) open today.</div>${canDay() ? `<button class="mini" data-sa="dend">End day</button>` : ""}</div>`;
  else if (shView === "summary")
    h += `<div class="shc"><h4>Shift summary</h4>${shiftReport(sh, parseFloat(shAct), user.n)}<div class="row"><button class="mini" data-sa="back">← Back</button><button class="chip on" data-sa="printnow">Print summary</button></div></div>`;
  else if (shView === "bills") {
    const c = shiftCalc(sh);
    h += `<div class="shc"><h4>Sales report · this shift</h4><div style="overflow:auto"><table class="sht"><tr><th>Time</th><th>Bill</th><th>Sale point</th><th class="n">Total</th></tr>${
      c.sales.length
        ? c.sales
            .slice()
            .reverse()
            .map(
              x =>
                `<tr><td>${hm(x.at)}</td><td>${x.no}</td><td>${x.dept}</td><td class="n">${R2(x.g)}</td></tr>`
            )
            .join("") +
          `<tr class="tt"><td colspan="3">Total · ${c.bills} bills</td><td class="n">${R2(c.gross)}</td></tr>`
        : '<tr><td colspan="4" class="stk">No sales yet in this shift.</td></tr>'
    }</table></div><button class="mini" data-sa="back">← Back</button></div>`;
  } else {
    const c = shiftCalc(sh),
      pays = pOf(sh),
      ac = parseFloat(shAct),
      pend = orders.reduce((a, o) => a + totals(o.lines, o).g, 0);
    h += `<div class="shm-rib">${rb("refresh", "refresh", "Refresh shift data")}${rb("close", "close", "Close shift")}${canDay() ? rb("closeday", "day", "Close shift and day", "st") : ""}${rb("summary", "sum", "Shift summary")}${rb("salesrep", "rep", "Sales report")}${rb("payout", "pay", "Cash payout")}</div>
  <div class="shm-grid"><div style="display:grid;gap:14px;min-width:0"><div class="shc"><div class="shf"><span>Shift no</span><input readonly value="${sh.id}"><span>Shift date</span><input readonly value="${new Date(sh.openedAt).toLocaleDateString("en-GB")}"><span>Shift time</span><input readonly value="${hm(sh.openedAt)}"><span>Cashier name</span><input readonly value="${hx(sh.user)}"></div></div>
  <div class="shc"><h4>Payments received</h4><table class="sht"><tr><th>Paymode</th><th>Currency</th><th class="n">Amount</th></tr><tr><td>CASH</td><td>KSH</td><td class="n">${R2(c.cash)}</td></tr><tr><td>M-PESA</td><td>KSH</td><td class="n">${R2(c.mpesa)}</td></tr><tr><td>PDQ</td><td>KSH</td><td class="n">${R2(c.pdq)}</td></tr><tr><td>COMPLIMENTARY</td><td>KSH</td><td class="n">${R2(c.comp)}</td></tr><tr><td>ROOM</td><td>KSH</td><td class="n">${R2(c.room)}</td></tr><tr><td>CREDIT</td><td>KSH</td><td class="n">${R2(c.credit)}</td></tr><tr class="tt"><td colspan="2">Total</td><td class="n">${R2(c.cash + c.mpesa + c.pdq + c.comp + c.room + c.credit)}</td></tr></table></div>
  <div class="shc" id="poBox"><h4>Cash payouts (expenses) this shift</h4><div class="shp"><select id="poCat"><option>Supplies</option><option>Transport</option><option>Cleaning</option><option>Staff meal</option><option>Repairs</option><option>Other</option></select><input id="poDesc" placeholder="Description" autocomplete="off"><input id="poAmt" type="number" inputmode="decimal" placeholder="Amount"><button class="chip on" data-sa="padd">Add payout</button></div>${pays.length ? `<table class="sht"><tr><th>Time</th><th>Category</th><th>Description</th><th class="n">Amount</th><th></th></tr>${pays.map(x => `<tr><td>${hm(x.at)}</td><td>${hx(x.cat)}</td><td>${hx(x.desc)}</td><td class="n">${R2(x.amt)}</td><td><button class="mini" data-sa="pdel" data-id="${x.id}">✕</button></td></tr>`).join("")}<tr class="tt"><td colspan="3">Total paid out</td><td class="n">${R2(c.paid)}</td><td></td></tr></table>` : '<div class="stk">No payouts yet. Cash taken from the till for expenses is recorded here and deducted from expected cash.</div>'}</div></div>
  <div style="display:grid;gap:14px;min-width:0"><div class="shc"><div class="shf"><span>Total sales</span><input readonly value="${R2(c.gross)}"><span>Cash sales</span><input readonly value="${R2(c.cash)}"><span>Cash paid out</span><input readonly value="${R2(c.paid)}"><span>Opening float</span><input readonly value="${R2(sh.float)}"><span>Expected cash in till</span><input readonly value="${R2(c.expected)}"><span>Actual cash in till</span><input id="shAct" type="number" inputmode="decimal" placeholder="Count the drawer" value="${shAct}"><span>Cash variance</span><input id="shVar" readonly value="${ac >= 0 ? sg(ac - c.expected) : ""}"><label class="ck"><input type="checkbox" id="shTh" ${shOpt.thermal ? "checked" : ""}> Thermal (narrow) report</label><label class="ck"><input type="checkbox" id="shAuto" ${shOpt.auto ? "checked" : ""}> Auto print reports on closing</label><span>Pending total</span><input readonly value="${R2(pend)}"></div></div>
  <div class="shc"><div class="shf"><span>Gross sales</span><input readonly value="${R2(c.gross)}"><span>Taxes</span><input readonly value="${R2(c.tax)}"><span>Net sales</span><input readonly value="${R2(c.gross - c.tax)}"></div></div></div></div>`;
  }
  h += `</div>`;
  $("#shMgr").innerHTML = h;
}
/** Bills still pending, and Back Office hasn't agreed to this shift yet. */
function shiftHeld() {
  const x = shiftAuthOf(user.n);
  return pendingOf(user.n).length > 0 && !(x && x.status === "ok");
}
/** The clock has moved on but the day hasn't been ended. */
function bizLateNote() {
  const today = ymdOf(new Date());
  return bizDate() < today
    ? `<div class="status bad">The system date is ${dateGB(bizDate())}, and today is ${dateGB(today)}. End the day and start a new one to change it.</div>`
    : "";
}
function shiftHeldHTML() {
  const P = pendingOf(user.n),
    x = shiftAuthOf(user.n),
    amt = P.reduce((a, o) => a + totals(o.lines, o).g, 0),
    state =
      x && x.status === "wait"
        ? `<div class="status">Waiting for Back Office to authorise your shift.</div><button class="mini" data-sa="refresh">Check again</button>`
        : `${x && x.status === "no" ? `<div class="status bad">${hx(x.by)} declined your request. Clear the bills, or ask again.</div>` : ""}<button class="chip on" data-sa="sreq">Ask Back Office to authorise</button>`;
  return `<div class="shc"><h4>Start your shift</h4><div class="status bad">You have ${P.length} pending bill${P.length === 1 ? "" : "s"} · KES ${R2(amt)}</div><div class="stk">Back Office has to authorise your shift before you can start.</div><div style="overflow:auto"><table class="sht"><tr><th>Bill</th><th>Table</th><th class="n">Total</th></tr>${P.map(o => `<tr><td>${hx(o.no)}</td><td>${hx(o.label)}</td><td class="n">${R2(totals(o.lines, o).g)}</td></tr>`).join("")}</table></div>${state}</div>`;
}
function shClose(withDay) {
  if (withDay && !canDay()) return shDraw("You don't have the right to end the day.");
  const sh = shiftOf(user.n),
    act = parseFloat($("#shAct").value);
  if (!(act >= 0)) return shDraw("Enter the actual cash counted in the till before closing.");
  if (withDay) {
    const o = openShifts().filter(x => x !== sh);
    if (o.length)
      return shDraw(
        "Other shifts are still open: " + o.map(x => x.user).join(", ") + ". Close them first."
      );
  }
  let r = shiftEnd(sh, act, user.n);
  if (r) return shDraw(r);
  const rep = shiftReport(sh, 0, user.n);
  let dr = "";
  if (withDay) {
    r = dayEnd(user.n);
    if (r) return shDraw(r);
    dr = dayReport(DAYS[DAYS.length - 1], user.n);
  }
  shLast = rep + (dr ? '<div style="page-break-before:always"></div>' + dr : "");
  shDone = `<div class="shc"><div class="status ${sh.variance < 0 ? "bad" : "ok"}">Shift closed${withDay ? " and day ended" : ""} · Cash variance ${sg(sh.variance)}</div><div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${rep}${dr}</div><div class="row"><button class="mini" data-sa="printnow">Print summary</button><button class="chip on" data-sa="out">Sign out</button></div></div>`;
  shDraw();
  shiftBadge();
  if (shOpt.auto) setTimeout(() => printHTML(shLast, shOpt.thermal), 250);
}
$("#shMgr").onclick = e => {
  const b = e.target.closest("[data-sa]");
  if (!b) return;
  const a = b.dataset.sa,
    by = user ? user.n : "POS";
  if (a === "exit") {
    $("#shMgr").classList.remove("show");
    return shiftBadge();
  }
  if (a === "refresh") return shDraw();
  if (a.startsWith("ms_")) return msAct(a, b);
  if (a === "back") {
    shView = "main";
    return shDraw();
  }
  if (a === "summary" || a === "salesrep") {
    shAct = $("#shAct") ? $("#shAct").value : shAct;
    shView = a === "summary" ? "summary" : "bills";
    return shDraw();
  }
  if (a === "payout") {
    const i = $("#poDesc");
    if (i) {
      i.scrollIntoView({ behavior: "smooth", block: "center" });
      i.focus();
    }
    return;
  }
  if (a === "padd") {
    shAct = $("#shAct").value;
    const r = addPayout(
      shiftOf(user.n),
      $("#poCat").value,
      $("#poDesc").value.trim(),
      parseFloat($("#poAmt").value),
      by
    );
    return shDraw(r);
  }
  if (a === "pdel") {
    shAct = $("#shAct").value;
    delPayout(b.dataset.id);
    return shDraw();
  }
  if (a === "dstart") {
    if (!canDay()) return shDraw("You don't have the right to start the day.");
    const r = dayStart(by);
    shiftBadge();
    drawCart();
    return shDraw(r || `New day started. The business date is ${dateGB(bizDate())}.`);
  }
  if (a === "sreq") {
    shiftAuthAsk(user.n);
    return shDraw("Your request has gone to Back Office.");
  }
  if (a === "sstart") {
    if (shiftHeld()) return shDraw();
    const r = shiftStart(user.n, parseFloat($("#shFloat").value), by);
    if (r) return shDraw(r);
    shiftBadge();
    return shDraw("Shift started. Good selling!");
  }
  if (a === "close") return shClose(false);
  if (a === "closeday") return shClose(true);
  if (a === "dend") {
    if (!canDay()) return shDraw("You don't have the right to end the day.");
    const r = dayEnd(by);
    if (r) return shDraw(r);
    const d = DAYS[DAYS.length - 1];
    shLast = dayReport(d, by);
    shDone = `<div class="shc"><div class="status ok">Day ended at ${hm(d.closedAt)}</div>${shLast}<div class="row"><button class="mini" data-sa="printnow">Print summary</button><button class="chip on" data-sa="exit">Done</button></div></div>`;
    shDraw();
    if (shOpt.auto) setTimeout(() => printHTML(shLast, shOpt.thermal), 250);
    return;
  }
  if (a === "printnow") {
    if (shView === "summary" && !shDone)
      return printHTML(shiftReport(shiftOf(user.n), parseFloat(shAct), user.n), shOpt.thermal);
    return printHTML(shLast, shOpt.thermal);
  }
  if (a === "out" && $("#fd").classList.contains("show")) return fdLogout();
  if (a === "out") {
    user = null;
    cart = {};
    pin = "";
    pdraw();
    $("#shMgr").classList.remove("show");
    $("#fd").classList.remove("show");
    shDone = null;
    $("#login").style.display = "";
    shiftBadge();
  }
};
$("#shMgr").oninput = e => {
  if (e.target.id === "shAct") {
    shAct = e.target.value;
    const sh = shiftOf(user.n),
      v = parseFloat(shAct);
    $("#shVar").value = v >= 0 ? sg(v - shiftCalc(sh).expected) : "";
  }
};
$("#shMgr").onchange = e => {
  if (e.target.id === "shTh") shOpt.thermal = e.target.checked;
  if (e.target.id === "shAuto") shOpt.auto = e.target.checked;
};
$("#shiftBtn").onclick = () => shiftOpen();
setInterval(shiftBadge, 3000);
shiftBadge();
setInterval(posAccess, 500);
posAccess();

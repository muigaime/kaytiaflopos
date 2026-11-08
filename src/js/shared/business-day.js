// ---- business day, shifts, payouts and printable summaries (shared by POS and Back Office) ----
const DAYS = [],
  SHIFTS = [],
  PAYOUTS = [],
  hm = d => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  dm = d => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const curDay = () => DAYS.find(d => !d.closedAt),
  openShifts = () => SHIFTS.filter(s => !s.closedAt),
  shiftOf = n => SHIFTS.find(s => !s.closedAt && s.user === n),
  pOf = sh => PAYOUTS.filter(p => p.shift === sh.id);
// The system's date. It belongs to the business day, so it only moves when a day is ended and the next one started.
const ymdOf = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const dayDate = d => d.date || ymdOf(d.openedAt);
function bizDate() {
  const d = curDay() || DAYS[DAYS.length - 1];
  return d ? dayDate(d) : ymdOf(new Date());
}
/** The date a new day takes: the day after the last one, or today if that's later. */
// The system day runs on a set window, 06:00 to 06:00 unless Settings says otherwise.
const dayTimes = () => ({ start: "06:00", end: "06:00", ...(FD_SETTINGS.dayTime || {}) });
const atTime = (from, hhmm) => {
  const [h, m] = hhmm.split(":").map(Number),
    d = new Date(from);
  d.setHours(h, m, 0, 0);
  return d;
};
/** When a day's window closes: the end time that goes with its date, leaving it at least an hour. */
function dayEnds(d) {
  const open = new Date(d.openedAt),
    T = dayTimes();
  let end = atTime(open, T.end);
  if (d.date) {
    const [y, m, n] = d.date.split("-").map(Number);
    end = atTime(new Date(y, m - 1, n), T.end);
    if (T.end <= T.start) end.setDate(end.getDate() + 1);
  }
  while (end - open < 36e5) end.setDate(end.getDate() + 1);
  return end;
}
/** The window has closed and nobody has started the next day yet. */
const dayOver = () => !!curDay() && Date.now() >= dayEnds(curDay());
const dayEndText = d => `${dm(dayEnds(d))} ${hm(dayEnds(d))}`;
/** Every bill with something on it, whoever it's with. */
const pendingAll = () => orders.filter(o => Object.keys(o.lines).length);
/** Why the day can't end yet, or nothing. Ending it before its own date would push the date ahead of the clock. */
function dayEndStop() {
  const d = curDay();
  if (d && dayDate(d) > clockDate())
    return `This day is dated ${dateGB(dayDate(d))}, so it can't be ended until ${dayTimes().start} on that date.`;
  const P = pendingAll(),
    one = P.length === 1;
  return P.length
    ? `${one ? "1 bill is" : P.length + " bills are"} still pending: ${P.map(o => o.no).join(", ")}. Clear ${one ? "it" : "them"}, or post ${one ? "it" : "them"} to an account or a room, before ending the day.`
    : "";
}
/** The date the clock says it is. Before the day's start time it's still the night of the day before. */
function clockDate() {
  const now = new Date();
  return ymdOf(now < atTime(now, dayTimes().start) ? new Date(now.getTime() - 864e5) : now);
}
function nextBizDate() {
  const today = clockDate(),
    last = DAYS[DAYS.length - 1];
  if (!last) return today;
  const [y, m, n] = dayDate(last).split("-").map(Number),
    next = ymdOf(new Date(y, m - 1, n + 1));
  return next > today ? next : today;
}
/** The business date a moment belongs to: the day that was open then. Before any day, the clock's date. */
function bizDateOf(at) {
  const t = new Date(at).getTime(),
    d = DAYS.find(
      x =>
        new Date(x.openedAt).getTime() <= t && (!x.closedAt || t <= new Date(x.closedAt).getTime())
    );
  return d ? dayDate(d) : ymdOf(new Date(at));
}
const dateGB = ymd => ymd.split("-").reverse().join("/");
/** A moment shown on a business date: the date of the day, the clock's time. */
function onBizDate(ymd, at = new Date()) {
  const [y, m, n] = ymd.split("-").map(Number),
    x = new Date(at);
  return new Date(y, m - 1, n, x.getHours(), x.getMinutes(), x.getSeconds());
}
const bizNow = () => onBizDate(bizDate());
/** When a sale counts in reports. Sales from before business dates use their clock time. */
const saleAt = s => (s.bd ? new Date(s.bd + "T12:00:00") : s.at);
const saleShown = s => (s.bd ? onBizDate(s.bd, s.at) : s.at);
/** Their shift for today, opened and closed. Nobody opens a second one at the till, unless Back Office has agreed to it. */
const shiftDoneOf = n => {
  const d = curDay(),
    x = shiftAuthOf(n);
  return d && !(x && x.status === "ok")
    ? SHIFTS.filter(
        s => s.day === d.id && s.user === n && s.closedAt && s.openedBy !== "Bill clearing"
      ).pop()
    : null;
};
/** A waiter's shift opens when they sign in and closes with the day. */
const waiterShift = s => (USERS.find(u => u.n === s.user) || {}).role === "Waiter";
/** Waiters and cashiers: opening and closing the shift is their clocking in and out. */
const shiftRole = u => /waiter|cashier/i.test((u && u.role) || "");
// ---- A waiter starts their own shift. With bills still pending, Back Office has to agree first.
const shiftAuths = () => FD_SETTINGS.shiftAuth || (FD_SETTINGS.shiftAuth = []);
const shiftAuthOf = n =>
  shiftAuths()
    .filter(x => x.user === n && x.status !== "used")
    .pop();
/** Bills a waiter still answers for. Ones sent to a cashier are the cashier's to clear. */
const pendingOf = n =>
  orders.filter(o => o.waiter === n && !o.handedTo && Object.keys(o.lines).length);
function shiftAuthAsk(n) {
  const P = pendingOf(n);
  shiftAuths().push({
    id: "SA" + Date.now(),
    user: n,
    at: new Date().toISOString(),
    bills: P.map(o => o.no),
    amt: P.reduce((a, o) => a + totals(o.lines, o).g, 0),
    status: "wait"
  });
  sync();
}
function shiftAuthAnswer(id, ok, by) {
  const x = shiftAuths().find(y => y.id === id);
  if (!x || x.status !== "wait") return "That request has already been answered.";
  Object.assign(x, { status: ok ? "ok" : "no", by, byAt: new Date().toISOString() });
  sync();
  return "";
}
const shiftAuthDone = n =>
  shiftAuths()
    .filter(x => x.user === n && x.status !== "used")
    .forEach(x => (x.status = "used"));
const sPm = (a, k) => a.reduce((x, s) => x + ((s.mx || {})[k] || 0), 0),
  sSum = (a, f) => a.reduce((x, y) => x + f(y), 0),
  sync = () => {
    try {
      bosave();
    } catch (e) {}
  };
const R2 = n =>
    Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  hx = t =>
    String(t).replace(
      /[&<>"]/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    ),
  sg = n => (n > 0 ? "+" : "") + R2(n);
const shiftCalc = sh => {
  const a = SALES.filter(
      s =>
        s.user === sh.user &&
        s.at >= new Date(sh.openedAt) &&
        (!sh.closedAt || s.at <= new Date(sh.closedAt))
    ),
    cash = sPm(a, "cash"),
    paid = sSum(pOf(sh), p => p.amt);
  return {
    sales: a,
    bills: a.length,
    gross: sSum(a, s => s.g),
    tax: sSum(a, s => s.tax),
    cash,
    mpesa: sPm(a, "mpesa"),
    pdq: sPm(a, "pdq"),
    comp: sPm(a, "comp"),
    room: sPm(a, "room"),
    tips: sSum(a, s => Object.values(s.tips || {}).reduce((x, y) => x + y, 0)),
    credit: sPm(a, "credit"),
    paid,
    // Cash tips are in the drawer until they're paid out.
    expected: sh.float + cash + sSum(a, s => (s.tips || {}).cash || 0) - paid
  };
};
/** Ending the day moves straight on to the next date. */
function dayRoll(by) {
  return dayEnd(by) || dayStart(by);
}
function dayStart(by) {
  if (curDay()) return "The day is already open.";
  const date = nextBizDate();
  DAYS.push({
    id: "D" + (DAYS.length + 1),
    date,
    openedAt: new Date().toISOString(),
    openedBy: by,
    closedAt: null
  });
  sync();
  document.dispatchEvent(new Event("kf:newday"));
  return "";
}
function shiftStart(u, fl, by, clearing, again) {
  if (!curDay()) return "Start the day first.";
  if (dayOver() && !clearing)
    return "The working day has ended. Clear the bills and end the day first.";
  if (!u) return "Choose a cashier.";
  if (shiftOf(u)) return u + " already has an open shift.";
  if (!clearing && !again && shiftDoneOf(u))
    return u + " has already done a shift today. A manager can open another in Back Office.";
  if (!(fl >= 0)) return "Enter the opening cash float (0 or more).";
  SHIFTS.push({
    id: "S" + (SHIFTS.length + 1),
    day: curDay().id,
    user: u,
    float: fl,
    openedAt: new Date().toISOString(),
    openedBy: by,
    closedAt: null
  });
  shiftAuthDone(u);
  sync();
  return "";
}
function shiftEnd(sh, counted, by) {
  if (!sh) return "Shift not found.";
  if (sh.closedAt) return "This shift is already closed.";
  if (!(counted >= 0)) return "Enter the actual cash counted in the till.";
  const c = shiftCalc(sh);
  Object.assign(sh, {
    closedAt: new Date().toISOString(),
    closedBy: by,
    counted,
    expected: c.expected,
    variance: counted - c.expected,
    bills: c.bills,
    gross: c.gross,
    tax: c.tax,
    net: c.gross - c.tax,
    cash: c.cash,
    mpesa: c.mpesa,
    pdq: c.pdq,
    comp: c.comp,
    room: c.room,
    tips: c.tips,
    credit: c.credit,
    paid: c.paid
  });
  sync();
  return "";
}
function dayEnd(by) {
  const d = curDay();
  if (!d) return "No day is open.";
  const stop = dayEndStop();
  if (stop) return stop;
  const os = openShifts().filter(s => !waiterShift(s));
  if (os.length) return "End these shifts first: " + os.map(s => s.user).join(", ") + ".";
  openShifts().forEach(s => shiftEnd(s, Math.max(0, shiftCalc(s).expected), "Day end"));
  const a = SALES.filter(s => s.at >= new Date(d.openedAt));
  Object.assign(d, {
    closedAt: new Date().toISOString(),
    closedBy: by,
    bills: a.length,
    gross: sSum(a, s => s.g),
    vat: sSum(a, s => s.tax),
    cash: sPm(a, "cash"),
    mpesa: sPm(a, "mpesa"),
    pdq: sPm(a, "pdq"),
    comp: sPm(a, "comp"),
    room: sPm(a, "room"),
    tips: sSum(a, s => Object.values(s.tips || {}).reduce((x, y) => x + y, 0)),
    credit: sPm(a, "credit"),
    paid: sSum(
      PAYOUTS.filter(p => p.day === d.id),
      p => p.amt
    ),
    variance: sSum(
      SHIFTS.filter(s => s.day === d.id),
      s => s.variance || 0
    )
  });
  sync();
  document.dispatchEvent(new CustomEvent("kf:dayend", { detail: d }));
  return "";
}
function addPayout(sh, cat, desc, amt, by) {
  if (!sh || sh.closedAt) return "There is no open shift.";
  if (!desc) return "Enter a description for the payout.";
  if (!(amt > 0)) return "Enter an amount above zero.";
  PAYOUTS.push({
    id: "P" + Date.now(),
    shift: sh.id,
    day: sh.day,
    user: sh.user,
    at: new Date().toISOString(),
    cat,
    desc,
    amt,
    by
  });
  sync();
  return "";
}
function delPayout(id) {
  const i = PAYOUTS.findIndex(p => p.id === id),
    p = PAYOUTS[i];
  if (!p) return;
  const sh = SHIFTS.find(x => x.id === p.shift);
  if (sh && sh.closedAt) return;
  PAYOUTS.splice(i, 1);
  sync();
}
/** For a print window: on screen it's a sheet of A4 on a grey desk. The printer only ever sees the page's own rules. */
const a4Screen = landscape =>
  `@media screen{html{background:#5f6368;min-height:100%}body{box-sizing:border-box;width:${landscape ? "297mm" : "210mm"};min-height:${landscape ? "210mm" : "297mm"};max-width:calc(100% - 32px);margin:20px auto!important;padding:12mm!important;background:#fff;box-shadow:0 3px 14px rgba(0,0,0,.45)}}`;
function printHTML(html, th, pg) {
  const p = $("#shPrint");
  p.innerHTML = html;
  p.className = th ? "th" : "";
  let st = $("#pgStyle");
  if (!st) {
    st = document.createElement("style");
    st.id = "pgStyle";
    document.head.appendChild(st);
  }
  st.textContent = pg ? "@page{size:" + pg + ";margin:12mm}" : "";
  document.body.classList.add("pshift");
  const done = () => {
    document.body.classList.remove("pshift");
    st.textContent = "";
  };
  addEventListener("afterprint", done, { once: true });
  try {
    window.print();
  } catch (e) {
    done();
  }
}
const rr = (a, b, bd) => `<tr${bd ? ' class="bd"' : ""}><td>${a}</td><td>${b}</td></tr>`,
  rhead = t =>
    `<h2>${hx(FD_SETTINGS.name)}</h2><div class="c">${t}</div><div class="c">${new Date().toLocaleString("en-GB")}</div><hr>`;
function shiftReport(sh, act, by) {
  const c = shiftCalc(sh),
    ac = sh.closedAt ? sh.counted : act,
    vr = ac >= 0 ? ac - c.expected : null,
    pays = pOf(sh);
  return `<div class="rd">${rhead("SHIFT SUMMARY")}<table>${rr("Shift no", sh.id)}${rr("Cashier", hx(sh.user))}${rr("Opened", dm(sh.openedAt) + " " + hm(sh.openedAt))}${rr("Closed", sh.closedAt ? dm(sh.closedAt) + " " + hm(sh.closedAt) : "Still open")}</table><hr><div class="sec">PAYMODES (KSH)</div><table>${rr("CASH", R2(c.cash))}${rr("M-PESA", R2(c.mpesa))}${rr("PDQ", R2(c.pdq || 0))}${rr("Complimentary", R2(c.comp || 0))}${fdOn() || c.room ? rr("Room", R2(c.room || 0)) : ""}${rr("Tips", R2(c.tips || 0))}${rr("CREDIT", R2(c.credit))}${payExtraRows(c.sales, (n, v) => rr(hx(n), R2(v)))}${rr("TOTAL", R2(c.cash + c.mpesa + (c.pdq || 0) + (c.comp || 0) + (c.room || 0) + c.credit + payExtraSum(c.sales)), 1)}</table><hr><div class="sec">SALES</div><table>${rr("Bills", c.bills)}${rr("Gross sales", R2(c.gross))}${rr("Taxes", R2(c.tax))}${rr("Net sales", R2(c.gross - c.tax), 1)}</table><hr><div class="sec">CASH RECONCILIATION</div><table>${rr("Opening float", R2(sh.float))}${rr("+ Cash sales", R2(c.cash))}${rr("- Cash paid out", R2(c.paid))}${rr("Expected in till", R2(c.expected), 1)}${rr("Actual in till", ac >= 0 ? R2(ac) : "not counted")}${rr("Variance", vr === null ? "-" : sg(vr), 1)}</table><hr><div class="sec">CASH PAYOUTS / EXPENSES</div>${pays.length ? `<table>${pays.map(x => rr(hm(x.at) + " " + hx(x.cat) + ": " + hx(x.desc), R2(x.amt))).join("")}${rr("TOTAL PAID OUT", R2(c.paid), 1)}</table>` : "<div>None</div>"}<hr><div class="c">Printed by ${hx(by || sh.user)}</div></div>`;
}
/** Items sold in each department, added up, with what paid for them. Returns take their quantities back off. */
function daySalesHTML(a) {
  const PM = [
    ["cash", "CASH"],
    ["mpesa", "M-PESA"],
    ["pdq", "PDQ"],
    ["comp", "Complimentary"],
    ["room", "Room"],
    ["credit", "CREDIT"],
    ...payCustoms().map(c => [c.k, c.n.toUpperCase()])
  ];
  return [...new Set(a.map(s => s.dept))]
    .sort()
    .map(dept => {
      const S = a.filter(s => s.dept === dept),
        items = {};
      S.forEach(s =>
        (s.lines || []).forEach(l => {
          const x = items[l.n] || (items[l.n] = { q: 0, amt: 0 });
          x.q += l.q;
          x.amt += l.q * l.p;
        })
      );
      const L = Object.entries(items)
          .filter(([, x]) => x.q || x.amt)
          .sort((p, q) => p[0].localeCompare(q[0])),
        total = sSum(S, s => s.g),
        off = sSum(L, ([, x]) => x.amt) - total,
        pays = PM.filter(([k]) => Math.abs(sPm(S, k)) > 0.004);
      return `<div class="sec">${hx(dept).toUpperCase()}</div><table><tr class="bd"><td>Item</td><td class="n">Qty</td><td>KES</td></tr>${L.map(([n, x]) => `<tr><td>${hx(n)}</td><td class="n">${+x.q.toFixed(3)}</td><td>${R2(x.amt)}</td></tr>`).join("")}</table><table>${Math.abs(off) > 0.004 ? rr("Discounts", R2(-off)) : ""}${rr("Department total", R2(total), 1)}${pays.map(([k, t]) => rr(t, R2(sPm(S, k)))).join("")}</table><hr>`;
    })
    .join("");
}
function dayReport(d, by) {
  const sh = SHIFTS.filter(x => x.day === d.id),
    pays = PAYOUTS.filter(p => p.day === d.id),
    a = SALES.filter(
      s => s.at >= new Date(d.openedAt) && (!d.closedAt || s.at <= new Date(d.closedAt))
    ),
    paid = sSum(pays, p => p.amt);
  return `<div class="rd">${rhead("END OF DAY SUMMARY")}<table>${rr("Day", d.id)}${rr("Business date", dateGB(dayDate(d)))}${rr("Opened", dm(d.openedAt) + " " + hm(d.openedAt) + " by " + hx(d.openedBy))}${rr("Closed", d.closedAt ? dm(d.closedAt) + " " + hm(d.closedAt) + " by " + hx(d.closedBy) : "Still open")}</table><hr><div class="sec">SALES</div><table>${rr("Bills", a.length)}${rr("Gross sales", R2(sSum(a, s => s.g)))}${rr("Taxes", R2(sSum(a, s => s.tax)))}${rr("Net sales", R2(sSum(a, s => s.g - s.tax)), 1)}</table><hr><div class="sec">PAYMODES (KSH)</div><table>${rr("CASH", R2(sPm(a, "cash")))}${rr("M-PESA", R2(sPm(a, "mpesa")))}${rr("PDQ", R2(sPm(a, "pdq")))}${rr("Complimentary", R2(sPm(a, "comp")))}${fdOn() || sPm(a, "room") ? rr("Room", R2(sPm(a, "room"))) : ""}${rr("Tips", R2(sSum(a, s => Object.values(s.tips || {}).reduce((x, y) => x + y, 0))))}${rr("CREDIT", R2(sPm(a, "credit")))}${payExtraRows(a, (n, v) => rr(hx(n), R2(v)))}</table><hr><div class="sec">SALES BY DEPARTMENT</div><hr>${daySalesHTML(a)}<div class="sec">SHIFTS</div>${sh.length ? `<table>${sh.map(x => rr(hx(x.user) + " " + hm(x.openedAt) + "-" + (x.closedAt ? hm(x.closedAt) : "open"), x.closedAt ? "var " + sg(x.variance) : "open")).join("")}</table>` : "<div>None</div>"}<hr><div class="sec">CASH PAYOUTS / EXPENSES</div>${pays.length ? `<table>${pays.map(x => rr(hx(x.cat) + ": " + hx(x.desc) + " (" + hx(x.user) + ")", R2(x.amt))).join("")}${rr("TOTAL PAID OUT", R2(paid), 1)}</table>` : "<div>None</div>"}<hr><table>${rr("Total cash variance", sg(sSum(sh, x => x.variance || 0)), 1)}</table><hr><div class="c">Printed by ${hx(by || d.closedBy || d.openedBy)}</div></div>`;
}

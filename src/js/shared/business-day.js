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
    credit: sPm(a, "credit"),
    paid,
    expected: sh.float + cash - paid
  };
};
function dayStart(by) {
  if (curDay()) return "The day is already open.";
  DAYS.push({
    id: "D" + (DAYS.length + 1),
    openedAt: new Date().toISOString(),
    openedBy: by,
    closedAt: null
  });
  sync();
  return "";
}
function shiftStart(u, fl, by) {
  if (!curDay()) return "Start the day first.";
  if (!u) return "Choose a cashier.";
  if (shiftOf(u)) return u + " already has an open shift.";
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
  sync();
  return "";
}
function shiftEnd(sh, counted, by) {
  if (!sh) return "Shift not found.";
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
    credit: c.credit,
    paid: c.paid
  });
  sync();
  return "";
}
function dayEnd(by) {
  const d = curDay();
  if (!d) return "No day is open.";
  const os = openShifts();
  if (os.length) return "End these shifts first: " + os.map(s => s.user).join(", ") + ".";
  const a = SALES.filter(s => s.at >= new Date(d.openedAt));
  Object.assign(d, {
    closedAt: new Date().toISOString(),
    closedBy: by,
    bills: a.length,
    gross: sSum(a, s => s.g),
    vat: sSum(a, s => s.tax),
    cash: sPm(a, "cash"),
    mpesa: sPm(a, "mpesa"),
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
    `<h2>MWANGAZA SUPERMART</h2><div class="c">${t}</div><div class="c">${new Date().toLocaleString("en-GB")}</div><hr>`;
function shiftReport(sh, act, by) {
  const c = shiftCalc(sh),
    ac = sh.closedAt ? sh.counted : act,
    vr = ac >= 0 ? ac - c.expected : null,
    pays = pOf(sh);
  return `<div class="rd">${rhead("SHIFT SUMMARY")}<table>${rr("Shift no", sh.id)}${rr("Cashier", hx(sh.user))}${rr("Opened", dm(sh.openedAt) + " " + hm(sh.openedAt))}${rr("Closed", sh.closedAt ? dm(sh.closedAt) + " " + hm(sh.closedAt) : "Still open")}</table><hr><div class="sec">PAYMODES (KSH)</div><table>${rr("CASH", R2(c.cash))}${rr("M-PESA", R2(c.mpesa))}${rr("CREDIT", R2(c.credit))}${rr("TOTAL", R2(c.cash + c.mpesa + c.credit), 1)}</table><hr><div class="sec">SALES</div><table>${rr("Bills", c.bills)}${rr("Gross sales", R2(c.gross))}${rr("Taxes", R2(c.tax))}${rr("Net sales", R2(c.gross - c.tax), 1)}</table><hr><div class="sec">CASH RECONCILIATION</div><table>${rr("Opening float", R2(sh.float))}${rr("+ Cash sales", R2(c.cash))}${rr("- Cash paid out", R2(c.paid))}${rr("Expected in till", R2(c.expected), 1)}${rr("Actual in till", ac >= 0 ? R2(ac) : "not counted")}${rr("Variance", vr === null ? "-" : sg(vr), 1)}</table><hr><div class="sec">CASH PAYOUTS / EXPENSES</div>${pays.length ? `<table>${pays.map(x => rr(hm(x.at) + " " + hx(x.cat) + ": " + hx(x.desc), R2(x.amt))).join("")}${rr("TOTAL PAID OUT", R2(c.paid), 1)}</table>` : "<div>None</div>"}<hr><div class="c">Printed by ${hx(by || sh.user)}</div></div>`;
}
function dayReport(d, by) {
  const sh = SHIFTS.filter(x => x.day === d.id),
    pays = PAYOUTS.filter(p => p.day === d.id),
    a = SALES.filter(
      s => s.at >= new Date(d.openedAt) && (!d.closedAt || s.at <= new Date(d.closedAt))
    ),
    paid = sSum(pays, p => p.amt);
  return `<div class="rd">${rhead("END OF DAY SUMMARY")}<table>${rr("Day", d.id)}${rr("Opened", dm(d.openedAt) + " " + hm(d.openedAt) + " by " + hx(d.openedBy))}${rr("Closed", d.closedAt ? dm(d.closedAt) + " " + hm(d.closedAt) + " by " + hx(d.closedBy) : "Still open")}</table><hr><div class="sec">SALES</div><table>${rr("Bills", a.length)}${rr("Gross sales", R2(sSum(a, s => s.g)))}${rr("Taxes", R2(sSum(a, s => s.tax)))}${rr("Net sales", R2(sSum(a, s => s.g - s.tax)), 1)}</table><hr><div class="sec">PAYMODES (KSH)</div><table>${rr("CASH", R2(sPm(a, "cash")))}${rr("M-PESA", R2(sPm(a, "mpesa")))}${rr("CREDIT", R2(sPm(a, "credit")))}</table><hr><div class="sec">SHIFTS</div>${sh.length ? `<table>${sh.map(x => rr(hx(x.user) + " " + hm(x.openedAt) + "-" + (x.closedAt ? hm(x.closedAt) : "open"), x.closedAt ? "var " + sg(x.variance) : "open")).join("")}</table>` : "<div>None</div>"}<hr><div class="sec">CASH PAYOUTS / EXPENSES</div>${pays.length ? `<table>${pays.map(x => rr(hx(x.cat) + ": " + hx(x.desc) + " (" + hx(x.user) + ")", R2(x.amt))).join("")}${rr("TOTAL PAID OUT", R2(paid), 1)}</table>` : "<div>None</div>"}<hr><table>${rr("Total cash variance", sg(sSum(sh, x => x.variance || 0)), 1)}</table><hr><div class="c">Printed by ${hx(by || d.closedBy || d.openedBy)}</div></div>`;
}

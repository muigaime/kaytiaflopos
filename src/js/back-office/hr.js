// ---- HR & Payroll: the screens ----
const HR_TABS = [
  ["h", "People"],
  ["emp", "Employees", "users"],
  ["time", "Time and attendance", "check"],
  ["roster", "Duty roster", "book"],
  ["leave", "Leave", "home"],
  ["clock", "Clock and biometric", "check"],
  ["rec", "Staff records", "id"],
  ["h", "Pay"],
  ["run", "Payroll", "wal"],
  ["adv", "Advance payments", "cash"],
  ["ded", "Bills, loans and deductions", "cart"],
  ["exit", "Final pay", "dl"],
  ["stat", "Statutory returns", "shield"],
  ["h", "Setup"],
  ["set", "Rates and rules", "gear"]
];
/** The tabs, in their groups. */
const hrGroups = () => {
  const G = [];
  HR_TABS.forEach(([t, l, ic]) => {
    if (t === "h") G.push({ name: l, tabs: [] });
    else G[G.length - 1].tabs.push([t, l, ic]);
  });
  return G;
};
/** "2 to approve" beside the screens that are waiting for someone. */
function hrBadge(t) {
  const H = hr(),
    n =
      t === "leave"
        ? H.leave.filter(l => l.status === AWAIT).length
        : t === "adv"
          ? H.adv.filter(a => a.status === AWAIT).length
          : t === "roster"
            ? hrSwaps().filter(s => s.status === AWAIT).length
            : 0;
  return n ? `<span class="tag warn">${n} to approve</span>` : "";
}
const HR_PAGES = {
  home: ["HR and payroll", "Your people, this month's payroll and what needs attention."],
  emp: ["Employees", "Everyone on the payroll, with their pay, bank and statutory details."],
  time: [
    "Time and attendance",
    "Who came in, when, and for how long. POS shifts and staff PINs count on their own."
  ],
  roster: ["Duty roster", "Who works which shift each week, and swaps between staff."],
  leave: ["Leave", "Ask, approve and track leave. Annual leave builds up each month."],
  clock: [
    "Clock and biometric",
    "Two ways for staff to clock in and out: the Staff clock page, or a fingerprint or face reader."
  ],
  rec: [
    "Staff records",
    "Warnings, certificates, documents, uniforms, training, reviews and meals."
  ],
  adv: [
    "Advance payments",
    "Money paid ahead of payday, approved by a manager and taken back from pay."
  ],
  ded: ["Bills, loans and deductions", "What staff owe, taken from their next pay."],
  run: ["Payroll", "Work out the month, approve it, print or email payslips and pay."],
  exit: ["Final pay", "What's due when someone leaves, with their certificate of service."],
  stat: [
    "Statutory returns",
    "The figures to file with KRA, NSSF and SHA each month, and P9 forms."
  ],
  set: [
    "Rates and rules",
    "Change these when the law changes. Past payrolls keep the rates they used."
  ]
};
const HR_LEAVE = ["Annual", "Sick", "Maternity", "Paternity", "Compassionate", "Unpaid"];
const HR_TYPES = ["Permanent", "Contract", "Casual"];
const HR_VIA = ["Bank", "M-Pesa", "Cash"];
const hrS = {
  tab: "home",
  emp: null, // the employee being edited
  q: "",
  day: "",
  month: "",
  timeV: "day",
  period: "",
  run: "",
  stat: "paye",
  pin: null // { act, id, title }
};
const hrOpts = (L, on) =>
  L.map(x => `<option ${x === on ? "selected" : ""}>${esc(x)}</option>`).join("");
const hrEmpOpts = (on, blank) =>
  (blank ? `<option value="">${blank}</option>` : "") +
  hrEmps()
    .map(
      e =>
        `<option value="${e.id}" ${e.id === on ? "selected" : ""}>${esc(e.name)} · ${esc(e.no)}</option>`
    )
    .join("");
const hrTbl = (c, rows, none) => {
  const n = h => (h[0] === "#" ? ' class="n"' : "");
  return rows.length
    ? `<div class="tw"><table class="t hr-t"><thead><tr>${c.map(h => `<th${n(h)}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
    : `<div class="empty">${none}</div>`;
};
const hrNeedEmp =
  '<div class="pn"><div class="empty">Add an employee first.</div><button class="chip on" data-a="hr_tab" data-t="emp">Go to employees</button></div>';
// ---------------------------------------------------------------- employees
const hrBlank = () => ({
  id: "",
  name: "",
  idNo: "",
  phone: "",
  email: "",
  kin: "",
  job: "",
  dept: "",
  type: "Permanent",
  start: ymdOf(new Date()),
  end: "",
  user: "",
  basic: "",
  house: "",
  transport: "",
  otherAllow: "",
  via: "Bank",
  bank: "",
  branch: "",
  acct: "",
  mpesa: "",
  kra: "",
  nssfNo: "",
  shaNo: "",
  leaveYear: "",
  dayRate: "",
  svcPts: "",
  pin: "",
  status: "Active"
});
function hrEmpModal() {
  const E = hrS.emp;
  if (!E) return "";
  const f = (l, k, attrs = "", cls = "") =>
      `<label class="${cls}">${l}<input data-he="${k}" value="${esc(E[k])}" ${attrs}></label>`,
    money = (l, k) => f(l, k, 'type="number" min="0" step="any"'),
    taken = hr()
      .emps.filter(x => x.id !== E.id)
      .map(x => x.user),
    users = USERS.map(u => u.n).filter(n => !taken.includes(n));
  return `<div class="modal show" id="hrEd" style="z-index:66"><div class="box itm hr-box">
  <header class="itm-h"><div><h3>${E.id ? `Edit ${esc(E.name)}` : "New employee"}</h3><p>Only the name and basic pay are needed to start.</p></div><button class="itm-x" data-a="hr_empno" aria-label="Close">✕</button></header>
  <div class="itm-b">
  <section class="itm-s"><h4>Personal</h4><div class="itm-g">${f("Full name", "name", 'maxlength="60" autocomplete="off"')}${f("ID or passport no", "idNo", 'maxlength="20"')}${f("Phone", "phone", 'maxlength="20"')}${f("Email", "email", 'type="email" maxlength="80"')}${f("Next of kin", "kin", 'maxlength="80" placeholder="Name and phone"')}</div></section>
  <section class="itm-s"><h4>Job</h4><div class="itm-g">${f("Job title", "job", 'maxlength="40" placeholder="e.g. Waiter"')}<label>Department<input data-he="dept" list="hrDepts" maxlength="30" value="${esc(E.dept)}"><datalist id="hrDepts">${[...new Set([...ALLD, ...STORES, "Front Office", "Housekeeping", "Administration"])].map(d => `<option value="${esc(d)}">`).join("")}</datalist></label><label>Employment<select data-he="type">${hrOpts(HR_TYPES, E.type)}</select></label>${f("Date started", "start", 'type="date"')}${f("Contract ends", "end", 'type="date"')}<label>POS sign-in<select data-he="user"><option value="">None</option>${users.map(u => `<option ${u === E.user ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></label>${E.id ? `<label>Status<select data-he="status">${hrOpts(["Active", "Left"], E.status)}</select></label>` : ""}</div><div class="itm-hint">Link the POS sign-in so that shifts count as attendance and bills can be charged to this person.</div></section>
  <section class="itm-s"><h4>Monthly pay (KES)</h4><div class="itm-g">${money("Basic pay", "basic")}${money("House allowance", "house")}${money("Transport allowance", "transport")}${money("Other allowances", "otherAllow")}${money("Day rate (casual staff)", "dayRate")}${f("Service charge points", "svcPts", 'type="number" min="0" step="any" placeholder="1"')}${f("Annual leave days", "leaveYear", `type="number" min="0" step="any" placeholder="${hrR().annualLeave}"`)}</div><div class="hr-est" id="hrEst">${hrEstText(E)}</div></section>
  <section class="itm-s"><h4>How they are paid</h4><div class="itm-g"><label>Paid by<select data-he="via">${hrOpts(HR_VIA, E.via)}</select></label>${f("Bank", "bank", 'maxlength="40"')}${f("Branch", "branch", 'maxlength="40"')}${f("Account no", "acct", 'maxlength="30"')}${f("M-Pesa number", "mpesa", 'maxlength="15" placeholder="07…"')}</div></section>
  <section class="itm-s"><h4>Clocking in and out</h4><div class="itm-g">${f("Clock password", "clockNew", `type="password" autocomplete="new-password" placeholder="${E.clockHash ? "Saved. Leave blank to keep it" : "At least 4 characters"}"`)}${f("ID on the fingerprint or face reader", "bioId", 'maxlength="20"')}</div></section>
  <section class="itm-s"><h4>Statutory numbers</h4><div class="itm-g">${f("KRA PIN", "kra", 'maxlength="11" style="text-transform:uppercase"')}${f("NSSF no", "nssfNo", 'maxlength="20"')}${f("SHA no", "shaNo", 'maxlength="20"')}</div></section>
  </div><footer class="itm-f"><button class="mini" data-a="hr_empno">Cancel</button><button class="chip on" data-a="hr_empsave">${E.id ? "Save changes" : "Add employee"}</button></footer></div></div>`;
}
function hrEstText(E) {
  const g = (+E.basic || 0) + hrAllow(E);
  if (!g) return "Enter the pay to see what they take home.";
  const S = hrStatutory(g);
  return `Gross ${m2(g)} · NSSF ${m2(S.nssf)} · SHA ${m2(S.sha)} · Housing ${m2(S.ahl)} · PAYE ${m2(S.paye)} · <b>Take home ${m2(g - S.nssf - S.sha - S.ahl - S.paye)}</b>`;
}
// ---------------------------------------------------------------- time
function hrTimeHTML() {
  if (!hrEmps().length) return hrNeedEmp;
  const day = hrS.day || (hrS.day = ymdOf(new Date())),
    month = hrS.month || (hrS.month = hrPeriodNow()),
    E = hrEmps(),
    D = E.map(e => ({ e, T: hrDayTime(e, day), lv: hrOnLeave(e.id, day) })),
    n = f => D.filter(f).length,
    pills = `<div class="pr-pills"><button class="pr-pill ${hrS.timeV === "day" ? "on" : ""}" data-a="hr_timev" data-v="day">By day</button><button class="pr-pill ${hrS.timeV === "month" ? "on" : ""}" data-a="hr_timev" data-v="month">Month summary</button></div>`;
  if (hrS.timeV === "month")
    return `<div class="pn"><div class="inv-head">${pills}<span class="inv-btns"><label class="hr-inl">Month<input type="month" data-hs="month" value="${month}"></label><button class="mini xl-btn" data-a="hr_timexl">Export to Excel</button></span></div>${hrTbl(
      ["Employee", "#Days present", "#Hours", "#Overtime", "#Late", "#On leave"],
      E.map(e => {
        const M = hrMonthTime(e, month);
        return `<tr><td><b>${esc(e.name)}</b> <small class="pr-code">${esc(e.no)}</small></td><td class="n">${M.present}</td><td class="n">${qn(M.hours)}</td><td class="n">${qn(M.ot)}</td><td class="n">${M.late}</td><td class="n">${M.leave}</td></tr>`;
      }),
      "No staff."
    )}</div>`;
  return `<div class="stm-tiles">${msTile(
    "Present",
    n(x => x.T.rows.length)
  )}${msTile(
    "Still clocked in",
    n(x => x.T.open)
  )}${msTile(
    "Late",
    n(x => x.T.late),
    "",
    n(x => x.T.late) ? "warn" : ""
  )}${msTile(
    "On leave",
    n(x => x.lv)
  )}${msTile(
    "Not in",
    n(x => !x.T.rows.length && !x.lv)
  )}</div>
  <div class="pn"><h4>Clock in or out</h4><div class="pv-form"><label class="ac-wide">Employee<select id="hrCk">${hrEmpOpts("")}</select></label><button class="chip on" data-a="hr_clock">Clock in or out now</button></div>
  <details class="hr-more"><summary>Add a missed entry</summary><div class="pv-form"><label class="ac-wide">Employee<select id="hrTE">${hrEmpOpts("")}</select></label><label>Date<input id="hrTD" type="date" value="${day}"></label><label>In<input id="hrTI" type="time"></label><label>Out<input id="hrTO" type="time"></label><button class="mini" data-a="hr_tadd">Add</button></div></details></div>
  <div class="pn"><div class="inv-head">${pills}<label class="hr-inl">Date<input type="date" data-hs="day" value="${day}"></label></div>${hrTbl(
    ["Employee", "Status", "In", "Out", "#Hours", "#Overtime", "From", ""],
    D.map(({ e, T, lv }) => {
      const st = lv
          ? `<span class="tag warn">${esc(lv.type)} leave</span>`
          : T.open
            ? '<span class="tag ok">Clocked in</span>'
            : T.rows.length
              ? '<span class="tag ok">Present</span>'
              : '<span class="tag">Not in</span>',
        mine = T.rows.filter(r => r.id);
      return `<tr><td><b>${esc(e.name)}</b></td><td>${st}${T.late ? ' <span class="tag bad">Late</span>' : ""}</td><td>${T.in || "-"}</td><td>${T.out || "-"}</td><td class="n">${qn(T.hours)}</td><td class="n">${T.ot ? qn(T.ot) : ""}</td><td>${esc([...new Set(T.rows.map(r => r.src))].join(", "))}</td><td class="n">${mine.map(r => `<button class="mini" data-a="hr_tdel" data-id="${r.id}">Remove ${esc(r.in)}</button>`).join(" ")}</td></tr>`;
    }),
    "No staff."
  )}</div>`;
}
// ---------------------------------------------------------------- leave
function hrLeaveHTML() {
  if (!hrEmps().length) return hrNeedEmp;
  const L = hr().leave.slice().reverse(),
    wait = L.filter(l => l.status === AWAIT).length;
  return `<div class="pn"><h4>New leave request</h4><div class="pv-form"><label class="ac-wide">Employee<select id="hrLE">${hrEmpOpts("")}</select></label><label>Type<select id="hrLT">${hrOpts(HR_LEAVE)}</select></label><label>From<input id="hrLF" type="date"></label><label>To<input id="hrLU" type="date"></label></div><div class="pv-form"><label class="ac-wide">Reason<input id="hrLW" maxlength="120" placeholder="Optional"></label><button class="chip on" data-a="hr_lvadd">Send for approval</button></div><div class="stk">Sundays aren't counted. Unpaid leave comes off basic pay in the payroll.</div></div>
  <div class="pn"><h4>Requests${wait ? ` (${wait} waiting)` : ""}</h4>${hrTbl(
    ["Employee", "Type", "From", "To", "#Days", "Status", ""],
    L.map(l => {
      const e = hrEmp(l.emp) || {};
      return `<tr><td><b>${esc(e.name || "-")}</b></td><td>${esc(l.type)}</td><td>${dateGB(l.from)}</td><td>${dateGB(l.to)}</td><td class="n">${qn(l.days)}</td><td><span class="tag ${l.status === "Approved" ? "ok" : l.status === "Rejected" ? "bad" : "warn"}">${esc(l.status)}</span></td><td class="n"><span class="sp-acts">${l.status === AWAIT ? `<button class="chip on" data-a="hr_ask" data-act="lvok" data-id="${l.id}">Approve</button><button class="mini" data-a="hr_ask" data-act="lvno" data-id="${l.id}">Reject</button>` : ""}${docBtn("plv", l.id, "Print")}</span></td></tr>`;
    }),
    "No leave requests yet."
  )}</div>
  <div class="pn"><h4>Annual leave balances, ${ymdOf(new Date()).slice(0, 4)}</h4>${hrTbl(
    ["Employee", "#Earned", "#Taken", "#Left"],
    hrEmps().map(e => {
      const B = hrLeaveBal(e);
      return `<tr><td>${esc(e.name)}</td><td class="n">${qn(B.earned)}</td><td class="n">${qn(B.taken)}</td><td class="n"><b>${qn(B.left)}</b></td></tr>`;
    }),
    "No staff."
  )}</div>`;
}
// ---------------------------------------------------------------- waiter bills and advances
function hrDedHTML() {
  if (!hrEmps().length) return hrNeedEmp;
  const H = hr(),
    bills = H.charges.filter(c => c.kind === "bill" && c.left > 0.004),
    others = H.charges.filter(c => c.kind === "other" && c.left > 0.004),
    adv = H.adv.filter(a => a.left > 0.004),
    sum = (L, f = "left") => L.reduce((a, x) => a + x[f], 0),
    row = (c, kind) => {
      const e = hrEmp(c.emp) || {};
      return `<tr><td>${dt2(c.at)}</td><td><b>${esc(e.name || "-")}</b></td><td>${esc(c.note)}</td><td>${esc(c.by || "")}</td><td class="n">${m2(c.amt)}</td><td class="n"><b>${m2(c.left)}</b></td>${kind ? `<td class="n"><button class="mini" data-a="hr_ask" data-act="dedno" data-id="${c.id}">Remove</button></td>` : ""}</tr>`;
    };
  return `<div class="stm-tiles">${msTile("Waiter bills owed (KES)", m2(sum(bills)), "", bills.length ? "warn" : "")}${msTile("Advances owed (KES)", m2(sum(adv)))}${msTile("Other deductions (KES)", m2(sum(others)))}</div>
  <div class="pn"><h4>Waiter bills sent to payroll</h4><div class="stk">Cashiers send these from the POS: open the bill, press Post to payroll, and a manager enters their PIN.</div>${hrTbl(
    ["Date", "Employee", "Bill", "Sent by", "#Amount", "#Still owed"],
    bills.map(c => row(c)),
    "No waiter bills waiting."
  )}</div>
  <div class="pn"><h4>Other deduction</h4><div class="stk">For example a cash shortage or a lost uniform. Only take what the employee has agreed to in writing.</div><div class="pv-form"><label class="ac-wide">Employee<select id="hrDE">${hrEmpOpts("")}</select></label><label>Amount (KES)<input id="hrDA" type="number" min="0" step="any"></label><label class="ac-wide">What it's for<input id="hrDN" maxlength="80"></label><button class="chip on" data-a="hr_dedadd">Add</button></div>${hrTbl(
    ["Date", "Employee", "What it's for", "Added by", "#Amount", "#Still owed", ""],
    others.map(c => row(c, true)),
    "No other deductions."
  )}</div>${hrRecurHTML()}`;
}
// ---------------------------------------------------------------- payroll
function hrRunEdit(run) {
  const T = hrRunTotals(run),
    num = (i, f, v, l) =>
      `<label>${l}<input class="hr-a" type="number" min="0" step="any" data-hl="${i}.${f}" value="${+v || ""}" placeholder="0"></label>`;
  return `<div class="stm-tiles">${msTile("Gross pay (KES)", m2(T.gross))}${msTile("Statutory (KES)", m2(T.nssf + T.sha + T.ahl + T.paye))}${msTile("Other deductions (KES)", m2(T.othersAll))}${msTile("Net pay (KES)", m2(T.net), "", "gold")}${msTile("Employer cost (KES)", m2(T.gross + T.nssfEr + T.ahlEr + T.nita))}</div><div class="pn"><div class="inv-head"><h4>Draft: ${hrMonthName(run.period)}</h4><span class="inv-btns"><button class="mini" data-a="hr_rundel" data-id="${run.id}">Delete draft</button><button class="mini" data-a="hr_runfresh" data-id="${run.id}">Refresh</button>${docBtn("prun", run.id, "Preview")}<button class="chip on" data-a="hr_ask" data-act="runok" data-id="${run.id}">Approve and post</button></span></div>
  <div class="pv-form"><label class="hr-month">Service charge to share (KES)<input data-hsvc="${run.id}" type="number" min="0" step="any" value="${+run.svcPool || ""}" placeholder="0"></label></div>
  ${hrChecksHTML(hrRunChecks(run))}
  <div class="tw"><table class="t hr-t hr-run"><thead><tr><th>Employee</th><th class="n">Basic + allowances</th><th class="n">Overtime</th><th class="n">Extras</th><th class="n">Gross</th><th class="n">NSSF</th><th class="n">SHA</th><th class="n">Housing</th><th class="n">PAYE</th><th class="n">Other deductions</th><th class="n">Net pay</th><th></th></tr></thead><tbody>${run.lines
    .map((l, i) => {
      const open = hrS.adj === l.emp;
      return `<tr class="${l.overCap ? "stm-short" : ""}"><td><b>${esc(l.name)}</b>${l.dayRate ? `<small class="pr-code">${qn(+l.casDays || 0)} days at ${m2(l.dayRate)}</small>` : ""}${l.unpaid ? `<small class="pr-code">Unpaid leave −${m2(l.unpaid)}</small>` : ""}</td><td class="n">${m2(l.basic + l.house + l.transport + l.otherAllow)}</td><td class="n">${m2(l.ot)}</td><td class="n">${m2(l.extras + (+l.bonus || 0))}</td><td class="n"><b>${m2(l.gross)}</b></td><td class="n">${m2(l.nssf)}</td><td class="n">${m2(l.sha)}</td><td class="n">${m2(l.ahl)}</td><td class="n">${m2(l.paye)}</td><td class="n">${m2(l.others)}</td><td class="n hr-net"><b>${m2(l.net)}</b></td><td class="n"><button class="mini" data-a="hr_adj" data-id="${l.emp}">${open ? "Done" : "Adjust"}</button></td></tr>${
        open
          ? `<tr class="hr-adj"><td colspan="12"><div class="hr-adj-g"><div><h5>Earnings</h5><div class="pv-form">${l.dayRate ? num(i, "casDays", l.casDays, "Days worked") : ""}${num(i, "otHrs", l.otHrs, "Overtime hours")}${num(i, "holHrs", l.holHrs, "Holiday hours")}${num(i, "bonus", l.bonus, "Bonus")}${num(i, "commission", l.commission, "Commission")}${num(i, "tips", l.tips, "Tips")}<label>Service charge share<input class="hr-a" value="${m2(l.svc || 0)}" readonly></label></div></div><div><h5>Taken from pay</h5><div class="pv-form">${num(i, "billTake", l.billTake, "Waiter bills")}${num(i, "advTake", l.advTake, "Advance")}${num(i, "otherTake", l.otherTake, "Other")}${(l.recur || []).map((x, j) => `<label>${esc(x.kind)}<input class="hr-a" type="number" min="0" step="any" data-hr2="${i}.${j}" value="${+x.take || ""}" placeholder="0"></label>`).join("")}</div></div></div></td></tr>`
          : ""
      }`;
    })
    .join(
      ""
    )}<tr class="hr-tot"><td>Total</td><td></td><td></td><td class="n">${m2(run.lines.reduce((a, l) => a + l.extras + (+l.bonus || 0), 0))}</td><td class="n">${m2(T.gross)}</td><td class="n">${m2(T.nssf)}</td><td class="n">${m2(T.sha)}</td><td class="n">${m2(T.ahl)}</td><td class="n">${m2(T.paye)}</td><td class="n">${m2(T.othersAll)}</td><td class="n">${m2(T.net)}</td><td></td></tr></tbody></table></div></div>`;
}
function hrRunDone(run) {
  const T = hrRunTotals(run);
  return `<div class="stm-tiles">${msTile("Gross pay (KES)", m2(T.gross))}${msTile("Statutory (KES)", m2(T.nssf + T.sha + T.ahl + T.paye))}${msTile("Net pay (KES)", m2(T.net), "", "gold")}${msTile("Employer cost (KES)", m2(T.gross + T.nssfEr + T.ahlEr + T.nita))}</div>
  <div class="pn"><div class="inv-head"><h4>${hrMonthName(run.period)} <span class="tag ${run.status === "Paid" ? "ok" : "warn"}">${esc(run.status)}</span></h4><span class="inv-btns"><button class="mini xl-btn" data-a="hr_runxl" data-id="${run.id}">Export to Excel</button>${docBtn("prun", run.id, "Summary")}${docBtn("pbank", run.id, "Bank schedule")}<button class="mini" data-a="hr_slipmail" data-id="${run.id}">Email payslips</button><button class="chip on" data-a="hr_slipsall" data-id="${run.id}">Print all payslips</button></span></div>
  ${
    run.status === "Paid"
      ? `<div class="stk">Paid on ${dateGB(run.paidOn)} from ${esc((acAcc(run.paidFrom) || {}).name || run.paidFrom)}.</div>`
      : `<div class="pv-form"><label>Pay on<input id="hrPD" type="date" value="${ymdOf(new Date())}"></label><label class="ac-wide">Pay from<select id="hrPF">${acOptions("", acMoney())}</select></label><label>Reference<input id="hrPR" maxlength="40" placeholder="Bank or M-Pesa reference"></label><button class="chip on" data-a="hr_runpay" data-id="${run.id}">Mark as paid</button></div>`
  }
  ${hrTbl(
    [
      "Employee",
      "#Gross",
      "#NSSF",
      "#SHA",
      "#Housing",
      "#PAYE",
      "#Other",
      "#Net pay",
      "Paid by",
      ""
    ],
    run.lines.map(
      l =>
        `<tr><td><b>${esc(l.name)}</b> <small class="pr-code">${esc(l.no)}</small></td><td class="n">${m2(l.gross)}</td><td class="n">${m2(l.nssf)}</td><td class="n">${m2(l.sha)}</td><td class="n">${m2(l.ahl)}</td><td class="n">${m2(l.paye)}</td><td class="n">${m2(l.others)}</td><td class="n"><b>${m2(l.net)}</b></td><td>${esc(l.via)}</td><td class="n"><span class="sp-acts">${docBtn("pslip", `${run.id}-${l.no}`, "Payslip")}${docBtn("pbslip", `${run.id}-${l.no}`, "Bank slip")}</span></td></tr>`
    ),
    "Nobody on this run."
  )}</div>`;
}
function hrRunHTML() {
  if (!hrEmps().length && !hrRuns().length) return hrNeedEmp;
  const p = hrS.period || (hrS.period = hrPeriodNow()),
    run = hrRuns().find(r => r.period === p && !r.off),
    past = hrRuns()
      .filter(r => !r.off)
      .slice()
      .reverse();
  return `<div class="pn hr-steps-pn">${hrSteps(HR_RUN_STEPS, hrRunStep(run))}</div><div class="pn"><div class="pv-form"><label class="hr-month">Month<input type="month" data-hs="period" value="${p}"></label>${run ? "" : `<button class="chip on" data-a="hr_runnew">Prepare ${hrMonthName(p)}</button>`}</div></div>
  ${run ? (run.status === "Draft" ? hrRunEdit(run) : hrRunDone(run)) : '<div class="pn"><div class="empty">No payroll for this month yet.</div></div>'}
  ${
    past.length
      ? `<div class="pn"><h4>All payrolls</h4>${hrTbl(
          ["Month", "Status", "#Employees", "#Gross", "#Net pay", ""],
          past.map(r => {
            const T = hrRunTotals(r);
            return `<tr><td>${hrMonthName(r.period)}</td><td><span class="tag ${r.status === "Paid" ? "ok" : "warn"}">${esc(r.status)}</span></td><td class="n">${r.lines.length}</td><td class="n">${m2(T.gross)}</td><td class="n">${m2(T.net)}</td><td class="n"><button class="mini" data-a="hr_runopen" data-p="${r.period}">Open</button></td></tr>`;
          }),
          ""
        )}</div>`
      : ""
  }`;
}
// ---------------------------------------------------------------- statutory returns
const HR_STAT = {
  paye: [
    "PAYE (KRA P10)",
    ["Employee", "KRA PIN", "#Gross", "#Taxable pay", "#Tax", "#Relief", "#PAYE"],
    l => [
      l.name,
      l.kra || "-",
      m2(l.gross),
      m2(l.taxable),
      m2(l.before),
      m2(Math.min(l.before, hrR().relief)),
      m2(l.paye)
    ],
    [2, 3, 4, 5, 6]
  ],
  nssf: [
    "NSSF",
    [
      "Employee",
      "NSSF no",
      "ID no",
      "#Pensionable pay",
      "#Tier I",
      "#Tier II",
      "#Employee",
      "#Employer",
      "#Total"
    ],
    l => [
      l.name,
      l.nssfNo || "-",
      (hrEmp(l.emp) || {}).idNo || "-",
      m2(Math.min(l.gross, hrR().nssfUel)),
      m2(l.t1),
      m2(l.t2),
      m2(l.nssf),
      m2(l.nssfEr),
      m2(l.nssf + l.nssfEr)
    ],
    [3, 4, 5, 6, 7, 8]
  ],
  sha: [
    "SHA",
    ["Employee", "SHA no", "ID no", "#Gross", "#Contribution"],
    l => [l.name, l.shaNo || "-", (hrEmp(l.emp) || {}).idNo || "-", m2(l.gross), m2(l.sha)],
    [3, 4]
  ],
  ahl: [
    "Housing levy",
    ["Employee", "ID no", "KRA PIN", "#Gross", "#Employee", "#Employer", "#Total"],
    l => [
      l.name,
      (hrEmp(l.emp) || {}).idNo || "-",
      l.kra || "-",
      m2(l.gross),
      m2(l.ahl),
      m2(l.ahlEr),
      m2(l.ahl + l.ahlEr)
    ],
    [3, 4, 5, 6]
  ],
  nita: ["NITA", ["Employee", "#Levy"], l => [l.name, m2(l.nitaEr)], [1]]
};
function hrStatData() {
  const p = hrS.period || (hrS.period = hrPeriodNow()),
    runs = hrRuns().filter(r => r.period === p && r.status !== "Draft"),
    [title, c, row, sums] = HR_STAT[hrS.stat];
  if (!runs.length) return { p, title, c, r: [] };
  const r = runs.flatMap(x => x.lines).map(row),
    num = v => parseFloat(String(v).replace(/,/g, "")) || 0,
    f = c.map((h, i) =>
      i === 0 ? "Total" : sums.includes(i) ? m2(r.reduce((a, x) => a + num(x[i]), 0)) : ""
    );
  return { p, title, c, r, f };
}
function hrStatHTML() {
  if (hrS.stat === "p9") return hrP9HTML();
  const D = hrStatData(),
    n = h => (h[0] === "#" ? ' class="n"' : "");
  return `<div class="pn"><div class="pv-form"><label class="hr-month">Month<input type="month" data-hs="period" value="${D.p}"></label><span class="inv-btns hr-st"><button class="mini xl-btn" data-a="hr_statxl">Export to Excel</button><button class="mini" data-a="hr_statpr">Print</button></span></div><div class="pr-pills">${hrStatPills()
    .map(
      ([k, v]) =>
        `<button class="pr-pill ${k === hrS.stat ? "on" : ""}" data-a="hr_statk" data-k="${k}">${esc(v[0])}</button>`
    )
    .join("")}</div>
  ${
    D.r.length
      ? `<div class="tw"><table class="t hr-t"><thead><tr>${D.c.map(h => `<th${n(h)}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${D.r.map(x => `<tr>${x.map((v, i) => `<td${n(D.c[i])}>${esc(v)}</td>`).join("")}</tr>`).join("")}<tr class="hr-tot">${D.f.map((v, i) => `<td${n(D.c[i])}>${esc(v)}</td>`).join("")}</tr></tbody></table></div><div class="stk">Check these against the portals before you file. They come from the approved payroll for ${hrMonthName(D.p)}.</div>`
      : `<div class="empty">No approved payroll for ${hrMonthName(D.p)}.</div>`
  }</div>`;
}
// ---------------------------------------------------------------- rates
function hrSetHTML() {
  const R = hrR(),
    f = (l, k, pre = "") =>
      `<label>${l}<input data-hr="${k}" type="${pre || "number"}" ${pre ? "" : 'min="0" step="any"'} value="${esc(R[k])}"></label>`;
  return `<div class="pn"><h4>NSSF</h4><div class="pv-form">${f("Rate, each side (%)", "nssfRate")}${f("Lower limit (KES)", "nssfLel")}${f("Upper limit (KES)", "nssfUel")}</div></div>
  <div class="pn"><h4>SHA and Housing levy</h4><div class="pv-form">${f("SHA rate (%)", "shaRate")}${f("SHA minimum (KES)", "shaMin")}${f("Housing levy, each side (%)", "ahlRate")}${f("NITA per employee (KES)", "nita")}</div></div>
  <div class="pn"><h4>PAYE, per month</h4>${hrTbl(
    ["Up to (KES)", "#Rate (%)"],
    R.bands.map(
      (b, i) =>
        `<tr><td>${i === R.bands.length - 1 ? "Everything above" : `<input class="hr-b" type="number" min="0" step="any" data-hb="${i}.0" value="${b[0]}" aria-label="Band limit">`}</td><td class="n"><input class="hr-b" type="number" min="0" step="any" data-hb="${i}.1" value="${b[1]}" aria-label="Band rate"></td></tr>`
    ),
    ""
  )}<div class="pv-form">${f("Personal relief (KES)", "relief")}</div></div>
  <div class="pn"><h4>Time, overtime and leave</h4><div class="pv-form">${f("Work starts", "workStart", "time")}${f("Late after (minutes)", "lateMins")}${f("Normal hours a day", "hoursDay")}${f("Hours in a month", "hoursMonth")}${f("Overtime rate (× hourly)", "otRate")}${f("Annual leave days", "annualLeave")}${f("Public holiday pay (× normal)", "holRate")}${f("Flag advances over (% of basic)", "advMax")}</div></div>
  <div class="pn"><h4>Pay from the POS</h4><div class="pv-form">${[
    ["commInPay", "Add sales commission to pay"],
    ["tipsInPay", "Add tips to pay"]
  ]
    .map(
      ([k, l]) =>
        `<label class="sw"><input type="checkbox" data-hr="${k}" ${R[k] ? "checked" : ""}><span>${l}</span></label>`
    )
    .join(
      ""
    )}</div><div class="stk">Turn tips off if they're handed out in cash each day, or staff will be paid twice.</div></div>
  <div class="pn"><h4>Shifts</h4>${hrTbl(
    ["Name", "Starts", "Ends"],
    R.shifts.map(
      (s, i) =>
        `<tr><td><input data-hsh="${i}.n" maxlength="20" value="${esc(s.n)}" aria-label="Shift name"></td><td><input type="time" data-hsh="${i}.s" value="${s.s}" aria-label="Starts"></td><td><input type="time" data-hsh="${i}.e" value="${s.e}" aria-label="Ends"></td></tr>`
    ),
    ""
  )}</div>
  <div class="pn"><h4>Public holidays</h4><div class="stk">Add Good Friday, Easter Monday, Idd and any others each year when they're gazetted.</div><div class="pv-form"><label>Date<input id="hrHD" type="date"></label><label class="ac-wide">Name<input id="hrHN" maxlength="40"></label><button class="mini" data-a="hr_holadd">Add</button></div>${hrTbl(
    ["Date", "Holiday", ""],
    hrHolidays().map(
      ([d, n]) =>
        `<tr><td>${d.length === 5 ? `${d.slice(3)}/${d.slice(0, 2)} every year` : dateGB(d)}</td><td>${esc(n)}</td><td class="n"><button class="mini" data-a="hr_holdel" data-k="${d}">Remove</button></td></tr>`
    ),
    "No holidays listed."
  )}</div>
  <div class="pn"><div class="pv-form"><button class="chip on" data-a="hr_ratesave">Save rates</button><button class="mini" data-a="hr_ratereset">Back to the 2026 rates</button></div></div>`;
}
// ---------------------------------------------------------------- the page
function hrPinModal() {
  const P = hrS.pin;
  if (!P) return "";
  return `<div class="modal show" id="hrPinM" style="z-index:68"><div class="box" style="max-width:420px"><div class="fr" style="align-items:center;justify-content:space-between"><h3>${esc(P.title)}</h3><button class="mini" data-a="hr_pinno" aria-label="Close">✕</button></div><div class="stk">${esc(P.note || "")}</div><label>Manager PIN<input id="hrPinI" type="password" inputmode="numeric" autocomplete="off"></label><div class="fr"><button class="chip on" data-a="hr_pinok">Confirm</button><button class="mini" data-a="hr_pinno">Cancel</button></div></div></div>`;
}
function hrView() {
  const body = {
    home: hrHomeHTML,
    emp: hrEmpHTML,
    time: hrTimeHTML,
    clock: hrClockHTML,
    roster: hrRosterHTML,
    rec: hrRecHTML,
    adv: hrAdvHTML,
    exit: hrExitHTML,
    leave: hrLeaveHTML,
    ded: hrDedHTML,
    run: hrRunHTML,
    stat: hrStatHTML,
    set: hrSetHTML
  }[hrS.tab]();
  const popups = hrProfile() + hrEmpModal() + hrPinModal();
  if (hrS.tab === "home") return body + popups;
  const [title, what] = HR_PAGES[hrS.tab];
  return `<div class="inv invx inv-solo"><div class="inv-main">${phMenu(hrGroups(), hrS.tab, "hr_tab", "HR and payroll", hrBadge)}<div class="inv-title hr-title"><div><h1>${title}</h1><p>${what}</p></div><span class="hr-conf">Confidential</span></div>${body}</div>${popups}</div>`;
}
V.hr = hrView;
function hrExcel(title, c, r, f, file) {
  XLSX.download(
    { company: FD_SETTINGS.name, title, by: xlsxBy(), sections: [{ c, r, f }] },
    file.replace(/ /g, "_")
  );
  toast(`${title} exported to Excel.`);
}
/** After the right manager's PIN. */
function hrDone(P, who) {
  const H = hr();
  if (P.act === "lvok" || P.act === "lvno") {
    const l = H.leave.find(x => x.id === P.id);
    if (!l) return;
    l.status = P.act === "lvok" ? "Approved" : "Rejected";
    l.appr = { by: who, at: new Date().toISOString() };
    auditAdd(
      "Leave",
      `${(hrEmp(l.emp) || {}).name} · ${l.type} ${l.days} days · ${l.status} by ${who}`,
      { mod: "HR" }
    );
    toast(`Leave ${l.status.toLowerCase()} by ${who}.`);
  }
  if (P.act === "dedno") {
    H.charges = H.charges.filter(c => c.id !== P.id);
    auditAdd("Payroll", `A deduction was removed by ${who}`, { mod: "HR", pri: "Important" });
    toast("Deduction removed.");
  }
  if (P.act === "advok" || P.act === "advno") {
    const x = H.adv.find(a => a.id === P.id);
    if (!x) return;
    if (P.act === "advno") {
      x.status = "Rejected";
      x.appr = { by: who, at: new Date().toISOString() };
      toast("Advance rejected.");
    } else {
      const e = hrEmp(x.emp),
        err = acPost({
          date: ymdOf(new Date()),
          narr: `Advance payment to ${e.name}`,
          ref: x.id,
          src: "Payroll",
          who: e.name,
          lines: [
            { a: "1220", dr: x.amt, cr: 0 },
            { a: x.from, dr: 0, cr: x.amt }
          ]
        });
      if (err) return toast(err);
      x.status = "Paid";
      x.left = x.amt;
      x.appr = { by: who, at: new Date().toISOString() };
      x.jv = acS().jv[acS().jv.length - 1].id;
      auditAdd("Advance payment", `${e.name} · KES ${m2(x.amt)} · approved by ${who}`, {
        ref: x.id,
        mod: "HR",
        pri: "Important"
      });
      docOpen("padv", x.id);
      toast(`Advance approved by ${who}. Print the slip for ${e.name} to sign.`);
    }
  }
  if (P.act === "swapok" || P.act === "swapno") {
    const s = hrSwaps().find(x => x.id === P.id);
    if (!s) return;
    s.status = P.act === "swapok" ? "Approved" : "Rejected";
    if (P.act === "swapok") {
      const Rs = hrRoster(),
        ka = `${s.a}|${s.date}`,
        kb = `${s.b}|${s.date}`,
        was = Rs[ka];
      Rs[ka] = Rs[kb] || "";
      Rs[kb] = was || "";
    }
    toast(`Swap ${s.status.toLowerCase()}.`);
  }
  if (P.act === "exitok") {
    const err = hrExitDone(P.id, who);
    if (err) return toast(err);
    toast("Final pay approved and posted to Accounts.");
  }
  if (P.act === "runok") {
    const run = hrRuns().find(r => r.id === P.id);
    if (!run) return;
    if (run.lines.some(l => l.net < 0))
      return toast("Someone's pay is below zero. Press Adjust and lower what's taken.");
    const err = hrPostRun(run, who);
    if (err) return toast(err);
    docOpen("prun", run.id);
    toast(`${hrMonthName(run.period)} approved by ${who} and posted to Accounts.`);
  }
  bosave();
  all();
}
function hrAct(a, b) {
  if (!boCan("users.manage")) return boDenied();
  const d = b.dataset,
    H = hr(),
    v = id => ($("#" + id) ? $("#" + id).value.trim() : ""),
    runOf = () => hrRuns().find(r => r.id === d.id);
  if (a === "hr_tab") {
    hrS.tab = d.t;
    hrS.prof = null;
    return all();
  }
  if (a === "hr_prof") {
    hrS.prof = d.id;
    return all();
  }
  if (a === "hr_profno") {
    hrS.prof = null;
    return all();
  }
  if (a === "hr_empst") {
    hrS.fSt = d.v;
    return all();
  }
  if (a === "hr_payoff") {
    const e = hrEmp(d.id),
      today = ymdOf(new Date());
    hrS.exit = {
      emp: e.id,
      last: e.end && e.end <= today ? e.end : today,
      reason: e.end && e.end <= today ? "End of contract" : "Dismissed",
      notice: "",
      service: "",
      other: "",
      billTake: "",
      advTake: "",
      loanTake: "",
      otherTake: ""
    };
    hrS.prof = null;
    hrS.tab = "exit";
    return all();
  }
  if (a === "hr_recjump") {
    hrS.rec = Object.keys(HR_REC).find(k => HR_REC[k].t === d.t);
    hrS.recEmp = d.id;
    hrS.prof = null;
    hrS.tab = "rec";
    return all();
  }
  if (a === "hr_empxl")
    return hrExcel(
      "Employees",
      [
        "No",
        "Name",
        "Job",
        "Department",
        "Type",
        "Started",
        "ID no",
        "KRA PIN",
        "NSSF no",
        "SHA no",
        "Paid by",
        "Bank",
        "Branch",
        "Account",
        "M-Pesa",
        "#Basic",
        "#Allowances",
        "Status"
      ],
      H.emps.map(e => [
        e.no,
        e.name,
        e.job,
        e.dept,
        e.type,
        e.start,
        e.idNo,
        e.kra,
        e.nssfNo,
        e.shaNo,
        e.via,
        e.bank,
        e.branch,
        e.acct,
        e.mpesa,
        +e.basic || 0,
        hrAllow(e),
        e.status
      ]),
      null,
      "Employees"
    );
  if (a === "hr_empnew" || a === "hr_empedit") {
    hrS.prof = a === "hr_empedit" ? hrS.prof : null;
    hrS.emp = a === "hr_empnew" ? hrBlank() : { ...hrBlank(), ...hrEmp(d.id) };
    return all();
  }
  if (a === "hr_empno") {
    hrS.emp = null;
    return all();
  }
  if (a === "hr_biosave") return bioSave();
  if (a === "hr_empsave") {
    const E = hrS.emp;
    if (E.clockNew) {
      // Stored as a hash, so nobody can read a person's password back.
      const pw = E.clockNew;
      if (pw.length < 4) return toast("The clock password needs at least 4 characters.");
      E.clockSalt = crypto.randomUUID();
      delete E.clockNew;
      return clockHashOf(E.clockSalt, pw).then(h => {
        E.clockHash = h;
        b.click();
      });
    }
    if (!E.name.trim()) return toast("Enter the employee's name.");
    if (E.type === "Casual" ? !(+E.dayRate > 0) : !(+E.basic >= 0) || E.basic === "")
      return toast(E.type === "Casual" ? "Enter the day rate." : "Enter the basic pay.");
    if (E.idNo && H.emps.some(x => x.id !== E.id && x.idNo === E.idNo))
      return toast(`ID ${E.idNo} is already on another employee.`);
    if (E.end && E.start && E.end < E.start)
      return toast("The contract can't end before it starts.");
    E.name = E.name.trim();
    E.kra = (E.kra || "").trim().toUpperCase();
    if (E.id) Object.assign(hrEmp(E.id), E);
    else {
      H.seq = (H.seq || 0) + 1;
      H.emps.push({ ...E, id: nid("E") + H.seq, no: "EMP-" + String(H.seq).padStart(3, "0") });
    }
    auditAdd("Employee", `${E.name} ${E.id ? "updated" : "added"}`, { mod: "HR" });
    hrS.emp = null;
    bosave();
    toast(`${E.name} saved.`);
    return all();
  }
  if (a === "hr_clock") {
    const e = hrEmp(v("hrCk")),
      day = ymdOf(new Date()),
      now = new Date().toTimeString().slice(0, 5),
      open = H.time.find(t => t.emp === e.id && !t.out);
    if (!open && shiftRole(USERS.find(u => u.n === e.user)))
      return toast(
        `${e.name}'s hours come from their POS shift. Use Add a missed entry to correct them.`
      );
    if (open) open.out = now;
    else H.time.push({ id: nid("T"), emp: e.id, date: day, in: now, out: "", by: boUser.n });
    bosave();
    toast(`${e.name} clocked ${open ? "out" : "in"} at ${now}.`);
    return all();
  }
  if (a === "hr_tadd") {
    if (!v("hrTD") || !v("hrTI")) return toast("Enter the date and the time in.");
    H.time.push({
      id: nid("T"),
      emp: v("hrTE"),
      date: v("hrTD"),
      in: v("hrTI"),
      out: v("hrTO"),
      by: boUser.n,
      src: "Added by hand"
    });
    auditAdd(
      "Attendance",
      `${hrEmp(v("hrTE")).name} · ${v("hrTD")} ${v("hrTI")}-${v("hrTO")} added by ${boUser.n}`,
      { mod: "HR" }
    );
    bosave();
    toast("Entry added.");
    return all();
  }
  if (a === "hr_tdel") {
    H.time = H.time.filter(t => t.id !== d.id);
    auditAdd("Attendance", `An attendance entry was removed by ${boUser.n}`, { mod: "HR" });
    bosave();
    return all();
  }
  if (a === "hr_timev") {
    hrS.timeV = d.v;
    return all();
  }
  if (a === "hr_timexl") {
    const E = hrEmps();
    return hrExcel(
      `Attendance ${hrMonthName(hrS.month)}`,
      ["Employee", "#Days present", "#Hours", "#Overtime", "#Late", "#On leave"],
      E.map(e => {
        const M = hrMonthTime(e, hrS.month);
        return [e.name, M.present, M.hours, M.ot, M.late, M.leave];
      }),
      null,
      `Attendance_${hrS.month}`
    );
  }
  if (a === "hr_lvadd") {
    const from = v("hrLF"),
      to = v("hrLU");
    if (!from || !to) return toast("Choose the leave dates.");
    if (to < from) return toast("The leave can't end before it starts.");
    const days = hrLeaveCount(from, to),
      emp = v("hrLE"),
      clash = H.leave.find(
        l => l.emp === emp && l.status !== "Rejected" && l.from <= to && l.to >= from
      );
    if (!days) return toast("Those dates are all Sundays.");
    if (clash) return toast(`Those dates overlap leave from ${dateGB(clash.from)}.`);
    const type = v("hrLT");
    if (type === "Annual" && days > hrLeaveBal(hrEmp(emp), from).left)
      toast(
        `Note: that's more than the ${qn(hrLeaveBal(hrEmp(emp), from).left)} days earned so far.`
      );
    const l = {
      id: nid("LV"),
      at: new Date().toISOString(),
      emp,
      type,
      from,
      to,
      days,
      why: v("hrLW"),
      by: boUser.n,
      status: AWAIT
    };
    H.leave.push(l);
    docOpen("plv", l.id);
    bosave();
    return all();
  }
  if (a === "hr_ask") {
    const T = {
      lvok: ["Approve leave", ""],
      lvno: ["Reject leave", ""],
      dedno: ["Remove this deduction", "It will no longer come off the employee's pay."],
      runok: [
        "Approve payroll",
        "This locks the month and posts it to Accounts. It can't be undone."
      ],
      advok: ["Approve advance", "The money is paid out now and comes back through payroll."],
      advno: ["Reject advance", ""],
      swapok: ["Approve shift swap", ""],
      swapno: ["Reject shift swap", ""],
      exitok: [
        "Approve final pay",
        "This marks them as having left and posts to Accounts. It can't be undone."
      ]
    }[d.act];
    hrS.pin = { act: d.act, id: d.id, title: T[0], note: T[1] };
    return all();
  }
  if (a === "hr_pinno") {
    hrS.pin = null;
    return all();
  }
  if (a === "hr_pinok") {
    const m = USERS.find(u => u.role === "Manager" && u.pin === v("hrPinI"));
    if (!m) {
      $("#hrPinI").value = "";
      return toast("That is not a manager's PIN.");
    }
    const P = hrS.pin;
    hrS.pin = null;
    return hrDone(P, m.n);
  }
  if (a === "hr_advadd") {
    const emp = v("hrAE"),
      amt = parseFloat(v("hrAA")),
      inst = parseFloat(v("hrAI")) || amt;
    if (!(amt > 0)) return toast("Enter the amount.");
    if (inst > amt) return toast("The monthly repayment can't be more than the advance.");
    H.adv.push({
      id: nid("AD"),
      at: new Date().toISOString(),
      emp,
      amt,
      inst,
      left: 0,
      from: v("hrAF"),
      why: v("hrAW"),
      by: boUser.n,
      status: AWAIT
    });
    auditAdd("Advance payment", `${hrEmp(emp).name} asked for KES ${m2(amt)}`, { mod: "HR" });
    bosave();
    toast("Sent for a manager's approval.");
    return all();
  }
  if (a === "hr_advrepay") {
    const x = H.adv.find(y => y.id === d.id),
      amt = parseFloat(v("hrRp_" + d.id));
    if (!(amt > 0)) return toast("Enter the amount repaid.");
    if (amt > x.left + 0.004) return toast(`Only KES ${m2(x.left)} is still owed.`);
    const err = acPost({
      date: ymdOf(new Date()),
      narr: `Advance repaid by ${(hrEmp(x.emp) || {}).name}`,
      ref: x.id,
      src: "Payroll",
      lines: [
        { a: x.from || "1000", dr: amt, cr: 0 },
        { a: "1220", dr: 0, cr: amt }
      ]
    });
    if (err) return toast(err);
    x.left = hrRound(x.left - amt);
    (x.repaid = x.repaid || []).push({ date: ymdOf(new Date()), amt });
    bosave();
    toast(`KES ${m2(amt)} repaid. KES ${m2(x.left)} still owed.`);
    return all();
  }
  if (a === "hr_lnadd") {
    const emp = v("hrLnE"),
      kind = v("hrLnK"),
      monthly = parseFloat(v("hrLnM")),
      bal = parseFloat(v("hrLnB"));
    if (!(monthly > 0)) return toast("Enter the amount per month.");
    if (kind === "Staff loan" && !(bal > 0)) return toast("Enter the loan amount as the balance.");
    if (bal > 0 && monthly > bal)
      return toast("The monthly amount can't be more than the balance.");
    if (kind === "Staff loan") {
      const err = acPost({
        date: ymdOf(new Date()),
        narr: `Staff loan to ${hrEmp(emp).name}`,
        src: "Payroll",
        who: hrEmp(emp).name,
        lines: [
          { a: "1220", dr: bal, cr: 0 },
          { a: v("hrLnF"), dr: 0, cr: bal }
        ]
      });
      if (err) return toast(err);
      docOpen("acv", acS().jv[acS().jv.length - 1].id);
    }
    (H.recur = H.recur || []).push({
      id: nid("LN"),
      at: new Date().toISOString(),
      emp,
      kind,
      monthly,
      left: bal > 0 ? bal : null,
      ref: v("hrLnR"),
      by: boUser.n
    });
    auditAdd("Payroll", `${hrEmp(emp).name} · ${kind} KES ${m2(monthly)} a month`, { mod: "HR" });
    bosave();
    toast(`${kind} added.`);
    return all();
  }
  if (a === "hr_lnstop") {
    const x = (H.recur || []).find(y => y.id === d.id);
    x.on = false;
    auditAdd("Payroll", `${(hrEmp(x.emp) || {}).name} · ${x.kind} stopped by ${boUser.n}`, {
      mod: "HR"
    });
    bosave();
    return all();
  }
  if (a === "hr_adj") {
    hrS.adj = hrS.adj === d.id ? "" : d.id;
    return all();
  }
  if (a === "hr_slipmail") {
    const run = runOf(),
      S = hrSlips().filter(s => s.run === run),
      go = async () => {
        let sent = 0,
          skip = 0,
          bad = "";
        toast("Sending payslips…");
        for (const s of S) {
          const e = hrEmp(s.line.emp) || {};
          if (!e.email) {
            skip++;
            continue;
          }
          const spec = docSpec("pslip", s),
            err = await docMailPost(
              e.email,
              `Payslip for ${hrMonthName(s.period)} from ${spec.co.name}`,
              `Dear ${s.line.name},\n\nPlease find attached your payslip for ${hrMonthName(s.period)}.\n\nRegards,\n${boUser.n}\n${spec.co.name}`,
              docFile(spec, s),
              spec
            );
          if (err) {
            bad = err.msg;
            break;
          }
          (s.line.mailed = s.line.mailed || []).push({
            to: e.email,
            at: new Date().toISOString(),
            by: boUser.n
          });
          sent++;
        }
        auditAdd("Payslip emailed", `${run.id} · ${sent} sent, ${skip} with no email`, {
          ref: run.id,
          mod: "HR"
        });
        bosave();
        toast(
          bad
            ? `${sent} sent, then stopped. ${bad}`
            : `${sent} payslips emailed.${skip ? ` ${skip} have no email address.` : ""}`
        );
      };
    return tapConfirm(b, go, "Send them all?");
  }
  if (a === "hr_reck") {
    hrS.rec = d.k;
    return all();
  }
  if (a === "hr_recadd") {
    const k = hrS.rec,
      C = HR_REC[k],
      val = n => {
        const el = document.querySelector(`#vSub [data-hrf="${n}"]`);
        return el ? el.value.trim() : "";
      },
      r = { id: nid("HR"), at: new Date().toISOString(), emp: val("emp"), by: boUser.n };
    C.f.forEach(([n, , t]) => {
      if (t !== "file") r[n] = val(n);
    });
    const first = C.f.find(([, , t]) => t !== "file" && !Array.isArray(t));
    if (first && !r[first[0]]) return toast(`Enter ${first[1].toLowerCase()}.`);
    const fileEl = document.querySelector('#vSub [data-hrf="file"]'),
      file = fileEl && fileEl.files[0],
      save = () => {
        hrRecs(k).push(r);
        auditAdd("Staff record", `${(hrEmp(r.emp) || {}).name} · ${C.t}`, { mod: "HR" });
        bosave();
        toast("Added.");
        all();
      };
    if (k === "doc" && !file) return toast("Choose the file.");
    if (!file) return save();
    if (file.size > 5 * 1024 * 1024) return toast("The file is over 5 MB.");
    r.fileName = file.name;
    return hrFiles
      .put(r.id, file)
      .then(save)
      .catch(() => toast("The file could not be saved on this computer."));
  }
  if (a === "hr_recfile") {
    const r = hrRecs("doc").find(x => x.id === d.id);
    return hrFiles.get(d.id).then(f => {
      if (!f) return toast("That file isn't on this computer.");
      const url = URL.createObjectURL(f),
        l = document.createElement("a");
      l.href = url;
      l.download = r.fileName;
      l.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    });
  }
  if (a === "hr_recback") {
    hrRecs("asset").find(x => x.id === d.id).back = ymdOf(new Date());
    bosave();
    return all();
  }
  if (a === "hr_recchg") {
    const r = hrRecs("asset").find(x => x.id === d.id),
      amt = hrRound((+r.value || 0) * (+r.qty || 1));
    if (!(amt > 0)) return toast("Enter a value for this item first.");
    H.charges.push({
      id: nid("CH"),
      kind: "other",
      at: new Date().toISOString(),
      emp: r.emp,
      amt,
      left: amt,
      note: `Not returned: ${r.item}`,
      by: boUser.n
    });
    r.back = ymdOf(new Date());
    auditAdd("Payroll", `${(hrEmp(r.emp) || {}).name} · charged KES ${m2(amt)} for ${r.item}`, {
      mod: "HR"
    });
    bosave();
    toast(`KES ${m2(amt)} added to what they owe.`);
    return all();
  }
  if (a === "hr_recdel")
    return tapConfirm(
      b,
      () => {
        H.rec[d.k] = hrRecs(d.k).filter(x => x.id !== d.id);
        if (d.k === "doc") hrFiles.del(d.id).catch(() => {});
        auditAdd(
          "Staff record",
          `A ${HR_REC[d.k].t.toLowerCase()} record was removed by ${boUser.n}`,
          { mod: "HR", pri: "Important" }
        );
        bosave();
        all();
      },
      "Remove?"
    );
  if (a === "hr_rosprev") {
    const mon = hrMonday(hrS.week || ymdOf(new Date())),
      back = ymdOf(new Date(new Date(mon + "T12:00:00").getTime() - 7 * 864e5)),
      Rs = hrRoster(),
      from = hrWeek(back),
      to = hrWeek(mon);
    hrEmps().forEach(e =>
      from.forEach((day, i) => (Rs[`${e.id}|${to[i]}`] = Rs[`${e.id}|${day}`] || ""))
    );
    bosave();
    toast("Last week copied.");
    return all();
  }
  if (a === "hr_rospr") {
    const W = hrWeek(hrMonday(hrS.week || ymdOf(new Date()))),
      Rs = hrRoster(),
      title = `Duty roster, week of ${dateGB(W[0])}`;
    return stPrint(
      title,
      `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>${esc(title)}</h2></div><table class="st-t"><thead><tr><th>Employee</th>${W.map(x => `<th>${hrDayName(x)}</th>`).join("")}</tr></thead><tbody>${hrEmps()
        .map(
          e =>
            `<tr><td>${esc(e.name)}</td>${W.map(x => `<td>${esc(Rs[`${e.id}|${x}`] || "-")}</td>`).join("")}</tr>`
        )
        .join("")}</tbody></table><div class="st-foot"><span>${printedBy()}</span></div></div>`
    );
  }
  if (a === "hr_swapadd") {
    if (!v("hrSD")) return toast("Choose the date.");
    if (v("hrSA") === v("hrSB")) return toast("Choose two different people.");
    hrSwaps().push({
      id: nid("SW"),
      a: v("hrSA"),
      b: v("hrSB"),
      date: v("hrSD"),
      status: AWAIT,
      by: boUser.n
    });
    bosave();
    toast("Sent for a manager's approval.");
    return all();
  }
  if (a === "hr_exitpay") {
    const run = runOf(),
      from = v("hrFF_" + d.id),
      paidOn = v("hrFD_" + d.id) || ymdOf(new Date());
    if (!from) return toast("Choose the account it was paid from.");
    const err = acPost({
      date: paidOn,
      narr: `Final pay paid to ${run.lines[0].name}`,
      ref: v("hrFR_" + d.id) || run.id,
      src: "Payroll",
      who: run.lines[0].name,
      lines: [
        { a: "2300", dr: run.lines[0].net, cr: 0 },
        { a: from, dr: 0, cr: run.lines[0].net }
      ]
    });
    if (err) return toast(err);
    run.status = "Paid";
    run.paidOn = paidOn;
    run.paidFrom = from;
    run.payRef = v("hrFR_" + d.id);
    auditAdd("Payroll", `Final pay of KES ${m2(run.lines[0].net)} paid to ${run.lines[0].name}`, {
      ref: run.id,
      mod: "HR",
      pri: "Important"
    });
    docOpen("pbslip", `${run.id}-${run.lines[0].no}`);
    bosave();
    toast("Final pay marked as paid. Here's the bank slip.");
    return all();
  }
  if (a === "hr_holadd") {
    if (!v("hrHD") || !v("hrHN")) return toast("Enter the date and the name.");
    H.holidays = [...hrHolidays(), [v("hrHD"), v("hrHN")]];
    bosave();
    return all();
  }
  if (a === "hr_holdel") {
    H.holidays = hrHolidays().filter(([x]) => x !== d.k);
    bosave();
    return all();
  }
  if (a === "hr_dedadd") {
    const amt = parseFloat(v("hrDA"));
    if (!(amt > 0)) return toast("Enter the amount.");
    if (!v("hrDN")) return toast("Say what it's for.");
    H.charges.push({
      id: nid("CH"),
      kind: "other",
      at: new Date().toISOString(),
      emp: v("hrDE"),
      amt,
      left: amt,
      note: v("hrDN"),
      by: boUser.n
    });
    auditAdd("Payroll", `${hrEmp(v("hrDE")).name} · deduction KES ${m2(amt)} · ${v("hrDN")}`, {
      mod: "HR"
    });
    bosave();
    toast("Deduction added.");
    return all();
  }
  if (a === "hr_runnew") {
    const p = hrS.period,
      list = hrEmps();
    if (!list.length) return toast("Add an employee first.");
    H.runs.push({
      id: "PAY-" + p,
      period: p,
      at: new Date().toISOString(),
      by: boUser.n,
      status: "Draft",
      lines: list.map(e => hrNewLine(e, p))
    });
    hrSplitSvc(H.runs[H.runs.length - 1]);
    bosave();
    return all();
  }
  if (a === "hr_runfresh") {
    const run = runOf();
    run.lines = hrEmps().map(e =>
      hrNewLine(e, run.period, { bonus: (run.lines.find(l => l.emp === e.id) || {}).bonus })
    );
    hrSplitSvc(run);
    bosave();
    toast("Refreshed from attendance, leave and what staff owe.");
    return all();
  }
  if (a === "hr_rundel") {
    H.runs = H.runs.filter(r => r.id !== d.id);
    bosave();
    return all();
  }
  if (a === "hr_runopen") {
    hrS.period = d.p;
    return all();
  }
  if (a === "hr_runpay") {
    const run = runOf(),
      from = v("hrPF"),
      date = v("hrPD");
    if (!from) return toast("Choose the account it was paid from.");
    const err = acPost({
      date,
      narr: `Salaries paid for ${hrMonthName(run.period)}`,
      ref: run.id,
      src: "Payroll",
      lines: [
        { a: "2300", dr: hrRunTotals(run).net, cr: 0 },
        { a: from, dr: 0, cr: hrRunTotals(run).net }
      ]
    });
    if (err) return toast(err);
    run.status = "Paid";
    run.paidOn = date;
    run.paidFrom = from;
    run.payRef = v("hrPR");
    docOpen("pbank", run.id);
    bosave();
    toast(`${hrMonthName(run.period)} marked as paid.`);
    return all();
  }
  if (a === "hr_slipsall") {
    const run = runOf(),
      S = hrSlips().filter(s => s.run === run);
    return docWindow(
      `Payslips ${hrMonthName(run.period)}`,
      `@page{size:A4;margin:10mm}body{margin:0}${DOC_CSS}.a4{width:auto;min-height:calc(297mm - 21mm);padding:0;break-after:page}`,
      S.map(s => docHTML(docSpec("pslip", s))).join("")
    );
  }
  if (a === "hr_runxl") {
    const run = runOf();
    return hrExcel(
      `Payroll ${hrMonthName(run.period)}`,
      [
        "Employee",
        "KRA PIN",
        "#Gross",
        "#NSSF",
        "#SHA",
        "#Housing",
        "#PAYE",
        "#Other",
        "#Net pay",
        "Paid by",
        "Bank",
        "Account or phone"
      ],
      run.lines.map(l => [
        l.name,
        l.kra,
        l.gross,
        l.nssf,
        l.sha,
        l.ahl,
        l.paye,
        l.others,
        l.net,
        l.via,
        l.via === "Bank" ? l.bank : "",
        l.via === "Bank" ? l.acct : l.mpesa
      ]),
      null,
      `Payroll_${run.period}`
    );
  }
  if (a === "hr_statk") {
    hrS.stat = d.k;
    return all();
  }
  if (a === "hr_statxl" || a === "hr_statpr") {
    const D = hrStatData();
    if (!D.r.length) return toast("There is no approved payroll for this month.");
    const title = `${D.title} return, ${hrMonthName(D.p)}`;
    if (a === "hr_statxl") return hrExcel(title, D.c, D.r, D.f, `${D.title}_${D.p}`);
    const n = h => (h[0] === "#" ? ' class="n"' : "");
    return stPrint(
      title,
      `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>${esc(title)}</h2></div><table class="st-t"><thead><tr>${D.c.map(h => `<th${n(h)}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${D.r.map(x => `<tr>${x.map((v2, i) => `<td${n(D.c[i])}>${esc(v2)}</td>`).join("")}</tr>`).join("")}<tr class="st-tot">${D.f.map((v2, i) => `<td${n(D.c[i])}>${esc(v2)}</td>`).join("")}</tr></tbody></table><div class="st-foot"><span>${printedBy()}</span></div></div>`
    );
  }
  if (a === "hr_ratesave") {
    const R = {
      ...hrR(),
      bands: hrR().bands.map(b => [...b]),
      shifts: hrR().shifts.map(s => ({ ...s }))
    };
    document.querySelectorAll("#vSub [data-hsh]").forEach(x => {
      const [i, f] = x.dataset.hsh.split(".");
      R.shifts[+i][f] = x.value;
    });
    document.querySelectorAll("#vSub [data-hr]").forEach(x => {
      R[x.dataset.hr] =
        x.type === "checkbox"
          ? x.checked
          : x.type === "number"
            ? parseFloat(x.value) || 0
            : x.value;
    });
    document.querySelectorAll("#vSub [data-hb]").forEach(x => {
      const [i, j] = x.dataset.hb.split(".");
      R.bands[+i][+j] = parseFloat(x.value) || 0;
    });
    H.rates = R;
    auditAdd("Payroll", `Rates changed by ${boUser.n}`, { mod: "HR", pri: "Important" });
    bosave();
    toast("Rates saved. Drafts pick them up when refreshed.");
    return all();
  }
  if (a === "hr_ratereset") {
    delete H.rates;
    bosave();
    toast("Back to the 2026 rates.");
    return all();
  }
}
document.addEventListener("input", e => {
  const s = e.target.dataset || {};
  if (s.he !== undefined && hrS.emp) {
    hrS.emp[s.he] = e.target.value;
    const el = $("#hrEst");
    if (el) el.innerHTML = hrEstText(hrS.emp);
  }
  if (e.target.id === "hrQ") {
    hrS.q = e.target.value;
    const q = hrS.q.trim().toLowerCase();
    document
      .querySelectorAll("#vSub .hr-t tr[data-s]")
      .forEach(r => (r.hidden = q && !r.dataset.s.includes(q)));
  }
});
document.addEventListener("change", e => {
  const s = e.target.dataset || {};
  if (s.he !== undefined && hrS.emp) hrS.emp[s.he] = e.target.value;
  if (s.hs) {
    hrS[s.hs] = e.target.value;
    all();
  }
  if (s.hsvc) {
    const run = hrRuns().find(r => r.id === s.hsvc);
    run.svcPool = Math.max(0, parseFloat(e.target.value) || 0);
    hrSplitSvc(run);
    bosave();
    all();
  }
  if (s.hr2) {
    const [i, j] = s.hr2.split("."),
      run = hrRuns().find(r => r.period === hrS.period && !r.off);
    run.lines[+i].recur[+j].take = Math.max(0, parseFloat(e.target.value) || 0);
    hrCalc(run.lines[+i]);
    bosave();
    all();
  }
  if (s.hx) {
    hrS.exit[s.hx] = e.target.value;
    all();
  }
  if (s.hro) {
    hrRoster()[s.hro] = e.target.value;
    bosave();
    all();
  }
  if (s.hl) {
    const [i, f] = s.hl.split("."),
      run = hrRuns().find(r => r.period === hrS.period && !r.off);
    if (!run || run.status !== "Draft") return;
    run.lines[+i][f] = Math.max(0, parseFloat(e.target.value) || 0);
    hrCalc(run.lines[+i]);
    bosave();
    all();
  }
});
const hrStatPills = () => [...Object.entries(HR_STAT), ["p9", ["P9 forms"]]];
function hrP9HTML() {
  const L = hrP9List().sort(
    (a, b) => b.year.localeCompare(a.year) || a.emp.name.localeCompare(b.emp.name)
  );
  return `<div class="pn"><div class="pr-pills">${hrStatPills()
    .map(
      ([k, v]) =>
        `<button class="pr-pill ${k === hrS.stat ? "on" : ""}" data-a="hr_statk" data-k="${k}">${esc(v[0])}</button>`
    )
    .join("")}</div>${hrTbl(
    ["Year", "Employee", "KRA PIN", ""],
    L.map(
      P =>
        `<tr><td>${P.year}</td><td><b>${esc(P.emp.name)}</b></td><td>${esc(P.emp.kra || "-")}</td><td class="n">${docBtn("p9", P.id, "View P9")}</td></tr>`
    ),
    "P9 forms appear once a payroll has been approved."
  )}</div>`;
}

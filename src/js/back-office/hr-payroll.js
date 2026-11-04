// ---- HR & Payroll: the data, the statutory sums, and running a month's payroll ----
// Kept in FD_SETTINGS.hr: emps, time, leave, charges (waiter bills and one-off deductions), adv, runs, rates.
const HR_RATES = {
  nssfRate: 6, // % each from employee and employer
  nssfLel: 9000, // Year 4 limits, from February 2026
  nssfUel: 108000,
  shaRate: 2.75,
  shaMin: 300,
  ahlRate: 1.5, // employee, and the same again from the employer
  nita: 50, // employer, per employee a month
  relief: 2400,
  bands: [
    [24000, 10],
    [32333, 25],
    [500000, 30],
    [800000, 32.5],
    [0, 35] // everything above the last limit
  ],
  hoursMonth: 225, // for the hourly rate behind overtime
  otRate: 1.5,
  hoursDay: 8,
  workStart: "08:00",
  lateMins: 15,
  annualLeave: 21,
  holRate: 2, // a public holiday worked, as a multiple of normal pay
  advMax: 50, // flag an advance over this % of basic
  tipsInPay: true,
  commInPay: true,
  shifts: [
    { n: "Morning", s: "06:00", e: "14:00" },
    { n: "Evening", s: "14:00", e: "22:00" },
    { n: "Night", s: "22:00", e: "06:00" }
  ]
};
// Fixed by law. Easter, Idd and any others the government gazettes get added under Rates and rules.
const HR_HOLIDAYS = [
  ["01-01", "New Year's Day"],
  ["05-01", "Labour Day"],
  ["06-01", "Madaraka Day"],
  ["10-10", "Mazingira Day"],
  ["10-20", "Mashujaa Day"],
  ["12-12", "Jamhuri Day"],
  ["12-25", "Christmas Day"],
  ["12-26", "Boxing Day"]
];
function hr() {
  const H = FD_SETTINGS.hr || (FD_SETTINGS.hr = {});
  ["emps", "time", "leave", "charges", "adv", "runs"].forEach(k => (H[k] = H[k] || []));
  return H;
}
const hrR = () => ({ ...HR_RATES, ...(hr().rates || {}) });
const hrEmps = () => hr().emps.filter(e => e.status !== "Left");
const hrEmp = id => hr().emps.find(e => e.id === id);
const hrRound = n => Math.round(n * 100) / 100;
/** Allowances added together. */
const hrAllow = e => (+e.house || 0) + (+e.transport || 0) + (+e.otherAllow || 0);
/** PAYE on a month's taxable pay, before relief. */
function hrPayeBefore(taxable, R = hrR()) {
  let tax = 0,
    from = 0;
  for (const [to, pct] of R.bands) {
    const top = to || Infinity;
    if (taxable <= from) break;
    tax += ((Math.min(taxable, top) - from) * pct) / 100;
    from = top;
  }
  return tax;
}
/** Everything the law takes from one month's gross pay. */
function hrStatutory(gross, R = hrR()) {
  const g = Math.max(0, gross),
    t1 = (Math.min(g, R.nssfLel) * R.nssfRate) / 100,
    t2 = (Math.max(0, Math.min(g, R.nssfUel) - R.nssfLel) * R.nssfRate) / 100,
    nssf = hrRound(t1 + t2),
    sha = g > 0 ? hrRound(Math.max(R.shaMin, (g * R.shaRate) / 100)) : 0,
    ahl = hrRound((g * R.ahlRate) / 100),
    // NSSF, SHA and the Housing Levy all come off before tax.
    taxable = Math.max(0, hrRound(g - nssf - sha - ahl)),
    before = hrRound(hrPayeBefore(taxable, R)),
    paye = Math.max(0, hrRound(before - R.relief));
  return { t1: hrRound(t1), t2: hrRound(t2), nssf, sha, ahl, taxable, before, paye };
}
const hrMonthName = p =>
  new Date(p + "-15T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const hrPeriodNow = () => ymdOf(new Date()).slice(0, 7);
const hrDays = (from, to) => {
  const out = [];
  for (
    let d = new Date(from + "T12:00:00"), e = new Date(to + "T12:00:00");
    d <= e;
    d.setDate(d.getDate() + 1)
  )
    out.push(ymdOf(d));
  return out;
};
const hrMonthEnd = p => {
  const [y, m] = p.split("-").map(Number);
  return ymdOf(new Date(y, m, 0, 12));
};
const hrHolidays = () => hr().holidays || HR_HOLIDAYS;
const isHrHoliday = day => hrHolidays().some(([d]) => d === day || d === day.slice(5));
/** Leave days: every day but Sundays and public holidays. */
const hrLeaveCount = (from, to) =>
  hrDays(from, to).filter(d => new Date(d + "T12:00:00").getDay() !== 0 && !isHrHoliday(d)).length;
const hrOnLeave = (id, day) =>
  hr().leave.find(l => l.emp === id && l.status === "Approved" && l.from <= day && l.to >= day);
/** Annual leave earned so far this year, less what's been taken. */
function hrLeaveBal(e, day = ymdOf(new Date())) {
  const y = day.slice(0, 4),
    start = e.start && e.start.slice(0, 4) === y ? +e.start.slice(5, 7) : 1,
    months = Math.max(0, +day.slice(5, 7) - start + 1),
    earned = hrRound((months * (+e.leaveYear || hrR().annualLeave)) / 12),
    taken = hr()
      .leave.filter(
        l =>
          l.emp === e.id &&
          l.status === "Approved" &&
          l.type === "Annual" &&
          l.from.slice(0, 4) === y
      )
      .reduce((a, l) => a + l.days, 0);
  return { earned, taken, left: hrRound(earned - taken) };
}
// ---------------------------------------------------------------- time
/** A person's clocking for one day: from the time sheet, and from their POS shifts. */
/** When someone should start: their rostered shift, or the normal start. */
function hrStartOf(e, day) {
  const on = (hr().roster || {})[`${e.id}|${day}`],
    s = hrR().shifts.find(x => x.n === on);
  return s ? s.s : hrR().workStart;
}
function hrDayTime(e, day) {
  const R = hrR(),
    rows = hr()
      .time.filter(t => t.emp === e.id && t.date === day)
      .map(t => ({ in: t.in, out: t.out, src: t.src || "Time sheet", id: t.id })),
    pos = e.user
      ? (typeof SHIFTS === "undefined" ? [] : SHIFTS)
          .filter(s => s.user === e.user && ymdOf(new Date(s.openedAt)) === day)
          .map(s => ({
            in: new Date(s.openedAt).toTimeString().slice(0, 5),
            // A shift the day closed for them ended when they last signed out.
            out: s.closedAt
              ? new Date(s.closedBy === "Day end" && s.lastOut ? s.lastOut : s.closedAt)
                  .toTimeString()
                  .slice(0, 5)
              : "",
            src: "POS shift"
          }))
      : [],
    all2 = [...rows, ...pos].sort((a, b) => a.in.localeCompare(b.in)),
    toMin = x => {
      const [h, m] = x.split(":").map(Number);
      return h * 60 + m;
    },
    mins = (a, b) => (toMin(b) - toMin(a) + 1440) % 1440, // past midnight wraps round
    // Time on the sheet and on a POS shift can overlap. It only counts once.
    spans = all2
      .filter(x => x.out)
      .map(x => [toMin(x.in), toMin(x.in) + mins(x.in, x.out)])
      .sort((x, y) => x[0] - y[0]),
    worked = spans.reduce(
      (S, [s, e]) => {
        const from = Math.max(s, S.end);
        return { end: Math.max(S.end, e), total: S.total + Math.max(0, e - from) };
      },
      { end: 0, total: 0 }
    ).total,
    hours = hrRound(worked / 60),
    first = all2[0],
    late =
      first &&
      mins(hrStartOf(e, day), first.in) < 720 &&
      mins(hrStartOf(e, day), first.in) > R.lateMins;
  return {
    rows: all2,
    in: first ? first.in : "",
    out: all2.length ? all2[all2.length - 1].out : "",
    hours,
    ot: hrRound(Math.max(0, hours - R.hoursDay)),
    late: !!late,
    open: all2.some(x => !x.out)
  };
}
/** A person's month in one line. */
function hrMonthTime(e, p) {
  const end = hrMonthEnd(p),
    today = ymdOf(new Date()),
    S = { present: 0, hours: 0, ot: 0, late: 0, leave: 0, hol: 0 };
  hrDays(p + "-01", end < today ? end : today).forEach(d => {
    const T = hrDayTime(e, d);
    if (T.rows.length) S.present++;
    S.hours += T.hours;
    S.ot += T.ot;
    if (T.late) S.late++;
    if (isHrHoliday(d)) S.hol += T.hours;
    if (hrOnLeave(e.id, d)) S.leave++;
  });
  S.hours = hrRound(S.hours);
  S.ot = hrRound(S.ot);
  return S;
}
// ---------------------------------------------------------------- the payroll run
const hrChargesOpen = (id, kind) =>
  hr().charges.filter(c => c.emp === id && c.kind === kind && c.left > 0.004);
const hrOwes = (id, kind) => hrRound(hrChargesOpen(id, kind).reduce((a, c) => a + c.left, 0));
const hrAdvOpen = id =>
  hr().adv.filter(
    a => a.emp === id && a.left > 0.004 && a.status !== AWAIT && a.status !== "Rejected"
  );
const hrRecurOpen = id =>
  (hr().recur || []).filter(
    x => x.emp === id && x.on !== false && (x.left === null || x.left > 0.004)
  );
function hrUnpaidDays(id, p) {
  const end = hrMonthEnd(p);
  return hr()
    .leave.filter(l => l.emp === id && l.status === "Approved" && l.type === "Unpaid")
    .reduce((a, l) => a + hrDays(l.from, l.to).filter(d => d >= p + "-01" && d <= end).length, 0);
}
/** Sales commission and tips for someone with a POS sign-in, over a month. */
function hrSalesPay(e, p) {
  if (!e.user || typeof SALES === "undefined") return { commission: 0, tips: 0 };
  const R = hrR(),
    L = SALES.filter(
      s => (s.waiter || s.user) === e.user && ymdOf(new Date(s.at)).slice(0, 7) === p
    ),
    rate = R.commInPay ? +commRate(e.user) || 0 : 0;
  return {
    commission: hrRound(L.reduce((a, s) => a + (s.g * rate) / 100, 0)),
    tips: R.tipsInPay
      ? hrRound(L.reduce((a, s) => a + Object.values(s.tips || {}).reduce((x, v) => x + v, 0), 0))
      : 0
  };
}
/** The sums on one line of a run. */
function hrCalc(L) {
  const R = hrR();
  if (L.dayRate) L.basic = hrRound((+L.casDays || 0) * L.dayRate);
  const hourly = L.dayRate ? L.dayRate / R.hoursDay : R.hoursMonth ? L.basic / R.hoursMonth : 0;
  L.ot = hrRound((+L.otHrs || 0) * hourly * R.otRate);
  // Salaried staff are already paid for the day, so a holiday adds what's over one normal rate.
  L.holPay = hrRound((+L.holHrs || 0) * hourly * Math.max(0, R.holRate - 1));
  L.unpaid = L.dayRate ? 0 : hrRound(((+L.unpaidDays || 0) * L.basic) / 30);
  L.extras = hrRound((+L.commission || 0) + (+L.tips || 0) + (+L.svc || 0) + L.holPay);
  L.gross = hrRound(
    L.basic + L.house + L.transport + L.otherAllow + L.ot + (+L.bonus || 0) + L.extras - L.unpaid
  );
  const S = hrStatutory(L.gross, R);
  Object.assign(L, S);
  L.nssfEr = S.nssf;
  L.ahlEr = S.ahl;
  L.nitaEr = L.gross > 0 ? R.nita : 0;
  L.statutory = hrRound(S.nssf + S.sha + S.ahl + S.paye);
  L.recurTake = hrRound((L.recur || []).reduce((a, x) => a + (+x.take || 0), 0));
  L.others = hrRound((+L.billTake || 0) + (+L.advTake || 0) + (+L.otherTake || 0) + L.recurTake);
  L.totalDed = hrRound(L.statutory + L.others);
  L.net = hrRound(L.gross - L.totalDed);
  // The Employment Act stops total deductions going over two thirds of wages.
  L.overCap = L.totalDed > (L.gross * 2) / 3 + 0.004;
  return L;
}
function hrNewLine(e, p, keep = {}) {
  const T = hrMonthTime(e, p),
    casual = e.type === "Casual" && +e.dayRate > 0,
    P = hrSalesPay(e, p),
    L = {
      emp: e.id,
      no: e.no,
      name: e.name,
      job: e.job || "",
      dept: e.dept || "",
      kra: e.kra || "",
      nssfNo: e.nssfNo || "",
      shaNo: e.shaNo || "",
      via: e.via || "Bank",
      bank: e.bank || "",
      branch: e.branch || "",
      acct: e.acct || "",
      mpesa: e.mpesa || "",
      basic: casual ? 0 : +e.basic || 0,
      dayRate: casual ? +e.dayRate : 0,
      casDays: keep.casDays !== undefined ? keep.casDays : T.present,
      house: casual ? 0 : +e.house || 0,
      transport: casual ? 0 : +e.transport || 0,
      otherAllow: casual ? 0 : +e.otherAllow || 0,
      otHrs: keep.otHrs !== undefined ? keep.otHrs : T.ot,
      holHrs: keep.holHrs !== undefined ? keep.holHrs : T.hol,
      bonus: keep.bonus || 0,
      commission: keep.commission !== undefined ? keep.commission : P.commission,
      tips: keep.tips !== undefined ? keep.tips : P.tips,
      svc: 0,
      svcPts: e.svcPts === "" || e.svcPts === undefined ? (casual ? 0 : 1) : +e.svcPts,
      unpaidDays: hrUnpaidDays(e.id, p),
      billTake: 0,
      advTake: 0,
      otherTake: 0,
      recur: []
    };
  hrCalc(L);
  // Take what's owed, but leave room under the two-thirds limit. The rest waits for next month.
  let room = Math.max(0, (L.gross * 2) / 3 - L.statutory);
  const take = owed => {
    const t = hrRound(Math.min(owed, room));
    room -= t;
    return t;
  };
  L.billTake = take(hrOwes(e.id, "bill"));
  L.advTake = take(hrRound(hrAdvOpen(e.id).reduce((a, x) => a + Math.min(x.inst, x.left), 0)));
  // SACCO and HELB come first of the standing deductions: they're owed to someone else.
  L.recur = hrRecurOpen(e.id)
    .slice()
    .sort((a, b) => (a.kind === "Staff loan") - (b.kind === "Staff loan"))
    .map(x => ({
      id: x.id,
      kind: x.kind,
      ref: x.ref,
      take: take(x.left === null ? x.monthly : Math.min(x.monthly, x.left))
    }));
  L.otherTake = take(hrOwes(e.id, "other"));
  return hrCalc(L);
}
/** Shares the month's service charge by each person's points. */
function hrSplitSvc(run) {
  const pool = +run.svcPool || 0,
    pts = run.lines.reduce((a, l) => a + (+l.svcPts || 0), 0);
  let left = pool;
  const on = run.lines.filter(l => +l.svcPts > 0);
  run.lines.forEach(l => (l.svc = 0));
  on.forEach((l, i) => {
    l.svc = i === on.length - 1 ? hrRound(left) : hrRound((pool * l.svcPts) / pts);
    left -= l.svc;
  });
  run.lines.forEach(hrCalc);
}
const hrRuns = () => hr().runs;
const hrRunTotals = run => {
  const S = f => hrRound(run.lines.reduce((a, l) => a + (+l[f] || 0), 0)),
    rec = t =>
      hrRound(
        run.lines.reduce(
          (a, l) => a + (l.recur || []).filter(t).reduce((x, y) => x + (+y.take || 0), 0),
          0
        )
      );
  return {
    gross: S("gross"),
    extras: S("extras"),
    tips: S("tips"),
    nssf: S("nssf"),
    sha: S("sha"),
    ahl: S("ahl"),
    paye: S("paye"),
    bills: S("billTake"),
    adv: S("advTake"),
    other: S("otherTake"),
    loans: rec(x => x.kind === "Staff loan"),
    remit: rec(x => x.kind !== "Staff loan"),
    othersAll: S("others"),
    ded: S("totalDed"),
    net: S("net"),
    nssfEr: S("nssfEr"),
    ahlEr: S("ahlEr"),
    nita: S("nitaEr")
  };
};
/** Every payslip there is, for the document viewer. */
const hrSlips = () =>
  hrRuns()
    .filter(r => r.status !== "Draft")
    .flatMap(r =>
      r.lines.map(l => ({ id: `${r.id}-${l.no}`, at: r.at, period: r.period, line: l, run: r }))
    );
/** Money owed on to SACCOs and HELB sits in its own account. */
function hrRemitAcc() {
  if (!acAcc("2160"))
    acCoa().push({
      code: "2160",
      name: "SACCO, HELB and other staff deductions payable",
      type: "Liability",
      group: "Statutory",
      sys: true
    });
  return "2160";
}
function hrPostRun(run, who) {
  const T = hrRunTotals(run),
    today = ymdOf(new Date()),
    err = acPost({
      // A month still running is posted today, so that paying it never comes before it.
      date: hrMonthEnd(run.period) < today ? hrMonthEnd(run.period) : today,
      narr: `${run.off ? "Final pay" : "Payroll"} for ${run.off ? run.lines[0].name : hrMonthName(run.period)}`,
      ref: run.id,
      src: "Payroll",
      lines: [
        { a: "6000", dr: hrRound(T.gross - T.tips), cr: 0 },
        // Tips were owed to staff from the day they were taken, so paying them isn't a new cost.
        { a: "2210", dr: T.tips, cr: 0 },
        { a: "6030", dr: hrRound(T.nssfEr + T.ahlEr + T.nita), cr: 0 },
        { a: "2120", dr: 0, cr: T.paye },
        { a: "2130", dr: 0, cr: hrRound(T.nssf + T.nssfEr) },
        { a: "2140", dr: 0, cr: T.sha },
        { a: "2150", dr: 0, cr: hrRound(T.ahl + T.ahlEr) },
        { a: "2010", dr: 0, cr: T.nita },
        { a: "1220", dr: 0, cr: hrRound(T.bills + T.adv + T.loans) },
        { a: T.remit ? hrRemitAcc() : "2010", dr: 0, cr: T.remit },
        { a: "4800", dr: 0, cr: T.other },
        { a: "2300", dr: 0, cr: T.net }
      ]
    });
  if (err) return err;
  // What was taken comes off what each person owes, oldest first.
  run.lines.forEach(L => {
    const settle = (list, amt, note) => {
      let left = amt;
      list.forEach(c => {
        const t = Math.min(left, c.left);
        c.left = hrRound(c.left - t);
        left = hrRound(left - t);
        if (t > 0 && note) (c.repaid = c.repaid || []).push({ period: run.period, amt: t });
      });
    };
    settle(hrChargesOpen(L.emp, "bill"), +L.billTake || 0);
    settle(hrChargesOpen(L.emp, "other"), +L.otherTake || 0);
    settle(hrAdvOpen(L.emp), +L.advTake || 0, true);
    (L.recur || []).forEach(x => {
      const R = (hr().recur || []).find(y => y.id === x.id);
      if (R && R.left !== null) R.left = hrRound(R.left - (+x.take || 0));
    });
  });
  run.status = "Approved";
  run.appr = { by: who, at: new Date().toISOString() };
  run.jv = acS().jv[acS().jv.length - 1].id;
  auditAdd(
    "Payroll",
    `${run.id} · ${run.off ? run.lines[0].name : hrMonthName(run.period)} · net KES ${m2(T.net)} · approved by ${who}`,
    { ref: run.id, mod: "HR", pri: "Important" }
  );
  return "";
}
// ---------------------------------------------------------------- documents
const hrViaText = L =>
  L.via === "M-Pesa"
    ? `M-Pesa ${L.mpesa || "-"}`
    : L.via === "Cash"
      ? "Cash"
      : `${L.bank || "Bank"} ${L.acct || ""}`.trim();
DOC_SPECS.pslip = s => {
  const L = s.line,
    e = hrEmp(L.emp) || {},
    year = s.period.slice(0, 4),
    ytd = f =>
      hrRound(
        hrRuns()
          .filter(
            r => r.status !== "Draft" && r.period.slice(0, 4) === year && r.period <= s.period
          )
          .flatMap(r => r.lines.filter(x => x.emp === L.emp))
          .reduce((a, x) => a + (+x[f] || 0), 0)
      ),
    earn = [
      ["Basic pay", L.basic],
      ["House allowance", L.house],
      ["Transport allowance", L.transport],
      ["Other allowances", L.otherAllow],
      [`Overtime (${qn(+L.otHrs || 0)} hours)`, L.ot],
      [L.exit ? "Leave, notice and service pay" : "Bonus", +L.bonus || 0],
      ["Commission", +L.commission || 0],
      ["Tips", +L.tips || 0],
      ["Service charge", +L.svc || 0],
      [`Public holiday (${qn(+L.holHrs || 0)} hours)`, L.holPay || 0]
    ].filter(x => x[1]),
    ded = [
      ...(L.unpaid ? [[`Unpaid leave (${qn(L.unpaidDays)} days)`, L.unpaid, true]] : []),
      ["NSSF", L.nssf],
      ["SHA", L.sha],
      ["Housing levy", L.ahl],
      ["PAYE", L.paye],
      ["Waiter bills", +L.billTake || 0],
      ["Salary advance", +L.advTake || 0],
      ["Other deductions", +L.otherTake || 0],
      ...(L.recur || []).map(x => [x.kind, +x.take || 0])
    ].filter(x => x[1] || ["NSSF", "SHA", "Housing levy", "PAYE"].includes(x[0]));
  return {
    title: "Payslip",
    status: s.run.status === "Paid" ? ["Paid", "ok"] : ["Approved", "warn"],
    banner: "",
    date: hrMonthName(s.period),
    parties: [
      {
        h: "Employee",
        name: L.name,
        lines: [`${L.no} · ${[L.job, L.dept].filter(Boolean).join(", ")}`]
      },
      { h: "Paid by", name: hrViaText(L), lines: L.via === "Bank" && L.branch ? [L.branch] : [] }
    ],
    facts: [
      ["KRA PIN", L.kra || "-"],
      ["NSSF no", L.nssfNo || "-"],
      ["SHA no", L.shaNo || "-"],
      ["Annual leave left", `${qn(hrLeaveBal(e, hrMonthEnd(s.period)).left)} days`]
    ],
    c: ["Description", "#Earnings", "#Deductions"],
    r: [
      ...earn.map(([l, v]) => [l, m2(v), ""]),
      ...ded.map(([l, v, gross]) => (gross ? [l, `-${m2(v)}`, ""] : [l, "", m2(v)]))
    ],
    totals: [
      ["Gross pay", m2(L.gross)],
      ["Total deductions", m2(L.totalDed)],
      ["NET PAY (KES)", m2(L.net), true]
    ],
    notes: [
      [
        "Tax",
        `Taxable pay ${m2(L.taxable)} · tax ${m2(L.before)} less relief ${m2(Math.min(L.before, hrR().relief))}`
      ],
      [
        "Year to date",
        `Gross ${m2(ytd("gross"))} · PAYE ${m2(ytd("paye"))} · NSSF ${m2(ytd("nssf"))} · Net ${m2(ytd("net"))}`
      ],
      [
        "Your employer also paid",
        `NSSF ${m2(L.nssfEr)} · Housing levy ${m2(L.ahlEr)} · NITA ${m2(L.nitaEr)}`
      ]
    ],
    sign: ["For the employer", "Employee"]
  };
};
DOC_SPECS.prun = run => {
  const T = hrRunTotals(run);
  return {
    title: "Payroll Summary",
    status:
      run.status === "Paid"
        ? ["Paid", "ok"]
        : run.status === "Draft"
          ? ["Draft", "warn"]
          : ["Approved", "ok"],
    banner: run.status === "Draft" ? "DRAFT · NOT APPROVED" : "",
    date: hrMonthName(run.period),
    parties: [
      { h: "Pay month", name: hrMonthName(run.period), lines: [`${run.lines.length} employees`] },
      {
        h: "Approved by",
        name: run.appr ? run.appr.by : "-",
        lines: run.jv ? [`Accounts ${run.jv}`] : []
      }
    ],
    facts: [
      ["Employer NSSF", m2(T.nssfEr)],
      ["Employer housing levy", m2(T.ahlEr)],
      ["NITA", m2(T.nita)],
      ["Total cost", m2(T.gross + T.nssfEr + T.ahlEr + T.nita)]
    ],
    c: ["Employee", "#Gross", "#NSSF", "#SHA", "#Housing", "#PAYE", "#Other", "#Net"],
    r: run.lines.map(l => [
      l.name,
      m2(l.gross),
      m2(l.nssf),
      m2(l.sha),
      m2(l.ahl),
      m2(l.paye),
      m2(l.others),
      m2(l.net)
    ]),
    totals: [
      ["Gross pay", m2(T.gross)],
      ["Statutory deductions", m2(T.nssf + T.sha + T.ahl + T.paye)],
      ["Other deductions", m2(T.bills + T.adv + T.other)],
      ["NET PAY (KES)", m2(T.net), true]
    ],
    notes: [],
    sign: ["Prepared by", "Checked by", "Approved by"]
  };
};
DOC_SPECS.pbank = run => {
  const order = { Bank: 0, "M-Pesa": 1, Cash: 2 },
    L = run.lines
      .slice()
      .sort(
        (a, b) =>
          (order[a.via] || 0) - (order[b.via] || 0) || (a.bank || "").localeCompare(b.bank || "")
      ),
    sum = v => hrRound(L.filter(x => x.via === v).reduce((a, x) => a + x.net, 0));
  return {
    title: "Bank Payment Schedule",
    status: run.status === "Paid" ? ["Paid", "ok"] : ["To pay", "warn"],
    banner: "",
    date: hrMonthName(run.period),
    parties: [
      { h: "Salaries for", name: hrMonthName(run.period), lines: [`${L.length} employees`] },
      {
        h: "Paid from",
        name: run.paidFrom ? (acAcc(run.paidFrom) || {}).name || run.paidFrom : "-",
        lines: run.paidOn ? [dateGB(run.paidOn)] : []
      }
    ],
    facts: [
      ["By bank", m2(sum("Bank"))],
      ["By M-Pesa", m2(sum("M-Pesa"))],
      ["By cash", m2(sum("Cash"))]
    ],
    c: ["Employee", "Paid by", "Bank", "Branch", "Account or phone", "#Amount"],
    r: L.map(x => [
      x.name,
      x.via,
      x.via === "Bank" ? x.bank || "-" : "-",
      x.via === "Bank" ? x.branch || "-" : "-",
      x.via === "Bank" ? x.acct || "-" : x.via === "M-Pesa" ? x.mpesa || "-" : "-",
      m2(x.net)
    ]),
    totals: [["Total to pay (KES)", m2(hrRunTotals(run).net), true]],
    notes: [],
    sign: ["Prepared by", "First signatory", "Second signatory"]
  };
};
DOC_SPECS.plv = l => {
  const e = hrEmp(l.emp) || {},
    B = hrLeaveBal(e, l.to);
  return {
    title: "Leave Form",
    status:
      l.status === "Approved"
        ? ["Approved", "ok"]
        : l.status === "Rejected"
          ? ["Rejected", "bad"]
          : [AWAIT, "warn"],
    banner: l.status === "Rejected" ? "REJECTED" : "",
    parties: [
      { h: "Employee", name: e.name || "-", lines: [[e.no, e.job].filter(Boolean).join(" · ")] },
      { h: "Leave type", name: l.type, lines: [`${qn(l.days)} days`] }
    ],
    facts: [
      ["From", dateGB(l.from)],
      ["To", dateGB(l.to)],
      ["Requested by", l.by || "-"],
      ["Approved by", l.appr ? l.appr.by : "-"]
    ],
    c: ["Annual leave", "#Days"],
    r: [
      ["Earned so far this year", qn(B.earned)],
      ["Taken", qn(B.taken)],
      ["Left", qn(B.left)]
    ],
    notes: l.why ? [["Reason", l.why]] : [],
    sign: ["Employee", "Supervisor", "Manager"]
  };
};

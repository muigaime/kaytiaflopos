// ---- HR & Payroll: the dashboard, employee profiles, paying someone off, and the bank slip ----
const hrInitials = n =>
  String(n || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(x => x[0].toUpperCase())
    .join("");
const hrAvatar = (n, big) =>
  `<span class="hr-av ${big ? "big" : ""}" style="--h:${hue(n)}" aria-hidden="true">${esc(hrInitials(n))}</span>`;
/** Where a process has got to: done, the current step, and what's still to come. */
function hrSteps(L, at) {
  return `<ol class="hr-steps">${L.map(
    (s, i) =>
      `<li class="${i < at ? "done" : i === at ? "on" : ""}" ${i === at ? 'aria-current="step"' : ""}><i>${i < at ? "✓" : i + 1}</i><span>${esc(s)}</span></li>`
  ).join("")}</ol>`;
}
const HR_RUN_STEPS = ["Prepare", "Review", "Approve", "Pay"];
const hrRunStep = run => (!run ? 0 : run.status === "Draft" ? 1 : run.status === "Paid" ? 4 : 3);
/** What's missing from someone's file that a payroll or return would need. */
function hrGaps(x) {
  const out = [];
  if (!x.kra) out.push("KRA PIN");
  if (!(x.nssfNo || "")) out.push("NSSF no");
  if (!(x.shaNo || "")) out.push("SHA no");
  if (x.via === "Bank" && !(x.bank && x.acct)) out.push("bank details");
  if (x.via === "M-Pesa" && !x.mpesa) out.push("M-Pesa number");
  return out;
}
/** Checks before a payroll is approved. Only pay below zero stops it. */
function hrRunChecks(run) {
  const prev = hrRuns()
      .filter(r => !r.off && r.status !== "Draft" && r.period < run.period)
      .sort((a, b) => b.period.localeCompare(a.period))[0],
    was = l => (prev ? (prev.lines.find(x => x.emp === l.emp) || {}).net : undefined),
    C = [];
  run.lines.forEach(l => {
    if (l.net < 0) C.push(["bad", l.name, "Pay is below zero. Lower what's taken."]);
    else if (l.overCap) C.push(["bad", l.name, "Deductions are over the two-thirds limit."]);
    if (l.gross <= 0) C.push(["warn", l.name, "No pay this month."]);
    const g = hrGaps(l);
    if (g.length) C.push(["warn", l.name, `Missing ${g.join(", ")}.`]);
    const w = was(l);
    if (w && Math.abs(l.net - w) / w > 0.2)
      C.push([
        "info",
        l.name,
        `Net pay is ${l.net > w ? "up" : "down"} ${m2(Math.abs(l.net - w))} on last month.`
      ]);
    if (prev && w === undefined) C.push(["info", l.name, "New on the payroll this month."]);
  });
  return C;
}
function hrChecksHTML(C) {
  if (!C.length) return '<div class="hr-ok">✓ All checks passed. Ready to approve.</div>';
  const bad = C.filter(x => x[0] === "bad").length,
    warn = C.filter(x => x[0] === "warn").length;
  return `<details class="hr-checks" ${bad ? "open" : ""}><summary>${bad ? `<span class="tag bad">${bad} to fix</span>` : ""}${warn ? `<span class="tag warn">${warn} to check</span>` : ""} ${C.length} ${C.length === 1 ? "note" : "notes"} before approving</summary><ul>${C.map(
    ([t, n, m]) => `<li class="${t}"><b>${esc(n)}</b> ${esc(m)}</li>`
  ).join("")}</ul></details>`;
}
// ---------------------------------------------------------------- dashboard
function hrToDo() {
  const H = hr(),
    today = ymdOf(new Date()),
    p = hrPeriodNow(),
    run = hrRuns().find(r => r.period === p && !r.off),
    T = [],
    add = (tone, t, sub, attrs, label) => T.push({ tone, t, sub, attrs, label }),
    n = (x, w) => `${x} ${w}${x === 1 ? "" : "s"}`,
    tab = t => `data-a="hr_tab" data-t="${t}"`;
  hrEmps()
    .filter(e => e.end && e.end <= today)
    .forEach(e =>
      add(
        "bad",
        `${e.name}'s contract has ended`,
        `Ended ${dateGB(e.end)}. Their final pay isn't done.`,
        `data-a="hr_payoff" data-id="${e.id}"`,
        "Pay off"
      )
    );
  hrRuns()
    .filter(r => r.off && r.status !== "Paid")
    .forEach(r =>
      add(
        "bad",
        `Final pay for ${r.lines[0].name} isn't paid`,
        `KES ${m2(r.lines[0].net)} approved.`,
        tab("exit"),
        "Pay"
      )
    );
  if (!run)
    add(
      "warn",
      `Prepare ${hrMonthName(p)} payroll`,
      "It hasn't been started.",
      tab("run"),
      "Start"
    );
  else if (run.status === "Draft")
    add("warn", `Approve ${hrMonthName(p)} payroll`, "It's still a draft.", tab("run"), "Review");
  else if (run.status === "Approved")
    add(
      "warn",
      `Pay ${hrMonthName(p)} salaries`,
      `KES ${m2(hrRunTotals(run).net)} to pay.`,
      tab("run"),
      "Pay"
    );
  const lv = H.leave.filter(l => l.status === AWAIT).length,
    ad = H.adv.filter(a => a.status === AWAIT).length,
    sw = hrSwaps().filter(s => s.status === AWAIT).length,
    ex = hrExpiring().filter(x => x.what.indexOf("contract") < 0).length,
    gaps = hrEmps().filter(e => hrGaps(e).length).length;
  if (ad)
    add("warn", n(ad, "advance") + " to approve", "Waiting for a manager.", tab("adv"), "Open");
  if (lv)
    add(
      "warn",
      n(lv, "leave request") + " to approve",
      "Waiting for a manager.",
      tab("leave"),
      "Open"
    );
  if (sw)
    add(
      "warn",
      n(sw, "shift swap") + " to approve",
      "Waiting for a manager.",
      tab("roster"),
      "Open"
    );
  if (ex)
    add(
      "warn",
      n(ex, "certificate or document") + " running out",
      "Within the next 30 days.",
      tab("emp"),
      "See"
    );
  if (gaps)
    add(
      "info",
      `${n(gaps, "employee")} with missing details`,
      "Needed for payroll and returns.",
      tab("emp"),
      "Fix"
    );
  return T;
}
function hrHomeHTML() {
  const E = hrEmps(),
    today = ymdOf(new Date()),
    p = hrPeriodNow(),
    run = hrRuns().find(r => r.period === p && !r.off),
    R = hrR(),
    est = E.map(e => {
      const g = e.type === "Casual" ? (+e.dayRate || 0) * 26 : (+e.basic || 0) + hrAllow(e),
        S = hrStatutory(g, R);
      return { e, g, er: g ? S.nssf + S.ahl + R.nita : 0 };
    }),
    gross = est.reduce((a, x) => a + x.g, 0),
    cost = est.reduce((a, x) => a + x.g + x.er, 0),
    present = E.filter(e => hrDayTime(e, today).rows.length).length,
    onLeave = E.filter(e => hrOnLeave(e.id, today)).length,
    M = acMonths(6).map(m => {
      const per = m.from.slice(0, 7),
        L = hrRuns()
          .filter(r => r.period === per && r.status !== "Draft")
          .flatMap(r => r.lines);
      return {
        ...m,
        net: hrRound(L.reduce((a, l) => a + l.net, 0)),
        ded: hrRound(L.reduce((a, l) => a + l.totalDed, 0))
      };
    }),
    top = Math.max(1, ...M.flatMap(m => [m.net, m.ded])),
    bar = (v, cl, tip) =>
      `<i class="ac-b1 ${cl}" style="height:${Math.max(v > 0 ? 2 : 0, (v / top) * 100)}%" data-tip="${esc(tip)}" tabindex="0" aria-label="${esc(tip)}"></i>`,
    dep = {};
  est.forEach(x => {
    const d = x.e.dept || "No department";
    dep[d] = (dep[d] || 0) + x.g;
  });
  const D = Object.entries(dep).sort((a, b) => b[1] - a[1]),
    dTop = Math.max(1, ...D.map(x => x[1])),
    T = hrToDo(),
    types = HR_TYPES.map(t => [t, E.filter(e => (e.type || "Permanent") === t).length]);
  const tab = t => `data-a="hr_tab" data-t="${t}"`,
    tile = (ic, l, v, s, t) =>
      `<button class="ph-t" ${tab(t)}><span class="ph-i">${I(ic)}</span><span class="ph-l">${l}</span><b>${v}</b><small>${s}</small></button>`,
    quick = (ic, l, attrs) =>
      `<button class="ph-q" ${attrs}><span class="ph-i">${I(ic)}</span>${l}</button>`,
    card = ([t, l, ic]) =>
      `<button class="ph-c" ${tab(t)}><span class="ph-i">${I(ic)}</span><span class="ph-b"><b>${l}</b><span>${HR_PAGES[t][1]}</span></span>${hrBadge(t)}<span class="ph-ch">${I("chev")}</span></button>`,
    tot = run ? hrRunTotals(run) : null,
    deducted = run ? hrRound(run.lines.reduce((a, l) => a + (+l.totalDed || 0), 0)) : 0,
    next = !run
      ? ["Not started", "Prepare it to work out everyone's pay.", "Prepare payroll"]
      : run.status === "Draft"
        ? ["Draft", "Check the figures, then approve them.", "Review and approve"]
        : run.status === "Paid"
          ? ["Paid", "Everyone has been paid for this month.", "See payroll"]
          : ["Approved", "Approved and ready. Pay the salaries to finish.", "Pay salaries"],
    figure = (l, v) => `<div><span>${l}</span><b>KES ${m2(v)}</b></div>`;
  return `<div class="ph hr-hub"><div class="ph-h hr-top"><div><h1>HR &amp; Payroll</h1><p>Your people, this month's pay, and what needs doing next.</p></div><span class="hr-conf">Confidential</span></div>
  <section class="hrp" aria-label="${hrMonthName(p)} payroll"><div class="hrp-l"><span class="hrp-m">${hrMonthName(p)} payroll</span><b class="hrp-v">KES ${m2(tot ? tot.net : gross)}</b><span class="hrp-s">${tot ? "Take-home pay" : "Estimated monthly gross"}</span><span class="hrp-st">${next[0]}</span><p>${next[1]}</p><button class="chip on" ${tab("run")}>${next[2]}</button></div>
  <div class="hrp-r">${hrSteps(HR_RUN_STEPS, hrRunStep(run))}<div class="hrp-fs">${tot ? figure("Gross pay", tot.gross) + figure("Deductions", deducted) + figure("Take-home", tot.net) : figure("Estimated gross", gross) + figure("Employer's share", cost - gross) + figure("Total cost", cost)}</div></div></section>
  <div class="ph-ts">${tile("users", "Employees", E.length, types.map(([t, n]) => `${n} ${t.toLowerCase()}`).join(" · "), "emp")}${tile("check", "In today", `${present} of ${E.length}`, "Clocked in", "time")}${tile("home", "On leave", onLeave, "Today", "leave")}${tile("wal", "Monthly cost", "KES " + m2(cost), "With employer's share", "run")}</div>
  <div class="ph-qs">${quick("users", "Add employee", 'data-a="hr_empnew"')}${quick("cash", "Give an advance", tab("adv"))}${quick("home", "Record leave", tab("leave"))}${quick("dl", "Pay someone off", tab("exit"))}</div>
  <div class="pn hr-need"><h4>Needs your attention${T.length ? ` (${T.length})` : ""}</h4>${
    T.length
      ? `<ul class="hr-todo">${T.map(x => `<li class="${x.tone}"><div><b>${esc(x.t)}</b><span>${esc(x.sub)}</span></div><button class="mini" ${x.attrs}>${esc(x.label)}</button></li>`).join("")}</ul>`
      : '<div class="hr-ok">✓ Nothing waiting. All up to date.</div>'
  }</div>
  ${hrGroups()
    .map(
      g =>
        `<section class="ph-sec"><h2 class="rp-gh">${g.name}</h2><div class="ph-cs">${g.tabs.map(card).join("")}</div></section>`
    )
    .join("")}
  <div class="hr-two acx"><div class="pn"><div class="inv-head"><h4>Payroll · last 6 months</h4><span class="ac-legend"><span><i class="s1"></i>Take-home pay</span><span><i class="s2"></i>Deductions</span></span></div>
  <div class="ac-chart" role="img" aria-label="Take-home pay and deductions for the last 6 months. The figures are in the table below.">${M.map(m => `<div class="ac-col"><div class="ac-bars">${bar(m.net, "s1", `${m.long}: take-home ${acKes(m.net)}`)}${bar(m.ded, "s2", `${m.long}: deductions ${acKes(m.ded)}`)}</div><span>${m.l}</span></div>`).join("")}</div>
  <details class="ac-data"><summary>See the figures</summary>${acTable(
    ["Month", "#Take-home pay", "#Deductions"],
    M.map(m => [m.long, m2(m.net), m2(m.ded)])
  )}</details></div>
  <div class="pn"><h4>Monthly gross by department</h4>${D.length ? `<div class="trk-places">${D.map(([d, v]) => `<div class="trk-place ac-hb" data-tip="${esc(d)}: ${acKes(v)}"><span>${esc(d)}</span><div class="trk-bar"><i style="width:${Math.max(3, (v / dTop) * 100)}%"></i></div><b>${m2(v)}</b></div>`).join("")}</div>` : '<div class="empty">Add employees to see this.</div>'}</div></div></div>`;
}
// ---------------------------------------------------------------- directory
function hrEmpHTML() {
  const A = hrEmps(),
    today = ymdOf(new Date()),
    st = hrS.fSt || "Active",
    dept = hrS.fDept || "",
    q = hrS.q.trim().toLowerCase(),
    all2 = hr().emps,
    depts = [...new Set(all2.map(e => e.dept).filter(Boolean))].sort(),
    L = all2
      .filter(e =>
        st === "All" ? true : st === "Left" ? e.status === "Left" : e.status !== "Left"
      )
      .filter(e => !dept || e.dept === dept)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
    gross = A.reduce((a, e) => a + (+e.basic || 0) + hrAllow(e), 0),
    gaps = A.filter(e => hrGaps(e).length).length,
    onLeave = A.filter(e => hrOnLeave(e.id, today)).length,
    pills = [
      ["Active", A.length],
      ["Left", all2.length - A.length],
      ["All", all2.length]
    ];
  return `<div class="stm-tiles">${msTile("Employees", A.length)}${msTile("Monthly gross (KES)", m2(gross), "", "gold")}${msTile("On leave today", onLeave)}${msTile("Running out in 30 days", hrExpiring().length, "", hrExpiring().length ? "warn" : "")}${msTile("Missing details", gaps, "", gaps ? "warn" : "")}</div>
  <div class="pn"><div class="stm-bar"><label class="find hr-find"><input id="hrQ" type="search" value="${esc(hrS.q)}" placeholder="Search name, number, job or department"></label><label class="stm-cat">Department<select data-hs="fDept"><option value="">All</option>${depts.map(d => `<option ${d === dept ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label><div class="pr-pills">${pills.map(([v, n]) => `<button class="pr-pill ${st === v ? "on" : ""}" data-a="hr_empst" data-v="${v}">${v} <small>${n}</small></button>`).join("")}</div><span class="stm-acts"><button class="mini xl-btn" data-a="hr_empxl">Export to Excel</button><button class="chip on" data-a="hr_empnew">Add employee</button></span></div>${hrTbl(
    ["Employee", "Department", "Type", "#Monthly gross", "#Take home", "Status", ""],
    L.map(e => {
      const g = e.type === "Casual" ? 0 : (+e.basic || 0) + hrAllow(e),
        S = hrStatutory(g),
        gap = hrGaps(e),
        left = e.status === "Left",
        lv = hrOnLeave(e.id, today);
      return `<tr class="${left ? "ac-off" : ""}" data-s="${esc(`${e.name} ${e.no} ${e.job} ${e.dept}`.toLowerCase())}"${q && !`${e.name} ${e.no} ${e.job} ${e.dept}`.toLowerCase().includes(q) ? " hidden" : ""}><td><button class="hr-who" data-a="hr_prof" data-id="${e.id}">${hrAvatar(e.name)}<span><b>${esc(e.name)}</b><small>${esc(e.no)}${e.job ? " · " + esc(e.job) : ""}</small></span></button></td><td>${esc(e.dept || "-")}</td><td>${esc(e.type || "Permanent")}</td><td class="n">${e.type === "Casual" ? `${m2(+e.dayRate || 0)} a day` : m2(g)}</td><td class="n">${e.type === "Casual" ? "-" : m2(g - S.nssf - S.sha - S.ahl - S.paye)}</td><td><span class="tag ${left ? "bad" : lv ? "warn" : "ok"}">${left ? esc(e.leftWhy || "Left") : lv ? "On leave" : "Active"}</span>${!left && gap.length ? ` <span class="tag warn" title="Missing ${esc(gap.join(", "))}">Details missing</span>` : ""}</td><td class="n"><span class="sp-acts"><button class="mini" data-a="hr_prof" data-id="${e.id}">View</button>${left ? "" : `<button class="mini" data-a="hr_payoff" data-id="${e.id}">Pay off</button>`}</span></td></tr>`;
    }),
    all2.length ? "Nobody matches." : "No employees yet. Press Add employee to start."
  )}</div>${hrAttention()}`;
}
// ---------------------------------------------------------------- profile
function hrProfile() {
  const e = hrS.prof && hrEmp(hrS.prof);
  if (!e) return "";
  const casual = e.type === "Casual",
    g = casual ? 0 : (+e.basic || 0) + hrAllow(e),
    S = hrStatutory(g),
    B = hrLeaveBal(e),
    owed =
      hrOwes(e.id, "bill") +
      hrOwes(e.id, "other") +
      hrAdvOpen(e.id).reduce((a, x) => a + x.left, 0) +
      hrRecurOpen(e.id)
        .filter(x => x.kind === "Staff loan")
        .reduce((a, x) => a + (x.left || 0), 0),
    M = hrMonthTime(e, hrPeriodNow()),
    slips = hrSlips()
      .filter(s => s.line.emp === e.id)
      .reverse()
      .slice(0, 6),
    recs = Object.entries(HR_REC)
      .map(([k, c]) => [c.t, hrRecs(k).filter(r => r.emp === e.id).length])
      .filter(x => x[1]),
    left = e.status === "Left",
    row = (l, v) => `<div><span>${esc(l)}</span><b>${esc(v || "-")}</b></div>`,
    gap = hrGaps(e);
  return `<div class="modal show" id="hrProf" style="z-index:65"><div class="box itm hr-box">
  <header class="itm-h hr-prof-h">${hrAvatar(e.name, true)}<div><h3>${esc(e.name)}</h3><p>${esc([e.no, e.job, e.dept].filter(Boolean).join(" · "))}</p><span class="tag ${left ? "bad" : "ok"}">${left ? esc(e.leftWhy || "Left") : "Active"}</span></div><button class="itm-x" data-a="hr_profno" aria-label="Close">✕</button></header>
  <div class="itm-b">
  <div class="stm-tiles">${casual ? msTile("Day rate (KES)", m2(+e.dayRate || 0)) : msTile("Monthly gross (KES)", m2(g))}${casual ? "" : msTile("Take home (KES)", m2(g - S.nssf - S.sha - S.ahl - S.paye), "", "gold")}${msTile("Annual leave left", `${qn(B.left)} days`)}${msTile("Owes (KES)", m2(owed), "", owed ? "warn" : "")}${msTile("Days in this month", M.present, "", "", `<small>${qn(M.hours)} hours · ${M.late} late</small>`)}</div>
  ${gap.length && !left ? `<div class="status warn">Missing ${esc(gap.join(", "))}. Press Edit to add ${gap.length === 1 ? "it" : "them"}.</div>` : ""}
  <div class="hr-facts"><section><h4>Job</h4>${row("Employment", e.type)}${row("Started", e.start && dateGB(e.start))}${row(left ? "Left" : "Contract ends", e.end && dateGB(e.end))}${row("POS sign-in", e.user)}${row("Phone", e.phone)}${row("Email", e.email)}${row("Next of kin", e.kin)}</section>
  <section><h4>Pay and statutory</h4>${row("Paid by", e.via)}${e.via === "Bank" ? row("Bank", [e.bank, e.branch].filter(Boolean).join(", ")) + row("Account no", e.acct) : e.via === "M-Pesa" ? row("M-Pesa", e.mpesa) : ""}${row("ID no", e.idNo)}${row("KRA PIN", e.kra)}${row("NSSF no", e.nssfNo)}${row("SHA no", e.shaNo)}</section></div>
  <section class="itm-s"><h4>Payslips</h4>${hrTbl(
    ["Pay", "#Gross", "#Net pay", "Status", ""],
    slips.map(s => {
      const L = s.line,
        id = `${s.run.id}-${L.no}`;
      return `<tr><td>${s.run.off ? `Final pay · ${esc(L.exit.reason)}` : hrMonthName(s.period)}</td><td class="n">${m2(L.gross)}</td><td class="n"><b>${m2(L.net)}</b></td><td><span class="tag ${s.run.status === "Paid" ? "ok" : "warn"}">${esc(s.run.status)}</span></td><td class="n"><span class="sp-acts">${docBtn("pslip", id, "Payslip")}${docBtn("pbslip", id, "Bank slip")}</span></td></tr>`;
    }),
    "No payslips yet."
  )}</section>
  ${recs.length ? `<section class="itm-s"><h4>On file</h4><div class="pr-pills">${recs.map(([t, n]) => `<button class="pr-pill" data-a="hr_recjump" data-id="${e.id}" data-t="${esc(t)}">${esc(t)} <small>${n}</small></button>`).join("")}</div></section>` : ""}
  </div><footer class="itm-f"><button class="mini" data-a="hr_profno">Close</button>${left ? "" : `<button class="mini" data-a="hr_payoff" data-id="${e.id}">Pay off</button><button class="mini" data-a="hr_tab" data-t="adv">Give an advance</button>`}<button class="chip on" data-a="hr_empedit" data-id="${e.id}">Edit</button></footer></div></div>`;
}
// ---------------------------------------------------------------- paying someone off
function hrExitHTML() {
  const F =
      hrS.exit ||
      (hrS.exit = {
        emp: "",
        last: ymdOf(new Date()),
        reason: "Dismissed",
        notice: "",
        service: "",
        other: "",
        billTake: "",
        advTake: "",
        loanTake: "",
        otherTake: ""
      }),
    e = hrEmp(F.emp),
    L = e ? hrExitLine(e, F) : null,
    done = hrRuns().filter(r => r.off),
    out = e ? hrRecs("asset").filter(a => a.emp === e.id && !a.back) : [],
    today = ymdOf(new Date()),
    ended = hrEmps().filter(x => x.end && x.end <= today),
    owedNow = e
      ? {
          bill: hrOwes(e.id, "bill"),
          adv: hrRound(hrAdvOpen(e.id).reduce((a, x) => a + x.left, 0)),
          loan: hrRound(
            hrRecurOpen(e.id)
              .filter(x => x.kind === "Staff loan")
              .reduce((a, x) => a + (x.left || 0), 0)
          ),
          other: hrOwes(e.id, "other")
        }
      : {},
    field = (k, l, max) =>
      max > 0
        ? `<label>${l} <small>owes ${m2(max)}</small><input data-hx="${k}" type="number" min="0" max="${max}" step="any" value="${esc(F[k])}" placeholder="${max}"></label>`
        : "",
    takenTotal = L ? L.others : 0,
    owesTotal = hrRound(
      (owedNow.bill || 0) + (owedNow.adv || 0) + (owedNow.loan || 0) + (owedNow.other || 0)
    ),
    stay = hrRound(owesTotal - takenTotal),
    stmt = L
      ? [
          [
            L.exit.paidMonth
              ? "Days worked: already paid this month"
              : `Pay for days worked up to ${dateGB(F.last)}`,
            L.exit.worked
          ],
          [`Leave not taken (${qn(L.exit.leftDays)} days)`, L.exit.leavePay],
          ["Notice pay", L.exit.notice],
          [F.reason === "Redundancy" ? "Redundancy pay" : "Service pay", L.exit.service],
          ["Other pay", L.exit.other]
        ].filter(x => x[1] || /days/.test(x[0]))
      : [],
    neg = L && L.net < 0;
  return `${
    ended.length
      ? `<div class="pn"><h4>Contracts that have ended</h4><ul class="hr-todo">${ended
          .map(
            x =>
              `<li class="bad"><div><b>${esc(x.name)}</b><span>Ended ${dateGB(x.end)}</span></div><button class="mini" data-a="hr_payoff" data-id="${x.id}">Pay off</button></li>`
          )
          .join("")}</ul></div>`
      : ""
  }<div class="pn">${hrSteps(["Work it out", "Approve", "Pay", "Done"], L ? 1 : 0)}<div class="stk">Anyone can be paid off on any day, without waiting for the month's payroll.</div>
  <div class="pv-form"><label class="ac-wide">Employee<select data-hx="emp">${hrEmpOpts(F.emp, "Choose…")}</select></label><label>Last day<input data-hx="last" type="date" value="${F.last}"></label><label>Reason<select data-hx="reason">${hrOpts(HR_EXIT, F.reason)}</select></label></div>
  ${
    L
      ? `<div class="pv-form"><label>Notice pay (months)<input data-hx="notice" type="number" min="0" step="any" value="${esc(F.notice)}" placeholder="0"></label>${F.reason === "Redundancy" ? "" : `<label>Service pay (KES)<input data-hx="service" type="number" min="0" step="any" value="${esc(F.service)}" placeholder="0"></label>`}<label>Other pay (KES)<input data-hx="other" type="number" min="0" step="any" value="${esc(F.other)}" placeholder="0"></label></div>
  ${owesTotal ? `<h5 class="hr-h5">Taken from final pay</h5><div class="pv-form">${field("billTake", "Waiter bills", owedNow.bill)}${field("advTake", "Advance", owedNow.adv)}${field("loanTake", "Staff loan", owedNow.loan)}${field("otherTake", "Other", owedNow.other)}</div>` : ""}
  ${out.length ? `<div class="status bad">Still has ${out.map(x => esc(x.item)).join(", ")}. Mark them returned or charge them under Staff records first.</div>` : ""}
  ${neg ? `<div class="status bad">They owe KES ${m2(-L.net)} more than they're due. Lower what's taken above to approve.</div>` : ""}
  <div class="hr-stmt"><div class="tw"><table class="t hr-t"><thead><tr><th>Pay statement</th><th class="n">KES</th></tr></thead><tbody>${stmt.map(([l, v]) => `<tr><td>${esc(l)}</td><td class="n">${m2(v)}</td></tr>`).join("")}<tr class="hr-sub"><td>Gross pay</td><td class="n">${m2(L.gross)}</td></tr><tr><td>NSSF</td><td class="n">${m2(0 - L.nssf)}</td></tr><tr><td>SHA</td><td class="n">${m2(0 - L.sha)}</td></tr><tr><td>Housing levy</td><td class="n">${m2(0 - L.ahl)}</td></tr><tr><td>PAYE</td><td class="n">${m2(0 - L.paye)}</td></tr>${takenTotal ? `<tr><td>Bills, advances and loans</td><td class="n">${m2(0 - takenTotal)}</td></tr>` : ""}<tr class="hr-tot"><td>Final pay</td><td class="n">${m2(L.net)}</td></tr></tbody></table></div>
  <div class="hr-next"><b>${esc(e.name)}</b><span>Paid by ${esc(hrViaText(L))}</span>${stay > 0.004 ? `<span class="tag warn">KES ${m2(stay)} stays owed</span>` : ""}<button class="chip on" data-a="hr_ask" data-act="exitok" data-id="${e.id}" ${neg ? "disabled" : ""}>Approve final pay</button><small>Marks them as having left and posts to Accounts. It can't be undone. You then get the payslip, bank slip and certificate of service.</small></div></div>`
      : ""
  }</div>
  ${
    done.length
      ? `<div class="pn"><h4>Final pay (${done.length})</h4>${hrTbl(
          ["Employee", "Last day", "Reason", "#Net pay", "Status", "Papers", ""],
          done
            .slice()
            .reverse()
            .map(r => {
              const l = r.lines[0],
                id = `${r.id}-${l.no}`,
                paid = r.status === "Paid";
              return `<tr><td><b>${esc(l.name)}</b></td><td>${dateGB(l.exit.last)}</td><td>${esc(l.exit.reason)}</td><td class="n"><b>${m2(l.net)}</b></td><td><span class="tag ${paid ? "ok" : "warn"}">${paid ? `Paid ${dateGB(r.paidOn)}` : "To pay"}</span></td><td><span class="sp-acts">${docBtn("pslip", id, "Payslip")}${docBtn("pbslip", id, "Bank slip")}${docBtn("pcert", r.id, "Certificate")}</span></td><td class="n">${
                paid
                  ? esc(r.payRef || "")
                  : `<span class="sp-acts"><input id="hrFD_${r.id}" type="date" value="${today}" aria-label="Paid on"><select id="hrFF_${r.id}" aria-label="Paid from">${acOptions("", acMoney())}</select><input class="hr-a" id="hrFR_${r.id}" maxlength="40" placeholder="Reference" aria-label="Reference"><button class="chip on" data-a="hr_exitpay" data-id="${r.id}">Mark as paid</button></span>`
              }</td></tr>`;
            }),
          ""
        )}</div>`
      : ""
  }`;
}
// ---------------------------------------------------------------- the bank slip
function hrWords(n) {
  const ones =
      "Zero One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Thirteen Fourteen Fifteen Sixteen Seventeen Eighteen Nineteen".split(
        " "
      ),
    tens = "x x Twenty Thirty Forty Fifty Sixty Seventy Eighty Ninety".split(" "),
    say = x => {
      if (x < 20) return ones[x];
      if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? "-" + ones[x % 10] : "");
      if (x < 1000)
        return ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " and " + say(x % 100) : "");
      if (x < 1e6)
        return (
          say(Math.floor(x / 1000)) +
          " Thousand" +
          (x % 1000 ? (x % 1000 < 100 ? " and " : " ") + say(x % 1000) : "")
        );
      return say(Math.floor(x / 1e6)) + " Million" + (x % 1e6 ? " " + say(x % 1e6) : "");
    },
    cents = Math.round(n * 100),
    w = Math.floor(cents / 100),
    c = cents % 100;
  return `Kenya Shillings ${say(w)}${c ? ` and ${String(c).padStart(2, "0")}/100` : ""} only`;
}
DOC_SPECS.pbslip = s => {
  const L = s.line,
    r = s.run,
    e = hrEmp(L.emp) || {},
    co = docCompany(),
    paid = r.status === "Paid",
    bank = L.via === "Bank",
    what = r.off
      ? `Final pay (${L.exit.reason.toLowerCase()})`
      : `Salary for ${hrMonthName(s.period)}`;
  return {
    title: bank
      ? "Bank Payment Slip"
      : L.via === "M-Pesa"
        ? "M-Pesa Payment Slip"
        : "Cash Payment Slip",
    status: paid ? ["Paid", "ok"] : ["To pay", "warn"],
    banner: "",
    date: paid ? dateGB(r.paidOn) : ymdOf(new Date()).split("-").reverse().join("/"),
    parties: [
      {
        h: "Pay to",
        name: L.name,
        lines: [[L.no, e.idNo && `ID ${e.idNo}`].filter(Boolean).join(" · ")]
      },
      bank
        ? {
            h: "Into account",
            name: L.bank || "Bank not given",
            lines: [L.branch && `Branch: ${L.branch}`, `Account no: ${L.acct || "-"}`].filter(
              Boolean
            )
          }
        : L.via === "M-Pesa"
          ? { h: "To M-Pesa number", name: L.mpesa || "Number not given", lines: [] }
          : { h: "Paid in", name: "Cash", lines: ["To be signed for below"] }
    ],
    facts: [
      ["Amount (KES)", m2(L.net)],
      ["Paying company", co.name],
      ["Paid from", r.paidFrom ? (acAcc(r.paidFrom) || {}).name || r.paidFrom : "-"],
      ["Reference", r.payRef || r.id]
    ],
    c: ["Payment for", "Reference", "#Amount"],
    r: [[what, r.id, m2(L.net)]],
    totals: [["Total to pay (KES)", m2(L.net), true]],
    notes: [["In words", hrWords(L.net)]],
    sign:
      bank || L.via === "M-Pesa"
        ? ["Prepared by", "First signatory", "Second signatory"]
        : ["Paid by", "Approved by", "Received by"]
  };
};
// The hover note for bars in the Back Office pages.
$("#vSub").addEventListener("mousemove", e => {
  const t = e.target.closest(".ac-b1[data-tip], .ac-hb[data-tip]");
  chTip.hidden = !t;
  if (!t) return;
  chTip.textContent = t.dataset.tip;
  chTip.style.left = Math.min(e.clientX + 14, innerWidth - 270) + "px";
  chTip.style.top = e.clientY + 14 + "px";
});

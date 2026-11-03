// ---- HR & Payroll: rosters, staff records, advances and loans, final pay and P9 forms ----
// ---------------------------------------------------------------- attached files
// Kept in the browser's file store, because the main save has no room for scans.
const hrFiles = (() => {
  const open = () =>
      new Promise((ok, no) => {
        const r = indexedDB.open("kaytia_hr_files", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("f");
        r.onsuccess = () => ok(r.result);
        r.onerror = () => no(r.error);
      }),
    run = async (mode, job) => {
      const db = await open();
      return new Promise((ok, no) => {
        const t = db.transaction("f", mode),
          q = job(t.objectStore("f"));
        t.oncomplete = () => ok(q.result);
        t.onerror = () => no(t.error);
      });
    };
  return {
    put: (id, file) => run("readwrite", s => s.put(file, id)),
    get: id => run("readonly", s => s.get(id)),
    del: id => run("readwrite", s => s.delete(id)),
    clear: () => run("readwrite", s => s.clear()),
    /** Every file, as [id, file]. */
    all: async () => {
      const [keys, vals] = await Promise.all([
        run("readonly", s => s.getAllKeys()),
        run("readonly", s => s.getAll())
      ]);
      return keys.map((k, i) => [k, vals[i]]);
    }
  };
})();
// ---------------------------------------------------------------- staff records
const HR_REC = {
  disc: {
    t: "Disciplinary",
    print: "Disciplinary Letter",
    f: [
      ["date", "Date", "date"],
      [
        "level",
        "Action",
        ["Verbal warning", "Written warning", "Final warning", "Suspension", "Dismissal"]
      ],
      ["why", "What happened", "wide"],
      ["agreed", "What was agreed", "wide"]
    ]
  },
  cert: {
    t: "Certificates",
    f: [
      [
        "type",
        "Certificate",
        ["Food handler's", "Medical", "First aid", "Fire safety", "Driving licence", "Other"]
      ],
      ["no", "Number"],
      ["issued", "Issued", "date"],
      ["expiry", "Expires", "date"]
    ]
  },
  doc: {
    t: "Documents",
    f: [
      ["type", "Type", ["Contract", "ID copy", "KRA PIN", "CV", "Certificate", "Letter", "Other"]],
      ["title", "Title"],
      ["expiry", "Expires", "date"],
      ["file", "File", "file"]
    ]
  },
  asset: {
    t: "Uniforms and equipment",
    f: [
      ["item", "Item"],
      ["qty", "Quantity", "num"],
      ["value", "Value (KES)", "num"],
      ["date", "Issued", "date"]
    ]
  },
  train: {
    t: "Training",
    f: [
      ["course", "Course"],
      ["provider", "Provider"],
      ["date", "Date", "date"],
      ["cost", "Cost (KES)", "num"],
      ["expiry", "Valid until", "date"]
    ]
  },
  review: {
    t: "Performance reviews",
    print: "Performance Review",
    f: [
      ["period", "Period"],
      ["rating", "Rating", ["5 Excellent", "4 Very good", "3 Good", "2 Needs work", "1 Poor"]],
      ["good", "What went well", "wide"],
      ["goals", "Goals for next time", "wide"]
    ]
  },
  meal: {
    t: "Staff meals",
    f: [
      ["date", "Date", "date"],
      ["meal", "Meal", ["Breakfast", "Lunch", "Dinner"]],
      ["value", "Value (KES)", "num"]
    ]
  }
};
const hrRecs = k => {
  const H = hr();
  H.rec = H.rec || {};
  return H.rec[k] || (H.rec[k] = []);
};
const hrRecAll = () => Object.keys(HR_REC).flatMap(k => hrRecs(k).map(r => ({ ...r, kind: k })));
/** What runs out soon: contracts, certificates, documents and training. */
function hrExpiring(days = 30) {
  const today = ymdOf(new Date()),
    soon = ymdOf(new Date(Date.now() + days * 864e5)),
    out = [];
  hrEmps().forEach(e => {
    if (e.end && e.end <= soon)
      out.push({ emp: e, what: `${e.type} contract`, when: e.end, late: e.end < today });
  });
  ["cert", "doc", "train"].forEach(k =>
    hrRecs(k).forEach(r => {
      const e = hrEmp(r.emp);
      if (r.expiry && r.expiry <= soon && e && e.status !== "Left")
        out.push({
          emp: e,
          what: r.type || r.title || r.course,
          when: r.expiry,
          late: r.expiry < today
        });
    })
  );
  return out.sort((a, b) => a.when.localeCompare(b.when));
}
const hrAttention = () => {
  const L = hrExpiring();
  return L.length
    ? `<div class="pn"><h4>Running out soon (${L.length})</h4>${hrTbl(
        ["Employee", "What", "Date", ""],
        L.map(
          x =>
            `<tr><td><b>${esc(x.emp.name)}</b></td><td>${esc(x.what)}</td><td>${dateGB(x.when)}</td><td><span class="tag ${x.late ? "bad" : "warn"}">${x.late ? "Expired" : "Expiring"}</span></td></tr>`
        ),
        ""
      )}</div>`
    : "";
};
function hrRecField([k, l, type]) {
  if (Array.isArray(type))
    return `<label>${l}<select data-hrf="${k}">${hrOpts(type)}</select></label>`;
  if (type === "wide")
    return `<label class="ac-wide">${l}<input data-hrf="${k}" maxlength="240"></label>`;
  if (type === "date") return `<label>${l}<input data-hrf="${k}" type="date"></label>`;
  if (type === "num")
    return `<label>${l}<input data-hrf="${k}" type="number" min="0" step="any"></label>`;
  if (type === "file") return `<label>${l}<input data-hrf="${k}" type="file"></label>`;
  return `<label>${l}<input data-hrf="${k}" maxlength="80"></label>`;
}
function hrRecHTML() {
  if (!hr().emps.length) return hrNeedEmp;
  const k = hrS.rec || (hrS.rec = "disc"),
    C = HR_REC[k],
    who = hrS.recEmp || "",
    L = hrRecs(k)
      .filter(r => !who || r.emp === who)
      .slice()
      .reverse(),
    show = C.f.filter(f => f[2] !== "file"),
    month = hrPeriodNow(),
    meals = k === "meal" ? L.filter(r => (r.date || "").startsWith(month)) : [],
    cell = (r, f) => {
      const v = r[f[0]];
      if (!v) return "<td>-</td>";
      if (f[2] === "date") {
        const late = f[0] === "expiry" && v < ymdOf(new Date());
        return `<td>${dateGB(v)}${late ? ' <span class="tag bad">Expired</span>' : ""}</td>`;
      }
      return f[2] === "num" ? `<td class="n">${m2(+v)}</td>` : `<td>${esc(v)}</td>`;
    };
  return `<div class="pn"><div class="pr-pills">${Object.entries(HR_REC)
    .map(
      ([x, c]) =>
        `<button class="pr-pill ${x === k ? "on" : ""}" data-a="hr_reck" data-k="${x}">${esc(c.t)} <small>${hrRecs(x).length}</small></button>`
    )
    .join("")}</div></div>
  <div class="pn"><h4>Add to ${esc(C.t.toLowerCase())}</h4><div class="pv-form"><label class="ac-wide">Employee<select data-hrf="emp">${hrEmpOpts(who)}</select></label>${C.f.map(hrRecField).join("")}<button class="chip on" data-a="hr_recadd">Add</button></div></div>
  ${k === "meal" ? `<div class="stm-tiles">${msTile("Meals this month", meals.length)}${msTile("Value this month (KES)", m2(meals.reduce((a, r) => a + (+r.value || 0), 0)))}</div>` : ""}
  <div class="pn"><div class="inv-head"><h4>${esc(C.t)} (${L.length})</h4><label class="hr-inl">Show<select data-hs="recEmp">${hrEmpOpts(who, "Everyone")}</select></label></div>${hrTbl(
    [
      "Employee",
      ...show.map(f => (f[2] === "num" ? "#" : "") + f[1]),
      ...(k === "asset" ? ["Returned"] : []),
      ""
    ],
    L.map(
      r =>
        `<tr><td><b>${esc((hrEmp(r.emp) || {}).name || "-")}</b></td>${show.map(f => cell(r, f)).join("")}${k === "asset" ? `<td>${r.back ? dateGB(r.back) : '<span class="tag warn">With staff</span>'}</td>` : ""}<td class="n"><span class="sp-acts">${r.fileName ? `<button class="mini" data-a="hr_recfile" data-id="${r.id}">Open ${esc(r.fileName.slice(0, 18))}</button>` : ""}${k === "asset" && !r.back ? `<button class="mini" data-a="hr_recback" data-id="${r.id}">Returned</button><button class="mini" data-a="hr_recchg" data-id="${r.id}">Charge to pay</button>` : ""}${C.print ? docBtn("prec", r.id, "Print") : ""}<button class="mini" data-a="hr_recdel" data-k="${k}" data-id="${r.id}">Remove</button></span></td></tr>`
    ),
    "Nothing recorded yet."
  )}</div>`;
}
DOC_SPECS.prec = r => {
  const C = HR_REC[r.kind],
    e = hrEmp(r.emp) || {};
  return {
    title: C.print,
    status: ["On file", "ok"],
    banner: "",
    date: r.date ? dateGB(r.date) : docWhen(r.at),
    parties: [
      {
        h: "Employee",
        name: e.name || "-",
        lines: [[e.no, e.job, e.dept].filter(Boolean).join(" · ")]
      },
      { h: "Recorded by", name: r.by || "-", lines: [] }
    ],
    facts: C.f
      .filter(f => Array.isArray(f[2]) || f[0] === "period")
      .map(f => [f[1], r[f[0]] || "-"]),
    c: ["Detail", "Notes"],
    r: C.f.filter(f => f[2] === "wide").map(f => [f[1], r[f[0]] || "-"]),
    notes: [],
    sign: ["Employee", "Manager", "Witness"]
  };
};
// ---------------------------------------------------------------- duty roster
const hrMonday = day => {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymdOf(d);
};
const hrWeek = mon =>
  hrDays(mon, ymdOf(new Date(new Date(mon + "T12:00:00").getTime() + 6 * 864e5)));
const hrRoster = () => hr().roster || (hr().roster = {});
const hrSwaps = () => hr().swaps || (hr().swaps = []);
const hrDayName = d =>
  new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });
const hrShiftHours = s => {
  const [a, b] = [s.s, s.e].map(x => x.split(":").map(Number));
  return ((b[0] * 60 + b[1] - a[0] * 60 - a[1] + 1440) % 1440) / 60;
};
function hrRosterHTML() {
  if (!hrEmps().length) return hrNeedEmp;
  const mon = hrMonday(hrS.week || ymdOf(new Date())),
    W = hrWeek(mon),
    S = hrR().shifts,
    Rs = hrRoster(),
    hours = e =>
      W.reduce((a, d) => {
        const s = S.find(x => x.n === Rs[`${e.id}|${d}`]);
        return a + (s ? hrShiftHours(s) : 0);
      }, 0);
  return `<div class="pn"><div class="inv-head"><label class="hr-inl">Week of<input type="date" data-hs="week" value="${mon}"></label><span class="inv-btns"><button class="mini" data-a="hr_rosprev">Copy last week</button><button class="mini" data-a="hr_rospr">Print</button></span></div>
  <div class="tw"><table class="t hr-t hr-ros"><thead><tr><th>Employee</th>${W.map(d => `<th${isHrHoliday(d) ? ' class="hr-hol"' : ""}>${hrDayName(d)}</th>`).join("")}<th class="n">Hours</th></tr></thead><tbody>${hrEmps()
    .map(
      e =>
        `<tr><td><b>${esc(e.name)}</b></td>${W.map(d => {
          const on = Rs[`${e.id}|${d}`] || "";
          return `<td><select data-hro="${e.id}|${d}" aria-label="${esc(e.name)} on ${d}"><option value="">-</option>${S.map(s => `<option ${s.n === on ? "selected" : ""}>${esc(s.n)}</option>`).join("")}<option ${on === "Off" ? "selected" : ""}>Off</option></select></td>`;
        }).join("")}<td class="n">${qn(hours(e))}</td></tr>`
    )
    .join(
      ""
    )}</tbody></table></div><div class="stk">${S.map(s => `${esc(s.n)} ${s.s} to ${s.e}`).join(" · ")}. Late is measured from the rostered shift.</div></div>
  <div class="pn"><h4>Shift swap</h4><div class="pv-form"><label class="ac-wide">Asking<select id="hrSA">${hrEmpOpts("")}</select></label><label class="ac-wide">Swapping with<select id="hrSB">${hrEmpOpts("")}</select></label><label>Date<input id="hrSD" type="date" value="${W[0]}"></label><button class="chip on" data-a="hr_swapadd">Send for approval</button></div>${hrTbl(
    ["Date", "Asking", "Swapping with", "Status", ""],
    hrSwaps()
      .slice()
      .reverse()
      .map(s => {
        const n = id => esc((hrEmp(id) || {}).name || "-");
        return `<tr><td>${dateGB(s.date)}</td><td>${n(s.a)}</td><td>${n(s.b)}</td><td><span class="tag ${s.status === "Approved" ? "ok" : s.status === "Rejected" ? "bad" : "warn"}">${esc(s.status)}</span></td><td class="n">${s.status === AWAIT ? `<span class="sp-acts"><button class="chip on" data-a="hr_ask" data-act="swapok" data-id="${s.id}">Approve</button><button class="mini" data-a="hr_ask" data-act="swapno" data-id="${s.id}">Reject</button></span>` : ""}</td></tr>`;
      }),
    "No swaps asked for."
  )}</div>`;
}
// ---------------------------------------------------------------- advances, loans, SACCO and HELB
const HR_RECUR = ["Staff loan", "SACCO", "HELB", "Other standing deduction"];
const hrAdvLive = a => a.status !== AWAIT && a.status !== "Rejected";
function hrAdvHTML() {
  const H = hr(),
    wait = H.adv.filter(a => a.status === AWAIT),
    live = H.adv.filter(a => hrAdvLive(a) && a.left > 0.004),
    R = hrR();
  return `<div class="pn"><h4>Advance payment</h4><div class="stk">An advance is paid now and taken back from pay. A manager approves it, then print the slip for the employee to sign.</div><div class="pv-form"><label class="ac-wide">Employee<select id="hrAE">${hrEmpOpts("")}</select></label><label>Amount (KES)<input id="hrAA" type="number" min="0" step="any"></label><label>Paid back per month<input id="hrAI" type="number" min="0" step="any" placeholder="All next month"></label><label>Paid from<select id="hrAF">${acOptions("1000", acMoney())}</select></label></div><div class="pv-form"><label class="ac-wide">Reason<input id="hrAW" maxlength="120" placeholder="Why it's needed"></label><button class="chip on" data-a="hr_advadd">Send for approval</button></div>
  ${
    wait.length
      ? `<h4>Waiting for approval (${wait.length})</h4>${hrTbl(
          ["Date", "Employee", "Reason", "#Amount", "#Per month", ""],
          wait.map(a => {
            const e = hrEmp(a.emp) || {},
              over = (+e.basic || 0) > 0 && a.amt > ((+e.basic || 0) * R.advMax) / 100;
            return `<tr><td>${dt2(a.at)}</td><td><b>${esc(e.name || "-")}</b></td><td>${esc(a.why || "-")}${over ? ` <span class="tag warn">Over ${R.advMax}% of basic</span>` : ""}${hrAdvOpen(a.emp).length ? ' <span class="tag warn">Still repaying one</span>' : ""}</td><td class="n">${m2(a.amt)}</td><td class="n">${m2(a.inst)}</td><td class="n"><span class="sp-acts"><button class="chip on" data-a="hr_ask" data-act="advok" data-id="${a.id}">Approve</button><button class="mini" data-a="hr_ask" data-act="advno" data-id="${a.id}">Reject</button></span></td></tr>`;
          }),
          ""
        )}`
      : ""
  }
  <h4>Being repaid (${live.length})</h4>${hrTbl(
    ["Date", "Employee", "#Advance", "#Per month", "#Still owed", "Repaid in cash", ""],
    live.map(
      a =>
        `<tr><td>${dt2(a.at)}</td><td><b>${esc((hrEmp(a.emp) || {}).name || "-")}</b></td><td class="n">${m2(a.amt)}</td><td class="n">${m2(a.inst)}</td><td class="n"><b>${m2(a.left)}</b></td><td><span class="sp-acts"><input class="hr-n" id="hrRp_${a.id}" type="number" min="0" step="any" aria-label="Amount repaid"><button class="mini" data-a="hr_advrepay" data-id="${a.id}">Record</button></span></td><td class="n">${docBtn("padv", a.id, "Slip")}</td></tr>`
    ),
    "No advances being repaid."
  )}</div>`;
}
function hrRecurHTML() {
  const L = hr().recur || [];
  return `<div class="pn"><h4>Loans, SACCO and HELB</h4><div class="stk">Taken from pay every month until the balance is cleared. Leave the balance empty if it has no end.</div><div class="pv-form"><label class="ac-wide">Employee<select id="hrLnE">${hrEmpOpts("")}</select></label><label>Type<select id="hrLnK">${hrOpts(HR_RECUR)}</select></label><label>Per month (KES)<input id="hrLnM" type="number" min="0" step="any"></label><label>Balance (KES)<input id="hrLnB" type="number" min="0" step="any" placeholder="No end"></label><label>Reference<input id="hrLnR" maxlength="40" placeholder="Member or loan no"></label></div><div class="pv-form"><label>A staff loan is paid from<select id="hrLnF">${acOptions("1000", acMoney())}</select></label><button class="chip on" data-a="hr_lnadd">Add</button></div>${hrTbl(
    ["Employee", "Type", "Reference", "#Per month", "#Balance", ""],
    L.filter(x => x.on !== false && (x.left === null || x.left > 0.004)).map(
      x =>
        `<tr><td><b>${esc((hrEmp(x.emp) || {}).name || "-")}</b></td><td>${esc(x.kind)}</td><td>${esc(x.ref || "-")}</td><td class="n">${m2(x.monthly)}</td><td class="n">${x.left === null ? "No end" : m2(x.left)}</td><td class="n"><button class="mini" data-a="hr_lnstop" data-id="${x.id}">Stop</button></td></tr>`
    ),
    "None set up."
  )}</div>`;
}
DOC_SPECS.padv = a => {
  const e = hrEmp(a.emp) || {},
    rep = a.repaid || [];
  return {
    title: "Advance Payment Slip",
    status: a.left > 0.004 ? ["Being repaid", "warn"] : ["Repaid", "ok"],
    banner: "",
    parties: [
      { h: "Paid to", name: e.name || "-", lines: [[e.no, e.job].filter(Boolean).join(" · ")] },
      {
        h: "Paid from",
        name: (acAcc(a.from) || {}).name || "-",
        lines: a.jv ? [`Accounts ${a.jv}`] : []
      }
    ],
    facts: [
      ["Advance (KES)", m2(a.amt)],
      ["Paid back per month", m2(a.inst)],
      ["Still owed", m2(a.left)],
      ["Approved by", a.appr ? a.appr.by : "-"]
    ],
    c: ["Repaid", "How", "#Amount"],
    r: rep.map(x => [
      x.period ? hrMonthName(x.period) : dateGB(x.date),
      x.period ? "Payroll" : "Cash",
      m2(x.amt)
    ]),
    totals: [
      ["Repaid so far", m2(a.amt - a.left)],
      ["Still owed (KES)", m2(a.left), true]
    ],
    notes: [
      ...(a.why ? [["Reason", a.why]] : []),
      ["Agreement", "I agree that this advance may be taken from my pay as shown above."]
    ],
    sign: ["Employee", "Approved by"]
  };
};
// ---------------------------------------------------------------- final pay
const HR_EXIT = ["Dismissed", "End of contract", "Resigned", "Redundancy", "Retired", "Died"];
const hrYearsBetween = (a, b) => (new Date(b) - new Date(a)) / (365.25 * 864e5);
/** What's due when someone leaves, as a one-person payroll line so that it reaches the returns and P9. */
function hrExitLine(e, F) {
  const p = F.last.slice(0, 7),
    B = +e.basic || 0,
    day = +F.last.slice(8),
    // Already on an approved payroll for that month? Those days have been paid for.
    paidMonth = hrRuns().some(
      r => r.period === p && !r.off && r.status !== "Draft" && r.lines.some(l => l.emp === e.id)
    ),
    worked = paidMonth ? 0 : hrRound(((B + hrAllow(e)) * day) / 30),
    leftDays = Math.max(0, hrLeaveBal(e, F.last).left),
    leavePay = hrRound((leftDays * B) / 26),
    notice = hrRound((+F.notice || 0) * B),
    // Redundancy: at least 15 days' pay for each year served.
    years = e.start ? Math.max(0, hrYearsBetween(e.start, F.last)) : 0,
    service =
      F.reason === "Redundancy" ? hrRound((Math.floor(years) * 15 * B) / 30) : +F.service || 0,
    L = hrNewLine(e, p),
    // Everything owed comes off, unless a smaller amount was typed.
    tk = (owed, typed) =>
      typed === "" || typed === undefined ? owed : Math.min(owed, Math.max(0, +typed));
  let loanLeft = tk(
    hrRound(
      hrRecurOpen(e.id)
        .filter(x => x.kind === "Staff loan" && x.left !== null)
        .reduce((a, x) => a + x.left, 0)
    ),
    F.loanTake
  );
  Object.assign(L, {
    basic: worked,
    house: 0,
    transport: 0,
    otherAllow: 0,
    dayRate: 0,
    otHrs: 0,
    holHrs: 0,
    unpaidDays: 0,
    commission: 0,
    tips: 0,
    svc: 0,
    bonus: hrRound(leavePay + notice + service + (+F.other || 0)),
    exit: {
      paidMonth,
      worked,
      leftDays,
      leavePay,
      notice,
      service,
      other: +F.other || 0,
      reason: F.reason,
      last: F.last
    },
    billTake: tk(hrOwes(e.id, "bill"), F.billTake),
    otherTake: tk(hrOwes(e.id, "other"), F.otherTake),
    advTake: tk(hrRound(hrAdvOpen(e.id).reduce((a, x) => a + x.left, 0)), F.advTake),
    recur: hrRecurOpen(e.id)
      .filter(x => x.kind === "Staff loan" && x.left !== null)
      .map(x => {
        const take = Math.min(x.left, loanLeft);
        loanLeft = hrRound(loanLeft - take);
        return { id: x.id, kind: x.kind, ref: x.ref, take };
      })
  });
  return hrCalc(L);
}
function hrExitDone(id, who) {
  const e = hrEmp(id),
    F = hrS.exit,
    L = hrExitLine(e, F),
    run = {
      id: `FIN-${F.last.slice(2).replace(/-/g, "")}-${hrRuns().filter(r => r.off).length + 1}`,
      off: true,
      period: F.last.slice(0, 7),
      at: new Date().toISOString(),
      by: boUser.n,
      status: "Draft",
      lines: [L]
    },
    err = L.net < 0 ? "They owe more than they're due. Lower what's taken." : hrPostRun(run, who);
  if (err) return err;
  hr().runs.push(run);
  // A draft for the month shouldn't pay them again.
  hrRuns()
    .filter(r => r.period === run.period && !r.off && r.status === "Draft")
    .forEach(r => (r.lines = r.lines.filter(l => l.emp !== id)));
  e.status = "Left";
  e.end = F.last;
  e.leftWhy = F.reason;
  hr().charges = hr().charges.filter(c => !(c.emp === id && c.left <= 0.004));
  hrS.exit = null;
  docOpen("pslip", `${run.id}-${L.no}`);
  return "";
}
DOC_SPECS.pcert = r => {
  const l = r.lines[0],
    e = hrEmp(l.emp) || {},
    co = docCompany();
  return {
    title: "Certificate of Service",
    status: ["Issued", "ok"],
    banner: "",
    date: dateGB(l.exit.last),
    parties: [
      { h: "Employee", name: l.name, lines: [`ID ${e.idNo || "-"}`] },
      { h: "Employer", name: co.name, lines: co.lines.slice(0, 2) }
    ],
    facts: [
      ["Date started", e.start ? dateGB(e.start) : "-"],
      ["Last day", dateGB(l.exit.last)],
      ["Worked as", l.job || "-"],
      ["Department", l.dept || "-"]
    ],
    c: ["Detail", "Notes"],
    r: [
      [
        "Certificate",
        `This is to certify that ${l.name} was employed by ${co.name} as ${l.job || "a member of staff"} from the dates shown.`
      ]
    ],
    notes: [],
    sign: ["For the employer"]
  };
};
// ---------------------------------------------------------------- P9
function hrP9List() {
  const years = [
    ...new Set(
      hrRuns()
        .filter(r => r.status !== "Draft")
        .map(r => r.period.slice(0, 4))
    )
  ];
  return years.flatMap(y =>
    hr()
      .emps.filter(e =>
        hrRuns().some(
          r => r.status !== "Draft" && r.period.startsWith(y) && r.lines.some(l => l.emp === e.id)
        )
      )
      .map(e => ({ id: `P9-${y}-${e.no}`, at: `${y}-12-31T12:00:00`, year: y, emp: e }))
  );
}
DOC_SPECS.p9 = P => {
  const sum = (L, f) => hrRound(L.reduce((a, l) => a + (+l[f] || 0), 0)),
    R = hrR(),
    months = Array.from({ length: 12 }, (_, i) => `${P.year}-${String(i + 1).padStart(2, "0")}`),
    rows = months.map(m => {
      const L = hrRuns()
        .filter(r => r.status !== "Draft" && r.period === m)
        .flatMap(r => r.lines.filter(l => l.emp === P.emp.id));
      return { m, L };
    }),
    tot = f => hrRound(rows.reduce((a, x) => a + sum(x.L, f), 0));
  return {
    title: "P9 Tax Deduction Card",
    status: ["For " + P.year, "ok"],
    banner: "",
    date: `Year ${P.year}`,
    parties: [
      { h: "Employee", name: P.emp.name, lines: [`KRA PIN ${P.emp.kra || "-"}`] },
      {
        h: "Employer",
        name: docCompany().name,
        lines: docCompany().lines.filter(l => /KRA PIN/.test(l))
      }
    ],
    facts: [
      ["Total gross", m2(tot("gross"))],
      ["Total taxable", m2(tot("taxable"))],
      ["Total PAYE", m2(tot("paye"))],
      ["Staff no", P.emp.no]
    ],
    c: ["Month", "#Gross", "#NSSF", "#SHA", "#Housing", "#Taxable", "#Tax", "#PAYE"],
    r: rows.map(({ m, L }) => [
      new Date(m + "-15T12:00:00").toLocaleDateString("en-GB", { month: "short" }),
      m2(sum(L, "gross")),
      m2(sum(L, "nssf")),
      m2(sum(L, "sha")),
      m2(sum(L, "ahl")),
      m2(sum(L, "taxable")),
      m2(sum(L, "before")),
      m2(sum(L, "paye"))
    ]),
    totals: [
      ["Personal relief a month", m2(R.relief)],
      ["Total PAYE (KES)", m2(tot("paye")), true]
    ],
    notes: [
      ["Note", "Check this against your KRA iTax P10 returns before giving it to the employee."]
    ],
    sign: ["For the employer"]
  };
};

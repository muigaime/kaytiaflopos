// ---- Accounting: the working screens. Everything posts through one journal, so reports always agree. ----
const AC_TABS = [
  ["h", "Overview"],
  ["home", "Insights", "chart"],
  ["h", "Ledgers"],
  ["coa", "Chart of accounts", "book"],
  ["jv", "Journal entries", "plus"],
  ["gl", "Ledger transactions", "book"],
  ["h", "Money"],
  ["exp", "Expenses and income", "wal"],
  ["bank", "Bank accounts", "wal"],
  ["btx", "Bank transactions", "truck"],
  ["rec", "Bank reconciliation", "shield"],
  ["h", "Assets"],
  ["fa", "Fixed assets", "box"],
  ["h", "Financial reports"],
  ...Object.entries(AC_REPORTS).map(([k, [n]]) => ["r_" + k, n, "chart"]),
  ["h", "Setup"],
  ["set", "Revenue and tax", "shield"],
  ["imp", "Import", "dl"]
];
const AC_PAGES = {
  home: ["Insights", "How the business is doing, at a glance."],
  coa: ["Chart of accounts", "Every account in the books, with its balance today."],
  jv: ["Journal entries", "Post a transaction by hand. Entries can be reversed, never deleted."],
  gl: ["Ledger transactions", "Every movement on one account, with its running balance."],
  exp: ["Expenses and income", "Record money going out, and income that isn't a POS sale."],
  bank: ["Bank accounts", "The accounts the business banks with."],
  btx: ["Bank transactions", "Deposits, withdrawals, payments, transfers and bank charges."],
  rec: ["Bank reconciliation", "Tick what's on the statement until the difference is zero."],
  fa: [
    "Fixed assets",
    "What the business owns for the long term, and what it's worth after depreciation."
  ],
  set: ["Revenue and tax", "Where sales, payments and tax go in the books."],
  imp: ["Import", "Bring in accounts, opening balances and expenses from a spreadsheet."]
};
let acT = "home",
  acJ = null,
  acNewBank = false,
  acNewAsset = false,
  acNewAcc = null;
const acF = {
  from: "",
  to: "",
  gl: "1000",
  q: "",
  src: "All",
  bank: "",
  exp: "out",
  stmt: "",
  stmtDate: "",
  impKind: "coa",
  impMsg: ""
};
function acDefaults() {
  const t = ymdOf(new Date());
  if (!acF.to) acF.to = t;
  if (!acF.from) acF.from = t.slice(0, 8) + "01";
  if (!acF.stmtDate) acF.stmtDate = t;
}
function acDateBar() {
  const t = ymdOf(new Date()),
    last = (() => {
      const d = new Date(+t.slice(0, 4), +t.slice(5, 7) - 1, 0);
      return [ymdOf(new Date(d.getFullYear(), d.getMonth(), 1)), ymdOf(d)];
    })(),
    R = [
      ["This month", t.slice(0, 8) + "01", t],
      ["Last month", last[0], last[1]],
      ["This financial year", acFyStart(t), t]
    ];
  return `<div class="rp-filters ac-dates"><label>From<input type="date" data-acd="from" value="${acF.from}"></label><label>To<input type="date" data-acd="to" value="${acF.to}"></label><span class="pr-pills">${R.map(([l, a, b]) => `<button class="pr-pill ${acF.from === a && acF.to === b ? "on" : ""}" data-a="ac_range" data-f="${a}" data-t="${b}">${l}</button>`).join("")}</span></div>`;
}
const acKpi = (l, v, c = "") => `<div class="sp-kpi ${c}"><span>${l}</span><b>${v}</b></div>`;
const acKes = n => `KES ${acMoneyStr(n)}`;
// ---------------------------------------------------------------- insights
function acMonths(n) {
  const now = new Date(),
    out = [];
  for (let i = n - 1; i >= 0; i--) {
    const a = new Date(now.getFullYear(), now.getMonth() - i, 1),
      z = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    out.push({
      l: a.toLocaleDateString("en-GB", { month: "short" }),
      long: a.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      from: ymdOf(a),
      to: ymdOf(z)
    });
  }
  return out;
}
function acHome() {
  const t = ymdOf(new Date()),
    from = t.slice(0, 8) + "01",
    T = acTotals(from, t),
    All = acTotals("", t),
    S = ty =>
      acSorted()
        .filter(a => a.type === ty)
        .reduce((x, a) => x + acShown(a.code, T[a.code] || 0), 0),
    inc = S("Income"),
    cos = S("Cost of sales"),
    exp = S("Expense"),
    profit = inc - cos - exp,
    cash = acMoney().reduce((x, a) => x + (All[a.code] || 0), 0),
    debt = (All["1200"] || 0) + (All["1210"] || 0),
    owe = -(All["2000"] || 0),
    M = acMonths(6).map(m => {
      const X = acTotals(m.from, m.to),
        sum2 = ty =>
          acSorted()
            .filter(a => a.type === ty)
            .reduce((x, a) => x + acShown(a.code, X[a.code] || 0), 0),
        rev = sum2("Income"),
        cst2 = sum2("Cost of sales") + sum2("Expense");
      return { ...m, rev, cst: cst2 };
    }),
    top = Math.max(1, ...M.flatMap(m => [m.rev, m.cst])),
    bar = (v, cl, tip) =>
      `<i class="ac-b1 ${cl}" style="height:${Math.max(v > 0 ? 2 : 0, (v / top) * 100)}%" data-tip="${esc(tip)}" tabindex="0" aria-label="${esc(tip)}"></i>`,
    E = acSorted()
      .filter(
        a =>
          (a.type === "Expense" || a.type === "Cost of sales") && Math.abs(T[a.code] || 0) >= 0.005
      )
      .map(a => ({ a, v: T[a.code] }))
      .sort((x, y) => y.v - x.v)
      .slice(0, 6),
    eTop = Math.max(1, ...E.map(e => e.v)),
    notes = [
      !acS().banks.length && [
        "Add your bank accounts so payments and reconciliation work.",
        "bank"
      ],
      debt > 0 && [`${acKes(debt)} is owed to the business by customers and guests.`, "r_ad"],
      owe > 0 && [`${acKes(owe)} is owed to vendors.`, "r_ac"],
      inc &&
        cos / inc > 0.4 && [
          `Cost of sales is ${((cos / inc) * 100).toFixed(0)}% of income this month. Hospitality usually aims for under 35%.`,
          "r_pl"
        ],
      acS().assets.some(a => !a.disposed) &&
        !acS().depTo && ["Depreciation hasn't been run on your fixed assets yet.", "fa"]
    ].filter(Boolean);
  return `<div class="sp-kpis ac-kpis">${acKpi("Income this month", acKes(inc))}${acKpi("Gross margin", inc ? `${(((inc - cos) / inc) * 100).toFixed(1)}%` : "–")}${acKpi("Net profit this month", acKes(profit), profit < 0 ? "crit" : "")}${acKpi("Cash and bank", acKes(cash))}${acKpi("Owed to you", acKes(debt))}${acKpi("You owe vendors", acKes(owe))}</div>
  <div class="ac-two"><div class="pn"><div class="inv-head"><h4>Income against costs · last 6 months</h4><span class="ac-legend"><span><i class="s1"></i>Income</span><span><i class="s2"></i>Costs and expenses</span></span></div>
  <div class="ac-chart" role="img" aria-label="Income against costs for the last 6 months. The figures are in the table below.">${M.map(m => `<div class="ac-col"><div class="ac-bars">${bar(m.rev, "s1", `${m.long}: income ${acKes(m.rev)}`)}${bar(m.cst, "s2", `${m.long}: costs ${acKes(m.cst)}`)}</div><span>${m.l}</span></div>`).join("")}</div>
  <details class="ac-data"><summary>See the figures</summary>${acTable(
    ["Month", "#Income", "#Costs and expenses", "#Profit"],
    M.map(m => [m.long, acMoneyStr(m.rev), acMoneyStr(m.cst), acMoneyStr(m.rev - m.cst)])
  )}</details></div>
  <div class="pn"><h4>Biggest costs this month</h4>${E.length ? `<div class="trk-places">${E.map(e => `<div class="trk-place ac-hb" data-tip="${esc(e.a.name)}: ${acKes(e.v)}"><span>${esc(e.a.name)}</span><div class="trk-bar"><i style="width:${Math.max(3, (e.v / eTop) * 100)}%"></i></div><b>${acMoneyStr(e.v)}</b></div>`).join("")}</div>` : '<div class="empty">No costs recorded this month.</div>'}</div></div>
  ${notes.length ? `<div class="pn"><h4>Worth a look</h4><div class="ac-notes">${notes.map(([x, go2]) => `<button class="ac-note" data-a="ac_tab" data-t="${go2}"><span>${esc(x)}</span><b aria-hidden="true">→</b></button>`).join("")}</div></div>` : ""}`;
}
// ---------------------------------------------------------------- chart of accounts
function acCoaHTML() {
  const T = acTotals("", ymdOf(new Date())),
    q = acF.q.trim().toLowerCase(),
    L = acSorted().filter(
      a => !q || `${a.code} ${a.name} ${a.group} ${a.type}`.toLowerCase().includes(q)
    ),
    used = new Set(acEntries().flatMap(e => e.lines.map(l => l.a))),
    F = acNewAcc,
    form = F
      ? `<div class="pn"><h4>${F.edit ? `Edit ${esc(F.edit)}` : "New account"}</h4><div class="pv-form"><label>Code<input id="acCode" maxlength="6" value="${esc(F.code)}" ${F.edit ? "readonly" : ""} placeholder="e.g. 6150"></label><label>Account name<input id="acNm" maxlength="60" value="${esc(F.name)}" ${F.sys ? "" : ""}></label><label>Type<select id="acTy" ${F.edit ? "disabled" : ""}>${AC_TYPES.map(t => `<option ${t === F.type ? "selected" : ""}>${t}</option>`).join("")}</select></label><label>Group<input id="acGr" maxlength="40" value="${esc(F.group)}" list="acGrL" placeholder="e.g. Premises"><datalist id="acGrL">${[...new Set(acCoa().map(a => a.group))].map(g => `<option value="${esc(g)}">`).join("")}</datalist></label><button class="chip on" data-a="ac_accsave">Save</button><button class="mini" data-a="ac_accno">Cancel</button></div></div>`
      : "";
  return `${form}<div class="pn"><div class="inv-head"><h4>Accounts (${acCoa().length})</h4><span class="inv-btns"><input id="acFind" type="search" value="${esc(acF.q)}" placeholder="Search code or name" autocomplete="off">${F ? "" : '<button class="chip on" data-a="ac_accnew">New account</button>'}</span></div><div id="acCoaBody">${acCoaRows(L, T, used)}</div></div>`;
}
function acCoaRows(L, T, used) {
  return AC_TYPES.map(ty => {
    const R = L.filter(a => a.type === ty);
    if (!R.length) return "";
    const tot = R.reduce((x, a) => x + acShown(a.code, T[a.code] || 0), 0);
    return `<div class="ac-type"><div class="ac-th"><b>${ty}</b><span>${acKes(tot)}</span></div><div class="tw"><table class="t"><tr><th>Code</th><th>Account</th><th>Group</th><th class="n">Balance (KES)</th><th></th></tr>${R.map(a => `<tr class="${a.active === false ? "ac-off" : ""}"><td class="ac-code">${a.code}</td><td><b>${esc(a.name)}</b>${a.active === false ? ' <span class="tag">Off</span>' : ""}</td><td>${esc(a.group)}</td><td class="n">${acMoneyStr(acShown(a.code, T[a.code] || 0))}</td><td class="n"><span class="sp-acts"><button class="mini" data-a="ac_glopen" data-k="${a.code}">Ledger</button><button class="mini" data-a="ac_accedit" data-k="${a.code}">Edit</button>${a.sys ? "" : used.has(a.code) ? `<button class="mini" data-a="ac_accoff" data-k="${a.code}">${a.active === false ? "Turn on" : "Turn off"}</button>` : `<button class="mini cat-del" data-a="ac_accdel" data-k="${a.code}">Delete</button>`}</span></td></tr>`).join("")}</table></div></div>`;
  }).join("");
}
// ---------------------------------------------------------------- journals
const acJBlank = () => ({
  date: ymdOf(new Date()),
  narr: "",
  ref: "",
  lines: [
    { a: "", dr: "", cr: "" },
    { a: "", dr: "", cr: "" }
  ]
});
function acJTotals() {
  const dr = acJ.lines.reduce((x, l) => x + (parseFloat(l.dr) || 0), 0),
    cr = acJ.lines.reduce((x, l) => x + (parseFloat(l.cr) || 0), 0),
    off = acCents(dr) - acCents(cr);
  return `<span>Debits <b>${acMoneyStr(dr)}</b></span><span>Credits <b>${acMoneyStr(cr)}</b></span><span class="${off ? "ac-off-b" : "ac-on-b"}">${off ? `Out by ${m2(Math.abs(off) / 100)}` : dr ? "Balanced" : ""}</span>`;
}
function acJvHTML() {
  const E = acS().jv.slice().reverse(),
    form = acJ
      ? `<div class="pn"><h4>New journal entry</h4><div class="pv-form"><label>Date<input id="acJD" type="date" value="${acJ.date}"></label><label class="ac-wide">What it's for<input id="acJN" maxlength="120" value="${esc(acJ.narr)}" placeholder="e.g. Rent for November"></label><label>Reference<input id="acJR" maxlength="40" value="${esc(acJ.ref)}" placeholder="Optional"></label></div>
  <div class="tw"><table class="t ac-jl"><tr><th>Account</th><th class="n">Debit</th><th class="n">Credit</th><th></th></tr>${acJ.lines.map((l, i) => `<tr><td><select data-jl="${i}.a">${acOptions(l.a)}</select></td><td class="n"><input data-jl="${i}.dr" type="number" min="0" step="any" value="${esc(l.dr)}"></td><td class="n"><input data-jl="${i}.cr" type="number" min="0" step="any" value="${esc(l.cr)}"></td><td class="n">${acJ.lines.length > 2 ? `<button class="mini" data-a="ac_jdel" data-i="${i}" aria-label="Remove line">✕</button>` : ""}</td></tr>`).join("")}</table></div>
  <div class="ac-jfoot"><button class="mini" data-a="ac_jadd">Add line</button><span class="ac-jt" id="acJT">${acJTotals()}</span><span class="inv-btns"><button class="mini" data-a="ac_jno">Cancel</button><button class="chip on" data-a="ac_jpost">Post journal</button></span></div></div>`
      : "";
  return `${form}<div class="pn tw"><div class="inv-head"><h4>Posted entries (${E.length})</h4>${acJ ? "" : '<button class="chip on" data-a="ac_jnew">New journal</button>'}</div>${
    E.length
      ? `<table class="t"><tr><th>Date</th><th>No</th><th>Type</th><th>What it's for</th><th>Lines</th><th class="n">Amount (KES)</th><th>By</th><th></th></tr>${E.slice(
          0,
          200
        )
          .map(
            j =>
              `<tr><td>${dateGB(j.date)}</td><td><b>${j.id}</b></td><td>${esc(j.src)}</td><td>${esc(j.narr)}${j.reversedBy ? ` <span class="tag">Reversed by ${j.reversedBy}</span>` : ""}</td><td class="ac-lines">${j.lines.map(l => `<div>${esc(acName(l.a))}</div>`).join("")}</td><td class="n">${acMoneyStr(j.lines.reduce((x, l) => x + l.dr, 0))}</td><td>${esc(j.by)}</td><td class="n"><span class="sp-acts">${docBtn("acv", j.id, "Print")}${j.reversedBy || j.reverses ? "" : `<button class="mini" data-a="ac_jrev" data-k="${j.id}">Reverse</button>`}</span></td></tr>`
          )
          .join("")}</table>`
      : '<div class="empty">No journals yet. POS sales, purchases and payments post by themselves.</div>'
  }</div>`;
}
// ---------------------------------------------------------------- ledger
function acGlHTML() {
  const code = acF.gl,
    a = acAcc(code) || acSorted()[0],
    open = acShown(a.code, acNet(a.code, "", addDays(acF.from, -1))),
    L = [];
  let bal = open,
    dr = 0,
    cr = 0;
  acEntries()
    .filter(e => e.date >= acF.from && e.date <= acF.to)
    .forEach(e =>
      e.lines
        .filter(l => l.a === a.code)
        .forEach(l => {
          bal += acDebitSide(a.type) ? l.dr - l.cr : l.cr - l.dr;
          dr += l.dr;
          cr += l.cr;
          L.push([
            dateGB(e.date),
            e.ref || e.id,
            e.src,
            e.narr,
            l.dr ? acMoneyStr(l.dr) : "",
            l.cr ? acMoneyStr(l.cr) : "",
            acMoneyStr(bal)
          ]);
        })
    );
  return `<div class="pn"><div class="rp-filters"><label class="ac-wide">Account<select data-acs="gl">${acOptions(a.code)}</select></label></div>${acDateBar()}</div>
  <div class="sp-kpis ac-kpis">${acKpi("Opening balance", acKes(open))}${acKpi("Debits", acKes(dr))}${acKpi("Credits", acKes(cr))}${acKpi("Closing balance", acKes(bal), "trk-now")}</div>
  <div class="pn"><div class="inv-head"><h4>${esc(a.code)} ${esc(a.name)}</h4><span class="inv-btns"><button class="mini xl-btn" data-a="ac_glxlsx">Export to Excel</button><button class="chip on" data-a="ac_glprint">Print</button></span></div>${acTable(["Date", "Reference", "Source", "Narration", "#Debit", "#Credit", "#Balance"], [Object.assign(["", "", "", "Opening balance", "", "", acMoneyStr(open)], { b: true }), ...L], acB(["Closing", "", "", "", acMoneyStr(dr), acMoneyStr(cr), acMoneyStr(bal)]))}</div>`;
}
function acGlExport(kind) {
  if (!boCan("rep.print")) return boDenied();
  const a = acAcc(acF.gl);
  let bal = acShown(a.code, acNet(a.code, "", addDays(acF.from, -1)));
  const R = [["", "", "", "Opening balance", "", "", acMoneyStr(bal)]];
  acEntries()
    .filter(e => e.date >= acF.from && e.date <= acF.to)
    .forEach(e =>
      e.lines
        .filter(l => l.a === a.code)
        .forEach(l => {
          bal += acDebitSide(a.type) ? l.dr - l.cr : l.cr - l.dr;
          R.push([
            dateGB(e.date),
            e.ref || e.id,
            e.src,
            e.narr,
            l.dr ? acMoneyStr(l.dr) : "",
            l.cr ? acMoneyStr(l.cr) : "",
            acMoneyStr(bal)
          ]);
        })
    );
  const C = ["Date", "Reference", "Source", "Narration", "#Debit", "#Credit", "#Balance"],
    title = `Ledger: ${a.code} ${a.name}`,
    when = `${dateGB(acF.from)} to ${dateGB(acF.to)}`;
  if (kind === "xlsx") {
    XLSX.download(
      {
        company: FD_SETTINGS.name,
        title,
        head: when,
        by: xlsxBy(),
        sections: [{ t: a.name, c: C, r: R }]
      },
      `Ledger_${a.code}_${acF.from}_to_${acF.to}`
    );
    return toast("Ledger exported to Excel.");
  }
  stPrint(
    title,
    `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>${esc(title)}</h2></div><div>${esc(when)}</div><table class="st-t" style="margin-top:10px"><thead><tr>${C.map(h => `<th${h[0] === "#" ? ' class="n"' : ""}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${R.map(r => `<tr>${r.map((v, i) => `<td${C[i][0] === "#" ? ' class="n"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table><div style="margin-top:14px">${esc(printedBy())}</div></div>`
  );
}
// ---------------------------------------------------------------- expenses and income
function acExpHTML() {
  const out = acF.exp === "out",
    L = acS()
      .jv.filter(
        j => j.src === (out ? "Expense" : "Other income") && j.date >= acF.from && j.date <= acF.to
      )
      .slice()
      .reverse(),
    money = acOptions("1000", acMoney()),
    cats = acSorted().filter(
      a =>
        a.active !== false &&
        (out ? a.type === "Expense" || a.type === "Cost of sales" : a.type === "Income")
    ),
    amt = j => j.lines.reduce((x, l) => x + l.dr, 0);
  return `<div class="pn"><div class="seg2 ac-seg"><button class="${out ? "on" : ""}" data-a="ac_expk" data-k="out">Post an expense</button><button class="${out ? "" : "on"}" data-a="ac_expk" data-k="in">Receive other income</button></div>
  <div class="pv-form"><label>Date<input id="acED" type="date" value="${ymdOf(new Date())}"></label><label class="ac-wide">${out ? "Expense account" : "Income account"}<select id="acEA">${acOptions("", cats)}</select></label><label>Amount (KES)<input id="acEM" type="number" min="0" step="any"></label>${out ? '<label>VAT included (KES)<input id="acEV" type="number" min="0" step="any" placeholder="0"></label>' : ""}</div>
  <div class="pv-form"><label>${out ? "Paid from" : "Received into"}<select id="acEF">${money}${out ? `<option value="2000">2000 On credit (owe the vendor)</option>` : ""}</select></label><label>${out ? "Paid to" : "Received from"}<input id="acEP" maxlength="60" placeholder="Name"></label><label>Reference<input id="acER" maxlength="40" placeholder="Receipt or invoice no"></label><label class="ac-wide">Note<input id="acEN" maxlength="120" placeholder="What it was for"></label><button class="chip on" data-a="ac_exppost">${out ? "Post expense" : "Post income"}</button></div></div>
  <div class="pn tw">${acDateBar()}<div class="sp-kpis ac-kpis">${acKpi(out ? "Expenses" : "Other income", acKes(L.filter(j => !j.reversedBy && !j.reverses).reduce((x, j) => x + amt(j), 0)))}${acKpi("Entries", L.length)}</div>${
    L.length
      ? `<table class="t"><tr><th>Date</th><th>No</th><th>Account</th><th>${out ? "Paid to" : "From"}</th><th>Note</th><th class="n">Amount (KES)</th><th></th></tr>${L.map(j => `<tr><td>${dateGB(j.date)}</td><td>${j.id}</td><td>${esc(acName((out ? j.lines.find(l => l.dr > 0 && l.a !== "1320") : j.lines.find(l => l.cr > 0) || {}).a || ""))}</td><td>${esc(j.who || "")}</td><td>${esc(j.narr)}${j.reversedBy ? ` <span class="tag">Reversed</span>` : ""}</td><td class="n">${acMoneyStr(amt(j))}</td><td class="n"><span class="sp-acts">${docBtn("acv", j.id, "Print")}${j.reversedBy || j.reverses ? "" : `<button class="mini" data-a="ac_jrev" data-k="${j.id}">Reverse</button>`}</span></td></tr>`).join("")}</table>`
      : '<div class="empty">Nothing posted for these dates.</div>'
  }</div>`;
}
// ---------------------------------------------------------------- banks
function acBankHTML() {
  const B = acS().banks,
    T = acTotals("", ymdOf(new Date()));
  return `${
    acNewBank || !B.length
      ? `<div class="pn"><h4>New bank account</h4><div class="pv-form"><label>Name<input id="acBN" maxlength="40" placeholder="e.g. KCB Main Account"></label><label>Bank<input id="acBB" maxlength="40" placeholder="e.g. KCB"></label><label>Branch<input id="acBR" maxlength="40"></label><label>Account number<input id="acBA" maxlength="30"></label></div><div class="pv-form"><label>Opening balance (KES)<input id="acBO" type="number" step="any" placeholder="0"></label><label>As at<input id="acBD" type="date" value="${ymdOf(new Date())}"></label><button class="chip on" data-a="ac_banksave">Save bank account</button>${B.length ? '<button class="mini" data-a="ac_bankno">Cancel</button>' : ""}</div></div>`
      : ""
  }<div class="pn tw"><div class="inv-head"><h4>Bank accounts (${B.length})</h4>${acNewBank || !B.length ? "" : '<button class="chip on" data-a="ac_banknew">New bank account</button>'}</div>${
    B.length
      ? `<div class="ac-banks">${B.map(b => `<article class="ac-bank"><div><h5>${esc(b.name)}</h5><p>${[esc(b.bank), esc(b.branch), esc(b.no)].filter(Boolean).join(" · ")}</p><small>Ledger ${b.code}</small></div><b>${acKes(T[b.code] || 0)}</b><span class="sp-acts"><button class="mini" data-a="ac_glopen" data-k="${b.code}">Ledger</button><button class="mini" data-a="ac_recopen" data-k="${b.code}">Reconcile</button></span></article>`).join("")}</div>`
      : '<div class="empty">No bank accounts yet.</div>'
  }</div>`;
}
const AC_BTX = [
  ["dep", "Deposit", "Money coming into the bank"],
  ["wd", "Withdrawal", "Cash taken out of the bank, into the cash box or to whoever collected it"],
  ["pay", "Payment", "Money leaving the bank"],
  ["tr", "Transfer", "Between your own accounts, such as banking the day's cash"],
  ["chg", "Bank charge", "Fees the bank took"]
];
function acBtxHTML() {
  const banks = acS().banks;
  if (!banks.length)
    return '<div class="pn"><div class="empty">Add a bank account first.</div><button class="chip on" data-a="ac_tab" data-t="bank">Go to bank accounts</button></div>';
  const k = acF.btx || "dep",
    bankOpts = banks.map(b => `<option value="${b.code}">${esc(b.name)}</option>`).join(""),
    L = acS()
      .jv.filter(j => j.src === "Bank" && j.date >= acF.from && j.date <= acF.to)
      .slice()
      .reverse();
  return `<div class="pn"><div class="pr-pills ac-kinds">${AC_BTX.map(([x, l]) => `<button class="pr-pill ${x === k ? "on" : ""}" data-a="ac_btxk" data-k="${x}">${l}</button>`).join("")}</div><div class="stk">${AC_BTX.find(x => x[0] === k)[2]}</div>
  <div class="pv-form"><label>Date<input id="acTD" type="date" value="${ymdOf(new Date())}"></label><label>${k === "tr" ? "From" : "Bank account"}<select id="acTB">${k === "tr" ? acOptions("1000", acMoney()) : bankOpts}</select></label>${k === "tr" ? `<label>To<select id="acTO">${acOptions(banks[0].code, acMoney())}</select></label>` : k === "chg" ? "" : `<label class="ac-wide">${k === "dep" ? "Where it came from" : k === "wd" ? "Where the money goes" : "What it paid for"}<select id="acTO">${acOptions(k === "wd" ? "1000" : "")}</select></label>`}<label>Amount (KES)<input id="acTM" type="number" min="0" step="any"></label></div>
  <div class="pv-form">${k === "wd" ? '<label>Collected by<input id="acTW" maxlength="60" placeholder="Who took the cash"></label>' : ""}<label>Reference<input id="acTR" maxlength="40" placeholder="Slip or cheque number"></label><label class="ac-wide">Note<input id="acTN" maxlength="120" placeholder="What it's for"></label><button class="chip on" data-a="ac_btxpost">Post ${AC_BTX.find(x => x[0] === k)[1].toLowerCase()}</button></div></div>
  <div class="pn tw">${acDateBar()}${L.length ? `<table class="t"><tr><th>Date</th><th>No</th><th>What it's for</th><th>Reference</th><th class="n">Amount (KES)</th><th></th></tr>${L.map(j => `<tr><td>${dateGB(j.date)}</td><td>${j.id}</td><td>${esc(j.narr)}${j.reversedBy ? ` <span class="tag">Reversed</span>` : ""}</td><td>${esc(j.ref)}</td><td class="n">${acMoneyStr(j.lines.reduce((x, l) => x + l.dr, 0))}</td><td class="n"><span class="sp-acts">${docBtn("acv", j.id, "Print")}${j.reversedBy || j.reverses ? "" : `<button class="mini" data-a="ac_jrev" data-k="${j.id}">Reverse</button>`}</span></td></tr>`).join("")}</table>` : '<div class="empty">No bank transactions for these dates.</div>'}</div>`;
}
const acLineKey = (e, i) => `${e.id}#${i}`;
function acRecHTML() {
  const banks = acS().banks;
  if (!banks.length)
    return '<div class="pn"><div class="empty">Add a bank account first.</div><button class="chip on" data-a="ac_tab" data-t="bank">Go to bank accounts</button></div>';
  if (!banks.some(b => b.code === acF.bank)) acF.bank = banks[0].code;
  const code = acF.bank,
    C = acS().cleared,
    L = [];
  acEntries().forEach(e => {
    if (e.date > acF.stmtDate) return;
    e.lines.forEach((l, i) => {
      if (l.a === code) L.push({ e, l, key: acLineKey(e, i) });
    });
  });
  const open = L.filter(x => !C[x.key]),
    clearedBal = L.filter(x => C[x.key]).reduce((a, x) => a + x.l.dr - x.l.cr, 0),
    book = L.reduce((a, x) => a + x.l.dr - x.l.cr, 0),
    stmt = parseFloat(acF.stmt),
    diff = (Number.isFinite(stmt) ? stmt : 0) - clearedBal;
  return `<div class="pn"><div class="pv-form"><label>Bank account<select data-acs="bank">${banks.map(b => `<option value="${b.code}" ${b.code === code ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label><label>Statement date<input type="date" data-acs="stmtDate" value="${acF.stmtDate}"></label><label>Statement closing balance (KES)<input id="acSB" data-acs="stmt" type="number" step="any" value="${esc(acF.stmt)}" placeholder="From your bank statement"></label></div></div>
  <div class="sp-kpis ac-kpis">${acKpi("Balance in the books", acKes(book))}${acKpi("Ticked so far", acKes(clearedBal))}${acKpi("Statement", acF.stmt === "" ? "–" : acKes(stmt))}${acKpi("Difference", acF.stmt === "" ? "–" : acKes(diff), Number.isFinite(stmt) ? (acCents(diff) ? "crit" : "ac-ok") : "")}</div>
  <div class="pn tw"><div class="inv-head"><h4>Not yet ticked (${open.length})</h4><span class="inv-btns"><button class="mini" data-a="ac_recall">Tick all</button><button class="chip on" data-a="ac_recsave" ${Number.isFinite(stmt) && !acCents(diff) ? "" : "disabled"}>Finish reconciliation</button></span></div>${
    L.length
      ? `<table class="t"><tr><th></th><th>Date</th><th>Reference</th><th>Narration</th><th class="n">Money in</th><th class="n">Money out</th></tr>${L.slice()
          .reverse()
          .slice(0, 300)
          .map(
            x =>
              `<tr class="${C[x.key] ? "ac-tick" : ""}"><td><input type="checkbox" data-acr="${esc(x.key)}" ${C[x.key] ? "checked" : ""} aria-label="On the statement"></td><td>${dateGB(x.e.date)}</td><td>${esc(x.e.ref || x.e.id)}</td><td>${esc(x.e.narr)}</td><td class="n">${x.l.dr ? acMoneyStr(x.l.dr) : ""}</td><td class="n">${x.l.cr ? acMoneyStr(x.l.cr) : ""}</td></tr>`
          )
          .join("")}</table>`
      : '<div class="empty">No movements on this account yet.</div>'
  }</div>${
    acS().recs.filter(r => r.bank === code).length
      ? `<div class="pn tw"><h4>Past reconciliations</h4><table class="t"><tr><th>Statement date</th><th class="n">Statement balance</th><th>By</th><th>Done on</th><th></th></tr>${acS()
          .recs.filter(r => r.bank === code)
          .slice()
          .reverse()
          .map(
            r =>
              `<tr><td>${dateGB(r.date)}</td><td class="n">${acMoneyStr(r.bal)}</td><td>${esc(r.by)}</td><td>${new Date(r.at).toLocaleDateString("en-GB")}</td><td class="n">${r.id ? docBtn("rec", r.id, "Print") : ""}</td></tr>`
          )
          .join("")}</table></div>`
      : ""
  }`;
}
// ---------------------------------------------------------------- fixed assets
const AC_ASSET_CLASS = [
  ["1500", "1505", "Land and buildings", 40],
  ["1510", "1515", "Furniture and fittings", 8],
  ["1520", "1525", "Kitchen and bar equipment", 8],
  ["1530", "1535", "Computers and POS hardware", 3],
  ["1540", "1545", "Motor vehicles", 5]
];
/** Depreciation built up on an asset by the end of a month. Straight line, or reducing balance at its rate. */
function acDepTo(a, to) {
  if (a.disposed && a.disposed < to) to = a.disposed;
  const s = new Date(a.date),
    e = new Date(to),
    mo = Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1),
    base = a.cost - (a.residual || 0);
  if (a.method === "RB") {
    const r = (a.rate || 25) / 100 / 12;
    return Math.min(base, a.cost - a.cost * Math.pow(1 - r, mo));
  }
  return Math.min(base, (base / (a.life * 12)) * mo);
}
const acAssetPosted = a => a.dep || 0;
function acFaHTML() {
  const A = acS().assets,
    day = ymdOf(new Date()),
    live = A.filter(a => !a.disposed),
    cost = live.reduce((x, a) => x + a.cost, 0),
    dep = live.reduce((x, a) => x + acAssetPosted(a), 0),
    due = live.reduce((x, a) => x + Math.max(0, acDepTo(a, day) - acAssetPosted(a)), 0);
  return `${
    acNewAsset || !A.length
      ? `<div class="pn"><h4>New fixed asset</h4><div class="pv-form"><label class="ac-wide">Asset name<input id="acFN" maxlength="60" placeholder="e.g. Walk-in freezer"></label><label>Class<select id="acFC">${AC_ASSET_CLASS.map(c => `<option value="${c[0]}">${c[2]}</option>`).join("")}</select></label><label>Date bought<input id="acFD" type="date" value="${day}"></label><label>Cost (KES)<input id="acFA" type="number" min="0" step="any"></label></div>
  <div class="pv-form"><label>Method<select id="acFM"><option value="SL">Straight line</option><option value="RB">Reducing balance</option></select></label><label>Useful life (years)<input id="acFL" type="number" min="1" step="any" value="5"></label><label>Yearly rate for reducing (%)<input id="acFR" type="number" min="1" step="any" value="25"></label><label>Worth at the end (KES)<input id="acFE" type="number" min="0" step="any" value="0"></label><label>Paid from<select id="acFP">${acOptions("1000", acMoney())}<option value="2000">2000 On credit (owe the vendor)</option><option value="3900">3900 Already owned (opening balance)</option></select></label></div>
  <div class="pv-form"><button class="chip on" data-a="ac_fasave">Save asset</button>${A.length ? '<button class="mini" data-a="ac_fano">Cancel</button>' : ""}</div></div>`
      : ""
  }<div class="sp-kpis ac-kpis">${acKpi("Assets", live.length)}${acKpi("Cost", acKes(cost))}${acKpi("Depreciation to date", acKes(dep))}${acKpi("Book value", acKes(cost - dep), "trk-now")}</div>
  <div class="pn tw"><div class="inv-head"><h4>Asset register</h4><span class="inv-btns">${due > 0.004 ? `<button class="mini" data-a="ac_farun">Post depreciation (${acKes(due)})</button>` : ""}${acNewAsset || !A.length ? "" : '<button class="chip on" data-a="ac_fanew">New asset</button>'}</span></div>${
    A.length
      ? `<table class="t"><tr><th>Asset</th><th>Class</th><th>Bought</th><th>Method</th><th class="n">Cost</th><th class="n">Depreciation</th><th class="n">Book value</th><th></th></tr>${A.map(a => `<tr class="${a.disposed ? "ac-off" : ""}"><td><b>${esc(a.name)}</b></td><td>${esc((AC_ASSET_CLASS.find(c => c[0] === a.cls) || [])[2] || "")}</td><td>${dateGB(a.date)}</td><td>${a.method === "RB" ? `Reducing ${a.rate}%` : `Straight line, ${qn(a.life)} yrs`}</td><td class="n">${m2(a.cost)}</td><td class="n">${acMoneyStr(acAssetPosted(a))}</td><td class="n">${a.disposed ? `Sold ${dateGB(a.disposed)}` : acMoneyStr(a.cost - acAssetPosted(a))}</td><td class="n">${a.disposed ? "" : `<button class="mini" data-a="ac_faout" data-k="${a.id}">Sell or scrap</button>`}</td></tr>${acF.faOut === a.id ? `<tr><td colspan="8"><div class="pv-form"><label>Date<input id="acDD" type="date" value="${day}"></label><label>Sold for (KES, 0 if scrapped)<input id="acDA" type="number" min="0" step="any" value="0"></label><label>Money into<select id="acDI">${acOptions("1000", acMoney())}</select></label><button class="chip on" data-a="ac_fadisp" data-k="${a.id}">Confirm</button><button class="mini" data-a="ac_faoutno">Cancel</button></div></td></tr>` : ""}`).join("")}</table>`
      : '<div class="empty">No fixed assets yet.</div>'
  }</div>`;
}
// ---------------------------------------------------------------- reports
function acReportHTML(k) {
  const D = acReport(k, acF.from, acF.to),
    asAt = D.asAt || k === "bs" || k === "tb";
  return `<div class="pn">${asAt ? `<div class="rp-filters"><label>As at<input type="date" data-acd="to" value="${acF.to}"></label></div>` : acDateBar()}<div class="rp-bar ac-rbar"><span class="stk">${asAt ? `Position on ${dateGB(acF.to)}` : `${dateGB(acF.from)} to ${dateGB(acF.to)}`}</span><span class="rp-tools"><button class="mini xl-btn" data-a="ac_rxlsx" data-k="${k}">Export to Excel</button><button class="chip on" data-a="ac_rprint" data-k="${k}">Print</button></span></div>${D.check ? `<div class="status bad">${esc(D.check)}</div>` : ""}${D.kpi ? `<div class="sp-kpis ac-kpis">${D.kpi.map(([l, v]) => acKpi(l, acKes(v), /loss|profit/i.test(l) && v < 0 ? "crit" : "")).join("")}</div>` : ""}${acTable(D.c, D.r, D.f)}${k === "bs" ? acStockNote() : ""}</div>`;
}
function acStockNote() {
  const ledger = acNet("1300", "", acF.to),
    count = LOCS.reduce(
      (a, l) => a + Object.keys(ING).reduce((x, k) => x + Math.max(0, have(l, k)) * cst(k), 0),
      0
    );
  return `<div class="stk ac-note2">Stock in the ledger is ${acKes(ledger)}, and the stock on hand at today's cost is worth ${acKes(count)}. Any gap usually comes from opening stock not yet entered as a journal, or items with no cost.</div>`;
}
// ---------------------------------------------------------------- setup
function acSetHTML() {
  const A = acS(),
    P = ALLD.filter(posSells),
    inc = acSorted().filter(a => a.type === "Income"),
    cos = acSorted().filter(a => a.type === "Cost of sales"),
    pay = [...PAY_BUILT.map(x => [x[0], x[1]]), ...payCustoms().map(c => [c.k, c.n])],
    months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
  return `<div class="pn tw"><h4>Where each selling point's sales go</h4><table class="t"><tr><th>Selling point</th><th>Revenue account</th><th>Cost of sales account</th></tr>${[...P, "Front Desk"].map(d => `<tr><td><b>${esc(d)}</b></td><td><select data-acm="rev|${esc(d)}">${acOptions(acRevOf(d), inc)}</select></td><td>${d === "Front Desk" ? "–" : `<select data-acm="cogs|${esc(d)}">${acOptions(acCogsOf(d), cos)}</select>`}</td></tr>`).join("")}</table></div>
  <div class="pn tw"><h4>Where each payment mode goes</h4><table class="t"><tr><th>Payment mode</th><th>Account</th></tr>${pay.map(([k, n]) => `<tr><td><b>${esc(n)}</b></td><td><select data-acm="pay|${esc(k)}">${acOptions(acPayOf(k))}</select></td></tr>`).join("")}</table></div>
  <div class="pn"><h4>Tax</h4><div class="stk">VAT on sales goes to 2100 VAT output, VAT on purchases to 1320 VAT input, and Tax C to 2110. The rates are set under Settings → Tax: VAT ${qn(TAX.B)}%, Tax C ${qn(TAX.C)}%.</div></div>
  <div class="pn"><h4>Financial year and closing the books</h4><div class="pv-form"><label>Financial year starts in<select data-acm="fy|">${months.map((m, i) => `<option value="${i + 1}" ${A.fyStart === i + 1 ? "selected" : ""}>${m}</option>`).join("")}</select></label><label>Books closed up to<input type="date" data-acm="lock|" value="${A.lock || ""}"></label></div><div class="stk">Nothing can be posted by hand on or before the closed date, so finished periods stay as they were reported. POS sales and purchases dated in a closed period still appear, so avoid back-dating them.</div></div>`;
}
const AC_IMP = {
  coa: ["Chart of accounts", "code,name,type,group", "6150,Garden maintenance,Expense,Premises"],
  ob: ["Opening balances", "code,debit,credit", "1000,50000,0\n2500,0,200000"],
  exp: [
    "Expenses",
    "date,account,amount,paid_from,paid_to,note",
    "2026-11-01,6110,12500,1000,Kenya Power,October bill"
  ]
};
function acImpHTML() {
  const k = acF.impKind,
    [title, head, eg] = AC_IMP[k];
  return `<div class="pn"><div class="seg2 ac-seg">${Object.entries(AC_IMP)
    .map(
      ([x, v]) =>
        `<button class="${x === k ? "on" : ""}" data-a="ac_impk" data-k="${x}">${v[0]}</button>`
    )
    .join("")}</div>
  <div class="stk">Save your spreadsheet as CSV, then choose the file or paste the rows below. The first row must be the headings. Dates look like 2026-11-30.${k === "ob" ? " Whatever doesn't balance goes to 3900 Opening balances." : ""}</div>
  <div class="ac-imp"><div><b>Columns</b><code>${head}</code><b>Example</b><code class="ac-pre">${esc(eg)}</code><button class="mini" data-a="ac_imptpl">Download template</button></div>
  <div><label class="ac-file">Choose a CSV file<input id="acImpF" type="file" accept=".csv,text/csv"></label><textarea id="acImpT" rows="8" placeholder="Or paste the rows here"></textarea><div class="pv-form">${k === "ob" ? `<label>Opening date<input id="acImpD" type="date" value="${ymdOf(new Date())}"></label>` : ""}<button class="chip on" data-a="ac_imprun">Import ${title.toLowerCase()}</button></div></div></div>
  ${acF.impMsg ? `<div class="ac-impmsg">${acF.impMsg}</div>` : ""}</div>`;
}
function acCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
function acImport(text) {
  const k = acF.impKind,
    R = acCsv(text),
    errs = [];
  if (R.length < 2) return "Nothing to import. Include the heading row and at least one row.";
  const H = R[0].map(x => x.toLowerCase().replace(/\s+/g, "_")),
    at = n => H.indexOf(n),
    need = AC_IMP[k][1].split(",").filter(n => !["group", "note", "paid_to"].includes(n)),
    miss = need.filter(n => at(n) < 0);
  if (miss.length) return `These headings are missing: ${miss.join(", ")}.`;
  let done = 0;
  const num = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
  if (k === "coa")
    R.slice(1).forEach((r, i) => {
      const code = r[at("code")],
        name = r[at("name")],
        type = AC_TYPES.find(t => t.toLowerCase() === String(r[at("type")] || "").toLowerCase());
      if (!/^\d{3,6}$/.test(code || "") || !name || !type)
        return errs.push(`Row ${i + 2}: needs a number code, a name and a valid type.`);
      if (acAcc(code)) return errs.push(`Row ${i + 2}: ${code} already exists.`);
      acCoa().push({ code, name, type, group: (at("group") > -1 && r[at("group")]) || "Imported" });
      done++;
    });
  if (k === "ob") {
    const lines = [];
    R.slice(1).forEach((r, i) => {
      const code = r[at("code")],
        dr = num(r[at("debit")]),
        cr = num(r[at("credit")]);
      if (!acAcc(code)) return errs.push(`Row ${i + 2}: there is no account ${code}.`);
      if (dr <= 0 && cr <= 0) return errs.push(`Row ${i + 2}: no amount.`);
      lines.push({ a: code, dr, cr });
    });
    if (errs.length) return `Nothing was imported.<br>${errs.map(esc).join("<br>")}`;
    const off = lines.reduce((x, l) => x + l.dr - l.cr, 0);
    if (Math.abs(off) >= 0.005)
      lines.push({ a: "3900", dr: off < 0 ? -off : 0, cr: off > 0 ? off : 0 });
    const e = acPost({
      date: $("#acImpD").value,
      narr: "Opening balances imported",
      src: "Opening",
      lines
    });
    if (e) return e;
    done = lines.length;
  }
  if (k === "exp")
    R.slice(1).forEach((r, i) => {
      const a = r[at("account")],
        from = r[at("paid_from")],
        amt = num(r[at("amount")]),
        date = r[at("date")];
      if (!acAcc(a) || !acAcc(from)) return errs.push(`Row ${i + 2}: check the account codes.`);
      if (!(amt > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date || ""))
        return errs.push(`Row ${i + 2}: needs an amount and a date like 2026-11-30.`);
      const who = at("paid_to") > -1 ? r[at("paid_to")] : "",
        note = (at("note") > -1 && r[at("note")]) || who || "Imported expense",
        e = acPost({
          date,
          narr: note,
          src: "Expense",
          lines: [
            { a, dr: amt, cr: 0 },
            { a: from, dr: 0, cr: amt }
          ]
        });
      if (e) return errs.push(`Row ${i + 2}: ${e}`);
      acS().jv[acS().jv.length - 1].who = who;
      done++;
    });
  acFresh();
  auditAdd("Import", `${AC_IMP[k][0]}: ${done} imported, ${errs.length} skipped`, {
    mod: "Accounting"
  });
  bosave();
  return `<b>${done} imported.</b>${errs.length ? `<br>${errs.length} skipped:<br>${errs.map(esc).join("<br>")}` : ""}`;
}
// ---------------------------------------------------------------- page
function acRail() {
  const L = AC_TABS;
  return L.map(([t, l, ic]) =>
    t === "h"
      ? `<div class="rhd">${l}</div>`
      : `<button class="ir ${t === acT ? "on" : ""}" data-a="ac_tab" data-t="${t}">${I(ic)}<span>${l}</span></button>`
  ).join("");
}
function acctView() {
  acS();
  acFresh();
  acDefaults();
  const isRep = acT.startsWith("r_"),
    k = acT.slice(2),
    [title, what] = isRep ? AC_REPORTS[k] : AC_PAGES[acT],
    body = isRep
      ? acReportHTML(k)
      : {
          home: acHome,
          coa: acCoaHTML,
          jv: acJvHTML,
          gl: acGlHTML,
          exp: acExpHTML,
          bank: acBankHTML,
          btx: acBtxHTML,
          rec: acRecHTML,
          fa: acFaHTML,
          set: acSetHTML,
          imp: acImpHTML
        }[acT]();
  return `<div class="inv invx acx"><nav class="inv-rail">${acRail()}</nav><div class="inv-main"><div class="inv-title"><h1>${title}</h1><p>${what}</p></div>${body}</div></div>`;
}
V.acct = acctView;
const acV = id => {
  const el = $("#" + id);
  return el ? el.value.trim() : "";
};
function acAct(a, b) {
  if (!boCan("fin.menu")) return boDenied();
  const seq0 = acS().seq,
    d = b.dataset,
    done = msg => {
      // Whatever was just posted opens as a voucher. A whole file imported at once does not.
      if (acS().seq > seq0 && a !== "ac_imprun") docOpen("acv", acS().jv[acS().jv.length - 1].id);
      if (msg) toast(msg);
      all();
    },
    posted = (err, msg, after) => {
      if (err) return toast(err);
      if (after) after();
      done(msg);
    };
  if (a === "ac_tab") {
    acT = d.t;
    return all();
  }
  if (a === "ac_range") {
    acF.from = d.f;
    acF.to = d.t;
    return all();
  }
  if (a === "ac_rxlsx" || a === "ac_rprint")
    return acRepExport(d.k, a === "ac_rxlsx" ? "xlsx" : "print", acF.from, acF.to);
  if (a === "ac_glopen") {
    acF.gl = d.k;
    acT = "gl";
    return all();
  }
  if (a === "ac_glxlsx" || a === "ac_glprint")
    return acGlExport(a === "ac_glxlsx" ? "xlsx" : "print");
  // ---- chart of accounts
  if (a === "ac_accnew") {
    acNewAcc = { code: "", name: "", type: "Expense", group: "" };
    return all();
  }
  if (a === "ac_accedit") {
    const x = acAcc(d.k);
    acNewAcc = { ...x, edit: x.code };
    return all();
  }
  if (a === "ac_accno") {
    acNewAcc = null;
    return all();
  }
  if (a === "ac_accsave") {
    const F = acNewAcc,
      code = acV("acCode"),
      name = acV("acNm"),
      group = acV("acGr");
    if (!/^\d{3,6}$/.test(code)) return toast("The code should be 3 to 6 digits.");
    if (!name) return toast("Enter the account name.");
    if (!F.edit && acAcc(code)) return toast(`Account ${code} already exists.`);
    if (F.edit) Object.assign(acAcc(F.edit), { name, group: group || "General" });
    else acCoa().push({ code, name, type: $("#acTy").value, group: group || "General" });
    auditAdd("Chart of accounts", `${F.edit ? "Edited" : "Added"} ${code} ${name}`, {
      mod: "Accounting"
    });
    acNewAcc = null;
    bosave();
    return done(`${code} ${name} saved.`);
  }
  if (a === "ac_accoff") {
    const x = acAcc(d.k);
    x.active = x.active === false;
    bosave();
    return done(`${x.name} turned ${x.active ? "on" : "off"}.`);
  }
  if (a === "ac_accdel") {
    const x = acAcc(d.k);
    return tapConfirm(
      b,
      () => {
        acS().coa = acCoa().filter(c => c.code !== x.code);
        auditAdd("Chart of accounts", `Deleted ${x.code} ${x.name}`, {
          mod: "Accounting",
          pri: "Important"
        });
        bosave();
        done(`${x.name} deleted.`);
      },
      "Delete?"
    );
  }
  // ---- journals
  if (a === "ac_jnew") {
    acJ = acJBlank();
    return all();
  }
  if (a === "ac_jno") {
    acJ = null;
    return all();
  }
  if (a === "ac_jadd" || a === "ac_jdel") {
    acJ.date = acV("acJD");
    acJ.narr = acV("acJN");
    acJ.ref = acV("acJR");
    if (a === "ac_jadd") acJ.lines.push({ a: "", dr: "", cr: "" });
    else acJ.lines.splice(+d.i, 1);
    return all();
  }
  if (a === "ac_jpost") {
    const bad = acJ.lines.find(l => (parseFloat(l.dr) || 0) > 0 && (parseFloat(l.cr) || 0) > 0);
    if (bad) return toast("A line can be a debit or a credit, not both.");
    return posted(
      acPost({
        date: acV("acJD"),
        narr: acV("acJN"),
        ref: acV("acJR"),
        lines: acJ.lines.map(l => ({
          a: l.a,
          dr: parseFloat(l.dr) || 0,
          cr: parseFloat(l.cr) || 0
        }))
      }),
      "Journal posted.",
      () => (acJ = null)
    );
  }
  if (a === "ac_jrev")
    return tapConfirm(b, () => posted(acReverse(d.k), `${d.k} reversed.`), "Reverse?");
  // ---- expenses and income
  if (a === "ac_expk") {
    acF.exp = d.k;
    return all();
  }
  if (a === "ac_exppost") {
    const out = acF.exp === "out",
      acc = acV("acEA"),
      from = acV("acEF"),
      amt = parseFloat(acV("acEM")),
      vat = out ? parseFloat(acV("acEV")) || 0 : 0,
      who = acV("acEP"),
      note = acV("acEN") || who;
    if (!acc) return toast("Choose the account.");
    if (!(amt > 0)) return toast("Enter the amount.");
    if (vat < 0 || vat >= amt) return toast("VAT should be less than the amount.");
    if (!note) return toast("Say who it was paid to, or add a note.");
    const lines = out
      ? [
          { a: acc, dr: amt - vat, cr: 0 },
          ...(vat ? [{ a: "1320", dr: vat, cr: 0 }] : []),
          { a: from, dr: 0, cr: amt }
        ]
      : [
          { a: from, dr: amt, cr: 0 },
          { a: acc, dr: 0, cr: amt }
        ];
    return posted(
      acPost({
        date: acV("acED"),
        narr: note,
        ref: acV("acER"),
        src: out ? "Expense" : "Other income",
        lines
      }),
      out ? "Expense posted." : "Income posted.",
      () => (acS().jv[acS().jv.length - 1].who = who)
    );
  }
  // ---- banks
  if (a === "ac_banknew" || a === "ac_bankno") {
    acNewBank = a === "ac_banknew";
    return all();
  }
  if (a === "ac_banksave") {
    const name = acV("acBN");
    if (!name) return toast("Enter a name for the account.");
    if (acS().banks.some(x => x.name.toLowerCase() === name.toLowerCase()))
      return toast(`${name} is already on the list.`);
    let n = 1100;
    while (acAcc(String(n))) n += 10;
    const code = String(n),
      open = parseFloat(acV("acBO")) || 0;
    acCoa().push({ code, name, type: "Asset", group: "Cash and bank", sys: true });
    acS().banks.push({
      id: code,
      code,
      name,
      bank: acV("acBB"),
      branch: acV("acBR"),
      no: acV("acBA")
    });
    if (open) {
      const e = acPost({
        date: acV("acBD"),
        narr: `Opening balance of ${name}`,
        src: "Opening",
        bank: code,
        lines:
          open > 0
            ? [
                { a: code, dr: open, cr: 0 },
                { a: "3900", dr: 0, cr: open }
              ]
            : [
                { a: "3900", dr: -open, cr: 0 },
                { a: code, dr: 0, cr: -open }
              ]
      });
      if (e) toast(e);
    }
    acNewBank = false;
    auditAdd("Bank account", `Added ${name}`, { mod: "Accounting" });
    bosave();
    return done(`${name} saved.`);
  }
  if (a === "ac_btxk") {
    acF.btx = d.k;
    return all();
  }
  if (a === "ac_btxpost") {
    const k = acF.btx || "dep",
      bank = acV("acTB"),
      to = acV("acTO"),
      amt = parseFloat(acV("acTM")),
      note =
        acV("acTN") ||
        { dep: "Deposit", wd: "Withdrawal", pay: "Payment", tr: "Transfer", chg: "Bank charge" }[k];
    if (!(amt > 0)) return toast("Enter the amount.");
    if ((k === "tr" || k === "wd") && bank === to) return toast("Choose two different accounts.");
    if ((k === "dep" || k === "wd" || k === "pay" || k === "tr") && !to)
      return toast("Choose the other account.");
    const lines =
      k === "dep"
        ? [
            { a: bank, dr: amt, cr: 0 },
            { a: to, dr: 0, cr: amt }
          ]
        : k === "pay" || k === "wd"
          ? [
              { a: to, dr: amt, cr: 0 },
              { a: bank, dr: 0, cr: amt }
            ]
          : k === "tr"
            ? [
                { a: to, dr: amt, cr: 0 },
                { a: bank, dr: 0, cr: amt }
              ]
            : [
                { a: "6420", dr: amt, cr: 0 },
                { a: bank, dr: 0, cr: amt }
              ];
    return posted(
      acPost({
        date: acV("acTD"),
        narr: note,
        ref: acV("acTR"),
        src: "Bank",
        bank,
        btx: k,
        who: k === "wd" ? acV("acTW") : "",
        lines
      }),
      `${AC_BTX.find(x => x[0] === k)[1]} posted.`
    );
  }
  if (a === "ac_recopen") {
    acF.bank = d.k;
    acT = "rec";
    return all();
  }
  if (a === "ac_recall") {
    acEntries().forEach(e => {
      if (e.date > acF.stmtDate) return;
      e.lines.forEach((l, i) => {
        if (l.a === acF.bank) acS().cleared[acLineKey(e, i)] = true;
      });
    });
    bosave();
    return all();
  }
  if (a === "ac_recsave") {
    const recL = [];
    acEntries().forEach(e => {
      if (e.date > acF.stmtDate) return;
      e.lines.forEach((l, i) => {
        if (l.a === acF.bank) recL.push({ e, l, key: acLineKey(e, i) });
      });
    });
    const recId = nid("REC"),
      sum = L => L.reduce((x, y) => x + y.l.dr - y.l.cr, 0),
      ticked = recL.filter(x => acS().cleared[x.key]),
      notTicked = recL.filter(x => !acS().cleared[x.key]);
    acS().recs.push({
      id: recId,
      book: sum(recL),
      ticked: sum(ticked),
      open: notTicked.map(x => ({
        date: x.e.date,
        ref: x.e.ref || x.e.id,
        narr: x.e.narr,
        dr: x.l.dr,
        cr: x.l.cr
      })),
      bank: acF.bank,
      date: acF.stmtDate,
      bal: parseFloat(acF.stmt),
      by: boUser.n,
      at: new Date().toISOString()
    });
    auditAdd(
      "Bank reconciliation",
      `${acName(acF.bank)} to ${dateGB(acF.stmtDate)}, KES ${m2(parseFloat(acF.stmt))}`,
      { mod: "Accounting" }
    );
    acF.stmt = "";
    docOpen("rec", recId);
    bosave();
    return done("Reconciliation saved.");
  }
  // ---- fixed assets
  if (a === "ac_fanew" || a === "ac_fano") {
    acNewAsset = a === "ac_fanew";
    return all();
  }
  if (a === "ac_fasave") {
    const name = acV("acFN"),
      cost2 = parseFloat(acV("acFA")),
      life = parseFloat(acV("acFL")),
      res = parseFloat(acV("acFE")) || 0,
      cls = acV("acFC"),
      date = acV("acFD"),
      from = acV("acFP");
    if (!name) return toast("Enter the asset's name.");
    if (!(cost2 > 0)) return toast("Enter what it cost.");
    if (!(life > 0)) return toast("Enter its useful life in years.");
    if (res < 0 || res >= cost2)
      return toast("What it's worth at the end should be less than its cost.");
    return posted(
      acPost({
        date,
        narr: `Bought ${name}`,
        src: "Fixed asset",
        lines: [
          { a: cls, dr: cost2, cr: 0 },
          { a: from, dr: 0, cr: cost2 }
        ]
      }),
      `${name} added to the register.`,
      () => {
        const c = AC_ASSET_CLASS.find(x => x[0] === cls);
        acS().assets.push({
          id: "FA" + Date.now(),
          name,
          cls,
          acc: c[1],
          date,
          cost: cost2,
          life,
          residual: res,
          method: acV("acFM"),
          rate: parseFloat(acV("acFR")) || 25,
          dep: 0
        });
        acNewAsset = false;
        bosave();
      }
    );
  }
  if (a === "ac_farun") {
    const day = ymdOf(new Date()),
      by = {},
      list = acS().assets.filter(x => !x.disposed);
    list.forEach(x => {
      const due = Math.max(0, acDepTo(x, day) - acAssetPosted(x));
      if (due >= 0.005) by[x.acc] = (by[x.acc] || 0) + due;
    });
    const total = Object.values(by).reduce((x, v) => x + v, 0),
      lines = [
        { a: "6700", dr: total, cr: 0 },
        ...Object.entries(by).map(([acc, v]) => ({ a: acc, dr: 0, cr: v }))
      ];
    return posted(
      acPost({ date: day, narr: `Depreciation to ${dateGB(day)}`, src: "Depreciation", lines }),
      `Depreciation of ${acKes(total)} posted.`,
      () => {
        list.forEach(x => (x.dep = Math.max(acAssetPosted(x), acDepTo(x, day))));
        acS().depTo = day;
        bosave();
      }
    );
  }
  if (a === "ac_faout" || a === "ac_faoutno") {
    acF.faOut = a === "ac_faout" ? d.k : "";
    return all();
  }
  if (a === "ac_fadisp") {
    const x = acS().assets.find(y => y.id === d.k),
      got = parseFloat(acV("acDA")) || 0,
      into = acV("acDI"),
      nbv = x.cost - acAssetPosted(x),
      gain = got - nbv,
      lines = [
        ...(got > 0 ? [{ a: into, dr: got, cr: 0 }] : []),
        ...(acAssetPosted(x) > 0 ? [{ a: x.acc, dr: acAssetPosted(x), cr: 0 }] : []),
        { a: x.cls, dr: 0, cr: x.cost },
        ...(gain > 0.004
          ? [{ a: "4810", dr: 0, cr: gain }]
          : gain < -0.004
            ? [{ a: "6710", dr: -gain, cr: 0 }]
            : [])
      ],
      date = acV("acDD");
    return posted(
      acPost({ date, narr: `${x.name} sold or scrapped`, src: "Fixed asset", lines }),
      `${x.name} taken off the register.`,
      () => {
        x.disposed = date;
        acF.faOut = "";
        bosave();
      }
    );
  }
  // ---- import
  if (a === "ac_impk") {
    acF.impKind = d.k;
    acF.impMsg = "";
    return all();
  }
  if (a === "ac_imptpl") {
    const [title, head, eg] = AC_IMP[acF.impKind],
      url = URL.createObjectURL(new Blob([`${head}\n${eg}\n`], { type: "text/csv" })),
      l = document.createElement("a");
    l.href = url;
    l.download = `${title.replace(/\s+/g, "_")}_template.csv`;
    document.body.appendChild(l);
    l.click();
    l.remove();
    return setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  if (a === "ac_imprun") {
    const text = $("#acImpT").value,
      file = $("#acImpF").files[0],
      run = t => {
        acF.impMsg = acImport(t);
        all();
      };
    if (text.trim()) return run(text);
    if (!file) return toast("Choose a file or paste the rows.");
    const r = new FileReader();
    r.onload = () => run(String(r.result));
    r.readAsText(file);
    return;
  }
}
// Filters and boxes on these screens.
document.addEventListener("change", e => {
  const t = e.target,
    s = t.dataset || {};
  if (s.acd) {
    acF[s.acd] = t.value;
    if (acF.from > acF.to && s.acd === "from") acF.to = acF.from;
    if (acF.from > acF.to && s.acd === "to") acF.from = acF.to;
    return all();
  }
  if (s.acs) {
    acF[s.acs] = t.value;
    return all();
  }
  if (s.acr) {
    const C = acS().cleared;
    t.checked ? (C[s.acr] = true) : delete C[s.acr];
    bosave();
    return all();
  }
  if (s.jl && acJ) {
    const [i, f] = s.jl.split(".");
    acJ.lines[+i][f] = t.value;
    return;
  }
  if (s.acm) {
    const [kind, key] = s.acm.split("|"),
      A = acS();
    if (kind === "fy") A.fyStart = +t.value;
    else if (kind === "lock") {
      A.lock = t.value;
      auditAdd(
        "Books closed",
        t.value ? `Closed up to ${dateGB(t.value)}` : "Closing date removed",
        { mod: "Accounting", pri: "Important" }
      );
    } else A.map[kind][key] = t.value;
    bosave();
    return toast("Saved.");
  }
});
// Journal totals and the account search update as you type.
document.addEventListener("input", e => {
  const t = e.target,
    s = t.dataset || {};
  if (s.jl && acJ) {
    const [i, f] = s.jl.split(".");
    acJ.lines[+i][f] = t.value;
    if ($("#acJT")) $("#acJT").innerHTML = acJTotals();
    return;
  }
  if (t.id === "acFind") {
    acF.q = t.value;
    const q = t.value.trim().toLowerCase();
    $("#acCoaBody").innerHTML = acCoaRows(
      acSorted().filter(
        a => !q || `${a.code} ${a.name} ${a.group} ${a.type}`.toLowerCase().includes(q)
      ),
      acTotals("", ymdOf(new Date())),
      new Set(acEntries().flatMap(x => x.lines.map(l => l.a)))
    );
  }
});

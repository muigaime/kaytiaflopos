// ---- Accounting: chart of accounts and the double-entry ledger ----
// The ledger is two things read together: journals people post here, and entries worked out live from what the
// system already records (sales, purchases, vendor payments, payouts, stock losses). Those can't drift from their
// source, and nothing is ever posted twice.
const AC_TYPES = ["Asset", "Liability", "Equity", "Income", "Cost of sales", "Expense"];
const acDebitSide = t => t === "Asset" || t === "Cost of sales" || t === "Expense";
const AC_DEFAULT = [
  ["1000", "Cash on hand", "Asset", "Cash and bank"],
  ["1010", "Petty cash", "Asset", "Cash and bank"],
  ["1020", "M-Pesa till", "Asset", "Cash and bank"],
  ["1030", "Card and PDQ clearing", "Asset", "Cash and bank"],
  ["1200", "Trade debtors", "Asset", "Receivables"],
  ["1210", "Guest ledger (rooms)", "Asset", "Receivables"],
  ["1220", "Staff advances", "Asset", "Receivables"],
  ["1230", "Prepayments and deposits paid", "Asset", "Receivables"],
  ["1300", "Stock on hand", "Asset", "Stock"],
  ["1320", "VAT input", "Asset", "Tax"],
  ["1500", "Land and buildings", "Asset", "Fixed assets"],
  ["1505", "Buildings: depreciation to date", "Asset", "Fixed assets"],
  ["1510", "Furniture and fittings", "Asset", "Fixed assets"],
  ["1515", "Furniture: depreciation to date", "Asset", "Fixed assets"],
  ["1520", "Kitchen and bar equipment", "Asset", "Fixed assets"],
  ["1525", "Equipment: depreciation to date", "Asset", "Fixed assets"],
  ["1530", "Computers and POS hardware", "Asset", "Fixed assets"],
  ["1535", "Computers: depreciation to date", "Asset", "Fixed assets"],
  ["1540", "Motor vehicles", "Asset", "Fixed assets"],
  ["1545", "Vehicles: depreciation to date", "Asset", "Fixed assets"],
  ["2000", "Trade creditors", "Liability", "Payables"],
  ["2010", "Accrued expenses", "Liability", "Payables"],
  ["2100", "VAT output", "Liability", "Tax"],
  ["2110", "Tax C payable (catering levy)", "Liability", "Tax"],
  ["2120", "PAYE payable", "Liability", "Tax"],
  ["2130", "NSSF payable", "Liability", "Statutory"],
  ["2140", "SHIF payable", "Liability", "Statutory"],
  ["2150", "Housing levy payable", "Liability", "Statutory"],
  ["2200", "Customer deposits", "Liability", "Payables"],
  ["2210", "Tips payable", "Liability", "Payables"],
  ["2300", "Salaries payable", "Liability", "Payables"],
  ["2500", "Bank loans", "Liability", "Long-term loans"],
  ["2510", "Directors' loans", "Liability", "Long-term loans"],
  ["3000", "Owner's capital", "Equity", "Capital"],
  ["3100", "Drawings", "Equity", "Capital"],
  ["3200", "Retained earnings", "Equity", "Reserves"],
  ["3900", "Opening balances", "Equity", "Reserves"],
  ["4000", "Room revenue", "Income", "Sales"],
  ["4100", "Food sales", "Income", "Sales"],
  ["4200", "Beverage sales", "Income", "Sales"],
  ["4300", "Other sales", "Income", "Sales"],
  ["4800", "Other income", "Income", "Other income"],
  ["4810", "Gain on sale of assets", "Income", "Other income"],
  ["5000", "Food cost", "Cost of sales", "Cost of sales"],
  ["5100", "Beverage cost", "Cost of sales", "Cost of sales"],
  ["5200", "Stock losses and adjustments", "Cost of sales", "Cost of sales"],
  ["5300", "Complimentary given", "Cost of sales", "Cost of sales"],
  ["6000", "Salaries and wages", "Expense", "Staff"],
  ["6010", "Casual labour", "Expense", "Staff"],
  ["6020", "Staff meals", "Expense", "Staff"],
  ["6030", "Employer NSSF, SHIF and housing levy", "Expense", "Staff"],
  ["6040", "Staff uniforms and training", "Expense", "Staff"],
  ["6100", "Rent and rates", "Expense", "Premises"],
  ["6110", "Electricity", "Expense", "Premises"],
  ["6120", "Water", "Expense", "Premises"],
  ["6130", "Gas and cooking fuel", "Expense", "Premises"],
  ["6140", "Internet and telephone", "Expense", "Premises"],
  ["6200", "Repairs and maintenance", "Expense", "Premises"],
  ["6210", "Cleaning and supplies", "Expense", "Premises"],
  ["6220", "Laundry", "Expense", "Premises"],
  ["6230", "Security", "Expense", "Premises"],
  ["6300", "Marketing and advertising", "Expense", "Selling"],
  ["6310", "Commissions and booking fees", "Expense", "Selling"],
  ["6400", "Licences and permits", "Expense", "Administration"],
  ["6410", "Insurance", "Expense", "Administration"],
  ["6420", "Bank charges", "Expense", "Administration"],
  ["6430", "M-Pesa and card charges", "Expense", "Administration"],
  ["6440", "Professional and audit fees", "Expense", "Administration"],
  ["6450", "Software and subscriptions", "Expense", "Administration"],
  ["6500", "Transport", "Expense", "Administration"],
  ["6510", "Vehicle fuel and running", "Expense", "Administration"],
  ["6600", "Printing and stationery", "Expense", "Administration"],
  ["6700", "Depreciation", "Expense", "Depreciation"],
  ["6710", "Loss on sale of assets", "Expense", "Depreciation"],
  ["6800", "General expenses", "Expense", "Administration"],
  ["6810", "Rounding differences", "Expense", "Administration"],
  ["7000", "Loan interest", "Expense", "Finance costs"]
].map(([code, name, type, group]) => ({ code, name, type, group, sys: true }));
function acS() {
  if (!FD_SETTINGS.acct)
    FD_SETTINGS.acct = {
      coa: AC_DEFAULT.map(a => ({ ...a })),
      jv: [],
      seq: 0,
      banks: [],
      assets: [],
      cleared: {},
      recs: [],
      map: { rev: {}, cogs: {}, pay: {} },
      fyStart: 1,
      lock: ""
    };
  return FD_SETTINGS.acct;
}
const acCoa = () => acS().coa;
const acAcc = code => acCoa().find(a => a.code === code);
const acName = code => {
  const a = acAcc(code);
  return a ? `${a.code} ${a.name}` : code;
};
const acSorted = () =>
  acCoa()
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code));
const acCents = n => Math.round(n * 100);
const acDay = at => ymdOf(new Date(at));
/** Where a selling point's sales and costs go. Set under Revenue and tax. */
function acRevOf(dept) {
  const m = acS().map.rev[dept];
  if (m) return m;
  if (dept === "Front Desk") return "4000";
  const t = (OUTLET_INFO[dept] || {}).type;
  return t === "Bar"
    ? "4200"
    : t === "Restaurant" || t === "Kitchen" || t === "Cafe" || t === "Room service"
      ? "4100"
      : "4300";
}
function acCogsOf(dept) {
  const m = acS().map.cogs[dept];
  if (m) return m;
  return (OUTLET_INFO[dept] || {}).type === "Bar" ? "5100" : "5000";
}
const AC_PAY = {
  cash: "1000",
  mpesa: "1020",
  pdq: "1030",
  comp: "5300",
  credit: "1200",
  room: "1210",
  account: "1200"
};
// Bills sent to payroll are owed by staff until the payroll collects them.
const acPayOf = k => acS().map.pay[k] || (k === "payroll" ? "1220" : AC_PAY[k]) || "1030";
const AC_PAYOUT = {
  Supplies: "6800",
  Transport: "6500",
  Cleaning: "6210",
  "Staff meal": "6020",
  Repairs: "6200",
  Other: "6800"
};
/** Accounts money can go in or out of: cash, M-Pesa and every bank. */
const acMoney = () => acSorted().filter(a => a.group === "Cash and bank" && a.active !== false);
function acVendorPayAcc(method) {
  const m = String(method || "");
  if (/cash/i.test(m)) return "1000";
  if (/m-?pesa/i.test(m)) return "1020";
  const b = acS().banks[0];
  return b ? b.code : "1000";
}
/** Splits a sale's tax between VAT and Tax C, by what each line carries. */
function acTaxSplit(s) {
  const R = s.rates || { B: 16, C: 2 };
  let vat = 0,
    lev = 0;
  (s.lines || []).forEach(l => {
    const amt = l.q * l.p;
    if (l.t === "B") vat += (amt * R.B) / (100 + R.B);
    else if (l.t === "C") lev += (amt * R.C) / (100 + R.C);
    else if (l.t === "BC") {
      vat += (amt * R.B) / (100 + R.B + R.C);
      lev += (amt * R.C) / (100 + R.B + R.C);
    }
  });
  const all = vat + lev;
  // The discounted tax on the sale is what's owed; these only give the shares.
  return all ? { vat: (s.tax * vat) / all, lev: (s.tax * lev) / all } : { vat: s.tax || 0, lev: 0 };
}
/** Adds up lines per account, leaving out anything that comes to nothing. */
function acLines(pairs) {
  const m = {};
  pairs.forEach(([a, d]) => (m[a] = (m[a] || 0) + d));
  return Object.entries(m)
    .filter(([, d]) => Math.abs(d) >= 0.005)
    .map(([a, d]) => ({ a, dr: d > 0 ? d : 0, cr: d < 0 ? -d : 0 }));
}
/** Keeps the books in balance when a day's cents don't quite add up. */
function acRound(pairs) {
  const off = pairs.reduce((a, [, d]) => a + d, 0);
  if (Math.abs(off) >= 0.005) pairs.push(["6810", -off]);
  return pairs;
}
function acAuto() {
  const out = [],
    entry = (date, src, ref, narr, pairs, by) => {
      const lines = acLines(acRound(pairs));
      if (lines.length)
        out.push({ id: `A-${ref}`, date, src, ref, narr, lines, by: by || "System", auto: true });
    };
  // Sales: one entry per day and sale point, so the ledger stays readable.
  const days = {};
  SALES.forEach(s => {
    const d = s.bd || acDay(s.at);
    (days[d + "|" + s.dept] = days[d + "|" + s.dept] || { d, dept: s.dept, S: [] }).S.push(s);
  });
  Object.values(days).forEach(({ d, dept, S }) => {
    const pairs = [],
      cogs = [];
    let net = 0,
      c = 0;
    S.forEach(s => {
      Object.entries(s.mx || {}).forEach(([k, v]) => pairs.push([acPayOf(k), v]));
      Object.entries(s.tips || {}).forEach(([k, v]) => {
        pairs.push([acPayOf(k), v]);
        pairs.push(["2210", -v]);
      });
      const T = acTaxSplit(s);
      pairs.push(["2100", -T.vat]);
      pairs.push(["2110", -T.lev]);
      net += s.g - (s.tax || 0);
      (s.lines || []).forEach(l => (c += cost(l)));
    });
    pairs.push([acRevOf(dept), -net]);
    entry(
      d,
      "Sales",
      `SALES-${d}-${dept}`,
      `${dept} sales for ${dateGB(d)} · ${plural(new Set(S.map(s => s.no)).size, "bill")}`,
      pairs
    );
    if (Math.abs(c) >= 0.005) {
      cogs.push([acCogsOf(dept), c], ["1300", -c]);
      entry(
        d,
        "Cost of sales",
        `COGS-${d}-${dept}`,
        `${dept} cost of what was sold on ${dateGB(d)}`,
        cogs
      );
    }
  });
  GRNS.forEach(g => {
    const amt = grnAmount(g),
      tax = g.tax || 0,
      onAcc = VENDORS.some(v => v.name === g.sup),
      d = acDay(g.at);
    entry(
      d,
      "Purchases",
      g.id,
      `Goods received from ${g.sup}${g.inv ? ` · invoice ${g.inv}` : ""} into ${g.store}`,
      [
        ["1300", amt - tax],
        ["1320", tax],
        [onAcc ? "2000" : "1000", -amt]
      ],
      g.by
    );
  });
  VENDORS.forEach(v => {
    if (+v.ob > 0 && v.obAt)
      entry(v.obAt, "Opening", `OB-${v.id}`, `Opening balance owed to ${v.name}`, [
        ["3900", +v.ob],
        ["2000", -v.ob]
      ]);
  });
  grList()
    .filter(r => r.status === "Returned")
    .forEach(r => {
      const amt = grAmount(r),
        tax = grTax(r),
        onAcc = VENDORS.some(v => v.name === r.sup);
      entry(
        acDay(r.appr.at),
        "Supplier return",
        r.id,
        `Goods returned to ${r.sup} against ${r.grn}`,
        [
          [onAcc ? "2000" : "1000", amt],
          ["1300", -(amt - tax)],
          ["1320", -tax]
        ],
        r.appr.by
      );
    });
  VPAYS.forEach(p =>
    entry(
      p.date || acDay(p.at),
      "Vendor payment",
      p.id,
      `Paid ${p.vendor} by ${p.method}${p.ref ? ` · ${p.ref}` : ""}`,
      [
        ["2000", p.amt],
        [acVendorPayAcc(p.method), -p.amt]
      ],
      p.by
    )
  );
  PAYOUTS.forEach(p =>
    entry(
      acDay(p.at),
      "Cash payout",
      p.id,
      `${p.cat}: ${p.desc}`,
      [
        [AC_PAYOUT[p.cat] || "6800", p.amt],
        ["1000", -p.amt]
      ],
      p.by || p.user
    )
  );
  (FD_SETTINGS.custPays || []).forEach((p, i) =>
    entry(
      acDay(p.at),
      "Customer payment",
      `CP-${i + 1}`,
      `Received from ${p.n}`,
      [
        ["1000", p.amt],
        ["1200", -p.amt]
      ],
      p.by
    )
  );
  MOV.forEach((m, i) => {
    if (m.t !== "DAMAGE" && m.t !== "ADJUST") return;
    const v = m.q * (m.c || cst(m.k));
    if (Math.abs(v) < 0.005) return;
    entry(
      acDay(m.at),
      "Stock loss",
      `${m.t === "DAMAGE" ? "DMG" : "ADJ"}-${m.at}-${i}`,
      `${m.t === "DAMAGE" ? "Written off" : "Stock take"}: ${itemInfo(m.k).name} at ${m.loc}${m.note ? ` · ${m.note}` : ""}`,
      [
        ["5200", -v],
        ["1300", v]
      ],
      m.by
    );
  });
  return out;
}
let acMemo = null;
const acFresh = () => (acMemo = null);
/** Every entry in the books, oldest first. */
function acEntries() {
  if (!acMemo) {
    const J = acS().jv.map(j => ({ ...j, ref: j.ref || j.id }));
    acMemo = [...acAuto(), ...J].sort(
      (a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id))
    );
  }
  return acMemo;
}
/** Debits less credits on an account between two dates (either may be left out). */
function acNet(code, from, to) {
  let n = 0;
  acEntries().forEach(e => {
    if ((from && e.date < from) || (to && e.date > to)) return;
    e.lines.forEach(l => {
      if (l.a === code) n += l.dr - l.cr;
    });
  });
  return n;
}
/** The whole ledger for a range at once: { code: debits less credits }. */
function acTotals(from, to) {
  const m = {};
  acEntries().forEach(e => {
    if ((from && e.date < from) || (to && e.date > to)) return;
    e.lines.forEach(l => (m[l.a] = (m[l.a] || 0) + l.dr - l.cr));
  });
  return m;
}
/** An account's balance the way it reads naturally: a sale shows as positive income. */
const acShown = (code, net) => (acDebitSide((acAcc(code) || {}).type) ? net : -net);
/** Posts a journal, or returns what's wrong with it. */
function acPost({ date, narr, ref, src, lines, bank, btx, who }) {
  const L = lines.filter(l => l.a && (l.dr > 0 || l.cr > 0));
  if (!date) return "Choose the date.";
  if (acS().lock && date <= acS().lock) return `The books are closed up to ${dateGB(acS().lock)}.`;
  if (!String(narr || "").trim()) return "Enter what this is for.";
  if (L.length < 2) return "A journal needs at least two lines.";
  if (L.some(l => !acAcc(l.a))) return "One of the accounts no longer exists.";
  const dr = L.reduce((a, l) => a + acCents(l.dr || 0), 0),
    cr = L.reduce((a, l) => a + acCents(l.cr || 0), 0);
  if (dr !== cr) return `Debits and credits differ by KES ${m2(Math.abs(dr - cr) / 100)}.`;
  const A = acS();
  A.seq++;
  const lan = window.__lan,
    id = "JV-" + String(A.seq).padStart(5, "0") + (lan && lan.idx ? `-${lan.idx}` : "");
  A.jv.push({
    id,
    date,
    narr: narr.trim(),
    ref: ref || "",
    src: src || "Journal",
    bank: bank || "",
    ...(btx ? { btx } : {}),
    ...(who ? { who } : {}),
    by: boUser.n,
    at: new Date().toISOString(),
    lines: L.map(l => ({ a: l.a, dr: +l.dr || 0, cr: +l.cr || 0 }))
  });
  acFresh();
  auditAdd("Journal", `${id} · ${narr.trim()} · KES ${m2(dr / 100)}`, {
    ref: id,
    mod: "Accounting"
  });
  bosave();
  return "";
}
function acReverse(id) {
  const j = acS().jv.find(x => x.id === id);
  if (!j || j.reversedBy) return "This entry has already been reversed.";
  const day = ymdOf(new Date()),
    err = acPost({
      date: j.date > day ? j.date : day,
      narr: `Reversal of ${j.id}: ${j.narr}`,
      ref: j.id,
      src: j.src,
      bank: j.bank,
      lines: j.lines.map(l => ({ a: l.a, dr: l.cr, cr: l.dr }))
    });
  if (err) return err;
  const A = acS();
  j.reversedBy = A.jv[A.jv.length - 1].id;
  A.jv[A.jv.length - 1].reverses = j.id;
  bosave();
  return "";
}
/** The financial year the given date falls in. */
function acFyStart(day) {
  const m = acS().fyStart || 1,
    [y, mo] = day.split("-").map(Number);
  return `${mo >= m ? y : y - 1}-${String(m).padStart(2, "0")}-01`;
}
const acOptions = (v, L = acSorted().filter(a => a.active !== false)) => {
  const g = {};
  L.forEach(a => (g[a.type] = g[a.type] || []).push(a));
  return `<option value="">Choose an account…</option>${AC_TYPES.filter(t => g[t])
    .map(
      t =>
        `<optgroup label="${t}">${g[t].map(a => `<option value="${a.code}" ${a.code === v ? "selected" : ""}>${a.code} ${esc(a.name)}</option>`).join("")}</optgroup>`
    )
    .join("")}`;
};

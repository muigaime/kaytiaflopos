// ---- Accounting: financial reports. Each one is plain rows, so the screen, Print and Excel show the same thing. ----
// A row can carry .h (a section heading) or .b (a total, in bold).
const acH = (t, n) => Object.assign([t, ...Array(n - 1).fill("")], { h: true });
const acB = r => Object.assign(r, { b: true });
const acMoneyStr = n => (Math.abs(n) < 0.005 ? "0.00" : m2(n));
/** The same length of time just before the chosen dates. */
function acPrevRange(from, to) {
  const days = Math.round((new Date(to) - new Date(from)) / 864e5) + 1,
    pto = addDays(from, -1);
  return [addDays(pto, -(days - 1)), pto];
}
const AC_REPORTS = {
  pl: ["Profit and loss", "What the business earned and spent, and what's left."],
  bs: ["Balance sheet", "What the business owns and owes on the closing date."],
  tb: ["Trial balance", "Every account's balance. Debits and credits must agree."],
  cf: ["Cash flow statement", "Where the cash came from and where it went."],
  jl: ["Journal listing", "Every entry in the books for the dates chosen."],
  vat: ["VAT and tax report", "Tax collected on sales, tax paid on purchases, and what's due."],
  ad: ["Aged debtors", "Who owes the business, and for how long."],
  ac: ["Aged creditors", "Who the business owes, and for how long."],
  ex: ["Expense analysis", "Where the money went, biggest first."]
};
function acReport(k, from, to) {
  const money = n => acMoneyStr(n);
  if (k === "pl") {
    const T = acTotals(from, to),
      [pf, pt] = acPrevRange(from, to),
      P = acTotals(pf, pt),
      c = ["Account", "#This period", "#% of income", "#Previous period"],
      list = t =>
        acSorted().filter(
          a =>
            a.type === t && (Math.abs(T[a.code] || 0) >= 0.005 || Math.abs(P[a.code] || 0) >= 0.005)
        ),
      sum2 = (L, M) => L.reduce((x, a) => x + acShown(a.code, M[a.code] || 0), 0),
      Inc = list("Income"),
      Cos = list("Cost of sales"),
      Exp = list("Expense"),
      inc = sum2(Inc, T),
      pct = n => (inc ? `${((n / inc) * 100).toFixed(1)}%` : "–"),
      row = a => {
        const v = acShown(a.code, T[a.code] || 0);
        return [`${a.code} ${a.name}`, money(v), pct(v), money(acShown(a.code, P[a.code] || 0))];
      },
      tot = (l, v, pv) => acB([l, money(v), pct(v), money(pv)]),
      cos = sum2(Cos, T),
      exp = sum2(Exp, T),
      pInc = sum2(Inc, P),
      pCos = sum2(Cos, P),
      pExp = sum2(Exp, P);
    return {
      c,
      r: [
        acH("Income", 4),
        ...Inc.map(row),
        tot("Total income", inc, pInc),
        acH("Cost of sales", 4),
        ...Cos.map(row),
        tot("Total cost of sales", cos, pCos),
        tot("Gross profit", inc - cos, pInc - pCos),
        acH("Expenses", 4),
        ...Exp.map(row),
        tot("Total expenses", exp, pExp),
        tot(inc - cos - exp < 0 ? "Net loss" : "Net profit", inc - cos - exp, pInc - pCos - pExp)
      ],
      kpi: [
        ["Income", inc],
        ["Gross profit", inc - cos],
        ["Expenses", exp],
        ["Net profit", inc - cos - exp]
      ]
    };
  }
  if (k === "bs") {
    const T = acTotals("", to),
      c = ["Account", "#Amount (KES)"],
      group = t => {
        const G = {};
        acSorted()
          .filter(a => a.type === t && Math.abs(T[a.code] || 0) >= 0.005)
          .forEach(a => (G[a.group] = G[a.group] || []).push(a));
        return G;
      },
      block = t => {
        const G = group(t),
          rows = [];
        Object.entries(G).forEach(([g, L]) => {
          rows.push(acH(g, 2));
          L.forEach(a => rows.push([`${a.code} ${a.name}`, money(acShown(a.code, T[a.code]))]));
          rows.push(
            acB([
              `Total ${g.toLowerCase()}`,
              money(L.reduce((x, a) => x + acShown(a.code, T[a.code]), 0))
            ])
          );
        });
        return {
          rows,
          total: Object.values(G)
            .flat()
            .reduce((x, a) => x + acShown(a.code, T[a.code]), 0)
        };
      },
      A = block("Asset"),
      L = block("Liability"),
      E = block("Equity"),
      profit = acSorted()
        .filter(a => ["Income", "Cost of sales", "Expense"].includes(a.type))
        .reduce((x, a) => x - (T[a.code] || 0), 0),
      eq = L.total + E.total + profit;
    return {
      c,
      r: [
        acH("ASSETS", 2),
        ...A.rows,
        acB(["TOTAL ASSETS", money(A.total)]),
        acH("LIABILITIES", 2),
        ...L.rows,
        acB(["Total liabilities", money(L.total)]),
        acH("EQUITY", 2),
        ...E.rows,
        ["Profit to date", money(profit)],
        acB(["Total equity", money(E.total + profit)]),
        acB(["TOTAL LIABILITIES AND EQUITY", money(eq)])
      ],
      kpi: [
        ["Assets", A.total],
        ["Liabilities", L.total],
        ["Equity", E.total + profit]
      ],
      check:
        acCents(A.total) === acCents(eq)
          ? ""
          : `Out of balance by KES ${m2(Math.abs(A.total - eq))}`
    };
  }
  if (k === "tb") {
    const T = acTotals("", to),
      L = acSorted().filter(a => Math.abs(T[a.code] || 0) >= 0.005),
      dr = L.reduce((x, a) => x + Math.max(T[a.code], 0), 0),
      cr = L.reduce((x, a) => x + Math.max(-T[a.code], 0), 0);
    return {
      c: ["Code", "Account", "Type", "#Debit", "#Credit"],
      r: L.map(a => [
        a.code,
        a.name,
        a.type,
        T[a.code] > 0 ? money(T[a.code]) : "",
        T[a.code] < 0 ? money(-T[a.code]) : ""
      ]),
      f: ["Total", "", "", money(dr), money(cr)],
      check: acCents(dr) === acCents(cr) ? "" : `Out of balance by KES ${m2(Math.abs(dr - cr))}`,
      kpi: [
        ["Total debits", dr],
        ["Total credits", cr]
      ]
    };
  }
  if (k === "cf") {
    const cash = new Set(acMoney().map(a => a.code)),
      opening = [...cash].reduce((x, a) => x + acNet(a, "", addDays(from, -1)), 0),
      bucket = {},
      add = (sec, l, v) => {
        const key = sec + "|" + l;
        bucket[key] = (bucket[key] || 0) + v;
      };
    acEntries().forEach(e => {
      if (e.date < from || e.date > to) return;
      const move = e.lines.filter(l => cash.has(l.a)).reduce((x, l) => x + l.dr - l.cr, 0),
        others = e.lines.filter(l => !cash.has(l.a));
      if (Math.abs(move) < 0.005 || !others.length) return; // moving cash between its own accounts
      // Money in is explained by what was credited, money out by what was debited.
      const side = others.filter(l => (move > 0 ? l.cr > 0 : l.dr > 0)),
        use = side.length ? side : others,
        base = use.reduce((x, l) => x + l.dr + l.cr, 0);
      use.forEach(l => {
        const a = acAcc(l.a) || {},
          v = (move * (l.dr + l.cr)) / base,
          sec =
            a.group === "Fixed assets"
              ? "Investing"
              : a.group === "Long-term loans" || a.type === "Equity"
                ? "Financing"
                : "Operating",
          label =
            a.type === "Income"
              ? "Received from sales and income"
              : l.a === "2000"
                ? "Paid to suppliers"
                : a.type === "Expense"
                  ? "Paid for expenses"
                  : a.group === "Tax"
                    ? "Tax collected and paid"
                    : a.group === "Receivables"
                      ? "Debtors and guest accounts"
                      : a.group === "Stock" || a.type === "Cost of sales"
                        ? "Stock bought for cash"
                        : a.group === "Fixed assets"
                          ? move > 0
                            ? "Fixed assets sold"
                            : "Fixed assets bought"
                          : a.name;
        add(sec, label, v);
      });
    });
    const rows = [],
      secTot = {};
    ["Operating", "Investing", "Financing"].forEach(s => {
      const L = Object.entries(bucket).filter(([k2]) => k2.startsWith(s + "|"));
      secTot[s] = L.reduce((x, [, v]) => x + v, 0);
      rows.push(acH(`${s} activities`, 2));
      L.forEach(([k2, v]) => rows.push([k2.split("|")[1], money(v)]));
      rows.push(acB([`Net cash from ${s.toLowerCase()} activities`, money(secTot[s])]));
    });
    const change = secTot.Operating + secTot.Investing + secTot.Financing;
    return {
      c: ["", "#Amount (KES)"],
      r: [
        ...rows,
        acB(["Change in cash", money(change)]),
        ["Cash at the start", money(opening)],
        acB(["Cash at the end", money(opening + change)])
      ],
      kpi: [
        ["Cash at the start", opening],
        ["Change in cash", change],
        ["Cash at the end", opening + change]
      ]
    };
  }
  if (k === "jl") {
    const R = [];
    let dr = 0,
      cr = 0;
    acEntries()
      .filter(e => e.date >= from && e.date <= to)
      .forEach(e =>
        e.lines.forEach(l => {
          dr += l.dr;
          cr += l.cr;
          R.push([
            dateGB(e.date),
            e.ref || e.id,
            e.src,
            e.narr,
            acName(l.a),
            l.dr ? money(l.dr) : "",
            l.cr ? money(l.cr) : ""
          ]);
        })
      );
    return {
      c: ["Date", "Reference", "Source", "Narration", "Account", "#Debit", "#Credit"],
      r: R,
      f: ["Total", "", "", "", "", money(dr), money(cr)]
    };
  }
  if (k === "vat") {
    const m = {};
    acEntries().forEach(e => {
      if (e.date < from || e.date > to) return;
      const mo = e.date.slice(0, 7);
      e.lines.forEach(l => {
        if (!["2100", "2110", "1320"].includes(l.a)) return;
        const x = (m[mo] = m[mo] || { o: 0, c: 0, i: 0 });
        if (l.a === "2100") x.o += l.cr - l.dr;
        if (l.a === "2110") x.c += l.cr - l.dr;
        if (l.a === "1320") x.i += l.dr - l.cr;
      });
    });
    const K = Object.keys(m).sort(),
      S = f => K.reduce((a, x) => a + m[x][f], 0),
      label = x =>
        new Date(x + "-15").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return {
      c: ["Month", "#VAT on sales", "#VAT on purchases", "#VAT due", "#Tax C due"],
      r: K.map(x => [
        label(x),
        money(m[x].o),
        money(m[x].i),
        money(m[x].o - m[x].i),
        money(m[x].c)
      ]),
      f: ["Total", money(S("o")), money(S("i")), money(S("o") - S("i")), money(S("c"))],
      kpi: [
        ["VAT on sales", S("o")],
        ["VAT on purchases", S("i")],
        ["VAT due", S("o") - S("i")],
        ["Tax C due", S("c")]
      ]
    };
  }
  if (k === "ad" || k === "ac") {
    const age = at => Math.floor((Date.now() - new Date(at).getTime()) / 864e5),
      slot = (B, at, v) => {
        const a = age(at);
        B[a <= 30 ? 0 : a <= 60 ? 1 : a <= 90 ? 2 : 3] += v;
      },
      rows = [],
      tot = [0, 0, 0, 0];
    if (k === "ac")
      VENDORS.forEach(v => {
        const L = vendorLedger(v),
          B = [0, 0, 0, 0];
        let paid = L.reduce((a, x) => a + x.dr, 0);
        L.filter(x => x.cr > 0)
          .sort((a, b) => a.t - b.t)
          .forEach(x => {
            const use = Math.min(paid, x.cr);
            paid -= use;
            if (x.cr - use > 0.004) slot(B, x.t, x.cr - use);
          });
        const all = B.reduce((a, b) => a + b, 0);
        if (all > 0.004) {
          B.forEach((b, i) => (tot[i] += b));
          rows.push([v.name, v.terms || "", ...B.map(money), money(all)]);
        }
      });
    else
      CU.forEach((c, ci) => {
        const B = [0, 0, 0, 0];
        let left = c.owes;
        SALES.filter(s => s.slip && (s.slip.credits || []).some(x => x.ci === ci))
          .slice()
          .sort((a, b) => b.at - a.at)
          .forEach(s => {
            const amt = s.slip.credits.filter(x => x.ci === ci).reduce((a, x) => a + x.amt, 0),
              use = Math.min(left, amt);
            left -= use;
            if (use > 0) slot(B, s.at, use);
          });
        B[0] += left; // owed from before bills recorded who it was for
        if (c.owes > 0.004) {
          B.forEach((b, i) => (tot[i] += b));
          rows.push([c.n, m2(c.limit), ...B.map(money), money(c.owes)]);
        }
      });
    const all = tot.reduce((a, b) => a + b, 0);
    return {
      c: [
        k === "ac" ? "Vendor" : "Customer",
        k === "ac" ? "Terms" : "#Limit",
        "#0–30 days",
        "#31–60 days",
        "#61–90 days",
        "#Over 90 days",
        "#Total"
      ],
      r: rows,
      f: ["Total", "", ...tot.map(money), money(all)],
      asAt: true,
      kpi: [
        ["Total", all],
        ["Over 90 days", tot[3]]
      ]
    };
  }
  if (k === "ex") {
    const T = acTotals(from, to),
      L = acSorted()
        .filter(
          a =>
            (a.type === "Expense" || a.type === "Cost of sales") &&
            Math.abs(T[a.code] || 0) >= 0.005
        )
        .map(a => ({ a, v: T[a.code] }))
        .sort((x, y) => y.v - x.v),
      all = L.reduce((x, e) => x + e.v, 0);
    return {
      c: ["Account", "Group", "#Amount (KES)", "#Share"],
      r: L.map(({ a, v }) => [
        `${a.code} ${a.name}`,
        a.group,
        money(v),
        all ? `${((v / all) * 100).toFixed(1)}%` : "–"
      ]),
      f: ["Total", "", money(all), "100%"]
    };
  }
  return { c: [], r: [] };
}
/** Rows on screen. Headings and totals stand out, and amounts line up. */
function acTable(c, r, f, none = "Nothing for these dates.") {
  const num = i => (c[i][0] === "#" ? ' class="n"' : "");
  return `<div class="tw"><table class="t ac-fin"><tr>${c.map((h, i) => `<th${num(i)}>${esc(h.replace("#", ""))}</th>`).join("")}</tr>${
    r.length
      ? r
          .map(x =>
            x.h
              ? `<tr class="ac-h"><td colspan="${c.length}">${esc(x[0])}</td></tr>`
              : `<tr class="${x.b ? "ac-b" : ""}">${x.map((v, i) => `<td${num(i)}>${esc(v)}</td>`).join("")}</tr>`
          )
          .join("")
      : `<tr><td colspan="${c.length}"><div class="empty">${none}</div></td></tr>`
  }${f ? `<tr class="ac-b ac-f">${f.map((v, i) => `<td${num(i)}>${esc(v)}</td>`).join("")}</tr>` : ""}</table></div>`;
}
function acRepExport(k, kind, from, to) {
  if (!boCan("rep.print")) return boDenied();
  const [title] = AC_REPORTS[k],
    D = acReport(k, from, to),
    when =
      D.asAt || k === "bs" || k === "tb"
        ? `As at ${dateGB(to)}`
        : `${dateGB(from)} to ${dateGB(to)}`;
  if (!D.r.length) return toast("There is nothing to export for these dates.");
  if (kind === "xlsx") {
    XLSX.download(
      {
        company: FD_SETTINGS.name,
        title,
        head: when,
        by: xlsxBy(),
        sections: [
          {
            t: title,
            c: D.c,
            r: D.r.map(x => (x.h ? x.map((v, i) => (i ? "" : v)) : [...x])),
            f: D.f
          }
        ]
      },
      `${title.replace(/\s+/g, "_")}_${from}_to_${to}`
    );
    return toast(`${title} exported to Excel.`);
  }
  stPrint(
    title,
    `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>${esc(title)}</h2></div><div>${esc(when)}</div><style>.st-doc .h td{font-weight:700;padding-top:10px}.st-doc .b td{font-weight:700;border-top:1px solid #000}</style><table class="st-t" style="margin-top:10px"><thead><tr>${D.c.map(h => `<th${h[0] === "#" ? ' class="n"' : ""}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${[...D.r, ...(D.f ? [acB([...D.f])] : [])].map(x => (x.h ? `<tr class="h"><td colspan="${D.c.length}">${esc(x[0])}</td></tr>` : `<tr class="${x.b ? "b" : ""}">${x.map((v, i) => `<td${D.c[i][0] === "#" ? ' class="n"' : ""}>${esc(v)}</td>`).join("")}</tr>`)).join("")}</tbody></table><div style="margin-top:14px">${esc(printedBy())}</div></div>`,
    D.c.length > 5 ? "A4 landscape" : "A4 portrait"
  );
}

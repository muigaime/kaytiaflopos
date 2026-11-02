// ---- reports ----
const z = (n, w = 2) => String(n).padStart(w, "0"),
  ymd = t => {
    const d = new Date(t);
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  },
  m2 = n => (+n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  PMK = ["cash", "mpesa", "credit"],
  pm = (s, k) => (s.mx || {})[k] || 0;
let rp = "sc",
  rd = "All",
  rcm = 2,
  rt = ymd(d0()),
  rf = ymd(d0() - 29 * D);
const rs = () => {
  const a = new Date(rf + "T00:00:00"),
    b = new Date(rt + "T23:59:59");
  return SALES.filter(s => s.at >= a && s.at <= b && (rd === "All" || s.dept === rd));
};
const cost = l => {
  const it = get(l.id);
  return it ? sum(Object.entries(it.r || {}), ([k, q]) => q * (INGC[k] || 0)) * l.q : 0;
};
const by = (L, kf) => {
  const o = {};
  L.forEach(x => {
    const k = kf(x);
    (o[k] = o[k] || []).push(x);
  });
  return Object.entries(o);
};
const items = L => {
  const o = {};
  L.forEach(s =>
    s.lines.forEach(l => {
      const r = (o[l.n] = o[l.n] || { q: 0, g: 0, c: 0 });
      r.q += l.q;
      r.g += l.p * l.q;
      r.c += cost(l);
    })
  );
  return Object.entries(o).sort((a, b) => b[1].g - a[1].g);
};
const pc = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0"),
  G = L => sum(L, s => s.g),
  dt = s => hhmm(s.at) + " " + s.at.toLocaleDateString("en-GB");
/** Bill options log entries in the report's dates and sale point, newest first. */
const billLog = acts => {
  const A = new Date(rf + "T00:00:00").getTime(),
    B = new Date(rt + "T23:59:59").getTime();
  return BILLLOG.filter(x => {
    const t = new Date(x.at).getTime();
    return (
      t >= A &&
      t <= B &&
      (!acts || acts.includes(x.act)) &&
      (rd === "All" || logPoints(x).includes(rd))
    );
  })
    .slice()
    .reverse();
};
const logPoints = x =>
  x.items
    ? [...new Set(x.items.map(l => l.d))]
    : x.points && x.points.length
      ? x.points
      : String(x.dept || "").split(", ");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const logHead = t => `${t} · ${rf} to ${rt} · ${rd === "All" ? "all sale points" : rd}`;
const voidRows = () => billLog(["Void"]);
/** What a void took off, limited to the chosen sale point. Older entries only kept a total. */
const voidParts = x =>
  (x.items || [{ n: x.detail.split(" · ")[0], q: 0, d: x.dept, amt: -x.amt }]).filter(
    l => rd === "All" || l.d === rd
  );
const voidItemsText = P => P.map(l => (l.q ? `${l.q} ${l.n}` : l.n)).join(", ");
const voidTotal = R => sum(R, x => sum(voidParts(x), l => l.amt));
// ---- printing a report: A4 landscape or an 80mm roll ----
let rpSize = "a4";
const printTools = k =>
  `<span class="rp-size"><label><input type="radio" name="rpSize" data-rsz="a4" ${rpSize === "a4" ? "checked" : ""}> A4 size</label><label><input type="radio" name="rpSize" data-rsz="80" ${rpSize === "80" ? "checked" : ""}> Thermal paper (80mm)</label></span><button class="chip on" data-a="rep_print" data-k="${k}">Print</button>`;
const printedBy = () => `Printed ${new Date().toLocaleString("en-GB")} by ${esc(boUser.n)}`;
function tablePrint(title, head, c, r, f) {
  const name = x => (x[0] === "#" ? x.slice(1) : x),
    num = i => (c[i][0] === "#" ? ' class="n"' : "");
  if (rpSize === "a4")
    return stPrint(
      title,
      `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>${esc(title)}</h2></div><div class="st-foot"><span>${esc(head)}</span></div>
 <table class="st-t"><thead><tr>${c.map((x, i) => `<th${num(i)}>${esc(name(x))}</th>`).join("")}</tr></thead><tbody>${r.map(x => `<tr>${x.map((v, i) => `<td${num(i)}>${esc(v)}</td>`).join("")}</tr>`).join("")}${f ? `<tr class="st-tot">${f.map((v, i) => `<td${num(i)}>${esc(v)}</td>`).join("")}</tr>` : ""}</tbody></table>
 <div class="st-foot"><span>${printedBy()}</span></div></div>`
    );
  // A roll is too narrow for wide tables, so each record prints as its own short block.
  const block = (x, tot) =>
      `<div class="b${tot ? " t" : ""}">${x.map((v, i) => (v === "" || v === null || v === undefined ? "" : `<div><span>${esc(name(c[i]))}</span><b>${esc(v)}</b></div>`)).join("")}</div>`,
    w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print.");
  w.document.write(
    `<!DOCTYPE html><html><head><title>${esc(title)}</title><style>@page{size:80mm auto;margin:0}body{width:72mm;margin:0 auto;padding:4mm 0;font:11px/1.35 Arial,sans-serif;color:#000}h1{margin:0;font-size:14px;text-align:center}h2{margin:3px 0;padding:3px 0;border-top:2px solid #000;border-bottom:2px solid #000;font-size:12px;text-align:center;text-transform:uppercase}.h,.p{font-size:10px;text-align:center}.b{padding:4px 0;border-bottom:1px dashed #000}.b div{display:flex;justify-content:space-between;gap:8px}.b b{text-align:right;font-weight:600}.t{border-bottom:3px double #000;font-weight:700}.p{margin-top:6px}</style></head><body><h1>${esc(FD_SETTINGS.name)}</h1><h2>${esc(title)}</h2><div class="h">${esc(head)}</div>${r.map(x => block(x)).join("")}${f ? block(f, 1) : ""}<div class="p">${printedBy()}</div></body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}
function repPrint(k) {
  let title, c, r, f, head;
  if (k === "rooms") {
    [c, r, f] = rrData(hrr);
    title = RRL[hrr];
    head = ["rv", "pay", "rt", "gl"].includes(hrr) ? rrRange().join(" to ") : "Live position";
  } else {
    let h;
    title = REP[rp][0];
    const L = rs();
    [c, r, f, , h] = REP[rp][1](L);
    head =
      h ||
      `${L.length} bills · ${KES(G(L))} · ${rf} to ${rt} · ${rd === "All" ? "all sale points" : rd}`;
  }
  if (!r.length) return toast("There is nothing to print for these dates.");
  tablePrint(title, head, c, r, f);
}

// ---- Bills Report: every settled bill, one line each; double-click to reprint ----
const billF = { cashier: "All", pay: "All", net: false, col: {} };
const billCols = () => [
  "Bill Date",
  "Bill Time",
  "Bill Number",
  "Table Number",
  "Waiter Name",
  "Cashier Name",
  "Sale Point Name",
  "Guest Name",
  "Account/Room",
  ...(billF.net ? ["#Net Amount"] : []),
  "#Bill Total"
];
/** A bill served from several sale points is several sales with one number. */
function billGroups() {
  const o = {};
  rs().forEach(s => {
    const b = (o[s.no] = o[s.no] || {
      no: s.no,
      at: s.at,
      label: s.label || "",
      waiter: s.waiter || s.user,
      cashier: s.user,
      guest: s.guest || "N/A",
      room: s.room || "",
      pts: [],
      net: 0,
      g: 0,
      mx: {}
    });
    b.pts.push(s.dept);
    b.net += s.net;
    b.g += s.g;
    Object.entries(s.mx || {}).forEach(([m, v]) => (b.mx[m] = (b.mx[m] || 0) + v));
  });
  return Object.values(o)
    .filter(
      b =>
        (billF.cashier === "All" || b.cashier === billF.cashier) &&
        (billF.pay === "All" || b.mx[billF.pay] > 0)
    )
    .sort((a, b) => a.at - b.at);
}
const billRow = b => [
  b.at.toLocaleDateString("en-GB"),
  b.at.toLocaleTimeString("en-US"),
  b.no,
  b.label,
  b.waiter,
  b.cashier,
  b.pts.join(", "),
  b.guest,
  b.room,
  ...(billF.net ? [m2(b.net)] : []),
  m2(b.g)
];
const billShown = () => {
  const C = billCols();
  return billGroups().filter(b => {
    const r = billRow(b);
    return C.every((x, i) => {
      const w = (billF.col[x] || "").trim().toLowerCase();
      return !w || String(r[i]).toLowerCase().includes(w);
    });
  });
};
const billTotals = B => ({ net: sum(B, b => b.net), g: sum(B, b => b.g) });
function billsGrid(c, r, none) {
  const opt = (L, v) =>
      L.map(
        ([k, n]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(n)}</option>`
      ).join(""),
    who = [...new Set(SALES.map(s => s.user))].sort(),
    t = billTotals(billShown()),
    G2 = billGroups();
  return `<div class="bl-bar"><label>Cashier name<select data-bf="cashier">${opt(
    [["All", "All cashiers"], ...who.map(x => [x, x])],
    billF.cashier
  )}</select></label><label>Paymode<select data-bf="pay">${opt(
    [["All", "All paymodes"], ...Object.entries(MN)],
    billF.pay
  )}</select></label><label class="bl-net"><input type="checkbox" data-bf="net" ${billF.net ? "checked" : ""}> Show net amount on bills</label><span class="bl-hint">Double-click a bill to reprint it</span></div>
 <div class="bl-wrap"><table class="bl-t"><thead><tr>${c.map(x => `<th class="${x[0] === "#" ? "n" : ""}">${esc(x.replace("#", ""))}</th>`).join("")}</tr>
 <tr class="bl-f">${c.map(x => `<td><input data-bc="${esc(x)}" value="${esc(billF.col[x] || "")}" placeholder="Filter" aria-label="Filter ${esc(x.replace("#", ""))}"></td>`).join("")}</tr></thead>
 <tbody>${
   G2.map(b => {
     const x = billRow(b);
     return `<tr data-bill="${esc(b.no)}" ${r.some(y => y[2] === b.no) ? "" : "hidden"}>${x.map((v, i) => `<td class="${c[i][0] === "#" ? "n" : ""}">${esc(v)}</td>`).join("")}</tr>`;
   }).join("") || `<tr><td colspan="${c.length}"><div class="empty">${none}</div></td></tr>`
 }</tbody></table></div>
 <div class="bl-tot"><span id="blCnt">${plural(r.length, "bill")}</span>${billF.net ? `<span>Net <b id="blNet">${m2(t.net)}</b></span>` : ""}<span>Totals <b id="blG">${m2(t.g)}</b></span></div>`;
}
/** Typing in a column filter keeps the cursor where it is, so rows are hidden rather than redrawn. */
function billFilter(col, v) {
  billF.col[col] = v;
  const B = billShown(),
    S = new Set(B.map(b => b.no)),
    t = billTotals(B);
  document
    .querySelectorAll("#vSub [data-bill]")
    .forEach(tr => (tr.hidden = !S.has(tr.dataset.bill)));
  $("#blCnt").textContent = plural(B.length, "bill");
  $("#blG").textContent = m2(t.g);
  if ($("#blNet")) $("#blNet").textContent = m2(t.net);
}
/** The bill as it was paid, on the paper chosen above, marked as a copy. */
function billReprint(no) {
  const S = SALES.filter(s => s.no === no);
  if (!S.length) return;
  const A = S[0],
    keep = (S.find(s => s.slip) || {}).slip,
    lines = S.flatMap(s => s.lines),
    money = k => sum(S, s => s[k] || 0),
    paid = {};
  S.forEach(s => Object.entries(s.mx || {}).forEach(([m, v]) => (paid[m] = (paid[m] || 0) + v)));
  A.copies = (A.copies || 0) + 1;
  const html = receiptHTML({
    no,
    dept: S.map(s => s.dept).join(", "),
    label: A.label,
    guest: A.guest,
    covers: A.covers,
    room: A.room,
    waiter: A.waiter || A.user,
    at: slipStamp(A.at),
    reprint: A.copies,
    lines: lines.map(l => ({ q: l.q, n: l.n, p: l.p, t: l.t })),
    t: {
      sub: sum(lines, l => l.p * l.q),
      disc: money("disc"),
      net: money("net"),
      tax: money("tax"),
      g: money("g"),
      cur: keep && keep.cur,
      pl: A.pl ? { n: A.pl } : null
    },
    paid:
      keep && keep.paid
        ? keep.paid
        : Object.entries(paid)
            .map(([m, v]) => slipRow(MN[m] || m, bill2(v)))
            .join(""),
    change: keep ? keep.change : 0,
    credit: keep ? keep.credit : !!paid.credit,
    fiscal: keep
      ? `CU serial: ${keep.cu}<br>CU invoice no: ${keep.inv}${qr(no + keep.cu)}Scan to verify on KRA eTIMS<br>(demo QR)`
      : ""
  });
  BILLLOG.push({
    at: new Date().toISOString(),
    act: "Reprint",
    no,
    label: A.label,
    dept: S.map(s => s.dept).join(", "),
    waiter: A.waiter || A.user,
    by: boUser.n,
    user: boUser.n,
    why: "",
    detail: `Copy ${A.copies} · ${rpSize === "a4" ? "A4" : "80mm"}`,
    amt: 0,
    points: S.map(s => s.dept)
  });
  bosave();
  showRc(
    rpSize === "a4" ? html.replace('class="slip"', 'class="slip sl-a4"') : html,
    null,
    "Close"
  );
}
const REP = {
  bills: [
    "Bills Report",
    () => {
      const B = billShown(),
        t = billTotals(B),
        c = billCols();
      return [
        c,
        B.map(billRow),
        [
          "Total",
          plural(B.length, "bill"),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          ...(billF.net ? [m2(t.net)] : []),
          m2(t.g)
        ],
        "No bills for these dates and filters.",
        logHead("Bills")
      ];
    }
  ],
  sc: [
    "Sales and Costs Report",
    L => {
      const R = items(L),
        g = sum(R, x => x[1].g),
        c = sum(R, x => x[1].c);
      return [
        ["Item", "#Qty", "#Sales", "#Cost", "#Profit", "#Margin %"],
        R.map(([n, r]) => [n, r.q, m2(r.g), m2(r.c), m2(r.g - r.c), pc(r.g - r.c, r.g)]),
        ["Total", sum(R, x => x[1].q), m2(g), m2(c), m2(g - c), pc(g - c, g)],
        c ? "" : "Costs are zero. Enter unit costs under Inventory to see profit and margin."
      ];
    }
  ],
  ts: [
    "Time Sales Report",
    L => [
      ["Hour", "#Bills", "#Sales"],
      by(L, s => s.at.getHours())
        .sort((a, b) => a[0] - b[0])
        .map(([h, a]) => [z(h) + ":00 to " + z(+h + 1) + ":00", a.length, m2(G(a))]),
      ["Total", L.length, m2(G(L))]
    ]
  ],
  ps: [
    "Periodic Sales Report",
    L => [
      ["Date", "#Bills", "#Net", "#VAT", "#Gross"],
      by(L, s => ymd(s.at))
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([d, a]) => [d, a.length, m2(sum(a, s => s.net)), m2(sum(a, s => s.tax)), m2(G(a))]),
      ["Total", L.length, m2(sum(L, s => s.net)), m2(sum(L, s => s.tax)), m2(G(L))]
    ]
  ],
  blog: [
    "Bill Options Log",
    () => {
      const R = billLog();
      return [
        [
          "Date",
          "Bill",
          "Table",
          "Sale point",
          "Action",
          "Details",
          "Reason",
          "Authorized by",
          "Till user",
          "#Change (KES)"
        ],
        R.map(x => [
          new Date(x.at).toLocaleString("en-GB"),
          x.no,
          x.label,
          x.dept,
          x.act,
          x.detail,
          x.why,
          x.by,
          x.user,
          m2(x.amt)
        ]),
        null,
        R.length ? "" : "Nothing was changed through Bill options in these dates.",
        logHead(plural(R.length, "change"))
      ];
    }
  ],
  vdep: [
    "Voided Bills by Department",
    () => {
      const R = voidRows(),
        rows = [];
      by(
        R.flatMap(x => voidParts(x).map(l => ({ x, l }))),
        p => p.l.d
      )
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([d, P]) => {
          by(P, p => p.x.at + "|" + p.x.no).forEach(([, a]) => {
            const x = a[0].x;
            rows.push([
              d,
              new Date(x.at).toLocaleString("en-GB"),
              x.no,
              x.label,
              x.waiter || "",
              voidItemsText(a.map(p => p.l)),
              x.why,
              x.by,
              m2(sum(a, p => p.l.amt))
            ]);
          });
          rows.push(["Total " + d, "", "", "", "", "", "", "", m2(sum(P, p => p.l.amt))]);
        });
      return [
        [
          "Department",
          "Date",
          "Bill",
          "Table",
          "Waiter",
          "Items voided",
          "Reason",
          "Authorized by",
          "#Value (KES)"
        ],
        rows,
        ["Total", "", "", "", "", "", "", "", m2(voidTotal(R))],
        R.length ? "" : "No voided bills in these dates.",
        logHead(plural(R.length, "void") + " · " + KES(voidTotal(R)))
      ];
    }
  ],
  vall: [
    "All Voided Bills",
    () => {
      const R = voidRows();
      return [
        [
          "Date",
          "Bill",
          "Table",
          "Department",
          "Waiter",
          "Items voided",
          "Voided",
          "Stock",
          "Reason",
          "Authorized by",
          "Till user",
          "#Value (KES)"
        ],
        R.map(x => {
          const P = voidParts(x);
          return [
            new Date(x.at).toLocaleString("en-GB"),
            x.no,
            x.label,
            [...new Set(P.map(l => l.d))].join(", "),
            x.waiter || "",
            voidItemsText(P),
            x.items && !x.whole ? "Part of bill" : "Whole bill",
            x.detail
              .split(" · ")
              .pop()
              .replace(/^./, c => c.toUpperCase()),
            x.why,
            x.by,
            x.user,
            m2(sum(P, l => l.amt))
          ];
        }),
        ["Total", plural(R.length, "void"), "", "", "", "", "", "", "", "", "", m2(voidTotal(R))],
        R.length ? "" : "No voided bills in these dates.",
        logHead(plural(R.length, "void") + " · " + KES(voidTotal(R)))
      ];
    }
  ],
  dlog: [
    "Discount Report",
    () => {
      const R = billLog(["Discount", "Discount removed"]),
        T = sum(R, x => -x.amt);
      return [
        [
          "Date",
          "Bill",
          "Table",
          "Sale point",
          "Waiter",
          "Discount",
          "Reason",
          "Authorized by",
          "Till user",
          "#Amount (KES)"
        ],
        R.map(x => [
          new Date(x.at).toLocaleString("en-GB"),
          x.no,
          x.label,
          logPoints(x).join(", "),
          x.waiter || "",
          x.act === "Discount" ? x.detail : "Removed",
          x.why,
          x.by,
          x.user,
          m2(-x.amt)
        ]),
        ["Total", plural(R.length, "change"), "", "", "", "", "", "", "", m2(T)],
        R.length ? "" : "No discounts were given in these dates.",
        logHead(plural(R.length, "change") + " · " + KES(T))
      ];
    }
  ],
  msp: [
    "Merged & Split Bills",
    () => {
      const R = billLog(["Merge", "Split"]),
        n = a => R.filter(x => x.act === a).length;
      return [
        [
          "Date",
          "Action",
          "Bill",
          "Table",
          "Sale point",
          "Waiter",
          "Details",
          "Authorized by",
          "Till user",
          "#Value (KES)"
        ],
        R.map(x => [
          new Date(x.at).toLocaleString("en-GB"),
          x.act === "Merge" ? "Merged" : "Split",
          x.no,
          x.label,
          logPoints(x).join(", "),
          x.waiter || "",
          x.detail,
          x.by,
          x.user,
          m2(Math.abs(x.amt))
        ]),
        null,
        R.length ? "" : "No bills were merged or split in these dates.",
        logHead(n("Merge") + " merged · " + n("Split") + " split")
      ];
    }
  ],
  ds: [
    "Discounted Sales Report",
    L => {
      const D2 = L.filter(s => s.disc > 0);
      return [
        ["Date", "Bill", "Sale point", "Staff", "#Discount", "#Total"],
        D2.map(s => [dt(s), s.no, s.dept, s.user, m2(s.disc), m2(s.g)]),
        ["Total", D2.length + " bills", "", "", m2(sum(D2, s => s.disc)), m2(G(D2))],
        D2.length ? "" : "No discounted sales have been recorded by the POS yet."
      ];
    }
  ],
  iw: [
    "Sales Report (Item Wise Listing)",
    L => {
      const R = [];
      L.slice()
        .sort((a, b) => b.at - a.at)
        .forEach(s =>
          s.lines.forEach(l => R.push([dt(s), s.no, l.n, l.q, m2(l.p), m2(l.p * l.q)]))
        );
      return [
        ["Date", "Bill", "Item", "#Qty", "#Price", "#Total"],
        R.slice(0, 500),
        ["Total", "", "", sum(R, x => x[3]), "", m2(G(L))]
      ];
    }
  ],
  sw: [
    "Staff/Waiters Sales Totals Report",
    L => [
      ["Staff", "#Bills", "#Sales"],
      by(L, s => s.user)
        .sort((a, b) => G(b[1]) - G(a[1]))
        .map(([u, a]) => [u, a.length, m2(G(a))]),
      ["Total", L.length, m2(G(L))]
    ]
  ],
  ss: [
    "Staff Sales Summary",
    L => [
      ["Staff", "#Cash", "#M-Pesa", "#Credit", "#Total"],
      by(L, s => s.user).map(([u, a]) => [u, ...PMK.map(k => m2(sum(a, s => pm(s, k)))), m2(G(a))]),
      ["Total", ...PMK.map(k => m2(sum(L, s => pm(s, k)))), m2(G(L))]
    ]
  ],
  wd: [
    "Waiter Sales Detailed Report",
    L => {
      const R = L.slice()
        .sort((a, b) => (a.user < b.user ? -1 : a.user > b.user ? 1 : a.at - b.at))
        .map(s => [s.user, dt(s), s.no, s.dept, m2(s.g)]);
      return [
        ["Staff", "Date", "Bill", "Sale point", "#Total"],
        R.slice(0, 500),
        ["Total", "", "", "", m2(G(L))]
      ];
    }
  ],
  sp: [
    "Sales By Sale Points",
    L => [
      ["Sale point", "#Bills", "#Net", "#VAT", "#Gross", "#Share %"],
      by(L, s => s.dept).map(([d, a]) => [
        d,
        a.length,
        m2(sum(a, s => s.net)),
        m2(sum(a, s => s.tax)),
        m2(G(a)),
        pc(G(a), G(L))
      ]),
      ["Total", L.length, m2(sum(L, s => s.net)), m2(sum(L, s => s.tax)), m2(G(L)), "100.0"]
    ]
  ],
  ip: [
    "Item Sales By Paymode",
    L => {
      const o = {};
      L.forEach(s =>
        s.lines.forEach(l => {
          const r = (o[l.n] = o[l.n] || [0, 0, 0]),
            f = s.g ? (l.p * l.q) / s.g : 0;
          PMK.forEach((k, i) => (r[i] += pm(s, k) * f));
        })
      );
      const R = Object.entries(o).sort((a, b) => sum(b[1], x => x) - sum(a[1], x => x));
      return [
        ["Item", "#Cash", "#M-Pesa", "#Credit", "#Total"],
        R.map(([n, r]) => [n, ...r.map(m2), m2(sum(r, x => x))]),
        ["Total", ...PMK.map(k => m2(sum(L, s => pm(s, k)))), m2(G(L))]
      ];
    }
  ],
  spm: [
    "Sale Point Summary",
    L => [
      ["Sale point", "#Bills", "#Cash", "#M-Pesa", "#Credit", "#Total"],
      by(L, s => s.dept).map(([d, a]) => [
        d,
        a.length,
        ...PMK.map(k => m2(sum(a, s => pm(s, k)))),
        m2(G(a))
      ]),
      ["Total", L.length, ...PMK.map(k => m2(sum(L, s => pm(s, k)))), m2(G(L))]
    ]
  ],
  com: [
    "Sales Commission Report",
    L => [
      ["Staff", "#Sales", "#Rate %", "#Commission"],
      by(L, s => s.user).map(([u, a]) => [u, m2(G(a)), rcm, m2((G(a) * rcm) / 100)]),
      ["Total", m2(G(L)), rcm, m2((G(L) * rcm) / 100)]
    ]
  ],
  is: [
    "Item Sales Report",
    L => {
      const R = items(L),
        g = sum(R, x => x[1].g);
      return [
        ["Item", "#Qty", "#Sales", "#Share %"],
        R.map(([n, r]) => [n, r.q, m2(r.g), pc(r.g, g)]),
        ["Total", sum(R, x => x[1].q), m2(g), "100.0"]
      ];
    }
  ],
  dr: [
    "Daily Revenue Report",
    L => [
      ["Date", "#Cash", "#M-Pesa", "#Credit", "#Total"],
      by(L, s => ymd(s.at))
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([d, a]) => [d, ...PMK.map(k => m2(sum(a, s => pm(s, k)))), m2(G(a))]),
      ["Total", ...PMK.map(k => m2(sum(L, s => pm(s, k)))), m2(G(L))]
    ]
  ]
};
const tb = (c, r, f, none = "No sales for this report, date range and sale point.") => {
  const n = i => (c[i][0] === "#" ? ' class="n"' : "");
  return `<div class="tw"><table class="t"><tr>${c.map(x => (x[0] === "#" ? `<th class="n">${x.slice(1)}</th>` : `<th>${x}</th>`)).join("")}</tr>${r.length ? r.map(x => `<tr>${x.map((v, i) => `<td${n(i)}>${esc(v)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${c.length}"><div class="empty">${none}</div></td></tr>`}${r.length && f ? `<tr>${f.map((v, i) => `<td${n(i)}><b>${esc(v)}</b></td>`).join("")}</tr>` : ""}</table></div>`;
};
const V = {
  rep() {
    const [t, fn] = REP[rp],
      L = rs(),
      [c, r, f, note, head] = fn(L);
    return `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start"><div class="pn" style="flex:1 1 230px;max-width:300px"><h4>Sales reports</h4>${Object.entries(
      REP
    )
      .map(
        ([k, x]) =>
          `<button class="mini ${k === rp ? "ok" : ""}" style="text-align:left;width:100%" data-r="${k}">${x[0]}</button>`
      )
      .join("")}</div>
 <div class="pn" style="flex:3 1 420px"><h4>${t}</h4><div class="fr" style="align-items:center"><input type="date" data-f="rf" value="${rf}"><input type="date" data-f="rt" value="${rt}"><select data-f="rd">${["All", ...ALLD].map(d => `<option ${d === rd ? "selected" : ""}>${d}</option>`).join("")}</select>${rp === "com" ? `<input type="number" step="any" data-f="rc" value="${rcm}" title="Commission rate %" placeholder="Rate %">` : ""}</div>
 <div class="fr"><button class="mini" data-q="0">Today</button><button class="mini" data-q="6">Last 7 days</button><button class="mini" data-q="29">Last 30 days</button>${printTools("rep")}</div>
 <div style="color:var(--mute);font-size:12px">${head || `${L.length} bills · ${KES(G(L))} · ${rf} to ${rt} · ${rd === "All" ? "all sale points" : rd}`}</div>${rp === "bills" ? billsGrid(c, r, note) : head ? tb(c, r, f, note) : tb(c, r, f)}${note && !head ? `<div class="stk">${note}</div>` : ""}</div></div>`;
  },
  sales() {
    const A = sel(0),
      L = A.slice()
        .sort((a, b) => b.at - a.at)
        .slice(0, 100);
    return `<div class="pn"><div class="fr" style="align-items:center"><h4 style="flex:3">${A.length} sales · ${KES(sum(A, s => s.g))}</h4><button class="mini" data-a="clr">Clear all sales</button></div>${
      L.length
        ? L.map(
            s =>
              `<details><summary>${hhmm(s.at)} ${s.at.toLocaleDateString("en-GB")} · ${s.no} · ${s.dept} · ${esc(s.user)} <b style="float:right">${KES(s.g)}</b></summary><div style="padding:6px 10px;font-size:13px;color:var(--mute)">${s.lines.map(l => `${l.q}× ${esc(l.n)} @ ${l.p.toFixed(2)}`).join("<br>")}<br>Paid: ${Object.entries(
                s.mx || {}
              )
                .map(([k, v]) => (MN[k] || k) + " " + KES(v))
                .join(", ")} · VAT ${s.tax.toFixed(2)}</div></details>`
          ).join("")
        : '<div class="empty">No sales in this range.</div>'
    }</div>`;
  },
  prod() {
    return `<div class="pn"><h4>Add product</h4><div class="fr"><input id="pn" placeholder="Name"><select id="pd">${ALLD.map(d => `<option>${d}</option>`).join("")}</select><input id="pc" placeholder="Category"><input id="pp" type="number" placeholder="Price KES"><select id="pt"><option value="B">B · VAT 16%</option><option value="A">A · 0%</option><option value="C">C · 0%</option></select><select id="pi">${Object.keys(
      ING
    )
      .map(k => `<option value="${k}">${esc(ING[k])}</option>`)
      .join(
        ""
      )}</select><input id="pq" type="number" placeholder="Stock used per sale"><button class="chip on" data-a="addp">Add</button></div></div>
 <div class="pn tw"><table class="t"><tr><th>Item</th><th>Sale point</th><th>Category</th><th>VAT</th><th>Price (KES)</th><th class="n">Can sell</th></tr>${ITEMS.map(i => `<tr><td>${esc(i.n)}</td><td>${i.d}</td><td>${esc(i.c)}</td><td>${i.t}</td><td><input type="number" value="${i.p}" data-pr="${i.id}"></td><td class="n">${avail(i)}</td></tr>`).join("")}</table></div>`;
  },
  inv() {
    return `<div class="pn"><h4>New ingredient</h4><div class="fr"><input id="gn" placeholder="Name and unit, e.g. Tomato (g)"><input id="gq" type="number" placeholder="Opening stock"><button class="chip on" data-a="addg">Add</button></div></div>
 <div class="pn tw"><table class="t"><tr><th>Ingredient</th><th class="n">On hand</th><th>Status</th><th class="n">Unit cost</th><th>Receive stock</th></tr>${Object.keys(
   stock
 )
   .map(k => {
     const s = stock[k],
       st = s <= 0 ? ["bad", "Out"] : s <= RO[k] ? ["warn", "Low"] : ["ok", "OK"];
     return `<tr><td>${esc(ING[k])}</td><td class="n">${s}</td><td><span class="tag ${st[0]}">${st[1]}</span></td><td><input type="number" step="any" value="${INGC[k] || ""}" placeholder="0" data-uc="${k}" style="max-width:90px"></td><td><div class="fr"><input type="number" id="rq_${k}" placeholder="Qty"><button class="mini" data-a="recv" data-k="${k}">Add</button></div></td></tr>`;
   })
   .join("")}</table></div>`;
  },
  staff() {
    return `<div class="pn"><h4>Add staff</h4><div class="fr"><input id="su" placeholder="First Last"><select id="sr"><option>Waiter</option><option>Cashier</option><option>Super Cashier</option><option>Manager</option></select><input id="up" inputmode="numeric" placeholder="PIN (4 to 6 digits)"><button class="chip on" data-a="addu">Add</button></div></div>
 <div class="pn tw"><table class="t"><tr><th>Name</th><th>Role</th><th>PIN</th><th>Card ID</th><th>Sale points</th></tr>${USERS.map((u, i) => `<tr><td>${esc(u.n)}</td><td><select data-ur="${i}">${["Waiter", "Cashier", "Super Cashier", "Manager"].map(r => `<option ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></td><td><input value="${u.pin}" data-up="${i}" inputmode="numeric" style="max-width:100px"></td><td><input value="${esc(u.card || "")}" data-uk="${i}" placeholder="Click, then swipe" style="max-width:140px"></td><td>${ALLD.map(d => `<label style="margin-right:10px"><input type="checkbox" style="width:auto;min-width:0" data-ud="${i}" value="${d}" ${u.d.includes(d) ? "checked" : ""}> ${d}</label>`).join("")}</td></tr>`).join("")}</table></div><div class="pn"><h4>Back Office accounts</h4><div class="stk">Back Office signs in with a username and password. Passwords are stored as hashes on this device.</div><div class="fr"><input id="mn" placeholder="Full name"><input id="mu" placeholder="Username"><input id="mp" type="password" placeholder="Password (6+ characters)"><button class="chip on" data-a="addm">Add account</button></div><div class="tw"><table class="t"><tr><th>Name</th><th>Username</th><th>New password</th><th></th></tr>${ADM.map((a, i) => `<tr><td>${esc(a.n)}</td><td>${esc(a.u)}</td><td><input type="password" id="np_${i}" placeholder="New password"></td><td><div class="fr"><button class="mini" data-a="pwm" data-i="${i}">Change</button>${ADM.length > 1 ? `<button class="mini" data-a="delm" data-i="${i}">Remove</button>` : ""}</div></td></tr>`).join("")}</table></div></div>`;
  },
  cred() {
    return `<div class="pn"><h4>Add credit customer</h4><div class="fr"><input id="cn" placeholder="Customer name"><input id="cc" type="number" placeholder="Credit limit"><button class="chip on" data-a="addc">Add</button></div></div>
 <div class="pn tw"><table class="t"><tr><th>Customer</th><th class="n">Limit</th><th class="n">Owes</th><th>Record payment</th></tr>${CU.map((c, i) => `<tr><td>${esc(c.n)}</td><td class="n">${c.limit.toLocaleString()}</td><td class="n">${c.owes.toLocaleString()}</td><td><div class="fr"><input type="number" id="cp_${i}" placeholder="Amount"><button class="mini" data-a="pay" data-i="${i}">Save</button></div></td></tr>`).join("")}</table></div>`;
  }
};
let hrr = "occ";
const RRL = {
  occ: "Occupancy Report",
  ih: "In-house Guests",
  rv: "Periodic Room Sales",
  pay: "Periodic Payments",
  rt: "Revenue by Room Type",
  gl: "Guests and Invoices List",
  meal: "Breakfast and Meals",
  pend: "Pending Payments",
  arr: "Arrivals and Departures"
};
const rrRange = () => [toYmd(rngOf(0)[0]), toYmd(rngOf(0)[1] - 1)];
function rrData(k) {
  const [a, b] = rrRange();
  if (k === "occ") {
    const o = ROOMS.filter(r => roomStatus(r) === "occ").length;
    return [
      ["Room", "Type", "Status", "Guest", "Arrival", "Departure", "#Balance"],
      ROOMS.map(r => {
        const x = roomStatus(r),
          st = stayOf(r.no);
        return [
          r.no,
          r.type,
          ROOM_STATUS_LABELS[x],
          st ? st.guest : "",
          st ? st.in : "",
          st ? st.out : "",
          st ? m2(folioOf(st).bal) : ""
        ];
      }),
      [
        "Occupancy",
        "",
        "",
        "",
        "",
        "",
        ROOMS.length ? Math.round((o / ROOMS.length) * 100) + "%" : "0%"
      ]
    ];
  }
  if (k === "ih") {
    const L = RESERVATIONS.filter(r => r.status === "inhouse");
    return [
      ["Guest", "Room", "Arrival", "Departure", "#Nights", "#Charges", "#Paid", "#Balance"],
      L.map(r => {
        const f = folioOf(r);
        return [r.guest, r.room, r.in, r.out, f.n, m2(f.total), m2(f.paid), m2(f.bal)];
      }),
      [
        "Total",
        "",
        "",
        "",
        "",
        m2(sum(L, r => folioOf(r).total)),
        m2(sum(L, r => folioOf(r).paid)),
        m2(sum(L, r => folioOf(r).bal))
      ]
    ];
  }
  if (k === "rv") {
    const m = revenueByDay(a, b),
      ks = Object.keys(m).sort(),
      S = x => sum(ks, d => m[d][x]);
    return [
      ["Date", "#Room revenue", "#Breakfast and meals", "#Extras", "#Total"],
      ks.map(d => [
        d,
        m2(m[d].room),
        m2(m[d].meal),
        m2(m[d].ex),
        m2(m[d].room + m[d].meal + m[d].ex)
      ]),
      ["Total", m2(S("room")), m2(S("meal")), m2(S("ex")), m2(S("room") + S("meal") + S("ex"))]
    ];
  }
  if (k === "meal") {
    const M = mealRows(a, b),
      ks = Object.keys(M.day).sort();
    return [
      ["Date", "#Rooms with meals", "#Covers", "#Meal revenue"],
      ks.map(d => [d, M.day[d].rooms, M.day[d].covers, m2(M.day[d].rev)]),
      [
        "Total",
        sum(ks, d => M.day[d].rooms),
        sum(ks, d => M.day[d].covers),
        m2(sum(ks, d => M.day[d].rev))
      ]
    ];
  }
  if (k === "pay") {
    const m = {};
    RESERVATIONS.forEach(r =>
      r.pays.forEach(p => {
        const d = toYmd(p.at);
        if (d >= a && d <= b) (m[d] = m[d] || { cash: 0, mpesa: 0, account: 0 })[p.method] += p.amt;
      })
    );
    const ks = Object.keys(m).sort(),
      S = x => sum(ks, d => m[d][x]);
    return [
      ["Date", "#Cash", "#M-Pesa", "#Customer account", "#Total"],
      ks.map(d => [
        d,
        m2(m[d].cash),
        m2(m[d].mpesa),
        m2(m[d].account),
        m2(m[d].cash + m[d].mpesa + m[d].account)
      ]),
      [
        "Total",
        m2(S("cash")),
        m2(S("mpesa")),
        m2(S("account")),
        m2(S("cash") + S("mpesa") + S("account"))
      ]
    ];
  }
  if (k === "rt") {
    const o = {};
    RESERVATIONS.filter(r => r.status === "inhouse" || r.status === "out").forEach(r => {
      const t = (o[r.type] = o[r.type] || { n: 0, room: 0, meal: 0, ex: 0 }),
        mv = (r.mrate || 0) * ((r.adults || 1) + ((r.children || 0) * FD_SETTINGS.child) / 100);
      for (let i = 0; i < nightsBetween(r.in, r.out); i++) {
        const d = addDays(r.in, i);
        if (d >= a && d <= b && d <= todayYmd()) {
          t.n++;
          t.room += r.rate;
          t.meal += mv;
        }
      }
      r.charges.forEach(c => {
        const d = toYmd(c.at);
        if (d >= a && d <= b) t.ex += c.amt;
      });
    });
    const ks = Object.keys(o);
    return [
      [
        "Room type",
        "#Nights sold",
        "#Avg room rate",
        "#Room revenue",
        "#Breakfast and meals",
        "#Extras",
        "#Total"
      ],
      ks.map(t => [
        t,
        o[t].n,
        m2(o[t].n ? o[t].room / o[t].n : 0),
        m2(o[t].room),
        m2(o[t].meal),
        m2(o[t].ex),
        m2(o[t].room + o[t].meal + o[t].ex)
      ]),
      [
        "Total",
        sum(ks, t => o[t].n),
        "",
        m2(sum(ks, t => o[t].room)),
        m2(sum(ks, t => o[t].meal)),
        m2(sum(ks, t => o[t].ex)),
        m2(sum(ks, t => o[t].room + o[t].meal + o[t].ex))
      ]
    ];
  }
  if (k === "gl") {
    const L = RESERVATIONS.filter(r => r.status !== "cancelled" && r.in >= a && r.in <= b).sort(
      (x, y) => (x.in < y.in ? 1 : -1)
    );
    return [
      ["Guest", "Room", "Arrival", "Departure", "Status", "#Total", "#Paid", "#Balance"],
      L.map(r => {
        const f = folioOf(r);
        return [
          r.guest,
          r.room,
          r.in,
          r.out,
          r.status === "inhouse" ? "In house" : r.status === "out" ? "Checked out" : "Reserved",
          m2(f.total),
          m2(f.paid),
          m2(f.bal)
        ];
      }),
      [
        "Total",
        "",
        "",
        "",
        "",
        m2(sum(L, r => folioOf(r).total)),
        m2(sum(L, r => folioOf(r).paid)),
        m2(sum(L, r => folioOf(r).bal))
      ]
    ];
  }
  if (k === "pend") {
    const L = RESERVATIONS.filter(
      r => (r.status === "inhouse" || r.status === "out") && folioOf(r).bal > 0.009
    );
    return [
      ["Guest", "Room", "Status", "Departure", "#Charges", "#Paid", "#Balance"],
      L.map(r => {
        const f = folioOf(r);
        return [
          r.guest,
          r.room,
          r.status === "inhouse" ? "In house" : "Checked out",
          r.out,
          m2(f.total),
          m2(f.paid),
          m2(f.bal)
        ];
      }),
      [
        "Total",
        "",
        "",
        "",
        m2(sum(L, r => folioOf(r).total)),
        m2(sum(L, r => folioOf(r).paid)),
        m2(sum(L, r => folioOf(r).bal))
      ]
    ];
  }
  const w = addDays(todayYmd(), 7),
    R = [];
  RESERVATIONS.filter(r => r.status === "reserved" && r.in <= w).forEach(r =>
    R.push(["Arrival", r.guest, r.room, r.in])
  );
  RESERVATIONS.filter(r => r.status === "inhouse" && r.out <= w).forEach(r =>
    R.push(["Departure", r.guest, r.room, r.out])
  );
  R.sort((x, y) => (x[3] < y[3] ? -1 : 1));
  return [["Type", "Guest", "Room", "Date"], R];
}
/** The rooms summary cards. Shown on the dashboard and on Insights → Room reports. */
function roomsKpiHTML() {
  if (!ROOMS.length) fdSeed();
  const [a, b] = rrRange(),
    c = {};
  ROOMS.forEach(r => {
    const x = roomStatus(r);
    c[x] = (c[x] || 0) + 1;
  });
  const occ = c.occ || 0,
    m = revenueByDay(a, b),
    rev = sum(Object.keys(m), d => m[d].room),
    mealRev = sum(Object.keys(m), d => m[d].meal);
  return `<div class="kpis">${[
    ["Rooms", ROOMS.length, "in the hotel"],
    ["Occupied", occ, (c.vac || 0) + " vacant · " + (c.res || 0) + " reserved today"],
    [
      "Occupancy",
      ROOMS.length ? Math.round((occ / ROOMS.length) * 100) + "%" : "0%",
      (c.dirty || 0) + " dirty · " + (c.ooo || 0) + " out of order"
    ],
    ["Room revenue", KES(rev), "room rate only · " + PL[per]],
    ["Breakfast and meals", KES(mealRev), PL[per]],
    [
      "Pending payments",
      KES(
        sum(
          RESERVATIONS.filter(
            r => (r.status === "inhouse" || r.status === "out") && folioOf(r).bal > 0.009
          ),
          r => folioOf(r).bal
        )
      ),
      RESERVATIONS.filter(
        r => (r.status === "inhouse" || r.status === "out") && folioOf(r).bal > 0.009
      ).length + " guest(s) owing"
    ]
  ]
    .map(
      ([l, v, d]) =>
        `<div class="k"><div class="l"><span>${l}</span></div><div class="v">${v}</div><div class="d"><span>${d}</span></div></div>`
    )
    .join("")}</div>`;
}
/** Insights → Room reports: tabs, summary cards and the full table. */
function roomsReportHTML() {
  if (!ROOMS.length) fdSeed();
  const [cols, rows, foot] = rrData(hrr),
    q = [
      ["occ", "Occupancy Report"],
      ["ih", "In-house Guests"],
      ["rv", "Periodic Room Sales"]
    ];
  return `<div class="fr" style="align-items:center;margin-bottom:12px"><div style="position:relative;flex:none"><button class="btn p" data-rr="menu">Rooms Report ▾</button><div class="pop rrmenu" style="left:0;right:auto;top:44px;width:260px;padding:6px">${Object.entries(
    RRL
  )
    .map(
      ([k, n]) =>
        `<button class="mini" style="width:100%;text-align:left;border:0;background:${k === hrr ? "var(--tint)" : "none"};padding:9px 10px;margin:1px 0" data-rr="${k}">${n}</button>`
    )
    .join(
      ""
    )}</div></div>${q.map(([k, n]) => `<button class="btn ${k === hrr ? "p" : ""}" data-rr="${k}" style="flex:none">${n}</button>`).join("")}<button class="btn a" data-rr="fd" style="flex:none">Open Front Desk</button></div>
 <div style="margin-bottom:12px">${roomsKpiHTML()}</div>
 <div class="fr" style="align-items:center;justify-content:space-between"><h3 style="margin:0">${RRL[hrr]}</h3><span>${printTools("rooms")}</span></div><div class="cs">${["rv", "pay", "rt", "gl"].includes(hrr) ? rrRange().join(" to ") : "Live position"}</div>${tb(cols, rows, foot, "Nothing to show for this report and period.")}`;
}
function roomsCard() {
  $("#rooms").innerHTML = roomsKpiHTML(); // dashboard: the summary cards only
  const occ = ROOMS.filter(r => roomStatus(r) === "occ").length,
    [a, b] = rrRange(),
    m = revenueByDay(a, b);
  $("#rml").textContent =
    ROOMS.length +
    " rooms · " +
    occ +
    " occupied · " +
    PL[per] +
    " revenue " +
    KES(sum(Object.keys(m), d => m[d].room));
}
V.rooms = () => `<div class="pn">${roomsReportHTML()}</div>`;
/** A click on the rooms report tabs (Room reports page). */
function rrAct(b) {
  const k = b.dataset.rr;
  if (k === "menu") return void b.parentElement.querySelector(".rrmenu").classList.toggle("show");
  if (k === "fd") return go("Front Desk");
  hrr = k;
  all();
}
document.addEventListener("click", e => {
  if (!e.target.closest("[data-rr=menu]"))
    document.querySelectorAll(".rrmenu").forEach(m => m.classList.remove("show"));
});
function dayBar() {
  const d = curDay(),
    os = openShifts();
  $("#dayBar").innerHTML =
    `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div style="display:flex;gap:12px;align-items:center"><span class="ri ${d ? "g" : "w"}" style="width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center">${I(d ? "check" : "alert")}</span><div><b>${d ? "Business day open" : "Business day closed"}</b><div class="cs" style="margin:0">${d ? `Since ${dm(d.openedAt)} ${hm(d.openedAt)} by ${esc(d.openedBy)} · ${os.length} shift${os.length === 1 ? "" : "s"} open` : "Start the day so cashiers can begin their shifts."}</div></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ${d ? "" : "p"}" data-d="${d ? "dend" : "dstart"}">${d ? "End day" : "Start day"}</button><button class="btn" data-d="page">Manage shifts</button></div></div>`;
}
$("#dayBar").onclick = e => {
  const a = e.target.closest("[data-d]");
  if (!a) return;
  const k = a.dataset.d;
  if (k === "page") return go("Shifts & Day");
  const r = k === "dstart" ? dayStart(boUser.n) : dayEnd(boUser.n);
  toast(r || (k === "dstart" ? "Day started." : "Day ended."));
  all();
};
const vr = n =>
  `<span class="tag ${n < 0 ? "bad" : n > 0 ? "warn" : "ok"}">${n > 0 ? "+" : ""}${m2(n)}</span>`;
const V0 = {
  shift() {
    const d = curDay(),
      os = openShifts(),
      hist = SHIFTS.filter(s => s.closedAt)
        .slice()
        .reverse()
        .slice(0, 40),
      days = DAYS.filter(x => x.closedAt)
        .slice()
        .reverse()
        .slice(0, 20),
      free = USERS.filter(u => !shiftOf(u.n)),
      pays = PAYOUTS.slice().reverse().slice(0, 40);
    return `<div class="pn"><h4>Business day</h4>${d ? `<div>Open since <b>${dm(d.openedAt)} ${hm(d.openedAt)}</b> by ${esc(d.openedBy)} · ${os.length} open shift(s)</div><div class="fr"><button class="mini" data-a="dend">End day</button><button class="mini" data-a="pcur">Print day so far</button></div>` : `<div>No day is open. Cashiers cannot take payments until the day starts.</div><div class="fr"><button class="chip on" data-a="dstart">Start day</button></div>`}</div>
 ${d ? `<div class="pn"><h4>Start a shift for a cashier</h4><div class="fr"><select id="shU">${free.map(u => `<option>${esc(u.n)}</option>`).join("")}</select><input id="shF" type="number" placeholder="Opening float (KES)"><button class="chip on" data-a="sstart">Start shift</button></div></div>` : ""}
 <div class="pn tw"><h4>Open shifts</h4>${
   os.length
     ? `<table class="t"><tr><th>Cashier</th><th>Since</th><th class="n">Float</th><th class="n">Bills</th><th class="n">Cash sales</th><th class="n">Paid out</th><th class="n">Expected</th><th>Counted cash</th><th></th></tr>${os
         .map((x, i) => {
           const c = shiftCalc(x);
           return `<tr><td>${esc(x.user)}</td><td>${hm(x.openedAt)}</td><td class="n">${m2(x.float)}</td><td class="n">${c.bills}</td><td class="n">${m2(c.cash)}</td><td class="n">${m2(c.paid)}</td><td class="n">${m2(c.expected)}</td><td><input type="number" id="sc_${i}" placeholder="Count"></td><td><div class="fr"><button class="mini" data-a="send" data-i="${i}">End shift</button><button class="mini" data-a="pop" data-i="${i}">Print</button></div></td></tr>`;
         })
         .join("")}</table>`
     : '<div class="empty">No shifts are open.</div>'
 }</div>
 <div class="pn tw"><h4>Shift history</h4>${hist.length ? `<table class="t"><tr><th>Cashier</th><th>Date</th><th>Time</th><th class="n">Float</th><th class="n">Sales</th><th class="n">Paid out</th><th class="n">Expected cash</th><th class="n">Counted</th><th class="n">Variance</th><th></th></tr>${hist.map((x, i) => `<tr><td>${esc(x.user)}</td><td>${dm(x.openedAt)}</td><td>${hm(x.openedAt)} to ${hm(x.closedAt)}</td><td class="n">${m2(x.float)}</td><td class="n">${m2(x.gross)}</td><td class="n">${m2(x.paid || 0)}</td><td class="n">${m2(x.expected)}</td><td class="n">${m2(x.counted)}</td><td class="n">${vr(x.variance)}</td><td><button class="mini" data-a="pshift" data-i="${i}">Print</button></td></tr>`).join("")}</table>` : '<div class="empty">No closed shifts yet.</div>'}</div>
 <div class="pn tw"><h4>Day history (end-of-day summary)</h4>${days.length ? `<table class="t"><tr><th>Date</th><th>Open</th><th class="n">Bills</th><th class="n">Sales</th><th class="n">VAT</th><th class="n">Cash</th><th class="n">M-Pesa</th><th class="n">Credit</th><th class="n">Paid out</th><th class="n">Cash variance</th><th></th></tr>${days.map((x, i) => `<tr><td>${dm(x.openedAt)}</td><td>${hm(x.openedAt)} to ${hm(x.closedAt)}</td><td class="n">${x.bills}</td><td class="n">${m2(x.gross)}</td><td class="n">${m2(x.vat)}</td><td class="n">${m2(x.cash)}</td><td class="n">${m2(x.mpesa)}</td><td class="n">${m2(x.credit)}</td><td class="n">${m2(x.paid || 0)}</td><td class="n">${vr(x.variance)}</td><td><button class="mini" data-a="pday" data-i="${i}">Print</button></td></tr>`).join("")}</table>` : '<div class="empty">No closed days yet.</div>'}</div>
 <div class="pn tw"><h4>Cash payouts (expenses)</h4>${pays.length ? `<table class="t"><tr><th>Date</th><th>Cashier</th><th>Category</th><th>Description</th><th class="n">Amount</th></tr>${pays.map(x => `<tr><td>${dm(x.at)} ${hm(x.at)}</td><td>${esc(x.user)}</td><td>${esc(x.cat)}</td><td>${esc(x.desc)}</td><td class="n">${m2(x.amt)}</td></tr>`).join("")}<tr><td colspan="4"><b>Total shown</b></td><td class="n"><b>${m2(sum(pays, x => x.amt))}</b></td></tr></table>` : '<div class="empty">No payouts recorded.</div>'}</div>`;
  }
};
Object.assign(V, V0);

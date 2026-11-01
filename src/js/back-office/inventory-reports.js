// ---- inventory reports: purchases, issues, damages & wastage, with daily / weekly / monthly / yearly cost ----
// Purchases come from goods received (GRNS). Issues, transfers and damages come from stock movements (MOV);
// those record their cost when they happen (see mvc), older ones are valued at today's cost and marked *.
const invRep = { by: "day", store: "All", show: "issues" };

const REP_KINDS = {
  pur: {
    title: "Purchases report",
    what: "Goods received into stores: direct receipts, LPO deliveries and opening stock from Item setup.",
    party: "Vendor"
  },
  iss: {
    title: "Issues report",
    what: "Stock issued from stores to selling points (and, if chosen, transfers between selling points).",
    party: "Issued to"
  },
  dmg: {
    title: "Damage report",
    what: "Stock written off in stores as damaged, expired, spilled, spoiled or lost.",
    party: "Reason"
  }
};
const REP_BY = [
  ["day", "Daily"],
  ["week", "Weekly"],
  ["month", "Monthly"],
  ["year", "Yearly"]
];
const REP_RANGES = [
  ["today", "Today"],
  ["week", "This week"],
  ["month", "This month"],
  ["year", "This year"],
  ["30", "Last 30 days"]
];

/** One row per stock line: { at (ms), ref, doc, store, party, k, q, cost, value, est, by }. */
function repRows(kind) {
  if (kind === "pur")
    return GRNS.flatMap(g =>
      g.lines.map(x => {
        const est = !(x.c > 0),
          c = est ? cst(x.k) : x.c;
        return {
          at: new Date(g.at).getTime(),
          ref: g.lpo ? `${g.id} · ${g.lpo}` : g.id,
          doc: g.id,
          store: g.store || STORES[0],
          party: g.sup || "-",
          k: x.k,
          q: x.q,
          cost: c,
          value: x.q * c,
          est,
          by: g.by || ""
        };
      })
    );
  const types =
    kind === "dmg"
      ? ["DAMAGE"]
      : invRep.show === "transfers"
        ? ["TRANS_OUT"]
        : invRep.show === "both"
          ? ["ISSUE_OUT", "TRANS_OUT"]
          : ["ISSUE_OUT"];
  return MOV.filter(m => types.includes(m.t)).map(m => {
    const est = m.c === undefined,
      c = est ? cst(m.k) : m.c,
      q = -m.q;
    return {
      at: m.at,
      ref: m.ref,
      doc: m.ref + "|" + m.loc,
      store: m.loc,
      party:
        kind === "dmg" ? m.note || "Damaged" : m.peer + (m.t === "TRANS_OUT" ? " (transfer)" : ""),
      k: m.k,
      q,
      cost: c,
      value: q * c,
      est,
      by: m.by || ""
    };
  });
}

const pad2 = n => String(n).padStart(2, "0");
const dmy = (d, o) => d.toLocaleDateString("en-GB", o);
/** The period a moment falls in: key sorts in time order, label is what people read. */
function periodOf(ms, by) {
  const d = new Date(ms);
  if (by === "day")
    return {
      key: toYmd(d),
      label: dmy(d, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    };
  if (by === "week") {
    // ISO week: Monday to Sunday, week 1 holds the year's first Thursday.
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
      wd = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - wd);
    const y = t.getUTCFullYear(),
      w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7),
      mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)),
      sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6),
      f = x => dmy(x, { day: "2-digit", month: "short" });
    return { key: `${y}-W${pad2(w)}`, label: `Week ${w}, ${y} (${f(mon)} – ${f(sun)})` };
  }
  if (by === "month")
    return {
      key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      label: dmy(d, { month: "long", year: "numeric" })
    };
  return { key: String(d.getFullYear()), label: String(d.getFullYear()) };
}

/** Places a report covers: stores, plus selling points for purchases (goods can be received there directly)
 *  and for transfers (selling points transfer to each other). */
const repAllPlaces = kind => kind === "pur" || (kind === "iss" && invRep.show !== "issues");
const repPlaces = kind => (repAllPlaces(kind) ? [...STORES, ...ALLD] : STORES);
/** Rows of a report for the chosen range and place. */
function repFiltered(kind) {
  const A = new Date(invR[0] + "T00:00:00").getTime(),
    B = new Date(invR[1] + "T23:59:59.999").getTime(),
    places = repPlaces(kind);
  if (invRep.store !== "All" && !places.includes(invRep.store)) invRep.store = "All";
  return repRows(kind)
    .filter(
      r =>
        places.includes(r.store) &&
        (invRep.store === "All" || r.store === invRep.store) &&
        r.at >= A &&
        r.at <= B
    )
    .sort((a, b) => b.at - a.at);
}

function invReportHTML(kind) {
  const K = REP_KINDS[kind],
    rows = repFiltered(kind),
    total = rows.reduce((a, r) => a + r.value, 0),
    docs = new Set(rows.map(r => r.doc)).size,
    perLabel = { day: "day", week: "week", month: "month", year: "year" }[invRep.by];

  // Totals per period, newest first.
  const per = new Map();
  rows.forEach(r => {
    const p = periodOf(r.at, invRep.by),
      o = per.get(p.key) || { label: p.label, docs: new Set(), lines: 0, value: 0 };
    o.docs.add(r.doc);
    o.lines++;
    o.value += r.value;
    per.set(p.key, o);
  });
  const periods = [...per.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)),
    maxV = Math.max(1, ...periods.map(([, o]) => o.value));

  // Breakdowns: by item and by supplier / selling point / reason.
  const group = keyOf => {
    const m = new Map();
    rows.forEach(r => {
      const k = keyOf(r),
        o = m.get(k) || { q: 0, lines: 0, value: 0, k: r.k };
      o.q += r.q;
      o.lines++;
      o.value += r.value;
      m.set(k, o);
    });
    return [...m.entries()].sort((a, b) => b[1].value - a[1].value);
  };
  const byItem = group(r => r.k),
    byParty = group(r => r.party),
    est = rows.some(r => r.est);

  const seg = (list, cur, act, attr) =>
    `<div class="seg2">${list.map(([v, l]) => `<button class="${v === cur ? "on" : ""}" data-a="${act}" ${attr}="${v}">${l}</button>`).join("")}</div>`;

  return `<div class="pn"><h4>${K.title}</h4><div class="stk">${K.what}</div>
  <div class="fr" style="align-items:end;margin-top:8px"><label>From<input type="date" data-ir="0" value="${invR[0]}"></label><label>To<input type="date" data-ir="1" value="${invR[1]}"></label>${seg(kind === "pur" ? REP_RANGES.filter(([r]) => r !== "30") : REP_RANGES, "", "inv_rprange", "data-rng")}</div>
  <div class="fr" style="align-items:end"><label>Totals by${seg(REP_BY, invRep.by, "inv_rpby", "data-b")}</label>
   <label>${kind === "pur" ? "Received into" : repAllPlaces(kind) ? "From" : "Store"}<select data-rp="store">${opts([repAllPlaces(kind) ? "All places" : "All stores", ...repPlaces(kind)], invRep.store === "All" ? (repAllPlaces(kind) ? "All places" : "All stores") : invRep.store)}</select></label>
   ${
     kind === "iss"
       ? `<label>Show<select data-rp="show">${[
           ["issues", "Issues to selling points"],
           ["transfers", "Transfers between selling points"],
           ["both", "Both"]
         ]
           .map(
             ([v, l]) => `<option value="${v}" ${v === invRep.show ? "selected" : ""}>${l}</option>`
           )
           .join("")}</select></label>`
       : ""
   }
   <button class="mini" data-a="inv_rpcsv" data-k="${kind}">Export CSV</button><button class="chip on" data-a="inv_rpprint" data-k="${kind}">Print</button></div></div>

 <div class="pn"><div class="kstg">
  <div class="kst"><span>Total cost</span><b>KES ${m2(total)}</b></div>
  <div class="kst"><span>${kind === "pur" ? "Receipts" : kind === "iss" ? "Issue documents" : "Write-offs"}</span><b>${docs}</b></div>
  <div class="kst"><span>Lines</span><b>${rows.length}</b></div>
  <div class="kst"><span>Average per ${perLabel} with activity</span><b>KES ${m2(periods.length ? total / periods.length : 0)}</b></div>
 </div></div>

 <div class="pn tw"><h4>${REP_BY.find(x => x[0] === invRep.by)[1]} cost</h4>${
   periods.length
     ? `<table class="t"><tr><th>Period</th><th class="n">Documents</th><th class="n">Lines</th><th class="n">Cost (KES)</th><th style="width:28%">Share</th></tr>${periods
         .map(
           ([, o]) =>
             `<tr><td>${esc(o.label)}</td><td class="n">${o.docs.size}</td><td class="n">${o.lines}</td><td class="n">${m2(o.value)}</td><td><span class="rbar" style="width:${Math.max(1, (o.value / maxV) * 100)}%"></span></td></tr>`
         )
         .join(
           ""
         )}<tr><td><b>Total</b></td><td class="n"><b>${docs}</b></td><td class="n"><b>${rows.length}</b></td><td class="n"><b>${m2(total)}</b></td><td></td></tr></table>`
     : '<div class="empty">Nothing in this range. Try a wider range or another store.</div>'
 }</div>

 ${
   rows.length
     ? `<div class="g2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px">
  <div class="pn tw"><h4>By item</h4><table class="t"><tr><th>Item</th><th class="n">Quantity</th><th class="n">Cost (KES)</th></tr>${byItem
    .map(
      ([k, o]) =>
        `<tr><td>${esc(itemInfo(k).name)}</td><td class="n">${qn(o.q)} ${esc(itemInfo(k).uom)}</td><td class="n">${m2(o.value)}</td></tr>`
    )
    .join("")}</table></div>
  <div class="pn tw"><h4>By ${K.party.toLowerCase()}</h4><table class="t"><tr><th>${K.party}</th><th class="n">Lines</th><th class="n">Cost (KES)</th></tr>${byParty
    .map(
      ([p, o]) =>
        `<tr><td>${esc(p)}</td><td class="n">${o.lines}</td><td class="n">${m2(o.value)}</td></tr>`
    )
    .join("")}</table></div></div>
 <div class="pn tw"><h4>Details${rows.length > 300 ? " (latest 300 of " + rows.length + ")" : ""}</h4><table class="t"><tr><th>Date</th><th>Reference</th><th>Store</th><th>${K.party}</th><th>Item</th><th class="n">Quantity</th><th class="n">Unit cost</th><th class="n">Cost (KES)</th><th>By</th></tr>${rows
   .slice(0, 300)
   .map(
     r =>
       `<tr><td>${dt2(r.at)}</td><td>${esc(r.ref)}</td><td>${esc(r.store)}</td><td>${esc(r.party)}</td><td>${esc(itemInfo(r.k).name)}</td><td class="n">${qn(r.q)} ${esc(itemInfo(r.k).uom)}</td><td class="n">${m2(r.cost)}${r.est ? "*" : ""}</td><td class="n">${m2(r.value)}</td><td>${esc(r.by)}</td></tr>`
   )
   .join(
     ""
   )}</table>${est ? '<div class="stk">* No cost was recorded on these older lines, so they are valued at today\'s cost.</div>' : ""}</div>`
     : ""
 }`;
}

/** Set the From / To dates to a common range. */
function repRange(r) {
  const t = todayYmd(),
    now = new Date();
  const from =
    r === "today"
      ? t
      : r === "week"
        ? addDays(t, -((now.getDay() + 6) % 7))
        : r === "month"
          ? t.slice(0, 8) + "01"
          : r === "year"
            ? t.slice(0, 5) + "01-01"
            : addDays(t, -29);
  invR[0] = from;
  invR[1] = t;
}

/** Download the report lines as CSV (opens in Excel). */
function repCsv(kind) {
  const rows = repFiltered(kind),
    q = v => `"${String(v).replace(/"/g, '""')}"`,
    head = [
      "Date",
      "Reference",
      "Store",
      REP_KINDS[kind].party,
      "Item",
      "Quantity",
      "Unit",
      "Unit cost",
      "Cost",
      "By"
    ],
    lines = rows.map(r =>
      [
        new Date(r.at).toLocaleString("en-GB"),
        r.ref,
        r.store,
        r.party,
        itemInfo(r.k).name,
        +r.q.toFixed(3),
        itemInfo(r.k).uom,
        r.cost.toFixed(2),
        r.value.toFixed(2),
        r.by
      ]
        .map(q)
        .join(",")
    );
  if (!rows.length) return toast("Nothing to export in this range.");
  const blob = new Blob(["﻿" + [head.map(q).join(","), ...lines].join("\r\n")], {
      type: "text/csv"
    }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${kind === "pur" ? "purchases" : kind === "iss" ? "issues" : "damages"}-${invR[0]}_to_${invR[1]}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
  toast(rows.length + " lines exported.");
}

/** The report on paper (same layout as the stock taking report; print rules are ST_CSS). */
function repPrintDoc(kind) {
  const K = REP_KINDS[kind],
    rows = repFiltered(kind),
    total = rows.reduce((a, r) => a + r.value, 0),
    B = FD_SETTINGS.biz || {},
    per = new Map(),
    sumBy = keyOf => {
      const m = new Map();
      rows.forEach(r => {
        const o = m.get(keyOf(r)) || { q: 0, lines: 0, value: 0, k: r.k };
        o.q += r.q;
        o.lines++;
        o.value += r.value;
        m.set(keyOf(r), o);
      });
      return [...m.entries()].sort((a, b) => b[1].value - a[1].value);
    };
  rows.forEach(r => {
    const p = periodOf(r.at, invRep.by),
      o = per.get(p.key) || { label: p.label, lines: 0, value: 0 };
    o.lines++;
    o.value += r.value;
    per.set(p.key, o);
  });
  const periods = [...per.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)),
    byItem = sumBy(r => r.k),
    byParty = sumBy(r => r.party),
    byStore = sumBy(r => r.store),
    top = byParty[0],
    place = invRep.store === "All" ? (kind === "pur" ? "All places" : "All stores") : invRep.store,
    small = (title, head, list) =>
      `<table class="st-grp" style="min-width:0;width:100%"><tr><th>${title}</th>${head.map(h => `<th class="n">${h}</th>`).join("")}</tr>${list}</table>`;
  return `<div class="st-doc">
 <div class="st-head">${[FD_SETTINGS.name, B.addr, B.phone && "Tel " + B.phone, B.email]
   .filter(Boolean)
   .map(x => `<div>${esc(x)}</div>`)
   .join("")}<h2>${K.title}</h2></div>
 <div class="st-meta"><div><span>From date</span><b>${slashDate(invR[0])}</b></div><div><span>To date</span><b>${slashDate(invR[1])}</b></div><div><span>${kind === "pur" ? "Received into" : "Store"}</span><b>${esc(place.toUpperCase())}</b></div></div>
 <table class="st-t"><thead><tr><th>Date</th><th>Reference</th><th>${kind === "pur" ? "Place" : "Store"}</th><th>${K.party}</th><th>Item code</th><th>Item description</th><th class="n">Quantity</th><th>Units</th><th class="n">Unit cost</th><th class="n">Cost (KES)</th><th>By</th></tr></thead><tbody>${
   rows.length
     ? rows
         .map(
           r =>
             `<tr class="${kind === "dmg" && r.q > 0 ? "st-short" : ""}"><td>${dt2(r.at)}</td><td>${esc(r.ref)}</td><td>${esc(r.store)}</td><td>${esc(r.party)}</td><td>${esc(itemInfo(r.k).code || "")}</td><td>${esc(itemInfo(r.k).name)}</td><td class="n">${q2(r.q)}</td><td>${esc(itemInfo(r.k).uom)}</td><td class="n">${q2(r.cost)}${r.est ? "*" : ""}</td><td class="n">${q2(r.value)}</td><td>${esc(r.by)}</td></tr>`
         )
         .join("")
     : '<tr><td colspan="11" class="st-none">Nothing in this range.</td></tr>'
 }<tr class="st-tot"><td colspan="9">Total · ${rows.length} line(s)</td><td class="n">${m2(total)}</td><td></td></tr></tbody></table>
 <div class="st-sum" style="grid-template-columns:repeat(4,minmax(0,1fr))">
  <div class="big"><span>Total cost</span><b>KES ${m2(total)}</b></div>
  <div><span>Lines</span><b>${rows.length}</b></div>
  <div><span>Items affected</span><b>${byItem.length}</b></div>
  <div class="${kind === "dmg" && top ? "bad" : ""}"><span>Largest ${K.party.toLowerCase()}</span><b>${top ? esc(top[0]) + " · KES " + m2(top[1].value) : "–"}</b></div>
 </div>
 <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:start">
  ${small(
    REP_BY.find(x => x[0] === invRep.by)[1] + " cost",
    ["Lines", "Cost (KES)"],
    periods
      .map(
        ([, o]) =>
          `<tr><td>${esc(o.label)}</td><td class="n">${o.lines}</td><td class="n">${m2(o.value)}</td></tr>`
      )
      .join("")
  )}
  ${small(
    "By " + K.party.toLowerCase(),
    ["Lines", "Cost (KES)"],
    byParty
      .map(
        ([p, o]) =>
          `<tr><td>${esc(p)}</td><td class="n">${o.lines}</td><td class="n">${m2(o.value)}</td></tr>`
      )
      .join("")
  )}
  ${small(
    "By item",
    ["Quantity", "Cost (KES)"],
    byItem
      .map(
        ([k, o]) =>
          `<tr><td>${esc(itemInfo(k).name)}</td><td class="n">${qn(o.q)} ${esc(itemInfo(k).uom)}</td><td class="n">${m2(o.value)}</td></tr>`
      )
      .join("")
  )}
 </div>
 ${byStore.length > 1 ? small("By " + (kind === "pur" ? "place" : "store"), ["Lines", "Cost (KES)"], byStore.map(([s, o]) => `<tr><td>${esc(s)}</td><td class="n">${o.lines}</td><td class="n">${m2(o.value)}</td></tr>`).join("")) : ""}
 <div class="st-sig"><div>Prepared by: ${esc(boUser ? boUser.n : "")}</div><div>Checked by</div><div>Approved by</div></div>
 <div class="st-foot"><span>Values at cost (excl. VAT) when the stock moved${rows.some(r => r.est) ? "; * older lines valued at today's cost" : ""}.${kind === "dmg" ? " Negative lines are corrections that put stock back." : ""}</span><span>Printed ${slashDate(todayYmd())} ${hm(new Date())}</span></div>
</div>`;
}
/** inv_rp* buttons. */
function repAct(a, d) {
  if (a === "rpby") invRep.by = d.b;
  else if (a === "rprange") repRange(d.rng);
  else if (a === "rpcsv") return repCsv(d.k);
  else if (a === "rpprint") return stPrint(REP_KINDS[d.k].title, repPrintDoc(d.k));
  all();
}

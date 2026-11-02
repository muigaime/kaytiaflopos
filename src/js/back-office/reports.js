// ---- reports ----
const z = (n, w = 2) => String(n).padStart(w, "0"),
  ymd = t => {
    const d = new Date(t);
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  },
  m2 = n => (+n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  PMK = ["cash", "mpesa", "pdq", "comp", "credit", "room"],
  PMH = ["#Cash", "#M-Pesa", "#PDQ", "#Complimentary", "#Credit", "#Room"],
  pm = (s, k) => (s.mx || {})[k] || 0;
let rp = "sc",
  rd = "All",
  rcm = 2,
  rt = ymd(d0()),
  rf = ymd(d0() - 29 * D);
// A new day moves the reports on to its date.
document.addEventListener("kf:newday", () => {
  rt = ymd(d0());
});
const rs = () => {
  const a = new Date(rf + "T00:00:00"),
    b = new Date(rt + "T23:59:59");
  return SALES.filter(s => saleAt(s) >= a && saleAt(s) <= b && (rd === "All" || s.dept === rd));
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
    // On its business date; entries from before business dates use the clock.
    const t = (x.bd ? new Date(x.bd + "T12:00:00") : new Date(x.at)).getTime();
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
  !boCan("rep.print")
    ? ""
    : `<span class="rp-size"><label><input type="radio" name="rpSize" data-rsz="a4" ${rpSize === "a4" ? "checked" : ""}> A4 size</label><label><input type="radio" name="rpSize" data-rsz="80" ${rpSize === "80" ? "checked" : ""}> Thermal paper (80mm)</label></span><button class="mini xl-btn" data-a="rep_xlsx" data-k="${k}">Export to Excel</button><button class="chip on" data-a="rep_print" data-k="${k}">Print</button>`;
const printedBy = () => `Printed ${new Date().toLocaleString("en-GB")} by ${esc(boUser.n)}`;
function tablePrint(title, head, c, r, f, x) {
  const name = x => (x[0] === "#" ? x.slice(1) : x),
    num = i => (c[i][0] === "#" ? ' class="n"' : "");
  if (rpSize === "a4")
    return stPrint(
      title,
      `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>${esc(title)}</h2></div>${x && x.meta ? `<div class="st-meta">${x.meta.map(([l, v]) => `<div><span>${esc(l)}</span><b>${esc(v || "-")}</b></div>`).join("")}</div>` : ""}<div class="st-foot"><span>${esc(head)}</span></div>
 ${x && x.colour ? `<style>.st-doc *{-webkit-print-color-adjust:exact;print-color-adjust:exact}.st-doc .st-t th{background:#241b12;color:#f6efe0}.st-doc .st-t tbody tr:nth-child(even) td{background:#faf5ea}.ps-c th:nth-child(9){background:#e3c98e!important;color:#241b12!important}.ps-c th:nth-child(10){background:#2b6cc4!important}.ps-c th:nth-child(11){background:#b5570f!important}.ps-c th:nth-child(12){background:#0e7a68!important}.ps-c td:nth-child(9){background:#f8efd9!important}.ps-c td:nth-child(10){background:#e8f0fa!important}.ps-c td:nth-child(11){background:#fbeadd!important}.ps-c td:nth-child(12){background:#dff1ed!important}</style>` : ""}<table class="st-t ${x && x.colour ? "ps-c" : ""}"><thead><tr>${c.map((x, i) => `<th${num(i)}>${esc(name(x))}</th>`).join("")}</tr></thead><tbody>${r.map(x => `<tr>${x.map((v, i) => `<td${num(i)}>${esc(v)}</td>`).join("")}</tr>`).join("")}${f ? `<tr class="st-tot">${f.map((v, i) => `<td${num(i)}>${esc(v)}</td>`).join("")}</tr>` : ""}</tbody></table>
 ${x && x.below ? x.below.map(b => `<h3 style="margin:16px 0 4px">${esc(b.t)}</h3><table class="st-t" style="max-width:520px"><thead><tr>${b.c.map(h => `<th${h[0] === "#" ? ' class="n"' : ""}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${b.r.map(y => `<tr>${y.map((v, i) => `<td${b.c[i][0] === "#" ? ' class="n"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}<tr class="st-tot">${b.f.map((v, i) => `<td${b.c[i][0] === "#" ? ' class="n"' : ""}>${esc(v)}</td>`).join("")}</tr></tbody></table>`).join("") : ""}<div class="st-foot"><span>${printedBy()}</span></div></div>`
    );
  // A roll is too narrow for wide tables, so each record prints as its own short block.
  if (x && x.thermal) {
    const K = x.thermal;
    r = r.map(y => K.map(i => y[i]));
    f = f && K.map(i => (i === 1 ? "Total" : f[i]));
    c = K.map(i => c[i]);
  }
  const block = (x, tot) =>
      `<div class="b${tot ? " t" : ""}">${x.map((v, i) => (v === "" || v === null || v === undefined ? "" : `<div><span>${esc(name(c[i]))}</span><b>${esc(v)}</b></div>`)).join("")}</div>`,
    w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print.");
  w.document.write(
    `<!DOCTYPE html><html><head><title>${esc(title)}</title><style>@page{size:80mm auto;margin:0}body{width:72mm;margin:0 auto;padding:4mm 0;font:11px/1.35 Arial,sans-serif;color:#000}h1{margin:0;font-size:14px;text-align:center}h2{margin:3px 0;padding:3px 0;border-top:2px solid #000;border-bottom:2px solid #000;font-size:12px;text-align:center;text-transform:uppercase}.h,.p{font-size:10px;text-align:center}.b{padding:4px 0;border-bottom:1px dashed #000}.b div{display:flex;justify-content:space-between;gap:8px}.b b{text-align:right;font-weight:600}.t{border-bottom:3px double #000;font-weight:700}.p{margin-top:6px}</style></head><body><h1>${esc(FD_SETTINGS.name)}</h1><h2>${esc(title)}</h2><div class="h">${esc(head)}</div>${r.map(x => block(x)).join("")}${f ? block(f, 1) : ""}${x && x.below ? x.below.map(b => `<h2>${esc(b.t)}</h2>${b.r.map(y => `<div class="b"><div><span>${esc(y[0])}</span><b>${esc(y[y.length - 1])}</b></div></div>`).join("")}<div class="b t"><div><span>${esc(b.f[0])}</span><b>${esc(b.f[b.f.length - 1])}</b></div></div>`).join("") : ""}<div class="p">${printedBy()}</div></body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}
/** What's on the Reports page right now: the same figures for the screen, paper and Excel. */
function repData(k) {
  let title, c, r, f, head, x;
  if (k === "rooms") {
    [c, r, f] = rrData(hrr);
    title = RRL[hrr];
    head = ["rv", "pay", "rt", "gl"].includes(hrr) ? rrRange().join(" to ") : "Live position";
  } else {
    let h;
    title = REP[rp][0];
    const L = rs();
    [c, r, f, , h, x] = REP[rp][1](L);
    head =
      h ||
      `${L.length} bills · ${KES(G(L))} · ${rf} to ${rt} · ${rd === "All" ? "all sale points" : rd}`;
  }
  return { title, c, r, f, head, x };
}
function repPrint(k) {
  const { title, c, r, f, head, x } = repData(k);
  if (!r.length) return toast("There is nothing to print for these dates.");
  tablePrint(title, head, c, r, f, x);
}
const xlsxBy = () => `Exported ${new Date().toLocaleString("en-GB")} by ${boUser.n}`;
function repXlsx(k) {
  if (!boCan("rep.print")) return boDenied();
  const { title, c, r, f, head, x } = repData(k);
  if (!r.length) return toast("There is nothing to export for these dates.");
  XLSX.download(
    {
      company: FD_SETTINGS.name,
      title,
      head,
      by: xlsxBy(),
      meta: x && x.meta,
      sections: [
        { t: title, c, r, f },
        ...((x && x.below) || []).map(b => ({ t: b.t, c: b.c, r: b.r, f: b.f }))
      ]
    },
    k === "rooms" ? `${title}_${ymd(d0())}` : `${title}_${rf}_to_${rt}`
  );
  toast(title + " exported to Excel.");
}
/** A table on the page as a report section: only the rows showing, without buttons. */
function pageSection(table) {
  const shows = el => el.offsetParent !== null || getComputedStyle(el).display !== "none",
    word = cell => {
      const f = cell.querySelector("input,select");
      if (f) return f.tagName === "SELECT" ? f.options[f.selectedIndex].text : f.value;
      const x = cell.cloneNode(true);
      x.querySelectorAll("button,svg").forEach(e => e.remove());
      return x.textContent.replace(/\s+/g, " ").trim();
    },
    spread = row =>
      [...row.cells].flatMap(cell => [
        word(cell),
        ...Array(Math.max(0, (cell.colSpan || 1) - 1)).fill("")
      ]),
    rows = [...table.rows].filter(shows);
  if (rows.length < 2) return null;
  const width = rows[0].cells.length,
    nums = [...rows[0].cells].map(th => th.classList.contains("n")),
    body = rows.slice(1).filter(x => x.cells.length > 1 || width === 1),
    all = body.map(spread),
    last = all[all.length - 1],
    hasTotal = last && /^total/i.test(last[0] || "") && all.length > 1,
    keep = spread(rows[0])
      .map((h, i) => (h || all.some(y => y[i]) ? i : -1))
      .filter(i => i > -1),
    pick = y => keep.map(i => (y[i] === undefined ? "" : y[i]));
  if (!all.length) return null;
  const pn = table.closest(".pn"),
    h = pn && pn.querySelector("h3,h4,h5");
  return {
    t: h ? h.textContent.trim() : "",
    c: keep.map(i => (nums[i] ? "#" : "") + spread(rows[0])[i]),
    r: (hasTotal ? all.slice(0, -1) : all).map(pick),
    f: hasTotal ? pick(last) : null
  };
}
/** Reports that are only ever drawn as page tables take what's on the page. */
function pageXlsx(b) {
  const right = ACT_RIGHTS[b.dataset.like];
  if (right && !boCan(right)) return boDenied();
  const sections = [...document.querySelectorAll("#vSub table")]
    .filter(t => t.offsetParent !== null)
    .map(pageSection)
    .filter(Boolean);
  if (!sections.length) return toast("There is nothing to export.");
  const title = b.dataset.title;
  XLSX.download(
    { company: FD_SETTINGS.name, title, by: xlsxBy(), sections },
    `${title}_${ymd(d0())}`
  );
  toast(title + " exported to Excel.");
}

// ---- Bills Report: every settled bill, one line each; double-click to reprint ----
const billF = { status: "Combined", cashier: "All", pay: "All", net: false, col: {} };
const billCols = () => [
  "Bill Date",
  "Bill Time",
  "Bill Number",
  "Order",
  "Status",
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
      ord: s.ord || "",
      at: s.at,
      bd: s.bd,
      label: s.label || "",
      waiter: s.waiter || s.user,
      cashier: s.user,
      guest: s.guest || "N/A",
      room: s.room || "",
      status: s.ret ? "Returned" : "Settled",
      copies: 0,
      pts: [],
      net: 0,
      g: 0,
      mx: {}
    });
    b.pts.push(s.dept);
    b.copies = Math.max(b.copies, s.copies || 0, s.billCopies || 0);
    b.net += s.net;
    b.g += s.g;
    Object.entries(s.mx || {}).forEach(([m, v]) => (b.mx[m] = (b.mx[m] || 0) + v));
  });
  const A = new Date(rf + "T00:00:00"),
    Z = new Date(rt + "T23:59:59"),
    open = orders
      .filter(x => {
        const at = new Date(x.at);
        return at >= A && at <= Z && (rd === "All" || billPoints(x.lines).includes(rd));
      })
      .map(x => {
        const t = totals(x.lines, x);
        return {
          no: x.no,
          ord: x.ord || "",
          at: new Date(x.at),
          bd: x.bd,
          copies: x.billCopies || 0,
          label: x.label,
          waiter: x.waiter || "",
          cashier: "",
          guest: x.guest || "N/A",
          room: x.room || "",
          status: "Pending",
          pts: billPoints(x.lines),
          net: t.net,
          g: t.g,
          mx: {}
        };
      });
  return [
    ...(billF.status === "Pending" ? [] : Object.values(o)),
    ...(billF.status === "Settled" ? [] : open)
  ]
    .filter(
      b =>
        (billF.cashier === "All" || b.cashier === billF.cashier) &&
        (billF.pay === "All" || b.mx[billF.pay])
    )
    .sort((a, b) => a.at - b.at);
}
const billRow = b => [
  saleShown(b).toLocaleDateString("en-GB"),
  b.at.toLocaleTimeString("en-US"),
  b.no,
  b.ord,
  b.status,
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
const billTotals = B => {
  const P = B.filter(b => b.status === "Pending");
  return { net: sum(B, b => b.net), g: sum(B, b => b.g), pend: sum(P, b => b.g) };
};
function billsGrid(c, r, none) {
  const opt = (L, v) =>
      L.map(
        ([k, n]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(n)}</option>`
      ).join(""),
    who = [...new Set(SALES.map(s => s.user))].sort(),
    t = billTotals(billShown()),
    G2 = billGroups();
  return `<div class="bl-bar"><label>Bills<select data-bf="status">${opt(
    [
      ["Combined", "Settled and pending"],
      ["Settled", "Settled only"],
      ["Pending", "Pending only"]
    ],
    billF.status
  )}</select></label><label>Cashier name<select data-bf="cashier">${opt(
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
     return `<tr data-bill="${esc(b.no)}" class="${b.status === "Pending" ? "pend" : b.status === "Returned" ? "ret" : ""} ${b.copies ? "rep" : ""}" title="${b.copies ? `Reprinted ${plural(b.copies, "time")}` : ""}" ${r.some(y => y[2] === b.no) ? "" : "hidden"}>${x.map((v, i) => `<td class="${c[i][0] === "#" ? "n" : ""}">${esc(v)}</td>`).join("")}</tr>`;
   }).join("") || `<tr><td colspan="${c.length}"><div class="empty">${none}</div></td></tr>`
 }</tbody></table></div>
 <div class="bl-tot"><span id="blCnt">${plural(r.length, "bill")}</span>${billF.net ? `<span>Net <b id="blNet">${m2(t.net)}</b></span>` : ""}<span>Settled <b id="blS">${m2(t.g - t.pend)}</b></span><span>Pending <b id="blP">${m2(t.pend)}</b></span><span>Combined <b id="blG">${m2(t.g)}</b></span></div>`;
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
  $("#blS").textContent = m2(t.g - t.pend);
  $("#blP").textContent = m2(t.pend);
  if ($("#blNet")) $("#blNet").textContent = m2(t.net);
}
/** The bill as it was paid, on the paper chosen above, marked as a copy. */
function billReprint(no) {
  if (!boCan("sales.reprint")) return boDenied();
  const open = orders.find(o => o.no === no);
  if (open) {
    const print = by => {
      billMark(open, by, boUser.n);
      showRc(
        guestBillHTML({
          no,
          ord: open.ord,
          dept: billPlace(open.lines),
          label: open.label,
          guest: open.guest,
          covers: open.covers,
          room: open.room,
          waiter: open.waiter,
          rider: open.rider,
          reprint: open.billCopies,
          lines: slipLines(open.lines, open),
          t: totals(open.lines, open)
        }),
        null,
        "Close"
      );
      all();
    };
    return open.printed ? pinAsk("Reprint bill " + no, PIN_REPRINT, print) : print(boUser.n);
  }
  // A receipt that was already given out is only printed again when a Manager or Super Cashier agrees.
  if (SALES.some(s => s.no === no))
    pinAsk(
      "Reprint receipt " + no,
      "A Manager or Super Cashier has to authorize this. The receipt will show it was reprinted.",
      by => reprintGo(no, by)
    );
}
function reprintGo(no, by) {
  const S = SALES.filter(s => s.no === no);
  if (!S.length) return;
  const logIt = detail =>
    BILLLOG.push({
      at: new Date().toISOString(),
      bd: bizDate(),
      act: "Reprint",
      no,
      label: S[0].label,
      dept: S.map(s => s.dept).join(", "),
      waiter: S[0].waiter || S[0].user,
      by,
      user: boUser.n,
      why: "",
      detail,
      amt: 0,
      points: S.map(s => s.dept)
    });
  if (S[0].ret) {
    S[0].copies = (S[0].copies || 0) + 1;
    logIt(`Copy ${S[0].copies}`);
    bosave();
    all();
    return showRc(returnSlipHTML(no, S[0].copies), null, "Close");
  }
  const A = S[0],
    keep = (S.find(s => s.slip) || {}).slip,
    lines = S.flatMap(s => s.lines),
    money = k => sum(S, s => s[k] || 0),
    paid = {};
  S.forEach(s => Object.entries(s.mx || {}).forEach(([m, v]) => (paid[m] = (paid[m] || 0) + v)));
  A.copies = (A.copies || 0) + 1;
  const html = receiptHTML({
    no,
    ord: A.ord,
    cust: A.cust,
    custPin: A.custPin,
    dept: S.map(s => s.dept).join(", "),
    label: A.label,
    guest: A.guest,
    covers: A.covers,
    room: A.room,
    waiter: A.waiter || A.user,
    at: slipStamp(saleShown(A)),
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
  logIt(`Copy ${A.copies} · ${rpSize === "a4" ? "A4" : "80mm"}`);
  bosave();
  all();
  showRc(
    rpSize === "a4" ? html.replace('class="slip"', 'class="slip sl-a4"') : html,
    null,
    "Close"
  );
}
// ---- Sales & Orders: the current day and open bills, unless searching ----
const salesF = { q: "", from: "", to: "" };
function salesList() {
  const F = salesF,
    w = F.q.trim().toLowerCase(),
    a = F.from
      ? new Date(F.from + "T00:00:00")
      : F.to || w
        ? new Date(0)
        : curDay()
          ? new Date(curDay().openedAt)
          : new Date(d0()),
    z = F.to ? new Date(F.to + "T23:59:59") : new Date(8.64e15),
    hits = x => !w || x.toLowerCase().includes(w),
    pts = br === BRS[0] ? null : br,
    B = [];
  by(
    // With dates chosen, sales count on their business date. Otherwise it's everything since the day opened.
    SALES.filter(s => {
      const t = F.from || F.to ? saleAt(s) : s.at;
      return t >= a && t <= z && (!pts || s.dept === pts);
    }),
    s => s.no
  ).forEach(([no, S]) => {
    const A = S[0],
      lines = S.flatMap(s => s.lines),
      who = A.waiter || A.user;
    if (
      hits(
        [
          no,
          A.ord,
          A.label,
          who,
          A.user,
          A.guest,
          A.room,
          ...S.map(s => s.dept),
          ...lines.map(l => l.n)
        ].join(" ")
      )
    )
      B.push({
        no,
        ord: A.ord,
        at: A.at,
        label: A.label,
        who,
        pts: S.map(s => s.dept).join(", "),
        g: sum(S, s => s.g),
        lines,
        tag: A.ret ? ["Return", "bad"] : ["Settled", "ok"],
        S
      });
  });
  // Open bills belong to now, so they show unless dates were asked for.
  orders.forEach(o => {
    const at = new Date(o.at),
      lines = slipLines(o.lines, o).map(l => ({ ...l })),
      p = billPoints(o.lines);
    if ((F.from || F.to) && (at < a || at > z)) return;
    if (pts && !p.includes(pts)) return;
    if (
      hits(
        [o.no, o.ord, o.label, o.waiter, o.guest, o.room, ...p, ...lines.map(l => l.n)].join(" ")
      )
    )
      B.push({
        rep: !!o.billCopies,
        no: o.no,
        ord: o.ord,
        at,
        label: o.label,
        who: o.waiter,
        pts: p.join(", "),
        g: totals(o.lines, o).g,
        lines,
        tag: ["Pending", "warn"]
      });
  });
  B.sort((x, y) => y.at - x.at);
  const L = B.slice(0, 200),
    head = F.q || F.from || F.to ? "Search results" : "Current day",
    paid = sum(
      B.filter(b => b.S),
      b => b.g
    ),
    open = sum(
      B.filter(b => !b.S),
      b => b.g
    );
  return `<div class="so-head"><h4>${head}</h4><span>${plural(B.length, "bill")} · Settled ${KES(paid)} · Pending ${KES(open)}</span></div>${
    L.length
      ? L.map(b => {
          const s0 = b.S && b.S[0],
            mx = {};
          (b.S || []).forEach(s =>
            Object.entries(s.mx || {}).forEach(([k, v]) => (mx[k] = (mx[k] || 0) + v))
          );
          return `<details class="so-r ${(b.S && b.S.some(s => s.copies || s.billCopies)) || b.rep ? "rep" : ""}"><summary><span class="so-no">${esc(b.no)}<small>${b.ord ? "Order " + esc(b.ord) : ""}</small></span><span class="so-m"><b>${esc(b.label || "")}</b><small>${hhmm(b.at)} ${b.at.toLocaleDateString("en-GB")} · ${esc(b.pts)} · ${esc(b.who || "")}</small></span><span class="tag ${b.tag[1]}">${b.tag[0]}</span><b class="so-g">${KES(b.g)}</b></summary><div class="so-d">${b.lines.map(l => `${l.q}× ${esc(l.n)} @ ${(+l.p).toFixed(2)}`).join("<br>")}${
            b.S
              ? `<br>Paid: ${Object.entries(mx)
                  .map(([k, v]) => (MN[k] || k) + " " + KES(v))
                  .join(
                    ", "
                  )} · VAT ${sum(b.S, s => s.tax).toFixed(2)}${s0.ret ? `<br>Return from ${esc(s0.ret.of)}: ${esc(s0.ret.why)} · authorized by ${esc(s0.ret.by)}` : ""}`
              : ""
          }<div class="so-a"><button class="mini" data-a="sales_print" data-no="${esc(b.no)}">${b.S ? "Reprint" : "Print bill"}</button>${b.S && !s0.ret && retCan(b.no) && boCan("sales.return") ? `<button class="mini" data-a="ret" data-no="${esc(b.no)}">Return items</button>` : ""}</div></div></details>`;
        }).join("")
      : `<div class="empty">${F.q || F.from || F.to ? "No orders match this search." : "No orders yet in the current day."}</div>`
  }${B.length > L.length ? `<div class="stk">Showing the latest ${L.length}. Narrow the search to see the rest.</div>` : ""}`;
}
/** A waiter's own commission rate from Waiter setup, otherwise the rate on the report. */
const commRate = n => {
  const u = USERS.find(x => x.n === n);
  return u && u.comm !== undefined ? u.comm : rcm;
};
/** Where an item's sale is counted in the accounts. */
const incomeAcc = (l, it) =>
  !it ? (l.id === 0 ? "ROOMS" : "OTHER") : orderStation(it) === "Bar" ? "BEVERAGE" : "FOOD";
const repExtraTop = x =>
  x && x.meta
    ? `<div class="rp-meta ${x.colour ? "colour" : ""}">${x.meta.map(([l, v]) => `<div><span>${esc(l)}</span><b>${esc(v || "–")}</b></div>`).join("")}</div>`
    : "";
/** Each way of paying as its own tile, with its share of the total. */
const payTiles = b => {
  const all = sum(b.tiles, x => x[1]);
  return `<div class="rp-tiles">${b.tiles
    .map(
      ([l, v, c]) =>
        `<div class="rp-tile ${c}"><span>${esc(l)}</span><b>${m2(v)}</b><i><u style="width:${all > 0 ? Math.max(0, (v / all) * 100).toFixed(1) : 0}%"></u></i><small>${all > 0 ? Math.round((v / all) * 100) : 0}% of sales</small></div>`
    )
    .join("")}</div><div class="rp-sums">${b.r
    .filter(x => x[0] === "Total received" || x[0].startsWith("Tips"))
    .map(x => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`)
    .join("")}<div class="big"><span>${esc(b.f[0])}</span><b>${esc(b.f[1])}</b></div></div>`;
};
const repExtraBelow = x =>
  x && x.below
    ? `<div class="rp-below">${x.below.map(b => `<div><h4>${esc(b.t)}</h4>${b.tiles ? payTiles(b) : tb(b.c, b.r, b.f)}</div>`).join("")}</div>`
    : "";
// The Time Sales Report's hours, for every day in the dates. 22:00 to 02:00 runs over midnight.
let rtf = "00:00",
  rtt = "23:59",
  rtw = "All";
const minutesOf = v => +v.slice(0, 2) * 60 + +v.slice(3, 5);
const inTime = s => {
  const m = s.at.getHours() * 60 + s.at.getMinutes(),
    a = minutesOf(rtf),
    b = minutesOf(rtt);
  return a <= b ? m >= a && m <= b : m >= a || m <= b;
};
const billCount = a => new Set(a.filter(s => !s.ret).map(s => s.no)).size;
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
          ...c.slice(2, billF.net ? -2 : -1).map(() => ""),
          ...(billF.net ? [m2(t.net)] : []),
          m2(t.g)
        ],
        "No bills for these dates and filters.",
        logHead("Bills")
      ];
    }
  ],
  tips: [
    "Tips Report",
    L => {
      const tipTotal = s => sum(Object.values(s.tips || {}), v => v),
        R = L.filter(s => s.tips && (rtw === "All" || (s.waiter || s.user) === rtw)).sort(
          (a, b) => b.at - a.at
        ),
        who = s => s.waiter || s.user,
        billG = no =>
          sum(
            SALES.filter(s => s.no === no),
            s => s.g
          ),
        T = sum(R, tipTotal),
        keys = ["cash", "mpesa", "pdq"],
        names = [...new Set(L.filter(s => s.tips).map(who))].sort();
      return [
        [
          "Date",
          "Bill",
          "Order",
          "Table",
          "Sale Point",
          "Waiter",
          "Cashier",
          "Tip Paid By",
          "#Bill Total",
          "#Tip"
        ],
        R.map(s => [
          s.at.toLocaleString("en-GB"),
          s.no,
          s.ord || "",
          s.label || "",
          s.dept,
          who(s),
          s.user,
          Object.keys(s.tips)
            .map(m => MN[m] || m)
            .join(", "),
          m2(billG(s.no)),
          m2(tipTotal(s))
        ]),
        ["Total", plural(R.length, "tip"), "", "", "", "", "", "", "", m2(T)],
        "No tips were recorded in these dates.",
        logHead(plural(R.length, "tip") + " · " + KES(T)),
        {
          thermal: [1, 5, 9],
          tools: `<select data-f="tw" title="Waiter"><option ${rtw === "All" ? "selected" : ""}>All</option>${names.map(n => `<option ${n === rtw ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`,
          below: [
            {
              t: "Tips by waiter",
              c: ["Waiter", "#Bills", "#Cash", "#M-Pesa", "#PDQ", "#Total"],
              r: by(R, who)
                .sort((a, b) => sum(b[1], tipTotal) - sum(a[1], tipTotal))
                .map(([n, a]) => [
                  n,
                  a.length,
                  ...keys.map(k => m2(sum(a, s => s.tips[k] || 0))),
                  m2(sum(a, tipTotal))
                ]),
              f: ["Total", R.length, ...keys.map(k => m2(sum(R, s => s.tips[k] || 0))), m2(T)]
            }
          ]
        }
      ];
    }
  ],
  swp: [
    "Swapped Items Report",
    () => {
      const R = billLog(["Swap"]);
      return [
        [
          "Date",
          "Bill",
          "Table",
          "Sale point",
          "Waiter",
          "#Qty",
          "Item removed",
          "Item given",
          "#Price",
          "Reason",
          "Back to stock",
          "Swapped by",
          "Authorized by"
        ],
        R.map(x => [
          new Date(x.at).toLocaleString("en-GB"),
          x.no,
          x.label,
          x.dept,
          x.waiter,
          x.q,
          x.from,
          x.to,
          m2(x.p),
          x.why,
          x.back ? "Yes" : "No",
          x.user,
          x.by
        ]),
        [
          "Total",
          plural(R.length, "swap"),
          "",
          "",
          "",
          sum(R, x => x.q),
          "",
          "",
          "",
          "",
          "",
          "",
          ""
        ],
        "No swaps for these dates and sale point.",
        logHead("Swaps")
      ];
    }
  ],
  rets: [
    "Returned Items Report",
    L => {
      const R = by(
          L.filter(s => s.ret),
          s => s.no
        ),
        val = a => -sum(a, s => s.g),
        T = sum(R, ([, a]) => val(a));
      return [
        [
          "Date",
          "Credit note",
          "Original bill",
          "Table",
          "Sale point",
          "Waiter",
          "Items returned",
          "Refunded by",
          "Reason",
          "Authorized by",
          "#Value (KES)"
        ],
        R.map(([no, a]) => {
          const paid = {};
          a.forEach(s =>
            Object.entries(s.mx || {}).forEach(([m, v]) => (paid[m] = (paid[m] || 0) - v))
          );
          return [
            a[0].at.toLocaleString("en-GB"),
            no,
            a[0].ret.of,
            a[0].label,
            a.map(s => s.dept).join(", "),
            a[0].waiter || a[0].user,
            a
              .flatMap(s => s.lines)
              .map(l => `${-l.q} ${l.n}`)
              .join(", "),
            Object.entries(paid)
              .filter(([, v]) => v > 0)
              .map(([m, v]) => `${MN[m] || m} ${m2(v)}`)
              .join(", "),
            a[0].ret.why,
            a[0].ret.by,
            m2(val(a))
          ];
        }),
        ["Total", plural(R.length, "return"), "", "", "", "", "", "", "", "", m2(T)],
        "No items were returned in these dates.",
        logHead(plural(R.length, "return") + " · " + KES(T))
      ];
    }
  ],
  sc: [
    "Item Profit Report",
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
    L0 => {
      const L = L0.filter(inTime),
        o = {};
      L.forEach(s => {
        const sub = sum(s.lines, l => l.p * l.q),
          k = sub ? s.g / sub : 0;
        s.lines.forEach(l => {
          const key = l.id + "|" + s.dept,
            r = (o[key] = o[key] || {
              code: String(l.id || "").split("~")[0],
              n: l.n,
              grp: (get(l.id) || {}).c || "Other",
              src: s.dept,
              p: l.p,
              q: 0,
              g: 0
            });
          r.q += l.q;
          r.g += l.p * l.q * k;
        });
      });
      const R = Object.values(o)
          .filter(r => Math.abs(r.q) > 0.0001 || Math.abs(r.g) > 0.005)
          .sort((x, y) => y.g - x.g),
        bills = a => new Set(a.filter(s => !s.ret).map(s => s.no)).size;
      return [
        [
          "Item Code",
          "Item Description",
          "Item Group",
          "Sale Point",
          "#Sale Price",
          "#Qty Sold",
          "#Gross Sales"
        ],
        R.map(r => [r.code, r.n, r.grp, r.src, m2(r.p), r.q, m2(r.g)]),
        ["Items: " + R.length, "", "", "", "", sum(R, r => r.q), m2(sum(R, r => r.g))],
        "Nothing was sold in this time.",
        logHead(`${plural(bills(L), "bill")} · ${KES(G(L))} · ${rtf} to ${rtt}`),
        {
          thermal: [1, 5, 6],
          meta: [
            ["From date", new Date(rf + "T12:00:00").toLocaleDateString("en-GB")],
            ["To date", new Date(rt + "T12:00:00").toLocaleDateString("en-GB")],
            ["From time", rtf],
            ["To time", rtt],
            ["Sale point", rd === "All" ? "All sale points" : rd]
          ],
          below: [
            {
              t: "Sales by hour",
              c: ["Hour", "#Bills", "#Sales"],
              r: by(L, s => s.at.getHours())
                .sort((a, b) => a[0] - b[0])
                .map(([h, a]) => [z(h) + ":00 to " + z((+h + 1) % 24) + ":00", bills(a), m2(G(a))]),
              f: ["Total", bills(L), m2(G(L))]
            }
          ]
        }
      ];
    }
  ],
  ps: [
    "Periodic Sales Report",
    L => {
      const o = {};
      L.forEach(s => {
        const sub = sum(s.lines, l => l.p * l.q),
          k = sub ? s.g / sub : 0;
        s.lines.forEach(l => {
          const it = get(l.id),
            key = l.id + "|" + s.dept,
            r = (o[key] = o[key] || {
              code: String(l.id || "").split("~")[0],
              n: l.n,
              grp: (it || {}).c || "Other",
              src: s.dept,
              acc: incomeAcc(l, it),
              cost: it ? cost({ id: l.id, q: 1 }) : 0,
              p: l.p,
              q: 0,
              g: 0,
              B: 0,
              C: 0
            }),
            v = l.p * l.q * k,
            // The rates when the bill was paid, so changing them later leaves old reports alone.
            R0 = s.rates || { B: 16, C: 0 },
            rb = l.t === "B" || l.t === "BC" ? R0.B : 0,
            rc = l.t === "C" || l.t === "BC" ? R0.C : 0;
          r.q += l.q;
          r.g += v;
          r.B += (v * rb) / (100 + rb + rc);
          r.C += (v * rc) / (100 + rb + rc);
        });
      });
      const R = Object.values(o)
          .filter(r => Math.abs(r.q) > 0.0001 || Math.abs(r.g) > 0.005)
          .sort((x, y) => y.g - x.g),
        T = k => sum(R, r => r[k]),
        tax = r => r.B + r.C,
        totalTax = sum(R, tax),
        P = k => sum(L, s => pm(s, k)),
        recv = P("cash") + P("mpesa") + P("pdq") + P("credit") + P("room"),
        tipT = sum(L, s => sum(Object.values(s.tips || {}), v => v));
      return [
        [
          "Item Code",
          "Item Description",
          "Item Group",
          "Item Source",
          "Income Account",
          "#Cost Price",
          "#Sale Price",
          "#Qty Sold",
          "#Gross Sales",
          "#Tax B",
          "#Tax C",
          "#Net Sales"
        ],
        R.map(r => [
          r.code,
          r.n,
          r.grp,
          r.src,
          r.acc,
          m2(r.cost),
          m2(r.p),
          r.q,
          m2(r.g),
          m2(r.B),
          m2(r.C),
          m2(r.g - tax(r))
        ]),
        [
          "Items: " + R.length,
          "",
          "",
          "",
          "",
          "",
          "",
          T("q"),
          m2(T("g")),
          m2(T("B")),
          m2(T("C")),
          m2(T("g") - totalTax)
        ],
        "No items were sold in these dates.",
        logHead(plural(R.length, "item") + " · " + KES(T("g"))),
        {
          wide: true,
          colour: true,
          thermal: [1, 7, 8],
          meta: [
            ["Postal address", (FD_SETTINGS.biz || {}).addr || ""],
            ["Telephone", (FD_SETTINGS.biz || {}).phone || ""],
            ["From date", new Date(rf + "T12:00:00").toLocaleDateString("en-GB")],
            ["To date", new Date(rt + "T12:00:00").toLocaleDateString("en-GB")],
            ["Item source", rd === "All" ? "All sale points" : rd]
          ],
          below: [
            {
              t: "Income account summary",
              c: ["Income account", "#Net Sales", "#Total"],
              r: by(R, r => r.acc).map(([n, a]) => [
                n,
                m2(sum(a, r => r.g - tax(r))),
                m2(sum(a, r => r.g))
              ]),
              f: ["Total", m2(T("g") - totalTax), m2(T("g"))]
            },
            {
              t: "Payment breakdown",
              tiles: [
                ["M-Pesa", P("mpesa"), "mp"],
                ["Cash", P("cash"), "ca"],
                ["PDQ", P("pdq"), "pq"],
                ["Customer credit", P("credit"), "cr"],
                ["Charged to rooms", P("room"), "rm"],
                ["Complimentary", P("comp"), "co"]
              ],
              c: ["Paid by", "#Amount"],
              r: [
                ["M-Pesa", m2(P("mpesa"))],
                ["Cash", m2(P("cash"))],
                ["PDQ", m2(P("pdq"))],
                ["Customer credit", m2(P("credit"))],
                ["Charged to rooms", m2(P("room"))],
                ["Total received", m2(recv)],
                ["Complimentary (nothing collected)", m2(P("comp"))],
                ["Tips (not part of sales)", m2(tipT)]
              ],
              f: ["Total sales", m2(recv + P("comp"))]
            }
          ]
        }
      ];
    }
  ],
  cmp: [
    "Complimentary Report",
    L => {
      const R = by(
          L.filter(s => pm(s, "comp")),
          s => s.no
        ).sort((x, y) => y[1][0].at - x[1][0].at),
        val = a => sum(a, s => pm(s, "comp")),
        T = sum(R, ([, a]) => val(a));
      return [
        [
          "Date",
          "Bill",
          "Table",
          "Sale point",
          "Waiter",
          "Items",
          "Reason",
          "Authorized by",
          "#Bill Total",
          "#Complimentary"
        ],
        R.map(([no, a]) => {
          const d = (a.find(s => s.comp) || {}).comp || {},
            ret = a[0].ret;
          return [
            a[0].at.toLocaleString("en-GB"),
            no,
            a[0].label,
            a.map(s => s.dept).join(", "),
            a[0].waiter || a[0].user,
            a
              .flatMap(s => s.lines)
              .map(l => `${l.q} ${l.n}`)
              .join(", "),
            ret ? "Return from " + ret.of + ": " + ret.why : d.why || "",
            ret ? ret.by : d.by || "",
            m2(G(a)),
            m2(val(a))
          ];
        }),
        ["Total", plural(R.length, "bill"), "", "", "", "", "", "", "", m2(T)],
        "Nothing was given as complimentary in these dates.",
        logHead(plural(R.length, "bill") + " · " + KES(T))
      ];
    }
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
  iw: [
    "Bill Items Listing",
    L => {
      const R = [];
      L.slice()
        .sort((a, b) => b.at - a.at)
        .forEach(s => s.lines.forEach(l => R.push([s.no, l.n, l.q, m2(l.p), m2(l.p * l.q)])));
      return [
        ["Bill", "Item", "#Qty", "#Price", "#Total"],
        R.slice(0, 500),
        ["Total", "", sum(R, x => x[2]), "", m2(G(L))]
      ];
    }
  ],
  ss: [
    "Staff Sales by Paymode",
    L => [
      ["Staff", "#Bills", ...PMH, "#Total"],
      by(L, s => s.user)
        .sort((a, b) => G(b[1]) - G(a[1]))
        .map(([u, a]) => [u, billCount(a), ...PMK.map(k => m2(sum(a, s => pm(s, k)))), m2(G(a))]),
      ["Total", billCount(L), ...PMK.map(k => m2(sum(L, s => pm(s, k)))), m2(G(L))]
    ]
  ],
  sp: [
    "Sale Point Sales",
    L => [
      ["Sale point", "#Bills", "#Net", "#Tax", ...PMH, "#Gross", "#Share %"],
      by(L, s => s.dept).map(([d, a]) => [
        d,
        billCount(a),
        m2(sum(a, s => s.net)),
        m2(sum(a, s => s.tax)),
        ...PMK.map(k => m2(sum(a, s => pm(s, k)))),
        m2(G(a)),
        pc(G(a), G(L))
      ]),
      [
        "Total",
        billCount(L),
        m2(sum(L, s => s.net)),
        m2(sum(L, s => s.tax)),
        ...PMK.map(k => m2(sum(L, s => pm(s, k)))),
        m2(G(L)),
        "100.0"
      ],
      "",
      "",
      { wide: true }
    ]
  ],
  ip: [
    "Item Sales by Paymode",
    L => {
      const o = {};
      L.forEach(s =>
        s.lines.forEach(l => {
          const r = (o[l.n] = o[l.n] || PMK.map(() => 0)),
            f = s.g ? (l.p * l.q) / s.g : 0;
          PMK.forEach((k, i) => (r[i] += pm(s, k) * f));
        })
      );
      const R = Object.entries(o).sort((a, b) => sum(b[1], x => x) - sum(a[1], x => x));
      return [
        ["Item", ...PMH, "#Total"],
        R.map(([n, r]) => [n, ...r.map(m2), m2(sum(r, x => x))]),
        ["Total", ...PMK.map(k => m2(sum(L, s => pm(s, k)))), m2(G(L))]
      ];
    }
  ],
  com: [
    "Sales Commission Report",
    L => [
      ["Staff", "#Sales", "#Rate %", "#Commission"],
      by(L, s => s.waiter || s.user).map(([u, a]) => {
        const r = commRate(u);
        return [u, m2(G(a)), r, m2((G(a) * r) / 100)];
      }),
      ["Total", m2(G(L)), "", m2(sum(L, s => (s.g * commRate(s.waiter || s.user)) / 100))]
    ]
  ],
  dr: [
    "Daily Takings Report",
    L => [
      ["Date", ...PMH, "#Total"],
      by(L, s => ymd(saleAt(s)))
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
    if (!boCan(repRight(rp, REP[rp][0])))
      rp = Object.keys(REP).find(k => boCan(repRight(k, REP[k][0])));
    const [t, fn] = REP[rp],
      L = rs(),
      [c, r, f, note, head, x] = fn(L),
      picker = Object.entries(REP).filter(([k, y]) => boCan(repRight(k, y[0])));
    return `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start">${
      x && x.wide
        ? `<div class="pn rp-pick"><label>Report<select data-rpsel>${picker.map(([k, y]) => `<option value="${k}" ${k === rp ? "selected" : ""}>${y[0]}</option>`).join("")}</select></label></div>`
        : ""
    }<div class="pn" style="flex:1 1 230px;max-width:300px;${x && x.wide ? "display:none" : ""}"><h4>Sales reports</h4>${picker
      .map(
        ([k, x]) =>
          `<button class="mini ${k === rp ? "ok" : ""}" style="text-align:left;width:100%" data-r="${k}">${x[0]}</button>`
      )
      .join("")}</div>
 <div class="pn" style="flex:3 1 420px;min-width:0"><h4>${t}</h4>${repExtraTop(x)}<div class="fr" style="align-items:center"><input type="date" data-f="rf" value="${rf}"><input type="date" data-f="rt" value="${rt}"><select data-f="rd">${["All", ...ALLD].map(d => `<option ${d === rd ? "selected" : ""}>${d}</option>`).join("")}</select>${rp === "ts" ? `<label class="rp-time">From time<input type="time" data-f="tf" value="${rtf}"></label><label class="rp-time">To time<input type="time" data-f="tt" value="${rtt}"></label>` : ""}${x && x.tools ? x.tools : ""}${rp === "com" ? `<input type="number" step="any" data-f="rc" value="${rcm}" title="Commission rate %" placeholder="Rate %">` : ""}</div>
 <div class="fr"><button class="mini" data-q="0">Today</button><button class="mini" data-q="6">Last 7 days</button><button class="mini" data-q="29">Last 30 days</button>${printTools("rep")}</div>
 <div style="color:var(--mute);font-size:12px">${head || `${L.length} bills · ${KES(G(L))} · ${rf} to ${rt} · ${rd === "All" ? "all sale points" : rd}`}</div>${rp === "bills" ? billsGrid(c, r, note) : x && x.colour ? `<div class="rp-colour">${tb(c, r, f, note)}</div>` : head ? tb(c, r, f, note) : tb(c, r, f)}${repExtraBelow(x)}${note && !head ? `<div class="stk">${note}</div>` : ""}</div></div>`;
  },
  sales() {
    const F = salesF,
      on = F.q || F.from || F.to;
    return `<div class="pn"><div class="so-bar"><label class="so-q">Search orders<input data-sq value="${esc(F.q)}" placeholder="Bill or order number, table, waiter, guest or item" autocomplete="off"></label><label>From<input type="date" data-sf="from" value="${esc(F.from)}"></label><label>To<input type="date" data-sf="to" value="${esc(F.to)}"></label>${on ? '<button class="mini" data-a="sales_clear">Back to current</button>' : ""}</div><div id="salesList">${salesList()}</div></div>`;
  },
  prod() {
    return `<div class="pn"><h4>Add product</h4><div class="fr"><input id="pn" placeholder="Name"><select id="pd">${ALLD.map(d => `<option>${d}</option>`).join("")}</select><input id="pc" list="prodCatL" placeholder="Category"><input id="pp" type="number" placeholder="Price KES"><select id="pt">${taxChoices()
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join("")}</select><select id="pi">${Object.keys(ING)
      .map(k => `<option value="${k}">${esc(ING[k])}</option>`)
      .join(
        ""
      )}</select><input id="pq" type="number" placeholder="Stock used per sale"><button class="chip on" data-a="addp">Add</button></div></div>
 <div class="pn tw"><table class="t"><tr><th>Item</th><th>Sale point</th><th>Category</th><th>VAT</th><th>Price (KES)</th><th class="n">Can sell</th><th>Modifiers</th><th>Accompaniments</th></tr>${ITEMS.map(i => `<tr><td>${esc(i.n)}</td><td>${i.d}</td><td>${esc(i.c)}</td><td>${i.t}</td><td><input type="number" value="${i.p}" data-pr="${i.id}"></td><td class="n">${avail(i)}</td><td>${modCell(i)}</td><td>${accCell(i)}</td></tr>`).join("")}</table></div>`;
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
  if (!boCan("home.money")) $("#rml").textContent = ROOMS.length + " rooms · " + occ + " occupied";
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
const dayLate = () =>
  bizDate() < ymdOf(new Date())
    ? ` · today is ${dateGB(ymdOf(new Date()))}, so this day still needs ending`
    : "";
/** Waiters with pending bills, waiting to start a shift. */
function shiftAuthHTML() {
  const L = shiftAuths().filter(x => x.status === "wait");
  if (!L.length) return "";
  return `<div class="pn tw"><h4>Shift authorisations (${L.length})</h4><div class="stk">These waiters still have bills pending. Authorise to let them start a shift with those bills open.</div><table class="t"><tr><th>Waiter</th><th>Asked at</th><th>Pending bills</th><th class="n">Amount</th><th></th></tr>${L.map(
    x => {
      const P = pendingOf(x.user);
      return `<tr><td><b>${esc(x.user)}</b></td><td>${dm(x.at)} ${hm(x.at)}</td><td>${P.length ? esc(P.map(o => o.no).join(", ")) : "All cleared"}</td><td class="n">${m2(P.reduce((a, o) => a + totals(o.lines, o).g, 0))}</td><td><span class="fr" style="margin:0;flex-wrap:nowrap"><button class="chip on" style="flex:none" data-a="sauth" data-id="${esc(x.id)}">Authorise</button><button class="mini" style="flex:none" data-a="sdecl" data-id="${esc(x.id)}">Decline</button></span></td></tr>`;
    }
  ).join("")}</table></div>`;
}
function dayBar() {
  const d = curDay(),
    os = openShifts();
  $("#dayBar").innerHTML =
    `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div style="display:flex;gap:12px;align-items:center"><span class="ri ${d ? "g" : "w"}" style="width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center">${I(d ? "check" : "alert")}</span><div><b>${d ? `Business date ${dateGB(dayDate(d))}` : "Business day closed"}</b><div class="cs" style="margin:0">${d ? `Since ${dm(d.openedAt)} ${hm(d.openedAt)} by ${esc(d.openedBy)} · ${os.length} shift${os.length === 1 ? "" : "s"} open${dayLate()}` : `The new day will be ${dateGB(nextBizDate())}. Start it so staff can begin their shifts.`}</div></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ${d ? "" : "p"}" data-d="${d ? "dend" : "dstart"}">${d ? "End day" : "Start new day"}</button><button class="btn" data-d="page">Manage shifts</button></div></div>`;
}
$("#dayBar").onclick = e => {
  const a = e.target.closest("[data-d]");
  if (!a) return;
  const k = a.dataset.d;
  if (k === "page") return go("Shifts & Day");
  const r = k === "dstart" ? dayStart(boUser.n) : dayEnd(boUser.n);
  toast(r || (k === "dstart" ? `New day started: ${dateGB(bizDate())}.` : "Day ended."));
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
      free = USERS.filter(u => !shiftOf(u.n) && (u.role !== "Waiter" || posOpt("boWaiterShift"))),
      pays = PAYOUTS.slice().reverse().slice(0, 40);
    return `${shiftAuthHTML()}<div class="pn"><h4>Business day</h4>${d ? `<div>Business date <b>${dateGB(dayDate(d))}</b> · open since ${dm(d.openedAt)} ${hm(d.openedAt)} by ${esc(d.openedBy)} · ${os.length} open shift(s)${dayLate()}</div><div class="fr"><button class="mini" data-a="dend">End day</button><button class="mini" data-a="pcur">Print day so far</button></div>` : `<div>No day is open. The new business date will be <b>${dateGB(nextBizDate())}</b>.</div><div class="fr"><button class="chip on" data-a="dstart">Start new day</button></div>`}</div>
 ${d ? `<div class="pn"><h4>Start a shift and give the float</h4><div class="stk">Or the cashier can enter the float when starting the shift. A float can be changed under Open shifts.</div><div class="fr"><select id="shU">${free.map(u => `<option>${esc(u.n)}</option>`).join("")}</select><input id="shF" type="number" placeholder="Opening float (KES)"><button class="chip on" data-a="sstart">Start shift</button></div></div>` : ""}
 <div class="pn tw"><h4>Open shifts</h4>${
   os.length
     ? `<table class="t"><tr><th>Staff</th><th>Since</th><th>Float (KES)</th><th class="n">Bills</th><th class="n">Cash sales</th><th class="n">Paid out</th><th class="n">Expected</th><th>Counted cash</th><th></th></tr>${os
         .map((x, i) => {
           const c = shiftCalc(x);
           return `<tr><td>${esc(x.user)}</td><td>${hm(x.openedAt)}</td><td><span class="fr" style="margin:0;flex-wrap:nowrap"><input id="sf_${i}" type="number" min="0" step="any" value="${x.float}" style="width:96px" aria-label="Float for ${esc(x.user)}"><button class="mini" style="flex:none" data-a="sfloat" data-i="${i}">Set</button></span></td><td class="n">${c.bills}</td><td class="n">${m2(c.cash)}</td><td class="n">${m2(c.paid)}</td><td class="n">${m2(c.expected)}</td><td><input type="number" id="sc_${i}" placeholder="Count"></td><td><div class="fr"><button class="mini" data-a="send" data-i="${i}">End shift</button><button class="mini" data-a="pop" data-i="${i}">Print</button></div></td></tr>`;
         })
         .join("")}</table>`
     : '<div class="empty">No shifts are open.</div>'
 }</div>
 <div class="pn tw"><h4>Shift history</h4>${hist.length ? `<table class="t"><tr><th>Cashier</th><th>Date</th><th>Time</th><th class="n">Float</th><th class="n">Sales</th><th class="n">Paid out</th><th class="n">Expected cash</th><th class="n">Counted</th><th class="n">Variance</th><th></th></tr>${hist.map((x, i) => `<tr><td>${esc(x.user)}</td><td>${dm(x.openedAt)}</td><td>${hm(x.openedAt)} to ${hm(x.closedAt)}</td><td class="n">${m2(x.float)}</td><td class="n">${m2(x.gross)}</td><td class="n">${m2(x.paid || 0)}</td><td class="n">${m2(x.expected)}</td><td class="n">${m2(x.counted)}</td><td class="n">${vr(x.variance)}</td><td><button class="mini" data-a="pshift" data-i="${i}">Print</button></td></tr>`).join("")}</table>` : '<div class="empty">No closed shifts yet.</div>'}</div>
 <div class="pn tw"><h4>Day history (end-of-day summary)</h4>${days.length ? `<table class="t"><tr><th>Date</th><th>Open</th><th class="n">Bills</th><th class="n">Sales</th><th class="n">VAT</th><th class="n">Cash</th><th class="n">M-Pesa</th><th class="n">Credit</th><th class="n">Paid out</th><th class="n">Cash variance</th><th></th></tr>${days.map((x, i) => `<tr><td>${dateGB(dayDate(x))}</td><td>${hm(x.openedAt)} to ${hm(x.closedAt)}</td><td class="n">${x.bills}</td><td class="n">${m2(x.gross)}</td><td class="n">${m2(x.vat)}</td><td class="n">${m2(x.cash)}</td><td class="n">${m2(x.mpesa)}</td><td class="n">${m2(x.credit)}</td><td class="n">${m2(x.paid || 0)}</td><td class="n">${vr(x.variance)}</td><td><button class="mini" data-a="pday" data-i="${i}">Print</button></td></tr>`).join("")}</table>` : '<div class="empty">No closed days yet.</div>'}</div>
 <div class="pn tw"><h4>Cash payouts (expenses)</h4>${pays.length ? `<table class="t"><tr><th>Date</th><th>Cashier</th><th>Category</th><th>Description</th><th class="n">Amount</th></tr>${pays.map(x => `<tr><td>${dm(x.at)} ${hm(x.at)}</td><td>${esc(x.user)}</td><td>${esc(x.cat)}</td><td>${esc(x.desc)}</td><td class="n">${m2(x.amt)}</td></tr>`).join("")}<tr><td colspan="4"><b>Total shown</b></td><td class="n"><b>${m2(sum(pays, x => x.amt))}</b></td></tr></table>` : '<div class="empty">No payouts recorded.</div>'}</div>`;
  }
};
Object.assign(V, V0);

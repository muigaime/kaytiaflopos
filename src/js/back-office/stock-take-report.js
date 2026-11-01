// ---- Stock taking report: shown on screen as soon as a stock take is posted, printable at any time ----
// Each posted count (COUNTS) keeps a snapshot of every item on the count sheet (opening, purchased,
// transfers in, issued, sold, damaged, adjusted, system, physical, variance) so the report reads the
// same later. Counts posted before this version only have their counted lines.
// Also here: the stock take history, the stock take variance report, and the search boxes (data-find).
let stRep = null; // report open in the popup: { id, show: "all" | "counted" | "var" }
const stVar = { loc: "All" }; // variance report / history filter
const FINDQ = {}; // search box text by key, kept across redraws

// ---------------------------------------------------------------- search boxes
const findWords = key => (FINDQ[key] || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
const findMiss = (key, s) => findWords(key).some(w => !s.includes(w));
/** data-s (what the search looks in) for a table row, hidden at once if the current search misses. */
const findAttr = (key, ...xs) => {
  const s = xs.join(" ").toLowerCase();
  return ` data-s="${esc(s)}"${findMiss(key, s) ? " hidden" : ""}`;
};
const findBox = (key, ph) =>
  `<label class="find"><input type="search" data-find="${key}" value="${esc(FINDQ[key] || "")}" placeholder="${ph}"><span class="find-n"></span></label>`;
/** Filter rows while typing (no redraw, so the cursor stays in the box). */
function stFind(inp) {
  const key = inp.dataset.find,
    scope = inp.closest("[data-findscope]") || document;
  FINDQ[key] = inp.value;
  let n = 0,
    t = 0;
  scope.querySelectorAll("tr[data-s]").forEach(tr => {
    const miss =
      findMiss(key, tr.dataset.s) || (tr.dataset.f !== undefined && !stShowOk(tr.dataset.f));
    tr.hidden = miss;
    t++;
    if (!miss) n++;
  });
  // Group headings in the stock taking report: hide a group with nothing showing.
  scope.querySelectorAll("tr[data-g]").forEach(g => {
    g.hidden = !scope.querySelector(`tr[data-gr="${g.dataset.g}"]:not([hidden])`);
  });
  const c = scope.querySelector(".find-n");
  if (c) c.textContent = findWords(key).length ? `${n} of ${t}` : "";
}

// ---------------------------------------------------------------- snapshot when a count is posted
/** Movements per item at loc since t0 (units of measure), by kind. */
function stMovesAll(loc, t0) {
  const A = {};
  MOV.forEach(m => {
    if (m.loc !== loc || m.at < t0) return;
    const a = (A[m.k] = A[m.k] || { pur: 0, inn: 0, out: 0, sold: 0, dmg: 0, adj: 0 });
    if (m.t === "RECEIVE") a.pur += m.q;
    else if (m.t === "ISSUE_IN" || m.t === "TRANS_IN") a.inn += m.q;
    else if (m.t === "ISSUE_OUT" || m.t === "TRANS_OUT") a.out -= m.q;
    else if (m.t === "SALE" || m.t === "SALE_RET") a.sold -= m.q;
    else if (m.t === "DAMAGE") a.dmg -= m.q;
    else if (m.t === "ADJUST") a.adj += m.q;
  });
  return A;
}
/** One report row, taken before the count adjusts the stock.
 *  r: { k, code, name, grp, cost, div, sys } (a Stock Master row); phys: number or null (not counted). */
function stSnapRow(r, A, phys, narr) {
  const a = A[r.k] || { pur: 0, inn: 0, out: 0, sold: 0, dmg: 0, adj: 0 },
    d = r.div || 1,
    net = (a.pur + a.inn - a.out - a.sold - a.dmg + a.adj) / d;
  return {
    k: r.k,
    code: String(r.code),
    name: d === 1 ? itemInfo(r.k).name : r.name, // the unit has its own column
    grp: r.grp || "",
    uom: d === 1 ? itemInfo(r.k).uom : "portion",
    cost: r.cost,
    op: r.sys - net,
    pur: a.pur / d,
    inn: a.inn / d,
    out: a.out / d,
    sold: a.sold / d,
    dmg: a.dmg / d,
    adj: a.adj / d,
    sys: r.sys,
    phys,
    v: phys === null ? 0 : phys - r.sys,
    narr: narr || ""
  };
}
/** Report rows of a count; older counts (no snapshot) fall back to their counted lines. */
const stRows = c =>
  c.rows ||
  c.lines.map(x => ({
    ...x,
    code: itemInfo(x.k).code || "",
    grp: itemInfo(x.k).group || "",
    uom: itemInfo(x.k).uom,
    op: null
  }));

// ---------------------------------------------------------------- the report
const q2 = n => (n === null || n === undefined ? "–" : Math.abs(n) < 0.005 ? ".00" : m2(n));
const stFlag = r => (r.phys === null ? "u" : Math.abs(r.v) > 1e-9 ? "v" : "c");
const stShowOk = f => {
  const show = stRep ? stRep.show : "all";
  return show === "all" || (show === "counted" ? f !== "u" : f === "v");
};
function stTotals(rows) {
  const T = {
    items: rows.length,
    counted: 0,
    vars: 0,
    sysV: 0,
    physV: 0,
    short: 0,
    surplus: 0,
    groups: {}
  };
  rows.forEach(r => {
    const after = r.phys === null ? r.sys : r.phys, // uncounted items keep their system balance
      vv = r.v * r.cost,
      g = (T.groups[r.grp || "Other"] = T.groups[r.grp || "Other"] || {
        sysV: 0,
        physV: 0,
        v: 0,
        n: 0
      });
    if (r.phys !== null) T.counted++;
    if (Math.abs(r.v) > 1e-9) T.vars++;
    T.sysV += Math.max(0, r.sys) * r.cost;
    T.physV += Math.max(0, after) * r.cost;
    if (vv < 0) T.short += vv;
    else T.surplus += vv;
    g.sysV += Math.max(0, r.sys) * r.cost;
    g.physV += Math.max(0, after) * r.cost;
    g.v += vv;
    g.n++;
  });
  T.net = T.short + T.surplus;
  T.acc = T.counted ? Math.round(((T.counted - T.vars) / T.counted) * 100) : 0;
  return T;
}
/** The stock taking report document. print: leave out rows the filters hide instead of hiding them. */
function stDocHTML(c, print) {
  const rows = stRows(c)
      .slice()
      .sort((a, b) => (a.grp || "").localeCompare(b.grp || "") || a.name.localeCompare(b.name)),
    T = stTotals(rows),
    B = FD_SETTINGS.biz || {},
    from = c.from ? toYmd(c.from) : null,
    to = toYmd(c.at),
    snap = !!c.rows,
    groups = [...new Set(rows.map(r => r.grp || "Other"))];
  let body = "";
  groups.forEach((g, gi) => {
    let vis = false;
    const shown = rows
      .filter(r => (r.grp || "Other") === g)
      .map(r => {
        const f = stFlag(r),
          s = [r.code, r.name, r.grp, r.uom].join(" ").toLowerCase(),
          off = !stShowOk(f) || findMiss("st", s);
        if (!off) vis = true;
        if (print && off) return "";
        return `<tr data-gr="${gi}" data-f="${f}" data-s="${esc(s)}"${off ? " hidden" : ""} class="${f === "v" ? (r.v < 0 ? "st-short" : "st-over") : f === "u" ? "st-unc" : ""}"><td>${esc(r.code)}</td><td>${esc(r.name)}${r.narr ? `<small>${esc(r.narr)}</small>` : ""}</td><td>${esc(r.grp)}</td><td>${esc(r.uom)}</td><td class="n">${q2(r.cost)}</td><td class="n">${q2(r.op)}</td><td class="n">${snap ? q2(r.pur) : "–"}</td><td class="n">${snap ? q2(r.inn) : "–"}</td><td class="n">${snap ? q2(r.out) : "–"}</td><td class="n">${snap ? q2(r.sold) : "–"}</td><td class="n">${snap ? q2(r.dmg) : "–"}</td><td class="n">${snap ? q2(r.adj) : "–"}</td><td class="n">${q2(r.sys)}</td><td class="n"><b>${r.phys === null ? "not counted" : q2(r.phys)}</b></td><td class="n">${r.phys === null ? "" : q2(r.v)}</td><td class="n">${r.phys === null ? "" : q2(r.v * r.cost)}</td></tr>`;
      });
    if (print && !vis) return;
    body += `<tr class="st-g" data-g="${gi}"${vis ? "" : " hidden"}><td colspan="16">${esc(g)}</td></tr>${shown.join("")}`;
  });
  const [stamp, cls] = !T.counted
      ? ["NOTHING COUNTED", ""]
      : T.vars
        ? [`${T.vars} VARIANCE${T.vars > 1 ? "S" : ""}`, "bad"]
        : ["BALANCED", "ok"],
    box = (l, v, k) => `<div class="${k || ""}"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="st-doc">
 <div class="st-stamp ${cls}">${stamp}</div>
 <div class="st-head">${[FD_SETTINGS.name, B.addr, B.phone && "Tel " + B.phone, B.email]
   .filter(Boolean)
   .map(x => `<div>${esc(x)}</div>`)
   .join("")}<h2>Stock Taking Report</h2></div>
 <div class="st-meta">
  <div><span>From date</span><b>${from ? slashDate(from) : "–"}</b></div><div><span>To date</span><b>${slashDate(to)} ${hm(c.at)}</b></div>
  <div><span>${isStore(c.loc) ? "Store name" : "Selling point"}</span><b>${esc(String(c.loc).toUpperCase())}</b></div>
  <div><span>Count no</span><b>${esc(c.id)}</b></div><div><span>Counted by</span><b>${esc(c.by)}</b></div>
  <div><span>Items counted</span><b>${T.counted} of ${T.items}</b></div>
 </div>
 <table class="st-t"><thead><tr><th>Item code</th><th>Item description</th><th>Item group</th><th>Units</th><th class="n">Cost price</th><th class="n">Opening balance</th><th class="n">Purchased</th><th class="n">Transfers in</th><th class="n">Issued</th><th class="n">Sold</th><th class="n">Damaged</th><th class="n">Adjusted</th><th class="n">System balance</th><th class="n">Physical balance</th><th class="n">Variance</th><th class="n">Variance value</th></tr></thead>
 <tbody>${body || '<tr><td colspan="16" class="st-none">No items match.</td></tr>'}</tbody></table>
 <div class="st-sum">
  ${box("System stock value", "KES " + m2(T.sysV))}
  ${box("Stock value after count", "KES " + m2(T.physV), "big")}
  ${box("Shortage value", "KES " + m2(T.short), T.short < 0 ? "bad" : "")}
  ${box("Surplus value", "KES " + m2(T.surplus), T.surplus > 0 ? "ok" : "")}
  ${box("Net variance value", "KES " + m2(T.net), T.net < 0 ? "bad" : T.net > 0 ? "ok" : "")}
  ${box("Count accuracy", T.counted ? T.acc + "% of counted items exact" : "–")}
 </div>
 <table class="st-grp"><tr><th>Value by item group</th><th class="n">Items</th><th class="n">System value</th><th class="n">Value after count</th><th class="n">Variance value</th></tr>${Object.entries(
   T.groups
 )
   .sort((a, b) => a[0].localeCompare(b[0]))
   .map(
     ([g, x]) =>
       `<tr><td>${esc(g)}</td><td class="n">${x.n}</td><td class="n">${m2(x.sysV)}</td><td class="n">${m2(x.physV)}</td><td class="n">${m2(x.v)}</td></tr>`
   )
   .join(
     ""
   )}<tr class="st-tot"><td>Total stock value</td><td class="n">${T.items}</td><td class="n">${m2(T.sysV)}</td><td class="n">${m2(T.physV)}</td><td class="n">${m2(T.net)}</td></tr></table>
 <div class="st-sig"><div>Counted by: ${esc(c.by)}</div><div>Supervised by</div><div>Approved by</div></div>
 <div class="st-foot"><span>Variance = physical − system. Values at cost price (excl. VAT). Items not counted keep their system balance.</span><span>Printed ${slashDate(todayYmd())} ${hm(new Date())}</span></div>
</div>`;
}

// Kept in JS (not a .css file) because the print window needs the same rules.
const ST_CSS = `.st-doc{position:relative;background:#fff;color:#111;border-radius:6px;padding:24px 28px;font:12px/1.4 Arial,Helvetica,sans-serif;overflow-x:auto}
.st-doc .st-head{text-align:center;font-weight:700;text-transform:uppercase;font-size:12px;line-height:1.7}
.st-doc .st-head div:first-child{font-size:15px;letter-spacing:.05em}
.st-doc .st-head h2{font-size:14px;margin:4px 0 0;text-transform:none;letter-spacing:.02em}
.st-doc .st-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 24px;margin:14px 0 10px;padding:8px 12px;border:1px solid #222}
.st-doc .st-meta div{display:flex;gap:10px}
.st-doc .st-meta span{min-width:96px;font-weight:700}
.st-doc .st-t{width:100%;border-collapse:collapse}
.st-doc .st-t th{font-size:11px;text-align:left;border-bottom:2px solid #111;padding:5px 4px;vertical-align:bottom}
.st-doc .st-t td{padding:5px 4px;border-bottom:1px dotted #999;vertical-align:top}
.st-doc .st-t small{display:block;color:#666;font-size:10.5px}
.st-doc .n{text-align:right;white-space:nowrap}
.st-doc th.n{text-align:right}
.st-doc .st-g td{background:#eef1f4;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:11px;border-bottom:1px solid #999}
.st-doc .st-short td{background:#fff3f2}
.st-doc .st-short td:nth-child(15),.st-doc .st-short td:nth-child(16){color:#b3261e;font-weight:700}
.st-doc .st-over td{background:#f0faf5}
.st-doc .st-over td:nth-child(15),.st-doc .st-over td:nth-child(16){color:#16805e;font-weight:700}
.st-doc .st-unc td{color:#888}
.st-doc .st-none{text-align:center;color:#666;padding:16px}
.st-doc .st-sum{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));margin-top:16px;border:1px solid #222}
.st-doc .st-sum div{padding:7px 10px;border-right:1px solid #222;display:grid;gap:2px}
.st-doc .st-sum div:last-child{border-right:0}
.st-doc .st-sum span{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#555}
.st-doc .st-sum b{font-size:13px}
.st-doc .st-sum .big{background:#111;color:#fff}.st-doc .st-sum .big span{color:#ccc}
.st-doc .st-sum .bad b{color:#b3261e}.st-doc .st-sum .ok b{color:#16805e}
.st-doc .st-grp{border-collapse:collapse;margin-top:14px;min-width:60%}
.st-doc .st-grp th{text-align:left;font-size:11px;border-bottom:2px solid #111;padding:4px 8px}
.st-doc .st-grp td{padding:4px 8px;border-bottom:1px dotted #999}
.st-doc .st-tot td{border-top:2px solid #111;border-bottom:3px double #111;font-weight:700}
.st-doc .st-sig{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin-top:40px}
.st-doc .st-sig div{border-top:1px solid #111;padding-top:4px}
.st-doc .st-foot{margin-top:14px;font-size:10.5px;color:#555;display:flex;justify-content:space-between;gap:16px}
.st-doc .st-stamp{position:absolute;right:28px;top:18px;transform:rotate(-7deg);border:3px solid #555;color:#555;border-radius:8px;padding:2px 12px;font-weight:800;letter-spacing:.16em;font-size:12px;opacity:.8}
.st-doc .st-stamp.ok{border-color:#16805e;color:#16805e}.st-doc .st-stamp.bad{border-color:#b3261e;color:#b3261e}
.st-doc .vr-t td:nth-child(9){font-weight:700}`;

function stPrint(title, html) {
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print.");
  w.document.write(
    `<!DOCTYPE html><html><head><title>${esc(title)}</title><style>body{margin:16px}${ST_CSS}.st-doc{padding:0}@page{size:A4 landscape;margin:10mm}</style></head><body>${html}<\/body><\/html>` // "<\/" so tools scanning the page for </body> don't stop here
  );
  w.document.close();
  w.focus();
  w.print();
}

/** The report popup (open after posting a count, or from the history / variance report). */
function stModalIfOpen() {
  const c = stRep && COUNTS.find(x => x.id === stRep.id);
  if (!c) return "";
  const show = (s, l) =>
    `<button class="${stRep.show === s ? "on" : ""}" data-a="st_show" data-s="${s}">${l}</button>`;
  return `<div class="modal show" id="stModal" style="z-index:65"><div class="box st-box" data-findscope>
  <div class="st-bar"><h3>Stock taking report · ${esc(c.loc)}</h3>
   ${findBox("st", "Search code, item or group")}
   <div class="seg2">${show("all", "All items")}${show("counted", "Counted")}${show("var", "Variances only")}</div>
   <button class="mini" data-a="st_var">Variance report</button>
   <button class="chip on" data-a="st_print">Print</button>
   <button class="mini" data-a="st_close" aria-label="Close">✕</button></div>
  <style>${ST_CSS}</style>${stDocHTML(c)}</div></div>`;
}
const stOpen = id => {
  stRep = { id, show: "all" };
  FINDQ.st = "";
};

// ---------------------------------------------------------------- history and variance report (Inventory → Reports)
const stInRange = c => {
  const d = toYmd(c.at);
  return d >= invR[0] && d <= invR[1] && (stVar.loc === "All" || c.loc === stVar.loc);
};
const stLocBar = () =>
  `<div class="pn"><div class="fr"><label>From<input type="date" data-ir="0" value="${invR[0]}"></label><label>To<input type="date" data-ir="1" value="${invR[1]}"></label><label>Place<select data-stloc>${opts(["All places", ...LOCS], stVar.loc === "All" ? "All places" : stVar.loc)}</select></label></div></div>`;

function stHistHTML() {
  const L = COUNTS.filter(stInRange).slice().reverse();
  return `${stLocBar()}<div class="pn tw" data-findscope><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Stock take reports</h4>${findBox("sth", "Search count no, place or person")}</div>
 <table class="t"><tr><th>Date</th><th>Count no</th><th>Place</th><th>Counted by</th><th class="n">Items counted</th><th class="n">With variance</th><th class="n">Stock value after count (KES)</th><th class="n">Net variance (KES)</th><th></th></tr>${
   L.length
     ? L.map(c => {
         const T = stTotals(stRows(c));
         return `<tr${findAttr("sth", c.id, c.loc, c.by, dt2(c.at))}><td>${dt2(c.at)}</td><td>${esc(c.id)}</td><td>${esc(c.loc)}</td><td>${esc(c.by)}</td><td class="n">${T.counted} / ${T.items}</td><td class="n">${T.vars}</td><td class="n">${m2(T.physV)}</td><td class="n ${T.net < 0 ? "neg" : ""}">${m2(T.net)}</td><td><button class="mini" data-a="st_open" data-id="${esc(c.id)}">View</button></td></tr>`;
       }).join("")
     : '<tr><td colspan="9" class="stk">No stock takes in this period.</td></tr>'
 }</table></div>`;
}

/** Every variance from posted stock takes in the period: on screen, searchable and printable. */
function stVarRows() {
  const R = [];
  COUNTS.filter(stInRange)
    .slice()
    .reverse()
    .forEach(c =>
      stRows(c).forEach(x => {
        if (x.phys !== null && Math.abs(x.v) > 1e-9) R.push({ c, x });
      })
    );
  return R;
}
function stVarDoc(R, print) {
  const short = sum(R, ({ x }) => Math.min(0, x.v * x.cost)),
    over = sum(R, ({ x }) => Math.max(0, x.v * x.cost)),
    shown = R.filter(
      ({ c, x }) =>
        !print ||
        !findMiss("var", [c.id, c.loc, x.code, x.name, x.grp, x.narr].join(" ").toLowerCase())
    );
  return `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>Stock Take Variance Report</h2></div>
 <div class="st-meta"><div><span>From date</span><b>${slashDate(invR[0])}</b></div><div><span>To date</span><b>${slashDate(invR[1])}</b></div><div><span>Place</span><b>${esc(stVar.loc === "All" ? "All places" : stVar.loc)}</b></div></div>
 <table class="st-t vr-t"><thead><tr><th>Date</th><th>Count no</th><th>Place</th><th>Item code</th><th>Item description</th><th>Units</th><th class="n">System</th><th class="n">Physical</th><th class="n">Variance</th><th class="n">Cost price</th><th class="n">Value (KES)</th><th>Narration</th><th>Counted by</th></tr></thead><tbody>${
   shown.length
     ? shown
         .map(
           ({ c, x }) =>
             `<tr class="${x.v < 0 ? "st-short" : "st-over"}"${findAttr("var", c.id, c.loc, x.code, x.name, x.grp, x.narr)}><td>${dt2(c.at)}</td><td>${print ? esc(c.id) : `<button class="mini" data-a="st_open" data-id="${esc(c.id)}">${esc(c.id)}</button>`}</td><td>${esc(c.loc)}</td><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(x.uom)}</td><td class="n">${q2(x.sys)}</td><td class="n">${q2(x.phys)}</td><td class="n">${q2(x.v)}</td><td class="n">${q2(x.cost)}</td><td class="n">${q2(x.v * x.cost)}</td><td>${esc(x.narr)}</td><td>${esc(c.by)}</td></tr>`
         )
         .join("")
     : '<tr><td colspan="13" class="st-none">No variances from stock takes in this period.</td></tr>'
 }</tbody></table>
 <div class="st-sum" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div><span>Lines with variance</span><b>${R.length}</b></div><div class="${short < 0 ? "bad" : ""}"><span>Shortage value</span><b>KES ${m2(short)}</b></div><div class="${over > 0 ? "ok" : ""}"><span>Surplus value</span><b>KES ${m2(over)}</b></div><div class="big"><span>Net variance value</span><b>KES ${m2(short + over)}</b></div></div>
 <div class="st-foot"><span>From posted stock takes. Shortage = physical below system.</span><span>Printed ${slashDate(todayYmd())} ${hm(new Date())}</span></div></div>`;
}
function varHTML() {
  const R = stVarRows();
  return `${stLocBar()}<div class="pn" data-findscope><div class="fr" style="align-items:center;justify-content:space-between"><h4 style="margin:0">Stock take variance report</h4><span class="fr" style="flex:none;margin:0;align-items:center">${findBox("var", "Search item, count no or place")}<button class="chip on" data-a="st_varprint">Print</button></span></div>
 <style>${ST_CSS}</style>${stVarDoc(R)}</div>`;
}

/** Printable stock position: every item's balance in each store and selling point, valued at cost. */
function stPosDoc() {
  const keys = Object.keys(ING).sort(
      (a, b) =>
        (itemInfo(a).group || "").localeCompare(itemInfo(b).group || "") ||
        itemInfo(a).name.localeCompare(itemInfo(b).name)
    ),
    locV = LOCS.map(() => 0),
    grpV = {};
  let val = 0,
    body = "",
    grp = null;
  keys.forEach(k => {
    const u = itemInfo(k),
      g = u.group || "Other",
      t = tot(k),
      v = Math.max(0, t) * cst(k);
    LOCS.forEach((l, i) => (locV[i] += Math.max(0, have(l, k)) * cst(k)));
    val += v;
    grpV[g] = (grpV[g] || 0) + v;
    if (g !== grp)
      body += `<tr class="st-g"><td colspan="${LOCS.length + 7}">${esc((grp = g))}</td></tr>`;
    body += `<tr class="${t < 0 ? "st-short" : ""}"><td>${esc(u.code || "")}</td><td>${esc(u.name)}</td><td>${esc(g)}</td><td>${esc(u.uom)}</td>${LOCS.map(l => `<td class="n">${q2(have(l, k))}</td>`).join("")}<td class="n"><b>${q2(t)}</b></td><td class="n">${q2(cst(k))}</td><td class="n">${q2(v)}</td></tr>`;
  });
  const B = FD_SETTINGS.biz || {},
    // Value by group in the summary strip: the 4 largest, or the 3 largest plus "Other groups".
    byV = Object.entries(grpV).sort((x, y) => y[1] - x[1]),
    tops =
      byV.length > 4
        ? [...byV.slice(0, 3), ["Other groups", byV.slice(3).reduce((a, x) => a + x[1], 0)]]
        : byV;
  return `<div class="st-doc">
 <div class="st-head">${[FD_SETTINGS.name, B.addr, B.phone && "Tel " + B.phone, B.email]
   .filter(Boolean)
   .map(x => `<div>${esc(x)}</div>`)
   .join("")}<h2>Stock Position Report</h2></div>
 <div class="st-meta"><div><span>As at</span><b>${slashDate(todayYmd())} ${hm(new Date())}</b></div><div><span>Places</span><b>${STORES.length} store(s), ${ALLD.length} selling point(s)</b></div><div><span>Items</span><b>${keys.length}</b></div></div>
 <table class="st-t"><thead><tr><th>Item code</th><th>Item description</th><th>Item group</th><th>Units</th>${LOCS.map(l => `<th class="n">${esc(l)}</th>`).join("")}<th class="n">Total</th><th class="n">Unit cost</th><th class="n">Value (KES)</th></tr></thead>
 <tbody>${body || `<tr><td colspan="${LOCS.length + 7}" class="st-none">No items yet.</td></tr>`}
 <tr class="st-tot"><td colspan="4">Value by place (KES)</td>${locV.map(v => `<td class="n">${m2(v)}</td>`).join("")}<td></td><td></td><td class="n">${m2(val)}</td></tr></tbody></table>
 <div class="st-sum" style="grid-template-columns:repeat(${tops.length + 1},minmax(0,1fr))">${tops
   .map(([g, v]) => `<div><span>${esc(g)}</span><b>KES ${m2(v)}</b></div>`)
   .join("")}<div class="big"><span>Total stock value</span><b>KES ${m2(val)}</b></div></div>
 <div class="st-sig"><div>Prepared by: ${esc(boUser ? boUser.n : "")}</div><div>Checked by</div><div>Approved by</div></div>
 <div class="st-foot"><span>Quantities in units of measure. Values at weighted average cost (excl. VAT); negative balances are not valued.</span><span>Printed ${slashDate(todayYmd())} ${hm(new Date())}</span></div>
</div>`;
}

// ---------------------------------------------------------------- actions (data-a="st_…")
function stAct(a, b) {
  const d = b.dataset;
  if (a === "open") {
    stOpen(d.id);
    return all();
  }
  if (a === "close") {
    stRep = null;
    return all();
  }
  if (a === "show") {
    stRep.show = d.s;
    return all();
  }
  if (a === "print") {
    const c = COUNTS.find(x => x.id === stRep.id);
    return stPrint(c.id + " stock taking report", stDocHTML(c, true));
  }
  if (a === "var") {
    // The count's variances in the variance report.
    const c = COUNTS.find(x => x.id === stRep.id),
      day = toYmd(c.at);
    stRep = null;
    stVar.loc = c.loc;
    invR[0] = invR[0] > day ? day : invR[0];
    invR[1] = invR[1] < day ? day : invR[1];
    FINDQ.var = c.id;
    invT = "variance";
    return go("Inventory");
  }
  if (a === "posprint") return stPrint("Stock position report", stPosDoc());
  if (a === "varprint") return stPrint("Stock take variance report", stVarDoc(stVarRows(), true));
}

// ---- home widgets ----
function spark(pts, good) {
  const mn = Math.min(...pts),
    mx = Math.max(...pts),
    n = pts.length - 1 || 1,
    x = i => (i * 100) / n,
    y = v => 30 - ((v - mn) / (mx - mn || 1)) * 26,
    d = pts.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("");
  return `<svg class="sp2" viewBox="0 0 100 32" preserveAspectRatio="none"><path d="${d}L100 32L0 32Z" fill="${good ? "rgba(18,128,74,.12)" : "rgba(192,57,43,.12)"}"/><path d="${d}" fill="none" stroke="${good ? "#12804a" : "#c0392b"}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}
function kpis() {
  const C = sel(0),
    P = sel(1),
    rv = a => sum(a, s => s.g),
    count = a => a.filter(s => !s.ret).length,
    av = a => (count(a) ? rv(a) / count(a) : 0),
    L = [
      ["Revenue", rv(C), rv(P), "cash", s => s.g, KES],
      ["VAT collected", sum(C, s => s.tax), sum(P, s => s.tax), "chart", s => s.tax, KES],
      ["Orders", count(C), count(P), "cart", s => (s.ret ? 0 : 1), K],
      ["Average basket", av(C), av(P), "wal", s => s.g, KES],
      ["Receivables", sum(CU, c => c.owes), null, "users", 0, KES],
      ["Open orders", orders.reduce((a, o) => a + totals(o.lines).g, 0), null, "pos", 0, KES]
    ];
  $("#kpis").innerHTML = L.map(([l, c, p, ic, f, fm]) => {
    const has = p > 0,
      pc = has ? ((c - p) / p) * 100 : 0,
      up = pc >= 0,
      good = l === "Receivables" ? true : up;
    return `<div class="k"><div class="l"><span>${l}</span>${I(ic, "var(--mute)")}</div><div class="v">${fm(c)}</div><div class="d ${has ? (good ? "u" : "dn") : ""}">${has ? `${up ? "▲" : "▼"} ${Math.abs(pc).toFixed(1)}% <span>vs previous period</span>` : `<span>${p === null ? "Live balance" : "No previous data"}</span>`}</div>${f ? spark(ser(0, f), good) : ""}</div>`;
  }).join("");
}
/** The banner's headline figures (Five Star theme). */
function heroBar() {
  const rv = a => sum(a, s => s.g),
    now = rv(sel(0)),
    was = rv(sel(1)),
    occ = ROOMS.filter(r => roomStatus(r) === "occ").length,
    wait = APPR.length + apCount(),
    fig = (l, v, s, id) =>
      `<div><span>${l}</span><b ${id ? `id="${id}"` : ""}>${v}</b><small>${s}</small></div>`,
    ch = was > 0 ? ((now - was) / was) * 100 : null;
  $("#hMono").textContent = (FD_SETTINGS.name || "K").trim()[0];
  const money = boCan("home.money");
  $("#hFigs").innerHTML =
    (!money
      ? ""
      : fig(
          "Revenue · " + PL[per],
          KES(now),
          ch === null
            ? "No earlier period to compare"
            : `${ch >= 0 ? "▲" : "▼"} ${Math.abs(ch).toFixed(1)}% on the period before`,
          "heroFig"
        )) +
    fig(
      "Occupancy",
      (ROOMS.length ? Math.round((occ / ROOMS.length) * 100) : 0) + "%",
      `${occ} of ${ROOMS.length} rooms`
    ) +
    fig(
      "Open bills",
      orders.length,
      money ? KES(orders.reduce((a, o) => a + totals(o.lines, o).g, 0)) : "On the POS"
    ) +
    fig("Approvals", wait, wait ? "Waiting for a decision" : "Nothing waiting");
}
function mods() {
  const M = [
    [
      "Point of Sale",
      "pos",
      "#1d5c8a",
      KES(sum(sel(0), s => s.g)) + " " + PL[per],
      orders.length + " open orders"
    ],
    ["Sales & Orders", "cart", "#2b7bb9", sel(0).length + " sales", br],
    [
      "Shifts & Day",
      "id",
      "#7a5ab8",
      curDay() ? "Day open" : "Day closed",
      openShifts().length + " open shifts"
    ],
    [
      "Front Desk",
      "id",
      "#2f9e75",
      ROOMS.filter(r => roomStatus(r) === "occ").length + " of " + ROOMS.length + " rooms occupied",
      "Bookings and guest bills"
    ],
    ["Products", "box", "#c8553d", ITEMS.length + " items", "Prices and VAT classes"],
    [
      "Inventory",
      "box",
      "#e08a1e",
      lowCount() + " low-stock lines",
      Object.keys(stock).length + " ingredients tracked"
    ],
    [
      "Customers",
      "users",
      "#3a8fb7",
      CU.length + " credit customers",
      KES(sum(CU, c => c.owes)) + " owed"
    ],
    [
      "Waiter setup",
      "users",
      "#3a8fb7",
      USERS.length + " POS staff",
      "PINs, rights and sale points"
    ],
    ["Users & roles", "users", "#7d8da1", ADM.length + " users", "Back office roles and rights"],
    [
      "Purchasing",
      "dl",
      "#7a5ab8",
      LPOS.filter(p => p.status === "Open" || p.status === "Partly received").length + " open LPOs",
      VENDORS.length + " vendors"
    ],
    ["Accounting", "book", "#2f9e75", "Next build", "Ledgers and tax"],
    ["M-Pesa & eTIMS", "phone", "#12804a", "Next build", "Sync and invoices"],
    [
      "Reports",
      "chart",
      "#2b7bb9",
      Object.keys(REP).length + " reports",
      "Sales, staff, items, payments"
    ],
    ["Settings", "gear", "#7d8da1", "Bills and receipts", "Hotel details and till number"]
  ];
  const noMoney = !boCan("home.money");
  $("#mods").innerHTML = M.filter(([n]) => boPageOk(n))
    .map(x => (noMoney ? x.map(v => (/KES/.test(String(v)) ? "Open" : v)) : x))
    .map(
      ([n, ic, c, a, b], i) =>
        `<button class="m" data-m="${n}" style="--tc:var(--c${(i % 6) + 1})"><span class="ic" style="background:${c}1f;color:${c}">${I(ic)}</span><b>${n}</b><span class="n" style="color:${c}">${a}</span><span class="s">${b}</span></button>`
    )
    .join("");
}
$("#mods").onclick = e => {
  const b = e.target.closest("[data-m]");
  if (b) go(b.dataset.m);
};
function trend() {
  const n = per === "today" ? 12 : +per,
    cur = ser(0, s => s.g),
    prev = ser(1, s => s.g),
    a = rngOf(0)[0],
    W = 700,
    H = 240,
    L = 48,
    B = 24,
    T = 10,
    mx = Math.max(1, ...cur, ...prev) * 1.15,
    x = i => L + ((i + 0.5) * (W - L - 6)) / n,
    y = v => T + (H - T - B) * (1 - v / mx),
    bw = Math.max(5, ((W - L - 6) / n) * 0.58);
  let g = "";
  for (let k = 0; k <= 4; k++) {
    const v = (mx * k) / 4,
      yy = y(v);
    g += `<line x1="${L}" x2="${W}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" font-size="10.5" fill="var(--mute)">${v >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v)}</text>`;
  }
  const lab = i =>
      per === "today"
        ? 8 + i + ":00"
        : new Date(a + i * D).toLocaleDateString(
            "en-GB",
            per === "7" ? { weekday: "short" } : { day: "numeric" }
          ),
    st = per === "30" ? 5 : per === "today" ? 2 : 1;
  for (let i = 0; i < n; i += st)
    g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="10.5" fill="var(--mute)">${lab(i)}</text>`;
  const bars = cur
      .map(
        (v, i) =>
          `<rect x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${H - B - y(v)}" rx="4" style="fill:var(--tr1,url(#tg))"/><rect class="hit" x="${x(i) - (W - L - 6) / n / 2}" y="${T}" width="${(W - L - 6) / n}" height="${H - T - B}" data-tip="${esc(lab(i))}: ${KES(v)} · before ${KES(prev[i])}"/>`
      )
      .join(""),
    pl = prev.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("");
  $("#trend").innerHTML =
    `<svg class="ch" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c2)"/><stop offset="1" style="stop-color:var(--c1)"/></linearGradient></defs>${g}${bars}<path d="${pl}" fill="none" style="stroke:var(--tr2,var(--acc))" stroke-width="2" stroke-dasharray="5 4" pointer-events="none"/></svg>`;
  $("#tc").textContent = KES(sum(cur, v => v)) + " in the " + PL[per] + " · " + br.toLowerCase();
  $("#pl").textContent = br + " · " + PL[per];
}
function donut() {
  const C = ["var(--c1)", "var(--c3)", "var(--c2)", "var(--c4)", "var(--c6)", "var(--c5)"],
    ad = br === BRS[0],
    R = 62,
    T = 2 * Math.PI * R;
  let o = 0;
  $("#mt").textContent = ad ? "Sales by department" : "Sales by category";
  const every = grp(sel(0), s =>
      ad ? [[s.dept, s.g]] : s.lines.map(l => [(get(l.id) || {}).c || "Other", l.p * l.q])
    ),
    // More than six fold into Other, so the shares still add up to the whole.
    top = every.length > 6 ? every.slice(0, 5) : every,
    rest = sum(every.slice(top.length), x => x[1]),
    m = rest ? [...top, ["Other", rest]] : top,
    tot = sum(m, x => x[1]),
    // A colour stays with its department or category when the period changes the ranking.
    key = ad ? ALLD : [...new Set(ITEMS.map(i => i.c))],
    slots = top.map(x => x[0]).sort((a, b) => key.indexOf(a) - key.indexOf(b)),
    col = n => (slots.includes(n) ? C[slots.indexOf(n)] : "var(--mute)");
  $("#donut").innerHTML = tot
    ? `<svg class="ch" viewBox="0 0 200 200" style="max-width:220px;margin:0 auto"><g transform="rotate(-90 100 100)">${m
        .map(([n, v]) => {
          const l = (v / tot) * T,
            s = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${col(n)}" stroke-width="26" stroke-dasharray="${Math.max(l - 2, 0.5)} ${T - Math.max(l - 2, 0.5)}" stroke-dashoffset="${-o}" data-tip="${esc(n)}: ${KES(v)} · ${Math.round((v / tot) * 100)}%"/>`;
          o += l;
          return s;
        })
        .join(
          ""
        )}</g><text x="100" y="97" text-anchor="middle" font-size="11" fill="var(--mute)">Revenue</text><text x="100" y="116" text-anchor="middle" font-size="15" font-weight="700" fill="var(--ink)">${K(tot / 1000)}k</text></svg>`
    : '<div class="empty">No sales in this period.</div>';
  $("#dl").innerHTML = tot
    ? m
        .map(
          ([n, v]) =>
            `<span><i style="background:${col(n)}"></i>${esc(n)} ${Math.round((v / tot) * 100)}%</span>`
        )
        .join("")
    : "";
}
// One hover note for both charts.
const chTip = document.createElement("div");
chTip.className = "ch-tip";
chTip.hidden = true;
$("#bo").appendChild(chTip);
["#trend", "#donut"].forEach(s => {
  const el = $(s);
  el.addEventListener("mousemove", e => {
    const t = e.target.closest("[data-tip]");
    chTip.hidden = !t;
    if (!t) return;
    chTip.textContent = t.dataset.tip;
    chTip.style.left = Math.min(e.clientX + 14, innerWidth - 270) + "px";
    chTip.style.top = e.clientY + 14 + "px";
  });
  el.addEventListener("mouseleave", () => (chTip.hidden = true));
});
function insights() {
  const L = [],
    lo = Object.keys(stock)
      .filter(k => stock[k] <= RO[k])
      .sort((a, b) => stock[a] / RO[a] - stock[b] / RO[b])[0],
    cr = CU.find(c => c.limit && c.owes / c.limit >= 0.6),
    top = grp(sel(0), s => s.lines.map(l => [l.n, l.q]))[0];
  if (!SALES.length)
    L.push([
      "i",
      "spark",
      "No sales recorded yet",
      "Complete a sale in the POS, or load sample data to explore this dashboard.",
      "Load sample",
      "seed"
    ]);
  if (lo)
    L.push([
      "w",
      "box",
      esc(ING[lo]) + " is running low",
      "Only " +
        stock[lo] +
        " left (reorder level " +
        RO[lo] +
        "). Request more from the warehouse.",
      "Request stock",
      "req"
    ]);
  if (cr)
    L.push([
      "w",
      "users",
      esc(cr.n) + " is at " + Math.round((cr.owes / cr.limit) * 100) + "% of its credit limit",
      "Owes " + KES(cr.owes) + " of " + K(cr.limit) + ". Consider a payment reminder.",
      "Review",
      "go:Customers"
    ]);
  if (top)
    L.push([
      "g",
      "spark",
      esc(top[0]) + " is your best seller",
      "Sold " + top[1] + " units in the " + PL[per] + ".",
      "See sales",
      "go:Sales & Orders"
    ]);
  if (orders.length)
    L.push([
      "i",
      "pos",
      orders.length + " open orders waiting to be charged",
      "Total " +
        KES(orders.reduce((a, o) => a + totals(o.lines).g, 0)) +
        ". Open the POS to settle them.",
      "Open POS",
      "go:Point of Sale"
    ]);
  $("#ins").innerHTML = L.length
    ? L.map(
        ([c, ic, t, s, a, act]) =>
          `<div class="row"><span class="ri ${c}">${I(ic)}</span><div class="t"><b>${t}</b><span>${s}</span></div><button class="mini" data-a="${act}">${a}</button></div>`
      ).join("")
    : '<p style="color:var(--mute);text-align:center;padding:26px 0">Everything looks healthy.</p>';
}
$("#ins").onclick = e => {
  const a = e.target.dataset.a;
  if (!a) return;
  if (a === "req") boCan("inv.req") ? addReq() : boDenied();
  else if (a === "seed") {
    seed();
    bosave();
    all();
  } else go(a.slice(3));
};
let APPR = [],
  rq = 1;
const NOTES = () => {
  const L = [],
    n = lowCount();
  if (n)
    L.push({
      t: n + " ingredients are low",
      s: "Open Inventory to receive stock",
      ic: "box",
      c: "w"
    });
  if (orders.length)
    L.push({
      t: orders.length + " open orders",
      s: "Waiting to be charged at the POS",
      ic: "pos",
      c: "i"
    });
  if (APPR.length + apCount())
    L.push({
      t: APPR.length + apCount() + " approvals waiting",
      s: "Purchase orders, requisitions, issues and stock requests",
      ic: "check",
      c: "i"
    });
  return L.length ? L : [{ t: "All clear", s: "Nothing needs attention", ic: "check", c: "g" }];
};
function addReq() {
  const k = Object.keys(stock).sort((a, b) => stock[a] / RO[a] - stock[b] / RO[b])[0],
    q = RO[k] * 3;
  APPR.unshift({
    id: "REQ-" + String(rq++).padStart(4, "0"),
    t: "Stock request: " + ING[k],
    s: "Receive " + q + " · suggested from stock levels",
    ic: "swap",
    k,
    q
  });
  appr();
  toast("Request added to approvals");
}
$("#newreq").onclick = addReq;
function appr() {
  const docs = apHomeHTML();
  $("#apv").innerHTML =
    (APPR.length
      ? APPR.map(
          (a, i) =>
            `<div class="row"><span class="ri i">${I(a.ic)}</span><div class="t"><b>${esc(a.t)}</b><span>${a.id} · ${a.s}</span></div><div style="display:flex;gap:5px"><button class="mini ok" data-ap="${i}" data-d="1">Approve</button><button class="mini" data-ap="${i}" data-d="0">Reject</button></div></div>`
        ).join("")
      : "") +
    (docs ||
      (APPR.length
        ? ""
        : '<p style="color:var(--mute);text-align:center;padding:26px 0">All caught up. Nothing is waiting.</p>'));
  $("#apc").textContent = APPR.length + apCount() + apToIssue().length;
  // The approval popup, when opened from this panel.
  $("#apHome").innerHTML = view === "home" ? apModalIfOpen() : "";
  $("#nc").textContent = NOTES().filter(n => n.c !== "g").length;
  $("#nb").textContent = lowCount();
}
$("#apHome").onclick = e => {
  const b = e.target.closest("[data-a]");
  if (b && b.dataset.a.slice(0, 3) === "ap_") apAct(b.dataset.a.slice(3), b);
};
$("#apv").onclick = e => {
  if (!boCan("inv.approve")) return;
  const b = e.target.closest('[data-a^="ap_"]');
  if (b) return apAct(b.dataset.a.slice(3), b);
  const i = e.target.dataset.ap;
  if (i === undefined) return;
  const a = APPR.splice(+i, 1)[0],
    ok = e.target.dataset.d === "1";
  if (ok) {
    stock[a.k] += a.q;
    bosave();
  }
  toast(a.id + (ok ? " approved, stock received" : " rejected"));
  all();
};
function act() {
  const L = SALES.slice()
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);
  $("#act").innerHTML = L.length
    ? L.map(
        s =>
          `<div class="row"><span class="ri g">${I("pos")}</span><div class="t"><b>${s.ret ? `${esc(s.ret.by)} returned items from ${s.ret.of}` : `${esc(s.user)} completed ${s.no}`}</b><span>${KES(s.g)} · ${s.dept} · ${ago(s.at)}</span></div></div>`
      ).join("")
    : '<p style="color:var(--mute);text-align:center;padding:26px 0">No activity yet. Sales from the POS appear here.</p>';
}
// ---- management pages (shared with the POS) ----

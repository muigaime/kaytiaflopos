// ---- Audit log: who did what, when and from which computer, gathered from every record the system keeps ----
// Read only. Nothing here can change or remove an entry.
const AL_STEP = 200;
const alToday = () => ymdOf(new Date());
const alF = {
  from: alToday(),
  to: alToday(),
  nature: "All",
  who: "All",
  mod: "All",
  pri: "All",
  q: "",
  show: AL_STEP
};
const AL_PRI = {
  Void: "Critical",
  "Failed sign-in": "Critical",
  Reprint: "Important",
  Discount: "Important",
  Complimentary: "Important",
  Return: "Important",
  Swap: "Important",
  "Price change": "Important",
  Damage: "Important",
  "Stock take": "Important",
  "Cash payout": "Important",
  "Vendor payment": "Important",
  Staff: "Important",
  Store: "Important",
  "Selling point": "Important"
};
const AL_MOV = {
  RECEIVE: ["Goods received", "Purchasing", "received into"],
  ISSUE_OUT: ["Stock issued", "Inventory", "issued from"],
  TRANS_OUT: ["Stock transfer", "Inventory", "transferred from"],
  DAMAGE: ["Damage", "Inventory", "written off at"],
  ADJUST: ["Stock take", "Inventory", "adjusted at"],
  PROD_IN: ["Production", "Recipes & Production", "made at"],
  CONVERT: ["Stock conversion", "POS", "converted at"]
};
const alMs = v => (v ? new Date(v).getTime() : 0);
const alJoin = (...x) => x.filter(y => y !== "" && y !== null && y !== undefined).join(" · ");
/** Every event in the chosen dates, newest first. */
function alEvents() {
  const A = new Date(alF.from + "T00:00:00").getTime(),
    Z = new Date(alF.to + "T23:59:59.999").getTime(),
    out = [],
    add = (at, nature, text, who, mod, ref, pc, pri) => {
      const t = alMs(at);
      if (t >= A && t <= Z)
        out.push({
          at: t,
          nature,
          text,
          who: who || "System",
          mod,
          ref: ref || "",
          pc: pc || "",
          pri: pri || AL_PRI[nature] || "Normal"
        });
    };
  const bills = {};
  SALES.forEach(s => (bills[s.no] = bills[s.no] || []).push(s));
  Object.entries(bills).forEach(([no, S]) => {
    const a = S[0],
      total = S.reduce((x, s) => x + s.g, 0),
      paid = Object.keys(S.reduce((m, s) => Object.assign(m, s.mx || {}), {}))
        .filter(k => S.some(s => (s.mx || {})[k]))
        .map(payName)
        .join(" + "),
      place = [...new Set(S.map(s => s.dept))].join(", ");
    add(
      a.at,
      a.ret ? "Return" : a.dept === "Front Desk" ? "Front desk payment" : "Sale",
      alJoin(`Bill ${no}`, a.label, place, `KES ${m2(total)}`, paid),
      a.user,
      a.dept === "Front Desk" ? "Front Desk" : "POS",
      no,
      a.pc
    );
    if (S.some(s => s.comp))
      add(
        a.at,
        "Complimentary",
        alJoin(
          `Bill ${no}`,
          S.find(s => s.comp).comp.why,
          `by ${S.find(s => s.comp).comp.by || a.user}`
        ),
        a.user,
        "POS",
        no,
        a.pc
      );
  });
  BILLLOG.forEach(x => {
    const n =
      {
        ret: "Return",
        approve: "Approval",
        Handover: "Bill sent to cashier",
        Expired: "Bill expired"
      }[x.act] ||
      x.act ||
      "Bill change";
    if (n === "Return") return; // already listed from the sale itself
    add(
      x.at,
      n,
      alJoin(
        `Bill ${x.no}`,
        x.label,
        x.dept,
        x.detail,
        x.why,
        x.amt ? `KES ${m2(Math.abs(x.amt))}` : "",
        x.by && x.by !== x.user ? `authorised by ${x.by}` : ""
      ),
      x.user || x.by,
      "POS",
      x.no,
      x.pc
    );
  });
  MOV.forEach(m => {
    const k = AL_MOV[m.t];
    if (!k) return;
    add(
      m.at,
      k[0],
      alJoin(
        `${(itemInfo(m.k) || {}).name || m.k} ${qn(Math.abs(m.q))} ${(itemInfo(m.k) || {}).uom || ""}`.trim(),
        `${k[2]} ${m.loc}`,
        m.peer ? `to ${m.peer}` : "",
        m.note
      ),
      m.by,
      k[1],
      m.ref,
      m.pc
    );
  });
  DAYS.forEach(d => {
    add(
      d.openedAt,
      "Business day",
      `Day started · date ${dateGB(dayDate(d))}`,
      d.openedBy,
      "POS",
      d.id
    );
    if (d.closedAt)
      add(
        d.closedAt,
        "Business day",
        alJoin(`Day ended · date ${dateGB(dayDate(d))}`, `sales KES ${m2(d.gross || 0)}`),
        d.closedBy,
        "POS",
        d.id
      );
  });
  SHIFTS.forEach(s => {
    add(
      s.openedAt,
      "Shift",
      alJoin(`${s.user} started a shift`, `float KES ${m2(s.float || 0)}`),
      s.openedBy || s.user,
      "POS",
      s.id
    );
    if (s.closedAt)
      add(
        s.closedAt,
        "Shift",
        alJoin(`${s.user} ended a shift`, s.variance ? `cash variance KES ${m2(s.variance)}` : ""),
        s.closedBy || s.user,
        "POS",
        s.id,
        "",
        s.variance ? "Important" : ""
      );
  });
  PAYOUTS.forEach(p =>
    add(p.at, "Cash payout", alJoin(p.cat, p.desc, `KES ${m2(p.amt)}`), p.by || p.user, "POS", p.id)
  );
  VPAYS.forEach(p =>
    add(
      p.at || p.date,
      "Vendor payment",
      alJoin(p.vendorName || p.vendor || p.sup, `KES ${m2(p.amt || p.amount || 0)}`, p.note),
      p.by,
      "Vendors",
      p.id
    )
  );
  REQS.forEach(r =>
    add(
      r.at,
      "Requisition",
      alJoin(`${r.id}`, `${r.dept} asked ${r.store || STORES[0]}`, r.status),
      r.by,
      "Inventory",
      r.id
    )
  );
  LPOS.forEach(p =>
    add(
      p.at,
      "Purchase order",
      alJoin(`${p.id}`, p.sup, p.store, p.status),
      p.by,
      "Purchasing",
      p.id
    )
  );
  (FD_SETTINGS.auditTrail || []).forEach(x =>
    add(x.at, x.nature, x.text, x.who, x.mod, x.ref, x.pc, x.pri)
  );
  return out.sort((x, y) => y.at - x.at);
}
function alMatches(e) {
  const q = alF.q.trim().toLowerCase();
  return (
    (alF.nature === "All" || e.nature === alF.nature) &&
    (alF.who === "All" || e.who === alF.who) &&
    (alF.mod === "All" || e.mod === alF.mod) &&
    (alF.pri === "All" || e.pri === alF.pri) &&
    (!q || (e.ref + " " + e.text + " " + e.nature).toLowerCase().includes(q))
  );
}
const alBadge = e => `<span class="al-pri ${e.pri.toLowerCase()}">${e.pri}</span>`;
const alDay = t =>
  new Date(t).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
const alTime = t => new Date(t).toLocaleTimeString("en-GB");
function alBodyHTML() {
  const E = alEvents(),
    L = E.filter(alMatches),
    kpi = (l, v, c = "") => `<div class="sp-kpi ${c}"><span>${l}</span><b>${v}</b></div>`,
    shown = L.slice(0, alF.show);
  let day = "",
    rows = "";
  shown.forEach(e => {
    const d = alDay(e.at);
    if (d !== day) {
      day = d;
      rows += `<tr class="al-dayrow"><td colspan="7">${d} <small>${plural(L.filter(x => alDay(x.at) === d).length, "event")}</small></td></tr>`;
    }
    rows += `<tr class="al-row ${e.pri.toLowerCase()}"><td class="al-time">${alTime(e.at)}</td><td><span class="pr-cat" style="--h:${hue(e.nature)}">${esc(e.nature)}</span></td><td class="al-text">${esc(e.text)}</td><td>${esc(e.who)}</td><td>${esc(e.pc || "–")}</td><td>${esc(e.mod)}</td><td>${alBadge(e)}</td></tr>`;
  });
  return `<div class="sp-kpis al-kpis">${kpi("Events", L.length)}${kpi("Critical", L.filter(e => e.pri === "Critical").length, "crit")}${kpi("Important", L.filter(e => e.pri === "Important").length, "imp")}${kpi("People", new Set(L.map(e => e.who)).size)}</div>
  ${
    L.length
      ? `<div class="tw"><table class="t al-t"><tr><th>Time</th><th>Audit nature</th><th>What happened</th><th>User</th><th>Posted from</th><th>Module</th><th>Priority</th></tr>${rows}</table></div>${L.length > shown.length ? `<div class="al-more"><button class="mini" data-a="al_more">Show ${Math.min(AL_STEP, L.length - shown.length)} more of ${L.length - shown.length} left</button></div>` : ""}`
      : `<div class="empty">Nothing recorded for these dates and filters.</div>`
  }`;
}
function auditView() {
  const E = alEvents(),
    opt = (L, v, all) =>
      `<option value="All" ${v === "All" ? "selected" : ""}>${all}</option>${[
        ...new Set([...L, ...(v === "All" ? [] : [v])])
      ]
        .sort((a, b) => a.localeCompare(b))
        .map(x => `<option ${x === v ? "selected" : ""}>${esc(x)}</option>`)
        .join("")}`,
    range = [
      [0, "Today"],
      [6, "Last 7 days"],
      [29, "Last 30 days"]
    ],
    onR = n => alF.to === alToday() && alF.from === addDays(alToday(), -n),
    out = boCan("rep.print");
  return `<div class="pn al-panel"><div class="rp-filters al-filters"><label>From date<input type="date" data-al="from" value="${alF.from}"></label><label>To date<input type="date" data-al="to" value="${alF.to}"></label><label>Audit nature<select data-al="nature">${opt(
    E.map(e => e.nature),
    alF.nature,
    "All natures"
  )}</select></label><label>User<select data-al="who">${opt(
    E.map(e => e.who),
    alF.who,
    "All users"
  )}</select></label><label>Module<select data-al="mod">${opt(
    E.map(e => e.mod),
    alF.mod,
    "All modules"
  )}</select></label><label>Reference or word<input type="search" id="alQ" value="${esc(alF.q)}" placeholder="Bill no, item, name…" autocomplete="off"></label></div>
  <div class="rp-bar"><span class="pr-pills">${range.map(([n, l]) => `<button class="pr-pill ${onR(n) ? "on" : ""}" data-a="al_range" data-n="${n}">${l}</button>`).join("")}<span class="al-sep"></span>${["All", "Critical", "Important"].map(p => `<button class="pr-pill ${alF.pri === p ? "on" : ""}" data-a="al_pri" data-k="${p}">${p === "All" ? "All priorities" : p}</button>`).join("")}</span><span class="rp-tools">${out ? '<button class="mini xl-btn" data-a="al_xlsx">Export to Excel</button><button class="chip on" data-a="al_print">Print</button>' : ""}</span></div>
  <div id="alBody">${alBodyHTML()}</div></div>`;
}
V.audit = auditView;
function alRange() {
  return alF.from === alF.to ? dateGB(alF.from) : `${dateGB(alF.from)} to ${dateGB(alF.to)}`;
}
function alExportRows() {
  return alEvents()
    .filter(alMatches)
    .map(e => [
      new Date(e.at).toLocaleDateString("en-GB"),
      alTime(e.at),
      e.nature,
      e.text,
      e.who,
      e.pc || "-",
      e.mod,
      e.pri,
      e.ref
    ]);
}
function alAct(a, b) {
  if (a === "al_more") {
    alF.show += AL_STEP;
    $("#alBody").innerHTML = alBodyHTML();
    return;
  }
  if (a === "al_range") {
    alF.to = alToday();
    alF.from = addDays(alToday(), -+b.dataset.n);
  }
  if (a === "al_pri") alF.pri = b.dataset.k;
  if (a === "al_xlsx" || a === "al_print") {
    if (!boCan("rep.print")) return boDenied();
    const R = alExportRows(),
      C = [
        "Date",
        "Time",
        "Audit nature",
        "What happened",
        "User",
        "Posted from",
        "Module",
        "Priority",
        "Reference"
      ];
    if (!R.length) return toast("There is nothing to export for these filters.");
    if (a === "al_xlsx") {
      XLSX.download(
        {
          company: FD_SETTINGS.name,
          title: "Audit log",
          head: alRange(),
          by: xlsxBy(),
          sections: [{ t: "Audit log", c: C, r: R }]
        },
        `Audit_log_${alF.from}_to_${alF.to}`
      );
      return toast("Audit log exported to Excel.");
    }
    return stPrint(
      "Audit log",
      `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>Audit log</h2></div><div>${esc(alRange())} · ${R.length} events</div><table class="st-t"><thead><tr>${C.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${R.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table><div style="margin-top:14px">${esc(printedBy())}</div></div>`
    );
  }
  alF.show = AL_STEP;
  all();
}
document.addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.al;
  if (!k) return;
  alF[k] = e.target.value;
  if (alF.from > alF.to && k === "from") alF.to = alF.from;
  if (alF.from > alF.to && k === "to") alF.from = alF.to;
  alF.show = AL_STEP;
  all();
});
// The search filters as you type, without moving the cursor.
document.addEventListener("input", e => {
  if (e.target.id !== "alQ") return;
  alF.q = e.target.value;
  alF.show = AL_STEP;
  $("#alBody").innerHTML = alBodyHTML();
});

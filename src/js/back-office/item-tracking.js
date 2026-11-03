// ---- Inventory → Item tracking: one item's whole story, from when it was bought until now ----
const trk = { k: "", loc: "All", from: "", to: "", open: false };
const TRK_KINDS = {
  RECEIVE: ["Bought", "buy"],
  ISSUE_OUT: ["Issued", "move"],
  ISSUE_IN: ["Received by issue", "move"],
  TRANS_OUT: ["Transferred", "move"],
  TRANS_IN: ["Received by transfer", "move"],
  RETURN: ["Returned to supplier", "loss"],
  SALE: ["Sold", "sale"],
  SALE_RET: ["Returned by guests", "back"],
  DAMAGE: ["Damaged", "loss"],
  ADJUST: ["Stock take", "count"],
  PROD_IN: ["Made in production", "buy"],
  PROD_OUT: ["Used in production", "use"],
  CONVERT: ["Converted", "use"]
};
const trkDay = t => new Date(t).toLocaleDateString("en-GB");
const trkItems = () => pickKeys().sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name));
/** Between places the business still holds the stock, so the total doesn't change. */
const trkInternal = t => ["ISSUE_OUT", "ISSUE_IN", "TRANS_OUT", "TRANS_IN"].includes(t);
/** Every event, oldest first. Sales are added up per day and place, or they would bury everything else. */
function trkEvents() {
  const u = itemInfo(trk.k),
    all = trk.loc === "All",
    M = MOV.filter(m => m.k === trk.k && (all || m.loc === trk.loc))
      .filter(m => !(all && (m.t === "ISSUE_IN" || m.t === "TRANS_IN")))
      .slice()
      .sort((a, b) => a.at - b.at),
    out = [],
    days = {};
  M.forEach(m => {
    const [title, tone] = TRK_KINDS[m.t] || ["Stock change", "count"],
      delta = all && trkInternal(m.t) ? 0 : m.q;
    if (m.t === "SALE" || m.t === "SALE_RET") {
      const key = [m.t, trkDay(m.at), m.loc].join("|");
      if (days[key]) {
        days[key].q += m.q;
        days[key].delta += m.q;
        days[key].at = m.at;
        days[key].n++;
        return;
      }
      days[key] = {
        at: m.at,
        t: m.t,
        title,
        tone,
        q: m.q,
        delta: m.q,
        where: m.loc,
        by: "",
        ref: "",
        n: 1,
        sum: true
      };
      return out.push(days[key]);
    }
    const g = m.t === "RECEIVE" ? GRNS.find(x => x.id === m.ref) : null,
      line = g && g.lines.find(l => l.k === trk.k),
      cost = line && line.c > 0 ? line.c : 0;
    out.push({
      at: m.at,
      t: m.t,
      title,
      tone,
      q: m.q,
      delta,
      where: m.peer ? (m.q < 0 ? `${m.loc} to ${m.peer}` : `${m.peer} to ${m.loc}`) : m.loc,
      by: m.by || (g && g.by) || "",
      ref: m.ref || "",
      from: g ? g.sup || "Cash purchase" : "",
      cost,
      note: m.note && m.note !== "POS" ? m.note : "",
      uom: u.uom
    });
  });
  const now = all ? LOCS.reduce((a, l) => a + have(l, trk.k), 0) : have(trk.loc, trk.k);
  let bal = now;
  for (let i = out.length - 1; i >= 0; i--) {
    out[i].bal = bal;
    bal -= out[i].delta;
  }
  return { E: out, now, opening: Math.abs(bal) > 1e-9 ? bal : 0 };
}
const trkInRange = e => {
  const d = ymdOf(e.at);
  return (!trk.from || d >= trk.from) && (!trk.to || d <= trk.to);
};
const trkDetail = e =>
  [
    e.from ? `from ${e.from}` : "",
    e.where,
    e.cost ? `at KES ${m2(e.cost)} each` : "",
    e.sum ? `${plural(e.n, e.t === "SALE" ? "sale" : "return")} that day` : "",
    e.note,
    e.ref ? `Ref ${e.ref}` : "",
    e.by ? `by ${e.by}` : ""
  ]
    .filter(Boolean)
    .join(" · ");
function trkPicker() {
  const u = trk.k ? itemInfo(trk.k) : null;
  return `<label class="trk-pick"><span>Item</span><div class="sf-dd"><button class="sf-dd-btn" id="trkBtn" data-a="trk_open" aria-expanded="${trk.open}"><span>${u ? esc(u.name) : "Choose an item"}</span><i>${u ? esc(u.code || "") : ""}</i><b aria-hidden="true">▾</b></button>${
    trk.open
      ? `<div class="sf-panel"><input id="trkFind" type="search" placeholder="Search item name or code" aria-label="Search item" autocomplete="off"><div class="sf-list">${trkItems()
          .map(k => {
            const x = itemInfo(k);
            return `<button class="sf-opt ${k === trk.k ? "on" : ""}" data-a="trk_pick" data-k="${esc(k)}" data-find="${esc((x.name + " " + (x.code || "")).toLowerCase())}"><span>${esc(x.name)}</span><i>${esc(x.code || "")}</i></button>`;
          })
          .join("")}<div class="sf-none" hidden>No item by that name.</div></div></div>`
      : ""
  }</div></label>`;
}
function itemTrackHTML() {
  const keys = trkItems();
  if (!trk.k || !keys.includes(trk.k))
    trk.k = keys.find(k => MOV.some(m => m.k === k)) || keys[0] || "";
  const top = `<div class="pn trk-top"><div class="rp-filters">${trkPicker()}<label>Place<select data-trk="loc"><option value="All">All places</option>${LOCS.map(l => `<option ${l === trk.loc ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label><label>From<input type="date" data-trk="from" value="${trk.from}"></label><label>To<input type="date" data-trk="to" value="${trk.to}"></label></div>${trk.from || trk.to ? '<button class="mini" data-a="trk_alltime">Show the whole history</button>' : ""}</div>`;
  if (!trk.k) return top + '<div class="pn"><div class="empty">No stock items yet.</div></div>';
  const u = itemInfo(trk.k),
    { E, now, opening } = trkEvents(),
    S = E.filter(trkInRange),
    q = t => E.filter(e => t.includes(e.t)).reduce((a, e) => a + Math.abs(e.q), 0),
    first = E.find(e => e.t === "RECEIVE" || e.t === "PROD_IN"),
    kpi = (l, v, c = "") => `<div class="sp-kpi ${c}"><span>${l}</span><b>${v}</b></div>`,
    fq2 = n => `${qn(n)} ${esc(u.uom)}`,
    places = LOCS.filter(l => Math.abs(have(l, trk.k)) > 1e-9),
    most = Math.max(1, ...places.map(l => Math.abs(have(l, trk.k)))),
    products = ITEMS.filter(i => (i.r || {})[trk.k]);
  return `${top}
  <div class="pn trk-hero"><div class="trk-who"><h3>${esc(u.name)}</h3><p>${[u.code ? `Code ${esc(u.code)}` : "", esc(u.group || ""), `Cost KES ${m2(cst(trk.k))} per ${esc(u.uom)}`].filter(Boolean).join(" · ")}</p><p>${first ? `First ${first.t === "RECEIVE" ? "bought" : "made"} ${dm(first.at)} ${new Date(first.at).getFullYear()}${first.from ? ` from ${esc(first.from)}` : ""}` : "No purchase on record"}${products.length ? ` · Sold as ${products.map(i => `${esc(i.n)} at ${esc(i.d)}`).join(", ")}` : ""}</p></div>
  <span class="inv-btns"><button class="mini xl-btn" data-a="trk_xlsx">Export to Excel</button><button class="chip on" data-a="trk_print">Print report</button></span></div>
  <div class="sp-kpis trk-kpis">${kpi("Bought or made", fq2(q(["RECEIVE", "PROD_IN"])))}${kpi("Sold", fq2(q(["SALE"]) - q(["SALE_RET"])))}${kpi("Damaged", fq2(q(["DAMAGE"])), q(["DAMAGE"]) ? "crit" : "")}${kpi(trk.loc === "All" ? "On hand now" : `At ${esc(trk.loc)} now`, fq2(now), "trk-now")}${kpi("Worth now", `KES ${m2(now * cst(trk.k))}`)}</div>
  ${
    trk.loc === "All" && places.length
      ? `<div class="pn"><h4>Where it is now</h4><div class="trk-places">${places.map(l => `<div class="trk-place"><span>${esc(l)}</span><div class="trk-bar"><i style="width:${Math.max(3, (Math.abs(have(l, trk.k)) / most) * 100)}%"></i></div><b>${fq2(have(l, trk.k))}</b></div>`).join("")}</div></div>`
      : ""
  }
  <div class="pn"><h4>Its journey</h4>${
    S.length || opening
      ? `<ol class="trk-line">${
          opening && !trk.from
            ? `<li class="trk-ev count"><div class="trk-when"><b>Start</b></div><div class="trk-card"><b>Opening balance</b><span>Stock held before this history begins</span></div><div class="trk-bal"><small>Balance</small><b>${fq2(opening)}</b></div></li>`
            : ""
        }${S.map(e => `<li class="trk-ev ${e.tone}"><div class="trk-when"><b>${trkDay(e.at)}</b><small>${e.sum ? "" : hm(e.at)}</small></div><div class="trk-card"><b>${esc(e.title)} <em>${e.q > 0 ? "+" : "−"}${qn(Math.abs(e.q))} ${esc(u.uom)}</em></b><span>${esc(trkDetail(e))}</span></div><div class="trk-bal"><small>Balance</small><b>${fq2(e.bal)}</b></div></li>`).join("")}${
          trk.to
            ? ""
            : `<li class="trk-ev now"><div class="trk-when"><b>Today</b></div><div class="trk-card"><b>${trk.loc === "All" ? "On hand now" : `At ${esc(trk.loc)} now`}</b></div><div class="trk-bal"><small>Balance</small><b>${fq2(now)}</b></div></li>`
        }</ol>`
      : '<div class="empty">Nothing recorded for this item, place and these dates.</div>'
  }</div>`;
}
function trkRows() {
  const u = itemInfo(trk.k),
    { E } = trkEvents();
  return E.filter(trkInRange).map(e => [
    trkDay(e.at),
    e.sum ? "" : hm(e.at),
    e.title,
    trkDetail(e),
    `${e.q > 0 ? "+" : "-"}${qn(Math.abs(e.q))}`,
    qn(e.bal),
    u.uom
  ]);
}
function trkAct(a, b) {
  if (a === "trk_open") {
    trk.open = !trk.open;
    all();
    if (trk.open && matchMedia("(hover: hover)").matches) $("#trkFind").focus();
    return;
  }
  if (a === "trk_pick" || a === "trk_go") {
    trk.k = b.dataset.k;
    trk.open = false;
    if (a === "trk_go") {
      invT = "track";
      trk.loc = "All";
      trk.from = trk.to = "";
    }
    return all();
  }
  if (a === "trk_alltime") {
    trk.from = trk.to = "";
    return all();
  }
  if (a === "trk_print" || a === "trk_xlsx") {
    if (!boCan("rep.print")) return boDenied();
    const R = trkRows(),
      u = itemInfo(trk.k),
      C = ["Date", "Time", "Event", "Details", "#Quantity", "#Balance", "Unit"],
      head = `${u.name}${trk.loc === "All" ? "" : ` at ${trk.loc}`} · on hand ${qn(trkEvents().now)} ${u.uom}`;
    if (!R.length) return toast("There is nothing to print for these dates.");
    if (a === "trk_xlsx") {
      XLSX.download(
        {
          company: FD_SETTINGS.name,
          title: "Item tracking",
          head,
          by: xlsxBy(),
          sections: [{ t: u.name, c: C, r: R }]
        },
        `Item_tracking_${u.name}_${ymdOf(new Date())}`
      );
      return toast("Item tracking exported to Excel.");
    }
    return stPrint(
      `Item tracking · ${u.name}`,
      `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>Item tracking report</h2></div><div><b>${esc(head)}</b></div><table class="st-t" style="margin-top:10px"><thead><tr>${C.map(h => `<th${h[0] === "#" ? ' class="n"' : ""}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${R.map(r => `<tr>${r.map((v, i) => `<td${C[i][0] === "#" ? ' class="n"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table><div style="margin-top:14px">${esc(printedBy())}</div></div>`,
      "A4 portrait"
    );
  }
}
document.addEventListener("input", e => {
  if (e.target.id !== "trkFind") return;
  const q = e.target.value.trim().toLowerCase(),
    box = e.target.closest(".sf-panel"),
    O = [...box.querySelectorAll(".sf-opt")];
  O.forEach(b => (b.hidden = !!q && !q.split(/\s+/).every(w => b.dataset.find.includes(w))));
  box.querySelector(".sf-none").hidden = O.some(b => !b.hidden);
});
document.addEventListener("keydown", e => {
  if (e.target.id !== "trkFind") return;
  if (e.key === "Enter") {
    e.preventDefault();
    const b = e.target.closest(".sf-panel").querySelector(".sf-opt:not([hidden])");
    if (b) b.click();
  }
  if (e.key === "Escape") {
    e.stopPropagation();
    trk.open = false;
    all();
  }
});
document.addEventListener("click", e => {
  if (trk.open && !e.target.closest(".trk-pick")) {
    trk.open = false;
    all();
  }
});
document.addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.trk;
  if (!k) return;
  trk[k] = e.target.value;
  all();
});

// ---- merging and splitting: all bills on one side, the bill they go into on the other ----
// The waiter opens the new bill (New sale, then Send order with no items). Whoever may see all bills then
// moves single items across (a split) or whole bills (a merge). Nothing changes until Apply is pressed.
const TR_SHOW = 80;
let tr = null;
const trBillsAll = () => {
  const by = USERS.find(u => u.n === bopt.by) || user;
  return billsFor(by, by.d).sort((a, b) => b.no.localeCompare(a.no, undefined, { numeric: true }));
};
const trFind = no => orders.find(o => o.no === no);
const trHit = (o, w) =>
  !w || [o.no, o.ord, o.label, o.waiter, o.guest, o.room].join(" ").toLowerCase().includes(w);
/** A bill as it will be after the moves waiting to be applied. */
const trLeft = o => {
  const L = { ...o.lines };
  Object.entries(tr.moved[o.no] || {}).forEach(([id, q]) => {
    L[id] -= q;
    if (L[id] <= 0) delete L[id];
  });
  return L;
};
function trOpen() {
  const S = boptScope || [];
  tr = {
    q: "",
    t: "",
    // Highlighted in Select: the first one ticked stays, and the next moves into it.
    src: S[1] ? S[1].no : S[0] ? S[0].no : "",
    target: S[1] ? S[0].no : "",
    moved: {}
  };
  boptEl("Box").classList.remove("bop-void", "bop-split");
  boptEl("Box").classList.add("bop-tr");
  boptEl("Body").innerHTML =
    `<h3>${bopt.act === "merge" ? "Merge bills" : "Split bill"}</h3><p class="stk">Choose a bill on the left and the bill it goes into on the right, then move items or the whole bill. Authorized by ${slipEsc(bopt.by)}.</p>
  <div class="tr-pair"><div class="tr-p"><div class="tr-h"><b>All bills</b><input id="trQ" placeholder="Search bill number, table or waiter" autocomplete="off"></div><div class="tr-l" id="trL"></div></div>
  <div class="tr-p tr-to"><div id="trR"></div></div></div>
  <div class="tr-sum" id="trSum"></div><div class="bop-msg" id="bopMsg"></div>
  <div class="row"><button class="mini" data-close>Cancel</button><button class="chip on" data-bg="save">Apply</button></div>`;
  trDraw();
  $("#trQ").focus();
}
function trDraw() {
  trLeftList();
  trRightSide();
  trSummary();
}
const trRow = (o, attr, on) => {
  const n = Object.keys(trLeft(o)).length;
  return `<button class="tr-b ${on ? "on" : ""} ${o.printed ? "printed" : ""} ${o.billCopies ? "rep" : ""} ${attr === "data-trt" && !Object.keys(o.lines).length ? "fresh" : ""}" ${attr}="${slipEsc(o.no)}"><b>${slipEsc(o.no)}</b><span>${slipEsc(o.label)}<small>${slipEsc(o.waiter || "No waiter")}${o.ord ? " · Order " + slipEsc(o.ord) : ""}</small></span>${Object.keys(o.lines).length ? `<em>${KES(totals(trLeft(o), o).g)}</em>` : `<em>Empty${emptyTag(o)}</em>`}${n === 0 && Object.keys(o.lines).length ? "<i>All moved</i>" : ""}</button>`;
};
function trLeftList() {
  const w = tr.q.trim().toLowerCase(),
    // An empty bill has nothing to move, so it only belongs on the right.
    all = trBillsAll().filter(
      o => o.no !== tr.target && Object.keys(o.lines).length && trHit(o, w)
    ),
    L = all.slice(0, TR_SHOW);
  $("#trL").innerHTML =
    L.map(o => {
      const open = o.no === tr.src,
        left = trLeft(o),
        ids = Object.keys(left);
      return (
        trRow(o, "data-trs", open) +
        (open
          ? `<div class="tr-items">${
              ids
                .map(
                  id =>
                    `<div class="tr-i"><button class="tr-m" data-trm="${id}"><b>${left[id]}</b><span>${slipEsc(get(id).n)}</span><i>→</i></button>${left[id] > 1 ? `<button class="tr-all" data-tra="${id}">All</button>` : ""}</div>`
                )
                .join("") ||
              `<div class="tr-e">${Object.keys(o.lines).length ? "Everything on this bill is moving." : "This bill has no items."}</div>`
            }${ids.length ? '<button class="tr-whole" data-trw>Move the whole bill →</button>' : ""}</div>`
          : "")
      );
    }).join("") || '<div class="tr-e">No bills match this search.</div>';
  if (all.length > L.length)
    $("#trL").insertAdjacentHTML(
      "beforeend",
      `<div class="tr-e">Showing the latest ${L.length} of ${all.length}. Search for a bill number to find the rest.</div>`
    );
}
function trRightSide() {
  const T = trFind(tr.target);
  if (!T) {
    $("#trR").innerHTML =
      `<div class="tr-h"><b>Bill to move into</b><input id="trT" value="${slipEsc(tr.t)}" placeholder="Search the new bill's number" autocomplete="off"></div><div class="tr-l" id="trTL"></div>`;
    return trTargetList();
  }
  const own = Object.entries(T.lines),
    moved = Object.entries(tr.moved).flatMap(([no, L]) =>
      Object.entries(L).map(([id, q]) => ({ no, id, q }))
    ),
    all = { ...T.lines };
  moved.forEach(m => (all[m.id] = (all[m.id] || 0) + m.q));
  $("#trR").innerHTML =
    `<div class="tr-h"><b>${slipEsc(T.no)} · ${slipEsc(T.label)}</b><small>${slipEsc(T.waiter || "No waiter")}${T.ord ? " · Order " + slipEsc(T.ord) : ""}</small><button class="tr-change" data-trc>Change bill</button></div>
  <div class="tr-l">${own.map(([id, q]) => `<div class="tr-own"><b>${q}</b><span>${slipEsc(get(id).n)}</span><small>On this bill</small></div>`).join("")}${
    moved
      .map(
        m =>
          `<button class="tr-m back" data-trb="${slipEsc(m.no)}" data-id="${m.id}"><b>${m.q}</b><span>${slipEsc(get(m.id).n)}<small>From ${slipEsc(m.no)}</small></span><i>←</i></button>`
      )
      .join("") ||
    (own.length ? "" : '<div class="tr-e">This bill is empty. Move items here from the left.</div>')
  }</div>
  <div class="tr-t"><span>Bill total</span><b>${KES(totals(all, T).g)}</b></div>`;
}
function trTargetList() {
  const w = tr.t.trim().toLowerCase(),
    all = trBillsAll().filter(o => o.no !== tr.src && trHit(o, w)),
    E = all.filter(o => !Object.keys(o.lines).length),
    F = all.filter(o => Object.keys(o.lines).length).slice(0, Math.max(0, TR_SHOW - E.length));
  $("#trTL").innerHTML = `<div class="tr-sec">Empty bills, ready to use</div>${
    E.map(o => trRow(o, "data-trt", false)).join("") ||
    `<div class="tr-e">${w ? "No empty bill matches this search." : "No empty bills yet. Ask the waiter to press New sale, then Open empty bill."}</div>`
  }${F.length ? `<div class="tr-sec">Other open bills</div>${F.map(o => trRow(o, "data-trt", false)).join("")}` : ""}`;
  const hidden = all.length - E.length - F.length;
  if (hidden > 0)
    $("#trTL").insertAdjacentHTML(
      "beforeend",
      `<div class="tr-e">${hidden} more bills. Search for the bill number.</div>`
    );
}
function trSummary() {
  const n = Object.values(tr.moved).reduce(
    (a, L) => a + Object.values(L).reduce((x, q) => x + q, 0),
    0
  );
  $("#trSum").textContent = !n
    ? "Nothing moved yet."
    : `${n} item${n > 1 ? "s" : ""} from ${Object.keys(tr.moved).length} bill${Object.keys(tr.moved).length > 1 ? "s" : ""} will move into ${tr.target || "the bill you choose"}.`;
}
function trMove(id, q) {
  if (!tr.target) return boptMsg("Choose the bill to move into first.");
  const L = (tr.moved[tr.src] = tr.moved[tr.src] || {});
  L[id] = (L[id] || 0) + q;
  boptMsg("");
  trDraw();
}
/** Discounts, price lists and currency belong to a bill, so a move can't quietly change a price. */
const trTerms = o =>
  JSON.stringify([o.pl && o.pl.n, o.cur && o.cur.c, o.disc && [o.disc.type, o.disc.v]]);
function trSave() {
  const T = trFind(tr.target),
    S = Object.keys(tr.moved)
      .filter(no => Object.keys(tr.moved[no]).length)
      .map(trFind);
  if (!T) return boptMsg("Choose the bill to move into.");
  if (!S.length) return boptMsg("Move at least one item first.");
  const wholeOf = o => !Object.keys(trLeft(o)).length,
    empty = !Object.keys(T.lines).length;
  // An empty new bill takes on the terms of the only bill moving into it.
  const adopt = empty && S.length === 1 ? S[0] : null;
  if (adopt && adopt.disc && adopt.disc.type === "amt" && !wholeOf(adopt))
    return boptMsg("Remove the KES discount first, or move the whole bill.");
  const others = adopt ? [] : S;
  if (others.some(o => trTerms(o) !== trTerms(T)))
    return boptMsg(
      "These bills have different discounts, price lists or currencies. Make them the same first."
    );
  if (adopt) {
    T.pl = adopt.pl;
    T.cur = adopt.cur;
    T.disc = adopt.disc;
  }
  let merged = 0,
    split = 0;
  S.forEach(o => {
    const M = tr.moved[o.no],
      whole = wholeOf(o),
      value = totals(M, o).g,
      was = `${o.label} (${o.no}, ${o.waiter})`,
      items = Object.entries(M)
        .map(([id, q]) => `${q} ${get(id).n}`)
        .join(", "),
      points = [...new Set([...billPoints(o.lines), ...billPoints(T.lines)])];
    Object.entries(M).forEach(([id, q]) => {
      T.lines[id] = (T.lines[id] || 0) + q;
      if (q >= o.lines[id]) delete o.lines[id];
      else o.lines[id] -= q;
    });
    if (whole) {
      const c = parseInt(T.covers, 10) || 0,
        d = parseInt(o.covers, 10) || 0;
      if (c || d) T.covers = String(c + d);
      T.guest = T.guest || o.guest;
      T.room = T.room || o.room;
      T.rider = T.rider || o.rider;
      T.rounds = Math.max(T.rounds, o.rounds);
      orders.splice(orders.indexOf(o), 1);
      if (cur === o) cur = null;
      boptLog("Merge", T, "", "Merged " + was);
      merged++;
    } else {
      boptLog("Split", o, "", `Moved to ${T.no} ${T.label}: ${items}`, -value, { points });
      split++;
    }
  });
  boptDone(
    `${T.label} is now ${KES(totals(T.lines, T).g)}.${merged ? ` ${merged} bill${merged > 1 ? "s" : ""} merged.` : ""}${split ? ` ${split} bill${split > 1 ? "s" : ""} split.` : ""}${S.some(o => o.waiter !== T.waiter) ? ` It stays with ${T.waiter}.` : ""}`
  );
}
$("#mBopt").addEventListener("input", e => {
  if (e.target.id === "trQ") {
    tr.q = e.target.value;
    trLeftList();
  }
  if (e.target.id === "trT") {
    tr.t = e.target.value;
    trTargetList();
  }
});
$("#mBopt").addEventListener("click", e => {
  if (!tr || !bopt) return;
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.trs !== undefined) {
    tr.src = tr.src === d.trs ? "" : d.trs;
    return trDraw();
  }
  if (d.trt !== undefined) {
    tr.target = d.trt;
    tr.moved[tr.target] = undefined;
    delete tr.moved[tr.target];
    if (tr.src === tr.target) tr.src = "";
    return trDraw();
  }
  if (d.trc !== undefined) {
    tr.target = "";
    tr.moved = {};
    return trDraw();
  }
  if (d.trm !== undefined) return trMove(d.trm, 1);
  if (d.tra !== undefined) return trMove(d.tra, trLeft(trFind(tr.src))[d.tra]);
  if (d.trw !== undefined) {
    if (!tr.target) return boptMsg("Choose the bill to move into first.");
    const o = trFind(tr.src);
    tr.moved[o.no] = { ...o.lines };
    return trDraw();
  }
  if (d.trb !== undefined) {
    const L = tr.moved[d.trb];
    L[d.id]--;
    if (L[d.id] <= 0) delete L[d.id];
    if (!Object.keys(L).length) delete tr.moved[d.trb];
    return trDraw();
  }
});

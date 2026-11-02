// ---- Bill options: discount, void, merge, split ----
// Every option needs a Manager or Super Cashier: signed in, or typing their PIN. Each change goes in BILLLOG
// (Reports → Bill Options Log) with who authorized it and why. Only open bills can change; paid ones cannot.
const BILLLOG = [];
const BILL_AUTH = ["Manager", "Super Cashier"];
const BOPT = {
  disc: [
    "Apply discount",
    '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'
  ],
  void: ["Void items", '<path d="M6 6l12 12M18 6 6 18"/>'],
  merge: [
    "Merge bills",
    '<path d="M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3"/><path d="M12 5v14"/>'
  ],
  split: ["Split bill", '<path d="M9 12H3M6 9l-3 3 3 3M15 12h6M18 9l3 3-3 3"/><path d="M12 5v14"/>']
};
let bopt = null, // { act, by, bill, ...form }
  boptScope = null, // bills highlighted in Select: the options work on these
  boptFails = 0,
  boptLock = 0;
const boptEl = id => $("#bop" + id);
const billHas = () => Object.keys(cart).length > 0;
/** The sale on the guest check, as a bill. */
const draftBill = () => ({
  draft: true,
  no: $("#fBill").value,
  label: $("#fTable").value || "This sale",
  guest: $("#fGuest").value,
  covers: $("#fCov").value,
  room: $("#fRoom").value,
  dept: billPlace(cart),
  lines: cart
});
const billAdj = b => (b.draft ? cartAdj : b);
const billTot = b => totals(b.lines, billAdj(b));
function boptLog(act, b, why, detail, amt, extra) {
  BILLLOG.push({
    at: new Date().toISOString(),
    act,
    no: b.no,
    label: b.label,
    dept: b.dept,
    waiter: b.waiter || (user ? user.n : ""),
    by: bopt.by,
    user: user ? user.n : "",
    why: why || "",
    detail: detail || "",
    amt: amt === undefined ? billTot(b).g : amt,
    points: billPoints(b.lines),
    ...extra
  });
  if (BILLLOG.length > 3000) BILLLOG.splice(0, BILLLOG.length - 3000);
}
function boptDone(msg) {
  try {
    bosave();
  } catch (e) {}
  bopt = null;
  $("#mBopt").classList.remove("show");
  drawCart();
  if ($("#mSel").classList.contains("show")) selRender();
  fsNote(msg);
}

// ---------------------------------------------------------------- the circle
$("#billBtn").onclick = () => boptWheel(null);
function boptWheel(scope) {
  boptScope = scope;
  boptEl("Box").classList.remove("bop-void", "bop-split");
  const K = Object.keys(BOPT);
  bopt = null;
  $("#bopWheel").innerHTML =
    K.map((k, i) => {
      const a = (-90 + (360 / K.length) * i) * (Math.PI / 180);
      return `<button class="bw-i" data-bo="${k}" style="left:${(50 + 33 * Math.cos(a)).toFixed(2)}%;top:${(50 + 33 * Math.sin(a)).toFixed(2)}%"><i class="bw-ic"><svg viewBox="0 0 24 24">${BOPT[k][1]}</svg></i><span>${BOPT[k][0]}</span></button>`;
    }).join("") +
    '<div class="bw-t">Bill options</div><button class="bw-c" data-close aria-label="Close">✕</button>' +
    (scope ? `<div class="bw-for">${scope.map(o => slipEsc(o.label)).join(", ")}</div>` : "");
  $("#bopWheel").style.display = "";
  boptEl("Box").style.display = "none";
  $("#mBopt").classList.add("show");
}
/** Bills an option can work on. */
function boptBills(act) {
  if (boptScope && act !== "merge") return boptScope.filter(o => orders.includes(o));
  const L = visOrders();
  return act === "merge" || act === "split" || !billHas() || cur ? L : [draftBill(), ...L];
}
function boptStart(act) {
  if (!boptScope && cur && billHas()) return fsNote("Send the new items first.");
  const L = boptBills(act);
  if (act === "merge") {
    if (orders.length < 2) return fsNote("Merging needs two open bills.");
  } else if (!L.length)
    return fsNote("There is no bill to change. Add items or send an order first.");
  bopt = { act };
  $("#bopWheel").style.display = "none";
  boptEl("Box").style.display = "";
  if (user && BILL_AUTH.includes(user.role)) {
    bopt.by = user.n;
    return boptChoose();
  }
  boptEl("Body").innerHTML =
    `<h3>${BOPT[act][0]}</h3><p class="stk">A Manager or Super Cashier needs to authorize this.</p>
  <input id="bopPin" type="password" inputmode="numeric" autocomplete="off" placeholder="Authorizing PIN"><div class="bop-msg" id="bopMsg"></div>
  <div class="row"><button class="mini" data-close>Cancel</button><button class="chip on" data-bg="auth">Continue</button></div>`;
  $("#bopPin").focus();
}
function boptAuth() {
  const m = $("#bopMsg");
  if (Date.now() < boptLock) return (m.textContent = "Too many tries. Wait 30 seconds.");
  const u = USERS.find(x => BILL_AUTH.includes(x.role) && x.pin === $("#bopPin").value);
  if (!u) {
    $("#bopPin").value = "";
    $("#bopPin").focus();
    if (++boptFails >= 5) {
      boptLock = Date.now() + 3e4;
      boptFails = 0;
    }
    return (m.textContent = "That PIN cannot authorize this.");
  }
  boptFails = 0;
  bopt.by = u.n;
  boptChoose();
}
function boptChoose() {
  if (bopt.act === "merge") return boptMergeForm();
  const L = boptBills(bopt.act);
  if (L.length === 1) return boptOpen(L[0]);
  boptEl("Body").innerHTML =
    `<h3>${BOPT[bopt.act][0]}</h3><p class="stk">Which bill?</p><div class="bop-list">${L.map(
      (b, i) =>
        `<button class="bop-b" data-bb="${i}"><span><b>${slipEsc(b.label)}</b> · ${slipEsc(b.dept)}<small>${b.draft ? "Not sent yet" : slipEsc(b.no)} · ${cnt(b.lines)} items</small></span><b>${KES(billTot(b).g)}</b></button>`
    ).join("")}</div><div class="row"><button class="mini" data-close>Cancel</button></div>`;
}
function boptOpen(b) {
  bopt.bill = b;
  ({
    disc: boptDiscForm,
    void: boptVoidForm,
    split: boptSplitForm
  })[bopt.act]();
}
const boptTop = () =>
  `<h3>${BOPT[bopt.act][0]}</h3><p class="stk"><b>${slipEsc(bopt.bill.label)}</b> · ${slipEsc(bopt.bill.dept)} · ${slipEsc(bopt.bill.no)} · authorized by ${slipEsc(bopt.by)}</p>`;
const boptFoot = lbl =>
  `<div class="bop-msg" id="bopMsg"></div><div class="row"><button class="mini" data-close>Cancel</button><button class="chip on" data-bg="save">${lbl}</button></div>`;
const boptMsg = t => void ($("#bopMsg").textContent = t);
/** Cooked food can't go back on the shelf, so kitchens and restaurants default to no. */
const boptBackDefault = b =>
  Object.keys(b.lines).every(
    id => !["Kitchen", "Restaurant"].includes((OUTLET_INFO[get(id).d] || {}).type)
  );

// ---------------------------------------------------------------- discount
function boptDiscForm() {
  const a = billAdj(bopt.bill).disc;
  bopt.type = bopt.type || (a ? a.type : "pct");
  boptEl("Body").innerHTML = `${boptTop()}
  <div class="tabs"><button class="chip ${bopt.type === "pct" ? "on" : ""}" data-bt="pct">Percent</button><button class="chip ${bopt.type === "amt" ? "on" : ""}" data-bt="amt">KES amount</button></div>
  <label>${bopt.type === "pct" ? "Discount (%)" : "Discount (KES)"}<input id="bopVal" type="number" min="0" step="any" value="${a && a.type === bopt.type ? a.v : ""}" placeholder="0 removes the discount"></label>
  <label>Reason<input id="bopWhy" value="${slipEsc(a ? a.why : "")}" placeholder="e.g. Loyal guest"></label>
  <div class="status" id="bopSum"></div>${boptFoot("Apply")}`;
  boptDiscSum();
}
const boptDiscValue = () => ({ type: bopt.type, v: parseFloat(boptEl("Val").value) || 0 });
function boptDiscSum() {
  const b = bopt.bill,
    d = boptDiscValue(),
    t = totals(b.lines, { ...billAdj(b), disc: d.v > 0 ? d : null });
  boptEl("Sum").textContent = `${KES(t.sub)} − ${KES(t.disc)} = ${KES(t.g)}`;
}
function boptDiscSave() {
  const b = bopt.bill,
    d = boptDiscValue(),
    why = boptEl("Why").value.trim(),
    sub = totals(b.lines, { ...billAdj(b), disc: null }).sub,
    raw = parseFloat(boptEl("Val").value);
  if (!d.v && !billAdj(b).disc && !(raw < 0)) return boptMsg("Enter the discount.");
  if (raw < 0) return boptMsg("The discount cannot be below zero.");
  if (d.type === "pct" && d.v > 100) return boptMsg("A discount cannot be more than 100%.");
  if (d.type === "amt" && d.v > sub)
    return boptMsg(`A discount cannot be more than the bill (${KES(sub)}).`);
  if (d.v > 0 && !why) return boptMsg("Enter the reason for the discount.");
  const A = billAdj(b),
    before = billTot(b).g;
  A.disc = d.v > 0 ? { ...d, why, by: bopt.by } : null;
  const t = billTot(b);
  boptLog(
    d.v > 0 ? "Discount" : "Discount removed",
    b,
    why,
    d.v > 0 ? (d.type === "pct" ? d.v + "%" : "KES " + bill2(d.v)) : "",
    t.g - before
  );
  boptDone(
    d.v > 0
      ? `Discount applied. ${b.label} is now ${KES(t.g)}.`
      : `Discount removed from ${b.label}.`
  );
}

// ---------------------------------------------------------------- void
const VOID_REASONS = [
  "Customer changed",
  "Item spoilt",
  "Item not available",
  "Price error on system",
  "Wrong order",
  "Double entry",
  "Erroneous entry",
  "Goods returned"
];
function boptVoidForm() {
  const b = bopt.bill;
  bopt.vq = Object.fromEntries(Object.keys(b.lines).map(id => [id, 0]));
  boptEl("Box").classList.add("bop-void");
  boptEl("Body").innerHTML = `${boptTop()}
  <div class="bv-wrap"><table class="bv-t"><thead><tr><th>Selected</th><th>Code</th><th>Description</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Total</th></tr>
  <tr class="bv-f"><td colspan="6"><input id="bopVF" placeholder="Filter items" autocomplete="off"></td></tr></thead><tbody id="bopVRows"></tbody></table></div>
  <div class="bv-sum"><label class="bop-c"><input type="checkbox" id="bopVAll"> Select all</label><div id="bopVSum"></div></div>
  <div class="bv-rs">${VOID_REASONS.map(r => `<button class="bv-r" data-vw="${r}">${r}</button>`).join("")}</div>
  <label>Void reason<textarea id="bopWhy" rows="2" placeholder="Tap a reason above or type your own"></textarea></label>
  ${b.draft ? "" : `<label class="bop-c"><input type="checkbox" id="bopBack" ${boptBackDefault(b) ? "checked" : ""}> Return voided items to stock</label>`}
  <div class="bop-msg" id="bopMsg"></div>
  <div class="bv-go"><button class="bv-void" data-bg="save">Void items</button><button class="bv-close" data-close>Close</button></div>`;
  boptVoidRows();
}
/** What stays on the bill once the ticked quantities are gone. */
const boptVoidLeft = () => {
  const L = { ...bopt.bill.lines };
  Object.entries(bopt.vq).forEach(([id, q]) => {
    if (q >= L[id]) delete L[id];
    else if (q) L[id] -= q;
  });
  return L;
};
function boptVoidRows() {
  const b = bopt.bill,
    A = billAdj(b),
    f = boptEl("VF").value.trim().toLowerCase(),
    ids = Object.keys(b.lines);
  $("#bopVRows").innerHTML =
    ids
      .filter(id => !f || `${id} ${get(id).n}`.toLowerCase().includes(f))
      .map(id => {
        const it = get(id),
          n = b.lines[id],
          v = bopt.vq[id],
          p = itemPrice(it, A);
        return `<tr class="${v ? "on" : ""}" data-vr="${id}"><td><input type="checkbox" tabindex="-1" ${v ? "checked" : ""}></td><td>${slipEsc(id)}</td><td class="d">${slipEsc(it.n)}</td><td class="n">${
          v && n > 1
            ? `<span class="qc"><button data-vs="${id}" data-d="-1" ${v <= 1 ? "disabled" : ""}>−</button><b>${v}</b><button data-vs="${id}" data-d="1" ${v >= n ? "disabled" : ""}>+</button></span><small>of ${n}</small>`
            : n
        }</td><td class="n">${bill2(p)}</td><td class="n">${bill2(p * n)}</td></tr>`;
      })
      .join("") || '<tr><td colspan="6" class="bv-none">No items match.</td></tr>';
  const qty = Object.values(bopt.vq).reduce((a, q) => a + q, 0),
    all = ids.every(id => bopt.vq[id] >= b.lines[id]),
    g = billTot(b).g;
  boptEl("VAll").checked = all;
  $("#bopVSum").innerHTML =
    `<span>Bill total <b>${KES(g)}</b></span><span class="${qty ? "bv-out" : ""}">Voiding <b>${KES(g - totals(boptVoidLeft(), A).g)}</b>${qty ? ` · ${qty} item${qty > 1 ? "s" : ""}${all ? ", whole bill" : ""}` : ""}</span>`;
}
const boptVoidChips = () =>
  document
    .querySelectorAll(".bv-r")
    .forEach(c => c.classList.toggle("on", c.dataset.vw === boptEl("Why").value));
function boptVoidSave() {
  const b = bopt.bill,
    V = Object.entries(bopt.vq).filter(([, q]) => q > 0),
    why = boptEl("Why").value.trim(),
    back = !b.draft && boptEl("Back").checked;
  if (!V.length) return boptMsg("Tick the items to void.");
  if (!why) return boptMsg("Tap or type the reason for voiding.");
  const before = billTot(b).g,
    left = boptVoidLeft(),
    whole = !Object.keys(left).length,
    voided = Object.fromEntries(V),
    by = bopt.by,
    A = billAdj(b),
    gone = before - totals(left, A).g,
    list = V.reduce((a, [id, q]) => a + itemPrice(get(id), A) * q, 0),
    // Each item's share of what came off the bill, so a discounted bill adds up.
    share = list ? gone / list : 0;
  boptLog(
    "Void",
    b,
    why,
    (whole ? "Whole bill: " : "") +
      V.map(([id, q]) => `${q} ${get(id).n}`).join(", ") +
      (b.draft ? " · not sent" : back ? " · back in stock" : " · not back in stock"),
    -gone,
    {
      whole,
      items: V.map(([id, q]) => ({
        n: get(id).n,
        q,
        d: get(id).d,
        amt: itemPrice(get(id), A) * q * share
      }))
    }
  );
  // Nothing on a sale that wasn't sent has reached the kitchen or the bar, so no alert.
  if (b.draft) {
    if (whole) resetSale();
    else V.forEach(([id, q]) => (q >= cart[id] ? delete cart[id] : (cart[id] -= q)));
    return boptDone(whole ? "Sale voided." : "Items voided.");
  }
  if (back) V.forEach(([id, q]) => itemStockMove(get(id), -q));
  b.lines = left;
  if (whole) {
    orders.splice(orders.indexOf(b), 1);
    if (cur === b) cur = null;
  }
  boptDone(whole ? `${b.label} voided.` : `Items voided. ${b.label} is now ${KES(billTot(b).g)}.`);
  const tickets = orderTickets(
    voided,
    {
      no: b.no,
      label: b.label,
      guest: b.guest,
      room: b.room,
      waiter: b.waiter,
      by,
      why,
      whole
    },
    voidSlipHTML
  );
  showRc(
    tickets.map(x => x.html).join("") + '<div class="sl-scr" id="rcPrinted"></div>',
    null,
    "Close"
  );
  printOrderTickets(tickets, voidTicketLines, "void alert");
}

// ---------------------------------------------------------------- merge
function boptMergeForm() {
  // Whoever authorizes decides what can be merged: a Manager's PIN opens every waiter's bills.
  const by = USERS.find(u => u.n === bopt.by),
    me = user ? user.n : "",
    L = billsFor(by, by.d).sort((a, b) => (b.waiter === me) - (a.waiter === me));
  if (L.length < 2) {
    $("#mBopt").classList.remove("show");
    return fsNote("Merging needs two open bills.");
  }
  boptEl("Body").innerHTML =
    `<h3>Merge bills</h3><p class="stk">Tick the bills to combine. They become one bill under the first one ticked, and it stays with that bill's waiter. Authorized by ${slipEsc(bopt.by)}.</p>
  <div class="bop-list">${L.map(
    o =>
      `<label class="bop-b"><span><input type="checkbox" data-bm="${slipEsc(o.no)}" ${boptScope && boptScope.includes(o) ? "checked" : ""}> <b>${slipEsc(o.label)}</b> · ${slipEsc(o.dept)}<small>${slipEsc(o.no)} · ${cnt(o.lines)} items · ${slipEsc(o.waiter || "No waiter")}</small></span><b>${KES(totals(o.lines, o).g)}</b></label>`
  ).join("")}</div>${boptFoot("Merge bills")}`;
  bopt.order = (boptScope || []).map(o => o.no);
}
function boptMergeSave() {
  const L = bopt.order.map(no => orders.find(o => o.no === no)).filter(Boolean),
    key = o =>
      JSON.stringify([o.pl && o.pl.n, o.cur && o.cur.c, o.disc && [o.disc.type, o.disc.v]]);
  if (L.length < 2) return boptMsg("Tick at least two bills.");
  if (new Set(L.map(key)).size > 1)
    return boptMsg(
      "These bills have different discounts, price lists or currencies. Make them the same first."
    );
  const [T, ...rest] = L,
    amt = L.some(o => o.disc && o.disc.type === "amt");
  if (amt) return boptMsg("Remove the KES discount first, then apply it to the merged bill.");
  const was = rest.map(o => `${o.label} (${o.no}, ${o.waiter})`).join(", "),
    mixed = rest.some(o => o.waiter !== T.waiter);
  rest.forEach(o => {
    Object.entries(o.lines).forEach(([id, q]) => (T.lines[id] = (T.lines[id] || 0) + q));
    const c = parseInt(T.covers, 10) || 0,
      d = parseInt(o.covers, 10) || 0;
    if (c || d) T.covers = String(c + d);
    T.guest = T.guest || o.guest;
    T.room = T.room || o.room;
    T.rider = T.rider || o.rider;
    T.rounds = Math.max(T.rounds, o.rounds);
    orders.splice(orders.indexOf(o), 1);
    if (cur === o) cur = null;
  });
  boptLog("Merge", T, "", "Merged " + was);
  boptDone(
    `Merged into ${T.label}: ${KES(totals(T.lines, T).g)}.` +
      (mixed ? ` It stays with ${T.waiter}.` : "")
  );
}

// ---------------------------------------------------------------- split
function boptSplitForm() {
  const b = bopt.bill;
  bopt.q = bopt.q || Object.fromEntries(Object.keys(b.lines).map(id => [id, 0]));
  const lbl = boptEl("Nm") ? boptEl("Nm").value : b.label + " /2",
    ids = Object.keys(b.lines),
    moved = Object.fromEntries(ids.filter(id => bopt.q[id] > 0).map(id => [id, bopt.q[id]])),
    left = Object.fromEntries(
      ids.filter(id => bopt.q[id] < b.lines[id]).map(id => [id, b.lines[id] - bopt.q[id]])
    ),
    whole = !Object.keys(left).length,
    row = (id, q, side) =>
      `<div class="bs-i"><button class="bs-m" data-bs="${id}" data-d="${side}"><b>${q}</b><span>${slipEsc(get(id).n)}</span><i>${side > 0 ? "→" : "←"}</i></button>${q > 1 ? `<button class="bs-all" data-bs="${id}" data-d="${side * q}">All</button>` : ""}</div>`;
  boptEl("Box").classList.add("bop-split");
  boptEl("Body").innerHTML =
    `${boptTop()}<p class="stk">Tap an item to move it to the new bill. Tap it there to bring it back.</p>
  <div class="bs-pair"><div class="bs-p"><div class="bs-h"><small>Old bill</small><b>${slipEsc(b.label)}</b></div><div class="bs-r">${
    Object.keys(left)
      .map(id => row(id, left[id], 1))
      .join("") || '<div class="bs-e">Nothing left on this bill.</div>'
  }</div><div class="bs-t"><span>Total</span><b>${KES(totals(left, b).g)}</b></div></div>
  <div class="bs-p bs-new"><label class="bs-h"><small>New bill</small><input id="bopNm" value="${slipEsc(lbl)}"></label><div class="bs-r">${
    Object.keys(moved)
      .map(id => row(id, moved[id], -1))
      .join("") || '<div class="bs-e">Zero bill. Tap items on the old bill to move them here.</div>'
  }</div><div class="bs-t"><span>Total</span><b id="bopNewT">${KES(totals(moved, whole ? b : boptSplitTerms(b)).g)}</b></div></div></div>
  ${whole ? `<div class="status">Everything is moving, so ${slipEsc(b.label)} will close.</div>` : ""}${boptFoot("Split bill")}`;
}
/** A KES discount stays on the old bill; a percentage applies to both. */
const boptSplitTerms = b => ({ ...b, disc: b.disc && b.disc.type === "pct" ? b.disc : null });
function boptSplitSave() {
  const b = bopt.bill,
    label = boptEl("Nm").value.trim(),
    M = Object.entries(bopt.q).filter(([, q]) => q > 0);
  if (!M.length) return boptMsg("Move at least one item to the new bill.");
  if (!label) return boptMsg("Enter the name of the new bill.");
  if (orders.some(o => o.dept === b.dept && o.label.toLowerCase() === label.toLowerCase()))
    return boptMsg(`${b.dept} already has an open bill called ${label}.`);
  const whole = M.length === Object.keys(b.lines).length && M.every(([id, q]) => q >= b.lines[id]),
    n = {
      no: "ORD-" + String(ono++).padStart(3, "0"),
      label,
      dept: b.dept,
      lines: {},
      rounds: b.rounds,
      at: new Date(),
      guest: b.guest,
      covers: "",
      room: b.room,
      rider: b.rider,
      waiter: b.waiter,
      pl: b.pl,
      cur: b.cur,
      disc: whole ? b.disc : boptSplitTerms(b).disc
    };
  M.forEach(([id, q]) => {
    n.lines[id] = q;
    if (q >= b.lines[id]) delete b.lines[id];
    else b.lines[id] -= q;
  });
  orders.push(n);
  if (whole) {
    orders.splice(orders.indexOf(b), 1);
    if (cur === b) cur = null;
  }
  boptLog(
    "Split",
    b,
    "",
    `Moved to ${n.no} ${n.label}: ` +
      M.map(([id, q]) => `${q} ${get(id).n}`).join(", ") +
      (whole ? ` · ${b.no} closed` : ""),
    -totals(n.lines, n).g,
    { points: [...new Set([...billPoints(b.lines), ...billPoints(n.lines)])] }
  );
  boptDone(
    whole
      ? `All moved to ${n.label}: ${KES(totals(n.lines, n).g)}. ${b.label} closed.`
      : `Split: ${b.label} ${KES(totals(b.lines, b).g)}, ${n.label} ${KES(totals(n.lines, n).g)}.`
  );
}

// ---------------------------------------------------------------- clicks
$("#mBopt").addEventListener("click", e => {
  const b = e.target.closest("button,input[data-bm]");
  if (e.target.id === "mBopt") return e.target.classList.remove("show");
  if (e.target.id === "bopVAll") {
    Object.keys(bopt.vq).forEach(id => (bopt.vq[id] = e.target.checked ? bopt.bill.lines[id] : 0));
    return boptVoidRows();
  }
  const row = e.target.closest("[data-vr]");
  if (row && !b) {
    const id = row.dataset.vr;
    bopt.vq[id] = bopt.vq[id] ? 0 : bopt.bill.lines[id];
    return boptVoidRows();
  }
  if (!b) return;
  const d = b.dataset;
  if (d.bo) return boptStart(d.bo);
  if (d.vs) {
    bopt.vq[d.vs] += +d.d;
    return boptVoidRows();
  }
  if (d.vw) {
    boptEl("Why").value = d.vw;
    return boptVoidChips();
  }
  if (d.bb !== undefined) return boptOpen(boptBills(bopt.act)[+d.bb]);
  if (d.bg === "auth") return boptAuth();
  if (d.bs) {
    bopt.q[d.bs] = Math.max(0, bopt.q[d.bs] + +d.d);
    return boptSplitForm();
  }
  if (d.bt) {
    bopt.type = d.bt;
    return boptDiscForm();
  }
  if (d.bm) {
    bopt.order = bopt.order.filter(x => x !== d.bm);
    if (b.checked) bopt.order.push(d.bm);
    return;
  }
  if (d.bg === "save")
    return {
      disc: boptDiscSave,
      void: boptVoidSave,
      merge: boptMergeSave,
      split: boptSplitSave
    }[bopt.act]();
});
$("#mBopt").addEventListener("input", e => {
  if (e.target.id === "bopVal") boptDiscSum();
  if (e.target.id === "bopVF") boptVoidRows();
  if (e.target.id === "bopWhy" && bopt.act === "void") boptVoidChips();
});
$("#mBopt").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.id === "bopPin") boptAuth();
});

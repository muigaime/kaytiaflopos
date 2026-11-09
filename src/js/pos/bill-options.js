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
  printed: !!(draft && draft.printed),
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
    bd: bizDate(),
    pc: auditMachine(),
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
  if ($("#bo").classList.contains("show") && window.boRedraw) window.boRedraw();
  if ($("#mSel").classList.contains("show")) selRender();
  fsNote(msg);
}

// ---------------------------------------------------------------- the circle
$("#billBtn").onclick = () => boptWheel(null);
function boptWheel(scope) {
  boptScope = scope;
  boptEl("Box").classList.remove("bop-void", "bop-tr");
  tr = null;
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
  const moving = act === "merge" || act === "split";
  if (moving) {
    if (orders.length < 2)
      return fsNote("That needs two open bills. Ask the waiter to open a new bill.");
  } else if (!boptBills(act).length)
    return fsNote("There is no bill to change. Add items or send an order first.");
  bopt = { act };
  $("#bopWheel").style.display = "none";
  boptEl("Box").style.display = "";
  // Whoever may see all bills moves them without a PIN.
  if (actsAlone(act) || (moving && seesAllBills(user))) {
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
  if (bopt.act === "ret") return retForm();
  if (bopt.act === "void" && bopt.bill) return boptOpen(bopt.bill);
  if (bopt.act === "merge" || bopt.act === "split") return trOpen();
  const L = boptBills(bopt.act);
  if (L.length === 1) return boptOpen(L[0]);
  boptEl("Body").innerHTML =
    `<h3>${BOPT[bopt.act][0]}</h3><p class="stk">Which bill?</p><div class="bop-list">${L.map(
      (b, i) =>
        `<button class="bop-b ${b.printed ? "printed" : ""} ${b.billCopies ? "rep" : ""}" data-bb="${i}"><span><b>${slipEsc(b.label)}</b> · ${slipEsc(b.dept)}<small>${b.draft ? "Not sent yet" : slipEsc(b.no)} · ${cnt(b.lines)} items</small></span><b>${KES(billTot(b).g)}</b></button>`
    ).join("")}</div><div class="row"><button class="mini" data-close>Cancel</button></div>`;
}
function boptOpen(b) {
  bopt.bill = b;
  ({
    disc: boptDiscForm,
    void: boptVoidForm
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
  const giver = USERS.find(u => u.n === bopt.by);
  if (giver && !BILL_AUTH.includes(giver.role) && giver.maxDisc !== undefined) {
    const pct = d.type === "pct" ? d.v : sub ? (d.v / sub) * 100 : 0;
    if (pct > giver.maxDisc)
      return boptMsg(
        `Your limit is ${giver.maxDisc}%. Ask a Manager or Super Cashier to give more.`
      );
  }
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
const voidReasons = () =>
  (typeof FD_SETTINGS !== "undefined" && FD_SETTINGS.voidReasons) || VOID_REASONS;
function boptVoidForm() {
  const b = bopt.bill;
  bopt.vq = Object.fromEntries(Object.keys(b.lines).map(id => [id, 0]));
  boptEl("Box").classList.add("bop-void");
  boptEl("Body").innerHTML = `${boptTop()}
  <div class="bv-wrap"><table class="bv-t"><thead><tr><th>Selected</th><th>Code</th><th>Description</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Total</th></tr>
  <tr class="bv-f"><td colspan="6"><input id="bopVF" placeholder="Filter items" autocomplete="off"></td></tr></thead><tbody id="bopVRows"></tbody></table></div>
  <div class="bv-sum"><label class="bop-c"><input type="checkbox" id="bopVAll"> Select all</label><div id="bopVSum"></div></div>
  <div class="bv-rs">${voidReasons()
    .map(r => `<button class="bv-r" data-vw="${slipEsc(r)}">${slipEsc(r)}</button>`)
    .join("")}</div>
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
  if (bopt.act === "ret") return retRows();
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
        return `<tr class="${v ? "on" : ""}" data-vr="${id}"><td><input type="checkbox" tabindex="-1" ${v ? "checked" : ""}></td><td>${slipEsc(String(id).split("~")[0])}</td><td class="d">${slipEsc(it.n)}</td><td class="n">${
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
  // A bill opened and never used has nothing to void, so it just closes.
  if (!b.draft && !Object.keys(b.lines).length) {
    boptLog("Void", b, why || "Empty bill", "Empty bill closed · number used again", 0, {
      whole: true,
      items: []
    });
    orders.splice(orders.indexOf(b), 1);
    billNoBack(b.no);
    orderNoBack(b.waiter, b.ord, b.at);
    if (cur === b) cur = null;
    return boptDone(`Empty bill ${b.no} closed.`);
  }
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
    if (whole) {
      draft = null; // the log keeps this number, so it isn't used again
      resetSale();
    } else V.forEach(([id, q]) => (q >= cart[id] ? delete cart[id] : (cart[id] -= q)));
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
      ord: b.ord,
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
  rcFill(
    tickets.map(x => x.html).join("") + '<div class="sl-scr" id="rcPrinted"></div>',
    null,
    "Close"
  );
  printOrderTickets(tickets, voidTicketLines, "void alert").then(r =>
    rcDone(r, "Void alert sent.")
  );
}

// ---------------------------------------------------------------- clicks
$("#mBopt").addEventListener("click", e => {
  const b = e.target.closest("button");
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
  if (d.bt) {
    bopt.type = d.bt;
    return boptDiscForm();
  }
  if (d.bg === "save")
    return {
      disc: boptDiscSave,
      void: boptVoidSave,
      ret: retSave,
      merge: trSave,
      split: trSave
    }[bopt.act]();
});
$("#mBopt").addEventListener("input", e => {
  if (e.target.id === "bopVal") boptDiscSum();
  if (e.target.id === "bopVF") boptVoidRows();
  if (e.target.id === "bopWhy" && (bopt.act === "void" || bopt.act === "ret")) boptVoidChips();
});
$("#mBopt").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.id === "bopPin") boptAuth();
});

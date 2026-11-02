let dept = "Bar",
  cart = {},
  held = [],
  rno = 1,
  payRef = null;
// 1e-9: quantities such as 0.1 must not lose a whole portion to rounding (0.3 / 0.1 = 2.9999…).
const avail = it =>
  Math.min(
    ...Object.entries(it.r).map(([k, v]) => Math.floor((STK[itemLoc(it)][k] || 0) / v + 1e-9))
  );
const inCart = id => cart[id] || 0;
let catSel = "",
  nextQty = 1,
  selId = null,
  kmsg = "",
  rider = null,
  qMode = "next",
  qBuf = "";
/** Bill numbers run on for ever. Order numbers start again with each staff shift. */
// A number only stays taken once a bill has been used. One given back is the next to go out.
const FREE_BILLS = [];
const nextBill = () =>
  FREE_BILLS.length ? FREE_BILLS.sort((a, b) => +a - +b).shift() : pad(rno++, 5);
function billNoBack(no) {
  if (+no === rno - 1) rno--;
  else if (!FREE_BILLS.includes(no)) FREE_BILLS.push(no);
}
function orderNoBack(name, ord, opened) {
  const sh = shiftOf(name);
  if (!sh || !ord || (opened && new Date(opened) < new Date(sh.openedAt))) return;
  if (sh.ono === ord) sh.ono--;
  else (sh.ofree = sh.ofree || []).push(ord);
}
function nextOrder(name) {
  const sh = shiftOf(name);
  if (sh && sh.ofree && sh.ofree.length) return sh.ofree.sort((a, b) => a - b).shift();
  if (sh) return (sh.ono = (sh.ono || 0) + 1);
  return orders.reduce((a, o) => Math.max(a, o.ord || 0), 0) + 1;
}
/** The sale on the screen holds its numbers from New sale (or its first item) until it is sent or paid. */
let draft = null;
function draftStart() {
  if (cur || draft) return "";
  const stop = newBillBlock();
  if (stop) return stop;
  draft = { no: nextBill(), ord: nextOrder(user ? user.n : "") };
  return "";
}
function draftTake() {
  const d = draft || { no: nextBill(), ord: nextOrder(user ? user.n : "") };
  draft = null;
  return d;
}
/** Nothing was sold on these numbers, so the next sale uses them and the sequence has no gap. */
function draftRelease() {
  if (!draft) return;
  billNoBack(draft.no);
  if (user) orderNoBack(user.n, draft.ord);
  draft = null;
}
const get = id => ITEMS.find(i => i.id == id),
  pad = (n, l = 6) => String(n).padStart(l, "0");
// A waiter ticked for several sale points works in them side by side (dept = ALLP): the tabs on top
// choose whose menu shows, and the order keeps building across them.
let spTab = "";
const onMenu = i => (dept === ALLP ? i.d === spTab : i.d === dept);
const shownPoint = () => (dept === ALLP ? spTab : dept);
function drawTabs() {
  if (dept === ALLP && !DEPTS.includes(spTab)) spTab = DEPTS[0];
  $("#spTabs").innerHTML =
    dept === ALLP
      ? DEPTS.map(
          d => `<button class="sp-tab ${d === spTab ? "on" : ""}" data-t="${d}">${d}</button>`
        ).join("")
      : "";
}
function showTab(d) {
  spTab = d;
  catSel = "";
  drawDepts();
  renderCats();
  drawGrid();
}
$("#spTabs").onclick = e => {
  const b = e.target.closest("[data-t]");
  if (b) showTab(b.dataset.t);
};
function drawDepts() {
  drawTabs();
  $("#posOutlet").textContent = shownPoint();
  $("#spBtn").textContent = shownPoint();
  $("#hSP").textContent = shownPoint();
}
function drawCats() {
  catSel = "";
  selId = null;
  renderCats();
}
/** This sale point's categories. The menu always shows one, the first until another is tapped. */
function menuCats() {
  const cs = [...new Set(ITEMS.filter(onMenu).map(i => i.c))];
  if (!cs.includes(catSel)) catSel = cs[0] || "";
  return cs;
}
function renderCats() {
  $("#cats").innerHTML = menuCats()
    .map(c => `<button class="cat ${c === catSel ? "on" : ""}" data-c="${c}">${c}</button>`)
    .join("");
}
/** 1450 → "1,450", 1450.5 → "1,450.50". */
const posMoney = n =>
  n.toLocaleString("en-KE", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const bill2 = n =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hue = s => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};
function drawGrid() {
  menuCats();
  $("#grid").innerHTML =
    ITEMS.filter(i => onMenu(i) && i.c === catSel)
      .map(i => {
        const a = avail(i) - inCart(i.id),
          n = inCart(i.id);
        return `<button class="it${n ? " has" : ""}" style="--h:${hue(i.c)}" data-i="${i.id}" title="${i.n.replace(/"/g, "&quot;")}" ${a <= 0 ? "disabled" : ""}>${n ? `<span class="in">${n}</span>` : ""}<span class="lw ${a <= 0 ? "out" : ""}">${a <= 0 && !n ? "Out of stock" : can("stock") && a < 10 && a > 0 ? a + " left" : ""}</span><span class="nm">${i.n}</span><span class="cg">${i.c}</span><span class="pr">${posMoney(i.p)}</span></button>`;
      })
      .join("") || '<div class="empty">No items in this category.</div>';
}
/** A bill's own terms: { pl: price list, disc: discount, cur: currency } (Bill options). */
let cartAdj = {};
const itemPrice = (it, a) =>
  a && a.pl && a.pl.pct ? Math.round(it.p * (100 + a.pl.pct)) / 100 : it.p;
function totals(c = cart, a = c === cart ? (cur ? { pl: cur.pl } : cartAdj) : null) {
  let sub = 0,
    tax = 0;
  for (const [id, q] of Object.entries(c)) {
    const it = get(id),
      l = itemPrice(it, a) * q;
    sub += l;
    tax += (l * TAX[it.t]) / (100 + TAX[it.t]);
  }
  const d = a && a.disc,
    disc = d ? Math.min(sub, d.type === "pct" ? Math.round(sub * d.v) / 100 : d.v) : 0,
    k = sub ? (sub - disc) / sub : 1;
  // VAT falls with the discount, so what is charged still includes the right tax.
  return {
    g: sub - disc,
    tax: tax * k,
    net: sub - disc - tax * k,
    sub,
    disc,
    pl: a && a.pl,
    cur: a && a.cur
  };
}
function drawCart() {
  $("#vatL").textContent = taxName();
  const ids = Object.keys(cart),
    adj = cur ? { pl: cur.pl } : cartAdj;
  if (!ids.length) cartAdj = {};
  $("#lines").innerHTML =
    ids
      .map(id => {
        const it = get(id),
          q = cart[id];
        return `<div class="tr ${id == selId ? "sel" : ""}" data-r="${id}"><span class="qc"><button data-m="${id}">−</button>${q}<button data-p="${id}">+</button></span><span>${it.n}</span><span class="n">${bill2(itemPrice(it, adj))}</span><span class="n">${bill2(itemPrice(it, adj) * q)}</span></div>`;
      })
      .join("") ||
    `<div class="empty" style="padding:24px 8px">${cur ? "Adding to " + cur.label + ". Tap items to add." : "Tap an item to start an order."}</div>`;
  const t = totals();
  if (ids.length && (t.disc || t.pl || t.cur))
    $("#lines").insertAdjacentHTML(
      "beforeend",
      `<div class="tr-adj">${[
        t.pl && "Price list: " + t.pl.n,
        t.disc && "Discount: -" + bill2(t.disc),
        t.cur && `${t.cur.c} ${bill2(t.g / t.cur.rate)}`
      ]
        .filter(Boolean)
        .join(" · ")}</div>`
    );
  $("#tNet").textContent = bill2(t.net);
  $("#tTax").textContent = bill2(t.tax);
  $("#tGross").textContent = bill2(t.g);
  $("#sendBtn").disabled = !ids.length && !(draft && !cur);
  $("#sendBtn").textContent = !ids.length && draft && !cur ? "Open empty bill" : "Send order";
  $("#ordBtn").textContent = `Open orders (${visOrders().length})`;
  $("#fBill").value = cur ? cur.no : draft ? draft.no : "";
  $("#fBill").classList.toggle("printed", !!(cur || draft || {}).printed);
  $("#fBill").classList.toggle("rep", !!(cur || draft || {}).billCopies);
  if (cur) $("#fTable").value = cur.label;
  $("#fTable").disabled = !!cur;
  $("#fWaiter").value = user ? user.n : "";
  $("#fDT").value = bizNow().toLocaleString("en-KE");
  $("#fBdate").value = dateGB(bizDate());
  $("#hDate").textContent = dateGB(bizDate());
  $("#qtyBtn").textContent = nextQty > 1 ? "QTY ×" + nextQty : "QTY";
  $("#kmBtn").textContent = kmsg ? "Kitchen msg ✓" : "Kitchen msg";
  $("#riderBtn").textContent = rider ? "Rider ✓" : "Rider details";
  drawGrid();
  ordersKeep();
}
function add(id, d = 1) {
  const it = get(id),
    n = inCart(id) + d;
  if (n <= 0) delete cart[id];
  else {
    const m = avail(it);
    if (m <= 0) return;
    cart[id] = Math.min(n, m);
    draftStart();
  }
  drawCart();
}
function tapConfirm(btn, fn, msg) {
  if (btn.dataset.arm) {
    clearTimeout(+btn.dataset.arm);
    btn.textContent = btn.dataset.lbl;
    delete btn.dataset.arm;
    return fn();
  }
  btn.dataset.lbl = btn.textContent;
  btn.textContent = msg;
  btn.dataset.arm = setTimeout(() => {
    btn.textContent = btn.dataset.lbl;
    delete btn.dataset.arm;
  }, 2500);
}
function resetSale() {
  cartSwaps = [];
  // A printed number has been seen by a guest, so it isn't used again.
  if (draft && draft.printed) draft = null;
  cart = {};
  cur = null;
  kmsg = "";
  rider = null;
  nextQty = 1;
  selId = null;
  ["fTable", "fGuest", "fCov", "fRoom"].forEach(i => ($("#" + i).value = ""));
  drawCart();
}
$("#grid").onclick = e => {
  const b = e.target.closest("[data-i]");
  if (!b) return;
  const q = nextQty;
  nextQty = 1;
  add(b.dataset.i, q);
};
$("#cats").onclick = e => {
  const c = e.target.dataset.c;
  if (c === undefined) return;
  catSel = c;
  renderCats();
  drawGrid();
};
$("#lines").onclick = e => {
  const m = e.target.dataset.m,
    p = e.target.dataset.p;
  if (m) return add(m, -1);
  if (p) return add(p, 1);
  const r = e.target.closest("[data-r]");
  if (r) {
    selId = selId == r.dataset.r ? null : r.dataset.r;
    drawCart();
  }
};
function newSale() {
  resetSale();
  const stop = draftStart();
  if (stop) fsNote(stop);
  drawCart();
}
$("#newSale").onclick = e => {
  Object.keys(cart).length || cur
    ? tapConfirm(e.currentTarget, newSale, "CLEAR? TAP AGAIN")
    : newSale();
};
$("#cancelBtn").onclick = e => {
  if (Object.keys(cart).length || cur) tapConfirm(e.currentTarget, resetSale, "TAP AGAIN");
};
function qOpen(mode, title) {
  qMode = mode;
  qBuf = "";
  $("#qT").textContent = title;
  $("#qD").textContent = "0";
  $("#mQty").classList.add("show");
}
$("#qk").onclick = e => {
  const k = e.target.dataset.k;
  if (k === undefined) return;
  if (k === "C") qBuf = "";
  else if (k === "OK") {
    const n = parseInt(qBuf || "0", 10);
    $("#mQty").classList.remove("show");
    if (qMode === "next") {
      nextQty = Math.max(1, n);
      drawCart();
    } else if (selId && cart[selId]) {
      if (n <= 0) delete cart[selId];
      else cart[selId] = Math.min(n, avail(get(selId)));
      drawCart();
    }
    return;
  } else if (qBuf.length < 3) qBuf += k;
  $("#qD").textContent = qBuf || "0";
};
$("#qtyBtn").onclick = () => {
  if (selId && cart[selId]) qOpen("line", "Quantity for " + get(selId).n + " (0 removes)");
  else qOpen("next", "Quantity for the next item");
};
let selSet = new Set();
const myBills = () =>
  visOrders().sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true }));
function selRender() {
  const L = myBills(),
    w = seesAllBills(user) ? "all waiters" : user ? user.n : "",
    tot = L.reduce((a, o) => a + totals(o.lines, o).g, 0),
    ch = L.filter(o => selSet.has(o.no)),
    ct = ch.reduce((a, o) => a + totals(o.lines, o).g, 0);
  $("#selT").textContent = "Pending bills · " + w;
  const cell = (v, c = "") => `<span class="${c}" title="${slipEsc(v)}">${slipEsc(v)}</span>`;
  $("#selList").innerHTML = L.length
    ? `<div class="sr sh"><label><input type="checkbox" id="selAll" ${ch.length === L.length ? "checked" : ""}></label><span>Bill no</span><span>Table no</span><span>Waiter</span><span>Guest name</span><span>Date</span><span>Time</span><span>Curr</span><span class="n">Amount</span><span>S point</span></div>` +
      L.map(
        o =>
          `<div class="sr ${selSet.has(o.no) ? "on" : ""} ${o.printed ? "printed" : ""} ${o.billCopies ? "rep" : ""}" data-row="${o.no}"><label><input type="checkbox" data-s="${o.no}" ${selSet.has(o.no) ? "checked" : ""}></label><span class="sr-no" title="Bill ${slipEsc(o.no)}, order ${slipEsc(o.ord)}">${slipEsc(o.no)}<small>Order ${slipEsc(o.ord)}${emptyTag(o)}</small></span><span class="sr-t" title="${slipEsc(o.label)}"><b>${slipEsc(o.label)}</b></span>${cell(o.waiter || "–")}${cell(o.guest || "N/A")}${cell(o.at.toLocaleDateString("en-GB"))}${cell(o.at.toLocaleTimeString("en-GB"))}${cell("KES", "sr-cur")}<span class="n"><b>${bill2(totals(o.lines, o).g)}</b></span>${cell(billWhere(o))}</div>`
      ).join("")
    : '<div class="empty">No pending bills for ' + w + ".</div>";
  // These work on one bill: highlight exactly one.
  const one = ch.length === 1 ? ch[0].no : "";
  $("#selOne").innerHTML = [
    ["view", "View"],
    ["add", "Add items"],
    ["bill", "Print bill"],
    ...(can("swap") ? [["swap", "Swap"]] : [])
  ]
    .map(
      ([a, l]) =>
        `<button class="chip" data-oa="${a}" data-o="${one}" ${one ? "" : "disabled"}>${l}</button>`
    )
    .join("");
  $("#selTot").innerHTML =
    `<span>Selected ${ch.length} · ${KES(ct)}</span><span>ALL ${L.length} · ${KES(tot)}</span>`;
  $("#selChg").textContent = `Charge selected (${ch.length})`;
  $("#selChg").disabled = !ch.length;
  $("#selOpt").textContent = `Bill options (${ch.length})`;
  $("#selOpt").disabled = !ch.length;
  $("#selChgAll").disabled = !L.length;
  $("#selPush").innerHTML = selPushHTML(ch);
}
function selOpen() {
  selSet = new Set();
  selPushOpen = false;
  selRender();
  $("#mSel").classList.add("show");
  $("#selList").scrollTop = 0;
}
$("#selBtn").onclick = selOpen;
$("#selList").onchange = e => {
  const t = e.target,
    L = myBills();
  if (t.id === "selAll") selSet = t.checked ? new Set(L.map(o => o.no)) : new Set();
  else if (t.dataset.s) {
    t.checked ? selSet.add(t.dataset.s) : selSet.delete(t.dataset.s);
  }
  selRender();
};
$("#selOne").onclick = e => {
  const a = e.target.dataset.oa;
  if (!a || !e.target.dataset.o) return;
  if (a === "view") return orderView(orders.find(o => o.no === e.target.dataset.o));
  if (a === "add") $("#mSel").classList.remove("show");
  $("#ordList").onclick(e);
};
$("#selList").onclick = e => {
  // Tapping anywhere on a bill highlights it; the tick box looks after itself.
  const r = e.target.closest("[data-row]");
  if (!r || e.target.closest("label")) return;
  const no = r.dataset.row;
  selSet.has(no) ? selSet.delete(no) : selSet.add(no);
  selRender();
};
/** What is inside an order, without changing anything. */
function orderView(o) {
  if (!o) return;
  const t = totals(o.lines, o),
    ppl = o.waiter ? o.waiter : "–",
    row = (l, v) => (v ? `<div><span>${l}</span><b>${slipEsc(v)}</b></div>` : "");
  $("#viewBody").innerHTML = `<h3>Bill ${slipEsc(o.no)}</h3>
  <div class="view-meta">${row("Order no", o.ord)}${row("Table", o.label)}${row("Sale point", billWhere(o))}${row("Waiter", ppl)}${row("Guest", o.guest)}${row("Covers", o.covers)}${row("Room", o.room)}${row("Sent", hhmm(o.at))}${row("Rounds", String(o.rounds))}${o.rider ? row("Rider", o.rider.n + " " + o.rider.p) : ""}</div>
  <div class="view-lines"><table><tr><th>Qty</th><th>Item</th><th class="n">Price</th><th class="n">Total</th></tr>${slipLines(
    o.lines,
    o
  )
    .map(
      x =>
        `<tr><td>${x.q}</td><td>${slipEsc(x.n)}</td><td class="n">${bill2(x.p)}</td><td class="n">${bill2(x.p * x.q)}</td></tr>`
    )
    .join("")}</table></div>
  <div class="view-tots">${t.disc ? slipRow("Subtotal", bill2(t.sub)) + slipRow("Discount", "-" + bill2(t.disc)) : ""}${slipRow("Net", bill2(t.net))}${slipRow(taxName(), bill2(t.tax))}<div class="view-total"><span>Total</span><span>${KES(t.g)}</span></div>${t.pl ? `<small>Price list: ${slipEsc(t.pl.n)}</small>` : ""}${t.cur ? `<small>${slipEsc(t.cur.c)} ${bill2(t.g / t.cur.rate)}</small>` : ""}</div>
  <div class="row"><button class="chip on" data-close>Close</button></div>`;
  $("#mView").classList.add("show");
}
$("#selOpt").onclick = () => {
  const L = myBills().filter(o => selSet.has(o.no));
  if (L.length) boptWheel(L);
};
$("#selChg").onclick = () => {
  const L = myBills().filter(o => selSet.has(o.no));
  if (!L.length) return;
  openPay(L);
};
$("#selChgAll").onclick = () => {
  const L = myBills();
  if (!L.length) return;
  openPay(L);
};
function findList() {
  const q = $("#fq").value.toLowerCase();
  $("#fr").innerHTML =
    ITEMS.filter(i => inPoint(i, dept) && i.n.toLowerCase().includes(q))
      .map(
        i =>
          `<button class="mini" style="width:100%;text-align:left;margin-bottom:6px;padding:10px" data-i="${i.id}">${i.n} · ${i.p.toFixed(2)}</button>`
      )
      .join("") || '<div class="empty">No match.</div>';
}
$("#findBtn").onclick = () => {
  $("#fq").value = "";
  findList();
  $("#mFind").classList.add("show");
  setTimeout(() => $("#fq").focus(), 50);
};
$("#fq").oninput = findList;
const OSK = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
  ["CLEAR", "SPACE", "ENTER"]
];
$("#osk").innerHTML = OSK.map(
  r =>
    `<div class="kr">${r.map(k => `<button data-k="${k}" class="${k.length > 1 && k !== "⌫" ? "w" : ""}${k === "SPACE" ? " sp" : ""}">${k === "SPACE" ? "space" : k}</button>`).join("")}</div>`
).join("");
function findEnter() {
  const f = ITEMS.filter(
    i => inPoint(i, dept) && i.n.toLowerCase().includes($("#fq").value.trim().toLowerCase())
  );
  if (f.length === 1) {
    const q = nextQty;
    nextQty = 1;
    add(f[0].id, q);
    $("#mFind").classList.remove("show");
  } else fsNote(f.length ? "Several items match. Tap the one you want." : "No item matches.");
}
$("#osk").onclick = e => {
  const k = e.target.dataset.k;
  if (!k) return;
  const q = $("#fq");
  if (k === "⌫") q.value = q.value.slice(0, -1);
  else if (k === "CLEAR") q.value = "";
  else if (k === "SPACE") {
    if (q.value && !q.value.endsWith(" ")) q.value += " ";
  } else if (k === "ENTER") return findEnter();
  else q.value += k;
  findList();
};
$("#fq").onkeydown = e => {
  if (e.key === "Enter") findEnter();
};
$("#fr").onclick = e => {
  const b = e.target.closest("[data-i]");
  if (!b) return;
  const q = nextQty;
  nextQty = 1;
  add(b.dataset.i, q);
  $("#mFind").classList.remove("show");
};
const KM = ["Rush", "No onions", "Extra spicy", "No salt", "Allergy: nuts", "Well done"];
$("#kmBtn").onclick = () => {
  $("#kmIn").value = kmsg;
  $("#kmChips").innerHTML = KM.map(k => `<button class="chip" data-k="${k}">${k}</button>`).join(
    ""
  );
  $("#mKm").classList.add("show");
};
$("#kmChips").onclick = e => {
  const k = e.target.dataset.k;
  if (k) {
    const v = $("#kmIn").value.trim();
    $("#kmIn").value = v ? v + ", " + k : k;
  }
};
$("#kmSave").onclick = () => {
  kmsg = $("#kmIn").value.trim();
  $("#mKm").classList.remove("show");
  drawCart();
};
$("#riderBtn").onclick = () => {
  ["rN", "rP", "rA"].forEach(
    (id, i) => ($("#" + id).value = rider ? [rider.n, rider.p, rider.a][i] : "")
  );
  $("#mRider").classList.add("show");
};
$("#rSave").onclick = () => {
  const n = $("#rN").value.trim();
  rider = n ? { n, p: $("#rP").value.trim(), a: $("#rA").value.trim() } : null;
  $("#mRider").classList.remove("show");
  drawCart();
};
$("#codeBtn").onclick = () => {
  $("#cOld").value = "";
  $("#cNew").value = "";
  $("#cMsg").textContent = "";
  $("#mCode").classList.add("show");
};
$("#cSave").onclick = () => {
  const bad = m => {
    $("#cMsg").textContent = m;
    $("#cMsg").className = "status bad";
  };
  if ($("#cOld").value !== user.pin) return bad("Current PIN is wrong.");
  const n = $("#cNew").value;
  if (!/^\d{4,6}$/.test(n)) return bad("New PIN must be 4 to 6 digits.");
  if (USERS.some(u => u !== user && u.pin === n)) return bad("That PIN is already in use.");
  user.pin = n;
  $("#mCode").classList.remove("show");
  fsNote("PIN changed.");
};
$("#settleBtn").onclick = () => {
  if (Object.keys(cart).length) {
    if (cur) return fsNote("Send the new items first, then settle from Open orders.");
    return openPay(null);
  }
  $("#ordBtn").click();
};
$("#printBtn").onclick = () => {
  if (Object.keys(cart).length && !cur) {
    if (posOpt("mustSend")) return fsNote("Send the order first, then print the bill.");
    const print = by => {
      if (draft) billMark(draft, by, user.n, cart);
      drawCart();
      showRc(
        waiterCopies(
          guestBillHTML({
            pt: billPoints(cart)[0],
            reprint: draft && draft.billCopies,
            no: $("#fBill").value,
            dept: billPlace(cart),
            label: $("#fTable").value || "Walk-in",
            guest: $("#fGuest").value,
            covers: $("#fCov").value,
            room: $("#fRoom").value,
            waiter: user ? user.n : "",
            rider,
            lines: slipLines(cart, cartAdj),
            t: totals()
          })
        ),
        null,
        "Close"
      );
      printSlips("GUEST BILL");
    };
    if (draft && draft.printed && !BILL_AUTH.includes(user.role))
      return pinAsk("Reprint bill " + draft.no, PIN_REPRINT, print);
    print(user.n);
  } else $("#ordBtn").click();
};
$("#lock").onclick = e => {
  const go = () => {
    posKioskOn(); // the next person starts in full screen
    user = null;
    pin = "";
    pdraw();
    $("#login").style.display = "grid";
    resetSale();
  };
  Object.keys(cart).length ? tapConfirm(e.currentTarget, go, "UNSENT! TAP AGAIN") : go();
};
document.addEventListener("click", e => {
  if (e.target.dataset.close !== undefined) e.target.closest(".modal").classList.remove("show");
  if (e.target.classList.contains("modal")) e.target.classList.remove("show");
});

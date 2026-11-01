let dept = "Bar",
  cart = {},
  held = [],
  rno = 1042,
  method = "cash",
  payRef = null;
// 1e-9: quantities such as 0.1 must not lose a whole portion to rounding (0.3 / 0.1 = 2.9999…).
const avail = it =>
  Math.min(
    ...Object.entries(it.r).map(([k, v]) => Math.floor((STK[itemLoc(it)][k] || 0) / v + 1e-9))
  );
const inCart = id => cart[id] || 0;
let catSel = "All",
  nextQty = 1,
  selId = null,
  kmsg = "",
  rider = null,
  qMode = "next",
  qBuf = "";
const get = id => ITEMS.find(i => i.id == id),
  pad = (n, l = 6) => String(n).padStart(l, "0");
function drawDepts() {
  $("#posOutlet").textContent = dept;
  $("#spBtn").textContent = dept;
  $("#hSP").textContent = dept;
}
function drawCats() {
  catSel = "All";
  selId = null;
  renderCats();
}
function renderCats() {
  const cs = ["All", ...new Set(ITEMS.filter(i => i.d === dept).map(i => i.c))];
  $("#cats").innerHTML = cs
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
  const list = ITEMS.filter(i => i.d === dept && (catSel === "All" || i.c === catSel));
  // "All" reads like a menu: each category under its own heading.
  let section = null;
  $("#grid").innerHTML =
    (catSel === "All"
      ? [...new Set(list.map(i => i.c))].flatMap(c => list.filter(i => i.c === c))
      : list
    )
      .map(i => {
        const a = avail(i) - inCart(i.id),
          n = inCart(i.id);
        const head =
          catSel === "All" && i.c !== section ? `<h3 class="ms">${(section = i.c)}</h3>` : "";
        return `${head}<button class="it${n ? " has" : ""}" style="--h:${hue(i.c)}" data-i="${i.id}" title="${i.n.replace(/"/g, "&quot;")}" ${a <= 0 ? "disabled" : ""}>${n ? `<span class="in">${n}</span>` : ""}<span class="lw ${a <= 0 ? "out" : ""}">${a <= 0 && !n ? "Out of stock" : a < 10 && a > 0 ? a + " left" : ""}</span><span class="nm">${i.n}</span><span class="cg">${i.c}</span><span class="pr">${posMoney(i.p)}</span></button>`;
      })
      .join("") || '<div class="empty">No items in this category.</div>';
}
function totals(c = cart) {
  let g = 0,
    tax = 0;
  for (const [id, q] of Object.entries(c)) {
    const it = get(id),
      l = it.p * q;
    g += l;
    tax += (l * TAX[it.t]) / (100 + TAX[it.t]);
  }
  return { g, tax, net: g - tax };
}
function drawCart() {
  const ids = Object.keys(cart);
  $("#lines").innerHTML =
    ids
      .map(id => {
        const it = get(id),
          q = cart[id];
        return `<div class="tr ${id == selId ? "sel" : ""}" data-r="${id}"><span class="qc"><button data-m="${id}">−</button>${q}<button data-p="${id}">+</button></span><span>${it.n}</span><span class="n">${bill2(it.p)}</span><span class="n">${bill2(it.p * q)}</span></div>`;
      })
      .join("") ||
    `<div class="empty" style="padding:24px 8px">${cur ? "Adding to " + cur.label + ". Tap items to add." : "Tap an item to start an order."}</div>`;
  const t = totals();
  $("#tNet").textContent = bill2(t.net);
  $("#tTax").textContent = bill2(t.tax);
  $("#tGross").textContent = bill2(t.g);
  $("#sendBtn").disabled = !ids.length;
  $("#ordBtn").textContent = `Open orders (${visOrders().length})`;
  $("#fBill").value = cur ? cur.no : "NBO-" + pad(rno);
  if (cur) $("#fTable").value = cur.label;
  $("#fTable").disabled = !!cur;
  $("#fWaiter").value = user ? user.n : "";
  $("#fDT").value = new Date().toLocaleString("en-KE");
  $("#fBdate").value = new Date().toLocaleDateString("en-GB");
  $("#hDate").textContent = new Date().toLocaleDateString("en-GB");
  $("#qtyBtn").textContent = nextQty > 1 ? "QTY ×" + nextQty : "QTY";
  $("#kmBtn").textContent = kmsg ? "Kitchen msg ✓" : "Kitchen msg";
  $("#riderBtn").textContent = rider ? "Rider ✓" : "Rider details";
  drawGrid();
}
function add(id, d = 1) {
  const it = get(id),
    n = inCart(id) + d;
  if (n <= 0) delete cart[id];
  else {
    const m = avail(it);
    if (m <= 0) return;
    cart[id] = Math.min(n, m);
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
$("#newSale").onclick = e => {
  Object.keys(cart).length || cur
    ? tapConfirm(e.currentTarget, resetSale, "CLEAR? TAP AGAIN")
    : resetSale();
};
$("#cancelBtn").onclick = e => {
  if (Object.keys(cart).length || cur) tapConfirm(e.currentTarget, resetSale, "TAP AGAIN");
};
$("#spBtn").onclick = $("#chSP").onclick = () => {
  $("#spList").innerHTML = DEPTS.map(
    d => `<button class="chip ${d === dept ? "on" : ""}" data-d="${d}">${d}</button>`
  ).join("");
  $("#mSP").classList.add("show");
};
$("#spList").onclick = e => {
  const d = e.target.dataset.d;
  if (!d) return;
  if (d !== dept) {
    const had = Object.keys(cart).length;
    dept = d;
    resetSale();
    drawDepts();
    drawCats();
    drawCart();
    if (had) fsNote("Order cleared: sale point changed.");
  }
  $("#mSP").classList.remove("show");
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
const myBills = () => {
  const w = user ? user.n : "";
  return orders.filter(o => o.waiter === w);
};
function selRender() {
  const L = myBills(),
    w = user ? user.n : "",
    tot = L.reduce((a, o) => a + totals(o.lines).g, 0),
    ch = L.filter(o => selSet.has(o.no)),
    ct = ch.reduce((a, o) => a + totals(o.lines).g, 0);
  $("#selT").textContent = "Pending bills · " + w;
  $("#selList").innerHTML = L.length
    ? `<div class="sr sh"><label><input type="checkbox" id="selAll" ${ch.length === L.length ? "checked" : ""}> All</label><span>Bill</span><span class="n">Amount</span><span></span></div>` +
      L.map(
        o =>
          `<div class="sr"><label><input type="checkbox" data-s="${o.no}" ${selSet.has(o.no) ? "checked" : ""}></label><span><b>${o.label}</b> · ${o.dept}<br><small>${o.no} · ${cnt(o.lines)} items · ${hhmm(o.at)}</small><br><small>${Object.entries(
            o.lines
          )
            .map(([id, q]) => q + "× " + get(id).n)
            .join(
              ", "
            )}</small></span><span class="n"><b>${KES(totals(o.lines).g)}</b></span><span class="ra"><button class="mini" data-oa="add" data-o="${o.no}">Add</button><button class="mini" data-oa="bill" data-o="${o.no}">Bill</button><button class="mini" data-oa="swap" data-o="${o.no}">Swap</button><button class="chip on" data-oa="pay" data-o="${o.no}">Charge</button></span></div>`
      ).join("")
    : '<div class="empty">No pending bills for ' + w + ".</div>";
  $("#selTot").innerHTML =
    `<span>Selected ${ch.length} · ${KES(ct)}</span><span>ALL ${L.length} · ${KES(tot)}</span>`;
  $("#selChg").textContent = `Charge selected (${ch.length})`;
  $("#selChg").disabled = !ch.length;
  $("#selChgAll").disabled = !L.length;
}
function selOpen() {
  selSet = new Set();
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
$("#selList").onclick = e => {
  const a = e.target.dataset.oa;
  if (!a) return;
  if (a === "add") $("#mSel").classList.remove("show");
  $("#ordList").onclick(e);
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
    ITEMS.filter(i => i.d === dept && i.n.toLowerCase().includes(q))
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
    i => i.d === dept && i.n.toLowerCase().includes($("#fq").value.trim().toLowerCase())
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
    showRc(
      guestBillHTML({
        no: $("#fBill").value,
        dept,
        label: $("#fTable").value || "Walk-in",
        guest: $("#fGuest").value,
        covers: $("#fCov").value,
        room: $("#fRoom").value,
        waiter: user ? user.n : "",
        rider,
        lines: slipLines(cart),
        t: totals()
      }),
      null,
      "Close"
    );
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

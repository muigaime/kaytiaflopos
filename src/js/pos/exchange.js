// ---- exchange items (swap one item for another) ----
const REAS = ["Customer changed mind", "Wrong item served", "Spoiled / wasted", "Out of stock"];
let ex = {};
const exLines = () => (ex.o ? ex.o.lines : cart),
  exDept = () => (ex.o ? (billPoints(ex.o.lines).length > 1 ? ALLP : ex.o.dept) : dept);
function exOpen(o) {
  const L = o ? o.lines : cart;
  if (!Object.keys(L).length) return fsNote("Nothing to exchange yet.");
  ex = {
    o,
    old: !o && selId && L[selId] ? selId : null,
    qty: 1,
    nw: null,
    cat: "All",
    reason: REAS[0],
    // Cooked food can't go back on the shelf: kitchens and restaurants don't return swapped items to stock.
    back: o ? !["Kitchen", "Restaurant"].includes((OUTLET_INFO[o.dept] || {}).type) : null
  };
  exRender();
  $("#mEx").classList.add("show");
}
function exRender() {
  const L = exLines(),
    d = exDept();
  $("#exT").textContent = ex.o
    ? "Exchange items · " + ex.o.label + " · " + d
    : "Exchange items · current order";
  $("#exOld").innerHTML = Object.entries(L)
    .map(
      ([id, q]) =>
        `<button class="exi ${id == ex.old ? "on" : ""}" data-eo="${id}"><b>${q}× ${get(id).n}</b><span>${KES(get(id).p * q)}</span></button>`
    )
    .join("");
  if (ex.old && ex.qty > L[ex.old]) ex.qty = L[ex.old];
  $("#exQ").innerHTML = ex.old
    ? `<span>How many to exchange</span><div class="qc"><button data-eq="-1">−</button><b>${ex.qty}</b><button data-eq="1">+</button></div>`
    : '<span class="stk">Tap the item you want to replace.</span>';
  const cats = ["All", ...new Set(ITEMS.filter(i => inPoint(i, d)).map(i => i.c))];
  $("#exCats").innerHTML = cats
    .map(c => `<button class="chip ${c === ex.cat ? "on" : ""}" data-ec="${c}">${c}</button>`)
    .join("");
  $("#exNew").innerHTML = ITEMS.filter(
    i => inPoint(i, d) && (ex.cat === "All" || i.c === ex.cat) && String(i.id) !== String(ex.old)
  )
    .map(i => {
      const a = avail(i) - (ex.o ? 0 : inCart(i.id)),
        low = a < ex.qty;
      return `<button class="exi ${ex.nw == i.id ? "on" : ""}" data-en="${i.id}" ${low ? "disabled" : ""}><b>${i.n}</b><span>${KES(i.p)}${low ? " · low stock" : ""}</span></button>`;
    })
    .join("");
  $("#exSent").style.display = ex.o ? "block" : "none";
  if (ex.o) {
    $("#exReasons").innerHTML = REAS.map(
      r => `<button class="chip ${r === ex.reason ? "on" : ""}" data-er="${r}">${r}</button>`
    ).join("");
    $("#exBack").checked = !!ex.back;
  }
  const ok = ex.old && ex.nw;
  let sum = "Pick the item to replace, then the new item.";
  if (ok) {
    const o = get(ex.old),
      n = get(ex.nw),
      df = (n.p - o.p) * ex.qty;
    sum =
      `${ex.qty}× ${o.n} → ${ex.qty}× ${n.n} · ` +
      (df === 0
        ? "same price"
        : df > 0
          ? "bill goes up by " + KES(df)
          : "bill goes down by " + KES(-df));
  }
  $("#exSum").textContent = sum;
  $("#exGo").disabled = !ok;
}
$("#mEx").onclick = e => {
  const b = e.target.closest("button");
  if (!b) return;
  const s = b.dataset;
  if (s.eo !== undefined) {
    ex.old = s.eo;
    ex.nw = null;
    ex.qty = 1;
  } else if (s.eq) {
    ex.qty = Math.max(1, Math.min(exLines()[ex.old], ex.qty + +s.eq));
    ex.nw = null;
  } else if (s.ec !== undefined) ex.cat = s.ec;
  else if (s.en !== undefined) ex.nw = s.en;
  else if (s.er !== undefined) {
    ex.reason = s.er;
    if (s.er === "Spoiled / wasted") ex.back = false;
  } else return;
  exRender();
};
$("#exBack").onchange = e => {
  ex.back = e.target.checked;
};
$("#exGo").onclick = () => {
  if (!ex.old || !ex.nw) return;
  const L = exLines(),
    q = ex.qty,
    oi = get(ex.old),
    ni = get(ex.nw);
  if (ex.o) {
    const o = ex.o;
    if (ex.back) itemStockMove(oi, -q);
    if (avail(ni) < q) {
      if (ex.back) itemStockMove(oi, q);
      return fsNote("Not enough " + ni.n + " in stock.");
    }
    itemStockMove(ni, q);
    L[ex.old] -= q;
    if (L[ex.old] <= 0) delete L[ex.old];
    L[ex.nw] = (L[ex.nw] || 0) + q;
    (o.ex = o.ex || []).push({
      at: new Date(),
      by: user ? user.n : "",
      from: oi.n,
      to: ni.n,
      q,
      reason: ex.reason,
      back: ex.back,
      diff: (ni.p - oi.p) * q
    });
    $("#mEx").classList.remove("show");
    showRc(
      exchangeSlipHTML({
        no: o.no,
        dept: o.dept,
        label: o.label,
        waiter: user ? user.n : "",
        q,
        from: oi.n,
        to: ni.n,
        reason: ex.reason,
        back: ex.back
      }),
      null,
      "Close"
    );
    if ($("#mSel").classList.contains("show")) selRender();
    drawCart();
  } else {
    if (avail(ni) - inCart(ni.id) < q) return fsNote("Not enough " + ni.n + " in stock.");
    cart[ex.old] -= q;
    if (cart[ex.old] <= 0) {
      delete cart[ex.old];
      if (selId == ex.old) selId = null;
    }
    cart[ex.nw] = (cart[ex.nw] || 0) + q;
    $("#mEx").classList.remove("show");
    drawCart();
    fsNote("Exchanged " + q + "× " + oi.n + " for " + ni.n + ".");
  }
};
$("#exBtn").onclick = () => {
  if (Object.keys(cart).length) return exOpen(null);
  selOpen();
  fsNote("Tap Swap on a bill to exchange its items.");
};

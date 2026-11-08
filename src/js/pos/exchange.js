// ---- swap items: one item for another of the same price, with a right and a manager's PIN ----
const REAS = ["Customer changed mind", "Wrong item served", "Spoiled / wasted", "Out of stock"];
let ex = {};
let exFails = 0,
  exLock = 0;
const swapText = x => `${x.q} x ${x.from} -> ${x.q} x ${x.to}`;
/** Every swap goes in the log the Swapped Items Report reads. */
function swapLog(o, x) {
  BILLLOG.push({
    at: new Date().toISOString(),
    bd: bizDate(),
    act: "Swap",
    no: o.no,
    label: o.label,
    dept: billPlace(o.lines) || o.dept,
    waiter: o.waiter,
    by: x.by,
    user: x.user,
    why: x.reason,
    detail: swapText(x),
    amt: 0,
    points: billPoints(o.lines),
    from: x.from,
    to: x.to,
    q: x.q,
    p: x.p,
    back: !!x.back
  });
}
const exLines = () => ex.o.lines,
  exDept = () => (billPoints(ex.o.lines).length > 1 ? ALLP : ex.o.dept);
function exOpen(o) {
  if (!can("swap")) return fsNote("You don't have the right to swap items.");
  if (!Object.keys(o.lines).length) return fsNote("Nothing to swap yet.");
  ex = {
    o,
    old: null,
    qty: 1,
    nw: null,
    cat: "All",
    reason: REAS[0],
    // Cooked food can't go back on the shelf: kitchens and restaurants don't return swapped items to stock.
    back: !["Kitchen", "Restaurant"].includes((OUTLET_INFO[o.dept] || {}).type)
  };
  exRender();
  $("#mEx").classList.add("show");
}
function exRender() {
  const L = exLines(),
    d = exDept();
  $("#exT").textContent = "Swap items · " + ex.o.label + " · " + d;
  $("#exOld").innerHTML = Object.entries(L)
    .map(
      ([id, q]) =>
        `<button class="exi ${id == ex.old ? "on" : ""}" data-eo="${id}"><b>${q}× ${get(id).n}</b><span>${KES(get(id).p * q)}</span></button>`
    )
    .join("");
  if (ex.old && ex.qty > L[ex.old]) ex.qty = L[ex.old];
  $("#exQ").innerHTML = ex.old
    ? `<span>How many to swap</span><div class="qc"><button data-eq="-1">−</button><b>${ex.qty}</b><button data-eq="1">+</button></div>`
    : '<span class="stk">Tap the item you want to replace.</span>';
  // Only items at the same price, so a swap never changes the bill.
  const same = ex.old
    ? ITEMS.filter(
        i =>
          inPoint(i, d) &&
          !catOffAt(i.d, i.c) &&
          i.p === get(ex.old).p &&
          String(i.id) !== String(ex.old)
      )
    : [];
  if (ex.cat !== "All" && !same.some(i => i.c === ex.cat)) ex.cat = "All";
  const cats = ["All", ...new Set(same.map(i => i.c))];
  $("#exCats").innerHTML = cats
    .map(c => `<button class="chip ${c === ex.cat ? "on" : ""}" data-ec="${c}">${c}</button>`)
    .join("");
  $("#exNew").innerHTML = same
    .filter(i => ex.cat === "All" || i.c === ex.cat)
    .map(i => {
      const a = avail(i),
        low = a < ex.qty;
      return `<button class="exi ${ex.nw == i.id ? "on" : ""}" data-en="${i.id}" ${low ? "disabled" : ""}><b>${i.n}</b><span>${KES(i.p)}${low ? " · low stock" : ""}</span></button>`;
    })
    .join("");
  if (ex.old && !same.length)
    $("#exNew").innerHTML = '<div class="stk">No other item here has the same price.</div>';
  $("#exReasons").innerHTML = REAS.map(
    r => `<button class="chip ${r === ex.reason ? "on" : ""}" data-er="${r}">${r}</button>`
  ).join("");
  $("#exBack").checked = !!ex.back;
  $("#exAuth").style.display = actsAlone("swap") ? "none" : "";
  const ok = ex.old && ex.nw;
  let sum = "Pick the item to replace, then the new item.";
  if (ok) {
    const o = get(ex.old),
      n = get(ex.nw);
    sum = `${ex.qty}× ${o.n} → ${ex.qty}× ${n.n} · same price, the bill doesn't change`;
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
  if (oi.p !== ni.p) return fsNote("Only items of the same price can be swapped.");
  // The swap right is enough. Only staff from before Waiter setup, with no rights list, still need a PIN.
  let by = user.n;
  if (!actsAlone("swap")) {
    const m = $("#exMsg");
    if (Date.now() < exLock) return (m.textContent = "Too many tries. Wait 30 seconds.");
    const a = USERS.find(x => BILL_AUTH.includes(x.role) && x.pin === $("#exPin").value);
    $("#exPin").value = "";
    if (!a) {
      if (++exFails >= 3) {
        exFails = 0;
        exLock = Date.now() + 30000;
      }
      return (m.textContent = "A Manager or Super Cashier PIN is needed.");
    }
    exFails = 0;
    by = a.n;
  }
  $("#exMsg").textContent = "";
  const rec = {
    q,
    from: oi.n,
    to: ni.n,
    toId: ex.nw,
    p: oi.p,
    reason: ex.reason,
    back: ex.back,
    by,
    user: user.n
  };
  {
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
      authBy: by
    });
    swapLog(o, rec);
    ordersKeep();
    $("#mEx").classList.remove("show");
    // Both stations hear about it when the two items are made in different places.
    const seen = new Set(),
      tickets = [oi, ni].flatMap(it => {
        const station = orderStation(it),
          printer = stationPrinter(it.d, station),
          key = station + "|" + (printer ? printer.n : "");
        if (seen.has(key)) return [];
        seen.add(key);
        const d = {
          no: o.no,
          ord: o.ord,
          dept: billPlace(o.lines) || o.dept,
          label: o.label,
          waiter: user ? user.n : "",
          q,
          from: oi.n,
          to: ni.n,
          reason: ex.reason,
          back: ex.back,
          by
        };
        return [{ station, printer, point: it.d, d, html: exchangeSlipHTML({ ...d, station }) }];
      });
    rcFill(
      tickets.map(x => x.html).join("") + '<div class="sl-scr" id="rcPrinted"></div>',
      null,
      "Close"
    );
    printOrderTickets(tickets, swapTicketLines, "swap").then(r => rcDone(r, "Swap sent."));
    if ($("#mSel").classList.contains("show")) selRender();
    drawCart();
  }
};
$("#exBtn").onclick = () => {
  // Only what has gone to the kitchen or bar can be swapped. Before that, just change the order.
  if (cur) return exOpen(cur);
  if (Object.keys(cart).length)
    return fsNote("Send the order first. Only a sent order can be swapped.");
  selOpen();
  fsNote("Tap Swap on a bill to swap its items.");
};

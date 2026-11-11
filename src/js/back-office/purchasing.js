// ---- Purchasing: purchase orders (LPO), receiving goods (GRN) and the purchases report ----
// Everything about buying lives here; Inventory controls the stock once it is in a store.
// Vendors, statements and payments have their own page (People → Vendors, vendors.js).
let purT = "home",
  purKeep = false; // on the way to one screen, so Purchasing shouldn't reopen on the overview
const PUR_TABS = [
  ["home", "Overview", "home"],
  ["lpo", "Purchase orders", "truck"],
  ["receive", "Receive goods", "dl"],
  ["ret", "Returns to supplier", "swap"],
  ["rpur", "Purchases report", "chart"]
];

// What each screen is for, shown at the top of it.
const PUR_PAGES = {
  lpo: [
    "Purchase orders",
    "Order from a vendor. When the goods arrive, receive them against the order."
  ],
  receive: [
    "Receive goods",
    "Record what came in, with or without a purchase order. It goes into the store you choose."
  ],
  ret: [
    "Returns to supplier",
    "Send goods back against a GRN. A manager authorises it, then print the Goods Return Note."
  ],
  rpur: ["Purchases report", "Everything received, for the dates you choose."]
};
const purGrnDay = g => String(g.date || (g.at ? ymdOf(new Date(g.at)) : ""));
/** The overview: figures, the four things people come here to do, then every part of Purchasing. */
function purHomeHTML(popups) {
  const ok = t => boTabOk("pur", t),
    vn = boCan("vn.view"),
    today = todayYmd(),
    open = LPOS.filter(p => p.status === "Open" || p.status === "Partly received"),
    late = open.filter(p => p.due && p.due < today).length,
    month = GRNS.filter(g => purGrnDay(g).slice(0, 7) === today.slice(0, 7)),
    owed = sum(VENDORS, v => Math.max(0, vendorBalance(v))),
    owing = VENDORS.filter(v => vendorBalance(v) > 0.009).length,
    plural2 = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`,
    tile = (ic, l, v, s, go) =>
      `<${go ? `button ${go}` : "div"} class="ph-t"><span class="ph-i">${I(ic)}</span><span class="ph-l">${l}</span><b>${v}</b><small>${s}</small></${go ? "button" : "div"}>`,
    quick = (ic, l, a) =>
      `<button class="ph-q" ${a}><span class="ph-i">${I(ic)}</span>${l}</button>`,
    card = (ic, t, s, meta, a) =>
      `<button class="ph-c" ${a}><span class="ph-i">${I(ic)}</span><span class="ph-b"><b>${t}</b><span>${s}</span>${meta ? `<em>${meta}</em>` : ""}</span><span class="ph-ch">${I("chev")}</span></button>`,
    tab = t => `data-a="pur_tab" data-t="${t}"`,
    vend = t => `data-a="pur_vend" data-t="${t}"`,
    tiles = [
      ok("lpo") &&
        tile(
          "truck",
          "Open orders",
          open.length,
          late ? `${late} past due` : "Waiting for delivery",
          tab("lpo")
        ),
      ok("receive") &&
        tile(
          "dl",
          "Received this month",
          month.length,
          plural2(month.length, "delivery").replace("deliverys", "deliveries"),
          tab("receive")
        ),
      vn &&
        tile(
          "wal",
          "Owed to suppliers",
          "KES " + m2(owed),
          plural2(owing, "supplier") + " to pay",
          vend("pay")
        ),
      vn && tile("users", "Suppliers", VENDORS.length, "On your list", vend("list"))
    ].filter(Boolean),
    quicks = [
      ok("lpo") && quick("plus", "New order", tab("lpo")),
      ok("receive") && quick("dl", "Receive stock", tab("receive")),
      vn && quick("users", "New supplier", 'data-a="inv_vnopen"'),
      vn && quick("wal", "Pay supplier", vend("pay"))
    ].filter(Boolean),
    cards = [
      ok("lpo") &&
        card(
          "truck",
          "Purchase orders",
          "Raise and track orders to your suppliers",
          open.length ? `${open.length} open` : "",
          tab("lpo")
        ),
      ok("receive") &&
        card(
          "dl",
          "Goods received (GRN)",
          "Record what came in, with or without an order",
          "",
          tab("receive")
        ),
      ok("ret") &&
        card(
          "swap",
          "Returns to supplier",
          "Send goods back and print the return note",
          "",
          tab("ret")
        ),
      ok("rpur") &&
        card(
          "chart",
          "Purchases report",
          "Everything received, for the dates you choose",
          "",
          tab("rpur")
        ),
      vn &&
        card(
          "users",
          "Suppliers",
          "Your supplier list, contacts and payment terms",
          "",
          vend("list")
        ),
      vn &&
        card(
          "book",
          "Statements and payments",
          "What each supplier is owed, and what you've paid",
          owing ? `KES ${m2(owed)} owed` : "",
          vend("stmt")
        )
    ].filter(Boolean);
  return `<div class="ph"><div class="ph-h"><h1>Purchases</h1><p>Orders, deliveries, returns and suppliers, all in one place.</p></div><div class="ph-ts">${tiles.join("")}</div><div class="ph-qs">${quicks.join("")}</div><div class="ph-cs">${cards.join("")}</div>${popups}</div>`;
}
function purchasingView() {
  if (!isStore(STKT.loc)) STKT.loc = STORES[0];
  if (!PUR_TABS.some(([t]) => t === purT) || !boTabOk("pur", purT))
    purT = PUR_TABS.map(([t]) => t).find(t => boTabOk("pur", t));
  if (purT === "home") return purHomeHTML(vendorPopupIfOpen());
  const openN = LPOS.filter(p => p.status === "Open" || p.status === "Partly received").length,
    body =
      purT === "ret"
        ? grReturnsHTML()
        : purT === "rpur"
          ? invReportHTML("pur")
          : purT === "receive"
            ? recvHTML() // the receiving store is chosen inside the GRN
            : ((STKT.loc = poStore()), storeBar("Purchase orders for") + lpoHTML()),
    popups = itemPopupIfOpen() + vendorPopupIfOpen() + apModalIfOpen();
  const [title, what] = PUR_PAGES[purT];
  return `<div class="inv invx inv-solo"><div class="inv-main"><nav class="ph-tabs" aria-label="Purchasing">${PUR_TABS.filter(
    ([t]) => boTabOk("pur", t)
  )
    .map(
      ([t, l, ic]) =>
        `<button class="${t === purT ? "on" : ""}" data-a="pur_tab" data-t="${t}" ${t === purT ? 'aria-current="page"' : ""}>${I(ic)}<span>${l}</span>${t === "lpo" && openN ? `<b>${openN}</b>` : ""}</button>`
    )
    .join(
      ""
    )}</nav><div class="inv-title"><h1>${title}</h1><p>${what}</p></div>${body}${popups}</div></div>`;
}

/** Compact store chooser (Purchasing doesn't need Inventory's stock cards). */
const storeBar = label =>
  `<div class="pn grn-storebar"><label>${label}<select data-iv="rc.dept">${STORES.map(l => `<option value="${esc(l)}" ${l === STKT.loc ? "selected" : ""}>${esc(l)}${l === defaultStore() ? " (default)" : ""}</option>`).join("")}</select></label></div>`;

function purAct(a, b) {
  const d = b.dataset;
  if (a === "tab") {
    purT = d.t;
    invF.vn.open = false;
    return all();
  }
  if (a === "vend") {
    vnT = d.t;
    vnKeep = true;
    return go("Vendors");
  }
  if (a === "rclpo") {
    // "Open in GRN" on a purchase order: receive it on the Goods Received Note
    invF.rc = rcBlank({ date: invF.rc.date, mode: "lpo" });
    rcLoadLpo(LPOS[+d.i]);
    purT = "receive";
    return all();
  }
  if (a === "rcsp") {
    // "Receive goods here" on a selling point: a direct receipt into that selling point
    const R = invF.rc;
    if (R.mode === "lpo") Object.assign(R, { lines: [], lpo: null, lpoPick: "", sup: "" });
    R.mode = "sp";
    R.sp = d.o;
    purT = "receive";
    purKeep = true;
    return go("Purchasing");
  }
  if (a === "go") {
    // e.g. the Receive / LPO buttons on Inventory → Stores
    STKT.loc = d.l;
    if (isStore(d.l)) invF.rc.dept = d.l;
    purT = d.t || "lpo";
    // "Receive" for a store means a direct receipt into that store.
    const R = invF.rc;
    if (purT === "receive" && R.mode !== "direct") {
      if (R.mode === "lpo") Object.assign(R, { lines: [], lpo: null, lpoPick: "", sup: "" });
      R.mode = "direct";
    }
    purKeep = true;
    return go("Purchasing");
  }
}

V.pur = purchasingView;

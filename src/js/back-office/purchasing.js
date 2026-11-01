// ---- Purchasing: purchase orders (LPO), receiving goods (GRN) and the purchases report ----
// Everything about buying lives here; Inventory controls the stock once it is in a store.
// Vendors, statements and payments have their own page (People → Vendors, vendors.js).
let purT = "lpo";
const PUR_TABS = [
  ["lpo", "Purchase orders", "truck"],
  ["receive", "Receive goods", "dl"],
  ["rpur", "Purchases report", "chart"]
];

function purchasingView() {
  if (!isStore(STKT.loc)) STKT.loc = STORES[0];
  if (!PUR_TABS.some(([t]) => t === purT)) purT = "lpo";
  const openN = LPOS.filter(p => p.status === "Open" || p.status === "Partly received").length,
    body =
      purT === "rpur"
        ? invReportHTML("pur")
        : purT === "receive"
          ? recvHTML() // the receiving store is chosen inside the GRN
          : storeBar("Purchase orders for") + lpoHTML(),
    popups = itemPopupIfOpen() + vendorPopupIfOpen() + apModalIfOpen();
  return `<div class="inv"><nav class="inv-rail">${PUR_TABS.map(
    ([t, l, ic]) =>
      `<button class="ir ${t === purT ? "on" : ""}" data-a="pur_tab" data-t="${t}">${I(ic)}<span>${l}</span>${t === "lpo" && openN ? `<b>${openN}</b>` : ""}</button>`
  ).join("")}</nav><div class="inv-main">${body}${popups}</div></div>`;
}

/** Compact store chooser (Purchasing doesn't need Inventory's stock cards). */
const storeBar = label =>
  `<div class="pn grn-storebar"><label>${label}<select data-iv="rc.dept">${opts(STORES, STKT.loc)}</select></label></div>`;

function purAct(a, b) {
  const d = b.dataset;
  if (a === "tab") {
    purT = d.t;
    invF.vn.open = false;
    return all();
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
    return go("Purchasing");
  }
  if (a === "go") {
    // e.g. the Receive / LPO buttons on Inventory → Stores
    STKT.loc = d.l;
    purT = d.t || "lpo";
    // "Receive" for a store means a direct receipt into that store.
    const R = invF.rc;
    if (purT === "receive" && R.mode !== "direct") {
      if (R.mode === "lpo") Object.assign(R, { lines: [], lpo: null, lpoPick: "", sup: "" });
      R.mode = "direct";
    }
    return go("Purchasing");
  }
}

V.pur = purchasingView;

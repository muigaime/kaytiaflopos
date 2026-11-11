// ---- Back Office core: stock view over the stores, shared state, helpers, save/load, admin account ----
const tot = k => LOCS.reduce((a, l) => a + (STK[l][k] || 0), 0);
const stock = new Proxy(
  {},
  {
    get: (t, k) => (typeof k === "string" ? tot(k) : undefined),
    set: (t, k, v) => {
      const d = v - tot(k);
      if (d) mv(STORES[0], k, d, d > 0 ? "RECEIVE" : "ADJUST", "Back Office");
      return true;
    },
    has: (t, k) => k in ING,
    ownKeys: () => Object.keys(ING),
    getOwnPropertyDescriptor: (t, k) => ({
      value: tot(k),
      enumerable: true,
      configurable: true,
      writable: true
    })
  }
);
if (!Object.keys(STK[STORES[0]]).length) seedStock();
const REQS = [],
  COUNTS = [],
  GRNS = [],
  // Local purchase orders: { id, at, store, sup, due, note, by, status, lines: [{ k, qty, price, recv }] }
  // qty / recv in buying units, price per buying unit.
  LPOS = [],
  // Vendors (suppliers): { id, name, contact, phone, email, pin, address, terms, active }
  VENDORS = [],
  // Payments to vendors: { id, at, date, vendor, amt, method, ref, note, by } (debits on the vendor statement)
  VPAYS = [],
  // Issue notes (store → selling point); stock moves when a manager approves (approvals.js)
  ISSUES = [],
  // Production runs: { id, at, by, from, to, k, qty, cost, note, lines: [{ k, q, c }] } (production.js)
  PRODS = [],
  STKT = {
    since: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    phys: {},
    narr: {},
    loc: STORES[0],
    kind: "raw",
    zero: false,
    issued: false,
    full: false
  };
const LS = "kaytia_pos_bo_v1",
  RO = {},
  INGC = {},
  // Item setup details per stock item: { code, name, group, uom, buyUnit, perBuy, buyPrice }.
  // INGC[k] (cost per unit of measure) = buyPrice / perBuy, then a weighted average as stock arrives.
  INGU = {},
  ADM = [],
  ROLE_OVER = {};
Object.keys(stock).forEach(k => (RO[k] = Math.max(1, Math.round(stock[k] * 0.2))));
const $ = s => document.querySelector(s),
  I = (n, c) => `<svg class="i"${c ? ` style="color:${c}"` : ""}><use href="#i-${n}"/></svg>`,
  K = n => Math.round(n).toLocaleString("en-KE"),
  KES = n => "KES " + K(n);
const toast = m => {
  m = kfTag(m, boUser && (boUser.role || "Super Admin"));
  const t = $("#toast");
  t.textContent = m;
  t.className = "s";
  clearTimeout(toast.t);
  // Long enough to read: confirmations can be a sentence or two.
  toast.t = setTimeout(() => (t.className = ""), Math.min(7000, 2200 + m.length * 45));
};
const sum = (a, f) => a.reduce((x, y) => x + f(y), 0),
  esc = s =>
    String(s).replace(
      /[&<>"]/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );
let boUser = null,
  view = "home",
  per = "today",
  br = "All sale points";
const POS = "#pos",
  BRS = ["All sale points", ...ALLD.filter(posSells)],
  PL = { today: "today", 7: "last 7 days", 30: "last 30 days" };
/** Rebuild the top-bar sale point filter after selling points change. */
function refreshBRS() {
  BRS.length = 1;
  BRS.push(...ALLD.filter(posSells));
  if (!BRS.includes(br)) br = BRS[0];
  $("#br").innerHTML = BRS.map(
    k => `<option ${k === br ? "selected" : ""}>${esc(k)}</option>`
  ).join("");
}
$("#br").innerHTML = BRS.map(k => `<option>${k}</option>`).join("");
// Set while a restore is under way, so that the old data in memory can't be saved over the new.
let boFrozen = false;
function bosave() {
  if (boFrozen) return;
  try {
    localStorage.setItem(
      LS,
      JSON.stringify({
        S: SALES,
        I: ITEMS,
        K: STK,
        MV: MOV.slice(-4000),
        RQ: REQS,
        CT: COUNTS,
        GN: GRNS,
        LP: LPOS,
        VN: VENDORS,
        VP: VPAYS,
        BL: BILLLOG,
        OR: orders,
        KD: KDS,
        RN: rno,
        TB: TBL,
        FB: FREE_BILLS,
        IS: ISSUES,
        PD: PRODS,
        ST: STORES,
        OL: ALLD,
        OI: OUTLET_INFO,
        SS: STKT.since,
        G: ING,
        R: RO,
        X: INGC,
        IU: INGU,
        A: ADM,
        LI: LIC.s,
        BR: ROLE_OVER,
        D: DAYS,
        H: SHIFTS,
        P: PAYOUTS,
        RM: ROOMS,
        RV: RESERVATIONS,
        FS: FD_SETTINGS,
        RT: ROOMTYPES,
        GR: GROUPS,
        U: USERS,
        C: CU
      })
    );
  } catch (e) {
    try {
      fsNote("Browser storage is full. Remove some ID copies or old records.");
    } catch (x) {}
  }
}
window.bosave = bosave;
/** Puts saved data into memory: at start-up, and again when another computer's changes arrive. */
function boLoad(s, again) {
  // After Clear all data the save is the whole truth: the built-in demo lists stay out.
  if (again || (s.FS || {}).noSeeds) {
    SALES.length = 0;
    FREE_BILLS.length = 0;
    [OUTLET_INFO, ING, RO, INGC, INGU, ROLE_OVER].forEach(o =>
      Object.keys(o).forEach(k => delete o[k])
    );
    Object.keys(FD_SETTINGS).forEach(k => {
      if (!(k in (s.FS || {}))) delete FD_SETTINGS[k];
    });
  }
  if ((s.FS || {}).noSeeds) Object.keys(STK).forEach(k => delete STK[k]);
  SALES.push(...s.S.map(x => ({ ...x, at: new Date(x.at) })));
  ITEMS.length = 0;
  ITEMS.push(...s.I.filter(i => i.d !== "Supermarket"));
  // Stores and selling points first: the stock maps below are keyed by them.
  if (s.ST && s.ST.length) STORES.splice(0, STORES.length, ...s.ST);
  if (s.OL && s.OL.length) ALLD.splice(0, ALLD.length, ...s.OL.filter(o => o !== "Supermarket"));
  Object.assign(OUTLET_INFO, s.OI || {});
  delete OUTLET_INFO.Supermarket;
  Object.values(OUTLET_INFO).forEach(i => {
    if (i.type === "Shop") i.type = "Other";
  });
  syncLocs();
  if (s.K && typeof Object.values(s.K)[0] === "object")
    LOCS.forEach(l => {
      STK[l] = s.K[l] || {};
    });
  MOV.length = 0;
  MOV.push(...(s.MV || []));
  REQS.length = 0;
  REQS.push(...(s.RQ || []));
  COUNTS.length = 0;
  COUNTS.push(...(s.CT || []));
  GRNS.length = 0;
  GRNS.push(...(s.GN || []));
  LPOS.length = 0;
  LPOS.push(...(s.LP || []));
  VENDORS.length = 0;
  VENDORS.push(...(s.VN || []));
  VPAYS.length = 0;
  VPAYS.push(...(s.VP || []));
  BILLLOG.length = 0;
  BILLLOG.push(...(s.BL || []));
  // Open orders: a line whose product has since gone is dropped, so one bad line can't stop the POS.
  orders.length = 0;
  (s.OR || []).forEach(o => {
    o.at = new Date(o.at);
    Object.keys(o.lines || {}).forEach(id => {
      if (!get(id)) delete o.lines[id];
    });
    if (Object.keys(o.lines || {}).length) orders.push(o);
  });
  KDS.length = 0;
  KDS.push(...(s.KD || []));
  ISSUES.length = 0;
  ISSUES.push(...(s.IS || []));
  PRODS.length = 0;
  PRODS.push(...(s.PD || []));
  if (s.SS) STKT.since = s.SS;
  Object.assign(ING, s.G);
  Object.assign(RO, s.R);
  Object.assign(INGC, s.X || {});
  Object.assign(INGU, s.IU || {});
  Object.values(INGU).forEach(u => {
    if (u.group === "Groceries") u.group = "Dry goods";
  });
  USERS.length = 0;
  USERS.push(...s.U);
  CU.length = 0;
  CU.push(...s.C);
  ADM.length = 0;
  ADM.push(...(s.A || []));
  Object.assign(ROLE_OVER, s.BR || {});
  DAYS.length = 0;
  DAYS.push(...(s.D || []));
  SHIFTS.length = 0;
  SHIFTS.push(...(s.H || []));
  PAYOUTS.length = 0;
  PAYOUTS.push(...(s.P || []));
  ROOMS.length = 0;
  ROOMS.push(...(s.RM || []));
  RESERVATIONS.length = 0;
  RESERVATIONS.push(...(s.RV || []));
  Object.assign(FD_SETTINGS, s.FS || {});
  // Class C used to mean zero-rated. Those items stay untaxed now that C is a real tax.
  if (!FD_SETTINGS.tax) {
    ITEMS.forEach(i => {
      if (i.t === "C") i.t = "A";
    });
    FD_SETTINGS.tax = { B: 16, C: 0 };
  }
  taxApply();
  ROOMTYPES.length = 0;
  ROOMTYPES.push(...(s.RT || []));
  GROUPS.length = 0;
  GROUPS.push(...(s.GR || []));
  // Older bills were NBO-001042 and open orders ORD-001. They move to the plain numbers, once.
  const moved = {},
    plain = x => (/^NBO-\d+$/.test(x) ? pad(+x.slice(4), 5) : moved[x] || x);
  const top = SALES.reduce((a, x) => Math.max(a, +String(x.no).replace(/^NBO-/, "") || 0), 0);
  rno = Math.max(rno, s.RN || 0, top + 1);
  FREE_BILLS.push(...(s.FB || []));
  if (s.TB) {
    TBL.length = 0;
    TBL.push(...s.TB);
  }
  orders.forEach(o => {
    if (!/^ORD-/.test(o.no)) return;
    o.ord = o.ord || +o.no.slice(4) || "";
    moved[o.no] = pad(rno++, 5);
    o.no = moved[o.no];
  });
  SALES.forEach(x => {
    x.no = plain(x.no);
    if (x.ret) x.ret.of = plain(x.ret.of);
  });
  BILLLOG.forEach(x => (x.no = plain(x.no)));
}
try {
  const saved = JSON.parse(localStorage.getItem(LS) || "null");
  if (saved) boLoad(saved);
} catch (e) {}
// Repair saved data from older or interrupted versions, so one bad value can't stop the app from opening.
(function () {
  try {
    const clean = L => [...new Set(L.filter(x => typeof x === "string" && x.trim()))],
      st = clean(STORES),
      sp = clean(ALLD).filter(x => !st.includes(x));
    STORES.splice(0, STORES.length, ...(st.length ? st : ["Main Store"]));
    ALLD.splice(0, ALLD.length, ...(sp.length ? sp : ["Bar"]));
    ALLD.forEach(o => {
      const info = { type: "Other", store: STORES[0], ...(OUTLET_INFO[o] || {}) };
      if (!STORES.includes(info.store)) info.store = STORES[0];
      OUTLET_INFO[o] = info;
    });
    // Every hotel starts with one materials store for the kitchen (Recipes & Production).
    if (!ALLD.some(isMaterials)) {
      const name = "Kitchen Materials";
      if (!st.includes(name)) {
        if (!ALLD.includes(name)) ALLD.push(name);
        OUTLET_INFO[name] = {
          type: MATERIALS,
          store: STORES.find(s => /kitchen/i.test(s)) || STORES[0]
        };
      }
    }
    // Recipes deduct straight from the materials store. A single item attached to production stays
    // where that item is held; a plain product (one stock item, no source) stays at its selling point.
    const mat = ALLD.find(isMaterials);
    if (mat)
      ITEMS.forEach(i => {
        const K = Object.keys(i.r || {});
        if (isMaterials(i.from)) return;
        const made = K.length === 1 && i.from && PRODS.some(x => x.k === K[0] && x.to === i.from);
        if (!made && (K.length > 1 || i.from)) i.from = mat;
      });
    fdBrand(); // the saved hotel name reaches the POS
    posOptsApply();
    Object.keys(STK).forEach(l => {
      if (!STK[l] || typeof STK[l] !== "object") STK[l] = {};
    });
    syncLocs();
    USERS.forEach(u => {
      u.d = Array.isArray(u.d) ? u.d.filter(d => ALLD.includes(d)) : [];
      if (!u.d.length) u.d = [ALLD[0]];
    });
    ITEMS.forEach(i => {
      if (!i.r || typeof i.r !== "object") i.r = {};
    });
  } catch (e) {
    console.error("Could not repair saved data", e);
  }
})();
refreshBRS();
USERS.forEach((u, i) => {
  if (!u.card) u.card = "KT" + String(i + 1).padStart(4, "0");
  if (!u.role)
    u.role = u.d.filter(posSells).length >= ALLD.filter(posSells).length ? "Manager" : "Waiter";
});
/** The short hash older copies saved when the browser had no SHA-256 (phones and tills on plain http). */
const Hold = t => {
  let h = 5381;
  for (const c of "kaytia|" + t) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return "x" + h;
};
/** SHA-256 of a password. On plain http (a phone on the Wi-Fi) the browser has none, so our own gives the same answer. */
const H = async t => {
  const s = "kaytia|" + t;
  try {
    if (window.crypto && crypto.subtle)
      return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
  } catch (e) {}
  try {
    return LIC.sha256(s);
  } catch (e) {
    return Hold(t);
  }
};
/** Does this saved hash belong to that password (either kind)? */
const hashIs = async (saved, t) => !!saved && (saved === (await H(t)) || saved === Hold(t));
if (!ADM.length)
  H("admin|admin123").then(h => {
    if (!ADM.length) {
      ADM.push({ u: "admin", n: "Administrator", ph: h });
      bosave();
    }
  });

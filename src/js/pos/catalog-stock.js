const $ = s => document.querySelector(s),
  KES = n =>
    "KES " +
    Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// An item's tax: B is VAT, C is Tax C, BC is both, A is no tax. Rates are set in Back Office → Settings.
const TAX = { A: 0, B: 16, C: 0, BC: 16 };
function taxApply() {
  const x = FD_SETTINGS.tax || {};
  TAX.B = x.B === undefined ? 16 : x.B;
  TAX.C = x.C || 0;
  TAX.BC = TAX.B + TAX.C;
}
const taxChoices = () => [
  ["B", `VAT ${TAX.B}%`],
  ["C", `Tax C ${TAX.C}%`],
  ["BC", `VAT and Tax C ${TAX.BC}%`],
  ["A", "No tax"]
];
const taxName = () => (TAX.C ? "Tax" : "VAT");
// stock of raw ingredients, per department (base units)
const STOCK0 = {
  whisky: 7500,
  tusker: 96,
  soda: 80,
  water: 48,
  flour: 12000,
  cheese: 4000,
  sauce: 3000,
  potato: 9000,
  bun: 30,
  beef: 3500,
  rice: 20000,
  sugar: 60,
  milk: 40,
  bread: 25
};
// Stores hold purchased stock (Back Office > Inventory). Selling points (ALLD) are the bars, kitchens,
// restaurants and kitchens that receive stock from a store and sell it on the POS; each keeps its own stock.
// Both lists can grow (Back Office); LOCS = stores + selling points, and STK has one stock map per place.
const STORES = ["Main Store"],
  ALLD = ["Bar", "Kitchen"],
  OUTLET_INFO = {
    Bar: { type: "Bar", store: "Main Store" },
    Kitchen: { type: "Kitchen", store: "Main Store" }
  },
  LOCS = [],
  STK = {},
  MOV = [];
/** Rebuild LOCS after a store or selling point is added (keeps the same array, other code holds it). */
function syncLocs() {
  LOCS.length = 0;
  LOCS.push(...STORES, ...ALLD);
  LOCS.forEach(l => (STK[l] = STK[l] || {}));
}
syncLocs();
const isStore = l => STORES.includes(l);
// A materials store (e.g. Kitchen Materials) is a place under Selling points that holds ingredients:
// it gets issues and stock takes like a selling point, but never appears on the POS.
const MATERIALS = "Materials store";
const isMaterials = l => (OUTLET_INFO[l] || {}).type === MATERIALS;
const posSells = l => ALLD.includes(l) && !isMaterials(l);
function mv(loc, k, q, t, note, peer, ref, by) {
  STK[loc][k] = (STK[loc][k] || 0) + q;
  MOV.push({
    at: Date.now(),
    pc: auditMachine(),
    loc,
    k,
    q,
    t,
    note: note || "",
    peer: peer || "",
    ref: ref || "",
    by: by || (typeof user !== "undefined" && user ? user.n : "")
  });
  if (MOV.length > 6000) MOV.splice(0, MOV.length - 6000);
}
const curLoc = () => (STK[dept] ? dept : "Bar");
/** The view that shows every sale point a waiter is ticked for, all at once. */
const ALLP = "All sale points";
/** Is item i on the menu of view d? */
const inPoint = (i, d) => (d === ALLP ? DEPTS.includes(i.d) : i.d === d);
/** Where a product's ingredients are deducted: its materials store (recipes), else where it is sold. */
const itemLoc = it => (it.from && STK[it.from] ? it.from : STK[it.d] ? it.d : curLoc());
// Stock conversion: a tot's balance fills up from bottles issued to the same selling point.
// The POS draws itself before the settings have loaded, and nothing is converted until they have.
const stockConvs = () =>
  typeof FD_SETTINGS === "undefined" ? {} : FD_SETTINGS.stockConv || (FD_SETTINGS.stockConv = {});
const stockConvGone = () =>
  typeof FD_SETTINGS === "undefined"
    ? {}
    : FD_SETTINGS.stockConvGone || (FD_SETTINGS.stockConvGone = {});
/** Stock items you can buy, issue or choose. A converted balance only ever comes from conversion. */
const pickKeys = () => Object.keys(ING).filter(k => !stockConvs()[k] && !stockConvGone()[k]);
/** What a selling point can use of an item: what it holds, plus what its unopened bottles would give. */
function stockCanUse(loc, k) {
  const held = STK[loc][k] || 0,
    c = stockConvs()[k];
  return c ? held + Math.floor((STK[loc][c.from] || 0) / c.pq + 1e-9) * c.y : held;
}
/** Opens as many bottles as this sale needs, when the balance won't cover it. */
function stockConvert(loc, k, need) {
  const c = stockConvs()[k],
    short = need - (STK[loc][k] || 0);
  if (!c || short <= 1e-9) return;
  const open = Math.min(
    Math.ceil(short / c.y - 1e-9),
    Math.floor((STK[loc][c.from] || 0) / c.pq + 1e-9)
  );
  if (open <= 0) return;
  const note = `${open * c.pq} converted to ${open * c.y}`;
  mv(loc, c.from, -open * c.pq, "CONVERT", note);
  mv(loc, k, open * c.y, "CONVERT", note);
}
/** Sell n of a product (a negative n puts the stock back). */
function itemStockMove(it, n) {
  const loc = itemLoc(it);
  Object.entries(it.r).forEach(([k, v]) => {
    if (n > 0) stockConvert(loc, k, v * n);
    mv(loc, k, -v * n, n > 0 ? "SALE" : "SALE_RET", "POS");
  });
}
const stock = new Proxy(
  {},
  {
    get: (t, k) => (typeof k === "string" ? STK[curLoc()][k] : undefined),
    set: (t, k, v) => {
      const o = STK[curLoc()][k] || 0,
        d = v - o;
      if (d) mv(curLoc(), k, d, d < 0 ? "SALE" : "SALE_RET", "POS");
      else STK[curLoc()][k] = v;
      return true;
    },
    has: (t, k) => k in STK[curLoc()],
    ownKeys: () => Reflect.ownKeys(STK[curLoc()]),
    getOwnPropertyDescriptor: (t, k) => ({
      value: STK[curLoc()][k],
      enumerable: true,
      configurable: true,
      writable: true
    })
  }
);
function seedStock() {
  const use = {};
  ITEMS.forEach(i =>
    Object.keys(i.r).forEach(k => {
      (use[k] = use[k] || new Set()).add(i.d);
    })
  );
  Object.keys(STOCK0).forEach(k => {
    LOCS.forEach(l => (STK[l][k] = 0));
    STK[STORES[0]][k] = STOCK0[k];
    const ds = [...(use[k] || [])];
    ds.forEach(d => {
      if (STK[d]) STK[d][k] = Math.round((STOCK0[k] * 0.5) / ds.length);
    });
  });
}
const ING = {
  whisky: "Whiskey (ml)",
  tusker: "Tusker",
  soda: "Soda",
  water: "Water",
  flour: "Flour (g)",
  cheese: "Cheese (g)",
  sauce: "Sauce (g)",
  potato: "Potato (g)",
  bun: "Buns",
  beef: "Beef (g)",
  rice: "Rice (g)",
  sugar: "Sugar 2kg",
  milk: "Milk 500ml",
  bread: "Bread"
};
let DEPTS = ALLD.filter(posSells);
const ITEMS = [
  { id: 1, n: "Whiskey Shot (tot)", d: "Bar", c: "Spirits", p: 300, t: "B", r: { whisky: 25 } },
  { id: 2, n: "Whiskey Double", d: "Bar", c: "Spirits", p: 550, t: "B", r: { whisky: 50 } },
  { id: 3, n: "Tusker Lager", d: "Bar", c: "Beer", p: 350, t: "B", r: { tusker: 1 } },
  { id: 4, n: "Soda 300ml", d: "Bar", c: "Soft drinks", p: 100, t: "B", r: { soda: 1 } },
  { id: 5, n: "Water 500ml", d: "Bar", c: "Soft drinks", p: 80, t: "B", r: { water: 1 } },
  {
    id: 6,
    n: "Margherita Pizza",
    d: "Kitchen",
    c: "Pizza",
    p: 1100,
    t: "B",
    r: { flour: 250, cheese: 100, sauce: 50 }
  },
  { id: 7, n: "Chips Plain", d: "Kitchen", c: "Sides", p: 250, t: "B", r: { potato: 300 } },
  {
    id: 8,
    n: "Beef Burger",
    d: "Kitchen",
    c: "Burgers",
    p: 700,
    t: "B",
    r: { bun: 1, beef: 150, cheese: 20 }
  },
  { id: 9, n: "Water 500ml", d: "Kitchen", c: "Drinks", p: 80, t: "B", r: { water: 1 } },
  {
    id: 14,
    n: "Cheese Burger",
    d: "Kitchen",
    c: "Burgers",
    p: 800,
    t: "B",
    r: { bun: 1, beef: 150, cheese: 40 }
  },
  {
    id: 15,
    n: "Beef Pilau",
    d: "Kitchen",
    c: "Africans",
    p: 450,
    t: "B",
    r: { rice: 200, beef: 150 }
  },
  { id: 16, n: "Chapati", d: "Kitchen", c: "Africans", p: 50, t: "B", r: { flour: 80 } },
  { id: 17, n: "Rice Plain", d: "Kitchen", c: "Africans", p: 150, t: "B", r: { rice: 200 } },
  { id: 18, n: "Beef Stew", d: "Kitchen", c: "Beef", p: 400, t: "B", r: { beef: 200 } },
  { id: 19, n: "Chips Masala", d: "Kitchen", c: "Sides", p: 300, t: "B", r: { potato: 300 } },
  { id: 20, n: "Soda 300ml", d: "Kitchen", c: "Drinks", p: 100, t: "B", r: { soda: 1 } }
];

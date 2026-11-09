// ---- Back Office access rights: every right, who gets it by default, and the checks ----
// A right belongs to a role. Super Admin always has everything, so the system can't be locked out.
// [key, description, module, function group]
const BO_RIGHTS = [
  ["home.money", "View sales and money figures on the dashboard.", "DASHBOARD", "ACCESS"],
  ["pos.open", "Open the POS terminal.", "POINT OF SALE", "ACCESS"],
  ["sales.view", "View Sales and Orders.", "SALES", "BILLS"],
  ["sales.reprint", "Reprint bills and credit notes.", "SALES", "BILLS"],
  ["sales.return", "Return items from a paid bill.", "SALES", "BILLS"],
  ["shift.view", "View shifts and the business day.", "SHIFTS", "ACCESS"],
  ["shift.day", "Start and end the business day.", "SHIFTS", "DAY"],
  ["shift.manage", "Open and close staff shifts.", "SHIFTS", "STAFF SHIFTS"],
  ["fo.open", "Sign in to the Front Desk.", "FRONTOFFICE", "ACCESS"],
  ["fo.desk", "Work the desk: rooms, bookings, guests and payments.", "FRONTOFFICE", "DESK"],
  ["fo.hk", "Housekeeping: change room status.", "FRONTOFFICE", "HOUSEKEEPING"],
  [
    "fo.hksup",
    "Housekeeping supervisor: assign rooms to housekeepers.",
    "FRONTOFFICE",
    "HOUSEKEEPING"
  ],
  [
    "fo.settings",
    "Change Front Desk settings: rooms, rates and meal plans.",
    "FRONTOFFICE",
    "SETTINGS"
  ],
  ["rep.rooms", "View room reports.", "FRONTOFFICE", "REPORTS"],
  ["pur.lpo", "Create and manage purchase orders.", "PURCHASING", "ORDERS"],
  ["pur.receive", "Receive goods into a store.", "PURCHASING", "RECEIVING"],
  ["pur.report", "View the purchases report.", "PURCHASING", "REPORTS"],
  ["inv.stores", "View and create stores.", "INVENTORY", "STORES"],
  [
    "inv.approve",
    "Approve or reject purchase orders, requisitions and issues.",
    "INVENTORY",
    "APPROVALS"
  ],
  ["inv.items", "Create and edit stock items.", "INVENTORY", "ITEMS"],
  ["inv.master", "Use Stock Master and stock taking.", "INVENTORY", "STOCK"],
  ["inv.req", "Make and view requisitions.", "INVENTORY", "MOVEMENTS"],
  ["inv.issue", "Issue stock from a store.", "INVENTORY", "MOVEMENTS"],
  ["inv.damage", "Record damaged stock.", "INVENTORY", "MOVEMENTS"],
  [
    "inv.reports",
    "View issue, damage, stock position and stock take reports.",
    "INVENTORY",
    "REPORTS"
  ],
  ["prod.manage", "Manage products and prices.", "PRODUCTS", "PRODUCTS"],
  ["sp.view", "View selling points.", "SELLING POINTS", "ACCESS"],
  ["sp.manage", "Create, change and delete selling points.", "SELLING POINTS", "SETUP"],
  [
    "sp.move",
    "Transfer stock and make requisitions for selling points.",
    "SELLING POINTS",
    "MOVEMENTS"
  ],
  ["rec.view", "View kitchen materials, balances and the production log.", "KITCHEN", "ACCESS"],
  ["rec.issue", "Issue stock to kitchen materials.", "KITCHEN", "MATERIALS"],
  ["rec.prod", "Run production batches.", "KITCHEN", "PRODUCTION"],
  ["rec.recipes", "Create and edit recipes.", "KITCHEN", "RECIPES"],
  ["rec.report", "View the recipe and production report.", "KITCHEN", "REPORTS"],
  ["cust.view", "View customers and what they owe.", "CUSTOMERS", "ACCESS"],
  ["cust.manage", "Add credit customers.", "CUSTOMERS", "SETUP"],
  ["cust.pay", "Record customer payments.", "CUSTOMERS", "PAYMENTS"],
  ["vn.view", "View vendors and statements.", "VENDORS", "ACCESS"],
  ["vn.pay", "Record vendor payments.", "VENDORS", "PAYMENTS"],
  ["rep.sales", "View sales, item and revenue reports.", "REPORTS", "SALES"],
  ["rep.bills", "View the Bills Report.", "REPORTS", "BILLS"],
  ["rep.control", "View void, discount, return, merge and split reports.", "REPORTS", "CONTROL"],
  ["rep.staff", "View staff and commission reports.", "REPORTS", "STAFF"],
  ["rep.print", "Print and export reports.", "REPORTS", "PRINTING"],
  ["fin.menu", "See the Accounting, Expenses and M-Pesa menus.", "FINANCE", "ACCESS"],
  ["ws.manage", "Create and edit waiters.", "ADMINISTRATION", "STAFF"],
  ["users.manage", "Manage back office users and role rights.", "ADMINISTRATION", "SECURITY"],
  ["set.manage", "Change hotel details, printers and settings.", "ADMINISTRATION", "SETTINGS"],
  ["tables.manage", "Create and edit tables and takeaways.", "POINT OF SALE", "TABLES"]
].map(([k, d, m, g], i) => ({ k, d, m, g, id: i + 1, num: 301 + i }));
const SUPER = "Super Admin";
const ALL_KEYS = BO_RIGHTS.map(r => r.k);
const except = (...L) => ALL_KEYS.filter(k => !L.includes(k));
const ROLE_DEFAULTS = {
  "General Manager": except("users.manage"),
  Manager: except("users.manage", "set.manage", "fo.settings"),
  Director: [
    "home.money",
    "sales.view",
    "shift.view",
    "rep.rooms",
    "pur.report",
    "inv.reports",
    "rec.report",
    "cust.view",
    "vn.view",
    "rep.sales",
    "rep.bills",
    "rep.control",
    "rep.staff",
    "rep.print"
  ],
  Supervisor: [
    "pos.open",
    "tables.manage",
    "sales.view",
    "sales.reprint",
    "shift.view",
    "shift.day",
    "shift.manage",
    "inv.req",
    "sp.view",
    "sp.move",
    "rep.bills",
    "rep.control",
    "rep.print"
  ],
  Accountant: [
    "home.money",
    "sales.view",
    "sales.reprint",
    "shift.view",
    "rep.rooms",
    "pur.report",
    "cust.view",
    "cust.manage",
    "cust.pay",
    "vn.view",
    "vn.pay",
    "rep.sales",
    "rep.bills",
    "rep.control",
    "rep.staff",
    "rep.print",
    "fin.menu"
  ],
  Finance: [
    "home.money",
    "sales.view",
    "sales.reprint",
    "sales.return",
    "shift.view",
    "rep.rooms",
    "pur.report",
    "cust.view",
    "cust.manage",
    "cust.pay",
    "vn.view",
    "vn.pay",
    "rep.sales",
    "rep.bills",
    "rep.control",
    "rep.staff",
    "rep.print",
    "fin.menu"
  ],
  Controller: [
    "home.money",
    "sales.view",
    "sales.reprint",
    "sales.return",
    "shift.view",
    "rep.rooms",
    "pur.report",
    "inv.approve",
    "inv.master",
    "inv.reports",
    "rec.report",
    "cust.view",
    "vn.view",
    "rep.sales",
    "rep.bills",
    "rep.control",
    "rep.staff",
    "rep.print",
    "fin.menu"
  ],
  Store: [
    "pur.receive",
    "pur.report",
    "inv.stores",
    "inv.items",
    "inv.master",
    "inv.req",
    "inv.issue",
    "inv.damage",
    "inv.reports",
    "sp.view",
    "rep.print"
  ],
  Procurement: [
    "pur.lpo",
    "pur.receive",
    "pur.report",
    "inv.req",
    "inv.reports",
    "vn.view",
    "rep.print"
  ],
  Housekeeping: ["fo.open", "fo.hk"],
  "Housekeeping Supervisor": ["fo.open", "fo.hk", "fo.hksup"],
  "Front Office": ["fo.open", "fo.desk", "fo.hk", "rep.rooms", "rep.print", "cust.view"],
  Chef: [
    "inv.req",
    "inv.reports",
    "sp.view",
    "sp.move",
    "rec.view",
    "rec.issue",
    "rec.prod",
    "rec.recipes",
    "rec.report",
    "rep.print"
  ],
  Security: ["rep.rooms", "rep.print"],
  Sales: [
    "sales.view",
    "fo.open",
    "fo.desk",
    "fo.hk",
    "rep.rooms",
    "cust.view",
    "cust.manage",
    "rep.sales",
    "rep.bills",
    "rep.print"
  ]
};
const BO_ROLES = [...Object.keys(ROLE_DEFAULTS)];
/** Roles the business added itself. They start with no rights. */
const roleCustom = () => FD_SETTINGS.customRoles || (FD_SETTINGS.customRoles = []);
const boRoles = () => [...BO_ROLES, ...roleCustom()];
/** Does this role have this right, counting any changes made on the rights table? */
const roleHas = (role, k) => {
  if (role === SUPER) return true;
  const o = ROLE_OVER[role];
  return o && k in o ? o[k] : (ROLE_DEFAULTS[role] || []).includes(k);
};
const boCan = k => !boUser || roleHas(boUser.role || SUPER, k);
const anyOf = (...L) => L.some(boCan);
const PAGE_RIGHTS = {
  "Point of Sale": ["pos.open"],
  "Open POS terminal": ["pos.open"],
  "Front Desk": ["fo.open"],
  "Sales & Orders": ["sales.view"],
  "Shifts & Day": ["shift.view"],
  Purchasing: ["pur.lpo", "pur.receive", "pur.report"],
  "Products List": ["prod.manage"],
  Inventory: [
    "inv.stores",
    "inv.approve",
    "inv.items",
    "inv.master",
    "inv.req",
    "inv.issue",
    "inv.damage",
    "inv.reports"
  ],
  "Selling points": ["sp.view"],
  Tables: ["tables.manage"],
  "Recipes & Production": ["rec.view", "rec.report"],
  Accounting: ["fin.menu"],
  "Expenses & Income": ["fin.menu"],
  "M-Pesa & eTIMS": ["fin.menu"],
  "Waiter setup": ["ws.manage"],
  Customers: ["cust.view"],
  Vendors: ["vn.view"],
  "HR & Payroll": ["users.manage"],
  Reports: ["rep.sales", "rep.bills", "rep.control", "rep.staff"],
  "Room reports": ["rep.rooms"],
  "Audit log": ["users.manage"],
  "Users & roles": ["users.manage"],
  Settings: ["set.manage"],
  License: ["users.manage"]
};
const boPageOk = n => {
  if (!fdOn() && (n === "Front Desk" || n === "Room reports")) return false;
  const L = PAGE_RIGHTS[String(n).replace("&amp;", "&")];
  return !L || anyOf(...L);
};
const TAB_RIGHTS = {
  inv: {
    stores: "inv.stores",
    appr: "inv.approve",
    items: "inv.items",
    cats: "inv.items",
    master: "inv.master",
    req: "inv.req",
    issue: "inv.issue",
    damage: "inv.damage",
    riss: "inv.reports",
    rdmg: "inv.reports",
    position: "inv.reports",
    spstock: "inv.reports",
    variance: "inv.reports",
    track: "inv.reports",
    streps: "inv.reports"
  },
  pur: { lpo: "pur.lpo", receive: "pur.receive", ret: "pur.receive", rpur: "pur.report" },
  rec: {
    overview: "rec.view",
    report: "rec.report",
    pbal: "rec.view",
    allp: "rec.view",
    log: "rec.view",
    prod: "rec.prod",
    recipes: "rec.recipes"
  },
  vn: { list: "vn.view", stmt: "vn.view", pay: "vn.pay" }
};
const boTabOk = (g, t) => !TAB_RIGHTS[g][t] || boCan(TAB_RIGHTS[g][t]);
/** What a button in a page needs. Pages and tabs have their own checks above. */
const ACT_RIGHTS = {
  ret: "sales.return",
  sales_print: "sales.reprint",
  dstart: "shift.day",
  dend: "shift.day",
  sstart: "shift.manage",
  sauth: "shift.manage",
  sfloat: "shift.manage",
  sdecl: "shift.manage",
  send: "shift.manage",
  addp: "prod.manage",
  rep_print: "rep.print",
  inv_stnew: "inv.stores",
  inv_stedit: "inv.stores",
  inv_stsave: "inv.stores",
  inv_stdel: "inv.stores",
  inv_stdelyes: "inv.stores",
  inv_pomake: "pur.lpo",
  inv_poladd: "pur.lpo",
  inv_poldel: "pur.lpo",
  inv_poclose: "pur.lpo",
  inv_pocancel: "pur.lpo",
  inv_porecv: "pur.receive",
  inv_rcpost: "pur.receive",
  inv_rqissue: "inv.issue",
  inv_rqrej: "inv.issue",
  inv_isspost: "inv.issue",
  inv_dmpost: "inv.damage",
  ap_open: "inv.approve",
  ap_ok: "inv.approve",
  ap_issue: "inv.issue",
  vs_pay: "vn.pay",
  vs_payall: "vn.pay",
  vs_paynow: "vn.pay",
  sp_add: "sp.manage",
  sp_addprod: "sp.manage",
  sp_delask: "sp.manage",
  sp_delyes: "sp.manage",
  sp_delprod: "sp.manage",
  sp_psave: "sp.manage",
  sp_trpost: "sp.move",
  sp_rqmake: "sp.move",
  rec_issue: "rec.issue",
  rec_run: "rec.prod",
  mp_esave: "set.manage",
  mp_etest: "set.manage",
  mp_eretry: "set.manage",
  mp_dsave: "set.manage",
  mp_msave: "set.manage",
  mp_test: "set.manage",
  inv_nrqgo: "inv.req",
  su_clear: "set.manage",
  su_send: "set.manage",
  rm_save: "set.manage",
  rm_add: "set.manage",
  rm_del: "set.manage",
  rm_acsave: "set.manage",
  rm_actest: "set.manage",
  rm_send: "set.manage",
  sp_catoff: "sp.manage",
  sp_catmove: "sp.manage",
  rec_rsave: "rec.recipes",
  rec_dirr: "rec.recipes",
  rec_dirp: "rec.prod",
  rec_rdel: "rec.recipes"
};
const boDenied = () => toast("Your role doesn't include this. Ask your administrator.");
const REP_CONTROL = ["cmp", "rets", "swp", "blog", "vall", "dlog", "msp"];
const repRight = (k, title) =>
  k === "bills"
    ? "rep.bills"
    : REP_CONTROL.includes(k)
      ? "rep.control"
      : /staff|waiter|commission|tips/i.test(title)
        ? "rep.staff"
        : "rep.sales";
/** Fits the Back Office to who has just signed in. */
function applyBoRights() {
  document.querySelectorAll("#nav .nv[data-n]").forEach(b => {
    b.style.display = boPageOk(b.dataset.n) ? "" : "none";
  });
  document.querySelectorAll("#nav .sec").forEach(s => {
    let x = s.nextElementSibling,
      any = false;
    while (x && !x.classList.contains("sec")) {
      if (x.style.display !== "none") any = true;
      x = x.nextElementSibling;
    }
    s.style.display = any ? "" : "none";
  });
  $("#newreq").style.display = boCan("inv.req") ? "" : "none";
  $("#urole").textContent = boUser ? boUser.role || SUPER : "";
  const money = boCan("home.money"),
    show = (el, on) => el && (el.style.display = on ? "" : "none");
  $("#vHome").classList.toggle("nomoney", !money);
  show($("#kl").parentElement, money);
  show($("#kpis"), money);
  show($("#pl").parentElement, money);
  show(document.querySelector("#vHome .g2"), money);
  show($("#ins").closest(".card"), money);
  show($("#act").closest(".card"), money);
  show($("#apv").closest(".card"), boCan("inv.approve"));
  view = "home";
  document
    .querySelectorAll("#nav .nv")
    .forEach(b => b.classList.toggle("on", b.dataset.n === "Home"));
}

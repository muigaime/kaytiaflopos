// ---- Back Office navigation: page titles, render() and go() ----
const TTL = {
    shift: "Shifts & Day",
    rep: "Reports",
    sales: "Sales & Orders",
    prod: "Products",
    inv: "Inventory",
    outlets: "Selling points",
    pur: "Purchasing",
    vendors: "Vendors",
    staff: "Users & roles",
    cred: "Customers"
  },
  VIEW = {
    "Shifts & Day": "shift",
    "Reports": "rep",
    "Sales & Orders": "sales",
    "Products": "prod",
    "Inventory": "inv",
    "Selling points": "outlets",
    "Purchasing": "pur",
    "Vendors": "vendors",
    "Customers": "cred",
    "Users & roles": "staff"
  };
function render() {
  const h = view === "home";
  $("#vHome").style.display = h ? "" : "none";
  $("#vSub").style.display = h ? "none" : "";
  if (h) return;
  $("#vSub").innerHTML =
    (view === "inv"
      ? ""
      : `<div class="hello"><div><h1>${TTL[view]}</h1><p>${view === "sales" ? br + " · " + PL[per] : view === "rep" ? "Run any report for a date range and sale point" : view === "outlets" ? "Bars, restaurants, kitchens and shops that get stock from a store and sell on the POS" : view === "pur" ? "Purchase orders, receiving goods and what you have bought" : view === "vendors" ? "The vendors you buy from. You choose them on purchase orders and when receiving goods" : "Shared live with the POS terminal"}</p></div>${
          view === "sales"
            ? `<div class="seg">${[
                ["today", "Today"],
                ["7", "7 days"],
                ["30", "30 days"]
              ]
                .map(
                  ([p, l]) => `<button data-p="${p}" class="${p === per ? "on" : ""}">${l}</button>`
                )
                .join("")}</div>`
            : ""
        }</div>`) + V[view]();
}
function go(n) {
  n = n.replace("&amp;", "&");
  $("#ov").classList.remove("show");
  if (n === "Front Desk") {
    boUser = null;
    $("#bo").classList.remove("show");
    return fdOpen();
  }
  if (n === "Point of Sale" || n === "Open POS terminal") return posOpen();
  if (n === "Home") view = "home";
  else if (VIEW[n]) view = VIEW[n];
  else return toast(n + " opens in the next build");
  document.querySelectorAll("#nav .nv").forEach(b => b.classList.toggle("on", b.dataset.n === n));
  $("#app").classList.remove("open");
  all();
}
$("#nav").onclick = e => {
  const b = e.target.closest("[data-n]");
  if (b) go(b.dataset.n);
};

// ---- data windows (current and previous period) ----
const D = 864e5,
  // "Today" is the business date.
  d0 = () => {
    const [y, m, n] = bizDate().split("-").map(Number);
    return new Date(y, m - 1, n).getTime();
  },
  nD = () => (per === "today" ? 1 : +per);
// Today's chart runs in two-hour bars from the start of the working day.
const dayStartMins = () => {
  const [h, m] = dayTimes().start.split(":").map(Number);
  return h * 60 + m;
};
const rngOf = p => {
  const e = d0() + D - p * nD() * D;
  return [e - nD() * D, e];
};
const sel = p => {
  const [a, b] = rngOf(p);
  return SALES.filter(s => saleAt(s) >= a && saleAt(s) < b && (br === BRS[0] || s.dept === br));
};
const ser = (p, f) => {
  const n = per === "today" ? 12 : +per,
    a = rngOf(p)[0],
    o = Array(n).fill(0);
  sel(p).forEach(s => {
    const i =
      per === "today"
        ? Math.floor(
            ((s.at.getHours() * 60 + s.at.getMinutes() - dayStartMins() + 1440) % 1440) / 120
          )
        : Math.min(n - 1, Math.max(0, Math.floor((saleAt(s) - a) / D)));
    o[i] += f(s);
  });
  return o;
};
const grp = (L, f) => {
  const m = {};
  L.forEach(s => f(s).forEach(([k, x]) => (m[k] = (m[k] || 0) + x)));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const ago = d => {
  const m = Math.round((Date.now() - d) / 6e4);
  return m < 1
    ? "just now"
    : m < 60
      ? m + " min ago"
      : m < 1440
        ? Math.round(m / 60) + " hr ago"
        : Math.round(m / 1440) + " d ago";
};
const lowCount = () => Object.keys(stock).filter(k => stock[k] <= RO[k]).length;
const NAV = [
  ["Overview", [["Home", "home"]]],
  [
    "Operations",
    [
      ["Point of Sale", "pos"],
      ["Sales &amp; Orders", "cart"],
      ["Shifts &amp; Day", "id"],
      ["Purchasing", "dl"],
      ["Products List", "box"],
      ["Inventory", "box"],
      ["Selling points", "pos"],
      ["Tables", "pos"],
      ["Recipes &amp; Production", "chef"],
      ["Recipe &amp; Production Report", "chart"]
    ]
  ],
  [
    "Finance",
    [
      ["Accounting", "book"],
      ["Expenses &amp; Income", "wal"],
      ["M-Pesa &amp; eTIMS", "phone"]
    ]
  ],
  [
    "People",
    [
      ["Waiter setup", "users"],
      ["Customers", "users"],
      ["Vendors", "truck"],
      ["HR &amp; Payroll", "id"]
    ]
  ],
  [
    "Insights",
    [
      ["Reports", "chart"],
      ["Room reports", "book"],
      ["Audit log", "shield"]
    ]
  ],
  [
    "System",
    [
      ["Users &amp; roles", "users"],
      ["Settings", "gear"],
      ["License", "shield"]
    ]
  ]
];
$("#nav").innerHTML = NAV.map(
  ([g, L]) =>
    `<div class="sec">${g}</div>` +
    L.map(([n, ic, h]) =>
      h
        ? `<a class="nv" href="${h}" target="_blank" rel="noopener">${I(ic)}<span>${n}</span></a>`
        : `<button class="nv ${n === "Home" ? "on" : ""}" data-n="${n}">${I(ic)}<span>${n}</span>${n === "Inventory" ? '<span class="b" id="nb">0</span>' : ""}</button>`
    ).join("")
).join("");

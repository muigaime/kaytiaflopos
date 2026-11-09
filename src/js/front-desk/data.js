// ---- Front Desk: rooms, bookings, check-in, guest folios, housekeeping, reports ----
const APP_VERSION = "1.8.0",
  APP_BUILD = "26 Oct 2026";
const ROOMS = [],
  RESERVATIONS = [],
  SEED_ROOM_RATES = [
    ["Single", 3000],
    ["Double", 4500],
    ["Executive", 6500],
    ["Suite", 9000]
  ],
  PAY_METHODS = { cash: "Cash", mpesa: "M-Pesa", account: "Customer account" },
  ROOM_STATUS_LABELS = {
    vac: "Vacant",
    occ: "Occupied",
    res: "Reserved today",
    dirty: "Dirty",
    ooo: "Out of order"
  };
const FD_SETTINGS = {
    name: "Mwangaza Grand Hotel",
    meals: { BB: 800, HB: 1800, FB: 2600 },
    child: 50
  },
  MEAL_PLANS = {
    RO: "Room only",
    BB: "Bed & breakfast",
    HB: "Half board",
    FB: "Full board",
    AI: "All inclusive"
  };
const mealPlanPrice = p => (!p || p === "RO" ? 0 : FD_SETTINGS.meals[p] || 0),
  mealPerNight = (p, a, c) => mealPlanPrice(p) * (a + (c * FD_SETTINGS.child) / 100);
function fdBrand() {
  ["#fdHotel", "#flHotel"].forEach(x => {
    const e = $(x);
    if (e) e.textContent = FD_SETTINGS.name;
  });
  // The POS carries the hotel's name and its initial as a crest.
  document.querySelectorAll(".hotelName").forEach(e => (e.textContent = FD_SETTINGS.name));
  document.querySelectorAll(".hotelMark").forEach(e => {
    const logo = (FD_SETTINGS.logos || {}).company;
    if (logo) {
      const i = document.createElement("img");
      i.src = logo;
      i.alt = FD_SETTINGS.name || "";
      e.replaceChildren(i);
      e.classList.add("has-logo");
    } else {
      e.textContent = (FD_SETTINGS.name || "H").trim().charAt(0).toUpperCase();
      e.classList.remove("has-logo");
    }
  });
}
function fdSeed() {
  if (FD_SETTINGS.noSeeds) return; // cleared on purpose: the hotel adds its own rooms
  [
    [101, 0],
    [102, 0],
    [103, 0],
    [104, 0],
    [201, 1],
    [202, 1],
    [203, 1],
    [204, 1],
    [301, 2],
    [302, 2],
    [303, 3],
    [304, 3]
  ].forEach(([n, t]) =>
    ROOMS.push({
      no: String(n),
      type: SEED_ROOM_RATES[t][0],
      rate: SEED_ROOM_RATES[t][1],
      status: "vac"
    })
  );
}
const toYmd = d => {
    d = new Date(d);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  },
  todayYmd = () => toYmd(new Date()),
  // Rooms run on the business date, like the POS: a guest arriving at 00:30 belongs to the day still open.
  fdToday = () => bizDate(),
  addDays = (x, n) => toYmd(new Date(new Date(x + "T00:00:00").getTime() + n * 864e5)),
  nightsBetween = (a, b) =>
    Math.max(1, Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5));
const stayOf = no => RESERVATIONS.find(r => r.room === no && r.status === "inhouse"),
  roomByNo = no => ROOMS.find(r => r.no === no),
  mealTotal = r =>
    Math.round(
      (r.mrate || 0) *
        nightsBetween(r.in, r.out) *
        ((r.adults || 1) + ((r.children || 0) * FD_SETTINGS.child) / 100) *
        100
    ) / 100,
  folioOf = r => {
    const n = nightsBetween(r.in, r.out),
      room = n * r.rate,
      meal = mealTotal(r),
      ex = sSum(r.charges, c => c.amt),
      paid = sSum(r.pays, p => p.amt);
    return { n, room, meal, ex, total: room + meal + ex, paid, bal: room + meal + ex - paid };
  };
/** How much of a payment settles POS bills already counted as sales. */
const posCut = (r, amt) => {
  const take = Math.min(amt, r.posOwed || 0);
  if (take > 0) r.posOwed -= take;
  return take;
};
const isFree = (no, a, b, skip) =>
  !RESERVATIONS.some(
    r =>
      r.id !== skip &&
      r.room === no &&
      (r.status === "reserved" || r.status === "inhouse") &&
      r.in < b &&
      a < r.out
  );
const roomStatus = r =>
  r.status === "ooo"
    ? "ooo"
    : stayOf(r.no)
      ? "occ"
      : RESERVATIONS.some(
            x =>
              x.room === r.no && x.status === "reserved" && x.in <= fdToday() && x.out > fdToday()
          )
        ? "res"
        : r.status === "dirty"
          ? "dirty"
          : "vac";
const FD_ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  cal2: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M9 15h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 13h2M3 10h18"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5 7-5s7 1.5 7 5M17 5a3.5 3.5 0 010 7M22 20c0-2.5-1.5-4-4-4.6"/>',
  userplus: '<circle cx="10" cy="8" r="4"/><path d="M2 21c0-4 4-6 8-6M18 14v6M15 17h6"/>',
  broom: '<path d="M14 3l7 7M13 7l-9 9 4 4 9-9M7 13l4 4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  doc: '<path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
};
const FD_MENU = [
  [
    "Rooms and stays",
    [
      ["grid", "Rooms", "grid"],
      ["checkin", "Check in", "user"],
      ["book", "Room booking", "cal"],
      ["group", "Group booking", "users"],
      ["dates", "Change dates", "cal2"]
    ]
  ],
  [
    "Guests and money",
    [
      ["guests", "Guests", "list"],
      ["pending", "Pending payments", "wallet"],
      ["post", "Cash sale and expenses", "doc"]
    ]
  ],
  [
    "Running the house",
    [
      ["hk", "Housekeeping", "broom"],
      ["req", "Requisitions", "doc"],
      ["tariff", "Room tariffs", "wallet"],
      ["rexp", "Room expenses", "wallet"],
      ["shift", "Shift management", "clock"],
      ["set", "Settings", "gear"]
    ]
  ]
];
const FD_TITLES = {
  tariff: ["Room tariffs", "Rates by meal plan, in any currency, and today's exchange rates."],
  grid: ["Rooms", "Every room at a glance. Tap one to check in, book it or open its folio."],
  checkin: ["Check in", "Arrivals due today, and walk-in guests."],
  book: ["Room booking", "Reserve a room, with or without a deposit."],
  group: ["Group booking", "Several rooms on one bill."],
  gfolio: ["Group folio", "Charges and payments for the whole group."],
  dates: ["Change dates", "Extend or shorten a stay."],
  guests: ["Guests", "Who is in the house, who is due, and every past guest's folio and invoice."],
  pending: ["Pending payments", "Guests who still owe."],
  post: ["Cash sale and expenses", "Charges to a room, cash sales and cash paid out."],
  hk: ["Housekeeping", "Change a room's status as soon as the work is done."],
  req: [
    "Requisitions",
    "Ask the store for what you need. A manager approves it and the store issues it."
  ],
  rexp: ["Room expenses", "Money spent on a room: repairs, linen, cleaning and supplies."],
  set: ["Settings", "Room types, meal plans, rooms and rates."],
  folio: ["Guest folio", "Charges, payments and the invoice."],
  accts: ["Customer accounts", "Balances and payments."],
  newacct: ["New customer account", ""]
};
/** What the signed-in person's role allows here: desk, hk (housekeeping) or set (settings). */
const fdCan = k =>
  !!user && !!user.fd && (k === "staff" ? !!(user.fd.desk || user.fd.hk) : !!user.fd[k]);
const fdPageRight = v =>
  v === "hk" ? "hk" : v === "set" || v === "tariff" ? "set" : v === "req" ? "staff" : "desk";
let fdView = "grid",
  fdSelectedRoom = null,
  fdSelectedRes = null,
  fdPresetRoom = "",
  fdPending = false,
  fdRoomF = "",
  fdHkF = "",
  fdNotice = null;
const tableHTML = (h, r) =>
  `<div style="overflow:auto"><table class="sht"><tr>${h.map(x => `<th>${x}</th>`).join("")}</tr>${r.length ? r.map(x => `<tr>${x.map(c => `<td>${c}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${h.length}" class="stk">Nothing to show.</td></tr>`}</table></div>`;
const inputHTML = (id, ph, t) => `<input id="${id}" placeholder="${ph}"${t ? ` type="${t}"` : ""}>`,
  roomOptionsHTML = (L, sel) =>
    L.map(
      r =>
        `<option value="${r.no}" ${sel === r.no ? "selected" : ""}>${r.no} · ${r.type} · KES ${r.rate.toLocaleString()}</option>`
    ).join("");
const roomStatusCounts = () => {
  const c = {};
  ROOMS.forEach(r => {
    const x = roomStatus(r);
    c[x] = (c[x] || 0) + 1;
  });
  return c;
};

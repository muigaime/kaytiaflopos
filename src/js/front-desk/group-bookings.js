const GROUPS = [];
let groupForm = {},
  fdSelectedGroup = null;
function groupFormReset() {
  groupForm = {
    name: "",
    payer: "company",
    pname: "",
    pphone: "",
    ac: "0",
    in: fdToday(),
    out: addDays(fdToday(), 1),
    disc: 0,
    sel: [],
    pm: "later",
    dep: "",
    m: "account",
    gs: {},
    plan: "RO"
  };
}
groupFormReset();
const groupFreeRooms = () =>
  groupForm.in && groupForm.out > groupForm.in
    ? ROOMS.filter(
        r =>
          r.status !== "ooo" &&
          isFree(r.no, groupForm.in, groupForm.out) &&
          (groupForm.in > fdToday() || roomStatus(r) === "vac")
      )
    : [];
const groupReservations = g =>
  g.rooms.map(id => RESERVATIONS.find(r => r.id === id)).filter(r => r && r.status !== "cancelled");
const groupStatus = g => {
  const R = groupReservations(g);
  return g.cancelled
    ? "cancelled"
    : R.length && R.every(r => r.status === "out")
      ? "checked out"
      : R.some(r => r.status === "inhouse" || r.status === "out")
        ? "in house"
        : "reserved";
};
const groupPayerName = g => (g.payer === "company" ? (CU[g.ac] || {}).n || "Company" : g.pname);
function groupCheckIn(g) {
  const R = groupReservations(g).filter(r => r.status === "reserved");
  if (!R.length) return "No rooms are waiting to check in.";
  if (g.in > fdToday()) return "The group is not due until " + g.in + ".";
  const miss = R.filter(r => !guestIsRegistered(guestsOf(r)[0]));
  if (miss.length)
    return (
      "Register the lead guest (name, nationality and ID number) for room(s): " +
      miss.map(r => r.room).join(", ") +
      "."
    );
  for (const r of R) {
    const x = roomStatus(roomByNo(r.room));
    if (x === "ooo" || x === "dirty")
      return (
        "Room " + r.room + " is " + ROOM_STATUS_LABELS[x].toLowerCase() + ". Mark it clean first."
      );
    if (stayOf(r.room)) return "Room " + r.room + " is occupied.";
  }
  R.forEach(r => {
    r.status = "inhouse";
  });
  return "";
}
function groupPay(g, method, amt, ci) {
  const R = groupReservations(g),
    bal = sSum(R, r => folioOf(r).bal);
  if (!(amt > 0)) return "Enter an amount above zero.";
  if (amt > bal + 0.009) return "The amount is more than the group balance of KES " + R2(bal) + ".";
  if (method === "account") {
    const c = CU[ci];
    if (!c) return "Choose a customer account.";
    if (c.owes + amt > c.limit) return c.n + " would go over its credit limit.";
  }
  if (!shiftOk()) return "__shift";
  if (method === "account") CU[ci].owes += amt;
  let left = amt,
    pos = 0;
  R.forEach(r => {
    const a = Math.min(left, folioOf(r).bal);
    if (a > 0.0001) {
      r.pays.push({ at: new Date().toISOString(), method, amt: a, by: user.n, grp: g.id });
      pos += posCut(r, a);
      left -= a;
    }
  });
  SALES.push({
    no: "FD-" + String(SALES.length + 1).padStart(4, "0"),
    at: new Date(),
    bd: bizDate(),
    dept: "Front Desk",
    label: "Group " + g.name,
    user: user.n,
    net: amt - pos,
    tax: 0,
    g: amt - pos,
    lines: [
      { id: 0, n: "Group " + g.name + " (" + groupPayerName(g) + ")", q: 1, p: amt - pos, t: "A" }
    ],
    mx: { [method === "account" ? "credit" : method]: amt, ...(pos > 0 ? { room: -pos } : {}) }
  });
  sync();
  return "";
}
function groupInvoiceHTML(g, by) {
  const R = groupReservations(g),
    T = sSum(R, r => folioOf(r).total),
    pm = {};
  R.forEach(r =>
    r.pays.forEach(p => {
      pm[p.method] = (pm[p.method] || 0) + p.amt;
    })
  );
  const P = sSum(Object.keys(pm), k => pm[k]);
  return `<div class="rd"><h2>${hx(FD_SETTINGS.name.toUpperCase())}</h2><div class="c">GROUP INVOICE</div><div class="c">${new Date().toLocaleString("en-GB")}</div><hr><table>${rr("Group", hx(g.name))}${rr(g.payer === "company" ? "Company" : "Billed to", hx(groupPayerName(g)))}${rr("Arrival", g.in)}${rr("Departure", g.out)}${rr("Rooms", R.length)}</table><hr><table>${R.map(r => rr("Rm " + r.room + " " + hx(r.type) + " x" + nightsBetween(r.in, r.out) + " @ " + R2(r.rate), R2(folioOf(r).room))).join("")}${R.map(r => (folioOf(r).meal > 0 ? rr("Rm " + r.room + " " + MEAL_PLANS[r.plan], R2(folioOf(r).meal)) : "")).join("")}${R.map(r => r.charges.map(c => rr("Rm " + r.room + " " + hx(c.cat + ": " + c.desc), R2(c.amt))).join("")).join("")}${rr("TOTAL", R2(T), 1)}</table><hr><div class="sec">PAYMENTS</div>${
    Object.keys(pm).length
      ? `<table>${Object.keys(pm)
          .map(k => rr(PAY_METHODS[k] || k, R2(pm[k])))
          .join("")}</table>`
      : "<div>None yet</div>"
  }<hr><table>${rr("Balance due", R2(T - P), 1)}</table><hr><div class="c">Printed by ${hx(by || "")}</div></div>`;
}

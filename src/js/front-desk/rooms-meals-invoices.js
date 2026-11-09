function roomPanel() {
  const r = roomByNo(fdSelectedRoom);
  if (!r) return '<div class="stk">Select a room to see what you can do with it.</div>';
  const x = roomStatus(r),
    st = stayOf(r.no),
    rv = RESERVATIONS.find(
      q => q.room === r.no && q.status === "reserved" && q.in <= fdToday() && q.out > fdToday()
    );
  let b = "";
  if (x === "occ")
    b = `<button class="chip on" data-f="folio" data-id="${st.id}">Open folio / bill</button><button class="mini" data-f="chg" data-id="${st.id}">Change dates</button>`;
  else if (x === "res")
    b = `<button class="chip on" data-f="ci" data-id="${rv.id}">Check in ${hx(rv.guest)}</button>`;
  else if (x === "vac")
    b = `<button class="chip on" data-f="walk" data-no="${r.no}">Check in a guest</button><button class="mini" data-f="bookroom" data-no="${r.no}">Book this room</button><button class="mini" data-f="hkset" data-no="${r.no}" data-set="ooo">Out of order</button>`;
  else if (x === "dirty")
    b = `<button class="chip on" data-f="hkset" data-no="${r.no}" data-set="vac">Mark clean</button>`;
  else
    b = `<button class="chip on" data-f="hkset" data-no="${r.no}" data-set="vac">Back in service</button>`;
  return `<div class="fd-card"><h4>Room ${r.no} · ${r.type} · ${ROOM_STATUS_LABELS[x]}</h4><div class="shp">${b}</div></div>`;
}
const revenueByDay = (a, b) => {
  const m = {},
    O = d => (m[d] = m[d] || { room: 0, meal: 0, ex: 0 });
  RESERVATIONS.filter(r => r.status === "inhouse" || r.status === "out").forEach(r => {
    const mv = (r.mrate || 0) * ((r.adults || 1) + ((r.children || 0) * FD_SETTINGS.child) / 100);
    for (let i = 0; i < nightsBetween(r.in, r.out); i++) {
      const d = addDays(r.in, i);
      if (d >= a && d <= b && d <= fdToday()) {
        const o = O(d);
        o.room += r.rate;
        o.meal += mv;
      }
    }
    r.charges.forEach(c => {
      const d = bizDateOf(c.at);
      if (d >= a && d <= b) O(d).ex += c.amt;
    });
  });
  return m;
};
function mealRows(a, b) {
  const day = {},
    plan = {};
  RESERVATIONS.filter(
    r => (r.status === "inhouse" || r.status === "out") && r.plan && r.plan !== "RO"
  ).forEach(r => {
    const cv = (r.adults || 1) + (r.children || 0),
      mv = (r.mrate || 0) * ((r.adults || 1) + ((r.children || 0) * FD_SETTINGS.child) / 100);
    for (let i = 0; i < nightsBetween(r.in, r.out); i++) {
      const d = addDays(r.in, i);
      if (d >= a && d <= b && d <= fdToday()) {
        const o = (day[d] = day[d] || { rooms: 0, covers: 0, rev: 0 }),
          p = (plan[r.plan] = plan[r.plan] || { rooms: 0, covers: 0, rev: 0 });
        o.rooms++;
        o.covers += cv;
        o.rev += mv;
        p.rooms++;
        p.covers += cv;
        p.rev += mv;
      }
    }
  });
  return { day, plan };
}
function mealCard() {
  return `<div class="fd-card"><h4>Meal plans (per person per night)</h4><div class="fd-form">${["BB", "HB", "FB", "AI"].map(k => `<label>${MEAL_PLANS[k]} (KES)<input type="number" data-mp="${k}" value="${FD_SETTINGS.meals[k] || 0}"></label>`).join("")}<label>Child price (% of adult)<input type="number" data-mc="1" value="${FD_SETTINGS.child}"></label></div><div class="stk">Room rates stay room-only. The meal plan is added on top and shown as its own line on bills, invoices and reports.</div></div>`;
}
function guestInvoiceHTML(r, by) {
  const f = folioOf(r);
  return `<div class="rd"><h2>${hx(FD_SETTINGS.name.toUpperCase())}</h2><div class="c">GUEST INVOICE</div><div class="c">${new Date().toLocaleString("en-GB")}</div><hr><table>${rr("Guest", hx(r.guest))}${rr("Room", r.room + " · " + r.type)}${rr("Arrival", r.in)}${rr("Departure", r.out)}${rr("Nights", f.n)}</table><hr><table>${rr("Room " + f.n + " x " + R2(r.rate), R2(f.room))}${f.meal > 0 ? rr(MEAL_PLANS[r.plan] + " (" + (r.adults || 1) + " adult" + (r.children || 0 ? "+" + r.children + " child" : "") + ") x" + f.n, R2(f.meal)) : ""}${r.charges.map(c => rr(hx(c.cat + ": " + c.desc), R2(c.amt))).join("")}${rr("TOTAL", R2(f.total), 1)}</table><hr><div class="sec">PAYMENTS</div>${r.pays.length ? `<table>${r.pays.map(p => rr(bizDateOf(p.at) + " " + (PAY_METHODS[p.method] || p.method), R2(p.amt))).join("")}</table>` : "<div>None</div>"}<hr><table>${rr("Balance due", R2(f.bal), 1)}</table><hr><div class="c">Thank you for staying with us</div><div class="c">Printed by ${hx(by || "")}</div></div>`;
}

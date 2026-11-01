const FD_VIEWS = {
  grid() {
    const c = roomStatusCounts();
    return `<div class="fd-leg">${Object.keys(ROOM_STATUS_LABELS)
      .map(k => `<span><i class="fs-${k}"></i>${ROOM_STATUS_LABELS[k]} <b>${c[k] || 0}</b></span>`)
      .join("")}</div><div class="fd-grid">${ROOMS.map(r => {
      const x = roomStatus(r),
        st = stayOf(r.no),
        rv = RESERVATIONS.find(
          q =>
            q.room === r.no && q.status === "reserved" && q.in <= todayYmd() && q.out > todayYmd()
        );
      return `<button class="fd-room fs-${x} ${fdSelectedRoom === r.no ? "sel" : ""}" data-f="room" data-no="${r.no}"><b>${r.no}</b><span>${r.type}</span><em>${st ? hx(st.guest) : rv ? "Due: " + hx(rv.guest) : ROOM_STATUS_LABELS[x]}</em><small>KES ${r.rate.toLocaleString()}</small></button>`;
    }).join("")}</div>${roomPanel()}`;
  },
  checkin() {
    ensureRoomTypes();
    const arr = RESERVATIONS.filter(r => r.status === "reserved" && r.in <= todayYmd() && !r.grp);
    if (fdPresetRoom) {
      const r = roomByNo(fdPresetRoom);
      if (r) {
        checkInForm.type = r.type;
        checkInForm.room = r.no;
        checkInForm.rate = "";
      }
      fdPresetRoom = "";
    }
    const act = ROOMTYPES.filter(t => t.active);
    if (!roomTypeByName(checkInForm.type))
      checkInForm.type =
        (act.find(t => vacantRoomsOfType(t.name, !t.hk).length) || act[0] || {}).name || "";
    const t = roomTypeByName(checkInForm.type) || {},
      vac = t.name ? vacantRoomsOfType(t.name, !t.hk) : [],
      rate = checkInForm.rate !== "" ? checkInForm.rate : t.rate || "",
      ad = parseInt(checkInForm.a) || 1,
      ch = parseInt(checkInForm.c) || 0,
      mp = mealPerNight(checkInForm.plan, ad, ch),
      nn = parseInt(checkInForm.n) || 1,
      ttl = nn * ((parseFloat(rate) || 0) + mp),
      tot = (parseInt(checkInForm.a) || 0) + (parseInt(checkInForm.c) || 0),
      warn = !t.name
        ? ""
        : t.adults && (parseInt(checkInForm.a) || 0) > t.adults
          ? "This room type takes up to " + t.adults + " adults."
          : (parseInt(checkInForm.c) || 0) > t.children
            ? "This room type takes up to " + t.children + " children."
            : tot > t.max
              ? "Maximum occupancy is " + t.max + " guests."
              : parseFloat(rate) < t.floor
                ? "The rate is below the floor of KES " + R2(t.floor) + "."
                : "",
      cs = (k, l, ty, x) =>
        `<label>${l}<input data-cs="${k}" ${ty ? `type="${ty}"` : ""} ${x || ""} value="${hx(checkInForm[k])}"></label>`;
    return `<div class="fd-card"><h4>Arrivals (reserved)</h4>${tableHTML(
      ["Guest", "Room", "Arrival", "Departure", "Paid", ""],
      arr.map(r => [
        hx(r.guest),
        r.room,
        r.in,
        r.out,
        R2(sSum(r.pays, p => p.amt)),
        `<button class="mini" data-f="ci" data-id="${r.id}">Check in</button>`
      ])
    )}</div>
 <div class="ci-grid"><div class="fd-card"><h4>Walk-in check in</h4>
 ${nationalityListHTML}<div class="ci-sec">Guest registration</div><div class="fd-form">${cs("g", "Guest name")}${cs("nat", "Nationality", null, 'list="natl"')}<label>ID type<select data-cs="idt">${ID_TYPES.map(x => `<option ${checkInForm.idt === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>${cs("i", "ID / passport no.")}${cs("p", "Phone")}${cs("em", "Email", "email")}<label>Gender<select data-cs="gd"><option value=""></option>${["Female", "Male", "Other"].map(x => `<option ${checkInForm.gd === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><div class="upw"><span>ID / passport copy</span>${upCtl("ci", checkInForm.doc)}</div></div>
 <div class="ci-sec">Room</div><div class="fd-form"><label>Room type<select data-cs="type" data-rd="1">${act.map(x => `<option value="${hx(x.name)}" ${x.name === checkInForm.type ? "selected" : ""}>${hx(x.code)} · ${hx(x.name)} · KES ${R2(x.rate)}</option>`).join("")}</select></label><label>Room<select data-cs="room" data-rd="1"><option value="auto">Auto assign (${vac.length} ready)</option>${vac.map(r => `<option value="${r.no}" ${checkInForm.room === r.no ? "selected" : ""}>Room ${r.no}</option>`).join("")}</select></label></div>
 <div class="ci-sec">Stay</div><div class="fd-form">${cs("n", "Nights", "number", 'min="1" data-rd="1"')}${cs("a", "Adults", "number", 'min="1" data-rd="1"')}${cs("c", "Children", "number", 'min="0" data-rd="1"')}<label>Rate per night (KES)<input data-cs="rate" type="number" step="${t.inc || 1}" min="${t.floor || 0}" data-rd="1" value="${hx(rate)}"></label><label>Meal plan<select data-cs="plan" data-rd="1">${Object.keys(
   MEAL_PLANS
 )
   .map(
     k =>
       `<option value="${k}" ${checkInForm.plan === k ? "selected" : ""}>${MEAL_PLANS[k]}${k === "RO" ? "" : " · +KES " + R2(mealPlanPrice(k)) + " pp"}</option>`
   )
   .join("")}</select></label></div>
 <div class="ci-sec">Payment</div><div class="fd-form"><label>When will the guest pay?<select data-cs="pm" data-rd="1"><option value="later" ${checkInForm.pm === "later" ? "selected" : ""}>Pay later (leave pending)</option><option value="dep" ${checkInForm.pm === "dep" ? "selected" : ""}>Make a partial payment now</option><option value="full" ${checkInForm.pm === "full" ? "selected" : ""}>Pay in full now</option></select></label>${checkInForm.pm === "later" ? "" : `${checkInForm.pm === "dep" ? cs("dep", "Partial payment (KES)", "number") : `<label>Amount (KES)<input readonly value="${R2(ttl)}"></label>`}<label>Method<select data-cs="m" data-rd="1"><option value="cash" ${checkInForm.m === "cash" ? "selected" : ""}>Cash</option><option value="mpesa" ${checkInForm.m === "mpesa" ? "selected" : ""}>M-Pesa</option><option value="account" ${checkInForm.m === "account" ? "selected" : ""}>Customer account</option></select></label>${checkInForm.m === "account" ? `<label>Customer account<select data-cs="ac">${CU.map((c, i) => `<option value="${i}" ${String(i) === String(checkInForm.ac) ? "selected" : ""}>${hx(c.n)}</option>`).join("")}</select></label>` : ""}`}</div>${checkInForm.pm === "later" ? '<div class="stk">The room charge stays pending on the guest folio. It can be paid any time, before or after check-out.</div>' : ""}
 ${warn ? `<div class="fd-note no">${warn}</div>` : ""}<div class="stk">Room KES ${R2(parseFloat(rate) || 0)}${mp > 0 ? " + " + MEAL_PLANS[checkInForm.plan] + " KES " + R2(mp) : ""} per night × ${nn} night(s) = <b>KES ${R2(ttl)}</b></div>
 <button class="chip on" data-f="walkgo">Check in guest</button></div>${roomTypeProfileHTML(t, vac)}</div>`;
  },
  book() {
    const up = RESERVATIONS.filter(r => r.status === "reserved" && !r.grp).sort((a, b) =>
      a.in < b.in ? -1 : 1
    );
    return `<div class="fd-card"><h4>Room booking (reservation)</h4><div class="fd-form">${inputHTML("b_g", "Guest name")}${inputHTML("b_p", "Phone")}${inputHTML("b_i", "ID / passport no.")}<select id="b_r">${roomOptionsHTML(ROOMS, fdPresetRoom)}</select><label>Check-in<input id="b_in" type="date" value="${todayYmd()}"></label><label>Check-out<input id="b_out" type="date" value="${addDays(todayYmd(), 1)}"></label><label>Adults<input id="b_a" type="number" min="1" value="1"></label><label>Children<input id="b_c" type="number" min="0" value="0"></label><label>Meal plan<select id="b_plan">${Object.keys(
      MEAL_PLANS
    )
      .map(
        k =>
          `<option value="${k}">${MEAL_PLANS[k]}${k === "RO" ? "" : " · +KES " + R2(mealPlanPrice(k)) + " pp"}</option>`
      )
      .join(
        ""
      )}</select></label><label>When will the guest pay?<select id="b_pm"><option value="later">Pay later (no payment now)</option><option value="part">Pay a deposit now</option><option value="full">Pay in full now</option></select></label><label>Deposit (KES)<input id="b_d" type="number" placeholder="0"></label><label>Method<select id="b_m"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option></select></label><button class="chip on" data-f="bookgo">Create reservation</button></div></div>
 <div class="fd-card"><h4>Upcoming reservations</h4>${tableHTML(
   [
     "Guest",
     "Room",
     "Arrival",
     "Departure",
     "Nights",
     "Plan",
     "Total",
     "Deposit paid",
     "Balance",
     ""
   ],
   up.map(r => {
     const f = folioOf(r);
     return [
       hx(r.guest),
       r.room,
       r.in,
       r.out,
       f.n,
       MEAL_PLANS[r.plan || "RO"],
       R2(f.total),
       R2(f.paid),
       R2(f.bal),
       `<button class="mini" data-f="ci" data-id="${r.id}">Check in</button> <button class="mini" data-f="folio" data-id="${r.id}">Pay / folio</button> <button class="mini" data-f="chg" data-id="${r.id}">Dates</button> <button class="mini" data-f="cancel" data-id="${r.id}">Cancel</button>`
     ];
   })
 )}</div>`;
  },
  dates() {
    const L = RESERVATIONS.filter(r => r.status === "reserved" || r.status === "inhouse"),
      r = L.find(x => x.id === fdSelectedRes) || L[0];
    if (!r)
      return '<div class="fd-card"><div class="stk">There are no reservations or in-house guests.</div></div>';
    fdSelectedRes = r.id;
    const f = folioOf(r);
    return `<div class="fd-card"><h4>Change date (extend or shorten a stay)</h4><div class="fd-form"><select data-pk="1">${L.map(x => `<option value="${x.id}" ${x.id === r.id ? "selected" : ""}>${hx(x.guest)} · room ${x.room} · ${x.in} to ${x.out} (${x.status === "inhouse" ? "in house" : "reserved"})</option>`).join("")}</select><label>Check-in${r.status === "inhouse" ? " (fixed)" : ""}<input id="d_in" type="date" value="${r.in}" ${r.status === "inhouse" ? "disabled" : ""}></label><label>Check-out<input id="d_out" type="date" value="${r.out}"></label><button class="chip on" data-f="dgo">Save new dates</button></div><div class="stk">Current: ${f.n} night(s) · room charges KES ${R2(f.room)}</div></div>`;
  },
  post() {
    const ih = RESERVATIONS.filter(r => r.status === "inhouse");
    return `<div class="fd-card"><h4>Post charge to a guest room</h4>${ih.length ? `<div class="fd-form"><select id="p_r">${ih.map(r => `<option value="${r.id}">${r.room} · ${hx(r.guest)}</option>`).join("")}</select><select id="p_c"><option>Restaurant</option><option>Laundry</option><option>Minibar</option><option>Transport</option><option>Other</option></select>${inputHTML("p_d", "Description")}<input id="p_a" type="number" placeholder="Amount (KES)"><button class="chip on" data-f="postgo">Post charge</button></div>` : '<div class="stk">No guests are in house.</div>'}</div>
 <div class="fd-card"><h4>Cash sale (paid now)</h4><div class="fd-form">${inputHTML("s_d", "Description")}<input id="s_a" type="number" placeholder="Amount (KES)"><select id="s_m"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option></select><button class="chip on" data-f="salego">Record sale</button></div></div>
 <div class="fd-card"><h4>Post expense (cash payout)</h4><div class="fd-form"><select id="x_c"><option>Supplies</option><option>Transport</option><option>Cleaning</option><option>Staff meal</option><option>Repairs</option><option>Other</option></select>${inputHTML("x_d", "Description")}<input id="x_a" type="number" placeholder="Amount (KES)"><button class="chip on" data-f="expgo">Post expense</button></div><div class="stk">Expenses are deducted from the expected cash of your shift.</div></div>`;
  },
  accts() {
    return `<div class="fd-card"><h4>Customer accounts</h4>${tableHTML(
      ["Customer", "Limit", "Owes", "Receive payment"],
      CU.map((c, i) => [
        hx(c.n),
        R2(c.limit),
        R2(c.owes),
        `<div class="shp"><input id="ap_${i}" type="number" placeholder="Amount"><button class="mini" data-f="acpay" data-i="${i}">Save</button></div>`
      ])
    )}</div>`;
  },
  newacct() {
    return `<div class="fd-card"><h4>Create new customer account</h4><div class="fd-form">${inputHTML("n_n", "Customer or company name")}<input id="n_l" type="number" placeholder="Credit limit (KES)"><button class="chip on" data-f="acnew">Create account</button></div></div>`;
  },
  hk() {
    return `<div class="fd-card"><h4>Room housekeeping</h4><div class="shp"><button class="chip on" data-f="hkprint">Print A4 · all rooms</button><button class="mini" data-f="hkprint" data-only="1">Print A4 · rooms to clean</button></div>${tableHTML(
      ["Room", "Type", "Status", ""],
      ROOMS.map(r => {
        const x = roomStatus(r);
        return [
          r.no,
          r.type,
          `<span class="tag" style="background:none;color:#fff;background:${{ vac: "#1f9d62", occ: "#2b7bb9", res: "#e08a1e", dirty: "#8a6d4b", ooo: "#c0392b" }[x]}">${ROOM_STATUS_LABELS[x]}</span>`,
          x === "occ" || (x === "res" && 0)
            ? ""
            : x === "dirty"
              ? `<button class="mini" data-f="hkset" data-no="${r.no}" data-set="vac">Mark clean</button>`
              : x === "ooo"
                ? `<button class="mini" data-f="hkset" data-no="${r.no}" data-set="vac">Back in service</button>`
                : x === "occ"
                  ? ""
                  : `<button class="mini" data-f="hkset" data-no="${r.no}" data-set="dirty">Mark dirty</button> <button class="mini" data-f="hkset" data-no="${r.no}" data-set="ooo">Out of order</button>`
        ];
      })
    )}</div>`;
  },
  occ() {
    const c = roomStatusCounts(),
      ih = RESERVATIONS.filter(r => r.status === "inhouse"),
      ar = RESERVATIONS.filter(r => r.status === "reserved" && r.in === todayYmd()),
      dp = ih.filter(r => r.out <= todayYmd());
    return `<div class="fd-kpi">${[
      ["Rooms", ROOMS.length],
      ["Occupied", c.occ || 0],
      ["Vacant", c.vac || 0],
      ["Reserved today", c.res || 0],
      ["Dirty", c.dirty || 0],
      ["Out of order", c.ooo || 0],
      ["Occupancy", ROOMS.length ? Math.round(((c.occ || 0) / ROOMS.length) * 100) + "%" : "0%"]
    ]
      .map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`)
      .join("")}</div>
 <div class="fd-card"><h4>In-house guests</h4>${tableHTML(
   ["Guest", "Room", "Arrival", "Departure", "Charges", "Paid", "Balance", ""],
   ih.map(r => {
     const f = folioOf(r);
     return [
       hx(r.guest),
       r.room,
       r.in,
       r.out,
       R2(f.total),
       R2(f.paid),
       R2(f.bal),
       `<button class="mini" data-f="folio" data-id="${r.id}">Folio</button>`
     ];
   })
 )}</div>
 <div class="fd-card"><h4>Arrivals today</h4>${tableHTML(
   ["Guest", "Room", "Departure"],
   ar.map(r => [hx(r.guest), r.room, r.out])
 )}<h4>Departures due today or overdue</h4>${tableHTML(
   ["Guest", "Room", "Departure", "Balance"],
   dp.map(r => [hx(r.guest), r.room, r.out, R2(folioOf(r).bal)])
 )}</div>`;
  },
  set() {
    return (
      roomTypesCardHTML() +
      mealCard() +
      `<div class="fd-card"><h4>Hotel details</h4><div class="fd-form"><label>Hotel name (shown on the Front Desk and invoices)<input value="${hx(FD_SETTINGS.name)}" data-hn="1"></label></div></div>
 <div class="fd-card"><h4>Add a room</h4><div class="fd-form">${inputHTML("r_n", "Room number")}<select id="r_t">${ensureRoomTypes()
   .map(t => `<option value="${hx(t.name)}">${hx(t.name)}</option>`)
   .join(
     ""
   )}</select><input id="r_r" type="number" placeholder="Rate per night (KES)"><button class="chip on" data-f="radd">Add room</button></div></div>
 <div class="fd-card"><h4>Rooms and rates</h4>${tableHTML(
   ["Room", "Type", "Rate per night", ""],
   ROOMS.map(r => [
     r.no,
     r.type,
     `<input type="number" value="${r.rate}" data-rate="${r.no}" style="max-width:140px">`,
     `<button class="mini" data-f="rdel" data-no="${r.no}">Remove</button>`
   ])
 )}</div>`
    );
  },
  rsales() {
    const m = revenueByDay(fdDateRange[0], fdDateRange[1]),
      k = Object.keys(m).sort(),
      S = x => sSum(k, d => m[d][x]);
    return (
      dateRangeBarHTML() +
      `<div class="fd-card"><h4>Periodic sales report</h4>${tableHTML(["Date", "Room revenue", "Breakfast and meals", "Extras and charges", "Total"], k.map(d => [d, R2(m[d].room), R2(m[d].meal), R2(m[d].ex), R2(m[d].room + m[d].meal + m[d].ex)]).concat([["<b>Total</b>", "<b>" + R2(S("room")) + "</b>", "<b>" + R2(S("meal")) + "</b>", "<b>" + R2(S("ex")) + "</b>", "<b>" + R2(S("room") + S("meal") + S("ex")) + "</b>"]]))}<div class="stk">Room revenue is the room rate only. Breakfast and other meal plans are shown separately.</div></div>`
    );
  },
  rpay() {
    const m = {};
    RESERVATIONS.forEach(r =>
      r.pays.forEach(p => {
        const d = toYmd(p.at);
        if (d >= fdDateRange[0] && d <= fdDateRange[1]) {
          (m[d] = m[d] || { cash: 0, mpesa: 0, account: 0 })[p.method] += p.amt;
        }
      })
    );
    const k = Object.keys(m).sort(),
      S = x => sSum(k, d => m[d][x]);
    return (
      dateRangeBarHTML() +
      `<div class="fd-card"><h4>Periodic payment report</h4>${tableHTML(["Date", "Cash", "M-Pesa", "Customer account", "Total"], k.map(d => [d, R2(m[d].cash), R2(m[d].mpesa), R2(m[d].account), R2(m[d].cash + m[d].mpesa + m[d].account)]).concat([["<b>Total</b>", "<b>" + R2(S("cash")) + "</b>", "<b>" + R2(S("mpesa")) + "</b>", "<b>" + R2(S("account")) + "</b>", "<b>" + R2(S("cash") + S("mpesa") + S("account")) + "</b>"]]))}</div>`
    );
  },
  rrev() {
    const o = {};
    RESERVATIONS.filter(r => r.status === "inhouse" || r.status === "out").forEach(r => {
      const t = (o[r.type] = o[r.type] || { n: 0, room: 0, meal: 0, ex: 0 }),
        mv = (r.mrate || 0) * ((r.adults || 1) + ((r.children || 0) * FD_SETTINGS.child) / 100);
      for (let i = 0; i < nightsBetween(r.in, r.out); i++) {
        const d = addDays(r.in, i);
        if (d >= fdDateRange[0] && d <= fdDateRange[1] && d <= todayYmd()) {
          t.n++;
          t.room += r.rate;
          t.meal += mv;
        }
      }
      r.charges.forEach(c => {
        const d = toYmd(c.at);
        if (d >= fdDateRange[0] && d <= fdDateRange[1]) t.ex += c.amt;
      });
    });
    const k = Object.keys(o);
    return (
      dateRangeBarHTML() +
      `<div class="fd-card"><h4>Periodic revenue report (by room type)</h4>${tableHTML(["Room type", "Nights sold", "Average room rate", "Room revenue", "Breakfast and meals", "Extras", "Total"], k.map(t => [t, o[t].n, R2(o[t].n ? o[t].room / o[t].n : 0), R2(o[t].room), R2(o[t].meal), R2(o[t].ex), R2(o[t].room + o[t].meal + o[t].ex)]).concat([["<b>Total</b>", "<b>" + sSum(k, t => o[t].n) + "</b>", "", "<b>" + R2(sSum(k, t => o[t].room)) + "</b>", "<b>" + R2(sSum(k, t => o[t].meal)) + "</b>", "<b>" + R2(sSum(k, t => o[t].ex)) + "</b>", "<b>" + R2(sSum(k, t => o[t].room + o[t].meal + o[t].ex)) + "</b>"]]))}<div class="stk">The average room rate excludes breakfast and meals.</div></div>`
    );
  },
  rmeal() {
    const M = mealRows(fdDateRange[0], fdDateRange[1]),
      ks = Object.keys(M.day).sort(),
      ps = Object.keys(M.plan);
    return (
      dateRangeBarHTML() +
      `<div class="fd-card"><h4>Breakfast and meals report</h4>${tableHTML(["Date", "Rooms with meals", "Covers", "Meal revenue"], ks.map(d => [d, M.day[d].rooms, M.day[d].covers, R2(M.day[d].rev)]).concat([["<b>Total</b>", "<b>" + sSum(ks, d => M.day[d].rooms) + "</b>", "<b>" + sSum(ks, d => M.day[d].covers) + "</b>", "<b>" + R2(sSum(ks, d => M.day[d].rev)) + "</b>"]]))}<h4>By meal plan</h4>${tableHTML(
        ["Meal plan", "Room-nights", "Covers", "Revenue"],
        ps.map(p => [MEAL_PLANS[p], M.plan[p].rooms, M.plan[p].covers, R2(M.plan[p].rev)])
      )}<div class="stk">A cover is one guest on a meal plan for one night. Children are charged ${FD_SETTINGS.child}% of the adult price.</div></div>`
    );
  },
  rguests() {
    const L = RESERVATIONS.filter(
      r => r.status !== "cancelled" && r.in >= fdDateRange[0] && r.in <= fdDateRange[1]
    ).sort((a, b) => (a.in < b.in ? 1 : -1));
    return (
      dateRangeBarHTML() +
      `<div class="fd-card"><h4>Guests and invoices list</h4>${tableHTML(
        [
          "Guest",
          "Nationality",
          "ID no.",
          "Room",
          "Arrival",
          "Departure",
          "Status",
          "Total",
          "Paid",
          "Balance",
          ""
        ],
        L.map(r => {
          const f = folioOf(r),
            l = (r.guests || [])[0] || {};
          return [
            hx(r.guest),
            hx(l.nat || ""),
            hx(l.idn || r.idno || ""),
            r.room,
            r.in,
            r.out,
            r.status === "inhouse" ? "In house" : r.status === "out" ? "Checked out" : "Reserved",
            R2(f.total),
            R2(f.paid),
            R2(f.bal),
            `<button class="mini" data-f="folio" data-id="${r.id}">Folio</button> <button class="mini" data-f="inv" data-id="${r.id}">Invoice</button>`
          ];
        })
      )}</div>`
    );
  },
  rold() {
    const L = DAYS.filter(d => d.closedAt)
      .slice()
      .reverse();
    return `<div class="fd-card"><h4>Retrieve old summaries (closed days)</h4>${tableHTML(
      ["Date", "Open", "Bills", "Sales", "Cash variance", ""],
      L.map((d, i) => [
        dm(d.openedAt),
        hm(d.openedAt) + " to " + hm(d.closedAt),
        d.bills,
        R2(d.gross),
        sg(d.variance || 0),
        `<button class="mini" data-f="pday" data-i="${i}">Print summary</button>`
      ])
    )}</div>`;
  },
  group() {
    ensureRoomTypes();
    const ok = groupFreeRooms();
    groupForm.sel = groupForm.sel.filter(n => ok.some(r => r.no === n));
    const nn = groupForm.out > groupForm.in ? nightsBetween(groupForm.in, groupForm.out) : 1,
      disc = parseFloat(groupForm.disc) || 0,
      rooms = groupForm.sel.map(roomByNo).filter(Boolean),
      gr = r => Math.round(r.rate * (1 - disc / 100)),
      total =
        sSum(rooms, gr) * nn +
        rooms.reduce((a, r) => a + (groupForm.gs[r.no] || [0]).length, 0) *
          mealPlanPrice(groupForm.plan) *
          nn,
      gf = (k, l, ty, x) =>
        `<label>${l}<input data-gb="${k}" ${ty ? `type="${ty}"` : ""} ${x || ""} value="${hx(groupForm[k])}"></label>`,
      acs = l =>
        `<label>${l}<select data-gb="ac">${CU.map((c, i) => `<option value="${i}" ${String(i) === String(groupForm.ac) ? "selected" : ""}>${hx(c.n)}</option>`).join("")}</select></label>`,
      list = GROUPS.slice()
        .reverse()
        .map(g => {
          const R = groupReservations(g),
            T = sSum(R, r => folioOf(r).total),
            P = sSum(R, r => folioOf(r).paid);
          return [
            hx(g.name),
            (g.payer === "company" ? "Company: " : "Person: ") + hx(groupPayerName(g)),
            R.length,
            g.in + " to " + g.out,
            groupStatus(g),
            R2(T),
            R2(P),
            R2(T - P),
            `<button class="mini" data-f="gopen" data-id="${g.id}">Open</button>`
          ];
        });
    return `<div class="fd-card"><h4>Group booking</h4>
 <div class="ci-sec">Group and payer</div><div class="fd-form">${gf("name", "Group or event name")}<label>Who pays?<select data-gb="payer" data-rd="1"><option value="company" ${groupForm.payer === "company" ? "selected" : ""}>Company pays</option><option value="person" ${groupForm.payer === "person" ? "selected" : ""}>Person pays</option></select></label>${groupForm.payer === "person" ? gf("pname", "Paying person's name") : acs("Company account")}${gf("pphone", "Contact phone")}</div>
 <div class="ci-sec">Dates and group rate</div><div class="fd-form"><label>Check-in<input type="date" data-gb="in" data-rd="1" value="${groupForm.in}" min="${todayYmd()}"></label><label>Check-out<input type="date" data-gb="out" data-rd="1" value="${groupForm.out}" min="${addDays(groupForm.in, 1)}"></label>${gf("disc", "Group discount %", "number", 'min="0" max="50" data-rd="1"')}<label>Meal plan<select data-gb="plan" data-rd="1">${Object.keys(
   MEAL_PLANS
 )
   .map(
     k =>
       `<option value="${k}" ${groupForm.plan === k ? "selected" : ""}>${MEAL_PLANS[k]}${k === "RO" ? "" : " · +KES " + R2(mealPlanPrice(k)) + " pp"}</option>`
   )
   .join("")}</select></label></div>
 <div class="ci-sec">Rooms · ${groupForm.sel.length} selected · ${ok.length} available</div><div class="gb-rooms">${ok.length ? ok.map(r => `<button type="button" class="gb-r ${groupForm.sel.includes(r.no) ? "on" : ""}" data-f="gbtoggle" data-no="${r.no}"><b>${r.no}</b><span>${hx(r.type)}</span><small>KES ${R2(gr(r))}</small></button>`).join("") : '<div class="stk">No rooms are free for these dates.</div>'}</div>
 ${gbReg(rooms)}
 <div class="ci-sec">Payment</div><div class="fd-form"><label>When will the payer pay?<select data-gb="pm" data-rd="1"><option value="later" ${groupForm.pm === "later" ? "selected" : ""}>Pay later (leave pending)</option><option value="dep" ${groupForm.pm === "dep" ? "selected" : ""}>Pay a deposit now</option><option value="full" ${groupForm.pm === "full" ? "selected" : ""}>Pay in full now</option></select></label>${groupForm.pm === "later" ? "" : `${groupForm.pm === "dep" ? gf("dep", "Deposit (KES)", "number") : `<label>Amount (KES)<input readonly value="${R2(total)}"></label>`}<label>Method<select data-gb="m" data-rd="1"><option value="cash" ${groupForm.m === "cash" ? "selected" : ""}>Cash</option><option value="mpesa" ${groupForm.m === "mpesa" ? "selected" : ""}>M-Pesa</option><option value="account" ${groupForm.m === "account" ? "selected" : ""}>${groupForm.payer === "company" ? "Company account" : "Customer account"}</option></select></label>${groupForm.payer === "person" && groupForm.m === "account" ? acs("Customer account") : ""}`}</div>
 <div class="stk">${groupForm.sel.length} room(s) × ${nn} night(s)${disc ? " at " + disc + "% off" : ""} = <b>KES ${R2(total)}</b>. ${groupForm.pm === "later" ? "The full amount stays pending on the group folio." : ""}</div>
 <div class="shp"><button class="chip on" data-f="gbgo">Create group booking</button>${groupForm.in <= todayYmd() ? '<button class="mini" data-f="gbgo" data-now="1">Create and check in now</button>' : ""}</div></div>
 <div class="fd-card"><h4>Group bookings</h4>${tableHTML(["Group", "Payer", "Rooms", "Dates", "Status", "Total", "Paid", "Balance", ""], list)}</div>`;
  },
  gfolio() {
    const g = GROUPS.find(x => x.id === fdSelectedGroup);
    if (!g)
      return '<div class="fd-card"><div class="stk">Open a group from the Group Booking list.</div></div>';
    const R = groupReservations(g),
      T = sSum(R, r => folioOf(r).total),
      P = sSum(R, r => folioOf(r).paid),
      B = T - P,
      st = groupStatus(g);
    return `<div class="fd-card"><h4>Group folio · ${hx(g.name)}<small>${st}</small></h4><div class="stk">${g.payer === "company" ? "Company pays" : "Person pays"}: <b>${hx(groupPayerName(g))}</b>${g.pphone ? " · " + hx(g.pphone) : ""} · ${g.in} to ${g.out} · ${R.length} room(s)</div>
 ${tableHTML(
   ["Room", "Type", "Guest", "Rate", "Status", "Charges", "Paid", "Balance", ""],
   R.map(r => {
     const f = folioOf(r);
     return [
       r.room,
       hx(r.type),
       hx(r.guest),
       R2(r.rate),
       r.status === "inhouse" ? "In house" : r.status === "out" ? "Checked out" : "Reserved",
       R2(f.total),
       R2(f.paid),
       R2(f.bal),
       `<button class="mini" data-f="folio" data-id="${r.id}">Room folio</button>`
     ];
   }).concat([
     [
       "",
       "",
       "",
       "",
       "<b>Total</b>",
       "<b>" + R2(T) + "</b>",
       "<b>" + R2(P) + "</b>",
       "<b>" + R2(B) + "</b>",
       ""
     ]
   ])
 )}
 <div class="status ${B > 0.009 ? "bad" : "ok"}">Group balance due: KES ${R2(B)}</div>
 ${st !== "cancelled" && B > 0.009 ? `<div class="fd-form"><label>Amount (KES)<input id="g_a" type="number" value="${B}"></label><label>Method<select id="g_m"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="account" ${g.payer === "company" ? "selected" : ""}>Customer account</option></select></label><label>Account<select id="g_c">${CU.map((c, i) => `<option value="${i}" ${i === g.ac ? "selected" : ""}>${hx(c.n)}</option>`).join("")}</select></label><button class="chip on" data-f="gpay">Receive group payment</button></div>` : ""}
 <div class="shp">${st === "reserved" ? `<button class="chip on" data-f="gci" data-id="${g.id}">Check in group</button><button class="mini" data-f="gcancel" data-id="${g.id}">Cancel group</button>` : ""}${st === "in house" ? `<button class="chip on" data-f="gout" data-id="${g.id}">Check out group</button>${B > 0.009 ? `<button class="mini" data-f="gout" data-pend="1" data-id="${g.id}">Check out · leave KES ${R2(B)} pending</button>` : ""}` : ""}<button class="mini" data-f="ginv" data-id="${g.id}">Print group invoice</button><button class="mini" data-f="glist" data-id="${g.id}">Print guest list</button></div></div>${gReg(g)}`;
  },
  pending() {
    const L = RESERVATIONS.filter(
        r => (r.status === "inhouse" || r.status === "out") && folioOf(r).bal > 0.009
      ).sort((a, b) => (a.out < b.out ? -1 : 1)),
      T = sSum(L, r => folioOf(r).bal);
    return `<div class="fd-kpi"><div><span>Guests owing</span><b>${L.length}</b></div><div><span>Total pending</span><b>KES ${R2(T)}</b></div><div><span>Checked out, still owing</span><b>${L.filter(r => r.status === "out").length}</b></div></div><div class="fd-card"><h4>Pending payments</h4>${tableHTML(
      ["Guest", "Room", "Status", "Departure", "Charges", "Paid", "Balance", ""],
      L.map(r => {
        const f = folioOf(r);
        return [
          hx(r.guest),
          r.room,
          r.status === "inhouse" ? "In house" : "Checked out",
          r.out,
          R2(f.total),
          R2(f.paid),
          "<b>" + R2(f.bal) + "</b>",
          `<button class="mini" data-f="folio" data-id="${r.id}">Open folio · Pay</button>`
        ];
      })
    )}<div class="stk">Guests can pay at any time, before or after check-out. Open the folio to receive cash, M-Pesa, or charge a customer account.</div></div>`;
  },
  folio() {
    const r = RESERVATIONS.find(x => x.id === fdSelectedRes);
    if (!r)
      return '<div class="fd-card"><div class="stk">Pick a guest from the Rooms Grid or the guests list.</div></div>';
    const f = folioOf(r);
    return `<div class="fd-card"><h4>Folio · Room ${r.room} · ${hx(r.guest)}<small>${r.status === "inhouse" ? "in house" : r.status}</small></h4><div class="stk">${hx(r.phone || "")}${r.idno ? " · ID " + hx(r.idno) : ""} · ${r.in} to ${r.out} · ${f.n} night(s) at KES ${R2(r.rate)} room only · ${MEAL_PLANS[r.plan || "RO"]}</div>
 ${tableHTML(
   ["Date", "Description", "Amount"],
   [[r.in, `Room ${r.room} · ${f.n} night(s) @ ${R2(r.rate)}`, R2(f.room)]].concat(
     f.meal > 0
       ? [
           [
             r.in,
             hx(MEAL_PLANS[r.plan]) +
               " · " +
               (r.adults || 1) +
               " adult(s)" +
               (r.children || 0 ? " + " + r.children + " child(ren)" : "") +
               " × " +
               f.n +
               " night(s) @ " +
               R2(r.mrate) +
               " pp",
             R2(f.meal)
           ]
         ]
       : [],
     r.charges.map(c => [toYmd(c.at), hx(c.cat + ": " + c.desc), R2(c.amt)]),
     [["", "<b>Total charges</b>", "<b>" + R2(f.total) + "</b>"]]
   )
 )}
 ${
   r.pays.length
     ? tableHTML(
         ["Date", "Payment", "Amount"],
         r.pays.map(p => [toYmd(p.at), PAY_METHODS[p.method] || p.method, R2(p.amt)])
       )
     : ""
 }
 <div class="status ${f.bal > 0 ? "bad" : "ok"}">Balance due: KES ${R2(f.bal)}</div>
 ${r.status === "inhouse" || r.status === "reserved" || (r.status === "out" && f.bal > 0.009) ? `<div class="fd-form"><label>Amount (KES)<input id="m_a" type="number" value="${f.bal > 0 ? f.bal : ""}"></label><label>Method<select id="m_m"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="account">Customer account</option></select></label><label>Account<select id="m_c">${CU.map((c, i) => `<option value="${i}">${hx(c.n)}</option>`).join("")}</select></label><button class="chip on" data-f="paygo">Receive payment</button></div>` : ""}
 <div class="shp">${r.status === "reserved" ? `<button class="chip on" data-f="ci" data-id="${r.id}">Check in</button><button class="mini" data-f="chg" data-id="${r.id}">Change dates</button>` : ""}${r.status === "inhouse" ? `<button class="chip on" data-f="out" data-id="${r.id}">Check out</button>${f.bal > 0.009 ? `<button class="mini" data-f="out" data-pend="1" data-id="${r.id}">Check out · leave KES ${R2(f.bal)} pending</button>` : ""}<button class="mini" data-f="chg" data-id="${r.id}">Change dates</button>` : ""}${r.grp ? `<button class="mini" data-f="gopen" data-id="${r.grp}">Group folio</button>` : ""}<button class="mini" data-f="inv" data-id="${r.id}">Print invoice</button></div></div>`;
  }
};

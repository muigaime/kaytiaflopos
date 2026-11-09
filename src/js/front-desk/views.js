const FD_VIEWS = {
  grid() {
    const c = roomStatusCounts(),
      T = fdToday(),
      tile = (l, v, s, go) =>
        `<${go ? `button data-v="${go}"` : "div"} class="fd-t"><span>${l}</span><b>${v}</b><small>${s}</small></${go ? "button" : "div"}>`,
      arr = RESERVATIONS.filter(r => r.status === "reserved" && r.in <= T && !r.grp).length,
      dep = RESERVATIONS.filter(r => r.status === "inhouse" && r.out <= T).length,
      L = ROOMS.filter(r => !fdRoomF || roomStatus(r) === fdRoomF);
    return `<div class="fd-kpi fd-tiles">${tile("Occupancy", ROOMS.length ? Math.round(((c.occ || 0) / ROOMS.length) * 100) + "%" : "0%", `${c.occ || 0} of ${ROOMS.length} rooms`)}${tile("Ready to sell", c.vac || 0, "Vacant and clean")}${tile("Arrivals", arr, "Due to check in", "checkin")}${tile("Departures", dep, "Due to leave", "guests")}${tile("To clean", c.dirty || 0, "Waiting for housekeeping", "hk")}</div>
    <div class="fd-leg" role="group" aria-label="Show rooms by status"><button class="${fdRoomF ? "" : "on"}" data-f="rflt" data-k="">All <b>${ROOMS.length}</b></button>${Object.keys(
      ROOM_STATUS_LABELS
    )
      .map(
        k =>
          `<button class="${fdRoomF === k ? "on" : ""}" data-f="rflt" data-k="${k}"><i class="fs-${k}"></i>${ROOM_STATUS_LABELS[k]} <b>${c[k] || 0}</b></button>`
      )
      .join("")}</div><div class="fd-grid">${
      L.map(r => {
        const x = roomStatus(r),
          st = stayOf(r.no),
          rv = RESERVATIONS.find(
            q =>
              q.room === r.no && q.status === "reserved" && q.in <= fdToday() && q.out > fdToday()
          );
        return `<button class="fd-room fs-${x} ${fdSelectedRoom === r.no ? "sel" : ""}" data-f="room" data-no="${r.no}"><b>${r.no}</b><span>${r.type}</span><em>${st ? hx(st.guest) : rv ? "Due: " + hx(rv.guest) : ROOM_STATUS_LABELS[x]}</em><small>KES ${r.rate.toLocaleString()}</small></button>`;
      }).join("") || '<div class="stk">No rooms with this status.</div>'
    }</div>${roomPanel()}`;
  },
  checkin() {
    ensureRoomTypes();
    const arr = RESERVATIONS.filter(r => r.status === "reserved" && r.in <= fdToday() && !r.grp);
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
 <div class="ci-sec">Payment</div><div class="fd-form"><label>When will the guest pay?<select data-cs="pm" data-rd="1"><option value="later" ${checkInForm.pm === "later" ? "selected" : ""}>Pay later (leave pending)</option><option value="dep" ${checkInForm.pm === "dep" ? "selected" : ""}>Make a partial payment now</option><option value="full" ${checkInForm.pm === "full" ? "selected" : ""}>Pay in full now</option></select></label>${checkInForm.pm === "later" ? "" : `${checkInForm.pm === "dep" ? cs("dep", "Partial payment (KES)", "number") : `<label>Amount (KES)<input readonly value="${R2(ttl)}"></label>`}<label>Method<select data-cs="m" data-rd="1"><option value="cash" ${checkInForm.m === "cash" ? "selected" : ""}>Cash</option><option value="mpesa" ${checkInForm.m === "mpesa" ? "selected" : ""}>M-Pesa</option><option value="account" ${checkInForm.m === "account" ? "selected" : ""}>Customer account</option></select></label>${checkInForm.m === "account" ? `<label>Customer account<select data-cs="ac">${CU.map((c, i) => (c.off ? "" : `<option value="${i}" ${String(i) === String(checkInForm.ac) ? "selected" : ""}>${hx(c.n)}</option>`)).join("")}</select></label>` : ""}`}</div>${checkInForm.pm === "later" ? '<div class="stk">The room charge stays pending on the guest folio. It can be paid any time, before or after check-out.</div>' : ""}
 ${warn ? `<div class="fd-note no">${warn}</div>` : ""}<div class="stk">Room KES ${R2(parseFloat(rate) || 0)}${mp > 0 ? " + " + MEAL_PLANS[checkInForm.plan] + " KES " + R2(mp) : ""} per night × ${nn} night(s) = <b>KES ${R2(ttl)}</b></div>
 <button class="chip on" data-f="walkgo">Check in guest</button></div>${roomTypeProfileHTML(t, vac)}</div>`;
  },
  book() {
    const up = RESERVATIONS.filter(r => r.status === "reserved" && !r.grp).sort((a, b) =>
      a.in < b.in ? -1 : 1
    );
    return `<div class="fd-card"><h4>Room booking (reservation)</h4><div class="fd-form">${inputHTML("b_g", "Guest name")}${inputHTML("b_p", "Phone")}${inputHTML("b_i", "ID / passport no.")}<select id="b_r">${roomOptionsHTML(ROOMS, fdPresetRoom)}</select><label>Check-in<input id="b_in" type="date" value="${fdToday()}"></label><label>Check-out<input id="b_out" type="date" value="${addDays(fdToday(), 1)}"></label><label>Adults<input id="b_a" type="number" min="1" value="1"></label><label>Children<input id="b_c" type="number" min="0" value="0"></label><label>Meal plan<select id="b_plan">${Object.keys(
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
  tariff() {
    return tariffView();
  },
  req() {
    const F = fdReq,
      api = window.fdReqApi,
      D = [...(fdCan("desk") ? ["Front Office"] : []), ...(fdCan("hk") ? ["Housekeeping"] : [])],
      stores = api ? api.stores() : [],
      items = api ? api.items() : [],
      name = k => (items.find(i => i.k === k) || { name: k }).name,
      uom = k => (items.find(i => i.k === k) || { uom: "" }).uom,
      opt = (L, v) => L.map(x => `<option ${x === v ? "selected" : ""}>${hx(x)}</option>`).join("");
    if (!D.includes(F.dept)) F.dept = D[0];
    if (!stores.includes(F.store)) F.store = stores[0] || "";
    if (!items.length)
      return '<div class="fd-card"><div class="stk">There are no stock items yet. Ask the store to add them.</div></div>';
    const mine = api.list(D);
    return `<div class="fd-card"><h4>New requisition</h4><div class="fd-form"><label>For<select id="r_d">${opt(D, F.dept)}</select></label><label>From store<select id="r_s">${opt(stores, F.store)}</select></label><label>Note<input id="r_n" value="${hx(F.note)}" placeholder="Optional"></label></div>
    <div class="fd-form"><label>Item<select id="r_k">${items.map(i => `<option value="${hx(i.k)}">${hx(i.name)} (${hx(i.uom)})</option>`).join("")}</select></label><label>Quantity<input id="r_q" type="number" min="0" step="any" placeholder="e.g. 5"></label><button class="mini" data-f="reqadd">Add item</button></div>
    ${
      F.lines.length
        ? tableHTML(
            ["Item", "Quantity", ""],
            F.lines.map((x, i) => [
              hx(name(x.k)),
              `${x.q} ${hx(uom(x.k))}`,
              `<button class="mini" data-f="reqdel" data-i="${i}">Remove</button>`
            ])
          )
        : ""
    }
    <div class="shp"><button class="chip on" data-f="reqsend">Send requisition</button></div></div>
    <div class="fd-card"><h4>Recent requisitions<small>${mine.length}</small></h4>${tableHTML(
      ["Date", "Number", "For", "From", "Items", "By", "Status"],
      mine.map(r => [
        r.date,
        hx(r.id),
        hx(r.dept),
        hx(r.store),
        hx(r.items),
        hx(r.by),
        hx(r.status)
      ])
    )}</div>`;
  },
  rexp() {
    const L = roomExpenses().slice().reverse().slice(0, 100),
      month = fdToday().slice(0, 7),
      total = roomExpenses()
        .filter(x => x.bd.slice(0, 7) === month)
        .reduce((a, x) => a + x.amt, 0),
      opt = A => A.map(x => `<option>${hx(x)}</option>`).join("");
    return `<div class="fd-card"><h4>Record a room expense</h4><div class="fd-form"><label>Room<select id="x_room">${opt(ROOMS.map(r => String(r.no)))}</select></label><label>Type<select id="x_kind">${opt(RX_KINDS)}</select></label><label>What it was for<input id="x_desc" maxlength="120" placeholder="e.g. Replaced shower head"></label><label>Amount (KES)<input id="x_amt" type="number" min="0" step="any"></label><label>Paid by<select id="x_paid">${opt(RX_PAID)}</select></label><button class="chip on" data-f="rxadd">Save expense</button></div></div>
    <div class="fd-card"><h4>Room expenses<small>This month KES ${R2(total)}</small></h4>${tableHTML(
      ["Date", "Room", "Type", "What it was for", "Paid by", "Recorded by", "Amount"],
      L.map(x => [x.bd, x.room, hx(x.kind), hx(x.desc), hx(x.paid), hx(x.by), R2(x.amt)])
    )}</div>`;
  },
  hk() {
    const c = roomStatusCounts(),
      btn = (r, set, l, main) =>
        `<button class="${main ? "chip on" : "mini"}" data-f="hkset" data-no="${r.no}" data-set="${set}">${l}</button>`,
      acts = (r, x) =>
        x === "occ"
          ? '<span class="stk">Guest in the room</span>'
          : x === "dirty"
            ? btn(r, "vac", "Mark clean", 1) + btn(r, "ooo", "Out of order")
            : x === "ooo"
              ? btn(r, "vac", "Back in service", 1) + btn(r, "dirty", "Mark dirty")
              : btn(r, "dirty", "Mark dirty") + btn(r, "ooo", "Out of order"),
      A = hkAssigned(),
      sup = fdCan("hksup"),
      staff = sup && window.fdHkStaff ? window.fdHkStaff() : [],
      mine = ROOMS.filter(r => (A[r.no] || {}).to === user.n).length,
      who = r =>
        sup
          ? `<select class="fd-hks" data-hka="${r.no}" aria-label="Assign room ${r.no}"><option value="">Not assigned</option>${[...new Set([...staff, ...(A[r.no] ? [A[r.no].to] : [])])].map(n => `<option ${A[r.no] && A[r.no].to === n ? "selected" : ""}>${hx(n)}</option>`).join("")}</select>`
          : A[r.no]
            ? `<span class="fd-hkw">${A[r.no].to === user.n ? "Assigned to you" : "Assigned to " + hx(A[r.no].to)}</span>`
            : "",
      L = ROOMS.filter(
        r => !fdHkF || (fdHkF === "mine" ? (A[r.no] || {}).to === user.n : roomStatus(r) === fdHkF)
      );
    return `<div class="fd-card fd-hkbar"><div class="fd-leg" role="group" aria-label="Show rooms by status"><button class="${fdHkF ? "" : "on"}" data-f="hkf" data-k="">All <b>${ROOMS.length}</b></button>${mine || !sup ? `<button class="${fdHkF === "mine" ? "on" : ""}" data-f="hkf" data-k="mine">My rooms <b>${mine}</b></button>` : ""}${Object.keys(
      ROOM_STATUS_LABELS
    )
      .map(
        k =>
          `<button class="${fdHkF === k ? "on" : ""}" data-f="hkf" data-k="${k}"><i class="fs-${k}"></i>${ROOM_STATUS_LABELS[k]} <b>${c[k] || 0}</b></button>`
      )
      .join(
        ""
      )}</div><div class="shp"><button class="mini" data-f="hkprint" data-only="1">Print rooms to clean</button><button class="mini" data-f="hkprint">Print all rooms</button></div></div>
    <div class="fd-hk">${
      L.map(r => {
        const x = roomStatus(r);
        return `<div class="fd-hkr hs-${x}"><div class="fd-hkt"><b>${r.no}</b><span>${hx(r.type)}</span><em class="fs-${x}">${ROOM_STATUS_LABELS[x]}</em></div>${who(r)}<div class="fd-hka">${acts(r, x)}</div></div>`;
      }).join("") || '<div class="stk">No rooms with this status.</div>'
    }</div>`;
  },
  guests() {
    const T = fdToday(),
      ih = RESERVATIONS.filter(r => r.status === "inhouse"),
      ar = RESERVATIONS.filter(r => r.status === "reserved" && r.in === T),
      dp = ih.filter(r => r.out <= T),
      all = RESERVATIONS.filter(r => r.status !== "cancelled")
        .sort((a, b) => (a.in < b.in ? 1 : -1))
        .slice(0, 300),
      folio = r => `<button class="mini" data-f="folio" data-id="${r.id}">Folio</button>`;
    return `<div class="fd-card"><h4>In the house<small>${ih.length}</small></h4>${tableHTML(
      ["Guest", "Room", "Arrival", "Departure", "Charges", "Paid", "Balance", ""],
      ih.map(r => {
        const f = folioOf(r);
        return [hx(r.guest), r.room, r.in, r.out, R2(f.total), R2(f.paid), R2(f.bal), folio(r)];
      })
    )}</div>
    <div class="fd-two"><div class="fd-card"><h4>Arrivals today<small>${ar.length}</small></h4>${tableHTML(
      ["Guest", "Room", "Departure", ""],
      ar.map(r => [
        hx(r.guest),
        r.room,
        r.out,
        `<button class="mini" data-f="ci" data-id="${r.id}">Check in</button>`
      ])
    )}</div><div class="fd-card"><h4>Departures due<small>${dp.length}</small></h4>${tableHTML(
      ["Guest", "Room", "Departure", "Balance", ""],
      dp.map(r => [hx(r.guest), r.room, r.out, R2(folioOf(r).bal), folio(r)])
    )}</div></div>
    <div class="fd-card"><div class="fd-gh"><h4>All guests</h4><input id="fdGq" type="search" placeholder="Find a guest, room or ID number" autocomplete="off" aria-label="Find a guest"></div><div id="fdGuests">${tableHTML(
      ["Guest", "ID no.", "Room", "Arrival", "Departure", "Status", "Balance", ""],
      all.map(r => {
        const l = (r.guests || [])[0] || {};
        return [
          hx(r.guest),
          hx(l.idn || r.idno || ""),
          r.room,
          r.in,
          r.out,
          r.status === "inhouse" ? "In house" : r.status === "out" ? "Checked out" : "Reserved",
          R2(folioOf(r).bal),
          `${folio(r)} <button class="mini" data-f="inv" data-id="${r.id}">Invoice</button>`
        ];
      })
    )}</div></div>`;
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
        `<label>${l}<select data-gb="ac">${CU.map((c, i) => (c.off ? "" : `<option value="${i}" ${String(i) === String(groupForm.ac) ? "selected" : ""}>${hx(c.n)}</option>`)).join("")}</select></label>`,
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
 <div class="ci-sec">Dates and group rate</div><div class="fd-form"><label>Check-in<input type="date" data-gb="in" data-rd="1" value="${groupForm.in}" min="${fdToday()}"></label><label>Check-out<input type="date" data-gb="out" data-rd="1" value="${groupForm.out}" min="${addDays(groupForm.in, 1)}"></label>${gf("disc", "Group discount %", "number", 'min="0" max="50" data-rd="1"')}<label>Meal plan<select data-gb="plan" data-rd="1">${Object.keys(
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
 <div class="shp"><button class="chip on" data-f="gbgo">Create group booking</button>${groupForm.in <= fdToday() ? '<button class="mini" data-f="gbgo" data-now="1">Create and check in now</button>' : ""}</div></div>
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
 ${st !== "cancelled" && B > 0.009 ? `<div class="fd-form"><label>Amount (KES)<input id="g_a" type="number" value="${B}"></label><label>Method<select id="g_m"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="account" ${g.payer === "company" ? "selected" : ""}>Customer account</option></select></label><label>Account<select id="g_c">${CU.map((c, i) => (c.off ? "" : `<option value="${i}" ${i === g.ac ? "selected" : ""}>${hx(c.n)}</option>`)).join("")}</select></label><button class="chip on" data-f="gpay">Receive group payment</button></div>` : ""}
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
     r.charges.map(c => [bizDateOf(c.at), hx(c.cat + ": " + c.desc), R2(c.amt)]),
     [["", "<b>Total charges</b>", "<b>" + R2(f.total) + "</b>"]]
   )
 )}
 ${
   r.pays.length
     ? tableHTML(
         ["Date", "Payment", "Amount"],
         r.pays.map(p => [
           bizDateOf(p.at),
           (PAY_METHODS[p.method] || p.method) +
             (p.cur ? ` · ${hx(p.cur)} ${R2(p.fcy)} at ${p.rate}` : ""),
           R2(p.amt)
         ])
       )
     : ""
 }
 <div class="status ${f.bal > 0 ? "bad" : "ok"}">Balance due: KES ${R2(f.bal)}</div>
 ${r.status === "inhouse" || r.status === "reserved" || (r.status === "out" && f.bal > 0.009) ? `<div class="fd-form"><label>Amount<input id="m_a" type="number" value="${f.bal > 0 ? f.bal : ""}"></label><label>Currency<select id="m_cur" data-bal="${f.bal > 0 ? f.bal : 0}">${fxOpts("KES")}</select></label><label>Method<select id="m_m"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="account">Customer account</option></select></label><label>Account<select id="m_c">${CU.map((c, i) => (c.off ? "" : `<option value="${i}">${hx(c.n)}</option>`)).join("")}</select></label><button class="chip on" data-f="paygo">Receive payment</button></div>` : ""}
 <div class="shp">${r.status === "reserved" ? `<button class="chip on" data-f="ci" data-id="${r.id}">Check in</button><button class="mini" data-f="chg" data-id="${r.id}">Change dates</button>` : ""}${r.status === "inhouse" ? `<button class="chip on" data-f="out" data-id="${r.id}">Check out</button>${f.bal > 0.009 ? `<button class="mini" data-f="out" data-pend="1" data-id="${r.id}">Check out · leave KES ${R2(f.bal)} pending</button>` : ""}<button class="mini" data-f="chg" data-id="${r.id}">Change dates</button>` : ""}${r.grp ? `<button class="mini" data-f="gopen" data-id="${r.grp}">Group folio</button>` : ""}<button class="mini" data-f="inv" data-id="${r.id}">Print invoice</button></div></div>`;
  }
};

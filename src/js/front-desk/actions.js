const fdNotify = (t, ok) => {
  fdNotice = t ? { t, ok: !!ok } : null;
};
function recPay(r, method, amt, ci) {
  if (!(amt > 0)) return "Enter an amount above zero.";
  if (method === "account") {
    const c = CU[ci];
    if (!c) return "Choose a customer account.";
    if (c.owes + amt > c.limit) return c.n + " would go over its credit limit.";
  }
  if (!shiftOk()) return "__shift";
  if (method === "account") CU[ci].owes += amt;
  r.pays.push({ at: new Date().toISOString(), method, amt, by: user.n });
  const pos = posCut(r, amt),
    fresh = amt - pos;
  SALES.push({
    no: "FD-" + String(SALES.length + 1).padStart(4, "0"),
    at: new Date(),
    bd: bizDate(),
    dept: "Front Desk",
    label: "Room " + r.room,
    user: user.n,
    net: fresh,
    tax: 0,
    g: fresh,
    lines: [{ id: 0, n: "Room " + r.room + " · " + r.guest, q: 1, p: fresh, t: "A" }],
    mx: { [method === "account" ? "credit" : method]: amt, ...(pos > 0 ? { room: -pos } : {}) }
  });
  sync();
  return "";
}
$("#fd").onclick = e => {
  const vb = e.target.closest("[data-v]");
  if (vb) {
    fdView = vb.dataset.v;
    fdNotice = null;
    fdPresetRoom = "";
    if (fdView === "shift") {
      fdView = "grid";
      shiftOpen();
    }
    return fdDraw();
  }
  const b = e.target.closest("[data-f]");
  if (!b) return;
  const f = b.dataset.f,
    id = b.dataset.id,
    no = b.dataset.no,
    g = i => $("#" + i).value.trim(),
    n = i => parseFloat($("#" + i).value),
    T = todayYmd();
  let r = RESERVATIONS.find(x => x.id === id);
  if (f === "room") {
    fdSelectedRoom = no;
  } else if (f === "folio") {
    fdSelectedRes = id;
    fdView = "folio";
  } else if (f === "chg") {
    fdSelectedRes = id;
    fdView = "dates";
  } else if (f === "walk") {
    fdPresetRoom = no;
    fdView = "checkin";
  } else if (f === "bookroom") {
    fdPresetRoom = no;
    fdView = "book";
  } else if (f === "hkset") {
    const rm = roomByNo(no);
    if (stayOf(no)) fdNotify("The room is occupied.");
    else rm.status = b.dataset.set;
  } else if (f === "ci") {
    const rm = roomByNo(r.room),
      x = roomStatus(rm);
    if (x === "ooo" || x === "dirty")
      fdNotify(
        "Room " + r.room + " is " + ROOM_STATUS_LABELS[x].toLowerCase() + ". Mark it clean first."
      );
    else if (stayOf(r.room)) fdNotify("Room " + r.room + " is occupied.");
    else if (!isFree(r.room, T, r.out, r.id))
      fdNotify("Room " + r.room + " is booked for those dates.");
    else {
      r.status = "inhouse";
      if (r.in > T) r.in = T;
      fdNotify(r.guest + " checked in to room " + r.room + ".", 1);
      fdSelectedRes = r.id;
      fdView = "folio";
    }
  } else if (f === "walkgo") {
    const t = roomTypeByName(checkInForm.type),
      gn = checkInForm.g.trim(),
      nn = parseInt(checkInForm.n) || 0,
      ad = parseInt(checkInForm.a) || 0,
      ch = parseInt(checkInForm.c) || 0,
      rate = parseFloat(checkInForm.rate !== "" ? checkInForm.rate : t && t.rate),
      tot = nn * (rate + mealPerNight(checkInForm.plan, ad, ch)),
      dep =
        checkInForm.pm === "full"
          ? tot
          : checkInForm.pm === "dep"
            ? parseFloat(checkInForm.dep) || 0
            : 0;
    if (!t) fdNotify("Choose a room type.");
    else if (!gn || nn < 1) fdNotify("Enter the guest name and the number of nights.");
    else if (!checkInForm.nat.trim() || !checkInForm.i.trim())
      fdNotify("Nationality and ID / passport number are required to register the guest.");
    else if (ad < 1 || (t.adults && ad > t.adults))
      fdNotify(t.name + " takes 1 to " + t.adults + " adults.");
    else if (ch > t.children) fdNotify(t.name + " takes up to " + t.children + " children.");
    else if (ad + ch > t.max)
      fdNotify("Maximum occupancy for " + t.name + " is " + t.max + " guests.");
    else if (!(rate > 0) || rate < t.floor)
      fdNotify("The rate cannot be below the floor of KES " + R2(t.floor) + ".");
    else if (checkInForm.pm === "dep" && !(dep > 0)) fdNotify("Enter the partial payment amount.");
    else if (dep > tot + 0.009)
      fdNotify("The partial payment cannot be more than the total of KES " + R2(tot) + ".");
    else if (
      dep > 0 &&
      checkInForm.m === "account" &&
      (!CU[+checkInForm.ac] || CU[+checkInForm.ac].owes + dep > CU[+checkInForm.ac].limit)
    )
      fdNotify("The customer account is missing or over its credit limit.");
    else {
      const rm = (
        checkInForm.room === "auto"
          ? vacantRoomsOfType(t.name, !t.hk)
          : vacantRoomsOfType(t.name, !t.hk).filter(r => r.no === checkInForm.room)
      ).filter(r => isFree(r.no, T, addDays(T, nn)))[0];
      if (!rm) fdNotify("No ready " + t.name + " room is free for those dates.");
      else if (dep > 0 && !shiftOk()) {
        return;
      } else {
        const q = {
          id: "R" + Date.now(),
          guest: gn,
          phone: checkInForm.p.trim(),
          idno: checkInForm.i.trim(),
          guests: [
            {
              name: gn,
              nat: checkInForm.nat.trim(),
              idt: checkInForm.idt,
              idn: checkInForm.i.trim(),
              phone: checkInForm.p.trim(),
              email: checkInForm.em.trim(),
              gender: checkInForm.gd,
              doc: checkInForm.doc || "",
              docn: checkInForm.docn || ""
            }
          ],
          room: rm.no,
          type: t.name,
          rate,
          in: T,
          out: addDays(T, nn),
          adults: ad,
          children: ch,
          plan: checkInForm.plan,
          mrate: mealPlanPrice(checkInForm.plan),
          status: "inhouse",
          charges: [],
          pays: []
        };
        RESERVATIONS.push(q);
        if (dep > 0) recPay(q, checkInForm.m, dep, +checkInForm.ac);
        fdSelectedRes = q.id;
        fdView = "folio";
        const pend = tot - dep;
        fdNotify(
          gn +
            " checked in to room " +
            rm.no +
            " (" +
            t.name +
            ")." +
            (pend > 0.009 ? " KES " + R2(pend) + " left pending to pay later." : " Paid in full."),
          1
        );
        checkInFormReset();
      }
    }
  } else if (f === "gbtoggle") {
    const i = groupForm.sel.indexOf(no);
    i >= 0 ? groupForm.sel.splice(i, 1) : groupForm.sel.push(no);
  } else if (f === "gbadd") {
    const r = roomByNo(no),
      mx = (roomTypeByName(r.type) || { max: 9 }).max,
      L = (groupForm.gs[no] = groupForm.gs[no] || [newGuest()]);
    if (L.length >= mx) fdNotify("Room " + no + " takes at most " + mx + " guests.");
    else L.push(newGuest());
  } else if (f === "gbdel") {
    (groupForm.gs[no] || []).splice(+b.dataset.i, 1);
  } else if (f === "gbnat") {
    const v = $("#gb_nat").value.trim();
    if (!v) fdNotify("Type a nationality first.");
    else {
      groupForm.sel.forEach(n2 =>
        (groupForm.gs[n2] || []).forEach(x => {
          if (!x.nat) x.nat = v;
        })
      );
      fdNotify("Nationality applied.", 1);
    }
  } else if (f === "gopen") {
    fdSelectedGroup = id;
    fdView = "gfolio";
  } else if (f === "docv") {
    const h = docTarget(b.dataset.ctx);
    if (h && h.doc) {
      $("#docv img").src = h.doc;
      $("#docv").classList.add("show");
    }
    return;
  } else if (f === "docx") {
    const h = docTarget(b.dataset.ctx);
    if (h) {
      h.doc = "";
      h.docn = "";
    }
    fdNotify("ID copy removed.", 1);
  } else if (f === "gradd") {
    const r = RESERVATIONS.find(x => x.id === id),
      mx = (roomTypeByName(r.type) || { max: 9 }).max;
    if (guestsOf(r).length >= mx) fdNotify("Room " + r.room + " takes at most " + mx + " guests.");
    else guestsOf(r).push(newGuest());
  } else if (f === "grdel") {
    guestsOf(RESERVATIONS.find(x => x.id === id)).splice(+b.dataset.i, 1);
  } else if (f === "gnat") {
    const v = $("#gr_nat").value.trim(),
      g = GROUPS.find(x => x.id === fdSelectedGroup);
    if (!v) fdNotify("Type a nationality first.");
    else {
      groupReservations(g).forEach(r =>
        guestsOf(r).forEach(x => {
          if (!x.nat) x.nat = v;
        })
      );
      fdNotify("Nationality applied.", 1);
    }
  } else if (f === "glist") {
    printHTML(
      gListHTML(
        GROUPS.find(x => x.id === id),
        user && user.n
      ),
      false
    );
    return;
  } else if (f === "gbgo") {
    const now = b.dataset.now === "1",
      nn = nightsBetween(groupForm.in, groupForm.out),
      disc = parseFloat(groupForm.disc) || 0,
      rooms = groupForm.sel.map(roomByNo).filter(Boolean),
      gr = r => Math.round(r.rate * (1 - disc / 100)),
      total =
        sSum(rooms, gr) * nn +
        rooms.reduce((a, r) => a + (groupForm.gs[r.no] || [0]).length, 0) *
          mealPlanPrice(groupForm.plan) *
          nn,
      dep =
        groupForm.pm === "full"
          ? total
          : groupForm.pm === "dep"
            ? parseFloat(groupForm.dep) || 0
            : 0,
      acc = +groupForm.ac,
      low = rooms.find(r => gr(r) < ((roomTypeByName(r.type) || {}).floor || 0));
    if (!groupForm.name.trim()) fdNotify("Enter the group or event name.");
    else if (groupForm.payer === "person" && !groupForm.pname.trim())
      fdNotify("Enter the name of the person paying.");
    else if (groupForm.payer === "company" && !CU[acc])
      fdNotify("Choose the company account that will pay.");
    else if (groupForm.in < T || groupForm.out <= groupForm.in)
      fdNotify(
        "Check the dates: arrival cannot be in the past and departure must be after arrival."
      );
    else if (!rooms.length) fdNotify("Select at least one room.");
    else if (disc < 0 || disc > 50)
      fdNotify("The group discount must be between 0 and 50 percent.");
    else if (low)
      fdNotify("The discount takes room " + low.no + " (" + low.type + ") below its rate floor.");
    else if (groupForm.pm === "dep" && !(dep > 0)) fdNotify("Enter the deposit amount.");
    else if (dep > total + 0.009)
      fdNotify("The deposit is more than the group total of KES " + R2(total) + ".");
    else if (
      dep > 0 &&
      groupForm.m === "account" &&
      (!CU[acc] || CU[acc].owes + dep > CU[acc].limit)
    )
      fdNotify("The customer account is missing or over its credit limit.");
    else if (dep > 0 && !shiftOk()) {
      return;
    } else {
      const g = {
        id: "G" + Date.now(),
        name: groupForm.name.trim(),
        payer: groupForm.payer,
        pname: groupForm.pname.trim(),
        pphone: groupForm.pphone.trim(),
        ac: groupForm.payer === "company" ? acc : null,
        in: groupForm.in,
        out: groupForm.out,
        by: user.n,
        rooms: [],
        cancelled: false
      };
      rooms.forEach((r, i) => {
        const gs = (groupForm.gs[r.no] || [newGuest()]).map(x => Object.assign({}, x));
        const q = {
          id: "R" + Date.now() + "-" + i,
          guest: g.name + " · Rm " + r.no,
          phone: g.pphone,
          idno: "",
          room: r.no,
          type: r.type,
          rate: gr(r),
          plan: groupForm.plan,
          mrate: mealPlanPrice(groupForm.plan),
          in: g.in,
          out: g.out,
          adults: Math.max(1, gs.length),
          children: 0,
          status: "reserved",
          charges: [],
          pays: [],
          grp: g.id,
          guests: gs
        };
        if (gs[0].name.trim()) q.guest = gs[0].name.trim();
        if (gs[0].phone.trim()) q.phone = gs[0].phone.trim();
        if (gs[0].idn.trim()) q.idno = gs[0].idn.trim();
        RESERVATIONS.push(q);
        g.rooms.push(q.id);
      });
      GROUPS.push(g);
      let m = "Group booked: " + rooms.length + " room(s), KES " + R2(total) + ".";
      if (dep > 0) {
        const e = groupPay(g, groupForm.m, dep, acc);
        if (e && e !== "__shift") m += " Payment problem: " + e;
      }
      if (now) {
        const e = groupCheckIn(g);
        m += e ? " Not checked in: " + e : " Checked in.";
      }
      fdSelectedGroup = g.id;
      fdView = "gfolio";
      fdNotify(m, 1);
      groupFormReset();
    }
  } else if (f === "gci") {
    const g = GROUPS.find(x => x.id === id),
      e = groupCheckIn(g);
    fdNotify(e || g.name + " checked in.", !e);
  } else if (f === "gout") {
    const g = GROUPS.find(x => x.id === id),
      R = groupReservations(g).filter(r => r.status === "inhouse"),
      B = sSum(R, r => folioOf(r).bal),
      pd = b.dataset.pend === "1";
    if (!R.length) fdNotify("No rooms are in house.");
    else if (B > 0.009 && !pd)
      fdNotify("Settle the group balance of KES " + R2(B) + ", or check out and leave it pending.");
    else {
      R.forEach(r => {
        r.status = "out";
        r.outAt = new Date().toISOString();
        roomByNo(r.room).status = "dirty";
      });
      fdNotify(g.name + " checked out." + (B > 0.009 ? " KES " + R2(B) + " left pending." : ""), 1);
    }
  } else if (f === "gpay") {
    const g = GROUPS.find(x => x.id === fdSelectedGroup),
      m = groupPay(g, $("#g_m").value, n("g_a"), +$("#g_c").value);
    if (m === "__shift") return;
    fdNotify(m || "Group payment received.", !m);
  } else if (f === "gcancel") {
    const g = GROUPS.find(x => x.id === id),
      pd = sSum(groupReservations(g), r => sSum(r.pays, q => q.amt));
    g.cancelled = true;
    groupReservations(g).forEach(r => {
      r.status = "cancelled";
    });
    fdNotify(
      "Group cancelled." +
        (pd > 0 ? " A payment of KES " + R2(pd) + " was received, so refund it manually." : ""),
      1
    );
  } else if (f === "ginv") {
    printHTML(
      groupInvoiceHTML(
        GROUPS.find(x => x.id === id),
        user && user.n
      ),
      false
    );
    return;
  } else if (f === "hkprint") {
    printHTML(hkHTML(b.dataset.only === "1", user && user.n), false, "A4");
    return;
  } else if (f === "rtnew") {
    roomTypeEditing = "new";
  } else if (f === "rtedit") {
    roomTypeEditing = b.dataset.code;
  } else if (f === "rtcancel") {
    roomTypeEditing = null;
  } else if (f === "rtdel") {
    const t = ROOMTYPES.find(x => x.code === roomTypeEditing);
    if (ROOMS.some(r => r.type === t.name))
      fdNotify("Rooms still use this type. Move or remove them first.");
    else {
      ROOMTYPES.splice(ROOMTYPES.indexOf(t), 1);
      roomTypeEditing = null;
      fdNotify("Room type deleted.", 1);
    }
  } else if (f === "rtsave") {
    const o = {};
    document
      .querySelectorAll("#fd [data-rt]")
      .forEach(x => (o[x.dataset.rt] = x.type === "checkbox" ? x.checked : x.value.trim()));
    ["seq", "rate", "floor", "inc", "def", "max", "adults", "children", "bed"].forEach(
      k => (o[k] = parseFloat(o[k]) || 0)
    );
    const old = roomTypeEditing === "new" ? null : ROOMTYPES.find(x => x.code === roomTypeEditing);
    if (!o.code || !o.name || !(o.rate > 0)) fdNotify("Enter a code, a name and a published rate.");
    else if (ROOMTYPES.some(x => x !== old && (x.code === o.code || x.name === o.name)))
      fdNotify("That code or name is already used.");
    else if (o.floor > o.rate) fdNotify("The rate floor cannot be above the published rate.");
    else if (o.adults < 1 || o.max < 1 || o.def > o.max || o.adults > o.max)
      fdNotify("Check the occupancy: max guests must cover the default and the adults.");
    else {
      if (old) {
        if (old.name !== o.name) {
          ROOMS.forEach(r => {
            if (r.type === old.name) r.type = o.name;
          });
          RESERVATIONS.forEach(r => {
            if (r.type === old.name) r.type = o.name;
          });
        }
        if (old.rate !== o.rate)
          ROOMS.forEach(r => {
            if (r.type === o.name || r.type === old.name) r.rate = o.rate;
          });
        Object.assign(old, o);
      } else ROOMTYPES.push(o);
      roomTypeEditing = null;
      fdNotify("Room type saved.", 1);
    }
  } else if (f === "bookgo") {
    const gn = g("b_g"),
      rn = g("b_r"),
      a = g("b_in"),
      o = g("b_out"),
      rm = roomByNo(rn),
      ad = n("b_a") || 1,
      ch = n("b_c") || 0,
      plan = g("b_plan"),
      pm = g("b_pm"),
      nn = a && o && o > a ? nightsBetween(a, o) : 0,
      tot = rm ? nn * (rm.rate + mealPerNight(plan, ad, ch)) : 0,
      dep = pm === "full" ? tot : pm === "part" ? n("b_d") || 0 : 0;
    if (!gn || !rm || !a || !o) fdNotify("Enter the guest name, room and both dates.");
    else if (o <= a) fdNotify("Check-out must be after check-in.");
    else if (a < T) fdNotify("Check-in cannot be in the past.");
    else if (!isFree(rn, a, o)) fdNotify("Room " + rn + " is already booked for those dates.");
    else if (rm.status === "ooo") fdNotify("Room " + rn + " is out of order.");
    else if (pm === "part" && !(dep > 0)) fdNotify("Enter the deposit amount.");
    else if (dep > tot + 0.009)
      fdNotify("The deposit is more than the total of KES " + R2(tot) + ".");
    else if (dep > 0 && !shiftOk()) {
      return;
    } else {
      const q = {
        id: "R" + Date.now(),
        guest: gn,
        phone: g("b_p"),
        idno: g("b_i"),
        room: rn,
        type: rm.type,
        rate: rm.rate,
        plan,
        mrate: mealPlanPrice(plan),
        in: a,
        out: o,
        adults: ad,
        children: ch,
        status: "reserved",
        charges: [],
        pays: []
      };
      RESERVATIONS.push(q);
      if (dep > 0) recPay(q, g("b_m"), dep, 0);
      fdNotify(
        "Reservation created for " +
          gn +
          ", room " +
          rn +
          ". " +
          (tot - dep > 0.009 ? "KES " + R2(tot - dep) + " left to pay later." : "Paid in full."),
        1
      );
      fdPresetRoom = "";
    }
  } else if (f === "cancel") {
    r.status = "cancelled";
    fdNotify(
      "Reservation cancelled." +
        (sSum(r.pays, p => p.amt) > 0 ? " A payment was received, so refund it manually." : ""),
      1
    );
  } else if (f === "dgo") {
    r = RESERVATIONS.find(x => x.id === fdSelectedRes);
    const a = r.status === "inhouse" ? r.in : g("d_in"),
      o = g("d_out");
    if (!a || !o || o <= a) fdNotify("Check-out must be after check-in.");
    else if (!isFree(r.room, a, o, r.id)) fdNotify("Room " + r.room + " is booked in that period.");
    else {
      r.in = a;
      r.out = o;
      fdNotify("Dates updated.", 1);
    }
  } else if (f === "postgo") {
    const q = RESERVATIONS.find(x => x.id === g("p_r")),
      d = g("p_d"),
      a = n("p_a");
    if (!q || !d || !(a > 0)) fdNotify("Choose a room, enter a description and an amount.");
    else {
      q.charges.push({ at: new Date().toISOString(), cat: g("p_c"), desc: d, amt: a });
      fdNotify("Charge posted to room " + q.room + ".", 1);
    }
  } else if (f === "salego") {
    const d = g("s_d"),
      a = n("s_a"),
      m = g("s_m");
    if (!d || !(a > 0)) fdNotify("Enter a description and an amount.");
    else if (!shiftOk()) {
      return;
    } else {
      SALES.push({
        no: "FD-" + String(SALES.length + 1).padStart(4, "0"),
        at: new Date(),
        bd: bizDate(),
        dept: "Front Desk",
        label: "Cash sale",
        user: user.n,
        net: a,
        tax: 0,
        g: a,
        lines: [{ id: 0, n: d, q: 1, p: a, t: "A" }],
        mx: { [m]: a }
      });
      sync();
      fdNotify("Sale recorded.", 1);
    }
  } else if (f === "expgo") {
    const d = g("x_d"),
      a = n("x_a");
    if (!d || !(a > 0)) fdNotify("Enter a description and an amount.");
    else if (!shiftOk()) {
      return;
    } else {
      const m = addPayout(shiftOf(user.n), g("x_c"), d, a, user.n);
      fdNotify(m || "Expense posted.", !m);
    }
  } else if (f === "paygo") {
    r = RESERVATIONS.find(x => x.id === fdSelectedRes);
    const m = recPay(r, g("m_m"), n("m_a"), +$("#m_c").value);
    if (m === "__shift") return;
    fdNotify(m || "Payment received.", !m);
  } else if (f === "out") {
    const q = folioOf(r),
      pd = b.dataset.pend === "1";
    if (q.bal > 0.009 && !pd)
      fdNotify("Settle the balance of KES " + R2(q.bal) + ", or check out and leave it pending.");
    else {
      r.status = "out";
      r.outAt = new Date().toISOString();
      roomByNo(r.room).status = "dirty";
      fdNotify(
        r.guest +
          " checked out. Room " +
          r.room +
          " is now dirty." +
          (q.bal > 0.009 ? " KES " + R2(q.bal) + " left pending under Pending Payments." : ""),
        1
      );
    }
  } else if (f === "inv") {
    printHTML(guestInvoiceHTML(r, user && user.n), false);
    return;
  } else if (f === "acpay") {
    const c = CU[+b.dataset.i],
      a = n("ap_" + b.dataset.i);
    if (!(a > 0)) fdNotify("Enter an amount.");
    else {
      c.owes = Math.max(0, c.owes - a);
      fdNotify("Payment recorded for " + c.n + ".", 1);
    }
  } else if (f === "acnew") {
    const nm = g("n_n"),
      l = n("n_l");
    if (!nm || !(l >= 0)) fdNotify("Enter a name and a credit limit.");
    else {
      CU.push({ n: nm, limit: l, owes: 0 });
      fdNotify("Account created for " + nm + ".", 1);
    }
  } else if (f === "radd") {
    const rn = g("r_n"),
      rt = n("r_r") || (roomTypeByName(g("r_t")) || {}).rate;
    if (!rn || !(rt > 0)) fdNotify("Enter a room number and a rate.");
    else if (roomByNo(rn)) fdNotify("That room number already exists.");
    else {
      ROOMS.push({ no: rn, type: g("r_t"), rate: rt, status: "vac" });
      fdNotify("Room " + rn + " added.", 1);
    }
  } else if (f === "rdel") {
    if (
      RESERVATIONS.some(x => x.room === no && (x.status === "reserved" || x.status === "inhouse"))
    )
      fdNotify("Room " + no + " has an active stay or booking.");
    else {
      ROOMS.splice(
        ROOMS.findIndex(x => x.no === no),
        1
      );
      fdNotify("Room " + no + " removed.", 1);
    }
  } else if (f === "pday") {
    const d = DAYS.filter(x => x.closedAt)
      .slice()
      .reverse()[+b.dataset.i];
    printHTML(dayReport(d, user && user.n));
    return;
  }
  sync();
  fdDraw();
};
$("#fd").oninput = e => {
  const k4 = e.target.dataset.gbg;
  if (k4) {
    const [no, i, f] = k4.split("|"),
      G = (groupForm.gs[no] || (groupForm.gs[no] = [newGuest()]))[+i];
    if (G) G[f] = e.target.value;
    return;
  }
  const k = e.target.dataset.cs,
    k2 = e.target.dataset.gb,
    k3 = e.target.dataset.gr;
  if (k) checkInForm[k] = e.target.value;
  if (k2) groupForm[k2] = e.target.value;
  if (k3) {
    const [rid, i, f] = k3.split("|"),
      r = RESERVATIONS.find(x => x.id === rid);
    if (r) {
      const G = guestsOf(r)[+i];
      G[f] = e.target.value;
      if (+i === 0) {
        if (f === "name" && G.name.trim()) r.guest = G.name.trim();
        if (f === "phone") r.phone = G.phone;
        if (f === "idn") r.idno = G.idn;
      }
    }
  }
};
$("#docv").onclick = () => $("#docv").classList.remove("show");
$("#fd").onchange = e => {
  const t = e.target;
  if (t.dataset.up) {
    const fl = t.files[0];
    if (!fl) return;
    docRead(fl, (d, nm) => {
      if (!d) {
        fdNotify("That file could not be read as an image. Use a JPG or PNG photo or scan.");
        return fdDraw();
      }
      const h = docTarget(t.dataset.up);
      if (!h) return;
      h.doc = d;
      h.docn = nm;
      sync();
      fdNotify("ID copy attached.", 1);
      fdDraw();
    });
    return;
  }
  if (t.dataset.mp) {
    FD_SETTINGS.meals[t.dataset.mp] = parseFloat(t.value) || 0;
    sync();
    return;
  }
  if (t.dataset.mc) {
    FD_SETTINGS.child = Math.min(100, Math.max(0, parseFloat(t.value) || 0));
    sync();
    return;
  }
  const ck = t.dataset.cs,
    gk = t.dataset.gb;
  if (t.dataset.gbg) return;
  if (t.dataset.gr) {
    const [rid, i] = t.dataset.gr.split("|"),
      r = RESERVATIONS.find(x => x.id === rid);
    sync();
    if (r) t.closest("tr").classList.toggle("gr-miss", !guestIsRegistered(guestsOf(r)[+i]));
    return;
  }
  if (gk) {
    groupForm[gk] = t.value;
    if (gk === "payer") groupForm.m = t.value === "company" ? "account" : "cash";
    if (gk === "in" && groupForm.out <= groupForm.in) groupForm.out = addDays(groupForm.in, 1);
    if (t.dataset.rd) fdDraw();
    return;
  }
  if (ck) {
    checkInForm[ck] = t.value;
    if (ck === "type") {
      checkInForm.room = "auto";
      checkInForm.rate = "";
    }
    if (t.dataset.rd) fdDraw();
    return;
  }
  if (t.dataset.hn !== undefined) {
    FD_SETTINGS.name = t.value.trim() || FD_SETTINGS.name;
    t.value = FD_SETTINGS.name;
    fdBrand();
    sync();
    return;
  }
  if (t.dataset.pk) {
    fdSelectedRes = t.value;
    return fdDraw();
  }
  if (t.dataset.rg !== undefined) {
    fdDateRange[+t.dataset.rg] = t.value;
    return fdDraw();
  }
  if (t.dataset.rate) {
    const rm = roomByNo(t.dataset.rate),
      v = parseFloat(t.value);
    if (v > 0) rm.rate = v;
    else t.value = rm.rate;
    sync();
  }
};
$("#fdBack").onclick = () => fdExit(true);

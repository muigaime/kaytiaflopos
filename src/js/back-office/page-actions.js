// ---- Back Office page actions: clicks and edits inside the sub pages (#vSub) ----
$("#vSub").onclick = e => {
  const p = e.target.dataset.p;
  if (p) {
    per = p;
    document
      .querySelectorAll("#per button")
      .forEach(b => b.classList.toggle("on", b.dataset.p === p));
    return all();
  }
  const roomTab = e.target.closest("[data-rr]");
  if (roomTab) return rrAct(roomTab);
  const rr = e.target.closest("[data-r]");
  if (rr) {
    rp = rr.dataset.r;
    return all();
  }
  const qq = e.target.closest("[data-q]");
  if (qq) {
    rt = ymd(d0());
    rf = ymd(d0() - qq.dataset.q * D);
    return all();
  }
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a,
    v = id => $("#" + id).value.trim(),
    num = id => parseFloat($("#" + id).value);
  if (a === "addm" || a === "pwm" || a === "delm") {
    admAct(a, b);
    return;
  }
  if (a === "dstart" || a === "dend") {
    const r = a === "dstart" ? dayStart(boUser.n) : dayEnd(boUser.n);
    toast(r || (a === "dstart" ? "Day started." : "Day ended."));
    return all();
  }
  if (a === "pshift") {
    printHTML(
      shiftReport(
        SHIFTS.filter(x => x.closedAt)
          .slice()
          .reverse()[+b.dataset.i],
        0,
        boUser.n
      )
    );
    return;
  }
  if (a === "pday") {
    printHTML(
      dayReport(
        DAYS.filter(x => x.closedAt)
          .slice()
          .reverse()[+b.dataset.i],
        boUser.n
      )
    );
    return;
  }
  if (a === "pop") {
    printHTML(shiftReport(openShifts()[+b.dataset.i], 0, boUser.n));
    return;
  }
  if (a === "pcur") {
    printHTML(dayReport(curDay(), boUser.n));
    return;
  }
  if (a === "sstart") {
    const u = v("shU"),
      r = shiftStart(u, parseFloat($("#shF").value), boUser.n);
    toast(r || "Shift started for " + u + ".");
    return all();
  }
  if (a === "send") {
    const r = shiftEnd(
      openShifts()[+b.dataset.i],
      parseFloat($("#sc_" + b.dataset.i).value),
      boUser.n
    );
    toast(r || "Shift ended.");
    return all();
  }
  if (a.slice(0, 4) === "inv_") {
    invAct(a.slice(4), b);
    return;
  }
  if (a.slice(0, 4) === "pur_") {
    purAct(a.slice(4), b);
    return;
  }
  if (a.slice(0, 4) === "rec_") {
    recAct(a.slice(4), b);
    return;
  }
  if (a.slice(0, 3) === "hs_") {
    settingsAct(a.slice(3));
    return;
  }
  if (a.slice(0, 3) === "ap_") {
    apAct(a.slice(3), b);
    return;
  }
  if (a.slice(0, 3) === "st_") {
    stAct(a.slice(3), b);
    return;
  }
  if (a.slice(0, 3) === "vs_") {
    vsAct(a.slice(3), b);
    return;
  }
  if (a.slice(0, 3) === "sp_") {
    spAct(a.slice(3), b);
    return;
  }
  if (a === "clr")
    return tapConfirm(
      b,
      () => {
        SALES.length = 0;
        bosave();
        all();
      },
      "TAP AGAIN"
    );
  else if (a === "addp") {
    const n = v("pn"),
      p = num("pp"),
      q = num("pq");
    if (!n || !(p > 0) || !(q > 0)) return toast("Enter a name, price and stock used.");
    ITEMS.push({
      id: Math.max(...ITEMS.map(i => i.id)) + 1,
      n,
      d: v("pd"),
      c: v("pc") || "General",
      p,
      t: v("pt"),
      r: { [v("pi")]: q }
    });
    toast(n + " added.");
  } else if (a === "addg") {
    const n = v("gn"),
      q = num("gq"),
      k = n.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (!n || !(q >= 0) || ING[k] !== undefined)
      return toast("Enter a new name and opening stock.");
    ING[k] = n;
    LOCS.forEach(l => (STK[l][k] = 0));
    if (q > 0) mv(STORES[0], k, q, "RECEIVE", "Opening stock", "", "", boUser.n);
    RO[k] = Math.max(1, Math.round(q * 0.2));
  } else if (a === "recv") {
    const q = num("rq_" + b.dataset.k);
    if (!(q > 0)) return toast("Enter a quantity.");
    stock[b.dataset.k] += q;
    toast("Stock received.");
  } else if (a === "addu") {
    const n = v("su"),
      p = v("up");
    if (!/^\S+\s+\S+/.test(n) || !/^\d{4,6}$/.test(p) || USERS.some(u => u.pin === p))
      return toast("Use 'First Last' and a unique 4 to 6 digit PIN.");
    USERS.push({ n, pin: p, d: v("sr") === "Manager" ? ALLD.slice() : [ALLD[0]], role: v("sr") });
  } else if (a === "addc") {
    const n = v("cn"),
      l = num("cc");
    if (!n || !(l >= 0)) return toast("Enter a name and limit.");
    CU.push({ n, limit: l, owes: 0 });
  } else if (a === "pay") {
    const c = CU[b.dataset.i],
      q = num("cp_" + b.dataset.i);
    if (!(q > 0)) return toast("Enter an amount.");
    c.owes = Math.max(0, c.owes - q);
    toast("Payment recorded.");
  }
  bosave();
  all();
};
$("#vSub").onchange = e => {
  const t = e.target,
    s = t.dataset;
  if (s.dm !== undefined) return masterDamage(t); // Damages column of the Stock Master
  if (s.m !== undefined) {
    if (s.m === "zero") STKT.zero = t.checked;
    else if (s.m === "issued") STKT.issued = t.checked;
    else if (s.m === "loc") {
      STKT.loc = t.value;
      STKT.phys = {};
      STKT.narr = {};
    } else if (s.m === "kind") {
      STKT.kind = t.value;
      STKT.phys = {};
      STKT.narr = {};
    }
    return all();
  }
  if (s.ir !== undefined) {
    invR[+s.ir] = t.value;
    return all();
  }
  // Receive goods (GRN): line selection, select all, invoice amount check
  if (s.rcsel !== undefined) {
    invF.rc.lines[+s.rcsel].sel = t.checked;
    return all();
  }
  if (s.unitfor !== undefined) {
    // Item chosen in a line editor: its units (Crate / pcs) and what the place holds.
    const f = s.unitfor,
      u = $("#l_u_" + f),
      h = $("#l_h_" + f);
    invF[f].pick = t.value;
    if (u) u.innerHTML = rcUnitOpts(t.value, "buy");
    if (h) h.textContent = unitHint(t.value, STKT.loc);
    return;
  }
  if (s.prunit !== undefined) {
    // Recipes & Production: units for the chosen item.
    $("#" + s.prunit).innerHTML = prUnitOpts(t.value);
    return;
  }
  if (s.spunit !== undefined) {
    // Selling point request or transfer: units for the chosen item.
    $("#" + (s.spunit || "spr_u")).innerHTML = rcUnitOpts(t.value, "buy");
    return;
  }
  if (s.rcq !== undefined) return rcQtyChange(t, +s.rcq);
  if (s.rcall !== undefined) {
    invF.rc.lines.forEach(l => (l.sel = t.checked));
    return all();
  }
  if (s.iv === "rc.invAmt") return all();
  if (s.rp !== undefined) {
    // inventory report filters
    invRep[s.rp] =
      s.rp === "store" && (t.value === "All stores" || t.value === "All places") ? "All" : t.value;
    return all();
  }
  if (s.iv !== undefined || s.ph !== undefined || s.pn !== undefined) return;
  if (s.sp !== undefined || s.sps !== undefined) return spChange(t, s);
  if (s.pr) {
    const it = get(s.pr),
      p = parseFloat(t.value);
    if (p > 0) it.p = p;
    else t.value = it.p;
  } else if (s.up !== undefined) {
    const u = USERS[s.up];
    if (/^\d{4,6}$/.test(t.value) && !USERS.some(x => x !== u && x.pin === t.value))
      u.pin = t.value;
    else {
      t.value = u.pin;
      toast("PIN must be 4 to 6 digits and unique.");
    }
  } else if (s.ud !== undefined) {
    const u = USERS[s.ud],
      d = ALLD.filter(x => (x === t.value ? t.checked : u.d.includes(x)));
    if (!d.length) {
      t.checked = true;
      return toast("Keep at least one sale point.");
    }
    u.d = d;
  } else if (s.ur !== undefined) {
    const u = USERS[s.ur];
    u.role = t.value;
    if (t.value === "Manager" && u.d.length < ALLD.length) u.d = ALLD.slice();
  } else if (s.uk !== undefined) {
    const v = cardId(t.value),
      u = USERS[s.uk];
    if (v && USERS.some(x => x !== u && x.card === v)) {
      t.value = u.card || "";
      toast("That card is already assigned.");
    } else {
      u.card = v;
      t.value = v;
    }
  } else if (s.uc) {
    const c = parseFloat(t.value);
    INGC[s.uc] = c >= 0 ? c : 0;
  } else if (s.f) {
    const v = t.value;
    if (!v) return;
    if (s.f === "rf") rf = v;
    else if (s.f === "rt") rt = v;
    else if (s.f === "rd") rd = v;
    else rcm = parseFloat(v) || 0;
    return all();
  } else return;
  bosave();
};

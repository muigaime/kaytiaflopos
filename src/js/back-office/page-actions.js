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
  const billTr = e.target.closest("[data-bill]");
  if (billTr) {
    document.querySelectorAll("#vSub tr.on[data-bill]").forEach(x => x.classList.remove("on"));
    return billTr.classList.add("on");
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
  if (a === "rep_print") return repPrint(b.dataset.k);
  if (a === "rep_xlsx") return repXlsx(b.dataset.k);
  if (a === "rep_xlsxpage") return pageXlsx(b);
  if (a.slice(0, 3) === "ws_") return wsAct(a, b);
  if (a.slice(0, 3) === "tb_") return tbAct(a, b);
  if (a.slice(0, 4) === "psu_") return psuAct(a, b);
  if (a.slice(0, 4) === "lic_") return licAct(a);
  if (ACT_RIGHTS[a] && !boCan(ACT_RIGHTS[a])) return boDenied();
  if (a.slice(0, 3) === "ur_") return urAct(a, b);
  if (a === "dstart" || a === "dend") {
    const r = a === "dstart" ? dayStart(boUser.n) : dayEnd(boUser.n);
    toast(r || (a === "dstart" ? `New day started: ${dateGB(bizDate())}.` : "Day ended."));
    return all();
  }
  if (a === "sfloat") {
    const sh = openShifts()[+b.dataset.i],
      fl = parseFloat($("#sf_" + b.dataset.i).value);
    if (!sh) return;
    if (!(fl >= 0)) return toast("Enter the float (0 or more).");
    Object.assign(sh, { float: fl, floatBy: boUser.n });
    bosave();
    toast(`${sh.user}'s float is now ${KES(fl)}.`);
    return all();
  }
  if (a === "sauth" || a === "sdecl") {
    const r = shiftAuthAnswer(b.dataset.id, a === "sauth", boUser.n);
    toast(r || (a === "sauth" ? "Authorised. The waiter can start the shift." : "Declined."));
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
    const u = v("shU");
    if (!u) return toast("Choose who the shift is for.");
    const r = shiftStart(u, parseFloat($("#shF").value), boUser.n);
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
    settingsAct(a.slice(3), b);
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
  if (a === "ret") return retOpen(b.dataset.no);
  if (a === "sales_print") return billReprint(b.dataset.no);
  if (a === "sales_clear") {
    Object.assign(salesF, { q: "", from: "", to: "" });
    return all();
  }
  if (a === "addp") {
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
window.boRedraw = () => all();
$("#vSub").ondblclick = e => {
  const b = e.target.closest("[data-bill]");
  if (b) billReprint(b.dataset.bill);
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
  if (s.rsz) return void (rpSize = s.rsz);
  if (s.tbn !== undefined) return tbRename(t);
  if (s.psx) return psuChange(t);
  if (s.setc) return settingsChange(t);
  if (s.rpsel !== undefined) {
    rp = t.value;
    return all();
  }
  if (s.urg !== undefined) {
    urRole = t.value;
    return all();
  }
  if (s.ura !== undefined) return urRoleChange(+s.ura, t.value);
  if (s.wsr !== undefined) {
    wsF.role = t.value;
    return all();
  }
  if (s.wsp) return void (wsF.perm[s.wsp] = t.checked);
  if (s.wsc) {
    wsF[s.wsc] = t.checked;
    return all();
  }
  if (s.wsd) {
    wsF.pts = t.checked ? [...wsF.pts, s.wsd] : wsF.pts.filter(x => x !== s.wsd);
    return all();
  }
  if (s.sf) {
    salesF[s.sf] = t.value;
    return all();
  }
  if (s.bf) {
    billF[s.bf] = s.bf === "net" ? t.checked : t.value;
    return all();
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
  } else if (s.uc) {
    const c = parseFloat(t.value);
    INGC[s.uc] = c >= 0 ? c : 0;
  } else if (s.f) {
    const v = t.value;
    if (!v) return;
    if (s.f === "rf") rf = v;
    else if (s.f === "rt") rt = v;
    else if (s.f === "rd") rd = v;
    else if (s.f === "tf") rtf = v;
    else if (s.f === "tt") rtt = v;
    else if (s.f === "tw") rtw = v;
    else rcm = parseFloat(v) || 0;
    return all();
  } else return;
  bosave();
};

// ---- Waiter clearance: the form a waiter takes home-time to the cashier and supervisor to sign ----
let wcWho = "";
const wcShifts = n => {
  const d = curDay();
  return d ? SHIFTS.filter(s => s.day === d.id && s.user === n) : [];
};
/** Waiters on today's business date: anyone with a shift, or with bills still open. */
const wcWaiters = () =>
  USERS.filter(
    u => u.role === "Waiter" && (wcShifts(u.n).length || orders.some(o => o.waiter === u.n))
  );
function wcFacts(n) {
  const S = wcShifts(n),
    P = pendingOf(n),
    sent = orders.filter(o => o.waiter === n && o.handedTo),
    amt = L => L.reduce((a, o) => a + totals(o.lines, o).g, 0),
    sold = msOn(msSales(n), bizDate());
  return {
    S,
    P,
    sent,
    open: S.find(s => !s.closedAt),
    cleared: S.find(s => s.cleared),
    first: S[0],
    pend: amt(P),
    sentAmt: amt(sent),
    sales: msSum(sold),
    bills: msBills(sold),
    amt
  };
}
function wcListHTML() {
  const L = wcWaiters();
  return `<div class="shc"><h4>Waiter clearance</h4><div class="stk">When a waiter finishes, open their form. They go home once it's signed by the cashier and a supervisor.</div>${
    L.length
      ? `<div style="overflow:auto"><table class="sht"><tr><th>Waiter</th><th>Shift from</th><th class="n">Pending bills</th><th class="n">Pending (KES)</th><th>Status</th><th></th></tr>${L.map(
          u => {
            const F = wcFacts(u.n);
            return `<tr><td>${hx(u.n)}</td><td>${F.first ? hm(F.first.openedAt) : "-"}</td><td class="n">${F.P.length}</td><td class="n">${R2(F.pend)}</td><td>${F.cleared ? "Cleared" : F.P.length ? "Has pending bills" : "Ready to clear"}</td><td class="n"><button class="mini" data-sa="wc_open" data-n="${hx(u.n)}">Open form</button></td></tr>`;
          }
        ).join("")}</table></div>`
      : '<div class="stk">No waiters on shift today.</div>'
  }<button class="mini" data-sa="back">← Back</button></div>`;
}
/** The form itself: on screen and on paper. */
function wcFormDoc(n, by) {
  const F = wcFacts(n),
    ok = !F.P.length,
    row = (l, v) => `<div><span>${l}</span><b>${hx(v)}</b></div>`,
    table = (L, none, who) =>
      L.length
        ? `<table><thead><tr><th>Bill</th><th>Table</th>${who ? "<th>With</th>" : ""}<th class="n">Total (KES)</th></tr></thead><tbody>${L.map(o => `<tr><td>${hx(o.no)}</td><td>${hx(o.label)}</td>${who ? `<td>${hx(o.handedTo)}</td>` : ""}<td class="n">${R2(totals(o.lines, o).g)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="wc-none">${none}</p>`,
    sign = (l, name) =>
      `<div class="wc-sign"><span class="wc-line"></span><b>${l}</b><small>${name ? hx(name) : "Name: ____________________"}</small><small>Date and time: ______________</small></div>`,
    now = new Date();
  return `<div class="wc"><header><div><h2>${hx(FD_SETTINGS.name)}</h2><p>Waiter clearance form</p></div><div class="wc-d">${dateGB(bizDate())}<small>Printed ${hm(now)}</small></div></header>
  <div class="wc-m">${row("Waiter", n)}${row("Shift from", F.first ? hm(F.first.openedAt) : "-")}${row("Bills served today", F.bills)}${row("Sales today", "KES " + R2(F.sales))}</div>
  <div class="wc-st ${ok ? "ok" : "no"}"><b>${ok ? "Cleared to go home" : "Not cleared"}</b><span>${ok ? "No pending bills." : `${F.P.length} pending bill${F.P.length === 1 ? "" : "s"} · KES ${R2(F.pend)}. Clear them or send them to a cashier first.`}</span></div>
  <h4>Pending bills</h4>${table(F.P, "None.")}
  <h4>Bills handed to a cashier</h4>${table(F.sent, "None.", true)}
  <p class="wc-dec">I confirm these figures are correct and I have handed over all my bills.</p>
  <div class="wc-signs">${sign("Waiter", n)}${sign("Cashier", by)}${sign("Supervisor")}</div></div>`;
}
function wcFormHTML() {
  const F = wcFacts(wcWho),
    can2 = !F.P.length && !!F.open;
  return `<div class="shc">${wcFormDoc(wcWho, user.n)}<div class="row"><button class="mini" data-sa="wc_list">← Back</button><button class="mini" data-sa="wc_print">Print form</button>${can2 ? '<button class="chip on" data-sa="wc_end">Clear and end shift</button>' : ""}</div></div>`;
}
function wcAct(a, b) {
  if (a === "wc_list") {
    shView = "wclear";
    return shDraw();
  }
  if (a === "wc_open") {
    wcWho = b.dataset.n;
    shView = "wcform";
    return shDraw();
  }
  if (a === "wc_print") return printHTML(wcFormDoc(wcWho, user.n), false, "A4");
  if (a === "wc_end") {
    const F = wcFacts(wcWho);
    if (F.P.length) return shDraw(`${wcWho} still has pending bills.`);
    if (!F.open) return shDraw();
    const r = shiftEnd(F.open, Math.max(0, shiftCalc(F.open).expected), user.n);
    if (r) return shDraw(r);
    F.open.cleared = { at: new Date().toISOString(), by: user.n };
    auditAdd("Clearance", `${wcWho} cleared to go home by ${user.n}`, { mod: "POS" });
    sync();
    shDraw(`${wcWho} is cleared and their shift has ended.`);
    printHTML(wcFormDoc(wcWho, user.n), false, "A4");
  }
}

// ---- Waiter setup: every POS user (waiter, cashier, super cashier, manager), and what each may do ----
const POS_ROLES = ["Waiter", "Cashier", "Super Cashier", "Manager"];
const wsBlank = () => ({
  i: -1,
  role: "Waiter",
  n: "",
  pin: "",
  comm: "",
  copies: "1",
  maxPend: "0",
  card: "",
  maxDisc: "",
  allSP: false,
  restrict: false,
  pts: [],
  footer: "",
  perm: Object.fromEntries(WAITER_DEFAULTS.map(k => [k, true]))
});
let wsF = wsBlank();
const waiters = () =>
  USERS.slice().sort(
    (a, b) => POS_ROLES.indexOf(a.role) - POS_ROLES.indexOf(b.role) || a.n.localeCompare(b.n)
  );
/** Approvals and leaving full screen on the POS need a Manager's PIN. */
const lastManager = u => u.role === "Manager" && USERS.filter(x => x.role === "Manager").length < 2;
const wsPoints = () => ALLD.filter(posSells);
function wsEdit(u) {
  const all = wsPoints().every(d => u.d.includes(d));
  wsF = {
    i: USERS.indexOf(u),
    role: u.role,
    n: u.n,
    pin: u.pin,
    comm: u.comm === undefined ? "" : String(u.comm),
    copies: String(u.copies || 1),
    maxPend: String(u.maxPend || 0),
    card: u.card || "",
    maxDisc: u.maxDisc === undefined ? "" : String(u.maxDisc),
    allSP: !!u.allSP,
    restrict: !all,
    pts: u.d.filter(posSells),
    footer: u.footer || "",
    // Someone set up before this page can do all of it today, so that's what shows.
    perm: u.perm
      ? { ...u.perm }
      : Object.fromEntries(
          WAITER_RIGHTS.flatMap(([, L]) => L).map(([k]) => [
            k,
            !["allBills", "disc", "void", "merge", "split", "addAll"].includes(k)
          ])
        )
  };
}
const wsTile = (k, label, hint, off) =>
  `<label class="ws-p ${off ? "later" : ""}"><input type="checkbox" data-wsp="${k}" ${wsF.perm[k] ? "checked" : ""}><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ""}</span></label>`;
V.wait = () => {
  const F = wsF,
    f = (l, k, attrs = "") =>
      `<label>${l}<input data-ws="${k}" value="${esc(F[k])}" ${attrs}></label>`,
    always = BILL_AUTH.includes(F.role),
    who = F.role.toLowerCase(),
    id = F.i < 0 ? "New" : USERS[F.i].wid || "Not numbered yet",
    L = waiters();
  return `<div class="ws"><div class="pn ws-list"><div class="ws-lh"><h4>POS staff (${L.length})</h4><button class="mini" data-a="ws_new">New</button></div>${
    L.map(u => {
      const open = orders.filter(o => o.waiter === u.n).length,
        on = USERS.indexOf(u) === F.i;
      return `<button class="ws-w ${on ? "on" : ""}" data-a="ws_edit" data-i="${USERS.indexOf(u)}"><span class="ws-a">${esc(u.n[0])}</span><span><b>${esc(u.n)}</b><small>${esc(u.role)} · ${plural(open, "open bill")}</small></span></button>`;
    }).join("") || '<div class="empty">No POS staff yet.</div>'
  }</div>
 <div class="pn ws-form"><div class="ws-lh"><h4>${F.i < 0 ? "Create POS staff" : "Edit " + esc(F.n)}</h4><span class="ws-id">${esc(id)}</span></div>
 <div class="ws-g"><label>Role<select data-wsr>${POS_ROLES.map(r => `<option ${r === F.role ? "selected" : ""}>${r}</option>`).join("")}</select></label>${f("User name", "n", 'placeholder="First Last" autocomplete="off"')}${f("Pass code", "pin", 'inputmode="numeric" placeholder="4 to 6 digits" autocomplete="off"')}${f("Card no", "card", 'placeholder="Optional" autocomplete="off"')}${f("Sales commission (%)", "comm", 'inputmode="decimal" placeholder="Report rate"')}${f("Bill copies", "copies", 'inputmode="numeric"')}${always ? "" : f("Maximum pending bills", "maxPend", 'inputmode="numeric" title="0 means no limit"') + f("Maximum discount (%)", "maxDisc", 'inputmode="decimal" placeholder="No limit"')}</div>
 ${always ? "" : `<div class="ws-o"><label class="ws-c"><input type="checkbox" data-wsc="allSP" ${F.allSP ? "checked" : ""}> View bills from all sale points</label><label class="ws-c"><input type="checkbox" data-wsc="restrict" ${F.restrict ? "checked" : ""}> Restrict sale point access</label></div>`}
 ${
   !always && F.restrict
     ? `<div class="ws-pts"><span>Sale points</span>${wsPoints()
         .map(
           d =>
             `<label class="ws-c ws-chip ${F.pts.includes(d) ? "on" : ""}"><input type="checkbox" data-wsd="${esc(d)}" ${F.pts.includes(d) ? "checked" : ""}> ${esc(d)}</label>`
         )
         .join("")}</div>`
     : ""
 }
 ${
   always
     ? `<div class="ws-always">${F.role}s can always do everything on the POS, so there are no rights to set.</div>`
     : `<div class="ws-lh ws-rh"><h4>What this ${who} may do</h4><span><button class="mini" data-a="ws_all">Tick all</button> <button class="mini" data-a="ws_none">Clear all</button></span></div>
 ${WAITER_RIGHTS.map(([g, R]) => `<div class="ws-h">${g}</div><div class="ws-grid">${R.map(([k, l, h]) => wsTile(k, l, h)).join("")}</div>`).join("")}
 <div class="ws-h">Not active yet <small>Saved with the person, but the POS doesn't use these until those features are built</small></div><div class="ws-grid">${WAITER_RIGHTS_LATER.map(([k, l]) => wsTile(k, l, "", 1)).join("")}</div>`
 }
 <label class="ws-foot">Bill footer<textarea data-ws="footer" rows="2" placeholder="Printed on this person's guest bills">${esc(F.footer)}</textarea></label>
 <div class="ws-go">${F.i < 0 ? "" : '<button class="mini" data-a="ws_del">Delete</button>'}<span class="fill"></span><button class="mini" data-a="ws_new">Cancel</button><button class="chip on" data-a="ws_save">${F.i < 0 ? "Create " + who : "Save changes"}</button></div></div></div>`;
};
function wsSave() {
  const F = wsF,
    n = F.n.trim(),
    me = USERS[F.i],
    num = v => parseFloat(v),
    others = USERS.filter(u => u !== me),
    card = cardId(F.card),
    comm = F.comm.trim(),
    disc = F.maxDisc.trim(),
    copies = parseInt(F.copies, 10),
    maxPend = parseInt(F.maxPend, 10);
  if (!n) return toast("Enter the person's name.");
  if (me && F.role !== me.role && lastManager(me))
    return toast("Keep at least one Manager. Their PIN is needed for approvals.");
  if (others.some(u => u.n.toLowerCase() === n.toLowerCase()))
    return toast("Another staff member already has that name.");
  if (!/^\d{4,6}$/.test(F.pin)) return toast("The pass code should be 4 to 6 digits.");
  if (others.some(u => u.pin === F.pin)) return toast("Another staff member uses that pass code.");
  if (card && others.some(u => u.card === card)) return toast("That card is already assigned.");
  if (comm && !(num(comm) >= 0 && num(comm) <= 100))
    return toast("Commission should be 0 to 100%.");
  if (disc && !(num(disc) >= 0 && num(disc) <= 100))
    return toast("Maximum discount should be 0 to 100%.");
  if (!(copies >= 1 && copies <= 5)) return toast("Bill copies should be 1 to 5.");
  if (!(maxPend >= 0)) return toast("Maximum pending bills should be 0 or more.");
  if (F.restrict && !F.pts.length) return toast("Tick at least one sale point.");
  const was = me && me.n,
    u = me || {};
  Object.assign(u, {
    n,
    pin: F.pin,
    role: F.role,
    d: F.role === "Manager" ? ALLD.slice() : F.restrict ? F.pts.slice() : wsPoints(),
    allSP: F.allSP,
    copies,
    maxPend,
    footer: F.footer.trim(),
    perm: { ...F.perm }
  });
  if (card) u.card = card;
  if (comm) u.comm = num(comm);
  else delete u.comm;
  if (disc) u.maxDisc = num(disc);
  else delete u.maxDisc;
  if (!u.wid)
    u.wid =
      "W" + pad(USERS.reduce((a, x) => Math.max(a, +String(x.wid || "").slice(1) || 0), 0) + 1, 4);
  if (!me) {
    if (!u.card) u.card = "KT" + String(USERS.length + 1).padStart(4, "0");
    USERS.push(u);
  }
  // A new name follows the waiter's open bills and shift.
  if (was && was !== n) {
    orders.forEach(o => {
      if (o.waiter === was) o.waiter = n;
    });
    openShifts().forEach(s => {
      if (s.user === was) s.user = n;
    });
  }
  bosave();
  toast(me ? `${n} updated.` : `${n} created.`);
  wsF = wsBlank();
  all();
}
function wsAct(a, b) {
  if (a === "ws_new") wsF = wsBlank();
  else if (a === "ws_edit") wsEdit(USERS[+b.dataset.i]);
  else if (a === "ws_all")
    WAITER_RIGHTS.flatMap(([, L]) => L).forEach(([k]) => (wsF.perm[k] = true));
  else if (a === "ws_none") wsF.perm = {};
  else if (a === "ws_save") return wsSave();
  else if (a === "ws_del") {
    const u = USERS[wsF.i];
    if (lastManager(u))
      return toast("Keep at least one Manager. Their PIN is needed for approvals.");
    if (orders.some(o => o.waiter === u.n))
      return toast(`${u.n} still has open bills. Clear them first.`);
    if (shiftOf(u.n)) return toast(`${u.n} has an open shift. Close it first.`);
    return tapConfirm(
      b,
      () => {
        USERS.splice(wsF.i, 1);
        wsF = wsBlank();
        bosave();
        toast(`${u.n} deleted. Their past sales stay on record.`);
        all();
      },
      "TAP AGAIN"
    );
  }
  all();
}

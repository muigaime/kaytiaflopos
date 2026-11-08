// ---- cashier PIN login (module entry) ----
const USERS = [
  { n: "Wanjiru Kamau", pin: "1234", d: ["Bar", "Kitchen"], role: "Waiter" },
  { n: "Otieno Odhiambo", pin: "5678", d: ["Kitchen"], role: "Cashier" },
  { n: "Peter Mwangi", pin: "0000", d: [...ALLD] }
];
let user = null,
  pin = "";
const pmsg = (t, bad) => {
  $("#pinMsg").textContent = t;
  $("#pinMsg").className = bad ? "bad" : "";
};
const pdraw = () => {
  $("#pinDisp").textContent = "●".repeat(pin.length);
};
/** Where this person sells on this computer: their sale points, within the ones the machine is attached to. */
function pointsHere(u) {
  const M = MACHINE.points(),
    mine = u.d.filter(posSells);
  return M.length ? mine.filter(d => M.includes(d)) : mine;
}
function deptsFor(u) {
  const P = pointsHere(u);
  return P.length ? P : [MACHINE.points()[0] || ALLD.filter(posSells)[0] || ALLD[0]];
}
function machineLabel() {
  const M = MACHINE.points();
  $("#login .meta .sp").classList.toggle("here", M.length > 0);
  $("#login .meta .sp").textContent =
    "SALE POINT: " + (M.length ? M.join(", ") : ALLP).toUpperCase();
}
function loginAs(u) {
  if (u.role === "Housekeeper") {
    pin = "";
    pdraw();
    return pmsg("Housekeepers sign in to the Front Desk with a user account.", true);
  }
  const here = MACHINE.points();
  if (here.length && !pointsHere(u).length) {
    pin = "";
    pdraw();
    auditAdd("Failed sign-in", `${u.n} isn't set up for ${here.join(", ")}, on ${MACHINE.name()}`, {
      who: u.n,
      mod: "POS"
    });
    return pmsg(`${u.n} can't sell at ${here.join(", ")}, the sale point of this computer.`, true);
  }
  LIC.gate();
  billsExpire();
  tblFill();
  draftRelease();
  user = u;
  auditAdd("Sign in", "Signed in to the POS", { who: u.n, mod: "POS" });
  DEPTS = deptsFor(u);
  dept = DEPTS.length > 1 && can("switchSP") ? ALLP : DEPTS[0];
  applyRights();
  spTab = DEPTS[0];
  cart = {};
  pin = "";
  pdraw();
  const p = u.n.split(" ");
  $("#cname").textContent = p[1] ? p[0] + " " + p[1][0] + "." : p[0];
  $("#login").style.display = "none";
  pmsg("Enter your PIN, or swipe your staff card.");
  posAccess();
  waiterAuto();
  if (shiftOf(u.n)) shiftOf(u.n).lastOut = "";
  shiftBadge();
  setTimeout(() => {
    if (fdPending) {
      fdPending = false;
      fdShow();
      return;
    }
    if (dayLockStop()) return;
    if (!(curDay() && shiftOf(u.n)))
      shiftOpen(
        curDay()
          ? shiftDoneOf(u.n)
            ? ""
            : "Start your shift to begin selling."
          : canDay()
            ? "Start the day to begin trading."
            : ""
      );
  }, 350);
  feed();
  drawDepts();
  drawCats();
  drawCart();
}
function pkey(k) {
  if (k === "C") {
    pin = "";
    pmsg("Enter your PIN, or swipe your staff card.");
  } else if (k === "E") {
    const u = USERS.find(x => x.pin === pin);
    if (u) return loginAs(u);
    pin = "";
    auditAdd("Failed sign-in", "Wrong PIN on the POS", { who: "Unknown", mod: "POS" });
    pmsg("Invalid PIN. Try again.", true);
    $("#pinDisp").classList.remove("shk");
    void $("#pinDisp").offsetWidth;
    $("#pinDisp").classList.add("shk");
  } else if (pin.length < 6) pin += k;
  pdraw();
}
$("#kp").onclick = e => {
  const k = e.target.dataset.k;
  if (k) pkey(k);
};
function fsNote(m) {
  const n = document.createElement("div");
  n.id = "fsn";
  n.textContent = m;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3200);
}
function fsOn() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}
// ---- the POS opens maximised. Anyone can go to a normal window and back. ----
function fsEnter() {
  const el = document.documentElement,
    rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!rq) return;
  try {
    const r = rq.call(el);
    if (r && r.catch) r.catch(() => {}); // the browser said no: a normal window is fine
  } catch (e) {}
}
function fsLeave() {
  if (!fsOn()) return;
  try {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } catch (e) {}
}
function fsToggle() {
  fsOn() ? fsLeave() : fsEnter();
}
function fsLabel() {
  document
    .querySelectorAll("#fsb,#fsl")
    .forEach(b => (b.textContent = fsOn() ? "⤡ Minimise" : "⛶ Maximise"));
}
["fullscreenchange", "webkitfullscreenchange"].forEach(ev =>
  document.addEventListener(ev, fsLabel)
);
$("#fsb").onclick = fsToggle;
$("#fsl").onclick = fsToggle;
/** EXIT on the sign-in screen: back to the main page. */
function posExit() {
  fsLeave();
  fdPending = false;
  cart = {};
  user = null;
  pin = "";
  pdraw();
  drawCart();
  $("#start").style.display = "grid";
}
$(".bt").onclick = e => {
  const b = e.target.closest("[data-k]");
  if (!b) return;
  if (b.dataset.k === "C") pkey("C");
  else if (b.dataset.k === "X") posExit();
};
document.addEventListener("keydown", e => {
  if (
    $("#login").style.display === "none" ||
    $("#bo").classList.contains("show") ||
    $("#start").style.display !== "none"
  )
    return;
  if (/^\d$/.test(e.key)) pkey(e.key);
  else if (e.key === "Enter") pkey("E");
  else if (e.key === "Backspace") {
    pin = pin.slice(0, -1);
    pdraw();
  } else if (e.key === "Escape") pkey("C");
});
const cardId = t =>
  String(t)
    .replace(/^[%;]+/, "")
    .split(/[=^?]/)[0]
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
let swipe = false,
  sbuf = "",
  stm = 0;
function swipeArm(on) {
  swipe = on;
  sbuf = "";
  clearTimeout(stm);
  $("#swb").classList.toggle("on", on);
  $("#swb .swt").textContent = on ? "Waiting for card… swipe now" : "Swipe staff card";
  if (on) {
    pmsg("Ready. Swipe your staff card through the reader.");
    stm = setTimeout(() => {
      swipeArm(false);
      pmsg("Card reader timed out. Tap Swipe staff card to try again.");
    }, 20000);
  }
}
function swipeDone(code) {
  swipeArm(false);
  const u = USERS.find(x => x.card && x.card === cardId(code));
  if (u) {
    pmsg("Card accepted: " + u.n);
    setTimeout(() => loginAs(u), 400);
  } else pmsg("Card not recognised. Try again or use your PIN.", true);
}
$("#swb").onclick = () => swipeArm(!swipe);
$("#swd").onclick = () => {
  pmsg("Reading card…");
  setTimeout(() => swipeDone(";" + ((USERS[0] || {}).card || "KT0001") + "=?"), 700);
};
window.addEventListener(
  "keydown",
  e => {
    if (!swipe || $("#login").style.display === "none") return;
    e.stopPropagation();
    e.preventDefault();
    if (e.key === "Enter") {
      if (sbuf) swipeDone(sbuf);
      sbuf = "";
    } else if (e.key === "Escape") swipeArm(false);
    else if (e.key.length === 1) sbuf += e.key;
  },
  true
);
// ---- Nobody at the till: sign out after 30 seconds ----
const POS_IDLE_MS = 30000;
let posLastActive = Date.now();
["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "input", "click"].forEach(ev =>
  document.addEventListener(ev, () => (posLastActive = Date.now()), {
    capture: true,
    passive: true
  })
);
/** Work that signing out would lose: an unsent order, a payment, or a cashier counting the till. */
function posIdleBusy() {
  return (
    Object.keys(cart).length > 0 ||
    $("#mPay").classList.contains("show") ||
    ($("#shMgr").classList.contains("show") && user.role !== "Waiter")
  );
}
function posIdleCheck() {
  if (Date.now() - posLastActive < POS_IDLE_MS) return;
  if (!user || $("#login").style.display !== "none") return;
  if ($("#bo").classList.contains("show") || $("#fd").classList.contains("show")) return;
  if ($("#fl").classList.contains("show") || posIdleBusy()) return;
  auditAdd("Sign out", "Signed out of the POS after 30 seconds with no activity", {
    who: user.n,
    mod: "POS"
  });
  document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show"));
  $("#shMgr").classList.remove("show");
  logoutAfterRc = false;
  $("#lock").click();
  pmsg("Signed out after 30 seconds with no activity. Enter your PIN.");
}
setInterval(posIdleCheck, 1000);
drawDepts();
drawCats();
drawCart();

function feed() {
  const p = $(".paper");
  p.classList.remove("feed");
  void p.offsetWidth;
  p.classList.add("feed");
}
const tick = () => {
  $("#lclock").textContent = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
  $("#clk").textContent = new Date().toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};
tick();
setInterval(tick, 30000);

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
function loginAs(u) {
  LIC.gate();
  billsExpire();
  tblFill();
  draftRelease();
  user = u;
  DEPTS = u.d.filter(posSells);
  if (!DEPTS.length) DEPTS = [ALLD.filter(posSells)[0] || ALLD[0]];
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
  setTimeout(() => {
    if (fdPending) {
      fdPending = false;
      fdShow();
      return;
    }
    if (!(curDay() && shiftOf(u.n)))
      shiftOpen(
        curDay()
          ? "Start your shift to begin selling."
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
// ---- the POS stays full screen: opening it maximises, and only a manager can leave ----
// A browser can always leave full screen (a held Esc), so when that happens the POS is covered until it is
// maximised again or a manager agrees. The guard ends when someone signs in to Back Office or Front Desk.
let posGuard = false, // the rule is in force
  fsAllowed = false, // a manager has agreed to a normal window, until the next open or log out
  gateMode = "", // why the lock is up: "left" | "minimise" | "exit"
  gateFails = 0,
  gateLock = 0;
const gateUp = () => $("#fsGate").classList.contains("show");
function gateClose() {
  $("#fsGate").classList.remove("show");
  gateMode = "";
}
function gateOpen(mode) {
  gateMode = mode;
  const left = mode === "left";
  $("#fsgT").textContent = left
    ? "Full screen is required"
    : mode === "exit"
      ? "Close the POS?"
      : "Minimise the POS?";
  $("#fsgS").textContent = left
    ? "The POS must stay full screen. Return to it, or enter a Manager PIN to use a normal window."
    : "A Manager PIN is required.";
  $("#fsgBack").textContent = left ? "Return to full screen" : "Cancel";
  $("#fsgPin").value = "";
  $("#fsgMsg").textContent = "";
  $("#fsGate").classList.add("show");
  if (!left) $("#fsgPin").focus();
}
function fsEnter() {
  const el = document.documentElement,
    rq = el.requestFullscreen || el.webkitRequestFullscreen,
    refused = () => {
      if (posGuard && !fsAllowed && !fsOn()) gateOpen("left");
    };
  if (!rq) return refused();
  try {
    const r = rq.call(el);
    if (r && r.then)
      // Where the browser allows it, Esc reaches the page instead of leaving full screen.
      r.then(() => {
        if (navigator.keyboard && navigator.keyboard.lock)
          navigator.keyboard.lock(["Escape"]).catch(() => {});
      }).catch(refused);
  } catch (e) {
    refused();
  }
}
function fsLeave() {
  if (!fsOn()) return;
  try {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } catch (e) {}
}
/** Every time the POS opens, or the next person is about to sign in. */
function posKioskOn() {
  posGuard = true;
  fsAllowed = false;
  if (fsOn()) gateClose();
  else fsEnter();
}
function posKioskOff() {
  posGuard = false;
  fsAllowed = false;
  gateClose();
}
function fsToggle() {
  if (!fsOn()) {
    fsAllowed = false;
    return fsEnter();
  }
  if (posGuard) return gateOpen("minimise");
  fsLeave();
}
function gateOk() {
  if (Date.now() < gateLock) return ($("#fsgMsg").textContent = "Too many tries. Wait 30 seconds.");
  const mgr = USERS.find(u => u.role === "Manager" && u.pin === $("#fsgPin").value);
  if (!mgr) {
    $("#fsgPin").value = "";
    if (++gateFails >= 5) {
      gateLock = Date.now() + 3e4;
      gateFails = 0;
    }
    $("#fsgMsg").textContent = "That is not a manager's PIN.";
    return $("#fsgPin").focus();
  }
  gateFails = 0;
  const mode = gateMode;
  gateClose();
  if (mode === "exit") {
    posGuard = false;
    return exitApp();
  }
  fsAllowed = true;
  fsLeave();
}
$("#fsgOk").onclick = gateOk;
$("#fsgPin").onkeydown = e => {
  e.stopPropagation();
  if (e.key === "Enter") gateOk();
};
$("#fsgBack").onclick = () => {
  const left = gateMode === "left";
  gateClose();
  if (left) {
    fsAllowed = false;
    fsEnter();
  }
};
function fsLabel() {
  document
    .querySelectorAll("#fsb,#fsl")
    .forEach(b => (b.textContent = fsOn() ? "⤡ Minimise" : "⛶ Maximise"));
  if (fsOn()) {
    if (gateMode === "left") gateClose();
  } else if (posGuard && !fsAllowed && !gateUp()) gateOpen("left");
}
["fullscreenchange", "webkitfullscreenchange"].forEach(ev =>
  document.addEventListener(ev, fsLabel)
);
$("#fsb").onclick = fsToggle;
$("#fsl").onclick = fsToggle;
function exitApp() {
  if (fsOn())
    try {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch (e) {}
  cart = {};
  user = null;
  pin = "";
  pdraw();
  try {
    window.close();
  } catch (e) {}
  try {
    window.top.close();
  } catch (e) {}
  setTimeout(() => $("#bye").classList.add("show"), 250);
}
$("#again").onclick = () => {
  posKioskOn();
  $("#bye").classList.remove("show");
  $("#login").style.display = "grid";
  drawCart();
};
$(".bt").onclick = e => {
  const b = e.target.closest("[data-k]");
  if (!b) return;
  if (b.dataset.k === "C") pkey("C");
  // Closing also leaves full screen, so it needs a manager while the rule is in force.
  else if (b.dataset.k === "X") posGuard ? gateOpen("exit") : exitApp();
};
document.addEventListener("keydown", e => {
  if (
    gateUp() ||
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
    if (!swipe || gateUp() || $("#login").style.display === "none") return;
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

// ---- cashier PIN login (module entry) ----
const USERS = [
  { n: "Wanjiru Kamau", pin: "1234", d: ["Bar", "Kitchen"] },
  { n: "Otieno Odhiambo", pin: "5678", d: ["Supermarket"] },
  { n: "Peter Mwangi", pin: "0000", d: [...ALLD] }
];
let user = null,
  pin = "";
$("#ldate").textContent = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});
const pmsg = (t, bad) => {
  $("#pinMsg").textContent = t;
  $("#pinMsg").className = bad ? "bad" : "";
};
const pdraw = () => {
  $("#pinDisp").textContent = "●".repeat(pin.length);
};
function loginAs(u) {
  user = u;
  DEPTS = u.d.filter(posSells);
  if (!DEPTS.length) DEPTS = [ALLD.filter(posSells)[0] || ALLD[0]];
  dept = DEPTS[0];
  cart = {};
  pin = "";
  pdraw();
  const p = u.n.split(" ");
  $("#cname").textContent = p[0] + " " + p[1][0] + ".";
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
        curDay() ? "Start your shift to begin selling." : "Start the day to begin trading."
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
function fsToggle() {
  const d = document;
  if (fsOn()) {
    (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    return;
  }
  const el = d.documentElement,
    rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!rq) return fsNote("Fullscreen is not available here. Press F11 instead.");
  try {
    const r = rq.call(el);
    if (r && r.catch) r.catch(() => fsNote("Fullscreen was blocked here. Press F11 instead."));
  } catch (e) {
    fsNote("Fullscreen was blocked here. Press F11 instead.");
  }
}
function fsLabel() {
  document
    .querySelectorAll("#fsb,#fsl")
    .forEach(b => (b.textContent = fsOn() ? "⤡ Exit full screen" : "⛶ Maximise"));
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
  $("#bye").classList.remove("show");
  $("#login").style.display = "grid";
  drawCart();
};
$(".bt").onclick = e => {
  const b = e.target.closest("[data-k]");
  if (!b) return;
  if (b.dataset.k === "C") pkey("C");
  else if (b.dataset.k === "X") exitApp();
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

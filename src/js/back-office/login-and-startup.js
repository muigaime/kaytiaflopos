// ---- module switching and manager login ----
function boShow() {
  const ok = !!boUser;
  $("#boLogin").style.display = ok ? "none" : "grid";
  $("#app").style.display = ok ? "" : "none";
  if (ok) {
    posKioskOff(); // signed in to Back Office: the POS rule no longer applies
    setUser(boUser.n);
    applyBoRights();
    all();
  } else {
    $("#boP").value = "";
    $("#boP").type = "password";
    $("#boEye").innerHTML = EYE;
    $("#boHi").textContent = (h =>
      h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,")(
      new Date().getHours()
    );
    $("#boMsg").style.display = "none";
    let r = "";
    try {
      r = localStorage.getItem("kaytia_bo_user") || "";
    } catch (e) {}
    $("#boU").value = r;
    $("#boRm").checked = !!r;
    setTimeout(() => (r ? $("#boP") : $("#boU")).focus(), 50);
  }
}
function boOpen() {
  $("#start").style.display = "none";
  $("#bo").classList.add("show");
  boShow();
}
function posOpen() {
  posKioskOn();
  boUser = null;
  $("#bo").classList.remove("show");
  $("#start").style.display = "none";
  drawCats();
  drawCart();
}
let fails = 0,
  lock = 0;
const RMK = "kaytia_bo_user";
const boTry = async () => {
  const m = $("#boMsg"),
    g = $("#boGo"),
    u = $("#boU").value.trim().toLowerCase(),
    p = $("#boP").value,
    bad = t => {
      m.textContent = t;
      m.style.display = "block";
      const c = $(".lcard");
      c.classList.remove("shake");
      void c.offsetWidth;
      c.classList.add("shake");
    };
  if (!u || !p) return bad("Enter your username and password.");
  if (Date.now() < lock) return bad("Too many attempts. Try again in 30 seconds.");
  g.disabled = true;
  g.textContent = "Signing in…";
  const a = ADM.find(x => x.u === u),
    ok = a && a.ph === (await H(u + "|" + p));
  g.disabled = false;
  g.textContent = "Sign in";
  if (ok && a.off) return bad("This account is disabled. Ask your administrator.");
  if (ok) {
    fails = 0;
    m.style.display = "none";
    try {
      $("#boRm").checked ? localStorage.setItem(RMK, u) : localStorage.removeItem(RMK);
    } catch (e) {}
    boUser = { n: a.n, u: a.u, role: a.role || SUPER };
    AUDIT_WHO = a.n;
    auditAdd("Sign in", "Signed in to Back Office", { who: a.n, mod: "Back Office" });
    repToday();
    LIC.gate();
    boShow();
  } else {
    if (++fails >= 5) {
      lock = Date.now() + 3e4;
      fails = 0;
    }
    auditAdd("Failed sign-in", `Wrong password for username "${u}"`, {
      who: u || "Unknown",
      mod: "Back Office"
    });
    bad("Wrong username or password.");
  }
};
$("#boGo").onclick = boTry;
// Enter on the username moves to the password; Enter on the password signs in.
$("#boU").onkeydown = e => {
  if (e.key !== "Enter") return;
  if ($("#boU").value.trim()) $("#boP").focus();
  else boTry();
};
$("#boP").onkeydown = e => {
  if (e.key === "Enter") boTry();
};
const EYE =
    '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  EYEX =
    '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6C3.7 8.3 2 12 2 12s4 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 004.2 4.2"/></svg>';
$("#boEye").onclick = () => {
  const p = $("#boP"),
    h = p.type === "password";
  p.type = h ? "text" : "password";
  $("#boEye").innerHTML = h ? EYEX : EYE;
};
$("#boForgot").onclick = () =>
  toast("Forgot your password? Ask an administrator to reset it under Users & roles.");
$("#boToPos").onclick = posOpen;
$("#boP").addEventListener("keyup", e => {
  $("#boCaps").textContent =
    e.getModifierState && e.getModifierState("CapsLock") ? "Caps Lock is on" : "";
});
$("#boBack").onclick = () => {
  $("#bo").classList.remove("show");
  $("#start").style.display = "grid";
};
$("#openPos").onclick = posOpen;
$("#boMenu").onclick = () => {
  boUser = null;
  bosave();
  $("#bo").classList.remove("show");
  $("#start").style.display = "grid";
};
const stHi = () => {
  $("#stHi").textContent = (h =>
    h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,")(new Date().getHours());
};
stHi();
setInterval(stHi, 6e4);
document.addEventListener("keydown", e => {
  if ($("#start").style.display === "none" || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === "p") posOpen();
  else if (k === "b") boOpen();
  else if (k === "f") fdOpen();
});
$("#start").onclick = e => {
  const g = e.target.closest("[data-go]");
  if (g) g.dataset.go === "bo" ? boOpen() : g.dataset.go === "fd" ? fdOpen() : posOpen();
};
$("#home").onclick = boOpen;
document.querySelectorAll(".bkm").forEach(
  b =>
    (b.onclick = () => {
      fdPending = false;
      $("#start").style.display = "grid";
    })
);
setInterval(bosave, 4000);
addEventListener("pagehide", bosave);
drawCats();
drawCart();
if (location.hash === "#backoffice") boOpen();
else if (location.hash === "#pos") posOpen();

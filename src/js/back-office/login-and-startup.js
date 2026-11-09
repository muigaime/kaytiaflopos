// ---- module switching and manager login ----
function boShow() {
  mdlLock();
  const ok = !!boUser;
  $("#boLogin").style.display = ok ? "none" : "grid";
  $("#app").style.display = ok ? "" : "none";
  if (ok) {
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
  $("#fd").classList.remove("show");
  $("#fl").classList.remove("show");
  $("#start").style.display = "none";
  $("#bo").classList.add("show");
  boShow();
}
function posOpen() {
  fsEnter();
  fdExit(false); // the POS must not open on top of the Front Desk or as its user
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
  if (ok && !ALL_KEYS.some(k => !k.startsWith("fo.") && roleHas(a.role || SUPER, k)))
    return bad("This account is for the Front Desk. Sign in there.");
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
// ---- Front Desk sign-in: a user from Users & roles whose role has the right ----
let flFails = 0,
  flLock = 0;
async function fdLoginTry() {
  const m = $("#flMsg"),
    g = $("#flGo"),
    u = $("#flU").value.trim().toLowerCase(),
    p = $("#flP").value,
    bad = t => {
      m.textContent = t;
      m.style.display = "block";
      const c = $("#fl .fl-card");
      c.classList.remove("shake");
      void c.offsetWidth;
      c.classList.add("shake");
    };
  if (!u || !p) return bad("Enter your username and password.");
  if (Date.now() < flLock) return bad("Too many attempts. Try again in 30 seconds.");
  g.disabled = true;
  const a = ADM.find(x => x.u === u),
    ok = a && a.ph === (await H(u + "|" + p));
  g.disabled = false;
  if (!ok) {
    if (++flFails >= 5) {
      flLock = Date.now() + 3e4;
      flFails = 0;
    }
    auditAdd("Failed sign-in", `Wrong password for username "${u}"`, {
      who: u,
      mod: "Front Desk"
    });
    $("#flP").value = "";
    return bad("Wrong username or password.");
  }
  flFails = 0;
  $("#flP").value = "";
  const role = a.role || SUPER,
    fd = {
      desk: roleHas(role, "fo.desk"),
      hk: roleHas(role, "fo.hk"),
      hksup: roleHas(role, "fo.hksup"),
      set: roleHas(role, "fo.settings"),
      day: roleHas(role, "shift.manage")
    };
  if (a.off) return bad("This account is disabled. Ask your administrator.");
  if (!roleHas(role, "fo.open") || !(fd.desk || fd.hk || fd.set)) {
    auditAdd("Failed sign-in", `${a.n}'s role has no Front Desk right`, {
      who: a.n,
      mod: "Front Desk"
    });
    return bad("Your role doesn't include the Front Desk. Ask your administrator.");
  }
  m.style.display = "none";
  auditAdd("Sign in", "Signed in to the Front Desk", { who: a.n, mod: "Front Desk" });
  fdEnter({ n: a.n, u: a.u, role, d: [], fd });
}
$("#flGo").onclick = fdLoginTry;
$("#flU").onkeydown = e => {
  if (e.key !== "Enter") return;
  if ($("#flU").value.trim()) $("#flP").focus();
  else fdLoginTry();
};
$("#flP").onkeydown = e => {
  if (e.key === "Enter") fdLoginTry();
};
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
$("#boMenu").onclick = () => {
  auditAdd("Sign out", "Left the Back Office and was signed out", {
    who: boUser.n,
    mod: "Back Office"
  });
  boUser = null;
  bosave();
  $("#bo").classList.remove("show");
  $("#start").style.display = "grid";
};
$("#boOut").onclick = () => {
  auditAdd("Sign out", "Signed out of Back Office", { who: boUser.n, mod: "Back Office" });
  boUser = null;
  bosave();
  boShow();
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
  if (g) (({ bo: boOpen, fd: fdOpen, clock: clockOpen })[g.dataset.go] || posOpen)();
};
$("#home").onclick = boOpen;
$("#fdBack").onclick = () => fdExit(true); // leaving the Front Office signs out
document.querySelectorAll(".bkm:not(#fdBack)").forEach(
  b =>
    (b.onclick = () => {
      fdPending = false;
      $("#start").style.display = "grid";
    })
);
setInterval(bosave, 4000);
addEventListener("pagehide", bosave);
machineLabel();
fdModuleApply();
drawCats();
drawCart();
if (location.hash === "#backoffice") boOpen();
else if (location.hash === "#pos") posOpen();

function fdDraw() {
  fdBrand();
  $("#fdWho").textContent =
    (user ? user.n + " · " : "") +
    new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  $("#fdRib").innerHTML = FD_MENU.map(
    ([t, b]) =>
      `<div class="fd-g"><div class="fd-gb">${b.map(([k, l, ic]) => `<button class="fd-b ${fdView === k ? "on" : ""}" data-v="${k}"><svg viewBox="0 0 24 24">${FD_ICONS[ic]}</svg>${l}</button>`).join("")}</div><div class="lb">${t}</div></div>`
  ).join("");
  $("#fdNote").innerHTML = fdNotice
    ? `<div class="fd-note ${fdNotice.ok ? "ok" : "no"}">${hx(fdNotice.t)}</div>`
    : "";
  $("#fdBody").innerHTML = FD_VIEWS[fdView]();
}
function fdShow() {
  ensureRoomTypes();
  if (!ROOMS.length) fdSeed();
  $("#start").style.display = "none";
  $("#fd").classList.add("show");
  fdDraw();
}
let fdUser = null,
  posUser = null,
  fdLoginFails = 0,
  fdLoginLockedUntil = 0;
function fdOpen() {
  try {
    swipeArm(false);
  } catch (e) {}
  $("#start").style.display = "none";
  $("#bo").classList.remove("show");
  if (fdUser) return fdShow();
  fdLoginShow();
}
function fdLoginShow() {
  fdBrand();
  $("#fd").classList.remove("show");
  $("#flS").innerHTML = USERS.map((u, i) => `<option value="${i}">${hx(u.n)}</option>`).join("");
  $("#flP").value = "";
  $("#flP").type = "password";
  $("#flMsg").style.display = "none";
  $("#flHi").textContent = (h =>
    h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,")(new Date().getHours());
  $("#fl").classList.add("show");
  setTimeout(() => $("#flP").focus(), 60);
}
function fdEnter(u) {
  fdUser = u;
  posUser = user;
  user = u;
  $("#fl").classList.remove("show");
  fdShow();
  shiftBadge();
}
function fdExit(menu) {
  if (fdUser) {
    user = posUser;
    posUser = null;
    fdUser = null;
  }
  $("#fd").classList.remove("show");
  $("#fl").classList.remove("show");
  shiftBadge();
  if (menu) $("#start").style.display = "grid";
}
function fdLogout() {
  $("#shMgr").classList.remove("show");
  shDone = null;
  fdExit(false);
  fdLoginShow();
}
function fdLoginTry() {
  const u = USERS[+$("#flS").value],
    m = $("#flMsg"),
    bad = t => {
      m.textContent = t;
      m.style.display = "block";
      const c = $("#fl .fl-card");
      c.classList.remove("shake");
      void c.offsetWidth;
      c.classList.add("shake");
    };
  if (Date.now() < fdLoginLockedUntil) return bad("Too many attempts. Try again in 30 seconds.");
  if (u && u.pin === $("#flP").value) {
    fdLoginFails = 0;
    m.style.display = "none";
    fdEnter(u);
  } else {
    if (++fdLoginFails >= 5) {
      fdLoginLockedUntil = Date.now() + 3e4;
      fdLoginFails = 0;
    }
    bad("Wrong PIN. Please try again.");
  }
}
$("#flGo").onclick = fdLoginTry;
$("#flP").onkeydown = e => {
  if (e.key === "Enter") fdLoginTry();
};
$("#flEye").onclick = () => {
  const p = $("#flP");
  p.type = p.type === "password" ? "text" : "password";
};
$("#flBack").onclick = () => fdExit(true);
$("#fdOut").onclick = fdLogout;
$("#fl img").src = $("#login img").src;

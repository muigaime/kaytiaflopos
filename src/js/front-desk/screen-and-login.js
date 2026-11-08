function fdDraw() {
  if (!fdCan(fdPageRight(fdView))) fdView = fdCan("desk") ? "grid" : fdCan("hk") ? "hk" : "set";
  fdBrand();
  $("#fdWho").textContent =
    (user ? user.n + " · " : "") +
    new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  const menu = FD_MENU.map(([t, b]) => [t, b.filter(([k]) => fdCan(fdPageRight(k)))]).filter(
      ([, b]) => b.length
    ),
    T = FD_TITLES[fdView] || [FD_SETTINGS.name, ""];
  $("#fdRib").innerHTML = menu
    .map(
      ([t, b]) =>
        `<div class="fd-g"><div class="lb">${t}</div><div class="fd-gb">${b.map(([k, l, ic]) => `<button class="fd-b ${fdView === k ? "on" : ""}" data-v="${k}" ${fdView === k ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24">${FD_ICONS[ic]}</svg><span>${l}</span></button>`).join("")}</div></div>`
    )
    .join("");
  $("#fdTitle").textContent = T[0];
  $("#fdSub").textContent = T[1];
  $("#fdQuick").innerHTML = fdCan("desk")
    ? `<button class="mini" data-v="book">New booking</button><button class="chip on" data-v="checkin">Check in a guest</button>`
    : "";
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
  posUser = null;
/** Shows or hides everything outside the Back Office that belongs to the Front Desk. */
function fdModuleApply() {
  const on = fdOn(),
    show = (el, yes) => el && (el.style.display = yes ? "" : "none");
  show($('#start [data-go="fd"]'), on);
  show($("#stFdKey"), on);
  const room = $("#fRoom");
  if (room) {
    show(room, on);
    show(room.previousElementSibling, on);
  }
  if (!on && ($("#fd").classList.contains("show") || $("#fl").classList.contains("show")))
    fdExit(true);
}
function fdOpen() {
  if (!fdOn()) return;
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
  $("#flU").value = "";
  $("#flP").value = "";
  $("#flP").type = "password";
  $("#flMsg").style.display = "none";
  $("#flHi").textContent = (h =>
    h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,")(new Date().getHours());
  $("#fl").classList.add("show");
  setTimeout(() => $("#flU").focus(), 60);
}
function fdEnter(u) {
  fdView = "grid"; // fdDraw moves them to the first page they have
  fdUser = u;
  posUser = user;
  user = u;
  $("#fl").classList.remove("show");
  fdShow();
  shiftBadge();
}
function fdExit(menu) {
  if (fdUser) {
    auditAdd("Sign out", "Left the Front Office and was signed out", {
      who: fdUser.n,
      mod: "Front Desk"
    });
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
$("#flEye").onclick = () => {
  const p = $("#flP");
  p.type = p.type === "password" ? "text" : "password";
};
$("#flBack").onclick = () => fdExit(true);
$("#fdOut").onclick = fdLogout;

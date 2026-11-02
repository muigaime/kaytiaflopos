// ---------- chrome ----------
$("#per").onclick = e => {
  const p = e.target.dataset.p;
  if (!p) return;
  per = p;
  document
    .querySelectorAll("#per button")
    .forEach(b => b.classList.toggle("on", b.dataset.p === p));
  all();
};
$("#br").onchange = e => {
  br = e.target.value;
  all();
};
$("#bell").onclick = e => {
  e.stopPropagation();
  const p = $("#pop");
  p.innerHTML = NOTES()
    .map(
      n =>
        `<div class="row"><span class="ri ${n.c}">${I(n.ic)}</span><div class="t"><b>${n.t}</b><span>${n.s}</span></div></div>`
    )
    .join("");
  p.classList.toggle("show");
};
document.addEventListener("click", e => {
  if (!e.target.closest("#pop")) $("#pop").classList.remove("show");
});
$("#burger").onclick = () => {
  const a = $("#app");
  matchMedia("(max-width:900px)").matches ? a.classList.toggle("open") : a.classList.toggle("min");
};
$("#th").onclick = () => {
  const r = document.documentElement,
    d = r.dataset.theme
      ? r.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
  r.dataset.theme = d ? "light" : "dark";
};
// command search
const CMD = [
  ...NAV.flatMap(([g, L]) =>
    L.map(([n, ic, h]) => ({ n: n.replace("&amp;", "&"), ic, g: "Go to", h }))
  ),
  { n: "New stock request", ic: "plus", g: "Action", f: "req" },
  { n: "Open POS terminal", ic: "pos", g: "Action", h: POS }
];
let ci = 0,
  cf = [];
function cmd() {
  const q = $("#cq").value.toLowerCase();
  cf = CMD.filter(c => c.n.toLowerCase().includes(q));
  ci = Math.min(ci, Math.max(0, cf.length - 1));
  $("#cl").innerHTML =
    cf
      .map(
        (c, i) =>
          `<button class="ci ${i === ci ? "on" : ""}" data-i="${i}">${I(c.ic)}<span>${c.n}</span><small>${c.g}</small></button>`
      )
      .join("") || '<p style="color:var(--mute);padding:14px">No results.</p>';
}
function runCmd(c) {
  if (!c) return;
  $("#ov").classList.remove("show");
  if (c.f === "req") addReq();
  else go(c.n);
}
const cOpen = () => {
  $("#cq").value = "";
  ci = 0;
  cmd();
  $("#ov").classList.add("show");
  setTimeout(() => $("#cq").focus(), 30);
};
$("#srch").onclick = cOpen;
$("#cq").oninput = () => {
  ci = 0;
  cmd();
};
$("#cl").onclick = e => {
  const b = e.target.closest("[data-i]");
  if (b) runCmd(cf[+b.dataset.i]);
};
$("#ov").onclick = e => {
  if (e.target.id === "ov") $("#ov").classList.remove("show");
};
document.addEventListener("keydown", e => {
  if (!$("#bo").classList.contains("show")) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    cOpen();
    return;
  }
  if (!$("#ov").classList.contains("show")) return;
  if (e.key === "Escape") $("#ov").classList.remove("show");
  else if (e.key === "ArrowDown") {
    ci = Math.min(ci + 1, cf.length - 1);
    cmd();
  } else if (e.key === "ArrowUp") {
    ci = Math.max(ci - 1, 0);
    cmd();
  } else if (e.key === "Enter") runCmd(cf[ci]);
});
function setUser(n) {
  if (!n) return;
  $("#un").textContent = n;
  $("#av").textContent = n
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  greet(n.split(" ")[0]);
}
function greet(n) {
  const h = new Date().getHours();
  $("#hi").textContent =
    (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + ", " + n;
  $("#dt").textContent =
    bizNow().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }) +
    " · " +
    FD_SETTINGS.name;
}
function all() {
  render();
  dayBar();
  roomsCard();
  heroBar();
  licBar();
  $("#kl").textContent = br + " · " + PL[per];
  kpis();
  mods();
  trend();
  donut();
  insights();
  appr();
  act();
}

const PALS = [
    ["five", "Five Star", "#241b12", "#c7a25a"],
    ["ocean", "Ocean", "#1d5c8a", "#f2a43a"],
    ["emerald", "Emerald", "#0f8a6d", "#f5b942"],
    ["sunset", "Sunset", "#e4572e", "#ffb703"],
    ["royal", "Royal", "#6a42c2", "#f2b134"],
    ["rose", "Rose", "#d6336c", "#ffb703"],
    ["graphite", "Graphite", "#4a5a6e", "#4cc9f0"]
  ],
  TK = "kaytia_theme";
let TH = { pal: "five", mode: "auto" };
try {
  TH = Object.assign(TH, JSON.parse(localStorage.getItem(TK) || "{}"));
  // Ocean used to be the default, so it moves to Five Star once. Choosing Ocean later sticks.
  if (!TH.v && TH.pal === "ocean") TH.pal = "five";
  TH.v = 2;
} catch (e) {}
function thApply() {
  const r = document.documentElement;
  if (TH.mode === "auto") delete r.dataset.theme;
  else r.dataset.theme = TH.mode;
  $("#bo").dataset.pal = TH.pal;
}
const thSave = () => {
  try {
    localStorage.setItem(TK, JSON.stringify(TH));
  } catch (e) {}
};
function thDraw() {
  $("#tpop").innerHTML = `<h4>Theme</h4><div class="tseg">${[
    ["light", "Light"],
    ["dark", "Dark"],
    ["auto", "Auto"]
  ]
    .map(([k, l]) => `<button data-tm="${k}" class="${TH.mode === k ? "on" : ""}">${l}</button>`)
    .join(
      ""
    )}</div><div class="tgrid">${PALS.map(([k, n, a, b]) => `<button data-tp="${k}" class="${TH.pal === k ? "on" : ""}"><i style="background:linear-gradient(135deg,${a} 55%,${b} 55%)"></i><span>${n}</span></button>`).join("")}</div>`;
}
$("#pb").onclick = e => {
  e.stopPropagation();
  thDraw();
  $("#tpop").classList.toggle("show");
};
$("#tpop").onclick = e => {
  e.stopPropagation();
  const m = e.target.closest("[data-tm]"),
    p = e.target.closest("[data-tp]");
  if (m) TH.mode = m.dataset.tm;
  if (p) TH.pal = p.dataset.tp;
  if (m || p) {
    thApply();
    thSave();
    thDraw();
  }
};
document.addEventListener("click", () => $("#tpop").classList.remove("show"));
const thOld = $("#th").onclick;
$("#th").onclick = () => {
  thOld();
  TH.mode = document.documentElement.dataset.theme || "auto";
  thSave();
};
thApply();

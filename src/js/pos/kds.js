// ---- Kitchen display: every order sent from the POS, from the queue to the pass, and its status on the POS ----
// A ticket is made for each station (Kitchen, Bar) each time a waiter sends items. Tickets live in their own
// list (saved as KD), so a takeaway paid at once still reaches the kitchen. They move:
//   new (in the queue) -> prep (being made) -> ready (at the pass) -> done (served)
// and the POS shows each open bill's status from them. Changes reach other computers with the rest of the data.
const KDS = [];
// Settings → Kitchen display: when a ticket turns red, how long served ones stay, and what each screen shows.
const kdsCfg = () => (typeof FD_SETTINGS !== "undefined" && FD_SETTINGS.kds) || {};
const kdsLate = () => ({
  new: +(kdsCfg().late || {}).new || 8,
  prep: +(kdsCfg().late || {}).prep || 15
});
const kdsKeepH = () => +kdsCfg().keepH || 12;
/** This computer's screen, as set in Back Office: { station, points }, or null to choose on screen. */
const kdsScreen = () => {
  const s = (kdsCfg().screens || {})[typeof MACHINE !== "undefined" ? MACHINE.name() : ""];
  return s && (s.station !== "All" || (s.points || []).length) ? s : null;
};
const KDS_STATES = [
  ["new", "Incoming"],
  ["prep", "Preparing"],
  ["ready", "Ready"],
  ["done", "Served"]
];
const kdsMins = iso => Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
const kdsClock = m => {
  const s = Math.floor(m * 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const kdsEsc = s =>
  String(s ?? "").replace(
    /[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
const kdsSave = () => window.bosave && window.bosave();
/** Tickets for what was just sent: one per station, like the printed order tickets. */
function kdsAdd(tickets, o, note) {
  const at = new Date().toISOString();
  tickets.forEach(t =>
    KDS.push({
      id: `${o.no}-${o.rounds}-${t.station}`,
      no: o.no,
      ord: o.ord,
      label: o.label,
      waiter: t.d.waiter || o.waiter || "",
      covers: o.covers || "",
      guest: o.guest || "",
      room: o.room || "",
      dept: t.point || o.dept || "",
      station: t.station,
      round: o.rounds,
      at,
      note: note || "",
      items: t.d.lines.map(l => ({ n: l.n, q: l.q })),
      st: "new",
      t: {}
    })
  );
  kdsPrune();
}
function kdsPrune() {
  const cut = Date.now() - kdsKeepH() * 3600e3;
  for (let i = KDS.length - 1; i >= 0; i--)
    if (KDS[i].st === "done" && new Date(KDS[i].t.done || KDS[i].at).getTime() < cut)
      KDS.splice(i, 1);
  if (KDS.length > 600) KDS.splice(0, KDS.length - 600);
}

// ---------------------------------------------------------------- status on the POS
/** One word for where a bill's food and drinks are: "", new, prep, ready or done. */
function kdsBillState(no) {
  const T = KDS.filter(k => k.no === no);
  if (!T.length) return "";
  if (T.every(k => k.st === "done")) return "done";
  const open = T.filter(k => k.st !== "done");
  if (open.every(k => k.st === "ready")) return "ready";
  if (open.some(k => k.st === "prep" || k.st === "ready")) return "prep";
  return "new";
}
const KDS_WORDS = {
  new: "In the queue",
  prep: "Preparing",
  ready: "Ready to serve",
  done: "Served"
};
const kdsChip = no => {
  const s = kdsOn() ? kdsBillState(no) : "";
  return `<span class="kds-chip ${s}" data-kst="${kdsEsc(no)}">${s ? `<i></i>${KDS_WORDS[s]}` : ""}</span>`;
};
/** Keeps the status chips on the POS current, and tells a waiter when their order is ready. */
const kdsSeen = {};
function kdsPosTick() {
  if (!kdsOn()) return;
  document.querySelectorAll("[data-kst]").forEach(el => {
    const s = kdsBillState(el.dataset.kst);
    if (el.dataset.s === s) return;
    el.dataset.s = s;
    el.className = "kds-chip " + s;
    el.innerHTML = s ? `<i></i>${KDS_WORDS[s]}` : "";
  });
  if (typeof user === "undefined" || !user || typeof orders === "undefined") return;
  orders.forEach(o => {
    const s = kdsBillState(o.no),
      was = kdsSeen[o.no];
    kdsSeen[o.no] = s;
    if (
      was !== undefined &&
      was !== s &&
      s === "ready" &&
      o.waiter === user.n &&
      !$("#kds").classList.contains("show")
    ) {
      kdsChime(2);
      fsNote(`${o.label}: order ${o.ord} is ready to serve.`);
    }
  });
}
setInterval(kdsPosTick, 2000);

// ---------------------------------------------------------------- the display
const kdsV = {
  tab: "new",
  station: localStorage.getItem("kaytia_kds_station") || "All",
  point: localStorage.getItem("kaytia_kds_point") || "All",
  sound: localStorage.getItem("kaytia_kds_sound") !== "0",
  dark: localStorage.getItem("kaytia_kds_dark") === "1",
  sig: "",
  known: null
};
let kdsTimer = null,
  kdsAudio = null;
/** Browsers keep sound off until someone taps the page: the first tap on the display turns it on. */
function kdsUnlock() {
  try {
    kdsAudio = kdsAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (kdsAudio.state === "suspended") kdsAudio.resume().catch(() => {});
  } catch (e) {}
}
function kdsChime(times = 1) {
  if (!kdsV.sound) return;
  try {
    kdsAudio = kdsAudio || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++)
      [880, 1320].forEach((f, j) => {
        const o = kdsAudio.createOscillator(),
          g = kdsAudio.createGain(),
          t0 = kdsAudio.currentTime + i * 0.45 + j * 0.16;
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        o.connect(g).connect(kdsAudio.destination);
        o.start(t0);
        o.stop(t0 + 0.4);
      });
  } catch (e) {}
}
const kdsShown = () => {
  const s = kdsScreen(),
    station = s ? s.station || "All" : kdsV.station,
    pts = s ? s.points || [] : kdsV.point === "All" ? [] : [kdsV.point];
  return KDS.filter(
    k => (station === "All" || k.station === station) && (!pts.length || pts.includes(k.dept))
  );
};
/** How long a ticket has been in its step, and whether that is too long. */
function kdsAge(k) {
  const since =
      k.st === "new"
        ? k.at
        : k.st === "prep"
          ? k.t.prep || k.at
          : k.st === "ready"
            ? k.t.ready
            : k.t.done,
    m = kdsMins(since || k.at),
    late =
      (k.st === "new" && m >= kdsLate().new) ||
      (k.st === "prep" && kdsMins(k.at) >= kdsLate().prep);
  return { m, late };
}
function kdsCard(k) {
  const { m, late } = kdsAge(k),
    tone = late ? "late" : k.st,
    who = [
      k.waiter,
      k.covers ? `${k.covers} guest${k.covers === "1" ? "" : "s"}` : "",
      k.room ? `Room ${k.room}` : ""
    ]
      .filter(Boolean)
      .join(" · "),
    total = kdsMins(k.at),
    foot =
      k.st === "new"
        ? `Waiting <b data-kage="${k.id}">${kdsClock(m)}</b>`
        : k.st === "prep"
          ? `Preparing <b data-kage="${k.id}">${kdsClock(m)}</b> · ${Math.round(total)} min since sent`
          : k.st === "ready"
            ? `Ready <b data-kage="${k.id}">${kdsClock(m)}</b> ago · made in ${Math.max(1, Math.round(kdsMins(k.at) - m))} min`
            : `Served ${new Date(k.t.done).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
    btn =
      k.st === "new"
        ? `<button class="kds-go start" data-kgo="prep" data-k="${k.id}">Start</button>`
        : k.st === "prep"
          ? `<button class="kds-go" data-kgo="ready" data-k="${k.id}">Mark ready</button><button class="kds-back" data-kgo="new" data-k="${k.id}" title="Back to the queue">↺</button>`
          : k.st === "ready"
            ? `<button class="kds-go served" data-kgo="done" data-k="${k.id}">Served</button><button class="kds-back" data-kgo="prep" data-k="${k.id}" title="Back to preparing">↺</button>`
            : `<button class="kds-back wide" data-kgo="ready" data-k="${k.id}">Recall to the pass</button>`,
    left = k.items.filter(x => !x.x).reduce((a, x) => a + x.q, 0),
    all = k.items.reduce((a, x) => a + x.q, 0);
  return `<article class="kds-t ${tone}" data-tk="${k.id}">
  <header><div class="kds-h1"><b>Order ${kdsEsc(k.ord || k.no)}</b><span class="kds-st">${kdsEsc(k.station)}</span><time>${new Date(k.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time></div>
  <div class="kds-h2"><span class="kds-tbl">${kdsEsc(k.label || "No table")}</span><span>${kdsEsc(who)}</span></div></header>
  ${k.round > 1 ? `<div class="kds-round">Round ${k.round} · added to bill ${kdsEsc(k.no)}</div>` : ""}
  <ul>${k.items
    .map(
      (x, i) =>
        `<li class="${x.x ? "x" : ""}" data-kx="${k.id}" data-i="${i}"><span class="kds-q">${x.q}</span><span class="kds-n">${kdsEsc(x.n.replace(/\s*\(.*\)$/, ""))}${/\(.*\)$/.test(x.n) ? `<small>${kdsEsc(x.n.match(/\((.*)\)$/)[1])}</small>` : ""}</span></li>`
    )
    .join("")}</ul>
  ${k.note ? `<div class="kds-note">${kdsEsc(k.note)}</div>` : ""}
  <footer><div class="kds-time">${foot}${k.st === "prep" && left < all ? ` · ${all - left} of ${all} done` : ""}</div><div class="kds-btns">${btn}</div></footer></article>`;
}
function kdsHTML() {
  const L = kdsShown(),
    n = s => L.filter(k => k.st === s).length,
    list = L.filter(k => k.st === kdsV.tab).sort((a, b) =>
      kdsV.tab === "done"
        ? (b.t.done || "").localeCompare(a.t.done || "")
        : a.at.localeCompare(b.at)
    ),
    points = [...new Set(KDS.map(k => k.dept).filter(Boolean))].sort(),
    madeToday = KDS.filter(
      k => k.t.ready && new Date(k.t.ready).toDateString() === new Date().toDateString()
    ),
    avg = madeToday.length
      ? Math.round(
          madeToday.reduce((a, k) => a + (new Date(k.t.ready) - new Date(k.at)) / 60000, 0) /
            madeToday.length
        )
      : null,
    late = L.filter(k => kdsAge(k).late && (k.st === "new" || k.st === "prep")).length;
  return `<div class="kds-top">
   <div class="kds-brand"><span class="kds-mark">K</span><div><b>Kitchen display</b><small>${kdsEsc(typeof FD_SETTINGS !== "undefined" ? FD_SETTINGS.name : "")}</small></div></div>
   <nav class="kds-tabs">${KDS_STATES.map(([s, l]) => `<button class="${kdsV.tab === s ? "on" : ""} ${s}" data-ktab="${s}">${l}<i>${n(s)}</i></button>`).join("")}</nav>
   <div class="kds-tools"><span class="kds-stat">${late ? `<b class="bad">${late} late</b>` : '<b class="ok">On time</b>'}<small>${avg === null ? "No orders made yet today" : avg < 1 ? "Average under a minute to make" : `Average ${avg} min to make`}</small></span><time id="kdsNow"></time>
   <button class="kds-ic ${kdsV.sound ? "on" : ""}" data-kt="sound" title="Sound for new orders">${kdsV.sound ? "🔔" : "🔕"}</button><button class="kds-ic" data-kt="dark" title="Dark or light">${kdsV.dark ? "☀" : "☾"}</button><button class="kds-ic" data-kt="full" title="Full screen">⤢</button><button class="kds-exit" data-kt="exit">Exit</button></div>
  </div>
  ${
    kdsScreen()
      ? kdsLocHTML()
      : `<div class="kds-filters"><div class="kds-seg">${["All", "Kitchen", "Bar"].map(s => `<button class="${kdsV.station === s ? "on" : ""}" data-kst2="${s}">${s === "All" ? "All stations" : s}</button>`).join("")}</div>
   <label>Selling point<select data-kpt>${["All", ...points].map(p => `<option ${p === kdsV.point ? "selected" : ""} value="${kdsEsc(p)}">${p === "All" ? "All selling points" : kdsEsc(p)}</option>`).join("")}</select></label></div>`
  }
  <main class="kds-grid">${list.length ? list.map(kdsCard).join("") : `<div class="kds-empty"><b>${{ new: "No new orders", prep: "Nothing being prepared", ready: "Nothing waiting at the pass", done: "Nothing served yet" }[kdsV.tab]}</b><span>${kdsV.tab === "new" ? "Orders appear here as soon as a waiter sends them." : "Orders move here from the step before."}</span></div>`}</main>`;
}
/** A screen set up in Back Office says where it is, instead of offering filters. */
function kdsLocHTML() {
  const s = kdsScreen(),
    pts = s.points || [];
  return `<div class="kds-filters kds-loc"><span class="kds-pin" aria-hidden="true">●</span><div><b>${kdsEsc(typeof MACHINE !== "undefined" ? MACHINE.name() : "This screen")}</b> shows ${s.station === "All" || !s.station ? "kitchen and bar" : s.station === "Bar" ? "bar" : "kitchen"} orders from ${pts.length ? pts.map(kdsEsc).join(", ") : "every selling point"}<small>Set in Back Office → Settings → Kitchen display</small></div></div>`;
}
function kdsDraw(force) {
  const box = $("#kds");
  if (!box || !box.classList.contains("show")) return;
  // Only what is shown: never the last signature or the known tickets, or it would grow every second.
  const sig = JSON.stringify([
    [kdsV.tab, kdsV.station, kdsV.point, kdsV.dark, kdsV.sound],
    kdsScreen(),
    kdsLate(),
    kdsShown().map(k => [k.id, k.st, k.items.map(x => (x.x ? 1 : 0))])
  ]);
  // New orders since the last look: a chime, unless this is the first look.
  const ids = new Set(KDS.filter(k => k.st === "new").map(k => k.id));
  if (kdsV.known && [...ids].some(id => !kdsV.known.has(id))) kdsChime(1);
  kdsV.known = ids;
  if (force || sig !== kdsV.sig) {
    kdsV.sig = sig;
    box.className = `show ${kdsV.dark ? "dark" : ""}`;
    box.innerHTML = kdsHTML();
  }
  // Timers and the clock tick without redrawing.
  box.querySelectorAll("[data-kage]").forEach(el => {
    const k = KDS.find(x => x.id === el.dataset.kage);
    if (!k) return;
    const a = kdsAge(k);
    el.textContent = kdsClock(a.m);
    const card = el.closest(".kds-t");
    if (card && a.late && !card.classList.contains("late") && (k.st === "new" || k.st === "prep"))
      kdsDraw(true);
  });
  const now = $("#kdsNow");
  if (now)
    now.textContent = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });
}
function kdsOpen() {
  if (!kdsOn()) return;
  $("#start").style.display = "none";
  $("#kds").classList.add("show");
  kdsV.sig = "";
  kdsV.known = null;
  kdsDraw(true);
  clearInterval(kdsTimer);
  kdsTimer = setInterval(() => kdsDraw(false), 1000);
}
function kdsClose() {
  clearInterval(kdsTimer);
  $("#kds").className = "";
  $("#kds").innerHTML = "";
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  $("#start").style.display = "grid";
}
function kdsMove(id, to) {
  const k = KDS.find(x => x.id === id);
  if (!k) return;
  k.st = to;
  k.t = { ...k.t, [to]: new Date().toISOString() };
  if (to === "new") delete k.t.prep;
  kdsPrune();
  kdsSave();
  kdsDraw(true);
}
document.addEventListener("click", e => {
  const box = e.target.closest && e.target.closest("#kds");
  if (!box) return;
  const t = e.target.closest("[data-ktab],[data-kgo],[data-kt],[data-kst2],[data-kx]");
  if (!t) return;
  kdsUnlock();
  const d = t.dataset;
  if (d.ktab) {
    kdsV.tab = d.ktab;
    return kdsDraw(true);
  }
  if (d.kgo) return kdsMove(d.k, d.kgo);
  if (d.kst2) {
    kdsV.station = d.kst2;
    localStorage.setItem("kaytia_kds_station", d.kst2);
    return kdsDraw(true);
  }
  if (d.kx) {
    const k = KDS.find(x => x.id === d.kx),
      it = k && k.items[+d.i];
    if (!it || k.st === "done") return;
    it.x = !it.x;
    kdsSave();
    return kdsDraw(true);
  }
  if (d.kt === "exit") return kdsClose();
  if (d.kt === "sound") {
    kdsV.sound = !kdsV.sound;
    localStorage.setItem("kaytia_kds_sound", kdsV.sound ? "1" : "0");
    if (kdsV.sound) kdsChime(1);
  }
  if (d.kt === "dark") {
    kdsV.dark = !kdsV.dark;
    localStorage.setItem("kaytia_kds_dark", kdsV.dark ? "1" : "0");
  }
  if (d.kt === "full") {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  kdsDraw(true);
});
document.addEventListener("change", e => {
  if (!e.target.matches || !e.target.matches("#kds [data-kpt]")) return;
  kdsV.point = e.target.value;
  localStorage.setItem("kaytia_kds_point", e.target.value);
  kdsDraw(true);
});

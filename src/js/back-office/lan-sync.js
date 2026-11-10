// ---- Sharing data between computers, when running in the installed program ----
// The app keeps working from the browser's own copy. Every few seconds this swaps changes with the program on
// this computer, which saves them on the Main computer's disk and merges in what other tills have done.
// A change from elsewhere is only put on screen when nobody is in the middle of something.
const LAN_EVERY = 3000,
  LAN_REV = "kaytia_lan_rev",
  LAN_FORCE = "kaytia_lan_force";
const LAN = {
  on: false,
  role: "",
  idx: 0,
  epoch: "",
  main: "",
  home: "",
  state: "",
  at: 0,
  base: null,
  lastRaw: null,
  pending: null,
  busy: false
};
const lanStrip = raw => {
  const d = raw ? JSON.parse(raw) : null;
  if (d) delete d.LI; // each computer has its own license
  return d;
};
function lanSaveBase() {
  localStorage.setItem(LAN_REV, JSON.stringify({ epoch: LAN.epoch, rev: LAN.base }));
}
/** Someone is selling or typing, so nothing should change under them yet. */
function lanBusyOnScreen() {
  const login = $("#login"),
    atLogin =
      login &&
      login.style.display !== "none" &&
      !$("#bo").classList.contains("show") &&
      !$("#fd").classList.contains("show");
  if (document.querySelector(".modal.show")) return true;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== "pinDisp") return true;
  return !atLogin && (!!cur || !!draft || Object.keys(cart).length > 0);
}
function lanRedraw() {
  // People and things are new objects now, so what's on screen is pointed at the new ones.
  if (user) user = USERS.find(u => u.n === user.n) || user;
  try {
    if ($("#bo").classList.contains("show")) all();
    else if ($("#fd").classList.contains("show")) fdDraw();
    else if (user) {
      drawDepts();
      drawCats();
      drawCart();
    }
  } catch (e) {}
}
function lanPill() {
  let p = $("#lanPill");
  if (!p) {
    p = document.createElement("div");
    p.id = "lanPill";
    p.setAttribute("role", "status");
    document.body.appendChild(p);
  }
  const off = LAN.state === "offline";
  p.className = off ? "off" : "";
  p.textContent = off
    ? "Main not reachable. Keep working, it will catch up."
    : LAN.role === "main"
      ? "Main computer"
      : "Connected to Main";
  p.hidden = !off && LAN.role === "main" && !window.__lan;
}
function lanApply(p) {
  const raw = localStorage.getItem(LS);
  if (raw !== p.sentRaw) return true; // changed since it was sent, so it goes round again with the new work
  if (lanBusyOnScreen()) return false;
  const merged = p.data,
    own = raw ? JSON.parse(raw).LI : undefined;
  if (own !== undefined) merged.LI = own;
  const str = JSON.stringify(merged);
  localStorage.setItem(LS, str);
  boLoad(JSON.parse(str), true);
  fdModuleApply();
  LAN.lastRaw = str;
  LAN.base = p.rev;
  lanSaveBase();
  lanRedraw();
  return true;
}
async function lanTick() {
  if (LAN.busy) return;
  LAN.busy = true;
  try {
    if (LAN.pending && lanApply(LAN.pending)) LAN.pending = null;
    const raw = localStorage.getItem(LS),
      force = localStorage.getItem(LAN_FORCE) === "1",
      r = await fetch("/lan/rev").then(x => x.json());
    if (!r.ok) {
      LAN.state = "offline";
      return lanPill();
    }
    LAN.state = "online";
    LAN.at = Date.now();
    if (r.numbered && !window.__lan) window.__lan = { idx: LAN.idx, mod: 20 };
    const dirty = raw !== LAN.lastRaw,
      behind = r.rev !== LAN.base;
    if (LAN.pending && !dirty && r.rev === LAN.pending.rev) return lanPill(); // still waiting for a quiet moment
    if (dirty || behind || force) {
      const res = await fetch("/lan/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ base: LAN.base, data: lanStrip(raw), force })
      });
      if (!res.ok) {
        LAN.state = "offline";
        return lanPill();
      }
      const o = await res.json();
      if (force) localStorage.removeItem(LAN_FORCE);
      if (o.same) {
        LAN.base = o.rev;
        LAN.lastRaw = raw;
        LAN.pending = null;
        lanSaveBase();
      } else if (o.data) {
        LAN.pending = { rev: o.rev, data: o.data, sentRaw: raw };
        if (lanApply(LAN.pending)) LAN.pending = null;
      }
    }
    lanPill();
  } catch (e) {
    LAN.state = "offline";
    lanPill();
  } finally {
    LAN.busy = false;
  }
}
(async () => {
  let s = null;
  try {
    s = await fetch("/lan/status").then(r => r.json());
  } catch (e) {}
  if (!s || !s.kaytia) return; // only in the installed program
  Object.assign(LAN, {
    on: true,
    role: s.role,
    idx: s.idx,
    epoch: s.epoch,
    main: s.main,
    home: s.home
  });
  if (s.numbered) window.__lan = { idx: s.idx, mod: 20 };
  const saved = JSON.parse(localStorage.getItem(LAN_REV) || "null");
  // Data from a different Main doesn't count as a starting point: this computer takes on the new Main's.
  LAN.base = saved && saved.epoch === s.epoch ? saved.rev : null;
  LAN.lastRaw = LAN.base === null ? null : localStorage.getItem(LS);
  lanTick();
  setInterval(lanTick, LAN_EVERY);
})();
/** Settings → Computers on the network. */
function networkHTML() {
  if (!LAN.on)
    return '<div class="pn"><h4>Computers on the network</h4><div class="empty">This works in the installed Kaytia Flow program, not in this copy.</div></div>';
  const live = LAN.state !== "offline",
    ago = LAN.at ? Math.round((Date.now() - LAN.at) / 1000) : null;
  return `<div class="pn"><div class="inv-head"><h4>Computers on the network</h4><span class="tag ${live ? "ok" : "bad"}">${live ? "Connected" : "Main not reachable"}</span></div>
  <div class="stm-tiles">${msTile("This computer", LAN.role === "main" ? "Main" : "Till")}${LAN.role === "till" ? msTile("Main computer", esc(LAN.main)) : msTile("Data saved in", esc(LAN.home + "\\data"))}${msTile("Last checked", ago === null ? "-" : `${ago} seconds ago`)}${msTile("Waiting to update", LAN.pending ? "Yes" : "No")}</div>
  <div class="stk">Changes reach other computers within seconds. If a screen is busy, they wait until it's free, and nothing is lost.</div>
  <div class="pv-form"><a class="chip on" href="/connect" target="_blank" rel="noopener">Connect computers</a></div></div>${svcHTML()}`;
}
// ---- Settings → Network: Kaytia Flow running quietly in the background, and starting with Windows
const svcS = { loaded: false, s: null, busy: "" };
async function svcLoad() {
  svcS.loaded = true;
  try {
    const r = await fetch("/lan/service");
    svcS.s = r.ok ? await r.json() : null;
  } catch (e) {
    svcS.s = null;
  }
  if (view === "settings" && setTab === "network") all();
}
function svcHTML() {
  if (!svcS.loaded) svcLoad();
  const s = svcS.s;
  if (!s) return "";
  const bg = s.background,
    since = s.since ? dt2(s.since) : "-";
  return `<div class="pn svc"><div class="inv-head"><h4>Background program</h4><span class="tag ${bg ? "ok" : "warn"}">${bg ? "Running in the background" : "Running in a window"}</span></div>
  <div class="stk">${bg ? "Kaytia Flow runs quietly with no window, like a database server. Closing the browser doesn't stop it, and the desktop shortcut opens it again." : "Kaytia Flow is running in a black window on this computer. Close that window and open Kaytia Flow from the desktop shortcut to run it in the background instead."}</div>
  <div class="svc-row"><div><b>Start with Windows</b><small>Starts by itself when you sign in to this computer, so tills and the POS can always reach it.</small></div><button class="pv-sw ${s.autostart ? "on" : ""}" data-a="svc_auto" role="switch" aria-checked="${s.autostart}" aria-label="Start with Windows" ${s.installed ? "" : "disabled"}><i></i></button></div>
  <div class="svc-row"><div><b>Running since</b><small>${since}</small></div>${bg ? `<button class="mini" data-a="svc_restart" ${svcS.busy ? "disabled" : ""}>${svcS.busy === "restart" ? "Restarting..." : "Restart"}</button>` : ""}</div></div>`;
}
async function svcAct(a, b) {
  const post = async (p, body) => {
    try {
      const r = await fetch("/lan/service/" + p, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body || {})
      });
      const j = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, j } : { ok: false, msg: j.error || "That didn't work." };
    } catch (e) {
      return { ok: false, msg: "The server can't be reached." };
    }
  };
  if (a === "svc_auto") {
    const on = !(svcS.s && svcS.s.autostart),
      r = await post("autostart", { on });
    if (!r.ok) return toast(r.msg);
    svcS.s.autostart = r.j.autostart;
    auditAdd(
      "Settings",
      `Kaytia Flow ${r.j.autostart ? "starts" : "no longer starts"} with Windows on this computer`
    );
    toast(
      r.j.autostart
        ? "Kaytia Flow will start with Windows."
        : "Kaytia Flow won't start with Windows."
    );
    return all();
  }
  if (a === "svc_restart")
    return tapConfirm(
      b,
      async () => {
        svcS.busy = "restart";
        all();
        const r = await post("restart");
        if (!r.ok) {
          svcS.busy = "";
          all();
          return toast(r.msg);
        }
        auditAdd("Settings", "Kaytia Flow restarted from Settings");
        toast("Restarting. This takes a few seconds.");
        for (let i = 0; i < 30; i++) {
          await new Promise(res => setTimeout(res, 1000));
          try {
            const s = await fetch("/lan/service").then(x => x.json());
            if (s && s.since !== (svcS.s || {}).since) {
              svcS.s = s;
              svcS.busy = "";
              toast("Kaytia Flow restarted.");
              return all();
            }
          } catch (e) {}
        }
        svcS.busy = "";
        toast("Kaytia Flow hasn't come back yet. Open it from the desktop shortcut.");
        all();
      },
      "Tap again to restart"
    );
}

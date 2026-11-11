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
    home: s.home,
    browser: !!s.browser, // a phone or browser signed in to the Main, not a computer with the program
    device: s.device || ""
  });
  if (s.numbered) window.__lan = { idx: s.idx, mod: 20 };
  const saved = JSON.parse(localStorage.getItem(LAN_REV) || "null");
  // Data from a different Main doesn't count as a starting point: this computer takes on the new Main's.
  LAN.base = saved && saved.epoch === s.epoch ? saved.rev : null;
  LAN.lastRaw = LAN.base === null ? null : localStorage.getItem(LS);
  lanTick();
  setInterval(lanTick, LAN_EVERY);
  licShare();
  setInterval(licShare, 60000);
})();
// ---- company license: entered once on the main computer, the tills get it from there
LAN.lic = null;
async function licShare() {
  if (!LAN.on) return;
  let j = null;
  try {
    j = await fetch("/lan/license").then(r => r.json());
  } catch (e) {
    return;
  }
  if (!j || j.offline) return;
  const mine = LIC.s.key || "",
    myKey = mine ? LIC.read(mine) : null;
  if (LAN.role === "main" && myKey && myKey.i === "*" && myKey.m && mine !== j.key) {
    // Entered here before the program kept it, or the program was reinstalled: hand it over.
    try {
      j = await fetch("/lan/license", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: mine })
      }).then(r => r.json());
    } catch (e) {}
  } else if (j.key && j.key !== mine) {
    const err = LIC.apply(j.key);
    if (!err) {
      bosave();
      if (typeof all === "function" && $("#bo").classList.contains("show")) all();
    }
  }
  LAN.lic = j && j.m ? { m: j.m, used: j.used } : null;
}
addEventListener("kf:license", e => {
  if (!LAN.on || LAN.role !== "main") return;
  const K = LIC.read(e.detail);
  if (!K || K.i !== "*") return;
  fetch("/lan/license", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: e.detail })
  })
    .then(r => r.json())
    .then(j => {
      LAN.lic = j && j.m ? { m: j.m, used: j.used } : null;
    })
    .catch(() => {});
});
/** Settings → Computers on the network. */
function networkHTML() {
  if (!LAN.on)
    return '<div class="pn"><h4>Computers on the network</h4><div class="empty">This works in the installed Kaytia Flow program, not in this copy.</div></div>';
  const live = LAN.state !== "offline",
    ago = LAN.at ? Math.round((Date.now() - LAN.at) / 1000) : null;
  return `<div class="pn"><div class="inv-head"><h4>Computers on the network</h4><span class="tag ${live ? "ok" : "bad"}">${live ? "Connected" : "Main not reachable"}</span></div>
  <div class="stm-tiles">${LAN.browser ? msTile("This device", esc(LAN.device || "Phone")) : msTile("This computer", LAN.role === "main" ? "Main" : "Till")}${LAN.role === "till" ? msTile("Main computer", esc(LAN.main)) : msTile("Data saved in", esc(LAN.home + "\\data"))}${msTile("Last checked", ago === null ? "-" : `${ago} seconds ago`)}${msTile("Waiting to update", LAN.pending ? "Yes" : "No")}</div>
  <div class="stk">Changes reach other computers within seconds. If a screen is busy, they wait until it's free, and nothing is lost.</div>
  ${LAN.browser ? "" : '<div class="pv-form"><a class="chip on" href="/connect" target="_blank" rel="noopener">Connect computers</a></div>'}</div>${webHTML()}${svcHTML()}`;
}
// ---- Settings → Network: phones, tablets and other computers opening Kaytia Flow in a browser, on this Wi-Fi
const webS = { loaded: false, s: null, busy: false };
async function webLoad() {
  webS.loaded = true;
  try {
    const r = await fetch("/lan/web-access");
    webS.s = r.ok ? await r.json() : null;
  } catch (e) {
    webS.s = null;
  }
  if (view === "settings" && setTab === "network") all();
}
function webHTML() {
  if (LAN.browser)
    return `<div class="pn web-acc"><div class="inv-head"><h4>Phones and browsers</h4><span class="tag ok">Signed in</span></div><div class="stk">This device is signed in to the main computer as <b>${esc(LAN.device || "Phone")}</b>. Only the main computer can remove it.</div></div>`;
  if (!webS.loaded) webLoad();
  const s = webS.s;
  if (!s || !s.main) return "";
  const url = s.urls[0] || "",
    D = s.devices || [],
    live = d => d.seen && Date.now() - new Date(d.seen).getTime() < 90000;
  const sw = `<button class="pv-sw ${s.on ? "on" : ""}" data-a="web_onoff" role="switch" aria-checked="${s.on}" aria-label="Allow phones and browsers" ${webS.busy ? "disabled" : ""}><i></i></button>`;
  return `<div class="pn web-acc"><div class="inv-head"><h4>Phones and browsers</h4><span class="tag ${s.on ? "ok" : ""}">${s.on ? "Allowed on this network" : "Off"}</span></div>
  <div class="svc-row"><div><b>Allow phones, tablets and other computers</b><small>They open Kaytia Flow in a browser on the same Wi-Fi or network, with nothing to install. Not reachable from the internet.</small></div>${sw}</div>
  ${
    s.on
      ? `<div class="web-go">${url ? `<div class="web-qr" aria-hidden="true">${qrSvg(url)}</div>` : ""}<div><span class="web-k">Open this address</span><b class="web-url">${esc(url || "No network address found. Connect this computer to the Wi-Fi.")}</b>${s.urls.length > 1 ? `<small>Also: ${s.urls.slice(1).map(esc).join(", ")}</small>` : ""}
      <ol class="web-steps"><li>Join the same Wi-Fi as this computer.</li><li>Scan the code or type the address in the browser.</li><li>Sign in the device once with ${s.hasLogin ? "the server username and password" : "the connect code"}.</li><li>Staff then sign in with their own username or PIN, and see only what their role allows.</li></ol><small class="web-fw">Phone can't open it? Make sure Windows Firewall on this computer allows Kaytia Flow${url ? " (port " + esc(url.split(":").pop()) + ")" : ""}.</small></div></div>
  <div class="stk">Each device counts as one computer on your license. Settings for the program itself, the license key and the cloud stay on this computer.</div>
  <h5 class="sy-sub">Signed-in devices (${D.length})</h5>${
    D.length
      ? `<div class="web-devs">${D.map(d => `<div class="web-dev ${live(d) ? "on" : ""}"><span class="sy-dot" aria-hidden="true"></span><span class="web-dn"><b>${esc(d.name)}</b><small>${esc(d.ip || "-")} · ${live(d) ? "online" : d.seen ? "last seen " + dt2(d.seen) : "not seen since the program restarted"} · bills ${esc(String(d.idx))}</small></span><button class="mini cat-del" data-a="web_rm" data-id="${esc(d.id)}">Remove</button></div>`).join("")}</div>`
      : '<div class="stk">No devices yet. Scan the code with a phone to add one.</div>'
  }`
      : ""
  }</div>`;
}
async function webAct(a, b) {
  if (a === "web_onoff") {
    if (!webS.s) return;
    const on = !webS.s.on;
    webS.busy = true;
    all();
    try {
      const r = await fetch("/lan/web-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ on })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) toast(j.error || "That didn't work.");
      else {
        webS.s = j;
        auditAdd("Network", `Phones and browsers on the network turned ${on ? "on" : "off"}`, {
          pri: "Important"
        });
        toast(
          on
            ? "Phones and browsers on this network can now sign in."
            : "Phones and browsers can no longer open Kaytia Flow."
        );
      }
    } catch (e) {
      toast("The program on this computer can't be reached.");
    }
    webS.busy = false;
    return all();
  }
  if (a === "web_rm") {
    const id = b.dataset.id,
      d = ((webS.s && webS.s.devices) || []).find(x => x.id === id);
    return tapConfirm(
      b,
      async () => {
        try {
          const r = await fetch("/lan/web-access/remove", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id })
          });
          if (r.ok) webS.s = await r.json();
        } catch (e) {}
        auditAdd("Network", `Device removed: ${d ? d.name : id}`, { pri: "Important" });
        toast(
          `${d ? d.name : "The device"} was removed. It must sign in again to use Kaytia Flow.`
        );
        all();
      },
      "Tap again to remove"
    );
  }
}
setInterval(() => {
  if (
    typeof view !== "undefined" &&
    view === "settings" &&
    setTab === "network" &&
    webS.s &&
    webS.s.on &&
    !syTyping()
  )
    webLoad();
}, 15000);

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

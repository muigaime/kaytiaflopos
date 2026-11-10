// ---- Settings → Database sync: is this computer working offline, on the local network, with the cloud, or both ----
// Tills sync with the Main over the local network every few seconds (lan-sync.js). The Main keeps a copy in
// the cloud when one is set up (desktop/cloud.ts). Everything keeps working with neither: changes wait here.
const syS = { loaded: false, at: 0, s: null, busy: "" };
async function syLoad() {
  syS.loaded = true;
  let s = null;
  try {
    const r = await fetch("/lan/sync-status");
    if (r.ok) s = await r.json();
  } catch (e) {}
  syS.s = s || { role: "browser" };
  syS.at = Date.now();
  if (syOnPage() && !syTyping()) all();
}
const syOnPage = () => view === "settings" && setTab === "sync" && ownOpen;
const syTyping = () => {
  const a = document.activeElement;
  return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !!a.closest("#vSub");
};
setInterval(() => {
  if (syOnPage() && Date.now() - syS.at > 9000) syLoad();
}, 3000);

const syAgo = iso => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60
    ? `${s} seconds ago`
    : s < 3600
      ? plural(Math.round(s / 60), "minute") + " ago"
      : s < 86400
        ? plural(Math.round(s / 3600), "hour") + " ago"
        : dt2(iso);
};
/** Where this computer stands: [local network, cloud], each "on", "off" (unreachable) or "none" (not used). */
function syModes() {
  const s = syS.s || {},
    c = s.cloud || null,
    lan =
      !LAN.on || s.role === "browser"
        ? "none"
        : s.role === "till"
          ? LAN.state === "offline" || s.mainOk === false
            ? "off"
            : "on"
          : (s.tills || []).length
            ? "on"
            : "none",
    cloud = !c || !c.set || !c.on ? "none" : c.online && !c.lastError ? "on" : "off";
  return [lan, cloud];
}
function syHero() {
  const [lan, cloud] = syModes(),
    on = [lan === "on" && "local network", cloud === "on" && "cloud"].filter(Boolean),
    bad = lan === "off" || cloud === "off",
    title = on.length ? `Online · ${on.join(" and ")}` : "Offline · this computer only",
    tone = bad ? "warn" : on.length ? "ok" : "idle",
    sub = bad
      ? `${lan === "off" ? "The main computer can't be reached" : "The cloud can't be reached"}. Keep working: changes are kept here and catch up by themselves.`
      : on.length === 2
        ? "Every computer shares the same data, and a copy is kept safe in the cloud."
        : on.length
          ? lan === "on"
            ? "The computers in the building share the same data. Add a cloud copy below to keep it safe off site."
            : "A copy of this computer's data is kept in the cloud."
          : "Everything works without a network. Connect other computers or a cloud copy when you need them.";
  return `<div class="sy-hero ${tone}"><span class="sy-dot" aria-hidden="true"></span><div><b>${title}</b><p>${sub}</p></div><button class="mini" data-a="sy_refresh">${syS.busy === "refresh" ? "Checking..." : "Check now"}</button></div>
  <div class="sy-flow" aria-label="How data moves">${[
    ["Tills and Front Desk", lan === "none" ? "idle" : lan],
    ["Main computer", "on"],
    ["Cloud", cloud === "none" ? "idle" : cloud]
  ]
    .map(
      ([n, st], i) =>
        `${i ? `<i class="sy-arrow ${st === "on" || (i === 1 && lan === "on") ? "on" : ""}" aria-hidden="true">${i === 1 ? "⇄" : "→"}</i>` : ""}<div class="sy-node ${st}"><span></span>${n}</div>`
    )
    .join("")}</div>`;
}
const syRow = (l, v) => `<div class="sy-kv"><span>${l}</span><b>${v}</b></div>`;
const syTag = (t, l) =>
  `<span class="tag ${t === "on" ? "ok" : t === "off" ? "bad" : ""}">${l}</span>`;
function syLanCard() {
  const s = syS.s || {},
    [lan] = syModes();
  if (!LAN.on || s.role === "browser")
    return `<div class="pn sy-card"><div class="inv-head"><h4>Local network</h4>${syTag("none", "Not used")}</div><div class="stk">This copy runs in a browser on its own. Install Kaytia Flow to share data between computers.</div></div>`;
  const main = s.role === "main",
    T = s.tills || [],
    live = t => t.seen && Date.now() - new Date(t.seen).getTime() < 90000;
  return `<div class="pn sy-card"><div class="inv-head"><h4>Local network</h4>${syTag(lan, lan === "on" ? "Connected" : lan === "off" ? "Main not reachable" : "No other computers")}</div>
  ${syRow("This computer", main ? "Main computer" : `Till ${esc(String(LAN.idx || ""))}`)}${main ? syRow("Data kept in", esc((s.home || LAN.home) + "\\data")) : syRow("Main computer", esc(s.main || LAN.main || "-"))}${syRow("Data version", s.rev == null ? "-" : esc(String(s.rev)))}${syRow("Last synced", LAN.at ? syAgo(new Date(LAN.at).toISOString()) : "never")}${syRow("Changes waiting", LAN.pending ? "Yes, until the screen is free" : "None")}
  ${main ? `<h5 class="sy-sub">Computers on this network (${T.length})</h5>${T.length ? `<div class="sy-list">${T.map(t => `<div class="${live(t) ? "on" : ""}"><span class="sy-dot" aria-hidden="true"></span><b>${esc(t.name)}</b><small>${esc(t.ip || "-")} · ${live(t) ? "online" : "last seen " + syAgo(t.seen)}</small></div>`).join("")}</div>` : '<div class="stk">No other computers yet.</div>'}` : ""}
  <div class="sy-acts">${main ? '<a class="chip on" href="/connect" target="_blank" rel="noopener">Connect computers</a>' : ""}<button class="mini" data-a="sy_lan">Sync now</button></div></div>`;
}
function syCloudCard() {
  const s = syS.s || {},
    c = s.cloud,
    main = s.role === "main",
    [, cl] = syModes();
  if (s.role === "browser")
    return `<div class="pn sy-card"><div class="inv-head"><h4>Cloud copy</h4>${syTag("none", "Not used")}</div><div class="stk">The cloud copy is kept by the main computer, in the installed program.</div></div>`;
  if (!main && !c)
    return `<div class="pn sy-card"><div class="inv-head"><h4>Cloud copy</h4>${syTag("off", "Unknown")}</div><div class="stk">The main computer can't be reached, so its cloud copy can't be checked from here.</div></div>`;
  const tag = !c.set
    ? syTag("none", "Not set up")
    : !c.on
      ? syTag("none", "Off")
      : syTag(cl, cl === "on" ? (c.behind ? "Copying" : "Up to date") : "Not reachable");
  const info = c.set
    ? `${syRow("Cloud address", esc(c.url))}${syRow("Site", esc(c.site))}${syRow("Last copy", c.lastAt ? `${syAgo(c.lastAt)} · version ${esc(String(c.lastRev))}` : "Not yet")}${c.on ? syRow("Waiting to copy", c.behind ? plural(c.behind, "change") : "Nothing") : ""}${c.lastError ? `<div class="status warn">${esc(c.lastError)}</div>` : ""}`
    : '<div class="stk">Keep a copy of all your data on a cloud server, so it is safe even if this computer is lost. The hotel keeps working without internet: the copy catches up when it\'s back.</div>';
  if (!main)
    return `<div class="pn sy-card"><div class="inv-head"><h4>Cloud copy</h4>${tag}</div>${info}<div class="stk">Set up and managed on the main computer.</div></div>`;
  const busy = k => (syS.busy === k ? "disabled" : "");
  return `<div class="pn sy-card"><div class="inv-head"><h4>Cloud copy</h4>${tag}</div>${info}
  ${c.set ? `<div class="sy-acts"><button class="chip on" data-a="sy_now" ${c.on ? "" : "disabled"} ${busy("now")}>${syS.busy === "now" ? "Copying..." : "Copy now"}</button><button class="mini" data-a="sy_test" ${busy("test")}>${syS.busy === "test" ? "Testing..." : "Test connection"}</button><button class="mini" data-a="sy_onoff">${c.on ? "Turn off" : "Turn on"}</button><button class="mini cat-del" data-a="sy_forget">Disconnect</button></div>` : ""}
  <details class="sy-set" ${c.set ? "" : "open"}><summary>${c.set ? "Change the cloud connection" : "Connect to a cloud server"}</summary>
  <div class="sy-form"><label>Cloud address<input id="syUrl" type="url" autocomplete="off" placeholder="https://cloud.example.com" value="${esc(c.url || "")}"></label><label>Site name<input id="sySite" autocomplete="off" placeholder="the-tide" value="${esc(c.site || "")}"></label><label>Key<input id="syKey" type="password" autocomplete="new-password" placeholder="${c.hasKey ? "Saved. Type a new one to change it" : "The key the cloud gave you"}"></label></div>
  <div class="stk">Your cloud provider gives you the address, site name and key. The key stays on this computer and is never shown again.</div>
  <div class="sy-acts"><button class="chip on" data-a="sy_setup" ${busy("setup")}>${syS.busy === "setup" ? "Connecting..." : "Connect to cloud"}</button></div></details></div>`;
}
function syncHTML() {
  if (!syS.loaded) syLoad();
  if (!syS.s) return '<div class="pn"><div class="empty">Checking the connections...</div></div>';
  return `${syHero()}<div class="sy-grid">${syLanCard()}${syCloudCard()}</div>`;
}
async function syPost(op, body) {
  try {
    const r = await fetch("/lan/cloud/" + op, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const j = await r.json().catch(() => ({}));
    return r.ok
      ? { ok: true, j }
      : { ok: false, msg: j.error || "The main computer refused that." };
  } catch (e) {
    return { ok: false, msg: "The server can't be reached." };
  }
}
async function syncAct(a, b) {
  if (!ownOpen) return;
  if (a === "sy_refresh") {
    syS.busy = "refresh";
    all();
    await syLoad();
    syS.busy = "";
    return all();
  }
  if (a === "sy_lan") {
    await lanTick();
    await syLoad();
    return toast(
      LAN.state === "offline" ? "Main not reachable. Keep working, it will catch up." : "Synced."
    );
  }
  const run = async (op, body, done, okMsg) => {
    syS.busy = op;
    all();
    const r = await syPost(op, body);
    syS.busy = "";
    await syLoad();
    all();
    if (!r.ok) return toast(r.msg);
    if (done) auditAdd("Database sync", done, { pri: "Important" });
    toast(r.j.msg || okMsg || "Saved.");
  };
  if (a === "sy_setup") {
    const url = $("#syUrl").value.trim(),
      site = $("#sySite").value.trim(),
      key = $("#syKey").value.trim();
    return run("setup", { url, site, key }, `Cloud copy set up: ${url} as ${site}`);
  }
  if (a === "sy_test") return run("test");
  if (a === "sy_now") return run("now");
  if (a === "sy_onoff") {
    const on = !(syS.s.cloud || {}).on;
    return run(
      "onoff",
      { on },
      `Cloud copy turned ${on ? "on" : "off"}`,
      `Cloud copy is ${on ? "on" : "off"}.`
    );
  }
  if (a === "sy_forget")
    return tapConfirm(
      b,
      () => run("forget", {}, "Cloud copy disconnected", "Disconnected from the cloud."),
      "Tap again to disconnect"
    );
}

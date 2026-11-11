// ---- Staff clock: the page where staff clock in and out, and punches from a fingerprint or face reader ----
let scFails = 0,
  scLock = 0,
  scTimer = 0;
/** One-way, so nobody can read a person's password back. */
const clockHashOf = (salt, pw) => H(salt + "|" + pw);
function clockFill() {
  $("#scE").innerHTML =
    '<option value="">Choose your name</option>' +
    hrEmps()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`)
      .join("");
  $("#scP").value = "";
  $("#scMsg").textContent = "";
  $("#scMsg").className = "sc-msg";
}
function clockTick() {
  const d = new Date();
  if (!$("#sClock").classList.contains("show")) return;
  $("#scT").textContent = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  $("#scD").textContent = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}
function clockOpen() {
  if (!clockOn()) return;
  $("#start").style.display = "none";
  $("#sClock").classList.add("show");
  clockFill();
  clockTick();
  clearInterval(scTimer);
  scTimer = setInterval(clockTick, 15000);
}
function clockClose() {
  clearInterval(scTimer);
  $("#sClock").classList.remove("show");
  $("#start").style.display = "grid";
}
function clockSay(t, ok) {
  $("#scMsg").textContent = t;
  $("#scMsg").className = "sc-msg " + (ok ? "ok" : "no");
}
async function clockPunch(dir) {
  const e = hrEmp($("#scE").value),
    pw = $("#scP").value;
  if (Date.now() < scLock) return clockSay("Too many tries. Wait 30 seconds.");
  if (!e) return clockSay("Choose your name.");
  if (!e.clockHash) return clockSay("You don't have a clock password yet. Ask your manager.");
  if (!pw) return clockSay("Enter your password.");
  if ((await clockHashOf(e.clockSalt, pw)) !== e.clockHash) {
    $("#scP").value = "";
    if (++scFails >= 5) {
      scFails = 0;
      scLock = Date.now() + 30000;
    }
    auditAdd("Failed sign-in", `Wrong clock password for ${e.name}`, { who: e.name, mod: "HR" });
    return clockSay("That password isn't right.");
  }
  scFails = 0;
  const T = hr().time,
    now = new Date(),
    hm = now.toTimeString().slice(0, 5),
    open = T.find(t => t.emp === e.id && !t.out);
  if (dir === "in" && open)
    return clockSay(`${e.name}, you are already clocked in since ${open.in}.`);
  if (dir === "out" && !open) return clockSay(`${e.name}, you haven't clocked in.`);
  if (dir === "in")
    T.push({
      id: nid("T"),
      emp: e.id,
      date: ymdOf(now),
      in: hm,
      out: "",
      by: e.name,
      src: "Staff clock"
    });
  else open.out = hm;
  auditAdd("Attendance", `${e.name} clocked ${dir} at ${hm}`, { who: e.name, mod: "HR" });
  bosave();
  clockFill();
  clockSay(`${e.name}, you clocked ${dir} at ${hm}.`, true);
}
$("#scIn").onclick = () => clockPunch("in");
$("#scOut").onclick = () => clockPunch("out");
$("#scBack").onclick = clockClose;
// ---------------------------------------------------------------- the reader
const bioCall = (op, body) =>
  fetch("/lan/attendance/" + op, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {})
  })
    .then(async r => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, j: {} }));
/** Turn new punches into clock-ins and clock-outs. Two punches within two minutes count as one. */
function bioApply(P) {
  const H1 = hr(),
    last = H1.bioLast || (H1.bioLast = {}),
    miss = H1.bioMiss || (H1.bioMiss = {});
  P.slice()
    .sort((a, b) => a.seq - b.seq)
    .forEach(p => {
      H1.bioSeq = Math.max(H1.bioSeq || 0, p.seq);
      const e = hrEmps().find(x => String(x.bioId || "") === p.id);
      if (!e) return void (miss[p.id] = p.at);
      const when = new Date(p.at.replace(" ", "T")).getTime();
      if (last[e.id] && Math.abs(when - last[e.id]) < 120000) return;
      last[e.id] = when;
      const date = p.at.slice(0, 10),
        hm = p.at.slice(11, 16),
        open = H1.time.find(t => t.emp === e.id && !t.out);
      if (p.type === "in" && open) return;
      if (p.type === "out" && !open) return;
      if (open && p.type !== "in") open.out = hm;
      else
        H1.time.push({
          id: nid("T"),
          emp: e.id,
          date,
          in: hm,
          out: "",
          by: "Reader",
          src: "Biometric"
        });
    });
}
async function bioPull() {
  if (LAN.role === "till") return;
  const r = await bioCall("pull", { after: hr().bioSeq || 0 });
  if (!r.ok || !Array.isArray(r.j.punches) || !r.j.punches.length) return;
  bioApply(r.j.punches);
  bosave();
  if (view === "hr" && hrS.tab === "time" && boUser) all();
}
setInterval(bioPull, 60000);
// ---- HR → Clock and biometric
const bioS = { loaded: false, info: null, ips: [] };
async function bioLoad() {
  bioS.loaded = true;
  const [r, i] = await Promise.all([
    bioCall("info"),
    fetch("/lan/info")
      .then(x => x.json())
      .catch(() => ({}))
  ]);
  bioS.info = r.ok && r.j.lastSeen ? r.j : null;
  bioS.ips = i.addresses || [];
  if (view === "hr" && hrS.tab === "clock") all();
}
function hrClockHTML() {
  if (!bioS.loaded) bioLoad();
  const E = hrEmps(),
    ready = E.filter(e => e.clockHash).length,
    linked = E.filter(e => e.bioId).length,
    I0 = bioS.info,
    miss = Object.entries(hr().bioMiss || {}).filter(
      ([id]) => !E.some(e => String(e.bioId) === id)
    );
  return `<div class="stm-tiles">${msTile("Can use the clock page", `${ready} of ${E.length}`)}${msTile("Linked to the reader", `${linked} of ${E.length}`)}${msTile("Clocked in now", hr().time.filter(t => !t.out).length)}</div>
  <div class="hr-two"><div class="pn"><h4>Clock page</h4><div class="stk">Staff open <b>Staff clock</b> on the main page, choose their name and enter their password. Set each person's password when you edit them under Employees.</div>${
    E.filter(e => !e.clockHash).length
      ? `<div class="stk">Still need a password: ${esc(
          E.filter(e => !e.clockHash)
            .map(e => e.name)
            .join(", ")
        )}</div>`
      : ""
  }</div>
  <div class="pn"><div class="inv-head"><h4>Fingerprint or face reader</h4><span class="tag ${I0 && I0.on ? "ok" : ""}">${I0 && I0.on ? "On" : "Off"}</span></div>${
    I0
      ? `<div class="stk">In the reader's cloud server settings, enter this computer's address <b>${esc(bioS.ips[0] || "")}</b> and port <b>5500</b>. Give each employee the ID they have on the reader, under Employees.</div>
      <label class="mp-on"><input id="bioOn" type="checkbox" ${I0.on ? "checked" : ""}><span><b>Take clock-ins from the reader</b><small>Only readers listed below are accepted.</small></span></label>
      <div class="mp-g"><label class="ac-wide">Reader serial number<input id="bioDev" value="${esc(I0.devices)}" autocomplete="off" placeholder="Separate several with commas"></label></div>
      <div class="itm-hint">${I0.lastSeen.at ? `Last heard from ${esc(I0.lastSeen.device)} at ${dt2(I0.lastSeen.at)}.` : "No reader has been heard from yet."}</div>
      <div class="mp-b"><button class="chip on" data-a="hr_biosave">Save</button></div>`
      : '<div class="empty">This works on the main computer, in the installed Kaytia Flow program.</div>'
  }${miss.length ? `<div class="itm-hint">IDs on the reader with no employee: ${miss.map(([id]) => esc(id)).join(", ")}</div>` : ""}</div></div>`;
}
async function bioSave() {
  const r = await bioCall("save", { on: $("#bioOn").checked, devices: $("#bioDev").value });
  if (!r.ok) return toast(r.j.error || "That didn't work.");
  auditAdd("Attendance", "Reader settings changed", { mod: "HR" });
  toast("Saved.");
  bioS.loaded = false;
  all();
}

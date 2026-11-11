// ---- Settings → Kitchen display: what each screen shows, and when an order counts as late ----
// Saved in FD_SETTINGS.kds = { late: { new, prep }, keepH, screens: { [computer name]: { station, points } } }.
const kdsSet = () => FD_SETTINGS.kds || (FD_SETTINGS.kds = {});
const kdsScreens = () => kdsSet().screens || (kdsSet().screens = {});
function kdsSetupHTML() {
  const S = kdsSet(),
    late = { new: (S.late || {}).new || 8, prep: (S.late || {}).prep || 15 },
    me = MACHINE.name(),
    pcs = MACHINE.list().map(m => m.n),
    pts = ALLD;
  return `<div class="pn"><h4>Each kitchen screen</h4><div class="stk">Choose what the kitchen display shows on each computer: the kitchen, the bar or both, and which selling points. A screen set here shows its place instead of filter buttons. Untick every selling point to show them all.</div>
  ${
    pcs.length
      ? `<div class="kdss">${pcs
          .map(n => {
            const s = kdsScreens()[n] || {},
              st = s.station || "All",
              on = s.points || [];
            return `<div class="kdss-row"><div class="kdss-pc"><b>${esc(n)}</b>${n === me ? '<small class="ur-me">This computer</small>' : ""}</div>
            <label>Shows<select data-kdsm="${esc(n)}">${[
              ["All", "Kitchen and bar"],
              ["Kitchen", "Kitchen only"],
              ["Bar", "Bar only"]
            ]
              .map(([v, l]) => `<option value="${v}" ${v === st ? "selected" : ""}>${l}</option>`)
              .join("")}</select></label>
            <div class="kdss-pts"><span>Selling points</span>${pts
              .map(
                p =>
                  `<label><input type="checkbox" data-kdsp="${esc(n)}" value="${esc(p)}" ${on.includes(p) ? "checked" : ""}> ${esc(p)}</label>`
              )
              .join(
                ""
              )}<small>${on.length ? `${on.length} of ${pts.length}` : "All of them"}</small></div></div>`;
          })
          .join("")}</div>`
      : '<div class="empty">No computers are registered yet. Each computer registers its name the first time Kaytia Flow opens on it.</div>'
  }</div>
  <div class="pn"><h4>Timing</h4><div class="stk">When an order turns red on the screen, and how long served orders stay on the Served tab.</div>
  <div class="fr"><label>Late when waiting more than (minutes)<input id="kdsLN" type="number" min="1" max="120" step="1" value="${late.new}"></label><label>Late when preparing more than (minutes)<input id="kdsLP" type="number" min="1" max="240" step="1" value="${late.prep}"></label><label>Keep served orders for (hours)<input id="kdsKH" type="number" min="1" max="72" step="1" value="${S.keepH || 12}"></label><button class="chip on" data-a="hs_kdstime">Save timing</button></div></div>`;
}
function kdsSetupSave(n, change) {
  if (!boCan("set.manage")) return boDenied();
  const s = (kdsScreens()[n] = kdsScreens()[n] || { station: "All", points: [] });
  change(s);
  if (s.station === "All" && !s.points.length) delete kdsScreens()[n];
  bosave();
  const now = kdsScreens()[n];
  auditAdd(
    "Settings",
    `Kitchen display on ${n}: ${now ? `${now.station === "All" ? "kitchen and bar" : now.station.toLowerCase()} · ${now.points.length ? now.points.join(", ") : "every selling point"}` : "chooses on screen"}`
  );
  toast(`Saved for ${n}.`);
  all();
}
$("#vSub").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.kdsm !== undefined) return kdsSetupSave(t.dataset.kdsm, s => (s.station = t.value));
  if (t.dataset.kdsp !== undefined)
    return kdsSetupSave(t.dataset.kdsp, s => {
      s.points = (s.points || []).filter(p => p !== t.value);
      if (t.checked) s.points.push(t.value);
    });
});
function kdsTimeSave() {
  if (!boCan("set.manage")) return boDenied();
  const n = Math.round(+$("#kdsLN").value),
    p = Math.round(+$("#kdsLP").value),
    h = Math.round(+$("#kdsKH").value);
  if (!(n >= 1 && n <= 120) || !(p >= 1 && p <= 240))
    return toast("Late times should be 1 to 120 minutes waiting and 1 to 240 preparing.");
  if (!(h >= 1 && h <= 72)) return toast("Keep served orders for 1 to 72 hours.");
  kdsSet().late = { new: n, prep: p };
  kdsSet().keepH = h;
  bosave();
  auditAdd(
    "Settings",
    `Kitchen display: late after ${n} min waiting or ${p} min preparing; served kept ${h} h`
  );
  toast("Timing saved.");
  all();
}

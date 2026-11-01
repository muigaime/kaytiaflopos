const NATIONALITIES = [
    "Kenyan",
    "Ugandan",
    "Tanzanian",
    "Rwandan",
    "Burundian",
    "South Sudanese",
    "Ethiopian",
    "Somali",
    "Congolese",
    "Nigerian",
    "Ghanaian",
    "South African",
    "Zambian",
    "Zimbabwean",
    "Egyptian",
    "Moroccan",
    "British",
    "Irish",
    "American",
    "Canadian",
    "German",
    "French",
    "Italian",
    "Spanish",
    "Dutch",
    "Swiss",
    "Swedish",
    "Norwegian",
    "Indian",
    "Pakistani",
    "Chinese",
    "Japanese",
    "Korean",
    "Emirati",
    "Saudi",
    "Turkish",
    "Australian",
    "Brazilian",
    "Other"
  ],
  ID_TYPES = ["National ID", "Passport", "Driving licence", "Alien / resident ID", "Other"];
const nationalityListHTML =
    '<datalist id="natl">' +
    NATIONALITIES.map(x => `<option value="${x}">`).join("") +
    "</datalist>",
  newGuest = () => ({
    name: "",
    nat: "",
    idt: "National ID",
    idn: "",
    phone: "",
    email: "",
    gender: ""
  });
const guestsOf = r => {
    if (!r.guests || !r.guests.length)
      r.guests = [
        Object.assign(newGuest(), {
          name: r.grp ? "" : r.guest,
          phone: r.phone || "",
          idn: r.idno || ""
        })
      ];
    return r.guests;
  },
  guestIsRegistered = x =>
    !!(x && x.name && x.name.trim() && x.nat && x.nat.trim() && x.idn && x.idn.trim());
function gReg(g) {
  const R = groupReservations(g),
    miss = R.filter(r => !guestIsRegistered(guestsOf(r)[0])).length,
    F = [
      ["name", "Full name"],
      ["nat", "Nationality", "natl"],
      ["idt"],
      ["idn", "ID no."],
      ["phone", "Phone"],
      ["gender"],
      ["email", "Email"]
    ];
  return `${nationalityListHTML}<div class="fd-card"><h4>Guest registration<small>${miss ? miss + " room(s) still need lead guest details" : "All rooms registered"}</small></h4><div class="fd-form"><label>Apply a nationality to guests who have none<input id="gr_nat" list="natl" placeholder="e.g. Kenyan"></label><button class="mini" data-f="gnat">Apply</button></div>
 <div style="overflow:auto"><table class="sht gr-t"><tr><th>Room</th><th>Full name</th><th>Nationality</th><th>ID type</th><th>ID / passport no.</th><th>Phone</th><th>Gender</th><th>Email</th><th>ID / passport copy</th><th></th></tr>${R.map(
   r =>
     guestsOf(r)
       .map(
         (x, i) =>
           `<tr class="${guestIsRegistered(x) ? "" : "gr-miss"}"><td>${i === 0 ? `<b>${r.room}</b><br><small>${hx(r.type)}</small>` : "↳"}</td>${F.map(([k, ph, dl]) => `<td>${k === "idt" ? `<select data-gr="${r.id}|${i}|idt">${ID_TYPES.map(t => `<option ${x.idt === t ? "selected" : ""}>${t}</option>`).join("")}</select>` : k === "gender" ? `<select data-gr="${r.id}|${i}|gender"><option value=""></option>${["Female", "Male", "Other"].map(t => `<option ${x.gender === t ? "selected" : ""}>${t}</option>`).join("")}</select>` : `<input data-gr="${r.id}|${i}|${k}" ${dl ? `list="${dl}"` : ""} placeholder="${ph}" value="${hx(x[k] || "")}">`}</td>`).join("")}<td>${upCtl("gr|" + r.id + "|" + i, x.doc)}</td><td>${i > 0 ? `<button class="mini" data-f="grdel" data-id="${r.id}" data-i="${i}">✕</button>` : `<button class="mini" data-f="gradd" data-id="${r.id}">+ Guest</button>`}</td></tr>`
       )
       .join("")
 ).join(
   ""
 )}</table></div><div class="stk">The lead guest of every room needs a name, nationality and ID number before the group can check in. Extra guests in a room are optional.</div></div>`;
}
function gListHTML(g, by) {
  const R = groupReservations(g);
  return `<div class="rd" style="max-width:none"><h2>${hx(FD_SETTINGS.name.toUpperCase())}</h2><div class="c">GROUP GUEST LIST</div><div class="c">${hx(g.name)} · ${g.in} to ${g.out}</div><hr><table>${R.map(
    r =>
      guestsOf(r)
        .map(
          (x, i) =>
            `<tr><td>${i ? "" : r.room}</td><td>${hx(x.name || "-")}</td><td>${hx(x.nat || "-")}</td><td>${hx((x.idt || "") + " " + (x.idn || ""))}</td></tr>`
        )
        .join("")
  ).join("")}</table><hr><div class="c">Printed by ${hx(by || "")}</div></div>`;
}
function gbReg(rooms) {
  if (!rooms.length)
    return '<div class="ci-sec">Guests for each room</div><div class="stk">Select rooms above, then add the guests who will occupy them.</div>';
  const F = [
    ["name", "Full name"],
    ["nat", "Nationality", "natl"],
    ["idt"],
    ["idn", "ID no."],
    ["phone", "Phone"],
    ["gender"],
    ["email", "Email"]
  ];
  return `${nationalityListHTML}<div class="ci-sec">Guests for each room</div><div class="fd-form"><label>Apply a nationality to all guests without one<input id="gb_nat" list="natl" placeholder="e.g. Kenyan"></label><button class="mini" data-f="gbnat">Apply</button></div>
 <div style="overflow:auto"><table class="sht gr-t"><tr><th>Room</th><th>Full name</th><th>Nationality</th><th>ID type</th><th>ID / passport no.</th><th>Phone</th><th>Gender</th><th>Email</th><th>ID / passport copy</th><th></th></tr>${rooms.map(r => (groupForm.gs[r.no] = groupForm.gs[r.no] || [newGuest()]).map((x, i) => `<tr><td>${i === 0 ? `<b>${r.no}</b><br><small>${hx(r.type)}</small>` : "↳"}</td>${F.map(([k, ph, dl]) => `<td>${k === "idt" ? `<select data-gbg="${r.no}|${i}|idt">${ID_TYPES.map(t => `<option ${x.idt === t ? "selected" : ""}>${t}</option>`).join("")}</select>` : k === "gender" ? `<select data-gbg="${r.no}|${i}|gender"><option value=""></option>${["Female", "Male", "Other"].map(t => `<option ${x.gender === t ? "selected" : ""}>${t}</option>`).join("")}</select>` : `<input data-gbg="${r.no}|${i}|${k}" ${dl ? `list="${dl}"` : ""} placeholder="${ph}" value="${hx(x[k] || "")}">`}</td>`).join("")}<td>${upCtl("gb|" + r.no + "|" + i, x.doc)}</td><td>${i > 0 ? `<button class="mini" data-f="gbdel" data-no="${r.no}" data-i="${i}">✕</button>` : `<button class="mini" data-f="gbadd" data-no="${r.no}">+ Guest</button>`}</td></tr>`).join("")).join("")}</table></div><div class="stk">Add the guests now, or complete them later on the group folio. The lead guest of each room needs a name, nationality and ID number before check-in.</div>`;
}
function docRead(file, cb) {
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const m = 1100,
        k = Math.min(1, m / Math.max(im.width, im.height)),
        c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.width * k));
      c.height = Math.max(1, Math.round(im.height * k));
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.65), file.name);
    };
    im.onerror = () => cb(null);
    im.src = r.result;
  };
  r.onerror = () => cb(null);
  r.readAsDataURL(file);
}
const upCtl = (ctx, d) =>
  `<span class="upc">${d ? `<span class="tag ok" style="background:none;color:#12804a">✓ Attached</span><button type="button" class="mini" data-f="docv" data-ctx="${ctx}">View</button><button type="button" class="mini" data-f="docx" data-ctx="${ctx}">✕</button>` : `<label class="mini upl">Upload ID / passport<input type="file" accept="image/*" data-up="${ctx}" hidden></label>`}</span>`;
function docTarget(ctx) {
  const p = ctx.split("|");
  if (p[0] === "ci") return checkInForm;
  if (p[0] === "gb") return (groupForm.gs[p[1]] || [])[+p[2]];
  if (p[0] === "gr") {
    const r = RESERVATIONS.find(x => x.id === p[1]);
    return r && guestsOf(r)[+p[2]];
  }
}
function hkHTML(only, by) {
  const T = todayYmd(),
    c = roomStatusCounts(),
    rows = ROOMS.slice()
      .sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true }))
      .map(r => ({
        r,
        x: roomStatus(r),
        st: stayOf(r.no),
        rv: RESERVATIONS.find(
          q => q.room === r.no && q.status === "reserved" && q.in <= T && q.out > T
        )
      }))
      .filter(o => !only || o.x === "dirty" || (o.st && o.st.out <= T));
  return `<div class="hkp"><div class="hk-h"><div><h1>${hx(FD_SETTINGS.name)}</h1><h2>Housekeeping status report</h2></div><div class="hk-m"><b>${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b><br>Printed ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} by ${hx(by || "")}<br>${only ? "Rooms to clean" : "All rooms"}</div></div>
 <div class="hk-s">${Object.keys(ROOM_STATUS_LABELS)
   .map(k => `<div><b>${c[k] || 0}</b><span>${ROOM_STATUS_LABELS[k]}</span></div>`)
   .join("")}<div><b>${ROOMS.length}</b><span>Total rooms</span></div></div>
 <table><tr><th>Room</th><th>Type</th><th>Status</th><th>Guest / note</th><th>Arrival</th><th>Departure</th><th>Cleaned</th><th>Inspected</th><th>Remarks</th></tr>${rows.length ? rows.map(({ r, x, st, rv }) => `<tr><td><b>${r.no}</b></td><td>${hx(r.type)}</td><td>${ROOM_STATUS_LABELS[x]}</td><td>${st ? hx(st.guest) : rv ? "Due: " + hx(rv.guest) : ""}</td><td>${st ? st.in : rv ? rv.in : ""}</td><td>${st ? st.out : rv ? rv.out : ""}</td><td class="bx">☐</td><td class="bx">☐</td><td></td></tr>`).join("") : '<tr><td colspan="9" style="text-align:center;padding:14px">No rooms need cleaning right now.</td></tr>'}</table>
 <div class="hk-f"><span>Housekeeping supervisor: ____________________</span><span>Signature: ____________________</span><span>Date: ______________</span></div></div>`;
}

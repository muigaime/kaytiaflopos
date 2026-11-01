const ROOMTYPES = [];
let checkInForm = {},
  roomTypeEditing = null;
function checkInFormReset() {
  checkInForm = {
    g: "",
    p: "",
    i: "",
    type: "",
    room: "auto",
    n: 1,
    a: 1,
    c: 0,
    rate: "",
    dep: "",
    m: "cash",
    pm: "later",
    ac: "0",
    nat: "",
    idt: "National ID",
    gd: "",
    em: "",
    doc: "",
    docn: "",
    plan: "RO"
  };
}
checkInFormReset();
const roomTypeByName = n => ROOMTYPES.find(t => t.name === n),
  splitList = t =>
    String(t || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean),
  vacantRoomsOfType = (n, d) =>
    ROOMS.filter(
      r => r.type === n && (roomStatus(r) === "vac" || (d && roomStatus(r) === "dirty"))
    );
function ensureRoomTypes() {
  if (!ROOMTYPES.length)
    [
      [
        "SGL",
        "Standard",
        "Single",
        "Cosy room for the solo traveller",
        "Single bed, Work desk",
        "Wi-Fi, Smart TV, Air conditioning, In-room safe",
        3000,
        2500,
        1,
        2,
        2,
        0,
        1
      ],
      [
        "DBL",
        "Standard",
        "Double",
        "Queen bed room with a private balcony",
        "Queen bed, Balcony",
        "Wi-Fi, Smart TV, Air conditioning, Minibar, In-room safe",
        4500,
        3800,
        2,
        3,
        2,
        1,
        1
      ],
      [
        "EXE",
        "Deluxe",
        "Executive",
        "King bed, lounge area and a workspace",
        "King bed, Lounge area, Work desk",
        "Wi-Fi, Smart TV, Air conditioning, Minibar, Coffee machine",
        6500,
        5500,
        2,
        3,
        3,
        1,
        1
      ],
      [
        "STE",
        "Suite",
        "Suite",
        "Separate living room, bathtub and butler service",
        "King bed, Living room, Bathtub",
        "Wi-Fi, Smart TV, Air conditioning, Minibar, Coffee machine, Butler service",
        9000,
        7500,
        2,
        4,
        3,
        2,
        2
      ]
    ].forEach(
      ([code, cls, name, desc, feat, fac, rate, floor, def, max, adults, children, bed], i) =>
        ROOMTYPES.push({
          code,
          cls,
          name,
          desc,
          long: "",
          rate,
          rcode: code + "-RACK",
          seq: i + 1,
          feat,
          fac,
          def,
          max,
          adults,
          children,
          bed,
          hk: true,
          auto: true,
          meet: false,
          active: true,
          floor,
          inc: 100
        })
    );
  return ROOMTYPES;
}
const roomTypeProfileHTML = (t, vac) =>
  !t.name
    ? '<div class="fd-card"><div class="stk">Choose a room type to see its profile.</div></div>'
    : `<div class="fd-card"><div class="rt-h"><span class="rt-code">${hx(t.code)}</span><div><b>${hx(t.name)}</b><span>${hx(t.cls)} class</span></div></div><div class="stk">${hx(t.desc)}${t.long ? " · " + hx(t.long) : ""}</div>
 <div class="rt-rate"><div><span>Published rate</span><b>KES ${R2(t.rate)}</b></div><div><span>Rate floor</span><b>KES ${R2(t.floor)}</b></div><div><span>Rate code</span><b>${hx(t.rcode)}</b></div></div>
 <div class="rt-occ"><div><b>${t.def}</b><span>Default</span></div><div><b>${t.adults}</b><span>Max adults</span></div><div><b>${t.children}</b><span>Max children</span></div><div><b>${t.max}</b><span>Max guests</span></div><div><b>${t.bed}</b><span>Extra beds</span></div></div>
 <div class="ci-sec">Features</div><div class="rt-chips">${
   splitList(t.feat)
     .map(x => `<i>${hx(x)}</i>`)
     .join("") || '<span class="stk">None listed</span>'
 }</div>
 <div class="ci-sec">Facilities</div><div class="rt-chips">${
   splitList(t.fac)
     .map(x => `<i>${hx(x)}</i>`)
     .join("") || '<span class="stk">None listed</span>'
 }</div>
 <div class="ci-sec">Availability now</div><div class="stk">${vac.length ? "Ready: " + vac.map(r => r.no).join(" · ") : "No vacant room of this type is ready right now."}</div>
 <div class="rt-flags">${[
   ["Housekeeping check", t.hk],
   ["Auto room assign", t.auto],
   ["Meeting room", t.meet]
 ]
   .map(([l, v]) => `<span class="${v ? "on" : ""}">${v ? "✓" : "–"} ${l}</span>`)
   .join("")}</div></div>`;
function roomTypesCardHTML() {
  ensureRoomTypes();
  const t =
    roomTypeEditing === "new"
      ? {
          code: "",
          cls: "Standard",
          name: "",
          desc: "",
          long: "",
          rate: "",
          rcode: "",
          seq: ROOMTYPES.length + 1,
          feat: "",
          fac: "",
          def: 1,
          max: 2,
          adults: 2,
          children: 0,
          bed: 0,
          hk: true,
          auto: true,
          meet: false,
          active: true,
          floor: "",
          inc: 100
        }
      : ROOMTYPES.find(x => x.code === roomTypeEditing);
  const list = `<div class="fd-card"><h4>Room types <button class="mini" data-f="rtnew" style="margin-left:10px">+ New room type</button></h4>${tableHTML(
    ["Code", "Class", "Room type", "Rooms", "Rate", "Floor", "Max guests", "Status", ""],
    ROOMTYPES.slice()
      .sort((a, b) => a.seq - b.seq)
      .map(x => [
        hx(x.code),
        hx(x.cls),
        hx(x.name),
        ROOMS.filter(r => r.type === x.name).length,
        R2(x.rate),
        R2(x.floor),
        x.max,
        x.active ? "Active" : "Inactive",
        `<button class="mini" data-f="rtedit" data-code="${hx(x.code)}">Edit</button>`
      ])
  )}</div>`;
  if (!t) return list;
  const F = (k, l, v, ty) =>
      `<label>${l}<input data-rt="${k}" ${ty ? `type="${ty}"` : ""} value="${hx(v)}"></label>`,
    K = (k, l, v) =>
      `<label class="rt-ck"><input type="checkbox" data-rt="${k}" ${v ? "checked" : ""}> ${l}</label>`;
  return (
    list +
    `<div class="fd-card"><h4>${roomTypeEditing === "new" ? "New room type" : "Room type · " + hx(t.code)}</h4>
 <div class="ci-sec">Identity</div><div class="fd-form">${F("code", "Room type code", t.code)}<label>Room class<select data-rt="cls">${["Standard", "Deluxe", "Executive", "Suite", "Villa"].map(c => `<option ${c === t.cls ? "selected" : ""}>${c}</option>`).join("")}</select></label>${F("name", "Description (room type name)", t.name)}${F("seq", "Display sequence", t.seq, "number")}</div>
 <div class="fd-form">${F("desc", "Short description", t.desc)}${F("long", "Long description", t.long)}</div>
 <div class="ci-sec">Rates</div><div class="fd-form">${F("rate", "Published rate (KES)", t.rate, "number")}${F("rcode", "Rate code", t.rcode)}${F("floor", "Rate floor (KES)", t.floor, "number")}${F("inc", "Rate increments (KES)", t.inc, "number")}</div>
 <div class="ci-sec">Occupancy</div><div class="fd-form">${F("def", "Default occupancy", t.def, "number")}${F("max", "Max guests", t.max, "number")}${F("adults", "Max adults", t.adults, "number")}${F("children", "Max children", t.children, "number")}${F("bed", "Max extra beds", t.bed, "number")}</div>
 <div class="ci-sec">Features and facilities</div><div class="fd-form">${F("feat", "Features (comma separated)", t.feat)}${F("fac", "Facilities (comma separated)", t.fac)}</div>
 <div class="ci-sec">Operations</div><div class="rt-flags" style="gap:16px">${K("hk", "Housekeeping required before check-in", t.hk)}${K("auto", "Auto room assign", t.auto)}${K("meet", "Can be meeting room", t.meet)}${K("active", "Active", t.active)}</div>
 <div class="shp"><button class="chip on" data-f="rtsave">Save room type</button><button class="mini" data-f="rtcancel">Cancel</button>${roomTypeEditing !== "new" ? '<button class="mini" data-f="rtdel">Delete</button>' : ""}</div></div>`
  );
}

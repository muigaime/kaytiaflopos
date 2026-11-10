// ---- Settings: tabs, logos, the payment methods on guest bills, and the POS options ----
// [key, name, short line for the menu, icon, lock ("owner" = owner password, "mod" = modules password), the page's own line]
const SET_GROUPS = [
  [
    "Your business",
    [
      [
        "hotel",
        "Hotel and logos",
        "Name, address, PIN and logos",
        "hotel",
        "",
        "Your name, address, KRA PIN and the logos printed on every guest bill and receipt."
      ],
      [
        "tax",
        "Tax",
        "VAT and Tax C rates",
        "percent",
        "",
        "The tax rates added to bills. Past reports keep the rate they were paid at."
      ],
      [
        "paymodes",
        "Payment modes",
        "Cash, M-Pesa, cards, credit",
        "wal",
        "",
        "How guests can pay: cash, M-Pesa, cards, credit accounts and room charges."
      ],
      [
        "email",
        "Email reports",
        "Daily reports by email",
        "mail",
        "",
        "The reports sent at the end of each day, and who receives them."
      ]
    ]
  ],
  [
    "Point of sale",
    [
      [
        "bills",
        "Bills and receipts",
        "What prints on bills",
        "receipt",
        "",
        "What appears on guest bills and receipts, and the payment details they show."
      ],
      [
        "pos",
        "POS options",
        "Working day and POS rules",
        "pos",
        "",
        "The working day, and the rules waiters and cashiers follow on the POS."
      ],
      [
        "voids",
        "Void reasons",
        "Why items come off a bill",
        "void",
        "",
        "The reasons staff choose when taking an item off a bill."
      ],
      [
        "printers",
        "Printers",
        "Receipt, kitchen and bar",
        "print",
        "",
        "Which printer takes receipts, kitchen orders and bar orders, on each computer."
      ]
    ]
  ],
  [
    "System",
    [
      [
        "network",
        "Network",
        "Computers sharing data",
        "net",
        "",
        "The computers in the building that share this hotel's data."
      ],
      [
        "sync",
        "Database sync",
        "Local network and cloud",
        "sync",
        "owner",
        "Whether data is shared on the local network and kept safe in the cloud."
      ],
      [
        "backup",
        "Backup and restore",
        "Save or bring back data",
        "save",
        "owner",
        "Download all your data, bring a backup back, or start clean."
      ],
      [
        "support",
        "Help and logs",
        "Errors, codes, developer",
        "help",
        "owner",
        "Errors the system has met, what each error code means, and a message to the developer."
      ],
      [
        "modules",
        "Modules",
        "Parts of the system",
        "grid",
        "mod",
        "Switch parts of the system on or off for this business."
      ]
    ]
  ]
];
const SET_TABS = SET_GROUPS.flatMap(g => g[1]);
const setTabOf = k => SET_TABS.find(t => t[0] === k) || SET_TABS[0];
let setTab = "hotel";
invF.gp = { pt: "*", m: "", v: "", a: "" };
const setTabsHTML = () =>
  `<nav class="set-tabs set-nav" role="tablist" aria-label="Settings"><div class="set-title"><h1>Settings</h1><p>How Kaytia Flow runs for your business</p></div>${SET_GROUPS.map(
    ([g, L]) =>
      `<div class="set-grp"><h5>${g}</h5>${L.map(([k, l, d, ic, lock]) => {
        const shut = (lock === "owner" && !ownOpen) || (lock === "mod" && !mdlOpen);
        return `<button role="tab" aria-selected="${k === setTab}" class="set-nv ${k === setTab ? "on" : ""}" data-a="hs_tab" data-k="${k}"><i aria-hidden="true">${I(ic)}</i><span><b>${l}</b><small>${d}</small></span>${lock ? `<em class="set-lk ${shut ? "" : "open"}" title="${lock === "owner" ? "System owner only" : "Modules password"}" aria-label="${shut ? "Locked" : "Open"}">${I(shut ? "lock" : "unlock")}</em>` : ""}</button>`;
      }).join("")}</div>`
  ).join("")}</nav>`;
/** The page's own heading, with a Lock button on an owner page that is open. */
function setHeadHTML() {
  const [k, l, d, ic, lock, long] = setTabOf(setTab);
  return `<header class="set-head"><i aria-hidden="true">${I(ic)}</i><div><h2>${l}</h2><p>${long || d}</p></div>${lock === "owner" && ownOpen ? '<button class="mini" data-a="hs_ownlock">Lock</button>' : ""}</header>`;
}

// ---------------------------------------------------------------- logos
const LOGO_FITS = [
  ["contain", "Fit the whole logo"],
  ["cover", "Fill and crop"],
  ["fill", "Stretch"]
];
const logos = () => FD_SETTINGS.logos || (FD_SETTINGS.logos = {});
function logoCard(k, title, note) {
  const src = logos()[k];
  return `<section class="set-logo"><div class="set-logo-box">${src ? `<img src="${esc(src)}" alt="${title}" style="object-fit:contain">` : "<span>No logo yet</span>"}</div><div><h5>${title}</h5><p>${note}</p><div class="set-logo-acts"><label class="mini set-file">${src ? "Change logo" : "Upload logo"}<input type="file" accept="image/png,image/jpeg,image/webp" data-setc="logo" data-k="${k}"></label>${src ? `<button class="mini" data-a="hs_logorm" data-k="${k}">Remove</button>` : ""}</div></div></section>`;
}
function logosHTML() {
  const fit = logos().fit || "contain";
  return `<div class="pn"><h4>Logos</h4><div class="stk">PNG, JPG or WEBP, up to 5 MB. A plain black logo on white prints best on receipt paper.</div>
  <div class="set-logos">${logoCard("company", "Company logo", "Shows on the POS sign-in and sale screens.")}${logoCard("receipt", "Receipt logo", "Prints at the top of guest bills and receipts.")}</div>
  <div class="set-fit"><span>Receipt logo sizing</span>${LOGO_FITS.map(([v, l]) => `<label><input type="radio" name="logoFit" data-setc="fit" value="${v}" ${fit === v ? "checked" : ""}> ${l}</label>`).join("")}</div></div>`;
}
const logoImage = url =>
  new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = no;
    i.src = url;
  });
/** The picture's draw position inside a W by H box, for each sizing choice. */
function logoDraw(ctx, img, W, H, fit) {
  if (fit === "fill") return ctx.drawImage(img, 0, 0, W, H);
  const s = (fit === "cover" ? Math.max : Math.min)(W / img.width, H / img.height),
    w = img.width * s,
    h = img.height * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}
/** Black and white dots for receipt printers, with the empty rows above and below taken off. */
async function logoRaster(url, fit) {
  const img = await logoImage(url),
    W = 240,
    H = 100,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, W, H);
  logoDraw(x, img, W, H, fit);
  const px = x.getImageData(0, 0, W, H).data,
    rowBytes = W / 8,
    rows = [];
  for (let r = 0; r < H; r++) {
    const row = new Uint8Array(rowBytes);
    let ink = false;
    for (let col = 0; col < W; col++) {
      const i = (r * W + col) * 4;
      if (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2] < 128) {
        row[col >> 3] |= 0x80 >> (col & 7);
        ink = true;
      }
    }
    rows.push({ row, ink });
  }
  const first = rows.findIndex(r => r.ink),
    last = rows.map(r => r.ink).lastIndexOf(true);
  if (first < 0) return null;
  const keep = rows.slice(first, last + 1);
  let bin = "";
  keep.forEach(r => r.row.forEach(b => (bin += String.fromCharCode(b))));
  return { w: rowBytes, h: keep.length, data: btoa(bin) };
}
/** Saved logos are drawn again smaller, so a large photo can't fill the browser's storage. */
async function logoUpload(input) {
  const f = input.files[0],
    k = input.dataset.k;
  if (!f) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(f.type))
    return toast("Choose a PNG, JPG or WEBP picture.");
  if (f.size > 5 * 1024 * 1024) return toast("That picture is over 5 MB.");
  let img;
  const url = URL.createObjectURL(f);
  try {
    img = await logoImage(url);
  } catch (e) {
    return toast("That picture could not be opened.");
  } finally {
    URL.revokeObjectURL(url);
  }
  const s = Math.min(1, 600 / img.width, 300 / img.height),
    c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * s));
  c.height = Math.max(1, Math.round(img.height * s));
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0, c.width, c.height);
  let out = c.toDataURL("image/png");
  if (out.length > 300000) {
    x.globalCompositeOperation = "destination-over";
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", 0.85);
  }
  logos()[k] = out;
  if (k === "receipt") logos().raster = await logoRaster(out, logos().fit || "contain");
  bosave();
  fdBrand();
  toast(k === "receipt" ? "Receipt logo saved." : "Company logo saved.");
  all();
}

// ---------------------------------------------------------------- payment methods on guest bills
const payMethods = () => FD_SETTINGS.billPay || (FD_SETTINGS.billPay = []);
const payPointName = pt => (pt === "*" ? "All sale points" : pt);
function payMethodsHTML() {
  const F = invF.gp,
    L = payMethods();
  return `<div class="pn"><h4>Payment methods on guest bills</h4><div class="stk">Printed in bold at the foot of the guest bill. A sale point's own methods print together with those set for all sale points. Without any, the bill shows the till number from Hotel and logos.</div>
  <div class="fr set-pm-form" style="align-items:end"><label>Sale point<select data-iv="gp.pt"><option value="*" ${F.pt === "*" ? "selected" : ""}>All sale points</option>${ALLD.filter(
    posSells
  )
    .map(p => `<option ${F.pt === p ? "selected" : ""}>${esc(p)}</option>`)
    .join(
      ""
    )}</select></label><label>Method<input data-iv="gp.m" list="gpL" maxlength="30" value="${esc(F.m)}" placeholder="e.g. M-PESA TILL" autocomplete="off"><datalist id="gpL"><option value="M-PESA TILL"><option value="M-PESA PAYBILL"><option value="BANK"><option value="CARD / PDQ"></datalist></label><label>Number<input data-iv="gp.v" maxlength="40" value="${esc(F.v)}" placeholder="e.g. 4565515" autocomplete="off"></label><label>Account name (optional)<input data-iv="gp.a" maxlength="40" value="${esc(F.a)}" placeholder="e.g. Noble Tide" autocomplete="off"></label><button class="chip on" style="flex:none" data-a="hs_payadd">Add method</button></div>
  ${
    L.length
      ? `<div class="tw"><table class="t set-pm"><tr><th>Sale point</th><th>Method</th><th>Number</th><th>Account name</th><th></th></tr>${L.map(
          (x, i) =>
            `<tr><td>${esc(payPointName(x.pt))}</td><td><b>${esc(x.m)}</b></td><td><b>${esc(x.v)}</b></td><td>${esc(x.a || "–")}</td><td><button class="mini" data-a="hs_paydel" data-i="${i}" aria-label="Delete ${esc(x.m)}">Delete</button></td></tr>`
        ).join("")}</table></div>`
      : '<div class="empty">No payment methods yet.</div>'
  }</div>`;
}

// ---------------------------------------------------------------- the system day
function dayTimeHTML() {
  const T = dayTimes(),
    d = curDay();
  return `<div class="pn"><h4>Working day</h4><div class="stk">The date stays the same through midnight. When the day's time is up, nobody can sell until the bills are cleared and the day is ended. The day can also be ended earlier, once the bills are cleared. The date changes as soon as the day ends.${d ? ` The current day ends ${esc(dayEndText(d))}.` : ""}</div>
  <div class="fr" style="align-items:end"><label>Day starts at<input id="dayS" type="time" value="${esc(T.start)}"></label><label>Day ends at<input id="dayE" type="time" value="${esc(T.end)}"></label><button class="chip on" style="flex:none" data-a="hs_daytime">Save times</button></div></div>`;
}

// ---------------------------------------------------------------- options
const OPT_BILLS = [
  ["showLogo", "Show the logo on bills and receipts"],
  ["ordNoBill", "Show order numbers on bills"],
  ["taxBill", "Show tax on bills"],
  ["taxRcpt", "Show tax on receipts", "A tax receipt normally needs this on."],
  ["signBill", "Guest signature on bills"],
  ["signRcpt", "Guest signature on every receipt", "Credit receipts always have one."],
  ["waiterFoot", "Show the waiter's footer on bills"]
];
const OPT_POS = [
  [
    "stopPrinted",
    "Stop adding items to a printed bill",
    "Staff with the add-to-printed right still can."
  ],
  ["mustSend", "Must send the order before printing the bill"],
  ["pricesOnOrders", "Show prices on kitchen and bar orders"],
  ["orderAndBill", "Print the order and the bill at once"],
  ["autoLogout", "Sign the waiter out after each order"],
  ["chefMsg", "Allow a kitchen message on orders"],
  ["tips", "Show the tip column when settling"],
  [
    "boWaiterShift",
    "Back Office can start waiter shifts",
    "Their shift also opens by itself when they sign in."
  ]
];
const optsHTML = (title, note, L) =>
  `<div class="pn"><h4>${title}</h4><div class="stk">${note}</div><div class="set-opts">${L.map(
    ([k, l, hint]) =>
      `<label class="set-opt"><input type="checkbox" data-setc="opt" data-k="${k}" ${posOpt(k) ? "checked" : ""}><span>${l}${hint ? `<small>${hint}</small>` : ""}</span></label>`
  ).join("")}</div></div>`;

// ---------------------------------------------------------------- clicks and changes
async function settingsChange(t) {
  const kind = t.dataset.setc;
  if (kind === "logo") return logoUpload(t);
  if (kind === "opt") {
    FD_SETTINGS.opts = { ...(FD_SETTINGS.opts || {}), [t.dataset.k]: t.checked };
    posOptsApply();
    bosave();
    return toast("Saved.");
  }
  if (kind === "fit") {
    logos().fit = t.value;
    if (logos().receipt) logos().raster = await logoRaster(logos().receipt, t.value);
    bosave();
    toast("Saved.");
  }
}
function generalAct(a, b) {
  if (a === "daytime") {
    const start = $("#dayS").value,
      end = $("#dayE").value;
    if (!start || !end) return toast("Enter both times.");
    FD_SETTINGS.dayTime = { start, end };
    bosave();
    auditAdd("Settings", `Working day set to ${start} to ${end}`, { pri: "Important" });
    toast("Saved. The working day runs " + start + " to " + end + ".");
    return all();
  }
  if (a === "tab") {
    mdlLock();
    setTab = b.dataset.k;
    return all();
  }
  if (a === "logorm") {
    delete logos()[b.dataset.k];
    if (b.dataset.k === "receipt") delete logos().raster;
    bosave();
    fdBrand();
    toast("Logo removed.");
    return all();
  }
  if (a === "payadd") {
    const F = invF.gp,
      m = F.m.trim(),
      v = F.v.trim();
    if (!m) return toast("Enter the payment method, such as M-PESA TILL.");
    if (!v) return toast("Enter the number the guest pays to.");
    if (payMethods().some(x => x.pt === F.pt && x.m === m && x.v === v))
      return toast("That method is already on the list.");
    payMethods().push({ pt: F.pt, m, v, a: F.a.trim() });
    invF.gp = { pt: F.pt, m: "", v: "", a: "" };
    bosave();
    toast(`${m} added.`);
    return all();
  }
  if (a === "paydel") {
    payMethods().splice(+b.dataset.i, 1);
    bosave();
    toast("Payment method deleted.");
    return all();
  }
}

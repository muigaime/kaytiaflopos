// ---- Settings: the hotel details printed on guest bills and receipts ----
invF.hs = {
  name: FD_SETTINGS.name,
  pl: (FD_SETTINGS.priceLists || []).map(p => `${p.n} = ${p.pct}`).join("\n"),
  cur: (FD_SETTINGS.currencies || []).map(c => `${c.c} = ${c.rate}`).join("\n"),
  printers: (FD_SETTINGS.printers || []).map(p => `${p.n} = ${p.ip}:${p.port}`).join("\n"),
  printUrl: FD_SETTINGS.printUrl || "",
  printKey: FD_SETTINGS.printKey || ""
};
// Which printer each sale point's kitchen and bar tickets go to. Dots can't be in these field keys.
const routeKey = (point, st) => encodeURIComponent(point).replace(/\./g, "%2E") + "|" + st;
invF.hsr = {};
Object.entries(FD_SETTINGS.printRoutes || {}).forEach(([pt, r]) => {
  invF.hsr[routeKey(pt, "kitchen")] = r.kitchen || "";
  invF.hsr[routeKey(pt, "bar")] = r.bar || "";
});
function printersHTML() {
  const L = FD_SETTINGS.printers || [],
    sel = (pt, st) =>
      `<select data-iv="hsr.${routeKey(pt, st)}"><option value="">Print by hand</option>${L.map(p => `<option ${invF.hsr[routeKey(pt, st)] === p.n ? "selected" : ""}>${esc(p.n)}</option>`).join("")}</select>`;
  return `<div class="pn"><h4>Printers</h4><div class="stk">Orders go straight to these printers when they are sent. Network printers only (they have an IP address, normally port 9100).</div>
  <div class="fr"><label>Printers, one per line: name = address<textarea data-iv="hs.printers" rows="4" placeholder="Kitchen = 192.168.1.50">${esc(invF.hs.printers)}</textarea></label><div style="display:grid;gap:6px;align-content:start">${L.map((p, i) => `<button class="mini" data-a="hs_test" data-i="${i}">Test ${esc(p.n)}</button>`).join("") || '<span class="stk">Save printers to test them and choose them below.</span>'}</div></div>
  ${
    L.length
      ? `<div class="tw"><table class="t"><tr><th>Sale point</th><th>Kitchen orders print on</th><th>Bar orders print on</th></tr>${ALLD.filter(
          posSells
        )
          .map(
            pt =>
              `<tr><td>${esc(pt)}</td><td>${sel(pt, "kitchen")}</td><td>${sel(pt, "bar")}</td></tr>`
          )
          .join("")}</table></div>`
      : ""
  }
  <details><summary class="stk">Other terminals</summary><div class="fr"><label>Print server<input data-iv="hs.printUrl" value="${esc(invF.hs.printUrl)}" placeholder="http://${esc(location.hostname || "localhost")}:4000"></label><label>Print key (PRINT_KEY on the server)<input type="password" autocomplete="off" data-iv="hs.printKey" value="${esc(invF.hs.printKey)}"></label></div></details>
  <div class="fr" style="justify-content:flex-end"><button class="chip on" style="flex:none" data-a="hs_save">Save printers</button></div></div>`;
}
const SET_SAMPLE = {
  no: "01042",
  ord: 12,
  dept: "Main Restaurant",
  label: "T4",
  covers: "2",
  waiter: "Waiter name",
  guest: "",
  room: "",
  lines: [
    { q: 1, n: "Grilled Tilapia", p: 1450, t: "B" },
    { q: 2, n: "Dawa Cocktail", p: 850, t: "B" }
  ],
  t: { net: 2706.9, tax: 443.1, g: 3150 }
};
const setDraft = () => ({ ...invF.vh, name: invF.hs.name });
function settingsPreviewHTML() {
  const B = setDraft();
  return (
    guestBillHTML(SET_SAMPLE, B) +
    receiptHTML(
      {
        ...SET_SAMPLE,
        paid: slipRow("Cash", bill2(3200)),
        change: 50,
        fiscal: "CU details and the eTIMS QR print here"
      },
      B
    ) +
    orderSlipHTML("Kitchen", {
      ...SET_SAMPLE,
      lines: [{ q: 1, n: "Grilled Tilapia" }],
      note: "No chilli"
    }) +
    orderSlipHTML("Bar", { ...SET_SAMPLE, lines: [{ q: 2, n: "Dawa Cocktail" }] })
  );
}
/** Update the samples while typing (no redraw, so the cursor stays put). */
function settingsPreview() {
  const el = $("#setPrev");
  if (el) el.innerHTML = settingsPreviewHTML();
}
V.settings = () => {
  const H = invF.vh,
    f = (l, k, ph = "") =>
      `<label>${l}<input data-iv="vh.${k}" value="${esc(H[k] || "")}" placeholder="${ph}"></label>`;
  return `<div class="pn"><h4>Bills and receipts</h4><div class="stk">Printed at the top of every guest bill and receipt. Kitchen and bar orders carry no hotel details.</div>
  <div class="fr"><label>Hotel name<input data-iv="hs.name" value="${esc(invF.hs.name)}"></label>${f("Postal address", "addr", "e.g. P.O. Box 123-80100, Mombasa")}${f("Email", "email")}</div>
  <div class="fr">${f("Telephone", "phone")}${f("KRA PIN", "pin")}${f("Till number", "till", "e.g. 4565515-NOBLE TIDE")}</div>
  <div class="fr">${f("Website", "web")}${f("Thank-you line on receipts", "thanks", "Thank you for dining with us.")}<button class="chip on" style="flex:none;align-self:end" data-a="hs_save">Save details</button></div></div>
 ${printersHTML()}
 <div class="set-prev" id="setPrev">${settingsPreviewHTML()}</div>`;
};
async function settingsAct(a, b) {
  if (a === "test") {
    const p = FD_SETTINGS.printers[+b.dataset.i];
    toast("Testing " + p.n + "…");
    const err = await printTicket(p, [
      { t: "TEST TICKET", big: true, bold: true, center: true },
      { t: p.n, center: true },
      { t: slipNow(), center: true }
    ]);
    return toast(err ? p.n + ": " + err : p.n + " printed.");
  }
  if (a !== "save") return;
  const name = invF.hs.name.trim();
  if (!name) return toast("Enter the hotel name.");
  const lines = s =>
      s
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean),
    priceLists = [],
    currencies = [];
  for (const l of lines(invF.hs.pl)) {
    const m = l.match(/^(.+?)\s*=\s*([+-]?\d+(?:\.\d+)?)\s*%?$/);
    if (!m || +m[2] <= -100) return toast(`Price list "${l}" should look like Happy Hour = -20`);
    priceLists.push({ n: m[1], pct: +m[2] });
  }
  for (const l of lines(invF.hs.cur)) {
    const m = l.match(/^([A-Za-z]{3})\s*=\s*(\d+(?:\.\d+)?)$/);
    if (!m || !(+m[2] > 0)) return toast(`Currency "${l}" should look like USD = 130`);
    currencies.push({ c: m[1].toUpperCase(), rate: +m[2] });
  }
  const printers = [];
  for (const l of lines(invF.hs.printers)) {
    const m = l.match(/^(.+?)\s*=\s*(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?$/),
      port = m ? +(m[3] || 9100) : 0;
    if (!m || port < 9100 || port > 9109)
      return toast(`Printer "${l}" should look like Kitchen = 192.168.1.50`);
    if (printers.some(p => p.n.toLowerCase() === m[1].toLowerCase()))
      return toast(`There are two printers called ${m[1]}.`);
    printers.push({ n: m[1], ip: m[2], port });
  }
  FD_SETTINGS.printers = printers;
  FD_SETTINGS.printRoutes = Object.fromEntries(
    ALLD.filter(posSells).map(pt => [
      pt,
      { kitchen: invF.hsr[routeKey(pt, "kitchen")] || "", bar: invF.hsr[routeKey(pt, "bar")] || "" }
    ])
  );
  FD_SETTINGS.printUrl = invF.hs.printUrl.trim();
  FD_SETTINGS.printKey = invF.hs.printKey.trim();
  FD_SETTINGS.priceLists = priceLists;
  FD_SETTINGS.currencies = currencies;
  FD_SETTINGS.name = name;
  FD_SETTINGS.biz = Object.fromEntries(
    Object.entries(invF.vh).map(([k, x]) => [k, String(x).trim()])
  );
  fdBrand();
  bosave();
  toast("Details saved. New bills and receipts will use them.");
  all();
}

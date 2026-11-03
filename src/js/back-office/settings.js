// ---- Settings: the hotel details printed on guest bills and receipts ----
invF.hs = {
  name: FD_SETTINGS.name,
  pl: (FD_SETTINGS.priceLists || []).map(p => `${p.n} = ${p.pct}`).join("\n"),
  cur: (FD_SETTINGS.currencies || []).map(c => `${c.c} = ${c.rate}`).join("\n"),
  printers: (FD_SETTINGS.printers || []).map(p => `${p.n} = ${p.ip}:${p.port}`).join("\n"),
  printUrl: FD_SETTINGS.printUrl || "",
  printKey: FD_SETTINGS.printKey || "",
  taxB: String(TAX.B),
  taxC: String(TAX.C)
};
function printersHTML() {
  const L = FD_SETTINGS.printers || [];
  return `<div class="pn"><details class="psu-net"><summary><h4>Network printers and print server</h4><span class="stk">Only for printers with their own IP address, or terminals that print through another computer.</span></summary>
  <div class="fr"><label>Printers, one per line: name = address<textarea data-iv="hs.printers" rows="4" placeholder="Kitchen = 192.168.1.50">${esc(invF.hs.printers)}</textarea></label><div style="display:grid;gap:6px;align-content:start">${L.map((p, i) => `<button class="mini" data-a="hs_test" data-i="${i}">Test ${esc(p.n)}</button>`).join("")}</div></div>
  <div class="fr"><label>Print server<input data-iv="hs.printUrl" value="${esc(invF.hs.printUrl)}" placeholder="http://${esc(location.hostname || "localhost")}:4000"></label><label>Print key (PRINT_KEY on the server)<input type="password" autocomplete="off" data-iv="hs.printKey" value="${esc(invF.hs.printKey)}"></label></div>
  <div class="fr" style="justify-content:flex-end"><button class="chip on" style="flex:none" data-a="hs_save">Save network printers</button></div></details></div>`;
}
V.settings = () => {
  const H = invF.vh,
    f = (l, k, ph = "") =>
      `<label>${l}<input data-iv="vh.${k}" value="${esc(H[k] || "")}" placeholder="${ph}"></label>`;
  const panels = {
    hotel:
      () => `<div class="pn"><h4>Hotel details</h4><div class="stk">Printed at the top of every guest bill and receipt. Kitchen and bar orders carry no hotel details.</div>
  <div class="fr"><label>Hotel name<input data-iv="hs.name" value="${esc(invF.hs.name)}"></label>${f("Postal address", "addr", "e.g. P.O. Box 123-80100, Mombasa")}${f("Email", "email")}</div>
  <div class="fr">${f("Telephone", "phone")}${f("KRA PIN", "pin")}${f("Till number", "till", "e.g. 4565515-NOBLE TIDE")}</div>
  <div class="fr">${f("Website", "web")}${f("Thank-you line on receipts", "thanks", "Thank you for dining with us.")}<button class="chip on" style="flex:none;align-self:end" data-a="hs_save">Save details</button></div></div>
 ${logosHTML()}`,
    bills: () =>
      payMethodsHTML() +
      optsHTML(
        "Bill and receipt options",
        "These apply to every guest bill and receipt from now on.",
        OPT_BILLS
      ),
    pos: () =>
      dayTimeHTML() +
      optsHTML("POS options", "These apply to every waiter and cashier straight away.", OPT_POS),
    tax: () => `<div class="pn"><h4>Tax setup</h4><div class="stk">Menu prices include tax. Each item is set to VAT, Tax C, both or no tax when it's created. A new rate applies to bills paid from now on, and past reports keep the rate they were paid at.</div>
  <div class="fr" style="align-items:end"><label>VAT (%)<input data-iv="hs.taxB" inputmode="decimal" value="${esc(invF.hs.taxB)}"></label><label>Tax C (%)<input data-iv="hs.taxC" inputmode="decimal" value="${esc(invF.hs.taxC)}"></label><button class="chip on" style="flex:none" data-a="hs_tax">Save tax rates</button></div></div>`,
    paymodes: payModesHTML,
    voids: voidReasonsHTML,
    cats: categoriesHTML,
    printers: () => machinesHTML() + printerSetupHTML() + printersHTML(),
    backup: backupHTML,
    network: networkHTML
  };
  return setTabsHTML() + panels[setTab]();
};
function taxSave() {
  const B = parseFloat(invF.hs.taxB),
    C = parseFloat(invF.hs.taxC);
  if (!(B >= 0 && B <= 100) || !(C >= 0 && C <= 100))
    return toast("Tax rates should be between 0 and 100.");
  FD_SETTINGS.tax = { B, C };
  taxApply();
  bosave();
  toast("Tax rates saved. New bills will use them.");
  all();
}
async function settingsAct(a, b) {
  if (a === "tax") return taxSave();
  if (["tab", "logorm", "payadd", "paydel", "daytime"].includes(a)) return generalAct(a, b);
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
  auditAdd("Settings", "Hotel and receipt details changed");
  toast("Details saved. New bills and receipts will use them.");
  all();
}

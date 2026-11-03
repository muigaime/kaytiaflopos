// ---- Settings: registered machines, and which printer takes this computer's orders, bills and receipts ----
const PSU_ORDER = ["KITCHEN ORDER", "BAR ORDER"];
const PSU_DOCS = [...PSU_ORDER, "GUEST BILL", ...ONE_PRINTER_DOCS];
const psuPoints = () => ALLD.filter(posSells);
const PSU_ALL = "All sale points";
const psuRules = () => FD_SETTINGS.printRules || (FD_SETTINGS.printRules = []);
// What's on screen, by document and sale point. Nothing is kept until Save printer setup.
let psuD = null;
// The computer's printers: undefined until asked, null while asking.
let psuInst;
let psuErr = "";
const psuKey = (doc, pt) => doc + "|" + pt;
function psuDraft() {
  if (psuD) return psuD;
  psuD = {};
  const routes = FD_SETTINGS.printRoutes || {};
  PSU_DOCS.forEach(doc =>
    (ONE_PRINTER_DOCS.includes(doc) ? [PSU_ALL] : psuPoints()).forEach(pt => {
      const r = docRule(doc, pt),
        old =
          PSU_ORDER.includes(doc) && (routes[pt] || {})[doc === "BAR ORDER" ? "bar" : "kitchen"];
      psuD[psuKey(doc, pt)] = r
        ? { printer: r.kind + "|" + r.printer, copies: r.copies, paper: r.paper }
        : { printer: old ? "net|" + old : "", copies: 1, paper: "80mm" };
    })
  );
  return psuD;
}
async function psuLoad() {
  psuInst = null;
  psuErr = "";
  const r = await installedPrinters();
  psuInst = r.list;
  psuErr = r.err;
  if (document.querySelector(".psu-card")) all();
}
function psuPrinterOpts(on) {
  const inst = psuInst || [],
    net = (FD_SETTINGS.printers || []).map(p => p.n),
    opt = (kind, n) =>
      `<option value="${esc(kind + "|" + n)}" ${on === kind + "|" + n ? "selected" : ""}>${esc(n)}</option>`,
    known = inst.map(n => "win|" + n).concat(net.map(n => "net|" + n)),
    // A saved printer that isn't here now stays visible, so saving doesn't lose it without a word.
    lost =
      on && !known.includes(on)
        ? `<option value="${esc(on)}" selected>${esc(on.slice(4))}${psuErr || psuInst === null ? "" : " (not found)"}</option>`
        : "";
  return `<option value="">Print by hand</option>${lost}${inst.length ? `<optgroup label="Installed on this computer">${inst.map(n => opt("win", n)).join("")}</optgroup>` : ""}${net.length ? `<optgroup label="Network printers">${net.map(n => opt("net", n)).join("")}</optgroup>` : ""}`;
}
const psuAttr = (field, docs, pt) =>
  `data-psx="${field}" data-docs="${esc(docs.join(","))}" data-pt="${esc(pt)}" aria-label="${field} for ${esc(pt)}"`;
function psuRow(pt, printers) {
  const D = psuDraft(),
    docs = printers.map(p => p[0]),
    first = D[psuKey(docs[0], pt)],
    none = docs.every(d => !D[psuKey(d, pt)].printer),
    dis = none ? "disabled" : "";
  return `<tr><th scope="row">${esc(pt)}</th>${docs.map(d => `<td><select ${psuAttr("printer", [d], pt)}>${psuPrinterOpts(D[psuKey(d, pt)].printer)}</select></td>`).join("")}
  <td class="psu-s"><select ${psuAttr("paper", docs, pt)} ${dis}>${["80mm", "58mm"].map(x => `<option ${first.paper === x ? "selected" : ""}>${x}</option>`).join("")}</select></td>
  <td class="psu-s"><select ${psuAttr("copies", docs, pt)} ${dis}>${[1, 2, 3, 4, 5].map(x => `<option ${first.copies === x ? "selected" : ""}>${x}</option>`).join("")}</select></td>
  <td class="psu-s"><button class="mini" data-a="psu_test" data-docs="${esc(docs.join(","))}" data-pt="${esc(pt)}" ${dis}>Test</button></td></tr>`;
}
function psuCard(title, note, printers, P = psuPoints()) {
  return `<section class="psu-card"><header><h5>${title}</h5><p>${note}</p></header>${
    P.length
      ? `<div class="tw"><table class="t psu-t"><thead><tr><th>Sale point</th>${printers.map(p => `<th>${p[1]}</th>`).join("")}<th class="psu-s">Paper</th><th class="psu-s">Copies</th><th class="psu-s"></th></tr></thead><tbody>${P.map(pt => psuRow(pt, printers)).join("")}</tbody></table></div>`
      : '<div class="empty">No sale points yet. Add one under Selling points.</div>'
  }</section>`;
}
function machinesHTML() {
  const me = MACHINE.name();
  return `<div class="pn"><h4>Machines</h4><div class="stk">This computer is registered as <b>${esc(me)}</b>.</div>
  <div class="mac-list">${MACHINE.list()
    .map(
      (m, i) =>
        `<span class="mac-chip ${m.n === me ? "me" : ""}">${esc(m.n)}${m.n === me ? " <small>This computer</small>" : `<button class="mini" data-a="psu_use" data-i="${i}">Use here</button><button class="mini" data-a="psu_mdel" data-i="${i}" aria-label="Delete ${esc(m.n)}">Delete</button>`}</span>`
    )
    .join("")}</div>
  <div class="fr" style="align-items:end"><label>Machine name<input id="psuM" maxlength="30" placeholder="e.g. Waiter5" autocomplete="off"></label><button class="chip on" style="flex:none" data-a="psu_madd">Add machine</button></div></div>`;
}
function printerSetupHTML() {
  if (psuInst === undefined) psuLoad();
  const n = (psuInst || []).length,
    status =
      psuInst === null
        ? "Looking for printers on this computer…"
        : psuErr
          ? `<b class="psu-bad">${esc(psuErr)}</b>`
          : n
            ? `${plural(n, "printer")} found on this computer.`
            : "No printers found on this computer.";
  return `<div class="pn psu"><div class="psu-head"><div><h4>Printer setup</h4><div class="stk">Printers for <b>${esc(MACHINE.name())}</b>. ${status}</div></div><div class="psu-acts"><button class="mini" data-a="psu_refresh">Refresh printers</button><button class="chip on" data-a="psu_save">Save printer setup</button></div></div>
  ${psuCard(
    "Orders",
    "Print when a waiter sends an order. Items go to the kitchen or bar of their own sale point. Void alerts follow the same printers.",
    [
      ["KITCHEN ORDER", "Kitchen printer"],
      ["BAR ORDER", "Bar printer"]
    ]
  )}
  ${psuCard("Bills", "Print when a waiter prints a guest bill. A bill with items from several sale points uses its first sale point.", [["GUEST BILL", "Bill printer"]])}
  ${psuCard("Receipts", "Print when a bill is settled. One printer takes the receipts from every sale point.", [["RECEIPT", "Receipt printer"]], [PSU_ALL])}
  ${psuCard(
    "Stores",
    "Requisitions and issue notes print here when you press Thermal print. With no printer chosen, the print dialog opens instead.",
    [
      ["REQUISITION", "Requisition printer"],
      ["ISSUE NOTE", "Issue note printer"]
    ],
    [PSU_ALL]
  )}</div>`;
}
/** A box on the setup changed. Only a new printer changes what else is on the row. */
function psuChange(el) {
  const f = el.dataset.psx;
  el.dataset.docs.split(",").forEach(d => {
    psuDraft()[psuKey(d, el.dataset.pt)][f] = f === "copies" ? +el.value : el.value;
  });
  if (f === "printer") all();
}
const psuPrinter = v =>
  v.startsWith("win|") ? { n: v.slice(4), win: true } : printerNamed(v.slice(4));
async function psuTest(b) {
  const D = psuDraft(),
    picks = [
      ...new Set(
        b.dataset.docs
          .split(",")
          .map(d => D[psuKey(d, b.dataset.pt)].printer)
          .filter(Boolean)
      )
    ];
  for (const v of picks) {
    const p = psuPrinter(v),
      name = v.slice(4);
    if (!p) {
      toast(`${name} is not on the printer list.`);
      continue;
    }
    toast("Testing " + name + "…");
    const err = await printTicket(p, [
      { t: "TEST TICKET", big: true, bold: true, center: true },
      { t: b.dataset.pt, center: true },
      { t: name, center: true },
      { t: slipNow(), center: true }
    ]);
    toast(err ? name + ": " + err : name + " printed.");
  }
}
function psuAct(a, b) {
  if (!boCan("set.manage")) return boDenied();
  const M = MACHINE.list(),
    done = msg => {
      bosave();
      toast(msg);
      all();
    };
  if (a === "psu_refresh") {
    psuLoad();
    return all();
  }
  if (a === "psu_test") return psuTest(b);
  if (a === "psu_save") {
    const me = MACHINE.name(),
      D = psuDraft();
    FD_SETTINGS.printRules = psuRules()
      .filter(r => r.src !== me)
      .concat(
        Object.entries(D)
          .filter(([, x]) => x.printer)
          .map(([k, x]) => {
            const [doc, point] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)];
            return {
              src: me,
              doc,
              point,
              kind: x.printer.slice(0, 3),
              printer: x.printer.slice(4),
              copies: x.copies,
              paper: x.paper
            };
          })
      );
    // The old sale point table is part of this setup now.
    FD_SETTINGS.printRoutes = {};
    psuD = null;
    return done("Printer setup saved.");
  }
  if (a === "psu_madd") {
    const n = MACHINE.clean($("#psuM").value),
      err = MACHINE.problem(n);
    if (err) return toast(err);
    if (M.some(m => m.n.toLowerCase() === n.toLowerCase()))
      return toast(`${n} is already on the list.`);
    MACHINE.add(n);
    return done(`${n} added.`);
  }
  const m = M[+b.dataset.i];
  if (!m) return;
  if (a === "psu_use") {
    MACHINE.use(m.n);
    psuD = null;
    return done(`This computer is now ${m.n}.`);
  }
  if (a === "psu_mdel") {
    if (psuRules().some(r => r.src === m.n))
      return toast(`${m.n} has a printer setup. Open it on that computer and clear it first.`);
    M.splice(+b.dataset.i, 1);
    return done(`${m.n} deleted.`);
  }
}

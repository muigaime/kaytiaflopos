// ---- sending tickets to their own printers, through the master server ----
// A browser cannot choose a printer without its print dialog, so tickets go to POST /api/print/ticket,
// which talks to the network printer. If that fails the slip stays on screen to print by hand.
const printServer = () =>
  (FD_SETTINGS.printUrl || `http://${location.hostname || "localhost"}:4000`).replace(/\/$/, "");
/** This machine's printer for a document at a sale point, from Settings → Printer setup. Receipts have one printer for all sale points. */
const docRule = (doc, point) =>
  (FD_SETTINGS.printRules || []).find(
    r => r.src === MACHINE.name() && r.doc === doc && (doc === "RECEIPT" || r.point === point)
  );
const printerNamed = name => (FD_SETTINGS.printers || []).find(p => p.n === name);
const rulePrinter = r => (r.kind === "win" ? { n: r.printer, win: true } : printerNamed(r.printer));
const stationDoc = station => (station === "Bar" ? "BAR ORDER" : "KITCHEN ORDER");
/** Which printer takes a station's tickets for a sale point: the printer, or undefined. A machine's rule comes first. */
const stationPrinter = (point, station) => {
  const rule = docRule(stationDoc(station), point);
  if (rule) return rulePrinter(rule);
  const name = ((FD_SETTINGS.printRoutes || {})[point] || {})[
    station === "Bar" ? "bar" : "kitchen"
  ];
  return printerNamed(name);
};
async function printTicket(printer, lines) {
  const ctl = new AbortController(),
    t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(printServer() + "/api/print/ticket", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(FD_SETTINGS.printKey ? { "x-print-key": FD_SETTINGS.printKey } : {})
      },
      body: JSON.stringify({
        printer: printer.win ? { name: printer.n } : { ip: printer.ip, port: printer.port },
        lines: lines.map(l => ({ ...l, t: String(l.t).slice(0, 200) }))
      }),
      signal: ctl.signal
    });
    if (r.ok) return "";
    const e = await r.json().catch(() => ({}));
    return (e.error && e.error.message) || "The printer did not answer.";
  } catch (e) {
    return "The print server could not be reached.";
  } finally {
    clearTimeout(t);
  }
}
/** Every copy of one ticket, stopping at the first failure. Rules are drawn for the paper's width. */
async function printCopies(printer, lines, rule) {
  const w = rule && rule.paper === "58mm" ? 32 : 42,
    fit = lines.map(l => (/^-+$/.test(l.t) ? { ...l, t: "-".repeat(w) } : l));
  for (let i = 0; i < ((rule && rule.copies) || 1); i++) {
    const err = await printTicket(printer, fit);
    if (err) return err;
  }
  return "";
}
/** A slip on the screen as printer text. The eTIMS QR is left out: this text can't carry a picture. */
function slipToLines(slip, w) {
  const dash = { t: "-".repeat(w) },
    lr = (l, r, bold) => ({
      t: l + " ".repeat(Math.max(1, w - l.length - r.length)) + r,
      bold
    }),
    tx = n => n.textContent.trim();
  const walk = el =>
    [...el.children].flatMap(c => {
      const k = c.classList;
      if (k.contains("sl-crest") || k.contains("sl-orn")) return [];
      if (k.contains("sl-logo")) {
        const img = (FD_SETTINGS.logos || {}).raster;
        return img ? [{ t: "", img, center: true }] : [];
      }
      if (k.contains("sl-pay"))
        return [
          { t: "" },
          { t: tx(c.querySelector("h5")).toUpperCase(), bold: true, center: true },
          ...[...c.querySelectorAll(".sl-pm")].flatMap(m => [
            { t: tx(m.children[0]), bold: true, center: true },
            { t: tx(m.children[1]), big: true, bold: true, center: true },
            ...(m.children[2] ? [{ t: tx(m.children[2]), center: true }] : [])
          ])
        ];
      if (k.contains("sl-head")) return walk(c);
      if (k.contains("sl-name")) return [{ t: tx(c), big: true, bold: true, center: true }];
      if (k.contains("sl-title")) return [{ t: tx(c), bold: true, center: true }];
      if (k.contains("sl-stamp"))
        return [{ t: `*** ${tx(c).toUpperCase()} ***`, big: true, bold: true, center: true }];
      if (k.contains("sl-meta"))
        return [
          dash,
          ...[...c.children].map(x => ({ t: `${tx(x.children[0])}: ${tx(x.children[1])}` }))
        ];
      if (c.tagName === "TABLE")
        return [
          dash,
          ...[...c.rows]
            .slice(1)
            .map(r => lr(`${tx(r.cells[0])} x ${tx(r.cells[1])}`, tx(r.cells[3]))),
          dash
        ];
      if (k.contains("sl-tots") || k.contains("sl-paid")) return walk(c);
      if (k.contains("sl-total")) return [lr(tx(c.children[0]), tx(c.children[1]), true)];
      if (k.contains("sl-r") || k.contains("r")) return [lr(tx(c.children[0]), tx(c.children[1]))];
      if (c.tagName === "H5") return [{ t: "" }, { t: tx(c), bold: true }];
      if (k.contains("sl-sign"))
        return [{ t: "" }, ...[...c.children].map(x => ({ t: `${tx(x)}: ______________` }))];
      if (k.contains("sl-till"))
        return [{ t: `${tx(c.children[0])}: ${tx(c.children[1])}`, center: true }];
      if (k.contains("sl-fiscal"))
        return [...c.childNodes]
          .filter(n => n.nodeType === 3 && /^CU /.test(n.textContent))
          .map(n => ({ t: n.textContent.trim() }));
      return tx(c) ? [{ t: tx(c), center: true }] : [];
    });
  return walk(slip).map(l => ({ ...l, t: l.t.slice(0, 200) }));
}
/** The result of printing, on the popup. */
function printedNote(html, ok) {
  let box = $("#rcPrinted");
  if (!box) {
    box = document.createElement("div");
    box.id = "rcPrinted";
    $("#rc").appendChild(box);
  }
  box.innerHTML = html;
  box.className = "sl-scr " + (ok ? "ok" : "bad");
}
/** After a guest bill or receipt shows on the popup: each slip goes to its sale point's printer. */
async function printSlips(doc, keepNote) {
  const jobs = [];
  let last;
  document.querySelectorAll("#rc .slip").forEach(s => {
    // The summary after several bills belongs to no sale point, so it follows the receipt before it.
    const rule = s.dataset.pt ? docRule(doc, s.dataset.pt) : last;
    last = rule;
    if (rule) jobs.push({ s, rule });
  });
  if (!jobs.length) return;
  const word = doc === "RECEIPT" ? "Receipt" : "Guest bill",
    done = new Map(),
    box = keepNote && $("#rcPrinted"),
    // With the order on the same popup, its result stays above this one.
    before = box && box.innerHTML ? box.innerHTML + "<br>" : "",
    orderBad = !!box && box.classList.contains("bad");
  printedNote("Sending to the printer…", true);
  for (const { s, rule } of jobs) {
    const printer = rulePrinter(rule),
      err = printer
        ? await printCopies(printer, slipToLines(s, rule.paper === "58mm" ? 32 : 42), rule)
        : "It is not on the printer list.";
    if (!done.get(rule.printer)) done.set(rule.printer, err);
  }
  const R = [...done],
    bad = R.some(([, err]) => err);
  printedNote(
    before +
      R.map(
        ([n, err]) => `${word} → ${slipEsc(n)}: ${err ? "not printed. " + slipEsc(err) : "printed"}`
      ).join("<br>") +
      (bad ? "<br><b>Press Print to print it here instead.</b>" : ""),
    !bad && !orderBad
  );
}
/** The printers Windows has on the computer running the print server. */
async function installedPrinters() {
  const ctl = new AbortController(),
    t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(printServer() + "/api/print/installed", {
      headers: FD_SETTINGS.printKey ? { "x-print-key": FD_SETTINGS.printKey } : {},
      signal: ctl.signal
    });
    const e = await r.json().catch(() => ({}));
    return r.ok
      ? { list: e.printers || [], err: "" }
      : { list: [], err: (e.error && e.error.message) || "The print server did not answer." };
  } catch (e) {
    return {
      list: [],
      err: "The print server could not be reached. Start it on this computer, then press Refresh printers."
    };
  } finally {
    clearTimeout(t);
  }
}
/** The order ticket as printer text: same content as the slip, in plain type. */
function orderTicketLines(station, d) {
  const row = (l, v) => ({ t: `${l}: ${v === "" || v === undefined || v === null ? "-" : v}` });
  return [
    ...((d.swaps || []).length ? [{ t: "*** SWAP ***", big: true, bold: true, center: true }] : []),
    { t: `${station.toUpperCase()} ORDER`, big: true, bold: true, center: true },
    ...(d.round > 1 ? [{ t: `ROUND ${d.round}`, bold: true, center: true }] : []),
    { t: "" },
    row("Bill no", d.no),
    row("Order no", d.ord),
    row("Table", d.label),
    row("Covers", d.covers),
    row("Waiter", d.waiter),
    row("Guest", d.guest || "N/A"),
    row("Room", d.room),
    row("Date/time", slipNow()),
    ...(d.rider ? [row("Rider", `${d.rider.n} ${d.rider.p} ${d.rider.a}`)] : []),
    { t: "------------------------------------------" },
    ...d.lines.map(x => ({ t: `${x.q} x ${x.n}`, bold: true, big: true })),
    { t: "------------------------------------------" },
    ...(d.swaps || []).flatMap(s => [
      { t: `SWAPPED: ${swapText(s)}`, bold: true },
      { t: `Authorized by: ${s.by}` }
    ]),
    ...(d.note ? [{ t: `NOTE: ${d.note}`, bold: true }] : [])
  ];
}
/** A swap on a sent order, as printer text. */
function swapTicketLines(station, d) {
  const row = (l, v) => ({ t: `${l}: ${v || "-"}` });
  return [
    { t: "*** SWAP ***", big: true, bold: true, center: true },
    { t: `${station.toUpperCase()} ORDER CHANGE`, bold: true, center: true },
    { t: "" },
    row("Bill no", d.no),
    row("Order no", d.ord),
    row("Table", d.label),
    row("Waiter", d.waiter),
    row("Authorized by", d.by),
    row("Date/time", slipNow()),
    { t: "------------------------------------------" },
    { t: `REMOVE ${d.q} x ${d.from}`, bold: true, big: true },
    { t: `ADD ${d.q} x ${d.to}`, bold: true, big: true },
    { t: "------------------------------------------" },
    { t: `REASON: ${d.reason}`, bold: true }
  ];
}
/** The void alert as printer text. */
function voidTicketLines(station, d) {
  const row = (l, v) => ({ t: `${l}: ${v || "-"}` });
  return [
    { t: "*** VOID ALERT ***", big: true, bold: true, center: true },
    { t: `${station.toUpperCase()} - DO NOT PREPARE`, bold: true, center: true },
    { t: "" },
    row("Bill no", d.no),
    row("Order no", d.ord),
    row("Table", d.label),
    row("Waiter", d.waiter),
    row("Voided by", d.by),
    row("Guest", d.guest || "N/A"),
    row("Room", d.room),
    row("Date/time", slipNow()),
    { t: "------------------------------------------" },
    ...d.lines.map(x => ({ t: `VOID ${x.q} x ${x.n}`, bold: true, big: true })),
    { t: "------------------------------------------" },
    { t: `REASON: ${d.why}`, bold: true },
    ...(d.whole ? [{ t: "WHOLE BILL CANCELLED", bold: true, center: true }] : [])
  ];
}
/** After an order is sent or voided: each ticket to its printer, with the result shown on the popup. */
async function printOrderTickets(tickets, lines = orderTicketLines, word = "order") {
  const show = printedNote;
  const routed = tickets.filter(x => x.printer);
  if (!routed.length) return;
  show("Sending to the printers…", true);
  const R = await Promise.all(
    routed.map(async x => ({
      ...x,
      err: await printCopies(
        x.printer,
        lines(x.station, x.d),
        docRule(stationDoc(x.station), x.point)
      )
    }))
  );
  const bad = R.filter(x => x.err);
  // Print then gives only what didn't reach its printer, so the kitchen doesn't get a ticket twice.
  if (bad.length) {
    const slips = [...document.querySelectorAll("#rc .slip")];
    R.filter(x => !x.err).forEach(x =>
      slips[tickets.findIndex(y => y.d === x.d)].classList.add("sl-sent")
    );
  }
  show(
    R.map(
      x =>
        `${x.station} ${word} → ${slipEsc(x.printer.n)}: ${x.err ? "not printed. " + slipEsc(x.err) : "printed"}`
    ).join("<br>") + (bad.length ? "<br><b>Press Print to print it here instead.</b>" : ""),
    !bad.length
  );
}

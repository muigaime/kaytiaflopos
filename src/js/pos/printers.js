// ---- sending tickets to their own printers, through the master server ----
// A browser cannot choose a printer without its print dialog, so tickets go to POST /api/print/ticket,
// which talks to the network printer. If that fails the slip stays on screen to print by hand.
const printServer = () =>
  (FD_SETTINGS.printUrl || `http://${location.hostname || "localhost"}:4000`).replace(/\/$/, "");
/** Which printer takes a station's tickets for a sale point: the printer, or undefined. */
const stationPrinter = (point, station) => {
  const name = ((FD_SETTINGS.printRoutes || {})[point] || {})[
    station === "Bar" ? "bar" : "kitchen"
  ];
  return (FD_SETTINGS.printers || []).find(p => p.n === name);
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
      body: JSON.stringify({ printer: { ip: printer.ip, port: printer.port }, lines }),
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
/** The order ticket as printer text: same content as the slip, in plain type. */
function orderTicketLines(station, d) {
  const row = (l, v) => ({ t: `${l}: ${v === "" || v === undefined || v === null ? "-" : v}` });
  return [
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
    ...(d.note ? [{ t: `NOTE: ${d.note}`, bold: true }] : [])
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
  const box = $("#rcPrinted");
  const show = (html, ok) => {
    if (box) {
      box.innerHTML = html;
      box.className = "sl-scr " + (ok ? "ok" : "bad");
    }
  };
  const routed = tickets.filter(x => x.printer);
  if (!routed.length) return;
  show("Sending to the printers…", true);
  const R = await Promise.all(
    routed.map(async x => ({
      ...x,
      err: await printTicket(x.printer, lines(x.station, x.d))
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

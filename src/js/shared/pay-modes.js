// ---- Payment modes: the built-in ones can be turned off, and a business can add its own ----
const PAY_BUILT = [
  ["cash", "Cash", "Always on. Counted against the cashier's till."],
  ["mpesa", "M-Pesa", "Paid by code or a request to the guest's phone."],
  ["pdq", "PDQ", "Card payments, with the slip number."],
  ["comp", "Complimentary", "Free of charge. Needs a reason and a manager."],
  ["credit", "Post to account", "Charged to a customer's account."],
  ["room", "Post to room", "Charged to a guest's room."]
];
/** A business without rooms switches the Front Desk off in Settings → Modules. Its data stays. */
/** Kitchen display and staff clock: on unless switched off in Settings → Modules. */
const kdsOn = () => typeof FD_SETTINGS === "undefined" || !FD_SETTINGS.kdsOff;
/** Product stickers and the guest menu their QR codes open. */
const stkOn = () => typeof FD_SETTINGS === "undefined" || !FD_SETTINGS.stickersOff;
const clockOn = () => typeof FD_SETTINGS === "undefined" || !FD_SETTINGS.clockOff;
const fdOn = () => typeof FD_SETTINGS === "undefined" || !FD_SETTINGS.frontDeskOff;
const payCfg = () => {
  if (typeof FD_SETTINGS === "undefined") return { off: {}, custom: [] };
  return FD_SETTINGS.payModes || (FD_SETTINGS.payModes = { off: {}, custom: [] });
};
const payMine = () => payCfg().custom;
/** Bills sent to staff pay count as a payment mode, off the Settle rows, and on reports once there's one. */
const PAY_PAYROLL = { k: "payroll", n: "Staff payroll", on: false };
const payCustoms = () =>
  typeof FD_SETTINGS !== "undefined" &&
  ((FD_SETTINGS.hr || {}).charges || []).some(c => c.kind === "bill")
    ? [...payMine(), PAY_PAYROLL]
    : payMine();
const payCustomsOn = () => payCustoms().filter(c => c.on !== false);
const payModeOn = k => k === "cash" || ((k === "room" ? fdOn() : true) && !payCfg().off[k]);
function payName(k) {
  const b = PAY_BUILT.find(x => x[0] === k),
    c = payCustoms().find(x => x.k === k);
  return b ? b[1] : c ? c.n : k;
}
/** Sales taken by the modes a business added, for summaries. */
const payExtraRows = (a, row) =>
  payCustoms()
    .filter(c => a.some(s => (s.mx || {})[c.k]))
    .map(c =>
      row(
        c.n.toUpperCase(),
        a.reduce((x, s) => x + ((s.mx || {})[c.k] || 0), 0)
      )
    )
    .join("");
const payExtraSum = a =>
  payCustoms().reduce((t, c) => t + a.reduce((x, s) => x + ((s.mx || {})[c.k] || 0), 0), 0);

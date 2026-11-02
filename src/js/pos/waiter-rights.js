// ---- what a waiter may do on the POS, from Back Office → Waiter setup ----
// Staff saved before Waiter setup have no rights list, so nothing changes for them.
// Managers and Super Cashiers can always do everything.
const WAITER_RIGHTS = [
  [
    "Bills",
    [
      ["allBills", "Access All Bills", "See other waiters' bills"],
      ["create", "Create Bill", "Start a new bill or sale"],
      ["clear", "Clear Bill", "Settle bills and take payment"],
      ["addAll", "Add to All Bills", "Add items to other waiters' bills"],
      ["addPrinted", "Add to Printed Bill", "Add items after the bill is printed"],
      ["printGuest", "Print Guest Bill", "Print the bill for the guest"],
      ["interim", "Access Interim Bills", "Use Select to see pending bills"]
    ]
  ],
  [
    "Bill options",
    [
      ["functions", "Access Functions", "Open the Bill options dial"],
      ["disc", "Give Discount", "Without a manager's PIN"],
      ["void", "Void Bills", "Without a manager's PIN"],
      ["merge", "Merge Bills", "Without a manager's PIN"],
      ["split", "Split Bills", "Without a manager's PIN"]
    ]
  ],
  [
    "Orders and payment",
    [
      ["send", "Send Order", "Send orders to the kitchen and bar"],
      ["orderStatus", "Access Order Status", "Use the Open orders list"],
      ["postAccount", "Post to Account", "Charge a customer's credit account"]
    ]
  ],
  [
    "Menu",
    [
      ["stock", "View Stock Balance", "See how many are left on the menu"],
      ["switchSP", "Switch Sale Point", "Move between ticked sale points"]
    ]
  ]
];
/** Saved with the waiter, but no POS feature uses them yet. */
const WAITER_RIGHTS_LATER = [
  ["edit", "Edit Bills"],
  ["listUsers", "List User Names"],
  ["postRoom", "Post to Room"],
  ["preCancel", "Preorder Cancel"],
  ["pickPrice", "Pick Price List"],
  ["switchCur", "Switch Currency"],
  ["billMode", "Switch Billing Mode"]
];
const WAITER_DEFAULTS = [
  "create",
  "clear",
  "addPrinted",
  "printGuest",
  "interim",
  "functions",
  "send",
  "orderStatus",
  "stock",
  "switchSP"
];
const allowedAlways = u => !u || !u.perm || BILL_AUTH.includes(u.role);
const can = k => allowedAlways(user) || !!user.perm[k];
/** Bill options: a waiter with this right acts alone; anyone else needs a PIN. */
const actsAlone = k => !!user && (BILL_AUTH.includes(user.role) || !!(user.perm && user.perm[k]));
const canAddTo = o => allowedAlways(user) || o.waiter === user.n || !!user.perm.addAll;
function applyRights() {
  [
    ["#sendBtn", "send"],
    ["#printBtn", "printGuest"],
    ["#settleBtn", "clear"],
    ["#ordBtn", "orderStatus"],
    ["#selBtn", "interim"],
    ["#billBtn", "functions"],
    ["#chSP", "switchSP"],
    ["#spBtn", "switchSP"],
    ['#mPay [data-m="credit"]', "postAccount"]
  ].forEach(([s, k]) => {
    const el = $(s);
    if (el) el.style.display = can(k) ? "" : "none";
  });
}
const waiterCopies = html => html.repeat(Math.max(1, (user && user.copies) || 1));
/** Why this waiter can't open another bill, or "". */
function newBillBlock() {
  if (!can("create")) return "You don't have the right to create bills.";
  const max = !allowedAlways(user) && user.maxPend;
  if (max > 0 && orders.filter(o => o.waiter === user.n).length >= max)
    return `You have reached your limit of ${max} pending bills. Clear one first.`;
  return "";
}

// ---- Error codes: every problem the system can report has its own number, shown with the message ----
// Staff read the number to support ("Error 4001"), and Settings → Help and logs explains each one.
// Numbers never change once given. Groups: 2xxx sign-in and entries, 3xxx rights, 4xxx bills,
// 5xxx payments, 6xxx Front Desk and staff, 7xxx stock, 8xxx network and devices, 9xxx the system itself.
// Role numbers are separate (1000 to 1299), so an error number is never mistaken for a role.

/** [code, area, what it means, what to do, matches the message, kept in the error log] */
const KF_ERRORS = [
  [
    2001,
    "Sign-in",
    "Wrong username or password",
    "Check the spelling and Caps Lock. An administrator can reset the password under Users & roles.",
    /Wrong username or password|That username or password isn't right|Check the username and password/,
    1
  ],
  [
    2002,
    "Sign-in",
    "The account is disabled",
    "An administrator turns it back on under Users & roles.",
    /account is disabled/,
    1
  ],
  [
    2003,
    "Sign-in",
    "Too many wrong tries",
    "Wait 30 to 60 seconds, then try again with the right details.",
    /Too many (attempts|tries|wrong codes)/,
    1
  ],
  [
    2004,
    "Sign-in",
    "Wrong PIN, or the PIN can't approve this",
    "Use a manager's or super cashier's PIN that has this right.",
    /PIN is wrong|not a manager's PIN|That PIN can't|That PIN cannot/,
    1
  ],
  [
    2005,
    "Sign-in",
    "The PIN or pass code isn't allowed",
    "Use 4 to 6 digits that nobody else is using.",
    /PIN must be|pass code should|PIN is already in use|uses that pass code/,
    0
  ],
  [
    2006,
    "Sign-in",
    "The password is too short",
    "Use at least 6 characters (4 for the staff clock).",
    /password needs at least/,
    0
  ],
  [
    2007,
    "Sign-in",
    "The username can't be used",
    "Use 3 or more letters or digits that no one else has.",
    /username is taken|username needs|letters, numbers and _ in the username/,
    0
  ],
  [
    2008,
    "Sign-in",
    "Wrong modules or owner password",
    "Only the system owner has this password.",
    /not the (modules|owner) password/,
    1
  ],
  [
    2009,
    "Sign-in",
    "Signed in on the wrong screen",
    "Front Desk accounts sign in on the Front Desk, not the Back Office.",
    /account is for the Front Desk/,
    0
  ],
  [
    2010,
    "Sign-in",
    "The last Super Admin or Manager can't be removed",
    "Add another one first, then change or remove this one.",
    /Keep at least one (active Super Admin|Manager)/,
    0
  ],
  [
    3001,
    "Rights",
    "Your role doesn't have the right for this",
    "Ask an administrator to grant it under Users & roles → Role rights, or ask a manager to do it.",
    /You don't have the right|Your role doesn't include this/,
    1
  ],
  [
    3002,
    "Rights",
    "Your role can't open the Front Desk",
    "An administrator gives the role a Front Desk right under Users & roles.",
    /role doesn't include the Front Desk/,
    1
  ],
  [
    3003,
    "Rights",
    "The role can't be added or removed",
    "Use a new name of 2 to 30 letters, or move its users to another role first.",
    /role name|is already a role|Move the users on .+ to another role/,
    0
  ],
  [
    3004,
    "Rights",
    "A manager must approve this first",
    "Ask a manager to approve it under Approvals.",
    /Only an approved LPO/,
    0
  ],
  [
    4001,
    "Bills",
    "Open bills must be cleared first",
    "Clear or hand over the open bills, then close the shift or day.",
    /still has (open|pending) bills|Clear your pending bills|Other shifts are still open|has an open shift/,
    1
  ],
  [
    4002,
    "Bills",
    "The bill is already printed",
    "A manager adds to it, or open a new bill.",
    /has been printed/,
    0
  ],
  [
    4003,
    "Bills",
    "The order isn't sent yet",
    "Press Send first, then print or settle.",
    /^Send (the|this)/,
    0
  ],
  [
    4004,
    "Bills",
    "There's no bill to work on",
    "Add items or open a bill first.",
    /has no items yet|no bill to change|Keep at least one bill|needs two open bills/,
    0
  ],
  [
    4005,
    "Bills",
    "The item can't be sold here",
    "Check the selling point, or add the product to it under Selling points.",
    /isn't sold at this selling point|barcode isn't on the system|No item matches/,
    1
  ],
  [
    4006,
    "Bills",
    "The items can't be swapped",
    "Only sent items of the same price can be swapped.",
    /can be swapped|Nothing to swap|Tap Swap/,
    0
  ],
  [
    4007,
    "Bills",
    "More than can be returned",
    "Check how many were sold on that bill.",
    /can still be returned/,
    0
  ],
  [
    4008,
    "Bills",
    "The product is on an open bill",
    "Settle that bill first.",
    /on an open bill/,
    0
  ],
  [
    5001,
    "Payments",
    "The payment is more than what's due",
    "Only cash can be more than the bill. Lower the amount.",
    /more than the (balance due|bill)|Only cash can be more/,
    0
  ],
  [
    5002,
    "Payments",
    "The customer is over their credit limit",
    "Take another payment, or raise the limit under Customers.",
    /Over the credit limit|would go over its credit limit/,
    1
  ],
  [
    5003,
    "Payments",
    "M-Pesa payment not confirmed",
    "Check the M-Pesa message and type the code, or ask the guest to pay again.",
    /No answer yet|M-Pesa requests must|server can't be reached\. Enter the M-Pesa code/,
    1
  ],
  [
    5004,
    "Payments",
    "The M-Pesa modem isn't answering",
    "Check the modem's cable and SIM, then choose its port again under M-Pesa & eTIMS.",
    /No modem answered|modem stopped responding|can't be opened/,
    1
  ],
  [
    5005,
    "Payments",
    "eTIMS isn't reachable or didn't sign",
    "Check the internet on the main computer and the eTIMS keys, then send again.",
    /eTIMS service can't be reached|eTIMS: not signed/,
    1
  ],
  [
    5006,
    "Payments",
    "That payment is already recorded",
    "Check the reference. The same code can't be used twice.",
    /reference .+ is already recorded/,
    1
  ],
  [
    5007,
    "Payments",
    "More than what is owed",
    "Enter what is still owed, or less.",
    /only owes|Only KES .+ (is )?still owed|is still due/,
    0
  ],
  [
    6001,
    "Front Desk",
    "No guests are in-house",
    "Check in a guest first.",
    /no guests in-house/,
    0
  ],
  [
    6002,
    "Front Desk",
    "The dates don't work",
    "Check that the end is after the start and the date isn't in the future.",
    /can't end before it starts|From date is after|date cannot be in the future|expiry date has already passed|dates are all Sundays|overlap leave|From and To can't be the same/,
    0
  ],
  [
    6003,
    "Front Desk",
    "The Front Desk can't be switched off yet",
    "Check out the guests and close what the message lists.",
    /Front Desk can't be switched off/,
    0
  ],
  [
    6004,
    "Staff",
    "Payroll can't go ahead",
    "Approve this month's payroll, or lower what is taken from pay.",
    /no approved payroll|pay is below zero|repayment can't be more|monthly amount can't be more/,
    1
  ],
  [
    6005,
    "Staff",
    "That staff detail is already used",
    "Use a different name, pass code, ID or card.",
    /Another staff member|already on another employee|card is already assigned/,
    0
  ],
  [
    7001,
    "Stock",
    "Not enough stock",
    "Receive or transfer stock in first, then try again.",
    /^Not enough|^Only .+ (in|left in) |Nothing to issue/,
    1
  ],
  [
    7002,
    "Stock",
    "That delivery is already received",
    "Check the invoice or delivery note number.",
    /was already received on/,
    1
  ],
  [
    7003,
    "Stock",
    "The invoice total doesn't match the items",
    "Check the prices and quantities against the invoice.",
    /The invoice says KES/,
    0
  ],
  [
    7004,
    "Stock",
    "The stock count isn't right",
    "Counts can't be below zero. Enter at least one count.",
    /cannot be below zero|Enter at least one physical/,
    0
  ],
  [
    7005,
    "Stock",
    "Stores and selling points work differently",
    "Stores order from vendors and issue stock. Selling points ask a store with a requisition.",
    /Stock is issued from a store|Only stores order from vendors/,
    0
  ],
  [
    7006,
    "Stock",
    "Items are needed first",
    "Create the items under Inventory → Item setup first.",
    /Create (stock )?items in|Upload products that keep stock first|Add at least one (ingredient|material)/,
    0
  ],
  [
    7007,
    "Stock",
    "It already exists",
    "Use the one already there, or pick a new name.",
    /already exists|is already (on the list|a customer)|already sells|There are two printers called/,
    0
  ],
  [
    8001,
    "Network",
    "The main computer can't be reached",
    "Check the network cable or Wi-Fi, and that Kaytia Flow is open on the main computer.",
    /not reachable|(?<!print )server can't be reached|(?<!print )server could not be reached|Couldn't reach|This computer (is not the Main|isn't the server)|Local network only|This computer only/,
    1
  ],
  [
    8002,
    "Network",
    "This computer can't join the network",
    "Check the connect code or the server's login, or remove an old till.",
    /connect code isn't right|no login yet|already has 19 tills/,
    1
  ],
  [
    8101,
    "Printing",
    "The print server isn't running",
    "Open Kaytia Flow on this computer, then press Refresh printers.",
    /print server (could not be reached|did not answer)/,
    1
  ],
  [
    8102,
    "Printing",
    "The printer didn't print",
    "Check the printer is on, has paper and is on the network, and that its address in Settings is right.",
    /printer did not answer|not on the printer list|not printed/,
    1
  ],
  [
    8103,
    "Printing",
    "The browser blocked the print window",
    "Allow pop-ups for Kaytia Flow, then print again.",
    /Allow pop-ups/,
    0
  ],
  [
    8201,
    "Email",
    "The email couldn't be sent",
    "Check the email account under Email reports, and use an app password for Gmail or Microsoft 365.",
    /email account (could not be read|was not saved)|doesn't look like an email|email address (does not|doesn't) look right|app password|password is refused|not sent:/,
    1
  ],
  [
    8301,
    "Files",
    "The file or picture can't be used",
    "Use an Excel workbook (.xlsx) from the template, or a clear PNG or JPG under 5 MB.",
    /file can't be read|file has no|name column wasn't found|file isn't on this computer|file could not be saved|over 5 MB|too large|picture could not be opened|Nothing could be read from that picture|Choose a PNG/,
    1
  ],
  [
    8302,
    "Files",
    "There is nothing to export or print",
    "Change the dates or filters.",
    /nothing to (export|print)|Nothing to export/i,
    0
  ],
  [
    8401,
    "Network",
    "Exchange rates can't be fetched",
    "Check the internet on the main computer. The last saved rates are used.",
    /exchange rate service/,
    1
  ],
  [
    8501,
    "Devices",
    "The fingerprint or face reader isn't set up",
    "Add the reader's serial number under HR & Payroll → Staff clock.",
    /device isn't registered|serial numbers/,
    1
  ],
  [
    2103,
    "Entries",
    "It's in use, so it can't be deleted",
    "Turn it off instead, so past records stay correct.",
    /has been used\. Turn it off/,
    0
  ],
  [
    5008,
    "Payments",
    "Already sent to eTIMS",
    "Nothing more to send. Untick the products already uploaded.",
    /already uploaded/,
    0
  ],
  [
    8104,
    "Printing",
    "That computer still has printers set up",
    "Open Kaytia Flow on that computer and clear its printer setup first.",
    /has a printer setup/,
    0
  ],
  [
    9001,
    "System",
    "Unexpected error on the screen",
    "Press Ctrl+F5. If it happens again, send the log to the developer from Help and logs.",
    null,
    1
  ],
  [
    9002,
    "System",
    "Unexpected error in the background",
    "Note what you were doing and send the log to the developer from Help and logs.",
    null,
    1
  ],
  [
    9003,
    "System",
    "This computer's storage is full",
    "Download a backup, then remove old ID copies or records.",
    /storage is full|may not have enough room/,
    1
  ],
  [
    9004,
    "System",
    "Backup, restore or clearing failed",
    "Nothing was changed. Free some space and try again.",
    /backup could not be made|Restoring failed|Clearing failed/,
    1
  ],
  [
    2101,
    "Entries",
    "Something needed is missing",
    "Fill in or choose what the message asks for.",
    /^(Enter|Choose|Tick|Add|Give|Say|Write|Type|Select) /,
    0
  ],
  [
    2102,
    "Entries",
    "A value isn't allowed",
    "Change it to what the message says.",
    /must be|should be|should look like|can't be (more|over)|cannot be|looks like|has a letter|can't be the same|must match|not both|Keep the name to|can choose from/,
    0
  ]
];
const KF_ERR = new Map(KF_ERRORS.map(e => [e[0], e]));
/** The entry for a message, or null for messages that aren't errors (Saved., Sent. ...). */
function kfErrOf(msg) {
  const m = String(msg || "");
  const own = /Error ([0-9]{4})\b/.exec(m);
  if (own && KF_ERR.has(+own[1])) return KF_ERR.get(+own[1]);
  return KF_ERRORS.find(e => e[4] && e[4].test(m)) || null;
}

// ---- role numbers ----
const KF_ROLE_NUMS = {
  "Super Admin": 1000,
  "General Manager": 1001,
  Manager: 1002,
  Director: 1003,
  Supervisor: 1004,
  Accountant: 1005,
  Finance: 1006,
  Controller: 1007,
  Store: 1008,
  Procurement: 1009,
  Housekeeping: 1010,
  "Housekeeping Supervisor": 1011,
  "Front Office": 1012,
  Chef: 1013,
  Security: 1014,
  Sales: 1015
};
const KF_POS_ROLE_NUMS = { Waiter: 1201, Cashier: 1202, "Super Cashier": 1203, Manager: 1204 };
/** A role's number. New roles get the next free number from 1101, kept for good, even after the role is deleted. */
function kfRoleNo(role, pos) {
  if (!role) return "";
  if (pos && KF_POS_ROLE_NUMS[role]) return KF_POS_ROLE_NUMS[role];
  if (KF_ROLE_NUMS[role]) return KF_ROLE_NUMS[role];
  if (typeof FD_SETTINGS === "undefined") return "";
  const N = FD_SETTINGS.roleNums || (FD_SETTINGS.roleNums = {});
  if (!N[role]) {
    const used = Object.values(N);
    let n = 1101;
    while (used.includes(n)) n++;
    N[role] = n;
  }
  return N[role];
}

/** The message as shown: an error gets its number, and a rights error also the person's role number. */
function kfTag(msg, role, pos) {
  const m = String(msg == null ? "" : msg),
    e = kfErrOf(m);
  if (!e || /Error [0-9]{4}\b/.test(m)) return m;
  const rn = e[0] >= 3000 && e[0] < 3100 && role ? kfRoleNo(role, pos) : "",
    out = `${m} · Error ${e[0]}${rn ? ` · Role ${rn}` : ""}`;
  if (e[5]) kfLogError(out, e[0]);
  return out;
}

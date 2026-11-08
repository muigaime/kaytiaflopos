// ---- Business documents on A4: GRN, LPO, requisition, issue note and supplier return ----
// One description of each document draws the screen, the printout and the PDF, so they always agree.
// LPOs can be emailed to the supplier. Requisitions and issue notes also print on receipt paper.
let docV = null; // { kind, id, mail: { to, subject, text, err, offline, sending } }
const DOC_THERMAL = { req: "REQUISITION", iss: "ISSUE NOTE" };
const docList = kind =>
  ({
    grn: GRNS,
    lpo: LPOS,
    req: REQS,
    iss: ISSUES,
    ret: grList(),
    acv: acS().jv,
    rec: acS().recs,
    pslip: hrSlips(),
    pbslip: hrSlips(),
    prec: hrRecAll(),
    padv: hr().adv,
    pcert: hrRuns(),
    p9: hrP9List(),
    prun: hrRuns(),
    pbank: hrRuns(),
    plv: hr().leave
  })[kind] || [];
const docFind = (kind, id) => docList(kind).find(d => d.id === id);
const docOpen = (kind, id) => (docV = { kind, id });
/** The button that opens a document, for any list. */
const docBtn = (kind, id, label = "View") =>
  `<button class="mini" data-a="dc_open" data-k="${kind}" data-id="${esc(id)}">${label}</button>`;
const docWhen = at => {
  const d = new Date(at);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};
function docCompany() {
  const B = FD_SETTINGS.biz || {};
  return {
    name: FD_SETTINGS.name || "",
    lines: [
      B.addr,
      [B.phone && "Tel " + B.phone, B.email].filter(Boolean).join(" · "),
      B.web,
      B.pin && "KRA PIN " + B.pin
    ].filter(Boolean)
  };
}
function docVendor(name) {
  const v = VENDORS.find(x => x.name === name) || {};
  return {
    h: "Supplier",
    name,
    lines: [v.contact, v.phone, v.email, v.pin && "KRA PIN " + v.pin].filter(Boolean)
  };
}
/** Status at the top, and the warning across the page when it doesn't count yet. */
function docState(d, notValid) {
  if (d.status === "Rejected") return { status: ["Rejected", "bad"], banner: "REJECTED" };
  if (d.status === "Cancelled") return { status: ["Cancelled", "bad"], banner: "CANCELLED" };
  if (d.status === AWAIT) return { status: [AWAIT, "warn"], banner: notValid };
  return { status: [d.status, "ok"], banner: "" };
}
const docHasCode = lines => lines.some(l => itemInfo(l.k).code);
const docCode = (l, on) => (on ? [itemInfo(l.k).code || "-"] : []);
const DOC_SPECS = {
  grn(g) {
    const batch = g.lines.some(x => x.batch),
      expiry = g.lines.some(x => x.expiry),
      code = docHasCode(g.lines),
      netOf = x => (x.net !== undefined ? x.net : x.q * x.c),
      grossOf = x => (x.gross !== undefined ? x.gross : x.q * x.c),
      sum = f => g.lines.reduce((a, x) => a + f(x), 0);
    return {
      title: "Goods Received Note",
      status: ["Posted", "ok"],
      parties: [docVendor(g.sup), { h: "Received into", name: g.store || STORES[0], lines: [] }],
      facts: [
        ["Invoice no", g.inv || g.ref || "-"],
        ["Delivery note", g.dnote || "-"],
        ["Invoice amount (KES)", g.invAmt ? m2(g.invAmt) : "-"],
        ["Purchase order", g.lpo || "-"],
        ["Type", g.mode || (g.lpo ? "LPO" : "Direct")],
        ["Posted by", g.by || "-"]
      ],
      c: [
        ...(code ? ["Code"] : []),
        "Item",
        ...(batch ? ["Batch"] : []),
        ...(expiry ? ["Expiry"] : []),
        "#Qty",
        "Unit",
        "#Unit price",
        "#Net",
        "#VAT",
        "#Gross"
      ],
      r: g.lines.map(x => [
        ...docCode(x, code),
        itemInfo(x.k).name,
        ...(batch ? [x.batch || "-"] : []),
        ...(expiry ? [x.expiry || "-"] : []),
        qn(x.qty !== undefined ? x.qty : x.q),
        x.units || itemInfo(x.k).uom,
        m2(x.unitPrice !== undefined ? x.unitPrice : x.c),
        m2(netOf(x)),
        m2(x.tax || 0),
        m2(grossOf(x))
      ]),
      totals: [
        ["Net amount", m2(sum(netOf))],
        ["VAT", m2(sum(x => x.tax || 0))],
        ["Total (KES)", m2(sum(grossOf)), true]
      ],
      notes: g.narr ? [["Narration", g.narr]] : [],
      sign: ["Delivered by", "Checked by", "Approved by"]
    };
  },
  lpo(p) {
    const v = VENDORS.find(x => x.name === p.sup) || {},
      code = docHasCode(p.lines),
      co = docCompany();
    return {
      title: "Local Purchase Order",
      ...docState(p, "NOT APPROVED · NOT VALID FOR SUPPLY"),
      ...(p.status === "Open" ? { status: ["Approved", "ok"] } : {}),
      parties: [
        docVendor(p.sup),
        { h: "Deliver to", name: p.store, lines: [co.name, ...co.lines.slice(0, 2)] }
      ],
      facts: [
        ["Expected delivery", p.due || "-"],
        ["Payment terms", v.terms || "-"],
        ["Raised by", p.by || "-"],
        ["Approved by", p.appr ? p.appr.by : "-"]
      ],
      c: [...(code ? ["Code"] : []), "Item", "Unit", "#Qty", "#Price", "#Total"],
      r: p.lines.map(x => [
        ...docCode(x, code),
        itemInfo(x.k).name,
        itemInfo(x.k).buyUnit,
        qn(x.qty),
        m2(x.price),
        m2(x.qty * x.price)
      ]),
      totals: [["Total (KES)", m2(lpoTotal(p)), true]],
      notes: [
        ...(p.note ? [["Note", p.note]] : []),
        ["Please note", "Quote this LPO number on your invoice and delivery note."]
      ],
      sign: ["Prepared by", "Authorised by", "Supplier's acceptance"]
    };
  },
  req(r) {
    const code = docHasCode(r.lines);
    return {
      title: "Stock Requisition",
      ...docState(r, "AWAITING APPROVAL"),
      parties: [
        { h: "Requested by", name: r.dept, lines: [r.by].filter(Boolean) },
        { h: "Requested from", name: r.store || STORES[0], lines: [] }
      ],
      facts: [
        ["Raised by", r.by || "-"],
        ["Approved by", r.appr ? r.appr.by : "-"]
      ],
      c: [...(code ? ["Code"] : []), "Item", "Unit", "#Requested", "#Issued", "#Balance"],
      r: r.lines.map(x => [
        ...docCode(x, code),
        itemInfo(x.k).name,
        itemInfo(x.k).uom,
        qn(x.q),
        qn(x.issued || 0),
        qn(Math.max(0, x.q - (x.issued || 0)))
      ]),
      notes: r.note ? [["Note", r.note]] : [],
      sign: ["Requested by", "Approved by", "Issued by", "Received by"],
      slip: r.lines.map(x => [itemInfo(x.k).name, `${qn(x.q)} ${itemInfo(x.k).uom}`])
    };
  },
  iss(x) {
    const code = docHasCode(x.lines);
    return {
      title: "Stock Issue Note",
      ...docState(x, "AWAITING APPROVAL"),
      parties: [
        { h: "Issued from", name: x.from, lines: [] },
        { h: "Issued to", name: x.to, lines: [] }
      ],
      facts: [
        ["Requisition", x.req || "-"],
        ["Raised by", x.by || "-"],
        ["Approved by", x.appr ? x.appr.by : "-"]
      ],
      c: [...(code ? ["Code"] : []), "Item", "Unit", "#Quantity"],
      r: x.lines.map(l => [...docCode(l, code), itemInfo(l.k).name, itemInfo(l.k).uom, qn(l.q)]),
      notes: x.note ? [["Note", x.note]] : [],
      sign: ["Issued by", "Authorised by", "Received by"],
      slip: x.lines.map(l => [itemInfo(l.k).name, `${qn(l.q)} ${itemInfo(l.k).uom}`])
    };
  },
  // Accounting: whatever was posted, as a voucher to print and sign.
  acv(j) {
    const name = c => (acAcc(c) || {}).name || c,
      amt = j.lines.reduce((x, l) => x + l.dr, 0),
      debit = (j.lines.find(l => l.dr > 0) || {}).a,
      credit = (j.lines.find(l => l.cr > 0) || {}).a,
      bankT = {
        dep: "Bank Deposit Voucher",
        wd: "Bank Withdrawal Voucher",
        pay: "Bank Payment Voucher",
        tr: "Bank Transfer Voucher",
        chg: "Bank Charge Voucher"
      },
      title = j.reverses
        ? "Reversal Voucher"
        : j.src === "Bank"
          ? bankT[j.btx] || "Bank Voucher"
          : {
              Journal: "Journal Voucher",
              Expense: "Payment Voucher",
              "Other income": "Receipt Voucher",
              Depreciation: "Depreciation Voucher",
              "Fixed asset": "Fixed Asset Voucher"
            }[j.src] || `${j.src} Voucher`,
      P = {
        dep: ["Paid into", debit, "Came from", credit],
        wd: ["Taken from", credit, "Money goes to", debit],
        pay: ["Paid from", credit, "Paid for", debit],
        tr: ["From", credit, "To", debit],
        chg: ["Charged to", credit, "Booked as", debit]
      }[j.src === "Bank" ? j.btx : ""],
      parties = P
        ? [
            { h: P[0], name: name(P[1]), lines: [] },
            {
              h: P[2],
              name: name(P[3]),
              lines: j.btx === "wd" && j.who ? [`Collected by ${j.who}`] : []
            }
          ]
        : j.src === "Expense"
          ? [
              { h: "Paid to", name: j.who || "-", lines: [] },
              { h: "Paid from", name: name(credit), lines: [] }
            ]
          : j.src === "Other income"
            ? [
                { h: "Received from", name: j.who || "-", lines: [] },
                { h: "Received into", name: name(debit), lines: [] }
              ]
            : [
                { h: "Entry type", name: j.src, lines: [] },
                { h: "Posted by", name: j.by || "-", lines: [] }
              ],
      needsReceiver =
        j.src === "Expense" || (j.src === "Bank" && (j.btx === "wd" || j.btx === "pay"));
    return {
      title,
      date: dateGB(j.date),
      status: j.reversedBy ? ["Reversed", "bad"] : ["Posted", "ok"],
      banner: j.reversedBy ? `REVERSED BY ${j.reversedBy}` : "",
      parties,
      facts: [
        ["Amount (KES)", m2(amt)],
        ["Reference", j.ref || "-"],
        ["Posted by", j.by || "-"],
        ["Posted on", docWhen(j.at)],
        ...(j.reverses ? [["Reverses", j.reverses]] : [])
      ],
      c: ["Code", "Account", "#Debit", "#Credit"],
      r: j.lines.map(l => [l.a, name(l.a), l.dr ? m2(l.dr) : "", l.cr ? m2(l.cr) : ""]),
      totals: [["Total (KES)", m2(amt), true]],
      notes: [["What it's for", j.narr]],
      sign: ["Prepared by", "Approved by", ...(needsReceiver ? ["Received by"] : [])]
    };
  },
  rec(r) {
    const name = (acAcc(r.bank) || {}).name || r.bank,
      diff = r.bal - r.ticked;
    return {
      title: "Bank Reconciliation",
      status: Math.abs(diff) < 0.005 ? ["Balanced", "ok"] : ["Has a difference", "warn"],
      banner: "",
      parties: [
        { h: "Bank account", name, lines: [r.bank] },
        { h: "Statement date", name: dateGB(r.date), lines: [] }
      ],
      facts: [
        ["Done by", r.by || "-"],
        ["Items not yet on the statement", String(r.open.length)]
      ],
      c: ["Date", "Reference", "Not yet on the statement", "#Money in", "#Money out"],
      r: r.open.map(x => [
        dateGB(x.date),
        x.ref || "-",
        x.narr,
        x.dr ? m2(x.dr) : "",
        x.cr ? m2(x.cr) : ""
      ]),
      totals: [
        ["Balance in the books", m2(r.book)],
        ["Ticked so far", m2(r.ticked)],
        ["Statement balance", m2(r.bal)],
        ["Difference (KES)", m2(diff), true]
      ],
      notes: [],
      sign: ["Prepared by", "Checked by", "Approved by"]
    };
  },
  ret(r) {
    return {
      title: "Goods Return Note",
      ...docState(r, "AWAITING APPROVAL"),
      parties: [docVendor(r.sup), { h: "Returned from", name: r.store, lines: [] }],
      facts: [
        ["Goods Received Note", r.grn],
        ["Invoice no", r.inv || "-"],
        ["Delivery note", r.dnote || "-"],
        ["Reason", r.why],
        ["Raised by", r.by || "-"],
        ["Authorised by", r.appr ? r.appr.by : "-"]
      ],
      c: ["Item", "#Qty", "Unit", "#Each", "#VAT", "#Total"],
      r: r.lines.map(l => [
        itemInfo(l.k).name,
        qn(l.q),
        itemInfo(l.k).uom,
        m2(l.q ? l.gross / l.q : 0),
        m2(l.tax),
        m2(l.gross)
      ]),
      totals: [
        ["VAT", m2(grTax(r))],
        ["Total (KES)", m2(grAmount(r)), true]
      ],
      notes: r.note ? [["Note", r.note]] : [],
      sign: ["Raised by", "Authorised by", "Received by supplier"]
    };
  }
};
function docSpec(kind, d) {
  return {
    date: docWhen(d.at),
    ...DOC_SPECS[kind](d),
    co: docCompany(),
    no: d.id,
    by: `Printed ${new Date().toLocaleString("en-GB")} by ${boUser.n}`
  };
}
const docFile = (s, d) => `${s.title.replace(/ /g, "_")}_${d.id}`;

// ---------------------------------------------------------------- the page
const DOC_CSS = `.a4{box-sizing:border-box;width:210mm;min-height:297mm;padding:14mm;background:#fff;color:#241b12;font:12px/1.45 Arial,Helvetica,sans-serif;display:flex;flex-direction:column;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.a4 *{box-sizing:border-box}
.a4-top{display:flex;justify-content:space-between;gap:24px;padding-bottom:12px;border-bottom:2.5px solid #a8741a}
.a4-co{display:flex;gap:12px;align-items:flex-start;min-width:0}
.a4-co img{max-width:72px;max-height:64px;object-fit:contain}
.a4-co b{display:block;font:700 20px/1.2 Georgia,'Times New Roman',serif}
.a4-co small{display:block;font-size:10.5px;color:#6b6358;line-height:1.5}
.a4-id{text-align:right;flex:none}
.a4-id h1{margin:0;font:700 23px/1.15 Georgia,'Times New Roman',serif;letter-spacing:.01em}
.a4-id .no{font-size:14px;font-weight:700;color:#8a5e12;margin-top:3px}
.a4-id .dt{font-size:11px;color:#6b6358}
.a4-pill{display:inline-block;margin-top:6px;padding:2px 10px;border-radius:99px;font-size:10.5px;font-weight:700;color:#fff}
.a4-pill.ok{background:#1f7a4d}.a4-pill.warn{background:#a8741a}.a4-pill.bad{background:#b3261e}
.a4-banner{margin-top:12px;padding:6px;border:1.5px solid #b3261e;border-radius:4px;color:#b3261e;font-weight:700;text-align:center;letter-spacing:.06em}
.a4-parties{display:flex;gap:12px;margin-top:14px}
.a4-party{flex:1;min-width:0;padding:10px 12px;background:#f9f5ed;border-left:3px solid #a8741a;border-radius:2px}
.a4-party span,.a4-fact span{display:block;font-size:9.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6b6358}
.a4-party b{display:block;font-size:14px;margin-top:2px}
.a4-party small{display:block;font-size:11px;color:#4f483f}
.a4-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 12px;margin-top:12px;padding-bottom:10px;border-bottom:1px solid #d9cdb8}
.a4-fact b{display:block;font-size:12px;overflow-wrap:anywhere}
.a4-items{width:100%;margin-top:14px;border-collapse:collapse}
.a4-items th{background:#241b12;color:#fff;padding:7px 8px;font-size:11px;text-align:left}
.a4-items td{padding:7px 8px;border-bottom:1px solid #e8e0d0;vertical-align:top}
.a4-items tr:nth-child(even) td{background:#fbf8f1}
.a4-items .n{text-align:right;white-space:nowrap}
.a4-items thead{display:table-header-group}.a4-items tr{break-inside:avoid}
.a4-tot{align-self:flex-end;width:270px;margin-top:10px}
.a4-tot div{display:flex;justify-content:space-between;padding:5px 10px;border-bottom:1px solid #e8e0d0}
.a4-tot .big{background:#241b12;color:#fff;font-weight:700;font-size:14px;border:0;border-radius:2px}
.a4-note{margin-top:12px;font-size:11.5px}
.a4-sign{display:flex;gap:22px;margin-top:auto;padding-top:60px;break-inside:avoid}
.a4-sign div{flex:1;border-top:1px solid #241b12;padding-top:5px;font-size:11px}
.a4-sign small{display:block;color:#6b6358;font-size:10px}
.a4-foot{display:flex;justify-content:space-between;gap:12px;margin-top:16px;padding-top:6px;border-top:1px solid #d9cdb8;font-size:10px;color:#6b6358}`;
function docHTML(s) {
  const logo = (FD_SETTINGS.logos || {}).company,
    num = h => (h[0] === "#" ? ' class="n"' : "");
  return `<div class="a4"><div class="a4-top"><div class="a4-co">${logo ? `<img src="${esc(logo)}" alt="">` : ""}<div><b>${esc(s.co.name)}</b>${s.co.lines.map(l => `<small>${esc(l)}</small>`).join("")}</div></div>
  <div class="a4-id"><h1>${esc(s.title)}</h1><div class="no">${esc(s.no)}</div><div class="dt">${esc(s.date)}</div><span class="a4-pill ${s.status[1]}">${esc(s.status[0])}</span></div></div>
  ${s.banner ? `<div class="a4-banner">${esc(s.banner)}</div>` : ""}
  <div class="a4-parties">${s.parties.map(p => `<div class="a4-party"><span>${esc(p.h)}</span><b>${esc(p.name)}</b>${p.lines.map(l => `<small>${esc(l)}</small>`).join("")}</div>`).join("")}</div>
  <div class="a4-facts">${s.facts.map(([l, v]) => `<div class="a4-fact"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join("")}</div>
  <table class="a4-items"><thead><tr>${s.c.map(h => `<th${num(h)}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${s.r.map(r => `<tr>${r.map((v, i) => `<td${num(s.c[i])}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  ${s.totals ? `<div class="a4-tot">${s.totals.map(([l, v, big]) => `<div class="${big ? "big" : ""}"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>` : ""}
  ${s.notes.map(([l, v]) => `<div class="a4-note"><b>${esc(l)}:</b> ${esc(v)}</div>`).join("")}
  <div class="a4-sign">${s.sign.map(x => `<div>${esc(x)}<small>Name, signature and date</small></div>`).join("")}</div>
  <div class="a4-foot"><span>${esc(s.by)}</span><span>${esc(s.co.name)}</span></div></div>`;
}
/** A new window holding just this paper, then the print dialog. */
function docWindow(title, css, html) {
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print.");
  w.document.write(
    `<!DOCTYPE html><html><head><title>${esc(title)}</title><style>${css}${/size:\s*A4/.test(css) ? a4Screen(/landscape/.test(css)) : ""}</style></head><body>${html}<\/body><\/html>`
  );
  w.document.close();
  const go = () => {
    w.focus();
    w.print();
  };
  // A logo has to be ready before the page goes to the printer.
  const img = w.document.images && w.document.images[0];
  if (img && !img.complete) img.onload = img.onerror = go;
  else go();
}
function docPrint(s) {
  docWindow(
    `${s.title} ${s.no}`,
    `@page{size:A4;margin:10mm}body{margin:0}${DOC_CSS}.a4{width:auto;min-height:calc(297mm - 21mm);padding:0}`,
    docHTML(s)
  );
}

// ---------------------------------------------------------------- PDF
/** The company logo as a JPEG, the one picture format a PDF can hold as it is. */
async function docLogoImg() {
  const url = (FD_SETTINGS.logos || {}).company;
  if (!url) return null;
  try {
    const img = await logoImage(url),
      k = Math.min(1, 240 / Math.max(img.naturalWidth, img.naturalHeight)),
      c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    return { data: atob(c.toDataURL("image/jpeg", 0.9).split(",")[1]), w: c.width, h: c.height };
  } catch (e) {
    return null;
  }
}
async function docPdfSpec(s) {
  return { ...s, logoImg: await docLogoImg() };
}

// ---------------------------------------------------------------- receipt paper
const docWords = (text, w) => {
  const out = [];
  let cur = "";
  String(text)
    .split(/\s+/)
    .forEach(word => {
      if (cur && (cur + " " + word).length > w) {
        out.push(cur);
        cur = word.slice(0, w);
      } else cur = (cur ? cur + " " : "") + word.slice(0, w);
    });
  if (cur) out.push(cur);
  return out;
};
/** What the slip says, in order. The printer lines and the on-screen slip both come from this. */
function docSlipParts(s) {
  const meta = [
      ...s.parties.map(p => [p.h, p.name]),
      ...s.facts.filter(([l, v]) => v !== "-" && !/ by$/.test(l))
    ],
    people = s.facts.filter(([l, v]) => v !== "-" && / by$/.test(l));
  return { meta, people };
}
/** For the receipt printer: plain text, ruled and lined up for the paper's width. */
function docSlipLines(s, w) {
  const { meta, people } = docSlipParts(s),
    raster = (FD_SETTINGS.logos || {}).raster,
    rule = "-".repeat(w),
    heavy = "=".repeat(w),
    pair = (l, r, bold) => {
      const room = w - r.length - 1,
        name = docWords(l, room);
      return [
        {
          t: (name[0] || "") + " ".repeat(Math.max(1, w - (name[0] || "").length - r.length)) + r,
          bold
        },
        ...name.slice(1).map(t => ({ t, bold }))
      ];
    },
    label = (l, v) => {
      const lines = docWords(`${l}: ${v}`, w);
      return lines.map(t => ({ t }));
    };
  return [
    ...(raster ? [{ t: "", img: raster, center: true }] : []),
    ...docWords(s.co.name, w).map(t => ({ t, bold: true, center: true })),
    ...s.co.lines.flatMap(l => docWords(l, w)).map(t => ({ t, center: true })),
    { t: heavy },
    { t: s.title.toUpperCase(), bold: true, big: s.title.length * 2 <= w, center: true },
    { t: s.no, bold: true, center: true },
    { t: heavy },
    ...(s.banner ? [{ t: `*** ${s.banner} ***`, bold: true, center: true }, { t: rule }] : []),
    ...label("Date", s.date),
    ...meta.flatMap(([l, v]) => label(l, v)),
    { t: rule },
    ...pair("ITEM", "QTY", true),
    { t: rule },
    ...s.slip.flatMap(([n, q]) => pair(n, q)),
    { t: rule },
    ...pair("Items", String(s.slip.length), true),
    { t: rule },
    ...s.notes.flatMap(([l, v]) => label(l, v)),
    ...people.flatMap(([l, v]) => label(l, v)),
    ...s.sign.flatMap(x => [
      { t: "" },
      { t: x, bold: true },
      { t: "" },
      { t: "Sign: " + "_".repeat(w - 6) }
    ]),
    { t: "" },
    ...docWords(s.by, w).map(t => ({ t, center: true }))
  ];
}
/** The same slip for the print dialog, set like a printed receipt. */
function docSlipHTML(s) {
  const { meta, people } = docSlipParts(s),
    logo = (FD_SETTINGS.logos || {}).receipt || (FD_SETTINGS.logos || {}).company,
    row = (l, v) => `<div class="m"><span>${esc(l)}</span><b>${esc(v)}</b></div>`;
  return `<div class="s">${logo ? `<img src="${esc(logo)}" alt="">` : ""}<div class="co">${esc(s.co.name)}</div>${s.co.lines.map(l => `<div class="ln">${esc(l)}</div>`).join("")}
  <div class="ti">${esc(s.title)}<small>${esc(s.no)}</small></div>
  ${s.banner ? `<div class="ba">${esc(s.banner)}</div>` : ""}
  ${row("Date", s.date)}${meta.map(([l, v]) => row(l, v)).join("")}
  <table><thead><tr><th>Item</th><th class="n">Qty</th></tr></thead><tbody>${s.slip.map(([n, q]) => `<tr><td>${esc(n)}</td><td class="n">${esc(q)}</td></tr>`).join("")}</tbody></table>
  <div class="tot"><span>Items</span><b>${s.slip.length}</b></div>
  ${s.notes.map(([l, v]) => row(l, v)).join("")}${people.map(([l, v]) => row(l, v)).join("")}
  ${s.sign.map(x => `<div class="si">${esc(x)}</div>`).join("")}
  <div class="by">${esc(s.by)}</div></div>`;
}
const docSlipCSS =
  w => `@page{size:${w}mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#000}
.s{width:${w}mm;padding:3mm ${w === 58 ? 2 : 4}mm 6mm;font:12px/1.35 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.s img{display:block;max-width:60%;max-height:20mm;margin:0 auto 2mm;object-fit:contain}
.co{font-weight:700;font-size:15px;text-align:center}.ln{font-size:10.5px;text-align:center}
.ti{margin:7px 0;padding:5px 4px;background:#000;color:#fff;font-weight:700;font-size:14px;text-align:center}.ti small{display:block;font-size:11.5px;font-weight:700}
.ba{margin:0 0 6px;padding:3px;border:1.5px solid #000;font-weight:700;font-size:11px;text-align:center}
.m{display:flex;justify-content:space-between;gap:8px;padding:1.5px 0}.m span{flex:none}.m b{text-align:right;overflow-wrap:anywhere}
table{width:100%;margin-top:6px;border-collapse:collapse}th{padding:4px 0;border-top:1.5px solid #000;border-bottom:1.5px solid #000;font-size:11.5px;text-align:left}
td{padding:4px 0;border-bottom:1px dashed #000;vertical-align:top;font-weight:600}.n{padding-left:8px;text-align:right;white-space:nowrap}
.tot{display:flex;justify-content:space-between;margin:0 0 6px;padding:4px 0;border-bottom:1.5px solid #000;font-weight:700}
.si{margin-top:30px;padding-top:3px;border-top:1px solid #000;font-weight:700;font-size:11px}
.by{margin-top:12px;font-size:10px;text-align:center}`;
/** To this computer's printer for the document (Settings → Printer setup), or the print dialog if there isn't one. */
async function docThermal(kind, s) {
  const rule = docRule(DOC_THERMAL[kind], PSU_ALL),
    printer = rule && rulePrinter(rule),
    narrow = rule && rule.paper === "58mm";
  if (printer) {
    toast("Sending to the printer…");
    const err = await printCopies(printer, docSlipLines(s, narrow ? 32 : 42), rule);
    if (!err) return toast(`${s.no} printed on ${printer.n}.`);
    toast(`${printer.n}: ${err} Choose a printer here instead.`);
  }
  docWindow(`${s.title} ${s.no}`, docSlipCSS(narrow ? 58 : 80), docSlipHTML(s));
}

// ---------------------------------------------------------------- email
/** The record that remembers it was emailed. */
const docMailRec = d => d.line || d;
function docMailStart(p, s) {
  if (docV.kind === "pslip") {
    const e = hrEmp(p.line.emp) || {};
    return {
      to: e.email || "",
      subject: `Payslip for ${hrMonthName(p.period)} from ${s.co.name}`,
      text: `Dear ${p.line.name},\n\nPlease find attached your payslip for ${hrMonthName(p.period)}.\n\nRegards,\n${boUser.n}\n${s.co.name}`,
      err: "",
      offline: false,
      sending: false
    };
  }
  const v = VENDORS.find(x => x.name === p.sup) || {};
  return {
    to: v.email || "",
    subject: `${s.title} ${p.id} from ${s.co.name}`,
    text: `Dear ${v.contact || p.sup},\n\nPlease find attached our ${s.title} ${p.id} for KES ${m2(lpoTotal(p))}.\nDeliver to: ${p.store}${p.due ? `\nExpected by: ${p.due}` : ""}\n\nPlease quote this number on your invoice and delivery note.\n\nRegards,\n${boUser.n}\n${s.co.name}`,
    err: "",
    offline: false,
    sending: false
  };
}
const docMailOk = to => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
function docMailPanel(m) {
  return `<div class="doc-mail"><label>Send to<input data-docm="to" type="email" value="${esc(m.to)}" placeholder="supplier@example.com"></label><label>Subject<input data-docm="subject" value="${esc(m.subject)}"></label><label class="doc-mail-t">Message<textarea data-docm="text" rows="7">${esc(m.text)}</textarea></label>
  ${m.err ? `<div class="doc-mail-err">${esc(m.err)}</div>` : ""}
  <div class="doc-mail-b"><span class="stk">It goes as a PDF attachment.</span>${m.offline ? '<button class="mini" data-a="dc_mailapp">Use my email app instead</button>' : ""}<button class="mini" data-a="dc_mailno">Cancel</button><button class="chip on" data-a="dc_mailsend" ${m.sending ? "disabled" : ""}>${m.sending ? "Sending…" : "Send email"}</button></div></div>`;
}
/** Sends one PDF through the server. Says what went wrong, or nothing. */
async function docMailPost(to, subject, text, file, s) {
  const made = await docPdfSpec(s);
  return mailServerPost({ to, subject, text, filename: file + ".pdf", pdf: btoa(PDF.sheet(made)) });
}
/** Ask the server to send an email. Null when it went; otherwise what went wrong. */
async function mailServerPost(payload) {
  const ctl = new AbortController(),
    t = setTimeout(() => ctl.abort(), 30000);
  let res = null;
  try {
    res = await fetch(printServer() + "/api/mail/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(FD_SETTINGS.printKey ? { "x-print-key": FD_SETTINGS.printKey } : {})
      },
      body: JSON.stringify(payload),
      signal: ctl.signal
    });
  } catch (e) {
    res = null;
  }
  clearTimeout(t);
  if (res && res.ok) return null;
  const e = res ? await res.json().catch(() => ({})) : {},
    code = e.error && e.error.code;
  return {
    offline: !res || code === "MAIL_NOT_SET",
    msg: !res
      ? "The server could not be reached, so nothing was sent."
      : code === "MAIL_NOT_SET"
        ? "Email isn't set up on the server yet, so nothing was sent."
        : (e.error && e.error.message) || "The email was not sent."
  };
}
async function docMailSend(p, s) {
  const m = docV.mail,
    kind = docV.kind,
    to = m.to.trim();
  if (!docMailOk(to)) {
    m.err = "Enter a valid email address.";
    return all();
  }
  m.sending = true;
  m.err = "";
  all();
  const bad = await docMailPost(to, m.subject, m.text, docFile(s, p), s);
  m.sending = false;
  if (!bad) {
    const R = docMailRec(p);
    (R.mailed || (R.mailed = [])).push({ to, at: new Date().toISOString(), by: boUser.n });
    auditAdd(
      kind === "pslip" ? "Payslip emailed" : "Purchase order emailed",
      `${p.id} · sent to ${to}`,
      {
        ref: p.id,
        mod: kind === "pslip" ? "HR" : "Purchasing"
      }
    );
    if (docV) docV.mail = null;
    bosave();
    toast(`${p.id} emailed to ${to}.`);
    return all();
  }
  m.offline = bad.offline;
  m.err = bad.msg;
  all();
}
/** No server to send through: the PDF comes down and the computer's own email app opens, ready to attach it. */
async function docMailApp(p, s) {
  const m = docV.mail;
  PDF.download(await docPdfSpec(s), docFile(s, p), PDF.sheet);
  const a = document.createElement("a");
  a.href = `mailto:${encodeURIComponent(m.to.trim())}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.text)}`;
  a.click();
  toast("PDF downloaded. Attach it to the email that opens.");
}

// ---------------------------------------------------------------- on screen
function docPopup() {
  const d = docV && docFind(docV.kind, docV.id);
  if (!d) return "";
  const s = docSpec(docV.kind, d),
    sent = (docMailRec(d).mailed || []).at(-1);
  return `<div class="modal show" id="docModal" style="z-index:70"><div class="box doc-box">
  <div class="doc-bar"><div><h3>${esc(s.title)} · ${esc(s.no)}</h3>${sent ? `<small>Last emailed to ${esc(sent.to)} · ${docWhen(sent.at)}</small>` : ""}</div>
  <div class="doc-acts">${docV.kind === "lpo" ? `<button class="mini" data-a="dc_mail">Email to supplier</button>` : docV.kind === "pslip" ? `<button class="mini" data-a="dc_mail">Email to employee</button>` : ""}${DOC_THERMAL[docV.kind] ? `<button class="mini" data-a="dc_thermal">Thermal print</button>` : ""}<button class="mini" data-a="dc_pdf">Download PDF</button><button class="chip on" data-a="dc_print">Print</button><button class="mini" data-a="dc_close" aria-label="Close">✕</button></div></div>
  ${docV.mail ? docMailPanel(docV.mail) : ""}
  <div class="doc-desk"><style>${DOC_CSS}</style>${docHTML(s)}</div></div></div>`;
}
function docAct(a, b) {
  if (a === "dc_open") {
    docOpen(b.dataset.k, b.dataset.id);
    return all();
  }
  if (a === "dc_close") {
    docV = null;
    return all();
  }
  const d = docV && docFind(docV.kind, docV.id);
  if (!d) return;
  const s = docSpec(docV.kind, d);
  if (a === "dc_print") return docPrint(s);
  if (a === "dc_thermal") return docThermal(docV.kind, s);
  if (a === "dc_pdf")
    return docPdfSpec(s).then(made => {
      PDF.download(made, docFile(s, d), PDF.sheet);
      toast(`${s.no} downloaded as PDF.`);
    });
  if (a === "dc_mail" && docV.kind === "pslip") {
    if (!boCan("users.manage")) return boDenied();
    docV.mail = docMailStart(d, s);
    return all();
  }
  if (a === "dc_mail") {
    if (!boCan("pur.lpo")) return boDenied();
    if (!d.appr || d.status === "Rejected" || d.status === "Cancelled")
      return toast("Only an approved LPO can be sent to a supplier.");
    docV.mail = docMailStart(d, s);
    return all();
  }
  if (a === "dc_mailno") {
    docV.mail = null;
    return all();
  }
  if (a === "dc_mailsend") return docMailSend(d, s);
  if (a === "dc_mailapp") return docMailApp(d, s);
}
document.addEventListener("input", e => {
  const f = e.target.dataset && e.target.dataset.docm;
  if (f && docV && docV.mail) docV.mail[f] = e.target.value;
});

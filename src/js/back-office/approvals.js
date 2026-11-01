// ---- Approvals: purchase orders (LPO), requisitions and issues need a manager's approval ----
// LPO:          "Awaiting approval" → "Open" (can be received) or "Rejected".
// Requisition:  "Awaiting approval" → "Approved" (the store can issue it) or "Rejected".
// Issue:        issuing (Issue tab, a requisition, Send to selling point) raises an issue note (ISSUES);
//               the stock moves only when it is approved, after checking the store still has it.
// A manager approves by typing their PIN (Users & roles). Each decision keeps who, when and why.
const AWAIT = "Awaiting approval";
let apM = null; // approval popup: { kind: "lpo" | "req" | "iss", id, act: "approve" | "reject" }

const AP_KIND = { lpo: "Purchase order", req: "Requisition", iss: "Issue" };
const apList = kind => (kind === "lpo" ? LPOS : kind === "req" ? REQS : ISSUES);
const apFind = (kind, id) => apList(kind).find(x => x.id === id);
const apPending = () =>
  ["lpo", "req", "iss"].flatMap(kind =>
    apList(kind)
      .filter(x => x.status === AWAIT)
      .map(d => ({ kind, d }))
  );
const apCount = () => apPending().length;
/** Approve / Reject buttons for a document waiting for approval. */
const apButtons = (kind, d) =>
  d.status === AWAIT
    ? `<button class="chip on" data-a="ap_open" data-k="${kind}" data-id="${esc(d.id)}" data-act="approve">Approve</button><button class="mini" data-a="ap_open" data-k="${kind}" data-id="${esc(d.id)}" data-act="reject">Reject</button>`
    : "";
/** "Approved by Peter Mwangi · 31 Oct 10:20" / "Rejected by … : reason". */
const apNote = d =>
  d.appr
    ? `Approved by ${esc(d.appr.by)} · ${dt2(d.appr.at)}`
    : d.rej
      ? `Rejected by ${esc(d.rej.by)} · ${dt2(d.rej.at)}${d.rej.why ? ": " + esc(d.rej.why) : ""}`
      : "";

/** Raise an issue note: the stock moves from the store to the selling point once a manager approves it. */
function raiseIssue(from, to, lines, note, src, req) {
  const x = {
    id: nid("ISS"),
    at: new Date().toISOString(),
    from,
    to,
    by: boUser.n,
    note: note || "",
    src, // "issue" | "requisition" | "send"
    req: req || "",
    lines: lines.map(l => ({ k: l.k, q: l.q })),
    status: AWAIT
  };
  ISSUES.push(x);
  bosave();
  return x;
}
/** Quantity of item k on a requisition already in issue notes waiting for approval. */
const reqPend = (r, k) =>
  ISSUES.filter(x => x.req === r.id && x.status === AWAIT).reduce(
    (a, x) => a + x.lines.filter(l => l.k === k).reduce((b, l) => b + l.q, 0),
    0
  );

// ---------------------------------------------------------------- deciding
/** Returns an error message, or "" when done. */
function apApprove(kind, d, who) {
  if (kind === "iss") {
    const short = d.lines.find(l => l.q > have(d.from, l.k) + 1e-9);
    if (short)
      return `Only ${qtyBoth(short.k, have(d.from, short.k))} of ${itemInfo(short.k).name} in ${d.from}. Receive stock first, or reject the issue.`;
    const note = d.req ? "Requisition " + d.req : d.note || "Issue " + d.id;
    d.lines.forEach(l => {
      mvc(d.from, l.k, -l.q, "ISSUE_OUT", note, d.to, d.id, d.by);
      mvc(d.to, l.k, l.q, "ISSUE_IN", note, d.from, d.id, d.by);
    });
    const r = d.req && REQS.find(x => x.id === d.req);
    if (r) {
      d.lines.forEach(l => {
        const x = r.lines.find(y => y.k === l.k);
        if (x) x.issued += l.q;
      });
      r.status = r.lines.every(x => x.issued >= x.q - 1e-9) ? "Issued" : "Partly issued";
    }
  }
  d.status = kind === "lpo" ? "Open" : kind === "req" ? "Approved" : "Issued";
  d.appr = { by: who, at: new Date().toISOString() };
  return "";
}
function apReject(kind, d, who, why) {
  d.status = "Rejected";
  d.rej = { by: who, at: new Date().toISOString(), why };
}

// ---------------------------------------------------------------- popup
function apDocLines(kind, d) {
  if (kind === "lpo")
    return `<tr><th>Item</th><th class="n">Quantity</th><th class="n">Price</th><th class="n">Total (KES)</th></tr>${d.lines
      .map(
        x =>
          `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qn(x.qty)} ${esc(itemInfo(x.k).buyUnit)}</td><td class="n">${m2(x.price)}</td><td class="n">${m2(x.qty * x.price)}</td></tr>`
      )
      .join(
        ""
      )}<tr><td colspan="3"><b>Order total</b></td><td class="n"><b>${m2(lpoTotal(d))}</b></td></tr>`;
  const from = kind === "req" ? d.store || STORES[0] : d.from;
  return `<tr><th>Item</th><th class="n">${kind === "req" ? "Requested" : "To issue"}</th><th class="n">In ${esc(from)}</th><th class="n">Value at cost (KES)</th></tr>${d.lines
    .map(
      x =>
        `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qtyBoth(x.k, x.q)}</td><td class="n ${have(from, x.k) < x.q - 1e-9 ? "neg" : ""}">${qtyBoth(x.k, have(from, x.k))}</td><td class="n">${m2(x.q * cst(x.k))}</td></tr>`
    )
    .join("")}`;
}
const apTitle = (kind, d) =>
  kind === "lpo"
    ? `${d.id} · ${esc(d.sup)} → ${esc(d.store)}`
    : kind === "req"
      ? `${d.id} · ${esc(d.dept)} asks ${esc(d.store || STORES[0])}`
      : `${d.id} · ${esc(d.from)} → ${esc(d.to)}${d.req ? " · for " + esc(d.req) : ""}`;

function apModalIfOpen() {
  const d = apM && apFind(apM.kind, apM.id);
  if (!d || d.status !== AWAIT) return "";
  const rej = apM.act === "reject",
    mgrs = USERS.filter(u => u.role === "Manager");
  return `<div class="modal show" id="apModal" style="z-index:75"><div class="box" style="max-width:720px">
  <div class="fr" style="align-items:center;justify-content:space-between"><h3>${rej ? "Reject" : "Approve"} ${AP_KIND[apM.kind].toLowerCase()}</h3><button class="mini" data-a="ap_close" aria-label="Close">✕</button></div>
  <div class="stk"><b>${apTitle(apM.kind, d)}</b> · raised by ${esc(d.by)} · ${dt2(d.at)}${d.note ? " · " + esc(d.note) : ""}</div>
  <div class="tw"><table class="t">${apDocLines(apM.kind, d)}</table></div>
  ${rej ? `<label>Reason<input id="apWhy" placeholder="Why is it rejected?"></label>` : ""}
  ${
    mgrs.length
      ? `<label>Manager PIN<input id="apPin" type="password" inputmode="numeric" autocomplete="off" placeholder="${mgrs.length} manager(s) can ${rej ? "reject" : "approve"}"></label>`
      : '<div class="stk" style="color:var(--bad)">No manager can approve yet. Give a staff member the Manager role under Users &amp; roles.</div>'
  }
  <div class="stk">${apM.kind === "iss" && !rej ? "Approving moves the stock now." : apM.kind === "lpo" && !rej ? "Once approved the order can be received." : apM.kind === "req" && !rej ? "Once approved the store can issue it." : ""}</div>
  <div class="fr" style="justify-content:flex-end"><button class="mini" data-a="ap_close">Cancel</button><button class="chip on" data-a="ap_ok" ${mgrs.length ? "" : "disabled"}>${rej ? "Reject" : "Approve"}</button></div>
 </div></div>`;
}

// ---------------------------------------------------------------- Inventory → Approvals
function apView() {
  const P = apPending(),
    n = k => P.filter(x => x.kind === k).length,
    done = ["lpo", "req", "iss"]
      .flatMap(kind =>
        apList(kind)
          .filter(d => d.appr || d.rej)
          .map(d => ({ kind, d, t: (d.appr || d.rej).at }))
      )
      .sort((a, b) => (a.t < b.t ? 1 : -1))
      .slice(0, 25),
    detail = (kind, d) =>
      kind === "lpo"
        ? `${d.lines.length} line(s) · KES ${m2(lpoTotal(d))}`
        : d.lines.map(x => `${esc(itemInfo(x.k).name)} ${qtyBoth(x.k, x.q)}`).join(", ");
  return `<div class="pn"><h4>Approvals</h4><div class="stk">Purchase orders, requisitions and issues wait here until a manager approves them with their PIN. Stock is only issued once its issue note is approved.</div></div>
 <div class="kstg">${[
   ["Purchase orders", n("lpo")],
   ["Requisitions", n("req")],
   ["Issues", n("iss")]
 ]
   .map(([l, v]) => `<div class="kst"><span>${l} waiting</span><b>${v}</b></div>`)
   .join("")}</div>
 <div class="pn tw"><h4>Waiting for approval (${P.length})</h4>${
   P.length
     ? `<table class="t"><tr><th>Raised</th><th>Type</th><th>Document</th><th>Details</th><th>By</th><th></th></tr>${P.sort(
         (a, b) => (a.d.at < b.d.at ? -1 : 1)
       )
         .map(
           ({ kind, d }) =>
             `<tr><td>${dt2(d.at)}</td><td>${AP_KIND[kind]}</td><td>${apTitle(kind, d)}</td><td>${detail(kind, d)}</td><td>${esc(d.by)}</td><td><div class="fr" style="flex-wrap:nowrap">${apButtons(kind, d)}</div></td></tr>`
         )
         .join("")}</table>`
     : '<div class="empty">Nothing is waiting for approval.</div>'
 }</div>
 <div class="pn tw"><h4>Recent decisions</h4>${
   done.length
     ? `<table class="t"><tr><th>Type</th><th>Document</th><th>Decision</th><th>Status now</th></tr>${done
         .map(
           ({ kind, d }) =>
             `<tr><td>${AP_KIND[kind]}</td><td>${apTitle(kind, d)}</td><td>${apNote(d)}</td><td><span class="tag ${d.status === "Rejected" ? "bad" : "ok"}">${esc(d.status)}</span></td></tr>`
         )
         .join("")}</table>`
     : '<div class="empty">No approvals yet.</div>'
 }</div>`;
}

/** Issue notes from a store, shown on the Issue tab. */
function apIssueNotes(store) {
  const L = ISSUES.filter(x => x.from === store)
    .slice()
    .reverse()
    .slice(0, 15);
  return `<div class="pn tw"><h4>Issue notes from ${esc(store)}</h4>${
    L.length
      ? `<table class="t"><tr><th>Date</th><th>Issue no</th><th>To</th><th>Items</th><th>By</th><th>Status</th><th></th></tr>${L.map(
          x =>
            `<tr><td>${dt2(x.at)}</td><td>${esc(x.id)}${x.req ? `<div class="stk">${esc(x.req)}</div>` : ""}</td><td>${esc(x.to)}</td><td>${x.lines.map(l => `${esc(itemInfo(l.k).name)} ${qtyBoth(l.k, l.q)}`).join(", ")}</td><td>${esc(x.by)}</td><td><span class="tag ${x.status === "Issued" ? "ok" : x.status === "Rejected" ? "bad" : "warn"}">${esc(x.status)}</span>${apNote(x) ? `<div class="stk">${apNote(x)}</div>` : ""}</td><td><div class="fr" style="flex-wrap:nowrap">${apButtons("iss", x)}</div></td></tr>`
        ).join("")}</table>`
      : '<div class="empty">No issue notes yet.</div>'
  }</div>`;
}

// ---------------------------------------------------------------- actions (data-a="ap_…")
function apAct(a, b) {
  const d = b.dataset;
  if (a === "open") {
    apM = { kind: d.k, id: d.id, act: d.act };
    all();
    const p = $(d.act === "reject" ? "#apWhy" : "#apPin");
    return p && p.focus();
  }
  if (a === "close") {
    apM = null;
    return all();
  }
  if (a === "ok") {
    const doc = apM && apFind(apM.kind, apM.id),
      pin = ($("#apPin") || {}).value || "",
      why = (($("#apWhy") || {}).value || "").trim(),
      mgr = USERS.find(u => u.role === "Manager" && u.pin === pin);
    if (!doc || doc.status !== AWAIT) {
      apM = null;
      return all();
    }
    if (apM.act === "reject" && !why) return toast("Enter the reason for rejecting.");
    if (!mgr) return toast("That is not a manager's PIN.");
    const kind = apM.kind;
    if (apM.act === "reject") apReject(kind, doc, mgr.n, why);
    else {
      const err = apApprove(kind, doc, mgr.n);
      if (err) return toast(err);
    }
    apM = null;
    bosave();
    toast(
      `${AP_KIND[kind]} ${doc.id} ${doc.status === "Rejected" ? "rejected" : "approved"} by ${mgr.n}.` +
        (kind === "iss" && doc.status === "Issued" ? ` Stock moved to ${doc.to}.` : "")
    );
    return all();
  }
}

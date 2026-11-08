// ---- Approvals: purchase orders (LPO), requisitions and issues need a manager's approval ----
// LPO:          "Awaiting approval" → "Open" (can be received) or "Rejected".
// Requisition:  "Awaiting approval" → approving it moves the stock. Whatever the store is short of stays open.
// Issue:        anyone with the approve right issues straight away. Anyone else raises a note (ISSUES),
//               and the stock moves when a manager approves that. One approval per movement, never two.
// Who may approve is set in Users & roles (the inv.approve right). Each decision keeps who, when and why.
const AWAIT = "Awaiting approval";
let apM = null; // approval popup: { kind: "lpo" | "req" | "iss", id, act: "approve" | "reject" }

const AP_KIND = {
  lpo: "Purchase order",
  req: "Requisition",
  iss: "Issue",
  ret: "Return to supplier"
};
const AP_KINDS = ["lpo", "req", "iss", "ret"];
const apList = kind =>
  kind === "ret" ? grList() : kind === "lpo" ? LPOS : kind === "req" ? REQS : ISSUES;
const apFind = (kind, id) => apList(kind).find(x => x.id === id);
const apPending = () =>
  AP_KINDS.flatMap(kind =>
    apList(kind)
      .filter(x => x.status === AWAIT)
      .map(d => ({ kind, d }))
  );
const apCount = () => apPending().length;
/** Approve / Reject buttons for a document waiting for approval. */
const apButtons = (kind, d) =>
  d.status === AWAIT && boCan("inv.approve")
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
/** Issues now, for a requisition or by someone allowed to approve: no second approval. */
function issueNow(from, to, lines, note, src, req, who) {
  const x = raiseIssue(from, to, lines, note, src, req),
    err = apApprove("iss", x, who);
  if (err) {
    ISSUES.splice(ISSUES.indexOf(x), 1);
    bosave();
    toast(err);
    return null;
  }
  bosave();
  return x;
}
/** Everything still owed on an approved requisition that the store has. */
function reqIssueLines(r) {
  const st = r.store || STORES[0],
    lines = [];
  r.lines.forEach(x => {
    const q = Math.min(x.q - x.issued - reqPend(r, x.k), have(st, x.k));
    if (q > 1e-9) lines.push({ k: x.k, q });
  });
  return lines;
}
/** Moves what the store has for an approved requisition. Says what's still short. */
function reqIssueAll(r, who) {
  const st = r.store || STORES[0],
    lines = reqIssueLines(r);
  if (lines.length) issueNow(st, r.dept, lines, "", "requisition", r.id, who);
  const left = r.lines.filter(x => x.issued < x.q - 1e-9);
  return left.length
    ? `${esc(st)} is short of ${left.map(x => itemInfo(x.k).name).join(", ")}. It stays open under Requisitions.`
    : `Stock moved to ${r.dept}.`;
}
/** Notes raised behind a requisition that was already approved were waiting for nothing. */
function apClearDoubles() {
  let moved = false;
  ISSUES.filter(x => x.status === AWAIT && x.req).forEach(x => {
    const r = REQS.find(y => y.id === x.req);
    if (r && r.appr && !apApprove("iss", x, r.appr.by)) moved = true;
  });
  if (moved) bosave();
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
  if (kind === "ret") return grApply(d, who);
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
  if (kind === "ret")
    return `<tr><th>Item</th><th class="n">To return</th><th class="n">In ${esc(d.store)}</th><th class="n">Value (KES)</th></tr>${d.lines.map(x => `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qtyBoth(x.k, x.q)}</td><td class="n ${have(d.store, x.k) < x.q - 1e-9 ? "bad" : ""}">${qtyBoth(x.k, have(d.store, x.k))}</td><td class="n">${m2(x.gross)}</td></tr>`).join("")}<tr><td colspan="3"><b>Reason: ${esc(d.why)}</b></td><td class="n"><b>${m2(grAmount(d))}</b></td></tr>`;
  const from = kind === "req" ? d.store || STORES[0] : d.from;
  return `<tr><th>Item</th><th class="n">${kind === "req" ? "Requested" : "To issue"}</th><th class="n">In ${esc(from)}</th><th class="n">Value at cost (KES)</th></tr>${d.lines
    .map(
      x =>
        `<tr><td>${esc(itemInfo(x.k).name)}</td><td class="n">${qtyBoth(x.k, x.q)}</td><td class="n ${have(from, x.k) < x.q - 1e-9 ? "neg" : ""}">${qtyBoth(x.k, have(from, x.k))}</td><td class="n">${m2(x.q * cst(x.k))}</td></tr>`
    )
    .join("")}`;
}
const apTitle = (kind, d) =>
  kind === "ret"
    ? `${d.id} · back to ${esc(d.sup)} from ${esc(d.store)}`
    : kind === "lpo"
      ? `${d.id} · ${esc(d.sup)} → ${esc(d.store)}`
      : kind === "req"
        ? `${d.id} · ${esc(d.dept)} asks ${esc(d.store || STORES[0])}`
        : `${d.id} · ${esc(d.from)} → ${esc(d.to)}${d.req ? " · for " + esc(d.req) : ""}`;

function apModalIfOpen() {
  const d = apM && apFind(apM.kind, apM.id);
  if (!d || d.status !== AWAIT) return "";
  const rej = apM.act === "reject";
  return `<div class="modal show" id="apModal" style="z-index:75"><div class="box" style="max-width:720px">
  <div class="fr" style="align-items:center;justify-content:space-between"><h3>${rej ? "Reject" : "Approve"} ${AP_KIND[apM.kind].toLowerCase()}</h3><button class="mini" data-a="ap_close" aria-label="Close">✕</button></div>
  <div class="stk"><b>${apTitle(apM.kind, d)}</b> · raised by ${esc(d.by)} · ${dt2(d.at)}${d.note ? " · " + esc(d.note) : ""}</div>
  <div class="tw"><table class="t">${apDocLines(apM.kind, d)}</table></div>
  ${rej ? `<label>Reason<input id="apWhy" placeholder="Why is it rejected?"></label>` : ""}
  <div class="stk">${rej ? "Rejecting" : "Approving"} as <b>${esc(boUser.n)}</b>.</div>
  <div class="stk">${apM.kind === "ret" && !rej ? "Approving takes the stock out now and reduces what's owed to the supplier." : apM.kind === "iss" && !rej ? "Approving moves the stock now." : apM.kind === "lpo" && !rej ? "Once approved the order can be received." : apM.kind === "req" && !rej ? "Once approved the store can issue it." : ""}</div>
  <div class="fr" style="justify-content:flex-end"><button class="mini" data-a="ap_close">Cancel</button><button class="chip on" data-a="ap_ok">${rej ? "Reject" : "Approve"}</button></div>
 </div></div>`;
}

// ---------------------------------------------------------------- Inventory → Approvals
function apView() {
  const P = apPending(),
    n = k => P.filter(x => x.kind === k).length,
    done = AP_KINDS.flatMap(kind =>
      apList(kind)
        .filter(d => d.appr || d.rej)
        .map(d => ({ kind, d, t: (d.appr || d.rej).at }))
    )
      .sort((a, b) => (a.t < b.t ? 1 : -1))
      .slice(0, 25),
    detail = (kind, d) =>
      kind === "ret"
        ? `${d.lines.map(x => `${esc(itemInfo(x.k).name)} ${qn(x.q)}`).join(", ")} · KES ${m2(grAmount(d))} · ${esc(d.why)}`
        : kind === "lpo"
          ? `${d.lines.length} line(s) · KES ${m2(lpoTotal(d))}`
          : d.lines.map(x => `${esc(itemInfo(x.k).name)} ${qtyBoth(x.k, x.q)}`).join(", ");
  return `<div class="pn"><h4>Approvals</h4><div class="stk">Purchase orders, requisitions and issues wait here until a manager approves them with their PIN. Stock is only issued once its issue note is approved.</div></div>
 <div class="kstg">${[
   ["Purchase orders", n("lpo")],
   ["Requisitions", n("req")],
   ["Issues", n("iss")],
   ["Supplier returns", n("ret")]
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
            `<tr><td>${dt2(x.at)}</td><td>${esc(x.id)}${x.req ? `<div class="stk">${esc(x.req)}</div>` : ""}</td><td>${esc(x.to)}</td><td>${x.lines.map(l => `${esc(itemInfo(l.k).name)} ${qtyBoth(l.k, l.q)}`).join(", ")}</td><td>${esc(x.by)}</td><td><span class="tag ${x.status === "Issued" ? "ok" : x.status === "Rejected" ? "bad" : "warn"}">${esc(x.status)}</span>${apNote(x) ? `<div class="stk">${apNote(x)}</div>` : ""}</td><td><div class="fr" style="flex-wrap:nowrap">${apButtons("iss", x)}${docBtn("iss", x.id, "View or print")}</div></td></tr>`
        ).join("")}</table>`
      : '<div class="empty">No issue notes yet.</div>'
  }</div>`;
}

// ---------------------------------------------------------------- dashboard: Approvals & tasks
/** Approved requisitions the store still has to issue. */
const apToIssue = () => REQS.filter(isOpenReq);
/** Latest approved requisitions and issue notes that need nothing more. */
const apRecent = n =>
  [...REQS.filter(r => r.appr && !isOpenReq(r)), ...ISSUES.filter(x => x.appr)]
    .sort((a, b) => (a.appr.at < b.appr.at ? 1 : -1))
    .slice(0, n);
/** Rows for the dashboard panel: waiting for a decision, approved to issue, recently approved. */
function apHomeHTML() {
  const head = (t, n) =>
      n
        ? `<div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin:12px 0 2px">${t}</div>`
        : "",
    row = (c, ic, t, s, btns) =>
      `<div class="row"><span class="ri ${c}">${I(ic)}</span><div class="t"><b>${t}</b><span>${s}</span></div>${btns ? `<div style="display:flex;gap:5px">${btns}</div>` : ""}</div>`,
    decide = (kind, d) =>
      `<button class="mini ok" data-a="ap_open" data-k="${kind}" data-id="${esc(d.id)}" data-act="approve">Approve</button><button class="mini" data-a="ap_open" data-k="${kind}" data-id="${esc(d.id)}" data-act="reject">Reject</button>`,
    items = d => d.lines.map(x => `${esc(itemInfo(x.k).name)} ${qtyBoth(x.k, x.q)}`).join(", "),
    wait = apPending().sort((a, b) => (a.d.at < b.d.at ? -1 : 1)),
    todo = apToIssue(),
    recent = apRecent(5);
  return (
    head("Waiting for approval", wait.length) +
    wait
      .map(({ kind, d }) =>
        row(
          "w",
          kind === "lpo" ? "truck" : kind === "req" ? "book" : "cart",
          `${AP_KIND[kind]} ${esc(d.id)}`,
          `${apTitle(kind, d).replace(esc(d.id) + " · ", "")} · ${kind === "lpo" ? "KES " + m2(lpoTotal(d)) : items(d)}`,
          decide(kind, d)
        )
      )
      .join("") +
    head("Approved · to issue", todo.length) +
    todo
      .map(r => {
        const st = r.store || STORES[0],
          held = r.lines.reduce((a, x) => a + reqPend(r, x.k), 0);
        return row(
          "i",
          "book",
          `Requisition ${esc(r.id)}`,
          `${esc(r.dept)} asks ${esc(st)} · ${items(r)}${held ? " · issue note waiting for approval" : ""}`,
          `<button class="mini" data-a="ap_issue" data-id="${esc(r.id)}">Issue stock</button>`
        );
      })
      .join("") +
    head("Recently approved", recent.length) +
    recent
      .map(d =>
        row(
          "g",
          "check",
          `${d.from ? "Issue" : "Requisition"} ${esc(d.id)}`,
          `${d.from ? esc(d.from) + " → " + esc(d.to) : esc(d.dept) + " · " + esc(d.status)} · ${apNote(d)}`
        )
      )
      .join("")
  );
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
  if (a === "issue") {
    // An approved requisition on the dashboard: issue it from here.
    const r = REQS.find(x => x.id === d.id);
    if (!r) return all();
    toast(reqIssueAll(r, boUser.n));
    return all();
  }
  if (a === "close") {
    apM = null;
    return all();
  }
  if (a === "ok") {
    const doc = apM && apFind(apM.kind, apM.id),
      why = (($("#apWhy") || {}).value || "").trim(),
      mgr = { n: boUser.n }; // the right is checked before any button action runs (ACT_RIGHTS)
    if (!doc || doc.status !== AWAIT) {
      apM = null;
      return all();
    }
    if (apM.act === "reject" && !why) return toast("Enter the reason for rejecting.");
    const kind = apM.kind;
    let extra = "";
    if (apM.act === "reject") apReject(kind, doc, mgr.n, why);
    else {
      const err = apApprove(kind, doc, mgr.n);
      if (err) return toast(err);
      // Approving a requisition is the only approval it needs: the stock goes now.
      if (kind === "req") extra = " " + reqIssueAll(doc, mgr.n);
    }
    apM = null;
    bosave();
    toast(
      `${AP_KIND[kind]} ${doc.id} ${doc.status === "Rejected" ? "rejected" : "approved"} by ${mgr.n}.${kind === "ret" && doc.status === "Returned" ? " The return note is ready to print." : ""}` +
        (kind === "iss" && doc.status === "Issued" ? ` Stock moved to ${doc.to}.` : extra)
    );
    return all();
  }
}
apClearDoubles();

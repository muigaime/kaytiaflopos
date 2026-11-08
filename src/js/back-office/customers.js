// ---- Customers: credit customers, their terms, what they owe, statements and payments ----
const CU_TYPES = ["Company", "Individual", "Government", "NGO"];
const cuS = { f: "all", ed: null, pay: null, st: null };
const cuPays = c => (FD_SETTINGS.custPays || []).filter(p => p.n === c.n);
const cuUsed = c => (c.limit > 0 ? c.owes / c.limit : c.owes > 0 ? 1 : 0);
const cuOver = c => c.limit > 0 && c.owes > c.limit;
function cuState(c) {
  if (c.off) return ["", "On hold"];
  if (cuOver(c)) return ["bad", "Over limit"];
  if (cuUsed(c) >= 0.8) return ["warn", "Near limit"];
  return ["ok", "Active"];
}
const cuFilters = [
  ["all", "All", () => true],
  ["owing", "Owing", c => c.owes > 0],
  ["over", "Over limit", cuOver],
  ["hold", "On hold", c => c.off]
];
/** What was charged to this customer and what they've paid, oldest first, with a running balance. */
function cuStatement(c) {
  const ci = CU.indexOf(c),
    rows = [
      ...SALES.filter(s => s.slip && (s.slip.credits || []).some(x => x.ci === ci)).map(s => ({
        at: new Date(s.at),
        ref: s.no,
        what: `Bill ${s.no}${s.label ? " · " + s.label : ""}`,
        dr: s.slip.credits.filter(x => x.ci === ci).reduce((a, x) => a + x.amt, 0),
        cr: 0
      })),
      ...cuPays(c).map(p => ({
        at: new Date(p.at),
        ref: p.ref || "",
        what: "Payment received" + (p.by ? " · " + p.by : ""),
        dr: 0,
        cr: p.amt
      }))
    ].sort((a, b) => a.at - b.at);
  // Whatever the bills on record don't explain was owed before bills recorded who it was for.
  const open = c.owes - rows.reduce((a, r) => a + r.dr - r.cr, 0);
  let bal = open;
  rows.forEach(r => (r.bal = bal += r.dr - r.cr));
  return { open, rows };
}
function cuStatementHTML(c) {
  const S = cuStatement(c),
    line = (l, v) => (v ? `<div><span>${l}</span><b>${esc(v)}</b></div>` : "");
  return `<div class="cu-doc"><header><div><h2>${esc(FD_SETTINGS.name)}</h2><p>Customer statement</p></div><div class="cu-doc-d">${dateGB(ymdOf(new Date()))}</div></header>
  <div class="cu-doc-m">${line("Customer", c.n)}${line("Contact", c.contact)}${line("Phone", c.phone)}${line("Email", c.email)}${line("KRA PIN", c.kra)}${line("Credit terms", c.terms ? c.terms + " days" : "")}</div>
  <table><thead><tr><th>Date</th><th>Details</th><th>Reference</th><th class="n">Charged</th><th class="n">Paid</th><th class="n">Balance</th></tr></thead><tbody>
  <tr><td></td><td>Brought forward</td><td></td><td></td><td></td><td class="n">${m2(S.open)}</td></tr>
  ${S.rows.map(r => `<tr><td>${dateGB(ymdOf(r.at))}</td><td>${esc(r.what)}</td><td>${esc(r.ref)}</td><td class="n">${r.dr ? m2(r.dr) : ""}</td><td class="n">${r.cr ? m2(r.cr) : ""}</td><td class="n">${m2(r.bal)}</td></tr>`).join("")}
  </tbody><tfoot><tr><td colspan="5">Balance due</td><td class="n">KES ${m2(c.owes)}</td></tr></tfoot></table></div>`;
}
const CU_LIMITS = [
  [0, "Cash only"],
  [10000, "10,000"],
  [25000, "25,000"],
  [50000, "50,000"],
  [100000, "100,000"],
  [250000, "250,000"]
];
const CU_DAYS = [7, 14, 30, 60];
/** What the limit typed so far means, in words. */
function cuLimitNote(raw, c) {
  const n = parseFloat(raw);
  if (raw === "" || !(n >= 0))
    return "Set how much this customer may owe. Charges above it are refused at the POS and the Front Desk.";
  const owes = c ? c.owes || 0 : 0;
  if (n === 0)
    return owes > 0
      ? `No new credit allowed. They still owe KES ${m2(owes)}.`
      : "Cash only: nothing can be charged to this account.";
  return owes > n
    ? `They owe KES ${m2(owes)}, which is KES ${m2(owes - n)} over this limit. New charges will be refused.`
    : `Can owe up to KES ${m2(n)}.${owes > 0 ? ` Owes KES ${m2(owes)} now, KES ${m2(n - owes)} still available.` : " Charges above it are refused at the POS and the Front Desk."}`;
}
function cuFormHTML() {
  const me = cuS.ed.i < 0 ? null : CU[cuS.ed.i],
    c = me || {},
    f = (l, k, attrs = "", wide = "") =>
      `<label class="${wide}"><span>${l}</span><input id="cu_${k}" value="${esc(c[k] === undefined ? "" : c[k])}" ${attrs}></label>`,
    sec = (ic, t, body) =>
      `<section class="cuf-s"><h4><span class="ph-i">${I(ic)}</span>${t}</h4><div class="cuf-g">${body}</div></section>`,
    limit = c.limit === undefined ? "" : String(c.limit),
    terms = c.terms === undefined ? "" : String(c.terms);
  return `<div class="modal show" id="cuEd" style="z-index:66"><div class="box itm cuf">
  <header class="itm-h cuf-h"><span class="cuf-av" id="cuAv" aria-hidden="true">${esc((c.n || "+")[0].toUpperCase())}</span><div><h3>${me ? "Edit " + esc(c.n) : "New customer"}</h3><p>Customers with credit can be charged from the POS and the Front Desk.</p></div><button class="itm-x" data-a="cu_edno" aria-label="Close">✕</button></header>
  <div class="itm-b cuf-b"><div class="cuf-main">
   ${sec(
     "users",
     "Customer details",
     f(
       "Customer or company name <em>Required</em>",
       "n",
       'maxlength="80" autocomplete="off"',
       "cuf-w"
     ) +
       `<label><span>Type</span><select id="cu_type">${CU_TYPES.map(t => `<option ${t === (c.type || "Company") ? "selected" : ""}>${t}</option>`).join("")}</select></label>` +
       f("Account code", "code", 'maxlength="20" placeholder="Your own reference"') +
       f(
         "KRA PIN",
         "kra",
         'maxlength="11" style="text-transform:uppercase" placeholder="A000000000B"'
       ) +
       f("ID or registration no", "idNo", 'maxlength="30"')
   )}
   ${sec(
     "phone",
     "Contact",
     f("Contact person", "contact", 'maxlength="60"') +
       f("Job title", "job", 'maxlength="40"') +
       f("Phone", "phone", 'type="tel" maxlength="20" placeholder="07XX XXX XXX"') +
       f("Other phone", "phone2", 'type="tel" maxlength="20"') +
       f("Email", "email", 'type="email" maxlength="80"', "cuf-w")
   )}
   ${sec(
     "home",
     "Address",
     f("Physical address", "addr", 'maxlength="120"', "cuf-w") +
       f("Town", "town", 'maxlength="40"') +
       f("P.O. Box", "box", 'maxlength="30"')
   )}
   ${sec(
     "book",
     "Notes",
     `<label class="cuf-w"><span>Anything staff should know</span><textarea id="cu_notes" rows="2" maxlength="300">${esc(c.notes || "")}</textarea></label>`
   )}
  </div>
  <div class="cuf-credit">
   <h4><span class="ph-i">${I("cash")}</span>Credit account</h4>
   <label class="cuf-lim"><span>Credit limit <em>Required</em></span><span class="cuf-amt"><i>KES</i><input id="cu_limit" type="number" min="0" step="any" inputmode="decimal" value="${esc(limit)}" placeholder="0"></span></label>
   <div class="cuf-chips" role="group" aria-label="Common credit limits">${CU_LIMITS.map(([v, l]) => `<button type="button" class="${limit === String(v) ? "on" : ""}" data-a="cu_lim" data-v="${v}">${l}</button>`).join("")}</div>
   <p class="cuf-note" id="cuLimNote">${cuLimitNote(limit, me)}</p>
   <label class="cuf-days"><span>Days to pay</span><input id="cu_terms" type="number" min="0" step="1" value="${esc(terms)}" placeholder="e.g. 30"></label>
   <div class="cuf-chips cuf-chips4" role="group" aria-label="Common payment terms">${CU_DAYS.map(v => `<button type="button" class="${terms === String(v) ? "on" : ""}" data-a="cu_days" data-v="${v}">${v} days</button>`).join("")}</div>
   <label class="cuf-hold"><input id="cu_off" type="checkbox" ${c.off ? "checked" : ""}><span><b>On hold</b><small>Can't be charged until this is cleared</small></span></label>
  </div></div>
  <footer class="itm-f"><button class="mini" data-a="cu_edno">Cancel</button><button class="chip on" data-a="cu_save">Save customer</button></footer></div></div>`;
}
/** Keep the note and the quick buttons in step with what is typed. */
function cuFormSync() {
  const lim = $("#cu_limit"),
    days = $("#cu_terms"),
    mark = (a, v) =>
      document
        .querySelectorAll(`#cuEd [data-a="${a}"]`)
        .forEach(b => b.classList.toggle("on", b.dataset.v === v));
  if (!lim) return;
  mark("cu_lim", lim.value.trim());
  mark("cu_days", days.value.trim());
  $("#cuLimNote").textContent = cuLimitNote(
    lim.value.trim(),
    cuS.ed && cuS.ed.i >= 0 ? CU[cuS.ed.i] : null
  );
}
function cuPayHTML() {
  const c = CU[cuS.pay];
  return `<div class="modal show" id="cuPay" style="z-index:66"><div class="box itm cu-box cu-small"><header class="cu-h"><div><h3>Receive payment</h3><p>${esc(c.n)} owes KES ${m2(c.owes)}</p></div><button class="mini" data-a="cu_payno">Close</button></header>
  <div class="cu-g"><label>Amount (KES)<input id="cu_amt" type="number" min="0" step="any" value="${c.owes > 0 ? c.owes : ""}"></label><label>Receipt or reference no<input id="cu_ref" maxlength="30" autocomplete="off"></label></div>
  <footer class="cu-f"><button class="mini" data-a="cu_payno">Cancel</button><button class="chip on" data-a="cu_paygo">Record payment</button></footer></div></div>`;
}
function cuStHTML() {
  const c = CU[cuS.st];
  return `<div class="modal show" id="cuSt" style="z-index:66"><div class="box itm cu-box"><header class="cu-h"><div><h3>Statement</h3><p>${esc(c.n)}</p></div><span><button class="mini" data-a="cu_stprint">Print</button> <button class="mini" data-a="cu_stno">Close</button></span></header>${cuStatementHTML(c)}</div></div>`;
}
function customersHTML() {
  const edit = boCan("cust.manage"),
    pay = boCan("cust.pay"),
    month = ymdOf(new Date()).slice(0, 7),
    got = (FD_SETTINGS.custPays || [])
      .filter(p => ymdOf(new Date(p.at)).slice(0, 7) === month)
      .reduce((a, p) => a + p.amt, 0),
    pick = cuFilters.find(x => x[0] === cuS.f) || cuFilters[0],
    L = CU.map((c, i) => [c, i]).filter(([c]) => pick[2](c));
  return `<div class="stm-tiles">${msTile("Customers", CU.length)}${msTile("Owed to you", "KES " + m2(sum(CU, c => c.owes)))}${msTile("Over their limit", CU.filter(cuOver).length, "", CU.some(cuOver) ? "warn" : "")}${msTile("Received this month", "KES " + m2(got))}</div>
  <div class="pn cu-list"><div class="cu-bar"><label class="find"><input id="cuQ" type="search" placeholder="Find a name, phone, PIN or code" autocomplete="off" aria-label="Find a customer"></label><span class="pr-pills">${cuFilters.map(([k, l, t]) => `<button class="pr-pill ${k === pick[0] ? "on" : ""}" data-a="cu_f" data-k="${k}">${l} <b>${CU.filter(t).length}</b></button>`).join("")}</span>${edit ? '<button class="chip on cu-new" data-a="cu_new">New customer</button>' : ""}</div>
  ${
    L.length
      ? `<div class="tw"><table class="t cu-t"><thead><tr><th>Customer</th><th>Contact</th><th>Terms</th><th class="n">Limit</th><th class="n">Owes</th><th>Credit used</th><th>Status</th><th></th></tr></thead><tbody>${L.map(
          ([c, i]) => {
            const st = cuState(c),
              used = Math.round(cuUsed(c) * 100);
            return `<tr data-cu-row="${esc([c.n, c.contact, c.phone, c.phone2, c.email, c.kra, c.code, c.town].filter(Boolean).join(" ").toLowerCase())}"><td><span class="ws-a">${esc((c.n || "?")[0])}</span> <span class="cu-nm"><b>${esc(c.n)}</b><small>${esc(c.type || "Company")}${c.code ? " · " + esc(c.code) : ""}${c.kra ? " · " + esc(c.kra) : ""}</small></span></td><td><span class="cu-nm">${esc(c.contact || "-")}<small>${esc(c.phone || "")}</small></span></td><td>${c.terms ? esc(c.terms) + " days" : "-"}</td><td class="n">${m2(c.limit)}</td><td class="n"><b>${m2(c.owes)}</b></td><td><span class="cu-m ${cuOver(c) ? "over" : ""}" role="img" aria-label="${used}% of the limit used"><i style="width:${Math.min(100, used)}%"></i></span><small class="cu-pc">${used}%</small></td><td><span class="tag ${st[0]}">${st[1]}</span></td><td class="n cu-a"><button class="mini" data-a="cu_st" data-i="${i}">Statement</button>${pay ? `<button class="mini" data-a="cu_pay" data-i="${i}" ${c.owes > 0 ? "" : "disabled"}>Receive</button>` : ""}${edit ? `<button class="mini" data-a="cu_edit" data-i="${i}">Edit</button>` : ""}</td></tr>`;
          }
        ).join("")}</tbody></table></div>`
      : '<div class="empty">No customers here.</div>'
  }</div>${cuS.ed ? cuFormHTML() : ""}${cuS.pay !== null ? cuPayHTML() : ""}${cuS.st !== null ? cuStHTML() : ""}`;
}
function cuSave() {
  const v = k => $("#cu_" + k).value.trim(),
    n = v("n"),
    limit = parseFloat(v("limit")),
    terms = v("terms") === "" ? "" : parseInt(v("terms"), 10),
    kra = v("kra").toUpperCase(),
    email = v("email"),
    me = cuS.ed.i < 0 ? null : CU[cuS.ed.i];
  if (!n) return toast("Enter the customer's name.");
  if (CU.some(c => c !== me && c.n.toLowerCase() === n.toLowerCase()))
    return toast(`${n} is already a customer.`);
  if (terms !== "" && !(terms >= 0)) return toast("Enter the days to pay as a number.");
  if (kra && !/^[A-Z][0-9]{9}[A-Z]$/.test(kra))
    return toast("A KRA PIN has a letter, nine digits and a letter.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return toast("That email address doesn't look right.");
  if (!(limit >= 0)) {
    $("#cu_limit").focus();
    return toast("Enter a credit limit. Use 0 for a cash-only customer.");
  }
  const rec = {
    n,
    limit,
    terms,
    kra,
    email,
    off: $("#cu_off").checked,
    type: v("type"),
    notes: v("notes")
  };
  ["code", "idNo", "contact", "job", "phone", "phone2", "addr", "town", "box"].forEach(
    k => (rec[k] = v(k))
  );
  if (me) {
    // Payments are filed under the name, so they follow it.
    if (me.n !== n)
      (FD_SETTINGS.custPays || []).forEach(p => {
        if (p.n === me.n) p.n = n;
      });
    Object.assign(me, rec);
  } else CU.push({ ...rec, owes: 0, since: new Date().toISOString() });
  auditAdd("Customers", `${me ? "Updated" : "Added"} customer ${n}`);
  cuS.ed = null;
  bosave();
  toast(`${n} saved.`);
  all();
}
function cuPayGo() {
  const c = CU[cuS.pay],
    q = parseFloat($("#cu_amt").value);
  if (!(q > 0)) return toast("Enter an amount.");
  if (q > c.owes + 0.009) return toast(`${c.n} only owes KES ${m2(c.owes)}.`);
  c.owes = Math.max(0, c.owes - q);
  (FD_SETTINGS.custPays = FD_SETTINGS.custPays || []).push({
    at: new Date().toISOString(),
    n: c.n,
    amt: q,
    ref: $("#cu_ref").value.trim(),
    by: boUser.n
  });
  auditAdd("Customers", `Payment of KES ${m2(q)} received from ${c.n}`);
  cuS.pay = null;
  bosave();
  toast("Payment recorded.");
  all();
}
function cuAct(a, b) {
  const i = +b.dataset.i;
  // Quick buttons fill the box: redrawing would lose what has been typed.
  if (a === "cu_lim" || a === "cu_days") {
    $(a === "cu_lim" ? "#cu_limit" : "#cu_terms").value = b.dataset.v;
    return cuFormSync();
  }
  if (a === "cu_f") cuS.f = b.dataset.k;
  else if (a === "cu_new" || a === "cu_edit") {
    if (!boCan("cust.manage")) return boDenied();
    cuS.ed = { i: a === "cu_new" ? -1 : i };
  } else if (a === "cu_edno") cuS.ed = null;
  else if (a === "cu_save") {
    if (!boCan("cust.manage")) return boDenied();
    return cuSave();
  } else if (a === "cu_pay") {
    if (!boCan("cust.pay")) return boDenied();
    cuS.pay = i;
  } else if (a === "cu_payno") cuS.pay = null;
  else if (a === "cu_paygo") {
    if (!boCan("cust.pay")) return boDenied();
    return cuPayGo();
  } else if (a === "cu_st") cuS.st = i;
  else if (a === "cu_stno") cuS.st = null;
  else if (a === "cu_stprint") return printHTML(cuStatementHTML(CU[cuS.st]), false, "A4");
  all();
}
$("#vSub").addEventListener("input", e => {
  if (e.target.id === "cu_n")
    $("#cuAv").textContent = (e.target.value.trim()[0] || "+").toUpperCase();
  if (e.target.id === "cu_limit" || e.target.id === "cu_terms") cuFormSync();
  if (e.target.id !== "cuQ") return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll("#vSub [data-cu-row]").forEach(tr => {
    tr.hidden = !!q && !tr.dataset.cuRow.includes(q);
  });
});

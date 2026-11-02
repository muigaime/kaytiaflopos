// ---- returning items from a paid bill ----
// Sales are never deleted. A return needs a Manager or Super Cashier PIN, puts the items back in stock and
// adds a credit note: a sale with negative amounts, so every report nets off and the original bill stays.
const retLeft = s => l => l.q - ((s.returned || {})[l.id] || 0);
const retCan = no =>
  !/^FD-/.test(no) &&
  SALES.some(s => s.no === no && !s.ret && s.lines.some(l => get(l.id) && retLeft(s)(l) > 0));
/** A paid bill as the void screen expects it: what can still come back, and what each unit was paid at. */
function retBill(no) {
  const S = SALES.filter(s => s.no === no && !s.ret),
    lines = {},
    info = {};
  S.forEach(s => {
    const sub = s.lines.reduce((a, l) => a + l.p * l.q, 0),
      k = sub ? s.g / sub : 0;
    s.lines.forEach(l => {
      const left = retLeft(s)(l);
      if (get(l.id) && left > 0) {
        lines[l.id] = left;
        info[l.id] = { ...l, k, s };
      }
    });
  });
  return {
    no,
    label: S[0].label,
    dept: S.map(s => s.dept).join(", "),
    waiter: S[0].waiter || S[0].user,
    lines,
    info,
    S
  };
}
function retOpen(no) {
  bopt = { act: "ret", bill: retBill(no) };
  $("#bopWheel").style.display = "none";
  boptEl("Box").style.display = "";
  boptEl("Box").classList.remove("bop-tr");
  boptEl("Box").classList.add("bop-void");
  boptEl("Body").innerHTML =
    `<h3>Return items</h3><p class="stk">${slipEsc(bopt.bill.label)} · ${slipEsc(no)}. A Manager or Super Cashier needs to authorize this.</p>
  <input id="bopPin" type="password" inputmode="numeric" autocomplete="off" placeholder="Authorizing PIN"><div class="bop-msg" id="bopMsg"></div>
  <div class="row"><button class="mini" data-close>Cancel</button><button class="chip on" data-bg="auth">Continue</button></div>`;
  $("#mBopt").classList.add("show");
  $("#bopPin").focus();
}
const RETURN_REASONS = [
  "Customer changed",
  "Item spoilt",
  "Wrong item served",
  "Price error on system",
  "Double entry",
  "Goods returned"
];
function retForm() {
  const b = bopt.bill;
  bopt.vq = Object.fromEntries(Object.keys(b.lines).map(id => [id, 0]));
  boptEl("Body").innerHTML =
    `<h3>Return items</h3><p class="stk"><b>${slipEsc(b.label)}</b> · ${slipEsc(b.dept)} · ${slipEsc(b.no)} · authorized by ${slipEsc(bopt.by)}</p>
  <div class="bv-wrap"><table class="bv-t"><thead><tr><th>Selected</th><th>Code</th><th>Description</th><th class="n">Qty</th><th class="n">Paid each</th><th class="n">Value</th></tr>
  <tr class="bv-f"><td colspan="6"><input id="bopVF" placeholder="Filter items" autocomplete="off"></td></tr></thead><tbody id="bopVRows"></tbody></table></div>
  <div class="bv-sum"><label class="bop-c"><input type="checkbox" id="bopVAll"> Select all</label><div id="bopVSum"></div></div>
  <div class="bv-rs">${RETURN_REASONS.map(r => `<button class="bv-r" data-vw="${r}">${r}</button>`).join("")}</div>
  <label>Return reason<textarea id="bopWhy" rows="2" placeholder="Tap a reason above or type your own"></textarea></label>
  <div class="status">The items go back into stock, and the bill's own payment methods are refunded. The original bill stays on record.</div>
  <div class="bop-msg" id="bopMsg"></div>
  <div class="bv-go"><button class="bv-void" data-bg="save">Return items</button><button class="bv-close" data-close>Close</button></div>`;
  retRows();
}
const retValue = (i, q) => i.p * q * i.k;
function retRows() {
  const b = bopt.bill,
    f = boptEl("VF").value.trim().toLowerCase(),
    ids = Object.keys(b.lines);
  $("#bopVRows").innerHTML =
    ids
      .filter(id => !f || `${id} ${b.info[id].n}`.toLowerCase().includes(f))
      .map(id => {
        const i = b.info[id],
          n = b.lines[id],
          v = bopt.vq[id];
        return `<tr class="${v ? "on" : ""}" data-vr="${id}"><td><input type="checkbox" tabindex="-1" ${v ? "checked" : ""}></td><td>${slipEsc(id)}</td><td class="d">${slipEsc(i.n)}</td><td class="n">${
          v && n > 1
            ? `<span class="qc"><button data-vs="${id}" data-d="-1" ${v <= 1 ? "disabled" : ""}>−</button><b>${v}</b><button data-vs="${id}" data-d="1" ${v >= n ? "disabled" : ""}>+</button></span><small>of ${n}</small>`
            : n
        }</td><td class="n">${bill2(i.p * i.k)}</td><td class="n">${bill2(retValue(i, n))}</td></tr>`;
      })
      .join("") || '<tr><td colspan="6" class="bv-none">No items match.</td></tr>';
  const qty = Object.values(bopt.vq).reduce((a, q) => a + q, 0),
    val = ids.reduce((a, id) => a + retValue(b.info[id], bopt.vq[id]), 0);
  boptEl("VAll").checked = ids.every(id => bopt.vq[id] >= b.lines[id]);
  $("#bopVSum").innerHTML =
    `<span class="${qty ? "bv-out" : ""}">Returning <b>${KES(val)}</b>${qty ? ` · ${qty} item${qty > 1 ? "s" : ""}` : ""}</span>`;
}
function retSave() {
  const b = bopt.bill,
    V = Object.entries(bopt.vq).filter(([, q]) => q > 0),
    why = boptEl("Why").value.trim();
  if (!V.length) return boptMsg("Tick the items to return.");
  if (!why) return boptMsg("Tap or type the reason for the return.");
  const no = "RET-" + pad(new Set(SALES.filter(s => s.ret).map(s => s.no)).size + 1, 4),
    at = new Date();
  let total = 0,
    credit = 0;
  b.S.forEach(s => {
    const here = V.filter(([id]) => b.info[id].s === s);
    if (!here.length) return;
    const g = here.reduce((a, [id, q]) => a + retValue(b.info[id], q), 0),
      k = s.g ? g / s.g : 0,
      mx = {};
    Object.entries(s.mx || {}).forEach(([m, v]) => (mx[m] = -v * k));
    credit -= mx.credit || 0;
    total += g;
    s.returned = s.returned || {};
    here.forEach(([id, q]) => {
      s.returned[id] = (s.returned[id] || 0) + q;
      itemStockMove(get(id), -q);
    });
    SALES.push({
      no,
      ord: s.ord,
      at,
      bd: bizDate(),
      dept: s.dept,
      label: s.label,
      user: s.user,
      waiter: s.waiter || s.user,
      guest: s.guest,
      covers: s.covers,
      room: s.room,
      rates: s.rates,
      net: -(g - s.tax * k),
      tax: -s.tax * k,
      g: -g,
      lines: here.map(([id, q]) => {
        const i = b.info[id];
        return { id: i.id, n: i.n, q: -q, p: i.p, t: i.t };
      }),
      disc: -(s.disc || 0) * k,
      pl: s.pl || "",
      mx,
      ret: { of: b.no, why, by: bopt.by }
    });
  });
  // What was on a customer's account comes off it. Older bills didn't keep whose account that was.
  const keep = (b.S.find(s => s.slip) || {}).slip,
    owed = keep && keep.credits;
  let left = credit;
  (owed || []).forEach(c => {
    const take = Math.min(left, c.amt, CU[c.ci] ? CU[c.ci].owes : 0);
    if (take > 0) {
      CU[c.ci].owes -= take;
      left -= take;
    }
  });
  // What was put on a room comes off its folio.
  const roomBack = SALES.filter(s => s.no === no).reduce((a, s) => a - ((s.mx || {}).room || 0), 0);
  if (roomBack > 0.004 && keep && keep.roomId) roomCharge(keep.roomId, -roomBack, `Return ${no}`);
  if (left > 0.009) SALES.filter(s => s.no === no).forEach(s => (s.ret.byHand = left));
  boptLog(
    "Return",
    b,
    why,
    `${no}: ` + V.map(([id, q]) => `${q} ${b.info[id].n}`).join(", ") + " · back in stock",
    -total,
    {
      points: [...new Set(V.map(([id]) => b.info[id].s.dept))],
      waiter: b.waiter
    }
  );
  boptDone(`Items returned: ${KES(total)}.`);
  if (window.boRedraw) boRedraw();
  showRc(returnSlipHTML(no), null, "Close");
}
/** The credit note, from what was saved. */
function returnSlipHTML(no, copy, B = slipBiz()) {
  const S = SALES.filter(s => s.no === no),
    A = S[0],
    tot = k => Math.abs(S.reduce((a, s) => a + (s[k] || 0), 0)),
    lines = S.flatMap(s => s.lines).map(l => ({ q: -l.q, n: l.n, p: l.p, t: l.t })),
    paid = {};
  S.forEach(s => Object.entries(s.mx || {}).forEach(([m, v]) => (paid[m] = (paid[m] || 0) - v)));
  return `<div class="slip">${slipHead("Credit Note", S.map(s => s.dept).join(", "), B)}${copy ? `<div class="sl-stamp">Reprinted</div><div class="sl-copy">Copy ${copy}</div>` : ""}${slipMeta(
    [
      ["Credit note", no],
      ["Original bill", A.ret.of],
      ["Order no", A.ord],
      ["Served by", A.waiter || A.user],
      ["Table", A.label],
      ["Guest", A.guest || "N/A"],
      ["Room", A.room],
      ["Authorized by", A.ret.by, 1],
      ["Date / time", slipStamp(A.at), 1]
    ]
  )}${slipMoneyRows(lines)}${slipTotals({
    sub: lines.reduce((a, l) => a + l.p * l.q, 0),
    disc: tot("disc"),
    net: tot("net"),
    tax: tot("tax"),
    g: tot("g")
  })}<div class="sl-paid"><h5>Refunded by</h5>${Object.entries(paid)
    .filter(([, v]) => v > 0)
    .map(([m, v]) => slipRow(m === "comp" ? "Complimentary, no refund" : MN[m] || m, bill2(v)))
    .join(
      ""
    )}</div><div class="sl-note">Reason: ${slipEsc(A.ret.why)}</div>${A.ret.byHand ? `<div class="sl-note">Take KES ${bill2(A.ret.byHand)} off the customer's account by hand.</div>` : ""}${slipSign()}${slipFoot()}</div>`;
}

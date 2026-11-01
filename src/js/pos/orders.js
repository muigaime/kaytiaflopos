// ---- send order first, bill and charge later ----
let orders = [],
  cur = null,
  ono = 1,
  payOrder = null,
  selTbl = "";
const TBL = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "Takeaway"];
const visOrders = () => orders.filter(o => DEPTS.includes(o.dept));
const hhmm = d => d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
const cnt = c => Object.values(c).reduce((a, b) => a + b, 0);
function showRc(html, charge, closeLbl) {
  $("#rc").innerHTML = html;
  $("#rcClose").textContent = closeLbl;
  const b = $("#rcCharge");
  b.style.display = charge ? "" : "none";
  b.onclick = charge
    ? () => {
        $("#mRc").classList.remove("show");
        openPay([charge]);
      }
    : null;
  $("#mRc").classList.add("show");
}
function drawTbl() {
  $("#tbls").innerHTML = TBL.map(
    t => `<button class="chip ${t === selTbl ? "on" : ""}" data-t="${t}">${t}</button>`
  ).join("");
}
$("#tbls").onclick = e => {
  const t = e.target.dataset.t;
  if (!t) return;
  selTbl = t;
  $("#lbl").value = t;
  drawTbl();
};
$("#sendBtn").onclick = () => {
  if (!Object.keys(cart).length) return;
  if (cur) return doSend(cur.label);
  const l0 = $("#fTable").value.trim() || $("#fGuest").value.trim();
  if (l0) return doSend(l0);
  selTbl = "";
  $("#lbl").value = "";
  drawTbl();
  $("#mSend").classList.add("show");
};
$("#sendGo").onclick = () => {
  const l = $("#lbl").value.trim();
  if (!l) {
    $("#lbl").focus();
    return;
  }
  doSend(l);
};
function doSend(label) {
  const round = { ...cart };
  let o = cur || orders.find(x => x.dept === dept && x.label.toLowerCase() === label.toLowerCase());
  if (!o) {
    o = {
      no: "ORD-" + String(ono++).padStart(3, "0"),
      label,
      dept,
      lines: {},
      rounds: 0,
      at: new Date(),
      guest: $("#fGuest").value.trim(),
      covers: $("#fCov").value.trim(),
      rider: rider,
      waiter: user ? user.n : ""
    };
    orders.push(o);
  } else if (rider && !o.rider) o.rider = rider;
  for (const [id, q] of Object.entries(round)) {
    o.lines[id] = (o.lines[id] || 0) + q;
    itemStockMove(get(id), q);
  }
  o.rounds++;
  cart = {};
  cur = null;
  $("#mSend").classList.remove("show");
  drawCart();
  showRc(
    `<b>KITCHEN / BAR ORDER</b><br>${o.dept} · <b>${o.label}</b><br>${o.no} · Round ${o.rounds}<br>${hhmm(new Date())} · ${user ? user.n : ""}${o.guest ? "<br>Guest: " + o.guest + (o.covers ? " · Covers: " + o.covers : "") : ""}${o.rider ? "<br>Rider: " + o.rider.n + " " + o.rider.p + " " + o.rider.a : ""}<hr>` +
      Object.entries(round)
        .map(([id, q]) => `<div class="r"><b>${q} × ${get(id).n}</b></div>`)
        .join("") +
      `<hr>${kmsg ? "<b>NOTE: " + kmsg + "</b><br>" : ""}Sent. Bill and charge later from Orders.`,
    null,
    "Close"
  );
  kmsg = "";
  rider = null;
  ["fTable", "fGuest", "fCov"].forEach(i => ($("#" + i).value = ""));
  drawCart();
}
function ordList() {
  const L = visOrders();
  $("#ordList").innerHTML = L.length
    ? L.map(o => {
        const t = totals(o.lines);
        return `<div class="ord"><div class="h"><span>${o.label} · ${o.dept}</span><span>${KES(t.g)}</span></div><div class="m">${o.no} · ${cnt(o.lines)} items · ${o.rounds} round${o.rounds > 1 ? "s" : ""} · sent ${hhmm(o.at)} · <b>SENT</b></div><div class="row"><button class="mini" data-oa="add" data-o="${o.no}">Add items</button><button class="mini" data-oa="bill" data-o="${o.no}">Print bill</button><button class="mini" data-oa="swap" data-o="${o.no}">Swap</button><button class="chip on" data-oa="pay" data-o="${o.no}">Charge</button></div></div>`;
      }).join("")
    : '<div class="empty">No open orders. Use Send order to start one.</div>';
}
$("#ordBtn").onclick = () => {
  ordList();
  $("#mOrd").classList.add("show");
};
$("#ordList").onclick = e => {
  const a = e.target.dataset.oa;
  if (!a) return;
  const o = orders.find(x => x.no === e.target.dataset.o);
  if (!o) return;
  $("#mOrd").classList.remove("show");
  if (a === "swap") {
    exOpen(o);
    return;
  }
  if (a === "add") {
    dept = o.dept;
    cur = o;
    cart = {};
    drawDepts();
    drawCats();
    drawCart();
  }
  if (a === "pay") {
    openPay([o]);
  }
  if (a === "bill") {
    const t = totals(o.lines);
    showRc(
      `<b>MWANGAZA SUPERMART</b><br>PROFORMA BILL<br>(not a tax invoice)<br>${o.label} · ${o.dept} · ${o.no}<br>${o.rider ? "Rider: " + o.rider.n + " " + o.rider.p + "<br>" : ""}${new Date().toLocaleString("en-KE")}<hr>` +
        Object.entries(o.lines)
          .map(
            ([id, q]) =>
              `<div class="r"><span>${q} × ${get(id).n}</span><span>${(get(id).p * q).toFixed(2)}</span></div>`
          )
          .join("") +
        `<hr><div class="r"><span>Net</span><span>${t.net.toFixed(2)}</span></div><div class="r"><span>VAT</span><span>${t.tax.toFixed(2)}</span></div><div class="r"><b>TOTAL</b><b>${t.g.toFixed(2)}</b></div><hr>Please pay at the till.<br>Tax invoice issued on payment.`,
      o,
      "Close"
    );
  }
};

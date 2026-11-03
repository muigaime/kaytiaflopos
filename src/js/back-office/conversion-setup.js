// ---- Products: item stock conversion, such as one Amarula 750ml bottle yielding 25 tots ----
// The product gets its own balance at the selling point. It's never issued or bought: when it runs out
// during a sale, the POS opens an issued bottle at that selling point (see catalog-stock.js).
let cvE = null;
/** The conversion a product sells from: its balance item and that item's setup, or nothing. */
function cvOf(i) {
  const k = Object.keys(i.r || {})[0],
    c = k && stockConvs()[k];
  return c ? { k, ...c } : null;
}
const cvParents = () => pickKeys().sort((a, b) => itemInfo(a).name.localeCompare(itemInfo(b).name));
function cvCell(i) {
  const c = cvOf(i);
  return `<span class="acc-cell">${c ? `${esc(itemInfo(c.from).name)} → ${qn(c.y)} per ${qn(c.pq)}` : "–"}</span> <button class="mini" data-a="cv_open" data-id="${i.id}" aria-label="Stock conversion for ${esc(i.n)}">${c ? "Edit" : "Set"}</button>`;
}
function cvDraw() {
  const old = document.querySelector("#cvEd");
  if (old) old.remove();
  if (!cvE) return;
  const F = cvE,
    i = ITEMS.find(x => x.id === F.id),
    c = cvOf(i),
    K = cvParents(),
    loc = itemLoc(i);
  if (!F.from || !K.includes(F.from)) F.from = K[0] || "";
  const u = F.from ? itemInfo(F.from) : null,
    pq = parseFloat(F.pq),
    y = parseFloat(F.y),
    each = u && pq > 0 && y > 0 ? (cst(F.from) * pq) / y : 0;
  $("#vSub").insertAdjacentHTML(
    "beforeend",
    `<div class="modal show" id="cvEd" style="z-index:63"><div class="box itm">
  <header class="itm-h"><div><h3>Stock conversion · ${esc(i.n)}</h3><p>Product code ${i.id} · sold at ${esc(i.d)}</p></div><button class="itm-x" data-a="cv_close" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><h4>Converted from</h4>
   ${
     K.length
       ? `<div class="itm-g cv-g"><label class="cv-wide">Item name<select id="cvFrom">${K.map(k => `<option value="${esc(k)}" ${k === F.from ? "selected" : ""}>${esc(itemInfo(k).name)}</option>`).join("")}</select></label>
     <label>Item code<input readonly value="${esc(u.code || "-")}"></label>
     <label>Units<input readonly value="${esc(u.uom)}"></label>
     <label>Item cost<input readonly value="${m2(cst(F.from))}"></label>
     <label>Parent quantity<input id="cvPq" type="number" min="0" step="any" value="${esc(F.pq)}"></label>
     <label>Yield<input id="cvY" type="number" min="1" step="any" value="${esc(F.y)}" placeholder="e.g. 25"></label>
     <label>Cost of each<input id="cvEach" readonly value="${each ? m2(each) : ""}"></label></div>
     <div class="itm-hint">${u ? `<b>${esc(u.name)}</b> issued to ${esc(loc)}: ${qn(have(loc, F.from))} ${esc(u.uom)}` : ""}${c ? ` · ${esc(i.n)} left: ${qn(have(loc, c.k))}` : ""}. When ${esc(i.n)} reaches zero, a sale opens the next one automatically. Only the ${esc(u.name)} is issued from the store.</div>`
       : '<div class="empty">No stock items yet. Add the bottle under Inventory → Item setup first.</div>'
   }</section>
   ${
     Object.keys(i.r || {}).length && !c
       ? `<section class="itm-s"><div class="itm-hint">Saving replaces what this product deducts today: ${esc(
           Object.keys(i.r)
             .map(k => itemInfo(k).name)
             .join(", ")
         )}.</div></section>`
       : ""
   }
  </div>
  <footer class="itm-f">${c ? `<button class="mini cat-del" style="margin-right:auto" data-a="cv_del">Delete conversion</button>` : ""}<button class="mini" data-a="cv_close">Cancel</button><button class="chip on" data-a="cv_save" ${K.length ? "" : "disabled"}>Save conversion</button></footer></div></div>`
  );
}
function cvRead() {
  ["from", "pq", "y"].forEach(f => {
    const el = $("#cv" + { from: "From", pq: "Pq", y: "Y" }[f]);
    if (el) cvE[f] = el.value;
  });
}
function cvSave() {
  cvRead();
  const i = ITEMS.find(x => x.id === cvE.id),
    pq = parseFloat(cvE.pq),
    y = parseFloat(cvE.y),
    was = cvOf(i);
  if (!(pq > 0)) return toast("Enter the parent quantity, usually 1.");
  if (!(y > 0)) return toast("Enter how many this produces, such as 25.");
  let k = was && was.k;
  if (!k) {
    // The product's own balance: a stock item that only ever fills up from conversion.
    k = itemKey(i.n);
    INGU[k] = {
      code: nextItemCode(),
      name: i.n,
      group: itemInfo(cvE.from).group,
      uom: "tot",
      buyUnit: "tot",
      perBuy: 1,
      buyPrice: 0
    };
    ING[k] = i.n + " (tot)";
    LOCS.forEach(l => (STK[l][k] = STK[l][k] || 0));
    RO[k] = 0;
    i.r = { [k]: 1 };
    delete i.from;
  }
  stockConvs()[k] = { from: cvE.from, pq, y };
  cvE = null;
  bosave();
  toast(`Saved. ${qn(pq)} ${itemInfo(stockConvs()[k].from).name} gives ${qn(y)} ${i.n}.`);
  all();
}
/** Back to deducting part of the bottle. Anything left over goes back to the bottles it came from. */
function cvDelete() {
  const i = ITEMS.find(x => x.id === cvE.id),
    c = cvOf(i);
  if (!c) return;
  const per = c.pq / c.y;
  LOCS.forEach(l => {
    const left = have(l, c.k);
    if (Math.abs(left) > 1e-9) {
      mv(l, c.k, -left, "CONVERT", "Conversion removed");
      mv(l, c.from, left * per, "CONVERT", "Conversion removed");
    }
  });
  i.r = { [c.from]: per };
  delete stockConvs()[c.k];
  stockConvGone()[c.k] = 1;
  cvE = null;
  bosave();
  toast("Conversion deleted.");
  all();
}
function cvAct(a, b) {
  if (!boCan("prod.manage")) return boDenied();
  if (a === "cv_open") {
    const i = ITEMS.find(x => x.id === +b.dataset.id),
      c = cvOf(i);
    cvE = {
      id: i.id,
      from: c ? c.from : "",
      pq: c ? String(c.pq) : "1",
      y: c ? String(c.y) : ""
    };
    return cvDraw();
  }
  if (a === "cv_close") {
    cvE = null;
    return cvDraw();
  }
  if (a === "cv_save") return cvSave();
  if (a === "cv_del") return cvDelete();
}
// The form follows the boxes as they change, without losing the place.
document.addEventListener("change", e => {
  if (e.target.id === "cvFrom" && cvE) {
    cvRead();
    cvDraw();
  }
});
document.addEventListener("input", e => {
  if (!cvE || (e.target.id !== "cvPq" && e.target.id !== "cvY")) return;
  cvRead();
  const pq = parseFloat(cvE.pq),
    y = parseFloat(cvE.y),
    box = $("#cvEach");
  if (box) box.value = pq > 0 && y > 0 ? m2((cst(cvE.from) * pq) / y) : "";
});

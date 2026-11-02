// ---- Products: how an item sells, and whether a food item asks for accompaniments ----
let accE = null;
const ACC_SELL = [
  ["normal", "Sold normally"],
  ["both", "Sold normally and as an accompaniment"],
  ["acc", "Only as an accompaniment"]
];
/** A product's accompaniment setup in the Products list. */
function accCell(i) {
  const text =
    [
      accAsks(i) ? "Sells with accompaniments" : "",
      i.sell === "acc" ? "Accompaniment only" : i.sell === "both" ? "Also an accompaniment" : ""
    ]
      .filter(Boolean)
      .join(" · ") || "–";
  return `<span class="acc-cell">${esc(text)}</span> <button class="mini" data-a="acc_open" data-id="${i.id}" aria-label="Accompaniments for ${esc(i.n)}">Set</button>`;
}
function accDraw() {
  const old = document.querySelector("#accEd");
  if (old) old.remove();
  if (!accE) return;
  const F = accE,
    it = ITEMS.find(x => x.id === F.id),
    food = isFoodItem(it),
    C = accSides(it);
  $("#vSub").insertAdjacentHTML(
    "beforeend",
    `<div class="modal show" id="accEd" style="z-index:63"><div class="box itm">
  <header class="itm-h"><div><h3>Accompaniments · ${esc(it.n)}</h3><p>Sold at ${esc(it.d)}</p></div><button class="itm-x" data-a="acc_close" aria-label="Close">✕</button></header>
  <div class="itm-b">
   <section class="itm-s"><h4>How this item sells</h4><div class="itm-g"><label>Sold<select id="accSell">${ACC_SELL.map(([v, l]) => `<option value="${v}" ${F.sell === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div><div class="itm-hint">Mark sides like Ugali or Chips here. As an accompaniment they go on the bill at no cost and still use their own stock. "Only as an accompaniment" takes them off the POS menu.</div></section>
   <section class="itm-s"><h4>Main item</h4>${
     food
       ? `<label class="set-opt"><input type="checkbox" id="accOn" data-a="acc_on" ${F.on ? "checked" : ""}><span>Sell with accompaniments<small>When this is sold, the POS asks for an accompaniment and attaches it at no cost.</small></span></label>${
           F.on
             ? `<div class="itm-hint">${C.length ? `The POS will offer: <b>${esc(C.map(x => x.n).join(", "))}</b>` : "No item is marked as an accompaniment yet. Open a side like Ugali here and change how it sells."}</div><label class="acc-n">How many the guest can choose<input id="accN" type="number" min="1" max="5" value="${esc(F.n)}"></label>`
             : ""
         }`
       : '<div class="stk">Only food items sell with accompaniments. This one is made at the bar.</div>'
   }</section>
  </div>
  <footer class="itm-f"><button class="mini" data-a="acc_close">Cancel</button><button class="chip on" data-a="acc_save">Save</button></footer></div></div>`
  );
}
function accRead() {
  accE.sell = $("#accSell").value;
  const on = $("#accOn");
  if (on) accE.on = on.checked;
  const n = $("#accN");
  if (n) accE.n = n.value;
}
function accSave() {
  accRead();
  const it = ITEMS.find(x => x.id === accE.id),
    n = parseInt(accE.n, 10);
  delete it.accs;
  if (accE.on && isFoodItem(it)) {
    if (!(n >= 1 && n <= 5)) return toast("The guest can choose from 1 to 5.");
    it.accAsk = true;
    it.accN = n;
  } else {
    delete it.accAsk;
    delete it.accN;
  }
  if (accE.sell === "normal") delete it.sell;
  else it.sell = accE.sell;
  accE = null;
  bosave();
  toast(`Saved for ${it.n}.`);
  all();
}
function accAct(a, b) {
  if (!boCan("prod.manage")) return boDenied();
  if (a === "acc_open") {
    const it = ITEMS.find(x => x.id === +b.dataset.id);
    accE = { id: it.id, sell: it.sell || "normal", on: accAsks(it), n: String(it.accN || 1) };
    return accDraw();
  }
  if (a === "acc_close") {
    accE = null;
    return accDraw();
  }
  if (a === "acc_save") return accSave();
  if (a === "acc_on") {
    accRead();
    accDraw();
  }
}

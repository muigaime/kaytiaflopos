// ---- modifiers: tapping a product asks its options in order, such as Cold or Warm, then Sprite or Coke ----
// Each combination is its own line on a bill, keyed "12~Cold~Sprite", so it prints and reports by name.
let modT = null,
  accT = null;
/** A product's options: its own, or else those set for its whole category. */
const itemMods = it => {
  const own = (it && it.mods) || [];
  return own.length ? own : (it && (FD_SETTINGS.catMods || {})[it.c]) || [];
};
/** A tap on a product: straight onto the order, or through its options first. */
function pickItem(id, q) {
  if (dayLockStop()) return;
  const it = get(id);
  if (!itemMods(it).length) return pickDone(id, q, it);
  accT = null;
  modT = { id, q, it, picks: [] };
  modDraw();
  $("#mMod").classList.add("show");
}
function modDraw() {
  const G = itemMods(modT.it),
    at = modT.picks.length,
    g = G[at];
  $("#modT").textContent = modT.it.n;
  $("#modS").textContent =
    `Option ${at + 1} of ${G.length}` + (modT.picks.length ? ` · ${modT.picks.join(", ")}` : "");
  $("#modO").innerHTML = g.o
    .map(x => `<button class="mod-o" data-mo="${slipEsc(x)}">${slipEsc(x)}</button>`)
    .join("");
  $("#modBack").style.display = at ? "" : "none";
}
$("#modO").onclick = e => {
  const ac = e.target.closest("[data-ac]");
  if (ac) return accPick(ac.dataset.ac);
  const b = e.target.closest("[data-mo]");
  if (!b) return;
  modT.picks.push(b.dataset.mo);
  if (modT.picks.length < itemMods(modT.it).length) return modDraw();
  $("#mMod").classList.remove("show");
  pickDone([modT.id, ...modT.picks].join("~"), modT.q, modT.it);
};
$("#modBack").onclick = () => {
  modT.picks.pop();
  modDraw();
};
// ---- accompaniments: a food item can ask what goes with it, at zero price ----
const isFoodItem = it => orderStation(it) === "Kitchen";
const accUsable = it => it.sell === "both" || it.sell === "acc";
/** A food item that sells with accompaniments. */
const accAsks = it => isFoodItem(it) && !!(it.accAsk || (it.accs || []).length);
/** Every item marked as an accompaniment, except the main item itself. */
const accSides = it =>
  ITEMS.filter(x => accUsable(x) && String(x.id) !== String(it.id).split("~")[0]);
/** The item is on the order. If it's a food item with accompaniments, ask for them next. */
function pickDone(id, q, it) {
  id = happyKey(id);
  const before = cart[id] || 0;
  add(id, q);
  const added = (cart[id] || 0) - before,
    L = accAsks(it) ? accSides(it) : [];
  if (added <= 0 || !L.length) return;
  q = added;
  accT = {
    it,
    q,
    L,
    left: Math.min(it.accN || 1, L.length),
    n: Math.min(it.accN || 1, L.length),
    got: []
  };
  accDraw();
  $("#mMod").classList.add("show");
}
function accDraw() {
  $("#modT").textContent = accT.it.n;
  $("#modS").textContent =
    accT.n > 1
      ? `Choose accompaniment ${accT.n - accT.left + 1} of ${accT.n} · no charge`
      : "Choose an accompaniment · no charge";
  $("#modO").innerHTML =
    accT.L.map(x => {
      const left = avail(x) - inCart(x.id);
      return `<button class="mod-o" data-ac="${x.id}" ${left < accT.q ? "disabled" : ""}>${slipEsc(x.n)}${left < accT.q ? "<small>Out of stock</small>" : ""}</button>`;
    }).join("") +
    `<button class="mod-o mod-none" data-ac="">${accT.got.length ? "That's all" : "No accompaniment"}</button>`;
  $("#modBack").style.display = "none";
}
function accPick(id) {
  if (id) {
    // The line remembers its main item, and shows it on the bill.
    add([id, ACC_MARK, String(accT.it.id).split("~")[0]].join("~"), accT.q);
    accT.got.push(id);
    accT.L = accT.L.filter(x => String(x.id) !== id);
    accT.left--;
  }
  if (id && accT.left > 0 && accT.L.length) return accDraw();
  $("#mMod").classList.remove("show");
  accT = null;
}

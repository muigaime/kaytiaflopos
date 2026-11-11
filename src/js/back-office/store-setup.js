// ---- Inventory → Stores: create, edit and delete a store, and say what kind of items it holds ----
let stE = null,
  stDel = null;
const storeInfos = () => FD_SETTINGS.storeInfo || (FD_SETTINGS.storeInfo = {});
const storeKinds = l => (storeInfos()[l] || {}).kinds || [];
/** Does this store list this item? It does if the item's category is ticked on the store, or nothing is ticked. */
const storeHolds = (l, k) => {
  const norm = s =>
      String(s || "")
        .trim()
        .toLowerCase(),
    K = storeKinds(l).map(norm);
  return !K.length || K.includes(norm(itemInfo(k).group));
};
/** The store Receive goods opens on: the one marked as default, or the first store (Main Store). */
const defaultStore = () => STORES.find(l => (storeInfos()[l] || {}).def) || STORES[0];
/** The store that holds this kind of item, if one says so. */
const storeForKind = g => {
  const x = String(g || "")
    .trim()
    .toLowerCase();
  return x ? STORES.find(l => storeKinds(l).some(k => k.toLowerCase() === x)) : "";
};
/** A word of warning when an item's category isn't what the store holds. Nothing is refused. */
function storeKindNote(store, g) {
  const K = storeKinds(store),
    x = String(g || "")
      .trim()
      .toLowerCase();
  if (!K.length) return "";
  if (!x || K.some(k => k.toLowerCase() === x)) return `${store} holds ${K.join(", ")}.`;
  return `${store} normally holds ${K.join(", ")}, not ${g}.`;
}
const storeKindCell = l =>
  storeKinds(l).length
    ? storeKinds(l)
        .map(k => `<span class="pr-cat" style="--h:${hue(k)}">${esc(k)}</span>`)
        .join(" ")
    : '<span class="stk">Any item</span>';
function storeModal() {
  if (!stE) return "";
  const G = [...new Set([...groupList(), ...stE.kinds])].sort((a, b) => a.localeCompare(b));
  return `<div class="modal show" id="stEd" style="z-index:63"><div class="box itm sp-new">
  <header class="itm-h"><div><h3>${stE.was ? `Edit ${esc(stE.was)}` : "New store"}</h3><p>Stores hold the stock you buy. Selling points get their stock from a store.</p></div><button class="itm-x" data-a="inv_stclose" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><div class="itm-g"><label>Store name<input id="stName" maxlength="40" value="${esc(stE.name)}" placeholder="e.g. Beverages Store, Kitchen Store" autocomplete="off"></label></div><label class="mp-on" style="margin-top:12px"><input id="stDef" type="checkbox" ${stE.def ? "checked" : ""}><span><b>Default store for receiving goods</b><small>Receive goods opens on this store, and lists only the items it holds.</small></span></label></section>
  <section class="itm-s"><div class="sp-acts" style="justify-content:space-between"><h4>Kinds of items it holds</h4><span class="sp-acts"><button class="mini" data-a="inv_stall">Select all</button><button class="mini" data-a="inv_stnone">Clear</button></span></div><div class="itm-hint">Tick what belongs here. Its Stock Master lists these categories. New items in them go to this store unless you choose another. Leave them all unticked if it holds anything.</div><div class="pr-ticks">${G.map(k => `<label><input type="checkbox" data-stk="${esc(k)}" ${stE.kinds.includes(k) ? "checked" : ""}> ${esc(k)}</label>`).join("")}</div></section></div>
  <footer class="itm-f"><button class="mini" data-a="inv_stclose">Cancel</button><button class="chip on" data-a="inv_stsave">${stE.was ? "Save changes" : "Create store"}</button></footer></div></div>`;
}
/** A store's new name reaches every record that mentions it. Selling point and store names never overlap. */
function storeRenameEverywhere(was, now) {
  const FIELDS = new Set(["store", "from", "to", "loc", "peer", "dept", "place"]),
    walk = x => {
      if (Array.isArray(x)) return x.forEach(walk);
      if (!x || typeof x !== "object" || x instanceof Date) return;
      Object.keys(x).forEach(k => {
        if (FIELDS.has(k) && x[k] === was) x[k] = now;
        else if (typeof x[k] === "object") walk(x[k]);
      });
    };
  [MOV, REQS, COUNTS, GRNS, LPOS, ISSUES, PRODS, ITEMS].forEach(walk);
  Object.values(OUTLET_INFO).forEach(i => i.store === was && (i.store = now));
  STK[now] = STK[was];
  delete STK[was];
  STORES[STORES.indexOf(was)] = now;
  if (STKT.loc === was) STKT.loc = now;
  if (storeInfos()[was]) {
    storeInfos()[now] = storeInfos()[was];
    delete storeInfos()[was];
  }
  ["st", "it", "sd", "spf", "spr"].forEach(f => {
    if (invF[f] && invF[f].store === was) invF[f].store = now;
  });
  syncLocs();
}
function storeSave() {
  const name = $("#stName").value.trim(),
    was = stE.was,
    kinds = [...document.querySelectorAll("#stEd [data-stk]")]
      .filter(x => x.checked)
      .map(x => x.dataset.stk);
  if (name.toLowerCase() !== was.toLowerCase()) {
    const err = placeNameError(name);
    if (err) return toast(err);
  } else if (!name) return toast("Enter a name.");
  if (was) {
    if (name !== was) storeRenameEverywhere(was, name);
  } else {
    STORES.push(name);
    syncLocs();
  }
  const def = !!($("#stDef") && $("#stDef").checked);
  if (def) Object.values(storeInfos()).forEach(i => delete i.def);
  storeInfos()[name] = { kinds, ...(def ? { def: true } : {}) };
  auditAdd(
    "Store",
    was ? (name === was ? `${name} edited` : `${was} renamed to ${name}`) : `${name} created`
  );
  stE = null;
  bosave();
  toast(was ? `${name} saved.` : `${name} created. Receive stock into it in Purchasing.`);
  all();
}
/** What has to happen before a store can go. Its history stays in the reports. */
function storeDeleteCheck(l) {
  const held = Object.keys(ING).filter(k => Math.abs(have(l, k)) > 1e-9),
    pts = ALLD.filter(o => (OUTLET_INFO[o] || {}).store === l),
    reqs = REQS.filter(
      r => (r.store || STORES[0]) === l && (isOpenReq(r) || r.status === AWAIT)
    ).length,
    lpos = LPOS.filter(p => p.store === l && lpoOpen(p)).length,
    notes = ISSUES.filter(x => x.status === AWAIT && x.from === l).length,
    block = [];
  if (STORES.length < 2) block.push("It is the only store. The system needs at least one.");
  if (held.length)
    block.push(
      `It still holds ${held.length} item(s), such as ${held
        .slice(0, 3)
        .map(k => `${itemInfo(k).name} ${qn(have(l, k))} ${itemInfo(k).uom}`)
        .join(", ")}. Issue them, or count them to zero in a stock take.`
    );
  if (pts.length)
    block.push(`${pts.join(", ")} get stock from it. Change that under Selling points → Settings.`);
  if (reqs) block.push(`It has ${reqs} requisition(s) still open.`);
  if (lpos) block.push(`It has ${lpos} LPO(s) still open.`);
  if (notes) block.push(`${notes} issue note(s) from it are waiting for approval.`);
  return block;
}
function storeDeleteModal() {
  if (!stDel) return "";
  const B = storeDeleteCheck(stDel);
  return `<div class="modal show" id="stDelM" style="z-index:63"><div class="box itm sp-new">
  <header class="itm-h"><div><h3>Delete ${esc(stDel)}?</h3><p>${B.length ? "This store can't be deleted yet." : "Past movements stay in your reports under its name."}</p></div><button class="itm-x" data-a="inv_stdelno" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s">${B.length ? `<ul class="pr-list">${B.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : '<div class="itm-hint">It holds no stock and nothing is waiting on it.</div>'}</section></div>
  <footer class="itm-f"><button class="mini" data-a="inv_stdelno">${B.length ? "Close" : "Cancel"}</button>${B.length ? "" : '<button class="chip on cat-del" data-a="inv_stdelyes">Delete store</button>'}</footer></div></div>`;
}
function storeDelete() {
  if (storeDeleteCheck(stDel).length) return all();
  const l = stDel;
  STORES.splice(STORES.indexOf(l), 1);
  delete STK[l];
  delete storeInfos()[l];
  if (STKT.loc === l) STKT.loc = STORES[0];
  ["it", "sd", "spf", "spr"].forEach(f => {
    if (invF[f] && invF[f].store === l) invF[f].store = STORES[0];
  });
  syncLocs();
  auditAdd("Store", `${l} deleted`, { pri: "Critical" });
  stDel = null;
  bosave();
  toast(`${l} deleted.`);
  all();
}
/** Item form: the category chooses the store, and says so when the two don't match. */
function itemStoreMatch(f) {
  const F = invF.it,
    el = $("#itStoreNote");
  if (!F || !el) return;
  if (f === "group") {
    const s = storeForKind(F.group);
    if (s) {
      F.store = s;
      const box = document.querySelector('[data-iv="it.store"]');
      if (box) box.value = s;
    }
  }
  el.textContent = storeKindNote(F.store, F.group);
}

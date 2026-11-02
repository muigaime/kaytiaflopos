// ---- Product categories: the POS menu's categories, to add, rename, delete and give modifiers ----
// Selling points and Settings show the same screen. Deleting never removes a product:
// anything still in that category moves to another one first.
let catE = null;
const catRight = () => boCan("prod.manage") || boCan("sp.manage") || boCan("set.manage");
const catSaved = () => FD_SETTINGS.cats || (FD_SETTINGS.cats = []);
const prodCats = () =>
  [...new Set([...ITEMS.map(i => i.c), ...catSaved(), ...Object.keys(catMods())])].sort((a, b) =>
    a.localeCompare(b)
  );
/** Stock groups offered when setting up an item. */
const groupList = () =>
  [
    ...new Set([
      ...(FD_SETTINGS.itemGroups || ITEM_GROUPS),
      ...Object.keys(ING)
        .map(k => itemInfo(k).group)
        .filter(Boolean)
    ])
  ].sort((a, b) => a.localeCompare(b));
const catNameOf = el => el.value.trim().replace(/\s+/g, " ");
const catTaken = (name, not) =>
  prodCats().some(x => x !== not && x.toLowerCase() === name.toLowerCase());
let catQ = "";
const catHit = c => c.toLowerCase().includes(catQ.trim().toLowerCase());
/** One line for each category, so a long list stays short. It opens up only to rename or delete. */
function catCard(c) {
  const on = catE && catE.key === c,
    M = catMods()[c] || [],
    can = catRight(),
    n = ITEMS.filter(i => i.c === c).length;
  let more = "";
  if (on && catE.mode === "edit")
    more = `<div class="cat-q"><input id="catName" maxlength="40" value="${esc(c)}" aria-label="New name for ${esc(c)}" autocomplete="off"><button class="cat-b cat-go" data-a="cat_save">Save</button><button class="cat-b" data-a="cat_no">Cancel</button></div>`;
  if (on && catE.mode === "del") {
    const others = prodCats().filter(x => x !== c);
    more =
      n && !others.length
        ? `<div class="cat-q"><span>There's no other category to move its products to. Rename it instead.</span><button class="cat-b" data-a="cat_no">Close</button></div>`
        : `<div class="cat-q">${n ? `<label>Move its ${n === 1 ? "product" : `${n} products`} to<select id="catTo">${others.map(x => `<option>${esc(x)}</option>`).join("")}</select></label>` : "<span>Delete this category?</span>"}<button class="cat-b cat-del" data-a="cat_del">${n ? "Move and delete" : "Delete"}</button><button class="cat-b" data-a="cat_no">Cancel</button></div>`;
  }
  return `<article class="cat-card ${on ? "on" : ""}" data-cat="${esc(c)}" style="--h:${hue(c)}" ${catHit(c) ? "" : "hidden"}>
   <div class="cat-line"><span class="cat-mark" aria-hidden="true">${esc(c.charAt(0).toUpperCase())}</span><h5 title="${esc(c)}">${esc(c)}</h5>
   <div class="cat-mods" title="${esc(modText(M))}">${M.length ? M.map(g => `<span class="cat-group">${g.o.map(x => `<i>${esc(x)}</i>`).join("")}</span>`).join('<b aria-hidden="true">→</b>') : ""}</div>
   <div class="cat-btns">${boCan("prod.manage") ? `<button class="cat-b" data-a="mod_cat" data-c="${esc(c)}" aria-label="Modifiers for ${esc(c)}">Modifiers</button>` : ""}${can ? `<button class="cat-b" data-a="cat_edit" data-k="${esc(c)}" aria-label="Rename ${esc(c)}">Rename</button><button class="cat-b cat-del" data-a="cat_ask" data-k="${esc(c)}" aria-label="Delete ${esc(c)}">Delete</button>` : ""}</div></div>
   ${more}
  </article>`;
}
function categoriesHTML() {
  const P = prodCats();
  return `<section class="pn cat-panel"><header class="cat-head"><div><h4>Product categories (${P.length})</h4><p>A new category shows on the POS menu once it has a product.</p></div><div class="cat-add"><input id="catFind" value="${esc(catQ)}" placeholder="Search categories" aria-label="Search categories" autocomplete="off">${
    catRight()
      ? `<input id="catNew" maxlength="40" placeholder="New category" aria-label="New category name" autocomplete="off"><button class="chip on" data-a="cat_add">Add category</button>`
      : ""
  }</div></header>${
    P.length
      ? `<div class="cat-grid">${P.map(catCard).join("")}<div class="empty cat-nomatch" ${P.some(catHit) ? "hidden" : ""}>No category matches.</div></div>`
      : '<div class="empty">No categories yet. Add the first one above.</div>'
  }</section>`;
}
function catAdd() {
  const name = catNameOf($("#catNew"));
  if (!name) return toast("Enter a category name.");
  if (catTaken(name)) return toast(`${name} is already on the list.`);
  catSaved().push(name);
  bosave();
  toast(`${name} added.`);
  all();
}
function catRename() {
  const key = catE.key,
    name = catNameOf($("#catName"));
  if (!name) return toast("Enter a name.");
  if (name !== key) {
    if (catTaken(name, key))
      return toast(`${name} already exists. Use Delete to move everything into it.`);
    ITEMS.forEach(i => i.c === key && (i.c = name));
    if (catMods()[key]) {
      catMods()[name] = catMods()[key];
      delete catMods()[key];
    }
    FD_SETTINGS.cats = catSaved()
      .filter(x => x !== key)
      .concat(name);
  }
  catE = null;
  bosave();
  toast(`Saved as ${name}.`);
  all();
}
function catDelete() {
  const key = catE.key,
    box = $("#catTo");
  if (box) ITEMS.forEach(i => i.c === key && (i.c = box.value));
  delete catMods()[key];
  FD_SETTINGS.cats = catSaved().filter(x => x !== key);
  catE = null;
  bosave();
  toast(`${key} deleted.`);
  all();
}
function catAct(a, b) {
  if (!catRight()) return boDenied();
  if (a === "cat_add") return catAdd();
  if (a === "cat_save" && catE) return catRename();
  if (a === "cat_del" && catE) return catDelete();
  catE = a === "cat_no" ? null : { key: b.dataset.k, mode: a === "cat_edit" ? "edit" : "del" };
  all();
  if (a === "cat_edit") $("#catName").focus();
}
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if (e.target.id === "catNew") catAct("cat_add");
  if (e.target.id === "catName") catAct("cat_save");
});
// Category boxes on product forms offer the whole list.
document.addEventListener("focusin", e => {
  if (e.target.getAttribute && e.target.getAttribute("list") === "prodCatL")
    $("#prodCatL").innerHTML = prodCats()
      .map(c => `<option value="${esc(c)}">`)
      .join("");
});
document.addEventListener("input", e => {
  if (e.target.id !== "catFind") return;
  catQ = e.target.value;
  const L = [...document.querySelectorAll(".cat-card")];
  L.forEach(c => (c.hidden = !catHit(c.dataset.cat)));
  const none = document.querySelector(".cat-nomatch");
  if (none) none.hidden = L.some(c => !c.hidden);
});

// ---- Inventory: the categories store products belong to ----
let grpE = null;
const grpRight = () => boCan("inv.items");
const grpItems = g => Object.keys(ING).filter(k => itemInfo(k).group === g);
const grpTaken = (name, not) =>
  groupList().some(x => x !== not && x.toLowerCase() === name.toLowerCase());
function grpRow(g) {
  const on = grpE && grpE.key === g,
    n = grpItems(g).length,
    can = grpRight();
  let act = can
    ? `<button class="cat-b" data-a="grp_edit" data-k="${esc(g)}" aria-label="Edit ${esc(g)}">Edit</button><button class="cat-b cat-del" data-a="grp_ask" data-k="${esc(g)}" aria-label="Delete ${esc(g)}">Delete</button>`
    : "";
  let name = `<b>${esc(g)}</b>`;
  if (on && grpE.mode === "edit") {
    name = `<input id="grpName" maxlength="40" value="${esc(g)}" aria-label="New name for ${esc(g)}" autocomplete="off">`;
    act = `<button class="cat-b cat-go" data-a="grp_save">Save</button><button class="cat-b" data-a="grp_no">Cancel</button>`;
  }
  if (on && grpE.mode === "del") {
    const others = groupList().filter(x => x !== g);
    act =
      n && !others.length
        ? `<span class="stk">There's no other category to move these to.</span><button class="cat-b" data-a="grp_no">Close</button>`
        : `${n ? `<label class="grp-to">Move ${n === 1 ? "its item" : `${n} items`} to<select id="grpTo">${others.map(x => `<option>${esc(x)}</option>`).join("")}</select></label>` : '<span class="stk">Delete this?</span>'}<button class="cat-b cat-del" data-a="grp_del">${n ? "Move and delete" : "Delete"}</button><button class="cat-b" data-a="grp_no">Cancel</button>`;
  }
  return `<tr class="${on ? "on" : ""}" data-grp="${esc(g)}"><td>${name}</td><td class="n"><span class="grp-act">${act}</span></td></tr>`;
}
function storeCatsHTML() {
  const G = groupList();
  return `<section class="pn cat-panel"><header class="cat-head"><div><h4>Categories for store products (${G.length})</h4><p>The categories you choose from when setting up a stock item.</p></div>${
    grpRight()
      ? `<div class="cat-add"><input id="grpNew" maxlength="40" placeholder="New category" aria-label="New category name" autocomplete="off"><button class="chip on" data-a="grp_add">Add category</button></div>`
      : ""
  }</header>${
    G.length
      ? `<div class="tw grp-list"><table class="t"><tr><th>Category</th><th></th></tr>${G.map(grpRow).join("")}</table></div>`
      : '<div class="empty">No categories yet. Add the first one above.</div>'
  }</section>`;
}
function grpAct(a, b) {
  if (!grpRight()) return boDenied();
  const list = not => groupList().filter(x => x !== not),
    move = (from, to) => grpItems(from).forEach(k => (INGU[k] = { ...itemInfo(k), group: to })),
    done = msg => {
      grpE = null;
      bosave();
      toast(msg);
      all();
    };
  if (a === "grp_add") {
    const name = catNameOf($("#grpNew"));
    if (!name) return toast("Enter a category name.");
    if (grpTaken(name)) return toast(`${name} is already on the list.`);
    FD_SETTINGS.itemGroups = [...groupList(), name];
    return done(`${name} added.`);
  }
  if (a === "grp_save" && grpE) {
    const key = grpE.key,
      name = catNameOf($("#grpName"));
    if (!name) return toast("Enter a name.");
    if (name === key) return done(`Saved as ${name}.`);
    if (grpTaken(name, key))
      return toast(`${name} already exists. Use Delete to move everything into it.`);
    move(key, name);
    FD_SETTINGS.itemGroups = [...list(key), name];
    return done(`Saved as ${name}.`);
  }
  if (a === "grp_del" && grpE) {
    const key = grpE.key,
      box = $("#grpTo");
    if (box) move(key, box.value);
    FD_SETTINGS.itemGroups = list(key);
    return done(`${key} deleted.`);
  }
  grpE = a === "grp_no" ? null : { key: b.dataset.k, mode: a === "grp_edit" ? "edit" : "del" };
  all();
  if (a === "grp_edit") $("#grpName").focus();
}
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if (e.target.id === "grpNew") grpAct("grp_add");
  if (e.target.id === "grpName") grpAct("grp_save");
});

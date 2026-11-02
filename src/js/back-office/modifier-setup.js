// ---- Products: modifiers on one product, or on a whole category ----
const MOD_MAX = 5;
let modE = null;
const catMods = () => FD_SETTINGS.catMods || (FD_SETTINGS.catMods = {});
const modText = G => G.map(g => g.o.join(", ")).join(" → ");
/** A product's modifiers in the Products list, and where they come from. */
function modCell(i) {
  const own = (i.mods || []).length,
    cat = (catMods()[i.c] || []).length;
  return `${own ? esc(modText(i.mods)) : cat ? `<small>From category: ${esc(modText(catMods()[i.c]))}</small>` : "–"} <button class="mini" data-a="mod_item" data-id="${i.id}">${own ? "Edit" : "Add"}</button>`;
}
const MOD_CHOICES = 3,
  MOD_CHOICES_MAX = 12;
const modRow = (o = []) => ({
  o: [...o, ...Array(Math.max(0, MOD_CHOICES - o.length)).fill("")]
});
function modDraw() {
  const old = document.querySelector("#modEd");
  if (old) old.remove();
  if (!modE) return;
  const F = modE;
  $("#vSub").insertAdjacentHTML(
    "beforeend",
    `<div class="modal show" id="modEd" style="z-index:63"><div class="box itm">
  <header class="itm-h"><div><h3>Modifiers · ${esc(F.title)}</h3><p>${F.kind === "cat" ? "For every product in this category." : "For this product only."}</p></div><button class="itm-x" data-a="mod_close" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s">
   <label class="set-opt"><input type="checkbox" id="modOn" data-a="mod_on" ${F.on ? "checked" : ""}><span>Use modifiers<small>The POS asks each option in order before adding the item.</small></span></label>
   ${
     F.on
       ? F.rows
           .map(
             (r, i) =>
               `<div class="mod-r" data-mr="${i}"><div class="mod-rh"><b>Option ${i + 1}</b><button class="mini" data-a="mod_rm" data-i="${i}" aria-label="Remove option ${i + 1}">Remove</button></div><div class="mod-cs">${r.o
                 .map(
                   (c, j) =>
                     `<label>Choice ${j + 1}<input data-mc maxlength="30" value="${esc(c)}" placeholder="${i ? ["Sprite", "Coke", "Fanta"][j] || "" : ["Cold", "Warm", "Hot"][j] || ""}" autocomplete="off"></label>`
                 )
                 .join(
                   ""
                 )}${r.o.length < MOD_CHOICES_MAX ? `<button class="mini" data-a="mod_more" data-i="${i}">Add a choice</button>` : ""}</div></div>`
           )
           .join("") +
         (F.rows.length < MOD_MAX
           ? `<button class="mini" style="margin-top:10px" data-a="mod_add">Add option ${F.rows.length + 1}</button>`
           : "")
       : ""
   }
  </section></div>
  <footer class="itm-f"><button class="mini" data-a="mod_close">Cancel</button><button class="chip on" data-a="mod_save">Save modifiers</button></footer></div></div>`
  );
}
/** What's in the boxes now, kept while options are added or removed. */
function modRead() {
  const rows = [...document.querySelectorAll("#modEd [data-mr]")];
  if (rows.length)
    modE.rows = rows.map(r => ({
      o: [...r.querySelectorAll("[data-mc]")].map(c => c.value)
    }));
  modE.on = $("#modOn").checked;
}
function modOpen(kind, key, title, G) {
  modE = {
    kind,
    key,
    title,
    on: G.length > 0,
    rows: G.length ? G.map(g => modRow(g.o)) : [modRow()]
  };
  modDraw();
}
function modSave() {
  modRead();
  const G = [];
  if (modE.on)
    for (let i = 0; i < modE.rows.length; i++) {
      const r = modE.rows[i],
        // A line on a bill keeps its choices joined with ~, so that can't be part of one.
        o = [...new Set(r.o.map(x => x.replace(/~/g, "").trim()).filter(Boolean))];
      if (o.length) G.push({ o });
    }
  if (modE.on && !G.length) return toast("Add at least one choice, or untick Use modifiers.");
  if (modE.kind === "cat") {
    if (G.length) catMods()[modE.key] = G;
    else delete catMods()[modE.key];
  } else {
    const it = ITEMS.find(x => x.id === modE.key);
    if (G.length) it.mods = G;
    else delete it.mods;
  }
  bosave();
  const who = modE.title;
  modE = null;
  toast(G.length ? `Modifiers saved for ${who}.` : `Modifiers removed from ${who}.`);
  all();
}
function modAct(a, b) {
  if (!boCan("prod.manage")) return boDenied();
  if (a === "mod_cat")
    return modOpen("cat", b.dataset.c, b.dataset.c, catMods()[b.dataset.c] || []);
  if (a === "mod_item") {
    const it = ITEMS.find(x => x.id === +b.dataset.id);
    return modOpen("item", it.id, it.n, it.mods || []);
  }
  if (a === "mod_close") {
    modE = null;
    return modDraw();
  }
  if (a === "mod_save") return modSave();
  modRead();
  if (a === "mod_add") modE.rows.push(modRow());
  if (a === "mod_more") modE.rows[+b.dataset.i].o.push("");
  if (a === "mod_rm") modE.rows.splice(+b.dataset.i, 1);
  if (!modE.rows.length) modE.rows.push(modRow());
  modDraw();
}

// ---- Tables: the names waiters can pick when sending an order ----
// A table only identifies a bill, so any number of waiters can have bills on the same table at once.
const tbExists = (n, not) => TBL.some(t => t !== not && t.n.toLowerCase() === n.toLowerCase());
const tbSort = () => TBL.sort((a, b) => a.n.localeCompare(b.n, undefined, { numeric: true }));
const tbGroup = (title, type) => {
  const L = TBL.filter(t => t.t === type);
  return `<div class="pn"><h4>${title} (${L.length})</h4>${
    L.length
      ? `<div class="tb-grid">${L.map(
          t =>
            `<span class="tb-c"><input data-tbn="${TBL.indexOf(t)}" value="${esc(t.n)}" aria-label="Rename ${esc(t.n)}" autocomplete="off"><button data-a="tb_del" data-i="${TBL.indexOf(t)}" aria-label="Delete ${esc(t.n)}">×</button></span>`
        ).join("")}</div>`
      : '<div class="empty">None yet.</div>'
  }</div>`;
};
V.tables = () =>
  `<div class="pn"><h4>Add one</h4><div class="fr" style="align-items:end"><label>Name<input id="tbN" placeholder="e.g. T9, Terrace 2 or Delivery" autocomplete="off"></label><label>Type<select id="tbT"><option>Table</option><option>Takeaway</option></select></label><button class="chip on" style="flex:none" data-a="tb_add">Add</button></div>
 <h4 style="margin-top:16px">Add many at once</h4><div class="fr" style="align-items:end"><label>Starts with<input id="tbP" placeholder="e.g. T" autocomplete="off"></label><label>From<input id="tbF" type="number" min="0" placeholder="1"></label><label>To<input id="tbE" type="number" min="0" placeholder="50"></label><label>Type<select id="tbM"><option>Table</option><option>Takeaway</option></select></label><button class="chip on" style="flex:none" data-a="tb_many">Add all</button></div></div>
 ${tbGroup("Tables", "Table")}${tbGroup("Takeaways", "Takeaway")}`;
function tbAct(a, b) {
  if (a === "tb_add") {
    const n = $("#tbN").value.trim();
    if (!n) return toast("Enter a name.");
    if (n.length > 30) return toast("Keep the name to 30 characters.");
    if (tbExists(n)) return toast(`${n} is already on the list.`);
    TBL.push({ n, t: $("#tbT").value });
    toast(`${n} added.`);
  } else if (a === "tb_many") {
    const p = $("#tbP").value.trim(),
      f = parseInt($("#tbF").value, 10),
      e = parseInt($("#tbE").value, 10);
    if (!(f >= 0) || !(e >= f)) return toast("Enter the numbers to go from and to.");
    if (e - f >= 500) return toast("Add up to 500 at a time.");
    let added = 0;
    for (let i = f; i <= e; i++) {
      const n = p + i;
      if (!tbExists(n)) {
        TBL.push({ n, t: $("#tbM").value });
        added++;
      }
    }
    toast(added ? `${added} added.` : "Those are all on the list already.");
  } else if (a === "tb_del") {
    const t = TBL[+b.dataset.i];
    TBL.splice(+b.dataset.i, 1);
    toast(`${t.n} deleted. Open bills on it keep their name.`);
  }
  tbSort();
  bosave();
  all();
}
function tbRename(el) {
  const t = TBL[+el.dataset.tbn],
    n = el.value.trim();
  if (!n || n.length > 30 || tbExists(n, t)) {
    el.value = t.n;
    return toast(n ? "That name can't be used. Names must be different." : "Enter a name.");
  }
  t.n = n;
  tbSort();
  bosave();
  all();
}

// ---- Selling points: the price list, to view and to download as PDF or Excel ----
let plV = null;
const plPoints = () => ALLD.filter(posSells);
/** One table per selling point, by category and then by name. Sides sold only with a main aren't listed. */
function plSections() {
  const P = plV.pt === "All" ? plPoints() : [plV.pt],
    c = ["Code", "Product", "Category", "Tax", "#Price (KES)"];
  return P.map(p => ({
    t: p,
    c,
    r: ITEMS.filter(i => i.d === p && i.sell !== "acc" && (plV.cat === "All" || i.c === plV.cat))
      .sort((a, b) => a.c.localeCompare(b.c) || a.n.localeCompare(b.n))
      .map(i => [String(i.id), i.n, i.c, TAX[i.t] > 0 ? `${qn(TAX[i.t])}%` : "None", m2(i.p)])
  })).filter(s => s.r.length);
}
function plHead() {
  const where = plV.pt === "All" ? "All selling points" : plV.pt;
  return `${where}${plV.cat === "All" ? "" : ` · ${plV.cat}`} · as at ${dateGB(bizDate())}`;
}
function plHTML() {
  if (!plV) return "";
  const S = plSections(),
    n = S.reduce((a, s) => a + s.r.length, 0),
    cats = [
      ...new Set(
        ITEMS.filter(
          i => i.sell !== "acc" && (plV.pt === "All" ? plPoints().includes(i.d) : i.d === plV.pt)
        ).map(i => i.c)
      )
    ].sort((a, b) => a.localeCompare(b)),
    out = boCan("rep.print");
  return `<div class="modal show" id="plView" style="z-index:63"><div class="box itm pl-box">
  <header class="itm-h"><div><h3>Price list</h3><p>${esc(plHead())} · ${plural(n, "product")}</p></div><button class="itm-x" data-a="pl_close" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><div class="itm-g itm-g3"><label>Selling point<select data-pl="pt"><option value="All" ${plV.pt === "All" ? "selected" : ""}>All selling points</option>${plPoints()
    .map(p => `<option ${p === plV.pt ? "selected" : ""}>${esc(p)}</option>`)
    .join(
      ""
    )}</select></label><label>Category<select data-pl="cat"><option value="All">All categories</option>${cats
    .map(c => `<option ${c === plV.cat ? "selected" : ""}>${esc(c)}</option>`)
    .join("")}</select></label></div></section>
  ${
    S.length
      ? S.map(
          s =>
            `<section class="itm-s tw"><h4>${esc(s.t)}</h4><table class="t"><tr><th>Code</th><th>Product</th><th>Category</th><th>Tax</th><th class="n">Price (KES)</th></tr>${s.r
              .map(
                r =>
                  `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td class="n">${r[4]}</td></tr>`
              )
              .join("")}</table></section>`
        ).join("")
      : '<section class="itm-s"><div class="empty">No products to show.</div></section>'
  }</div>
  <footer class="itm-f"><button class="mini" data-a="pl_close">Close</button>${out && S.length ? '<button class="mini xl-btn" data-a="pl_xlsx">Download Excel</button><button class="mini" data-a="pl_pdf">Download PDF</button><button class="chip on" data-a="pl_print">Print</button>' : ""}</footer></div></div>`;
}
function plFile() {
  return `Price_list_${plV.pt === "All" ? "all_selling_points" : plV.pt}_${bizDate()}`;
}
function plPrint() {
  if (!boCan("rep.print")) return boDenied();
  const S = plSections();
  if (!S.length) return toast("There is nothing to print.");
  stPrint(
    "Price list",
    `<div class="st-doc"><div class="st-head"><div>${esc(FD_SETTINGS.name)}</div><h2>Price list</h2></div><div>${esc(plHead())}</div>${S.map(
      s =>
        `<h3 style="margin:16px 0 4px">${esc(s.t)}</h3><table class="st-t"><thead><tr>${s.c.map(h => `<th${h[0] === "#" ? ' class="n"' : ""}>${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${s.r.map(r => `<tr>${r.map((v, i) => `<td${s.c[i][0] === "#" ? ' class="n"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    ).join("")}<div style="margin-top:14px">${esc(printedBy())}</div></div>`,
    "A4 portrait"
  );
}
function plAct(a) {
  if (a === "pl_print") return plPrint();
  if (a === "pl_open") plV = { pt: "All", cat: "All" };
  if (a === "pl_close") plV = null;
  if (a === "pl_pdf" || a === "pl_xlsx") {
    if (!boCan("rep.print")) return boDenied();
    const doc = {
      company: FD_SETTINGS.name,
      title: "Price list",
      head: plHead(),
      by:
        a === "pl_pdf" ? `Printed ${new Date().toLocaleString("en-GB")} by ${boUser.n}` : xlsxBy(),
      sections: plSections()
    };
    a === "pl_pdf" ? PDF.download(doc, plFile()) : XLSX.download(doc, plFile());
    return toast(`Price list downloaded as ${a === "pl_pdf" ? "PDF" : "Excel"}.`);
  }
  all();
}
document.addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.pl;
  if (!plV || !k) return;
  plV[k] = e.target.value;
  // A category that this selling point doesn't sell falls back to all of them.
  if (k === "pt") plV.cat = "All";
  all();
});

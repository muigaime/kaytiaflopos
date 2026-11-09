// ---- Products List: printable stickers with the hotel's logo, the product, its price, a QR code and a barcode ----
// The barcode is for the till. The QR code is for a guest's phone: it shows the same details as text.
let prS = null; // { from, copies, size }
const STK_SIZES = {
  l80: ["Label printer roll, 80 x 50 mm", "@page{size:80mm 50mm;margin:0}"],
  l60: ["Small label, 60 x 40 mm", "@page{size:60mm 40mm;margin:0}"],
  a4: ["A4 sheet, 3 across", "@page{size:A4;margin:8mm}"]
};
const stkOwn = () => `This is a product of ${FD_SETTINGS.name}. Enjoy!`;
function stkDefault() {
  if (prEt.sel.size) return "ticked";
  const bar = prPoints().find(p => (OUTLET_INFO[p] || {}).type === "Bar");
  return bar || "all";
}
function stkItems() {
  const F = prS,
    L = prEtShown();
  if (F.from === "ticked") return L.filter(i => prEt.sel.has(i.id));
  return F.from === "all" ? L : L.filter(i => i.d === F.from);
}
/** This product's price at every selling point that sells it, its own first. */
function stkPrices(i) {
  const low = i.n.toLowerCase(),
    L = ITEMS.filter(x => x.sell !== "acc" && x.n.toLowerCase() === low);
  return [i, ...L.filter(x => x !== i)];
}
/** What a phone shows after scanning the QR code. Long lists are cut to fit. */
function stkQrText(i) {
  const head = [String(FD_SETTINGS.name).slice(0, 40).toUpperCase(), i.n.slice(0, 40)],
    tail = `This is a product of ${String(FD_SETTINGS.name).slice(0, 40)}. Enjoy!`,
    P = [],
    used = () => new TextEncoder().encode([...head, ...P, tail].join("\n")).length;
  for (const x of stkPrices(i)) {
    P.push(`${x.d}: KSH ${posMoney(x.p)}`);
    if (used() > 170) {
      P.pop();
      break;
    }
  }
  return [...head, ...P, tail].join("\n");
}
/** The hotel's logo from Settings, or its initials in a crest. */
function stkLogo() {
  const src = (logos() || {}).company,
    name = String(FD_SETTINGS.name || "").trim(),
    initials = name
      .split(/\s+/)
      .filter(w => !/^(the|of|and)$/i.test(w))
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join("");
  return src
    ? `<img src="${esc(src)}" alt="">`
    : `<span class="stk-crest"><b>${esc(initials)}</b><small>${esc(name)}</small></span>`;
}
function stkOne(i) {
  const code = itemBarcode(i.id),
    [m, y] = [bizDate().slice(5, 7), bizDate().slice(0, 4)],
    others = stkPrices(i).slice(1, 3);
  return `<div class="stk1"><div class="stk-l"><div class="stk-logo">${stkLogo()}</div><div class="stk-q">${qrSvg(stkQrText(i))}</div><div class="stk-sign"><i></i><span>Signature</span></div><div class="stk-bar">KINDLY DO NOT REMOVE</div></div>
  <div class="stk-r"><div class="stk-pay"><span class="p-m">LIPA NA M-PESA</span><span class="p-v">VISA</span><span class="p-c">MASTERCARD</span></div><div class="stk-n">${esc(i.n)}</div><div class="stk-p"><small>KSH</small><b>${posMoney(i.p)}</b></div>${others.length ? `<div class="stk-o">${others.map(x => `${esc(x.d)} KSH ${posMoney(x.p)}`).join(" · ")}</div>` : ""}<div class="stk-bar">KINDLY DO NOT PAY MORE</div><div class="stk-b2"><span class="stk-date">${m}-${y}</span><div class="stk-code"><div class="stk-b">${code128Svg(code)}</div><span>${code}</span></div></div><div class="stk-own">${esc(stkOwn())}</div></div></div>`;
}
const STK_CSS = `.stk1{display:grid;grid-template-columns:33% 1fr;gap:.45em;box-sizing:border-box;overflow:hidden;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;break-inside:avoid;page-break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.stk-l,.stk-r{display:flex;flex-direction:column;min-width:0;min-height:0}.stk-l{align-items:center;justify-content:space-between}.stk-r{justify-content:space-between}
.stk-logo{display:grid;flex:none;place-items:center;width:3.7em;height:3.7em;overflow:hidden;border:.14em double #000;border-radius:50%}.stk-logo img{display:block;width:100%;height:100%;object-fit:cover}
.stk-crest{display:grid;justify-items:center;width:100%;text-align:center}.stk-crest b{font:700 1.45em/1 Georgia,'Times New Roman',serif}.stk-crest small{max-width:92%;overflow:hidden;font-size:.36em;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;text-overflow:ellipsis}
.stk-q{flex:none;width:6em;height:6em}.stk-q svg{display:block;width:100%;height:100%}
.stk-sign{align-self:stretch;text-align:right}.stk-sign i{display:block;border-top:.05em solid #000}.stk-sign span{font-size:.5em;font-weight:700}
.stk-bar{align-self:stretch;padding:.16em .3em;background:#000;color:#fff;font-size:.54em;font-weight:800;letter-spacing:.05em;text-align:center;white-space:nowrap}
.stk-l .stk-bar{padding:.2em 0;font-size:.43em;letter-spacing:0}.stk-pay{display:flex;gap:.25em}.stk-pay span{flex:1;padding:.22em 0;border-radius:.3em;font-size:.47em;font-weight:900;letter-spacing:.02em;text-align:center;white-space:nowrap}.p-m{flex:1.7!important;background:#3aab38;color:#fff}.p-v{background:#1a1f71;color:#fff;font-style:italic}.p-c{flex:1.5!important;background:#eb001b;color:#fff}
.stk-n{overflow:hidden;font:700 1.25em/1.15 Georgia,'Times New Roman',serif;text-align:center;white-space:nowrap;text-overflow:ellipsis}
.stk-p{display:flex;align-items:baseline;justify-content:center;gap:.3em;line-height:1}.stk-p small{font-size:1em;font-weight:900}.stk-p b{font-size:2.9em;font-weight:900;letter-spacing:-.02em;font-variant-numeric:lining-nums}
.stk-o{font-size:.56em;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stk-b2{display:flex;align-items:center;gap:.5em}.stk-date{flex:none;padding:.1em .55em;border:.07em solid #000;border-radius:1em;font-size:.95em;font-weight:900}
.stk-code{flex:1;min-width:0;text-align:center}.stk-b{height:1.5em}.stk-b svg{display:block;width:100%;height:100%}.stk-code span{display:block;font-size:.46em;letter-spacing:.08em;line-height:1}
.stk-own{font:italic 700 .6em/1.1 Georgia,'Times New Roman',serif;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.l80 .stk1{width:80mm;height:50mm;padding:1.6mm 2mm;font-size:10pt}
.l60 .stk1{width:60mm;height:40mm;padding:1.2mm 1.5mm;font-size:7.8pt}
.a4 .stk1{height:39mm;padding:1.5mm 1.8mm;font-size:7.8pt;border:.2mm dashed #999}`;
function stkModal() {
  if (!prS) return "";
  const F = prS,
    L = stkItems(),
    n = Math.max(1, Math.min(50, parseInt(F.copies, 10) || 1)),
    src = [
      ...(prEt.sel.size ? [["ticked", `Ticked products (${prEt.sel.size})`]] : []),
      ...prPoints().map(p => [p, p]),
      ["all", "All products"]
    ];
  return `<div class="modal show" id="stkEd" style="z-index:63"><div class="box itm"><header class="itm-h"><div><h3>Print stickers</h3><p>Your logo and payment options, the product and its price, a QR code for phones and a barcode for the till.</p></div><button class="itm-x" data-a="prl_stkno" aria-label="Close">✕</button></header>
  <div class="itm-b"><section class="itm-s"><div class="itm-g itm-g3"><label>Products<select data-stk0="from">${src.map(([v, l]) => `<option value="${esc(v)}" ${v === F.from ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label><label>Sticker size<select data-stk0="size">${Object.entries(
    STK_SIZES
  )
    .map(([v, x]) => `<option value="${v}" ${v === F.size ? "selected" : ""}>${x[0]}</option>`)
    .join(
      ""
    )}</select></label><label>Copies of each<input data-stk0="copies" type="number" min="1" max="50" step="1" value="${esc(F.copies)}"></label></div></section>
  <section class="itm-s"><h4>Preview</h4>${L.length ? `<div class="stk-prev ${F.size}">${L.slice(0, 4).map(stkOne).join("")}</div>` : '<div class="itm-hint">No products to print.</div>'}<div class="itm-hint">${plural(L.length * n, "sticker")} will print.</div></section></div>
  <footer class="itm-f"><button class="mini" data-a="prl_stkno">Cancel</button><button class="chip on" data-a="prl_stkgo" ${L.length ? "" : "disabled"}>Print stickers</button></footer></div></div><style>${STK_CSS}#stkEd .stk-prev{display:flex;flex-wrap:wrap;gap:10px}#stkEd .stk1{outline:1px solid var(--line)}#stkEd .a4 .stk1{width:60mm}</style>`;
}
function stkPrint() {
  const F = prS,
    n = Math.max(1, Math.min(50, parseInt(F.copies, 10) || 1)),
    L = stkItems(),
    body = L.flatMap(i => Array(n).fill(stkOne(i))).join(""),
    w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print.");
  w.document.write(
    `<!DOCTYPE html><html><head><title>Stickers</title><style>${STK_SIZES[F.size][1]}*{box-sizing:border-box}body{margin:0}${STK_CSS}.l80 .stk1,.l60 .stk1{page-break-after:always}.l80 .stk1:last-child,.l60 .stk1:last-child{page-break-after:auto}.a4{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}</style></head><body><div class="${F.size}">${body}</div></body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
  auditAdd("Product", `Printed ${plural(L.length * n, "sticker")}`);
  prS = null;
  all();
}
function stkAct(a) {
  if (a === "prl_stk") prS = { from: stkDefault(), copies: "1", size: "l80" };
  else if (a === "prl_stkno") prS = null;
  else if (a === "prl_stkgo") return stkPrint();
  all();
}
$("#vSub").addEventListener("change", e => {
  const k = e.target.dataset.stk0;
  if (!k || !prS) return;
  prS[k] = e.target.value;
  all();
});

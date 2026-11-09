// ---- Import: products for sale, or store items that aren't for sale, from Excel or a photo of a printed list ----
// Everything lands in a review table first. Nothing is saved until Import is pressed.
let prI = null; // { kind: "prod" | "stock", step: "pick" | "review", from, rows, busy }
const PRI_COLS = {
  prod: [
    ["n", /^(product( name)?|item( name)?|name|description)$/],
    ["d", /^(selling point|sale point|outlet|department)$/],
    ["c", /^(category|group)$/],
    ["p", /^(selling price|price|sp)( \(?kes\)?)?$/],
    ["b", /^(buying price|cost|bp)( \(?kes\)?)?$/],
    ["t", /^(tax|vat)$/],
    ["s", /^(stock item|stock)$/]
  ],
  stock: [
    ["n", /^(item( name)?|product( name)?|name|description)$/],
    ["code", /^(item )?code$/],
    ["g", /^(category|group)$/],
    ["u", /^(unit|unit of measure|uom)$/],
    ["bu", /^(buying unit|pack)$/],
    ["pb", /^(units in (one |a )?buying unit|units per buying unit|pack size)$/],
    ["bp", /^(buying price|price|cost)( \(?kes\)?)?$/],
    ["ro", /^reorder( level)?$/],
    ["st", /^store$/],
    ["q", /^(opening (stock|quantity)|quantity|qty)$/],
    ["t", /^(tax|vat)$/]
  ]
};
const priTax = v => {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return "B";
  if (/^(a|no|none|no tax|exempt|zero)/.test(s)) return "A";
  if (/and|^bc$/.test(s)) return "BC";
  if (/^(c|tax c)/.test(s)) return "C";
  return "B";
};
const priNum = v => String(v == null ? "" : v).replace(/[,\s]/g, "");
const priSame = (L, v) => L.find(x => x.toLowerCase() === v.toLowerCase()) || v;
/** Turn spreadsheet rows into records, finding the columns by their headings. */
function priFromRows(rows, kind) {
  const C = PRI_COLS[kind],
    clean = c => String(c).toLowerCase().trim(),
    at = rows.findIndex(r => r.some(c => C[0][1].test(clean(c))));
  if (at < 0) return null;
  const col = {};
  rows[at].forEach((h, i) => {
    const hit = C.find(([, re]) => re.test(clean(h)));
    if (hit && col[hit[0]] === undefined) col[hit[0]] = i;
  });
  const get = (r, k) => (col[k] === undefined ? "" : String(r[col[k]] || "").trim());
  return rows
    .slice(at + 1)
    .filter(r => get(r, "n") && !/^example/i.test(get(r, "n")))
    .slice(0, 2000)
    .map(r =>
      kind === "prod"
        ? {
            n: get(r, "n"),
            d: priSame(prPoints(), get(r, "d")),
            c: get(r, "c") || "General",
            p: priNum(get(r, "p")),
            b: priNum(get(r, "b")),
            t: priTax(get(r, "t")),
            s: get(r, "s")
          }
        : {
            n: get(r, "n"),
            code: get(r, "code"),
            g: get(r, "g") || "Raw materials",
            u: get(r, "u") || "pcs",
            bu: get(r, "bu"),
            pb: priNum(get(r, "pb")) || "1",
            bp: priNum(get(r, "bp")),
            ro: priNum(get(r, "ro")),
            st: priSame(STORES, get(r, "st")),
            q: priNum(get(r, "q")),
            t: priTax(get(r, "t"))
          }
    );
}
/** One line of a printed list: a name, then one number or two. */
function priFromLine(line, kind, place) {
  const m =
    /^(.*?[A-Za-z].*?)[\s.:_-]*([\d,]+(?:\.\d{1,2})?)(?:\s+([\d,]+(?:\.\d{1,2})?))?\s*(?:kes|ksh|\/=|\/-)?\s*$/i.exec(
      line.trim()
    );
  const raw = m ? m[1].trim() : line.trim();
  if (!/[A-Za-z]{2}/.test(raw)) return null;
  if (!m && /\b(price|menu|item|description|total)\b/i.test(raw)) return null;
  const n = raw.replace(/^[\d.)\s]+(?=[A-Za-z])/, ""),
    one = m ? priNum(m[2]) : "",
    two = m && m[3] ? priNum(m[3]) : "";
  return kind === "prod"
    ? { n, d: place, c: "General", p: two || one, b: two ? one : "", t: "B", s: "" }
    : {
        n,
        code: "",
        g: "Raw materials",
        u: "pcs",
        bu: "",
        pb: "1",
        bp: two || one,
        ro: "",
        st: place,
        q: two ? one : "",
        t: "B"
      };
}
const priStock = name =>
  pickKeys().find(k => itemInfo(k).name.toLowerCase() === name.trim().toLowerCase());
/** Why a row can't be imported, or "". */
function priProblem(x, i, rows) {
  const name = x.n.trim(),
    low = name.toLowerCase(),
    n = v => parseFloat(v);
  if (!name) return "Enter the name";
  if (prI.kind === "stock") {
    if (!x.u.trim()) return "Enter the unit";
    if (!(n(x.pb) > 0)) return "Check the units per buying unit";
    if (x.bp !== "" && !(n(x.bp) >= 0)) return "Check the buying price";
    if (x.ro !== "" && !(n(x.ro) >= 0)) return "Check the reorder level";
    if (x.q !== "" && !(n(x.q) > 0)) return "Check the opening quantity";
    if (x.q !== "" && !isStore(x.st)) return "Choose the store";
    if (rows.some((y, j) => j < i && y.n.trim().toLowerCase() === low)) return "Listed twice";
    return itemDuplicate(name, x.code.trim().toUpperCase(), null) || "";
  }
  if (!prPoints().includes(x.d)) return "Choose a selling point";
  if (!(n(x.p) > 0)) return "Enter the selling price";
  if (x.b !== "" && !(n(x.b) >= 0)) return "Check the buying price";
  if (x.s && !priStock(x.s)) return `No stock item called ${x.s}`;
  if (ITEMS.some(y => y.d === x.d && y.n.toLowerCase() === low)) return `${x.d} already sells this`;
  if (rows.some((y, j) => j < i && y.d === x.d && y.n.trim().toLowerCase() === low))
    return "Listed twice";
  return "";
}
const priGood = () => prI.rows.filter((x, i) => !priProblem(x, i, prI.rows)).length;
function priRow(x, i, rows) {
  const why = priProblem(x, i, rows),
    text = (k, l) => `<td><input data-pri="${i}.${k}" value="${esc(x[k])}" aria-label="${l}"></td>`,
    num = (k, l) =>
      `<td><input class="n" type="number" min="0" step="any" data-pri="${i}.${k}" value="${esc(x[k])}" aria-label="${l}"></td>`,
    list = (k, L, l) =>
      `<td><select data-pri="${i}.${k}" aria-label="${l}"><option value="">Choose</option>${L.map(p => `<option ${p === x[k] ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></td>`,
    tax = `<td><select data-pri="${i}.t" aria-label="Tax">${taxChoices()
      .map(([v, l]) => `<option value="${v}" ${v === x.t ? "selected" : ""}>${esc(l)}</option>`)
      .join("")}</select></td>`,
    cells =
      prI.kind === "prod"
        ? text("n", "Product name") +
          list("d", prPoints(), "Selling point") +
          text("c", "Category") +
          num("p", "Selling price") +
          num("b", "Buying price") +
          tax
        : text("n", "Item name") +
          text("g", "Category") +
          text("u", "Unit") +
          text("bu", "Buying unit") +
          num("pb", "Units per buying unit") +
          num("bp", "Buying price") +
          num("ro", "Reorder level") +
          list("st", STORES, "Store") +
          num("q", "Opening quantity");
  return `<tr class="${why ? "bad" : ""}">${cells}<td class="pri-st" id="priS${i}">${why ? esc(why) : "Ready"}</td><td><button class="mini" data-a="prl_impdel" data-i="${i}" aria-label="Remove row">✕</button></td></tr>`;
}
const priWord = () => (prI.kind === "prod" ? "product" : "item");
const priGoWord = n => `Import ${plural(n, priWord())}`;
function prImportModal() {
  if (!prI) return "";
  const close = '<button class="itm-x" data-a="prl_impclose" aria-label="Close">✕</button>',
    stock = prI.kind === "stock";
  if (prI.step === "pick")
    return `<div class="modal show" id="prImp" style="z-index:63"><div class="box itm"><header class="itm-h"><div><h3>Import</h3><p>You'll check everything before it is saved.</p></div>${close}</header>
    <div class="itm-b"><div class="pri-kinds" role="group" aria-label="What are you importing?"><button class="grn-mode ${stock ? "" : "on"}" data-a="prl_impk" data-k="prod"><b>Products for sale</b><span>They appear on the POS</span></button><button class="grn-mode ${stock ? "on" : ""}" data-a="prl_impk" data-k="stock"><b>Store items</b><span>Ingredients and materials, not for sale</span></button></div>
    <div class="pri-pick"><div class="pri-way"><h4>From Excel</h4><p>Fill in the template, then choose the file.</p><div class="pri-btns"><button class="mini" data-a="prl_imptpl">Download the template</button><label class="chip on pri-file">Choose Excel file<input id="priX" type="file" accept=".xlsx"></label></div></div>
    <div class="pri-way"><h4>From a printed list</h4><p>Take a clear, straight photo or scan of the list, then choose the picture. One ${priWord()} per line works best.</p><div class="pri-btns"><label class="chip on pri-file">${prI.busy ? "Reading the picture..." : "Choose photo or scan"}<input id="priO" type="file" accept="image/png,image/jpeg,image/bmp,image/tiff" ${prI.busy ? "disabled" : ""}></label></div></div></div></div></div></div>`;
  const n = priGood(),
    heads = stock
      ? [
          "Item",
          "Category",
          "Unit",
          "Buying unit",
          "#Per buying unit",
          "#Buying price",
          "#Reorder",
          "Store",
          "#Opening qty"
        ]
      : ["Product", "Selling point", "Category", "#Selling price", "#Buying price", "Tax"],
    all1 = stock
      ? `<label>Store for every row<select data-priall="st"><option value="">Choose to change all</option>${STORES.map(p => `<option>${esc(p)}</option>`).join("")}</select></label><label>Category for every row<input data-priall="g" placeholder="Type to change all"></label>`
      : `<label>Selling point for every row<select data-priall="d"><option value="">Choose to change all</option>${prPoints()
          .map(p => `<option>${esc(p)}</option>`)
          .join(
            ""
          )}</select></label><label>Category for every row<input data-priall="c" placeholder="Type to change all"></label>`;
  return `<div class="modal show" id="prImp" style="z-index:63"><div class="box itm pri-rev"><header class="itm-h"><div><h3>Check before importing</h3><p>${prI.rows.length} rows from ${esc(prI.from)}. Correct anything that's wrong.</p></div>${close}</header>
  <div class="itm-b"><div class="pri-all">${all1}</div>
  <div class="tw"><table class="t pri-t"><thead><tr>${heads.map(h => `<th class="${h[0] === "#" ? "n" : ""}">${h.replace("#", "")}</th>`).join("")}<th>Status</th><th></th></tr></thead><tbody>${prI.rows.map((x, i) => priRow(x, i, prI.rows)).join("")}</tbody></table></div></div>
  <footer class="itm-f"><button class="mini" data-a="prl_impback">Back</button><button class="chip on" id="priGo" data-a="prl_impgo" ${n ? "" : "disabled"}>${priGoWord(n)}</button></footer></div></div>`;
}
function priRefresh() {
  prI.rows.forEach((x, i) => {
    const why = priProblem(x, i, prI.rows),
      c = $("#priS" + i);
    if (!c) return;
    c.textContent = why || "Ready";
    c.closest("tr").classList.toggle("bad", !!why);
  });
  const n = priGood();
  $("#priGo").textContent = priGoWord(n);
  $("#priGo").disabled = !n;
}
function priTemplate() {
  const stock = prI.kind === "stock",
    P = prPoints();
  XLSX.download(
    {
      company: FD_SETTINGS.name,
      title: stock ? "Store items import template" : "Products import template",
      by: stock
        ? "Replace the example with your items. Store is only needed with an opening quantity."
        : "Replace the example with your products. Selling point must match one you already have.",
      sections: [
        stock
          ? {
              c: [
                "Item name",
                "Item code",
                "Category",
                "Unit",
                "Buying unit",
                "#Units per buying unit",
                "#Buying price",
                "#Reorder level",
                "Store",
                "#Opening quantity",
                "Tax"
              ],
              r: [
                [
                  "Example: Sugar",
                  "",
                  "Raw materials",
                  "kg",
                  "Bag",
                  50,
                  6000,
                  10,
                  STORES[0] || "",
                  2,
                  "VAT"
                ]
              ]
            }
          : {
              c: [
                "Product name",
                "Selling point",
                "Category",
                "#Selling price",
                "#Buying price",
                "Tax",
                "Stock item"
              ],
              r: [["Example: Tusker", P[0] || "Bar", "Beer", 250, 180, "VAT", ""]]
            }
      ]
    },
    stock ? "Store_items_import_template" : "Products_import_template"
  );
}
async function priExcel(file) {
  let rows = null;
  const kind = prI.kind;
  try {
    rows = priFromRows(await xlsxRows(file), kind);
  } catch (e) {
    return toast("That file can't be read. Save it as an Excel workbook (.xlsx).");
  }
  if (!rows) return toast("The name column wasn't found. Use the template.");
  if (!rows.length) return toast(`That file has no ${priWord()}s in it.`);
  prI = { kind, step: "review", from: file.name, rows };
  all();
}
async function priScan(file) {
  if (file.size > 15 * 1048576) return toast("That picture is too large. Use one under 15 MB.");
  prI.busy = true;
  all();
  const image = await new Promise(ok => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = () => ok("");
    r.readAsDataURL(file);
  });
  const res = await fetch("/lan/ocr", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image })
  })
    .then(async r => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, j: {} }));
  prI.busy = false;
  if (!res.ok) {
    all();
    return toast(res.j.error || "Scanning works in the installed Kaytia Flow program.");
  }
  const kind = prI.kind,
    place =
      kind === "stock"
        ? STORES.length === 1
          ? STORES[0]
          : ""
        : prPoint !== "All"
          ? prPoint
          : prPoints().length === 1
            ? prPoints()[0]
            : "",
    rows = (res.j.lines || []).map(l => priFromLine(l, kind, place)).filter(Boolean);
  if (!rows.length) {
    all();
    return toast("Nothing could be read from that picture. Try a clearer photo.");
  }
  prI = { kind, step: "review", from: "the picture", rows };
  all();
}
function priSaveStock(x) {
  const name = x.n.trim(),
    uom = x.u.trim(),
    perBuy = parseFloat(x.pb),
    price = x.bp === "" ? 0 : parseFloat(x.bp),
    qty = x.q === "" ? 0 : parseFloat(x.q),
    k = itemKey(name);
  INGU[k] = {
    code: x.code.trim().toUpperCase() || nextItemCode(),
    name,
    group: x.g.trim() || "Raw materials",
    uom,
    buyUnit: x.bu.trim() || uom,
    perBuy,
    buyPrice: price,
    tax: x.t
  };
  ING[k] = `${name} (${uom})`;
  LOCS.forEach(l => (STK[l][k] = STK[l][k] || 0));
  INGC[k] = price / perBuy;
  RO[k] =
    x.ro !== "" ? parseFloat(x.ro) : qty > 0 ? Math.max(1, Math.round(qty * perBuy * 0.2)) : 1;
  if (qty > 0) sendToStore(k, x.st, qty, price, "", "");
}
function priGo() {
  const kind = prI.kind,
    good = prI.rows.filter((x, i) => !priProblem(x, i, prI.rows)),
    from = prI.from,
    left = prI.rows.length - good.length,
    word = priWord();
  good.forEach(x => {
    if (kind === "stock") return priSaveStock(x);
    const k = x.s ? priStock(x.s) : "";
    ITEMS.push({
      id: prNewId(),
      n: x.n.trim(),
      d: x.d,
      c: x.c.trim() || "General",
      p: parseFloat(x.p),
      t: x.t,
      r: k ? { [k]: 1 } : {},
      ...(x.b !== "" ? { buy: parseFloat(x.b) } : {})
    });
  });
  auditAdd(
    kind === "stock" ? "Stock item" : "Product",
    `${plural(good.length, word)} imported from ${from}`,
    {
      mod: kind === "stock" ? "Inventory" : "Products"
    }
  );
  prI = null;
  spRefreshPos();
  bosave();
  toast(`${plural(good.length, word)} imported.${left ? ` ${left} skipped.` : ""}`);
  all();
}
function priAct(a, b) {
  const d = b.dataset;
  // Which right depends on what is coming in.
  const kind = a === "prl_imp" || a === "prl_impk" ? d.k || "prod" : prI && prI.kind;
  if (!boCan(kind === "stock" ? "inv.items" : "prod.manage")) return boDenied();
  if (a === "prl_imp" || a === "prl_impk") prI = { kind, step: "pick" };
  else if (a === "prl_impclose") prI = null;
  else if (a === "prl_impback") prI = { kind, step: "pick" };
  else if (a === "prl_imptpl") return priTemplate();
  else if (a === "prl_impgo") return priGo();
  else if (a === "prl_impdel") {
    prI.rows.splice(+d.i, 1);
    if (!prI.rows.length) prI = { kind, step: "pick" };
  }
  all();
}
$("#vSub").addEventListener("change", e => {
  const t = e.target;
  if (!prI) return;
  if (t.id === "priX" && t.files[0]) return priExcel(t.files[0]);
  if (t.id === "priO" && t.files[0]) return priScan(t.files[0]);
  if (t.dataset.pri) {
    const [i, k] = t.dataset.pri.split(".");
    prI.rows[+i][k] = t.value;
    return priRefresh();
  }
  if (t.dataset.priall && t.value) {
    prI.rows.forEach(x => (x[t.dataset.priall] = t.value));
    all();
  }
});

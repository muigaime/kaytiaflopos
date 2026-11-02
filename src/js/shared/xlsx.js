// ---- A real Excel workbook, built in the browser so it works with no internet ----
// xlsxReport({ title, company, head, by, meta: [[label, value]], sections: [{ t, c, r, f }] })
// A column named "#Amount" holds numbers. Amounts become true numbers, so Excel can add and sort them.
const XLSX = (() => {
  const INK = "FF241B12",
    CREAM = "FFF6EFE0",
    BRASS = "FFE3C98E",
    STRIPE = "FFFAF5EA",
    RULE = "FFD9CDB8",
    MAX_W = 48;
  const clean = s =>
    String(s === null || s === undefined ? "" : s)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
      .replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const colName = i => {
    let s = "";
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
  };
  /** "KES 1,250.50" → { n: 1250.5, dp: 2 }. Anything that isn't a plain amount stays as text. */
  function amount(v) {
    if (typeof v === "number") {
      if (!isFinite(v)) return null;
      const t = String(v);
      return { n: v, dp: t.includes(".") ? Math.min(3, t.split(".")[1].length) : 0, pct: false };
    }
    const m = String(v === null || v === undefined ? "" : v)
      .trim()
      .match(/^(-?)(?:KES\s*)?(-?)(\d[\d,]*|\d*)(?:\.(\d+))?(%?)$/i);
    if (!m || (!m[3] && !m[4])) return null;
    const n = parseFloat(m[3].replace(/,/g, "") + "." + (m[4] || "0")) * (m[1] || m[2] ? -1 : 1);
    return { n: m[5] ? n / 100 : n, dp: Math.min(3, (m[4] || "").length), pct: !!m[5] };
  }
  const shown = a =>
    a.pct
      ? (a.n * 100).toFixed(a.dp) + "%"
      : a.n.toLocaleString("en-US", { minimumFractionDigits: a.dp, maximumFractionDigits: a.dp });

  /** Styles are numbered as they're first used, and written out once at the end. */
  function styles() {
    const fonts = [],
      fills = [
        '<fill><patternFill patternType="none"/></fill>',
        '<fill><patternFill patternType="gray125"/></fill>'
      ],
      borders = ["<border><left/><right/><top/><bottom/><diagonal/></border>"],
      fmts = [],
      xfs = [];
    const idx = (L, x) => {
      const i = L.indexOf(x);
      return i > -1 ? i : L.push(x) - 1;
    };
    const line = (tag, st, rgb) =>
      st ? `<${tag} style="${st}"><color rgb="${rgb}"/></${tag}>` : `<${tag}/>`;
    const font = (o = {}) =>
      idx(
        fonts,
        `<font>${o.b ? "<b/>" : ""}${o.i ? "<i/>" : ""}<sz val="${o.sz || 11}"/><color rgb="${o.c || INK}"/><name val="${o.name || "Calibri"}"/><family val="2"/></font>`
      );
    font();
    const xf = (o = {}) => {
      const f = font(o.font),
        fill = o.fill
          ? idx(
              fills,
              `<fill><patternFill patternType="solid"><fgColor rgb="${o.fill}"/><bgColor indexed="64"/></patternFill></fill>`
            )
          : 0,
        b = o.border
          ? idx(
              borders,
              `<border>${line("left", o.border.s, o.border.c)}${line("right", o.border.s, o.border.c)}${line("top", o.border.t || o.border.s, o.border.tc || o.border.c)}${line("bottom", o.border.b || o.border.s, o.border.tc || o.border.c)}<diagonal/></border>`
            )
          : 0,
        nf = o.fmt ? 164 + idx(fmts, o.fmt) : 0;
      return idx(
        xfs,
        `<xf numFmtId="${nf}" fontId="${f}" fillId="${fill}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="${o.h || "left"}" vertical="${o.v || "center"}" ${o.wrap ? 'wrapText="1"' : ""} ${o.indent ? `indent="${o.indent}"` : ""}/></xf>`
      );
    };
    xf();
    const xml = () =>
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${fmts.length ? `<numFmts count="${fmts.length}">${fmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${clean(f)}"/>`).join("")}</numFmts>` : ""}<fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="${borders.length}">${borders.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    return { xf, xml };
  }
  const numFmt = a => {
    if (a.pct) return a.dp ? `0.${"0".repeat(a.dp)}%` : "0%";
    const d = a.dp ? `.${"0".repeat(a.dp)}` : "",
      p = `#,##0${d}`;
    return `${p};[Red]-${p}`;
  };

  function sheetXML(R, S) {
    const secs = R.sections.map(s => ({
        ...s,
        c: s.c.map(x => String(x)),
        r: s.r || [],
        names: s.c.map(x => String(x).replace(/^#/, "")),
        isNum: s.c.map(x => String(x)[0] === "#")
      })),
      cols = Math.max(1, ...secs.map(s => s.c.length));
    // A column shows one number of decimals all the way down, so its figures line up.
    secs.forEach(s => {
      s.dp = s.c.map((_, i) =>
        s.isNum[i]
          ? Math.max(0, ...[...s.r, ...(s.f ? [s.f] : [])].map(y => (amount(y[i]) || { dp: 0 }).dp))
          : 0
      );
    });
    const inCol = (s, i, v) => {
      const a = s.isNum[i] ? amount(v) : null;
      return a && !a.pct ? { ...a, dp: s.dp[i] } : a;
    };
    // Widths come from what each column really shows, so no ##### and no cut-off words.
    const W = Array(cols).fill(8);
    const fit = (i, n) => (W[i] = Math.max(W[i], Math.min(MAX_W, n)));
    const text = (s, i, v) => {
      const a = inCol(s, i, v);
      return a ? shown(a) : String(v === null || v === undefined ? "" : v);
    };
    secs.forEach(s => {
      s.names.forEach((n, i) => fit(i, n.length + (secs.length === 1 ? 8 : 3)));
      [...s.r, ...(s.f ? [s.f] : [])].forEach(row =>
        row.forEach((v, i) => {
          if (i < cols) fit(i, text(s, i, v).length + 3);
        })
      );
    });
    // The title rows are merged across the sheet, so the sheet is kept wide enough for them.
    const short = 64 - W.reduce((a, b) => a + b, 0);
    if (short > 0) W.forEach((_, i) => (W[i] += short / cols));
    const total = W.reduce((a, b) => a + b, 0),
      linesIn = (s, w) => Math.max(1, Math.ceil(String(s).length / Math.max(1, w - 1)));

    const border = { s: "thin", c: RULE },
      st = {
        company: S.xf({
          font: { b: 1, sz: 18, c: BRASS, name: "Georgia" },
          fill: INK,
          h: "center"
        }),
        title: S.xf({ font: { b: 1, sz: 13, c: CREAM }, fill: INK, h: "center" }),
        head: S.xf({ font: { i: 1, sz: 10, c: "FF5B4D3B" }, fill: CREAM, h: "center", wrap: 1 }),
        meta: S.xf({ font: { sz: 10 }, fill: CREAM, h: "center", wrap: 1 }),
        section: S.xf({ font: { b: 1, sz: 12 }, border: { s: "", c: INK, b: "medium", tc: INK } }),
        th: S.xf({
          font: { b: 1, c: CREAM },
          fill: INK,
          h: "center",
          wrap: 1,
          border: { s: "thin", c: "FF5B4D3B" }
        })
      };
    const totalBorder = { s: "thin", c: RULE, t: "medium", b: "double", tc: INK };
    const body = (zebra, h, fmt, tot) =>
      S.xf({
        font: tot ? { b: 1 } : {},
        fill: tot ? BRASS : zebra ? STRIPE : "",
        border: tot ? totalBorder : border,
        h,
        fmt,
        wrap: h === "left",
        indent: h === "left" ? 1 : 0
      });

    const out = [],
      merges = [];
    let y = 0,
      headRow = 0,
      firstRow = 0,
      lastRow = 0;
    const bare = (x, style) => `<c r="${x}" s="${style}"/>`;
    const band = (v, style, ht) => {
      y++;
      const cells = W.map((_, i) =>
        i
          ? bare(colName(i) + y, style)
          : `<c r="A${y}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${clean(v)}</t></is></c>`
      ).join("");
      out.push(`<row r="${y}" ht="${ht}" customHeight="1">${cells}</row>`);
      if (cols > 1) merges.push(`A${y}:${colName(cols - 1)}${y}`);
    };
    band(R.company, st.company, 32);
    band(R.title, st.title, 24);
    const metaW = total * 1.05;
    if (R.head) band(R.head, st.head, 16 * linesIn(R.head, metaW) + 4);
    if (R.meta && R.meta.length) {
      const m = R.meta
        .filter(x => x[1] !== undefined && x[1] !== "")
        .map(x => `${x[0]}: ${x[1]}`)
        .join("   |   ");
      band(m, st.meta, 16 * linesIn(m, metaW) + 4);
    }
    if (R.by) band(R.by, st.head, 18);
    y++;
    out.push(`<row r="${y}" ht="8" customHeight="1"/>`);

    const cell = (s, i, v, zebra, tot) => {
      const x = colName(i) + y,
        a = inCol(s, i, v);
      if (a) return `<c r="${x}" s="${body(zebra, "right", numFmt(a), tot)}"><v>${a.n}</v></c>`;
      const t = String(v === null || v === undefined ? "" : v);
      const style = body(zebra, s.isNum[i] ? "right" : "left", "", tot);
      return t === ""
        ? bare(x, style)
        : `<c r="${x}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${clean(t)}</t></is></c>`;
    };
    const rowHt = (s, row, base) => {
      let n = 1;
      row.forEach((v, i) => {
        if (i < cols && !s.isNum[i])
          n = Math.max(n, linesIn(v === null || v === undefined ? "" : v, W[i] - 1));
      });
      return n * 15 + base;
    };
    secs.forEach((s, si) => {
      if (si) {
        y++;
        out.push(`<row r="${y}" ht="12" customHeight="1"/>`);
      }
      if (s.t && (secs.length > 1 || s.t !== R.title)) {
        y++;
        out.push(
          `<row r="${y}" ht="22" customHeight="1">${W.map((_, i) =>
            i
              ? bare(colName(i) + y, st.section)
              : `<c r="A${y}" s="${st.section}" t="inlineStr"><is><t xml:space="preserve">${clean(s.t)}</t></is></c>`
          ).join("")}</row>`
        );
      }
      y++;
      if (!si) headRow = y;
      let hl = 1;
      s.names.forEach(
        (n, i) => (hl = Math.max(hl, linesIn(n, W[i] - (secs.length === 1 ? 6 : 1))))
      );
      out.push(
        `<row r="${y}" ht="${hl * 15 + 8}" customHeight="1">${s.names
          .map(
            (n, i) =>
              `<c r="${colName(i)}${y}" s="${st.th}" t="inlineStr"><is><t xml:space="preserve">${clean(n)}</t></is></c>`
          )
          .join("")}</row>`
      );
      if (!si) firstRow = y + 1;
      s.r.forEach((row, ri) => {
        y++;
        out.push(
          `<row r="${y}" ht="${rowHt(s, row, 4)}" customHeight="1">${s.c.map((_, i) => cell(s, i, row[i], ri % 2 === 1, false)).join("")}</row>`
        );
      });
      if (!si) lastRow = y;
      if (s.f) {
        y++;
        out.push(
          `<row r="${y}" ht="${rowHt(s, s.f, 7)}" customHeight="1">${s.c.map((_, i) => cell(s, i, s.f[i], false, true)).join("")}</row>`
        );
      }
    });
    const one = secs.length === 1,
      wide = total > 95,
      filter =
        one && lastRow >= firstRow
          ? `<autoFilter ref="A${headRow}:${colName(secs[0].c.length - 1)}${lastRow}"/>`
          : "";
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${colName(cols - 1)}${y}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0">${one ? `<pane ySplit="${headRow}" topLeftCell="A${headRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${headRow + 1}" sqref="A${headRow + 1}"/>` : ""}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${W.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w.toFixed(2)}" customWidth="1"/>`).join("")}</cols><sheetData>${out.join("")}</sheetData>${filter}${merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""}<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${wide ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L${clean(clean(R.company)).slice(0, 80)}&amp;RPage &amp;P of &amp;N</oddFooter></headerFooter><ignoredErrors><ignoredError sqref="A1:${colName(cols - 1)}${y}" numberStoredAsText="1"/></ignoredErrors></worksheet>`;
    return {
      xml,
      headRow,
      filter: filter ? `A${headRow}:${colName(secs[0].c.length - 1)}${lastRow}` : "",
      one
    };
  }

  // ---------------------------------------------------------------- the zip around it
  const CRC = (() => {
    const T = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      T[n] = c >>> 0;
    }
    return b => {
      let c = 0xffffffff;
      for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };
  })();
  function zip(files) {
    const en = new TextEncoder(),
      parts = [],
      dir = [];
    let at = 0;
    const d = new Date(),
      time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const head = (sig, fields) => {
      const size = fields.reduce((a, f) => a + f[1], 4),
        b = new DataView(new ArrayBuffer(size));
      b.setUint32(0, sig, true);
      let p = 4;
      fields.forEach(([v, n]) => {
        n === 2 ? b.setUint16(p, v, true) : b.setUint32(p, v, true);
        p += n;
      });
      return new Uint8Array(b.buffer);
    };
    files.forEach(([name, text]) => {
      const nm = en.encode(name),
        data = en.encode(text),
        crc = CRC(data),
        common = [
          [0, 2],
          [time, 2],
          [date, 2],
          [crc, 4],
          [data.length, 4],
          [data.length, 4],
          [nm.length, 2],
          [0, 2]
        ],
        local = head(0x04034b50, [[20, 2], [0x0800, 2], ...common]);
      parts.push(local, nm, data);
      dir.push(
        head(0x02014b50, [
          [20, 2],
          [20, 2],
          [0x0800, 2],
          ...common,
          [0, 2],
          [0, 2],
          [0, 2],
          [0, 4],
          [at, 4]
        ]),
        nm
      );
      at += local.length + nm.length + data.length;
    });
    const dirSize = dir.reduce((a, b) => a + b.length, 0),
      end = head(0x06054b50, [
        [0, 2],
        [0, 2],
        [files.length, 2],
        [files.length, 2],
        [dirSize, 4],
        [at, 4],
        [0, 2]
      ]);
    return new Blob([...parts, ...dir, end], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  }

  function build(R) {
    const S = styles(),
      sh = sheetXML(R, S),
      name =
        String(R.title)
          .replace(/[\\/?*[\]:']/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 31) || "Report",
      q = `'${name}'`,
      names = [
        ...(sh.filter
          ? [
              `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${clean(q)}!$${sh.filter.replace(":", ":$").replace(/(\d+)/g, "$$$1")}</definedName>`
            ]
          : []),
        ...(sh.one
          ? [
              `<definedName name="_xlnm.Print_Titles" localSheetId="0">${clean(q)}!$${sh.headRow}:$${sh.headRow}</definedName>`
            ]
          : [])
      ];
    const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    return zip([
      [
        "[Content_Types].xml",
        `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
      ],
      [
        "_rels/.rels",
        `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
      ],
      [
        "xl/workbook.xml",
        `${X}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${clean(name)}" sheetId="1" r:id="rId1"/></sheets>${names.length ? `<definedNames>${names.join("")}</definedNames>` : ""}</workbook>`
      ],
      [
        "xl/_rels/workbook.xml.rels",
        `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
      ],
      ["xl/worksheets/sheet1.xml", sh.xml],
      ["xl/styles.xml", S.xml()]
    ]);
  }
  /** Builds the workbook and hands it to the browser as a download. */
  function download(R, file) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(build(R));
    a.download =
      String(file)
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-") + ".xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  return { build, download, amount };
})();

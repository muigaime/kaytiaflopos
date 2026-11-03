// ---- A real PDF table, built in the browser so it works with no internet ----
// PDF.download({ company, title, head, by, sections: [{ t, c, r }], sign: ["Checked by"] }, "file_name")
// A column named "#Price" is a number column and lines up on the right.
// PDF.download(spec, "file_name", PDF.sheet) draws a designed A4 document instead (see doc-a4.js).
const PDF = (() => {
  const W = 595.28,
    H = 841.89,
    M = 40,
    ROW = 18,
    INK = "0.141 0.106 0.071",
    STRIPE = "0.98 0.961 0.918",
    RULE = "0.851 0.804 0.722",
    // Helvetica's character widths, for space to width 126, in 1000ths of the font size.
    AFM = [
      278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
      556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722,
      667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944,
      667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
      500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334,
      584
    ];
  /** The standard PDF fonts only hold Western letters. Anything else prints as a question mark. */
  const plain = s =>
    String(s === null || s === undefined ? "" : s)
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/[^ -~ -ÿ]/g, "?");
  const width = (s, size, bold) =>
    (plain(s)
      .split("")
      .reduce((a, ch) => a + (AFM[ch.charCodeAt(0) - 32] || 556), 0) *
      size *
      (bold ? 1.06 : 1)) /
    1000;
  const esc = s => plain(s).replace(/([\\()])/g, "\\$1");
  /** Cuts text to fit its column, marking that it was cut. */
  function fit(s, w, size, bold) {
    let t = plain(s);
    if (width(t, size, bold) <= w) return t;
    while (t && width(t + "...", size, bold) > w) t = t.slice(0, -1);
    return t + "...";
  }
  const name = c => (c[0] === "#" ? c.slice(1) : c);
  /** Each column gets what it needs. When that's too wide for the page, only the widest ones give way. */
  function colWidths(c, r, total) {
    const want = c.map(
        (h, i) => Math.max(width(name(h), 9.5, true), ...r.map(x => width(x[i], 9.5, false))) + 13
      ),
      sum = want.reduce((a, b) => a + b, 0);
    if (sum <= total) {
      // Spare room goes to the widest text column, so prices stay close to their names.
      const text = want.filter((x, i) => c[i][0] !== "#"),
        wide = text.length ? want.indexOf(Math.max(...text)) : 0;
      return want.map((x, i) => (i === wide ? x + total - sum : x));
    }
    const sorted = [...want].sort((a, b) => a - b);
    let left = total,
      cap = 0;
    for (let i = 0; i < sorted.length; i++) {
      cap = left / (sorted.length - i);
      if (sorted[i] > cap) break;
      left -= sorted[i];
    }
    return want.map(x => Math.min(x, cap));
  }
  function assemble(pages, o) {
    // The file itself: fonts, then each page and its contents, then the table of where they all are.
    const objs = [],
      add = s => objs.push(s) && objs.length,
      catalog = add(""),
      tree = add(""),
      f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
      f2 = add(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
      ),
      logo = o.logoImg
        ? add(
            `<< /Type /XObject /Subtype /Image /Width ${o.logoImg.w} /Height ${o.logoImg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${o.logoImg.data.length} >>\nstream\n${o.logoImg.data}\nendstream`
          )
        : 0,
      kids = pages.map((p, i) => {
        const foot = `Page ${i + 1} of ${pages.length}`,
          small = [
            `BT /F1 8 Tf 0.4 0.4 0.4 rg ${M} 24 Td (${esc(o.by || "")}) Tj ET`,
            `BT /F1 8 Tf 0.4 0.4 0.4 rg ${(W - M - width(foot, 8)).toFixed(2)} 24 Td (${esc(foot)}) Tj ET`
          ],
          body = [...p, ...small].join("\n"),
          content = add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
        return add(
          `<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${logo ? ` /XObject << /Im1 ${logo} 0 R >>` : ""} >> /Contents ${content} 0 R >>`
        );
      });
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R >>`;
    objs[tree - 1] =
      `<< /Type /Pages /Count ${kids.length} /Kids [${kids.map(k => k + " 0 R").join(" ")}] >>`;
    let out = "%PDF-1.4\n";
    const at = objs.map((b, i) => {
      const pos = out.length;
      out += `${i + 1} 0 obj\n${b}\nendobj\n`;
      return pos;
    });
    const start = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${at.map(p => String(p).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${start}\n%%EOF`;
    return out;
  }
  function build(o) {
    const pages = [];
    let page = [],
      y = 0;
    const text = (s, x, yy, size, bold, rgb) =>
        page.push(
          `BT /F${bold ? 2 : 1} ${size} Tf ${rgb || "0 0 0"} rg ${x.toFixed(2)} ${yy.toFixed(2)} Td (${esc(s)}) Tj ET`
        ),
      fill = (x, yy, w, h, rgb) =>
        page.push(
          `${rgb} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
        ),
      line = yy =>
        page.push(`${RULE} RG 0.5 w ${M} ${yy.toFixed(2)} m ${W - M} ${yy.toFixed(2)} l S`),
      newPage = () => {
        if (page.length) pages.push(page);
        page = [];
        y = H - M;
      };
    newPage();
    text(o.company, M, y - 14, 16, true, INK);
    text(o.title, M, y - 32, 12, true, INK);
    if (o.head) text(o.head, M, y - 47, 9.5, false);
    y -= o.head ? 60 : 46;
    page.push(`0.659 0.455 0.102 RG 1.8 w ${M} ${y.toFixed(2)} m ${W - M} ${y.toFixed(2)} l S`);
    y -= 16;
    const header = (c, cw) => {
      fill(M, y - ROW + 13, W - 2 * M, ROW, INK);
      let x = M;
      c.forEach((h, i) => {
        const t = fit(name(h), cw[i] - 12, 9.5, true);
        text(
          t,
          h[0] === "#" ? x + cw[i] - 6 - width(t, 9.5, true) : x + 6,
          y - 1,
          9.5,
          true,
          "1 1 1"
        );
        x += cw[i];
      });
      y -= ROW;
    };
    o.sections.forEach(s => {
      const cw = colWidths(s.c, s.r, W - 2 * M);
      // A heading never sits alone at the bottom of a page.
      if (y < M + 30 + 3 * ROW) newPage();
      if (s.t) {
        text(s.t, M, y, 12, true, INK);
        y -= 18;
      }
      header(s.c, cw);
      s.r.forEach((r, n) => {
        if (y < M + 24) {
          newPage();
          header(s.c, cw);
        }
        if (n % 2) fill(M, y - ROW + 13, W - 2 * M, ROW, STRIPE);
        let x = M;
        r.forEach((v, i) => {
          const t = fit(v, cw[i] - 12, 9.5, false);
          text(t, s.c[i][0] === "#" ? x + cw[i] - 6 - width(t, 9.5) : x + 6, y - 1, 9.5, false);
          x += cw[i];
        });
        y -= ROW;
      });
      y -= 14;
    });
    // Lines to sign on, side by side under everything else.
    if (o.sign && o.sign.length) {
      if (y < M + 70) newPage();
      y -= 34;
      const gap = 18,
        sw = (W - 2 * M - gap * (o.sign.length - 1)) / o.sign.length;
      o.sign.forEach((s, i) => {
        const x = M + i * (sw + gap);
        page.push(
          `0 0 0 RG 0.6 w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x + sw).toFixed(2)} ${y.toFixed(2)} l S`
        );
        text(fit(s, sw, 8.5, false), x, y - 12, 8.5, false);
      });
    }
    pages.push(page);
    return assemble(pages, o);
  }
  /** Text cut into lines that fit a width. */
  function wrap(s, w, size, bold) {
    const out = [];
    let cur = "";
    plain(s)
      .split(/\s+/)
      .forEach(word => {
        const next = cur ? cur + " " + word : word;
        if (cur && width(next, size, bold) > w) {
          out.push(cur);
          cur = word;
        } else cur = next;
      });
    if (cur) out.push(cur);
    return out.length ? out : [""];
  }
  /** A designed A4 document: letterhead, parties, facts, items, totals, notes and lines to sign. */
  function sheet(o) {
    const BRASS = "0.659 0.455 0.102",
      GREY = "0.42 0.388 0.345",
      PAPER = "0.976 0.961 0.929",
      RED = "0.702 0.149 0.118",
      TONE = { ok: "0.122 0.478 0.302", warn: BRASS, bad: RED },
      RW = 20,
      R = W - M,
      pages = [];
    let page = [],
      y = H - M;
    const text = (s, x, yy, size, bold, rgb) =>
        page.push(
          `BT /F${bold ? 2 : 1} ${size} Tf ${rgb || INK} rg ${x.toFixed(2)} ${yy.toFixed(2)} Td (${esc(s)}) Tj ET`
        ),
      right = (s, x, yy, size, bold, rgb) => text(s, x - width(s, size, bold), yy, size, bold, rgb),
      fill = (x, yy, w, h, rgb) =>
        page.push(
          `${rgb} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
        ),
      rule = (x1, x2, yy, rgb, w) =>
        page.push(
          `${rgb} RG ${w} w ${x1.toFixed(2)} ${yy.toFixed(2)} m ${x2.toFixed(2)} ${yy.toFixed(2)} l S`
        ),
      newPage = () => {
        pages.push(page);
        page = [];
        y = H - M;
      },
      room = h => {
        if (y - h < M + 14) newPage();
      };
    // letterhead
    const L = o.logoImg,
      lh = L ? Math.min(52, (L.h * 72) / L.w) : 0,
      lw = L ? (lh * L.w) / L.h : 0,
      tx = L ? M + lw + 10 : M,
      titleW = Math.max(width(o.title, 19, true), width(o.no, 11, true)),
      coLines = o.co.lines.flatMap(l => wrap(l, R - titleW - 24 - tx, 8.5));
    if (L)
      page.push(`q ${lw.toFixed(2)} 0 0 ${lh.toFixed(2)} ${M} ${(y - lh).toFixed(2)} cm /Im1 Do Q`);
    wrap(o.co.name, R - titleW - 24 - tx, 15, true)
      .slice(0, 2)
      .forEach((l, i) => text(l, tx, y - 13 - i * 17, 15, true));
    const nameH = wrap(o.co.name, R - titleW - 24 - tx, 15, true).slice(0, 2).length * 17;
    coLines.forEach((l, i) => text(l, tx, y - 11 - nameH - i * 11, 8.5, false, GREY));
    right(o.title, R, y - 15, 19, true);
    right(o.no, R, y - 31, 11, true, BRASS);
    right(o.date, R, y - 43, 9, false, GREY);
    const pw = width(o.status[0], 8.5, true) + 16;
    fill(R - pw, y - 62, pw, 14, TONE[o.status[1]] || GREY);
    text(o.status[0], R - pw + 8, y - 58, 8.5, true, "1 1 1");
    y -= Math.max(68, lh + 6, 11 + nameH + coLines.length * 11) + 4;
    rule(M, R, y, BRASS, 1.8);
    y -= 12;
    if (o.banner) {
      page.push(`${RED} RG 1 w ${M} ${(y - 18).toFixed(2)} ${(R - M).toFixed(2)} 20 re S`);
      text(o.banner, (W - width(o.banner, 10, true)) / 2, y - 12, 10, true, RED);
      y -= 30;
    }
    // who it's between
    const gap = 12,
      pcw = (R - M - gap * (o.parties.length - 1)) / o.parties.length,
      plines = o.parties.map(p => p.lines.flatMap(l => wrap(l, pcw - 24, 9))),
      ph = 34 + Math.max(0, ...plines.map(l => l.length)) * 11.5;
    o.parties.forEach((p, i) => {
      const x = M + i * (pcw + gap);
      fill(x, y - ph, pcw, ph, PAPER);
      fill(x, y - ph, 2.5, ph, BRASS);
      text(p.h.toUpperCase(), x + 12, y - 13, 7.5, true, GREY);
      text(fit(p.name, pcw - 24, 11, true), x + 12, y - 27, 11, true);
      plines[i].forEach((l, j) => text(l, x + 12, y - 39 - j * 11.5, 9, false, GREY));
    });
    y -= ph + 16;
    // the facts, four to a row
    const fw = (R - M) / 4;
    for (let i = 0; i < o.facts.length; i += 4) {
      o.facts.slice(i, i + 4).forEach(([l, v], j) => {
        text(l.toUpperCase(), M + j * fw, y, 7, true, GREY);
        text(fit(v, fw - 10, 9.5, true), M + j * fw, y - 12, 9.5, true);
      });
      y -= 27;
    }
    rule(M, R, y + 6, RULE, 0.6);
    y -= 12;
    // items
    const cw = colWidths(o.c, o.r, R - M),
      head = () => {
        fill(M, y - RW + 14, R - M, RW, INK);
        let x = M;
        o.c.forEach((h, i) => {
          const t = fit(name(h), cw[i] - 12, 9, true);
          text(t, h[0] === "#" ? x + cw[i] - 6 - width(t, 9, true) : x + 6, y, 9, true, "1 1 1");
          x += cw[i];
        });
        y -= RW;
      };
    head();
    o.r.forEach((r, n) => {
      if (y < M + 34) {
        newPage();
        head();
      }
      if (n % 2) fill(M, y - RW + 14, R - M, RW, "0.984 0.973 0.945");
      let x = M;
      r.forEach((v, i) => {
        const t = fit(v, cw[i] - 12, 9.5, false);
        text(t, o.c[i][0] === "#" ? x + cw[i] - 6 - width(t, 9.5) : x + 6, y, 9.5, false);
        x += cw[i];
      });
      rule(M, R, y - 6, RULE, 0.4);
      y -= RW;
    });
    // totals
    if (o.totals) {
      y -= 4;
      room(o.totals.length * 20);
      const tw = 200,
        tx0 = R - tw;
      o.totals.forEach(([l, v, big]) => {
        if (big) fill(tx0, y - 6, tw, 20, INK);
        const c = big ? "1 1 1" : INK,
          sz = big ? 11 : 9.5;
        text(l, tx0 + 8, y, sz, !!big, c);
        right(v, R - 8, y, sz, !!big, c);
        y -= 20;
      });
    }
    // notes
    y -= 6;
    o.notes.forEach(([l, v]) => {
      const lines = wrap(`${l}: ${v}`, R - M, 9);
      room(lines.length * 12 + 4);
      lines.forEach(t => {
        text(t, M, y, 9);
        y -= 12;
      });
      y -= 4;
    });
    // lines to sign on
    room(70);
    const sgap = 16,
      sw = (R - M - sgap * (o.sign.length - 1)) / o.sign.length,
      sy = Math.min(y - 40, M + 52);
    o.sign.forEach((s, i) => {
      const x = M + i * (sw + sgap);
      rule(x, x + sw, sy, INK, 0.7);
      text(fit(s, sw, 9, true), x, sy - 12, 9, true);
      text("Name, signature and date", x, sy - 23, 7.5, false, GREY);
    });
    pages.push(page);
    return assemble(pages, o);
  }
  function download(o, fileName, make = build) {
    const s = make(o),
      bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 255;
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })),
      a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/[^\w.-]+/g, "_") + ".pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return { build, sheet, download };
})();

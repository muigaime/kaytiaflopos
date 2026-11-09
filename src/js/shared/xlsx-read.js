// ---- reading an .xlsx file: an .xlsx is a zip of XML files ----
/** The first sheet as rows of text. Throws if the file isn't a readable .xlsx. */
async function xlsxRows(file) {
  const buf = new Uint8Array(await file.arrayBuffer()),
    dv = new DataView(buf.buffer),
    text = b => new TextDecoder().decode(b);
  let end = buf.length - 22;
  while (end >= 0 && dv.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("not xlsx");
  const count = dv.getUint16(end + 10, true),
    entries = {};
  let p = dv.getUint32(end + 16, true);
  for (let i = 0; i < count; i++) {
    const n = dv.getUint16(p + 28, true),
      x = dv.getUint16(p + 30, true),
      c = dv.getUint16(p + 32, true);
    entries[text(buf.subarray(p + 46, p + 46 + n))] = {
      method: dv.getUint16(p + 10, true),
      size: dv.getUint32(p + 20, true),
      at: dv.getUint32(p + 42, true)
    };
    p += 46 + n + x + c;
  }
  const open = async name => {
    const e = entries[name];
    if (!e) return null;
    const start = e.at + 30 + dv.getUint16(e.at + 26, true) + dv.getUint16(e.at + 28, true),
      raw = buf.subarray(start, start + e.size);
    if (e.method === 0) return text(raw);
    const s = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return text(new Uint8Array(await new Response(s).arrayBuffer()));
  };
  const xml = t => new DOMParser().parseFromString(t, "application/xml"),
    all = (n, k) => [...n.getElementsByTagNameNS("*", k)],
    sheet = Object.keys(entries)
      .filter(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n))
      .sort()[0];
  if (!sheet) throw new Error("no sheet");
  const ss = await open("xl/sharedStrings.xml"),
    shared = ss
      ? all(xml(ss), "si").map(si =>
          all(si, "t")
            .map(t => t.textContent)
            .join("")
        )
      : [],
    colNo = ref => {
      let n = 0;
      for (const ch of ref.replace(/\d/g, "")) n = n * 26 + ch.charCodeAt(0) - 64;
      return n - 1;
    };
  return all(xml(await open(sheet)), "row").map(row => {
    const out = [];
    all(row, "c").forEach((c, i) => {
      const at = c.getAttribute("r") ? colNo(c.getAttribute("r")) : i,
        kind = c.getAttribute("t"),
        v = all(c, "v")[0];
      out[at] =
        kind === "s"
          ? shared[+v.textContent] || ""
          : kind === "inlineStr"
            ? all(c, "t")
                .map(t => t.textContent)
                .join("")
            : v
              ? v.textContent
              : "";
    });
    return Array.from(out, x => String(x === undefined ? "" : x).trim());
  });
}

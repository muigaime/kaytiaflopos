// ---- Scanning a sticker at the till: a barcode scanner types the code very fast and presses Enter ----
let scanBuf = "",
  scanAt = 0;
/** The item for a scanned code. A sticker from another selling point finds the same product here. */
function scanFind(code) {
  const m = /^KF(\d+)$/.exec(code);
  if (!m) return { none: true };
  const it = ITEMS.find(i => i.id === +m[1]);
  if (!it) return { none: true };
  const here = i => i.sell !== "acc" && !catOffAt(i.d, i.c) && inPoint(i, dept);
  if (here(it)) return { it };
  const same = ITEMS.find(i => here(i) && i.n.toLowerCase() === it.n.toLowerCase());
  return same ? { it: same } : { away: it };
}
function scanDone(code) {
  const r = scanFind(code);
  if (r.none) return fsNote("That barcode isn't on the system.");
  if (r.away) return fsNote(`${r.away.n} isn't sold at this selling point.`);
  const q = nextQty;
  nextQty = 1;
  pickItem(r.it.id, q);
}
window.addEventListener(
  "keydown",
  e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "");
    if (
      typing ||
      !user ||
      $("#login").style.display !== "none" ||
      $("#start").style.display !== "none" ||
      $("#bo").classList.contains("show") ||
      $("#fd").classList.contains("show") ||
      document.querySelector("body > .modal.show")
    )
      return;
    const now = Date.now();
    if (now - scanAt > 80) scanBuf = "";
    scanAt = now;
    if (e.key === "Enter") {
      if (/^KF\d+$/.test(scanBuf)) {
        e.preventDefault();
        e.stopPropagation();
        scanDone(scanBuf);
      }
      scanBuf = "";
    } else if (e.key.length === 1) scanBuf += e.key;
  },
  true
);

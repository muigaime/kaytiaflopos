// Bundles src/ into ONE self-contained HTML file in dist/.
// Run from the project folder:  node scripts/build.js   (or double-click build.bat)
// scripts/dev.js reuses buildHtml() to serve the same page with live reload.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const OUT_DIR = path.join(__dirname, '..', 'dist');
const OUT_FILE = path.join(OUT_DIR, 'Kaytia_POS_BackOffice_v1_8_0.html');

function buildHtml() {
  const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8').replace(/\r?\n$/, '');
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

  // A run of consecutive local <link rel="stylesheet" href="css/..."> lines becomes ONE <style> block.
  html = html.replace(/(?:[ \t]*<link rel="stylesheet" href="css\/[^"]+"\s*\/?>\r?\n)+/g, (run) => {
    const files = [...run.matchAll(/href="(css\/[^"]+)"/g)].map((m) => m[1]);
    return `<style>\n${files.map(read).join('\n')}\n</style>\n`;
  });

  // A run of consecutive <script src="js/..."> lines becomes ONE <script> block (order preserved).
  // A blank line in index.html starts a new block, so the 4 separate <script> blocks
  // (POS, shifts, Front Desk, Back Office) are kept.
  // If the run's tags carry data-private, the block is wrapped in (() => { ... })(); so its
  // top-level names stay private to that group (the Back Office redefines $, toast, etc.).
  html = html.replace(/(?:[ \t]*<script src="js\/[^"]+"(?: data-private)?><\/script>\r?\n)+/g, (run) => {
    const files = [...run.matchAll(/src="(js\/[^"]+)"/g)].map((m) => m[1]);
    const code = files.map(read).join('\n');
    return `<script>\n${run.includes('data-private') ? `(() => {\n${code}\n})();` : code}\n</script>\n`;
  });

  // Local images become base64 data URIs.
  html = html.replace(/src="(assets\/[^"]+\.png)"/g, (_, p) =>
    `src="data:image/png;base64,${fs.readFileSync(path.join(SRC, p)).toString('base64')}"`);

  return html;
}

module.exports = { buildHtml, SRC };

if (require.main === module) {
  const html = buildHtml();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html);
  console.log(`Built ${path.relative(process.cwd(), OUT_FILE)} (${(html.length / 1024).toFixed(1)} KB)`);
}

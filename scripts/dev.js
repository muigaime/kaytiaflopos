// Dev server: builds the page from src/ on every request and reloads the browser when a file in src/ changes.
// Run from the project folder:  npm run dev   (then open http://localhost:5500)
// Nothing is written to dist/; use `npm run build` for the file you deploy.
const fs = require("fs");
const http = require("http");
const { exec } = require("child_process");
const { buildHtml, SRC } = require("./build");

const PORT = 5500;
const clients = new Set();

// Tiny live-reload client, injected before </body>.
const RELOAD = `<script>new EventSource("/__reload").onmessage = () => location.reload();</script>`;

http
  .createServer((req, res) => {
    if (req.url === "/__reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write("\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (req.url !== "/" && !req.url.startsWith("/?") && !req.url.startsWith("/#")) {
      res.writeHead(404);
      return res.end();
    }
    try {
      // Insert before the LAST </body>: app code may contain "</body>" in strings (e.g. printable pages).
      const built = buildHtml(),
        at = built.lastIndexOf("</body>"),
        html = at < 0 ? built + RELOAD : built.slice(0, at) + `${RELOAD}\n` + built.slice(at);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(html);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<pre style="color:#b91c1c;padding:20px">Build failed:\n\n${String(e.stack || e).replace(/</g, "&lt;")}</pre>${RELOAD}`
      );
    }
  })
  .listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Dev server on ${url}  (edits in src/ reload the page, Ctrl+C to stop)`);
    if (process.platform === "win32" && !process.env.NO_OPEN) exec(`start "" ${url}`);
  });

let timer = null;
fs.watch(SRC, { recursive: true }, (_, file) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`changed: ${file}`);
    clients.forEach(c => c.write("data: reload\n\n"));
  }, 120);
});

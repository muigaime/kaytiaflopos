// node tests/browser/update-e2e.js [KaytiaFlow_Update.exe]
// Installs the program to a temporary folder, leaves it running, then runs the update over it.
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http"), { spawn, execFileSync } = require("child_process");
const SRC = process.argv[2] || path.join(os.homedir(), "Desktop", "compiled", "KaytiaFlow_Update.exe");
const RUN = fs.mkdtempSync(path.join(os.tmpdir(), "kaytia-update-")), HOME = path.join(RUN, "home"), DESK = path.join(RUN, "desk"), DROP = path.join(RUN, "drop");
[HOME, DESK, DROP].forEach(d => fs.mkdirSync(d));
const env = { ...process.env, KAYTIA_HOME: HOME, KAYTIA_DESKTOP: DESK, KAYTIA_PORT: "5617", KAYTIA_API_PORT: "4617", KAYTIA_NO_BROWSER: "1" };
const wait = ms => new Promise(r => setTimeout(r, ms));
const up = () => new Promise(r => { const q = http.get("http://localhost:5617/", x => { x.resume(); r(x.statusCode); }); q.on("error", () => r(0)); q.setTimeout(1500, () => { q.destroy(); r(0); }); });
const until = async (f, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await wait(300); } return false; };
const must = (ok, w) => { console.log((ok ? "ok  " : "BAD ") + w); if (!ok) process.exitCode = 1; };
(async () => {
  const update = path.join(DROP, "KaytiaFlow_Update.exe");
  fs.copyFileSync(SRC, update);
  // The old version: the same program with a marker on the end, so replacing it shows.
  const target = path.join(HOME, "KaytiaFlow.exe");
  fs.copyFileSync(SRC, target);
  fs.appendFileSync(target, "OLD");
  const oldSize = fs.statSync(target).size;
  fs.mkdirSync(path.join(HOME, "data"));
  fs.writeFileSync(path.join(HOME, "data", "main.json"), '{"keep":"my sales"}');
  fs.writeFileSync(path.join(HOME, "config.json"), JSON.stringify({ role: "main", code: "123456", tills: {} }));
  const old = spawn(target, [], { env, stdio: "ignore", detached: true });
  old.unref();
  must(await until(async () => (await up()) === 200), "the old version is running");
  must(!!(await up()), "and it holds the file");
  const u = spawn(update, [], { env, stdio: "pipe" });
  let log = ""; u.stdout.on("data", d => (log += d));
  await new Promise(r => u.on("exit", r));
  console.log(log.trim().split(/\r?\n/).map(l => "  | " + l).join("\n"));
  must(fs.statSync(target).size === fs.statSync(SRC).size, "the program was replaced");
  must(fs.existsSync(path.join(HOME, "KaytiaFlow.previous.exe")) && fs.statSync(path.join(HOME, "KaytiaFlow.previous.exe")).size === oldSize, "the old version was kept");
  must(!fs.existsSync(path.join(HOME, "KaytiaFlow_Update.exe")), "no second program beside it");
  must(fs.readFileSync(path.join(HOME, "data", "main.json"), "utf8").includes("my sales"), "the data is untouched");
  must(JSON.parse(fs.readFileSync(path.join(HOME, "config.json"), "utf8")).code === "123456", "the settings are untouched");
  must(await until(async () => (await up()) === 200), "the new version started");
  must(fs.existsSync(path.join(DESK, "Kaytia POS.lnk")), "the shortcut is there");
  try { execFileSync("taskkill", ["/IM", "KaytiaFlow.exe", "/F"], { stdio: "ignore" }); } catch (e) {}
  await wait(1200);
  fs.rmSync(RUN, { recursive: true, force: true });
  process.exit(process.exitCode || 0);
})();

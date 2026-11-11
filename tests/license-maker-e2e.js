// node tests/license-maker-e2e.js [KaytiaLicenseMaker.exe] [KaytiaFlow.exe]
// Makes company keys with the License Maker (real signing key from tools/, never printed), then checks that a
// Kaytia Flow main computer keeps the key and lets only that many computers join.
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), { spawn } = require("child_process");
const ROOT = path.dirname(__dirname), COMPILED = path.join(os.homedir(), "Desktop", "compiled");
const LM = process.argv[2] || path.join(COMPILED, "KaytiaLicenseMaker.exe"), KF = process.argv[3] || path.join(COMPILED, "KaytiaFlow.exe");
const KEYFILE = path.join(ROOT, "tools", "license-private-key.json");
const must = (ok, w) => { console.log((ok ? "ok  " : "BAD ") + w); if (!ok) process.exitCode = 1; };
const wait = ms => new Promise(r => setTimeout(r, ms));
if (!fs.existsSync(KEYFILE)) { console.log("skipped: no signing key on this computer"); process.exit(0); }
const secret = JSON.parse(fs.readFileSync(KEYFILE, "utf8"));
const pub = crypto.createPublicKey({ key: { kty: "RSA", n: secret.n, e: secret.e }, format: "jwk" });
const payload = raw => JSON.parse(Buffer.from(raw.split(".")[1], "base64url").toString("utf8"));
(async () => {
  const RUN = fs.mkdtempSync(path.join(os.tmpdir(), "kaytia-lm-")), procs = [];
  try {
    // ---- the License Maker
    const exe = path.join(RUN, "KaytiaLicenseMaker.exe"), urlFile = path.join(RUN, "url.txt");
    fs.copyFileSync(LM, exe);
    const buf = fs.readFileSync(exe), pe = buf.readUInt32LE(0x3c);
    must(buf.readUInt16LE(pe + 24 + 68) === 2, "the License Maker has no black window");
    must(!buf.includes(Buffer.from(secret.d)), "the signing key is not inside it");
    const lm = spawn(exe, [], { env: { ...process.env, KAYTIA_NO_BROWSER: "1", KAYTIA_LM_URL_FILE: urlFile }, stdio: "ignore" });
    procs.push(lm);
    for (let i = 0; i < 60 && !fs.existsSync(urlFile); i++) await wait(250);
    const base = fs.readFileSync(urlFile, "utf8");
    const call = async (pth, body) => {
      const r = await fetch(base + pth, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
      return { st: r.status, j: await r.json().catch(() => null) };
    };
    const page = await (await fetch(base)).text();
    must(/Company name/.test(page) && /id="days"[^>]*value="365"/.test(page) && /id="machines"[^>]*value="1"/.test(page) && /Generate license/.test(page) && !/id="code"/.test(page), "the form is the company name, with days (1 year) and computers (1) filled in");
    let r = await call("api/make", { company: "X", days: 365, machines: 1 });
    must(r.st === 400 && /signing key first/.test(r.j.error), "it asks for the signing key first");
    const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ format: "jwk" });
    r = await call("api/key", { text: JSON.stringify(other) }); must(r.st === 400 && /doesn't belong/.test(r.j.error), "someone else's signing key is refused");
    r = await call("api/key", { text: fs.readFileSync(KEYFILE, "utf8") }); must(r.st === 200, "the real signing key is accepted");
    r = await call("api/make", { company: " ", days: 365, machines: 1 }); must(r.st === 400 && /company name/.test(r.j.error), "the company name is needed");
    r = await call("api/make", { company: "X Hotel", days: 365, machines: 0 }); must(r.st === 400 && /how many computers/.test(r.j.error), "at least one computer");
    const k1 = (await call("api/make", { company: "The Tide Hotel", days: 365, machines: 1 })).j;
    const want = new Date(); want.setDate(want.getDate() + 365);
    const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const p1 = payload(k1.raw);
    must(p1.c === "The Tide Hotel" && p1.i === "*" && p1.m === 1 && p1.t === "full" && p1.e === ymd(want), "the company name alone gives a 1-year key for 1 computer");
    const k2 = (await call("api/make", { company: "Serena Beach Resort", days: 90, machines: 2 })).j;
    must(payload(k2.raw).m === 2 && k2.days === 90, "a key for 2 computers and 90 days");
    const kLife = (await call("api/make", { company: "Demo", lifetime: true, machines: 3 })).j;
    must(kLife.e === "" && kLife.m === 3, "a lifetime key has no end date");
    must(crypto.verify("sha256", Buffer.from(k2.raw.split(".")[1]), pub, Buffer.from(k2.raw.split(".")[2], "base64url")), "the signature checks out");
    const st = (await call("api/state")).j;
    must(st.list.length === 3 && st.list[0].c === "Demo", "every license is listed");
    const csv = await (await fetch(base + "api/csv")).text();
    must(/Computers/.test(csv.split("\n")[0]) && /Serena Beach Resort/.test(csv), "the list exports to CSV with the computers");
    await call("api/bye", {}); await wait(600);

    // ---- a Kaytia Flow main computer with a 2-computer key
    const home = path.join(RUN, "home");
    fs.mkdirSync(home);
    fs.writeFileSync(path.join(home, "config.json"), JSON.stringify({ role: "main", chosen: true, id: "main-1", code: "123456", epoch: "e1", idx: 0, tills: {} }));
    const kfExe = path.join(RUN, "KaytiaFlow.exe");
    fs.copyFileSync(KF, kfExe);
    const kf = spawn(kfExe, [], { env: { ...process.env, KAYTIA_HOME: home, KAYTIA_NO_INSTALL: "1", KAYTIA_NO_BROWSER: "1", KAYTIA_NO_AUTOSTART: "1", KAYTIA_PORT: "5650", KAYTIA_API_PORT: "4650" }, stdio: "ignore" });
    procs.push(kf);
    const B = "http://localhost:5650";
    for (let i = 0; i < 80; i++) { try { if ((await fetch(B + "/lan/status")).ok) break; } catch (e) {} await wait(250); }
    const lan = async (pth, body) => {
      const r = await fetch(B + pth, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
      return { st: r.status, j: await r.json().catch(() => null) };
    };
    const net = async (pth, body) => {
      const r = await fetch("http://127.0.0.1:5650/net" + pth, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", "x-kaytia-code": "123456" }, body: body ? JSON.stringify(body) : undefined });
      return { st: r.status, j: await r.json().catch(() => null) };
    };
    let L = await lan("/lan/license");
    must(L.st === 200 && L.j.m === 0 && L.j.used === 1, "with no company key there is no limit");
    must((await net("/pair", { id: "early", name: "Early till" })).st === 200, "a till can join before any license");
    const bad = k2.raw.slice(0, -4) + (k2.raw.endsWith("AAAA") ? "BBBB" : "AAAA");
    L = await lan("/lan/license", { key: bad }); must(L.st === 400, "a changed key is refused by the program");
    // a key for one installation only (made the old way) isn't a company key
    const one = (() => { const p = Buffer.from(JSON.stringify({ c: "One PC", i: "KF-1A2B-3C4D-5E6F", t: "full", e: "", at: Date.now() })).toString("base64url"); return `KF1.${p}.${crypto.sign("sha256", Buffer.from(p), crypto.createPrivateKey({ key: secret, format: "jwk" })).toString("base64url")}`; })();
    L = await lan("/lan/license", { key: one }); must(L.st === 200 && L.j.kept === false && L.j.m === 0, "a key for one computer only isn't shared");
    L = await lan("/lan/license", { key: k2.raw }); must(L.st === 200 && L.j.kept === true && L.j.m === 2 && L.j.used === 2, "the 2-computer key is kept: 2 of 2 in use (main + the till that joined earlier)");
    let P = await net("/pair", { id: "till-b", name: "Bar till" });
    must(P.st === 409 && /covers 2 computers/.test(P.j.error), "a third computer is refused: " + (P.j && P.j.error));
    P = await net("/pair", { id: "early", name: "Early till" }); must(P.st === 200, "a till that already joined can still connect");
    const N = await net("/license"); must(N.st === 200 && N.j.key === k2.raw && N.j.m === 2, "tills get the key from the main computer");
    L = await lan("/lan/license", { key: k1.raw }); must(L.st === 409 && /older/.test(L.j.error), "an older key can't replace a newer one");
    L = await lan("/lan/license", { key: kLife.raw }); must(L.st === 200 && L.j.m === 3, "a newer key for 3 computers replaces it");
    P = await net("/pair", { id: "till-b", name: "Bar till" }); must(P.st === 200, "and now the third computer can join");
    const cfg = JSON.parse(fs.readFileSync(path.join(home, "config.json"), "utf8"));
    must(cfg.lic === kLife.raw, "the key is saved on the main computer");
  } finally {
    procs.forEach(p => { try { p.kill(); } catch (e) {} });
    await wait(500);
    fs.rmSync(RUN, { recursive: true, force: true });
  }
})();

// Two real copies of the program, each with its own real browser, talking over the network address.
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http"), { spawn, spawnSync } = require("child_process");
const SP = __dirname, EXE = process.argv[2] || path.join(os.homedir(), "Desktop", "compiled", "KaytiaFlow.exe"), EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const RUN = path.join(require("os").tmpdir(), "kaytia-lan-" + Date.now());
fs.mkdirSync(RUN, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a.map(x => (typeof x === "string" ? x : JSON.stringify(x))));
const lanIp = Object.values(os.networkInterfaces()).flat().find(a => a.family === "IPv4" && !a.internal)?.address;
const procs = [];
function startExe(name, port, extra = {}) {
  const p = spawn(EXE, [], { env: { ...process.env, KAYTIA_HOME: path.join(RUN, name), KAYTIA_PORT: port, KAYTIA_API_PORT: port - 1000, KAYTIA_NO_BROWSER: "1", KAYTIA_NO_INSTALL: "1", ...extra }, stdio: "ignore", detached: false });
  procs.push(p);
  return p;
}
async function startEdge(name, debugPort, url) {
  const p = spawn(EDGE, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${path.join(RUN, "prof-" + name)}`, `--remote-debugging-port=${debugPort}`, "--window-size=1400,900", url], { stdio: "ignore" });
  procs.push(p);
  let tab;
  for (let i = 0; i < 60 && !tab; i++) {
    await sleep(500);
    try {
      tab = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find(t => t.type === "page");
    } catch (e) {}
  }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  let id = 0;
  const wait = new Map();
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && wait.has(d.id)) {
      wait.get(d.id)(d);
      wait.delete(d.id);
    }
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable");
  await send("Page.enable");
  return {
    ev: async expr => {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error(name + ": " + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 300));
      return r.result.result.value;
    },
    onNew: src => send("Page.addScriptToEvaluateOnNewDocument", { source: src }),
    go: async u => { await send("Page.navigate", { url: u }); await sleep(2500); },
    reload: async () => { await send("Page.reload"); await sleep(2500); },
    shot: async f => { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(f, Buffer.from(r.result.data, "base64")); }
  };
}
const helpers = `(()=>{ window.__E=window.__E||[]; const wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);if(!el)throw new Error("missing "+s);el.click();};
const tile=n=>{const hit=()=>qa("#grid .it").find(b=>b.textContent.includes(n)); if(hit()) return hit(); for(const c of qa("#cats .cat").map(x=>x.dataset.c)){q('#cats [data-c="'+c+'"]').click(); if(hit()) return hit();}}, tab=async d=>{const b=q('#spTabs [data-t="'+d+'"]'); if(b) b.click(); await wait(40);}, add=async(n,d,t=1)=>{if(d) await tab(d); for(let i=0;i<t;i++){tile(n).click(); await wait(30);}};
const login=async p=>{for (const k of p+"E") { q('#kp [data-k="'+k+'"]').click(); await wait(40); } await wait(700);};
const send=async l=>{click("#sendBtn"); await wait(60); if(q("#mSend").classList.contains("show")){q("#lbl").value=l; click("#sendGo");} await wait(900);};
const sell=async(n,t,l)=>{ await add(n,"Bar",t); await send(l); click("#rcClose"); await wait(60); openPay([orders.find(o=>o.label===l)]); await wait(80); q("#pAmt").value="99999"; click("#pOk"); await wait(150); click("#rcClose"); await wait(60); };
window.T={wait,q,qa,click,add,login,send,sell}; return true; })()`;
const facts = `(()=>{ return { sales:SALES.length, nos:[...new Set(SALES.map(s=>s.no))], beer:STK.Bar.a, users:USERS.length, open:orders.length, pill:(document.querySelector("#lanPill")||{}).textContent||"", lan:window.__lan||null, rev:JSON.parse(localStorage.getItem("kaytia_lan_rev")||"null") }; })()`;
const head = fs.readFileSync(path.join(SP, "void-test.js"), "utf8");
const seedM = head.match(/localStorage\.setItem\("kaytia_pos_bo_v1",JSON\.stringify\((\{S:\[\][\s\S]*?\})\)\);<\/script>/);
if (!seedM) throw new Error("seed");
const seed = seedM[1].replace(/\\n/g, "");
function raw(port, p, { host, headers = {}, method = "GET", ip = "127.0.0.1" } = {}) {
  return new Promise(ok => {
    const q = http.request({ host: ip, port, path: p, method, headers: { ...headers, ...(host ? { Host: host } : {}) }, timeout: 5000 }, r => { r.resume(); r.on("end", () => ok(r.statusCode)); });
    q.on("error", e => ok("error " + e.code));
    q.end();
  });
}
(async () => {
  log("LAN address:", lanIp);
  let mainP = startExe("main", 5610);
  startExe("till", 5611);
  await sleep(2500);
  const A = await startEdge("a", 9310, "http://localhost:5610/"), B = await startEdge("b", 9311, "http://localhost:5611/");
  // ---- guards
  log("1 GUARDS:", {
    pageFromNetwork: await raw(5610, "/", { ip: lanIp }),
    infoFromNetwork: await raw(5610, "/lan/info", { ip: lanIp }),
    doorNoCode: await raw(5610, "/net/rev", { ip: lanIp }),
    doorBadCode: await raw(5610, "/net/rev", { ip: lanIp, headers: { "x-kaytia-code": "WRONG" } }),
    otherSite: await raw(5610, "/lan/info", { headers: { Origin: "http://evil.example" } }),
    rebinding: await raw(5610, "/lan/info", { host: "evil.example:5610" }),
    ownBrowser: await raw(5610, "/lan/info"),
    printFromNetwork: await raw(4610, "/api/health", { ip: lanIp })
  });
  // ---- Main
  await A.onNew(`if(!localStorage.getItem("seeded")){localStorage.setItem("seeded","1");localStorage.setItem("kaytia_machine","MAIN-PC");localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify(${seed}));}`);
  await A.reload();
  await A.ev(`fetch("/lan/main",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}).then(r=>r.ok)`);
  await A.reload();
  await A.ev(helpers);
  await A.ev(`(async()=>{ T.click('[data-go="pos"]'); await T.wait(300); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t")); await T.login("1111"); return true; })()`);
  log("1B POS:", await A.ev(`({user:user&&user.n,day:!!curDay(),shift:!!(user&&shiftOf(user.n)),login:document.querySelector("#login").style.display,tabs:!!document.querySelector("#spTabs"),modals:[...document.querySelectorAll(".modal.show")].map(x=>x.id),gate:(document.querySelector("#fsGate")||{}).hidden,ids:SHIFTS.length,licence:typeof LIC})`)); await A.shot(path.join(RUN,"lan-a.png"));
  await A.ev(`T.sell("Tusker",2,"M1")`);
  await sleep(5000);
  const info = await A.ev(`fetch("/lan/info").then(r=>r.json())`);
  log("2 MAIN SOLD:", await A.ev(facts), "| address", info.addresses, "| disk", fs.existsSync(path.join(RUN, "main", "data", "current.json")), "| rev on disk", JSON.parse(fs.readFileSync(path.join(RUN, "main", "data", "current.json"))).rev);
  // ---- Till joins by the real network address
  await B.onNew(`if(!localStorage.getItem("kaytia_machine")) localStorage.setItem("kaytia_machine","TILL-1");`);
  await B.reload();
  log("3 WRONG CODE:", await B.ev(`fetch("/lan/connect",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({host:"${lanIp}:5610",code:"NOPE"})}).then(r=>r.json())`));
  log("4 JOIN:", await B.ev(`fetch("/lan/connect",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({host:"${lanIp}:5610",code:"${info.code}"})}).then(r=>r.json())`));
  await B.reload();
  await sleep(6000);
  log("5 TILL HAS MAIN'S DATA:", await B.ev(facts));
  log("5B MACHINE NAME KEPT:", await B.ev(`localStorage.getItem("kaytia_machine")`), "| license on till is its own:", await B.ev(`JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).LI?.code||""`) !== await A.ev(`JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).LI?.code||""`));
  await B.ev(helpers);
  await B.ev(`(async()=>{ T.click('[data-go="pos"]'); await T.wait(300); await T.login("3333"); return true; })()`);
  // Main reloads so that it knows a till exists and numbers bills in its series
  await sleep(4000);
  log("6 SERIES:", "main", await A.ev(`window.__lan`), "till", await B.ev(`window.__lan`));
  // ---- both sell at once
  await Promise.all([A.ev(`T.sell("Tusker",1,"M2")`), B.ev(`T.sell("Tusker",3,"T1")`)]);
  await sleep(10000);
  const fa = await A.ev(facts), fb = await B.ev(facts);
  log("7 BOTH SOLD AT ONCE, main:", fa);
  log("8 BOTH SOLD AT ONCE, till:", fb);
  log("9 AGREE:", { sales: fa.sales === fb.sales && fa.sales === 3, beer: fa.beer === fb.beer && fa.beer === 44, uniqueBills: new Set(fa.nos).size === fa.nos.length, sameBills: JSON.stringify([...fa.nos].sort()) === JSON.stringify([...fb.nos].sort()) });
  // ---- Main busy: nothing moves under a cashier
  await A.ev(`T.add("Tusker","Bar",1)`);
  await B.ev(`T.sell("Tusker",1,"T2")`);
  await sleep(8000);
  log("10 MAIN MID-SALE:", await A.ev(`({sales:SALES.length,cart:Object.keys(cart).length})`), "| till", await B.ev(`SALES.length`));
  await A.ev(`T.send("M3")`);
  await A.ev(`T.click("#rcClose")`);
  await sleep(8000);
  log("11 AFTER THE SALE IS SENT:", await A.ev(facts));
  // ---- Main down: till keeps selling
  mainP.kill();
  await sleep(4500);
  await B.ev(`T.sell("Tusker",2,"T3")`);
  await sleep(4000);
  log("12 MAIN DOWN, TILL:", await B.ev(facts));
  mainP = startExe("main", 5610);
  await sleep(10000);
  log("13 MAIN BACK, TILL:", await B.ev(facts));
  log("14 MAIN BACK, MAIN:", await A.ev(`(async()=>{ if(orders.find(o=>o.label==="M3")){ openPay([orders.find(o=>o.label==="M3")]); await T.wait(80); T.q("#pAmt").value="99999"; T.click("#pOk"); await T.wait(150); T.click("#rcClose"); } await T.wait(7000); return ${facts}; })()`));
  await sleep(6000);
  log("15A STOCK SHOULD BE 50-2-1-3-1-1-2 = 40. It is:", await A.ev(`STK.Bar.a`), await B.ev(`STK.Bar.a`));
  log("15 FINAL:", { main: await A.ev(`({sales:SALES.length,beer:STK.Bar.a,open:orders.length})`), till: await B.ev(`({sales:SALES.length,beer:STK.Bar.a,open:orders.length})`) });
  // ---- A real restart reads the data back
  await A.reload();
  await sleep(4000);
  log("16 MAIN AFTER RELOAD:", await A.ev(`({sales:SALES.length,beer:STK.Bar.a})`));
  // ---- Browser data wiped on the Main: it comes back from disk
  await A.go("http://localhost:5610/connect");
  await A.ev(`localStorage.removeItem("kaytia_pos_bo_v1"); localStorage.removeItem("kaytia_lan_rev"); true`);
  await A.go("http://localhost:5610/");
  await sleep(7000);
  log("17 BROWSER WIPED ON MAIN:", await A.ev(`({sales:SALES.length,beer:STK.Bar.a,users:USERS.length})`));
  log("18 FILES:", fs.readdirSync(path.join(RUN, "main")), fs.readdirSync(path.join(RUN, "main", "backups")).map(x => x.replace(/\d{10,}/, "#")));
  log("19 CONFIG HAS CODE IN PLAIN:", Object.keys(JSON.parse(fs.readFileSync(path.join(RUN, "till", "config.json")))).join(","));
  await B.shot(path.join(RUN, "lan-till.png"));
  await B.ev(`T.click && true`);
  await A.go("http://localhost:5610/connect");
  await A.shot(path.join(RUN, "lan-connect.png"));
})()
  .catch(e => log("X", e.message))
  .finally(async () => {
    procs.forEach(p => { try { p.kill(); } catch (e) {} });
    await sleep(500);
    // ---- installing: into a test folder and a test desktop
    const inst = path.join(RUN, "inst"), desk = path.join(RUN, "desk");
    fs.mkdirSync(desk, { recursive: true });
    spawnSync(EXE, [], { env: { ...process.env, KAYTIA_HOME: inst, KAYTIA_DESKTOP: desk, KAYTIA_PORT: "5620", KAYTIA_API_PORT: "4620", KAYTIA_NO_BROWSER: "1" }, timeout: 40000 });
    await sleep(3000);
    log("20 INSTALL:", fs.readdirSync(inst), "| desktop", fs.readdirSync(desk));
    log("21 SECOND START RUNS FROM THERE:", await raw(5620, "/"));
    const lnk = spawnSync("powershell", ["-NoProfile", "-Command", `(New-Object -ComObject WScript.Shell).CreateShortcut('${path.join(desk, "Kaytia POS.lnk")}').TargetPath`], { encoding: "utf8" }).stdout.trim();
    log("22 SHORTCUT POINTS TO:", lnk.replace(RUN, "<test>"));
    spawnSync("powershell", ["-NoProfile", "-Command", `Get-Process KaytiaFlow -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${RUN}*' -or $_.Path -like '${path.dirname(EXE)}*' } | Stop-Process -Force`]);
    process.exit(0);
  });

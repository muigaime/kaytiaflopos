// node modules-kds-test.js <built.html>: the kitchen display and staff clock switched off and on in Settings → Modules.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const MODPW = fs.readFileSync(path.join(__dirname, "module-pass.local"), "utf8").trim(); // git-ignored
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};
localStorage.setItem("kaytia_machine","TEST-PC");localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify({S:[],C:[],U:[{n:"Jane Waiter",pin:"1111",d:["Bar","Restaurant","Pool"],role:"Waiter"},{n:"Solo Sam",pin:"3333",d:["Bar"],role:"Waiter"},{n:"Boss",pin:"0000",d:["Bar","Restaurant","Pool"],role:"Manager"}],
 I:[{id:1,n:"Tusker",d:"Bar",c:"Beer",p:200,t:"B",r:{a:1}},{id:2,n:"Fish",d:"Restaurant",c:"Mains",p:1000,t:"B",r:{c:1}},{id:3,n:"Dawa",d:"Restaurant",c:"Drinks",p:500,t:"B",r:{d:1}},{id:4,n:"Tusker",d:"Pool",c:"Beer",p:250,t:"B",r:{a:1}},{id:5,n:"Burger",d:"Pool",c:"Mains",p:800,t:"B",r:{c:1}}],
 G:{a:"A",c:"C",d:"D"},X:{a:10,c:10,d:10},IU:{},ST:["Main Store"],OL:["Bar","Restaurant","Pool"],OI:{Bar:{type:"Bar",store:"Main Store"},Restaurant:{type:"Restaurant",store:"Main Store"},Pool:{type:"Restaurant",store:"Main Store"}},K:{"Main Store":{},Bar:{a:50},Restaurant:{c:50,d:50},Pool:{a:50,c:50}},MV:[],GN:[],VN:[],LP:[],
 FS:{name:"The Tide",meals:{BB:800,HB:1800,FB:2600},child:50,printUrl:"http://localhost:4000",printers:[{n:"Kitchen",ip:"127.0.0.1",port:9101},{n:"Main Bar",ip:"127.0.0.1",port:9102},{n:"Pool Kitchen",ip:"127.0.0.1",port:9103},{n:"Dead",ip:"127.0.0.1",port:9109}],printRoutes:{Bar:{bar:"Main Bar"},Restaurant:{kitchen:"Kitchen",bar:"Main Bar"},Pool:{kitchen:"Pool Kitchen",bar:"Dead"}}}}));</script>`;
const tail = `<script>(async()=>{const log=m=>__E.push(m),wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);if(!el)throw new Error("missing "+s);el.click();};
const tile=n=>{const hit=()=>qa("#grid .it").find(b=>b.textContent.includes(n)); if(hit()) return hit(); for(const c of qa("#cats .cat").map(x=>x.dataset.c)){q('#cats [data-c="'+c+'"]').click(); if(hit()) return hit();}}, tab=async d=>{click('#spTabs [data-t="'+d+'"]'); await wait(15);}, add=async(n,d,t=1)=>{if(d) await tab(d); for(let i=0;i<t;i++){tile(n).click(); await wait(6);}};
const login=async p=>{for (const k of p+"E") { q('#kp [data-k="'+k+'"]').click(); await wait(15); } await wait(450);};
const send=async l=>{click("#sendBtn"); await wait(20); if(q("#mSend").classList.contains("show")){q("#lbl").value=l; click("#sendGo");} await wait(600);};
try{
  click('[data-go="pos"]'); await wait(200); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, tst=()=>(q("#toast")||{}).textContent||"", shown=s=>{ const e=q(s); return !!e&&getComputedStyle(e).display!=="none"; };
  must(shown('#start [data-go="kds"]')&&shown('#start [data-go="clock"]'),"the start screen offers the kitchen display and staff clock");
  await add("Fish","Restaurant",1); await send("T1"); await wait(100); click("#rcClose"); await wait(40);
  const n1=KDS.length; must(n1>0,"with the kitchen display on, a sent order reaches the kitchen");
  // Back Office → Settings → Modules
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async n=>{ qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(120); };
  await nav("Settings"); click('[data-a="hs_tab"][data-k="modules"]'); await wait(80);
  q("#modPw").value="${MODPW}"; click('[data-a="hs_modgo"]'); await wait(200);
  must(!!q('[data-a="hs_kdstog"]')&&!!q('[data-a="hs_clocktog"]')&&!!q('[data-a="hs_fdtog"]'),"Modules has switches for the Front Desk, the kitchen display and the staff clock");
  must(!!q('[data-a="hs_tab"][data-k="kds"]'),"Settings has a Kitchen display page while it's on");
  click('[data-a="hs_kdstog"]'); await wait(80);
  must(FD_SETTINGS.kdsOff===true&&/Kitchen display is off/.test(tst())&&q('[data-a="hs_kdstog"]').getAttribute("aria-checked")==="false","the kitchen display switches off");
  must(!q('[data-a="hs_tab"][data-k="kds"]'),"its Settings page is gone");
  must(FD_SETTINGS.auditTrail.some(x=>/Kitchen display switched off/.test(x.text)),"and it's recorded");
  click('[data-a="hs_stktog"]'); await wait(80);
  must(FD_SETTINGS.stickersOff===true&&/Product stickers and guest menu is off/.test(tst()),"stickers switch off");
  await nav("Products List"); must(!q('[data-a="prl_stk"]'),"the Products List has no Print stickers button");
  await nav("Settings"); click('[data-a="hs_tab"][data-k="modules"]'); await wait(80); if(q("#modPw")){ q("#modPw").value="${MODPW}"; click('[data-a="hs_modgo"]'); await wait(200); }
  click('[data-a="hs_stktog"]'); await wait(80); must(!FD_SETTINGS.stickersOff,"stickers switch back on");
  await nav("Products List"); must(!!q('[data-a="prl_stk"]'),"and Print stickers is back");
  await nav("Settings"); click('[data-a="hs_tab"][data-k="modules"]'); await wait(80); if(q("#modPw")){ q("#modPw").value="${MODPW}"; click('[data-a="hs_modgo"]'); await wait(200); }
  click('[data-a="hs_clocktog"]'); await wait(80);
  must(FD_SETTINGS.clockOff===true&&/Staff clock is off/.test(tst()),"the staff clock switches off");
  await nav("HR & Payroll"); must(!qa("[data-a='hr_tab']").some(x=>x.dataset.t==="clock"),"HR & Payroll has no Clock and biometric page");
  must(JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.kdsOff===true,"the switches are saved");
  q("#bo").classList.remove("show"); click("#home"); await wait(60);
  must(!shown('#start [data-go="kds"]')&&!shown('#start [data-go="clock"]')&&shown('#start [data-go="pos"]'),"the start screen no longer offers them");
  kdsOpen(); await wait(60); must(!q("#kds").classList.contains("show"),"the kitchen display can't be opened");
  // the POS with the kitchen display off
  click('[data-go="pos"]'); await wait(200); await login("1111");
  await add("Burger","Pool",1); await send("T2"); await wait(100); if(q("#rcClose")) click("#rcClose"); await wait(40);
  must(KDS.length===n1,"orders still send (and print) but make no kitchen tickets");
  click("#ordBtn"); await wait(60); must(qa("#ordList .kds-chip").every(c=>!c.textContent.trim()),"open orders show no kitchen status"); q("#mOrd").classList.remove("show");
  // back on
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  await nav("Settings"); click('[data-a="hs_tab"][data-k="modules"]'); await wait(80); q("#modPw").value="${MODPW}"; click('[data-a="hs_modgo"]'); await wait(200);
  click('[data-a="hs_kdstog"]'); await wait(60); click('[data-a="hs_clocktog"]'); await wait(60);
  must(!FD_SETTINGS.kdsOff&&!FD_SETTINGS.clockOff&&!!q('[data-a="hs_tab"][data-k="kds"]'),"both switch back on");
  await nav("HR & Payroll"); must(qa("[data-a='hr_tab']").some(x=>x.dataset.t==="clock"),"Clock and biometric is back");
  q("#bo").classList.remove("show"); click("#home"); await wait(60);
  must(shown('#start [data-go="kds"]')&&shown('#start [data-go="clock"]'),"and the start screen offers them again");
  click('[data-go="kds"]'); await wait(120); must(q("#kds").classList.contains("show")&&qa("#kds .kds-t").length>0,"the kitchen display opens with its orders"); q('#kds [data-kt="exit"]').click(); await wait(40);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=16000"];
  execFile("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", outPng ? [...args, `--screenshot=${outPng}`, "http://localhost:5599/"] : [...args, "--dump-dom", "http://localhost:5599/"], { encoding: "utf8", maxBuffer: 64e6, timeout: 90000 }, (e, o) => {
    if (outPng) console.log("saved", outPng);
    else {
      const m = (o || "").match(/data-test="([^"]*)"/);
      console.log((m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&gt;/g, ">") : "NO RESULT " + e).split(" @@ ").join("\n"));
      const show = b => b.replace(/[\x00-\x09\x0b-\x1f]./g, "").replace(/[^\x20-\x7e\n]/g, "").split("\n").map(x => x.trim()).filter(x => /ORDER|VOID|REASON|WHOLE|PREPARE| x /.test(x)).join(" | ");
      for (const k of Object.keys(got)) console.log("PRINTER " + k + ": " + got[k].map(show).join("  ##  "));
    }
    web.close(); P.forEach(s => s.close()); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (x) {}
    setTimeout(() => process.exit(0), 200);
  });
});

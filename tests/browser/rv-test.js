// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
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
  click('[data-go="pos"]'); await wait(200); posKioskOff(); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  const jobs=[]; const rf0=window.fetch; window.fetch=async(u,o)=>{ if(String(u).includes("/api/print/ticket")){ jobs.push(JSON.parse(o.body)); return {ok:true,json:async()=>({})}; } return rf0(u,o); };
  const tile=n=>qa("#grid .it").find(b=>b.textContent.includes(n)), snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);}, tab=async d=>{q('#spTabs [data-t="'+d+'"]').click(); await wait(15);}, cat=async c=>{const b=q('#cats [data-c="'+c+'"]'); if(b){b.click(); await wait(10);}}, mm=()=>q("#mMod").classList.contains("show"), payAll=async()=>{const e=q('[data-pa="cash"]'); e.value="50000"; e.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); click("#rcClose"); await wait(10);};
  const J=()=>USERS.find(u=>u.n==="Jane Waiter");
  // 1 day report
  SALES.push({no:"80",at:new Date(),bd:bizDate(),user:"x",dept:"Bar",g:300,tax:0,net:300,lines:[],mx:{pdq:100,room:150,comp:50}}); const dr=dayReport(curDay(),"t"); log("1 Z REPORT: "+["PDQ","Complimentary","Room","Tips","CASH","M-PESA","CREDIT"].filter(w=>dr.includes(">"+w+"<")).join()); SALES.pop();
  // 2 stale swap
  ITEMS.push({id:901,n:"Guinness",d:"Bar",c:"Beer",p:200,t:"B",r:{}}); await tab("Bar"); await add("Tusker","Bar"); click("#exBtn"); await wait(20); qa("#exOld .exi").find(b=>b.textContent.includes("Tusker")).click(); await wait(10); qa("#exNew .exi").find(b=>b.textContent.includes("Guinness")).click(); await wait(10); q("#exPin").value="0000"; click("#exGo"); await wait(30); click("#settleBtn"); await wait(30); await payAll(); const SW=BILLLOG.filter(x=>x.act==="Swap"); log("2 SETTLED DIRECT: swaps logged "+SW.length+" | on "+(SW[0]||{}).no+" | "+(SW[0]||{}).detail+" | waiting "+cartSwaps.length);
  await cat("Beer"); tile("Guinness").click(); await wait(15); jobs.length=0; await send("T9"); await wait(350); log("3 NEXT ORDER CLEAN: stamp "+!!q("#rc .sl-stamp")+" | swaps still "+BILLLOG.filter(x=>x.act==="Swap").length); click("#rcClose"); await wait(10); orders.splice(0,orders.length);
  // 4 negative cash
  const sh=shiftOf(J().n); SALES.push({no:"81",at:new Date(),bd:bizDate(),user:J().n,waiter:J().n,dept:"Bar",g:-1000,tax:0,net:-1000,lines:[],mx:{cash:-1000},ret:{of:"1"}}); log("4 CASH BELOW ZERO: expected "+shiftCalc(sh).expected); click("#shiftBtn"); await wait(20); click('#shMgr [data-sa="ms_end"]'); await wait(25); log("5 STILL ENDS: shift "+!!shiftOf(J().n)+" | "+(q("#shMgr .status:not(.ok)")||{}).textContent); SALES.pop();
  // 6 waiter, pending, new day
  J().perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,true])); openShifts().forEach(s=>shiftEnd(s,0,"t")); dayEnd("t"); orders.push({no:"70",ord:1,label:"T1",dept:"Bar",waiter:J().n,lines:{1:1},rounds:1,at:new Date()}); const d0=DAYS.length; shDraw(); await wait(15); click('#shMgr [data-sa="dstart"]'); await wait(20); log("6 PENDING BLOCKS NEW DAY: "+(q("#shMgr .status")||{}).textContent+" | days "+d0+" -> "+DAYS.length); orders.splice(0,orders.length); shDraw(); await wait(15); click('#shMgr [data-sa="dstart"]'); await wait(20); log("7 CLEARED, STARTS: days "+DAYS.length); click('#shMgr [data-sa="ms_start"]'); await wait(20); q("#shMgr").classList.remove("show");
  // 8 long note
  FD_SETTINGS.printers=[{n:"B",ip:"192.168.1.71",port:9100}]; FD_SETTINGS.printRules=[{src:"TEST-PC",doc:"BAR ORDER",point:"Bar",kind:"net",printer:"B",copies:1,paper:"80mm"}]; jobs.length=0; await tab("Bar"); await cat("Beer"); tile("Guinness").click(); await wait(15); kmsg="x".repeat(500); await send("T2"); await wait(350); log("8 LONG NOTE: longest line "+Math.max(...jobs[0].lines.map(l=>l.t.length))+" | "+q("#rcPrinted").textContent); click("#rcClose"); await wait(10); FD_SETTINGS.printRules=[];
  // 9 sides follow what went on
  STK.Restaurant.fx=2; STK.Restaurant.ug=9; ING.fx="fx (pcs)"; ING.ug="ug (pcs)"; ITEMS.push({id:910,n:"Beef",d:"Restaurant",c:"Mains",p:500,t:"B",r:{fx:1},accAsk:true},{id:911,n:"Ugali",d:"Restaurant",c:"Sides",p:100,t:"B",r:{ug:1},sell:"both"}); await tab("Restaurant"); await cat("Mains"); pickItem(910,5); await wait(20); qa("#modO .mod-o").find(b=>b.textContent.includes("Ugali")).click(); await wait(15); log("9 ASKED 5, STOCK 2: "+JSON.stringify(cart)); cart={}; drawCart(); STK.Restaurant.fx=0; pickItem(910,1); await wait(20); log("10 NONE IN STOCK: asks "+mm()+" | "+JSON.stringify(cart)); cart={}; drawCart();
  // 11 rename
  const U=USERS.find(u=>u.n==="Solo Sam"); U.role="Cashier"; shiftStart(U.n,0,"t"); SALES.push({no:"82",at:new Date(),bd:bizDate(),user:U.n,waiter:U.n,dept:"Bar",g:300,tax:0,net:300,lines:[],mx:{cash:300}}); orders.push({no:"71",ord:1,label:"T3",dept:"Bar",waiter:J().n,handedTo:U.n,lines:{1:1},rounds:1,at:new Date()}); const e0=shiftCalc(shiftOf(U.n)).expected;
  click("#lock"); await wait(25); posKioskOff(); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>x.dataset.n==="Waiter setup").click(); await wait(60); const ed=qa('[data-a="ws_edit"]').find(b=>USERS[+b.dataset.i]===U)||qa('#vSub [data-a="ws_edit"]').find(b=>b.closest("tr").textContent.includes("Solo Sam")); ed.click(); await wait(40); const nb=q('[data-ws="n"]')||q('[data-ws="name"]'); nb.value="Sam Solo"; nb.dispatchEvent(new Event("input",{bubbles:true})); nb.dispatchEvent(new Event("change",{bubbles:true})); await wait(15); click('[data-a="ws_save"]'); await wait(40);
  log("11 RENAMED: "+q("#toast").textContent+" | expected "+e0+" -> "+shiftCalc(shiftOf("Sam Solo")).expected+" | sale "+SALES.find(s=>s.no==="82").user+" | handed "+orders.find(o=>o.no==="71").handedTo);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "rv-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=45000"];
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

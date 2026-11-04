// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__rpauto=setInterval(()=>{const m=document.getElementById("mRp"); if(m&&m.classList.contains("show")){document.getElementById("rpPin").value="0000"; document.getElementById("rpGo").click();}},2);
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
  const jobs=[]; const rf0=window.fetch; window.fetch=async(u,o)=>{ if(String(u).includes("/api/print/ticket")){ jobs.push(JSON.parse(o.body)); return {ok:true,json:async()=>({})}; } return rf0(u,o); };
  ITEMS.push({id:901,n:"Guinness",d:"Bar",c:"Beer",p:200,t:"B",r:{}},{id:902,n:"Soup",d:"Restaurant",c:"Mains",p:1000,t:"B",r:{}},{id:903,n:"Chapati",d:"Bar",c:"Mains",p:200,t:"B",r:{}});
  FD_SETTINGS.printers=[{n:"K",ip:"192.168.1.70",port:9100},{n:"B",ip:"192.168.1.71",port:9100}]; FD_SETTINGS.printRules=[{src:"TEST-PC",doc:"BAR ORDER",point:"Bar",kind:"net",printer:"B",copies:1,paper:"80mm"},{src:"TEST-PC",doc:"KITCHEN ORDER",point:"Restaurant",kind:"net",printer:"K",copies:1,paper:"80mm"},{src:"TEST-PC",doc:"BAR ORDER",point:"Restaurant",kind:"net",printer:"B",copies:1,paper:"80mm"},{src:"TEST-PC",doc:"KITCHEN ORDER",point:"Bar",kind:"net",printer:"K",copies:1,paper:"80mm"}];
  const snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);}, shown=s=>getComputedStyle(q(s)).display!=="none", pickOld=async n=>{qa("#exOld .exi").find(b=>b.textContent.includes(n)).click(); await wait(10);}, pickNew=async n=>{qa("#exNew .exi").find(b=>b.textContent.includes(n)).click(); await wait(10);}, news=()=>qa("#exNew .exi").map(b=>b.querySelector("b").textContent).join(), pin=v=>{q("#exPin").value=v;}, go=async()=>{click("#exGo"); await wait(40);};
  const J=()=>USERS.find(u=>u.n==="Jane Waiter"), rights=on=>{J().perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,k==="swap"?on:true]));};
  rights(false); applyRights(); await add("Tusker","Bar"); await snd("T1"); log("1 NO RIGHT: exchange button "+shown("#exBtn")); click("#ordBtn"); await wait(10); log("2 NO RIGHT, LIST: "+q("#ordList").textContent.includes("Swap")); click('#mOrd [data-close]'); await wait(10); exOpen(orders[0]); log("3 NO RIGHT, BLOCKED: modal "+q("#mEx").classList.contains("show")+" | "+(qa("#fsn").pop()||{}).textContent);
  rights(true); applyRights(); log("4 WITH RIGHT: "+shown("#exBtn")); const o=orders[0]; click("#ordBtn"); await wait(10); q('#ordList [data-oa="swap"]').click(); await wait(20); log("5 POPUP: "+q("#exT").textContent+" | "+q("#exGo").textContent+" | pin "+shown("#exAuth")+" | reasons "+qa("#exReasons .chip").length+" | new before picking ["+news()+"]");
  await pickOld("Tusker"); log("6 SAME PRICE ONLY: "+news()+" | fish offered "+news().includes("Fish"));
  await pickNew("Guinness"); log("7 SUM: "+q("#exSum").textContent);
  pin(""); await go(); log("8 NO PIN: "+q("#exMsg").textContent+" | line "+JSON.stringify(o.lines)); pin("1111"); await go(); log("9 WAITER'S OWN PIN: "+q("#exMsg").textContent+" | still open "+q("#mEx").classList.contains("show"));
  jobs.length=0; const g0=totals(o.lines,o).g; pin("0000"); await go(); await wait(250); const L=BILLLOG.filter(x=>x.act==="Swap");
  log("10 AUTHORIZED: "+JSON.stringify(o.lines)+" | bill "+g0+" -> "+totals(o.lines,o).g+" | log "+L.length+" by "+L[0].by+" user "+L[0].user+" | "+L[0].detail);
  log("11 SLIP: stamp "+q("#rc .sl-stamp").textContent+" | "+q("#rc .sl-ot").textContent+" | auth shown "+q("#rc").textContent.includes("Boss")); log("12 PRINTED: "+jobs.map(j=>j.printer.ip+":"+j.lines[0].t).join()+" | "+q("#rcPrinted").textContent); click("#rcClose"); await wait(10);
  click("#selBtn"); await wait(15); log("13 LIST TAG: "+q("#selList .sr-no small").textContent); click('#mSel [data-close]'); await wait(10);
  jobs.length=0; await add("Tusker","Bar"); click("#exBtn"); await wait(20); log("14 UNSENT BLOCKED: open "+q("#mEx").classList.contains("show")+" | "+(qa("#fsn").pop()||{}).textContent); if(q("#mEx").classList.contains("show")) throw new Error("an unsent order opened in Swap");
  await send("T2"); await wait(350); const o2=orders.at(-1); click("#rcClose"); await wait(10);
  await add("Tusker","Bar"); await snd("T3"); log("17 NEXT ORDER NO STAMP: last has ex "+!!orders.at(-1).ex);

  await add("Fish","Restaurant"); await snd("T4"); const o4=orders.at(-1); jobs.length=0; exOpen(o4); await wait(15); await pickOld("Fish"); log("19 FISH 1000: "+news()); await pickNew("Soup"); pin("0000"); await go(); await wait(250); log("20 SAME STATION ONE TICKET: "+jobs.length+" | slips "+qa("#rc .slip").length); click("#rcClose"); await wait(10);
  ITEMS.push({id:904,n:"Wine",d:"Restaurant",c:"Beer",p:1000,t:"B",r:{}}); jobs.length=0; exOpen(o4); await wait(15); await pickOld("Soup"); await pickNew("Wine"); pin("0000"); await go(); await wait(250); log("21 TWO STATIONS: "+jobs.map(j=>j.printer.ip+":"+j.lines[1].t).join()+" | slips "+qa("#rc .slip").length); click("#rcClose"); await wait(10);
  log("22 PRICE CHANGED BEHIND IT: ");const it=get(904); exOpen(o4); await wait(15); await pickOld("Wine"); await pickNew("Soup"); it.p=999; pin("0000"); await go(); log("22a "+(qa("#fsn").pop()||{}).textContent); it.p=1000; q("#mEx").classList.remove("show");
  for(let i=0;i<3;i++){ exOpen(o4); await wait(10); await pickOld("Wine"); await pickNew("Soup"); pin("9"); await go(); } log("23 THREE WRONG PINS: "+q("#exMsg").textContent); pin("0000"); await go(); log("24 LOCKED OUT: "+q("#exMsg").textContent+" | open "+q("#mEx").classList.contains("show")); exLock=0; q("#mEx").classList.remove("show");
  click("#lock"); await wait(25); await login("0000"); await wait(420); q("#shMgr").classList.remove("show"); log("25 MANAGER: "+user.role); exOpen(o4); await wait(15); log("26 NO PIN BOX: "+!shown("#exAuth")); await pickOld("Wine"); await pickNew("Soup"); await go(); await wait(250); log("27 MANAGER SWAP: by "+BILLLOG.filter(x=>x.act==="Swap").pop().by); click("#rcClose"); await wait(10);
  const n=BILLLOG.filter(x=>x.act==="Swap").length; click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>x.dataset.n==="Reports").click(); await wait(70);
  const pickRep=async()=>{const b=q('[data-r="swp"]'); if(b) b.click(); else {const s=q("[data-rpsel]"); s.value="swp"; s.dispatchEvent(new Event("change",{bubbles:true}));} await wait(50);}; await pickRep(); const T=q("#vSub table.t"), R=[...T.rows]; log("28 REPORT: "+[...R[0].cells].map(c=>c.textContent).join("|")); log("29 ROW: "+[...R[1].cells].map(c=>c.textContent).join("|")); log("30 TOTAL: "+[...R.at(-1).cells].map(c=>c.textContent).filter(Boolean).join("|")+" | rows "+(R.length-2)+" of "+n+" | excel "+!!q('[data-a="rep_xlsx"]')+" print "+!!q('[data-a="rep_print"]'));
  bosave(); log("31 SAVED: "+JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).BL.filter(x=>x.act==="Swap").length);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "sw-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=50000"];
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

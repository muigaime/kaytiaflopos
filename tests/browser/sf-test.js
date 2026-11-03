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
  const J={waiter:"Jane Waiter"}, S2={waiter:"Solo Sam"}, mk=(no,label,dept,waiter,lines)=>({no,ord:no,label,dept,waiter,lines,rounds:1,at:new Date()});
  orders.push(mk("00001","T1","Bar","Jane Waiter",{1:2}),mk("00002","T2","Bar","Solo Sam",{1:1}),mk("00003","T3","Restaurant","Jane Waiter",{2:1}),mk("00004","T4","Restaurant","Solo Sam",{3:2}),mk("00005","T5","Pool","Solo Sam",{5:1}),mk("00006","T6","Bar","Jane Waiter",{1:1,2:1}));
  USERS.find(u=>u.n==="Solo Sam").role="Cashier"; click("#lock"); await wait(25); posKioskOff(); await login("3333"); await wait(300); const sm=q("#shMgr"); if(sm) sm.classList.remove("show");
  const rows=()=>qa('#selList .sr:not(.sh)').map(r=>r.dataset.row).join(","), pills=a=>qa('['+a+']').map(x=>x.textContent.trim()).join(" | "), onP=a=>q('['+a+'].on').textContent.trim(), fd=async v=>{q('[data-fd="'+v+'"]').click(); await wait(15);}, fw=async v=>{if(!q("#selWFind")) click("#selWBtn"); await wait(10); q('[data-fw="'+v+'"]').click(); await wait(15);}, wpills=async()=>{click("#selWBtn"); await wait(10); const r=qa(".sf-opt").map(x=>x.textContent.trim()).join(" | "); click("#selWBtn"); await wait(10); return r;};
  click("#selBtn"); await wait(30); log("1 OPENS ALL: "+rows()+" | "+q("#selT").textContent); log("2 DEPT PILLS: "+pills("data-fd")); log("3 WAITER LIST: "+await wpills()+" | button "+q("#selWBtn").textContent.trim());
  await fd("Bar"); log("4 BAR: "+rows()+" | "+q("#selT").textContent+" | waiters "+await wpills()+" | tot "+q("#selTot").textContent+" | "+q("#selChgAll").textContent);
  await fw("Jane Waiter"); log("5 BAR + JANE: "+rows()+" | "+q("#selT").textContent+" | "+q("#selChgAll").textContent);
  await fd("Restaurant"); log("6 NEW DEPT RESETS WAITER: "+rows()+" | "+q("#selWBtn").textContent.trim());
  await fd(""); await fw("Solo Sam"); log("7 ALL DEPTS + SAM: "+rows()+" | "+q("#selT").textContent); await fw(""); log("8 BACK TO ALL: "+rows());
  await fd("Restaurant"); log("9 BILL IN TWO DEPTS IS IN BOTH: "+rows());
  qa('#selList [data-s]').forEach(x=>{x.checked=true; x.dispatchEvent(new Event("change",{bubbles:true}));}); await wait(15); log("10 TICKED: "+q("#selTot").textContent); await fd("Bar"); log("11 TICKS CLEARED OUTSIDE FILTER: "+[...selSet].join()+" | "+q("#selChg").textContent);
  q('#selList #selAll').checked=true; q('#selList #selAll').dispatchEvent(new Event("change",{bubbles:true})); await wait(15); log("12 TICK ALL = FILTERED: "+[...selSet].join()); click("#selChgAll"); await wait(50); const pa=q('[data-pa="cash"]'); log("13 CHARGE ALL COVERS: "+(typeof payT!=="undefined"&&payT?payT.map(o=>o.no).join():"?")+" | pay open "+q("#mPay").classList.contains("show")); pa.value="99999"; pa.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(300); click("#rcClose"); await wait(20);
  log("14 AFTER CLEARING BAR: left "+orders.map(o=>o.no).join()); click("#selBtn"); await wait(30); log("15 BAR GONE, BACK TO ALL: "+onP("data-fd")+" | "+rows()+" | pills "+pills("data-fd"));
  await fd("Bar"); log("15B EMPTY DEPT STAYS: "+onP("data-fd")+" | waiters "+await wpills()+" | "+q("#selList").textContent.trim()); await fd("Pool"); click('#mSel [data-close]'); await wait(20); click("#selBtn"); await wait(20); log("16 FILTER KEPT WHEN REOPENED: "+onP("data-fd")); click('#mSel [data-close]'); await wait(15);
  for(let i=0;i<50;i++) USERS.push({n:"Waiter "+String(i+1).padStart(2,"0"),pin:"9"+String(i).padStart(3,"0"),d:["Bar"],role:"Waiter"}); click("#selBtn"); await wait(30); await fd(""); click("#selWBtn"); await wait(20); const fi=q("#selWFind"); log("D1 50 WAITERS: options "+qa(".sf-opt").length+" | first three "+qa(".sf-opt").slice(0,3).map(x=>x.textContent.trim()).join(" / ")+" | list scrolls "+(q(".sf-list").scrollHeight>q(".sf-list").clientHeight)+" | focus "+document.activeElement.id);
  const ty=async v=>{fi.value=v; fi.dispatchEvent(new Event("input",{bubbles:true})); await wait(10);}; await ty("waiter 2"); log("D2 SEARCH waiter 2: "+qa(".sf-opt:not([hidden])").map(x=>x.querySelector("span").textContent).slice(0,4).join()+" count "+qa(".sf-opt:not([hidden])").length); await ty("zzz"); log("D3 NONE: "+q(".sf-none").textContent+" shown "+!q(".sf-none").hidden); await ty("waiter 07"); fi.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})); await wait(25); log("D4 ENTER PICKS: "+q("#selWBtn").textContent.trim()+" | closed "+!q(".sf-panel")+" | "+q("#selT").textContent);
  click("#selWBtn"); await wait(15); q('[data-fw=""]').click(); await wait(15); log("D5 BACK TO ALL: "+q("#selWBtn").textContent.trim()); click("#selWBtn"); await wait(15); q("#selT").click(); await wait(15); log("D6 TAP OUTSIDE CLOSES: "+!q(".sf-panel")); click("#selWBtn"); await wait(15); q("#selWFind").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})); await wait(15); log("D7 ESC CLOSES: "+!q(".sf-panel")+" | screen open "+q("#mSel").classList.contains("show")); click('#mSel [data-close]'); await wait(15);
  click("#lock"); await wait(25); posKioskOff(); await login("1111"); await wait(300); const sm2=q("#shMgr"); if(sm2) sm2.classList.remove("show"); click("#selBtn"); await wait(30); log("17 WAITER: filters empty "+(q("#selFilt").innerHTML==="")+" | hidden "+(getComputedStyle(q("#selFilt")).display==="none")+" | department "+!!q("[data-fd]")+" | waiter "+!!q("#selWBtn")+" | "+q("#selT").textContent+" | "+rows()+" | "+q("#selChgAll").textContent);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "sf-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=30000"];
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

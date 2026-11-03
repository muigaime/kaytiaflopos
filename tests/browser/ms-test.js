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
  click('[data-go="pos"]'); await wait(200); posKioskOff(); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  const snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);}, sc=()=>q("#shMgr").classList.contains("show"), head=()=>(q("#shMgr h2")||{}).textContent, B=a=>q('#shMgr [data-sa="'+a+'"]'), sa=async a=>{click('#shMgr [data-sa="'+a+'"]'); await wait(25);}, msgT=()=>(q("#shMgr .status:not(.ok)")||{}).textContent, relog=async p=>{q("#shMgr").classList.remove("show"); q("#mSel").classList.remove("show"); click("#lock"); await wait(25); posKioskOff(); await login(p); await wait(420);}, note=()=>(qa("#fsn").pop()||{}).textContent||"", tick=async no=>{q('[data-s="'+no+'"]').click(); await wait(15);}, sel=async()=>{click("#selBtn"); await wait(20);};
  const J=()=>USERS.find(u=>u.n==="Jane Waiter"), S=()=>USERS.find(u=>u.n==="Solo Sam"); S().role="Cashier";
  shiftEnd(shiftOf(S().n),0,"t");
  await add("Tusker","Bar",2); await snd("T1"); await add("Fish","Restaurant"); await snd("T2"); await add("Tusker","Bar"); await snd("T3");
  click("#shiftBtn"); await wait(20); log("1 MY SHIFT: "+head()+" | send "+!!B("ms_send")+" | print "+!!B("ms_print")+" | cash box "+!!q("#msCash")+" | end "+!!B("ms_end")+" | hint "+q("#shMgr").textContent.includes("push it to a cashier")+" | note btn "+!!B("ms_note")); click('#shMgr [data-sa="exit"]'); await wait(10);
  await sel(); log("2 SELECT, NOTHING TICKED: "+q("#selPushGo").textContent+" disabled "+q("#selPushGo").disabled);
  const [a,b,c]=orders.map(o=>o.no); await tick(a); await tick(b); log("3 TWO TICKED: "+q("#selPushGo").textContent); q("#selPushGo").click(); await wait(15); log("4 NO CASHIER: "+q("#selPush").textContent.includes("No cashier has a shift open")); q("#selPushNo").click(); await wait(15);
  shiftStart(S().n,1000,"t"); q("#selPushGo").click(); await wait(15); log("5 CASHIERS: "+[...q("#selTo").options].map(o=>o.text).join()); q("#selPushNo").click(); await wait(15); log("6 CANCEL KEEPS TICKS: "+q("#selPushGo").textContent);
  orders.find(o=>o.no===b).bd=ymdOf(new Date(Date.now()-3*864e5)); q("#selPushGo").click(); await wait(15); q("#selPushYes").click(); await wait(25);
  log("7 PUSHED: "+note()+" | "+orders.map(o=>o.no+":"+(o.handedTo||"-")).join()+" | waiter kept "+orders.find(o=>o.no===a).waiter+" | log "+BILLLOG.filter(x=>x.act==="Handover").length);
  log("8 SELECT NOW: "+qa("#selList [data-row]").map(r=>r.dataset.row).join()); click('#mSel [data-close]'); await wait(10);
  click("#shiftBtn"); await wait(15); log("9 PENDING TILE: "+qa(".ms-t")[3].textContent); B("ms_end").click(); await wait(20); log("10 BILLS LEFT, ASKS: "+B("ms_end").textContent+" | shift "+!!shiftOf(J().n));
  const pr=window.print; let printed=0; window.print=()=>printed++; orders.filter(o=>!o.handedTo).forEach(o=>o.handedTo=S().n); shDraw(); await wait(15); await sa("ms_end"); await wait(300); log("11 NO BILLS, ONE PRESS ENDS: shift "+!!shiftOf(J().n)+" | "+msgT()+" | printed "+printed+" | shPrint empty "+!q("#shPrint").textContent.includes("SHIFT"));
  const sh=SHIFTS.filter(x=>x.user===J().n).pop(); log("12 RECORD: closed "+!!sh.closedAt+" | variance "+sh.variance);
  await relog("3333"); click('#shMgr [data-sa="exit"]'); await wait(10); await sel(); log("13 CASHIER: "+qa("#selList .sr-no small").map(x=>x.textContent).join(" ; ")+" | push button "+!!q("#selPushGo")); click('#mSel [data-close]'); await wait(10);
  click("#shiftBtn"); await wait(15); log("14 CASHIER KEEPS SHIFT MGMT: "+head()+" | cash box "+!!q("#shAct")); click('#shMgr [data-sa="exit"]'); await wait(10);
  J().perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,k!=="sendPending"])); await relog("1111"); await sa("ms_start"); await add("Tusker","Bar"); await snd("T9"); await sel(); await tick(orders.at(-1).no); log("15 NO RIGHT: button "+!!q("#selPushGo")); click('#mSel [data-close]'); await wait(10); J().perm=undefined;
  bosave(); log("16 SAVED: "+JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).BL.filter(x=>x.act==="Handover").length);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "ms-"));
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

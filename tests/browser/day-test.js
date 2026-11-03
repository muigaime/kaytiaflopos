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
  const nav2=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(60);};
  const snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);}, sh=()=>q("#shMgr").textContent.replace(/\s+/g," "), showing=()=>q("#shMgr").classList.contains("show"), sa=async a=>{click('#shMgr [data-sa="'+a+'"]'); await wait(25);}, relog=async p=>{$("#shMgr").classList.remove("show"); click("#lock"); await wait(25); posKioskOff(); await login(p); await wait(420);}, toBO=async()=>{$("#shMgr").classList.remove("show"); click("#lock"); await wait(25); posKioskOff(); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>x.dataset.n==="Shifts & Day").click(); await wait(60);}, toPOS=async p=>{click("#boMenu"); await wait(30); click('[data-go="pos"]'); await wait(80); posKioskOff(); await login(p); await wait(420);}, tst=()=>q("#toast").textContent, A=async s=>{click('[data-a="'+s+'"]'); await wait(40);};
  USERS.find(u=>u.n==="Jane Waiter").role="Cashier";
  const today=ymdOf(new Date()), tom=ymdOf(new Date(Date.now()+864e5));
  log("1 BIZ DATE = TODAY: "+(bizDate()===today)+" | day date "+curDay().date);
  await add("Tusker","Bar"); await snd("T1"); const bill=orders[0].no; log("2 SENT: "+bill+" by "+orders[0].waiter);
  const js=shiftOf("Jane Waiter"); log("3 JANE'S SHIFT: "+!!js);
  shiftEnd(js,0,"t"); log("4 CLOSED WITH BILL PENDING: "+!shiftOf("Jane Waiter")+" | pending "+pendingOf("Jane Waiter").length);
  await relog("1111"); log("5 LOGIN SCREEN: "+showing()+" | "+sh().slice(0,170));
  log("6 NO START BUTTON: "+!q('#shMgr [data-sa="sstart"]')+" | ask "+!!q('#shMgr [data-sa="sreq"]'));
  click('#shMgr [data-sa="exit"]'); await wait(15); await add("Tusker","Bar"); click("#sendBtn"); await wait(15); if(q("#mSend").classList.contains("show")){q("#lbl").value="T2"; click("#sendGo");} await wait(40); log("7 CAN'T SEND WITHOUT SHIFT: orders "+orders.length+" | screen back "+showing()); cart={}; drawCart();
  await sa("sreq"); log("8 ASKED: "+sh().slice(0,120)+" | status "+shiftAuthOf("Jane Waiter").status);
  await toBO(); const P0=qa("#vSub .pn h4").map(h=>h.textContent)[0]; log("9 BO PANEL: "+P0+" | "+[...q("#vSub table.t").rows][1].textContent.slice(0,90));
  await nav2("Home"); log("10 HOME ALERT: "+q("#ins").textContent.includes("shift authorisation")); await nav2("Shifts & Day");
  await A("sdecl"); log("11 DECLINED: "+tst()+" | panel "+qa("#vSub .pn h4").some(h=>h.textContent.startsWith("Shift auth")));
  await toPOS("1111"); log("12 WAITER SEES: "+sh().slice(0,190)+" | start "+!!q('#shMgr [data-sa="sstart"]'));
  await sa("sreq"); await toBO(); await A("sauth"); log("13 AUTHORISED: "+tst());
  await toPOS("1111"); log("14 CAN START: "+!!q('#shMgr [data-sa="sstart"]')+" | end day hidden "+!q('#shMgr [data-sa="dend"]'));
  q("#shFloat").value="500"; await sa("sstart"); log("15 STARTED: "+!!shiftOf("Jane Waiter")+" | float "+shiftOf("Jane Waiter").float+" | auth "+shiftAuths().at(-1).status+" | bill still open "+orders.some(o=>o.no===bill));
  log("16 NO DAY BUTTON IN SHIFT: "+!q('#shMgr [data-sa="closeday"]')); shiftEnd(shiftOf("Jane Waiter"),500,"t");
  await relog("1111"); log("17 NEXT TIME NEEDS ASKING AGAIN: "+!q('#shMgr [data-sa="sstart"]'));
  $("#shMgr").classList.remove("show"); const J=USERS.find(u=>u.n==="Jane Waiter"); orders.splice(0,orders.length); await relog("1111"); log("18 NO PENDING, STARTS ALONE: "+!!q('#shMgr [data-sa="sstart"]')); await sa("sstart");
  q("#shFloat")&&(q("#shFloat").value="0"); if(!shiftOf(J.n)){q("#shFloat").value="0"; await sa("sstart");} log("19 "+!!shiftOf(J.n)); shiftEnd(shiftOf(J.n),0,"t");
  openShifts().forEach(s=>shiftEnd(s,0,"t"));
  log("20 WAITER ENDING DAY BLOCKED BY CODE: "+(canDay()?"has right":"no right"));
  const e0=dayEnd("t"); log("21 DAY ENDED: ["+e0+"] open "+!!curDay()+" | date stays "+(bizDate()===today));
  await relog("1111"); log("22 WAITER, NO RIGHT: "+sh().slice(0,190)+" | button "+!!q('#shMgr [data-sa="dstart"]'));
  J.perm={...Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,true]))}; await relog("1111"); log("23 WITH RIGHT: "+sh().slice(0,170)+" | button "+!!q('#shMgr [data-sa="dstart"]'));
  await sa("dstart"); log("24 NEW DAY: "+sh().slice(0,120)+" | date tomorrow "+(bizDate()===tom)+" | box "+q("#hDate").textContent);
  if(!shiftOf(J.n)){ q("#shFloat").value="0"; await sa("sstart"); } click('#shMgr [data-sa="exit"]'); await wait(15);
  await add("Tusker","Bar"); await send("T5"); await wait(350); const slip=q("#rc").innerText; log("25 ORDER SLIP DATE: "+(slip.includes(dateGB(tom))?"new":"old")); click("#rcClose"); await wait(10);
  click("#ordBtn"); await wait(10); q('#ordList [data-oa="bill"]').click(); await wait(250); log("26 BILL DATE: "+(q("#rc").innerText.includes(dateGB(tom))?"new":"old")); click("#rcClose"); await wait(10);
  click("#ordBtn"); await wait(10); q('#ordList [data-oa="pay"]').click(); await wait(25); const pa=q('[data-pa="cash"]'); pa.value="5000"; pa.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); const rc=q("#rc").innerText; const s=SALES.at(-1); log("27 RECEIPT/SALE: "+(rc.includes(dateGB(tom))?"new":"old")+" | bd "+(s.bd===tom)+" | clock is today "+(ymdOf(s.at)===today)); click("#rcClose"); await wait(10);
  await toBO(); await nav2("Reports"); q('[data-q="0"]').click(); await wait(50); q('[data-r="bills"]').click(); await wait(50); const R=qa("[data-bill]").filter(r=>!r.hidden); log("28 TODAY = NEW DATE: rows "+R.length+" | dates "+R.map(r=>r.cells[0].textContent).join()+" | sale counted "+R.some(r=>r.dataset.bill===s.no));
  await nav2("Home"); log("29 HEADER DATE: "+q("#dt").textContent.slice(0,40)); await nav2("Shifts & Day"); log("30 BO DAY: "+q("#vSub .pn").textContent.slice(0,80));
  bosave(); const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("31 SAVED: days "+sv.D.map(d=>d.date).length+" | last "+(sv.D.at(-1).date===tom)+" | sale bd "+(sv.S.at(-1).bd===tom)+" | auths "+sv.FS.shiftAuth.length);
  openShifts().forEach(x=>shiftEnd(x,0,"t")); dayEnd("t"); const r0=dayStart("t"); log("32 SECOND ROLL: "+(bizDate()===ymdOf(new Date(Date.now()+2*864e5)))+" | ended and started again");
  DAYS.at(-1).openedAt=new Date(Date.now()-30*36e5).toISOString(); DAYS.at(-1).date=ymdOf(new Date(Date.now()-2*864e5)); await nav2("Sales & Orders"); await nav2("Home"); log("33 LATE NOTE: "+q("#dayBar").textContent.includes("still needs ending"));
  await nav2("Waiter setup"); log("34 RIGHT LISTED: "+!!q('[data-wsp="newDay"]'));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "day-"));
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

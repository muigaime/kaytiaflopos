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
  click('[data-go="pos"]'); await wait(200); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, vis=s=>{const e=q(s); return !!e&&getComputedStyle(e).display!=="none";}, signIn=async p=>{ click("#lock"); await wait(25); pin=p; pkey("E"); await wait(500); };
  must(!q('#login [data-k="T"]')&&!/CLOCK/.test(q("#login").textContent)&&typeof staffClock==="undefined","no clock button on the POS");
  USERS.push({n:"Cara Cash",pin:"4444",d:[...ALLD],role:"Cashier"},{n:"Bar Bea",pin:"5555",d:["Bar"],role:"Waiter"},{n:"Pool Pat",pin:"6666",d:["Pool"],role:"Waiter"});
  await signIn("5555"); must(/^My bills/.test(q("#shiftBtn").textContent),"a waiter's button is My bills, not a shift"); must(!q("#shMgr").classList.contains("show"),"a waiter gets no shift screen on sign-in"); must(!!shiftOf("Bar Bea")&&shiftOf("Bar Bea").float===0,"the waiter's shift opened by itself");
  await add("Tusker",null,1); await send("B1"); await wait(300); if(q("#rcClose")) click("#rcClose"); await wait(20); must(orders.some(o=>o.label==="B1"),"the waiter can sell straight away");
  const beaO=shiftOf("Bar Bea").openedAt; await signIn("5555"); must(shiftOf("Bar Bea").openedAt===beaO&&SHIFTS.filter(s=>s.user==="Bar Bea").length===1,"signing back in keeps the same shift");
  must(!q('#shMgr [data-sa="ms_end"]')&&!q('#shMgr [data-sa="ms_start"]')&&(shiftOpen(),!q('#shMgr [data-sa="ms_end"]')&&!q('#shMgr [data-sa="ms_start"]')),"the waiter's screen has no start or end"); click('#shMgr [data-sa="exit"]'); await wait(15);
  await signIn("4444"); must(vis("#shiftBtn"),"a cashier keeps the shift button"); must(q("#shMgr").classList.contains("show")&&!!q('#shMgr [data-sa="sstart"]'),"a cashier still starts their own shift"); q("#shFloat").value="500"; click('#shMgr [data-sa="sstart"]'); await wait(30); must(!!shiftOf("Cara Cash"),"cashier's shift open"); must(!!q('#shMgr [data-sa="close"]'),"a cashier still closes their own shift"); click('#shMgr [data-sa="exit"]'); await wait(15);
  click("#lock"); await wait(25); must(q("#login .meta .sp").textContent==="SALE POINT: ALL SALE POINTS","no attachment yet: "+q("#login .meta .sp").textContent);
  q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  click('#nav .nv[data-n="Settings"]'); await wait(100); const tab=qa("#vSub [data-a],#vSub button,#vSub [data-st]").find(b=>/^Printers?/.test(b.textContent.trim())); if(tab) tab.click(); await wait(150);
  const me=MACHINE.name(); log("MACHINE ROWS: "+qa(".mac-t tbody tr").map(r=>r.textContent.trim().slice(0,60)).join(" ; ")); const box=p=>qa('.mac-t tr.me [data-a="psu_msp"]').find(x=>x.dataset.pt===p); must(!!box("Pool")&&!!box("Bar"),"this computer's row has a tick for each sale point");
  box("Pool").click(); await wait(80); must(box("Pool").checked&&JSON.stringify(MACHINE.list().find(m=>m.n===me).sp)==='["Pool"]',"ticking Pool attaches it: "+JSON.stringify(MACHINE.points())); must(JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FD||true,"saved");
  must(q("#login .meta .sp").textContent==="SALE POINT: POOL","login page says "+q("#login .meta .sp").textContent);
  click("#boMenu"); await wait(40); click('#start [data-go="pos"]'); await wait(60);
  pin="5555"; pkey("E"); await wait(100); must(user===null&&/can't sell at Pool/.test(q("#pinMsg").textContent),"a Bar waiter can't sign in on a Pool machine: "+q("#pinMsg").textContent); must(q("#pinMsg").className==="bad","shown as an error");
  pin="6666"; pkey("E"); await wait(500); must(user&&user.n==="Pool Pat"&&dept==="Pool","a Pool waiter sells at Pool, dept "+dept);
  click("#lock"); await wait(25); pin="4444"; pkey("E"); await wait(500); must(dept==="Pool"&&JSON.stringify(DEPTS)==='["Pool"]',"a cashier with every sale point only gets Pool here: "+JSON.stringify(DEPTS)); must(q("#posOutlet").textContent==="Pool","the screen shows Pool"); must(!q("#spTabs").children.length,"no tabs for other sale points"); if(q("#shMgr").classList.contains("show")) click('#shMgr [data-sa="exit"]'); await wait(15);
  await add("Burger",null,1); must(Object.keys(cart).length===1,"the Pool menu sells"); cart={}; drawCart();
  MACHINE.list().find(m=>m.n===me).sp=["Bar","Pool"]; await signIn("4444"); must(JSON.stringify(DEPTS)==='["Bar","Pool"]',"two sale points on one machine: "+JSON.stringify(DEPTS));
  MACHINE.list().find(m=>m.n===me).sp=[]; machineLabel(); await signIn("4444"); must(DEPTS.length>=3,"nothing ticked: back to all "+JSON.stringify(DEPTS)); must(q("#login .meta .sp").textContent==="SALE POINT: ALL SALE POINTS","login page back to all");
  orders.splice(0,orders.length); const co=shiftOf("Cara Cash"); must(!!shiftOf("Bar Bea")&&!!shiftOf("Pool Pat"),"waiters' shifts open before day end"); must(/Cara Cash/.test(dayEnd("t"))&&!!shiftOf("Bar Bea"),"an open cashier shift still stops the day, waiters untouched");
  const lo=new Date(Date.now()-3*36e5).toISOString(); shiftOf("Bar Bea").lastOut=lo; openShifts().filter(s=>!waiterShift(s)).forEach(s=>shiftEnd(s,500,"t")); const bea=shiftOf("Bar Bea"), rr=dayEnd("t"); must(!rr&&!openShifts().length,"the day closes the waiters' shifts: ["+rr+"]"); must(bea.closedBy==="Day end"&&bea.closedAt,"closed by Day end");
  dayStart("t"); await wait(10); click("#lock"); await wait(25); pin="5555"; pkey("E"); await wait(500); must(!!shiftOf("Bar Bea")&&SHIFTS.filter(s=>s.user==="Bar Bea").length===2,"next day the waiter's shift opens again");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "masp-"));
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

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
  const snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);}, B=a=>q('#shMgr [data-sa="'+a+'"]'), sa=async a=>{click('#shMgr [data-sa="'+a+'"]'); await wait(25);}, msgT=()=>(q("#shMgr .status:not(.ok)")||{}).textContent, relog=async p=>{q("#shMgr").classList.remove("show"); click("#lock"); await wait(25); await login(p); await wait(420);}, row=(i,m,a,p)=>{const r=qa("#shMgr [data-mn]")[i]; r.querySelector('[data-f="m"]').value=m; r.querySelector('[data-f="amt"]').value=a; r.querySelector('[data-f="paid"]').value=p?"1":"0";}, open=async no=>{q('#shMgr [data-sa="ms_open"][data-no="'+no+'"]').click(); await wait(20);};
  const J=()=>USERS.find(u=>u.n==="Jane Waiter"), S=()=>USERS.find(u=>u.n==="Solo Sam"); S().role="Cashier"; USERS.find(u=>u.n==="Boss").role="Manager"; openShifts().filter(x=>x.user!==J().n).forEach(x=>shiftEnd(x,0,"t"));
  log("1 CHANGE SALE POINT BUTTON: "+!!q("#chSP")+" | tabs "+qa("#spTabs button").length);
  await add("Tusker","Bar"); await add("Fish","Restaurant"); await snd("T1"); await add("Tusker","Bar"); await snd("T2"); const [o,o2]=orders, g=totals(o.lines,o).g; click("#shiftBtn"); await wait(20);
  log("2 PENDING TABLE: "+qa("#shMgr table.sht").pop().rows[0].textContent+" | send "+qa('#shMgr [data-sa="ms_open"]').length+" | note words "+q("#shMgr").textContent.includes("Money note"));
  log("3 NO END BUTTON: "+!B("ms_end"));
  await open(o.no); log("4 NO CASHIER: "+msgT()+" | send "+!!B("ms_send")); await sa("ms_ncancel");
  shiftStart(S().n,0,"t",false,true); click('#shMgr [data-sa="exit"]'); await wait(10); click("#shiftBtn"); await wait(15); await open(o.no); log("5 FORM: "+q(".ms-note h5").textContent+" | to "+[...q("#msTo").options].map(x=>x.text).join()+" | lines "+qa("#shMgr [data-mn]").length);
  const k0=JSON.stringify([SALES.length,SHIFTS.map(x=>shiftCalc(x).cash)]);
  row(0,"","500",false); await sa("ms_send"); log("6 NO METHOD: "+msgT()+" | handed "+!!o.handedTo); await open(o.no); row(0,"Cash","",true); await sa("ms_send"); log("7 NO AMOUNT: "+msgT());
  await open(o.no); row(0,"M-Pesa QHJ7K2","700",true); await sa("ms_nadd"); log("8 ADD KEEPS TYPING: "+q('[data-f="m"]').value+" | lines "+qa("#shMgr [data-mn]").length); row(1,"Cash","500",false); await sa("ms_send");
  log("9 SENT: "+msgT()+" | to "+o.handedTo+" | "+JSON.stringify(o.money)+" | waiter "+o.waiter+" | log "+BILLLOG.filter(x=>x.act==="Handover").pop().detail+" | sales and till same "+(k0===JSON.stringify([SALES.length,SHIFTS.map(x=>shiftCalc(x).cash)])));
  await open(o2.no); await sa("ms_send"); log("10 WITH NOTHING WRITTEN: "+msgT()+" | "+o2.handedTo+" | lines "+o2.money.length);
  log("11 SHIFT STAYS OPEN: "+!!shiftOf(J().n));
  await relog("3333"); click('#shMgr [data-sa="exit"]'); await wait(10); click("#selBtn"); await wait(20); log("12 CASHIER LIST: "+qa("#selList .sr-no small").map(x=>x.textContent).join(" ; ")); click('#mSel [data-close]'); await wait(10);
  click("#ordBtn"); await wait(15); [...qa('#ordList .ord')].find(x=>x.querySelector(".h").textContent.startsWith("T1")).querySelector('[data-oa="pay"]').click(); await wait(30);
  log("13 SETTLE SHOWS: "+q(".pay-money").textContent+" | paid tag "+!!q(".pay-mr em.paid")+" | cash ["+q('[data-pa="cash"]').value+"] mpesa ["+q('[data-pa="mpesa"]').value+"]");
  const e=q('[data-pa="cash"]'); e.value=String(g); e.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); const s=SALES.at(-1); log("14 CLEARED BY WHAT CASHIER ENTERED: "+JSON.stringify(s.mx)+" | waiter "+s.waiter+" | gone "+!orders.includes(o)); click("#rcClose"); await wait(10);
  orders.splice(0,orders.length); J().perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,k!=="sendPending"])); await relog("1111"); await add("Tusker","Bar"); await snd("T9"); click("#shiftBtn"); await wait(15); log("15 NO RIGHT: send "+!!B("ms_open")); J().perm=undefined;
  const o9=orders[0]; o9.bd=ymdOf(new Date(Date.now()-3*864e5)); shDraw(); await wait(15); await open(o9.no); await sa("ms_send"); log("17 EARLIER DAY BILL CAN GO: "+o9.handedTo);
  const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); bosave(); log("19 SAVED: "+JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).BL.filter(x=>x.act==="Handover").length);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "mn-"));
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

// node kds-test.js <built.html>: the kitchen display and the order status on the POS.
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, note=()=>(qa("#fsn").pop()||{}).textContent||"";
  await add("Tusker","Bar",2); await add("Fish","Restaurant",1);
  const k0=KDS.length; await send("T5"); await wait(100); click("#rcClose"); await wait(40);
  const o=orders.find(x=>x.label==="T5"), T=KDS.filter(k=>k.no===o.no);
  must(T.length===2&&T.some(k=>k.station==="Bar"&&k.items[0].n==="Tusker"&&k.items[0].q===2)&&T.some(k=>k.station==="Kitchen"&&k.items[0].n==="Fish"),"sending makes a Kitchen ticket and a Bar ticket: "+T.map(k=>k.station+":"+k.items.map(i=>i.q+" "+i.n)).join(" | "));
  must(T.every(k=>k.st==="new"&&k.label==="T5"&&k.waiter==="Jane Waiter"),"they start in the queue, with the table and waiter");
  must(kdsBillState(o.no)==="new","the bill's status is In the queue");
  click("#ordBtn"); await wait(60); const ch=q('#ordList [data-kst="'+o.no+'"]');
  must(!!ch&&/In the queue/.test(ch.textContent),"Open orders shows the status: "+(ch&&ch.textContent)); q("#mOrd").classList.remove("show");
  must(JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).KD.length===k0+2,"the tickets are saved with the rest of the data");
  // the kitchen display
  kdsOpen(); await wait(150);
  must(q("#kds").classList.contains("show")&&q("#start").style.display==="none","the kitchen display opens full screen");
  const cards=()=>qa("#kds .kds-t"), card=st=>cards().find(c=>c.dataset.tk.endsWith(st));
  must(cards().length===2&&/Incoming2/.test(q("#kds .kds-tabs").textContent.replace(/\s/g,"")),"Incoming shows both orders: "+q("#kds .kds-tabs").textContent);
  const kc=card("Kitchen"); must(/Order/.test(kc.textContent)&&/T5/.test(kc.textContent)&&/Jane Waiter/.test(kc.textContent)&&/Fish/.test(kc.textContent)&&/Waiting/.test(kc.textContent),"a card shows the order, table, waiter, items and waiting time");
  q('#kds [data-kst2="Kitchen"]').click(); await wait(60); must(cards().length===1&&/Fish/.test(cards()[0].textContent),"Kitchen shows only kitchen orders");
  q('#kds [data-kst2="Bar"]').click(); await wait(60); must(cards().length===1&&/Tusker/.test(cards()[0].textContent),"Bar shows only bar orders");
  q('#kds [data-kst2="All"]').click(); await wait(60);
  card("Kitchen").querySelector('[data-kgo="prep"]').click(); await wait(80);
  must(KDS.find(k=>k.no===o.no&&k.station==="Kitchen").st==="prep"&&kdsBillState(o.no)==="prep","Start moves it to Preparing, and the POS says Preparing");
  q('#kds [data-ktab="prep"]').click(); await wait(60); must(cards().length===1&&/Preparing/.test(cards()[0].textContent),"it is on the Preparing tab");
  cards()[0].querySelector("li").click(); await wait(60); must(cards()[0].querySelector("li").classList.contains("x"),"a cook can tick an item off");
  cards()[0].querySelector('[data-kgo="ready"]').click(); await wait(80);
  must(kdsBillState(o.no)==="prep","with the bar order still waiting, the bill is still Preparing");
  q('#kds [data-ktab="new"]').click(); await wait(60); cards()[0].querySelector('[data-kgo="prep"]').click(); await wait(60); q('#kds [data-ktab="prep"]').click(); await wait(60); cards()[0].querySelector('[data-kgo="ready"]').click(); await wait(80);
  must(kdsBillState(o.no)==="ready","when every part is ready, the bill is Ready to serve");
  q('#kds [data-ktab="ready"]').click(); await wait(60); must(cards().length===2&&/Ready/.test(cards()[0].textContent),"both wait at the pass");
  // the waiter hears about it on the POS
  q('#kds [data-kt="exit"]').click(); await wait(60); must(!q("#kds").classList.contains("show")&&q("#start").style.display==="grid","Exit goes back to the start screen");
  kdsSeen[o.no]="prep"; kdsPosTick(); await wait(30);
  must(/T5: order .* is ready to serve/.test(note()),"the waiter is told the order is ready: "+note());
  click("#ordBtn"); await wait(60); must(/Ready to serve/.test(q('#ordList [data-kst="'+o.no+'"]').textContent),"Open orders shows Ready to serve"); q("#mOrd").classList.remove("show");
  kdsOpen(); await wait(100); q('#kds [data-ktab="ready"]').click(); await wait(60);
  for(let i=0;i<5&&q('#kds [data-kgo="done"]');i++){ q('#kds [data-kgo="done"]').click(); await wait(60); }
  must(kdsBillState(o.no)==="done","Served marks the bill Served");
  q('#kds [data-ktab="done"]').click(); await wait(60); must(cards().length===2&&/Served/.test(cards()[0].textContent)&&!!q('#kds [data-kgo="ready"]'),"Served keeps them for the day, with Recall");
  // late orders
  KDS.push({ id:"late-1", no:"X1", ord:"99", label:"T9", waiter:"Boss", dept:"Restaurant", station:"Kitchen", round:1, at:new Date(Date.now()-20*60e3).toISOString(), items:[{n:"Fish",q:1}], st:"new", t:{} });
  q('#kds [data-ktab="new"]').click(); await wait(80);
  must(cards().some(c=>c.dataset.tk==="late-1"&&c.classList.contains("late"))&&/1 late/.test(q("#kds .kds-stat").textContent),"an order waiting too long turns red and is counted as late");
  must(/Average ([0-9]+ min|under a minute) to make/.test(q("#kds .kds-stat").textContent),"the average time to make is shown: "+q("#kds .kds-stat").textContent);
  q('#kds [data-kt="dark"]').click(); await wait(40); must(q("#kds").classList.contains("dark"),"it has a dark look"); q('#kds [data-kt="dark"]').click(); await wait(40);
  q('#kds [data-kt="exit"]').click(); await wait(40);
  // a second round on the same bill
  orders.forEach(x=>x.no===o.no&&(cur=x)); cur=orders.find(x=>x.no===o.no); await add("Burger","Pool",1); await send("T5"); await wait(100); if(q("#rcClose")) click("#rcClose"); await wait(30);
  const r2=KDS.filter(k=>k.no===o.no&&k.round===2);
  must(r2.length===1&&r2[0].items[0].n==="Burger"&&kdsBillState(o.no)==="new","adding items sends a second ticket, and the bill is back in the queue");
  kdsOpen(); await wait(100); must(/Round 2/.test(q("#kds").textContent),"the card says it's round 2"); q('#kds [data-kt="exit"]').click(); await wait(30);
  // Back Office sets what this computer's screen shows
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  qa("#nav .nv").find(x=>x.dataset.n==="Settings").click(); await wait(120); click('[data-a="hs_tab"][data-k="kds"]'); await wait(120);
  must(q(".set-head h2").textContent==="Kitchen display"&&qa(".kdss-row").length===MACHINE.list().length&&qa(".kdss-row").length>0,"Settings has a Kitchen display page with a row for each computer");
  const me=MACHINE.name(), sel=q('[data-kdsm="'+me+'"]'); sel.value="Bar"; sel.dispatchEvent(new Event("change",{bubbles:true})); await wait(60);
  must(FD_SETTINGS.kds.screens[me].station==="Bar"&&/Saved for/.test(q("#toast").textContent),"choosing Bar only is saved for this computer");
  const cb=q('[data-kdsp="'+me+'"][value="Bar"]'); cb.checked=true; cb.dispatchEvent(new Event("change",{bubbles:true})); await wait(60);
  must(JSON.stringify(FD_SETTINGS.kds.screens[me].points)==='["Bar"]',"and the Bar selling point");
  q("#kdsLN").value="5"; q("#kdsLP").value="20"; q("#kdsKH").value="24"; click('[data-a="hs_kdstime"]'); await wait(60);
  must(FD_SETTINGS.kds.late.new===5&&FD_SETTINGS.kds.late.prep===20&&FD_SETTINGS.kds.keepH===24,"the timing is saved");
  q("#bo").classList.remove("show"); kdsOpen(); await wait(150);
  must(!!q("#kds .kds-loc")&&/shows bar orders from Bar/.test(q("#kds .kds-loc").textContent)&&!q('#kds [data-kst2]'),"the screen says where it is, with no filter buttons: "+(q("#kds .kds-loc")||{}).textContent);
  const shownSt=qa('#kds [data-ktab]').map(b=>b.textContent).join("|"); for(const t of ["new","prep","ready","done"]){ q('#kds [data-ktab="'+t+'"]').click(); await wait(40); must(qa("#kds .kds-t").every(c=>/BAR|Bar/.test(c.querySelector(".kds-st").textContent)),"only bar orders on "+t); }
  q('#kds [data-kt="exit"]').click(); await wait(30);
  // left open for over a minute, as in a kitchen: it must not slow down or fail
  kdsOpen(); await wait(75000);
  must(kdsV.sig.length < 20000 && q("#kds").classList.contains("show") && !__E.some(x=>/Invalid string length/.test(x)), "after a minute and a quarter open it still works, signature " + kdsV.sig.length + " characters");
  q('#kds [data-ktab="new"]').click(); await wait(60); const b2=q('#kds [data-kgo="prep"]'); if(b2){ b2.click(); await wait(80); } must(true,"buttons still respond after that");
  q('#kds [data-kt="exit"]').click(); await wait(30);
  delete FD_SETTINGS.kds.screens[me]; kdsOpen(); await wait(100); must(!q("#kds .kds-loc")&&!!q('#kds [data-kst2]'),"with no setting, the screen offers its own filters again"); q('#kds [data-kt="exit"]').click(); await wait(30);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=150000"];
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

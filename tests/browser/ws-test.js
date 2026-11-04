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
  const relog=async p=>{click("#lock"); await wait(25); await login(p);}, note=()=>(qa("#fsn").pop()||{}).textContent||"", snd=async l=>{await send(l); await wait(400); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(10);}, vis=s=>{const e=q(s); return !!e&&getComputedStyle(e).display!=="none";}, btns=()=>["sendBtn","printBtn","settleBtn","ordBtn","selBtn","billBtn","chSP"].filter(x=>vis("#"+x)).join(",");
  click("#lock"); await wait(25);   q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const goP=async()=>{qa("#nav .nv").find(x=>x.dataset.n==="Waiter setup").click(); await wait(30);}; await goP();
  log("1 PAGE: "+q("#vSub h1").textContent+" | waiters "+qa(".ws-w").map(x=>x.innerText.replace(/\\s+/g," ")).join(" ; ")+" | rights "+qa("[data-wsp]").length+" | later "+qa(".ws-p.later").length);
  const inp=(k,v)=>{const e=q('[data-ws="'+k+'"]'); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true}));}, tick=async(k,on)=>{const e=q('[data-wsp="'+k+'"]'); if(e.checked!==on){e.click(); e.dispatchEvent(new Event("change",{bubbles:true}));} await wait(5);}, sv=async()=>{click('[data-a="ws_save"]'); await wait(25); return q("#toast").textContent;};
  log("2 EMPTY: "+await sv()); inp("n","Rose Kim"); inp("pin","12"); log("3 BAD PIN: "+await sv()); inp("pin","1111"); log("4 TAKEN PIN: "+await sv()); inp("pin","5555"); inp("copies","9"); log("5 COPIES: "+await sv()); inp("copies","2");
  ${outPng ? 'await tick("disc",true); const c0=q(\'[data-wsc="restrict"]\'); c0.click(); c0.dispatchEvent(new Event("change",{bubbles:true})); await wait(25); inp("footer","Thank you. Ask for Rose.");' : `
  inp("maxPend","2"); inp("maxDisc","10"); inp("comm","5"); inp("footer","Ask for Rose"); await tick("disc",true); await tick("void",false); await tick("merge",true); await tick("postAccount",false); await tick("stock",false); await tick("addPrinted",false);
  const r0=q('[data-wsc="restrict"]'); r0.click(); r0.dispatchEvent(new Event("change",{bubbles:true})); await wait(25); log("6 NO POINT: "+await sv()); const d0=q('[data-wsd="Bar"]'); d0.click(); d0.dispatchEvent(new Event("change",{bubbles:true})); await wait(25); const d1=q('[data-wsd="Restaurant"]'); d1.click(); d1.dispatchEvent(new Event("change",{bubbles:true})); await wait(25);
  log("7 TYPING KEPT: "+q('[data-ws="n"]').value+" | "+q('[data-ws="footer"]').value); log("8 CREATE: "+await sv()); const R=USERS.find(u=>u.n==="Rose Kim"); log("9 SAVED: "+JSON.stringify({wid:R.wid,role:R.role,d:R.d,copies:R.copies,maxPend:R.maxPend,maxDisc:R.maxDisc,comm:R.comm,card:R.card,footer:R.footer})+" | on list "+qa(".ws-w").length+" | form blank "+(q('[data-ws="n"]').value===""));
  bosave(); log("10 PERSISTED: "+!!JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).U.find(u=>u.n==="Rose Kim"&&u.perm&&u.wid));
  q('.ws-w[data-i="'+USERS.indexOf(R)+'"]').click(); await wait(25); log("11 EDIT: "+q(".ws-form h4").textContent+" | id "+q(".ws-id").textContent+" | disc "+q('[data-wsp="disc"]').checked+" void "+q('[data-wsp="void"]').checked+" | points "+qa("[data-wsd]:checked").length);
  click('[data-a="ws_new"]'); await wait(15);
  shiftStart("Rose Kim",0,"t"); q("#bo").classList.remove("show"); click('[data-go="pos"]'); await wait(50);
  await login("5555");
  log("12 ROSE TILES tabs "+qa("#spTabs button").map(b=>b.textContent).join("/")+" | buttons "+btns()+" | credit "+vis('#pAcct'));
  await add("Tusker","Bar"); log("13 NO STOCK COUNT: tile "+q("#grid .it").innerText.replace(/\\s+/g," ")); await snd("R1"); await add("Fish","Restaurant"); await snd("R2"); await add("Fish","Restaurant"); await send("R3"); await wait(30); log("14 PENDING LIMIT: "+note()+" | bills "+orders.length); cart={}; drawCart();
  click("#billBtn"); await wait(10); click('[data-bo="disc"]'); await wait(15); log("15 DISCOUNT NO PIN: "+!q("#bopPin")); qa("#bopBody .bop-b").find(b=>b.textContent.includes("R1")).click(); await wait(15); q("#bopVal").value="20"; q("#bopWhy").value="x"; click('[data-bg="save"]'); await wait(15); log("16 OVER LIMIT: "+q("#bopMsg").textContent); q("#bopVal").value="10"; click('[data-bg="save"]'); await wait(20); log("17 WITHIN: "+note()+" | "+BILLLOG.at(-1).by);
  click("#billBtn"); await wait(10); click('[data-bo="void"]'); await wait(15); log("18 VOID ASKS PIN: "+!!q("#bopPin")); q("#mBopt").classList.remove("show");
  click("#billBtn"); await wait(10); click('[data-bo="merge"]'); await wait(15); log("19 MERGE ALONE no PIN: "+!q("#bopPin")+" | "+qa("[data-bm]").length); q("#mBopt").classList.remove("show");
  click("#ordBtn"); await wait(10); click('#ordList [data-oa="bill"]'); await wait(20); log("20 TWO COPIES: "+qa("#rc .slip").length+" | footer "+q("#rc .sl-note").textContent+" | printed "+orders[0].printed); click("#rcClose"); await wait(10);
  click("#ordBtn"); await wait(10); click('#ordList [data-oa="add"]'); await wait(20); log("21 ADD TO PRINTED: "+note()); q("#mOrd").classList.remove("show");
  await relog("1111"); log("22 OLD WAITER UNCHANGED: "+btns()+" | sees "+q("#ordBtn").textContent); await add("Tusker","Bar"); await send("R1"); await wait(30); log("23 OTHER'S TABLE: "+note()); cart={}; drawCart();
  await relog("3333"); log("24 OLD SOLO: "+btns());
  R.perm={send:true}; await relog("5555"); log("25 ONLY SEND: "+btns()+" | sp tabs "+qa("#spTabs button").length+" | dept "+dept); await add("Tusker"); await send("R9"); await wait(30); log("26 NO CREATE: "+note()); cart={}; drawCart(); openPay(null); await wait(10); log("27 NO CLEAR: "+note());
  R.perm={send:true,create:true,clear:true,allBills:true}; R.allSP=true; await relog("5555"); log("28 ALL BILLS: "+q("#ordBtn").textContent);
  q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); await goP(); q('.ws-w[data-i="'+USERS.indexOf(R)+'"]').click(); await wait(25); inp("n","Rose Anne"); log("29 RENAME: "+await sv()+" | bills "+orders.filter(o=>o.waiter==="Rose Anne").length); q('.ws-w[data-i="'+USERS.indexOf(R)+'"]').click(); await wait(25); click('[data-a="ws_del"]'); await wait(15); log("30 DELETE BLOCKED: "+q("#toast").textContent);`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "ws-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,1400", "--virtual-time-budget=16000"];
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

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
  const note=()=>(qa("#fsn").pop()||{}).textContent||"", opn=()=>orders.map(o=>o.label+"["+o.waiter+"] "+JSON.stringify(o.lines)).join(" ; "), relog=async p=>{click("#lock"); await wait(25); await login(p);}, pin=async()=>{q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(20);}, opt=async a=>{click("#billBtn"); await wait(10); click('[data-bo="'+a+'"]'); await wait(15);}, sels=()=>qa("#selList [data-row]").map(r=>r.innerText.replace(/\\s+/g," ").trim()).join(" ; "), bills=()=>qa("#bopBody .bop-b").map(r=>r.innerText.replace(/\\s+/g," ").trim()).join(" ; "), pane=i=>qa(".bs-p")[i].innerText.replace(/\\s+/g," ").trim();
  await add("Tusker","Bar"); await send("T1"); click("#rcClose"); await wait(10); await add("Tusker","Bar",3); await add("Fish","Restaurant"); await send("T2"); click("#rcClose"); await wait(10);
  await relog("3333"); await add("Tusker"); await send("S1"); click("#rcClose"); await wait(10);
  log("1 SAM SEES: open btn "+q("#ordBtn").textContent); click("#selBtn"); await wait(15); log("2 SELECT: "+q("#selT").textContent+" | "+sels()); click('#mSel [data-close]'); await wait(10);
  click("#ordBtn"); await wait(10); log("3 OPEN ORDERS: "+qa("#ordList .ord .h").map(x=>x.textContent).join(";")); q("#mOrd").classList.remove("show");
  await add("Tusker"); await send("T1"); log("4 TAKEN NAME: "+note()+" | bills "+orders.length+" | cart "+JSON.stringify(cart)); cart={}; drawCart(); await wait(10);
  click("#newSale"); await wait(15); q("#fTable").value="S2"; click("#sendBtn"); await wait(25); await opt("split"); await pin(); log("5 ALL BILLS WITH MANAGER PIN: "+qa("#trL .tr-b").map(b=>b.querySelector("b").textContent).join(","));
  q('[data-trs="'+orders.find(o=>o.label==="S1").no+'"]').click(); await wait(10); q('[data-trt="'+orders.find(o=>o.label==="S2").no+'"]').click(); await wait(10); click('[data-bg="save"]'); await wait(10); log("6 NOTHING: "+q("#bopMsg").textContent); click('[data-trm="1"]'); await wait(10); click('[data-bg="save"]'); await wait(15); log("8 DONE: "+note()+" | "+opn());
  await relog("1111"); click("#newSale"); await wait(15); q("#fTable").value="T2B"; click("#sendBtn"); await wait(25); await opt("split"); await pin(); q('[data-trs="'+orders.find(o=>o.label==="T2").no+'"]').click(); await wait(10); q('[data-trt="'+orders.find(o=>o.label==="T2B").no+'"]').click(); await wait(10); click('[data-trm="1"]'); await wait(10); click('[data-trm="2"]'); await wait(10); click('[data-bg="save"]'); await wait(15); log("14 SPLIT: "+note()+" | "+opn()+" | stock Bar a "+STK.Bar.a);
  await opt("disc"); await pin(); log("15 OTHER OPTIONS OWN ONLY: "+bills()); q("#mBopt").classList.remove("show");
  await opt("merge"); log("16 MERGE ASKS PIN: "+!!q("#bopPin")); await pin(); q('[data-trs="'+orders.find(o=>o.label==="S2").no+'"]').click(); await wait(10); q('[data-trt="'+orders.find(o=>o.label==="T1").no+'"]').click(); await wait(10); click("[data-trw]"); await wait(10); click('[data-bg="save"]'); await wait(15); log("18 MERGED ACROSS WAITERS: "+note()+" | "+opn()); log("19 LOG: "+BILLLOG.at(-1).detail+" | by "+BILLLOG.at(-1).by);
  await relog("3333"); log("20 SAM AFTER: "+q("#ordBtn").textContent); await relog("0000"); click("#selBtn"); await wait(15); log("21 MANAGER SELECT: "+q("#selT").textContent+" | "+sels()); click('#mSel [data-close]'); await wait(10); click("#ordBtn"); await wait(10); log("22 MANAGER OPEN ORDERS: "+qa("#ordList .ord .m").map(x=>x.textContent.split("·")[1]).join(";")); q("#mOrd").classList.remove("show");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "sp-"));
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

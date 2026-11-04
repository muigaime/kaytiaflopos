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
  const note=()=>(qa("#fsn").pop()||{}).textContent||"", msg=()=>q("#bopMsg").textContent, snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, relog=async p=>{click("#lock"); await wait(25); await login(p);}, opt=async a=>{click("#billBtn"); await wait(10); click('[data-bo="'+a+'"]'); await wait(20);}, pin=async()=>{if(q("#bopPin")){q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(25);}}, no=l=>orders.find(o=>o.label===l).no, src=async l=>{q('[data-trs="'+no(l)+'"]').click(); await wait(10);}, tgt=async l=>{q('[data-trt="'+no(l)+'"]').click(); await wait(10);}, save=async()=>{click('[data-bg="save"]'); await wait(25);}, ol=()=>orders.map(o=>o.label+"["+o.no+"/"+o.waiter+"] "+JSON.stringify(o.lines)).join(" ; "), left=()=>qa("#trL .tr-b").map(b=>b.querySelector("b").textContent).join(","), newB=async l=>{click("#newSale"); await wait(15); q("#fTable").value=l; click("#sendBtn"); await wait(25);};
  CU.length=0; shiftStart("Boss",0,"t");
  await add("Tusker","Bar",3); await add("Fish","Restaurant"); await snd("T1");
  await relog("3333"); await add("Tusker"); await snd("S1");
  await relog("1111");
  log("1 SEND OFF WITH NOTHING: "+q("#sendBtn").disabled); click("#newSale"); await wait(15); log("2 NEW SALE: bill "+q("#fBill").value+" send off "+q("#sendBtn").disabled); q("#lbl").value=""; click("#sendBtn"); await wait(20); log("3 ASKS TABLE: "+q("#mSend").classList.contains("show")); q("#lbl").value="NEW1"; click("#sendGo"); await wait(25); log("4 EMPTY BILL: "+note()+" | receipt "+q("#mRc").classList.contains("show")+" | "+ol()+" | box ["+q("#fBill").value+"]");
  click("#selBtn"); await wait(15); log("5 IN SELECT: "+qa("#selList [data-row]").map(r=>r.innerText.replace(/\\s+/g," ").trim()).join(" ; ")); click('#mSel [data-close]'); await wait(10);
  openPay([orders.find(o=>o.label==="NEW1")]); await wait(10); log("6 CAN'T SETTLE EMPTY: "+note()+" | pay open "+q("#mPay").classList.contains("show"));
  click("#newSale"); await wait(15); q("#fTable").value="T1"; click("#sendBtn"); await wait(25); log("7 NAME TAKEN: "+note()+" | bills "+orders.length+" | number kept "+q("#fBill").value); click("#newSale"); await wait(10);
  await relog("0000"); await opt("merge"); log("8 MANAGER NO PIN: "+!q("#bopPin")+" | title "+q("#bopBody h3").textContent+" | left "+left()+" | right list "+qa("#trTL .tr-b").map(b=>b.querySelector("b").textContent+(b.textContent.includes("Empty")?"(empty)":"")).join(","));
  ${outPng ? 'await src("T1"); await tgt("NEW1"); click(\'[data-trm="1"]\'); await wait(10); click(\'[data-trm="2"]\'); await wait(10);' : `
  await save(); log("9 NOTHING CHOSEN: "+msg()); await src("T1"); log("10 ITEMS SHOW: "+qa("#trL .tr-m").map(x=>x.innerText.replace(/\\s+/g," ").trim()).join(" ; ")); click('[data-trm="1"]'); await wait(10); log("11 NO TARGET: "+msg());
  await tgt("NEW1"); log("12 TARGET: "+q("#trR .tr-h").innerText.replace(/\\s+/g," ")+" | "+q("#trR .tr-e").textContent+" | total "+q(".tr-t b").textContent+" | left without target "+!qa("#trL .tr-b").some(b=>b.dataset.trs===no("NEW1")));
  click('[data-trm="1"]'); await wait(10); click('[data-trm="1"]'); await wait(10); log("13 TWO MOVED: left "+qa("#trL .tr-m").map(x=>x.innerText.replace(/\\s+/g," ").trim()).join(" ; ")+" | right "+qa("#trR .tr-m").map(x=>x.innerText.replace(/\\s+/g," ").trim()).join(" ; ")+" | total "+q(".tr-t b").textContent+" | "+q("#trSum").textContent); log("14 NOT APPLIED YET: "+ol());
  q("[data-trb]").click(); await wait(10); log("15 ONE BACK: "+q("#trR .tr-m").innerText.replace(/\\s+/g," ")); await save(); log("16 APPLIED: "+note()+" | "+ol()+" | log "+BILLLOG.at(-1).act+": "+BILLLOG.at(-1).detail);
  await opt("merge"); await src("S1"); await tgt("NEW1"); click("[data-trw]"); await wait(10); log("17 WHOLE: "+q("#trSum").textContent+" | "+qa("#trL .tr-b.on i").map(i=>i.textContent)); await save(); log("18 MERGED: "+note()+" | "+ol()+" | "+BILLLOG.at(-1).act+": "+BILLLOG.at(-1).detail);
  await add("Tusker","Bar"); await snd("D1"); orders.find(o=>o.label==="D1").disc={type:"pct",v:10,why:"x",by:"Boss"}; await opt("merge"); await src("D1"); await tgt("NEW1"); click("[data-trw]"); await wait(10); await save(); log("19 DIFFERENT DISCOUNT: "+msg()); q("#bopBody [data-close]").click(); await wait(10);
  await newB("NEW2"); await opt("split"); await src("D1"); await tgt("NEW2"); click("[data-trw]"); await wait(10); await save(); const n2=orders.find(o=>o.label==="NEW2"); log("20 EMPTY BILL TAKES ITS TERMS: "+note()+" | disc "+JSON.stringify(n2.disc&&n2.disc.v)+" total "+totals(n2.lines,n2).g);
  await newB("GONE"); click("#billBtn"); await wait(10); click('[data-bo="void"]'); await wait(15); qa("#bopBody .bop-b").find(b=>b.textContent.includes("GONE")).click(); await wait(15); log("21 VOID EMPTY: rows "+qa("#bopVRows tr").length); click('[data-bg="save"]'); await wait(20); log("22 CLOSED: "+note()+" | has "+orders.some(o=>o.label==="GONE"));
  const base=orders.length; for(let i=0;i<450;i++){ orders.push({no:String(20000+i),ord:i+1,label:"Tbl"+i,dept:"Bar",lines:{1:1},rounds:1,at:new Date(),waiter:i%2?"Jane Waiter":"Solo Sam"}); }
  const t0=performance.now(); await opt("merge"); const t1=performance.now(); log("23 "+orders.length+" BILLS: rows "+qa("#trL .tr-b").length+" | "+qa("#trL .tr-e").map(e=>e.textContent).join("")+" | opened ok");
  const qq=q("#trQ"); qq.focus(); qq.value="20417"; qq.dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("24 SEARCH NUMBER: "+left()+" | focus kept "+(document.activeElement===qq)); qq.value="tbl41"; qq.dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("25 SEARCH TABLE: "+left()); qq.value="zzz"; qq.dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("26 NONE: "+q("#trL .tr-e").textContent); qq.value="20417"; qq.dispatchEvent(new Event("input",{bubbles:true})); await wait(10);
  const qt=q("#trT"); qt.value="20003"; qt.dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("27 SEARCH TARGET: "+qa("#trTL .tr-b").map(b=>b.querySelector("b").textContent).join(",")); q('[data-trs="20417"]').click(); await wait(10); q('[data-trt="20003"]').click(); await wait(10); click("[data-trw]"); await wait(10); await save(); log("28 FOUND AND MERGED: "+note()+" | 20417 gone "+!orders.some(o=>o.no==="20417")+" | 20003 "+JSON.stringify(orders.find(o=>o.no==="20003").lines)); orders.splice(base);
  await relog("1111"); await opt("split"); log("29 WAITER ASKS PIN: "+!!q("#bopPin")); q("#mBopt").classList.remove("show");
  USERS.push({n:"Cara Cash",pin:"7777",d:["Bar","Restaurant","Pool"],role:"Cashier"}); shiftStart("Cara Cash",0,"t"); await relog("7777"); await opt("merge"); log("30 CASHIER NO PIN: "+!q("#bopPin")+" | sees all "+qa("#trL .tr-b").length); q("#mBopt").classList.remove("show");
  bosave(); log("31 SAVED: "+JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).OR.map(o=>o.label).join(","));`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "tr-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=40000"];
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

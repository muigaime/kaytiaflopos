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
  const MIN=60e3, note=()=>(qa("#fsn").pop()||{}).textContent||"", newB=async l=>{click("#newSale"); await wait(15); q("#fTable").value=l; click("#sendBtn"); await wait(25);}, age=(l,m)=>{orders.find(o=>o.label===l).at=new Date(Date.now()-m*MIN);}, has=l=>orders.some(o=>o.label===l), snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, selRows=()=>qa("#selList [data-row]").map(r=>r.innerText.replace(/\\s+/g," ").trim()).join(" ; ");
  log("1 BUTTON: "+q("#sendBtn").textContent+" off "+q("#sendBtn").disabled); click("#newSale"); await wait(15); log("2 AFTER NEW SALE: "+q("#sendBtn").textContent+" off "+q("#sendBtn").disabled); await add("Tusker","Bar"); log("3 WITH ITEM: "+q("#sendBtn").textContent); cart={}; drawCart(); await wait(5); q("#fTable").value="A1"; click("#sendBtn"); await wait(25); log("4 OPENED: "+note()+" | button "+q("#sendBtn").textContent);
  click("#selBtn"); await wait(15); log("5 IN SELECT: "+selRows()+" | title "+q("#selT").textContent); click('#mSel [data-close]'); await wait(10); click("#ordBtn"); await wait(10); log("6 OPEN ORDERS: "+q("#ordBtn").textContent+" | "+q("#ordList .ord .m").textContent.slice(0,40)); q("#mOrd").classList.remove("show");
  ${outPng ? 'click("#selBtn"); await wait(20);' : `
  age("A1",3.5); billsExpire(); log("7 AT 3.5 MIN: still "+has("A1")); click("#selBtn"); await wait(15); log("8 COUNTDOWN: "+q("[data-exp]").textContent); age("A1",4.5); billsExpire(); await wait(5); log("9 TICKS ON SCREEN: "+q("[data-exp]").textContent); age("A1",5.1); billsExpire(); await wait(10); log("10 EXPIRED: gone "+!has("A1")+" | note "+note()+" | select rows "+qa("#selList [data-row]").length+" | open btn "+q("#ordBtn").textContent+" | log "+BILLLOG.at(-1).act+" "+BILLLOG.at(-1).no+" "+BILLLOG.at(-1).why); click('#mSel [data-close]'); await wait(10);
  await newB("A2"); await add("Tusker","Bar"); await send("A2"); await wait(10); log("11 NAME: "+note()); cart={}; drawCart();
  click("#ordBtn"); await wait(10); qa('#ordList [data-oa="add"]').find(b=>b.closest(".ord").textContent.includes("A2")).click(); await wait(20); age("A2",9); billsExpire(); log("12 BEING USED STAYS: "+has("A2")+" | adding to "+q("#fBill").value); await add("Tusker","Bar"); click("#sendBtn"); await wait(450); click("#rcClose"); await wait(10); billsExpire(); log("13 ITEMS ADDED, NEVER EXPIRES: "+has("A2")+" tag "+qa("[data-exp]").length+" lines "+JSON.stringify(orders.find(o=>o.label==="A2").lines));
  await newB("A3"); await add("Tusker","Bar"); await snd("A4"); click("#lock"); await wait(25); await login("0000"); click("#billBtn"); await wait(10); click('[data-bo="merge"]'); await wait(20); q('[data-trs="'+orders.find(o=>o.label==="A4").no+'"]').click(); await wait(10); log("14 TARGET SHOWS TIME: "+qa("#trTL .tr-b").find(b=>b.textContent.includes("A3")).innerText.replace(/\\s+/g," ")); q('[data-trt="'+orders.find(o=>o.label==="A3").no+'"]').click(); await wait(10); age("A3",7); billsExpire(); log("15 TARGET ON SCREEN STAYS: "+has("A3")); click("[data-trw]"); await wait(10); click('[data-bg="save"]'); await wait(25); billsExpire(); log("16 MERGED IN, STAYS: "+has("A3")+" lines "+JSON.stringify(orders.find(o=>o.label==="A3").lines));
  await newB("A5"); age("A5",6); bosave(); const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("17 SAVED OLD EMPTY: "+sv.OR.some(o=>o.label==="A5")); click("#lock"); await wait(25); await login("1111"); log("18 CLEARS AT NEXT SIGN IN: gone "+!has("A5")); bosave(); const s2=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("19 SAVED: "+s2.OR.map(o=>o.label).join(",")+" | log "+s2.BL.filter(x=>x.act==="Expired").map(x=>x.no).join(","));
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>x.dataset.n==="Reports").click(); await wait(30); q('[data-r="blog"]').click(); await wait(30); log("20 BILL OPTIONS LOG: "+[...q("#vSub table.t").rows].slice(1).filter(r=>r.textContent.includes("Expired")).map(r=>r.cells[1].textContent+" "+r.cells[4].textContent+" "+r.cells[6].textContent+" by "+r.cells[7].textContent).join(" ; "));`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "ex-"));
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

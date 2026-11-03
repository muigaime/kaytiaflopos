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
  const note=()=>(qa("#fsn").pop()||{}).textContent||"", set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true}));}, A=(m,v)=>set('[data-pa="'+m+'"]',v), N=(m,v)=>set('[data-pn="'+m+'"]',v), T=(m,v)=>set('[data-pt="'+m+'"]',v), clr=async()=>{click("#pOk"); await wait(30);}, rcT=()=>q("#rc").innerText.replace(/\\s+/g," "), snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, close=async()=>{click("#rcClose"); await wait(10);}, bal=()=>q("#pBal").textContent+" | tendered "+q("#pTend").textContent;
  CU.push({n:"Kamau Hardware",limit:50000,owes:0}); RESERVATIONS.push({id:"R1",room:"101",guest:"Mary Wambui",rate:5000,in:"2026-11-01",out:"2026-11-05",adults:1,children:0,plan:"RO",mrate:0,status:"inhouse",charges:[],pays:[]});
  await add("Tusker","Bar",3); await add("Fish","Restaurant"); await snd("T1"); await add("Burger","Pool"); await snd("T2"); await add("Tusker","Bar"); await snd("T3");
  await add("Tusker","Bar"); await snd("T4"); await add("Tusker","Bar"); await snd("T5");
  openPay([orders[0]]); await wait(25);
  log("1 SCREEN: rows "+qa(".pay-r th").map(x=>x.textContent).join("/")+" | heads "+qa(".pay-t thead th").map(x=>x.textContent).join("/")+" | bill "+q(".pay-f b").textContent+" | total "+q("#pTotal").textContent+" | waiter "+qa(".pay-f b")[1].textContent+" | money "+qa(".pay-note").map(b=>b.textContent.replace("KES","")).join(",")+" | focus cash "+(document.activeElement===q("#pAmt"))+" | buttons "+["pAcct","pRoom","pMulti","pOk","pCancel"].filter(i=>q("#"+i)).length);
  ${outPng ? 'click(\'[data-note="1000"]\'); await wait(5); click(\'[data-note="500"]\'); await wait(5); A("pdq","200"); N("pdq","SL778"); T("cash","100"); q("#pCustN").value="Mary Wambui"; q("#pCustP").value="A012345678Z"; await wait(10);' : `
  log("2 EMPTY: "+bal()); await clr(); log("3 NOT ENOUGH: "+note()+" | still open "+q("#mPay").classList.contains("show"));
  click('[data-note="1000"]'); await wait(5); click('[data-note="500"]'); await wait(5); click('[data-note="100"]'); await wait(5); log("4 NOTES ADD TO CASH: "+q("#pAmt").value+" | "+bal()); click('[data-note="0"]'); await wait(5); log("5 RESET: ["+q("#pAmt").value+"] "+bal());
  q('[data-pr="pdq"]').click(); await wait(5); click('[data-note="200"]'); await wait(5); log("6 NOTES FOLLOW ROW: pdq "+q('[data-pa="pdq"]').value+" | selected "+q(".pay-r.on th").textContent); A("pdq","");
  A("mpesa","9000"); await clr(); log("7 M-PESA NEEDS CODE: "+note()); N("mpesa","QK12"); await clr(); log("8 NON-CASH OVER: "+note()); A("mpesa","1600"); N("mpesa","254712345678"); await clr(); log("9 PHONE ONLY: "+note());
  click("[data-stk]"); await wait(3100); log("10 STK: "+q('[data-pn="mpesa"]').value.slice(0,2)+" | btn "+q("[data-stk]").textContent); A("mpesa","");N("mpesa","");
  A("comp","500"); log("11 COMP PIN SHOWS: "+getComputedStyle(q("#pCompPin")).display); A("pdq","300"); N("pdq","SL9"); A("cash","2000"); T("cash","100"); log("12 "+bal()); await clr(); log("13 NO REASON: "+note()); N("comp","Birthday"); q("#pPin").value="1111"; await clr(); log("14 WAITER PIN: "+note()); q("#pPin").value="0000"; q("#pCustN").value="Mary W"; q("#pCustP").value="A012"; await clr();
  log("15 RECEIPT: "+rcT().match(/Customer.*?PIN \\S+/)[0]+" || "+rcT().match(/PAID BY.*?(?=CU serial)/)[0]); await close();
  log("16 SALES: "+SALES.map(s=>s.no+" "+s.dept+" "+JSON.stringify(s.mx)+" tips "+JSON.stringify(s.tips||{})+" cust "+s.cust).join(" ; ")); log("17 SHIFT: "+JSON.stringify({exp:shiftCalc(shiftOf("Jane Waiter")).expected,tips:shiftCalc(shiftOf("Jane Waiter")).tips}));
  openPay([orders[0]]); await wait(20); click("#pRoom"); await wait(15); log("18 ROOM LIST: "+qa("#pRm option").map(o=>o.textContent).join(";")+" | amount "+q("#pPostA").value); q("#pPostA").value="5000"; click('[data-post="room"]'); await wait(10); log("19 TOO MUCH: "+note()); q("#pPostA").value="800"; click('[data-post="room"]'); await wait(15); log("20 POSTED: "+qa(".pay-r.posted").map(r=>r.innerText.replace(/\\s+/g," ")).join(";")+" | "+bal()+" | customer "+q("#pCustN").value); await clr(); log("21 RECEIPT ROOM: "+rcT().match(/PAID BY.*?(?=CU serial)/)[0]+" | sign "+!!q("#rc .sl-sign")); await close();
  const r=RESERVATIONS[0]; log("22 FOLIO: "+JSON.stringify(r.charges.map(c=>[c.cat,c.desc,c.amt]))+" owed "+r.posOwed+" bal "+folioOf(r).bal);
  openPay([orders[0]]); await wait(20); click("#pAcct"); await wait(15); log("23 ACCOUNT: "+qa("#pCu option").length+" customers"); click('[data-post="acct"]'); await wait(10); log("24 "+q(".pay-r.posted").innerText.replace(/\\s+/g," ")+" | "+bal()); q(".pay-x").click(); await wait(10); log("25 REMOVED: "+qa(".pay-r.posted").length+" | "+bal()); q("#mPay .pay-exit").click(); await wait(10); log("26 EXIT: open "+q("#mPay").classList.contains("show")+" | bills "+orders.length);
  openPay([orders[0]]); await wait(20); click("#pMulti"); await wait(15); log("27 MULTI LIST: "+qa("[data-pb]").length+" | ticked "+qa("[data-pb]:checked").length); const p2=qa("[data-pb]")[1]; p2.click(); p2.dispatchEvent(new Event("change",{bubbles:true})); await wait(15); log("28 TWO: bill "+q(".pay-f b").textContent+" | total "+q("#pTotal").textContent); q("#pRcN").click(); q("#pRcN").dispatchEvent(new Event("change",{bubbles:true})); A("cash","400"); await clr(); log("29 NO RECEIPT: receipt open "+q("#mRc").classList.contains("show")+" | note "+note()+" | bills left "+orders.length+" | sales "+SALES.length); payNoRc=false;
  await add("Tusker","Bar"); openPay(null); await wait(20); click("#pMulti"); await wait(10); log("30 DIRECT MULTI: "+note()); A("cash","200"); await clr(); log("31 DIRECT: "+SALES.at(-1).no+" "+JSON.stringify(SALES.at(-1).mx)); await close();
  fdStart: { user=USERS.find(u=>u.n==="Jane Waiter"); const e0=recPay(r,"cash",3000); const s=SALES.at(-1); log("32 FD PAYS: err ["+(e0||"")+"] "+s.no+" g "+s.g+" "+JSON.stringify(s.mx)+" | owed "+r.posOwed); const e1=recPay(r,"cash",100); log("33 NEXT PAY: g "+SALES.at(-1).g+" "+JSON.stringify(SALES.at(-1).mx)); }
  bosave(); log("34 SAVED: room "+JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).RV[0].posOwed);`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "st-"));
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

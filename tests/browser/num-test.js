// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__rpauto=setInterval(()=>{const m=document.getElementById("mRp"); if(m&&m.classList.contains("show")){document.getElementById("rpPin").value="0000"; document.getElementById("rpGo").click();}},2);window.open=()=>({document:{write(){},close(){}},focus(){},print(){}});
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
  const relog=async p=>{click("#lock"); await wait(25); posKioskOff(); await login(p);}, pay=async o=>{openPay(o); await wait(20); q("#pAmt").value="9000"; click("#pOk"); await wait(35); const t=q("#rc").innerText.replace(/\\s+/g," "); click("#rcClose"); await wait(10); return t;}, snd=async l=>{await send(l); await wait(450); click("#rcClose"); await wait(10);}, ol=()=>orders.map(o=>o.label+" bill "+o.no+" order "+o.ord).join(" ; ");
  ${outPng ? '' : `
  log("1 NEXT BILL SHOWN: "+q("#fBill").value);
  await add("Tusker","Bar"); await send("T1"); await wait(450); log("2 TICKET: "+q("#rc .sl-order").innerText.replace(/\\s+/g," ").slice(0,110)); click("#rcClose"); await wait(10);
  await add("Fish","Restaurant"); await snd("T2"); await add("Burger","Pool"); await snd("T3"); log("3 "+ol()+" | next "+q("#fBill").value);
  click("#selBtn"); await wait(15); log("4 SELECT: "+q("#selList [data-row]").innerText.replace(/\\s+/g," ")); click('#mSel [data-close]'); await wait(10);
  click("#ordBtn"); await wait(10); log("5 OPEN ORDERS: "+q("#ordList .ord .m").textContent.slice(0,50)); q("#mOrd").classList.remove("show");
  const rc=await pay([orders[0]]); log("6 RECEIPT same bill: "+rc.slice(0,110)+" | "+SALES[0].no+" ord "+SALES[0].ord);
  await add("Tusker","Bar"); const rc2=await pay(null); log("7 DIRECT: bill "+SALES.at(-1).no+" ord "+SALES.at(-1).ord+" | next "+q("#fBill").value+" | "+rc2.slice(0,60));
  click("#newSale"); await wait(15); q("#fTable").value="T2B"; click("#sendBtn"); await wait(25); click("#billBtn"); await wait(10); click('[data-bo="split"]'); await wait(15); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(15); q('[data-trs="'+orders.find(o=>o.label==="T2").no+'"]').click(); await wait(10); q('[data-trt="'+orders.find(o=>o.label==="T2B").no+'"]').click(); await wait(10); click('[data-trm="2"]'); await wait(10); click('[data-bg="save"]'); await wait(20); log("8 SPLIT new numbers: "+ol());
  shiftEnd0: { const sh=shiftOf("Jane Waiter"); log("9 SHIFT counter "+sh.ono); sh.closedAt=new Date().toISOString(); shiftStart("Jane Waiter",0,"t"); }
  await add("Tusker","Bar"); await snd("T5"); log("10 AFTER NEW SHIFT order restarts, bill continues: "+orders.at(-1).no+" order "+orders.at(-1).ord);
  await relog("3333"); await add("Tusker"); await snd("S1"); log("11 OTHER WAITER: "+orders.at(-1).no+" order "+orders.at(-1).ord);
  bosave(); const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("12 SAVED RN "+sv.RN+" ON "+sv.ON);
  sv.S[0].no="NBO-000777"; sv.OR.push({no:"ORD-004",label:"Old",dept:"Bar",lines:{1:1},rounds:1,at:new Date().toISOString(),waiter:"Solo Sam"}); sv.BL=[{at:new Date().toISOString(),act:"Void",no:"ORD-004",label:"x",dept:"Bar",by:"b",user:"u",why:"",detail:"d",amt:0}]; delete sv.RN; localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify(sv));`}
  posKioskOff(); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  log("13 BRAND: "+q("#bo .lg").innerText.replace(/\\s+/g," ")+" | img "+!!q("#bo .lg img")+" | title "+document.title);
  q('#nav .nv[data-n="Sales & Orders"]').click(); await wait(30);
  const sr=()=>qa("#salesList .so-r summary").map(x=>x.innerText.replace(/\\s+/g," ").trim()).join("\\n   "), hd=()=>q(".so-head").innerText.replace(/\\s+/g," ");
  ${outPng ? 'SALES.push({no:"00042",ord:7,at:new Date(),dept:"Bar",label:"T4",user:"Boss",waiter:"Jane Waiter",net:172.41,tax:27.59,g:200,lines:[{id:1,n:"Tusker",q:1,p:200,t:"B"}],mx:{cash:200}}); orders.push({no:"00043",ord:8,label:"T9",dept:"Bar",lines:{1:2},rounds:1,at:new Date(),waiter:"Jane Waiter"}); qa("#nav .nv").find(x=>x.dataset.n==="Home").click(); await wait(20); qa("#nav .nv").find(x=>x.dataset.n==="Sales & Orders").click(); await wait(30);' : `
  log("14 DEFAULT: "+hd()+"\\n   "+sr()+" | seg "+!!q("#vSub .seg"));
  const old=SALES.find(s=>s.no); const oldNo=old.no; old.at=new Date(Date.now()-3*864e5); q('#nav .nv[data-n="Home"]').click(); await wait(20); q('#nav .nv[data-n="Sales & Orders"]').click(); await wait(30);
  log("15 OLD BILL HIDDEN: "+!q("#salesList").innerText.includes(oldNo)+" ("+oldNo+")");
  const qi=q('[data-sq]'); qi.focus(); qi.value=oldNo; qi.dispatchEvent(new Event("input",{bubbles:true})); await wait(20); log("16 SEARCH BY BILL finds old: "+hd()+" | "+sr()+" | focus "+(document.activeElement===qi));
  qi.value="fish"; qi.dispatchEvent(new Event("input",{bubbles:true})); await wait(20); log("17 SEARCH ITEM: "+qa("#salesList .so-r").length+" | "+hd());
  qi.value="zzz"; qi.dispatchEvent(new Event("input",{bubbles:true})); await wait(20); log("18 NONE: "+q("#salesList .empty").textContent); qi.value=""; qi.dispatchEvent(new Event("input",{bubbles:true})); await wait(10);
  const d3=new Date(Date.now()-3*864e5).toISOString().slice(0,10), fd=q('[data-sf="from"]'); fd.value=d3; fd.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); const td=q('[data-sf="to"]'); td.value=d3; td.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); log("19 DATES: "+hd()+" | "+qa("#salesList .so-r").length);
  click('[data-a="sales_clear"]'); await wait(30); log("20 BACK: "+hd());
  q("#salesList .so-r summary").click(); await wait(10); log("21 DETAIL: "+q("#salesList .so-r .so-d").innerText.replace(/\\s+/g," ").slice(0,120)); click('[data-a="sales_print"]'); await wait(25); log("22 PRINT: "+q("#rc").innerText.replace(/\\s+/g," ").slice(0,70)); click("#rcClose"); await wait(10);
  q('#nav .nv[data-n="Reports"]').click(); await wait(30); q('[data-r="bills"]').click(); await wait(30); log("23 BILLS REPORT: "+qa(".bl-t th").map(x=>x.textContent).join("/")+" | row "+[...q("[data-bill]").cells].map(c=>c.textContent).join(",")); q('[data-a="rep_print"]').click();`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "nm-"));
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

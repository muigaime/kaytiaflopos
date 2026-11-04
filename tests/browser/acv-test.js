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
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); const G=()=>{window.bosave(); return JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).GN||[];}, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(100);}, tab=async t=>{click('[data-a="pur_tab"][data-t="'+t+'"]'); await wait(60);}, set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));}, tst=()=>q("#toast").textContent;
  await nav("Vendors"); set('[data-iv="vn.name"]',"Kenya Breweries"); click('[data-a="inv_vnsave"]'); await wait(40);
  await nav("Purchasing"); await tab("receive"); const addLine=async(name,qty,price)=>{ set('[data-iv="rc.eName"]',name); await wait(30); const pk=qa("#vSub button").find(b=>b.dataset.a==="inv_rcfind"); set('[data-iv="rc.eQty"]',String(qty)); set('[data-iv="rc.ePrice"]',String(price)); await wait(15); click('[data-a="inv_rcadd"]'); await wait(40); };
  
  const invTab=async t=>{ click('[data-a="inv_tab"][data-t="'+t+'"]'); await wait(50); };
  const dt=()=>q("#docModal h3").textContent;
  const paper=()=>q("#docModal .a4").textContent.replace(/ +/g," ");
  const close=async()=>{ click('[data-a="dc_close"]'); await wait(40); };
  const stubPrint=()=>{ const o=window.open; let html="",printed=0; window.open=()=>({document:{write:s=>{html=s},close(){}},focus(){},print(){printed++}}); return ()=>{window.open=o; return {html,printed}}; };
  const getPdf=async()=>{ let got=null,fn="",mk=null; const dl=PDF.download; PDF.download=(o,f,m)=>{got=o;fn=f;mk=m;}; click('[data-a="dc_pdf"]'); await wait(60); PDF.download=dl; return {got,fn,bytes:mk?mk(got):""}; };
    const acTab=async t=>{ click('[data-a="ac_tab"][data-t="'+t+'"]'); await wait(60); };
  const closeD=async()=>{ click('[data-a="dc_close"]'); await wait(40); };
  const prn=async()=>{ const o=window.open; let html="",printed=0; window.open=()=>({document:{write:s=>{html=s},close(){}},focus(){},print(){printed++}}); click('[data-a="dc_print"]'); await wait(30); window.open=o; return {html,printed}; };
  const pdf=async()=>{ let got=null,mk=null,fn=""; const dl=PDF.download; PDF.download=(o,f,m)=>{got=o;fn=f;mk=m;}; click('[data-a="dc_pdf"]'); await wait(50); PDF.download=dl; return fn+" "+mk(got).slice(0,8); };
  await nav("Accounting"); await acTab("bank"); if(q('[data-a="ac_banknew"]')){ click('[data-a="ac_banknew"]'); await wait(30); } q("#acBN").value="KCB Main"; q("#acBO").value="100000"; click('[data-a="ac_banksave"]'); await wait(60); log("1 BANK: "+tst()+" | voucher "+(q("#docModal h3")||{}).textContent); if(q("#docModal")) { log("1B OPENING: "+dt()); await closeD(); }
  await acTab("btx"); log("2 KINDS: "+qa('[data-a="ac_btxk"]').map(x=>x.textContent).join(", ")); click('[data-a="ac_btxk"][data-k="wd"]'); await wait(40); log("3 FORM: "+q(".ac-kinds + .stk").textContent+" | goes to "+q("#acTO").value+" | collected "+!!q("#acTW")+" | btn "+q('[data-a="ac_btxpost"]').textContent);
  click('[data-a="ac_btxpost"]'); await wait(30); log("4 NO AMOUNT: "+tst()); q("#acTM").value="5000"; q("#acTO").value=q("#acTB").value; click('[data-a="ac_btxpost"]'); await wait(30); log("5 SAME ACCOUNT: "+tst()); q("#acTO").value="1000"; q("#acTM").value="5000"; q("#acTR").value="CHQ-88"; q("#acTW").value="Peter"; q("#acTN").value="Cash for the float"; click('[data-a="ac_btxpost"]'); await wait(70);
  log("6 POSTED: "+tst()+" | "+dt()); log("7 VOUCHER: "+paper().slice(0,560)); const p1=await prn(); const d1=new DOMParser().parseFromString(p1.html,"text/html"); log("8 PRINT: "+p1.printed+" "+d1.querySelector("h1").textContent+" rows "+d1.querySelectorAll(".a4-items tbody tr").length+" signs "+[...d1.querySelectorAll(".a4-sign div")].map(x=>x.firstChild.textContent).join("/")); log("9 PDF: "+await pdf()); await closeD();
  const bankBal=()=>{ const t=qa("#vSub .t tr").map(r=>r.textContent).find(x=>/Withdrawal|Cash for the float/.test(x)); return t; }; log("10 LIST: "+bankBal()); log("11 LIST PRINT BTN: "+!!q('[data-a="dc_open"][data-k="acv"]'));
  await acTab("r_tb"); log("12 TB: "+qa("#vSub .ac-fin tr").map(r=>[...r.cells].map(c=>c.textContent).join(" | ")).filter(x=>/Cash|KCB|^Total/.test(x)).join(" ; ")+" | warning "+!!q("#vSub .status.bad"));
  await acTab("btx"); for(const [k,lbl] of [["dep","Deposit"],["pay","Payment"],["tr","Transfer"],["chg","Bank charge"]]){ click('[data-a="ac_btxk"][data-k="'+k+'"]'); await wait(30); if(k==="dep"||k==="pay") q("#acTO").value=k==="dep"?"4800":"6110"; q("#acTM").value="100"; click('[data-a="ac_btxpost"]'); await wait(60); log("13 "+lbl+": "+tst()+" | "+(q("#docModal h3")||{}).textContent+" | "+[...qa("#docModal .a4-party")].map(x=>x.textContent).join(" / ")); if(q("#docModal")) await closeD(); }
  await acTab("jv"); click('[data-a="ac_jnew"]'); await wait(40); q("#acJN").value="Rent for November"; set('[data-jl="0.a"]',"6110"); set('[data-jl="0.dr"]',"2000"); set('[data-jl="1.a"]',"1000"); set('[data-jl="1.cr"]',"2000"); await wait(20); q("#acJN").value="Rent for November"; click('[data-a="ac_jpost"]'); await wait(70); log("14 JOURNAL: "+tst()+" | "+dt()+" | "+qa("#docModal .a4-items tr").map(r=>r.textContent).join(" ; ")); await closeD();
  await acTab("exp"); click('[data-a="ac_expk"][data-k="out"]'); await wait(40); q("#acEA").value="6110"; q("#acEM").value="1160"; q("#acEV").value="160"; q("#acEP").value="Power Co"; q("#acER").value="INV-5"; q("#acEN").value="Electricity"; click('[data-a="ac_exppost"]'); await wait(70); log("15 EXPENSE: "+tst()+" | "+dt()+" | "+qa("#docModal .a4-party").map(x=>x.textContent).join(" / ")+" | "+qa("#docModal .a4-sign div").length+" signs"); await closeD();
  click('[data-a="ac_expk"][data-k="in"]'); await wait(40); q("#acEA").selectedIndex=1; q("#acEM").value="500"; q("#acEP").value="Staff"; click('[data-a="ac_exppost"]'); await wait(70); log("16 INCOME: "+tst()+" | "+dt()+" | "+qa("#docModal .a4-party").map(x=>x.textContent).join(" / ")); await closeD();
  await acTab("jv"); click('[data-a="ac_jrev"]'); await wait(20); click('[data-a="ac_jrev"]'); await wait(70); log("17 REVERSE: "+tst()+" | "+dt()+" | facts "+qa("#docModal .a4-fact").map(x=>x.textContent).join(" ; ").slice(0,160)); await closeD(); const revd=qa('[data-a="dc_open"][data-k="acv"]').map(b=>b.dataset.id); const orig=revd[1]; click('[data-a="dc_open"][data-k="acv"][data-id="'+orig+'"]'); await wait(40); log("18 ORIGINAL NOW: banner "+(q("#docModal .a4-banner")||{}).textContent+" | pill "+q("#docModal .a4-pill").textContent); await closeD();
  await acTab("rec"); click('[data-a="ac_recall"]'); await wait(40); const kp=t=>qa(".ac-kpis .sp-kpi").find(x=>x.textContent.includes(t)).textContent; const book=parseFloat(kp("Balance in the books").replace(/[^0-9.]/g,"")); set('[data-acs="stmt"]',"1"); await wait(40); log("19 WRONG STATEMENT: save disabled "+q('[data-a="ac_recsave"]').disabled); set('[data-acs="stmt"]',String(book)); await wait(40); const sv=q('[data-a="ac_recsave"]'); log("19B RIGHT STATEMENT "+book+": disabled "+sv.disabled); sv.click(); await wait(70); log("20 REC: "+tst()+" | "+dt()+" | pill "+q("#docModal .a4-pill").textContent+" | "+q("#docModal .a4-tot").textContent); log("20B PDF: "+await pdf()); await closeD(); log("21 PAST LIST: "+!!q('[data-a="dc_open"][data-k="rec"]')); click('[data-a="dc_open"][data-k="rec"]'); await wait(40); log("22 REOPEN: "+dt()); await closeD();
  await acTab("fa"); if(q('[data-a="ac_fanew"]')){ click('[data-a="ac_fanew"]'); await wait(30); } q("#acFN").value="Walk-in freezer"; q("#acFA").value="60000"; click('[data-a="ac_fasave"]'); await wait(70); log("23 ASSET: "+tst()+" | "+((q("#docModal h3")||{}).textContent)); if(q("#docModal")) await closeD();
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "acv-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=60000"];
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

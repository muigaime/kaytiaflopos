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
  window.__P=[]; window.open=()=>({document:{write(h){window.__P.push(h);},close(){}},focus(){},print(){}});
  const note=()=>(qa("#fsn").pop()||{}).textContent||"", tab=async m=>{click('#mPay .tabs [data-m="'+m+'"]'); await wait(10);}, addp=async v=>{q("#pAmt").value=v; }, ok=async()=>{click("#pOk"); await wait(35); const t=q("#rc").innerText.replace(/\\s+/g," "); click("#rcClose"); await wait(10); return t;}, snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, tbl=s=>[...s.rows].map(r=>[...r.cells].map(c=>c.textContent).join(",")).join("\\n   ");
  const set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true}));};
  await add("Tusker","Bar",3); await add("Fish","Restaurant"); await snd("T1"); await add("Burger","Pool"); await snd("T2"); await add("Tusker","Bar",2); await snd("T3");
  openPay([orders[0]]); await wait(20); set('[data-pa="pdq"]',"600"); set('[data-pn="pdq"]',"SL123"); set('[data-pa="comp"]',"1000"); set('[data-pn="comp"]',"Guest apology"); q("#pPin").value="0000"; await ok();
  openPay([orders[0]]); await wait(20); set('[data-pa="comp"]',"800"); set('[data-pn="comp"]',"Owner's guest"); q("#pPin").value="0000"; await ok();
  openPay([orders[0]]); await wait(20); set("#pAmt","400"); await ok();
  bosave(); const S=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).S; log("8 SALES: "+S.map(s=>s.no+" "+s.dept+" "+JSON.stringify(s.mx)+(s.comp?" comp "+JSON.stringify(s.comp):"")).join(" ; "));
  const shc=shiftOf("Jane Waiter"); log("9 SHIFT CASH EXPECTED: "+shiftCalc(shc).expected+" pdq "+shiftCalc(shc).pdq+" comp "+shiftCalc(shc).comp);
  q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  qa("#nav .nv").find(x=>x.dataset.n==="Reports").click(); await wait(30); click('[data-a="rep_open"]'); await wait(40); q('[data-r="ps"]').click(); await wait(30);
  ${outPng ? '' : `
  log("10 META: "+q(".rp-meta").innerText.replace(/\\s+/g," "));
  log("11 TABLE:\\n   "+tbl(q("#vSub table.t")));
  log("12 BELOW:\\n   "+qa(".rp-below > div").map(d=>d.querySelector("h4").textContent+":\\n   "+(d.querySelector("table")?tbl(d.querySelector("table")):d.textContent)).join("\\n   "));
  q('[data-a="rep_print"]').click(); await wait(10); const A=window.__P.at(-1); log("13 A4 PRINT: address box "+A.includes("Postal address")+" | breakdown "+A.includes("Payment breakdown")+" M-Pesa "+A.includes("M-Pesa")+" Complimentary "+A.includes("Complimentary")+" | landscape "+A.includes("landscape"));
  const r8=q('[data-rsz="80"]'); r8.click(); r8.dispatchEvent(new Event("change",{bubbles:true})); q('[data-a="rep_print"]').click(); await wait(10); const T=window.__P.at(-1); log("14 80MM: "+(T.match(/class="b"/g)||[]).length+" blocks | has breakdown "+T.includes("Payment breakdown")+" | Tax A "+T.includes("Tax A")); const r4=q('[data-rsz="a4"]'); r4.click(); r4.dispatchEvent(new Event("change",{bubbles:true}));
  const rd0=q('[data-f="rd"]'); rd0.value="Bar"; rd0.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); log("15 BAR ONLY: "+q(".rp-meta").innerText.replace(/\\s+/g," ").slice(-20)+" | "+[...q("#vSub table.t").rows].slice(1).map(r=>r.cells[1].textContent+"="+r.cells[8].textContent).join(";")); const rd1=q('[data-f="rd"]'); rd1.value="All"; rd1.dispatchEvent(new Event("change",{bubbles:true})); await wait(30);
  q('[data-r="cmp"]').click(); await wait(30); log("16 COMP REPORT: "+q(".rp-head h3").textContent+"\\n   "+tbl(q("#vSub table.t")));
  q('[data-r="ip"]').click(); await wait(30); log("17 PAYMODE REPORT: "+tbl(q("#vSub table.t")));
  q('[data-r="bills"]').click(); await wait(30); const pf=q('[data-bf="pay"]'); log("18 BILLS PAYMODES: "+[...pf.options].map(o=>o.textContent).join("/")); pf.value="comp"; pf.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); log("19 COMP BILLS: "+qa("#vSub [data-bill]").filter(r=>!r.hidden).length); const pf2=q('[data-bf="pay"]'); pf2.value="All"; pf2.dispatchEvent(new Event("change",{bubbles:true})); await wait(20);
  qa("#nav .nv").find(x=>x.dataset.n==="Sales & Orders").click(); await wait(30); q('.so-r summary').click(); const rb=qa('[data-a="ret"]'); log("20 RETURN BUTTONS "+rb.length); const compNo=SALES.find(s=>s.comp&&s.dept==="Pool").no; const rtb=qa('[data-a="ret"]').find(b=>b.dataset.no===compNo); rtb.click(); await wait(20); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(25); click("#bopVAll"); await wait(10); q('.bv-r[data-vw="Goods returned"]').click(); click('[data-bg="save"]'); await wait(40); log("21 RETURN OF COMP: "+q("#rc").innerText.replace(/\\s+/g," ").match(/REFUNDED BY.*?Reason/)[0]); click("#rcClose"); await wait(10);
  qa("#nav .nv").find(x=>x.dataset.n==="Reports").click(); await wait(30); click('[data-a="rep_open"]'); await wait(40); q('[data-r="cmp"]').click(); await wait(30); log("22 COMP REPORT AFTER: "+[...q("#vSub table.t").rows].slice(1).map(r=>r.cells[1].textContent+" "+r.cells[9].textContent).join(";"));`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "pr-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,1250", "--virtual-time-budget=32000"];
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

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
  const relog=async p=>{click("#lock"); await wait(25); posKioskOff(); await login(p);}, pay=async o=>{openPay(o); await wait(20); q("#pAmt").value="9000"; click("#pOk"); await wait(35); click("#rcClose"); await wait(10);};
  window.__P=[]; window.open=()=>({document:{write(h){window.__P.push(h);},close(){}},focus(){},print(){}});
  log("0 STOCK START Bar a "+STK.Bar.a+" Rest c "+STK.Restaurant.c);
  await add("Tusker","Bar",3); await add("Fish","Restaurant"); await send("T1"); await wait(500); click("#rcClose"); await wait(10);
  await add("Fish","Restaurant",2); await send("T2"); await wait(500); click("#rcClose"); await wait(10);
  await relog("0000"); orders[0].disc={type:"pct",v:10,why:"x",by:"Boss"}; await pay([orders[0]]); log("1 STOCK AFTER SALE Bar a "+STK.Bar.a+" Rest c "+STK.Restaurant.c+" | pending "+orders.map(o=>o.label));
  posKioskOff(); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  q('#nav .nv[data-n="Sales & Orders"]').click(); await wait(30);
  log("2 SALES PAGE: clear button "+!!q('[data-a="clr"]')+" | text has Clear "+q("#vSub").innerText.includes("Clear all")+" | return buttons "+qa('[data-a="ret"]').length);
  const rows=()=>qa("#bopVRows tr").map(r=>r.innerText.replace(/\\s+/g," ").trim()+(r.classList.contains("on")?"*":"")).join(" ; "), sum0=()=>q("#bopVSum").innerText.replace(/\\s+/g," "), row=n=>qa("#bopVRows tr").find(r=>r.textContent.includes(n));
  const openR=async()=>{q('[data-a="ret"]').click(); await wait(20);}; await openR(); const mb=getComputedStyle(q("#mBopt")); log("3 ASKS PIN: "+!!q("#bopPin")+" | on top "+mb.zIndex+" show "+q("#mBopt").classList.contains("show")+" | stk "+q("#bopBody .stk").textContent);
  q("#bopPin").value="1111"; click('[data-bg="auth"]'); await wait(15); log("4 WAITER PIN: "+q("#bopMsg").textContent+" | form "+!!q("#bopVRows"));
  q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(25); log("5 FORM: "+rows()+" | "+sum0()+" | reasons "+qa(".bv-r").length);
  ${outPng ? 'row("Tusker").click(); await wait(10); q(\'.bv-r[data-vw="Wrong item served"]\').click();' : `
  click('[data-bg="save"]'); await wait(10); log("6 NOTHING: "+q("#bopMsg").textContent);
  row("Tusker").click(); await wait(10); q("#bopVRows [data-vs][data-d='-1']").click(); await wait(10); log("7 ONE TUSKER... "+rows()+" | "+sum0()); click('[data-bg="save"]'); await wait(10); log("8 NO REASON: "+q("#bopMsg").textContent);
  q('.bv-r[data-vw="Wrong item served"]').click(); click('[data-bg="save"]'); await wait(40); log("9 CREDIT NOTE: "+q("#rc").innerText.replace(/\\s+/g," ").slice(0,420)); click("#rcClose"); await wait(15);
  log("10 STOCK Bar a "+STK.Bar.a+" Rest c "+STK.Restaurant.c+" | sales "+SALES.map(s=>s.no+" "+s.dept+" g"+s.g+" cash"+(s.mx.cash||0)).join(" ; ")+" | can return more "+retCan(SALES[0].no));
  await openR(); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(25); log("11 LEFT TO RETURN: "+rows()); click("#bopVAll"); await wait(10); q('.bv-r[data-vw="Goods returned"]').click(); click('[data-bg="save"]'); await wait(40); click("#rcClose"); await wait(15);
  const net=SALES.reduce((a,s)=>a+s.g,0); log("12 ALL BACK: stock Bar a "+STK.Bar.a+" Rest c "+STK.Restaurant.c+" | net sales "+net.toFixed(2)+" | return buttons "+qa('[data-a="ret"]').length+" | RET no's "+[...new Set(SALES.filter(s=>s.ret).map(s=>s.no))]);
  q('#nav .nv[data-n="Reports"]').click(); await wait(30); log("13 LIST: "+qa("[data-r]").slice(0,3).map(b=>b.textContent).join(" / "));
  q('[data-r="rets"]').click(); await wait(30); log("14 RETURNS REPORT: "+[...q("#vSub table.t").rows].map(r=>[...r.cells].map(c=>c.textContent).join(",")).join("\\n   "));
  q('[data-r="bills"]').click(); await wait(30); const br=()=>qa("#vSub [data-bill]").filter(r=>!r.hidden).map(r=>r.cells[2].textContent+"/"+r.cells[3].textContent+"/"+r.cells[r.cells.length-1].textContent).join(" ; "), tt=()=>q(".bl-tot").innerText.replace(/\\s+/g," ");
  log("15 COMBINED: "+br()+" | "+tt()); const set=async(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("change",{bubbles:true})); await wait(30);};
  await set('[data-bf="status"]',"Settled"); log("16 SETTLED: "+br()+" | "+tt()); await set('[data-bf="status"]',"Pending"); log("17 PENDING: "+br()+" | "+tt());
  q('[data-a="rep_print"]').click(); await wait(5); log("18 PRINT PENDING: "+(window.__P.at(-1).match(/<tr>/g)||[]).length+" rows");
  q("[data-bill]").dispatchEvent(new MouseEvent("dblclick",{bubbles:true})); await wait(25); log("19 PENDING DBLCLICK: "+q("#rc").innerText.replace(/\\s+/g," ").slice(0,120)); click("#rcClose"); await wait(10);
  await set('[data-bf="status"]',"Combined"); const rn=SALES.find(s=>s.ret).no; q('[data-bill="'+rn+'"]').dispatchEvent(new MouseEvent("dblclick",{bubbles:true})); await wait(25); log("20 CREDIT REPRINT: "+q(".sl-copy").textContent); click("#rcClose"); await wait(10);
  q('[data-r="blog"]').click(); await wait(30); log("21 LOG: "+[...q("#vSub table.t").rows].slice(1).map(r=>r.cells[4].textContent+":"+r.cells[5].textContent).join(" ; "));
  q('[data-r="sc"]').click(); await wait(30); log("22 SALES AND COSTS: "+[...q("#vSub table.t").rows].map(r=>[...r.cells].slice(0,3).map(c=>c.textContent).join(",")).join(" | "));
  q('#nav .nv[data-n="Home"]').click(); await wait(40); log("23 HOME ORDERS: "+qa("#kpis .k")[2].querySelector(".v").textContent+" | activity "+q("#act .row b").textContent);
  bosave(); const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("24 SAVED: sales "+sv.S.length+" with ret "+sv.S.filter(s=>s.ret).length);`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "rt-"));
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

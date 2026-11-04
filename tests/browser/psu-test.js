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
  const jobs=[]; const realFetch=window.fetch; window.fetch=async(u,o)=>{ u=String(u); if(u.includes("/api/print/installed")) return {ok:true,json:async()=>({printers:["TEST","SERVERK"]})}; if(u.includes("/api/print/ticket")){ const b=JSON.parse(o.body); jobs.push(b); if(window.__down) throw new Error("x"); return {ok:true,json:async()=>({})}; } return realFetch(u,o); };
  const toBO=async()=>{click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>x.dataset.n==="Settings").click(); await wait(60); click('[data-a="hs_tab"][data-k="printers"]'); await wait(40);};
  const sel=(f,doc,pt)=>q('[data-psx="'+f+'"][data-pt="'+pt+'"][data-docs*="'+doc+'"]'), set=async(f,doc,pt,v)=>{const e=sel(f,doc,pt); e.value=v; e.dispatchEvent(new Event("change",{bubbles:true})); await wait(25);}, tst=()=>q("#toast").textContent;
  const snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, note=()=>(q("#rcPrinted")||{}).textContent||"", who=j=>j.printer.name||j.printer.ip, A=s=>click('[data-a="'+s+'"]');
  await toBO();
  log("1 GRID GONE: "+!q(".psu-grid")+" | form "+!q("#psuSrc")+" | pages "+qa("#vSub .pn h4").map(h=>h.textContent).join(" / ")+" | cards "+qa(".psu-card h5").map(h=>h.textContent).join(","));
  log("2 SALE POINTS: "+qa(".psu-card")[0].querySelectorAll("tbody th").length+" | "+[...qa(".psu-card")[1].querySelectorAll("tbody th")].map(x=>x.textContent).join(","));
  const op=sel("printer","GUEST BILL","Bar"); log("3 CHOICES: "+[...op.querySelectorAll("option,optgroup")].map(o=>o.label||o.textContent).join(" / "));
  log("4 OLD ROUTE CARRIED OVER: "+sel("printer","KITCHEN ORDER","Restaurant").value+" | "+sel("printer","BAR ORDER","Bar").value);
  log("5 NO PRINTER, PAPER OFF: "+sel("paper","GUEST BILL","Bar").disabled);
  await set("printer","GUEST BILL","Bar","win|TEST"); log("6 ON: "+!sel("paper","GUEST BILL","Bar").disabled+" | kept "+sel("printer","GUEST BILL","Bar").value);
  await set("copies","GUEST BILL","Bar","2"); await set("printer","GUEST BILL","Restaurant","win|SERVERK"); log("7 KEPT AFTER REDRAW: "+sel("copies","GUEST BILL","Bar").value);
  log("6a RECEIPT ROWS: "+[...qa(".psu-card")[2].querySelectorAll("tbody th")].map(x=>x.textContent).join()); await set("printer","RECEIPT","All sale points","win|SERVERK"); await set("paper","RECEIPT","All sale points","58mm"); await set("printer","BAR ORDER","Bar","win|TEST"); await set("printer","KITCHEN ORDER","Restaurant","win|SERVERK"); await set("copies","KITCHEN ORDER","Restaurant","2");
  jobs.length=0; click('[data-a="psu_test"][data-pt="Restaurant"][data-docs*="GUEST"]'); await wait(40); log("8 TEST BUTTON: "+jobs.map(who).join()+" | "+jobs[0].lines[0].t+" | "+tst());
  bosave(); log("9 NOT SAVED YET: "+(FD_SETTINGS.printRules||[]).length); A("psu_save"); await wait(40); const R=FD_SETTINGS.printRules; log("10 SAVED: "+tst()+" | "+R.map(r=>r.doc+"/"+r.point+"="+r.kind+":"+r.printer+"x"+r.copies+"/"+r.paper).join(" ; ")+" | routes "+Object.keys(FD_SETTINGS.printRoutes).length);
  log("11 STILL SHOWN: "+sel("printer","GUEST BILL","Bar").value+" x"+sel("copies","GUEST BILL","Bar").value);
  const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("12 ON DISK: "+(sv.FS.printRules||[]).length);
  click("#boMenu"); await wait(30); click('[data-go="pos"]'); await wait(80); await login("1111"); click('#spTabs [data-t="Bar"]'); await wait(10);
  jobs.length=0; await add("Tusker","Bar"); await snd("T1"); log("13 BAR ORDER: "+jobs.map(j=>who(j)+":"+j.lines[0].t).join()+" | body "+JSON.stringify(jobs[0].printer));
  jobs.length=0; await add("Fish","Restaurant"); await snd("T2"); log("14 KITCHEN ORDER, 2 COPIES: "+jobs.map(j=>who(j)+":"+j.lines[0].t).join());
  jobs.length=0; await add("Burger","Pool"); await snd("T3"); log("15 POOL HAS NO PRINTER NOW: "+jobs.length+" | slip on screen");
  const bill=async i=>{click("#ordBtn"); await wait(10); qa('#ordList [data-oa="bill"]')[i].click(); await wait(350);};
  jobs.length=0; await bill(0); log("16 BAR BILL, 2 COPIES: "+jobs.map(who).join()+" | "+note()); click("#rcClose"); await wait(10);
  jobs.length=0; await bill(1); log("17 RESTAURANT BILL: "+jobs.map(who).join()+" | "+note()); click("#rcClose"); await wait(10);
  jobs.length=0; await bill(2); log("18 POOL BILL BY HAND: "+jobs.length+" | slip "+!!q("#rc .slip")+" | note ["+note()+"]"); click("#rcClose"); await wait(10);
  window.__down=1; jobs.length=0; await bill(0); log("19 DOWN: "+note()+" | bad "+q("#rcPrinted").classList.contains("bad")); click("#rcClose"); await wait(10); window.__down=0;
  jobs.length=0; click("#ordBtn"); await wait(10); qa('#ordList [data-oa="pay"]')[0].click(); await wait(25); const pa=q('[data-pa="cash"]'); pa.value="5000"; pa.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(60); log("19B ASKS FIRST: nothing yet "+!jobs.length+" | "+q("#rcPrint").textContent); click("#rcPrint"); await wait(450); log("20 RECEIPT 58MM: "+jobs.map(who).join()+" | "+note()+" | width "+Math.max(...jobs[0].lines.filter(l=>/^-+$/.test(l.t)).map(l=>l.t.length))); click("#rcClose"); await wait(10);
  for(const [lb,d,it] of [["R2","Restaurant","Fish"],["R3","Pool","Burger"]]){ jobs.length=0; await add(it,d); await snd(lb); jobs.length=0; click("#ordBtn"); await wait(10); [...qa('#ordList .ord')].find(o=>o.querySelector(".h").textContent.startsWith(lb)).querySelector('[data-oa="pay"]').click(); await wait(25); const c=q('[data-pa="cash"]'); c.value="5000"; c.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(450); log("20a "+d+" RECEIPT: "+jobs.map(who).join()+" | "+note()); click("#rcClose"); await wait(10); }
  localStorage.setItem("kaytia_machine","OTHER"); jobs.length=0; await add("Tusker","Bar"); await snd("T8"); log("21 ANOTHER MACHINE: "+jobs.length); localStorage.setItem("kaytia_machine","TEST-PC");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "psu-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,1250", "--virtual-time-budget=40000"];
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

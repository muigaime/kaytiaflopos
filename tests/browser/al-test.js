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
  await add("Tusker","Bar",2); await send("T1"); await wait(300); click("#rcClose"); await wait(10); click("#ordBtn"); await wait(15); q('#ordList [data-oa="pay"]').click(); await wait(30); const pa=q('[data-pa="cash"]'); pa.value="5000"; pa.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); click("#rcClose"); await wait(10);
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="wrongpass"; await wait(700); click("#boGo"); await wait(900); q("#boP").value="admin123"; await wait(100); click("#boGo"); await wait(1400); const nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(100);};
  await nav("Products List"); const pr=q('[data-pr="1"]'); pr.value="222"; pr.dispatchEvent(new Event("change",{bubbles:true})); await wait(30);
  STK["Main Store"]=STK["Main Store"]||{}; mv("Main Store","a",5,"RECEIVE","Test delivery","","GRN-1","Boss"); mv("Bar","a",-1,"DAMAGE","Broken","","DMG","Boss"); BILLLOG.push({at:new Date().toISOString(),act:"Void",no:"00009",label:"T9",dept:"Bar",by:"Boss",user:"Jane Waiter",why:"Wrong order",detail:"Whole bill",amt:-500,points:["Bar"]});
  await nav("Audit log"); const rows=()=>qa("#alBody .al-row").length, sel=async(k,v)=>{const e=q('[data-al="'+k+'"]'); e.value=v; e.dispatchEvent(new Event("change",{bubbles:true})); await wait(40);}, nat=()=>[...new Set(qa("#alBody .al-row .pr-cat").map(x=>x.textContent))].join(", ");
  log("1 PAGE: "+q("#vSub h1").textContent+" | "+q("#vSub .hello p").textContent); log("2 FIGURES: "+qa("#alBody .sp-kpi").map(x=>x.textContent).join(" / ")+" | rows "+rows()); log("3 NATURES: "+nat()); log("4 COLUMNS: "+qa("#alBody .al-t th").map(x=>x.textContent).join(" | ")); log("5 DAY: "+q(".al-dayrow").textContent);
  const R=t=>{const r=qa("#alBody .al-row").find(x=>x.textContent.includes(t)); return r?[...r.cells].map(c=>c.textContent).join(" | "):"none";}; log("6 SALE: "+R("Bill 0000")); log("7 VOID: "+R("Wrong order")); log("8 FAILED: "+R("Wrong password")); log("9 PRICE: "+R("KES 200 to KES 222")); log("10 STOCK: "+R("Test delivery")); log("11 DAMAGE: "+R("Broken")); log("12 SHIFT: "+R("started a shift"));
  await sel("nature","Void"); log("13 NATURE: "+rows()+" | "+nat()); await sel("nature","All"); await sel("who","Jane Waiter"); log("14 USER: "+rows()+" | all Jane "+qa("#alBody .al-row").every(r=>r.cells[3].textContent==="Jane Waiter")); await sel("who","All"); await sel("mod","Inventory"); log("15 MODULE: "+nat()); await sel("mod","All");
  click('[data-a="al_pri"][data-k="Critical"]'); await wait(40); log("16 CRITICAL: "+nat()+" | pill "+qa(".pr-pill.on").map(x=>x.textContent).join()); click('[data-a="al_pri"][data-k="All"]'); await wait(40);
  const f=q("#alQ"); f.focus(); f.value="00009"; f.dispatchEvent(new Event("input",{bubbles:true})); await wait(20); log("17 REFERENCE: "+rows()+" | "+q("#alBody .al-text").textContent+" | focus kept "+(document.activeElement.id==="alQ")); f.value="zzzz"; f.dispatchEvent(new Event("input",{bubbles:true})); await wait(20); log("18 NOTHING: "+q("#alBody .empty").textContent); f.value=""; f.dispatchEvent(new Event("input",{bubbles:true})); await wait(20);
  let dl=[]; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){dl.push(this.download)}; click('[data-a="al_xlsx"]'); await wait(40); HTMLAnchorElement.prototype.click=oc; log("19 EXCEL: "+dl[0]+" | "+q("#toast").textContent); let pw=""; const oo=window.open; window.open=()=>({document:{write:s=>{pw=s},close(){}},focus(){},print(){}}); click('[data-a="al_print"]'); await wait(30); window.open=oo; log("20 PRINT: has title "+pw.includes("Audit log")+" | rows "+(pw.match(/<tr>/g)||[]).length);
  const old=new Date(Date.now()-3*864e5).toISOString(); BILLLOG.push({at:old,act:"Void",no:"00001",label:"T0",dept:"Bar",by:"Boss",user:"Boss",why:"Old one",detail:"",amt:0,points:["Bar"]}); await nav("Home"); await nav("Audit log"); log("21 TODAY HIDES OLD: "+R("Old one")); click('[data-a="al_range"][data-n="6"]'); await wait(50); log("22 LAST 7: "+(R("Old one")!=="none")+" | days "+qa(".al-dayrow").map(x=>x.textContent).join(" ; "));
  for(let i=0;i<450;i++) BILLLOG.push({at:new Date(Date.now()-i*1000).toISOString(),act:"Reprint",no:"R"+i,label:"T",dept:"Bar",by:"Boss",user:"Boss",why:"",detail:"",amt:0,points:["Bar"]}); click('[data-a="al_range"][data-n="0"]'); await wait(80); log("23 PAGES: rows "+rows()+" | "+q(".al-more button").textContent); click('[data-a="al_more"]'); await wait(40); log("24 MORE: rows "+rows());
  const d0=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.auditTrail; log("25 SAVED: "+d0.length+" entries | natures "+[...new Set(d0.map(x=>x.nature))].join(", ")+" | machine "+d0[0].pc);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "al-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=45000"];
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

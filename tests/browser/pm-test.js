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
  const old=(ymd,n)=>{const [y,m,d]=ymd.split("-").map(Number); const x=new Date(y,m-1,d-n); return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");};
  const it=ITEMS.find(i=>i.n==="Tusker"), cokeId=Math.max(...ITEMS.map(i=>i.id))+1; ITEMS.push({...it,id:cokeId,n:"Coke",p:80}); const coke=ITEMS.find(i=>i.id===cokeId); const tile=n=>qa("#grid .it").find(b=>b.textContent.includes(n)), D=bizDate();
  const keyS="1~pr:1"; FD_SETTINGS.promos=[{id:1,on:true,name:"Tusker deal",buy:it.id,n:2,free:it.id,m:1,from:D,to:D}]; drawGrid(); log("1 TILE TAG: "+tile("Tusker").textContent.replace(/\s+/g," "));
  tile("Tusker").click(); await wait(15); log("2 ONE BOUGHT: "+JSON.stringify(cart)); tile("Tusker").click(); await wait(15); log("3 TWO BOUGHT: "+JSON.stringify(cart)+" | total "+totals().g+" | free "+get(keyS).n+" "+get(keyS).p+" | plus on free "+!!q('#lines [data-p="'+keyS+'"]'));
  tile("Tusker").click(); await wait(10); tile("Tusker").click(); await wait(15); log("4 FOUR BOUGHT: "+JSON.stringify(cart)+" | total "+totals().g);
  q('#lines [data-m="1"]').click(); await wait(15); log("5 BACK TO THREE: "+JSON.stringify(cart));
  q('#lines [data-m="'+keyS+'"]').click(); await wait(15); log("6 GUEST DECLINES: "+JSON.stringify(cart)+" | skip "+JSON.stringify(promoSkip)); cart={}; drawCart(); log("7 CLEARED: "+JSON.stringify(cart)+" skip "+JSON.stringify(promoSkip));
  const s0=avail(it); await add("Tusker","Bar",2); await wait(10); log("8 CART: "+JSON.stringify(cart)); await send("T1"); await wait(300); click("#rcClose"); await wait(10); const bill=orders[0]; log("9 BILL: "+JSON.stringify(bill.lines)+" | total "+totals(bill.lines,bill).g+" | stock used "+(s0-avail(it)));
  click("#ordBtn"); await wait(15); q('#ordList [data-oa="add"]').click(); await wait(20); log("10 OPEN BILL NOTHING ADDED: "+JSON.stringify(cart)); tile("Tusker").click(); await wait(15); log("11 THIRD: "+JSON.stringify(cart)); tile("Tusker").click(); await wait(15); log("12 FOURTH COUNTS BILL: "+JSON.stringify(cart)); await send("x"); await wait(300); click("#rcClose"); await wait(10); log("13 BILL: "+JSON.stringify(orders[0].lines)+" | "+totals(orders[0].lines,orders[0]).g);
  FD_SETTINGS.promos[0].free=cokeId; FD_SETTINGS.promos[0].m=2; const k2=cokeId+"~pr:1"; cart={}; cur=null; drawCart(); await add("Tusker","Bar",2); await wait(15); log("14 FREE IS ANOTHER ITEM: "+JSON.stringify(cart)+" | "+get(k2).n+" | total "+totals().g); cart={}; drawCart();
  STK[itemLoc(coke)]=STK[itemLoc(coke)]; const realAvail=coke.r; coke.r={zz:1}; cart={}; await add("Tusker","Bar",2); await wait(15); log("15 FREE OUT OF STOCK: "+JSON.stringify(cart)+" | "+q("#lines .tr-adj").textContent); coke.r=realAvail; cart={}; drawCart();
  const pv=FD_SETTINGS.promos[0]; pv.from=old(D,-1); pv.to=old(D,-1); drawGrid(); log("16 FUTURE: tag "+!!tile("Tusker").querySelector(".pm-tag")); pv.from=old(D,1); pv.to=old(D,1); drawGrid(); log("17 ENDED: tag "+!!tile("Tusker").querySelector(".pm-tag")); await add("Tusker","Bar",2); await wait(10); log("18 NOT APPLIED: "+JSON.stringify(cart)); cart={}; drawCart(); pv.from=D; pv.to=D; pv.on=false; drawGrid(); log("19 OFF: tag "+!!tile("Tusker").querySelector(".pm-tag")); pv.on=true; pv.free=it.id; pv.m=1;
  click("#ordBtn"); await wait(15); q('#ordList [data-oa="pay"]').click(); await wait(30); const pa=q('[data-pa="cash"]'); pa.value="5000"; pa.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); log("20 SALE: "+JSON.stringify(SALES.at(-1).lines.map(l=>[l.n,l.q,l.p,l.was,l.promo]))+" | g "+SALES.at(-1).g); click("#rcClose"); await wait(10);
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>x.dataset.n==="Selling points").click(); await wait(80);
  click('[data-a="sp_view"][data-k="promo"]'); await wait(40); log("21 PANEL: "+qa("#vSub .pn h4").map(x=>x.textContent).filter(x=>x.includes("Promotions")).join()+" | "+(qa("#vSub table.t tr").find(r=>r.textContent.includes("Tusker deal"))||{}).textContent);
  click('[data-a="pm_new"]'); await wait(30); log("22 FORM: "+!!q("#pmEd")); click('[data-a="pm_save"]'); await wait(15); log("23 NO NAME: "+q("#toast").textContent); const sel=(k,v)=>{const e=q('#pmEd [data-pm="'+k+'"]'); e.value=v; e.dispatchEvent(new Event("change",{bubbles:true}));};
  q("#pmName").value="Weekend"; q("#pmN").value="3"; sel("same","other"); await wait(25); log("24 KEEPS TYPED: "+q("#pmName").value+" "+q("#pmN").value+" | other list "+!!q('#pmEd [data-pm="free"]')); sel("pt","Restaurant"); await wait(25); log("25 POINT'S PRODUCTS: "+[...q('#pmEd [data-pm="buy"]').options].every(o=>ITEMS.find(i=>i.id==o.value).d==="Restaurant")); q("#pmFrom").value="2026-12-02"; q("#pmTo").value="2026-12-01"; click('[data-a="pm_save"]'); await wait(15); log("26 BAD DATES: "+q("#toast").textContent); q("#pmTo").value="2026-12-03"; click('[data-a="pm_save"]'); await wait(25); const sv=FD_SETTINGS.promos.at(-1); log("27 SAVED: "+q("#toast").textContent+" | "+JSON.stringify(sv)+" | disk "+JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.promos.length+" | row "+(qa("#vSub table.t tr").find(r=>r.textContent.includes("Weekend"))||{}).textContent);
  click('[data-a="pm_tog"][data-id="'+sv.id+'"]'); await wait(25); log("28 TOGGLE: "+FD_SETTINGS.promos.at(-1).on); click('[data-a="pm_edit"][data-id="'+sv.id+'"]'); await wait(25); log("29 EDIT LOADS: "+q("#pmName").value+" | "+q('#pmEd [data-pm="pt"]').value+" | "+q('#pmEd [data-pm="same"]').value+" | "+q("#pmFrom").value); click('[data-a="pm_del"]'); await wait(25); log("30 DELETED: "+FD_SETTINGS.promos.length);
  click('[data-a="pm_rep"]'); await wait(70); log("31 REPORT: "+qa("#vSub table tr").map(r=>[...r.cells].map(c=>c.textContent).join(" | ")).slice(0,4).join(" || "));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "pm-"));
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

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
  const it=ITEMS.find(i=>i.n==="Tusker"), other=ITEMS.find(i=>i.d==="Bar"&&i.c!==it.c)||ITEMS.find(i=>i.d!=="Bar"), tile=n=>qa("#grid .it").find(b=>b.textContent.includes(n));
  const now=new Date(), pad=n=>String(n).padStart(2,"0"), clk=m=>{const d=new Date(now.getTime()+m*6e4); return pad(d.getHours())+":"+pad(d.getMinutes());}, all7=(f,t)=>Object.fromEntries([0,1,2,3,4,5,6].map(d=>[d,{f,t}]));
  log("0 PRICE: "+it.p+" "+it.c);
  FD_SETTINGS.happy=[{id:1,on:true,pt:"Bar",item:null,cat:it.c,type:"amount",v:50,days:all7(clk(-30),clk(30))}]; drawGrid(); log("1 CATEGORY TILE: "+tile("Tusker").textContent.replace(/\s+/g," ")+" | hl "+tile("Tusker").classList.contains("hhon")+" | price now "+happyPrice(it));
  tile("Tusker").click(); await wait(20); const k1=Object.keys(cart)[0]; log("2 CART: "+k1+" | "+get(k1).n+" "+get(k1).p+" | total "+totals().g);
  q('#lines [data-p]').click(); await wait(10); log("3 PLUS: "+JSON.stringify(cart));
  await send("T1"); await wait(300); click("#rcClose"); await wait(10); const bill=orders[0]; log("4 BILL LINES: "+JSON.stringify(bill.lines)+" | total "+totals(bill.lines,bill).g);
  FD_SETTINGS.happy[0].days=all7(clk(-60),clk(-30)); drawGrid(); log("5 TIME OVER: tile "+tile("Tusker").textContent.replace(/\s+/g," ")+" | hl "+tile("Tusker").classList.contains("hhon")+" | bill still "+totals(bill.lines,bill).g);
  click("#ordBtn"); await wait(15); q('#ordList [data-oa="add"]').click(); await wait(20); tile("Tusker").click(); await wait(20); log("6 ADD AFTER: "+JSON.stringify(cart)+" | price "+totals(cart,{}).g); await send("x"); await wait(300); click("#rcClose"); await wait(10); log("7 BILL NOW: "+JSON.stringify(orders[0].lines)+" | total "+totals(orders[0].lines,orders[0]).g);
  const st0=avail(it); FD_SETTINGS.happy[0].type="pct"; FD_SETTINGS.happy[0].v=10; FD_SETTINGS.happy[0].days=all7(clk(-30),clk(30)); FD_SETTINGS.happy.push({id:2,on:true,pt:"All",item:it.id,cat:"",type:"price",v:100,days:all7(clk(-30),clk(30))}); log("8 ITEM BEATS CATEGORY: "+happyPrice(it)+" | off rule: "+(FD_SETTINGS.happy[1].on=false,happyPrice(it))+" | all off: "+(FD_SETTINGS.happy[0].on=false,happyPrice(it))); FD_SETTINGS.happy[1].on=true; FD_SETTINGS.happy[0].on=true;
  FD_SETTINGS.happy[1].type="price"; FD_SETTINGS.happy[1].v=it.p+100; log("9 DEAL ABOVE NORMAL IGNORED BY ITEM RULE: "+happyPrice(it)); FD_SETTINGS.happy[1].v=100;
  const nt=new Date(2026,10,2,23,0), nt2=new Date(2026,10,3,0,30), nt3=new Date(2026,10,3,2,0), nt4=new Date(2026,10,3,12,0), R={days:{1:{f:"22:00",t:"01:00"}}}; log("10 OVERNIGHT MON 22-01: "+[nt,nt2,nt3,nt4].map(d=>happyOpen(R,d)).join(","));
  FD_SETTINGS.happy=[{id:1,on:true,pt:"Bar",item:null,cat:it.c,type:"amount",v:50,days:all7(clk(-60),clk(-30))}]; click("#ordBtn"); await wait(15); q('#ordList [data-oa="pay"]').click(); await wait(30); const pa=q('[data-pa="cash"]'); pa.value="5000"; pa.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); log("11 SALE LINES: "+JSON.stringify(SALES.at(-1).lines.map(l=>[l.n,l.q,l.p,l.was])) + " | g "+SALES.at(-1).g+" | stock used "+(st0-avail(it))); click("#rcClose"); await wait(10);
  const ps=q("#lock"); click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); const nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);};
  await nav("Selling points"); click('[data-a="sp_view"][data-k="hh"]'); await wait(40);  log("12 PANEL: "+qa("#vSub .pn h4").map(x=>x.textContent).filter(x=>x.includes("Happy")).join()+" | row "+(qa("#vSub table.t tr").find(r=>r.textContent.includes("Running")||r.textContent.includes("Waiting"))||{}).textContent);
  click('[data-a="hh_new"]'); await wait(30); log("13 FORM: "+!!q("#hhEd")); click('[data-a="hh_save"]'); await wait(20); log("14 EMPTY: "+q("#toast").textContent); const sel=(k,v)=>{const e=q('#hhEd [data-hh="'+k+'"]'); e.value=v; e.dispatchEvent(new Event("change",{bubbles:true}));};
  q("#hhV").value="90"; sel("pt","Bar"); await wait(25); log("15 KEEPS TYPED: "+q("#hhV").value); sel("kind","item"); await wait(25); const es=q('#hhEd [data-hh="item"]'); log("16 PRODUCTS ONLY BAR: "+[...es.options].every(o=>ITEMS.find(i=>i.id==o.value).d==="Bar")); sel("item",String(it.id)); await wait(25); log("17 HINT: "+q("#hhEd .itm-hint").textContent); q("#hhF1").value="16:00"; q("#hhT1").value="19:00"; click('[data-a="hh_copy"]'); await wait(25); log("18 COPY: "+q("#hhF5").value+"-"+q("#hhT0").value); click('[data-a="hh_save"]'); await wait(25); log("19 SAVED: "+q("#toast").textContent+" | "+JSON.stringify(FD_SETTINGS.happy.at(-1)).slice(0,110)+" | disk "+JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.happy.length);
  click('[data-a="hh_tog"][data-id="'+FD_SETTINGS.happy.at(-1).id+'"]'); await wait(25); log("20 TOGGLE: "+FD_SETTINGS.happy.at(-1).on); click('[data-a="hh_edit"][data-id="'+FD_SETTINGS.happy.at(-1).id+'"]'); await wait(25); log("21 EDIT LOADS: "+q("#hhV").value+" "+q("#hhF2").value+" kind "+q('#hhEd [data-hh="kind"]').value); click('[data-a="hh_del"]'); await wait(25); log("22 DELETED: "+FD_SETTINGS.happy.length+" | form "+!!q("#hhEd"));
  click('[data-a="hh_rep"]'); await wait(70); const hr=qa("#vSub table tr").map(r=>[...r.cells].map(c=>c.textContent).join(" | ")); log("23 REPORT: "+q(".rp-head h3").textContent+" || "+hr.slice(0,4).join(" || "));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "hh-"));
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

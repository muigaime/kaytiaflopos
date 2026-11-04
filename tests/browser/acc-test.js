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
  const toBO=async()=>{click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);}, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);}, toPOS=async p=>{click("#boMenu"); await wait(30); click('[data-go="pos"]'); await wait(80); await login(p); await wait(420); q("#shMgr").classList.remove("show");}, tst=()=>q("#toast").textContent, A=async s=>{click('[data-a="'+s+'"]'); await wait(30);}, tile=n=>qa("#grid .it").find(b=>b.textContent.includes(n)), mm=()=>q("#mMod").classList.contains("show"), acb=n=>qa("#modO .mod-o").find(b=>b.textContent.includes(n)), opts=()=>qa("#modO .mod-o").map(b=>b.textContent).join(), tab=async d=>{q('#spTabs [data-t="'+d+'"]').click(); await wait(15);}, cat=async c=>{const b=q('#cats [data-c="'+c+'"]'); if(b){b.click(); await wait(10);}}, open=async id=>{q('[data-a="acc_open"][data-id="'+id+'"]').click(); await wait(25);}, L=()=>qa("#lines .tr").map(r=>r.textContent.replace(/\s+/g," ")).join(" ; ");
  STK.Restaurant.ug=20; STK.Restaurant.ch=20; STK.Restaurant.mo=20; STK.Pool=STK.Pool||{}; STK.Pool.ka=20; ["ug","ch","mo","ka"].forEach(k=>ING[k]=k+" (pcs)"); ITEMS.push({id:901,n:"Ugali",d:"Restaurant",c:"Sides",p:100,t:"B",r:{ug:1}},{id:902,n:"Chips",d:"Restaurant",c:"Sides",p:200,t:"B",r:{ch:1}},{id:903,n:"Mokimo",d:"Restaurant",c:"Sides",p:150,t:"B",r:{mo:1}},{id:904,n:"Kachumbari",d:"Pool",c:"Sides",p:50,t:"B",r:{ka:1}},{id:905,n:"Rice Plain",d:"Restaurant",c:"Sides",p:80,t:"B",r:{ug:1}}); const F=ITEMS.find(i=>i.n==="Fish"), T=ITEMS.find(i=>i.n==="Tusker");
  await toBO(); await nav("Products List"); await open(T.id); log("1 DRINK: tick "+!!q("#accOn")+" | "+q("#accEd").textContent.includes("Only food items sell")); await A("acc_close");
  await open(F.id); log("2 MAIN HAS ONE TICK: "+q("#accEd .set-opt").textContent.slice(0,27)+" | checklist "+qa("#accEd [data-acid]").length); click("#accOn"); await wait(20); log("3 NONE MARKED: "+q("#accEd").textContent.includes("No item is marked")); await A("acc_save"); log("4 "+tst()+" | ask "+F.accAsk);
  const sell=async(id,v)=>{await open(id); q("#accSell").value=v; await A("acc_save");}; await sell(901,"both"); await sell(902,"both"); await sell(903,"acc"); await sell(904,"both"); log("5 MARKED: "+ITEMS.filter(i=>i.sell).map(i=>i.n+"="+i.sell).join());
  await open(F.id); log("6 SHOWS WHAT POS OFFERS: "+q("#accEd .itm-hint b").textContent); await A("acc_close"); log("7 CELL: "+q('[data-a="acc_open"][data-id="'+F.id+'"]').closest("td").textContent.trim());
  await toPOS("1111"); await tab("Restaurant"); await cat("Sides"); log("8 MENU: "+qa("#grid .it .nm").map(x=>x.textContent).join()+" (Mokimo hidden)"); tile("Ugali").click(); await wait(15); log("9 SOLD ALONE: "+L()+" | asks "+mm()); cart={}; drawCart();
  tile("Rice Plain").click(); await wait(15); log("10 UNMARKED ITEM, NO ASK: "+mm()); cart={}; drawCart();
  await cat("Mains"); tile("Fish").click(); await wait(20); log("11 ASKS ALL MARKED: "+q("#modS").textContent+" | "+opts()); acb("Ugali").click(); await wait(20); log("12 ATTACHED: "+L()+" | total "+totals().g+" | key "+Object.keys(cart).join());
  log("13 NO PLUS: "+!q('#lines [data-p="901~^~'+F.id+'"]'));
  q('#lines [data-p="'+F.id+'"]').click(); await wait(10); log("14 PLUS ON MAIN: "+JSON.stringify(cart)); q('#lines [data-m="'+F.id+'"]').click(); await wait(10); log("15 MAIN BACK TO 1: "+JSON.stringify(cart)); q('#lines [data-m="'+F.id+'"]').click(); await wait(10); log("16 MAIN GONE, SIDE GOES WITH IT: "+JSON.stringify(cart));
  nextQty=3; tile("Fish").click(); await wait(20); acb("Chips").click(); await wait(20); log("17 THREE: "+JSON.stringify(cart)); q('#lines [data-m="'+F.id+'"]').click(); await wait(10); log("18 MAIN 2, SIDE FOLLOWS: "+JSON.stringify(cart)); q('#lines [data-m="902~^~'+F.id+'"]').click(); await wait(10); log("19 SIDE ALONE DOWN: "+JSON.stringify(cart)); cart={}; drawCart();
  tile("Fish").click(); await wait(20); acb("Kachumbari").click(); await wait(20); log("20 FROM ANOTHER SALE POINT: "+L()); const s0=STK.Pool.ka; await send("T1"); await wait(350); log("21 ORDER: "+qa("#rc .sl-make div").map(d=>d.textContent).join(" ; ")+" | stock "+s0+" -> "+STK.Pool.ka); click("#rcClose"); await wait(10);
  click("#ordBtn"); await wait(10); q('#ordList [data-oa="pay"]').click(); await wait(25); const e=q('[data-pa="cash"]'); e.value="5000"; e.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); log("22 RECEIPT: "+q("#rc").innerText.includes("Kachumbari (with Fish)")+" | sales "+SALES.map(s=>s.dept+":"+s.g).join()+" | cash "+SALES.reduce((a,s)=>a+((s.mx||{}).cash||0),0)); click("#rcClose"); await wait(10);
  await toBO(); await nav("Reports"); qa("[data-r]").find(b=>b.textContent.includes("Bill Items")).click(); await wait(40); log("23 BILL ITEMS: "+[...q("#vSub table.t").rows].slice(1).map(r=>[...r.cells].map(c=>c.textContent).filter(Boolean).join(" ")).join(" ; "));
  qa("[data-r]").find(b=>b.textContent.includes("Periodic")).click(); await wait(50); log("24 PERIODIC: "+[...q("#vSub table.t").rows].slice(1,-1).map(r=>r.cells[1].textContent+" sale "+r.cells[6].textContent+" qty "+r.cells[7].textContent).join(" ; "));
  bosave(); const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("25 SAVED: "+sv.I.find(i=>i.id===F.id).accAsk+" | "+sv.I.find(i=>i.id===903).sell);
  F.accs=[901]; delete F.accAsk; log("26 EARLIER SETUP STILL ASKS: "+accAsks(F)); delete F.accs;
  await nav("Products List"); F.accAsk=true; await open(F.id); click("#accOn"); await wait(15); await A("acc_save"); log("27 UNTICKED: "+!F.accAsk);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "acc-"));
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

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
  const toBO=async()=>{click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);}, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);}, toPOS=async p=>{click("#boMenu"); await wait(30); click('[data-go="pos"]'); await wait(80); await login(p); await wait(420); q("#shMgr").classList.remove("show");}, tst=()=>q("#toast").textContent, A=async s=>{click('[data-a="'+s+'"]'); await wait(30);}, open=async id=>{q('[data-a="cv_open"][data-id="'+id+'"]').click(); await wait(25);}, tile=n=>qa("#grid .it").find(b=>b.textContent.includes(n)), tab=async d=>{q('#spTabs [data-t="'+d+'"]').click(); await wait(15);}, cat=async c=>{const b=q('#cats [data-c="'+c+'"]'); if(b){b.click(); await wait(10);}}, snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);};
  ING.amarula="Amarula 750ml (btl)"; const K="amarula"; LOCS.forEach(l=>STK[l].amarula=0); STK["Main Store"].amarula=10; STK.Bar.amarula=2; ITEMS.push({id:363,n:"Amarula Tot",d:"Bar",c:"Tots",p:300,t:"B",r:{}},{id:364,n:"Amarula Bottle",d:"Bar",c:"Tots",p:5000,t:"B",r:{amarula:1}}); const P=ITEMS.find(i=>i.id===363);
  await toBO(); await nav("Products List"); log("1 COLUMN: "+[...qa("#vSub table.t").pop().rows[0].cells].pop().textContent);
  await open(363); log("2 FORM: "+q("#cvEd h3").textContent+" | "+q("#cvEd .itm-h p").textContent+" | parent qty "+q("#cvPq").value+" | delete "+!!q('[data-a="cv_del"]')); q("#cvFrom").value=K; q("#cvFrom").dispatchEvent(new Event("change",{bubbles:true})); await wait(25); log("3 PICKED: units "+[...qa("#cvEd .cv-g input")][1].value+" | hint "+q("#cvEd .itm-hint").textContent.slice(0,70));
  await A("cv_save"); log("4 NO YIELD: "+tst()); q("#cvPq").value="0"; q("#cvY").value="25"; await A("cv_save"); log("5 BAD PARENT: "+tst()); q("#cvPq").value="1"; q("#cvY").dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("6 COST OF EACH SHOWS: "+q("#cvEach").value); await A("cv_save"); log("7 SAVED: "+tst()+" | r "+JSON.stringify(P.r)+" | conv "+JSON.stringify(FD_SETTINGS.stockConv)+" | cell "+q('[data-a="cv_open"][data-id="363"]').closest("td").textContent.trim());
  const T=Object.keys(P.r)[0]; log("8 NOT ISSUED: main store tots "+(STK["Main Store"][T]||0)+" | bar tots "+(STK.Bar[T]||0));
  await nav("Inventory"); click('[data-a="inv_tab"][data-t="issue"]'); await wait(40); log("9 ISSUE LIST HAS TOT: "+qa("#vSub select option").some(o=>o.value===T)+" | has bottle "+qa("#vSub select option").some(o=>o.value===K)); click('[data-a="inv_tab"][data-t="items"]'); await wait(40); log("10 ITEM LIST HAS TOT: "+q("#vSub").textContent.includes("Amarula Tot")); click('[data-a="inv_tab"][data-t="position"]'); await wait(40); log("11 STOCK POSITION SHOWS: "+q("#vSub").textContent.includes("Amarula Tot"));
  await toPOS("1111"); await tab("Bar"); await cat("Tots"); log("12 CAN SELL: "+avail(P)+" (2 bottles x 25)");
  await add("Amarula Tot","Bar"); await snd("T1"); log("13 FIRST TOT: bottles "+STK.Bar.amarula+" | tots "+STK.Bar[T]+" | moves "+MOV.filter(m=>m.t==="CONVERT").map(m=>m.k+" "+m.q).join()); log("14 CAN SELL NOW: "+avail(P));
  orders.splice(0); for(let i=0;i<24;i++) itemStockMove(P,1); log("15 AFTER 25 SOLD: bottles "+STK.Bar.amarula+" | tots "+STK.Bar[T]+" | can sell "+avail(P)); itemStockMove(P,1); log("16 NEXT SALE OPENS BOTTLE 2: bottles "+STK.Bar.amarula+" | tots "+STK.Bar[T]); itemStockMove(P,-1); log("17 RETURN PUTS TOT BACK: bottles "+STK.Bar.amarula+" | tots "+STK.Bar[T]);
  STK.Bar.amarula=3; STK.Bar[T]=2; const c3=MOV.length; itemStockMove(P,30); log("18 LARGE QTY 30 FROM 2 TOTS: bottles "+STK.Bar.amarula+" | tots "+STK.Bar[T]+" (2 bottles opened = 50, 52-30=22)");
  STK.Bar.amarula=1; STK.Bar[T]=0; await tab("Bar"); await cat("Tots"); log("19 BOTTLE PRODUCT SHARES: bottle can sell "+avail(ITEMS.find(i=>i.id===364))+" | tot can sell "+avail(P)); itemStockMove(ITEMS.find(i=>i.id===364),1); log("20 BOTTLE SOLD WHOLE: tot can sell "+avail(P)); STK.Bar.amarula=0; STK.Bar[T]=0; log("21 NOTHING LEFT: "+avail(P)); drawGrid(); log("22 TILE OFF: "+tile("Amarula Tot").disabled);
  STK.Bar.amarula=2; STK.Bar[T]=5; drawGrid(); bosave(); const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("23 SAVED: "+JSON.stringify(s.FS.stockConv)+" | bar "+s.K.Bar[T]);
  await toBO(); await nav("Reports"); log("24 COST: each "+((()=>{const c=q("#vSub table.t");return !!c})()));
  await nav("Products List"); await open(363); log("25 EDIT SHOWS: "+q("#cvY").value+" | "+q("#cvFrom").value+" | hint "+q("#cvEd .itm-hint").textContent.slice(0,60)); q("#cvY").value="23"; await A("cv_save"); log("26 YIELD NOW 23: "+FD_SETTINGS.stockConv[T].y+" | can sell "+avail(P)+" | tots kept "+STK.Bar[T]);
  await open(363); await A("cv_del"); log("27 DELETED: "+tst()+" | r "+JSON.stringify(P.r)+" | tots "+STK.Bar[T]+" | bottles "+STK.Bar.amarula.toFixed(3)+" | hidden from lists "+!pickKeys().includes(T));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "cv-"));
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

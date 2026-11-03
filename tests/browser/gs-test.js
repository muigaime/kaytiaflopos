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
  const jobs=[]; const realFetch=window.fetch; window.fetch=async(u,o)=>{ u=String(u); if(u.includes("/api/print/installed")) return {ok:true,json:async()=>({printers:["TEST"]})}; if(u.includes("/api/print/ticket")){ jobs.push(JSON.parse(o.body)); return {ok:true,json:async()=>({})}; } return realFetch(u,o); };
  const tst=()=>q("#toast").textContent, tab=async k=>{click('[data-a="hs_tab"][data-k="'+k+'"]'); await wait(40);};
  const toBO=async()=>{click("#lock"); await wait(25); posKioskOff(); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>x.dataset.n==="Settings").click(); await wait(60);};
  const toPOS=async p=>{click("#boMenu"); await wait(30); click('[data-go="pos"]'); await wait(80); posKioskOff(); await login(p); click('#spTabs [data-t="Bar"]'); await wait(10);};
  const logoFile=async(type="image/png")=>{const c=document.createElement("canvas"); c.width=800; c.height=400; const x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,800,400); x.fillStyle="#000"; x.fillRect(200,100,400,200); const b=await new Promise(r=>c.toBlob(r,type)); return new File([b],"logo.png",{type});};
  const upload=async(k,f)=>{const i=q('[data-setc="logo"][data-k="'+k+'"]'); const dt=new DataTransfer(); dt.items.add(f); i.files=dt.files; i.dispatchEvent(new Event("change",{bubbles:true})); await wait(250);};
  const addPay=async(pt,m,v,a)=>{for(const [k,val] of [["pt",pt],["m",m],["v",v],["a",a]]){const e=q('[data-iv="gp.'+k+'"]'); e.value=val; e.dispatchEvent(new Event("input",{bubbles:true}));} click('[data-a="hs_payadd"]'); await wait(30);};
  const snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, opts=o=>{FD_SETTINGS.opts={...(FD_SETTINGS.opts||{}),...o}; posOptsApply();}, billText=async()=>{click("#ordBtn"); await wait(10); q('#ordList [data-oa="bill"]').click(); await wait(300); const x=q("#rc").innerText; return x;}, off=async()=>{click("#rcClose"); await wait(10);}, has=(x,s)=>x.toLowerCase().includes(s.toLowerCase());
  await toBO();
  log("1 TABS: "+qa(".set-tabs button").map(b=>b.textContent).join(" | ")+" | opens on "+q(".set-tabs .on").textContent);
  const heads=()=>qa("#vSub .pn h4").map(h=>h.textContent).join(" / ");
  log("2 HOTEL: "+heads()); await tab("bills"); log("3 BILLS: "+heads()); await tab("pos"); log("4 POS: "+heads()); await tab("tax"); log("5 TAX: "+heads()+" | box "+!!q('[data-iv="hs.taxB"]')); await tab("printers"); log("6 PRINTERS: "+heads());
  await tab("hotel");
  await upload("receipt",new File(["not a picture"],"x.txt",{type:"text/plain"})); log("7 WRONG TYPE: "+tst());
  await upload("receipt",new File(["junk"],"x.png",{type:"image/png"})); log("8 BROKEN PICTURE: "+tst());
  await upload("receipt",await logoFile()); const lg=FD_SETTINGS.logos; const dims=await new Promise(r=>{const i=new Image(); i.onload=()=>r(i.width+"x"+i.height); i.src=lg.receipt;}); log("9 RECEIPT LOGO: "+tst()+" | "+dims+" | "+lg.receipt.length+" chars | raster "+lg.raster.w+"x"+lg.raster.h+" ok "+(atob(lg.raster.data).length===lg.raster.w*lg.raster.h));
  await upload("company",await logoFile()); log("10 COMPANY LOGO: "+tst()+" | crests with it "+qa(".hotelMark img").length+" of "+qa(".hotelMark").length);
  const fitBox=v=>q('[data-setc="fit"][value="'+v+'"]'); const r0=lg.raster.h; fitBox("cover").click(); await wait(150); log("11 FILL: "+lg.fit+" | rows "+r0+" -> "+lg.raster.h);
  fitBox("contain").click(); await wait(150);
  const sv=()=>JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("12 SAVED LOGOS: "+Object.keys(sv().FS.logos).join());
  await tab("bills");
  click('[data-a="hs_payadd"]'); await wait(10); log("13 EMPTY: "+tst());
  await addPay("*","M-PESA TILL","4565515","Noble Tide"); log("14 ALL: "+tst());
  await addPay("Bar","BANK","0123456789","KCB Mombasa"); await addPay("Restaurant","M-PESA PAYBILL","222111",""); await addPay("Bar","BANK","0123456789","x"); log("15 DUP: "+tst()+" | rows "+qa(".set-pm tr").length+" | form cleared ["+q('[data-iv="gp.m"]').value+"]");
  log("16 POINTS: "+[...q('[data-iv="gp.pt"]').options].map(o=>o.textContent).join());
  await tab("printers"); FD_SETTINGS.printRules=[{src:"TEST-PC",doc:"GUEST BILL",point:"Bar",kind:"win",printer:"TEST",copies:1,paper:"80mm"}]; bosave();
  await tab("pos"); const cb=q('[data-setc="opt"][data-k="chefMsg"]'); log("17 OPTIONS: "+qa('.set-opt').length+" | chef starts "+cb.checked); cb.click(); await wait(25); log("18 CHEF OFF: "+tst()+" | saved "+sv().FS.opts.chefMsg+" | button "+q("#kmBtn").style.display);
  await toPOS("1111");
  await add("Tusker","Bar"); await snd("T1"); const b1=await billText();
  log("19 BILL: logo "+!!q("#rc .sl-logo")+" crest "+!!q("#rc .sl-crest")+" | pay "+qa("#rc .sl-pm").map(p=>p.children[0].textContent+"="+p.children[1].textContent).join(",")+" | till box "+!!q("#rc .sl-till")+" | weight "+getComputedStyle(q("#rc .sl-pm b")).fontWeight);
  const J=jobs.at(-1); log("20 DIRECT: "+J.printer.name+" | logo "+J.lines.filter(l=>l.img).length+" | "+J.lines.filter(l=>/PAY BY|M-PESA|4565515|BANK|0123456789|Noble|KCB/.test(l.t)).map(l=>l.t+(l.bold?"*":"")+(l.big?"^":"")).join(" / ")); await off();
  await add("Fish","Restaurant"); await snd("T2"); click("#ordBtn"); await wait(10); qa('#ordList [data-oa="bill"]')[1].click(); await wait(250); log("21 RESTAURANT PAY: "+qa("#rc .sl-pm").map(p=>p.children[0].textContent).join(",")); await off();
  await add("Burger","Pool"); await snd("T3"); click("#ordBtn"); await wait(10); qa('#ordList [data-oa="bill"]')[2].click(); await wait(250); log("22 POOL, ALL ONLY: "+qa("#rc .sl-pm").map(p=>p.children[0].textContent).join(",")); await off();
  log("23 CHEF BUTTON HIDDEN: "+getComputedStyle(q("#kmBtn")).display);
  opts({showLogo:false}); await billText(); log("24 NO LOGO: logo "+!!q("#rc .sl-logo")+" crest "+!!q("#rc .sl-crest")); await off(); opts({showLogo:true});
  opts({ordNoBill:false}); let x=await billText(); log("25 NO ORDER NO: "+has(x,"order no")); await off(); opts({ordNoBill:true});
  opts({taxBill:false}); x=await billText(); log("26 NO TAX ON BILL: vat "+has(x,"vat")+" net "+has(x,"net")+" total "+has(x,"total")); await off(); opts({taxBill:true});
  opts({signBill:false}); await billText(); log("27 NO SIGN: "+!!q("#rc .sl-sign")); await off(); opts({signBill:true});
  USERS.find(u=>u.n==="Jane Waiter").footer="Asante sana"; x=await billText(); log("28 FOOTER ON: "+has(x,"asante")); await off(); opts({waiterFoot:false}); x=await billText(); log("29 FOOTER OFF: "+has(x,"asante")); await off(); opts({waiterFoot:true});
  log("30 STOP PRINTED: "+!!orders[0].printed+" | right "+can("addPrinted")); opts({stopPrinted:true}); const uu=user.perm; user.perm={...(user.perm||{}),addPrinted:false}; click("#ordBtn"); await wait(10); q('#ordList [data-oa="add"]').click(); await wait(20); log("31 ON, NO RIGHT, CART: "+(cur?cur.no:"none")+" | can "+can("addPrinted")); if(cur){resetSale();drawCart();} opts({stopPrinted:false}); click("#ordBtn"); await wait(10); q('#ordList [data-oa="add"]').click(); await wait(20); log("32 OFF: "+(cur?cur.no:"none")); resetSale(); drawCart(); opts({stopPrinted:true}); user.perm=uu;
  opts({mustSend:true}); await add("Tusker","Bar"); click("#printBtn"); await wait(30); log("33 MUST SEND: popup "+q("#mRc").classList.contains("show")+" | "+((qa("#fsn").pop()||{}).textContent||"")); opts({mustSend:false}); click("#printBtn"); await wait(30); log("34 ALLOWED: popup "+q("#mRc").classList.contains("show")); await off(); resetSale(); drawCart();
  opts({pricesOnOrders:true}); jobs.length=0; await add("Tusker","Bar",2); await send("T4"); await wait(300); log("35 PRICES: "+qa("#rc .sl-oprice").map(e=>e.textContent).join()); await off(); opts({pricesOnOrders:false}); await add("Tusker","Bar"); await send("T5"); await wait(300); log("36 NO PRICES: "+qa("#rc .sl-oprice").length); await off();
  opts({orderAndBill:true}); jobs.length=0; await add("Tusker","Bar"); await send("T6"); await wait(500); const six=orders.at(-1); log("37 BOTH: order slip "+!!q("#rc .sl-order")+" | bill "+has(q("#rc").innerText,"guest bill")+" | marked "+six.printed+" | sent "+jobs.map(j=>j.lines[0].t+":"+j.printer.name).join()+" | "+q("#rcPrinted").textContent); await off(); opts({orderAndBill:false});
  opts({autoLogout:true}); await add("Tusker","Bar"); await send("T7"); await wait(350); log("38 STILL IN WHILE SLIP SHOWS: "+!!user); await off(); await wait(30); log("39 SIGNED OUT: "+!user+" | login "+q("#login").style.display); opts({autoLogout:false}); posKioskOff(); await login("1111");
  opts({tips:false}); click("#ordBtn"); await wait(10); qa('#ordList [data-oa="pay"]')[0].click(); await wait(25); log("40 NO TIP COLUMN: "+qa(".pay-t thead th").filter(h=>getComputedStyle(h).display!=="none").map(h=>h.textContent).join()); const pa=q('[data-pa="cash"]'); pa.value="5000"; pa.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(300); const R=q("#rc"); log("41 PAID WITHOUT TIPS: "+SALES.at(-1).no+" tips "+JSON.stringify(SALES.at(-1).tips||null)+" | receipt logo "+!!R.querySelector(".sl-logo")+" | pay box "+!!R.querySelector(".sl-pay")); await off(); opts({tips:true});
  opts({taxRcpt:false,signRcpt:true}); click("#ordBtn"); await wait(10); qa('#ordList [data-oa="pay"]')[0].click(); await wait(25); const pb=q('[data-pa="cash"]'); pb.value="5000"; pb.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(300); x=q("#rc").innerText; log("42 RECEIPT NO TAX, SIGNED: vat "+has(x,"vat")+" | sign "+!!q("#rc .sl-sign")); await off(); opts({taxRcpt:true,signRcpt:false});
  log("43 STILL PERSISTS: "+!!JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.billPay);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "gs-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,1000", "--virtual-time-budget=45000"];
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

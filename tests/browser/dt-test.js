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
  const snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);}, sc=()=>q("#shMgr").classList.contains("show"), head=()=>(q("#shMgr h2")||{}).textContent, bad=()=>(q("#shMgr .status.bad")||{}).textContent||"", relog=async p=>{q("#shMgr").classList.remove("show"); click("#lock"); await wait(25); await login(p); await wait(420);}, tile=n=>qa("#grid .it").find(b=>b.textContent.includes(n)), tst=()=>q("#toast").textContent, S=()=>USERS.find(u=>u.n==="Solo Sam"), J=()=>USERS.find(u=>u.n==="Jane Waiter");
  const pad=n=>String(n).padStart(2,"0"), hAgo=h=>new Date(Date.now()-h*36e5).toISOString();
  S().role="Cashier"; const dt=FD_SETTINGS.dayTime; log("1 DEFAULT: "+JSON.stringify(dayTimes())+" | ends "+dayEndText(curDay())+" | over "+dayOver());
  const D=curDay(); const at=(y,m,d,h,mi)=>new Date(y,m,d,h,mi).toISOString(); const end=o=>{const e=dayEnds({openedAt:o}); return e.toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});};
  log("2 OPENED 07:00: "+end(at(2026,10,3,7,0))); log("3 OPENED 23:00: "+end(at(2026,10,3,23,0))); log("4 OPENED 05:00: "+end(at(2026,10,4,5,0))); log("5 OPENED 05:30, UNDER AN HOUR: "+end(at(2026,10,4,5,30)));
  FD_SETTINGS.dayTime={start:"08:00",end:"02:00"}; log("6 CHANGED 8 TO 2: "+end(at(2026,10,3,9,0))); FD_SETTINGS.dayTime=undefined;
  let bd0=bizDate(); await add("Tusker","Bar"); await snd("T1"); const bill=orders[0];
  D.openedAt=hAgo(30); D.date=ymdOf(new Date(Date.now()-2*864e5)); bd0=D.date; log("7 WINDOW GONE: over "+dayOver()+" | date unchanged "+(bizDate()===bd0));
  tile("Tusker").click(); await wait(25); log("8 WAITER CAN'T TAP: cart "+Object.keys(cart).length+" | screen "+sc()+" | "+head()+" | "+bad().slice(0,90)); click('#shMgr [data-sa="exit"]'); await wait(10);
  click("#newSale"); await wait(20); log("9 NEW SALE BLOCKED: screen "+sc()); click('#shMgr [data-sa="exit"]'); await wait(10);
  click("#ordBtn"); await wait(10); q('#ordList [data-oa="add"]').click(); await wait(20); log("10 ADD ITEMS BLOCKED: adding "+!!cur+" | screen "+sc()); click('#shMgr [data-sa="exit"]'); await wait(10);
  await relog("1111"); log("11 SIGNS IN LOCKED: screen "+sc()+" | "+head()+" | "+bad().slice(0,60)); click('#shMgr [data-sa="exit"]'); await wait(10);
  click("#ordBtn"); await wait(10); q('#ordList [data-oa="bill"]').click(); await wait(250); log("12 CAN STILL PRINT BILL: "+q("#mRc").classList.contains("show")); click("#rcClose"); await wait(10);
  openShifts().forEach(s=>shiftEnd(s,0,"t")); const e1=dayEnd("t"); log("13 DAY CAN'T END WITH BILLS: "+e1+" | open "+!!curDay());
  S().perm={...S().perm,newDay:true,clear:true}; const sdir=shiftStart(S().n,0,"t"); await relog("3333"); log("14 CASHIER CAN'T START: "+sdir.slice(0,45)+" | form "+!!q('[data-sa="sstart"]')+" | clear btn "+!!q('[data-sa="bills"]')+" | end btn "+!!q('[data-sa="dend"]')+" | "+(q("#shMgr .shc .stk")||{}).textContent.slice(0,80)+" | shift "+!!shiftOf(S().n));
  q("#shMgr").classList.remove("show"); tile("Tusker").click(); await wait(25); log("15A CASHIER CAN'T SELL: cart "+Object.keys(cart).length+" | screen "+sc()); click('[data-sa="bills"]'); await wait(30); log("15B CLEAR BTN OPENS LIST: screen "+sc()+" | bills "+qa('#ordList [data-oa="pay"]').length);
  q('#ordList [data-oa="pay"]').click(); await wait(30); log("16A CLEARING SHIFT: "+JSON.stringify({by:shiftOf(S().n)&&shiftOf(S().n).openedBy,fl:shiftOf(S().n)&&shiftOf(S().n).float})); shView="main"; shDraw(); log("16B NO END BUTTON WITH BILL: "+!q('[data-sa="closeday"]')); const pa=q('[data-pa="cash"]'); pa.value="5000"; pa.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); click("#rcClose"); await wait(10); log("16C CLEARED: bills "+orders.length+" | sale date "+(SALES.at(-1).bd===bd0)+" | shift cash "+shiftCalc(shiftOf(S().n)).cash);
  shiftOpen(); await wait(20); log("17A END BUTTON APPEARS: "+!!q('[data-sa="closeday"]')); q("#shAct").value="500"; click('[data-sa="closeday"]'); await wait(450); const bd1=bizDate(); log("17B ROLLED BY ITSELF: "+(bd1!==bd0)+" | "+bd0+" -> "+bd1+" | day open "+!!curDay()+" | over "+dayOver()+" | "+(q("#shMgr .shc .status")||{}).textContent.slice(0,60));
  const pr=q("#shPrint").textContent.replace(/\s+/g," "); log("17C PRINTED: "+pr.includes("END OF DAY SUMMARY")+" | "+pr.slice(pr.indexOf("SALES BY DEPARTMENT"),pr.indexOf("SHIFTS")).slice(0,200));
  click('[data-sa="next"]'); await wait(25); log("19A START FORM: "+!!q('[data-sa="sstart"]')); q("#shFloat").value="1000"; click('[data-sa="sstart"]'); await wait(25); log("19B SHIFT STARTED: "+shiftOf(S().n).float);
  log("19C BEFORE THE TIME: over "+dayOver()); shiftEnd(shiftOf(S().n),1000,"t"); const was=bizDate(); shiftOpen(); await wait(15); click('[data-sa="dend"]'); await wait(450); log("19D ENDED EARLY: "+was+" -> "+bizDate()+" | day open "+!!curDay()+" | new day ends "+dayEndText(curDay())); click('[data-sa="next"]'); await wait(15);
  const ahead=bizDate(), refuse=dayEnd("t"); shiftOpen(); await wait(15); const noEnd=!q('[data-sa="dend"]'); shiftStart(S().n,0,"t"); shDraw(); await wait(15); log("19G SECOND END REFUSED: "+refuse+" | date still "+(bizDate()===ahead)+" | day open "+!!curDay()+" | no End day "+noEnd+" | no Close shift and day "+!q('[data-sa="closeday"]')+" | Close shift still there "+!!q('[data-sa="close"]')); shClose(true); await wait(15); log("19H SHIFT KEPT: "+!!shiftOf(S().n)); shiftEnd(shiftOf(S().n),0,"t"); shDone=null;
  orders.length=0; const rep=daySalesHTML([{dept:"Bar",g:900,mx:{cash:500,mpesa:400},lines:[{n:"Tusker",q:2,p:250},{n:"Coke",q:1,p:500}]},{dept:"Bar",g:-250,mx:{cash:-250},ret:{},lines:[{n:"Tusker",q:-1,p:250}]},{dept:"Kitchen",g:600,mx:{room:600},lines:[{n:"Ugali",q:1,p:0},{n:"Beef",q:1,p:600}]}]); const tmp=document.createElement("div"); tmp.innerHTML=rep; log("19E REPORT: "+[...tmp.querySelectorAll("tr,.sec")].map(x=>x.textContent).join(" / "));
  const dated={openedAt:new Date(2026,10,3,23,0).toISOString(),date:"2026-11-04"}; log("19F DATED DAY ENDS: "+dayEndText(dated));
  shiftStart(J().n,0,"t"); await relog("1111"); tile("Tusker").click(); await wait(20); log("20 WAITER SELLS AGAIN: "+JSON.stringify(cart)+" | locked "+sc()); cart={}; drawCart();
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); const nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);}; await nav("Settings"); click('[data-a="hs_tab"][data-k="pos"]'); await wait(40); log("21 SETTINGS: "+q("#vSub .pn h4").textContent+" | "+q("#dayS").value+" to "+q("#dayE").value+" | "+q("#vSub .pn .stk").textContent.slice(-40)); q("#dayS").value="07:00"; q("#dayE").value="03:00"; click('[data-a="hs_daytime"]'); await wait(30); log("22 SAVED: "+tst()+" | "+JSON.stringify(FD_SETTINGS.dayTime)); bosave(); log("23 ON DISK: "+JSON.stringify(JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.dayTime));
  FD_SETTINGS.dayTime={start:"06:00",end:"06:00"}; curDay().openedAt=hAgo(30); curDay().date=ymdOf(new Date(Date.now()-2*864e5)); orders.push({no:"70",ord:1,label:"T1",dept:"Bar",waiter:J().n,lines:{1:1},rounds:1,at:new Date()}); await nav("Shifts & Day"); log("24 BO DAY LINE: "+q("#vSub .pn").textContent.replace(/\s+/g," ").slice(0,190)); await nav("Home"); log("25 HOME BAR: "+q("#dayBar").textContent.includes("still needs ending")+" | pending "+q("#dayBar").textContent.includes("1 bill"));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "dt-"));
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

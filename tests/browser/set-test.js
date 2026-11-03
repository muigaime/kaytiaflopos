// node slip-test.js <built.html> [out] [bill|receipt|order|settings|pdf]: guest bill, receipt, kitchen and bar orders from real POS actions.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const file = process.argv[2], out0 = null, shot = "settings";
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));window.__prints=0;window.print=()=>{__prints++;window.__cls=document.documentElement.className;window.__pg=(document.querySelector("#pgStyle")||{}).textContent;};
localStorage.setItem("kaytia_machine","TEST-PC");localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify({S:[],C:[],U:[{n:"Peter Mwangi",pin:"0000",d:["Restaurant","Pool Bar"],role:"Manager"}],
 I:[{id:1,n:"Mixed Tea Pot",d:"Restaurant",c:"Hot food",p:100,t:"B",r:{a:1}},{id:2,n:"Beef Sausage <Grilled>",d:"Restaurant",c:"Mains",p:50,t:"B",r:{a:1}},{id:3,n:"Tusker Lager",d:"Restaurant",c:"Drinks",p:350,t:"B",r:{a:1}},{id:4,n:"Cheese Platter",d:"Pool Bar",c:"Snacks",p:900,t:"B",r:{a:1}}],
 G:{a:"Stock"},X:{a:10},IU:{a:{code:"I1",name:"Stock",group:"F",uom:"pcs",buyUnit:"pcs",perBuy:1,buyPrice:10}},ST:["Main Store"],OL:["Restaurant","Pool Bar"],OI:{Restaurant:{type:"Restaurant",store:"Main Store"},"Pool Bar":{type:"Bar",store:"Main Store"}},K:{"Main Store":{},Restaurant:{a:500},"Pool Bar":{a:50}},MV:[],GN:[],VN:[],LP:[],
 FS:{name:"The Tide",meals:{BB:800,HB:1800,FB:2600},child:50,biz:{addr:"P.O. Box 123-80100, Mombasa",email:"stay@thetide.co.ke",phone:"0700 000 000",pin:"P051234567X",till:"4565515-NOBLE TIDE"}}}));</script>`;
const tail = `<script>(async()=>{const log=m=>__E.push(m),wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);if(!el)throw new Error("missing "+s);el.click();};
const tile=n=>qa("#grid .it").find(b=>b.textContent.includes(n)), rc=()=>q("#rc").innerText.replace(/\\s+/g," ").trim(), slips=()=>qa("#rc .slip").length;
const closeRc=async()=>{click("#rcClose"); await wait(20); if(q("#mRc").classList.contains("show")) q("#mRc").classList.remove("show");};
const add=async(n,t=1)=>{for(let i=0;i<t;i++){tile(n).click(); await wait(8);}};
const send=async l=>{click("#sendBtn"); await wait(25); if(q("#mSend").classList.contains("show")){q("#lbl").value=l; click("#sendGo"); await wait(35);}};
const SHOT=${JSON.stringify(shot || "")};
try{
  ${shot === "settings" ? `click('[data-go="bo"]'); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(800); click("#boGo"); await wait(1500); q('#nav .nv[data-n="Settings"]').click(); await wait(40);
const set=(iv,v)=>{const el=q('[data-iv="'+iv+'"]');el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));};
log("A SAMPLES: "+qa("#setPrev .slip").length+" | titles "+qa("#setPrev .sl-title,#setPrev .sl-ot").map(x=>x.textContent).join(", "));
set("hs.name","Noble Tide Resort"); set("vh.till","999-NEW"); set("vh.thanks","Asante sana"); await wait(10); log("B LIVE: "+q("#setPrev .sl-name").textContent+" | "+q("#setPrev .sl-till b").textContent+" | focus kept "+(document.activeElement.dataset.iv));
const before=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.biz.till; log("C NOT SAVED YET: "+before);
set("hs.name","  "); click('[data-a="hs_save"]'); await wait(20); log("D EMPTY NAME: "+q("#toast").textContent); set("hs.name","Noble Tide Resort");
click('[data-a="hs_save"]'); await wait(30); const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS; log("E SAVED: "+q("#toast").textContent+" | "+s.name+" | till "+s.biz.till+" | thanks "+s.biz.thanks+" | addr kept "+s.biz.addr+" | POS name "+q(".pos .hotelName").textContent+" | crest "+q("#login .crest").textContent);` : `
  click('[data-go="pos"]'); await wait(300); dayStart("t"); shiftStart("Peter Mwangi",0,"t");
  for (const k of ["0","0","0","0","E"]) { q('#kp [data-k="'+k+'"]').click(); await wait(20); } await wait(500); click("#chSP"); await wait(20); click('#spList [data-d="Restaurant"]'); await wait(50);
  await add("Mixed Tea Pot"); await add("Beef Sausage",2);
  q("#fGuest").value="Jane Doe"; q("#fCov").value="2"; q("#fRoom").value="204"; q("#fTable").value="T9";
  click("#printBtn"); await wait(30);
  log("1 BILL: "+rc());
  log("2 HTML SAFE: "+q("#rc").innerHTML.includes("&lt;Grilled&gt;")+" | scr hidden");
  if(SHOT==="bill") {posKioskOff(); return done();}
  click("#rcPrint"); await wait(10); log("3 PRINT: called "+__prints+" | html class during print ["+__cls+"] | "+__pg); dispatchEvent(new Event("afterprint")); log("3b AFTER: class ["+document.documentElement.className+"] style ["+q("#pgStyle").textContent+"]"); await closeRc();
  await add("Tusker Lager",2);
  await send("T9"); log("4 ORDER slips "+slips()+" | titles "+qa("#rc .sl-ot").map(x=>x.textContent).join(" + ")+" | hotel name on it "+rc().includes("The Tide")+" | price on it "+/100\\.00|KES/.test(rc())+" | "+rc());
  if(SHOT==="order"||SHOT==="pdforder") {posKioskOff(); if(SHOT==="pdforder")pr(); return done();}
  await closeRc(); log("5 FIELDS CLEARED: "+["fTable","fGuest","fCov","fRoom"].map(i=>"["+q("#"+i).value+"]").join(""));
  click("#settleBtn"); await wait(30); click('#ordList [data-oa="bill"]'); await wait(30); log("6 ORDER BILL: "+rc()); log("6b Charge button "+(q("#rcCharge").style.display!=="none")); await closeRc();
  const o=orders[0]; openPay([o]); await wait(25); q("#pAmt").value="2000"; click("#pOk"); await wait(40);
  log("7 RECEIPT: "+rc()); log("7b no stock note "+!/Stock used/.test(rc())+" | no old name "+!/MWANGAZA/i.test(q("#rc").innerHTML)+" | close "+q("#rcClose").textContent);
  if(SHOT==="receipt"||SHOT==="pdf") {posKioskOff(); if(SHOT==="pdf")pr(); return done();}
  await closeRc();
  await add("Tusker Lager"); openPay(null); await wait(25); q("#pAmt").value="500"; click("#pOk"); await wait(40); log("8 DIRECT RECEIPT: "+rc()); log("8b Stock used hidden "+!/Stock used/.test(rc())); await closeRc();
  click("#chSP"); await wait(20); click('#spList [data-d="Pool Bar"]'); await wait(50); await add("Cheese Platter"); await send("Pool 1"); log("9 BAR OUTLET: "+qa("#rc .sl-ot").map(x=>x.textContent).join(" + ")); await closeRc();
  await add("Cheese Platter"); await send("Pool 1"); log("10 ROUND 2: "+q("#rc .sl-round").textContent); await closeRc();
  const a=orders.find(x=>x.label==="Pool 1"),b={...a,no:"ORD-X",label:"Pool 2"}; orders.push(b); openPay([a,b]); await wait(25); q("#pAmt").value="9000"; click("#pOk"); await wait(40); log("11 BATCH: slips "+slips()+" | last "+qa("#rc .sl-ot").pop().textContent); await closeRc();
  q("#bo").classList.add("show"); click('#bo [data-a]'||""); `}
}catch(e){log("X "+e.message)}
done();
function pr(){document.documentElement.classList.add("prc");const st=document.createElement("style");st.textContent="@page{margin:0}";document.head.appendChild(st);}
function done(){document.documentElement.setAttribute("data-test",__E.join(" @@ "));}
})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail.replace(`q("#bo").classList.add("show"); click('#bo [data-a]'||""); `, "") + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "sl-"));
fs.writeFileSync(path.join(dir, "page.html"), html);
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", url = "file:///" + path.join(dir, "page.html").replace(/\\/g, "/");
const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "profile")}`, shot === "settings" ? "--window-size=1500,1100" : "--window-size=900,1000"];
if (out0 && (shot === "pdf"||shot==="pdforder")) { execFileSync(edge, [...args, "--virtual-time-budget=14000", "--no-pdf-header-footer", `--print-to-pdf=${out0}`, url], { timeout: 80000, stdio: "ignore" }); console.log("saved", out0); }
else if (out0) { execFileSync(edge, [...args, "--virtual-time-budget=12000", `--screenshot=${out0}`, url], { timeout: 80000, stdio: "ignore" }); console.log("saved", out0); }
else { const o = execFileSync(edge, [...args, "--virtual-time-budget=9000", "--dump-dom", url], { encoding: "utf8", maxBuffer: 64e6, timeout: 80000, stdio: ["ignore", "pipe", "ignore"] }); const m = o.match(/data-test="([^"]*)"/); console.log((m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "NO RESULT").split(" @@ ").join("\n")); }
try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}

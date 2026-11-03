// node bopt-test.js <built.html> [out.png] [wheel|disc|edit]: Bill options end to end with real POS actions.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const [file, outPng, shot] = process.argv.slice(2);
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));window.print=()=>{};window.__rpauto=setInterval(()=>{const m=document.getElementById("mRp"); if(m&&m.classList.contains("show")){document.getElementById("rpPin").value="0000"; document.getElementById("rpGo").click();}},2);
localStorage.setItem("kaytia_machine","TEST-PC");localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify({S:[],C:[],U:[{n:"Boss Manager",pin:"0000",d:["Bar","Restaurant"],role:"Manager"},{n:"Sue Super",pin:"2222",d:["Bar","Restaurant"],role:"Super Cashier"},{n:"Jane Waiter",pin:"1111",d:["Bar","Restaurant"],role:"Waiter"}],
 I:[{id:1,n:"Tusker",d:"Bar",c:"Beer",p:200,t:"B",r:{a:1}},{id:2,n:"Soda",d:"Bar",c:"Soft",p:100,t:"B",r:{b:1}},{id:3,n:"Fish",d:"Restaurant",c:"Mains",p:1000,t:"B",r:{c:1}}],
 G:{a:"A",b:"B",c:"C"},X:{a:10,b:10,c:10},IU:{},ST:["Main Store"],OL:["Bar","Restaurant"],OI:{Bar:{type:"Bar",store:"Main Store"},Restaurant:{type:"Restaurant",store:"Main Store"}},K:{"Main Store":{},Bar:{a:50,b:50},Restaurant:{c:50}},MV:[],GN:[],VN:[],LP:[],
 FS:{name:"The Tide",meals:{BB:800,HB:1800,FB:2600},child:50,priceLists:[{n:"Happy Hour",pct:-20}],currencies:[{c:"USD",rate:125}]}}));</script>`;
const tail = `<script>(async()=>{const log=m=>__E.push(m),wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);if(!el)throw new Error("missing "+s);el.click();};
const tile=n=>{const hit=()=>qa("#grid .it").find(b=>b.textContent.includes(n)); if(hit()) return hit(); for(const c of qa("#cats .cat").map(x=>x.dataset.c)){q('#cats [data-c="'+c+'"]').click(); if(hit()) return hit();}}, add=async(n,t=1)=>{for(let i=0;i<t;i++){tile(n).click(); await wait(6);}};
const send=async l=>{click("#sendBtn"); await wait(20); q("#lbl").value=l; click("#sendGo"); await wait(30); click("#rcClose"); await wait(15);};
const opt=async k=>{click("#billBtn"); await wait(15); click('[data-bo="'+k+'"]'); await wait(20);}, S=(k)=>STK[k[0]][k[1]];
const pin=async p=>{q("#bopPin").value=p; click('[data-bg="auth"]'); await wait(20);}, save=async()=>{click('[data-bg="save"]'); await wait(25);};
const msg=()=>(q("#bopMsg")||{}).textContent||"", note=()=>(qa("#fsn").pop()||{}).textContent||"", bill=n=>qa("#bopBody .bop-b").find(b=>b.textContent.includes(n));
const pick=async n=>{ if(bill(n)){bill(n).click(); await wait(20);} };
const open=()=>orders.map(o=>o.label+"="+totals(o.lines,o).g).join(", "), closeB=()=>q("#mBopt").classList.remove("show");
const login=async p=>{for (const k of p+"E") { q('#kp [data-k="'+k+'"]').click(); await wait(15); } await wait(450);};
try{
  click('[data-go="pos"]'); await wait(200); posKioskOff(); dayStart("t"); ["Boss Manager","Sue Super","Jane Waiter"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111"); q('#spTabs [data-t="Bar"]').click(); await wait(30); log("1 USER "+user.n+" | button "+q("#billBtn").textContent);
  ${shot === "wheel" ? 'await add("Tusker"); click("#billBtn"); await wait(30);' : shot === "disc" ? 'await add("Tusker",3); await opt("disc"); await pin("0000"); q("#bopVal").value="10"; q("#bopVal").dispatchEvent(new Event("input",{bubbles:true})); q("#bopWhy").value="Loyal guest"; await wait(10);' : shot === "main" ? 'await add("Tusker",2); await wait(20);' : `
  click("#billBtn"); await wait(15); log("2 WHEEL: "+qa(".bw-i span").map(s=>s.textContent).join(" / ")); click('[data-bo="disc"]'); await wait(20); log("3 NO BILL: "+note()); closeB();
  await add("Tusker",2); await add("Soda");
  await opt("disc"); log("4 ASKS PIN: "+!!q("#bopPin")); await pin("1111"); log("5 WAITER PIN: "+msg()+" | still asks "+!!q("#bopPin")); await pin("2222"); log("6 SUPER CASHIER OK: form "+!!q("#bopVal")+" | "+q("#bopBody .stk").textContent);
  await save(); q("#bopVal").value="10"; q("#bopVal").dispatchEvent(new Event("input",{bubbles:true})); await wait(5); log("7 SUM: "+q("#bopSum").textContent); await save(); log("8 NO REASON: "+msg());
  q("#bopVal").value="150"; await save(); log("9 OVER 100: "+msg()); q("#bopVal").value="10"; q("#bopWhy").value="Loyal guest"; await save();
  log("10 DRAFT DISCOUNT: "+note()+" | gross "+q("#tGross").textContent+" net "+q("#tNet").textContent+" vat "+q("#tTax").textContent+" | "+q(".tr-adj").textContent);
  click("#printBtn"); await wait(20); log("11 BILL SLIP: "+q("#rc .sl-tots").innerText.replace(/\\s+/g," ")); click("#rcClose"); await wait(10);
  await send("T1"); log("12 SENT keeps discount: "+open()+" | Bar stock a "+STK.Bar.a+" b "+STK.Bar.b+" | new sale gross "+q("#tGross").textContent);
  await add("Tusker"); await opt("disc"); log("13 WITH ITEMS AND BILLS asks pin"); await pin("0000"); log("14 CHOOSER: "+qa("#bopBody .bop-b").map(b=>b.innerText.replace(/\\s+/g," ")).join(" | ")); closeB();
  click("#cancelBtn"); await wait(5); click("#cancelBtn"); await wait(15);
  await add("Tusker"); await opt("disc"); await pin("0000"); bill("This sale").click(); await wait(15); q("#bopVal").value="5"; q("#bopWhy").value="x"; await save(); const n0=orders[0].lines[1]; click("#sendBtn"); await wait(20); q("#lbl").value="T1"; click("#sendGo"); await wait(25); log("14b SAME TABLE: "+note()+" | order qty unchanged "+(orders[0].lines[1]===n0)+" | cart kept "+q("#tGross").textContent); click("#cancelBtn"); await wait(5); click("#cancelBtn"); await wait(15);
  click("#ordBtn"); await wait(15); click('#ordList [data-oa="bill"]'); await wait(20); log("23 BILL: "+q("#rc .sl-t").innerText.replace(/\\s+/g," ")+" || "+q("#rc .sl-tots").innerText.replace(/\\s+/g," ")); click("#rcClose"); await wait(10);
  // split then merge
  await add("Tusker",3); await send("T2"); log("24 "+open());
  click("#newSale"); await wait(15); q("#fTable").value="T2 /2"; click("#sendBtn"); await wait(25); await opt("split"); await pin("0000"); log("25 SPLIT list "+qa("#trL .tr-b").length); q('[data-trs="'+orders.find(o=>o.label==="T2").no+'"]').click(); await wait(10); click('[data-trm="1"]'); await wait(10); log("25b no target: "+msg()); q('[data-trt="'+orders.find(o=>o.label==="T2 /2").no+'"]').click(); await wait(10); await save(); log("26 NOTHING MOVED: "+msg());
  for(let i=0;i<3;i++){click('[data-trm="1"]'); await wait(10);} q('[data-trb]').click(); await wait(10); await save(); log("29 SPLIT: "+note()+" | "+open()+" | Bar a "+STK.Bar.a);
  await opt("merge"); await pin("0000"); q('[data-trs="'+orders.find(o=>o.label==="T2 /2").no+'"]').click(); await wait(10); q('[data-trt="'+orders.find(o=>o.label==="T2").no+'"]').click(); await wait(10); click("[data-trw]"); await wait(10); await save(); log("31 MERGE: "+note()+" | "+open());
  await opt("merge"); await pin("0000"); q('[data-trs="'+orders.find(o=>o.label==="T1").no+'"]').click(); await wait(10); q('[data-trt="'+orders.find(o=>o.label==="T2").no+'"]').click(); await wait(10); click("[data-trw]"); await wait(10); await save(); log("32 DIFFERENT TERMS: "+msg()); closeB();
  // void, return to stock
  const a0=STK.Bar.a; await opt("void"); await pin("0000"); await pick("T2"); click("#bopVAll"); log("33 VOID: "+q("#bopVSum").textContent+" | back "+q("#bopBack").checked); await save(); log("34 NO REASON: "+msg()); q("#bopWhy").value="Wrong table"; await save(); log("35 VOIDED: "+note()+" | "+open()+" | Bar a "+a0+" -> "+STK.Bar.a);
  // manager skips PIN; receipt and sale
  click("#lock"); await wait(25); posKioskOff(); await login("0000"); q('#spTabs [data-t="Bar"]').click(); await wait(30);
  await opt("disc"); log("36 MANAGER NO PIN: "+!q("#bopPin")+" | "+q("#bopBody .stk").textContent); closeB();
  const o=orders[0]; openPay([o]); await wait(20); log("37 PAY: "+q("#pTotal").textContent+" | "+q("#pBills").textContent); q("#pAmt").value="1000"; click("#pOk"); await wait(35); bosave();
  log("38 RECEIPT: "+q("#rc .sl-t").innerText.replace(/\\s+/g," ")+" || "+q("#rc .sl-tots").innerText.replace(/\\s+/g," ")); click("#rcClose"); await wait(10);
  const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("39 SALE: g "+s.S[0].g+" disc "+s.S[0].disc+" pl "+s.S[0].pl+" line p "+s.S[0].lines[0].p+" | LOG: "+s.BL.map(x=>x.act+"["+x.by+"/"+x.user+"]").join(", "));
  // draft void, restaurant default, reports
  q('#spTabs [data-t="Restaurant"]').click(); await wait(30); await add("Fish"); await send("R1"); await opt("void"); if(q("#bopBody .bop-b")) await pick("R1"); log("40 RESTAURANT back default "+q("#bopBack").checked); closeB();
  await add("Fish"); await opt("void"); await pick("This sale"); log("41 DRAFT VOID back box "+!!q("#bopBack")); click("#bopVAll"); q("#bopWhy").value="Mistake"; await save(); log("42 "+note()+" | gross "+q("#tGross").textContent);
  q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); q('#nav .nv[data-n="Reports"]').click(); await wait(30);
  q('[data-r="blog"]').click(); await wait(30); log("43 REPORT rows "+(q("#vSub table.t").rows.length-1)+" | first "+[...q("#vSub table.t").rows[1].cells].map(c=>c.textContent).join(","));
  q('[data-r="dlog"]').click(); await wait(30); log("44 DISCOUNT REPORT: "+[...q("#vSub table.t").rows[1].cells].map(c=>c.textContent).join(","));
  q('#nav .nv[data-n="Waiter setup"]').click(); await wait(30); q('.ws-w[data-i="1"]').click(); await wait(20); log("45 ROLES: "+[...q('[data-wsr]').options].map(o=>o.textContent).join("/")+" selected "+q('[data-wsr]').value);`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "bo-"));
fs.writeFileSync(path.join(dir, "page.html"), html);
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", url = "file:///" + path.join(dir, "page.html").replace(/\\/g, "/");
const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "profile")}`, "--window-size=1440,900"];
if (outPng) { execFileSync(edge, [...args, "--virtual-time-budget=7000", `--screenshot=${outPng}`, url], { timeout: 80000, stdio: "ignore" }); console.log("saved", outPng); }
else { const o = execFileSync(edge, [...args, "--virtual-time-budget=30000", "--dump-dom", url], { encoding: "utf8", maxBuffer: 64e6, timeout: 80000, stdio: ["ignore", "pipe", "ignore"] }); const m = o.match(/data-test="([^"]*)"/); console.log((m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&gt;/g, ">") : "NO RESULT").split(" @@ ").join("\n")); }
try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}

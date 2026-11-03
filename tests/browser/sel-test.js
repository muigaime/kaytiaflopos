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
  await login("1111"); q('#spTabs [data-t="Bar"]').click(); await wait(30);
  await add("Tusker",2); await send("T1"); await add("Soda"); await send("T2"); await add("Tusker"); await send("T3");
  const row=n=>qa("#selList [data-row]").find(r=>r.textContent.includes(n)), sel=()=>qa("#selList .sr.on").map(r=>r.querySelector("b").textContent).join(",");
  click("#selBtn"); await wait(20); log("1 OPEN: rows "+qa("#selList [data-row]").length+" | button "+q("#selOpt").textContent+" off "+q("#selOpt").disabled);
  row("T1").querySelector(".sr-no").click(); await wait(15); log("2 TAP ROW highlights: "+sel()+" | tick "+row("T1").querySelector("input").checked+" | "+q("#selOpt").textContent+" off "+q("#selOpt").disabled+" | "+q("#selTot").textContent);
  row("T1").querySelector(".sr-no").click(); await wait(15); log("3 TAP AGAIN clears: ["+sel()+"]"); row("T1").querySelector("input").click(); await wait(15); log("4 TICK highlights: "+sel());
  ${shot === "sel" ? 'row("T2").querySelector(".sr-no").click(); await wait(20);' : shot === "wheel2" ? 'click("#selOpt"); await wait(25);' : `
  click('#selOne [data-oa="bill"]'); await wait(20); log("5 ROW BUTTON still works: "+q("#rc .sl-title").textContent+" | highlight kept "+sel()); click("#rcClose"); await wait(15); if(!q("#mSel").classList.contains("show")) click("#selBtn"); await wait(15); if(!sel()) row("T1").querySelector(".sr-no").click(); await wait(10);
  click("#selOpt"); await wait(20); log("6 WHEEL for: "+q(".bw-for").textContent+" | on top "+(document.elementFromPoint(innerWidth/2,innerHeight/2).closest("#mBopt")?true:false));
  click('[data-bo="disc"]'); await wait(20); await pin("0000"); log("7 NO CHOOSER, straight to: "+q("#bopBody .stk").textContent); q("#bopVal").value="10"; q("#bopWhy").value="VIP"; await save(); log("8 APPLIED: "+note()+" | "+open()+" | Select still open "+q("#mSel").classList.contains("show")+" | row "+row("T1").querySelector(".n").textContent+" | highlight "+sel());
  row("T2").querySelector(".sr-no").click(); await wait(15); click("#selOpt"); await wait(20); log("9 TWO: "+q(".bw-for").textContent); click('[data-bo="void"]'); await wait(20); await pin("0000"); log("10 CHOOSER only highlighted: "+qa("#bopBody .bop-b b:first-child").map(b=>b.textContent).join(",")); closeB();
  row("T1").querySelector(".sr-no").click(); await wait(15); row("T3").querySelector(".sr-no").click(); await wait(15); log("11 HIGHLIGHT "+sel()); click("#selOpt"); await wait(20); click('[data-bo="merge"]'); await wait(20); await pin("0000"); log("12 MERGE preset: "+q("#trL .tr-b.on").textContent.slice(0,5)+" into "+q("#trR .tr-h b").textContent); click("[data-trw]"); await wait(10); await save(); log("13 MERGED: "+note()+" | "+open()+" | rows "+qa("#selList [data-row]").length+" | "+q("#selOpt").textContent);
  row("T2").querySelector(".sr-no").click(); await wait(10); if(!sel()) row("T2").querySelector(".sr-no").click(); await wait(10); log("14 HIGHLIGHT "+sel()); click("#selOpt"); await wait(20); click('[data-bo="void"]'); await wait(20); await pin("0000"); click("#bopVAll"); q("#bopWhy").value="Mistake"; q("#bopBack").checked=true; await save(); log("15 VOID: "+note()+" | "+open()+" | rows "+qa("#selList [data-row]").length+" | button "+q("#selOpt").textContent+" off "+q("#selOpt").disabled);
  click('#mSel [data-close]'); await wait(15); await add("Tusker"); click("#billBtn"); await wait(15); log("16 MAIN BUTTON no caption: "+!q(".bw-for")); click('[data-bo="disc"]'); await wait(15); await pin("0000"); log("17 MAIN chooser includes this sale: "+!!bill("This sale"));`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "bs-"));
fs.writeFileSync(path.join(dir, "page.html"), html);
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", url = "file:///" + path.join(dir, "page.html").replace(/\\/g, "/");
const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "profile")}`, "--window-size=1440,900"];
if (outPng) { execFileSync(edge, [...args, "--virtual-time-budget=7000", `--screenshot=${outPng}`, url], { timeout: 80000, stdio: "ignore" }); console.log("saved", outPng); }
else { const o = execFileSync(edge, [...args, "--virtual-time-budget=30000", "--dump-dom", url], { encoding: "utf8", maxBuffer: 64e6, timeout: 80000, stdio: ["ignore", "pipe", "ignore"] }); const m = o.match(/data-test="([^"]*)"/); console.log((m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&gt;/g, ">") : "NO RESULT").split(" @@ ").join("\n")); }
try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}

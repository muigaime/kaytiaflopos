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
  click('[data-go="pos"]'); await wait(200); dayStart("t"); ["Boss Manager","Sue Super","Jane Waiter"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111"); q('#spTabs [data-t="Bar"]').click(); await wait(30);
  for(let i=0;i<11;i++){ await add(i%2?"Soda":"Tusker",1+(i%3)); await send("T"+(i+1)); }
  orders.reverse(); const row=n=>qa("#selList [data-row]").find(r=>r.dataset.row===n);
  click("#selBtn"); await wait(20); log("1 ORDER: "+qa("#selList .sr-no").map(x=>x.textContent).join(","));
  log("2 HEADER: "+[...q("#selList .sr.sh").children].map(x=>x.textContent.trim()).join("/")+" | row "+row("00002").innerText.replace(/\\s+/g," "));
  const a0=row("00002").querySelector(".n").getBoundingClientRect().right, h0=q("#selList .sr.sh .n").getBoundingClientRect().right; log("3 AMOUNT LINES UP: "+(Math.abs(a0-h0)<2));
  selSet=new Set(["00002"]); selRender(); click('#selOne [data-oa="view"]'); await wait(20);
  ${shot === "view" ? "" : shot === "list" ? 'click("#mView [data-close]"); await wait(15);' : `log("4 VIEW: "+q("#viewBody h3").textContent+" | "+qa(".view-meta div").map(d=>d.innerText.replace(/\\s+/g," ")).join("; ")+" || "+q(".view-lines").innerText.replace(/\\s+/g," ")+" || "+q(".view-tots").innerText.replace(/\\s+/g," ")+" | on top "+(!!document.elementFromPoint(innerWidth/2,innerHeight/2).closest("#mView"))+" | highlight kept "+qa("#selList .sr.on").length);
  click("#mView [data-close]"); await wait(15); log("5 CLOSE: view "+q("#mView").classList.contains("show")+" | select "+q("#mSel").classList.contains("show"));
  const o=orders.find(x=>x.no==="00002"); o.disc={type:"pct",v:10}; o.pl={n:"Happy Hour",pct:-20}; o.cur={c:"USD",rate:125}; o.guest="<Mary>"; selRender(); selSet=new Set(["00002"]); selRender(); click('#selOne [data-oa="view"]'); await wait(15); log("6 WITH TERMS: "+q(".view-lines").innerText.replace(/\\s+/g," ")+" || "+q(".view-tots").innerText.replace(/\\s+/g," ")+" | safe "+q("#viewBody").innerHTML.includes("&lt;Mary&gt;")); click("#mView [data-close]"); await wait(15);
  log("7 NEW BILL SORTS: "); click('#mSel [data-close]'); await wait(15); await add("Soda"); await send("T12"); click("#selBtn"); await wait(15); log("7b "+qa("#selList .sr-no").map(x=>x.textContent).slice(-2).join(","));
  row("00003").querySelector(".sr-no").click(); await wait(10); selSet=new Set(); selRender(); row("00003").querySelector(".sr-no").click(); await wait(10); log("8 HIGHLIGHT still works: "+qa("#selList .sr.on").map(r=>r.dataset.row).join(",")+" | "+q("#selOpt").textContent);`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vw-"));
fs.writeFileSync(path.join(dir, "page.html"), html);
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", url = "file:///" + path.join(dir, "page.html").replace(/\\/g, "/");
const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "profile")}`, "--window-size=1280,800"];
if (outPng) { execFileSync(edge, [...args, "--virtual-time-budget=7000", `--screenshot=${outPng}`, url], { timeout: 80000, stdio: "ignore" }); console.log("saved", outPng); }
else { const o = execFileSync(edge, [...args, "--virtual-time-budget=30000", "--dump-dom", url], { encoding: "utf8", maxBuffer: 64e6, timeout: 80000, stdio: ["ignore", "pipe", "ignore"] }); const m = o.match(/data-test="([^"]*)"/); console.log((m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&gt;/g, ">") : "NO RESULT").split(" @@ ").join("\n")); }
try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}

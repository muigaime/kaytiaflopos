// node keep-test.js <built.html>: real browser refreshes (location.reload) with open orders.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const file = process.argv[2];
const head = `<script>addEventListener("error",e=>sessionStorage.log=(sessionStorage.log||"")+"ERR "+e.message+" @@ ");window.print=()=>{};window.__rpauto=setInterval(()=>{const m=document.getElementById("mRp"); if(m&&m.classList.contains("show")){document.getElementById("rpPin").value="0000"; document.getElementById("rpGo").click();}},2);
localStorage.setItem("kaytia_machine","TEST-PC");if(!localStorage.getItem("kaytia_pos_bo_v1"))localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify({S:[],C:[],U:[{n:"Jane Waiter",pin:"1111",d:["Bar"],role:"Waiter"},{n:"Boss",pin:"0000",d:["Bar"],role:"Manager"}],
 I:[{id:1,n:"Tusker",d:"Bar",c:"Beer",p:200,t:"B",r:{a:1}},{id:2,n:"Soda",d:"Bar",c:"Soft",p:100,t:"B",r:{b:1}}],G:{a:"A",b:"B"},X:{a:10,b:10},IU:{},ST:["Main Store"],OL:["Bar"],OI:{Bar:{type:"Bar",store:"Main Store"}},K:{"Main Store":{},Bar:{a:50,b:50}},MV:[],GN:[],VN:[],LP:[],
 FS:{name:"The Tide",meals:{BB:800,HB:1800,FB:2600},child:50}}));</script>`;
const tail = `<script>(async()=>{const log=m=>sessionStorage.log=(sessionStorage.log||"")+m+" @@ ",wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);if(!el)throw new Error("missing "+s);el.click();};
const tile=n=>{const hit=()=>qa("#grid .it").find(b=>b.textContent.includes(n)); if(hit()) return hit(); for(const c of qa("#cats .cat").map(x=>x.dataset.c)){q('#cats [data-c="'+c+'"]').click(); if(hit()) return hit();}}, add=async(n,t=1)=>{for(let i=0;i<t;i++){tile(n).click(); await wait(6);}};
const send=async l=>{click("#sendBtn"); await wait(20); if(q("#mSend").classList.contains("show")){q("#lbl").value=l; click("#sendGo"); await wait(30);} click("#rcClose"); await wait(15);};
const inn=async()=>{click('[data-go="pos"]'); await wait(200); for (const k of "1111E") { q('#kp [data-k="'+k+'"]').click(); await wait(15); } await wait(500);};
const rows=()=>qa("#selList [data-row]").map(r=>r.querySelector("b").textContent+":"+r.querySelector(".n").textContent).join(", ");
const st=()=>"Bar a "+STK.Bar.a+" b "+STK.Bar.b;
const ph=+(sessionStorage.ph||1);
try{
  if(ph===1){ await inn(); if(!shiftOf("Jane Waiter")){dayStart("t"); shiftStart("Jane Waiter",0,"t");} await add("Tusker",2); q("#fTable").value="T1"; q("#fGuest").value="Mary"; q("#fRoom").value="204"; await send("T1"); await add("Soda"); await send("T2");
    click("#selBtn"); await wait(20); log("1 SENT: "+rows()+" | "+st()); sessionStorage.ph=2; location.reload(); return; }
  if(ph===2){ log("2 REFRESHED: orders "+orders.map(o=>o.no+"/"+o.label+"/"+o.guest+"/"+o.room+"/"+(o.at instanceof Date)).join(", ")+" | "+st()); await inn(); log("3 SHIFT kept "+!!shiftOf("Jane Waiter")+" | open orders button "+q("#ordBtn").textContent); click("#selBtn"); await wait(20); log("4 SELECT: "+rows());
    click('#mSel [data-close]'); await wait(10); await add("Tusker"); await send("T3"); log("5 NEW NUMBER: "+orders.map(o=>o.no).join(",")+" | "+st());
    click("#selBtn"); await wait(15); selSet=new Set([qa("#selList [data-row]")[1].dataset.row]); selRender(); click('#selOne [data-oa="add"]'); await wait(20); await add("Soda",2); await send("T2"); log("6 ADD ROUND: "+orders.map(o=>o.label+"x"+cnt(o.lines)+"r"+o.rounds).join(", ")+" | "+st());
    sessionStorage.ph=3; location.reload(); return; }
  if(ph===3){ await inn(); log("7 REFRESH 2: "+orders.map(o=>o.label+"x"+cnt(o.lines)+"r"+o.rounds).join(", ")+" | "+st());
    const o=orders.find(x=>x.label==="T1"); openPay([o]); await wait(20); q("#pAmt").value="400"; click("#pOk"); await wait(35); log("8 SETTLED T1: "+q("#rc .sl-meta").innerText.replace(/\\s+/g," ")+" | sales "+SALES.length+" | "+st()); click("#rcClose"); await wait(15);
    sessionStorage.ph=4; location.reload(); return; }
  if(ph===4){ log("9 REFRESH 3: orders "+orders.map(o=>o.label).join(",")+" | sales "+SALES.length+" | "+st()+" | T1 not back "+!orders.some(o=>o.label==="T1"));
    const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); s.OR[0].lines[99]=1; s.OR.push({no:"ORD-Z",label:"Gone",dept:"Bar",lines:{98:1},rounds:1,at:new Date().toISOString(),waiter:"x"}); localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify(s)); sessionStorage.ph=5; location.reload(); return; }
  if(ph===5){ await inn(); click("#selBtn"); await wait(20); log("10 DELETED PRODUCTS: "+orders.map(o=>o.label+":"+Object.keys(o.lines).join("+")).join(", ")+" | select "+rows()); }
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",sessionStorage.log||"");})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "kp-"));
fs.writeFileSync(path.join(dir, "page.html"), html);
const o = execFileSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", ["--headless", "--disable-gpu", "--no-first-run", `--user-data-dir=${path.join(dir, "profile")}`, "--window-size=1440,900", "--virtual-time-budget=30000", "--dump-dom", "file:///" + path.join(dir, "page.html").replace(/\\/g, "/")], { encoding: "utf8", maxBuffer: 64e6, timeout: 90000, stdio: ["ignore", "pipe", "ignore"] });
const m = o.match(/data-test="([^"]*)"/);
console.log((m && m[1] ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&") : "NO RESULT").split(" @@ ").join("\n"));
try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}

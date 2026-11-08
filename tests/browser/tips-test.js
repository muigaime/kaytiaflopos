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
  click('[data-go="pos"]'); await wait(200); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  window.__P=[]; window.open=()=>({document:{write(h){window.__P.push(h);},close(){}},focus(){},print(){}});
  const set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true}));}, relog=async p=>{click("#lock"); await wait(25); await login(p);}, snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, pay=async(cash,tips)=>{openPay([orders[0]]); await wait(20); set("#pAmt",cash); Object.entries(tips).forEach(([m,v])=>set('[data-pt="'+m+'"]',v)); click("#pOk"); await wait(35); click("#rcClose"); await wait(10);}, tbl=s=>[...s.rows].map(r=>[...r.cells].map(c=>c.textContent).join(",")).join("\\n   "), chg=async(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("change",{bubbles:true})); await wait(30);};
  await add("Tusker","Bar",2); await add("Fish","Restaurant"); await snd("T1"); await add("Fish","Restaurant",2); await snd("T2"); await add("Tusker","Bar"); await snd("T3");
  await pay("1400",{cash:"100",mpesa:"50"}); await pay("2000",{pdq:"200"}); await relog("3333"); await add("Tusker"); await snd("S1"); await relog("0000"); click("#ordBtn"); await wait(10); q("#mOrd").classList.remove("show"); const sam=orders.find(o=>o.label==="S1"); openPay([sam]); await wait(20); set("#pAmt","200"); set('[data-pt="cash"]',"30"); click("#pOk"); await wait(35); click("#rcClose"); await wait(10);
  const t1=orders.find(o=>o.label==="T3"); openPay([t1]); await wait(20); set("#pAmt","200"); click("#pOk"); await wait(35); click("#rcClose"); await wait(10);
  SALES.forEach((s,i)=>{const d=new Date(s.at); d.setHours([8,8,13,22,13,13][i]||9,15,0,0); s.at=d;}); log("0 SALES: "+SALES.map(s=>s.no+" "+s.dept+" "+s.at.getHours()+":15 tips "+JSON.stringify(s.tips||{})).join(" ; "));
  q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  qa("#nav .nv").find(x=>x.dataset.n==="Reports").click(); await wait(30); click('[data-a="rep_open"]'); await wait(40); log("1 LIST: "+qa("[data-r]").slice(0,4).map(b=>b.textContent).join(" / "));
  q('[data-r="tips"]').click(); await wait(30);
  ${outPng ? '' : `
  log("2 TIPS: "+q(".rp-cap").textContent+"\\n   "+tbl(q("#vSub .pn:last-child > .tw table.t, #vSub .pn:last-child table.t")));
  log("3 BY WAITER:\\n   "+tbl(q(".rp-below table")));
  await chg('[data-f="tw"]',"Solo Sam"); log("4 ONE WAITER: "+qa("#vSub .pn:last-child table.t")[0].rows.length+" rows | "+tbl(q(".rp-below table")).split("\\n")[1]); await chg('[data-f="tw"]',"All");
  q('[data-a="rep_print"]').click(); await wait(10); log("5 PRINT: "+window.__P.at(-1).includes("Tips by waiter")+" | title "+(window.__P.at(-1).match(/<h2>(.*?)<\\/h2>/)||[])[1]);
  q('[data-r="ts"]').click(); await wait(30); log("6 TIME DEFAULT: "+q(".rp-cap").textContent+" | meta "+q(".rp-meta").innerText.replace(/\\s+/g," ")+"\\n   "+tbl(qa("#vSub .pn:last-child table.t")[0])); log("7 HOURS:\\n   "+tbl(q(".rp-below table")));
  await chg('[data-f="tf"]',"12:00"); await chg('[data-f="tt"]',"14:00"); log("8 LUNCH ONLY:\\n   "+tbl(qa("#vSub .pn:last-child table.t")[0])+"\\n   HOURS "+tbl(q(".rp-below table")));
  await chg('[data-f="tf"]',"21:00"); await chg('[data-f="tt"]',"09:00"); log("9 OVERNIGHT 21 to 09:\\n   "+tbl(qa("#vSub .pn:last-child table.t")[0]));
  await chg('[data-f="tf"]',"03:00"); await chg('[data-f="tt"]',"04:00"); log("10 NOTHING: "+q("#vSub .empty").textContent);
  await chg('[data-f="tf"]',"00:00"); await chg('[data-f="tt"]',"23:59"); await chg('[data-f="rd"]',"Bar"); log("11 BAR: "+[...qa("#vSub .pn:last-child table.t")[0].rows].slice(1).map(r=>r.cells[1].textContent+" "+r.cells[5].textContent).join(";")); await chg('[data-f="rd"]',"All");
  q('[data-a="rep_print"]').click(); await wait(10); const A=window.__P.at(-1); log("12 PRINT TIME: From time "+A.includes("From time")+" | hours "+A.includes("Sales by hour")); const r8=q('[data-rsz="80"]'); r8.click(); r8.dispatchEvent(new Event("change",{bubbles:true})); q('[data-a="rep_print"]').click(); await wait(10); log("13 80MM: "+(window.__P.at(-1).match(/class="b"/g)||[]).length+" blocks");`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "tp-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,1150", "--virtual-time-budget=32000"];
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

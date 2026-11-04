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
  const pin=async()=>{if(q("#bopPin")){q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(20);}}, opt=async a=>{click("#billBtn"); await wait(10); click('[data-bo="'+a+'"]'); await wait(15);}, save=async()=>{click('[data-bg="save"]'); await wait(25);}, closeRc=async()=>{await wait(500); click("#rcClose"); await wait(10);}, pick=async n=>{const b=qa("#bopBody .bop-b").find(x=>x.textContent.includes(n)); if(b){b.click(); await wait(15);}};
  click("#billBtn"); await wait(20); log("1 DIAL: "+qa(".bw-i").map(b=>b.dataset.bo+":"+b.textContent).join(" / ")+" | title "+q(".bw-t").textContent);
  ${outPng ? '' : `
  q("#mBopt").classList.remove("show");
  await add("Tusker","Bar",3); await add("Fish","Restaurant",2); await add("Burger","Pool"); await send("T1"); await closeRc();
  await opt("disc"); await pin(); q("#bopVal").value="10"; q("#bopWhy").value="Loyal guest"; await save();
  await opt("void"); await pin(); qa("#bopVRows tr").find(r=>r.textContent.includes("Tusker")).click(); await wait(10); q("#bopVRows [data-vs][data-d='-1']").click(); await wait(10); q("#bopVRows [data-vs][data-d='-1']").click(); await wait(10); qa("#bopVRows tr").find(r=>r.textContent.includes("Fish")).click(); await wait(10); q("#bopVRows tr.on:last-child [data-vs]"); const fx=qa("#bopVRows tr.on").find(r=>r.textContent.includes("Fish")); fx.querySelector("[data-vs][data-d='-1']").click(); await wait(10); log("2 VOIDING: "+q("#bopVSum").innerText.replace(/\\s+/g," ")); q('.bv-r[data-vw="Wrong order"]').click(); await save(); await closeRc();
  click("#newSale"); await wait(15); q("#fTable").value="T1B"; click("#sendBtn"); await wait(25); await opt("split"); await pin(); q('[data-trs="'+orders.find(o=>o.label==="T1").no+'"]').click(); await wait(10); q('[data-trt="'+orders.find(o=>o.label==="T1B").no+'"]').click(); await wait(10); click('[data-trm="5"]'); await wait(10); await save();
  await add("Tusker","Bar"); await send("T9"); await closeRc(); await add("Fish","Restaurant"); await send("T8"); await closeRc();
  await opt("merge"); await pin(); q('[data-trs="'+orders.find(o=>o.label==="T9").no+'"]').click(); await wait(10); q('[data-trt="'+orders.find(o=>o.label==="T8").no+'"]').click(); await wait(10); click("[data-trw]"); await wait(10); await save();
  await opt("void"); await pin(); await pick("T1B"); click("#bopVAll"); await wait(10); q('.bv-r[data-vw="Item spoilt"]').click(); await save(); await closeRc();
  log("3 LOG: "+BILLLOG.map(x=>x.act).join(",")+" | bills "+orders.map(o=>o.label+" "+totals(o.lines,o).g).join(";"));
  q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  log("4 HOME CARD: "+(document.body.textContent.match(/\\d+ reports/)||["not on this page"])[0]);
  q('#nav .nv[data-n="Reports"]').click(); await wait(30); log("5 LIST: "+qa("[data-r]").map(b=>b.textContent).join(" / "));
  const rep=async k=>{q('[data-r="'+k+'"]').click(); await wait(30); const tb=q("#vSub table.t"); return q(".rp-head h3").textContent+" | "+q(".rp-cap").textContent+" || "+[...tb.rows].map(r=>[...r.cells].map(c=>c.textContent).join(",")).join("\\n   ");};
  log("7 "+await rep("vall")); log("8 "+await rep("dlog")); log("9 "+await rep("msp"));
  const rdS=q('[data-f="rd"]'); rdS.value="Pool"; rdS.dispatchEvent(new Event("change",{bubbles:true})); await wait(30);
  log("11 POOL ONLY "+await rep("vall")); log("12 POOL MSP "+await rep("msp"));
  q('[data-f="rd"]').value="All"; q('[data-f="rd"]').dispatchEvent(new Event("change",{bubbles:true})); await wait(30);
  const bl=await rep("blog"); log("13 BLOG rows "+(bl.split("\\n").length-1)); await rep("dlog"); log("14 SALES HEAD STILL: "+q(".rp-cap").textContent);
  q('#nav .nv[data-n="Settings"]').click(); await wait(30); log("15 SETTINGS: price list box "+!!q('[data-iv="hs.pl"]')+" | headings "+qa("#vSub h4").map(h=>h.textContent).join("/"));`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "or-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=16000"];
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

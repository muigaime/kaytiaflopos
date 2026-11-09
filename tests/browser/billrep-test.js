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
  const relog=async p=>{click("#lock"); await wait(25); await login(p);}, pay=async o=>{openPay(o); await wait(20); q("#pAmt").value="9000"; click("#pOk"); await wait(35); click("#rcClose"); await wait(10);};
  window.__P=[]; window.open=()=>({document:{write(h){window.__P.push(h);},close(){}},focus(){},print(){}});
  await add("Tusker","Bar",2); await add("Fish","Restaurant"); await send("T1"); await wait(500); click("#rcClose"); await wait(10); orders[0].guest="Mary W"; orders[0].room="101";
  await add("Fish","Restaurant"); await send("T2"); await wait(500); click("#rcClose"); await wait(10);
  await relog("0000"); await pay([orders[0]]); await pay([orders[0]]);
  await relog("3333"); await add("Tusker"); await pay(null);
  q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  q('#nav .nv[data-n="Reports"]').click(); await wait(30); q('[data-r="bills"]').click(); await wait(30);
  const rows=()=>qa("#vSub [data-bill]").filter(r=>!r.hidden).map(r=>[...r.cells].map(c=>c.textContent).join(",")).join("\\n   "), tot=()=>q(".bl-tot").innerText.replace(/\\s+/g," "), dbl=n=>{ q('[data-bill="'+n+'"]').click(); q('[data-a="bl_reprint"]').click(); }, hdr=()=>qa(".bl-t th").map(x=>x.textContent).join("/");
  log("1 GRID: "+hdr()+"\\n   "+rows()+"\\n   "+tot()+" | hint "+q(".bl-hint").textContent);
  ${outPng ? 'q("[data-bill]").click(); await wait(20);' : `
  const fi=q('[data-bc="Waiter Name"]'); fi.focus(); fi.value="sam"; fi.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); log("2 COLUMN FILTER: focus kept "+(document.activeElement===fi)+" | "+rows()+" | "+tot()); fi.value=""; fi.dispatchEvent(new Event("input",{bubbles:true})); await wait(15);
  const set=async(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("change",{bubbles:true})); await wait(30);};
  await set('[data-bf="cashier"]',"Solo Sam"); log("3 CASHIER: "+rows()+" | "+tot()); await set('[data-bf="cashier"]',"All");
  await set('[data-bf="pay"]',"mpesa"); log("4 PAYMODE mpesa: rows "+qa("#vSub [data-bill]").length+" | empty "+(q(".bl-t .empty")||{}).textContent); await set('[data-bf="pay"]',"cash");  log("4b cash rows "+qa("#vSub [data-bill]").length); await set('[data-bf="pay"]',"All");
  q('[data-bf="net"]').click(); q('[data-bf="net"]').dispatchEvent(new Event("change",{bubbles:true})); await wait(30); log("5 NET: "+hdr()+" | "+tot());
  q("[data-bill]").click(); log("6 SELECTED: "+qa("tr.on[data-bill]").length);
  const first=q("[data-bill]").dataset.bill; dbl(first); await wait(30);
  const mRc=getComputedStyle(q("#mRc")), bo=getComputedStyle(q("#bo")); log("7 REPRINT A4: open "+q("#mRc").classList.contains("show")+" z "+mRc.zIndex+">"+bo.zIndex+" | class "+q("#rc .slip").className+" | "+q("#rc").innerText.replace(/\\s+/g," ").slice(0,420));
  const d1=(q("#rc .slip").innerText.match(/Date \\/ time\\s*:?\\s*([^\\n]+)/)||[])[1], cu=(q("#rc").innerText.match(/CU serial: (\\S+)/)||[])[1]; click("#rcClose"); await wait(10); dbl(first); await wait(30); log("8 COPY 2: "+q(".sl-copy").textContent+" | same CU "+(q("#rc").innerText.includes(cu))+" "+cu+" | close label "+q("#rcClose").textContent); click("#rcClose"); await wait(10);
  q('[data-rsz="80"]').click(); q('[data-rsz="80"]').dispatchEvent(new Event("change",{bubbles:true})); await wait(10); dbl(first); await wait(30); log("9 THERMAL class "+q("#rc .slip").className); click("#rcClose"); await wait(10);
  await wait(10); log("10 LOG: "+BILLLOG.filter(x=>x.act==="Reprint").map(x=>x.no+" "+x.detail+" by "+x.by).join(" ; "));
  const P=qa("[data-r]").map(b=>b.dataset.r), res=[]; for(const size of ["a4","80"]){ for(const k of P){ const bb=q('[data-r="'+k+'"]'); if(bb) bb.click(); else { const se=q("[data-rpsel]"); se.value=k; se.dispatchEvent(new Event("change",{bubbles:true})); } await wait(15); const rad=q('[data-rsz="'+size+'"]'); rad.click(); rad.dispatchEvent(new Event("change",{bubbles:true})); const n=window.__P.length; const pb=q('[data-a="rep_print"]'); if(!pb) throw new Error("no print on "+k); pb.click(); await wait(5); res.push(k+"/"+size+":"+(window.__P.length>n?"doc":(q("#toast").textContent.includes("nothing")?"none":"?"))); } }
  log("11 EVERY REPORT: "+P.length+" reports | "+res.filter(x=>x.endsWith("?")).length+" failed | "+res.filter(x=>x.endsWith("none")).join(","));
  q('[data-r="bills"]').click(); await wait(20); let rr=q('[data-rsz="a4"]'); rr.click(); rr.dispatchEvent(new Event("change",{bubbles:true})); q('[data-a="rep_print"]').click(); await wait(5); const A=window.__P.at(-1); log("12 A4 DOC: landscape "+A.includes("A4 landscape")+" | title "+(A.match(/<h2>(.*?)<\\/h2>/)||[])[1]+" | rows "+(A.match(/<tr>/g)||[]).length+" | total row "+A.includes("st-tot"));
  rr=q('[data-rsz="80"]'); rr.click(); rr.dispatchEvent(new Event("change",{bubbles:true})); q('[data-a="rep_print"]').click(); await wait(5); const T=window.__P.at(-1); log("13 80MM DOC: page "+T.includes("80mm auto")+" | blocks "+(T.match(/class="b/g)||[]).length);
  q('#nav .nv[data-n="Room reports"]').click(); await wait(30); q('[data-rr="occ"]').click(); await wait(30); log("14 ROOMS print button "+!!q('[data-a="rep_print"][data-k="rooms"]')); const n0=window.__P.length; q('[data-a="rep_print"][data-k="rooms"]').click(); await wait(5); log("14b printed "+(window.__P.length>n0)+" | toast "+q("#toast").textContent);
  q('#nav .nv[data-n="Audit log"]').click(); await wait(30); log("15 AUDIT PAGE: "+q("#vSub").innerText.replace(/\\s+/g," ").slice(0,100));`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "br-"));
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

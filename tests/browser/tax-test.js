// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__rpauto=setInterval(()=>{const m=document.getElementById("mRp"); if(m&&m.classList.contains("show")){document.getElementById("rpPin").value="0000"; document.getElementById("rpGo").click();}},2);
localStorage.setItem("kaytia_machine","TEST-PC");localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify({S:[],C:[],U:[{n:"Jane Waiter",pin:"1111",d:["Bar","Restaurant","Pool"],role:"Waiter"},{n:"Solo Sam",pin:"3333",d:["Bar"],role:"Waiter"},{n:"Boss",pin:"0000",d:["Bar","Restaurant","Pool"],role:"Manager"}],
 I:[{id:1,n:"Tusker",d:"Bar",c:"Beer",p:200,t:"B",r:{a:1}},{id:2,n:"Fish",d:"Restaurant",c:"Mains",p:1000,t:"B",r:{c:1}},{id:3,n:"Dawa",d:"Restaurant",c:"Drinks",p:500,t:"C",r:{d:1}},{id:4,n:"Tusker",d:"Pool",c:"Beer",p:250,t:"B",r:{a:1}},{id:5,n:"Burger",d:"Pool",c:"Mains",p:800,t:"B",r:{c:1}}],
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
  const tst=()=>q("#toast").textContent, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(30);}, tbl=s=>[...s.rows].map(r=>[...r.cells].map(c=>c.textContent).join(",")).join("\\n   "), snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, inp=(k,v)=>{const e=q('[data-iv="'+k+'"]'); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true}));}, pay=async o=>{openPay(o); await wait(20); q("#pAmt").value="9000"; click("#pOk"); await wait(35); const t=q("#rc").innerText.replace(/\\s+/g," "); click("#rcClose"); await wait(10); return t;};
  log("0 DEFAULT: "+JSON.stringify(TAX)+" | saved fixture items "+ITEMS.map(i=>i.n+":"+i.t).join(","));
  await add("Tusker","Bar"); await snd("OLD"); const r0=await pay([orders[0]]); log("1 OLD RATE RECEIPT: "+r0.match(/Net [\\d,.]+ \\w+ [\\d,.]+/)[0]);
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  await nav("Settings"); click('[data-a="hs_tab"][data-k="tax"]'); await wait(30); log("2 SETTINGS: "+q('[data-iv="hs.taxB"]').value+"/"+q('[data-iv="hs.taxC"]').value); inp("hs.taxC","abc"); click('[data-a="hs_tax"]'); await wait(15); log("3 BAD RATE: "+tst()); inp("hs.taxC","2"); click('[data-a="hs_tax"]'); await wait(25); log("4 SAVED: "+tst()+" | "+JSON.stringify(TAX));
  await nav("Products List"); click('[data-a="prl_add"]'); await wait(30); log("5 PRODUCT CHOICES: "+[...q('[data-prf="t"]').options].map(o=>o.value+"="+o.textContent).join(" / ")); click('[data-a="prl_close"]'); await wait(20);
  const mkp=async(n,c,p,tx)=>{click('[data-a="prl_add"]'); await wait(30); q('[data-prp="Bar"]').checked=true; q('[data-prf="n"]').value=n; q('[data-prf="c"]').value=c; q('[data-prf="p"]').value=p; q('[data-prf="t"]').value=tx; q('[data-prf="q"]').value="1"; click('[data-a="prl_save"]'); await wait(25);}; await mkp("Both","Beer","1180","BC"); await mkp("OnlyC","Beer","1020","C"); await mkp("Free","Beer","500","A"); log("6 ITEMS: "+ITEMS.slice(-3).map(i=>i.n+":"+i.t+" r "+JSON.stringify(i.r)).join(" ; "));
  await nav("Selling points"); click('[data-a="sp_open"]'); await wait(30); if(q('[data-a="sp_padd"]')) click('[data-a="sp_padd"]'); await wait(30); const tx=qa('[data-iv="spp.tax"] option').map(o=>o.textContent); log("7 SELLING POINT FORM: "+tx.join(" / ")+" | label "+((qa("label").find(l=>l.querySelector('[data-iv="spp.tax"]'))||{}).firstChild||{}).textContent); click('[data-a="sp_close"]'); await wait(15);
  ${outPng ? '' : `
  click("#boMenu"); await wait(30); click('[data-go="pos"]'); await wait(80); await login("1111");
  const tile=n=>{const hit=()=>qa("#grid .it").find(b=>b.querySelector(".nm").textContent===n); return hit();}; click('#spTabs [data-t="Bar"]'); await wait(15);
  ITEMS.slice(-3).forEach(i=>{i.r={a:1}; }); drawGrid(); await wait(10); log("8 LABEL ON CHECK: "+q("#vatL").textContent);
  for(const n of ["Both","OnlyC","Free"]){ tile(n).click(); await wait(8);} log("9 TOTALS: net "+q("#tNet").textContent+" | tax "+q("#tTax").textContent+" | gross "+q("#tGross").textContent); await snd("NEW"); const r1=await pay([orders[0]]); log("10 RECEIPT: "+r1.match(/Net [\\d,.]+ \\w+ [\\d,.]+/)[0]);
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); await nav("Reports"); q('[data-r="ps"]').click(); await wait(30);
  log("11 REPORT:\\n   "+tbl(q("#vSub table.t"))); log("12 SUMMARY:\\n   "+tbl(q(".rp-below table")));
  await nav("Settings"); click('[data-a="hs_tab"][data-k="tax"]'); await wait(30); inp("hs.taxB","10"); click('[data-a="hs_tax"]'); await wait(25); await nav("Reports"); log("13 RATE CHANGED, OLD REPORT SAME: "+[...q("#vSub table.t").rows].slice(1).map(r=>r.cells[1].textContent+" B "+r.cells[9].textContent+" C "+r.cells[10].textContent).join(" ; "));
  bosave(); const S=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("14 SAVED: "+JSON.stringify(S.FS.tax)+" | sale rates "+S.S.map(s=>JSON.stringify(s.rates)).join(" "));`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "tx-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=32000"];
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

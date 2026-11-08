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
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);}, tab=async t=>{click('[data-a="inv_tab"][data-t="'+t+'"]'); await wait(50);}, tst=()=>q("#toast").textContent, iv=(k,v)=>{const e=q('[data-iv="'+k+'"]'); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));}, A=async s=>{click('[data-a="'+s+'"]'); await wait(50);};
  const mk=async(name,tax)=>{await A("inv_itnew"); iv("it.name",name); iv("it.uom","pcs"); iv("it.buyPrice","100"); if(tax) iv("it.tax",tax); await A("inv_itsave");};
  await nav("Inventory"); await tab("items"); await A("inv_itnew"); const sel=q('[data-iv="it.tax"]'); log("1 FORM: "+[...sel.options].map(o=>o.text).join(" / ")+" | starts "+sel.value); await A("inv_itcancel");
  await mk("Item Vat",""); log("2 DEFAULT VAT: "+tst()+" | "+q("#vSub table.t").rows[0].textContent.includes("VAT / tax"));
  await mk("Item None","A"); await mk("Item Cee","C"); await mk("Item Both","BC");
  const row=n=>[...q("#vSub table.t").rows].find(r=>r.textContent.includes(n)); const col=[...q("#vSub table.t").rows[0].cells].findIndex(c=>c.textContent==="VAT / tax");
  log("3 LIST: "+["Item Vat","Item None","Item Cee","Item Both"].map(n=>n+"="+row(n).cells[col].textContent).join(" ; "));
  log("4 OLD ITEM IS VAT: "+row("Tusker").cells[col].textContent);
  row("Item None").querySelector('[data-a="inv_itedit"]').click(); await wait(50); log("5 EDIT SHOWS: "+q('[data-iv="it.tax"]').value); iv("it.tax","B"); await A("inv_itsave"); log("6 CHANGED: "+row("Item None").cells[col].textContent); row("Item None").querySelector('[data-a="inv_itedit"]').click(); await wait(50); iv("it.tax","A"); await A("inv_itsave");
  bosave(); const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("7 SAVED: "+Object.values(s.IU).filter(u=>/^Item /.test(u.name)).map(u=>u.name+":"+u.tax).join());
  await nav("Purchasing"); const rb=q('[data-a="pur_tab"][data-t="receive"]'); rb.click(); await wait(50); const typed=async n=>{const e=q("#rcName"); e.value=n; iv("rc.eName",n); await wait(40); return q('[data-iv="rc.eTax"]').value;};
  log("8 RECEIVE RATE: vat "+await typed("Item Vat")+" | none "+await typed("Item None")+" | both "+await typed("Item Both"));
  const r0=await typed("Item None"); iv("rc.eQty","2"); iv("rc.ePrice","100"); const add=qa("#vSub button").find(b=>/^Add/i.test(b.textContent.trim())); add&&add.click(); await wait(50); log("9 ADDED LINE: "+(q(".grn-t,#vSub table")?qa("#vSub table tr").filter(r=>r.textContent.includes("Item None")).map(r=>r.textContent.replace(/\s+/g," ").slice(0,90)).join():"")+" | "+(tst()));
  await nav("Selling points"); log("10 PAGE: "+q("#vSub h1").textContent);
  FD_SETTINGS.tax={B:16,C:2}; taxApply(); await nav("Inventory"); await tab("items"); log("11 RATE CHANGE SHOWS: "+row("Item Cee").cells[col].textContent+" | "+row("Item Both").cells[col].textContent);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "it-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=40000"];
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

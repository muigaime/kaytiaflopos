// node usestock-test.js <built.html>: imported products can be kept in stock, at import or afterwards.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__ocr={lines:[]};(()=>{const f0=window.fetch;window.fetch=(u,o)=>String(u).includes("/lan/ocr")?Promise.resolve(new Response(JSON.stringify({lines:window.__ocr.lines}),{status:200})):f0(u,o);})();
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, tst=()=>(q("#toast")||{}).textContent||"", byN=(n,d)=>ITEMS.find(i=>i.n===n&&(!d||i.d===d));
  const waitFor=async c=>{ for(let i=0;i<30000&&!c();i++) await wait(5); };
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async()=>{ qa("#nav .nv").find(x=>x.dataset.n==="Products List").click(); await wait(100); };
  const pick=(id,file)=>{ const e=q(id); const dt=new DataTransfer(); dt.items.add(file); e.files=dt.files; e.dispatchEvent(new Event("change",{bubbles:true})); };
  await nav(); click('[data-a="prl_imp"]'); await wait(40);
  const sheet=XLSX.build({company:"X",title:"T",by:"b",sections:[{c:["Product name","Selling point","Category","#Selling price","#Buying price","Tax","Stock item"],r:[["Guinness","Bar","Beer",350,180,"VAT",""],["Guinness","Pool","Beer",380,180,"VAT",""],["Pilau","Restaurant","Food",600,"","VAT",""],["Linked","Bar","Beer",400,"","VAT","A"]]}]});
  pick("#priX",new File([sheet],"p.xlsx")); await waitFor(()=>!!q("#prImp .pri-t"));
  must(qa("#prImp .pri-t th").some(h=>h.textContent==="Use in stock")&&qa("#prImp .pri-ins input").length===4,"each product row has a Use in stock tick");
  must(qa("#prImp .pri-ins input").every(x=>x.checked),"it's on by default");
  must(q('#prImp [data-pri="3.ins"]').disabled,"a row linked to a stock item in the file can't be changed");
  must(/Untick dishes made to order/.test(q("#prImp").textContent),"the screen says what it does");
  const box=q('#prImp [data-pri="2.ins"]'); box.checked=false; box.dispatchEvent(new Event("change",{bubbles:true})); await wait(30);
  click('[data-a="prl_impgo"]'); await wait(80);
  must(/4 products imported/.test(tst())&&/2 products now in stock/.test(tst()),"the import says how many went into stock: "+tst());
  const gb=byN("Guinness","Bar"), gp=byN("Guinness","Pool"), k=Object.keys(gb.r)[0];
  must(!!k&&Object.keys(gp.r)[0]===k,"Guinness at the Bar and the Pool share one stock item");
  const SV=()=>JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")), U=SV().IU[k]; must(U&&U.name==="Guinness"&&U.uom==="pcs"&&U.buyPrice===180&&!!U.code,"the stock item has the product's name, buying price and its own code: "+JSON.stringify(U));
  must(STORES.every(l=>STK[l]&&STK[l][k]===0),"it is in every store, at zero");
  must(!Object.keys(byN("Pilau").r||{}).length,"the unticked dish stays made to order");
  must(Object.keys(byN("Linked").r)[0]==="a","the row with a stock item is linked to it");
  // the Stock Master lists it
  // after importing: Use in stock from the Products List
  await nav();
  q('[data-a="prl_etsel"][data-id="'+byN("Pilau").id+'"]').click(); await wait(20);
  const us=q('[data-a="prl_usestock"]'); must(!!us,"the Products List has Use in stock");
  us.click(); await wait(30); must(/Tap again: 1 into stock/.test(q('[data-a="prl_usestock"]').textContent),"it asks to confirm: "+q('[data-a="prl_usestock"]').textContent);
  q('[data-a="prl_usestock"]').click(); await wait(80);
  must(Object.keys(byN("Pilau").r||{}).length===1&&/1 product now in stock/.test(tst()),"the ticked product now keeps stock: "+tst());
  q('[data-a="prl_etsel"][data-id="'+byN("Pilau").id+'"]')&&q('[data-a="prl_etsel"][data-id="'+byN("Pilau").id+'"]').checked&&q('[data-a="prl_etsel"][data-id="'+byN("Pilau").id+'"]').click(); await wait(10);
  q('[data-a="prl_etsel"][data-id="'+gb.id+'"]').click(); await wait(10); q('[data-a="prl_usestock"]').click(); await wait(40);
  must(/already keep stock/.test(tst()),"products already in stock are left alone: "+tst());
  must(FD_SETTINGS.auditTrail.some(x=>/1 product now kept in stock/.test(x.text)),"it is recorded");
  must(JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).I.find(i=>i.n==="Guinness"&&i.d==="Bar").r[k]===1,"and saved");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=200000"];
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

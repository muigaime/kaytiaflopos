// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, tst=()=>(q("#toast")||{}).textContent||"", byN=n=>ITEMS.find(i=>i.n===n), rows=()=>qa("#prImp .pri-t tbody tr"), st=i=>q("#priS"+i).textContent;
  const waitFor=async c=>{ for(let i=0;i<30000&&!c();i++) await wait(5); }, settle=async p=>{ let d=0,v; p.then(x=>{v=x;d=1},e=>{v=e;d=1}); await waitFor(()=>d); return v; };
  const blobs=[]; const mk=URL.createObjectURL.bind(URL); URL.createObjectURL=b=>{ if(b&&b.type&&b.type.includes("spreadsheet")) blobs.push(b); return mk(b); }; HTMLAnchorElement.prototype.click=function(){};
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async()=>{ qa("#nav .nv").find(x=>x.dataset.n==="Products List").click(); await wait(100); };
  const pick=(id,file)=>{ const e=q(id); const dt=new DataTransfer(); dt.items.add(file); e.files=dt.files; e.dispatchEvent(new Event("change",{bubbles:true})); };
  await nav(); click('[data-a="prl_imp"]'); await wait(40); must(!!q("#prImp")&&!!q("#priX")&&!!q("#priO"),"Import offers Excel and a photo or scan");
  click('[data-a="prl_imptpl"]'); await wait(30); must(blobs.length===1,"the template downloads");
  const tpl=await settle(xlsxRows(blobs[0])); const hd=tpl.find(r=>r.includes("Product name")); must(!!hd&&["Selling point","Category","Selling price","Buying price","Tax","Stock item"].every(h=>hd.includes(h)),"the template has every column: "+hd.join("|"));
  pick("#priX",new File([blobs[0]],"t.xlsx")); await waitFor(()=>/no products/.test(tst())); must(/no products/.test(tst()),"the example row isn't imported");
  pick("#priX",new File(["hello"],"bad.xlsx")); await waitFor(()=>/can.t be read/.test(tst())); must(/can.t be read/.test(tst()),"a bad file is refused");
  const sheet=XLSX.build({company:"X",title:"T",by:"b",sections:[{c:["Product name","Selling point","Category","#Selling price","#Buying price","Tax","Stock item"],r:[["Chips","Restaurant","Food",300,120,"VAT",""],["Soda","bar","Drinks",150,"","None",""],["Fish","Restaurant","Mains",900,"","",""],["Chips","Restaurant","Food",300,"","",""],["NoPrice","Restaurant","Food","","","",""],["Lost","Nowhere","Food",100,"","",""],["Linked","Bar","Beer",400,"","VAT","A"],["Wrong stock","Bar","Beer",400,"","VAT","Nothing"]]}]});
  pick("#priX",new File([sheet],"menu.xlsx")); await waitFor(()=>rows().length>0);
  must(rows().length===8,"a filled file reaches the review: "+rows().length);
  must(st(0)==="Ready"&&st(1)==="Ready"&&/already sells/.test(st(2))&&/twice/.test(st(3))&&/selling price/.test(st(4))&&/selling point/.test(st(5))&&st(6)==="Ready"&&/No stock item/.test(st(7)),"each row says what's wrong");
  must(q('[data-pri="1.d"]').value==="Bar"&&q('[data-pri="1.t"]').value==="A","spelling of the selling point and tax are understood");
  must(/Import 3 products/.test(q("#priGo").textContent),"only good rows count");
  const pv=q('[data-pri="4.p"]'); pv.value="99"; pv.dispatchEvent(new Event("change",{bubbles:true})); await wait(10); must(st(4)==="Ready"&&/Import 4 products/.test(q("#priGo").textContent),"fixing a row counts it");
  const n0=ITEMS.length; click('[data-a="prl_impdel"][data-i="7"]'); await wait(30); must(rows().length===7,"a row can be removed");
  must(ITEMS.length===n0,"nothing is saved yet"); const ins=q('[data-priall="ins"]'); ins.value="0"; ins.dispatchEvent(new Event("change",{bubbles:true})); await wait(40); click("#priGo"); await wait(60);
  must(ITEMS.length===n0+4&&!q("#prImp"),"importing adds the good rows: "+tst());
  must(byN("Chips").d==="Restaurant"&&byN("Chips").p===300&&byN("Chips").buy===120&&byN("Chips").c==="Food"&&byN("Chips").t==="B","the details are right");
  must(byN("Soda").t==="A"&&Object.keys(byN("Soda").r).length===0,"no-stock and no-tax are right");
  must(byN("Linked").r.a===1,"a stock item links");
  must(!!qa(".pr-t tr").find(r=>r.textContent.includes("Chips")),"they appear on the list");
  // A picture
  window.__ocr.lines=["KITCHEN MENU","Item Price","1. Beef Stew ..... 650","Ugali 100.00","Pilau 200 450","Chapati","12:30"];
  click('[data-a="prl_imp"]'); await wait(40); pick("#priO",new File([new Uint8Array([255,216,255])],"a.jpg")); await waitFor(()=>rows().length>0);
  must(rows().length===4||rows().length===5,"lines become rows: "+rows().length);
  const vals=rows().map(r=>r.querySelector('[data-pri$=".n"]').value+"="+r.querySelector('[data-pri$=".p"]').value+"/"+r.querySelector('[data-pri$=".b"]').value).join(";");
  must(/Beef Stew=650[/]/.test(vals)&&/Ugali=100.00[/]/.test(vals)&&/Pilau=450[/]200/.test(vals)&&/Chapati=[/]/.test(vals),"names and prices are read: "+vals);
  const sa=q('[data-priall="d"]'); sa.value="Restaurant"; sa.dispatchEvent(new Event("change",{bubbles:true})); await wait(40); must(qa('[data-pri$=".d"]').every(s=>s.value==="Restaurant"),"one selling point can be set for every row");
  must(/selling price/.test(rows().map(r=>r.textContent).join()),"a line with no price needs one");
  click('[data-a="prl_impclose"]'); await wait(30); must(!q("#prImp"),"it closes without saving");
  // Store items
  const invN=async()=>{ qa("#nav .nv").find(x=>x.dataset.n==="Inventory").click(); await wait(100); q('[data-a="inv_tab"][data-t="items"]').click(); await wait(100); };
  const LS=()=>{ bosave(); return JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); };
  await invN(); must(!!q('[data-a="prl_imp"][data-k="stock"]'),"Item setup has an Import button");
  blobs.length=0; click('[data-a="prl_imp"][data-k="stock"]'); await wait(50);
  must(q('[data-a="prl_impk"][data-k="stock"]').classList.contains("on")&&!!q("#priX"),"it opens on Store items");
  click('[data-a="prl_imptpl"]'); await wait(30); const t2=await settle(xlsxRows(blobs[0])); const h2=t2.find(r=>r.includes("Item name")); must(!!h2&&["Unit","Buying unit","Units per buying unit","Buying price","Reorder level","Store","Opening quantity"].every(h=>h2.includes(h)),"the store template has its own columns");
  const sh2=XLSX.build({company:"X",title:"T",by:"b",sections:[{c:["Item name","Item code","Category","Unit","Buying unit","#Units per buying unit","#Buying price","#Reorder level","Store","#Opening quantity","Tax"],r:[["Sugar","","Raw materials","kg","Bag",50,6000,10,"main store",2,"VAT"],["Semolina","FL1","","kg","","",120,"","","","None"],["A","","","pcs","","",5,"","","",""],["Sugar","","","kg","","",1,"","","",""],["Salt","","","kg","","",40,"","","3",""],["Bad pack","","","pcs","","x0",5,"","","",""]]}]});
  pick("#priX",new File([sh2],"store.xlsx")); await waitFor(()=>rows().length>0);
  must(rows().length===6,"the items reach the review");
  must(st(0)==="Ready"&&st(1)==="Ready"&&/already/i.test(st(2))&&/twice/.test(st(3))&&/store/.test(st(4))&&/units per/i.test(st(5)),"each row says what's wrong: "+[0,1,2,3,4,5].map(st).join(" | "));
  must(q('[data-pri="0.st"]').value==="Main Store"&&q('[data-pri="1.g"]').value==="Raw materials"&&q('[data-pri="1.pb"]').value==="1","store spelling and sensible defaults");
  const before=Object.keys(LS().IU||{}).length, it0=ITEMS.length;
  click("#priGo"); await wait(80);
  must(!q("#prImp")&&/2 items imported/.test(tst()),"importing saves the good rows: "+tst());
  must(ITEMS.length===it0,"store items don't go on the POS");
  const D=LS(), sugar=Object.entries(D.IU).find(([k,v])=>v.name==="Sugar"), flour=Object.entries(D.IU).find(([k,v])=>v.name==="Semolina");
  must(!!sugar&&sugar[1].uom==="kg"&&sugar[1].buyUnit==="Bag"&&sugar[1].perBuy===50&&sugar[1].buyPrice===6000&&sugar[1].group==="Raw materials"&&!!sugar[1].code,"the item is set up: "+JSON.stringify(sugar&&sugar[1]));
  must(D.X[sugar[0]]===120,"cost per unit is worked out: "+D.X[sugar[0]]);
  must(STK["Main Store"][sugar[0]]===100,"opening stock goes to the store: "+STK["Main Store"][sugar[0]]);
  must(!!flour&&flour[1].code==="FL1"&&flour[1].tax==="A"&&(STK["Main Store"][flour[0]]||0)===0,"an item with no opening stock is fine");
  must(/Sugar/.test(q("#vSub").textContent),"they appear in Item setup");
  must(!!qa("#rcp_k option,option").length||true,"-");
  window.__ocr.lines=["Store list","Cooking Oil 2 3200","Rice 150"]; click('[data-a="prl_imp"][data-k="stock"]'); await wait(40); pick("#priO",new File([new Uint8Array([255,216,255])],"a.jpg")); await waitFor(()=>rows().length>0);
  must(rows().length===3&&q('[data-pri="1.n"]').value==="Cooking Oil"&&q('[data-pri="1.q"]').value==="2"&&q('[data-pri="1.bp"]').value==="3200"&&q('[data-pri="2.bp"]').value==="150","a photo of a store list reads quantity and price");
  click('[data-a="prl_impclose"]'); await wait(30);
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

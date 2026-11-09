// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__et={live:true,calls:[],fail:0};(()=>{const f0=window.fetch;window.fetch=(u,o)=>{const p=String(u).split("/lan/etims/");if(p.length<2)return f0(u,o);const E=window.__et,b=JSON.parse(o.body||"{}"),R=(j,s=200)=>Promise.resolve(new Response(JSON.stringify(j),{status:s}));E.calls.push([p[1],b]);if(p[1]==="status")return R({live:E.live});if(p[1]==="items")return R({results:b.items.map(x=>E.fail&&x.ref==="2"?{ref:x.ref,error:"Bad item"}:E.live?{ref:x.ref,etimsCode:"KE"+x.ref,etimsId:"ET-"+x.ref}:{ref:x.ref,etimsCode:"TEST-CODE-"+x.ref,etimsId:"TEST-ITEM-"+x.ref,test:true})});if(p[1]==="stock")return R({results:b.adjustments.map(x=>({ref:x.ref}))});return R({status:"signed",result:{cu:"C1",inv:"1",qr:"q",at:"t"}});};})();
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

  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, E=window.__et, it=id=>ITEMS.find(x=>x.id===id), heads=()=>qa(".pr-t th").map(x=>x.textContent), calls=op=>E.calls.filter(c=>c[0]===op), toastT=()=>(q("#toast")||{}).textContent||"", row=id=>qa(".pr-t tr").find(r=>r.querySelector('[data-a="prl_etsel"][data-id="'+id+'"]')), btn=id=>q('[data-a="prl_etone"][data-id="'+id+'"]');
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async()=>{ qa("#nav .nv").find(x=>x.dataset.n==="Products List").click(); await wait(120); };
  E.live=false; await nav();
  must(heads().join()===",Code,Product,Selling point,Category,Selling price,Track Stock,eTIMS Uploaded,eTIMS Code,eTIMS ID,","the columns match: "+heads().join());
  must(row(1).cells[1].textContent.trim()==="1","Code is just the number in its own column");
  must(row(1).cells[2].querySelector("b").textContent==="Tusker"&&!/·|Code/.test(row(1).cells[2].textContent),"the product shows only its name");
  must(!q("[data-etc]"),"eTIMS Code can't be typed in");
  must(row(1).cells[8].textContent.trim()==="-"&&row(1).cells[9].textContent.trim()==="-","eTIMS Code and ID start empty");
  must(!q(".pr-t .mod-cell")&&!q('.pr-t [data-a="rec_dirr"]')&&qa('.pr-t [data-a="prl_edit"]').length>0&&qa('.pr-t [data-a="prl_del"]').length>0,"Edit and Delete stay, the rest is in Edit");
  must(!q(".et-bar")&&!!q(".pr-selall")&&!!q("[data-a=prl_etsel]")&&/Send all to eTIMS/.test(q("#etSendAll").textContent),"ticks and Send all, no live bar in test mode");
  click('[data-a="prl_edit"][data-id="1"]'); await wait(50); must(/Tax/.test(q("#speModal").textContent)&&/Promotions/.test(q("#speModal").textContent)&&/Modifiers/.test(q("#speModal").textContent)&&/Buying price/.test(q("#speModal").textContent)&&/Each sale deducts from/.test(q("#speModal").textContent),"Edit has tax, buying price, modifiers, promotions and recipe or production"); click('[data-a="sp_pno"]'); await wait(30);
  ITEMS.push({id:60,n:"Corkage",d:"Bar",c:"Service",p:300,t:"B",r:{}}); await nav();
  click('[data-a="prl_edit"][data-id="60"]'); await wait(50); q("#preB").value="-5"; click('[data-a="prl_esave"]'); await wait(30); must(!!q("#prEd")&&/buying price/.test(toastT()),"a negative buying price is refused"); q("#preB").value="120"; click('[data-a="prl_esave"]'); await wait(50); must(it(60).buy===120,"a buying price can be saved");
  must(/NO/.test(row(60).cells[6].textContent)&&/YES/.test(row(1).cells[6].textContent),"Track Stock says YES or NO");
  E.calls.length=0; btn(3).click(); await wait(60);
  must(calls("items").length===1&&calls("items")[0][1].items[0].ref==="3"&&calls("items")[0][1].items[0].code===undefined,"pressing NO sends that product, with no code of ours");
  must(it(3).etUp&&it(3).etTest&&it(3).etCode==="TEST-CODE-3"&&it(3).etId==="TEST-ITEM-3","the server's code and ID are kept");
  must(row(3).cells[8].textContent.trim()==="TEST-CODE-3"&&row(3).cells[9].textContent.trim()==="TEST-ITEM-3"&&/YES/.test(btn(3).textContent),"and shown on the row");
  btn(3).click(); await wait(60); must(calls("items").length===2,"pressing YES sends it again");
  E.calls.length=0; q('[data-a="prl_etsel"][data-id="5"]').click(); await wait(10); must(/Send 1 ticked to eTIMS/.test(q("#etSendAll").textContent),"the button follows the ticks");
  click("#etSendAll"); await wait(60); must(calls("items")[0][1].items.map(x=>x.ref).join()==="5"&&it(5).etUp,"only the ticked product is sent");
  must(/Send all/.test(q("#etSendAll").textContent),"the ticks clear afterwards");
  E.calls.length=0; click("#etSendAll"); await wait(60); must(calls("items").length===1&&!calls("items")[0][1].items.some(x=>x.ref==="3"||x.ref==="5"),"Send all skips what's uploaded");
  ITEMS.forEach(i=>Object.assign(i,{etCode:"",etUp:false,etTest:false,etId:""}));
  E.live=true; await nav();
  must(!!q(".et-bar")&&qa(".et-key").length===2&&/Upload to eTIMS/.test(q(".et-bar").textContent)&&/Adjust eTIMS Stock/.test(q(".et-bar").textContent),"the two buttons appear with a live service");
  click('[data-a="prl_etadj"]'); await wait(30); must(/Upload products/.test(toastT())&&!q("#etAdj"),"nothing to adjust before an upload");
  E.fail=1; E.calls.length=0; q('[data-a="prl_etsel"][data-id="2"]').click(); await wait(10); click('[data-a="prl_etup"]'); await wait(60); must(calls("items")[0][1].items.length===1&&!it(2).etUp&&/Bad item/.test(toastT()),"a refusal is reported: "+toastT());
  E.fail=0; await nav(); q('[data-a="prl_etsel"][data-id="1"]').click(); await wait(10); click('[data-a="prl_etup"]'); await wait(60);
  must(it(1).etCode==="KE1"&&it(1).etId==="ET-1"&&it(1).etTest===false,"a live upload keeps the provider's code and ID");
  it(3).etUp=true; it(3).etTest=true; await nav(); must(/NO/.test(btn(3).textContent),"a test upload doesn't count once a real service is connected"); it(3).etUp=false; it(3).etTest=false; await nav();
  q('[data-a="prl_etall"]').click(); await wait(10); must(qa("[data-a=prl_etsel]").every(x=>x.checked),"Select All ticks every row"); q('[data-a="prl_etall"]').click(); await wait(10); must(!qa("[data-a=prl_etsel]").some(x=>x.checked),"and clears them");
  click('[data-a="prl_etadj"]'); await wait(50); must(!!q("#etAdj")&&qa("#etAdj [data-etq]").length===1,"Adjust lists uploaded stocked products");
  const qty=q('#etAdj [data-etq="1"]'); qty.value="-1"; click('[data-a="prl_etadjgo"]'); await wait(30); must(!!q("#etAdj")&&/0 or more/.test(toastT()),"a negative quantity is refused");
  qty.value="12"; E.calls.length=0; click('[data-a="prl_etadjgo"]'); await wait(60);
  must(calls("stock").length===1&&JSON.stringify(calls("stock")[0][1].adjustments[0])===JSON.stringify({ref:"1",etimsId:"ET-1",qty:12,reason:"Stock take"})&&!q("#etAdj"),"the adjustment follows the contract");
  bosave(); must(JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).I.find(x=>x.id===1).etCode==="KE1","the code is saved");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
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

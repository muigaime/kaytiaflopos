// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};
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
  click('[data-go="pos"]'); await wait(200); posKioskOff(); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  click("#lock"); await wait(25); posKioskOff(); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); const G=()=>{window.bosave(); return JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).GN||[];}, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(100);}, tab=async t=>{click('[data-a="pur_tab"][data-t="'+t+'"]'); await wait(60);}, set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));}, tst=()=>q("#toast").textContent;
  await nav("Vendors"); set('[data-iv="vn.name"]',"Kenya Breweries"); click('[data-a="inv_vnsave"]'); await wait(40);
  await nav("Purchasing"); await tab("receive"); const addLine=async(name,qty,price)=>{ set('[data-iv="rc.eName"]',name); await wait(30); const pk=qa("#vSub button").find(b=>b.dataset.a==="inv_rcfind"); set('[data-iv="rc.eQty"]',String(qty)); set('[data-iv="rc.ePrice"]',String(price)); await wait(15); click('[data-a="inv_rcadd"]'); await wait(40); };
  
  const invTab=async t=>{ click('[data-a="inv_tab"][data-t="'+t+'"]'); await wait(50); };
  const dt=()=>q("#docModal h3").textContent;
  const paper=()=>q("#docModal .a4").textContent.replace(/ +/g," ");
  const close=async()=>{ click('[data-a="dc_close"]'); await wait(40); };
  const stubPrint=()=>{ const o=window.open; let html="",printed=0; window.open=()=>({document:{write:s=>{html=s},close(){}},focus(){},print(){printed++}}); return ()=>{window.open=o; return {html,printed}}; };
  const getPdf=async()=>{ let got=null,fn="",mk=null; const dl=PDF.download; PDF.download=(o,f,m)=>{got=o;fn=f;mk=m;}; click('[data-a="dc_pdf"]'); await wait(60); PDF.download=dl; return {got,fn,bytes:mk?mk(got):""}; };
    const rows=()=>qa("#vSub .stm-t tbody tr").filter(r=>!r.classList.contains("stm-band")&&r.cells.length>2);
  const bands=()=>qa("#vSub .stm-band b").map(x=>x.textContent); const grps=()=>bands().join(",");
  await nav("Purchasing"); await tab("receive"); set('[data-iv="rc.sup"]',"Kenya Breweries"); await wait(40); await addLine("Tusker",10,116); set('[data-iv="rc.inv"]',"INV-1"); await wait(15); click('[data-a="inv_rcdnsame"]'); await wait(30); set('[data-iv="rc.invAmt"]',"1160"); await wait(15); click('[data-a="inv_rcpost"]'); await wait(50); click('[data-a="dc_close"]'); await wait(30);
  await nav("Inventory"); await invTab("master"); log("1 MASTER: cards "+qa(".sc2").map(o=>o.querySelector("span").textContent).join(", ")+" | rows "+rows().length+" | groups "+grps());
  q('[data-m="zero"]').click(); await wait(50); const allRows=rows().length, GS=bands(); log("2 ZERO ON: rows "+allRows+" | groups "+GS.join(","));
  q('[data-m="zero"]').click(); await wait(50);
  const pick=GS.find(g=>g&&g!=="Beverages")||GS[0]; await invTab("stores"); click('[data-a="inv_stedit"]'); await wait(40); log("3 TICKS: "+qa("#stEd [data-stk]").length+" | buttons "+!!q('[data-a="inv_stall"]')+" "+!!q('[data-a="inv_stnone"]'));
  click('[data-a="inv_stall"]'); await wait(10); log("4 SELECT ALL: "+qa("#stEd [data-stk]").filter(x=>x.checked).length); click('[data-a="inv_stnone"]'); await wait(10); log("5 CLEAR: "+qa("#stEd [data-stk]").filter(x=>x.checked).length); qa("#stEd [data-stk]").find(x=>x.dataset.stk===pick).click(); click('[data-a="inv_stsave"]'); await wait(60); log("6 SAVED: "+tst()+" | kinds cell "+q("#vSub table tr:nth-child(2) td:nth-child(2)").textContent);
  await invTab("master"); log("7 TICKED "+pick+": rows "+rows().length+" | groups "+grps()+" | hint "+(q(".stm-note")||{}).textContent+" | Tusker kept "+rows().some(r=>/Tusker/.test(r.textContent)));
  q('[data-m="zero"]').click(); await wait(50); log("8 ZERO ON STILL LIMITED: rows "+rows().length+" of "+allRows); q('[data-m="zero"]').click(); await wait(50);
  await invTab("stores"); click('[data-a="inv_stedit"]'); await wait(40); click('[data-a="inv_stnone"]'); const other=qa("#stEd [data-stk]").find(x=>x.dataset.stk!=="Raw materials"); const otherName=other.dataset.stk; other.click(); click('[data-a="inv_stsave"]'); await wait(60); await invTab("master"); log("8B OTHER CATEGORY "+otherName+": rows "+rows().length+" | "+rows().map(r=>r.cells[1].textContent).join(",")+" | hint "+q(".stm-note").textContent); q('[data-m="zero"]').click(); await wait(50); log("8C ZERO ON: rows "+rows().length); q('[data-m="zero"]').click(); await wait(50);
  await invTab("stores"); click('[data-a="inv_stedit"]'); await wait(40); click('[data-a="inv_stall"]'); click('[data-a="inv_stsave"]'); await wait(60); await invTab("master"); log("9 ALL TICKED: rows "+rows().length+" groups "+grps());
  await invTab("stores"); click('[data-a="inv_stedit"]'); await wait(40); click('[data-a="inv_stnone"]'); click('[data-a="inv_stsave"]'); await wait(60); await invTab("master"); log("10 NONE TICKED: rows "+rows().length);
  click('[data-a="inv_locall"]'); await wait(60); log("11 ALL STORES: head "+qa("#vSub .stm-t thead th").map(x=>x.textContent).join("|")+" | "+qa(".stm-tile").map(x=>x.textContent).join(" / ")); log("12 ROW: "+rows().filter(r=>/Tusker/.test(r.textContent)).map(r=>[...r.cells].map(c=>c.textContent).join("|")).join(";")+" | no count button "+!q('[data-a="inv_tab"][data-t="run"]'));
  log("13 CHIP ON: "+qa(".sc2.on").map(x=>x.textContent).join(",")); const st=stubPrint(); click('[data-a="inv_mallp"]'); await wait(30); const pr=st(); const dd=new DOMParser().parseFromString(pr.html,"text/html"); log("14 PRINT: "+pr.printed+" "+dd.querySelector(".st-co b").textContent+" / "+dd.querySelector("h2").textContent+" rows "+dd.querySelectorAll("tbody tr").length); let xl=null; const xd=XLSX.download; XLSX.download=(o,f)=>{xl=f}; click('[data-a="inv_mallx"]'); await wait(20); XLSX.download=xd; log("15 EXCEL: "+xl+" | "+tst());
  click('[data-a="inv_loc"]'); await wait(60); log("16 BACK TO STORE: count button "+!!q('[data-a="inv_tab"][data-t="run"]')+" | "+q(".stm-note").textContent.slice(0,50));
  click('[data-a="inv_locall"]'); await wait(50); log("17 CHIP SELECTS ALL: "+!q('[data-a="inv_tab"][data-t="run"]')); await invTab("req"); log("18 OTHER TAB NO ALL CHIP: "+!q('[data-a="inv_locall"]')); await invTab("master"); click('[data-a="inv_loc"]'); await wait(50); log("19 STORE CHIP: count button "+!!q('[data-a="inv_tab"][data-t="run"]'));
  await invTab("master"); q('[data-m="zero"]').click(); await wait(50);
  log("30 PAGE: "+qa(".stm-tile").map(x=>x.textContent).join(" / ")+" | head "+qa(".stm-t thead th").map(x=>x.textContent).join("|"));
  log("31 ROW: "+rows().find(r=>/Tusker/.test(r.textContent)).textContent.replace(/ +/g," "));
  click('[data-a="inv_mst"][data-v="out"]'); await wait(40); log("32 OUT: rows "+rows().length+" | tusker "+rows().some(r=>/Tusker/.test(r.textContent))+" | tags "+qa(".stm-t .tag.bad").length); click('[data-a="inv_mst"][data-v="in"]'); await wait(40); log("33 IN STOCK: "+rows().map(r=>r.cells[0].textContent).join(",")); click('[data-a="inv_mst"][data-v="all"]'); await wait(40);
  log("34 CATEGORY LIST: "+qa('[data-m="grp"] option').map(x=>x.textContent).join(" | "));
  const ht=x=>Math.round(x.getBoundingClientRect().height); log("34B HEIGHTS: band "+ht(q(".stm-band"))+" row "+ht(rows()[0])+" tile "+ht(q(".stm-tile")));
  const tu=q('[data-ph$="|tusker|'+'"]')||rows().find(r=>/Tusker/.test(r.textContent)).querySelector("[data-ph]"); tu.value="8"; tu.dispatchEvent(new Event("input",{bubbles:true})); await wait(30); const tr=tu.closest("tr"); log("35 COUNT: var "+tr.querySelector("[data-vr]").textContent+" | tint "+tr.className+" | "+q("#msDone").textContent+" | "+q("#msVar").textContent+" | bar "+q(".stm .pbar").textContent);
  const ph=qa("[data-ph]"), i0=ph.indexOf(tu); const nextEl=ph[i0+1]; if(nextEl){ tu.focus(); tu.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})); await wait(15); log("36 ENTER NEXT: "+(document.activeElement===nextEl)); }
  click('[data-a="inv_mst"][data-v="var"]'); await wait(40); log("37 VARIANCE FILTER: "+rows().map(r=>r.cells[0].textContent).join(",")+" | still typed "+rows()[0].querySelector("[data-ph]").value); click('[data-a="inv_mst"][data-v="todo"]'); await wait(40); log("38 NOT COUNTED HIDES IT: "+!rows().some(r=>/Tusker/.test(r.textContent))+" | counted tile "+q("#msDone").textContent); click('[data-a="inv_mst"][data-v="all"]'); await wait(40);
  q('[data-a="inv_mdetail"]').click(); await wait(40); log("39 ALL MOVEMENTS: "+qa(".stm-t thead th").map(x=>x.textContent).join("|")+" | cells "+rows()[0].cells.length+" band span "+q(".stm-band td").colSpan); q('[data-a="inv_mdetail"]').click(); await wait(40); log("40 BACK: cells "+rows()[0].cells.length+" head "+qa(".stm-t thead th").length+" band span "+q(".stm-band td").colSpan);
  const fi=q("#vSub [data-find]"); fi.value="tusker"; fi.dispatchEvent(new Event("input",{bubbles:true})); await wait(30); log("41 SEARCH: rows showing "+rows().filter(r=>!r.hidden).length+" | bands "+qa(".stm-band").filter(r=>!r.hidden).length); fi.value=""; fi.dispatchEvent(new Event("input",{bubbles:true})); await wait(20);
  const shown=()=>rows().filter(r=>r.offsetParent).length; const gr=q('[data-m="grp"]'); gr.value="Raw materials"; gr.dispatchEvent(new Event("change",{bubbles:true})); await wait(50); log("41B CATEGORY PICK: value "+q('[data-m="grp"]').value+" rows "+shown()); const g2=q('[data-m="grp"]'); g2.value=""; g2.dispatchEvent(new Event("change",{bubbles:true})); await wait(50);
  const n0=shown(); const scr=q(".stm .tw.tall"); const typed=qa("[data-ph]").find(x=>x.value==="8"); click(".stm-band"); await wait(20); log("41C FOLD: "+n0+" -> "+shown()+" | count kept "+typed.value+" | same element "+document.contains(typed)); const fb=q("#vSub [data-find]"); fb.value="tusker"; fb.dispatchEvent(new Event("input",{bubbles:true})); await wait(30); log("41D SEARCH OPENS FOLDED: "+shown()); fb.value=""; fb.dispatchEvent(new Event("input",{bubbles:true})); await wait(20); log("41E FOLDED AGAIN: "+shown());
  click('[data-a="inv_mband"]'); await wait(15); click('[data-a="inv_mbandall"][data-v="1"]'); await wait(15); log("41F COLLAPSE ALL: "+shown()); click('[data-a="inv_mbandall"][data-v=""]'); await wait(15); log("41G EXPAND ALL: "+shown());
  const dm=rows().find(r=>/Tusker/.test(r.textContent)).querySelector("[data-dm]"); dm.value="1"; dm.dispatchEvent(new Event("change",{bubbles:true})); await wait(50); log("42 DAMAGES WORK: "+tst()+" | stock "+STK["Main Store"].tusker);
  click('[data-a="inv_tab"][data-t="run"]'); await wait(30); log("42B ASKS TO CONFIRM: "+q('[data-a="inv_tab"][data-t="run"]').textContent); q('[data-a="inv_tab"][data-t="run"]').click(); await wait(80); log("43 RUN STOCK TAKE: "+tst()+" | modal "+!!q("#stModal")+" | stock "+STK["Main Store"].tusker);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "stk-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=60000"];
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

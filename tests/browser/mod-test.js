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
  click('[data-go="pos"]'); await wait(200); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  const toBO=async()=>{click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);}, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);}, toPOS=async p=>{click("#boMenu"); await wait(30); click('[data-go="pos"]'); await wait(80); await login(p); await wait(420); q("#shMgr").classList.remove("show");}, tst=()=>q("#toast").textContent, A=async s=>{click('[data-a="'+s+'"]'); await wait(30);};
  const edBy=async id=>{ if(q("#speModal")){ q('[data-a="sp_pno"]').click(); await wait(25);} if(q("#prEd")){ q('[data-a="prl_eclose"]').click(); await wait(25);} q('[data-a="prl_edit"][data-id="'+id+'"]').click(); await wait(40); }, openEd=async(sel)=>{ if(sel.includes('data-id="')) await edBy(sel.split('data-id="')[1].split('"')[0]); q(sel).click(); await wait(25);}, row=(i,n,o)=>{const r=qa("#modEd [data-mr]")[i]; let L=o.split(",").map(x=>x.trim()); const bs=r.querySelector('[data-a="mod_more"]'); r.querySelectorAll("[data-mc]").forEach((c,j)=>{c.value=L[j]||"";}); window.__more=L.length-r.querySelectorAll("[data-mc]").length; window.__mr=i; window.__ml=L;}, tile=n=>qa("#grid .it").find(b=>b.textContent.includes(n)), m=()=>q("#mMod").classList.contains("show"), choose=async x=>{qa("#modO .mod-o").find(b=>b.textContent===x).click(); await wait(15);}, tab=async d=>{q('#spTabs [data-t="'+d+'"]').click(); await wait(15);}, cat=async c=>{const b=q('#cats [data-c="'+c+'"]'); if(b){b.click(); await wait(10);}};
  const snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);};
  const T=ITEMS.find(i=>i.n==="Tusker"), F=ITEMS.find(i=>i.n==="Fish"); ITEMS.push({id:801,n:"Lager",d:"Bar",c:T.c,p:300,t:"B",r:{...T.r}},{id:802,n:"Soda Water",d:"Bar",c:"Softs",p:100,t:"B",r:{}});
  await toBO(); await nav("Products List"); log("1 PAGE: "+qa("#vSub .pn h4").map(h=>h.textContent).join(" / ")+" | col "+[...qa("#vSub table.t").pop().rows[0].cells].pop().textContent);
  await openEd('[data-a="mod_item"][data-id="'+T.id+'"]'); log("2 FORM: tick "+q("#modOn").checked+" | rows "+qa("#modEd [data-mr]").length); click("#modOn"); await wait(20); log("3 TICKED: rows "+qa("#modEd [data-mr]").length+" | "+qa("#modEd [data-mr]")[0].textContent.slice(0,60));
  await A("mod_save"); log("4 EMPTY: "+tst()); row(0,"Temperature","Cold, Warm, ~Hot"); await A("mod_add"); log("7 ADD KEEPS TYPING: "+q('#modEd [data-mc]').value+" | rows "+qa("#modEd [data-mr]").length); row(1,"Flavour","Sprite, Coke"); await A("mod_save"); log("8 SAVED: "+tst()+" | "+JSON.stringify(T.mods)+" | editor gone "+!q("#modEd"));
  await nav("Selling points"); click('[data-a="sp_view"][data-k="cats"]'); await wait(40);  await openEd('[data-a="mod_cat"][data-c="Softs"]'); log("9 CATEGORY FORM: "+q("#modEd h3").textContent); click("#modOn"); await wait(15); row(0,"Temperature","Cold, Warm"); await A("mod_save"); log("10 CAT SAVED: "+tst()+" | "+JSON.stringify(FD_SETTINGS.catMods));
  await nav("Products List"); await edBy(802); log("11 CELLS: "+qa('[data-a="mod_item"][data-id="802"]')[0].closest(".mod-cell").textContent.slice(0,60));
  bosave(); const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("12 SAVED: "+!!sv.I.find(i=>i.id===T.id).mods+" | cat "+!!sv.FS.catMods.Softs);
  await toPOS("1111"); await tab("Bar"); await cat(T.c);
  tile("Tusker").click(); await wait(20); log("13 TAP ASKS: "+m()+" | "+q("#modT").textContent+" | "+q("#modS").textContent+" | "+qa("#modO .mod-o").map(b=>b.textContent).join()+" | cart "+JSON.stringify(cart));
  await choose("Cold"); log("14 THEN OPTION 2: "+q("#modS").textContent+" | "+qa("#modO .mod-o").map(b=>b.textContent).join()+" | back "+(q("#modBack").style.display!=="none")); click("#modBack"); await wait(10); log("15 BACK: "+q("#modS").textContent); await choose("Cold"); await choose("Sprite"); log("16 ADDED: box "+m()+" | "+JSON.stringify(cart)+" | line "+q("#lines .tr").textContent.replace(/\s+/g," "));
  tile("Tusker").click(); await wait(15); q('#mMod [data-close]').click(); await wait(10); log("17 CANCEL: "+Object.keys(cart).length);
  tile("Tusker").click(); await wait(15); await choose("Warm"); await choose("Coke"); log("18 SECOND LINE: "+Object.keys(cart).join(" ; ")+" | tile count "+q("#grid .it .in").textContent); tile("Tusker").click(); await wait(15); await choose("Cold"); await choose("Sprite"); log("19 SAME CHOICE ADDS UP: "+JSON.stringify(cart));
  tile("Lager").click(); await wait(15); log("20 NO MODIFIER: box "+m()+" | "+Object.keys(cart).length+" lines");
  const stock0=avail(T); q('#lines [data-p="'+T.id+'~Warm~Coke"]').click(); await wait(10); log("21 PLUS ON A LINE: "+cart[T.id+"~Warm~Coke"]+" | no popup "+!m()); q('#lines [data-m="'+T.id+'~Warm~Coke"]').click(); await wait(10);
  await cat("Softs"); tile("Soda Water").click(); await wait(15); log("22 CATEGORY ASKS: "+q("#modS").textContent); await choose("Warm");
  const av=avail(T); await send("T1"); await wait(350); const slip=q("#rc").innerText; log("23 ORDER SLIP: "+qa("#rc .sl-make div").map(d=>d.textContent).join(" ; ")); click("#rcClose"); await wait(10); log("24 STOCK USED: "+av+" -> "+avail(T)); const o=orders[0];
  click("#ordBtn"); await wait(10); q('#ordList [data-oa="bill"]').click(); await wait(250); log("25 BILL: "+qa("#rc .sl-t tr").slice(1).map(r=>r.textContent.replace(/\s+/g," ")).join(" ; ")); click("#rcClose"); await wait(10);
  click("#ordBtn"); await wait(10); q('#ordList [data-oa="add"]').click(); await wait(15); await tab("Bar"); await cat(T.c); tile("Tusker").click(); await wait(15); await choose("Cold"); await choose("Coke"); await send("T1"); await wait(350); click("#rcClose"); await wait(10); log("26 ADD ITEMS: "+JSON.stringify(o.lines));
  bosave(); const s2=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("27 SAVED BILL: "+Object.keys(s2.OR[0].lines).join(" ; "));
  click("#ordBtn"); await wait(10); q('#ordList [data-oa="pay"]').click(); await wait(25); const e=q('[data-pa="cash"]'); e.value="50000"; e.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); const rc=q("#rc").innerText; log("28 RECEIPT HAS: "+rc.includes("Tusker (Cold, Sprite)")+" | sale line "+SALES.flatMap(x=>x.lines).map(l=>l.id+"="+l.n).join(" ; ").slice(0,160)); click("#rcClose"); await wait(10);
  await toBO(); await nav("Reports"); click('[data-a="rep_open"]'); await wait(40); q('[data-r="iw"]').click(); await wait(40); log("29 ITEM LIST: "+[...q("#vSub table.t").rows].slice(1,4).map(r=>r.cells[1].textContent).join(" ; "));
  const rep=async k=>{const b=q('[data-r="'+k+'"]'); b.click(); await wait(45);}; qa("[data-r]").find(b=>b.textContent.includes("Periodic")).click(); await wait(50); const pr=q("#vSub table.t"); log("30 PERIODIC: "+(pr?[...pr.rows].slice(1,3).map(r=>r.cells[0].textContent+"|"+r.cells[1].textContent).join(" ; "):"-"));
  await nav("Products List"); await openEd('[data-a="mod_item"][data-id="'+T.id+'"]'); click("#modOn"); await wait(15); await A("mod_save"); log("31 UNTICK REMOVES: "+tst()+" | "+!T.mods);
  await toPOS("1111"); await tab("Bar"); await cat(T.c); tile("Tusker").click(); await wait(15); log("32 PLAIN AGAIN: box "+m()+" | "+JSON.stringify(cart)); cart={}; drawCart();
  log("33 OLD SALE STILL NAMED: "+SALES.some(s=>s.lines.some(l=>l.n==="Tusker (Cold, Sprite)"))+" | removed product line get "+!!get("99999~x"));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "mod-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=50000"];
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

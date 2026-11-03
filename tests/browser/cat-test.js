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
  const toBO=async()=>{click("#lock"); await wait(25); posKioskOff(); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);}, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);}, tst=()=>q("#toast").textContent, A=async s=>{click('[data-a="'+s+'"]'); await wait(30);}, card=n=>q('.cat-card[data-cat="'+n+'"]'), inCard=async(n,s)=>{card(n).querySelector('[data-a="'+s+'"]').click(); await wait(30);}, gr=n=>q('tr[data-grp="'+n+'"]'), grs=()=>qa("tr[data-grp]").map(r=>r.dataset.grp).join(), inGr=async(n,s)=>{gr(n).querySelector('[data-a="'+s+'"]').click(); await wait(30);};
  for(let i=0;i<60;i++) (FD_SETTINGS.cats=FD_SETTINGS.cats||[]).push("Cat "+String(i).padStart(2,"0"));
  await toBO(); await nav("Selling points"); click('[data-a="sp_view"][data-k="cats"]'); await wait(40);  const pn=q(".cat-panel"), gd=q(".cat-grid"), h=gd.getBoundingClientRect().height; log("1 COMPACT: "+qa(".cat-card").length+" categories | list height "+Math.round(h)+" | scrolls "+(gd.scrollHeight>gd.clientHeight)+" | row height "+Math.round(qa(".cat-card")[0].getBoundingClientRect().height));
  log("2 ACTIONS: "+qa(".cat-card")[0].querySelector(".cat-btns").textContent);
  const fi=q("#catFind"); fi.value="cat 1"; fi.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); log("3 SEARCH: "+qa(".cat-card").filter(c=>!c.hidden).map(c=>c.dataset.cat).join()+" | box keeps focus "+(q("#catFind")===fi)); fi.value="zzzz"; fi.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); log("4 NO MATCH: "+!q(".cat-nomatch").hidden+" | visible "+getComputedStyle(q(".cat-nomatch")).display); fi.value="cat 1"; fi.dispatchEvent(new Event("input",{bubbles:true})); await wait(15);
  await inCard("Cat 10","cat_edit"); log("5 SEARCH KEPT WHILE RENAMING: "+q("#catFind").value+" | "+qa(".cat-card").filter(c=>!c.hidden).length+" | box "+q("#catName").value); q("#catName").value="Starters"; await A("cat_save"); log("6 RENAMED: "+tst()+" | "+!!card("Starters"));
  const fj=q("#catFind"); fj.value=""; fj.dispatchEvent(new Event("input",{bubbles:true})); await wait(10); await inCard("Cat 11","cat_ask"); log("7 DELETE OPENS: "+card("Cat 11").querySelector(".cat-q").textContent.slice(0,22)); await A("cat_del"); log("8 "+tst()); q("#catNew").value="Grill"; await A("cat_add"); log("9 ADD: "+tst());
  await nav("Inventory"); log("10 IN INVENTORY: "+qa('[data-a="inv_tab"]').map(b=>b.textContent.trim()).filter(x=>x==="Categories").length); click('[data-a="inv_tab"][data-t="cats"]'); await wait(40); log("11 LIST: "+q(".cat-head h4").textContent+" | "+grs()+" | product categories here "+!!q(".cat-card")+" | headers "+[...q(".grp-list tr").cells].map(c=>c.textContent).join("|"));
  q("#grpNew").value=""; await A("grp_add"); log("12 EMPTY: "+tst()); q("#grpNew").value="food"; await A("grp_add"); log("13 DUP: "+tst()); q("#grpNew").value="Linen"; await A("grp_add"); log("14 ADDED: "+tst()+" | "+!!gr("Linen")); q("#grpNew").value="Stationery"; q("#grpNew").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})); await wait(30); log("15 ENTER: "+tst());
  await inGr("Linen","grp_edit"); log("16 EDIT: "+q("#grpName").value); q("#grpName").value="Stationery"; await A("grp_save"); log("17 TAKEN: "+tst()); q("#grpName").value="Bed Linen"; q("#grpName").dispatchEvent(new Event("change",{bubbles:true})); await wait(10); log("18 LEAVING KEEPS IT: "+!!q("#grpName")); await A("grp_save"); log("19 SAVED: "+tst()+" | "+!!gr("Bed Linen")+" | old "+!!gr("Linen"));
  await inGr("Stationery","grp_ask"); log("20 EMPTY DELETE: "+gr("Stationery").querySelector(".grp-act").textContent.slice(0,20)+" | box "+!!q("#grpTo")); await A("grp_no"); await inGr("Stationery","grp_ask"); await A("grp_del"); log("21 DELETED: "+tst()+" | "+!!gr("Stationery"));
  const used=qa("tr[data-grp]").find(r=>r.dataset.grp==="Raw materials").dataset.grp; await inGr(used,"grp_edit"); q("#grpName").value="Ingredients"; await A("grp_save"); log("22 ITEMS FOLLOW: "+Object.values(JSON.parse(JSON.stringify(Object.keys(ING).length))).length+" | "+tst()+" | "+!!gr("Ingredients"));
  await inGr("Ingredients","grp_ask"); log("23 DELETE WITH ITEMS: "+q(".grp-to").textContent.slice(0,22)); q("#grpTo").value="Bed Linen"; await A("grp_del"); log("24 MOVED: "+tst()+" | "+!!gr("Ingredients"));
  click('[data-a="inv_tab"][data-t="items"]'); await wait(40); const col=[...q("#vSub table.t").rows[0].cells].findIndex(c=>c.textContent==="Category"); log("25 ITEMS SHOW: col "+col+" | "+q("#vSub table.t").rows[1].cells[col].textContent); click('[data-a="inv_itnew"]'); await wait(40); log("26 FORM OFFERS: "+qa("#grpL option").map(o=>o.value).join()+" | label "+q('[data-iv="it.group"]').closest("label").firstChild.textContent); click('[data-a="inv_itcancel"]'); await wait(20);
  bosave(); const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("27 ON DISK: "+s.FS.itemGroups.join()+" | item "+Object.values(s.IU).map(u=>u.group)[0]);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "cat-"));
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

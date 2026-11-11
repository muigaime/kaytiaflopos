// node rcstore-test.js <built.html>: the default receiving store, only its items, and the item picker.
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); };
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(100);}, tab=async t=>{click('[data-a="pur_tab"][data-t="'+t+'"]'); await wait(80);}, set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));}, tst=()=>q("#toast").textContent;
  // a second store, for drinks only, made the default
  STORES.push("Drinks Store"); STK["Drinks Store"]={}; FD_SETTINGS.storeInfo=FD_SETTINGS.storeInfo||{}; FD_SETTINGS.storeInfo["Drinks Store"]={kinds:["Drinks"],def:true};
  await nav("Purchasing"); await tab("receive");
  must(q('[data-iv="rc.dept"]').value==="Drinks Store"&&/Drinks Store [(]default[)]/.test(q('[data-iv="rc.dept"]').textContent),"Receive goods opens on the default store");
  q("#rcName").focus(); q("#rcName").dispatchEvent(new FocusEvent("focusin",{bubbles:true})); await wait(40);
  must(!q("#rcPick").hidden&&/Items kept in Drinks Store/.test(q("#rcPick").textContent)&&/doesn.t hold any items yet/.test(q("#rcPick").textContent),"the picker shows only what that store holds (nothing yet)");
  set("#rcName","Tusker"); click('[data-a="inv_rcfind"]'); await wait(40);
  must(/isn't kept in Drinks Store/.test(tst()),"an item from another store says where it belongs: "+tst());
  set('[data-iv="rc.dept"]',"Main Store"); await wait(80);
  q("#rcName").focus(); q("#rcName").dispatchEvent(new FocusEvent("focusin",{bubbles:true})); set("#rcName",""); await wait(40);
  const n=qa("#rcPick .rc-opt").length; must(n>=3&&/Items kept in Main Store/.test(q("#rcPick").textContent),"Main Store lists its items: "+n);
  const first=q("#rcPick .rc-opt"); must(/pcs/.test(first.textContent)&&/No price yet|KES/.test(first.textContent),"each item shows its unit, stock and price: "+first.textContent);
  { const e=q("#rcName"); e.focus(); e.value="tus"; e.dispatchEvent(new Event("input",{bubbles:true})); } await wait(40); must(qa("#rcPick .rc-opt").length>=1&&qa("#rcPick .rc-opt").every(o=>/tusker/i.test(o.textContent)),"typing narrows the list");
  q("#rcName").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})); await wait(60);
must(q("#rcName").value==="Tusker"&&q("#rcPick").hidden,"Enter picks the highlighted item");
  click('[data-a="inv_rcexit"]'); await wait(60); must(q('[data-iv="rc.dept"]').value==="Main Store","after Clear it stays on the chosen store");
  // the store's own Default tick
  await nav("Inventory"); const stTab=q('.ph-c[data-t="stores"]')||q('[data-a="inv_tab"][data-t="stores"]'); if(stTab) stTab.click(); await wait(120);
  must(/Default/.test((qa("#vSub tr").find(r=>/Drinks Store/.test(r.textContent))||{}).textContent||""),"the stores list marks the default store");
  click('[data-a="inv_stedit"][data-l="Main Store"]'); await wait(60); must(!!q("#stDef")&&!q("#stDef").checked,"a store's settings have the Default tick");
  q("#stDef").checked=true; click('[data-a="inv_stsave"]'); await wait(80);
  must(FD_SETTINGS.storeInfo["Main Store"].def===true&&!FD_SETTINGS.storeInfo["Drinks Store"].def,"ticking it makes Main Store the default, and only one store is default");
  await nav("Purchasing"); await tab("receive"); click('[data-a="inv_rcexit"]'); await wait(40);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "gr-"));
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

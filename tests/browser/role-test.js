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
  const SV=()=>JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); window.__P=[]; window.open=()=>({document:{write(h){window.__P.push(h);},close(){}},focus(){},print(){}});
  const signin=async(u,p)=>{q("#boU").value=u; q("#boP").value=p; await wait(50); click("#boGo"); await wait(900);}, navs=()=>qa("#nav .nv[data-n]").filter(b=>b.style.display!=="none").map(b=>b.dataset.n).join("/"), out=async()=>{click("#boMenu"); await wait(40); click('[data-go="bo"]'); await wait(120);}, go2=async n=>{const b=qa("#nav .nv").find(x=>x.dataset.n===n); b.click(); await wait(30);}, tst=()=>q("#toast").textContent;
  click('[data-go="bo"]'); await wait(150); await signin("admin","admin123");
  await go2("Users & roles");
  log("1 TABS: "+qa(".ur-tabs button").map(b=>b.textContent+(b.classList.contains("on")?"*":"")).join(" / ")+" | users "+qa(".ur-t tr").length+" | role "+q(".ur-t select").value+" | top label "+q("#urole").textContent);
  log("2 ROLES: "+qa("#mr option").map(o=>o.textContent).join(", "));
  const mk=async(n,u,r)=>{q("#mn").value=n; q("#mu").value=u; q("#mp").value="secret1"; q("#mr").value=r; click('[data-a="ur_add"]'); await wait(40); return tst();};
  log("3 NO ROLE: "+await mk("Ann B","annb","")); log("4 SHORT: "+(q("#mn").value="A",q("#mu").value="a1",q("#mp").value="x",click('[data-a="ur_add"]'),await wait(20),tst()));
  log("5 MADE: "+await mk("Ann Chef","annc","Chef")); for(const [n,u,r] of [["Sam Sec","sams","Security"],["Dee Dir","deed","Director"],["Hal House","halh","Housekeeping"],["Sto Re","stor","Store"],["Pro Cure","proc","Procurement"],["Acc Ount","acco","Accountant"],["Gen Man","genm","General Manager"]]) await mk(n,u,r);
  log("6 TAKEN: "+await mk("X","annc","Chef")+" | accounts "+SV().A.length);
  click('[data-a="ur_tab"][data-t="rights"]'); await wait(30);
  const rows=()=>qa("#vSub [data-rk]").filter(r=>!r.hidden); const cell=r=>[...r.cells].map(c=>c.textContent).join("|");
  log("7 TABLE: "+qa(".ur-m th").map(x=>x.textContent).join("/")+" | "+rows().length+" rows | first "+cell(rows()[0])+" | "+q(".ur-sum").innerText.replace(/\\s+/g," "));
  ${outPng ? 'const f0=q(\'[data-urf="m"]\'); f0.value=""; ' : `
  const fm=q('[data-urf="m"]'); fm.focus(); fm.value="invent"; fm.dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("8 FILTER: "+rows().length+" focus "+(document.activeElement===fm)+" | "+q("#urShownN").textContent); fm.value=""; fm.dispatchEvent(new Event("input",{bubbles:true}));
  const fy=q('[data-urf="yes"]'); fy.value="yes"; fy.dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("9 YES FILTER: "+rows().length); fy.value=""; fy.dispatchEvent(new Event("input",{bubbles:true}));
  const sg=q("[data-urg]"); sg.value="Chef"; sg.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); log("10 CHEF: "+q(".ur-sum").innerText.replace(/\\s+/g," ")+" | yes: "+rows().filter(r=>r.querySelector(".ur-g.yes")).map(r=>r.cells[1].textContent).join(","));
  const g=q('[data-a="ur_grant"][data-k="prod.manage"]'); log("11 BEFORE "+g.textContent); g.click(); await wait(15); log("12 AFTER "+q('[data-a="ur_grant"][data-k="prod.manage"]').textContent+" count "+q("#urCount").textContent+" saved "+JSON.stringify(SV().BR.Chef)); const ss=q("[data-urg]"); ss.value="Super Admin"; ss.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); log("13 SUPER locked "+q('[data-a="ur_grant"]').disabled+" | "+q(".ur-note").textContent);
  log("14 POS TAB GONE: "+!q('[data-a="ur_tab"][data-t="pos"]')+" | tabs "+qa(".ur-tabs button").map(b=>b.textContent).join("/"));
  click('[data-a="ur_tab"][data-t="users"]'); await wait(20);
  const adminRow=SV().A.findIndex(a=>a.u==="admin"); log("15 SELF: role locked "+q('[data-ura="'+adminRow+'"]').disabled+" | off locked "+q('[data-a="ur_off"][data-i="'+adminRow+'"]').disabled);
  bosave(); const sv=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("16 SAVED: "+sv.A.length+" users, chef "+sv.A.find(a=>a.u==="annc").role+" | BR "+JSON.stringify(sv.BR)+" | password stored plain "+JSON.stringify(sv.A).includes("secret1"));
  const roleN=(r)=>"";
  await out(); await signin("annc","secret1"); log("17 CHEF SEES: "+navs()+" | label "+q("#urole").textContent+" | revenue hero "+!!q("#heroFig")+" | kpis "+(getComputedStyle(q("#kpis")).display)+" | apps "+qa("#mods .m").map(m=>m.querySelector("b").textContent).join(","));
  await go2("Recipes & Production"); q(".ph-c").click(); await wait(50); log("18 CHEF RECIPES tabs "+qa(".ph-subs button").map(b=>b.textContent.trim()).join("/"));
  await go2("Products List"); log("19 CHEF PRODUCTS (granted above) "+q("#vSub h1").textContent);
  await go2("Inventory"); q(".ph-c").click(); await wait(50); log("20 CHEF INV tabs "+qa(".ph-subs button").map(b=>b.textContent.trim()).join("/")+" | on "+q(".ph-subs:not([hidden]) button.on").textContent.trim());
  qa("#nav .nv").find(x=>x.dataset.n==="Users & roles").click(); await wait(15); log("21 HIDDEN BUTTON BLOCKED: "+tst()+" | users tabs shown "+qa(".ur-tabs button").length);
  await out(); await signin("sams","secret1"); log("22 SECURITY: "+navs()+" | apps "+qa("#mods .m").length+" | rooms cards "+qa("#rooms .k").filter(k=>getComputedStyle(k).display!=="none").length+" | hero "+qa("#hFigs > div").map(d=>d.querySelector("span").textContent).join(","));
  await go2("Room reports"); q('[data-rr="occ"]').click(); await wait(40); log("23 ROOM REPORT print "+!!q('[data-a="rep_print"]'));
  await out(); await signin("deed","secret1"); log("24 DIRECTOR: "+navs()+" | hero money "+!!q("#heroFig")); await go2("Sales & Orders"); log("25 DIR SALES search "+!!q("[data-sq]")); await go2("Reports"); click('[data-a="rep_open"]'); await wait(40); log("26 DIR REPORTS "+qa("[data-r]").length); await go2("Inventory"); q(".ph-c").click(); await wait(50); log("27 DIR INV "+qa(".ph-subs button").map(b=>b.textContent.trim()).join("/"));
  await out(); await signin("acco","secret1"); await go2("Reports"); click('[data-a="rep_open"]'); await wait(40); log("28 ACCOUNTANT reports "+qa("[data-r]").length+" | "+navs());
  await out(); await signin("stor","secret1"); log("29 STORE: "+navs()); await go2("Purchasing"); q(".ph-c").click(); await wait(50); log("30 STORE PUR tabs "+qa(".ph-tabs button").map(b=>b.textContent.trim()).join("/")+" on "+q(".ph-tabs button.on").textContent.trim());
  await out(); await signin("proc","secret1"); log("31 PROCUREMENT: "+navs());
  await out(); await signin("genm","secret1"); log("32 GM: users page hidden "+(qa("#nav .nv").find(x=>x.dataset.n==="Users & roles").style.display==="none")+" | settings shown "+(qa("#nav .nv").find(x=>x.dataset.n==="Settings").style.display!=="none"));
  await out(); await signin("admin","admin123"); await go2("Users & roles"); const ci=SV().A.findIndex(a=>a.u==="annc"); click('[data-a="ur_off"][data-i="'+ci+'"]'); await wait(25); log("33 DISABLE: "+tst()); await out(); await signin("annc","secret1"); log("34 DISABLED SIGN IN: "+q("#boMsg").textContent);
  await signin("admin","admin123"); log("35 ADMIN STILL ALL: nav "+qa("#nav .nv[data-n]").filter(b=>b.style.display==="none").length+" hidden");`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "rl-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=45000"];
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

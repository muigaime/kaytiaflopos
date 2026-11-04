// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const MODPW = fs.readFileSync(path.join(__dirname, "module-pass.local"), "utf8").trim(); // git-ignored
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};
if(!sessionStorage.getItem("ph"))localStorage.setItem("kaytia_machine","PC-1");if(!sessionStorage.getItem("ph"))localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify({S:[],C:[],U:[{n:"Jane Waiter",pin:"1111",d:["Bar","Restaurant","Pool"],role:"Waiter"},{n:"Solo Sam",pin:"3333",d:["Bar"],role:"Waiter"},{n:"Boss",pin:"0000",d:["Bar","Restaurant","Pool"],role:"Manager"}],
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
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); const G=()=>{window.bosave(); return JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).GN||[];}, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(100);}, tab=async t=>{click('[data-a="pur_tab"][data-t="'+t+'"]'); await wait(60);}, set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));}, tst=()=>q("#toast").textContent;
  await nav("Vendors"); if(!sessionStorage.getItem("ph")){ set('[data-iv="vn.name"]',"Kenya Breweries"); click('[data-a="inv_vnsave"]'); await wait(40); }
  await nav("Purchasing"); await tab("receive"); const addLine=async(name,qty,price)=>{ set('[data-iv="rc.eName"]',name); await wait(30); const pk=qa("#vSub button").find(b=>b.dataset.a==="inv_rcfind"); set('[data-iv="rc.eQty"]',String(qty)); set('[data-iv="rc.ePrice"]',String(price)); await wait(15); click('[data-a="inv_rcadd"]'); await wait(40); };
  
  const invTab=async t=>{ click('[data-a="inv_tab"][data-t="'+t+'"]'); await wait(50); };
  const dt=()=>q("#docModal h3").textContent;
  const paper=()=>q("#docModal .a4").textContent.replace(/ +/g," ");
  const close=async()=>{ click('[data-a="dc_close"]'); await wait(40); };
  const stubPrint=()=>{ const o=window.open; let html="",printed=0; window.open=()=>({document:{write:s=>{html=s},close(){}},focus(){},print(){printed++}}); return ()=>{window.open=o; return {html,printed}}; };
  const getPdf=async()=>{ let got=null,fn="",mk=null; const dl=PDF.download; PDF.download=(o,f,m)=>{got=o;fn=f;mk=m;}; click('[data-a="dc_pdf"]'); await wait(60); PDF.download=dl; return {got,fn,bytes:mk?mk(got):""}; };
    const setT=async()=>{ qa("#nav .nv").find(x=>x.dataset.n==="Settings").click(); await wait(100); click('[data-a="hs_tab"][data-k="backup"]'); await wait(60); }, mainNow=()=>JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")), waitFor=async f=>{ for(let w=0;w<4000&&!f();w++) await wait(5); };
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, toastT=()=>q("#toast").textContent;
  if(sessionStorage.getItem("ph")){ JSON.parse(sessionStorage.getItem("ph")).forEach(x=>log(x)); const M=mainNow();
    must(M.S.length===0&&M.I.length===0&&M.U.length===0&&M.C.length===0,"sales, menu, staff and customers are gone"); must(M.VN.length===0&&M.GN.length===0&&M.OR.length===0,"vendors, goods received and open bills are gone"); must(!M.FS.hr&&!M.FS.custPays,"HR and customer payments are gone"); must(Object.keys(M.G||{}).length===0&&Object.values(M.K).every(x=>Object.keys(x).length===0),"stock is empty"); must(M.RM.length===0&&M.RV.length===0,"rooms and guests are gone"); fdSeed(); must(ROOMS.length===0,"demo rooms don't come back");
    must(ITEMS.length===0&&USERS.length===0&&CU.length===0,"the running app is empty too, with no demo data");
    must(M.A.some(a=>a.u==="admin"),"the admin login stays"); must(M.FS.name==="Marker Hotel"&&M.FS.frontDeskOff===undefined&&M.FS.customRoles[0]==="Keep Role","the hotel name and roles stay"); const L0=JSON.parse(sessionStorage.getItem("li")); must(M.LI&&M.LI.code===L0.code&&M.LI.start===L0.start,"the license stays"); must(localStorage.getItem("kaytia_machine")==="PC-1","the machine name stays"); must(M.FS.auditTrail.some(a=>a.nature==="Clear data"&&/cleared by/.test(a.text)),"the clearing is on the record"); must(/admin/i.test(q("#un").textContent)||!!q("#app"),"Back Office still opens");
    await setT(); must(!!q('[data-a="bk_clearask"]'),"the option is still there");
    const bad=[]; addEventListener("error",e=>bad.push(e.message)); for(const b of qa("#nav .nv").filter(x=>x.style.display!=="none")){ if(b.dataset.n==="Point of Sale") continue; try{ b.click(); await wait(60); }catch(e){ bad.push(b.dataset.n+": "+e.message); } } must(!bad.length,"every Back Office page opens with no data: "+qa("#nav .nv").length+" pages "+bad.join(" ; ")); qa("#nav .nv").find(x=>x.dataset.n==="Selling points").click(); await wait(60); qa("#nav .nv").find(x=>x.dataset.n==="Waiter setup").click(); await wait(60); must(!!q('[data-a="ws_save"]'),"staff can be added again");
    click("#boOut"); await wait(30); q("#boBack").click(); await wait(30); click('#start [data-go="fd"]'); await wait(60); q("#flU").value="admin"; q("#flP").value="admin123"; click("#flGo"); for(let w=0;w<4000&&!q("#fd").classList.contains("show");w++) await wait(5); await wait(30); must(q("#fdTitle").textContent==="Rooms"&&!qa("#fdBody .fd-room").length&&!bad.length,"the Front Desk opens with no rooms"); q('[data-v="set"]').click(); await wait(30); q("#r_n").value="501"; q("#r_r").value="4000"; click('[data-f="radd"]'); await wait(30); must(ROOMS.length===1&&ROOMS[0].no==="501","the hotel can add its own rooms"); click("#fdOut"); await wait(30); q("#flBack").click(); await wait(30); click('#start [data-go="pos"]'); await wait(40); must(q("#login").style.display!=="none"&&!bad.length,"the POS opens with no staff or menu");
    document.documentElement.setAttribute("data-test",__E.join(" @@ ")); document.title="done"; return;
  }
  let got=[]; const ac0=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ got.push(this.download); };
  FD_SETTINGS.name="Marker Hotel"; FD_SETTINGS.customRoles=["Keep Role"]; (FD_SETTINGS.custPays=FD_SETTINGS.custPays||[]).push({at:new Date().toISOString(),n:"X",amt:1}); FD_SETTINGS.hr={emps:[]}; CU.push({n:"Old Co",limit:1,owes:0}); bosave(); const keep=JSON.stringify(mainNow().LI); sessionStorage.setItem("li",keep);
  await setT(); const before=()=>mainNow().VN.length+mainNow().I.length; const n0=before(); must(n0>0,"there is data to clear: "+n0); must(!q("#bkClrPw"),"the password box is closed until asked for"); must(/Cleared/.test(q(".bk-danger").textContent)&&/Kept/.test(q(".bk-danger").textContent),"it says what goes and what stays"); click('[data-a="bk_clearask"]'); await wait(30); must(q("#bkClrPw").type==="password","it asks for the password");
  q("#bkClrPw").value="${MODPW}"; q("#bkClrWord").value="clear"; click('[data-a="bk_cleargo"]'); await wait(40); must(/Type CLEAR/.test(toastT())&&before()===n0,"the confirm word must match"); q("#bkClrPw").value="wrong"; q("#bkClrWord").value="CLEAR"; const a0=FD_SETTINGS.auditTrail.length; click('[data-a="bk_cleargo"]'); for(let w=0;w<4000&&FD_SETTINGS.auditTrail.length===a0;w++) await wait(5); await wait(20); must(/not the modules password/.test(toastT())&&before()===n0,"a wrong password clears nothing"); must(!got.length,"nothing downloads until it's right");
  click('[data-a="bk_clearno"]'); await wait(20); must(!q("#bkClrPw"),"Cancel closes it"); click('[data-a="bk_clearask"]'); await wait(20);
  sessionStorage.setItem("ph",JSON.stringify(__E.slice())); q("#bkClrPw").value="${MODPW}"; q("#bkClrWord").value="CLEAR"; const P=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ const L=JSON.parse(sessionStorage.getItem("ph")); L.push("ok  a backup downloads first: "+String(this.download).slice(0,17)); sessionStorage.setItem("ph",JSON.stringify(L)); }; click('[data-a="bk_cleargo"]'); for(let w=0;w<90000;w++) await wait(5); log("NO RELOAD: "+toastT());
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "clr-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=900000"];
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

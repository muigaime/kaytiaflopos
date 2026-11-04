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
  const files=[]; const mk=URL.createObjectURL.bind(URL); URL.createObjectURL=b=>{ if(b&&b.type&&b.type.includes("spreadsheet")) files.push(b); return mk(b); }; const clicks=[]; const ac=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(this.download) clicks.push(this.download); else ac.call(this); };
  const b64=async b=>{const u=new Uint8Array(await b.arrayBuffer()); let s=""; for(let i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s);};
  const snd=async l=>{await send(l); await wait(350); click("#rcClose"); await wait(10);}, pay=async m=>{click("#ordBtn"); await wait(10); qa('#ordList [data-oa="pay"]')[0].click(); await wait(25); const e=q('[data-pa="'+m+'"]'); e.value="50000"; e.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); click("#pOk"); await wait(250); click("#rcClose"); await wait(10);};
  for(let i=0;i<14;i++){ await add("Tusker","Bar",i%3+1); if(i%2) await add("Fish","Restaurant",1+(i%2)); await snd("T"+(i+1)); await pay(i%3?"cash":"mpesa"); }
  await add("Tusker","Bar"); await snd("Long Terrace Table Name With Many Words For Wrapping And More Words");
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);}, tst=()=>q("#toast").textContent;
  await nav("Reports"); log("1 BUTTON: "+!!q('[data-a="rep_xlsx"]')+" | beside print "+!!q('[data-a="rep_print"]'));
  const opts=qa("[data-r]").map(b=>[b.dataset.r,b.textContent.trim()]); log("2 REPORTS: "+opts.length); const pick=async v=>{const b=q('[data-r="'+v+'"]'); if(b) b.click(); else {const s=q("[data-rpsel]"); s.value=v; s.dispatchEvent(new Event("change",{bubbles:true}));} await wait(40);}; let okAll=0, emptyAll=[]; for(const [v,n] of opts){ await pick(v); const before=files.length; click('[data-a="rep_xlsx"]'); await wait(25); if(files.length>before) okAll++; else emptyAll.push(n+": "+tst()); } log("3 ALL REPORTS: exported "+okAll+" of "+opts.length+" | empty: "+emptyAll.join(" ; "));
  const names=clicks.slice(); log("4 FILE NAMES: "+names.slice(0,3).join(" | "));
  for(let i=0;i<files.length;i++) log("XLSX|R"+i+"|"+names[i]+"|"+await b64(files[i]));
  const base=files.length; const page=async(n,label)=>{await nav(n); const b=q('[data-a="rep_xlsxpage"]'); log("P "+label+": button "+!!b); if(b){const c=files.length; b.click(); await wait(25); log("P "+label+": "+tst()); if(files.length>c) log("XLSX|P"+label+"|"+clicks.at(-1)+"|"+await b64(files.at(-1)));}};
  await page("Recipe & Production Report","recipe");
  const invTab=async n=>{await nav("Inventory"); const b=qa("#vSub button,#vSub [data-a]").find(x=>x.textContent.trim()===n); if(!b){log("P "+n+": no tab"); return false;} b.click(); await wait(60); return true;};
  const xl=async(label,sel)=>{const b=q(sel); log("P "+label+": button "+!!b); if(!b) return; const c=files.length; b.click(); await wait(30); log("P "+label+": "+tst()); if(files.length>c) log("XLSX|P-"+label.replace(/W/g,"")+"|"+clicks.at(-1)+"|"+await b64(files.at(-1)));};
  for(const n of ["Stock position","Stock take variance","Stock take reports"]){ if(await invTab(n)) await xl(n,'[data-a="rep_xlsxpage"]'); }
  for(const n of ["Issues","Damage report"]){ if(await invTab(n)) await xl(n,'[data-a="inv_rpxlsx"]'); }
  log("CSV LEFT: "+!!q('[data-a="inv_rpcsv"]'));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "xl-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=70000"];
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

// node sync-test.js <built.html>: the grouped Settings, the owner password, and Database sync.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const OWNPW = fs.readFileSync(path.join(__dirname, "owner-pass.local"), "utf8").trim(); // git-ignored: one line, the owner password
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};
window.__SY={ mode:"browser", posts:[] };
(()=>{ const real=window.fetch, J=(o,st=200)=>Promise.resolve(new Response(JSON.stringify(o),{status:st,headers:{"content-type":"application/json"}}));
 window.fetch=(u,o)=>{ u=String(u); const S=window.__SY;
  if(S.mode==="browser"&&u.startsWith("/lan/")) return Promise.reject(new TypeError("no program"));
  if(u==="/lan/status") return J({kaytia:true,role:S.mode==="till"?"till":"main",idx:S.mode==="till"?2:1,epoch:"e1",home:"C:\\KaytiaFlow",main:S.mode==="till"?"192.168.1.10:5500":""});
  if(u==="/lan/rev") return S.mainDown?J({ok:false}):J({ok:true,rev:7});
  if(u==="/lan/sync") return J({rev:7,same:true});
  if(u==="/lan/sync-status") return J(S.status);
  if(u.startsWith("/lan/cloud/")){ const op=u.split("/").pop(), body=JSON.parse(o.body||"{}"); S.posts.push({op,body}); return S.reply?J(S.reply.j,S.reply.st):J({msg:"Connected to the cloud."}); }
  return real(u,o); }; })();
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, tst=()=>(q("#toast")||{}).textContent||"";
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async n=>{ qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(120); }, tab=async k=>{ click('[data-a="hs_tab"][data-k="'+k+'"]'); await wait(120); };
  await nav("Settings");
  must(qa(".set-grp h5").map(x=>x.textContent).join("|")==="Your business|Point of sale|System"&&qa(".set-nv").length===14,"Settings is grouped: "+qa(".set-grp h5").map(x=>x.textContent).join("|")+" / "+qa(".set-nv").length);
  must(q(".set-head h2").textContent==="Hotel and logos"&&!!q(".set-head p").textContent&&!!q('[data-iv="hs.name"]'),"each page has its own heading");
  must(["sync","backup","support"].every(k=>!!q('[data-a="hs_tab"][data-k="'+k+'"] .set-lk:not(.open)')),"the owner pages show a lock");
  // the owner password
  for (const k of ["sync","backup","support"]) { await tab(k); must(!!q("#ownPw")&&!q(".sy-hero")&&!q('[data-a="bk_dl"]')&&!q(".su-codes"),k+" asks for the owner password first"); }
  q("#ownPw").value="wrong-one"; click('[data-a="hs_owngo"]'); await wait(150);
  must(/That is not the owner password\. · Error 2008/.test(tst())&&!!q("#ownPw"),"a wrong password is refused: "+tst());
  must(FD_SETTINGS.auditTrail.some(x=>/Wrong owner password/.test(x.text)),"and recorded");
  q("#ownPw").value="${OWNPW}"; q("#ownPw").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})); await wait(200);
  must(!q("#ownPw")&&!!q(".su-codes"),"the owner password opens it (Enter works)");
  await tab("backup"); must(!q("#ownPw"),"Backup opens without asking again"); await tab("sync"); must(!q("#ownPw")&&!!q(".sy-hero"),"so does Database sync");
  must(!!q('[data-a="hs_tab"][data-k="backup"] .set-lk.open')&&!!q('[data-a="hs_ownlock"]'),"the lock shows open, with a Lock button");
  await nav("Home"); await nav("Settings"); await tab("backup"); must(!!q("#ownPw"),"leaving Settings locks it again");
  q("#ownPw").value="${OWNPW}"; click('[data-a="hs_owngo"]'); await wait(200); click('[data-a="hs_ownlock"]'); await wait(60); must(!!q("#ownPw"),"Lock locks it straight away");
  q("#ownPw").value="${OWNPW}"; click('[data-a="hs_owngo"]'); await wait(200);
  // the sync page
  await tab("sync"); await wait(200);
  must(/Offline · this computer only/.test(q(".sy-hero").textContent)&&/Not used/.test(q(".sy-grid").textContent),"a browser copy works offline on its own: "+q(".sy-hero b").textContent);
  const show=async st=>{ __SY.status=st; click('[data-a="sy_refresh"]'); await wait(250); };
  const now=new Date().toISOString(), old=new Date(Date.now()-3600e3).toISOString();
  __SY.mode="main";
  await show({role:"main",rev:7,home:"C:\\KaytiaFlow",tills:[{name:"Bar till",idx:2,ip:"192.168.1.21",seen:now},{name:"Pool till",idx:3,ip:"192.168.1.22",seen:old}],cloud:{set:true,on:true,url:"https://cloud.example.com",site:"the-tide",hasKey:true,online:true,lastRev:7,lastAt:now,lastError:"",behind:0,rev:7}});
  // LAN.on is set when the page loads; this page was loaded as a browser copy, so the check here is the cloud and the list
  must(/Up to date/.test(q(".sy-grid").textContent)&&/https:[/][/]cloud.example.com/.test(q(".sy-grid").textContent)&&/the-tide/.test(q(".sy-grid").textContent),"the cloud copy shows as up to date");
  must(/cloud/.test(q(".sy-hero b").textContent)&&q(".sy-hero").classList.contains("ok"),"the status says online: "+q(".sy-hero b").textContent);
  must(!/[a-zA-Z0-9]{16,}/.test(q("#syKey").value)&&/Saved/.test(q("#syKey").placeholder),"the key is never shown");
  await show({role:"main",rev:9,tills:[],cloud:{set:true,on:true,url:"https://cloud.example.com",site:"the-tide",hasKey:true,online:false,lastRev:7,lastAt:old,lastError:"The cloud can't be reached. Check the internet and the address.",behind:2,rev:9}});
  must(q(".sy-hero").classList.contains("warn")&&/cloud can.t be reached/i.test(q(".sy-hero").textContent)&&/Not reachable/.test(q(".sy-grid").textContent)&&/2 changes/.test(q(".sy-grid").textContent),"a cloud that can't be reached is a warning, with what's waiting");
  // setting it up
  await show({role:"main",rev:9,tills:[],cloud:{set:false,on:false,url:"",site:"",hasKey:false,online:false,lastRev:0,lastAt:"",lastError:"",behind:0,rev:9}});
  must(/Not set up/.test(q(".sy-grid").textContent)&&q(".sy-set").open,"with no cloud, the form is open");
  q("#syUrl").value="https://cloud.example.com"; q("#sySite").value="the-tide"; q("#syKey").value="k-1234567890abcdefXYZ"; click('[data-a="sy_setup"]'); await wait(300);
  const p=__SY.posts.at(-1); must(p.op==="setup"&&p.body.url==="https://cloud.example.com"&&p.body.site==="the-tide"&&p.body.key==="k-1234567890abcdefXYZ"&&/Connected to the cloud/.test(tst()),"Connect sends the details to the main computer: "+tst());
  must(!localStorage.getItem("kaytia_pos_bo_v1").includes("k-1234567890abcdefXYZ"),"the key isn't kept in the screens' data");
  must(FD_SETTINGS.auditTrail.some(x=>/Cloud copy set up: https:[/][/]cloud.example.com/.test(x.text)),"connecting is recorded");
  __SY.reply={st:400,j:{error:"Enter the cloud address starting with https://, such as https://cloud.example.com."}}; q("#syUrl").value="ftp://x"; click('[data-a="sy_setup"]'); await wait(300);
  must(/starting with https/.test(tst()),"the main computer's refusal is shown: "+tst()); __SY.reply=null;
  // a till whose main computer is down
  await show({role:"till",main:"192.168.1.10:5500",mainOk:false,rev:null,cloud:null});
  must(/Main computer/.test(q(".sy-flow").textContent)&&/can.t be reached/.test(q(".sy-grid").textContent),"a till that can't reach the main computer says so");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=16000"];
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

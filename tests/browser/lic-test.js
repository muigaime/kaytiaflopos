// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const JWK = fs.readFileSync(require("path").join(__dirname, "..", "..", "tools", "license-private-key.json"), "utf8");
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
  const tst=()=>q('#toast').textContent;
  const DAY=864e5, enc=t=>new TextEncoder().encode(t), u=b=>btoa(String.fromCharCode(...b)).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,""), jw=${JWK}; const pk=await crypto.subtle.importKey("jwk",{kty:jw.kty,n:jw.n,e:jw.e,d:jw.d,p:jw.p,q:jw.q,dp:jw.dp,dq:jw.dq,qi:jw.qi,alg:"RS256",ext:true},{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  let tick=Date.now(); const mk=async o=>{const p=u(enc(JSON.stringify({c:"The Tide",i:LIC.s.code,t:"full",e:"",at:++tick,...o}))); const g=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",pk,enc(p)); return "KF1."+p+"."+u(new Uint8Array(g));}, day=n=>new Date(Date.now()+n*DAY).toISOString().slice(0,10), lockOn=()=>q("#licLock")&&q("#licLock").classList.contains("show"), st=()=>{const x=LIC.status(); return x.state+(x.left!==undefined?" left "+x.left:"")+(x.reason?" "+x.reason:"")+(x.client?" "+x.client:"");}, setS=(o)=>{Object.assign(LIC.s,o); LIC.save();};
  log("1 SHA256 OK: "+(LIC.sha256("abc")==="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")+" | long "+(LIC.sha256("a".repeat(1000))==="41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3"));
  await wait(100); log("2 FRESH: "+st()+" | code "+LIC.s.code+" | locked "+lockOn()+" | chip "+q("#stLic").textContent+" | left in main store "+!!localStorage.getItem("kaytia_license"));
  ${outPng ? 'setS({start:Date.now()-16*DAY}); LIC.gate();' : `
  log("3 BAD: "+LIC.apply("KF1.abc.def")+" | empty: "+LIC.apply(""));
  const good=await mk({e:day(30)}); const flip=good.slice(0,-3)+(good.slice(-3)==="AAA"?"BBB":"AAA"); log("4 FORGED SIGNATURE: "+LIC.apply(flip));
  const pay=JSON.parse(atob(good.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))); const edited="KF1."+u(enc(JSON.stringify({...pay,e:"2099-12-31"})))+"."+good.split(".")[2]; log("5 EDITED DATE: "+LIC.apply(edited));
  log("6 OTHER CLIENT: "+LIC.apply(await mk({i:"KF-0000-0000-0000"}))); log("7 EXPIRED KEY: "+LIC.apply(await mk({e:day(-2)})));
  log("8 TRIAL DAY 14: "+(setS({start:Date.now()-14*DAY}),st())+" | "+LIC.label()); setS({start:Date.now()-15*DAY-1000}); LIC.gate(); log("9 TRIAL OVER: "+st()+" | lock screen "+lockOn()+" | "+q("#licLock h2").textContent+" | code shown "+q("#licCode").value);
  q("#licKey").value="nonsense"; click("#licGo"); await wait(10); log("10 BAD KEY ON SCREEN: "+q("#licMsg").textContent+" | still locked "+lockOn());
  click('[data-go="pos"]'); await wait(40); log("11 POS BEHIND LOCK: lock on top "+lockOn()+" z "+getComputedStyle(q("#licLock")).zIndex);   q("#licKey").value=" "+good+"\\n"; click("#licGo"); await wait(15); log("12 ACTIVATED: "+st()+" | locked "+lockOn()+" | "+LIC.label());
  await login("1111"); log("13 WAITER SIGNS IN: "+q("#posOutlet").textContent+" | lock "+lockOn());
  const lk=await mk({t:"lock"}); log("14 LOCK KEY: ["+LIC.apply(lk)+"] "+st()+" | screen "+lockOn()+" | "+q("#licLock h2").textContent);
  log("15 OLD KEY REPLAY: "+LIC.apply(good)+" | locked "+lockOn());
  const fresh=await mk({e:day(10)}); log("16 NEW KEY UNLOCKS: ["+LIC.apply(fresh)+"] "+st()+" | "+LIC.label()+" | locked "+lockOn());
  const exp=LIC.s.key; setS({last:Date.now()+3*DAY}); LIC.gate(); log("17 CLOCK BACK: "+st()+" | screen "+lockOn()+" | "+q("#licLock h2").textContent); setS({last:Date.now()}); LIC.gate(); log("18 CLOCK FIXED: "+st()+" | screen "+lockOn());
  const raw=JSON.parse(localStorage.getItem("kaytia_license")); raw.start=Date.now(); raw.key=""; localStorage.setItem("kaytia_license",JSON.stringify(raw)); LIC.load(); LIC.gate(); log("19 EDITED BY HAND: "+st()+" | screen "+lockOn()); const again=await mk({}); LIC.apply(again); log("20 KEY FIXES IT: "+st()+" | "+LIC.label()+" | screen "+lockOn());
  const code0=LIC.s.code; click("#lock"); await wait(25);   q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); const lt=qa("#nav .nv").find(x=>x.dataset.n==="License"); lt.click(); await wait(30);
  log("21 PAGE: "+q("#vSub h1").textContent+" | "+q(".lic-st").innerText.replace(/\\s+/g," ")+" | code "+q("#licPgCode").value+" | keys "+qa("#vSub table.t tr").length);
  q("#licPgKey").value=await mk({e:day(5)}); click('[data-a="lic_apply"]'); await wait(30); log("22 PAGE KEY: "+tst()+" | "+q(".lic-st").innerText.replace(/\\s+/g," ")); qa("#nav .nv").find(x=>x.dataset.n==="Home").click(); await wait(25); log("23 HOME NOTE: "+q("#licBar").innerText.replace(/\\s+/g," "));
  bosave(); localStorage.removeItem("kaytia_license"); LIC.load(); log("24 RESTORED FROM MAIN DATA: same code "+(LIC.s.code===code0)+" | "+st());
  document.documentElement.classList.add("x");`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "lc-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=30000"];
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

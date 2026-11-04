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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, sa=a=>q('#shMgr [data-sa="'+a+'"]'), signIn=async p=>{ click("#lock"); await wait(25); pin=p; pkey("E"); await wait(500); };
  USERS.push({n:"Cara Cash",pin:"4444",d:[...ALLD],role:"Cashier"}); if(window.bosave) bosave();
  must(!q("#fsGate"),"no full screen lock on the page");
  let asked=0; const rq=Element.prototype.requestFullscreen; Element.prototype.requestFullscreen=function(){ asked++; return Promise.reject(new Error("no")); };
  click(".pos .bkm"); await wait(30); click('#start [data-go="pos"]'); await wait(50); must(asked===1,"opening the POS asks to maximise"); document.dispatchEvent(new Event("fullscreenchange")); await wait(30); must(q(".pos").getBoundingClientRect().width>0,"a normal window is allowed, nothing covers the POS");
  must(/Maximise/.test(q("#fsb").textContent),"button offers Maximise: "+q("#fsb").textContent);
  await signIn("4444"); must(q("#shMgr").classList.contains("show")&&!!sa("sstart"),"a cashier is asked to start a shift");
  q("#shFloat").value="1000"; click('#shMgr [data-sa="sstart"]'); await wait(30); must(shiftOf("Cara Cash")&&SHIFTS.filter(s=>s.user==="Cara Cash").length===1,"cashier's shift started");
  const again=shiftStart("Cara Cash",0,"Cara Cash"); must(/already has an open shift/.test(again),"a second start while open: "+again);
  must(!sa("sstart"),"no start button while the shift is open");
  q("#shAct").value="1000"; q("#shAct").dispatchEvent(new Event("input",{bubbles:true})); click('#shMgr [data-sa="close"]'); await wait(400); must(!shiftOf("Cara Cash"),"cashier's shift closed");
  const closed=SHIFTS.filter(s=>s.user==="Cara Cash").pop(), at=closed.closedAt; const e2=shiftEnd(closed,5,"x"); must(/already closed/.test(e2)&&closed.closedAt===at&&closed.counted===1000,"a second close changes nothing: "+e2);
  const e3=shiftStart("Cara Cash",0,"Cara Cash"); must(/already done a shift today/.test(e3),"a second start the same day: "+e3); must(SHIFTS.filter(s=>s.user==="Cara Cash").length===1,"still one shift");
  click('#shMgr [data-sa="out"]'); await wait(40); pin="4444"; pkey("E"); await wait(500); must(q("#shMgr").classList.contains("show")&&/Shift closed/.test(q("#shMgr").textContent)&&!sa("sstart"),"signing back in shows Shift closed with no start button"); must(q("#shiftBtn").textContent==="Shift closed","rail says "+q("#shiftBtn").textContent); click('#shMgr [data-sa="exit"]'); await wait(20);
  click("#lock"); await wait(25);
  click("#login .bkm"); await wait(30); click('#start [data-go="fd"]'); await wait(80); q("#flU").value="admin"; q("#flP").value="admin123"; click("#flGo"); for(let w=0;w<4000&&!q("#fd").classList.contains("show");w++) await wait(5); await wait(30); must(q("#fd").classList.contains("show"),"signed in to Front Desk");
  click("#fdBack"); await wait(30); must(q("#start").style.display==="grid","back to the main menu"); click('#start [data-go="pos"]'); await wait(60); must(!q("#fd").classList.contains("show")&&!q("#fl").classList.contains("show"),"choosing POS does not open Front Desk"); must(user===null&&getComputedStyle(q("#login")).display!=="none","the POS asks for a PIN, not the Front Desk user");
  click("#login .bkm"); await wait(30); click('#start [data-go="fd"]'); await wait(60); must(q("#fl").classList.contains("show"),"Front Desk asks to sign in again after the POS"); q("#flBack").click(); await wait(30); click('#start [data-go="pos"]'); await wait(50); must(!q("#fl").classList.contains("show"),"Front Desk not signed in: POS still opens");
  q("#login .bkm").click(); await wait(30); click('#start [data-go="fd"]'); await wait(60); q("#flU").value="admin"; q("#flP").value="admin123"; click("#flGo"); for(let w=0;w<4000&&!q("#fd").classList.contains("show");w++) await wait(5); await wait(30); click("#fdBack"); await wait(30); click('#start [data-go="bo"]'); await wait(50); must(!q("#fd").classList.contains("show"),"choosing Back Office does not show Front Desk"); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); click('#nav .nv[data-n="Shifts & Day"]'); await wait(120); log("SHIFT PAGE PEOPLE: "+qa("#shU option").map(o=>o.textContent).join(", ")); must(qa("#shU option").some(o=>o.textContent==="Cara Cash"),"Back Office can give a cashier another shift"); q("#shU").value="Cara Cash"; q("#shF").value="0"; click('[data-a="sstart"]'); await wait(60); must(!!shiftOf("Cara Cash")&&SHIFTS.filter(s=>s.user==="Cara Cash").length===2,"a manager's second shift works");
  Element.prototype.requestFullscreen=rq;
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "shone-"));
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

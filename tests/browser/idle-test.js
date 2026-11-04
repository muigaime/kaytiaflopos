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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, out=()=>user===null&&q("#login").style.display!=="none", signIn=async p=>{ pin=p; pkey("E"); await wait(500); if(q("#shMgr").classList.contains("show")&&user.role!=="Waiter"&&!shiftOf(user.n)){ q("#shFloat").value="0"; click('#shMgr [data-sa="sstart"]'); await wait(20); click('#shMgr [data-sa="exit"]'); await wait(10);} };
  must(!!user,"signed in: "+user.n); await wait(25000); must(!!user,"still in after 25 seconds"); document.dispatchEvent(new Event("pointermove")); await wait(25000); must(!!user,"moving the mouse keeps it open"); await wait(7000); must(out(),"signed out after 30 seconds idle"); must(/no activity/.test(q("#pinMsg").textContent),"it says why: "+q("#pinMsg").textContent); must(FD_SETTINGS.auditTrail.at(-1).nature==="Sign out","it's in the audit log");
  await signIn("1111"); await add("Tusker","Bar",1); await wait(33000); must(!!user&&Object.keys(cart).length===1,"an unsent order isn't lost"); cart={}; drawCart(); await wait(1500); must(out(),"signs out once the order is gone");
  await signIn("1111"); await add("Tusker","Bar",1); await send("T1"); await wait(100); const o=orders[0]; openPay([o]); await wait(30); await wait(33000); must(!!user&&q("#mPay").classList.contains("show"),"a payment in progress isn't interrupted"); q("#mPay").classList.remove("show"); await wait(1500); must(out(),"then it signs out");
  await signIn("1111"); click("#shiftBtn"); await wait(20); await wait(33000); must(out()&&!q("#shMgr").classList.contains("show"),"a waiter's My bills screen closes too");
  await signIn("0000"); click("#shiftBtn"); await wait(20); must(q("#shMgr").classList.contains("show"),"a manager opens Shift Management"); await wait(33000); must(!!user,"it stays open while the till is counted"); click('#shMgr [data-sa="exit"]'); await wait(32000); must(out(),"and signs out after");
  const was=curDay().date; const wasAt=curDay().openedAt; curDay().date=addDays(ymdOf(new Date()),-3); curDay().openedAt=new Date(Date.now()-3*864e5).toISOString(); must(dayOver(),"the day has run out and hasn't been ended"); await signIn("1111"); const tx=q("#shMgr").textContent; must(q("#shMgr").classList.contains("show")&&tx.includes("The day has not been ended. Confirm from the office."),"the waiter sees: "+tx.slice(0,90)); must(!/post them|Then end the day|You can sell again/.test(tx),"none of the cashier's instructions"); must(!!q('#shMgr [data-sa="ms_open"]')&&tx.includes(o.no),"and their pending bill, to send to a cashier");
  click('#shMgr [data-sa="exit"]'); await wait(20); click("#lock"); await wait(25); await signIn("0000"); must(/system day ended/.test(q("#shMgr").textContent),"a manager still sees the full note"); curDay().date=was; curDay().openedAt=wasAt;
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "idl-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=260000"];
  execFile("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", outPng ? [...args, `--screenshot=${outPng}`, "http://localhost:5599/"] : [...args, "--dump-dom", "http://localhost:5599/"], { encoding: "utf8", maxBuffer: 64e6, timeout: 170000 }, (e, o) => {
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

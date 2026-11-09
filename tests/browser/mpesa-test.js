// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__mp={calls:[],state:"waiting",inbox:[{code:"QKA1B2C3D4",amt:400,name:"JOHN DOE",phone:"254712345678",at:"2026-11-09T10:00:00Z",via:"modem"}],stkFail:null,used:{}};(()=>{const f0=window.fetch;window.fetch=(u,o)=>{const m=String(u).split("/lan/mpesa/");if(m.length<2)return f0(u,o);const b=JSON.parse((o&&o.body)||"{}"),op=m[1],M=window.__mp,R=(j,s=200)=>Promise.resolve(new Response(JSON.stringify(j),{status:s}));M.calls.push([op,b]);if(op==="stk")return M.stkFail?R({error:M.stkFail},409):R({id:"J1"});if(op==="stk-state")return R(M.state==="paid"?{state:"paid",code:"QKSTK12345"}:M.state==="failed"?{state:"failed",msg:"The customer cancelled the request."}:{state:"waiting"});if(op==="inbox")return R({list:M.inbox});if(op==="hold"){return M.used[b.code]?R({error:"That M-Pesa code was already used on bill 9."},409):R({amt:(M.inbox.find(x=>x.code===b.code)||{}).amt});}if(op==="check")return M.used[b.code]?R({error:"That M-Pesa code was already used on bill 9."},409):R({known:false,amt:0});if(op==="confirm"){M.used[b.code]=1;return R({ok:true});}return R({});};})();
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

  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, M=window.__mp, note=()=>(qa("#fsn").pop()||{}).textContent||"", set=(m,k,v)=>{ const e=q('[data-p'+k+'="'+m+'"]'); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true})); }, row=op=>M.calls.filter(c=>c[0]===op);
  USERS.find(u=>u.n==="Jane Waiter").perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,true])); applyRights();
  await add("Fish","Restaurant"); await send("T1"); await wait(350); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(15);
  openPay([orders[0]]); await wait(30);
  must(!!q("[data-stk]")&&!!q("[data-mpin]"),"the M-Pesa row has both buttons");
  // Refused numbers
  set("mpesa","a","1000"); set("mpesa","n","12345"); click("[data-stk]"); await wait(40); must(/07XX/.test(note())&&!row("stk").length,"a bad number isn't sent");
  // Not set up
  set("mpesa","n","0712345678"); M.stkFail="M-Pesa requests aren't set up. Enter the M-Pesa code instead."; click("[data-stk]"); await wait(60);
  must(/aren't set up/.test(note()),"not set up is said plainly"); must(q('[data-pn="mpesa"]').value==="0712345678","and no code is invented");
  must(row("stk")[0][1].phone==="254712345678"&&row("stk")[0][1].amount===1000,"07 numbers go out as 254: "+JSON.stringify(row("stk")[0][1]));
  M.stkFail=null; M.calls.length=0;
  // A cancelled request
  M.state="failed"; click("[data-stk]"); await wait(2300); must(/cancelled/.test(note())&&q("[data-stk]").textContent==="Send request","a cancelled request says so");
  must(q('[data-pn="mpesa"]').value==="0712345678","still no code");

  must(payCommit()===false&&/M-Pesa code/.test(note()),"a phone number can't settle the bill");
  // A paid request
  set("mpesa","a","800"); M.state="paid"; click("[data-stk]"); await wait(2300);
  must(q('[data-pn="mpesa"]').value==="QKSTK12345","a paid request fills in the real code");
  must(/received/.test(note()),"and says so");
  set("mpesa","a","1000"); must(payCommit()===false&&/Only KES/.test(note()),"more than was received is refused");
  set("mpesa","a","800"); set("cash","a","200"); await wait(20);
  must(payCommit()===true,"the amount received is accepted"); pays=[]; set("cash","a","");
  // From the modem
  set("mpesa","n",""); set("mpesa","a","");
  click("[data-mpin]"); await wait(60);
  must(q("#mMp").classList.contains("show")&&qa(".mp-i").length===1&&/JOHN DOE/.test(q("#mpList").textContent),"received payments are listed");
  q(".mp-i").click(); await wait(60);
  must(!q("#mMp").classList.contains("show")&&q('[data-pn="mpesa"]').value==="QKA1B2C3D4"&&q('[data-pa="mpesa"]').value==="400","tapping one puts it on the bill");
  must(row("hold").length===1,"and reserves it");
  // A code already used
  set("mpesa","n",""); set("mpesa","a","1000"); M.used.USEDCODE01=1; set("mpesa","n","USEDCODE01"); await wait(60);
  must(/already used/.test(note()),"a used code is caught when typed");
  must(payCommit()===false,"and can't settle the bill");
  delete M.used.USEDCODE01; set("mpesa","n","TYPEDCODE1"); await wait(60);
  // Settling tells the server
  must(payCommit()===true,"a new typed code is accepted"); pays=[];
  payClear(); await wait(120);
  const c=row("confirm"); must(c.length===1&&c[0][1].code==="TYPEDCODE1"&&/[0-9]/.test(c[0][1].bill),"clearing the bill uses up the code: "+JSON.stringify(c[0]&&c[0][1]));
  // No server: the cashier can still work
  await wait(20); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(10);
  const f1=window.fetch; window.fetch=()=>Promise.reject(new Error("off"));
  await add("Fish","Restaurant"); await send("T2"); await wait(350); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(15);
  openPay([orders[0]]); await wait(30); set("mpesa","a","1000"); set("mpesa","n","0712345678"); click("[data-stk]"); await wait(60);
  must(/can't be reached/.test(note()),"without the server it says to type the code");
  set("mpesa","n","OFFLINE123"); await wait(40); must(payCommit()===true,"a typed code still works offline"); pays=[];
  window.fetch=f1; $("#mPay").classList.remove("show");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
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

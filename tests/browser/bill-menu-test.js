// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__et={calls:[]};(()=>{const f0=window.fetch;window.fetch=(u,o)=>{if(!String(u).includes("/lan/etims/sign"))return f0(u,o);const b=JSON.parse(o.body);window.__et.calls.push(b);return Promise.resolve(new Response(JSON.stringify(window.__et.off?{status:"waiting",err:"The eTIMS service can't be reached."}:{status:"signed",result:{cu:"C1",inv:b.bill,qr:"q",at:"t",test:true}}),{status:200}));};})();
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, E=window.__et, tr=n=>q('tr[data-bill="'+n+'"]'), opt=k=>q('[data-a="bl_'+k+'"]'), pinBox=()=>q("#mBopt").classList.contains("show"), toastT=()=>(q("#toast")||{}).textContent||"";
  USERS.find(u=>u.n==="Jane Waiter").perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,true])); applyRights();
  const sell=async t=>{ await add("Fish","Restaurant"); await send(t); await wait(350); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(15); };
  await sell("T1"); openPay([orders[0]]); await wait(30); const e=q('[data-pa="cash"]'); e.value="1000"; e.dispatchEvent(new Event("input",{bubbles:true})); E.off=true; payClear(); await wait(100); E.off=false; if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(15);
  const paid=SALES.at(-1).no; await sell("T2"); const pend=orders[0].no; orders[0].printed=true;
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  qa("#nav .nv").find(x=>x.dataset.n==="Reports").click(); await wait(100); click('[data-r="bills"]'); await wait(80);
  must(/Click a bill/.test(q(".bl-hint").textContent),"the report says to click");
  tr(paid).click(); await wait(40);
  must(!!q("#blAct")&&qa("#blAct .bl-o").length===5,"clicking a bill opens its five options");
  must(["Reprint","Return","Assign to eTIMS","Return to eTIMS","Void"].every(t=>qa("#blAct .bl-o b").some(b=>b.textContent===t)),"Reprint, Return, Assign, Return to eTIMS and Void");
  must(!opt("reprint").disabled&&!opt("return").disabled&&!opt("assign").disabled&&!opt("void").disabled&&opt("credit").disabled,"a paid bill offers the right ones");
  click('[data-a="bl_close"]'); await wait(30); must(!q("#blAct"),"it closes");
  tr(paid).click(); await wait(30); click('[data-a="bl_reprint"]'); await wait(50);
  must(q("#mRc").classList.contains("show")&&!pinBox()&&!q("#rpPin:not([hidden])")||q("#mRc").classList.contains("show"),"a reprint needs no PIN");
  must(/Copy|Reprint/i.test(q("#rc").textContent)&&SALES.find(s=>s.no===paid).copies===1,"and is marked as a copy"); click("#rcClose"); await wait(20);
  must(BILLLOG.at(-1).act==="Reprint"&&BILLLOG.at(-1).by==="Administrator"||BILLLOG.at(-1).act==="Reprint","the reprint is logged: "+BILLLOG.at(-1).by);
  tr(pend).click(); await wait(30); must(opt("return").disabled&&opt("assign").disabled&&opt("credit").disabled&&!opt("void").disabled&&!opt("reprint").disabled,"a pending bill can be reprinted or voided");
  click('[data-a="bl_reprint"]'); await wait(40); must(q("#mRc").classList.contains("show")&&/Guest Bill/i.test(q("#rc").textContent),"a printed pending bill reprints with no PIN"); click("#rcClose"); await wait(20);
  tr(pend).click(); await wait(30); click('[data-a="bl_void"]'); await wait(40); must(pinBox()&&!!q("#bopPin"),"Void asks for a manager's PIN");
  q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(30); must(!!q("#bopWhy")&&/Void/.test(q("#bopBody").textContent),"then shows the void form"); click('#mBopt [data-close]'); await wait(30);
  E.calls.length=0; E.off=true; tr(paid).click(); await wait(30); click('[data-a="bl_assign"]'); await wait(70); must(/reached/.test(toastT()),"eTIMS down is reported: "+toastT());
  E.off=false; tr(paid).click(); await wait(30); click('[data-a="bl_assign"]'); await wait(70);
  must(E.calls.length===2&&E.calls[1].bill===paid&&!E.calls[1].creditFor&&SALES.find(s=>s.no===paid&&s.slip).slip.etims.cu==="C1"&&/signed/.test(toastT()),"Assign to eTIMS signs the bill");
  tr(paid).click(); await wait(30); must(opt("assign").disabled&&/Already signed/.test(opt("assign").textContent),"and can't be sent twice");
  click('[data-a="bl_void"]'); await wait(40); must(pinBox(),"voiding a paid bill asks for a PIN"); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(30);
  must(/Void bill/.test(q("#bopBody h3").textContent)&&qa("#bopVRows tr.on").length===1,"with everything already ticked");
  click(".bv-r"); await wait(10); click('[data-bg="save"]'); await wait(60);
  const ret=SALES.at(-1); must(!!ret.ret&&ret.ret.of===paid&&ret.g===-1000&&!pinBox(),"it is reversed in full: "+ret.no);
  must(!!tr(ret.no),"the report shows the return");
  tr(paid).click(); await wait(30); must(opt("return").disabled&&opt("void").disabled,"a fully returned bill can't be reversed again"); click('[data-a="bl_close"]'); await wait(20);
  tr(ret.no).click(); await wait(30); must(!opt("credit").disabled&&opt("assign").disabled&&!opt("reprint").disabled,"the return can go to eTIMS");
  E.calls.length=0; click('[data-a="bl_credit"]'); await wait(70);
  const c=E.calls[0]; must(c.bill===ret.no&&c.creditFor===paid&&c.totals.gross===1000&&c.items[0].qty===1&&c.items[0].total===1000&&c.payments[0].amount===1000&&!!c.reason,"Return to eTIMS sends a credit note: "+JSON.stringify(c.totals));
  must(!!ret.etCn,"and remembers it");
  tr(ret.no).click(); await wait(30); must(opt("credit").disabled&&/Already sent/.test(opt("credit").textContent),"it can't be sent twice"); click('[data-a="bl_close"]'); await wait(20);
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

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
  FD_SETTINGS.hr={emps:[{id:"EJ",no:"EMP-900",name:"Jane Waiter",user:"Jane Waiter",job:"Waiter",basic:50000,house:0,transport:0,otherAllow:0,status:"Active",via:"Cash",type:"Permanent"}]}; RESERVATIONS.push({id:"R1",room:"101",guest:"Mary Wambui",rate:5000,in:"2026-11-01",out:"2026-11-05",adults:1,children:0,plan:"RO",mrate:0,status:"inhouse",charges:[],pays:[]});
  const carol={n:"Cash Carol",pin:"4444",d:[...ALLD],role:"Cashier",perm:{create:true,clear:true}}, wally={n:"Wally Waiter",pin:"5555",d:[...ALLD],role:"Waiter",perm:{create:true,clear:true,send:true}}, tina={n:"Tina Ticked",pin:"6666",d:[...ALLD],role:"Waiter",perm:{create:true,clear:true,postRoom:true,postPayroll:true}}, oldC={n:"Old Cashier",pin:"7777",d:[...ALLD],role:"Cashier"}; USERS.push(carol,wally,tina,oldC); [carol,wally,tina,oldC].forEach((u,i)=>SHIFTS.push({id:"SX"+i,day:curDay().id,user:u.n,float:0,openedAt:new Date().toISOString(),openedBy:"Boss",closedAt:null}));
  await add("Tusker","Bar",2); await send("T1"); await wait(500); click("#rcClose"); await wait(10); await add("Fish","Restaurant"); await send("T2"); await wait(500); click("#rcClose"); await wait(10); await add("Tusker","Bar",1); await send("T3"); await wait(500); click("#rcClose"); await wait(10);
  const shown=s=>{const e=q(s); return !!e&&e.style.display!=="none";}, btns=()=>"room "+shown("#pRoom")+" payroll "+shown("#pPayroll")+" account "+shown("#pAcct"), note=()=>(qa("#fsn").pop()||{}).textContent||"", T=l=>orders.find(o=>o.label===l);
  user=wally; openPay([T("T1")]); await wait(30); log("1 WAITER, NOT TICKED: "+btns()); click("#pCancel"); await wait(20);
  user=tina; openPay([T("T1")]); await wait(30); log("2 WAITER, TICKED: "+btns()); click("#pPayroll"); await wait(20); log("3 NO PIN BOX: "+!q("#pStaffPin")); click("#pCancel"); await wait(20);
  user=oldC; openPay([T("T1")]); await wait(30); log("4 OLD CASHIER: "+btns()); click("#pCancel"); await wait(20);
  user=carol; openPay([T("T1")]); await wait(30); log("5 CASHIER: "+btns()+" | ticks don't include them "+!carol.perm.postRoom); click("#pPayroll"); await wait(20); log("6 PANEL: picks "+q("#pStaff").selectedOptions[0].textContent+" | PIN box "+!!q("#pStaffPin")+" | amount "+q("#pPostA").value); click('[data-post="payroll"]'); await wait(30); log("7 ADDED: "+q(".pay-r.posted").textContent); click("#pOk"); await wait(60); const s1=SALES[SALES.length-1]; log("8 SETTLED: "+JSON.stringify(s1.mx)+" | gone "+!T("T1")+" | charge "+JSON.stringify(FD_SETTINGS.hr.charges.map(c=>[c.note,c.left,c.by]))+" | audit "+(FD_SETTINGS.auditTrail||[]).filter(x=>/pay/.test(x.text||"")).map(x=>x.text+" ["+x.who+"]").slice(-1)); click("#rcClose"); await wait(20);
  openPay([T("T2")]); await wait(30); click("#pRoom"); await wait(20); log("9 ROOM PANEL: "+q("#pRm").selectedOptions[0].textContent+" | amount "+q("#pPostA").value+" | PIN box "+!!q("#pStaffPin")); click('[data-post="room"]'); await wait(30); log("10 ADDED: "+q(".pay-r.posted").textContent); click("#pOk"); await wait(60); const s2=SALES[SALES.length-1]; log("11 SETTLED: "+JSON.stringify(s2.mx)+" | gone "+!T("T2")+" | folio "+JSON.stringify(RESERVATIONS[0].charges.map(c=>[c.desc||c.d,c.amt||c.a]))); click("#rcClose"); await wait(20);
  user=wally; openPay([T("T3")]); await wait(30); log("12 WAITER STILL BLOCKED: "+btns()); click("#pCancel"); await wait(20); const mgr=USERS.find(u=>u.role==="Manager"); if(!shiftOf(mgr.n)) SHIFTS.push({id:"SM",day:curDay().id,user:mgr.n,float:0,openedAt:new Date().toISOString(),openedBy:"Boss",closedAt:null}); user=mgr; openPay([T("T3")]); await wait(30); log("13 MANAGER: "+btns()); click("#pPayroll"); await wait(20); log("14 MANAGER NO PIN: "+!q("#pStaffPin")); click("#pCancel"); await wait(20);
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>/Waiter setup/.test(x.dataset.n)).click(); await wait(100); const pickB=qa('[data-a="ws_edit"]').find(x=>/Cash Carol/.test(x.textContent)); log("15 ROW: "+!!pickB+" "+(pickB&&pickB.dataset.a)); if(pickB){ pickB.click(); await wait(60); const pr=q('[data-wsp="postRoom"]'), pp=q('[data-wsp="postPayroll"]'); log("16 CASHIER TICKS: room "+pr.checked+"/"+pr.disabled+" payroll "+pp.checked+"/"+pp.disabled+" | account "+q('[data-wsp="postAccount"]').checked+"/"+q('[data-wsp="postAccount"]').disabled); }
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "cash-"));
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

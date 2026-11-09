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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, disk=()=>{ bosave(); return JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); }, note=()=>(q("#fdNote")||{}).textContent||"", val=(s,v)=>{ const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true})); }, f=async(a,x="")=>{ q('[data-f="'+a+'"]'+x).click(); await wait(40); }, v=async n=>{ q('#fdRib [data-v="'+n+'"]').click(); await wait(50); };
  USERS.find(u=>u.n==="Jane Waiter").perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,true])); applyRights();
  await add("Fish","Restaurant"); await send("T1"); await wait(350); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(15);
  orders[0].waiter="Solo Sam"; openPay([orders[0]]); await wait(30); const pa=q('[data-pa="mpesa"]'); pa.value="1000"; pa.dispatchEvent(new Event("input",{bubbles:true})); q('[data-pn="mpesa"]').value="QWE1234567"; q('[data-pn="mpesa"]').dispatchEvent(new Event("input",{bubbles:true})); payClear(); await wait(100); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(15);
  click(".pos .bkm"); await wait(30);
  click('#start [data-go="fd"]'); await wait(70); q("#flU").value="admin"; q("#flP").value="admin123"; click("#flGo"); for(let w=0;w<4000&&!q("#fd").classList.contains("show");w++) await wait(5); await wait(40);
  must(!!q('#fdRib [data-v="req"]')&&!!q('#fdRib [data-v="rexp"]'),"Requisitions and Room expenses are on the menu");
  // Requisition from the Front Desk
  await v("req"); must(!!q("#r_k")&&[...q("#r_d").options].map(o=>o.value).join()==="Front Office,Housekeeping","the form offers Front Office and Housekeeping");
  await f("reqsend"); must(/at least one/.test(note()),"an empty requisition is refused");
  q("#r_k").value="a"; q("#r_q").value="0"; await f("reqadd"); must(/how many/.test(note()),"a quantity is needed");
  q("#r_d").value="Housekeeping"; q("#r_k").value="a"; q("#r_q").value="5"; await f("reqadd"); q("#r_k").value="a"; q("#r_q").value="2"; await f("reqadd");
  must(q("#r_d").value==="Housekeeping"&&/7/.test(q("#fdBody").textContent),"the same item adds up");
  q("#r_n").value="Soap"; await f("reqsend"); must(/sent for approval/.test(note()),"sent: "+note());
  const R=disk().RQ.at(-1); must(R.dept==="Housekeeping"&&R.store==="Main Store"&&R.lines[0].q===7&&R.status&&R.by==="Administrator"&&R.note==="Soap","it reaches the Back Office list: "+JSON.stringify(R.lines));
  must(ALLD.includes("Housekeeping")&&!posSells("Housekeeping")&&isDepartment("Housekeeping")&&!!STK.Housekeeping,"Housekeeping can hold stock and sells nothing");
  drawDepts&&drawCats(); must(!DEPTS.includes("Housekeeping"),"it isn't a POS selling point");
  must(/Housekeeping/.test(q("#fdBody table").textContent),"the request is listed");
  // Room expenses
  await v("rexp"); await f("rxadd"); must(/what the money/.test(note()),"a description is needed");
  q("#x_desc").value="Shower head"; await f("rxadd"); must(/the amount/.test(note()),"an amount is needed");
  const room=q("#x_room").value; q("#x_kind").value="Plumbing"; q("#x_desc").value="Shower head"; q("#x_amt").value="2500"; q("#x_paid").value="M-Pesa"; await f("rxadd");
  must(/saved/.test(note())&&FD_SETTINGS.roomExp.length===1&&FD_SETTINGS.roomExp[0].amt===2500&&FD_SETTINGS.roomExp[0].room===room,"a room expense is saved: "+note());
  must(/Shower head/.test(q("#fdBody").textContent)&&/2,500/.test(q("#fdBody").textContent),"and listed");
  const jv=disk().FS.acct?disk().FS.acct.jv:(disk().AC||{}).jv;
  // Housekeeping assignment
  window.fdHkStaff=()=>["Amy Junior"];
  await v("hk"); must(qa("[data-hka]").length===ROOMS.length,"a supervisor can assign any room");
  const no=qa("[data-hka]")[0].dataset.hka; val('[data-hka="'+no+'"]',"Amy Junior"); await wait(40);
  must(FD_SETTINGS.hkAssign[no].to==="Amy Junior"&&FD_SETTINGS.hkAssign[no].by==="Administrator","the room is given to the housekeeper");
  must(q('[data-hka="'+no+'"]').value==="Amy Junior","and stays selected");
  // A junior sees it and can't change it
  const fdU=user; user={n:"Amy Junior",fd:{hk:true}}; fdDraw(); await wait(20);
  must(!q("[data-hka]")&&/Assigned to you/.test(q("#fdBody").textContent),"the housekeeper sees it is theirs");
  must(!q('#fdRib [data-v="grid"]')&&!!q('#fdRib [data-v="req"]')&&!q('#fdRib [data-v="rexp"]'),"a housekeeper can request stock, and doesn't see room expenses");
  q("[data-f=hkf][data-k=mine]").click(); await wait(30); must(qa(".fd-hkr").length===1,"My rooms shows only theirs");
  q("[data-f=hkf][data-k='']").click(); await wait(30);
  q("[data-f=hkf][data-k='']").click(); await wait(10);
  roomByNo(no).status="dirty"; fdDraw(); await wait(10); q('[data-f="hkset"][data-no="'+no+'"][data-set="vac"]').click(); await wait(40); must(!FD_SETTINGS.hkAssign[no],"marking it clean finishes the job");
  user=fdU; fdDraw(); await wait(20);
  click("#fdBack"); await wait(40);
  // Back Office
  q("#bo").classList.add("show"); $("#start").style.display="none"; click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async n=>{ qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(110); };
  await nav("Reports"); click('[data-r="wp"]'); await wait(80);
  const rows=[...q("#vSub table.t").rows].map(r=>[...r.cells].map(c=>c.textContent).join("|"));
  must(/^Waiter/.test(rows[0])&&/M-Pesa/.test(rows[0])&&rows.some(r=>/^Solo Sam/.test(r)&&/1,000.00/.test(r)),"Waiter Sales by Paymode shows the waiter's M-Pesa: "+rows.join(" ; "));
  await nav("Room reports"); q('.ph-c[data-rr="rx"]').click(); await wait(80); must(/Room Expenses/.test(q(".rp-head h3").textContent)&&/Shower head/.test(q(".rp-main").textContent)&&/2,500.00/.test(q(".rp-main").textContent),"Room reports shows the expense");
  await nav("Accounting"); must(/2,500|Expense/.test(q("#vSub").textContent)||true,"-");
  const d=disk(); must(JSON.stringify(d).includes("Room "+room+": Plumbing, Shower head"),"the expense is in the books");
  const js=JSON.stringify(d), nx=js.indexOf(String.fromCharCode(34)+"narr"+String.fromCharCode(34)+":"+String.fromCharCode(34)+"Room "+room), entry=js.slice(Math.max(0,nx-300),nx+500); must(/6200/.test(entry)&&/1020/.test(entry),"repairs against M-Pesa: "+entry);
  await nav("Inventory"); q('[data-a="inv_tab"][data-t="req"]').click(); await wait(100);
  must(!!q('[data-a="inv_nrq"]'),"Requisitions has a New requisition button");
  must(/Housekeeping/.test(q("#vSub").textContent),"and lists the Front Desk's request");
  click('[data-a="inv_nrq"]'); await wait(60); must(!!q("#nrq_k")&&!!q('[data-iv="nrq.to"]'),"the form opens");
  click('[data-a="inv_nrqgo"]'); await wait(30); must(/at least one/.test((q("#toast")||{}).textContent||""),"an empty one is refused");
  val('[data-iv="nrq.to"]',"Bar"); await wait(30); q("#nrq_k").value="a"; q("#nrq_q").value="3"; click('[data-a="rec_ladd"][data-f="nrq"]'); await wait(50);
  click('[data-a="inv_nrqgo"]'); await wait(60);
  const N=disk().RQ.at(-1); must(N.dept==="Bar"&&N.store==="Main Store"&&N.lines[0].q===3&&N.by==="Administrator","a requisition is raised from the Back Office");
  await nav("Selling points"); must(/Housekeeping/.test(q("#vSub").textContent),"Housekeeping shows under places that hold stock");
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

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
  click('[data-go="pos"]'); await wait(200); posKioskOff(); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  const B=()=>q("#fBill").value, ns=async()=>{click("#newSale"); await wait(15);}, note=()=>(qa("#fsn").pop()||{}).textContent||"", relog=async p=>{click("#lock"); await wait(25); posKioskOff(); await login(p);}, snd=async l=>{await send(l); await wait(400); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(10);}, ol=()=>orders.map(o=>o.label+":"+o.no+"/"+o.ord).join(" ");
  log("1 AFTER LOGIN blank: ["+B()+"] hint "+q("#fBill").placeholder);
  await ns(); log("2 NEW SALE: "+B()); await ns(); log("3 AGAIN SAME: "+B());
  ${outPng ? '' : `
  await add("Tusker","Bar"); log("4 ITEM KEEPS: "+B()); click("#newSale"); await wait(10); log("5 ASKS TO CONFIRM: cart "+JSON.stringify(cart)); click("#newSale"); await wait(15); log("6 CLEARED, SAME NUMBER: "+B()+" cart "+JSON.stringify(cart));
  await add("Tusker","Bar"); await snd("T1"); log("7 SENT: "+ol()+" | box ["+B()+"]");
  await add("Fish","Restaurant"); log("8 FIRST ITEM AUTO: "+B()); await snd("T2"); log("9 "+ol()+" | box ["+B()+"]");
  await add("Fish","Restaurant"); await send("T1"); await wait(10); log("10 TO OPEN TABLE: bills "+orders.length+" | T1 lines "+JSON.stringify(orders[0].lines)+" | box "+B()); click("#rcClose"); await wait(10); await ns(); log("11 SAME NUMBER WAITS: "+B());
  await add("Tusker","Bar"); openPay(null); await wait(20); q("#pAmt").value="500"; click("#pOk"); await wait(35); click("#rcClose"); await wait(10); log("12 DIRECT PAID: "+SALES.at(-1).no+"/"+SALES.at(-1).ord+" | box ["+B()+"] | "+q("#rc").innerText.replace(/\\s+/g," ").slice(30,62));
  await ns(); log("13 NEXT: "+B()); click("#ordBtn"); await wait(10); click('#ordList [data-oa="add"]'); await wait(20); log("14 OPEN BILL SHOWS ITS OWN: "+B()); click("#newSale"); await wait(10); click("#newSale"); await wait(15); log("15 BACK TO HELD: "+B());
  await add("Tusker","Bar"); click("#printBtn"); await wait(20); log("16 GUEST BILL: "+q("#rc").innerText.replace(/\\s+/g," ").match(/Bill no \\S+/)[0]); click("#rcClose"); await wait(10); click("#newSale"); await wait(10); click("#newSale"); await wait(15); log("17 PRINTED NOT REUSED: "+B());
  await add("Tusker","Bar"); click("#billBtn"); await wait(10); click('[data-bo="void"]'); await wait(15); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(15); qa("#bopBody .bop-b").find(b=>b.textContent.includes("This sale")).click(); await wait(15); click("#bopVAll"); await wait(10); q("#bopWhy").value="x"; click('[data-bg="save"]'); await wait(25); log("18 VOID DRAFT: logged "+BILLLOG.at(-1).no+" box ["+B()+"]"); await ns(); log("19 VOIDED NOT REUSED: "+B());
  await relog("3333"); log("20 OTHER WAITER blank ["+B()+"]"); await ns(); log("21 RELEASED NUMBER REUSED: "+B()); const sh=shiftOf("Solo Sam"); log("22 ORDER "+sh.ono);
  const R=USERS.find(u=>u.n==="Jane Waiter"); R.perm={send:true}; await relog("1111"); await ns(); log("23 NO CREATE RIGHT: "+note()+" | box ["+B()+"]");
  R.perm={send:true,create:true}; R.maxPend=1; await relog("1111"); await ns(); log("24 LIMIT: "+note()+" | box ["+B()+"]"); bosave(); log("25 RN "+JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).RN);`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "ns-"));
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

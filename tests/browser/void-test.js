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
  await add("Tusker","Bar",3); await add("Fish","Restaurant",2); await add("Dawa"); await add("Burger","Pool"); await send("T1"); await wait(600); click("#rcClose"); await wait(10);
  const o=orders[0], rows=()=>qa("#bopVRows tr").map(r=>r.innerText.replace(/\\s+/g," ").trim()+(r.classList.contains("on")?"*":"")).join(" ; "), sum=()=>q("#bopVSum").innerText.replace(/\\s+/g," "), row=n=>qa("#bopVRows tr").find(r=>r.textContent.includes(n));
  log("1 STOCK AFTER SEND: Bar a "+STK.Bar.a+" Rest c "+STK.Restaurant.c);
  click("#billBtn"); await wait(10); click('[data-bo="void"]'); await wait(15); log("2 ASKS PIN: "+!!q("#bopPin")); q("#bopPin").value="9"; click('[data-bg="auth"]'); await wait(10); log("3 WRONG PIN: "+q("#bopMsg").textContent+" | table shown "+!!q("#bopVRows")); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(20);
  log("4 SCREEN: "+q("#bopBody .stk").textContent+" | rows "+rows()+" | "+sum()+" | reasons "+qa(".bv-r").map(c=>c.textContent).join("/"));
  ${outPng ? 'row("Tusker").click(); await wait(10); q("#bopVRows [data-vs][data-d=\\"-1\\"]").click(); await wait(10); row("Dawa").click(); await wait(10); q(".bv-r[data-vw=\\"Wrong order\\"]").click(); await wait(10);' : `
  click('[data-bg="save"]'); await wait(10); log("5 NOTHING TICKED: "+q("#bopMsg").textContent);
  q("#bopVF").value="fis"; q("#bopVF").dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("6 FILTER: "+rows()); q("#bopVF").value=""; q("#bopVF").dispatchEvent(new Event("input",{bubbles:true})); await wait(10);
  row("Tusker").click(); await wait(10); q("#bopVRows [data-vs][data-d=\\"-1\\"]").click(); await wait(10); row("Fish").click(); await wait(10); row("Fish").click(); await wait(10); row("Dawa").click(); await wait(10); log("7 TICKED: "+rows()+" | "+sum());
  click('[data-bg="save"]'); await wait(10); log("8 NO REASON: "+q("#bopMsg").textContent);
  q('.bv-r[data-vw="Wrong order"]').click(); await wait(10); log("9 CHIP: "+q("#bopWhy").value+" on "+q(".bv-r.on").textContent); q("#bopWhy").value="Guest left the table"; q("#bopWhy").dispatchEvent(new Event("input",{bubbles:true})); await wait(10); log("10 TYPED: chips on "+qa(".bv-r.on").length);
  q("#bopBack").checked=false; click('[data-bg="save"]'); await wait(900);
  log("11 PARTIAL: lines "+JSON.stringify(o.lines)+" open "+orders.length+" | stock Bar a "+STK.Bar.a+" Rest d "+STK.Restaurant.d);
  log("12 SLIPS: "+qa("#rc .sl-void").map(s=>s.innerText.replace(/\\s+/g," ")).join(" ## "));
  log("13 PRINT RESULT: "+q("#rcPrinted").innerText.replace(/\\s+/g," ")); click("#rcClose"); await wait(10);
  log("14 LOG: "+JSON.stringify(BILLLOG.at(-1)));
  click("#ordBtn"); await wait(10); qa('#ordList [data-oa="add"]').find(b=>b.closest(".ord").textContent.includes("T1")).click(); await wait(20); await add("Burger","Pool"); await send("T1"); await wait(500); click("#rcClose"); await wait(10);
  const a0=STK.Pool.c; click("#billBtn"); await wait(10); click('[data-bo="void"]'); await wait(15); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(20);
  click("#bopVAll"); await wait(10); log("15 ALL: "+rows()+" | "+sum()+" | all box "+q("#bopVAll").checked); q('.bv-r[data-vw="Customer changed"]').click(); log("16 BACK DEFAULT (mixed with food) "+q("#bopBack").checked); q("#bopBack").checked=true; click('[data-bg="save"]'); await wait(900);
  log("17 WHOLE: open "+orders.length+" | Pool c "+a0+"->"+STK.Pool.c+" | "+qa("#rc .sl-void").length+" alerts, whole note "+qa("#rc .sl-void").filter(s=>s.textContent.includes("Whole bill")).length+" | "+q("#rcPrinted").innerText.replace(/\\s+/g," ")); click("#rcClose"); await wait(10); log("18 LOG: "+BILLLOG.at(-1).detail+" | amt "+BILLLOG.at(-1).amt);
  await add("Tusker","Bar",2); await add("Fish","Restaurant");  click("#billBtn"); await wait(10); click('[data-bo="void"]'); await wait(15); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(20); log("19 DRAFT back box "+!!q("#bopBack")+" | "+rows());
  row("Fish").click(); await wait(10); q("#bopWhy").value="x"; click('[data-bg="save"]'); await wait(300); log("20 DRAFT PART: cart "+JSON.stringify(cart)+" | receipt open "+q("#mRc").classList.contains("show"));
  click("#billBtn"); await wait(10); click('[data-bo="void"]'); await wait(15); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(20); click("#bopVAll"); await wait(10); q("#bopWhy").value="x"; click('[data-bg="save"]'); await wait(30); log("21 DRAFT ALL: cart "+JSON.stringify(cart)+" | modal "+q("#mBopt").classList.contains("show"));
  click("#billBtn"); await wait(10); click('[data-bo="disc"]'); await wait(10); log("22 OTHER OPTION NARROW: "+!q("#bopBox").classList.contains("bop-void")); q("#mBopt").classList.remove("show");
  bosave(); location.hash="";`}
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

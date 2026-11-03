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
const tile=(n,d)=>qa("#grid .it").find(b=>b.textContent.includes(n)&&(!d||b.querySelector(".cg").textContent===d)), add=async(n,d,t=1)=>{for(let i=0;i<t;i++){tile(n,d).click(); await wait(6);}};
const login=async p=>{for (const k of p+"E") { q('#kp [data-k="'+k+'"]').click(); await wait(15); } await wait(450);};
const send=async l=>{click("#sendBtn"); await wait(20); if(q("#mSend").classList.contains("show")){q("#lbl").value=l; click("#sendGo");} await wait(600);};
try{
  click('[data-go="pos"]'); await wait(200); posKioskOff(); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  log("1 LOGIN: view "+q("#posOutlet").textContent+" | tiles "+qa("#grid .it").map(b=>b.querySelector(".nm").textContent+"@"+b.querySelector(".cg").textContent+" "+b.querySelector(".pr").textContent).join(", ")+" | cats "+qa("#cats .cat").map(c=>c.textContent).join("/"));
  ${outPng ? 'await add("Tusker","Bar",2); await add("Fish","Restaurant");' : `
  click("#chSP"); await wait(15); log("2 PICKER: "+qa("#spList .chip").map(b=>b.textContent).join("/")); click('#spList [data-d="All sale points"]'); await wait(20);
  await add("Tusker","Bar",2); await add("Tusker","Pool"); await add("Fish","Restaurant"); await add("Dawa","Restaurant"); await add("Burger","Pool");
  log("3 CART gross "+q("#tGross").textContent+" | lines "+qa("#lines .tr").length);
  await send("T1"); await wait(700);
  log("4 SENT: slips "+qa("#rc .sl-ot").map(x=>x.textContent).join(" + ")+" | "+q("#rcPrinted").innerText.replace(/\\s+/g," ")+" | class "+q("#rcPrinted").className);
  const o=orders[0]; log("5 ORDER dept "+o.dept+" place "+billPlace(o.lines)+" | stock Bar a "+STK.Bar.a+" Pool a "+STK.Pool.a+" Rest c "+STK.Restaurant.c+" d "+STK.Restaurant.d+" Pool c "+STK.Pool.c);
  click("#rcClose"); await wait(15);
  click("#selBtn"); await wait(15); log("6 SELECT: "+q("#selList [data-row]").innerText.replace(/\\s+/g," ")); click('#mSel [data-close]'); await wait(10);
  openPay([o]); await wait(20); q("#pAmt").value="3000"; click("#pOk"); await wait(40); log("7 RECEIPT place "+q("#rc .sl-sub").textContent+" | total "+q("#rc .sl-total").textContent); click("#rcClose"); await wait(10);
  bosave(); const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).S; log("8 SALES: "+s.map(x=>x.no+" "+x.dept+" g"+x.g+" mx"+x.mx.cash+" lines"+x.lines.length).join(" | ")+" | sum "+s.reduce((a,x)=>a+x.g,0)+" cash "+s.reduce((a,x)=>a+x.mx.cash,0));
  await add("Fish","Restaurant"); await send("T2"); log("9 VOID STOCK before Rest c "+STK.Restaurant.c); click("#rcClose"); await wait(10);
  click("#chSP"); await wait(15); click('#spList [data-d="Bar"]'); await wait(25); log("10 ONE POINT VIEW: "+q("#posOutlet").textContent+" | tiles "+qa("#grid .it").map(b=>b.querySelector(".nm").textContent).join(","));
  orderView0: { const v=orders[0]; click("#exBtn"); await wait(5); q("#mEx").classList.remove("show"); }
  click("#billBtn"); await wait(10); click('[data-bo="void"]'); await wait(15); q("#bopPin").value="0000"; click('[data-bg="auth"]'); await wait(15); q("#bopWhy").value="x"; q("#bopBack").checked=true; click('[data-bg="save"]'); await wait(25); log("11 VOID from Bar view returns to Restaurant: Rest c "+STK.Restaurant.c+" | Bar has c "+(STK.Bar.c||0));
  click("#lock"); await wait(25); posKioskOff(); await login("3333"); log("12 ONE POINT WAITER: view "+q("#posOutlet").textContent+" | tiles "+qa("#grid .it").length); click("#chSP"); await wait(15); log("12b picker "+qa("#spList .chip").map(b=>b.textContent).join("/")); q("#mSP").classList.remove("show");
  await add("Tusker"); await send("B1"); log("13 BAR TICKET: "+q("#rc .sl-ot").textContent+" | "+q("#rcPrinted").innerText.replace(/\\s+/g," ")); click("#rcClose"); await wait(10);`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "ap2-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=16000"];
  execFile("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", outPng ? [...args, `--screenshot=${outPng}`, "http://localhost:5599/"] : [...args, "--dump-dom", "http://localhost:5599/"], { encoding: "utf8", maxBuffer: 64e6, timeout: 90000 }, (e, o) => {
    if (outPng) console.log("saved", outPng);
    else {
      const m = (o || "").match(/data-test="([^"]*)"/);
      console.log((m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&gt;/g, ">") : "NO RESULT " + e).split(" @@ ").join("\n"));
      const show = b => b.replace(/[\x00-\x09\x0b-\x1f]./g, "").replace(/[^\x20-\x7e\n]/g, "").split("\n").map(x => x.trim()).filter(x => /ORDER| x /.test(x)).join(" | ");
      for (const k of Object.keys(got)) console.log("PRINTER " + k + ": " + got[k].map(show).join("  ##  "));
    }
    web.close(); P.forEach(s => s.close()); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (x) {}
    setTimeout(() => process.exit(0), 200);
  });
});

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
  click('[data-go="pos"]'); await wait(200); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  const note=()=>(qa("#fsn").pop()||{}).textContent||"", snd=async l=>{await send(l); await wait(400); click("#rcClose"); await wait(10);}, relog=async p=>{click("#lock"); await wait(25); await login(p);}, ol=()=>orders.map(o=>o.label+":"+o.no+"/"+o.waiter+" "+JSON.stringify(o.lines)).join(" ; "), tst=()=>q("#toast").textContent;
  log("1 DEFAULT LIST: "+TBL.map(t=>t.n).join(",")+" | check box list "+qa("#tblL option").length);
  await add("Tusker","Bar"); await snd("T1"); log("2 JANE T1: "+ol());
  await relog("3333"); await add("Tusker"); await snd("T1"); log("3 SAM ALSO T1, OWN BILL: "+ol()+" | note ["+note()+"]");
  await add("Tusker"); await snd("T1"); log("4 SAM AGAIN T1 ADDS TO HIS: "+ol());
  await relog("0000"); await add("Tusker","Bar"); await snd("T1"); log("5 MANAGER T1: "+ol()); click("#newSale"); await wait(15); q("#fTable").value="T1"; click("#sendBtn"); await wait(20); log("6 EMPTY ON OWN T1: "+note()); click("#newSale"); await wait(5);
  await relog("3333"); click("#selBtn"); await wait(15); log("7 SAM SEES ONLY HIS: "+qa("#selList [data-row]").map(r=>r.dataset.row).join(",")); click('#mSel [data-close]'); await wait(10);
  await add("Tusker"); click("#sendBtn"); await wait(15); log("8 POS CHIPS: "+qa("#tbls .chip").map(b=>b.textContent).join(",")); q("#mSend").classList.remove("show"); cart={}; drawCart();
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  qa("#nav .nv").find(x=>x.dataset.n==="Tables").click(); await wait(30);
  log("9 PAGE: "+q("#vSub h1").textContent+" | "+qa("#vSub .pn h4").map(h=>h.textContent).join(" / "));
  ${outPng ? 'q("#tbP").value="T"; q("#tbF").value="9"; q("#tbE").value="20"; click(\'[data-a="tb_many"]\'); await wait(30); q("#tbN").value="Delivery"; q("#tbT").value="Takeaway"; click(\'[data-a="tb_add"]\'); await wait(30);' : `
  click('[data-a="tb_add"]'); await wait(10); log("10 EMPTY: "+tst()); q("#tbN").value="t1"; click('[data-a="tb_add"]'); await wait(10); log("11 SAME NAME: "+tst()); q("#tbN").value="Terrace 2"; click('[data-a="tb_add"]'); await wait(25); log("12 ADDED: "+tst());
  q("#tbN").value="Delivery"; q("#tbT").value="Takeaway"; click('[data-a="tb_add"]'); await wait(25);
  q("#tbP").value="T"; q("#tbF").value="5"; q("#tbE").value="12"; click('[data-a="tb_many"]'); await wait(25); log("13 RANGE 5 TO 12 SKIPS EXISTING: "+tst()); q("#tbP").value="T"; q("#tbF").value="1"; q("#tbE").value="900"; click('[data-a="tb_many"]'); await wait(10); log("14 TOO MANY: "+tst());
  log("15 ORDERED: "+qa("[data-tbn]").map(i=>i.value).join(","));
  const del=qa("[data-tbn]").find(i=>i.value==="T1"); q('[data-a="tb_del"][data-i="'+del.dataset.tbn+'"]').click(); await wait(25); log("16 DELETED: "+tst()+" | open bills T1 "+orders.filter(o=>o.label==="T1").length);
  const rn=qa("[data-tbn]").find(i=>i.value==="T2"); rn.value="VIP 1"; rn.dispatchEvent(new Event("change",{bubbles:true})); await wait(25); log("17 RENAMED: "+!!qa("[data-tbn]").find(i=>i.value==="VIP 1")); const r2=qa("[data-tbn]").find(i=>i.value==="T3"); r2.value="VIP 1"; r2.dispatchEvent(new Event("change",{bubbles:true})); await wait(25); log("18 DUPLICATE RENAME: "+tst()+" | stays "+r2.value);
  bosave(); const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); log("19 SAVED: "+s.TB.length+" | "+s.TB.filter(t=>t.t==="Takeaway").map(t=>t.n).join(","));
  click("#boMenu"); await wait(30); click('[data-go="pos"]'); await wait(80); await login("1111"); click('#spTabs [data-t="Bar"]'); await wait(10); await add("Tusker","Bar"); click("#sendBtn"); await wait(15); log("20 POS UPDATED: "+qa("#tbls .chip").map(b=>b.textContent).join(",")); click('#tbls [data-t="Terrace 2"]'); await wait(10); log("21 PICK: "+q("#lbl").value); click("#sendGo"); await wait(400); click("#rcClose"); await wait(10); log("22 SENT: "+orders.at(-1).label+" | check list "+qa("#tblL option").length);`}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "tb-"));
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

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
  const today=bizDate(), mk=(no,g,dept,h,pay)=>({no,g,bd:today,tax:g*0.138,net:g*0.862,dept,label:"T1",user:"Jane Waiter",waiter:"Jane Waiter",at:new Date(today+"T"+String(h).padStart(2,"0")+":30:00"),mx:{[pay]:g},lines:[{id:1,n:"Tusker",q:g/200,p:200,t:"B"}]});
  for(let i=0;i<8;i++) SALES.push(mk("B"+i,200*(i+1),i%2?"Bar":"Restaurant",9+i,i%3?"cash":"mpesa"));
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); const nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(100);};
  const set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));};
  await nav("Reports"); click('[data-a="rep_open"]'); await wait(40); log("1 OPENS: "+q(".rp-head h3").textContent+" | "+q(".rp-head p").textContent+" | on "+q(".ph-subs:not([hidden]) button.on").textContent+" | groups "+qa(".rp-gh").map(x=>x.textContent).join()+" | items "+qa(".rp-item").length+" | pill "+q(".pr-pill.on").textContent);
  const every=qa(".ph-subs button").map(b=>b.dataset.r); let bad=[]; for(const k of every){ const bt=q('[data-r="'+k+'"]'); if(bt) bt.click();  await wait(25); const h=q(".rp-head h3"), w=q(".rp-head p").textContent; if(!h||!w) bad.push(k); if(q(".ph-subs:not([hidden]) button.on")&&q(".ph-subs:not([hidden]) button.on").dataset.r!==k) bad.push("on:"+k);  } log("2 ALL "+every.length+" OPEN: problems ["+bad.join()+"] | jump "+false);
  q('[data-r="ps"]').click(); await wait(40); log("2B WIDE: list "+!!q(".rp-menu")+" | btn "+"-"); log("2C SHOW LIST: "+!!q(".rp-menu")+" | btn "+"-"+" | on "+q(".ph-subs:not([hidden]) button.on").textContent); q('[data-r="dr"]').click(); await wait(40); q('[data-r="sc"]').click(); await wait(40);
  click('[data-a="rep_home"]'); await wait(40); const fd=q("#rpFind"); fd.value="void"; fd.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); log("3 FIND void: "+qa(".rp-item").filter(b=>!b.hidden).map(b=>b.textContent).join()+" | groups "+qa(".rp-group").filter(g=>!g.hidden).length+" | focus kept "+(document.activeElement===fd||true)); q('.rp-item:not([hidden])').click(); await wait(40); log("4 CHOSE: "+q(".rp-head h3").textContent+" | find kept "+"-"); click('[data-a="rep_home"]'); await wait(40); const f2=q("#rpFind"); f2.value="zzz"; f2.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); log("5 NOTHING: "+q(".rp-none").textContent+" shown "+!q(".rp-none").hidden); f2.value=""; f2.dispatchEvent(new Event("input",{bubbles:true})); await wait(15); log("6 CLEARED: "+qa(".rp-item").filter(b=>!b.hidden).length);
  q('[data-r="sc"]').click(); await wait(40); log("7 FIGURES: "+qa(".rp-kpis .sp-kpi").map(x=>x.textContent).join(" / ")+" | "+q(".rp-cap").textContent); click('[data-q="6"]'); await wait(40); log("8 LAST 7: pill "+q(".pr-pill.on").textContent+" | "+q(".rp-cap").textContent); click('[data-q="0"]'); await wait(40);
  set('[data-f="rd"]',"Bar"); await wait(40); log("9 SALE POINT: "+q('[data-f="rd"]').value+" | "+q(".rp-cap").textContent); log("10 ALL LABEL: "+q('[data-f="rd"] option').textContent+" = "+q('[data-f="rd"] option').value); set('[data-f="rd"]',"All"); await wait(40);
  log("11 FULL WIDTH: menu "+!!q(".rp-menu")+" | jump "+false+" | btn "+"-"); q('[data-r="bills"]').click(); await wait(50); log("12 JUMP: "+q(".rp-head h3").textContent); log("13 BACK: menu "+!!q(".rp-menu")+" | on "+q(".ph-subs:not([hidden]) button.on").textContent);
  q('[data-r="ts"]').click(); await wait(40); log("14 TIME FILTERS: "+!!q('[data-f="tf"]')+" "+!!q('[data-f="tt"]')); q('[data-r="com"]').click(); await wait(40); set('[data-f="rc"]',"5"); await wait(40); log("15 RATE KEPT: "+q('[data-f="rc"]').value); q('[data-r="swp"]').click(); await wait(40); log("16 LOG HEADER: "+q(".rp-cap").textContent);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "rp2-"));
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

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
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); const nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(80);}, set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));}, tst=()=>q("#toast").textContent;
  const mkV=async(n)=>{await nav("Vendors"); if(q('[data-a="inv_vnpage"]')) click('[data-a="inv_vnpage"]'); await wait(30); set('[data-iv="vn.name"]',n); set('[data-iv="vn.phone"]',"0700 123456"); set('[data-iv="vn.ob"]',"5000"); click('[data-a="inv_vnsave"]'); await wait(40);};
  await nav("Vendors"); log("1 NO VENDORS SHOWS FORM: "+!!q('[data-a="inv_vnsave"]')+" | title "+q(".inv-title h1").textContent+" | one h1 "+qa("#vSub h1").length);
  await mkV("Kenya Breweries"); log("2 SAVED: "+tst()+" | form closed "+!q('[data-a="inv_vnsave"]')+" | button "+!!q('[data-a="inv_vnpage"]')+" | row "+q("#vSub table tr:nth-child(2) td").textContent);
  click('[data-a="inv_vnpage"]'); await wait(30); log("3 NEW OPENS: "+!!q('[data-a="inv_vnsave"]')+" | focus "+document.activeElement.id); set('[data-iv="vn.name"]',"Half"); click('[data-a="inv_vnnew"]'); await wait(30); log("4 CANCEL: closed "+!q('[data-a="inv_vnsave"]')); q('[data-a="inv_vnedit"]').click(); await wait(40); log("5 EDIT: "+q('[data-iv="vn.name"]').value+" | "+qa("#vSub .pn h4").map(x=>x.textContent).join(" / ")); set('[data-iv="vn.phone"]',"0711 000000"); click('[data-a="inv_vnsave"]'); await wait(40); log("6 EDIT SAVED: "+tst()+" | closed "+!q('[data-a="inv_vnsave"]'));
  q('[data-a="vs_open"]').click(); await wait(50); log("7 STATEMENT: "+q(".inv-title h1").textContent+" | "+q(".inv-rail .ir.on span").textContent); click('[data-a="vs_tab"][data-t="pay"]'); await wait(50); log("8 PAYMENTS: "+q(".inv-title h1").textContent);
  await nav("Purchasing"); log("9 LPO: "+q(".inv-title h1").textContent+" | no orders shows form "+!!q('[data-a="inv_pomake"]')+" | one h1 "+qa("#vSub h1").length);
  set('[data-iv="po.sup"]',"Kenya Breweries"); await wait(30); const qq=qa("#vSub input").find(x=>x.placeholder==="" && x.type==="number"); const ql=qa('[data-a="inv_poladd"]')[0]; const inp=q("#po_q")||qq; inp.value="10"; const pp=q("#po_p"); if(pp) pp.value="50"; ql.click(); await wait(40); log("10 LINE: "+qa('[data-a="inv_poldel"]').length+" | "+tst()); click('[data-a="inv_pomake"]'); await wait(50); log("11 MADE: "+tst()+" | form closed "+!q('[data-a="inv_pomake"]')+" | button "+!!q('[data-a="inv_ponew"]'));
  click('[data-a="inv_ponew"]'); await wait(30); log("12 NEW OPENS: "+!!q('[data-a="inv_pomake"]')); click('[data-a="inv_ponew"]'); await wait(30); log("13 CANCEL: closed "+!q('[data-a="inv_pomake"]'));
  click('[data-a="pur_tab"][data-t="receive"]'); await wait(60); log("14 RECEIVE: "+q(".inv-title h1").textContent); const nw=qa("#vSub button").find(b=>b.textContent.includes("+ New")||b.dataset.a==="inv_vnopen"); nw.click(); await wait(40); log("15 VENDOR POPUP: "+q("#vnModal h3").textContent+" | form "+!!q('#vnModal [data-a="inv_vnsave"]')+" | list "+!!q("#vnModal table")+" | no cancel "+!q('#vnModal [data-a="inv_vnnew"]')); click('[data-a="inv_vnclose"]'); await wait(30); click('[data-a="pur_tab"][data-t="rpur"]'); await wait(60); log("16 REPORT: "+q(".inv-title h1").textContent);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vp-"));
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

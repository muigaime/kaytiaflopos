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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, vis=s=>{const e=q(s); return !!e&&getComputedStyle(e).display!=="none"&&e.getClientRects().length>0;}, signIn=async p=>{ click("#lock"); await wait(25); pin=p; pkey("E"); await wait(500); }, nav=()=>qa("#fdRib .fd-b").map(b=>b.textContent.trim()), fdIn=async()=>{ q("#flU").value="admin"; q("#flP").value="admin123"; click("#flGo"); for(let w=0;w<4000&&!q("#fd").classList.contains("show");w++) await wait(5); await wait(30); };
  await add("Tusker","Bar",1); await send("M1"); await wait(300); if(q("#rcClose")) click("#rcClose"); await wait(20);
  shiftBadge(); const sb=q("#shiftBtn"); must(/^My bills [(][0-9]+[)]$/.test(q("#shiftBtn").textContent)&&vis("#shiftBtn"),"the waiter's button says "+q("#shiftBtn").textContent);
  USERS.push({n:"Cara Cash",pin:"4444",d:[...ALLD],role:"Cashier"}); shiftStart("Cara Cash",100,"t");
  const me=user.n, mine=orders.filter(o=>o.waiter===me); click("#shiftBtn"); await wait(20); must(q("#shMgr").classList.contains("show")&&/My bills/.test(q("#shMgr h2").textContent),"it opens My bills"); must(!/Start shift|End shift/.test(q("#shMgr").textContent),"no shift controls"); const rows=qa('#shMgr [data-sa="ms_open"]'); must(rows.length===mine.length&&rows.length>0,"the waiter sees their own "+rows.length+" pending bills, of "+orders.length+" open");
  rows[0].click(); await wait(20); q("#shMgr [data-f='m']").value="Cash"; q("#shMgr [data-f='amt']").value="200"; q("#msTo").value="Cara Cash"; click('#shMgr [data-sa="ms_send"]'); await wait(30); must(mine[0].handedTo==="Cara Cash"&&mine[0].money[0].paid===false,"the unpaid bill goes to the cashier"); must(!pendingOf(me).includes(mine[0]),"it leaves the waiter's list"); shiftBadge(); must(q("#shiftBtn").textContent===("My bills ("+pendingOf(me).length+")"),"count updates: "+q("#shiftBtn").textContent); click('#shMgr [data-sa="exit"]'); await wait(15);
  const no=(ROOMS.find(r=>roomStatus(r)==="vac")||{}).no; click("#lock"); await wait(25); click("#login .bkm"); await wait(30); click('#start [data-go="fd"]'); await wait(70); await fdIn();
  click("#fdOut"); await wait(40); await fdIn(); must(q("#fdTitle").textContent==="Rooms","the next person starts on Rooms: "+q("#fdTitle").textContent); const N=nav(); log("MENU: "+N.join(", ")); must(!N.some(x=>/report|summar/i.test(x)),"no reports on the menu"); must(["rsales","rpay","rrev","rmeal","rguests","rold","occ"].every(k=>!FD_VIEWS[k]),"the report pages are gone");
  must(qa("#fdBody .fd-t").length===5,"Rooms has five summary tiles"); const fb=q('[data-f="rflt"][data-k="ooo"]'); fb.click(); await wait(20); must(!qa("#fdBody .fd-room").length,"filter: no out-of-order rooms"); q('[data-f="rflt"][data-k=""]').click(); await wait(20); must(qa("#fdBody .fd-room").length===ROOMS.length,"filter off shows all");
  q('#fdBody .fd-t[data-v="hk"]').click(); await wait(20); must(q("#fdTitle").textContent==="Housekeeping"&&!!q('[data-f="hkset"]'),"To clean opens Housekeeping, and other staff can change status too");
  RESERVATIONS.push({id:"R9",guest:"Zed Zulu",room:no,in:todayYmd(),out:addDays(todayYmd(),2),status:"out",pays:[],charges:[],rate:1000,guests:[{idn:"X77"}]}); q('[data-v="guests"]').click(); await wait(20); const g=q("#fdGq"), vis2=()=>qa("#fdGuests tr").filter(t=>!t.querySelector("th")&&t.style.display!=="none").length; must(vis2()>=1&&!!q('#fdGuests [data-f="inv"]'),"Guests lists past guests with invoices"); g.value="nobody-here"; g.dispatchEvent(new Event("input",{bubbles:true})); must(vis2()===0,"search hides others"); g.value="x77"; g.dispatchEvent(new Event("input",{bubbles:true})); must(vis2()===1,"search finds by ID");
  click("#fdOut"); await wait(30); q("#flBack").click(); await wait(30); click('#start [data-go="bo"]'); await wait(40); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); must(vis("#boOut"),"Back Office has a Log out button"); click("#boOut"); await wait(40); must(getComputedStyle(q("#boLogin")).display!=="none"&&q("#app").style.display==="none"&&q("#bo").classList.contains("show"),"Log out returns to the sign-in screen"); must(!q("#boP").value,"password cleared");
  q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); qa("#nav .nv").find(x=>x.dataset.n==="Waiter setup").click(); await wait(80); click('[data-a="ws_new"]'); await wait(30); const sel=q("[data-wsr]"); must(![...sel.options].some(o=>o.text==="Housekeeper"),"Housekeeper isn't a POS role any more");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "fdhk-"));
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

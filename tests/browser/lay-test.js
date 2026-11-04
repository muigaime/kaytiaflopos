// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const SIZE = process.env.LAY_SIZE || "1100,620";
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
  const rect=s=>q(s).getBoundingClientRect(), check=who=>{ const P=rect(".paper"), M=rect(".mid"), A=rect(".acts"), L=rect("#lines"), T=rect(".tbl"), G=rect("#tGross"); const R=rect(".rp"); const bad=[]; if(P.bottom>A.top+0.5) bad.push("the bill reaches the buttons by "+Math.round(P.bottom-A.top)); const sc=q(".paper"); if(sc.scrollHeight>sc.clientHeight+1&&innerHeight>=540) bad.push("the bill needs scrolling by "+(sc.scrollHeight-sc.clientHeight)); if(M.bottom>P.bottom+0.5&&innerHeight>=540) bad.push("totals spill out by "+Math.round(M.bottom-P.bottom)); if(G.right>P.right+0.5) bad.push("gross runs off the side"); if(A.bottom>innerHeight+1) bad.push("buttons run off the bottom by "+Math.round(A.bottom-innerHeight)); log(who+" window "+innerWidth+"x"+innerHeight+": list "+Math.round(L.height)+"px, totals bottom "+Math.round(M.bottom)+" / bill "+Math.round(P.bottom)+" / buttons "+Math.round(A.top)+" "+(bad.length?"BAD: "+bad.join("; "):"ok")); if(bad.length) throw new Error(who+": "+bad.join("; ")); };
  check("EMPTY"); await add("Tusker","Bar",2); await add("Fish","Restaurant",1); await add("Dawa","Restaurant",1); await add("Burger","Pool",1); await add("Tusker","Pool",1); await wait(100); check("FIVE ITEMS"); q("#lines").scrollTop=999; log("LIST SCROLLS: "+(q("#lines").scrollHeight>q("#lines").clientHeight?"yes":"fits")); log("BUTTONS: "+["#sendBtn","#settleBtn","#printBtn","#ordBtn","#lock"].map(s=>{const r=rect(s); const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return (!hit||hit===q(s)||q(s).contains(hit))?"":s+" by "+(hit?hit.tagName+"#"+hit.id+"."+hit.className:"nothing")+" at "+Math.round(r.top);}).filter(Boolean).join(", ")+" | end of list");
  await send("T1"); click("#rcClose"); await wait(30); click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); log("MENU HAS POINT OF SALE: "+qa("#nav .nv").some(x=>/Point of Sale/.test(x.dataset.n))+" | hero Open POS "+!!q("#openPos")+" | Applications "+qa("#vHome *").filter(x=>x.children.length===0&&/^Point of Sale$/.test(x.textContent.trim())).length+" | insight "+(q("#ins").textContent.match(/open orders?[^.]*\.[^.]*\.[^.]*/)||[""])[0].slice(0,110)+" | buttons "+qa("#ins button").map(b=>b.textContent).join(",")); const ins=qa("#ins button").find(b=>/See orders/.test(b.textContent)); if(ins){ ins.click(); await wait(80); log("SEE ORDERS GOES TO: "+q("#vSub h1,#vSub .hello h1").textContent); }
  log("START MENU STILL OPENS POS: "+!!q('[data-go="pos"]'));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "lay-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, `--window-size=${SIZE}`, "--virtual-time-budget=16000"];
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

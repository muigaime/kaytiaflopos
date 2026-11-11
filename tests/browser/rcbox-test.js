// node rcbox-test.js <built.html>: receiving by the piece or by the box / crate, and issuing in pieces.
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); };
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const SV=()=>{ window.bosave&&window.bosave(); return JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")); }, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(100);}, tab=async t=>{click('[data-a="pur_tab"][data-t="'+t+'"]'); await wait(60);}, set=(s,v)=>{const e=q(s); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true}));}, tst=()=>q("#toast").textContent, by=v=>click('[data-a="inv_rcby"][data-v="'+v+'"]');
  await nav("Purchasing"); await tab("receive");
  must(!!q('[data-a="inv_rcby"][data-v="uom"]')&&!!q('[data-a="inv_rcby"][data-v="buy"]'),"Receive goods offers Pieces and Boxes / crates");
  set('[data-iv="rc.eName"]',"Tusker"); await wait(60);
  must(q('[data-a="inv_rcby"][data-v="uom"]').classList.contains("on")&&!q("#rcPer"),"an item with no box size starts on pieces");
  by("buy"); await wait(60);
  must(!!q('[data-iv="rc.eBox"]')&&!!q("#rcPer")&&q('[data-iv="rc.eBox"]').value==="Crate"&&/received/.test(q("#rcQty").closest("label").textContent),"Boxes / crates asks for the box and how many pieces it holds");
  must(/Crates received/.test(q("#rcQty").closest("label").textContent)&&/Price per crate/.test(q("#rcPrice").closest("label").textContent),"the quantity and price are per crate");
  set('[data-iv="rc.eQty"]',"2"); set('[data-iv="rc.ePrice"]',"2400"); await wait(20);
  click('[data-a="inv_rcadd"]'); await wait(40); must(/Enter how many pcs are in one crate/.test(tst()),"it asks how many pieces a crate holds: "+tst());
  set("#rcPer","24"); await wait(30);
  must(/2 crates × 24 = 48 pcs into stock/.test(q("#rcConv").textContent),"it shows the pieces going into stock: "+q("#rcConv").textContent);
  set('[data-iv="rc.ePrice"]',"2400"); await wait(10); click('[data-a="inv_rcadd"]'); await wait(60);
  const row=qa(".grn-t tr").find(r=>/Tusker/.test(r.textContent));
  must(!!row&&/Crate of 24 pcs/.test(row.textContent)&&/= 48 pcs/.test(row.textContent),"the line reads Crate of 24 pcs = 48 pcs: "+(row&&row.textContent));
  // a carton of something else, by pieces
  set('[data-iv="rc.eName"]',"Tusker"); await wait(60);
  by("uom"); await wait(40); set('[data-iv="rc.eQty"]',"6"); set('[data-iv="rc.ePrice"]',"100"); await wait(10); click('[data-a="inv_rcadd"]'); await wait(40);
  must(qa(".grn-t tr").filter(r=>/Tusker/.test(r.textContent)).length===2,"pieces can be received on the same note");
  set('[data-iv="rc.inv"]',"INV-9"); set('[data-iv="rc.dnote"]',"DN-9"); set('[data-iv="rc.invAmt"]',"5400"); await wait(20);
  click('[data-a="inv_rcpost"]'); await wait(120);
  must(/posted/.test(tst())&&/Remembered: Tusker: one crate holds 24 pcs/.test(tst())&&/kept in pieces/.test(tst()),"posting says what it remembered: "+tst());
  const d=SV(), g=d.GN.at(-1), k=g.lines[0].k;
  must(g.lines[0].q===48&&g.lines[1].q===6,"48 pieces and 6 pieces went into stock: "+g.lines.map(x=>x.q).join(","));
  must(d.IU[k]&&d.IU[k].perBuy===24&&d.IU[k].buyUnit==="Crate","the item remembers its crate of 24");
  must(Math.abs(d.IU[k].buyPrice-2400)<0.01||Math.abs(d.IU[k].buyPrice-2400)<1,"the crate price is kept: "+d.IU[k].buyPrice);
  must(FD_SETTINGS.auditTrail.some(x=>/Box size set when receiving: Tusker: one crate holds 24 pcs/.test(x.text)),"it is recorded");
  // next time: the crate comes up by itself
  set('[data-iv="rc.eName"]',"Tusker"); await wait(80);
  must(q('[data-a="inv_rcby"][data-v="buy"]').classList.contains("on")&&q("#rcPer").value==="24"&&q('[data-iv="rc.eBox"]').value==="Crate","next time Tusker opens on crates of 24");
  must(Math.abs(parseFloat(q("#rcPrice").value)-2400)<1,"at the crate price: "+q("#rcPrice").value);
  by("uom"); await wait(40); must(Math.abs(parseFloat(q("#rcPrice").value)-100)<1,"switching to pieces shows the piece price: "+q("#rcPrice").value);
  by("buy"); await wait(40); must(Math.abs(parseFloat(q("#rcPrice").value)-2400)<1,"and back to the crate price");
  set("#rcPer","12"); await wait(30); must(Math.abs(parseFloat(q("#rcPrice").value)-1200)<1,"a smaller crate costs less: "+q("#rcPrice").value);
  // issuing converts crates to pieces
  click('[data-a="inv_rcexit"]'); await wait(30);
  await nav("Inventory"); const issueTab=q('.ph-c[data-t="issue"]')||q('[data-a="inv_tab"][data-t="issue"]'); if(issueTab) issueTab.click(); await wait(120);
  { const n=q("#isName"); n.focus(); n.dispatchEvent(new FocusEvent("focusin",{bubbles:true})); await wait(30); const o=q('#isPick [data-rcpk="'+k+'"]'); if(o) o.dispatchEvent(new MouseEvent("mousedown",{bubbles:true})); await wait(50); }
  const cb=q('[data-a="inv_seby"][data-f="is"][data-v="buy"]');
  must(!!cb&&!cb.disabled&&/Crates of 24/.test(cb.textContent),"issuing offers crates of 24: "+(cb&&cb.textContent));
  cb.click(); await wait(40); { const e=q("#isQty"); e.value="1"; e.dispatchEvent(new Event("input",{bubbles:true})); } click('[data-a="inv_seadd"][data-f="is"]'); await wait(50);
  const ib=q("#vSub .se-t .u-badge.crate");
  must(!!ib&&/1 Crate/.test(ib.textContent)&&/= 24 pcs/.test(ib.parentElement.textContent),"one crate issued shows 1 Crate = 24 pcs: "+(ib&&ib.parentElement.textContent));
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "gr-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=50000"];
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

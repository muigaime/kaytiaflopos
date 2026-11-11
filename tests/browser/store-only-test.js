// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};
localStorage.setItem("kaytia_machine","TEST-PC");localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify({RQ:[{id:"REQ-1",at:new Date().toISOString(),dept:"Bar",store:"Main Store",by:"Jane",lines:[{k:"a",q:1}],status:"Awaiting approval"}],S:[],C:[],U:[{n:"Jane Waiter",pin:"1111",d:["Bar","Restaurant","Pool"],role:"Waiter"},{n:"Solo Sam",pin:"3333",d:["Bar"],role:"Waiter"},{n:"Boss",pin:"0000",d:["Bar","Restaurant","Pool"],role:"Manager"}],
 I:[{id:1,n:"Tusker",d:"Bar",c:"Beer",p:200,t:"B",r:{a:1}},{id:2,n:"Fish",d:"Restaurant",c:"Mains",p:1000,t:"B",r:{c:1}},{id:3,n:"Dawa",d:"Restaurant",c:"Drinks",p:500,t:"B",r:{d:1}},{id:4,n:"Tusker",d:"Pool",c:"Beer",p:250,t:"B",r:{a:1}},{id:5,n:"Burger",d:"Pool",c:"Mains",p:800,t:"B",r:{c:1}}],
 G:{a:"A",c:"C",d:"D"},X:{a:10,c:10,d:10},IU:{a:{group:"Drinks",uom:"pcs"},c:{group:"Food",uom:"pcs"},d:{group:"Drinks",uom:"pcs"}},ST:["Main Store","Food Store"],OL:["Bar","Restaurant","Pool"],OI:{Bar:{type:"Bar",store:"Main Store"},Restaurant:{type:"Restaurant",store:"Main Store"},Pool:{type:"Restaurant",store:"Main Store"}},K:{"Main Store":{},Bar:{a:50},Restaurant:{c:50,d:50},Pool:{a:50,c:50}},MV:[],GN:[],VN:[],LP:[],
 FS:{name:"The Tide",meals:{BB:800,HB:1800,FB:2600},child:50,printUrl:"http://localhost:4000",printers:[{n:"Kitchen",ip:"127.0.0.1",port:9101},{n:"Main Bar",ip:"127.0.0.1",port:9102},{n:"Pool Kitchen",ip:"127.0.0.1",port:9103},{n:"Dead",ip:"127.0.0.1",port:9109}],printRoutes:{Bar:{bar:"Main Bar"},Restaurant:{kitchen:"Kitchen",bar:"Main Bar"},Pool:{kitchen:"Pool Kitchen",bar:"Dead"}}}}));</script>`;
const tail = `<script>(async()=>{const log=m=>__E.push(m),wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);if(!el)throw new Error("missing "+s);el.click();};
const tile=n=>{const hit=()=>qa("#grid .it").find(b=>b.textContent.includes(n)); if(hit()) return hit(); for(const c of qa("#cats .cat").map(x=>x.dataset.c)){q('#cats [data-c="'+c+'"]').click(); if(hit()) return hit();}}, tab=async d=>{click('#spTabs [data-t="'+d+'"]'); await wait(15);}, add=async(n,d,t=1)=>{if(d) await tab(d); for(let i=0;i<t;i++){tile(n).click(); await wait(6);}};
const login=async p=>{for (const k of p+"E") { q('#kp [data-k="'+k+'"]').click(); await wait(15); } await wait(450);};
const send=async l=>{click("#sendBtn"); await wait(20); if(q("#mSend").classList.contains("show")){q("#lbl").value=l; click("#sendGo");} await wait(600);};
try{
  click('[data-go="pos"]'); await wait(200); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  await login("1111");
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, goto=async n=>{ qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(80); }, tab=async t=>{ click('[data-a="inv_tab"][data-t="'+t+'"]'); await wait(60); }, boIn=async(u,p)=>{ q("#boU").value=u; q("#boP").value=p; await wait(700); click("#boGo"); await wait(1400); }, names=()=>qa(".stm-t tbody tr:not(.stm-band) .stm-item b").map(x=>x.textContent), toast2=()=>q("#toast").textContent;
  FD_SETTINGS.storeInfo={"Main Store":{kinds:["Drinks"]},"Food Store":{kinds:["Food"]}}; STK["Main Store"].c=5; STK["Main Store"].a=9;
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); await boIn("admin","admin123"); await goto("Inventory"); await tab("master"); const loc0=q(".sc2.on span").textContent; log("STORE: "+loc0);
  must(names().includes("A")&&names().includes("D")&&!names().includes("C"),"Main Store lists only Drinks: "+names().join(", "));
  must(/Lists Drinks only/.test(q(".stm-note").textContent),"it says so"); const off=q(".stm-off"); must(!!off&&/outside/.test(off.textContent),"stock held outside its categories is flagged: "+(off||{}).textContent); const n0=names().length; q('[data-a="inv_moff"]').click(); await wait(50); must(names().includes("C"),"Show them reveals it"); q('[data-a="inv_moff"]').click(); await wait(50); must(names().length===n0,"Hide them hides it");
  q('.sc2 [data-l]'); const sc=qa(".sc2").find(x=>/Food Store/.test(x.textContent)); must(!!sc,"Food Store is on the list"); sc.click(); await wait(70); must(names().includes("C")&&!names().includes("A")&&!names().includes("D"),"Food Store lists only Food: "+names().join(", "));
  await tab("damage"); const dmOpts=qa('[data-iv="dm.k"] option').map(o=>o.textContent); must(dmOpts.includes("C")&&!dmOpts.includes("A"),"Damage only offers this store's items: "+dmOpts.join(",")); await tab("issue"); { const n=q("#isName"); n.focus(); n.dispatchEvent(new FocusEvent("focusin",{bubbles:true})); await wait(40); } const isOpts=qa("#isPick .rc-opt .rc-nm b").map(o=>o.textContent); must(isOpts.includes("C")&&!isOpts.includes("A"),"Issue only offers this store's items");
  await goto("Users & roles"); q("#mn").value="Stu Store"; q("#mu").value="stu"; q("#mp").value="secret1"; q("#mr").value="Store"; click('[data-a="ur_add"]'); for(let w=0;w<4000&&!/stu/.test(q("#vSub").textContent);w++) await wait(5); await wait(30); click('[data-a="ur_tab"][data-t="rights"]'); await wait(40); const rs=q("[data-urg]"); rs.value="Store"; rs.dispatchEvent(new Event("change",{bubbles:true})); await wait(40); must(q('[data-a="ur_grant"][data-k="inv.approve"]').textContent==="NO","the Store role can't approve by default"); click("#boOut"); await wait(30); await boIn("stu","secret1");
  await goto("Inventory"); q(".ph-c").click(); await wait(60); log("stu tabs: "+qa(".ph-subs button span").map(x=>x.textContent).join(",")); must(!qa(".ph-subs button").some(b=>b.dataset.t==="appr"),"without the right there's no Approvals screen"); click("#boOut"); await wait(30); await boIn("admin","admin123"); await goto("Users & roles"); click('[data-a="ur_tab"][data-t="rights"]'); await wait(40); const r2=q("[data-urg]"); r2.value="Store"; r2.dispatchEvent(new Event("change",{bubbles:true})); await wait(40); q('[data-a="ur_grant"][data-k="inv.approve"]').click(); await wait(20); click("#boOut"); await wait(30); await boIn("stu","secret1"); await goto("Inventory"); await tab("appr"); must(qa(".ph-subs button").some(b=>b.dataset.t==="appr"),"granting it in Users & roles opens Approvals"); const pend=()=>q('[data-a="ap_open"][data-act="approve"]');
  must(!!pend(),"a waiting requisition can be approved"); pend().click(); await wait(40); must(!q("#apPin")&&/Approving as/.test(q("#apModal").textContent)&&/Stu Store/.test(q("#apModal").textContent),"no PIN box, approving under their own name: "+"ok"); click('[data-a="ap_ok"]'); await wait(70); must(/approved by Stu Store/.test(toast2()),"it's approved by them: "+toast2());
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "sonly-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=60000"];
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

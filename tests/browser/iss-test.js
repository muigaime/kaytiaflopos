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
  const toBO=async()=>{click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);}, nav=async n=>{qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(70);}, tst=()=>q("#toast").textContent, tab=async t=>{click('[data-a="inv_tab"][data-t="'+t+'"]'); await wait(40);}, S=()=>{bosave(); return JSON.parse(localStorage.getItem("kaytia_pos_bo_v1"));}, ms=()=>{const s=S(); return "store "+s.K["Main Store"].a+" bar "+(s.K.Bar.a||0)+" pool "+(s.K.Pool.a||0);}, rq=id=>S().RQ.find(r=>r.id===id), iss=id=>S().IS.find(x=>x.id===id);
  log("1 STUCK NOTE CLEARED ON OPEN: "+iss("ISS-OLD").status+" | "+rq("REQ-3").status+" | "+ms());
  log("2 DIRECT NOTE STILL WAITING: "+iss("ISS-DIRECT").status);
  await toBO(); await nav("Inventory"); await tab("appr"); log("3 APPROVALS: "+qa('[data-a="ap_open"][data-act="approve"]').map(b=>b.dataset.id).join());
  const ap=async id=>{q('[data-a="ap_open"][data-id="'+id+'"][data-act="approve"]').click(); await wait(25); q("#apPin").value="0000"; click('[data-a="ap_ok"]'); await wait(40);};
  const n0=S().IS.length, m0=ms(); await ap("REQ-1"); log("4 APPROVE ONCE: "+tst()+" | "+rq("REQ-1").status+" | "+m0+" -> "+ms()+" | notes "+n0+" -> "+S().IS.length+" | new note "+S().IS.at(-1).status+" | waiting "+S().IS.filter(x=>x.status==="Awaiting approval").map(x=>x.id).join());
  await ap("REQ-2"); log("5 SHORT OF ONE ITEM: "+tst()+" | "+rq("REQ-2").status+" | c issued "+rq("REQ-2").lines[1].issued+" | store c "+S().K["Main Store"].c);
  log("6 APPROVALS LEFT: "+qa('[data-a="ap_open"][data-act="approve"]').map(b=>b.dataset.id).join());
  await ap("ISS-DIRECT"); log("7 DIRECT NOTE APPROVED: "+tst()+" | "+iss("ISS-DIRECT").status);
  await tab("req"); log("8 REQUISITIONS PAGE: "+q("#vSub .stk").textContent.slice(0,80)+" | button "+((qa('[data-a="inv_rqissue"]')[0]||{}).textContent)); const m1=ms(); const rb=qa('[data-a="inv_rqissue"]').find(b=>b.closest("details").textContent.includes("REQ-4")); const i4=rb.dataset.i; const inp=q("#iq_"+i4+"_0"); inp.value="2"; rb.click(); await wait(40); log("9 APPROVED ONE, ISSUE STOCK: "+tst()+" | "+rq("REQ-4").status+" | "+m1+" -> "+ms()+" | still waiting "+S().IS.filter(x=>x.status==="Awaiting approval").length);
  await tab("issue"); log("10 ISSUE TAB: "+q('[data-a="inv_isspost"]').textContent); const lp=q('#vSub [data-iv="is.pick"]')||q('#vSub select[data-iv*="pick"]'); log("10a line picker "+!!lp);
  const f=q('[data-iv="is.to"]'); f.value="Bar"; f.dispatchEvent(new Event("input",{bubbles:true})); f.dispatchEvent(new Event("change",{bubbles:true})); await wait(25); const sel=qa('#vSub select').find(x=>[...x.options].some(o=>o.value==="a")); sel.value="a"; sel.dispatchEvent(new Event("input",{bubbles:true})); sel.dispatchEvent(new Event("change",{bubbles:true})); await wait(10); const qty=qa('#vSub input[type="number"]')[0]; qty.value="6"; qty.dispatchEvent(new Event("input",{bubbles:true})); qty.dispatchEvent(new Event("change",{bubbles:true})); await wait(10); click('[data-a="inv_ladd"]'); await wait(30); const m2=ms(); click('[data-a="inv_isspost"]'); await wait(40); log("11 DIRECT ISSUE, NO REQUISITION: "+tst()+" | "+m2+" -> "+ms()+" | "+S().IS.at(-1).status+" by "+(S().IS.at(-1).appr||{}).by);
  await nav("Home"); log("12 HOME: waiting rows "+(q("#apv")?q("#apv").textContent.includes("Waiting for approval"):"-")+" | to issue "+(q("#apv")?q("#apv").textContent.includes("REQ-2"):"-")); const ib=q('[data-a="ap_issue"]'); log("13 ISSUE BUTTON: "+!!ib); if(ib){ib.click(); await wait(40); log("14 STILL SHORT: "+tst()+" | stays on Home "+!!q("#apv"));}
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head + "<script>(()=>{const k=\"kaytia_pos_bo_v1\",s=JSON.parse(localStorage.getItem(k));if(s.__i)return;s.__i=1;s.K=s.K||{};s.K[\"Main Store\"]={...(s.K[\"Main Store\"]||{}),a:100,c:10};const at=new Date().toISOString();s.RQ=[{id:\"REQ-1\",at,dept:\"Bar\",store:\"Main Store\",by:\"Jane\",status:\"Awaiting approval\",lines:[{k:\"a\",q:5,issued:0}]},{id:\"REQ-2\",at,dept:\"Pool\",store:\"Main Store\",by:\"Jane\",status:\"Awaiting approval\",lines:[{k:\"a\",q:3,issued:0},{k:\"c\",q:50,issued:0}]},{id:\"REQ-3\",at,dept:\"Bar\",store:\"Main Store\",by:\"Jane\",status:\"Approved\",appr:{by:\"Boss\",at},lines:[{k:\"a\",q:4,issued:0}]},{id:\"REQ-4\",at,dept:\"Bar\",store:\"Main Store\",by:\"Jane\",status:\"Approved\",appr:{by:\"Boss\",at},lines:[{k:\"a\",q:2,issued:0}]}];s.IS=[{id:\"ISS-OLD\",at,from:\"Main Store\",to:\"Bar\",by:\"Jane\",note:\"\",src:\"requisition\",req:\"REQ-3\",lines:[{k:\"a\",q:4}],status:\"Awaiting approval\"},{id:\"ISS-DIRECT\",at,from:\"Main Store\",to:\"Pool\",by:\"Jane\",note:\"\",src:\"issue\",req:\"\",lines:[{k:\"a\",q:1}],status:\"Awaiting approval\"}];localStorage.setItem(k,JSON.stringify(s));})();</script>").replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "iss-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=40000"];
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

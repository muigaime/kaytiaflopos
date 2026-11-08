// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};
localStorage.setItem("kaytia_machine","TEST-PC");localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify({S:[],C:[],U:[{n:"Jane Waiter",pin:"1111",d:["Bar","Restaurant","Pool"],role:"Waiter"},{n:"Solo Sam",pin:"3333",d:["Bar"],role:"Waiter"},{n:"Boss",pin:"0000",d:["Bar","Restaurant","Pool"],role:"Manager"}],
 I:[{id:1,n:"Tusker",d:"Bar",c:"Beer",p:200,t:"B",r:{a:1}},{id:2,n:"Fish",d:"Restaurant",c:"Mains",p:1000,t:"B",r:{c:1}},{id:3,n:"Dawa",d:"Restaurant",c:"Drinks",p:500,t:"B",r:{d:1}},{id:4,n:"Tusker",d:"Pool",c:"Beer",p:250,t:"B",r:{a:1}},{id:5,n:"Burger",d:"Pool",c:"Mains",p:800,t:"B",r:{c:1}},{id:50,n:"Chips",d:"Restaurant",c:"Mains",p:400,t:"B",r:{}},{id:51,n:"Ugali",d:"Restaurant",c:"Mains",p:150,t:"B",r:{}},{id:52,n:"Stew",d:"Restaurant",c:"Mains",p:600,t:"B",r:{}},{id:53,n:"Corkage",d:"Bar",c:"Service",p:300,t:"B",r:{}}],
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

  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, it=id=>ITEMS.find(x=>x.id===id), tst=()=>(q("#toast")||{}).textContent||"", vis=e=>e&&getComputedStyle(e).display!=="none";
  // POS Exit
  click("#lock"); await wait(30);
  must(vis(q("#login")),"the sign-in screen is up");
  q('#kp [data-k="1"]').click(); await wait(10);
  click('.bt [data-k="X"]'); await wait(300);
  must(q("#start").style.display==="grid","Exit goes back to the main page");
  must(!q("#bye"),"no Application closed screen");
  must(user===null&&pin==="","nobody is left signed in");
  click('[data-go="pos"]'); await wait(200);
  must(q("#start").style.display==="none"&&vis(q("#login")),"the POS opens again from the main page");
  // Back Office
  q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const go2=async n=>{ const a=qa("#nav .nv").find(x=>x.dataset.n===n); if(!a) throw new Error("nav "+n); a.click(); await wait(100); };
  const mat=Object.keys(STK).find(k=>/Material/.test(k)); must(!!mat,"there is a materials store: "+mat);
  STK[mat].c=50; STK[mat].d=50;
  await go2("Products List");
  must(!!q('[data-a="rec_dirr"][data-id="50"]')&&!!q('[data-a="rec_dirp"][data-id="50"]'),"a no-stock item offers recipe and production");
  must(!q('[data-a="rec_dirr"][data-id="1"]'),"a stocked item does not");
  click('[data-a="prl_edit"][data-id="53"]'); await wait(40);
  must(!!q('#prEd [data-a="rec_dirr"]')&&!!q('#prEd [data-a="rec_dirp"]'),"its edit form offers them too");
  click('#prEd [data-a="prl_eclose"]'); await wait(30);
  // Blocked while on a bill
  orders.push({lines:{50:{q:1}}}); click('[data-a="rec_dirr"][data-id="50"]'); await wait(30);
  must(/open bill/.test(document.body.textContent)&&!!q(".pr-page"),"blocked while it is on an open bill"); orders.pop();
  // Recipe from the product list
  click('[data-a="rec_dirr"][data-id="50"]'); await wait(100);
  must(/Add a recipe for Chips/.test(q("#vSub").textContent),"the recipe form opens for it");
  must(q("#rcpName").value==="Chips","the name is filled in");
  q("#rcp_k").value="c"; q("#rcp_q").value="0.5"; click('[data-a="rec_ladd"][data-f="rcp"]'); await wait(50);
  click('[data-a="rec_rsave"]'); await wait(60);
  must(it(50).r.c===0.5&&it(50).from===mat,"the recipe is saved on the same product: "+JSON.stringify(it(50).r)+" "+it(50).from);
  must(ITEMS.filter(x=>x.n==="Chips").length===1,"no copy was made");
  must(it(50).p===400&&it(50).d==="Restaurant","price and selling point kept");
  must(/Recipes [(]/.test(q("#vSub").textContent)&&!q('[data-a="rec_dirr"][data-id="50"]'),"it has left the no-stock list");
  must(!!q('[data-a="rec_dirr"][data-id="52"]'),"the Recipes page lists the others");
  // Typing the name gives that product the recipe
  const n0=ITEMS.length;
  if(q('[data-a="rec_rnew"]')) click('[data-a="rec_rnew"]'); await wait(50);
  const nm=q("#rcpName"); nm.value="stew"; nm.dispatchEvent(new Event("input",{bubbles:true})); nm.dispatchEvent(new Event("change",{bubbles:true})); await wait(20);
  const sp=q('[data-iv="rcp.sp"]'); sp.value="Restaurant"; sp.dispatchEvent(new Event("change",{bubbles:true})); await wait(40);
  const pr=q('[data-iv="rcp.price"]'); pr.value="600"; pr.dispatchEvent(new Event("input",{bubbles:true})); pr.dispatchEvent(new Event("change",{bubbles:true})); await wait(20);
  q("#rcp_k").value="d"; q("#rcp_q").value="1"; click('[data-a="rec_ladd"][data-f="rcp"]'); await wait(50);
  click('[data-a="rec_rsave"]'); await wait(60);
  must(ITEMS.length===n0&&it(52).r.d===1,"a recipe typed with the same name attaches to it: "+ITEMS.length+"/"+n0+" "+JSON.stringify(it(52).r));
  // A stocked product still refuses the name
  if(q('[data-a="rec_rnew"]')) click('[data-a="rec_rnew"]'); await wait(50);
  const nm2=q("#rcpName"); nm2.value="Fish"; nm2.dispatchEvent(new Event("input",{bubbles:true})); nm2.dispatchEvent(new Event("change",{bubbles:true})); await wait(20);
  const sp2=q('[data-iv="rcp.sp"]'); sp2.value="Restaurant"; sp2.dispatchEvent(new Event("change",{bubbles:true})); await wait(40);
  const pr2=q('[data-iv="rcp.price"]'); pr2.value="900"; pr2.dispatchEvent(new Event("input",{bubbles:true})); pr2.dispatchEvent(new Event("change",{bubbles:true})); await wait(20);
  q("#rcp_k").value="d"; q("#rcp_q").value="1"; click('[data-a="rec_ladd"][data-f="rcp"]'); await wait(50);
  click('[data-a="rec_rsave"]'); await wait(60);
  must(ITEMS.length===n0&&it(2).r.c===1&&!it(2).from,"a product that already has stock is left alone");
  click('[data-a="rec_rno"]'); await wait(40);
  // Production
  await go2("Products List");
  click('[data-a="rec_dirp"][data-id="51"]'); await wait(100);
  const out=q('[data-iv="pr.outName"]'); must(out&&out.value==="Ugali","the production form opens with the name");
  must(/Ugali sells at Restaurant with no stock kept/.test(q("#vSub").textContent),"it says the two will be linked");
  must(q('[data-iv="pr.to"]').value==="Restaurant","to the right selling point");
  q("#pr_k").value="c"; q("#pr_q").value="2"; click('[data-a="rec_ladd"][data-f="pr"]'); await wait(50);
  const yq=q('[data-iv="pr.outQty"]'); yq.value="10"; yq.dispatchEvent(new Event("input",{bubbles:true})); yq.dispatchEvent(new Event("change",{bubbles:true})); await wait(20);
  const c0=ITEMS.length; click('[data-a="rec_run"]'); await wait(80);
  const K=Object.keys(it(51).r);
  must(K.length===1&&it(51).r[K[0]]===1,"production links the product: "+JSON.stringify(it(51).r));
  must(ITEMS.length===c0,"no second Ugali on the POS");
  must(STK.Restaurant[K[0]]===10,"the batch is at the selling point: "+STK.Restaurant[K[0]]);
  must(it(51).p===150,"the price is kept");
  await go2("Products List");
  must(/Production/.test(qa("#vSub tr").find(r=>r.textContent.includes("Ugali")).textContent)||!q('[data-a="rec_dirp"][data-id="51"]'),"it no longer shows as no stock");
  // Selling point popup
  await go2("Customers");
  // Customer form
  click('[data-a="cu_new"]'); await wait(40);
  must(!!q("#cuEd .cuf-credit")&&!!q("#cuEd .cuf-main"),"the new form is drawn");
  const val=(k,v)=>{ const e=q("#cu_"+k); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); };
  val("n","Acme Tours");
  must(q("#cuAv").textContent==="A","the badge follows the name");
  const before=CU.length; click('[data-a="cu_save"]'); await wait(30);
  must(CU.length===before&&!!q("#cuEd"),"a blank limit is refused");
  must(document.activeElement===q("#cu_limit"),"and the cursor goes to the limit");
  click('[data-a="cu_lim"][data-v="50000"]'); await wait(10);
  must(q("#cu_limit").value==="50000"&&q('[data-a="cu_lim"][data-v="50000"]').classList.contains("on"),"a quick amount fills the limit");
  must(q("#cu_n").value==="Acme Tours","and keeps what was typed");
  must(/50,000/.test(q("#cuLimNote").textContent),"the note reads back the limit: "+q("#cuLimNote").textContent);
  val("limit","0"); await wait(5); must(/Cash only/.test(q("#cuLimNote").textContent),"0 means cash only");
  val("limit","75000"); await wait(5); must(!q('[data-a="cu_lim"].on'),"a typed amount clears the quick button");
  click('[data-a="cu_days"][data-v="30"]'); await wait(10);
  click('[data-a="cu_save"]'); await wait(40);
  const C=CU.at(-1); must(C.n==="Acme Tours"&&C.limit===75000&&C.terms===30&&!q("#cuEd"),"saved with its limit");
  C.owes=90000; bosave(); await go2("Customers");
  click('[data-a="cu_edit"][data-i="'+CU.indexOf(C)+'"]'); await wait(40);
  must(q("#cu_limit").value==="75000"&&/15,000.*over/.test(q("#cuLimNote").textContent),"editing shows they are over: "+q("#cuLimNote").textContent);
  click('#cuEd [data-a="cu_edno"]'); await wait(30); must(!q("#cuEd"),"closes");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
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

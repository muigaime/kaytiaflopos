// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__mail=[];window.__mailFail=false;(()=>{const f0=window.fetch;window.fetch=(u,o)=>{if(String(u).includes("/api/mail/account")){if(o&&o.method==="POST"){window.__acct=JSON.parse(o.body);return Promise.resolve(new Response('{"ok":true}',{status:200}));}return Promise.resolve(new Response('{"host":"","port":587,"user":"","from":"","hasPass":false}',{status:200}));}if(String(u).includes("/api/mail/send")){if(window.__mailFail)return Promise.resolve(new Response(JSON.stringify({error:{code:"MAIL_NOT_SET"}}),{status:503}));window.__mail.push(JSON.parse(o.body));return Promise.resolve(new Response('{"ok":true}',{status:200}));}return f0(u,o);};})();
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

  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, it=id=>ITEMS.find(x=>x.id===id), vis=e=>e&&getComputedStyle(e).display!=="none", bodyHas=r=>r.test(document.body.textContent);
  const go2=async n=>{ const a=qa("#nav .nv").find(x=>x.dataset.n===n); if(!a) throw new Error("nav "+n); a.click(); await wait(100); };
  const toBO=async()=>{ q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400); };
  // Swap: with the right, no PIN
  USERS.find(u=>u.n==="Jane Waiter").perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,true])); applyRights();
  await add("Tusker","Bar"); await send("T1"); await wait(350); if(q("#rcClose")&&q("#mRc").classList.contains("show")) click("#rcClose"); await wait(20);
  const o=orders[0]; orders[0].lines; exOpen(o); await wait(20);
  must(q("#mEx").classList.contains("show"),"swap opens for someone with the right");
  must(!vis(q("#exAuth")),"no PIN box for them");
  qa("#exOld .exi").find(b=>b.textContent.includes("Tusker")).click(); await wait(10);
  const nw=qa("#exNew .exi")[0]; if(nw){ nw.click(); await wait(10); click("#exGo"); await wait(60); must(!q("#mEx").classList.contains("show")&&BILLLOG.some(x=>x.act==="Swap"&&x.by==="Jane Waiter"),"swapped without a PIN, under their own name"); if(q("#mRc").classList.contains("show")) click("#rcClose"); await wait(10); } else log("    (no same-price item in the seed; PIN box check only)");
  // Someone from before Waiter setup, with no rights list, still needs a PIN
  const pj=USERS.find(u=>u.n==="Jane Waiter").perm; delete USERS.find(u=>u.n==="Jane Waiter").perm; user.perm=undefined; exOpen(o); await wait(20);
  must(vis(q("#exAuth")),"a person with no rights list still gets the PIN box"); click('#mEx [data-close]'); await wait(10); user.perm=pj; USERS.find(u=>u.n==="Jane Waiter").perm=pj;
  user.perm=Object.fromEntries(WAITER_RIGHTS.flatMap(([,L])=>L).map(([k])=>[k,k!=="swap"])); exOpen(o); await wait(15); must(!q("#mEx").classList.contains("show"),"without the right, no swap"); user.perm=pj;
  // Back Office
  orders.length=0; click("#lock"); await wait(30);
  await toBO();
  // Categories
  await go2("Selling points"); click('[data-a="sp_open"][data-o="Restaurant"]'); await wait(60); click('[data-a="sp_sub"][data-k="cats"]'); await wait(50);
  must(qa(".sp-cats tbody tr").length===2,"the Categories tab lists this point's categories");
  q('[data-a="sp_catoff"][data-c="Mains"]').click(); await wait(50);
  must(catOffAt("Restaurant","Mains")&&!catOffAt("Pool","Mains"),"hidden at this selling point only");
  must(/Hidden/.test(qa(".sp-cats tbody tr").find(r=>r.textContent.includes("Mains")).textContent),"the page says Hidden");
  const d0=dept; dept="Restaurant"; drawCats(); must(!qa("#cats .cat").some(b=>b.dataset.c==="Mains"),"the POS menu no longer shows it");
  $("#fq").value="fish"; findList(); must(/No match/.test(q("#fr").textContent),"POS search doesn't find it");
  dept="Pool"; drawCats(); must(qa("#cats .cat").some(b=>b.dataset.c==="Mains"),"another selling point still shows it");
  q('[data-a="sp_catoff"][data-c="Mains"]').click(); await wait(50); dept="Restaurant"; drawCats(); must(qa("#cats .cat").some(b=>b.dataset.c==="Mains"),"it comes back"); dept=d0; drawCats();
  orders.push({lines:{3:1}});
  const mv=async(c,to)=>{ const b=q('[data-a="sp_catmove"][data-c="'+c+'"]'); b.previousElementSibling.value=to; b.click(); await wait(30); };
  await mv("Drinks","Pool"); must(it(3).d==="Restaurant"&&bodyHas(/open bill/),"an item on an open bill stops the move"); orders.pop();
  await mv("Mains","Pool"); must(it(2).d==="Restaurant","the first tap only asks");
  q('[data-a="sp_catmove"][data-c="Mains"]').click(); await wait(60);
  must(it(2).d==="Pool","the second tap moves it: "+it(2).d);
  must(it(2).p===1000&&it(2).c==="Mains","price and category kept");
  must(!qa(".sp-cats tbody tr").some(r=>r.textContent.includes("Mains")),"it has left this selling point");
  click('[data-a="sp_close"]'); await wait(40); click('[data-a="sp_open"][data-o="Bar"]'); await wait(60); click('[data-a="sp_sub"][data-k="cats"]'); await wait(50);
  await mv("Beer","Pool"); must(it(1).d==="Bar"&&bodyHas(/already sells Tusker/),"a name clash stops the move");
  // Waiter defaults
  await go2("Waiter setup"); click('[data-a="ws_new"]'); await wait(40);
  const ticks=()=>qa("[data-wsp]:checked").map(x=>x.dataset.wsp).sort().join();
  must(ticks()==="addPrinted,create,interim,orderStatus,printGuest,send","a new waiter has only the six: "+ticks());
  const r0=q("[data-wsr]"); r0.value="Cashier"; r0.dispatchEvent(new Event("change",{bubbles:true})); await wait(40);
  must(/clear/.test(ticks()),"a new cashier can still settle bills: "+ticks());
  const r1=q("[data-wsr]"); r1.value="Waiter"; r1.dispatchEvent(new Event("change",{bubbles:true})); await wait(40);
  must(ticks()==="addPrinted,create,interim,orderStatus,printGuest,send","back to the six for a waiter");
  // Email reports
  FD_SETTINGS.repMail={auto:false,to:"old@hotel.co.ke",reps:["dr"],last:null}; await go2("Settings"); click('[data-a="hs_tab"][data-k="email"]'); await wait(60);
  must(qa("[data-rmk]").length>=20,"every report can be ticked: "+qa("[data-rmk]").length);
  must(FD_SETTINGS.repMail.people[0].e==="old@hotel.co.ke"&&!FD_SETTINGS.repMail.to,"an address saved before names still works");
  click('[data-a="rm_del"][data-i="0"]'); await wait(10); must(FD_SETTINGS.repMail.people.length===0,"a person can be removed");
  await wait(40); must(/Not set up/.test(q("#rmAcct").textContent),"the account says Not set up");
  must(q('[data-a="rm_actest"]').disabled,"no test email until it is set up");
  click('[data-a="rm_acsave"]'); await wait(20); must(bodyHas(/email address reports are sent from/),"the account needs an address");
  q("#rmUser").value="reports@hotel.co.ke"; click('[data-a="rm_acsave"]'); await wait(20); must(bodyHas(/password for this email account/),"and a password");
  q("#rmPass").value="abcd efgh ijkl mnop"; click('[data-a="rm_acsave"]'); await wait(60);
  must(__acct&&__acct.host==="smtp.gmail.com"&&__acct.port===465&&__acct.user==="reports@hotel.co.ke"&&__acct.pass==="abcdefghijklmnop"&&__acct.from.includes("The Tide")&&__acct.from.includes("reports@hotel.co.ke"),"saved with Gmail's server: "+__acct.host+":"+__acct.port);
  must(/Set up/.test(q("#rmAcct .tag").textContent)&&q("#rmPass").value===""&&/Leave blank/.test(q("#rmPass").placeholder),"it now says Set up and the password box is empty");
  bosave(); must(!JSON.stringify(localStorage).includes("abcdefghijklmnop")&&!JSON.stringify(localStorage).includes("abcd efgh"),"the password is not kept in the browser");
  __acct=null; const pv=q("#rmProv"); pv.value="other"; pv.dispatchEvent(new Event("change",{bubbles:true})); await wait(10); must(!q("#rmHost").closest("label").hidden,"another server asks for its address");
  q("#rmHost").value="mail.hotel.co.ke"; q("#rmPort").value="587"; click('[data-a="rm_acsave"]'); await wait(60); must(__acct.host==="mail.hotel.co.ke"&&__acct.port===587&&__acct.pass===undefined,"a blank password keeps the saved one");
  __mail.length=0; click('[data-a="rm_actest"]'); await wait(60); must(__mail.length===1&&__mail[0].to==="reports@hotel.co.ke","a test email goes to the account");
  __mail.length=0; click('[data-a="rm_none"]'); await wait(5); q('[data-rmk="dr"]').checked=true; q('[data-rmk="ss"]').checked=true; q("#rmAuto").checked=true;
  const addP=async(n,e)=>{ q("#rmN").value=n; q("#rmE").value=e; click('[data-a="rm_add"]'); await wait(20); };
  await addP("","x@y.co"); must(bodyHas(/the person's name/),"a name is required");
  await addP("Amina","nope"); must(bodyHas(/doesn't look like an email/),"a bad address is refused");
  await addP("Amina Ali","owner@hotel.co.ke"); await addP("Accounts Desk","accounts@hotel.co.ke");
  must(qa(".rm-p").length===2&&/Amina Ali/.test(q("#rmPeople").textContent)&&q("#rmN").value==="","both are listed with their names");
  await addP("Again","OWNER@hotel.co.ke"); must(qa(".rm-p").length===2&&bodyHas(/already on the list/),"no duplicates");
  must(q('[data-rmk="ss"]').checked&&q("#rmAuto").checked,"adding someone keeps the ticks");
  click('[data-a="rm_save"]'); await wait(30);
  const S=FD_SETTINGS.repMail; must(S.auto&&S.reps.join()==="dr,ss"&&S.people.length===2,"saved: "+JSON.stringify(S.people));
  click('[data-a="rm_send"]'); await wait(120);
  must(__mail.length===2&&__mail[0].to==="owner@hotel.co.ke"&&__mail[1].to==="accounts@hotel.co.ke","one email to each address");
  must(/The Tide/.test(__mail[0].subject)&&__mail[0].html.includes("Staff Sales")&&!__mail[0].html.includes("Tips Report"),"only the ticked reports: "+__mail[0].subject);
  must(!/undefined|NaN/.test(__mail[0].html),"the figures are clean");
  must(/Sent/.test(q("#rmLast").textContent)&&/Amina Ali/.test(q("#rmLast").textContent),"the page shows who it went to");
  __mail.length=0; click('[data-a="rm_all"]'); await wait(5); click('[data-a="rm_send"]'); await wait(160);
  must(__mail.length===2&&!__mail[0].html.includes("Could not be prepared"),"every report can be emailed");
  must(__mail[0].html.length<3000000,"inside the size limit: "+__mail[0].html.length);
  click('[data-a="rm_none"]'); await wait(5); q('[data-rmk="dr"]').checked=true; click('[data-a="rm_save"]'); await wait(20);
  __mailFail=true; click('[data-a="rm_send"]'); await wait(120); must(S.last.ok===false&&/isn.t set up/.test(q("#rmLast").textContent),"email not set up is said plainly: "+q("#rmLast").textContent); __mailFail=false;
  // Leaving signs out
  click("#boMenu"); await wait(40); must(q("#start").style.display==="grid","Start menu goes to the main page");
  click('#start [data-go="bo"]'); await wait(60); must(vis(q("#boLogin")),"the Back Office asks to sign in again");
  q("#boBack").click(); await wait(30);
  // Ending the day emails with nobody in the Back Office
  ["Jane Waiter","Solo Sam","Boss"].forEach(n=>{ const sh=shiftOf(n); if(sh) shiftEnd(sh,0,"t"); });
  __mail.length=0; const de=dayEnd("t"); await wait(150);
  must(de==="","the day ends: "+de);
  must(__mail.length===2&&__mail[0].html.includes("Reports for")&&!__mail[0].html.includes("Could not be prepared"),"ending the day sends the reports: "+__mail.length);
  // Front Office
  click('#start [data-go="fd"]'); await wait(80); q("#flU").value="admin"; q("#flP").value="admin123"; click("#flGo"); await wait(200);
  must(q("#fd").classList.contains("show")&&!!fdUser,"signed in to the Front Office");
  click("#fdBack"); await wait(40);
  must(q("#start").style.display==="grid"&&!q("#fd").classList.contains("show"),"back to the main page");
  must(fdUser===null,"signed out straight away");
  click('#start [data-go="fd"]'); await wait(80);
  must(q("#fl").classList.contains("show")&&!q("#fd").classList.contains("show"),"the Front Office asks to sign in again");
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

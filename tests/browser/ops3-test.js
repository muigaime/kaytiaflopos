// node allp2-test.js <built.html> [out.png]: All sale points view and tickets on fake network printers, through the real server on :4000.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const got = { kitchen: [], bar: [], other: [] };
const fake = (port, who) => net.createServer(s => { let b = ""; s.on("data", d => (b += d.toString("latin1"))); s.on("end", () => got[who].push(b)); s.on("error", () => {}); }).listen(port, "127.0.0.1");
const P = [fake(9101, "kitchen"), fake(9102, "bar"), fake(9103, "other")];
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};window.__s={mail:[],pull:[],pullCalls:0,fxOff:false};(()=>{const f0=window.fetch,J=(x,s=200)=>Promise.resolve(new Response(JSON.stringify(x),{status:s}));window.fetch=(u,o)=>{const p=String(u),S=window.__s;if(p.includes("/lan/fx"))return S.fxOff?J({error:"no"},502):J({rates:{USD:0.0077,EUR:0.0069,GBP:0.0059,TZS:19.5}});if(p.includes("/lan/attendance/pull")){S.pullCalls++;const b=JSON.parse(o.body);return J({punches:S.pull.filter(x=>x.seq>b.after)});}if(p.includes("/lan/attendance/info"))return J({on:false,devices:"",lastSeen:{device:"",at:""},count:0});if(p.includes("/lan/attendance/save")){S.saved=JSON.parse(o.body);return J({ok:true});}if(p.includes("/lan/errlog/clear")){S.cleared=1;return J({ok:true});}if(p.includes("/lan/errlog"))return J({lines:["2026-11-09T08:00:00.000Z [Program] Email not sent: timeout"]});if(p.includes("/api/mail/send")){S.mail.push(JSON.parse(o.body));return J({ok:true});}return f0(u,o);};})();
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, S=window.__s, H0=()=>FD_SETTINGS.hr, tst=()=>(q("#toast")||{}).textContent||"", note=()=>(q("#fdNote")||{}).textContent||"", msg=()=>q("#scMsg").textContent;
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async n=>{ qa("#nav .nv").find(x=>/HR/.test(n)?/HR/.test(x.dataset.n):x.dataset.n===n).click(); await wait(100); }, he=(k,v)=>{ const e=q('[data-he="'+k+'"]'); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true})); };
  const addE=async(n,pw,bio)=>{ await nav("HR"); click('.ph-q[data-a="hr_empnew"]'); await wait(50); he("name",n); he("basic","30000"); if(pw) he("clockNew",pw); if(bio) he("bioId",bio); click('[data-a="hr_empsave"]'); await wait(300); };
  await addE("Mary Atieno","ab","");
  must(/at least 4/.test(tst()),"a short clock password is refused"); he("clockNew","pass1234"); he("bioId","7"); click('[data-a="hr_empsave"]'); await wait(300);
  const M=H0().emps.find(e=>e.name==="Mary Atieno"); must(!!M&&!!M.clockHash&&!JSON.stringify(M).includes("pass1234")&&M.clockNew===undefined,"the password is saved only as a hash");
  must(M.bioId==="7","the reader ID is saved");
  await addE("No Password","","");
  await nav("HR"); q('.ph-c[data-t="clock"]').click(); await wait(100); must(/Staff clock/.test(q("#vSub").textContent)&&/No Password/.test(q("#vSub").textContent),"the clock page lists who still needs a password");
  q("#bioOn").checked=true; q("#bioDev").value="ABC123"; click('[data-a="hr_biosave"]'); await wait(50); must(S.saved&&S.saved.on===true&&S.saved.devices==="ABC123","reader settings are saved");
  // Reader punches
  S.pull=[{seq:1,id:"7",at:"2026-11-09 08:01:00",type:"",device:"ABC123"},{seq:2,id:"7",at:"2026-11-09 08:01:40",type:"",device:"ABC123"},{seq:3,id:"99",at:"2026-11-09 08:02:00",type:"",device:"ABC123"}];
  await wait(61000);
  let tt=H0().time.filter(t=>t.emp===M.id); must(tt.length===1&&tt[0].in==="08:01"&&tt[0].src==="Biometric"&&!tt[0].out,"a punch clocks in, and a double tap counts once: "+JSON.stringify(tt));
  must(H0().bioSeq===3&&!!H0().bioMiss["99"],"an unknown ID is kept to show");
  S.pull=[{seq:4,id:"7",at:"2026-11-09 17:30:10",type:"",device:"ABC123"}]; await wait(61000);
  tt=H0().time.filter(t=>t.emp===M.id); must(tt[0].out==="17:30"&&tt.length===1,"the next punch clocks out");
  S.pull=[]; H0().time.length=0; bosave();
  click("#boMenu"); await wait(40);
  // The staff clock page
  must(!!q('#start [data-go="clock"]'),"Staff clock is on the main page");
  click('#start [data-go="clock"]'); await wait(40); must(q("#sClock").classList.contains("show")&&/[0-9]{2}:[0-9]{2}/.test(q("#scT").textContent)&&qa("#scE option").length===3,"the page opens with the staff");
  click("#scIn"); await wait(20); must(/Choose your name/.test(msg()),"a name is needed");
  q("#scE").value=H0().emps.find(e=>e.name==="No Password").id; click("#scIn"); await wait(20); must(/password yet/.test(msg()),"someone with no password is told");
  q("#scE").value=M.id; click("#scIn"); await wait(20); must(/Enter your password/.test(msg()),"a password is needed");
  q("#scP").value="wrong"; click("#scIn"); await wait(60); must(/isn.t right/.test(msg())&&!H0().time.length,"a wrong password does nothing");
  q("#scP").value="pass1234"; click("#scOut"); await wait(60); must(/haven.t clocked in/.test(msg()),"can't clock out first");
  q("#scE").value=M.id; q("#scP").value="pass1234"; click("#scIn"); await wait(60); must(/clocked in at/.test(msg())&&H0().time.length===1&&H0().time[0].src==="Staff clock"&&!H0().time[0].out,"clocks in: "+msg());
  must(q("#scP").value===""&&q("#scE").value==="","the form clears for the next person");
  q("#scE").value=M.id; q("#scP").value="pass1234"; click("#scIn"); await wait(60); must(/already clocked in/.test(msg())&&H0().time.length===1,"can't clock in twice");
  q("#scE").value=M.id; q("#scP").value="pass1234"; click("#scOut"); await wait(60); must(/clocked out at/.test(msg())&&!!H0().time[0].out,"clocks out");
  click("#scBack"); await wait(20); must(q("#start").style.display==="grid"&&!q("#sClock").classList.contains("show"),"back to the main page");
  // Error log and developer message
  setTimeout(()=>{ throw new Error("Test failure here"); },0); await wait(30); const eb=q("#errBanner"); if(eb) eb.remove();
  must(JSON.parse(localStorage.getItem("kaytia_error_log"))[0].msg.includes("Test failure here"),"errors are written to the log");
  { const ix=__E.findIndex(x=>/Test failure here/.test(x)); if(ix>=0) __E.splice(ix,1); }
  q("#start").style.display="none"; q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  await nav("Settings"); click('[data-a="hs_tab"][data-k="support"]'); await wait(120);
  must(/Test failure here/.test(q("#vSub").textContent)&&/Email not sent/.test(q("#vSub").textContent),"Settings shows screen and program errors");
  click('[data-a="su_send"]'); await wait(20); must(/developer's email/.test(tst()),"needs the address");
  q("#suTo").value="dev@example.com"; click('[data-a="su_send"]'); await wait(20); must(/subject/.test(tst()),"a subject");
  q("#suS").value="Help"; click('[data-a="su_send"]'); await wait(20); must(/message/.test(tst()),"a message");
  q("#suM").value="The <till> froze"; q("#suLog").checked=true; click('[data-a="su_send"]'); await wait(60);
  must(S.mail.length===1&&S.mail[0].to==="dev@example.com"&&/Help/.test(S.mail[0].subject)&&S.mail[0].html.includes("&lt;till&gt;")&&S.mail[0].html.includes("Test failure here"),"the message goes by email with the log");
  must(FD_SETTINGS.devMail==="dev@example.com","the address is remembered");
  q('[data-a="su_clear"]').click(); await wait(10); q('[data-a="su_clear"]').click(); await wait(60); must(S.cleared===1&&!localStorage.getItem("kaytia_error_log"),"the log can be cleared");
  click("#boMenu"); await wait(40);
  // Tariffs and exchange rates
  click('#start [data-go="fd"]'); await wait(70); q("#flU").value="admin"; q("#flP").value="admin123"; click("#flGo"); for(let w=0;w<4000&&!q("#fd").classList.contains("show");w++) await wait(5); await wait(40);
  ensureRoomTypes(); q('#fdRib [data-v="tariff"]').click(); await wait(60);
  must(!!q("[data-trate]")&&/All inclusive/.test(q("#fdBody").textContent),"tariffs show every meal plan");
  FD_SETTINGS.currencies=[]; q('[data-f="fxget"]').click(); await wait(60);
  const usd=FD_SETTINGS.currencies.find(c=>c.c==="USD"); must(usd&&Math.abs(usd.rate-129.87)<0.01&&!!FD_SETTINGS.fxAt&&FD_SETTINGS.currencies.length===3,"today's rates come in: "+JSON.stringify(usd));
  S.fxOff=true; const keep=usd.rate; q('[data-f="fxget"]').click(); await wait(60); must(/can't be reached/.test(note())&&usd.rate===keep,"no internet keeps the old rates"); S.fxOff=false;
  q("#fx_c").value="tzs"; q("#fx_r").value=""; q('[data-f="fxadd"]').click(); await wait(60); must(FD_SETTINGS.currencies.some(c=>c.c==="TZS"&&c.rate>0&&c.rate<1),"a new currency fetches its rate");
  q("#fx_c").value="XXQ"; q("#fx_r").value=""; q('[data-f="fxadd"]').click(); await wait(60); must(!FD_SETTINGS.currencies.some(c=>c.c==="XXQ")&&/No exchange rate/.test(note()),"an unknown currency isn't kept");
  const inp=q("[data-trate]"), tname=inp.dataset.trate; inp.value="7777"; inp.dispatchEvent(new Event("change",{bubbles:true})); await wait(40);
  must(roomTypeByName(tname).rate===7777&&ROOMS.filter(r=>r.type===tname).every(r=>r.rate===7777),"changing a tariff updates its rooms");
  const sel=q("[data-tarcur]"); sel.value="USD"; sel.dispatchEvent(new Event("change",{bubbles:true})); await wait(40); must(q("#fdBody table").textContent.includes("59.88"),"the tariff shows in dollars");
  FD_SETTINGS.fxAt=new Date(Date.now()-48*3600*1000).toISOString(); usd.rate=1; const r0=FD_SETTINGS.fxAt; fxAutoCheck(); await wait(50); must(FD_SETTINGS.fxAt!==r0&&FD_SETTINGS.currencies.find(c=>c.c==="USD").rate>100,"old rates refresh by themselves");
  FD_SETTINGS.fxAuto=false; FD_SETTINGS.fxAt=r0; fxAutoCheck(); await wait(50); must(FD_SETTINGS.fxAt===r0,"unless that is turned off"); FD_SETTINGS.fxAuto=true;
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=1440,900", "--virtual-time-budget=240000"];
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

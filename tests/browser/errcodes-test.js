// node errcodes-test.js <built.html>: error numbers on messages, the log, Help and logs, and role numbers.
const fs = require("fs"), net = require("net"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const OWNPW = fs.readFileSync(path.join(__dirname, "owner-pass.local"), "utf8").trim(); // git-ignored: one line, the owner password
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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, note=()=>(qa("#fsn").pop()||{}).textContent||"", tst=()=>(q("#toast")||{}).textContent||"", logL=()=>JSON.parse(localStorage.getItem("kaytia_error_log")||"[]");
  // the list itself
  const C=KF_ERRORS.map(e=>e[0]); must(new Set(C).size===C.length&&C.every(c=>c>=2000&&c<=9999),"every error number is unique and has four digits ("+C.length+")");
  must(KF_ERRORS.every(e=>e[1]&&e[2]&&e[3]),"every code says what it means and what to do");
  const RN=[...Object.values(KF_ROLE_NUMS),...Object.values(KF_POS_ROLE_NUMS)]; must(new Set(RN).size===RN.length&&RN.every(n=>n>=1000&&n<1300),"every role number is unique and apart from the error numbers");
  const code=m=>(kfErrOf(m)||[0])[0];
  must(code("Wrong username or password.")===2001&&code("You don't have the right to clear bills.")===3001&&code("Jane Waiter still has open bills. Clear them first.")===4001&&code("Not enough Tusker in Bar.")===7001&&code("The print server could not be reached.")===8101&&code("Enter the amount.")===2101,"messages get the right number");
  must(["Saved.","Added.","Shift started. Good selling!","M-Pesa payment received.","Stock received.","Message sent.","Password changed.","Sending...","Tusker deleted."].every(m=>!kfErrOf(m)),"confirmations get no number");
  must(kfTag("Error test · Error 4001")==="Error test · Error 4001","a number is never added twice");
  // the POS
  localStorage.removeItem("kaytia_error_log");
  fsNote("You don't have the right to clear bills.");
  must(/You don't have the right to clear bills\. · Error 3001 · Role 1201$/.test(note()),"a waiter's rights error shows the error and role numbers: "+note());
  must(logL()[0].code===3001&&/Error 3001/.test(logL()[0].msg),"and it goes in the error log");
  fsNote("Enter the amount."); must(/Error 2101$/.test(note())&&logL().length===1,"a missing entry has a number but isn't logged");
  fsNote("Bill sent."); must(note()==="Bill sent.","a confirmation is left as it is");
  // an unexpected error
  setTimeout(()=>{ throw new Error("boom test") },0); await wait(30); __E.splice(__E.findIndex(x=>/boom test/.test(x)),1); __E.splice(__E.findIndex(x=>/boom test/.test(x)),1);
  must(/Error 9001/.test((q("#errBanner")||{}).textContent||"")&&logL()[0].code===9001,"an unexpected error shows Error 9001 and is logged"); q("#errBanner").remove();
  // the Back Office
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  const nav=async n=>{ qa("#nav .nv").find(x=>x.dataset.n===n).click(); await wait(100); };
  await nav("Users & roles");
  must(qa(".ur-t th").some(th=>th.textContent==="Role no.")&&qa(".ur-t .ur-no").some(td=>td.textContent==="1000"),"Users & roles shows each user's role number");
  click('[data-a="ur_add"]'); await wait(20); must(/Enter the user's full name\. · Error 2101/.test(tst()),"a Back Office message shows its number: "+tst());
  click('[data-a="ur_tab"][data-t="rights"]'); await wait(40);
  q("#urNew").value="Night Auditor"; click('[data-a="ur_radd"]'); await wait(40);
  must(/as role 1101/.test(tst())&&/Role no\. 1101/.test(q(".ur-rno").textContent),"a new role gets 1101: "+tst());
  click('[data-a="ur_rdel"]'); await wait(40); q("#urNew").value="Gate Keeper"; click('[data-a="ur_radd"]'); await wait(40);
  must(/as role 1102/.test(tst()),"a deleted role's number isn't given again: "+tst());
  must(JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.roleNums["Night Auditor"]===1101,"role numbers are saved");
  // Help and logs
  await nav("Settings"); click('[data-a="hs_tab"][data-k="support"]'); await wait(150); if(q("#ownPw")){ q("#ownPw").value="${OWNPW}"; click('[data-a="hs_owngo"]'); await wait(200); }
  must(qa("[data-suc]").length===KF_ERRORS.length,"Help and logs lists every code");
  must(qa(".su-rl > div").some(d=>/1201/.test(d.textContent)&&/Waiter/.test(d.textContent))&&qa(".su-rl > div").some(d=>/1102/.test(d.textContent)&&/Gate Keeper/.test(d.textContent)),"and every role number");
  const sq=q("[data-suq]"); sq.value="printer"; sq.dispatchEvent(new Event("input",{bubbles:true})); await wait(20);
  const shown=()=>qa("[data-suc]").filter(r=>!r.hidden).map(r=>r.id);
  must(shown().includes("err8102")&&!shown().includes("err2001")&&/found/.test(q("#suQN").textContent),"searching finds codes: "+shown().join(","));
  sq.value="zzzz"; sq.dispatchEvent(new Event("input",{bubbles:true})); await wait(20); must(!shown().length&&/No code matches/.test(q("#suQN").textContent),"no match says so");
  const lb=q('[data-a="su_code"][data-v="3001"]'); must(!!lb,"the error log shows the code"); lb.click(); await wait(60);
  must(q("[data-suq]").value==="3001"&&JSON.stringify(shown())==='["err3001"]',"clicking the code shows what it means");
  const so=URL.createObjectURL; let csv=null; URL.createObjectURL=bl=>{ csv=bl; return "blob:x"; }; click('[data-a="su_codes_dl"]'); await wait(20); URL.createObjectURL=so; const tx=await csv.text(); must(tx.split(String.fromCharCode(13,10)).length===KF_ERRORS.length+1&&/"3001","Rights"/.test(tx),"the list downloads");
  // Waiter setup
  await nav("Waiter setup"); must(qa(".ws-w small").some(x=>/Waiter 1201/.test(x.textContent)),"Waiter setup shows the POS role number");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
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

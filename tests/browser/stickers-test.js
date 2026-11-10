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
  const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, tst=()=>(q("#toast")||{}).textContent||"", note=()=>(qa("#fsn").pop()||{}).textContent||"";
  // Barcodes decode back to what they say
  const decode=W=>{ const d=[...W].map(Number), sym=[]; for(let i=0;i<d.length-7;i+=6){ const p=d.slice(i,i+6).join(""); sym.push(C128.indexOf(p)); } const end=d.slice(-7).join(""); const chk=sym.at(-1), data=sym.slice(1,-1); return { start:sym[0], text:data.map(v=>String.fromCharCode(v+32)).join(""), ok:chk===(104+data.reduce((a,v,i)=>a+v*(i+1),0))%103, end }; };
  const D=decode(code128Widths("KF00012")); must(D.start===104&&D.text==="KF00012"&&D.ok&&D.end==="2331112","a barcode decodes back with a correct check digit");
  must(C128.length===107&&C128.slice(0,106).every(p=>[...p].reduce((a,x)=>a+ +x,0)===11)&&new Set(C128).size===107,"every bar pattern is valid and unique");
  must(itemBarcode(1)==="KF00001","the sticker code is built from the product code");
  // Scanning at the till
  const scan=async c=>{ for(const k of [...c,"Enter"]) { window.dispatchEvent(new KeyboardEvent("keydown",{key:k,bubbles:true,cancelable:true})); } await wait(30); };
  await tab;
  click('#spTabs [data-t="Bar"]'); await wait(20);
  await scan("KF00001"); must(cart[1]===1||Object.keys(cart).some(k=>k.split("~")[0]==="1"),"scanning a sticker adds the product: "+JSON.stringify(cart));
  await scan("KF00001"); must(Object.values(cart).reduce((a,x)=>a+x,0)===2,"scanning again adds another");
  dept="Bar"; await scan("KF00004"); must(Object.values(cart).reduce((a,x)=>a+x,0)===3&&!!cart[1]&&cart[1]===3,"another selling point's sticker finds the same product here: "+JSON.stringify(cart));
  click('#spTabs [data-t="Bar"]'); await wait(10); await scan("KF99999"); must(/isn.t on the system/.test(note()),"an unknown code is reported");
  const typed=async()=>{ for(const k of ["K","F","0","0","0","0","1"]){ window.dispatchEvent(new KeyboardEvent("keydown",{key:k})); await wait(150); } window.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter"})); await wait(20); }; const c0=Object.values(cart).reduce((a,x)=>a+x,0); await typed(); must(Object.values(cart).reduce((a,x)=>a+x,0)===c0,"slow typing isn't mistaken for a scanner");
  cart={}; drawCart();
  // Printing
  let P=null; window.open=()=>({ document:{ write(h){P=h;}, close(){} }, focus(){}, print(){ window.__pr=1; } });
  click("#lock"); await wait(25); q("#bo").classList.add("show"); click("#home"); await wait(20); q("#boU").value="admin"; q("#boP").value="admin123"; await wait(700); click("#boGo"); await wait(1400);
  qa("#nav .nv").find(x=>x.dataset.n==="Products List").click(); await wait(100);
  click('[data-a="prl_stk"]'); await wait(50);
  must(!!q("#stkEd")&&q('[data-stk0="from"]').value==="Bar","Print stickers starts on the bar's items");
  must(q('[data-a="prl_stkgo"]').disabled&&/Menu link needed/.test(q("#stkEd .stk1").textContent),"without a menu link it can't print yet");
  const uu=q('[data-stk0="url"]'); uu.value="not a link"; uu.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); must(q('[data-a="prl_stkgo"]').disabled&&!FD_SETTINGS.menuUrl,"a wrong link isn't kept");
  const u2=q('[data-stk0="url"]'); u2.value=" http://192.168.1.10:5500/menu "; u2.dispatchEvent(new Event("change",{bubbles:true})); await wait(30);
  must(!q('[data-a="prl_stkgo"]').disabled&&FD_SETTINGS.menuUrl==="http://192.168.1.10:5500/menu"&&JSON.parse(localStorage.getItem("kaytia_pos_bo_v1")).FS.menuUrl==="http://192.168.1.10:5500/menu","the menu link is saved for next time");
  const tx=q("#stkEd .stk1").textContent;
  must(qa("#stkEd .stk1").length===1&&/This is a product of The Tide. Enjoy!/.test(tx)&&/Tusker/.test(tx)&&!/KF00001/.test(tx)&&/Scan for our menu/i.test(tx)&&/KINDLY DO NOT PAY MORE/.test(tx)&&/KINDLY DO NOT REMOVE/.test(tx)&&/Signature/.test(tx)&&/LIPA NA M-PESA/.test(tx)&&/VISA/.test(tx)&&/MASTERCARD/.test(tx)&&/[0-9]{2}-20[0-9]{2}/.test(tx)&&qa("#stkEd .stk1 svg").length===1&&!!q("#stkEd .stk-crest"),"the sticker follows the format: "+tx);
  must(/KSH200/.test(tx)&&/Pool KSH 250/.test(tx),"it shows the price big, and the other selling point small: "+tx);
  const bw=qa("#stkEd .stk1, #stkEd .stk1 *").every(e=>{ const c=getComputedStyle(e); return [c.color,c.backgroundColor,c.borderTopColor].every(v=>/^rgba?[(]0, 0, 0|^rgba?[(]255, 255, 255|rgba[(][0-9]+, [0-9]+, [0-9]+, 0[)]/.test(v)); }); must(bw,"the sticker is black and white only");
  const fits=()=>qa("#stkEd .stk-bar,#stkEd .stk-pay span,#stkEd .stk-scan").every(e=>e.scrollWidth<=e.clientWidth+1)&&qa("#stkEd .stk1").every(e=>e.scrollHeight<=e.clientHeight+1); must(fits(),"nothing is cut off on the 80 x 50 sticker"); const szz=q('[data-stk0="size"]'); szz.value="l60"; szz.dispatchEvent(new Event("change",{bubbles:true})); await wait(40); must(fits(),"or on the 60 x 40 sticker"); const sz3=q('[data-stk0="size"]'); sz3.value="l80"; sz3.dispatchEvent(new Event("change",{bubbles:true})); await wait(40); const QT=[], QO=window.qrSvg; window.qrSvg=t=>{ QT.push(t); return QO(t); };
  const c2=q('[data-stk0="copies"]'); c2.value="3"; c2.dispatchEvent(new Event("change",{bubbles:true})); await wait(40); must(/3 stickers/.test(q("#stkEd").textContent),"copies count");
  click('[data-a="prl_stkgo"]'); await wait(40);
  must(window.__pr===1&&(P.match(/class="stk1"/g)||[]).length===3&&P.includes("80mm 50mm")&&/<path d="M/.test(P)&&P.includes("Tusker"),"it prints on 80 x 50 mm labels");
  must(QT.at(-1)==="http://192.168.1.10:5500/menu?i=1#you"&&!/KF00001/.test(P),"the QR code opens the menu at this product, and there's no barcode: "+JSON.stringify(QT.at(-1)));
  click('[data-a="prl_stk"]'); await wait(40); must(q('[data-stk0="url"]').value==="http://192.168.1.10:5500/menu"&&!q('[data-a="prl_stkgo"]').disabled,"next time the link is already there"); click('[data-a="prl_stkno"]'); await wait(20);
  must(!q("#stkEd"),"and closes");
  click('[data-a="prl_stk"]'); await wait(40); const sz=q('[data-stk0="size"]'); sz.value="a4"; sz.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); const fr=q('[data-stk0="from"]'); fr.value="all"; fr.dispatchEvent(new Event("change",{bubbles:true})); await wait(30); must(/5 stickers/.test(q("#stkEd").textContent),"all products can be chosen: "+q("#stkEd .itm-hint:last-child").textContent);
  P=null; click('[data-a="prl_stkgo"]'); await wait(40); must(P.includes("size:A4")&&(P.match(/class="stk1"/g)||[]).length===5,"or an A4 sheet");
  q('[data-a="prl_etsel"][data-id="2"]').click(); await wait(10); click('[data-a="prl_stk"]'); await wait(40); must(q('[data-stk0="from"]').value==="ticked"&&qa("#stkEd .stk1").length===1&&/Fish/.test(q("#stkEd .stk1").textContent),"ticked products come first"); click('[data-a="prl_stkno"]'); await wait(30);
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "vd-"));
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

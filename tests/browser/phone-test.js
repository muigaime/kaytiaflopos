// node tests/browser/phone-test.js <built.html> [out.png]
// A phone on the Wi-Fi opens the app over plain http, where the browser has no crypto.subtle.
// Passwords must still work (same SHA-256), older short hashes must still sign in, and the POS must fit a phone.
const fs = require("fs"), http = require("http"), path = require("path"), { execFile } = require("child_process");
const [file, outPng] = process.argv.slice(2);
const OWNPW = fs.readFileSync(path.join(__dirname, "owner-pass.local"), "utf8").trim(); // git-ignored
const v = fs.readFileSync(path.join(__dirname, "void-test.js"), "utf8");
const seed = v.slice(v.indexOf('localStorage.setItem("kaytia_machine"'), v.indexOf("</script>`;"));
const head = `<script>window.__E=[];addEventListener("error",e=>__E.push("ERR "+e.message));addEventListener("unhandledrejection",e=>__E.push("ERR "+e.reason));window.print=()=>{};
window.__sub=crypto.subtle; Object.defineProperty(Crypto.prototype,"subtle",{get(){return undefined},configurable:true});
${seed}
{const s=JSON.parse(localStorage.getItem("kaytia_pos_bo_v1"));s.A=[{u:"admin",n:"Administrator",ph:"x2781400666"},{u:"boss2",n:"Boss Two",ph:"cbd1c539e178383d9995c883d2fa7e9016249daec1fadc2573376ac69601fa75"}];localStorage.setItem("kaytia_pos_bo_v1",JSON.stringify(s));}</script>`;
const tail = `<script>(async()=>{const log=m=>__E.push(m),wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);if(!el)throw new Error("missing "+s);el.click();};
const must=(ok,w)=>{ log((ok?"ok  ":"BAD ")+w); if(!ok) throw new Error(w); }, tst=()=>(q("#toast")||{}).textContent||"";
const hex=async t=>[...new Uint8Array(await __sub.digest("SHA-256",new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,"0")).join("");
const old=t=>{let h=5381;for(const c of "kaytia|"+t)h=((h*33)^c.charCodeAt(0))>>>0;return "x"+h;};
const S=()=>JSON.parse(localStorage.getItem("kaytia_pos_bo_v1"));
const boIn=async(u,p)=>{ q("#boU").value=u; q("#boP").value=p; click("#boGo"); await wait(900); };
const inBo=()=>!!q("#nav .nv")&&getComputedStyle(q("#boLogin")).display==="none";
try{
  await wait(600);
  must(!crypto.subtle,"like a phone on plain http, the browser has no crypto.subtle");
  must(await hex("kaytia|boss2|boss2pass")==="cbd1c539e178383d9995c883d2fa7e9016249daec1fadc2573376ac69601fa75","(the seeded hash is the real SHA-256)");
  click('[data-go="bo"]'); await wait(300);
  await boIn("admin","wrong-pass");
  must(!inBo(),"a wrong password is refused");
  await boIn("boss2","boss2pass");
  must(inBo(),"a password saved on the main computer (SHA-256) signs in on the phone");
  // the owner password opens Database sync
  qa("#nav .nv").find(x=>x.dataset.n==="Settings").click(); await wait(150); click('[data-a="hs_tab"][data-k="sync"]'); await wait(150);
  q("#ownPw").value="${OWNPW}"; q("#ownPw").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})); await wait(300);
  must(!q("#ownPw"),"the owner password opens the owner pages on the phone: "+tst());
  // a password saved by an older copy, with the short hash, still signs in
  const lo=qa("#bo button").find(b=>/^Log out$/.test(b.textContent.trim())); must(!!lo,"there is a Log out button"); lo.click(); await wait(300);
  must(!inBo(),"signed out");
  await boIn("admin","admin123");
  must(inBo(),"the admin password, kept with the older short hash, still works");
  // POS on a phone
  const sm=qa("#bo button").find(b=>/^Start menu$/.test(b.textContent.trim())); sm.click(); await wait(300);
  click('[data-go="pos"]'); await wait(200); dayStart("t"); ["Jane Waiter","Solo Sam","Boss"].forEach(n=>shiftStart(n,0,"t"));
  must(getComputedStyle(q("#pBar")).display==="none"||q("#pBar").getBoundingClientRect().top>=innerHeight-1||getComputedStyle(q("#login")).zIndex>getComputedStyle(q("#pBar")).zIndex,"the bill bar stays under the PIN screen");
  for (const k of "1111E") { q('#kp [data-k="'+k+'"]').click(); await wait(15); } await wait(450);
  const bar=q("#pBar"), br=bar.getBoundingClientRect();
  must(getComputedStyle(bar).display==="flex"&&br.bottom<=innerHeight&&br.bottom>innerHeight-40,"on a phone the bill waits in a bar at the bottom");
  must(getComputedStyle(q(".pos .cats")).flexDirection==="row","categories are a row of chips");
  must(getComputedStyle(q("#grid")).gridTemplateColumns.split(" ").length===2,"items are two by two");
  qa("#grid .it")[0].click(); await wait(20); qa("#grid .it")[0].click(); await wait(20);
  must(q("#pbN").textContent==="2"&&/400/.test(q("#pbTot").textContent)&&bar.classList.contains("has"),"the bar counts the items and the total: "+q("#pbN").textContent+" "+q("#pbTot").textContent);
  must(q(".pos .rp").getBoundingClientRect().top>=innerHeight-2||getComputedStyle(q(".pos .rp")).visibility==="hidden","the bill is out of the way while choosing items");
  bar.click(); await wait(400);
  must(document.body.classList.contains("bill-open")&&getComputedStyle(q(".pos .rp")).visibility==="visible","tapping the bar opens the bill");
  must(/Tusker/.test(q("#lines").textContent)&&!!q("#sendBtn").getBoundingClientRect().height,"the bill shows the lines and its buttons");
  click("#rpClose"); await wait(400);
  must(!document.body.classList.contains("bill-open"),"Menu closes the bill");
  bar.click(); await wait(50); click("#lock"); await wait(100);
  must(!document.body.classList.contains("bill-open"),"logging out closes the bill for the next person");
}catch(e){log("X "+e.message)}
document.documentElement.setAttribute("data-test",__E.join(" @@ "));document.title="done";})();</script>`;
const html = fs.readFileSync(file, "utf8").replace("<head>", "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>");
const dir = fs.mkdtempSync(path.join(__dirname, "phone-"));
const web = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(5599, "127.0.0.1", () => {
  const args = ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${path.join(dir, "p")}`, "--window-size=500,900", "--virtual-time-budget=30000"];
  execFile("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", outPng ? [...args, `--screenshot=${outPng}`, "http://localhost:5599/"] : [...args, "--dump-dom", "http://localhost:5599/"], { encoding: "utf8", maxBuffer: 64e6, timeout: 120000 }, (e, o) => {
    if (outPng) console.log("saved", outPng);
    else {
      const m = /data-test="([^"]*)"/.exec(o || "");
      console.log((m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<") : "NO RESULT " + e).split(" @@ ").join("\n"));
    }
    web.close();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (x) {}
  });
});

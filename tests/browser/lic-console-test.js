// node lic-console-test.js: drives tools/license-console.html and checks the key with Node.
const fs=require("fs"),path=require("path"),http=require("http"),crypto=require("crypto"),{execFile}=require("child_process");
const dir=require("path").join(__dirname, "..", ".."), outPng=process.argv[2]; const jwkT=fs.readFileSync(path.join(dir,"tools","license-private-key.json"),"utf8"), pub=crypto.createPublicKey({key:JSON.parse(jwkT),format:"jwk"});
const tail=`<script>(async()=>{const L=[];const log=m=>L.push(m),wait=ms=>new Promise(r=>setTimeout(r,ms));try{
 const f=new File([${JSON.stringify(jwkT)}],"k.json"); const dt=new DataTransfer(); dt.items.add(f); $("#file").files=dt.files; $("#file").dispatchEvent(new Event("change")); await wait(400); log("KEY "+$("#keyState").textContent);
 $("#make").click(); await wait(50); log("NO CLIENT: "+$("#msg").textContent); $("#client").value="The Tide Hotel"; $("#code").value="bad"; $("#make").click(); await wait(50); log("BAD CODE: "+$("#msg").textContent); $("#code").value="kf-1a2b-3c4d-5e6f"; $("#len").value="30"; $("#make").click(); await wait(300); log("MADE: "+$("#msg").textContent); log("LIC="+$("#out").value);
 $("#len").value="0"; $("#make").click(); await wait(300); log("NOEND="+$("#out").value); $("#lock").click(); await wait(300); log("LOCK="+$("#out").value); log("ROWS "+document.querySelectorAll("#list tr").length+" | "+[...document.querySelectorAll("#list tr")].map(r=>r.cells[3].textContent+"/"+r.cells[5].textContent).join(";"));
 $("#q").value="nothing"; $("#q").oninput(); log("SEARCH "+document.querySelectorAll("#list tr button").length); $("#q").value=""; $("#q").oninput();
}catch(e){log("X "+e.message)} document.documentElement.setAttribute("data-test",L.join(" @@ "));})();</script>`;
const html=fs.readFileSync(path.join(dir,"tools","license-console.html"),"utf8").replace(/<\/body>/,tail+"</body>");
const tmp=fs.mkdtempSync(path.join(__dirname,"lcc-"));
const web=http.createServer((q,r)=>{r.setHeader("content-type","text/html");r.end(html);}).listen(5598,"127.0.0.1",()=>{
 const args=["--headless","--disable-gpu","--no-first-run","--hide-scrollbars","--user-data-dir="+path.join(tmp,"p"),"--window-size=1200,1000","--virtual-time-budget=9000"];
 execFile("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",outPng?[...args,"--screenshot="+outPng,"http://localhost:5598/"]:[...args,"--dump-dom","http://localhost:5598/"],{encoding:"utf8",maxBuffer:64e6,timeout:60000},(e,o)=>{
  if(!outPng){const m=(o||"").match(/data-test="([^"]*)"/); const L=(m?m[1].replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&gt;/g,">"):"NO RESULT").split(" @@ ");
   for(const l of L){const k=l.match(/^(LIC|NOEND|LOCK)=(.*)$/); if(!k){console.log(l);continue;} const [v,p,g]=k[2].split("."); const ok=crypto.verify("RSA-SHA256",Buffer.from(p),pub,Buffer.from(g,"base64url")); console.log(k[1]+": signature "+ok+" | "+Buffer.from(p,"base64url").toString()+" | length "+k[2].length);}}
  web.close(); try{fs.rmSync(tmp,{recursive:true,force:true});}catch(x){} setTimeout(()=>process.exit(0),200);});});

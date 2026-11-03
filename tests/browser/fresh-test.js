// node fresh-test.js <dist>: a new install, nothing saved.
const fs=require("fs"),path=require("path"),{execFile}=require("child_process");
const tail='<script>window.__E=[];addEventListener("load",()=>setTimeout(()=>{const R={alld:ALLD,oi:Object.keys(OUTLET_INFO),market:ITEMS.filter(i=>/supermarket|grocery|dairy|bakery/i.test(i.d+i.c)).map(i=>i.n),items:ITEMS.length,users:USERS.map(u=>u.n+":"+u.d.join("+")+":"+u.role),err:window.__E};document.documentElement.setAttribute("data-r",btoa(unescape(encodeURIComponent(JSON.stringify(R)))));},1500));</script>';
const head='<script>window.__E=[];addEventListener("error",e=>__E.push(e.message));localStorage.setItem("kaytia_machine","NEW");</script>';
const tmp=fs.mkdtempSync(path.join(__dirname,"fr-")),p=path.join(tmp,"p.html");
fs.writeFileSync(p,fs.readFileSync(process.argv[2],"utf8").replace("<head>","<head>"+head).replace(/<\/body>(?![\s\S]*<\/body>)/,tail+"</body>"));
execFile("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",["--headless=new","--disable-gpu","--user-data-dir="+path.join(tmp,"u"),"--virtual-time-budget=8000","--dump-dom","file:///"+p.replace(/\\/g,"/")],{encoding:"utf8",maxBuffer:1<<28,timeout:80000},(e,o)=>{const m=(o||"").match(/data-r="([^"]+)"/);console.log(m?Buffer.from(m[1],"base64").toString():"NO RESULT");fs.rmSync(tmp,{recursive:true,force:true});});

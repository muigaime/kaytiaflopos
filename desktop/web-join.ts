// The page a phone or another computer's browser sees the first time it opens the Main's address.
// It signs the device in once with the server login (or the connect code), then the full app opens.
const page = (
  withLogin: boolean
) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#1a130c"><title>Kaytia Flow · Sign in this device</title><style>
*{box-sizing:border-box}html,body{margin:0}body{min-height:100vh;display:grid;place-items:center;padding:20px 16px;background:radial-gradient(1200px 600px at 50% -10%,#3a2a17 0%,#1a130c 60%);color:#241b12;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{width:min(440px,100%);padding:28px 24px 24px;background:#fffdf7;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.45);border-top:4px solid #b8862b}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:18px}.k{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;border:2px solid #b8862b;color:#8a5f13;font:700 22px Georgia,serif}
.brand b{display:block;font:700 22px Georgia,serif}.brand i{color:#a8741a}.brand small{display:block;margin-top:-2px;color:#8b7f6e;font-size:11px;letter-spacing:.18em;text-transform:uppercase}
h1{margin:0 0 4px;font:700 20px Georgia,serif}p{margin:0 0 14px;color:#6b6358;font-size:14px}
label{display:block;margin:14px 0 6px;font-weight:700;font-size:14px}input{width:100%;padding:13px 14px;font:inherit;border:1px solid #cfc3ad;border-radius:10px;background:#fff}input:focus{outline:2px solid #b8862b;outline-offset:1px;border-color:#b8862b}
button{width:100%;margin-top:20px;padding:14px;color:#fff;background:#241b12;border:0;border-radius:10px;font:inherit;font-weight:700;cursor:pointer}button:disabled{opacity:.6}
.err{display:none;margin-top:14px;padding:10px 12px;border-radius:8px;background:#fbeceb;color:#9b1c1c;font-size:14px}.err.show{display:block}
.note{margin-top:18px;padding:10px 12px;background:#f9f5ed;border-left:3px solid #b8862b;border-radius:6px;color:#6b6358;font-size:13px}
</style></head><body><main>
<div class="brand"><span class="k">K</span><span><b>Kaytia <i>Flow</i></b><small>On this network</small></span></div>
<h1>Sign in this device</h1>
<p>${withLogin ? "Use the server's username and password, set when the main computer was installed. You only do this once on each device." : "Enter the connect code shown on the main computer, under Connect computers. You only do this once on each device."}</p>
<form id="f" autocomplete="off">
<label for="n">Name this device</label><input id="n" maxlength="40" placeholder="e.g. Waiter phone 1" required>
${withLogin ? '<label for="u">Server username</label><input id="u" autocapitalize="off" autocomplete="username" required><label for="p">Server password</label><input id="p" type="password" autocomplete="current-password" required>' : '<label for="p">Connect code</label><input id="p" autocapitalize="characters" required>'}
<button id="go" type="submit">Sign in</button><div class="err" id="e" role="alert"></div></form>
<div class="note">After this, staff sign in with their own username or PIN, and see only what their role allows.</div>
</main><script>
const f=document.getElementById("f"),e=document.getElementById("e"),go=document.getElementById("go"),v=id=>{const x=document.getElementById(id);return x?x.value.trim():"";};
document.getElementById("n").value=localStorage.getItem("kf_dev_name")||(/iphone|android|mobile/i.test(navigator.userAgent)?"Phone":"Browser");
f.onsubmit=async ev=>{ev.preventDefault();e.className="err";go.disabled=true;go.textContent="Signing in...";
try{const r=await fetch("/web/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:v("n"),user:v("u"),pass:document.getElementById("p").value})});const j=await r.json().catch(()=>({}));
if(r.ok){try{localStorage.setItem("kf_dev_name",v("n"));}catch(x){}location.replace("/");return;}e.textContent=j.error||"That didn't work. Try again.";}
catch(x){e.textContent="The main computer can't be reached. Check you are on the same Wi-Fi.";}
e.className="err show";go.disabled=false;go.textContent="Sign in";};
</script></body></html>`;
export const webJoinPage = (withLogin: boolean) => page(withLogin);

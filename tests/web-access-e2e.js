// Phones and browsers on the network: run the built program in a temp folder and reach it the way a
// phone on the Wi-Fi would (from this computer's own network address, not localhost).
// node tests/web-access-e2e.js [path-to-KaytiaFlow.exe]
const { spawn } = require("child_process");
const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  http = require("http");
const EXE = process.argv[2] || "C:\\Users\\LIAM\\Desktop\\compiled\\KaytiaFlow.exe";
const PORT = 5631,
  API = 4031;
const lanIp = Object.values(os.networkInterfaces())
  .flat()
  .find(
    a => a && a.family === "IPv4" && !a.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)
  );
if (!lanIp) {
  console.log("SKIP no private network address on this computer");
  process.exit(0);
}
const IP = lanIp.address;
const home = fs.mkdtempSync(path.join(os.tmpdir(), "kf-web-"));
let pass = 0,
  fail = 0;
const must = (c, m) => {
  if (c) {
    pass++;
    console.log("ok  " + m);
  } else {
    fail++;
    console.log("BAD " + m);
  }
};
/** A request from the phone's side: this computer's network address, so the program sees a network client. */
function req(method, p, { body, cookie, host, origin, local } = {}) {
  return new Promise(ok => {
    const data = body === undefined ? null : JSON.stringify(body);
    const r = http.request(
      {
        host: local ? "127.0.0.1" : IP,
        localAddress: local ? undefined : IP,
        port: PORT,
        path: p,
        method,
        headers: {
          host: local ? `localhost:${PORT}` : host || `${IP}:${PORT}`,
          ...(data ? { "content-type": "application/json" } : {}),
          ...(cookie ? { cookie } : {}),
          ...(origin ? { origin } : {})
        }
      },
      res => {
        let s = "";
        res.on("data", d => (s += d));
        res.on("end", () => {
          let j = null;
          try {
            j = JSON.parse(s);
          } catch (e) {}
          ok({ status: res.statusCode, text: s, json: j, headers: res.headers });
        });
      }
    );
    r.on("error", e => ok({ status: 0, text: String(e), json: null, headers: {} }));
    if (data) r.write(data);
    r.end();
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const p = spawn(EXE, [], {
    env: {
      ...process.env,
      KAYTIA_HOME: home,
      KAYTIA_NO_INSTALL: "1",
      KAYTIA_NO_BROWSER: "1",
      KAYTIA_NO_AUTOSTART: "1",
      KAYTIA_PORT: String(PORT),
      KAYTIA_API_PORT: String(API)
    },
    stdio: "ignore",
    windowsHide: true
  });
  try {
    let up = false;
    for (let i = 0; i < 80 && !up; i++) {
      up = (await req("GET", "/lan/status", { local: true })).status === 200;
      if (!up) await wait(250);
    }
    must(up, "the program starts");
    await req("POST", "/lan/main", { local: true, body: {} });
    const off = await req("GET", "/");
    must(off.status === 403, "while it is off, a phone can't open the app: " + off.status);
    const info0 = await req("GET", "/lan/web-access", { local: true });
    must(info0.json && info0.json.on === false && info0.json.urls.some(u => u.includes(IP)), "settings show it off, with this computer's address: " + (info0.json && info0.json.urls));
    const on = await req("POST", "/lan/web-access", { local: true, body: { on: true } });
    must(on.json && on.json.on === true, "the Main turns it on");
    const phoneOn = await req("POST", "/lan/web-access", { body: { on: false } });
    must(phoneOn.status === 403, "a phone can't change that setting: " + phoneOn.status);

    const join = await req("GET", "/");
    must(join.status === 200 && /Sign in this device/.test(join.text) && !/LAN_EVERY/.test(join.text), "a new phone gets the sign-in page, not the app");
    must(/Connect code/.test(join.text), "with no server login, it asks for the connect code");
    const st0 = await req("GET", "/lan/status");
    must(st0.status === 403, "without signing in, the data can't be reached: " + st0.status);

    const code = (await req("GET", "/lan/info", { local: true })).json.code;
    const wrong = await req("POST", "/web/join", { body: { name: "Waiter phone", pass: "WRONG1" } });
    must(wrong.status === 401 && !wrong.headers["set-cookie"], "a wrong code is refused: " + wrong.status);
    const evil = await req("POST", "/web/join", { body: { name: "x", pass: code }, origin: "http://evil.example" });
    must(evil.status === 403, "another website can't sign a phone in: " + evil.status);
    const rebind = await req("POST", "/web/join", { body: { name: "x", pass: code }, host: "evil.example:" + PORT });
    must(rebind.status === 403, "an address that isn't this computer's is refused: " + rebind.status);

    const ok = await req("POST", "/web/join", { body: { name: "Waiter phone", pass: code } });
    const sc = String((ok.headers["set-cookie"] || [])[0] || "");
    must(ok.status === 200 && /HttpOnly/i.test(sc) && /SameSite=Strict/i.test(sc), "the right code signs the phone in, with a private cookie");
    const cookie = sc.split(";")[0];

    const app = await req("GET", "/", { cookie });
    must(app.status === 200 && /LAN_EVERY|lanTick/.test(app.text), "now the phone gets the full app");
    must(app.headers["x-frame-options"] === "DENY", "the app can't be framed by another site");
    const st = await req("GET", "/lan/status", { cookie });
    must(st.json && st.json.role === "till" && st.json.browser === true && st.json.idx >= 1 && st.json.numbered === true, "the phone works like a till with its own bill numbers: " + st.text);
    const sync = await req("POST", "/lan/sync", { cookie, body: { base: null, data: { USERS: [{ n: "x" }] } } });
    must(sync.status === 200 && sync.json && typeof sync.json.rev === "number", "the phone syncs with the Main: " + sync.text.slice(0, 80));
    const rev = await req("GET", "/lan/rev", { cookie });
    must(rev.json && rev.json.ok === true, "it can check for new data");
    const lic = await req("GET", "/lan/license", { cookie });
    must(lic.status === 200, "it gets the company license from the Main");

    for (const [m, u] of [["GET", "/lan/info"], ["GET", "/lan/sync-status"], ["POST", "/lan/service/restart"], ["POST", "/lan/license"], ["POST", "/lan/cloud/now"], ["GET", "/lan/errlog"], ["POST", "/lan/main"], ["GET", "/connect"]]) {
      const r = await req(m, u, { cookie, body: m === "POST" ? {} : undefined });
      must(r.status === 403, `a phone can't use ${m} ${u}: ${r.status}`);
    }
    const borrowed = await req("GET", "/lan/status", { cookie, host: "evil.example:" + PORT });
    must(borrowed.status === 403, "a signed-in phone can't be used through another site's address");

    const list = await req("GET", "/lan/web-access", { local: true });
    const dev = list.json.devices[0];
    must(list.json.devices.length === 1 && dev.name === "Waiter phone" && dev.ip === IP, "the Main lists the phone by name and address");
    const cfg = fs.readFileSync(path.join(home, "config.json"), "utf8");
    must(!cfg.includes(cookie.split("=")[1]), "the Main keeps only a hash of the phone's key");

    await req("POST", "/lan/web-access/remove", { local: true, body: { id: dev.id } });
    const gone = await req("GET", "/lan/status", { cookie });
    must(gone.status === 403, "a removed phone is cut off");
    const back = await req("GET", "/", { cookie });
    must(/Sign in this device/.test(back.text), "and has to sign in again");

    await req("POST", "/lan/web-access", { local: true, body: { on: false } });
    const off2 = await req("GET", "/");
    must(off2.status === 403, "turned off again, phones can't open it");
    const menu = await req("GET", "/menu");
    must(menu.status !== 403, "the guest menu still works for phones: " + menu.status);
  } catch (e) {
    fail++;
    console.log("BAD crashed " + (e && e.stack));
  } finally {
    p.kill();
    await wait(500);
    try {
      fs.rmSync(home, { recursive: true, force: true });
    } catch (e) {}
  }
  console.log(`\n${pass} ok, ${fail} bad`);
  process.exit(fail ? 1 : 0);
})();

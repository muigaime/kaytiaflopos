// ---- M-Pesa setup and payments: Daraja, the modem, and everything received ----
// Keys and passwords stay in the server's settings file. This page only sees whether they are saved.
const mpS = {
  loaded: false,
  busy: false,
  err: "",
  tab: "mpesa",
  d: null,
  m: null,
  ports: [],
  list: [],
  e: null
};
const mpAdmin = (op, body, area = "mpesa") =>
  fetch(`/lan/${area}-admin/${op}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  })
    .then(async r => ({ ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, status: 0, j: {} }));
async function mpLoad() {
  if (mpS.busy) return;
  mpS.busy = true;
  const [r, er] = await Promise.all([mpAdmin("info", {}), mpAdmin("info", {}, "etims")]);
  mpS.busy = false;
  mpS.e = er.ok && er.j.counts ? er.j : null;
  mpS.loaded = true;
  const good = r.ok && r.j.daraja && r.j.modem && Array.isArray(r.j.list);
  mpS.err = good
    ? ""
    : r.status === 409 || (r.status === 403 && LAN.browser)
      ? "M-Pesa is set up on the main computer."
      : "This page works in the installed Kaytia Flow program.";
  if (good) Object.assign(mpS, { d: r.j.daraja, m: r.j.modem, ports: r.j.ports, list: r.j.list });
  if (view === "mpesa") all();
}
const mpVia = { modem: "Modem", daraja: "Phone request", typed: "Typed by cashier" };
const MP_MODEM_WORD = {
  off: "Off",
  connecting: "Connecting",
  ready: "Connected",
  error: "Not connected"
};
const mpHead = () =>
  `<div class="ph-h"><h1>M-Pesa &amp; eTIMS</h1><p>Take M-Pesa payments and get receipts signed for KRA.</p></div><div class="set-tabs" role="tablist">${[
    ["mpesa", "M-Pesa"],
    ["etims", "eTIMS"]
  ]
    .map(
      ([k, l]) =>
        `<button role="tab" aria-selected="${k === mpS.tab}" class="${k === mpS.tab ? "on" : ""}" data-a="mp_tab" data-k="${k}">${l}</button>`
    )
    .join("")}</div>`;
const ET_WORD = {
  signed: ["ok", "Signed"],
  waiting: ["warn", "Waiting"],
  failed: ["bad", "Refused"]
};
function etimsHTML() {
  const E = mpS.e;
  if (!E)
    return `<div class="ph mp-page">${mpHead()}<div class="pn"><div class="empty">Set this up on the main computer.</div></div></div>`;
  const live = E.mode === "live",
    tile = (ic, l, v, s) =>
      `<div class="ph-t"><span class="ph-i">${I(ic)}</span><span class="ph-l">${l}</span><b>${v}</b><small>${s}</small></div>`;
  return `<div class="ph mp-page">${mpHead()}
  <div class="ph-ts">${tile("check", "Signed", E.counts.signed, "Receipts")}${tile("alert", "Waiting", E.counts.waiting, "Sent again automatically")}${tile("shield", "Refused", E.counts.failed, "Need attention")}${tile("spark", "Connection", live ? "Live" : "Test", live ? esc(E.url) : "Not KRA. Receipts are marked TEST")}</div>
  <section class="pn"><div class="inv-head"><h4>eTIMS service</h4><span class="tag ${live ? "ok" : "warn"}">${live ? "Live" : "Test"}</span></div>
   <div class="stk">${live ? "Bills are sent to the service below as they are settled." : "A stand-in answers like the cloud, so receipts print and every step can be tried. Nothing goes to KRA, and each receipt says TEST."}</div>
   <div class="mp-g mp-g3"><label>Mode<select id="etMode"><option value="standin" ${live ? "" : "selected"}>Test (stand-in)</option><option value="live" ${live ? "selected" : ""}>Live (cloud service)</option></select></label><label>Service address<input id="etUrl" value="${esc(E.url)}" autocomplete="off" placeholder="https://..."></label><label>API key<input id="etKey" type="password" autocomplete="new-password" placeholder="${E.hasKey ? "Saved. Leave blank to keep it" : ""}"></label><label>Hotel KRA PIN<input id="etPin" value="${esc(E.pin)}" maxlength="11" autocomplete="off" style="text-transform:uppercase" placeholder="A000000000B"></label><label>Branch<input id="etBranch" value="${esc(E.branch)}" maxlength="10" autocomplete="off"></label></div>
   <div class="mp-b"><button class="chip on" data-a="mp_esave">Save</button><button class="mini" data-a="mp_etest">Test connection</button></div></section>
  <div class="pn tw"><div class="inv-head"><h4>Receipts (${E.list.length})</h4><button class="mini" data-a="mp_reload">Refresh</button></div>${
    E.list.length
      ? `<table class="t mp-t"><thead><tr><th>Time</th><th>Bill</th><th>Status</th><th>CU serial</th><th class="n">Amount</th><th></th></tr></thead><tbody>${E.list.map(x => `<tr><td>${dt2(x.at)}</td><td><b>${esc(x.bill)}</b></td><td><span class="tag ${ET_WORD[x.status][0]}">${ET_WORD[x.status][1]}</span>${x.test ? ' <span class="tag">Test</span>' : ""}${x.err ? `<small class="mp-err">${esc(x.err)}</small>` : ""}</td><td>${esc(x.cu || "-")}</td><td class="n">${m2(x.gross)}</td><td class="n">${x.status === "signed" ? "" : `<button class="mini" data-a="mp_eretry" data-bill="${esc(x.bill)}">Send again</button>`}</td></tr>`).join("")}</tbody></table>`
      : '<div class="empty">No receipts yet.</div>'
  }</div></div>`;
}
function mpesaHTML() {
  if (!mpS.loaded) {
    mpLoad();
    return '<div class="ph"><div class="ph-h"><h1>M-Pesa &amp; eTIMS</h1></div><div class="stk">Loading…</div></div>';
  }
  if (mpS.err)
    return `<div class="ph"><div class="ph-h"><h1>M-Pesa &amp; eTIMS</h1></div><div class="pn"><div class="empty">${esc(mpS.err)}</div></div></div>`;
  if (mpS.tab === "etims") return etimsHTML();
  const D = mpS.d,
    M = mpS.m,
    today = bizDate(),
    day = mpS.list.filter(e => ymdOf(e.at) === today && e.via !== "typed"),
    open = mpS.list.filter(e => !e.used && e.via !== "typed"),
    field = (l, id, v, attrs = "") =>
      `<label>${l}<input id="${id}" value="${esc(v)}" autocomplete="off" ${attrs}></label>`,
    secret = (l, id, has) =>
      `<label>${l}<input id="${id}" type="password" autocomplete="new-password" placeholder="${has ? "Saved. Leave blank to keep it" : ""}"></label>`,
    pick = (id, L, on) =>
      `<select id="${id}">${L.map(([v, t]) => `<option value="${v}" ${v === on ? "selected" : ""}>${t}</option>`).join("")}</select>`,
    state = M.state === "ready" ? "ok" : M.state === "error" ? "bad" : "";
  return `<div class="ph mp-page">${mpHead()}
  <div class="ph-ts"><div class="ph-t"><span class="ph-i">${I("cash")}</span><span class="ph-l">Received today</span><b>KES ${m2(day.reduce((a, e) => a + e.amt, 0))}</b><small>${plural(day.length, "payment")}</small></div><div class="ph-t"><span class="ph-i">${I("alert")}</span><span class="ph-l">Not yet on a bill</span><b>${open.length}</b><small>Waiting for a cashier</small></div><div class="ph-t"><span class="ph-i">${I("phone")}</span><span class="ph-l">Phone request</span><b>${D.set ? "Ready" : "Not set up"}</b><small>${D.set ? (D.env === "production" ? "Live" : "Test mode") : "Daraja"}</small></div><div class="ph-t"><span class="ph-i">${I("spark")}</span><span class="ph-l">Modem</span><b>${MP_MODEM_WORD[M.state]}</b><small>${esc(M.msg || M.port || "No port chosen")}</small></div></div>
  <div class="mp-two">
   <section class="pn"><div class="inv-head"><h4>Phone request (Daraja)</h4><span class="tag ${D.set ? "ok" : "warn"}">${D.set ? "Saved" : "Not set up"}</span></div>
    <div class="stk">The till sends a request and the customer enters their PIN. Use the keys from Safaricom's Daraja portal.</div>
    <div class="mp-g"><label>Mode${pick(
      "mpEnv",
      [
        ["sandbox", "Test (sandbox)"],
        ["production", "Live"]
      ],
      D.env
    )}</label><label>Account type${pick(
      "mpType",
      [
        ["paybill", "Paybill"],
        ["till", "Till (Buy Goods)"]
      ],
      D.type
    )}</label>
    ${field("Shortcode or store number", "mpShort", D.shortcode, 'inputmode="numeric"')}${field("Till number (for Buy Goods)", "mpTill", D.till, 'inputmode="numeric"')}
    ${secret("Consumer key", "mpKey", D.hasKey)}${secret("Consumer secret", "mpSecret", D.hasSecret)}${secret("Passkey", "mpPass", D.hasPasskey)}${field("Public address (optional)", "mpUrl", D.publicUrl, 'placeholder="https://..."')}</div>
    <div class="itm-hint">Without a public address, payments still confirm, but the bill shows a reference starting STK instead of the M-Pesa receipt number.</div>
    <div class="mp-b"><button class="chip on" data-a="mp_dsave">Save</button><button class="mini" data-a="mp_test" ${D.set ? "" : "disabled"}>Test connection</button></div></section>
   <section class="pn"><div class="inv-head"><h4>Modem</h4><span class="tag ${state}">${MP_MODEM_WORD[M.state]}</span></div>
    <div class="stk">Plug a GSM modem into this computer, with the SIM that receives your M-Pesa messages. Payments appear for cashiers to pick.</div>
    <div class="mp-g"><label>COM port${pick("mpPort", [["", mpS.ports.length ? "Choose" : "No ports found"], ...mpS.ports.map(p => [p, p])], M.port)}</label><label>Speed${pick(
      "mpBaud",
      ["115200", "57600", "38400", "19200", "9600"].map(x => [x, x]),
      M.baud
    )}</label></div>
    <label class="mp-on"><input id="mpOn" type="checkbox" ${M.on ? "checked" : ""}><span><b>Read M-Pesa messages from the modem</b><small>Messages are deleted from the SIM once read, so use a SIM just for this.</small></span></label>
    ${M.msg ? `<div class="itm-hint">${esc(M.msg)}</div>` : ""}${M.last ? `<div class="itm-hint">Last payment read ${dt2(M.last)}.</div>` : ""}
    <div class="mp-b"><button class="chip on" data-a="mp_msave">Save</button><button class="mini" data-a="mp_reload">Refresh</button></div></section>
  </div>
  <div class="pn tw"><div class="inv-head"><h4>Payments received (${mpS.list.length})</h4></div>${
    mpS.list.length
      ? `<table class="t mp-t"><thead><tr><th>Time</th><th>Code</th><th>From</th><th>How</th><th>Status</th><th class="n">Amount</th></tr></thead><tbody>${mpS.list.map(e => `<tr><td>${dt2(e.at)}</td><td><b>${esc(e.code)}</b></td><td>${esc(e.name || e.phone || "-")}</td><td>${mpVia[e.via]}</td><td>${e.used ? `<span class="tag ok">Bill ${esc(e.used.bill)}</span>` : '<span class="tag warn">Not on a bill</span>'}</td><td class="n">${m2(e.amt)}</td></tr>`).join("")}</tbody></table>`
      : '<div class="empty">No M-Pesa payments yet.</div>'
  }</div>
  </div>`;
}
async function mpAct(a, b) {
  if (a === "mp_reload") {
    mpS.loaded = false;
    return all();
  }
  if (a === "mp_tab") {
    mpS.tab = b.dataset.k;
    return all();
  }
  const v = id => $("#" + id).value.trim();
  let r;
  b.disabled = true;
  if (a === "mp_etest") r = await mpAdmin("test", {}, "etims");
  if (a === "mp_eretry") r = await mpAdmin("retry", { bill: b.dataset.bill }, "etims");
  if (a === "mp_esave")
    r = await mpAdmin(
      "save",
      {
        mode: v("etMode"),
        url: v("etUrl"),
        key: v("etKey"),
        pin: v("etPin"),
        branch: v("etBranch")
      },
      "etims"
    );
  if (a === "mp_test") r = await mpAdmin("test", {});
  if (a === "mp_dsave")
    r = await mpAdmin("daraja", {
      env: v("mpEnv"),
      type: v("mpType"),
      shortcode: v("mpShort"),
      till: v("mpTill"),
      key: v("mpKey"),
      secret: v("mpSecret"),
      passkey: v("mpPass"),
      publicUrl: v("mpUrl")
    });
  if (a === "mp_msave")
    r = await mpAdmin("modem", { port: v("mpPort"), baud: v("mpBaud"), on: $("#mpOn").checked });
  b.disabled = false;
  if (!r.ok) return toast(r.j.error || "That didn't work.");
  if (a === "mp_test") return toast("Safaricom accepted these keys.");
  if (a === "mp_etest")
    return toast(r.j.standIn ? "The test stand-in is answering." : "The eTIMS service answered.");
  if (a === "mp_eretry") {
    toast(r.j.status === "signed" ? "Signed." : r.j.err || "Still waiting.");
    mpS.loaded = false;
    return all();
  }
  prEt.loaded = false;
  auditAdd(
    a === "mp_esave" ? "eTIMS" : "M-Pesa",
    a === "mp_esave"
      ? "eTIMS settings changed"
      : a === "mp_dsave"
        ? "Daraja settings changed"
        : "Modem settings changed"
  );
  toast("Saved.");
  if (a === "mp_msave") await new Promise(ok => setTimeout(ok, 1500));
  mpS.loaded = false;
  all();
}
V.mpesa = mpesaHTML;

// ---- Settings → Help and logs: every error the system has met, and a message to the developer ----
const supS = { loaded: false, server: [] };
const supLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(KF_ERRLOG) || "[]");
  } catch (e) {
    return [];
  }
};
async function supLoad() {
  supS.loaded = true;
  const r = await fetch("/lan/errlog")
    .then(x => (x.ok ? x.json() : {}))
    .catch(() => ({}));
  supS.server = Array.isArray(r.lines) ? r.lines : [];
  if (view === "settings" && setTab === "support") all();
}
/** Screens and the program together, newest first. */
function supRows() {
  const prog = supS.server.map(l => {
    const m = /^(\S+) \[([^\]]*)\] (.*)$/.exec(l) || [];
    const msg = m[3] || l,
      e = kfErrOf(msg);
    return { at: m[1] || "", where: m[2] || "Program", msg, code: e ? e[0] : 0 };
  });
  return [...supLocal(), ...prog].sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
const supText = L =>
  L.map(x => `${x.at}  [${x.where}]  ${x.code ? `Error ${x.code}  ` : ""}${x.msg}`).join("\r\n") ||
  "No errors recorded.";
let supQ = "";
/** Every error number, what it means and what to do. Typing in the search hides rows in place. */
function supCodesHTML() {
  const groups = [...new Set(KF_ERRORS.map(e => e[1]))];
  return `<div class="pn su-codes"><div class="inv-head"><h4>Error codes (${KF_ERRORS.length})</h4><span class="inv-btns"><button class="mini" data-a="su_codes_dl">Download the list</button></span></div>
  <div class="stk">When a message ends with a number, such as <b>Error 4001</b>, find it here. A rights error also shows the person's role number, such as <b>Role 1201</b>.</div>
  <input class="su-q" data-suq type="search" value="${esc(supQ)}" placeholder="Search by number or words, e.g. 4001 or printer" aria-label="Search error codes">
  <div class="tw"><table class="t su-ct"><thead><tr><th>Code</th><th>Area</th><th>What it means</th><th>What to do</th></tr></thead>${groups
    .map(
      g =>
        `<tbody data-sug="${esc(g)}"><tr class="su-g"><td colspan="4">${esc(g)}</td></tr>${KF_ERRORS.filter(
          e => e[1] === g
        )
          .map(
            e =>
              `<tr id="err${e[0]}" data-suc="${esc(`${e[0]} ${e[1]} ${e[2]} ${e[3]}`.toLowerCase())}" ${supHit(e) ? "" : "hidden"}><td class="su-code"><b>${e[0]}</b></td><td>${esc(e[1])}</td><td>${esc(e[2])}</td><td class="su-fix">${esc(e[3])}</td></tr>`
          )
          .join("")}</tbody>`
    )
    .join("")}</table></div><div class="stk" id="suQN"></div></div>`;
}
const supHit = e =>
  !supQ.trim() ||
  `${e[0]} ${e[1]} ${e[2]} ${e[3]}`.toLowerCase().includes(supQ.trim().toLowerCase());
function supFilter(v) {
  supQ = v;
  const w = v.trim().toLowerCase();
  let n = 0;
  document.querySelectorAll("#vSub [data-suc]").forEach(r => {
    r.hidden = !!w && !r.dataset.suc.includes(w);
    if (!r.hidden) n++;
  });
  document.querySelectorAll("#vSub [data-sug]").forEach(b => {
    b.hidden = !b.querySelector("[data-suc]:not([hidden])");
  });
  $("#suQN").textContent = w
    ? n
      ? plural(n, "code") + " found"
      : "No code matches. Try a number or one word."
    : "";
}
/** Each role's number, as shown with rights errors. */
function supRolesHTML() {
  const bo = [...boRoles(), SUPER].map(r => [kfRoleNo(r), r, "Back Office"]),
    pos = Object.entries(KF_POS_ROLE_NUMS).map(([r, n]) => [n, r, "POS"]),
    L = [...bo, ...pos].sort((a, b) => a[0] - b[0]);
  return `<div class="pn su-roles"><h4>Role numbers (${L.length})</h4><div class="stk">Every role has its own number. It stays the same if the role is renamed in a later version, and a deleted role's number is never given to another.</div>
  <div class="su-rl">${L.map(([n, r, w]) => `<div><b>${n}</b><span>${esc(r)}</span><small>${w}</small></div>`).join("")}</div></div>`;
}
function supportHTML() {
  if (!supS.loaded) supLoad();
  const L = supRows(),
    dev = FD_SETTINGS.devMail || "";
  return `<div class="pn tw"><div class="inv-head"><h4>Error log (${L.length})</h4><span class="inv-btns"><button class="mini" data-a="su_dl" ${L.length ? "" : "disabled"}>Download log file</button><button class="mini cat-del" data-a="su_clear" ${L.length ? "" : "disabled"}>Clear</button></span></div>
  <div class="stk">Every error on this computer's screens and in the program. Nothing is sent anywhere unless you send it below.</div>${
    L.length
      ? `<table class="t"><thead><tr><th>Time</th><th>Where</th><th>Code</th><th>What happened</th></tr></thead><tbody>${L.slice(
          0,
          200
        )
          .map(
            x =>
              `<tr><td style="white-space:nowrap">${x.at ? dt2(x.at) : "-"}</td><td>${esc(x.where)}</td><td class="su-code">${x.code ? `<button class="su-cl" data-a="su_code" data-v="${x.code}" title="What this means">${x.code}</button>` : "-"}</td><td class="su-m">${esc(x.msg)}</td></tr>`
          )
          .join("")}</tbody></table>`
      : '<div class="empty">No errors recorded.</div>'
  }</div>
  ${supCodesHTML()}${supRolesHTML()}
  <div class="pn"><h4>Message the developer</h4><div class="stk">Sent by email from the account set under Email reports.</div>
  <div class="mp-g"><label>Developer's email<input id="suTo" type="email" value="${esc(dev)}" autocomplete="off" placeholder="developer@example.com"></label><label>Subject<input id="suS" maxlength="120" autocomplete="off"></label></div>
  <div class="su-b"><label>Message<textarea id="suM" rows="5" maxlength="4000"></textarea></label></div>
  <label class="mp-on"><input id="suLog" type="checkbox" ${L.length ? "checked" : ""}><span><b>Include the error log</b><small>Helps the developer see what went wrong.</small></span></label>
  <div class="mp-b"><button class="chip on" data-a="su_send">Send message</button></div></div>`;
}
async function supAct(a, b) {
  if (a === "su_code") {
    supQ = String(b.dataset.v);
    all();
    const r = document.getElementById("err" + b.dataset.v);
    if (r) r.scrollIntoView({ block: "center" });
    return;
  }
  if (a === "su_codes_dl") {
    const rows = [
        ["Code", "Area", "What it means", "What to do"],
        ...KF_ERRORS.map(e => [e[0], e[1], e[2], e[3]])
      ],
      url = URL.createObjectURL(
        new Blob(
          [rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n")],
          {
            type: "text/csv"
          }
        )
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "kaytia-error-codes.csv";
    link.click();
    return setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  if (a === "su_dl") {
    const url = URL.createObjectURL(new Blob([supText(supRows())], { type: "text/plain" })),
      link = document.createElement("a");
    link.href = url;
    link.download = `kaytia-error-log-${ymdOf(new Date())}.txt`;
    link.click();
    return setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  if (a === "su_clear") {
    return tapConfirm(
      b,
      async () => {
        localStorage.removeItem(KF_ERRLOG);
        await fetch("/lan/errlog/clear", { method: "POST" }).catch(() => {});
        auditAdd("Error log", "The error log was cleared");
        supS.loaded = false;
        all();
      },
      "Tap again to clear"
    );
  }
  const to = $("#suTo").value.trim(),
    subject = $("#suS").value.trim(),
    msg = $("#suM").value.trim();
  if (!docMailOk(to)) return toast("Enter the developer's email address.");
  if (!subject) return toast("Enter a subject.");
  if (!msg) return toast("Write your message.");
  FD_SETTINGS.devMail = to;
  bosave();
  const log = $("#suLog").checked ? supText(supRows().slice(0, 300)) : "",
    from = `${FD_SETTINGS.name}, sent by ${boUser.n}`;
  b.disabled = true;
  toast("Sending...");
  const bad = await mailServerPost({
    to,
    subject: `Kaytia Flow: ${subject}`,
    text: `${from}\n\n${msg}`.slice(0, 5000),
    html: `<p style="font:13px Arial,sans-serif;color:#75695a">${esc(from)}</p><div style="font:15px Arial,sans-serif;white-space:pre-wrap">${esc(msg)}</div>${log ? `<h3 style="font:bold 14px Arial,sans-serif;margin-top:22px">Error log</h3><pre style="font:12px Consolas,monospace;white-space:pre-wrap">${esc(log)}</pre>` : ""}`
  });
  b.disabled = false;
  if (bad) return toast(bad.msg);
  auditAdd("Developer message", `Message sent to the developer: ${subject}`);
  $("#suS").value = "";
  $("#suM").value = "";
  toast("Message sent.");
}
$("#vSub").addEventListener("input", e => {
  if (e.target.matches("[data-suq]")) supFilter(e.target.value);
});

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
    return { at: m[1] || "", where: m[2] || "Program", msg: m[3] || l };
  });
  return [...supLocal(), ...prog].sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
const supText = L =>
  L.map(x => `${x.at}  [${x.where}]  ${x.msg}`).join("\r\n") || "No errors recorded.";
function supportHTML() {
  if (!supS.loaded) supLoad();
  const L = supRows(),
    dev = FD_SETTINGS.devMail || "";
  return `<div class="pn tw"><div class="inv-head"><h4>Error log (${L.length})</h4><span class="inv-btns"><button class="mini" data-a="su_dl" ${L.length ? "" : "disabled"}>Download log file</button><button class="mini cat-del" data-a="su_clear" ${L.length ? "" : "disabled"}>Clear</button></span></div>
  <div class="stk">Every error on this computer's screens and in the program. Nothing is sent anywhere unless you send it below.</div>${
    L.length
      ? `<table class="t"><thead><tr><th>Time</th><th>Where</th><th>What happened</th></tr></thead><tbody>${L.slice(
          0,
          200
        )
          .map(
            x =>
              `<tr><td style="white-space:nowrap">${x.at ? dt2(x.at) : "-"}</td><td>${esc(x.where)}</td><td class="su-m">${esc(x.msg)}</td></tr>`
          )
          .join("")}</tbody></table>`
      : '<div class="empty">No errors recorded.</div>'
  }</div>
  <div class="pn"><h4>Message the developer</h4><div class="stk">Sent by email from the account set under Email reports.</div>
  <div class="mp-g"><label>Developer's email<input id="suTo" type="email" value="${esc(dev)}" autocomplete="off" placeholder="developer@example.com"></label><label>Subject<input id="suS" maxlength="120" autocomplete="off"></label></div>
  <div class="su-b"><label>Message<textarea id="suM" rows="5" maxlength="4000"></textarea></label></div>
  <label class="mp-on"><input id="suLog" type="checkbox" ${L.length ? "checked" : ""}><span><b>Include the error log</b><small>Helps the developer see what went wrong.</small></span></label>
  <div class="mp-b"><button class="chip on" data-a="su_send">Send message</button></div></div>`;
}
async function supAct(a, b) {
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

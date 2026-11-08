// ---- Emailing reports: who gets them, which ones, and when ----
// Reports are worked out here from the same figures as the Reports page. The server only delivers them.
function repMailSet() {
  const S =
    FD_SETTINGS.repMail ||
    (FD_SETTINGS.repMail = { auto: false, people: [], reps: ["dr"], last: null });
  // Addresses saved before people had names.
  if (!S.people) {
    S.people = String(S.to || "")
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map(e => ({ n: "", e }));
    delete S.to;
  }
  return S;
}
const repMailWho = list =>
  list
    .map(e => {
      const p = repMailSet().people.find(x => x.e === e);
      return p && p.n ? p.n : e;
    })
    .join(", ");
const RM_CELL = "padding:6px 9px;border-bottom:1px solid #e2d9c8;font:13px Arial,sans-serif;";
function repMailTable(c, r, f) {
  const align = i => ((c[i] || "")[0] === "#" ? "text-align:right;" : "text-align:left;"),
    row = (y, extra) =>
      `<tr>${y.map((v, i) => `<td style="${RM_CELL}${align(i)}${extra}">${esc(v === null || v === undefined ? "" : v)}</td>`).join("")}</tr>`;
  return `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin:0 0 6px"><thead><tr>${c.map((h, i) => `<th style="${RM_CELL}${align(i)}background:#241b12;color:#f6efe0;">${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${r.map(y => row(y, "")).join("")}${f ? row(f, "font-weight:bold;background:#f3eee4;") : ""}</tbody></table>`;
}
/** The chosen reports for one business date, as the body of an email. */
function repMailBuild(date, keys) {
  // Report dates and filters belong to whoever is on the Reports page, so they go back afterwards.
  const keep = { rf, rt, rd, rtw, bill: { ...billF } },
    parts = [],
    failed = [];
  rf = rt = date;
  rd = "All";
  rtw = "All";
  Object.assign(billF, { status: "Combined", cashier: "All", pay: "All", col: {} });
  try {
    keys
      .filter(k => REP[k])
      .forEach(k => {
        const title = REP[k][0];
        try {
          const L = rs(),
            [c, r, f, note, head, x] = REP[k][1](L);
          parts.push(
            `<h2 style="margin:26px 0 2px;font:bold 18px Arial,sans-serif;color:#241b12">${esc(title)}</h2><p style="margin:0 0 10px;font:13px Arial,sans-serif;color:#75695a">${esc(head || `${L.length} bills · ${KES(G(L))}`)}</p>${
              r.length
                ? repMailTable(c, r, f)
                : `<p style="font:13px Arial,sans-serif;color:#75695a">${esc(note || "Nothing for this date.")}</p>`
            }${((x && x.below) || [])
              .map(
                b =>
                  `<h3 style="margin:14px 0 6px;font:bold 14px Arial,sans-serif">${esc(b.t)}</h3>${repMailTable(b.c, b.r, b.f)}`
              )
              .join("")}`
          );
        } catch (e) {
          failed.push(title);
        }
      });
  } finally {
    rf = keep.rf;
    rt = keep.rt;
    rd = keep.rd;
    rtw = keep.rtw;
    Object.assign(billF, keep.bill);
  }
  return {
    failed,
    html: `<div style="max-width:900px;margin:0 auto;color:#241b12"><h1 style="margin:0;font:bold 22px Arial,sans-serif">${esc(FD_SETTINGS.name)}</h1><p style="margin:2px 0 0;font:14px Arial,sans-serif;color:#75695a">Reports for ${esc(dateGB(date))}</p>${parts.join("")}${failed.length ? `<p style="margin-top:20px;font:13px Arial,sans-serif;color:#a4342a">Could not be prepared: ${esc(failed.join(", "))}</p>` : ""}<p style="margin-top:26px;font:12px Arial,sans-serif;color:#75695a">Sent by Kaytia Flow.</p></div>`
  };
}
let repMailBusy = false;
/** Send to everyone on the list. A retry skips those who already have this date's email. */
async function repMailSend(date, retry) {
  const S = repMailSet(),
    done = retry && S.last && S.last.day === date ? S.last.done || [] : [],
    to = S.people.map(p => p.e).filter(x => !done.includes(x));
  if (repMailBusy) return "Reports are already being sent.";
  if (!S.people.length || !S.reps.length) return "Add a person and tick at least one report.";
  if (!to.length) return "";
  repMailBusy = true;
  const { html } = repMailBuild(date, S.reps),
    subject = `${FD_SETTINGS.name}: reports for ${dateGB(date)}`,
    text = `Reports for ${dateGB(date)}. Open this email in a program that shows HTML to read them.`,
    sent = [...done];
  let bad = null;
  for (const x of to) {
    bad = await mailServerPost({ to: x, subject, text, html });
    if (bad) break;
    sent.push(x);
  }
  repMailBusy = false;
  S.last = {
    day: date,
    at: new Date().toISOString(),
    ok: !bad,
    msg: bad ? bad.msg : "",
    done: sent
  };
  auditAdd(
    "Email reports",
    bad
      ? `Reports for ${date} not sent: ${bad.msg}`
      : `Reports for ${date} emailed to ${sent.join(", ")}`,
    { who: "System", mod: "Back Office" }
  );
  bosave();
  if (setTab === "email" && $("#rmLast")) $("#rmLast").innerHTML = repMailLast();
  return bad ? bad.msg : "";
}
function repMailLast() {
  const L = repMailSet().last;
  if (!L) return "Nothing has been sent yet.";
  return L.ok
    ? `<span class="tag ok">Sent</span> Reports for ${esc(dateGB(L.day))} went to ${esc(repMailWho(L.done))} on ${dt2(L.at)}.`
    : `<span class="tag bad">Not sent</span> Reports for ${esc(dateGB(L.day))}: ${esc(L.msg)} ${repMailSet().auto ? "It tries again every 10 minutes while this computer is on." : ""}`;
}
function repMailPeople() {
  const L = repMailSet().people;
  return L.length
    ? L.map(
        (p, i) =>
          `<div class="rm-p"><span class="rm-av" aria-hidden="true">${esc((p.n || p.e)[0].toUpperCase())}</span><span class="rm-who"><b>${esc(p.n || p.e)}</b>${p.n ? `<small>${esc(p.e)}</small>` : ""}</span><button class="mini cat-del" data-a="rm_del" data-i="${i}" aria-label="Remove ${esc(p.n || p.e)}">Remove</button></div>`
      ).join("")
    : '<div class="empty">Nobody yet. Add the first person above.</div>';
}
// ---------------------------------------------------------------- the email account
const RM_PROV = {
  gmail: [
    "Gmail",
    "smtp.gmail.com",
    465,
    "Gmail needs an app password, not your normal one. Create it in your Google Account under Security, 2-Step Verification, App passwords."
  ],
  outlook: [
    "Outlook or Microsoft 365",
    "smtp.office365.com",
    587,
    "If the password is refused, SMTP may need turning on for this mailbox in Microsoft 365."
  ],
  yahoo: [
    "Yahoo",
    "smtp.mail.yahoo.com",
    465,
    "Yahoo needs an app password. Create it under Account Security."
  ],
  other: [
    "Another mail server",
    "",
    587,
    "Your email provider can tell you its SMTP server and port."
  ]
};
const rmAcc = {
  loaded: false,
  err: "",
  prov: "gmail",
  host: "",
  port: 587,
  user: "",
  hasPass: false,
  set: false
};
const rmProvOf = host =>
  Object.keys(RM_PROV).find(k => k !== "other" && RM_PROV[k][1] === host) || "other";
function rmFetch(sub, body) {
  const ctl = new AbortController(),
    t = setTimeout(() => ctl.abort(), 15000);
  return fetch(printServer() + "/api/mail/account" + sub, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: ctl.signal
  }).finally(() => clearTimeout(t));
}
function rmAccDraw() {
  const box = $("#rmAcct");
  if (box) box.innerHTML = repMailAcctHTML();
}
async function rmAccLoad() {
  rmAcc.loaded = false;
  rmAcc.err = "";
  rmAccDraw();
  try {
    const r = await rmFetch("");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) rmAcc.err = (j.error && j.error.message) || "The email account could not be read.";
    else
      Object.assign(rmAcc, {
        host: j.host,
        port: j.port,
        user: j.user,
        hasPass: j.hasPass,
        set: !!(j.host && j.from),
        prov: j.host ? rmProvOf(j.host) : rmAcc.prov
      });
  } catch (e) {
    rmAcc.err = "The server could not be reached.";
  }
  rmAcc.loaded = true;
  rmAccDraw();
}
function repMailAcctHTML() {
  if (!rmAcc.loaded) return '<div class="stk">Checking the email account...</div>';
  if (rmAcc.err)
    return `<div class="rm-h"><h4>Email account</h4></div><div class="stk">${esc(rmAcc.err)}</div><div class="rm-acts"><button class="mini" data-a="rm_acreload">Try again</button></div>`;
  const P = RM_PROV[rmAcc.prov],
    other = rmAcc.prov === "other";
  return `<div class="rm-h"><h4>Email account</h4><span class="tag ${rmAcc.set ? "ok" : "warn"}">${rmAcc.set ? "Set up" : "Not set up"}</span></div>
  <div class="stk">Reports are sent from this account. The password stays on this computer and is never shown again.</div>
  <div class="rm-grid"><label>Email service<select id="rmProv">${Object.entries(RM_PROV)
    .map(
      ([k, v]) => `<option value="${k}" ${k === rmAcc.prov ? "selected" : ""}>${esc(v[0])}</option>`
    )
    .join("")}</select></label>
  <label>Email address<input id="rmUser" type="email" autocomplete="off" value="${esc(rmAcc.user)}" placeholder="reports@hotel.co.ke"></label>
  <label>Password<input id="rmPass" type="password" autocomplete="new-password" placeholder="${rmAcc.hasPass ? "Saved. Leave blank to keep it" : ""}"></label>
  <label class="rm-oth" ${other ? "" : "hidden"}>Mail server<input id="rmHost" autocomplete="off" value="${esc(other ? rmAcc.host : "")}" placeholder="mail.hotel.co.ke"></label>
  <label class="rm-oth" ${other ? "" : "hidden"}>Port<input id="rmPort" type="number" min="1" max="65535" value="${esc(rmAcc.port)}"></label></div>
  <div class="itm-hint" id="rmHint">${esc(P[3])}</div>
  <div class="rm-acts"><button class="chip on" data-a="rm_acsave">Save account</button><button class="mini" data-a="rm_actest" ${rmAcc.set ? "" : "disabled"}>Send a test email</button></div>`;
}
async function rmAccSave(b) {
  const prov = $("#rmProv").value,
    P = RM_PROV[prov],
    user = $("#rmUser").value.trim(),
    pass = (prov === "gmail" ? $("#rmPass").value.replace(/\s/g, "") : $("#rmPass").value).trim(),
    host = prov === "other" ? $("#rmHost").value.trim() : P[1],
    port = prov === "other" ? parseInt($("#rmPort").value, 10) : P[2];
  if (!docMailOk(user)) return toast("Enter the email address reports are sent from.");
  if (!pass && !rmAcc.hasPass) return toast("Enter the password for this email account.");
  if (!/^[a-zA-Z0-9.-]+$/.test(host))
    return toast("Enter the mail server, such as mail.hotel.co.ke.");
  if (!(port >= 1 && port <= 65535)) return toast("Enter the mail server's port, such as 587.");
  const name = String(FD_SETTINGS.name || "Kaytia Flow").replace(/["<>\r\n]/g, "");
  b.disabled = true;
  let msg = "";
  try {
    const r = await rmFetch("", {
      host,
      port,
      user,
      from: `"${name}" <${user}>`,
      ...(pass ? { pass } : {})
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      msg = (j.error && j.error.message) || "The email account was not saved.";
    }
  } catch (e) {
    msg = "The server could not be reached, so nothing was saved.";
  }
  b.disabled = false;
  if (msg) return toast(msg);
  Object.assign(rmAcc, { prov, host, port, user, hasPass: true, set: true });
  auditAdd("Email reports", `Email account set to ${user}`);
  rmAccDraw();
  toast("Email account saved. Send a test email to check it.");
}
async function rmAccTest(b) {
  b.disabled = true;
  toast("Sending a test email...");
  const bad = await mailServerPost({
    to: rmAcc.user,
    subject: `${FD_SETTINGS.name}: test email`,
    text: "Kaytia Flow can send email from this account.",
    html: '<p style="font:15px Arial,sans-serif">Kaytia Flow can send email from this account.</p>'
  });
  b.disabled = false;
  toast(bad ? bad.msg : `Test email sent to ${rmAcc.user}. Check that inbox.`);
}
$("#vSub").addEventListener("change", e => {
  if (e.target.id !== "rmProv") return;
  const k = e.target.value,
    P = RM_PROV[k];
  rmAcc.prov = k;
  document.querySelectorAll(".rm-oth").forEach(x => (x.hidden = k !== "other"));
  $("#rmPort").value = P[2];
  $("#rmHint").textContent = P[3];
});
$("#vSub").addEventListener("keydown", e => {
  if (e.key !== "Enter" || !["rmN", "rmE"].includes(e.target.id)) return;
  e.preventDefault();
  repMailAdd();
});
function repMailAdd() {
  const S = repMailSet(),
    n = $("#rmN").value.trim().replace(/\s+/g, " "),
    em = $("#rmE").value.trim();
  if (!n) {
    $("#rmN").focus();
    return toast("Enter the person's name.");
  }
  if (!docMailOk(em)) {
    $("#rmE").focus();
    return toast(`${em || "That"} doesn't look like an email address.`);
  }
  if (S.people.some(p => p.e.toLowerCase() === em.toLowerCase()))
    return toast(`${em} is already on the list.`);
  S.people.push({ n, e: em });
  auditAdd("Email reports", `${n} (${em}) added to email reports`);
  bosave();
  $("#rmPeople").innerHTML = repMailPeople();
  $("#rmN").value = $("#rmE").value = "";
  $("#rmN").focus();
  toast(`${n} added.`);
}
function repMailHTML() {
  const S = repMailSet(),
    G0 = repGroups(Object.keys(REP));
  if (!rmAcc.loaded) setTimeout(rmAccLoad);
  return `<div class="pn rm" id="rmAcct">${repMailAcctHTML()}</div><div class="pn rm"><h4>Email reports</h4><div class="stk">Choose who receives reports and which ones. They arrive as one email covering the whole business day.</div>
  <div class="rm-add"><label>Name<input id="rmN" maxlength="60" autocomplete="off" placeholder="e.g. Amina Ali"></label><label>Email<input id="rmE" type="email" maxlength="120" autocomplete="off" placeholder="amina@hotel.co.ke"></label><button class="chip on" data-a="rm_add">Add</button></div>
  <div class="rm-people" id="rmPeople">${repMailPeople()}</div>
  <label class="rm-auto"><input id="rmAuto" type="checkbox" ${S.auto ? "checked" : ""}><span><b>Send automatically when the day is ended</b><small>Goes out from the computer that ends the day.</small></span></label>
  <div class="rm-h"><h4>Reports to send</h4><span><button class="mini" data-a="rm_all">Tick all</button> <button class="mini" data-a="rm_none">Clear</button></span></div>
  ${G0.map(([g, K]) => `<div class="rm-g"><h5>${esc(g)}</h5><div class="rm-list">${K.map(k => `<label><input type="checkbox" data-rmk="${k}" ${S.reps.includes(k) ? "checked" : ""}><span><b>${esc(REP[k][0].replace(/ Report$/, ""))}</b><small>${esc(REP_WHAT[k] || "")}</small></span></label>`).join("")}</div></div>`).join("")}
  <div class="rm-go"><span class="stk" id="rmLast">${repMailLast()}</span><label>Date<input id="rmDay" type="date" value="${esc(bizDate())}"></label><button class="mini" data-a="rm_send">Send now</button><button class="chip on" data-a="rm_save">Save</button></div></div>`;
}
/** Read the page into the settings. False after saying what's wrong. */
function repMailRead() {
  const S = repMailSet(),
    reps = [...document.querySelectorAll("[data-rmk]:checked")].map(x => x.dataset.rmk),
    auto = $("#rmAuto").checked;
  if (auto && !S.people.length) {
    toast("Add a person to send to.");
    return false;
  }
  if (auto && !reps.length) {
    toast("Tick at least one report.");
    return false;
  }
  Object.assign(S, { reps, auto });
  bosave();
  return true;
}
async function repMailAct(a, b) {
  if (a === "rm_add") return repMailAdd();
  if (a === "rm_del") {
    const S = repMailSet(),
      [p] = S.people.splice(+b.dataset.i, 1);
    auditAdd("Email reports", `${p.n || p.e} removed from email reports`);
    bosave();
    return ($("#rmPeople").innerHTML = repMailPeople());
  }
  if (a === "rm_acreload") return rmAccLoad();
  if (a === "rm_acsave") return rmAccSave(b);
  if (a === "rm_actest") return rmAccTest(b);
  if (a === "rm_all" || a === "rm_none")
    return document.querySelectorAll("[data-rmk]").forEach(x => (x.checked = a === "rm_all"));
  if (!repMailRead()) return;
  if (a === "rm_save") {
    auditAdd("Email reports", "Email report settings changed");
    return toast("Email reports saved.");
  }
  const date = $("#rmDay").value;
  if (!date) return toast("Choose the date to send.");
  b.disabled = true;
  toast("Sending...");
  const err = await repMailSend(date, false);
  b.disabled = false;
  toast(err || "Reports sent.");
}
document.addEventListener("kf:dayend", e => {
  if (repMailSet().auto) repMailSend(dayDate(e.detail), false);
});
// The internet at a hotel comes and goes, so a failed send keeps trying.
setInterval(
  () => {
    const S = repMailSet();
    if (S.auto && S.last && !S.last.ok) repMailSend(S.last.day, true);
  },
  10 * 60 * 1000
);

// ---- Back Office → License: this installation's status, its code, and entering a key ----
const licDate = d =>
  d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en-GB") : "";
V.license = () => {
  const st = LIC.status(),
    L = LIC.s.log.slice().reverse(),
    head =
      st.state === "trial"
        ? [
            "Free trial",
            `${st.left} day${st.left === 1 ? "" : "s"} left`,
            st.end ? `Ends ${licDate(st.end)}` : ""
          ]
        : st.left === null
          ? ["Licensed", "No end date", st.client ? `For ${esc(st.client)}` : ""]
          : [
              "Licensed",
              `${st.left} day${st.left === 1 ? "" : "s"} left`,
              `Ends ${licDate(st.end)}${st.client ? ` · For ${esc(st.client)}` : ""}`
            ];
  return `<div class="pn lic-st ${st.state}"><div><span>${head[0]}</span><b>${head[1]}</b><small>${head[2]}</small></div></div>
 <div class="pn"><h4>Installation code</h4><div class="stk">Send this code to Kaytia Tech Services when asking for a key. Each key only works for its own installation.</div><div class="lic-code"><input id="licPgCode" readonly value="${esc(LIC.s.code)}"><button class="mini" data-a="lic_copy">Copy</button></div></div>
 <div class="pn"><h4>Enter a license key</h4><textarea id="licPgKey" rows="4" spellcheck="false" placeholder="Paste the license key here" style="width:100%;box-sizing:border-box"></textarea><div class="fr" style="margin-top:10px"><button class="chip on" data-a="lic_apply">Activate</button></div></div>
 <div class="pn tw"><h4>Keys used here</h4><table class="t"><tr><th>Date</th><th>Type</th><th>Client</th><th>Ends</th></tr>${L.map(x => `<tr><td>${new Date(x.at).toLocaleDateString("en-GB")}</td><td>${{ full: "Full license", trial: "Trial extension", lock: "Lock" }[x.t] || esc(x.t)}</td><td>${esc(x.c || "")}</td><td>${x.t === "lock" ? "" : x.e ? licDate(x.e) : "No end date"}</td></tr>`).join("") || '<tr><td colspan="4"><div class="empty">No keys used yet.</div></td></tr>'}</table></div>`;
};
function licAct(a) {
  if (a === "lic_copy") {
    const c = $("#licPgCode");
    c.select();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(c.value);
      else document.execCommand("copy");
      toast("Installation code copied.");
    } catch (e) {
      toast("Select the code and copy it by hand.");
    }
    return;
  }
  const err = LIC.apply($("#licPgKey").value);
  if (err) return toast(err);
  bosave();
  toast("License updated.");
  all();
}
function licBar() {
  const t = LIC.label(),
    el = $("#licBar");
  el.style.display = t ? "" : "none";
  el.innerHTML = t
    ? `<div class="lic-bar"><span>${esc(t)}</span>${boPageOk("License") ? '<button class="mini" id="licBarGo">Manage license</button>' : ""}</div>`
    : "";
}
$("#licBar").onclick = e => {
  if (e.target.id === "licBarGo") go("License");
};

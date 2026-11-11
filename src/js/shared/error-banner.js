// ---- error banner: any unexpected error is shown on screen instead of failing silently ----
// (Without it, an error while the page loads leaves buttons that simply do nothing.)
const KF_ERRLOG = "kaytia_error_log";
/** Kept on this computer, for Settings → Help and logs. */
function kfLogError(msg, code) {
  try {
    const on = id =>
        (
          document.getElementById(id) || { classList: { contains: () => false } }
        ).classList.contains("show"),
      where = on("bo") ? "Back Office" : on("fd") ? "Front Desk" : "POS",
      L = JSON.parse(localStorage.getItem(KF_ERRLOG) || "[]");
    L.unshift({
      at: new Date().toISOString(),
      where,
      code: code || 0,
      msg: String(msg).slice(0, 2000)
    });
    localStorage.setItem(KF_ERRLOG, JSON.stringify(L.slice(0, 300)));
    if (/^https?:$/.test(location.protocol) && code >= 9000)
      fetch("/lan/errlog/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ where, code, msg: String(msg).slice(0, 2000) })
      }).catch(() => {});
  } catch (e) {}
}
(function () {
  function show(msg, code) {
    kfLogError(msg, code);
    let el = document.getElementById("errBanner");
    if (!el) {
      el = document.createElement("div");
      el.id = "errBanner";
      el.style.cssText =
        "position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#b91c1c;color:#fff;" +
        "font:13px/1.45 system-ui,sans-serif;padding:10px 14px;border-radius:10px;" +
        "box-shadow:0 8px 24px rgba(0,0,0,.3);white-space:pre-wrap;cursor:pointer";
      el.title = "Click to hide";
      el.onclick = () => el.remove();
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent =
      "Something went wrong (Error " +
      code +
      "). Please tell support this number, or send the log from Settings → Help and logs (click to hide):\n" +
      msg;
  }
  addEventListener("error", e =>
    show((e.message || "Error") + (e.lineno ? " (line " + e.lineno + ")" : ""), 9001)
  );
  addEventListener("unhandledrejection", e =>
    show(String((e.reason && (e.reason.stack || e.reason.message)) || e.reason), 9002)
  );
})();

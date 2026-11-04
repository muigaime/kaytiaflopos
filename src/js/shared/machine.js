// ---- This machine: every computer registers a name once, before anyone can use it ----
// A browser cannot read the computer's name, so someone types it here. The name stays on this computer.
const MACHINE = (() => {
  const KEY = "kaytia_machine";
  const list = () => FD_SETTINGS.machines || (FD_SETTINGS.machines = []);
  const name = () => localStorage.getItem(KEY) || "";
  const clean = s =>
    String(s || "")
      .trim()
      .replace(/\s+/g, " ");
  const problem = n =>
    !n
      ? "Enter a name for this machine."
      : /^[A-Za-z0-9 ._-]{2,30}$/.test(n)
        ? ""
        : "Use 2 to 30 letters, numbers, spaces, dots or dashes.";
  /** Adds a name to the list once, whatever its capitals. Returns the name as listed. */
  function add(n) {
    const had = list().find(m => m.n.toLowerCase() === n.toLowerCase());
    if (had) return had.n;
    list().push({ n, at: new Date().toISOString() });
    return n;
  }
  function use(n) {
    localStorage.setItem(KEY, n);
  }
  let box;
  function register(typed) {
    const n = clean(typed),
      err = problem(n);
    if (err) return ($("#macMsg").textContent = err);
    use(add(n));
    if (window.bosave) bosave();
    box.classList.remove("show");
  }
  function draw() {
    box = document.createElement("div");
    box.id = "macGate";
    box.className = "show";
    const known = list()
      .map(m => `<button class="mac-pick" data-m="${slipEsc(m.n)}">${slipEsc(m.n)}</button>`)
      .join("");
    box.innerHTML = `<div class="mac-card"><div class="mac-b">Kaytia <em>Flow</em></div><h2>Register this machine</h2><p>Give this computer a name, such as Waiter5 or Server. Printer Setup uses the name to decide where this computer's bills and orders print.</p>${known ? `<div class="mac-known"><small>Already on the list</small>${known}</div>` : ""}<label>Machine name<input id="macName" maxlength="30" autocomplete="off" spellcheck="false" placeholder="e.g. Waiter5"></label><div id="macMsg" role="alert"></div><button id="macGo">Register machine</button></div>`;
    document.body.appendChild(box);
    box.addEventListener("keydown", e => {
      e.stopPropagation();
      if (e.key === "Enter") register($("#macName").value);
    });
    box.addEventListener("click", e => {
      if (e.target.id === "macGo") register($("#macName").value);
      else if (e.target.dataset.m) register(e.target.dataset.m);
    });
    $("#macName").focus();
  }
  function gate() {
    if (name()) add(name());
    else draw();
  }
  /** The sale points this computer is attached to. None means it isn't limited. */
  function points() {
    const m = list().find(x => x.n === name());
    return m && m.sp ? m.sp.filter(posSells) : [];
  }
  return { name, list, clean, problem, add, use, gate, points };
})();
addEventListener("DOMContentLoaded", () => MACHINE.gate());

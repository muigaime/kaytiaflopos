// ---- license: 15-day trial, signed keys, and the lock screen ----
// Keys are signed by the License Console (tools/license-console.html) with a private key that never ships.
// The app only holds the public key below, so it can check a key but cannot make one.
// A key looks like KF1.<payload>.<signature>. Payload: { c: client, i: installation or "*", t: "full" | "trial" |
// "lock", e: last day "YYYY-MM-DD" or "" for no end, at: when issued }.
const LIC_N =
  "tHuKROVPEqc6fXqhV1zfh0wJ_bsYMKKhwt3oLhrjZrN48D8un7m8IrVfR0B_NVJ2E4iZbKTI8zktRPxo6bLyQ0InpME-7Ry5vpjed4wTQzyk8bsaj-HD6cJ3vAWbuqQ1HGiE5bDu1MCE8aLAKsLe6TkRpJaOM9gd0-IkHm2m9_NRPXekEAKrAwCjnAqaRbO9dMNP-6iGbmTpJHs5UtUJef9MlakRvJSilOmUnYPC4InsYEZfZ70p3_5NnF89dIatXmdoEpR0aGFp1lRvYx7uUy8k1Jzs92CpdAh64yH-lbw2NuRgkjnYdkOWKGvoOmCSk49n223TkfGxtLHF0NENXw";
const LIC = (() => {
  const LS = "kaytia_license",
    MAIN = "kaytia_pos_bo_v1",
    DAY = 864e5,
    TRIAL_DAYS = 15;
  // A small SHA-256: terminals on the LAN use plain http, where the browser's own crypto isn't available.
  function sha256(bytes) {
    const K = [],
      H = [];
    for (let p = 2, n = 0; n < 64; p++) {
      let prime = true;
      for (let d = 2; d * d <= p; d++) if (p % d === 0) prime = false;
      if (!prime) continue;
      if (n < 8) H.push(((Math.pow(p, 1 / 2) % 1) * 2 ** 32) >>> 0);
      K.push(((Math.pow(p, 1 / 3) % 1) * 2 ** 32) >>> 0);
      n++;
    }
    const L = bytes.length,
      m = new Uint8Array(((L + 9 + 63) >> 6) << 6);
    m.set(bytes);
    m[L] = 0x80;
    new DataView(m.buffer).setUint32(m.length - 4, L * 8);
    const w = new Uint32Array(64),
      r = (x, n) => (x >>> n) | (x << (32 - n)),
      dv = new DataView(m.buffer);
    for (let o = 0; o < m.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15],
          b = w[i - 2];
        w[i] =
          (w[i - 16] +
            (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) +
            w[i - 7] +
            (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) |
          0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0,
          t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g;
        g = f;
        f = e;
        e = (d + t1) | 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) | 0));
    }
    return H.map(v => (v >>> 0).toString(16).padStart(8, "0")).join("");
  }
  const utf8 = t => new TextEncoder().encode(t);
  const hash = t => sha256(utf8(t));
  const b64 = t =>
    atob(t.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (t.length % 4)) % 4));
  const toHex = bin => [...bin].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  /** RSA-SHA256 (PKCS#1 v1.5) check: signature^65537 mod n must equal the padded hash. */
  function signedOk(text, sig) {
    const n = BigInt("0x" + toHex(b64(LIC_N))),
      s = BigInt("0x" + toHex(b64(sig)));
    if (s >= n) return false;
    let m = 1n,
      base = s % n;
    for (let e = 65537n; e > 0n; e >>= 1n) {
      if (e & 1n) m = (m * base) % n;
      base = (base * base) % n;
    }
    const size = b64(LIC_N).length * 2,
      tail = "3031300d060960864801650304020105000420" + hash(text),
      want = "0001" + "f".repeat(size - 4 - 2 - tail.length) + "00" + tail;
    return m.toString(16).padStart(size, "0") === want;
  }
  const seen = {};
  /** A key's contents if the signature is good, otherwise null. */
  function read(raw) {
    if (raw in seen) return seen[raw];
    let out = null;
    try {
      const [v, p, g] = raw.split(".");
      if (v === "KF1" && p && g && signedOk(p, g))
        out = JSON.parse(new TextDecoder().decode(Uint8Array.from(b64(p), c => c.charCodeAt(0))));
    } catch (e) {}
    return (seen[raw] = out);
  }
  const SALT = "kf|2f7c91|";
  const sumOf = s =>
    hash(SALT + [s.code, s.start, s.last, s.locked ? 1 : 0, s.key || "", s.lastAt || 0].join("|"));
  function newCode() {
    const b = new Uint8Array(6);
    try {
      crypto.getRandomValues(b);
    } catch (e) {
      b.forEach((_, i) => (b[i] = Math.random() * 256));
    }
    const x = toHex(String.fromCharCode(...b)).toUpperCase();
    return `KF-${x.slice(0, 4)}-${x.slice(4, 8)}-${x.slice(8, 12)}`;
  }
  let s;
  function load() {
    let a = null;
    try {
      a = JSON.parse(localStorage.getItem(LS) || "null");
      if (!a) a = (JSON.parse(localStorage.getItem(MAIN) || "{}") || {}).LI || null; // kept with the main data too
    } catch (e) {}
    if (a && a.code && a.start) {
      s = a;
      s.bad = s.sum !== sumOf(s);
    } else {
      const now = Date.now();
      s = {
        code: newCode(),
        start: now,
        last: now,
        locked: false,
        key: "",
        lastAt: 0,
        log: [],
        bad: false
      };
      save();
    }
    // Only the key in use now is kept on record (older copies kept every key ever entered).
    s.log = (s.log || []).slice(-1);
    return s;
  }
  function save() {
    s.sum = sumOf(s);
    try {
      const { bad, ...keep } = s;
      localStorage.setItem(LS, JSON.stringify(keep));
    } catch (e) {}
  }
  function status() {
    const now = Date.now(),
      lock = (reason, title, text) => ({ state: "locked", reason, title, text });
    if (s.bad)
      return lock(
        "changed",
        "License details were changed",
        "The license details on this device don't match. Enter a license key to continue."
      );
    if (now < s.last - DAY)
      return lock(
        "clock",
        "Check this computer's date",
        "The date on this computer has been set back. Correct the date and time, then reopen Kaytia Flow."
      );
    if (s.locked)
      return lock(
        "provider",
        "This system is locked",
        "Your software provider has locked this system. Enter a new license key to continue."
      );
    const K = s.key && read(s.key);
    if (K && (K.i === "*" || K.i === s.code)) {
      if (!K.e) return { state: "active", plan: K.t, client: K.c, left: null, end: "" };
      const end = new Date(K.e + "T23:59:59").getTime();
      if (now <= end)
        return {
          state: K.t === "trial" ? "trial" : "active",
          plan: K.t,
          client: K.c,
          left: Math.ceil((end - now) / DAY),
          end: K.e
        };
      return lock(
        "expired",
        K.t === "trial" ? "Your trial has ended" : "Your license has expired",
        `It ended on ${new Date(end).toLocaleDateString("en-GB")}. Enter a new license key to continue.`
      );
    }
    const end = s.start + TRIAL_DAYS * DAY,
      left = Math.ceil((end - now) / DAY);
    if (left > 0)
      return {
        state: "trial",
        plan: "trial",
        client: "",
        left,
        end: new Date(end).toISOString().slice(0, 10)
      };
    return lock(
      "trial",
      `Your ${TRIAL_DAYS}-day trial has ended`,
      "Enter a license key to keep using Kaytia Flow."
    );
  }
  /** Returns "" when the key was accepted, otherwise why not. */
  function apply(text) {
    const raw = String(text || "").replace(/\s+/g, "");
    if (!raw) return "Paste the license key first.";
    const K = read(raw);
    if (!K) return "That key isn't valid. Check it was copied in full.";
    if (K.i !== "*" && K.i !== s.code) return "That key was made for a different installation.";
    if (K.at < (s.lastAt || 0)) return "That key is older than the one already used here.";
    if (K.t !== "lock" && K.e && Date.now() > new Date(K.e + "T23:59:59").getTime())
      return "That key has already expired.";
    if (K.t === "lock") s.locked = true;
    else {
      s.locked = false;
      s.key = raw;
    }
    s.bad = false;
    s.lastAt = K.at;
    s.log = [{ at: Date.now(), t: K.t, c: K.c, e: K.e, m: K.m }];
    save();
    gate();
    try {
      dispatchEvent(new CustomEvent("kf:license", { detail: raw }));
    } catch (e) {}
    return "";
  }
  let box;
  function draw(st) {
    if (!box) {
      box = document.createElement("div");
      box.id = "licLock";
      document.body.appendChild(box);
      box.addEventListener("keydown", e => e.stopPropagation());
      box.addEventListener("click", e => {
        if (e.target.id === "licGo") {
          const err = apply($("#licKey").value);
          if (err) $("#licMsg").textContent = err;
        } else if (e.target.id === "licCode") e.target.select();
      });
    }
    box.innerHTML = `<div class="lic-card"><div class="lic-m">K</div><div class="lic-b">Kaytia <em>Flow</em></div><h2>${st.title}</h2><p>${st.text}</p><p class="lic-safe">Your data is safe on this device, and comes back as soon as the system is unlocked.</p>
    <label>Installation code<input id="licCode" readonly value="${s.code}"></label><small>Send this code to Kaytia Tech Services to get your key.</small>
    <label>License key<textarea id="licKey" rows="4" placeholder="Paste your license key here" spellcheck="false"></textarea></label><div id="licMsg"></div><button id="licGo">Activate</button></div>`;
    box.classList.add("show");
  }
  /** Checks the license. Called when the app opens and when someone signs in, never in the middle of a sale. */
  function gate() {
    const st = status();
    if (!s.bad && Date.now() >= s.last) {
      s.last = Date.now();
      save();
    }
    if (st.state === "locked") draw(st);
    else if (box) box.classList.remove("show");
    const chip = document.getElementById("stLic");
    if (chip) chip.textContent = label(st);
    return st;
  }
  /** A short line for the start screen and dashboard; empty when there's nothing to say. */
  function label(st = status()) {
    if (st.state === "locked") return st.title;
    if (st.left === null) return "";
    const d = `${st.left} day${st.left === 1 ? "" : "s"} left`;
    return st.state === "trial" ? `Trial: ${d}` : st.left <= 14 ? `License: ${d}` : "";
  }
  load();
  return {
    get s() {
      return s;
    },
    load,
    save,
    status,
    apply,
    gate,
    label,
    read,
    sha256: hash,
    TRIAL_DAYS
  };
})();
LIC.gate();
addEventListener("DOMContentLoaded", () => LIC.gate());
document.addEventListener(
  "click",
  e => {
    if (e.target.closest && e.target.closest("[data-go]")) LIC.gate();
  },
  true
);

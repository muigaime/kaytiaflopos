// ---- The guests' menu: what a phone opens after scanning a product sticker's QR code ----
// Read-only. Built from the Main computer's saved data on every visit, so prices are always the current ones.
// It shows names, categories and prices only: no stock, costs, people or sales.

type Item = { id: number; n: string; d: string; c?: string; p: number; sell?: string };
type Saved = {
  I?: Item[];
  OL?: string[];
  FS?: { name?: string; catOff?: Record<string, string[]>; logos?: { company?: string } };
};

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );

/** 6200 -> "6,200", 150.5 -> "150.50" */
export function menuMoney(v: number) {
  const n = Number(v) || 0,
    [whole, cents] = Math.abs(n).toFixed(2).split("."),
    grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (n < 0 ? "-" : "") + grouped + (cents === "00" ? "" : "." + cents);
}

/** What a guest may see: sold items with a price, minus categories switched off at their selling point. */
export function menuItems(d: Saved | null) {
  const off = d?.FS?.catOff ?? {};
  return (d?.I ?? []).filter(
    i =>
      i &&
      i.sell !== "acc" &&
      i.d !== "Supermarket" &&
      Number(i.p) > 0 &&
      String(i.n ?? "").trim() &&
      !(off[i.d] ?? []).includes(i.c ?? "")
  );
}

/** The company logo saved in Settings, as an image file. */
export function menuLogo(d: Saved | null): { type: string; body: Buffer } | null {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(
    String(d?.FS?.logos?.company ?? "")
  );
  return m ? { type: m[1]!, body: Buffer.from(m[2]!, "base64") } : null;
}

export function menuPage(d: Saved | null, q: { p?: string; i?: string }) {
  const hotel = String(d?.FS?.name ?? "").trim() || "Our menu",
    L = menuItems(d),
    order = [...(d?.OL ?? []), ...L.map(i => i.d)],
    points = [...new Set(order)].filter(p => L.some(i => i.d === p)),
    picked = L.find(i => String(i.id) === String(q.i ?? "")),
    point = picked?.d ?? (points.includes(String(q.p)) ? String(q.p) : points[0]),
    here = L.filter(i => i.d === point),
    cats = [...new Set(here.map(i => i.c || "Specials"))],
    initials = hotel
      .split(/\s+/)
      .filter(w => !/^(the|of|and)$/i.test(w))
      .slice(0, 2)
      .map(w => w[0]!.toUpperCase())
      .join(""),
    logo = menuLogo(d)
      ? `<img class="logo" src="/menu/logo" alt="">`
      : `<div class="crest" aria-hidden="true">${esc(initials)}</div>`,
    tabs =
      points.length > 1
        ? `<nav class="tabs" aria-label="Selling points">${points
            .map(
              p =>
                `<a href="/menu?p=${encodeURIComponent(p)}"${p === point ? ' aria-current="page"' : ""}>${esc(p)}</a>`
            )
            .join("")}</nav>`
        : "",
    row = (i: Item) =>
      `<li${i === picked ? ' class="you" id="you"' : ""}><span class="n">${esc(i.n)}</span><span class="dots" aria-hidden="true"></span><span class="p">${menuMoney(i.p)}</span>${i === picked ? '<span class="tag">The item you scanned</span>' : ""}</li>`,
    body = here.length
      ? cats
          .map(
            c =>
              `<section><h2><span>${esc(c)}</span></h2><ul>${here
                .filter(i => (i.c || "Specials") === c)
                .sort((a, b) => a.n.localeCompare(b.n))
                .map(row)
                .join("")}</ul></section>`
          )
          .join("")
      : `<p class="empty">The menu is being prepared. Please ask our staff.</p>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(hotel)} · Menu</title><style>${CSS}</style></head>
<body><main>
<header>${logo}<p class="kicker">Welcome to</p><h1>${esc(hotel)}</h1><div class="orn" aria-hidden="true"><i></i>✦<i></i></div><p class="sub">${esc(point ?? "Menu")}</p></header>
${tabs}
<div class="card"><p class="cur">Prices in Kenya Shillings</p>${body}</div>
<footer><div class="orn" aria-hidden="true"><i></i>✦<i></i></div><p class="own">This is a product of ${esc(hotel)}. Enjoy!</p><p>Kindly do not pay more than the price shown.</p></footer>
</main></body></html>`;
}

const CSS = `
:root{--bg:#f7f3ea;--card:#fffdf8;--ink:#1d1a16;--soft:#6b6358;--gold:#9a7b3c;--line:#d9cfbb;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#12100d;--card:#1b1814;--ink:#f1ebdf;--soft:#a99f8f;--gold:#cfae6a;--line:#3a332a}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.5 Georgia,'Times New Roman',serif}
main{max-width:640px;margin:0 auto;padding:28px 16px 40px}
header{text-align:center;padding:8px 0 18px}
.logo{display:block;width:92px;height:92px;margin:0 auto 14px;border-radius:50%;object-fit:cover;border:1px solid var(--line);background:#fff}
.crest{display:grid;place-items:center;width:84px;height:84px;margin:0 auto 14px;border-radius:50%;border:3px double var(--gold);color:var(--gold);font-size:30px;letter-spacing:.04em}
.kicker{margin:0;color:var(--soft);font-size:12px;letter-spacing:.32em;text-transform:uppercase}
h1{margin:4px 0 0;font-weight:400;font-size:clamp(28px,8vw,40px);line-height:1.15;letter-spacing:.06em;text-transform:uppercase}
.orn{display:flex;align-items:center;justify-content:center;gap:12px;margin:14px auto;color:var(--gold);font-size:13px}
.orn i{display:block;width:64px;border-top:1px solid var(--gold)}
.sub{margin:0;font-style:italic;font-size:20px;color:var(--soft)}
.tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 14px;scrollbar-width:none;justify-content:safe center}
.tabs::-webkit-scrollbar{display:none}
.tabs a{flex:none;padding:8px 16px;border:1px solid var(--line);border-radius:999px;color:var(--ink);text-decoration:none;font-size:14px;letter-spacing:.06em;white-space:nowrap}
.tabs a[aria-current]{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.card{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:22px 20px 8px;box-shadow:0 1px 0 var(--line),0 18px 40px -28px rgba(0,0,0,.35);position:relative}
.card::before{content:"";position:absolute;inset:6px;border:1px solid var(--line);border-radius:3px;pointer-events:none}
.cur{margin:0 0 6px;text-align:center;color:var(--soft);font-size:12px;letter-spacing:.2em;text-transform:uppercase}
section{padding:10px 0 14px}
h2{display:flex;align-items:center;gap:12px;margin:8px 0 10px;color:var(--gold);font-weight:400;font-size:15px;letter-spacing:.28em;text-transform:uppercase}
h2::before,h2::after{content:"";flex:1;border-top:1px solid var(--line)}
h2 span{max-width:75%;text-align:center}
ul{list-style:none;margin:0;padding:0}
li{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;padding:7px 4px}
.n{max-width:72%;overflow-wrap:anywhere}
.dots{flex:1;min-width:16px;border-bottom:1px dotted var(--soft);transform:translateY(-5px);opacity:.6}
.p{font-variant-numeric:lining-nums tabular-nums;letter-spacing:.02em}
.you{margin:4px -8px;padding:10px 12px;border:1px solid var(--gold);border-radius:4px;background:color-mix(in srgb,var(--gold) 9%,transparent)}
.tag{flex-basis:100%;color:var(--gold);font-size:12px;font-style:italic;letter-spacing:.06em}
.empty{text-align:center;color:var(--soft);font-style:italic;padding:24px 0}
footer{text-align:center;color:var(--soft);font-size:14px;padding-top:6px}
footer p{margin:4px 0}.own{color:var(--ink);font-style:italic;font-size:17px}
`;

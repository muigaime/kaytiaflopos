// ---- Happy hour: a lower price on a category or a product, on set days and times ----
// A line keeps the price it was tapped at: "12~hh:250" stays at 250 on the bill, whenever it's paid.
const HH_MARK = "hh:",
  HH_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const happyRules = () => (typeof FD_SETTINGS !== "undefined" && FD_SETTINGS.happy) || [];
const happyClock = d =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
/** Is this rule's time on now? A night that runs past midnight still counts as the day it began. */
function happyOpen(r, now = new Date()) {
  const m = happyClock(now),
    day = now.getDay(),
    T = (r.days || {})[day],
    Y = (r.days || {})[(day + 6) % 7];
  if (T && T.f && T.t) {
    if (T.f < T.t && m >= T.f && m < T.t) return true;
    if (T.f > T.t && m >= T.f) return true;
  }
  return !!(Y && Y.f && Y.t && Y.f > Y.t && m < Y.t);
}
const happyHits = (r, it) =>
  (r.pt === "All" || r.pt === it.d) && (r.item ? r.item == it.id : r.cat === it.c);
/** The rule on a product right now. One set on the product itself beats one on its category. */
function happyRule(it, now = new Date()) {
  const R = happyRules().filter(r => r.on && happyHits(r, it) && happyOpen(r, now));
  return R.find(r => r.item) || R[0] || null;
}
function happyDeal(r, p) {
  const n = r.type === "price" ? r.v : r.type === "pct" ? p - (p * r.v) / 100 : p - r.v;
  return Math.max(0, Math.round(n * 100) / 100);
}
/** The happy hour price right now, or null when the normal price applies. */
function happyPrice(it, now = new Date()) {
  const r = it.sell !== "acc" && happyRule(it, now);
  if (!r) return null;
  const p = happyDeal(r, it.p);
  return p < it.p ? p : null;
}
/** A line's key at today's price, whatever price it was tapped at. */
function happyKey(id) {
  const [base, ...rest] = String(id).split("~"),
    picks = rest.filter(x => !x.startsWith(HH_MARK)),
    it = ITEMS.find(i => i.id == base),
    p = it ? happyPrice(it) : null;
  const key = [base, ...picks, ...(p === null ? [] : [HH_MARK + p])];
  return key.length > 1 ? key.join("~") : id;
}
// The menu changes by itself when a happy hour starts or ends.
let happySeen = "";
setInterval(() => {
  const now = happyRules()
    .filter(r => r.on && happyOpen(r))
    .map(r => r.id)
    .join();
  if (now === happySeen) return;
  happySeen = now;
  if (typeof user !== "undefined" && user && $("#login").style.display === "none") drawGrid();
}, 15000);

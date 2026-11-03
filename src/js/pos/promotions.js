// ---- Promotions: buy so many of a product, get something free, between two dates ----
// The free item is its own line, "12~pr:5", at no charge. It still uses stock and follows what was bought.
const PR_MARK = "pr:";
const isPromoLine = id => String(id).includes("~" + PR_MARK);
const promoRules = () => (typeof FD_SETTINGS !== "undefined" && FD_SETTINGS.promos) || [];
const promoLive = r => r.on && bizDate() >= r.from && bizDate() <= r.to;
const promoName = id => {
  const n = String(id).split("~" + PR_MARK)[1],
    r = promoRules().find(x => String(x.id) === n);
  return r ? r.name : "Promotion";
};
/** The promotion a product starts on the menu, if any. */
const promoOn = it => promoRules().find(r => promoLive(r) && r.buy === it.id);
/** Free lines the guest turned down on this order. */
let promoSkip = {},
  promoShort = [];
/** Puts the free items on the order to match what's been bought, counting what's already on the bill. */
function promoSync() {
  promoShort = [];
  const live = promoRules().filter(promoLive),
    keys = live.map(r => `${r.free}~${PR_MARK}${r.id}`);
  Object.keys(cart).forEach(k => {
    if (isPromoLine(k) && !keys.includes(k)) delete cart[k];
  });
  live.forEach((r, i) => {
    const key = keys[i],
      bought = L =>
        Object.entries(L).reduce(
          (a, [k, q]) => (k.split("~")[0] == r.buy && !isAccLine(k) && !isPromoLine(k) ? a + q : a),
          0
        ),
      inOrder = bought(cart),
      it = ITEMS.find(x => x.id === r.free);
    if (!inOrder || !it) return delete cart[key];
    const onBill = cur ? bought(cur.lines) : 0,
      given = cur ? cur.lines[key] || 0 : 0,
      want = Math.max(
        0,
        Math.floor((inOrder + onBill) / r.n) * r.m - given - (promoSkip[key] || 0)
      ),
      room = Math.max(0, avail(it) - (inCart(r.free) - (cart[key] || 0))),
      q = Math.min(want, room);
    if (q > 0) cart[key] = q;
    else delete cart[key];
    if (q < want) promoShort.push(`${r.name}: only ${q} free ${it.n} in stock, ${want} due.`);
  });
}

// ---- Front Desk: room tariffs by meal plan, and exchange rates that keep themselves up to date ----
let fdTarCur = "KES";
const fxList = () => FD_SETTINGS.currencies || (FD_SETTINGS.currencies = []);
const fxRate = c => (c === "KES" ? 1 : (fxList().find(x => x.c === c) || {}).rate || 0);
const fxOpts = on =>
  ["KES", ...fxList().map(x => x.c)]
    .map(c => `<option ${c === on ? "selected" : ""}>${hx(c)}</option>`)
    .join("");
/** Rates from the internet, through the server. "" when done; otherwise why not. */
async function fxRefresh() {
  let j = null;
  try {
    const r = await fetch("/lan/fx", { method: "POST" });
    if (r.ok) j = await r.json();
  } catch (e) {
    j = null;
  }
  if (!j || !j.rates) return "The exchange rates can't be reached. Check the internet.";
  if (!fxList().length) FD_SETTINGS.currencies = ["USD", "EUR", "GBP"].map(c => ({ c, rate: 0 }));
  fxList().forEach(x => {
    if (j.rates[x.c] > 0) x.rate = Math.round((1 / j.rates[x.c]) * 100) / 100;
  });
  FD_SETTINGS.fxAt = new Date().toISOString();
  sync();
  document.dispatchEvent(new Event("kf:fx"));
  return "";
}
function fxAutoCheck() {
  if (FD_SETTINGS.fxAuto === false) return;
  if (FD_SETTINGS.fxAt && Date.now() - new Date(FD_SETTINGS.fxAt).getTime() < 20 * 3600 * 1000)
    return;
  fxRefresh().then(err => {
    if (!err && $("#fd").classList.contains("show") && fdView === "tariff") fdDraw();
  });
}
setTimeout(fxAutoCheck, 15000);
setInterval(fxAutoCheck, 3600 * 1000);
function tariffView() {
  const rate = fxRate(fdTarCur) || 1,
    show = v => R2(v / rate),
    P = Object.keys(MEAL_PLANS),
    last = FD_SETTINGS.fxAt ? new Date(FD_SETTINGS.fxAt).toLocaleString("en-GB") : "";
  return `<div class="fd-card"><div class="fd-tarh"><h4>Room tariffs<small>Per night, for one adult</small></h4><label>Show in<select data-tarcur>${fxOpts(fdTarCur)}</select></label></div>
  ${tableHTML(
    ["Room type", "Room rate (KES)", ...P.map(k => `${MEAL_PLANS[k]} (${hx(fdTarCur)})`)],
    ROOMTYPES.map(t => [
      hx(t.name),
      `<input class="fd-tari" type="number" min="0" step="any" data-trate="${hx(t.name)}" value="${t.rate}" aria-label="Room rate for ${hx(t.name)}">`,
      ...P.map(k => show(t.rate + mealPlanPrice(k)))
    ])
  )}</div>
  ${tariffMealCard()}
  <div class="fd-card"><div class="fd-tarh"><h4>Exchange rates<small>${last ? "Updated " + hx(last) : "Not updated yet"}</small></h4><button class="chip on" data-f="fxget">Get today's rates</button></div>
  <label class="fd-fxa"><input type="checkbox" data-fxauto ${FD_SETTINGS.fxAuto === false ? "" : "checked"}> Update automatically every day</label>
  ${tableHTML(
    ["Currency", "KES for 1", ""],
    fxList().map((x, i) => [
      hx(x.c),
      `<input class="fd-tari" type="number" min="0" step="any" data-fxr="${i}" value="${x.rate}" aria-label="KES for 1 ${hx(x.c)}">`,
      `<button class="mini" data-f="fxdel" data-i="${i}">Remove</button>`
    ])
  )}
  <div class="fd-form"><label>Add a currency<input id="fx_c" maxlength="3" placeholder="e.g. TZS" style="text-transform:uppercase"></label><label>KES for 1<input id="fx_r" type="number" min="0" step="any" placeholder="Leave empty to fetch it"></label><button class="mini" data-f="fxadd">Add</button></div></div>`;
}
function tariffMealCard() {
  return mealCard();
}

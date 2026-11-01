// ---- Settings: the hotel details printed on guest bills and receipts ----
invF.hs = { name: FD_SETTINGS.name };
const SET_SAMPLE = {
  no: "NBO-001042",
  dept: "Main Restaurant",
  label: "T4",
  covers: "2",
  waiter: "Waiter name",
  guest: "",
  room: "",
  lines: [
    { q: 1, n: "Grilled Tilapia", p: 1450, t: "B" },
    { q: 2, n: "Dawa Cocktail", p: 850, t: "B" }
  ],
  t: { net: 2706.9, tax: 443.1, g: 3150 }
};
const setDraft = () => ({ ...invF.vh, name: invF.hs.name });
function settingsPreviewHTML() {
  const B = setDraft();
  return (
    guestBillHTML(SET_SAMPLE, B) +
    receiptHTML(
      {
        ...SET_SAMPLE,
        paid: slipRow("Cash", bill2(3200)),
        change: 50,
        fiscal: "CU details and the eTIMS QR print here"
      },
      B
    ) +
    orderSlipHTML("Kitchen", {
      ...SET_SAMPLE,
      lines: [{ q: 1, n: "Grilled Tilapia" }],
      note: "No chilli"
    }) +
    orderSlipHTML("Bar", { ...SET_SAMPLE, lines: [{ q: 2, n: "Dawa Cocktail" }] })
  );
}
/** Update the samples while typing (no redraw, so the cursor stays put). */
function settingsPreview() {
  const el = $("#setPrev");
  if (el) el.innerHTML = settingsPreviewHTML();
}
V.settings = () => {
  const H = invF.vh,
    f = (l, k, ph = "") =>
      `<label>${l}<input data-iv="vh.${k}" value="${esc(H[k] || "")}" placeholder="${ph}"></label>`;
  return `<div class="pn"><h4>Bills and receipts</h4><div class="stk">Printed at the top of every guest bill and receipt. Kitchen and bar orders carry no hotel details.</div>
  <div class="fr"><label>Hotel name<input data-iv="hs.name" value="${esc(invF.hs.name)}"></label>${f("Postal address", "addr", "e.g. P.O. Box 123-80100, Mombasa")}${f("Email", "email")}</div>
  <div class="fr">${f("Telephone", "phone")}${f("KRA PIN", "pin")}${f("Till number", "till", "e.g. 4565515-NOBLE TIDE")}</div>
  <div class="fr">${f("Website", "web")}${f("Thank-you line on receipts", "thanks", "Thank you for dining with us.")}<button class="chip on" style="flex:none;align-self:end" data-a="hs_save">Save details</button></div></div>
 <div class="set-prev" id="setPrev">${settingsPreviewHTML()}</div>`;
};
function settingsAct(a) {
  if (a !== "save") return;
  const name = invF.hs.name.trim();
  if (!name) return toast("Enter the hotel name.");
  FD_SETTINGS.name = name;
  FD_SETTINGS.biz = Object.fromEntries(
    Object.entries(invF.vh).map(([k, x]) => [k, String(x).trim()])
  );
  fdBrand();
  bosave();
  toast("Details saved. New bills and receipts will use them.");
  all();
}

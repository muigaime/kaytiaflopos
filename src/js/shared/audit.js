// ---- The audit trail: things that happen and leave no other record, such as sign-ins and price changes ----
// Sales, voids, stock and shifts already keep their own history; the Audit log reads those as well.
const AUDIT_MAX = 5000;
let AUDIT_WHO = "";
const auditMachine = () => {
  try {
    return localStorage.getItem("kaytia_machine") || "";
  } catch (e) {
    return "";
  }
};
function auditAdd(nature, text, o = {}) {
  if (typeof FD_SETTINGS === "undefined") return;
  const L = FD_SETTINGS.auditTrail || (FD_SETTINGS.auditTrail = []),
    inBo = document.querySelector("#bo.show");
  L.push({
    at: Date.now(),
    nature,
    text,
    who:
      o.who || (inBo ? AUDIT_WHO : typeof user !== "undefined" && user ? user.n : "") || "System",
    mod: o.mod || (inBo ? "Back Office" : "POS"),
    pc: auditMachine(),
    ref: o.ref || "",
    pri: o.pri || ""
  });
  if (L.length > AUDIT_MAX) L.splice(0, L.length - AUDIT_MAX);
  try {
    bosave();
  } catch (e) {}
}

// ---- Users & roles: back office users, and what each role may do. POS staff are in Waiter setup. ----
let urT = "users",
  urRole = BO_ROLES[0];
const urF = {};
const urCols = [
  ["id", "ID"],
  ["num", "Access Num"],
  ["d", "Description"],
  ["m", "Module Name"],
  ["g", "Function Group"],
  ["yes", "Grant Permission"]
];
const urYes = r => (roleHas(urRole, r.k) ? "YES" : "NO");
const urCell = (r, c) => (c === "yes" ? urYes(r) : String(r[c]));
const urShown = r =>
  (fdOn() || r.m !== "FRONTOFFICE") &&
  urCols.every(([c]) => {
    const w = (urF[c] || "").trim().toLowerCase();
    return !w || urCell(r, c).toLowerCase().includes(w);
  });
const roleCount = role => ADM.filter(a => (a.role || SUPER) === role).length;
const roleGranted = role => BO_RIGHTS.filter(r => roleHas(role, r.k)).length;
function urUsersHTML() {
  return `<div class="pn"><h4>Create a back office user</h4><div class="ur-new"><label>Full name<input id="mn" autocomplete="off" placeholder="First Last"></label><label>Username<input id="mu" autocomplete="off" placeholder="At least 3 letters or digits"></label><label>Password<input id="mp" type="password" autocomplete="new-password" placeholder="At least 6 characters"></label><label>Role<select id="mr"><option value="">Choose a role</option>${boRoles()
    .map(r => `<option>${r}</option>`)
    .join(
      ""
    )}<option>${SUPER}</option></select></label><button class="chip on" data-a="ur_add">Create user</button></div></div>
 <div class="pn tw"><h4>Back office users (${ADM.length})</h4><table class="t ur-t"><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>New password</th><th></th></tr>${ADM.map(
   (a, i) => {
     const me = boUser && a.u === boUser.u;
     return `<tr class="${a.off ? "off" : ""}"><td><span class="ws-a">${esc(a.n[0])}</span> <b>${esc(a.n)}</b>${me ? ' <small class="ur-me">You</small>' : ""}</td><td>${esc(a.u)}</td><td><select data-ura="${i}" ${me ? "disabled" : ""}>${[...boRoles(), SUPER].map(r => `<option ${(a.role || SUPER) === r ? "selected" : ""}>${r}</option>`).join("")}</select></td><td><button class="mini ur-st ${a.off ? "no" : "yes"}" data-a="ur_off" data-i="${i}" ${me ? "disabled" : ""}>${a.off ? "Disabled" : "Active"}</button></td><td><span class="ur-pw"><input type="password" id="np_${i}" autocomplete="new-password" placeholder="New password"><button class="mini" data-a="ur_pw" data-i="${i}">Change</button></span></td><td>${me ? "" : `<button class="mini" data-a="ur_del" data-i="${i}">Delete</button>`}</td></tr>`;
   }
 ).join("")}</table></div>`;
}
function urRightsHTML() {
  const sup = urRole === SUPER,
    S = BO_RIGHTS.filter(urShown).length;
  return `<div class="pn"><div class="ur-top"><label>User group<select data-urg>${[...boRoles(), SUPER].map(r => `<option ${r === urRole ? "selected" : ""}>${r}</option>`).join("")}</select></label><div class="ur-sum"><b id="urCount">${roleGranted(urRole)}</b> of ${BO_RIGHTS.length} rights granted · ${plural(roleCount(urRole), "user")}</div>${sup ? '<span class="ur-note">Super Admin always has every right.</span>' : `<span class="ur-acts"><button class="mini" data-a="ur_bulk" data-v="1">Grant all shown</button><button class="mini" data-a="ur_bulk" data-v="0">Revoke all shown</button><button class="mini" data-a="ur_reset">${roleCustom().includes(urRole) ? "Clear all rights" : "Reset to standard"}</button>${roleCustom().includes(urRole) ? '<button class="mini" data-a="ur_rdel">Delete this role</button>' : ""}</span>`}</div>
 <div class="ur-newrole"><label>Add a new role<input id="urNew" maxlength="30" autocomplete="off" placeholder="e.g. Night Auditor"></label><button class="chip on" data-a="ur_radd">Add role</button><span class="stk">A new role starts with no rights. Grant them below.</span></div>
 <div class="ur-wrap"><table class="ur-m"><thead><tr>${urCols.map(([c, l]) => `<th class="${c === "yes" ? "c" : ""}">${l}</th>`).join("")}</tr><tr class="ur-f">${urCols.map(([c, l]) => `<td><input data-urf="${c}" value="${esc(urF[c] || "")}" placeholder="Filter" aria-label="Filter ${l}"></td>`).join("")}</tr></thead><tbody>${BO_RIGHTS.map(
   r => {
     const y = roleHas(urRole, r.k);
     return `<tr data-rk="${r.k}" ${urShown(r) ? "" : "hidden"}><td>${r.id}</td><td>${r.num}</td><td class="d">${esc(r.d)}</td><td>${r.m}</td><td>${r.g}</td><td class="c"><button class="ur-g ${y ? "yes" : "no"}" data-a="ur_grant" data-k="${r.k}" ${sup ? "disabled" : ""} aria-pressed="${y}">${y ? "YES" : "NO"}</button></td></tr>`;
   }
 ).join(
   ""
 )}</tbody></table></div><div class="stk" id="urShownN">${plural(S, "right")} shown</div></div>`;
}
V.staff = () =>
  `<div class="ur-tabs">${[
    ["users", "Back office users"],
    ["rights", "Role rights"]
  ]
    .map(
      ([t, l]) =>
        `<button class="${urT === t ? "on" : ""}" data-a="ur_tab" data-t="${t}">${l}</button>`
    )
    .join("")}</div>${urT === "users" ? urUsersHTML() : urRightsHTML()}`;
function urSet(k, on) {
  ROLE_OVER[urRole] = ROLE_OVER[urRole] || {};
  ROLE_OVER[urRole][k] = on;
}
/** Filtering keeps the cursor in place, so rows are hidden rather than redrawn. */
function urFilter(c, v) {
  urF[c] = v;
  let n = 0;
  BO_RIGHTS.forEach(r => {
    const on = urShown(r);
    if (on) n++;
    document.querySelector(`#vSub [data-rk="${r.k}"]`).hidden = !on;
  });
  $("#urShownN").textContent = plural(n, "right") + " shown";
}
const supers = () => ADM.filter(a => !a.off && (a.role || SUPER) === SUPER);
function urRoleChange(i, role) {
  const a = ADM[i];
  if ((a.role || SUPER) === SUPER && role !== SUPER && !a.off && supers().length < 2) {
    toast("Keep at least one active Super Admin.");
    return all();
  }
  a.role = role;
  bosave();
  toast(`${a.n} is now ${role}.`);
  all();
}
async function urAct(a, b) {
  const d = b.dataset;
  if (a === "ur_tab") {
    urT = d.t;
    return all();
  }
  if (a === "ur_grant") {
    const on = !roleHas(urRole, d.k);
    urSet(d.k, on);
    b.className = "ur-g " + (on ? "yes" : "no");
    b.textContent = on ? "YES" : "NO";
    b.setAttribute("aria-pressed", on);
    $("#urCount").textContent = roleGranted(urRole);
    return bosave();
  }
  if (a === "ur_bulk") {
    BO_RIGHTS.filter(urShown).forEach(r => urSet(r.k, d.v === "1"));
    bosave();
    return all();
  }
  if (a === "ur_reset") {
    delete ROLE_OVER[urRole];
    bosave();
    toast(`${urRole} is back to the standard rights.`);
    return all();
  }
  if (a === "ur_radd") {
    const n = $("#urNew").value.trim().replace(/\s+/g, " ");
    if (!/^[A-Za-z0-9 &._-]{2,30}$/.test(n))
      return toast("Use 2 to 30 letters or numbers for the role name.");
    if ([...boRoles(), SUPER].some(r => r.toLowerCase() === n.toLowerCase()))
      return toast(`${n} is already a role.`);
    roleCustom().push(n);
    urRole = n;
    auditAdd("Users", `Role ${n} added`);
    bosave();
    toast(`${n} added. Now grant its rights.`);
    return all();
  }
  if (a === "ur_rdel") {
    if (!roleCustom().includes(urRole)) return;
    if (ADM.some(x => x.role === urRole))
      return toast(`Move the users on ${urRole} to another role first.`);
    roleCustom().splice(roleCustom().indexOf(urRole), 1);
    delete ROLE_OVER[urRole];
    auditAdd("Users", `Role ${urRole} deleted`);
    urRole = BO_ROLES[0];
    bosave();
    toast("Role deleted.");
    return all();
  }
  if (a === "ur_add") {
    const n = $("#mn").value.trim(),
      u = $("#mu").value.trim().toLowerCase(),
      p = $("#mp").value,
      role = $("#mr").value;
    if (!n) return toast("Enter the user's full name.");
    if (!/^[a-z0-9._-]{3,}$/.test(u))
      return toast("The username needs 3 or more letters or digits.");
    if (ADM.some(x => x.u === u)) return toast("That username is taken.");
    if (p.length < 6) return toast("The password needs at least 6 characters.");
    if (!role) return toast("Choose a role.");
    ADM.push({ u, n, role, ph: await H(u + "|" + p) });
    bosave();
    toast(`${n} can now sign in as ${role}.`);
    return all();
  }
  const x = ADM[+d.i];
  if (a === "ur_pw") {
    const p = $("#np_" + d.i).value;
    if (p.length < 6) return toast("The password needs at least 6 characters.");
    x.ph = await H(x.u + "|" + p);
    bosave();
    toast("Password changed.");
    return all();
  }
  if (a === "ur_off") {
    if (!x.off && (x.role || SUPER) === SUPER && supers().length < 2)
      return toast("Keep at least one active Super Admin.");
    x.off = !x.off;
    bosave();
    toast(`${x.n} is ${x.off ? "disabled and can't sign in" : "active again"}.`);
    return all();
  }
  if (a === "ur_del") {
    if (!x.off && (x.role || SUPER) === SUPER && supers().length < 2)
      return toast("Keep at least one active Super Admin.");
    return tapConfirm(
      b,
      () => {
        ADM.splice(+d.i, 1);
        bosave();
        toast(`${x.n} deleted.`);
        all();
      },
      "TAP AGAIN"
    );
  }
}

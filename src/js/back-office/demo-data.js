// ---- Back Office demo data: seed() fills sample sales ----
function seed() {
  const T = d0(),
    selling = ALLD.filter(d => ITEMS.some(x => x.d === d));
  if (!selling.length) return;
  for (let i = 0; i < 120; i++) {
    const d = selling[i % selling.length],
      pool = ITEMS.filter(x => x.d === d),
      lines = [];
    for (let j = 0; j < 1 + (i % 3); j++) {
      const it = pool[(i * 3 + j * 2) % pool.length];
      lines.push({ id: it.id, n: it.n, q: 1 + ((i + j) % 3), p: it.p, t: it.t });
    }
    const g = sum(lines, l => l.p * l.q),
      tax = sum(lines, l => (l.p * l.q * TAX[l.t]) / (100 + TAX[l.t]));
    let at = T - (i % 30) * D + (8 + ((i * 7) % 12)) * 36e5 + ((i * 13) % 60) * 6e4;
    if (at > Date.now()) at = Date.now() - i * 6e4;
    SALES.push({
      no: "DEMO-" + pad(i + 1, 4),
      at: new Date(at),
      dept: d,
      label: "Demo",
      user: USERS[i % 3].n,
      net: g - tax,
      tax,
      g,
      lines,
      mx: { [["cash", "mpesa", "credit"][(i % 5) % 3]]: g }
    });
  }
}
async function admAct(a, b) {
  const v = id => $("#" + id).value.trim();
  if (a === "addm") {
    const n = v("mn"),
      u = v("mu").toLowerCase(),
      p = $("#mp").value;
    if (!n || !/^[a-z0-9._-]{3,}$/.test(u) || p.length < 6)
      return toast("Use a name, a username (3+ letters or digits) and a 6+ character password.");
    if (ADM.some(x => x.u === u)) return toast("That username is taken.");
    ADM.push({ u, n, ph: await H(u + "|" + p) });
    toast("Account added.");
  } else if (a === "pwm") {
    const x = ADM[b.dataset.i],
      p = $("#np_" + b.dataset.i).value;
    if (p.length < 6) return toast("Password needs 6+ characters.");
    x.ph = await H(x.u + "|" + p);
    toast("Password changed.");
  } else {
    const x = ADM[+b.dataset.i];
    if (ADM.length < 2) return;
    if (boUser && x.u === boUser.u)
      return toast("You cannot remove the account you are signed in with.");
    ADM.splice(+b.dataset.i, 1);
    toast("Account removed.");
  }
  bosave();
  all();
}

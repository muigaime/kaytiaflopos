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

// ---- QR codes (byte mode, error correction level M, versions 1 to 10), drawn as SVG ----
const QR_BLOCKS = [
  null,
  [10, [[1, 16]]],
  [16, [[1, 28]]],
  [26, [[1, 44]]],
  [18, [[2, 32]]],
  [24, [[2, 43]]],
  [16, [[4, 27]]],
  [18, [[4, 31]]],
  [
    22,
    [
      [2, 38],
      [2, 39]
    ]
  ],
  [
    22,
    [
      [3, 36],
      [2, 37]
    ]
  ],
  [
    26,
    [
      [4, 43],
      [1, 44]
    ]
  ]
];
const QR_ALIGN = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];
const QR_REMAINDER = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];
const QR_MAX_BYTES = 213;
const qrGF = (() => {
  const exp = new Array(512),
    log = new Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
  return { exp, log, mul: (a, b) => (a && b ? exp[log[a] + log[b]] : 0) };
})();
function qrEcc(data, n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    g.forEach((c, j) => {
      next[j] ^= c;
      next[j + 1] ^= qrGF.mul(c, qrGF.exp[i]);
    });
    g = next;
  }
  const r = new Array(n).fill(0);
  data.forEach(b => {
    const f = b ^ r.shift();
    r.push(0);
    for (let i = 0; i < n; i++) r[i] ^= qrGF.mul(g[i + 1], f);
  });
  return r;
}
/** The dark and light modules for some text, as rows of true and false. */
function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1;
  const cap = x => QR_BLOCKS[x][1].reduce((a, [n, d]) => a + n * d, 0);
  while (v <= 10 && Math.ceil((4 + (v < 10 ? 8 : 16) + bytes.length * 8) / 8) > cap(v)) v++;
  if (v > 10) throw new Error("too long for a QR code");
  // ---- the data bits
  const bits = [],
    put = (val, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };
  put(4, 4);
  put(bytes.length, v < 10 ? 8 : 16);
  bytes.forEach(b => put(b, 8));
  const total = cap(v) * 8;
  put(0, Math.min(4, total - bits.length));
  while (bits.length % 8) bits.push(0);
  const words = [];
  for (let i = 0; i < bits.length; i += 8)
    words.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let p = 0; words.length < cap(v); p++) words.push(p % 2 ? 0x11 : 0xec);
  // ---- blocks with error correction, interleaved
  const [ecN, groups] = QR_BLOCKS[v],
    blocks = [];
  let at = 0;
  groups.forEach(([n, d]) => {
    for (let i = 0; i < n; i++) {
      const data = words.slice(at, at + d);
      at += d;
      blocks.push({ data, ecc: qrEcc(data, ecN) });
    }
  });
  const stream = [],
    longest = Math.max(...blocks.map(b => b.data.length));
  for (let i = 0; i < longest; i++)
    blocks.forEach(b => i < b.data.length && stream.push(b.data[i]));
  for (let i = 0; i < ecN; i++) blocks.forEach(b => stream.push(b.ecc[i]));
  // ---- the fixed patterns
  const size = 17 + v * 4,
    grid = Array.from({ length: size }, () => new Array(size).fill(false)),
    fixed = Array.from({ length: size }, () => new Array(size).fill(false)),
    set = (r, c, d) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      grid[r][c] = d;
      fixed[r][c] = true;
    };
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6,
          core = r >= 2 && r <= 4 && c >= 2 && c <= 4,
          inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        set(r0 + r, c0 + c, inside && (edge || core));
      }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const A = QR_ALIGN[v],
    last = A.length - 1;
  A.forEach((r, i) =>
    A.forEach((c, j) => {
      // Only the three corners with finder patterns are skipped.
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let y = -2; y <= 2; y++)
        for (let x = -2; x <= 2; x++) set(r + y, c + x, Math.max(Math.abs(y), Math.abs(x)) !== 1);
    })
  );
  // Space for the format and version information, filled in once the mask is chosen.
  for (let i = 0; i < 9; i++) {
    if (i === 6) continue; // the timing line runs through here
    set(8, i, false);
    set(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    set(8, size - 1 - i, false);
    set(size - 1 - i, 8, false);
  }
  set(size - 8, 8, true);
  if (v >= 7)
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        set(i, size - 11 + j, false);
        set(size - 11 + j, i, false);
      }
  // ---- the data, in a zigzag from the bottom right
  const bitsOut = [];
  stream.forEach(b => {
    for (let i = 7; i >= 0; i--) bitsOut.push((b >> i) & 1);
  });
  for (let i = 0; i < QR_REMAINDER[v]; i++) bitsOut.push(0);
  let n = 0,
    up = true;
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let k = 0; k < size; k++) {
      const r = up ? size - 1 - k : k;
      for (const x of [c, c - 1]) if (!fixed[r][x]) grid[r][x] = !!bitsOut[n++];
    }
    up = !up;
  }
  // ---- try each mask, and keep the one that scans best
  const MASK = [
    (r, c) => (r + c) % 2 === 0,
    r => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
  ];
  const bch = (val, poly, degree) => {
    let d = val << degree;
    const top = 31 - Math.clz32(poly);
    while (d && 31 - Math.clz32(d) >= top) d ^= poly << (31 - Math.clz32(d) - top);
    return (val << degree) | d;
  };
  const finish = m => {
    const out = grid.map((row, r) => row.map((d, c) => (fixed[r][c] ? d : d !== MASK[m](r, c))));
    const f = bch(m, 0x537, 10) ^ 0x5412, // level M is 00
      bit = i => !!((f >> i) & 1);
    for (let i = 0; i <= 5; i++) out[8][i] = bit(14 - i);
    out[8][7] = bit(8);
    out[8][8] = bit(7);
    out[7][8] = bit(6);
    for (let i = 9; i < 15; i++) out[14 - i][8] = bit(14 - i);
    for (let i = 0; i < 7; i++) out[size - 1 - i][8] = bit(14 - i);
    for (let i = 0; i < 8; i++) out[8][size - 8 + i] = bit(7 - i);
    out[size - 8][8] = true;
    if (v >= 7) {
      const vi = bch(v, 0x1f25, 12);
      for (let i = 0; i < 18; i++) {
        const b = !!((vi >> i) & 1),
          a = Math.floor(i / 3),
          o = (i % 3) + size - 11;
        out[a][o] = b;
        out[o][a] = b;
      }
    }
    return out;
  };
  const score = M => {
    let s = 0,
      dark = 0;
    const runs = L => {
      let run = 1;
      for (let i = 1; i <= L.length; i++) {
        if (L[i] === L[i - 1]) run++;
        else {
          if (run >= 5) s += run - 2;
          run = 1;
        }
      }
      const t = L.map(x => (x ? 1 : 0)).join("");
      s += ((t.match(/(?=10111010000|00001011101)/g) || []).length || 0) * 40;
    };
    M.forEach(runs);
    M[0].forEach((_, c) => runs(M.map(r => r[c])));
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        if (M[r][c]) dark++;
        if (r < size - 1 && c < size - 1) {
          const d = M[r][c];
          if (M[r][c + 1] === d && M[r + 1][c] === d && M[r + 1][c + 1] === d) s += 3;
        }
      }
    return s + Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  };
  let best = null,
    low = Infinity;
  for (let m = 0; m < 8; m++) {
    const M = finish(m),
      s = score(M);
    if (s < low) {
      low = s;
      best = M;
    }
  }
  return best;
}
/** The QR code as SVG, with the blank margin scanners need. */
function qrSvg(text) {
  const M = qrMatrix(text),
    q = 4,
    n = M.length + q * 2;
  let d = "";
  M.forEach((row, r) =>
    row.forEach((on, c) => {
      if (on) d += `M${c + q} ${r + q}h1v1h-1z`;
    })
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-label="QR code"><path d="${d}" fill="#000"/></svg>`;
}

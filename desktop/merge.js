// Three-way merge of the app's saved data, so that tills working at the same time keep each other's work.
// base is what the till last had, mine is the till's data now, and theirs is the Main computer's data now.
const MISSING = Symbol("missing");
const eq = (a, b) =>
  a === b || (a !== MISSING && b !== MISSING && JSON.stringify(a) === JSON.stringify(b));
const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v) && v !== MISSING;
// Keys where adding the two changes together makes no sense: the larger simply stands.
// Times are here too: adding two of them together would mean nothing.
const HIGHEST = new Set(["RN", "seq", "at", "t", "last", "lastAt", "start"]);
// A bill settled on one till mustn't come back because another till touched it a moment earlier.
const DELETE_WINS = new Set(["OR"]);

/** The field that names records in this list, if every record has one and no two share it. */
function idKey(lists) {
  const all = lists.flat();
  if (!all.length || !all.every(isObj)) return "";
  for (const key of ["id", "no", "code", "n", "k"]) {
    if (!all.every(x => x[key] !== undefined && x[key] !== null)) continue;
    if (lists.every(L => new Set(L.map(x => x[key])).size === L.length)) return key;
  }
  return "";
}
/** Records with no name are compared whole: what each side added or removed is applied. */
function mergeBag(base, mine, theirs) {
  const count = L => {
    const m = new Map();
    L.forEach(x => {
      const k = JSON.stringify(x);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  };
  const B = count(base),
    M = count(mine),
    remove = new Map(),
    out = [];
  for (const [k, n] of B) {
    const gone = n - (M.get(k) || 0);
    if (gone > 0) remove.set(k, gone);
  }
  theirs.forEach(x => {
    const k = JSON.stringify(x),
      r = remove.get(k) || 0;
    if (r > 0) remove.set(k, r - 1);
    else out.push(x);
  });
  const added = new Map();
  for (const [k, n] of M) {
    const more = n - (B.get(k) || 0);
    if (more > 0) added.set(k, more);
  }
  mine.forEach(x => {
    const k = JSON.stringify(x),
      a = added.get(k) || 0;
    if (a > 0) {
      out.push(x);
      added.set(k, a - 1);
    }
  });
  return out;
}
function mergeList(base, mine, theirs, name) {
  const key = idKey([base, mine, theirs]);
  if (!key) return mergeBag(base, mine, theirs);
  const by = L => new Map(L.map(x => [x[key], x])),
    B = by(base),
    M = by(mine),
    T = by(theirs),
    out = [],
    done = new Set(),
    put = id => {
      if (done.has(id)) return;
      done.add(id);
      const v = merge3(
        B.has(id) ? B.get(id) : MISSING,
        M.has(id) ? M.get(id) : MISSING,
        T.has(id) ? T.get(id) : MISSING,
        name
      );
      if (v !== MISSING) out.push(v);
    };
  theirs.forEach(x => put(x[key]));
  mine.forEach(x => put(x[key]));
  // The same name made on two tills at once may be two different records. Keep both.
  if (out.length) {
    const clash = [];
    mine.forEach(x => {
      const t = T.get(x[key]);
      if (t && !B.has(x[key]) && !eq(t, x)) clash.push(x);
    });
    if (clash.length) {
      const keep = out.filter(x => !clash.some(c => c[key] === x[key]));
      clash.forEach(c => keep.push(T.get(c[key]), c));
      return keep;
    }
  }
  return out;
}
function merge3(base, mine, theirs, name = "") {
  if (eq(base, mine)) return theirs;
  if (eq(base, theirs)) return mine;
  // Both sides changed it. Even if they now look the same, two tills that each sold one have sold two.
  if (mine === MISSING && theirs === MISSING) return MISSING;
  if (mine === MISSING || theirs === MISSING) {
    if (DELETE_WINS.has(name)) return MISSING;
    return mine === MISSING ? theirs : mine; // one changed it, one deleted it: keep the work
  }
  if (typeof mine === "number" && typeof theirs === "number") {
    if (HIGHEST.has(name) || typeof base !== "number") return Math.max(mine, theirs);
    // Two tills each sold some stock, so both reductions count.
    return Math.round((base + (mine - base) + (theirs - base)) * 1e6) / 1e6;
  }
  if (Array.isArray(mine) && Array.isArray(theirs))
    return mergeList(Array.isArray(base) ? base : [], mine, theirs, name);
  if (isObj(mine) && isObj(theirs)) {
    const b = isObj(base) ? base : {},
      out = {},
      keys = new Set([...Object.keys(theirs), ...Object.keys(mine)]);
    for (const k of keys) {
      const v = merge3(
        k in b ? b[k] : MISSING,
        k in mine ? mine[k] : MISSING,
        k in theirs ? theirs[k] : MISSING,
        k
      );
      if (v !== MISSING) out[k] = v;
    }
    return out;
  }
  return mine; // the same setting changed on both: the latest save stands
}
const merge = (base, mine, theirs) => merge3(base, mine, theirs);
module.exports = { merge };

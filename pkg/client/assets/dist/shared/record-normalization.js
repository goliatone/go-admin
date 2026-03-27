import { asRecord as f, asString as l, asNumber as u } from "./coercion.js";
function d(n, o = {}) {
  const { trimKeys: r = !1, omitBlankKeys: i = !1, omitEmptyValues: s = !1 } = o, e = {};
  for (const [t, a] of Object.entries(f(n))) {
    if (i && t.trim() === "")
      continue;
    const c = r ? t.trim() : t, m = l(a);
    s && m === "" || (e[c] = m);
  }
  return e;
}
function K(n, o = {}) {
  const { trimKeys: r = !1, omitBlankKeys: i = !1, fallback: s = 0 } = o, e = {};
  for (const [t, a] of Object.entries(f(n))) {
    if (i && t.trim() === "")
      continue;
    const c = r ? t.trim() : t;
    e[c] = u(a, s);
  }
  return e;
}
export {
  K as normalizeNumberRecord,
  d as normalizeStringRecord
};
//# sourceMappingURL=record-normalization.js.map

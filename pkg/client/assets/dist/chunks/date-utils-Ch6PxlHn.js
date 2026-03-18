const s = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(Z|[+-]\d{2}:\d{2})$/;
function c(t) {
  return !Number.isNaN(t.getTime());
}
function a(t) {
  const n = t.trim(), e = n.match(s);
  if (!e)
    return n;
  const [, i, r, o] = e;
  return r.length <= 3 ? n : `${i}.${r.slice(0, 3)}${o}`;
}
function d(t) {
  if (t instanceof Date)
    return c(t) ? new Date(t.getTime()) : null;
  if (typeof t == "number") {
    const o = new Date(t);
    return c(o) ? o : null;
  }
  if (typeof t != "string")
    return null;
  const n = t.trim();
  if (!n)
    return null;
  const e = new Date(n);
  if (c(e))
    return e;
  const i = a(n);
  if (i === n)
    return null;
  const r = new Date(i);
  return c(r) ? r : null;
}
export {
  d as p
};
//# sourceMappingURL=date-utils-Ch6PxlHn.js.map

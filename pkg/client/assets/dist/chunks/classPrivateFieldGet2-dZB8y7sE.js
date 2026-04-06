function i(e, t) {
  if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}
function r(e, t, n) {
  i(e, t), t.set(e, n);
}
function a(e, t, n) {
  if (typeof e == "function" ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
  throw new TypeError("Private element is not present on this object");
}
function s(e, t, n) {
  return e.set(a(e, t), n), n;
}
function o(e, t) {
  return e.get(a(e, t));
}
export {
  i as a,
  r as i,
  s as n,
  a as r,
  o as t
};

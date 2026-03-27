function i(r) {
  return typeof r == "string" ? r.trim() : "";
}
function e(r) {
  return r && typeof r == "object" && !Array.isArray(r) ? r : {};
}
function s(r) {
  return r === !0;
}
function u(r) {
  if (r === !0 || r === 1)
    return !0;
  const n = i(r).toLowerCase();
  return n === "true" || n === "1";
}
function f(r, n = 0) {
  return typeof r == "number" && Number.isFinite(r) ? r : n;
}
function c(r, n = 0) {
  if (typeof r == "number" && Number.isFinite(r))
    return r;
  if (typeof r == "string" && r.trim() !== "") {
    const t = Number(r);
    if (Number.isFinite(t))
      return t;
  }
  return n;
}
function m(r) {
  return i(r) || void 0;
}
function y(r) {
  return typeof r == "number" && Number.isFinite(r) ? r : void 0;
}
function o(r) {
  return Array.isArray(r) ? r.map((n) => i(n)).filter(Boolean) : [];
}
function b(r) {
  const n = [];
  for (const t of o(r))
    n.includes(t) || n.push(t);
  return n;
}
export {
  s as asBoolean,
  u as asLooseBoolean,
  f as asNumber,
  c as asNumberish,
  y as asOptionalNumber,
  m as asOptionalString,
  e as asRecord,
  i as asString,
  o as asStringArray,
  b as asUniqueStringArray
};
//# sourceMappingURL=coercion.js.map

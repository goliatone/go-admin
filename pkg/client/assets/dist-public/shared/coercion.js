function i(r) {
  return typeof r == "string" ? r.trim() : "";
}
function e(r, n = "") {
  return typeof r == "string" ? r.trim() : r == null ? n : String(r).trim();
}
function f(r) {
  return r && typeof r == "object" && !Array.isArray(r) ? r : {};
}
function s(r) {
  return r === !0;
}
function u(r) {
  if (r === !0 || r === 1) return !0;
  const n = i(r).toLowerCase();
  return n === "true" || n === "1";
}
function c(r, n = 0) {
  return typeof r == "number" && Number.isFinite(r) ? r : n;
}
function m(r, n = 0) {
  if (typeof r == "number" && Number.isFinite(r)) return r;
  if (typeof r == "string") {
    const t = Number.parseInt(r.trim(), 10);
    if (Number.isFinite(t)) return t;
  }
  return n;
}
function y(r, n = 0) {
  if (typeof r == "number" && Number.isFinite(r)) return r;
  if (typeof r == "string" && r.trim() !== "") {
    const t = Number(r);
    if (Number.isFinite(t)) return t;
  }
  return n;
}
function p(r) {
  return i(r) || void 0;
}
function b(r) {
  return typeof r == "number" && Number.isFinite(r) ? r : void 0;
}
function o(r) {
  return Array.isArray(r) ? r.map((n) => i(n)).filter(Boolean) : [];
}
function g(r) {
  return Array.isArray(r) ? r.map((n) => e(n)).filter(Boolean) : [];
}
function N(r) {
  const n = [];
  for (const t of o(r)) n.includes(t) || n.push(t);
  return n;
}
export {
  s as asBoolean,
  u as asLooseBoolean,
  c as asNumber,
  y as asNumberish,
  b as asOptionalNumber,
  p as asOptionalString,
  f as asRecord,
  i as asString,
  o as asStringArray,
  N as asUniqueStringArray,
  m as coerceInteger,
  e as coerceString,
  g as coerceStringArray
};

//# sourceMappingURL=coercion.js.map
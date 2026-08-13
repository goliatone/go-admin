function i(t) {
  return t ? t.startsWith("$") || /\[\d+\]/.test(t) || /\[['"]/.test(t) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(t) ? !0 : t.includes("..") || t.includes("*") : !1;
}
function u(t) {
  return t ? t.startsWith("$") ? t : `$.${t}` : "$";
}
function o(t, e) {
  if (!e || !t) return t || {};
  const n = e.toLowerCase();
  return Object.fromEntries(Object.entries(t).filter(([r]) => r.toLowerCase().includes(n)));
}
export {
  i as n,
  u as r,
  o as t
};

//# sourceMappingURL=simple-object-search-Dd_AEBhz.js.map
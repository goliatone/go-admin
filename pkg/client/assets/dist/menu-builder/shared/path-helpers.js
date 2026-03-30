function t(r, e, n = r) {
  return e ? /^https?:\/\//i.test(e) || e.startsWith("/") ? e : `${r.replace(/\/+$/, "")}/${e.replace(/^\/+/, "")}` : n;
}
function u(r, e) {
  return t(r, e, "");
}
function l(r, e) {
  const n = `${r.replace(/\/+$/, "")}/api`, i = t(r, e || n, n);
  return /\/api(\/|$)/.test(i) ? i : `${i.replace(/\/+$/, "")}/api`;
}
export {
  l as normalizeMenuBuilderAPIBasePath,
  t as normalizeMenuBuilderPath,
  u as normalizeMenuBuilderRoute
};
//# sourceMappingURL=path-helpers.js.map

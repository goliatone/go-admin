function s(r, n) {
  const t = n.toString();
  return t ? `${r}?${t}` : r;
}
function u(r) {
  return r.startsWith("http://") || r.startsWith("https://");
}
function a(r) {
  const n = String(r).trim();
  if (!n) return null;
  const t = u(n);
  return {
    absolute: t,
    url: new URL(n, t ? void 0 : "http://localhost")
  };
}
function c(r, n, t = {}) {
  const e = a(r);
  return e ? (n.forEach((i, o) => {
    e.url.searchParams.set(o, i);
  }), e.absolute && t.preserveAbsolute ? e.url.toString() : `${e.url.pathname}${e.url.search}`) : "";
}
function f(r, n) {
  for (const t of n) r.delete(t);
}
function m(r, n, t) {
  if (t == null) return;
  const e = String(t);
  e.trim() && r.set(n, e);
}
function l(r, n, t, e = {}) {
  if (t == null || t === "") return;
  const i = Number(t);
  Number.isFinite(i) && (e.min !== void 0 && i < e.min || r.set(n, String(i)));
}
function d(r, n, t, e = ",") {
  if (!Array.isArray(t)) return;
  const i = t.map((o) => String(o).trim()).filter(Boolean);
  i.length !== 0 && r.set(n, i.join(e));
}
function h(r, n) {
  const t = r.get(n);
  if (!t || !t.trim()) return;
  const e = Number(t);
  return Number.isFinite(e) ? e : void 0;
}
function S(r, n) {
  const t = r.get(n);
  if (typeof t != "string") return;
  const e = t.trim();
  return e || void 0;
}
function g(r = globalThis.location) {
  return !r || typeof r.search != "string" ? null : new URLSearchParams(r.search);
}
function b(r, n) {
  if (!r) return n;
  try {
    return JSON.parse(r);
  } catch {
    return n;
  }
}
export {
  c as buildEndpointURL,
  s as buildURL,
  f as deleteSearchParams,
  h as getNumberSearchParam,
  S as getStringSearchParam,
  b as parseJSONParam,
  g as readLocationSearchParams,
  d as setJoinedSearchParam,
  l as setNumberSearchParam,
  m as setSearchParam
};

//# sourceMappingURL=url-state.js.map
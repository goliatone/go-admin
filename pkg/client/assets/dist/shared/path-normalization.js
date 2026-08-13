function i(t) {
  return t.replace(/\/+$/, "");
}
function n(t) {
  const r = (t || "").trim();
  return !r || r === "/" ? "" : `/${r.replace(/^\/+|\/+$/g, "")}`;
}
function u(t, r, e = t) {
  return r ? /^https?:\/\//i.test(r) || r.startsWith("/") ? r : `${t.replace(/\/+$/, "")}/${r.replace(/^\/+/, "")}` : e;
}
function a(t, r = {}) {
  const e = i((t || "").trim());
  return e ? r.ensureAPISuffix && !/\/api(\/|$)/.test(e) ? `${e}/api` : e : r.ensureAPISuffix ? "/api" : "";
}
function s(t) {
  const r = t.trim();
  return r ? i((r.startsWith("http://") || r.startsWith("https://") ? new URL(r).pathname : r).replace(/\/api(?:\/.*)?$/, "")) : "";
}
export {
  s as deriveBasePathFromAPIEndpoint,
  a as normalizeAPIBasePath,
  n as normalizeBasePath,
  u as resolvePath,
  i as trimTrailingSlash
};

//# sourceMappingURL=path-normalization.js.map
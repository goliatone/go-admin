function n(r) {
  return r.replace(/\/+$/, "");
}
function i(r) {
  const t = (r || "").trim();
  return !t || t === "/" ? "" : `/${t.replace(/^\/+|\/+$/g, "")}`;
}
function a(r, t = {}) {
  const e = n((r || "").trim());
  return e ? t.ensureAPISuffix && !/\/api(\/|$)/.test(e) ? `${e}/api` : e : t.ensureAPISuffix ? "/api" : "";
}
function u(r) {
  const t = r.trim();
  if (!t)
    return "";
  const e = t.startsWith("http://") || t.startsWith("https://") ? new URL(t).pathname : t;
  return n(e.replace(/\/api(?:\/.*)?$/, ""));
}
export {
  u as deriveBasePathFromAPIEndpoint,
  a as normalizeAPIBasePath,
  i as normalizeBasePath,
  n as trimTrailingSlash
};
//# sourceMappingURL=path-normalization.js.map

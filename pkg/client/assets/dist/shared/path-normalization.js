function i(r) {
  return r.replace(/\/+$/, "");
}
function n(r) {
  const t = (r || "").trim();
  return !t || t === "/" ? "" : `/${t.replace(/^\/+|\/+$/g, "")}`;
}
function a(r, t = {}) {
  const e = i((r || "").trim());
  return e ? t.ensureAPISuffix && !/\/api(\/|$)/.test(e) ? `${e}/api` : e : t.ensureAPISuffix ? "/api" : "";
}
function u(r) {
  const t = r.trim();
  return t ? i((t.startsWith("http://") || t.startsWith("https://") ? new URL(t).pathname : t).replace(/\/api(?:\/.*)?$/, "")) : "";
}
export {
  u as deriveBasePathFromAPIEndpoint,
  a as normalizeAPIBasePath,
  n as normalizeBasePath,
  i as trimTrailingSlash
};

//# sourceMappingURL=path-normalization.js.map
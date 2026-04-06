function t(r) {
  const e = (r || "").trim();
  return !e || e === "/" ? "" : `/${e.replace(/^\/+|\/+$/g, "")}`;
}
export {
  t as normalizeDebugBasePath
};

//# sourceMappingURL=path-helpers.js.map
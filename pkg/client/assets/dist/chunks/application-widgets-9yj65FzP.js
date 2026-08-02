var i = /* @__PURE__ */ Symbol.for("@goliatone/go-admin-client/application-widget-renderers");
function n() {
  const t = globalThis;
  return t[i] || (t[i] = { renderers: /* @__PURE__ */ new Map() }), t[i];
}
function o(t) {
  const e = String(t || "").trim();
  if (e)
    return n().renderers.get(e);
}
function l(t, e) {
  const r = o(t)?.title;
  return typeof r == "function" ? String(r(e) || "").trim() || void 0 : String(r || "").trim() || void 0;
}
export {
  l as n,
  o as t
};

//# sourceMappingURL=application-widgets-9yj65FzP.js.map
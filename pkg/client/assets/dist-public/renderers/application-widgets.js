var n = /* @__PURE__ */ Symbol.for("@goliatone/go-admin-client/application-widget-renderers");
function i() {
  const r = globalThis;
  return r[n] || (r[n] = { renderers: /* @__PURE__ */ new Map() }), r[n];
}
function d(r) {
  const e = String(r || "").trim();
  if (!e) throw new TypeError("widget definition is required");
  return e;
}
function c(r, e) {
  const t = d(r);
  if (!e || typeof e.render != "function") throw new TypeError("widget renderer must provide a render function");
  const o = e;
  return i().renderers.set(t, o), () => {
    i().renderers.get(t) === o && i().renderers.delete(t);
  };
}
function s(r) {
  const e = String(r || "").trim();
  if (e)
    return i().renderers.get(e);
}
function u(r) {
  const e = String(r || "").trim();
  return e ? i().renderers.delete(e) : !1;
}
function f(r, e) {
  const t = s(r)?.title;
  return typeof t == "function" ? String(t(e) || "").trim() || void 0 : String(t || "").trim() || void 0;
}
export {
  c as registerApplicationWidgetRenderer,
  s as resolveApplicationWidgetRenderer,
  f as resolveApplicationWidgetTitle,
  u as unregisterApplicationWidgetRenderer
};

//# sourceMappingURL=application-widgets.js.map
const l = {
  profile: "none",
  capability_mode: "none",
  supported_profiles: ["none", "core", "core+exchange", "core+queue", "full"],
  schema_version: 1,
  modules: {
    exchange: { enabled: !1, visible: !1, entry: { enabled: !1 }, actions: {} },
    queue: { enabled: !1, visible: !1, entry: { enabled: !1 }, actions: {} }
  },
  features: {
    cms: !1,
    dashboard: !1
  },
  routes: {},
  panels: [],
  resolver_keys: [],
  warnings: []
};
function i(o) {
  if (typeof o != "string") return "none";
  const e = o.toLowerCase().trim();
  return ["none", "core", "core+exchange", "core+queue", "full"].includes(e) ? e : "none";
}
function f(o) {
  if (!o || typeof o != "object") return null;
  const e = o;
  return {
    enabled: e.enabled === !0,
    reason: typeof e.reason == "string" ? e.reason : void 0,
    reason_code: typeof e.reason_code == "string" ? e.reason_code : void 0,
    permission: typeof e.permission == "string" ? e.permission : void 0
  };
}
function p(o) {
  if (typeof o == "boolean")
    return {
      enabled: o,
      visible: o,
      entry: { enabled: o },
      actions: {}
    };
  if (!o || typeof o != "object")
    return { enabled: !1, visible: !1, entry: { enabled: !1 }, actions: {} };
  const e = o, t = e.enabled === !0, s = f(e.entry), n = typeof e.visible == "boolean" ? e.visible : t && (s ? s.enabled : !0), r = e.actions && typeof e.actions == "object" ? e.actions : {}, a = {};
  for (const [d, u] of Object.entries(r)) {
    const c = f(u);
    c && (a[d] = c);
  }
  return {
    enabled: t,
    visible: n,
    entry: s ?? { enabled: t },
    actions: a
  };
}
function y(o) {
  if (!o || typeof o != "object")
    return {};
  const e = o, t = {};
  for (const [s, n] of Object.entries(e)) {
    const r = typeof n == "string" ? n.trim() : "";
    r && (t[s] = r);
  }
  return t;
}
function b(o) {
  if (!o || typeof o != "object")
    return { ...l };
  const e = o, t = typeof e.modules == "object" && e.modules ? e.modules : {}, s = typeof e.features == "object" && e.features ? e.features : {};
  return {
    profile: i(e.profile ?? e.capability_mode),
    capability_mode: i(e.capability_mode ?? e.profile),
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.map(i).filter((n, r, a) => a.indexOf(n) === r) : [...l.supported_profiles],
    schema_version: typeof e.schema_version == "number" ? e.schema_version : 1,
    modules: {
      exchange: p(t.exchange),
      queue: p(t.queue)
    },
    features: {
      cms: typeof s.cms == "boolean" ? s.cms : !1,
      dashboard: typeof s.dashboard == "boolean" ? s.dashboard : !1
    },
    routes: y(e.routes),
    panels: Array.isArray(e.panels) ? e.panels.filter((n) => typeof n == "string") : [],
    resolver_keys: Array.isArray(e.resolver_keys) ? e.resolver_keys.filter((n) => typeof n == "string") : [],
    warnings: Array.isArray(e.warnings) ? e.warnings.filter((n) => typeof n == "string") : [],
    contracts: typeof e.contracts == "object" && e.contracts ? e.contracts : void 0
  };
}
export {
  l as E,
  b as n
};
//# sourceMappingURL=index-BmhyAsmn.js.map

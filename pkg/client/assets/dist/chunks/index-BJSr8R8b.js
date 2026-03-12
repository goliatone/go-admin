async function b(t, e = {}) {
  const {
    json: o,
    idempotencyKey: s,
    accept: n,
    headers: a,
    ...i
  } = e, r = new Headers(a || {});
  n ? r.set("Accept", n) : r.has("Accept") || r.set("Accept", "application/json"), s && s.trim() && r.set("X-Idempotency-Key", s.trim());
  let c = i.body;
  return o !== void 0 && (r.has("Content-Type") || r.set("Content-Type", "application/json"), c = JSON.stringify(o)), fetch(t, {
    ...i,
    headers: r,
    body: c
  });
}
async function m(t, e = "Request failed") {
  try {
    const o = await t.text();
    if (o && o.trim())
      return o.trim();
  } catch {
  }
  return `${e}: ${t.status}`;
}
const p = {
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
function l(t) {
  if (typeof t != "string") return "none";
  const e = t.toLowerCase().trim();
  return ["none", "core", "core+exchange", "core+queue", "full"].includes(e) ? e : "none";
}
function d(t) {
  if (!t || typeof t != "object") return null;
  const e = t;
  return {
    enabled: e.enabled === !0,
    reason: typeof e.reason == "string" ? e.reason : void 0,
    reason_code: typeof e.reason_code == "string" ? e.reason_code : void 0,
    permission: typeof e.permission == "string" ? e.permission : void 0
  };
}
function y(t) {
  if (typeof t == "boolean")
    return {
      enabled: t,
      visible: t,
      entry: { enabled: t },
      actions: {}
    };
  if (!t || typeof t != "object")
    return { enabled: !1, visible: !1, entry: { enabled: !1 }, actions: {} };
  const e = t, o = e.enabled === !0, s = d(e.entry), n = typeof e.visible == "boolean" ? e.visible : o && (s ? s.enabled : !0), a = e.actions && typeof e.actions == "object" ? e.actions : {}, i = {};
  for (const [r, c] of Object.entries(a)) {
    const f = d(c);
    f && (i[r] = f);
  }
  return {
    enabled: o,
    visible: n,
    entry: s ?? { enabled: o },
    actions: i
  };
}
function u(t) {
  if (!t || typeof t != "object")
    return {};
  const e = t, o = {};
  for (const [s, n] of Object.entries(e)) {
    const a = typeof n == "string" ? n.trim() : "";
    a && (o[s] = a);
  }
  return o;
}
function _(t) {
  if (!t || typeof t != "object")
    return { ...p };
  const e = t, o = typeof e.modules == "object" && e.modules ? e.modules : {}, s = typeof e.features == "object" && e.features ? e.features : {};
  return {
    profile: l(e.profile ?? e.capability_mode),
    capability_mode: l(e.capability_mode ?? e.profile),
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.map(l).filter((n, a, i) => i.indexOf(n) === a) : [...p.supported_profiles],
    schema_version: typeof e.schema_version == "number" ? e.schema_version : 1,
    modules: {
      exchange: y(o.exchange),
      queue: y(o.queue)
    },
    features: {
      cms: typeof s.cms == "boolean" ? s.cms : !1,
      dashboard: typeof s.dashboard == "boolean" ? s.dashboard : !1
    },
    routes: u(e.routes),
    panels: Array.isArray(e.panels) ? e.panels.filter((n) => typeof n == "string") : [],
    resolver_keys: Array.isArray(e.resolver_keys) ? e.resolver_keys.filter((n) => typeof n == "string") : [],
    warnings: Array.isArray(e.warnings) ? e.warnings.filter((n) => typeof n == "string") : [],
    contracts: typeof e.contracts == "object" && e.contracts ? e.contracts : void 0
  };
}
export {
  p as E,
  b as h,
  _ as n,
  m as r
};
//# sourceMappingURL=index-BJSr8R8b.js.map

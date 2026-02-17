const y = {
  profile: "none",
  schema_version: 1,
  modules: {
    exchange: { enabled: !1 },
    queue: { enabled: !1 }
  },
  features: {
    cms: !1,
    dashboard: !1
  },
  routes: {},
  panels: [],
  resolver_keys: [],
  warnings: []
}, C = {
  QUEUE: "admin.translations.queue",
  EXCHANGE_UI: "admin.translations.exchange",
  EXCHANGE_EXPORT: "admin.api.translations.export",
  EXCHANGE_IMPORT_VALIDATE: "admin.api.translations.import.validate",
  EXCHANGE_IMPORT_APPLY: "admin.api.translations.import.apply"
};
function b() {
  if (typeof window < "u" && window.__TRANSLATION_CAPABILITIES__)
    return f(window.__TRANSLATION_CAPABILITIES__);
  const e = document.querySelector("script[data-translation-capabilities]");
  if (e)
    try {
      const a = e.textContent || "", i = JSON.parse(a);
      return f(i);
    } catch {
    }
  const t = document.body;
  if (t?.dataset?.translationCapabilities)
    try {
      return f(JSON.parse(t.dataset.translationCapabilities));
    } catch {
    }
  return { ...y };
}
function f(e) {
  if (!e || typeof e != "object")
    return { ...y };
  const t = e, a = typeof t.modules == "object" && t.modules ? t.modules : {}, i = typeof t.features == "object" && t.features ? t.features : {};
  return {
    profile: v(t.profile),
    schema_version: typeof t.schema_version == "number" ? t.schema_version : 1,
    modules: {
      exchange: m(a.exchange),
      queue: m(a.queue)
    },
    features: {
      cms: typeof i.cms == "boolean" ? i.cms : !1,
      dashboard: typeof i.dashboard == "boolean" ? i.dashboard : !1
    },
    routes: _(t.routes),
    panels: Array.isArray(t.panels) ? t.panels.filter((n) => typeof n == "string") : [],
    resolver_keys: Array.isArray(t.resolver_keys) ? t.resolver_keys.filter((n) => typeof n == "string") : [],
    warnings: Array.isArray(t.warnings) ? t.warnings.filter((n) => typeof n == "string") : []
  };
}
function _(e) {
  if (!e || typeof e != "object")
    return {};
  const t = e, a = {};
  for (const [i, n] of Object.entries(t)) {
    const s = typeof n == "string" ? n.trim() : "";
    s && (a[i] = s);
  }
  return a;
}
function v(e) {
  if (typeof e != "string") return "none";
  const t = e.toLowerCase().trim();
  return ["none", "core", "core+exchange", "core+queue", "full"].includes(t) ? t : "none";
}
function m(e) {
  if (typeof e == "boolean")
    return {
      enabled: e,
      visible: e,
      entry: { enabled: e },
      actions: {}
    };
  if (!e || typeof e != "object")
    return { enabled: !1, visible: !1 };
  const t = e, a = t.enabled === !0, i = h(t.entry), n = typeof t.visible == "boolean" ? t.visible : a && (i ? i.enabled : !0), s = t.actions && typeof t.actions == "object" ? t.actions : {}, o = {};
  for (const [l, c] of Object.entries(s)) {
    const r = h(c);
    r && (o[l] = r);
  }
  return {
    enabled: a,
    visible: n,
    entry: i ?? { enabled: a },
    actions: o
  };
}
function h(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e;
  return {
    enabled: t.enabled === !0,
    reason: typeof t.reason == "string" ? t.reason : void 0,
    reason_code: typeof t.reason_code == "string" ? t.reason_code : void 0,
    permission: typeof t.permission == "string" ? t.permission : void 0
  };
}
function g(e) {
  if (!e)
    return { visible: !1, enabled: !1 };
  const t = e.visible === !0 || e.visible === void 0 && e.enabled, a = e.entry ?? { enabled: e.enabled }, i = a.enabled === !0, n = a.reason || (e.enabled ? void 0 : "module disabled by capability mode"), s = a.reason_code || (e.enabled ? void 0 : "FEATURE_DISABLED"), o = a.permission;
  return t ? !e.enabled || !i ? {
    visible: !0,
    enabled: !1,
    reason: n,
    reasonCode: s,
    permission: o
  } : { visible: !0, enabled: !0 } : {
    visible: !1,
    enabled: !1,
    reason: n,
    reasonCode: s,
    permission: o
  };
}
function E(e) {
  return (e ?? b()).modules.exchange.enabled;
}
function x(e) {
  return (e ?? b()).modules.queue.enabled;
}
function L(e) {
  return E(e) || x(e);
}
function p(e, t, a) {
  const i = t ?? b(), n = C[e];
  if (i.routes[n])
    return i.routes[n];
  const s = (a ?? "").replace(/\/+$/, "");
  switch (e) {
    case "QUEUE":
      return i.modules.queue.enabled ? `${s}/content/translations` : null;
    case "EXCHANGE_UI":
      return i.modules.exchange.enabled ? `${s}/translations/exchange` : null;
    default:
      return null;
  }
}
function A(e, t) {
  const a = e ?? b(), i = (t ?? "").replace(/\/+$/, ""), n = [], s = g(a.modules.queue), o = p("QUEUE", a, i);
  s.visible && o && n.push({
    id: "translation-queue",
    label: "Translation Queue",
    icon: "iconoir-language",
    href: o,
    module: "queue",
    enabled: s.enabled,
    description: "Manage translation assignments and review workflow",
    disabledReason: s.reason,
    disabledReasonCode: s.reasonCode,
    permission: s.permission
  });
  const l = g(a.modules.exchange), c = p("EXCHANGE_UI", a, i);
  return l.visible && c && n.push({
    id: "translation-exchange",
    label: "Translation Exchange",
    icon: "iconoir-translate",
    href: c,
    module: "exchange",
    enabled: l.enabled,
    description: "Export and import translation files",
    disabledReason: l.reason,
    disabledReasonCode: l.reasonCode,
    permission: l.permission
  }), n;
}
function T(e, t) {
  const { asListItem: a = !1, className: i = "" } = t ?? {}, n = document.createElement("a");
  n.href = e.enabled ? e.href : "#", n.className = `nav-item translation-operation-link ${i}`.trim(), n.setAttribute("data-entrypoint-id", e.id), n.setAttribute("data-module", e.module), n.setAttribute("data-enabled", e.enabled ? "true" : "false"), e.enabled || (n.setAttribute("aria-disabled", "true"), n.classList.add("opacity-60", "cursor-not-allowed"));
  const s = e.disabledReason?.trim(), o = s ? `${e.description || e.label} (${s})` : e.description || e.label;
  n.setAttribute("aria-label", o), n.setAttribute("title", o);
  const l = document.createElement("i");
  l.className = `${e.icon} flex-shrink-0`, l.style.fontSize = "var(--sidebar-icon-size, 20px)", l.setAttribute("aria-hidden", "true"), n.appendChild(l);
  const c = document.createElement("span");
  if (c.className = "nav-text flex-1", c.textContent = e.label, n.appendChild(c), e.badge) {
    const r = document.createElement("span"), d = e.badgeVariant === "warning" ? "bg-yellow-500/20 text-yellow-400" : e.badgeVariant === "danger" ? "bg-red-500/20 text-red-400" : e.badgeVariant === "success" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400";
    r.className = `ml-auto px-2 py-0.5 ${d} text-xs font-medium rounded`, r.textContent = e.badge, r.setAttribute("aria-label", `${e.badge} badge`), n.appendChild(r);
  }
  if (e.enabled || n.addEventListener("click", (r) => {
    r.preventDefault(), r.stopPropagation();
  }), a) {
    const r = document.createElement("li");
    return r.appendChild(n), r;
  }
  return n;
}
function w(e, t, a, i) {
  const { asListItems: n = !1, headerLabel: s } = i ?? {}, o = typeof e == "string" ? document.querySelector(e) : e;
  if (!o) return;
  const l = A(t, a);
  if (l.length === 0) {
    o.style.display = "none";
    return;
  }
  o.style.display = "", o.innerHTML = "";
  const c = document.createElement("nav");
  if (c.setAttribute("aria-label", s || "Translation operations"), c.setAttribute("role", "navigation"), s) {
    const d = `translation-ops-header-${Date.now()}`, u = document.createElement("h3");
    u.id = d, u.className = "text-xs font-medium text-sidebar-text-muted uppercase tracking-wider px-3 py-2", u.textContent = s, c.appendChild(u), c.setAttribute("aria-labelledby", d);
  }
  const r = n ? document.createElement("ul") : document.createElement("div");
  r.className = "space-y-0.5", n && r.setAttribute("role", "list");
  for (const d of l) {
    const u = T(d, { asListItem: n });
    r.appendChild(u);
  }
  c.appendChild(r), o.appendChild(c);
}
class I {
  constructor(t) {
    this.entrypoints = [], this.config = {
      basePath: t.basePath,
      capabilities: t.capabilities ?? b(),
      container: t.container ?? "[data-translation-operations]",
      onEntrypointClick: t.onEntrypointClick ?? (() => {
      })
    }, this.capabilities = this.config.capabilities, this.entrypoints = A(this.capabilities, this.config.basePath);
  }
  /** Get capabilities */
  getCapabilities() {
    return this.capabilities;
  }
  /** Get available entrypoints */
  getEntrypoints() {
    return this.entrypoints;
  }
  /** Check if any operations are available */
  hasOperations() {
    return this.entrypoints.length > 0;
  }
  /** Check if exchange is enabled */
  isExchangeEnabled() {
    return E(this.capabilities);
  }
  /** Check if queue is enabled */
  isQueueEnabled() {
    return x(this.capabilities);
  }
  /** Get route for a specific operation */
  getRoute(t) {
    return p(t, this.capabilities, this.config.basePath);
  }
  /** Initialize and render entrypoints */
  init() {
    if (!this.hasOperations()) return;
    const t = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container;
    t && (w(
      t,
      this.capabilities,
      this.config.basePath,
      { headerLabel: "Translations" }
    ), t.querySelectorAll(".translation-operation-link").forEach((a) => {
      a.addEventListener("click", (i) => {
        const n = a.dataset.entrypointId, s = this.entrypoints.find((o) => o.id === n);
        if (!s || !s.enabled) {
          i.preventDefault();
          return;
        }
        this.config.onEntrypointClick && this.config.onEntrypointClick(s);
      });
    }));
  }
}
function N(e) {
  if (!document.querySelector("[data-translation-operations]")) return null;
  const a = new I({
    basePath: e ?? ""
  });
  return a.init(), a;
}
export {
  I as TranslationOperationsManager,
  A as buildTranslationEntrypoints,
  b as extractTranslationCapabilities,
  p as getTranslationRoute,
  L as hasTranslationOperations,
  N as initTranslationOperations,
  E as isExchangeEnabled,
  x as isQueueEnabled,
  T as renderEntrypointLink,
  w as renderTranslationEntrypoints
};
//# sourceMappingURL=index.js.map

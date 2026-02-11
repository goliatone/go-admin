const b = {
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
}, E = {
  QUEUE: "admin.translations.queue",
  EXCHANGE_UI: "admin.translations.exchange",
  EXCHANGE_EXPORT: "admin.api.translations.export",
  EXCHANGE_IMPORT_VALIDATE: "admin.api.translations.import.validate",
  EXCHANGE_IMPORT_APPLY: "admin.api.translations.import.apply"
};
function u() {
  if (typeof window < "u" && window.__TRANSLATION_CAPABILITIES__)
    return d(window.__TRANSLATION_CAPABILITIES__);
  const t = document.querySelector("script[data-translation-capabilities]");
  if (t)
    try {
      const a = t.textContent || "", s = JSON.parse(a);
      return d(s);
    } catch {
    }
  const e = document.body;
  if (e?.dataset?.translationCapabilities)
    try {
      return d(JSON.parse(e.dataset.translationCapabilities));
    } catch {
    }
  return { ...b };
}
function d(t) {
  if (!t || typeof t != "object")
    return { ...b };
  const e = t, a = typeof e.modules == "object" && e.modules ? e.modules : {}, s = typeof e.features == "object" && e.features ? e.features : {};
  return {
    profile: x(e.profile),
    schema_version: typeof e.schema_version == "number" ? e.schema_version : 1,
    modules: {
      exchange: { enabled: f(a.exchange) },
      queue: { enabled: f(a.queue) }
    },
    features: {
      cms: typeof s.cms == "boolean" ? s.cms : !1,
      dashboard: typeof s.dashboard == "boolean" ? s.dashboard : !1
    },
    routes: typeof e.routes == "object" && e.routes ? e.routes : {},
    panels: Array.isArray(e.panels) ? e.panels.filter((n) => typeof n == "string") : [],
    resolver_keys: Array.isArray(e.resolver_keys) ? e.resolver_keys.filter((n) => typeof n == "string") : [],
    warnings: Array.isArray(e.warnings) ? e.warnings.filter((n) => typeof n == "string") : []
  };
}
function x(t) {
  if (typeof t != "string") return "none";
  const e = t.toLowerCase().trim();
  return ["none", "core", "core+exchange", "core+queue", "full"].includes(e) ? e : "none";
}
function f(t) {
  if (typeof t == "boolean") return t;
  if (typeof t == "object" && t) {
    const e = t;
    return typeof e.enabled == "boolean" ? e.enabled : !1;
  }
  return !1;
}
function h(t) {
  return (t ?? u()).modules.exchange.enabled;
}
function m(t) {
  return (t ?? u()).modules.queue.enabled;
}
function T(t) {
  return h(t) || m(t);
}
function p(t, e, a) {
  const s = e ?? u(), n = E[t];
  if (s.routes[n])
    return s.routes[n];
  const i = (a ?? "").replace(/\/+$/, "");
  switch (t) {
    case "QUEUE":
      return s.modules.queue.enabled ? `${i}/translations/queue` : null;
    case "EXCHANGE_UI":
      return s.modules.exchange.enabled ? `${i}/translations/exchange` : null;
    default:
      return null;
  }
}
function g(t, e) {
  const a = t ?? u(), s = (e ?? "").replace(/\/+$/, ""), n = [], i = p("QUEUE", a, s);
  a.modules.queue.enabled && i && n.push({
    id: "translation-queue",
    label: "Translation Queue",
    icon: "iconoir-language",
    href: i,
    module: "queue",
    enabled: !0,
    description: "Manage translation assignments and review workflow"
  });
  const r = p("EXCHANGE_UI", a, s);
  return a.modules.exchange.enabled && r && n.push({
    id: "translation-exchange",
    label: "Translation Exchange",
    icon: "iconoir-translate",
    href: r,
    module: "exchange",
    enabled: !0,
    description: "Export and import translation files"
  }), n;
}
function C(t, e) {
  const { asListItem: a = !1, className: s = "" } = e ?? {}, n = document.createElement("a");
  n.href = t.href, n.className = `nav-item translation-operation-link ${s}`.trim(), n.setAttribute("data-entrypoint-id", t.id), n.setAttribute("data-module", t.module);
  const i = document.createElement("i");
  i.className = `${t.icon} flex-shrink-0`, i.style.fontSize = "var(--sidebar-icon-size, 20px)", n.appendChild(i);
  const r = document.createElement("span");
  if (r.className = "nav-text flex-1", r.textContent = t.label, n.appendChild(r), t.badge) {
    const o = document.createElement("span"), l = t.badgeVariant === "warning" ? "bg-yellow-500/20 text-yellow-400" : t.badgeVariant === "danger" ? "bg-red-500/20 text-red-400" : t.badgeVariant === "success" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400";
    o.className = `ml-auto px-2 py-0.5 ${l} text-xs font-medium rounded`, o.textContent = t.badge, n.appendChild(o);
  }
  if (a) {
    const o = document.createElement("li");
    return o.appendChild(n), o;
  }
  return n;
}
function A(t, e, a, s) {
  const { asListItems: n = !1, headerLabel: i } = s ?? {}, r = typeof t == "string" ? document.querySelector(t) : t;
  if (!r) return;
  const o = g(e, a);
  if (o.length === 0) {
    r.style.display = "none";
    return;
  }
  if (r.style.display = "", r.innerHTML = "", i) {
    const c = document.createElement("div");
    c.className = "text-xs font-medium text-sidebar-text-muted uppercase tracking-wider px-3 py-2", c.textContent = i, r.appendChild(c);
  }
  const l = n ? document.createElement("ul") : document.createElement("div");
  l.className = "space-y-0.5";
  for (const c of o) {
    const y = C(c, { asListItem: n });
    l.appendChild(y);
  }
  r.appendChild(l);
}
class _ {
  constructor(e) {
    this.entrypoints = [], this.config = {
      basePath: e.basePath,
      capabilities: e.capabilities ?? u(),
      container: e.container ?? "[data-translation-operations]",
      onEntrypointClick: e.onEntrypointClick ?? (() => {
      })
    }, this.capabilities = this.config.capabilities, this.entrypoints = g(this.capabilities, this.config.basePath);
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
    return h(this.capabilities);
  }
  /** Check if queue is enabled */
  isQueueEnabled() {
    return m(this.capabilities);
  }
  /** Get route for a specific operation */
  getRoute(e) {
    return p(e, this.capabilities, this.config.basePath);
  }
  /** Initialize and render entrypoints */
  init() {
    if (!this.hasOperations()) return;
    const e = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container;
    e && (A(
      e,
      this.capabilities,
      this.config.basePath,
      { headerLabel: "Translations" }
    ), e.querySelectorAll(".translation-operation-link").forEach((a) => {
      a.addEventListener("click", (s) => {
        const n = a.dataset.entrypointId, i = this.entrypoints.find((r) => r.id === n);
        i && this.config.onEntrypointClick && this.config.onEntrypointClick(i);
      });
    }));
  }
}
function I(t) {
  if (!document.querySelector("[data-translation-operations]")) return null;
  const a = new _({
    basePath: t ?? ""
  });
  return a.init(), a;
}
export {
  _ as TranslationOperationsManager,
  g as buildTranslationEntrypoints,
  u as extractTranslationCapabilities,
  p as getTranslationRoute,
  T as hasTranslationOperations,
  I as initTranslationOperations,
  h as isExchangeEnabled,
  m as isQueueEnabled,
  C as renderEntrypointLink,
  A as renderTranslationEntrypoints
};
//# sourceMappingURL=index.js.map

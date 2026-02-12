const m = {
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
}, x = {
  QUEUE: "admin.translations.queue",
  EXCHANGE_UI: "admin.translations.exchange",
  EXCHANGE_EXPORT: "admin.api.translations.export",
  EXCHANGE_IMPORT_VALIDATE: "admin.api.translations.import.validate",
  EXCHANGE_IMPORT_APPLY: "admin.api.translations.import.apply"
};
function d() {
  if (typeof window < "u" && window.__TRANSLATION_CAPABILITIES__)
    return b(window.__TRANSLATION_CAPABILITIES__);
  const t = document.querySelector("script[data-translation-capabilities]");
  if (t)
    try {
      const a = t.textContent || "", i = JSON.parse(a);
      return b(i);
    } catch {
    }
  const e = document.body;
  if (e?.dataset?.translationCapabilities)
    try {
      return b(JSON.parse(e.dataset.translationCapabilities));
    } catch {
    }
  return { ...m };
}
function b(t) {
  if (!t || typeof t != "object")
    return { ...m };
  const e = t, a = typeof e.modules == "object" && e.modules ? e.modules : {}, i = typeof e.features == "object" && e.features ? e.features : {};
  return {
    profile: A(e.profile),
    schema_version: typeof e.schema_version == "number" ? e.schema_version : 1,
    modules: {
      exchange: { enabled: h(a.exchange) },
      queue: { enabled: h(a.queue) }
    },
    features: {
      cms: typeof i.cms == "boolean" ? i.cms : !1,
      dashboard: typeof i.dashboard == "boolean" ? i.dashboard : !1
    },
    routes: typeof e.routes == "object" && e.routes ? e.routes : {},
    panels: Array.isArray(e.panels) ? e.panels.filter((n) => typeof n == "string") : [],
    resolver_keys: Array.isArray(e.resolver_keys) ? e.resolver_keys.filter((n) => typeof n == "string") : [],
    warnings: Array.isArray(e.warnings) ? e.warnings.filter((n) => typeof n == "string") : []
  };
}
function A(t) {
  if (typeof t != "string") return "none";
  const e = t.toLowerCase().trim();
  return ["none", "core", "core+exchange", "core+queue", "full"].includes(e) ? e : "none";
}
function h(t) {
  if (typeof t == "boolean") return t;
  if (typeof t == "object" && t) {
    const e = t;
    return typeof e.enabled == "boolean" ? e.enabled : !1;
  }
  return !1;
}
function g(t) {
  return (t ?? d()).modules.exchange.enabled;
}
function y(t) {
  return (t ?? d()).modules.queue.enabled;
}
function I(t) {
  return g(t) || y(t);
}
function f(t, e, a) {
  const i = e ?? d(), n = x[t];
  if (i.routes[n])
    return i.routes[n];
  const s = (a ?? "").replace(/\/+$/, "");
  switch (t) {
    case "QUEUE":
      return i.modules.queue.enabled ? `${s}/translations/queue` : null;
    case "EXCHANGE_UI":
      return i.modules.exchange.enabled ? `${s}/translations/exchange` : null;
    default:
      return null;
  }
}
function E(t, e) {
  const a = t ?? d(), i = (e ?? "").replace(/\/+$/, ""), n = [], s = f("QUEUE", a, i);
  a.modules.queue.enabled && s && n.push({
    id: "translation-queue",
    label: "Translation Queue",
    icon: "iconoir-language",
    href: s,
    module: "queue",
    enabled: !0,
    description: "Manage translation assignments and review workflow"
  });
  const r = f("EXCHANGE_UI", a, i);
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
  const { asListItem: a = !1, className: i = "" } = e ?? {}, n = document.createElement("a");
  n.href = t.href, n.className = `nav-item translation-operation-link ${i}`.trim(), n.setAttribute("data-entrypoint-id", t.id), n.setAttribute("data-module", t.module);
  const s = t.description || t.label;
  n.setAttribute("aria-label", s), n.setAttribute("title", s);
  const r = document.createElement("i");
  r.className = `${t.icon} flex-shrink-0`, r.style.fontSize = "var(--sidebar-icon-size, 20px)", r.setAttribute("aria-hidden", "true"), n.appendChild(r);
  const l = document.createElement("span");
  if (l.className = "nav-text flex-1", l.textContent = t.label, n.appendChild(l), t.badge) {
    const o = document.createElement("span"), c = t.badgeVariant === "warning" ? "bg-yellow-500/20 text-yellow-400" : t.badgeVariant === "danger" ? "bg-red-500/20 text-red-400" : t.badgeVariant === "success" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400";
    o.className = `ml-auto px-2 py-0.5 ${c} text-xs font-medium rounded`, o.textContent = t.badge, o.setAttribute("aria-label", `${t.badge} badge`), n.appendChild(o);
  }
  if (a) {
    const o = document.createElement("li");
    return o.appendChild(n), o;
  }
  return n;
}
function _(t, e, a, i) {
  const { asListItems: n = !1, headerLabel: s } = i ?? {}, r = typeof t == "string" ? document.querySelector(t) : t;
  if (!r) return;
  const l = E(e, a);
  if (l.length === 0) {
    r.style.display = "none";
    return;
  }
  r.style.display = "", r.innerHTML = "";
  const o = document.createElement("nav");
  if (o.setAttribute("aria-label", s || "Translation operations"), o.setAttribute("role", "navigation"), s) {
    const p = `translation-ops-header-${Date.now()}`, u = document.createElement("h3");
    u.id = p, u.className = "text-xs font-medium text-sidebar-text-muted uppercase tracking-wider px-3 py-2", u.textContent = s, o.appendChild(u), o.setAttribute("aria-labelledby", p);
  }
  const c = n ? document.createElement("ul") : document.createElement("div");
  c.className = "space-y-0.5", n && c.setAttribute("role", "list");
  for (const p of l) {
    const u = C(p, { asListItem: n });
    c.appendChild(u);
  }
  o.appendChild(c), r.appendChild(o);
}
class T {
  constructor(e) {
    this.entrypoints = [], this.config = {
      basePath: e.basePath,
      capabilities: e.capabilities ?? d(),
      container: e.container ?? "[data-translation-operations]",
      onEntrypointClick: e.onEntrypointClick ?? (() => {
      })
    }, this.capabilities = this.config.capabilities, this.entrypoints = E(this.capabilities, this.config.basePath);
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
    return g(this.capabilities);
  }
  /** Check if queue is enabled */
  isQueueEnabled() {
    return y(this.capabilities);
  }
  /** Get route for a specific operation */
  getRoute(e) {
    return f(e, this.capabilities, this.config.basePath);
  }
  /** Initialize and render entrypoints */
  init() {
    if (!this.hasOperations()) return;
    const e = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container;
    e && (_(
      e,
      this.capabilities,
      this.config.basePath,
      { headerLabel: "Translations" }
    ), e.querySelectorAll(".translation-operation-link").forEach((a) => {
      a.addEventListener("click", (i) => {
        const n = a.dataset.entrypointId, s = this.entrypoints.find((r) => r.id === n);
        s && this.config.onEntrypointClick && this.config.onEntrypointClick(s);
      });
    }));
  }
}
function w(t) {
  if (!document.querySelector("[data-translation-operations]")) return null;
  const a = new T({
    basePath: t ?? ""
  });
  return a.init(), a;
}
export {
  T as TranslationOperationsManager,
  E as buildTranslationEntrypoints,
  d as extractTranslationCapabilities,
  f as getTranslationRoute,
  I as hasTranslationOperations,
  w as initTranslationOperations,
  g as isExchangeEnabled,
  y as isQueueEnabled,
  C as renderEntrypointLink,
  _ as renderTranslationEntrypoints
};
//# sourceMappingURL=index.js.map

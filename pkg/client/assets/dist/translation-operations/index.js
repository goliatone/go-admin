import { n as f, E as A } from "../chunks/index-BmhyAsmn.js";
import { h as S } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as $ } from "../toast/error-helpers.js";
const q = {
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
      const n = e.textContent || "", s = JSON.parse(n);
      return f(s);
    } catch {
    }
  const t = document.body;
  if (t?.dataset?.translationCapabilities)
    try {
      return f(JSON.parse(t.dataset.translationCapabilities));
    } catch {
    }
  return { ...A };
}
function y(e) {
  if (!e)
    return { visible: !1, enabled: !1 };
  const t = e.visible === !0 || e.visible === void 0 && e.enabled, n = e.entry ?? { enabled: e.enabled }, s = n.enabled === !0, a = n.reason || (e.enabled ? void 0 : "module disabled by capability mode"), r = n.reason_code || (e.enabled ? void 0 : "FEATURE_DISABLED"), i = n.permission;
  return t ? !e.enabled || !s ? {
    visible: !0,
    enabled: !1,
    reason: a,
    reasonCode: r,
    permission: i
  } : { visible: !0, enabled: !0 } : {
    visible: !1,
    enabled: !1,
    reason: a,
    reasonCode: r,
    permission: i
  };
}
function I(e) {
  return (e ?? b()).modules.exchange.enabled;
}
function T(e) {
  return (e ?? b()).modules.queue.enabled;
}
function D(e) {
  return I(e) || T(e);
}
function g(e, t, n) {
  const s = t ?? b(), a = q[e];
  if (s.routes[a])
    return s.routes[a];
  const r = (n ?? "").replace(/\/+$/, "");
  switch (e) {
    case "QUEUE":
      return s.modules.queue.enabled ? `${r}/content/translations` : null;
    case "EXCHANGE_UI":
      return s.modules.exchange.enabled ? `${r}/translations/exchange` : null;
    default:
      return null;
  }
}
function v(e, t) {
  const n = e ?? b(), s = (t ?? "").replace(/\/+$/, ""), a = [], r = y(n.modules.queue), i = g("QUEUE", n, s);
  r.visible && i && a.push({
    id: "translation-queue",
    label: "Translation Queue",
    icon: "iconoir-language",
    href: i,
    module: "queue",
    enabled: r.enabled,
    description: "Manage translation assignments and review workflow",
    disabledReason: r.reason,
    disabledReasonCode: r.reasonCode,
    permission: r.permission
  });
  const l = y(n.modules.exchange), c = g("EXCHANGE_UI", n, s);
  return l.visible && c && a.push({
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
  }), a;
}
function w(e, t) {
  const { asListItem: n = !1, className: s = "" } = t ?? {}, a = document.createElement("a");
  a.href = e.enabled ? e.href : "#", a.className = `nav-item translation-operation-link ${s}`.trim(), a.setAttribute("data-entrypoint-id", e.id), a.setAttribute("data-module", e.module), a.setAttribute("data-enabled", e.enabled ? "true" : "false"), e.enabled || (a.setAttribute("aria-disabled", "true"), a.classList.add("opacity-60", "cursor-not-allowed"));
  const r = e.disabledReason?.trim(), i = r ? `${e.description || e.label} (${r})` : e.description || e.label;
  a.setAttribute("aria-label", i), a.setAttribute("title", i);
  const l = document.createElement("i");
  l.className = `${e.icon} flex-shrink-0`, l.style.fontSize = "var(--sidebar-icon-size, 20px)", l.setAttribute("aria-hidden", "true"), a.appendChild(l);
  const c = document.createElement("span");
  if (c.className = "nav-text flex-1", c.textContent = e.label, a.appendChild(c), e.badge) {
    const o = document.createElement("span"), u = e.badgeVariant === "warning" ? "bg-yellow-500/20 text-yellow-400" : e.badgeVariant === "danger" ? "bg-red-500/20 text-red-400" : e.badgeVariant === "success" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400";
    o.className = `ml-auto px-2 py-0.5 ${u} text-xs font-medium rounded`, o.textContent = e.badge, o.setAttribute("aria-label", `${e.badge} badge`), a.appendChild(o);
  }
  if (e.enabled || a.addEventListener("click", (o) => {
    o.preventDefault(), o.stopPropagation();
  }), n) {
    const o = document.createElement("li");
    return o.appendChild(a), o;
  }
  return a;
}
function L(e, t, n, s) {
  const { asListItems: a = !1, headerLabel: r } = s ?? {}, i = typeof e == "string" ? document.querySelector(e) : e;
  if (!i) return;
  const l = v(t, n);
  if (l.length === 0) {
    i.style.display = "none";
    return;
  }
  i.style.display = "", i.innerHTML = "";
  const c = document.createElement("nav");
  if (c.setAttribute("aria-label", r || "Translation operations"), c.setAttribute("role", "navigation"), r) {
    const u = `translation-ops-header-${Date.now()}`, p = document.createElement("h3");
    p.id = u, p.className = "text-xs font-medium text-sidebar-text-muted uppercase tracking-wider px-3 py-2", p.textContent = r, c.appendChild(p), c.setAttribute("aria-labelledby", u);
  }
  const o = a ? document.createElement("ul") : document.createElement("div");
  o.className = "space-y-0.5", a && o.setAttribute("role", "list");
  for (const u of l) {
    const p = w(u, { asListItem: a });
    o.appendChild(p);
  }
  c.appendChild(o), i.appendChild(c);
}
function h(e, t) {
  const n = e.headers.get(t);
  return typeof n == "string" ? n.trim() : "";
}
function N(e, t) {
  const n = h(e, "x-request-id"), s = h(e, "x-correlation-id"), a = h(e, "x-trace-id") || s || t;
  return {
    requestId: n || t,
    traceId: a || void 0
  };
}
function x(e) {
  if (Array.isArray(e))
    return e.length;
  if (!e || typeof e != "object")
    return 0;
  const t = e;
  for (const n of ["items", "assignments", "results", "rows", "families"])
    if (Array.isArray(t[n]))
      return t[n].length;
  return t.data && typeof t.data == "object" ? x(t.data) : Object.keys(t).length;
}
async function R(e) {
  const t = e.trim();
  if (!t)
    return {
      status: "empty",
      message: "This shell route is ready, but the backing API contract has not been connected yet."
    };
  const n = await S(t, { method: "GET" }), s = N(n);
  if (!n.ok) {
    const r = await $(n);
    return {
      status: n.status === 409 || r.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: r.message,
      requestId: s.requestId,
      traceId: s.traceId,
      statusCode: n.status,
      errorCode: r.textCode
    };
  }
  let a = null;
  try {
    a = await n.json();
  } catch {
    a = null;
  }
  return x(a) === 0 ? {
    status: "empty",
    payload: a,
    requestId: s.requestId,
    traceId: s.traceId,
    statusCode: n.status,
    message: "No records match the current shell route yet."
  } : {
    status: "ready",
    payload: a,
    requestId: s.requestId,
    traceId: s.traceId,
    statusCode: n.status
  };
}
function m(e) {
  const t = [];
  return e.requestId && t.push(`<span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Request ${d(e.requestId)}</span>`), e.traceId && t.push(`<span class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Trace ${d(e.traceId)}</span>`), t.length ? `<div class="flex flex-wrap gap-2 mt-4">${t.join("")}</div>` : "";
}
function _(e, t, n) {
  const s = x(e.payload);
  return `
    <div class="space-y-4">
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="text-sm font-medium text-emerald-800">${d(t)}</p>
        <p class="mt-1 text-sm text-emerald-700">${s} contract item${s === 1 ? "" : "s"} available for this shell.</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p class="text-sm text-slate-700">${d(n)}</p>
        <details class="mt-4">
          <summary class="cursor-pointer text-sm font-medium text-slate-800">Inspect payload</summary>
          <pre class="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">${d(JSON.stringify(e.payload, null, 2))}</pre>
        </details>
        ${m(e)}
      </div>
    </div>
  `;
}
function k(e) {
  return `
    <div class="space-y-4">
      ${C(
    "Version conflict",
    e.message || "The shell route detected a canonical version conflict."
  )}
      ${m(e)}
    </div>
  `;
}
function P(e, t) {
  return `
    <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p class="text-sm font-semibold text-slate-900">${d(e)}</p>
      <p class="mt-1 text-sm text-slate-600">${d(t)}</p>
    </div>
  `;
}
function C(e, t) {
  return `
    <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4">
      <p class="text-sm font-semibold text-rose-800">${d(e)}</p>
      <p class="mt-1 text-sm text-rose-700">${d(t)}</p>
    </div>
  `;
}
function O() {
  return `
    <div class="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <p class="text-sm font-medium text-slate-900">Loading translation shell...</p>
      <p class="mt-1 text-sm text-slate-500">Waiting for the backing API response.</p>
    </div>
  `;
}
function d(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function E(e, t, n = {}) {
  const s = n.title || e.dataset.title || "Translation Shell", a = n.description || e.dataset.description || "Translation shell route";
  switch (t.status) {
    case "ready":
      e.innerHTML = _(t, s, a);
      return;
    case "conflict":
      e.innerHTML = k(t);
      return;
    case "error":
      e.innerHTML = `
        ${C(
        "Translation shell request failed",
        t.message || "The shell route could not load its backing payload."
      )}
        ${m(t)}
      `;
      return;
    case "empty":
      e.innerHTML = `
        ${P(s, t.message || a)}
        ${m(t)}
      `;
      return;
    default:
      e.innerHTML = O();
  }
}
async function X(e) {
  const t = typeof e == "string" ? document.querySelector(e) : e;
  if (!t)
    return null;
  E(t, { status: "loading" });
  const n = await R(t.dataset.endpoint || "");
  return E(t, n), n;
}
class M {
  constructor(t) {
    this.entrypoints = [], this.config = {
      basePath: t.basePath,
      capabilities: t.capabilities ?? b(),
      container: t.container ?? "[data-translation-operations]",
      onEntrypointClick: t.onEntrypointClick ?? (() => {
      })
    }, this.capabilities = this.config.capabilities, this.entrypoints = v(this.capabilities, this.config.basePath);
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
    return I(this.capabilities);
  }
  /** Check if queue is enabled */
  isQueueEnabled() {
    return T(this.capabilities);
  }
  /** Get route for a specific operation */
  getRoute(t) {
    return g(t, this.capabilities, this.config.basePath);
  }
  /** Initialize and render entrypoints */
  init() {
    if (!this.hasOperations()) return;
    const t = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container;
    t && (L(
      t,
      this.capabilities,
      this.config.basePath,
      { headerLabel: "Translations" }
    ), t.querySelectorAll(".translation-operation-link").forEach((n) => {
      n.addEventListener("click", (s) => {
        const a = n.dataset.entrypointId, r = this.entrypoints.find((i) => i.id === a);
        if (!r || !r.enabled) {
          s.preventDefault();
          return;
        }
        this.config.onEntrypointClick && this.config.onEntrypointClick(r);
      });
    }));
  }
}
function Q(e) {
  if (!document.querySelector("[data-translation-operations]")) return null;
  const n = new M({
    basePath: e ?? ""
  });
  return n.init(), n;
}
export {
  M as TranslationOperationsManager,
  v as buildTranslationEntrypoints,
  b as extractTranslationCapabilities,
  R as fetchTranslationShellData,
  g as getTranslationRoute,
  D as hasTranslationOperations,
  Q as initTranslationOperations,
  X as initTranslationSurfaceShell,
  I as isExchangeEnabled,
  T as isQueueEnabled,
  w as renderEntrypointLink,
  L as renderTranslationEntrypoints,
  E as renderTranslationSurfaceShell
};
//# sourceMappingURL=index.js.map

import { e as h, E as R } from "../chunks/index-YiVxcMWC.js";
import { R as I, b as A, a0 as q, a1 as b, a2 as C, c as N } from "../chunks/style-constants-i2xRoO1L.js";
import { h as w } from "../chunks/http-client-DZnuedzQ.js";
import { extractStructuredError as P } from "../toast/error-helpers.js";
import { escapeHTML as d } from "../shared/html.js";
const U = {
  QUEUE: "admin.translations.queue",
  EXCHANGE_UI: "admin.translations.exchange",
  EXCHANGE_EXPORT: "admin.api.translations.export",
  EXCHANGE_IMPORT_VALIDATE: "admin.api.translations.import.validate",
  EXCHANGE_IMPORT_APPLY: "admin.api.translations.import.apply"
}, v = `${I} border ${A} ${N} px-4 py-4`, k = `${I} border ${A} ${q} px-4 py-4`;
function m() {
  if (typeof window < "u" && window.__TRANSLATION_CAPABILITIES__)
    return h(window.__TRANSLATION_CAPABILITIES__);
  const e = document.querySelector("script[data-translation-capabilities]");
  if (e)
    try {
      const n = e.textContent || "", s = JSON.parse(n);
      return h(s);
    } catch {
    }
  const t = document.body;
  if (t?.dataset?.translationCapabilities)
    try {
      return h(JSON.parse(t.dataset.translationCapabilities));
    } catch {
    }
  return { ...R };
}
function y(e) {
  if (!e)
    return { visible: !1, enabled: !1 };
  const t = e.visible === !0 || e.visible === void 0 && e.enabled, n = e.entry ?? { enabled: e.enabled }, s = n.enabled === !0, a = n.reason || (e.enabled ? void 0 : "module disabled by capability mode"), i = n.reason_code || (e.enabled ? void 0 : "FEATURE_DISABLED"), r = n.permission;
  return t ? !e.enabled || !s ? {
    visible: !0,
    enabled: !1,
    reason: a,
    reasonCode: i,
    permission: r
  } : { visible: !0, enabled: !0 } : {
    visible: !1,
    enabled: !1,
    reason: a,
    reasonCode: i,
    permission: r
  };
}
function $(e) {
  return (e ?? m()).modules.exchange.enabled;
}
function S(e) {
  return (e ?? m()).modules.queue.enabled;
}
function K(e) {
  return $(e) || S(e);
}
function E(e, t, n) {
  const s = t ?? m(), a = U[e];
  if (s.routes[a])
    return s.routes[a];
  const i = (n ?? "").replace(/\/+$/, "");
  switch (e) {
    case "QUEUE":
      return s.modules.queue.enabled ? `${i}/translations/queue` : null;
    case "EXCHANGE_UI":
      return s.modules.exchange.enabled ? `${i}/translations/exchange` : null;
    default:
      return null;
  }
}
function L(e, t) {
  const n = e ?? m(), s = (t ?? "").replace(/\/+$/, ""), a = [], i = y(n.modules.queue), r = E("QUEUE", n, s);
  i.visible && r && a.push({
    id: "translation-queue",
    label: "Translation Queue",
    icon: "iconoir-language",
    href: r,
    module: "queue",
    enabled: i.enabled,
    description: "Manage translation assignments and review workflow",
    disabledReason: i.reason,
    disabledReasonCode: i.reasonCode,
    permission: i.permission
  });
  const l = y(n.modules.exchange), c = E("EXCHANGE_UI", n, s);
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
function O(e, t) {
  const { asListItem: n = !1, className: s = "" } = t ?? {}, a = document.createElement("a");
  a.href = e.enabled ? e.href : "#", a.className = `nav-item translation-operation-link ${s}`.trim(), a.setAttribute("data-entrypoint-id", e.id), a.setAttribute("data-module", e.module), a.setAttribute("data-enabled", e.enabled ? "true" : "false"), e.enabled || (a.setAttribute("aria-disabled", "true"), a.classList.add("opacity-60", "cursor-not-allowed"));
  const i = e.disabledReason?.trim(), r = i ? `${e.description || e.label} (${i})` : e.description || e.label;
  a.setAttribute("aria-label", r), a.setAttribute("title", r);
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
function D(e, t, n, s) {
  const { asListItems: a = !1, headerLabel: i } = s ?? {}, r = typeof e == "string" ? document.querySelector(e) : e;
  if (!r) return;
  const l = L(t, n);
  if (l.length === 0) {
    r.style.display = "none";
    return;
  }
  r.style.display = "", r.innerHTML = "";
  const c = document.createElement("nav");
  if (c.setAttribute("aria-label", i || "Translation operations"), c.setAttribute("role", "navigation"), i) {
    const u = `translation-ops-header-${Date.now()}`, p = document.createElement("h3");
    p.id = u, p.className = "text-xs font-medium text-sidebar-text-muted uppercase tracking-wider px-3 py-2", p.textContent = i, c.appendChild(p), c.setAttribute("aria-labelledby", u);
  }
  const o = a ? document.createElement("ul") : document.createElement("div");
  o.className = "space-y-0.5", a && o.setAttribute("role", "list");
  for (const u of l) {
    const p = O(u, { asListItem: a });
    o.appendChild(p);
  }
  c.appendChild(o), r.appendChild(c);
}
function g(e, t) {
  const n = e.headers.get(t);
  return typeof n == "string" ? n.trim() : "";
}
function M(e, t) {
  const n = g(e, "x-request-id"), s = g(e, "x-correlation-id"), a = g(e, "x-trace-id") || s || t;
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
async function H(e) {
  const t = e.trim();
  if (!t)
    return {
      status: "empty",
      message: "This shell route is ready, but the backing API contract has not been connected yet."
    };
  const n = await w(t, { method: "GET" }), s = M(n);
  if (!n.ok) {
    const i = await P(n);
    return {
      status: n.status === 409 || i.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: i.message,
      requestId: s.requestId,
      traceId: s.traceId,
      statusCode: n.status,
      errorCode: i.textCode
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
function f(e) {
  const t = [];
  return e.requestId && t.push(`<span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Request ${d(e.requestId)}</span>`), e.traceId && t.push(`<span class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Trace ${d(e.traceId)}</span>`), t.length ? `<div class="flex flex-wrap gap-2 mt-4">${t.join("")}</div>` : "";
}
function G(e, t, n) {
  const s = x(e.payload);
  return `
    <div class="space-y-4">
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="text-sm font-medium text-emerald-800">${d(t)}</p>
        <p class="mt-1 text-sm text-emerald-700">${s} contract item${s === 1 ? "" : "s"} available for this shell.</p>
      </div>
      <div class="${v}">
        <p class="text-sm ${b}">${d(n)}</p>
        <details class="mt-4">
          <summary class="cursor-pointer text-sm font-medium ${b}">Inspect payload</summary>
          <pre class="mt-3 overflow-x-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">${d(JSON.stringify(e.payload, null, 2))}</pre>
        </details>
        ${f(e)}
      </div>
    </div>
  `;
}
function X(e) {
  return `
    <div class="space-y-4">
      ${_(
    "Version conflict",
    e.message || "The shell route detected a canonical version conflict."
  )}
      ${f(e)}
    </div>
  `;
}
function B(e, t) {
  return `
    <div class="${v}">
      <p class="text-sm font-semibold ${b}">${d(e)}</p>
      <p class="mt-1 text-sm ${C}">${d(t)}</p>
    </div>
  `;
}
function _(e, t) {
  return `
    <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4">
      <p class="text-sm font-semibold text-rose-800">${d(e)}</p>
      <p class="mt-1 text-sm text-rose-700">${d(t)}</p>
    </div>
  `;
}
function F() {
  return `
    <div class="${k}">
      <p class="text-sm font-medium ${b}">Loading translation shell...</p>
      <p class="mt-1 text-sm ${C}">Waiting for the backing API response.</p>
    </div>
  `;
}
function T(e, t, n = {}) {
  const s = n.title || e.dataset.title || "Translation Shell", a = n.description || e.dataset.description || "Translation shell route";
  switch (t.status) {
    case "ready":
      e.innerHTML = G(t, s, a);
      return;
    case "conflict":
      e.innerHTML = X(t);
      return;
    case "error":
      e.innerHTML = `
        ${_(
        "Translation shell request failed",
        t.message || "The shell route could not load its backing payload."
      )}
        ${f(t)}
      `;
      return;
    case "empty":
      e.innerHTML = `
        ${B(s, t.message || a)}
        ${f(t)}
      `;
      return;
    default:
      e.innerHTML = F();
  }
}
async function W(e) {
  const t = typeof e == "string" ? document.querySelector(e) : e;
  if (!t)
    return null;
  T(t, { status: "loading" });
  const n = await H(t.dataset.endpoint || "");
  return T(t, n), n;
}
class Q {
  constructor(t) {
    this.entrypoints = [], this.config = {
      basePath: t.basePath,
      capabilities: t.capabilities ?? m(),
      container: t.container ?? "[data-translation-operations]",
      onEntrypointClick: t.onEntrypointClick ?? (() => {
      })
    }, this.capabilities = this.config.capabilities, this.entrypoints = L(this.capabilities, this.config.basePath);
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
    return $(this.capabilities);
  }
  /** Check if queue is enabled */
  isQueueEnabled() {
    return S(this.capabilities);
  }
  /** Get route for a specific operation */
  getRoute(t) {
    return E(t, this.capabilities, this.config.basePath);
  }
  /** Initialize and render entrypoints */
  init() {
    if (!this.hasOperations()) return;
    const t = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container;
    t && (D(
      t,
      this.capabilities,
      this.config.basePath,
      { headerLabel: "Translations" }
    ), t.querySelectorAll(".translation-operation-link").forEach((n) => {
      n.addEventListener("click", (s) => {
        const a = n.dataset.entrypointId, i = this.entrypoints.find((r) => r.id === a);
        if (!i || !i.enabled) {
          s.preventDefault();
          return;
        }
        this.config.onEntrypointClick && this.config.onEntrypointClick(i);
      });
    }));
  }
}
function Z(e) {
  if (!document.querySelector("[data-translation-operations]")) return null;
  const n = new Q({
    basePath: e ?? ""
  });
  return n.init(), n;
}
export {
  Q as TranslationOperationsManager,
  L as buildTranslationEntrypoints,
  m as extractTranslationCapabilities,
  H as fetchTranslationShellData,
  E as getTranslationRoute,
  K as hasTranslationOperations,
  Z as initTranslationOperations,
  W as initTranslationSurfaceShell,
  $ as isExchangeEnabled,
  S as isQueueEnabled,
  O as renderEntrypointLink,
  D as renderTranslationEntrypoints,
  T as renderTranslationSurfaceShell
};
//# sourceMappingURL=index.js.map

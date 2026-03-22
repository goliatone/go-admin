import { extractStructuredError as q } from "../toast/error-helpers.js";
import { t as R } from "../chunks/http-client-DiXyH5DW.js";
import { r as h, t as N } from "../chunks/translation-contracts-NuS3GLjo.js";
import { G as b, K as I, W as v, n as w, r as A, t as P } from "../chunks/translation-shared-BSLmw_rJ.js";
var U = {
  QUEUE: "admin.translations.queue",
  EXCHANGE_UI: "admin.translations.exchange",
  EXCHANGE_EXPORT: "admin.api.translations.export",
  EXCHANGE_IMPORT_VALIDATE: "admin.api.translations.import.validate",
  EXCHANGE_IMPORT_APPLY: "admin.api.translations.import.apply"
}, C = `${v} border ${A} ${P} px-4 py-4`, k = `${v} border ${A} ${w} px-4 py-4`;
function p() {
  if (typeof window < "u" && window.__TRANSLATION_CAPABILITIES__) return h(window.__TRANSLATION_CAPABILITIES__);
  const e = document.querySelector("script[data-translation-capabilities]");
  if (e) try {
    const n = e.textContent || "";
    return h(JSON.parse(n));
  } catch {
  }
  const t = document.body;
  if (t?.dataset?.translationCapabilities) try {
    return h(JSON.parse(t.dataset.translationCapabilities));
  } catch {
  }
  return { ...N };
}
function y(e) {
  if (!e) return {
    visible: !1,
    enabled: !1
  };
  const t = e.visible === !0 || e.visible === void 0 && e.enabled, n = e.entry ?? { enabled: e.enabled }, s = n.enabled === !0, a = n.reason || (e.enabled ? void 0 : "module disabled by capability mode"), r = n.reason_code || (e.enabled ? void 0 : "FEATURE_DISABLED"), o = n.permission;
  return t ? !e.enabled || !s ? {
    visible: !0,
    enabled: !1,
    reason: a,
    reasonCode: r,
    permission: o
  } : {
    visible: !0,
    enabled: !0
  } : {
    visible: !1,
    enabled: !1,
    reason: a,
    reasonCode: r,
    permission: o
  };
}
function $(e) {
  return (e ?? p()).modules.exchange.enabled;
}
function S(e) {
  return (e ?? p()).modules.queue.enabled;
}
function K(e) {
  return $(e) || S(e);
}
function E(e, t, n) {
  const s = t ?? p(), a = U[e];
  if (s.routes[a]) return s.routes[a];
  const r = (n ?? "").replace(/\/+$/, "");
  switch (e) {
    case "QUEUE":
      return s.modules.queue.enabled ? `${r}/translations/queue` : null;
    case "EXCHANGE_UI":
      return s.modules.exchange.enabled ? `${r}/translations/exchange` : null;
    default:
      return null;
  }
}
function L(e, t) {
  const n = e ?? p(), s = (t ?? "").replace(/\/+$/, ""), a = [], r = y(n.modules.queue), o = E("QUEUE", n, s);
  r.visible && o && a.push({
    id: "translation-queue",
    label: "Translation Queue",
    icon: "iconoir-language",
    href: o,
    module: "queue",
    enabled: r.enabled,
    description: "Manage translation assignments and review workflow",
    disabledReason: r.reason,
    disabledReasonCode: r.reasonCode,
    permission: r.permission
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
  const r = e.disabledReason?.trim(), o = r ? `${e.description || e.label} (${r})` : e.description || e.label;
  a.setAttribute("aria-label", o), a.setAttribute("title", o);
  const l = document.createElement("i");
  l.className = `${e.icon} flex-shrink-0`, l.style.fontSize = "var(--sidebar-icon-size, 20px)", l.setAttribute("aria-hidden", "true"), a.appendChild(l);
  const c = document.createElement("span");
  if (c.className = "nav-text flex-1", c.textContent = e.label, a.appendChild(c), e.badge) {
    const i = document.createElement("span");
    i.className = `ml-auto px-2 py-0.5 ${e.badgeVariant === "warning" ? "bg-yellow-500/20 text-yellow-400" : e.badgeVariant === "danger" ? "bg-red-500/20 text-red-400" : e.badgeVariant === "success" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"} text-xs font-medium rounded`, i.textContent = e.badge, i.setAttribute("aria-label", `${e.badge} badge`), a.appendChild(i);
  }
  if (e.enabled || a.addEventListener("click", (i) => {
    i.preventDefault(), i.stopPropagation();
  }), n) {
    const i = document.createElement("li");
    return i.appendChild(a), i;
  }
  return a;
}
function D(e, t, n, s) {
  const { asListItems: a = !1, headerLabel: r } = s ?? {}, o = typeof e == "string" ? document.querySelector(e) : e;
  if (!o) return;
  const l = L(t, n);
  if (l.length === 0) {
    o.style.display = "none";
    return;
  }
  o.style.display = "", o.innerHTML = "";
  const c = document.createElement("nav");
  if (c.setAttribute("aria-label", r || "Translation operations"), c.setAttribute("role", "navigation"), r) {
    const m = `translation-ops-header-${Date.now()}`, u = document.createElement("h3");
    u.id = m, u.className = "text-xs font-medium text-sidebar-text-muted uppercase tracking-wider px-3 py-2", u.textContent = r, c.appendChild(u), c.setAttribute("aria-labelledby", m);
  }
  const i = a ? document.createElement("ul") : document.createElement("div");
  i.className = "space-y-0.5", a && i.setAttribute("role", "list");
  for (const m of l) {
    const u = O(m, { asListItem: a });
    i.appendChild(u);
  }
  c.appendChild(i), o.appendChild(c);
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
  if (Array.isArray(e)) return e.length;
  if (!e || typeof e != "object") return 0;
  const t = e;
  for (const n of [
    "items",
    "assignments",
    "results",
    "rows",
    "families"
  ]) if (Array.isArray(t[n])) return t[n].length;
  return t.data && typeof t.data == "object" ? x(t.data) : Object.keys(t).length;
}
async function H(e) {
  const t = e.trim();
  if (!t) return {
    status: "empty",
    message: "This shell route is ready, but the backing API contract has not been connected yet."
  };
  const n = await R(t, { method: "GET" }), s = M(n);
  if (!n.ok) {
    const r = await q(n);
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
      <div class="${C}">
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
      ${_("Version conflict", e.message || "The shell route detected a canonical version conflict.")}
      ${f(e)}
    </div>
  `;
}
function B(e, t) {
  return `
    <div class="${C}">
      <p class="text-sm font-semibold ${b}">${d(e)}</p>
      <p class="mt-1 text-sm ${I}">${d(t)}</p>
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
      <p class="mt-1 text-sm ${I}">Waiting for the backing API response.</p>
    </div>
  `;
}
function d(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
        ${_("Translation shell request failed", t.message || "The shell route could not load its backing payload.")}
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
async function Y(e) {
  const t = typeof e == "string" ? document.querySelector(e) : e;
  if (!t) return null;
  T(t, { status: "loading" });
  const n = await H(t.dataset.endpoint || "");
  return T(t, n), n;
}
var Q = class {
  constructor(e) {
    this.entrypoints = [], this.config = {
      basePath: e.basePath,
      capabilities: e.capabilities ?? p(),
      container: e.container ?? "[data-translation-operations]",
      onEntrypointClick: e.onEntrypointClick ?? (() => {
      })
    }, this.capabilities = this.config.capabilities, this.entrypoints = L(this.capabilities, this.config.basePath);
  }
  getCapabilities() {
    return this.capabilities;
  }
  getEntrypoints() {
    return this.entrypoints;
  }
  hasOperations() {
    return this.entrypoints.length > 0;
  }
  isExchangeEnabled() {
    return $(this.capabilities);
  }
  isQueueEnabled() {
    return S(this.capabilities);
  }
  getRoute(e) {
    return E(e, this.capabilities, this.config.basePath);
  }
  init() {
    if (!this.hasOperations()) return;
    const e = typeof this.config.container == "string" ? document.querySelector(this.config.container) : this.config.container;
    e && (D(e, this.capabilities, this.config.basePath, { headerLabel: "Translations" }), e.querySelectorAll(".translation-operation-link").forEach((t) => {
      t.addEventListener("click", (n) => {
        const s = t.dataset.entrypointId, a = this.entrypoints.find((r) => r.id === s);
        if (!a || !a.enabled) {
          n.preventDefault();
          return;
        }
        this.config.onEntrypointClick && this.config.onEntrypointClick(a);
      });
    }));
  }
};
function W(e) {
  if (!document.querySelector("[data-translation-operations]")) return null;
  const t = new Q({ basePath: e ?? "" });
  return t.init(), t;
}
export {
  Q as TranslationOperationsManager,
  L as buildTranslationEntrypoints,
  p as extractTranslationCapabilities,
  H as fetchTranslationShellData,
  E as getTranslationRoute,
  K as hasTranslationOperations,
  W as initTranslationOperations,
  Y as initTranslationSurfaceShell,
  $ as isExchangeEnabled,
  S as isQueueEnabled,
  O as renderEntrypointLink,
  D as renderTranslationEntrypoints,
  T as renderTranslationSurfaceShell
};

//# sourceMappingURL=index.js.map
import { escapeAttribute as d, escapeHTML as i } from "../shared/html.js";
import { readHTTPError as Y } from "../shared/transport/http-client.js";
import { extractStructuredError as Q } from "../toast/error-helpers.js";
import { buildEndpointURL as W } from "../shared/query-state/url-state.js";
import { StatefulController as J } from "../shared/stateful-controller.js";
import { asNumberish as m, asRecord as h, asString as n } from "../shared/coercion.js";
import { O as Z, S as ee, T as te, _ as w, d as x, g as I, h as B, i as ae, m as O, p as q, s as z, tt as N, v as F, w as se } from "../chunks/translation-shared-CQJ98SgC.js";
import { normalizeNumberRecord as R, normalizeStringRecord as v } from "../shared/record-normalization.js";
import { c as $, s as re } from "../chunks/ui-states-1McZ5upU.js";
var y = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationDashboardRequestError", this.status = e.status, this.code = e.code ?? null, this.requestId = e.requestId, this.traceId = e.traceId, this.metadata = e.metadata ?? null;
  }
};
function p(e, t) {
  if (!Array.isArray(e)) return [];
  const a = [];
  for (const s of e) {
    const r = t(s);
    r && a.push(r);
  }
  return a;
}
function A(e) {
  const t = n(e).toLowerCase();
  switch (t) {
    case "warning":
    case "critical":
    case "degraded":
      return t;
    default:
      return "ok";
  }
}
function H(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  return {
    href: n(t.href),
    group: n(t.group),
    route: n(t.route),
    resolverKey: n(t.resolver_key),
    params: v(t.params, { omitEmptyValues: !0 }),
    query: v(t.query, { omitEmptyValues: !0 }),
    key: n(t.key),
    label: n(t.label),
    description: n(t.description),
    relation: n(t.relation),
    tableId: n(t.table_id),
    entityType: n(t.entity_type),
    entityId: n(t.entity_id)
  };
}
function ne(e) {
  const t = h(e), a = n(t.key);
  return a ? {
    key: a,
    label: n(t.label),
    description: n(t.description),
    relation: n(t.relation),
    group: n(t.group),
    route: n(t.route),
    resolverKey: n(t.resolver_key),
    entityType: n(t.entity_type)
  } : null;
}
function oe(e) {
  const t = h(e), a = n(t.id);
  if (!a) return null;
  const s = h(t.alert);
  return {
    id: a,
    label: n(t.label),
    description: n(t.description),
    count: m(t.count),
    breakdown: R(t.breakdown),
    alert: {
      state: A(s.state),
      message: n(s.message)
    },
    drilldown: H(t.drilldown),
    metricKey: n(t.metric_key),
    runbookId: n(t.runbook_id)
  };
}
function ie(e) {
  const t = h(e), a = n(t.code);
  return a ? {
    code: a,
    label: n(t.label) || b(a),
    count: m(t.count),
    affectedLocales: p(t.affected_locales, (s) => n(s) || null)
  } : null;
}
function le(e) {
  const t = h(e), a = n(t.state);
  if (!(!a || a !== "available" && a !== "unavailable" && a !== "degraded"))
    return {
      state: a,
      message: n(t.message)
    };
}
function de(e) {
  const t = h(e);
  if (Object.keys(t).length === 0) return null;
  const a = {};
  for (const [c, u] of Object.entries(h(t.links))) {
    const g = H(u);
    g && (a[c] = g);
  }
  const s = p(t.blocker_codes, (c) => n(c) || null), r = {};
  for (const [c, u] of Object.entries(h(t.blocker_labels))) {
    const g = n(u);
    g && (r[c] = g);
  }
  const o = p(t.reason_breakdown, ie), l = p(t.affected_locales, (c) => n(c) || null), f = le(t.reason_data);
  return {
    ...t,
    links: a,
    blockerCodes: s.length > 0 ? s : void 0,
    blockerLabels: Object.keys(r).length > 0 ? r : void 0,
    reasonBreakdown: o.length > 0 ? o : void 0,
    affectedLocales: l.length > 0 ? l : void 0,
    reasonData: f
  };
}
function ce(e, t = "") {
  const a = h(e), s = p(a.rows, de);
  return {
    id: n(a.id) || t,
    label: n(a.label) || t,
    total: m(a.total, s.length),
    limit: m(a.limit, s.length),
    rows: s
  };
}
function P(e) {
  const t = h(e), a = n(t.id);
  return a ? {
    id: a,
    title: n(t.title),
    description: n(t.description),
    route: n(t.route),
    resolverKey: n(t.resolver_key),
    href: n(t.href),
    query: v(t.query, { omitEmptyValues: !0 })
  } : null;
}
function U(e) {
  const t = h(e), a = n(t.id);
  if (!a) return null;
  const s = {};
  for (const [r, o] of Object.entries(h(t.drilldown_links))) {
    const l = ne(o);
    l && (s[r] = l);
  }
  return {
    id: a,
    description: n(t.description),
    scopeFields: p(t.scope_fields, (r) => n(r) || null),
    stableSortKeys: p(t.stable_sort_keys, (r) => n(r) || null),
    indexHints: p(t.index_hints, (r) => n(r) || null),
    supportedFilters: p(t.supported_filters, (r) => n(r) || null),
    defaultLimit: m(t.default_limit),
    drilldownRoute: n(t.drilldown_route),
    queueRoute: n(t.queue_route),
    apiRoute: n(t.api_route),
    resolverKeys: p(t.resolver_keys, (r) => n(r) || null),
    drilldownLinks: s
  };
}
function ue(e) {
  const t = h(e), a = {};
  for (const [s, r] of Object.entries(h(t.query_models))) {
    const o = U(r);
    o && (a[s] = o);
  }
  return {
    cardIds: p(t.card_ids, (s) => n(s) || null),
    tableIds: p(t.table_ids, (s) => n(s) || null),
    alertStates: p(t.alert_states, (s) => A(s)),
    defaultLimits: R(t.default_limits),
    queryModels: a,
    runbooks: p(t.runbooks, P)
  };
}
function he(e) {
  const t = h(e), a = n(t.code);
  return a ? {
    state: A(t.state),
    code: a,
    message: n(t.message),
    cardId: n(t.card_id),
    runbookId: n(t.runbook_id)
  } : null;
}
function pe(e, t) {
  if (t.cardIds.length === 0) return e;
  const a = /* @__PURE__ */ new Map();
  return t.cardIds.forEach((s, r) => a.set(s, r)), [...e].sort((s, r) => (a.get(s.id) ?? Number.MAX_SAFE_INTEGER) - (a.get(r.id) ?? Number.MAX_SAFE_INTEGER));
}
function ge(e) {
  const t = h(e), a = h(t.data), s = h(t.meta), r = ue(s.contracts), o = pe(p(a.cards, oe), r), l = {};
  for (const [c, u] of Object.entries(h(a.tables))) l[c] = ce(u, c);
  const f = { ...r.queryModels };
  for (const [c, u] of Object.entries(h(s.query_models))) {
    const g = U(u);
    g && (f[c] = g);
  }
  return {
    data: {
      cards: o,
      tables: l,
      alerts: p(a.alerts, he),
      runbooks: p(a.runbooks, P),
      summary: R(a.summary)
    },
    meta: {
      channel: n(s.channel),
      generatedAt: n(s.generated_at),
      refreshIntervalMs: m(s.refresh_interval_ms, 3e4),
      latencyTargetMs: m(s.latency_target_ms, 0),
      degraded: s.degraded === !0,
      degradedReasons: p(s.degraded_reasons, (c) => {
        const u = h(c), g = n(u.component), S = n(u.message);
        return !g && !S ? null : {
          component: g,
          message: S
        };
      }),
      familyReport: h(s.family_report),
      scope: v(s.scope, { omitEmptyValues: !0 }),
      metrics: p(s.metrics, (c) => {
        const u = h(c), g = n(u.key);
        return g ? {
          key: g,
          unit: n(u.unit),
          sloP95Ms: u.slo_p95_ms === void 0 ? null : m(u.slo_p95_ms)
        } : null;
      }),
      queryModels: f,
      contracts: {
        ...r,
        queryModels: f
      }
    }
  };
}
function fe(e, t = {}) {
  const a = new URLSearchParams(), s = [
    ["channel", n(t.channel)],
    ["tenant_id", n(t.tenantId)],
    ["org_id", n(t.orgId)],
    ["overdue_limit", t.overdueLimit != null ? String(t.overdueLimit) : ""],
    ["blocked_limit", t.blockedLimit != null ? String(t.blockedLimit) : ""]
  ];
  for (const [r, o] of s) o && a.set(r, o);
  return W(e, a, { preserveAbsolute: !0 });
}
function me(e) {
  const t = n(e.endpoint), a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  return { async fetchDashboard(s = {}) {
    if (!t) throw new y({
      message: "Translation dashboard endpoint is not configured",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const r = fe(t, s);
    if (!a) throw new y({
      message: "Fetch implementation is not available",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const o = await a(r, { headers: { Accept: "application/json" } });
    if (!o.ok) {
      const l = await Q(o.clone());
      throw new y({
        message: l.message || await Y(o, "Failed to load translation dashboard"),
        status: o.status,
        code: l.textCode,
        requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
        traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
        metadata: l.metadata
      });
    }
    return ge(await o.json());
  } };
}
function be(e) {
  const t = Math.max(0, e.intervalMs ?? 3e4);
  let a = null, s = null;
  const r = async () => s || (s = (async () => {
    try {
      const o = await e.load();
      return e.onData?.(o), o;
    } catch (o) {
      throw e.onError?.(o), o;
    } finally {
      s = null;
    }
  })(), s);
  return {
    async start() {
      await r(), t > 0 && a == null && (a = globalThis.setInterval(() => {
        r().catch(() => {
        });
      }, t));
    },
    stop() {
      a != null && (globalThis.clearInterval(a), a = null);
    },
    refresh: r,
    isRunning() {
      return a != null;
    }
  };
}
function b(e) {
  return e.replace(/[_-]+/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
var T = {
  my_tasks: {
    label: "My Tasks",
    shortLabel: "Tasks"
  },
  needs_review: {
    label: "Needs Review",
    shortLabel: "Review"
  },
  overdue_tasks: {
    label: "Overdue Tasks",
    shortLabel: "Overdue"
  },
  blocked_families: {
    label: "Blocked Families",
    shortLabel: "Blocked"
  },
  missing_required_locales: {
    label: "Missing Required Locales",
    shortLabel: "Missing"
  }
}, ye = {
  top_overdue_assignments: "Top Overdue Assignments",
  blocked_families: "Blocked Families"
}, xe = {
  top_overdue_assignments: {
    label: "Top Overdue Assignments",
    shortLabel: "Overdue",
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
  },
  blocked_families: {
    label: "Blocked Families",
    shortLabel: "Blocked",
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>'
  }
}, k = {
  "translations.dashboard.overdue_triage": {
    label: "Overdue Assignment Triage",
    shortLabel: "Overdue Triage",
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
  },
  "translations.dashboard.review_backlog": {
    label: "Reviewer Backlog Triage",
    shortLabel: "Review Backlog",
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>'
  },
  "translations.dashboard.publish_blockers": {
    label: "Publish Blocker Remediation",
    shortLabel: "Fix Blockers",
    icon: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
  }
}, ve = {
  "translations.dashboard.my_tasks": "Actor Task Count",
  "translations.dashboard.needs_review": "Review Queue Depth",
  "translations.dashboard.overdue_tasks": "Overdue Assignment Count",
  "translations.dashboard.blocked_families": "Blocked Family Count",
  "translations.dashboard.missing_required_locales": "Missing Locale Count"
};
function ke(e, t) {
  return T[e]?.label || t || b(e);
}
function $e(e, t) {
  return T[e]?.shortLabel || T[e]?.label || t || b(e);
}
function _(e, t) {
  return ye[e] || t || b(e);
}
function L(e, t) {
  return k[e]?.label || t || b(e);
}
function C(e, t) {
  return k[e]?.shortLabel || k[e]?.label || t || b(e);
}
function E(e) {
  return k[e]?.icon || "";
}
var M = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors", we = "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors";
function K(e) {
  const t = e.trim();
  if (!t || t.length < 12) return `<span class="font-mono text-xs text-gray-500">${i(t)}</span>`;
  const a = `${t.slice(0, 4)}...${t.slice(-4)}`;
  return `
    <button type="button"
            class="inline-flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-gray-900 group cursor-pointer bg-transparent border-none p-0"
            data-copy-uuid="${d(t)}"
            title="Click to copy: ${d(t)}">
      <span>${i(a)}</span>
      <svg class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>
  `;
}
function Te(e) {
  return ve[e] || b(e);
}
function _e(e) {
  if (e < 1e3) return `${e}ms`;
  const t = Math.floor(e / 1e3);
  return t < 60 ? `${t}s` : `${Math.floor(t / 60)}m`;
}
function Le(e) {
  return e <= 0 ? "N/A" : e < 1e3 ? `${e}ms` : `${(e / 1e3).toFixed(1)}s`;
}
function V(e, t, a = "") {
  const s = i(e);
  return t?.href ? `<a class="${d(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${d(t.href)}">${s}</a>` : `<span class="${d(a)}">${s}</span>`;
}
function Ce(e) {
  return [...e].sort((t, a) => {
    const s = (r) => r === "primary" ? 0 : 1;
    return s(t.relation) - s(a.relation);
  });
}
function G(e, t = "No drill-downs") {
  return e.length === 0 ? `<span class="text-gray-400">${i(t)}</span>` : Ce(e).map((a) => {
    const s = a.label || "Open";
    return a.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${d(a.key || s.toLowerCase())}" href="${d(a.href)}">${i(s)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${i(s)}</span>`;
  }).join("");
}
function Ee(e) {
  return e.drilldown?.href ? `
    <a
      href="${d(e.drilldown.href)}"
      class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
      data-dashboard-drilldown="${d(e.id)}"
      title="${d(e.drilldown.description || e.drilldown.label || "Open drilldown")}"
    >
      <span>${i(e.drilldown.label || "Open")}</span>
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </a>
  ` : '<span class="text-xs text-gray-400">No drilldown available</span>';
}
function Re(e, t) {
  if (!e.runbookId) return "";
  const a = t.find((l) => l.id === e.runbookId);
  if (!a?.href) return "";
  const s = C(e.runbookId, a.title), r = E(e.runbookId), o = L(e.runbookId, a.title);
  return `
    <a
      href="${d(a.href)}"
      class="${we}"
      data-dashboard-card-runbook="${d(e.id)}"
      title="${d(a.description || o)}"
    >
      ${r || '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'}
      <span>${i(s)}</span>
    </a>
  `;
}
function Ae(e, t = []) {
  const a = Object.entries(e.breakdown).map(([f, c]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${i(b(f))}</span>
        <span class="font-semibold text-gray-900">${i(String(c))}</span>
      </li>
    `).join(""), s = $e(e.id, e.label), r = ke(e.id, e.label), o = Te(e.metricKey), l = Re(e, t);
  return `
    <article class="${x} p-4 shadow-sm flex flex-col" data-dashboard-card="${d(e.id)}">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 truncate" title="${d(r)}">${i(s)}</p>
      </div>
      <div class="mt-2">
        <p class="text-3xl font-semibold tracking-tight text-gray-900">${i(String(e.count))}</p>
        <span class="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${d(Fe(e.alert.state))}">
          ${i(e.alert.message || e.alert.state)}
        </span>
      </div>
      <p class="mt-3 text-sm leading-6 text-gray-600">${i(e.description)}</p>
      ${a ? `<ul class="mt-4 space-y-2">${a}</ul>` : ""}
      <div class="mt-auto pt-4 flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          ${Ee(e)}
          <span class="text-xs text-gray-400" title="${d(e.metricKey)}">${i(o)}</span>
        </div>
        ${l ? `<div class="border-t border-gray-100 pt-3">${l}</div>` : ""}
      </div>
    </article>
  `;
}
function Se(e) {
  const t = {
    critical: 4,
    warning: 3,
    degraded: 2,
    ok: 1
  };
  return e.reduce((a, s) => t[s.state] > t[a] ? s.state : a, "ok");
}
function Me(e) {
  return `
    <div class="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/50"
         data-alert-code="${d(e.code)}"
         role="${e.state === "critical" ? "alert" : "status"}">
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold uppercase tracking-[0.16em]">${i(e.code)}</p>
        <p class="mt-1 text-sm">${i(e.message)}</p>
      </div>
      <button type="button"
              class="flex-shrink-0 p-1 rounded hover:bg-gray-200/50 transition-colors"
              data-dismiss-alert="${d(e.code)}"
              aria-label="Dismiss ${i(e.code)} alert">
        <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
}
function je(e, t, a) {
  const s = e.filter((c) => !a.has(c.code));
  if (s.length === 0) return "";
  const r = Se(s), o = s.reduce((c, u) => (c[u.state] = (c[u.state] || 0) + 1, c), {}), l = Object.entries(o).filter(([, c]) => c > 0).map(([c, u]) => `${u} ${c}`).join(", "), f = t ? "rotate-180" : "";
  return `
    <section class="rounded-xl border ${He(r)} shadow-sm overflow-hidden"
             data-dashboard-alerts-section="true"
             role="region"
             aria-label="Dashboard alerts">
      <button type="button"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              data-alerts-toggle="true"
              aria-expanded="${t}">
        <div class="flex items-center gap-3">
          <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="text-sm font-semibold">${i(l)}</span>
        </div>
        <svg class="h-5 w-5 flex-shrink-0 transition-transform ${f}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div class="${t ? "" : "hidden"}" data-alerts-content="true">
        <div class="border-t border-current/20 px-4 py-3 space-y-2">
          ${s.map((c) => Me(c)).join("")}
        </div>
      </div>
    </section>
  `;
}
function De(e) {
  return `
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <caption class="sr-only">Top overdue assignments with assignment and queue drill-down actions.</caption>
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-[0.2em] text-gray-500">
        <tr>
          <th scope="col" class="px-4 py-3">Assignment</th>
          <th scope="col" class="px-4 py-3">Locale</th>
          <th scope="col" class="px-4 py-3">Priority</th>
          <th scope="col" class="px-4 py-3">Status</th>
          <th scope="col" class="px-4 py-3 text-right">Overdue</th>
          <th scope="col" class="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        ${e.rows.map((t) => `
          <tr>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${V(n(t.source_title) || n(t.assignment_id), t.links.assignment)}</div>
              <div class="mt-1">${K(n(t.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(`${n(t.source_locale).toUpperCase()} -> ${n(t.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${i(b(n(t.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${i(b(n(t.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${i(`${m(t.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${G(Object.values(t.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function Ie(e) {
  const t = e.blockerCodes || [], a = e.blockerLabels || {};
  return t.length === 0 ? "" : t.map((s) => {
    const r = a[s] || b(s);
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${s === "missing_locale" ? "bg-amber-100 text-amber-800" : s === "pending_review" ? "bg-sky-100 text-sky-800" : s === "outdated_source" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-700"}" data-blocker-code="${d(s)}">${i(r)}</span>`;
  }).join("");
}
function Be(e) {
  const t = e.affectedLocales || [];
  if (t.length === 0) return "";
  const a = 3, s = t.slice(0, a), r = t.length - a;
  return `<div class="flex flex-wrap items-center gap-1">${s.map((o) => `<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">${i(o.toUpperCase())}</span>`).join("")}${r > 0 ? `<span class="inline-flex items-center text-xs text-gray-500">+${r}</span>` : ""}</div>`;
}
function Oe(e) {
  const t = e.reasonData;
  if (!t || t.state === "available") return "";
  const a = t.state === "degraded", s = a ? "text-amber-500" : "text-gray-400", r = a ? `<svg class="h-3.5 w-3.5 ${s}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>` : `<svg class="h-3.5 w-3.5 ${s}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  return `
    <span class="inline-flex items-center gap-1 text-xs text-gray-500" title="${d(t.message || "Reason data is " + t.state)}">
      ${r}
      <span class="sr-only">${i(t.message || "Reason data " + t.state)}</span>
    </span>
  `;
}
function qe(e) {
  return `
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <caption class="sr-only">Blocked families with family detail, blocker codes, affected locales, and drill-down actions.</caption>
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-[0.2em] text-gray-500">
        <tr>
          <th scope="col" class="px-4 py-3">Family</th>
          <th scope="col" class="px-4 py-3">Blockers</th>
          <th scope="col" class="px-4 py-3">Affected</th>
          <th scope="col" class="px-4 py-3 text-right">Missing</th>
          <th scope="col" class="px-4 py-3 text-right">Review</th>
          <th scope="col" class="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        ${e.rows.map((t) => `
          <tr data-family-row="${d(n(t.family_id))}">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${V(n(t.content_type) || "Family", t.links.family)}</div>
              <div class="mt-1 flex items-center gap-2">
                ${K(n(t.family_id))}
                ${Oe(t)}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">${Ie(t)}</div>
            </td>
            <td class="px-4 py-3">
              ${Be(t)}
            </td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${i(String(m(t.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${i(String(m(t.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${G(Object.values(t.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function j(e, t = [], a = {}) {
  const s = e.id === "top_overdue_assignments" ? De(e) : qe(e), r = _(e.id, e.label), o = {
    top_overdue_assignments: "translations.dashboard.overdue_triage",
    blocked_families: "translations.dashboard.publish_blockers"
  }[e.id], l = o ? t.find((f) => f.id === o) : void 0;
  return a.embedded ? `
      <div data-dashboard-table="${d(e.id)}">
        <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-white">
          <div>
            <p class="text-xs text-gray-500">Showing ${i(String(e.rows.length))} of ${i(String(e.total))}</p>
          </div>
          ${l?.href ? `
            <a
              href="${d(l.href)}"
              class="${M}"
              data-dashboard-table-runbook="${d(e.id)}"
              title="${d(l.description || L(o || "", l.title))}"
            >
              ${E(o || "")}
              <span>${i(C(o || "", l.title))}</span>
            </a>
          ` : ""}
        </header>
        <div class="overflow-x-auto">${s}</div>
      </div>
    ` : `
    <section class="overflow-hidden ${x} shadow-sm" data-dashboard-table="${d(e.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${i(r)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing ${i(String(e.rows.length))} of ${i(String(e.total))}</p>
        </div>
        ${l?.href ? `
          <a
            href="${d(l.href)}"
            class="${M}"
            data-dashboard-table-runbook="${d(e.id)}"
            title="${d(l.description || L(o || "", l.title))}"
          >
            ${E(o || "")}
            <span>${i(C(o || "", l.title))}</span>
          </a>
        ` : ""}
      </header>
      <div class="overflow-x-auto">${s}</div>
    </section>
  `;
}
function ze(e, t, a) {
  const s = Object.keys(e);
  return s.length === 0 ? "" : s.length === 1 ? `<section class="space-y-4">${j(e[s[0]], t)}</section>` : `
    <section class="${x} shadow-sm overflow-hidden" data-dashboard-tables="true">
      <nav class="flex border-b border-gray-200 bg-gray-50 px-4" role="tablist" aria-label="Data tables">
        ${s.map((r) => {
    const o = xe[r] || {
      label: _(r, r),
      shortLabel: _(r, r),
      icon: ""
    }, l = r === a;
    return `
        <button type="button"
                class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${l ? "text-blue-600 border-blue-600" : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"}"
                data-table-tab="${d(r)}"
                role="tab"
                aria-selected="${l}"
                aria-controls="table-panel-${d(r)}">
          ${o.icon}
          <span>${i(o.shortLabel)}</span>
          <span class="ml-1 px-2 py-0.5 text-xs rounded-full ${l ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}">
            ${e[r]?.total || 0}
          </span>
        </button>
      `;
  }).join("")}
      </nav>
      <div class="p-0">
        ${s.map((r) => {
    const o = r === a;
    return `
        <div id="table-panel-${d(r)}"
             role="tabpanel"
             ${o ? "" : "hidden"}
             data-table-panel="${d(r)}">
          ${j(e[r], t, { embedded: !0 })}
        </div>
      `;
  }).join("")}
      </div>
    </section>
  `;
}
function Ne(e) {
  return e.length === 0 ? "" : `
    <section class="${x} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${e.map((t) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${t.href ? `<a class="hover:underline" href="${d(t.href)}">${i(t.title)}</a>` : i(t.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${i(t.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function X(e) {
  switch (e) {
    case "critical":
      return "error";
    case "warning":
      return "warning";
    case "degraded":
      return "neutral";
    default:
      return "success";
  }
}
function Fe(e) {
  return N(X(e));
}
function He(e) {
  return `border ${N(X(e))}`;
}
function Pe(e, t = !1, a = !1) {
  const s = e?.meta.generatedAt ? new Date(e.meta.generatedAt).toLocaleString() : "Unavailable", r = e ? Object.entries(e.meta.scope).filter(([, u]) => u).map(([u, g]) => ({
    key: b(u),
    value: String(g)
  })) : [], o = e ? _e(e.meta.refreshIntervalMs) : "N/A", l = e ? Le(e.meta.latencyTargetMs) : "N/A", f = e?.meta.channel || "default", c = a ? "rotate-180" : "";
  return `
    <section class="${x} shadow-sm overflow-hidden" data-dashboard-toolbar="true">
      <div class="px-5 py-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="${se}">Manager Monitoring</p>
            <h2 class="${te} text-xl mt-2">Queue health and publish blockers</h2>
            <p class="${ee} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
              ${i(t ? "Refreshing dashboard…" : `Last updated ${s}`)}
            </span>
            <button type="button" class="${z}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${t ? "disabled" : ""}>
              ${i(t ? "Refreshing…" : "Refresh dashboard")}
            </button>
          </div>
        </div>
      </div>
      ${e ? `
        <div class="border-t border-gray-200">
          <button type="button"
                  class="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset transition-colors"
                  data-meta-toggle="true"
                  aria-expanded="${a}">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span class="text-sm font-medium text-gray-700">Technical Details</span>
            </div>
            <svg class="h-4 w-4 text-gray-400 transition-transform ${c}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="${a ? "" : "hidden"}" data-meta-content="true">
            <dl class="border-t border-gray-200 px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 bg-gray-50">
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Channel</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${i(f)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Refresh</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${i(o)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Latency</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${i(l)}</dd>
              </div>
              ${r.map(({ key: u, value: g }) => `
                <div>
                  <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">${i(u)}</dt>
                  <dd class="mt-1 text-xs font-medium text-gray-900 font-mono">${i(g)}</dd>
                </div>
              `).join("")}
            </dl>
          </div>
        </div>
      ` : ""}
    </section>
  `;
}
function Ue(e) {
  const t = e.data.runbooks[0], a = t?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${d(t.href)}">${i(t.title || "Open runbook")}</a>` : "";
  return $({
    tag: "section",
    containerClass: `${q} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No active pressure",
    titleClass: B,
    heading: "This scope is clear right now.",
    headingTag: "h3",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.",
    messageClass: `${O} mt-3 max-w-2xl leading-6`,
    actionsHtml: `
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${z}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${a}
      </div>
    `,
    attributes: { "data-dashboard-empty": "true" },
    ariaLive: "polite"
  });
}
function Ke(e) {
  const t = e instanceof y ? e.requestId : void 0, a = e instanceof y ? e.traceId : void 0, s = [t ? `Request ${t}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return $({
    tag: "section",
    containerClass: `${I} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Latest refresh failed",
    titleClass: F,
    message: e instanceof Error ? e.message : "Failed to load translation dashboard",
    messageClass: `${w} mt-2`,
    metadata: s,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    role: "alert",
    attributes: { "data-dashboard-inline-error": "true" }
  });
}
function Ve(e) {
  const t = e instanceof Error ? e.message : "Failed to load translation dashboard", a = e instanceof y ? e.requestId : void 0, s = e instanceof y ? e.traceId : void 0, r = [a ? `Request ${a}` : "", s ? `Trace ${s}` : ""].filter(Boolean).join(" • ");
  return $({
    tag: "section",
    containerClass: `${I} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Translation dashboard unavailable",
    titleClass: F,
    heading: "Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.",
    headingTag: "p",
    headingClass: `${w} mt-2`,
    message: t,
    messageClass: `${w} mt-2`,
    metadata: r,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" class="${ae}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: "alert",
    attributes: { "data-dashboard-error": "true" }
  });
}
function Ge() {
  return $({
    tag: "section",
    containerClass: `${q} p-5`,
    bodyClass: "",
    contentClass: "",
    title: "Dashboard contract route is not wired.",
    titleClass: B,
    message: "Set a dashboard aggregate endpoint before initializing the dashboard client.",
    messageClass: `${O} mt-2`,
    attributes: { "data-dashboard-empty": "true" }
  });
}
function D() {
  return re({
    tag: "section",
    text: "Loading translation dashboard aggregates...",
    showSpinner: !1,
    containerClass: `${Z} p-5`,
    attributes: { "data-dashboard-loading": "true" },
    ariaLive: "polite"
  });
}
var Xe = class extends J {
  constructor(e) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.metaExpanded = !1, this.alertsExpanded = !1, this.dismissedAlerts = /* @__PURE__ */ new Set(), this.activeTableTab = "top_overdue_assignments", this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...e
    }, this.client = me(e);
  }
  mount(e) {
    if (this.container = e, !n(this.config.endpoint)) {
      this.state = "error", e.innerHTML = Ge();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, e.innerHTML = D(), this.refreshController = be({
      intervalMs: this.config.refreshInterval,
      load: () => this.client.fetchDashboard(),
      onData: (t) => {
        this.payload = t, this.state = "ready", this.refreshing = !1, this.lastError = null, this.render();
      },
      onError: (t) => {
        if (this.refreshing = !1, this.lastError = t, this.payload) {
          this.state = "ready", this.render();
          return;
        }
        this.state = "error", this.container && (this.container.innerHTML = Ve(t), this.bindActions());
      }
    }), this.refreshController.start().catch(() => {
    });
  }
  unmount() {
    this.refreshController?.stop(), this.refreshController = null, this.container = null;
  }
  getData() {
    return this.payload;
  }
  async refresh() {
    if (this.lastError = null, this.refreshing = !0, this.payload ? this.render() : this.container && (this.state = "loading", this.container.innerHTML = D()), !this.refreshController) {
      const e = await this.client.fetchDashboard();
      return this.payload = e, this.state = "ready", this.refreshing = !1, this.render(), e;
    }
    try {
      return await this.refreshController.refresh();
    } finally {
      this.refreshing = !1;
    }
  }
  render() {
    if (!this.container || !this.payload) return;
    const e = this.payload, t = e.data.runbooks, a = e.data.cards.map((l) => Ae(l, t)).join(""), s = Object.values(e.data.summary).every((l) => l === 0) && Object.values(e.data.tables).every((l) => l.rows.length === 0), r = e.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${i(e.meta.degradedReasons.map((l) => `${l.component}: ${l.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", o = this.lastError ? Ke(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${Pe(e, this.refreshing, this.metaExpanded)}
        ${o}
        ${r}
        ${je(e.data.alerts, this.alertsExpanded, this.dismissedAlerts)}
        ${s ? Ue(e) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${a}</section>
            ${ze(e.data.tables, t, this.activeTableTab)}
          `}
        ${Ne(e.data.runbooks)}
      </div>
    `, this.bindActions();
  }
  bindActions() {
    if (!this.container || typeof this.container.querySelectorAll != "function") return;
    this.container.querySelectorAll("[data-dashboard-refresh-button]").forEach((a) => {
      a.addEventListener("click", () => {
        this.refresh().catch(() => {
        });
      });
    });
    const e = this.container.querySelector("[data-meta-toggle]");
    e && e.addEventListener("click", () => {
      this.metaExpanded = !this.metaExpanded, this.render();
    });
    const t = this.container.querySelector("[data-alerts-toggle]");
    t && t.addEventListener("click", () => {
      this.alertsExpanded = !this.alertsExpanded, this.render();
    }), this.container.querySelectorAll("[data-dismiss-alert]").forEach((a) => {
      a.addEventListener("click", (s) => {
        s.stopPropagation();
        const r = a.dataset.dismissAlert;
        r && (this.dismissedAlerts.add(r), this.render());
      });
    }), this.container.querySelectorAll("[data-table-tab]").forEach((a) => {
      a.addEventListener("click", () => {
        const s = a.dataset.tableTab;
        s && s !== this.activeTableTab && (this.activeTableTab = s, this.render());
      });
    }), this.container.querySelectorAll("[data-copy-uuid]").forEach((a) => {
      a.addEventListener("click", async (s) => {
        s.preventDefault(), s.stopPropagation();
        const r = a.dataset.copyUuid;
        if (r)
          try {
            await navigator.clipboard.writeText(r);
            const o = a.innerHTML;
            a.innerHTML = `
            <span class="text-green-600">Copied!</span>
            <svg class="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          `, setTimeout(() => {
              a.innerHTML = o;
            }, 1500);
          } catch {
            console.warn("Failed to copy UUID");
          }
      });
    });
  }
};
function rt(e, t = {}) {
  if (!e) return null;
  const a = new Xe({
    endpoint: t.endpoint ?? e.dataset.endpoint ?? "",
    queueEndpoint: t.queueEndpoint ?? e.dataset.queueEndpoint ?? "",
    familiesEndpoint: t.familiesEndpoint ?? e.dataset.familiesEndpoint ?? "",
    refreshInterval: t.refreshInterval ?? m(e.dataset.refreshInterval, 3e4),
    title: t.title ?? e.dataset.title ?? "Translation Dashboard",
    fetch: t.fetch
  });
  return a.mount(e), a;
}
export {
  Xe as TranslationDashboardPage,
  y as TranslationDashboardRequestError,
  fe as buildTranslationDashboardURL,
  me as createTranslationDashboardClient,
  be as createTranslationDashboardRefreshController,
  rt as initTranslationDashboardPage,
  oe as normalizeTranslationDashboardCard,
  H as normalizeTranslationDashboardLink,
  U as normalizeTranslationDashboardQueryModel,
  ge as normalizeTranslationDashboardResponse,
  P as normalizeTranslationDashboardRunbook,
  ce as normalizeTranslationDashboardTable,
  de as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
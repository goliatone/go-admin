import { escapeAttribute as d, escapeHTML as l } from "../shared/html.js";
import { readHTTPError as Q } from "../shared/transport/http-client.js";
import { extractStructuredError as W } from "../toast/error-helpers.js";
import { buildEndpointURL as J } from "../shared/query-state/url-state.js";
import { StatefulController as Z } from "../shared/stateful-controller.js";
import { asNumberish as m, asRecord as u, asString as n } from "../shared/coercion.js";
import { $ as I, C as ee, E as te, S as ae, _ as w, d as v, g as B, h as O, i as se, m as q, p as z, s as N, v as H, x as re } from "../chunks/translation-shared-kfjHEDZW.js";
import { normalizeNumberRecord as R, normalizeStringRecord as x } from "../shared/record-normalization.js";
import { c as $, s as ne } from "../chunks/ui-states-1McZ5upU.js";
var y = class extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationDashboardRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
};
function g(t, e) {
  if (!Array.isArray(t)) return [];
  const a = [];
  for (const s of t) {
    const r = e(s);
    r && a.push(r);
  }
  return a;
}
function M(t) {
  const e = n(t).toLowerCase();
  switch (e) {
    case "warning":
    case "critical":
    case "degraded":
      return e;
    default:
      return "ok";
  }
}
function F(t) {
  if (!t || typeof t != "object") return null;
  const e = t;
  return {
    href: n(e.href),
    group: n(e.group),
    route: n(e.route),
    resolverKey: n(e.resolver_key),
    params: x(e.params, { omitEmptyValues: !0 }),
    query: x(e.query, { omitEmptyValues: !0 }),
    key: n(e.key),
    label: n(e.label),
    description: n(e.description),
    relation: n(e.relation),
    tableId: n(e.table_id),
    entityType: n(e.entity_type),
    entityId: n(e.entity_id)
  };
}
function oe(t) {
  const e = u(t), a = n(e.key);
  return a ? {
    key: a,
    label: n(e.label),
    description: n(e.description),
    relation: n(e.relation),
    group: n(e.group),
    route: n(e.route),
    resolverKey: n(e.resolver_key),
    entityType: n(e.entity_type)
  } : null;
}
function ie(t) {
  const e = u(t), a = n(e.id);
  if (!a) return null;
  const s = u(e.alert);
  return {
    id: a,
    label: n(e.label),
    description: n(e.description),
    count: m(e.count),
    breakdown: R(e.breakdown),
    alert: {
      state: M(s.state),
      message: n(s.message)
    },
    drilldown: F(e.drilldown),
    metricKey: n(e.metric_key),
    runbookId: n(e.runbook_id)
  };
}
function le(t) {
  const e = u(t), a = n(e.code);
  return a ? {
    code: a,
    label: n(e.label) || b(a),
    count: m(e.count),
    affectedLocales: g(e.affected_locales, (s) => n(s) || null)
  } : null;
}
function de(t) {
  const e = u(t), a = n(e.state);
  if (!(!a || a !== "available" && a !== "unavailable" && a !== "degraded"))
    return {
      state: a,
      message: n(e.message)
    };
}
function ce(t) {
  const e = u(t);
  if (Object.keys(e).length === 0) return null;
  const a = {};
  for (const [c, h] of Object.entries(u(e.links))) {
    const f = F(h);
    f && (a[c] = f);
  }
  const s = g(e.blocker_codes, (c) => n(c) || null), r = {};
  for (const [c, h] of Object.entries(u(e.blocker_labels))) {
    const f = n(h);
    f && (r[c] = f);
  }
  const o = g(e.reason_breakdown, le), i = g(e.affected_locales, (c) => n(c) || null), p = de(e.reason_data);
  return {
    ...e,
    links: a,
    blockerCodes: s.length > 0 ? s : void 0,
    blockerLabels: Object.keys(r).length > 0 ? r : void 0,
    reasonBreakdown: o.length > 0 ? o : void 0,
    affectedLocales: i.length > 0 ? i : void 0,
    reasonData: p
  };
}
function ue(t, e = "") {
  const a = u(t), s = g(a.rows, ce);
  return {
    id: n(a.id) || e,
    label: n(a.label) || e,
    total: m(a.total, s.length),
    limit: m(a.limit, s.length),
    rows: s
  };
}
function P(t) {
  const e = u(t), a = n(e.id);
  return a ? {
    id: a,
    title: n(e.title),
    description: n(e.description),
    route: n(e.route),
    resolverKey: n(e.resolver_key),
    href: n(e.href),
    query: x(e.query, { omitEmptyValues: !0 })
  } : null;
}
function U(t) {
  const e = u(t), a = n(e.id);
  if (!a) return null;
  const s = {};
  for (const [r, o] of Object.entries(u(e.drilldown_links))) {
    const i = oe(o);
    i && (s[r] = i);
  }
  return {
    id: a,
    description: n(e.description),
    scopeFields: g(e.scope_fields, (r) => n(r) || null),
    stableSortKeys: g(e.stable_sort_keys, (r) => n(r) || null),
    indexHints: g(e.index_hints, (r) => n(r) || null),
    supportedFilters: g(e.supported_filters, (r) => n(r) || null),
    defaultLimit: m(e.default_limit),
    drilldownRoute: n(e.drilldown_route),
    queueRoute: n(e.queue_route),
    apiRoute: n(e.api_route),
    resolverKeys: g(e.resolver_keys, (r) => n(r) || null),
    drilldownLinks: s
  };
}
function he(t) {
  const e = u(t), a = {};
  for (const [s, r] of Object.entries(u(e.query_models))) {
    const o = U(r);
    o && (a[s] = o);
  }
  return {
    cardIds: g(e.card_ids, (s) => n(s) || null),
    tableIds: g(e.table_ids, (s) => n(s) || null),
    alertStates: g(e.alert_states, (s) => M(s)),
    defaultLimits: R(e.default_limits),
    queryModels: a,
    runbooks: g(e.runbooks, P)
  };
}
function pe(t) {
  const e = u(t), a = n(e.code);
  return a ? {
    state: M(e.state),
    code: a,
    message: n(e.message),
    cardId: n(e.card_id),
    runbookId: n(e.runbook_id)
  } : null;
}
function ge(t, e) {
  if (e.cardIds.length === 0) return t;
  const a = /* @__PURE__ */ new Map();
  return e.cardIds.forEach((s, r) => a.set(s, r)), [...t].sort((s, r) => (a.get(s.id) ?? Number.MAX_SAFE_INTEGER) - (a.get(r.id) ?? Number.MAX_SAFE_INTEGER));
}
function fe(t) {
  const e = u(t), a = u(e.data), s = u(e.meta), r = he(s.contracts), o = ge(g(a.cards, ie), r), i = {};
  for (const [c, h] of Object.entries(u(a.tables))) i[c] = ue(h, c);
  const p = { ...r.queryModels };
  for (const [c, h] of Object.entries(u(s.query_models))) {
    const f = U(h);
    f && (p[c] = f);
  }
  return {
    data: {
      cards: o,
      tables: i,
      alerts: g(a.alerts, pe),
      runbooks: g(a.runbooks, P),
      summary: R(a.summary)
    },
    meta: {
      channel: n(s.channel),
      generatedAt: n(s.generated_at),
      refreshIntervalMs: m(s.refresh_interval_ms, 3e4),
      latencyTargetMs: m(s.latency_target_ms, 0),
      degraded: s.degraded === !0,
      degradedReasons: g(s.degraded_reasons, (c) => {
        const h = u(c), f = n(h.component), S = n(h.message);
        return !f && !S ? null : {
          component: f,
          message: S
        };
      }),
      familyReport: u(s.family_report),
      scope: x(s.scope, { omitEmptyValues: !0 }),
      metrics: g(s.metrics, (c) => {
        const h = u(c), f = n(h.key);
        return f ? {
          key: f,
          unit: n(h.unit),
          sloP95Ms: h.slo_p95_ms === void 0 ? null : m(h.slo_p95_ms)
        } : null;
      }),
      queryModels: p,
      contracts: {
        ...r,
        queryModels: p
      }
    }
  };
}
function me(t, e = {}) {
  const a = new URLSearchParams(), s = [
    ["channel", n(e.channel)],
    ["tenant_id", n(e.tenantId)],
    ["org_id", n(e.orgId)],
    ["overdue_limit", e.overdueLimit != null ? String(e.overdueLimit) : ""],
    ["blocked_limit", e.blockedLimit != null ? String(e.blockedLimit) : ""]
  ];
  for (const [r, o] of s) o && a.set(r, o);
  return J(t, a, { preserveAbsolute: !0 });
}
function be(t) {
  const e = n(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  return { async fetchDashboard(s = {}) {
    if (!e) throw new y({
      message: "Translation dashboard endpoint is not configured",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const r = me(e, s);
    if (!a) throw new y({
      message: "Fetch implementation is not available",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const o = await a(r, { headers: { Accept: "application/json" } });
    if (!o.ok) {
      const i = await W(o.clone());
      throw new y({
        message: i.message || await Q(o, "Failed to load translation dashboard"),
        status: o.status,
        code: i.textCode,
        requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
        traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
        metadata: i.metadata
      });
    }
    return fe(await o.json());
  } };
}
function ye(t) {
  const e = Math.max(0, t.intervalMs ?? 3e4);
  let a = null, s = null;
  const r = async () => s || (s = (async () => {
    try {
      const o = await t.load();
      return t.onData?.(o), o;
    } catch (o) {
      throw t.onError?.(o), o;
    } finally {
      s = null;
    }
  })(), s);
  return {
    async start() {
      await r(), e > 0 && a == null && (a = globalThis.setInterval(() => {
        r().catch(() => {
        });
      }, e));
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
function b(t) {
  return t.replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
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
}, ve = {
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
}, ke = {
  "translations.dashboard.my_tasks": "Actor Task Count",
  "translations.dashboard.needs_review": "Review Queue Depth",
  "translations.dashboard.overdue_tasks": "Overdue Assignment Count",
  "translations.dashboard.blocked_families": "Blocked Family Count",
  "translations.dashboard.missing_required_locales": "Missing Locale Count"
};
function $e(t, e) {
  return T[t]?.label || e || b(t);
}
function we(t, e) {
  return T[t]?.shortLabel || T[t]?.label || e || b(t);
}
function _(t, e) {
  return ve[t] || e || b(t);
}
function L(t, e) {
  return k[t]?.label || e || b(t);
}
function C(t, e) {
  return k[t]?.shortLabel || k[t]?.label || e || b(t);
}
function E(t) {
  return k[t]?.icon || "";
}
var A = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors", Te = "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors";
function K(t) {
  const e = t.trim();
  if (!e || e.length < 12) return `<span class="font-mono text-xs text-gray-500">${l(e)}</span>`;
  const a = `${e.slice(0, 4)}...${e.slice(-4)}`;
  return `
    <button type="button"
            class="inline-flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-gray-900 group cursor-pointer bg-transparent border-none p-0"
            data-copy-uuid="${d(e)}"
            title="Click to copy: ${d(e)}">
      <span>${l(a)}</span>
      <svg class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>
  `;
}
function _e(t) {
  return ke[t] || b(t);
}
function Le(t) {
  if (t < 1e3) return `${t}ms`;
  const e = Math.floor(t / 1e3);
  return e < 60 ? `${e}s` : `${Math.floor(e / 60)}m`;
}
function Ce(t) {
  return t <= 0 ? "N/A" : t < 1e3 ? `${t}ms` : `${(t / 1e3).toFixed(1)}s`;
}
function V(t, e, a = "") {
  const s = l(t);
  return e?.href ? `<a class="${d(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${d(e.href)}">${s}</a>` : `<span class="${d(a)}">${s}</span>`;
}
function Ee(t) {
  return [...t].sort((e, a) => {
    const s = (r) => r === "primary" ? 0 : 1;
    return s(e.relation) - s(a.relation);
  });
}
function G(t, e = "No drill-downs") {
  return t.length === 0 ? `<span class="text-gray-400">${l(e)}</span>` : Ee(t).map((a) => {
    const s = a.label || "Open";
    return a.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${d(a.key || s.toLowerCase())}" href="${d(a.href)}">${l(s)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${l(s)}</span>`;
  }).join("");
}
function Re(t) {
  return t.drilldown?.href ? `
    <a
      href="${d(t.drilldown.href)}"
      class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
      data-dashboard-drilldown="${d(t.id)}"
      title="${d(t.drilldown.description || t.drilldown.label || "Open drilldown")}"
    >
      <span>${l(t.drilldown.label || "Open")}</span>
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </a>
  ` : '<span class="text-xs text-gray-400">No drilldown available</span>';
}
function Me(t, e) {
  if (!t.runbookId) return "";
  const a = e.find((i) => i.id === t.runbookId);
  if (!a?.href) return "";
  const s = C(t.runbookId, a.title), r = E(t.runbookId), o = L(t.runbookId, a.title);
  return `
    <a
      href="${d(a.href)}"
      class="${Te}"
      data-dashboard-card-runbook="${d(t.id)}"
      title="${d(a.description || o)}"
    >
      ${r || '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'}
      <span>${l(s)}</span>
    </a>
  `;
}
function Se(t, e = []) {
  const a = Object.entries(t.breakdown).map(([p, c]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${l(b(p))}</span>
        <span class="font-semibold text-gray-900">${l(String(c))}</span>
      </li>
    `).join(""), s = we(t.id, t.label), r = $e(t.id, t.label), o = _e(t.metricKey), i = Me(t, e);
  return `
    <article class="${v} p-4 shadow-sm flex flex-col" data-dashboard-card="${d(t.id)}">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 truncate" title="${d(r)}">${l(s)}</p>
      </div>
      <div class="mt-2">
        <p class="text-3xl font-semibold tracking-tight text-gray-900">${l(String(t.count))}</p>
        <span class="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${d(Fe(t.alert.state))}">
          ${l(t.alert.message || t.alert.state)}
        </span>
      </div>
      <p class="mt-3 text-sm leading-6 text-gray-600">${l(t.description)}</p>
      ${a ? `<ul class="mt-4 space-y-2">${a}</ul>` : ""}
      <div class="mt-auto pt-4 flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          ${Re(t)}
          <span class="text-xs text-gray-400" title="${d(t.metricKey)}">${l(o)}</span>
        </div>
        ${i ? `<div class="border-t border-gray-100 pt-3">${i}</div>` : ""}
      </div>
    </article>
  `;
}
function Ae(t) {
  const e = {
    critical: 4,
    warning: 3,
    degraded: 2,
    ok: 1
  };
  return t.reduce((a, s) => e[s.state] > e[a] ? s.state : a, "ok");
}
function je(t) {
  return `
    <div class="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/50"
         data-alert-code="${d(t.code)}"
         role="${t.state === "critical" ? "alert" : "status"}">
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold uppercase tracking-[0.16em]">${l(t.code)}</p>
        <p class="mt-1 text-sm">${l(t.message)}</p>
      </div>
      <button type="button"
              class="flex-shrink-0 p-1 rounded hover:bg-gray-200/50 transition-colors"
              data-dismiss-alert="${d(t.code)}"
              aria-label="Dismiss ${l(t.code)} alert">
        <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
}
function De(t, e, a) {
  const s = t.filter((c) => !a.has(c.code));
  if (s.length === 0) return "";
  const r = Ae(s), o = s.reduce((c, h) => (c[h.state] = (c[h.state] || 0) + 1, c), {}), i = Object.entries(o).filter(([, c]) => c > 0).map(([c, h]) => `${h} ${c}`).join(", "), p = e ? "rotate-180" : "";
  return `
    <section class="rounded-xl border ${Y(r)} shadow-sm overflow-hidden"
             data-dashboard-alerts-section="true"
             role="region"
             aria-label="Dashboard alerts">
      <button type="button"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              data-alerts-toggle="true"
              aria-expanded="${e}">
        <div class="flex items-center gap-3">
          <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="text-sm font-semibold">${l(i)}</span>
        </div>
        <svg class="h-5 w-5 flex-shrink-0 transition-transform ${p}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div class="${e ? "" : "hidden"}" data-alerts-content="true">
        <div class="border-t border-current/20 px-4 py-3 space-y-2">
          ${s.map((c) => je(c)).join("")}
        </div>
      </div>
    </section>
  `;
}
function Ie(t) {
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
        ${t.rows.map((e) => `
          <tr>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${V(n(e.source_title) || n(e.assignment_id), e.links.assignment)}</div>
              <div class="mt-1">${K(n(e.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${l(`${n(e.source_locale).toUpperCase()} -> ${n(e.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${l(b(n(e.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${l(b(n(e.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${l(`${m(e.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${G(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function Be(t) {
  const e = t.blockerCodes || [], a = t.blockerLabels || {};
  return e.length === 0 ? "" : e.map((s) => {
    const r = a[s] || b(s);
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${s === "missing_locale" ? "bg-amber-100 text-amber-800" : s === "pending_review" ? "bg-sky-100 text-sky-800" : s === "outdated_source" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-700"}" data-blocker-code="${d(s)}">${l(r)}</span>`;
  }).join("");
}
function Oe(t) {
  const e = t.affectedLocales || [];
  if (e.length === 0) return "";
  const a = 3, s = e.slice(0, a), r = e.length - a;
  return `<div class="flex flex-wrap items-center gap-1">${s.map((o) => `<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">${l(o.toUpperCase())}</span>`).join("")}${r > 0 ? `<span class="inline-flex items-center text-xs text-gray-500">+${r}</span>` : ""}</div>`;
}
function qe(t) {
  const e = t.reasonData;
  if (!e || e.state === "available") return "";
  const a = e.state === "degraded", s = a ? "text-amber-500" : "text-gray-400", r = a ? `<svg class="h-3.5 w-3.5 ${s}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>` : `<svg class="h-3.5 w-3.5 ${s}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  return `
    <span class="inline-flex items-center gap-1 text-xs text-gray-500" title="${d(e.message || "Reason data is " + e.state)}">
      ${r}
      <span class="sr-only">${l(e.message || "Reason data " + e.state)}</span>
    </span>
  `;
}
function ze(t) {
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
        ${t.rows.map((e) => `
          <tr data-family-row="${d(n(e.family_id))}">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${V(n(e.content_type) || "Family", e.links.family)}</div>
              <div class="mt-1 flex items-center gap-2">
                ${K(n(e.family_id))}
                ${qe(e)}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">${Be(e)}</div>
            </td>
            <td class="px-4 py-3">
              ${Oe(e)}
            </td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${l(String(m(e.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${l(String(m(e.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${G(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function j(t, e = [], a = {}) {
  const s = t.id === "top_overdue_assignments" ? Ie(t) : ze(t), r = _(t.id, t.label), o = {
    top_overdue_assignments: "translations.dashboard.overdue_triage",
    blocked_families: "translations.dashboard.publish_blockers"
  }[t.id], i = o ? e.find((p) => p.id === o) : void 0;
  return a.embedded ? `
      <div data-dashboard-table="${d(t.id)}">
        <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-white">
          <div>
            <p class="text-xs text-gray-500">Showing ${l(String(t.rows.length))} of ${l(String(t.total))}</p>
          </div>
          ${i?.href ? `
            <a
              href="${d(i.href)}"
              class="${A}"
              data-dashboard-table-runbook="${d(t.id)}"
              title="${d(i.description || L(o || "", i.title))}"
            >
              ${E(o || "")}
              <span>${l(C(o || "", i.title))}</span>
            </a>
          ` : ""}
        </header>
        <div class="overflow-x-auto">${s}</div>
      </div>
    ` : `
    <section class="overflow-hidden ${v} shadow-sm" data-dashboard-table="${d(t.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${l(r)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing ${l(String(t.rows.length))} of ${l(String(t.total))}</p>
        </div>
        ${i?.href ? `
          <a
            href="${d(i.href)}"
            class="${A}"
            data-dashboard-table-runbook="${d(t.id)}"
            title="${d(i.description || L(o || "", i.title))}"
          >
            ${E(o || "")}
            <span>${l(C(o || "", i.title))}</span>
          </a>
        ` : ""}
      </header>
      <div class="overflow-x-auto">${s}</div>
    </section>
  `;
}
function Ne(t, e, a) {
  const s = Object.keys(t);
  return s.length === 0 ? "" : s.length === 1 ? `<section class="space-y-4">${j(t[s[0]], e)}</section>` : `
    <section class="${v} shadow-sm overflow-hidden" data-dashboard-tables="true">
      <nav class="flex border-b border-gray-200 bg-gray-50 px-4" role="tablist" aria-label="Data tables">
        ${s.map((r) => {
    const o = xe[r] || {
      label: _(r, r),
      shortLabel: _(r, r),
      icon: ""
    }, i = r === a;
    return `
        <button type="button"
                class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${i ? "text-blue-600 border-blue-600" : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"}"
                data-table-tab="${d(r)}"
                role="tab"
                aria-selected="${i}"
                aria-controls="table-panel-${d(r)}">
          ${o.icon}
          <span>${l(o.shortLabel)}</span>
          <span class="ml-1 px-2 py-0.5 text-xs rounded-full ${i ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}">
            ${t[r]?.total || 0}
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
          ${j(t[r], e, { embedded: !0 })}
        </div>
      `;
  }).join("")}
      </div>
    </section>
  `;
}
function He(t) {
  return t.length === 0 ? "" : `
    <section class="${v} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${t.map((e) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${e.href ? `<a class="hover:underline" href="${d(e.href)}">${l(e.title)}</a>` : l(e.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${l(e.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function X(t) {
  switch (t) {
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
function Fe(t) {
  return I(X(t));
}
function Y(t) {
  return `border ${I(X(t))}`;
}
function Pe(t, e) {
  const a = Object.entries(t.meta.scope).filter(([, i]) => i).map(([i, p]) => ({
    key: b(i),
    value: String(p)
  })), s = Le(t.meta.refreshIntervalMs), r = Ce(t.meta.latencyTargetMs), o = t.meta.channel || "default";
  return `
    <section class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" data-dashboard-meta="true">
      <button type="button"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset transition-colors"
              data-meta-toggle="true"
              aria-expanded="${e}">
        <div class="flex items-center gap-2">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700">Technical Details</span>
        </div>
        <svg class="h-4 w-4 text-gray-400 transition-transform ${e ? "rotate-180" : ""}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div class="${e ? "" : "hidden"}" data-meta-content="true">
        <dl class="border-t border-gray-200 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <div>
            <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Channel</dt>
            <dd class="mt-1 text-sm font-medium text-gray-900">${l(o)}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Refresh</dt>
            <dd class="mt-1 text-sm font-medium text-gray-900">${l(s)}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Latency</dt>
            <dd class="mt-1 text-sm font-medium text-gray-900">${l(r)}</dd>
          </div>
          ${a.map(({ key: i, value: p }) => `
            <div>
              <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">${l(i)}</dt>
              <dd class="mt-1 text-xs font-medium text-gray-900 font-mono">${l(p)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    </section>
  `;
}
function Ue(t, e = !1) {
  const a = t?.meta.generatedAt ? new Date(t.meta.generatedAt).toLocaleString() : "Unavailable";
  return `
    <section class="${v} px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="${ae}">Manager Monitoring</p>
          <h2 class="${ee} text-xl mt-2">Queue health and publish blockers</h2>
          <p class="${re} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${l(e ? "Refreshing dashboard…" : `Last updated ${a}`)}
          </span>
          <button type="button" class="${N}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${e ? "disabled" : ""}>
            ${l(e ? "Refreshing…" : "Refresh dashboard")}
          </button>
        </div>
      </div>
    </section>
  `;
}
var Ke = {
  ok: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  warning: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
  critical: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  degraded: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
};
function Ve(t) {
  const e = t.data.alerts, a = t.meta.degraded;
  let s = "ok", r = "Healthy", o = "All systems operating normally";
  a && (s = "degraded", r = "Degraded", o = "Some metrics may be incomplete");
  const i = e.filter((c) => c.state === "critical").length, p = e.filter((c) => c.state === "warning").length;
  return i > 0 ? (s = "critical", r = "Critical", o = `${i} critical issue${i > 1 ? "s" : ""} require${i === 1 ? "s" : ""} attention`) : p > 0 && (s = "warning", r = "Warning", o = `${p} warning${p > 1 ? "s" : ""} detected`), `
    <div class="flex items-center gap-3 px-4 py-2 rounded-lg ${Y(s)}"
         role="status"
         aria-label="Dashboard health: ${d(r)}"
         data-dashboard-health="true">
      ${Ke[s]}
      <div class="flex-1 min-w-0">
        <span class="text-sm font-semibold">${l(r)}</span>
        <span class="ml-2 text-sm opacity-80">${l(o)}</span>
      </div>
    </div>
  `;
}
function Ge(t) {
  const e = t.data.runbooks[0], a = e?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${d(e.href)}">${l(e.title || "Open runbook")}</a>` : "";
  return $({
    tag: "section",
    containerClass: `${z} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No active pressure",
    titleClass: O,
    heading: "This scope is clear right now.",
    headingTag: "h3",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.",
    messageClass: `${q} mt-3 max-w-2xl leading-6`,
    actionsHtml: `
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${N}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${a}
      </div>
    `,
    attributes: { "data-dashboard-empty": "true" },
    ariaLive: "polite"
  });
}
function Xe(t) {
  const e = t instanceof y ? t.requestId : void 0, a = t instanceof y ? t.traceId : void 0, s = [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return $({
    tag: "section",
    containerClass: `${B} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Latest refresh failed",
    titleClass: H,
    message: t instanceof Error ? t.message : "Failed to load translation dashboard",
    messageClass: `${w} mt-2`,
    metadata: s,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    role: "alert",
    attributes: { "data-dashboard-inline-error": "true" }
  });
}
function Ye(t) {
  const e = t instanceof Error ? t.message : "Failed to load translation dashboard", a = t instanceof y ? t.requestId : void 0, s = t instanceof y ? t.traceId : void 0, r = [a ? `Request ${a}` : "", s ? `Trace ${s}` : ""].filter(Boolean).join(" • ");
  return $({
    tag: "section",
    containerClass: `${B} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Translation dashboard unavailable",
    titleClass: H,
    heading: "Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.",
    headingTag: "p",
    headingClass: `${w} mt-2`,
    message: e,
    messageClass: `${w} mt-2`,
    metadata: r,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" class="${se}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: "alert",
    attributes: { "data-dashboard-error": "true" }
  });
}
function Qe() {
  return $({
    tag: "section",
    containerClass: `${z} p-5`,
    bodyClass: "",
    contentClass: "",
    title: "Dashboard contract route is not wired.",
    titleClass: O,
    message: "Set a dashboard aggregate endpoint before initializing the dashboard client.",
    messageClass: `${q} mt-2`,
    attributes: { "data-dashboard-empty": "true" }
  });
}
function D() {
  return ne({
    tag: "section",
    text: "Loading translation dashboard aggregates...",
    showSpinner: !1,
    containerClass: `${te} p-5`,
    attributes: { "data-dashboard-loading": "true" },
    ariaLive: "polite"
  });
}
var We = class extends Z {
  constructor(t) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.metaExpanded = !1, this.alertsExpanded = !1, this.dismissedAlerts = /* @__PURE__ */ new Set(), this.activeTableTab = "top_overdue_assignments", this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...t
    }, this.client = be(t);
  }
  mount(t) {
    if (this.container = t, !n(this.config.endpoint)) {
      this.state = "error", t.innerHTML = Qe();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, t.innerHTML = D(), this.refreshController = ye({
      intervalMs: this.config.refreshInterval,
      load: () => this.client.fetchDashboard(),
      onData: (e) => {
        this.payload = e, this.state = "ready", this.refreshing = !1, this.lastError = null, this.render();
      },
      onError: (e) => {
        if (this.refreshing = !1, this.lastError = e, this.payload) {
          this.state = "ready", this.render();
          return;
        }
        this.state = "error", this.container && (this.container.innerHTML = Ye(e), this.bindActions());
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
      const t = await this.client.fetchDashboard();
      return this.payload = t, this.state = "ready", this.refreshing = !1, this.render(), t;
    }
    try {
      return await this.refreshController.refresh();
    } finally {
      this.refreshing = !1;
    }
  }
  render() {
    if (!this.container || !this.payload) return;
    const t = this.payload, e = t.data.runbooks, a = t.data.cards.map((i) => Se(i, e)).join(""), s = Object.values(t.data.summary).every((i) => i === 0) && Object.values(t.data.tables).every((i) => i.rows.length === 0), r = t.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${l(t.meta.degradedReasons.map((i) => `${i.component}: ${i.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", o = this.lastError ? Xe(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${Ue(t, this.refreshing)}
        ${Ve(t)}
        ${Pe(t, this.metaExpanded)}
        ${o}
        ${r}
        ${De(t.data.alerts, this.alertsExpanded, this.dismissedAlerts)}
        ${s ? Ge(t) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${a}</section>
            ${Ne(t.data.tables, e, this.activeTableTab)}
          `}
        ${He(t.data.runbooks)}
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
    const t = this.container.querySelector("[data-meta-toggle]");
    t && t.addEventListener("click", () => {
      this.metaExpanded = !this.metaExpanded, this.render();
    });
    const e = this.container.querySelector("[data-alerts-toggle]");
    e && e.addEventListener("click", () => {
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
function it(t, e = {}) {
  if (!t) return null;
  const a = new We({
    endpoint: e.endpoint ?? t.dataset.endpoint ?? "",
    queueEndpoint: e.queueEndpoint ?? t.dataset.queueEndpoint ?? "",
    familiesEndpoint: e.familiesEndpoint ?? t.dataset.familiesEndpoint ?? "",
    refreshInterval: e.refreshInterval ?? m(t.dataset.refreshInterval, 3e4),
    title: e.title ?? t.dataset.title ?? "Translation Dashboard",
    fetch: e.fetch
  });
  return a.mount(t), a;
}
export {
  We as TranslationDashboardPage,
  y as TranslationDashboardRequestError,
  me as buildTranslationDashboardURL,
  be as createTranslationDashboardClient,
  ye as createTranslationDashboardRefreshController,
  it as initTranslationDashboardPage,
  ie as normalizeTranslationDashboardCard,
  F as normalizeTranslationDashboardLink,
  U as normalizeTranslationDashboardQueryModel,
  fe as normalizeTranslationDashboardResponse,
  P as normalizeTranslationDashboardRunbook,
  ue as normalizeTranslationDashboardTable,
  ce as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
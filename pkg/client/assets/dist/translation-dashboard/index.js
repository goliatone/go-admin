import { escapeAttribute as c, escapeHTML as i } from "../shared/html.js";
import { readHTTPError as ee } from "../shared/transport/http-client.js";
import { extractStructuredError as te } from "../toast/error-helpers.js";
import { buildEndpointURL as ae } from "../shared/query-state/url-state.js";
import { StatefulController as re } from "../shared/stateful-controller.js";
import { asNumberish as m, asRecord as h, asString as n } from "../shared/coercion.js";
import { O as se, S as ne, T as oe, _ as T, d as v, g as D, h as B, i as ie, m as O, p as q, s as z, tt as N, v as F, w as le } from "../chunks/translation-shared-CQJ98SgC.js";
import { normalizeNumberRecord as C, normalizeStringRecord as k } from "../shared/record-normalization.js";
import { c as w, s as de } from "../chunks/ui-states-1McZ5upU.js";
var y = class extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationDashboardRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
};
function g(t, e) {
  if (!Array.isArray(t)) return [];
  const a = [];
  for (const r of t) {
    const s = e(r);
    s && a.push(s);
  }
  return a;
}
function E(t) {
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
function H(t) {
  if (!t || typeof t != "object") return null;
  const e = t;
  return {
    href: n(e.href),
    group: n(e.group),
    route: n(e.route),
    resolverKey: n(e.resolver_key),
    params: k(e.params, { omitEmptyValues: !0 }),
    query: k(e.query, { omitEmptyValues: !0 }),
    key: n(e.key),
    label: n(e.label),
    description: n(e.description),
    relation: n(e.relation),
    tableId: n(e.table_id),
    entityType: n(e.entity_type),
    entityId: n(e.entity_id)
  };
}
function ce(t) {
  const e = h(t), a = n(e.key);
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
function ue(t) {
  const e = h(t), a = n(e.id);
  if (!a) return null;
  const r = h(e.alert);
  return {
    id: a,
    label: n(e.label),
    description: n(e.description),
    count: m(e.count),
    breakdown: C(e.breakdown),
    alert: {
      state: E(r.state),
      message: n(r.message)
    },
    drilldown: H(e.drilldown),
    metricKey: n(e.metric_key),
    runbookId: n(e.runbook_id)
  };
}
function he(t) {
  const e = h(t), a = n(e.code);
  return a ? {
    code: a,
    label: n(e.label) || b(a),
    count: m(e.count),
    affectedLocales: g(e.affected_locales, (r) => n(r) || null)
  } : null;
}
function pe(t) {
  const e = h(t), a = n(e.state);
  if (!(!a || a !== "available" && a !== "unavailable" && a !== "degraded"))
    return {
      state: a,
      message: n(e.message)
    };
}
function ge(t) {
  const e = h(t);
  if (Object.keys(e).length === 0) return null;
  const a = {};
  for (const [p, u] of Object.entries(h(e.links))) {
    const d = H(u);
    d && (a[p] = d);
  }
  const r = g(e.blocker_codes, (p) => n(p) || null), s = {};
  for (const [p, u] of Object.entries(h(e.blocker_labels))) {
    const d = n(u);
    d && (s[p] = d);
  }
  const o = g(e.reason_breakdown, he), l = g(e.affected_locales, (p) => n(p) || null), f = pe(e.reason_data);
  return {
    ...e,
    links: a,
    blockerCodes: r.length > 0 ? r : void 0,
    blockerLabels: Object.keys(s).length > 0 ? s : void 0,
    reasonBreakdown: o.length > 0 ? o : void 0,
    affectedLocales: l.length > 0 ? l : void 0,
    reasonData: f
  };
}
function fe(t, e = "") {
  const a = h(t), r = g(a.rows, ge);
  return {
    id: n(a.id) || e,
    label: n(a.label) || e,
    total: m(a.total, r.length),
    limit: m(a.limit, r.length),
    rows: r
  };
}
function P(t) {
  const e = h(t), a = n(e.id);
  return a ? {
    id: a,
    title: n(e.title),
    description: n(e.description),
    route: n(e.route),
    resolverKey: n(e.resolver_key),
    href: n(e.href),
    query: k(e.query, { omitEmptyValues: !0 })
  } : null;
}
function U(t) {
  const e = h(t), a = n(e.id);
  if (!a) return null;
  const r = {};
  for (const [s, o] of Object.entries(h(e.drilldown_links))) {
    const l = ce(o);
    l && (r[s] = l);
  }
  return {
    id: a,
    description: n(e.description),
    scopeFields: g(e.scope_fields, (s) => n(s) || null),
    stableSortKeys: g(e.stable_sort_keys, (s) => n(s) || null),
    indexHints: g(e.index_hints, (s) => n(s) || null),
    supportedFilters: g(e.supported_filters, (s) => n(s) || null),
    defaultLimit: m(e.default_limit),
    drilldownRoute: n(e.drilldown_route),
    queueRoute: n(e.queue_route),
    apiRoute: n(e.api_route),
    resolverKeys: g(e.resolver_keys, (s) => n(s) || null),
    drilldownLinks: r
  };
}
function me(t) {
  const e = h(t), a = {};
  for (const [r, s] of Object.entries(h(e.query_models))) {
    const o = U(s);
    o && (a[r] = o);
  }
  return {
    cardIds: g(e.card_ids, (r) => n(r) || null),
    tableIds: g(e.table_ids, (r) => n(r) || null),
    alertStates: g(e.alert_states, (r) => E(r)),
    defaultLimits: C(e.default_limits),
    queryModels: a,
    runbooks: g(e.runbooks, P)
  };
}
function be(t) {
  const e = h(t), a = n(e.code);
  return a ? {
    state: E(e.state),
    code: a,
    message: n(e.message),
    cardId: n(e.card_id),
    runbookId: n(e.runbook_id)
  } : null;
}
function xe(t, e) {
  if (e.cardIds.length === 0) return t;
  const a = /* @__PURE__ */ new Map();
  return e.cardIds.forEach((r, s) => a.set(r, s)), [...t].sort((r, s) => (a.get(r.id) ?? Number.MAX_SAFE_INTEGER) - (a.get(s.id) ?? Number.MAX_SAFE_INTEGER));
}
function ye(t) {
  const e = h(t), a = h(e.data), r = h(e.meta), s = me(r.contracts), o = xe(g(a.cards, ue), s), l = {};
  for (const [p, u] of Object.entries(h(a.tables))) l[p] = fe(u, p);
  const f = { ...s.queryModels };
  for (const [p, u] of Object.entries(h(r.query_models))) {
    const d = U(u);
    d && (f[p] = d);
  }
  return {
    data: {
      cards: o,
      tables: l,
      alerts: g(a.alerts, be),
      runbooks: g(a.runbooks, P),
      summary: C(a.summary)
    },
    meta: {
      channel: n(r.channel),
      generatedAt: n(r.generated_at),
      refreshIntervalMs: m(r.refresh_interval_ms, 3e4),
      latencyTargetMs: m(r.latency_target_ms, 0),
      degraded: r.degraded === !0,
      degradedReasons: g(r.degraded_reasons, (p) => {
        const u = h(p), d = n(u.component), x = n(u.message);
        return !d && !x ? null : {
          component: d,
          message: x
        };
      }),
      familyReport: h(r.family_report),
      scope: k(r.scope, { omitEmptyValues: !0 }),
      metrics: g(r.metrics, (p) => {
        const u = h(p), d = n(u.key);
        return d ? {
          key: d,
          unit: n(u.unit),
          sloP95Ms: u.slo_p95_ms === void 0 ? null : m(u.slo_p95_ms)
        } : null;
      }),
      queryModels: f,
      contracts: {
        ...s,
        queryModels: f
      }
    }
  };
}
function ve(t, e = {}) {
  const a = new URLSearchParams(), r = [
    ["channel", n(e.channel)],
    ["tenant_id", n(e.tenantId)],
    ["org_id", n(e.orgId)],
    ["overdue_limit", e.overdueLimit != null ? String(e.overdueLimit) : ""],
    ["blocked_limit", e.blockedLimit != null ? String(e.blockedLimit) : ""]
  ];
  for (const [s, o] of r) o && a.set(s, o);
  return ae(t, a, { preserveAbsolute: !0 });
}
function ke(t) {
  const e = n(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  return { async fetchDashboard(r = {}) {
    if (!e) throw new y({
      message: "Translation dashboard endpoint is not configured",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const s = ve(e, r);
    if (!a) throw new y({
      message: "Fetch implementation is not available",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const o = await a(s, { headers: { Accept: "application/json" } });
    if (!o.ok) {
      const l = await te(o.clone());
      throw new y({
        message: l.message || await ee(o, "Failed to load translation dashboard"),
        status: o.status,
        code: l.textCode,
        requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
        traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
        metadata: l.metadata
      });
    }
    return ye(await o.json());
  } };
}
function $e(t) {
  const e = Math.max(0, t.intervalMs ?? 3e4);
  let a = null, r = null;
  const s = async () => r || (r = (async () => {
    try {
      const o = await t.load();
      return t.onData?.(o), o;
    } catch (o) {
      throw t.onError?.(o), o;
    } finally {
      r = null;
    }
  })(), r);
  return {
    async start() {
      await s(), e > 0 && a == null && (a = globalThis.setInterval(() => {
        s().catch(() => {
        });
      }, e));
    },
    stop() {
      a != null && (globalThis.clearInterval(a), a = null);
    },
    refresh: s,
    isRunning() {
      return a != null;
    }
  };
}
function b(t) {
  return t.replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
var _ = {
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
}, we = {
  top_overdue_assignments: "Top Overdue Assignments",
  blocked_families: "Blocked Families"
}, Te = {
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
}, $ = {
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
};
function V(t, e) {
  return _[t]?.label || e || b(t);
}
function G(t, e) {
  return _[t]?.shortLabel || _[t]?.label || e || b(t);
}
function L(t, e) {
  return we[t] || e || b(t);
}
function R(t, e) {
  return $[t]?.label || e || b(t);
}
function A(t, e) {
  return $[t]?.shortLabel || $[t]?.label || e || b(t);
}
function M(t) {
  return $[t]?.icon || "";
}
var S = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors";
function K(t) {
  const e = t.trim();
  if (!e || e.length < 12) return `<span class="font-mono text-xs text-gray-500">${i(e)}</span>`;
  const a = `${e.slice(0, 4)}...${e.slice(-4)}`;
  return `
    <button type="button"
            class="inline-flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-gray-900 group cursor-pointer bg-transparent border-none p-0"
            data-copy-uuid="${c(e)}"
            title="Click to copy: ${c(e)}">
      <span>${i(a)}</span>
      <svg class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>
  `;
}
function _e(t) {
  if (t < 1e3) return `${t}ms`;
  const e = Math.floor(t / 1e3);
  return e < 60 ? `${e}s` : `${Math.floor(e / 60)}m`;
}
function Le(t) {
  return t <= 0 ? "N/A" : t < 1e3 ? `${t}ms` : `${(t / 1e3).toFixed(1)}s`;
}
function X(t, e, a = "") {
  const r = i(t);
  return e?.href ? `<a class="${c(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${c(e.href)}">${r}</a>` : `<span class="${c(a)}">${r}</span>`;
}
function Ce(t) {
  return [...t].sort((e, a) => {
    const r = (s) => s === "primary" ? 0 : 1;
    return r(e.relation) - r(a.relation);
  });
}
function Y(t, e = "No drill-downs") {
  return t.length === 0 ? `<span class="text-gray-400">${i(e)}</span>` : Ce(t).map((a) => {
    const r = a.label || "Open";
    return a.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${c(a.key || r.toLowerCase())}" href="${c(a.href)}">${i(r)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${i(r)}</span>`;
  }).join("");
}
function Ee(t) {
  return t.drilldown?.href ? `
    <a
      href="${c(t.drilldown.href)}"
      class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
      data-dashboard-drilldown="${c(t.id)}"
      title="${c(t.drilldown.description || t.drilldown.label || "Open drilldown")}"
    >
      <span>${i(t.drilldown.label || "Open")}</span>
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </a>
  ` : '<span class="text-xs text-gray-400">No drilldown available</span>';
}
function Re(t, e = []) {
  const a = G(t.id, t.label), r = V(t.id, t.label), s = t.description ? `${r} - ${t.description}` : r;
  return `
    <article class="${v} p-4 shadow-sm flex flex-col" data-dashboard-card="${c(t.id)}" title="${c(s)}">
      <div class="flex items-start justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 truncate">${i(a)}</p>
        <span class="flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${c(W(t.alert.state))}">
          ${i(t.alert.message || t.alert.state)}
        </span>
      </div>
      <div class="mt-3">
        <p class="text-3xl font-semibold tracking-tight text-gray-900">${i(String(t.count))}</p>
      </div>
      <div class="mt-auto pt-4">
        ${Ee(t)}
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
  return t.reduce((a, r) => e[r.state] > e[a] ? r.state : a, "ok");
}
function Me(t, e) {
  const a = e.find((s) => s.id === t.cardId), r = a ? V(t.cardId, a.label) : b(t.cardId);
  return `
    <div class="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/50"
         data-alert-code="${c(t.code)}"
         role="${t.state === "critical" ? "alert" : "status"}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] ${c(W(t.state))}">${i(r)}</span>
          <span class="text-xs font-medium text-gray-600">${i(t.state)}</span>
        </div>
        <p class="mt-1.5 text-sm text-gray-700">${i(t.message)}</p>
      </div>
      <button type="button"
              class="flex-shrink-0 p-1 rounded hover:bg-gray-200/50 transition-colors"
              data-dismiss-alert="${c(t.code)}"
              aria-label="Dismiss alert for ${i(r)}">
        <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
}
function Se(t, e, a, r) {
  const s = t.filter((d) => !r.has(d.code));
  if (s.length === 0) return "";
  const o = Ae(s), l = s.reduce((d, x) => (d[x.state] = (d[x.state] || 0) + 1, d), {}), f = Object.entries(l).filter(([, d]) => d > 0).map(([d, x]) => `${x} ${d}`).join(", "), p = s.map((d) => {
    const x = e.find((Z) => Z.id === d.cardId), J = x ? G(d.cardId, x.label) : b(d.cardId);
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-white/60 text-gray-700" data-alert-card="${c(d.cardId)}">${i(J)}</span>`;
  }).join(""), u = a ? "rotate-180" : "";
  return `
    <section class="rounded-xl border ${Ne(o)} shadow-sm overflow-hidden"
             data-dashboard-alerts-section="true"
             role="region"
             aria-label="Dashboard alerts">
      <button type="button"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              data-alerts-toggle="true"
              aria-expanded="${a}">
        <div class="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="text-sm font-semibold">${i(f)}</span>
          ${a ? "" : `<div class="flex items-center gap-1.5 flex-wrap">${p}</div>`}
        </div>
        <svg class="h-5 w-5 flex-shrink-0 transition-transform ${u}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div class="${a ? "" : "hidden"}" data-alerts-content="true">
        <div class="border-t border-current/20 px-4 py-3 space-y-2">
          ${s.map((d) => Me(d, e)).join("")}
        </div>
      </div>
    </section>
  `;
}
function je(t) {
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
              <div class="font-medium text-gray-900">${X(n(e.source_title) || n(e.assignment_id), e.links.assignment)}</div>
              <div class="mt-1">${K(n(e.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(`${n(e.source_locale).toUpperCase()} -> ${n(e.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${i(b(n(e.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${i(b(n(e.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${i(`${m(e.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${Y(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function Ie(t) {
  const e = t.blockerCodes || [], a = t.blockerLabels || {};
  return e.length === 0 ? "" : e.map((r) => {
    const s = a[r] || b(r);
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${r === "missing_locale" ? "bg-amber-100 text-amber-800" : r === "pending_review" ? "bg-sky-100 text-sky-800" : r === "outdated_source" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-700"}" data-blocker-code="${c(r)}">${i(s)}</span>`;
  }).join("");
}
function De(t) {
  const e = t.affectedLocales || [];
  if (e.length === 0) return "";
  const a = 3, r = e.slice(0, a), s = e.length - a;
  return `<div class="flex flex-wrap items-center gap-1">${r.map((o) => `<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">${i(o.toUpperCase())}</span>`).join("")}${s > 0 ? `<span class="inline-flex items-center text-xs text-gray-500">+${s}</span>` : ""}</div>`;
}
function Be(t) {
  const e = t.reasonData;
  if (!e || e.state === "available") return "";
  const a = e.state === "degraded", r = a ? "text-amber-500" : "text-gray-400", s = a ? `<svg class="h-3.5 w-3.5 ${r}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>` : `<svg class="h-3.5 w-3.5 ${r}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  return `
    <span class="inline-flex items-center gap-1 text-xs text-gray-500" title="${c(e.message || "Reason data is " + e.state)}">
      ${s}
      <span class="sr-only">${i(e.message || "Reason data " + e.state)}</span>
    </span>
  `;
}
function Oe(t) {
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
          <tr data-family-row="${c(n(e.family_id))}">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${X(n(e.content_type) || "Family", e.links.family)}</div>
              <div class="mt-1 flex items-center gap-2">
                ${K(n(e.family_id))}
                ${Be(e)}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">${Ie(e)}</div>
            </td>
            <td class="px-4 py-3">
              ${De(e)}
            </td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${i(String(m(e.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${i(String(m(e.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${Y(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function j(t, e = [], a = {}) {
  const r = t.id === "top_overdue_assignments" ? je(t) : Oe(t), s = L(t.id, t.label), o = {
    top_overdue_assignments: "translations.dashboard.overdue_triage",
    blocked_families: "translations.dashboard.publish_blockers"
  }[t.id], l = o ? e.find((f) => f.id === o) : void 0;
  return a.embedded ? `
      <div data-dashboard-table="${c(t.id)}">
        <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-white">
          <div>
            <p class="text-xs text-gray-500">Showing ${i(String(t.rows.length))} of ${i(String(t.total))}</p>
          </div>
          ${l?.href ? `
            <a
              href="${c(l.href)}"
              class="${S}"
              data-dashboard-table-runbook="${c(t.id)}"
              title="${c(l.description || R(o || "", l.title))}"
            >
              ${M(o || "")}
              <span>${i(A(o || "", l.title))}</span>
            </a>
          ` : ""}
        </header>
        <div class="overflow-x-auto">${r}</div>
      </div>
    ` : `
    <section class="overflow-hidden ${v} shadow-sm" data-dashboard-table="${c(t.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${i(s)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing ${i(String(t.rows.length))} of ${i(String(t.total))}</p>
        </div>
        ${l?.href ? `
          <a
            href="${c(l.href)}"
            class="${S}"
            data-dashboard-table-runbook="${c(t.id)}"
            title="${c(l.description || R(o || "", l.title))}"
          >
            ${M(o || "")}
            <span>${i(A(o || "", l.title))}</span>
          </a>
        ` : ""}
      </header>
      <div class="overflow-x-auto">${r}</div>
    </section>
  `;
}
function qe(t, e, a) {
  const r = Object.keys(t);
  return r.length === 0 ? "" : r.length === 1 ? `<section class="space-y-4">${j(t[r[0]], e)}</section>` : `
    <section class="${v} shadow-sm overflow-hidden" data-dashboard-tables="true">
      <nav class="flex border-b border-gray-200 bg-gray-50 px-4" role="tablist" aria-label="Data tables">
        ${r.map((s) => {
    const o = Te[s] || {
      label: L(s, s),
      shortLabel: L(s, s),
      icon: ""
    }, l = s === a;
    return `
        <button type="button"
                class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${l ? "text-blue-600 border-blue-600" : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"}"
                data-table-tab="${c(s)}"
                role="tab"
                aria-selected="${l}"
                aria-controls="table-panel-${c(s)}">
          ${o.icon}
          <span>${i(o.shortLabel)}</span>
          <span class="sr-only">${i(o.label)}</span>
          <span class="ml-1 px-2 py-0.5 text-xs rounded-full ${l ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}">
            ${t[s]?.total || 0}
          </span>
        </button>
      `;
  }).join("")}
      </nav>
      <div class="p-0">
        ${r.map((s) => {
    const o = s === a;
    return `
        <div id="table-panel-${c(s)}"
             role="tabpanel"
             ${o ? "" : "hidden"}
             data-table-panel="${c(s)}">
          ${j(t[s], e, { embedded: !0 })}
        </div>
      `;
  }).join("")}
      </div>
    </section>
  `;
}
function ze(t) {
  return t.length === 0 ? "" : `
    <section class="${v} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${t.map((e) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${e.href ? `<a class="hover:underline" href="${c(e.href)}">${i(e.title)}</a>` : i(e.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${i(e.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function Q(t) {
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
function W(t) {
  return N(Q(t));
}
function Ne(t) {
  return `border ${N(Q(t))}`;
}
function Fe(t, e = !1, a = !1) {
  const r = t?.meta.generatedAt ? new Date(t.meta.generatedAt).toLocaleString() : "Unavailable", s = t ? Object.entries(t.meta.scope).filter(([, u]) => u).filter(([u]) => u !== "actor_id").map(([u, d]) => ({
    key: b(u),
    value: String(d)
  })) : [], o = t ? _e(t.meta.refreshIntervalMs) : "N/A", l = t ? Le(t.meta.latencyTargetMs) : "N/A", f = t?.meta.channel || "default", p = a ? "rotate-180" : "";
  return `
    <section class="${v} shadow-sm overflow-hidden" data-dashboard-toolbar="true">
      <div class="px-5 py-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="${le}">Manager Monitoring</p>
            <h2 class="${oe} text-xl mt-2">Queue health and publish blockers</h2>
            <p class="${ne} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
              ${i(e ? "Refreshing dashboard…" : `Last updated ${r}`)}
            </span>
            <button type="button" class="${z}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${e ? "disabled" : ""}>
              ${i(e ? "Refreshing…" : "Refresh dashboard")}
            </button>
          </div>
        </div>
      </div>
      ${t ? `
        <div class="border-t border-gray-100 bg-gray-50 px-5 py-2">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Dashboard channel">
                <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                </svg>
                <span>${i(f)}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Refresh interval: ${i(o)}">
                <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>${i(o)}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Latency target: ${i(l)}">
                <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <span>${i(l)}</span>
              </span>
            </div>
            <button type="button"
                    class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    data-meta-toggle="true"
                    aria-expanded="${a}"
                    aria-label="Toggle technical details">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Details</span>
              <svg class="h-3 w-3 transition-transform ${p}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
          <div class="${a ? "mt-3" : "hidden"}" data-meta-content="true">
            <dl class="border-t border-gray-200 pt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Channel</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${i(f)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Refresh Interval</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${i(o)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">Latency Target</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${i(l)}</dd>
              </div>
              ${s.map(({ key: u, value: d }) => `
                <div>
                  <dt class="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">${i(u)}</dt>
                  <dd class="mt-1 text-xs font-medium text-gray-900 font-mono">${i(d)}</dd>
                </div>
              `).join("")}
            </dl>
          </div>
        </div>
      ` : ""}
    </section>
  `;
}
function He(t) {
  const e = t.data.runbooks[0], a = e?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${c(e.href)}">${i(e.title || "Open runbook")}</a>` : "";
  return w({
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
function Pe(t) {
  const e = t instanceof y ? t.requestId : void 0, a = t instanceof y ? t.traceId : void 0, r = [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return w({
    tag: "section",
    containerClass: `${D} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Latest refresh failed",
    titleClass: F,
    message: t instanceof Error ? t.message : "Failed to load translation dashboard",
    messageClass: `${T} mt-2`,
    metadata: r,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    role: "alert",
    attributes: { "data-dashboard-inline-error": "true" }
  });
}
function Ue(t) {
  const e = t instanceof Error ? t.message : "Failed to load translation dashboard", a = t instanceof y ? t.requestId : void 0, r = t instanceof y ? t.traceId : void 0, s = [a ? `Request ${a}` : "", r ? `Trace ${r}` : ""].filter(Boolean).join(" • ");
  return w({
    tag: "section",
    containerClass: `${D} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Translation dashboard unavailable",
    titleClass: F,
    heading: "Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.",
    headingTag: "p",
    headingClass: `${T} mt-2`,
    message: e,
    messageClass: `${T} mt-2`,
    metadata: s,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" class="${ie}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: "alert",
    attributes: { "data-dashboard-error": "true" }
  });
}
function Ve() {
  return w({
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
function I() {
  return de({
    tag: "section",
    text: "Loading translation dashboard aggregates...",
    showSpinner: !1,
    containerClass: `${se} p-5`,
    attributes: { "data-dashboard-loading": "true" },
    ariaLive: "polite"
  });
}
var Ge = class extends re {
  constructor(t) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.metaExpanded = !1, this.alertsExpanded = !1, this.dismissedAlerts = /* @__PURE__ */ new Set(), this.activeTableTab = "top_overdue_assignments", this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...t
    }, this.client = ke(t);
  }
  mount(t) {
    if (this.container = t, !n(this.config.endpoint)) {
      this.state = "error", t.innerHTML = Ve();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, t.innerHTML = I(), this.refreshController = $e({
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
        this.state = "error", this.container && (this.container.innerHTML = Ue(e), this.bindActions());
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
    if (this.lastError = null, this.refreshing = !0, this.payload ? this.render() : this.container && (this.state = "loading", this.container.innerHTML = I()), !this.refreshController) {
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
    const t = this.payload, e = t.data.runbooks, a = t.data.cards.map((l) => Re(l, e)).join(""), r = Object.values(t.data.summary).every((l) => l === 0) && Object.values(t.data.tables).every((l) => l.rows.length === 0), s = t.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${i(t.meta.degradedReasons.map((l) => `${l.component}: ${l.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", o = this.lastError ? Pe(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${Fe(t, this.refreshing, this.metaExpanded)}
        ${o}
        ${s}
        ${Se(t.data.alerts, t.data.cards, this.alertsExpanded, this.dismissedAlerts)}
        ${r ? He(t) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${a}</section>
            ${qe(t.data.tables, e, this.activeTableTab)}
          `}
        ${ze(t.data.runbooks)}
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
      a.addEventListener("click", (r) => {
        r.stopPropagation();
        const s = a.dataset.dismissAlert;
        s && (this.dismissedAlerts.add(s), this.render());
      });
    }), this.container.querySelectorAll("[data-table-tab]").forEach((a) => {
      a.addEventListener("click", () => {
        const r = a.dataset.tableTab;
        r && r !== this.activeTableTab && (this.activeTableTab = r, this.render());
      });
    }), this.container.querySelectorAll("[data-copy-uuid]").forEach((a) => {
      a.addEventListener("click", async (r) => {
        r.preventDefault(), r.stopPropagation();
        const s = a.dataset.copyUuid;
        if (s)
          try {
            await navigator.clipboard.writeText(s);
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
function at(t, e = {}) {
  if (!t) return null;
  const a = new Ge({
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
  Ge as TranslationDashboardPage,
  y as TranslationDashboardRequestError,
  ve as buildTranslationDashboardURL,
  ke as createTranslationDashboardClient,
  $e as createTranslationDashboardRefreshController,
  at as initTranslationDashboardPage,
  ue as normalizeTranslationDashboardCard,
  H as normalizeTranslationDashboardLink,
  U as normalizeTranslationDashboardQueryModel,
  ye as normalizeTranslationDashboardResponse,
  P as normalizeTranslationDashboardRunbook,
  fe as normalizeTranslationDashboardTable,
  ge as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
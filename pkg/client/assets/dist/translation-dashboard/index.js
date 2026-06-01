import { escapeAttribute as d, escapeHTML as l } from "../shared/html.js";
import { readHTTPError as G } from "../shared/transport/http-client.js";
import { extractStructuredError as X } from "../toast/error-helpers.js";
import { buildEndpointURL as Y } from "../shared/query-state/url-state.js";
import { StatefulController as Q } from "../shared/stateful-controller.js";
import { asNumberish as b, asRecord as c, asString as s } from "../shared/coercion.js";
import { O as J, S as W, T as Z, _ as w, d as x, g as j, h as B, i as ee, m as O, p as q, s as z, tt as te, v as N, w as ae } from "../chunks/translation-shared-CQJ98SgC.js";
import { normalizeNumberRecord as R, normalizeStringRecord as v } from "../shared/record-normalization.js";
import { c as $, s as re } from "../chunks/ui-states-1McZ5upU.js";
var y = class extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationDashboardRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
};
function u(t, e) {
  if (!Array.isArray(t)) return [];
  const a = [];
  for (const r of t) {
    const n = e(r);
    n && a.push(n);
  }
  return a;
}
function S(t) {
  const e = s(t).toLowerCase();
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
    href: s(e.href),
    group: s(e.group),
    route: s(e.route),
    resolverKey: s(e.resolver_key),
    params: v(e.params, { omitEmptyValues: !0 }),
    query: v(e.query, { omitEmptyValues: !0 }),
    key: s(e.key),
    label: s(e.label),
    description: s(e.description),
    relation: s(e.relation),
    tableId: s(e.table_id),
    entityType: s(e.entity_type),
    entityId: s(e.entity_id)
  };
}
function se(t) {
  const e = c(t), a = s(e.key);
  return a ? {
    key: a,
    label: s(e.label),
    description: s(e.description),
    relation: s(e.relation),
    group: s(e.group),
    route: s(e.route),
    resolverKey: s(e.resolver_key),
    entityType: s(e.entity_type)
  } : null;
}
function ne(t) {
  const e = c(t), a = s(e.id);
  if (!a) return null;
  const r = c(e.alert);
  return {
    id: a,
    label: s(e.label),
    description: s(e.description),
    count: b(e.count),
    breakdown: R(e.breakdown),
    alert: {
      state: S(r.state),
      message: s(r.message)
    },
    drilldown: F(e.drilldown),
    metricKey: s(e.metric_key),
    runbookId: s(e.runbook_id)
  };
}
function oe(t) {
  const e = c(t), a = s(e.code);
  return a ? {
    code: a,
    label: s(e.label) || f(a),
    count: b(e.count),
    affectedLocales: u(e.affected_locales, (r) => s(r) || null)
  } : null;
}
function ie(t) {
  const e = c(t), a = s(e.state);
  if (!(!a || a !== "available" && a !== "unavailable" && a !== "degraded"))
    return {
      state: a,
      message: s(e.message)
    };
}
function le(t) {
  const e = c(t);
  if (Object.keys(e).length === 0) return null;
  const a = {};
  for (const [h, p] of Object.entries(c(e.links))) {
    const g = F(p);
    g && (a[h] = g);
  }
  const r = u(e.blocker_codes, (h) => s(h) || null), n = {};
  for (const [h, p] of Object.entries(c(e.blocker_labels))) {
    const g = s(p);
    g && (n[h] = g);
  }
  const o = u(e.reason_breakdown, oe), i = u(e.affected_locales, (h) => s(h) || null), m = ie(e.reason_data);
  return {
    ...e,
    links: a,
    blockerCodes: r.length > 0 ? r : void 0,
    blockerLabels: Object.keys(n).length > 0 ? n : void 0,
    reasonBreakdown: o.length > 0 ? o : void 0,
    affectedLocales: i.length > 0 ? i : void 0,
    reasonData: m
  };
}
function de(t, e = "") {
  const a = c(t), r = u(a.rows, le);
  return {
    id: s(a.id) || e,
    label: s(a.label) || e,
    total: b(a.total, r.length),
    limit: b(a.limit, r.length),
    rows: r
  };
}
function H(t) {
  const e = c(t), a = s(e.id);
  return a ? {
    id: a,
    title: s(e.title),
    description: s(e.description),
    route: s(e.route),
    resolverKey: s(e.resolver_key),
    href: s(e.href),
    query: v(e.query, { omitEmptyValues: !0 })
  } : null;
}
function P(t) {
  const e = c(t), a = s(e.id);
  if (!a) return null;
  const r = {};
  for (const [n, o] of Object.entries(c(e.drilldown_links))) {
    const i = se(o);
    i && (r[n] = i);
  }
  return {
    id: a,
    description: s(e.description),
    scopeFields: u(e.scope_fields, (n) => s(n) || null),
    stableSortKeys: u(e.stable_sort_keys, (n) => s(n) || null),
    indexHints: u(e.index_hints, (n) => s(n) || null),
    supportedFilters: u(e.supported_filters, (n) => s(n) || null),
    defaultLimit: b(e.default_limit),
    drilldownRoute: s(e.drilldown_route),
    queueRoute: s(e.queue_route),
    apiRoute: s(e.api_route),
    resolverKeys: u(e.resolver_keys, (n) => s(n) || null),
    drilldownLinks: r
  };
}
function ce(t) {
  const e = c(t), a = {};
  for (const [r, n] of Object.entries(c(e.query_models))) {
    const o = P(n);
    o && (a[r] = o);
  }
  return {
    cardIds: u(e.card_ids, (r) => s(r) || null),
    tableIds: u(e.table_ids, (r) => s(r) || null),
    alertStates: u(e.alert_states, (r) => S(r)),
    defaultLimits: R(e.default_limits),
    queryModels: a,
    runbooks: u(e.runbooks, H)
  };
}
function ue(t) {
  const e = c(t), a = s(e.code);
  return a ? {
    state: S(e.state),
    code: a,
    message: s(e.message),
    cardId: s(e.card_id),
    runbookId: s(e.runbook_id)
  } : null;
}
function he(t, e) {
  if (e.cardIds.length === 0) return t;
  const a = /* @__PURE__ */ new Map();
  return e.cardIds.forEach((r, n) => a.set(r, n)), [...t].sort((r, n) => (a.get(r.id) ?? Number.MAX_SAFE_INTEGER) - (a.get(n.id) ?? Number.MAX_SAFE_INTEGER));
}
function pe(t) {
  const e = c(t), a = c(e.data), r = c(e.meta), n = ce(r.contracts), o = he(u(a.cards, ne), n), i = {};
  for (const [h, p] of Object.entries(c(a.tables))) i[h] = de(p, h);
  const m = { ...n.queryModels };
  for (const [h, p] of Object.entries(c(r.query_models))) {
    const g = P(p);
    g && (m[h] = g);
  }
  return {
    data: {
      cards: o,
      tables: i,
      alerts: u(a.alerts, ue),
      runbooks: u(a.runbooks, H),
      summary: R(a.summary)
    },
    meta: {
      channel: s(r.channel),
      generatedAt: s(r.generated_at),
      refreshIntervalMs: b(r.refresh_interval_ms, 3e4),
      latencyTargetMs: b(r.latency_target_ms, 0),
      degraded: r.degraded === !0,
      degradedReasons: u(r.degraded_reasons, (h) => {
        const p = c(h), g = s(p.component), A = s(p.message);
        return !g && !A ? null : {
          component: g,
          message: A
        };
      }),
      familyReport: c(r.family_report),
      scope: v(r.scope, { omitEmptyValues: !0 }),
      metrics: u(r.metrics, (h) => {
        const p = c(h), g = s(p.key);
        return g ? {
          key: g,
          unit: s(p.unit),
          sloP95Ms: p.slo_p95_ms === void 0 ? null : b(p.slo_p95_ms)
        } : null;
      }),
      queryModels: m,
      contracts: {
        ...n,
        queryModels: m
      }
    }
  };
}
function ge(t, e = {}) {
  const a = new URLSearchParams(), r = [
    ["channel", s(e.channel)],
    ["tenant_id", s(e.tenantId)],
    ["org_id", s(e.orgId)],
    ["overdue_limit", e.overdueLimit != null ? String(e.overdueLimit) : ""],
    ["blocked_limit", e.blockedLimit != null ? String(e.blockedLimit) : ""]
  ];
  for (const [n, o] of r) o && a.set(n, o);
  return Y(t, a, { preserveAbsolute: !0 });
}
function be(t) {
  const e = s(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  return { async fetchDashboard(r = {}) {
    if (!e) throw new y({
      message: "Translation dashboard endpoint is not configured",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const n = ge(e, r);
    if (!a) throw new y({
      message: "Fetch implementation is not available",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const o = await a(n, { headers: { Accept: "application/json" } });
    if (!o.ok) {
      const i = await X(o.clone());
      throw new y({
        message: i.message || await G(o, "Failed to load translation dashboard"),
        status: o.status,
        code: i.textCode,
        requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
        traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
        metadata: i.metadata
      });
    }
    return pe(await o.json());
  } };
}
function fe(t) {
  const e = Math.max(0, t.intervalMs ?? 3e4);
  let a = null, r = null;
  const n = async () => r || (r = (async () => {
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
      await n(), e > 0 && a == null && (a = globalThis.setInterval(() => {
        n().catch(() => {
        });
      }, e));
    },
    stop() {
      a != null && (globalThis.clearInterval(a), a = null);
    },
    refresh: n,
    isRunning() {
      return a != null;
    }
  };
}
function f(t) {
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
}, me = {
  top_overdue_assignments: "Top Overdue Assignments",
  blocked_families: "Blocked Families"
}, ye = {
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
}, xe = {
  "translations.dashboard.my_tasks": "Actor Task Count",
  "translations.dashboard.needs_review": "Review Queue Depth",
  "translations.dashboard.overdue_tasks": "Overdue Assignment Count",
  "translations.dashboard.blocked_families": "Blocked Family Count",
  "translations.dashboard.missing_required_locales": "Missing Locale Count"
};
function ve(t, e) {
  return _[t]?.label || e || f(t);
}
function ke(t, e) {
  return _[t]?.shortLabel || _[t]?.label || e || f(t);
}
function T(t, e) {
  return me[t] || e || f(t);
}
function L(t, e) {
  return k[t]?.label || e || f(t);
}
function C(t, e) {
  return k[t]?.shortLabel || k[t]?.label || e || f(t);
}
function E(t) {
  return k[t]?.icon || "";
}
var M = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors", $e = "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors";
function U(t) {
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
function we(t) {
  return xe[t] || f(t);
}
function K(t, e, a = "") {
  const r = l(t);
  return e?.href ? `<a class="${d(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${d(e.href)}">${r}</a>` : `<span class="${d(a)}">${r}</span>`;
}
function _e(t) {
  return [...t].sort((e, a) => {
    const r = (n) => n === "primary" ? 0 : 1;
    return r(e.relation) - r(a.relation);
  });
}
function V(t, e = "No drill-downs") {
  return t.length === 0 ? `<span class="text-gray-400">${l(e)}</span>` : _e(t).map((a) => {
    const r = a.label || "Open";
    return a.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${d(a.key || r.toLowerCase())}" href="${d(a.href)}">${l(r)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${l(r)}</span>`;
  }).join("");
}
function Te(t) {
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
function Le(t, e) {
  if (!t.runbookId) return "";
  const a = e.find((i) => i.id === t.runbookId);
  if (!a?.href) return "";
  const r = C(t.runbookId, a.title), n = E(t.runbookId), o = L(t.runbookId, a.title);
  return `
    <a
      href="${d(a.href)}"
      class="${$e}"
      data-dashboard-card-runbook="${d(t.id)}"
      title="${d(a.description || o)}"
    >
      ${n || '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'}
      <span>${l(r)}</span>
    </a>
  `;
}
function Ce(t, e = []) {
  const a = Object.entries(t.breakdown).map(([m, h]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${l(f(m))}</span>
        <span class="font-semibold text-gray-900">${l(String(h))}</span>
      </li>
    `).join(""), r = ke(t.id, t.label), n = ve(t.id, t.label), o = we(t.metricKey), i = Le(t, e);
  return `
    <article class="${x} p-4 shadow-sm flex flex-col" data-dashboard-card="${d(t.id)}">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 truncate" title="${d(n)}">${l(r)}</p>
      </div>
      <div class="mt-2">
        <p class="text-3xl font-semibold tracking-tight text-gray-900">${l(String(t.count))}</p>
        <span class="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${d(Be(t.alert.state))}">
          ${l(t.alert.message || t.alert.state)}
        </span>
      </div>
      <p class="mt-3 text-sm leading-6 text-gray-600">${l(t.description)}</p>
      ${a ? `<ul class="mt-4 space-y-2">${a}</ul>` : ""}
      <div class="mt-auto pt-4 flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          ${Te(t)}
          <span class="text-xs text-gray-400" title="${d(t.metricKey)}">${l(o)}</span>
        </div>
        ${i ? `<div class="border-t border-gray-100 pt-3">${i}</div>` : ""}
      </div>
    </article>
  `;
}
function Ee(t) {
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
              <div class="font-medium text-gray-900">${K(s(e.source_title) || s(e.assignment_id), e.links.assignment)}</div>
              <div class="mt-1">${U(s(e.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${l(`${s(e.source_locale).toUpperCase()} -> ${s(e.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${l(f(s(e.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${l(f(s(e.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${l(`${b(e.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${V(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function Re(t) {
  const e = t.blockerCodes || [], a = t.blockerLabels || {};
  return e.length === 0 ? "" : e.map((r) => {
    const n = a[r] || f(r);
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${r === "missing_locale" ? "bg-amber-100 text-amber-800" : r === "pending_review" ? "bg-sky-100 text-sky-800" : r === "outdated_source" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-700"}" data-blocker-code="${d(r)}">${l(n)}</span>`;
  }).join("");
}
function Se(t) {
  const e = t.affectedLocales || [];
  if (e.length === 0) return "";
  const a = 3, r = e.slice(0, a), n = e.length - a;
  return `<div class="flex flex-wrap items-center gap-1">${r.map((o) => `<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">${l(o.toUpperCase())}</span>`).join("")}${n > 0 ? `<span class="inline-flex items-center text-xs text-gray-500">+${n}</span>` : ""}</div>`;
}
function Ae(t) {
  const e = t.reasonData;
  if (!e || e.state === "available") return "";
  const a = e.state === "degraded", r = a ? "text-amber-500" : "text-gray-400", n = a ? `<svg class="h-3.5 w-3.5 ${r}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>` : `<svg class="h-3.5 w-3.5 ${r}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  return `
    <span class="inline-flex items-center gap-1 text-xs text-gray-500" title="${d(e.message || "Reason data is " + e.state)}">
      ${n}
      <span class="sr-only">${l(e.message || "Reason data " + e.state)}</span>
    </span>
  `;
}
function Me(t) {
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
          <tr data-family-row="${d(s(e.family_id))}">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${K(s(e.content_type) || "Family", e.links.family)}</div>
              <div class="mt-1 flex items-center gap-2">
                ${U(s(e.family_id))}
                ${Ae(e)}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">${Re(e)}</div>
            </td>
            <td class="px-4 py-3">
              ${Se(e)}
            </td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${l(String(b(e.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${l(String(b(e.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${V(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function I(t, e = [], a = {}) {
  const r = t.id === "top_overdue_assignments" ? Ee(t) : Me(t), n = T(t.id, t.label), o = {
    top_overdue_assignments: "translations.dashboard.overdue_triage",
    blocked_families: "translations.dashboard.publish_blockers"
  }[t.id], i = o ? e.find((m) => m.id === o) : void 0;
  return a.embedded ? `
      <div data-dashboard-table="${d(t.id)}">
        <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-white">
          <div>
            <p class="text-xs text-gray-500">Showing ${l(String(t.rows.length))} of ${l(String(t.total))}</p>
          </div>
          ${i?.href ? `
            <a
              href="${d(i.href)}"
              class="${M}"
              data-dashboard-table-runbook="${d(t.id)}"
              title="${d(i.description || L(o || "", i.title))}"
            >
              ${E(o || "")}
              <span>${l(C(o || "", i.title))}</span>
            </a>
          ` : ""}
        </header>
        <div class="overflow-x-auto">${r}</div>
      </div>
    ` : `
    <section class="overflow-hidden ${x} shadow-sm" data-dashboard-table="${d(t.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${l(n)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing ${l(String(t.rows.length))} of ${l(String(t.total))}</p>
        </div>
        ${i?.href ? `
          <a
            href="${d(i.href)}"
            class="${M}"
            data-dashboard-table-runbook="${d(t.id)}"
            title="${d(i.description || L(o || "", i.title))}"
          >
            ${E(o || "")}
            <span>${l(C(o || "", i.title))}</span>
          </a>
        ` : ""}
      </header>
      <div class="overflow-x-auto">${r}</div>
    </section>
  `;
}
function Ie(t, e, a) {
  const r = Object.keys(t);
  return r.length === 0 ? "" : r.length === 1 ? `<section class="space-y-4">${I(t[r[0]], e)}</section>` : `
    <section class="${x} shadow-sm overflow-hidden" data-dashboard-tables="true">
      <nav class="flex border-b border-gray-200 bg-gray-50 px-4" role="tablist" aria-label="Data tables">
        ${r.map((n) => {
    const o = ye[n] || {
      label: T(n, n),
      shortLabel: T(n, n),
      icon: ""
    }, i = n === a;
    return `
        <button type="button"
                class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${i ? "text-blue-600 border-blue-600" : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"}"
                data-table-tab="${d(n)}"
                role="tab"
                aria-selected="${i}"
                aria-controls="table-panel-${d(n)}">
          ${o.icon}
          <span>${l(o.shortLabel)}</span>
          <span class="ml-1 px-2 py-0.5 text-xs rounded-full ${i ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}">
            ${t[n]?.total || 0}
          </span>
        </button>
      `;
  }).join("")}
      </nav>
      <div class="p-0">
        ${r.map((n) => {
    const o = n === a;
    return `
        <div id="table-panel-${d(n)}"
             role="tabpanel"
             ${o ? "" : "hidden"}
             data-table-panel="${d(n)}">
          ${I(t[n], e, { embedded: !0 })}
        </div>
      `;
  }).join("")}
      </div>
    </section>
  `;
}
function De(t) {
  return t.length === 0 ? "" : `
    <section class="${x} p-4 shadow-sm" data-dashboard-runbooks="true">
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
function je(t) {
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
function Be(t) {
  return te(je(t));
}
function Oe(t, e = !1) {
  const a = t?.meta.generatedAt ? new Date(t.meta.generatedAt).toLocaleString() : "Unavailable";
  return `
    <section class="${x} px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="${ae}">Manager Monitoring</p>
          <h2 class="${Z} text-xl mt-2">Queue health and publish blockers</h2>
          <p class="${W} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${l(e ? "Refreshing dashboard…" : `Last updated ${a}`)}
          </span>
          <button type="button" class="${z}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${e ? "disabled" : ""}>
            ${l(e ? "Refreshing…" : "Refresh dashboard")}
          </button>
        </div>
      </div>
    </section>
  `;
}
function qe(t) {
  const e = t.data.runbooks[0], a = e?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${d(e.href)}">${l(e.title || "Open runbook")}</a>` : "";
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
function ze(t) {
  const e = t instanceof y ? t.requestId : void 0, a = t instanceof y ? t.traceId : void 0, r = [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return $({
    tag: "section",
    containerClass: `${j} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Latest refresh failed",
    titleClass: N,
    message: t instanceof Error ? t.message : "Failed to load translation dashboard",
    messageClass: `${w} mt-2`,
    metadata: r,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    role: "alert",
    attributes: { "data-dashboard-inline-error": "true" }
  });
}
function Ne(t) {
  const e = t instanceof Error ? t.message : "Failed to load translation dashboard", a = t instanceof y ? t.requestId : void 0, r = t instanceof y ? t.traceId : void 0, n = [a ? `Request ${a}` : "", r ? `Trace ${r}` : ""].filter(Boolean).join(" • ");
  return $({
    tag: "section",
    containerClass: `${j} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Translation dashboard unavailable",
    titleClass: N,
    heading: "Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.",
    headingTag: "p",
    headingClass: `${w} mt-2`,
    message: e,
    messageClass: `${w} mt-2`,
    metadata: n,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" class="${ee}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: "alert",
    attributes: { "data-dashboard-error": "true" }
  });
}
function Fe() {
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
    containerClass: `${J} p-5`,
    attributes: { "data-dashboard-loading": "true" },
    ariaLive: "polite"
  });
}
var He = class extends Q {
  constructor(t) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.activeTableTab = "top_overdue_assignments", this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...t
    }, this.client = be(t);
  }
  mount(t) {
    if (this.container = t, !s(this.config.endpoint)) {
      this.state = "error", t.innerHTML = Fe();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, t.innerHTML = D(), this.refreshController = fe({
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
        this.state = "error", this.container && (this.container.innerHTML = Ne(e), this.bindActions());
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
    const t = this.payload, e = t.data.runbooks, a = t.data.cards.map((i) => Ce(i, e)).join(""), r = Object.values(t.data.summary).every((i) => i === 0) && Object.values(t.data.tables).every((i) => i.rows.length === 0), n = t.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${l(t.meta.degradedReasons.map((i) => `${i.component}: ${i.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", o = this.lastError ? ze(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${Oe(t, this.refreshing)}
        ${o}
        ${n}
        ${r ? qe(t) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${a}</section>
            ${Ie(t.data.tables, e, this.activeTableTab)}
          `}
        ${De(t.data.runbooks)}
      </div>
    `, this.bindActions();
  }
  bindActions() {
    !this.container || typeof this.container.querySelectorAll != "function" || (this.container.querySelectorAll("[data-dashboard-refresh-button]").forEach((t) => {
      t.addEventListener("click", () => {
        this.refresh().catch(() => {
        });
      });
    }), this.container.querySelectorAll("[data-table-tab]").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.dataset.tableTab;
        e && e !== this.activeTableTab && (this.activeTableTab = e, this.render());
      });
    }), this.container.querySelectorAll("[data-copy-uuid]").forEach((t) => {
      t.addEventListener("click", async (e) => {
        e.preventDefault(), e.stopPropagation();
        const a = t.dataset.copyUuid;
        if (a)
          try {
            await navigator.clipboard.writeText(a);
            const r = t.innerHTML;
            t.innerHTML = `
            <span class="text-green-600">Copied!</span>
            <svg class="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          `, setTimeout(() => {
              t.innerHTML = r;
            }, 1500);
          } catch {
            console.warn("Failed to copy UUID");
          }
      });
    }));
  }
};
function We(t, e = {}) {
  if (!t) return null;
  const a = new He({
    endpoint: e.endpoint ?? t.dataset.endpoint ?? "",
    queueEndpoint: e.queueEndpoint ?? t.dataset.queueEndpoint ?? "",
    familiesEndpoint: e.familiesEndpoint ?? t.dataset.familiesEndpoint ?? "",
    refreshInterval: e.refreshInterval ?? b(t.dataset.refreshInterval, 3e4),
    title: e.title ?? t.dataset.title ?? "Translation Dashboard",
    fetch: e.fetch
  });
  return a.mount(t), a;
}
export {
  He as TranslationDashboardPage,
  y as TranslationDashboardRequestError,
  ge as buildTranslationDashboardURL,
  be as createTranslationDashboardClient,
  fe as createTranslationDashboardRefreshController,
  We as initTranslationDashboardPage,
  ne as normalizeTranslationDashboardCard,
  F as normalizeTranslationDashboardLink,
  P as normalizeTranslationDashboardQueryModel,
  pe as normalizeTranslationDashboardResponse,
  H as normalizeTranslationDashboardRunbook,
  de as normalizeTranslationDashboardTable,
  le as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
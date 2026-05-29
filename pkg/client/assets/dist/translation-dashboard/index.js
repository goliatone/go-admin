import { escapeAttribute as l, escapeHTML as i } from "../shared/html.js";
import { readHTTPError as F } from "../shared/transport/http-client.js";
import { extractStructuredError as H } from "../toast/error-helpers.js";
import { buildEndpointURL as P } from "../shared/query-state/url-state.js";
import { StatefulController as K } from "../shared/stateful-controller.js";
import { asNumberish as m, asRecord as d, asString as r } from "../shared/coercion.js";
import { $ as L, C as U, E as V, S as X, _ as $, d as v, g as E, h as R, i as G, m as A, p as I, s as M, v as S, x as Y } from "../chunks/translation-shared-kfjHEDZW.js";
import { normalizeNumberRecord as w, normalizeStringRecord as x } from "../shared/record-normalization.js";
import { c as k, s as Q } from "../chunks/ui-states-1McZ5upU.js";
var y = class extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationDashboardRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
};
function c(t, e) {
  if (!Array.isArray(t)) return [];
  const a = [];
  for (const s of t) {
    const n = e(s);
    n && a.push(n);
  }
  return a;
}
function _(t) {
  const e = r(t).toLowerCase();
  switch (e) {
    case "warning":
    case "critical":
    case "degraded":
      return e;
    default:
      return "ok";
  }
}
function j(t) {
  if (!t || typeof t != "object") return null;
  const e = t;
  return {
    href: r(e.href),
    group: r(e.group),
    route: r(e.route),
    resolverKey: r(e.resolver_key),
    params: x(e.params, { omitEmptyValues: !0 }),
    query: x(e.query, { omitEmptyValues: !0 }),
    key: r(e.key),
    label: r(e.label),
    description: r(e.description),
    relation: r(e.relation),
    tableId: r(e.table_id),
    entityType: r(e.entity_type),
    entityId: r(e.entity_id)
  };
}
function J(t) {
  const e = d(t), a = r(e.key);
  return a ? {
    key: a,
    label: r(e.label),
    description: r(e.description),
    relation: r(e.relation),
    group: r(e.group),
    route: r(e.route),
    resolverKey: r(e.resolver_key),
    entityType: r(e.entity_type)
  } : null;
}
function W(t) {
  const e = d(t), a = r(e.id);
  if (!a) return null;
  const s = d(e.alert);
  return {
    id: a,
    label: r(e.label),
    description: r(e.description),
    count: m(e.count),
    breakdown: w(e.breakdown),
    alert: {
      state: _(s.state),
      message: r(s.message)
    },
    drilldown: j(e.drilldown),
    metricKey: r(e.metric_key),
    runbookId: r(e.runbook_id)
  };
}
function Z(t) {
  const e = d(t), a = r(e.code);
  return a ? {
    code: a,
    label: r(e.label) || b(a),
    count: m(e.count),
    affectedLocales: c(e.affected_locales, (s) => r(s) || null)
  } : null;
}
function ee(t) {
  const e = d(t), a = r(e.state);
  if (!(!a || a !== "available" && a !== "unavailable" && a !== "degraded"))
    return {
      state: a,
      message: r(e.message)
    };
}
function te(t) {
  const e = d(t);
  if (Object.keys(e).length === 0) return null;
  const a = {};
  for (const [p, g] of Object.entries(d(e.links))) {
    const f = j(g);
    f && (a[p] = f);
  }
  const s = c(e.blocker_codes, (p) => r(p) || null), n = {};
  for (const [p, g] of Object.entries(d(e.blocker_labels))) {
    const f = r(g);
    f && (n[p] = f);
  }
  const o = c(e.reason_breakdown, Z), u = c(e.affected_locales, (p) => r(p) || null), h = ee(e.reason_data);
  return {
    ...e,
    links: a,
    blockerCodes: s.length > 0 ? s : void 0,
    blockerLabels: Object.keys(n).length > 0 ? n : void 0,
    reasonBreakdown: o.length > 0 ? o : void 0,
    affectedLocales: u.length > 0 ? u : void 0,
    reasonData: h
  };
}
function ae(t, e = "") {
  const a = d(t), s = c(a.rows, te);
  return {
    id: r(a.id) || e,
    label: r(a.label) || e,
    total: m(a.total, s.length),
    limit: m(a.limit, s.length),
    rows: s
  };
}
function D(t) {
  const e = d(t), a = r(e.id);
  return a ? {
    id: a,
    title: r(e.title),
    description: r(e.description),
    route: r(e.route),
    resolverKey: r(e.resolver_key),
    href: r(e.href),
    query: x(e.query, { omitEmptyValues: !0 })
  } : null;
}
function O(t) {
  const e = d(t), a = r(e.id);
  if (!a) return null;
  const s = {};
  for (const [n, o] of Object.entries(d(e.drilldown_links))) {
    const u = J(o);
    u && (s[n] = u);
  }
  return {
    id: a,
    description: r(e.description),
    scopeFields: c(e.scope_fields, (n) => r(n) || null),
    stableSortKeys: c(e.stable_sort_keys, (n) => r(n) || null),
    indexHints: c(e.index_hints, (n) => r(n) || null),
    supportedFilters: c(e.supported_filters, (n) => r(n) || null),
    defaultLimit: m(e.default_limit),
    drilldownRoute: r(e.drilldown_route),
    queueRoute: r(e.queue_route),
    apiRoute: r(e.api_route),
    resolverKeys: c(e.resolver_keys, (n) => r(n) || null),
    drilldownLinks: s
  };
}
function se(t) {
  const e = d(t), a = {};
  for (const [s, n] of Object.entries(d(e.query_models))) {
    const o = O(n);
    o && (a[s] = o);
  }
  return {
    cardIds: c(e.card_ids, (s) => r(s) || null),
    tableIds: c(e.table_ids, (s) => r(s) || null),
    alertStates: c(e.alert_states, (s) => _(s)),
    defaultLimits: w(e.default_limits),
    queryModels: a,
    runbooks: c(e.runbooks, D)
  };
}
function re(t) {
  const e = d(t), a = r(e.code);
  return a ? {
    state: _(e.state),
    code: a,
    message: r(e.message),
    cardId: r(e.card_id),
    runbookId: r(e.runbook_id)
  } : null;
}
function ne(t, e) {
  if (e.cardIds.length === 0) return t;
  const a = /* @__PURE__ */ new Map();
  return e.cardIds.forEach((s, n) => a.set(s, n)), [...t].sort((s, n) => (a.get(s.id) ?? Number.MAX_SAFE_INTEGER) - (a.get(n.id) ?? Number.MAX_SAFE_INTEGER));
}
function oe(t) {
  const e = d(t), a = d(e.data), s = d(e.meta), n = se(s.contracts), o = ne(c(a.cards, W), n), u = {};
  for (const [p, g] of Object.entries(d(a.tables))) u[p] = ae(g, p);
  const h = { ...n.queryModels };
  for (const [p, g] of Object.entries(d(s.query_models))) {
    const f = O(g);
    f && (h[p] = f);
  }
  return {
    data: {
      cards: o,
      tables: u,
      alerts: c(a.alerts, re),
      runbooks: c(a.runbooks, D),
      summary: w(a.summary)
    },
    meta: {
      channel: r(s.channel),
      generatedAt: r(s.generated_at),
      refreshIntervalMs: m(s.refresh_interval_ms, 3e4),
      latencyTargetMs: m(s.latency_target_ms, 0),
      degraded: s.degraded === !0,
      degradedReasons: c(s.degraded_reasons, (p) => {
        const g = d(p), f = r(g.component), T = r(g.message);
        return !f && !T ? null : {
          component: f,
          message: T
        };
      }),
      familyReport: d(s.family_report),
      scope: x(s.scope, { omitEmptyValues: !0 }),
      metrics: c(s.metrics, (p) => {
        const g = d(p), f = r(g.key);
        return f ? {
          key: f,
          unit: r(g.unit),
          sloP95Ms: g.slo_p95_ms === void 0 ? null : m(g.slo_p95_ms)
        } : null;
      }),
      queryModels: h,
      contracts: {
        ...n,
        queryModels: h
      }
    }
  };
}
function ie(t, e = {}) {
  const a = new URLSearchParams(), s = [
    ["channel", r(e.channel)],
    ["tenant_id", r(e.tenantId)],
    ["org_id", r(e.orgId)],
    ["overdue_limit", e.overdueLimit != null ? String(e.overdueLimit) : ""],
    ["blocked_limit", e.blockedLimit != null ? String(e.blockedLimit) : ""]
  ];
  for (const [n, o] of s) o && a.set(n, o);
  return P(t, a, { preserveAbsolute: !0 });
}
function le(t) {
  const e = r(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  return { async fetchDashboard(s = {}) {
    if (!e) throw new y({
      message: "Translation dashboard endpoint is not configured",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const n = ie(e, s);
    if (!a) throw new y({
      message: "Fetch implementation is not available",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const o = await a(n, { headers: { Accept: "application/json" } });
    if (!o.ok) {
      const u = await H(o.clone());
      throw new y({
        message: u.message || await F(o, "Failed to load translation dashboard"),
        status: o.status,
        code: u.textCode,
        requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
        traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
        metadata: u.metadata
      });
    }
    return oe(await o.json());
  } };
}
function de(t) {
  const e = Math.max(0, t.intervalMs ?? 3e4);
  let a = null, s = null;
  const n = async () => s || (s = (async () => {
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
function b(t) {
  return t.replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
var ce = {
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
}, ue = {
  top_overdue_assignments: "Top Overdue Assignments",
  blocked_families: "Blocked Families"
}, he = {
  "translations.dashboard.overdue_triage": "Overdue Assignment Triage",
  "translations.dashboard.review_backlog": "Reviewer Backlog Triage",
  "translations.dashboard.publish_blockers": "Publish Blocker Remediation"
}, pe = {
  "translations.dashboard.my_tasks": "Actor Task Count",
  "translations.dashboard.needs_review": "Review Queue Depth",
  "translations.dashboard.overdue_tasks": "Overdue Assignment Count",
  "translations.dashboard.blocked_families": "Blocked Family Count",
  "translations.dashboard.missing_required_locales": "Missing Locale Count"
};
function ge(t, e) {
  return ce[t]?.label || e || b(t);
}
function fe(t, e) {
  return ue[t] || e || b(t);
}
function B(t, e) {
  return he[t] || e || b(t);
}
function me(t) {
  return pe[t] || b(t);
}
function be(t) {
  if (t < 1e3) return `${t}ms`;
  const e = Math.floor(t / 1e3);
  return e < 60 ? `${e}s` : `${Math.floor(e / 60)}m`;
}
function ye(t) {
  return t <= 0 ? "N/A" : t < 1e3 ? `${t}ms` : `${(t / 1e3).toFixed(1)}s`;
}
function q(t, e, a = "") {
  const s = i(t);
  return e?.href ? `<a class="${l(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${l(e.href)}">${s}</a>` : `<span class="${l(a)}">${s}</span>`;
}
function xe(t) {
  return [...t].sort((e, a) => {
    const s = (n) => n === "primary" ? 0 : 1;
    return s(e.relation) - s(a.relation);
  });
}
function z(t, e = "No drill-downs") {
  return t.length === 0 ? `<span class="text-gray-400">${i(e)}</span>` : xe(t).map((a) => {
    const s = a.label || "Open";
    return a.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${l(a.key || s.toLowerCase())}" href="${l(a.href)}">${i(s)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${i(s)}</span>`;
  }).join("");
}
function ve(t) {
  return t.drilldown?.href ? `
    <a
      href="${l(t.drilldown.href)}"
      class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
      data-dashboard-drilldown="${l(t.id)}"
      title="${l(t.drilldown.description || t.drilldown.label || "Open drilldown")}"
    >
      <span>${i(t.drilldown.label || "Open")}</span>
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </a>
  ` : '<span class="text-xs text-gray-400">No drilldown available</span>';
}
function ke(t, e) {
  if (!t.runbookId) return "";
  const a = e.find((s) => s.id === t.runbookId);
  return a?.href ? `
    <a
      href="${l(a.href)}"
      class="inline-flex items-center gap-1 text-xs text-sky-700 hover:text-sky-900 hover:underline"
      data-dashboard-card-runbook="${l(t.id)}"
      title="${l(a.description || a.title)}"
    >
      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <span>${i(B(t.runbookId, a.title))}</span>
    </a>
  ` : "";
}
function $e(t, e = []) {
  const a = Object.entries(t.breakdown).map(([u, h]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${i(b(u))}</span>
        <span class="font-semibold text-gray-900">${i(String(h))}</span>
      </li>
    `).join(""), s = ge(t.id, t.label), n = me(t.metricKey), o = ke(t, e);
  return `
    <article class="${v} p-4 shadow-sm flex flex-col" data-dashboard-card="${l(t.id)}">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">${i(s)}</p>
          <p class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${i(String(t.count))}</p>
        </div>
        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${l(Ie(t.alert.state))}">
          ${i(t.alert.message || t.alert.state)}
        </span>
      </div>
      <p class="mt-3 text-sm leading-6 text-gray-600">${i(t.description)}</p>
      ${a ? `<ul class="mt-4 space-y-2">${a}</ul>` : ""}
      <div class="mt-auto pt-4 flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          ${ve(t)}
          <span class="text-xs text-gray-400" title="${l(t.metricKey)}">${i(n)}</span>
        </div>
        ${o ? `<div class="border-t border-gray-100 pt-3">${o}</div>` : ""}
      </div>
    </article>
  `;
}
function we(t) {
  return t.length === 0 ? "" : `
    <section class="space-y-3" data-dashboard-alerts="true">
      ${t.map((e) => `
        <div class="rounded-xl border px-4 py-3 text-sm ${l(Me(e.state))}" role="${l(e.state === "critical" ? "alert" : "status")}">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-semibold">${i(e.code)}</p>
              <p class="mt-1">${i(e.message)}</p>
            </div>
            ${e.runbookId ? `<span class="text-xs uppercase tracking-[0.22em]">${i(e.runbookId)}</span>` : ""}
          </div>
        </div>
      `).join("")}
    </section>
  `;
}
function _e(t) {
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
              <div class="font-medium text-gray-900">${q(r(e.source_title) || r(e.assignment_id), e.links.assignment)}</div>
              <div class="mt-1 text-xs text-gray-500">${i(r(e.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(`${r(e.source_locale).toUpperCase()} -> ${r(e.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${i(b(r(e.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${i(b(r(e.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${i(`${m(e.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${z(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function Te(t) {
  const e = t.blockerCodes || [], a = t.blockerLabels || {};
  return e.length === 0 ? "" : e.map((s) => {
    const n = a[s] || b(s);
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${s === "missing_locale" ? "bg-amber-100 text-amber-800" : s === "pending_review" ? "bg-sky-100 text-sky-800" : s === "outdated_source" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-700"}" data-blocker-code="${l(s)}">${i(n)}</span>`;
  }).join("");
}
function Ce(t) {
  const e = t.affectedLocales || [];
  if (e.length === 0) return "";
  const a = 3, s = e.slice(0, a), n = e.length - a;
  return `<div class="flex flex-wrap items-center gap-1">${s.map((o) => `<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">${i(o.toUpperCase())}</span>`).join("")}${n > 0 ? `<span class="inline-flex items-center text-xs text-gray-500">+${n}</span>` : ""}</div>`;
}
function Le(t) {
  const e = t.reasonData;
  if (!e || e.state === "available") return "";
  const a = e.state === "degraded", s = a ? "text-amber-500" : "text-gray-400", n = a ? `<svg class="h-3.5 w-3.5 ${s}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>` : `<svg class="h-3.5 w-3.5 ${s}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  return `
    <span class="inline-flex items-center gap-1 text-xs text-gray-500" title="${l(e.message || "Reason data is " + e.state)}">
      ${n}
      <span class="sr-only">${i(e.message || "Reason data " + e.state)}</span>
    </span>
  `;
}
function Ee(t) {
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
          <tr data-family-row="${l(r(e.family_id))}">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${q(r(e.family_id), e.links.family)}</div>
              <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
                <span>${i(r(e.content_type))}</span>
                ${Le(e)}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">${Te(e)}</div>
            </td>
            <td class="px-4 py-3">
              ${Ce(e)}
            </td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${i(String(m(e.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${i(String(m(e.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${z(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function Re(t, e = []) {
  const a = t.id === "top_overdue_assignments" ? _e(t) : Ee(t), s = fe(t.id, t.label), n = {
    top_overdue_assignments: "translations.dashboard.overdue_triage",
    blocked_families: "translations.dashboard.publish_blockers"
  }[t.id], o = n ? e.find((u) => u.id === n) : void 0;
  return `
    <section class="overflow-hidden ${v} shadow-sm" data-dashboard-table="${l(t.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${i(s)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing ${i(String(t.rows.length))} of ${i(String(t.total))}</p>
        </div>
        ${o?.href ? `
          <a
            href="${l(o.href)}"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            data-dashboard-table-runbook="${l(t.id)}"
            title="${l(o.description || o.title)}"
          >
            <span>${i(B(n || "", o.title))}</span>
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </a>
        ` : ""}
      </header>
      <div class="overflow-x-auto">${a}</div>
    </section>
  `;
}
function Ae(t) {
  return t.length === 0 ? "" : `
    <section class="${v} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${t.map((e) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${e.href ? `<a class="hover:underline" href="${l(e.href)}">${i(e.title)}</a>` : i(e.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${i(e.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function N(t) {
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
function Ie(t) {
  return L(N(t));
}
function Me(t) {
  return `border ${L(N(t))}`;
}
function Se(t) {
  const e = Object.entries(t.meta.scope).filter(([, n]) => n).map(([n, o]) => `${b(n)}: ${o}`), a = be(t.meta.refreshIntervalMs), s = ye(t.meta.latencyTargetMs);
  return `
    <section class="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 shadow-sm" data-dashboard-meta="true">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3 text-xs">
          <span class="inline-flex items-center gap-1.5 rounded-md bg-gray-700/50 px-2 py-1 text-gray-300">
            <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span class="font-medium text-white">${i(t.meta.channel || "default")}</span>
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-md bg-gray-700/50 px-2 py-1 text-gray-300" title="Auto-refresh interval">
            <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>${i(a)}</span>
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-md bg-gray-700/50 px-2 py-1 text-gray-300" title="Latency target (p95)">
            <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${i(s)}</span>
          </span>
        </div>
        ${e.length > 0 ? `
          <span class="text-xs text-gray-400">${i(e.join(" · "))}</span>
        ` : ""}
      </div>
    </section>
  `;
}
function je(t, e = !1) {
  const a = t?.meta.generatedAt ? new Date(t.meta.generatedAt).toLocaleString() : "Unavailable";
  return `
    <section class="${v} px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="${X}">Manager Monitoring</p>
          <h2 class="${U} text-xl mt-2">Queue health and publish blockers</h2>
          <p class="${Y} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${i(e ? "Refreshing dashboard…" : `Last updated ${a}`)}
          </span>
          <button type="button" class="${M}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${e ? "disabled" : ""}>
            ${i(e ? "Refreshing…" : "Refresh dashboard")}
          </button>
        </div>
      </div>
    </section>
  `;
}
function De(t) {
  const e = t.data.runbooks[0], a = e?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${l(e.href)}">${i(e.title || "Open runbook")}</a>` : "";
  return k({
    tag: "section",
    containerClass: `${I} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No active pressure",
    titleClass: R,
    heading: "This scope is clear right now.",
    headingTag: "h3",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.",
    messageClass: `${A} mt-3 max-w-2xl leading-6`,
    actionsHtml: `
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${M}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${a}
      </div>
    `,
    attributes: { "data-dashboard-empty": "true" },
    ariaLive: "polite"
  });
}
function Oe(t) {
  const e = t instanceof y ? t.requestId : void 0, a = t instanceof y ? t.traceId : void 0, s = [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return k({
    tag: "section",
    containerClass: `${E} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Latest refresh failed",
    titleClass: S,
    message: t instanceof Error ? t.message : "Failed to load translation dashboard",
    messageClass: `${$} mt-2`,
    metadata: s,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    role: "alert",
    attributes: { "data-dashboard-inline-error": "true" }
  });
}
function Be(t) {
  const e = t instanceof Error ? t.message : "Failed to load translation dashboard", a = t instanceof y ? t.requestId : void 0, s = t instanceof y ? t.traceId : void 0, n = [a ? `Request ${a}` : "", s ? `Trace ${s}` : ""].filter(Boolean).join(" • ");
  return k({
    tag: "section",
    containerClass: `${E} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Translation dashboard unavailable",
    titleClass: S,
    heading: "Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.",
    headingTag: "p",
    headingClass: `${$} mt-2`,
    message: e,
    messageClass: `${$} mt-2`,
    metadata: n,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" class="${G}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: "alert",
    attributes: { "data-dashboard-error": "true" }
  });
}
function qe() {
  return k({
    tag: "section",
    containerClass: `${I} p-5`,
    bodyClass: "",
    contentClass: "",
    title: "Dashboard contract route is not wired.",
    titleClass: R,
    message: "Set a dashboard aggregate endpoint before initializing the dashboard client.",
    messageClass: `${A} mt-2`,
    attributes: { "data-dashboard-empty": "true" }
  });
}
function C() {
  return Q({
    tag: "section",
    text: "Loading translation dashboard aggregates...",
    showSpinner: !1,
    containerClass: `${V} p-5`,
    attributes: { "data-dashboard-loading": "true" },
    ariaLive: "polite"
  });
}
var ze = class extends K {
  constructor(t) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...t
    }, this.client = le(t);
  }
  mount(t) {
    if (this.container = t, !r(this.config.endpoint)) {
      this.state = "error", t.innerHTML = qe();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, t.innerHTML = C(), this.refreshController = de({
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
        this.state = "error", this.container && (this.container.innerHTML = Be(e), this.bindActions());
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
    if (this.lastError = null, this.refreshing = !0, this.payload ? this.render() : this.container && (this.state = "loading", this.container.innerHTML = C()), !this.refreshController) {
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
    const t = this.payload, e = t.data.runbooks, a = t.data.cards.map((h) => $e(h, e)).join(""), s = Object.values(t.data.tables).map((h) => Re(h, e)).join(""), n = Object.values(t.data.summary).every((h) => h === 0) && Object.values(t.data.tables).every((h) => h.rows.length === 0), o = t.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${i(t.meta.degradedReasons.map((h) => `${h.component}: ${h.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", u = this.lastError ? Oe(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${je(t, this.refreshing)}
        ${Se(t)}
        ${u}
        ${o}
        ${we(t.data.alerts)}
        ${n ? De(t) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${a}</section>
            <section class="grid gap-4 xl:grid-cols-2">${s}</section>
          `}
        ${Ae(t.data.runbooks)}
      </div>
    `, this.bindActions();
  }
  bindActions() {
    !this.container || typeof this.container.querySelectorAll != "function" || this.container.querySelectorAll("[data-dashboard-refresh-button]").forEach((t) => {
      t.addEventListener("click", () => {
        this.refresh().catch(() => {
        });
      });
    });
  }
};
function Ye(t, e = {}) {
  if (!t) return null;
  const a = new ze({
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
  ze as TranslationDashboardPage,
  y as TranslationDashboardRequestError,
  ie as buildTranslationDashboardURL,
  le as createTranslationDashboardClient,
  de as createTranslationDashboardRefreshController,
  Ye as initTranslationDashboardPage,
  W as normalizeTranslationDashboardCard,
  j as normalizeTranslationDashboardLink,
  O as normalizeTranslationDashboardQueryModel,
  oe as normalizeTranslationDashboardResponse,
  D as normalizeTranslationDashboardRunbook,
  ae as normalizeTranslationDashboardTable,
  te as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
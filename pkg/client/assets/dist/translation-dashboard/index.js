import { escapeAttribute as c, escapeHTML as o } from "../shared/html.js";
import { t as F } from "../chunks/icon-renderer-a2WAOpSe.js";
import { readHTTPError as oe } from "../shared/transport/http-client.js";
import { extractStructuredError as le } from "../toast/error-helpers.js";
import "../chunks/status-vocabulary-HmIBabRF.js";
import { buildEndpointURL as de, readLocationSearchParams as ce } from "../shared/query-state/url-state.js";
import { StatefulController as ue } from "../shared/stateful-controller.js";
import { asNumberish as x, asRecord as p, asString as n } from "../shared/coercion.js";
import { A as H, C as $, D as P, E as z, F as pe, N as he, O as U, P as fe, R as ge, T as G, a as S, d as be, f as _, g as me, i as xe, k as E, l as ye, n as I, o as ve, r as K, s as $e, t as V, u as w, ut as X, y as we } from "../chunks/translation-shared-Ba5eIyeA.js";
import { normalizeNumberRecord as D, normalizeStringRecord as k } from "../shared/record-normalization.js";
import { c as L, s as ke } from "../chunks/ui-states-Dk9y2u2w.js";
var v = class extends Error {
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
function O(t) {
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
function Y(t) {
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
function Te(t) {
  const e = p(t), a = n(e.key);
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
function _e(t) {
  const e = p(t), a = n(e.id);
  if (!a) return null;
  const s = p(e.alert);
  return {
    id: a,
    label: n(e.label),
    description: n(e.description),
    count: x(e.count),
    breakdown: D(e.breakdown),
    alert: {
      state: O(s.state),
      message: n(s.message)
    },
    drilldown: Y(e.drilldown),
    metricKey: n(e.metric_key),
    runbookId: n(e.runbook_id)
  };
}
function Le(t) {
  const e = p(t), a = n(e.code);
  return a ? {
    code: a,
    label: n(e.label) || m(a),
    count: x(e.count),
    affectedLocales: g(e.affected_locales, (s) => n(s) || null)
  } : null;
}
function Ee(t) {
  const e = p(t), a = n(e.state);
  if (!(!a || a !== "available" && a !== "unavailable" && a !== "degraded"))
    return {
      state: a,
      message: n(e.message)
    };
}
function Ce(t) {
  const e = p(t);
  if (Object.keys(e).length === 0) return null;
  const a = {};
  for (const [h, u] of Object.entries(p(e.links))) {
    const d = Y(u);
    d && (a[h] = d);
  }
  const s = g(e.blocker_codes, (h) => n(h) || null), r = {};
  for (const [h, u] of Object.entries(p(e.blocker_labels))) {
    const d = n(u);
    d && (r[h] = d);
  }
  const i = g(e.reason_breakdown, Le), l = g(e.affected_locales, (h) => n(h) || null), b = Ee(e.reason_data);
  return {
    ...e,
    links: a,
    blockerCodes: s.length > 0 ? s : void 0,
    blockerLabels: Object.keys(r).length > 0 ? r : void 0,
    reasonBreakdown: i.length > 0 ? i : void 0,
    affectedLocales: l.length > 0 ? l : void 0,
    reasonData: b
  };
}
function Ae(t, e = "") {
  const a = p(t), s = g(a.rows, Ce);
  return {
    id: n(a.id) || e,
    label: n(a.label) || e,
    total: x(a.total, s.length),
    limit: x(a.limit, s.length),
    rows: s
  };
}
function W(t) {
  const e = p(t), a = n(e.id);
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
function Q(t) {
  const e = p(t), a = n(e.id);
  if (!a) return null;
  const s = {};
  for (const [r, i] of Object.entries(p(e.drilldown_links))) {
    const l = Te(i);
    l && (s[r] = l);
  }
  return {
    id: a,
    description: n(e.description),
    scopeFields: g(e.scope_fields, (r) => n(r) || null),
    stableSortKeys: g(e.stable_sort_keys, (r) => n(r) || null),
    indexHints: g(e.index_hints, (r) => n(r) || null),
    supportedFilters: g(e.supported_filters, (r) => n(r) || null),
    defaultLimit: x(e.default_limit),
    drilldownRoute: n(e.drilldown_route),
    queueRoute: n(e.queue_route),
    apiRoute: n(e.api_route),
    resolverKeys: g(e.resolver_keys, (r) => n(r) || null),
    drilldownLinks: s
  };
}
function Re(t) {
  const e = p(t), a = {};
  for (const [s, r] of Object.entries(p(e.query_models))) {
    const i = Q(r);
    i && (a[s] = i);
  }
  return {
    cardIds: g(e.card_ids, (s) => n(s) || null),
    tableIds: g(e.table_ids, (s) => n(s) || null),
    alertStates: g(e.alert_states, (s) => O(s)),
    defaultLimits: D(e.default_limits),
    queryModels: a,
    runbooks: g(e.runbooks, W)
  };
}
function Se(t) {
  const e = p(t), a = n(e.code);
  return a ? {
    state: O(e.state),
    code: a,
    message: n(e.message),
    cardId: n(e.card_id),
    runbookId: n(e.runbook_id)
  } : null;
}
function Ie(t, e) {
  if (e.cardIds.length === 0) return t;
  const a = /* @__PURE__ */ new Map();
  return e.cardIds.forEach((s, r) => a.set(s, r)), [...t].sort((s, r) => (a.get(s.id) ?? Number.MAX_SAFE_INTEGER) - (a.get(r.id) ?? Number.MAX_SAFE_INTEGER));
}
function De(t) {
  const e = p(t), a = p(e.data), s = p(e.meta), r = Re(s.contracts), i = Ie(g(a.cards, _e), r), l = {};
  for (const [h, u] of Object.entries(p(a.tables))) l[h] = Ae(u, h);
  const b = { ...r.queryModels };
  for (const [h, u] of Object.entries(p(s.query_models))) {
    const d = Q(u);
    d && (b[h] = d);
  }
  return {
    data: {
      cards: i,
      tables: l,
      alerts: g(a.alerts, Se),
      runbooks: g(a.runbooks, W),
      summary: D(a.summary)
    },
    meta: {
      channel: n(s.channel),
      generatedAt: n(s.generated_at),
      refreshIntervalMs: x(s.refresh_interval_ms, 3e4),
      latencyTargetMs: x(s.latency_target_ms, 0),
      degraded: s.degraded === !0,
      degradedReasons: g(s.degraded_reasons, (h) => {
        const u = p(h), d = n(u.component), y = n(u.message);
        return !d && !y ? null : {
          component: d,
          message: y
        };
      }),
      familyReport: p(s.family_report),
      scope: k(s.scope, { omitEmptyValues: !0 }),
      metrics: g(s.metrics, (h) => {
        const u = p(h), d = n(u.key);
        return d ? {
          key: d,
          unit: n(u.unit),
          sloP95Ms: u.slo_p95_ms === void 0 ? null : x(u.slo_p95_ms)
        } : null;
      }),
      queryModels: b,
      contracts: {
        ...r,
        queryModels: b
      }
    }
  };
}
function Oe(t, e = {}) {
  const a = new URLSearchParams(), s = [
    ["channel", n(e.channel)],
    ["tenant_id", n(e.tenantId)],
    ["org_id", n(e.orgId)],
    ["overdue_limit", e.overdueLimit != null ? String(e.overdueLimit) : ""],
    ["blocked_limit", e.blockedLimit != null ? String(e.blockedLimit) : ""]
  ];
  for (const [r, i] of s) i && a.set(r, i);
  return de(t, a, { preserveAbsolute: !0 });
}
function Ne(t) {
  const e = n(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  return { async fetchDashboard(s = {}) {
    if (!e) throw new v({
      message: "Translation dashboard endpoint is not configured",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const r = Oe(e, s);
    if (!a) throw new v({
      message: "Fetch implementation is not available",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const i = await a(r, { headers: { Accept: "application/json" } });
    if (!i.ok) {
      const l = await le(i.clone());
      throw new v({
        message: l.message || await oe(i, "Failed to load translation dashboard"),
        status: i.status,
        code: l.textCode,
        requestId: i.headers.get("x-request-id") ?? i.headers.get("X-Request-ID") ?? void 0,
        traceId: i.headers.get("x-trace-id") ?? i.headers.get("x-correlation-id") ?? void 0,
        metadata: l.metadata
      });
    }
    return De(await i.json());
  } };
}
function je(t) {
  const e = Math.max(0, t.intervalMs ?? 3e4);
  let a = null, s = null;
  const r = async () => s || (s = (async () => {
    try {
      const i = await t.load();
      return t.onData?.(i), i;
    } catch (i) {
      throw t.onError?.(i), i;
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
function m(t) {
  return t.replace(/^TRANSLATIONS\.DASHBOARD\./i, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
var C = {
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
}, qe = {
  top_overdue_assignments: "Top Overdue Assignments",
  blocked_families: "Blocked Families"
}, Me = {
  top_overdue_assignments: {
    label: "Top Overdue Assignments",
    shortLabel: "Overdue",
    icon: S
  },
  blocked_families: {
    label: "Blocked Families",
    shortLabel: "Blocked",
    icon: V
  }
}, T = {
  "translations.dashboard.overdue_triage": {
    label: "Overdue Assignment Triage",
    shortLabel: "Overdue Triage",
    icon: S
  },
  "translations.dashboard.review_backlog": {
    label: "Reviewer Backlog Triage",
    shortLabel: "Review Backlog",
    icon: I
  },
  "translations.dashboard.publish_blockers": {
    label: "Publish Blocker Remediation",
    shortLabel: "Fix Blockers",
    icon: _
  }
};
function J(t, e) {
  return C[t]?.label || e || m(t);
}
function Z(t, e) {
  return C[t]?.shortLabel || C[t]?.label || e || m(t);
}
function A(t, e) {
  return qe[t] || e || m(t);
}
function N(t, e) {
  return T[t]?.label || e || m(t);
}
function j(t, e) {
  return T[t]?.shortLabel || T[t]?.label || e || m(t);
}
function q(t) {
  const e = T[t]?.icon;
  return e ? F(e, {
    size: "16px",
    extraClass: "text-current"
  }) : "";
}
function f(t, e = "", a = "16px") {
  return F(t, {
    size: a,
    extraClass: `text-current ${e}`.trim()
  });
}
function Be(t, e) {
  const a = t.trim().toLowerCase().replace(/[_-]+/g, " ");
  return a === "action required" ? "Action" : a === "needs attention" ? "Attention" : a === "healthy" || a === "ok" ? "Healthy" : a ? m(a) : e === "critical" ? "Action" : e === "warning" ? "Attention" : m(e);
}
var R = "btn btn-secondary";
function ee(t) {
  const e = t.trim();
  if (!e || e.length < 12) return `<span class="font-mono text-xs text-gray-500">${o(e)}</span>`;
  const a = `${e.slice(0, 4)}...${e.slice(-4)}`;
  return `
    <button type="button"
            class="inline-flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-gray-900 group cursor-pointer bg-transparent border-none p-0"
            data-copy-uuid="${c(e)}"
            title="Click to copy: ${c(e)}">
      <span>${o(a)}</span>
      ${f($e, "h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400", "12px")}
    </button>
  `;
}
function Fe(t) {
  if (t < 1e3) return `${t}ms`;
  const e = Math.floor(t / 1e3);
  return e < 60 ? `${e}s` : `${Math.floor(e / 60)}m`;
}
function He(t) {
  return t <= 0 ? "N/A" : t < 1e3 ? `${t}ms` : `${(t / 1e3).toFixed(1)}s`;
}
function te(t, e, a = "") {
  const s = o(t);
  return e?.href ? `<a class="${c(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${c(e.href)}">${s}</a>` : `<span class="${c(a)}">${s}</span>`;
}
function Pe(t) {
  return [...t].sort((e, a) => {
    const s = (r) => r === "primary" ? 0 : 1;
    return s(e.relation) - s(a.relation);
  });
}
function ae(t, e = "No drill-downs") {
  return t.length === 0 ? `<span class="text-gray-400">${o(e)}</span>` : Pe(t).map((a) => {
    const s = a.label || "Open";
    return a.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${c(a.key || s.toLowerCase())}" href="${c(a.href)}">${o(s)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${o(s)}</span>`;
  }).join("");
}
function ze(t) {
  return t.drilldown?.href ? `
    <a
      href="${c(t.drilldown.href)}"
      class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
      data-dashboard-drilldown="${c(t.id)}"
      title="${c(t.drilldown.description || t.drilldown.label || "Open drilldown")}"
    >
      <span>${o(t.drilldown.label || "Open")}</span>
      ${f(xe, "h-3.5 w-3.5", "14px")}
    </a>
  ` : '<span class="text-xs text-gray-400">No drilldown available</span>';
}
function Ue(t, e = []) {
  const a = Z(t.id, t.label), s = J(t.id, t.label), r = t.description ? `${s} - ${t.description}` : s;
  return `
    <article class="${$} p-4 shadow-sm flex flex-col" data-dashboard-card="${c(t.id)}" title="${c(r)}">
      <div class="flex items-start justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 truncate">${o(a)}</p>
        <span class="flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${c(re(t.alert.state))}">
          ${o(Be(t.alert.message, t.alert.state))}
        </span>
      </div>
      <div class="mt-3">
        <p class="text-3xl font-semibold tracking-tight text-gray-900">${o(String(t.count))}</p>
      </div>
      <div class="mt-auto pt-4">
        ${ze(t)}
      </div>
    </article>
  `;
}
function Ge(t) {
  const e = {
    critical: 4,
    warning: 3,
    degraded: 2,
    ok: 1
  };
  return t.reduce((a, s) => e[s.state] > e[a] ? s.state : a, "ok");
}
function Ke(t, e) {
  const a = e.find((r) => r.id === t.cardId), s = a ? J(t.cardId, a.label) : m(t.cardId);
  return `
    <div class="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/50"
         data-alert-code="${c(t.code)}"
         role="${t.state === "critical" ? "alert" : "status"}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${c(re(t.state))}">${o(s)}</span>
          <span class="text-xs font-medium text-gray-600">${o(t.state)}</span>
        </div>
        <p class="mt-1.5 text-sm text-gray-700">${o(t.message)}</p>
      </div>
      <button type="button"
              class="flex-shrink-0 p-1 rounded hover:bg-gray-200/50 transition-colors"
              data-dismiss-alert="${c(t.code)}"
              aria-label="Dismiss alert for ${o(s)}">
        ${f(ve, "h-4 w-4 text-gray-500", "16px")}
      </button>
    </div>
  `;
}
function Ve(t, e, a, s) {
  const r = t.filter((d) => !s.has(d.code));
  if (r.length === 0) return "";
  const i = Ge(r), l = r.reduce((d, y) => (d[y.state] = (d[y.state] || 0) + 1, d), {}), b = Object.entries(l).filter(([, d]) => d > 0).map(([d, y]) => `${y} ${d}`).join(", "), h = r.map((d) => {
    const y = e.find((ie) => ie.id === d.cardId), ne = y ? Z(d.cardId, y.label) : m(d.cardId);
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-white/60 text-gray-700" data-alert-card="${c(d.cardId)}">${o(ne)}</span>`;
  }).join(""), u = a ? "rotate-180" : "";
  return `
    <section class="rounded-xl border ${tt(i)} shadow-sm overflow-hidden"
             data-dashboard-alerts-section="true"
             role="region"
             aria-label="Dashboard alerts">
      <button type="button"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              data-alerts-toggle="true"
              aria-expanded="${a}">
        <div class="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          ${f(_, "h-5 w-5 flex-shrink-0", "20px")}
          <span class="text-sm font-semibold">${o(b)}</span>
          ${a ? "" : `<div class="flex items-center gap-1.5 flex-wrap">${h}</div>`}
        </div>
        ${f(K, `h-5 w-5 flex-shrink-0 transition-transform ${u}`, "20px")}
      </button>
      <div class="${a ? "" : "hidden"}" data-alerts-content="true">
        <div class="border-t border-current/20 px-4 py-3 space-y-2">
          ${r.map((d) => Ke(d, e)).join("")}
        </div>
      </div>
    </section>
  `;
}
function Xe(t) {
  return `
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <caption class="sr-only">Top overdue assignments with assignment and queue drill-down actions.</caption>
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
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
              <div class="font-medium text-gray-900">${te(n(e.source_title) || n(e.assignment_id), e.links.assignment)}</div>
              <div class="mt-1">${ee(n(e.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${o(`${n(e.source_locale).toUpperCase()} -> ${n(e.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${o(m(n(e.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${o(m(n(e.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${o(`${x(e.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${ae(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function Ye(t) {
  const e = t.blockerCodes || [], a = t.blockerLabels || {};
  if (e.length === 0) return "";
  const s = /* @__PURE__ */ new Set(), r = e.map((i) => {
    const l = a[i] || m(i);
    return s.add(l.toLowerCase()), {
      code: i,
      label: l
    };
  });
  for (const [i, l] of Object.entries(a)) {
    const b = l.toLowerCase();
    e.includes(i) || s.has(b) || (s.add(b), r.push({
      code: i,
      label: l
    }));
  }
  return r.map(({ code: i, label: l }) => `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${i === "missing_locale" ? "bg-amber-100 text-amber-800" : i === "pending_review" ? "bg-sky-100 text-sky-800" : i === "outdated_source" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-700"}" data-blocker-code="${c(i)}">${o(l)}</span>`).join("");
}
function We(t) {
  const e = t.affectedLocales || [];
  if (e.length === 0) return "";
  const a = 3, s = e.slice(0, a), r = e.length - a;
  return `<div class="flex flex-wrap items-center gap-1">${s.map((i) => `<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">${o(i.toUpperCase())}</span>`).join("")}${r > 0 ? `<span class="inline-flex items-center text-xs text-gray-500">+${r}</span>` : ""}</div>`;
}
function Qe(t) {
  const e = t.reasonData;
  if (!e || e.state === "available") return "";
  const a = e.state === "degraded", s = a ? "text-amber-500" : "text-gray-400", r = a ? f(_, `h-3.5 w-3.5 ${s}`, "14px") : f(w, `h-3.5 w-3.5 ${s}`, "14px");
  return `
    <span class="inline-flex items-center gap-1 text-xs text-gray-500" title="${c(e.message || "Reason data is " + e.state)}">
      ${r}
      <span class="sr-only">${o(e.message || "Reason data " + e.state)}</span>
    </span>
  `;
}
function Je(t) {
  return `
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <caption class="sr-only">Blocked families with family detail, blocker codes, affected locales, and drill-down actions.</caption>
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
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
              <div class="font-medium text-gray-900">${te(n(e.content_type) || "Family", e.links.family)}</div>
              <div class="mt-1 flex items-center gap-2">
                ${ee(n(e.family_id))}
                ${Qe(e)}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">${Ye(e)}</div>
            </td>
            <td class="px-4 py-3">
              ${We(e)}
            </td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${o(String(x(e.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${o(String(x(e.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${ae(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function M(t, e = [], a = {}) {
  const s = t.id === "top_overdue_assignments" ? Xe(t) : Je(t), r = A(t.id, t.label), i = {
    top_overdue_assignments: "translations.dashboard.overdue_triage",
    blocked_families: "translations.dashboard.publish_blockers"
  }[t.id], l = i ? e.find((b) => b.id === i) : void 0;
  return a.embedded ? `
      <div data-dashboard-table="${c(t.id)}">
        <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-white">
          <div>
            <p class="text-xs text-gray-500">Showing top ${o(String(t.rows.length))} of ${o(String(t.total))}</p>
          </div>
          ${l?.href ? `
            <a
              href="${c(l.href)}"
              class="${R}"
              data-dashboard-table-runbook="${c(t.id)}"
              title="${c(l.description || N(i || "", l.title))}"
            >
              ${q(i || "")}
              <span>${o(j(i || "", l.title))}</span>
            </a>
          ` : ""}
        </header>
        <div class="overflow-x-auto">${s}</div>
      </div>
    ` : `
    <section class="overflow-hidden ${$} shadow-sm" data-dashboard-table="${c(t.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">${o(r)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing top ${o(String(t.rows.length))} of ${o(String(t.total))}</p>
        </div>
        ${l?.href ? `
          <a
            href="${c(l.href)}"
            class="${R}"
            data-dashboard-table-runbook="${c(t.id)}"
            title="${c(l.description || N(i || "", l.title))}"
          >
            ${q(i || "")}
            <span>${o(j(i || "", l.title))}</span>
          </a>
        ` : ""}
      </header>
      <div class="overflow-x-auto">${s}</div>
    </section>
  `;
}
function Ze(t, e, a) {
  const s = Object.keys(t);
  return s.length === 0 ? "" : s.length === 1 ? `<section class="space-y-4">${M(t[s[0]], e)}</section>` : `
    <section class="${$} shadow-sm overflow-hidden" data-dashboard-tables="true">
      <nav class="flex border-b border-gray-200 bg-gray-50 px-4" role="tablist" aria-label="Data tables">
        ${s.map((r) => {
    const i = Me[r] || {
      label: A(r, r),
      shortLabel: A(r, r),
      icon: ""
    }, l = r === a;
    return `
        <button type="button"
                class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${l ? "text-blue-600 border-blue-600" : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"}"
                data-table-tab="${c(r)}"
                role="tab"
                aria-selected="${l}"
                aria-controls="table-panel-${c(r)}">
          ${i.icon ? f(i.icon, "h-4 w-4", "16px") : ""}
          <span>${o(i.shortLabel)}</span>
          <span class="sr-only">${o(i.label)}</span>
          <span class="ml-1 px-2 py-0.5 text-xs rounded-full ${l ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}">
            ${t[r]?.total || 0}
          </span>
        </button>
      `;
  }).join("")}
      </nav>
      <div class="p-0">
        ${s.map((r) => {
    const i = r === a;
    return `
        <div id="table-panel-${c(r)}"
             role="tabpanel"
             ${i ? "" : "hidden"}
             data-table-panel="${c(r)}">
          ${M(t[r], e, { embedded: !0 })}
        </div>
      `;
  }).join("")}
      </div>
    </section>
  `;
}
function et(t) {
  return t.length === 0 ? "" : `
    <section class="${$} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${t.map((e) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${e.href ? `<a class="hover:underline" href="${c(e.href)}">${o(e.title)}</a>` : o(e.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${o(e.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function se(t) {
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
function re(t) {
  return X(se(t));
}
function tt(t) {
  return `border ${X(se(t))}`;
}
function at(t, e = !1, a = !1) {
  const s = t?.meta.generatedAt ? new Date(t.meta.generatedAt).toLocaleString() : "Unavailable", r = t ? Object.entries(t.meta.scope).filter(([, u]) => u).filter(([u]) => u !== "actor_id").map(([u, d]) => ({
    key: m(u),
    value: String(d)
  })) : [], i = t ? Fe(t.meta.refreshIntervalMs) : "N/A", l = t ? He(t.meta.latencyTargetMs) : "N/A", b = t?.meta.channel || "default", h = a ? "rotate-180" : "";
  return `
    <section class="${$} shadow-sm overflow-hidden" data-dashboard-toolbar="true">
      <div class="px-5 py-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="${fe}">Manager Monitoring</p>
            <h2 class="${pe} text-xl mt-2">Queue health and publish blockers</h2>
            <p class="${he} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs uppercase tracking-wider text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
              ${o(e ? "Refreshing dashboard…" : `Last updated ${s}`)}
            </span>
            <button type="button" class="${R}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${e ? "disabled" : ""}>
              ${f(be, e ? "h-4 w-4 animate-spin" : "h-4 w-4", "16px")}
              ${o(e ? "Refreshing…" : "Refresh")}
            </button>
          </div>
        </div>
      </div>
      ${t ? `
        <div class="border-t border-gray-100 bg-gray-50 px-5 py-2">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Dashboard channel">
                ${f(ye, "h-3 w-3 text-gray-400", "12px")}
                <span>${o(b)}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Refresh interval: ${o(i)}">
                ${f(S, "h-3 w-3 text-gray-400", "12px")}
                <span>${o(i)}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Latency target: ${o(l)}">
                ${f(w, "h-3 w-3 text-gray-400", "12px")}
                <span>${o(l)}</span>
              </span>
            </div>
            <button type="button"
                    class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    data-meta-toggle="true"
                    aria-expanded="${a}"
                    aria-label="Toggle technical details">
              ${f(w, "h-3.5 w-3.5", "14px")}
              <span>Details</span>
              ${f(K, `h-3 w-3 transition-transform ${h}`, "12px")}
            </button>
          </div>
          <div class="${a ? "mt-3" : "hidden"}" data-meta-content="true">
            <dl class="border-t border-gray-200 pt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <div>
                <dt class="text-xs font-medium uppercase tracking-wider text-gray-500">Channel</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${o(b)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wider text-gray-500">Refresh Interval</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${o(i)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wider text-gray-500">Latency Target</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${o(l)}</dd>
              </div>
              ${r.map(({ key: u, value: d }) => `
                <div>
                  <dt class="text-xs font-medium uppercase tracking-wider text-gray-500">${o(u)}</dt>
                  <dd class="mt-1 text-xs font-medium text-gray-900 font-mono">${o(d)}</dd>
                </div>
              `).join("")}
            </dl>
          </div>
        </div>
      ` : ""}
    </section>
  `;
}
f(I, "h-5 w-5", "20px"), f(_, "h-5 w-5", "20px"), f(V, "h-5 w-5", "20px"), f(w, "h-5 w-5", "20px");
function st(t) {
  const e = t.data.runbooks[0], a = e?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${c(e.href)}">${o(e.title || "Open runbook")}</a>` : "";
  return L({
    tag: "section",
    containerClass: `${G} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No active pressure",
    titleClass: P,
    heading: "This scope is clear right now.",
    headingTag: "h3",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.",
    messageClass: `${z} mt-3 max-w-2xl leading-6`,
    actionsHtml: `
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${we}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${a}
      </div>
    `,
    attributes: { "data-dashboard-empty": "true" },
    ariaLive: "polite"
  });
}
function rt(t) {
  const e = t instanceof v ? t.requestId : void 0, a = t instanceof v ? t.traceId : void 0, s = [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return L({
    tag: "section",
    containerClass: `${U} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Latest refresh failed",
    titleClass: H,
    message: t instanceof Error ? t.message : "Failed to load translation dashboard",
    messageClass: `${E} mt-2`,
    metadata: s,
    metadataClass: "mt-2 text-xs uppercase tracking-wider text-rose-700",
    role: "alert",
    attributes: { "data-dashboard-inline-error": "true" }
  });
}
function nt(t) {
  const e = t instanceof Error ? t.message : "Failed to load translation dashboard", a = t instanceof v ? t.requestId : void 0, s = t instanceof v ? t.traceId : void 0, r = [a ? `Request ${a}` : "", s ? `Trace ${s}` : ""].filter(Boolean).join(" • ");
  return L({
    tag: "section",
    containerClass: `${U} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Translation dashboard unavailable",
    titleClass: H,
    heading: "Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.",
    headingTag: "p",
    headingClass: `${E} mt-2`,
    message: e,
    messageClass: `${E} mt-2`,
    metadata: r,
    metadataClass: "mt-2 text-xs uppercase tracking-wider text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" class="${me}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: "alert",
    attributes: { "data-dashboard-error": "true" }
  });
}
function it() {
  return L({
    tag: "section",
    containerClass: `${G} p-5`,
    bodyClass: "",
    contentClass: "",
    title: "Dashboard contract route is not wired.",
    titleClass: P,
    message: "Set a dashboard aggregate endpoint before initializing the dashboard client.",
    messageClass: `${z} mt-2`,
    attributes: { "data-dashboard-empty": "true" }
  });
}
function B() {
  return ke({
    tag: "section",
    text: "Loading translation dashboard aggregates...",
    showSpinner: !1,
    containerClass: `${ge} p-5`,
    attributes: { "data-dashboard-loading": "true" },
    ariaLive: "polite"
  });
}
var ot = class extends ue {
  constructor(t) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.metaExpanded = !1, this.alertsExpanded = !1, this.dismissedAlerts = /* @__PURE__ */ new Set(), this.activeTableTab = "top_overdue_assignments", this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...t
    }, this.client = Ne(t);
  }
  mount(t) {
    if (this.container = t, !n(this.config.endpoint)) {
      this.state = "error", t.innerHTML = it();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, t.innerHTML = B(), this.refreshController = je({
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
        this.state = "error", this.container && (this.container.innerHTML = nt(e), this.bindActions());
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
    if (this.lastError = null, this.refreshing = !0, this.payload ? this.render() : this.container && (this.state = "loading", this.container.innerHTML = B()), !this.refreshController) {
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
    const t = this.payload, e = t.data.runbooks, a = t.data.cards.map((l) => Ue(l, e)).join(""), s = Object.values(t.data.summary).every((l) => l === 0) && Object.values(t.data.tables).every((l) => l.rows.length === 0), r = t.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${o(t.meta.degradedReasons.map((l) => `${l.component}: ${l.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", i = this.lastError ? rt(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${at(t, this.refreshing, this.metaExpanded)}
        ${i}
        ${r}
        ${Ve(t.data.alerts, t.data.cards, this.alertsExpanded, this.dismissedAlerts)}
        ${s ? st(t) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${a}</section>
            ${Ze(t.data.tables, e, this.activeTableTab)}
          `}
        ${et(t.data.runbooks)}
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
            const i = a.innerHTML;
            a.innerHTML = `
            <span class="text-green-600">Copied!</span>
            ${f(I, "h-3 w-3 text-green-500", "12px")}
          `, setTimeout(() => {
              a.innerHTML = i;
            }, 1500);
          } catch {
            console.warn("Failed to copy UUID");
          }
      });
    });
  }
};
function lt(t, e) {
  t.querySelectorAll("[data-translation-table-tab]").forEach((a) => {
    const s = a.dataset.translationTableTab === e;
    a.setAttribute("aria-selected", s ? "true" : "false"), a.tabIndex = s ? 0 : -1, a.classList.toggle("border-blue-500", s), a.classList.toggle("text-blue-700", s), a.classList.toggle("border-transparent", !s), a.classList.toggle("text-gray-600", !s);
  }), t.querySelectorAll("[data-translation-table-panel]").forEach((a) => {
    const s = a.dataset.translationTablePanel === e;
    a.hidden = !s, a.classList.toggle("hidden", !s);
  });
}
function dt(t) {
  t.dataset.translationDashboardEnhanced !== "true" && (t.dataset.translationDashboardEnhanced = "true", typeof t.querySelectorAll == "function" && (t.querySelectorAll("[data-translation-table-tab]").forEach((e) => {
    e.addEventListener("click", () => {
      const a = e.dataset.translationTableTab;
      a && lt(t, a);
    }), e.addEventListener("keydown", (a) => {
      if (a.key === "ArrowLeft" || a.key === "ArrowRight") {
        a.preventDefault();
        const s = Array.from(t.querySelectorAll("[data-translation-table-tab]")), r = s.indexOf(e), i = a.key === "ArrowRight" ? (r + 1) % s.length : (r - 1 + s.length) % s.length;
        s[i]?.focus(), s[i]?.click();
      }
    });
  }), t.querySelectorAll("[data-translation-disclosure]").forEach((e) => {
    e.addEventListener("click", () => {
      const a = e.dataset.translationDisclosure, s = a ? t.querySelector(`[data-translation-disclosure-panel="${a}"]`) : null;
      if (!s) return;
      const r = e.getAttribute("aria-expanded") === "true";
      e.setAttribute("aria-expanded", r ? "false" : "true"), s.hidden = r, s.classList.toggle("hidden", r);
      const i = e.querySelector("[data-translation-disclosure-icon]");
      i && i.classList.toggle("rotate-180", !r);
    });
  })));
}
function ct() {
  if (typeof window > "u" || !window.location) return !1;
  const t = ce(window.location) ?? new URLSearchParams(), e = t.get("translation_client_render") || t.get("translationClientRender");
  return e === "1" || e === "true";
}
function wt(t, e = {}) {
  if (!t) return null;
  if (t.dataset?.ssrEnhanced === "true" && !ct())
    return dt(t), null;
  const a = new ot({
    endpoint: e.endpoint ?? t.dataset.endpoint ?? "",
    queueEndpoint: e.queueEndpoint ?? t.dataset.queueEndpoint ?? "",
    familiesEndpoint: e.familiesEndpoint ?? t.dataset.familiesEndpoint ?? "",
    refreshInterval: e.refreshInterval ?? x(t.dataset.refreshInterval, 3e4),
    title: e.title ?? t.dataset.title ?? "Translation Dashboard",
    fetch: e.fetch
  });
  return a.mount(t), a;
}
export {
  ot as TranslationDashboardPage,
  v as TranslationDashboardRequestError,
  Oe as buildTranslationDashboardURL,
  Ne as createTranslationDashboardClient,
  je as createTranslationDashboardRefreshController,
  wt as initTranslationDashboardPage,
  _e as normalizeTranslationDashboardCard,
  Y as normalizeTranslationDashboardLink,
  Q as normalizeTranslationDashboardQueryModel,
  De as normalizeTranslationDashboardResponse,
  W as normalizeTranslationDashboardRunbook,
  Ae as normalizeTranslationDashboardTable,
  Ce as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
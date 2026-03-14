import { a as i, e as p } from "../chunks/html-Br-oQr7i.js";
import { r as O } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as N } from "../toast/error-helpers.js";
import { r as z, k as F, E as R, c as I, d as S, L as P, C as v, e as A, f as j, g as $, H, a as B, l as K, B as D, m as U } from "../chunks/breadcrumb-BXeageNv.js";
class b extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationDashboardRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
}
function a(e) {
  return typeof e == "string" ? e.trim() : "";
}
function h(e, t = 0) {
  if (typeof e == "number" && Number.isFinite(e))
    return e;
  if (typeof e == "string" && e.trim() !== "") {
    const r = Number(e);
    if (Number.isFinite(r))
      return r;
  }
  return t;
}
function l(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function x(e) {
  const t = {};
  for (const [r, s] of Object.entries(l(e))) {
    const n = a(s);
    n && (t[r] = n);
  }
  return t;
}
function T(e) {
  const t = {};
  for (const [r, s] of Object.entries(l(e)))
    t[r] = h(s);
  return t;
}
function d(e, t) {
  if (!Array.isArray(e))
    return [];
  const r = [];
  for (const s of e) {
    const n = t(s);
    n && r.push(n);
  }
  return r;
}
function w(e) {
  const t = a(e).toLowerCase();
  switch (t) {
    case "warning":
    case "critical":
    case "degraded":
      return t;
    default:
      return "ok";
  }
}
function L(e) {
  if (!e || typeof e != "object")
    return null;
  const t = e;
  return {
    href: a(t.href),
    group: a(t.group),
    route: a(t.route),
    resolverKey: a(t.resolver_key),
    params: x(t.params),
    query: x(t.query),
    key: a(t.key),
    label: a(t.label),
    description: a(t.description),
    relation: a(t.relation),
    tableId: a(t.table_id),
    entityType: a(t.entity_type),
    entityId: a(t.entity_id)
  };
}
function X(e) {
  const t = l(e), r = a(t.key);
  return r ? {
    key: r,
    label: a(t.label),
    description: a(t.description),
    relation: a(t.relation),
    group: a(t.group),
    route: a(t.route),
    resolverKey: a(t.resolver_key),
    entityType: a(t.entity_type)
  } : null;
}
function G(e) {
  const t = l(e), r = a(t.id);
  if (!r)
    return null;
  const s = l(t.alert);
  return {
    id: r,
    label: a(t.label),
    description: a(t.description),
    count: h(t.count),
    breakdown: T(t.breakdown),
    alert: {
      state: w(s.state),
      message: a(s.message)
    },
    drilldown: L(t.drilldown),
    metricKey: a(t.metric_key),
    runbookId: a(t.runbook_id)
  };
}
function Y(e) {
  const t = l(e);
  if (Object.keys(t).length === 0)
    return null;
  const r = {};
  for (const [s, n] of Object.entries(l(t.links))) {
    const o = L(n);
    o && (r[s] = o);
  }
  return {
    ...t,
    links: r
  };
}
function Q(e, t = "") {
  const r = l(e), s = d(r.rows, Y);
  return {
    id: a(r.id) || t,
    label: a(r.label) || t,
    total: h(r.total, s.length),
    limit: h(r.limit, s.length),
    rows: s
  };
}
function M(e) {
  const t = l(e), r = a(t.id);
  return r ? {
    id: r,
    title: a(t.title),
    description: a(t.description),
    route: a(t.route),
    resolverKey: a(t.resolver_key),
    href: a(t.href),
    query: x(t.query)
  } : null;
}
function q(e) {
  const t = l(e), r = a(t.id);
  if (!r)
    return null;
  const s = {};
  for (const [n, o] of Object.entries(l(t.drilldown_links))) {
    const c = X(o);
    c && (s[n] = c);
  }
  return {
    id: r,
    description: a(t.description),
    scopeFields: d(t.scope_fields, (n) => a(n) || null),
    stableSortKeys: d(t.stable_sort_keys, (n) => a(n) || null),
    indexHints: d(t.index_hints, (n) => a(n) || null),
    supportedFilters: d(t.supported_filters, (n) => a(n) || null),
    defaultLimit: h(t.default_limit),
    drilldownRoute: a(t.drilldown_route),
    queueRoute: a(t.queue_route),
    apiRoute: a(t.api_route),
    resolverKeys: d(t.resolver_keys, (n) => a(n) || null),
    drilldownLinks: s
  };
}
function W(e) {
  const t = l(e), r = {};
  for (const [s, n] of Object.entries(l(t.query_models))) {
    const o = q(n);
    o && (r[s] = o);
  }
  return {
    cardIds: d(t.card_ids, (s) => a(s) || null),
    tableIds: d(t.table_ids, (s) => a(s) || null),
    alertStates: d(t.alert_states, (s) => w(s)),
    defaultLimits: T(t.default_limits),
    queryModels: r,
    runbooks: d(t.runbooks, M)
  };
}
function J(e) {
  const t = l(e), r = a(t.code);
  return r ? {
    state: w(t.state),
    code: r,
    message: a(t.message),
    cardId: a(t.card_id),
    runbookId: a(t.runbook_id)
  } : null;
}
function V(e, t) {
  if (t.cardIds.length === 0)
    return e;
  const r = /* @__PURE__ */ new Map();
  return t.cardIds.forEach((s, n) => r.set(s, n)), [...e].sort((s, n) => (r.get(s.id) ?? Number.MAX_SAFE_INTEGER) - (r.get(n.id) ?? Number.MAX_SAFE_INTEGER));
}
function Z(e) {
  const t = l(e), r = l(t.data), s = l(t.meta), n = W(s.contracts), o = V(
    d(r.cards, G),
    n
  ), c = {};
  for (const [m, f] of Object.entries(l(r.tables)))
    c[m] = Q(f, m);
  const u = { ...n.queryModels };
  for (const [m, f] of Object.entries(l(s.query_models))) {
    const g = q(f);
    g && (u[m] = g);
  }
  return {
    data: {
      cards: o,
      tables: c,
      alerts: d(r.alerts, J),
      runbooks: d(r.runbooks, M),
      summary: T(r.summary)
    },
    meta: {
      environment: a(s.environment),
      generatedAt: a(s.generated_at),
      refreshIntervalMs: h(s.refresh_interval_ms, 3e4),
      latencyTargetMs: h(s.latency_target_ms, 0),
      degraded: s.degraded === !0,
      degradedReasons: d(s.degraded_reasons, (m) => {
        const f = l(m), g = a(f.component), k = a(f.message);
        return !g && !k ? null : { component: g, message: k };
      }),
      familyReport: l(s.family_report),
      scope: x(s.scope),
      metrics: d(s.metrics, (m) => {
        const f = l(m), g = a(f.key);
        return g ? {
          key: g,
          unit: a(f.unit),
          sloP95Ms: f.slo_p95_ms === void 0 ? null : h(f.slo_p95_ms)
        } : null;
      }),
      queryModels: u,
      contracts: {
        ...n,
        queryModels: u
      }
    }
  };
}
function tt(e, t = {}) {
  const r = a(e);
  if (!r)
    return "";
  const s = r.startsWith("http://") || r.startsWith("https://") ? void 0 : "http://localhost", n = new URL(r, s), o = [
    ["environment", a(t.environment)],
    ["tenant_id", a(t.tenantId)],
    ["org_id", a(t.orgId)],
    ["overdue_limit", t.overdueLimit != null ? String(t.overdueLimit) : ""],
    ["blocked_limit", t.blockedLimit != null ? String(t.blockedLimit) : ""]
  ];
  for (const [c, u] of o)
    u && n.searchParams.set(c, u);
  return s ? `${n.pathname}${n.search}` : n.toString();
}
function et(e) {
  const t = a(e.endpoint), r = e.fetch ?? globalThis.fetch?.bind(globalThis);
  return {
    async fetchDashboard(s = {}) {
      if (!t)
        throw new b({
          message: "Translation dashboard endpoint is not configured",
          status: 0,
          code: "MISSING_CONTEXT"
        });
      const n = tt(t, s);
      if (!r)
        throw new b({
          message: "Fetch implementation is not available",
          status: 0,
          code: "MISSING_CONTEXT"
        });
      const o = await r(n, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!o.ok) {
        const c = await N(o.clone());
        throw new b({
          message: c.message || await O(o, "Failed to load translation dashboard"),
          status: o.status,
          code: c.textCode,
          requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
          traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
          metadata: c.metadata
        });
      }
      return Z(await o.json());
    }
  };
}
function rt(e) {
  const t = Math.max(0, e.intervalMs ?? 3e4);
  let r = null, s = null;
  const n = async () => s || (s = (async () => {
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
      await n(), t > 0 && r == null && (r = globalThis.setInterval(() => {
        n().catch(() => {
        });
      }, t));
    },
    stop() {
      r != null && (globalThis.clearInterval(r), r = null);
    },
    refresh: n,
    isRunning() {
      return r != null;
    }
  };
}
function y(e) {
  return e.replace(/[_-]+/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function _(e, t, r = "") {
  const s = i(e);
  return t?.href ? `<a class="${p(r)} text-sky-700 hover:text-sky-900 hover:underline" href="${p(t.href)}">${s}</a>` : `<span class="${p(r)}">${s}</span>`;
}
function st(e) {
  return [...e].sort((t, r) => {
    const s = (n) => n === "primary" ? 0 : 1;
    return s(t.relation) - s(r.relation);
  });
}
function C(e, t = "No drill-downs") {
  return e.length === 0 ? `<span class="text-gray-400">${i(t)}</span>` : st(e).map((r) => {
    const s = r.label || "Open";
    return r.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${p(r.key || s.toLowerCase())}" href="${p(r.href)}">${i(s)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${i(s)}</span>`;
  }).join("");
}
function at(e) {
  const t = Object.entries(e.breakdown).map(([r, s]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${i(y(r))}</span>
        <span class="font-semibold text-gray-900">${i(String(s))}</span>
      </li>
    `).join("");
  return `
    <article class="${v} p-4 shadow-sm" data-dashboard-card="${p(e.id)}">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">${i(e.label)}</p>
          <p class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${i(String(e.count))}</p>
        </div>
        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${p(ct(e.alert.state))}">
          ${i(e.alert.message || e.alert.state)}
        </span>
      </div>
      <p class="mt-3 text-sm leading-6 text-gray-600">${i(e.description)}</p>
      ${t ? `<ul class="mt-4 space-y-2">${t}</ul>` : ""}
      <div class="mt-4 flex items-center justify-between gap-3 text-sm">
        ${_(e.drilldown?.label || "Open drilldown", e.drilldown)}
        <span class="text-xs text-gray-400">${i(e.metricKey)}</span>
      </div>
    </article>
  `;
}
function nt(e) {
  return e.length === 0 ? "" : `
    <section class="space-y-3" data-dashboard-alerts="true">
      ${e.map((t) => `
        <div class="rounded-xl border px-4 py-3 text-sm ${p(ut(t.state))}" role="${p(t.state === "critical" ? "alert" : "status")}">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-semibold">${i(t.code)}</p>
              <p class="mt-1">${i(t.message)}</p>
            </div>
            ${t.runbookId ? `<span class="text-xs uppercase tracking-[0.22em]">${i(t.runbookId)}</span>` : ""}
          </div>
        </div>
      `).join("")}
    </section>
  `;
}
function it(e) {
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
              <div class="font-medium text-gray-900">${_(a(t.source_title) || a(t.assignment_id), t.links.assignment)}</div>
              <div class="mt-1 text-xs text-gray-500">${i(a(t.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(`${a(t.source_locale).toUpperCase()} -> ${a(t.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${i(y(a(t.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${i(y(a(t.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${i(`${h(t.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${C(Object.values(t.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function ot(e) {
  return `
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <caption class="sr-only">Blocked families with family detail and blocker feed drill-down actions.</caption>
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-[0.2em] text-gray-500">
        <tr>
          <th scope="col" class="px-4 py-3">Family</th>
          <th scope="col" class="px-4 py-3">Readiness</th>
          <th scope="col" class="px-4 py-3 text-right">Missing</th>
          <th scope="col" class="px-4 py-3 text-right">Review</th>
          <th scope="col" class="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        ${e.rows.map((t) => `
          <tr>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${_(a(t.family_id), t.links.family)}</div>
              <div class="mt-1 text-xs text-gray-500">${i(a(t.content_type))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(y(a(t.readiness_state)))}</td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${i(String(h(t.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${i(String(h(t.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${C(Object.values(t.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function lt(e) {
  const t = e.id === "top_overdue_assignments" ? it(e) : ot(e);
  return `
    <section class="overflow-hidden ${v} shadow-sm" data-dashboard-table="${p(e.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${i(e.label)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing ${i(String(e.rows.length))} of ${i(String(e.total))}</p>
        </div>
      </header>
      <div class="overflow-x-auto">${t}</div>
    </section>
  `;
}
function dt(e) {
  return e.length === 0 ? "" : `
    <section class="${v} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${e.map((t) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${t.href ? `<a class="hover:underline" href="${p(t.href)}">${i(t.title)}</a>` : i(t.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${i(t.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function ct(e) {
  switch (e) {
    case "critical":
      return "bg-rose-100 text-rose-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    case "degraded":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}
function ut(e) {
  switch (e) {
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "degraded":
      return "border-gray-200 bg-gray-50 text-gray-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
}
function pt(e) {
  const t = Object.entries(e.meta.scope).filter(([, r]) => r).map(([r, s]) => `${y(r)}: ${s}`);
  return `
    <section class="rounded-xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-200 shadow-sm" data-dashboard-meta="true">
      <div class="flex flex-wrap items-center gap-4">
        <span><strong class="font-semibold text-white">Environment:</strong> ${i(e.meta.environment || "default")}</span>
        <span><strong class="font-semibold text-white">Refresh:</strong> ${i(String(e.meta.refreshIntervalMs))}ms</span>
        <span><strong class="font-semibold text-white">Latency target:</strong> ${i(String(e.meta.latencyTargetMs))}ms p95</span>
      </div>
      ${t.length > 0 ? `<p class="mt-2 text-xs uppercase tracking-[0.18em] text-gray-400">${i(t.join(" • "))}</p>` : ""}
    </section>
  `;
}
function ht(e, t = !1) {
  const r = e?.meta.generatedAt ? new Date(e.meta.generatedAt).toLocaleString() : "Unavailable";
  return `
    <section class="${v} px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="${H}">Manager Monitoring</p>
          <h2 class="${B} text-xl mt-2">Queue health and publish blockers</h2>
          <p class="${K} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${i(t ? "Refreshing dashboard…" : `Last updated ${r}`)}
          </span>
          <button type="button" class="${D}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${t ? "disabled" : ""}>
            ${i(t ? "Refreshing…" : "Refresh dashboard")}
          </button>
        </div>
      </div>
    </section>
  `;
}
function ft(e) {
  const t = e.data.runbooks[0], r = t?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${p(t.href)}">${i(t.title || "Open runbook")}</a>` : "";
  return `
    <section class="${R} p-6 shadow-sm" data-dashboard-empty="true" role="status" aria-live="polite">
      <p class="${I}">No active pressure</p>
      <h3 class="mt-2 text-xl font-semibold text-gray-900">This scope is clear right now.</h3>
      <p class="${S} mt-3 max-w-2xl leading-6">Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.</p>
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${D}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${r}
      </div>
    </section>
  `;
}
function mt(e) {
  const t = e instanceof b ? e.requestId : void 0, r = e instanceof b ? e.traceId : void 0, s = [t ? `Request ${t}` : "", r ? `Trace ${r}` : ""].filter(Boolean).join(" • ");
  return `
    <section class="${A} p-4" data-dashboard-inline-error="true" role="alert">
      <p class="${j}">Latest refresh failed</p>
      <p class="${$} mt-2">${i(e instanceof Error ? e.message : "Failed to load translation dashboard")}</p>
      ${s ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-rose-700">${i(s)}</p>` : ""}
    </section>
  `;
}
function gt(e) {
  const t = e instanceof Error ? e.message : "Failed to load translation dashboard", r = e instanceof b ? e.requestId : void 0, s = e instanceof b ? e.traceId : void 0, n = [r ? `Request ${r}` : "", s ? `Trace ${s}` : ""].filter(Boolean).join(" • ");
  return `
    <section class="${A} p-4" data-dashboard-error="true" role="alert">
      <p class="${j}">Translation dashboard unavailable</p>
      <p class="${$} mt-2">Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.</p>
      <p class="${$} mt-2">${i(t)}</p>
      ${n ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-rose-700">${i(n)}</p>` : ""}
      <div class="mt-4">
        <button type="button" class="${U}" data-dashboard-refresh-button="true">Retry dashboard</button>
      </div>
    </section>
  `;
}
function bt() {
  return `
    <section class="${R} p-5" data-dashboard-empty="true">
      <p class="${I}">Dashboard contract route is not wired.</p>
      <p class="${S} mt-2">Set a dashboard aggregate endpoint before initializing the dashboard client.</p>
    </section>
  `;
}
function E() {
  return `
    <section class="${P} p-5" data-dashboard-loading="true" role="status" aria-live="polite">
      Loading translation dashboard aggregates...
    </section>
  `;
}
class yt {
  constructor(t) {
    this.refreshController = null, this.container = null, this.state = "idle", this.payload = null, this.refreshing = !1, this.lastError = null, this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...t
    }, this.client = et(t);
  }
  mount(t) {
    if (this.container = t, !a(this.config.endpoint)) {
      this.state = "error", t.innerHTML = bt();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, t.innerHTML = E(), this.refreshController = rt({
      intervalMs: this.config.refreshInterval,
      load: () => this.client.fetchDashboard(),
      onData: (r) => {
        this.payload = r, this.state = "ready", this.refreshing = !1, this.lastError = null, this.render();
      },
      onError: (r) => {
        if (this.refreshing = !1, this.lastError = r, this.payload) {
          this.state = "ready", this.render();
          return;
        }
        this.state = "error", this.container && (this.container.innerHTML = gt(r), this.bindActions());
      }
    }), this.refreshController.start().catch(() => {
    });
  }
  unmount() {
    this.refreshController?.stop(), this.refreshController = null, this.container = null;
  }
  getState() {
    return this.state;
  }
  getData() {
    return this.payload;
  }
  async refresh() {
    if (this.lastError = null, this.refreshing = !0, this.payload ? this.render() : this.container && (this.state = "loading", this.container.innerHTML = E()), !this.refreshController) {
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
    if (!this.container || !this.payload)
      return;
    const t = this.payload, r = t.data.cards.map(at).join(""), s = Object.values(t.data.tables).map(lt).join(""), n = Object.values(t.data.summary).every((u) => u === 0) && Object.values(t.data.tables).every((u) => u.rows.length === 0), o = t.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${i(t.meta.degradedReasons.map((u) => `${u.component}: ${u.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", c = this.lastError ? mt(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${z(F("/admin"))}
        ${ht(t, this.refreshing)}
        ${pt(t)}
        ${c}
        ${o}
        ${nt(t.data.alerts)}
        ${n ? ft(t) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${r}</section>
            <section class="grid gap-4 xl:grid-cols-2">${s}</section>
          `}
        ${dt(t.data.runbooks)}
      </div>
    `, this.bindActions();
  }
  bindActions() {
    if (!this.container || typeof this.container.querySelectorAll != "function")
      return;
    this.container.querySelectorAll("[data-dashboard-refresh-button]").forEach((r) => {
      r.addEventListener("click", () => {
        this.refresh().catch(() => {
        });
      });
    });
  }
}
function wt(e, t = {}) {
  if (!e)
    return null;
  const r = new yt({
    endpoint: t.endpoint ?? e.dataset.endpoint ?? "",
    queueEndpoint: t.queueEndpoint ?? e.dataset.queueEndpoint ?? "",
    familiesEndpoint: t.familiesEndpoint ?? e.dataset.familiesEndpoint ?? "",
    refreshInterval: t.refreshInterval ?? h(e.dataset.refreshInterval, 3e4),
    title: t.title ?? e.dataset.title ?? "Translation Dashboard",
    fetch: t.fetch
  });
  return r.mount(e), r;
}
export {
  yt as TranslationDashboardPage,
  b as TranslationDashboardRequestError,
  tt as buildTranslationDashboardURL,
  et as createTranslationDashboardClient,
  rt as createTranslationDashboardRefreshController,
  wt as initTranslationDashboardPage,
  G as normalizeTranslationDashboardCard,
  L as normalizeTranslationDashboardLink,
  q as normalizeTranslationDashboardQueryModel,
  Z as normalizeTranslationDashboardResponse,
  M as normalizeTranslationDashboardRunbook,
  Q as normalizeTranslationDashboardTable,
  Y as normalizeTranslationDashboardTableRow
};
//# sourceMappingURL=index.js.map

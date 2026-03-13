import { a as o, e as h } from "../chunks/html-Br-oQr7i.js";
import { r as R } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as S } from "../toast/error-helpers.js";
class b extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationDashboardRequestError", this.status = e.status, this.code = e.code ?? null, this.requestId = e.requestId, this.traceId = e.traceId, this.metadata = e.metadata ?? null;
  }
}
function a(t) {
  return typeof t == "string" ? t.trim() : "";
}
function p(t, e = 0) {
  if (typeof t == "number" && Number.isFinite(t))
    return t;
  if (typeof t == "string" && t.trim() !== "") {
    const r = Number(t);
    if (Number.isFinite(r))
      return r;
  }
  return e;
}
function l(t) {
  return t && typeof t == "object" && !Array.isArray(t) ? t : {};
}
function x(t) {
  const e = {};
  for (const [r, s] of Object.entries(l(t))) {
    const n = a(s);
    n && (e[r] = n);
  }
  return e;
}
function v(t) {
  const e = {};
  for (const [r, s] of Object.entries(l(t)))
    e[r] = p(s);
  return e;
}
function d(t, e) {
  if (!Array.isArray(t))
    return [];
  const r = [];
  for (const s of t) {
    const n = e(s);
    n && r.push(n);
  }
  return r;
}
function w(t) {
  const e = a(t).toLowerCase();
  switch (e) {
    case "warning":
    case "critical":
    case "degraded":
      return e;
    default:
      return "ok";
  }
}
function T(t) {
  if (!t || typeof t != "object")
    return null;
  const e = t;
  return {
    href: a(e.href),
    group: a(e.group),
    route: a(e.route),
    resolverKey: a(e.resolver_key),
    params: x(e.params),
    query: x(e.query),
    key: a(e.key),
    label: a(e.label),
    description: a(e.description),
    relation: a(e.relation),
    tableId: a(e.table_id),
    entityType: a(e.entity_type),
    entityId: a(e.entity_id)
  };
}
function L(t) {
  const e = l(t), r = a(e.key);
  return r ? {
    key: r,
    label: a(e.label),
    description: a(e.description),
    relation: a(e.relation),
    group: a(e.group),
    route: a(e.route),
    resolverKey: a(e.resolver_key),
    entityType: a(e.entity_type)
  } : null;
}
function M(t) {
  const e = l(t), r = a(e.id);
  if (!r)
    return null;
  const s = l(e.alert);
  return {
    id: r,
    label: a(e.label),
    description: a(e.description),
    count: p(e.count),
    breakdown: v(e.breakdown),
    alert: {
      state: w(s.state),
      message: a(s.message)
    },
    drilldown: T(e.drilldown),
    metricKey: a(e.metric_key),
    runbookId: a(e.runbook_id)
  };
}
function D(t) {
  const e = l(t);
  if (Object.keys(e).length === 0)
    return null;
  const r = {};
  for (const [s, n] of Object.entries(l(e.links))) {
    const i = T(n);
    i && (r[s] = i);
  }
  return {
    ...e,
    links: r
  };
}
function q(t, e = "") {
  const r = l(t), s = d(r.rows, D);
  return {
    id: a(r.id) || e,
    label: a(r.label) || e,
    total: p(r.total, s.length),
    limit: p(r.limit, s.length),
    rows: s
  };
}
function I(t) {
  const e = l(t), r = a(e.id);
  return r ? {
    id: r,
    title: a(e.title),
    description: a(e.description),
    route: a(e.route),
    resolverKey: a(e.resolver_key),
    href: a(e.href),
    query: x(e.query)
  } : null;
}
function j(t) {
  const e = l(t), r = a(e.id);
  if (!r)
    return null;
  const s = {};
  for (const [n, i] of Object.entries(l(e.drilldown_links))) {
    const c = L(i);
    c && (s[n] = c);
  }
  return {
    id: r,
    description: a(e.description),
    scopeFields: d(e.scope_fields, (n) => a(n) || null),
    stableSortKeys: d(e.stable_sort_keys, (n) => a(n) || null),
    indexHints: d(e.index_hints, (n) => a(n) || null),
    supportedFilters: d(e.supported_filters, (n) => a(n) || null),
    defaultLimit: p(e.default_limit),
    drilldownRoute: a(e.drilldown_route),
    queueRoute: a(e.queue_route),
    apiRoute: a(e.api_route),
    resolverKeys: d(e.resolver_keys, (n) => a(n) || null),
    drilldownLinks: s
  };
}
function A(t) {
  const e = l(t), r = {};
  for (const [s, n] of Object.entries(l(e.query_models))) {
    const i = j(n);
    i && (r[s] = i);
  }
  return {
    cardIds: d(e.card_ids, (s) => a(s) || null),
    tableIds: d(e.table_ids, (s) => a(s) || null),
    alertStates: d(e.alert_states, (s) => w(s)),
    defaultLimits: v(e.default_limits),
    queryModels: r,
    runbooks: d(e.runbooks, I)
  };
}
function C(t) {
  const e = l(t), r = a(e.code);
  return r ? {
    state: w(e.state),
    code: r,
    message: a(e.message),
    cardId: a(e.card_id),
    runbookId: a(e.runbook_id)
  } : null;
}
function O(t, e) {
  if (e.cardIds.length === 0)
    return t;
  const r = /* @__PURE__ */ new Map();
  return e.cardIds.forEach((s, n) => r.set(s, n)), [...t].sort((s, n) => (r.get(s.id) ?? Number.MAX_SAFE_INTEGER) - (r.get(n.id) ?? Number.MAX_SAFE_INTEGER));
}
function z(t) {
  const e = l(t), r = l(e.data), s = l(e.meta), n = A(s.contracts), i = O(
    d(r.cards, M),
    n
  ), c = {};
  for (const [m, g] of Object.entries(l(r.tables)))
    c[m] = q(g, m);
  const u = { ...n.queryModels };
  for (const [m, g] of Object.entries(l(s.query_models))) {
    const f = j(g);
    f && (u[m] = f);
  }
  return {
    data: {
      cards: i,
      tables: c,
      alerts: d(r.alerts, C),
      runbooks: d(r.runbooks, I),
      summary: v(r.summary)
    },
    meta: {
      environment: a(s.environment),
      generatedAt: a(s.generated_at),
      refreshIntervalMs: p(s.refresh_interval_ms, 3e4),
      latencyTargetMs: p(s.latency_target_ms, 0),
      degraded: s.degraded === !0,
      degradedReasons: d(s.degraded_reasons, (m) => {
        const g = l(m), f = a(g.component), k = a(g.message);
        return !f && !k ? null : { component: f, message: k };
      }),
      familyReport: l(s.family_report),
      scope: x(s.scope),
      metrics: d(s.metrics, (m) => {
        const g = l(m), f = a(g.key);
        return f ? {
          key: f,
          unit: a(g.unit),
          sloP95Ms: g.slo_p95_ms === void 0 ? null : p(g.slo_p95_ms)
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
function F(t, e = {}) {
  const r = a(t);
  if (!r)
    return "";
  const s = r.startsWith("http://") || r.startsWith("https://") ? void 0 : "http://localhost", n = new URL(r, s), i = [
    ["environment", a(e.environment)],
    ["tenant_id", a(e.tenantId)],
    ["org_id", a(e.orgId)],
    ["overdue_limit", e.overdueLimit != null ? String(e.overdueLimit) : ""],
    ["blocked_limit", e.blockedLimit != null ? String(e.blockedLimit) : ""]
  ];
  for (const [c, u] of i)
    u && n.searchParams.set(c, u);
  return s ? `${n.pathname}${n.search}` : n.toString();
}
function N(t) {
  const e = a(t.endpoint), r = t.fetch ?? globalThis.fetch?.bind(globalThis);
  return {
    async fetchDashboard(s = {}) {
      if (!e)
        throw new b({
          message: "Translation dashboard endpoint is not configured",
          status: 0,
          code: "MISSING_CONTEXT"
        });
      const n = F(e, s);
      if (!r)
        throw new b({
          message: "Fetch implementation is not available",
          status: 0,
          code: "MISSING_CONTEXT"
        });
      const i = await r(n, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!i.ok) {
        const c = await S(i.clone());
        throw new b({
          message: c.message || await R(i, "Failed to load translation dashboard"),
          status: i.status,
          code: c.textCode,
          requestId: i.headers.get("x-request-id") ?? i.headers.get("X-Request-ID") ?? void 0,
          traceId: i.headers.get("x-trace-id") ?? i.headers.get("x-correlation-id") ?? void 0,
          metadata: c.metadata
        });
      }
      return z(await i.json());
    }
  };
}
function H(t) {
  const e = Math.max(0, t.intervalMs ?? 3e4);
  let r = null, s = null;
  const n = async () => s || (s = (async () => {
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
      await n(), e > 0 && r == null && (r = globalThis.setInterval(() => {
        n().catch(() => {
        });
      }, e));
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
function y(t) {
  return t.replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function $(t, e, r = "") {
  const s = o(t);
  return e?.href ? `<a class="${h(r)} text-sky-700 hover:text-sky-900 hover:underline" href="${h(e.href)}">${s}</a>` : `<span class="${h(r)}">${s}</span>`;
}
function K(t) {
  return [...t].sort((e, r) => {
    const s = (n) => n === "primary" ? 0 : 1;
    return s(e.relation) - s(r.relation);
  });
}
function E(t, e = "No drill-downs") {
  return t.length === 0 ? `<span class="text-gray-400">${o(e)}</span>` : K(t).map((r) => {
    const s = r.label || "Open";
    return r.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${h(r.key || s.toLowerCase())}" href="${h(r.href)}">${o(s)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${o(s)}</span>`;
  }).join("");
}
function P(t) {
  const e = Object.entries(t.breakdown).map(([r, s]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${o(y(r))}</span>
        <span class="font-semibold text-gray-900">${o(String(s))}</span>
      </li>
    `).join("");
  return `
    <article class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" data-dashboard-card="${h(t.id)}">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">${o(t.label)}</p>
          <p class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${o(String(t.count))}</p>
        </div>
        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${h(W(t.alert.state))}">
          ${o(t.alert.message || t.alert.state)}
        </span>
      </div>
      <p class="mt-3 text-sm leading-6 text-gray-600">${o(t.description)}</p>
      ${e ? `<ul class="mt-4 space-y-2">${e}</ul>` : ""}
      <div class="mt-4 flex items-center justify-between gap-3 text-sm">
        ${$(t.drilldown?.label || "Open drilldown", t.drilldown)}
        <span class="text-xs text-gray-400">${o(t.metricKey)}</span>
      </div>
    </article>
  `;
}
function U(t) {
  return t.length === 0 ? "" : `
    <section class="space-y-3" data-dashboard-alerts="true">
      ${t.map((e) => `
        <div class="rounded-2xl border px-4 py-3 text-sm ${h(J(e.state))}" role="${h(e.state === "critical" ? "alert" : "status")}">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-semibold">${o(e.code)}</p>
              <p class="mt-1">${o(e.message)}</p>
            </div>
            ${e.runbookId ? `<span class="text-xs uppercase tracking-[0.22em]">${o(e.runbookId)}</span>` : ""}
          </div>
        </div>
      `).join("")}
    </section>
  `;
}
function B(t) {
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
              <div class="font-medium text-gray-900">${$(a(e.source_title) || a(e.assignment_id), e.links.assignment)}</div>
              <div class="mt-1 text-xs text-gray-500">${o(a(e.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${o(`${a(e.source_locale).toUpperCase()} -> ${a(e.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${o(y(a(e.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${o(y(a(e.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${o(`${p(e.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${E(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function X(t) {
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
        ${t.rows.map((e) => `
          <tr>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${$(a(e.family_id), e.links.family)}</div>
              <div class="mt-1 text-xs text-gray-500">${o(a(e.content_type))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${o(y(a(e.readiness_state)))}</td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${o(String(p(e.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${o(String(p(e.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${E(Object.values(e.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function G(t) {
  const e = t.id === "top_overdue_assignments" ? B(t) : X(t);
  return `
    <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" data-dashboard-table="${h(t.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">${o(t.label)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing ${o(String(t.rows.length))} of ${o(String(t.total))}</p>
        </div>
      </header>
      <div class="overflow-x-auto">${e}</div>
    </section>
  `;
}
function Q(t) {
  return t.length === 0 ? "" : `
    <section class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${t.map((e) => `
          <article class="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${e.href ? `<a class="hover:underline" href="${h(e.href)}">${o(e.title)}</a>` : o(e.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${o(e.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function W(t) {
  switch (t) {
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
function J(t) {
  switch (t) {
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
function V(t) {
  const e = Object.entries(t.meta.scope).filter(([, r]) => r).map(([r, s]) => `${y(r)}: ${s}`);
  return `
    <section class="rounded-2xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-200 shadow-sm" data-dashboard-meta="true">
      <div class="flex flex-wrap items-center gap-4">
        <span><strong class="font-semibold text-white">Environment:</strong> ${o(t.meta.environment || "default")}</span>
        <span><strong class="font-semibold text-white">Refresh:</strong> ${o(String(t.meta.refreshIntervalMs))}ms</span>
        <span><strong class="font-semibold text-white">Latency target:</strong> ${o(String(t.meta.latencyTargetMs))}ms p95</span>
      </div>
      ${e.length > 0 ? `<p class="mt-2 text-xs uppercase tracking-[0.18em] text-gray-400">${o(e.join(" • "))}</p>` : ""}
    </section>
  `;
}
function Y(t, e = !1) {
  const r = t?.meta.generatedAt ? new Date(t.meta.generatedAt).toLocaleString() : "Unavailable";
  return `
    <section class="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Manager Monitoring</p>
          <h2 class="mt-2 text-xl font-semibold tracking-tight text-gray-900">Queue health and publish blockers</h2>
          <p class="mt-2 text-sm text-gray-600">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${o(e ? "Refreshing dashboard…" : `Last updated ${r}`)}
          </span>
          <button type="button" class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${e ? "disabled" : ""}>
            ${o(e ? "Refreshing…" : "Refresh dashboard")}
          </button>
        </div>
      </div>
    </section>
  `;
}
function Z(t) {
  const e = t.data.runbooks[0];
  return `
    <section class="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 shadow-sm" data-dashboard-empty="true" role="status" aria-live="polite">
      <p class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">No active pressure</p>
      <h3 class="mt-2 text-xl font-semibold text-gray-900">This scope is clear right now.</h3>
      <p class="mt-3 max-w-2xl leading-6">Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.</p>
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${e?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${h(e.href)}">${o(e.title || "Open runbook")}</a>` : ""}
      </div>
    </section>
  `;
}
function ee(t) {
  const e = t instanceof b ? t.requestId : void 0, r = t instanceof b ? t.traceId : void 0, s = [e ? `Request ${e}` : "", r ? `Trace ${r}` : ""].filter(Boolean).join(" • ");
  return `
    <section class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" data-dashboard-inline-error="true" role="alert">
      <p class="font-semibold">Latest refresh failed</p>
      <p class="mt-2">${o(t instanceof Error ? t.message : "Failed to load translation dashboard")}</p>
      ${s ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-rose-700">${o(s)}</p>` : ""}
    </section>
  `;
}
function te(t) {
  const e = t instanceof Error ? t.message : "Failed to load translation dashboard", r = t instanceof b ? t.requestId : void 0, s = t instanceof b ? t.traceId : void 0, n = [r ? `Request ${r}` : "", s ? `Trace ${s}` : ""].filter(Boolean).join(" • ");
  return `
    <section class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" data-dashboard-error="true" role="alert">
      <p class="font-semibold">Translation dashboard unavailable</p>
      <p class="mt-2">Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.</p>
      <p class="mt-2">${o(e)}</p>
      ${n ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-rose-700">${o(n)}</p>` : ""}
      <div class="mt-4">
        <button type="button" class="inline-flex items-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800" data-dashboard-refresh-button="true">Retry dashboard</button>
      </div>
    </section>
  `;
}
function re() {
  return `
    <section class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600" data-dashboard-empty="true">
      <p class="font-semibold text-gray-900">Dashboard contract route is not wired.</p>
      <p class="mt-2">Set a dashboard aggregate endpoint before initializing the dashboard client.</p>
    </section>
  `;
}
function _() {
  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600" data-dashboard-loading="true" role="status" aria-live="polite">
      Loading translation dashboard aggregates...
    </section>
  `;
}
class se {
  constructor(e) {
    this.refreshController = null, this.container = null, this.state = "idle", this.payload = null, this.refreshing = !1, this.lastError = null, this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...e
    }, this.client = N(e);
  }
  mount(e) {
    if (this.container = e, !a(this.config.endpoint)) {
      this.state = "error", e.innerHTML = re();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, e.innerHTML = _(), this.refreshController = H({
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
        this.state = "error", this.container && (this.container.innerHTML = te(r), this.bindActions());
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
    if (this.lastError = null, this.refreshing = !0, this.payload ? this.render() : this.container && (this.state = "loading", this.container.innerHTML = _()), !this.refreshController) {
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
    if (!this.container || !this.payload)
      return;
    const e = this.payload, r = e.data.cards.map(P).join(""), s = Object.values(e.data.tables).map(G).join(""), n = Object.values(e.data.summary).every((u) => u === 0) && Object.values(e.data.tables).every((u) => u.rows.length === 0), i = e.meta.degraded ? `
        <section class="rounded-2xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${o(e.meta.degradedReasons.map((u) => `${u.component}: ${u.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", c = this.lastError ? ee(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${Y(e, this.refreshing)}
        ${V(e)}
        ${c}
        ${i}
        ${U(e.data.alerts)}
        ${n ? Z(e) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${r}</section>
            <section class="grid gap-4 xl:grid-cols-2">${s}</section>
          `}
        ${Q(e.data.runbooks)}
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
function ie(t, e = {}) {
  if (!t)
    return null;
  const r = new se({
    endpoint: e.endpoint ?? t.dataset.endpoint ?? "",
    queueEndpoint: e.queueEndpoint ?? t.dataset.queueEndpoint ?? "",
    familiesEndpoint: e.familiesEndpoint ?? t.dataset.familiesEndpoint ?? "",
    refreshInterval: e.refreshInterval ?? p(t.dataset.refreshInterval, 3e4),
    title: e.title ?? t.dataset.title ?? "Translation Dashboard",
    fetch: e.fetch
  });
  return r.mount(t), r;
}
export {
  se as TranslationDashboardPage,
  b as TranslationDashboardRequestError,
  F as buildTranslationDashboardURL,
  N as createTranslationDashboardClient,
  H as createTranslationDashboardRefreshController,
  ie as initTranslationDashboardPage,
  M as normalizeTranslationDashboardCard,
  T as normalizeTranslationDashboardLink,
  j as normalizeTranslationDashboardQueryModel,
  z as normalizeTranslationDashboardResponse,
  I as normalizeTranslationDashboardRunbook,
  q as normalizeTranslationDashboardTable,
  D as normalizeTranslationDashboardTableRow
};
//# sourceMappingURL=index.js.map

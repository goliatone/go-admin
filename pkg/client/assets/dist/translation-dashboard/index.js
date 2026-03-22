import { n as i, t as u } from "../chunks/html-Cx1oHGAm.js";
import { extractStructuredError as z } from "../toast/error-helpers.js";
import { n as F } from "../chunks/http-client-DiXyH5DW.js";
import { $ as R, C as P, E as H, S as B, _ as v, d as $, g as I, h as S, i as K, m as A, p as j, s as D, v as L, x as U } from "../chunks/translation-shared-BSLmw_rJ.js";
var m = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationDashboardRequestError", this.status = e.status, this.code = e.code ?? null, this.requestId = e.requestId, this.traceId = e.traceId, this.metadata = e.metadata ?? null;
  }
};
function r(e) {
  return typeof e == "string" ? e.trim() : "";
}
function p(e, t = 0) {
  if (typeof e == "number" && Number.isFinite(e)) return e;
  if (typeof e == "string" && e.trim() !== "") {
    const s = Number(e);
    if (Number.isFinite(s)) return s;
  }
  return t;
}
function l(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function x(e) {
  const t = {};
  for (const [s, a] of Object.entries(l(e))) {
    const n = r(a);
    n && (t[s] = n);
  }
  return t;
}
function T(e) {
  const t = {};
  for (const [s, a] of Object.entries(l(e))) t[s] = p(a);
  return t;
}
function c(e, t) {
  if (!Array.isArray(e)) return [];
  const s = [];
  for (const a of e) {
    const n = t(a);
    n && s.push(n);
  }
  return s;
}
function w(e) {
  const t = r(e).toLowerCase();
  switch (t) {
    case "warning":
    case "critical":
    case "degraded":
      return t;
    default:
      return "ok";
  }
}
function M(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  return {
    href: r(t.href),
    group: r(t.group),
    route: r(t.route),
    resolverKey: r(t.resolver_key),
    params: x(t.params),
    query: x(t.query),
    key: r(t.key),
    label: r(t.label),
    description: r(t.description),
    relation: r(t.relation),
    tableId: r(t.table_id),
    entityType: r(t.entity_type),
    entityId: r(t.entity_id)
  };
}
function X(e) {
  const t = l(e), s = r(t.key);
  return s ? {
    key: s,
    label: r(t.label),
    description: r(t.description),
    relation: r(t.relation),
    group: r(t.group),
    route: r(t.route),
    resolverKey: r(t.resolver_key),
    entityType: r(t.entity_type)
  } : null;
}
function G(e) {
  const t = l(e), s = r(t.id);
  if (!s) return null;
  const a = l(t.alert);
  return {
    id: s,
    label: r(t.label),
    description: r(t.description),
    count: p(t.count),
    breakdown: T(t.breakdown),
    alert: {
      state: w(a.state),
      message: r(a.message)
    },
    drilldown: M(t.drilldown),
    metricKey: r(t.metric_key),
    runbookId: r(t.runbook_id)
  };
}
function Y(e) {
  const t = l(e);
  if (Object.keys(t).length === 0) return null;
  const s = {};
  for (const [a, n] of Object.entries(l(t.links))) {
    const o = M(n);
    o && (s[a] = o);
  }
  return {
    ...t,
    links: s
  };
}
function Q(e, t = "") {
  const s = l(e), a = c(s.rows, Y);
  return {
    id: r(s.id) || t,
    label: r(s.label) || t,
    total: p(s.total, a.length),
    limit: p(s.limit, a.length),
    rows: a
  };
}
function C(e) {
  const t = l(e), s = r(t.id);
  return s ? {
    id: s,
    title: r(t.title),
    description: r(t.description),
    route: r(t.route),
    resolverKey: r(t.resolver_key),
    href: r(t.href),
    query: x(t.query)
  } : null;
}
function q(e) {
  const t = l(e), s = r(t.id);
  if (!s) return null;
  const a = {};
  for (const [n, o] of Object.entries(l(t.drilldown_links))) {
    const d = X(o);
    d && (a[n] = d);
  }
  return {
    id: s,
    description: r(t.description),
    scopeFields: c(t.scope_fields, (n) => r(n) || null),
    stableSortKeys: c(t.stable_sort_keys, (n) => r(n) || null),
    indexHints: c(t.index_hints, (n) => r(n) || null),
    supportedFilters: c(t.supported_filters, (n) => r(n) || null),
    defaultLimit: p(t.default_limit),
    drilldownRoute: r(t.drilldown_route),
    queueRoute: r(t.queue_route),
    apiRoute: r(t.api_route),
    resolverKeys: c(t.resolver_keys, (n) => r(n) || null),
    drilldownLinks: a
  };
}
function W(e) {
  const t = l(e), s = {};
  for (const [a, n] of Object.entries(l(t.query_models))) {
    const o = q(n);
    o && (s[a] = o);
  }
  return {
    cardIds: c(t.card_ids, (a) => r(a) || null),
    tableIds: c(t.table_ids, (a) => r(a) || null),
    alertStates: c(t.alert_states, (a) => w(a)),
    defaultLimits: T(t.default_limits),
    queryModels: s,
    runbooks: c(t.runbooks, C)
  };
}
function J(e) {
  const t = l(e), s = r(t.code);
  return s ? {
    state: w(t.state),
    code: s,
    message: r(t.message),
    cardId: r(t.card_id),
    runbookId: r(t.runbook_id)
  } : null;
}
function V(e, t) {
  if (t.cardIds.length === 0) return e;
  const s = /* @__PURE__ */ new Map();
  return t.cardIds.forEach((a, n) => s.set(a, n)), [...e].sort((a, n) => (s.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (s.get(n.id) ?? Number.MAX_SAFE_INTEGER));
}
function Z(e) {
  const t = l(e), s = l(t.data), a = l(t.meta), n = W(a.contracts), o = V(c(s.cards, G), n), d = {};
  for (const [f, h] of Object.entries(l(s.tables))) d[f] = Q(h, f);
  const b = { ...n.queryModels };
  for (const [f, h] of Object.entries(l(a.query_models))) {
    const g = q(h);
    g && (b[f] = g);
  }
  return {
    data: {
      cards: o,
      tables: d,
      alerts: c(s.alerts, J),
      runbooks: c(s.runbooks, C),
      summary: T(s.summary)
    },
    meta: {
      channel: r(a.channel),
      generatedAt: r(a.generated_at),
      refreshIntervalMs: p(a.refresh_interval_ms, 3e4),
      latencyTargetMs: p(a.latency_target_ms, 0),
      degraded: a.degraded === !0,
      degradedReasons: c(a.degraded_reasons, (f) => {
        const h = l(f), g = r(h.component), k = r(h.message);
        return !g && !k ? null : {
          component: g,
          message: k
        };
      }),
      familyReport: l(a.family_report),
      scope: x(a.scope),
      metrics: c(a.metrics, (f) => {
        const h = l(f), g = r(h.key);
        return g ? {
          key: g,
          unit: r(h.unit),
          sloP95Ms: h.slo_p95_ms === void 0 ? null : p(h.slo_p95_ms)
        } : null;
      }),
      queryModels: b,
      contracts: {
        ...n,
        queryModels: b
      }
    }
  };
}
function tt(e, t = {}) {
  const s = r(e);
  if (!s) return "";
  const a = s.startsWith("http://") || s.startsWith("https://") ? void 0 : "http://localhost", n = new URL(s, a), o = [
    ["channel", r(t.channel)],
    ["tenant_id", r(t.tenantId)],
    ["org_id", r(t.orgId)],
    ["overdue_limit", t.overdueLimit != null ? String(t.overdueLimit) : ""],
    ["blocked_limit", t.blockedLimit != null ? String(t.blockedLimit) : ""]
  ];
  for (const [d, b] of o) b && n.searchParams.set(d, b);
  return a ? `${n.pathname}${n.search}` : n.toString();
}
function et(e) {
  const t = r(e.endpoint), s = e.fetch ?? globalThis.fetch?.bind(globalThis);
  return { async fetchDashboard(a = {}) {
    if (!t) throw new m({
      message: "Translation dashboard endpoint is not configured",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const n = tt(t, a);
    if (!s) throw new m({
      message: "Fetch implementation is not available",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const o = await s(n, { headers: { Accept: "application/json" } });
    if (!o.ok) {
      const d = await z(o.clone());
      throw new m({
        message: d.message || await F(o, "Failed to load translation dashboard"),
        status: o.status,
        code: d.textCode,
        requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
        traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
        metadata: d.metadata
      });
    }
    return Z(await o.json());
  } };
}
function st(e) {
  const t = Math.max(0, e.intervalMs ?? 3e4);
  let s = null, a = null;
  const n = async () => a || (a = (async () => {
    try {
      const o = await e.load();
      return e.onData?.(o), o;
    } catch (o) {
      throw e.onError?.(o), o;
    } finally {
      a = null;
    }
  })(), a);
  return {
    async start() {
      await n(), t > 0 && s == null && (s = globalThis.setInterval(() => {
        n().catch(() => {
        });
      }, t));
    },
    stop() {
      s != null && (globalThis.clearInterval(s), s = null);
    },
    refresh: n,
    isRunning() {
      return s != null;
    }
  };
}
function y(e) {
  return e.replace(/[_-]+/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function _(e, t, s = "") {
  const a = i(e);
  return t?.href ? `<a class="${u(s)} text-sky-700 hover:text-sky-900 hover:underline" href="${u(t.href)}">${a}</a>` : `<span class="${u(s)}">${a}</span>`;
}
function at(e) {
  return [...e].sort((t, s) => {
    const a = (n) => n === "primary" ? 0 : 1;
    return a(t.relation) - a(s.relation);
  });
}
function O(e, t = "No drill-downs") {
  return e.length === 0 ? `<span class="text-gray-400">${i(t)}</span>` : at(e).map((s) => {
    const a = s.label || "Open";
    return s.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${u(s.key || a.toLowerCase())}" href="${u(s.href)}">${i(a)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${i(a)}</span>`;
  }).join("");
}
function rt(e) {
  const t = Object.entries(e.breakdown).map(([s, a]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${i(y(s))}</span>
        <span class="font-semibold text-gray-900">${i(String(a))}</span>
      </li>
    `).join("");
  return `
    <article class="${$} p-4 shadow-sm" data-dashboard-card="${u(e.id)}">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">${i(e.label)}</p>
          <p class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${i(String(e.count))}</p>
        </div>
        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${u(ct(e.alert.state))}">
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
        <div class="rounded-xl border px-4 py-3 text-sm ${u(ut(t.state))}" role="${u(t.state === "critical" ? "alert" : "status")}">
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
              <div class="font-medium text-gray-900">${_(r(t.source_title) || r(t.assignment_id), t.links.assignment)}</div>
              <div class="mt-1 text-xs text-gray-500">${i(r(t.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(`${r(t.source_locale).toUpperCase()} -> ${r(t.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${i(y(r(t.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${i(y(r(t.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${i(`${p(t.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${O(Object.values(t.links || {}))}</div>
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
              <div class="font-medium text-gray-900">${_(r(t.family_id), t.links.family)}</div>
              <div class="mt-1 text-xs text-gray-500">${i(r(t.content_type))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(y(r(t.readiness_state)))}</td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${i(String(p(t.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${i(String(p(t.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${O(Object.values(t.links || {}))}</div>
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
    <section class="overflow-hidden ${$} shadow-sm" data-dashboard-table="${u(e.id)}">
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
    <section class="${$} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${e.map((t) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${t.href ? `<a class="hover:underline" href="${u(t.href)}">${i(t.title)}</a>` : i(t.title)}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600">${i(t.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function N(e) {
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
function ct(e) {
  return R(N(e));
}
function ut(e) {
  return `border ${R(N(e))}`;
}
function pt(e) {
  const t = Object.entries(e.meta.scope).filter(([, s]) => s).map(([s, a]) => `${y(s)}: ${a}`);
  return `
    <section class="rounded-xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-200 shadow-sm" data-dashboard-meta="true">
      <div class="flex flex-wrap items-center gap-4">
        <span><strong class="font-semibold text-white">Channel:</strong> ${i(e.meta.channel || "default")}</span>
        <span><strong class="font-semibold text-white">Refresh:</strong> ${i(String(e.meta.refreshIntervalMs))}ms</span>
        <span><strong class="font-semibold text-white">Latency target:</strong> ${i(String(e.meta.latencyTargetMs))}ms p95</span>
      </div>
      ${t.length > 0 ? `<p class="mt-2 text-xs uppercase tracking-[0.18em] text-gray-400">${i(t.join(" • "))}</p>` : ""}
    </section>
  `;
}
function ht(e, t = !1) {
  const s = e?.meta.generatedAt ? new Date(e.meta.generatedAt).toLocaleString() : "Unavailable";
  return `
    <section class="${$} px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="${B}">Manager Monitoring</p>
          <h2 class="${P} text-xl mt-2">Queue health and publish blockers</h2>
          <p class="${U} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${i(t ? "Refreshing dashboard…" : `Last updated ${s}`)}
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
  const t = e.data.runbooks[0];
  return `
    <section class="${j} p-6 shadow-sm" data-dashboard-empty="true" role="status" aria-live="polite">
      <p class="${S}">No active pressure</p>
      <h3 class="mt-2 text-xl font-semibold text-gray-900">This scope is clear right now.</h3>
      <p class="${A} mt-3 max-w-2xl leading-6">Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.</p>
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${D}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${t?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${u(t.href)}">${i(t.title || "Open runbook")}</a>` : ""}
      </div>
    </section>
  `;
}
function gt(e) {
  const t = e instanceof m ? e.requestId : void 0, s = e instanceof m ? e.traceId : void 0, a = [t ? `Request ${t}` : "", s ? `Trace ${s}` : ""].filter(Boolean).join(" • ");
  return `
    <section class="${I} p-4" data-dashboard-inline-error="true" role="alert">
      <p class="${L}">Latest refresh failed</p>
      <p class="${v} mt-2">${i(e instanceof Error ? e.message : "Failed to load translation dashboard")}</p>
      ${a ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-rose-700">${i(a)}</p>` : ""}
    </section>
  `;
}
function mt(e) {
  const t = e instanceof Error ? e.message : "Failed to load translation dashboard", s = e instanceof m ? e.requestId : void 0, a = e instanceof m ? e.traceId : void 0, n = [s ? `Request ${s}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return `
    <section class="${I} p-4" data-dashboard-error="true" role="alert">
      <p class="${L}">Translation dashboard unavailable</p>
      <p class="${v} mt-2">Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.</p>
      <p class="${v} mt-2">${i(t)}</p>
      ${n ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-rose-700">${i(n)}</p>` : ""}
      <div class="mt-4">
        <button type="button" class="${K}" data-dashboard-refresh-button="true">Retry dashboard</button>
      </div>
    </section>
  `;
}
function bt() {
  return `
    <section class="${j} p-5" data-dashboard-empty="true">
      <p class="${S}">Dashboard contract route is not wired.</p>
      <p class="${A} mt-2">Set a dashboard aggregate endpoint before initializing the dashboard client.</p>
    </section>
  `;
}
function E() {
  return `
    <section class="${H} p-5" data-dashboard-loading="true" role="status" aria-live="polite">
      Loading translation dashboard aggregates...
    </section>
  `;
}
var yt = class {
  constructor(e) {
    this.refreshController = null, this.container = null, this.state = "idle", this.payload = null, this.refreshing = !1, this.lastError = null, this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...e
    }, this.client = et(e);
  }
  mount(e) {
    if (this.container = e, !r(this.config.endpoint)) {
      this.state = "error", e.innerHTML = bt();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, e.innerHTML = E(), this.refreshController = st({
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
        this.state = "error", this.container && (this.container.innerHTML = mt(t), this.bindActions());
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
    const e = this.payload, t = e.data.cards.map(rt).join(""), s = Object.values(e.data.tables).map(lt).join(""), a = Object.values(e.data.summary).every((d) => d === 0) && Object.values(e.data.tables).every((d) => d.rows.length === 0), n = e.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${i(e.meta.degradedReasons.map((d) => `${d.component}: ${d.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", o = this.lastError ? gt(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${ht(e, this.refreshing)}
        ${pt(e)}
        ${o}
        ${n}
        ${nt(e.data.alerts)}
        ${a ? ft(e) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${t}</section>
            <section class="grid gap-4 xl:grid-cols-2">${s}</section>
          `}
        ${dt(e.data.runbooks)}
      </div>
    `, this.bindActions();
  }
  bindActions() {
    !this.container || typeof this.container.querySelectorAll != "function" || this.container.querySelectorAll("[data-dashboard-refresh-button]").forEach((e) => {
      e.addEventListener("click", () => {
        this.refresh().catch(() => {
        });
      });
    });
  }
};
function wt(e, t = {}) {
  if (!e) return null;
  const s = new yt({
    endpoint: t.endpoint ?? e.dataset.endpoint ?? "",
    queueEndpoint: t.queueEndpoint ?? e.dataset.queueEndpoint ?? "",
    familiesEndpoint: t.familiesEndpoint ?? e.dataset.familiesEndpoint ?? "",
    refreshInterval: t.refreshInterval ?? p(e.dataset.refreshInterval, 3e4),
    title: t.title ?? e.dataset.title ?? "Translation Dashboard",
    fetch: t.fetch
  });
  return s.mount(e), s;
}
export {
  yt as TranslationDashboardPage,
  m as TranslationDashboardRequestError,
  tt as buildTranslationDashboardURL,
  et as createTranslationDashboardClient,
  st as createTranslationDashboardRefreshController,
  wt as initTranslationDashboardPage,
  G as normalizeTranslationDashboardCard,
  M as normalizeTranslationDashboardLink,
  q as normalizeTranslationDashboardQueryModel,
  Z as normalizeTranslationDashboardResponse,
  C as normalizeTranslationDashboardRunbook,
  Q as normalizeTranslationDashboardTable,
  Y as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
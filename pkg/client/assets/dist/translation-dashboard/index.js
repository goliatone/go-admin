import { escapeAttribute as u, escapeHTML as i } from "../shared/html.js";
import { readHTTPError as P } from "../shared/transport/http-client.js";
import { extractStructuredError as F } from "../toast/error-helpers.js";
import { buildEndpointURL as H } from "../shared/query-state/url-state.js";
import { StatefulController as B } from "../shared/stateful-controller.js";
import { asNumberish as p, asRecord as l, asString as s } from "../shared/coercion.js";
import { $ as R, C as U, E as K, S as X, _ as T, d as x, g as I, h as S, i as G, m as L, p as A, s as D, v as j, x as V } from "../chunks/translation-shared-BSLmw_rJ.js";
import { normalizeNumberRecord as w, normalizeStringRecord as y } from "../shared/record-normalization.js";
import { c as v, s as Y } from "../chunks/ui-states-CskzQjWR.js";
var f = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationDashboardRequestError", this.status = e.status, this.code = e.code ?? null, this.requestId = e.requestId, this.traceId = e.traceId, this.metadata = e.metadata ?? null;
  }
};
function c(e, t) {
  if (!Array.isArray(e)) return [];
  const a = [];
  for (const r of e) {
    const n = t(r);
    n && a.push(n);
  }
  return a;
}
function _(e) {
  const t = s(e).toLowerCase();
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
    href: s(t.href),
    group: s(t.group),
    route: s(t.route),
    resolverKey: s(t.resolver_key),
    params: y(t.params, { omitEmptyValues: !0 }),
    query: y(t.query, { omitEmptyValues: !0 }),
    key: s(t.key),
    label: s(t.label),
    description: s(t.description),
    relation: s(t.relation),
    tableId: s(t.table_id),
    entityType: s(t.entity_type),
    entityId: s(t.entity_id)
  };
}
function Q(e) {
  const t = l(e), a = s(t.key);
  return a ? {
    key: a,
    label: s(t.label),
    description: s(t.description),
    relation: s(t.relation),
    group: s(t.group),
    route: s(t.route),
    resolverKey: s(t.resolver_key),
    entityType: s(t.entity_type)
  } : null;
}
function J(e) {
  const t = l(e), a = s(t.id);
  if (!a) return null;
  const r = l(t.alert);
  return {
    id: a,
    label: s(t.label),
    description: s(t.description),
    count: p(t.count),
    breakdown: w(t.breakdown),
    alert: {
      state: _(r.state),
      message: s(r.message)
    },
    drilldown: M(t.drilldown),
    metricKey: s(t.metric_key),
    runbookId: s(t.runbook_id)
  };
}
function W(e) {
  const t = l(e);
  if (Object.keys(t).length === 0) return null;
  const a = {};
  for (const [r, n] of Object.entries(l(t.links))) {
    const o = M(n);
    o && (a[r] = o);
  }
  return {
    ...t,
    links: a
  };
}
function Z(e, t = "") {
  const a = l(e), r = c(a.rows, W);
  return {
    id: s(a.id) || t,
    label: s(a.label) || t,
    total: p(a.total, r.length),
    limit: p(a.limit, r.length),
    rows: r
  };
}
function q(e) {
  const t = l(e), a = s(t.id);
  return a ? {
    id: a,
    title: s(t.title),
    description: s(t.description),
    route: s(t.route),
    resolverKey: s(t.resolver_key),
    href: s(t.href),
    query: y(t.query, { omitEmptyValues: !0 })
  } : null;
}
function O(e) {
  const t = l(e), a = s(t.id);
  if (!a) return null;
  const r = {};
  for (const [n, o] of Object.entries(l(t.drilldown_links))) {
    const d = Q(o);
    d && (r[n] = d);
  }
  return {
    id: a,
    description: s(t.description),
    scopeFields: c(t.scope_fields, (n) => s(n) || null),
    stableSortKeys: c(t.stable_sort_keys, (n) => s(n) || null),
    indexHints: c(t.index_hints, (n) => s(n) || null),
    supportedFilters: c(t.supported_filters, (n) => s(n) || null),
    defaultLimit: p(t.default_limit),
    drilldownRoute: s(t.drilldown_route),
    queueRoute: s(t.queue_route),
    apiRoute: s(t.api_route),
    resolverKeys: c(t.resolver_keys, (n) => s(n) || null),
    drilldownLinks: r
  };
}
function tt(e) {
  const t = l(e), a = {};
  for (const [r, n] of Object.entries(l(t.query_models))) {
    const o = O(n);
    o && (a[r] = o);
  }
  return {
    cardIds: c(t.card_ids, (r) => s(r) || null),
    tableIds: c(t.table_ids, (r) => s(r) || null),
    alertStates: c(t.alert_states, (r) => _(r)),
    defaultLimits: w(t.default_limits),
    queryModels: a,
    runbooks: c(t.runbooks, q)
  };
}
function et(e) {
  const t = l(e), a = s(t.code);
  return a ? {
    state: _(t.state),
    code: a,
    message: s(t.message),
    cardId: s(t.card_id),
    runbookId: s(t.runbook_id)
  } : null;
}
function at(e, t) {
  if (t.cardIds.length === 0) return e;
  const a = /* @__PURE__ */ new Map();
  return t.cardIds.forEach((r, n) => a.set(r, n)), [...e].sort((r, n) => (a.get(r.id) ?? Number.MAX_SAFE_INTEGER) - (a.get(n.id) ?? Number.MAX_SAFE_INTEGER));
}
function st(e) {
  const t = l(e), a = l(t.data), r = l(t.meta), n = tt(r.contracts), o = at(c(a.cards, J), n), d = {};
  for (const [m, h] of Object.entries(l(a.tables))) d[m] = Z(h, m);
  const $ = { ...n.queryModels };
  for (const [m, h] of Object.entries(l(r.query_models))) {
    const g = O(h);
    g && ($[m] = g);
  }
  return {
    data: {
      cards: o,
      tables: d,
      alerts: c(a.alerts, et),
      runbooks: c(a.runbooks, q),
      summary: w(a.summary)
    },
    meta: {
      channel: s(r.channel),
      generatedAt: s(r.generated_at),
      refreshIntervalMs: p(r.refresh_interval_ms, 3e4),
      latencyTargetMs: p(r.latency_target_ms, 0),
      degraded: r.degraded === !0,
      degradedReasons: c(r.degraded_reasons, (m) => {
        const h = l(m), g = s(h.component), E = s(h.message);
        return !g && !E ? null : {
          component: g,
          message: E
        };
      }),
      familyReport: l(r.family_report),
      scope: y(r.scope, { omitEmptyValues: !0 }),
      metrics: c(r.metrics, (m) => {
        const h = l(m), g = s(h.key);
        return g ? {
          key: g,
          unit: s(h.unit),
          sloP95Ms: h.slo_p95_ms === void 0 ? null : p(h.slo_p95_ms)
        } : null;
      }),
      queryModels: $,
      contracts: {
        ...n,
        queryModels: $
      }
    }
  };
}
function rt(e, t = {}) {
  const a = new URLSearchParams(), r = [
    ["channel", s(t.channel)],
    ["tenant_id", s(t.tenantId)],
    ["org_id", s(t.orgId)],
    ["overdue_limit", t.overdueLimit != null ? String(t.overdueLimit) : ""],
    ["blocked_limit", t.blockedLimit != null ? String(t.blockedLimit) : ""]
  ];
  for (const [n, o] of r) o && a.set(n, o);
  return H(e, a, { preserveAbsolute: !0 });
}
function nt(e) {
  const t = s(e.endpoint), a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  return { async fetchDashboard(r = {}) {
    if (!t) throw new f({
      message: "Translation dashboard endpoint is not configured",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const n = rt(t, r);
    if (!a) throw new f({
      message: "Fetch implementation is not available",
      status: 0,
      code: "MISSING_CONTEXT"
    });
    const o = await a(n, { headers: { Accept: "application/json" } });
    if (!o.ok) {
      const d = await F(o.clone());
      throw new f({
        message: d.message || await P(o, "Failed to load translation dashboard"),
        status: o.status,
        code: d.textCode,
        requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
        traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
        metadata: d.metadata
      });
    }
    return st(await o.json());
  } };
}
function it(e) {
  const t = Math.max(0, e.intervalMs ?? 3e4);
  let a = null, r = null;
  const n = async () => r || (r = (async () => {
    try {
      const o = await e.load();
      return e.onData?.(o), o;
    } catch (o) {
      throw e.onError?.(o), o;
    } finally {
      r = null;
    }
  })(), r);
  return {
    async start() {
      await n(), t > 0 && a == null && (a = globalThis.setInterval(() => {
        n().catch(() => {
        });
      }, t));
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
function b(e) {
  return e.replace(/[_-]+/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function k(e, t, a = "") {
  const r = i(e);
  return t?.href ? `<a class="${u(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${u(t.href)}">${r}</a>` : `<span class="${u(a)}">${r}</span>`;
}
function ot(e) {
  return [...e].sort((t, a) => {
    const r = (n) => n === "primary" ? 0 : 1;
    return r(t.relation) - r(a.relation);
  });
}
function N(e, t = "No drill-downs") {
  return e.length === 0 ? `<span class="text-gray-400">${i(t)}</span>` : ot(e).map((a) => {
    const r = a.label || "Open";
    return a.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${u(a.key || r.toLowerCase())}" href="${u(a.href)}">${i(r)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${i(r)}</span>`;
  }).join("");
}
function lt(e) {
  const t = Object.entries(e.breakdown).map(([a, r]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${i(b(a))}</span>
        <span class="font-semibold text-gray-900">${i(String(r))}</span>
      </li>
    `).join("");
  return `
    <article class="${x} p-4 shadow-sm" data-dashboard-card="${u(e.id)}">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">${i(e.label)}</p>
          <p class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${i(String(e.count))}</p>
        </div>
        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${u(mt(e.alert.state))}">
          ${i(e.alert.message || e.alert.state)}
        </span>
      </div>
      <p class="mt-3 text-sm leading-6 text-gray-600">${i(e.description)}</p>
      ${t ? `<ul class="mt-4 space-y-2">${t}</ul>` : ""}
      <div class="mt-4 flex items-center justify-between gap-3 text-sm">
        ${k(e.drilldown?.label || "Open drilldown", e.drilldown)}
        <span class="text-xs text-gray-400">${i(e.metricKey)}</span>
      </div>
    </article>
  `;
}
function dt(e) {
  return e.length === 0 ? "" : `
    <section class="space-y-3" data-dashboard-alerts="true">
      ${e.map((t) => `
        <div class="rounded-xl border px-4 py-3 text-sm ${u(gt(t.state))}" role="${u(t.state === "critical" ? "alert" : "status")}">
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
function ct(e) {
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
              <div class="font-medium text-gray-900">${k(s(t.source_title) || s(t.assignment_id), t.links.assignment)}</div>
              <div class="mt-1 text-xs text-gray-500">${i(s(t.assignment_id))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(`${s(t.source_locale).toUpperCase()} -> ${s(t.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${i(b(s(t.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${i(b(s(t.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${i(`${p(t.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${N(Object.values(t.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function ut(e) {
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
              <div class="font-medium text-gray-900">${k(s(t.family_id), t.links.family)}</div>
              <div class="mt-1 text-xs text-gray-500">${i(s(t.content_type))}</div>
            </td>
            <td class="px-4 py-3 text-gray-600">${i(b(s(t.readiness_state)))}</td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${i(String(p(t.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${i(String(p(t.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${N(Object.values(t.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function ht(e) {
  const t = e.id === "top_overdue_assignments" ? ct(e) : ut(e);
  return `
    <section class="overflow-hidden ${x} shadow-sm" data-dashboard-table="${u(e.id)}">
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
function pt(e) {
  return e.length === 0 ? "" : `
    <section class="${x} p-4 shadow-sm" data-dashboard-runbooks="true">
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
function z(e) {
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
function mt(e) {
  return R(z(e));
}
function gt(e) {
  return `border ${R(z(e))}`;
}
function ft(e) {
  const t = Object.entries(e.meta.scope).filter(([, a]) => a).map(([a, r]) => `${b(a)}: ${r}`);
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
function bt(e, t = !1) {
  const a = e?.meta.generatedAt ? new Date(e.meta.generatedAt).toLocaleString() : "Unavailable";
  return `
    <section class="${x} px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="${X}">Manager Monitoring</p>
          <h2 class="${U} text-xl mt-2">Queue health and publish blockers</h2>
          <p class="${V} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${i(t ? "Refreshing dashboard…" : `Last updated ${a}`)}
          </span>
          <button type="button" class="${D}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${t ? "disabled" : ""}>
            ${i(t ? "Refreshing…" : "Refresh dashboard")}
          </button>
        </div>
      </div>
    </section>
  `;
}
function yt(e) {
  const t = e.data.runbooks[0], a = t?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${u(t.href)}">${i(t.title || "Open runbook")}</a>` : "";
  return v({
    tag: "section",
    containerClass: `${A} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No active pressure",
    titleClass: S,
    heading: "This scope is clear right now.",
    headingTag: "h3",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.",
    messageClass: `${L} mt-3 max-w-2xl leading-6`,
    actionsHtml: `
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${D}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${a}
      </div>
    `,
    attributes: { "data-dashboard-empty": "true" },
    ariaLive: "polite"
  });
}
function xt(e) {
  const t = e instanceof f ? e.requestId : void 0, a = e instanceof f ? e.traceId : void 0, r = [t ? `Request ${t}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return v({
    tag: "section",
    containerClass: `${I} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Latest refresh failed",
    titleClass: j,
    message: e instanceof Error ? e.message : "Failed to load translation dashboard",
    messageClass: `${T} mt-2`,
    metadata: r,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    role: "alert",
    attributes: { "data-dashboard-inline-error": "true" }
  });
}
function vt(e) {
  const t = e instanceof Error ? e.message : "Failed to load translation dashboard", a = e instanceof f ? e.requestId : void 0, r = e instanceof f ? e.traceId : void 0, n = [a ? `Request ${a}` : "", r ? `Trace ${r}` : ""].filter(Boolean).join(" • ");
  return v({
    tag: "section",
    containerClass: `${I} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Translation dashboard unavailable",
    titleClass: j,
    heading: "Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.",
    headingTag: "p",
    headingClass: `${T} mt-2`,
    message: t,
    messageClass: `${T} mt-2`,
    metadata: n,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" class="${G}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: "alert",
    attributes: { "data-dashboard-error": "true" }
  });
}
function $t() {
  return v({
    tag: "section",
    containerClass: `${A} p-5`,
    bodyClass: "",
    contentClass: "",
    title: "Dashboard contract route is not wired.",
    titleClass: S,
    message: "Set a dashboard aggregate endpoint before initializing the dashboard client.",
    messageClass: `${L} mt-2`,
    attributes: { "data-dashboard-empty": "true" }
  });
}
function C() {
  return Y({
    tag: "section",
    text: "Loading translation dashboard aggregates...",
    showSpinner: !1,
    containerClass: `${K} p-5`,
    attributes: { "data-dashboard-loading": "true" },
    ariaLive: "polite"
  });
}
var Tt = class extends B {
  constructor(e) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...e
    }, this.client = nt(e);
  }
  mount(e) {
    if (this.container = e, !s(this.config.endpoint)) {
      this.state = "error", e.innerHTML = $t();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, e.innerHTML = C(), this.refreshController = it({
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
        this.state = "error", this.container && (this.container.innerHTML = vt(t), this.bindActions());
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
    const e = this.payload, t = e.data.cards.map(lt).join(""), a = Object.values(e.data.tables).map(ht).join(""), r = Object.values(e.data.summary).every((d) => d === 0) && Object.values(e.data.tables).every((d) => d.rows.length === 0), n = e.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${i(e.meta.degradedReasons.map((d) => `${d.component}: ${d.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", o = this.lastError ? xt(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${bt(e, this.refreshing)}
        ${ft(e)}
        ${o}
        ${n}
        ${dt(e.data.alerts)}
        ${r ? yt(e) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${t}</section>
            <section class="grid gap-4 xl:grid-cols-2">${a}</section>
          `}
        ${pt(e.data.runbooks)}
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
function At(e, t = {}) {
  if (!e) return null;
  const a = new Tt({
    endpoint: t.endpoint ?? e.dataset.endpoint ?? "",
    queueEndpoint: t.queueEndpoint ?? e.dataset.queueEndpoint ?? "",
    familiesEndpoint: t.familiesEndpoint ?? e.dataset.familiesEndpoint ?? "",
    refreshInterval: t.refreshInterval ?? p(e.dataset.refreshInterval, 3e4),
    title: t.title ?? e.dataset.title ?? "Translation Dashboard",
    fetch: t.fetch
  });
  return a.mount(e), a;
}
export {
  Tt as TranslationDashboardPage,
  f as TranslationDashboardRequestError,
  rt as buildTranslationDashboardURL,
  nt as createTranslationDashboardClient,
  it as createTranslationDashboardRefreshController,
  At as initTranslationDashboardPage,
  J as normalizeTranslationDashboardCard,
  M as normalizeTranslationDashboardLink,
  O as normalizeTranslationDashboardQueryModel,
  st as normalizeTranslationDashboardResponse,
  q as normalizeTranslationDashboardRunbook,
  Z as normalizeTranslationDashboardTable,
  W as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
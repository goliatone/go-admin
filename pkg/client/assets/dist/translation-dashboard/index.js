import { escapeHTML as i, escapeAttribute as h } from "../shared/html.js";
import { asString as s, asRecord as l, asNumberish as m } from "../shared/coercion.js";
import { normalizeStringRecord as x, normalizeNumberRecord as w } from "../shared/record-normalization.js";
import { StatefulController as P } from "../shared/stateful-controller.js";
import { r as H } from "../chunks/http-client-DZnuedzQ.js";
import { r as v, a as F } from "../chunks/ui-states-B4-pLIrz.js";
import { extractStructuredError as B } from "../toast/error-helpers.js";
import { E as R, i as I, j as S, L as K, d as $, k as L, l as A, m as T, H as U, h as X, a as G, f as j, q as V, p as D } from "../chunks/style-constants-i2xRoO1L.js";
class b extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationDashboardRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
}
function d(e, t) {
  if (!Array.isArray(e))
    return [];
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
  if (!e || typeof e != "object")
    return null;
  const t = e;
  return {
    href: s(t.href),
    group: s(t.group),
    route: s(t.route),
    resolverKey: s(t.resolver_key),
    params: x(t.params, { omitEmptyValues: !0 }),
    query: x(t.query, { omitEmptyValues: !0 }),
    key: s(t.key),
    label: s(t.label),
    description: s(t.description),
    relation: s(t.relation),
    tableId: s(t.table_id),
    entityType: s(t.entity_type),
    entityId: s(t.entity_id)
  };
}
function Y(e) {
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
function Q(e) {
  const t = l(e), a = s(t.id);
  if (!a)
    return null;
  const r = l(t.alert);
  return {
    id: a,
    label: s(t.label),
    description: s(t.description),
    count: m(t.count),
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
  if (Object.keys(t).length === 0)
    return null;
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
function J(e, t = "") {
  const a = l(e), r = d(a.rows, W);
  return {
    id: s(a.id) || t,
    label: s(a.label) || t,
    total: m(a.total, r.length),
    limit: m(a.limit, r.length),
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
    query: x(t.query, { omitEmptyValues: !0 })
  } : null;
}
function O(e) {
  const t = l(e), a = s(t.id);
  if (!a)
    return null;
  const r = {};
  for (const [n, o] of Object.entries(l(t.drilldown_links))) {
    const c = Y(o);
    c && (r[n] = c);
  }
  return {
    id: a,
    description: s(t.description),
    scopeFields: d(t.scope_fields, (n) => s(n) || null),
    stableSortKeys: d(t.stable_sort_keys, (n) => s(n) || null),
    indexHints: d(t.index_hints, (n) => s(n) || null),
    supportedFilters: d(t.supported_filters, (n) => s(n) || null),
    defaultLimit: m(t.default_limit),
    drilldownRoute: s(t.drilldown_route),
    queueRoute: s(t.queue_route),
    apiRoute: s(t.api_route),
    resolverKeys: d(t.resolver_keys, (n) => s(n) || null),
    drilldownLinks: r
  };
}
function Z(e) {
  const t = l(e), a = {};
  for (const [r, n] of Object.entries(l(t.query_models))) {
    const o = O(n);
    o && (a[r] = o);
  }
  return {
    cardIds: d(t.card_ids, (r) => s(r) || null),
    tableIds: d(t.table_ids, (r) => s(r) || null),
    alertStates: d(t.alert_states, (r) => _(r)),
    defaultLimits: w(t.default_limits),
    queryModels: a,
    runbooks: d(t.runbooks, q)
  };
}
function tt(e) {
  const t = l(e), a = s(t.code);
  return a ? {
    state: _(t.state),
    code: a,
    message: s(t.message),
    cardId: s(t.card_id),
    runbookId: s(t.runbook_id)
  } : null;
}
function et(e, t) {
  if (t.cardIds.length === 0)
    return e;
  const a = /* @__PURE__ */ new Map();
  return t.cardIds.forEach((r, n) => a.set(r, n)), [...e].sort((r, n) => (a.get(r.id) ?? Number.MAX_SAFE_INTEGER) - (a.get(n.id) ?? Number.MAX_SAFE_INTEGER));
}
function at(e) {
  const t = l(e), a = l(t.data), r = l(t.meta), n = Z(r.contracts), o = et(
    d(a.cards, Q),
    n
  ), c = {};
  for (const [g, p] of Object.entries(l(a.tables)))
    c[g] = J(p, g);
  const u = { ...n.queryModels };
  for (const [g, p] of Object.entries(l(r.query_models))) {
    const f = O(p);
    f && (u[g] = f);
  }
  return {
    data: {
      cards: o,
      tables: c,
      alerts: d(a.alerts, tt),
      runbooks: d(a.runbooks, q),
      summary: w(a.summary)
    },
    meta: {
      channel: s(r.channel),
      generatedAt: s(r.generated_at),
      refreshIntervalMs: m(r.refresh_interval_ms, 3e4),
      latencyTargetMs: m(r.latency_target_ms, 0),
      degraded: r.degraded === !0,
      degradedReasons: d(r.degraded_reasons, (g) => {
        const p = l(g), f = s(p.component), E = s(p.message);
        return !f && !E ? null : { component: f, message: E };
      }),
      familyReport: l(r.family_report),
      scope: x(r.scope, { omitEmptyValues: !0 }),
      metrics: d(r.metrics, (g) => {
        const p = l(g), f = s(p.key);
        return f ? {
          key: f,
          unit: s(p.unit),
          sloP95Ms: p.slo_p95_ms === void 0 ? null : m(p.slo_p95_ms)
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
function st(e, t = {}) {
  const a = s(e);
  if (!a)
    return "";
  const r = a.startsWith("http://") || a.startsWith("https://") ? void 0 : "http://localhost", n = new URL(a, r), o = [
    ["channel", s(t.channel)],
    ["tenant_id", s(t.tenantId)],
    ["org_id", s(t.orgId)],
    ["overdue_limit", t.overdueLimit != null ? String(t.overdueLimit) : ""],
    ["blocked_limit", t.blockedLimit != null ? String(t.blockedLimit) : ""]
  ];
  for (const [c, u] of o)
    u && n.searchParams.set(c, u);
  return r ? `${n.pathname}${n.search}` : n.toString();
}
function rt(e) {
  const t = s(e.endpoint), a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  return {
    async fetchDashboard(r = {}) {
      if (!t)
        throw new b({
          message: "Translation dashboard endpoint is not configured",
          status: 0,
          code: "MISSING_CONTEXT"
        });
      const n = st(t, r);
      if (!a)
        throw new b({
          message: "Fetch implementation is not available",
          status: 0,
          code: "MISSING_CONTEXT"
        });
      const o = await a(n, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!o.ok) {
        const c = await B(o.clone());
        throw new b({
          message: c.message || await H(o, "Failed to load translation dashboard"),
          status: o.status,
          code: c.textCode,
          requestId: o.headers.get("x-request-id") ?? o.headers.get("X-Request-ID") ?? void 0,
          traceId: o.headers.get("x-trace-id") ?? o.headers.get("x-correlation-id") ?? void 0,
          metadata: c.metadata
        });
      }
      return at(await o.json());
    }
  };
}
function nt(e) {
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
function y(e) {
  return e.replace(/[_-]+/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function k(e, t, a = "") {
  const r = i(e);
  return t?.href ? `<a class="${h(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${h(t.href)}">${r}</a>` : `<span class="${h(a)}">${r}</span>`;
}
function it(e) {
  return [...e].sort((t, a) => {
    const r = (n) => n === "primary" ? 0 : 1;
    return r(t.relation) - r(a.relation);
  });
}
function z(e, t = "No drill-downs") {
  return e.length === 0 ? `<span class="text-gray-400">${i(t)}</span>` : it(e).map((a) => {
    const r = a.label || "Open";
    return a.href ? `<a class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900" data-dashboard-link="${h(a.key || r.toLowerCase())}" href="${h(a.href)}">${i(r)}</a>` : `<span class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400">${i(r)}</span>`;
  }).join("");
}
function ot(e) {
  const t = Object.entries(e.breakdown).map(([a, r]) => `
      <li class="flex items-center justify-between gap-3 text-xs text-gray-600">
        <span>${i(y(a))}</span>
        <span class="font-semibold text-gray-900">${i(String(r))}</span>
      </li>
    `).join("");
  return `
    <article class="${$} p-4 shadow-sm" data-dashboard-card="${h(e.id)}">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">${i(e.label)}</p>
          <p class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${i(String(e.count))}</p>
        </div>
        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${h(pt(e.alert.state))}">
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
function lt(e) {
  return e.length === 0 ? "" : `
    <section class="space-y-3" data-dashboard-alerts="true">
      ${e.map((t) => `
        <div class="rounded-xl border px-4 py-3 text-sm ${h(mt(t.state))}" role="${h(t.state === "critical" ? "alert" : "status")}">
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
function dt(e) {
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
            <td class="px-4 py-3 text-gray-600">${i(y(s(t.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${i(y(s(t.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${i(`${m(t.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Assignment drill-down actions">${z(Object.values(t.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function ct(e) {
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
            <td class="px-4 py-3 text-gray-600">${i(y(s(t.readiness_state)))}</td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${i(String(m(t.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${i(String(m(t.pending_review_count)))}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2" aria-label="Family drill-down actions">${z(Object.values(t.links || {}))}</div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function ut(e) {
  const t = e.id === "top_overdue_assignments" ? dt(e) : ct(e);
  return `
    <section class="overflow-hidden ${$} shadow-sm" data-dashboard-table="${h(e.id)}">
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
function ht(e) {
  return e.length === 0 ? "" : `
    <section class="${$} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Runbooks</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        ${e.map((t) => `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="text-sm font-semibold text-gray-900">${t.href ? `<a class="hover:underline" href="${h(t.href)}">${i(t.title)}</a>` : i(t.title)}</h3>
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
function pt(e) {
  return D(N(e));
}
function mt(e) {
  return `border ${D(N(e))}`;
}
function gt(e) {
  const t = Object.entries(e.meta.scope).filter(([, a]) => a).map(([a, r]) => `${y(a)}: ${r}`);
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
function ft(e, t = !1) {
  const a = e?.meta.generatedAt ? new Date(e.meta.generatedAt).toLocaleString() : "Unavailable";
  return `
    <section class="${$} px-5 py-4 shadow-sm" data-dashboard-toolbar="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="${U}">Manager Monitoring</p>
          <h2 class="${X} text-xl mt-2">Queue health and publish blockers</h2>
          <p class="${G} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs uppercase tracking-[0.18em] text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
            ${i(t ? "Refreshing dashboard…" : `Last updated ${a}`)}
          </span>
          <button type="button" class="${j}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${t ? "disabled" : ""}>
            ${i(t ? "Refreshing…" : "Refresh dashboard")}
          </button>
        </div>
      </div>
    </section>
  `;
}
function bt(e) {
  const t = e.data.runbooks[0], a = t?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${h(t.href)}">${i(t.title || "Open runbook")}</a>` : "";
  return v({
    tag: "section",
    containerClass: `${R} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No active pressure",
    titleClass: I,
    heading: "This scope is clear right now.",
    headingTag: "h3",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.",
    messageClass: `${S} mt-3 max-w-2xl leading-6`,
    actionsHtml: `
      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="${j}" data-dashboard-refresh-button="true">Refresh dashboard</button>
        ${a}
      </div>
    `,
    attributes: {
      "data-dashboard-empty": "true"
    },
    ariaLive: "polite"
  });
}
function yt(e) {
  const t = e instanceof b ? e.requestId : void 0, a = e instanceof b ? e.traceId : void 0, r = [t ? `Request ${t}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ");
  return v({
    tag: "section",
    containerClass: `${L} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Latest refresh failed",
    titleClass: A,
    message: e instanceof Error ? e.message : "Failed to load translation dashboard",
    messageClass: `${T} mt-2`,
    metadata: r,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    role: "alert",
    attributes: {
      "data-dashboard-inline-error": "true"
    }
  });
}
function xt(e) {
  const t = e instanceof Error ? e.message : "Failed to load translation dashboard", a = e instanceof b ? e.requestId : void 0, r = e instanceof b ? e.traceId : void 0, n = [a ? `Request ${a}` : "", r ? `Trace ${r}` : ""].filter(Boolean).join(" • ");
  return v({
    tag: "section",
    containerClass: `${L} p-4`,
    bodyClass: "",
    contentClass: "",
    title: "Translation dashboard unavailable",
    titleClass: A,
    heading: "Managers can retry the aggregate request and return to queue-health monitoring once the endpoint recovers.",
    headingTag: "p",
    headingClass: `${T} mt-2`,
    message: t,
    messageClass: `${T} mt-2`,
    metadata: n,
    metadataClass: "mt-2 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" class="${V}" data-dashboard-refresh-button="true">Retry dashboard</button></div>`,
    role: "alert",
    attributes: {
      "data-dashboard-error": "true"
    }
  });
}
function vt() {
  return v({
    tag: "section",
    containerClass: `${R} p-5`,
    bodyClass: "",
    contentClass: "",
    title: "Dashboard contract route is not wired.",
    titleClass: I,
    message: "Set a dashboard aggregate endpoint before initializing the dashboard client.",
    messageClass: `${S} mt-2`,
    attributes: {
      "data-dashboard-empty": "true"
    }
  });
}
function C() {
  return F({
    tag: "section",
    text: "Loading translation dashboard aggregates...",
    showSpinner: !1,
    containerClass: `${K} p-5`,
    attributes: {
      "data-dashboard-loading": "true"
    },
    ariaLive: "polite"
  });
}
class $t extends P {
  constructor(t) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...t
    }, this.client = rt(t);
  }
  mount(t) {
    if (this.container = t, !s(this.config.endpoint)) {
      this.state = "error", t.innerHTML = vt();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, t.innerHTML = C(), this.refreshController = nt({
      intervalMs: this.config.refreshInterval,
      load: () => this.client.fetchDashboard(),
      onData: (a) => {
        this.payload = a, this.state = "ready", this.refreshing = !1, this.lastError = null, this.render();
      },
      onError: (a) => {
        if (this.refreshing = !1, this.lastError = a, this.payload) {
          this.state = "ready", this.render();
          return;
        }
        this.state = "error", this.container && (this.container.innerHTML = xt(a), this.bindActions());
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
    if (!this.container || !this.payload)
      return;
    const t = this.payload, a = t.data.cards.map(ot).join(""), r = Object.values(t.data.tables).map(ut).join(""), n = Object.values(t.data.summary).every((u) => u === 0) && Object.values(t.data.tables).every((u) => u.rows.length === 0), o = t.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${i(t.meta.degradedReasons.map((u) => `${u.component}: ${u.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", c = this.lastError ? yt(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${ft(t, this.refreshing)}
        ${gt(t)}
        ${c}
        ${o}
        ${lt(t.data.alerts)}
        ${n ? bt(t) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${a}</section>
            <section class="grid gap-4 xl:grid-cols-2">${r}</section>
          `}
        ${ht(t.data.runbooks)}
      </div>
    `, this.bindActions();
  }
  bindActions() {
    if (!this.container || typeof this.container.querySelectorAll != "function")
      return;
    this.container.querySelectorAll("[data-dashboard-refresh-button]").forEach((a) => {
      a.addEventListener("click", () => {
        this.refresh().catch(() => {
        });
      });
    });
  }
}
function St(e, t = {}) {
  if (!e)
    return null;
  const a = new $t({
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
  $t as TranslationDashboardPage,
  b as TranslationDashboardRequestError,
  st as buildTranslationDashboardURL,
  rt as createTranslationDashboardClient,
  nt as createTranslationDashboardRefreshController,
  St as initTranslationDashboardPage,
  Q as normalizeTranslationDashboardCard,
  M as normalizeTranslationDashboardLink,
  O as normalizeTranslationDashboardQueryModel,
  at as normalizeTranslationDashboardResponse,
  q as normalizeTranslationDashboardRunbook,
  J as normalizeTranslationDashboardTable,
  W as normalizeTranslationDashboardTableRow
};
//# sourceMappingURL=index.js.map

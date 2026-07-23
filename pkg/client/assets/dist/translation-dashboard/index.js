import { escapeAttribute as d, escapeHTML as l } from "../shared/html.js";
import { t as z } from "../chunks/icon-renderer-tQhqqQbt.js";
import { readHTTPError as oe } from "../shared/transport/http-client.js";
import { extractStructuredError as le } from "../toast/error-helpers.js";
import "../chunks/status-vocabulary-Bdx_bn1-.js";
import { buildEndpointURL as de, readLocationSearchParams as ce } from "../shared/query-state/url-state.js";
import { StatefulController as ue } from "../shared/stateful-controller.js";
import { asNumberish as y, asRecord as f, asString as n } from "../shared/coercion.js";
import { A as H, C as $, D as F, E as P, F as fe, N as he, O as U, P as pe, R as ge, T as G, a as S, d as be, f as T, g as me, i as ye, k as E, l as xe, n as I, o as ve, r as K, s as $e, t as V, u as w, ut as X, y as we } from "../chunks/translation-shared-opnbNxht.js";
import { normalizeNumberRecord as D, normalizeStringRecord as k } from "../shared/record-normalization.js";
import { c as L, s as ke } from "../chunks/ui-states-BUSrZfJR.js";
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
function _e(t) {
  const e = f(t), a = n(e.key);
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
function Te(t) {
  const e = f(t), a = n(e.id);
  if (!a) return null;
  const s = f(e.alert);
  return {
    id: a,
    label: n(e.label),
    description: n(e.description),
    count: y(e.count),
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
  const e = f(t), a = n(e.code);
  return a ? {
    code: a,
    label: n(e.label) || m(a),
    count: y(e.count),
    affectedLocales: g(e.affected_locales, (s) => n(s) || null)
  } : null;
}
function Ee(t) {
  const e = f(t), a = n(e.state);
  if (!(!a || a !== "available" && a !== "unavailable" && a !== "degraded"))
    return {
      state: a,
      message: n(e.message)
    };
}
function Ce(t) {
  const e = f(t);
  if (Object.keys(e).length === 0) return null;
  const a = {};
  for (const [h, u] of Object.entries(f(e.links))) {
    const c = Y(u);
    c && (a[h] = c);
  }
  const s = g(e.blocker_codes, (h) => n(h) || null), r = {};
  for (const [h, u] of Object.entries(f(e.blocker_labels))) {
    const c = n(u);
    c && (r[h] = c);
  }
  const i = g(e.reason_breakdown, Le), o = g(e.affected_locales, (h) => n(h) || null), b = Ee(e.reason_data);
  return {
    ...e,
    links: a,
    blockerCodes: s.length > 0 ? s : void 0,
    blockerLabels: Object.keys(r).length > 0 ? r : void 0,
    reasonBreakdown: i.length > 0 ? i : void 0,
    affectedLocales: o.length > 0 ? o : void 0,
    reasonData: b
  };
}
function Ae(t, e = "") {
  const a = f(t), s = g(a.rows, Ce);
  return {
    id: n(a.id) || e,
    label: n(a.label) || e,
    total: y(a.total, s.length),
    limit: y(a.limit, s.length),
    rows: s
  };
}
function W(t) {
  const e = f(t), a = n(e.id);
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
  const e = f(t), a = n(e.id);
  if (!a) return null;
  const s = {};
  for (const [r, i] of Object.entries(f(e.drilldown_links))) {
    const o = _e(i);
    o && (s[r] = o);
  }
  return {
    id: a,
    description: n(e.description),
    scopeFields: g(e.scope_fields, (r) => n(r) || null),
    stableSortKeys: g(e.stable_sort_keys, (r) => n(r) || null),
    indexHints: g(e.index_hints, (r) => n(r) || null),
    supportedFilters: g(e.supported_filters, (r) => n(r) || null),
    defaultLimit: y(e.default_limit),
    drilldownRoute: n(e.drilldown_route),
    queueRoute: n(e.queue_route),
    apiRoute: n(e.api_route),
    resolverKeys: g(e.resolver_keys, (r) => n(r) || null),
    drilldownLinks: s
  };
}
function Re(t) {
  const e = f(t), a = {};
  for (const [s, r] of Object.entries(f(e.query_models))) {
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
  const e = f(t), a = n(e.code);
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
  const e = f(t), a = f(e.data), s = f(e.meta), r = Re(s.contracts), i = Ie(g(a.cards, Te), r), o = {};
  for (const [h, u] of Object.entries(f(a.tables))) o[h] = Ae(u, h);
  const b = { ...r.queryModels };
  for (const [h, u] of Object.entries(f(s.query_models))) {
    const c = Q(u);
    c && (b[h] = c);
  }
  return {
    data: {
      cards: i,
      tables: o,
      alerts: g(a.alerts, Se),
      runbooks: g(a.runbooks, W),
      summary: D(a.summary)
    },
    meta: {
      channel: n(s.channel),
      generatedAt: n(s.generated_at),
      refreshIntervalMs: y(s.refresh_interval_ms, 3e4),
      latencyTargetMs: y(s.latency_target_ms, 0),
      degraded: s.degraded === !0,
      degradedReasons: g(s.degraded_reasons, (h) => {
        const u = f(h), c = n(u.component), x = n(u.message);
        return !c && !x ? null : {
          component: c,
          message: x
        };
      }),
      familyReport: f(s.family_report),
      scope: k(s.scope, { omitEmptyValues: !0 }),
      metrics: g(s.metrics, (h) => {
        const u = f(h), c = n(u.key);
        return c ? {
          key: c,
          unit: n(u.unit),
          sloP95Ms: u.slo_p95_ms === void 0 ? null : y(u.slo_p95_ms)
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
function qe(t) {
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
      const o = await le(i.clone());
      throw new v({
        message: o.message || await oe(i, "Failed to load translation dashboard"),
        status: i.status,
        code: o.textCode,
        requestId: i.headers.get("x-request-id") ?? i.headers.get("X-Request-ID") ?? void 0,
        traceId: i.headers.get("x-trace-id") ?? i.headers.get("x-correlation-id") ?? void 0,
        metadata: o.metadata
      });
    }
    return De(await i.json());
  } };
}
function Me(t) {
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
}, Ne = {
  top_overdue_assignments: "Top Overdue Assignments",
  blocked_families: "Blocked Families"
}, je = {
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
}, _ = {
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
    icon: T
  }
};
function J(t, e) {
  return C[t]?.label || e || m(t);
}
function Z(t, e) {
  return C[t]?.shortLabel || C[t]?.label || e || m(t);
}
function A(t, e) {
  return Ne[t] || e || m(t);
}
function q(t, e) {
  return _[t]?.label || e || m(t);
}
function M(t, e) {
  return _[t]?.shortLabel || _[t]?.label || e || m(t);
}
function N(t) {
  const e = _[t]?.icon;
  return e ? z(e, {
    size: "16px",
    extraClass: "text-current"
  }) : "";
}
function p(t, e = "", a = "16px") {
  return z(t, {
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
  if (!e || e.length < 12) return `<span class="font-mono text-xs text-gray-500">${l(e)}</span>`;
  const a = `${e.slice(0, 4)}...${e.slice(-4)}`;
  return `
    <button type="button"
            class="inline-flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-gray-900 group cursor-pointer bg-transparent border-none p-0"
            data-copy-uuid="${d(e)}"
            title="Click to copy: ${d(e)}">
      <span>${l(a)}</span>
      ${p($e, "h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400", "12px")}
    </button>
  `;
}
function ze(t) {
  if (t < 1e3) return `${t}ms`;
  const e = Math.floor(t / 1e3);
  return e < 60 ? `${e}s` : `${Math.floor(e / 60)}m`;
}
function He(t) {
  return t <= 0 ? "N/A" : t < 1e3 ? `${t}ms` : `${(t / 1e3).toFixed(1)}s`;
}
function te(t, e, a = "") {
  const s = l(t);
  return e?.href ? `<a class="${d(a)} text-sky-700 hover:text-sky-900 hover:underline" href="${d(e.href)}">${s}</a>` : `<span class="${d(a)}">${s}</span>`;
}
function ae(t, e, a) {
  const s = a.filter((i) => i.href);
  if (s.length === 0) return '<span class="text-gray-400">No drill-downs</span>';
  const r = s.map((i) => `
        <a class="action-menu__item flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
           data-action-menu-item
           data-action="${d(i.key)}"
           role="menuitem"
           href="${d(i.href)}">
          <i class="iconoir-${d(i.icon)} w-4 h-4 flex-shrink-0" aria-hidden="true"></i>
          <span>${l(i.label)}</span>
        </a>`).join("");
  return `
    <div class="action-menu relative flex justify-end" data-action-menu data-row-id="${d(e)}" data-translation-row-actions>
      <button type="button"
              class="action-menu__trigger rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              data-action-menu-trigger
              aria-label="Actions for ${d(t)}"
              aria-haspopup="true"
              aria-expanded="false">
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
        </svg>
      </button>
      <div class="action-menu__content hidden absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
           data-action-menu-content
           role="menu"
           aria-orientation="vertical">${r}
      </div>
    </div>
  `;
}
function Fe(t) {
  return t.drilldown?.href ? `
    <a
      href="${d(t.drilldown.href)}"
      class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
      data-dashboard-drilldown="${d(t.id)}"
      title="${d(t.drilldown.description || t.drilldown.label || "Open drilldown")}"
    >
      <span>${l(t.drilldown.label || "Open")}</span>
      ${p(ye, "h-3.5 w-3.5", "14px")}
    </a>
  ` : '<span class="text-xs text-gray-400">No drilldown available</span>';
}
function Pe(t, e = []) {
  const a = Z(t.id, t.label), s = J(t.id, t.label), r = t.description ? `${s} - ${t.description}` : s;
  return `
    <article class="${$} p-4 shadow-sm flex flex-col" data-dashboard-card="${d(t.id)}" title="${d(r)}">
      <div class="flex items-start justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 truncate">${l(a)}</p>
        <span class="flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${d(re(t.alert.state))}">
          ${l(Be(t.alert.message, t.alert.state))}
        </span>
      </div>
      <div class="mt-3">
        <p class="text-3xl font-semibold tracking-tight text-gray-900">${l(String(t.count))}</p>
      </div>
      <div class="mt-auto pt-4">
        ${Fe(t)}
      </div>
    </article>
  `;
}
function Ue(t) {
  const e = {
    critical: 4,
    warning: 3,
    degraded: 2,
    ok: 1
  };
  return t.reduce((a, s) => e[s.state] > e[a] ? s.state : a, "ok");
}
function Ge(t, e) {
  const a = e.find((r) => r.id === t.cardId), s = a ? J(t.cardId, a.label) : m(t.cardId);
  return `
    <div class="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/50"
         data-alert-code="${d(t.code)}"
         role="${t.state === "critical" ? "alert" : "status"}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${d(re(t.state))}">${l(s)}</span>
          <span class="text-xs font-medium text-gray-600">${l(t.state)}</span>
        </div>
        <p class="mt-1.5 text-sm text-gray-700">${l(t.message)}</p>
      </div>
      <button type="button"
              class="flex-shrink-0 p-1 rounded hover:bg-gray-200/50 transition-colors"
              data-dismiss-alert="${d(t.code)}"
              aria-label="Dismiss alert for ${l(s)}">
        ${p(ve, "h-4 w-4 text-gray-500", "16px")}
      </button>
    </div>
  `;
}
function Ke(t, e, a, s) {
  const r = t.filter((c) => !s.has(c.code));
  if (r.length === 0) return "";
  const i = Ue(r), o = r.reduce((c, x) => (c[x.state] = (c[x.state] || 0) + 1, c), {}), b = Object.entries(o).filter(([, c]) => c > 0).map(([c, x]) => `${x} ${c}`).join(", "), h = r.map((c) => {
    const x = e.find((ie) => ie.id === c.cardId), ne = x ? Z(c.cardId, x.label) : m(c.cardId);
    return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-white/60 text-gray-700" data-alert-card="${d(c.cardId)}">${l(ne)}</span>`;
  }).join(""), u = a ? "rotate-180" : "";
  return `
    <section class="rounded-xl border ${et(i)} shadow-sm overflow-hidden"
             data-dashboard-alerts-section="true"
             role="region"
             aria-label="Dashboard alerts">
      <button type="button"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              data-alerts-toggle="true"
              aria-expanded="${a}">
        <div class="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          ${p(T, "h-5 w-5 flex-shrink-0", "20px")}
          <span class="text-sm font-semibold">${l(b)}</span>
          ${a ? "" : `<div class="flex items-center gap-1.5 flex-wrap">${h}</div>`}
        </div>
        ${p(K, `h-5 w-5 flex-shrink-0 transition-transform ${u}`, "20px")}
      </button>
      <div class="${a ? "" : "hidden"}" data-alerts-content="true">
        <div class="border-t border-current/20 px-4 py-3 space-y-2">
          ${r.map((c) => Ge(c, e)).join("")}
        </div>
      </div>
    </section>
  `;
}
function Ve(t) {
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
            <td class="px-4 py-3 text-gray-600">${l(`${n(e.source_locale).toUpperCase()} -> ${n(e.target_locale).toUpperCase()}`)}</td>
            <td class="px-4 py-3 text-gray-600">${l(m(n(e.priority)))}</td>
            <td class="px-4 py-3 text-gray-600">${l(m(n(e.status)))}</td>
            <td class="px-4 py-3 text-right font-medium text-rose-700">${l(`${y(e.overdue_minutes)}m`)}</td>
            <td class="px-4 py-3">
              ${ae(n(e.source_title) || n(e.assignment_id) || "assignment", n(e.assignment_id) || n(e.id), [
    {
      key: "open-assignment",
      label: e.links?.assignment?.label || "Open assignment",
      href: n(e.links?.assignment?.href),
      icon: "edit"
    },
    {
      key: "open-family",
      label: e.links?.family?.label || "Open family",
      href: n(e.links?.family?.href),
      icon: "folder"
    },
    {
      key: "open-queue",
      label: e.links?.queue?.label || "Open queue context",
      href: n(e.links?.queue?.href),
      icon: "list"
    },
    {
      key: "open",
      label: "Open",
      href: n(e.href),
      icon: "open-new-window"
    }
  ])}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function Xe(t) {
  const e = t.blockerCodes || [], a = t.blockerLabels || {};
  if (e.length === 0) return "";
  const s = /* @__PURE__ */ new Set(), r = e.map((i) => {
    const o = a[i] || m(i);
    return s.add(o.toLowerCase()), {
      code: i,
      label: o
    };
  });
  for (const [i, o] of Object.entries(a)) {
    const b = o.toLowerCase();
    e.includes(i) || s.has(b) || (s.add(b), r.push({
      code: i,
      label: o
    }));
  }
  return r.map(({ code: i, label: o }) => `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${i === "missing_locale" ? "bg-amber-100 text-amber-800" : i === "pending_review" ? "bg-sky-100 text-sky-800" : i === "outdated_source" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-700"}" data-blocker-code="${d(i)}">${l(o)}</span>`).join("");
}
function Ye(t) {
  const e = t.affectedLocales || [];
  if (e.length === 0) return "";
  const a = 3, s = e.slice(0, a), r = e.length - a;
  return `<div class="flex flex-wrap items-center gap-1">${s.map((i) => `<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">${l(i.toUpperCase())}</span>`).join("")}${r > 0 ? `<span class="inline-flex items-center text-xs text-gray-500">+${r}</span>` : ""}</div>`;
}
function We(t) {
  const e = t.reasonData;
  if (!e || e.state === "available") return "";
  const a = e.state === "degraded", s = a ? "text-amber-500" : "text-gray-400", r = a ? p(T, `h-3.5 w-3.5 ${s}`, "14px") : p(w, `h-3.5 w-3.5 ${s}`, "14px");
  return `
    <span class="inline-flex items-center gap-1 text-xs text-gray-500" title="${d(e.message || "Reason data is " + e.state)}">
      ${r}
      <span class="sr-only">${l(e.message || "Reason data " + e.state)}</span>
    </span>
  `;
}
function Qe(t) {
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
          <tr data-family-row="${d(n(e.family_id))}">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${te(n(e.content_type) || "Family", e.links.family)}</div>
              <div class="mt-1 flex items-center gap-2">
                ${ee(n(e.family_id))}
                ${We(e)}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">${Xe(e)}</div>
            </td>
            <td class="px-4 py-3">
              ${Ye(e)}
            </td>
            <td class="px-4 py-3 text-right font-medium text-amber-700">${l(String(y(e.missing_required_locale_count)))}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-700">${l(String(y(e.pending_review_count)))}</td>
            <td class="px-4 py-3">
              ${ae(n(e.content_type) || n(e.family_id) || "family", n(e.family_id) || n(e.id), [{
    key: "open-family",
    label: e.links?.family?.label || "Open family",
    href: n(e.links?.family?.href),
    icon: "folder"
  }, {
    key: "open-queue",
    label: e.links?.queue?.label || "Open queue",
    href: n(e.links?.queue?.href),
    icon: "list"
  }])}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function j(t, e = [], a = {}) {
  const s = t.id === "top_overdue_assignments" ? Ve(t) : Qe(t), r = A(t.id, t.label), i = {
    top_overdue_assignments: "translations.dashboard.overdue_triage",
    blocked_families: "translations.dashboard.publish_blockers"
  }[t.id], o = i ? e.find((b) => b.id === i) : void 0;
  return a.embedded ? `
      <div data-dashboard-table="${d(t.id)}">
        <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-white">
          <div>
            <p class="text-xs text-gray-500">Showing top ${l(String(t.rows.length))} of ${l(String(t.total))}</p>
          </div>
          ${o?.href ? `
            <a
              href="${d(o.href)}"
              class="${R}"
              data-dashboard-table-runbook="${d(t.id)}"
              title="${d(o.description || q(i || "", o.title))}"
            >
              ${N(i || "")}
              <span>${l(M(i || "", o.title))}</span>
            </a>
          ` : ""}
        </header>
        <div class="overflow-x-auto">${s}</div>
      </div>
    ` : `
    <section class="overflow-hidden ${$} shadow-sm" data-dashboard-table="${d(t.id)}">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">${l(r)}</h2>
          <p class="mt-1 text-xs text-gray-500">Showing top ${l(String(t.rows.length))} of ${l(String(t.total))}</p>
        </div>
        ${o?.href ? `
          <a
            href="${d(o.href)}"
            class="${R}"
            data-dashboard-table-runbook="${d(t.id)}"
            title="${d(o.description || q(i || "", o.title))}"
          >
            ${N(i || "")}
            <span>${l(M(i || "", o.title))}</span>
          </a>
        ` : ""}
      </header>
      <div class="overflow-x-auto">${s}</div>
    </section>
  `;
}
function Je(t, e, a) {
  const s = Object.keys(t);
  return s.length === 0 ? "" : s.length === 1 ? `<section class="space-y-4">${j(t[s[0]], e)}</section>` : `
    <section class="${$} shadow-sm overflow-hidden" data-dashboard-tables="true">
      <nav class="flex border-b border-gray-200 bg-gray-50 px-4" role="tablist" aria-label="Data tables">
        ${s.map((r) => {
    const i = je[r] || {
      label: A(r, r),
      shortLabel: A(r, r),
      icon: ""
    }, o = r === a;
    return `
        <button type="button"
                class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${o ? "text-blue-600 border-blue-600" : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"}"
                data-table-tab="${d(r)}"
                role="tab"
                aria-selected="${o}"
                aria-controls="table-panel-${d(r)}">
          ${i.icon ? p(i.icon, "h-4 w-4", "16px") : ""}
          <span>${l(i.shortLabel)}</span>
          <span class="sr-only">${l(i.label)}</span>
          <span class="ml-1 px-2 py-0.5 text-xs rounded-full ${o ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}">
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
        <div id="table-panel-${d(r)}"
             role="tabpanel"
             ${i ? "" : "hidden"}
             data-table-panel="${d(r)}">
          ${j(t[r], e, { embedded: !0 })}
        </div>
      `;
  }).join("")}
      </div>
    </section>
  `;
}
function Ze(t) {
  return t.length === 0 ? "" : `
    <section class="${$} p-4 shadow-sm" data-dashboard-runbooks="true">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Runbooks</h2>
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
function et(t) {
  return `border ${X(se(t))}`;
}
function tt(t, e = !1, a = !1) {
  const s = t?.meta.generatedAt ? new Date(t.meta.generatedAt).toLocaleString() : "Unavailable", r = t ? Object.entries(t.meta.scope).filter(([, u]) => u).filter(([u]) => u !== "actor_id").map(([u, c]) => ({
    key: m(u),
    value: String(c)
  })) : [], i = t ? ze(t.meta.refreshIntervalMs) : "N/A", o = t ? He(t.meta.latencyTargetMs) : "N/A", b = t?.meta.channel || "default", h = a ? "rotate-180" : "";
  return `
    <section class="${$} shadow-sm overflow-hidden" data-dashboard-toolbar="true">
      <div class="px-5 py-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="${pe}">Manager Monitoring</p>
            <h2 class="${fe} text-xl mt-2">Queue health and publish blockers</h2>
            <p class="${he} mt-2">Track overdue work, review backlog, and family readiness without rebuilding aggregate state in the browser.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs uppercase tracking-wider text-gray-500" aria-live="polite" data-dashboard-refresh-status="true">
              ${l(e ? "Refreshing dashboard…" : `Last updated ${s}`)}
            </span>
            <button type="button" class="${R}" data-dashboard-refresh-button="true" aria-label="Refresh translation dashboard" ${e ? "disabled" : ""}>
              ${p(be, e ? "h-4 w-4 animate-spin" : "h-4 w-4", "16px")}
              ${l(e ? "Refreshing…" : "Refresh")}
            </button>
          </div>
        </div>
      </div>
      ${t ? `
        <div class="border-t border-gray-100 bg-gray-50 px-5 py-2">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Dashboard channel">
                ${p(xe, "h-3 w-3 text-gray-400", "12px")}
                <span>${l(b)}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Refresh interval: ${l(i)}">
                ${p(S, "h-3 w-3 text-gray-400", "12px")}
                <span>${l(i)}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white rounded border border-gray-200" title="Latency target: ${l(o)}">
                ${p(w, "h-3 w-3 text-gray-400", "12px")}
                <span>${l(o)}</span>
              </span>
            </div>
            <button type="button"
                    class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    data-meta-toggle="true"
                    aria-expanded="${a}"
                    aria-label="Toggle technical details">
              ${p(w, "h-3.5 w-3.5", "14px")}
              <span>Details</span>
              ${p(K, `h-3 w-3 transition-transform ${h}`, "12px")}
            </button>
          </div>
          <div class="${a ? "mt-3" : "hidden"}" data-meta-content="true">
            <dl class="border-t border-gray-200 pt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <div>
                <dt class="text-xs font-medium uppercase tracking-wider text-gray-500">Channel</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${l(b)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wider text-gray-500">Refresh Interval</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${l(i)}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wider text-gray-500">Latency Target</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">${l(o)}</dd>
              </div>
              ${r.map(({ key: u, value: c }) => `
                <div>
                  <dt class="text-xs font-medium uppercase tracking-wider text-gray-500">${l(u)}</dt>
                  <dd class="mt-1 text-xs font-medium text-gray-900 font-mono">${l(c)}</dd>
                </div>
              `).join("")}
            </dl>
          </div>
        </div>
      ` : ""}
    </section>
  `;
}
p(I, "h-5 w-5", "20px"), p(T, "h-5 w-5", "20px"), p(V, "h-5 w-5", "20px"), p(w, "h-5 w-5", "20px");
function at(t) {
  const e = t.data.runbooks[0], a = e?.href ? `<a class="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" href="${d(e.href)}">${l(e.title || "Open runbook")}</a>` : "";
  return L({
    tag: "section",
    containerClass: `${G} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No active pressure",
    titleClass: F,
    heading: "This scope is clear right now.",
    headingTag: "h3",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Managers can refresh the aggregate snapshot to confirm the latest state or jump into a runbook if activity is expected to resume.",
    messageClass: `${P} mt-3 max-w-2xl leading-6`,
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
function st(t) {
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
function rt(t) {
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
function nt() {
  return L({
    tag: "section",
    containerClass: `${G} p-5`,
    bodyClass: "",
    contentClass: "",
    title: "Dashboard contract route is not wired.",
    titleClass: F,
    message: "Set a dashboard aggregate endpoint before initializing the dashboard client.",
    messageClass: `${P} mt-2`,
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
var it = class extends ue {
  constructor(t) {
    super("idle"), this.refreshController = null, this.container = null, this.payload = null, this.refreshing = !1, this.lastError = null, this.metaExpanded = !1, this.alertsExpanded = !1, this.dismissedAlerts = /* @__PURE__ */ new Set(), this.activeTableTab = "top_overdue_assignments", this.config = {
      refreshInterval: 3e4,
      title: "Translation Dashboard",
      ...t
    }, this.client = qe(t);
  }
  mount(t) {
    if (this.container = t, !n(this.config.endpoint)) {
      this.state = "error", t.innerHTML = nt();
      return;
    }
    this.state = "loading", this.refreshing = !1, this.lastError = null, t.innerHTML = B(), this.refreshController = Me({
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
        this.state = "error", this.container && (this.container.innerHTML = rt(e), this.bindActions());
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
    const t = this.payload, e = t.data.runbooks, a = t.data.cards.map((o) => Pe(o, e)).join(""), s = Object.values(t.data.summary).every((o) => o === 0) && Object.values(t.data.tables).every((o) => o.rows.length === 0), r = t.meta.degraded ? `
        <section class="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700" data-dashboard-degraded="true" role="status" aria-live="polite">
          <p class="font-semibold text-gray-900">Family aggregate data is degraded.</p>
          <p class="mt-2">Managers can continue triage, but family readiness figures may be incomplete until the aggregate recovers.</p>
          <p class="mt-2">${l(t.meta.degradedReasons.map((o) => `${o.component}: ${o.message}`).join(" | ") || "Retry the dashboard request to refresh family blocker data.")}</p>
        </section>
      ` : "", i = this.lastError ? st(this.lastError) : "";
    this.container.innerHTML = `
      <div class="space-y-4" data-dashboard="true">
        ${tt(t, this.refreshing, this.metaExpanded)}
        ${i}
        ${r}
        ${Ke(t.data.alerts, t.data.cards, this.alertsExpanded, this.dismissedAlerts)}
        ${s ? at(t) : `
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">${a}</section>
            ${Je(t.data.tables, e, this.activeTableTab)}
          `}
        ${Ze(t.data.runbooks)}
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
            ${p(I, "h-3 w-3 text-green-500", "12px")}
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
function ot(t, e) {
  t.querySelectorAll("[data-translation-table-tab]").forEach((a) => {
    const s = a.dataset.translationTableTab === e;
    a.setAttribute("aria-selected", s ? "true" : "false"), a.tabIndex = s ? 0 : -1, a.classList.toggle("border-blue-500", s), a.classList.toggle("text-blue-700", s), a.classList.toggle("border-transparent", !s), a.classList.toggle("text-gray-600", !s);
  }), t.querySelectorAll("[data-translation-table-panel]").forEach((a) => {
    const s = a.dataset.translationTablePanel === e;
    a.hidden = !s, a.classList.toggle("hidden", !s);
  });
}
function lt(t) {
  t.dataset.translationDashboardEnhanced !== "true" && (t.dataset.translationDashboardEnhanced = "true", typeof t.querySelectorAll == "function" && (t.querySelectorAll("[data-translation-table-tab]").forEach((e) => {
    e.addEventListener("click", () => {
      const a = e.dataset.translationTableTab;
      a && ot(t, a);
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
function dt() {
  if (typeof window > "u" || !window.location) return !1;
  const t = (ce(window.location) ?? new URLSearchParams()).get("translation_client_render");
  return t === "1" || t === "true";
}
function $t(t, e = {}) {
  if (!t) return null;
  if (t.dataset?.ssrEnhanced === "true" && !dt())
    return lt(t), null;
  const a = new it({
    endpoint: e.endpoint ?? t.dataset.endpoint ?? "",
    queueEndpoint: e.queueEndpoint ?? t.dataset.queueEndpoint ?? "",
    familiesEndpoint: e.familiesEndpoint ?? t.dataset.familiesEndpoint ?? "",
    refreshInterval: e.refreshInterval ?? y(t.dataset.refreshInterval, 3e4),
    title: e.title ?? t.dataset.title ?? "Translation Dashboard",
    fetch: e.fetch
  });
  return a.mount(t), a;
}
export {
  it as TranslationDashboardPage,
  v as TranslationDashboardRequestError,
  Oe as buildTranslationDashboardURL,
  qe as createTranslationDashboardClient,
  Me as createTranslationDashboardRefreshController,
  $t as initTranslationDashboardPage,
  Te as normalizeTranslationDashboardCard,
  Y as normalizeTranslationDashboardLink,
  Q as normalizeTranslationDashboardQueryModel,
  De as normalizeTranslationDashboardResponse,
  W as normalizeTranslationDashboardRunbook,
  Ae as normalizeTranslationDashboardTable,
  Ce as normalizeTranslationDashboardTableRow
};

//# sourceMappingURL=index.js.map
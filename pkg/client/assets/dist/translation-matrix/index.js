import { n as m, t as f } from "../chunks/html-Cx1oHGAm.js";
import { extractStructuredError as A } from "../toast/error-helpers.js";
import { n as S } from "../chunks/http-client-D9Z2A1Pg.js";
import { n as w } from "../chunks/translation-contracts-NuS3GLjo.js";
import { $ as D, A as N, C as F, D as H, E as U, M as Q, O as X, S as Y, _ as W, g as G, h as E, i as K, j as V, k as J, m as M, p as R, s as Z, u as k, v as ee, x as te } from "../chunks/translation-shared-BSLmw_rJ.js";
function i(t) {
  return typeof t == "string" ? t.trim() : "";
}
function _(t) {
  return t === !0;
}
function u(t, e = 0) {
  if (typeof t == "number" && Number.isFinite(t)) return t;
  if (typeof t == "string" && t.trim() !== "") {
    const a = Number(t);
    if (Number.isFinite(a)) return a;
  }
  return e;
}
function l(t) {
  return t && typeof t == "object" && !Array.isArray(t) ? t : {};
}
function p(t) {
  if (!Array.isArray(t)) return [];
  const e = [];
  for (const a of t) {
    const r = i(a);
    r && !e.includes(r) && e.push(r);
  }
  return e;
}
function x(t) {
  return Array.isArray(t) ? t.map((e) => l(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function T(t) {
  return t.replace(/\/+$/, "");
}
function ae(t) {
  const e = i(t);
  return e ? T((e.startsWith("http://") || e.startsWith("https://") ? new URL(e).pathname : e).replace(/\/api(?:\/.*)?$/, "")) : "";
}
function re(t, e) {
  const a = T(i(t));
  return a || ae(e) || "/admin";
}
function se(t) {
  const e = l(t), a = i(e.href), r = i(e.label);
  return !a && !r ? null : {
    href: a,
    route: i(e.route),
    resolver_key: i(e.resolver_key),
    key: i(e.key),
    label: r,
    description: i(e.description),
    relation: i(e.relation)
  };
}
function C(t) {
  const e = l(t);
  return {
    enabled: _(e.enabled),
    label: i(e.label),
    description: i(e.description),
    href: i(e.href),
    endpoint: i(e.endpoint),
    method: i(e.method).toUpperCase() || "POST",
    route: i(e.route),
    resolver_key: i(e.resolver_key),
    permission: i(e.permission),
    reason: i(e.reason),
    reason_code: i(e.reason_code),
    payload: l(e.payload)
  };
}
function ie(t) {
  const e = {};
  for (const [a, r] of Object.entries(l(t))) e[a] = C(r);
  return e;
}
function I(t) {
  const e = l(t);
  return {
    endpoint: i(e.endpoint),
    method: i(e.method).toUpperCase(),
    route: i(e.route),
    resolver_key: i(e.resolver_key),
    base_path: i(e.base_path),
    type: i(e.type)
  };
}
function L(t) {
  const e = i(t).toLowerCase();
  switch (e) {
    case "ready":
    case "missing":
    case "in_progress":
    case "in_review":
    case "fallback":
    case "not_required":
      return e;
    default:
      return "missing";
  }
}
function ne(t) {
  const e = l(t);
  return {
    locale: i(e.locale),
    label: i(e.label) || i(e.locale).toUpperCase(),
    required_by_count: u(e.required_by_count),
    source_count: u(e.source_count),
    source_locale: _(e.source_locale),
    sticky: _(e.sticky)
  };
}
function oe(t) {
  const e = l(t), a = i(e.id), r = i(e.locale);
  return !a && !r ? null : {
    id: a,
    locale: r,
    status: i(e.status),
    is_source: _(e.is_source),
    source_record_id: i(e.source_record_id)
  };
}
function le(t) {
  const e = l(t), a = i(e.id);
  return a ? {
    id: a,
    status: i(e.status),
    assignee_id: i(e.assignee_id),
    reviewer_id: i(e.reviewer_id),
    work_scope: i(e.work_scope)
  } : null;
}
function ce(t) {
  const e = l(t), a = L(e.state);
  return {
    locale: i(e.locale),
    state: a,
    required: _(e.required),
    not_required: _(e.not_required) || a === "not_required",
    fallback: _(e.fallback) || a === "fallback",
    blocker_codes: p(e.blocker_codes),
    variant: oe(e.variant),
    assignment: le(e.assignment),
    quick_actions: ie(e.quick_actions)
  };
}
function de(t) {
  const e = l(t), a = l(e.cells), r = {};
  for (const [s, n] of Object.entries(a)) r[s] = ce({
    locale: s,
    ...l(n)
  });
  return {
    family_id: i(e.family_id),
    content_type: i(e.content_type),
    source_locale: i(e.source_locale),
    source_record_id: i(e.source_record_id),
    source_title: i(e.source_title),
    readiness_state: i(e.readiness_state),
    blocker_codes: p(e.blocker_codes),
    links: Object.fromEntries(Object.entries(l(e.links)).map(([s, n]) => [s, se(n)]).filter(([, s]) => s)),
    cells: r
  };
}
function P(t) {
  const e = l(t), a = l(e.viewport_target);
  return {
    id: i(e.id),
    description: i(e.description),
    scope_fields: p(e.scope_fields),
    supported_filters: p(e.supported_filters),
    stable_sort_keys: p(e.stable_sort_keys),
    default_page_size: u(e.default_page_size),
    max_page_size: u(e.max_page_size),
    default_locale_limit: u(e.default_locale_limit),
    max_locale_limit: u(e.max_locale_limit),
    viewport_target: {
      rows: u(a.rows),
      locales: u(a.locales)
    },
    index_hints: p(e.index_hints),
    ui_route: i(e.ui_route),
    api_route: i(e.api_route),
    resolver_keys: p(e.resolver_keys)
  };
}
function O(t) {
  const e = l(t);
  if (Object.keys(e).length === 0) return {};
  const a = l(e.bulk_actions), r = {};
  for (const [s, n] of Object.entries(a)) {
    const o = l(n);
    r[s] = {
      id: i(o.id) || s,
      permission: i(o.permission),
      endpoint_route: i(o.endpoint_route),
      resolver_key: i(o.resolver_key),
      required_fields: p(o.required_fields),
      optional_fields: p(o.optional_fields),
      result_statuses: p(o.result_statuses),
      selection_required: _(o.selection_required)
    };
  }
  return {
    schema_version: u(e.schema_version),
    cell_states: p(e.cell_states).map((s) => L(s)),
    latency_target_ms: u(e.latency_target_ms),
    query_model: P(e.query_model),
    bulk_actions: r
  };
}
function ue(t) {
  const e = l(l(t).bulk_actions), a = {};
  for (const [r, s] of Object.entries(e)) {
    const n = w(s);
    n && (a[r] = n);
  }
  return { bulk_actions: a };
}
function me(t) {
  const e = l(t), a = l(e.data), r = l(e.meta), s = x(a.columns).map(ne), n = x(a.rows).map(de), o = {};
  for (const [c, d] of Object.entries(l(r.quick_action_targets))) o[c] = I(d);
  return {
    data: {
      columns: s,
      rows: n,
      selection: ue(a.selection)
    },
    meta: {
      channel: i(r.channel),
      page: u(r.page, 1),
      per_page: u(r.per_page, 25),
      total: u(r.total),
      total_locales: u(r.total_locales),
      locale_offset: u(r.locale_offset),
      locale_limit: u(r.locale_limit),
      has_more_locales: _(r.has_more_locales),
      latency_target_ms: u(r.latency_target_ms),
      query_model: P(r.query_model),
      contracts: O(r.contracts),
      scope: Object.fromEntries(Object.entries(l(r.scope)).map(([c, d]) => [c, i(d)])),
      locale_policy: x(r.locale_policy).map((c) => {
        const d = l(c);
        return {
          locale: i(d.locale),
          label: i(d.label),
          sticky: _(d.sticky),
          source_locale: _(d.source_locale),
          required_by_count: u(d.required_by_count),
          optional_family_count: u(d.optional_family_count),
          not_required_family_ids: p(d.not_required_family_ids)
        };
      }),
      quick_action_targets: o
    }
  };
}
function pe(t) {
  const e = l(t), a = i(e.status);
  return {
    family_id: i(e.family_id),
    content_type: i(e.content_type),
    source_record_id: i(e.source_record_id),
    requested_locales: p(e.requested_locales),
    status: a || "failed",
    created: x(e.created),
    skipped: x(e.skipped),
    failures: x(e.failures),
    exportable_locales: p(e.exportable_locales),
    estimated_rows: u(e.estimated_rows)
  };
}
function fe(t) {
  const e = l(t), a = l(e.data), r = l(a.summary), s = {};
  for (const [n, o] of Object.entries(r)) s[n] = u(o);
  return {
    data: {
      action: i(a.action) || "create_missing",
      summary: s,
      results: x(a.results).map(pe),
      export_request: Object.keys(l(a.export_request)).length > 0 ? l(a.export_request) : void 0,
      preview_rows: x(a.preview_rows)
    },
    meta: {
      channel: i(l(e.meta).channel),
      contracts: O(l(e.meta).contracts)
    }
  };
}
function ge(t, e = {}) {
  const a = new URL(t, "http://localhost"), r = i(e.channel);
  return r && a.searchParams.set("channel", r), e.tenantId && a.searchParams.set("tenant_id", e.tenantId), e.orgId && a.searchParams.set("org_id", e.orgId), e.familyId && a.searchParams.set("family_id", e.familyId), e.contentType && a.searchParams.set("content_type", e.contentType), e.readinessState && a.searchParams.set("readiness_state", e.readinessState), e.blockerCode && a.searchParams.set("blocker_code", e.blockerCode), e.locales && e.locales.length > 0 && a.searchParams.set("locales", e.locales.join(",")), typeof e.page == "number" && a.searchParams.set("page", String(e.page)), typeof e.perPage == "number" && a.searchParams.set("per_page", String(e.perPage)), typeof e.localeOffset == "number" && a.searchParams.set("locale_offset", String(e.localeOffset)), typeof e.localeLimit == "number" && a.searchParams.set("locale_limit", String(e.localeLimit)), `${a.pathname}${a.search}`;
}
function y(t = {}) {
  const e = p(t.family_ids), a = p(t.locales), r = {};
  for (const [s, n] of Object.entries(l(t.bulk_actions))) {
    const o = w(n);
    o && (r[s] = o);
  }
  return {
    family_ids: e,
    locales: a,
    bulk_actions: r
  };
}
function he(t, e) {
  const a = i(e);
  if (!a) return y(t);
  const r = new Set(t.family_ids);
  return r.has(a) ? r.delete(a) : r.add(a), {
    ...y(t),
    family_ids: Array.from(r).sort()
  };
}
function _e(t, e) {
  return {
    ...y(t),
    locales: p(e)
  };
}
function xe(t, e = {}) {
  return {
    family_ids: [...t.family_ids],
    locales: [...t.locales],
    ...e
  };
}
function be(t) {
  return !!(t && t.state === "not_required");
}
function De(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const r of t.data.rows) be(r.cells[e.locale]) && a.push(r.family_id);
    return {
      locale: e.locale,
      label: e.label,
      sticky: e.sticky,
      source_locale: e.source_locale,
      required_by_count: e.required_by_count,
      optional_family_count: a.length,
      not_required_family_ids: a
    };
  });
}
var $ = class extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationMatrixRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
};
function j(t) {
  return i(t);
}
function q(t, e) {
  return {
    endpoint: `${j(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function ye(t) {
  const e = j(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(r = {}) {
      const s = await a(ge(e, r), { headers: { Accept: "application/json" } });
      if (!s.ok) {
        const n = await A(s);
        throw new $({
          message: n.message || await S(s, "Failed to load translation matrix"),
          status: s.status,
          code: n.textCode,
          requestId: s.headers.get("x-request-id") ?? void 0,
          traceId: s.headers.get("x-trace-id") ?? void 0,
          metadata: n.metadata
        });
      }
      return me(await s.json());
    },
    async runBulkAction(r, s) {
      const n = r ?? q(e, "create_missing"), o = i(n.endpoint);
      if (!o) throw new Error("Matrix bulk action endpoint is not configured.");
      const c = await a(o, {
        method: i(n.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(s)
      });
      if (!c.ok) {
        const d = await A(c);
        throw new $({
          message: d.message || await S(c, "Matrix action failed"),
          status: c.status,
          code: d.textCode,
          requestId: c.headers.get("x-request-id") ?? void 0,
          traceId: c.headers.get("x-trace-id") ?? void 0,
          metadata: d.metadata
        });
      }
      return fe(await c.json());
    }
  };
}
function v(t) {
  return i(t).replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function B(t) {
  return t.split(",").map((e) => e.trim().toLowerCase()).filter((e, a, r) => e && r.indexOf(e) === a);
}
function ke() {
  if (!globalThis.location) return {};
  const t = new URLSearchParams(globalThis.location.search), e = B(t.get("locales") ?? t.get("locale") ?? "");
  return {
    channel: i(t.get("channel")),
    tenantId: i(t.get("tenant_id")),
    orgId: i(t.get("org_id")),
    contentType: i(t.get("content_type")),
    readinessState: i(t.get("readiness_state")),
    blockerCode: i(t.get("blocker_code")),
    locales: e,
    page: t.get("page") ? u(t.get("page")) : void 0,
    perPage: t.get("per_page") ? u(t.get("per_page")) : void 0,
    localeLimit: t.get("locale_limit") ? u(t.get("locale_limit")) : void 0,
    localeOffset: t.get("locale_offset") ? u(t.get("locale_offset")) : void 0
  };
}
function we(t) {
  return [
    t.channel ? `Channel ${t.channel}` : "",
    t.tenantId ? `Tenant ${t.tenantId}` : "",
    t.orgId ? `Org ${t.orgId}` : ""
  ].filter(Boolean).join(" • ");
}
function $e(t, e, a = "Action") {
  const r = t.label || a, s = Object.entries(e).map(([o, c]) => `${f(o)}="${f(c)}"`).join(" "), n = t.reason || "Action unavailable";
  return `<button type="button" class="inline-flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${t.enabled ? "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100" : "border-gray-200 bg-gray-100 text-gray-500"}" ${s} ${t.enabled ? "" : "disabled"} title="${f(t.enabled ? t.description || r : n)}">${m(r)}</button>`;
}
function ve(t) {
  switch (t) {
    case "ready":
      return "success";
    case "missing":
      return "error";
    case "in_progress":
      return "warning";
    case "in_review":
      return "purple";
    case "fallback":
      return "warning";
    case "not_required":
      return "neutral";
    default:
      return "neutral";
  }
}
function Te(t) {
  const e = `border ${D(ve(t.state))}`, a = t.assignment?.status || t.variant?.status || v(t.state);
  return `
    <div class="flex items-center justify-between gap-2">
      <span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${f(e)}">${m(v(t.state))}</span>
      <span class="truncate text-[11px] text-gray-500">${m(v(a))}</span>
    </div>
  `;
}
function z(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? C({});
}
function Ae(t, e) {
  const a = t.data.columns, r = t.data.rows;
  return `
    <div class="${J}" data-matrix-grid="true">
      <table class="${Q}">
        <thead class="${N}">
          <tr>
            <th scope="col" class="${X} border-b border-gray-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === r.length && r.length > 0 ? "checked" : ""}>
                <span>Families</span>
              </label>
            </th>
            ${a.map((s) => {
    const n = t.meta.locale_policy.find((c) => c.locale === s.locale), o = e.locales.includes(s.locale);
    return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${f(s.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${o ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}">
                    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-700">${m(s.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${m(s.source_locale ? "Source locale" : `${n?.required_by_count ?? s.required_by_count} required families`)}</span>
                    <span class="mt-1 text-[11px] text-gray-400">${m(n && n.optional_family_count > 0 ? `${n.optional_family_count} optional` : "Header action")}</span>
                  </button>
                </th>
              `;
  }).join("")}
          </tr>
        </thead>
        <tbody>
          ${r.map((s, n) => `
            <tr data-matrix-row="${f(s.family_id)}">
              <th scope="row" class="${V} border-b border-gray-200 px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${f(s.family_id)}" ${e.family_ids.includes(s.family_id) ? "checked" : ""} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${f(s.links.family?.href || "#")}">${m(s.source_title || s.family_id)}</a>
                      <span class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">${m(s.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">${m(s.family_id)}</p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${s.links.content_detail?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${f(s.links.content_detail.href)}">Source</a>` : ""}
                      ${s.links.content_edit?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${f(s.links.content_edit.href)}">Edit source</a>` : ""}
                    </div>
                  </div>
                </div>
              </th>
              ${a.map((o, c) => {
    const d = s.cells[o.locale], g = z(d);
    return `
                  <td class="${H}">
                    <div class="min-w-[10rem] rounded-xl border border-gray-200 bg-gray-50 p-3">
                      ${Te(d)}
                      <div class="mt-3">
                        ${$e(g, {
      "data-matrix-cell-action": "true",
      "data-family-id": s.family_id,
      "data-locale": o.locale,
      "data-row-index": String(n),
      "data-col-index": String(c),
      "data-action-kind": g.enabled && g.href ? "open" : "create"
    }, g.enabled && g.href ? "Open" : "Create")}
                      </div>
                      ${g.reason && !g.enabled ? `<p class="mt-2 text-[11px] leading-5 text-gray-400">${m(g.reason)}</p>` : ""}
                    </div>
                  </td>
                `;
  }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
function Se(t, e, a, r = !1) {
  const s = e.bulk_actions.create_missing ?? w(null), n = e.bulk_actions.export_selected ?? w(null), o = e.family_ids.length === 0, c = s?.enabled ? o ? "Select at least one family row." : "" : s?.reason || "Create missing is unavailable.", d = n?.enabled ? o ? "Select at least one family row." : "" : n?.reason || "Export selected is unavailable.";
  return `
    <section class="rounded-xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-100 shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Bulk Actions</p>
          <p class="mt-2 text-sm text-gray-300">Selected families: <strong class="text-white">${m(String(e.family_ids.length))}</strong> · Selected locales: <strong class="text-white">${m(e.locales.length > 0 ? e.locales.join(", ") : "auto")}</strong></p>
          ${a ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-300" data-matrix-feedback="true">${m(a)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!s?.enabled || o || r ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-sky-500 text-white hover:bg-sky-400"}" ${!s?.enabled || o || r ? "disabled" : ""} title="${f(c || "Create missing locale work")}">${m(r ? "Working…" : "Create Missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!n?.enabled || o || r ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-white text-gray-900 hover:bg-gray-100"}" ${!n?.enabled || o || r ? "disabled" : ""} title="${f(d || "Export selected locale work")}">${m(r ? "Working…" : "Export Selected")}</button>
        </div>
      </div>
    </section>
  `;
}
function Ee(t) {
  const e = t.meta.page <= 1, a = t.meta.page * t.meta.per_page >= t.meta.total, r = t.meta.locale_offset <= 0, s = !t.meta.has_more_locales;
  return `
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm" data-matrix-viewport="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Viewport</p>
          <p class="mt-2 text-sm text-gray-600">Rows ${m(String(t.data.rows.length))} of ${m(String(t.meta.total))} · Locales ${m(String(t.meta.locale_offset + 1))}-${m(String(Math.min(t.meta.locale_offset + t.meta.locale_limit, t.meta.total_locales)))} of ${m(String(t.meta.total_locales))}</p>
        </div>
        <div class="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
          <button type="button" data-matrix-page="prev" class="${k}" ${e ? "disabled" : ""}>Prev families</button>
          <button type="button" data-matrix-page="next" class="${k}" ${a ? "disabled" : ""}>Next families</button>
          <button type="button" data-matrix-locales="prev" class="${k}" ${r ? "disabled" : ""}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${k}" ${s ? "disabled" : ""}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}
function Me(t, e = !1) {
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-matrix-filters="true">
      <form data-matrix-filter-form="true" class="grid gap-4 lg:grid-cols-5">
        <label class="text-sm text-gray-600">Content type
          <input name="content_type" value="${f(t.contentType || "")}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="pages, news">
        </label>
        <label class="text-sm text-gray-600">Readiness
          <select name="readiness_state" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900">
            <option value="">All</option>
            <option value="ready" ${t.readinessState === "ready" ? "selected" : ""}>Ready</option>
            <option value="blocked" ${t.readinessState === "blocked" ? "selected" : ""}>Blocked</option>
          </select>
        </label>
        <label class="text-sm text-gray-600">Blocker code
          <input name="blocker_code" value="${f(t.blockerCode || "")}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="missing_locale">
        </label>
        <label class="text-sm text-gray-600">Locales
          <input name="locales" value="${f((t.locales || []).join(", "))}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="fr, es">
        </label>
        <div class="flex items-end gap-3">
          <button type="submit" class="${Z} w-full" ${e ? "disabled" : ""}>${m(e ? "Loading…" : "Apply filters")}</button>
        </div>
      </form>
    </section>
  `;
}
function Re() {
  return `<section class="${U} p-8 shadow-sm" data-matrix-loading="true" role="status" aria-live="polite">Loading translation matrix…</section>`;
}
function Ce() {
  return `<section class="${R} p-8 shadow-sm" data-matrix-empty="true" role="status" aria-live="polite"><p class="${E}">No rows</p><h2 class="mt-2 text-xl font-semibold text-gray-900">No families match this matrix scope.</h2><p class="${M} mt-3 max-w-2xl leading-6">Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.</p></section>`;
}
function Ie(t) {
  const e = t instanceof $ ? t.requestId : "", a = t instanceof $ ? t.traceId : "";
  return `
    <section class="${G} p-6 shadow-sm" data-matrix-error="true" role="alert">
      <p class="${ee}">Matrix unavailable</p>
      <h2 class="mt-2 text-xl font-semibold text-rose-900">The matrix payload could not be loaded.</h2>
      <p class="${W} mt-3 leading-6">${m(t instanceof Error ? t.message : "Failed to load the translation matrix")}</p>
      ${e || a ? `<p class="mt-3 text-xs uppercase tracking-[0.16em] text-rose-700">${m([e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • "))}</p>` : ""}
      <div class="mt-4">
        <button type="button" data-matrix-retry="true" class="${K}">Retry matrix</button>
      </div>
    </section>
  `;
}
function Le(t, e, a, r, s, n, o, c = !1, d = "/admin") {
  const g = we(e), h = a == null ? r === "loading" ? Re() : Ie(o) : a.data.rows.length === 0 ? Ce() : `${Se(a, s, n, c)}<div class="grid gap-5">${Ee(a)}${Ae(a, s)}</div>`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      <section class="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-sky-50 px-6 py-6 shadow-sm" data-matrix-hero="true">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" aria-label="Breadcrumb">
              <a class="hover:text-sky-700 hover:underline" href="${f(`${T(d || "/admin")}/translations`)}">Translations</a>
              <span class="px-2 text-gray-400">/</span>
              <span class="text-gray-600">${m(t)}</span>
            </nav>
            <p class="${Y}">Translation Coverage</p>
            <h1 class="${F} mt-2">${m(t)}</h1>
            <p class="${te} mt-3 max-w-3xl leading-6">Dense family-by-locale coverage with sticky headers, row pagination, locale windows, and quick actions for missing or in-flight work.</p>
          </div>
          ${g ? `<p class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${m(g)}</p>` : ""}
        </div>
      </section>
      ${Me(e, r === "loading" || c)}
      ${h}
    </div>
  `;
}
var Pe = class {
  constructor(t) {
    this.root = null, this.payload = null, this.state = "loading", this.error = null, this.selection = y(), this.feedback = "", this.working = !1, this.handleSubmit = (a) => {
      const r = a.target;
      if (!(r instanceof HTMLFormElement) || r.dataset.matrixFilterForm !== "true") return;
      a.preventDefault();
      const s = new FormData(r);
      this.updateQuery({
        contentType: i(s.get("content_type")),
        readinessState: i(s.get("readiness_state")),
        blockerCode: i(s.get("blocker_code")),
        locales: B(i(s.get("locales"))),
        page: 1,
        localeOffset: 0
      }), this.load();
    }, this.handleClick = (a) => {
      const r = a.target;
      if (!(r instanceof HTMLElement)) return;
      if (r.closest('[data-matrix-retry="true"]')) {
        this.load();
        return;
      }
      const s = r.closest("[data-matrix-family-toggle]");
      if (s) {
        this.selection = he(this.selection, s.dataset.matrixFamilyToggle || ""), this.render();
        return;
      }
      if (r.closest('[data-matrix-toggle-all-families="true"]') && this.payload) {
        this.selection = y({
          family_ids: this.selection.family_ids.length === this.payload.data.rows.length ? [] : this.payload.data.rows.map((h) => h.family_id),
          locales: this.selection.locales,
          bulk_actions: this.selection.bulk_actions
        }), this.render();
        return;
      }
      const n = r.closest("[data-matrix-locale-toggle]");
      if (n) {
        const h = n.dataset.matrixLocaleToggle || "", b = new Set(this.selection.locales);
        b.has(h) ? b.delete(h) : b.add(h), this.selection = _e(this.selection, Array.from(b)), this.render();
        return;
      }
      const o = r.closest("[data-matrix-page]");
      if (o) {
        this.updateQuery({ page: (this.query.page ?? this.payload?.meta.page ?? 1) + (o.dataset.matrixPage === "next" ? 1 : -1) }), this.load();
        return;
      }
      const c = r.closest("[data-matrix-locales]");
      if (c && this.payload) {
        const h = c.dataset.matrixLocales === "next" ? 1 : -1;
        this.updateQuery({ localeOffset: Math.max(0, (this.query.localeOffset ?? this.payload.meta.locale_offset ?? 0) + h * (this.query.localeLimit ?? this.payload.meta.locale_limit ?? 0)) }), this.load();
        return;
      }
      const d = r.closest("[data-matrix-bulk-action]");
      if (d) {
        const h = d.dataset.matrixBulkAction;
        this.runBulkAction(h);
        return;
      }
      const g = r.closest('[data-matrix-cell-action="true"]');
      if (g) {
        const h = g.dataset.familyId || "", b = g.dataset.locale || "";
        this.runCellAction(h, b);
      }
    }, this.handleKeydown = (a) => {
      const r = a.target;
      if (!(r instanceof HTMLElement) || r.dataset.matrixCellAction !== "true") return;
      const s = u(r.dataset.rowIndex, -1), n = u(r.dataset.colIndex, -1);
      if (s < 0 || n < 0 || !this.root) return;
      let o = s, c = n;
      switch (a.key) {
        case "ArrowRight":
          c += 1;
          break;
        case "ArrowLeft":
          c -= 1;
          break;
        case "ArrowDown":
          o += 1;
          break;
        case "ArrowUp":
          o -= 1;
          break;
        default:
          return;
      }
      const d = this.root.querySelector(`[data-matrix-cell-action="true"][data-row-index="${o}"][data-col-index="${c}"]`);
      d && (a.preventDefault(), d.focus());
    };
    const e = re(t.basePath || "", t.endpoint);
    this.config = {
      ...t,
      basePath: e,
      title: t.title || "Translation Matrix"
    }, this.client = ye(this.config), this.query = ke();
  }
  mount(t) {
    this.root = t, this.render(), this.load(), t.addEventListener("click", this.handleClick), t.addEventListener("submit", this.handleSubmit), t.addEventListener("keydown", this.handleKeydown);
  }
  unmount() {
    this.root && (this.root.removeEventListener("click", this.handleClick), this.root.removeEventListener("submit", this.handleSubmit), this.root.removeEventListener("keydown", this.handleKeydown), this.root = null);
  }
  getState() {
    return this.state;
  }
  async refresh() {
    await this.load();
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const t = await this.client.fetchMatrix(this.query);
      this.payload = t, this.selection = y({
        family_ids: this.selection.family_ids.filter((e) => t.data.rows.some((a) => a.family_id === e)),
        locales: this.selection.locales.filter((e) => t.data.columns.some((a) => a.locale === e)),
        bulk_actions: t.data.selection.bulk_actions
      }), this.state = t.data.rows.length === 0 ? "empty" : "ready";
    } catch (t) {
      this.payload = null, this.state = "error", this.error = t;
    }
    this.render();
  }
  render() {
    this.root && (this.root.innerHTML = Le(this.config.title || "Translation Matrix", this.query, this.payload, this.state, this.selection, this.feedback, this.error, this.working, this.config.basePath));
  }
  updateQuery(t) {
    this.query = {
      ...this.query,
      ...t
    };
  }
  async runBulkAction(t) {
    if (!this.payload) return;
    const e = this.payload.meta.quick_action_targets, a = q(this.config.endpoint, t), r = e[t] ?? a;
    this.working = !0, this.feedback = "", this.render();
    try {
      const s = (await this.client.runBulkAction(r, xe(this.selection, { channel: this.query.channel }))).data.summary[t === "create_missing" ? "created" : "export_ready"] ?? 0;
      this.feedback = t === "create_missing" ? `Created ${s} locale variants from the current matrix selection.` : `Prepared ${s} export groups from the current matrix selection.`, await this.load();
    } catch (s) {
      this.error = s, this.feedback = s instanceof Error ? s.message : "Matrix action failed.", this.render();
    } finally {
      this.working = !1, this.render();
    }
  }
  async runCellAction(t, e) {
    if (!this.payload) return;
    const a = this.payload.data.rows.find((s) => s.family_id === t)?.cells[e], r = a ? z(a) : null;
    if (r) {
      if (r.enabled && r.href) {
        globalThis.location && typeof globalThis.location.assign == "function" && globalThis.location.assign(r.href);
        return;
      }
      if (!r.enabled || !r.endpoint) {
        this.feedback = r.reason || "Matrix action unavailable.", this.render();
        return;
      }
      this.working = !0, this.feedback = "", this.render();
      try {
        const s = I({
          endpoint: r.endpoint,
          method: r.method,
          route: r.route,
          resolver_key: r.resolver_key
        }), n = (await this.client.runBulkAction(s, r.payload)).data.summary.created ?? 0;
        this.feedback = `Created ${n} locale variant${n === 1 ? "" : "s"} for ${e.toUpperCase()}.`, await this.load();
      } catch (s) {
        this.feedback = s instanceof Error ? s.message : "Matrix action failed.", this.render();
      } finally {
        this.working = !1, this.render();
      }
    }
  }
};
function Ne(t, e = {}) {
  const a = i(e.endpoint) || i(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = `<section class="${R} p-6" data-matrix-empty="true"><p class="${E}">Configuration required</p><p class="${M} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`, null;
  const r = new Pe({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || i(t.dataset.title) || "Translation Matrix",
    basePath: e.basePath || i(t.dataset.basePath)
  });
  return r.mount(t), r;
}
export {
  Pe as TranslationMatrixPage,
  $ as TranslationMatrixRequestError,
  xe as buildTranslationMatrixBulkActionPayload,
  De as buildTranslationMatrixLocalePolicyMetadata,
  ge as buildTranslationMatrixURL,
  ye as createTranslationMatrixClient,
  y as createTranslationMatrixSelectionState,
  Ne as initTranslationMatrixPage,
  be as isTranslationMatrixNotRequiredCell,
  fe as normalizeTranslationMatrixBulkActionResponse,
  ce as normalizeTranslationMatrixCell,
  L as normalizeTranslationMatrixCellState,
  ne as normalizeTranslationMatrixColumn,
  me as normalizeTranslationMatrixResponse,
  de as normalizeTranslationMatrixRow,
  _e as setTranslationMatrixSelectedLocales,
  he as toggleTranslationMatrixFamilySelection
};

//# sourceMappingURL=index.js.map
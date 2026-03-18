import { d as $ } from "../chunks/index-YiVxcMWC.js";
import { e as g, a as m } from "../chunks/html-Br-oQr7i.js";
import { r as M } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as R } from "../toast/error-helpers.js";
import { E as C, h as I, i as L, H, f as U, a as Q, L as X, j as Y, k as K, l as W, p as G, w as v, A as V, D as J, F as Z, I as ee, J as te, K as ae, e as re, o as se } from "../chunks/style-constants-DMszSbOH.js";
function s(t) {
  return typeof t == "string" ? t.trim() : "";
}
function _(t) {
  return t === !0;
}
function u(t, e = 0) {
  if (typeof t == "number" && Number.isFinite(t))
    return t;
  if (typeof t == "string" && t.trim() !== "") {
    const a = Number(t);
    if (Number.isFinite(a))
      return a;
  }
  return e;
}
function l(t) {
  return t && typeof t == "object" && !Array.isArray(t) ? t : {};
}
function f(t) {
  if (!Array.isArray(t))
    return [];
  const e = [];
  for (const a of t) {
    const r = s(a);
    r && !e.includes(r) && e.push(r);
  }
  return e;
}
function x(t) {
  return Array.isArray(t) ? t.map((e) => l(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function E(t) {
  return t.replace(/\/+$/, "");
}
function oe(t) {
  const e = s(t);
  if (!e)
    return "";
  const a = e.startsWith("http://") || e.startsWith("https://") ? new URL(e).pathname : e;
  return E(a.replace(/\/api(?:\/.*)?$/, ""));
}
function ie(t, e) {
  const a = E(s(t));
  return a || oe(e) || "/admin";
}
function ne(t) {
  const e = l(t), a = s(e.href), r = s(e.label);
  return !a && !r ? null : {
    href: a,
    route: s(e.route),
    resolver_key: s(e.resolver_key),
    key: s(e.key),
    label: r,
    description: s(e.description),
    relation: s(e.relation)
  };
}
function P(t) {
  const e = l(t);
  return {
    enabled: _(e.enabled),
    label: s(e.label),
    description: s(e.description),
    href: s(e.href),
    endpoint: s(e.endpoint),
    method: s(e.method).toUpperCase() || "POST",
    route: s(e.route),
    resolver_key: s(e.resolver_key),
    permission: s(e.permission),
    reason: s(e.reason),
    reason_code: s(e.reason_code),
    payload: l(e.payload)
  };
}
function le(t) {
  const e = {};
  for (const [a, r] of Object.entries(l(t)))
    e[a] = P(r);
  return e;
}
function j(t) {
  const e = l(t);
  return {
    endpoint: s(e.endpoint),
    method: s(e.method).toUpperCase(),
    route: s(e.route),
    resolver_key: s(e.resolver_key),
    base_path: s(e.base_path),
    type: s(e.type)
  };
}
function O(t) {
  const e = s(t).toLowerCase();
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
function ce(t) {
  const e = l(t);
  return {
    locale: s(e.locale),
    label: s(e.label) || s(e.locale).toUpperCase(),
    required_by_count: u(e.required_by_count),
    source_count: u(e.source_count),
    source_locale: _(e.source_locale),
    sticky: _(e.sticky)
  };
}
function de(t) {
  const e = l(t), a = s(e.id), r = s(e.locale);
  return !a && !r ? null : {
    id: a,
    locale: r,
    status: s(e.status),
    is_source: _(e.is_source),
    source_record_id: s(e.source_record_id)
  };
}
function ue(t) {
  const e = l(t), a = s(e.id);
  return a ? {
    id: a,
    status: s(e.status),
    assignee_id: s(e.assignee_id),
    reviewer_id: s(e.reviewer_id),
    work_scope: s(e.work_scope)
  } : null;
}
function me(t) {
  const e = l(t), a = O(e.state);
  return {
    locale: s(e.locale),
    state: a,
    required: _(e.required),
    not_required: _(e.not_required) || a === "not_required",
    fallback: _(e.fallback) || a === "fallback",
    blocker_codes: f(e.blocker_codes),
    variant: de(e.variant),
    assignment: ue(e.assignment),
    quick_actions: le(e.quick_actions)
  };
}
function pe(t) {
  const e = l(t), a = l(e.cells), r = {};
  for (const [o, i] of Object.entries(a))
    r[o] = me({ locale: o, ...l(i) });
  return {
    family_id: s(e.family_id),
    content_type: s(e.content_type),
    source_locale: s(e.source_locale),
    source_record_id: s(e.source_record_id),
    source_title: s(e.source_title),
    readiness_state: s(e.readiness_state),
    blocker_codes: f(e.blocker_codes),
    links: Object.fromEntries(
      Object.entries(l(e.links)).map(([o, i]) => [o, ne(i)]).filter(([, o]) => o)
    ),
    cells: r
  };
}
function q(t) {
  const e = l(t), a = l(e.viewport_target);
  return {
    id: s(e.id),
    description: s(e.description),
    scope_fields: f(e.scope_fields),
    supported_filters: f(e.supported_filters),
    stable_sort_keys: f(e.stable_sort_keys),
    default_page_size: u(e.default_page_size),
    max_page_size: u(e.max_page_size),
    default_locale_limit: u(e.default_locale_limit),
    max_locale_limit: u(e.max_locale_limit),
    viewport_target: {
      rows: u(a.rows),
      locales: u(a.locales)
    },
    index_hints: f(e.index_hints),
    ui_route: s(e.ui_route),
    api_route: s(e.api_route),
    resolver_keys: f(e.resolver_keys)
  };
}
function z(t) {
  const e = l(t);
  if (Object.keys(e).length === 0)
    return {};
  const a = l(e.bulk_actions), r = {};
  for (const [o, i] of Object.entries(a)) {
    const n = l(i);
    r[o] = {
      id: s(n.id) || o,
      permission: s(n.permission),
      endpoint_route: s(n.endpoint_route),
      resolver_key: s(n.resolver_key),
      required_fields: f(n.required_fields),
      optional_fields: f(n.optional_fields),
      result_statuses: f(n.result_statuses),
      selection_required: _(n.selection_required)
    };
  }
  return {
    schema_version: u(e.schema_version),
    cell_states: f(e.cell_states).map((o) => O(o)),
    latency_target_ms: u(e.latency_target_ms),
    query_model: q(e.query_model),
    bulk_actions: r
  };
}
function fe(t) {
  const e = l(t), a = l(e.bulk_actions), r = {};
  for (const [o, i] of Object.entries(a)) {
    const n = $(i);
    n && (r[o] = n);
  }
  return { bulk_actions: r };
}
function ge(t) {
  const e = l(t), a = l(e.data), r = l(e.meta), o = x(a.columns).map(ce), i = x(a.rows).map(pe), n = {};
  for (const [d, c] of Object.entries(l(r.quick_action_targets)))
    n[d] = j(c);
  return {
    data: {
      columns: o,
      rows: i,
      selection: fe(a.selection)
    },
    meta: {
      channel: s(r.channel),
      page: u(r.page, 1),
      per_page: u(r.per_page, 25),
      total: u(r.total),
      total_locales: u(r.total_locales),
      locale_offset: u(r.locale_offset),
      locale_limit: u(r.locale_limit),
      has_more_locales: _(r.has_more_locales),
      latency_target_ms: u(r.latency_target_ms),
      query_model: q(r.query_model),
      contracts: z(r.contracts),
      scope: Object.fromEntries(
        Object.entries(l(r.scope)).map(([d, c]) => [d, s(c)])
      ),
      locale_policy: x(r.locale_policy).map((d) => {
        const c = l(d);
        return {
          locale: s(c.locale),
          label: s(c.label),
          sticky: _(c.sticky),
          source_locale: _(c.source_locale),
          required_by_count: u(c.required_by_count),
          optional_family_count: u(c.optional_family_count),
          not_required_family_ids: f(c.not_required_family_ids)
        };
      }),
      quick_action_targets: n
    }
  };
}
function he(t) {
  const e = l(t), a = s(e.status);
  return {
    family_id: s(e.family_id),
    content_type: s(e.content_type),
    source_record_id: s(e.source_record_id),
    requested_locales: f(e.requested_locales),
    status: a || "failed",
    created: x(e.created),
    skipped: x(e.skipped),
    failures: x(e.failures),
    exportable_locales: f(e.exportable_locales),
    estimated_rows: u(e.estimated_rows)
  };
}
function _e(t) {
  const e = l(t), a = l(e.data), r = l(a.summary), o = {};
  for (const [n, d] of Object.entries(r))
    o[n] = u(d);
  return {
    data: {
      action: s(a.action) || "create_missing",
      summary: o,
      results: x(a.results).map(he),
      export_request: Object.keys(l(a.export_request)).length > 0 ? l(a.export_request) : void 0,
      preview_rows: x(a.preview_rows)
    },
    meta: {
      channel: s(l(e.meta).channel),
      contracts: z(l(e.meta).contracts)
    }
  };
}
function xe(t, e = {}) {
  const a = new URL(t, "http://localhost"), r = s(e.channel);
  return r && a.searchParams.set("channel", r), e.tenantId && a.searchParams.set("tenant_id", e.tenantId), e.orgId && a.searchParams.set("org_id", e.orgId), e.familyId && a.searchParams.set("family_id", e.familyId), e.contentType && a.searchParams.set("content_type", e.contentType), e.readinessState && a.searchParams.set("readiness_state", e.readinessState), e.blockerCode && a.searchParams.set("blocker_code", e.blockerCode), e.locales && e.locales.length > 0 && a.searchParams.set("locales", e.locales.join(",")), typeof e.page == "number" && a.searchParams.set("page", String(e.page)), typeof e.perPage == "number" && a.searchParams.set("per_page", String(e.perPage)), typeof e.localeOffset == "number" && a.searchParams.set("locale_offset", String(e.localeOffset)), typeof e.localeLimit == "number" && a.searchParams.set("locale_limit", String(e.localeLimit)), `${a.pathname}${a.search}`;
}
function y(t = {}) {
  const e = f(t.family_ids), a = f(t.locales), r = {};
  for (const [o, i] of Object.entries(l(t.bulk_actions))) {
    const n = $(i);
    n && (r[o] = n);
  }
  return {
    family_ids: e,
    locales: a,
    bulk_actions: r
  };
}
function be(t, e) {
  const a = s(e);
  if (!a)
    return y(t);
  const r = new Set(t.family_ids);
  return r.has(a) ? r.delete(a) : r.add(a), {
    ...y(t),
    family_ids: Array.from(r).sort()
  };
}
function ye(t, e) {
  return {
    ...y(t),
    locales: f(e)
  };
}
function ke(t, e = {}) {
  return {
    family_ids: [...t.family_ids],
    locales: [...t.locales],
    ...e
  };
}
function we(t) {
  return !!(t && t.state === "not_required");
}
function He(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const r of t.data.rows)
      we(r.cells[e.locale]) && a.push(r.family_id);
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
class T extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationMatrixRequestError", this.status = e.status, this.code = e.code ?? null, this.requestId = e.requestId, this.traceId = e.traceId, this.metadata = e.metadata ?? null;
  }
}
function B(t) {
  return s(t);
}
function D(t, e) {
  return {
    endpoint: `${B(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function ve(t) {
  const e = B(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a)
    throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(r = {}) {
      const o = xe(e, r), i = await a(o, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!i.ok) {
        const n = await R(i);
        throw new T({
          message: n.message || await M(i, "Failed to load translation matrix"),
          status: i.status,
          code: n.textCode,
          requestId: i.headers.get("x-request-id") ?? void 0,
          traceId: i.headers.get("x-trace-id") ?? void 0,
          metadata: n.metadata
        });
      }
      return ge(await i.json());
    },
    async runBulkAction(r, o) {
      const i = r ?? D(e, "create_missing"), n = s(i.endpoint);
      if (!n)
        throw new Error("Matrix bulk action endpoint is not configured.");
      const d = await a(n, {
        method: s(i.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(o)
      });
      if (!d.ok) {
        const c = await R(d);
        throw new T({
          message: c.message || await M(d, "Matrix action failed"),
          status: d.status,
          code: c.textCode,
          requestId: d.headers.get("x-request-id") ?? void 0,
          traceId: d.headers.get("x-trace-id") ?? void 0,
          metadata: c.metadata
        });
      }
      return _e(await d.json());
    }
  };
}
function S(t) {
  return s(t).replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function N(t) {
  return t.split(",").map((e) => e.trim().toLowerCase()).filter((e, a, r) => e && r.indexOf(e) === a);
}
function $e() {
  if (!globalThis.location)
    return {};
  const t = new URLSearchParams(globalThis.location.search), e = N(t.get("locales") ?? t.get("locale") ?? "");
  return {
    channel: s(t.get("channel")),
    tenantId: s(t.get("tenant_id")),
    orgId: s(t.get("org_id")),
    contentType: s(t.get("content_type")),
    readinessState: s(t.get("readiness_state")),
    blockerCode: s(t.get("blocker_code")),
    locales: e,
    page: t.get("page") ? u(t.get("page")) : void 0,
    perPage: t.get("per_page") ? u(t.get("per_page")) : void 0,
    localeLimit: t.get("locale_limit") ? u(t.get("locale_limit")) : void 0,
    localeOffset: t.get("locale_offset") ? u(t.get("locale_offset")) : void 0
  };
}
function Te(t) {
  return [
    t.channel ? `Channel ${t.channel}` : "",
    t.tenantId ? `Tenant ${t.tenantId}` : "",
    t.orgId ? `Org ${t.orgId}` : ""
  ].filter(Boolean).join(" • ");
}
function Ae(t, e, a = "Action") {
  const r = t.label || a, o = Object.entries(e).map(([d, c]) => `${g(d)}="${g(c)}"`).join(" "), i = t.reason || "Action unavailable";
  return `<button type="button" class="inline-flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${t.enabled ? "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100" : "border-gray-200 bg-gray-100 text-gray-500"}" ${o} ${t.enabled ? "" : "disabled"} title="${g(t.enabled ? t.description || r : i)}">${m(r)}</button>`;
}
function Se(t) {
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
function Ee(t) {
  const e = `border ${se(Se(t.state))}`, a = t.assignment?.status || t.variant?.status || S(t.state);
  return `
    <div class="flex items-center justify-between gap-2">
      <span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${g(e)}">${m(S(t.state))}</span>
      <span class="truncate text-[11px] text-gray-500">${m(S(a))}</span>
    </div>
  `;
}
function F(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? P({});
}
function Me(t, e) {
  const a = t.data.columns, r = t.data.rows;
  return `
    <div class="${V}" data-matrix-grid="true">
      <table class="${J}">
        <thead class="${Z}">
          <tr>
            <th scope="col" class="${ee} border-b border-gray-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === r.length && r.length > 0 ? "checked" : ""}>
                <span>Families</span>
              </label>
            </th>
            ${a.map((o) => {
    const i = t.meta.locale_policy.find((d) => d.locale === o.locale), n = e.locales.includes(o.locale);
    return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${g(o.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${n ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}">
                    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-700">${m(o.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${m(o.source_locale ? "Source locale" : `${i?.required_by_count ?? o.required_by_count} required families`)}</span>
                    <span class="mt-1 text-[11px] text-gray-400">${m(i && i.optional_family_count > 0 ? `${i.optional_family_count} optional` : "Header action")}</span>
                  </button>
                </th>
              `;
  }).join("")}
          </tr>
        </thead>
        <tbody>
          ${r.map((o, i) => `
            <tr data-matrix-row="${g(o.family_id)}">
              <th scope="row" class="${te} border-b border-gray-200 px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${g(o.family_id)}" ${e.family_ids.includes(o.family_id) ? "checked" : ""} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${g(o.links.family?.href || "#")}">${m(o.source_title || o.family_id)}</a>
                      <span class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">${m(o.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">${m(o.family_id)}</p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${o.links.content_detail?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${g(o.links.content_detail.href)}">Source</a>` : ""}
                      ${o.links.content_edit?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${g(o.links.content_edit.href)}">Edit source</a>` : ""}
                    </div>
                  </div>
                </div>
              </th>
              ${a.map((n, d) => {
    const c = o.cells[n.locale], p = F(c);
    return `
                  <td class="${ae}">
                    <div class="min-w-[10rem] rounded-xl border border-gray-200 bg-gray-50 p-3">
                      ${Ee(c)}
                      <div class="mt-3">
                        ${Ae(p, {
      "data-matrix-cell-action": "true",
      "data-family-id": o.family_id,
      "data-locale": n.locale,
      "data-row-index": String(i),
      "data-col-index": String(d),
      "data-action-kind": p.enabled && p.href ? "open" : "create"
    }, p.enabled && p.href ? "Open" : "Create")}
                      </div>
                      ${p.reason && !p.enabled ? `<p class="mt-2 text-[11px] leading-5 text-gray-400">${m(p.reason)}</p>` : ""}
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
function Re(t, e, a, r = !1) {
  const o = e.bulk_actions.create_missing ?? $(null), i = e.bulk_actions.export_selected ?? $(null), n = e.family_ids.length === 0, d = o?.enabled ? n ? "Select at least one family row." : "" : o?.reason || "Create missing is unavailable.", c = i?.enabled ? n ? "Select at least one family row." : "" : i?.reason || "Export selected is unavailable.";
  return `
    <section class="rounded-xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-100 shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Bulk Actions</p>
          <p class="mt-2 text-sm text-gray-300">Selected families: <strong class="text-white">${m(String(e.family_ids.length))}</strong> · Selected locales: <strong class="text-white">${m(e.locales.length > 0 ? e.locales.join(", ") : "auto")}</strong></p>
          ${a ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-300" data-matrix-feedback="true">${m(a)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!o?.enabled || n || r ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-sky-500 text-white hover:bg-sky-400"}" ${!o?.enabled || n || r ? "disabled" : ""} title="${g(d || "Create missing locale work")}">${m(r ? "Working…" : "Create Missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!i?.enabled || n || r ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-white text-gray-900 hover:bg-gray-100"}" ${!i?.enabled || n || r ? "disabled" : ""} title="${g(c || "Export selected locale work")}">${m(r ? "Working…" : "Export Selected")}</button>
        </div>
      </div>
    </section>
  `;
}
function Ce(t) {
  const e = t.meta.page <= 1, a = t.meta.page * t.meta.per_page >= t.meta.total, r = t.meta.locale_offset <= 0, o = !t.meta.has_more_locales;
  return `
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm" data-matrix-viewport="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Viewport</p>
          <p class="mt-2 text-sm text-gray-600">Rows ${m(String(t.data.rows.length))} of ${m(String(t.meta.total))} · Locales ${m(String(t.meta.locale_offset + 1))}-${m(String(Math.min(t.meta.locale_offset + t.meta.locale_limit, t.meta.total_locales)))} of ${m(String(t.meta.total_locales))}</p>
        </div>
        <div class="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
          <button type="button" data-matrix-page="prev" class="${v}" ${e ? "disabled" : ""}>Prev families</button>
          <button type="button" data-matrix-page="next" class="${v}" ${a ? "disabled" : ""}>Next families</button>
          <button type="button" data-matrix-locales="prev" class="${v}" ${r ? "disabled" : ""}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${v}" ${o ? "disabled" : ""}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}
function Ie(t, e = !1) {
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-matrix-filters="true">
      <form data-matrix-filter-form="true" class="grid gap-4 lg:grid-cols-5">
        <label class="text-sm text-gray-600">Content type
          <input name="content_type" value="${g(t.contentType || "")}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="pages, news">
        </label>
        <label class="text-sm text-gray-600">Readiness
          <select name="readiness_state" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900">
            <option value="">All</option>
            <option value="ready" ${t.readinessState === "ready" ? "selected" : ""}>Ready</option>
            <option value="blocked" ${t.readinessState === "blocked" ? "selected" : ""}>Blocked</option>
          </select>
        </label>
        <label class="text-sm text-gray-600">Blocker code
          <input name="blocker_code" value="${g(t.blockerCode || "")}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="missing_locale">
        </label>
        <label class="text-sm text-gray-600">Locales
          <input name="locales" value="${g((t.locales || []).join(", "))}" class="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" placeholder="fr, es">
        </label>
        <div class="flex items-end gap-3">
          <button type="submit" class="${re} w-full" ${e ? "disabled" : ""}>${m(e ? "Loading…" : "Apply filters")}</button>
        </div>
      </form>
    </section>
  `;
}
function Le() {
  return `<section class="${X} p-8 shadow-sm" data-matrix-loading="true" role="status" aria-live="polite">Loading translation matrix…</section>`;
}
function Pe() {
  return `<section class="${C} p-8 shadow-sm" data-matrix-empty="true" role="status" aria-live="polite"><p class="${I}">No rows</p><h2 class="mt-2 text-xl font-semibold text-gray-900">No families match this matrix scope.</h2><p class="${L} mt-3 max-w-2xl leading-6">Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.</p></section>`;
}
function je(t) {
  const e = t instanceof T ? t.requestId : "", a = t instanceof T ? t.traceId : "";
  return `
    <section class="${Y} p-6 shadow-sm" data-matrix-error="true" role="alert">
      <p class="${K}">Matrix unavailable</p>
      <h2 class="mt-2 text-xl font-semibold text-rose-900">The matrix payload could not be loaded.</h2>
      <p class="${W} mt-3 leading-6">${m(t instanceof Error ? t.message : "Failed to load the translation matrix")}</p>
      ${e || a ? `<p class="mt-3 text-xs uppercase tracking-[0.16em] text-rose-700">${m([e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • "))}</p>` : ""}
      <div class="mt-4">
        <button type="button" data-matrix-retry="true" class="${G}">Retry matrix</button>
      </div>
    </section>
  `;
}
function Oe(t, e, a, r, o, i, n, d = !1, c = "/admin") {
  const p = Te(e), k = a == null ? r === "loading" ? Le() : je(n) : a.data.rows.length === 0 ? Pe() : `${Re(a, o, i, d)}<div class="grid gap-5">${Ce(a)}${Me(a, o)}</div>`, w = `${E(c || "/admin")}/translations`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      <section class="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-sky-50 px-6 py-6 shadow-sm" data-matrix-hero="true">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" aria-label="Breadcrumb">
              <a class="hover:text-sky-700 hover:underline" href="${g(w)}">Translations</a>
              <span class="px-2 text-gray-400">/</span>
              <span class="text-gray-600">${m(t)}</span>
            </nav>
            <p class="${H}">Translation Coverage</p>
            <h1 class="${U} mt-2">${m(t)}</h1>
            <p class="${Q} mt-3 max-w-3xl leading-6">Dense family-by-locale coverage with sticky headers, row pagination, locale windows, and quick actions for missing or in-flight work.</p>
          </div>
          ${p ? `<p class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${m(p)}</p>` : ""}
        </div>
      </section>
      ${Ie(e, r === "loading" || d)}
      ${k}
    </div>
  `;
}
class qe {
  constructor(e) {
    this.root = null, this.payload = null, this.state = "loading", this.error = null, this.selection = y(), this.feedback = "", this.working = !1, this.handleSubmit = (r) => {
      const o = r.target;
      if (!(o instanceof HTMLFormElement) || o.dataset.matrixFilterForm !== "true")
        return;
      r.preventDefault();
      const i = new FormData(o);
      this.updateQuery({
        contentType: s(i.get("content_type")),
        readinessState: s(i.get("readiness_state")),
        blockerCode: s(i.get("blocker_code")),
        locales: N(s(i.get("locales"))),
        page: 1,
        localeOffset: 0
      }), this.load();
    }, this.handleClick = (r) => {
      const o = r.target;
      if (!(o instanceof HTMLElement))
        return;
      if (o.closest('[data-matrix-retry="true"]')) {
        this.load();
        return;
      }
      const n = o.closest("[data-matrix-family-toggle]");
      if (n) {
        this.selection = be(this.selection, n.dataset.matrixFamilyToggle || ""), this.render();
        return;
      }
      if (o.closest('[data-matrix-toggle-all-families="true"]') && this.payload) {
        this.selection = y({
          family_ids: this.selection.family_ids.length === this.payload.data.rows.length ? [] : this.payload.data.rows.map((h) => h.family_id),
          locales: this.selection.locales,
          bulk_actions: this.selection.bulk_actions
        }), this.render();
        return;
      }
      const c = o.closest("[data-matrix-locale-toggle]");
      if (c) {
        const h = c.dataset.matrixLocaleToggle || "", b = new Set(this.selection.locales);
        b.has(h) ? b.delete(h) : b.add(h), this.selection = ye(this.selection, Array.from(b)), this.render();
        return;
      }
      const p = o.closest("[data-matrix-page]");
      if (p) {
        this.updateQuery({
          page: (this.query.page ?? this.payload?.meta.page ?? 1) + (p.dataset.matrixPage === "next" ? 1 : -1)
        }), this.load();
        return;
      }
      const k = o.closest("[data-matrix-locales]");
      if (k && this.payload) {
        const h = k.dataset.matrixLocales === "next" ? 1 : -1;
        this.updateQuery({
          localeOffset: Math.max(0, (this.query.localeOffset ?? this.payload.meta.locale_offset ?? 0) + h * (this.query.localeLimit ?? this.payload.meta.locale_limit ?? 0))
        }), this.load();
        return;
      }
      const w = o.closest("[data-matrix-bulk-action]");
      if (w) {
        const h = w.dataset.matrixBulkAction;
        this.runBulkAction(h);
        return;
      }
      const A = o.closest('[data-matrix-cell-action="true"]');
      if (A) {
        const h = A.dataset.familyId || "", b = A.dataset.locale || "";
        this.runCellAction(h, b);
      }
    }, this.handleKeydown = (r) => {
      const o = r.target;
      if (!(o instanceof HTMLElement) || o.dataset.matrixCellAction !== "true")
        return;
      const i = u(o.dataset.rowIndex, -1), n = u(o.dataset.colIndex, -1);
      if (i < 0 || n < 0 || !this.root)
        return;
      let d = i, c = n;
      switch (r.key) {
        case "ArrowRight":
          c += 1;
          break;
        case "ArrowLeft":
          c -= 1;
          break;
        case "ArrowDown":
          d += 1;
          break;
        case "ArrowUp":
          d -= 1;
          break;
        default:
          return;
      }
      const p = this.root.querySelector(`[data-matrix-cell-action="true"][data-row-index="${d}"][data-col-index="${c}"]`);
      p && (r.preventDefault(), p.focus());
    };
    const a = ie(e.basePath || "", e.endpoint);
    this.config = {
      ...e,
      basePath: a,
      title: e.title || "Translation Matrix"
    }, this.client = ve(this.config), this.query = $e();
  }
  mount(e) {
    this.root = e, this.render(), this.load(), e.addEventListener("click", this.handleClick), e.addEventListener("submit", this.handleSubmit), e.addEventListener("keydown", this.handleKeydown);
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
      const e = await this.client.fetchMatrix(this.query);
      this.payload = e, this.selection = y({
        family_ids: this.selection.family_ids.filter((a) => e.data.rows.some((r) => r.family_id === a)),
        locales: this.selection.locales.filter((a) => e.data.columns.some((r) => r.locale === a)),
        bulk_actions: e.data.selection.bulk_actions
      }), this.state = e.data.rows.length === 0 ? "empty" : "ready";
    } catch (e) {
      this.payload = null, this.state = "error", this.error = e;
    }
    this.render();
  }
  render() {
    this.root && (this.root.innerHTML = Oe(
      this.config.title || "Translation Matrix",
      this.query,
      this.payload,
      this.state,
      this.selection,
      this.feedback,
      this.error,
      this.working,
      this.config.basePath
    ));
  }
  updateQuery(e) {
    this.query = {
      ...this.query,
      ...e
    };
  }
  async runBulkAction(e) {
    if (!this.payload)
      return;
    const a = this.payload.meta.quick_action_targets, r = D(this.config.endpoint, e), o = a[e] ?? r;
    this.working = !0, this.feedback = "", this.render();
    try {
      const n = (await this.client.runBulkAction(o, ke(this.selection, {
        channel: this.query.channel
      }))).data.summary[e === "create_missing" ? "created" : "export_ready"] ?? 0;
      this.feedback = e === "create_missing" ? `Created ${n} locale variants from the current matrix selection.` : `Prepared ${n} export groups from the current matrix selection.`, await this.load();
    } catch (i) {
      this.error = i, this.feedback = i instanceof Error ? i.message : "Matrix action failed.", this.render();
    } finally {
      this.working = !1, this.render();
    }
  }
  async runCellAction(e, a) {
    if (!this.payload)
      return;
    const o = this.payload.data.rows.find((n) => n.family_id === e)?.cells[a], i = o ? F(o) : null;
    if (i) {
      if (i.enabled && i.href) {
        globalThis.location && typeof globalThis.location.assign == "function" && globalThis.location.assign(i.href);
        return;
      }
      if (!i.enabled || !i.endpoint) {
        this.feedback = i.reason || "Matrix action unavailable.", this.render();
        return;
      }
      this.working = !0, this.feedback = "", this.render();
      try {
        const n = j({
          endpoint: i.endpoint,
          method: i.method,
          route: i.route,
          resolver_key: i.resolver_key
        }), c = (await this.client.runBulkAction(n, i.payload)).data.summary.created ?? 0;
        this.feedback = `Created ${c} locale variant${c === 1 ? "" : "s"} for ${a.toUpperCase()}.`, await this.load();
      } catch (n) {
        this.feedback = n instanceof Error ? n.message : "Matrix action failed.", this.render();
      } finally {
        this.working = !1, this.render();
      }
    }
  }
}
function Ue(t, e = {}) {
  const a = s(e.endpoint) || s(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = `<section class="${C} p-6" data-matrix-empty="true"><p class="${I}">Configuration required</p><p class="${L} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`, null;
  const r = new qe({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || s(t.dataset.title) || "Translation Matrix",
    basePath: e.basePath || s(t.dataset.basePath)
  });
  return r.mount(t), r;
}
export {
  qe as TranslationMatrixPage,
  T as TranslationMatrixRequestError,
  ke as buildTranslationMatrixBulkActionPayload,
  He as buildTranslationMatrixLocalePolicyMetadata,
  xe as buildTranslationMatrixURL,
  ve as createTranslationMatrixClient,
  y as createTranslationMatrixSelectionState,
  Ue as initTranslationMatrixPage,
  we as isTranslationMatrixNotRequiredCell,
  _e as normalizeTranslationMatrixBulkActionResponse,
  me as normalizeTranslationMatrixCell,
  O as normalizeTranslationMatrixCellState,
  ce as normalizeTranslationMatrixColumn,
  ge as normalizeTranslationMatrixResponse,
  pe as normalizeTranslationMatrixRow,
  ye as setTranslationMatrixSelectedLocales,
  be as toggleTranslationMatrixFamilySelection
};
//# sourceMappingURL=index.js.map

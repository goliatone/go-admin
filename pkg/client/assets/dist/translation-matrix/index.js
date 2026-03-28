import { d as $ } from "../chunks/index-YiVxcMWC.js";
import { asString as r, asBoolean as x, asNumberish as u, asRecord as l, asUniqueStringArray as f } from "../shared/coercion.js";
import { StatefulController as U } from "../shared/stateful-controller.js";
import { escapeAttribute as g, escapeHTML as m } from "../shared/html.js";
import { r as C } from "../chunks/http-client-DZnuedzQ.js";
import { a as Q, r as R } from "../chunks/ui-states-B4-pLIrz.js";
import { extractStructuredError as M } from "../toast/error-helpers.js";
import { E as L, i as I, j as P, H as X, h as Y, a as K, L as W, k as G, l as V, m as J, q as Z, x as v, D as ee, F as te, J as ae, K as se, N as re, O as oe, f as ie, p as ne } from "../chunks/style-constants-i2xRoO1L.js";
function _(t) {
  return Array.isArray(t) ? t.map((e) => l(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function A(t) {
  return t.replace(/\/+$/, "");
}
function le(t) {
  const e = r(t);
  if (!e)
    return "";
  const a = e.startsWith("http://") || e.startsWith("https://") ? new URL(e).pathname : e;
  return A(a.replace(/\/api(?:\/.*)?$/, ""));
}
function ce(t, e) {
  const a = A(r(t));
  return a || le(e) || "/admin";
}
function de(t) {
  const e = l(t), a = r(e.href), s = r(e.label);
  return !a && !s ? null : {
    href: a,
    route: r(e.route),
    resolver_key: r(e.resolver_key),
    key: r(e.key),
    label: s,
    description: r(e.description),
    relation: r(e.relation)
  };
}
function O(t) {
  const e = l(t);
  return {
    enabled: x(e.enabled),
    label: r(e.label),
    description: r(e.description),
    href: r(e.href),
    endpoint: r(e.endpoint),
    method: r(e.method).toUpperCase() || "POST",
    route: r(e.route),
    resolver_key: r(e.resolver_key),
    permission: r(e.permission),
    reason: r(e.reason),
    reason_code: r(e.reason_code),
    payload: l(e.payload)
  };
}
function ue(t) {
  const e = {};
  for (const [a, s] of Object.entries(l(t)))
    e[a] = O(s);
  return e;
}
function j(t) {
  const e = l(t);
  return {
    endpoint: r(e.endpoint),
    method: r(e.method).toUpperCase(),
    route: r(e.route),
    resolver_key: r(e.resolver_key),
    base_path: r(e.base_path),
    type: r(e.type)
  };
}
function q(t) {
  const e = r(t).toLowerCase();
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
function me(t) {
  const e = l(t);
  return {
    locale: r(e.locale),
    label: r(e.label) || r(e.locale).toUpperCase(),
    required_by_count: u(e.required_by_count),
    source_count: u(e.source_count),
    source_locale: x(e.source_locale),
    sticky: x(e.sticky)
  };
}
function pe(t) {
  const e = l(t), a = r(e.id), s = r(e.locale);
  return !a && !s ? null : {
    id: a,
    locale: s,
    status: r(e.status),
    is_source: x(e.is_source),
    source_record_id: r(e.source_record_id)
  };
}
function fe(t) {
  const e = l(t), a = r(e.id);
  return a ? {
    id: a,
    status: r(e.status),
    assignee_id: r(e.assignee_id),
    reviewer_id: r(e.reviewer_id),
    work_scope: r(e.work_scope)
  } : null;
}
function ge(t) {
  const e = l(t), a = q(e.state);
  return {
    locale: r(e.locale),
    state: a,
    required: x(e.required),
    not_required: x(e.not_required) || a === "not_required",
    fallback: x(e.fallback) || a === "fallback",
    blocker_codes: f(e.blocker_codes),
    variant: pe(e.variant),
    assignment: fe(e.assignment),
    quick_actions: ue(e.quick_actions)
  };
}
function he(t) {
  const e = l(t), a = l(e.cells), s = {};
  for (const [o, i] of Object.entries(a))
    s[o] = ge({ locale: o, ...l(i) });
  return {
    family_id: r(e.family_id),
    content_type: r(e.content_type),
    source_locale: r(e.source_locale),
    source_record_id: r(e.source_record_id),
    source_title: r(e.source_title),
    readiness_state: r(e.readiness_state),
    blocker_codes: f(e.blocker_codes),
    links: Object.fromEntries(
      Object.entries(l(e.links)).map(([o, i]) => [o, de(i)]).filter(([, o]) => o)
    ),
    cells: s
  };
}
function z(t) {
  const e = l(t), a = l(e.viewport_target);
  return {
    id: r(e.id),
    description: r(e.description),
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
    ui_route: r(e.ui_route),
    api_route: r(e.api_route),
    resolver_keys: f(e.resolver_keys)
  };
}
function B(t) {
  const e = l(t);
  if (Object.keys(e).length === 0)
    return {};
  const a = l(e.bulk_actions), s = {};
  for (const [o, i] of Object.entries(a)) {
    const n = l(i);
    s[o] = {
      id: r(n.id) || o,
      permission: r(n.permission),
      endpoint_route: r(n.endpoint_route),
      resolver_key: r(n.resolver_key),
      required_fields: f(n.required_fields),
      optional_fields: f(n.optional_fields),
      result_statuses: f(n.result_statuses),
      selection_required: x(n.selection_required)
    };
  }
  return {
    schema_version: u(e.schema_version),
    cell_states: f(e.cell_states).map((o) => q(o)),
    latency_target_ms: u(e.latency_target_ms),
    query_model: z(e.query_model),
    bulk_actions: s
  };
}
function xe(t) {
  const e = l(t), a = l(e.bulk_actions), s = {};
  for (const [o, i] of Object.entries(a)) {
    const n = $(i);
    n && (s[o] = n);
  }
  return { bulk_actions: s };
}
function _e(t) {
  const e = l(t), a = l(e.data), s = l(e.meta), o = _(a.columns).map(me), i = _(a.rows).map(he), n = {};
  for (const [d, c] of Object.entries(l(s.quick_action_targets)))
    n[d] = j(c);
  return {
    data: {
      columns: o,
      rows: i,
      selection: xe(a.selection)
    },
    meta: {
      channel: r(s.channel),
      page: u(s.page, 1),
      per_page: u(s.per_page, 25),
      total: u(s.total),
      total_locales: u(s.total_locales),
      locale_offset: u(s.locale_offset),
      locale_limit: u(s.locale_limit),
      has_more_locales: x(s.has_more_locales),
      latency_target_ms: u(s.latency_target_ms),
      query_model: z(s.query_model),
      contracts: B(s.contracts),
      scope: Object.fromEntries(
        Object.entries(l(s.scope)).map(([d, c]) => [d, r(c)])
      ),
      locale_policy: _(s.locale_policy).map((d) => {
        const c = l(d);
        return {
          locale: r(c.locale),
          label: r(c.label),
          sticky: x(c.sticky),
          source_locale: x(c.source_locale),
          required_by_count: u(c.required_by_count),
          optional_family_count: u(c.optional_family_count),
          not_required_family_ids: f(c.not_required_family_ids)
        };
      }),
      quick_action_targets: n
    }
  };
}
function be(t) {
  const e = l(t), a = r(e.status);
  return {
    family_id: r(e.family_id),
    content_type: r(e.content_type),
    source_record_id: r(e.source_record_id),
    requested_locales: f(e.requested_locales),
    status: a || "failed",
    created: _(e.created),
    skipped: _(e.skipped),
    failures: _(e.failures),
    exportable_locales: f(e.exportable_locales),
    estimated_rows: u(e.estimated_rows)
  };
}
function ye(t) {
  const e = l(t), a = l(e.data), s = l(a.summary), o = {};
  for (const [n, d] of Object.entries(s))
    o[n] = u(d);
  return {
    data: {
      action: r(a.action) || "create_missing",
      summary: o,
      results: _(a.results).map(be),
      export_request: Object.keys(l(a.export_request)).length > 0 ? l(a.export_request) : void 0,
      preview_rows: _(a.preview_rows)
    },
    meta: {
      channel: r(l(e.meta).channel),
      contracts: B(l(e.meta).contracts)
    }
  };
}
function ke(t, e = {}) {
  const a = new URL(t, "http://localhost"), s = r(e.channel);
  return s && a.searchParams.set("channel", s), e.tenantId && a.searchParams.set("tenant_id", e.tenantId), e.orgId && a.searchParams.set("org_id", e.orgId), e.familyId && a.searchParams.set("family_id", e.familyId), e.contentType && a.searchParams.set("content_type", e.contentType), e.readinessState && a.searchParams.set("readiness_state", e.readinessState), e.blockerCode && a.searchParams.set("blocker_code", e.blockerCode), e.locales && e.locales.length > 0 && a.searchParams.set("locales", e.locales.join(",")), typeof e.page == "number" && a.searchParams.set("page", String(e.page)), typeof e.perPage == "number" && a.searchParams.set("per_page", String(e.perPage)), typeof e.localeOffset == "number" && a.searchParams.set("locale_offset", String(e.localeOffset)), typeof e.localeLimit == "number" && a.searchParams.set("locale_limit", String(e.localeLimit)), `${a.pathname}${a.search}`;
}
function y(t = {}) {
  const e = f(t.family_ids), a = f(t.locales), s = {};
  for (const [o, i] of Object.entries(l(t.bulk_actions))) {
    const n = $(i);
    n && (s[o] = n);
  }
  return {
    family_ids: e,
    locales: a,
    bulk_actions: s
  };
}
function we(t, e) {
  const a = r(e);
  if (!a)
    return y(t);
  const s = new Set(t.family_ids);
  return s.has(a) ? s.delete(a) : s.add(a), {
    ...y(t),
    family_ids: Array.from(s).sort()
  };
}
function ve(t, e) {
  return {
    ...y(t),
    locales: f(e)
  };
}
function $e(t, e = {}) {
  return {
    family_ids: [...t.family_ids],
    locales: [...t.locales],
    ...e
  };
}
function Te(t) {
  return !!(t && t.state === "not_required");
}
function We(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const s of t.data.rows)
      Te(s.cells[e.locale]) && a.push(s.family_id);
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
function D(t) {
  return r(t);
}
function N(t, e) {
  return {
    endpoint: `${D(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function Se(t) {
  const e = D(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a)
    throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(s = {}) {
      const o = ke(e, s), i = await a(o, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!i.ok) {
        const n = await M(i);
        throw new T({
          message: n.message || await C(i, "Failed to load translation matrix"),
          status: i.status,
          code: n.textCode,
          requestId: i.headers.get("x-request-id") ?? void 0,
          traceId: i.headers.get("x-trace-id") ?? void 0,
          metadata: n.metadata
        });
      }
      return _e(await i.json());
    },
    async runBulkAction(s, o) {
      const i = s ?? N(e, "create_missing"), n = r(i.endpoint);
      if (!n)
        throw new Error("Matrix bulk action endpoint is not configured.");
      const d = await a(n, {
        method: r(i.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(o)
      });
      if (!d.ok) {
        const c = await M(d);
        throw new T({
          message: c.message || await C(d, "Matrix action failed"),
          status: d.status,
          code: c.textCode,
          requestId: d.headers.get("x-request-id") ?? void 0,
          traceId: d.headers.get("x-trace-id") ?? void 0,
          metadata: c.metadata
        });
      }
      return ye(await d.json());
    }
  };
}
function E(t) {
  return r(t).replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function F(t) {
  return t.split(",").map((e) => e.trim().toLowerCase()).filter((e, a, s) => e && s.indexOf(e) === a);
}
function Ee() {
  if (!globalThis.location)
    return {};
  const t = new URLSearchParams(globalThis.location.search), e = F(t.get("locales") ?? t.get("locale") ?? "");
  return {
    channel: r(t.get("channel")),
    tenantId: r(t.get("tenant_id")),
    orgId: r(t.get("org_id")),
    contentType: r(t.get("content_type")),
    readinessState: r(t.get("readiness_state")),
    blockerCode: r(t.get("blocker_code")),
    locales: e,
    page: t.get("page") ? u(t.get("page")) : void 0,
    perPage: t.get("per_page") ? u(t.get("per_page")) : void 0,
    localeLimit: t.get("locale_limit") ? u(t.get("locale_limit")) : void 0,
    localeOffset: t.get("locale_offset") ? u(t.get("locale_offset")) : void 0
  };
}
function Ae(t) {
  return [
    t.channel ? `Channel ${t.channel}` : "",
    t.tenantId ? `Tenant ${t.tenantId}` : "",
    t.orgId ? `Org ${t.orgId}` : ""
  ].filter(Boolean).join(" • ");
}
function Ce(t, e, a = "Action") {
  const s = t.label || a, o = Object.entries(e).map(([d, c]) => `${g(d)}="${g(c)}"`).join(" "), i = t.reason || "Action unavailable";
  return `<button type="button" class="inline-flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${t.enabled ? "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100" : "border-gray-200 bg-gray-100 text-gray-500"}" ${o} ${t.enabled ? "" : "disabled"} title="${g(t.enabled ? t.description || s : i)}">${m(s)}</button>`;
}
function Me(t) {
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
function Re(t) {
  const e = `border ${ne(Me(t.state))}`, a = t.assignment?.status || t.variant?.status || E(t.state);
  return `
    <div class="flex items-center justify-between gap-2">
      <span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${g(e)}">${m(E(t.state))}</span>
      <span class="truncate text-[11px] text-gray-500">${m(E(a))}</span>
    </div>
  `;
}
function H(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? O({});
}
function Le(t, e) {
  const a = t.data.columns, s = t.data.rows;
  return `
    <div class="${ee}" data-matrix-grid="true">
      <table class="${te}">
        <thead class="${ae}">
          <tr>
            <th scope="col" class="${se} border-b border-gray-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === s.length && s.length > 0 ? "checked" : ""}>
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
          ${s.map((o, i) => `
            <tr data-matrix-row="${g(o.family_id)}">
              <th scope="row" class="${re} border-b border-gray-200 px-4 py-4 text-left align-top">
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
    const c = o.cells[n.locale], p = H(c);
    return `
                  <td class="${oe}">
                    <div class="min-w-[10rem] rounded-xl border border-gray-200 bg-gray-50 p-3">
                      ${Re(c)}
                      <div class="mt-3">
                        ${Ce(p, {
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
function Ie(t, e, a, s = !1) {
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
          <button type="button" data-matrix-bulk-action="create_missing" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!o?.enabled || n || s ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-sky-500 text-white hover:bg-sky-400"}" ${!o?.enabled || n || s ? "disabled" : ""} title="${g(d || "Create missing locale work")}">${m(s ? "Working…" : "Create Missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!i?.enabled || n || s ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-white text-gray-900 hover:bg-gray-100"}" ${!i?.enabled || n || s ? "disabled" : ""} title="${g(c || "Export selected locale work")}">${m(s ? "Working…" : "Export Selected")}</button>
        </div>
      </div>
    </section>
  `;
}
function Pe(t) {
  const e = t.meta.page <= 1, a = t.meta.page * t.meta.per_page >= t.meta.total, s = t.meta.locale_offset <= 0, o = !t.meta.has_more_locales;
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
          <button type="button" data-matrix-locales="prev" class="${v}" ${s ? "disabled" : ""}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${v}" ${o ? "disabled" : ""}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}
function Oe(t, e = !1) {
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
          <button type="submit" class="${ie} w-full" ${e ? "disabled" : ""}>${m(e ? "Loading…" : "Apply filters")}</button>
        </div>
      </form>
    </section>
  `;
}
function je() {
  return Q({
    tag: "section",
    text: "Loading translation matrix…",
    showSpinner: !1,
    containerClass: `${W} p-8 shadow-sm`,
    attributes: {
      "data-matrix-loading": "true"
    },
    ariaLive: "polite"
  });
}
function qe() {
  return R({
    tag: "section",
    containerClass: `${L} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No rows",
    titleClass: I,
    heading: "No families match this matrix scope.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.",
    messageClass: `${P} mt-3 max-w-2xl leading-6`,
    attributes: {
      "data-matrix-empty": "true"
    },
    ariaLive: "polite"
  });
}
function ze(t) {
  const e = t instanceof T ? t.requestId : "", a = t instanceof T ? t.traceId : "";
  return R({
    tag: "section",
    containerClass: `${G} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "Matrix unavailable",
    titleClass: V,
    heading: "The matrix payload could not be loaded.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-rose-900",
    message: t instanceof Error ? t.message : "Failed to load the translation matrix",
    messageClass: `${J} mt-3 leading-6`,
    metadata: e || a ? [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ") : "",
    metadataClass: "mt-3 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" data-matrix-retry="true" class="${Z}">Retry matrix</button></div>`,
    role: "alert",
    attributes: {
      "data-matrix-error": "true"
    }
  });
}
function Be(t, e, a, s, o, i, n, d = !1, c = "/admin") {
  const p = Ae(e), k = a == null ? s === "loading" ? je() : ze(n) : a.data.rows.length === 0 ? qe() : `${Ie(a, o, i, d)}<div class="grid gap-5">${Pe(a)}${Le(a, o)}</div>`, w = `${A(c || "/admin")}/translations`;
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
            <p class="${X}">Translation Coverage</p>
            <h1 class="${Y} mt-2">${m(t)}</h1>
            <p class="${K} mt-3 max-w-3xl leading-6">Dense family-by-locale coverage with sticky headers, row pagination, locale windows, and quick actions for missing or in-flight work.</p>
          </div>
          ${p ? `<p class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${m(p)}</p>` : ""}
        </div>
      </section>
      ${Oe(e, s === "loading" || d)}
      ${k}
    </div>
  `;
}
class De extends U {
  constructor(e) {
    super("loading"), this.root = null, this.payload = null, this.error = null, this.selection = y(), this.feedback = "", this.working = !1, this.handleSubmit = (s) => {
      const o = s.target;
      if (!(o instanceof HTMLFormElement) || o.dataset.matrixFilterForm !== "true")
        return;
      s.preventDefault();
      const i = new FormData(o);
      this.updateQuery({
        contentType: r(i.get("content_type")),
        readinessState: r(i.get("readiness_state")),
        blockerCode: r(i.get("blocker_code")),
        locales: F(r(i.get("locales"))),
        page: 1,
        localeOffset: 0
      }), this.load();
    }, this.handleClick = (s) => {
      const o = s.target;
      if (!(o instanceof HTMLElement))
        return;
      if (o.closest('[data-matrix-retry="true"]')) {
        this.load();
        return;
      }
      const n = o.closest("[data-matrix-family-toggle]");
      if (n) {
        this.selection = we(this.selection, n.dataset.matrixFamilyToggle || ""), this.render();
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
        b.has(h) ? b.delete(h) : b.add(h), this.selection = ve(this.selection, Array.from(b)), this.render();
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
      const S = o.closest('[data-matrix-cell-action="true"]');
      if (S) {
        const h = S.dataset.familyId || "", b = S.dataset.locale || "";
        this.runCellAction(h, b);
      }
    }, this.handleKeydown = (s) => {
      const o = s.target;
      if (!(o instanceof HTMLElement) || o.dataset.matrixCellAction !== "true")
        return;
      const i = u(o.dataset.rowIndex, -1), n = u(o.dataset.colIndex, -1);
      if (i < 0 || n < 0 || !this.root)
        return;
      let d = i, c = n;
      switch (s.key) {
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
      p && (s.preventDefault(), p.focus());
    };
    const a = ce(e.basePath || "", e.endpoint);
    this.config = {
      ...e,
      basePath: a,
      title: e.title || "Translation Matrix"
    }, this.client = Se(this.config), this.query = Ee();
  }
  mount(e) {
    this.root = e, this.render(), this.load(), e.addEventListener("click", this.handleClick), e.addEventListener("submit", this.handleSubmit), e.addEventListener("keydown", this.handleKeydown);
  }
  unmount() {
    this.root && (this.root.removeEventListener("click", this.handleClick), this.root.removeEventListener("submit", this.handleSubmit), this.root.removeEventListener("keydown", this.handleKeydown), this.root = null);
  }
  async refresh() {
    await this.load();
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await this.client.fetchMatrix(this.query);
      this.payload = e, this.selection = y({
        family_ids: this.selection.family_ids.filter((a) => e.data.rows.some((s) => s.family_id === a)),
        locales: this.selection.locales.filter((a) => e.data.columns.some((s) => s.locale === a)),
        bulk_actions: e.data.selection.bulk_actions
      }), this.state = e.data.rows.length === 0 ? "empty" : "ready";
    } catch (e) {
      this.payload = null, this.state = "error", this.error = e;
    }
    this.render();
  }
  render() {
    this.root && (this.root.innerHTML = Be(
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
    const a = this.payload.meta.quick_action_targets, s = N(this.config.endpoint, e), o = a[e] ?? s;
    this.working = !0, this.feedback = "", this.render();
    try {
      const n = (await this.client.runBulkAction(o, $e(this.selection, {
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
    const o = this.payload.data.rows.find((n) => n.family_id === e)?.cells[a], i = o ? H(o) : null;
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
function Ge(t, e = {}) {
  const a = r(e.endpoint) || r(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = `<section class="${L} p-6" data-matrix-empty="true"><p class="${I}">Configuration required</p><p class="${P} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`, null;
  const s = new De({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || r(t.dataset.title) || "Translation Matrix",
    basePath: e.basePath || r(t.dataset.basePath)
  });
  return s.mount(t), s;
}
export {
  De as TranslationMatrixPage,
  T as TranslationMatrixRequestError,
  $e as buildTranslationMatrixBulkActionPayload,
  We as buildTranslationMatrixLocalePolicyMetadata,
  ke as buildTranslationMatrixURL,
  Se as createTranslationMatrixClient,
  y as createTranslationMatrixSelectionState,
  Ge as initTranslationMatrixPage,
  Te as isTranslationMatrixNotRequiredCell,
  ye as normalizeTranslationMatrixBulkActionResponse,
  ge as normalizeTranslationMatrixCell,
  q as normalizeTranslationMatrixCellState,
  me as normalizeTranslationMatrixColumn,
  _e as normalizeTranslationMatrixResponse,
  he as normalizeTranslationMatrixRow,
  ve as setTranslationMatrixSelectedLocales,
  we as toggleTranslationMatrixFamilySelection
};
//# sourceMappingURL=index.js.map

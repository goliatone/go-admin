import { d as A } from "../chunks/index-YiVxcMWC.js";
import { asString as o, asBoolean as x, asNumberish as m, asRecord as l, asUniqueStringArray as f } from "../shared/coercion.js";
import { trimTrailingSlash as I, deriveBasePathFromAPIEndpoint as K } from "../shared/path-normalization.js";
import { setSearchParam as y, setJoinedSearchParam as G, setNumberSearchParam as $, buildEndpointURL as V, readLocationSearchParams as J, getStringSearchParam as _, getNumberSearchParam as S } from "../shared/query-state/url-state.js";
import { StatefulController as W } from "../shared/stateful-controller.js";
import { escapeAttribute as g, escapeHTML as u } from "../shared/html.js";
import { readHTTPError as L } from "../shared/transport/http-client.js";
import { a as Z, r as P } from "../chunks/ui-states-B4-pLIrz.js";
import { extractStructuredError as q } from "../toast/error-helpers.js";
import { E as O, i as j, j as z, H as ee, h as te, a as ae, L as re, k as se, l as oe, m as ie, q as ne, x as E, D as le, F as ce, J as de, K as ue, N as me, O as pe, f as fe, p as ge } from "../chunks/style-constants-i2xRoO1L.js";
function b(t) {
  return Array.isArray(t) ? t.map((e) => l(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function he(t, e) {
  const a = I(o(t));
  return a || K(o(e)) || "/admin";
}
function xe(t) {
  const e = l(t), a = o(e.href), r = o(e.label);
  return !a && !r ? null : {
    href: a,
    route: o(e.route),
    resolver_key: o(e.resolver_key),
    key: o(e.key),
    label: r,
    description: o(e.description),
    relation: o(e.relation)
  };
}
function B(t) {
  const e = l(t);
  return {
    enabled: x(e.enabled),
    label: o(e.label),
    description: o(e.description),
    href: o(e.href),
    endpoint: o(e.endpoint),
    method: o(e.method).toUpperCase() || "POST",
    route: o(e.route),
    resolver_key: o(e.resolver_key),
    permission: o(e.permission),
    reason: o(e.reason),
    reason_code: o(e.reason_code),
    payload: l(e.payload)
  };
}
function _e(t) {
  const e = {};
  for (const [a, r] of Object.entries(l(t)))
    e[a] = B(r);
  return e;
}
function D(t) {
  const e = l(t);
  return {
    endpoint: o(e.endpoint),
    method: o(e.method).toUpperCase(),
    route: o(e.route),
    resolver_key: o(e.resolver_key),
    base_path: o(e.base_path),
    type: o(e.type)
  };
}
function N(t) {
  const e = o(t).toLowerCase();
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
function be(t) {
  const e = l(t);
  return {
    locale: o(e.locale),
    label: o(e.label) || o(e.locale).toUpperCase(),
    required_by_count: m(e.required_by_count),
    source_count: m(e.source_count),
    source_locale: x(e.source_locale),
    sticky: x(e.sticky)
  };
}
function ye(t) {
  const e = l(t), a = o(e.id), r = o(e.locale);
  return !a && !r ? null : {
    id: a,
    locale: r,
    status: o(e.status),
    is_source: x(e.is_source),
    source_record_id: o(e.source_record_id)
  };
}
function ke(t) {
  const e = l(t), a = o(e.id);
  return a ? {
    id: a,
    status: o(e.status),
    assignee_id: o(e.assignee_id),
    reviewer_id: o(e.reviewer_id),
    work_scope: o(e.work_scope)
  } : null;
}
function we(t) {
  const e = l(t), a = N(e.state);
  return {
    locale: o(e.locale),
    state: a,
    required: x(e.required),
    not_required: x(e.not_required) || a === "not_required",
    fallback: x(e.fallback) || a === "fallback",
    blocker_codes: f(e.blocker_codes),
    variant: ye(e.variant),
    assignment: ke(e.assignment),
    quick_actions: _e(e.quick_actions)
  };
}
function ve(t) {
  const e = l(t), a = l(e.cells), r = {};
  for (const [s, i] of Object.entries(a))
    r[s] = we({ locale: s, ...l(i) });
  return {
    family_id: o(e.family_id),
    content_type: o(e.content_type),
    source_locale: o(e.source_locale),
    source_record_id: o(e.source_record_id),
    source_title: o(e.source_title),
    readiness_state: o(e.readiness_state),
    blocker_codes: f(e.blocker_codes),
    links: Object.fromEntries(
      Object.entries(l(e.links)).map(([s, i]) => [s, xe(i)]).filter(([, s]) => s)
    ),
    cells: r
  };
}
function F(t) {
  const e = l(t), a = l(e.viewport_target);
  return {
    id: o(e.id),
    description: o(e.description),
    scope_fields: f(e.scope_fields),
    supported_filters: f(e.supported_filters),
    stable_sort_keys: f(e.stable_sort_keys),
    default_page_size: m(e.default_page_size),
    max_page_size: m(e.max_page_size),
    default_locale_limit: m(e.default_locale_limit),
    max_locale_limit: m(e.max_locale_limit),
    viewport_target: {
      rows: m(a.rows),
      locales: m(a.locales)
    },
    index_hints: f(e.index_hints),
    ui_route: o(e.ui_route),
    api_route: o(e.api_route),
    resolver_keys: f(e.resolver_keys)
  };
}
function H(t) {
  const e = l(t);
  if (Object.keys(e).length === 0)
    return {};
  const a = l(e.bulk_actions), r = {};
  for (const [s, i] of Object.entries(a)) {
    const n = l(i);
    r[s] = {
      id: o(n.id) || s,
      permission: o(n.permission),
      endpoint_route: o(n.endpoint_route),
      resolver_key: o(n.resolver_key),
      required_fields: f(n.required_fields),
      optional_fields: f(n.optional_fields),
      result_statuses: f(n.result_statuses),
      selection_required: x(n.selection_required)
    };
  }
  return {
    schema_version: m(e.schema_version),
    cell_states: f(e.cell_states).map((s) => N(s)),
    latency_target_ms: m(e.latency_target_ms),
    query_model: F(e.query_model),
    bulk_actions: r
  };
}
function Te(t) {
  const e = l(t), a = l(e.bulk_actions), r = {};
  for (const [s, i] of Object.entries(a)) {
    const n = A(i);
    n && (r[s] = n);
  }
  return { bulk_actions: r };
}
function $e(t) {
  const e = l(t), a = l(e.data), r = l(e.meta), s = b(a.columns).map(be), i = b(a.rows).map(ve), n = {};
  for (const [d, c] of Object.entries(l(r.quick_action_targets)))
    n[d] = D(c);
  return {
    data: {
      columns: s,
      rows: i,
      selection: Te(a.selection)
    },
    meta: {
      channel: o(r.channel),
      page: m(r.page, 1),
      per_page: m(r.per_page, 25),
      total: m(r.total),
      total_locales: m(r.total_locales),
      locale_offset: m(r.locale_offset),
      locale_limit: m(r.locale_limit),
      has_more_locales: x(r.has_more_locales),
      latency_target_ms: m(r.latency_target_ms),
      query_model: F(r.query_model),
      contracts: H(r.contracts),
      scope: Object.fromEntries(
        Object.entries(l(r.scope)).map(([d, c]) => [d, o(c)])
      ),
      locale_policy: b(r.locale_policy).map((d) => {
        const c = l(d);
        return {
          locale: o(c.locale),
          label: o(c.label),
          sticky: x(c.sticky),
          source_locale: x(c.source_locale),
          required_by_count: m(c.required_by_count),
          optional_family_count: m(c.optional_family_count),
          not_required_family_ids: f(c.not_required_family_ids)
        };
      }),
      quick_action_targets: n
    }
  };
}
function Se(t) {
  const e = l(t), a = o(e.status);
  return {
    family_id: o(e.family_id),
    content_type: o(e.content_type),
    source_record_id: o(e.source_record_id),
    requested_locales: f(e.requested_locales),
    status: a || "failed",
    created: b(e.created),
    skipped: b(e.skipped),
    failures: b(e.failures),
    exportable_locales: f(e.exportable_locales),
    estimated_rows: m(e.estimated_rows)
  };
}
function Ee(t) {
  const e = l(t), a = l(e.data), r = l(a.summary), s = {};
  for (const [n, d] of Object.entries(r))
    s[n] = m(d);
  return {
    data: {
      action: o(a.action) || "create_missing",
      summary: s,
      results: b(a.results).map(Se),
      export_request: Object.keys(l(a.export_request)).length > 0 ? l(a.export_request) : void 0,
      preview_rows: b(a.preview_rows)
    },
    meta: {
      channel: o(l(e.meta).channel),
      contracts: H(l(e.meta).contracts)
    }
  };
}
function Ae(t, e = {}) {
  const a = new URLSearchParams();
  return y(a, "channel", e.channel), y(a, "tenant_id", e.tenantId), y(a, "org_id", e.orgId), y(a, "family_id", e.familyId), y(a, "content_type", e.contentType), y(a, "readiness_state", e.readinessState), y(a, "blocker_code", e.blockerCode), G(a, "locales", e.locales), $(a, "page", e.page), $(a, "per_page", e.perPage), $(a, "locale_offset", e.localeOffset, { min: 0 }), $(a, "locale_limit", e.localeLimit, { min: 0 }), V(t, a);
}
function w(t = {}) {
  const e = f(t.family_ids), a = f(t.locales), r = {};
  for (const [s, i] of Object.entries(l(t.bulk_actions))) {
    const n = A(i);
    n && (r[s] = n);
  }
  return {
    family_ids: e,
    locales: a,
    bulk_actions: r
  };
}
function Ce(t, e) {
  const a = o(e);
  if (!a)
    return w(t);
  const r = new Set(t.family_ids);
  return r.has(a) ? r.delete(a) : r.add(a), {
    ...w(t),
    family_ids: Array.from(r).sort()
  };
}
function Me(t, e) {
  return {
    ...w(t),
    locales: f(e)
  };
}
function Re(t, e = {}) {
  return {
    family_ids: [...t.family_ids],
    locales: [...t.locales],
    ...e
  };
}
function Le(t) {
  return !!(t && t.state === "not_required");
}
function st(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const r of t.data.rows)
      Le(r.cells[e.locale]) && a.push(r.family_id);
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
class C extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationMatrixRequestError", this.status = e.status, this.code = e.code ?? null, this.requestId = e.requestId, this.traceId = e.traceId, this.metadata = e.metadata ?? null;
  }
}
function U(t) {
  return o(t);
}
function Q(t, e) {
  return {
    endpoint: `${U(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function qe(t) {
  const e = U(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a)
    throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(r = {}) {
      const s = Ae(e, r), i = await a(s, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!i.ok) {
        const n = await q(i);
        throw new C({
          message: n.message || await L(i, "Failed to load translation matrix"),
          status: i.status,
          code: n.textCode,
          requestId: i.headers.get("x-request-id") ?? void 0,
          traceId: i.headers.get("x-trace-id") ?? void 0,
          metadata: n.metadata
        });
      }
      return $e(await i.json());
    },
    async runBulkAction(r, s) {
      const i = r ?? Q(e, "create_missing"), n = o(i.endpoint);
      if (!n)
        throw new Error("Matrix bulk action endpoint is not configured.");
      const d = await a(n, {
        method: o(i.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(s)
      });
      if (!d.ok) {
        const c = await q(d);
        throw new C({
          message: c.message || await L(d, "Matrix action failed"),
          status: d.status,
          code: c.textCode,
          requestId: d.headers.get("x-request-id") ?? void 0,
          traceId: d.headers.get("x-trace-id") ?? void 0,
          metadata: c.metadata
        });
      }
      return Ee(await d.json());
    }
  };
}
function R(t) {
  return o(t).replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function X(t) {
  return t.split(",").map((e) => e.trim().toLowerCase()).filter((e, a, r) => e && r.indexOf(e) === a);
}
function Ie() {
  const t = J(globalThis.location);
  if (!t)
    return {};
  const e = X(_(t, "locales") ?? _(t, "locale") ?? "");
  return {
    channel: _(t, "channel") ?? "",
    tenantId: _(t, "tenant_id") ?? "",
    orgId: _(t, "org_id") ?? "",
    contentType: _(t, "content_type") ?? "",
    readinessState: _(t, "readiness_state") ?? "",
    blockerCode: _(t, "blocker_code") ?? "",
    locales: e,
    page: S(t, "page"),
    perPage: S(t, "per_page"),
    localeLimit: S(t, "locale_limit"),
    localeOffset: S(t, "locale_offset")
  };
}
function Pe(t) {
  return [
    t.channel ? `Channel ${t.channel}` : "",
    t.tenantId ? `Tenant ${t.tenantId}` : "",
    t.orgId ? `Org ${t.orgId}` : ""
  ].filter(Boolean).join(" • ");
}
function Oe(t, e, a = "Action") {
  const r = t.label || a, s = Object.entries(e).map(([d, c]) => `${g(d)}="${g(c)}"`).join(" "), i = t.reason || "Action unavailable";
  return `<button type="button" class="inline-flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${t.enabled ? "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100" : "border-gray-200 bg-gray-100 text-gray-500"}" ${s} ${t.enabled ? "" : "disabled"} title="${g(t.enabled ? t.description || r : i)}">${u(r)}</button>`;
}
function je(t) {
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
function ze(t) {
  const e = `border ${ge(je(t.state))}`, a = t.assignment?.status || t.variant?.status || R(t.state);
  return `
    <div class="flex items-center justify-between gap-2">
      <span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${g(e)}">${u(R(t.state))}</span>
      <span class="truncate text-[11px] text-gray-500">${u(R(a))}</span>
    </div>
  `;
}
function Y(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? B({});
}
function Be(t, e) {
  const a = t.data.columns, r = t.data.rows;
  return `
    <div class="${le}" data-matrix-grid="true">
      <table class="${ce}">
        <thead class="${de}">
          <tr>
            <th scope="col" class="${ue} border-b border-gray-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === r.length && r.length > 0 ? "checked" : ""}>
                <span>Families</span>
              </label>
            </th>
            ${a.map((s) => {
    const i = t.meta.locale_policy.find((d) => d.locale === s.locale), n = e.locales.includes(s.locale);
    return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${g(s.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${n ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}">
                    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-700">${u(s.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${u(s.source_locale ? "Source locale" : `${i?.required_by_count ?? s.required_by_count} required families`)}</span>
                    <span class="mt-1 text-[11px] text-gray-400">${u(i && i.optional_family_count > 0 ? `${i.optional_family_count} optional` : "Header action")}</span>
                  </button>
                </th>
              `;
  }).join("")}
          </tr>
        </thead>
        <tbody>
          ${r.map((s, i) => `
            <tr data-matrix-row="${g(s.family_id)}">
              <th scope="row" class="${me} border-b border-gray-200 px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${g(s.family_id)}" ${e.family_ids.includes(s.family_id) ? "checked" : ""} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${g(s.links.family?.href || "#")}">${u(s.source_title || s.family_id)}</a>
                      <span class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">${u(s.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">${u(s.family_id)}</p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${s.links.content_detail?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${g(s.links.content_detail.href)}">Source</a>` : ""}
                      ${s.links.content_edit?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${g(s.links.content_edit.href)}">Edit source</a>` : ""}
                    </div>
                  </div>
                </div>
              </th>
              ${a.map((n, d) => {
    const c = s.cells[n.locale], p = Y(c);
    return `
                  <td class="${pe}">
                    <div class="min-w-[10rem] rounded-xl border border-gray-200 bg-gray-50 p-3">
                      ${ze(c)}
                      <div class="mt-3">
                        ${Oe(p, {
      "data-matrix-cell-action": "true",
      "data-family-id": s.family_id,
      "data-locale": n.locale,
      "data-row-index": String(i),
      "data-col-index": String(d),
      "data-action-kind": p.enabled && p.href ? "open" : "create"
    }, p.enabled && p.href ? "Open" : "Create")}
                      </div>
                      ${p.reason && !p.enabled ? `<p class="mt-2 text-[11px] leading-5 text-gray-400">${u(p.reason)}</p>` : ""}
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
function De(t, e, a, r = !1) {
  const s = e.bulk_actions.create_missing ?? A(null), i = e.bulk_actions.export_selected ?? A(null), n = e.family_ids.length === 0, d = s?.enabled ? n ? "Select at least one family row." : "" : s?.reason || "Create missing is unavailable.", c = i?.enabled ? n ? "Select at least one family row." : "" : i?.reason || "Export selected is unavailable.";
  return `
    <section class="rounded-xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-100 shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Bulk Actions</p>
          <p class="mt-2 text-sm text-gray-300">Selected families: <strong class="text-white">${u(String(e.family_ids.length))}</strong> · Selected locales: <strong class="text-white">${u(e.locales.length > 0 ? e.locales.join(", ") : "auto")}</strong></p>
          ${a ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-300" data-matrix-feedback="true">${u(a)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!s?.enabled || n || r ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-sky-500 text-white hover:bg-sky-400"}" ${!s?.enabled || n || r ? "disabled" : ""} title="${g(d || "Create missing locale work")}">${u(r ? "Working…" : "Create Missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!i?.enabled || n || r ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-white text-gray-900 hover:bg-gray-100"}" ${!i?.enabled || n || r ? "disabled" : ""} title="${g(c || "Export selected locale work")}">${u(r ? "Working…" : "Export Selected")}</button>
        </div>
      </div>
    </section>
  `;
}
function Ne(t) {
  const e = t.meta.page <= 1, a = t.meta.page * t.meta.per_page >= t.meta.total, r = t.meta.locale_offset <= 0, s = !t.meta.has_more_locales;
  return `
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm" data-matrix-viewport="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Viewport</p>
          <p class="mt-2 text-sm text-gray-600">Rows ${u(String(t.data.rows.length))} of ${u(String(t.meta.total))} · Locales ${u(String(t.meta.locale_offset + 1))}-${u(String(Math.min(t.meta.locale_offset + t.meta.locale_limit, t.meta.total_locales)))} of ${u(String(t.meta.total_locales))}</p>
        </div>
        <div class="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
          <button type="button" data-matrix-page="prev" class="${E}" ${e ? "disabled" : ""}>Prev families</button>
          <button type="button" data-matrix-page="next" class="${E}" ${a ? "disabled" : ""}>Next families</button>
          <button type="button" data-matrix-locales="prev" class="${E}" ${r ? "disabled" : ""}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${E}" ${s ? "disabled" : ""}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}
function Fe(t, e = !1) {
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
          <button type="submit" class="${fe} w-full" ${e ? "disabled" : ""}>${u(e ? "Loading…" : "Apply filters")}</button>
        </div>
      </form>
    </section>
  `;
}
function He() {
  return Z({
    tag: "section",
    text: "Loading translation matrix…",
    showSpinner: !1,
    containerClass: `${re} p-8 shadow-sm`,
    attributes: {
      "data-matrix-loading": "true"
    },
    ariaLive: "polite"
  });
}
function Ue() {
  return P({
    tag: "section",
    containerClass: `${O} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No rows",
    titleClass: j,
    heading: "No families match this matrix scope.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.",
    messageClass: `${z} mt-3 max-w-2xl leading-6`,
    attributes: {
      "data-matrix-empty": "true"
    },
    ariaLive: "polite"
  });
}
function Qe(t) {
  const e = t instanceof C ? t.requestId : "", a = t instanceof C ? t.traceId : "";
  return P({
    tag: "section",
    containerClass: `${se} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "Matrix unavailable",
    titleClass: oe,
    heading: "The matrix payload could not be loaded.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-rose-900",
    message: t instanceof Error ? t.message : "Failed to load the translation matrix",
    messageClass: `${ie} mt-3 leading-6`,
    metadata: e || a ? [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ") : "",
    metadataClass: "mt-3 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" data-matrix-retry="true" class="${ne}">Retry matrix</button></div>`,
    role: "alert",
    attributes: {
      "data-matrix-error": "true"
    }
  });
}
function Xe(t, e, a, r, s, i, n, d = !1, c = "/admin") {
  const p = Pe(e), v = a == null ? r === "loading" ? He() : Qe(n) : a.data.rows.length === 0 ? Ue() : `${De(a, s, i, d)}<div class="grid gap-5">${Ne(a)}${Be(a, s)}</div>`, T = `${I(c || "/admin")}/translations`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      <section class="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-sky-50 px-6 py-6 shadow-sm" data-matrix-hero="true">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" aria-label="Breadcrumb">
              <a class="hover:text-sky-700 hover:underline" href="${g(T)}">Translations</a>
              <span class="px-2 text-gray-400">/</span>
              <span class="text-gray-600">${u(t)}</span>
            </nav>
            <p class="${ee}">Translation Coverage</p>
            <h1 class="${te} mt-2">${u(t)}</h1>
            <p class="${ae} mt-3 max-w-3xl leading-6">Dense family-by-locale coverage with sticky headers, row pagination, locale windows, and quick actions for missing or in-flight work.</p>
          </div>
          ${p ? `<p class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${u(p)}</p>` : ""}
        </div>
      </section>
      ${Fe(e, r === "loading" || d)}
      ${v}
    </div>
  `;
}
class Ye extends W {
  constructor(e) {
    super("loading"), this.root = null, this.payload = null, this.error = null, this.selection = w(), this.feedback = "", this.working = !1, this.handleSubmit = (r) => {
      const s = r.target;
      if (!(s instanceof HTMLFormElement) || s.dataset.matrixFilterForm !== "true")
        return;
      r.preventDefault();
      const i = new FormData(s);
      this.updateQuery({
        contentType: o(i.get("content_type")),
        readinessState: o(i.get("readiness_state")),
        blockerCode: o(i.get("blocker_code")),
        locales: X(o(i.get("locales"))),
        page: 1,
        localeOffset: 0
      }), this.load();
    }, this.handleClick = (r) => {
      const s = r.target;
      if (!(s instanceof HTMLElement))
        return;
      if (s.closest('[data-matrix-retry="true"]')) {
        this.load();
        return;
      }
      const n = s.closest("[data-matrix-family-toggle]");
      if (n) {
        this.selection = Ce(this.selection, n.dataset.matrixFamilyToggle || ""), this.render();
        return;
      }
      if (s.closest('[data-matrix-toggle-all-families="true"]') && this.payload) {
        this.selection = w({
          family_ids: this.selection.family_ids.length === this.payload.data.rows.length ? [] : this.payload.data.rows.map((h) => h.family_id),
          locales: this.selection.locales,
          bulk_actions: this.selection.bulk_actions
        }), this.render();
        return;
      }
      const c = s.closest("[data-matrix-locale-toggle]");
      if (c) {
        const h = c.dataset.matrixLocaleToggle || "", k = new Set(this.selection.locales);
        k.has(h) ? k.delete(h) : k.add(h), this.selection = Me(this.selection, Array.from(k)), this.render();
        return;
      }
      const p = s.closest("[data-matrix-page]");
      if (p) {
        this.updateQuery({
          page: (this.query.page ?? this.payload?.meta.page ?? 1) + (p.dataset.matrixPage === "next" ? 1 : -1)
        }), this.load();
        return;
      }
      const v = s.closest("[data-matrix-locales]");
      if (v && this.payload) {
        const h = v.dataset.matrixLocales === "next" ? 1 : -1;
        this.updateQuery({
          localeOffset: Math.max(0, (this.query.localeOffset ?? this.payload.meta.locale_offset ?? 0) + h * (this.query.localeLimit ?? this.payload.meta.locale_limit ?? 0))
        }), this.load();
        return;
      }
      const T = s.closest("[data-matrix-bulk-action]");
      if (T) {
        const h = T.dataset.matrixBulkAction;
        this.runBulkAction(h);
        return;
      }
      const M = s.closest('[data-matrix-cell-action="true"]');
      if (M) {
        const h = M.dataset.familyId || "", k = M.dataset.locale || "";
        this.runCellAction(h, k);
      }
    }, this.handleKeydown = (r) => {
      const s = r.target;
      if (!(s instanceof HTMLElement) || s.dataset.matrixCellAction !== "true")
        return;
      const i = m(s.dataset.rowIndex, -1), n = m(s.dataset.colIndex, -1);
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
    const a = he(e.basePath || "", e.endpoint);
    this.config = {
      ...e,
      basePath: a,
      title: e.title || "Translation Matrix"
    }, this.client = qe(this.config), this.query = Ie();
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
      this.payload = e, this.selection = w({
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
    this.root && (this.root.innerHTML = Xe(
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
    const a = this.payload.meta.quick_action_targets, r = Q(this.config.endpoint, e), s = a[e] ?? r;
    this.working = !0, this.feedback = "", this.render();
    try {
      const n = (await this.client.runBulkAction(s, Re(this.selection, {
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
    const s = this.payload.data.rows.find((n) => n.family_id === e)?.cells[a], i = s ? Y(s) : null;
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
        const n = D({
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
function ot(t, e = {}) {
  const a = o(e.endpoint) || o(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = `<section class="${O} p-6" data-matrix-empty="true"><p class="${j}">Configuration required</p><p class="${z} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`, null;
  const r = new Ye({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || o(t.dataset.title) || "Translation Matrix",
    basePath: e.basePath || o(t.dataset.basePath)
  });
  return r.mount(t), r;
}
export {
  Ye as TranslationMatrixPage,
  C as TranslationMatrixRequestError,
  Re as buildTranslationMatrixBulkActionPayload,
  st as buildTranslationMatrixLocalePolicyMetadata,
  Ae as buildTranslationMatrixURL,
  qe as createTranslationMatrixClient,
  w as createTranslationMatrixSelectionState,
  ot as initTranslationMatrixPage,
  Le as isTranslationMatrixNotRequiredCell,
  Ee as normalizeTranslationMatrixBulkActionResponse,
  we as normalizeTranslationMatrixCell,
  N as normalizeTranslationMatrixCellState,
  be as normalizeTranslationMatrixColumn,
  $e as normalizeTranslationMatrixResponse,
  ve as normalizeTranslationMatrixRow,
  Me as setTranslationMatrixSelectedLocales,
  Ce as toggleTranslationMatrixFamilySelection
};
//# sourceMappingURL=index.js.map

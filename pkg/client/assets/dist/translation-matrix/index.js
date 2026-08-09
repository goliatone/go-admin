import { escapeAttribute as h, escapeHTML as m } from "../shared/html.js";
import { httpRequestWith as E, readHTTPError as q } from "../shared/transport/http-client.js";
import { extractStructuredError as L } from "../toast/error-helpers.js";
import { r as ee, s as I } from "../chunks/status-vocabulary-DrEqqUD1.js";
import { buildEndpointURL as te, getNumberSearchParam as S, getStringSearchParam as k, readLocationSearchParams as ae, setJoinedSearchParam as re, setNumberSearchParam as C, setSearchParam as w } from "../shared/query-state/url-state.js";
import { n as M } from "../chunks/translation-contracts-C_O37O2-.js";
import { t as se } from "../chunks/stateful-controller-BhTsWevz.js";
import { deriveBasePathFromAPIEndpoint as ie, trimTrailingSlash as ne } from "../shared/path-normalization.js";
import { asBoolean as x, asNumberish as f, asRecord as c, asString as i, asUniqueStringArray as g } from "../shared/coercion.js";
import { A as j, B as oe, D as B, E as z, H as le, O as D, R as ce, S as A, T as F, U as de, V as ue, W as me, g as N, k as H, x as fe, y as Q, z as pe } from "../chunks/translation-shared-CAzSmGhq.js";
import { c as U, s as he } from "../chunks/ui-states-DDJEdXAd.js";
function v(t) {
  return Array.isArray(t) ? t.map((e) => c(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function ge(t, e) {
  const a = ne(i(t));
  return a || ie(i(e)) || "/admin";
}
function _e(t) {
  const e = c(t), a = i(e.href), r = i(e.label);
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
function X(t) {
  const e = c(t);
  return {
    enabled: x(e.enabled),
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
    payload: c(e.payload)
  };
}
function be(t) {
  const e = {};
  for (const [a, r] of Object.entries(c(t))) e[a] = X(r);
  return e;
}
function Y(t) {
  const e = c(t);
  return {
    endpoint: i(e.endpoint),
    method: i(e.method).toUpperCase(),
    route: i(e.route),
    resolver_key: i(e.resolver_key),
    base_path: i(e.base_path),
    type: i(e.type)
  };
}
function W(t) {
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
function xe(t) {
  const e = c(t);
  return {
    locale: i(e.locale),
    label: i(e.label) || i(e.locale).toUpperCase(),
    required_by_count: f(e.required_by_count),
    source_count: f(e.source_count),
    source_locale: x(e.source_locale),
    sticky: x(e.sticky)
  };
}
function ye(t) {
  const e = c(t), a = i(e.id), r = i(e.locale);
  return !a && !r ? null : {
    id: a,
    locale: r,
    status: i(e.status),
    is_source: x(e.is_source),
    source_record_id: i(e.source_record_id)
  };
}
function ke(t) {
  const e = c(t), a = i(e.id);
  return a ? {
    id: a,
    status: i(e.status),
    assignee_id: i(e.assignee_id),
    reviewer_id: i(e.reviewer_id),
    work_scope: i(e.work_scope)
  } : null;
}
function ve(t) {
  const e = c(t), a = W(e.state);
  return {
    locale: i(e.locale),
    state: a,
    required: x(e.required),
    not_required: x(e.not_required) || a === "not_required",
    fallback: x(e.fallback) || a === "fallback",
    blocker_codes: g(e.blocker_codes),
    variant: ye(e.variant),
    assignment: ke(e.assignment),
    quick_actions: be(e.quick_actions)
  };
}
function we(t) {
  const e = c(t), a = c(e.cells), r = {};
  for (const [s, o] of Object.entries(a)) r[s] = ve({
    locale: s,
    ...c(o)
  });
  return {
    family_id: i(e.family_id),
    content_type: i(e.content_type),
    source_locale: i(e.source_locale),
    source_record_id: i(e.source_record_id),
    source_title: i(e.source_title),
    readiness_state: i(e.readiness_state),
    blocker_codes: g(e.blocker_codes),
    links: Object.fromEntries(Object.entries(c(e.links)).map(([s, o]) => [s, _e(o)]).filter(([, s]) => s)),
    cells: r
  };
}
function K(t) {
  const e = c(t), a = c(e.viewport_target);
  return {
    id: i(e.id),
    description: i(e.description),
    scope_fields: g(e.scope_fields),
    supported_filters: g(e.supported_filters),
    stable_sort_keys: g(e.stable_sort_keys),
    default_page_size: f(e.default_page_size),
    max_page_size: f(e.max_page_size),
    default_locale_limit: f(e.default_locale_limit),
    max_locale_limit: f(e.max_locale_limit),
    viewport_target: {
      rows: f(a.rows),
      locales: f(a.locales)
    },
    index_hints: g(e.index_hints),
    ui_route: i(e.ui_route),
    api_route: i(e.api_route),
    resolver_keys: g(e.resolver_keys)
  };
}
function V(t) {
  const e = c(t);
  if (Object.keys(e).length === 0) return {};
  const a = c(e.bulk_actions), r = {};
  for (const [s, o] of Object.entries(a)) {
    const n = c(o);
    r[s] = {
      id: i(n.id) || s,
      permission: i(n.permission),
      endpoint_route: i(n.endpoint_route),
      resolver_key: i(n.resolver_key),
      required_fields: g(n.required_fields),
      optional_fields: g(n.optional_fields),
      result_statuses: g(n.result_statuses),
      selection_required: x(n.selection_required)
    };
  }
  return {
    schema_version: f(e.schema_version),
    cell_states: g(e.cell_states).map((s) => W(s)),
    latency_target_ms: f(e.latency_target_ms),
    query_model: K(e.query_model),
    bulk_actions: r
  };
}
function $e(t) {
  const e = c(t), a = c(e.bulk_actions), r = {};
  for (const [s, o] of Object.entries(a)) {
    const n = M(o);
    n && (r[s] = n);
  }
  return { bulk_actions: r };
}
function Te(t) {
  const e = c(t), a = c(e.data), r = c(e.meta), s = v(a.columns).map(xe), o = v(a.rows).map(we), n = {};
  for (const [l, d] of Object.entries(c(r.quick_action_targets))) n[l] = Y(d);
  return {
    data: {
      columns: s,
      rows: o,
      selection: $e(a.selection)
    },
    meta: {
      channel: i(r.channel),
      page: f(r.page, 1),
      per_page: f(r.per_page, 25),
      total: f(r.total),
      total_locales: f(r.total_locales),
      locale_offset: f(r.locale_offset),
      locale_limit: f(r.locale_limit),
      has_more_locales: x(r.has_more_locales),
      latency_target_ms: f(r.latency_target_ms),
      query_model: K(r.query_model),
      contracts: V(r.contracts),
      scope: Object.fromEntries(Object.entries(c(r.scope)).map(([l, d]) => [l, i(d)])),
      locale_policy: v(r.locale_policy).map((l) => {
        const d = c(l);
        return {
          locale: i(d.locale),
          label: i(d.label),
          sticky: x(d.sticky),
          source_locale: x(d.source_locale),
          required_by_count: f(d.required_by_count),
          optional_family_count: f(d.optional_family_count),
          not_required_family_ids: g(d.not_required_family_ids)
        };
      }),
      quick_action_targets: n
    }
  };
}
function Se(t) {
  const e = c(t), a = i(e.status);
  return {
    family_id: i(e.family_id),
    content_type: i(e.content_type),
    source_record_id: i(e.source_record_id),
    requested_locales: g(e.requested_locales),
    status: a || "failed",
    created: v(e.created),
    skipped: v(e.skipped),
    failures: v(e.failures),
    exportable_locales: g(e.exportable_locales),
    estimated_rows: f(e.estimated_rows)
  };
}
function Ce(t) {
  const e = c(t), a = c(e.data), r = c(a.summary), s = {};
  for (const [o, n] of Object.entries(r)) s[o] = f(n);
  return {
    data: {
      action: i(a.action) || "create_missing",
      summary: s,
      results: v(a.results).map(Se),
      export_request: Object.keys(c(a.export_request)).length > 0 ? c(a.export_request) : void 0,
      preview_rows: v(a.preview_rows)
    },
    meta: {
      channel: i(c(e.meta).channel),
      contracts: V(c(e.meta).contracts)
    }
  };
}
function Ae(t, e = {}) {
  const a = new URLSearchParams();
  return w(a, "channel", e.channel), w(a, "tenant_id", e.tenantId), w(a, "org_id", e.orgId), w(a, "family_id", e.familyId), w(a, "content_type", e.contentType), w(a, "readiness_state", e.readinessState), w(a, "blocker_code", e.blockerCode), re(a, "locales", e.locales), C(a, "page", e.page), C(a, "per_page", e.perPage), C(a, "locale_offset", e.localeOffset, { min: 0 }), C(a, "locale_limit", e.localeLimit, { min: 0 }), te(t, a);
}
function T(t = {}) {
  const e = g(t.family_ids), a = g(t.locales), r = {};
  for (const [s, o] of Object.entries(c(t.bulk_actions))) {
    const n = M(o);
    n && (r[s] = n);
  }
  return {
    family_ids: e,
    locales: a,
    bulk_actions: r
  };
}
function Me(t, e) {
  const a = i(e);
  if (!a) return T(t);
  const r = new Set(t.family_ids);
  return r.has(a) ? r.delete(a) : r.add(a), {
    ...T(t),
    family_ids: Array.from(r).sort()
  };
}
function Re(t, e) {
  return {
    ...T(t),
    locales: g(e)
  };
}
function Ee(t, e = {}) {
  return {
    family_ids: [...t.family_ids],
    locales: [...t.locales],
    ...e
  };
}
function qe(t) {
  return !!(t && t.state === "not_required");
}
function Le(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const r of t.data.rows) qe(r.cells[e.locale]) && a.push(r.family_id);
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
var R = class extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationMatrixRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
};
function G(t) {
  return i(t);
}
function J(t, e) {
  return {
    endpoint: `${G(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function Ie(t) {
  const e = G(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(r = {}) {
      const s = Ae(e, r), o = await E(a, s, { headers: { Accept: "application/json" } });
      if (!o.ok) {
        const n = await L(o);
        throw new R({
          message: n.message || await q(o, "Failed to load translation matrix"),
          status: o.status,
          code: n.textCode,
          requestId: o.headers.get("x-request-id") ?? void 0,
          traceId: o.headers.get("x-trace-id") ?? void 0,
          metadata: n.metadata
        });
      }
      return Te(await o.json());
    },
    async runBulkAction(r, s) {
      const o = r ?? J(e, "create_missing"), n = i(o.endpoint);
      if (!n) throw new Error("Matrix bulk action endpoint is not configured.");
      const l = await E(a, n, {
        method: i(o.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(s)
      });
      if (!l.ok) {
        const d = await L(l);
        throw new R({
          message: d.message || await q(l, "Matrix action failed"),
          status: l.status,
          code: d.textCode,
          requestId: l.headers.get("x-request-id") ?? void 0,
          traceId: l.headers.get("x-trace-id") ?? void 0,
          metadata: d.metadata
        });
      }
      return Ce(await l.json());
    }
  };
}
function Oe(t) {
  return t.split(",").map((e) => e.trim().toLowerCase()).filter((e, a, r) => e && r.indexOf(e) === a);
}
function Pe() {
  const t = ae(globalThis.location);
  if (!t) return {};
  const e = Oe(k(t, "locales") ?? k(t, "locale") ?? "");
  return {
    channel: k(t, "channel") ?? "",
    tenantId: k(t, "tenant_id") ?? "",
    orgId: k(t, "org_id") ?? "",
    contentType: k(t, "content_type") ?? "",
    readinessState: k(t, "readiness_state") ?? "",
    blockerCode: k(t, "blocker_code") ?? "",
    locales: e,
    page: S(t, "page"),
    perPage: S(t, "per_page"),
    localeLimit: S(t, "locale_limit"),
    localeOffset: S(t, "locale_offset")
  };
}
function je(t) {
  return [
    t.channel ? `Channel ${t.channel}` : "",
    t.tenantId ? `Tenant ${t.tenantId}` : "",
    t.orgId ? `Org ${t.orgId}` : ""
  ].filter(Boolean).join(" • ");
}
function O(t) {
  const e = i(t).trim();
  return e.length <= 12 ? e : `${e.slice(0, 8)}…${e.slice(-4)}`;
}
function Be(t, e, a = "Action") {
  const r = t.label || a, s = Object.entries(e).map(([n, l]) => `${h(n)}="${h(l)}"`).join(" "), o = t.reason || "Action unavailable";
  return `<button type="button" class="btn btn-secondary btn-sm ${t.enabled ? "" : "cursor-not-allowed opacity-50"}" ${s} ${t.enabled ? "" : "disabled"} title="${h(t.enabled ? t.description || r : o)}">${m(r)}</button>`;
}
function ze(t) {
  const e = i(t.assignment?.status || t.variant?.status).toLowerCase(), a = !!e && e !== t.state;
  return `
    <div class="flex flex-wrap items-center gap-1.5">
      ${I(t.state)}
      ${a ? I(e, { showIcon: !1 }) : ""}
    </div>
  `;
}
function Z(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? X({});
}
function De(t, e) {
  const a = t.data.columns, r = t.data.rows;
  return `
    <div class="${ue}" data-matrix-grid="true">
      <table class="${me}">
        <thead class="${le}">
          <tr>
            <th scope="col" class="${oe} border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === r.length && r.length > 0 ? "checked" : ""}>
                <span>Families</span>
              </label>
            </th>
            ${a.map((s) => {
    const o = t.meta.locale_policy.find((d) => d.locale === s.locale), n = e.locales.includes(s.locale), l = o?.optional_family_count ?? 0;
    return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${h(s.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${n ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}">
                    <span class="text-sm font-semibold text-gray-900">${m(s.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${m(s.source_locale ? "Source locale" : `${o?.required_by_count ?? s.required_by_count} required families`)}</span>
                    ${l > 0 ? `<span class="mt-1 text-[11px] text-gray-400">${m(`${l} optional`)}</span>` : ""}
                  </button>
                </th>
              `;
  }).join("")}
          </tr>
        </thead>
        <tbody>
          ${r.map((s, o) => `
            <tr data-matrix-row="${h(s.family_id)}">
              <th scope="row" class="${de} border-b border-gray-200 px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${h(s.family_id)}" ${e.family_ids.includes(s.family_id) ? "checked" : ""} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${h(s.links.family?.href || "#")}">${m(s.source_title || O(s.family_id))}</a>
                      <span class="status-chip status-chip--neutral">${m(s.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500" title="${h(s.family_id)}">
                      <span>${m(O(s.family_id))}</span>
                      <button type="button" class="ml-1 align-middle text-gray-400 transition-colors hover:text-gray-700" data-matrix-copy-id="${h(s.family_id)}" title="Copy family ID" aria-label="Copy family ID">
                        <i class="iconoir-copy" aria-hidden="true"></i>
                      </button>
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${s.links.content_detail?.href ? `<a class="btn btn-secondary btn-sm" href="${h(s.links.content_detail.href)}">Source</a>` : ""}
                      ${s.links.content_edit?.href ? `<a class="btn btn-secondary btn-sm" href="${h(s.links.content_edit.href)}">Edit source</a>` : ""}
                    </div>
                  </div>
                </div>
              </th>
              ${a.map((n, l) => {
    const d = s.cells[n.locale], _ = Z(d);
    return `
                  <td class="${pe}">
                    <div class="min-w-[10rem] rounded-xl border border-gray-200 bg-gray-50 p-3">
                      ${ze(d)}
                      <div class="mt-3">
                        ${Be(_, {
      "data-matrix-cell-action": "true",
      "data-family-id": s.family_id,
      "data-locale": n.locale,
      "data-row-index": String(o),
      "data-col-index": String(l),
      "data-action-kind": _.enabled && _.href ? "open" : "create"
    }, _.enabled && _.href ? "Open" : "Create")}
                      </div>
                      ${_.reason && !_.enabled ? `<p class="mt-2 text-[11px] leading-5 text-gray-400">${m(_.reason)}</p>` : ""}
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
function Fe(t, e, a, r = !1) {
  const s = e.bulk_actions.create_missing ?? M(null), o = e.bulk_actions.export_selected ?? M(null), n = e.family_ids.length === 0, l = s?.enabled ? n ? "Select at least one family row." : "" : s?.reason || "Create missing is unavailable.", d = o?.enabled ? n ? "Select at least one family row." : "" : o?.reason || "Export selected is unavailable.", _ = !s?.enabled || n || r, y = !o?.enabled || n || r;
  return `
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-900">Bulk actions</p>
          <p class="mt-1 text-sm text-gray-500">Selected families: <strong class="text-gray-900">${m(String(e.family_ids.length))}</strong> · Selected locales: <strong class="text-gray-900">${m(e.locales.length > 0 ? e.locales.join(", ") : "auto")}</strong></p>
          ${a ? `<p class="mt-2 text-xs font-medium text-emerald-700" data-matrix-feedback="true">${m(a)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="${Q} ${_ ? "cursor-not-allowed opacity-50" : ""}" ${_ ? "disabled" : ""} title="${h(l || "Create missing locale work")}">${m(r ? "Working…" : "Create missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="${fe} ${y ? "cursor-not-allowed opacity-50" : ""}" ${y ? "disabled" : ""} title="${h(d || "Export selected locale work")}">${m(r ? "Working…" : "Export selected")}</button>
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
          <p class="text-sm font-semibold text-gray-900">Viewport</p>
          <p class="mt-1 text-sm text-gray-600">Rows ${m(String(t.data.rows.length))} of ${m(String(t.meta.total))} · Locales ${m(String(t.meta.locale_offset + 1))}-${m(String(Math.min(t.meta.locale_offset + t.meta.locale_limit, t.meta.total_locales)))} of ${m(String(t.meta.total_locales))}</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-page="prev" class="${A}" ${e ? "disabled" : ""}>Prev families</button>
          <button type="button" data-matrix-page="next" class="${A}" ${a ? "disabled" : ""}>Next families</button>
          <button type="button" data-matrix-locales="prev" class="${A}" ${r ? "disabled" : ""}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${A}" ${s ? "disabled" : ""}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}
var He = [
  {
    value: "",
    label: "All",
    tone: "neutral"
  },
  {
    value: "ready",
    label: "Ready",
    tone: "success"
  },
  {
    value: "blocked",
    label: "Blocked",
    tone: "error"
  }
], Qe = [
  "missing_locale",
  "missing_field",
  "pending_review",
  "outdated_source",
  "qa_blocked"
];
function P(t, e) {
  const a = "quick-filter inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors", r = {
    neutral: {
      active: "bg-gray-200 text-gray-900 ring-2 ring-gray-500 ring-offset-1",
      idle: "bg-gray-100 text-gray-700 hover:bg-gray-200"
    },
    success: {
      active: "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 ring-offset-1",
      idle: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    },
    error: {
      active: "bg-rose-100 text-rose-800 ring-2 ring-rose-500 ring-offset-1",
      idle: "bg-rose-50 text-rose-700 hover:bg-rose-100"
    }
  };
  return `${a} ${e ? r[t].active : r[t].idle}`;
}
function Ue(t, e, a = !1) {
  const r = i(t.readinessState), s = He.map((u) => `
    <button type="button"
            class="${P(u.tone, r === u.value)}"
            data-matrix-quick-filter="${h(u.value)}"
            ${r === u.value ? 'aria-current="true"' : ""}
            ${a ? "disabled" : ""}>
      ${m(u.label)}
    </button>
  `).join(""), o = Qe.map((u) => `
    <option value="${h(u)}" ${t.blockerCode === u ? "selected" : ""}>${m(ee(u))}</option>
  `).join(""), n = e ? Le(e) : [], l = t.locales || [], d = new Set(n.map((u) => u.locale)), _ = l.filter((u) => !d.has(u)), y = [...n.map((u) => ({
    locale: u.locale,
    label: u.label || u.locale.toUpperCase()
  })), ..._.map((u) => ({
    locale: u,
    label: u.toUpperCase()
  }))].map(({ locale: u, label: p }) => {
    const b = l.includes(u);
    return `
      <button type="button"
              class="${P("neutral", b)}"
              data-matrix-filter-locale="${h(u)}"
              aria-pressed="${b ? "true" : "false"}"
              ${a ? "disabled" : ""}>
        ${m(p)}
      </button>
    `;
  }).join(""), $ = [t.contentType, t.blockerCode].filter(Boolean).length + (l.length > 0 ? 1 : 0);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-matrix-filters="true">
      <div class="quick-filters flex flex-wrap items-center gap-3" data-quick-filters>
        <span class="quick-filters__label text-xs font-semibold uppercase tracking-wide text-gray-500">Readiness</span>
        <div class="quick-filters__items inline-flex flex-wrap items-center gap-2" role="group" aria-label="Readiness filters">
          ${s}
        </div>
      </div>
      <details class="filter-panel mt-4 rounded-lg border border-gray-200 bg-gray-50" data-filter-panel ${$ > 0 ? "open" : ""}>
        <summary class="filter-panel__trigger cursor-pointer select-none list-none px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
          <span class="inline-flex items-center gap-2">
            <i class="iconoir-filter text-gray-500" aria-hidden="true"></i>
            <span>Advanced Filters</span>
            ${$ > 0 ? `<span class="filter-panel__badge rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">${$}</span>` : ""}
            <i class="iconoir-nav-arrow-down text-gray-400 transition-transform" aria-hidden="true"></i>
          </span>
        </summary>
        <form data-matrix-filter-form="true" class="filter-panel__form border-t border-gray-200 p-4">
          <div class="filter-panel__grid grid gap-3 md:grid-cols-3">
            <label class="filter-panel__field grid gap-1 text-sm">
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Content type</span>
              <input name="content_type" value="${h(t.contentType || "")}" class="h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. pages" data-filter-field="content_type">
            </label>
            <label class="filter-panel__field grid gap-1 text-sm">
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Blocker</span>
              <select name="blocker_code" class="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" data-filter-field="blocker_code">
                <option value="">All</option>
                ${o}
              </select>
            </label>
            <div class="filter-panel__actions flex items-end gap-2">
              <button type="submit" class="${Q} h-10 px-4 py-2 flex-1" ${a ? "disabled" : ""}>${m(a ? "Loading…" : "Apply")}</button>
            </div>
          </div>
          ${y ? `
          <div class="mt-4">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Locales</span>
            <div class="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Locale filters">
              ${y}
            </div>
          </div>
          ` : ""}
        </form>
      </details>
    </section>
  `;
}
function Xe() {
  return he({
    tag: "section",
    text: "Loading translation matrix…",
    showSpinner: !1,
    containerClass: `${ce} p-8 shadow-sm`,
    attributes: { "data-matrix-loading": "true" },
    ariaLive: "polite"
  });
}
function Ye() {
  return U({
    tag: "section",
    containerClass: `${F} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No rows",
    titleClass: B,
    heading: "No families match this matrix scope.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.",
    messageClass: `${z} mt-3 max-w-2xl leading-6`,
    attributes: { "data-matrix-empty": "true" },
    ariaLive: "polite"
  });
}
function We(t) {
  const e = t instanceof R ? t.requestId : "", a = t instanceof R ? t.traceId : "";
  return U({
    tag: "section",
    containerClass: `${D} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "Matrix unavailable",
    titleClass: j,
    heading: "The matrix payload could not be loaded.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-rose-900",
    message: t instanceof Error ? t.message : "Failed to load the translation matrix",
    messageClass: `${H} mt-3 leading-6`,
    metadata: e || a ? [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ") : "",
    metadataClass: "mt-3 text-xs font-medium text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" data-matrix-retry="true" class="${N}">Retry matrix</button></div>`,
    role: "alert",
    attributes: { "data-matrix-error": "true" }
  });
}
function Ke(t, e, a, r, s, o, n = !1) {
  const l = je(t), d = e == null ? a === "loading" ? Xe() : We(o) : e.data.rows.length === 0 ? Ye() : `${Fe(e, r, s, n)}<div class="grid gap-5">${Ne(e)}${De(e, r)}</div>`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      ${l ? `<p class="text-xs font-medium text-gray-500" data-matrix-scope="true">${m(l)}</p>` : ""}
      ${Ue(t, e, a === "loading" || n)}
      ${d}
    </div>
  `;
}
var Ve = class extends se {
  constructor(t) {
    super("loading"), this.root = null, this.payload = null, this.error = null, this.selection = T(), this.feedback = "", this.working = !1, this.hasServerRenderedContent = !1, this.handleSubmit = (a) => {
      const r = a.target;
      if (!(r instanceof HTMLFormElement) || r.dataset.matrixFilterForm !== "true") return;
      a.preventDefault();
      const s = new FormData(r);
      this.updateQuery({
        contentType: i(s.get("content_type")),
        blockerCode: i(s.get("blocker_code")),
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
      const s = r.closest("[data-matrix-quick-filter]");
      if (s) {
        this.updateQuery({
          readinessState: s.dataset.matrixQuickFilter || "",
          page: 1,
          localeOffset: 0
        }), this.load();
        return;
      }
      const o = r.closest("[data-matrix-filter-locale]");
      if (o) {
        const p = o.dataset.matrixFilterLocale || "", b = new Set(this.query.locales || []);
        b.has(p) ? b.delete(p) : b.add(p), this.updateQuery({
          locales: Array.from(b).sort(),
          page: 1,
          localeOffset: 0
        }), this.load();
        return;
      }
      const n = r.closest("[data-matrix-copy-id]");
      if (n) {
        const p = n.dataset.matrixCopyId || "";
        p && globalThis.navigator?.clipboard?.writeText && globalThis.navigator.clipboard.writeText(p);
        return;
      }
      const l = r.closest("[data-matrix-family-toggle]");
      if (l) {
        if (!this.payload && this.hasServerRenderedContent) return;
        this.selection = Me(this.selection, l.dataset.matrixFamilyToggle || ""), this.render();
        return;
      }
      if (r.closest('[data-matrix-toggle-all-families="true"]') && this.payload) {
        this.selection = T({
          family_ids: this.selection.family_ids.length === this.payload.data.rows.length ? [] : this.payload.data.rows.map((p) => p.family_id),
          locales: this.selection.locales,
          bulk_actions: this.selection.bulk_actions
        }), this.render();
        return;
      }
      const d = r.closest("[data-matrix-locale-toggle]");
      if (d) {
        const p = d.dataset.matrixLocaleToggle || "", b = new Set(this.selection.locales);
        b.has(p) ? b.delete(p) : b.add(p), this.selection = Re(this.selection, Array.from(b)), this.render();
        return;
      }
      const _ = r.closest("[data-matrix-page]");
      if (_) {
        this.updateQuery({ page: (this.query.page ?? this.payload?.meta.page ?? 1) + (_.dataset.matrixPage === "next" ? 1 : -1) }), this.load();
        return;
      }
      const y = r.closest("[data-matrix-locales]");
      if (y && this.payload) {
        const p = y.dataset.matrixLocales === "next" ? 1 : -1;
        this.updateQuery({ localeOffset: Math.max(0, (this.query.localeOffset ?? this.payload.meta.locale_offset ?? 0) + p * (this.query.localeLimit ?? this.payload.meta.locale_limit ?? 0)) }), this.load();
        return;
      }
      const $ = r.closest("[data-matrix-bulk-action]");
      if ($) {
        const p = $.dataset.matrixBulkAction;
        this.runBulkAction(p);
        return;
      }
      const u = r.closest('[data-matrix-cell-action="true"]');
      if (u) {
        const p = u.dataset.familyId || "", b = u.dataset.locale || "";
        this.runCellAction(p, b);
      }
    }, this.handleKeydown = (a) => {
      const r = a.target;
      if (!(r instanceof HTMLElement) || r.dataset.matrixCellAction !== "true") return;
      const s = f(r.dataset.rowIndex, -1), o = f(r.dataset.colIndex, -1);
      if (s < 0 || o < 0 || !this.root) return;
      let n = s, l = o;
      switch (a.key) {
        case "ArrowRight":
          l += 1;
          break;
        case "ArrowLeft":
          l -= 1;
          break;
        case "ArrowDown":
          n += 1;
          break;
        case "ArrowUp":
          n -= 1;
          break;
        default:
          return;
      }
      const d = this.root.querySelector(`[data-matrix-cell-action="true"][data-row-index="${n}"][data-col-index="${l}"]`);
      d && (a.preventDefault(), d.focus());
    };
    const e = ge(t.basePath || "", t.endpoint);
    this.config = {
      ...t,
      basePath: e,
      title: t.title || "Translation Matrix"
    }, this.client = Ie(this.config), this.query = Pe();
  }
  mount(t) {
    this.root = t, this.hasServerRenderedContent = t.dataset.translationMatrixSsr === "true" && t.innerHTML.trim().length > 0, this.hasServerRenderedContent || this.render(), this.load(), t.addEventListener("click", this.handleClick), t.addEventListener("submit", this.handleSubmit), t.addEventListener("keydown", this.handleKeydown);
  }
  unmount() {
    this.root && (this.root.removeEventListener("click", this.handleClick), this.root.removeEventListener("submit", this.handleSubmit), this.root.removeEventListener("keydown", this.handleKeydown), this.root = null);
  }
  async refresh() {
    await this.load();
  }
  async load() {
    const t = this.payload, e = this.hasServerRenderedContent && t == null;
    this.state = "loading", this.error = null, e || this.render();
    try {
      const a = await this.client.fetchMatrix(this.query);
      this.payload = a, this.hasServerRenderedContent = !1, this.selection = T({
        family_ids: this.selection.family_ids.filter((r) => a.data.rows.some((s) => s.family_id === r)),
        locales: this.selection.locales.filter((r) => a.data.columns.some((s) => s.locale === r)),
        bulk_actions: a.data.selection.bulk_actions
      }), this.state = a.data.rows.length === 0 ? "empty" : "ready";
    } catch (a) {
      if (this.error = a, t) {
        this.payload = t, this.state = t.data.rows.length === 0 ? "empty" : "ready", this.feedback = a instanceof Error ? a.message : "Matrix refresh failed.", this.render();
        return;
      }
      if (this.payload = null, this.state = "error", e) {
        this.renderServerRenderedError(a);
        return;
      }
    }
    this.render();
  }
  renderServerRenderedError(t) {
    if (!this.root) return;
    this.root.querySelector("[data-matrix-ssr-error-banner]")?.remove();
    const e = t instanceof Error ? t.message : "Failed to load the translation matrix.";
    this.root.insertAdjacentHTML("afterbegin", `
      <section class="${D} mb-4 p-4 shadow-sm" data-matrix-ssr-error-banner="true" role="alert">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="${j}">Matrix refresh failed</h2>
            <p class="${H} mt-1">${m(e)}</p>
          </div>
          <button type="button" data-matrix-retry="true" class="${N}">Retry</button>
        </div>
      </section>
    `);
  }
  render() {
    this.root && (this.root.innerHTML = Ke(this.query, this.payload, this.state, this.selection, this.feedback, this.error, this.working));
  }
  updateQuery(t) {
    this.query = {
      ...this.query,
      ...t
    };
  }
  async runBulkAction(t) {
    if (!this.payload) return;
    const e = this.payload.meta.quick_action_targets, a = J(this.config.endpoint, t), r = e[t] ?? a;
    this.working = !0, this.feedback = "", this.render();
    try {
      const s = (await this.client.runBulkAction(r, Ee(this.selection, { channel: this.query.channel }))).data.summary[t === "create_missing" ? "created" : "export_ready"] ?? 0;
      this.feedback = t === "create_missing" ? `Created ${s} locale variants from the current matrix selection.` : `Prepared ${s} export groups from the current matrix selection.`, await this.load();
    } catch (s) {
      this.error = s, this.feedback = s instanceof Error ? s.message : "Matrix action failed.", this.render();
    } finally {
      this.working = !1, this.render();
    }
  }
  async runCellAction(t, e) {
    if (!this.payload) return;
    const a = this.payload.data.rows.find((s) => s.family_id === t)?.cells[e], r = a ? Z(a) : null;
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
        const s = Y({
          endpoint: r.endpoint,
          method: r.method,
          route: r.route,
          resolver_key: r.resolver_key
        }), o = (await this.client.runBulkAction(s, r.payload)).data.summary.created ?? 0;
        this.feedback = `Created ${o} locale variant${o === 1 ? "" : "s"} for ${e.toUpperCase()}.`, await this.load();
      } catch (s) {
        this.feedback = s instanceof Error ? s.message : "Matrix action failed.", this.render();
      } finally {
        this.working = !1, this.render();
      }
    }
  }
};
function lt(t, e = {}) {
  const a = i(e.endpoint) || i(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = `<section class="${F} p-6" data-matrix-empty="true"><p class="${B}">Configuration required</p><p class="${z} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`, null;
  const r = new Ve({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || i(t.dataset.title) || "Translation Matrix",
    basePath: e.basePath || i(t.dataset.basePath)
  });
  return r.mount(t), r;
}
export {
  Ve as TranslationMatrixPage,
  R as TranslationMatrixRequestError,
  Ee as buildTranslationMatrixBulkActionPayload,
  Le as buildTranslationMatrixLocalePolicyMetadata,
  Ae as buildTranslationMatrixURL,
  Ie as createTranslationMatrixClient,
  T as createTranslationMatrixSelectionState,
  lt as initTranslationMatrixPage,
  qe as isTranslationMatrixNotRequiredCell,
  Ce as normalizeTranslationMatrixBulkActionResponse,
  ve as normalizeTranslationMatrixCell,
  W as normalizeTranslationMatrixCellState,
  xe as normalizeTranslationMatrixColumn,
  Te as normalizeTranslationMatrixResponse,
  we as normalizeTranslationMatrixRow,
  Re as setTranslationMatrixSelectedLocales,
  Me as toggleTranslationMatrixFamilySelection
};

//# sourceMappingURL=index.js.map
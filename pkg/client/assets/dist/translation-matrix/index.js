import { escapeAttribute as h, escapeHTML as m } from "../shared/html.js";
import { httpRequestWith as E, readHTTPError as q } from "../shared/transport/http-client.js";
import { extractStructuredError as L } from "../toast/error-helpers.js";
import { r as Z, s as I } from "../chunks/status-vocabulary-BYdivV6D.js";
import { buildEndpointURL as ee, getNumberSearchParam as S, getStringSearchParam as k, readLocationSearchParams as te, setJoinedSearchParam as ae, setNumberSearchParam as C, setSearchParam as w } from "../shared/query-state/url-state.js";
import { n as M } from "../chunks/translation-contracts-C_O37O2-.js";
import { t as se } from "../chunks/stateful-controller-BhTsWevz.js";
import { deriveBasePathFromAPIEndpoint as re, trimTrailingSlash as ie } from "../shared/path-normalization.js";
import { asBoolean as x, asNumberish as p, asRecord as c, asString as i, asUniqueStringArray as _ } from "../shared/coercion.js";
import { A as P, B as ne, D as j, E as B, H as oe, O as z, R as le, S as A, T as D, U as ce, V as de, W as ue, g as F, k as N, x as me, y as H, z as fe } from "../chunks/translation-shared-Dy-TBOmE.js";
import { c as Q, s as pe } from "../chunks/ui-states-DcGB3TAV.js";
function v(t) {
  return Array.isArray(t) ? t.map((e) => c(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function he(t, e) {
  const a = ie(i(t));
  return a || re(i(e)) || "/admin";
}
function _e(t) {
  const e = c(t), a = i(e.href), s = i(e.label);
  return !a && !s ? null : {
    href: a,
    route: i(e.route),
    resolver_key: i(e.resolver_key),
    key: i(e.key),
    label: s,
    description: i(e.description),
    relation: i(e.relation)
  };
}
function U(t) {
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
  for (const [a, s] of Object.entries(c(t))) e[a] = U(s);
  return e;
}
function X(t) {
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
function Y(t) {
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
function ge(t) {
  const e = c(t);
  return {
    locale: i(e.locale),
    label: i(e.label) || i(e.locale).toUpperCase(),
    required_by_count: p(e.required_by_count),
    source_count: p(e.source_count),
    source_locale: x(e.source_locale),
    sticky: x(e.sticky)
  };
}
function xe(t) {
  const e = c(t), a = i(e.id), s = i(e.locale);
  return !a && !s ? null : {
    id: a,
    locale: s,
    status: i(e.status),
    is_source: x(e.is_source),
    source_record_id: i(e.source_record_id)
  };
}
function ye(t) {
  const e = c(t), a = i(e.id);
  return a ? {
    id: a,
    status: i(e.status),
    assignee_id: i(e.assignee_id),
    reviewer_id: i(e.reviewer_id),
    work_scope: i(e.work_scope)
  } : null;
}
function ke(t) {
  const e = c(t), a = Y(e.state);
  return {
    locale: i(e.locale),
    state: a,
    required: x(e.required),
    not_required: x(e.not_required) || a === "not_required",
    fallback: x(e.fallback) || a === "fallback",
    blocker_codes: _(e.blocker_codes),
    variant: xe(e.variant),
    assignment: ye(e.assignment),
    quick_actions: be(e.quick_actions)
  };
}
function ve(t) {
  const e = c(t), a = c(e.cells), s = {};
  for (const [r, o] of Object.entries(a)) s[r] = ke({
    locale: r,
    ...c(o)
  });
  return {
    family_id: i(e.family_id),
    content_type: i(e.content_type),
    source_locale: i(e.source_locale),
    source_record_id: i(e.source_record_id),
    source_title: i(e.source_title),
    readiness_state: i(e.readiness_state),
    blocker_codes: _(e.blocker_codes),
    links: Object.fromEntries(Object.entries(c(e.links)).map(([r, o]) => [r, _e(o)]).filter(([, r]) => r)),
    cells: s
  };
}
function W(t) {
  const e = c(t), a = c(e.viewport_target);
  return {
    id: i(e.id),
    description: i(e.description),
    scope_fields: _(e.scope_fields),
    supported_filters: _(e.supported_filters),
    stable_sort_keys: _(e.stable_sort_keys),
    default_page_size: p(e.default_page_size),
    max_page_size: p(e.max_page_size),
    default_locale_limit: p(e.default_locale_limit),
    max_locale_limit: p(e.max_locale_limit),
    viewport_target: {
      rows: p(a.rows),
      locales: p(a.locales)
    },
    index_hints: _(e.index_hints),
    ui_route: i(e.ui_route),
    api_route: i(e.api_route),
    resolver_keys: _(e.resolver_keys)
  };
}
function K(t) {
  const e = c(t);
  if (Object.keys(e).length === 0) return {};
  const a = c(e.bulk_actions), s = {};
  for (const [r, o] of Object.entries(a)) {
    const n = c(o);
    s[r] = {
      id: i(n.id) || r,
      permission: i(n.permission),
      endpoint_route: i(n.endpoint_route),
      resolver_key: i(n.resolver_key),
      required_fields: _(n.required_fields),
      optional_fields: _(n.optional_fields),
      result_statuses: _(n.result_statuses),
      selection_required: x(n.selection_required)
    };
  }
  return {
    schema_version: p(e.schema_version),
    cell_states: _(e.cell_states).map((r) => Y(r)),
    latency_target_ms: p(e.latency_target_ms),
    query_model: W(e.query_model),
    bulk_actions: s
  };
}
function we(t) {
  const e = c(t), a = c(e.bulk_actions), s = {};
  for (const [r, o] of Object.entries(a)) {
    const n = M(o);
    n && (s[r] = n);
  }
  return { bulk_actions: s };
}
function $e(t) {
  const e = c(t), a = c(e.data), s = c(e.meta), r = v(a.columns).map(ge), o = v(a.rows).map(ve), n = {};
  for (const [l, d] of Object.entries(c(s.quick_action_targets))) n[l] = X(d);
  return {
    data: {
      columns: r,
      rows: o,
      selection: we(a.selection)
    },
    meta: {
      channel: i(s.channel),
      page: p(s.page, 1),
      per_page: p(s.per_page, 25),
      total: p(s.total),
      total_locales: p(s.total_locales),
      locale_offset: p(s.locale_offset),
      locale_limit: p(s.locale_limit),
      has_more_locales: x(s.has_more_locales),
      latency_target_ms: p(s.latency_target_ms),
      query_model: W(s.query_model),
      contracts: K(s.contracts),
      scope: Object.fromEntries(Object.entries(c(s.scope)).map(([l, d]) => [l, i(d)])),
      locale_policy: v(s.locale_policy).map((l) => {
        const d = c(l);
        return {
          locale: i(d.locale),
          label: i(d.label),
          sticky: x(d.sticky),
          source_locale: x(d.source_locale),
          required_by_count: p(d.required_by_count),
          optional_family_count: p(d.optional_family_count),
          not_required_family_ids: _(d.not_required_family_ids)
        };
      }),
      quick_action_targets: n
    }
  };
}
function Te(t) {
  const e = c(t), a = i(e.status);
  return {
    family_id: i(e.family_id),
    content_type: i(e.content_type),
    source_record_id: i(e.source_record_id),
    requested_locales: _(e.requested_locales),
    status: a || "failed",
    created: v(e.created),
    skipped: v(e.skipped),
    failures: v(e.failures),
    exportable_locales: _(e.exportable_locales),
    estimated_rows: p(e.estimated_rows)
  };
}
function Se(t) {
  const e = c(t), a = c(e.data), s = c(a.summary), r = {};
  for (const [o, n] of Object.entries(s)) r[o] = p(n);
  return {
    data: {
      action: i(a.action) || "create_missing",
      summary: r,
      results: v(a.results).map(Te),
      export_request: Object.keys(c(a.export_request)).length > 0 ? c(a.export_request) : void 0,
      preview_rows: v(a.preview_rows)
    },
    meta: {
      channel: i(c(e.meta).channel),
      contracts: K(c(e.meta).contracts)
    }
  };
}
function Ce(t, e = {}) {
  const a = new URLSearchParams();
  return w(a, "channel", e.channel), w(a, "tenant_id", e.tenantId), w(a, "org_id", e.orgId), w(a, "family_id", e.familyId), w(a, "content_type", e.contentType), w(a, "readiness_state", e.readinessState), w(a, "blocker_code", e.blockerCode), ae(a, "locales", e.locales), C(a, "page", e.page), C(a, "per_page", e.perPage), C(a, "locale_offset", e.localeOffset, { min: 0 }), C(a, "locale_limit", e.localeLimit, { min: 0 }), ee(t, a);
}
function T(t = {}) {
  const e = _(t.family_ids), a = _(t.locales), s = {};
  for (const [r, o] of Object.entries(c(t.bulk_actions))) {
    const n = M(o);
    n && (s[r] = n);
  }
  return {
    family_ids: e,
    locales: a,
    bulk_actions: s
  };
}
function Ae(t, e) {
  const a = i(e);
  if (!a) return T(t);
  const s = new Set(t.family_ids);
  return s.has(a) ? s.delete(a) : s.add(a), {
    ...T(t),
    family_ids: Array.from(s).sort()
  };
}
function Me(t, e) {
  return {
    ...T(t),
    locales: _(e)
  };
}
function Re(t, e = {}) {
  return {
    family_ids: [...t.family_ids],
    locales: [...t.locales],
    ...e
  };
}
function Ee(t) {
  return !!(t && t.state === "not_required");
}
function qe(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const s of t.data.rows) Ee(s.cells[e.locale]) && a.push(s.family_id);
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
function V(t) {
  return i(t);
}
function G(t, e) {
  return {
    endpoint: `${V(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function Le(t) {
  const e = V(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(s = {}) {
      const r = Ce(e, s), o = await E(a, r, { headers: { Accept: "application/json" } });
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
      return $e(await o.json());
    },
    async runBulkAction(s, r) {
      const o = s ?? G(e, "create_missing"), n = i(o.endpoint);
      if (!n) throw new Error("Matrix bulk action endpoint is not configured.");
      const l = await E(a, n, {
        method: i(o.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(r)
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
      return Se(await l.json());
    }
  };
}
function Ie(t) {
  return t.split(",").map((e) => e.trim().toLowerCase()).filter((e, a, s) => e && s.indexOf(e) === a);
}
function Oe() {
  const t = te(globalThis.location);
  if (!t) return {};
  const e = Ie(k(t, "locales") ?? k(t, "locale") ?? "");
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
function Pe(t) {
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
function je(t, e, a = "Action") {
  const s = t.label || a, r = Object.entries(e).map(([n, l]) => `${h(n)}="${h(l)}"`).join(" "), o = t.reason || "Action unavailable";
  return `<button type="button" class="btn btn-secondary btn-sm ${t.enabled ? "" : "cursor-not-allowed opacity-50"}" ${r} ${t.enabled ? "" : "disabled"} title="${h(t.enabled ? t.description || s : o)}">${m(s)}</button>`;
}
function Be(t) {
  const e = i(t.assignment?.status || t.variant?.status).toLowerCase(), a = !!e && e !== t.state;
  return `
    <div class="flex flex-wrap items-center gap-1.5">
      ${I(t.state)}
      ${a ? I(e, { showIcon: !1 }) : ""}
    </div>
  `;
}
function J(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? U({});
}
function ze(t, e) {
  const a = t.data.columns, s = t.data.rows;
  return `
    <div class="${de}" data-matrix-grid="true">
      <table class="${ue}">
        <thead class="${oe}">
          <tr>
            <th scope="col" class="${ne} border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === s.length && s.length > 0 ? "checked" : ""}>
                <span>Families</span>
              </label>
            </th>
            ${a.map((r) => {
    const o = t.meta.locale_policy.find((d) => d.locale === r.locale), n = e.locales.includes(r.locale), l = o?.optional_family_count ?? 0;
    return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${h(r.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${n ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}">
                    <span class="text-sm font-semibold text-gray-900">${m(r.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${m(r.source_locale ? "Source locale" : `${o?.required_by_count ?? r.required_by_count} required families`)}</span>
                    ${l > 0 ? `<span class="mt-1 text-[11px] text-gray-400">${m(`${l} optional`)}</span>` : ""}
                  </button>
                </th>
              `;
  }).join("")}
          </tr>
        </thead>
        <tbody>
          ${s.map((r, o) => `
            <tr data-matrix-row="${h(r.family_id)}">
              <th scope="row" class="${ce} border-b border-gray-200 px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${h(r.family_id)}" ${e.family_ids.includes(r.family_id) ? "checked" : ""} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${h(r.links.family?.href || "#")}">${m(r.source_title || O(r.family_id))}</a>
                      <span class="status-chip status-chip--neutral">${m(r.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500" title="${h(r.family_id)}">
                      <span>${m(O(r.family_id))}</span>
                      <button type="button" class="ml-1 align-middle text-gray-400 transition-colors hover:text-gray-700" data-matrix-copy-id="${h(r.family_id)}" title="Copy family ID" aria-label="Copy family ID">
                        <i class="iconoir-copy" aria-hidden="true"></i>
                      </button>
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${r.links.content_detail?.href ? `<a class="btn btn-secondary btn-sm" href="${h(r.links.content_detail.href)}">Source</a>` : ""}
                      ${r.links.content_edit?.href ? `<a class="btn btn-secondary btn-sm" href="${h(r.links.content_edit.href)}">Edit source</a>` : ""}
                    </div>
                  </div>
                </div>
              </th>
              ${a.map((n, l) => {
    const d = r.cells[n.locale], b = J(d);
    return `
                  <td class="${fe}">
                    <div class="min-w-[10rem] rounded-xl border border-gray-200 bg-gray-50 p-3">
                      ${Be(d)}
                      <div class="mt-3">
                        ${je(b, {
      "data-matrix-cell-action": "true",
      "data-family-id": r.family_id,
      "data-locale": n.locale,
      "data-row-index": String(o),
      "data-col-index": String(l),
      "data-action-kind": b.enabled && b.href ? "open" : "create"
    }, b.enabled && b.href ? "Open" : "Create")}
                      </div>
                      ${b.reason && !b.enabled ? `<p class="mt-2 text-[11px] leading-5 text-gray-400">${m(b.reason)}</p>` : ""}
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
function De(t, e, a, s = !1) {
  const r = e.bulk_actions.create_missing ?? M(null), o = e.bulk_actions.export_selected ?? M(null), n = e.family_ids.length === 0, l = r?.enabled ? n ? "Select at least one family row." : "" : r?.reason || "Create missing is unavailable.", d = o?.enabled ? n ? "Select at least one family row." : "" : o?.reason || "Export selected is unavailable.", b = !r?.enabled || n || s, y = !o?.enabled || n || s;
  return `
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-900">Bulk actions</p>
          <p class="mt-1 text-sm text-gray-500">Selected families: <strong class="text-gray-900">${m(String(e.family_ids.length))}</strong> · Selected locales: <strong class="text-gray-900">${m(e.locales.length > 0 ? e.locales.join(", ") : "auto")}</strong></p>
          ${a ? `<p class="mt-2 text-xs font-medium text-emerald-700" data-matrix-feedback="true">${m(a)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="${H} ${b ? "cursor-not-allowed opacity-50" : ""}" ${b ? "disabled" : ""} title="${h(l || "Create missing locale work")}">${m(s ? "Working…" : "Create missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="${me} ${y ? "cursor-not-allowed opacity-50" : ""}" ${y ? "disabled" : ""} title="${h(d || "Export selected locale work")}">${m(s ? "Working…" : "Export selected")}</button>
        </div>
      </div>
    </section>
  `;
}
function Fe(t) {
  const e = t.meta.page <= 1, a = t.meta.page * t.meta.per_page >= t.meta.total, s = t.meta.locale_offset <= 0, r = !t.meta.has_more_locales;
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
          <button type="button" data-matrix-locales="prev" class="${A}" ${s ? "disabled" : ""}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${A}" ${r ? "disabled" : ""}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}
var Ne = [
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
], He = [
  "missing_locale",
  "missing_field",
  "pending_review",
  "outdated_source",
  "qa_blocked"
];
function Qe(t, e, a = !1) {
  const s = i(t.readinessState), r = Ne.map((u) => {
    const f = s === u.value;
    return `
    <button type="button"
            class="quick-filter quick-filter--sm"
            data-matrix-quick-filter="${h(u.value)}"
            data-quick-filter-value="${h(u.value)}"
            data-tone="${u.tone}"
            data-state="${f ? "active" : "inactive"}"
            ${f ? 'aria-current="true"' : ""}
            ${a ? "disabled" : ""}>
      ${m(u.label)}
    </button>
  `;
  }).join(""), o = He.map((u) => `
    <option value="${h(u)}" ${t.blockerCode === u ? "selected" : ""}>${m(Z(u))}</option>
  `).join(""), n = e ? qe(e) : [], l = t.locales || [], d = new Set(n.map((u) => u.locale)), b = l.filter((u) => !d.has(u)), y = [...n.map((u) => ({
    locale: u.locale,
    label: u.label || u.locale.toUpperCase()
  })), ...b.map((u) => ({
    locale: u,
    label: u.toUpperCase()
  }))].map(({ locale: u, label: f }) => {
    const g = l.includes(u);
    return `
      <button type="button"
              class="quick-filter quick-filter--sm"
              data-matrix-filter-locale="${h(u)}"
              data-quick-filter-value="${h(u)}"
              data-tone="neutral"
              data-state="${g ? "active" : "inactive"}"
              aria-pressed="${g ? "true" : "false"}"
              ${a ? "disabled" : ""}>
        ${m(f)}
      </button>
    `;
  }).join(""), $ = [t.contentType, t.blockerCode].filter(Boolean).length + (l.length > 0 ? 1 : 0);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-matrix-filters="true">
      <div class="quick-filters" data-quick-filters>
        <span class="quick-filters__label">Readiness</span>
        <div class="quick-filters__items" role="group" aria-label="Readiness filters">
          ${r}
        </div>
      </div>
      <details class="filter-panel" data-filter-panel ${$ > 0 ? "open" : ""}>
        <summary class="filter-panel__trigger">
          <span>
            <i class="filter-panel__icon iconoir-filter" aria-hidden="true"></i>
            <span>Advanced Filters</span>
            ${$ > 0 ? `<span class="filter-panel__badge">${$}</span>` : ""}
            <i class="filter-panel__chevron iconoir-nav-arrow-down" aria-hidden="true"></i>
          </span>
        </summary>
        <form data-matrix-filter-form="true" class="filter-panel__form">
          <div class="filter-panel__grid">
            <label class="filter-panel__field">
              <span>Content type</span>
              <input name="content_type" value="${h(t.contentType || "")}" placeholder="e.g. pages" data-filter-field="content_type">
            </label>
            <label class="filter-panel__field">
              <span>Blocker</span>
              <select name="blocker_code" data-filter-field="blocker_code">
                <option value="">All</option>
                ${o}
              </select>
            </label>
            <div class="filter-panel__actions">
              <button type="submit" class="${H}" ${a ? "disabled" : ""}>${m(a ? "Loading…" : "Apply")}</button>
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
function Ue() {
  return pe({
    tag: "section",
    text: "Loading translation matrix…",
    showSpinner: !1,
    containerClass: `${le} p-8 shadow-sm`,
    attributes: { "data-matrix-loading": "true" },
    ariaLive: "polite"
  });
}
function Xe() {
  return Q({
    tag: "section",
    containerClass: `${D} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No rows",
    titleClass: j,
    heading: "No families match this matrix scope.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.",
    messageClass: `${B} mt-3 max-w-2xl leading-6`,
    attributes: { "data-matrix-empty": "true" },
    ariaLive: "polite"
  });
}
function Ye(t) {
  const e = t instanceof R ? t.requestId : "", a = t instanceof R ? t.traceId : "";
  return Q({
    tag: "section",
    containerClass: `${z} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "Matrix unavailable",
    titleClass: P,
    heading: "The matrix payload could not be loaded.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-rose-900",
    message: t instanceof Error ? t.message : "Failed to load the translation matrix",
    messageClass: `${N} mt-3 leading-6`,
    metadata: e || a ? [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ") : "",
    metadataClass: "mt-3 text-xs font-medium text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" data-matrix-retry="true" class="${F}">Retry matrix</button></div>`,
    role: "alert",
    attributes: { "data-matrix-error": "true" }
  });
}
function We(t, e, a, s, r, o, n = !1) {
  const l = Pe(t), d = e == null ? a === "loading" ? Ue() : Ye(o) : e.data.rows.length === 0 ? Xe() : `${De(e, s, r, n)}<div class="grid gap-5">${Fe(e)}${ze(e, s)}</div>`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      ${l ? `<p class="text-xs font-medium text-gray-500" data-matrix-scope="true">${m(l)}</p>` : ""}
      ${Qe(t, e, a === "loading" || n)}
      ${d}
    </div>
  `;
}
var Ke = class extends se {
  constructor(t) {
    super("loading"), this.root = null, this.payload = null, this.error = null, this.selection = T(), this.feedback = "", this.working = !1, this.hasServerRenderedContent = !1, this.handleSubmit = (a) => {
      const s = a.target;
      if (!(s instanceof HTMLFormElement) || s.dataset.matrixFilterForm !== "true") return;
      a.preventDefault();
      const r = new FormData(s);
      this.updateQuery({
        contentType: i(r.get("content_type")),
        blockerCode: i(r.get("blocker_code")),
        page: 1,
        localeOffset: 0
      }), this.load();
    }, this.handleClick = (a) => {
      const s = a.target;
      if (!(s instanceof HTMLElement)) return;
      if (s.closest('[data-matrix-retry="true"]')) {
        this.load();
        return;
      }
      const r = s.closest("[data-matrix-quick-filter]");
      if (r) {
        this.updateQuery({
          readinessState: r.dataset.matrixQuickFilter || "",
          page: 1,
          localeOffset: 0
        }), this.load();
        return;
      }
      const o = s.closest("[data-matrix-filter-locale]");
      if (o) {
        const f = o.dataset.matrixFilterLocale || "", g = new Set(this.query.locales || []);
        g.has(f) ? g.delete(f) : g.add(f), this.updateQuery({
          locales: Array.from(g).sort(),
          page: 1,
          localeOffset: 0
        }), this.load();
        return;
      }
      const n = s.closest("[data-matrix-copy-id]");
      if (n) {
        const f = n.dataset.matrixCopyId || "";
        f && globalThis.navigator?.clipboard?.writeText && globalThis.navigator.clipboard.writeText(f);
        return;
      }
      const l = s.closest("[data-matrix-family-toggle]");
      if (l) {
        if (!this.payload && this.hasServerRenderedContent) return;
        this.selection = Ae(this.selection, l.dataset.matrixFamilyToggle || ""), this.render();
        return;
      }
      if (s.closest('[data-matrix-toggle-all-families="true"]') && this.payload) {
        this.selection = T({
          family_ids: this.selection.family_ids.length === this.payload.data.rows.length ? [] : this.payload.data.rows.map((f) => f.family_id),
          locales: this.selection.locales,
          bulk_actions: this.selection.bulk_actions
        }), this.render();
        return;
      }
      const d = s.closest("[data-matrix-locale-toggle]");
      if (d) {
        const f = d.dataset.matrixLocaleToggle || "", g = new Set(this.selection.locales);
        g.has(f) ? g.delete(f) : g.add(f), this.selection = Me(this.selection, Array.from(g)), this.render();
        return;
      }
      const b = s.closest("[data-matrix-page]");
      if (b) {
        this.updateQuery({ page: (this.query.page ?? this.payload?.meta.page ?? 1) + (b.dataset.matrixPage === "next" ? 1 : -1) }), this.load();
        return;
      }
      const y = s.closest("[data-matrix-locales]");
      if (y && this.payload) {
        const f = y.dataset.matrixLocales === "next" ? 1 : -1;
        this.updateQuery({ localeOffset: Math.max(0, (this.query.localeOffset ?? this.payload.meta.locale_offset ?? 0) + f * (this.query.localeLimit ?? this.payload.meta.locale_limit ?? 0)) }), this.load();
        return;
      }
      const $ = s.closest("[data-matrix-bulk-action]");
      if ($) {
        const f = $.dataset.matrixBulkAction;
        this.runBulkAction(f);
        return;
      }
      const u = s.closest('[data-matrix-cell-action="true"]');
      if (u) {
        const f = u.dataset.familyId || "", g = u.dataset.locale || "";
        this.runCellAction(f, g);
      }
    }, this.handleKeydown = (a) => {
      const s = a.target;
      if (!(s instanceof HTMLElement) || s.dataset.matrixCellAction !== "true") return;
      const r = p(s.dataset.rowIndex, -1), o = p(s.dataset.colIndex, -1);
      if (r < 0 || o < 0 || !this.root) return;
      let n = r, l = o;
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
    const e = he(t.basePath || "", t.endpoint);
    this.config = {
      ...t,
      basePath: e,
      title: t.title || "Translation Matrix"
    }, this.client = Le(this.config), this.query = Oe();
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
        family_ids: this.selection.family_ids.filter((s) => a.data.rows.some((r) => r.family_id === s)),
        locales: this.selection.locales.filter((s) => a.data.columns.some((r) => r.locale === s)),
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
      <section class="${z} mb-4 p-4 shadow-sm" data-matrix-ssr-error-banner="true" role="alert">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="${P}">Matrix refresh failed</h2>
            <p class="${N} mt-1">${m(e)}</p>
          </div>
          <button type="button" data-matrix-retry="true" class="${F}">Retry</button>
        </div>
      </section>
    `);
  }
  render() {
    this.root && (this.root.innerHTML = We(this.query, this.payload, this.state, this.selection, this.feedback, this.error, this.working));
  }
  updateQuery(t) {
    this.query = {
      ...this.query,
      ...t
    };
  }
  async runBulkAction(t) {
    if (!this.payload) return;
    const e = this.payload.meta.quick_action_targets, a = G(this.config.endpoint, t), s = e[t] ?? a;
    this.working = !0, this.feedback = "", this.render();
    try {
      const r = (await this.client.runBulkAction(s, Re(this.selection, { channel: this.query.channel }))).data.summary[t === "create_missing" ? "created" : "export_ready"] ?? 0;
      this.feedback = t === "create_missing" ? `Created ${r} locale variants from the current matrix selection.` : `Prepared ${r} export groups from the current matrix selection.`, await this.load();
    } catch (r) {
      this.error = r, this.feedback = r instanceof Error ? r.message : "Matrix action failed.", this.render();
    } finally {
      this.working = !1, this.render();
    }
  }
  async runCellAction(t, e) {
    if (!this.payload) return;
    const a = this.payload.data.rows.find((r) => r.family_id === t)?.cells[e], s = a ? J(a) : null;
    if (s) {
      if (s.enabled && s.href) {
        globalThis.location && typeof globalThis.location.assign == "function" && globalThis.location.assign(s.href);
        return;
      }
      if (!s.enabled || !s.endpoint) {
        this.feedback = s.reason || "Matrix action unavailable.", this.render();
        return;
      }
      this.working = !0, this.feedback = "", this.render();
      try {
        const r = X({
          endpoint: s.endpoint,
          method: s.method,
          route: s.route,
          resolver_key: s.resolver_key
        }), o = (await this.client.runBulkAction(r, s.payload)).data.summary.created ?? 0;
        this.feedback = `Created ${o} locale variant${o === 1 ? "" : "s"} for ${e.toUpperCase()}.`, await this.load();
      } catch (r) {
        this.feedback = r instanceof Error ? r.message : "Matrix action failed.", this.render();
      } finally {
        this.working = !1, this.render();
      }
    }
  }
};
function ot(t, e = {}) {
  const a = i(e.endpoint) || i(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = `<section class="${D} p-6" data-matrix-empty="true"><p class="${j}">Configuration required</p><p class="${B} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`, null;
  const s = new Ke({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || i(t.dataset.title) || "Translation Matrix",
    basePath: e.basePath || i(t.dataset.basePath)
  });
  return s.mount(t), s;
}
export {
  Ke as TranslationMatrixPage,
  R as TranslationMatrixRequestError,
  Re as buildTranslationMatrixBulkActionPayload,
  qe as buildTranslationMatrixLocalePolicyMetadata,
  Ce as buildTranslationMatrixURL,
  Le as createTranslationMatrixClient,
  T as createTranslationMatrixSelectionState,
  ot as initTranslationMatrixPage,
  Ee as isTranslationMatrixNotRequiredCell,
  Se as normalizeTranslationMatrixBulkActionResponse,
  ke as normalizeTranslationMatrixCell,
  Y as normalizeTranslationMatrixCellState,
  ge as normalizeTranslationMatrixColumn,
  $e as normalizeTranslationMatrixResponse,
  ve as normalizeTranslationMatrixRow,
  Me as setTranslationMatrixSelectedLocales,
  Ae as toggleTranslationMatrixFamilySelection
};

//# sourceMappingURL=index.js.map
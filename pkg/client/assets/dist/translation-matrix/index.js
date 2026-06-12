import { escapeAttribute as _, escapeHTML as f } from "../shared/html.js";
import { readHTTPError as R } from "../shared/transport/http-client.js";
import { extractStructuredError as q } from "../toast/error-helpers.js";
import { r as V, s as L } from "../chunks/status-vocabulary-HmIBabRF.js";
import { buildEndpointURL as W, getNumberSearchParam as S, getStringSearchParam as k, readLocationSearchParams as G, setJoinedSearchParam as J, setNumberSearchParam as C, setSearchParam as v } from "../shared/query-state/url-state.js";
import { deriveBasePathFromAPIEndpoint as Z, trimTrailingSlash as ee } from "../shared/path-normalization.js";
import { n as M } from "../chunks/translation-contracts-DrJVTucO.js";
import { StatefulController as te } from "../shared/stateful-controller.js";
import { asBoolean as x, asNumberish as m, asRecord as c, asString as i, asUniqueStringArray as g } from "../shared/coercion.js";
import { A as ae, B as se, D as P, E as j, H as re, O as ie, R as oe, S as A, T as B, U as ne, V as le, W as ce, g as de, k as ue, x as me, y as z, z as fe } from "../chunks/translation-shared-Ba5eIyeA.js";
import { c as D, s as pe } from "../chunks/ui-states-Dk9y2u2w.js";
function w(t) {
  return Array.isArray(t) ? t.map((e) => c(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function _e(t, e) {
  const a = ee(i(t));
  return a || Z(i(e)) || "/admin";
}
function ge(t) {
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
function F(t) {
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
  for (const [a, s] of Object.entries(c(t))) e[a] = F(s);
  return e;
}
function N(t) {
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
function Q(t) {
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
function he(t) {
  const e = c(t);
  return {
    locale: i(e.locale),
    label: i(e.label) || i(e.locale).toUpperCase(),
    required_by_count: m(e.required_by_count),
    source_count: m(e.source_count),
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
  const e = c(t), a = Q(e.state);
  return {
    locale: i(e.locale),
    state: a,
    required: x(e.required),
    not_required: x(e.not_required) || a === "not_required",
    fallback: x(e.fallback) || a === "fallback",
    blocker_codes: g(e.blocker_codes),
    variant: xe(e.variant),
    assignment: ye(e.assignment),
    quick_actions: be(e.quick_actions)
  };
}
function we(t) {
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
    blocker_codes: g(e.blocker_codes),
    links: Object.fromEntries(Object.entries(c(e.links)).map(([r, o]) => [r, ge(o)]).filter(([, r]) => r)),
    cells: s
  };
}
function U(t) {
  const e = c(t), a = c(e.viewport_target);
  return {
    id: i(e.id),
    description: i(e.description),
    scope_fields: g(e.scope_fields),
    supported_filters: g(e.supported_filters),
    stable_sort_keys: g(e.stable_sort_keys),
    default_page_size: m(e.default_page_size),
    max_page_size: m(e.max_page_size),
    default_locale_limit: m(e.default_locale_limit),
    max_locale_limit: m(e.max_locale_limit),
    viewport_target: {
      rows: m(a.rows),
      locales: m(a.locales)
    },
    index_hints: g(e.index_hints),
    ui_route: i(e.ui_route),
    api_route: i(e.api_route),
    resolver_keys: g(e.resolver_keys)
  };
}
function H(t) {
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
      required_fields: g(n.required_fields),
      optional_fields: g(n.optional_fields),
      result_statuses: g(n.result_statuses),
      selection_required: x(n.selection_required)
    };
  }
  return {
    schema_version: m(e.schema_version),
    cell_states: g(e.cell_states).map((r) => Q(r)),
    latency_target_ms: m(e.latency_target_ms),
    query_model: U(e.query_model),
    bulk_actions: s
  };
}
function ve(t) {
  const e = c(c(t).bulk_actions), a = {};
  for (const [s, r] of Object.entries(e)) {
    const o = M(r);
    o && (a[s] = o);
  }
  return { bulk_actions: a };
}
function $e(t) {
  const e = c(t), a = c(e.data), s = c(e.meta), r = w(a.columns).map(he), o = w(a.rows).map(we), n = {};
  for (const [l, d] of Object.entries(c(s.quick_action_targets))) n[l] = N(d);
  return {
    data: {
      columns: r,
      rows: o,
      selection: ve(a.selection)
    },
    meta: {
      channel: i(s.channel),
      page: m(s.page, 1),
      per_page: m(s.per_page, 25),
      total: m(s.total),
      total_locales: m(s.total_locales),
      locale_offset: m(s.locale_offset),
      locale_limit: m(s.locale_limit),
      has_more_locales: x(s.has_more_locales),
      latency_target_ms: m(s.latency_target_ms),
      query_model: U(s.query_model),
      contracts: H(s.contracts),
      scope: Object.fromEntries(Object.entries(c(s.scope)).map(([l, d]) => [l, i(d)])),
      locale_policy: w(s.locale_policy).map((l) => {
        const d = c(l);
        return {
          locale: i(d.locale),
          label: i(d.label),
          sticky: x(d.sticky),
          source_locale: x(d.source_locale),
          required_by_count: m(d.required_by_count),
          optional_family_count: m(d.optional_family_count),
          not_required_family_ids: g(d.not_required_family_ids)
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
    requested_locales: g(e.requested_locales),
    status: a || "failed",
    created: w(e.created),
    skipped: w(e.skipped),
    failures: w(e.failures),
    exportable_locales: g(e.exportable_locales),
    estimated_rows: m(e.estimated_rows)
  };
}
function Se(t) {
  const e = c(t), a = c(e.data), s = c(a.summary), r = {};
  for (const [o, n] of Object.entries(s)) r[o] = m(n);
  return {
    data: {
      action: i(a.action) || "create_missing",
      summary: r,
      results: w(a.results).map(Te),
      export_request: Object.keys(c(a.export_request)).length > 0 ? c(a.export_request) : void 0,
      preview_rows: w(a.preview_rows)
    },
    meta: {
      channel: i(c(e.meta).channel),
      contracts: H(c(e.meta).contracts)
    }
  };
}
function Ce(t, e = {}) {
  const a = new URLSearchParams();
  return v(a, "channel", e.channel), v(a, "tenant_id", e.tenantId), v(a, "org_id", e.orgId), v(a, "family_id", e.familyId), v(a, "content_type", e.contentType), v(a, "readiness_state", e.readinessState), v(a, "blocker_code", e.blockerCode), J(a, "locales", e.locales), C(a, "page", e.page), C(a, "per_page", e.perPage), C(a, "locale_offset", e.localeOffset, { min: 0 }), C(a, "locale_limit", e.localeLimit, { min: 0 }), W(t, a);
}
function T(t = {}) {
  const e = g(t.family_ids), a = g(t.locales), s = {};
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
function Re(t) {
  return !!(t && t.state === "not_required");
}
function qe(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const s of t.data.rows) Re(s.cells[e.locale]) && a.push(s.family_id);
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
var E = class extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationMatrixRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
};
function X(t) {
  return i(t);
}
function Y(t, e) {
  return {
    endpoint: `${X(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function Le(t) {
  const e = X(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(s = {}) {
      const r = await a(Ce(e, s), { headers: { Accept: "application/json" } });
      if (!r.ok) {
        const o = await q(r);
        throw new E({
          message: o.message || await R(r, "Failed to load translation matrix"),
          status: r.status,
          code: o.textCode,
          requestId: r.headers.get("x-request-id") ?? void 0,
          traceId: r.headers.get("x-trace-id") ?? void 0,
          metadata: o.metadata
        });
      }
      return $e(await r.json());
    },
    async runBulkAction(s, r) {
      const o = s ?? Y(e, "create_missing"), n = i(o.endpoint);
      if (!n) throw new Error("Matrix bulk action endpoint is not configured.");
      const l = await a(n, {
        method: i(o.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(r)
      });
      if (!l.ok) {
        const d = await q(l);
        throw new E({
          message: d.message || await R(l, "Matrix action failed"),
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
  const t = G(globalThis.location);
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
function I(t) {
  const e = i(t).trim();
  return e.length <= 12 ? e : `${e.slice(0, 8)}…${e.slice(-4)}`;
}
function je(t, e, a = "Action") {
  const s = t.label || a, r = Object.entries(e).map(([n, l]) => `${_(n)}="${_(l)}"`).join(" "), o = t.reason || "Action unavailable";
  return `<button type="button" class="btn btn-secondary btn-sm ${t.enabled ? "" : "cursor-not-allowed opacity-50"}" ${r} ${t.enabled ? "" : "disabled"} title="${_(t.enabled ? t.description || s : o)}">${f(s)}</button>`;
}
function Be(t) {
  const e = i(t.assignment?.status || t.variant?.status).toLowerCase(), a = !!e && e !== t.state;
  return `
    <div class="flex flex-wrap items-center gap-1.5">
      ${L(t.state)}
      ${a ? L(e, { showIcon: !1 }) : ""}
    </div>
  `;
}
function K(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? F({});
}
function ze(t, e) {
  const a = t.data.columns, s = t.data.rows;
  return `
    <div class="${le}" data-matrix-grid="true">
      <table class="${ce}">
        <thead class="${re}">
          <tr>
            <th scope="col" class="${se} border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === s.length && s.length > 0 ? "checked" : ""}>
                <span>Families</span>
              </label>
            </th>
            ${a.map((r) => {
    const o = t.meta.locale_policy.find((d) => d.locale === r.locale), n = e.locales.includes(r.locale), l = o?.optional_family_count ?? 0;
    return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${_(r.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${n ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}">
                    <span class="text-sm font-semibold text-gray-900">${f(r.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${f(r.source_locale ? "Source locale" : `${o?.required_by_count ?? r.required_by_count} required families`)}</span>
                    ${l > 0 ? `<span class="mt-1 text-[11px] text-gray-400">${f(`${l} optional`)}</span>` : ""}
                  </button>
                </th>
              `;
  }).join("")}
          </tr>
        </thead>
        <tbody>
          ${s.map((r, o) => `
            <tr data-matrix-row="${_(r.family_id)}">
              <th scope="row" class="${ne} border-b border-gray-200 px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${_(r.family_id)}" ${e.family_ids.includes(r.family_id) ? "checked" : ""} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${_(r.links.family?.href || "#")}">${f(r.source_title || I(r.family_id))}</a>
                      <span class="status-chip status-chip--neutral">${f(r.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500" title="${_(r.family_id)}">
                      <span>${f(I(r.family_id))}</span>
                      <button type="button" class="ml-1 align-middle text-gray-400 transition-colors hover:text-gray-700" data-matrix-copy-id="${_(r.family_id)}" title="Copy family ID" aria-label="Copy family ID">
                        <i class="iconoir-copy" aria-hidden="true"></i>
                      </button>
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${r.links.content_detail?.href ? `<a class="btn btn-secondary btn-sm" href="${_(r.links.content_detail.href)}">Source</a>` : ""}
                      ${r.links.content_edit?.href ? `<a class="btn btn-secondary btn-sm" href="${_(r.links.content_edit.href)}">Edit source</a>` : ""}
                    </div>
                  </div>
                </div>
              </th>
              ${a.map((n, l) => {
    const d = r.cells[n.locale], b = K(d);
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
                      ${b.reason && !b.enabled ? `<p class="mt-2 text-[11px] leading-5 text-gray-400">${f(b.reason)}</p>` : ""}
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
          <p class="mt-1 text-sm text-gray-500">Selected families: <strong class="text-gray-900">${f(String(e.family_ids.length))}</strong> · Selected locales: <strong class="text-gray-900">${f(e.locales.length > 0 ? e.locales.join(", ") : "auto")}</strong></p>
          ${a ? `<p class="mt-2 text-xs font-medium text-emerald-700" data-matrix-feedback="true">${f(a)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="${z} ${b ? "cursor-not-allowed opacity-50" : ""}" ${b ? "disabled" : ""} title="${_(l || "Create missing locale work")}">${f(s ? "Working…" : "Create missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="${me} ${y ? "cursor-not-allowed opacity-50" : ""}" ${y ? "disabled" : ""} title="${_(d || "Export selected locale work")}">${f(s ? "Working…" : "Export selected")}</button>
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
          <p class="mt-1 text-sm text-gray-600">Rows ${f(String(t.data.rows.length))} of ${f(String(t.meta.total))} · Locales ${f(String(t.meta.locale_offset + 1))}-${f(String(Math.min(t.meta.locale_offset + t.meta.locale_limit, t.meta.total_locales)))} of ${f(String(t.meta.total_locales))}</p>
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
], Qe = [
  "missing_locale",
  "missing_field",
  "pending_review",
  "outdated_source",
  "qa_blocked"
];
function O(t, e) {
  const a = "quick-filter inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors", s = {
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
  return `${a} ${e ? s[t].active : s[t].idle}`;
}
function Ue(t, e, a = !1) {
  const s = i(t.readinessState), r = Ne.map((u) => `
    <button type="button"
            class="${O(u.tone, s === u.value)}"
            data-matrix-quick-filter="${_(u.value)}"
            ${s === u.value ? 'aria-current="true"' : ""}
            ${a ? "disabled" : ""}>
      ${f(u.label)}
    </button>
  `).join(""), o = Qe.map((u) => `
    <option value="${_(u)}" ${t.blockerCode === u ? "selected" : ""}>${f(V(u))}</option>
  `).join(""), n = e ? qe(e) : [], l = t.locales || [], d = new Set(n.map((u) => u.locale)), b = l.filter((u) => !d.has(u)), y = [...n.map((u) => ({
    locale: u.locale,
    label: u.label || u.locale.toUpperCase()
  })), ...b.map((u) => ({
    locale: u,
    label: u.toUpperCase()
  }))].map(({ locale: u, label: p }) => {
    const h = l.includes(u);
    return `
      <button type="button"
              class="${O("neutral", h)}"
              data-matrix-filter-locale="${_(u)}"
              aria-pressed="${h ? "true" : "false"}"
              ${a ? "disabled" : ""}>
        ${f(p)}
      </button>
    `;
  }).join(""), $ = [t.contentType, t.blockerCode].filter(Boolean).length + (l.length > 0 ? 1 : 0);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-matrix-filters="true">
      <div class="quick-filters flex flex-wrap items-center gap-3" data-quick-filters>
        <span class="quick-filters__label text-xs font-semibold uppercase tracking-wide text-gray-500">Readiness</span>
        <div class="quick-filters__items inline-flex flex-wrap items-center gap-2" role="group" aria-label="Readiness filters">
          ${r}
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
              <input name="content_type" value="${_(t.contentType || "")}" class="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. pages" data-filter-field="content_type">
            </label>
            <label class="filter-panel__field grid gap-1 text-sm">
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Blocker</span>
              <select name="blocker_code" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" data-filter-field="blocker_code">
                <option value="">All</option>
                ${o}
              </select>
            </label>
            <div class="filter-panel__actions flex items-end gap-2">
              <button type="submit" class="${z} flex-1" ${a ? "disabled" : ""}>${f(a ? "Loading…" : "Apply")}</button>
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
function He() {
  return pe({
    tag: "section",
    text: "Loading translation matrix…",
    showSpinner: !1,
    containerClass: `${oe} p-8 shadow-sm`,
    attributes: { "data-matrix-loading": "true" },
    ariaLive: "polite"
  });
}
function Xe() {
  return D({
    tag: "section",
    containerClass: `${B} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No rows",
    titleClass: P,
    heading: "No families match this matrix scope.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.",
    messageClass: `${j} mt-3 max-w-2xl leading-6`,
    attributes: { "data-matrix-empty": "true" },
    ariaLive: "polite"
  });
}
function Ye(t) {
  const e = t instanceof E ? t.requestId : "", a = t instanceof E ? t.traceId : "";
  return D({
    tag: "section",
    containerClass: `${ie} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "Matrix unavailable",
    titleClass: ae,
    heading: "The matrix payload could not be loaded.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-rose-900",
    message: t instanceof Error ? t.message : "Failed to load the translation matrix",
    messageClass: `${ue} mt-3 leading-6`,
    metadata: e || a ? [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ") : "",
    metadataClass: "mt-3 text-xs font-medium text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" data-matrix-retry="true" class="${de}">Retry matrix</button></div>`,
    role: "alert",
    attributes: { "data-matrix-error": "true" }
  });
}
function Ke(t, e, a, s, r, o, n = !1) {
  const l = Pe(t), d = e == null ? a === "loading" ? He() : Ye(o) : e.data.rows.length === 0 ? Xe() : `${De(e, s, r, n)}<div class="grid gap-5">${Fe(e)}${ze(e, s)}</div>`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      ${l ? `<p class="text-xs font-medium text-gray-500" data-matrix-scope="true">${f(l)}</p>` : ""}
      ${Ue(t, e, a === "loading" || n)}
      ${d}
    </div>
  `;
}
var Ve = class extends te {
  constructor(t) {
    super("loading"), this.root = null, this.payload = null, this.error = null, this.selection = T(), this.feedback = "", this.working = !1, this.handleSubmit = (a) => {
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
        const p = o.dataset.matrixFilterLocale || "", h = new Set(this.query.locales || []);
        h.has(p) ? h.delete(p) : h.add(p), this.updateQuery({
          locales: Array.from(h).sort(),
          page: 1,
          localeOffset: 0
        }), this.load();
        return;
      }
      const n = s.closest("[data-matrix-copy-id]");
      if (n) {
        const p = n.dataset.matrixCopyId || "";
        p && globalThis.navigator?.clipboard?.writeText && globalThis.navigator.clipboard.writeText(p);
        return;
      }
      const l = s.closest("[data-matrix-family-toggle]");
      if (l) {
        this.selection = Ae(this.selection, l.dataset.matrixFamilyToggle || ""), this.render();
        return;
      }
      if (s.closest('[data-matrix-toggle-all-families="true"]') && this.payload) {
        this.selection = T({
          family_ids: this.selection.family_ids.length === this.payload.data.rows.length ? [] : this.payload.data.rows.map((p) => p.family_id),
          locales: this.selection.locales,
          bulk_actions: this.selection.bulk_actions
        }), this.render();
        return;
      }
      const d = s.closest("[data-matrix-locale-toggle]");
      if (d) {
        const p = d.dataset.matrixLocaleToggle || "", h = new Set(this.selection.locales);
        h.has(p) ? h.delete(p) : h.add(p), this.selection = Me(this.selection, Array.from(h)), this.render();
        return;
      }
      const b = s.closest("[data-matrix-page]");
      if (b) {
        this.updateQuery({ page: (this.query.page ?? this.payload?.meta.page ?? 1) + (b.dataset.matrixPage === "next" ? 1 : -1) }), this.load();
        return;
      }
      const y = s.closest("[data-matrix-locales]");
      if (y && this.payload) {
        const p = y.dataset.matrixLocales === "next" ? 1 : -1;
        this.updateQuery({ localeOffset: Math.max(0, (this.query.localeOffset ?? this.payload.meta.locale_offset ?? 0) + p * (this.query.localeLimit ?? this.payload.meta.locale_limit ?? 0)) }), this.load();
        return;
      }
      const $ = s.closest("[data-matrix-bulk-action]");
      if ($) {
        const p = $.dataset.matrixBulkAction;
        this.runBulkAction(p);
        return;
      }
      const u = s.closest('[data-matrix-cell-action="true"]');
      if (u) {
        const p = u.dataset.familyId || "", h = u.dataset.locale || "";
        this.runCellAction(p, h);
      }
    }, this.handleKeydown = (a) => {
      const s = a.target;
      if (!(s instanceof HTMLElement) || s.dataset.matrixCellAction !== "true") return;
      const r = m(s.dataset.rowIndex, -1), o = m(s.dataset.colIndex, -1);
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
    const e = _e(t.basePath || "", t.endpoint);
    this.config = {
      ...t,
      basePath: e,
      title: t.title || "Translation Matrix"
    }, this.client = Le(this.config), this.query = Oe();
  }
  mount(t) {
    this.root = t, this.render(), this.load(), t.addEventListener("click", this.handleClick), t.addEventListener("submit", this.handleSubmit), t.addEventListener("keydown", this.handleKeydown);
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
      const t = await this.client.fetchMatrix(this.query);
      this.payload = t, this.selection = T({
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
    const e = this.payload.meta.quick_action_targets, a = Y(this.config.endpoint, t), s = e[t] ?? a;
    this.working = !0, this.feedback = "", this.render();
    try {
      const r = (await this.client.runBulkAction(s, Ee(this.selection, { channel: this.query.channel }))).data.summary[t === "create_missing" ? "created" : "export_ready"] ?? 0;
      this.feedback = t === "create_missing" ? `Created ${r} locale variants from the current matrix selection.` : `Prepared ${r} export groups from the current matrix selection.`, await this.load();
    } catch (r) {
      this.error = r, this.feedback = r instanceof Error ? r.message : "Matrix action failed.", this.render();
    } finally {
      this.working = !1, this.render();
    }
  }
  async runCellAction(t, e) {
    if (!this.payload) return;
    const a = this.payload.data.rows.find((r) => r.family_id === t)?.cells[e], s = a ? K(a) : null;
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
        const r = N({
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
function nt(t, e = {}) {
  const a = i(e.endpoint) || i(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = `<section class="${B} p-6" data-matrix-empty="true"><p class="${P}">Configuration required</p><p class="${j} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`, null;
  const s = new Ve({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || i(t.dataset.title) || "Translation Matrix",
    basePath: e.basePath || i(t.dataset.basePath)
  });
  return s.mount(t), s;
}
export {
  Ve as TranslationMatrixPage,
  E as TranslationMatrixRequestError,
  Ee as buildTranslationMatrixBulkActionPayload,
  qe as buildTranslationMatrixLocalePolicyMetadata,
  Ce as buildTranslationMatrixURL,
  Le as createTranslationMatrixClient,
  T as createTranslationMatrixSelectionState,
  nt as initTranslationMatrixPage,
  Re as isTranslationMatrixNotRequiredCell,
  Se as normalizeTranslationMatrixBulkActionResponse,
  ke as normalizeTranslationMatrixCell,
  Q as normalizeTranslationMatrixCellState,
  he as normalizeTranslationMatrixColumn,
  $e as normalizeTranslationMatrixResponse,
  we as normalizeTranslationMatrixRow,
  Me as setTranslationMatrixSelectedLocales,
  Ae as toggleTranslationMatrixFamilySelection
};

//# sourceMappingURL=index.js.map
import { escapeAttribute as f, escapeHTML as u } from "../shared/html.js";
import { readHTTPError as C } from "../shared/transport/http-client.js";
import { extractStructuredError as M } from "../toast/error-helpers.js";
import { buildEndpointURL as Q, getNumberSearchParam as v, getStringSearchParam as _, readLocationSearchParams as X, setJoinedSearchParam as Y, setNumberSearchParam as $, setSearchParam as y } from "../shared/query-state/url-state.js";
import { deriveBasePathFromAPIEndpoint as G, trimTrailingSlash as R } from "../shared/path-normalization.js";
import { n as S } from "../chunks/translation-contracts-Ct_EG7JJ.js";
import { StatefulController as K } from "../shared/stateful-controller.js";
import { asBoolean as x, asNumberish as m, asRecord as l, asString as i, asUniqueStringArray as p } from "../shared/coercion.js";
import { $ as V, A as W, C as J, D as Z, E as ee, M as te, O as ae, S as re, _ as se, g as ie, h as L, i as oe, j as ne, k as le, m as I, p as q, s as ce, u as T, v as de, x as ue } from "../chunks/translation-shared-BSLmw_rJ.js";
import { c as P, s as me } from "../chunks/ui-states-CskzQjWR.js";
function b(t) {
  return Array.isArray(t) ? t.map((e) => l(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function pe(t, e) {
  const a = R(i(t));
  return a || G(i(e)) || "/admin";
}
function fe(t) {
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
function O(t) {
  const e = l(t);
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
    payload: l(e.payload)
  };
}
function ge(t) {
  const e = {};
  for (const [a, r] of Object.entries(l(t))) e[a] = O(r);
  return e;
}
function j(t) {
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
function B(t) {
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
  const e = l(t);
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
  const e = l(t), a = i(e.id), r = i(e.locale);
  return !a && !r ? null : {
    id: a,
    locale: r,
    status: i(e.status),
    is_source: x(e.is_source),
    source_record_id: i(e.source_record_id)
  };
}
function _e(t) {
  const e = l(t), a = i(e.id);
  return a ? {
    id: a,
    status: i(e.status),
    assignee_id: i(e.assignee_id),
    reviewer_id: i(e.reviewer_id),
    work_scope: i(e.work_scope)
  } : null;
}
function be(t) {
  const e = l(t), a = B(e.state);
  return {
    locale: i(e.locale),
    state: a,
    required: x(e.required),
    not_required: x(e.not_required) || a === "not_required",
    fallback: x(e.fallback) || a === "fallback",
    blocker_codes: p(e.blocker_codes),
    variant: xe(e.variant),
    assignment: _e(e.assignment),
    quick_actions: ge(e.quick_actions)
  };
}
function ye(t) {
  const e = l(t), a = l(e.cells), r = {};
  for (const [s, o] of Object.entries(a)) r[s] = be({
    locale: s,
    ...l(o)
  });
  return {
    family_id: i(e.family_id),
    content_type: i(e.content_type),
    source_locale: i(e.source_locale),
    source_record_id: i(e.source_record_id),
    source_title: i(e.source_title),
    readiness_state: i(e.readiness_state),
    blocker_codes: p(e.blocker_codes),
    links: Object.fromEntries(Object.entries(l(e.links)).map(([s, o]) => [s, fe(o)]).filter(([, s]) => s)),
    cells: r
  };
}
function z(t) {
  const e = l(t), a = l(e.viewport_target);
  return {
    id: i(e.id),
    description: i(e.description),
    scope_fields: p(e.scope_fields),
    supported_filters: p(e.supported_filters),
    stable_sort_keys: p(e.stable_sort_keys),
    default_page_size: m(e.default_page_size),
    max_page_size: m(e.max_page_size),
    default_locale_limit: m(e.default_locale_limit),
    max_locale_limit: m(e.max_locale_limit),
    viewport_target: {
      rows: m(a.rows),
      locales: m(a.locales)
    },
    index_hints: p(e.index_hints),
    ui_route: i(e.ui_route),
    api_route: i(e.api_route),
    resolver_keys: p(e.resolver_keys)
  };
}
function D(t) {
  const e = l(t);
  if (Object.keys(e).length === 0) return {};
  const a = l(e.bulk_actions), r = {};
  for (const [s, o] of Object.entries(a)) {
    const n = l(o);
    r[s] = {
      id: i(n.id) || s,
      permission: i(n.permission),
      endpoint_route: i(n.endpoint_route),
      resolver_key: i(n.resolver_key),
      required_fields: p(n.required_fields),
      optional_fields: p(n.optional_fields),
      result_statuses: p(n.result_statuses),
      selection_required: x(n.selection_required)
    };
  }
  return {
    schema_version: m(e.schema_version),
    cell_states: p(e.cell_states).map((s) => B(s)),
    latency_target_ms: m(e.latency_target_ms),
    query_model: z(e.query_model),
    bulk_actions: r
  };
}
function ke(t) {
  const e = l(l(t).bulk_actions), a = {};
  for (const [r, s] of Object.entries(e)) {
    const o = S(s);
    o && (a[r] = o);
  }
  return { bulk_actions: a };
}
function we(t) {
  const e = l(t), a = l(e.data), r = l(e.meta), s = b(a.columns).map(he), o = b(a.rows).map(ye), n = {};
  for (const [c, d] of Object.entries(l(r.quick_action_targets))) n[c] = j(d);
  return {
    data: {
      columns: s,
      rows: o,
      selection: ke(a.selection)
    },
    meta: {
      channel: i(r.channel),
      page: m(r.page, 1),
      per_page: m(r.per_page, 25),
      total: m(r.total),
      total_locales: m(r.total_locales),
      locale_offset: m(r.locale_offset),
      locale_limit: m(r.locale_limit),
      has_more_locales: x(r.has_more_locales),
      latency_target_ms: m(r.latency_target_ms),
      query_model: z(r.query_model),
      contracts: D(r.contracts),
      scope: Object.fromEntries(Object.entries(l(r.scope)).map(([c, d]) => [c, i(d)])),
      locale_policy: b(r.locale_policy).map((c) => {
        const d = l(c);
        return {
          locale: i(d.locale),
          label: i(d.label),
          sticky: x(d.sticky),
          source_locale: x(d.source_locale),
          required_by_count: m(d.required_by_count),
          optional_family_count: m(d.optional_family_count),
          not_required_family_ids: p(d.not_required_family_ids)
        };
      }),
      quick_action_targets: n
    }
  };
}
function ve(t) {
  const e = l(t), a = i(e.status);
  return {
    family_id: i(e.family_id),
    content_type: i(e.content_type),
    source_record_id: i(e.source_record_id),
    requested_locales: p(e.requested_locales),
    status: a || "failed",
    created: b(e.created),
    skipped: b(e.skipped),
    failures: b(e.failures),
    exportable_locales: p(e.exportable_locales),
    estimated_rows: m(e.estimated_rows)
  };
}
function $e(t) {
  const e = l(t), a = l(e.data), r = l(a.summary), s = {};
  for (const [o, n] of Object.entries(r)) s[o] = m(n);
  return {
    data: {
      action: i(a.action) || "create_missing",
      summary: s,
      results: b(a.results).map(ve),
      export_request: Object.keys(l(a.export_request)).length > 0 ? l(a.export_request) : void 0,
      preview_rows: b(a.preview_rows)
    },
    meta: {
      channel: i(l(e.meta).channel),
      contracts: D(l(e.meta).contracts)
    }
  };
}
function Te(t, e = {}) {
  const a = new URLSearchParams();
  return y(a, "channel", e.channel), y(a, "tenant_id", e.tenantId), y(a, "org_id", e.orgId), y(a, "family_id", e.familyId), y(a, "content_type", e.contentType), y(a, "readiness_state", e.readinessState), y(a, "blocker_code", e.blockerCode), Y(a, "locales", e.locales), $(a, "page", e.page), $(a, "per_page", e.perPage), $(a, "locale_offset", e.localeOffset, { min: 0 }), $(a, "locale_limit", e.localeLimit, { min: 0 }), Q(t, a);
}
function w(t = {}) {
  const e = p(t.family_ids), a = p(t.locales), r = {};
  for (const [s, o] of Object.entries(l(t.bulk_actions))) {
    const n = S(o);
    n && (r[s] = n);
  }
  return {
    family_ids: e,
    locales: a,
    bulk_actions: r
  };
}
function Se(t, e) {
  const a = i(e);
  if (!a) return w(t);
  const r = new Set(t.family_ids);
  return r.has(a) ? r.delete(a) : r.add(a), {
    ...w(t),
    family_ids: Array.from(r).sort()
  };
}
function Ae(t, e) {
  return {
    ...w(t),
    locales: p(e)
  };
}
function Ee(t, e = {}) {
  return {
    family_ids: [...t.family_ids],
    locales: [...t.locales],
    ...e
  };
}
function Ce(t) {
  return !!(t && t.state === "not_required");
}
function tt(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const r of t.data.rows) Ce(r.cells[e.locale]) && a.push(r.family_id);
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
var A = class extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationMatrixRequestError", this.status = t.status, this.code = t.code ?? null, this.requestId = t.requestId, this.traceId = t.traceId, this.metadata = t.metadata ?? null;
  }
};
function N(t) {
  return i(t);
}
function F(t, e) {
  return {
    endpoint: `${N(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function Me(t) {
  const e = N(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(r = {}) {
      const s = await a(Te(e, r), { headers: { Accept: "application/json" } });
      if (!s.ok) {
        const o = await M(s);
        throw new A({
          message: o.message || await C(s, "Failed to load translation matrix"),
          status: s.status,
          code: o.textCode,
          requestId: s.headers.get("x-request-id") ?? void 0,
          traceId: s.headers.get("x-trace-id") ?? void 0,
          metadata: o.metadata
        });
      }
      return we(await s.json());
    },
    async runBulkAction(r, s) {
      const o = r ?? F(e, "create_missing"), n = i(o.endpoint);
      if (!n) throw new Error("Matrix bulk action endpoint is not configured.");
      const c = await a(n, {
        method: i(o.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(s)
      });
      if (!c.ok) {
        const d = await M(c);
        throw new A({
          message: d.message || await C(c, "Matrix action failed"),
          status: c.status,
          code: d.textCode,
          requestId: c.headers.get("x-request-id") ?? void 0,
          traceId: c.headers.get("x-trace-id") ?? void 0,
          metadata: d.metadata
        });
      }
      return $e(await c.json());
    }
  };
}
function E(t) {
  return i(t).replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function H(t) {
  return t.split(",").map((e) => e.trim().toLowerCase()).filter((e, a, r) => e && r.indexOf(e) === a);
}
function Re() {
  const t = X(globalThis.location);
  if (!t) return {};
  const e = H(_(t, "locales") ?? _(t, "locale") ?? "");
  return {
    channel: _(t, "channel") ?? "",
    tenantId: _(t, "tenant_id") ?? "",
    orgId: _(t, "org_id") ?? "",
    contentType: _(t, "content_type") ?? "",
    readinessState: _(t, "readiness_state") ?? "",
    blockerCode: _(t, "blocker_code") ?? "",
    locales: e,
    page: v(t, "page"),
    perPage: v(t, "per_page"),
    localeLimit: v(t, "locale_limit"),
    localeOffset: v(t, "locale_offset")
  };
}
function Le(t) {
  return [
    t.channel ? `Channel ${t.channel}` : "",
    t.tenantId ? `Tenant ${t.tenantId}` : "",
    t.orgId ? `Org ${t.orgId}` : ""
  ].filter(Boolean).join(" • ");
}
function Ie(t, e, a = "Action") {
  const r = t.label || a, s = Object.entries(e).map(([n, c]) => `${f(n)}="${f(c)}"`).join(" "), o = t.reason || "Action unavailable";
  return `<button type="button" class="inline-flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${t.enabled ? "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100" : "border-gray-200 bg-gray-100 text-gray-500"}" ${s} ${t.enabled ? "" : "disabled"} title="${f(t.enabled ? t.description || r : o)}">${u(r)}</button>`;
}
function qe(t) {
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
function Pe(t) {
  const e = `border ${V(qe(t.state))}`, a = t.assignment?.status || t.variant?.status || E(t.state);
  return `
    <div class="flex items-center justify-between gap-2">
      <span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${f(e)}">${u(E(t.state))}</span>
      <span class="truncate text-[11px] text-gray-500">${u(E(a))}</span>
    </div>
  `;
}
function U(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? O({});
}
function Oe(t, e) {
  const a = t.data.columns, r = t.data.rows;
  return `
    <div class="${le}" data-matrix-grid="true">
      <table class="${te}">
        <thead class="${W}">
          <tr>
            <th scope="col" class="${ae} border-b border-gray-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === r.length && r.length > 0 ? "checked" : ""}>
                <span>Families</span>
              </label>
            </th>
            ${a.map((s) => {
    const o = t.meta.locale_policy.find((c) => c.locale === s.locale), n = e.locales.includes(s.locale);
    return `
                <th scope="col" class="border-b border-gray-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${f(s.locale)}" class="flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${n ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}">
                    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-700">${u(s.label)}</span>
                    <span class="mt-1 text-[11px] text-gray-500">${u(s.source_locale ? "Source locale" : `${o?.required_by_count ?? s.required_by_count} required families`)}</span>
                    <span class="mt-1 text-[11px] text-gray-400">${u(o && o.optional_family_count > 0 ? `${o.optional_family_count} optional` : "Header action")}</span>
                  </button>
                </th>
              `;
  }).join("")}
          </tr>
        </thead>
        <tbody>
          ${r.map((s, o) => `
            <tr data-matrix-row="${f(s.family_id)}">
              <th scope="row" class="${ne} border-b border-gray-200 px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${f(s.family_id)}" ${e.family_ids.includes(s.family_id) ? "checked" : ""} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-gray-900 hover:text-sky-700 hover:underline" href="${f(s.links.family?.href || "#")}">${u(s.source_title || s.family_id)}</a>
                      <span class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">${u(s.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">${u(s.family_id)}</p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${s.links.content_detail?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${f(s.links.content_detail.href)}">Source</a>` : ""}
                      ${s.links.content_edit?.href ? `<a class="rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-gray-300 hover:text-gray-900" href="${f(s.links.content_edit.href)}">Edit source</a>` : ""}
                    </div>
                  </div>
                </div>
              </th>
              ${a.map((n, c) => {
    const d = s.cells[n.locale], g = U(d);
    return `
                  <td class="${Z}">
                    <div class="min-w-[10rem] rounded-xl border border-gray-200 bg-gray-50 p-3">
                      ${Pe(d)}
                      <div class="mt-3">
                        ${Ie(g, {
      "data-matrix-cell-action": "true",
      "data-family-id": s.family_id,
      "data-locale": n.locale,
      "data-row-index": String(o),
      "data-col-index": String(c),
      "data-action-kind": g.enabled && g.href ? "open" : "create"
    }, g.enabled && g.href ? "Open" : "Create")}
                      </div>
                      ${g.reason && !g.enabled ? `<p class="mt-2 text-[11px] leading-5 text-gray-400">${u(g.reason)}</p>` : ""}
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
function je(t, e, a, r = !1) {
  const s = e.bulk_actions.create_missing ?? S(null), o = e.bulk_actions.export_selected ?? S(null), n = e.family_ids.length === 0, c = s?.enabled ? n ? "Select at least one family row." : "" : s?.reason || "Create missing is unavailable.", d = o?.enabled ? n ? "Select at least one family row." : "" : o?.reason || "Export selected is unavailable.";
  return `
    <section class="rounded-xl border border-gray-200 bg-gray-900 px-5 py-4 text-sm text-gray-100 shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Bulk Actions</p>
          <p class="mt-2 text-sm text-gray-300">Selected families: <strong class="text-white">${u(String(e.family_ids.length))}</strong> · Selected locales: <strong class="text-white">${u(e.locales.length > 0 ? e.locales.join(", ") : "auto")}</strong></p>
          ${a ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-300" data-matrix-feedback="true">${u(a)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!s?.enabled || n || r ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-sky-500 text-white hover:bg-sky-400"}" ${!s?.enabled || n || r ? "disabled" : ""} title="${f(c || "Create missing locale work")}">${u(r ? "Working…" : "Create Missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!o?.enabled || n || r ? "cursor-not-allowed bg-white/10 text-gray-400" : "bg-white text-gray-900 hover:bg-gray-100"}" ${!o?.enabled || n || r ? "disabled" : ""} title="${f(d || "Export selected locale work")}">${u(r ? "Working…" : "Export Selected")}</button>
        </div>
      </div>
    </section>
  `;
}
function Be(t) {
  const e = t.meta.page <= 1, a = t.meta.page * t.meta.per_page >= t.meta.total, r = t.meta.locale_offset <= 0, s = !t.meta.has_more_locales;
  return `
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm" data-matrix-viewport="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Viewport</p>
          <p class="mt-2 text-sm text-gray-600">Rows ${u(String(t.data.rows.length))} of ${u(String(t.meta.total))} · Locales ${u(String(t.meta.locale_offset + 1))}-${u(String(Math.min(t.meta.locale_offset + t.meta.locale_limit, t.meta.total_locales)))} of ${u(String(t.meta.total_locales))}</p>
        </div>
        <div class="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
          <button type="button" data-matrix-page="prev" class="${T}" ${e ? "disabled" : ""}>Prev families</button>
          <button type="button" data-matrix-page="next" class="${T}" ${a ? "disabled" : ""}>Next families</button>
          <button type="button" data-matrix-locales="prev" class="${T}" ${r ? "disabled" : ""}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="${T}" ${s ? "disabled" : ""}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}
function ze(t, e = !1) {
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
          <button type="submit" class="${ce} w-full" ${e ? "disabled" : ""}>${u(e ? "Loading…" : "Apply filters")}</button>
        </div>
      </form>
    </section>
  `;
}
function De() {
  return me({
    tag: "section",
    text: "Loading translation matrix…",
    showSpinner: !1,
    containerClass: `${ee} p-8 shadow-sm`,
    attributes: { "data-matrix-loading": "true" },
    ariaLive: "polite"
  });
}
function Ne() {
  return P({
    tag: "section",
    containerClass: `${q} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "No rows",
    titleClass: L,
    heading: "No families match this matrix scope.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-gray-900",
    message: "Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.",
    messageClass: `${I} mt-3 max-w-2xl leading-6`,
    attributes: { "data-matrix-empty": "true" },
    ariaLive: "polite"
  });
}
function Fe(t) {
  const e = t instanceof A ? t.requestId : "", a = t instanceof A ? t.traceId : "";
  return P({
    tag: "section",
    containerClass: `${ie} p-6 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: "Matrix unavailable",
    titleClass: de,
    heading: "The matrix payload could not be loaded.",
    headingTag: "h2",
    headingClass: "mt-2 text-xl font-semibold text-rose-900",
    message: t instanceof Error ? t.message : "Failed to load the translation matrix",
    messageClass: `${se} mt-3 leading-6`,
    metadata: e || a ? [e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • ") : "",
    metadataClass: "mt-3 text-xs uppercase tracking-[0.16em] text-rose-700",
    actionsHtml: `<div class="mt-4"><button type="button" data-matrix-retry="true" class="${oe}">Retry matrix</button></div>`,
    role: "alert",
    attributes: { "data-matrix-error": "true" }
  });
}
function He(t, e, a, r, s, o, n, c = !1, d = "/admin") {
  const g = Le(e), h = a == null ? r === "loading" ? De() : Fe(n) : a.data.rows.length === 0 ? Ne() : `${je(a, s, o, c)}<div class="grid gap-5">${Be(a)}${Oe(a, s)}</div>`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      <section class="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-sky-50 px-6 py-6 shadow-sm" data-matrix-hero="true">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" aria-label="Breadcrumb">
              <a class="hover:text-sky-700 hover:underline" href="${f(`${R(d || "/admin")}/translations`)}">Translations</a>
              <span class="px-2 text-gray-400">/</span>
              <span class="text-gray-600">${u(t)}</span>
            </nav>
            <p class="${re}">Translation Coverage</p>
            <h1 class="${J} mt-2">${u(t)}</h1>
            <p class="${ue} mt-3 max-w-3xl leading-6">Dense family-by-locale coverage with sticky headers, row pagination, locale windows, and quick actions for missing or in-flight work.</p>
          </div>
          ${g ? `<p class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${u(g)}</p>` : ""}
        </div>
      </section>
      ${ze(e, r === "loading" || c)}
      ${h}
    </div>
  `;
}
var Ue = class extends K {
  constructor(t) {
    super("loading"), this.root = null, this.payload = null, this.error = null, this.selection = w(), this.feedback = "", this.working = !1, this.handleSubmit = (a) => {
      const r = a.target;
      if (!(r instanceof HTMLFormElement) || r.dataset.matrixFilterForm !== "true") return;
      a.preventDefault();
      const s = new FormData(r);
      this.updateQuery({
        contentType: i(s.get("content_type")),
        readinessState: i(s.get("readiness_state")),
        blockerCode: i(s.get("blocker_code")),
        locales: H(i(s.get("locales"))),
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
        this.selection = Se(this.selection, s.dataset.matrixFamilyToggle || ""), this.render();
        return;
      }
      if (r.closest('[data-matrix-toggle-all-families="true"]') && this.payload) {
        this.selection = w({
          family_ids: this.selection.family_ids.length === this.payload.data.rows.length ? [] : this.payload.data.rows.map((h) => h.family_id),
          locales: this.selection.locales,
          bulk_actions: this.selection.bulk_actions
        }), this.render();
        return;
      }
      const o = r.closest("[data-matrix-locale-toggle]");
      if (o) {
        const h = o.dataset.matrixLocaleToggle || "", k = new Set(this.selection.locales);
        k.has(h) ? k.delete(h) : k.add(h), this.selection = Ae(this.selection, Array.from(k)), this.render();
        return;
      }
      const n = r.closest("[data-matrix-page]");
      if (n) {
        this.updateQuery({ page: (this.query.page ?? this.payload?.meta.page ?? 1) + (n.dataset.matrixPage === "next" ? 1 : -1) }), this.load();
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
        const h = g.dataset.familyId || "", k = g.dataset.locale || "";
        this.runCellAction(h, k);
      }
    }, this.handleKeydown = (a) => {
      const r = a.target;
      if (!(r instanceof HTMLElement) || r.dataset.matrixCellAction !== "true") return;
      const s = m(r.dataset.rowIndex, -1), o = m(r.dataset.colIndex, -1);
      if (s < 0 || o < 0 || !this.root) return;
      let n = s, c = o;
      switch (a.key) {
        case "ArrowRight":
          c += 1;
          break;
        case "ArrowLeft":
          c -= 1;
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
      const d = this.root.querySelector(`[data-matrix-cell-action="true"][data-row-index="${n}"][data-col-index="${c}"]`);
      d && (a.preventDefault(), d.focus());
    };
    const e = pe(t.basePath || "", t.endpoint);
    this.config = {
      ...t,
      basePath: e,
      title: t.title || "Translation Matrix"
    }, this.client = Me(this.config), this.query = Re();
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
      this.payload = t, this.selection = w({
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
    this.root && (this.root.innerHTML = He(this.config.title || "Translation Matrix", this.query, this.payload, this.state, this.selection, this.feedback, this.error, this.working, this.config.basePath));
  }
  updateQuery(t) {
    this.query = {
      ...this.query,
      ...t
    };
  }
  async runBulkAction(t) {
    if (!this.payload) return;
    const e = this.payload.meta.quick_action_targets, a = F(this.config.endpoint, t), r = e[t] ?? a;
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
    const a = this.payload.data.rows.find((s) => s.family_id === t)?.cells[e], r = a ? U(a) : null;
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
        const s = j({
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
function at(t, e = {}) {
  const a = i(e.endpoint) || i(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = `<section class="${q} p-6" data-matrix-empty="true"><p class="${L}">Configuration required</p><p class="${I} mt-2">Configure a matrix endpoint before initializing the translation matrix page.</p></section>`, null;
  const r = new Ue({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || i(t.dataset.title) || "Translation Matrix",
    basePath: e.basePath || i(t.dataset.basePath)
  });
  return r.mount(t), r;
}
export {
  Ue as TranslationMatrixPage,
  A as TranslationMatrixRequestError,
  Ee as buildTranslationMatrixBulkActionPayload,
  tt as buildTranslationMatrixLocalePolicyMetadata,
  Te as buildTranslationMatrixURL,
  Me as createTranslationMatrixClient,
  w as createTranslationMatrixSelectionState,
  at as initTranslationMatrixPage,
  Ce as isTranslationMatrixNotRequiredCell,
  $e as normalizeTranslationMatrixBulkActionResponse,
  be as normalizeTranslationMatrixCell,
  B as normalizeTranslationMatrixCellState,
  he as normalizeTranslationMatrixColumn,
  we as normalizeTranslationMatrixResponse,
  ye as normalizeTranslationMatrixRow,
  Ae as setTranslationMatrixSelectedLocales,
  Se as toggleTranslationMatrixFamilySelection
};

//# sourceMappingURL=index.js.map
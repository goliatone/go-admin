import { n as k } from "../chunks/index-Dvt9oAtQ.js";
import { a as m, e as f } from "../chunks/html-Br-oQr7i.js";
import { r as S } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as M } from "../toast/error-helpers.js";
function r(t) {
  return typeof t == "string" ? t.trim() : "";
}
function h(t) {
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
function p(t) {
  if (!Array.isArray(t))
    return [];
  const e = [];
  for (const a of t) {
    const s = r(a);
    s && !e.includes(s) && e.push(s);
  }
  return e;
}
function g(t) {
  return Array.isArray(t) ? t.map((e) => l(e)).filter((e) => Object.keys(e).length > 0) : [];
}
function O(t) {
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
function A(t) {
  const e = l(t);
  return {
    enabled: h(e.enabled),
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
function R(t) {
  const e = {};
  for (const [a, s] of Object.entries(l(t)))
    e[a] = A(s);
  return e;
}
function C(t) {
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
function j(t) {
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
function B(t) {
  const e = l(t);
  return {
    locale: r(e.locale),
    label: r(e.label) || r(e.locale).toUpperCase(),
    required_by_count: u(e.required_by_count),
    source_count: u(e.source_count),
    source_locale: h(e.source_locale),
    sticky: h(e.sticky)
  };
}
function F(t) {
  const e = l(t), a = r(e.id), s = r(e.locale);
  return !a && !s ? null : {
    id: a,
    locale: s,
    status: r(e.status),
    is_source: h(e.is_source),
    source_record_id: r(e.source_record_id)
  };
}
function D(t) {
  const e = l(t), a = r(e.id);
  return a ? {
    id: a,
    status: r(e.status),
    assignee_id: r(e.assignee_id),
    reviewer_id: r(e.reviewer_id),
    work_scope: r(e.work_scope)
  } : null;
}
function N(t) {
  const e = l(t), a = j(e.state);
  return {
    locale: r(e.locale),
    state: a,
    required: h(e.required),
    not_required: h(e.not_required) || a === "not_required",
    fallback: h(e.fallback) || a === "fallback",
    blocker_codes: p(e.blocker_codes),
    variant: F(e.variant),
    assignment: D(e.assignment),
    quick_actions: R(e.quick_actions)
  };
}
function Q(t) {
  const e = l(t), a = l(e.cells), s = {};
  for (const [o, i] of Object.entries(a))
    s[o] = N({ locale: o, ...l(i) });
  return {
    family_id: r(e.family_id),
    content_type: r(e.content_type),
    source_locale: r(e.source_locale),
    source_record_id: r(e.source_record_id),
    source_title: r(e.source_title),
    readiness_state: r(e.readiness_state),
    blocker_codes: p(e.blocker_codes),
    links: Object.fromEntries(
      Object.entries(l(e.links)).map(([o, i]) => [o, O(i)]).filter(([, o]) => o)
    ),
    cells: s
  };
}
function L(t) {
  const e = l(t), a = l(e.viewport_target);
  return {
    id: r(e.id),
    description: r(e.description),
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
    ui_route: r(e.ui_route),
    api_route: r(e.api_route),
    resolver_keys: p(e.resolver_keys)
  };
}
function z(t) {
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
      required_fields: p(n.required_fields),
      optional_fields: p(n.optional_fields),
      result_statuses: p(n.result_statuses),
      selection_required: h(n.selection_required)
    };
  }
  return {
    schema_version: u(e.schema_version),
    cell_states: p(e.cell_states).map((o) => j(o)),
    latency_target_ms: u(e.latency_target_ms),
    query_model: L(e.query_model),
    bulk_actions: s
  };
}
function U(t) {
  const e = l(t), a = l(e.bulk_actions), s = {};
  for (const [o, i] of Object.entries(a)) {
    const n = k(i);
    n && (s[o] = n);
  }
  return { bulk_actions: s };
}
function H(t) {
  const e = l(t), a = l(e.data), s = l(e.meta), o = g(a.columns).map(B), i = g(a.rows).map(Q), n = {};
  for (const [c, d] of Object.entries(l(s.quick_action_targets)))
    n[c] = C(d);
  return {
    data: {
      columns: o,
      rows: i,
      selection: U(a.selection)
    },
    meta: {
      environment: r(s.environment),
      page: u(s.page, 1),
      per_page: u(s.per_page, 25),
      total: u(s.total),
      total_locales: u(s.total_locales),
      locale_offset: u(s.locale_offset),
      locale_limit: u(s.locale_limit),
      has_more_locales: h(s.has_more_locales),
      latency_target_ms: u(s.latency_target_ms),
      query_model: L(s.query_model),
      contracts: z(s.contracts),
      scope: Object.fromEntries(
        Object.entries(l(s.scope)).map(([c, d]) => [c, r(d)])
      ),
      locale_policy: g(s.locale_policy).map((c) => {
        const d = l(c);
        return {
          locale: r(d.locale),
          label: r(d.label),
          sticky: h(d.sticky),
          source_locale: h(d.source_locale),
          required_by_count: u(d.required_by_count),
          optional_family_count: u(d.optional_family_count),
          not_required_family_ids: p(d.not_required_family_ids)
        };
      }),
      quick_action_targets: n
    }
  };
}
function V(t) {
  const e = l(t), a = r(e.status);
  return {
    family_id: r(e.family_id),
    content_type: r(e.content_type),
    source_record_id: r(e.source_record_id),
    requested_locales: p(e.requested_locales),
    status: a || "failed",
    created: g(e.created),
    skipped: g(e.skipped),
    failures: g(e.failures),
    exportable_locales: p(e.exportable_locales),
    estimated_rows: u(e.estimated_rows)
  };
}
function K(t) {
  const e = l(t), a = l(e.data), s = l(a.summary), o = {};
  for (const [n, c] of Object.entries(s))
    o[n] = u(c);
  return {
    data: {
      action: r(a.action) || "create_missing",
      summary: o,
      results: g(a.results).map(V),
      export_request: Object.keys(l(a.export_request)).length > 0 ? l(a.export_request) : void 0,
      preview_rows: g(a.preview_rows)
    },
    meta: {
      environment: r(l(e.meta).environment),
      contracts: z(l(e.meta).contracts)
    }
  };
}
function W(t, e = {}) {
  const a = new URL(t, "http://localhost");
  return e.environment && a.searchParams.set("environment", e.environment), e.tenantId && a.searchParams.set("tenant_id", e.tenantId), e.orgId && a.searchParams.set("org_id", e.orgId), e.familyId && a.searchParams.set("family_id", e.familyId), e.contentType && a.searchParams.set("content_type", e.contentType), e.readinessState && a.searchParams.set("readiness_state", e.readinessState), e.blockerCode && a.searchParams.set("blocker_code", e.blockerCode), e.locales && e.locales.length > 0 && a.searchParams.set("locales", e.locales.join(",")), typeof e.page == "number" && a.searchParams.set("page", String(e.page)), typeof e.perPage == "number" && a.searchParams.set("per_page", String(e.perPage)), typeof e.localeOffset == "number" && a.searchParams.set("locale_offset", String(e.localeOffset)), typeof e.localeLimit == "number" && a.searchParams.set("locale_limit", String(e.localeLimit)), `${a.pathname}${a.search}`;
}
function y(t = {}) {
  const e = p(t.family_ids), a = p(t.locales), s = {};
  for (const [o, i] of Object.entries(l(t.bulk_actions))) {
    const n = k(i);
    n && (s[o] = n);
  }
  return {
    family_ids: e,
    locales: a,
    bulk_actions: s
  };
}
function G(t, e) {
  const a = r(e);
  if (!a)
    return y(t);
  const s = new Set(t.family_ids);
  return s.has(a) ? s.delete(a) : s.add(a), {
    ...y(t),
    family_ids: Array.from(s).sort()
  };
}
function J(t, e) {
  return {
    ...y(t),
    locales: p(e)
  };
}
function X(t, e = {}) {
  return {
    family_ids: [...t.family_ids],
    locales: [...t.locales],
    ...e
  };
}
function Y(t) {
  return !!(t && t.state === "not_required");
}
function he(t) {
  return t.meta.locale_policy.length > 0 ? t.meta.locale_policy : t.data.columns.map((e) => {
    const a = [];
    for (const s of t.data.rows)
      Y(s.cells[e.locale]) && a.push(s.family_id);
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
class w extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationMatrixRequestError", this.status = e.status, this.code = e.code ?? null, this.requestId = e.requestId, this.traceId = e.traceId, this.metadata = e.metadata ?? null;
  }
}
function I(t) {
  return r(t);
}
function q(t, e) {
  return {
    endpoint: `${I(t).replace(/\/$/, "")}/actions/${e === "create_missing" ? "create-missing" : "export-selected"}`,
    method: "POST",
    route: `translations.matrix.actions.${e}`,
    resolver_key: `admin.api.translations.matrix.actions.${e}`,
    base_path: "",
    type: ""
  };
}
function Z(t) {
  const e = I(t.endpoint), a = t.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a)
    throw new Error("Fetch is not available for the translation matrix client.");
  return {
    async fetchMatrix(s = {}) {
      const o = W(e, s), i = await a(o, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!i.ok) {
        const n = await M(i);
        throw new w({
          message: n.message || await S(i, "Failed to load translation matrix"),
          status: i.status,
          code: n.textCode,
          requestId: i.headers.get("x-request-id") ?? void 0,
          traceId: i.headers.get("x-trace-id") ?? void 0,
          metadata: n.metadata
        });
      }
      return H(await i.json());
    },
    async runBulkAction(s, o) {
      const i = s ?? q(e, "create_missing"), n = r(i.endpoint);
      if (!n)
        throw new Error("Matrix bulk action endpoint is not configured.");
      const c = await a(n, {
        method: r(i.method) || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(o)
      });
      if (!c.ok) {
        const d = await M(c);
        throw new w({
          message: d.message || await S(c, "Matrix action failed"),
          status: c.status,
          code: d.textCode,
          requestId: c.headers.get("x-request-id") ?? void 0,
          traceId: c.headers.get("x-trace-id") ?? void 0,
          metadata: d.metadata
        });
      }
      return K(await c.json());
    }
  };
}
function $(t) {
  return r(t).replace(/[_-]+/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function E(t) {
  return t.split(",").map((e) => e.trim().toLowerCase()).filter((e, a, s) => e && s.indexOf(e) === a);
}
function ee() {
  if (!globalThis.location)
    return {};
  const t = new URLSearchParams(globalThis.location.search), e = E(t.get("locales") ?? t.get("locale") ?? "");
  return {
    environment: r(t.get("environment")),
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
function te(t) {
  return [
    t.environment ? `Env ${t.environment}` : "",
    t.tenantId ? `Tenant ${t.tenantId}` : "",
    t.orgId ? `Org ${t.orgId}` : ""
  ].filter(Boolean).join(" • ");
}
function ae(t, e, a = "Action") {
  const s = t.label || a, o = Object.entries(e).map(([c, d]) => `${f(c)}="${f(d)}"`).join(" "), i = t.reason || "Action unavailable";
  return `<button type="button" class="inline-flex min-h-[2.5rem] min-w-[6rem] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${t.enabled ? "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100" : "border-slate-200 bg-slate-100 text-slate-400"}" ${o} ${t.enabled ? "" : "disabled"} title="${f(t.enabled ? t.description || s : i)}">${m(s)}</button>`;
}
function se(t) {
  const e = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
    missing: "border-rose-200 bg-rose-50 text-rose-800",
    in_progress: "border-amber-200 bg-amber-50 text-amber-800",
    in_review: "border-indigo-200 bg-indigo-50 text-indigo-800",
    fallback: "border-orange-200 bg-orange-50 text-orange-800",
    not_required: "border-slate-200 bg-slate-100 text-slate-500"
  }[t.state], a = t.assignment?.status || t.variant?.status || $(t.state);
  return `
    <div class="flex items-center justify-between gap-2">
      <span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${f(e)}">${m($(t.state))}</span>
      <span class="truncate text-[11px] text-slate-500">${m($(a))}</span>
    </div>
  `;
}
function P(t) {
  return t.quick_actions.open?.enabled ? t.quick_actions.open : t.quick_actions.create ?? t.quick_actions.open ?? A({});
}
function re(t, e) {
  const a = t.data.columns, s = t.data.rows;
  return `
    <div class="overflow-x-auto rounded-[28px] border border-slate-200 bg-white shadow-sm" data-matrix-grid="true">
      <table class="min-w-full border-separate border-spacing-0">
        <thead class="sticky top-0 z-20 bg-white">
          <tr>
            <th scope="col" class="sticky left-0 z-30 border-b border-slate-200 bg-white px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" data-matrix-toggle-all-families="true" ${e.family_ids.length === s.length && s.length > 0 ? "checked" : ""}>
                <span>Families</span>
              </label>
            </th>
            ${a.map((o) => {
    const i = t.meta.locale_policy.find((c) => c.locale === o.locale), n = e.locales.includes(o.locale);
    return `
                <th scope="col" class="border-b border-slate-200 bg-white px-3 py-3 text-left align-top">
                  <button type="button" data-matrix-locale-toggle="${f(o.locale)}" class="flex w-full flex-col rounded-2xl border px-3 py-2 text-left transition ${n ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}">
                    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">${m(o.label)}</span>
                    <span class="mt-1 text-[11px] text-slate-500">${m(o.source_locale ? "Source locale" : `${i?.required_by_count ?? o.required_by_count} required families`)}</span>
                    <span class="mt-1 text-[11px] text-slate-400">${m(i && i.optional_family_count > 0 ? `${i.optional_family_count} optional` : "Header action")}</span>
                  </button>
                </th>
              `;
  }).join("")}
          </tr>
        </thead>
        <tbody>
          ${s.map((o, i) => `
            <tr data-matrix-row="${f(o.family_id)}">
              <th scope="row" class="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-4 text-left align-top">
                <div class="flex items-start gap-3">
                  <input type="checkbox" data-matrix-family-toggle="${f(o.family_id)}" ${e.family_ids.includes(o.family_id) ? "checked" : ""} class="mt-1">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a class="text-sm font-semibold text-slate-900 hover:text-sky-700 hover:underline" href="${f(o.links.family?.href || "#")}">${m(o.source_title || o.family_id)}</a>
                      <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">${m(o.content_type)}</span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500">${m(o.family_id)}</p>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      ${o.links.content_detail?.href ? `<a class="rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-slate-300 hover:text-slate-900" href="${f(o.links.content_detail.href)}">Source</a>` : ""}
                      ${o.links.content_edit?.href ? `<a class="rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-slate-300 hover:text-slate-900" href="${f(o.links.content_edit.href)}">Edit source</a>` : ""}
                    </div>
                  </div>
                </div>
              </th>
              ${a.map((n, c) => {
    const d = o.cells[n.locale], x = P(d);
    return `
                  <td class="border-b border-slate-200 px-3 py-3 align-top">
                    <div class="min-w-[10rem] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      ${se(d)}
                      <div class="mt-3">
                        ${ae(x, {
      "data-matrix-cell-action": "true",
      "data-family-id": o.family_id,
      "data-locale": n.locale,
      "data-row-index": String(i),
      "data-col-index": String(c),
      "data-action-kind": x.enabled && x.href ? "open" : "create"
    }, x.enabled && x.href ? "Open" : "Create")}
                      </div>
                      ${x.reason && !x.enabled ? `<p class="mt-2 text-[11px] leading-5 text-slate-400">${m(x.reason)}</p>` : ""}
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
function oe(t, e, a, s = !1) {
  const o = e.bulk_actions.create_missing ?? k(null), i = e.bulk_actions.export_selected ?? k(null), n = e.family_ids.length === 0, c = o?.enabled ? n ? "Select at least one family row." : "" : o?.reason || "Create missing is unavailable.", d = i?.enabled ? n ? "Select at least one family row." : "" : i?.reason || "Export selected is unavailable.";
  return `
    <section class="rounded-[28px] border border-slate-200 bg-slate-950 px-5 py-4 text-sm text-slate-100 shadow-sm" data-matrix-bulk-toolbar="true">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Bulk Actions</p>
          <p class="mt-2 text-sm text-slate-300">Selected families: <strong class="text-white">${m(String(e.family_ids.length))}</strong> · Selected locales: <strong class="text-white">${m(e.locales.length > 0 ? e.locales.join(", ") : "auto")}</strong></p>
          ${a ? `<p class="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-300" data-matrix-feedback="true">${m(a)}</p>` : ""}
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" data-matrix-bulk-action="create_missing" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!o?.enabled || n || s ? "cursor-not-allowed bg-white/10 text-slate-400" : "bg-sky-500 text-white hover:bg-sky-400"}" ${!o?.enabled || n || s ? "disabled" : ""} title="${f(c || "Create missing locale work")}">${m(s ? "Working…" : "Create Missing")}</button>
          <button type="button" data-matrix-bulk-action="export_selected" class="inline-flex items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${!i?.enabled || n || s ? "cursor-not-allowed bg-white/10 text-slate-400" : "bg-white text-slate-950 hover:bg-slate-100"}" ${!i?.enabled || n || s ? "disabled" : ""} title="${f(d || "Export selected locale work")}">${m(s ? "Working…" : "Export Selected")}</button>
        </div>
      </div>
    </section>
  `;
}
function ie(t) {
  const e = t.meta.page <= 1, a = t.meta.page * t.meta.per_page >= t.meta.total, s = t.meta.locale_offset <= 0, o = !t.meta.has_more_locales;
  return `
    <section class="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm" data-matrix-viewport="true">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Viewport</p>
          <p class="mt-2 text-sm text-slate-600">Rows ${m(String(t.data.rows.length))} of ${m(String(t.meta.total))} · Locales ${m(String(t.meta.locale_offset + 1))}-${m(String(Math.min(t.meta.locale_offset + t.meta.locale_limit, t.meta.total_locales)))} of ${m(String(t.meta.total_locales))}</p>
        </div>
        <div class="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
          <button type="button" data-matrix-page="prev" class="rounded-xl border border-slate-200 px-3 py-2 ${e ? "cursor-not-allowed text-slate-300" : "text-slate-700 hover:border-slate-300 hover:text-slate-950"}" ${e ? "disabled" : ""}>Prev families</button>
          <button type="button" data-matrix-page="next" class="rounded-xl border border-slate-200 px-3 py-2 ${a ? "cursor-not-allowed text-slate-300" : "text-slate-700 hover:border-slate-300 hover:text-slate-950"}" ${a ? "disabled" : ""}>Next families</button>
          <button type="button" data-matrix-locales="prev" class="rounded-xl border border-slate-200 px-3 py-2 ${s ? "cursor-not-allowed text-slate-300" : "text-slate-700 hover:border-slate-300 hover:text-slate-950"}" ${s ? "disabled" : ""}>Prev locales</button>
          <button type="button" data-matrix-locales="next" class="rounded-xl border border-slate-200 px-3 py-2 ${o ? "cursor-not-allowed text-slate-300" : "text-slate-700 hover:border-slate-300 hover:text-slate-950"}" ${o ? "disabled" : ""}>Next locales</button>
        </div>
      </div>
    </section>
  `;
}
function ne(t, e = !1) {
  return `
    <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm" data-matrix-filters="true">
      <form data-matrix-filter-form="true" class="grid gap-4 lg:grid-cols-5">
        <label class="text-sm text-slate-600">Content type
          <input name="content_type" value="${f(t.contentType || "")}" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" placeholder="pages, news">
        </label>
        <label class="text-sm text-slate-600">Readiness
          <select name="readiness_state" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900">
            <option value="">All</option>
            <option value="ready" ${t.readinessState === "ready" ? "selected" : ""}>Ready</option>
            <option value="blocked" ${t.readinessState === "blocked" ? "selected" : ""}>Blocked</option>
          </select>
        </label>
        <label class="text-sm text-slate-600">Blocker code
          <input name="blocker_code" value="${f(t.blockerCode || "")}" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" placeholder="missing_locale">
        </label>
        <label class="text-sm text-slate-600">Locales
          <input name="locales" value="${f((t.locales || []).join(", "))}" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" placeholder="fr, es">
        </label>
        <div class="flex items-end gap-3">
          <button type="submit" class="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" ${e ? "disabled" : ""}>${m(e ? "Loading…" : "Apply filters")}</button>
        </div>
      </form>
    </section>
  `;
}
function le() {
  return '<section class="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm" data-matrix-loading="true" role="status" aria-live="polite">Loading translation matrix…</section>';
}
function ce() {
  return '<section class="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 shadow-sm" data-matrix-empty="true" role="status" aria-live="polite"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">No rows</p><h2 class="mt-2 text-xl font-semibold text-slate-900">No families match this matrix scope.</h2><p class="mt-3 max-w-2xl leading-6">Adjust the filters, widen the locale window, or clear blocker constraints to inspect additional family coverage.</p></section>';
}
function de(t) {
  const e = t instanceof w ? t.requestId : "", a = t instanceof w ? t.traceId : "";
  return `
    <section class="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm" data-matrix-error="true" role="alert">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">Matrix unavailable</p>
      <h2 class="mt-2 text-xl font-semibold text-rose-900">The matrix payload could not be loaded.</h2>
      <p class="mt-3 leading-6">${m(t instanceof Error ? t.message : "Failed to load the translation matrix")}</p>
      ${e || a ? `<p class="mt-3 text-xs uppercase tracking-[0.16em] text-rose-700">${m([e ? `Request ${e}` : "", a ? `Trace ${a}` : ""].filter(Boolean).join(" • "))}</p>` : ""}
      <div class="mt-4">
        <button type="button" data-matrix-retry="true" class="inline-flex items-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800">Retry matrix</button>
      </div>
    </section>
  `;
}
function ue(t, e, a, s, o, i, n, c = !1) {
  const d = te(e), x = a == null ? s === "loading" ? le() : de(n) : a.data.rows.length === 0 ? ce() : `${oe(a, o, i, c)}<div class="grid gap-5">${ie(a)}${re(a, o)}</div>`;
  return `
    <div class="grid gap-5" data-translation-matrix="true">
      <section class="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 px-6 py-6 shadow-sm" data-matrix-hero="true">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Translation Coverage</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">${m(t)}</h1>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Dense family-by-locale coverage with sticky headers, row pagination, locale windows, and quick actions for missing or in-flight work.</p>
          </div>
          ${d ? `<p class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${m(d)}</p>` : ""}
        </div>
      </section>
      ${ne(e, s === "loading" || c)}
      ${x}
    </div>
  `;
}
class me {
  constructor(e) {
    this.root = null, this.payload = null, this.state = "loading", this.error = null, this.selection = y(), this.feedback = "", this.working = !1, this.handleSubmit = (a) => {
      const s = a.target;
      if (!(s instanceof HTMLFormElement) || s.dataset.matrixFilterForm !== "true")
        return;
      a.preventDefault();
      const o = new FormData(s);
      this.updateQuery({
        contentType: r(o.get("content_type")),
        readinessState: r(o.get("readiness_state")),
        blockerCode: r(o.get("blocker_code")),
        locales: E(r(o.get("locales"))),
        page: 1,
        localeOffset: 0
      }), this.load();
    }, this.handleClick = (a) => {
      const s = a.target;
      if (!(s instanceof HTMLElement))
        return;
      if (s.closest('[data-matrix-retry="true"]')) {
        this.load();
        return;
      }
      const i = s.closest("[data-matrix-family-toggle]");
      if (i) {
        this.selection = G(this.selection, i.dataset.matrixFamilyToggle || ""), this.render();
        return;
      }
      if (s.closest('[data-matrix-toggle-all-families="true"]') && this.payload) {
        this.selection = y({
          family_ids: this.selection.family_ids.length === this.payload.data.rows.length ? [] : this.payload.data.rows.map((b) => b.family_id),
          locales: this.selection.locales,
          bulk_actions: this.selection.bulk_actions
        }), this.render();
        return;
      }
      const c = s.closest("[data-matrix-locale-toggle]");
      if (c) {
        const b = c.dataset.matrixLocaleToggle || "", _ = new Set(this.selection.locales);
        _.has(b) ? _.delete(b) : _.add(b), this.selection = J(this.selection, Array.from(_)), this.render();
        return;
      }
      const d = s.closest("[data-matrix-page]");
      if (d) {
        this.updateQuery({
          page: (this.query.page ?? this.payload?.meta.page ?? 1) + (d.dataset.matrixPage === "next" ? 1 : -1)
        }), this.load();
        return;
      }
      const x = s.closest("[data-matrix-locales]");
      if (x && this.payload) {
        const b = x.dataset.matrixLocales === "next" ? 1 : -1;
        this.updateQuery({
          localeOffset: Math.max(0, (this.query.localeOffset ?? this.payload.meta.locale_offset ?? 0) + b * (this.query.localeLimit ?? this.payload.meta.locale_limit ?? 0))
        }), this.load();
        return;
      }
      const T = s.closest("[data-matrix-bulk-action]");
      if (T) {
        const b = T.dataset.matrixBulkAction;
        this.runBulkAction(b);
        return;
      }
      const v = s.closest('[data-matrix-cell-action="true"]');
      if (v) {
        const b = v.dataset.familyId || "", _ = v.dataset.locale || "";
        this.runCellAction(b, _);
      }
    }, this.handleKeydown = (a) => {
      const s = a.target;
      if (!(s instanceof HTMLElement) || s.dataset.matrixCellAction !== "true")
        return;
      const o = u(s.dataset.rowIndex, -1), i = u(s.dataset.colIndex, -1);
      if (o < 0 || i < 0 || !this.root)
        return;
      let n = o, c = i;
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
    }, this.config = {
      title: "Translation Matrix",
      ...e
    }, this.client = Z(this.config), this.query = ee();
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
    this.root && (this.root.innerHTML = ue(
      this.config.title || "Translation Matrix",
      this.query,
      this.payload,
      this.state,
      this.selection,
      this.feedback,
      this.error,
      this.working
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
    const a = this.payload.meta.quick_action_targets, s = q(this.config.endpoint, e), o = a[e] ?? s;
    this.working = !0, this.feedback = "", this.render();
    try {
      const n = (await this.client.runBulkAction(o, X(this.selection, {
        environment: this.query.environment
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
    const o = this.payload.data.rows.find((n) => n.family_id === e)?.cells[a], i = o ? P(o) : null;
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
        const n = C({
          endpoint: i.endpoint,
          method: i.method,
          route: i.route,
          resolver_key: i.resolver_key
        }), d = (await this.client.runBulkAction(n, i.payload)).data.summary.created ?? 0;
        this.feedback = `Created ${d} locale variant${d === 1 ? "" : "s"} for ${a.toUpperCase()}.`, await this.load();
      } catch (n) {
        this.feedback = n instanceof Error ? n.message : "Matrix action failed.", this.render();
      } finally {
        this.working = !1, this.render();
      }
    }
  }
}
function ge(t, e = {}) {
  const a = r(e.endpoint) || r(t.dataset.endpoint);
  if (!a)
    return t.innerHTML = '<section class="rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500" data-matrix-empty="true">Configure a matrix endpoint before initializing the translation matrix page.</section>', null;
  const s = new me({
    endpoint: a,
    fetch: e.fetch,
    title: e.title || r(t.dataset.title) || "Translation Matrix"
  });
  return s.mount(t), s;
}
export {
  me as TranslationMatrixPage,
  w as TranslationMatrixRequestError,
  X as buildTranslationMatrixBulkActionPayload,
  he as buildTranslationMatrixLocalePolicyMetadata,
  W as buildTranslationMatrixURL,
  Z as createTranslationMatrixClient,
  y as createTranslationMatrixSelectionState,
  ge as initTranslationMatrixPage,
  Y as isTranslationMatrixNotRequiredCell,
  K as normalizeTranslationMatrixBulkActionResponse,
  N as normalizeTranslationMatrixCell,
  j as normalizeTranslationMatrixCellState,
  B as normalizeTranslationMatrixColumn,
  H as normalizeTranslationMatrixResponse,
  Q as normalizeTranslationMatrixRow,
  J as setTranslationMatrixSelectedLocales,
  G as toggleTranslationMatrixFamilySelection
};
//# sourceMappingURL=index.js.map

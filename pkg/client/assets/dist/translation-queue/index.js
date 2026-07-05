import { escapeAttribute as c, escapeHTML as u } from "../shared/html.js";
import { httpRequest as T, readHTTPError as ye } from "../shared/transport/http-client.js";
import { extractStructuredError as be } from "../toast/error-helpers.js";
import { T as _e, Y as O, c as we, h as ke, i as qe, l as $e, o as G, t as xe, v as x, x as Se, y as Ae } from "../chunks/grouped-mode-BKMTJtyG.js";
import "../chunks/status-vocabulary-Bdx_bn1-.js";
import { buildEndpointURL as Re, getStringSearchParam as Ee, readLocationSearchParams as pe, setNumberSearchParam as ie, setSearchParam as _ } from "../shared/query-state/url-state.js";
import { StatefulController as Ie } from "../shared/stateful-controller.js";
import { a as Fe, n as Ce, r as Le, t as Pe } from "../chunks/entity-renderer-CM6Gdu_j.js";
import { t as Te } from "../chunks/searchbox-C75-stnC.js";
import { asNumber as g, asRecord as m, asString as n, asStringArray as se } from "../shared/coercion.js";
import { $ as R, A as Be, D as Me, E as je, G as De, J as ze, K as Oe, O as Ge, Q as Ne, R as Qe, S as b, T as Ue, X as E, Y as I, Z as He, _ as Ve, b as Ke, k as Ye, q as Xe, v as re } from "../chunks/translation-shared-Cy6-aSmF.js";
import { formatTranslationShortDateTime as N } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as L } from "../shared/record-normalization.js";
import { buildAssignmentActionURL as We, initAssignmentSSRRowActions as Je } from "../translation-actions/assignment-row-actions.js";
var Z, D = class extends Error {
  constructor(a) {
    super(a.message), this.name = "AssignmentQueueRequestError", this.status = a.status, this.code = a.code ?? null, this.metadata = a.metadata ?? null, this.requestId = a.requestId, this.traceId = a.traceId;
  }
}, A = [
  {
    id: "mine",
    label: "Mine",
    description: "Assignments currently assigned to the active actor.",
    query: {
      assignee_id: "__me__",
      sort: "due_date",
      order: "asc"
    }
  },
  {
    id: "open",
    label: "Open",
    description: "Claimable or active assignments that still need translator work.",
    query: {
      status: "open,assigned,in_progress,changes_requested",
      sort: "updated_at",
      order: "desc"
    }
  },
  {
    id: "needs_review",
    label: "Needs Review",
    description: "Assignments awaiting review for the active actor.",
    query: {
      status: "in_review",
      reviewer_id: "__me__",
      sort: "due_date",
      order: "asc"
    }
  },
  {
    id: "overdue",
    label: "Overdue",
    description: "Past-due assignments across the visible queue scope.",
    query: {
      due_state: "overdue",
      sort: "due_date",
      order: "asc"
    }
  },
  {
    id: "high_priority",
    label: "High Priority",
    description: "Assignments marked high or urgent.",
    query: {
      priority: "high,urgent",
      sort: "due_date",
      order: "asc"
    }
  }
], ee = [
  {
    id: "review_inbox",
    label: "Review Inbox",
    description: "Assignments currently waiting on the active reviewer.",
    query: {
      status: "in_review",
      reviewer_id: "__me__",
      sort: "due_date",
      order: "asc"
    }
  },
  {
    id: "review_overdue",
    label: "Review Overdue",
    description: "Reviewer-owned assignments that are already overdue.",
    query: {
      status: "in_review",
      reviewer_id: "__me__",
      due_state: "overdue",
      sort: "due_date",
      order: "asc"
    }
  },
  {
    id: "review_blocked",
    label: "QA Blocked",
    description: "Reviewer inbox items with blocking QA findings.",
    review_state: "qa_blocked",
    query: {
      status: "in_review",
      reviewer_id: "__me__",
      sort: "due_date",
      order: "asc"
    }
  },
  {
    id: "review_changes_requested",
    label: "Changes Requested",
    description: "Assignments the active reviewer already sent back for fixes.",
    query: {
      status: "changes_requested",
      reviewer_id: "__me__",
      sort: "updated_at",
      order: "desc"
    }
  }
];
function S(a) {
  const e = m(a);
  return {
    enabled: e.enabled === !0,
    reason: n(e.reason) || void 0,
    reason_code: n(e.reason_code) || void 0,
    permission: n(e.permission) || void 0
  };
}
function Ze(a) {
  const e = m(a), t = n(e.last_rejection_reason), i = n(e.last_reviewer_id);
  if (!(!t && !i))
    return {
      last_rejection_reason: t || void 0,
      last_reviewer_id: i || void 0
    };
}
function et(a) {
  const e = m(a), t = e.enabled === !0, i = g(e.warning_count), s = g(e.blocker_count), o = g(e.finding_count);
  if (!(!t && i <= 0 && s <= 0 && o <= 0))
    return {
      enabled: t,
      warning_count: i,
      blocker_count: s,
      finding_count: o
    };
}
function W(a) {
  switch (n(a)) {
    case "pending":
      return "open";
    case "review":
      return "in_review";
    case "rejected":
      return "changes_requested";
    case "published":
      return "archived";
    case "open":
    case "assigned":
    case "in_progress":
    case "in_review":
    case "changes_requested":
    case "approved":
    case "archived":
      return n(a);
    default:
      return "open";
  }
}
function Q(a, e) {
  const t = a.headers.get(e);
  return typeof t == "string" ? t.trim() : "";
}
function tt(a) {
  const e = Q(a, "x-request-id"), t = Q(a, "x-correlation-id"), i = Q(a, "x-trace-id") || t || void 0;
  return {
    requestId: e || void 0,
    traceId: i
  };
}
async function at(a, e) {
  return typeof a.clone == "function" ? be(a.clone()) : {
    textCode: null,
    message: await ye(a, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function B(a, e) {
  const t = await at(a, e), i = tt(a);
  return new D({
    message: t.message || `${e}: ${a.status}`,
    status: a.status,
    code: t.textCode,
    metadata: t.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function it(a) {
  const e = m(a), t = n(e.id), i = n(e.label);
  if (!t || !i) return null;
  const s = m(e.query);
  return {
    id: t,
    label: i,
    description: n(e.description) || void 0,
    review_state: n(e.review_state) || void 0,
    query: {
      status: n(s.status) || void 0,
      assignee_id: n(s.assignee_id) || void 0,
      reviewer_id: n(s.reviewer_id) || void 0,
      due_state: n(s.due_state) || void 0,
      locale: n(s.locale) || void 0,
      priority: n(s.priority) || void 0,
      entity_type: n(s.entity_type) || void 0,
      family_id: n(s.family_id) || void 0,
      sort: n(s.sort) || void 0,
      order: n(s.order) || void 0
    }
  };
}
function ne(a, e = A) {
  const t = (Array.isArray(a) ? a : []).map((i) => it(i)).filter((i) => i !== null);
  return t.length ? t : e.map(P);
}
function P(a) {
  return {
    id: a.id,
    label: a.label,
    description: a.description,
    review_state: a.review_state,
    query: { ...a.query }
  };
}
function st(a) {
  const e = m(a), t = n(e.value), i = n(e.label) || t;
  return t ? {
    value: t,
    label: i,
    description: n(e.description) || void 0
  } : null;
}
function rt(a) {
  const e = m(a), t = n(e.key || e.name), i = n(e.name || e.key);
  if (!t || !i) return null;
  const s = Array.isArray(e.options) ? e.options.map((r) => st(r)).filter((r) => r !== null) : [], o = n(e.renderer), l = n(e.fallback);
  return {
    key: t,
    name: i,
    label: n(e.label) || y(i),
    value: n(e.value),
    current_value: n(e.current_value || e.value),
    placeholder: n(e.placeholder),
    clear_url: n(e.clear_url) || void 0,
    type: n(e.type) || (s.length ? "select" : "text"),
    options: s,
    enhanced: e.enhanced === !0,
    endpoint_url: n(e.endpoint_url) || void 0,
    endpoint_search_param: n(e.endpoint_search_param) || void 0,
    endpoint_hydrate_param: n(e.endpoint_hydrate_param) || void 0,
    endpoint_value_field: n(e.endpoint_value_field) || void 0,
    endpoint_label_field: n(e.endpoint_label_field) || void 0,
    renderer: o || void 0,
    fallback: l || void 0
  };
}
function nt(a) {
  return (Array.isArray(a) ? a : []).map((e) => rt(e)).filter((e) => e !== null);
}
function F(a) {
  return Array.from(new Set(a.map((e) => n(e)).filter(Boolean)));
}
function ot(a, e) {
  const t = n(a[e.valueField] ?? a.value ?? a.id);
  return t ? {
    id: t,
    label: n(a[e.labelField] ?? a.label ?? a.name) || t,
    description: n(a.description) || void 0,
    icon: n(a.icon || a.avatar_url || a.avatar) || void 0,
    metadata: a,
    data: a
  } : null;
}
function me(a, e) {
  const t = m(a);
  return (Array.isArray(a) ? a : Array.isArray(t.data) ? t.data : Array.isArray(t.options) ? t.options : []).map((i) => ot(m(i), e)).filter((i) => i !== null);
}
function lt(a) {
  return a === "user" ? new Ce({
    avatarField: "avatar_url",
    emailField: "email",
    roleField: "role"
  }) : a === "entity" || a === "family" ? new Pe({
    showIcon: a === "entity",
    metadataFields: a === "family" ? ["entity_type"] : []
  }) : new Te();
}
function dt(a) {
  const e = n(a.dataset.filterName), t = n(a.dataset.filterEndpointUrl);
  if (!e || !t) return null;
  const i = n(a.dataset.filterRenderer), s = n(a.dataset.filterFallback);
  return {
    controlType: n(a.dataset.filterControlType) || "typeahead",
    name: e,
    endpointURL: t,
    searchParam: n(a.dataset.filterSearchParam) || "search",
    hydrateParam: n(a.dataset.filterHydrateParam) || "selected",
    valueField: n(a.dataset.filterValueField) || "value",
    labelField: n(a.dataset.filterLabelField) || "label",
    renderer: i || "simple",
    fallback: s || "raw"
  };
}
function U(a, e, t) {
  a.dispatchEvent(new CustomEvent("queue-filter-change", {
    bubbles: !0,
    detail: {
      name: e.name,
      value: t
    }
  }));
}
async function ct(a, e, t) {
  const i = e.value.trim();
  if (!i) return;
  const s = new URL(t.endpointURL, window.location.origin);
  s.searchParams.set(t.hydrateParam, i);
  try {
    const o = await fetch(s.toString(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!o.ok) throw new Error(`Hydration failed: ${o.status}`);
    const l = me(await o.json(), t).find((r) => r.id === i);
    if (!l || e.value.trim() !== i) return;
    e.value = l.id, a.value = l.label || l.id;
  } catch {
    a.dataset.filterEnhancedState = "error";
  }
}
function ut(a) {
  if (a.dataset.filterEnhancedInitialized === "true") return !1;
  const e = dt(a), t = a.querySelector('[data-filter-enhanced-input="true"]');
  if (!e || !t || !t.name) return !1;
  const i = document.createElement("input");
  i.type = "hidden", i.name = e.name, i.value = t.value, i.dataset.filterCanonicalInput = "true", t.removeAttribute("name"), t.dataset.filterDisplayInput = "true", t.setAttribute("aria-expanded", "false"), a.appendChild(i);
  const s = new Le({
    endpoint: e.endpointURL,
    queryParam: e.searchParam,
    params: e.controlType === "remote_select" ? { per_page: "25" } : { per_page: "10" },
    transform: (l) => me(l, e)
  });
  t.addEventListener("input", () => {
    i.value = t.value.trim(), t.dataset.filterEnhancedState = "";
  });
  const o = new Fe({
    input: t,
    container: a,
    resolver: s,
    renderer: lt(e.renderer),
    minChars: e.controlType === "remote_select" ? 0 : 1,
    debounceMs: 200,
    maxResults: e.controlType === "remote_select" ? 25 : 10,
    emptyText: "No matching options",
    loadingText: "Loading options...",
    onSelect: (l) => {
      i.value = l.id, t.dataset.filterEnhancedState = "selected", U(a, e, i.value);
    },
    onClear: () => {
      i.value = "", t.dataset.filterEnhancedState = "", U(a, e, "");
    },
    onError: () => {
      t.dataset.filterEnhancedState = "error";
    }
  });
  try {
    o.init();
  } catch {
    return i.remove(), t.name = e.name, delete t.dataset.filterDisplayInput, !1;
  }
  return t.addEventListener("focus", () => {
    e.controlType === "remote_select" && !t.value.trim() && o.search("");
  }), t.addEventListener("change", () => {
    t.dataset.filterEnhancedState !== "selected" && (i.value = t.value.trim(), U(a, e, i.value));
  }), a.dataset.filterEnhancedInitialized = "true", ct(t, i, e), !0;
}
function he(a) {
  return typeof document > "u" ? 0 : Array.from((a ?? document).querySelectorAll('[data-filter-enhanced="true"]')).reduce((t, i) => t + (ut(i) ? 1 : 0), 0);
}
function pt(a) {
  const e = m(a), t = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((s) => n(s)).filter((s) => !!s) : [], i = m(e.default_sort);
  return {
    page: g(e.page) || 1,
    per_page: g(e.per_page) || 25,
    total: g(e.total),
    updated_at: n(e.updated_at) || void 0,
    supported_sort_keys: t.length ? t : [
      "updated_at",
      "created_at",
      "due_date",
      "due_state",
      "status",
      "locale",
      "priority",
      "assignee_id",
      "reviewer_id"
    ],
    default_sort: {
      key: n(i.key) || "updated_at",
      order: n(i.order) || "desc"
    },
    saved_filter_presets: ne(e.saved_filter_presets, A),
    saved_review_filter_presets: ne(e.saved_review_filter_presets, ee),
    default_review_filter_preset: n(e.default_review_filter_preset) || void 0,
    enhanced_filter_selects: e.enhanced_filter_selects === !0,
    filter_controls: nt(e.filter_controls),
    review_actor_id: n(e.review_actor_id) || void 0,
    review_aggregate_counts: L(e.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    review_aggregate_counts_unavailable: se(e.review_aggregate_counts_unavailable),
    review_aggregate_counts_degraded: se(e.review_aggregate_counts_degraded),
    grouping: mt(e.grouping),
    family_total: g(e.family_total) || void 0,
    assignment_total: g(e.assignment_total) || void 0
  };
}
function mt(a) {
  const e = m(a);
  if (!e) return;
  const t = m(m(e.capabilities).server_family), i = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((s) => n(s)).filter((s) => !!s) : void 0;
  return {
    enabled: e.enabled === !0,
    mode: n(e.mode) || "family_id",
    group_by: n(e.group_by) || "family_id",
    scope: n(e.scope) || "current_page",
    row_count: g(e.row_count),
    group_count: g(e.group_count),
    assignment_count: g(e.assignment_count),
    family_total: g(e.family_total) || void 0,
    assignment_total: g(e.assignment_total) || void 0,
    supported_modes: Array.isArray(e.supported_modes) ? e.supported_modes.map((s) => n(s)).filter(Boolean) : ["family_id"],
    supported_sort_keys: i,
    strategy: n(e.strategy) || "page_local",
    capabilities: { server_family: {
      supported: t.supported === !0,
      reason_code: n(t.reason_code) || void 0
    } }
  };
}
function ht(a) {
  const e = m(a), t = Array.isArray(e.filter_summary) ? e.filter_summary : [];
  return {
    selectionScope: "filter_snapshot",
    snapshotId: n(e.snapshot_id),
    requested: g(e.requested),
    filters: m(e.filters),
    filterSummary: t.map((i) => n(i)).filter(Boolean),
    createdAt: n(e.created_at),
    expiresAt: n(e.expires_at)
  };
}
function oe(a) {
  const e = n(a).toLowerCase();
  return e === "low" || e === "normal" || e === "high" || e === "urgent" ? e : "";
}
function ft(a, e, t = {}) {
  return [
    "translation_queue_filter_snapshot",
    n(a),
    n(e),
    n(t.assigneeId),
    n(t.priority)
  ].join(":");
}
function gt(a = {}) {
  const e = new URLSearchParams();
  return _(e, "status", a.status), _(e, "assignee_id", a.assigneeId), _(e, "reviewer_id", a.reviewerId), _(e, "due_state", a.dueState), _(e, "locale", a.locale), _(e, "priority", a.priority), _(e, "entity_type", a.entityType), _(e, "review_state", a.reviewState), _(e, "family_id", a.familyId), ie(e, "page", a.page, { min: 1 }), ie(e, "per_page", a.perPage, { min: 1 }), _(e, "sort", a.sort), _(e, "order", a.order), _(e, "group_by", a.groupBy), _(e, "group_strategy", a.groupStrategy), e.toString();
}
function vt(a = {}) {
  const e = {}, t = (i, s) => {
    const o = n(s);
    o && (e[i] = o);
  };
  return t("status", a.status), t("assignee_id", a.assigneeId), t("reviewer_id", a.reviewerId), t("due_state", a.dueState), t("locale", a.locale), t("priority", a.priority), t("entity_type", a.entityType), t("review_state", a.reviewState), t("family_id", a.familyId), t("sort", a.sort), t("order", a.order), e;
}
function yt(a, e = {}) {
  const t = gt(e);
  return t ? Re(a, new URLSearchParams(t), { preserveAbsolute: !0 }) : a;
}
function q(a) {
  const e = m(a);
  return {
    id: n(e.id),
    family_id: n(e.family_id),
    entity_type: n(e.entity_type),
    source_record_id: n(e.source_record_id),
    target_record_id: n(e.target_record_id),
    source_locale: n(e.source_locale),
    target_locale: n(e.target_locale),
    work_scope: n(e.work_scope) || void 0,
    source_title: n(e.source_title),
    source_path: n(e.source_path),
    assignee_id: n(e.assignee_id),
    assignee_label: n(e.assignee_label) || void 0,
    reviewer_id: n(e.reviewer_id),
    reviewer_label: n(e.reviewer_label) || void 0,
    assignment_type: n(e.assignment_type),
    content_state: n(e.content_state),
    queue_state: W(e.queue_state),
    status: W(e.status),
    priority: n(e.priority) || "normal",
    due_state: n(e.due_state) || "none",
    due_date: n(e.due_date) || void 0,
    row_version: g(e.row_version || e.version),
    version: g(e.version || e.row_version),
    updated_at: n(e.updated_at),
    created_at: n(e.created_at),
    actions: {
      claim: S(m(e.actions).claim),
      release: S(m(e.actions).release)
    },
    review_actions: {
      submit_review: S(m(e.review_actions).submit_review),
      approve: S(m(e.review_actions).approve),
      reject: S(m(e.review_actions).reject),
      archive: S(m(e.review_actions).archive)
    },
    last_rejection_reason: n(e.last_rejection_reason) || void 0,
    review_feedback: Ze(e.review_feedback),
    qa_summary: et(e.qa_summary)
  };
}
function bt(a, e) {
  const t = m(a), i = m(t.expansion), s = m(i.params), o = n(t.family_id);
  return {
    id: n(t.id) || `family:${o}`,
    row_type: "family",
    family_id: o,
    family_label: n(t.family_label) || n(t.source_title) || o,
    entity_type: n(t.entity_type),
    source_record_id: n(t.source_record_id),
    source_locale: n(t.source_locale),
    source_title: n(t.source_title),
    source_path: n(t.source_path),
    assignment_count: g(t.assignment_count),
    locale_count: g(t.locale_count),
    target_locales: Array.isArray(t.target_locales) ? t.target_locales.map((l) => n(l)).filter(Boolean) : [],
    status_counts: L(t.status_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    due_state_counts: L(t.due_state_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    priority_counts: L(t.priority_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    family_blocker_count: t.family_blocker_count === null || t.family_blocker_count === void 0 ? null : g(t.family_blocker_count),
    family_blocker_count_available: t.family_blocker_count_available === !0,
    family_blocker_count_reason: n(t.family_blocker_count_reason),
    action_hints: L(t.action_hints, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    expansion: {
      href: n(i.href),
      route: n(i.route),
      params: Object.fromEntries(Object.entries(s).map(([l, r]) => [l, n(r)])),
      query: m(i.query)
    },
    expanded: e.has(o),
    children: []
  };
}
function _t(a) {
  const e = m(a), t = pt(e.meta), i = Array.isArray(e.data) ? e.data : [];
  return t.grouping?.enabled ? {
    data: i.filter((s) => !!s && typeof s == "object" && !Array.isArray(s)).map((s) => ({ ...s })),
    meta: t
  } : {
    data: i.map((s) => q(s)),
    meta: t
  };
}
async function wt(a) {
  const e = await T(a.href, { method: "GET" });
  if (!e.ok) throw await B(e, "Failed to load family assignments");
  const t = m(await e.json()), i = m(t.meta);
  return {
    rows: (Array.isArray(t.data) ? t.data : []).map((s) => q(s)),
    meta: {
      page: g(i.page) || 1,
      per_page: g(i.per_page) || 25,
      total: g(i.total),
      has_next: i.has_next === !0
    }
  };
}
function kt(a) {
  const e = m(a), t = m(e.meta), i = m(e.data);
  return {
    data: {
      assignment_id: n(i.assignment_id),
      status: W(i.status),
      row_version: g(i.row_version),
      updated_at: n(i.updated_at),
      assignment: q(i.assignment)
    },
    meta: { idempotency_hit: t.idempotency_hit === !0 }
  };
}
async function qt(a, e = {}) {
  const t = await T(yt(a, e), { method: "GET" });
  if (!t.ok) throw await B(t, "Failed to load assignments");
  return _t(await t.json());
}
async function te(a, e, t, i) {
  const s = { expected_version: i.expected_version };
  i.idempotency_key && (s.idempotency_key = i.idempotency_key), i.reason && (s.reason = i.reason), i.channel && (s.channel = i.channel);
  const o = await T(We(a, e, t), {
    method: "POST",
    json: s
  });
  if (!o.ok) throw await B(o, `Failed to ${t} assignment`);
  return kt(await o.json());
}
function $t(a, e, t) {
  return te(a, e, "claim", t);
}
function xt(a, e, t) {
  return te(a, e, "release", t);
}
function M(a) {
  return {
    status: a.query.status,
    assigneeId: a.query.assignee_id,
    reviewerId: a.query.reviewer_id,
    dueState: a.query.due_state,
    locale: a.query.locale,
    priority: a.query.priority,
    entityType: a.query.entity_type,
    reviewState: a.review_state,
    familyId: a.query.family_id,
    sort: a.query.sort,
    order: a.query.order,
    page: 1
  };
}
function le(a, e) {
  return `queue-${a}-${e.id}-${e.version}-${Date.now()}`;
}
function St(a, e) {
  return `queue-${a}-${e.id}-${e.version}-${Date.now()}`;
}
function At(a) {
  const e = n(a);
  if (!e) return null;
  const t = A.find((s) => s.id === e);
  if (t) return {
    kind: "standard",
    preset: t
  };
  const i = ee.find((s) => s.id === e);
  return i ? {
    kind: "review",
    preset: i
  } : null;
}
function w(a) {
  return {
    ...a,
    actions: {
      claim: { ...a.actions.claim },
      release: { ...a.actions.release }
    },
    review_actions: {
      submit_review: { ...a.review_actions.submit_review },
      approve: { ...a.review_actions.approve },
      reject: { ...a.review_actions.reject },
      archive: { ...a.review_actions.archive }
    },
    review_feedback: a.review_feedback ? { ...a.review_feedback } : void 0,
    qa_summary: a.qa_summary ? { ...a.qa_summary } : void 0
  };
}
function H(a, e) {
  return {
    enabled: !1,
    permission: a,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function Rt(a, e) {
  const t = w(a);
  return e === "claim" ? (t.queue_state = "in_progress", t.status = "in_progress", t.actions.claim = H(a.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), t.actions.release = {
    enabled: !0,
    permission: a.actions.release.permission
  }, t.review_actions.submit_review = {
    enabled: !0,
    permission: a.review_actions.submit_review.permission
  }, t) : (t.assignment_type = "open_pool", t.queue_state = "open", t.status = "open", t.assignee_id = "", t.actions.claim = {
    enabled: !0,
    permission: a.actions.claim.permission
  }, t.actions.release = H(a.actions.release.permission, "assignment must be assigned or in progress before it can be released"), t.review_actions.submit_review = H(a.review_actions.submit_review.permission, "assignment must be in progress"), t);
}
function C(a, e) {
  return a instanceof D ? {
    kind: a.code === "VERSION_CONFLICT" ? "conflict" : "error",
    message: a.message || e,
    code: a.code,
    requestId: a.requestId,
    traceId: a.traceId
  } : a instanceof Error ? {
    kind: "error",
    message: a.message || e
  } : {
    kind: "error",
    message: e
  };
}
function fe(a) {
  return n(a.queue_state || a.status);
}
function ge(a) {
  return a === "review" || a === "in_review";
}
function Et(a) {
  return ge(fe(a)) ? !0 : !!(a.review_actions.approve.enabled || a.review_actions.reject.enabled);
}
function It(a) {
  return !!a.review_actions.archive.enabled;
}
function V(a, e) {
  const t = [], i = e.has(`claim:${a.id}`), s = e.has(`release:${a.id}`), o = e.has(`approve:${a.id}`), l = e.has(`reject:${a.id}`), r = e.has(`archive:${a.id}`), d = a.actions.claim.enabled && !i;
  t.push({
    type: "claim",
    category: "lifecycle",
    label: i ? "Claiming…" : "Claim",
    enabled: d,
    disabledReason: a.actions.claim.reason || "Claim assignment",
    pending: i,
    pendingLabel: "Claiming assignment…",
    dataAction: "claim",
    ariaLabel: d ? "Claim assignment" : a.actions.claim.reason || "Cannot claim assignment",
    buttonClass: b
  });
  const p = a.actions.release.enabled && !s;
  if (t.push({
    type: "release",
    category: "lifecycle",
    label: s ? "Releasing…" : "Release",
    enabled: p,
    disabledReason: a.actions.release.reason || "Release assignment",
    pending: s,
    pendingLabel: "Releasing assignment…",
    dataAction: "release",
    ariaLabel: p ? "Release assignment" : a.actions.release.reason || "Cannot release assignment",
    buttonClass: b
  }), Et(a)) {
    const h = a.review_actions.approve.enabled && !o;
    t.push({
      type: "approve",
      category: "review",
      label: o ? "Approving…" : "Approve",
      enabled: h,
      disabledReason: a.review_actions.approve.reason || "Approve assignment",
      pending: o,
      pendingLabel: "Approving assignment…",
      dataAction: "approve",
      ariaLabel: h ? "Approve assignment" : a.review_actions.approve.reason || "Cannot approve assignment",
      buttonClass: Ke
    });
    const v = a.review_actions.reject.enabled && !l;
    t.push({
      type: "reject",
      category: "review",
      label: l ? "Rejecting…" : "Reject",
      enabled: v,
      disabledReason: a.review_actions.reject.reason || "Reject assignment",
      pending: l,
      pendingLabel: "Rejecting assignment…",
      dataAction: "reject",
      ariaLabel: v ? "Reject assignment" : a.review_actions.reject.reason || "Cannot reject assignment",
      buttonClass: Ve
    });
  }
  if (It(a)) {
    const h = a.review_actions.archive.enabled && !r;
    t.push({
      type: "archive",
      category: "management",
      label: r ? "Archiving…" : "Archive",
      enabled: h,
      disabledReason: a.review_actions.archive.reason || "Archive assignment",
      pending: r,
      pendingLabel: "Archiving assignment…",
      dataAction: "archive",
      ariaLabel: h ? "Archive assignment" : a.review_actions.archive.reason || "Cannot archive assignment",
      buttonClass: b
    });
  }
  return t;
}
function K(a, e) {
  if (ge(fe(e))) {
    const s = a.find((o) => o.category === "review" && o.enabled);
    if (s) return s;
  }
  const t = a.find((s) => s.type === "claim" && s.enabled);
  if (t) return t;
  const i = a.find((s) => s.enabled);
  return i || a[0];
}
function Y(a, e, t) {
  const i = (l) => l === "review" ? "review" : l === "management" ? "manage" : "lifecycle";
  if (e.length <= 2) return e.map((l) => `
      <button
        type="button"
        class="${l.buttonClass}"
        data-action="${c(l.dataAction)}"
        data-action-group="${c(i(l.category))}"
        data-assignment-id="${c(a.id)}"
        ${l.enabled ? "" : "disabled"}
        aria-disabled="${l.enabled ? "false" : "true"}"
        title="${c(l.pending ? l.pendingLabel : l.disabledReason)}"
      >
        ${u(l.label)}
      </button>
    `).join("");
  const s = e.filter((l) => l !== t), o = `menu-${a.id}`;
  return `
    <div class="queue-action-overflow-container">
      <button
        type="button"
        class="${t.buttonClass}"
        data-action="${c(t.dataAction)}"
        data-action-group="${c(i(t.category))}"
        data-assignment-id="${c(a.id)}"
        ${t.enabled ? "" : "disabled"}
        aria-disabled="${t.enabled ? "false" : "true"}"
        title="${c(t.pending ? t.pendingLabel : t.disabledReason)}"
      >
        ${u(t.label)}
      </button>
      <button
        type="button"
        class="queue-action-overflow-trigger"
        data-overflow-menu="${c(a.id)}"
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded="false"
      >
        ⋮
      </button>
      <div
        class="queue-action-overflow-menu"
        id="${c(o)}"
        role="menu"
        hidden
      >
        ${s.map((l) => `
          <button
            type="button"
            role="menuitem"
            class="queue-action-menu-item"
            data-action="${c(l.dataAction)}"
            data-action-group="${c(i(l.category))}"
            data-assignment-id="${c(a.id)}"
            ${l.enabled ? "" : "disabled"}
            aria-disabled="${l.enabled ? "false" : "true"}"
            title="${c(l.pending ? l.pendingLabel : l.disabledReason)}"
          >
            ${u(l.label)}
            ${l.pending ? `<span class="action-pending-label">${u(l.pendingLabel)}</span>` : ""}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}
function de(a, e) {
  const t = a.target;
  return !!(t && t !== e && t.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"]'));
}
var ve = class k extends Ie {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.selectedRows = /* @__PURE__ */ new Map(), this.bulkActionPending = !1, this.bulkSnapshotPending = !1, this.filterSnapshot = null, this.viewMode = "flat", this.groupedData = null, this.serverFamilyRows = [], this.expandedGroups = /* @__PURE__ */ new Set(), this.filtersExpanded = !1;
    const t = n(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      bulkActionEndpoint: e.bulkActionEndpoint || ce(e.endpoint),
      bulkSnapshotEndpoint: e.bulkSnapshotEndpoint || ue(e.endpoint),
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const i = At(t);
    if (i?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = i.preset.id, this.activeReviewState = i.preset.review_state || null, this.queryState = M(i.preset);
      return;
    }
    const s = i?.preset || A[1] || A[0];
    this.activePresetId = s?.id || "open", this.queryState = s ? M(s) : {
      sort: "updated_at",
      order: "desc",
      page: 1
    };
    const o = $e(k.PANEL_ID);
    o && (this.viewMode = o, this.viewMode === "grouped" ? this.queryState.groupBy = "family_id" : this.viewMode === "server_family" && (this.queryState.groupBy = "family_id", this.queryState.groupStrategy = "server_family")), this.expandedGroups = we(k.PANEL_ID);
  }
  mount(e) {
    this.container = e, this.loadFiltersExpandedState(), this.render(), this.load();
  }
  unmount() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
  getData() {
    return this.response;
  }
  getRows() {
    return this.rows.map((e) => w(e));
  }
  getFeedback() {
    return this.feedback ? { ...this.feedback } : null;
  }
  getActivePresetId() {
    return this.activePresetId;
  }
  getActiveReviewPresetId() {
    return this.activeReviewPresetId;
  }
  getSelectedCount() {
    return this.selectedRows.size;
  }
  getSelectedIds() {
    return Array.from(this.selectedRows.keys());
  }
  isRowSelected(e) {
    return this.selectedRows.has(e);
  }
  isAllPageSelected() {
    return this.rows.length === 0 ? !1 : this.rows.every((e) => this.selectedRows.has(e.id));
  }
  toggleRowSelection(e) {
    const t = this.rows.find((i) => i.id === e);
    t && (this.filterSnapshot = null, this.selectedRows.has(e) ? this.selectedRows.delete(e) : this.selectedRows.set(e, {
      assignmentId: t.id,
      expectedVersion: t.version
    }), this.render());
  }
  selectAllPage() {
    this.filterSnapshot = null;
    for (const e of this.rows) this.selectedRows.set(e.id, {
      assignmentId: e.id,
      expectedVersion: e.version
    });
    this.render();
  }
  clearSelection() {
    this.selectedRows.clear(), this.filterSnapshot = null, this.render();
  }
  replaceCachedRow(e) {
    for (const t of this.serverFamilyRows) {
      const i = t.children.findIndex((s) => s.id === e.id);
      i >= 0 && (t.children[i] = w(e));
    }
  }
  async selectAllMatchingFilters() {
    this.bulkSnapshotPending = !0, this.feedback = null, this.render();
    try {
      const e = await T(this.config.bulkSnapshotEndpoint || ue(this.config.endpoint), {
        method: "POST",
        json: { filters: vt(this.queryState) }
      });
      if (!e.ok) throw await B(e, "Filter snapshot failed");
      const t = ht(m(m(await e.json()).data));
      if (!t.snapshotId) throw new D({
        message: "Filter snapshot response did not include a snapshot id.",
        status: 500,
        code: "INVALID_SNAPSHOT_RESPONSE"
      });
      this.selectedRows.clear(), this.filterSnapshot = t, this.feedback = {
        kind: "success",
        message: `${t.requested} matching assignment${t.requested !== 1 ? "s" : ""} selected.`
      };
    } catch (e) {
      this.feedback = C(e, "Filter snapshot failed.");
    } finally {
      this.bulkSnapshotPending = !1, this.render();
    }
  }
  async runBulkAction(e, t) {
    if (this.selectedRows.size === 0) {
      this.feedback = {
        kind: "error",
        message: "No assignments selected."
      }, this.render();
      return;
    }
    const i = Array.from(this.selectedRows.values());
    this.bulkActionPending = !0, this.feedback = null, this.render();
    try {
      const s = await this.executeBulkAction({
        action: e,
        assignments: i,
        reason: t?.reason,
        priority: t?.priority
      });
      for (const o of s.data.results) if (o.success && o.assignment) {
        const l = this.rows.findIndex((r) => r.id === o.assignmentId);
        l >= 0 && (this.rows[l] = w(o.assignment)), this.selectedRows.delete(o.assignmentId);
      }
      if (s.data.failed > 0) {
        const o = s.data.results.filter((l) => !l.success).map((l) => l.assignmentId).slice(0, 3);
        this.feedback = {
          kind: "error",
          message: `${s.data.succeeded} succeeded, ${s.data.failed} failed. Failed: ${o.join(", ")}${s.data.failed > 3 ? "..." : ""}`
        };
      } else this.feedback = {
        kind: "success",
        message: `${s.data.succeeded} assignment${s.data.succeeded !== 1 ? "s" : ""} updated.`
      };
    } catch (s) {
      this.feedback = C(s, `Bulk ${e} failed.`);
    } finally {
      this.bulkActionPending = !1, this.render();
    }
  }
  async runFilterSnapshotBulkAction(e, t) {
    const i = this.filterSnapshot;
    if (!i) {
      this.feedback = {
        kind: "error",
        message: "No filter snapshot selected."
      }, this.render();
      return;
    }
    const s = t || this.promptFilterSnapshotActionOptions(e);
    if (s === null) return;
    const o = i.filterSummary || [], l = o.length ? `

${o.join(`
`)}` : "";
    if (typeof window > "u" || typeof window.confirm != "function" || window.confirm(`Apply ${e} to ${i.requested} matching assignment${i.requested !== 1 ? "s" : ""}?${l}`)) {
      this.bulkActionPending = !0, this.feedback = null, this.render();
      try {
        const r = await this.executeBulkAction({
          action: e,
          selectionScope: "filter_snapshot",
          snapshotId: i.snapshotId,
          assigneeId: s.assigneeId,
          priority: s.priority,
          idempotencyKey: ft(i.snapshotId, e, s)
        });
        r.data.failed > 0 ? this.feedback = {
          kind: "error",
          message: `${r.data.succeeded} succeeded, ${r.data.failed} failed.`
        } : this.feedback = {
          kind: "success",
          message: `${r.data.succeeded} assignment${r.data.succeeded !== 1 ? "s" : ""} updated.`
        }, this.filterSnapshot = null, this.selectedRows.clear(), await this.load();
      } catch (r) {
        this.feedback = C(r, `Bulk ${e} failed.`);
      } finally {
        this.bulkActionPending = !1, this.render();
      }
    }
  }
  promptFilterSnapshotActionOptions(e) {
    if (e === "assign") {
      const t = this.queryState.assigneeId && this.queryState.assigneeId !== "__me__" ? this.queryState.assigneeId : "", i = n(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Assign matching assignments to", t));
      return i ? { assigneeId: i } : null;
    }
    if (e === "priority") {
      const t = oe(this.queryState.priority || "normal"), i = oe(n(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Set matching assignments priority", t)));
      return i ? { priority: i } : (this.feedback = {
        kind: "error",
        message: "Priority must be low, normal, high, or urgent."
      }, this.render(), null);
    }
    return {};
  }
  async executeBulkAction(e) {
    const t = await T(this.config.bulkActionEndpoint || ce(this.config.endpoint), {
      method: "POST",
      json: {
        action: e.action,
        selection_scope: e.selectionScope || "current_page",
        snapshot_id: e.snapshotId,
        idempotency_key: e.idempotencyKey,
        assignments: (e.assignments || []).map((f) => ({
          assignment_id: f.assignmentId,
          expected_version: f.expectedVersion
        })),
        assignee_id: e.assigneeId,
        reason: e.reason,
        priority: e.priority
      }
    });
    if (!t.ok) throw await B(t, `Bulk ${e.action} failed`);
    const i = m(await t.json()), s = m(i.data), o = m(i.meta), l = Array.isArray(s.results) ? s.results : [], r = g(o.requested), d = g(o.succeeded), p = g(o.failed), h = o.partial === !0, v = n(o.selection_scope) || "current_page";
    return {
      data: {
        action: n(s.action) || e.action,
        requested: r,
        succeeded: d,
        failed: p,
        partial: h,
        selectionScope: v,
        results: l.map((f) => {
          const $ = m(f), ae = m($.error);
          return {
            assignmentId: n($.assignment_id),
            success: n($.status) === "succeeded",
            error: n(ae.message) || n($.error) || void 0,
            errorCode: n(ae.code) || n($.error_code) || void 0,
            assignment: $.assignment ? q($.assignment) : void 0
          };
        })
      },
      meta: {
        action: n(s.action) || e.action,
        requested: r,
        succeeded: d,
        failed: p,
        partial: h,
        selection_scope: v
      }
    };
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await qt(this.config.endpoint, this.queryState);
      if (this.response = e, this.viewMode === "server_family" && e.meta.grouping?.strategy === "server_family") {
        this.groupedData = null, this.serverFamilyRows = e.data.map((t) => bt(t, this.expandedGroups)), this.rows = this.serverFamilyRows.flatMap((t) => t.children.map((i) => w(i))), this.state = this.serverFamilyRows.length ? "ready" : "empty", this.render();
        return;
      }
      if (this.serverFamilyRows = [], this.viewMode === "grouped" && e.meta.grouping?.enabled) {
        const t = ke(e.data, {
          defaultExpanded: !0,
          expandMode: "explicit",
          expandedGroups: this.expandedGroups
        });
        if (t) {
          this.groupedData = t, this.rows = [];
          for (const i of t.groups) for (const s of i.records) this.rows.push(q(s));
          for (const i of t.ungrouped) this.rows.push(q(i));
        } else
          this.groupedData = null, this.rows = e.data.map((i) => w(i));
      } else
        this.groupedData = null, this.rows = e.data.map((t) => w(t));
      this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof D && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  getViewMode() {
    return this.viewMode;
  }
  setViewMode(e) {
    if (this.viewMode !== e) {
      if (this.viewMode = e, Ae(k.PANEL_ID, e), e === "grouped") {
        const { groupStrategy: t, ...i } = this.queryState;
        this.queryState = {
          ...i,
          groupBy: "family_id"
        };
      } else if (e === "server_family") {
        const t = this.queryState.sort && [
          "updated_at",
          "created_at",
          "due_date",
          "due_state",
          "priority"
        ].includes(this.queryState.sort) ? this.queryState.sort : "updated_at";
        this.queryState = {
          ...this.queryState,
          groupBy: "family_id",
          groupStrategy: "server_family",
          sort: t,
          perPage: Math.min(this.queryState.perPage || 25, 100)
        };
      } else {
        const { groupBy: t, groupStrategy: i, ...s } = this.queryState;
        this.queryState = s;
      }
      this.feedback = null, this.clearSelection(), this.load();
    }
  }
  toggleGroupExpansion(e) {
    if (this.viewMode === "server_family") {
      this.toggleServerFamilyExpansion(e);
      return;
    }
    this.groupedData && (this.groupedData = _e(this.groupedData, e), this.expandedGroups = G(this.groupedData), x(k.PANEL_ID, this.expandedGroups), this.render());
  }
  async toggleServerFamilyExpansion(e) {
    const t = this.serverFamilyRows.find((i) => i.family_id === e);
    if (t) {
      if (t.expanded = !t.expanded, t.expanded ? this.expandedGroups.add(e) : this.expandedGroups.delete(e), x(k.PANEL_ID, this.expandedGroups), !t.expanded || t.children.length || t.loading) {
        this.rows = this.serverFamilyRows.flatMap((i) => i.children.map((s) => w(s))), this.render();
        return;
      }
      t.loading = !0, t.error = "", this.render();
      try {
        const i = await wt(t.expansion);
        t.children = i.rows, t.childMeta = i.meta, this.rows = this.serverFamilyRows.flatMap((s) => s.children.map((o) => w(o)));
      } catch (i) {
        t.error = i instanceof Error ? i.message : "Failed to load family assignments.";
      } finally {
        t.loading = !1, this.render();
      }
    }
  }
  expandAllFamilyGroups() {
    if (this.viewMode === "server_family") {
      for (const e of this.serverFamilyRows)
        this.expandedGroups.add(e.family_id), e.expanded = !0;
      x(k.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = qe(this.groupedData), this.expandedGroups = G(this.groupedData), x(k.PANEL_ID, this.expandedGroups), this.render());
  }
  collapseAllFamilyGroups() {
    if (this.viewMode === "server_family") {
      this.expandedGroups.clear();
      for (const e of this.serverFamilyRows) e.expanded = !1;
      x(k.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = xe(this.groupedData), this.expandedGroups = G(this.groupedData), x(k.PANEL_ID, this.expandedGroups), this.render());
  }
  async runInlineAction(e, t) {
    const i = this.rows.findIndex((d) => d.id === t);
    if (i < 0) return;
    const s = this.rows[i], o = s.actions[e];
    if (!o.enabled) {
      this.feedback = {
        kind: o.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: o.reason || `Cannot ${e} this assignment.`,
        code: o.reason_code || null
      }, this.render();
      return;
    }
    const l = w(s), r = `${e}:${t}`;
    this.pendingActions.add(r), this.feedback = null, this.rows[i] = Rt(s, e), this.replaceCachedRow(this.rows[i]), this.render();
    try {
      const d = e === "claim" ? await $t(this.config.endpoint, t, {
        expected_version: l.version,
        idempotency_key: le("claim", l)
      }) : await xt(this.config.endpoint, t, {
        expected_version: l.version,
        idempotency_key: le("release", l)
      });
      this.rows[i] = w(d.data.assignment), this.replaceCachedRow(this.rows[i]), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (d) {
      this.rows[i] = l, this.replaceCachedRow(l), this.feedback = C(d, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(r), this.render();
    }
  }
  async runReviewAction(e, t) {
    const i = this.rows.findIndex((d) => d.id === t);
    if (i < 0) return;
    const s = this.rows[i], o = s.review_actions[e];
    if (!o?.enabled) {
      this.feedback = {
        kind: o?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: o?.reason || `Cannot ${e} this assignment.`,
        code: o?.reason_code || null
      }, this.render();
      return;
    }
    const l = {
      expected_version: s.version,
      idempotency_key: St(e, s)
    };
    if (e === "reject") {
      const d = typeof window < "u" ? window.prompt("Reject reason") : "";
      if (!d || !d.trim()) {
        this.feedback = {
          kind: "error",
          message: "Reject reason is required.",
          code: "VALIDATION_ERROR"
        }, this.render();
        return;
      }
      l.reason = d.trim();
    }
    const r = `${e}:${t}`;
    this.pendingActions.add(r), this.feedback = null, this.render();
    try {
      const d = await te(this.config.endpoint, t, e, l);
      this.rows[i] = w(d.data.assignment), this.replaceCachedRow(this.rows[i]), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (d) {
      this.feedback = C(d, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(r), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((i) => i.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = M(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((i) => i.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = M(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load();
  }
  updateNamedFilter(e, t) {
    const i = t.trim();
    switch (e) {
      case "status":
        this.updateFilter({ status: i || void 0 });
        break;
      case "due_state":
        this.updateFilter({ dueState: i || void 0 });
        break;
      case "priority":
        this.updateFilter({ priority: i || void 0 });
        break;
      case "entity_type":
        this.updateFilter({ entityType: i || void 0 });
        break;
      case "locale":
        this.updateFilter({ locale: i || void 0 });
        break;
      case "assignee_id":
        this.updateFilter({ assigneeId: i || void 0 });
        break;
      case "reviewer_id":
        this.updateFilter({ reviewerId: i || void 0 });
        break;
      case "family_id":
        this.updateFilter({ familyId: i || void 0 });
        break;
      case "sort":
        this.updateFilter({ sort: i || void 0 });
        break;
      case "order":
        this.updateFilter({ order: i || void 0 });
        break;
    }
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(P) : A.map(P);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(P) : ee.map(P);
  }
  get visibleRows() {
    return this.rows;
  }
  getActiveFilterCount() {
    let e = 0;
    return this.queryState.status && e++, this.queryState.dueState && e++, this.queryState.priority && e++, this.queryState.entityType && e++, this.queryState.locale && e++, this.queryState.assigneeId && e++, this.queryState.reviewerId && e++, this.queryState.familyId && e++, this.activeReviewState && e++, this.queryState.sort && this.queryState.sort !== (this.response?.meta.default_sort.key ?? "updated_at") && e++, this.queryState.order && this.queryState.order !== (this.response?.meta.default_sort.order ?? "desc") && e++, e;
  }
  removeFilter(e) {
    const t = {};
    switch (e) {
      case "status":
        t.status = void 0;
        break;
      case "due_state":
        t.dueState = void 0;
        break;
      case "priority":
        t.priority = void 0;
        break;
      case "entity_type":
        t.entityType = void 0;
        break;
      case "locale":
        t.locale = void 0;
        break;
      case "assignee_id":
        t.assigneeId = void 0;
        break;
      case "reviewer_id":
        t.reviewerId = void 0;
        break;
      case "family_id":
        t.familyId = void 0;
        break;
      case "sort":
        t.sort = void 0;
        break;
      case "order":
        t.order = void 0;
        break;
    }
    this.updateFilter(t);
  }
  renderFilterChips() {
    const e = [];
    return this.queryState.status && e.push({
      name: "status",
      label: "Status",
      value: y(this.queryState.status)
    }), this.queryState.dueState && e.push({
      name: "due_state",
      label: "Due State",
      value: y(this.queryState.dueState)
    }), this.queryState.priority && e.push({
      name: "priority",
      label: "Priority",
      value: y(this.queryState.priority)
    }), this.queryState.entityType && e.push({
      name: "entity_type",
      label: "Type",
      value: y(this.queryState.entityType)
    }), this.queryState.locale && e.push({
      name: "locale",
      label: "Locale",
      value: this.queryState.locale
    }), this.queryState.assigneeId && e.push({
      name: "assignee_id",
      label: "Assignee",
      value: this.queryState.assigneeId
    }), this.queryState.reviewerId && e.push({
      name: "reviewer_id",
      label: "Reviewer",
      value: this.queryState.reviewerId
    }), this.queryState.familyId && e.push({
      name: "family_id",
      label: "Family",
      value: this.queryState.familyId
    }), this.activeReviewState && e.push({
      name: "review_state",
      label: "Review State",
      value: y(this.activeReviewState)
    }), this.queryState.sort && this.queryState.sort !== (this.response?.meta.default_sort.key ?? "updated_at") && e.push({
      name: "sort",
      label: "Sort",
      value: y(this.queryState.sort)
    }), this.queryState.order && this.queryState.order !== (this.response?.meta.default_sort.order ?? "desc") && e.push({
      name: "order",
      label: "Order",
      value: this.queryState.order === "asc" ? "Ascending" : "Descending"
    }), e.length === 0 ? "" : `
      <div class="queue-filter-chips-container">
        <div class="queue-filter-chips">
          ${e.map((t) => `
            <button
              type="button"
              class="queue-filter-chip"
              data-remove-filter="${c(t.name)}"
              aria-label="${c(`Remove ${t.label} filter: ${t.value}`)}"
              title="${c(`Remove ${t.label}: ${t.value}`)}"
            >
              <span class="queue-filter-chip-label">${u(t.label)}:</span>
              <span class="queue-filter-chip-value">${u(t.value)}</span>
              <svg class="queue-filter-chip-remove" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          `).join("")}
          <button
            type="button"
            class="queue-filter-chip queue-filter-chip-clear-all"
            data-clear-filters="true"
            aria-label="Clear all filters"
            title="Clear all filters"
          >
            <span>Clear all</span>
          </button>
        </div>
      </div>
    `;
  }
  toggleFiltersExpanded() {
    this.filtersExpanded = !this.filtersExpanded, this.persistFiltersExpanded(), this.render();
  }
  toggleReviewSelectorDropdown() {
    const e = this.container?.querySelector("[data-review-selector-menu]"), t = this.container?.querySelector("[data-review-selector-toggle]"), i = this.container?.querySelector("[data-review-selector-chevron]");
    if (!(!e || !t))
      if (e.classList.contains("hidden")) {
        e.classList.remove("hidden"), t.setAttribute("aria-expanded", "true"), i && i.classList.add("rotate-180");
        const s = (l) => {
          const r = l.target, d = this.container?.querySelector("[data-review-selector-container]");
          d && !d.contains(r) && (this.closeReviewSelectorDropdown(), document.removeEventListener("click", s));
        }, o = (l) => {
          l.key === "Escape" && (this.closeReviewSelectorDropdown(), document.removeEventListener("keydown", o), t.focus());
        };
        setTimeout(() => {
          document.addEventListener("click", s), document.addEventListener("keydown", o);
        }, 0);
      } else this.closeReviewSelectorDropdown();
  }
  closeReviewSelectorDropdown() {
    const e = this.container?.querySelector("[data-review-selector-menu]"), t = this.container?.querySelector("[data-review-selector-toggle]"), i = this.container?.querySelector("[data-review-selector-chevron]");
    e && (e.classList.add("hidden"), t && t.setAttribute("aria-expanded", "false"), i && i.classList.remove("rotate-180"));
  }
  persistFiltersExpanded() {
    try {
      localStorage.setItem(k.FILTERS_STORAGE_KEY, this.filtersExpanded ? "true" : "false");
    } catch {
    }
  }
  loadFiltersExpandedState() {
    try {
      this.filtersExpanded = localStorage.getItem(k.FILTERS_STORAGE_KEY) === "true";
    } catch {
      this.filtersExpanded = !1;
    }
  }
  clearAllFilters() {
    this.queryState = {
      ...this.queryState,
      status: void 0,
      dueState: void 0,
      priority: void 0,
      entityType: void 0,
      locale: void 0,
      assigneeId: void 0,
      reviewerId: void 0,
      familyId: void 0,
      sort: void 0,
      order: void 0,
      page: 1
    }, this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.filterSnapshot = null, this.selectedRows.clear(), this.load();
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        ${this.renderFeedback()}
        ${this.renderBulkActionBar()}
        ${this.renderFilterSnapshotBar()}
        ${this.renderReviewStateBar()}
        ${this.renderPresetBar()}
        ${this.renderFilters()}
        ${this.renderContextBar()}
        ${this.renderBody()}
      </div>
    `, this.attachEventListeners());
  }
  renderFeedback() {
    if (!this.feedback) return "";
    const e = this.feedback.kind === "success" ? "feedback-success" : this.feedback.kind === "conflict" ? "feedback-conflict" : "feedback-error", t = [
      this.feedback.code ? `Code ${u(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${u(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${u(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${c(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${u(this.feedback.message)}</strong>
        ${t.length ? `<span class="feedback-meta">${t.join(" · ")}</span>` : ""}
      </div>
    `;
  }
  renderBulkActionBar() {
    const e = this.selectedRows.size, t = this.bulkActionPending;
    return `
      <div class="bulk-actions-overlay ${e === 0 ? "hidden" : ""}" data-bulk-action-bar="true">
        <div class="bulk-actions-bar" role="toolbar" aria-label="Bulk actions for ${e} selected assignment${e !== 1 ? "s" : ""}">
          <button type="button" class="bulk-close-btn" data-bulk-clear="true" ${t ? "disabled" : ""} title="Clear selection">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <span class="sr-only">Clear selection</span>
          </button>
          <span class="bulk-count-text"><span id="selected-count">${e}</span> selected</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="bulk-action-btn"
              data-bulk-action="release"
              ${t ? "disabled" : ""}
              title="Release selected assignments back to the pool"
            >
              ${t ? "Processing…" : "Release"}
            </button>
            <button
              type="button"
              class="bulk-action-btn bulk-action-btn--danger"
              data-bulk-action="archive"
              ${t ? "disabled" : ""}
              title="Archive selected assignments"
            >
              ${t ? "Processing…" : "Archive"}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  renderFilterSnapshotBar() {
    const e = this.filterSnapshot;
    if (!e) return "";
    const t = this.bulkSnapshotPending || this.bulkActionPending, i = (e.filterSummary || []).slice(0, 4);
    return `
      <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="All matching filter selection">
        <div class="filter-snapshot-copy">
          <strong>${e.requested} matching assignment${e.requested !== 1 ? "s" : ""} selected</strong>
          ${i.length ? `<span>${i.map((s) => u(s)).join(" · ")}</span>` : ""}
        </div>
        <div class="filter-snapshot-actions">
          <button type="button" class="${b}" data-filter-snapshot-clear="true" ${t ? "disabled" : ""}>Clear</button>
          <button type="button" class="${b}" data-filter-snapshot-action="assign" ${t || e.requested === 0 ? "disabled" : ""}>Assign</button>
          <button type="button" class="${b}" data-filter-snapshot-action="release" ${t || e.requested === 0 ? "disabled" : ""}>Release</button>
          <button type="button" class="${b}" data-filter-snapshot-action="priority" ${t || e.requested === 0 ? "disabled" : ""}>Priority</button>
          <button type="button" class="${b}" data-filter-snapshot-action="archive" ${t || e.requested === 0 ? "disabled" : ""}>Archive</button>
        </div>
      </section>
    `;
  }
  renderPresetBar() {
    return `
      <div class="panel-tabs" role="group" aria-label="Saved queue filters">
        <div class="panel-tabs-container">
          ${this.savedFilterPresets.map((e) => `
            <button
              type="button"
              class="panel-tab ${this.activePresetId === e.id ? "panel-tab-active" : ""}"
              data-preset-id="${c(e.id)}"
              aria-pressed="${this.activePresetId === e.id ? "true" : "false"}"
              title="${c(e.description || e.label)}"
            >
              <span class="panel-tab-label">${u(e.label)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }
  renderReviewStateBar() {
    return "";
  }
  renderReviewSelector() {
    if (!this.savedReviewFilterPresets.length) return "";
    const e = this.response?.meta.review_aggregate_counts || {}, i = !!this.response?.meta.review_actor_id, s = this.savedReviewFilterPresets.find((r) => r.id === this.activeReviewPresetId), o = s ? s.label : "Review State", l = s ? e[s.id] ?? 0 : 0;
    return `
      <div class="relative" data-review-selector-container="true">
        <h2 class="sr-only">Reviewer states</h2>
        <button
          type="button"
          class="${b} ${i ? "" : "opacity-50 cursor-not-allowed"}"
          data-review-selector-toggle="true"
          aria-expanded="false"
          aria-haspopup="true"
          aria-label="Select review state filter"
          ${i ? "" : 'disabled aria-disabled="true"'}
          title="${c(i ? "Filter by review state" : "Reviewer metadata is required to use review filters.")}"
        >
          <span>${u(o)}</span>
          ${s ? `<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">${l}</span>` : ""}
          <svg class="h-4 w-4 transition-transform" data-review-selector-chevron="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div
          class="hidden absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
          data-review-selector-menu="true"
          role="menu"
          aria-orientation="vertical"
        >
          <div class="py-1">
            ${this.savedReviewFilterPresets.map((r) => `
              <button
                type="button"
                class="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${this.activeReviewPresetId === r.id ? "bg-blue-50 text-blue-700" : ""}"
                data-review-preset-id="${c(r.id)}"
                role="menuitem"
                title="${c(r.description || r.label)}"
              >
                <span>${u(r.label)}</span>
                <span class="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-xs font-semibold rounded-full ${this.activeReviewPresetId === r.id ? "bg-blue-200 text-blue-900" : "bg-gray-100 text-gray-700"}">${e[r.id] ?? 0}</span>
              </button>
            `).join("")}
          </div>
          ${i ? "" : `
            <div class="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
              Reviewer queue states are available when reviewer metadata is present.
            </div>
          `}
        </div>
      </div>
    `;
  }
  renderContextBar() {
    const e = this.response?.meta.total ?? 0, t = this.visibleRows.length, i = this.viewMode === "grouped", s = this.viewMode === "server_family", o = !i && !s, l = this.groupedData?.totalGroups ?? 0, r = this.response?.meta.grouping?.assignment_count ?? this.rows.length, d = this.response?.meta.grouping?.capabilities?.server_family?.supported === !0, p = this.response?.meta.grouping?.family_total ?? this.response?.meta.family_total ?? this.serverFamilyRows.length, h = this.response?.meta.grouping?.assignment_total ?? this.response?.meta.assignment_total ?? 0;
    let v = "", f = "";
    return s ? (v = `${this.serverFamilyRows.length} of ${p} ${p === 1 ? "family" : "families"} · ${h} assignments`, f = "(server-side family pages)") : i && this.groupedData ? (v = `${l} ${l === 1 ? "family" : "families"} · ${r} assignments`, f = "(page-local counts)") : (v = `Showing ${t} of ${e} ${e === 1 ? "assignment" : "assignments"}`, f = ""), `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3 text-sm">
            <span class="font-medium text-gray-700">${v}</span>
            ${f ? `<span class="text-gray-500">${f}</span>` : ""}
          </div>
          <div class="flex items-center gap-3">
            ${i || s ? `
              <button type="button" class="${b}" data-expand-all="true" title="Expand all ${s ? "visible families" : "groups"}">
                Expand all
              </button>
              <button type="button" class="${b}" data-collapse-all="true" title="Collapse all ${s ? "visible families" : "groups"}">
                Collapse all
              </button>
            ` : ""}
            <div role="group" aria-label="View mode" class="inline-flex rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors ${o ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}"
                data-view-mode="flat"
                aria-pressed="${o}"
                title="Show assignments as a flat list"
              >
                <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z"/>
                </svg>
                <span class="ml-1">List</span>
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${i ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}"
                data-view-mode="grouped"
                aria-pressed="${i}"
                title="Group assignments by translation family"
              >
                <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2 2h4v4H2zM2 10h4v4H2zM8 2h6v2H8zM8 6h6v2H8zM8 10h6v2H8zM8 14h6v2H8z"/>
                </svg>
                <span class="ml-1">Grouped</span>
              </button>
              ${d || s ? `
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${s ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"} ${d ? "" : "opacity-50 cursor-not-allowed"}"
                  data-view-mode="server_family"
                  aria-pressed="${s}"
                  title="${c(d ? "Use server-side family pagination" : "Server-side family grouping is unavailable for this repository")}"
                  ${d ? "" : 'disabled aria-disabled="true"'}
                >
                  <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M3 2h10v3H3zM2 7h5v3H2zM9 7h5v3H9zM2 12h5v3H2zM9 12h5v3H9z"/>
                  </svg>
                  <span class="ml-1">Families</span>
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderFilters() {
    const e = this.visibleRows, t = [
      "",
      "open",
      "assigned",
      "in_progress",
      "in_review",
      "changes_requested",
      "approved",
      "archived"
    ], i = [
      "none",
      "on_track",
      "due_soon",
      "overdue"
    ], s = [
      "",
      "low",
      "normal",
      "high",
      "urgent"
    ], o = ["", ...F(e.map((f) => f.target_locale))], l = ["", ...F(e.map((f) => f.entity_type))], r = ["", ...F(e.map((f) => f.assignee_id))], d = ["", ...F(e.map((f) => f.reviewer_id))], p = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
      "updated_at",
      "due_date",
      "priority",
      "status",
      "locale"
    ], h = this.getActiveFilterCount(), v = this.filtersExpanded ? "rotate-180" : "";
    return `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="${b}"
              data-filters-toggle="true"
              aria-expanded="${this.filtersExpanded}"
              aria-controls="queue-filters-panel"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
              </svg>
              <span>Filters</span>
              ${h > 0 ? `<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">${h}</span>` : ""}
              <svg class="h-4 w-4 transition-transform ${v}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            ${this.renderReviewSelector()}
          </div>
          <div class="flex items-center gap-3">
            ${this.renderSortControls(p)}
          </div>
        </div>
        ${this.renderFilterChips()}
        <form
          id="queue-filters-panel"
          class="${this.filtersExpanded ? "" : "hidden"} mt-4 pt-4 border-t border-gray-100"
          data-queue-filters="true"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${this.renderSelect("status", "Status", t, this.queryState.status || "")}
            ${this.renderQueueFilterControl("due_state", "Due State", ["", ...i], this.queryState.dueState || "")}
            ${this.renderSelect("priority", "Priority", s, this.queryState.priority || "")}
            ${this.renderQueueFilterControl("entity_type", "Type", l, this.queryState.entityType || "")}
            ${this.renderQueueFilterControl("locale", "Target Locale", o, this.queryState.locale || "")}
            ${this.renderQueueFilterControl("assignee_id", "Assignee", r, this.queryState.assigneeId || "")}
            ${this.renderQueueFilterControl("reviewer_id", "Reviewer", d, this.queryState.reviewerId || "")}
            ${this.renderQueueFilterControl("family_id", "Family", ["", ...F(e.map((f) => f.family_id))], this.queryState.familyId || "")}
          </div>
          ${h > 0 ? `
            <div class="mt-4 flex items-center gap-2">
              <button type="button" class="${b}" data-clear-filters="true">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Clear filters
              </button>
            </div>
          ` : ""}
        </form>
      </div>
    `;
  }
  renderSortControls(e) {
    const t = this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"), i = this.queryState.order || (this.response?.meta.default_sort.order ?? "desc");
    return `
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <span class="text-gray-500">Sort by</span>
        <select
          data-filter-name="sort"
          class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          ${e.map((s) => `
            <option value="${c(s)}" ${s === t ? "selected" : ""}>
              ${u(y(s))}
            </option>
          `).join("")}
        </select>
      </label>
      <button
        type="button"
        class="${re}"
        data-toggle-sort-order="true"
        title="${i === "asc" ? "Ascending (click for descending)" : "Descending (click for ascending)"}"
        aria-label="${i === "asc" ? "Sort ascending, click to sort descending" : "Sort descending, click to sort ascending"}"
      >
        ${i === "asc" ? '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>' : '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/></svg>'}
      </button>
      <button
        type="button"
        class="${re}"
        data-queue-refresh="true"
        title="Refresh queue"
        aria-label="Refresh assignment queue"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    `;
  }
  renderSelect(e, t, i, s) {
    const o = i.map((l) => ({
      value: l,
      label: l ? y(l) : `All ${t.toLowerCase()}`
    }));
    return this.renderSelectOptions(e, t, o, s);
  }
  renderSelectOptions(e, t, i, s, o) {
    const l = i.map((r) => ({ ...r }));
    return l.some((r) => r.value === "") || l.unshift({
      value: "",
      label: o || `All ${t.toLowerCase()}`
    }), s && !l.some((r) => r.value === s) && l.push({
      value: s,
      label: y(s)
    }), `
      <label class="queue-filter-field">
        <span>${u(t)}</span>
        <select data-filter-name="${c(e)}">
          ${l.map((r) => `
            <option value="${c(r.value)}" ${r.value === s ? "selected" : ""}>
              ${u(r.label || r.value || o || `All ${t.toLowerCase()}`)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }
  queueFilterControl(e) {
    const t = this.response?.meta;
    if (!t) return null;
    const i = this.queueFilterControlAliases(e);
    return t.filter_controls.find((s) => i.includes(s.name) || i.includes(s.key)) || null;
  }
  canonicalQueueFilterName(e) {
    switch (e) {
      case "content_type":
      case "type":
        return "entity_type";
      case "target_locale":
        return "locale";
      default:
        return e;
    }
  }
  queueFilterControlAliases(e) {
    const t = this.canonicalQueueFilterName(e);
    switch (t) {
      case "entity_type":
        return [
          "entity_type",
          "content_type",
          "type"
        ];
      case "locale":
        return ["locale", "target_locale"];
      default:
        return [t];
    }
  }
  renderQueueFilterControl(e, t, i, s) {
    const o = this.queueFilterControl(e);
    if (o?.type === "select" && o.options.length > 0) return this.renderSelectOptions(o.name || e, o.label || t, o.options, s, o.placeholder || `All ${(o.label || t).toLowerCase()}`);
    if (this.response?.meta.enhanced_filter_selects !== !0 || !o?.enhanced || !o.endpoint_url || o.type !== "typeahead" && o.type !== "remote_select") return this.renderSelect(e, t, i, s);
    const l = o.label || t, r = this.canonicalQueueFilterName(o.name || o.key || e), d = o.placeholder || l;
    return `
      <label class="queue-filter-field">
        <span>${u(l)}</span>
        <div class="filter-panel__enhanced-control"
             data-filter-enhanced="true"
             data-filter-control-type="${c(o.type)}"
             data-filter-name="${c(r)}"
             data-filter-endpoint-url="${c(o.endpoint_url)}"
             data-filter-search-param="${c(o.endpoint_search_param || "search")}"
             data-filter-hydrate-param="${c(o.endpoint_hydrate_param || "selected")}"
             data-filter-value-field="${c(o.endpoint_value_field || "value")}"
             data-filter-label-field="${c(o.endpoint_label_field || "label")}"
             data-filter-renderer="${c(o.renderer || "simple")}"
             data-filter-fallback="${c(o.fallback || "raw")}">
          <input
            type="text"
            name="${c(r)}"
            value="${c(s)}"
            placeholder="${c(d)}"
            autocomplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="false"
            data-filter-enhanced-input="true"
          />
        </div>
      </label>
    `;
  }
  renderBody() {
    const e = this.visibleRows;
    if (this.state === "loading" && !this.rows.length) return `
        <div class="${Qe}" data-queue-state="loading">
          <svg class="animate-spin h-8 w-8 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-4 text-sm text-gray-500">Loading queue assignments...</p>
        </div>
      `;
    if (this.state === "error" && !this.rows.length) return this.renderErrorState("error", this.error?.message || "Failed to load queue assignments.");
    if (this.state === "conflict" && !this.rows.length) return this.renderErrorState("conflict", this.error?.message || "The queue response is stale. Refresh and try again.");
    if (this.viewMode === "server_family")
      return this.serverFamilyRows.length ? this.renderServerFamilyBody() : this.renderEmptyState("families");
    if (!e.length) return this.renderEmptyState("assignments");
    if (this.viewMode === "grouped" && this.groupedData) return this.renderGroupedBody();
    const t = this.isAllPageSelected();
    return `
      <!-- Mobile Card View (visible on small screens) -->
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true">
        ${e.map((i) => this.renderMobileCard(i)).join("")}
      </div>
      <!-- Desktop Table View (hidden on small screens) -->
      <div class="assignment-queue-table-wrap hidden sm:block">
        <table class="assignment-queue-table" aria-label="Translation assignment queue">
          <thead>
            <tr>
              <th scope="col" class="queue-select-col">
                <input
                  type="checkbox"
                  class="queue-select-all"
                  data-select-all="true"
                  ${t ? "checked" : ""}
                  aria-label="Select all assignments on this page"
                />
              </th>
              <th scope="col" class="queue-content-col">Content</th>
              <th scope="col" class="queue-locale-col">Locale</th>
              <th scope="col" class="queue-status-col">Status</th>
              <th scope="col" class="queue-owner-col">Owners</th>
              <th scope="col" class="queue-due-col">Due</th>
              <th scope="col" class="queue-priority-col">Priority</th>
              <th scope="col" class="queue-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${e.map((i) => this.renderRow(i)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderServerFamilyBody() {
    return `
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true" data-queue-grouped="true" data-server-family="true">
        ${this.serverFamilyRows.map((t) => this.renderServerFamilyMobile(t)).join("")}
      </div>
      <div class="assignment-queue-table-wrap hidden sm:block">
        <table class="assignment-queue-table assignment-queue-table-grouped" aria-label="Translation assignment queue families">
          <thead>
            <tr>
              <th scope="col" class="queue-select-col"></th>
              <th scope="col">Family</th>
              <th scope="col">Locales</th>
              <th scope="col">Status</th>
              <th scope="col">Owners</th>
              <th scope="col">Due</th>
              <th scope="col">Priority</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.serverFamilyRows.map((t) => this.renderServerFamilyRows(t, 8)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderServerFamilyRows(e, t) {
    const i = e.expanded ? "▼" : "▶", s = this.renderServerFamilyBlocker(e), o = e.expanded ? e.loading ? `<tr class="family-group-child"><td></td><td colspan="${t - 1}">Loading family assignments…</td></tr>` : e.error ? `<tr class="family-group-child"><td></td><td colspan="${t - 1}">${u(e.error)}</td></tr>` : e.children.map((l) => this.renderGroupChildRow(l, e.family_id)).join("") : "";
    return `
      <tr class="family-group-header server-family-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
          data-group-id="${c(e.family_id)}"
          data-group-expanded="${e.expanded}"
          role="row"
          aria-expanded="${e.expanded}"
          tabindex="0">
        <td class="queue-select-col"></td>
        <td colspan="${t - 1}">
          <div class="family-group-header-content">
            <button type="button" class="family-group-toggle" data-toggle-group="${c(e.family_id)}" aria-label="${e.expanded ? "Collapse" : "Expand"} family">
              <span class="family-group-expand-icon" aria-hidden="true">${i}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${u(e.family_label || e.family_id)}</strong>
              <span class="family-group-count">${e.assignment_count} ${e.assignment_count === 1 ? "assignment" : "assignments"} · ${e.locale_count} ${e.locale_count === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary server-family-summary">
              ${this.renderCountPills(e.status_counts)}
              ${this.renderPriorityPills(e.priority_counts)}
              ${s}
            </div>
          </div>
        </td>
      </tr>
      ${o}
    `;
  }
  renderServerFamilyMobile(e) {
    const t = e.expanded ? "▼" : "▶", i = e.expanded ? e.loading ? '<div class="family-group-mobile-child">Loading family assignments…</div>' : e.error ? `<div class="family-group-mobile-child">${u(e.error)}</div>` : e.children.map((s) => `<div class="family-group-mobile-child">${this.renderMobileCard(s)}</div>`).join("") : "";
    return `
      <div class="family-group-mobile-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
           data-group-id="${c(e.family_id)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${c(e.family_id)}">
          <span class="family-group-expand-icon">${t}</span>
          <span class="family-group-mobile-label">${u(e.family_label || e.family_id)}</span>
          <span class="family-group-mobile-count">${e.assignment_count} assignments · ${e.locale_count} locales</span>
        </button>
        <div class="server-family-mobile-summary">${this.renderServerFamilyBlocker(e)}</div>
      </div>
      ${i}
    `;
  }
  renderCountPills(e) {
    return Object.entries(e).filter(([, t]) => t > 0).slice(0, 4).map(([t, i]) => `<span class="family-summary-pill">${u(y(t))} ${i}</span>`).join("");
  }
  renderPriorityPills(e) {
    return Object.entries(e).filter(([, t]) => t > 0).slice(0, 2).map(([t, i]) => `<span class="family-summary-pill priority-${c(t)}">${u(y(t))} ${i}</span>`).join("");
  }
  renderServerFamilyBlocker(e) {
    if (!e.family_blocker_count_available) return `<span class="family-summary-pill is-degraded" title="${c(e.family_blocker_count_reason || "persisted_blockers_unavailable")}">Blockers unavailable</span>`;
    const t = e.family_blocker_count ?? 0;
    return `<span class="family-summary-pill ${t > 0 ? "is-blocked" : ""}">${t} persisted ${t === 1 ? "blocker" : "blockers"}</span>`;
  }
  renderGroupedBody() {
    if (!this.groupedData) return "";
    const e = this.isAllPageSelected(), t = 8;
    return `
      <!-- Mobile Card View - Grouped (visible on small screens) -->
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true" data-queue-grouped="true">
        ${this.groupedData.groups.map((i) => this.renderGroupedMobileCards(i)).join("")}
        ${this.groupedData.ungrouped.map((i) => this.renderMobileCard(q(i))).join("")}
      </div>
      <!-- Desktop Table View - Grouped (hidden on small screens) -->
      <div class="assignment-queue-table-wrap hidden sm:block">
        <table class="assignment-queue-table assignment-queue-table-grouped" aria-label="Translation assignment queue (grouped by family)">
          <thead>
            <tr>
              <th scope="col" class="queue-select-col">
                <input
                  type="checkbox"
                  class="queue-select-all"
                  data-select-all="true"
                  ${e ? "checked" : ""}
                  aria-label="Select all assignments on this page"
                />
              </th>
              <th scope="col" class="queue-content-col">Content</th>
              <th scope="col" class="queue-locale-col">Locale</th>
              <th scope="col" class="queue-status-col">Status</th>
              <th scope="col" class="queue-owner-col">Owners</th>
              <th scope="col" class="queue-due-col">Due</th>
              <th scope="col" class="queue-priority-col">Priority</th>
              <th scope="col" class="queue-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.groupedData.groups.map((i) => this.renderFamilyGroupRows(i, t)).join("")}
            ${this.groupedData.ungrouped.map((i) => this.renderRow(q(i))).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderFamilyGroupRows(e, t) {
    const i = Se(e, { size: "sm" }), s = u(e.displayLabel || this.deriveFamilyGroupLabel(e)), o = e.records.length, l = e.expanded ? "▼" : "▶";
    return `
      <tr class="family-group-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
          data-group-id="${c(e.groupId)}"
          data-group-expanded="${e.expanded}"
          role="row"
          aria-expanded="${e.expanded}"
          tabindex="0">
        <td class="queue-select-col">
          <!-- Group parent doesn't have selection checkbox -->
        </td>
        <td colspan="${t - 1}">
          <div class="family-group-header-content">
            <button type="button" class="family-group-toggle" data-toggle-group="${c(e.groupId)}" aria-label="${e.expanded ? "Collapse" : "Expand"} family group">
              <span class="family-group-expand-icon" aria-hidden="true">${l}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${s}</strong>
              <span class="family-group-count">${o} ${o === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary">
              ${i}
            </div>
          </div>
        </td>
      </tr>
    ` + (e.expanded ? e.records.map((r) => {
      const d = q(r);
      return this.renderGroupChildRow(d, e.groupId);
    }).join("") : "");
  }
  renderGroupChildRow(e, t) {
    const i = !!e.assignee_id, s = !!e.reviewer_id, o = !!e.due_date, l = o || e.due_state === "overdue" || e.due_state === "due_soon", r = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row family-group-child ${r ? "is-selected" : ""}"
          data-assignment-id="${c(e.id)}"
          data-parent-group="${c(t)}"
          data-assignment-row="true"
          data-assignment-nav-group="table"
          tabindex="0"
          aria-label="${c(X(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${c(e.id)}"
            ${r ? "checked" : ""}
            aria-label="Select assignment ${c(e.source_title || e.id)}"
          />
        </td>
        <td class="queue-content-col">
          <div class="queue-content-cell queue-content-cell-grouped">
            <span class="queue-content-indent"></span>
            <span class="queue-content-title-small" title="${c(e.source_title && e.source_path ? `${e.source_title} — ${e.source_path}` : e.source_title || e.source_path || e.id)}">${u(e.source_title || e.source_path || e.id)}</span>
          </div>
        </td>
        <td class="queue-locale-col">
          <div class="queue-locale-cell">
            <span class="locale-code">${u(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${u(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td class="queue-status-col">
          <div class="queue-status-cell">
            ${O(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
            ${e.qa_summary?.enabled && e.qa_summary.finding_count > 0 ? `
              <span class="queue-qa-chip ${e.qa_summary.blocker_count > 0 ? "is-blocked" : ""}">
                QA ${e.qa_summary.finding_count}
              </span>
            ` : ""}
          </div>
        </td>
        <td class="queue-owner-col">
          <div class="queue-owner-cell">
            ${i ? j("queue-owner-value", "Assignee", e.assignee_id, e.assignee_label) : ""}
            ${s ? j("queue-reviewer-value", "Reviewer", e.reviewer_id, e.reviewer_label) : ""}
          </div>
        </td>
        <td class="queue-due-col">
          <div class="queue-due-cell">
            ${l ? `<span class="due-pill due-${c(e.due_state)}">${u(y(e.due_state))}</span>` : ""}
            ${o ? `<span class="queue-due-date">${u(N(e.due_date, ""))}</span>` : ""}
          </div>
        </td>
        <td class="queue-priority-col">
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + y(e.priority))}"></span>
            <span class="priority-label">${u(y(e.priority))}</span>
          </div>
        </td>
        <td class="queue-action-col">
          <div class="queue-action-cell">
            ${(() => {
      const d = V(e, this.pendingActions);
      return Y(e, d, K(d, e));
    })()}
          </div>
        </td>
      </tr>
    `;
  }
  renderGroupedMobileCards(e) {
    const t = u(e.displayLabel || this.deriveFamilyGroupLabel(e)), i = e.records.length, s = e.expanded ? "▼" : "▶";
    return `
      <div class="family-group-mobile-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
           data-group-id="${c(e.groupId)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${c(e.groupId)}">
          <span class="family-group-expand-icon">${s}</span>
          <span class="family-group-mobile-label">${t}</span>
          <span class="family-group-mobile-count">${i} ${i === 1 ? "locale" : "locales"}</span>
        </button>
      </div>
    ` + (e.expanded ? e.records.map((o) => {
      const l = q(o);
      return `<div class="family-group-mobile-child">${this.renderMobileCard(l)}</div>`;
    }).join("") : "");
  }
  deriveFamilyGroupLabel(e) {
    if (e.displayLabel) return e.displayLabel;
    if (e.records.length > 0) {
      const t = e.records[0], i = [
        n(t.source_title),
        n(t.source_path),
        n(t.source_record_id)
      ];
      for (const s of i) if (s) return s;
    }
    return `Family ${e.groupId.length > 20 ? e.groupId.slice(0, 17) + "..." : e.groupId}`;
  }
  renderEmptyState(e) {
    const t = e === "families" ? "No families found" : "No assignments found", i = e === "families" ? "No families match the current filters. Try adjusting your filters or check back later." : "No assignments match the current filters. Try adjusting your filters or selecting a different preset.", s = this.getActiveFilterCount();
    return `
      <div class="${Ue}" data-queue-state="empty">
        <svg class="h-12 w-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        <h3 class="${Me} mt-4">${u(t)}</h3>
        <p class="${je} max-w-md mx-auto">${u(i)}</p>
        <div class="mt-5 flex items-center justify-center gap-3">
          ${s > 0 ? `
            <button type="button" class="${b}" data-clear-filters="true">
              Clear filters
            </button>
          ` : ""}
          <button type="button" class="${b}" data-queue-refresh="true">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
    `;
  }
  renderErrorState(e, t) {
    return `
      <div class="${Ge} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${Be}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${Ye} mt-2">${u(t)}</p>
        <div class="mt-4">
          <button type="button" class="${b}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = !!e.assignee_id, i = !!e.reviewer_id, s = !!e.due_date, o = s || e.due_state === "overdue" || e.due_state === "due_soon", l = [];
    e.entity_type && l.push(e.entity_type), e.family_id && e.family_id !== e.source_path && l.push(e.family_id);
    const r = l.join(" · "), d = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row ${d ? "is-selected" : ""}" tabindex="0" data-assignment-id="${c(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${c(X(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${c(e.id)}"
            ${d ? "checked" : ""}
            aria-label="Select assignment ${c(e.source_title || e.id)}"
          />
        </td>
        <td class="queue-content-col">
          <div class="queue-content-cell">
            <strong class="queue-content-title" title="${c(e.source_title || e.source_path || e.id)}">${u(e.source_title || e.source_path || e.id)}</strong>
            ${e.source_path && e.source_title ? `<span class="queue-content-path" title="${c(e.source_path)}">${u(e.source_path)}</span>` : ""}
            ${r ? `<span class="queue-content-meta" title="${c(r)}">${u(r)}</span>` : ""}
          </div>
        </td>
        <td class="queue-locale-col">
          <div class="queue-locale-cell">
            <span class="locale-code">${u(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${u(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td class="queue-status-col">
          <div class="queue-status-cell">
            ${O(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
            ${e.qa_summary?.enabled && e.qa_summary.finding_count > 0 ? `
              <span class="queue-qa-chip ${e.qa_summary.blocker_count > 0 ? "is-blocked" : ""}">
                QA ${e.qa_summary.finding_count}
              </span>
            ` : ""}
          </div>
        </td>
        <td class="queue-owner-col">
          <div class="queue-owner-cell">
            ${t ? j("queue-owner-value", "Assignee", e.assignee_id, e.assignee_label) : ""}
            ${i ? j("queue-reviewer-value", "Reviewer", e.reviewer_id, e.reviewer_label) : ""}
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${u(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td class="queue-due-col">
          <div class="queue-due-cell">
            ${o ? `<span class="due-pill due-${c(e.due_state)}">${u(y(e.due_state))}</span>` : ""}
            ${s ? `<span class="queue-due-date">${u(N(e.due_date, ""))}</span>` : ""}
          </div>
        </td>
        <td class="queue-priority-col">
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + y(e.priority))}"></span>
            <span class="priority-label">${u(y(e.priority))}</span>
          </div>
        </td>
        <td class="queue-action-col">
          <div class="queue-action-cell">
            ${(() => {
      const p = V(e, this.pendingActions);
      return Y(e, p, K(p, e));
    })()}
          </div>
        </td>
      </tr>
    `;
  }
  renderMobileCard(e) {
    const t = !!e.assignee_id, i = !!e.reviewer_id, s = !!e.due_date, o = s || e.due_state === "overdue" || e.due_state === "due_soon", l = this.isRowSelected(e.id);
    return `
      <article
        class="${De} ${l ? "is-selected" : ""}"
        data-assignment-id="${c(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${c(X(e))}"
      >
        <div class="${ze}">
          <div class="mobile-card-select">
            <input
              type="checkbox"
              class="queue-row-select"
              data-select-row="${c(e.id)}"
              ${l ? "checked" : ""}
              aria-label="Select assignment ${c(e.source_title || e.id)}"
            />
          </div>
          <div class="mobile-card-title-group">
            <h3 class="${Ne}" title="${c(e.source_title || e.source_path || e.id)}">${u(e.source_title || e.source_path || e.id)}</h3>
            <p class="${He}" title="${c(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}">${u(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${O(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${Xe}">
          <div class="${E}">
            <span class="${I}">Locale</span>
            <span class="${R}">
              <span class="locale-code">${u(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${u(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          ${t ? `
          <div class="${E}">
            <span class="${I}">Assignee</span>
            <span class="${R}" title="${c(J("Assignee", e.assignee_id, e.assignee_label))}">${u(z(e.assignee_id, e.assignee_label))}</span>
          </div>
          ` : ""}
          ${i ? `
          <div class="${E}">
            <span class="${I}">Reviewer</span>
            <span class="${R}" title="${c(J("Reviewer", e.reviewer_id, e.reviewer_label))}">${u(z(e.reviewer_id, e.reviewer_label))}</span>
          </div>
          ` : ""}
          ${s || o ? `
          <div class="${E}">
            <span class="${I}">Due</span>
            <span class="${R}">
              ${o ? `<span class="due-pill due-${c(e.due_state)}">${u(y(e.due_state))}</span>` : ""}
              ${s ? `<span class="text-gray-600 ml-1">${u(N(e.due_date, ""))}</span>` : ""}
            </span>
          </div>
          ` : ""}
          <div class="${E}">
            <span class="${I}">Priority</span>
            <span class="${R}">
              <span class="priority-indicator priority-${c(e.priority)}"></span>
              <span class="priority-label">${u(y(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${Oe}">
          ${(() => {
      const r = V(e, this.pendingActions);
      return Y(e, r, K(r, e));
    })()}
        </div>
      </article>
    `;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-preset-id]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = r.dataset.presetId;
        d && this.setActivePreset(d);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = r.dataset.reviewPresetId;
        if (d) {
          this.setActiveReviewPreset(d);
          const p = this.container?.querySelector("[data-review-selector-menu]");
          p && !p.classList.contains("hidden") && this.closeReviewSelectorDropdown();
        }
      });
    }), this.container.querySelectorAll("[data-review-selector-toggle]").forEach((r) => {
      r.addEventListener("click", (d) => {
        d.stopPropagation(), this.toggleReviewSelectorDropdown();
      });
    }), this.container.querySelectorAll("select[data-filter-name]").forEach((r) => {
      r.addEventListener("change", () => {
        const d = r.dataset.filterName;
        d && this.updateNamedFilter(d, r.value);
      });
    }), this.container.querySelectorAll('[data-filter-enhanced="true"]').forEach((r) => {
      r.addEventListener("queue-filter-change", (d) => {
        const p = d.detail || {};
        p.name && this.updateNamedFilter(p.name, n(p.value));
      });
    }), he(this.container), this.container.querySelectorAll("[data-translation-refresh], [data-queue-refresh]").forEach((r) => {
      r.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-filters-toggle]").forEach((r) => {
      r.addEventListener("click", () => {
        this.toggleFiltersExpanded();
      });
    }), this.container.querySelectorAll("[data-clear-filters]").forEach((r) => {
      r.addEventListener("click", () => {
        this.clearAllFilters();
      });
    }), this.container.querySelectorAll("[data-remove-filter]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = r.dataset.removeFilter;
        d && this.removeFilter(d);
      });
    }), this.container.querySelectorAll("[data-toggle-sort-order]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = this.queryState.order || "desc";
        this.updateFilter({ order: d === "asc" ? "desc" : "asc" });
      });
    }), this.container.querySelectorAll("[data-action]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = r.dataset.action, p = r.dataset.assignmentId;
        if ((d === "claim" || d === "release") && p) {
          this.runInlineAction(d, p);
          return;
        }
        (d === "approve" || d === "reject" || d === "archive") && p && this.runReviewAction(d, p);
      });
    });
    const e = this.container.querySelector("[data-translation-select-all], [data-select-all]");
    e && e.addEventListener("change", () => {
      e.checked ? this.selectAllPage() : this.clearSelection();
    }), this.container.querySelectorAll("[data-translation-select-row], [data-select-row]").forEach((r) => {
      r.addEventListener("change", (d) => {
        d.stopPropagation();
        const p = r.dataset.translationSelectRow || r.dataset.selectRow;
        p && this.toggleRowSelection(p);
      }), r.addEventListener("click", (d) => {
        d.stopPropagation();
      });
    });
    const t = this.container.querySelector("[data-bulk-clear]");
    t && t.addEventListener("click", () => {
      this.clearSelection();
    });
    const i = this.container.querySelector("[data-select-all-matching]");
    i && i.addEventListener("click", () => {
      this.selectAllMatchingFilters();
    });
    const s = this.container.querySelector("[data-filter-snapshot-clear]");
    s && s.addEventListener("click", () => {
      this.clearSelection();
    }), this.container.querySelectorAll("[data-filter-snapshot-action]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = r.dataset.filterSnapshotAction;
        (d === "assign" || d === "release" || d === "priority" || d === "archive") && this.runFilterSnapshotBulkAction(d);
      });
    }), this.container.querySelectorAll("[data-bulk-action]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = r.dataset.bulkAction;
        (d === "release" || d === "archive") && this.runBulkAction(d);
      });
    }), this.container.querySelectorAll("[data-view-mode]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = r.dataset.viewMode;
        (d === "flat" || d === "grouped" || d === "server_family") && this.setViewMode(d);
      });
    }), this.container.querySelectorAll("[data-toggle-group]").forEach((r) => {
      r.addEventListener("click", (d) => {
        d.stopPropagation();
        const p = r.dataset.toggleGroup;
        p && this.toggleGroupExpansion(p);
      });
    }), this.container.querySelectorAll("[data-overflow-menu]").forEach((r) => {
      r.addEventListener("click", (d) => {
        d.stopPropagation();
        const p = r.dataset.overflowMenu;
        if (!p) return;
        let h = r.closest(".queue-action-overflow-container")?.querySelector(`#menu-${p}`);
        if (h || (h = this.container?.querySelector(`#menu-${p}`) || null), !h) return;
        const v = h.hidden === !1;
        this.container?.querySelectorAll(".queue-action-overflow-menu").forEach((f) => {
          f.hidden = !0;
        }), this.container?.querySelectorAll("[data-overflow-menu]").forEach((f) => {
          f.setAttribute("aria-expanded", "false");
        }), v ? (h.hidden = !0, r.setAttribute("aria-expanded", "false")) : (h.hidden = !1, r.setAttribute("aria-expanded", "true"), h.querySelector('[role="menuitem"]:not([disabled])')?.focus());
      });
    }), this.container && typeof this.container.addEventListener == "function" && this.container.addEventListener("click", (r) => {
      r.target.closest(".queue-action-overflow-container") || (this.container?.querySelectorAll(".queue-action-overflow-menu").forEach((d) => {
        d.hidden = !0;
      }), this.container?.querySelectorAll("[data-overflow-menu]").forEach((d) => {
        d.setAttribute("aria-expanded", "false");
      }));
    }), this.container.querySelectorAll(".queue-action-overflow-menu").forEach((r) => {
      r.addEventListener("keydown", (d) => {
        const p = Array.from(r.querySelectorAll('[role="menuitem"]:not([disabled])')), h = p.findIndex((v) => v === document.activeElement);
        switch (d.key) {
          case "Escape":
            d.preventDefault(), r.hidden = !0;
            const v = r.closest(".queue-action-overflow-container")?.querySelector("[data-overflow-menu]");
            v && (v.setAttribute("aria-expanded", "false"), v.focus());
            break;
          case "ArrowDown":
            d.preventDefault(), h < p.length - 1 ? p[h + 1]?.focus() : p[0]?.focus();
            break;
          case "ArrowUp":
            d.preventDefault(), h > 0 ? p[h - 1]?.focus() : p[p.length - 1]?.focus();
            break;
          case "Tab":
            r.hidden = !0;
            const f = r.closest(".queue-action-overflow-container")?.querySelector("[data-overflow-menu]");
            f && f.setAttribute("aria-expanded", "false");
            break;
        }
      });
    });
    const o = this.container.querySelector("[data-expand-all]");
    o && o.addEventListener("click", () => {
      this.expandAllFamilyGroups();
    });
    const l = this.container.querySelector("[data-collapse-all]");
    l && l.addEventListener("click", () => {
      this.collapseAllFamilyGroups();
    }), this.container.querySelectorAll("[data-group-id]").forEach((r) => {
      (r.tagName.toLowerCase() === "tr" || r.classList.contains("family-group-mobile-header")) && (r.addEventListener("click", (d) => {
        if (d.target?.closest("button, a, input, select, textarea")) return;
        const p = r.dataset.groupId;
        p && this.toggleGroupExpansion(p);
      }), r.addEventListener("keydown", (d) => {
        if (!de(d, r) && (d.key === "Enter" || d.key === " ")) {
          d.preventDefault();
          const p = r.dataset.groupId;
          p && this.toggleGroupExpansion(p);
        }
      }));
    }), this.attachAssignmentNavigationTargets("[data-translation-row], [data-assignment-row]"), this.attachAssignmentNavigationTargets("[data-assignment-card]");
  }
  attachAssignmentNavigationTargets(e) {
    this.container && this.container.querySelectorAll(e).forEach((t) => {
      const i = () => t.dataset.translationRowId || t.dataset.assignmentId || "";
      t.addEventListener("click", (s) => {
        s.target?.closest("button, a, input, select, textarea") || this.openAssignment(i());
      }), t.addEventListener("keydown", (s) => {
        if (de(s, t)) return;
        const o = s.key;
        if (o === "Enter" || o === " ") {
          s.preventDefault(), this.openAssignment(i());
          return;
        }
        if (o !== "ArrowDown" && o !== "ArrowUp") return;
        const l = t.dataset.translationNavGroup || t.dataset.assignmentNavGroup;
        if (!l) return;
        s.preventDefault();
        const r = Array.from(this.container?.querySelectorAll(`[data-translation-nav-group="${l}"], [data-assignment-nav-group="${l}"]`) || []), d = r.indexOf(t);
        d < 0 || r[o === "ArrowDown" ? Math.min(d + 1, r.length - 1) : Math.max(d - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
Z = ve;
Z.PANEL_ID = "translation-queue";
Z.FILTERS_STORAGE_KEY = "go-admin:queue-filters-expanded";
function X(a) {
  return [
    a.source_title || a.source_path || a.id,
    `${a.source_locale.toUpperCase()} to ${a.target_locale.toUpperCase()}`,
    a.queue_state,
    a.due_state
  ].filter(Boolean).join(", ");
}
function z(a, e) {
  return (e || a || "").trim();
}
function J(a, e, t) {
  const i = z(e, t);
  if (!i) return "";
  const s = (e || "").trim();
  return !s || i === s ? `${a}: ${i}` : `${a}: ${i} (${s})`;
}
function j(a, e, t, i) {
  const s = z(t, i);
  if (!s) return "";
  const o = J(e, t, i);
  return `<span class="${c(a)}" title="${c(o)}" aria-label="${c(o)}">${u(s)}</span>`;
}
function y(a) {
  return a ? a.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function Ft() {
  return `
    .assignment-queue-screen {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: linear-gradient(180deg, #f9fafb 0%, #ffffff 40%);
      border-radius: 0.75rem;
      padding: 1rem;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      border: 1px solid #e5e7eb;
    }

    /* Filter field styling */
    .queue-filter-field select,
    .queue-filter-field input[type="text"] {
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #111827;
      font: inherit;
      padding: 0.5rem 0.75rem;
      width: 100%;
    }

    .queue-filter-field select:focus,
    .queue-filter-field input[type="text"]:focus {
      border-color: #3b82f6;
      outline: none;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .assignment-queue-feedback {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      border-radius: 0.9rem;
      padding: 0.9rem 1rem;
      border: 1px solid transparent;
      flex-wrap: wrap;
    }

    .feedback-success {
      background: #ecfdf5;
      border-color: #86efac;
      color: #166534;
    }

    .feedback-error {
      background: #fff1f2;
      border-color: #fda4af;
      color: #be123c;
    }

    .feedback-conflict {
      background: #fff7ed;
      border-color: #fdba74;
      color: #c2410c;
    }

    .feedback-meta {
      font-size: 0.85rem;
      opacity: 0.85;
    }

    /* Legacy preset/filter styles removed - now using panel-tabs and tailwind grid from design system */

    .queue-filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #374151;
      font-size: 0.875rem;
    }

    .queue-filter-field span {
      font-weight: 500;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
    }

    /* Filter chips */
    .queue-filter-chips-container {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }

    .queue-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .queue-filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      color: #1e40af;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .queue-filter-chip:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }

    .queue-filter-chip:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .queue-filter-chip-label {
      color: #64748b;
      font-weight: 500;
    }

    .queue-filter-chip-value {
      color: #1e40af;
      font-weight: 600;
    }

    .queue-filter-chip-remove {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      margin-left: 0.125rem;
    }

    .queue-filter-chip-clear-all {
      background: #f3f4f6;
      border-color: #d1d5db;
      color: #374151;
    }

    .queue-filter-chip-clear-all:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
    }

    .assignment-queue-state {
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.5rem;
      background: #f9fafb;
      color: #374151;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .assignment-queue-state.is-error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }

    .assignment-queue-state.is-conflict {
      background: #fffbeb;
      border-color: #fcd34d;
      color: #92400e;
    }

    .assignment-queue-table-wrap {
      overflow-x: auto;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .assignment-queue-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 960px;
    }

    .assignment-queue-table th,
    .assignment-queue-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--translation-border-default, #e5e7eb);
      text-align: left;
      vertical-align: middle;
    }

    .assignment-queue-table th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--translation-text-muted, #6b7280);
      background: var(--translation-surface-muted, #f9fafb);
    }

    .assignment-queue-row {
      outline: none;
      transition: background-color 0.15s ease;
    }

    .assignment-queue-row:hover {
      background-color: var(--translation-surface-muted, #f9fafb);
    }

    .assignment-queue-row:focus-within {
      background-color: #eff6ff;
    }

    .assignment-queue-row.is-selected {
      background-color: #eff6ff;
    }

    /* Checkbox column alignment */
    .queue-select-col {
      width: 3rem;
      padding: 0.75rem 0.5rem !important;
      text-align: center;
      vertical-align: middle;
    }

    .queue-select-col input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
      margin: 0;
      cursor: pointer;
      accent-color: #2563eb;
    }

    .queue-content-cell,
    .queue-owner-cell,
    .queue-due-cell,
    .queue-status-cell {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    /* T09: Content cell hierarchy */
    .queue-content-title {
      display: block;
      font-weight: 600;
      color: #111827;
      line-height: 1.3;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-path {
      display: block;
      font-size: 0.82rem;
      color: #6b7280;
      margin-top: 0.15rem;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-meta {
      display: block;
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.1rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-title-small {
      display: block;
      font-weight: 500;
      color: #111827;
      font-size: 0.875rem;
      max-width: 24rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* T09: Locale codes (neutral, no flags) */
    .queue-locale-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .locale-code {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.78rem;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
      background: #f3f4f6;
      color: #374151;
    }

    .locale-code.locale-target {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .locale-arrow {
      color: #9ca3af;
      font-size: 0.75rem;
    }

    /* T09: Owner cell - mute empty states */
    .queue-owner-value {
      display: block;
      max-width: 11rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #374151;
      font-size: 0.88rem;
    }

    .queue-reviewer-value {
      display: block;
      max-width: 11rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #6b7280;
      font-size: 0.82rem;
    }

    .queue-owner-empty {
      display: block;
      color: #d1d5db;
      font-size: 0.82rem;
      font-style: italic;
    }

    /* T09: Due cell - mute empty states */
    .queue-due-date {
      display: block;
      color: #374151;
      font-size: 0.88rem;
    }

    .queue-due-empty {
      display: block;
      color: #d1d5db;
      font-size: 0.88rem;
    }

    .due-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* T09: Priority cell with visual indicator */
    .queue-priority-cell {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .priority-indicator {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .priority-indicator.priority-low {
      background: #d1d5db;
    }

    .priority-indicator.priority-normal {
      background: #3b82f6;
    }

    .priority-indicator.priority-high {
      background: #f59e0b;
    }

    .priority-indicator.priority-urgent {
      background: #ef4444;
      animation: pulse-urgent 1.5s ease-in-out infinite;
    }

    @keyframes pulse-urgent {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .priority-label {
      font-size: 0.82rem;
      color: #374151;
    }

    /* Legacy priority-pill support for mobile cards */
    .priority-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
    }

    .priority-pill.priority-low {
      background: #f1f5f9;
      color: #4b5563;
    }

    .priority-pill.priority-normal {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .priority-pill.priority-high {
      background: #fef3c7;
      color: #b45309;
    }

    .priority-pill.priority-urgent {
      background: #fee2e2;
      color: #b91c1c;
    }

    .due-none {
      background: #e5e7eb;
      color: #4b5563;
    }

    .due-on_track {
      background: #dcfce7;
      color: #166534;
    }

    .due-due_soon {
      background: #fef3c7;
      color: #b45309;
    }

    .due-overdue {
      background: #fee2e2;
      color: #b91c1c;
    }

    .queue-content-state {
      font-size: 0.82rem;
    }

    .queue-qa-chip {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.74rem;
      font-weight: 700;
    }

    .queue-qa-chip.is-blocked {
      background: #fee2e2;
      color: #b91c1c;
    }

    .queue-feedback-note {
      color: #92400e;
      font-size: 0.82rem;
    }

    .queue-action-cell {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .queue-action-group {
      display: inline-flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    /* T10: Selection styles */
    .queue-select-col {
      width: 3rem;
      padding: 0.75rem !important;
      text-align: center;
    }

    .queue-row-select,
    .queue-select-all {
      width: 1rem;
      height: 1rem;
      cursor: pointer;
      accent-color: #2563eb;
    }

    .assignment-queue-row.is-selected {
      background: #eff6ff;
    }

    .assignment-queue-row.is-selected:hover,
    .assignment-queue-row.is-selected:focus {
      background: #dbeafe;
    }

    /* T10: Bulk action styles now in input.css via .bulk-actions-overlay and .bulk-actions-bar */

    .filter-snapshot-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 1px solid #dbeafe;
      border-radius: 0.5rem;
      background: #eff6ff;
      color: #1e3a8a;
    }

    .filter-snapshot-copy {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
      font-size: 0.875rem;
    }

    .filter-snapshot-copy span {
      color: #1d4ed8;
      overflow-wrap: anywhere;
    }

    .filter-snapshot-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    /* T10: Mobile card selection */
    .mobile-card-select {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      padding-right: 0.5rem;
    }

    .mobile-card-title-group {
      flex: 1;
      min-width: 0;
    }

    [data-assignment-card].is-selected {
      border-color: #3b82f6;
      background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
    }

    /* T11: View mode toggle */
    .assignment-queue-view-mode {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 0.5rem 0;
    }

    .view-mode-buttons {
      display: flex;
      gap: 0.25rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 0.2rem;
      background: #f9fafb;
    }

    .view-mode-button {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.75rem;
      border: none;
      border-radius: 0.35rem;
      background: transparent;
      color: #6b7280;
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-mode-button:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .view-mode-button.is-active {
      background: #111827;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .view-mode-icon {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }

    .view-mode-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
    }

    .view-mode-count {
      color: #374151;
      font-weight: 500;
    }

    .view-mode-scope {
      color: #9ca3af;
      font-size: 0.8rem;
    }

    .view-mode-expand-all,
    .view-mode-collapse-all {
      background: transparent;
      border: none;
      color: #2563eb;
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    .view-mode-expand-all:hover,
    .view-mode-collapse-all:hover {
      color: #1d4ed8;
    }

    /* T11: Family group header row */
    .family-group-header {
      background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .family-group-header:hover {
      background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%);
    }

    .family-group-header:focus {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
    }

    .family-group-header-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .family-group-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border: none;
      border-radius: 0.35rem;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .family-group-toggle:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .family-group-expand-icon {
      font-size: 0.75rem;
      transition: transform 0.2s ease;
    }

    .family-group-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .family-group-label {
      font-weight: 600;
      color: #111827;
      font-size: 0.95rem;
    }

    .family-group-count {
      font-size: 0.78rem;
      color: #6b7280;
    }

    .family-group-summary {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .server-family-summary {
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .family-summary-pill {
      display: inline-flex;
      align-items: center;
      min-height: 1.5rem;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .family-summary-pill.is-blocked {
      background: #fef2f2;
      color: #991b1b;
    }

    .family-summary-pill.is-degraded {
      background: #fffbeb;
      color: #92400e;
    }

    .server-family-mobile-summary {
      padding: 0 0.75rem 0.75rem;
    }

    /* T11: Family group child row */
    .family-group-child {
      background: #ffffff;
    }

    .family-group-child:hover {
      background: #f9fafb;
    }

    .queue-content-cell-grouped {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .queue-content-indent {
      width: 1.5rem;
      flex-shrink: 0;
      border-left: 2px solid #e5e7eb;
      height: 1rem;
      margin-left: 0.5rem;
    }

    .queue-content-title-small {
      font-weight: 500;
      color: #374151;
      font-size: 0.9rem;
    }

    /* T11: Mobile grouped cards */
    .family-group-mobile-header {
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%);
      overflow: hidden;
    }

    .family-group-mobile-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.85rem 1rem;
      border: none;
      background: transparent;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .family-group-mobile-label {
      flex: 1;
      font-weight: 600;
      color: #111827;
      font-size: 0.95rem;
    }

    .family-group-mobile-count {
      color: #6b7280;
      font-size: 0.82rem;
    }

    .family-group-mobile-child {
      margin-left: 1rem;
      border-left: 2px solid #e5e7eb;
      padding-left: 0.5rem;
    }

    /* T11: Collapsed state styling */
    .family-group-header.is-collapsed + .family-group-child,
    .family-group-mobile-header.is-collapsed + .family-group-mobile-child {
      display: none;
    }

    /* T06: Action overflow menu styles */
    .queue-action-overflow-container {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      position: relative;
    }

    .queue-action-overflow-trigger {
      padding: 0.25rem 0.5rem;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 1.125rem;
      line-height: 1;
      color: #374151;
      transition: background-color 0.15s ease;
    }

    .queue-action-overflow-trigger:hover:not([disabled]) {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .queue-action-overflow-trigger:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .queue-action-overflow-trigger[aria-expanded="true"] {
      background: #f3f4f6;
      border-color: #6b7280;
    }

    .queue-action-overflow-menu {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 1000;
      min-width: 10rem;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 0.25rem 0;
      display: none;
    }

    .queue-action-overflow-menu[hidden] {
      display: none !important;
    }

    .queue-action-overflow-menu:not([hidden]) {
      display: block;
    }

    .queue-action-menu-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.5rem 1rem;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: #374151;
      transition: background-color 0.15s ease;
    }

    .queue-action-menu-item:hover:not([disabled]) {
      background: #f3f4f6;
    }

    .queue-action-menu-item:focus {
      background: #e5e7eb;
      outline: none;
    }

    .queue-action-menu-item[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      color: #9ca3af;
    }

    .action-pending-label {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.125rem;
    }

    /* Mobile card action overflow adjustments */
    .mobile-card-actions .queue-action-overflow-container {
      width: 100%;
    }

    .mobile-card-actions .queue-action-overflow-container > button:first-child {
      flex: 1;
    }

    /* Responsive column hiding for narrower viewports */
    @media (max-width: 1440px) {
      .queue-priority-col {
        display: none;
      }
    }

    @media (max-width: 1280px) {
      .queue-priority-col,
      .queue-due-col {
        display: none;
      }
    }

    @media (max-width: 1024px) {
      .queue-priority-col,
      .queue-due-col,
      .queue-owner-col {
        display: none;
      }
    }

    @media (max-width: 900px) {
      .assignment-queue-screen {
        padding: 1rem;
      }

      .assignment-queue-table {
        min-width: 760px;
      }

      .assignment-queue-view-mode {
        flex-direction: column;
        align-items: flex-start;
      }

      .view-mode-info {
        flex-wrap: wrap;
      }

      .queue-priority-col,
      .queue-due-col,
      .queue-owner-col,
      .queue-locale-col {
        display: none;
      }

      /* T06: Touch-friendly overflow menu for mobile */
      .queue-action-overflow-menu {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto;
        border-radius: 0.75rem 0.75rem 0 0;
        max-height: 60vh;
        overflow-y: auto;
      }

      .queue-action-menu-item {
        padding: 1rem;
        min-height: 44px;
        font-size: 1rem;
      }

      .queue-action-overflow-trigger {
        min-width: 44px;
        min-height: 44px;
      }
    }
  `;
}
function Ct() {
  if (typeof document > "u") return;
  const a = "assignment-queue-styles";
  if (document.getElementById(a)) return;
  const e = document.createElement("style");
  e.id = a, e.textContent = Ft(), document.head.appendChild(e);
}
function Lt(a, e) {
  Ct();
  const t = new ve(e);
  return t.mount(a), t;
}
function Pt(a, e) {
  !a || a.dataset.assignmentQueueEnhanced === "true" || (a.dataset.assignmentQueueEnhanced = "true", Je(a, { endpoint: a.dataset.actionEndpoint || e }), he(a));
}
function Tt() {
  if (typeof window > "u" || !window.location) return !1;
  const a = (pe(window.location) ?? new URLSearchParams()).get("translation_client_render");
  return a === "1" || a === "true";
}
function Xt(a) {
  const e = a.dataset.endpoint || a.dataset.assignmentListEndpoint || "";
  if (!e) return null;
  if (a.dataset.ssrEnhanced === "true" && !Tt())
    return Pt(a, e), null;
  const t = typeof window < "u" ? pe(window.location) : null;
  return Lt(a, {
    endpoint: e,
    bulkActionEndpoint: a.dataset.bulkActionEndpoint || a.dataset.bulkActionsEndpoint || "",
    bulkSnapshotEndpoint: a.dataset.bulkSnapshotEndpoint || "",
    editorBasePath: a.dataset.editorBasePath || "",
    title: a.dataset.title,
    description: a.dataset.description,
    initialPresetId: a.dataset.initialPresetId || Ee(t ?? new URLSearchParams(), "preset") || ""
  });
}
function ce(a) {
  const e = a.trim();
  if (!e) return "/admin/api/translations/assignment-actions/bulk";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/bulk` : "/admin/api/translations/assignment-actions/bulk";
}
function ue(a) {
  const e = a.trim();
  if (!e) return "/admin/api/translations/assignment-actions/snapshot";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/snapshot` : "/admin/api/translations/assignment-actions/snapshot";
}
export {
  D as AssignmentQueueRequestError,
  ve as AssignmentQueueScreen,
  ee as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  A as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  Rt as applyOptimisticAssignmentAction,
  We as buildAssignmentActionURL,
  gt as buildAssignmentListQuery,
  yt as buildAssignmentListURL,
  $t as claimAssignment,
  Lt as createAssignmentQueueScreen,
  qt as fetchAssignmentList,
  Ft as getAssignmentQueueStyles,
  he as initAssignmentQueueFilterTypeaheads,
  Xt as initAssignmentQueueScreen,
  Je as initAssignmentSSRRowActions,
  kt as normalizeAssignmentActionResponse,
  pt as normalizeAssignmentListMeta,
  _t as normalizeAssignmentListResponse,
  q as normalizeAssignmentListRow,
  M as presetToQueryState,
  xt as releaseAssignment,
  ce as resolveAssignmentBulkActionEndpoint,
  ue as resolveAssignmentBulkSnapshotEndpoint,
  vt as snapshotFiltersFromQueryState
};

//# sourceMappingURL=index.js.map
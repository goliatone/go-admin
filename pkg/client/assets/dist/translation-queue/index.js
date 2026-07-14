import { escapeAttribute as c, escapeHTML as p } from "../shared/html.js";
import { httpRequest as j, readHTTPError as Ee } from "../shared/transport/http-client.js";
import { extractStructuredError as Ie } from "../toast/error-helpers.js";
import { T as Ce, Y as Q, c as Le, h as Pe, i as Fe, l as Te, o as U, t as Me, v as A, x as De, y as ne } from "../chunks/grouped-mode-BKMTJtyG.js";
import "../chunks/status-vocabulary-Bdx_bn1-.js";
import { buildEndpointURL as _e, getNumberSearchParam as oe, getStringSearchParam as we, readLocationSearchParams as qe, setNumberSearchParam as le, setSearchParam as b } from "../shared/query-state/url-state.js";
import { StatefulController as Be } from "../shared/stateful-controller.js";
import { a as je, n as ze, r as Ne, t as Ge } from "../chunks/entity-renderer-CFkRabFN.js";
import { t as Oe } from "../chunks/searchbox-C75-stnC.js";
import { n as Qe } from "../chunks/behaviors-3r2n03MZ.js";
import { asNumber as g, asRecord as h, asString as o, asStringArray as de } from "../shared/coercion.js";
import { $ as I, A as Ue, D as He, E as Ke, G as Ve, J as Ye, K as We, O as Xe, Q as Je, R as Ze, S as w, T as et, X as C, Y as L, Z as tt, _ as it, b as at, k as st, q as rt, v as ce } from "../chunks/translation-shared-Cy6-aSmF.js";
import { formatTranslationShortDateTime as H } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as D } from "../shared/record-normalization.js";
import { buildAssignmentActionURL as nt, initAssignmentSSRRowActions as ot } from "../translation-actions/assignment-row-actions.js";
var ae, G = class extends Error {
  constructor(i) {
    super(i.message), this.name = "AssignmentQueueRequestError", this.status = i.status, this.code = i.code ?? null, this.metadata = i.metadata ?? null, this.requestId = i.requestId, this.traceId = i.traceId;
  }
}, E = [
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
], se = [
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
function R(i) {
  const e = h(i);
  return {
    enabled: e.enabled === !0,
    reason: o(e.reason) || void 0,
    reason_code: o(e.reason_code) || void 0,
    permission: o(e.permission) || void 0
  };
}
function lt(i) {
  const e = h(i), t = o(e.last_rejection_reason), a = o(e.last_reviewer_id);
  if (!(!t && !a))
    return {
      last_rejection_reason: t || void 0,
      last_reviewer_id: a || void 0
    };
}
function dt(i) {
  const e = h(i), t = e.enabled === !0, a = g(e.warning_count), s = g(e.blocker_count), n = g(e.finding_count);
  if (!(!t && a <= 0 && s <= 0 && n <= 0))
    return {
      enabled: t,
      warning_count: a,
      blocker_count: s,
      finding_count: n
    };
}
function ee(i) {
  switch (o(i)) {
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
      return o(i);
    default:
      return "open";
  }
}
function K(i, e) {
  const t = i.headers.get(e);
  return typeof t == "string" ? t.trim() : "";
}
function ct(i) {
  const e = K(i, "x-request-id"), t = K(i, "x-correlation-id"), a = K(i, "x-trace-id") || t || void 0;
  return {
    requestId: e || void 0,
    traceId: a
  };
}
async function ut(i, e) {
  return typeof i.clone == "function" ? Ie(i.clone()) : {
    textCode: null,
    message: await Ee(i, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function z(i, e) {
  const t = await ut(i, e), a = ct(i);
  return new G({
    message: t.message || `${e}: ${i.status}`,
    status: i.status,
    code: t.textCode,
    metadata: t.metadata,
    requestId: a.requestId,
    traceId: a.traceId
  });
}
function pt(i) {
  const e = h(i), t = o(e.id), a = o(e.label);
  if (!t || !a) return null;
  const s = h(e.query);
  return {
    id: t,
    label: a,
    description: o(e.description) || void 0,
    review_state: o(e.review_state) || void 0,
    query: {
      status: o(s.status) || void 0,
      assignee_id: o(s.assignee_id) || void 0,
      reviewer_id: o(s.reviewer_id) || void 0,
      due_state: o(s.due_state) || void 0,
      locale: o(s.locale) || void 0,
      priority: o(s.priority) || void 0,
      entity_type: o(s.entity_type) || void 0,
      title__ilike: o(s.title__ilike) || void 0,
      path__ilike: o(s.path__ilike) || void 0,
      family_id: o(s.family_id) || void 0,
      sort: o(s.sort) || void 0,
      order: o(s.order) || void 0
    }
  };
}
function ue(i, e = E) {
  const t = (Array.isArray(i) ? i : []).map((a) => pt(a)).filter((a) => a !== null);
  return t.length ? t : e.map(B);
}
function B(i) {
  return {
    id: i.id,
    label: i.label,
    description: i.description,
    review_state: i.review_state,
    query: { ...i.query }
  };
}
function ht(i) {
  const e = h(i), t = o(e.value), a = o(e.label) || t;
  return t ? {
    value: t,
    label: a,
    description: o(e.description) || void 0
  } : null;
}
function mt(i) {
  const e = h(i), t = o(e.key || e.name), a = o(e.name || e.key);
  if (!t || !a) return null;
  const s = Array.isArray(e.options) ? e.options.map((r) => ht(r)).filter((r) => r !== null) : [], n = o(e.renderer), l = o(e.fallback);
  return {
    key: t,
    name: a,
    label: o(e.label) || y(a),
    value: o(e.value),
    current_value: o(e.current_value || e.value),
    placeholder: o(e.placeholder),
    clear_url: o(e.clear_url) || void 0,
    type: o(e.type) || (s.length ? "select" : "text"),
    options: s,
    enhanced: e.enhanced === !0,
    endpoint_url: o(e.endpoint_url) || void 0,
    endpoint_search_param: o(e.endpoint_search_param) || void 0,
    endpoint_hydrate_param: o(e.endpoint_hydrate_param) || void 0,
    endpoint_value_field: o(e.endpoint_value_field) || void 0,
    endpoint_label_field: o(e.endpoint_label_field) || void 0,
    renderer: n || void 0,
    fallback: l || void 0
  };
}
function ft(i) {
  return (Array.isArray(i) ? i : []).map((e) => mt(e)).filter((e) => e !== null);
}
function P(i) {
  return Array.from(new Set(i.map((e) => o(e)).filter(Boolean)));
}
function gt(i, e) {
  const t = o(i[e.valueField] ?? i.value ?? i.id);
  return t ? {
    id: t,
    label: o(i[e.labelField] ?? i.label ?? i.name) || t,
    description: o(i.description) || void 0,
    icon: o(i.icon || i.avatar_url || i.avatar) || void 0,
    metadata: i,
    data: i
  } : null;
}
function Se(i, e) {
  const t = h(i);
  return (Array.isArray(i) ? i : Array.isArray(t.data) ? t.data : Array.isArray(t.options) ? t.options : []).map((a) => gt(h(a), e)).filter((a) => a !== null);
}
function vt(i) {
  return i === "user" ? new ze({
    avatarField: "avatar_url",
    emailField: "email",
    roleField: "role"
  }) : i === "entity" || i === "family" ? new Ge({
    showIcon: i === "entity",
    metadataFields: i === "family" ? ["entity_type"] : []
  }) : new Oe();
}
function yt(i) {
  const e = o(i.dataset.filterName), t = o(i.dataset.filterEndpointUrl);
  if (!e || !t) return null;
  const a = o(i.dataset.filterRenderer), s = o(i.dataset.filterFallback);
  return {
    controlType: o(i.dataset.filterControlType) || "typeahead",
    name: e,
    endpointURL: t,
    searchParam: o(i.dataset.filterSearchParam) || "search",
    hydrateParam: o(i.dataset.filterHydrateParam) || "selected",
    valueField: o(i.dataset.filterValueField) || "value",
    labelField: o(i.dataset.filterLabelField) || "label",
    renderer: a || "simple",
    fallback: s || "raw"
  };
}
function V(i, e, t) {
  i.dispatchEvent(new CustomEvent("queue-filter-change", {
    bubbles: !0,
    detail: {
      name: e.name,
      value: t
    }
  }));
}
async function bt(i, e, t, a) {
  const s = e.value.trim();
  if (!s) return;
  const n = new URL(t.endpointURL, window.location.origin);
  n.searchParams.set(t.hydrateParam, s);
  try {
    const l = await fetch(n.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: a
    });
    if (!l.ok) throw new Error(`Hydration failed: ${l.status}`);
    const r = Se(await l.json(), t).find((d) => d.id === s);
    if (!r || e.value.trim() !== s) return;
    e.value = r.id, i.value = r.label || r.id;
  } catch {
    if (a?.aborted) return;
    i.dataset.filterEnhancedState = "error";
  }
}
var te = /* @__PURE__ */ new WeakMap();
function _t(i) {
  if (i.dataset.filterEnhancedInitialized === "true") return !1;
  const e = yt(i), t = i.querySelector('[data-filter-enhanced-input="true"]');
  if (!e || !t || !t.name) return !1;
  const a = document.createElement("input");
  a.type = "hidden", a.name = e.name, a.value = t.value, a.dataset.filterCanonicalInput = "true", t.removeAttribute("name"), t.dataset.filterDisplayInput = "true", t.setAttribute("aria-expanded", "false"), i.appendChild(a);
  const s = new Ne({
    endpoint: e.endpointURL,
    queryParam: e.searchParam,
    params: e.controlType === "remote_select" ? { per_page: "25" } : { per_page: "10" },
    transform: (m) => Se(m, e)
  }), n = () => {
    a.value = t.value.trim(), t.dataset.filterEnhancedState = "";
  };
  t.addEventListener("input", n);
  const l = new je({
    input: t,
    container: i,
    resolver: s,
    renderer: vt(e.renderer),
    minChars: e.controlType === "remote_select" ? 0 : 1,
    debounceMs: 200,
    maxResults: e.controlType === "remote_select" ? 25 : 10,
    emptyText: "No matching options",
    loadingText: "Loading options...",
    onSelect: (m) => {
      a.value = m.id, t.dataset.filterEnhancedState = "selected", V(i, e, a.value);
    },
    onClear: () => {
      a.value = "", t.dataset.filterEnhancedState = "", V(i, e, "");
    },
    onError: () => {
      t.dataset.filterEnhancedState = "error";
    }
  });
  try {
    l.init();
  } catch {
    return t.removeEventListener("input", n), a.remove(), t.name = e.name, delete t.dataset.filterDisplayInput, !1;
  }
  const r = () => {
    e.controlType === "remote_select" && !t.value.trim() && l.search("");
  }, d = () => {
    t.dataset.filterEnhancedState !== "selected" && (a.value = t.value.trim(), V(i, e, a.value));
  };
  t.addEventListener("focus", r), t.addEventListener("change", d), i.dataset.filterEnhancedInitialized = "true";
  const u = new AbortController();
  return te.set(i, { destroy() {
    u.abort(), l.destroy(), t.removeEventListener("input", n), t.removeEventListener("focus", r), t.removeEventListener("change", d), delete i.dataset.filterEnhancedInitialized, te.delete(i);
  } }), bt(t, a, e, u.signal), !0;
}
function ke(i) {
  return typeof document > "u" ? 0 : Array.from((i ?? document).querySelectorAll('[data-filter-enhanced="true"]')).reduce((t, a) => t + (_t(a) ? 1 : 0), 0);
}
function pe(i) {
  return typeof document > "u" ? 0 : Array.from((i ?? document).querySelectorAll('[data-filter-enhanced="true"]')).reduce((t, a) => {
    const s = te.get(a);
    return s ? (s.destroy(), t + 1) : t;
  }, 0);
}
function wt(i) {
  const e = h(i), t = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((s) => o(s)).filter((s) => !!s) : [], a = h(e.default_sort);
  return {
    page: g(e.page) || 1,
    per_page: g(e.per_page) || 25,
    total: g(e.total),
    updated_at: o(e.updated_at) || void 0,
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
      key: o(a.key) || "updated_at",
      order: o(a.order) || "desc"
    },
    saved_filter_presets: ue(e.saved_filter_presets, E),
    saved_review_filter_presets: ue(e.saved_review_filter_presets, se),
    default_review_filter_preset: o(e.default_review_filter_preset) || void 0,
    enhanced_filter_selects: e.enhanced_filter_selects === !0,
    filter_controls: ft(e.filter_controls),
    review_actor_id: o(e.review_actor_id) || void 0,
    review_aggregate_counts: D(e.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    review_aggregate_counts_unavailable: de(e.review_aggregate_counts_unavailable),
    review_aggregate_counts_degraded: de(e.review_aggregate_counts_degraded),
    grouping: qt(e.grouping),
    family_total: g(e.family_total) || void 0,
    assignment_total: g(e.assignment_total) || void 0
  };
}
function qt(i) {
  const e = h(i);
  if (!e) return;
  const t = h(h(e.capabilities).server_family), a = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((s) => o(s)).filter((s) => !!s) : void 0;
  return {
    enabled: e.enabled === !0,
    mode: o(e.mode) || "family_id",
    group_by: o(e.group_by) || "family_id",
    scope: o(e.scope) || "current_page",
    row_count: g(e.row_count),
    group_count: g(e.group_count),
    assignment_count: g(e.assignment_count),
    family_total: g(e.family_total) || void 0,
    assignment_total: g(e.assignment_total) || void 0,
    supported_modes: Array.isArray(e.supported_modes) ? e.supported_modes.map((s) => o(s)).filter(Boolean) : ["family_id"],
    supported_sort_keys: a,
    strategy: o(e.strategy) || "page_local",
    capabilities: { server_family: {
      supported: t.supported === !0,
      reason_code: o(t.reason_code) || void 0
    } }
  };
}
function St(i) {
  const e = h(i), t = Array.isArray(e.filter_summary) ? e.filter_summary : [];
  return {
    selectionScope: "filter_snapshot",
    snapshotId: o(e.snapshot_id),
    requested: g(e.requested),
    filters: h(e.filters),
    filterSummary: t.map((a) => o(a)).filter(Boolean),
    createdAt: o(e.created_at),
    expiresAt: o(e.expires_at)
  };
}
function he(i) {
  const e = o(i).toLowerCase();
  return e === "low" || e === "normal" || e === "high" || e === "urgent" ? e : "";
}
function kt(i, e, t = {}) {
  return [
    "translation_queue_filter_snapshot",
    o(i),
    o(e),
    o(t.assigneeId),
    o(t.priority)
  ].join(":");
}
var $t = [
  "status",
  "assignee_id",
  "reviewer_id",
  "due_state",
  "locale",
  "target_locale",
  "priority",
  "entity_type",
  "content_type",
  "type",
  "title__ilike",
  "title__contains",
  "source_title__contains",
  "source_title__ilike",
  "path__ilike",
  "path__contains",
  "source_path__contains",
  "source_path__ilike",
  "review_state",
  "family_id",
  "tenant_id",
  "org_id",
  "channel",
  "page",
  "per_page",
  "sort",
  "order",
  "group_by",
  "group_strategy"
];
function _(i, e) {
  for (const t of e) {
    const a = we(i, t);
    if (a) return a;
  }
}
function me(i) {
  if (i === void 0 || !Number.isFinite(i)) return;
  const e = Math.floor(i);
  return e >= 1 ? e : void 0;
}
function fe(i) {
  return {
    tenantId: i.tenantId,
    orgId: i.orgId,
    channel: i.channel
  };
}
function F(i, e) {
  const t = new URLSearchParams();
  return b(t, "tenant_id", e.tenantId), b(t, "org_id", e.orgId), _e(i, t, { preserveAbsolute: !0 });
}
function xt(i) {
  return $t.some((e) => i.has(e));
}
function At(i, e = {}) {
  const t = _(i, ["due_state"]), a = _(i, ["review_state"]), s = _(i, ["sort"]), n = _(i, ["order"]), l = _(i, ["group_by"]), r = _(i, ["group_strategy"]), d = {
    status: _(i, ["status"]),
    assigneeId: _(i, ["assignee_id"]),
    reviewerId: _(i, ["reviewer_id"]),
    dueState: t === "none" || t === "on_track" || t === "due_soon" || t === "overdue" ? t : void 0,
    locale: _(i, ["locale", "target_locale"]),
    priority: _(i, ["priority"]),
    entityType: _(i, [
      "entity_type",
      "content_type",
      "type"
    ]),
    titleContains: _(i, [
      "title__ilike",
      "title__contains",
      "source_title__contains",
      "source_title__ilike"
    ]),
    pathContains: _(i, [
      "path__ilike",
      "path__contains",
      "source_path__contains",
      "source_path__ilike"
    ]),
    reviewState: a === "qa_blocked" ? a : void 0,
    familyId: _(i, ["family_id"]),
    tenantId: _(i, ["tenant_id"]) || e.tenantId,
    orgId: _(i, ["org_id"]) || e.orgId,
    channel: _(i, ["channel"]) || e.channel,
    page: me(oe(i, "page")),
    perPage: me(oe(i, "per_page")),
    sort: s,
    order: n === "asc" || n === "desc" ? n : void 0,
    groupBy: l === "family_id" ? l : void 0,
    groupStrategy: r === "page_local" || r === "server_family" ? r : void 0
  };
  return Object.fromEntries(Object.entries(d).filter(([, u]) => u !== void 0));
}
function Rt(i = {}) {
  const e = new URLSearchParams();
  return b(e, "tenant_id", i.tenantId), b(e, "org_id", i.orgId), b(e, "channel", i.channel), b(e, "status", i.status), b(e, "assignee_id", i.assigneeId), b(e, "reviewer_id", i.reviewerId), b(e, "due_state", i.dueState), b(e, "locale", i.locale), b(e, "priority", i.priority), b(e, "entity_type", i.entityType), b(e, "title__ilike", i.titleContains), b(e, "path__ilike", i.pathContains), b(e, "review_state", i.reviewState), b(e, "family_id", i.familyId), le(e, "page", i.page, { min: 1 }), le(e, "per_page", i.perPage, { min: 1 }), b(e, "sort", i.sort), b(e, "order", i.order), b(e, "group_by", i.groupBy), b(e, "group_strategy", i.groupStrategy), e.toString();
}
function Et(i = {}) {
  const e = {}, t = (a, s) => {
    const n = o(s);
    n && (e[a] = n);
  };
  return t("status", i.status), t("assignee_id", i.assigneeId), t("reviewer_id", i.reviewerId), t("due_state", i.dueState), t("locale", i.locale), t("priority", i.priority), t("entity_type", i.entityType), t("title__ilike", i.titleContains), t("path__ilike", i.pathContains), t("review_state", i.reviewState), t("family_id", i.familyId), t("tenant_id", i.tenantId), t("org_id", i.orgId), t("channel", i.channel), t("sort", i.sort), t("order", i.order), e;
}
function It(i, e = {}) {
  const t = Rt(e);
  return t ? _e(i, new URLSearchParams(t), { preserveAbsolute: !0 }) : i;
}
function k(i) {
  const e = h(i);
  return {
    id: o(e.id),
    family_id: o(e.family_id),
    entity_type: o(e.entity_type),
    source_record_id: o(e.source_record_id),
    target_record_id: o(e.target_record_id),
    source_locale: o(e.source_locale),
    target_locale: o(e.target_locale),
    work_scope: o(e.work_scope) || void 0,
    source_title: o(e.source_title),
    source_path: o(e.source_path),
    assignee_id: o(e.assignee_id),
    assignee_label: o(e.assignee_label) || void 0,
    reviewer_id: o(e.reviewer_id),
    reviewer_label: o(e.reviewer_label) || void 0,
    assignment_type: o(e.assignment_type),
    content_state: o(e.content_state),
    queue_state: ee(e.queue_state),
    status: ee(e.status),
    priority: o(e.priority) || "normal",
    due_state: o(e.due_state) || "none",
    due_date: o(e.due_date) || void 0,
    row_version: g(e.row_version || e.version),
    version: g(e.version || e.row_version),
    updated_at: o(e.updated_at),
    created_at: o(e.created_at),
    actions: {
      claim: R(h(e.actions).claim),
      release: R(h(e.actions).release)
    },
    review_actions: {
      submit_review: R(h(e.review_actions).submit_review),
      approve: R(h(e.review_actions).approve),
      reject: R(h(e.review_actions).reject),
      archive: R(h(e.review_actions).archive)
    },
    last_rejection_reason: o(e.last_rejection_reason) || void 0,
    review_feedback: lt(e.review_feedback),
    qa_summary: dt(e.qa_summary)
  };
}
function Ct(i, e) {
  const t = h(i), a = h(t.expansion), s = h(a.params), n = o(t.family_id);
  return {
    id: o(t.id) || `family:${n}`,
    row_type: "family",
    family_id: n,
    family_label: o(t.family_label) || o(t.source_title) || n,
    entity_type: o(t.entity_type),
    source_record_id: o(t.source_record_id),
    source_locale: o(t.source_locale),
    source_title: o(t.source_title),
    source_path: o(t.source_path),
    assignment_count: g(t.assignment_count),
    locale_count: g(t.locale_count),
    target_locales: Array.isArray(t.target_locales) ? t.target_locales.map((l) => o(l)).filter(Boolean) : [],
    status_counts: D(t.status_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    due_state_counts: D(t.due_state_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    priority_counts: D(t.priority_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    family_blocker_count: t.family_blocker_count === null || t.family_blocker_count === void 0 ? null : g(t.family_blocker_count),
    family_blocker_count_available: t.family_blocker_count_available === !0,
    family_blocker_count_reason: o(t.family_blocker_count_reason),
    action_hints: D(t.action_hints, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    expansion: {
      href: o(a.href),
      route: o(a.route),
      params: Object.fromEntries(Object.entries(s).map(([l, r]) => [l, o(r)])),
      query: h(a.query)
    },
    expanded: e.has(n),
    children: []
  };
}
function Lt(i) {
  const e = h(i), t = wt(e.meta), a = Array.isArray(e.data) ? e.data : [];
  return t.grouping?.enabled ? {
    data: a.filter((s) => !!s && typeof s == "object" && !Array.isArray(s)).map((s) => ({ ...s })),
    meta: t
  } : {
    data: a.map((s) => k(s)),
    meta: t
  };
}
async function Pt(i) {
  const e = await j(i.href, { method: "GET" });
  if (!e.ok) throw await z(e, "Failed to load family assignments");
  const t = h(await e.json()), a = h(t.meta);
  return {
    rows: (Array.isArray(t.data) ? t.data : []).map((s) => k(s)),
    meta: {
      page: g(a.page) || 1,
      per_page: g(a.per_page) || 25,
      total: g(a.total),
      has_next: a.has_next === !0
    }
  };
}
function Ft(i) {
  const e = h(i), t = h(e.meta), a = h(e.data);
  return {
    data: {
      assignment_id: o(a.assignment_id),
      status: ee(a.status),
      row_version: g(a.row_version),
      updated_at: o(a.updated_at),
      assignment: k(a.assignment)
    },
    meta: { idempotency_hit: t.idempotency_hit === !0 }
  };
}
async function Tt(i, e = {}, t = {}) {
  const a = await j(It(i, e), {
    method: "GET",
    signal: t.signal
  });
  if (!a.ok) throw await z(a, "Failed to load assignments");
  return Lt(await a.json());
}
async function re(i, e, t, a) {
  const s = { expected_version: a.expected_version };
  a.idempotency_key && (s.idempotency_key = a.idempotency_key), a.reason && (s.reason = a.reason), a.channel && (s.channel = a.channel);
  const n = await j(nt(i, e, t), {
    method: "POST",
    json: s
  });
  if (!n.ok) throw await z(n, `Failed to ${t} assignment`);
  return Ft(await n.json());
}
function Mt(i, e, t) {
  return re(i, e, "claim", t);
}
function Dt(i, e, t) {
  return re(i, e, "release", t);
}
function T(i) {
  return {
    status: i.query.status,
    assigneeId: i.query.assignee_id,
    reviewerId: i.query.reviewer_id,
    dueState: i.query.due_state,
    locale: i.query.locale,
    priority: i.query.priority,
    entityType: i.query.entity_type,
    titleContains: i.query.title__ilike,
    pathContains: i.query.path__ilike,
    reviewState: i.review_state,
    familyId: i.query.family_id,
    sort: i.query.sort,
    order: i.query.order,
    page: 1
  };
}
function ge(i, e) {
  return `queue-${i}-${e.id}-${e.version}-${Date.now()}`;
}
function Bt(i, e) {
  return `queue-${i}-${e.id}-${e.version}-${Date.now()}`;
}
function jt(i) {
  const e = o(i);
  if (!e) return null;
  const t = E.find((s) => s.id === e);
  if (t) return {
    kind: "standard",
    preset: t
  };
  const a = se.find((s) => s.id === e);
  return a ? {
    kind: "review",
    preset: a
  } : null;
}
function S(i) {
  return {
    ...i,
    actions: {
      claim: { ...i.actions.claim },
      release: { ...i.actions.release }
    },
    review_actions: {
      submit_review: { ...i.review_actions.submit_review },
      approve: { ...i.review_actions.approve },
      reject: { ...i.review_actions.reject },
      archive: { ...i.review_actions.archive }
    },
    review_feedback: i.review_feedback ? { ...i.review_feedback } : void 0,
    qa_summary: i.qa_summary ? { ...i.qa_summary } : void 0
  };
}
function Y(i, e) {
  return {
    enabled: !1,
    permission: i,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function zt(i, e) {
  const t = S(i);
  return e === "claim" ? (t.queue_state = "in_progress", t.status = "in_progress", t.actions.claim = Y(i.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), t.actions.release = {
    enabled: !0,
    permission: i.actions.release.permission
  }, t.review_actions.submit_review = {
    enabled: !0,
    permission: i.review_actions.submit_review.permission
  }, t) : (t.assignment_type = "open_pool", t.queue_state = "open", t.status = "open", t.assignee_id = "", t.actions.claim = {
    enabled: !0,
    permission: i.actions.claim.permission
  }, t.actions.release = Y(i.actions.release.permission, "assignment must be assigned or in progress before it can be released"), t.review_actions.submit_review = Y(i.review_actions.submit_review.permission, "assignment must be in progress"), t);
}
function M(i, e) {
  return i instanceof G ? {
    kind: i.code === "VERSION_CONFLICT" ? "conflict" : "error",
    message: i.message || e,
    code: i.code,
    requestId: i.requestId,
    traceId: i.traceId
  } : i instanceof Error ? {
    kind: "error",
    message: i.message || e
  } : {
    kind: "error",
    message: e
  };
}
function $e(i) {
  return o(i.queue_state || i.status);
}
function xe(i) {
  return i === "review" || i === "in_review";
}
function Nt(i) {
  return xe($e(i)) ? !0 : !!(i.review_actions.approve.enabled || i.review_actions.reject.enabled);
}
function Gt(i) {
  return !!i.review_actions.archive.enabled;
}
function W(i, e) {
  const t = [], a = e.has(`claim:${i.id}`), s = e.has(`release:${i.id}`), n = e.has(`approve:${i.id}`), l = e.has(`reject:${i.id}`), r = e.has(`archive:${i.id}`), d = i.actions.claim.enabled && !a;
  t.push({
    type: "claim",
    category: "lifecycle",
    label: a ? "Claiming…" : "Claim",
    enabled: d,
    disabledReason: i.actions.claim.reason || "Claim assignment",
    pending: a,
    pendingLabel: "Claiming assignment…",
    dataAction: "claim",
    ariaLabel: d ? "Claim assignment" : i.actions.claim.reason || "Cannot claim assignment",
    buttonClass: w
  });
  const u = i.actions.release.enabled && !s;
  if (t.push({
    type: "release",
    category: "lifecycle",
    label: s ? "Releasing…" : "Release",
    enabled: u,
    disabledReason: i.actions.release.reason || "Release assignment",
    pending: s,
    pendingLabel: "Releasing assignment…",
    dataAction: "release",
    ariaLabel: u ? "Release assignment" : i.actions.release.reason || "Cannot release assignment",
    buttonClass: w
  }), Nt(i)) {
    const m = i.review_actions.approve.enabled && !n;
    t.push({
      type: "approve",
      category: "review",
      label: n ? "Approving…" : "Approve",
      enabled: m,
      disabledReason: i.review_actions.approve.reason || "Approve assignment",
      pending: n,
      pendingLabel: "Approving assignment…",
      dataAction: "approve",
      ariaLabel: m ? "Approve assignment" : i.review_actions.approve.reason || "Cannot approve assignment",
      buttonClass: at
    });
    const v = i.review_actions.reject.enabled && !l;
    t.push({
      type: "reject",
      category: "review",
      label: l ? "Rejecting…" : "Reject",
      enabled: v,
      disabledReason: i.review_actions.reject.reason || "Reject assignment",
      pending: l,
      pendingLabel: "Rejecting assignment…",
      dataAction: "reject",
      ariaLabel: v ? "Reject assignment" : i.review_actions.reject.reason || "Cannot reject assignment",
      buttonClass: it
    });
  }
  if (Gt(i)) {
    const m = i.review_actions.archive.enabled && !r;
    t.push({
      type: "archive",
      category: "management",
      label: r ? "Archiving…" : "Archive",
      enabled: m,
      disabledReason: i.review_actions.archive.reason || "Archive assignment",
      pending: r,
      pendingLabel: "Archiving assignment…",
      dataAction: "archive",
      ariaLabel: m ? "Archive assignment" : i.review_actions.archive.reason || "Cannot archive assignment",
      buttonClass: w
    });
  }
  return t;
}
function X(i, e) {
  if (xe($e(e))) {
    const s = i.find((n) => n.category === "review" && n.enabled);
    if (s) return s;
  }
  const t = i.find((s) => s.type === "claim" && s.enabled);
  if (t) return t;
  const a = i.find((s) => s.enabled);
  return a || i[0];
}
function J(i, e, t) {
  const a = (l) => l === "review" ? "review" : l === "management" ? "manage" : "lifecycle";
  if (e.length <= 2) return e.map((l) => `
      <button
        type="button"
        class="${l.buttonClass}"
        data-action="${c(l.dataAction)}"
        data-action-group="${c(a(l.category))}"
        data-assignment-id="${c(i.id)}"
        ${l.enabled ? "" : "disabled"}
        aria-disabled="${l.enabled ? "false" : "true"}"
        title="${c(l.pending ? l.pendingLabel : l.disabledReason)}"
      >
        ${p(l.label)}
      </button>
    `).join("");
  const s = e.filter((l) => l !== t), n = `menu-${i.id}`;
  return `
    <div class="queue-action-overflow-container">
      <button
        type="button"
        class="${t.buttonClass}"
        data-action="${c(t.dataAction)}"
        data-action-group="${c(a(t.category))}"
        data-assignment-id="${c(i.id)}"
        ${t.enabled ? "" : "disabled"}
        aria-disabled="${t.enabled ? "false" : "true"}"
        title="${c(t.pending ? t.pendingLabel : t.disabledReason)}"
      >
        ${p(t.label)}
      </button>
      <button
        type="button"
        class="queue-action-overflow-trigger"
        data-overflow-menu="${c(i.id)}"
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded="false"
      >
        ⋮
      </button>
      <div
        class="queue-action-overflow-menu"
        id="${c(n)}"
        role="menu"
        hidden
      >
        ${s.map((l) => `
          <button
            type="button"
            role="menuitem"
            class="queue-action-menu-item"
            data-action="${c(l.dataAction)}"
            data-action-group="${c(a(l.category))}"
            data-assignment-id="${c(i.id)}"
            ${l.enabled ? "" : "disabled"}
            aria-disabled="${l.enabled ? "false" : "true"}"
            title="${c(l.pending ? l.pendingLabel : l.disabledReason)}"
          >
            ${p(l.label)}
            ${l.pending ? `<span class="action-pending-label">${p(l.pendingLabel)}</span>` : ""}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}
function Ot(i, e) {
  return e?.aborted ? !0 : !!(i && typeof i == "object" && "name" in i && i.name === "AbortError");
}
function ve(i, e) {
  const t = i.target;
  return !!(t && t !== e && t.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"]'));
}
var Ae = class q extends Be {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.feedback = null, this.error = null, this.refreshError = null, this.pendingActions = /* @__PURE__ */ new Set(), this.listLoadController = null, this.listLoadGeneration = 0, this.committedPresentation = null, this.isRefreshing = !1, this.mounted = !1, this.liveMessage = "", this.handleContainerClick = (l) => {
      const r = l.target;
      (!(r instanceof Element) || !r.closest(".queue-action-overflow-container")) && (this.container?.querySelectorAll(".queue-action-overflow-menu").forEach((d) => {
        d.hidden = !0;
      }), this.container?.querySelectorAll("[data-overflow-menu]").forEach((d) => {
        d.setAttribute("aria-expanded", "false");
      }));
    }, this.reviewSelectorDocument = null, this.reviewSelectorToggle = null, this.reviewSelectorListenerTimer = null, this.handleReviewSelectorDocumentClick = (l) => {
      const r = l.target, d = this.container?.querySelector("[data-review-selector-container]");
      r && d && !d.contains(r) && this.closeReviewSelectorDropdown();
    }, this.handleReviewSelectorDocumentKeydown = (l) => {
      l.key === "Escape" && (l.preventDefault(), this.closeReviewSelectorDropdown({ restoreFocus: !0 }));
    }, this.selectedRows = /* @__PURE__ */ new Map(), this.bulkActionPending = !1, this.bulkSnapshotPending = !1, this.filterSnapshot = null, this.viewMode = "flat", this.groupedData = null, this.serverFamilyRows = [], this.expandedGroups = /* @__PURE__ */ new Set(), this.filtersExpanded = !1;
    const t = o(e.initialPresetId), a = { ...e.initialQueryState || {} };
    this.config = {
      endpoint: e.endpoint,
      bulkActionEndpoint: e.bulkActionEndpoint || ye(e.endpoint),
      bulkSnapshotEndpoint: e.bulkSnapshotEndpoint || be(e.endpoint),
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open",
      initialQueryState: a,
      hasExplicitQueryState: e.hasExplicitQueryState === !0
    };
    const s = jt(t);
    if (s?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = s.preset.id, this.queryState = {
        ...T(s.preset),
        ...a
      };
      return;
    }
    if (s?.kind === "standard")
      this.activePresetId = s.preset.id, this.queryState = {
        ...T(s.preset),
        ...a
      };
    else if (this.config.hasExplicitQueryState)
      this.activePresetId = "custom", this.queryState = {
        sort: "updated_at",
        order: "desc",
        page: 1,
        ...a
      };
    else {
      const l = E[1] || E[0];
      this.activePresetId = l?.id || "open", this.queryState = {
        ...l ? T(l) : {
          sort: "updated_at",
          order: "desc",
          page: 1
        },
        ...a
      };
    }
    const n = Te(q.PANEL_ID);
    n && (this.viewMode = n, this.viewMode === "grouped" ? this.queryState.groupBy = "family_id" : this.viewMode === "server_family" && (this.queryState.groupBy = "family_id", this.queryState.groupStrategy = "server_family")), this.expandedGroups = Le(q.PANEL_ID);
  }
  mount(e) {
    this.listLoadGeneration += 1, this.listLoadController?.abort(), this.container = e, this.mounted = !0, typeof e.addEventListener == "function" && e.addEventListener("click", this.handleContainerClick), this.loadFiltersExpandedState(), this.load();
  }
  unmount() {
    this.mounted = !1, this.listLoadGeneration += 1, this.listLoadController?.abort(), this.listLoadController = null, this.isRefreshing = !1, this.teardownReviewSelectorListeners(), this.container && (pe(this.container), typeof this.container.removeEventListener == "function" && this.container.removeEventListener("click", this.handleContainerClick), this.container.innerHTML = ""), this.container = null;
  }
  getData() {
    return this.response;
  }
  getRows() {
    return this.rows.map((e) => S(e));
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
    const t = this.rows.find((a) => a.id === e);
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
      const a = t.children.findIndex((s) => s.id === e.id);
      a >= 0 && (t.children[a] = S(e));
    }
  }
  async selectAllMatchingFilters() {
    this.bulkSnapshotPending = !0, this.feedback = null, this.render();
    try {
      const e = await j(F(this.config.bulkSnapshotEndpoint || be(this.config.endpoint), this.queryState), {
        method: "POST",
        json: {
          filters: Et(this.queryState),
          channel: this.queryState.channel
        }
      });
      if (!e.ok) throw await z(e, "Filter snapshot failed");
      const t = St(h(h(await e.json()).data));
      if (!t.snapshotId) throw new G({
        message: "Filter snapshot response did not include a snapshot id.",
        status: 500,
        code: "INVALID_SNAPSHOT_RESPONSE"
      });
      this.selectedRows.clear(), this.filterSnapshot = t, this.feedback = {
        kind: "success",
        message: `${t.requested} matching assignment${t.requested !== 1 ? "s" : ""} selected.`
      };
    } catch (e) {
      this.feedback = M(e, "Filter snapshot failed.");
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
    const a = Array.from(this.selectedRows.values());
    this.bulkActionPending = !0, this.feedback = null, this.render();
    try {
      const s = await this.executeBulkAction({
        action: e,
        assignments: a,
        reason: t?.reason,
        priority: t?.priority
      });
      for (const n of s.data.results) if (n.success && n.assignment) {
        const l = this.rows.findIndex((r) => r.id === n.assignmentId);
        l >= 0 && (this.rows[l] = S(n.assignment)), this.selectedRows.delete(n.assignmentId);
      }
      if (s.data.failed > 0) {
        const n = s.data.results.filter((l) => !l.success).map((l) => l.assignmentId).slice(0, 3);
        this.feedback = {
          kind: "error",
          message: `${s.data.succeeded} succeeded, ${s.data.failed} failed. Failed: ${n.join(", ")}${s.data.failed > 3 ? "..." : ""}`
        };
      } else this.feedback = {
        kind: "success",
        message: `${s.data.succeeded} assignment${s.data.succeeded !== 1 ? "s" : ""} updated.`
      };
    } catch (s) {
      this.feedback = M(s, `Bulk ${e} failed.`);
    } finally {
      this.bulkActionPending = !1, this.render();
    }
  }
  async runFilterSnapshotBulkAction(e, t) {
    const a = this.filterSnapshot;
    if (!a) {
      this.feedback = {
        kind: "error",
        message: "No filter snapshot selected."
      }, this.render();
      return;
    }
    const s = t || this.promptFilterSnapshotActionOptions(e);
    if (s === null) return;
    const n = a.filterSummary || [], l = n.length ? `

${n.join(`
`)}` : "";
    if (typeof window > "u" || typeof window.confirm != "function" || window.confirm(`Apply ${e} to ${a.requested} matching assignment${a.requested !== 1 ? "s" : ""}?${l}`)) {
      this.bulkActionPending = !0, this.feedback = null, this.render();
      try {
        const r = await this.executeBulkAction({
          action: e,
          selectionScope: "filter_snapshot",
          snapshotId: a.snapshotId,
          assigneeId: s.assigneeId,
          priority: s.priority,
          idempotencyKey: kt(a.snapshotId, e, s)
        });
        r.data.failed > 0 ? this.feedback = {
          kind: "error",
          message: `${r.data.succeeded} succeeded, ${r.data.failed} failed.`
        } : this.feedback = {
          kind: "success",
          message: `${r.data.succeeded} assignment${r.data.succeeded !== 1 ? "s" : ""} updated.`
        }, this.filterSnapshot = null, this.selectedRows.clear(), await this.load();
      } catch (r) {
        this.feedback = M(r, `Bulk ${e} failed.`);
      } finally {
        this.bulkActionPending = !1, this.render();
      }
    }
  }
  promptFilterSnapshotActionOptions(e) {
    if (e === "assign") {
      const t = this.queryState.assigneeId && this.queryState.assigneeId !== "__me__" ? this.queryState.assigneeId : "", a = o(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Assign matching assignments to", t));
      return a ? { assigneeId: a } : null;
    }
    if (e === "priority") {
      const t = he(this.queryState.priority || "normal"), a = he(o(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Set matching assignments priority", t)));
      return a ? { priority: a } : (this.feedback = {
        kind: "error",
        message: "Priority must be low, normal, high, or urgent."
      }, this.render(), null);
    }
    return {};
  }
  async executeBulkAction(e) {
    const t = await j(F(this.config.bulkActionEndpoint || ye(this.config.endpoint), this.queryState), {
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
        priority: e.priority,
        channel: this.queryState.channel
      }
    });
    if (!t.ok) throw await z(t, `Bulk ${e.action} failed`);
    const a = h(await t.json()), s = h(a.data), n = h(a.meta), l = Array.isArray(s.results) ? s.results : [], r = g(n.requested), d = g(n.succeeded), u = g(n.failed), m = n.partial === !0, v = o(n.selection_scope) || "current_page";
    return {
      data: {
        action: o(s.action) || e.action,
        requested: r,
        succeeded: d,
        failed: u,
        partial: m,
        selectionScope: v,
        results: l.map((f) => {
          const $ = h(f), x = h($.error);
          return {
            assignmentId: o($.assignment_id),
            success: o($.status) === "succeeded",
            error: o(x.message) || o($.error) || void 0,
            errorCode: o(x.code) || o($.error_code) || void 0,
            assignment: $.assignment ? k($.assignment) : void 0
          };
        })
      },
      meta: {
        action: o(s.action) || e.action,
        requested: r,
        succeeded: d,
        failed: u,
        partial: m,
        selection_scope: v
      }
    };
  }
  async load() {
    if (!this.container || !this.mounted) return;
    this.listLoadController?.abort();
    const e = new AbortController(), t = ++this.listLoadGeneration, a = this.capturePresentation(), s = this.committedPresentation !== null;
    this.listLoadController = e, this.isRefreshing = s, s || (this.state = "loading"), this.error = null, this.refreshError = null, this.liveMessage = s ? "Updating queue results..." : "Loading queue results...", this.render();
    try {
      const n = await Tt(this.config.endpoint, a.queryState, { signal: e.signal });
      if (!this.isCurrentListLoad(t, e)) return;
      this.applyListResponse(n, a.viewMode), this.committedPresentation = {
        ...a,
        queryState: { ...a.queryState },
        state: this.state === "empty" ? "empty" : "ready"
      };
      const l = n.meta.total;
      this.liveMessage = `${s ? "Queue updated" : "Queue loaded"}. ${l} ${l === 1 ? "result" : "results"} available.`;
    } catch (n) {
      if (!this.isCurrentListLoad(t, e) || Ot(n, e.signal)) return;
      const l = n instanceof Error ? n : new Error(String(n));
      this.error = l, s && this.committedPresentation ? (this.restoreCommittedPresentation(), this.refreshError = l, this.liveMessage = "Queue update failed. Previous results and filters were restored.") : (this.state = n instanceof G && n.code === "VERSION_CONFLICT" ? "conflict" : "error", this.liveMessage = "Queue results could not be loaded.");
    } finally {
      if (!this.isCurrentListLoad(t, e)) return;
      this.listLoadController = null, this.isRefreshing = !1, this.render();
    }
  }
  isCurrentListLoad(e, t) {
    return this.mounted && this.container !== null && this.listLoadGeneration === e && this.listLoadController === t;
  }
  capturePresentation() {
    return {
      queryState: { ...this.queryState },
      activePresetId: this.activePresetId,
      activeReviewPresetId: this.activeReviewPresetId,
      viewMode: this.viewMode
    };
  }
  restoreCommittedPresentation() {
    const e = this.committedPresentation;
    e && (this.queryState = { ...e.queryState }, this.activePresetId = e.activePresetId, this.activeReviewPresetId = e.activeReviewPresetId, this.viewMode = e.viewMode, this.state = e.state, ne(q.PANEL_ID, e.viewMode));
  }
  applyListResponse(e, t) {
    if (this.response = e, t === "server_family" && e.meta.grouping?.strategy === "server_family") {
      this.groupedData = null, this.serverFamilyRows = e.data.map((a) => Ct(a, this.expandedGroups)), this.rows = this.serverFamilyRows.flatMap((a) => a.children.map((s) => S(s))), this.state = this.serverFamilyRows.length ? "ready" : "empty";
      return;
    }
    if (this.serverFamilyRows = [], t === "grouped" && e.meta.grouping?.enabled) {
      const a = Pe(e.data, {
        defaultExpanded: !0,
        expandMode: "explicit",
        expandedGroups: this.expandedGroups
      });
      if (a) {
        this.groupedData = a, this.rows = [];
        for (const s of a.groups) for (const n of s.records) this.rows.push(k(n));
        for (const s of a.ungrouped) this.rows.push(k(s));
      } else
        this.groupedData = null, this.rows = e.data.map((s) => S(s));
    } else
      this.groupedData = null, this.rows = e.data.map((a) => S(a));
    this.state = this.rows.length ? "ready" : "empty";
  }
  getViewMode() {
    return this.viewMode;
  }
  setViewMode(e) {
    if (this.viewMode !== e) {
      if (this.viewMode = e, ne(q.PANEL_ID, e), e === "grouped") {
        const { groupStrategy: t, ...a } = this.queryState;
        this.queryState = {
          ...a,
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
        const { groupBy: t, groupStrategy: a, ...s } = this.queryState;
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
    this.groupedData && (this.groupedData = Ce(this.groupedData, e), this.expandedGroups = U(this.groupedData), A(q.PANEL_ID, this.expandedGroups), this.render());
  }
  async toggleServerFamilyExpansion(e) {
    const t = this.serverFamilyRows.find((a) => a.family_id === e);
    if (t) {
      if (t.expanded = !t.expanded, t.expanded ? this.expandedGroups.add(e) : this.expandedGroups.delete(e), A(q.PANEL_ID, this.expandedGroups), !t.expanded || t.children.length || t.loading) {
        this.rows = this.serverFamilyRows.flatMap((a) => a.children.map((s) => S(s))), this.render();
        return;
      }
      t.loading = !0, t.error = "", this.render();
      try {
        const a = await Pt(t.expansion);
        t.children = a.rows, t.childMeta = a.meta, this.rows = this.serverFamilyRows.flatMap((s) => s.children.map((n) => S(n)));
      } catch (a) {
        t.error = a instanceof Error ? a.message : "Failed to load family assignments.";
      } finally {
        t.loading = !1, this.render();
      }
    }
  }
  expandAllFamilyGroups() {
    if (this.viewMode === "server_family") {
      for (const e of this.serverFamilyRows)
        this.expandedGroups.add(e.family_id), e.expanded = !0;
      A(q.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = Fe(this.groupedData), this.expandedGroups = U(this.groupedData), A(q.PANEL_ID, this.expandedGroups), this.render());
  }
  collapseAllFamilyGroups() {
    if (this.viewMode === "server_family") {
      this.expandedGroups.clear();
      for (const e of this.serverFamilyRows) e.expanded = !1;
      A(q.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = Me(this.groupedData), this.expandedGroups = U(this.groupedData), A(q.PANEL_ID, this.expandedGroups), this.render());
  }
  async runInlineAction(e, t) {
    const a = this.rows.findIndex((d) => d.id === t);
    if (a < 0) return;
    const s = this.rows[a], n = s.actions[e];
    if (!n.enabled) {
      this.feedback = {
        kind: n.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n.reason || `Cannot ${e} this assignment.`,
        code: n.reason_code || null
      }, this.render();
      return;
    }
    const l = S(s), r = `${e}:${t}`;
    this.pendingActions.add(r), this.feedback = null, this.rows[a] = zt(s, e), this.replaceCachedRow(this.rows[a]), this.render();
    try {
      const d = e === "claim" ? await Mt(F(this.config.endpoint, this.queryState), t, {
        expected_version: l.version,
        idempotency_key: ge("claim", l),
        channel: this.queryState.channel
      }) : await Dt(F(this.config.endpoint, this.queryState), t, {
        expected_version: l.version,
        idempotency_key: ge("release", l),
        channel: this.queryState.channel
      });
      this.rows[a] = S(d.data.assignment), this.replaceCachedRow(this.rows[a]), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (d) {
      this.rows[a] = l, this.replaceCachedRow(l), this.feedback = M(d, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(r), this.render();
    }
  }
  async runReviewAction(e, t) {
    const a = this.rows.findIndex((d) => d.id === t);
    if (a < 0) return;
    const s = this.rows[a], n = s.review_actions[e];
    if (!n?.enabled) {
      this.feedback = {
        kind: n?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n?.reason || `Cannot ${e} this assignment.`,
        code: n?.reason_code || null
      }, this.render();
      return;
    }
    const l = {
      expected_version: s.version,
      idempotency_key: Bt(e, s),
      channel: this.queryState.channel
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
      const d = await re(F(this.config.endpoint, this.queryState), t, e, l);
      this.rows[a] = S(d.data.assignment), this.replaceCachedRow(this.rows[a]), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (d) {
      this.feedback = M(d, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(r), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((a) => a.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.queryState = {
      ...T(t),
      ...fe(this.queryState)
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((a) => a.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.queryState = {
      ...T(t),
      ...fe(this.queryState)
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load();
  }
  updateNamedFilter(e, t) {
    const a = t.trim();
    switch (e) {
      case "status":
        this.updateFilter({ status: a || void 0 });
        break;
      case "due_state":
        this.updateFilter({ dueState: a || void 0 });
        break;
      case "priority":
        this.updateFilter({ priority: a || void 0 });
        break;
      case "entity_type":
        this.updateFilter({ entityType: a || void 0 });
        break;
      case "title__ilike":
      case "title__contains":
      case "source_title__contains":
      case "source_title__ilike":
        this.updateFilter({ titleContains: a || void 0 });
        break;
      case "path__ilike":
      case "path__contains":
      case "source_path__contains":
      case "source_path__ilike":
        this.updateFilter({ pathContains: a || void 0 });
        break;
      case "locale":
        this.updateFilter({ locale: a || void 0 });
        break;
      case "assignee_id":
        this.updateFilter({ assigneeId: a || void 0 });
        break;
      case "reviewer_id":
        this.updateFilter({ reviewerId: a || void 0 });
        break;
      case "family_id":
        this.updateFilter({ familyId: a || void 0 });
        break;
      case "sort":
        this.updateFilter({ sort: a || void 0 });
        break;
      case "order":
        this.updateFilter({ order: a || void 0 });
        break;
    }
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(B) : E.map(B);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(B) : se.map(B);
  }
  get visibleRows() {
    return this.rows;
  }
  getActiveFilterCount() {
    let e = 0;
    return this.queryState.status && e++, this.queryState.dueState && e++, this.queryState.priority && e++, this.queryState.entityType && e++, this.queryState.locale && e++, this.queryState.assigneeId && e++, this.queryState.reviewerId && e++, this.queryState.familyId && e++, this.queryState.titleContains && e++, this.queryState.pathContains && e++, this.queryState.reviewState && e++, this.queryState.sort && this.queryState.sort !== (this.response?.meta.default_sort.key ?? "updated_at") && e++, this.queryState.order && this.queryState.order !== (this.response?.meta.default_sort.order ?? "desc") && e++, e;
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
      case "title__ilike":
        t.titleContains = void 0;
        break;
      case "path__ilike":
        t.pathContains = void 0;
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
      case "review_state":
        t.reviewState = void 0;
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
    }), this.queryState.titleContains && e.push({
      name: "title__ilike",
      label: "Title contains",
      value: this.queryState.titleContains
    }), this.queryState.pathContains && e.push({
      name: "path__ilike",
      label: "Path contains",
      value: this.queryState.pathContains
    }), this.queryState.reviewState && e.push({
      name: "review_state",
      label: "Review State",
      value: y(this.queryState.reviewState)
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
              <span class="queue-filter-chip-label">${p(t.label)}:</span>
              <span class="queue-filter-chip-value">${p(t.value)}</span>
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
    const e = this.container?.querySelector("[data-review-selector-menu]"), t = this.container?.querySelector("[data-review-selector-toggle]"), a = this.container?.querySelector("[data-review-selector-chevron]");
    !e || !t || (e.classList.contains("hidden") ? (this.teardownReviewSelectorListeners(), e.classList.remove("hidden"), t.setAttribute("aria-expanded", "true"), a && a.classList.add("rotate-180"), this.reviewSelectorDocument = t.ownerDocument, this.reviewSelectorToggle = t, this.reviewSelectorListenerTimer = setTimeout(() => {
      if (this.reviewSelectorListenerTimer = null, !this.mounted || !this.reviewSelectorDocument || !this.reviewSelectorToggle?.isConnected) {
        this.teardownReviewSelectorListeners();
        return;
      }
      this.reviewSelectorDocument.addEventListener("click", this.handleReviewSelectorDocumentClick), this.reviewSelectorDocument.addEventListener("keydown", this.handleReviewSelectorDocumentKeydown);
    }, 0)) : this.closeReviewSelectorDropdown());
  }
  closeReviewSelectorDropdown(e = {}) {
    const t = this.container?.querySelector("[data-review-selector-menu]"), a = this.container?.querySelector("[data-review-selector-toggle]"), s = this.container?.querySelector("[data-review-selector-chevron]");
    t && t.classList.add("hidden"), a && a.setAttribute("aria-expanded", "false"), s && s.classList.remove("rotate-180");
    const n = e.restoreFocus ? this.reviewSelectorToggle : null;
    this.teardownReviewSelectorListeners(), n?.isConnected && n.focus();
  }
  teardownReviewSelectorListeners() {
    this.reviewSelectorListenerTimer !== null && (clearTimeout(this.reviewSelectorListenerTimer), this.reviewSelectorListenerTimer = null), this.reviewSelectorDocument && (this.reviewSelectorDocument.removeEventListener("click", this.handleReviewSelectorDocumentClick), this.reviewSelectorDocument.removeEventListener("keydown", this.handleReviewSelectorDocumentKeydown)), this.reviewSelectorDocument = null, this.reviewSelectorToggle = null;
  }
  persistFiltersExpanded() {
    try {
      localStorage.setItem(q.FILTERS_STORAGE_KEY, this.filtersExpanded ? "true" : "false");
    } catch {
    }
  }
  loadFiltersExpandedState() {
    try {
      this.filtersExpanded = localStorage.getItem(q.FILTERS_STORAGE_KEY) === "true";
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
      titleContains: void 0,
      pathContains: void 0,
      locale: void 0,
      assigneeId: void 0,
      reviewerId: void 0,
      familyId: void 0,
      reviewState: void 0,
      sort: void 0,
      order: void 0,
      page: 1
    }, this.activePresetId = "custom", this.activeReviewPresetId = "", this.filterSnapshot = null, this.selectedRows.clear(), this.load();
  }
  render() {
    if (!this.container) return;
    this.teardownReviewSelectorListeners();
    const e = this.renderContent(), t = !!this.container.ownerDocument;
    let a = t ? this.container.querySelector('[data-assignment-queue="true"]') : null;
    t && !a && (this.container.innerHTML = `
        <div class="assignment-queue-screen" data-assignment-queue="true">
          <div class="sr-only"
               data-assignment-queue-live="true"
               role="status"
               aria-live="polite"
               aria-atomic="true"></div>
          <div data-assignment-queue-content="true"></div>
        </div>
      `, a = this.container.querySelector('[data-assignment-queue="true"]'));
    const s = a?.querySelector('[data-assignment-queue-content="true"]'), n = a?.querySelector('[data-assignment-queue-live="true"]');
    s && n ? (pe(s), s.innerHTML = e, n.textContent = this.liveMessage) : this.container.innerHTML = `
        <div class="assignment-queue-screen" data-assignment-queue="true">
          <div class="sr-only"
               data-assignment-queue-live="true"
               role="status"
               aria-live="polite"
               aria-atomic="true">${p(this.liveMessage)}</div>
          <div data-assignment-queue-content="true">${e}</div>
        </div>
      `, this.attachEventListeners();
  }
  renderContent() {
    return `
      ${this.renderRefreshError()}
      ${this.renderFeedback()}
      ${this.renderBulkActionBar()}
      ${this.renderFilterSnapshotBar()}
      ${this.renderReviewStateBar()}
      ${this.renderPresetBar()}
      ${this.renderFilters()}
      ${this.renderResults()}
    `;
  }
  renderResults() {
    return `
      <div class="assignment-queue-results"
           data-assignment-queue-results="true"
           data-refreshing="${this.isRefreshing ? "true" : "false"}"
           aria-busy="${this.isRefreshing ? "true" : "false"}"
           ${this.isRefreshing ? "inert" : ""}>
        ${this.renderContextBar()}
        ${this.renderBody()}
        ${this.isRefreshing ? `
          <div class="assignment-queue-refresh-overlay" data-assignment-queue-refresh-overlay="true" aria-hidden="true">
            <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Updating results...</span>
          </div>
        ` : ""}
      </div>
    `;
  }
  renderRefreshError() {
    return this.refreshError ? `
      <div class="assignment-queue-feedback feedback-error"
           data-assignment-queue-refresh-error="true"
           role="alert">
        <div>
          <strong>Queue update failed.</strong>
          <span> Previous results and filters were restored. ${p(this.refreshError.message)}</span>
        </div>
        <button type="button" class="${w}" data-queue-refresh="true">Retry</button>
      </div>
    ` : "";
  }
  renderFeedback() {
    if (!this.feedback) return "";
    const e = this.feedback.kind === "success" ? "feedback-success" : this.feedback.kind === "conflict" ? "feedback-conflict" : "feedback-error", t = [
      this.feedback.code ? `Code ${p(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${p(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${p(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${c(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${p(this.feedback.message)}</strong>
        ${t.length ? `<span class="feedback-meta">${t.join(" · ")}</span>` : ""}
      </div>
    `;
  }
  renderBulkActionBar() {
    const e = this.selectedRows.size, t = this.bulkActionPending || this.isRefreshing;
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
              ${this.bulkActionPending ? "Processing…" : "Release"}
            </button>
            <button
              type="button"
              class="bulk-action-btn bulk-action-btn--danger"
              data-bulk-action="archive"
              ${t ? "disabled" : ""}
              title="Archive selected assignments"
            >
              ${this.bulkActionPending ? "Processing…" : "Archive"}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  renderFilterSnapshotBar() {
    const e = this.filterSnapshot;
    if (!e) return "";
    const t = this.bulkSnapshotPending || this.bulkActionPending || this.isRefreshing, a = (e.filterSummary || []).slice(0, 4);
    return `
      <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="All matching filter selection">
        <div class="filter-snapshot-copy">
          <strong>${e.requested} matching assignment${e.requested !== 1 ? "s" : ""} selected</strong>
          ${a.length ? `<span>${a.map((s) => p(s)).join(" · ")}</span>` : ""}
        </div>
        <div class="filter-snapshot-actions">
          <button type="button" class="${w}" data-filter-snapshot-clear="true" ${t ? "disabled" : ""}>Clear</button>
          <button type="button" class="${w}" data-filter-snapshot-action="assign" ${t || e.requested === 0 ? "disabled" : ""}>Assign</button>
          <button type="button" class="${w}" data-filter-snapshot-action="release" ${t || e.requested === 0 ? "disabled" : ""}>Release</button>
          <button type="button" class="${w}" data-filter-snapshot-action="priority" ${t || e.requested === 0 ? "disabled" : ""}>Priority</button>
          <button type="button" class="${w}" data-filter-snapshot-action="archive" ${t || e.requested === 0 ? "disabled" : ""}>Archive</button>
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
              <span class="panel-tab-label">${p(e.label)}</span>
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
    const e = this.response?.meta.review_aggregate_counts || {}, a = !!this.response?.meta.review_actor_id, s = this.savedReviewFilterPresets.find((r) => r.id === this.activeReviewPresetId), n = s ? s.label : "Review State", l = s ? e[s.id] ?? 0 : 0;
    return `
      <div class="relative" data-review-selector-container="true">
        <h2 class="sr-only">Reviewer states</h2>
        <button
          type="button"
          class="${w} ${a ? "" : "opacity-50 cursor-not-allowed"}"
          data-review-selector-toggle="true"
          aria-expanded="false"
          aria-haspopup="true"
          aria-label="Select review state filter"
          ${a ? "" : 'disabled aria-disabled="true"'}
          title="${c(a ? "Filter by review state" : "Reviewer metadata is required to use review filters.")}"
        >
          <span>${p(n)}</span>
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
                <span>${p(r.label)}</span>
                <span class="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-xs font-semibold rounded-full ${this.activeReviewPresetId === r.id ? "bg-blue-200 text-blue-900" : "bg-gray-100 text-gray-700"}">${e[r.id] ?? 0}</span>
              </button>
            `).join("")}
          </div>
          ${a ? "" : `
            <div class="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
              Reviewer queue states are available when reviewer metadata is present.
            </div>
          `}
        </div>
      </div>
    `;
  }
  renderContextBar() {
    const e = this.response?.meta.total ?? 0, t = this.visibleRows.length, a = this.viewMode === "grouped", s = this.viewMode === "server_family", n = !a && !s, l = this.groupedData?.totalGroups ?? 0, r = this.response?.meta.grouping?.assignment_count ?? this.rows.length, d = this.response?.meta.grouping?.capabilities?.server_family?.supported === !0, u = this.response?.meta.grouping?.family_total ?? this.response?.meta.family_total ?? this.serverFamilyRows.length, m = this.response?.meta.grouping?.assignment_total ?? this.response?.meta.assignment_total ?? 0;
    let v = "", f = "";
    return s ? (v = `${this.serverFamilyRows.length} of ${u} ${u === 1 ? "family" : "families"} · ${m} assignments`, f = "(server-side family pages)") : a && this.groupedData ? (v = `${l} ${l === 1 ? "family" : "families"} · ${r} assignments`, f = "(page-local counts)") : (v = `Showing ${t} of ${e} ${e === 1 ? "assignment" : "assignments"}`, f = ""), `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3 text-sm">
            <span class="font-medium text-gray-700">${v}</span>
            ${f ? `<span class="text-gray-500">${f}</span>` : ""}
          </div>
          <div class="flex items-center gap-3">
            ${a || s ? `
              <button type="button" class="${w}" data-expand-all="true" title="Expand all ${s ? "visible families" : "groups"}">
                Expand all
              </button>
              <button type="button" class="${w}" data-collapse-all="true" title="Collapse all ${s ? "visible families" : "groups"}">
                Collapse all
              </button>
            ` : ""}
            <div role="group" aria-label="View mode" class="inline-flex rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors ${n ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}"
                data-view-mode="flat"
                aria-pressed="${n}"
                title="Show assignments as a flat list"
              >
                <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z"/>
                </svg>
                <span class="ml-1">List</span>
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${a ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}"
                data-view-mode="grouped"
                aria-pressed="${a}"
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
        ${this.renderPaginationControls()}
      </div>
    `;
  }
  renderPaginationControls() {
    const e = this.response?.meta;
    if (!e) return "";
    const t = Math.max(1, e.page || this.queryState.page || 1), a = Math.max(1, e.per_page || this.queryState.perPage || 25), s = Math.max(0, e.total || 0), n = Math.max(1, Math.ceil(s / a)), l = Math.min(t, n), r = this.viewMode === "server_family", d = r ? this.serverFamilyRows.length : e.grouping?.assignment_count ?? this.rows.length, u = s > 0 && d > 0, m = u ? (l - 1) * a + 1 : 0, v = u ? Math.min(s, m + d - 1) : 0, f = r ? "families" : "assignments", $ = Array.from(/* @__PURE__ */ new Set([
      25,
      50,
      100,
      a
    ])).sort((x, Re) => x - Re);
    return `
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3"
           data-queue-pagination="true">
        <div class="text-sm text-gray-600" data-queue-pagination-range="true">
          Showing ${m}-${v} of ${s} ${f} · Page ${l} of ${n}
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="inline-flex rounded-md border border-gray-200 bg-white p-1 text-sm font-medium" aria-label="Queue pagination">
            <button type="button"
                    class="rounded px-3 py-1.5 ${l <= 1 ? "text-gray-400" : "text-gray-700 hover:bg-gray-50"}"
                    data-page-target="${l - 1}"
                    ${l <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
            <button type="button"
                    class="rounded px-3 py-1.5 ${l >= n ? "text-gray-400" : "text-gray-700 hover:bg-gray-50"}"
                    data-page-target="${l + 1}"
                    ${l >= n ? 'disabled aria-disabled="true"' : ""}>Next</button>
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-600">
            <span>Per page</span>
            <select data-page-size="true" class="rounded-md border border-gray-200 bg-white px-2 py-1.5">
              ${$.map((x) => `<option value="${x}" ${x === a ? "selected" : ""}>${x}</option>`).join("")}
            </select>
          </label>
        </div>
      </div>
    `;
  }
  goToPage(e) {
    const t = this.response?.meta, a = Math.max(1, t?.per_page || this.queryState.perPage || 25), s = Math.max(1, Math.ceil(Math.max(0, t?.total || 0) / a)), n = Math.min(Math.max(1, Math.floor(e)), s);
    n !== (t?.page || this.queryState.page || 1) && (this.queryState = {
      ...this.queryState,
      page: n
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  setPageSize(e) {
    const t = Math.min(200, Math.max(1, Math.floor(e)));
    t !== (this.response?.meta.per_page || this.queryState.perPage || 25) && (this.queryState = {
      ...this.queryState,
      perPage: t,
      page: 1
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
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
    ], a = [
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
    ], n = ["", ...P(e.map((f) => f.target_locale))], l = ["", ...P(e.map((f) => f.entity_type))], r = ["", ...P(e.map((f) => f.assignee_id))], d = ["", ...P(e.map((f) => f.reviewer_id))], u = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
      "updated_at",
      "due_date",
      "priority",
      "status",
      "locale"
    ], m = this.getActiveFilterCount(), v = this.filtersExpanded ? "rotate-180" : "";
    return `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="${w}"
              data-filters-toggle="true"
              aria-expanded="${this.filtersExpanded}"
              aria-controls="queue-filters-panel"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
              </svg>
              <span>Filters</span>
              ${m > 0 ? `<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">${m}</span>` : ""}
              <svg class="h-4 w-4 transition-transform ${v}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            ${this.renderReviewSelector()}
          </div>
          <div class="flex items-center gap-3">
            ${this.renderSortControls(u)}
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
            ${this.renderQueueFilterControl("due_state", "Due State", ["", ...a], this.queryState.dueState || "")}
            ${this.renderSelect("priority", "Priority", s, this.queryState.priority || "")}
            ${this.renderQueueFilterControl("entity_type", "Type", l, this.queryState.entityType || "")}
            ${this.renderTextFilter("title__ilike", "Title contains", this.queryState.titleContains || "", "Match source titles")}
            ${this.renderTextFilter("path__ilike", "Path contains", this.queryState.pathContains || "", "Match source paths")}
            ${this.renderQueueFilterControl("locale", "Target Locale", n, this.queryState.locale || "")}
            ${this.renderQueueFilterControl("assignee_id", "Assignee", r, this.queryState.assigneeId || "")}
            ${this.renderQueueFilterControl("reviewer_id", "Reviewer", d, this.queryState.reviewerId || "")}
            ${this.renderQueueFilterControl("family_id", "Family", ["", ...P(e.map((f) => f.family_id))], this.queryState.familyId || "")}
          </div>
          ${m > 0 ? `
            <div class="mt-4 flex items-center gap-2">
              <button type="button" class="${w}" data-clear-filters="true">
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
    const t = this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"), a = this.queryState.order || (this.response?.meta.default_sort.order ?? "desc");
    return `
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <span class="text-gray-500">Sort by</span>
        <select
          data-filter-name="sort"
          class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          ${e.map((s) => `
            <option value="${c(s)}" ${s === t ? "selected" : ""}>
              ${p(y(s))}
            </option>
          `).join("")}
        </select>
      </label>
      <button
        type="button"
        class="${ce}"
        data-toggle-sort-order="true"
        title="${a === "asc" ? "Ascending (click for descending)" : "Descending (click for ascending)"}"
        aria-label="${a === "asc" ? "Sort ascending, click to sort descending" : "Sort descending, click to sort ascending"}"
      >
        ${a === "asc" ? '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>' : '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/></svg>'}
      </button>
      <button
        type="button"
        class="${ce}"
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
  renderSelect(e, t, a, s) {
    const n = a.map((l) => ({
      value: l,
      label: l ? y(l) : `All ${t.toLowerCase()}`
    }));
    return this.renderSelectOptions(e, t, n, s);
  }
  renderTextFilter(e, t, a, s) {
    return `
      <label class="queue-filter-field">
        <span>${p(t)}</span>
        <input
          type="search"
          data-filter-name="${c(e)}"
          value="${c(a)}"
          placeholder="${c(s)}"
          autocomplete="off"
        />
      </label>
    `;
  }
  renderSelectOptions(e, t, a, s, n) {
    const l = a.map((r) => ({ ...r }));
    return l.some((r) => r.value === "") || l.unshift({
      value: "",
      label: n || `All ${t.toLowerCase()}`
    }), s && !l.some((r) => r.value === s) && l.push({
      value: s,
      label: y(s)
    }), `
      <label class="queue-filter-field">
        <span>${p(t)}</span>
        <select data-filter-name="${c(e)}">
          ${l.map((r) => `
            <option value="${c(r.value)}" ${r.value === s ? "selected" : ""}>
              ${p(r.label || r.value || n || `All ${t.toLowerCase()}`)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }
  queueFilterControl(e) {
    const t = this.response?.meta;
    if (!t) return null;
    const a = this.queueFilterControlAliases(e);
    return t.filter_controls.find((s) => a.includes(s.name) || a.includes(s.key)) || null;
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
  renderQueueFilterControl(e, t, a, s) {
    const n = this.queueFilterControl(e);
    if (n?.type === "select" && n.options.length > 0) return this.renderSelectOptions(n.name || e, n.label || t, n.options, s, n.placeholder || `All ${(n.label || t).toLowerCase()}`);
    if (this.response?.meta.enhanced_filter_selects !== !0 || !n?.enhanced || !n.endpoint_url || n.type !== "typeahead" && n.type !== "remote_select") return this.renderSelect(e, t, a, s);
    const l = n.label || t, r = this.canonicalQueueFilterName(n.name || n.key || e), d = n.placeholder || l;
    return `
      <label class="queue-filter-field">
        <span>${p(l)}</span>
        <div class="filter-panel__enhanced-control"
             data-filter-enhanced="true"
             data-filter-control-type="${c(n.type)}"
             data-filter-name="${c(r)}"
             data-filter-endpoint-url="${c(n.endpoint_url)}"
             data-filter-search-param="${c(n.endpoint_search_param || "search")}"
             data-filter-hydrate-param="${c(n.endpoint_hydrate_param || "selected")}"
             data-filter-value-field="${c(n.endpoint_value_field || "value")}"
             data-filter-label-field="${c(n.endpoint_label_field || "label")}"
             data-filter-renderer="${c(n.renderer || "simple")}"
             data-filter-fallback="${c(n.fallback || "raw")}">
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
        <div class="${Ze}" data-queue-state="loading">
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
        ${e.map((a) => this.renderMobileCard(a)).join("")}
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
            ${e.map((a) => this.renderRow(a)).join("")}
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
    const a = e.expanded ? "▼" : "▶", s = this.renderServerFamilyBlocker(e), n = e.expanded ? e.loading ? `<tr class="family-group-child"><td></td><td colspan="${t - 1}">Loading family assignments…</td></tr>` : e.error ? `<tr class="family-group-child"><td></td><td colspan="${t - 1}">${p(e.error)}</td></tr>` : e.children.map((l) => this.renderGroupChildRow(l, e.family_id)).join("") : "";
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
              <span class="family-group-expand-icon" aria-hidden="true">${a}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${p(e.family_label || e.family_id)}</strong>
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
      ${n}
    `;
  }
  renderServerFamilyMobile(e) {
    const t = e.expanded ? "▼" : "▶", a = e.expanded ? e.loading ? '<div class="family-group-mobile-child">Loading family assignments…</div>' : e.error ? `<div class="family-group-mobile-child">${p(e.error)}</div>` : e.children.map((s) => `<div class="family-group-mobile-child">${this.renderMobileCard(s)}</div>`).join("") : "";
    return `
      <div class="family-group-mobile-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
           data-group-id="${c(e.family_id)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${c(e.family_id)}">
          <span class="family-group-expand-icon">${t}</span>
          <span class="family-group-mobile-label">${p(e.family_label || e.family_id)}</span>
          <span class="family-group-mobile-count">${e.assignment_count} assignments · ${e.locale_count} locales</span>
        </button>
        <div class="server-family-mobile-summary">${this.renderServerFamilyBlocker(e)}</div>
      </div>
      ${a}
    `;
  }
  renderCountPills(e) {
    return Object.entries(e).filter(([, t]) => t > 0).slice(0, 4).map(([t, a]) => `<span class="family-summary-pill">${p(y(t))} ${a}</span>`).join("");
  }
  renderPriorityPills(e) {
    return Object.entries(e).filter(([, t]) => t > 0).slice(0, 2).map(([t, a]) => `<span class="family-summary-pill priority-${c(t)}">${p(y(t))} ${a}</span>`).join("");
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
        ${this.groupedData.groups.map((a) => this.renderGroupedMobileCards(a)).join("")}
        ${this.groupedData.ungrouped.map((a) => this.renderMobileCard(k(a))).join("")}
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
            ${this.groupedData.groups.map((a) => this.renderFamilyGroupRows(a, t)).join("")}
            ${this.groupedData.ungrouped.map((a) => this.renderRow(k(a))).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderFamilyGroupRows(e, t) {
    const a = De(e, { size: "sm" }), s = p(e.displayLabel || this.deriveFamilyGroupLabel(e)), n = e.records.length, l = e.expanded ? "▼" : "▶";
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
              <span class="family-group-count">${n} ${n === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary">
              ${a}
            </div>
          </div>
        </td>
      </tr>
    ` + (e.expanded ? e.records.map((r) => {
      const d = k(r);
      return this.renderGroupChildRow(d, e.groupId);
    }).join("") : "");
  }
  renderGroupChildRow(e, t) {
    const a = !!e.assignee_id, s = !!e.reviewer_id, n = !!e.due_date, l = n || e.due_state === "overdue" || e.due_state === "due_soon", r = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row family-group-child ${r ? "is-selected" : ""}"
          data-assignment-id="${c(e.id)}"
          data-parent-group="${c(t)}"
          data-assignment-row="true"
          data-assignment-nav-group="table"
          tabindex="0"
          aria-label="${c(Z(e))}">
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
            <span class="queue-content-title-small" title="${c(e.source_title && e.source_path ? `${e.source_title} — ${e.source_path}` : e.source_title || e.source_path || e.id)}">${p(e.source_title || e.source_path || e.id)}</span>
          </div>
        </td>
        <td class="queue-locale-col">
          <div class="queue-locale-cell">
            <span class="locale-code">${p(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${p(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td class="queue-status-col">
          <div class="queue-status-cell">
            ${Q(e.queue_state, {
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
            ${a ? N("queue-owner-value", "Assignee", e.assignee_id, e.assignee_label) : ""}
            ${s ? N("queue-reviewer-value", "Reviewer", e.reviewer_id, e.reviewer_label) : ""}
          </div>
        </td>
        <td class="queue-due-col">
          <div class="queue-due-cell">
            ${l ? `<span class="due-pill due-${c(e.due_state)}">${p(y(e.due_state))}</span>` : ""}
            ${n ? `<span class="queue-due-date">${p(H(e.due_date, ""))}</span>` : ""}
          </div>
        </td>
        <td class="queue-priority-col">
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + y(e.priority))}"></span>
            <span class="priority-label">${p(y(e.priority))}</span>
          </div>
        </td>
        <td class="queue-action-col">
          <div class="queue-action-cell">
            ${(() => {
      const d = W(e, this.pendingActions);
      return J(e, d, X(d, e));
    })()}
          </div>
        </td>
      </tr>
    `;
  }
  renderGroupedMobileCards(e) {
    const t = p(e.displayLabel || this.deriveFamilyGroupLabel(e)), a = e.records.length, s = e.expanded ? "▼" : "▶";
    return `
      <div class="family-group-mobile-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
           data-group-id="${c(e.groupId)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${c(e.groupId)}">
          <span class="family-group-expand-icon">${s}</span>
          <span class="family-group-mobile-label">${t}</span>
          <span class="family-group-mobile-count">${a} ${a === 1 ? "locale" : "locales"}</span>
        </button>
      </div>
    ` + (e.expanded ? e.records.map((n) => {
      const l = k(n);
      return `<div class="family-group-mobile-child">${this.renderMobileCard(l)}</div>`;
    }).join("") : "");
  }
  deriveFamilyGroupLabel(e) {
    if (e.displayLabel) return e.displayLabel;
    if (e.records.length > 0) {
      const t = e.records[0], a = [
        o(t.source_title),
        o(t.source_path),
        o(t.source_record_id)
      ];
      for (const s of a) if (s) return s;
    }
    return `Family ${e.groupId.length > 20 ? e.groupId.slice(0, 17) + "..." : e.groupId}`;
  }
  renderEmptyState(e) {
    const t = e === "families" ? "No families found" : "No assignments found", a = e === "families" ? "No families match the current filters. Try adjusting your filters or check back later." : "No assignments match the current filters. Try adjusting your filters or selecting a different preset.", s = this.getActiveFilterCount();
    return `
      <div class="${et}" data-queue-state="empty">
        <svg class="h-12 w-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        <h3 class="${He} mt-4">${p(t)}</h3>
        <p class="${Ke} max-w-md mx-auto">${p(a)}</p>
        <div class="mt-5 flex items-center justify-center gap-3">
          ${s > 0 ? `
            <button type="button" class="${w}" data-clear-filters="true">
              Clear filters
            </button>
          ` : ""}
          <button type="button" class="${w}" data-queue-refresh="true">
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
      <div class="${Xe} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${Ue}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${st} mt-2">${p(t)}</p>
        <div class="mt-4">
          <button type="button" class="${w}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = !!e.assignee_id, a = !!e.reviewer_id, s = !!e.due_date, n = s || e.due_state === "overdue" || e.due_state === "due_soon", l = [];
    e.entity_type && l.push(e.entity_type), e.family_id && e.family_id !== e.source_path && l.push(e.family_id);
    const r = l.join(" · "), d = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row ${d ? "is-selected" : ""}" tabindex="0" data-assignment-id="${c(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${c(Z(e))}">
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
            <strong class="queue-content-title" title="${c(e.source_title || e.source_path || e.id)}">${p(e.source_title || e.source_path || e.id)}</strong>
            ${e.source_path && e.source_title ? `<span class="queue-content-path" title="${c(e.source_path)}">${p(e.source_path)}</span>` : ""}
            ${r ? `<span class="queue-content-meta" title="${c(r)}">${p(r)}</span>` : ""}
          </div>
        </td>
        <td class="queue-locale-col">
          <div class="queue-locale-cell">
            <span class="locale-code">${p(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${p(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td class="queue-status-col">
          <div class="queue-status-cell">
            ${Q(e.queue_state, {
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
            ${t ? N("queue-owner-value", "Assignee", e.assignee_id, e.assignee_label) : ""}
            ${a ? N("queue-reviewer-value", "Reviewer", e.reviewer_id, e.reviewer_label) : ""}
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${p(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td class="queue-due-col">
          <div class="queue-due-cell">
            ${n ? `<span class="due-pill due-${c(e.due_state)}">${p(y(e.due_state))}</span>` : ""}
            ${s ? `<span class="queue-due-date">${p(H(e.due_date, ""))}</span>` : ""}
          </div>
        </td>
        <td class="queue-priority-col">
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + y(e.priority))}"></span>
            <span class="priority-label">${p(y(e.priority))}</span>
          </div>
        </td>
        <td class="queue-action-col">
          <div class="queue-action-cell">
            ${(() => {
      const u = W(e, this.pendingActions);
      return J(e, u, X(u, e));
    })()}
          </div>
        </td>
      </tr>
    `;
  }
  renderMobileCard(e) {
    const t = !!e.assignee_id, a = !!e.reviewer_id, s = !!e.due_date, n = s || e.due_state === "overdue" || e.due_state === "due_soon", l = this.isRowSelected(e.id);
    return `
      <article
        class="${Ve} ${l ? "is-selected" : ""}"
        data-assignment-id="${c(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${c(Z(e))}"
      >
        <div class="${Ye}">
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
            <h3 class="${Je}" title="${c(e.source_title || e.source_path || e.id)}">${p(e.source_title || e.source_path || e.id)}</h3>
            <p class="${tt}" title="${c(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}">${p(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${Q(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${rt}">
          <div class="${C}">
            <span class="${L}">Locale</span>
            <span class="${I}">
              <span class="locale-code">${p(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${p(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          ${t ? `
          <div class="${C}">
            <span class="${L}">Assignee</span>
            <span class="${I}" title="${c(ie("Assignee", e.assignee_id, e.assignee_label))}">${p(O(e.assignee_id, e.assignee_label))}</span>
          </div>
          ` : ""}
          ${a ? `
          <div class="${C}">
            <span class="${L}">Reviewer</span>
            <span class="${I}" title="${c(ie("Reviewer", e.reviewer_id, e.reviewer_label))}">${p(O(e.reviewer_id, e.reviewer_label))}</span>
          </div>
          ` : ""}
          ${s || n ? `
          <div class="${C}">
            <span class="${L}">Due</span>
            <span class="${I}">
              ${n ? `<span class="due-pill due-${c(e.due_state)}">${p(y(e.due_state))}</span>` : ""}
              ${s ? `<span class="text-gray-600 ml-1">${p(H(e.due_date, ""))}</span>` : ""}
            </span>
          </div>
          ` : ""}
          <div class="${C}">
            <span class="${L}">Priority</span>
            <span class="${I}">
              <span class="priority-indicator priority-${c(e.priority)}"></span>
              <span class="priority-label">${p(y(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${We}">
          ${(() => {
      const r = W(e, this.pendingActions);
      return J(e, r, X(r, e));
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
          const u = this.container?.querySelector("[data-review-selector-menu]");
          u && !u.classList.contains("hidden") && this.closeReviewSelectorDropdown();
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
    }), this.container.querySelectorAll('input[type="search"][data-filter-name]').forEach((r) => {
      r.addEventListener("change", () => {
        const d = r.dataset.filterName;
        d && this.updateNamedFilter(d, r.value);
      });
    }), this.container.querySelectorAll('form[data-queue-filters="true"]').forEach((r) => {
      r.addEventListener("submit", (d) => {
        d.preventDefault();
        const u = r.querySelector('input[data-filter-name="title__ilike"]'), m = r.querySelector('input[data-filter-name="path__ilike"]');
        this.updateFilter({
          titleContains: o(u?.value) || void 0,
          pathContains: o(m?.value) || void 0
        });
      });
    }), this.container.querySelectorAll('[data-filter-enhanced="true"]').forEach((r) => {
      r.addEventListener("queue-filter-change", (d) => {
        const u = d.detail || {};
        u.name && this.updateNamedFilter(u.name, o(u.value));
      });
    }), ke(this.container), this.container.querySelectorAll("[data-translation-refresh], [data-queue-refresh]").forEach((r) => {
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
    }), this.container.querySelectorAll("[data-page-target]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = Number(r.dataset.pageTarget);
        Number.isFinite(d) && this.goToPage(d);
      });
    }), this.container.querySelectorAll('select[data-page-size="true"]').forEach((r) => {
      r.addEventListener("change", () => {
        const d = Number(r.value);
        Number.isFinite(d) && this.setPageSize(d);
      });
    }), this.container.querySelectorAll("[data-action]").forEach((r) => {
      r.addEventListener("click", () => {
        const d = r.dataset.action, u = r.dataset.assignmentId;
        if ((d === "claim" || d === "release") && u) {
          this.runInlineAction(d, u);
          return;
        }
        (d === "approve" || d === "reject" || d === "archive") && u && this.runReviewAction(d, u);
      });
    });
    const e = this.container.querySelector("[data-translation-select-all], [data-select-all]");
    e && e.addEventListener("change", () => {
      e.checked ? this.selectAllPage() : this.clearSelection();
    }), this.container.querySelectorAll("[data-translation-select-row], [data-select-row]").forEach((r) => {
      r.addEventListener("change", (d) => {
        d.stopPropagation();
        const u = r.dataset.translationSelectRow || r.dataset.selectRow;
        u && this.toggleRowSelection(u);
      }), r.addEventListener("click", (d) => {
        d.stopPropagation();
      });
    });
    const t = this.container.querySelector("[data-bulk-clear]");
    t && t.addEventListener("click", () => {
      this.clearSelection();
    });
    const a = this.container.querySelector("[data-select-all-matching]");
    a && a.addEventListener("click", () => {
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
        const u = r.dataset.toggleGroup;
        u && this.toggleGroupExpansion(u);
      });
    }), this.container.querySelectorAll("[data-overflow-menu]").forEach((r) => {
      r.addEventListener("click", (d) => {
        d.stopPropagation();
        const u = r.dataset.overflowMenu;
        if (!u) return;
        let m = r.closest(".queue-action-overflow-container")?.querySelector(`#menu-${u}`);
        if (m || (m = this.container?.querySelector(`#menu-${u}`) || null), !m) return;
        const v = m.hidden === !1;
        this.container?.querySelectorAll(".queue-action-overflow-menu").forEach((f) => {
          f.hidden = !0;
        }), this.container?.querySelectorAll("[data-overflow-menu]").forEach((f) => {
          f.setAttribute("aria-expanded", "false");
        }), v ? (m.hidden = !0, r.setAttribute("aria-expanded", "false")) : (m.hidden = !1, r.setAttribute("aria-expanded", "true"), m.querySelector('[role="menuitem"]:not([disabled])')?.focus());
      });
    }), this.container.querySelectorAll(".queue-action-overflow-menu").forEach((r) => {
      r.addEventListener("keydown", (d) => {
        const u = Array.from(r.querySelectorAll('[role="menuitem"]:not([disabled])')), m = u.findIndex((v) => v === document.activeElement);
        switch (d.key) {
          case "Escape":
            d.preventDefault(), r.hidden = !0;
            const v = r.closest(".queue-action-overflow-container")?.querySelector("[data-overflow-menu]");
            v && (v.setAttribute("aria-expanded", "false"), v.focus());
            break;
          case "ArrowDown":
            d.preventDefault(), m < u.length - 1 ? u[m + 1]?.focus() : u[0]?.focus();
            break;
          case "ArrowUp":
            d.preventDefault(), m > 0 ? u[m - 1]?.focus() : u[u.length - 1]?.focus();
            break;
          case "Tab":
            r.hidden = !0;
            const f = r.closest(".queue-action-overflow-container")?.querySelector("[data-overflow-menu]");
            f && f.setAttribute("aria-expanded", "false");
            break;
        }
      });
    });
    const n = this.container.querySelector("[data-expand-all]");
    n && n.addEventListener("click", () => {
      this.expandAllFamilyGroups();
    });
    const l = this.container.querySelector("[data-collapse-all]");
    l && l.addEventListener("click", () => {
      this.collapseAllFamilyGroups();
    }), this.container.querySelectorAll("[data-group-id]").forEach((r) => {
      (r.tagName.toLowerCase() === "tr" || r.classList.contains("family-group-mobile-header")) && (r.addEventListener("click", (d) => {
        if (d.target?.closest("button, a, input, select, textarea")) return;
        const u = r.dataset.groupId;
        u && this.toggleGroupExpansion(u);
      }), r.addEventListener("keydown", (d) => {
        if (!ve(d, r) && (d.key === "Enter" || d.key === " ")) {
          d.preventDefault();
          const u = r.dataset.groupId;
          u && this.toggleGroupExpansion(u);
        }
      }));
    }), this.attachAssignmentNavigationTargets("[data-translation-row], [data-assignment-row]"), this.attachAssignmentNavigationTargets("[data-assignment-card]");
  }
  attachAssignmentNavigationTargets(e) {
    this.container && this.container.querySelectorAll(e).forEach((t) => {
      const a = () => t.dataset.translationRowId || t.dataset.assignmentId || "";
      t.addEventListener("click", (s) => {
        s.target?.closest("button, a, input, select, textarea") || this.openAssignment(a());
      }), t.addEventListener("keydown", (s) => {
        if (ve(s, t)) return;
        const n = s.key;
        if (n === "Enter" || n === " ") {
          s.preventDefault(), this.openAssignment(a());
          return;
        }
        if (n !== "ArrowDown" && n !== "ArrowUp") return;
        const l = t.dataset.translationNavGroup || t.dataset.assignmentNavGroup;
        if (!l) return;
        s.preventDefault();
        const r = Array.from(this.container?.querySelectorAll(`[data-translation-nav-group="${l}"], [data-assignment-nav-group="${l}"]`) || []), d = r.indexOf(t);
        d < 0 || r[n === "ArrowDown" ? Math.min(d + 1, r.length - 1) : Math.max(d - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
ae = Ae;
ae.PANEL_ID = "translation-queue";
ae.FILTERS_STORAGE_KEY = "go-admin:queue-filters-expanded";
function Z(i) {
  return [
    i.source_title || i.source_path || i.id,
    `${i.source_locale.toUpperCase()} to ${i.target_locale.toUpperCase()}`,
    i.queue_state,
    i.due_state
  ].filter(Boolean).join(", ");
}
function O(i, e) {
  return (e || i || "").trim();
}
function ie(i, e, t) {
  const a = O(e, t);
  if (!a) return "";
  const s = (e || "").trim();
  return !s || a === s ? `${i}: ${a}` : `${i}: ${a} (${s})`;
}
function N(i, e, t, a) {
  const s = O(t, a);
  if (!s) return "";
  const n = ie(e, t, a);
  return `<span class="${c(i)}" title="${c(n)}" aria-label="${c(n)}">${p(s)}</span>`;
}
function y(i) {
  return i ? i.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function Qt() {
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

    [data-assignment-queue-content="true"] {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 0;
    }

    .assignment-queue-results {
      position: relative;
      min-height: 4rem;
      transition: opacity 160ms ease;
    }

    .assignment-queue-results[data-refreshing="true"] > :not(.assignment-queue-refresh-overlay) {
      opacity: 0.52;
      pointer-events: none;
    }

    .assignment-queue-refresh-overlay {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.68);
      color: #1f2937;
      font-size: 0.875rem;
      font-weight: 600;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .assignment-queue-results {
        transition: none;
      }
    }

    /* Filter field styling */
    .queue-filter-field select,
    .queue-filter-field input[type="text"],
    .queue-filter-field input[type="search"] {
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #111827;
      font: inherit;
      padding: 0.5rem 0.75rem;
      width: 100%;
    }

    .queue-filter-field select:focus,
    .queue-filter-field input[type="text"]:focus,
    .queue-filter-field input[type="search"]:focus {
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
function Ut() {
  if (typeof document > "u") return;
  const i = "assignment-queue-styles";
  if (document.getElementById(i)) return;
  const e = document.createElement("style");
  e.id = i, e.textContent = Qt(), document.head.appendChild(e);
}
function Ht(i, e) {
  Ut();
  const t = new Ae(e);
  return t.mount(i), t;
}
function Kt(i, e) {
  !i || i.dataset.assignmentQueueEnhanced === "true" || (i.dataset.assignmentQueueEnhanced = "true", Qe(i), ot(i, { endpoint: i.dataset.actionEndpoint || e }), ke(i));
}
function Vt() {
  if (typeof window > "u" || !window.location) return !1;
  const i = (qe(window.location) ?? new URLSearchParams()).get("translation_client_render");
  return i === "1" || i === "true";
}
function ci(i) {
  const e = i.dataset.endpoint || i.dataset.assignmentListEndpoint || "";
  if (!e) return null;
  if (i.dataset.ssrEnhanced === "true" && !Vt())
    return Kt(i, e), null;
  const t = (typeof window < "u" ? qe(window.location) : null) ?? new URLSearchParams(), a = At(t, {
    tenantId: i.dataset.tenantId || void 0,
    orgId: i.dataset.orgId || void 0,
    channel: i.dataset.channel || void 0
  });
  return Ht(i, {
    endpoint: e,
    bulkActionEndpoint: i.dataset.bulkActionEndpoint || i.dataset.bulkActionsEndpoint || "",
    bulkSnapshotEndpoint: i.dataset.bulkSnapshotEndpoint || "",
    editorBasePath: i.dataset.editorBasePath || "",
    title: i.dataset.title,
    description: i.dataset.description,
    initialPresetId: i.dataset.initialPresetId || we(t, "preset") || "",
    initialQueryState: a,
    hasExplicitQueryState: xt(t)
  });
}
function ye(i) {
  const e = i.trim();
  if (!e) return "/admin/api/translations/assignment-actions/bulk";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/bulk` : "/admin/api/translations/assignment-actions/bulk";
}
function be(i) {
  const e = i.trim();
  if (!e) return "/admin/api/translations/assignment-actions/snapshot";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/snapshot` : "/admin/api/translations/assignment-actions/snapshot";
}
export {
  G as AssignmentQueueRequestError,
  Ae as AssignmentQueueScreen,
  se as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  E as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  zt as applyOptimisticAssignmentAction,
  At as assignmentListQueryStateFromSearchParams,
  nt as buildAssignmentActionURL,
  Rt as buildAssignmentListQuery,
  It as buildAssignmentListURL,
  Mt as claimAssignment,
  Ht as createAssignmentQueueScreen,
  pe as destroyAssignmentQueueFilterTypeaheads,
  Tt as fetchAssignmentList,
  Qt as getAssignmentQueueStyles,
  xt as hasAssignmentListQueryState,
  ke as initAssignmentQueueFilterTypeaheads,
  ci as initAssignmentQueueScreen,
  ot as initAssignmentSSRRowActions,
  Ft as normalizeAssignmentActionResponse,
  wt as normalizeAssignmentListMeta,
  Lt as normalizeAssignmentListResponse,
  k as normalizeAssignmentListRow,
  T as presetToQueryState,
  Dt as releaseAssignment,
  ye as resolveAssignmentBulkActionEndpoint,
  be as resolveAssignmentBulkSnapshotEndpoint,
  Et as snapshotFiltersFromQueryState
};

//# sourceMappingURL=index.js.map
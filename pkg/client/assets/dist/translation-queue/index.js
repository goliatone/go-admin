import { escapeAttribute as c, escapeHTML as u } from "../shared/html.js";
import { httpRequest as L, readHTTPError as ce } from "../shared/transport/http-client.js";
import { extractStructuredError as ue } from "../toast/error-helpers.js";
import { T as pe, Y as G, c as me, h as he, i as ge, l as fe, o as O, t as ve, v as q, x as be, y as ye } from "../chunks/grouped-mode-D5oZzoVA.js";
import { buildEndpointURL as _e, getStringSearchParam as we, readLocationSearchParams as $e, setNumberSearchParam as ae, setSearchParam as b } from "../shared/query-state/url-state.js";
import { StatefulController as ke } from "../shared/stateful-controller.js";
import { asNumber as h, asRecord as m, asString as r } from "../shared/coercion.js";
import { B, C as xe, F as Se, H as qe, I as Ae, L as Re, O as Ee, R as Ie, S as Pe, T as Ce, U as T, V as Fe, _ as Le, a as N, c as H, g as Me, h as Be, m as Te, o as je, p as De, u as g, v as ze, w as Ge, x as Oe, z as j } from "../chunks/translation-shared-CQJ98SgC.js";
import { formatTranslationShortDateTime as U } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as C } from "../shared/record-normalization.js";
var Z, z = class extends Error {
  constructor(a) {
    super(a.message), this.name = "AssignmentQueueRequestError", this.status = a.status, this.code = a.code ?? null, this.metadata = a.metadata ?? null, this.requestId = a.requestId, this.traceId = a.traceId;
  }
}, R = [
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
function A(a) {
  const e = m(a);
  return {
    enabled: e.enabled === !0,
    reason: r(e.reason) || void 0,
    reason_code: r(e.reason_code) || void 0,
    permission: r(e.permission) || void 0
  };
}
function Ne(a) {
  const e = m(a), t = r(e.last_rejection_reason), s = r(e.last_reviewer_id);
  if (!(!t && !s))
    return {
      last_rejection_reason: t || void 0,
      last_reviewer_id: s || void 0
    };
}
function He(a) {
  const e = m(a), t = e.enabled === !0, s = h(e.warning_count), i = h(e.blocker_count), n = h(e.finding_count);
  if (!(!t && s <= 0 && i <= 0 && n <= 0))
    return {
      enabled: t,
      warning_count: s,
      blocker_count: i,
      finding_count: n
    };
}
function J(a) {
  switch (r(a)) {
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
      return r(a);
    default:
      return "open";
  }
}
function Q(a, e) {
  const t = a.headers.get(e);
  return typeof t == "string" ? t.trim() : "";
}
function Ue(a) {
  const e = Q(a, "x-request-id"), t = Q(a, "x-correlation-id"), s = Q(a, "x-trace-id") || t || void 0;
  return {
    requestId: e || void 0,
    traceId: s
  };
}
async function Qe(a, e) {
  return typeof a.clone == "function" ? ue(a.clone()) : {
    textCode: null,
    message: await ce(a, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function M(a, e) {
  const t = await Qe(a, e), s = Ue(a);
  return new z({
    message: t.message || `${e}: ${a.status}`,
    status: a.status,
    code: t.textCode,
    metadata: t.metadata,
    requestId: s.requestId,
    traceId: s.traceId
  });
}
function Ve(a) {
  const e = m(a), t = r(e.id), s = r(e.label);
  if (!t || !s) return null;
  const i = m(e.query);
  return {
    id: t,
    label: s,
    description: r(e.description) || void 0,
    review_state: r(e.review_state) || void 0,
    query: {
      status: r(i.status) || void 0,
      assignee_id: r(i.assignee_id) || void 0,
      reviewer_id: r(i.reviewer_id) || void 0,
      due_state: r(i.due_state) || void 0,
      locale: r(i.locale) || void 0,
      priority: r(i.priority) || void 0,
      family_id: r(i.family_id) || void 0,
      sort: r(i.sort) || void 0,
      order: r(i.order) || void 0
    }
  };
}
function ie(a, e = R) {
  const t = (Array.isArray(a) ? a : []).map((s) => Ve(s)).filter((s) => s !== null);
  return t.length ? t : e.map(F);
}
function F(a) {
  return {
    id: a.id,
    label: a.label,
    description: a.description,
    review_state: a.review_state,
    query: { ...a.query }
  };
}
function V(a) {
  return Array.from(new Set(a.map((e) => r(e)).filter(Boolean)));
}
function Ke(a) {
  const e = m(a), t = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((i) => r(i)).filter((i) => !!i) : [], s = m(e.default_sort);
  return {
    page: h(e.page) || 1,
    per_page: h(e.per_page) || 25,
    total: h(e.total),
    updated_at: r(e.updated_at) || void 0,
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
      key: r(s.key) || "updated_at",
      order: r(s.order) || "desc"
    },
    saved_filter_presets: ie(e.saved_filter_presets, R),
    saved_review_filter_presets: ie(e.saved_review_filter_presets, ee),
    default_review_filter_preset: r(e.default_review_filter_preset) || void 0,
    review_actor_id: r(e.review_actor_id) || void 0,
    review_aggregate_counts: C(e.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    grouping: Ye(e.grouping),
    family_total: h(e.family_total) || void 0,
    assignment_total: h(e.assignment_total) || void 0
  };
}
function Ye(a) {
  const e = m(a);
  if (!e) return;
  const t = m(m(e.capabilities).server_family), s = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((i) => r(i)).filter((i) => !!i) : void 0;
  return {
    enabled: e.enabled === !0,
    mode: r(e.mode) || "family_id",
    group_by: r(e.group_by) || "family_id",
    scope: r(e.scope) || "current_page",
    row_count: h(e.row_count),
    group_count: h(e.group_count),
    assignment_count: h(e.assignment_count),
    family_total: h(e.family_total) || void 0,
    assignment_total: h(e.assignment_total) || void 0,
    supported_modes: Array.isArray(e.supported_modes) ? e.supported_modes.map((i) => r(i)).filter(Boolean) : ["family_id"],
    supported_sort_keys: s,
    strategy: r(e.strategy) || "page_local",
    capabilities: { server_family: {
      supported: t.supported === !0,
      reason_code: r(t.reason_code) || void 0
    } }
  };
}
function Xe(a) {
  const e = m(a), t = Array.isArray(e.filter_summary) ? e.filter_summary : [];
  return {
    selectionScope: "filter_snapshot",
    snapshotId: r(e.snapshot_id),
    requested: h(e.requested),
    filters: m(e.filters),
    filterSummary: t.map((s) => r(s)).filter(Boolean),
    createdAt: r(e.created_at),
    expiresAt: r(e.expires_at)
  };
}
function re(a) {
  const e = r(a).toLowerCase();
  return e === "low" || e === "normal" || e === "high" || e === "urgent" ? e : "";
}
function We(a, e, t = {}) {
  return [
    "translation_queue_filter_snapshot",
    r(a),
    r(e),
    r(t.assigneeId),
    r(t.priority)
  ].join(":");
}
function Je(a = {}) {
  const e = new URLSearchParams();
  return b(e, "status", a.status), b(e, "assignee_id", a.assigneeId), b(e, "reviewer_id", a.reviewerId), b(e, "due_state", a.dueState), b(e, "locale", a.locale), b(e, "priority", a.priority), b(e, "review_state", a.reviewState), b(e, "family_id", a.familyId), ae(e, "page", a.page, { min: 1 }), ae(e, "per_page", a.perPage, { min: 1 }), b(e, "sort", a.sort), b(e, "order", a.order), b(e, "group_by", a.groupBy), b(e, "group_strategy", a.groupStrategy), e.toString();
}
function Ze(a = {}) {
  const e = {}, t = (s, i) => {
    const n = r(i);
    n && (e[s] = n);
  };
  return t("status", a.status), t("assignee_id", a.assigneeId), t("reviewer_id", a.reviewerId), t("due_state", a.dueState), t("locale", a.locale), t("priority", a.priority), t("review_state", a.reviewState), t("family_id", a.familyId), t("sort", a.sort), t("order", a.order), e;
}
function et(a, e = {}) {
  const t = Je(e);
  return t ? _e(a, new URLSearchParams(t), { preserveAbsolute: !0 }) : a;
}
function S(a) {
  const e = m(a);
  return {
    id: r(e.id),
    family_id: r(e.family_id),
    entity_type: r(e.entity_type),
    source_record_id: r(e.source_record_id),
    target_record_id: r(e.target_record_id),
    source_locale: r(e.source_locale),
    target_locale: r(e.target_locale),
    work_scope: r(e.work_scope) || void 0,
    source_title: r(e.source_title),
    source_path: r(e.source_path),
    assignee_id: r(e.assignee_id),
    reviewer_id: r(e.reviewer_id),
    assignment_type: r(e.assignment_type),
    content_state: r(e.content_state),
    queue_state: J(e.queue_state),
    status: J(e.status),
    priority: r(e.priority) || "normal",
    due_state: r(e.due_state) || "none",
    due_date: r(e.due_date) || void 0,
    row_version: h(e.row_version || e.version),
    version: h(e.version || e.row_version),
    updated_at: r(e.updated_at),
    created_at: r(e.created_at),
    actions: {
      claim: A(m(e.actions).claim),
      release: A(m(e.actions).release)
    },
    review_actions: {
      submit_review: A(m(e.review_actions).submit_review),
      approve: A(m(e.review_actions).approve),
      reject: A(m(e.review_actions).reject),
      archive: A(m(e.review_actions).archive)
    },
    last_rejection_reason: r(e.last_rejection_reason) || void 0,
    review_feedback: Ne(e.review_feedback),
    qa_summary: He(e.qa_summary)
  };
}
function tt(a, e) {
  const t = m(a), s = m(t.expansion), i = m(s.params), n = r(t.family_id);
  return {
    id: r(t.id) || `family:${n}`,
    row_type: "family",
    family_id: n,
    family_label: r(t.family_label) || r(t.source_title) || n,
    entity_type: r(t.entity_type),
    source_record_id: r(t.source_record_id),
    source_locale: r(t.source_locale),
    source_title: r(t.source_title),
    source_path: r(t.source_path),
    assignment_count: h(t.assignment_count),
    locale_count: h(t.locale_count),
    target_locales: Array.isArray(t.target_locales) ? t.target_locales.map((d) => r(d)).filter(Boolean) : [],
    status_counts: C(t.status_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    due_state_counts: C(t.due_state_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    priority_counts: C(t.priority_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    family_blocker_count: t.family_blocker_count === null || t.family_blocker_count === void 0 ? null : h(t.family_blocker_count),
    family_blocker_count_available: t.family_blocker_count_available === !0,
    family_blocker_count_reason: r(t.family_blocker_count_reason),
    action_hints: C(t.action_hints, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    expansion: {
      href: r(s.href),
      route: r(s.route),
      params: Object.fromEntries(Object.entries(i).map(([d, l]) => [d, r(l)])),
      query: m(s.query)
    },
    expanded: e.has(n),
    children: []
  };
}
function st(a) {
  const e = m(a), t = Ke(e.meta), s = Array.isArray(e.data) ? e.data : [];
  return t.grouping?.enabled ? {
    data: s.filter((i) => !!i && typeof i == "object" && !Array.isArray(i)).map((i) => ({ ...i })),
    meta: t
  } : {
    data: s.map((i) => S(i)),
    meta: t
  };
}
async function at(a) {
  const e = await L(a.href, { method: "GET" });
  if (!e.ok) throw await M(e, "Failed to load family assignments");
  const t = m(await e.json()), s = m(t.meta);
  return {
    rows: (Array.isArray(t.data) ? t.data : []).map((i) => S(i)),
    meta: {
      page: h(s.page) || 1,
      per_page: h(s.per_page) || 25,
      total: h(s.total),
      has_next: s.has_next === !0
    }
  };
}
function it(a) {
  const e = m(a), t = m(e.meta), s = m(e.data);
  return {
    data: {
      assignment_id: r(s.assignment_id),
      status: J(s.status),
      row_version: h(s.row_version),
      updated_at: r(s.updated_at),
      assignment: S(s.assignment)
    },
    meta: { idempotency_hit: t.idempotency_hit === !0 }
  };
}
async function rt(a, e = {}) {
  const t = await L(et(a, e), { method: "GET" });
  if (!t.ok) throw await M(t, "Failed to load assignments");
  return st(await t.json());
}
async function te(a, e, t, s) {
  const i = { expected_version: s.expected_version };
  s.idempotency_key && (i.idempotency_key = s.idempotency_key), s.reason && (i.reason = s.reason);
  const n = await L(`${a}/${encodeURIComponent(e)}/actions/${t}`, {
    method: "POST",
    json: i
  });
  if (!n.ok) throw await M(n, `Failed to ${t} assignment`);
  return it(await n.json());
}
function nt(a, e, t) {
  return te(a, e, "claim", t);
}
function ot(a, e, t) {
  return te(a, e, "release", t);
}
function D(a) {
  return {
    status: a.query.status,
    assigneeId: a.query.assignee_id,
    reviewerId: a.query.reviewer_id,
    dueState: a.query.due_state,
    locale: a.query.locale,
    priority: a.query.priority,
    reviewState: a.review_state,
    familyId: a.query.family_id,
    sort: a.query.sort,
    order: a.query.order,
    page: 1
  };
}
function ne(a, e) {
  return `queue-${a}-${e.id}-${e.version}-${Date.now()}`;
}
function lt(a, e) {
  return `queue-${a}-${e.id}-${e.version}-${Date.now()}`;
}
function dt(a) {
  const e = r(a);
  if (!e) return null;
  const t = R.find((i) => i.id === e);
  if (t) return {
    kind: "standard",
    preset: t
  };
  const s = ee.find((i) => i.id === e);
  return s ? {
    kind: "review",
    preset: s
  } : null;
}
function _(a) {
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
function K(a, e) {
  return {
    enabled: !1,
    permission: a,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function ct(a, e) {
  const t = _(a);
  return e === "claim" ? (t.queue_state = "in_progress", t.status = "in_progress", t.actions.claim = K(a.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), t.actions.release = {
    enabled: !0,
    permission: a.actions.release.permission
  }, t.review_actions.submit_review = {
    enabled: !0,
    permission: a.review_actions.submit_review.permission
  }, t) : (t.assignment_type = "open_pool", t.queue_state = "open", t.status = "open", t.assignee_id = "", t.actions.claim = {
    enabled: !0,
    permission: a.actions.claim.permission
  }, t.actions.release = K(a.actions.release.permission, "assignment must be assigned or in progress before it can be released"), t.review_actions.submit_review = K(a.review_actions.submit_review.permission, "assignment must be in progress"), t);
}
function P(a, e) {
  return a instanceof z ? {
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
function ut(a) {
  return r(a.queue_state || a.status);
}
function pt(a) {
  return a === "review" || a === "in_review";
}
function Y(a) {
  return pt(ut(a)) ? !0 : !!(a.review_actions.approve.enabled || a.review_actions.reject.enabled);
}
function X(a) {
  return !!a.review_actions.archive.enabled;
}
var de = class w extends ke {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.selectedRows = /* @__PURE__ */ new Map(), this.bulkActionPending = !1, this.bulkSnapshotPending = !1, this.filterSnapshot = null, this.viewMode = "flat", this.groupedData = null, this.serverFamilyRows = [], this.expandedGroups = /* @__PURE__ */ new Set(), this.filtersExpanded = !1;
    const t = r(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      bulkActionEndpoint: e.bulkActionEndpoint || oe(e.endpoint),
      bulkSnapshotEndpoint: e.bulkSnapshotEndpoint || le(e.endpoint),
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const s = dt(t);
    if (s?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = s.preset.id, this.activeReviewState = s.preset.review_state || null, this.queryState = D(s.preset);
      return;
    }
    const i = s?.preset || R[1] || R[0];
    this.activePresetId = i?.id || "open", this.queryState = i ? D(i) : {
      sort: "updated_at",
      order: "desc",
      page: 1
    };
    const n = fe(w.PANEL_ID);
    n && (this.viewMode = n, this.viewMode === "grouped" ? this.queryState.groupBy = "family_id" : this.viewMode === "server_family" && (this.queryState.groupBy = "family_id", this.queryState.groupStrategy = "server_family")), this.expandedGroups = me(w.PANEL_ID);
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
    return this.rows.map((e) => _(e));
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
    const t = this.rows.find((s) => s.id === e);
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
      const s = t.children.findIndex((i) => i.id === e.id);
      s >= 0 && (t.children[s] = _(e));
    }
  }
  async selectAllMatchingFilters() {
    this.bulkSnapshotPending = !0, this.feedback = null, this.render();
    try {
      const e = await L(this.config.bulkSnapshotEndpoint || le(this.config.endpoint), {
        method: "POST",
        json: { filters: Ze(this.queryState) }
      });
      if (!e.ok) throw await M(e, "Filter snapshot failed");
      const t = Xe(m(m(await e.json()).data));
      if (!t.snapshotId) throw new z({
        message: "Filter snapshot response did not include a snapshot id.",
        status: 500,
        code: "INVALID_SNAPSHOT_RESPONSE"
      });
      this.selectedRows.clear(), this.filterSnapshot = t, this.feedback = {
        kind: "success",
        message: `${t.requested} matching assignment${t.requested !== 1 ? "s" : ""} selected.`
      };
    } catch (e) {
      this.feedback = P(e, "Filter snapshot failed.");
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
    const s = Array.from(this.selectedRows.values());
    this.bulkActionPending = !0, this.feedback = null, this.render();
    try {
      const i = await this.executeBulkAction({
        action: e,
        assignments: s,
        reason: t?.reason,
        priority: t?.priority
      });
      for (const n of i.data.results) if (n.success && n.assignment) {
        const d = this.rows.findIndex((l) => l.id === n.assignmentId);
        d >= 0 && (this.rows[d] = _(n.assignment)), this.selectedRows.delete(n.assignmentId);
      }
      if (i.data.failed > 0) {
        const n = i.data.results.filter((d) => !d.success).map((d) => d.assignmentId).slice(0, 3);
        this.feedback = {
          kind: "error",
          message: `${i.data.succeeded} succeeded, ${i.data.failed} failed. Failed: ${n.join(", ")}${i.data.failed > 3 ? "..." : ""}`
        };
      } else this.feedback = {
        kind: "success",
        message: `${i.data.succeeded} assignment${i.data.succeeded !== 1 ? "s" : ""} updated.`
      };
    } catch (i) {
      this.feedback = P(i, `Bulk ${e} failed.`);
    } finally {
      this.bulkActionPending = !1, this.render();
    }
  }
  async runFilterSnapshotBulkAction(e, t) {
    const s = this.filterSnapshot;
    if (!s) {
      this.feedback = {
        kind: "error",
        message: "No filter snapshot selected."
      }, this.render();
      return;
    }
    const i = t || this.promptFilterSnapshotActionOptions(e);
    if (i === null) return;
    const n = s.filterSummary.length ? `

${s.filterSummary.join(`
`)}` : "";
    if (typeof window > "u" || typeof window.confirm != "function" || window.confirm(`Apply ${e} to ${s.requested} matching assignment${s.requested !== 1 ? "s" : ""}?${n}`)) {
      this.bulkActionPending = !0, this.feedback = null, this.render();
      try {
        const d = await this.executeBulkAction({
          action: e,
          selectionScope: "filter_snapshot",
          snapshotId: s.snapshotId,
          assigneeId: i.assigneeId,
          priority: i.priority,
          idempotencyKey: We(s.snapshotId, e, i)
        });
        d.data.failed > 0 ? this.feedback = {
          kind: "error",
          message: `${d.data.succeeded} succeeded, ${d.data.failed} failed.`
        } : this.feedback = {
          kind: "success",
          message: `${d.data.succeeded} assignment${d.data.succeeded !== 1 ? "s" : ""} updated.`
        }, this.filterSnapshot = null, this.selectedRows.clear(), await this.load();
      } catch (d) {
        this.feedback = P(d, `Bulk ${e} failed.`);
      } finally {
        this.bulkActionPending = !1, this.render();
      }
    }
  }
  promptFilterSnapshotActionOptions(e) {
    if (e === "assign") {
      const t = this.queryState.assigneeId && this.queryState.assigneeId !== "__me__" ? this.queryState.assigneeId : "", s = r(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Assign matching assignments to", t));
      return s ? { assigneeId: s } : null;
    }
    if (e === "priority") {
      const t = re(this.queryState.priority || "normal"), s = re(r(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Set matching assignments priority", t)));
      return s ? { priority: s } : (this.feedback = {
        kind: "error",
        message: "Priority must be low, normal, high, or urgent."
      }, this.render(), null);
    }
    return {};
  }
  async executeBulkAction(e) {
    const t = await L(this.config.bulkActionEndpoint || oe(this.config.endpoint), {
      method: "POST",
      json: {
        action: e.action,
        selection_scope: e.selectionScope || "current_page",
        snapshot_id: e.snapshotId,
        idempotency_key: e.idempotencyKey,
        assignments: (e.assignments || []).map(($) => ({
          assignment_id: $.assignmentId,
          expected_version: $.expectedVersion
        })),
        assignee_id: e.assigneeId,
        reason: e.reason,
        priority: e.priority
      }
    });
    if (!t.ok) throw await M(t, `Bulk ${e.action} failed`);
    const s = m(await t.json()), i = m(s.data), n = m(s.meta), d = Array.isArray(i.results) ? i.results : [], l = h(n.requested), o = h(n.succeeded), p = h(n.failed), k = n.partial === !0, f = r(n.selection_scope) || "current_page";
    return {
      data: {
        action: r(i.action) || e.action,
        requested: l,
        succeeded: o,
        failed: p,
        partial: k,
        selectionScope: f,
        results: d.map(($) => {
          const v = m($), x = m(v.error);
          return {
            assignmentId: r(v.assignment_id),
            success: r(v.status) === "succeeded",
            error: r(x.message) || r(v.error) || void 0,
            errorCode: r(x.code) || r(v.error_code) || void 0,
            assignment: v.assignment ? S(v.assignment) : void 0
          };
        })
      },
      meta: {
        action: r(i.action) || e.action,
        requested: l,
        succeeded: o,
        failed: p,
        partial: k,
        selection_scope: f
      }
    };
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await rt(this.config.endpoint, this.queryState);
      if (this.response = e, this.viewMode === "server_family" && e.meta.grouping?.strategy === "server_family") {
        this.groupedData = null, this.serverFamilyRows = e.data.map((t) => tt(t, this.expandedGroups)), this.rows = this.serverFamilyRows.flatMap((t) => t.children.map((s) => _(s))), this.state = this.serverFamilyRows.length ? "ready" : "empty", this.render();
        return;
      }
      if (this.serverFamilyRows = [], this.viewMode === "grouped" && e.meta.grouping?.enabled) {
        const t = he(e.data, {
          defaultExpanded: !0,
          expandMode: "explicit",
          expandedGroups: this.expandedGroups
        });
        if (t) {
          this.groupedData = t, this.rows = [];
          for (const s of t.groups) for (const i of s.records) this.rows.push(S(i));
          for (const s of t.ungrouped) this.rows.push(S(s));
        } else
          this.groupedData = null, this.rows = e.data.map((s) => _(s));
      } else
        this.groupedData = null, this.rows = e.data.map((t) => _(t));
      this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof z && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  getViewMode() {
    return this.viewMode;
  }
  setViewMode(e) {
    if (this.viewMode !== e) {
      if (this.viewMode = e, ye(w.PANEL_ID, e), e === "grouped") {
        const { groupStrategy: t, ...s } = this.queryState;
        this.queryState = {
          ...s,
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
        const { groupBy: t, groupStrategy: s, ...i } = this.queryState;
        this.queryState = i;
      }
      this.feedback = null, this.clearSelection(), this.load();
    }
  }
  toggleGroupExpansion(e) {
    if (this.viewMode === "server_family") {
      this.toggleServerFamilyExpansion(e);
      return;
    }
    this.groupedData && (this.groupedData = pe(this.groupedData, e), this.expandedGroups = O(this.groupedData), q(w.PANEL_ID, this.expandedGroups), this.render());
  }
  async toggleServerFamilyExpansion(e) {
    const t = this.serverFamilyRows.find((s) => s.family_id === e);
    if (t) {
      if (t.expanded = !t.expanded, t.expanded ? this.expandedGroups.add(e) : this.expandedGroups.delete(e), q(w.PANEL_ID, this.expandedGroups), !t.expanded || t.children.length || t.loading) {
        this.rows = this.serverFamilyRows.flatMap((s) => s.children.map((i) => _(i))), this.render();
        return;
      }
      t.loading = !0, t.error = "", this.render();
      try {
        const s = await at(t.expansion);
        t.children = s.rows, t.childMeta = s.meta, this.rows = this.serverFamilyRows.flatMap((i) => i.children.map((n) => _(n)));
      } catch (s) {
        t.error = s instanceof Error ? s.message : "Failed to load family assignments.";
      } finally {
        t.loading = !1, this.render();
      }
    }
  }
  expandAllFamilyGroups() {
    if (this.viewMode === "server_family") {
      for (const e of this.serverFamilyRows)
        this.expandedGroups.add(e.family_id), e.expanded = !0;
      q(w.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = ge(this.groupedData), this.expandedGroups = O(this.groupedData), q(w.PANEL_ID, this.expandedGroups), this.render());
  }
  collapseAllFamilyGroups() {
    if (this.viewMode === "server_family") {
      this.expandedGroups.clear();
      for (const e of this.serverFamilyRows) e.expanded = !1;
      q(w.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = ve(this.groupedData), this.expandedGroups = O(this.groupedData), q(w.PANEL_ID, this.expandedGroups), this.render());
  }
  async runInlineAction(e, t) {
    const s = this.rows.findIndex((o) => o.id === t);
    if (s < 0) return;
    const i = this.rows[s], n = i.actions[e];
    if (!n.enabled) {
      this.feedback = {
        kind: n.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n.reason || `Cannot ${e} this assignment.`,
        code: n.reason_code || null
      }, this.render();
      return;
    }
    const d = _(i), l = `${e}:${t}`;
    this.pendingActions.add(l), this.feedback = null, this.rows[s] = ct(i, e), this.replaceCachedRow(this.rows[s]), this.render();
    try {
      const o = e === "claim" ? await nt(this.config.endpoint, t, {
        expected_version: d.version,
        idempotency_key: ne("claim", d)
      }) : await ot(this.config.endpoint, t, {
        expected_version: d.version,
        idempotency_key: ne("release", d)
      });
      this.rows[s] = _(o.data.assignment), this.replaceCachedRow(this.rows[s]), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (o) {
      this.rows[s] = d, this.replaceCachedRow(d), this.feedback = P(o, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(l), this.render();
    }
  }
  async runReviewAction(e, t) {
    const s = this.rows.findIndex((o) => o.id === t);
    if (s < 0) return;
    const i = this.rows[s], n = i.review_actions[e];
    if (!n?.enabled) {
      this.feedback = {
        kind: n?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n?.reason || `Cannot ${e} this assignment.`,
        code: n?.reason_code || null
      }, this.render();
      return;
    }
    const d = {
      expected_version: i.version,
      idempotency_key: lt(e, i)
    };
    if (e === "reject") {
      const o = typeof window < "u" ? window.prompt("Reject reason") : "";
      if (!o || !o.trim()) {
        this.feedback = {
          kind: "error",
          message: "Reject reason is required.",
          code: "VALIDATION_ERROR"
        }, this.render();
        return;
      }
      d.reason = o.trim();
    }
    const l = `${e}:${t}`;
    this.pendingActions.add(l), this.feedback = null, this.render();
    try {
      const o = await te(this.config.endpoint, t, e, d);
      this.rows[s] = _(o.data.assignment), this.replaceCachedRow(this.rows[s]), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (o) {
      this.feedback = P(o, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(l), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((s) => s.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = D(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((s) => s.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = D(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(F) : R.map(F);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(F) : ee.map(F);
  }
  get visibleRows() {
    return this.rows;
  }
  getActiveFilterCount() {
    let e = 0;
    return this.queryState.status && e++, this.queryState.dueState && e++, this.queryState.priority && e++, this.queryState.locale && e++, this.queryState.assigneeId && e++, this.queryState.reviewerId && e++, e;
  }
  toggleFiltersExpanded() {
    this.filtersExpanded = !this.filtersExpanded, this.persistFiltersExpanded(), this.render();
  }
  persistFiltersExpanded() {
    try {
      localStorage.setItem(w.FILTERS_STORAGE_KEY, this.filtersExpanded ? "true" : "false");
    } catch {
    }
  }
  loadFiltersExpandedState() {
    try {
      this.filtersExpanded = localStorage.getItem(w.FILTERS_STORAGE_KEY) === "true";
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
      locale: void 0,
      assigneeId: void 0,
      reviewerId: void 0,
      page: 1
    }, this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.filterSnapshot = null, this.selectedRows.clear(), this.load();
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <header class="${Oe}">
          <div class="${xe}">
            <div>
              <p class="${Ge}">Queue</p>
              <h1 class="${Ce}">${u(this.config.title)}</h1>
              <p class="${Pe} max-w-2xl">${u(this.config.description)}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                <span class="text-gray-500">Rows</span> ${this.visibleRows.length}
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                <span class="text-gray-500">Total</span> ${this.response?.meta.total ?? 0}
              </span>
              <button type="button" class="${g}" data-queue-refresh="true">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </header>
        ${this.renderFeedback()}
        ${this.renderBulkActionBar()}
        ${this.renderFilterSnapshotBar()}
        ${this.renderReviewStateBar()}
        ${this.renderPresetBar()}
        ${this.renderViewModeToggle()}
        ${this.renderFilters()}
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
    const e = this.response?.meta.total ?? 0, t = this.visibleRows.length;
    if (this.viewMode === "server_family") {
      const n = this.response?.meta.assignment_total ?? this.response?.meta.grouping?.assignment_total ?? 0;
      return `
        <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="Server-side family pagination">
          <div class="filter-snapshot-copy">
            <strong>${e} ${e === 1 ? "family" : "families"} match current filters</strong>
            <span>${this.serverFamilyRows.length} visible on this family page · ${n} matching assignments</span>
          </div>
        </section>
      `;
    }
    if (e === 0 && !this.filterSnapshot) return "";
    const s = this.filterSnapshot, i = this.bulkSnapshotPending || this.bulkActionPending;
    if (s) {
      const n = s.filterSummary.slice(0, 4);
      return `
        <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="All matching filter selection">
          <div class="filter-snapshot-copy">
            <strong>${s.requested} matching assignment${s.requested !== 1 ? "s" : ""} selected</strong>
            ${n.length ? `<span>${n.map((d) => u(d)).join(" · ")}</span>` : ""}
          </div>
          <div class="filter-snapshot-actions">
            <button type="button" class="${g}" data-filter-snapshot-clear="true" ${i ? "disabled" : ""}>Clear</button>
            <button type="button" class="${g}" data-filter-snapshot-action="assign" ${i || s.requested === 0 ? "disabled" : ""}>Assign</button>
            <button type="button" class="${g}" data-filter-snapshot-action="release" ${i || s.requested === 0 ? "disabled" : ""}>Release</button>
            <button type="button" class="${g}" data-filter-snapshot-action="priority" ${i || s.requested === 0 ? "disabled" : ""}>Priority</button>
            <button type="button" class="${g}" data-filter-snapshot-action="archive" ${i || s.requested === 0 ? "disabled" : ""}>Archive</button>
          </div>
        </section>
      `;
    }
    return `
      <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="All matching filter selection">
        <div class="filter-snapshot-copy">
          <strong>${e} assignment${e !== 1 ? "s" : ""} match current filters</strong>
          <span>${t} visible on this page</span>
        </div>
        <button type="button" class="${g}" data-select-all-matching="true" ${i || e === 0 ? "disabled" : ""}>
          ${this.bulkSnapshotPending ? "Selecting…" : "Select all matching filters"}
        </button>
      </section>
    `;
  }
  renderPresetBar() {
    return `
      <nav class="panel-tabs border-b border-gray-200" role="tablist" aria-label="Saved queue filters">
        <div class="panel-tabs-container">
          ${this.savedFilterPresets.map((e) => `
            <button
              type="button"
              class="panel-tab ${this.activePresetId === e.id ? "panel-tab-active" : ""}"
              data-preset-id="${c(e.id)}"
              role="tab"
              aria-selected="${this.activePresetId === e.id ? "true" : "false"}"
              title="${c(e.description || e.label)}"
            >
              <span class="panel-tab-label">${u(e.label)}</span>
            </button>
          `).join("")}
        </div>
      </nav>
    `;
  }
  renderReviewStateBar() {
    if (!this.savedReviewFilterPresets.length) return "";
    const e = this.response?.meta.review_aggregate_counts || {}, s = !!this.response?.meta.review_actor_id;
    return `
      <section class="panel-tabs border-b border-gray-200" aria-label="Reviewer queue states">
        <div class="panel-tabs-container">
          ${this.savedReviewFilterPresets.map((i) => `
            <button
              type="button"
              class="panel-tab ${this.activeReviewPresetId === i.id ? "panel-tab-active" : ""}"
              data-review-preset-id="${c(i.id)}"
              role="tab"
              aria-selected="${this.activeReviewPresetId === i.id ? "true" : "false"}"
              title="${c(s ? i.description || i.label : "Reviewer metadata is required to use this preset.")}"
              ${s ? "" : 'disabled aria-disabled="true"'}
            >
              <span class="panel-tab-label">${u(i.label)}</span>
              <span class="ml-1.5 px-2 py-0.5 text-xs rounded-full ${this.activeReviewPresetId === i.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}">${e[i.id] ?? 0}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }
  renderViewModeToggle() {
    const e = this.viewMode === "grouped", t = this.viewMode === "server_family", s = !e && !t, i = this.groupedData?.totalGroups ?? 0, n = this.response?.meta.grouping?.assignment_count ?? this.rows.length, d = this.response?.meta.grouping?.capabilities?.server_family?.supported === !0, l = this.response?.meta.grouping?.family_total ?? this.response?.meta.family_total ?? this.serverFamilyRows.length, o = this.response?.meta.grouping?.assignment_total ?? this.response?.meta.assignment_total ?? 0;
    return `
      <div class="assignment-queue-view-mode" role="group" aria-label="View mode">
        <div class="view-mode-buttons">
          <button
            type="button"
            class="view-mode-button ${s ? "is-active" : ""}"
            data-view-mode="flat"
            aria-pressed="${s}"
            title="Show assignments as a flat list"
          >
            <svg class="view-mode-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z"/>
            </svg>
            <span>List</span>
          </button>
          <button
            type="button"
            class="view-mode-button ${e ? "is-active" : ""}"
            data-view-mode="grouped"
            aria-pressed="${e}"
            title="Group assignments by translation family"
          >
            <svg class="view-mode-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M2 2h4v4H2zM2 10h4v4H2zM8 2h6v2H8zM8 6h6v2H8zM8 10h6v2H8zM8 14h6v2H8z"/>
            </svg>
            <span>Grouped</span>
          </button>
          ${d || t ? `
            <button
              type="button"
              class="view-mode-button ${t ? "is-active" : ""}"
              data-view-mode="server_family"
              aria-pressed="${t}"
              title="${c(d ? "Use server-side family pagination" : "Server-side family grouping is unavailable for this repository")}"
              ${d ? "" : 'disabled aria-disabled="true"'}
            >
              <svg class="view-mode-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3 2h10v3H3zM2 7h5v3H2zM9 7h5v3H9zM2 12h5v3H2zM9 12h5v3H9z"/>
              </svg>
              <span>Families</span>
            </button>
          ` : ""}
        </div>
        ${e && this.groupedData ? `
          <div class="view-mode-info">
            <span class="view-mode-count">${i} ${i === 1 ? "family" : "families"} · ${n} assignments</span>
            <span class="view-mode-scope">(page-local counts)</span>
            <button type="button" class="view-mode-expand-all" data-expand-all="true" title="Expand all groups">
              Expand all
            </button>
            <button type="button" class="view-mode-collapse-all" data-collapse-all="true" title="Collapse all groups">
              Collapse all
            </button>
          </div>
        ` : ""}
        ${t ? `
          <div class="view-mode-info">
            <span class="view-mode-count">${l} ${l === 1 ? "family" : "families"} · ${o} assignments</span>
            <span class="view-mode-scope">(server-side family pages)</span>
            <button type="button" class="view-mode-expand-all" data-expand-all="true" title="Expand visible families">
              Expand all
            </button>
            <button type="button" class="view-mode-collapse-all" data-collapse-all="true" title="Collapse visible families">
              Collapse all
            </button>
          </div>
        ` : ""}
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
    ], s = [
      "none",
      "on_track",
      "due_soon",
      "overdue"
    ], i = [
      "",
      "low",
      "normal",
      "high",
      "urgent"
    ], n = ["", ...V(e.map((f) => f.target_locale))], d = ["", ...V(e.map((f) => f.assignee_id))], l = ["", ...V(e.map((f) => f.reviewer_id))], o = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
      "updated_at",
      "due_date",
      "priority",
      "status",
      "locale"
    ], p = this.getActiveFilterCount(), k = this.filtersExpanded ? "rotate-180" : "";
    return `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex items-center justify-between gap-4">
          <button
            type="button"
            class="${g}"
            data-filters-toggle="true"
            aria-expanded="${this.filtersExpanded}"
            aria-controls="queue-filters-panel"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            <span>Filters</span>
            ${p > 0 ? `<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">${p}</span>` : ""}
            <svg class="h-4 w-4 transition-transform ${k}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="flex items-center gap-3">
            ${this.renderSortControls(o)}
          </div>
        </div>
        <form
          id="queue-filters-panel"
          class="${this.filtersExpanded ? "" : "hidden"} mt-4 pt-4 border-t border-gray-100"
          data-queue-filters="true"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${this.renderSelect("status", "Status", t, this.queryState.status || "")}
            ${this.renderSelect("due_state", "Due State", ["", ...s], this.queryState.dueState || "")}
            ${this.renderSelect("priority", "Priority", i, this.queryState.priority || "")}
            ${this.renderSelect("locale", "Locale", n, this.queryState.locale || "")}
            ${this.renderSelect("assignee_id", "Assignee", d, this.queryState.assigneeId || "")}
            ${this.renderSelect("reviewer_id", "Reviewer", l, this.queryState.reviewerId || "")}
          </div>
          ${p > 0 ? `
            <div class="mt-4 flex items-center gap-2">
              <button type="button" class="${g}" data-clear-filters="true">
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
    const t = this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"), s = this.queryState.order || (this.response?.meta.default_sort.order ?? "desc");
    return `
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <span class="text-gray-500">Sort by</span>
        <select
          data-filter-name="sort"
          class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          ${e.map((i) => `
            <option value="${c(i)}" ${i === t ? "selected" : ""}>
              ${u(y(i))}
            </option>
          `).join("")}
        </select>
      </label>
      <button
        type="button"
        class="${je}"
        data-toggle-sort-order="true"
        title="${s === "asc" ? "Ascending (click for descending)" : "Descending (click for ascending)"}"
        aria-label="${s === "asc" ? "Sort ascending, click to sort descending" : "Sort descending, click to sort ascending"}"
      >
        ${s === "asc" ? '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>' : '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/></svg>'}
      </button>
    `;
  }
  renderSelect(e, t, s, i) {
    const n = [...s];
    return i && !n.includes(i) && n.push(i), `
      <label class="queue-filter-field">
        <span>${u(t)}</span>
        <select data-filter-name="${c(e)}">
          ${n.map((d) => `
            <option value="${c(d)}" ${d === i ? "selected" : ""}>
              ${u(d ? y(d) : `All ${t.toLowerCase()}`)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }
  renderBody() {
    const e = this.visibleRows;
    if (this.state === "loading" && !this.rows.length) return `
        <div class="${Ee}" data-queue-state="loading">
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
        ${e.map((s) => this.renderMobileCard(s)).join("")}
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
              <th scope="col">Content</th>
              <th scope="col">Locale</th>
              <th scope="col">Status</th>
              <th scope="col">Owners</th>
              <th scope="col">Due</th>
              <th scope="col">Priority</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${e.map((s) => this.renderRow(s)).join("")}
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
    const s = e.expanded ? "▼" : "▶", i = this.renderServerFamilyBlocker(e), n = e.expanded ? e.loading ? `<tr class="family-group-child"><td></td><td colspan="${t - 1}">Loading family assignments…</td></tr>` : e.error ? `<tr class="family-group-child"><td></td><td colspan="${t - 1}">${u(e.error)}</td></tr>` : e.children.map((d) => this.renderGroupChildRow(d, e.family_id)).join("") : "";
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
              <span class="family-group-expand-icon" aria-hidden="true">${s}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${u(e.family_label || e.family_id)}</strong>
              <span class="family-group-count">${e.assignment_count} ${e.assignment_count === 1 ? "assignment" : "assignments"} · ${e.locale_count} ${e.locale_count === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary server-family-summary">
              ${this.renderCountPills(e.status_counts)}
              ${this.renderPriorityPills(e.priority_counts)}
              ${i}
            </div>
          </div>
        </td>
      </tr>
      ${n}
    `;
  }
  renderServerFamilyMobile(e) {
    const t = e.expanded ? "▼" : "▶", s = e.expanded ? e.loading ? '<div class="family-group-mobile-child">Loading family assignments…</div>' : e.error ? `<div class="family-group-mobile-child">${u(e.error)}</div>` : e.children.map((i) => `<div class="family-group-mobile-child">${this.renderMobileCard(i)}</div>`).join("") : "";
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
      ${s}
    `;
  }
  renderCountPills(e) {
    return Object.entries(e).filter(([, t]) => t > 0).slice(0, 4).map(([t, s]) => `<span class="family-summary-pill">${u(y(t))} ${s}</span>`).join("");
  }
  renderPriorityPills(e) {
    return Object.entries(e).filter(([, t]) => t > 0).slice(0, 2).map(([t, s]) => `<span class="family-summary-pill priority-${c(t)}">${u(y(t))} ${s}</span>`).join("");
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
        ${this.groupedData.groups.map((s) => this.renderGroupedMobileCards(s)).join("")}
        ${this.groupedData.ungrouped.map((s) => this.renderMobileCard(S(s))).join("")}
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
              <th scope="col">Content</th>
              <th scope="col">Locale</th>
              <th scope="col">Status</th>
              <th scope="col">Owners</th>
              <th scope="col">Due</th>
              <th scope="col">Priority</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.groupedData.groups.map((s) => this.renderFamilyGroupRows(s, t)).join("")}
            ${this.groupedData.ungrouped.map((s) => this.renderRow(S(s))).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderFamilyGroupRows(e, t) {
    const s = be(e, { size: "sm" }), i = u(e.displayLabel || this.deriveFamilyGroupLabel(e)), n = e.records.length, d = e.expanded ? "▼" : "▶";
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
              <span class="family-group-expand-icon" aria-hidden="true">${d}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${i}</strong>
              <span class="family-group-count">${n} ${n === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary">
              ${s}
            </div>
          </div>
        </td>
      </tr>
    ` + (e.expanded ? e.records.map((l) => {
      const o = S(l);
      return this.renderGroupChildRow(o, e.groupId);
    }).join("") : "");
  }
  renderGroupChildRow(e, t) {
    const s = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), n = this.pendingActions.has(`approve:${e.id}`), d = this.pendingActions.has(`reject:${e.id}`), l = this.pendingActions.has(`archive:${e.id}`), o = s || !e.actions.claim.enabled, p = i || !e.actions.release.enabled, k = Y(e), f = X(e), $ = !!e.assignee_id, v = !!e.reviewer_id, x = !!e.due_date, E = x || e.due_state === "overdue" || e.due_state === "due_soon", I = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row family-group-child ${I ? "is-selected" : ""}"
          data-assignment-id="${c(e.id)}"
          data-parent-group="${c(t)}"
          data-assignment-row="true"
          data-assignment-nav-group="table"
          tabindex="0"
          aria-label="${c(W(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${c(e.id)}"
            ${I ? "checked" : ""}
            aria-label="Select assignment ${c(e.source_title || e.id)}"
          />
        </td>
        <td>
          <div class="queue-content-cell queue-content-cell-grouped">
            <span class="queue-content-indent"></span>
            <span class="queue-content-title-small">${u(e.source_title || e.source_path || e.id)}</span>
          </div>
        </td>
        <td>
          <div class="queue-locale-cell">
            <span class="locale-code">${u(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${u(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td>
          <div class="queue-status-cell">
            ${G(e.queue_state, {
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
        <td>
          <div class="queue-owner-cell">
            ${$ ? `<span class="queue-owner-value">${u(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${v ? `<span class="queue-reviewer-value">${u(e.reviewer_id)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${E ? `<span class="due-pill due-${c(e.due_state)}">${u(y(e.due_state))}</span>` : ""}
            ${x ? `<span class="queue-due-date">${u(U(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + y(e.priority))}"></span>
            <span class="priority-label">${u(y(e.priority))}</span>
          </div>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${g}"
                data-action="claim"
                data-assignment-id="${c(e.id)}"
                ${o ? "disabled" : ""}
                aria-disabled="${o ? "true" : "false"}"
                title="${c(s ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${s ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${g}"
                data-action="release"
                data-assignment-id="${c(e.id)}"
                ${p ? "disabled" : ""}
                aria-disabled="${p ? "true" : "false"}"
                title="${c(i ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${i ? "Releasing…" : "Release"}
              </button>
            </div>
            ${k ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${H}"
                  data-action="approve"
                  data-assignment-id="${c(e.id)}"
                  ${n || !e.review_actions.approve.enabled ? "disabled" : ""}
                  title="${c(n ? "Approving…" : e.review_actions.approve.reason || "Approve")}"
                >
                  ${n ? "…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${N}"
                  data-action="reject"
                  data-assignment-id="${c(e.id)}"
                  ${d || !e.review_actions.reject.enabled ? "disabled" : ""}
                  title="${c(d ? "Rejecting…" : e.review_actions.reject.reason || "Reject")}"
                >
                  ${d ? "…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${f ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${g}"
                  data-action="archive"
                  data-assignment-id="${c(e.id)}"
                  ${l || !e.review_actions.archive.enabled ? "disabled" : ""}
                  title="${c(l ? "Archiving…" : e.review_actions.archive.reason || "Archive")}"
                >
                  ${l ? "…" : "Archive"}
                </button>
              </div>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }
  renderGroupedMobileCards(e) {
    const t = u(e.displayLabel || this.deriveFamilyGroupLabel(e)), s = e.records.length, i = e.expanded ? "▼" : "▶";
    return `
      <div class="family-group-mobile-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
           data-group-id="${c(e.groupId)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${c(e.groupId)}">
          <span class="family-group-expand-icon">${i}</span>
          <span class="family-group-mobile-label">${t}</span>
          <span class="family-group-mobile-count">${s} ${s === 1 ? "locale" : "locales"}</span>
        </button>
      </div>
    ` + (e.expanded ? e.records.map((n) => {
      const d = S(n);
      return `<div class="family-group-mobile-child">${this.renderMobileCard(d)}</div>`;
    }).join("") : "");
  }
  deriveFamilyGroupLabel(e) {
    if (e.displayLabel) return e.displayLabel;
    if (e.records.length > 0) {
      const t = e.records[0], s = [
        r(t.source_title),
        r(t.source_path),
        r(t.source_record_id)
      ];
      for (const i of s) if (i) return i;
    }
    return `Family ${e.groupId.length > 20 ? e.groupId.slice(0, 17) + "..." : e.groupId}`;
  }
  renderEmptyState(e) {
    const t = e === "families" ? "No families found" : "No assignments found", s = e === "families" ? "No families match the current filters. Try adjusting your filters or check back later." : "No assignments match the current filters. Try adjusting your filters or selecting a different preset.", i = this.getActiveFilterCount();
    return `
      <div class="${De}" data-queue-state="empty">
        <svg class="h-12 w-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        <h3 class="${Be} mt-4">${u(t)}</h3>
        <p class="${Te} max-w-md mx-auto">${u(s)}</p>
        <div class="mt-5 flex items-center justify-center gap-3">
          ${i > 0 ? `
            <button type="button" class="${g}" data-clear-filters="true">
              Clear filters
            </button>
          ` : ""}
          <button type="button" class="${g}" data-queue-refresh="true">
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
      <div class="${Me} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${ze}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${Le} mt-2">${u(t)}</p>
        <div class="mt-4">
          <button type="button" class="${g}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), s = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), n = this.pendingActions.has(`reject:${e.id}`), d = this.pendingActions.has(`archive:${e.id}`), l = t || !e.actions.claim.enabled, o = s || !e.actions.release.enabled, p = Y(e), k = X(e), f = !!e.assignee_id, $ = !!e.reviewer_id, v = !!e.due_date, x = v || e.due_state === "overdue" || e.due_state === "due_soon", E = [];
    e.entity_type && E.push(e.entity_type), e.family_id && e.family_id !== e.source_path && E.push(e.family_id);
    const I = E.join(" · "), se = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row ${se ? "is-selected" : ""}" tabindex="0" data-assignment-id="${c(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${c(W(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${c(e.id)}"
            ${se ? "checked" : ""}
            aria-label="Select assignment ${c(e.source_title || e.id)}"
          />
        </td>
        <td>
          <div class="queue-content-cell">
            <strong class="queue-content-title">${u(e.source_title || e.source_path || e.id)}</strong>
            ${e.source_path && e.source_title ? `<span class="queue-content-path">${u(e.source_path)}</span>` : ""}
            ${I ? `<span class="queue-content-meta">${u(I)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-locale-cell">
            <span class="locale-code">${u(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${u(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td>
          <div class="queue-status-cell">
            ${G(e.queue_state, {
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
        <td>
          <div class="queue-owner-cell">
            ${f ? `<span class="queue-owner-value">${u(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${$ ? `<span class="queue-reviewer-value">${u(e.reviewer_id)}</span>` : ""}
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${u(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${x ? `<span class="due-pill due-${c(e.due_state)}">${u(y(e.due_state))}</span>` : ""}
            ${v ? `<span class="queue-due-date">${u(U(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + y(e.priority))}"></span>
            <span class="priority-label">${u(y(e.priority))}</span>
          </div>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${g}"
                data-action="claim"
                data-assignment-id="${c(e.id)}"
                ${l ? "disabled" : ""}
                aria-disabled="${l ? "true" : "false"}"
                title="${c(t ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${t ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${g}"
                data-action="release"
                data-assignment-id="${c(e.id)}"
                ${o ? "disabled" : ""}
                aria-disabled="${o ? "true" : "false"}"
                title="${c(s ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${s ? "Releasing…" : "Release"}
              </button>
            </div>
            ${p ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${H}"
                  data-action="approve"
                  data-assignment-id="${c(e.id)}"
                  ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${i || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${c(i ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${i ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${N}"
                  data-action="reject"
                  data-assignment-id="${c(e.id)}"
                  ${n || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${n || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${c(n ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${n ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${k ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${g}"
                  data-action="archive"
                  data-assignment-id="${c(e.id)}"
                  ${d || !e.review_actions.archive.enabled ? "disabled" : ""}
                  aria-disabled="${d || !e.review_actions.archive.enabled ? "true" : "false"}"
                  title="${c(d ? "Archiving assignment…" : e.review_actions.archive.reason || "Archive assignment")}"
                >
                  ${d ? "Archiving…" : "Archive"}
                </button>
              </div>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }
  renderMobileCard(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), s = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), n = this.pendingActions.has(`reject:${e.id}`), d = this.pendingActions.has(`archive:${e.id}`), l = t || !e.actions.claim.enabled, o = s || !e.actions.release.enabled, p = Y(e), k = X(e), f = !!e.assignee_id, $ = !!e.due_date, v = $ || e.due_state === "overdue" || e.due_state === "due_soon", x = this.isRowSelected(e.id);
    return `
      <article
        class="${Se} ${x ? "is-selected" : ""}"
        data-assignment-id="${c(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${c(W(e))}"
      >
        <div class="${Ie}">
          <div class="mobile-card-select">
            <input
              type="checkbox"
              class="queue-row-select"
              data-select-row="${c(e.id)}"
              ${x ? "checked" : ""}
              aria-label="Select assignment ${c(e.source_title || e.id)}"
            />
          </div>
          <div class="mobile-card-title-group">
            <h3 class="${qe}">${u(e.source_title || e.source_path || e.id)}</h3>
            <p class="${Fe}">${u(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${G(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${Re}">
          <div class="${B}">
            <span class="${j}">Locale</span>
            <span class="${T}">
              <span class="locale-code">${u(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${u(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${B}">
            <span class="${j}">Assignee</span>
            <span class="${T} ${f ? "" : "text-gray-400"}">${u(f ? e.assignee_id : "Unassigned")}</span>
          </div>
          <div class="${B}">
            <span class="${j}">Due</span>
            <span class="${T}">
              ${v ? `<span class="due-pill due-${c(e.due_state)}">${u(y(e.due_state))}</span>` : ""}
              ${$ ? `<span class="text-gray-600 ml-1">${u(U(e.due_date, ""))}</span>` : '<span class="text-gray-400">—</span>'}
            </span>
          </div>
          <div class="${B}">
            <span class="${j}">Priority</span>
            <span class="${T}">
              <span class="priority-indicator priority-${c(e.priority)}"></span>
              <span class="priority-label">${u(y(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${Ae}">
          <button
            type="button"
            class="${g} flex-1"
            data-action="claim"
            data-assignment-id="${c(e.id)}"
            ${l ? "disabled" : ""}
          >
            ${t ? "Claiming…" : "Claim"}
          </button>
          <button
            type="button"
            class="${g} flex-1"
            data-action="release"
            data-assignment-id="${c(e.id)}"
            ${o ? "disabled" : ""}
          >
            ${s ? "Releasing…" : "Release"}
          </button>
          ${p ? `
            <button
              type="button"
              class="${H} flex-1"
              data-action="approve"
              data-assignment-id="${c(e.id)}"
              ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
            >
              ${i ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              class="${N} flex-1"
              data-action="reject"
              data-assignment-id="${c(e.id)}"
              ${n || !e.review_actions.reject.enabled ? "disabled" : ""}
            >
              ${n ? "Rejecting…" : "Reject"}
            </button>
          ` : ""}
          ${k ? `
            <button
              type="button"
              class="${g}"
              data-action="archive"
              data-assignment-id="${c(e.id)}"
              ${d || !e.review_actions.archive.enabled ? "disabled" : ""}
            >
              ${d ? "Archiving…" : "Archive"}
            </button>
          ` : ""}
        </div>
      </article>
    `;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-preset-id]").forEach((l) => {
      l.addEventListener("click", () => {
        const o = l.dataset.presetId;
        o && this.setActivePreset(o);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((l) => {
      l.addEventListener("click", () => {
        const o = l.dataset.reviewPresetId;
        o && this.setActiveReviewPreset(o);
      });
    }), this.container.querySelectorAll("[data-filter-name]").forEach((l) => {
      l.addEventListener("change", () => {
        const o = l.dataset.filterName;
        if (!o) return;
        const p = l.value.trim();
        switch (o) {
          case "status":
            this.updateFilter({ status: p || void 0 });
            break;
          case "due_state":
            this.updateFilter({ dueState: p || void 0 });
            break;
          case "priority":
            this.updateFilter({ priority: p || void 0 });
            break;
          case "locale":
            this.updateFilter({ locale: p || void 0 });
            break;
          case "assignee_id":
            this.updateFilter({ assigneeId: p || void 0 });
            break;
          case "reviewer_id":
            this.updateFilter({ reviewerId: p || void 0 });
            break;
          case "sort":
            this.updateFilter({ sort: p || void 0 });
            break;
          case "order":
            this.updateFilter({ order: p || void 0 });
            break;
        }
      });
    }), this.container.querySelectorAll("[data-queue-refresh]").forEach((l) => {
      l.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-filters-toggle]").forEach((l) => {
      l.addEventListener("click", () => {
        this.toggleFiltersExpanded();
      });
    }), this.container.querySelectorAll("[data-clear-filters]").forEach((l) => {
      l.addEventListener("click", () => {
        this.clearAllFilters();
      });
    }), this.container.querySelectorAll("[data-toggle-sort-order]").forEach((l) => {
      l.addEventListener("click", () => {
        const o = this.queryState.order || "desc";
        this.updateFilter({ order: o === "asc" ? "desc" : "asc" });
      });
    }), this.container.querySelectorAll("[data-action]").forEach((l) => {
      l.addEventListener("click", () => {
        const o = l.dataset.action, p = l.dataset.assignmentId;
        if ((o === "claim" || o === "release") && p) {
          this.runInlineAction(o, p);
          return;
        }
        (o === "approve" || o === "reject" || o === "archive") && p && this.runReviewAction(o, p);
      });
    });
    const e = this.container.querySelector("[data-select-all]");
    e && e.addEventListener("change", () => {
      e.checked ? this.selectAllPage() : this.clearSelection();
    }), this.container.querySelectorAll("[data-select-row]").forEach((l) => {
      l.addEventListener("change", (o) => {
        o.stopPropagation();
        const p = l.dataset.selectRow;
        p && this.toggleRowSelection(p);
      }), l.addEventListener("click", (o) => {
        o.stopPropagation();
      });
    });
    const t = this.container.querySelector("[data-bulk-clear]");
    t && t.addEventListener("click", () => {
      this.clearSelection();
    });
    const s = this.container.querySelector("[data-select-all-matching]");
    s && s.addEventListener("click", () => {
      this.selectAllMatchingFilters();
    });
    const i = this.container.querySelector("[data-filter-snapshot-clear]");
    i && i.addEventListener("click", () => {
      this.clearSelection();
    }), this.container.querySelectorAll("[data-filter-snapshot-action]").forEach((l) => {
      l.addEventListener("click", () => {
        const o = l.dataset.filterSnapshotAction;
        (o === "assign" || o === "release" || o === "priority" || o === "archive") && this.runFilterSnapshotBulkAction(o);
      });
    }), this.container.querySelectorAll("[data-bulk-action]").forEach((l) => {
      l.addEventListener("click", () => {
        const o = l.dataset.bulkAction;
        (o === "release" || o === "archive") && this.runBulkAction(o);
      });
    }), this.container.querySelectorAll("[data-view-mode]").forEach((l) => {
      l.addEventListener("click", () => {
        const o = l.dataset.viewMode;
        (o === "flat" || o === "grouped" || o === "server_family") && this.setViewMode(o);
      });
    }), this.container.querySelectorAll("[data-toggle-group]").forEach((l) => {
      l.addEventListener("click", (o) => {
        o.stopPropagation();
        const p = l.dataset.toggleGroup;
        p && this.toggleGroupExpansion(p);
      });
    });
    const n = this.container.querySelector("[data-expand-all]");
    n && n.addEventListener("click", () => {
      this.expandAllFamilyGroups();
    });
    const d = this.container.querySelector("[data-collapse-all]");
    d && d.addEventListener("click", () => {
      this.collapseAllFamilyGroups();
    }), this.container.querySelectorAll("[data-group-id]").forEach((l) => {
      (l.tagName.toLowerCase() === "tr" || l.classList.contains("family-group-mobile-header")) && (l.addEventListener("click", (o) => {
        if (o.target?.closest("button, a, input, select, textarea")) return;
        const p = l.dataset.groupId;
        p && this.toggleGroupExpansion(p);
      }), l.addEventListener("keydown", (o) => {
        if (o.key === "Enter" || o.key === " ") {
          o.preventDefault();
          const p = l.dataset.groupId;
          p && this.toggleGroupExpansion(p);
        }
      }));
    }), this.attachAssignmentNavigationTargets("[data-assignment-row]"), this.attachAssignmentNavigationTargets("[data-assignment-card]");
  }
  attachAssignmentNavigationTargets(e) {
    this.container && this.container.querySelectorAll(e).forEach((t) => {
      t.addEventListener("click", (s) => {
        s.target?.closest("button, a, input, select, textarea") || this.openAssignment(t.dataset.assignmentId || "");
      }), t.addEventListener("keydown", (s) => {
        const i = s.key;
        if (i === "Enter" || i === " ") {
          s.preventDefault(), this.openAssignment(t.dataset.assignmentId || "");
          return;
        }
        if (i !== "ArrowDown" && i !== "ArrowUp") return;
        const n = t.dataset.assignmentNavGroup;
        if (!n) return;
        s.preventDefault();
        const d = Array.from(this.container?.querySelectorAll(`[data-assignment-nav-group="${n}"]`) || []), l = d.indexOf(t);
        l < 0 || d[i === "ArrowDown" ? Math.min(l + 1, d.length - 1) : Math.max(l - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
Z = de;
Z.PANEL_ID = "translation-queue";
Z.FILTERS_STORAGE_KEY = "go-admin:queue-filters-expanded";
function W(a) {
  return [
    a.source_title || a.source_path || a.id,
    `${a.source_locale.toUpperCase()} to ${a.target_locale.toUpperCase()}`,
    a.queue_state,
    a.due_state
  ].filter(Boolean).join(", ");
}
function y(a) {
  return a ? a.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function mt() {
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
    .queue-filter-field select {
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #111827;
      font: inherit;
      padding: 0.5rem 0.75rem;
      width: 100%;
    }

    .queue-filter-field select:focus {
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
    }

    .queue-content-path {
      display: block;
      font-size: 0.82rem;
      color: #6b7280;
      margin-top: 0.15rem;
    }

    .queue-content-meta {
      display: block;
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.1rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
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
      color: #374151;
      font-size: 0.88rem;
    }

    .queue-reviewer-value {
      display: block;
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
    }
  `;
}
function ht() {
  if (typeof document > "u") return;
  const a = "assignment-queue-styles";
  if (document.getElementById(a)) return;
  const e = document.createElement("style");
  e.id = a, e.textContent = mt(), document.head.appendChild(e);
}
function gt(a, e) {
  ht();
  const t = new de(e);
  return t.mount(a), t;
}
function qt(a) {
  const e = a.dataset.endpoint || a.dataset.assignmentListEndpoint || "";
  if (!e) return null;
  const t = typeof window < "u" ? $e(window.location) : null;
  return gt(a, {
    endpoint: e,
    bulkActionEndpoint: a.dataset.bulkActionEndpoint || a.dataset.bulkActionsEndpoint || "",
    bulkSnapshotEndpoint: a.dataset.bulkSnapshotEndpoint || "",
    editorBasePath: a.dataset.editorBasePath || "",
    title: a.dataset.title,
    description: a.dataset.description,
    initialPresetId: a.dataset.initialPresetId || we(t ?? new URLSearchParams(), "preset") || ""
  });
}
function oe(a) {
  const e = a.trim();
  if (!e) return "/admin/api/translations/assignment-actions/bulk";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/bulk` : "/admin/api/translations/assignment-actions/bulk";
}
function le(a) {
  const e = a.trim();
  if (!e) return "/admin/api/translations/assignment-actions/snapshot";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/snapshot` : "/admin/api/translations/assignment-actions/snapshot";
}
export {
  z as AssignmentQueueRequestError,
  de as AssignmentQueueScreen,
  ee as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  R as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  ct as applyOptimisticAssignmentAction,
  Je as buildAssignmentListQuery,
  et as buildAssignmentListURL,
  nt as claimAssignment,
  gt as createAssignmentQueueScreen,
  rt as fetchAssignmentList,
  mt as getAssignmentQueueStyles,
  qt as initAssignmentQueueScreen,
  it as normalizeAssignmentActionResponse,
  Ke as normalizeAssignmentListMeta,
  st as normalizeAssignmentListResponse,
  S as normalizeAssignmentListRow,
  D as presetToQueryState,
  ot as releaseAssignment,
  oe as resolveAssignmentBulkActionEndpoint,
  le as resolveAssignmentBulkSnapshotEndpoint,
  Ze as snapshotFiltersFromQueryState
};

//# sourceMappingURL=index.js.map
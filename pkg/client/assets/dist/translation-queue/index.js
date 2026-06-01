import { escapeAttribute as c, escapeHTML as u } from "../shared/html.js";
import { httpRequest as B, readHTTPError as ue } from "../shared/transport/http-client.js";
import { extractStructuredError as pe } from "../toast/error-helpers.js";
import { T as me, Y as G, c as ge, h as he, i as fe, l as be, o as N, t as ve, v as x, x as ye, y as _e } from "../chunks/grouped-mode-D5oZzoVA.js";
import { buildEndpointURL as we, getStringSearchParam as $e, readLocationSearchParams as ke, setNumberSearchParam as se, setSearchParam as b } from "../shared/query-state/url-state.js";
import { StatefulController as qe } from "../shared/stateful-controller.js";
import { asNumber as g, asRecord as m, asString as n } from "../shared/coercion.js";
import { B as Ae, C as xe, F as Se, I as Re, L as j, N as Ie, P as Ee, R as M, S as ie, V as F, _ as Pe, a as O, c as Q, g as Le, u as h, v as De, x as Be, z as Ce } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationShortDateTime as U } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as L } from "../shared/record-normalization.js";
var le, z = class extends Error {
  constructor(s) {
    super(s.message), this.name = "AssignmentQueueRequestError", this.status = s.status, this.code = s.code ?? null, this.metadata = s.metadata ?? null, this.requestId = s.requestId, this.traceId = s.traceId;
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
], Z = [
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
function S(s) {
  const e = m(s);
  return {
    enabled: e.enabled === !0,
    reason: n(e.reason) || void 0,
    reason_code: n(e.reason_code) || void 0,
    permission: n(e.permission) || void 0
  };
}
function je(s) {
  const e = m(s), t = n(e.last_rejection_reason), i = n(e.last_reviewer_id);
  if (!(!t && !i))
    return {
      last_rejection_reason: t || void 0,
      last_reviewer_id: i || void 0
    };
}
function Me(s) {
  const e = m(s), t = e.enabled === !0, i = g(e.warning_count), a = g(e.blocker_count), r = g(e.finding_count);
  if (!(!t && i <= 0 && a <= 0 && r <= 0))
    return {
      enabled: t,
      warning_count: i,
      blocker_count: a,
      finding_count: r
    };
}
function J(s) {
  switch (n(s)) {
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
      return n(s);
    default:
      return "open";
  }
}
function V(s, e) {
  const t = s.headers.get(e);
  return typeof t == "string" ? t.trim() : "";
}
function Fe(s) {
  const e = V(s, "x-request-id"), t = V(s, "x-correlation-id"), i = V(s, "x-trace-id") || t || void 0;
  return {
    requestId: e || void 0,
    traceId: i
  };
}
async function Te(s, e) {
  return typeof s.clone == "function" ? pe(s.clone()) : {
    textCode: null,
    message: await ue(s, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function C(s, e) {
  const t = await Te(s, e), i = Fe(s);
  return new z({
    message: t.message || `${e}: ${s.status}`,
    status: s.status,
    code: t.textCode,
    metadata: t.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function ze(s) {
  const e = m(s), t = n(e.id), i = n(e.label);
  if (!t || !i) return null;
  const a = m(e.query);
  return {
    id: t,
    label: i,
    description: n(e.description) || void 0,
    review_state: n(e.review_state) || void 0,
    query: {
      status: n(a.status) || void 0,
      assignee_id: n(a.assignee_id) || void 0,
      reviewer_id: n(a.reviewer_id) || void 0,
      due_state: n(a.due_state) || void 0,
      locale: n(a.locale) || void 0,
      priority: n(a.priority) || void 0,
      family_id: n(a.family_id) || void 0,
      sort: n(a.sort) || void 0,
      order: n(a.order) || void 0
    }
  };
}
function ae(s, e = R) {
  const t = (Array.isArray(s) ? s : []).map((i) => ze(i)).filter((i) => i !== null);
  return t.length ? t : e.map(D);
}
function D(s) {
  return {
    id: s.id,
    label: s.label,
    description: s.description,
    review_state: s.review_state,
    query: { ...s.query }
  };
}
function H(s) {
  return Array.from(new Set(s.map((e) => n(e)).filter(Boolean)));
}
function Ge(s) {
  const e = m(s), t = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((a) => n(a)).filter((a) => !!a) : [], i = m(e.default_sort);
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
    saved_filter_presets: ae(e.saved_filter_presets, R),
    saved_review_filter_presets: ae(e.saved_review_filter_presets, Z),
    default_review_filter_preset: n(e.default_review_filter_preset) || void 0,
    review_actor_id: n(e.review_actor_id) || void 0,
    review_aggregate_counts: L(e.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    grouping: Ne(e.grouping),
    family_total: g(e.family_total) || void 0,
    assignment_total: g(e.assignment_total) || void 0
  };
}
function Ne(s) {
  const e = m(s);
  if (!e) return;
  const t = m(m(e.capabilities).server_family), i = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((a) => n(a)).filter((a) => !!a) : void 0;
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
    supported_modes: Array.isArray(e.supported_modes) ? e.supported_modes.map((a) => n(a)).filter(Boolean) : ["family_id"],
    supported_sort_keys: i,
    strategy: n(e.strategy) || "page_local",
    capabilities: { server_family: {
      supported: t.supported === !0,
      reason_code: n(t.reason_code) || void 0
    } }
  };
}
function Oe(s) {
  const e = m(s), t = Array.isArray(e.filter_summary) ? e.filter_summary : [];
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
function ne(s) {
  const e = n(s).toLowerCase();
  return e === "low" || e === "normal" || e === "high" || e === "urgent" ? e : "";
}
function Qe(s, e, t = {}) {
  return [
    "translation_queue_filter_snapshot",
    n(s),
    n(e),
    n(t.assigneeId),
    n(t.priority)
  ].join(":");
}
function Ue(s = {}) {
  const e = new URLSearchParams();
  return b(e, "status", s.status), b(e, "assignee_id", s.assigneeId), b(e, "reviewer_id", s.reviewerId), b(e, "due_state", s.dueState), b(e, "locale", s.locale), b(e, "priority", s.priority), b(e, "review_state", s.reviewState), b(e, "family_id", s.familyId), se(e, "page", s.page, { min: 1 }), se(e, "per_page", s.perPage, { min: 1 }), b(e, "sort", s.sort), b(e, "order", s.order), b(e, "group_by", s.groupBy), b(e, "group_strategy", s.groupStrategy), e.toString();
}
function Ve(s = {}) {
  const e = {}, t = (i, a) => {
    const r = n(a);
    r && (e[i] = r);
  };
  return t("status", s.status), t("assignee_id", s.assigneeId), t("reviewer_id", s.reviewerId), t("due_state", s.dueState), t("locale", s.locale), t("priority", s.priority), t("review_state", s.reviewState), t("family_id", s.familyId), t("sort", s.sort), t("order", s.order), e;
}
function He(s, e = {}) {
  const t = Ue(e);
  return t ? we(s, new URLSearchParams(t), { preserveAbsolute: !0 }) : s;
}
function $(s) {
  const e = m(s);
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
    reviewer_id: n(e.reviewer_id),
    assignment_type: n(e.assignment_type),
    content_state: n(e.content_state),
    queue_state: J(e.queue_state),
    status: J(e.status),
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
    review_feedback: je(e.review_feedback),
    qa_summary: Me(e.qa_summary)
  };
}
function Ke(s, e) {
  const t = m(s), i = m(t.expansion), a = m(i.params), r = n(t.family_id);
  return {
    id: n(t.id) || `family:${r}`,
    row_type: "family",
    family_id: r,
    family_label: n(t.family_label) || n(t.source_title) || r,
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
      params: Object.fromEntries(Object.entries(a).map(([l, d]) => [l, n(d)])),
      query: m(i.query)
    },
    expanded: e.has(r),
    children: []
  };
}
function Ye(s) {
  const e = m(s), t = Ge(e.meta), i = Array.isArray(e.data) ? e.data : [];
  return t.grouping?.enabled ? {
    data: i.filter((a) => !!a && typeof a == "object" && !Array.isArray(a)).map((a) => ({ ...a })),
    meta: t
  } : {
    data: i.map((a) => $(a)),
    meta: t
  };
}
async function We(s) {
  const e = await B(s.href, { method: "GET" });
  if (!e.ok) throw await C(e, "Failed to load family assignments");
  const t = m(await e.json()), i = m(t.meta);
  return {
    rows: (Array.isArray(t.data) ? t.data : []).map((a) => $(a)),
    meta: {
      page: g(i.page) || 1,
      per_page: g(i.per_page) || 25,
      total: g(i.total),
      has_next: i.has_next === !0
    }
  };
}
function Xe(s) {
  const e = m(s), t = m(e.meta), i = m(e.data);
  return {
    data: {
      assignment_id: n(i.assignment_id),
      status: J(i.status),
      row_version: g(i.row_version),
      updated_at: n(i.updated_at),
      assignment: $(i.assignment)
    },
    meta: { idempotency_hit: t.idempotency_hit === !0 }
  };
}
async function Je(s, e = {}) {
  const t = await B(He(s, e), { method: "GET" });
  if (!t.ok) throw await C(t, "Failed to load assignments");
  return Ye(await t.json());
}
async function ee(s, e, t, i) {
  const a = { expected_version: i.expected_version };
  i.idempotency_key && (a.idempotency_key = i.idempotency_key), i.reason && (a.reason = i.reason);
  const r = await B(`${s}/${encodeURIComponent(e)}/actions/${t}`, {
    method: "POST",
    json: a
  });
  if (!r.ok) throw await C(r, `Failed to ${t} assignment`);
  return Xe(await r.json());
}
function Ze(s, e, t) {
  return ee(s, e, "claim", t);
}
function et(s, e, t) {
  return ee(s, e, "release", t);
}
function T(s) {
  return {
    status: s.query.status,
    assigneeId: s.query.assignee_id,
    reviewerId: s.query.reviewer_id,
    dueState: s.query.due_state,
    locale: s.query.locale,
    priority: s.query.priority,
    reviewState: s.review_state,
    familyId: s.query.family_id,
    sort: s.query.sort,
    order: s.query.order,
    page: 1
  };
}
function re(s, e) {
  return `queue-${s}-${e.id}-${e.version}-${Date.now()}`;
}
function tt(s, e) {
  return `queue-${s}-${e.id}-${e.version}-${Date.now()}`;
}
function st(s) {
  const e = n(s);
  if (!e) return null;
  const t = R.find((a) => a.id === e);
  if (t) return {
    kind: "standard",
    preset: t
  };
  const i = Z.find((a) => a.id === e);
  return i ? {
    kind: "review",
    preset: i
  } : null;
}
function y(s) {
  return {
    ...s,
    actions: {
      claim: { ...s.actions.claim },
      release: { ...s.actions.release }
    },
    review_actions: {
      submit_review: { ...s.review_actions.submit_review },
      approve: { ...s.review_actions.approve },
      reject: { ...s.review_actions.reject },
      archive: { ...s.review_actions.archive }
    },
    review_feedback: s.review_feedback ? { ...s.review_feedback } : void 0,
    qa_summary: s.qa_summary ? { ...s.qa_summary } : void 0
  };
}
function K(s, e) {
  return {
    enabled: !1,
    permission: s,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function it(s, e) {
  const t = y(s);
  return e === "claim" ? (t.queue_state = "in_progress", t.status = "in_progress", t.actions.claim = K(s.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), t.actions.release = {
    enabled: !0,
    permission: s.actions.release.permission
  }, t.review_actions.submit_review = {
    enabled: !0,
    permission: s.review_actions.submit_review.permission
  }, t) : (t.assignment_type = "open_pool", t.queue_state = "open", t.status = "open", t.assignee_id = "", t.actions.claim = {
    enabled: !0,
    permission: s.actions.claim.permission
  }, t.actions.release = K(s.actions.release.permission, "assignment must be assigned or in progress before it can be released"), t.review_actions.submit_review = K(s.review_actions.submit_review.permission, "assignment must be in progress"), t);
}
function P(s, e) {
  return s instanceof z ? {
    kind: s.code === "VERSION_CONFLICT" ? "conflict" : "error",
    message: s.message || e,
    code: s.code,
    requestId: s.requestId,
    traceId: s.traceId
  } : s instanceof Error ? {
    kind: "error",
    message: s.message || e
  } : {
    kind: "error",
    message: e
  };
}
function at(s) {
  return n(s.queue_state || s.status);
}
function nt(s) {
  return s === "review" || s === "in_review";
}
function Y(s) {
  return nt(at(s)) ? !0 : !!(s.review_actions.approve.enabled || s.review_actions.reject.enabled);
}
function W(s) {
  return !!s.review_actions.archive.enabled;
}
var ce = class w extends qe {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.selectedRows = /* @__PURE__ */ new Map(), this.bulkActionPending = !1, this.bulkSnapshotPending = !1, this.filterSnapshot = null, this.viewMode = "flat", this.groupedData = null, this.serverFamilyRows = [], this.expandedGroups = /* @__PURE__ */ new Set();
    const t = n(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      bulkActionEndpoint: e.bulkActionEndpoint || oe(e.endpoint),
      bulkSnapshotEndpoint: e.bulkSnapshotEndpoint || de(e.endpoint),
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const i = st(t);
    if (i?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = i.preset.id, this.activeReviewState = i.preset.review_state || null, this.queryState = T(i.preset);
      return;
    }
    const a = i?.preset || R[1] || R[0];
    this.activePresetId = a?.id || "open", this.queryState = a ? T(a) : {
      sort: "updated_at",
      order: "desc",
      page: 1
    };
    const r = be(w.PANEL_ID);
    r && (this.viewMode = r, this.viewMode === "grouped" ? this.queryState.groupBy = "family_id" : this.viewMode === "server_family" && (this.queryState.groupBy = "family_id", this.queryState.groupStrategy = "server_family")), this.expandedGroups = ge(w.PANEL_ID);
  }
  mount(e) {
    this.container = e, this.render(), this.load();
  }
  unmount() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
  getData() {
    return this.response;
  }
  getRows() {
    return this.rows.map((e) => y(e));
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
  async selectAllMatchingFilters() {
    this.bulkSnapshotPending = !0, this.feedback = null, this.render();
    try {
      const e = await B(this.config.bulkSnapshotEndpoint || de(this.config.endpoint), {
        method: "POST",
        json: { filters: Ve(this.queryState) }
      });
      if (!e.ok) throw await C(e, "Filter snapshot failed");
      const t = Oe(m(m(await e.json()).data));
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
    const i = Array.from(this.selectedRows.values());
    this.bulkActionPending = !0, this.feedback = null, this.render();
    try {
      const a = await this.executeBulkAction({
        action: e,
        assignments: i,
        reason: t?.reason,
        priority: t?.priority
      });
      for (const r of a.data.results) if (r.success && r.assignment) {
        const l = this.rows.findIndex((d) => d.id === r.assignmentId);
        l >= 0 && (this.rows[l] = y(r.assignment)), this.selectedRows.delete(r.assignmentId);
      }
      if (a.data.failed > 0) {
        const r = a.data.results.filter((l) => !l.success).map((l) => l.assignmentId).slice(0, 3);
        this.feedback = {
          kind: "error",
          message: `${a.data.succeeded} succeeded, ${a.data.failed} failed. Failed: ${r.join(", ")}${a.data.failed > 3 ? "..." : ""}`
        };
      } else this.feedback = {
        kind: "success",
        message: `${a.data.succeeded} assignment${a.data.succeeded !== 1 ? "s" : ""} updated.`
      };
    } catch (a) {
      this.feedback = P(a, `Bulk ${e} failed.`);
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
    const a = t || this.promptFilterSnapshotActionOptions(e);
    if (a === null) return;
    const r = i.filterSummary.length ? `

${i.filterSummary.join(`
`)}` : "";
    if (typeof window > "u" || typeof window.confirm != "function" || window.confirm(`Apply ${e} to ${i.requested} matching assignment${i.requested !== 1 ? "s" : ""}?${r}`)) {
      this.bulkActionPending = !0, this.feedback = null, this.render();
      try {
        const l = await this.executeBulkAction({
          action: e,
          selectionScope: "filter_snapshot",
          snapshotId: i.snapshotId,
          assigneeId: a.assigneeId,
          priority: a.priority,
          idempotencyKey: Qe(i.snapshotId, e, a)
        });
        l.data.failed > 0 ? this.feedback = {
          kind: "error",
          message: `${l.data.succeeded} succeeded, ${l.data.failed} failed.`
        } : this.feedback = {
          kind: "success",
          message: `${l.data.succeeded} assignment${l.data.succeeded !== 1 ? "s" : ""} updated.`
        }, this.filterSnapshot = null, this.selectedRows.clear(), await this.load();
      } catch (l) {
        this.feedback = P(l, `Bulk ${e} failed.`);
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
      const t = ne(this.queryState.priority || "normal"), i = ne(n(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Set matching assignments priority", t)));
      return i ? { priority: i } : (this.feedback = {
        kind: "error",
        message: "Priority must be low, normal, high, or urgent."
      }, this.render(), null);
    }
    return {};
  }
  async executeBulkAction(e) {
    const t = await B(this.config.bulkActionEndpoint || oe(this.config.endpoint), {
      method: "POST",
      json: {
        action: e.action,
        selection_scope: e.selectionScope || "current_page",
        snapshot_id: e.snapshotId,
        idempotency_key: e.idempotencyKey,
        assignments: (e.assignments || []).map((v) => ({
          assignment_id: v.assignmentId,
          expected_version: v.expectedVersion
        })),
        assignee_id: e.assigneeId,
        reason: e.reason,
        priority: e.priority
      }
    });
    if (!t.ok) throw await C(t, `Bulk ${e.action} failed`);
    const i = m(await t.json()), a = m(i.data), r = m(i.meta), l = Array.isArray(a.results) ? a.results : [], d = g(r.requested), o = g(r.succeeded), p = g(r.failed), A = r.partial === !0, k = n(r.selection_scope) || "current_page";
    return {
      data: {
        action: n(a.action) || e.action,
        requested: d,
        succeeded: o,
        failed: p,
        partial: A,
        selectionScope: k,
        results: l.map((v) => {
          const f = m(v), _ = m(f.error);
          return {
            assignmentId: n(f.assignment_id),
            success: n(f.status) === "succeeded",
            error: n(_.message) || n(f.error) || void 0,
            errorCode: n(_.code) || n(f.error_code) || void 0,
            assignment: f.assignment ? $(f.assignment) : void 0
          };
        })
      },
      meta: {
        action: n(a.action) || e.action,
        requested: d,
        succeeded: o,
        failed: p,
        partial: A,
        selection_scope: k
      }
    };
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await Je(this.config.endpoint, this.queryState);
      if (this.response = e, this.viewMode === "server_family" && e.meta.grouping?.strategy === "server_family") {
        this.groupedData = null, this.serverFamilyRows = e.data.map((t) => Ke(t, this.expandedGroups)), this.rows = this.serverFamilyRows.flatMap((t) => t.children.map((i) => y(i))), this.state = this.serverFamilyRows.length ? "ready" : "empty", this.render();
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
          for (const i of t.groups) for (const a of i.records) this.rows.push($(a));
          for (const i of t.ungrouped) this.rows.push($(i));
        } else
          this.groupedData = null, this.rows = e.data.map((i) => y(i));
      } else
        this.groupedData = null, this.rows = e.data.map((t) => y(t));
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
      if (this.viewMode = e, _e(w.PANEL_ID, e), e === "grouped") {
        const { groupStrategy: t, ...i } = this.queryState;
        this.queryState = {
          ...i,
          groupBy: "family_id"
        };
      } else if (e === "server_family") this.queryState = {
        ...this.queryState,
        groupBy: "family_id",
        groupStrategy: "server_family",
        perPage: Math.min(this.queryState.perPage || 25, 100)
      };
      else {
        const { groupBy: t, groupStrategy: i, ...a } = this.queryState;
        this.queryState = a;
      }
      this.feedback = null, this.clearSelection(), this.load();
    }
  }
  toggleGroupExpansion(e) {
    if (this.viewMode === "server_family") {
      this.toggleServerFamilyExpansion(e);
      return;
    }
    this.groupedData && (this.groupedData = me(this.groupedData, e), this.expandedGroups = N(this.groupedData), x(w.PANEL_ID, this.expandedGroups), this.render());
  }
  async toggleServerFamilyExpansion(e) {
    const t = this.serverFamilyRows.find((i) => i.family_id === e);
    if (t) {
      if (t.expanded = !t.expanded, t.expanded ? this.expandedGroups.add(e) : this.expandedGroups.delete(e), x(w.PANEL_ID, this.expandedGroups), !t.expanded || t.children.length || t.loading) {
        this.rows = this.serverFamilyRows.flatMap((i) => i.children.map((a) => y(a))), this.render();
        return;
      }
      t.loading = !0, t.error = "", this.render();
      try {
        const i = await We(t.expansion);
        t.children = i.rows, t.childMeta = i.meta, this.rows = this.serverFamilyRows.flatMap((a) => a.children.map((r) => y(r)));
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
      x(w.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = fe(this.groupedData), this.expandedGroups = N(this.groupedData), x(w.PANEL_ID, this.expandedGroups), this.render());
  }
  collapseAllFamilyGroups() {
    if (this.viewMode === "server_family") {
      this.expandedGroups.clear();
      for (const e of this.serverFamilyRows) e.expanded = !1;
      x(w.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = ve(this.groupedData), this.expandedGroups = N(this.groupedData), x(w.PANEL_ID, this.expandedGroups), this.render());
  }
  async runInlineAction(e, t) {
    const i = this.rows.findIndex((o) => o.id === t);
    if (i < 0) return;
    const a = this.rows[i], r = a.actions[e];
    if (!r.enabled) {
      this.feedback = {
        kind: r.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: r.reason || `Cannot ${e} this assignment.`,
        code: r.reason_code || null
      }, this.render();
      return;
    }
    const l = y(a), d = `${e}:${t}`;
    this.pendingActions.add(d), this.feedback = null, this.rows[i] = it(a, e), this.render();
    try {
      const o = e === "claim" ? await Ze(this.config.endpoint, t, {
        expected_version: l.version,
        idempotency_key: re("claim", l)
      }) : await et(this.config.endpoint, t, {
        expected_version: l.version,
        idempotency_key: re("release", l)
      });
      this.rows[i] = y(o.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (o) {
      this.rows[i] = l, this.feedback = P(o, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(d), this.render();
    }
  }
  async runReviewAction(e, t) {
    const i = this.rows.findIndex((o) => o.id === t);
    if (i < 0) return;
    const a = this.rows[i], r = a.review_actions[e];
    if (!r?.enabled) {
      this.feedback = {
        kind: r?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: r?.reason || `Cannot ${e} this assignment.`,
        code: r?.reason_code || null
      }, this.render();
      return;
    }
    const l = {
      expected_version: a.version,
      idempotency_key: tt(e, a)
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
      l.reason = o.trim();
    }
    const d = `${e}:${t}`;
    this.pendingActions.add(d), this.feedback = null, this.render();
    try {
      const o = await ee(this.config.endpoint, t, e, l);
      this.rows[i] = y(o.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (o) {
      this.feedback = P(o, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(d), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((i) => i.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = T(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((i) => i.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = T(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(D) : R.map(D);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(D) : Z.map(D);
  }
  get visibleRows() {
    return this.rows;
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="${ie}">Assignment Queue</p>
            <h1 class="${xe}">${u(this.config.title)}</h1>
            <p class="${Be} max-w-2xl">${u(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.visibleRows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="${h}" data-queue-refresh="true">Refresh</button>
          </div>
        </section>
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
    if (e === 0 && !this.filterSnapshot) return "";
    const i = this.filterSnapshot, a = this.bulkSnapshotPending || this.bulkActionPending;
    if (i) {
      const r = i.filterSummary.slice(0, 4);
      return `
        <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="All matching filter selection">
          <div class="filter-snapshot-copy">
            <strong>${i.requested} matching assignment${i.requested !== 1 ? "s" : ""} selected</strong>
            ${r.length ? `<span>${r.map((l) => u(l)).join(" · ")}</span>` : ""}
          </div>
          <div class="filter-snapshot-actions">
            <button type="button" class="${h}" data-filter-snapshot-clear="true" ${a ? "disabled" : ""}>Clear</button>
            <button type="button" class="${h}" data-filter-snapshot-action="assign" ${a || i.requested === 0 ? "disabled" : ""}>Assign</button>
            <button type="button" class="${h}" data-filter-snapshot-action="release" ${a || i.requested === 0 ? "disabled" : ""}>Release</button>
            <button type="button" class="${h}" data-filter-snapshot-action="priority" ${a || i.requested === 0 ? "disabled" : ""}>Priority</button>
            <button type="button" class="${h}" data-filter-snapshot-action="archive" ${a || i.requested === 0 ? "disabled" : ""}>Archive</button>
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
        <button type="button" class="${h}" data-select-all-matching="true" ${a || e === 0 ? "disabled" : ""}>
          ${this.bulkSnapshotPending ? "Selecting…" : "Select all matching filters"}
        </button>
      </section>
    `;
  }
  renderPresetBar() {
    return `
      <div class="assignment-queue-presets" role="tablist" aria-label="Saved queue filters">
        ${this.savedFilterPresets.map((e) => `
          <button
            type="button"
            class="${h} queue-preset-button ${this.activePresetId === e.id ? "is-active" : ""}"
            data-preset-id="${c(e.id)}"
            role="tab"
            aria-selected="${this.activePresetId === e.id ? "true" : "false"}"
            title="${c(e.description || e.label)}"
          >
            ${u(e.label)}
          </button>
        `).join("")}
      </div>
    `;
  }
  renderReviewStateBar() {
    if (!this.savedReviewFilterPresets.length) return "";
    const e = this.response?.meta.review_aggregate_counts || {}, t = this.response?.meta.review_actor_id, i = !!t;
    return `
      <section class="assignment-review-presets" aria-label="Reviewer queue states">
        <div class="review-preset-copy">
          <p class="${ie}">Reviewer states</p>
          <p class="review-preset-description">${u(t ? `Signed in as ${t}` : "Reviewer queue states are available when reviewer metadata is present.")}</p>
        </div>
        <div class="assignment-review-presets-grid">
          ${this.savedReviewFilterPresets.map((a) => `
            <button
              type="button"
              class="review-preset-button ${this.activeReviewPresetId === a.id ? "is-active" : ""}"
              data-review-preset-id="${c(a.id)}"
              title="${c(i ? a.description || a.label : "Reviewer metadata is required to use this preset.")}"
              ${i ? "" : 'disabled aria-disabled="true"'}
            >
              <span>${u(a.label)}</span>
              <strong>${e[a.id] ?? 0}</strong>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }
  renderViewModeToggle() {
    const e = this.viewMode === "grouped", t = this.groupedData?.totalGroups ?? 0, i = this.response?.meta.grouping?.assignment_count ?? this.rows.length;
    return `
      <div class="assignment-queue-view-mode" role="group" aria-label="View mode">
        <div class="view-mode-buttons">
          <button
            type="button"
            class="view-mode-button ${e ? "" : "is-active"}"
            data-view-mode="flat"
            aria-pressed="${!e}"
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
        </div>
        ${e && this.groupedData ? `
          <div class="view-mode-info">
            <span class="view-mode-count">${t} ${t === 1 ? "family" : "families"} · ${i} assignments</span>
            <span class="view-mode-scope">(page-local counts)</span>
            <button type="button" class="view-mode-expand-all" data-expand-all="true" title="Expand all groups">
              Expand all
            </button>
            <button type="button" class="view-mode-collapse-all" data-collapse-all="true" title="Collapse all groups">
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
    ], i = [
      "none",
      "on_track",
      "due_soon",
      "overdue"
    ], a = [
      "",
      "low",
      "normal",
      "high",
      "urgent"
    ], r = ["", ...H(e.map((p) => p.target_locale))], l = ["", ...H(e.map((p) => p.assignee_id))], d = ["", ...H(e.map((p) => p.reviewer_id))], o = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
      "updated_at",
      "due_date",
      "priority",
      "status",
      "locale"
    ];
    return `
      <form class="assignment-queue-filters" data-queue-filters="true">
        ${this.renderSelect("status", "Status", t, this.queryState.status || "")}
        ${this.renderSelect("due_state", "Due State", ["", ...i], this.queryState.dueState || "")}
        ${this.renderSelect("priority", "Priority", a, this.queryState.priority || "")}
        ${this.renderSelect("locale", "Locale", r, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", l, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", d, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", o, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, t, i, a) {
    const r = [...i];
    return a && !r.includes(a) && r.push(a), `
      <label class="queue-filter-field">
        <span>${u(t)}</span>
        <select data-filter-name="${c(e)}">
          ${r.map((l) => `
            <option value="${c(l)}" ${l === a ? "selected" : ""}>
              ${u(l ? q(l) : `All ${t.toLowerCase()}`)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }
  renderBody() {
    const e = this.visibleRows;
    if (this.state === "loading" && !this.rows.length) return '<div class="assignment-queue-state" data-queue-state="loading">Loading queue…</div>';
    if (this.state === "error" && !this.rows.length) return this.renderErrorState("error", this.error?.message || "Failed to load queue assignments.");
    if (this.state === "conflict" && !this.rows.length) return this.renderErrorState("conflict", this.error?.message || "The queue response is stale. Refresh and try again.");
    if (!e.length) return '<div class="assignment-queue-state" data-queue-state="empty">No assignments match the current filters.</div>';
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
            ${e.map((i) => this.renderRow(i)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderGroupedBody() {
    if (!this.groupedData) return "";
    const e = this.isAllPageSelected(), t = 8;
    return `
      <!-- Mobile Card View - Grouped (visible on small screens) -->
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true" data-queue-grouped="true">
        ${this.groupedData.groups.map((i) => this.renderGroupedMobileCards(i)).join("")}
        ${this.groupedData.ungrouped.map((i) => this.renderMobileCard($(i))).join("")}
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
            ${this.groupedData.groups.map((i) => this.renderFamilyGroupRows(i, t)).join("")}
            ${this.groupedData.ungrouped.map((i) => this.renderRow($(i))).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderFamilyGroupRows(e, t) {
    const i = ye(e, { size: "sm" }), a = u(e.displayLabel || this.deriveFamilyGroupLabel(e)), r = e.records.length, l = e.expanded ? "▼" : "▶";
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
              <strong class="family-group-label">${a}</strong>
              <span class="family-group-count">${r} ${r === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary">
              ${i}
            </div>
          </div>
        </td>
      </tr>
    ` + (e.expanded ? e.records.map((d) => {
      const o = $(d);
      return this.renderGroupChildRow(o, e.groupId);
    }).join("") : "");
  }
  renderGroupChildRow(e, t) {
    const i = this.pendingActions.has(`claim:${e.id}`), a = this.pendingActions.has(`release:${e.id}`), r = this.pendingActions.has(`approve:${e.id}`), l = this.pendingActions.has(`reject:${e.id}`), d = this.pendingActions.has(`archive:${e.id}`), o = i || !e.actions.claim.enabled, p = a || !e.actions.release.enabled, A = Y(e), k = W(e), v = !!e.assignee_id, f = !!e.reviewer_id, _ = !!e.due_date, I = _ || e.due_state === "overdue" || e.due_state === "due_soon", E = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row family-group-child ${E ? "is-selected" : ""}"
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
            ${E ? "checked" : ""}
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
            ${v ? `<span class="queue-owner-value">${u(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${f ? `<span class="queue-reviewer-value">${u(e.reviewer_id)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${I ? `<span class="due-pill due-${c(e.due_state)}">${u(q(e.due_state))}</span>` : ""}
            ${_ ? `<span class="queue-due-date">${u(U(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + q(e.priority))}"></span>
            <span class="priority-label">${u(q(e.priority))}</span>
          </div>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${h}"
                data-action="claim"
                data-assignment-id="${c(e.id)}"
                ${o ? "disabled" : ""}
                aria-disabled="${o ? "true" : "false"}"
                title="${c(i ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${i ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${h}"
                data-action="release"
                data-assignment-id="${c(e.id)}"
                ${p ? "disabled" : ""}
                aria-disabled="${p ? "true" : "false"}"
                title="${c(a ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${a ? "Releasing…" : "Release"}
              </button>
            </div>
            ${A ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${Q}"
                  data-action="approve"
                  data-assignment-id="${c(e.id)}"
                  ${r || !e.review_actions.approve.enabled ? "disabled" : ""}
                  title="${c(r ? "Approving…" : e.review_actions.approve.reason || "Approve")}"
                >
                  ${r ? "…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${O}"
                  data-action="reject"
                  data-assignment-id="${c(e.id)}"
                  ${l || !e.review_actions.reject.enabled ? "disabled" : ""}
                  title="${c(l ? "Rejecting…" : e.review_actions.reject.reason || "Reject")}"
                >
                  ${l ? "…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${k ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${h}"
                  data-action="archive"
                  data-assignment-id="${c(e.id)}"
                  ${d || !e.review_actions.archive.enabled ? "disabled" : ""}
                  title="${c(d ? "Archiving…" : e.review_actions.archive.reason || "Archive")}"
                >
                  ${d ? "…" : "Archive"}
                </button>
              </div>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }
  renderGroupedMobileCards(e) {
    const t = u(e.displayLabel || this.deriveFamilyGroupLabel(e)), i = e.records.length, a = e.expanded ? "▼" : "▶";
    return `
      <div class="family-group-mobile-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
           data-group-id="${c(e.groupId)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${c(e.groupId)}">
          <span class="family-group-expand-icon">${a}</span>
          <span class="family-group-mobile-label">${t}</span>
          <span class="family-group-mobile-count">${i} ${i === 1 ? "locale" : "locales"}</span>
        </button>
      </div>
    ` + (e.expanded ? e.records.map((r) => {
      const l = $(r);
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
      for (const a of i) if (a) return a;
    }
    return `Family ${e.groupId.length > 20 ? e.groupId.slice(0, 17) + "..." : e.groupId}`;
  }
  renderErrorState(e, t) {
    return `
      <div class="${Le} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${De}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${Pe} mt-2">${u(t)}</p>
        <div class="mt-4">
          <button type="button" class="${h}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), a = this.pendingActions.has(`approve:${e.id}`), r = this.pendingActions.has(`reject:${e.id}`), l = this.pendingActions.has(`archive:${e.id}`), d = t || !e.actions.claim.enabled, o = i || !e.actions.release.enabled, p = Y(e), A = W(e), k = !!e.assignee_id, v = !!e.reviewer_id, f = !!e.due_date, _ = f || e.due_state === "overdue" || e.due_state === "due_soon", I = [];
    e.entity_type && I.push(e.entity_type), e.family_id && e.family_id !== e.source_path && I.push(e.family_id);
    const E = I.join(" · "), te = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row ${te ? "is-selected" : ""}" tabindex="0" data-assignment-id="${c(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${c(X(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${c(e.id)}"
            ${te ? "checked" : ""}
            aria-label="Select assignment ${c(e.source_title || e.id)}"
          />
        </td>
        <td>
          <div class="queue-content-cell">
            <strong class="queue-content-title">${u(e.source_title || e.source_path || e.id)}</strong>
            ${e.source_path && e.source_title ? `<span class="queue-content-path">${u(e.source_path)}</span>` : ""}
            ${E ? `<span class="queue-content-meta">${u(E)}</span>` : ""}
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
            ${k ? `<span class="queue-owner-value">${u(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${v ? `<span class="queue-reviewer-value">${u(e.reviewer_id)}</span>` : ""}
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${u(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${_ ? `<span class="due-pill due-${c(e.due_state)}">${u(q(e.due_state))}</span>` : ""}
            ${f ? `<span class="queue-due-date">${u(U(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + q(e.priority))}"></span>
            <span class="priority-label">${u(q(e.priority))}</span>
          </div>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${h}"
                data-action="claim"
                data-assignment-id="${c(e.id)}"
                ${d ? "disabled" : ""}
                aria-disabled="${d ? "true" : "false"}"
                title="${c(t ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${t ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${h}"
                data-action="release"
                data-assignment-id="${c(e.id)}"
                ${o ? "disabled" : ""}
                aria-disabled="${o ? "true" : "false"}"
                title="${c(i ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${i ? "Releasing…" : "Release"}
              </button>
            </div>
            ${p ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${Q}"
                  data-action="approve"
                  data-assignment-id="${c(e.id)}"
                  ${a || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${a || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${c(a ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${a ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${O}"
                  data-action="reject"
                  data-assignment-id="${c(e.id)}"
                  ${r || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${r || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${c(r ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${r ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${A ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${h}"
                  data-action="archive"
                  data-assignment-id="${c(e.id)}"
                  ${l || !e.review_actions.archive.enabled ? "disabled" : ""}
                  aria-disabled="${l || !e.review_actions.archive.enabled ? "true" : "false"}"
                  title="${c(l ? "Archiving assignment…" : e.review_actions.archive.reason || "Archive assignment")}"
                >
                  ${l ? "Archiving…" : "Archive"}
                </button>
              </div>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }
  renderMobileCard(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), a = this.pendingActions.has(`approve:${e.id}`), r = this.pendingActions.has(`reject:${e.id}`), l = this.pendingActions.has(`archive:${e.id}`), d = t || !e.actions.claim.enabled, o = i || !e.actions.release.enabled, p = Y(e), A = W(e), k = !!e.assignee_id, v = !!e.due_date, f = v || e.due_state === "overdue" || e.due_state === "due_soon", _ = this.isRowSelected(e.id);
    return `
      <article
        class="${Ie} ${_ ? "is-selected" : ""}"
        data-assignment-id="${c(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${c(X(e))}"
      >
        <div class="${Re}">
          <div class="mobile-card-select">
            <input
              type="checkbox"
              class="queue-row-select"
              data-select-row="${c(e.id)}"
              ${_ ? "checked" : ""}
              aria-label="Select assignment ${c(e.source_title || e.id)}"
            />
          </div>
          <div class="mobile-card-title-group">
            <h3 class="${Ae}">${u(e.source_title || e.source_path || e.id)}</h3>
            <p class="${Ce}">${u(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${G(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${Se}">
          <div class="${M}">
            <span class="${j}">Locale</span>
            <span class="${F}">
              <span class="locale-code">${u(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${u(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${M}">
            <span class="${j}">Assignee</span>
            <span class="${F} ${k ? "" : "text-gray-400"}">${u(k ? e.assignee_id : "Unassigned")}</span>
          </div>
          <div class="${M}">
            <span class="${j}">Due</span>
            <span class="${F}">
              ${f ? `<span class="due-pill due-${c(e.due_state)}">${u(q(e.due_state))}</span>` : ""}
              ${v ? `<span class="text-gray-600 ml-1">${u(U(e.due_date, ""))}</span>` : '<span class="text-gray-400">—</span>'}
            </span>
          </div>
          <div class="${M}">
            <span class="${j}">Priority</span>
            <span class="${F}">
              <span class="priority-indicator priority-${c(e.priority)}"></span>
              <span class="priority-label">${u(q(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${Ee}">
          <button
            type="button"
            class="${h} flex-1"
            data-action="claim"
            data-assignment-id="${c(e.id)}"
            ${d ? "disabled" : ""}
          >
            ${t ? "Claiming…" : "Claim"}
          </button>
          <button
            type="button"
            class="${h} flex-1"
            data-action="release"
            data-assignment-id="${c(e.id)}"
            ${o ? "disabled" : ""}
          >
            ${i ? "Releasing…" : "Release"}
          </button>
          ${p ? `
            <button
              type="button"
              class="${Q} flex-1"
              data-action="approve"
              data-assignment-id="${c(e.id)}"
              ${a || !e.review_actions.approve.enabled ? "disabled" : ""}
            >
              ${a ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              class="${O} flex-1"
              data-action="reject"
              data-assignment-id="${c(e.id)}"
              ${r || !e.review_actions.reject.enabled ? "disabled" : ""}
            >
              ${r ? "Rejecting…" : "Reject"}
            </button>
          ` : ""}
          ${A ? `
            <button
              type="button"
              class="${h}"
              data-action="archive"
              data-assignment-id="${c(e.id)}"
              ${l || !e.review_actions.archive.enabled ? "disabled" : ""}
            >
              ${l ? "Archiving…" : "Archive"}
            </button>
          ` : ""}
        </div>
      </article>
    `;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-preset-id]").forEach((d) => {
      d.addEventListener("click", () => {
        const o = d.dataset.presetId;
        o && this.setActivePreset(o);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((d) => {
      d.addEventListener("click", () => {
        const o = d.dataset.reviewPresetId;
        o && this.setActiveReviewPreset(o);
      });
    }), this.container.querySelectorAll("[data-filter-name]").forEach((d) => {
      d.addEventListener("change", () => {
        const o = d.dataset.filterName;
        if (!o) return;
        const p = d.value.trim();
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
    }), this.container.querySelectorAll("[data-queue-refresh]").forEach((d) => {
      d.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-action]").forEach((d) => {
      d.addEventListener("click", () => {
        const o = d.dataset.action, p = d.dataset.assignmentId;
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
    }), this.container.querySelectorAll("[data-select-row]").forEach((d) => {
      d.addEventListener("change", (o) => {
        o.stopPropagation();
        const p = d.dataset.selectRow;
        p && this.toggleRowSelection(p);
      }), d.addEventListener("click", (o) => {
        o.stopPropagation();
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
    const a = this.container.querySelector("[data-filter-snapshot-clear]");
    a && a.addEventListener("click", () => {
      this.clearSelection();
    }), this.container.querySelectorAll("[data-filter-snapshot-action]").forEach((d) => {
      d.addEventListener("click", () => {
        const o = d.dataset.filterSnapshotAction;
        (o === "assign" || o === "release" || o === "priority" || o === "archive") && this.runFilterSnapshotBulkAction(o);
      });
    }), this.container.querySelectorAll("[data-bulk-action]").forEach((d) => {
      d.addEventListener("click", () => {
        const o = d.dataset.bulkAction;
        (o === "release" || o === "archive") && this.runBulkAction(o);
      });
    }), this.container.querySelectorAll("[data-view-mode]").forEach((d) => {
      d.addEventListener("click", () => {
        const o = d.dataset.viewMode;
        (o === "flat" || o === "grouped") && this.setViewMode(o);
      });
    }), this.container.querySelectorAll("[data-toggle-group]").forEach((d) => {
      d.addEventListener("click", (o) => {
        o.stopPropagation();
        const p = d.dataset.toggleGroup;
        p && this.toggleGroupExpansion(p);
      });
    });
    const r = this.container.querySelector("[data-expand-all]");
    r && r.addEventListener("click", () => {
      this.expandAllFamilyGroups();
    });
    const l = this.container.querySelector("[data-collapse-all]");
    l && l.addEventListener("click", () => {
      this.collapseAllFamilyGroups();
    }), this.container.querySelectorAll("[data-group-id]").forEach((d) => {
      (d.tagName.toLowerCase() === "tr" || d.classList.contains("family-group-mobile-header")) && (d.addEventListener("click", (o) => {
        if (o.target?.closest("button, a, input, select, textarea")) return;
        const p = d.dataset.groupId;
        p && this.toggleGroupExpansion(p);
      }), d.addEventListener("keydown", (o) => {
        if (o.key === "Enter" || o.key === " ") {
          o.preventDefault();
          const p = d.dataset.groupId;
          p && this.toggleGroupExpansion(p);
        }
      }));
    }), this.attachAssignmentNavigationTargets("[data-assignment-row]"), this.attachAssignmentNavigationTargets("[data-assignment-card]");
  }
  attachAssignmentNavigationTargets(e) {
    this.container && this.container.querySelectorAll(e).forEach((t) => {
      t.addEventListener("click", (i) => {
        i.target?.closest("button, a, input, select, textarea") || this.openAssignment(t.dataset.assignmentId || "");
      }), t.addEventListener("keydown", (i) => {
        const a = i.key;
        if (a === "Enter" || a === " ") {
          i.preventDefault(), this.openAssignment(t.dataset.assignmentId || "");
          return;
        }
        if (a !== "ArrowDown" && a !== "ArrowUp") return;
        const r = t.dataset.assignmentNavGroup;
        if (!r) return;
        i.preventDefault();
        const l = Array.from(this.container?.querySelectorAll(`[data-assignment-nav-group="${r}"]`) || []), d = l.indexOf(t);
        d < 0 || l[a === "ArrowDown" ? Math.min(d + 1, l.length - 1) : Math.max(d - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
le = ce;
le.PANEL_ID = "translation-queue";
function X(s) {
  return [
    s.source_title || s.source_path || s.id,
    `${s.source_locale.toUpperCase()} to ${s.target_locale.toUpperCase()}`,
    s.queue_state,
    s.due_state
  ].filter(Boolean).join(", ");
}
function q(s) {
  return s ? s.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function rt() {
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

    .assignment-queue-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .assignment-queue-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .summary-pill,
    .queue-filter-field select {
      border-radius: 999px;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #111827;
      font: inherit;
    }

    .summary-pill {
      padding: 0.45rem 0.8rem;
      font-size: 0.85rem;
      color: #374151;
    }

    /* Preset button active state override for site btn classes */
    .queue-preset-button.is-active {
      background: #111827;
      border-color: #111827;
      color: #f9fafb;
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

    .assignment-queue-presets {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .assignment-review-presets {
      display: grid;
      gap: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 0.75rem;
      background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 40%),
        linear-gradient(135deg, #f9fafb 0%, #eff6ff 100%);
    }

    .review-preset-copy {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .review-preset-description {
      margin: 0;
      font-size: 0.9rem;
      color: #374151;
    }

    .assignment-review-presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
    }

    .review-preset-button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      border-radius: 0.5rem;
      border: 1px solid #bfdbfe;
      background: rgba(255, 255, 255, 0.9);
      color: #111827;
      padding: 0.85rem 1rem;
      cursor: pointer;
      font: inherit;
      transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }

    .review-preset-button strong {
      display: inline-flex;
      min-width: 2rem;
      justify-content: center;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 0.25rem 0.55rem;
      font-size: 0.82rem;
    }

    .review-preset-button:hover {
      border-color: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 12px 30px rgba(37, 99, 235, 0.12);
    }

    .review-preset-button.is-active {
      border-color: #111827;
      background: #111827;
      color: #f9fafb;
    }

    .review-preset-button.is-active strong {
      background: rgba(255, 255, 255, 0.14);
      color: #f9fafb;
    }

    .assignment-queue-filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.75rem;
    }

    .queue-filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #374151;
      font-size: 0.9rem;
    }

    .queue-filter-field select {
      padding: 0.7rem 0.9rem;
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
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      vertical-align: middle;
    }

    .assignment-queue-table th {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      background: #f9fafb;
    }

    .assignment-queue-row {
      outline: none;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }

    .assignment-queue-row:hover,
    .assignment-queue-row:focus {
      background: #f9fafb;
      box-shadow: inset 3px 0 0 #2563eb;
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
function ot() {
  if (typeof document > "u") return;
  const s = "assignment-queue-styles";
  if (document.getElementById(s)) return;
  const e = document.createElement("style");
  e.id = s, e.textContent = rt(), document.head.appendChild(e);
}
function dt(s, e) {
  ot();
  const t = new ce(e);
  return t.mount(s), t;
}
function yt(s) {
  const e = s.dataset.endpoint || s.dataset.assignmentListEndpoint || "";
  if (!e) return null;
  const t = typeof window < "u" ? ke(window.location) : null;
  return dt(s, {
    endpoint: e,
    bulkActionEndpoint: s.dataset.bulkActionEndpoint || s.dataset.bulkActionsEndpoint || "",
    bulkSnapshotEndpoint: s.dataset.bulkSnapshotEndpoint || "",
    editorBasePath: s.dataset.editorBasePath || "",
    title: s.dataset.title,
    description: s.dataset.description,
    initialPresetId: s.dataset.initialPresetId || $e(t ?? new URLSearchParams(), "preset") || ""
  });
}
function oe(s) {
  const e = s.trim();
  if (!e) return "/admin/api/translations/assignment-actions/bulk";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/bulk` : "/admin/api/translations/assignment-actions/bulk";
}
function de(s) {
  const e = s.trim();
  if (!e) return "/admin/api/translations/assignment-actions/snapshot";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/snapshot` : "/admin/api/translations/assignment-actions/snapshot";
}
export {
  z as AssignmentQueueRequestError,
  ce as AssignmentQueueScreen,
  Z as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  R as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  it as applyOptimisticAssignmentAction,
  Ue as buildAssignmentListQuery,
  He as buildAssignmentListURL,
  Ze as claimAssignment,
  dt as createAssignmentQueueScreen,
  Je as fetchAssignmentList,
  rt as getAssignmentQueueStyles,
  yt as initAssignmentQueueScreen,
  Xe as normalizeAssignmentActionResponse,
  Ge as normalizeAssignmentListMeta,
  Ye as normalizeAssignmentListResponse,
  $ as normalizeAssignmentListRow,
  T as presetToQueryState,
  et as releaseAssignment,
  oe as resolveAssignmentBulkActionEndpoint,
  de as resolveAssignmentBulkSnapshotEndpoint,
  Ve as snapshotFiltersFromQueryState
};

//# sourceMappingURL=index.js.map
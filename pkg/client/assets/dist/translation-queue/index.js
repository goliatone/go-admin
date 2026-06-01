import { escapeAttribute as l, escapeHTML as u } from "../shared/html.js";
import { httpRequest as j, readHTTPError as le } from "../shared/transport/http-client.js";
import { extractStructuredError as ce } from "../toast/error-helpers.js";
import { T as ue, Y as z, c as pe, h as me, i as ge, l as he, o as F, t as fe, v as G, x as be, y as ve } from "../chunks/grouped-mode-DDcITWpq.js";
import { buildEndpointURL as ye, getStringSearchParam as _e, readLocationSearchParams as $e, setNumberSearchParam as te, setSearchParam as v } from "../shared/query-state/url-state.js";
import { StatefulController as we } from "../shared/stateful-controller.js";
import { asNumber as h, asRecord as m, asString as n } from "../shared/coercion.js";
import { B as ke, C as qe, F as Ae, I as xe, L, N as Se, P as Re, R as D, S as se, V as C, _ as Ee, a as N, c as O, g as Ie, u as g, v as Pe, x as Le, z as De } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationShortDateTime as Q } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as Ce } from "../shared/record-normalization.js";
var oe, M = class extends Error {
  constructor(s) {
    super(s.message), this.name = "AssignmentQueueRequestError", this.status = s.status, this.code = s.code ?? null, this.metadata = s.metadata ?? null, this.requestId = s.requestId, this.traceId = s.traceId;
  }
}, S = [
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
], J = [
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
function x(s) {
  const e = m(s);
  return {
    enabled: e.enabled === !0,
    reason: n(e.reason) || void 0,
    reason_code: n(e.reason_code) || void 0,
    permission: n(e.permission) || void 0
  };
}
function Be(s) {
  const e = m(s), t = n(e.last_rejection_reason), i = n(e.last_reviewer_id);
  if (!(!t && !i))
    return {
      last_rejection_reason: t || void 0,
      last_reviewer_id: i || void 0
    };
}
function je(s) {
  const e = m(s), t = e.enabled === !0, i = h(e.warning_count), a = h(e.blocker_count), o = h(e.finding_count);
  if (!(!t && i <= 0 && a <= 0 && o <= 0))
    return {
      enabled: t,
      warning_count: i,
      blocker_count: a,
      finding_count: o
    };
}
function X(s) {
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
function U(s, e) {
  const t = s.headers.get(e);
  return typeof t == "string" ? t.trim() : "";
}
function Me(s) {
  const e = U(s, "x-request-id"), t = U(s, "x-correlation-id"), i = U(s, "x-trace-id") || t || void 0;
  return {
    requestId: e || void 0,
    traceId: i
  };
}
async function Te(s, e) {
  return typeof s.clone == "function" ? ce(s.clone()) : {
    textCode: null,
    message: await le(s, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function T(s, e) {
  const t = await Te(s, e), i = Me(s);
  return new M({
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
function ie(s, e = S) {
  const t = (Array.isArray(s) ? s : []).map((i) => ze(i)).filter((i) => i !== null);
  return t.length ? t : e.map(P);
}
function P(s) {
  return {
    id: s.id,
    label: s.label,
    description: s.description,
    review_state: s.review_state,
    query: { ...s.query }
  };
}
function V(s) {
  return Array.from(new Set(s.map((e) => n(e)).filter(Boolean)));
}
function Fe(s) {
  const e = m(s), t = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((a) => n(a)).filter((a) => !!a) : [], i = m(e.default_sort);
  return {
    page: h(e.page) || 1,
    per_page: h(e.per_page) || 25,
    total: h(e.total),
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
    saved_filter_presets: ie(e.saved_filter_presets, S),
    saved_review_filter_presets: ie(e.saved_review_filter_presets, J),
    default_review_filter_preset: n(e.default_review_filter_preset) || void 0,
    review_actor_id: n(e.review_actor_id) || void 0,
    review_aggregate_counts: Ce(e.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    grouping: Ge(e.grouping)
  };
}
function Ge(s) {
  const e = m(s);
  if (!(!e || e.enabled !== !0))
    return {
      enabled: !0,
      mode: n(e.mode) || "family_id",
      group_by: n(e.group_by) || "family_id",
      scope: n(e.scope) || "current_page",
      row_count: h(e.row_count),
      group_count: h(e.group_count),
      assignment_count: h(e.assignment_count),
      supported_modes: Array.isArray(e.supported_modes) ? e.supported_modes.map((t) => n(t)).filter(Boolean) : ["family_id"],
      strategy: n(e.strategy) || "page_local"
    };
}
function Ne(s) {
  const e = m(s), t = Array.isArray(e.filter_summary) ? e.filter_summary : [];
  return {
    selectionScope: "filter_snapshot",
    snapshotId: n(e.snapshot_id),
    requested: h(e.requested),
    filters: m(e.filters),
    filterSummary: t.map((i) => n(i)).filter(Boolean),
    createdAt: n(e.created_at),
    expiresAt: n(e.expires_at)
  };
}
function Oe(s = {}) {
  const e = new URLSearchParams();
  return v(e, "status", s.status), v(e, "assignee_id", s.assigneeId), v(e, "reviewer_id", s.reviewerId), v(e, "due_state", s.dueState), v(e, "locale", s.locale), v(e, "priority", s.priority), v(e, "review_state", s.reviewState), v(e, "family_id", s.familyId), te(e, "page", s.page, { min: 1 }), te(e, "per_page", s.perPage, { min: 1 }), v(e, "sort", s.sort), v(e, "order", s.order), v(e, "group_by", s.groupBy), e.toString();
}
function Qe(s = {}) {
  const e = {}, t = (i, a) => {
    const o = n(a);
    o && (e[i] = o);
  };
  return t("status", s.status), t("assignee_id", s.assigneeId), t("reviewer_id", s.reviewerId), t("due_state", s.dueState), t("locale", s.locale), t("priority", s.priority), t("review_state", s.reviewState), t("family_id", s.familyId), t("sort", s.sort), t("order", s.order), e;
}
function Ue(s, e = {}) {
  const t = Oe(e);
  return t ? ye(s, new URLSearchParams(t), { preserveAbsolute: !0 }) : s;
}
function w(s) {
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
    queue_state: X(e.queue_state),
    status: X(e.status),
    priority: n(e.priority) || "normal",
    due_state: n(e.due_state) || "none",
    due_date: n(e.due_date) || void 0,
    row_version: h(e.row_version || e.version),
    version: h(e.version || e.row_version),
    updated_at: n(e.updated_at),
    created_at: n(e.created_at),
    actions: {
      claim: x(m(e.actions).claim),
      release: x(m(e.actions).release)
    },
    review_actions: {
      submit_review: x(m(e.review_actions).submit_review),
      approve: x(m(e.review_actions).approve),
      reject: x(m(e.review_actions).reject),
      archive: x(m(e.review_actions).archive)
    },
    last_rejection_reason: n(e.last_rejection_reason) || void 0,
    review_feedback: Be(e.review_feedback),
    qa_summary: je(e.qa_summary)
  };
}
function Ve(s) {
  const e = m(s), t = Fe(e.meta), i = Array.isArray(e.data) ? e.data : [];
  return t.grouping?.enabled ? {
    data: i.filter((a) => !!a && typeof a == "object" && !Array.isArray(a)).map((a) => ({ ...a })),
    meta: t
  } : {
    data: i.map((a) => w(a)),
    meta: t
  };
}
function He(s) {
  const e = m(s), t = m(e.meta), i = m(e.data);
  return {
    data: {
      assignment_id: n(i.assignment_id),
      status: X(i.status),
      row_version: h(i.row_version),
      updated_at: n(i.updated_at),
      assignment: w(i.assignment)
    },
    meta: { idempotency_hit: t.idempotency_hit === !0 }
  };
}
async function Ke(s, e = {}) {
  const t = await j(Ue(s, e), { method: "GET" });
  if (!t.ok) throw await T(t, "Failed to load assignments");
  return Ve(await t.json());
}
async function Z(s, e, t, i) {
  const a = { expected_version: i.expected_version };
  i.idempotency_key && (a.idempotency_key = i.idempotency_key), i.reason && (a.reason = i.reason);
  const o = await j(`${s}/${encodeURIComponent(e)}/actions/${t}`, {
    method: "POST",
    json: a
  });
  if (!o.ok) throw await T(o, `Failed to ${t} assignment`);
  return He(await o.json());
}
function Ye(s, e, t) {
  return Z(s, e, "claim", t);
}
function We(s, e, t) {
  return Z(s, e, "release", t);
}
function B(s) {
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
function ae(s, e) {
  return `queue-${s}-${e.id}-${e.version}-${Date.now()}`;
}
function Xe(s, e) {
  return `queue-${s}-${e.id}-${e.version}-${Date.now()}`;
}
function Je(s) {
  const e = n(s);
  if (!e) return null;
  const t = S.find((a) => a.id === e);
  if (t) return {
    kind: "standard",
    preset: t
  };
  const i = J.find((a) => a.id === e);
  return i ? {
    kind: "review",
    preset: i
  } : null;
}
function q(s) {
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
function H(s, e) {
  return {
    enabled: !1,
    permission: s,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function Ze(s, e) {
  const t = q(s);
  return e === "claim" ? (t.queue_state = "in_progress", t.status = "in_progress", t.actions.claim = H(s.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), t.actions.release = {
    enabled: !0,
    permission: s.actions.release.permission
  }, t.review_actions.submit_review = {
    enabled: !0,
    permission: s.review_actions.submit_review.permission
  }, t) : (t.assignment_type = "open_pool", t.queue_state = "open", t.status = "open", t.assignee_id = "", t.actions.claim = {
    enabled: !0,
    permission: s.actions.claim.permission
  }, t.actions.release = H(s.actions.release.permission, "assignment must be assigned or in progress before it can be released"), t.review_actions.submit_review = H(s.review_actions.submit_review.permission, "assignment must be in progress"), t);
}
function I(s, e) {
  return s instanceof M ? {
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
function et(s) {
  return n(s.queue_state || s.status);
}
function tt(s) {
  return s === "review" || s === "in_review";
}
function K(s) {
  return tt(et(s)) ? !0 : !!(s.review_actions.approve.enabled || s.review_actions.reject.enabled);
}
function Y(s) {
  return !!s.review_actions.archive.enabled;
}
var de = class A extends we {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.selectedRows = /* @__PURE__ */ new Map(), this.bulkActionPending = !1, this.bulkSnapshotPending = !1, this.filterSnapshot = null, this.viewMode = "flat", this.groupedData = null, this.expandedGroups = /* @__PURE__ */ new Set();
    const t = n(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      bulkActionEndpoint: e.bulkActionEndpoint || ne(e.endpoint),
      bulkSnapshotEndpoint: e.bulkSnapshotEndpoint || re(e.endpoint),
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const i = Je(t);
    if (i?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = i.preset.id, this.activeReviewState = i.preset.review_state || null, this.queryState = B(i.preset);
      return;
    }
    const a = i?.preset || S[1] || S[0];
    this.activePresetId = a?.id || "open", this.queryState = a ? B(a) : {
      sort: "updated_at",
      order: "desc",
      page: 1
    };
    const o = he(A.PANEL_ID);
    o && (this.viewMode = o, this.viewMode === "grouped" && (this.queryState.groupBy = "family_id")), this.expandedGroups = pe(A.PANEL_ID);
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
    return this.rows.map((e) => q(e));
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
      const e = await j(this.config.bulkSnapshotEndpoint || re(this.config.endpoint), {
        method: "POST",
        json: { filters: Qe(this.queryState) }
      });
      if (!e.ok) throw await T(e, "Filter snapshot failed");
      const t = Ne(m(m(await e.json()).data));
      if (!t.snapshotId) throw new M({
        message: "Filter snapshot response did not include a snapshot id.",
        status: 500,
        code: "INVALID_SNAPSHOT_RESPONSE"
      });
      this.selectedRows.clear(), this.filterSnapshot = t, this.feedback = {
        kind: "success",
        message: `${t.requested} matching assignment${t.requested !== 1 ? "s" : ""} selected.`
      };
    } catch (e) {
      this.feedback = I(e, "Filter snapshot failed.");
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
      for (const o of a.data.results) if (o.success && o.assignment) {
        const c = this.rows.findIndex((d) => d.id === o.assignmentId);
        c >= 0 && (this.rows[c] = q(o.assignment)), this.selectedRows.delete(o.assignmentId);
      }
      if (a.data.failed > 0) {
        const o = a.data.results.filter((c) => !c.success).map((c) => c.assignmentId).slice(0, 3);
        this.feedback = {
          kind: "error",
          message: `${a.data.succeeded} succeeded, ${a.data.failed} failed. Failed: ${o.join(", ")}${a.data.failed > 3 ? "..." : ""}`
        };
      } else this.feedback = {
        kind: "success",
        message: `${a.data.succeeded} assignment${a.data.succeeded !== 1 ? "s" : ""} updated.`
      };
    } catch (a) {
      this.feedback = I(a, `Bulk ${e} failed.`);
    } finally {
      this.bulkActionPending = !1, this.render();
    }
  }
  async runFilterSnapshotBulkAction(e) {
    const t = this.filterSnapshot;
    if (!t) {
      this.feedback = {
        kind: "error",
        message: "No filter snapshot selected."
      }, this.render();
      return;
    }
    const i = t.filterSummary.length ? `

${t.filterSummary.join(`
`)}` : "";
    if (typeof window > "u" || typeof window.confirm != "function" || window.confirm(`Apply ${e} to ${t.requested} matching assignment${t.requested !== 1 ? "s" : ""}?${i}`)) {
      this.bulkActionPending = !0, this.feedback = null, this.render();
      try {
        const a = await this.executeBulkAction({
          action: e,
          selectionScope: "filter_snapshot",
          snapshotId: t.snapshotId
        });
        a.data.failed > 0 ? this.feedback = {
          kind: "error",
          message: `${a.data.succeeded} succeeded, ${a.data.failed} failed.`
        } : this.feedback = {
          kind: "success",
          message: `${a.data.succeeded} assignment${a.data.succeeded !== 1 ? "s" : ""} updated.`
        }, this.filterSnapshot = null, this.selectedRows.clear(), await this.load();
      } catch (a) {
        this.feedback = I(a, `Bulk ${e} failed.`);
      } finally {
        this.bulkActionPending = !1, this.render();
      }
    }
  }
  async executeBulkAction(e) {
    const t = await j(this.config.bulkActionEndpoint || ne(this.config.endpoint), {
      method: "POST",
      json: {
        action: e.action,
        selection_scope: e.selectionScope || "current_page",
        snapshot_id: e.snapshotId,
        assignments: (e.assignments || []).map((b) => ({
          assignment_id: b.assignmentId,
          expected_version: b.expectedVersion
        })),
        reason: e.reason,
        priority: e.priority
      }
    });
    if (!t.ok) throw await T(t, `Bulk ${e.action} failed`);
    const i = m(await t.json()), a = m(i.data), o = m(i.meta), c = Array.isArray(a.results) ? a.results : [], d = h(o.requested), r = h(o.succeeded), p = h(o.failed), k = o.partial === !0, _ = n(o.selection_scope) || "current_page";
    return {
      data: {
        action: n(a.action) || e.action,
        requested: d,
        succeeded: r,
        failed: p,
        partial: k,
        selectionScope: _,
        results: c.map((b) => {
          const f = m(b), y = m(f.error);
          return {
            assignmentId: n(f.assignment_id),
            success: n(f.status) === "succeeded",
            error: n(y.message) || n(f.error) || void 0,
            errorCode: n(y.code) || n(f.error_code) || void 0,
            assignment: f.assignment ? w(f.assignment) : void 0
          };
        })
      },
      meta: {
        action: n(a.action) || e.action,
        requested: d,
        succeeded: r,
        failed: p,
        partial: k,
        selection_scope: _
      }
    };
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await Ke(this.config.endpoint, this.queryState);
      if (this.response = e, this.viewMode === "grouped" && e.meta.grouping?.enabled) {
        const t = me(e.data, {
          defaultExpanded: !0,
          expandMode: "explicit",
          expandedGroups: this.expandedGroups
        });
        if (t) {
          this.groupedData = t, this.rows = [];
          for (const i of t.groups) for (const a of i.records) this.rows.push(w(a));
          for (const i of t.ungrouped) this.rows.push(w(i));
        } else
          this.groupedData = null, this.rows = e.data.map((i) => q(i));
      } else
        this.groupedData = null, this.rows = e.data.map((t) => q(t));
      this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof M && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  getViewMode() {
    return this.viewMode;
  }
  setViewMode(e) {
    if (this.viewMode !== e) {
      if (this.viewMode = e, ve(A.PANEL_ID, e), e === "grouped") this.queryState = {
        ...this.queryState,
        groupBy: "family_id"
      };
      else {
        const { groupBy: t, ...i } = this.queryState;
        this.queryState = i;
      }
      this.feedback = null, this.clearSelection(), this.load();
    }
  }
  toggleGroupExpansion(e) {
    this.groupedData && (this.groupedData = ue(this.groupedData, e), this.expandedGroups = F(this.groupedData), G(A.PANEL_ID, this.expandedGroups), this.render());
  }
  expandAllFamilyGroups() {
    this.groupedData && (this.groupedData = ge(this.groupedData), this.expandedGroups = F(this.groupedData), G(A.PANEL_ID, this.expandedGroups), this.render());
  }
  collapseAllFamilyGroups() {
    this.groupedData && (this.groupedData = fe(this.groupedData), this.expandedGroups = F(this.groupedData), G(A.PANEL_ID, this.expandedGroups), this.render());
  }
  async runInlineAction(e, t) {
    const i = this.rows.findIndex((r) => r.id === t);
    if (i < 0) return;
    const a = this.rows[i], o = a.actions[e];
    if (!o.enabled) {
      this.feedback = {
        kind: o.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: o.reason || `Cannot ${e} this assignment.`,
        code: o.reason_code || null
      }, this.render();
      return;
    }
    const c = q(a), d = `${e}:${t}`;
    this.pendingActions.add(d), this.feedback = null, this.rows[i] = Ze(a, e), this.render();
    try {
      const r = e === "claim" ? await Ye(this.config.endpoint, t, {
        expected_version: c.version,
        idempotency_key: ae("claim", c)
      }) : await We(this.config.endpoint, t, {
        expected_version: c.version,
        idempotency_key: ae("release", c)
      });
      this.rows[i] = q(r.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (r) {
      this.rows[i] = c, this.feedback = I(r, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(d), this.render();
    }
  }
  async runReviewAction(e, t) {
    const i = this.rows.findIndex((r) => r.id === t);
    if (i < 0) return;
    const a = this.rows[i], o = a.review_actions[e];
    if (!o?.enabled) {
      this.feedback = {
        kind: o?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: o?.reason || `Cannot ${e} this assignment.`,
        code: o?.reason_code || null
      }, this.render();
      return;
    }
    const c = {
      expected_version: a.version,
      idempotency_key: Xe(e, a)
    };
    if (e === "reject") {
      const r = typeof window < "u" ? window.prompt("Reject reason") : "";
      if (!r || !r.trim()) {
        this.feedback = {
          kind: "error",
          message: "Reject reason is required.",
          code: "VALIDATION_ERROR"
        }, this.render();
        return;
      }
      c.reason = r.trim();
    }
    const d = `${e}:${t}`;
    this.pendingActions.add(d), this.feedback = null, this.render();
    try {
      const r = await Z(this.config.endpoint, t, e, c);
      this.rows[i] = q(r.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (r) {
      this.feedback = I(r, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(d), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((i) => i.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = B(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((i) => i.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = B(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(P) : S.map(P);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(P) : J.map(P);
  }
  get visibleRows() {
    return this.rows;
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="${se}">Assignment Queue</p>
            <h1 class="${qe}">${u(this.config.title)}</h1>
            <p class="${Le} max-w-2xl">${u(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.visibleRows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="${g}" data-queue-refresh="true">Refresh</button>
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
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${l(this.feedback.kind)}" role="status" aria-live="polite">
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
      const o = i.filterSummary.slice(0, 4);
      return `
        <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="All matching filter selection">
          <div class="filter-snapshot-copy">
            <strong>${i.requested} matching assignment${i.requested !== 1 ? "s" : ""} selected</strong>
            ${o.length ? `<span>${o.map((c) => u(c)).join(" · ")}</span>` : ""}
          </div>
          <div class="filter-snapshot-actions">
            <button type="button" class="${g}" data-filter-snapshot-clear="true" ${a ? "disabled" : ""}>Clear</button>
            <button type="button" class="${g}" data-filter-snapshot-action="release" ${a || i.requested === 0 ? "disabled" : ""}>Release</button>
            <button type="button" class="${g}" data-filter-snapshot-action="archive" ${a || i.requested === 0 ? "disabled" : ""}>Archive</button>
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
        <button type="button" class="${g}" data-select-all-matching="true" ${a || e === 0 ? "disabled" : ""}>
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
            class="${g} queue-preset-button ${this.activePresetId === e.id ? "is-active" : ""}"
            data-preset-id="${l(e.id)}"
            role="tab"
            aria-selected="${this.activePresetId === e.id ? "true" : "false"}"
            title="${l(e.description || e.label)}"
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
          <p class="${se}">Reviewer states</p>
          <p class="review-preset-description">${u(t ? `Signed in as ${t}` : "Reviewer queue states are available when reviewer metadata is present.")}</p>
        </div>
        <div class="assignment-review-presets-grid">
          ${this.savedReviewFilterPresets.map((a) => `
            <button
              type="button"
              class="review-preset-button ${this.activeReviewPresetId === a.id ? "is-active" : ""}"
              data-review-preset-id="${l(a.id)}"
              title="${l(i ? a.description || a.label : "Reviewer metadata is required to use this preset.")}"
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
    ], o = ["", ...V(e.map((p) => p.target_locale))], c = ["", ...V(e.map((p) => p.assignee_id))], d = ["", ...V(e.map((p) => p.reviewer_id))], r = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
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
        ${this.renderSelect("locale", "Locale", o, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", c, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", d, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", r, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, t, i, a) {
    const o = [...i];
    return a && !o.includes(a) && o.push(a), `
      <label class="queue-filter-field">
        <span>${u(t)}</span>
        <select data-filter-name="${l(e)}">
          ${o.map((c) => `
            <option value="${l(c)}" ${c === a ? "selected" : ""}>
              ${u(c ? $(c) : `All ${t.toLowerCase()}`)}
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
        ${this.groupedData.ungrouped.map((i) => this.renderMobileCard(w(i))).join("")}
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
            ${this.groupedData.ungrouped.map((i) => this.renderRow(w(i))).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderFamilyGroupRows(e, t) {
    const i = be(e, { size: "sm" }), a = u(e.displayLabel || this.deriveFamilyGroupLabel(e)), o = e.records.length, c = e.expanded ? "▼" : "▶";
    return `
      <tr class="family-group-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
          data-group-id="${l(e.groupId)}"
          data-group-expanded="${e.expanded}"
          role="row"
          aria-expanded="${e.expanded}"
          tabindex="0">
        <td class="queue-select-col">
          <!-- Group parent doesn't have selection checkbox -->
        </td>
        <td colspan="${t - 1}">
          <div class="family-group-header-content">
            <button type="button" class="family-group-toggle" data-toggle-group="${l(e.groupId)}" aria-label="${e.expanded ? "Collapse" : "Expand"} family group">
              <span class="family-group-expand-icon" aria-hidden="true">${c}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${a}</strong>
              <span class="family-group-count">${o} ${o === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary">
              ${i}
            </div>
          </div>
        </td>
      </tr>
    ` + (e.expanded ? e.records.map((d) => {
      const r = w(d);
      return this.renderGroupChildRow(r, e.groupId);
    }).join("") : "");
  }
  renderGroupChildRow(e, t) {
    const i = this.pendingActions.has(`claim:${e.id}`), a = this.pendingActions.has(`release:${e.id}`), o = this.pendingActions.has(`approve:${e.id}`), c = this.pendingActions.has(`reject:${e.id}`), d = this.pendingActions.has(`archive:${e.id}`), r = i || !e.actions.claim.enabled, p = a || !e.actions.release.enabled, k = K(e), _ = Y(e), b = !!e.assignee_id, f = !!e.reviewer_id, y = !!e.due_date, R = y || e.due_state === "overdue" || e.due_state === "due_soon", E = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row family-group-child ${E ? "is-selected" : ""}"
          data-assignment-id="${l(e.id)}"
          data-parent-group="${l(t)}"
          data-assignment-row="true"
          data-assignment-nav-group="table"
          tabindex="0"
          aria-label="${l(W(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${l(e.id)}"
            ${E ? "checked" : ""}
            aria-label="Select assignment ${l(e.source_title || e.id)}"
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
            ${z(e.queue_state, {
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
            ${b ? `<span class="queue-owner-value">${u(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${f ? `<span class="queue-reviewer-value">${u(e.reviewer_id)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${R ? `<span class="due-pill due-${l(e.due_state)}">${u($(e.due_state))}</span>` : ""}
            ${y ? `<span class="queue-due-date">${u(Q(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${l(e.priority)}" aria-label="${l("Priority: " + $(e.priority))}"></span>
            <span class="priority-label">${u($(e.priority))}</span>
          </div>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${g}"
                data-action="claim"
                data-assignment-id="${l(e.id)}"
                ${r ? "disabled" : ""}
                aria-disabled="${r ? "true" : "false"}"
                title="${l(i ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${i ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${g}"
                data-action="release"
                data-assignment-id="${l(e.id)}"
                ${p ? "disabled" : ""}
                aria-disabled="${p ? "true" : "false"}"
                title="${l(a ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${a ? "Releasing…" : "Release"}
              </button>
            </div>
            ${k ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${O}"
                  data-action="approve"
                  data-assignment-id="${l(e.id)}"
                  ${o || !e.review_actions.approve.enabled ? "disabled" : ""}
                  title="${l(o ? "Approving…" : e.review_actions.approve.reason || "Approve")}"
                >
                  ${o ? "…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${N}"
                  data-action="reject"
                  data-assignment-id="${l(e.id)}"
                  ${c || !e.review_actions.reject.enabled ? "disabled" : ""}
                  title="${l(c ? "Rejecting…" : e.review_actions.reject.reason || "Reject")}"
                >
                  ${c ? "…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${_ ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${g}"
                  data-action="archive"
                  data-assignment-id="${l(e.id)}"
                  ${d || !e.review_actions.archive.enabled ? "disabled" : ""}
                  title="${l(d ? "Archiving…" : e.review_actions.archive.reason || "Archive")}"
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
           data-group-id="${l(e.groupId)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${l(e.groupId)}">
          <span class="family-group-expand-icon">${a}</span>
          <span class="family-group-mobile-label">${t}</span>
          <span class="family-group-mobile-count">${i} ${i === 1 ? "locale" : "locales"}</span>
        </button>
      </div>
    ` + (e.expanded ? e.records.map((o) => {
      const c = w(o);
      return `<div class="family-group-mobile-child">${this.renderMobileCard(c)}</div>`;
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
      <div class="${Ie} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${Pe}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${Ee} mt-2">${u(t)}</p>
        <div class="mt-4">
          <button type="button" class="${g}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), a = this.pendingActions.has(`approve:${e.id}`), o = this.pendingActions.has(`reject:${e.id}`), c = this.pendingActions.has(`archive:${e.id}`), d = t || !e.actions.claim.enabled, r = i || !e.actions.release.enabled, p = K(e), k = Y(e), _ = !!e.assignee_id, b = !!e.reviewer_id, f = !!e.due_date, y = f || e.due_state === "overdue" || e.due_state === "due_soon", R = [];
    e.entity_type && R.push(e.entity_type), e.family_id && e.family_id !== e.source_path && R.push(e.family_id);
    const E = R.join(" · "), ee = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row ${ee ? "is-selected" : ""}" tabindex="0" data-assignment-id="${l(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${l(W(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${l(e.id)}"
            ${ee ? "checked" : ""}
            aria-label="Select assignment ${l(e.source_title || e.id)}"
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
            ${z(e.queue_state, {
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
            ${_ ? `<span class="queue-owner-value">${u(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${b ? `<span class="queue-reviewer-value">${u(e.reviewer_id)}</span>` : ""}
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${u(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${y ? `<span class="due-pill due-${l(e.due_state)}">${u($(e.due_state))}</span>` : ""}
            ${f ? `<span class="queue-due-date">${u(Q(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${l(e.priority)}" aria-label="${l("Priority: " + $(e.priority))}"></span>
            <span class="priority-label">${u($(e.priority))}</span>
          </div>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${g}"
                data-action="claim"
                data-assignment-id="${l(e.id)}"
                ${d ? "disabled" : ""}
                aria-disabled="${d ? "true" : "false"}"
                title="${l(t ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${t ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${g}"
                data-action="release"
                data-assignment-id="${l(e.id)}"
                ${r ? "disabled" : ""}
                aria-disabled="${r ? "true" : "false"}"
                title="${l(i ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${i ? "Releasing…" : "Release"}
              </button>
            </div>
            ${p ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${O}"
                  data-action="approve"
                  data-assignment-id="${l(e.id)}"
                  ${a || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${a || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${l(a ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${a ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${N}"
                  data-action="reject"
                  data-assignment-id="${l(e.id)}"
                  ${o || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${o || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${l(o ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${o ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${k ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${g}"
                  data-action="archive"
                  data-assignment-id="${l(e.id)}"
                  ${c || !e.review_actions.archive.enabled ? "disabled" : ""}
                  aria-disabled="${c || !e.review_actions.archive.enabled ? "true" : "false"}"
                  title="${l(c ? "Archiving assignment…" : e.review_actions.archive.reason || "Archive assignment")}"
                >
                  ${c ? "Archiving…" : "Archive"}
                </button>
              </div>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }
  renderMobileCard(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), a = this.pendingActions.has(`approve:${e.id}`), o = this.pendingActions.has(`reject:${e.id}`), c = this.pendingActions.has(`archive:${e.id}`), d = t || !e.actions.claim.enabled, r = i || !e.actions.release.enabled, p = K(e), k = Y(e), _ = !!e.assignee_id, b = !!e.due_date, f = b || e.due_state === "overdue" || e.due_state === "due_soon", y = this.isRowSelected(e.id);
    return `
      <article
        class="${Se} ${y ? "is-selected" : ""}"
        data-assignment-id="${l(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${l(W(e))}"
      >
        <div class="${xe}">
          <div class="mobile-card-select">
            <input
              type="checkbox"
              class="queue-row-select"
              data-select-row="${l(e.id)}"
              ${y ? "checked" : ""}
              aria-label="Select assignment ${l(e.source_title || e.id)}"
            />
          </div>
          <div class="mobile-card-title-group">
            <h3 class="${ke}">${u(e.source_title || e.source_path || e.id)}</h3>
            <p class="${De}">${u(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${z(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${Ae}">
          <div class="${D}">
            <span class="${L}">Locale</span>
            <span class="${C}">
              <span class="locale-code">${u(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${u(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${D}">
            <span class="${L}">Assignee</span>
            <span class="${C} ${_ ? "" : "text-gray-400"}">${u(_ ? e.assignee_id : "Unassigned")}</span>
          </div>
          <div class="${D}">
            <span class="${L}">Due</span>
            <span class="${C}">
              ${f ? `<span class="due-pill due-${l(e.due_state)}">${u($(e.due_state))}</span>` : ""}
              ${b ? `<span class="text-gray-600 ml-1">${u(Q(e.due_date, ""))}</span>` : '<span class="text-gray-400">—</span>'}
            </span>
          </div>
          <div class="${D}">
            <span class="${L}">Priority</span>
            <span class="${C}">
              <span class="priority-indicator priority-${l(e.priority)}"></span>
              <span class="priority-label">${u($(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${Re}">
          <button
            type="button"
            class="${g} flex-1"
            data-action="claim"
            data-assignment-id="${l(e.id)}"
            ${d ? "disabled" : ""}
          >
            ${t ? "Claiming…" : "Claim"}
          </button>
          <button
            type="button"
            class="${g} flex-1"
            data-action="release"
            data-assignment-id="${l(e.id)}"
            ${r ? "disabled" : ""}
          >
            ${i ? "Releasing…" : "Release"}
          </button>
          ${p ? `
            <button
              type="button"
              class="${O} flex-1"
              data-action="approve"
              data-assignment-id="${l(e.id)}"
              ${a || !e.review_actions.approve.enabled ? "disabled" : ""}
            >
              ${a ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              class="${N} flex-1"
              data-action="reject"
              data-assignment-id="${l(e.id)}"
              ${o || !e.review_actions.reject.enabled ? "disabled" : ""}
            >
              ${o ? "Rejecting…" : "Reject"}
            </button>
          ` : ""}
          ${k ? `
            <button
              type="button"
              class="${g}"
              data-action="archive"
              data-assignment-id="${l(e.id)}"
              ${c || !e.review_actions.archive.enabled ? "disabled" : ""}
            >
              ${c ? "Archiving…" : "Archive"}
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
        const r = d.dataset.presetId;
        r && this.setActivePreset(r);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((d) => {
      d.addEventListener("click", () => {
        const r = d.dataset.reviewPresetId;
        r && this.setActiveReviewPreset(r);
      });
    }), this.container.querySelectorAll("[data-filter-name]").forEach((d) => {
      d.addEventListener("change", () => {
        const r = d.dataset.filterName;
        if (!r) return;
        const p = d.value.trim();
        switch (r) {
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
        const r = d.dataset.action, p = d.dataset.assignmentId;
        if ((r === "claim" || r === "release") && p) {
          this.runInlineAction(r, p);
          return;
        }
        (r === "approve" || r === "reject" || r === "archive") && p && this.runReviewAction(r, p);
      });
    });
    const e = this.container.querySelector("[data-select-all]");
    e && e.addEventListener("change", () => {
      e.checked ? this.selectAllPage() : this.clearSelection();
    }), this.container.querySelectorAll("[data-select-row]").forEach((d) => {
      d.addEventListener("change", (r) => {
        r.stopPropagation();
        const p = d.dataset.selectRow;
        p && this.toggleRowSelection(p);
      }), d.addEventListener("click", (r) => {
        r.stopPropagation();
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
        const r = d.dataset.filterSnapshotAction;
        (r === "release" || r === "archive") && this.runFilterSnapshotBulkAction(r);
      });
    }), this.container.querySelectorAll("[data-bulk-action]").forEach((d) => {
      d.addEventListener("click", () => {
        const r = d.dataset.bulkAction;
        (r === "release" || r === "archive") && this.runBulkAction(r);
      });
    }), this.container.querySelectorAll("[data-view-mode]").forEach((d) => {
      d.addEventListener("click", () => {
        const r = d.dataset.viewMode;
        (r === "flat" || r === "grouped") && this.setViewMode(r);
      });
    }), this.container.querySelectorAll("[data-toggle-group]").forEach((d) => {
      d.addEventListener("click", (r) => {
        r.stopPropagation();
        const p = d.dataset.toggleGroup;
        p && this.toggleGroupExpansion(p);
      });
    });
    const o = this.container.querySelector("[data-expand-all]");
    o && o.addEventListener("click", () => {
      this.expandAllFamilyGroups();
    });
    const c = this.container.querySelector("[data-collapse-all]");
    c && c.addEventListener("click", () => {
      this.collapseAllFamilyGroups();
    }), this.container.querySelectorAll("[data-group-id]").forEach((d) => {
      (d.tagName.toLowerCase() === "tr" || d.classList.contains("family-group-mobile-header")) && (d.addEventListener("click", (r) => {
        if (r.target?.closest("button, a, input, select, textarea")) return;
        const p = d.dataset.groupId;
        p && this.toggleGroupExpansion(p);
      }), d.addEventListener("keydown", (r) => {
        if (r.key === "Enter" || r.key === " ") {
          r.preventDefault();
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
        const o = t.dataset.assignmentNavGroup;
        if (!o) return;
        i.preventDefault();
        const c = Array.from(this.container?.querySelectorAll(`[data-assignment-nav-group="${o}"]`) || []), d = c.indexOf(t);
        d < 0 || c[a === "ArrowDown" ? Math.min(d + 1, c.length - 1) : Math.max(d - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
oe = de;
oe.PANEL_ID = "translation-queue";
function W(s) {
  return [
    s.source_title || s.source_path || s.id,
    `${s.source_locale.toUpperCase()} to ${s.target_locale.toUpperCase()}`,
    s.queue_state,
    s.due_state
  ].filter(Boolean).join(", ");
}
function $(s) {
  return s ? s.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function st() {
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
function it() {
  if (typeof document > "u") return;
  const s = "assignment-queue-styles";
  if (document.getElementById(s)) return;
  const e = document.createElement("style");
  e.id = s, e.textContent = st(), document.head.appendChild(e);
}
function at(s, e) {
  it();
  const t = new de(e);
  return t.mount(s), t;
}
function ht(s) {
  const e = s.dataset.endpoint || s.dataset.assignmentListEndpoint || "";
  if (!e) return null;
  const t = typeof window < "u" ? $e(window.location) : null;
  return at(s, {
    endpoint: e,
    bulkActionEndpoint: s.dataset.bulkActionEndpoint || s.dataset.bulkActionsEndpoint || "",
    bulkSnapshotEndpoint: s.dataset.bulkSnapshotEndpoint || "",
    editorBasePath: s.dataset.editorBasePath || "",
    title: s.dataset.title,
    description: s.dataset.description,
    initialPresetId: s.dataset.initialPresetId || _e(t ?? new URLSearchParams(), "preset") || ""
  });
}
function ne(s) {
  const e = s.trim();
  if (!e) return "/admin/api/translations/assignment-actions/bulk";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/bulk` : "/admin/api/translations/assignment-actions/bulk";
}
function re(s) {
  const e = s.trim();
  if (!e) return "/admin/api/translations/assignment-actions/snapshot";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/snapshot` : "/admin/api/translations/assignment-actions/snapshot";
}
export {
  M as AssignmentQueueRequestError,
  de as AssignmentQueueScreen,
  J as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  S as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  Ze as applyOptimisticAssignmentAction,
  Oe as buildAssignmentListQuery,
  Ue as buildAssignmentListURL,
  Ye as claimAssignment,
  at as createAssignmentQueueScreen,
  Ke as fetchAssignmentList,
  st as getAssignmentQueueStyles,
  ht as initAssignmentQueueScreen,
  He as normalizeAssignmentActionResponse,
  Fe as normalizeAssignmentListMeta,
  Ve as normalizeAssignmentListResponse,
  w as normalizeAssignmentListRow,
  B as presetToQueryState,
  We as releaseAssignment,
  ne as resolveAssignmentBulkActionEndpoint,
  re as resolveAssignmentBulkSnapshotEndpoint,
  Qe as snapshotFiltersFromQueryState
};

//# sourceMappingURL=index.js.map
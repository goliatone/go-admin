import { escapeAttribute as l, escapeHTML as c } from "../shared/html.js";
import { httpRequest as Y, readHTTPError as oe } from "../shared/transport/http-client.js";
import { extractStructuredError as de } from "../toast/error-helpers.js";
import { T as le, Y as j, c as ce, h as ue, i as pe, l as me, o as T, t as ge, v as M, x as fe, y as he } from "../chunks/grouped-mode-BmAxuRgL.js";
import { buildEndpointURL as be, getStringSearchParam as ve, readLocationSearchParams as _e, setNumberSearchParam as te, setSearchParam as h } from "../shared/query-state/url-state.js";
import { StatefulController as ye } from "../shared/stateful-controller.js";
import { asNumber as m, asRecord as p, asString as o } from "../shared/coercion.js";
import { B as $e, C as we, F as qe, I as ke, L as P, N as xe, P as Ae, R as L, S as se, V as D, _ as Se, a as B, c as z, g as Re, u as g, v as Ie, x as Ee, z as Pe } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationShortDateTime as F } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as Le } from "../shared/record-normalization.js";
var ne, W = class extends Error {
  constructor(s) {
    super(s.message), this.name = "AssignmentQueueRequestError", this.status = s.status, this.code = s.code ?? null, this.metadata = s.metadata ?? null, this.requestId = s.requestId, this.traceId = s.traceId;
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
], X = [
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
  const e = p(s);
  return {
    enabled: e.enabled === !0,
    reason: o(e.reason) || void 0,
    reason_code: o(e.reason_code) || void 0,
    permission: o(e.permission) || void 0
  };
}
function De(s) {
  const e = p(s), t = o(e.last_rejection_reason), a = o(e.last_reviewer_id);
  if (!(!t && !a))
    return {
      last_rejection_reason: t || void 0,
      last_reviewer_id: a || void 0
    };
}
function Ce(s) {
  const e = p(s), t = e.enabled === !0, a = m(e.warning_count), i = m(e.blocker_count), n = m(e.finding_count);
  if (!(!t && a <= 0 && i <= 0 && n <= 0))
    return {
      enabled: t,
      warning_count: a,
      blocker_count: i,
      finding_count: n
    };
}
function K(s) {
  switch (o(s)) {
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
      return o(s);
    default:
      return "open";
  }
}
function G(s, e) {
  const t = s.headers.get(e);
  return typeof t == "string" ? t.trim() : "";
}
function je(s) {
  const e = G(s, "x-request-id"), t = G(s, "x-correlation-id"), a = G(s, "x-trace-id") || t || void 0;
  return {
    requestId: e || void 0,
    traceId: a
  };
}
async function Te(s, e) {
  return typeof s.clone == "function" ? de(s.clone()) : {
    textCode: null,
    message: await oe(s, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function J(s, e) {
  const t = await Te(s, e), a = je(s);
  return new W({
    message: t.message || `${e}: ${s.status}`,
    status: s.status,
    code: t.textCode,
    metadata: t.metadata,
    requestId: a.requestId,
    traceId: a.traceId
  });
}
function Me(s) {
  const e = p(s), t = o(e.id), a = o(e.label);
  if (!t || !a) return null;
  const i = p(e.query);
  return {
    id: t,
    label: a,
    description: o(e.description) || void 0,
    review_state: o(e.review_state) || void 0,
    query: {
      status: o(i.status) || void 0,
      assignee_id: o(i.assignee_id) || void 0,
      reviewer_id: o(i.reviewer_id) || void 0,
      due_state: o(i.due_state) || void 0,
      locale: o(i.locale) || void 0,
      priority: o(i.priority) || void 0,
      family_id: o(i.family_id) || void 0,
      sort: o(i.sort) || void 0,
      order: o(i.order) || void 0
    }
  };
}
function ae(s, e = A) {
  const t = (Array.isArray(s) ? s : []).map((a) => Me(a)).filter((a) => a !== null);
  return t.length ? t : e.map(E);
}
function E(s) {
  return {
    id: s.id,
    label: s.label,
    description: s.description,
    review_state: s.review_state,
    query: { ...s.query }
  };
}
function N(s) {
  return Array.from(new Set(s.map((e) => o(e)).filter(Boolean)));
}
function Be(s) {
  const e = p(s), t = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((i) => o(i)).filter((i) => !!i) : [], a = p(e.default_sort);
  return {
    page: m(e.page) || 1,
    per_page: m(e.per_page) || 25,
    total: m(e.total),
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
    saved_filter_presets: ae(e.saved_filter_presets, A),
    saved_review_filter_presets: ae(e.saved_review_filter_presets, X),
    default_review_filter_preset: o(e.default_review_filter_preset) || void 0,
    review_actor_id: o(e.review_actor_id) || void 0,
    review_aggregate_counts: Le(e.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    grouping: ze(e.grouping)
  };
}
function ze(s) {
  const e = p(s);
  if (!(!e || e.enabled !== !0))
    return {
      enabled: !0,
      mode: o(e.mode) || "family_id",
      group_by: o(e.group_by) || "family_id",
      scope: o(e.scope) || "current_page",
      row_count: m(e.row_count),
      group_count: m(e.group_count),
      assignment_count: m(e.assignment_count),
      supported_modes: Array.isArray(e.supported_modes) ? e.supported_modes.map((t) => o(t)).filter(Boolean) : ["family_id"],
      strategy: o(e.strategy) || "page_local"
    };
}
function Fe(s = {}) {
  const e = new URLSearchParams();
  return h(e, "status", s.status), h(e, "assignee_id", s.assigneeId), h(e, "reviewer_id", s.reviewerId), h(e, "due_state", s.dueState), h(e, "locale", s.locale), h(e, "priority", s.priority), h(e, "review_state", s.reviewState), h(e, "family_id", s.familyId), te(e, "page", s.page, { min: 1 }), te(e, "per_page", s.perPage, { min: 1 }), h(e, "sort", s.sort), h(e, "order", s.order), h(e, "group_by", s.groupBy), e.toString();
}
function Ge(s, e = {}) {
  const t = Fe(e);
  return t ? be(s, new URLSearchParams(t), { preserveAbsolute: !0 }) : s;
}
function v(s) {
  const e = p(s);
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
    reviewer_id: o(e.reviewer_id),
    assignment_type: o(e.assignment_type),
    content_state: o(e.content_state),
    queue_state: K(e.queue_state),
    status: K(e.status),
    priority: o(e.priority) || "normal",
    due_state: o(e.due_state) || "none",
    due_date: o(e.due_date) || void 0,
    row_version: m(e.row_version || e.version),
    version: m(e.version || e.row_version),
    updated_at: o(e.updated_at),
    created_at: o(e.created_at),
    actions: {
      claim: x(p(e.actions).claim),
      release: x(p(e.actions).release)
    },
    review_actions: {
      submit_review: x(p(e.review_actions).submit_review),
      approve: x(p(e.review_actions).approve),
      reject: x(p(e.review_actions).reject),
      archive: x(p(e.review_actions).archive)
    },
    last_rejection_reason: o(e.last_rejection_reason) || void 0,
    review_feedback: De(e.review_feedback),
    qa_summary: Ce(e.qa_summary)
  };
}
function Ne(s) {
  const e = p(s);
  return {
    data: (Array.isArray(e.data) ? e.data : []).map((t) => v(t)),
    meta: Be(e.meta)
  };
}
function Oe(s) {
  const e = p(s), t = p(e.meta), a = p(e.data);
  return {
    data: {
      assignment_id: o(a.assignment_id),
      status: K(a.status),
      row_version: m(a.row_version),
      updated_at: o(a.updated_at),
      assignment: v(a.assignment)
    },
    meta: { idempotency_hit: t.idempotency_hit === !0 }
  };
}
async function Qe(s, e = {}) {
  const t = await Y(Ge(s, e), { method: "GET" });
  if (!t.ok) throw await J(t, "Failed to load assignments");
  return Ne(await t.json());
}
async function Z(s, e, t, a) {
  const i = { expected_version: a.expected_version };
  a.idempotency_key && (i.idempotency_key = a.idempotency_key), a.reason && (i.reason = a.reason);
  const n = await Y(`${s}/${encodeURIComponent(e)}/actions/${t}`, {
    method: "POST",
    json: i
  });
  if (!n.ok) throw await J(n, `Failed to ${t} assignment`);
  return Oe(await n.json());
}
function Ue(s, e, t) {
  return Z(s, e, "claim", t);
}
function Ve(s, e, t) {
  return Z(s, e, "release", t);
}
function C(s) {
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
function ie(s, e) {
  return `queue-${s}-${e.id}-${e.version}-${Date.now()}`;
}
function He(s, e) {
  return `queue-${s}-${e.id}-${e.version}-${Date.now()}`;
}
function Ke(s) {
  const e = o(s);
  if (!e) return null;
  const t = A.find((i) => i.id === e);
  if (t) return {
    kind: "standard",
    preset: t
  };
  const a = X.find((i) => i.id === e);
  return a ? {
    kind: "review",
    preset: a
  } : null;
}
function _(s) {
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
function O(s, e) {
  return {
    enabled: !1,
    permission: s,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function Ye(s, e) {
  const t = _(s);
  return e === "claim" ? (t.queue_state = "in_progress", t.status = "in_progress", t.actions.claim = O(s.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), t.actions.release = {
    enabled: !0,
    permission: s.actions.release.permission
  }, t.review_actions.submit_review = {
    enabled: !0,
    permission: s.review_actions.submit_review.permission
  }, t) : (t.assignment_type = "open_pool", t.queue_state = "open", t.status = "open", t.assignee_id = "", t.actions.claim = {
    enabled: !0,
    permission: s.actions.claim.permission
  }, t.actions.release = O(s.actions.release.permission, "assignment must be assigned or in progress before it can be released"), t.review_actions.submit_review = O(s.review_actions.submit_review.permission, "assignment must be in progress"), t);
}
function Q(s, e) {
  return s instanceof W ? {
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
function We(s) {
  return o(s.queue_state || s.status);
}
function Xe(s) {
  return s === "review" || s === "in_review";
}
function U(s) {
  return Xe(We(s)) ? !0 : !!(s.review_actions.approve.enabled || s.review_actions.reject.enabled);
}
function V(s) {
  return !!s.review_actions.archive.enabled;
}
var re = class $ extends ye {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.selectedRows = /* @__PURE__ */ new Map(), this.bulkActionPending = !1, this.viewMode = "flat", this.groupedData = null, this.expandedGroups = /* @__PURE__ */ new Set();
    const t = o(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const a = Ke(t);
    if (a?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = a.preset.id, this.activeReviewState = a.preset.review_state || null, this.queryState = C(a.preset);
      return;
    }
    const i = a?.preset || A[1] || A[0];
    this.activePresetId = i?.id || "open", this.queryState = i ? C(i) : {
      sort: "updated_at",
      order: "desc",
      page: 1
    };
    const n = me($.PANEL_ID);
    n && (this.viewMode = n, this.viewMode === "grouped" && (this.queryState.groupBy = "family_id")), this.expandedGroups = ce($.PANEL_ID);
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
    const t = this.rows.find((a) => a.id === e);
    t && (this.selectedRows.has(e) ? this.selectedRows.delete(e) : this.selectedRows.set(e, {
      assignmentId: t.id,
      expectedVersion: t.version
    }), this.render());
  }
  selectAllPage() {
    for (const e of this.rows) this.selectedRows.set(e.id, {
      assignmentId: e.id,
      expectedVersion: e.version
    });
    this.render();
  }
  clearSelection() {
    this.selectedRows.clear(), this.render();
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
      const i = await this.executeBulkAction({
        action: e,
        assignments: a,
        reason: t?.reason,
        priority: t?.priority
      });
      for (const n of i.data.results) if (n.success && n.assignment) {
        const r = this.rows.findIndex((d) => d.id === n.assignmentId);
        r >= 0 && (this.rows[r] = _(n.assignment)), this.selectedRows.delete(n.assignmentId);
      }
      if (i.data.failed > 0) {
        const n = i.data.results.filter((r) => !r.success).map((r) => r.assignmentId).slice(0, 3);
        this.feedback = {
          kind: "error",
          message: `${i.data.succeeded} succeeded, ${i.data.failed} failed. Failed: ${n.join(", ")}${i.data.failed > 3 ? "..." : ""}`
        };
      } else this.feedback = {
        kind: "success",
        message: `${i.data.succeeded} assignment${i.data.succeeded !== 1 ? "s" : ""} updated.`
      };
    } catch (i) {
      this.feedback = Q(i, `Bulk ${e} failed.`);
    } finally {
      this.bulkActionPending = !1, this.render();
    }
  }
  async executeBulkAction(e) {
    const t = await Y(`${this.config.endpoint}/bulk/${e.action}`, {
      method: "POST",
      json: {
        assignments: e.assignments.map((r) => ({
          assignment_id: r.assignmentId,
          expected_version: r.expectedVersion
        })),
        reason: e.reason,
        priority: e.priority
      }
    });
    if (!t.ok) throw await J(t, `Bulk ${e.action} failed`);
    const a = p(await t.json()), i = p(a.data), n = Array.isArray(i.results) ? i.results : [];
    return {
      data: {
        requested: m(i.requested),
        succeeded: m(i.succeeded),
        failed: m(i.failed),
        results: n.map((r) => {
          const d = p(r);
          return {
            assignmentId: o(d.assignment_id),
            success: d.success === !0,
            error: o(d.error) || void 0,
            errorCode: o(d.error_code) || void 0,
            assignment: d.assignment ? v(d.assignment) : void 0
          };
        })
      },
      meta: { action: o(p(a.meta).action) }
    };
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await Qe(this.config.endpoint, this.queryState);
      if (this.response = e, this.viewMode === "grouped" && e.meta.grouping?.enabled) {
        const t = ue(e.data, {
          defaultExpanded: !0,
          expandMode: "explicit",
          expandedGroups: this.expandedGroups
        });
        if (t) {
          this.groupedData = t, this.rows = [];
          for (const a of t.groups) for (const i of a.records) this.rows.push(v(i));
          for (const a of t.ungrouped) this.rows.push(v(a));
        } else
          this.groupedData = null, this.rows = e.data.map((a) => _(a));
      } else
        this.groupedData = null, this.rows = e.data.map((t) => _(t));
      this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof W && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  getViewMode() {
    return this.viewMode;
  }
  setViewMode(e) {
    if (this.viewMode !== e) {
      if (this.viewMode = e, he($.PANEL_ID, e), e === "grouped") this.queryState = {
        ...this.queryState,
        groupBy: "family_id"
      };
      else {
        const { groupBy: t, ...a } = this.queryState;
        this.queryState = a;
      }
      this.feedback = null, this.clearSelection(), this.load();
    }
  }
  toggleGroupExpansion(e) {
    this.groupedData && (this.groupedData = le(this.groupedData, e), this.expandedGroups = T(this.groupedData), M($.PANEL_ID, this.expandedGroups), this.render());
  }
  expandAllFamilyGroups() {
    this.groupedData && (this.groupedData = pe(this.groupedData), this.expandedGroups = T(this.groupedData), M($.PANEL_ID, this.expandedGroups), this.render());
  }
  collapseAllFamilyGroups() {
    this.groupedData && (this.groupedData = ge(this.groupedData), this.expandedGroups = T(this.groupedData), M($.PANEL_ID, this.expandedGroups), this.render());
  }
  async runInlineAction(e, t) {
    const a = this.rows.findIndex((u) => u.id === t);
    if (a < 0) return;
    const i = this.rows[a], n = i.actions[e];
    if (!n.enabled) {
      this.feedback = {
        kind: n.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n.reason || `Cannot ${e} this assignment.`,
        code: n.reason_code || null
      }, this.render();
      return;
    }
    const r = _(i), d = `${e}:${t}`;
    this.pendingActions.add(d), this.feedback = null, this.rows[a] = Ye(i, e), this.render();
    try {
      const u = e === "claim" ? await Ue(this.config.endpoint, t, {
        expected_version: r.version,
        idempotency_key: ie("claim", r)
      }) : await Ve(this.config.endpoint, t, {
        expected_version: r.version,
        idempotency_key: ie("release", r)
      });
      this.rows[a] = _(u.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (u) {
      this.rows[a] = r, this.feedback = Q(u, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(d), this.render();
    }
  }
  async runReviewAction(e, t) {
    const a = this.rows.findIndex((u) => u.id === t);
    if (a < 0) return;
    const i = this.rows[a], n = i.review_actions[e];
    if (!n?.enabled) {
      this.feedback = {
        kind: n?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n?.reason || `Cannot ${e} this assignment.`,
        code: n?.reason_code || null
      }, this.render();
      return;
    }
    const r = {
      expected_version: i.version,
      idempotency_key: He(e, i)
    };
    if (e === "reject") {
      const u = typeof window < "u" ? window.prompt("Reject reason") : "";
      if (!u || !u.trim()) {
        this.feedback = {
          kind: "error",
          message: "Reject reason is required.",
          code: "VALIDATION_ERROR"
        }, this.render();
        return;
      }
      r.reason = u.trim();
    }
    const d = `${e}:${t}`;
    this.pendingActions.add(d), this.feedback = null, this.render();
    try {
      const u = await Z(this.config.endpoint, t, e, r);
      this.rows[a] = _(u.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (u) {
      this.feedback = Q(u, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(d), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((a) => a.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = C(t), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((a) => a.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = C(t), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(E) : A.map(E);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(E) : X.map(E);
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
            <h1 class="${we}">${c(this.config.title)}</h1>
            <p class="${Ee} max-w-2xl">${c(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.visibleRows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="${g}" data-queue-refresh="true">Refresh</button>
          </div>
        </section>
        ${this.renderFeedback()}
        ${this.renderBulkActionBar()}
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
      this.feedback.code ? `Code ${c(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${c(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${c(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${l(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${c(this.feedback.message)}</strong>
        ${t.length ? `<span class="feedback-meta">${t.join(" · ")}</span>` : ""}
      </div>
    `;
  }
  renderBulkActionBar() {
    const e = this.selectedRows.size;
    if (e === 0) return "";
    const t = this.bulkActionPending;
    return `
      <section class="bulk-action-bar" data-bulk-action-bar="true" role="toolbar" aria-label="Bulk actions for ${e} selected assignment${e !== 1 ? "s" : ""}">
        <div class="bulk-action-bar-info">
          <span class="bulk-action-count">${e} selected</span>
          <button type="button" class="bulk-action-clear" data-bulk-clear="true" ${t ? "disabled" : ""}>
            Clear selection
          </button>
        </div>
        <div class="bulk-action-buttons">
          <button
            type="button"
            class="${g}"
            data-bulk-action="release"
            ${t ? "disabled" : ""}
            title="Release selected assignments back to the pool"
          >
            ${t ? "Processing…" : "Release"}
          </button>
          <button
            type="button"
            class="${g}"
            data-bulk-action="archive"
            ${t ? "disabled" : ""}
            title="Archive selected assignments"
          >
            ${t ? "Processing…" : "Archive"}
          </button>
        </div>
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
            ${c(e.label)}
          </button>
        `).join("")}
      </div>
    `;
  }
  renderReviewStateBar() {
    if (!this.savedReviewFilterPresets.length) return "";
    const e = this.response?.meta.review_aggregate_counts || {}, t = this.response?.meta.review_actor_id, a = !!t;
    return `
      <section class="assignment-review-presets" aria-label="Reviewer queue states">
        <div class="review-preset-copy">
          <p class="${se}">Reviewer states</p>
          <p class="review-preset-description">${c(t ? `Signed in as ${t}` : "Reviewer queue states are available when reviewer metadata is present.")}</p>
        </div>
        <div class="assignment-review-presets-grid">
          ${this.savedReviewFilterPresets.map((i) => `
            <button
              type="button"
              class="review-preset-button ${this.activeReviewPresetId === i.id ? "is-active" : ""}"
              data-review-preset-id="${l(i.id)}"
              title="${l(a ? i.description || i.label : "Reviewer metadata is required to use this preset.")}"
              ${a ? "" : 'disabled aria-disabled="true"'}
            >
              <span>${c(i.label)}</span>
              <strong>${e[i.id] ?? 0}</strong>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }
  renderViewModeToggle() {
    const e = this.viewMode === "grouped", t = this.groupedData?.totalGroups ?? 0, a = this.response?.meta.grouping?.assignment_count ?? this.rows.length;
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
            <span class="view-mode-count">${t} ${t === 1 ? "family" : "families"} · ${a} assignments</span>
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
    ], a = [
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
    ], n = ["", ...N(e.map((f) => f.target_locale))], r = ["", ...N(e.map((f) => f.assignee_id))], d = ["", ...N(e.map((f) => f.reviewer_id))], u = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
      "updated_at",
      "due_date",
      "priority",
      "status",
      "locale"
    ];
    return `
      <form class="assignment-queue-filters" data-queue-filters="true">
        ${this.renderSelect("status", "Status", t, this.queryState.status || "")}
        ${this.renderSelect("due_state", "Due State", ["", ...a], this.queryState.dueState || "")}
        ${this.renderSelect("priority", "Priority", i, this.queryState.priority || "")}
        ${this.renderSelect("locale", "Locale", n, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", r, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", d, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", u, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, t, a, i) {
    const n = [...a];
    return i && !n.includes(i) && n.push(i), `
      <label class="queue-filter-field">
        <span>${c(t)}</span>
        <select data-filter-name="${l(e)}">
          ${n.map((r) => `
            <option value="${l(r)}" ${r === i ? "selected" : ""}>
              ${c(r ? b(r) : `All ${t.toLowerCase()}`)}
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
            ${e.map((a) => this.renderRow(a)).join("")}
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
        ${this.groupedData.groups.map((a) => this.renderGroupedMobileCards(a)).join("")}
        ${this.groupedData.ungrouped.map((a) => this.renderMobileCard(v(a))).join("")}
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
            ${this.groupedData.groups.map((a) => this.renderFamilyGroupRows(a, t)).join("")}
            ${this.groupedData.ungrouped.map((a) => this.renderRow(v(a))).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderFamilyGroupRows(e, t) {
    const a = fe(e, { size: "sm" }), i = c(e.displayLabel || this.deriveFamilyGroupLabel(e)), n = e.records.length, r = e.expanded ? "▼" : "▶";
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
              <span class="family-group-expand-icon" aria-hidden="true">${r}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${i}</strong>
              <span class="family-group-count">${n} ${n === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary">
              ${a}
            </div>
          </div>
        </td>
      </tr>
    ` + (e.expanded ? e.records.map((d) => {
      const u = v(d);
      return this.renderGroupChildRow(u, e.groupId);
    }).join("") : "");
  }
  renderGroupChildRow(e, t) {
    const a = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), n = this.pendingActions.has(`approve:${e.id}`), r = this.pendingActions.has(`reject:${e.id}`), d = this.pendingActions.has(`archive:${e.id}`), u = a || !e.actions.claim.enabled, f = i || !e.actions.release.enabled, S = U(e), w = V(e), q = !!e.assignee_id, k = !!e.reviewer_id, y = !!e.due_date, R = y || e.due_state === "overdue" || e.due_state === "due_soon", I = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row family-group-child ${I ? "is-selected" : ""}"
          data-assignment-id="${l(e.id)}"
          data-parent-group="${l(t)}"
          data-assignment-row="true"
          data-assignment-nav-group="table"
          tabindex="0"
          aria-label="${l(H(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${l(e.id)}"
            ${I ? "checked" : ""}
            aria-label="Select assignment ${l(e.source_title || e.id)}"
          />
        </td>
        <td>
          <div class="queue-content-cell queue-content-cell-grouped">
            <span class="queue-content-indent"></span>
            <span class="queue-content-title-small">${c(e.source_title || e.source_path || e.id)}</span>
          </div>
        </td>
        <td>
          <div class="queue-locale-cell">
            <span class="locale-code">${c(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${c(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td>
          <div class="queue-status-cell">
            ${j(e.queue_state, {
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
            ${q ? `<span class="queue-owner-value">${c(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${k ? `<span class="queue-reviewer-value">${c(e.reviewer_id)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${R ? `<span class="due-pill due-${l(e.due_state)}">${c(b(e.due_state))}</span>` : ""}
            ${y ? `<span class="queue-due-date">${c(F(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${l(e.priority)}" aria-label="${l("Priority: " + b(e.priority))}"></span>
            <span class="priority-label">${c(b(e.priority))}</span>
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
                ${u ? "disabled" : ""}
                aria-disabled="${u ? "true" : "false"}"
                title="${l(a ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${a ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${g}"
                data-action="release"
                data-assignment-id="${l(e.id)}"
                ${f ? "disabled" : ""}
                aria-disabled="${f ? "true" : "false"}"
                title="${l(i ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${i ? "Releasing…" : "Release"}
              </button>
            </div>
            ${S ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${z}"
                  data-action="approve"
                  data-assignment-id="${l(e.id)}"
                  ${n || !e.review_actions.approve.enabled ? "disabled" : ""}
                  title="${l(n ? "Approving…" : e.review_actions.approve.reason || "Approve")}"
                >
                  ${n ? "…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${B}"
                  data-action="reject"
                  data-assignment-id="${l(e.id)}"
                  ${r || !e.review_actions.reject.enabled ? "disabled" : ""}
                  title="${l(r ? "Rejecting…" : e.review_actions.reject.reason || "Reject")}"
                >
                  ${r ? "…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${w ? `
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
    const t = c(e.displayLabel || this.deriveFamilyGroupLabel(e)), a = e.records.length, i = e.expanded ? "▼" : "▶";
    return `
      <div class="family-group-mobile-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
           data-group-id="${l(e.groupId)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${l(e.groupId)}">
          <span class="family-group-expand-icon">${i}</span>
          <span class="family-group-mobile-label">${t}</span>
          <span class="family-group-mobile-count">${a} ${a === 1 ? "locale" : "locales"}</span>
        </button>
      </div>
    ` + (e.expanded ? e.records.map((n) => {
      const r = v(n);
      return `<div class="family-group-mobile-child">${this.renderMobileCard(r)}</div>`;
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
      for (const i of a) if (i) return i;
    }
    return `Family ${e.groupId.length > 20 ? e.groupId.slice(0, 17) + "..." : e.groupId}`;
  }
  renderErrorState(e, t) {
    return `
      <div class="${Re} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${Ie}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${Se} mt-2">${c(t)}</p>
        <div class="mt-4">
          <button type="button" class="${g}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), a = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), n = this.pendingActions.has(`reject:${e.id}`), r = this.pendingActions.has(`archive:${e.id}`), d = t || !e.actions.claim.enabled, u = a || !e.actions.release.enabled, f = U(e), S = V(e), w = !!e.assignee_id, q = !!e.reviewer_id, k = !!e.due_date, y = k || e.due_state === "overdue" || e.due_state === "due_soon", R = [];
    e.entity_type && R.push(e.entity_type), e.family_id && e.family_id !== e.source_path && R.push(e.family_id);
    const I = R.join(" · "), ee = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row ${ee ? "is-selected" : ""}" tabindex="0" data-assignment-id="${l(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${l(H(e))}">
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
            <strong class="queue-content-title">${c(e.source_title || e.source_path || e.id)}</strong>
            ${e.source_path && e.source_title ? `<span class="queue-content-path">${c(e.source_path)}</span>` : ""}
            ${I ? `<span class="queue-content-meta">${c(I)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-locale-cell">
            <span class="locale-code">${c(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${c(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td>
          <div class="queue-status-cell">
            ${j(e.queue_state, {
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
            ${w ? `<span class="queue-owner-value">${c(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${q ? `<span class="queue-reviewer-value">${c(e.reviewer_id)}</span>` : ""}
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${c(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${y ? `<span class="due-pill due-${l(e.due_state)}">${c(b(e.due_state))}</span>` : ""}
            ${k ? `<span class="queue-due-date">${c(F(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${l(e.priority)}" aria-label="${l("Priority: " + b(e.priority))}"></span>
            <span class="priority-label">${c(b(e.priority))}</span>
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
                ${u ? "disabled" : ""}
                aria-disabled="${u ? "true" : "false"}"
                title="${l(a ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${a ? "Releasing…" : "Release"}
              </button>
            </div>
            ${f ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${z}"
                  data-action="approve"
                  data-assignment-id="${l(e.id)}"
                  ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${i || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${l(i ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${i ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${B}"
                  data-action="reject"
                  data-assignment-id="${l(e.id)}"
                  ${n || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${n || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${l(n ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${n ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${S ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${g}"
                  data-action="archive"
                  data-assignment-id="${l(e.id)}"
                  ${r || !e.review_actions.archive.enabled ? "disabled" : ""}
                  aria-disabled="${r || !e.review_actions.archive.enabled ? "true" : "false"}"
                  title="${l(r ? "Archiving assignment…" : e.review_actions.archive.reason || "Archive assignment")}"
                >
                  ${r ? "Archiving…" : "Archive"}
                </button>
              </div>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }
  renderMobileCard(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), a = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), n = this.pendingActions.has(`reject:${e.id}`), r = this.pendingActions.has(`archive:${e.id}`), d = t || !e.actions.claim.enabled, u = a || !e.actions.release.enabled, f = U(e), S = V(e), w = !!e.assignee_id, q = !!e.due_date, k = q || e.due_state === "overdue" || e.due_state === "due_soon", y = this.isRowSelected(e.id);
    return `
      <article
        class="${xe} ${y ? "is-selected" : ""}"
        data-assignment-id="${l(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${l(H(e))}"
      >
        <div class="${ke}">
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
            <h3 class="${$e}">${c(e.source_title || e.source_path || e.id)}</h3>
            <p class="${Pe}">${c(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${j(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${qe}">
          <div class="${L}">
            <span class="${P}">Locale</span>
            <span class="${D}">
              <span class="locale-code">${c(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${c(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${L}">
            <span class="${P}">Assignee</span>
            <span class="${D} ${w ? "" : "text-gray-400"}">${c(w ? e.assignee_id : "Unassigned")}</span>
          </div>
          <div class="${L}">
            <span class="${P}">Due</span>
            <span class="${D}">
              ${k ? `<span class="due-pill due-${l(e.due_state)}">${c(b(e.due_state))}</span>` : ""}
              ${q ? `<span class="text-gray-600 ml-1">${c(F(e.due_date, ""))}</span>` : '<span class="text-gray-400">—</span>'}
            </span>
          </div>
          <div class="${L}">
            <span class="${P}">Priority</span>
            <span class="${D}">
              <span class="priority-indicator priority-${l(e.priority)}"></span>
              <span class="priority-label">${c(b(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${Ae}">
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
            ${u ? "disabled" : ""}
          >
            ${a ? "Releasing…" : "Release"}
          </button>
          ${f ? `
            <button
              type="button"
              class="${z} flex-1"
              data-action="approve"
              data-assignment-id="${l(e.id)}"
              ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
            >
              ${i ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              class="${B} flex-1"
              data-action="reject"
              data-assignment-id="${l(e.id)}"
              ${n || !e.review_actions.reject.enabled ? "disabled" : ""}
            >
              ${n ? "Rejecting…" : "Reject"}
            </button>
          ` : ""}
          ${S ? `
            <button
              type="button"
              class="${g}"
              data-action="archive"
              data-assignment-id="${l(e.id)}"
              ${r || !e.review_actions.archive.enabled ? "disabled" : ""}
            >
              ${r ? "Archiving…" : "Archive"}
            </button>
          ` : ""}
        </div>
      </article>
    `;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-preset-id]").forEach((n) => {
      n.addEventListener("click", () => {
        const r = n.dataset.presetId;
        r && this.setActivePreset(r);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((n) => {
      n.addEventListener("click", () => {
        const r = n.dataset.reviewPresetId;
        r && this.setActiveReviewPreset(r);
      });
    }), this.container.querySelectorAll("[data-filter-name]").forEach((n) => {
      n.addEventListener("change", () => {
        const r = n.dataset.filterName;
        if (!r) return;
        const d = n.value.trim();
        switch (r) {
          case "status":
            this.updateFilter({ status: d || void 0 });
            break;
          case "due_state":
            this.updateFilter({ dueState: d || void 0 });
            break;
          case "priority":
            this.updateFilter({ priority: d || void 0 });
            break;
          case "locale":
            this.updateFilter({ locale: d || void 0 });
            break;
          case "assignee_id":
            this.updateFilter({ assigneeId: d || void 0 });
            break;
          case "reviewer_id":
            this.updateFilter({ reviewerId: d || void 0 });
            break;
          case "sort":
            this.updateFilter({ sort: d || void 0 });
            break;
          case "order":
            this.updateFilter({ order: d || void 0 });
            break;
        }
      });
    }), this.container.querySelectorAll("[data-queue-refresh]").forEach((n) => {
      n.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-action]").forEach((n) => {
      n.addEventListener("click", () => {
        const r = n.dataset.action, d = n.dataset.assignmentId;
        if ((r === "claim" || r === "release") && d) {
          this.runInlineAction(r, d);
          return;
        }
        (r === "approve" || r === "reject" || r === "archive") && d && this.runReviewAction(r, d);
      });
    });
    const e = this.container.querySelector("[data-select-all]");
    e && e.addEventListener("change", () => {
      e.checked ? this.selectAllPage() : this.clearSelection();
    }), this.container.querySelectorAll("[data-select-row]").forEach((n) => {
      n.addEventListener("change", (r) => {
        r.stopPropagation();
        const d = n.dataset.selectRow;
        d && this.toggleRowSelection(d);
      }), n.addEventListener("click", (r) => {
        r.stopPropagation();
      });
    });
    const t = this.container.querySelector("[data-bulk-clear]");
    t && t.addEventListener("click", () => {
      this.clearSelection();
    }), this.container.querySelectorAll("[data-bulk-action]").forEach((n) => {
      n.addEventListener("click", () => {
        const r = n.dataset.bulkAction;
        (r === "release" || r === "archive") && this.runBulkAction(r);
      });
    }), this.container.querySelectorAll("[data-view-mode]").forEach((n) => {
      n.addEventListener("click", () => {
        const r = n.dataset.viewMode;
        (r === "flat" || r === "grouped") && this.setViewMode(r);
      });
    }), this.container.querySelectorAll("[data-toggle-group]").forEach((n) => {
      n.addEventListener("click", (r) => {
        r.stopPropagation();
        const d = n.dataset.toggleGroup;
        d && this.toggleGroupExpansion(d);
      });
    });
    const a = this.container.querySelector("[data-expand-all]");
    a && a.addEventListener("click", () => {
      this.expandAllFamilyGroups();
    });
    const i = this.container.querySelector("[data-collapse-all]");
    i && i.addEventListener("click", () => {
      this.collapseAllFamilyGroups();
    }), this.container.querySelectorAll("[data-group-id]").forEach((n) => {
      (n.tagName.toLowerCase() === "tr" || n.classList.contains("family-group-mobile-header")) && (n.addEventListener("click", (r) => {
        if (r.target?.closest("button, a, input, select, textarea")) return;
        const d = n.dataset.groupId;
        d && this.toggleGroupExpansion(d);
      }), n.addEventListener("keydown", (r) => {
        if (r.key === "Enter" || r.key === " ") {
          r.preventDefault();
          const d = n.dataset.groupId;
          d && this.toggleGroupExpansion(d);
        }
      }));
    }), this.attachAssignmentNavigationTargets("[data-assignment-row]"), this.attachAssignmentNavigationTargets("[data-assignment-card]");
  }
  attachAssignmentNavigationTargets(e) {
    this.container && this.container.querySelectorAll(e).forEach((t) => {
      t.addEventListener("click", (a) => {
        a.target?.closest("button, a, input, select, textarea") || this.openAssignment(t.dataset.assignmentId || "");
      }), t.addEventListener("keydown", (a) => {
        const i = a.key;
        if (i === "Enter" || i === " ") {
          a.preventDefault(), this.openAssignment(t.dataset.assignmentId || "");
          return;
        }
        if (i !== "ArrowDown" && i !== "ArrowUp") return;
        const n = t.dataset.assignmentNavGroup;
        if (!n) return;
        a.preventDefault();
        const r = Array.from(this.container?.querySelectorAll(`[data-assignment-nav-group="${n}"]`) || []), d = r.indexOf(t);
        d < 0 || r[i === "ArrowDown" ? Math.min(d + 1, r.length - 1) : Math.max(d - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
ne = re;
ne.PANEL_ID = "translation-queue";
function H(s) {
  return [
    s.source_title || s.source_path || s.id,
    `${s.source_locale.toUpperCase()} to ${s.target_locale.toUpperCase()}`,
    s.queue_state,
    s.due_state
  ].filter(Boolean).join(", ");
}
function b(s) {
  return s ? s.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function Je() {
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

    /* T10: Bulk action bar */
    .bulk-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%);
      border-radius: 0.75rem;
      color: #ffffff;
      flex-wrap: wrap;
    }

    .bulk-action-bar-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .bulk-action-count {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .bulk-action-clear {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }

    .bulk-action-clear:hover {
      color: #ffffff;
    }

    .bulk-action-clear:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .bulk-action-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
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
function Ze() {
  if (typeof document > "u") return;
  const s = "assignment-queue-styles";
  if (document.getElementById(s)) return;
  const e = document.createElement("style");
  e.id = s, e.textContent = Je(), document.head.appendChild(e);
}
function et(s, e) {
  Ze();
  const t = new re(e);
  return t.mount(s), t;
}
function ut(s) {
  const e = s.dataset.endpoint || s.dataset.assignmentListEndpoint || "";
  if (!e) return null;
  const t = typeof window < "u" ? _e(window.location) : null;
  return et(s, {
    endpoint: e,
    editorBasePath: s.dataset.editorBasePath || "",
    title: s.dataset.title,
    description: s.dataset.description,
    initialPresetId: s.dataset.initialPresetId || ve(t ?? new URLSearchParams(), "preset") || ""
  });
}
export {
  W as AssignmentQueueRequestError,
  re as AssignmentQueueScreen,
  X as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  A as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  Ye as applyOptimisticAssignmentAction,
  Fe as buildAssignmentListQuery,
  Ge as buildAssignmentListURL,
  Ue as claimAssignment,
  et as createAssignmentQueueScreen,
  Qe as fetchAssignmentList,
  Je as getAssignmentQueueStyles,
  ut as initAssignmentQueueScreen,
  Oe as normalizeAssignmentActionResponse,
  Be as normalizeAssignmentListMeta,
  Ne as normalizeAssignmentListResponse,
  v as normalizeAssignmentListRow,
  C as presetToQueryState,
  Ve as releaseAssignment
};

//# sourceMappingURL=index.js.map
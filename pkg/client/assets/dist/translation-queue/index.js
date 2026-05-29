import { escapeAttribute as o, escapeHTML as d } from "../shared/html.js";
import { httpRequest as B, readHTTPError as te } from "../shared/transport/http-client.js";
import { extractStructuredError as se } from "../toast/error-helpers.js";
import { C as U } from "../chunks/translation-status-vocabulary-C8mdmsgA.js";
import { buildEndpointURL as ie, getStringSearchParam as ae, readLocationSearchParams as re, setNumberSearchParam as V, setSearchParam as f } from "../shared/query-state/url-state.js";
import { StatefulController as ne } from "../shared/stateful-controller.js";
import { asNumber as p, asRecord as u, asString as r } from "../shared/coercion.js";
import { B as oe, C as de, F as ce, I as le, L as A, N as ue, P as pe, R, S as H, V as S, _ as me, a as K, c as G, g as fe, u as m, v as ge, x as he, z as ve } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationShortDateTime as Y } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as be } from "../shared/record-normalization.js";
var D = class extends Error {
  constructor(e) {
    super(e.message), this.name = "AssignmentQueueRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}, _ = [
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
], z = [
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
function v(e) {
  const t = u(e);
  return {
    enabled: t.enabled === !0,
    reason: r(t.reason) || void 0,
    reason_code: r(t.reason_code) || void 0,
    permission: r(t.permission) || void 0
  };
}
function _e(e) {
  const t = u(e), s = r(t.last_rejection_reason), i = r(t.last_reviewer_id);
  if (!(!s && !i))
    return {
      last_rejection_reason: s || void 0,
      last_reviewer_id: i || void 0
    };
}
function ye(e) {
  const t = u(e), s = t.enabled === !0, i = p(t.warning_count), a = p(t.blocker_count), n = p(t.finding_count);
  if (!(!s && i <= 0 && a <= 0 && n <= 0))
    return {
      enabled: s,
      warning_count: i,
      blocker_count: a,
      finding_count: n
    };
}
function C(e) {
  switch (r(e)) {
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
      return r(e);
    default:
      return "open";
  }
}
function P(e, t) {
  const s = e.headers.get(t);
  return typeof s == "string" ? s.trim() : "";
}
function we(e) {
  const t = P(e, "x-request-id"), s = P(e, "x-correlation-id"), i = P(e, "x-trace-id") || s || void 0;
  return {
    requestId: t || void 0,
    traceId: i
  };
}
async function $e(e, t) {
  return typeof e.clone == "function" ? se(e.clone()) : {
    textCode: null,
    message: await te(e, t),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function F(e, t) {
  const s = await $e(e, t), i = we(e);
  return new D({
    message: s.message || `${t}: ${e.status}`,
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function ke(e) {
  const t = u(e), s = r(t.id), i = r(t.label);
  if (!s || !i) return null;
  const a = u(t.query);
  return {
    id: s,
    label: i,
    description: r(t.description) || void 0,
    review_state: r(t.review_state) || void 0,
    query: {
      status: r(a.status) || void 0,
      assignee_id: r(a.assignee_id) || void 0,
      reviewer_id: r(a.reviewer_id) || void 0,
      due_state: r(a.due_state) || void 0,
      locale: r(a.locale) || void 0,
      priority: r(a.priority) || void 0,
      family_id: r(a.family_id) || void 0,
      sort: r(a.sort) || void 0,
      order: r(a.order) || void 0
    }
  };
}
function W(e, t = _) {
  const s = (Array.isArray(e) ? e : []).map((i) => ke(i)).filter((i) => i !== null);
  return s.length ? s : t.map(y);
}
function y(e) {
  return {
    id: e.id,
    label: e.label,
    description: e.description,
    review_state: e.review_state,
    query: { ...e.query }
  };
}
function L(e) {
  return Array.from(new Set(e.map((t) => r(t)).filter(Boolean)));
}
function qe(e) {
  const t = u(e), s = Array.isArray(t.supported_sort_keys) ? t.supported_sort_keys.map((a) => r(a)).filter((a) => !!a) : [], i = u(t.default_sort);
  return {
    page: p(t.page) || 1,
    per_page: p(t.per_page) || 25,
    total: p(t.total),
    updated_at: r(t.updated_at) || void 0,
    supported_sort_keys: s.length ? s : [
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
      key: r(i.key) || "updated_at",
      order: r(i.order) || "desc"
    },
    saved_filter_presets: W(t.saved_filter_presets, _),
    saved_review_filter_presets: W(t.saved_review_filter_presets, z),
    default_review_filter_preset: r(t.default_review_filter_preset) || void 0,
    review_actor_id: r(t.review_actor_id) || void 0,
    review_aggregate_counts: be(t.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    })
  };
}
function Ae(e = {}) {
  const t = new URLSearchParams();
  return f(t, "status", e.status), f(t, "assignee_id", e.assigneeId), f(t, "reviewer_id", e.reviewerId), f(t, "due_state", e.dueState), f(t, "locale", e.locale), f(t, "priority", e.priority), f(t, "review_state", e.reviewState), f(t, "family_id", e.familyId), V(t, "page", e.page, { min: 1 }), V(t, "per_page", e.perPage, { min: 1 }), f(t, "sort", e.sort), f(t, "order", e.order), t.toString();
}
function Re(e, t = {}) {
  const s = Ae(t);
  return s ? ie(e, new URLSearchParams(s), { preserveAbsolute: !0 }) : e;
}
function M(e) {
  const t = u(e);
  return {
    id: r(t.id),
    family_id: r(t.family_id),
    entity_type: r(t.entity_type),
    source_record_id: r(t.source_record_id),
    target_record_id: r(t.target_record_id),
    source_locale: r(t.source_locale),
    target_locale: r(t.target_locale),
    work_scope: r(t.work_scope) || void 0,
    source_title: r(t.source_title),
    source_path: r(t.source_path),
    assignee_id: r(t.assignee_id),
    reviewer_id: r(t.reviewer_id),
    assignment_type: r(t.assignment_type),
    content_state: r(t.content_state),
    queue_state: C(t.queue_state),
    status: C(t.status),
    priority: r(t.priority) || "normal",
    due_state: r(t.due_state) || "none",
    due_date: r(t.due_date) || void 0,
    row_version: p(t.row_version || t.version),
    version: p(t.version || t.row_version),
    updated_at: r(t.updated_at),
    created_at: r(t.created_at),
    actions: {
      claim: v(u(t.actions).claim),
      release: v(u(t.actions).release)
    },
    review_actions: {
      submit_review: v(u(t.review_actions).submit_review),
      approve: v(u(t.review_actions).approve),
      reject: v(u(t.review_actions).reject),
      archive: v(u(t.review_actions).archive)
    },
    last_rejection_reason: r(t.last_rejection_reason) || void 0,
    review_feedback: _e(t.review_feedback),
    qa_summary: ye(t.qa_summary)
  };
}
function Se(e) {
  const t = u(e);
  return {
    data: (Array.isArray(t.data) ? t.data : []).map((s) => M(s)),
    meta: qe(t.meta)
  };
}
function xe(e) {
  const t = u(e), s = u(t.meta), i = u(t.data);
  return {
    data: {
      assignment_id: r(i.assignment_id),
      status: C(i.status),
      row_version: p(i.row_version),
      updated_at: r(i.updated_at),
      assignment: M(i.assignment)
    },
    meta: { idempotency_hit: s.idempotency_hit === !0 }
  };
}
async function Ie(e, t = {}) {
  const s = await B(Re(e, t), { method: "GET" });
  if (!s.ok) throw await F(s, "Failed to load assignments");
  return Se(await s.json());
}
async function O(e, t, s, i) {
  const a = { expected_version: i.expected_version };
  i.idempotency_key && (a.idempotency_key = i.idempotency_key), i.reason && (a.reason = i.reason);
  const n = await B(`${e}/${encodeURIComponent(t)}/actions/${s}`, {
    method: "POST",
    json: a
  });
  if (!n.ok) throw await F(n, `Failed to ${s} assignment`);
  return xe(await n.json());
}
function Ee(e, t, s) {
  return O(e, t, "claim", s);
}
function Pe(e, t, s) {
  return O(e, t, "release", s);
}
function x(e) {
  return {
    status: e.query.status,
    assigneeId: e.query.assignee_id,
    reviewerId: e.query.reviewer_id,
    dueState: e.query.due_state,
    locale: e.query.locale,
    priority: e.query.priority,
    reviewState: e.review_state,
    familyId: e.query.family_id,
    sort: e.query.sort,
    order: e.query.order,
    page: 1
  };
}
function X(e, t) {
  return `queue-${e}-${t.id}-${t.version}-${Date.now()}`;
}
function Le(e, t) {
  return `queue-${e}-${t.id}-${t.version}-${Date.now()}`;
}
function Te(e) {
  const t = r(e);
  if (!t) return null;
  const s = _.find((a) => a.id === t);
  if (s) return {
    kind: "standard",
    preset: s
  };
  const i = z.find((a) => a.id === t);
  return i ? {
    kind: "review",
    preset: i
  } : null;
}
function h(e) {
  return {
    ...e,
    actions: {
      claim: { ...e.actions.claim },
      release: { ...e.actions.release }
    },
    review_actions: {
      submit_review: { ...e.review_actions.submit_review },
      approve: { ...e.review_actions.approve },
      reject: { ...e.review_actions.reject },
      archive: { ...e.review_actions.archive }
    },
    review_feedback: e.review_feedback ? { ...e.review_feedback } : void 0,
    qa_summary: e.qa_summary ? { ...e.qa_summary } : void 0
  };
}
function T(e, t) {
  return {
    enabled: !1,
    permission: e,
    reason: t,
    reason_code: "INVALID_STATUS"
  };
}
function je(e, t) {
  const s = h(e);
  return t === "claim" ? (s.queue_state = "in_progress", s.status = "in_progress", s.actions.claim = T(e.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), s.actions.release = {
    enabled: !0,
    permission: e.actions.release.permission
  }, s.review_actions.submit_review = {
    enabled: !0,
    permission: e.review_actions.submit_review.permission
  }, s) : (s.assignment_type = "open_pool", s.queue_state = "open", s.status = "open", s.assignee_id = "", s.actions.claim = {
    enabled: !0,
    permission: e.actions.claim.permission
  }, s.actions.release = T(e.actions.release.permission, "assignment must be assigned or in progress before it can be released"), s.review_actions.submit_review = T(e.review_actions.submit_review.permission, "assignment must be in progress"), s);
}
function j(e, t) {
  return e instanceof D ? {
    kind: e.code === "VERSION_CONFLICT" ? "conflict" : "error",
    message: e.message || t,
    code: e.code,
    requestId: e.requestId,
    traceId: e.traceId
  } : e instanceof Error ? {
    kind: "error",
    message: e.message || t
  } : {
    kind: "error",
    message: t
  };
}
function Ce(e) {
  return r(e.queue_state || e.status);
}
function Be(e) {
  return e === "review" || e === "in_review";
}
function J(e) {
  return Be(Ce(e)) ? !0 : !!(e.review_actions.approve.enabled || e.review_actions.reject.enabled);
}
function Z(e) {
  return !!e.review_actions.archive.enabled;
}
var De = class extends ne {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.selectedRows = /* @__PURE__ */ new Map(), this.bulkActionPending = !1;
    const t = r(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const s = Te(t);
    if (s?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = s.preset.id, this.activeReviewState = s.preset.review_state || null, this.queryState = x(s.preset);
      return;
    }
    const i = s?.preset || _[1] || _[0];
    this.activePresetId = i?.id || "open", this.queryState = i ? x(i) : {
      sort: "updated_at",
      order: "desc",
      page: 1
    };
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
    return this.rows.map((e) => h(e));
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
    const s = Array.from(this.selectedRows.values());
    this.bulkActionPending = !0, this.feedback = null, this.render();
    try {
      const i = await this.executeBulkAction({
        action: e,
        assignments: s,
        reason: t?.reason,
        priority: t?.priority
      });
      for (const a of i.data.results) if (a.success && a.assignment) {
        const n = this.rows.findIndex((c) => c.id === a.assignmentId);
        n >= 0 && (this.rows[n] = h(a.assignment)), this.selectedRows.delete(a.assignmentId);
      }
      if (i.data.failed > 0) {
        const a = i.data.results.filter((n) => !n.success).map((n) => n.assignmentId).slice(0, 3);
        this.feedback = {
          kind: "error",
          message: `${i.data.succeeded} succeeded, ${i.data.failed} failed. Failed: ${a.join(", ")}${i.data.failed > 3 ? "..." : ""}`
        };
      } else this.feedback = {
        kind: "success",
        message: `${i.data.succeeded} assignment${i.data.succeeded !== 1 ? "s" : ""} updated.`
      };
    } catch (i) {
      this.feedback = j(i, `Bulk ${e} failed.`);
    } finally {
      this.bulkActionPending = !1, this.render();
    }
  }
  async executeBulkAction(e) {
    const t = await B(`${this.config.endpoint}/bulk/${e.action}`, {
      method: "POST",
      json: {
        assignments: e.assignments.map((n) => ({
          assignment_id: n.assignmentId,
          expected_version: n.expectedVersion
        })),
        reason: e.reason,
        priority: e.priority
      }
    });
    if (!t.ok) throw await F(t, `Bulk ${e.action} failed`);
    const s = u(await t.json()), i = u(s.data), a = Array.isArray(i.results) ? i.results : [];
    return {
      data: {
        requested: p(i.requested),
        succeeded: p(i.succeeded),
        failed: p(i.failed),
        results: a.map((n) => {
          const c = u(n);
          return {
            assignmentId: r(c.assignment_id),
            success: c.success === !0,
            error: r(c.error) || void 0,
            errorCode: r(c.error_code) || void 0,
            assignment: c.assignment ? M(c.assignment) : void 0
          };
        })
      },
      meta: { action: r(u(s.meta).action) }
    };
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await Ie(this.config.endpoint, this.queryState);
      this.response = e, this.rows = e.data.map((t) => h(t)), this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof D && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  async runInlineAction(e, t) {
    const s = this.rows.findIndex((l) => l.id === t);
    if (s < 0) return;
    const i = this.rows[s], a = i.actions[e];
    if (!a.enabled) {
      this.feedback = {
        kind: a.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: a.reason || `Cannot ${e} this assignment.`,
        code: a.reason_code || null
      }, this.render();
      return;
    }
    const n = h(i), c = `${e}:${t}`;
    this.pendingActions.add(c), this.feedback = null, this.rows[s] = je(i, e), this.render();
    try {
      const l = e === "claim" ? await Ee(this.config.endpoint, t, {
        expected_version: n.version,
        idempotency_key: X("claim", n)
      }) : await Pe(this.config.endpoint, t, {
        expected_version: n.version,
        idempotency_key: X("release", n)
      });
      this.rows[s] = h(l.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (l) {
      this.rows[s] = n, this.feedback = j(l, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(c), this.render();
    }
  }
  async runReviewAction(e, t) {
    const s = this.rows.findIndex((l) => l.id === t);
    if (s < 0) return;
    const i = this.rows[s], a = i.review_actions[e];
    if (!a?.enabled) {
      this.feedback = {
        kind: a?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: a?.reason || `Cannot ${e} this assignment.`,
        code: a?.reason_code || null
      }, this.render();
      return;
    }
    const n = {
      expected_version: i.version,
      idempotency_key: Le(e, i)
    };
    if (e === "reject") {
      const l = typeof window < "u" ? window.prompt("Reject reason") : "";
      if (!l || !l.trim()) {
        this.feedback = {
          kind: "error",
          message: "Reject reason is required.",
          code: "VALIDATION_ERROR"
        }, this.render();
        return;
      }
      n.reason = l.trim();
    }
    const c = `${e}:${t}`;
    this.pendingActions.add(c), this.feedback = null, this.render();
    try {
      const l = await O(this.config.endpoint, t, e, n);
      this.rows[s] = h(l.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (l) {
      this.feedback = j(l, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(c), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((s) => s.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = x(t), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((s) => s.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = x(t), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(y) : _.map(y);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(y) : z.map(y);
  }
  get visibleRows() {
    return this.rows;
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="${H}">Assignment Queue</p>
            <h1 class="${de}">${d(this.config.title)}</h1>
            <p class="${he} max-w-2xl">${d(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.visibleRows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="${m}" data-queue-refresh="true">Refresh</button>
          </div>
        </section>
        ${this.renderFeedback()}
        ${this.renderBulkActionBar()}
        ${this.renderReviewStateBar()}
        ${this.renderPresetBar()}
        ${this.renderFilters()}
        ${this.renderBody()}
      </div>
    `, this.attachEventListeners());
  }
  renderFeedback() {
    if (!this.feedback) return "";
    const e = this.feedback.kind === "success" ? "feedback-success" : this.feedback.kind === "conflict" ? "feedback-conflict" : "feedback-error", t = [
      this.feedback.code ? `Code ${d(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${d(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${d(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${o(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${d(this.feedback.message)}</strong>
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
            class="${m}"
            data-bulk-action="release"
            ${t ? "disabled" : ""}
            title="Release selected assignments back to the pool"
          >
            ${t ? "Processing…" : "Release"}
          </button>
          <button
            type="button"
            class="${m}"
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
            class="${m} queue-preset-button ${this.activePresetId === e.id ? "is-active" : ""}"
            data-preset-id="${o(e.id)}"
            role="tab"
            aria-selected="${this.activePresetId === e.id ? "true" : "false"}"
            title="${o(e.description || e.label)}"
          >
            ${d(e.label)}
          </button>
        `).join("")}
      </div>
    `;
  }
  renderReviewStateBar() {
    if (!this.savedReviewFilterPresets.length) return "";
    const e = this.response?.meta.review_aggregate_counts || {}, t = this.response?.meta.review_actor_id, s = !!t;
    return `
      <section class="assignment-review-presets" aria-label="Reviewer queue states">
        <div class="review-preset-copy">
          <p class="${H}">Reviewer states</p>
          <p class="review-preset-description">${d(t ? `Signed in as ${t}` : "Reviewer queue states are available when reviewer metadata is present.")}</p>
        </div>
        <div class="assignment-review-presets-grid">
          ${this.savedReviewFilterPresets.map((i) => `
            <button
              type="button"
              class="review-preset-button ${this.activeReviewPresetId === i.id ? "is-active" : ""}"
              data-review-preset-id="${o(i.id)}"
              title="${o(s ? i.description || i.label : "Reviewer metadata is required to use this preset.")}"
              ${s ? "" : 'disabled aria-disabled="true"'}
            >
              <span>${d(i.label)}</span>
              <strong>${e[i.id] ?? 0}</strong>
            </button>
          `).join("")}
        </div>
      </section>
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
    ], a = ["", ...L(e.map((g) => g.target_locale))], n = ["", ...L(e.map((g) => g.assignee_id))], c = ["", ...L(e.map((g) => g.reviewer_id))], l = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
      "updated_at",
      "due_date",
      "priority",
      "status",
      "locale"
    ];
    return `
      <form class="assignment-queue-filters" data-queue-filters="true">
        ${this.renderSelect("status", "Status", t, this.queryState.status || "")}
        ${this.renderSelect("due_state", "Due State", ["", ...s], this.queryState.dueState || "")}
        ${this.renderSelect("priority", "Priority", i, this.queryState.priority || "")}
        ${this.renderSelect("locale", "Locale", a, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", n, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", c, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", l, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, t, s, i) {
    const a = [...s];
    return i && !a.includes(i) && a.push(i), `
      <label class="queue-filter-field">
        <span>${d(t)}</span>
        <select data-filter-name="${o(e)}">
          ${a.map((n) => `
            <option value="${o(n)}" ${n === i ? "selected" : ""}>
              ${d(n ? b(n) : `All ${t.toLowerCase()}`)}
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
  renderErrorState(e, t) {
    return `
      <div class="${fe} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${ge}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${me} mt-2">${d(t)}</p>
        <div class="mt-4">
          <button type="button" class="${m}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), s = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), a = this.pendingActions.has(`reject:${e.id}`), n = this.pendingActions.has(`archive:${e.id}`), c = t || !e.actions.claim.enabled, l = s || !e.actions.release.enabled, g = J(e), I = Z(e), w = !!e.assignee_id, $ = !!e.reviewer_id, k = !!e.due_date, q = k || e.due_state === "overdue" || e.due_state === "due_soon", E = [];
    e.entity_type && E.push(e.entity_type), e.family_id && e.family_id !== e.source_path && E.push(e.family_id);
    const N = E.join(" · "), Q = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row ${Q ? "is-selected" : ""}" tabindex="0" data-assignment-id="${o(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${o(ee(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${o(e.id)}"
            ${Q ? "checked" : ""}
            aria-label="Select assignment ${o(e.source_title || e.id)}"
          />
        </td>
        <td>
          <div class="queue-content-cell">
            <strong class="queue-content-title">${d(e.source_title || e.source_path || e.id)}</strong>
            ${e.source_path && e.source_title ? `<span class="queue-content-path">${d(e.source_path)}</span>` : ""}
            ${N ? `<span class="queue-content-meta">${d(N)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-locale-cell">
            <span class="locale-code">${d(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${d(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td>
          <div class="queue-status-cell">
            ${U(e.queue_state, {
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
            ${w ? `<span class="queue-owner-value">${d(e.assignee_id)}</span>` : '<span class="queue-owner-empty">Unassigned</span>'}
            ${$ ? `<span class="queue-reviewer-value">${d(e.reviewer_id)}</span>` : ""}
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${d(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            ${q ? `<span class="due-pill due-${o(e.due_state)}">${d(b(e.due_state))}</span>` : ""}
            ${k ? `<span class="queue-due-date">${d(Y(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${o(e.priority)}" aria-label="${o("Priority: " + b(e.priority))}"></span>
            <span class="priority-label">${d(b(e.priority))}</span>
          </div>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${m}"
                data-action="claim"
                data-assignment-id="${o(e.id)}"
                ${c ? "disabled" : ""}
                aria-disabled="${c ? "true" : "false"}"
                title="${o(t ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${t ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${m}"
                data-action="release"
                data-assignment-id="${o(e.id)}"
                ${l ? "disabled" : ""}
                aria-disabled="${l ? "true" : "false"}"
                title="${o(s ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${s ? "Releasing…" : "Release"}
              </button>
            </div>
            ${g ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${G}"
                  data-action="approve"
                  data-assignment-id="${o(e.id)}"
                  ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${i || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${o(i ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${i ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${K}"
                  data-action="reject"
                  data-assignment-id="${o(e.id)}"
                  ${a || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${a || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${o(a ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${a ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${I ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${m}"
                  data-action="archive"
                  data-assignment-id="${o(e.id)}"
                  ${n || !e.review_actions.archive.enabled ? "disabled" : ""}
                  aria-disabled="${n || !e.review_actions.archive.enabled ? "true" : "false"}"
                  title="${o(n ? "Archiving assignment…" : e.review_actions.archive.reason || "Archive assignment")}"
                >
                  ${n ? "Archiving…" : "Archive"}
                </button>
              </div>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }
  renderMobileCard(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), s = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), a = this.pendingActions.has(`reject:${e.id}`), n = this.pendingActions.has(`archive:${e.id}`), c = t || !e.actions.claim.enabled, l = s || !e.actions.release.enabled, g = J(e), I = Z(e), w = !!e.assignee_id, $ = !!e.due_date, k = $ || e.due_state === "overdue" || e.due_state === "due_soon", q = this.isRowSelected(e.id);
    return `
      <article
        class="${ue} ${q ? "is-selected" : ""}"
        data-assignment-id="${o(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${o(ee(e))}"
      >
        <div class="${le}">
          <div class="mobile-card-select">
            <input
              type="checkbox"
              class="queue-row-select"
              data-select-row="${o(e.id)}"
              ${q ? "checked" : ""}
              aria-label="Select assignment ${o(e.source_title || e.id)}"
            />
          </div>
          <div class="mobile-card-title-group">
            <h3 class="${oe}">${d(e.source_title || e.source_path || e.id)}</h3>
            <p class="${ve}">${d(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${U(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${ce}">
          <div class="${R}">
            <span class="${A}">Locale</span>
            <span class="${S}">
              <span class="locale-code">${d(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${d(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${R}">
            <span class="${A}">Assignee</span>
            <span class="${S} ${w ? "" : "text-gray-400"}">${d(w ? e.assignee_id : "Unassigned")}</span>
          </div>
          <div class="${R}">
            <span class="${A}">Due</span>
            <span class="${S}">
              ${k ? `<span class="due-pill due-${o(e.due_state)}">${d(b(e.due_state))}</span>` : ""}
              ${$ ? `<span class="text-gray-600 ml-1">${d(Y(e.due_date, ""))}</span>` : '<span class="text-gray-400">—</span>'}
            </span>
          </div>
          <div class="${R}">
            <span class="${A}">Priority</span>
            <span class="${S}">
              <span class="priority-indicator priority-${o(e.priority)}"></span>
              <span class="priority-label">${d(b(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${pe}">
          <button
            type="button"
            class="${m} flex-1"
            data-action="claim"
            data-assignment-id="${o(e.id)}"
            ${c ? "disabled" : ""}
          >
            ${t ? "Claiming…" : "Claim"}
          </button>
          <button
            type="button"
            class="${m} flex-1"
            data-action="release"
            data-assignment-id="${o(e.id)}"
            ${l ? "disabled" : ""}
          >
            ${s ? "Releasing…" : "Release"}
          </button>
          ${g ? `
            <button
              type="button"
              class="${G} flex-1"
              data-action="approve"
              data-assignment-id="${o(e.id)}"
              ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
            >
              ${i ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              class="${K} flex-1"
              data-action="reject"
              data-assignment-id="${o(e.id)}"
              ${a || !e.review_actions.reject.enabled ? "disabled" : ""}
            >
              ${a ? "Rejecting…" : "Reject"}
            </button>
          ` : ""}
          ${I ? `
            <button
              type="button"
              class="${m}"
              data-action="archive"
              data-assignment-id="${o(e.id)}"
              ${n || !e.review_actions.archive.enabled ? "disabled" : ""}
            >
              ${n ? "Archiving…" : "Archive"}
            </button>
          ` : ""}
        </div>
      </article>
    `;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-preset-id]").forEach((s) => {
      s.addEventListener("click", () => {
        const i = s.dataset.presetId;
        i && this.setActivePreset(i);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((s) => {
      s.addEventListener("click", () => {
        const i = s.dataset.reviewPresetId;
        i && this.setActiveReviewPreset(i);
      });
    }), this.container.querySelectorAll("[data-filter-name]").forEach((s) => {
      s.addEventListener("change", () => {
        const i = s.dataset.filterName;
        if (!i) return;
        const a = s.value.trim();
        switch (i) {
          case "status":
            this.updateFilter({ status: a || void 0 });
            break;
          case "due_state":
            this.updateFilter({ dueState: a || void 0 });
            break;
          case "priority":
            this.updateFilter({ priority: a || void 0 });
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
          case "sort":
            this.updateFilter({ sort: a || void 0 });
            break;
          case "order":
            this.updateFilter({ order: a || void 0 });
            break;
        }
      });
    }), this.container.querySelectorAll("[data-queue-refresh]").forEach((s) => {
      s.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-action]").forEach((s) => {
      s.addEventListener("click", () => {
        const i = s.dataset.action, a = s.dataset.assignmentId;
        if ((i === "claim" || i === "release") && a) {
          this.runInlineAction(i, a);
          return;
        }
        (i === "approve" || i === "reject" || i === "archive") && a && this.runReviewAction(i, a);
      });
    });
    const e = this.container.querySelector("[data-select-all]");
    e && e.addEventListener("change", () => {
      e.checked ? this.selectAllPage() : this.clearSelection();
    }), this.container.querySelectorAll("[data-select-row]").forEach((s) => {
      s.addEventListener("change", (i) => {
        i.stopPropagation();
        const a = s.dataset.selectRow;
        a && this.toggleRowSelection(a);
      }), s.addEventListener("click", (i) => {
        i.stopPropagation();
      });
    });
    const t = this.container.querySelector("[data-bulk-clear]");
    t && t.addEventListener("click", () => {
      this.clearSelection();
    }), this.container.querySelectorAll("[data-bulk-action]").forEach((s) => {
      s.addEventListener("click", () => {
        const i = s.dataset.bulkAction;
        (i === "release" || i === "archive") && this.runBulkAction(i);
      });
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
        const a = t.dataset.assignmentNavGroup;
        if (!a) return;
        s.preventDefault();
        const n = Array.from(this.container?.querySelectorAll(`[data-assignment-nav-group="${a}"]`) || []), c = n.indexOf(t);
        c < 0 || n[i === "ArrowDown" ? Math.min(c + 1, n.length - 1) : Math.max(c - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
function ee(e) {
  return [
    e.source_title || e.source_path || e.id,
    `${e.source_locale.toUpperCase()} to ${e.target_locale.toUpperCase()}`,
    e.queue_state,
    e.due_state
  ].filter(Boolean).join(", ");
}
function b(e) {
  return e ? e.replace(/_/g, " ").split(" ").filter(Boolean).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ") : "";
}
function ze() {
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

    @media (max-width: 900px) {
      .assignment-queue-screen {
        padding: 1rem;
      }

      .assignment-queue-table {
        min-width: 760px;
      }
    }
  `;
}
function Fe() {
  if (typeof document > "u") return;
  const e = "assignment-queue-styles";
  if (document.getElementById(e)) return;
  const t = document.createElement("style");
  t.id = e, t.textContent = ze(), document.head.appendChild(t);
}
function Me(e, t) {
  Fe();
  const s = new De(t);
  return s.mount(e), s;
}
function Xe(e) {
  const t = e.dataset.endpoint || e.dataset.assignmentListEndpoint || "";
  if (!t) return null;
  const s = typeof window < "u" ? re(window.location) : null;
  return Me(e, {
    endpoint: t,
    editorBasePath: e.dataset.editorBasePath || "",
    title: e.dataset.title,
    description: e.dataset.description,
    initialPresetId: e.dataset.initialPresetId || ae(s ?? new URLSearchParams(), "preset") || ""
  });
}
export {
  D as AssignmentQueueRequestError,
  De as AssignmentQueueScreen,
  z as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  _ as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  je as applyOptimisticAssignmentAction,
  Ae as buildAssignmentListQuery,
  Re as buildAssignmentListURL,
  Ee as claimAssignment,
  Me as createAssignmentQueueScreen,
  Ie as fetchAssignmentList,
  ze as getAssignmentQueueStyles,
  Xe as initAssignmentQueueScreen,
  xe as normalizeAssignmentActionResponse,
  qe as normalizeAssignmentListMeta,
  Se as normalizeAssignmentListResponse,
  M as normalizeAssignmentListRow,
  x as presetToQueryState,
  Pe as releaseAssignment
};

//# sourceMappingURL=index.js.map
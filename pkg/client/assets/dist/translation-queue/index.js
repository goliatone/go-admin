import { escapeAttribute as o, escapeHTML as d } from "../shared/html.js";
import { httpRequest as W, readHTTPError as ee } from "../shared/transport/http-client.js";
import { extractStructuredError as te } from "../toast/error-helpers.js";
import { C as F } from "../chunks/translation-status-vocabulary-C8mdmsgA.js";
import { buildEndpointURL as se, getStringSearchParam as ie, readLocationSearchParams as ae, setNumberSearchParam as z, setSearchParam as p } from "../shared/query-state/url-state.js";
import { StatefulController as re } from "../shared/stateful-controller.js";
import { asNumber as f, asRecord as l, asString as a } from "../shared/coercion.js";
import { B as ne, C as oe, F as de, I as ce, L as k, N as le, P as ue, R as A, S as M, V as R, _ as pe, a as O, c as N, g as me, u as g, v as ge, x as fe, z as ve } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationShortDateTime as Q } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as he } from "../shared/record-normalization.js";
var j = class extends Error {
  constructor(e) {
    super(e.message), this.name = "AssignmentQueueRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}, b = [
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
], C = [
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
  const t = l(e);
  return {
    enabled: t.enabled === !0,
    reason: a(t.reason) || void 0,
    reason_code: a(t.reason_code) || void 0,
    permission: a(t.permission) || void 0
  };
}
function _e(e) {
  const t = l(e), s = a(t.last_rejection_reason), i = a(t.last_reviewer_id);
  if (!(!s && !i))
    return {
      last_rejection_reason: s || void 0,
      last_reviewer_id: i || void 0
    };
}
function be(e) {
  const t = l(e), s = t.enabled === !0, i = f(t.warning_count), r = f(t.blocker_count), n = f(t.finding_count);
  if (!(!s && i <= 0 && r <= 0 && n <= 0))
    return {
      enabled: s,
      warning_count: i,
      blocker_count: r,
      finding_count: n
    };
}
function T(e) {
  switch (a(e)) {
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
      return a(e);
    default:
      return "open";
  }
}
function E(e, t) {
  const s = e.headers.get(t);
  return typeof s == "string" ? s.trim() : "";
}
function ye(e) {
  const t = E(e, "x-request-id"), s = E(e, "x-correlation-id"), i = E(e, "x-trace-id") || s || void 0;
  return {
    requestId: t || void 0,
    traceId: i
  };
}
async function we(e, t) {
  return typeof e.clone == "function" ? te(e.clone()) : {
    textCode: null,
    message: await ee(e, t),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function X(e, t) {
  const s = await we(e, t), i = ye(e);
  return new j({
    message: s.message || `${t}: ${e.status}`,
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function $e(e) {
  const t = l(e), s = a(t.id), i = a(t.label);
  if (!s || !i) return null;
  const r = l(t.query);
  return {
    id: s,
    label: i,
    description: a(t.description) || void 0,
    review_state: a(t.review_state) || void 0,
    query: {
      status: a(r.status) || void 0,
      assignee_id: a(r.assignee_id) || void 0,
      reviewer_id: a(r.reviewer_id) || void 0,
      due_state: a(r.due_state) || void 0,
      locale: a(r.locale) || void 0,
      priority: a(r.priority) || void 0,
      family_id: a(r.family_id) || void 0,
      sort: a(r.sort) || void 0,
      order: a(r.order) || void 0
    }
  };
}
function U(e, t = b) {
  const s = (Array.isArray(e) ? e : []).map((i) => $e(i)).filter((i) => i !== null);
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
function P(e) {
  return Array.from(new Set(e.map((t) => a(t)).filter(Boolean)));
}
function qe(e) {
  const t = l(e), s = Array.isArray(t.supported_sort_keys) ? t.supported_sort_keys.map((r) => a(r)).filter((r) => !!r) : [], i = l(t.default_sort);
  return {
    page: f(t.page) || 1,
    per_page: f(t.per_page) || 25,
    total: f(t.total),
    updated_at: a(t.updated_at) || void 0,
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
      key: a(i.key) || "updated_at",
      order: a(i.order) || "desc"
    },
    saved_filter_presets: U(t.saved_filter_presets, b),
    saved_review_filter_presets: U(t.saved_review_filter_presets, C),
    default_review_filter_preset: a(t.default_review_filter_preset) || void 0,
    review_actor_id: a(t.review_actor_id) || void 0,
    review_aggregate_counts: he(t.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    })
  };
}
function ke(e = {}) {
  const t = new URLSearchParams();
  return p(t, "status", e.status), p(t, "assignee_id", e.assigneeId), p(t, "reviewer_id", e.reviewerId), p(t, "due_state", e.dueState), p(t, "locale", e.locale), p(t, "priority", e.priority), p(t, "review_state", e.reviewState), p(t, "family_id", e.familyId), z(t, "page", e.page, { min: 1 }), z(t, "per_page", e.perPage, { min: 1 }), p(t, "sort", e.sort), p(t, "order", e.order), t.toString();
}
function Ae(e, t = {}) {
  const s = ke(t);
  return s ? se(e, new URLSearchParams(s), { preserveAbsolute: !0 }) : e;
}
function J(e) {
  const t = l(e);
  return {
    id: a(t.id),
    family_id: a(t.family_id),
    entity_type: a(t.entity_type),
    source_record_id: a(t.source_record_id),
    target_record_id: a(t.target_record_id),
    source_locale: a(t.source_locale),
    target_locale: a(t.target_locale),
    work_scope: a(t.work_scope) || void 0,
    source_title: a(t.source_title),
    source_path: a(t.source_path),
    assignee_id: a(t.assignee_id),
    reviewer_id: a(t.reviewer_id),
    assignment_type: a(t.assignment_type),
    content_state: a(t.content_state),
    queue_state: T(t.queue_state),
    status: T(t.status),
    priority: a(t.priority) || "normal",
    due_state: a(t.due_state) || "none",
    due_date: a(t.due_date) || void 0,
    row_version: f(t.row_version || t.version),
    version: f(t.version || t.row_version),
    updated_at: a(t.updated_at),
    created_at: a(t.created_at),
    actions: {
      claim: v(l(t.actions).claim),
      release: v(l(t.actions).release)
    },
    review_actions: {
      submit_review: v(l(t.review_actions).submit_review),
      approve: v(l(t.review_actions).approve),
      reject: v(l(t.review_actions).reject),
      archive: v(l(t.review_actions).archive)
    },
    last_rejection_reason: a(t.last_rejection_reason) || void 0,
    review_feedback: _e(t.review_feedback),
    qa_summary: be(t.qa_summary)
  };
}
function Re(e) {
  const t = l(e);
  return {
    data: (Array.isArray(t.data) ? t.data : []).map((s) => J(s)),
    meta: qe(t.meta)
  };
}
function Se(e) {
  const t = l(e), s = l(t.meta), i = l(t.data);
  return {
    data: {
      assignment_id: a(i.assignment_id),
      status: T(i.status),
      row_version: f(i.row_version),
      updated_at: a(i.updated_at),
      assignment: J(i.assignment)
    },
    meta: { idempotency_hit: s.idempotency_hit === !0 }
  };
}
async function xe(e, t = {}) {
  const s = await W(Ae(e, t), { method: "GET" });
  if (!s.ok) throw await X(s, "Failed to load assignments");
  return Re(await s.json());
}
async function D(e, t, s, i) {
  const r = { expected_version: i.expected_version };
  i.idempotency_key && (r.idempotency_key = i.idempotency_key), i.reason && (r.reason = i.reason);
  const n = await W(`${e}/${encodeURIComponent(t)}/actions/${s}`, {
    method: "POST",
    json: r
  });
  if (!n.ok) throw await X(n, `Failed to ${s} assignment`);
  return Se(await n.json());
}
function Ie(e, t, s) {
  return D(e, t, "claim", s);
}
function Ee(e, t, s) {
  return D(e, t, "release", s);
}
function S(e) {
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
function H(e, t) {
  return `queue-${e}-${t.id}-${t.version}-${Date.now()}`;
}
function Pe(e, t) {
  return `queue-${e}-${t.id}-${t.version}-${Date.now()}`;
}
function Le(e) {
  const t = a(e);
  if (!t) return null;
  const s = b.find((r) => r.id === t);
  if (s) return {
    kind: "standard",
    preset: s
  };
  const i = C.find((r) => r.id === t);
  return i ? {
    kind: "review",
    preset: i
  } : null;
}
function _(e) {
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
function L(e, t) {
  return {
    enabled: !1,
    permission: e,
    reason: t,
    reason_code: "INVALID_STATUS"
  };
}
function Te(e, t) {
  const s = _(e);
  return t === "claim" ? (s.queue_state = "in_progress", s.status = "in_progress", s.actions.claim = L(e.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), s.actions.release = {
    enabled: !0,
    permission: e.actions.release.permission
  }, s.review_actions.submit_review = {
    enabled: !0,
    permission: e.review_actions.submit_review.permission
  }, s) : (s.assignment_type = "open_pool", s.queue_state = "open", s.status = "open", s.assignee_id = "", s.actions.claim = {
    enabled: !0,
    permission: e.actions.claim.permission
  }, s.actions.release = L(e.actions.release.permission, "assignment must be assigned or in progress before it can be released"), s.review_actions.submit_review = L(e.review_actions.submit_review.permission, "assignment must be in progress"), s);
}
function V(e, t) {
  return e instanceof j ? {
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
function je(e) {
  return a(e.queue_state || e.status);
}
function Ce(e) {
  return e === "review" || e === "in_review";
}
function K(e) {
  return Ce(je(e)) ? !0 : !!(e.review_actions.approve.enabled || e.review_actions.reject.enabled);
}
function G(e) {
  return !!e.review_actions.archive.enabled;
}
var De = class extends re {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set();
    const t = a(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const s = Le(t);
    if (s?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = s.preset.id, this.activeReviewState = s.preset.review_state || null, this.queryState = S(s.preset);
      return;
    }
    const i = s?.preset || b[1] || b[0];
    this.activePresetId = i?.id || "open", this.queryState = i ? S(i) : {
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
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await xe(this.config.endpoint, this.queryState);
      this.response = e, this.rows = e.data.map((t) => _(t)), this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof j && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  async runInlineAction(e, t) {
    const s = this.rows.findIndex((c) => c.id === t);
    if (s < 0) return;
    const i = this.rows[s], r = i.actions[e];
    if (!r.enabled) {
      this.feedback = {
        kind: r.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: r.reason || `Cannot ${e} this assignment.`,
        code: r.reason_code || null
      }, this.render();
      return;
    }
    const n = _(i), u = `${e}:${t}`;
    this.pendingActions.add(u), this.feedback = null, this.rows[s] = Te(i, e), this.render();
    try {
      const c = e === "claim" ? await Ie(this.config.endpoint, t, {
        expected_version: n.version,
        idempotency_key: H("claim", n)
      }) : await Ee(this.config.endpoint, t, {
        expected_version: n.version,
        idempotency_key: H("release", n)
      });
      this.rows[s] = _(c.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (c) {
      this.rows[s] = n, this.feedback = V(c, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(u), this.render();
    }
  }
  async runReviewAction(e, t) {
    const s = this.rows.findIndex((c) => c.id === t);
    if (s < 0) return;
    const i = this.rows[s], r = i.review_actions[e];
    if (!r?.enabled) {
      this.feedback = {
        kind: r?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: r?.reason || `Cannot ${e} this assignment.`,
        code: r?.reason_code || null
      }, this.render();
      return;
    }
    const n = {
      expected_version: i.version,
      idempotency_key: Pe(e, i)
    };
    if (e === "reject") {
      const c = typeof window < "u" ? window.prompt("Reject reason") : "";
      if (!c || !c.trim()) {
        this.feedback = {
          kind: "error",
          message: "Reject reason is required.",
          code: "VALIDATION_ERROR"
        }, this.render();
        return;
      }
      n.reason = c.trim();
    }
    const u = `${e}:${t}`;
    this.pendingActions.add(u), this.feedback = null, this.render();
    try {
      const c = await D(this.config.endpoint, t, e, n);
      this.rows[s] = _(c.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (c) {
      this.feedback = V(c, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(u), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((s) => s.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = S(t), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((s) => s.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = S(t), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(y) : b.map(y);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(y) : C.map(y);
  }
  get visibleRows() {
    return this.rows;
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="${M}">Assignment Queue</p>
            <h1 class="${oe}">${d(this.config.title)}</h1>
            <p class="${fe} max-w-2xl">${d(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.visibleRows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="${g}" data-queue-refresh="true">Refresh</button>
          </div>
        </section>
        ${this.renderFeedback()}
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
  renderPresetBar() {
    return `
      <div class="assignment-queue-presets" role="tablist" aria-label="Saved queue filters">
        ${this.savedFilterPresets.map((e) => `
          <button
            type="button"
            class="${g} queue-preset-button ${this.activePresetId === e.id ? "is-active" : ""}"
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
          <p class="${M}">Reviewer states</p>
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
    ], r = ["", ...P(e.map((m) => m.target_locale))], n = ["", ...P(e.map((m) => m.assignee_id))], u = ["", ...P(e.map((m) => m.reviewer_id))], c = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
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
        ${this.renderSelect("locale", "Locale", r, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", n, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", u, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", c, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, t, s, i) {
    const r = [...s];
    return i && !r.includes(i) && r.push(i), `
      <label class="queue-filter-field">
        <span>${d(t)}</span>
        <select data-filter-name="${o(e)}">
          ${r.map((n) => `
            <option value="${o(n)}" ${n === i ? "selected" : ""}>
              ${d(n ? h(n) : `All ${t.toLowerCase()}`)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }
  renderBody() {
    const e = this.visibleRows;
    return this.state === "loading" && !this.rows.length ? '<div class="assignment-queue-state" data-queue-state="loading">Loading queue…</div>' : this.state === "error" && !this.rows.length ? this.renderErrorState("error", this.error?.message || "Failed to load queue assignments.") : this.state === "conflict" && !this.rows.length ? this.renderErrorState("conflict", this.error?.message || "The queue response is stale. Refresh and try again.") : e.length ? `
      <!-- Mobile Card View (visible on small screens) -->
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true">
        ${e.map((t) => this.renderMobileCard(t)).join("")}
      </div>
      <!-- Desktop Table View (hidden on small screens) -->
      <div class="assignment-queue-table-wrap hidden sm:block">
        <table class="assignment-queue-table" aria-label="Translation assignment queue">
          <thead>
            <tr>
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
            ${e.map((t) => this.renderRow(t)).join("")}
          </tbody>
        </table>
      </div>
    ` : '<div class="assignment-queue-state" data-queue-state="empty">No assignments match the current filters.</div>';
  }
  renderErrorState(e, t) {
    return `
      <div class="${me} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${ge}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${pe} mt-2">${d(t)}</p>
        <div class="mt-4">
          <button type="button" class="${g}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), s = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), r = this.pendingActions.has(`reject:${e.id}`), n = this.pendingActions.has(`archive:${e.id}`), u = t || !e.actions.claim.enabled, c = s || !e.actions.release.enabled, m = K(e), x = G(e), w = !!e.assignee_id, $ = !!e.reviewer_id, q = !!e.due_date, Z = q || e.due_state === "overdue" || e.due_state === "due_soon", I = [];
    e.entity_type && I.push(e.entity_type), e.family_id && e.family_id !== e.source_path && I.push(e.family_id);
    const B = I.join(" · ");
    return `
      <tr class="assignment-queue-row" tabindex="0" data-assignment-id="${o(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${o(Y(e))}">
        <td>
          <div class="queue-content-cell">
            <strong class="queue-content-title">${d(e.source_title || e.source_path || e.id)}</strong>
            ${e.source_path && e.source_title ? `<span class="queue-content-path">${d(e.source_path)}</span>` : ""}
            ${B ? `<span class="queue-content-meta">${d(B)}</span>` : ""}
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
            ${F(e.queue_state, {
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
            ${Z ? `<span class="due-pill due-${o(e.due_state)}">${d(h(e.due_state))}</span>` : ""}
            ${q ? `<span class="queue-due-date">${d(Q(e.due_date, ""))}</span>` : '<span class="queue-due-empty">—</span>'}
          </div>
        </td>
        <td>
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${o(e.priority)}" aria-label="${o("Priority: " + h(e.priority))}"></span>
            <span class="priority-label">${d(h(e.priority))}</span>
          </div>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${g}"
                data-action="claim"
                data-assignment-id="${o(e.id)}"
                ${u ? "disabled" : ""}
                aria-disabled="${u ? "true" : "false"}"
                title="${o(t ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${t ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${g}"
                data-action="release"
                data-assignment-id="${o(e.id)}"
                ${c ? "disabled" : ""}
                aria-disabled="${c ? "true" : "false"}"
                title="${o(s ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${s ? "Releasing…" : "Release"}
              </button>
            </div>
            ${m ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${N}"
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
                  class="${O}"
                  data-action="reject"
                  data-assignment-id="${o(e.id)}"
                  ${r || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${r || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${o(r ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${r ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${x ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${g}"
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
    const t = this.pendingActions.has(`claim:${e.id}`), s = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), r = this.pendingActions.has(`reject:${e.id}`), n = this.pendingActions.has(`archive:${e.id}`), u = t || !e.actions.claim.enabled, c = s || !e.actions.release.enabled, m = K(e), x = G(e), w = !!e.assignee_id, $ = !!e.due_date, q = $ || e.due_state === "overdue" || e.due_state === "due_soon";
    return `
      <article
        class="${le}"
        data-assignment-id="${o(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${o(Y(e))}"
      >
        <div class="${ce}">
          <div>
            <h3 class="${ne}">${d(e.source_title || e.source_path || e.id)}</h3>
            <p class="${ve}">${d(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${F(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${de}">
          <div class="${A}">
            <span class="${k}">Locale</span>
            <span class="${R}">
              <span class="locale-code">${d(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${d(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${A}">
            <span class="${k}">Assignee</span>
            <span class="${R} ${w ? "" : "text-gray-400"}">${d(w ? e.assignee_id : "Unassigned")}</span>
          </div>
          <div class="${A}">
            <span class="${k}">Due</span>
            <span class="${R}">
              ${q ? `<span class="due-pill due-${o(e.due_state)}">${d(h(e.due_state))}</span>` : ""}
              ${$ ? `<span class="text-gray-600 ml-1">${d(Q(e.due_date, ""))}</span>` : '<span class="text-gray-400">—</span>'}
            </span>
          </div>
          <div class="${A}">
            <span class="${k}">Priority</span>
            <span class="${R}">
              <span class="priority-indicator priority-${o(e.priority)}"></span>
              <span class="priority-label">${d(h(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${ue}">
          <button
            type="button"
            class="${g} flex-1"
            data-action="claim"
            data-assignment-id="${o(e.id)}"
            ${u ? "disabled" : ""}
          >
            ${t ? "Claiming…" : "Claim"}
          </button>
          <button
            type="button"
            class="${g} flex-1"
            data-action="release"
            data-assignment-id="${o(e.id)}"
            ${c ? "disabled" : ""}
          >
            ${s ? "Releasing…" : "Release"}
          </button>
          ${m ? `
            <button
              type="button"
              class="${N} flex-1"
              data-action="approve"
              data-assignment-id="${o(e.id)}"
              ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
            >
              ${i ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              class="${O} flex-1"
              data-action="reject"
              data-assignment-id="${o(e.id)}"
              ${r || !e.review_actions.reject.enabled ? "disabled" : ""}
            >
              ${r ? "Rejecting…" : "Reject"}
            </button>
          ` : ""}
          ${x ? `
            <button
              type="button"
              class="${g}"
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
    this.container && (this.container.querySelectorAll("[data-preset-id]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.presetId;
        t && this.setActivePreset(t);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.reviewPresetId;
        t && this.setActiveReviewPreset(t);
      });
    }), this.container.querySelectorAll("[data-filter-name]").forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.dataset.filterName;
        if (!t) return;
        const s = e.value.trim();
        switch (t) {
          case "status":
            this.updateFilter({ status: s || void 0 });
            break;
          case "due_state":
            this.updateFilter({ dueState: s || void 0 });
            break;
          case "priority":
            this.updateFilter({ priority: s || void 0 });
            break;
          case "locale":
            this.updateFilter({ locale: s || void 0 });
            break;
          case "assignee_id":
            this.updateFilter({ assigneeId: s || void 0 });
            break;
          case "reviewer_id":
            this.updateFilter({ reviewerId: s || void 0 });
            break;
          case "sort":
            this.updateFilter({ sort: s || void 0 });
            break;
          case "order":
            this.updateFilter({ order: s || void 0 });
            break;
        }
      });
    }), this.container.querySelectorAll("[data-queue-refresh]").forEach((e) => {
      e.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-action]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.action, s = e.dataset.assignmentId;
        if ((t === "claim" || t === "release") && s) {
          this.runInlineAction(t, s);
          return;
        }
        (t === "approve" || t === "reject" || t === "archive") && s && this.runReviewAction(t, s);
      });
    }), this.attachAssignmentNavigationTargets("[data-assignment-row]"), this.attachAssignmentNavigationTargets("[data-assignment-card]"));
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
        const r = t.dataset.assignmentNavGroup;
        if (!r) return;
        s.preventDefault();
        const n = Array.from(this.container?.querySelectorAll(`[data-assignment-nav-group="${r}"]`) || []), u = n.indexOf(t);
        u < 0 || n[i === "ArrowDown" ? Math.min(u + 1, n.length - 1) : Math.max(u - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
function Y(e) {
  return [
    e.source_title || e.source_path || e.id,
    `${e.source_locale.toUpperCase()} to ${e.target_locale.toUpperCase()}`,
    e.queue_state,
    e.due_state
  ].filter(Boolean).join(", ");
}
function h(e) {
  return e ? e.replace(/_/g, " ").split(" ").filter(Boolean).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ") : "";
}
function Be() {
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
  t.id = e, t.textContent = Be(), document.head.appendChild(t);
}
function ze(e, t) {
  Fe();
  const s = new De(t);
  return s.mount(e), s;
}
function We(e) {
  const t = e.dataset.endpoint || e.dataset.assignmentListEndpoint || "";
  if (!t) return null;
  const s = typeof window < "u" ? ae(window.location) : null;
  return ze(e, {
    endpoint: t,
    editorBasePath: e.dataset.editorBasePath || "",
    title: e.dataset.title,
    description: e.dataset.description,
    initialPresetId: e.dataset.initialPresetId || ie(s ?? new URLSearchParams(), "preset") || ""
  });
}
export {
  j as AssignmentQueueRequestError,
  De as AssignmentQueueScreen,
  C as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  b as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  Te as applyOptimisticAssignmentAction,
  ke as buildAssignmentListQuery,
  Ae as buildAssignmentListURL,
  Ie as claimAssignment,
  ze as createAssignmentQueueScreen,
  xe as fetchAssignmentList,
  Be as getAssignmentQueueStyles,
  We as initAssignmentQueueScreen,
  Se as normalizeAssignmentActionResponse,
  qe as normalizeAssignmentListMeta,
  Re as normalizeAssignmentListResponse,
  J as normalizeAssignmentListRow,
  S as presetToQueryState,
  Ee as releaseAssignment
};

//# sourceMappingURL=index.js.map
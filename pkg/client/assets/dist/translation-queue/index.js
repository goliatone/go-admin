import { extractStructuredError as V } from "../toast/error-helpers.js";
import { C as j } from "../chunks/translation-status-vocabulary-DDCX-Bio.js";
import { n as K, t as Q } from "../chunks/http-client-DiXyH5DW.js";
import { B as G, C as Y, F as W, I as X, L as y, N as J, P as Z, R as w, S as L, V as A, _ as ee, a as C, c as T, g as te, u as g, v as se, x as ie, z as ae } from "../chunks/translation-shared-BSLmw_rJ.js";
var x = class extends Error {
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
], E = [
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
function l(e) {
  return e && typeof e == "object" ? e : {};
}
function r(e) {
  return typeof e == "string" ? e.trim() : "";
}
function p(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function f(e) {
  const t = l(e);
  return {
    enabled: t.enabled === !0,
    reason: r(t.reason) || void 0,
    reason_code: r(t.reason_code) || void 0,
    permission: r(t.permission) || void 0
  };
}
function re(e) {
  const t = l(e), s = r(t.last_rejection_reason), i = r(t.last_reviewer_id);
  if (!(!s && !i))
    return {
      last_rejection_reason: s || void 0,
      last_reviewer_id: i || void 0
    };
}
function ne(e) {
  const t = l(e), s = t.enabled === !0, i = p(t.warning_count), a = p(t.blocker_count), n = p(t.finding_count);
  if (!(!s && i <= 0 && a <= 0 && n <= 0))
    return {
      enabled: s,
      warning_count: i,
      blocker_count: a,
      finding_count: n
    };
}
function I(e) {
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
function k(e, t) {
  const s = e.headers.get(t);
  return typeof s == "string" ? s.trim() : "";
}
function oe(e) {
  const t = k(e, "x-request-id"), s = k(e, "x-correlation-id"), i = k(e, "x-trace-id") || s || void 0;
  return {
    requestId: t || void 0,
    traceId: i
  };
}
async function de(e, t) {
  return typeof e.clone == "function" ? V(e.clone()) : {
    textCode: null,
    message: await K(e, t),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function U(e, t) {
  const s = await de(e, t), i = oe(e);
  return new x({
    message: s.message || `${t}: ${e.status}`,
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function ce(e) {
  const t = l(e), s = r(t.id), i = r(t.label);
  if (!s || !i) return null;
  const a = l(t.query);
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
function D(e, t = _) {
  const s = (Array.isArray(e) ? e : []).map((i) => ce(i)).filter((i) => i !== null);
  return s.length ? s : t.map(b);
}
function b(e) {
  return {
    id: e.id,
    label: e.label,
    description: e.description,
    review_state: e.review_state,
    query: { ...e.query }
  };
}
function le(e) {
  const t = l(e), s = {};
  for (const [i, a] of Object.entries(t)) {
    const n = p(a);
    i.trim() && (s[i.trim()] = n);
  }
  return s;
}
function R(e) {
  return Array.from(new Set(e.map((t) => r(t)).filter(Boolean)));
}
function ue(e) {
  const t = l(e), s = Array.isArray(t.supported_sort_keys) ? t.supported_sort_keys.map((a) => r(a)).filter((a) => !!a) : [], i = l(t.default_sort);
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
    saved_filter_presets: D(t.saved_filter_presets, _),
    saved_review_filter_presets: D(t.saved_review_filter_presets, E),
    default_review_filter_preset: r(t.default_review_filter_preset) || void 0,
    review_actor_id: r(t.review_actor_id) || void 0,
    review_aggregate_counts: le(t.review_aggregate_counts)
  };
}
function pe(e = {}) {
  const t = new URLSearchParams();
  return e.status && t.set("status", e.status), e.assigneeId && t.set("assignee_id", e.assigneeId), e.reviewerId && t.set("reviewer_id", e.reviewerId), e.dueState && t.set("due_state", e.dueState), e.locale && t.set("locale", e.locale), e.priority && t.set("priority", e.priority), e.reviewState && t.set("review_state", e.reviewState), e.familyId && t.set("family_id", e.familyId), e.page && e.page > 0 && t.set("page", String(e.page)), e.perPage && e.perPage > 0 && t.set("per_page", String(e.perPage)), e.sort && t.set("sort", e.sort), e.order && t.set("order", e.order), t.toString();
}
function me(e, t = {}) {
  const s = pe(t);
  return s ? `${e}${e.includes("?") ? "&" : "?"}${s}` : e;
}
function H(e) {
  const t = l(e);
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
    queue_state: I(t.queue_state),
    status: I(t.status),
    priority: r(t.priority) || "normal",
    due_state: r(t.due_state) || "none",
    due_date: r(t.due_date) || void 0,
    row_version: p(t.row_version || t.version),
    version: p(t.version || t.row_version),
    updated_at: r(t.updated_at),
    created_at: r(t.created_at),
    actions: {
      claim: f(l(t.actions).claim),
      release: f(l(t.actions).release)
    },
    review_actions: {
      submit_review: f(l(t.review_actions).submit_review),
      approve: f(l(t.review_actions).approve),
      reject: f(l(t.review_actions).reject),
      archive: f(l(t.review_actions).archive)
    },
    last_rejection_reason: r(t.last_rejection_reason) || void 0,
    review_feedback: re(t.review_feedback),
    qa_summary: ne(t.qa_summary)
  };
}
function ge(e) {
  const t = l(e);
  return {
    data: (Array.isArray(t.data) ? t.data : []).map((s) => H(s)),
    meta: ue(t.meta)
  };
}
function fe(e) {
  const t = l(e), s = l(t.meta), i = l(t.data);
  return {
    data: {
      assignment_id: r(i.assignment_id),
      status: I(i.status),
      row_version: p(i.row_version),
      updated_at: r(i.updated_at),
      assignment: H(i.assignment)
    },
    meta: { idempotency_hit: s.idempotency_hit === !0 }
  };
}
async function ve(e, t = {}) {
  const s = await Q(me(e, t), { method: "GET" });
  if (!s.ok) throw await U(s, "Failed to load assignments");
  return ge(await s.json());
}
async function P(e, t, s, i) {
  const a = { expected_version: i.expected_version };
  i.idempotency_key && (a.idempotency_key = i.idempotency_key), i.reason && (a.reason = i.reason);
  const n = await Q(`${e}/${encodeURIComponent(t)}/actions/${s}`, {
    method: "POST",
    json: a
  });
  if (!n.ok) throw await U(n, `Failed to ${s} assignment`);
  return fe(await n.json());
}
function he(e, t, s) {
  return P(e, t, "claim", s);
}
function _e(e, t, s) {
  return P(e, t, "release", s);
}
function $(e) {
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
function F(e, t) {
  return `queue-${e}-${t.id}-${t.version}-${Date.now()}`;
}
function be(e, t) {
  return `queue-${e}-${t.id}-${t.version}-${Date.now()}`;
}
function ye(e) {
  const t = r(e);
  if (!t) return null;
  const s = _.find((a) => a.id === t);
  if (s) return {
    kind: "standard",
    preset: s
  };
  const i = E.find((a) => a.id === t);
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
function S(e, t) {
  return {
    enabled: !1,
    permission: e,
    reason: t,
    reason_code: "INVALID_STATUS"
  };
}
function we(e, t) {
  const s = h(e);
  return t === "claim" ? (s.queue_state = "in_progress", s.status = "in_progress", s.actions.claim = S(e.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), s.actions.release = {
    enabled: !0,
    permission: e.actions.release.permission
  }, s.review_actions.submit_review = {
    enabled: !0,
    permission: e.review_actions.submit_review.permission
  }, s) : (s.assignment_type = "open_pool", s.queue_state = "open", s.status = "open", s.assignee_id = "", s.actions.claim = {
    enabled: !0,
    permission: e.actions.claim.permission
  }, s.actions.release = S(e.actions.release.permission, "assignment must be assigned or in progress before it can be released"), s.review_actions.submit_review = S(e.review_actions.submit_review.permission, "assignment must be in progress"), s);
}
function B(e, t) {
  return e instanceof x ? {
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
function $e(e) {
  return r(e.queue_state || e.status);
}
function qe(e) {
  return e === "review" || e === "in_review";
}
function O(e) {
  return qe($e(e)) ? !0 : !!(e.review_actions.approve.enabled || e.review_actions.reject.enabled);
}
function N(e) {
  return !!e.review_actions.archive.enabled;
}
var Ae = class {
  constructor(e) {
    this.container = null, this.state = "loading", this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set();
    const t = r(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const s = ye(t);
    if (s?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = s.preset.id, this.activeReviewState = s.preset.review_state || null, this.queryState = $(s.preset);
      return;
    }
    const i = s?.preset || _[1] || _[0];
    this.activePresetId = i?.id || "open", this.queryState = i ? $(i) : {
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
  getState() {
    return this.state;
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
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await ve(this.config.endpoint, this.queryState);
      this.response = e, this.rows = e.data.map((t) => h(t)), this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof x && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  async runInlineAction(e, t) {
    const s = this.rows.findIndex((c) => c.id === t);
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
    const n = h(i), u = `${e}:${t}`;
    this.pendingActions.add(u), this.feedback = null, this.rows[s] = we(i, e), this.render();
    try {
      const c = e === "claim" ? await he(this.config.endpoint, t, {
        expected_version: n.version,
        idempotency_key: F("claim", n)
      }) : await _e(this.config.endpoint, t, {
        expected_version: n.version,
        idempotency_key: F("release", n)
      });
      this.rows[s] = h(c.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (c) {
      this.rows[s] = n, this.feedback = B(c, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(u), this.render();
    }
  }
  async runReviewAction(e, t) {
    const s = this.rows.findIndex((c) => c.id === t);
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
      idempotency_key: be(e, i)
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
      const c = await P(this.config.endpoint, t, e, n);
      this.rows[s] = h(c.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (c) {
      this.feedback = B(c, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(u), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((s) => s.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = $(t), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((s) => s.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = $(t), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(b) : _.map(b);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(b) : E.map(b);
  }
  get visibleRows() {
    return this.rows;
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="${L}">Assignment Queue</p>
            <h1 class="${Y}">${o(this.config.title)}</h1>
            <p class="${ie} max-w-2xl">${o(this.config.description)}</p>
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
      this.feedback.code ? `Code ${o(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${o(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${o(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${d(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${o(this.feedback.message)}</strong>
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
            data-preset-id="${d(e.id)}"
            role="tab"
            aria-selected="${this.activePresetId === e.id ? "true" : "false"}"
            title="${d(e.description || e.label)}"
          >
            ${o(e.label)}
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
          <p class="${L}">Reviewer states</p>
          <p class="review-preset-description">${o(t ? `Signed in as ${t}` : "Reviewer queue states are available when reviewer metadata is present.")}</p>
        </div>
        <div class="assignment-review-presets-grid">
          ${this.savedReviewFilterPresets.map((i) => `
            <button
              type="button"
              class="review-preset-button ${this.activeReviewPresetId === i.id ? "is-active" : ""}"
              data-review-preset-id="${d(i.id)}"
              title="${d(s ? i.description || i.label : "Reviewer metadata is required to use this preset.")}"
              ${s ? "" : 'disabled aria-disabled="true"'}
            >
              <span>${o(i.label)}</span>
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
    ], a = ["", ...R(e.map((m) => m.target_locale))], n = ["", ...R(e.map((m) => m.assignee_id))], u = ["", ...R(e.map((m) => m.reviewer_id))], c = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
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
        ${this.renderSelect("reviewer_id", "Reviewer", u, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", c, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, t, s, i) {
    const a = [...s];
    return i && !a.includes(i) && a.push(i), `
      <label class="queue-filter-field">
        <span>${o(t)}</span>
        <select data-filter-name="${d(e)}">
          ${a.map((n) => `
            <option value="${d(n)}" ${n === i ? "selected" : ""}>
              ${o(n ? v(n) : `All ${t.toLowerCase()}`)}
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
      <div class="${te} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${se}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${ee} mt-2">${o(t)}</p>
        <div class="mt-4">
          <button type="button" class="${g}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = this.pendingActions.has(`claim:${e.id}`), s = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), a = this.pendingActions.has(`reject:${e.id}`), n = this.pendingActions.has(`archive:${e.id}`), u = t || !e.actions.claim.enabled, c = s || !e.actions.release.enabled, m = O(e), q = N(e);
    return `
      <tr class="assignment-queue-row" tabindex="0" data-assignment-id="${d(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${d(M(e))}">
        <td>
          <div class="queue-content-cell">
            <strong>${o(e.source_title || e.source_path || e.id)}</strong>
            <span>${o(e.entity_type)} · ${o(e.source_path || e.family_id)}</span>
          </div>
        </td>
        <td>
          <div class="queue-locale-cell">
            <span class="locale-pill">${o(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-pill locale-target">${o(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td>
          <div class="queue-status-cell">
            ${j(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
            <span class="queue-content-state">${o(v(e.content_state))}</span>
            ${e.qa_summary?.enabled ? `
              <span class="queue-qa-chip ${e.qa_summary.blocker_count > 0 ? "is-blocked" : ""}">
                QA ${e.qa_summary.finding_count}
              </span>
            ` : ""}
          </div>
        </td>
        <td>
          <div class="queue-owner-cell">
            <span><strong>Assignee:</strong> ${o(e.assignee_id || "Open pool")}</span>
            <span><strong>Reviewer:</strong> ${o(e.reviewer_id || "Not set")}</span>
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${o(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            <span class="due-pill due-${d(e.due_state)}">${o(v(e.due_state))}</span>
            <span>${o(z(e.due_date))}</span>
          </div>
        </td>
        <td>
          <span class="priority-pill priority-${d(e.priority)}">${o(v(e.priority))}</span>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${g}"
                data-action="claim"
                data-assignment-id="${d(e.id)}"
                ${u ? "disabled" : ""}
                aria-disabled="${u ? "true" : "false"}"
                title="${d(t ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${t ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${g}"
                data-action="release"
                data-assignment-id="${d(e.id)}"
                ${c ? "disabled" : ""}
                aria-disabled="${c ? "true" : "false"}"
                title="${d(s ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${s ? "Releasing…" : "Release"}
              </button>
            </div>
            ${m ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${T}"
                  data-action="approve"
                  data-assignment-id="${d(e.id)}"
                  ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${i || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${d(i ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${i ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${C}"
                  data-action="reject"
                  data-assignment-id="${d(e.id)}"
                  ${a || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${a || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${d(a ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${a ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${q ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${g}"
                  data-action="archive"
                  data-assignment-id="${d(e.id)}"
                  ${n || !e.review_actions.archive.enabled ? "disabled" : ""}
                  aria-disabled="${n || !e.review_actions.archive.enabled ? "true" : "false"}"
                  title="${d(n ? "Archiving assignment…" : e.review_actions.archive.reason || "Archive assignment")}"
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
    const t = this.pendingActions.has(`claim:${e.id}`), s = this.pendingActions.has(`release:${e.id}`), i = this.pendingActions.has(`approve:${e.id}`), a = this.pendingActions.has(`reject:${e.id}`), n = this.pendingActions.has(`archive:${e.id}`), u = t || !e.actions.claim.enabled, c = s || !e.actions.release.enabled, m = O(e), q = N(e);
    return `
      <article
        class="${J}"
        data-assignment-id="${d(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${d(M(e))}"
      >
        <div class="${X}">
          <div>
            <h3 class="${G}">${o(e.source_title || e.source_path || e.id)}</h3>
            <p class="${ae}">${o(e.entity_type)} · ${o(e.source_path || e.family_id)}</p>
          </div>
          ${j(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${W}">
          <div class="${w}">
            <span class="${y}">Locale</span>
            <span class="${A}">
              <span class="locale-pill">${o(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-pill locale-target">${o(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${w}">
            <span class="${y}">Assignee</span>
            <span class="${A}">${o(e.assignee_id || "Open pool")}</span>
          </div>
          <div class="${w}">
            <span class="${y}">Due</span>
            <span class="${A}">
              <span class="due-pill due-${d(e.due_state)}">${o(v(e.due_state))}</span>
              ${e.due_date ? `<span class="text-gray-500 ml-1">${o(z(e.due_date))}</span>` : ""}
            </span>
          </div>
          <div class="${w}">
            <span class="${y}">Priority</span>
            <span class="priority-pill priority-${d(e.priority)}">${o(v(e.priority))}</span>
          </div>
        </div>
        <div class="${Z}">
          <button
            type="button"
            class="${g} flex-1"
            data-action="claim"
            data-assignment-id="${d(e.id)}"
            ${u ? "disabled" : ""}
          >
            ${t ? "Claiming…" : "Claim"}
          </button>
          <button
            type="button"
            class="${g} flex-1"
            data-action="release"
            data-assignment-id="${d(e.id)}"
            ${c ? "disabled" : ""}
          >
            ${s ? "Releasing…" : "Release"}
          </button>
          ${m ? `
            <button
              type="button"
              class="${T} flex-1"
              data-action="approve"
              data-assignment-id="${d(e.id)}"
              ${i || !e.review_actions.approve.enabled ? "disabled" : ""}
            >
              ${i ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              class="${C} flex-1"
              data-action="reject"
              data-assignment-id="${d(e.id)}"
              ${a || !e.review_actions.reject.enabled ? "disabled" : ""}
            >
              ${a ? "Rejecting…" : "Reject"}
            </button>
          ` : ""}
          ${q ? `
            <button
              type="button"
              class="${g}"
              data-action="archive"
              data-assignment-id="${d(e.id)}"
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
        const a = t.dataset.assignmentNavGroup;
        if (!a) return;
        s.preventDefault();
        const n = Array.from(this.container?.querySelectorAll(`[data-assignment-nav-group="${a}"]`) || []), u = n.indexOf(t);
        u < 0 || n[i === "ArrowDown" ? Math.min(u + 1, n.length - 1) : Math.max(u - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
function M(e) {
  return [
    e.source_title || e.source_path || e.id,
    `${e.source_locale.toUpperCase()} to ${e.target_locale.toUpperCase()}`,
    e.queue_state,
    e.due_state
  ].filter(Boolean).join(", ");
}
function v(e) {
  return e ? e.replace(/_/g, " ").split(" ").filter(Boolean).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ") : "";
}
function z(e) {
  if (!e) return "No due date";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString(void 0, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
function o(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function d(e) {
  return e.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function ke() {
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

    .queue-content-cell span,
    .queue-owner-cell span,
    .queue-due-cell span,
    .queue-status-cell span {
      color: #4b5563;
      font-size: 0.88rem;
    }

    .queue-locale-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .locale-pill,
    .priority-pill,
    .due-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.3rem 0.6rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .locale-pill {
      background: #e5e7eb;
      color: #111827;
    }

    .locale-pill.locale-target {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .locale-arrow {
      color: #6b7280;
      font-weight: 700;
    }

    .priority-low {
      background: #f1f5f9;
      color: #4b5563;
    }

    .priority-normal {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .priority-high {
      background: #fef3c7;
      color: #b45309;
    }

    .priority-urgent {
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
function Re() {
  if (typeof document > "u") return;
  const e = "assignment-queue-styles";
  if (document.getElementById(e)) return;
  const t = document.createElement("style");
  t.id = e, t.textContent = ke(), document.head.appendChild(t);
}
function Se(e, t) {
  Re();
  const s = new Ae(t);
  return s.mount(e), s;
}
function je(e) {
  const t = e.dataset.endpoint || e.dataset.assignmentListEndpoint || "";
  if (!t) return null;
  const s = typeof window < "u" && window?.location?.search ? new URLSearchParams(window.location.search) : null;
  return Se(e, {
    endpoint: t,
    editorBasePath: e.dataset.editorBasePath || "",
    title: e.dataset.title,
    description: e.dataset.description,
    initialPresetId: e.dataset.initialPresetId || s?.get("preset") || ""
  });
}
export {
  x as AssignmentQueueRequestError,
  Ae as AssignmentQueueScreen,
  E as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  _ as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  we as applyOptimisticAssignmentAction,
  pe as buildAssignmentListQuery,
  me as buildAssignmentListURL,
  he as claimAssignment,
  Se as createAssignmentQueueScreen,
  ve as fetchAssignmentList,
  ke as getAssignmentQueueStyles,
  je as initAssignmentQueueScreen,
  fe as normalizeAssignmentActionResponse,
  ue as normalizeAssignmentListMeta,
  ge as normalizeAssignmentListResponse,
  H as normalizeAssignmentListRow,
  $ as presetToQueryState,
  _e as releaseAssignment
};

//# sourceMappingURL=index.js.map
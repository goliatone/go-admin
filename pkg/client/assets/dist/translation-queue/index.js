import { r as j } from "../chunks/translation-status-vocabulary-BA9o2n8M.js";
import { asRecord as u, asString as r, asNumber as f } from "../shared/coercion.js";
import { setSearchParam as m, setNumberSearchParam as C, buildEndpointURL as Y, readLocationSearchParams as W, getStringSearchParam as X } from "../shared/query-state/url-state.js";
import { StatefulController as Z } from "../shared/stateful-controller.js";
import { normalizeNumberRecord as J } from "../shared/record-normalization.js";
import { httpRequest as V, readHTTPError as ee } from "../shared/transport/http-client.js";
import { extractStructuredError as te } from "../toast/error-helpers.js";
import { escapeHTML as o, escapeAttribute as d } from "../shared/html.js";
import { H as D, h as se, a as ie, x as v, k as ae, l as re, m as ne, P as B, Q as F, S as oe, U as de, V as ce, W as le, X as ue, Y as $, Z as q, _ as R, $ as pe } from "../chunks/style-constants-i2xRoO1L.js";
import { formatTranslationShortDateTime as O } from "../translation-shared/formatters.js";
class P extends Error {
  constructor(e) {
    super(e.message), this.name = "AssignmentQueueRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}
const y = [
  {
    id: "mine",
    label: "Mine",
    description: "Assignments currently assigned to the active actor.",
    query: { assignee_id: "__me__", sort: "due_date", order: "asc" }
  },
  {
    id: "open",
    label: "Open",
    description: "Claimable or active assignments that still need translator work.",
    query: { status: "open,assigned,in_progress,changes_requested", sort: "updated_at", order: "desc" }
  },
  {
    id: "needs_review",
    label: "Needs Review",
    description: "Assignments awaiting review for the active actor.",
    query: { status: "in_review", reviewer_id: "__me__", sort: "due_date", order: "asc" }
  },
  {
    id: "overdue",
    label: "Overdue",
    description: "Past-due assignments across the visible queue scope.",
    query: { due_state: "overdue", sort: "due_date", order: "asc" }
  },
  {
    id: "high_priority",
    label: "High Priority",
    description: "Assignments marked high or urgent.",
    query: { priority: "high,urgent", sort: "due_date", order: "asc" }
  }
], L = [
  {
    id: "review_inbox",
    label: "Review Inbox",
    description: "Assignments currently waiting on the active reviewer.",
    query: { status: "in_review", reviewer_id: "__me__", sort: "due_date", order: "asc" }
  },
  {
    id: "review_overdue",
    label: "Review Overdue",
    description: "Reviewer-owned assignments that are already overdue.",
    query: { status: "in_review", reviewer_id: "__me__", due_state: "overdue", sort: "due_date", order: "asc" }
  },
  {
    id: "review_blocked",
    label: "QA Blocked",
    description: "Reviewer inbox items with blocking QA findings.",
    review_state: "qa_blocked",
    query: { status: "in_review", reviewer_id: "__me__", sort: "due_date", order: "asc" }
  },
  {
    id: "review_changes_requested",
    label: "Changes Requested",
    description: "Assignments the active reviewer already sent back for fixes.",
    query: { status: "changes_requested", reviewer_id: "__me__", sort: "updated_at", order: "desc" }
  }
];
function h(t) {
  const e = u(t);
  return {
    enabled: e.enabled === !0,
    reason: r(e.reason) || void 0,
    reason_code: r(e.reason_code) || void 0,
    permission: r(e.permission) || void 0
  };
}
function me(t) {
  const e = u(t), s = r(e.last_rejection_reason), i = r(e.last_reviewer_id);
  if (!(!s && !i))
    return {
      last_rejection_reason: s || void 0,
      last_reviewer_id: i || void 0
    };
}
function ge(t) {
  const e = u(t), s = e.enabled === !0, i = f(e.warning_count), a = f(e.blocker_count), n = f(e.finding_count);
  if (!(!s && i <= 0 && a <= 0 && n <= 0))
    return {
      enabled: s,
      warning_count: i,
      blocker_count: a,
      finding_count: n
    };
}
function E(t) {
  switch (r(t)) {
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
      return r(t);
    default:
      return "open";
  }
}
function S(t, e) {
  const s = t.headers.get(e);
  return typeof s == "string" ? s.trim() : "";
}
function ve(t) {
  const e = S(t, "x-request-id"), s = S(t, "x-correlation-id"), i = S(t, "x-trace-id") || s || void 0;
  return {
    requestId: e || void 0,
    traceId: i
  };
}
async function fe(t, e) {
  return typeof t.clone == "function" ? te(t.clone()) : {
    textCode: null,
    message: await ee(t, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function K(t, e) {
  const s = await fe(t, e), i = ve(t);
  return new P({
    message: s.message || `${e}: ${t.status}`,
    status: t.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function he(t) {
  const e = u(t), s = r(e.id), i = r(e.label);
  if (!s || !i)
    return null;
  const a = u(e.query);
  return {
    id: s,
    label: i,
    description: r(e.description) || void 0,
    review_state: r(e.review_state) || void 0,
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
function N(t, e = y) {
  const i = (Array.isArray(t) ? t : []).map((a) => he(a)).filter((a) => a !== null);
  return i.length ? i : e.map(w);
}
function w(t) {
  return {
    id: t.id,
    label: t.label,
    description: t.description,
    review_state: t.review_state,
    query: { ...t.query }
  };
}
function x(t) {
  return Array.from(new Set(t.map((e) => r(e)).filter(Boolean)));
}
function _e(t) {
  const e = u(t), s = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((a) => r(a)).filter((a) => !!a) : [], i = u(e.default_sort);
  return {
    page: f(e.page) || 1,
    per_page: f(e.per_page) || 25,
    total: f(e.total),
    updated_at: r(e.updated_at) || void 0,
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
    saved_filter_presets: N(e.saved_filter_presets, y),
    saved_review_filter_presets: N(e.saved_review_filter_presets, L),
    default_review_filter_preset: r(e.default_review_filter_preset) || void 0,
    review_actor_id: r(e.review_actor_id) || void 0,
    review_aggregate_counts: J(e.review_aggregate_counts, { trimKeys: !0, omitBlankKeys: !0 })
  };
}
function be(t = {}) {
  const e = new URLSearchParams();
  return m(e, "status", t.status), m(e, "assignee_id", t.assigneeId), m(e, "reviewer_id", t.reviewerId), m(e, "due_state", t.dueState), m(e, "locale", t.locale), m(e, "priority", t.priority), m(e, "review_state", t.reviewState), m(e, "family_id", t.familyId), C(e, "page", t.page, { min: 1 }), C(e, "per_page", t.perPage, { min: 1 }), m(e, "sort", t.sort), m(e, "order", t.order), e.toString();
}
function ye(t, e = {}) {
  const s = be(e);
  return s ? Y(t, new URLSearchParams(s), { preserveAbsolute: !0 }) : t;
}
function G(t) {
  const e = u(t);
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
    queue_state: E(e.queue_state),
    status: E(e.status),
    priority: r(e.priority) || "normal",
    due_state: r(e.due_state) || "none",
    due_date: r(e.due_date) || void 0,
    row_version: f(e.row_version || e.version),
    version: f(e.version || e.row_version),
    updated_at: r(e.updated_at),
    created_at: r(e.created_at),
    actions: {
      claim: h(u(e.actions).claim),
      release: h(u(e.actions).release)
    },
    review_actions: {
      submit_review: h(u(e.review_actions).submit_review),
      approve: h(u(e.review_actions).approve),
      reject: h(u(e.review_actions).reject),
      archive: h(u(e.review_actions).archive)
    },
    last_rejection_reason: r(e.last_rejection_reason) || void 0,
    review_feedback: me(e.review_feedback),
    qa_summary: ge(e.qa_summary)
  };
}
function we(t) {
  const e = u(t);
  return {
    data: (Array.isArray(e.data) ? e.data : []).map((i) => G(i)),
    meta: _e(e.meta)
  };
}
function $e(t) {
  const e = u(t), s = u(e.meta), i = u(e.data);
  return {
    data: {
      assignment_id: r(i.assignment_id),
      status: E(i.status),
      row_version: f(i.row_version),
      updated_at: r(i.updated_at),
      assignment: G(i.assignment)
    },
    meta: {
      idempotency_hit: s.idempotency_hit === !0
    }
  };
}
async function qe(t, e = {}) {
  const s = await V(ye(t, e), { method: "GET" });
  if (!s.ok)
    throw await K(s, "Failed to load assignments");
  return we(await s.json());
}
async function T(t, e, s, i) {
  const a = {
    expected_version: i.expected_version
  };
  i.idempotency_key && (a.idempotency_key = i.idempotency_key), i.reason && (a.reason = i.reason);
  const n = await V(`${t}/${encodeURIComponent(e)}/actions/${s}`, {
    method: "POST",
    json: a
  });
  if (!n.ok)
    throw await K(n, `Failed to ${s} assignment`);
  return $e(await n.json());
}
function Ae(t, e, s) {
  return T(t, e, "claim", s);
}
function ke(t, e, s) {
  return T(t, e, "release", s);
}
function A(t) {
  return {
    status: t.query.status,
    assigneeId: t.query.assignee_id,
    reviewerId: t.query.reviewer_id,
    dueState: t.query.due_state,
    locale: t.query.locale,
    priority: t.query.priority,
    reviewState: t.review_state,
    familyId: t.query.family_id,
    sort: t.query.sort,
    order: t.query.order,
    page: 1
  };
}
function M(t, e) {
  return `queue-${t}-${e.id}-${e.version}-${Date.now()}`;
}
function Re(t, e) {
  return `queue-${t}-${e.id}-${e.version}-${Date.now()}`;
}
function Se(t) {
  const e = r(t);
  if (!e) return null;
  const s = y.find((a) => a.id === e);
  if (s)
    return { kind: "standard", preset: s };
  const i = L.find((a) => a.id === e);
  return i ? { kind: "review", preset: i } : null;
}
function b(t) {
  return {
    ...t,
    actions: {
      claim: { ...t.actions.claim },
      release: { ...t.actions.release }
    },
    review_actions: {
      submit_review: { ...t.review_actions.submit_review },
      approve: { ...t.review_actions.approve },
      reject: { ...t.review_actions.reject },
      archive: { ...t.review_actions.archive }
    },
    review_feedback: t.review_feedback ? { ...t.review_feedback } : void 0,
    qa_summary: t.qa_summary ? { ...t.qa_summary } : void 0
  };
}
function I(t, e) {
  return {
    enabled: !1,
    permission: t,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function xe(t, e) {
  const s = b(t);
  return e === "claim" ? (s.queue_state = "in_progress", s.status = "in_progress", s.actions.claim = I(t.actions.claim.permission, "assignment must be open pool or already assigned to you before it can be claimed"), s.actions.release = {
    enabled: !0,
    permission: t.actions.release.permission
  }, s.review_actions.submit_review = {
    enabled: !0,
    permission: t.review_actions.submit_review.permission
  }, s) : (s.assignment_type = "open_pool", s.queue_state = "open", s.status = "open", s.assignee_id = "", s.actions.claim = {
    enabled: !0,
    permission: t.actions.claim.permission
  }, s.actions.release = I(t.actions.release.permission, "assignment must be assigned or in progress before it can be released"), s.review_actions.submit_review = I(t.review_actions.submit_review.permission, "assignment must be in progress"), s);
}
function z(t, e) {
  return t instanceof P ? {
    kind: t.code === "VERSION_CONFLICT" ? "conflict" : "error",
    message: t.message || e,
    code: t.code,
    requestId: t.requestId,
    traceId: t.traceId
  } : t instanceof Error ? {
    kind: "error",
    message: t.message || e
  } : {
    kind: "error",
    message: e
  };
}
function Ie(t) {
  return r(t.queue_state || t.status);
}
function Ee(t) {
  return t === "review" || t === "in_review";
}
function Q(t) {
  const e = Ie(t);
  return Ee(e) ? !0 : !!(t.review_actions.approve.enabled || t.review_actions.reject.enabled);
}
function U(t) {
  return !!t.review_actions.archive.enabled;
}
class Pe extends Z {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set();
    const s = r(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: s || "open"
    };
    const i = Se(s);
    if (i?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = i.preset.id, this.activeReviewState = i.preset.review_state || null, this.queryState = A(i.preset);
      return;
    }
    const a = i?.preset || y[1] || y[0];
    this.activePresetId = a?.id || "open", this.queryState = a ? A(a) : { sort: "updated_at", order: "desc", page: 1 };
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
    return this.rows.map((e) => b(e));
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
      const e = await qe(this.config.endpoint, this.queryState);
      this.response = e, this.rows = e.data.map((s) => b(s)), this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof P && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  async runInlineAction(e, s) {
    const i = this.rows.findIndex((l) => l.id === s);
    if (i < 0)
      return;
    const a = this.rows[i], n = a.actions[e];
    if (!n.enabled) {
      this.feedback = {
        kind: n.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n.reason || `Cannot ${e} this assignment.`,
        code: n.reason_code || null
      }, this.render();
      return;
    }
    const c = b(a), p = `${e}:${s}`;
    this.pendingActions.add(p), this.feedback = null, this.rows[i] = xe(a, e), this.render();
    try {
      const l = e === "claim" ? await Ae(this.config.endpoint, s, {
        expected_version: c.version,
        idempotency_key: M("claim", c)
      }) : await ke(this.config.endpoint, s, {
        expected_version: c.version,
        idempotency_key: M("release", c)
      });
      this.rows[i] = b(l.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (l) {
      this.rows[i] = c, this.feedback = z(l, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(p), this.render();
    }
  }
  async runReviewAction(e, s) {
    const i = this.rows.findIndex((l) => l.id === s);
    if (i < 0) return;
    const a = this.rows[i], n = a.review_actions[e];
    if (!n?.enabled) {
      this.feedback = {
        kind: n?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n?.reason || `Cannot ${e} this assignment.`,
        code: n?.reason_code || null
      }, this.render();
      return;
    }
    const c = {
      expected_version: a.version,
      idempotency_key: Re(e, a)
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
      c.reason = l.trim();
    }
    const p = `${e}:${s}`;
    this.pendingActions.add(p), this.feedback = null, this.render();
    try {
      const l = await T(this.config.endpoint, s, e, c);
      this.rows[i] = b(l.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (l) {
      this.feedback = z(l, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(p), this.render();
    }
  }
  setActivePreset(e) {
    const s = this.savedFilterPresets.find((i) => i.id === e);
    s && (this.activePresetId = s.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = A(s), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const s = this.savedReviewFilterPresets.find((i) => i.id === e);
    s && (this.activePresetId = "custom", this.activeReviewPresetId = s.id, this.activeReviewState = s.review_state || null, this.queryState = A(s), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(w) : y.map(w);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(w) : L.map(w);
  }
  get visibleRows() {
    return this.rows;
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="${D}">Assignment Queue</p>
            <h1 class="${se}">${o(this.config.title)}</h1>
            <p class="${ie} max-w-2xl">${o(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.visibleRows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="${v}" data-queue-refresh="true">Refresh</button>
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
    if (!this.feedback)
      return "";
    const e = this.feedback.kind === "success" ? "feedback-success" : this.feedback.kind === "conflict" ? "feedback-conflict" : "feedback-error", s = [
      this.feedback.code ? `Code ${o(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${o(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${o(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${d(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${o(this.feedback.message)}</strong>
        ${s.length ? `<span class="feedback-meta">${s.join(" · ")}</span>` : ""}
      </div>
    `;
  }
  renderPresetBar() {
    return `
      <div class="assignment-queue-presets" role="tablist" aria-label="Saved queue filters">
        ${this.savedFilterPresets.map((e) => `
          <button
            type="button"
            class="${v} queue-preset-button ${this.activePresetId === e.id ? "is-active" : ""}"
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
    if (!this.savedReviewFilterPresets.length)
      return "";
    const e = this.response?.meta.review_aggregate_counts || {}, s = this.response?.meta.review_actor_id, i = !!s;
    return `
      <section class="assignment-review-presets" aria-label="Reviewer queue states">
        <div class="review-preset-copy">
          <p class="${D}">Reviewer states</p>
          <p class="review-preset-description">${o(s ? `Signed in as ${s}` : "Reviewer queue states are available when reviewer metadata is present.")}</p>
        </div>
        <div class="assignment-review-presets-grid">
          ${this.savedReviewFilterPresets.map((a) => `
            <button
              type="button"
              class="review-preset-button ${this.activeReviewPresetId === a.id ? "is-active" : ""}"
              data-review-preset-id="${d(a.id)}"
              title="${d(i ? a.description || a.label : "Reviewer metadata is required to use this preset.")}"
              ${i ? "" : 'disabled aria-disabled="true"'}
            >
              <span>${o(a.label)}</span>
              <strong>${e[a.id] ?? 0}</strong>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }
  renderFilters() {
    const e = this.visibleRows, s = ["", "open", "assigned", "in_progress", "in_review", "changes_requested", "approved", "archived"], i = ["none", "on_track", "due_soon", "overdue"], a = ["", "low", "normal", "high", "urgent"], n = ["", ...x(e.map((g) => g.target_locale))], c = ["", ...x(e.map((g) => g.assignee_id))], p = ["", ...x(e.map((g) => g.reviewer_id))], l = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : ["updated_at", "due_date", "priority", "status", "locale"];
    return `
      <form class="assignment-queue-filters" data-queue-filters="true">
        ${this.renderSelect("status", "Status", s, this.queryState.status || "")}
        ${this.renderSelect("due_state", "Due State", ["", ...i], this.queryState.dueState || "")}
        ${this.renderSelect("priority", "Priority", a, this.queryState.priority || "")}
        ${this.renderSelect("locale", "Locale", n, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", c, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", p, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", l, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, s, i, a) {
    const n = [...i];
    return a && !n.includes(a) && n.push(a), `
      <label class="queue-filter-field">
        <span>${o(s)}</span>
        <select data-filter-name="${d(e)}">
          ${n.map((c) => `
            <option value="${d(c)}" ${c === a ? "selected" : ""}>
              ${o(c ? _(c) : `All ${s.toLowerCase()}`)}
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
        ${e.map((s) => this.renderMobileCard(s)).join("")}
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
            ${e.map((s) => this.renderRow(s)).join("")}
          </tbody>
        </table>
      </div>
    ` : '<div class="assignment-queue-state" data-queue-state="empty">No assignments match the current filters.</div>';
  }
  renderErrorState(e, s) {
    return `
      <div class="${ae} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${re}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${ne} mt-2">${o(s)}</p>
        <div class="mt-4">
          <button type="button" class="${v}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const s = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), a = this.pendingActions.has(`approve:${e.id}`), n = this.pendingActions.has(`reject:${e.id}`), c = this.pendingActions.has(`archive:${e.id}`), p = s || !e.actions.claim.enabled, l = i || !e.actions.release.enabled, g = Q(e), k = U(e);
    return `
      <tr class="assignment-queue-row" tabindex="0" data-assignment-id="${d(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${d(H(e))}">
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
            ${j(e.queue_state, { domain: "queue", size: "sm" })}
            <span class="queue-content-state">${o(_(e.content_state))}</span>
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
            <span class="due-pill due-${d(e.due_state)}">${o(_(e.due_state))}</span>
            <span>${o(O(e.due_date, "No due date"))}</span>
          </div>
        </td>
        <td>
          <span class="priority-pill priority-${d(e.priority)}">${o(_(e.priority))}</span>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${v}"
                data-action="claim"
                data-assignment-id="${d(e.id)}"
                ${p ? "disabled" : ""}
                aria-disabled="${p ? "true" : "false"}"
                title="${d(s ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${s ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${v}"
                data-action="release"
                data-assignment-id="${d(e.id)}"
                ${l ? "disabled" : ""}
                aria-disabled="${l ? "true" : "false"}"
                title="${d(i ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${i ? "Releasing…" : "Release"}
              </button>
            </div>
            ${g ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${B}"
                  data-action="approve"
                  data-assignment-id="${d(e.id)}"
                  ${a || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${a || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${d(a ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${a ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${F}"
                  data-action="reject"
                  data-assignment-id="${d(e.id)}"
                  ${n || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${n || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${d(n ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${n ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${k ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${v}"
                  data-action="archive"
                  data-assignment-id="${d(e.id)}"
                  ${c || !e.review_actions.archive.enabled ? "disabled" : ""}
                  aria-disabled="${c || !e.review_actions.archive.enabled ? "true" : "false"}"
                  title="${d(c ? "Archiving assignment…" : e.review_actions.archive.reason || "Archive assignment")}"
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
    const s = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), a = this.pendingActions.has(`approve:${e.id}`), n = this.pendingActions.has(`reject:${e.id}`), c = this.pendingActions.has(`archive:${e.id}`), p = s || !e.actions.claim.enabled, l = i || !e.actions.release.enabled, g = Q(e), k = U(e);
    return `
      <article
        class="${oe}"
        data-assignment-id="${d(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${d(H(e))}"
      >
        <div class="${de}">
          <div>
            <h3 class="${ce}">${o(e.source_title || e.source_path || e.id)}</h3>
            <p class="${le}">${o(e.entity_type)} · ${o(e.source_path || e.family_id)}</p>
          </div>
          ${j(e.queue_state, { domain: "queue", size: "sm" })}
        </div>
        <div class="${ue}">
          <div class="${$}">
            <span class="${q}">Locale</span>
            <span class="${R}">
              <span class="locale-pill">${o(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-pill locale-target">${o(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          <div class="${$}">
            <span class="${q}">Assignee</span>
            <span class="${R}">${o(e.assignee_id || "Open pool")}</span>
          </div>
          <div class="${$}">
            <span class="${q}">Due</span>
            <span class="${R}">
              <span class="due-pill due-${d(e.due_state)}">${o(_(e.due_state))}</span>
              ${e.due_date ? `<span class="text-gray-500 ml-1">${o(O(e.due_date, "No due date"))}</span>` : ""}
            </span>
          </div>
          <div class="${$}">
            <span class="${q}">Priority</span>
            <span class="priority-pill priority-${d(e.priority)}">${o(_(e.priority))}</span>
          </div>
        </div>
        <div class="${pe}">
          <button
            type="button"
            class="${v} flex-1"
            data-action="claim"
            data-assignment-id="${d(e.id)}"
            ${p ? "disabled" : ""}
          >
            ${s ? "Claiming…" : "Claim"}
          </button>
          <button
            type="button"
            class="${v} flex-1"
            data-action="release"
            data-assignment-id="${d(e.id)}"
            ${l ? "disabled" : ""}
          >
            ${i ? "Releasing…" : "Release"}
          </button>
          ${g ? `
            <button
              type="button"
              class="${B} flex-1"
              data-action="approve"
              data-assignment-id="${d(e.id)}"
              ${a || !e.review_actions.approve.enabled ? "disabled" : ""}
            >
              ${a ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              class="${F} flex-1"
              data-action="reject"
              data-assignment-id="${d(e.id)}"
              ${n || !e.review_actions.reject.enabled ? "disabled" : ""}
            >
              ${n ? "Rejecting…" : "Reject"}
            </button>
          ` : ""}
          ${k ? `
            <button
              type="button"
              class="${v}"
              data-action="archive"
              data-assignment-id="${d(e.id)}"
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
    this.container && (this.container.querySelectorAll("[data-preset-id]").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.presetId;
        s && this.setActivePreset(s);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.reviewPresetId;
        s && this.setActiveReviewPreset(s);
      });
    }), this.container.querySelectorAll("[data-filter-name]").forEach((e) => {
      e.addEventListener("change", () => {
        const s = e.dataset.filterName;
        if (!s)
          return;
        const i = e.value.trim();
        switch (s) {
          case "status":
            this.updateFilter({ status: i || void 0 });
            break;
          case "due_state":
            this.updateFilter({ dueState: i || void 0 });
            break;
          case "priority":
            this.updateFilter({ priority: i || void 0 });
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
          case "sort":
            this.updateFilter({ sort: i || void 0 });
            break;
          case "order":
            this.updateFilter({ order: i || void 0 });
            break;
        }
      });
    }), this.container.querySelectorAll("[data-queue-refresh]").forEach((e) => {
      e.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-action]").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.action, i = e.dataset.assignmentId;
        if ((s === "claim" || s === "release") && i) {
          this.runInlineAction(s, i);
          return;
        }
        (s === "approve" || s === "reject" || s === "archive") && i && this.runReviewAction(s, i);
      });
    }), this.attachAssignmentNavigationTargets("[data-assignment-row]"), this.attachAssignmentNavigationTargets("[data-assignment-card]"));
  }
  attachAssignmentNavigationTargets(e) {
    this.container && this.container.querySelectorAll(e).forEach((s) => {
      s.addEventListener("click", (i) => {
        i.target?.closest("button, a, input, select, textarea") || this.openAssignment(s.dataset.assignmentId || "");
      }), s.addEventListener("keydown", (i) => {
        const a = i.key;
        if (a === "Enter" || a === " ") {
          i.preventDefault(), this.openAssignment(s.dataset.assignmentId || "");
          return;
        }
        if (a !== "ArrowDown" && a !== "ArrowUp")
          return;
        const n = s.dataset.assignmentNavGroup;
        if (!n)
          return;
        i.preventDefault();
        const c = Array.from(
          this.container?.querySelectorAll(`[data-assignment-nav-group="${n}"]`) || []
        ), p = c.indexOf(s);
        if (p < 0)
          return;
        const l = a === "ArrowDown" ? Math.min(p + 1, c.length - 1) : Math.max(p - 1, 0);
        c[l]?.focus();
      });
    });
  }
  openAssignment(e) {
    const s = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !s || !e || typeof window > "u" || (window.location.href = `${s}/${encodeURIComponent(e)}/edit`);
  }
}
function H(t) {
  return [
    t.source_title || t.source_path || t.id,
    `${t.source_locale.toUpperCase()} to ${t.target_locale.toUpperCase()}`,
    t.queue_state,
    t.due_state
  ].filter(Boolean).join(", ");
}
function _(t) {
  return t ? t.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function Le() {
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
function Te() {
  if (typeof document > "u")
    return;
  const t = "assignment-queue-styles";
  if (document.getElementById(t))
    return;
  const e = document.createElement("style");
  e.id = t, e.textContent = Le(), document.head.appendChild(e);
}
function je(t, e) {
  Te();
  const s = new Pe(e);
  return s.mount(t), s;
}
function He(t) {
  const e = t.dataset.endpoint || t.dataset.assignmentListEndpoint || "";
  if (!e)
    return null;
  const s = typeof window < "u" ? W(window.location) : null;
  return je(t, {
    endpoint: e,
    editorBasePath: t.dataset.editorBasePath || "",
    title: t.dataset.title,
    description: t.dataset.description,
    initialPresetId: t.dataset.initialPresetId || X(s ?? new URLSearchParams(), "preset") || ""
  });
}
export {
  P as AssignmentQueueRequestError,
  Pe as AssignmentQueueScreen,
  L as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  y as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  xe as applyOptimisticAssignmentAction,
  be as buildAssignmentListQuery,
  ye as buildAssignmentListURL,
  Ae as claimAssignment,
  je as createAssignmentQueueScreen,
  qe as fetchAssignmentList,
  Le as getAssignmentQueueStyles,
  He as initAssignmentQueueScreen,
  $e as normalizeAssignmentActionResponse,
  _e as normalizeAssignmentListMeta,
  we as normalizeAssignmentListResponse,
  G as normalizeAssignmentListRow,
  A as presetToQueryState,
  ke as releaseAssignment
};
//# sourceMappingURL=index.js.map

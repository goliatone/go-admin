import { r as C } from "../chunks/translation-status-vocabulary-TlPBUpe_.js";
import { h as j, r as D } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as N } from "../toast/error-helpers.js";
import { r as B, H as x, a as z, l as Q, o as f, q as O, u as U, v as M } from "../chunks/breadcrumb-DNcVtCCy.js";
class A extends Error {
  constructor(e) {
    super(e.message), this.name = "AssignmentQueueRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}
const _ = [
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
    query: { status: "pending,assigned,in_progress,rejected", sort: "updated_at", order: "desc" }
  },
  {
    id: "needs_review",
    label: "Needs Review",
    description: "Assignments awaiting review for the active actor.",
    query: { status: "review", reviewer_id: "__me__", sort: "due_date", order: "asc" }
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
], S = [
  {
    id: "review_inbox",
    label: "Review Inbox",
    description: "Assignments currently waiting on the active reviewer.",
    query: { status: "review", reviewer_id: "__me__", sort: "due_date", order: "asc" }
  },
  {
    id: "review_overdue",
    label: "Review Overdue",
    description: "Reviewer-owned assignments that are already overdue.",
    query: { status: "review", reviewer_id: "__me__", due_state: "overdue", sort: "due_date", order: "asc" }
  },
  {
    id: "review_blocked",
    label: "QA Blocked",
    description: "Reviewer inbox items with blocking QA findings.",
    review_state: "qa_blocked",
    query: { status: "review", reviewer_id: "__me__", sort: "due_date", order: "asc" }
  },
  {
    id: "review_changes_requested",
    label: "Changes Requested",
    description: "Assignments the active reviewer already sent back for fixes.",
    query: { status: "rejected", reviewer_id: "__me__", sort: "updated_at", order: "desc" }
  }
];
function u(t) {
  return t && typeof t == "object" ? t : {};
}
function a(t) {
  return typeof t == "string" ? t.trim() : "";
}
function m(t) {
  return typeof t == "number" && Number.isFinite(t) ? t : 0;
}
function v(t) {
  const e = u(t);
  return {
    enabled: e.enabled === !0,
    reason: a(e.reason) || void 0,
    reason_code: a(e.reason_code) || void 0,
    permission: a(e.permission) || void 0
  };
}
function H(t) {
  const e = u(t), s = a(e.last_rejection_reason), i = a(e.last_reviewer_id);
  if (!(!s && !i))
    return {
      last_rejection_reason: s || void 0,
      last_reviewer_id: i || void 0
    };
}
function G(t) {
  const e = u(t), s = e.enabled === !0, i = m(e.warning_count), r = m(e.blocker_count), n = m(e.finding_count);
  if (!(!s && i <= 0 && r <= 0 && n <= 0))
    return {
      enabled: s,
      warning_count: i,
      blocker_count: r,
      finding_count: n
    };
}
function q(t, e) {
  const s = t.headers.get(e);
  return typeof s == "string" ? s.trim() : "";
}
function K(t) {
  const e = q(t, "x-request-id"), s = q(t, "x-correlation-id"), i = q(t, "x-trace-id") || s || void 0;
  return {
    requestId: e || void 0,
    traceId: i
  };
}
async function V(t, e) {
  return typeof t.clone == "function" ? N(t.clone()) : {
    textCode: null,
    message: await D(t, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function F(t, e) {
  const s = await V(t, e), i = K(t);
  return new A({
    message: s.message || `${e}: ${t.status}`,
    status: t.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function Y(t) {
  const e = u(t), s = a(e.id), i = a(e.label);
  if (!s || !i)
    return null;
  const r = u(e.query);
  return {
    id: s,
    label: i,
    description: a(e.description) || void 0,
    review_state: a(e.review_state) || void 0,
    query: {
      status: a(r.status) || void 0,
      assignee_id: a(r.assignee_id) || void 0,
      reviewer_id: a(r.reviewer_id) || void 0,
      due_state: a(r.due_state) || void 0,
      locale: a(r.locale) || void 0,
      priority: a(r.priority) || void 0,
      translation_group_id: a(r.translation_group_id) || void 0,
      sort: a(r.sort) || void 0,
      order: a(r.order) || void 0
    }
  };
}
function I(t, e = _) {
  const i = (Array.isArray(t) ? t : []).map((r) => Y(r)).filter((r) => r !== null);
  return i.length ? i : e.map(b);
}
function b(t) {
  return {
    id: t.id,
    label: t.label,
    description: t.description,
    review_state: t.review_state,
    query: { ...t.query }
  };
}
function W(t) {
  const e = u(t), s = {};
  for (const [i, r] of Object.entries(e)) {
    const n = m(r);
    i.trim() && (s[i.trim()] = n);
  }
  return s;
}
function $(t) {
  return Array.from(new Set(t.map((e) => a(e)).filter(Boolean)));
}
function J(t) {
  const e = u(t), s = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((r) => a(r)).filter((r) => !!r) : [], i = u(e.default_sort);
  return {
    page: m(e.page) || 1,
    per_page: m(e.per_page) || 25,
    total: m(e.total),
    updated_at: a(e.updated_at) || void 0,
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
    saved_filter_presets: I(e.saved_filter_presets, _),
    saved_review_filter_presets: I(e.saved_review_filter_presets, S),
    default_review_filter_preset: a(e.default_review_filter_preset) || void 0,
    review_actor_id: a(e.review_actor_id) || void 0,
    review_aggregate_counts: W(e.review_aggregate_counts)
  };
}
function X(t = {}) {
  const e = new URLSearchParams();
  return t.status && e.set("status", t.status), t.assigneeId && e.set("assignee_id", t.assigneeId), t.reviewerId && e.set("reviewer_id", t.reviewerId), t.dueState && e.set("due_state", t.dueState), t.locale && e.set("locale", t.locale), t.priority && e.set("priority", t.priority), t.reviewState && e.set("review_state", t.reviewState), t.translationGroupId && e.set("translation_group_id", t.translationGroupId), t.page && t.page > 0 && e.set("page", String(t.page)), t.perPage && t.perPage > 0 && e.set("per_page", String(t.perPage)), t.sort && e.set("sort", t.sort), t.order && e.set("order", t.order), e.toString();
}
function Z(t, e = {}) {
  const s = X(e);
  return s ? `${t}${t.includes("?") ? "&" : "?"}${s}` : t;
}
function L(t) {
  const e = u(t);
  return {
    id: a(e.id),
    translation_group_id: a(e.translation_group_id),
    entity_type: a(e.entity_type),
    source_record_id: a(e.source_record_id),
    target_record_id: a(e.target_record_id),
    source_locale: a(e.source_locale),
    target_locale: a(e.target_locale),
    work_scope: a(e.work_scope) || void 0,
    source_title: a(e.source_title),
    source_path: a(e.source_path),
    assignee_id: a(e.assignee_id),
    reviewer_id: a(e.reviewer_id),
    assignment_type: a(e.assignment_type),
    content_state: a(e.content_state),
    queue_state: a(e.queue_state) || "pending",
    status: a(e.status) || "pending",
    priority: a(e.priority) || "normal",
    due_state: a(e.due_state) || "none",
    due_date: a(e.due_date) || void 0,
    row_version: m(e.row_version || e.version),
    version: m(e.version || e.row_version),
    updated_at: a(e.updated_at),
    created_at: a(e.created_at),
    actions: {
      claim: v(u(e.actions).claim),
      release: v(u(e.actions).release)
    },
    review_actions: {
      submit_review: v(u(e.review_actions).submit_review),
      approve: v(u(e.review_actions).approve),
      reject: v(u(e.review_actions).reject),
      archive: v(u(e.review_actions).archive)
    },
    last_rejection_reason: a(e.last_rejection_reason) || void 0,
    review_feedback: H(e.review_feedback),
    qa_summary: G(e.qa_summary)
  };
}
function ee(t) {
  const e = u(t);
  return {
    data: (Array.isArray(e.data) ? e.data : []).map((i) => L(i)),
    meta: J(e.meta)
  };
}
function te(t) {
  const e = u(t), s = u(e.meta), i = u(e.data);
  return {
    data: {
      assignment_id: a(i.assignment_id),
      status: a(i.status) || "pending",
      row_version: m(i.row_version),
      updated_at: a(i.updated_at),
      assignment: L(i.assignment)
    },
    meta: {
      idempotency_hit: s.idempotency_hit === !0
    }
  };
}
async function se(t, e = {}) {
  const s = await j(Z(t, e), { method: "GET" });
  if (!s.ok)
    throw await F(s, "Failed to load assignments");
  return ee(await s.json());
}
async function R(t, e, s, i) {
  const r = {
    expected_version: i.expected_version
  };
  i.idempotency_key && (r.idempotency_key = i.idempotency_key), i.reason && (r.reason = i.reason);
  const n = await j(`${t}/${encodeURIComponent(e)}/actions/${s}`, {
    method: "POST",
    json: r
  });
  if (!n.ok)
    throw await F(n, `Failed to ${s} assignment`);
  return te(await n.json());
}
function ie(t, e, s) {
  return R(t, e, "claim", s);
}
function re(t, e, s) {
  return R(t, e, "release", s);
}
function w(t) {
  return {
    status: t.query.status,
    assigneeId: t.query.assignee_id,
    reviewerId: t.query.reviewer_id,
    dueState: t.query.due_state,
    locale: t.query.locale,
    priority: t.query.priority,
    reviewState: t.review_state,
    translationGroupId: t.query.translation_group_id,
    sort: t.query.sort,
    order: t.query.order,
    page: 1
  };
}
function E(t, e) {
  return `queue-${t}-${e.id}-${e.version}-${Date.now()}`;
}
function ae(t, e) {
  return `queue-${t}-${e.id}-${e.version}-${Date.now()}`;
}
function ne(t) {
  const e = a(t);
  if (!e) return null;
  const s = _.find((r) => r.id === e);
  if (s)
    return { kind: "standard", preset: s };
  const i = S.find((r) => r.id === e);
  return i ? { kind: "review", preset: i } : null;
}
function h(t) {
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
function k(t, e) {
  return {
    enabled: !1,
    permission: t,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function oe(t, e) {
  const s = h(t);
  return e === "claim" ? (s.queue_state = "in_progress", s.status = "in_progress", s.actions.claim = k(t.actions.claim.permission, "assignment must be open pool before it can be claimed"), s.actions.release = {
    enabled: !0,
    permission: t.actions.release.permission
  }, s.review_actions.submit_review = {
    enabled: !0,
    permission: t.review_actions.submit_review.permission
  }, s) : (s.assignment_type = "open_pool", s.queue_state = "pending", s.status = "pending", s.assignee_id = "", s.actions.claim = {
    enabled: !0,
    permission: t.actions.claim.permission
  }, s.actions.release = k(t.actions.release.permission, "assignment must be assigned or in progress before it can be released"), s.review_actions.submit_review = k(t.review_actions.submit_review.permission, "assignment must be in progress"), s);
}
function P(t, e) {
  return t instanceof A ? {
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
function de(t) {
  return a(t.queue_state || t.status);
}
function ce(t) {
  return t === "review" || t === "in_review";
}
function le(t) {
  const e = de(t);
  return ce(e) ? !0 : !!(t.review_actions.approve.enabled || t.review_actions.reject.enabled);
}
function ue(t) {
  return !!t.review_actions.archive.enabled;
}
class pe {
  constructor(e) {
    this.container = null, this.state = "loading", this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set();
    const s = a(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: s || "open"
    };
    const i = ne(s);
    if (i?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = i.preset.id, this.activeReviewState = i.preset.review_state || null, this.queryState = w(i.preset);
      return;
    }
    const r = i?.preset || _[1] || _[0];
    this.activePresetId = r?.id || "open", this.queryState = r ? w(r) : { sort: "updated_at", order: "desc", page: 1 };
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
      const e = await se(this.config.endpoint, this.queryState);
      this.response = e, this.rows = e.data.map((s) => h(s)), this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof A && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  async runInlineAction(e, s) {
    const i = this.rows.findIndex((l) => l.id === s);
    if (i < 0)
      return;
    const r = this.rows[i], n = r.actions[e];
    if (!n.enabled) {
      this.feedback = {
        kind: n.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n.reason || `Cannot ${e} this assignment.`,
        code: n.reason_code || null
      }, this.render();
      return;
    }
    const d = h(r), p = `${e}:${s}`;
    this.pendingActions.add(p), this.feedback = null, this.rows[i] = oe(r, e), this.render();
    try {
      const l = e === "claim" ? await ie(this.config.endpoint, s, {
        expected_version: d.version,
        idempotency_key: E("claim", d)
      }) : await re(this.config.endpoint, s, {
        expected_version: d.version,
        idempotency_key: E("release", d)
      });
      this.rows[i] = h(l.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (l) {
      this.rows[i] = d, this.feedback = P(l, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(p), this.render();
    }
  }
  async runReviewAction(e, s) {
    const i = this.rows.findIndex((l) => l.id === s);
    if (i < 0) return;
    const r = this.rows[i], n = r.review_actions[e];
    if (!n?.enabled) {
      this.feedback = {
        kind: n?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n?.reason || `Cannot ${e} this assignment.`,
        code: n?.reason_code || null
      }, this.render();
      return;
    }
    const d = {
      expected_version: r.version,
      idempotency_key: ae(e, r)
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
      d.reason = l.trim();
    }
    const p = `${e}:${s}`;
    this.pendingActions.add(p), this.feedback = null, this.render();
    try {
      const l = await R(this.config.endpoint, s, e, d);
      this.rows[i] = h(l.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (l) {
      this.feedback = P(l, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(p), this.render();
    }
  }
  setActivePreset(e) {
    const s = this.savedFilterPresets.find((i) => i.id === e);
    s && (this.activePresetId = s.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = w(s), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const s = this.savedReviewFilterPresets.find((i) => i.id === e);
    s && (this.activePresetId = "custom", this.activeReviewPresetId = s.id, this.activeReviewState = s.review_state || null, this.queryState = w(s), this.feedback = null, this.load());
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
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(b) : S.map(b);
  }
  get visibleRows() {
    return this.rows;
  }
  render() {
    if (!this.container)
      return;
    const e = this.config.editorBasePath.replace(/\/translations\/assignments.*$/, "") || "/admin";
    this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        ${B(M(e))}
        <section class="assignment-queue-header">
          <div>
            <p class="${x}">Assignment Queue</p>
            <h1 class="${z}">${o(this.config.title)}</h1>
            <p class="${Q} max-w-2xl">${o(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.visibleRows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="${f}" data-queue-refresh="true">Refresh</button>
          </div>
        </section>
        ${this.renderFeedback()}
        ${this.renderReviewStateBar()}
        ${this.renderPresetBar()}
        ${this.renderFilters()}
        ${this.renderBody()}
      </div>
    `, this.attachEventListeners();
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
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${c(this.feedback.kind)}" role="status" aria-live="polite">
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
            class="${f} queue-preset-button ${this.activePresetId === e.id ? "is-active" : ""}"
            data-preset-id="${c(e.id)}"
            role="tab"
            aria-selected="${this.activePresetId === e.id ? "true" : "false"}"
            title="${c(e.description || e.label)}"
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
          <p class="${x}">Reviewer states</p>
          <p class="review-preset-description">${o(s ? `Signed in as ${s}` : "Reviewer queue states are available when reviewer metadata is present.")}</p>
        </div>
        <div class="assignment-review-presets-grid">
          ${this.savedReviewFilterPresets.map((r) => `
            <button
              type="button"
              class="review-preset-button ${this.activeReviewPresetId === r.id ? "is-active" : ""}"
              data-review-preset-id="${c(r.id)}"
              title="${c(i ? r.description || r.label : "Reviewer metadata is required to use this preset.")}"
              ${i ? "" : 'disabled aria-disabled="true"'}
            >
              <span>${o(r.label)}</span>
              <strong>${e[r.id] ?? 0}</strong>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }
  renderFilters() {
    const e = this.visibleRows, s = ["", "pending", "assigned", "in_progress", "review", "rejected", "approved"], i = ["none", "on_track", "due_soon", "overdue"], r = ["", "low", "normal", "high", "urgent"], n = ["", ...$(e.map((g) => g.target_locale))], d = ["", ...$(e.map((g) => g.assignee_id))], p = ["", ...$(e.map((g) => g.reviewer_id))], l = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : ["updated_at", "due_date", "priority", "status", "locale"];
    return `
      <form class="assignment-queue-filters" data-queue-filters="true">
        ${this.renderSelect("status", "Status", s, this.queryState.status || "")}
        ${this.renderSelect("due_state", "Due State", ["", ...i], this.queryState.dueState || "")}
        ${this.renderSelect("priority", "Priority", r, this.queryState.priority || "")}
        ${this.renderSelect("locale", "Locale", n, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", d, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", p, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", l, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, s, i, r) {
    const n = [...i];
    return r && !n.includes(r) && n.push(r), `
      <label class="queue-filter-field">
        <span>${o(s)}</span>
        <select data-filter-name="${c(e)}">
          ${n.map((d) => `
            <option value="${c(d)}" ${d === r ? "selected" : ""}>
              ${o(d ? y(d) : `All ${s.toLowerCase()}`)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }
  renderBody() {
    const e = this.visibleRows;
    return this.state === "loading" && !this.rows.length ? '<div class="assignment-queue-state" data-queue-state="loading">Loading queue…</div>' : this.state === "error" && !this.rows.length ? this.renderErrorState("error", this.error?.message || "Failed to load queue assignments.") : this.state === "conflict" && !this.rows.length ? this.renderErrorState("conflict", this.error?.message || "The queue response is stale. Refresh and try again.") : e.length ? `
      <div class="assignment-queue-table-wrap">
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
      <div class="assignment-queue-state ${e === "conflict" ? "is-conflict" : "is-error"}" data-queue-state="${e}" role="alert">
        <strong>${e === "conflict" ? "Version conflict" : "Queue unavailable"}</strong>
        <span>${o(s)}</span>
        <button type="button" class="${f}" data-queue-refresh="true">Retry</button>
      </div>
    `;
  }
  renderRow(e) {
    const s = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), r = this.pendingActions.has(`approve:${e.id}`), n = this.pendingActions.has(`reject:${e.id}`), d = this.pendingActions.has(`archive:${e.id}`), p = s || !e.actions.claim.enabled, l = i || !e.actions.release.enabled, g = le(e), T = ue(e);
    return `
      <tr class="assignment-queue-row" tabindex="0" data-assignment-id="${c(e.id)}" data-assignment-row="true" aria-label="${c(me(e))}">
        <td>
          <div class="queue-content-cell">
            <strong>${o(e.source_title || e.source_path || e.id)}</strong>
            <span>${o(e.entity_type)} · ${o(e.source_path || e.translation_group_id)}</span>
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
            ${C(e.queue_state, { domain: "queue", size: "sm" })}
            <span class="queue-content-state">${o(y(e.content_state))}</span>
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
            <span class="due-pill due-${c(e.due_state)}">${o(y(e.due_state))}</span>
            <span>${o(ge(e.due_date))}</span>
          </div>
        </td>
        <td>
          <span class="priority-pill priority-${c(e.priority)}">${o(y(e.priority))}</span>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="${f}"
                data-action="claim"
                data-assignment-id="${c(e.id)}"
                ${p ? "disabled" : ""}
                aria-disabled="${p ? "true" : "false"}"
                title="${c(s ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${s ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="${f}"
                data-action="release"
                data-assignment-id="${c(e.id)}"
                ${l ? "disabled" : ""}
                aria-disabled="${l ? "true" : "false"}"
                title="${c(i ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${i ? "Releasing…" : "Release"}
              </button>
            </div>
            ${g ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="${O}"
                  data-action="approve"
                  data-assignment-id="${c(e.id)}"
                  ${r || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${r || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${c(r ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${r ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="${U}"
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
            ${T ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="${f}"
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
    }), this.container.querySelectorAll("[data-assignment-row]").forEach((e) => {
      e.addEventListener("click", (s) => {
        s.target?.closest("button") || this.openAssignment(e.dataset.assignmentId || "");
      }), e.addEventListener("keydown", (s) => {
        const i = s.key;
        if (i === "Enter" || i === " ") {
          s.preventDefault(), this.openAssignment(e.dataset.assignmentId || "");
          return;
        }
        if (i === "ArrowDown" || i === "ArrowUp") {
          s.preventDefault();
          const r = Array.from(this.container?.querySelectorAll("[data-assignment-row]") || []), n = r.indexOf(e);
          if (n < 0)
            return;
          const d = i === "ArrowDown" ? Math.min(n + 1, r.length - 1) : Math.max(n - 1, 0);
          r[d]?.focus();
        }
      });
    }));
  }
  openAssignment(e) {
    const s = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !s || !e || typeof window > "u" || (window.location.href = `${s}/${encodeURIComponent(e)}/edit`);
  }
}
function me(t) {
  return [
    t.source_title || t.source_path || t.id,
    `${t.source_locale.toUpperCase()} to ${t.target_locale.toUpperCase()}`,
    t.queue_state,
    t.due_state
  ].filter(Boolean).join(", ");
}
function y(t) {
  return t ? t.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function ge(t) {
  if (!t)
    return "No due date";
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : e.toLocaleString(void 0, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
function o(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function c(t) {
  return t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function fe() {
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
function ve() {
  if (typeof document > "u")
    return;
  const t = "assignment-queue-styles";
  if (document.getElementById(t))
    return;
  const e = document.createElement("style");
  e.id = t, e.textContent = fe(), document.head.appendChild(e);
}
function he(t, e) {
  ve();
  const s = new pe(e);
  return s.mount(t), s;
}
function qe(t) {
  const e = t.dataset.endpoint || t.dataset.assignmentListEndpoint || "";
  if (!e)
    return null;
  const s = typeof window < "u" && window?.location?.search ? new URLSearchParams(window.location.search) : null;
  return he(t, {
    endpoint: e,
    editorBasePath: t.dataset.editorBasePath || "",
    title: t.dataset.title,
    description: t.dataset.description,
    initialPresetId: t.dataset.initialPresetId || s?.get("preset") || ""
  });
}
export {
  A as AssignmentQueueRequestError,
  pe as AssignmentQueueScreen,
  S as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  _ as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  oe as applyOptimisticAssignmentAction,
  X as buildAssignmentListQuery,
  Z as buildAssignmentListURL,
  ie as claimAssignment,
  he as createAssignmentQueueScreen,
  se as fetchAssignmentList,
  fe as getAssignmentQueueStyles,
  qe as initAssignmentQueueScreen,
  te as normalizeAssignmentActionResponse,
  J as normalizeAssignmentListMeta,
  ee as normalizeAssignmentListResponse,
  L as normalizeAssignmentListRow,
  w as presetToQueryState,
  re as releaseAssignment
};
//# sourceMappingURL=index.js.map

import { r as P } from "../chunks/translation-status-vocabulary-TlPBUpe_.js";
import { h as x, r as F } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as L } from "../toast/error-helpers.js";
class w extends Error {
  constructor(e) {
    super(e.message), this.name = "AssignmentQueueRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}
const h = [
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
];
function l(t) {
  return t && typeof t == "object" ? t : {};
}
function r(t) {
  return typeof t == "string" ? t.trim() : "";
}
function m(t) {
  return typeof t == "number" && Number.isFinite(t) ? t : 0;
}
function f(t) {
  const e = l(t);
  return {
    enabled: e.enabled === !0,
    reason: r(e.reason) || void 0,
    reason_code: r(e.reason_code) || void 0,
    permission: r(e.permission) || void 0
  };
}
function C(t) {
  const e = l(t), s = r(e.last_rejection_reason), i = r(e.last_reviewer_id);
  if (!(!s && !i))
    return {
      last_rejection_reason: s || void 0,
      last_reviewer_id: i || void 0
    };
}
function T(t) {
  const e = l(t), s = e.enabled === !0, i = m(e.warning_count), n = m(e.blocker_count), a = m(e.finding_count);
  if (!(!s && i <= 0 && n <= 0 && a <= 0))
    return {
      enabled: s,
      warning_count: i,
      blocker_count: n,
      finding_count: a
    };
}
function _(t, e) {
  const s = t.headers.get(e);
  return typeof s == "string" ? s.trim() : "";
}
function z(t) {
  const e = _(t, "x-request-id"), s = _(t, "x-correlation-id"), i = _(t, "x-trace-id") || s || void 0;
  return {
    requestId: e || void 0,
    traceId: i
  };
}
async function D(t, e) {
  return typeof t.clone == "function" ? L(t.clone()) : {
    textCode: null,
    message: await F(t, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function I(t, e) {
  const s = await D(t, e), i = z(t);
  return new w({
    message: s.message || `${e}: ${t.status}`,
    status: t.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function N(t) {
  const e = l(t), s = r(e.id), i = r(e.label);
  if (!s || !i)
    return null;
  const n = l(e.query);
  return {
    id: s,
    label: i,
    description: r(e.description) || void 0,
    query: {
      status: r(n.status) || void 0,
      assignee_id: r(n.assignee_id) || void 0,
      reviewer_id: r(n.reviewer_id) || void 0,
      due_state: r(n.due_state) || void 0,
      locale: r(n.locale) || void 0,
      priority: r(n.priority) || void 0,
      sort: r(n.sort) || void 0,
      order: r(n.order) || void 0
    }
  };
}
function Q(t) {
  const s = (Array.isArray(t) ? t : []).map((i) => N(i)).filter((i) => i !== null);
  return s.length ? s : h.map(q);
}
function q(t) {
  return {
    id: t.id,
    label: t.label,
    description: t.description,
    query: { ...t.query }
  };
}
function v(t) {
  return Array.from(new Set(t.map((e) => r(e)).filter(Boolean)));
}
function B(t) {
  const e = l(t), s = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((n) => r(n)).filter((n) => !!n) : [], i = l(e.default_sort);
  return {
    page: m(e.page) || 1,
    per_page: m(e.per_page) || 25,
    total: m(e.total),
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
    saved_filter_presets: Q(e.saved_filter_presets)
  };
}
function O(t = {}) {
  const e = new URLSearchParams();
  return t.status && e.set("status", t.status), t.assigneeId && e.set("assignee_id", t.assigneeId), t.reviewerId && e.set("reviewer_id", t.reviewerId), t.dueState && e.set("due_state", t.dueState), t.locale && e.set("locale", t.locale), t.priority && e.set("priority", t.priority), t.page && t.page > 0 && e.set("page", String(t.page)), t.perPage && t.perPage > 0 && e.set("per_page", String(t.perPage)), t.sort && e.set("sort", t.sort), t.order && e.set("order", t.order), e.toString();
}
function U(t, e = {}) {
  const s = O(e);
  return s ? `${t}${t.includes("?") ? "&" : "?"}${s}` : t;
}
function R(t) {
  const e = l(t);
  return {
    id: r(e.id),
    translation_group_id: r(e.translation_group_id),
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
    queue_state: r(e.queue_state) || "pending",
    status: r(e.status) || "pending",
    priority: r(e.priority) || "normal",
    due_state: r(e.due_state) || "none",
    due_date: r(e.due_date) || void 0,
    row_version: m(e.row_version || e.version),
    version: m(e.version || e.row_version),
    updated_at: r(e.updated_at),
    created_at: r(e.created_at),
    actions: {
      claim: f(l(e.actions).claim),
      release: f(l(e.actions).release)
    },
    review_actions: {
      submit_review: f(l(e.review_actions).submit_review),
      approve: f(l(e.review_actions).approve),
      reject: f(l(e.review_actions).reject),
      archive: f(l(e.review_actions).archive)
    },
    last_rejection_reason: r(e.last_rejection_reason) || void 0,
    review_feedback: C(e.review_feedback),
    qa_summary: T(e.qa_summary)
  };
}
function M(t) {
  const e = l(t);
  return {
    data: (Array.isArray(e.data) ? e.data : []).map((i) => R(i)),
    meta: B(e.meta)
  };
}
function K(t) {
  const e = l(t), s = l(e.meta), i = l(e.data);
  return {
    data: {
      assignment_id: r(i.assignment_id),
      status: r(i.status) || "pending",
      row_version: m(i.row_version),
      updated_at: r(i.updated_at),
      assignment: R(i.assignment)
    },
    meta: {
      idempotency_hit: s.idempotency_hit === !0
    }
  };
}
async function H(t, e = {}) {
  const s = await x(U(t, e), { method: "GET" });
  if (!s.ok)
    throw await I(s, "Failed to load assignments");
  return M(await s.json());
}
async function k(t, e, s, i) {
  const n = {
    expected_version: i.expected_version
  };
  i.idempotency_key && (n.idempotency_key = i.idempotency_key), i.reason && (n.reason = i.reason);
  const a = await x(`${t}/${encodeURIComponent(e)}/actions/${s}`, {
    method: "POST",
    json: n
  });
  if (!a.ok)
    throw await I(a, `Failed to ${s} assignment`);
  return K(await a.json());
}
function V(t, e, s) {
  return k(t, e, "claim", s);
}
function G(t, e, s) {
  return k(t, e, "release", s);
}
function $(t) {
  return {
    status: t.query.status,
    assigneeId: t.query.assignee_id,
    reviewerId: t.query.reviewer_id,
    dueState: t.query.due_state,
    locale: t.query.locale,
    priority: t.query.priority,
    sort: t.query.sort,
    order: t.query.order,
    page: 1
  };
}
function A(t, e) {
  return `queue-${t}-${e.id}-${e.version}-${Date.now()}`;
}
function Y(t, e) {
  return `queue-${t}-${e.id}-${e.version}-${Date.now()}`;
}
function g(t) {
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
function y(t, e) {
  return {
    enabled: !1,
    permission: t,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function J(t, e) {
  const s = g(t);
  return e === "claim" ? (s.queue_state = "in_progress", s.status = "in_progress", s.actions.claim = y(t.actions.claim.permission, "assignment must be open pool before it can be claimed"), s.actions.release = {
    enabled: !0,
    permission: t.actions.release.permission
  }, s.review_actions.submit_review = {
    enabled: !0,
    permission: t.review_actions.submit_review.permission
  }, s) : (s.assignment_type = "open_pool", s.queue_state = "pending", s.status = "pending", s.assignee_id = "", s.actions.claim = {
    enabled: !0,
    permission: t.actions.claim.permission
  }, s.actions.release = y(t.actions.release.permission, "assignment must be assigned or in progress before it can be released"), s.review_actions.submit_review = y(t.review_actions.submit_review.permission, "assignment must be in progress"), s);
}
function S(t, e) {
  return t instanceof w ? {
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
function W(t) {
  return r(t.queue_state || t.status);
}
function X(t) {
  return t === "review" || t === "in_review";
}
function Z(t) {
  const e = W(t);
  return X(e) ? !0 : !!(t.review_actions.approve.enabled || t.review_actions.reject.enabled);
}
function ee(t) {
  return !!t.review_actions.archive.enabled;
}
class te {
  constructor(e) {
    this.container = null, this.state = "loading", this.response = null, this.rows = [], this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.config = {
      endpoint: e.endpoint,
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: e.initialPresetId || "open"
    };
    const s = h.find((i) => i.id === this.config.initialPresetId) || h[1] || h[0];
    this.activePresetId = s?.id || "open", this.queryState = s ? $(s) : { sort: "updated_at", order: "desc", page: 1 };
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
    return this.rows.map((e) => g(e));
  }
  getFeedback() {
    return this.feedback ? { ...this.feedback } : null;
  }
  getActivePresetId() {
    return this.activePresetId;
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await H(this.config.endpoint, this.queryState);
      this.response = e, this.rows = e.data.map((s) => g(s)), this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof w && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  async runInlineAction(e, s) {
    const i = this.rows.findIndex((o) => o.id === s);
    if (i < 0)
      return;
    const n = this.rows[i], a = n.actions[e];
    if (!a.enabled) {
      this.feedback = {
        kind: a.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: a.reason || `Cannot ${e} this assignment.`,
        code: a.reason_code || null
      }, this.render();
      return;
    }
    const d = g(n), p = `${e}:${s}`;
    this.pendingActions.add(p), this.feedback = null, this.rows[i] = J(n, e), this.render();
    try {
      const o = e === "claim" ? await V(this.config.endpoint, s, {
        expected_version: d.version,
        idempotency_key: A("claim", d)
      }) : await G(this.config.endpoint, s, {
        expected_version: d.version,
        idempotency_key: A("release", d)
      });
      this.rows[i] = g(o.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (o) {
      this.rows[i] = d, this.feedback = S(o, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(p), this.render();
    }
  }
  async runReviewAction(e, s) {
    const i = this.rows.findIndex((o) => o.id === s);
    if (i < 0) return;
    const n = this.rows[i], a = n.review_actions[e];
    if (!a?.enabled) {
      this.feedback = {
        kind: a?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: a?.reason || `Cannot ${e} this assignment.`,
        code: a?.reason_code || null
      }, this.render();
      return;
    }
    const d = {
      expected_version: n.version,
      idempotency_key: Y(e, n)
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
    const p = `${e}:${s}`;
    this.pendingActions.add(p), this.feedback = null, this.render();
    try {
      const o = await k(this.config.endpoint, s, e, d);
      this.rows[i] = g(o.data.assignment), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Assignment rejected." : "Assignment archived."
      };
    } catch (o) {
      this.feedback = S(o, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(p), this.render();
    }
  }
  setActivePreset(e) {
    const s = this.savedFilterPresets.find((i) => i.id === e);
    s && (this.activePresetId = s.id, this.queryState = $(s), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(q) : h.map(q);
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="assignment-queue-kicker">Assignment Queue</p>
            <h1 class="assignment-queue-title">${c(this.config.title)}</h1>
            <p class="assignment-queue-description">${c(this.config.description)}</p>
          </div>
          <div class="assignment-queue-summary">
            <span class="summary-pill">Rows ${this.rows.length}</span>
            <span class="summary-pill">Total ${this.response?.meta.total ?? 0}</span>
            <button type="button" class="queue-refresh-button" data-queue-refresh="true">Refresh</button>
          </div>
        </section>
        ${this.renderFeedback()}
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
      this.feedback.code ? `Code ${c(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${c(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${c(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${u(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${c(this.feedback.message)}</strong>
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
            class="queue-preset-button ${this.activePresetId === e.id ? "is-active" : ""}"
            data-preset-id="${u(e.id)}"
            role="tab"
            aria-selected="${this.activePresetId === e.id ? "true" : "false"}"
            title="${u(e.description || e.label)}"
          >
            ${c(e.label)}
          </button>
        `).join("")}
      </div>
    `;
  }
  renderFilters() {
    const e = ["", "pending", "assigned", "in_progress", "review", "rejected", "approved"], s = ["none", "on_track", "due_soon", "overdue"], i = ["", "low", "normal", "high", "urgent"], n = ["", ...v(this.rows.map((o) => o.target_locale))], a = ["", ...v(this.rows.map((o) => o.assignee_id))], d = ["", ...v(this.rows.map((o) => o.reviewer_id))], p = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : ["updated_at", "due_date", "priority", "status", "locale"];
    return `
      <form class="assignment-queue-filters" data-queue-filters="true">
        ${this.renderSelect("status", "Status", e, this.queryState.status || "")}
        ${this.renderSelect("due_state", "Due State", ["", ...s], this.queryState.dueState || "")}
        ${this.renderSelect("priority", "Priority", i, this.queryState.priority || "")}
        ${this.renderSelect("locale", "Locale", n, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", a, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", d, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", p, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, s, i, n) {
    const a = [...i];
    return n && !a.includes(n) && a.push(n), `
      <label class="queue-filter-field">
        <span>${c(s)}</span>
        <select data-filter-name="${u(e)}">
          ${a.map((d) => `
            <option value="${u(d)}" ${d === n ? "selected" : ""}>
              ${c(d ? b(d) : `All ${s.toLowerCase()}`)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }
  renderBody() {
    return this.state === "loading" && !this.rows.length ? '<div class="assignment-queue-state" data-queue-state="loading">Loading queue…</div>' : this.state === "error" && !this.rows.length ? this.renderErrorState("error", this.error?.message || "Failed to load queue assignments.") : this.state === "conflict" && !this.rows.length ? this.renderErrorState("conflict", this.error?.message || "The queue response is stale. Refresh and try again.") : this.rows.length ? `
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
            ${this.rows.map((e) => this.renderRow(e)).join("")}
          </tbody>
        </table>
      </div>
    ` : '<div class="assignment-queue-state" data-queue-state="empty">No assignments match the current filters.</div>';
  }
  renderErrorState(e, s) {
    return `
      <div class="assignment-queue-state ${e === "conflict" ? "is-conflict" : "is-error"}" data-queue-state="${e}" role="alert">
        <strong>${e === "conflict" ? "Version conflict" : "Queue unavailable"}</strong>
        <span>${c(s)}</span>
        <button type="button" class="queue-refresh-button" data-queue-refresh="true">Retry</button>
      </div>
    `;
  }
  renderRow(e) {
    const s = this.pendingActions.has(`claim:${e.id}`), i = this.pendingActions.has(`release:${e.id}`), n = this.pendingActions.has(`approve:${e.id}`), a = this.pendingActions.has(`reject:${e.id}`), d = this.pendingActions.has(`archive:${e.id}`), p = s || !e.actions.claim.enabled, o = i || !e.actions.release.enabled, j = Z(e), E = ee(e);
    return `
      <tr class="assignment-queue-row" tabindex="0" data-assignment-id="${u(e.id)}" data-assignment-row="true" aria-label="${u(se(e))}">
        <td>
          <div class="queue-content-cell">
            <strong>${c(e.source_title || e.source_path || e.id)}</strong>
            <span>${c(e.entity_type)} · ${c(e.source_path || e.translation_group_id)}</span>
          </div>
        </td>
        <td>
          <div class="queue-locale-cell">
            <span class="locale-pill">${c(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-pill locale-target">${c(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td>
          <div class="queue-status-cell">
            ${P(e.queue_state, { domain: "queue", size: "sm" })}
            <span class="queue-content-state">${c(b(e.content_state))}</span>
            ${e.qa_summary?.enabled ? `
              <span class="queue-qa-chip ${e.qa_summary.blocker_count > 0 ? "is-blocked" : ""}">
                QA ${e.qa_summary.finding_count}
              </span>
            ` : ""}
          </div>
        </td>
        <td>
          <div class="queue-owner-cell">
            <span><strong>Assignee:</strong> ${c(e.assignee_id || "Open pool")}</span>
            <span><strong>Reviewer:</strong> ${c(e.reviewer_id || "Not set")}</span>
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${c(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            <span class="due-pill due-${u(e.due_state)}">${c(b(e.due_state))}</span>
            <span>${c(ie(e.due_date))}</span>
          </div>
        </td>
        <td>
          <span class="priority-pill priority-${u(e.priority)}">${c(b(e.priority))}</span>
        </td>
        <td>
          <div class="queue-action-cell">
            <div class="queue-action-group" data-action-group="lifecycle">
              <button
                type="button"
                class="queue-action-button"
                data-action="claim"
                data-assignment-id="${u(e.id)}"
                ${p ? "disabled" : ""}
                aria-disabled="${p ? "true" : "false"}"
                title="${u(s ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
              >
                ${s ? "Claiming…" : "Claim"}
              </button>
              <button
                type="button"
                class="queue-action-button"
                data-action="release"
                data-assignment-id="${u(e.id)}"
                ${o ? "disabled" : ""}
                aria-disabled="${o ? "true" : "false"}"
                title="${u(i ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
              >
                ${i ? "Releasing…" : "Release"}
              </button>
            </div>
            ${j ? `
              <div class="queue-action-group" data-action-group="review">
                <button
                  type="button"
                  class="queue-action-button review-approve-button"
                  data-action="approve"
                  data-assignment-id="${u(e.id)}"
                  ${n || !e.review_actions.approve.enabled ? "disabled" : ""}
                  aria-disabled="${n || !e.review_actions.approve.enabled ? "true" : "false"}"
                  title="${u(n ? "Approving assignment…" : e.review_actions.approve.reason || "Approve assignment")}"
                >
                  ${n ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  class="queue-action-button review-reject-button"
                  data-action="reject"
                  data-assignment-id="${u(e.id)}"
                  ${a || !e.review_actions.reject.enabled ? "disabled" : ""}
                  aria-disabled="${a || !e.review_actions.reject.enabled ? "true" : "false"}"
                  title="${u(a ? "Rejecting assignment…" : e.review_actions.reject.reason || "Reject assignment")}"
                >
                  ${a ? "Rejecting…" : "Reject"}
                </button>
              </div>
            ` : ""}
            ${E ? `
              <div class="queue-action-group" data-action-group="manage">
                <button
                  type="button"
                  class="queue-action-button review-archive-button"
                  data-action="archive"
                  data-assignment-id="${u(e.id)}"
                  ${d || !e.review_actions.archive.enabled ? "disabled" : ""}
                  aria-disabled="${d || !e.review_actions.archive.enabled ? "true" : "false"}"
                  title="${u(d ? "Archiving assignment…" : e.review_actions.archive.reason || "Archive assignment")}"
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
          const n = Array.from(this.container?.querySelectorAll("[data-assignment-row]") || []), a = n.indexOf(e);
          if (a < 0)
            return;
          const d = i === "ArrowDown" ? Math.min(a + 1, n.length - 1) : Math.max(a - 1, 0);
          n[d]?.focus();
        }
      });
    }));
  }
  openAssignment(e) {
    const s = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !s || !e || typeof window > "u" || (window.location.href = `${s}/${encodeURIComponent(e)}/edit`);
  }
}
function se(t) {
  return [
    t.source_title || t.source_path || t.id,
    `${t.source_locale.toUpperCase()} to ${t.target_locale.toUpperCase()}`,
    t.queue_state,
    t.due_state
  ].filter(Boolean).join(", ");
}
function b(t) {
  return t ? t.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function ie(t) {
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
function c(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function u(t) {
  return t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function re() {
  return `
    .assignment-queue-screen {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 40%);
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      border: 1px solid #dbe4ee;
    }

    .assignment-queue-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .assignment-queue-kicker {
      margin: 0;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #64748b;
      font-weight: 700;
    }

    .assignment-queue-title {
      margin: 0.35rem 0 0;
      font-size: 2rem;
      line-height: 1.1;
      color: #0f172a;
    }

    .assignment-queue-description {
      margin: 0.5rem 0 0;
      color: #475569;
      max-width: 52rem;
    }

    .assignment-queue-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .summary-pill,
    .queue-refresh-button,
    .queue-preset-button,
    .queue-action-button,
    .queue-filter-field select {
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font: inherit;
    }

    .summary-pill {
      padding: 0.45rem 0.8rem;
      font-size: 0.85rem;
      color: #334155;
    }

    .queue-refresh-button,
    .queue-action-button,
    .queue-preset-button {
      cursor: pointer;
      padding: 0.55rem 0.95rem;
      transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .queue-refresh-button:hover,
    .queue-action-button:hover,
    .queue-preset-button:hover {
      border-color: #2563eb;
      transform: translateY(-1px);
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

    .queue-preset-button.is-active {
      background: #0f172a;
      border-color: #0f172a;
      color: #f8fafc;
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
      color: #334155;
      font-size: 0.9rem;
    }

    .queue-filter-field select {
      padding: 0.7rem 0.9rem;
    }

    .assignment-queue-state {
      border: 1px dashed #cbd5e1;
      border-radius: 1rem;
      padding: 2rem;
      background: #f8fafc;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .assignment-queue-state.is-error {
      background: #fff1f2;
      border-color: #fda4af;
      color: #9f1239;
    }

    .assignment-queue-state.is-conflict {
      background: #fff7ed;
      border-color: #fdba74;
      color: #9a3412;
    }

    .assignment-queue-table-wrap {
      overflow-x: auto;
      border-radius: 1rem;
      border: 1px solid #dbe4ee;
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
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      vertical-align: middle;
    }

    .assignment-queue-table th {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      background: #f8fafc;
    }

    .assignment-queue-row {
      outline: none;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }

    .assignment-queue-row:hover,
    .assignment-queue-row:focus {
      background: #f8fafc;
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
      color: #475569;
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
      background: #e2e8f0;
      color: #0f172a;
    }

    .locale-pill.locale-target {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .locale-arrow {
      color: #64748b;
      font-weight: 700;
    }

    .priority-low {
      background: #f1f5f9;
      color: #475569;
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
      background: #e2e8f0;
      color: #475569;
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

    .review-approve-button {
      border-color: #86efac;
      color: #166534;
    }

    .review-reject-button {
      border-color: #fda4af;
      color: #be123c;
    }

    .queue-action-button[disabled],
    .queue-action-button[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.55;
      transform: none;
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
function ne() {
  if (typeof document > "u")
    return;
  const t = "assignment-queue-styles";
  if (document.getElementById(t))
    return;
  const e = document.createElement("style");
  e.id = t, e.textContent = re(), document.head.appendChild(e);
}
function ae(t, e) {
  ne();
  const s = new te(e);
  return s.mount(t), s;
}
function ue(t) {
  const e = t.dataset.endpoint || t.dataset.assignmentListEndpoint || "";
  return e ? ae(t, {
    endpoint: e,
    editorBasePath: t.dataset.editorBasePath || "",
    title: t.dataset.title,
    description: t.dataset.description,
    initialPresetId: t.dataset.initialPresetId
  }) : null;
}
export {
  w as AssignmentQueueRequestError,
  te as AssignmentQueueScreen,
  h as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  J as applyOptimisticAssignmentAction,
  O as buildAssignmentListQuery,
  U as buildAssignmentListURL,
  V as claimAssignment,
  ae as createAssignmentQueueScreen,
  H as fetchAssignmentList,
  re as getAssignmentQueueStyles,
  ue as initAssignmentQueueScreen,
  K as normalizeAssignmentActionResponse,
  B as normalizeAssignmentListMeta,
  M as normalizeAssignmentListResponse,
  R as normalizeAssignmentListRow,
  $ as presetToQueryState,
  G as releaseAssignment
};
//# sourceMappingURL=index.js.map

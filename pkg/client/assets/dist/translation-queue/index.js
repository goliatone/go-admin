import { r as E } from "../chunks/translation-status-vocabulary-TlPBUpe_.js";
import { h as S, r as P } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as R } from "../toast/error-helpers.js";
class w extends Error {
  constructor(e) {
    super(e.message), this.name = "AssignmentQueueRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}
const f = [
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
function d(t) {
  return t && typeof t == "object" ? t : {};
}
function i(t) {
  return typeof t == "string" ? t.trim() : "";
}
function p(t) {
  return typeof t == "number" && Number.isFinite(t) ? t : 0;
}
function m(t) {
  const e = d(t);
  return {
    enabled: e.enabled === !0,
    reason: i(e.reason) || void 0,
    reason_code: i(e.reason_code) || void 0,
    permission: i(e.permission) || void 0
  };
}
function _(t, e) {
  const s = t.headers.get(e);
  return typeof s == "string" ? s.trim() : "";
}
function F(t) {
  const e = _(t, "x-request-id"), s = _(t, "x-correlation-id"), r = _(t, "x-trace-id") || s || void 0;
  return {
    requestId: e || void 0,
    traceId: r
  };
}
async function L(t, e) {
  return typeof t.clone == "function" ? R(t.clone()) : {
    textCode: null,
    message: await P(t, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function x(t, e) {
  const s = await L(t, e), r = F(t);
  return new w({
    message: s.message || `${e}: ${t.status}`,
    status: t.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: r.requestId,
    traceId: r.traceId
  });
}
function C(t) {
  const e = d(t), s = i(e.id), r = i(e.label);
  if (!s || !r)
    return null;
  const a = d(e.query);
  return {
    id: s,
    label: r,
    description: i(e.description) || void 0,
    query: {
      status: i(a.status) || void 0,
      assignee_id: i(a.assignee_id) || void 0,
      reviewer_id: i(a.reviewer_id) || void 0,
      due_state: i(a.due_state) || void 0,
      locale: i(a.locale) || void 0,
      priority: i(a.priority) || void 0,
      sort: i(a.sort) || void 0,
      order: i(a.order) || void 0
    }
  };
}
function T(t) {
  const s = (Array.isArray(t) ? t : []).map((r) => C(r)).filter((r) => r !== null);
  return s.length ? s : f.map(q);
}
function q(t) {
  return {
    id: t.id,
    label: t.label,
    description: t.description,
    query: { ...t.query }
  };
}
function y(t) {
  return Array.from(new Set(t.map((e) => i(e)).filter(Boolean)));
}
function j(t) {
  const e = d(t), s = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((a) => i(a)).filter((a) => !!a) : [], r = d(e.default_sort);
  return {
    page: p(e.page) || 1,
    per_page: p(e.per_page) || 25,
    total: p(e.total),
    updated_at: i(e.updated_at) || void 0,
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
      key: i(r.key) || "updated_at",
      order: i(r.order) || "desc"
    },
    saved_filter_presets: T(e.saved_filter_presets)
  };
}
function z(t = {}) {
  const e = new URLSearchParams();
  return t.status && e.set("status", t.status), t.assigneeId && e.set("assignee_id", t.assigneeId), t.reviewerId && e.set("reviewer_id", t.reviewerId), t.dueState && e.set("due_state", t.dueState), t.locale && e.set("locale", t.locale), t.priority && e.set("priority", t.priority), t.page && t.page > 0 && e.set("page", String(t.page)), t.perPage && t.perPage > 0 && e.set("per_page", String(t.perPage)), t.sort && e.set("sort", t.sort), t.order && e.set("order", t.order), e.toString();
}
function N(t, e = {}) {
  const s = z(e);
  return s ? `${t}${t.includes("?") ? "&" : "?"}${s}` : t;
}
function A(t) {
  const e = d(t);
  return {
    id: i(e.id),
    translation_group_id: i(e.translation_group_id),
    entity_type: i(e.entity_type),
    source_record_id: i(e.source_record_id),
    target_record_id: i(e.target_record_id),
    source_locale: i(e.source_locale),
    target_locale: i(e.target_locale),
    work_scope: i(e.work_scope) || void 0,
    source_title: i(e.source_title),
    source_path: i(e.source_path),
    assignee_id: i(e.assignee_id),
    reviewer_id: i(e.reviewer_id),
    assignment_type: i(e.assignment_type),
    content_state: i(e.content_state),
    queue_state: i(e.queue_state) || "pending",
    status: i(e.status) || "pending",
    priority: i(e.priority) || "normal",
    due_state: i(e.due_state) || "none",
    due_date: i(e.due_date) || void 0,
    row_version: p(e.row_version || e.version),
    version: p(e.version || e.row_version),
    updated_at: i(e.updated_at),
    created_at: i(e.created_at),
    actions: {
      claim: m(d(e.actions).claim),
      release: m(d(e.actions).release)
    },
    review_actions: {
      submit_review: m(d(e.review_actions).submit_review),
      approve: m(d(e.review_actions).approve),
      reject: m(d(e.review_actions).reject)
    }
  };
}
function D(t) {
  const e = d(t);
  return {
    data: (Array.isArray(e.data) ? e.data : []).map((r) => A(r)),
    meta: j(e.meta)
  };
}
function B(t) {
  const e = d(t), s = d(e.meta), r = d(e.data);
  return {
    data: {
      assignment_id: i(r.assignment_id),
      status: i(r.status) || "pending",
      row_version: p(r.row_version),
      updated_at: i(r.updated_at),
      assignment: A(r.assignment)
    },
    meta: {
      idempotency_hit: s.idempotency_hit === !0
    }
  };
}
async function Q(t, e = {}) {
  const s = await S(N(t, e), { method: "GET" });
  if (!s.ok)
    throw await x(s, "Failed to load assignments");
  return D(await s.json());
}
async function I(t, e, s, r) {
  const a = {
    expected_version: r.expected_version
  };
  r.idempotency_key && (a.idempotency_key = r.idempotency_key);
  const n = await S(`${t}/${encodeURIComponent(e)}/actions/${s}`, {
    method: "POST",
    json: a
  });
  if (!n.ok)
    throw await x(n, `Failed to ${s} assignment`);
  return B(await n.json());
}
function O(t, e, s) {
  return I(t, e, "claim", s);
}
function U(t, e, s) {
  return I(t, e, "release", s);
}
function k(t) {
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
function $(t, e) {
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
      reject: { ...t.review_actions.reject }
    }
  };
}
function v(t, e) {
  return {
    enabled: !1,
    permission: t,
    reason: e,
    reason_code: "INVALID_STATUS"
  };
}
function M(t, e) {
  const s = g(t);
  return e === "claim" ? (s.queue_state = "in_progress", s.status = "in_progress", s.actions.claim = v(t.actions.claim.permission, "assignment must be open pool before it can be claimed"), s.actions.release = {
    enabled: !0,
    permission: t.actions.release.permission
  }, s.review_actions.submit_review = {
    enabled: !0,
    permission: t.review_actions.submit_review.permission
  }, s) : (s.assignment_type = "open_pool", s.queue_state = "pending", s.status = "pending", s.assignee_id = "", s.actions.claim = {
    enabled: !0,
    permission: t.actions.claim.permission
  }, s.actions.release = v(t.actions.release.permission, "assignment must be assigned or in progress before it can be released"), s.review_actions.submit_review = v(t.review_actions.submit_review.permission, "assignment must be in progress"), s);
}
function H(t, e) {
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
class K {
  constructor(e) {
    this.container = null, this.state = "loading", this.response = null, this.rows = [], this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.config = {
      endpoint: e.endpoint,
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: e.initialPresetId || "open"
    };
    const s = f.find((r) => r.id === this.config.initialPresetId) || f[1] || f[0];
    this.activePresetId = s?.id || "open", this.queryState = s ? k(s) : { sort: "updated_at", order: "desc", page: 1 };
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
      const e = await Q(this.config.endpoint, this.queryState);
      this.response = e, this.rows = e.data.map((s) => g(s)), this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof w && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  async runInlineAction(e, s) {
    const r = this.rows.findIndex((l) => l.id === s);
    if (r < 0)
      return;
    const a = this.rows[r], n = a.actions[e];
    if (!n.enabled) {
      this.feedback = {
        kind: n.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: n.reason || `Cannot ${e} this assignment.`,
        code: n.reason_code || null
      }, this.render();
      return;
    }
    const c = g(a), h = `${e}:${s}`;
    this.pendingActions.add(h), this.feedback = null, this.rows[r] = M(a, e), this.render();
    try {
      const l = e === "claim" ? await O(this.config.endpoint, s, {
        expected_version: c.version,
        idempotency_key: $("claim", c)
      }) : await U(this.config.endpoint, s, {
        expected_version: c.version,
        idempotency_key: $("release", c)
      });
      this.rows[r] = g(l.data.assignment), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (l) {
      this.rows[r] = c, this.feedback = H(l, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(h), this.render();
    }
  }
  setActivePreset(e) {
    const s = this.savedFilterPresets.find((r) => r.id === e);
    s && (this.activePresetId = s.id, this.queryState = k(s), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(q) : f.map(q);
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        <section class="assignment-queue-header">
          <div>
            <p class="assignment-queue-kicker">Assignment Queue</p>
            <h1 class="assignment-queue-title">${o(this.config.title)}</h1>
            <p class="assignment-queue-description">${o(this.config.description)}</p>
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
      this.feedback.code ? `Code ${o(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${o(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${o(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${u(this.feedback.kind)}" role="status" aria-live="polite">
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
            class="queue-preset-button ${this.activePresetId === e.id ? "is-active" : ""}"
            data-preset-id="${u(e.id)}"
            role="tab"
            aria-selected="${this.activePresetId === e.id ? "true" : "false"}"
            title="${u(e.description || e.label)}"
          >
            ${o(e.label)}
          </button>
        `).join("")}
      </div>
    `;
  }
  renderFilters() {
    const e = ["", "pending", "assigned", "in_progress", "review", "rejected", "approved"], s = ["none", "on_track", "due_soon", "overdue"], r = ["", "low", "normal", "high", "urgent"], a = ["", ...y(this.rows.map((l) => l.target_locale))], n = ["", ...y(this.rows.map((l) => l.assignee_id))], c = ["", ...y(this.rows.map((l) => l.reviewer_id))], h = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : ["updated_at", "due_date", "priority", "status", "locale"];
    return `
      <form class="assignment-queue-filters" data-queue-filters="true">
        ${this.renderSelect("status", "Status", e, this.queryState.status || "")}
        ${this.renderSelect("due_state", "Due State", ["", ...s], this.queryState.dueState || "")}
        ${this.renderSelect("priority", "Priority", r, this.queryState.priority || "")}
        ${this.renderSelect("locale", "Locale", a, this.queryState.locale || "")}
        ${this.renderSelect("assignee_id", "Assignee", n, this.queryState.assigneeId || "")}
        ${this.renderSelect("reviewer_id", "Reviewer", c, this.queryState.reviewerId || "")}
        ${this.renderSelect("sort", "Sort", h, this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"))}
        ${this.renderSelect("order", "Order", ["asc", "desc"], this.queryState.order || (this.response?.meta.default_sort.order ?? "desc"))}
      </form>
    `;
  }
  renderSelect(e, s, r, a) {
    const n = [...r];
    return a && !n.includes(a) && n.push(a), `
      <label class="queue-filter-field">
        <span>${o(s)}</span>
        <select data-filter-name="${u(e)}">
          ${n.map((c) => `
            <option value="${u(c)}" ${c === a ? "selected" : ""}>
              ${o(c ? b(c) : `All ${s.toLowerCase()}`)}
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
        <span>${o(s)}</span>
        <button type="button" class="queue-refresh-button" data-queue-refresh="true">Retry</button>
      </div>
    `;
  }
  renderRow(e) {
    const s = this.pendingActions.has(`claim:${e.id}`), r = this.pendingActions.has(`release:${e.id}`), a = s || !e.actions.claim.enabled, n = r || !e.actions.release.enabled;
    return `
      <tr class="assignment-queue-row" tabindex="0" data-assignment-id="${u(e.id)}" data-assignment-row="true" aria-label="${u(V(e))}">
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
            ${E(e.queue_state, { domain: "queue", size: "sm" })}
            <span class="queue-content-state">${o(b(e.content_state))}</span>
          </div>
        </td>
        <td>
          <div class="queue-owner-cell">
            <span><strong>Assignee:</strong> ${o(e.assignee_id || "Open pool")}</span>
            <span><strong>Reviewer:</strong> ${o(e.reviewer_id || "Not set")}</span>
          </div>
        </td>
        <td>
          <div class="queue-due-cell">
            <span class="due-pill due-${u(e.due_state)}">${o(b(e.due_state))}</span>
            <span>${o(G(e.due_date))}</span>
          </div>
        </td>
        <td>
          <span class="priority-pill priority-${u(e.priority)}">${o(b(e.priority))}</span>
        </td>
        <td>
          <div class="queue-action-cell">
            <button
              type="button"
              class="queue-action-button"
              data-action="claim"
              data-assignment-id="${u(e.id)}"
              ${a ? "disabled" : ""}
              aria-disabled="${a ? "true" : "false"}"
              title="${u(s ? "Claiming assignment…" : e.actions.claim.reason || "Claim assignment")}"
            >
              ${s ? "Claiming…" : "Claim"}
            </button>
            <button
              type="button"
              class="queue-action-button"
              data-action="release"
              data-assignment-id="${u(e.id)}"
              ${n ? "disabled" : ""}
              aria-disabled="${n ? "true" : "false"}"
              title="${u(r ? "Releasing assignment…" : e.actions.release.reason || "Release assignment")}"
            >
              ${r ? "Releasing…" : "Release"}
            </button>
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
        const r = e.value.trim();
        switch (s) {
          case "status":
            this.updateFilter({ status: r || void 0 });
            break;
          case "due_state":
            this.updateFilter({ dueState: r || void 0 });
            break;
          case "priority":
            this.updateFilter({ priority: r || void 0 });
            break;
          case "locale":
            this.updateFilter({ locale: r || void 0 });
            break;
          case "assignee_id":
            this.updateFilter({ assigneeId: r || void 0 });
            break;
          case "reviewer_id":
            this.updateFilter({ reviewerId: r || void 0 });
            break;
          case "sort":
            this.updateFilter({ sort: r || void 0 });
            break;
          case "order":
            this.updateFilter({ order: r || void 0 });
            break;
        }
      });
    }), this.container.querySelectorAll("[data-queue-refresh]").forEach((e) => {
      e.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-action]").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.action, r = e.dataset.assignmentId;
        (s === "claim" || s === "release") && r && this.runInlineAction(s, r);
      });
    }), this.container.querySelectorAll("[data-assignment-row]").forEach((e) => {
      e.addEventListener("click", (s) => {
        s.target?.closest("button") || this.openAssignment(e.dataset.assignmentId || "");
      }), e.addEventListener("keydown", (s) => {
        const r = s.key;
        if (r === "Enter" || r === " ") {
          s.preventDefault(), this.openAssignment(e.dataset.assignmentId || "");
          return;
        }
        if (r === "ArrowDown" || r === "ArrowUp") {
          s.preventDefault();
          const a = Array.from(this.container?.querySelectorAll("[data-assignment-row]") || []), n = a.indexOf(e);
          if (n < 0)
            return;
          const c = r === "ArrowDown" ? Math.min(n + 1, a.length - 1) : Math.max(n - 1, 0);
          a[c]?.focus();
        }
      });
    }));
  }
  openAssignment(e) {
    const s = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !s || !e || typeof window > "u" || (window.location.href = `${s}/${encodeURIComponent(e)}/edit`);
  }
}
function V(t) {
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
function G(t) {
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
function u(t) {
  return t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function Y() {
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

    .queue-action-cell {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
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
function J() {
  if (typeof document > "u")
    return;
  const t = "assignment-queue-styles";
  if (document.getElementById(t))
    return;
  const e = document.createElement("style");
  e.id = t, e.textContent = Y(), document.head.appendChild(e);
}
function W(t, e) {
  J();
  const s = new K(e);
  return s.mount(t), s;
}
function te(t) {
  const e = t.dataset.endpoint || t.dataset.assignmentListEndpoint || "";
  return e ? W(t, {
    endpoint: e,
    editorBasePath: t.dataset.editorBasePath || "",
    title: t.dataset.title,
    description: t.dataset.description,
    initialPresetId: t.dataset.initialPresetId
  }) : null;
}
export {
  w as AssignmentQueueRequestError,
  K as AssignmentQueueScreen,
  f as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  M as applyOptimisticAssignmentAction,
  z as buildAssignmentListQuery,
  N as buildAssignmentListURL,
  O as claimAssignment,
  W as createAssignmentQueueScreen,
  Q as fetchAssignmentList,
  Y as getAssignmentQueueStyles,
  te as initAssignmentQueueScreen,
  B as normalizeAssignmentActionResponse,
  j as normalizeAssignmentListMeta,
  D as normalizeAssignmentListResponse,
  A as normalizeAssignmentListRow,
  k as presetToQueryState,
  U as releaseAssignment
};
//# sourceMappingURL=index.js.map

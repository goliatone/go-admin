import { escapeAttribute as c, escapeHTML as p } from "../shared/html.js";
import { httpRequest as F, readHTTPError as fe } from "../shared/transport/http-client.js";
import { extractStructuredError as ge } from "../toast/error-helpers.js";
import { T as ve, Y as G, c as be, h as ye, i as _e, l as we, o as O, t as ke, v as x, x as qe, y as $e } from "../chunks/grouped-mode-BKMTJtyG.js";
import "../chunks/status-vocabulary-Bdx_bn1-.js";
import { buildEndpointURL as xe, getStringSearchParam as Se, readLocationSearchParams as ue, setNumberSearchParam as se, setSearchParam as _ } from "../shared/query-state/url-state.js";
import { StatefulController as Ae } from "../shared/stateful-controller.js";
import { asNumber as f, asRecord as h, asString as o, asStringArray as ie } from "../shared/coercion.js";
import { $ as R, A as Re, D as Ee, E as Ie, G as Le, J as Ce, K as Pe, O as Fe, Q as Te, R as Be, S as y, T as Me, X as E, Y as I, Z as je, _ as De, b as ze, k as Ge, q as Oe, v as ae } from "../chunks/translation-shared-Bor-6cvs.js";
import { formatTranslationShortDateTime as N } from "../translation-shared/formatters.js";
import { normalizeNumberRecord as C } from "../shared/record-normalization.js";
import { buildAssignmentActionURL as Ne, initAssignmentSSRRowActions as Qe } from "../translation-actions/assignment-row-actions.js";
var J, D = class extends Error {
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
  const e = h(s);
  return {
    enabled: e.enabled === !0,
    reason: o(e.reason) || void 0,
    reason_code: o(e.reason_code) || void 0,
    permission: o(e.permission) || void 0
  };
}
function He(s) {
  const e = h(s), t = o(e.last_rejection_reason), i = o(e.last_reviewer_id);
  if (!(!t && !i))
    return {
      last_rejection_reason: t || void 0,
      last_reviewer_id: i || void 0
    };
}
function Ue(s) {
  const e = h(s), t = e.enabled === !0, i = f(e.warning_count), a = f(e.blocker_count), l = f(e.finding_count);
  if (!(!t && i <= 0 && a <= 0 && l <= 0))
    return {
      enabled: t,
      warning_count: i,
      blocker_count: a,
      finding_count: l
    };
}
function X(s) {
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
function Q(s, e) {
  const t = s.headers.get(e);
  return typeof t == "string" ? t.trim() : "";
}
function Ve(s) {
  const e = Q(s, "x-request-id"), t = Q(s, "x-correlation-id"), i = Q(s, "x-trace-id") || t || void 0;
  return {
    requestId: e || void 0,
    traceId: i
  };
}
async function Ke(s, e) {
  return typeof s.clone == "function" ? ge(s.clone()) : {
    textCode: null,
    message: await fe(s, e),
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function T(s, e) {
  const t = await Ke(s, e), i = Ve(s);
  return new D({
    message: t.message || `${e}: ${s.status}`,
    status: s.status,
    code: t.textCode,
    metadata: t.metadata,
    requestId: i.requestId,
    traceId: i.traceId
  });
}
function Ye(s) {
  const e = h(s), t = o(e.id), i = o(e.label);
  if (!t || !i) return null;
  const a = h(e.query);
  return {
    id: t,
    label: i,
    description: o(e.description) || void 0,
    review_state: o(e.review_state) || void 0,
    query: {
      status: o(a.status) || void 0,
      assignee_id: o(a.assignee_id) || void 0,
      reviewer_id: o(a.reviewer_id) || void 0,
      due_state: o(a.due_state) || void 0,
      locale: o(a.locale) || void 0,
      priority: o(a.priority) || void 0,
      entity_type: o(a.entity_type) || void 0,
      family_id: o(a.family_id) || void 0,
      sort: o(a.sort) || void 0,
      order: o(a.order) || void 0
    }
  };
}
function re(s, e = A) {
  const t = (Array.isArray(s) ? s : []).map((i) => Ye(i)).filter((i) => i !== null);
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
function B(s) {
  return Array.from(new Set(s.map((e) => o(e)).filter(Boolean)));
}
function Xe(s) {
  const e = h(s), t = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((a) => o(a)).filter((a) => !!a) : [], i = h(e.default_sort);
  return {
    page: f(e.page) || 1,
    per_page: f(e.per_page) || 25,
    total: f(e.total),
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
      key: o(i.key) || "updated_at",
      order: o(i.order) || "desc"
    },
    saved_filter_presets: re(e.saved_filter_presets, A),
    saved_review_filter_presets: re(e.saved_review_filter_presets, Z),
    default_review_filter_preset: o(e.default_review_filter_preset) || void 0,
    review_actor_id: o(e.review_actor_id) || void 0,
    review_aggregate_counts: C(e.review_aggregate_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    review_aggregate_counts_unavailable: ie(e.review_aggregate_counts_unavailable),
    review_aggregate_counts_degraded: ie(e.review_aggregate_counts_degraded),
    grouping: We(e.grouping),
    family_total: f(e.family_total) || void 0,
    assignment_total: f(e.assignment_total) || void 0
  };
}
function We(s) {
  const e = h(s);
  if (!e) return;
  const t = h(h(e.capabilities).server_family), i = Array.isArray(e.supported_sort_keys) ? e.supported_sort_keys.map((a) => o(a)).filter((a) => !!a) : void 0;
  return {
    enabled: e.enabled === !0,
    mode: o(e.mode) || "family_id",
    group_by: o(e.group_by) || "family_id",
    scope: o(e.scope) || "current_page",
    row_count: f(e.row_count),
    group_count: f(e.group_count),
    assignment_count: f(e.assignment_count),
    family_total: f(e.family_total) || void 0,
    assignment_total: f(e.assignment_total) || void 0,
    supported_modes: Array.isArray(e.supported_modes) ? e.supported_modes.map((a) => o(a)).filter(Boolean) : ["family_id"],
    supported_sort_keys: i,
    strategy: o(e.strategy) || "page_local",
    capabilities: { server_family: {
      supported: t.supported === !0,
      reason_code: o(t.reason_code) || void 0
    } }
  };
}
function Je(s) {
  const e = h(s), t = Array.isArray(e.filter_summary) ? e.filter_summary : [];
  return {
    selectionScope: "filter_snapshot",
    snapshotId: o(e.snapshot_id),
    requested: f(e.requested),
    filters: h(e.filters),
    filterSummary: t.map((i) => o(i)).filter(Boolean),
    createdAt: o(e.created_at),
    expiresAt: o(e.expires_at)
  };
}
function ne(s) {
  const e = o(s).toLowerCase();
  return e === "low" || e === "normal" || e === "high" || e === "urgent" ? e : "";
}
function Ze(s, e, t = {}) {
  return [
    "translation_queue_filter_snapshot",
    o(s),
    o(e),
    o(t.assigneeId),
    o(t.priority)
  ].join(":");
}
function et(s = {}) {
  const e = new URLSearchParams();
  return _(e, "status", s.status), _(e, "assignee_id", s.assigneeId), _(e, "reviewer_id", s.reviewerId), _(e, "due_state", s.dueState), _(e, "locale", s.locale), _(e, "priority", s.priority), _(e, "entity_type", s.entityType), _(e, "review_state", s.reviewState), _(e, "family_id", s.familyId), se(e, "page", s.page, { min: 1 }), se(e, "per_page", s.perPage, { min: 1 }), _(e, "sort", s.sort), _(e, "order", s.order), _(e, "group_by", s.groupBy), _(e, "group_strategy", s.groupStrategy), e.toString();
}
function tt(s = {}) {
  const e = {}, t = (i, a) => {
    const l = o(a);
    l && (e[i] = l);
  };
  return t("status", s.status), t("assignee_id", s.assigneeId), t("reviewer_id", s.reviewerId), t("due_state", s.dueState), t("locale", s.locale), t("priority", s.priority), t("entity_type", s.entityType), t("review_state", s.reviewState), t("family_id", s.familyId), t("sort", s.sort), t("order", s.order), e;
}
function st(s, e = {}) {
  const t = et(e);
  return t ? xe(s, new URLSearchParams(t), { preserveAbsolute: !0 }) : s;
}
function q(s) {
  const e = h(s);
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
    assignee_label: o(e.assignee_label) || void 0,
    reviewer_id: o(e.reviewer_id),
    reviewer_label: o(e.reviewer_label) || void 0,
    assignment_type: o(e.assignment_type),
    content_state: o(e.content_state),
    queue_state: X(e.queue_state),
    status: X(e.status),
    priority: o(e.priority) || "normal",
    due_state: o(e.due_state) || "none",
    due_date: o(e.due_date) || void 0,
    row_version: f(e.row_version || e.version),
    version: f(e.version || e.row_version),
    updated_at: o(e.updated_at),
    created_at: o(e.created_at),
    actions: {
      claim: S(h(e.actions).claim),
      release: S(h(e.actions).release)
    },
    review_actions: {
      submit_review: S(h(e.review_actions).submit_review),
      approve: S(h(e.review_actions).approve),
      reject: S(h(e.review_actions).reject),
      archive: S(h(e.review_actions).archive)
    },
    last_rejection_reason: o(e.last_rejection_reason) || void 0,
    review_feedback: He(e.review_feedback),
    qa_summary: Ue(e.qa_summary)
  };
}
function it(s, e) {
  const t = h(s), i = h(t.expansion), a = h(i.params), l = o(t.family_id);
  return {
    id: o(t.id) || `family:${l}`,
    row_type: "family",
    family_id: l,
    family_label: o(t.family_label) || o(t.source_title) || l,
    entity_type: o(t.entity_type),
    source_record_id: o(t.source_record_id),
    source_locale: o(t.source_locale),
    source_title: o(t.source_title),
    source_path: o(t.source_path),
    assignment_count: f(t.assignment_count),
    locale_count: f(t.locale_count),
    target_locales: Array.isArray(t.target_locales) ? t.target_locales.map((d) => o(d)).filter(Boolean) : [],
    status_counts: C(t.status_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    due_state_counts: C(t.due_state_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    priority_counts: C(t.priority_counts, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    family_blocker_count: t.family_blocker_count === null || t.family_blocker_count === void 0 ? null : f(t.family_blocker_count),
    family_blocker_count_available: t.family_blocker_count_available === !0,
    family_blocker_count_reason: o(t.family_blocker_count_reason),
    action_hints: C(t.action_hints, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    expansion: {
      href: o(i.href),
      route: o(i.route),
      params: Object.fromEntries(Object.entries(a).map(([d, r]) => [d, o(r)])),
      query: h(i.query)
    },
    expanded: e.has(l),
    children: []
  };
}
function at(s) {
  const e = h(s), t = Xe(e.meta), i = Array.isArray(e.data) ? e.data : [];
  return t.grouping?.enabled ? {
    data: i.filter((a) => !!a && typeof a == "object" && !Array.isArray(a)).map((a) => ({ ...a })),
    meta: t
  } : {
    data: i.map((a) => q(a)),
    meta: t
  };
}
async function rt(s) {
  const e = await F(s.href, { method: "GET" });
  if (!e.ok) throw await T(e, "Failed to load family assignments");
  const t = h(await e.json()), i = h(t.meta);
  return {
    rows: (Array.isArray(t.data) ? t.data : []).map((a) => q(a)),
    meta: {
      page: f(i.page) || 1,
      per_page: f(i.per_page) || 25,
      total: f(i.total),
      has_next: i.has_next === !0
    }
  };
}
function nt(s) {
  const e = h(s), t = h(e.meta), i = h(e.data);
  return {
    data: {
      assignment_id: o(i.assignment_id),
      status: X(i.status),
      row_version: f(i.row_version),
      updated_at: o(i.updated_at),
      assignment: q(i.assignment)
    },
    meta: { idempotency_hit: t.idempotency_hit === !0 }
  };
}
async function ot(s, e = {}) {
  const t = await F(st(s, e), { method: "GET" });
  if (!t.ok) throw await T(t, "Failed to load assignments");
  return at(await t.json());
}
async function ee(s, e, t, i) {
  const a = { expected_version: i.expected_version };
  i.idempotency_key && (a.idempotency_key = i.idempotency_key), i.reason && (a.reason = i.reason), i.channel && (a.channel = i.channel);
  const l = await F(Ne(s, e, t), {
    method: "POST",
    json: a
  });
  if (!l.ok) throw await T(l, `Failed to ${t} assignment`);
  return nt(await l.json());
}
function lt(s, e, t) {
  return ee(s, e, "claim", t);
}
function dt(s, e, t) {
  return ee(s, e, "release", t);
}
function M(s) {
  return {
    status: s.query.status,
    assigneeId: s.query.assignee_id,
    reviewerId: s.query.reviewer_id,
    dueState: s.query.due_state,
    locale: s.query.locale,
    priority: s.query.priority,
    entityType: s.query.entity_type,
    reviewState: s.review_state,
    familyId: s.query.family_id,
    sort: s.query.sort,
    order: s.query.order,
    page: 1
  };
}
function oe(s, e) {
  return `queue-${s}-${e.id}-${e.version}-${Date.now()}`;
}
function ct(s, e) {
  return `queue-${s}-${e.id}-${e.version}-${Date.now()}`;
}
function ut(s) {
  const e = o(s);
  if (!e) return null;
  const t = A.find((a) => a.id === e);
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
function w(s) {
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
function pt(s, e) {
  const t = w(s);
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
function L(s, e) {
  return s instanceof D ? {
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
function pe(s) {
  return o(s.queue_state || s.status);
}
function he(s) {
  return s === "review" || s === "in_review";
}
function ht(s) {
  return he(pe(s)) ? !0 : !!(s.review_actions.approve.enabled || s.review_actions.reject.enabled);
}
function mt(s) {
  return !!s.review_actions.archive.enabled;
}
function U(s, e) {
  const t = [], i = e.has(`claim:${s.id}`), a = e.has(`release:${s.id}`), l = e.has(`approve:${s.id}`), d = e.has(`reject:${s.id}`), r = e.has(`archive:${s.id}`), n = s.actions.claim.enabled && !i;
  t.push({
    type: "claim",
    category: "lifecycle",
    label: i ? "Claiming…" : "Claim",
    enabled: n,
    disabledReason: s.actions.claim.reason || "Claim assignment",
    pending: i,
    pendingLabel: "Claiming assignment…",
    dataAction: "claim",
    ariaLabel: n ? "Claim assignment" : s.actions.claim.reason || "Cannot claim assignment",
    buttonClass: y
  });
  const u = s.actions.release.enabled && !a;
  if (t.push({
    type: "release",
    category: "lifecycle",
    label: a ? "Releasing…" : "Release",
    enabled: u,
    disabledReason: s.actions.release.reason || "Release assignment",
    pending: a,
    pendingLabel: "Releasing assignment…",
    dataAction: "release",
    ariaLabel: u ? "Release assignment" : s.actions.release.reason || "Cannot release assignment",
    buttonClass: y
  }), ht(s)) {
    const m = s.review_actions.approve.enabled && !l;
    t.push({
      type: "approve",
      category: "review",
      label: l ? "Approving…" : "Approve",
      enabled: m,
      disabledReason: s.review_actions.approve.reason || "Approve assignment",
      pending: l,
      pendingLabel: "Approving assignment…",
      dataAction: "approve",
      ariaLabel: m ? "Approve assignment" : s.review_actions.approve.reason || "Cannot approve assignment",
      buttonClass: ze
    });
    const v = s.review_actions.reject.enabled && !d;
    t.push({
      type: "reject",
      category: "review",
      label: d ? "Rejecting…" : "Reject",
      enabled: v,
      disabledReason: s.review_actions.reject.reason || "Reject assignment",
      pending: d,
      pendingLabel: "Rejecting assignment…",
      dataAction: "reject",
      ariaLabel: v ? "Reject assignment" : s.review_actions.reject.reason || "Cannot reject assignment",
      buttonClass: De
    });
  }
  if (mt(s)) {
    const m = s.review_actions.archive.enabled && !r;
    t.push({
      type: "archive",
      category: "management",
      label: r ? "Archiving…" : "Archive",
      enabled: m,
      disabledReason: s.review_actions.archive.reason || "Archive assignment",
      pending: r,
      pendingLabel: "Archiving assignment…",
      dataAction: "archive",
      ariaLabel: m ? "Archive assignment" : s.review_actions.archive.reason || "Cannot archive assignment",
      buttonClass: y
    });
  }
  return t;
}
function V(s, e) {
  if (he(pe(e))) {
    const a = s.find((l) => l.category === "review" && l.enabled);
    if (a) return a;
  }
  const t = s.find((a) => a.type === "claim" && a.enabled);
  if (t) return t;
  const i = s.find((a) => a.enabled);
  return i || s[0];
}
function K(s, e, t) {
  const i = (d) => d === "review" ? "review" : d === "management" ? "manage" : "lifecycle";
  if (e.length <= 2) return e.map((d) => `
      <button
        type="button"
        class="${d.buttonClass}"
        data-action="${c(d.dataAction)}"
        data-action-group="${c(i(d.category))}"
        data-assignment-id="${c(s.id)}"
        ${d.enabled ? "" : "disabled"}
        aria-disabled="${d.enabled ? "false" : "true"}"
        title="${c(d.pending ? d.pendingLabel : d.disabledReason)}"
      >
        ${p(d.label)}
      </button>
    `).join("");
  const a = e.filter((d) => d !== t), l = `menu-${s.id}`;
  return `
    <div class="queue-action-overflow-container">
      <button
        type="button"
        class="${t.buttonClass}"
        data-action="${c(t.dataAction)}"
        data-action-group="${c(i(t.category))}"
        data-assignment-id="${c(s.id)}"
        ${t.enabled ? "" : "disabled"}
        aria-disabled="${t.enabled ? "false" : "true"}"
        title="${c(t.pending ? t.pendingLabel : t.disabledReason)}"
      >
        ${p(t.label)}
      </button>
      <button
        type="button"
        class="queue-action-overflow-trigger"
        data-overflow-menu="${c(s.id)}"
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded="false"
      >
        ⋮
      </button>
      <div
        class="queue-action-overflow-menu"
        id="${c(l)}"
        role="menu"
        hidden
      >
        ${a.map((d) => `
          <button
            type="button"
            role="menuitem"
            class="queue-action-menu-item"
            data-action="${c(d.dataAction)}"
            data-action-group="${c(i(d.category))}"
            data-assignment-id="${c(s.id)}"
            ${d.enabled ? "" : "disabled"}
            aria-disabled="${d.enabled ? "false" : "true"}"
            title="${c(d.pending ? d.pendingLabel : d.disabledReason)}"
          >
            ${p(d.label)}
            ${d.pending ? `<span class="action-pending-label">${p(d.pendingLabel)}</span>` : ""}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}
function le(s, e) {
  const t = s.target;
  return !!(t && t !== e && t.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"]'));
}
var me = class k extends Ae {
  constructor(e) {
    super("loading"), this.container = null, this.response = null, this.rows = [], this.activeReviewPresetId = "", this.activeReviewState = null, this.feedback = null, this.error = null, this.pendingActions = /* @__PURE__ */ new Set(), this.selectedRows = /* @__PURE__ */ new Map(), this.bulkActionPending = !1, this.bulkSnapshotPending = !1, this.filterSnapshot = null, this.viewMode = "flat", this.groupedData = null, this.serverFamilyRows = [], this.expandedGroups = /* @__PURE__ */ new Set(), this.filtersExpanded = !1;
    const t = o(e.initialPresetId);
    this.config = {
      endpoint: e.endpoint,
      bulkActionEndpoint: e.bulkActionEndpoint || de(e.endpoint),
      bulkSnapshotEndpoint: e.bulkSnapshotEndpoint || ce(e.endpoint),
      editorBasePath: e.editorBasePath || "",
      title: e.title || "Translation Queue",
      description: e.description || "Filter assignments, claim open work, and release items back to the pool without leaving the queue.",
      initialPresetId: t || "open"
    };
    const i = ut(t);
    if (i?.kind === "review") {
      this.activePresetId = "custom", this.activeReviewPresetId = i.preset.id, this.activeReviewState = i.preset.review_state || null, this.queryState = M(i.preset);
      return;
    }
    const a = i?.preset || A[1] || A[0];
    this.activePresetId = a?.id || "open", this.queryState = a ? M(a) : {
      sort: "updated_at",
      order: "desc",
      page: 1
    };
    const l = we(k.PANEL_ID);
    l && (this.viewMode = l, this.viewMode === "grouped" ? this.queryState.groupBy = "family_id" : this.viewMode === "server_family" && (this.queryState.groupBy = "family_id", this.queryState.groupStrategy = "server_family")), this.expandedGroups = be(k.PANEL_ID);
  }
  mount(e) {
    this.container = e, this.loadFiltersExpandedState(), this.render(), this.load();
  }
  unmount() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
  getData() {
    return this.response;
  }
  getRows() {
    return this.rows.map((e) => w(e));
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
  replaceCachedRow(e) {
    for (const t of this.serverFamilyRows) {
      const i = t.children.findIndex((a) => a.id === e.id);
      i >= 0 && (t.children[i] = w(e));
    }
  }
  async selectAllMatchingFilters() {
    this.bulkSnapshotPending = !0, this.feedback = null, this.render();
    try {
      const e = await F(this.config.bulkSnapshotEndpoint || ce(this.config.endpoint), {
        method: "POST",
        json: { filters: tt(this.queryState) }
      });
      if (!e.ok) throw await T(e, "Filter snapshot failed");
      const t = Je(h(h(await e.json()).data));
      if (!t.snapshotId) throw new D({
        message: "Filter snapshot response did not include a snapshot id.",
        status: 500,
        code: "INVALID_SNAPSHOT_RESPONSE"
      });
      this.selectedRows.clear(), this.filterSnapshot = t, this.feedback = {
        kind: "success",
        message: `${t.requested} matching assignment${t.requested !== 1 ? "s" : ""} selected.`
      };
    } catch (e) {
      this.feedback = L(e, "Filter snapshot failed.");
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
      for (const l of a.data.results) if (l.success && l.assignment) {
        const d = this.rows.findIndex((r) => r.id === l.assignmentId);
        d >= 0 && (this.rows[d] = w(l.assignment)), this.selectedRows.delete(l.assignmentId);
      }
      if (a.data.failed > 0) {
        const l = a.data.results.filter((d) => !d.success).map((d) => d.assignmentId).slice(0, 3);
        this.feedback = {
          kind: "error",
          message: `${a.data.succeeded} succeeded, ${a.data.failed} failed. Failed: ${l.join(", ")}${a.data.failed > 3 ? "..." : ""}`
        };
      } else this.feedback = {
        kind: "success",
        message: `${a.data.succeeded} assignment${a.data.succeeded !== 1 ? "s" : ""} updated.`
      };
    } catch (a) {
      this.feedback = L(a, `Bulk ${e} failed.`);
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
    const l = i.filterSummary || [], d = l.length ? `

${l.join(`
`)}` : "";
    if (typeof window > "u" || typeof window.confirm != "function" || window.confirm(`Apply ${e} to ${i.requested} matching assignment${i.requested !== 1 ? "s" : ""}?${d}`)) {
      this.bulkActionPending = !0, this.feedback = null, this.render();
      try {
        const r = await this.executeBulkAction({
          action: e,
          selectionScope: "filter_snapshot",
          snapshotId: i.snapshotId,
          assigneeId: a.assigneeId,
          priority: a.priority,
          idempotencyKey: Ze(i.snapshotId, e, a)
        });
        r.data.failed > 0 ? this.feedback = {
          kind: "error",
          message: `${r.data.succeeded} succeeded, ${r.data.failed} failed.`
        } : this.feedback = {
          kind: "success",
          message: `${r.data.succeeded} assignment${r.data.succeeded !== 1 ? "s" : ""} updated.`
        }, this.filterSnapshot = null, this.selectedRows.clear(), await this.load();
      } catch (r) {
        this.feedback = L(r, `Bulk ${e} failed.`);
      } finally {
        this.bulkActionPending = !1, this.render();
      }
    }
  }
  promptFilterSnapshotActionOptions(e) {
    if (e === "assign") {
      const t = this.queryState.assigneeId && this.queryState.assigneeId !== "__me__" ? this.queryState.assigneeId : "", i = o(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Assign matching assignments to", t));
      return i ? { assigneeId: i } : null;
    }
    if (e === "priority") {
      const t = ne(this.queryState.priority || "normal"), i = ne(o(typeof window > "u" || typeof window.prompt != "function" ? t : window.prompt("Set matching assignments priority", t)));
      return i ? { priority: i } : (this.feedback = {
        kind: "error",
        message: "Priority must be low, normal, high, or urgent."
      }, this.render(), null);
    }
    return {};
  }
  async executeBulkAction(e) {
    const t = await F(this.config.bulkActionEndpoint || de(this.config.endpoint), {
      method: "POST",
      json: {
        action: e.action,
        selection_scope: e.selectionScope || "current_page",
        snapshot_id: e.snapshotId,
        idempotency_key: e.idempotencyKey,
        assignments: (e.assignments || []).map((g) => ({
          assignment_id: g.assignmentId,
          expected_version: g.expectedVersion
        })),
        assignee_id: e.assigneeId,
        reason: e.reason,
        priority: e.priority
      }
    });
    if (!t.ok) throw await T(t, `Bulk ${e.action} failed`);
    const i = h(await t.json()), a = h(i.data), l = h(i.meta), d = Array.isArray(a.results) ? a.results : [], r = f(l.requested), n = f(l.succeeded), u = f(l.failed), m = l.partial === !0, v = o(l.selection_scope) || "current_page";
    return {
      data: {
        action: o(a.action) || e.action,
        requested: r,
        succeeded: n,
        failed: u,
        partial: m,
        selectionScope: v,
        results: d.map((g) => {
          const $ = h(g), te = h($.error);
          return {
            assignmentId: o($.assignment_id),
            success: o($.status) === "succeeded",
            error: o(te.message) || o($.error) || void 0,
            errorCode: o(te.code) || o($.error_code) || void 0,
            assignment: $.assignment ? q($.assignment) : void 0
          };
        })
      },
      meta: {
        action: o(a.action) || e.action,
        requested: r,
        succeeded: n,
        failed: u,
        partial: m,
        selection_scope: v
      }
    };
  }
  async load() {
    this.state = "loading", this.error = null, this.render();
    try {
      const e = await ot(this.config.endpoint, this.queryState);
      if (this.response = e, this.viewMode === "server_family" && e.meta.grouping?.strategy === "server_family") {
        this.groupedData = null, this.serverFamilyRows = e.data.map((t) => it(t, this.expandedGroups)), this.rows = this.serverFamilyRows.flatMap((t) => t.children.map((i) => w(i))), this.state = this.serverFamilyRows.length ? "ready" : "empty", this.render();
        return;
      }
      if (this.serverFamilyRows = [], this.viewMode === "grouped" && e.meta.grouping?.enabled) {
        const t = ye(e.data, {
          defaultExpanded: !0,
          expandMode: "explicit",
          expandedGroups: this.expandedGroups
        });
        if (t) {
          this.groupedData = t, this.rows = [];
          for (const i of t.groups) for (const a of i.records) this.rows.push(q(a));
          for (const i of t.ungrouped) this.rows.push(q(i));
        } else
          this.groupedData = null, this.rows = e.data.map((i) => w(i));
      } else
        this.groupedData = null, this.rows = e.data.map((t) => w(t));
      this.state = this.rows.length ? "ready" : "empty";
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e)), this.state = e instanceof D && e.code === "VERSION_CONFLICT" ? "conflict" : "error";
    }
    this.render();
  }
  getViewMode() {
    return this.viewMode;
  }
  setViewMode(e) {
    if (this.viewMode !== e) {
      if (this.viewMode = e, $e(k.PANEL_ID, e), e === "grouped") {
        const { groupStrategy: t, ...i } = this.queryState;
        this.queryState = {
          ...i,
          groupBy: "family_id"
        };
      } else if (e === "server_family") {
        const t = this.queryState.sort && [
          "updated_at",
          "created_at",
          "due_date",
          "due_state",
          "priority"
        ].includes(this.queryState.sort) ? this.queryState.sort : "updated_at";
        this.queryState = {
          ...this.queryState,
          groupBy: "family_id",
          groupStrategy: "server_family",
          sort: t,
          perPage: Math.min(this.queryState.perPage || 25, 100)
        };
      } else {
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
    this.groupedData && (this.groupedData = ve(this.groupedData, e), this.expandedGroups = O(this.groupedData), x(k.PANEL_ID, this.expandedGroups), this.render());
  }
  async toggleServerFamilyExpansion(e) {
    const t = this.serverFamilyRows.find((i) => i.family_id === e);
    if (t) {
      if (t.expanded = !t.expanded, t.expanded ? this.expandedGroups.add(e) : this.expandedGroups.delete(e), x(k.PANEL_ID, this.expandedGroups), !t.expanded || t.children.length || t.loading) {
        this.rows = this.serverFamilyRows.flatMap((i) => i.children.map((a) => w(a))), this.render();
        return;
      }
      t.loading = !0, t.error = "", this.render();
      try {
        const i = await rt(t.expansion);
        t.children = i.rows, t.childMeta = i.meta, this.rows = this.serverFamilyRows.flatMap((a) => a.children.map((l) => w(l)));
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
      x(k.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = _e(this.groupedData), this.expandedGroups = O(this.groupedData), x(k.PANEL_ID, this.expandedGroups), this.render());
  }
  collapseAllFamilyGroups() {
    if (this.viewMode === "server_family") {
      this.expandedGroups.clear();
      for (const e of this.serverFamilyRows) e.expanded = !1;
      x(k.PANEL_ID, this.expandedGroups), this.render();
      return;
    }
    this.groupedData && (this.groupedData = ke(this.groupedData), this.expandedGroups = O(this.groupedData), x(k.PANEL_ID, this.expandedGroups), this.render());
  }
  async runInlineAction(e, t) {
    const i = this.rows.findIndex((n) => n.id === t);
    if (i < 0) return;
    const a = this.rows[i], l = a.actions[e];
    if (!l.enabled) {
      this.feedback = {
        kind: l.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: l.reason || `Cannot ${e} this assignment.`,
        code: l.reason_code || null
      }, this.render();
      return;
    }
    const d = w(a), r = `${e}:${t}`;
    this.pendingActions.add(r), this.feedback = null, this.rows[i] = pt(a, e), this.replaceCachedRow(this.rows[i]), this.render();
    try {
      const n = e === "claim" ? await lt(this.config.endpoint, t, {
        expected_version: d.version,
        idempotency_key: oe("claim", d)
      }) : await dt(this.config.endpoint, t, {
        expected_version: d.version,
        idempotency_key: oe("release", d)
      });
      this.rows[i] = w(n.data.assignment), this.replaceCachedRow(this.rows[i]), this.feedback = {
        kind: "success",
        message: e === "claim" ? "Assignment claimed." : "Assignment released back to the pool."
      };
    } catch (n) {
      this.rows[i] = d, this.replaceCachedRow(d), this.feedback = L(n, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(r), this.render();
    }
  }
  async runReviewAction(e, t) {
    const i = this.rows.findIndex((n) => n.id === t);
    if (i < 0) return;
    const a = this.rows[i], l = a.review_actions[e];
    if (!l?.enabled) {
      this.feedback = {
        kind: l?.reason_code === "PERMISSION_DENIED" ? "error" : "conflict",
        message: l?.reason || `Cannot ${e} this assignment.`,
        code: l?.reason_code || null
      }, this.render();
      return;
    }
    const d = {
      expected_version: a.version,
      idempotency_key: ct(e, a)
    };
    if (e === "reject") {
      const n = typeof window < "u" ? window.prompt("Reject reason") : "";
      if (!n || !n.trim()) {
        this.feedback = {
          kind: "error",
          message: "Reject reason is required.",
          code: "VALIDATION_ERROR"
        }, this.render();
        return;
      }
      d.reason = n.trim();
    }
    const r = `${e}:${t}`;
    this.pendingActions.add(r), this.feedback = null, this.render();
    try {
      const n = await ee(this.config.endpoint, t, e, d);
      this.rows[i] = w(n.data.assignment), this.replaceCachedRow(this.rows[i]), this.feedback = {
        kind: "success",
        message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
      };
    } catch (n) {
      this.feedback = L(n, `Failed to ${e} assignment.`);
    } finally {
      this.pendingActions.delete(r), this.render();
    }
  }
  setActivePreset(e) {
    const t = this.savedFilterPresets.find((i) => i.id === e);
    t && (this.activePresetId = t.id, this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = M(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  setActiveReviewPreset(e) {
    const t = this.savedReviewFilterPresets.find((i) => i.id === e);
    t && (this.activePresetId = "custom", this.activeReviewPresetId = t.id, this.activeReviewState = t.review_state || null, this.queryState = M(t), this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load());
  }
  updateFilter(e) {
    this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.queryState = {
      ...this.queryState,
      ...e,
      page: 1
    }, this.filterSnapshot = null, this.selectedRows.clear(), this.feedback = null, this.load();
  }
  get savedFilterPresets() {
    return this.response?.meta.saved_filter_presets?.length ? this.response.meta.saved_filter_presets.map(P) : A.map(P);
  }
  get savedReviewFilterPresets() {
    return this.response?.meta.saved_review_filter_presets?.length ? this.response.meta.saved_review_filter_presets.map(P) : Z.map(P);
  }
  get visibleRows() {
    return this.rows;
  }
  getActiveFilterCount() {
    let e = 0;
    return this.queryState.status && e++, this.queryState.dueState && e++, this.queryState.priority && e++, this.queryState.entityType && e++, this.queryState.locale && e++, this.queryState.assigneeId && e++, this.queryState.reviewerId && e++, this.queryState.familyId && e++, this.activeReviewState && e++, this.queryState.sort && this.queryState.sort !== (this.response?.meta.default_sort.key ?? "updated_at") && e++, this.queryState.order && this.queryState.order !== (this.response?.meta.default_sort.order ?? "desc") && e++, e;
  }
  removeFilter(e) {
    const t = {};
    switch (e) {
      case "status":
        t.status = void 0;
        break;
      case "due_state":
        t.dueState = void 0;
        break;
      case "priority":
        t.priority = void 0;
        break;
      case "entity_type":
        t.entityType = void 0;
        break;
      case "locale":
        t.locale = void 0;
        break;
      case "assignee_id":
        t.assigneeId = void 0;
        break;
      case "reviewer_id":
        t.reviewerId = void 0;
        break;
      case "family_id":
        t.familyId = void 0;
        break;
      case "sort":
        t.sort = void 0;
        break;
      case "order":
        t.order = void 0;
        break;
    }
    this.updateFilter(t);
  }
  renderFilterChips() {
    const e = [];
    return this.queryState.status && e.push({
      name: "status",
      label: "Status",
      value: b(this.queryState.status)
    }), this.queryState.dueState && e.push({
      name: "due_state",
      label: "Due State",
      value: b(this.queryState.dueState)
    }), this.queryState.priority && e.push({
      name: "priority",
      label: "Priority",
      value: b(this.queryState.priority)
    }), this.queryState.entityType && e.push({
      name: "entity_type",
      label: "Type",
      value: b(this.queryState.entityType)
    }), this.queryState.locale && e.push({
      name: "locale",
      label: "Locale",
      value: this.queryState.locale
    }), this.queryState.assigneeId && e.push({
      name: "assignee_id",
      label: "Assignee",
      value: this.queryState.assigneeId
    }), this.queryState.reviewerId && e.push({
      name: "reviewer_id",
      label: "Reviewer",
      value: this.queryState.reviewerId
    }), this.queryState.familyId && e.push({
      name: "family_id",
      label: "Family",
      value: this.queryState.familyId
    }), this.activeReviewState && e.push({
      name: "review_state",
      label: "Review State",
      value: b(this.activeReviewState)
    }), this.queryState.sort && this.queryState.sort !== (this.response?.meta.default_sort.key ?? "updated_at") && e.push({
      name: "sort",
      label: "Sort",
      value: b(this.queryState.sort)
    }), this.queryState.order && this.queryState.order !== (this.response?.meta.default_sort.order ?? "desc") && e.push({
      name: "order",
      label: "Order",
      value: this.queryState.order === "asc" ? "Ascending" : "Descending"
    }), e.length === 0 ? "" : `
      <div class="queue-filter-chips-container">
        <div class="queue-filter-chips">
          ${e.map((t) => `
            <button
              type="button"
              class="queue-filter-chip"
              data-remove-filter="${c(t.name)}"
              aria-label="${c(`Remove ${t.label} filter: ${t.value}`)}"
              title="${c(`Remove ${t.label}: ${t.value}`)}"
            >
              <span class="queue-filter-chip-label">${p(t.label)}:</span>
              <span class="queue-filter-chip-value">${p(t.value)}</span>
              <svg class="queue-filter-chip-remove" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          `).join("")}
          <button
            type="button"
            class="queue-filter-chip queue-filter-chip-clear-all"
            data-clear-filters="true"
            aria-label="Clear all filters"
            title="Clear all filters"
          >
            <span>Clear all</span>
          </button>
        </div>
      </div>
    `;
  }
  toggleFiltersExpanded() {
    this.filtersExpanded = !this.filtersExpanded, this.persistFiltersExpanded(), this.render();
  }
  toggleReviewSelectorDropdown() {
    const e = this.container?.querySelector("[data-review-selector-menu]"), t = this.container?.querySelector("[data-review-selector-toggle]"), i = this.container?.querySelector("[data-review-selector-chevron]");
    if (!(!e || !t))
      if (e.classList.contains("hidden")) {
        e.classList.remove("hidden"), t.setAttribute("aria-expanded", "true"), i && i.classList.add("rotate-180");
        const a = (d) => {
          const r = d.target, n = this.container?.querySelector("[data-review-selector-container]");
          n && !n.contains(r) && (this.closeReviewSelectorDropdown(), document.removeEventListener("click", a));
        }, l = (d) => {
          d.key === "Escape" && (this.closeReviewSelectorDropdown(), document.removeEventListener("keydown", l), t.focus());
        };
        setTimeout(() => {
          document.addEventListener("click", a), document.addEventListener("keydown", l);
        }, 0);
      } else this.closeReviewSelectorDropdown();
  }
  closeReviewSelectorDropdown() {
    const e = this.container?.querySelector("[data-review-selector-menu]"), t = this.container?.querySelector("[data-review-selector-toggle]"), i = this.container?.querySelector("[data-review-selector-chevron]");
    e && (e.classList.add("hidden"), t && t.setAttribute("aria-expanded", "false"), i && i.classList.remove("rotate-180"));
  }
  persistFiltersExpanded() {
    try {
      localStorage.setItem(k.FILTERS_STORAGE_KEY, this.filtersExpanded ? "true" : "false");
    } catch {
    }
  }
  loadFiltersExpandedState() {
    try {
      this.filtersExpanded = localStorage.getItem(k.FILTERS_STORAGE_KEY) === "true";
    } catch {
      this.filtersExpanded = !1;
    }
  }
  clearAllFilters() {
    this.queryState = {
      ...this.queryState,
      status: void 0,
      dueState: void 0,
      priority: void 0,
      entityType: void 0,
      locale: void 0,
      assigneeId: void 0,
      reviewerId: void 0,
      familyId: void 0,
      sort: void 0,
      order: void 0,
      page: 1
    }, this.activePresetId = "custom", this.activeReviewPresetId = "", this.activeReviewState = null, this.filterSnapshot = null, this.selectedRows.clear(), this.load();
  }
  render() {
    this.container && (this.container.innerHTML = `
      <div class="assignment-queue-screen" data-assignment-queue="true">
        ${this.renderFeedback()}
        ${this.renderBulkActionBar()}
        ${this.renderFilterSnapshotBar()}
        ${this.renderReviewStateBar()}
        ${this.renderPresetBar()}
        ${this.renderFilters()}
        ${this.renderContextBar()}
        ${this.renderBody()}
      </div>
    `, this.attachEventListeners());
  }
  renderFeedback() {
    if (!this.feedback) return "";
    const e = this.feedback.kind === "success" ? "feedback-success" : this.feedback.kind === "conflict" ? "feedback-conflict" : "feedback-error", t = [
      this.feedback.code ? `Code ${p(this.feedback.code)}` : "",
      this.feedback.requestId ? `Request ${p(this.feedback.requestId)}` : "",
      this.feedback.traceId ? `Trace ${p(this.feedback.traceId)}` : ""
    ].filter(Boolean);
    return `
      <div class="assignment-queue-feedback ${e}" data-feedback-kind="${c(this.feedback.kind)}" role="status" aria-live="polite">
        <strong>${p(this.feedback.message)}</strong>
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
    const e = this.filterSnapshot;
    if (!e) return "";
    const t = this.bulkSnapshotPending || this.bulkActionPending, i = (e.filterSummary || []).slice(0, 4);
    return `
      <section class="filter-snapshot-bar" data-filter-snapshot-bar="true" aria-label="All matching filter selection">
        <div class="filter-snapshot-copy">
          <strong>${e.requested} matching assignment${e.requested !== 1 ? "s" : ""} selected</strong>
          ${i.length ? `<span>${i.map((a) => p(a)).join(" · ")}</span>` : ""}
        </div>
        <div class="filter-snapshot-actions">
          <button type="button" class="${y}" data-filter-snapshot-clear="true" ${t ? "disabled" : ""}>Clear</button>
          <button type="button" class="${y}" data-filter-snapshot-action="assign" ${t || e.requested === 0 ? "disabled" : ""}>Assign</button>
          <button type="button" class="${y}" data-filter-snapshot-action="release" ${t || e.requested === 0 ? "disabled" : ""}>Release</button>
          <button type="button" class="${y}" data-filter-snapshot-action="priority" ${t || e.requested === 0 ? "disabled" : ""}>Priority</button>
          <button type="button" class="${y}" data-filter-snapshot-action="archive" ${t || e.requested === 0 ? "disabled" : ""}>Archive</button>
        </div>
      </section>
    `;
  }
  renderPresetBar() {
    return `
      <div class="panel-tabs" role="group" aria-label="Saved queue filters">
        <div class="panel-tabs-container">
          ${this.savedFilterPresets.map((e) => `
            <button
              type="button"
              class="panel-tab ${this.activePresetId === e.id ? "panel-tab-active" : ""}"
              data-preset-id="${c(e.id)}"
              aria-pressed="${this.activePresetId === e.id ? "true" : "false"}"
              title="${c(e.description || e.label)}"
            >
              <span class="panel-tab-label">${p(e.label)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }
  renderReviewStateBar() {
    return "";
  }
  renderReviewSelector() {
    if (!this.savedReviewFilterPresets.length) return "";
    const e = this.response?.meta.review_aggregate_counts || {}, i = !!this.response?.meta.review_actor_id, a = this.savedReviewFilterPresets.find((r) => r.id === this.activeReviewPresetId), l = a ? a.label : "Review State", d = a ? e[a.id] ?? 0 : 0;
    return `
      <div class="relative" data-review-selector-container="true">
        <h2 class="sr-only">Reviewer states</h2>
        <button
          type="button"
          class="${y} ${i ? "" : "opacity-50 cursor-not-allowed"}"
          data-review-selector-toggle="true"
          aria-expanded="false"
          aria-haspopup="true"
          aria-label="Select review state filter"
          ${i ? "" : 'disabled aria-disabled="true"'}
          title="${c(i ? "Filter by review state" : "Reviewer metadata is required to use review filters.")}"
        >
          <span>${p(l)}</span>
          ${a ? `<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">${d}</span>` : ""}
          <svg class="h-4 w-4 transition-transform" data-review-selector-chevron="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div
          class="hidden absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
          data-review-selector-menu="true"
          role="menu"
          aria-orientation="vertical"
        >
          <div class="py-1">
            ${this.savedReviewFilterPresets.map((r) => `
              <button
                type="button"
                class="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${this.activeReviewPresetId === r.id ? "bg-blue-50 text-blue-700" : ""}"
                data-review-preset-id="${c(r.id)}"
                role="menuitem"
                title="${c(r.description || r.label)}"
              >
                <span>${p(r.label)}</span>
                <span class="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-xs font-semibold rounded-full ${this.activeReviewPresetId === r.id ? "bg-blue-200 text-blue-900" : "bg-gray-100 text-gray-700"}">${e[r.id] ?? 0}</span>
              </button>
            `).join("")}
          </div>
          ${i ? "" : `
            <div class="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
              Reviewer queue states are available when reviewer metadata is present.
            </div>
          `}
        </div>
      </div>
    `;
  }
  renderContextBar() {
    const e = this.response?.meta.total ?? 0, t = this.visibleRows.length, i = this.viewMode === "grouped", a = this.viewMode === "server_family", l = !i && !a, d = this.groupedData?.totalGroups ?? 0, r = this.response?.meta.grouping?.assignment_count ?? this.rows.length, n = this.response?.meta.grouping?.capabilities?.server_family?.supported === !0, u = this.response?.meta.grouping?.family_total ?? this.response?.meta.family_total ?? this.serverFamilyRows.length, m = this.response?.meta.grouping?.assignment_total ?? this.response?.meta.assignment_total ?? 0;
    let v = "", g = "";
    return a ? (v = `${this.serverFamilyRows.length} of ${u} ${u === 1 ? "family" : "families"} · ${m} assignments`, g = "(server-side family pages)") : i && this.groupedData ? (v = `${d} ${d === 1 ? "family" : "families"} · ${r} assignments`, g = "(page-local counts)") : (v = `Showing ${t} of ${e} ${e === 1 ? "assignment" : "assignments"}`, g = ""), `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3 text-sm">
            <span class="font-medium text-gray-700">${v}</span>
            ${g ? `<span class="text-gray-500">${g}</span>` : ""}
          </div>
          <div class="flex items-center gap-3">
            ${i || a ? `
              <button type="button" class="${y}" data-expand-all="true" title="Expand all ${a ? "visible families" : "groups"}">
                Expand all
              </button>
              <button type="button" class="${y}" data-collapse-all="true" title="Collapse all ${a ? "visible families" : "groups"}">
                Collapse all
              </button>
            ` : ""}
            <div role="group" aria-label="View mode" class="inline-flex rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors ${l ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}"
                data-view-mode="flat"
                aria-pressed="${l}"
                title="Show assignments as a flat list"
              >
                <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z"/>
                </svg>
                <span class="ml-1">List</span>
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${i ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}"
                data-view-mode="grouped"
                aria-pressed="${i}"
                title="Group assignments by translation family"
              >
                <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2 2h4v4H2zM2 10h4v4H2zM8 2h6v2H8zM8 6h6v2H8zM8 10h6v2H8zM8 14h6v2H8z"/>
                </svg>
                <span class="ml-1">Grouped</span>
              </button>
              ${n || a ? `
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${a ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"} ${n ? "" : "opacity-50 cursor-not-allowed"}"
                  data-view-mode="server_family"
                  aria-pressed="${a}"
                  title="${c(n ? "Use server-side family pagination" : "Server-side family grouping is unavailable for this repository")}"
                  ${n ? "" : 'disabled aria-disabled="true"'}
                >
                  <svg class="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M3 2h10v3H3zM2 7h5v3H2zM9 7h5v3H9zM2 12h5v3H2zM9 12h5v3H9z"/>
                  </svg>
                  <span class="ml-1">Families</span>
                </button>
              ` : ""}
            </div>
          </div>
        </div>
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
    ], l = ["", ...B(e.map((g) => g.target_locale))], d = ["", ...B(e.map((g) => g.entity_type))], r = ["", ...B(e.map((g) => g.assignee_id))], n = ["", ...B(e.map((g) => g.reviewer_id))], u = this.response?.meta.supported_sort_keys?.length ? this.response.meta.supported_sort_keys : [
      "updated_at",
      "due_date",
      "priority",
      "status",
      "locale"
    ], m = this.getActiveFilterCount(), v = this.filtersExpanded ? "rotate-180" : "";
    return `
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="${y}"
              data-filters-toggle="true"
              aria-expanded="${this.filtersExpanded}"
              aria-controls="queue-filters-panel"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
              </svg>
              <span>Filters</span>
              ${m > 0 ? `<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">${m}</span>` : ""}
              <svg class="h-4 w-4 transition-transform ${v}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            ${this.renderReviewSelector()}
          </div>
          <div class="flex items-center gap-3">
            ${this.renderSortControls(u)}
          </div>
        </div>
        ${this.renderFilterChips()}
        <form
          id="queue-filters-panel"
          class="${this.filtersExpanded ? "" : "hidden"} mt-4 pt-4 border-t border-gray-100"
          data-queue-filters="true"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${this.renderSelect("status", "Status", t, this.queryState.status || "")}
            ${this.renderSelect("due_state", "Due State", ["", ...i], this.queryState.dueState || "")}
            ${this.renderSelect("priority", "Priority", a, this.queryState.priority || "")}
            ${this.renderSelect("entity_type", "Type", d, this.queryState.entityType || "")}
            ${this.renderSelect("locale", "Locale", l, this.queryState.locale || "")}
            ${this.renderSelect("assignee_id", "Assignee", r, this.queryState.assigneeId || "")}
            ${this.renderSelect("reviewer_id", "Reviewer", n, this.queryState.reviewerId || "")}
          </div>
          ${m > 0 ? `
            <div class="mt-4 flex items-center gap-2">
              <button type="button" class="${y}" data-clear-filters="true">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Clear filters
              </button>
            </div>
          ` : ""}
        </form>
      </div>
    `;
  }
  renderSortControls(e) {
    const t = this.queryState.sort || (this.response?.meta.default_sort.key ?? "updated_at"), i = this.queryState.order || (this.response?.meta.default_sort.order ?? "desc");
    return `
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <span class="text-gray-500">Sort by</span>
        <select
          data-filter-name="sort"
          class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          ${e.map((a) => `
            <option value="${c(a)}" ${a === t ? "selected" : ""}>
              ${p(b(a))}
            </option>
          `).join("")}
        </select>
      </label>
      <button
        type="button"
        class="${ae}"
        data-toggle-sort-order="true"
        title="${i === "asc" ? "Ascending (click for descending)" : "Descending (click for ascending)"}"
        aria-label="${i === "asc" ? "Sort ascending, click to sort descending" : "Sort descending, click to sort ascending"}"
      >
        ${i === "asc" ? '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>' : '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/></svg>'}
      </button>
      <button
        type="button"
        class="${ae}"
        data-queue-refresh="true"
        title="Refresh queue"
        aria-label="Refresh assignment queue"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    `;
  }
  renderSelect(e, t, i, a) {
    const l = [...i];
    return a && !l.includes(a) && l.push(a), `
      <label class="queue-filter-field">
        <span>${p(t)}</span>
        <select data-filter-name="${c(e)}">
          ${l.map((d) => `
            <option value="${c(d)}" ${d === a ? "selected" : ""}>
              ${p(d ? b(d) : `All ${t.toLowerCase()}`)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }
  renderBody() {
    const e = this.visibleRows;
    if (this.state === "loading" && !this.rows.length) return `
        <div class="${Be}" data-queue-state="loading">
          <svg class="animate-spin h-8 w-8 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-4 text-sm text-gray-500">Loading queue assignments...</p>
        </div>
      `;
    if (this.state === "error" && !this.rows.length) return this.renderErrorState("error", this.error?.message || "Failed to load queue assignments.");
    if (this.state === "conflict" && !this.rows.length) return this.renderErrorState("conflict", this.error?.message || "The queue response is stale. Refresh and try again.");
    if (this.viewMode === "server_family")
      return this.serverFamilyRows.length ? this.renderServerFamilyBody() : this.renderEmptyState("families");
    if (!e.length) return this.renderEmptyState("assignments");
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
              <th scope="col" class="queue-content-col">Content</th>
              <th scope="col" class="queue-locale-col">Locale</th>
              <th scope="col" class="queue-status-col">Status</th>
              <th scope="col" class="queue-owner-col">Owners</th>
              <th scope="col" class="queue-due-col">Due</th>
              <th scope="col" class="queue-priority-col">Priority</th>
              <th scope="col" class="queue-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${e.map((i) => this.renderRow(i)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderServerFamilyBody() {
    return `
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true" data-queue-grouped="true" data-server-family="true">
        ${this.serverFamilyRows.map((t) => this.renderServerFamilyMobile(t)).join("")}
      </div>
      <div class="assignment-queue-table-wrap hidden sm:block">
        <table class="assignment-queue-table assignment-queue-table-grouped" aria-label="Translation assignment queue families">
          <thead>
            <tr>
              <th scope="col" class="queue-select-col"></th>
              <th scope="col">Family</th>
              <th scope="col">Locales</th>
              <th scope="col">Status</th>
              <th scope="col">Owners</th>
              <th scope="col">Due</th>
              <th scope="col">Priority</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.serverFamilyRows.map((t) => this.renderServerFamilyRows(t, 8)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderServerFamilyRows(e, t) {
    const i = e.expanded ? "▼" : "▶", a = this.renderServerFamilyBlocker(e), l = e.expanded ? e.loading ? `<tr class="family-group-child"><td></td><td colspan="${t - 1}">Loading family assignments…</td></tr>` : e.error ? `<tr class="family-group-child"><td></td><td colspan="${t - 1}">${p(e.error)}</td></tr>` : e.children.map((d) => this.renderGroupChildRow(d, e.family_id)).join("") : "";
    return `
      <tr class="family-group-header server-family-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
          data-group-id="${c(e.family_id)}"
          data-group-expanded="${e.expanded}"
          role="row"
          aria-expanded="${e.expanded}"
          tabindex="0">
        <td class="queue-select-col"></td>
        <td colspan="${t - 1}">
          <div class="family-group-header-content">
            <button type="button" class="family-group-toggle" data-toggle-group="${c(e.family_id)}" aria-label="${e.expanded ? "Collapse" : "Expand"} family">
              <span class="family-group-expand-icon" aria-hidden="true">${i}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${p(e.family_label || e.family_id)}</strong>
              <span class="family-group-count">${e.assignment_count} ${e.assignment_count === 1 ? "assignment" : "assignments"} · ${e.locale_count} ${e.locale_count === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary server-family-summary">
              ${this.renderCountPills(e.status_counts)}
              ${this.renderPriorityPills(e.priority_counts)}
              ${a}
            </div>
          </div>
        </td>
      </tr>
      ${l}
    `;
  }
  renderServerFamilyMobile(e) {
    const t = e.expanded ? "▼" : "▶", i = e.expanded ? e.loading ? '<div class="family-group-mobile-child">Loading family assignments…</div>' : e.error ? `<div class="family-group-mobile-child">${p(e.error)}</div>` : e.children.map((a) => `<div class="family-group-mobile-child">${this.renderMobileCard(a)}</div>`).join("") : "";
    return `
      <div class="family-group-mobile-header ${e.expanded ? "is-expanded" : "is-collapsed"}"
           data-group-id="${c(e.family_id)}"
           data-group-expanded="${e.expanded}">
        <button type="button" class="family-group-mobile-toggle" data-toggle-group="${c(e.family_id)}">
          <span class="family-group-expand-icon">${t}</span>
          <span class="family-group-mobile-label">${p(e.family_label || e.family_id)}</span>
          <span class="family-group-mobile-count">${e.assignment_count} assignments · ${e.locale_count} locales</span>
        </button>
        <div class="server-family-mobile-summary">${this.renderServerFamilyBlocker(e)}</div>
      </div>
      ${i}
    `;
  }
  renderCountPills(e) {
    return Object.entries(e).filter(([, t]) => t > 0).slice(0, 4).map(([t, i]) => `<span class="family-summary-pill">${p(b(t))} ${i}</span>`).join("");
  }
  renderPriorityPills(e) {
    return Object.entries(e).filter(([, t]) => t > 0).slice(0, 2).map(([t, i]) => `<span class="family-summary-pill priority-${c(t)}">${p(b(t))} ${i}</span>`).join("");
  }
  renderServerFamilyBlocker(e) {
    if (!e.family_blocker_count_available) return `<span class="family-summary-pill is-degraded" title="${c(e.family_blocker_count_reason || "persisted_blockers_unavailable")}">Blockers unavailable</span>`;
    const t = e.family_blocker_count ?? 0;
    return `<span class="family-summary-pill ${t > 0 ? "is-blocked" : ""}">${t} persisted ${t === 1 ? "blocker" : "blockers"}</span>`;
  }
  renderGroupedBody() {
    if (!this.groupedData) return "";
    const e = this.isAllPageSelected(), t = 8;
    return `
      <!-- Mobile Card View - Grouped (visible on small screens) -->
      <div class="flex flex-col gap-3 sm:hidden" data-queue-mobile-view="true" data-queue-grouped="true">
        ${this.groupedData.groups.map((i) => this.renderGroupedMobileCards(i)).join("")}
        ${this.groupedData.ungrouped.map((i) => this.renderMobileCard(q(i))).join("")}
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
              <th scope="col" class="queue-content-col">Content</th>
              <th scope="col" class="queue-locale-col">Locale</th>
              <th scope="col" class="queue-status-col">Status</th>
              <th scope="col" class="queue-owner-col">Owners</th>
              <th scope="col" class="queue-due-col">Due</th>
              <th scope="col" class="queue-priority-col">Priority</th>
              <th scope="col" class="queue-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.groupedData.groups.map((i) => this.renderFamilyGroupRows(i, t)).join("")}
            ${this.groupedData.ungrouped.map((i) => this.renderRow(q(i))).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  renderFamilyGroupRows(e, t) {
    const i = qe(e, { size: "sm" }), a = p(e.displayLabel || this.deriveFamilyGroupLabel(e)), l = e.records.length, d = e.expanded ? "▼" : "▶";
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
              <span class="family-group-expand-icon" aria-hidden="true">${d}</span>
            </button>
            <div class="family-group-info">
              <strong class="family-group-label">${a}</strong>
              <span class="family-group-count">${l} ${l === 1 ? "locale" : "locales"}</span>
            </div>
            <div class="family-group-summary">
              ${i}
            </div>
          </div>
        </td>
      </tr>
    ` + (e.expanded ? e.records.map((r) => {
      const n = q(r);
      return this.renderGroupChildRow(n, e.groupId);
    }).join("") : "");
  }
  renderGroupChildRow(e, t) {
    const i = !!e.assignee_id, a = !!e.reviewer_id, l = !!e.due_date, d = l || e.due_state === "overdue" || e.due_state === "due_soon", r = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row family-group-child ${r ? "is-selected" : ""}"
          data-assignment-id="${c(e.id)}"
          data-parent-group="${c(t)}"
          data-assignment-row="true"
          data-assignment-nav-group="table"
          tabindex="0"
          aria-label="${c(Y(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${c(e.id)}"
            ${r ? "checked" : ""}
            aria-label="Select assignment ${c(e.source_title || e.id)}"
          />
        </td>
        <td class="queue-content-col">
          <div class="queue-content-cell queue-content-cell-grouped">
            <span class="queue-content-indent"></span>
            <span class="queue-content-title-small" title="${c(e.source_title && e.source_path ? `${e.source_title} — ${e.source_path}` : e.source_title || e.source_path || e.id)}">${p(e.source_title || e.source_path || e.id)}</span>
          </div>
        </td>
        <td class="queue-locale-col">
          <div class="queue-locale-cell">
            <span class="locale-code">${p(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${p(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td class="queue-status-col">
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
        <td class="queue-owner-col">
          <div class="queue-owner-cell">
            ${i ? j("queue-owner-value", "Assignee", e.assignee_id, e.assignee_label) : ""}
            ${a ? j("queue-reviewer-value", "Reviewer", e.reviewer_id, e.reviewer_label) : ""}
          </div>
        </td>
        <td class="queue-due-col">
          <div class="queue-due-cell">
            ${d ? `<span class="due-pill due-${c(e.due_state)}">${p(b(e.due_state))}</span>` : ""}
            ${l ? `<span class="queue-due-date">${p(N(e.due_date, ""))}</span>` : ""}
          </div>
        </td>
        <td class="queue-priority-col">
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + b(e.priority))}"></span>
            <span class="priority-label">${p(b(e.priority))}</span>
          </div>
        </td>
        <td class="queue-action-col">
          <div class="queue-action-cell">
            ${(() => {
      const n = U(e, this.pendingActions);
      return K(e, n, V(n, e));
    })()}
          </div>
        </td>
      </tr>
    `;
  }
  renderGroupedMobileCards(e) {
    const t = p(e.displayLabel || this.deriveFamilyGroupLabel(e)), i = e.records.length, a = e.expanded ? "▼" : "▶";
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
    ` + (e.expanded ? e.records.map((l) => {
      const d = q(l);
      return `<div class="family-group-mobile-child">${this.renderMobileCard(d)}</div>`;
    }).join("") : "");
  }
  deriveFamilyGroupLabel(e) {
    if (e.displayLabel) return e.displayLabel;
    if (e.records.length > 0) {
      const t = e.records[0], i = [
        o(t.source_title),
        o(t.source_path),
        o(t.source_record_id)
      ];
      for (const a of i) if (a) return a;
    }
    return `Family ${e.groupId.length > 20 ? e.groupId.slice(0, 17) + "..." : e.groupId}`;
  }
  renderEmptyState(e) {
    const t = e === "families" ? "No families found" : "No assignments found", i = e === "families" ? "No families match the current filters. Try adjusting your filters or check back later." : "No assignments match the current filters. Try adjusting your filters or selecting a different preset.", a = this.getActiveFilterCount();
    return `
      <div class="${Me}" data-queue-state="empty">
        <svg class="h-12 w-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        <h3 class="${Ee} mt-4">${p(t)}</h3>
        <p class="${Ie} max-w-md mx-auto">${p(i)}</p>
        <div class="mt-5 flex items-center justify-center gap-3">
          ${a > 0 ? `
            <button type="button" class="${y}" data-clear-filters="true">
              Clear filters
            </button>
          ` : ""}
          <button type="button" class="${y}" data-queue-refresh="true">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
    `;
  }
  renderErrorState(e, t) {
    return `
      <div class="${Fe} p-6" data-queue-state="${e}" role="alert">
        <h2 class="${Re}">${e === "conflict" ? "Version conflict" : "Queue unavailable"}</h2>
        <p class="${Ge} mt-2">${p(t)}</p>
        <div class="mt-4">
          <button type="button" class="${y}" data-queue-refresh="true">Retry</button>
        </div>
      </div>
    `;
  }
  renderRow(e) {
    const t = !!e.assignee_id, i = !!e.reviewer_id, a = !!e.due_date, l = a || e.due_state === "overdue" || e.due_state === "due_soon", d = [];
    e.entity_type && d.push(e.entity_type), e.family_id && e.family_id !== e.source_path && d.push(e.family_id);
    const r = d.join(" · "), n = this.isRowSelected(e.id);
    return `
      <tr class="assignment-queue-row ${n ? "is-selected" : ""}" tabindex="0" data-assignment-id="${c(e.id)}" data-assignment-row="true" data-assignment-nav-group="table" aria-label="${c(Y(e))}">
        <td class="queue-select-col">
          <input
            type="checkbox"
            class="queue-row-select"
            data-select-row="${c(e.id)}"
            ${n ? "checked" : ""}
            aria-label="Select assignment ${c(e.source_title || e.id)}"
          />
        </td>
        <td class="queue-content-col">
          <div class="queue-content-cell">
            <strong class="queue-content-title" title="${c(e.source_title || e.source_path || e.id)}">${p(e.source_title || e.source_path || e.id)}</strong>
            ${e.source_path && e.source_title ? `<span class="queue-content-path" title="${c(e.source_path)}">${p(e.source_path)}</span>` : ""}
            ${r ? `<span class="queue-content-meta" title="${c(r)}">${p(r)}</span>` : ""}
          </div>
        </td>
        <td class="queue-locale-col">
          <div class="queue-locale-cell">
            <span class="locale-code">${p(e.source_locale.toUpperCase())}</span>
            <span class="locale-arrow">→</span>
            <span class="locale-code locale-target">${p(e.target_locale.toUpperCase())}</span>
          </div>
        </td>
        <td class="queue-status-col">
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
        <td class="queue-owner-col">
          <div class="queue-owner-cell">
            ${t ? j("queue-owner-value", "Assignee", e.assignee_id, e.assignee_label) : ""}
            ${i ? j("queue-reviewer-value", "Reviewer", e.reviewer_id, e.reviewer_label) : ""}
            ${e.last_rejection_reason ? `<span class="queue-feedback-note">${p(e.last_rejection_reason)}</span>` : ""}
          </div>
        </td>
        <td class="queue-due-col">
          <div class="queue-due-cell">
            ${l ? `<span class="due-pill due-${c(e.due_state)}">${p(b(e.due_state))}</span>` : ""}
            ${a ? `<span class="queue-due-date">${p(N(e.due_date, ""))}</span>` : ""}
          </div>
        </td>
        <td class="queue-priority-col">
          <div class="queue-priority-cell">
            <span class="priority-indicator priority-${c(e.priority)}" aria-label="${c("Priority: " + b(e.priority))}"></span>
            <span class="priority-label">${p(b(e.priority))}</span>
          </div>
        </td>
        <td class="queue-action-col">
          <div class="queue-action-cell">
            ${(() => {
      const u = U(e, this.pendingActions);
      return K(e, u, V(u, e));
    })()}
          </div>
        </td>
      </tr>
    `;
  }
  renderMobileCard(e) {
    const t = !!e.assignee_id, i = !!e.reviewer_id, a = !!e.due_date, l = a || e.due_state === "overdue" || e.due_state === "due_soon", d = this.isRowSelected(e.id);
    return `
      <article
        class="${Le} ${d ? "is-selected" : ""}"
        data-assignment-id="${c(e.id)}"
        data-assignment-card="true"
        data-assignment-nav-group="mobile"
        tabindex="0"
        role="button"
        aria-label="${c(Y(e))}"
      >
        <div class="${Ce}">
          <div class="mobile-card-select">
            <input
              type="checkbox"
              class="queue-row-select"
              data-select-row="${c(e.id)}"
              ${d ? "checked" : ""}
              aria-label="Select assignment ${c(e.source_title || e.id)}"
            />
          </div>
          <div class="mobile-card-title-group">
            <h3 class="${Te}" title="${c(e.source_title || e.source_path || e.id)}">${p(e.source_title || e.source_path || e.id)}</h3>
            <p class="${je}" title="${c(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}">${p(e.source_path && e.source_title ? e.source_path : e.entity_type || e.family_id)}</p>
          </div>
          ${G(e.queue_state, {
      domain: "queue",
      size: "sm"
    })}
        </div>
        <div class="${Oe}">
          <div class="${E}">
            <span class="${I}">Locale</span>
            <span class="${R}">
              <span class="locale-code">${p(e.source_locale.toUpperCase())}</span>
              <span class="locale-arrow">→</span>
              <span class="locale-code locale-target">${p(e.target_locale.toUpperCase())}</span>
            </span>
          </div>
          ${t ? `
          <div class="${E}">
            <span class="${I}">Assignee</span>
            <span class="${R}" title="${c(W("Assignee", e.assignee_id, e.assignee_label))}">${p(z(e.assignee_id, e.assignee_label))}</span>
          </div>
          ` : ""}
          ${i ? `
          <div class="${E}">
            <span class="${I}">Reviewer</span>
            <span class="${R}" title="${c(W("Reviewer", e.reviewer_id, e.reviewer_label))}">${p(z(e.reviewer_id, e.reviewer_label))}</span>
          </div>
          ` : ""}
          ${a || l ? `
          <div class="${E}">
            <span class="${I}">Due</span>
            <span class="${R}">
              ${l ? `<span class="due-pill due-${c(e.due_state)}">${p(b(e.due_state))}</span>` : ""}
              ${a ? `<span class="text-gray-600 ml-1">${p(N(e.due_date, ""))}</span>` : ""}
            </span>
          </div>
          ` : ""}
          <div class="${E}">
            <span class="${I}">Priority</span>
            <span class="${R}">
              <span class="priority-indicator priority-${c(e.priority)}"></span>
              <span class="priority-label">${p(b(e.priority))}</span>
            </span>
          </div>
        </div>
        <div class="${Pe}">
          ${(() => {
      const r = U(e, this.pendingActions);
      return K(e, r, V(r, e));
    })()}
        </div>
      </article>
    `;
  }
  attachEventListeners() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-preset-id]").forEach((r) => {
      r.addEventListener("click", () => {
        const n = r.dataset.presetId;
        n && this.setActivePreset(n);
      });
    }), this.container.querySelectorAll("[data-review-preset-id]").forEach((r) => {
      r.addEventListener("click", () => {
        const n = r.dataset.reviewPresetId;
        if (n) {
          this.setActiveReviewPreset(n);
          const u = this.container?.querySelector("[data-review-selector-menu]");
          u && !u.classList.contains("hidden") && this.closeReviewSelectorDropdown();
        }
      });
    }), this.container.querySelectorAll("[data-review-selector-toggle]").forEach((r) => {
      r.addEventListener("click", (n) => {
        n.stopPropagation(), this.toggleReviewSelectorDropdown();
      });
    }), this.container.querySelectorAll("[data-filter-name]").forEach((r) => {
      r.addEventListener("change", () => {
        const n = r.dataset.filterName;
        if (!n) return;
        const u = r.value.trim();
        switch (n) {
          case "status":
            this.updateFilter({ status: u || void 0 });
            break;
          case "due_state":
            this.updateFilter({ dueState: u || void 0 });
            break;
          case "priority":
            this.updateFilter({ priority: u || void 0 });
            break;
          case "entity_type":
            this.updateFilter({ entityType: u || void 0 });
            break;
          case "locale":
            this.updateFilter({ locale: u || void 0 });
            break;
          case "assignee_id":
            this.updateFilter({ assigneeId: u || void 0 });
            break;
          case "reviewer_id":
            this.updateFilter({ reviewerId: u || void 0 });
            break;
          case "sort":
            this.updateFilter({ sort: u || void 0 });
            break;
          case "order":
            this.updateFilter({ order: u || void 0 });
            break;
        }
      });
    }), this.container.querySelectorAll("[data-translation-refresh], [data-queue-refresh]").forEach((r) => {
      r.addEventListener("click", () => {
        this.load();
      });
    }), this.container.querySelectorAll("[data-filters-toggle]").forEach((r) => {
      r.addEventListener("click", () => {
        this.toggleFiltersExpanded();
      });
    }), this.container.querySelectorAll("[data-clear-filters]").forEach((r) => {
      r.addEventListener("click", () => {
        this.clearAllFilters();
      });
    }), this.container.querySelectorAll("[data-remove-filter]").forEach((r) => {
      r.addEventListener("click", () => {
        const n = r.dataset.removeFilter;
        n && this.removeFilter(n);
      });
    }), this.container.querySelectorAll("[data-toggle-sort-order]").forEach((r) => {
      r.addEventListener("click", () => {
        const n = this.queryState.order || "desc";
        this.updateFilter({ order: n === "asc" ? "desc" : "asc" });
      });
    }), this.container.querySelectorAll("[data-action]").forEach((r) => {
      r.addEventListener("click", () => {
        const n = r.dataset.action, u = r.dataset.assignmentId;
        if ((n === "claim" || n === "release") && u) {
          this.runInlineAction(n, u);
          return;
        }
        (n === "approve" || n === "reject" || n === "archive") && u && this.runReviewAction(n, u);
      });
    });
    const e = this.container.querySelector("[data-translation-select-all], [data-select-all]");
    e && e.addEventListener("change", () => {
      e.checked ? this.selectAllPage() : this.clearSelection();
    }), this.container.querySelectorAll("[data-translation-select-row], [data-select-row]").forEach((r) => {
      r.addEventListener("change", (n) => {
        n.stopPropagation();
        const u = r.dataset.translationSelectRow || r.dataset.selectRow;
        u && this.toggleRowSelection(u);
      }), r.addEventListener("click", (n) => {
        n.stopPropagation();
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
    }), this.container.querySelectorAll("[data-filter-snapshot-action]").forEach((r) => {
      r.addEventListener("click", () => {
        const n = r.dataset.filterSnapshotAction;
        (n === "assign" || n === "release" || n === "priority" || n === "archive") && this.runFilterSnapshotBulkAction(n);
      });
    }), this.container.querySelectorAll("[data-bulk-action]").forEach((r) => {
      r.addEventListener("click", () => {
        const n = r.dataset.bulkAction;
        (n === "release" || n === "archive") && this.runBulkAction(n);
      });
    }), this.container.querySelectorAll("[data-view-mode]").forEach((r) => {
      r.addEventListener("click", () => {
        const n = r.dataset.viewMode;
        (n === "flat" || n === "grouped" || n === "server_family") && this.setViewMode(n);
      });
    }), this.container.querySelectorAll("[data-toggle-group]").forEach((r) => {
      r.addEventListener("click", (n) => {
        n.stopPropagation();
        const u = r.dataset.toggleGroup;
        u && this.toggleGroupExpansion(u);
      });
    }), this.container.querySelectorAll("[data-overflow-menu]").forEach((r) => {
      r.addEventListener("click", (n) => {
        n.stopPropagation();
        const u = r.dataset.overflowMenu;
        if (!u) return;
        let m = r.closest(".queue-action-overflow-container")?.querySelector(`#menu-${u}`);
        if (m || (m = this.container?.querySelector(`#menu-${u}`) || null), !m) return;
        const v = m.hidden === !1;
        this.container?.querySelectorAll(".queue-action-overflow-menu").forEach((g) => {
          g.hidden = !0;
        }), this.container?.querySelectorAll("[data-overflow-menu]").forEach((g) => {
          g.setAttribute("aria-expanded", "false");
        }), v ? (m.hidden = !0, r.setAttribute("aria-expanded", "false")) : (m.hidden = !1, r.setAttribute("aria-expanded", "true"), m.querySelector('[role="menuitem"]:not([disabled])')?.focus());
      });
    }), this.container && typeof this.container.addEventListener == "function" && this.container.addEventListener("click", (r) => {
      r.target.closest(".queue-action-overflow-container") || (this.container?.querySelectorAll(".queue-action-overflow-menu").forEach((n) => {
        n.hidden = !0;
      }), this.container?.querySelectorAll("[data-overflow-menu]").forEach((n) => {
        n.setAttribute("aria-expanded", "false");
      }));
    }), this.container.querySelectorAll(".queue-action-overflow-menu").forEach((r) => {
      r.addEventListener("keydown", (n) => {
        const u = Array.from(r.querySelectorAll('[role="menuitem"]:not([disabled])')), m = u.findIndex((v) => v === document.activeElement);
        switch (n.key) {
          case "Escape":
            n.preventDefault(), r.hidden = !0;
            const v = r.closest(".queue-action-overflow-container")?.querySelector("[data-overflow-menu]");
            v && (v.setAttribute("aria-expanded", "false"), v.focus());
            break;
          case "ArrowDown":
            n.preventDefault(), m < u.length - 1 ? u[m + 1]?.focus() : u[0]?.focus();
            break;
          case "ArrowUp":
            n.preventDefault(), m > 0 ? u[m - 1]?.focus() : u[u.length - 1]?.focus();
            break;
          case "Tab":
            r.hidden = !0;
            const g = r.closest(".queue-action-overflow-container")?.querySelector("[data-overflow-menu]");
            g && g.setAttribute("aria-expanded", "false");
            break;
        }
      });
    });
    const l = this.container.querySelector("[data-expand-all]");
    l && l.addEventListener("click", () => {
      this.expandAllFamilyGroups();
    });
    const d = this.container.querySelector("[data-collapse-all]");
    d && d.addEventListener("click", () => {
      this.collapseAllFamilyGroups();
    }), this.container.querySelectorAll("[data-group-id]").forEach((r) => {
      (r.tagName.toLowerCase() === "tr" || r.classList.contains("family-group-mobile-header")) && (r.addEventListener("click", (n) => {
        if (n.target?.closest("button, a, input, select, textarea")) return;
        const u = r.dataset.groupId;
        u && this.toggleGroupExpansion(u);
      }), r.addEventListener("keydown", (n) => {
        if (!le(n, r) && (n.key === "Enter" || n.key === " ")) {
          n.preventDefault();
          const u = r.dataset.groupId;
          u && this.toggleGroupExpansion(u);
        }
      }));
    }), this.attachAssignmentNavigationTargets("[data-translation-row], [data-assignment-row]"), this.attachAssignmentNavigationTargets("[data-assignment-card]");
  }
  attachAssignmentNavigationTargets(e) {
    this.container && this.container.querySelectorAll(e).forEach((t) => {
      const i = () => t.dataset.translationRowId || t.dataset.assignmentId || "";
      t.addEventListener("click", (a) => {
        a.target?.closest("button, a, input, select, textarea") || this.openAssignment(i());
      }), t.addEventListener("keydown", (a) => {
        if (le(a, t)) return;
        const l = a.key;
        if (l === "Enter" || l === " ") {
          a.preventDefault(), this.openAssignment(i());
          return;
        }
        if (l !== "ArrowDown" && l !== "ArrowUp") return;
        const d = t.dataset.translationNavGroup || t.dataset.assignmentNavGroup;
        if (!d) return;
        a.preventDefault();
        const r = Array.from(this.container?.querySelectorAll(`[data-translation-nav-group="${d}"], [data-assignment-nav-group="${d}"]`) || []), n = r.indexOf(t);
        n < 0 || r[l === "ArrowDown" ? Math.min(n + 1, r.length - 1) : Math.max(n - 1, 0)]?.focus();
      });
    });
  }
  openAssignment(e) {
    const t = this.config.editorBasePath.trim().replace(/\/+$/, "");
    !t || !e || typeof window > "u" || (window.location.href = `${t}/${encodeURIComponent(e)}/edit`);
  }
};
J = me;
J.PANEL_ID = "translation-queue";
J.FILTERS_STORAGE_KEY = "go-admin:queue-filters-expanded";
function Y(s) {
  return [
    s.source_title || s.source_path || s.id,
    `${s.source_locale.toUpperCase()} to ${s.target_locale.toUpperCase()}`,
    s.queue_state,
    s.due_state
  ].filter(Boolean).join(", ");
}
function z(s, e) {
  return (e || s || "").trim();
}
function W(s, e, t) {
  const i = z(e, t);
  if (!i) return "";
  const a = (e || "").trim();
  return !a || i === a ? `${s}: ${i}` : `${s}: ${i} (${a})`;
}
function j(s, e, t, i) {
  const a = z(t, i);
  if (!a) return "";
  const l = W(e, t, i);
  return `<span class="${c(s)}" title="${c(l)}" aria-label="${c(l)}">${p(a)}</span>`;
}
function b(s) {
  return s ? s.replace(/_/g, " ").split(" ").filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "";
}
function ft() {
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

    /* Filter field styling */
    .queue-filter-field select {
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #111827;
      font: inherit;
      padding: 0.5rem 0.75rem;
      width: 100%;
    }

    .queue-filter-field select:focus {
      border-color: #3b82f6;
      outline: none;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
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

    /* Legacy preset/filter styles removed - now using panel-tabs and tailwind grid from design system */

    .queue-filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #374151;
      font-size: 0.875rem;
    }

    .queue-filter-field span {
      font-weight: 500;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
    }

    /* Filter chips */
    .queue-filter-chips-container {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }

    .queue-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .queue-filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      color: #1e40af;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .queue-filter-chip:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }

    .queue-filter-chip:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .queue-filter-chip-label {
      color: #64748b;
      font-weight: 500;
    }

    .queue-filter-chip-value {
      color: #1e40af;
      font-weight: 600;
    }

    .queue-filter-chip-remove {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      margin-left: 0.125rem;
    }

    .queue-filter-chip-clear-all {
      background: #f3f4f6;
      border-color: #d1d5db;
      color: #374151;
    }

    .queue-filter-chip-clear-all:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
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
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--translation-border-default, #e5e7eb);
      text-align: left;
      vertical-align: middle;
    }

    .assignment-queue-table th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--translation-text-muted, #6b7280);
      background: var(--translation-surface-muted, #f9fafb);
    }

    .assignment-queue-row {
      outline: none;
      transition: background-color 0.15s ease;
    }

    .assignment-queue-row:hover {
      background-color: var(--translation-surface-muted, #f9fafb);
    }

    .assignment-queue-row:focus-within {
      background-color: #eff6ff;
    }

    .assignment-queue-row.is-selected {
      background-color: #eff6ff;
    }

    /* Checkbox column alignment */
    .queue-select-col {
      width: 3rem;
      padding: 0.75rem 0.5rem !important;
      text-align: center;
      vertical-align: middle;
    }

    .queue-select-col input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
      margin: 0;
      cursor: pointer;
      accent-color: #2563eb;
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
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-path {
      display: block;
      font-size: 0.82rem;
      color: #6b7280;
      margin-top: 0.15rem;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-meta {
      display: block;
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.1rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queue-content-title-small {
      display: block;
      font-weight: 500;
      color: #111827;
      font-size: 0.875rem;
      max-width: 24rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
      max-width: 11rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #374151;
      font-size: 0.88rem;
    }

    .queue-reviewer-value {
      display: block;
      max-width: 11rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    .server-family-summary {
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .family-summary-pill {
      display: inline-flex;
      align-items: center;
      min-height: 1.5rem;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .family-summary-pill.is-blocked {
      background: #fef2f2;
      color: #991b1b;
    }

    .family-summary-pill.is-degraded {
      background: #fffbeb;
      color: #92400e;
    }

    .server-family-mobile-summary {
      padding: 0 0.75rem 0.75rem;
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

    /* T06: Action overflow menu styles */
    .queue-action-overflow-container {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      position: relative;
    }

    .queue-action-overflow-trigger {
      padding: 0.25rem 0.5rem;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 1.125rem;
      line-height: 1;
      color: #374151;
      transition: background-color 0.15s ease;
    }

    .queue-action-overflow-trigger:hover:not([disabled]) {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .queue-action-overflow-trigger:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .queue-action-overflow-trigger[aria-expanded="true"] {
      background: #f3f4f6;
      border-color: #6b7280;
    }

    .queue-action-overflow-menu {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 1000;
      min-width: 10rem;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 0.25rem 0;
      display: none;
    }

    .queue-action-overflow-menu[hidden] {
      display: none !important;
    }

    .queue-action-overflow-menu:not([hidden]) {
      display: block;
    }

    .queue-action-menu-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.5rem 1rem;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: #374151;
      transition: background-color 0.15s ease;
    }

    .queue-action-menu-item:hover:not([disabled]) {
      background: #f3f4f6;
    }

    .queue-action-menu-item:focus {
      background: #e5e7eb;
      outline: none;
    }

    .queue-action-menu-item[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      color: #9ca3af;
    }

    .action-pending-label {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.125rem;
    }

    /* Mobile card action overflow adjustments */
    .mobile-card-actions .queue-action-overflow-container {
      width: 100%;
    }

    .mobile-card-actions .queue-action-overflow-container > button:first-child {
      flex: 1;
    }

    /* Responsive column hiding for narrower viewports */
    @media (max-width: 1440px) {
      .queue-priority-col {
        display: none;
      }
    }

    @media (max-width: 1280px) {
      .queue-priority-col,
      .queue-due-col {
        display: none;
      }
    }

    @media (max-width: 1024px) {
      .queue-priority-col,
      .queue-due-col,
      .queue-owner-col {
        display: none;
      }
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

      .queue-priority-col,
      .queue-due-col,
      .queue-owner-col,
      .queue-locale-col {
        display: none;
      }

      /* T06: Touch-friendly overflow menu for mobile */
      .queue-action-overflow-menu {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto;
        border-radius: 0.75rem 0.75rem 0 0;
        max-height: 60vh;
        overflow-y: auto;
      }

      .queue-action-menu-item {
        padding: 1rem;
        min-height: 44px;
        font-size: 1rem;
      }

      .queue-action-overflow-trigger {
        min-width: 44px;
        min-height: 44px;
      }
    }
  `;
}
function gt() {
  if (typeof document > "u") return;
  const s = "assignment-queue-styles";
  if (document.getElementById(s)) return;
  const e = document.createElement("style");
  e.id = s, e.textContent = ft(), document.head.appendChild(e);
}
function vt(s, e) {
  gt();
  const t = new me(e);
  return t.mount(s), t;
}
function bt(s, e) {
  !s || s.dataset.assignmentQueueEnhanced === "true" || (s.dataset.assignmentQueueEnhanced = "true", Qe(s, { endpoint: s.dataset.actionEndpoint || e }));
}
function yt() {
  if (typeof window > "u" || !window.location) return !1;
  const s = (ue(window.location) ?? new URLSearchParams()).get("translation_client_render");
  return s === "1" || s === "true";
}
function Ct(s) {
  const e = s.dataset.endpoint || s.dataset.assignmentListEndpoint || "";
  if (!e) return null;
  if (s.dataset.ssrEnhanced === "true" && !yt())
    return bt(s, e), null;
  const t = typeof window < "u" ? ue(window.location) : null;
  return vt(s, {
    endpoint: e,
    bulkActionEndpoint: s.dataset.bulkActionEndpoint || s.dataset.bulkActionsEndpoint || "",
    bulkSnapshotEndpoint: s.dataset.bulkSnapshotEndpoint || "",
    editorBasePath: s.dataset.editorBasePath || "",
    title: s.dataset.title,
    description: s.dataset.description,
    initialPresetId: s.dataset.initialPresetId || Se(t ?? new URLSearchParams(), "preset") || ""
  });
}
function de(s) {
  const e = s.trim();
  if (!e) return "/admin/api/translations/assignment-actions/bulk";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/bulk` : "/admin/api/translations/assignment-actions/bulk";
}
function ce(s) {
  const e = s.trim();
  if (!e) return "/admin/api/translations/assignment-actions/snapshot";
  const t = e.indexOf("/translations/assignments");
  return t >= 0 ? `${e.slice(0, t)}/translations/assignment-actions/snapshot` : "/admin/api/translations/assignment-actions/snapshot";
}
export {
  D as AssignmentQueueRequestError,
  me as AssignmentQueueScreen,
  Z as DEFAULT_ASSIGNMENT_QUEUE_REVIEW_FILTERS,
  A as DEFAULT_ASSIGNMENT_QUEUE_SAVED_FILTERS,
  pt as applyOptimisticAssignmentAction,
  Ne as buildAssignmentActionURL,
  et as buildAssignmentListQuery,
  st as buildAssignmentListURL,
  lt as claimAssignment,
  vt as createAssignmentQueueScreen,
  ot as fetchAssignmentList,
  ft as getAssignmentQueueStyles,
  Ct as initAssignmentQueueScreen,
  Qe as initAssignmentSSRRowActions,
  nt as normalizeAssignmentActionResponse,
  Xe as normalizeAssignmentListMeta,
  at as normalizeAssignmentListResponse,
  q as normalizeAssignmentListRow,
  M as presetToQueryState,
  dt as releaseAssignment,
  de as resolveAssignmentBulkActionEndpoint,
  ce as resolveAssignmentBulkSnapshotEndpoint,
  tt as snapshotFiltersFromQueryState
};

//# sourceMappingURL=index.js.map
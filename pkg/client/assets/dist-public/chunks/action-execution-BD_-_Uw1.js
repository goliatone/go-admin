import { escapeHTML as o } from "../shared/html.js";
import { createLogger as D } from "../shared/logger.js";
import { createStructuredActionError as O, executeStructuredRequest as N, formatStructuredErrorForDisplay as $ } from "../toast/error-helpers.js";
var se = { async prompt(e) {
  const { PayloadInputModal: n } = await import("./payload-modal-CoSFaAQq.js");
  return n.prompt(e);
} }, C = {
  draft: {
    tone: "neutral",
    label: "Draft",
    icon: "edit-pencil"
  },
  open: {
    tone: "info",
    label: "Open",
    icon: "mail-in"
  },
  pending: {
    tone: "warning",
    label: "Pending",
    icon: "clock"
  },
  assigned: {
    tone: "info",
    label: "Assigned",
    icon: "user"
  },
  in_progress: {
    tone: "info",
    label: "In Progress",
    icon: "arrow-right"
  },
  in_review: {
    tone: "warning",
    label: "In Review",
    icon: "clock"
  },
  review: {
    tone: "warning",
    label: "In Review",
    icon: "clock"
  },
  changes_requested: {
    tone: "error",
    label: "Changes Requested",
    icon: "edit"
  },
  approved: {
    tone: "success",
    label: "Approved",
    icon: "check-circle"
  },
  rejected: {
    tone: "error",
    label: "Rejected",
    icon: "xmark-circle"
  },
  archived: {
    tone: "neutral",
    label: "Archived",
    icon: "archive"
  },
  ready: {
    tone: "success",
    label: "Ready",
    icon: "check"
  },
  blocked: {
    tone: "error",
    label: "Blocked",
    icon: "prohibition"
  },
  missing_locales: {
    tone: "warning",
    label: "Missing Locales",
    icon: "warning-circle"
  },
  missing_fields: {
    tone: "warning",
    label: "Missing Fields",
    icon: "warning-circle"
  },
  missing_locales_and_fields: {
    tone: "error",
    label: "Not Ready",
    icon: "warning-triangle"
  },
  not_started: {
    tone: "neutral",
    label: "Not Started",
    icon: "circle"
  },
  missing: {
    tone: "error",
    label: "Missing",
    icon: "warning-circle"
  },
  fallback: {
    tone: "warning",
    label: "Fallback",
    icon: "arrow-down"
  },
  not_required: {
    tone: "neutral",
    label: "Not Required",
    icon: "minus"
  },
  low: {
    tone: "neutral",
    label: "Low",
    icon: "minus"
  },
  normal: {
    tone: "info",
    label: "Normal",
    icon: "circle"
  },
  high: {
    tone: "warning",
    label: "High",
    icon: "arrow-up"
  },
  urgent: {
    tone: "error",
    label: "Urgent",
    icon: "warning-triangle"
  },
  critical: {
    tone: "error",
    label: "Critical",
    icon: "flash"
  },
  on_track: {
    tone: "success",
    label: "On Track",
    icon: "check-circle"
  },
  due_soon: {
    tone: "warning",
    label: "Due Soon",
    icon: "clock"
  },
  overdue: {
    tone: "error",
    label: "Overdue",
    icon: "warning-triangle"
  },
  none: {
    tone: "neutral",
    label: "No Due Date",
    icon: "clock"
  },
  pending_review: {
    tone: "warning",
    label: "Pending Review",
    icon: "clock"
  },
  review_approved: {
    tone: "success",
    label: "Review Approved",
    icon: "check-circle"
  },
  review_rejected: {
    tone: "error",
    label: "Review Rejected",
    icon: "xmark-circle"
  },
  published: {
    tone: "success",
    label: "Published",
    icon: "check-circle"
  },
  unpublished: {
    tone: "neutral",
    label: "Unpublished",
    icon: "minus"
  },
  pending_publish: {
    tone: "warning",
    label: "Pending Publish",
    icon: "clock"
  },
  active: {
    tone: "success",
    label: "Active",
    icon: "check-circle"
  },
  inactive: {
    tone: "neutral",
    label: "Inactive",
    icon: "pause"
  },
  enabled: {
    tone: "success",
    label: "Enabled",
    icon: "check-circle"
  },
  disabled: {
    tone: "neutral",
    label: "Disabled",
    icon: "pause"
  },
  completed: {
    tone: "success",
    label: "Completed",
    icon: "check"
  },
  failed: {
    tone: "error",
    label: "Failed",
    icon: "xmark"
  },
  cancelled: {
    tone: "neutral",
    label: "Cancelled",
    icon: "xmark-circle"
  },
  running: {
    tone: "info",
    label: "Running",
    icon: "arrow-right"
  },
  suspended: {
    tone: "warning",
    label: "Suspended",
    icon: "pause"
  },
  deprecated: {
    tone: "error",
    label: "Deprecated",
    icon: "warning-triangle"
  },
  breaking: {
    tone: "error",
    label: "Breaking",
    icon: "warning-triangle"
  },
  migrating: {
    tone: "info",
    label: "Migrating",
    icon: "arrow-right"
  },
  migrated: {
    tone: "success",
    label: "Migrated",
    icon: "check"
  },
  required: {
    tone: "warning",
    label: "Required",
    icon: "warning-circle"
  },
  readonly: {
    tone: "neutral",
    label: "Read Only",
    icon: "lock"
  },
  hidden: {
    tone: "neutral",
    label: "Hidden",
    icon: "eye-closed"
  },
  unknown: {
    tone: "neutral",
    label: "Unknown",
    icon: "help-circle"
  },
  success: {
    tone: "success",
    label: "Success",
    icon: "check"
  },
  error: {
    tone: "error",
    label: "Error",
    icon: "xmark"
  },
  conflict: {
    tone: "warning",
    label: "Conflict",
    icon: "warning-triangle"
  },
  skipped: {
    tone: "neutral",
    label: "Skipped",
    icon: "minus"
  },
  missing_locale: {
    tone: "warning",
    label: "Missing Locale",
    icon: "warning-circle"
  },
  missing_field: {
    tone: "warning",
    label: "Missing Field",
    icon: "warning-circle"
  },
  outdated_source: {
    tone: "error",
    label: "Outdated Source",
    icon: "warning-triangle"
  },
  qa_blocked: {
    tone: "error",
    label: "QA Blocked",
    icon: "prohibition"
  },
  policy_denied: {
    tone: "error",
    label: "Policy Denied",
    icon: "prohibition"
  },
  validation_error: {
    tone: "error",
    label: "Validation Error",
    icon: "warning-triangle"
  },
  permission_denied: {
    tone: "error",
    label: "Permission Denied",
    icon: "prohibition"
  },
  complete: {
    tone: "success",
    label: "Complete",
    icon: "check"
  },
  drift: {
    tone: "warning",
    label: "Source Changed",
    icon: "warning-triangle"
  }
}, oe = Object.fromEntries(Object.entries(C).map(([e, n]) => [e, n.tone])), j = {
  healthy: "success",
  ok: "success",
  warning: "warning",
  critical: "error",
  error: "error",
  info: "info",
  neutral: "neutral"
};
function x(e) {
  return e?.toLowerCase().trim().replace(/-/g, "_") || "";
}
function P(e) {
  return C[x(e)] ?? null;
}
function le(e, n = "translation") {
  const t = x(e);
  return n === "alert" ? j[t] || "neutral" : C[t]?.tone || "neutral";
}
function R(e) {
  return x(e).split("_").filter(Boolean).map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(" ");
}
function B(e, n = "badge") {
  if (n === "badge") return `status-chip status-chip--${e}`;
  const t = {
    neutral: {
      bg: "bg-gray-100",
      text: "text-gray-700"
    },
    info: {
      bg: "bg-sky-50",
      text: "text-sky-700"
    },
    success: {
      bg: "bg-emerald-50",
      text: "text-emerald-700"
    },
    warning: {
      bg: "bg-amber-50",
      text: "text-amber-700"
    },
    error: {
      bg: "bg-rose-50",
      text: "text-rose-700"
    }
  };
  return t[e]?.[n] || t.neutral[n];
}
function y(e) {
  return typeof e == "string" ? e.trim() : "";
}
function l(e) {
  return (typeof e == "string" ? e.trim() : "") || void 0;
}
function u(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function U(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const n = e, t = l(n.label), r = l(n.href), a = l(n.kind);
  return !t && !r && !a ? null : {
    ...t ? { label: t } : {},
    ...r ? { href: r } : {},
    ...a ? { kind: a } : {}
  };
}
function H(e) {
  if (!Array.isArray(e)) return;
  const n = e.map((t) => l(t)).filter((t) => !!t);
  return n.length > 0 ? n : void 0;
}
function V(e) {
  return [
    "enabled",
    "reason",
    "reason_code",
    "severity",
    "kind",
    "permission",
    "metadata",
    "remediation",
    "available_transitions"
  ].some((n) => n in e);
}
function F(e) {
  if (typeof e != "number" || !Number.isFinite(e)) return;
  const n = Math.trunc(e);
  return n > 0 ? n : void 0;
}
function z(e, n = 0) {
  return !e || n > 2 ? "" : y(e.reason_code) || y(e.textCode) || y(e.text_code) || z(e.error ?? void 0, n + 1);
}
function k(e) {
  if (typeof e == "string") return e.trim().toUpperCase() || null;
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const n = z(e);
  return n ? n.toUpperCase() : null;
}
function q(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const n = e;
  if (!V(n)) return null;
  const t = k({ reason_code: n.reason_code }), r = { enabled: typeof n.enabled == "boolean" ? n.enabled : !1 }, a = l(n.reason), s = l(n.severity), d = l(n.kind), g = l(n.permission), b = n.metadata && typeof n.metadata == "object" && !Array.isArray(n.metadata) ? n.metadata : null, f = U(n.remediation), M = H(n.available_transitions);
  return a && (r.reason = a), t && (r.reason_code = t), s && (r.severity = s), d && (r.kind = d), g && (r.permission = g), b && (r.metadata = b), f && (r.remediation = f), M && (r.available_transitions = M), r;
}
function T(e) {
  if (!u(e)) return {};
  const n = e, t = {};
  for (const [r, a] of Object.entries(n)) {
    const s = l(r), d = q(a);
    !s || !d || (t[s] = d);
  }
  return t;
}
function I(e) {
  return T(e);
}
function Y(e) {
  if (!u(e)) return null;
  const n = e.selection_sensitive === !0, t = l(e.selection_state_endpoint), r = F(e.debounce_ms);
  if (!n && !t && r === void 0) return null;
  const a = {};
  return n && (a.selection_sensitive = !0), t && (a.selection_state_endpoint = t), r !== void 0 && (a.debounce_ms = r), a;
}
function L(e) {
  if (!u(e)) return null;
  const n = T(e._action_state);
  return Object.keys(n).length === 0 ? { ...e } : {
    ...e,
    _action_state: n
  };
}
function G(e) {
  if (!u(e)) return null;
  const n = I(e.bulk_action_state);
  return Object.keys(n).length === 0 ? { ...e } : {
    ...e,
    bulk_action_state: n
  };
}
function ce(e) {
  if (!u(e)) return null;
  const n = I(e.bulk_action_state);
  if (Object.keys(n).length === 0) return null;
  const t = { bulk_action_state: n };
  return u(e.selection) && (t.selection = e.selection), t;
}
function ue(e) {
  if (!u(e)) return null;
  const n = Array.isArray(e.data) ? e.data : Array.isArray(e.records) ? e.records : null, t = n && n.map((s) => L(s) ?? s), r = G(e.$meta), a = { ...e };
  if (t && (Array.isArray(e.data) && (a.data = t), Array.isArray(e.records) && (a.records = t)), r && (a.$meta = r), u(e.schema)) {
    const s = Y(e.schema.bulk_action_state_config);
    s && (a.schema = {
      ...e.schema,
      bulk_action_state_config: s
    });
  }
  return a;
}
function de(e) {
  return u(e) ? u(e.data) ? {
    ...e,
    data: L(e.data)
  } : { ...e } : null;
}
function ge(e, n) {
  const t = l(n);
  return t && T(e._action_state)[t] || null;
}
var J = D("DataGrid"), c = {
  check: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
  warning: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z",
  error: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z",
  info: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
  clock: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z",
  document: "M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z",
  archive: "M4 3a2 2 0 100 4h12a2 2 0 100-4H4zm0 6a1 1 0 00-1 1v7a1 1 0 001 1h12a1 1 0 001-1v-7a1 1 0 00-1-1H4zm4 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z",
  user: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z",
  play: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",
  lock: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z",
  ban: "M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
}, Q = {
  neutral: "bg-gray-100",
  info: "bg-sky-50",
  success: "bg-emerald-50",
  warning: "bg-amber-50",
  error: "bg-rose-50"
}, X = {
  neutral: "text-gray-700",
  info: "text-sky-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700"
}, W = {
  neutral: "border-gray-200",
  info: "border-sky-200",
  success: "border-emerald-200",
  warning: "border-amber-200",
  error: "border-rose-200"
};
function i(e, n = {}) {
  const t = P(e), r = t?.tone ?? "neutral";
  return {
    label: t?.label ?? R(e),
    shortLabel: n.shortLabel,
    colorClass: B(r, "badge"),
    bgClass: Q[r],
    textClass: X[r],
    borderClass: W[r],
    icon: t?.icon ?? "help-circle",
    iconType: "iconoir",
    severity: r,
    description: n.description
  };
}
var h = {
  ready: i("ready", {
    shortLabel: "Ready",
    description: "All required translations are complete"
  }),
  missing_locales: i("missing_locales", {
    shortLabel: "Missing",
    description: "Required locale translations are missing"
  }),
  missing_fields: i("missing_fields", {
    shortLabel: "Incomplete",
    description: "Some translations have missing required fields"
  }),
  missing_locales_and_fields: i("missing_locales_and_fields", {
    shortLabel: "Not Ready",
    description: "Missing translations and incomplete fields"
  })
}, _ = {
  open: i("open", { description: "Available to be claimed" }),
  pending: i("pending", { description: "Waiting to be assigned" }),
  assigned: i("assigned", { description: "Assigned to a translator" }),
  in_progress: i("in_progress", { description: "Translation in progress" }),
  review: i("review", { description: "Pending review" }),
  rejected: i("rejected", { description: "Translation rejected" }),
  approved: i("approved", { description: "Translation approved" }),
  published: i("published", { description: "Translation published" }),
  archived: i("archived", { description: "Translation archived" })
}, w = {
  draft: i("draft", { description: "Draft content" }),
  review: i("review", { description: "Content under review" }),
  ready: i("ready", { description: "Content ready" }),
  archived: i("archived", { description: "Content archived" })
}, S = {
  overdue: i("overdue", { description: "Past due date" }),
  due_soon: i("due_soon", { description: "Due within 24 hours" }),
  on_track: i("on_track", { description: "On schedule" }),
  none: i("none", { description: "No due date set" })
}, v = {
  success: i("success", { description: "Import/export succeeded" }),
  error: i("error", { description: "Import/export failed" }),
  conflict: i("conflict", { description: "Conflicting changes detected" }),
  skipped: i("skipped", { description: "Row skipped" })
}, A = {
  running: i("running", { description: "Job in progress" }),
  completed: i("completed", { description: "Job completed successfully" }),
  failed: i("failed", { description: "Job failed" })
}, m = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: c.warning,
    severity: "warning",
    actionable: !0,
    actionLabel: "Create translation"
  },
  INVALID_STATUS: {
    message: "Action not available in current status",
    shortMessage: "Invalid status",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: c.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: c.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: c.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: c.ban,
    severity: "info",
    actionable: !1
  },
  RESOURCE_IN_USE: {
    message: "This resource is currently in use",
    shortMessage: "Resource in use",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: c.warning,
    severity: "warning",
    actionable: !0,
    actionLabel: "Review usage"
  },
  PRECONDITION_FAILED: {
    message: "Action preconditions are not satisfied",
    shortMessage: "Precondition failed",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: c.warning,
    severity: "warning",
    actionable: !1
  },
  INVALID_SELECTION: {
    message: "The current selection is not valid for this action",
    shortMessage: "Invalid selection",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: c.info,
    severity: "info",
    actionable: !1
  },
  RATE_LIMITED: {
    message: "Too many requests. Please try again shortly",
    shortMessage: "Rate limited",
    colorClass: "bg-orange-100 text-orange-800",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    icon: c.clock,
    severity: "warning",
    actionable: !1
  },
  TEMPORARILY_UNAVAILABLE: {
    message: "This action is temporarily unavailable",
    shortMessage: "Temporarily unavailable",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: c.ban,
    severity: "info",
    actionable: !1
  }
};
function p(e, n) {
  const t = e.toLowerCase();
  if ((!n || n === "core") && t in h)
    return h[t];
  if (!n || n === "queue") {
    if (t in _) return _[t];
    if (t in w) return w[t];
    if (t in S) return S[t];
  }
  if (!n || n === "exchange") {
    if (t in v) return v[t];
    if (t in A) return A[t];
  }
  return null;
}
function E(e) {
  const n = k(e);
  return n && n in m ? m[n] : null;
}
function be(e) {
  const n = k(e);
  return n && n in m ? m[n] : null;
}
function fe(e, n) {
  return p(e, n) !== null;
}
function me(e) {
  return E(e) !== null;
}
function pe(e) {
  switch (e) {
    case "core":
      return Object.keys(h);
    case "queue":
      return [
        ...Object.keys(_),
        ...Object.keys(w),
        ...Object.keys(S)
      ];
    case "exchange":
      return [...Object.keys(v), ...Object.keys(A)];
    default:
      return [];
  }
}
function ye() {
  return Object.keys(m);
}
function he(e, n) {
  return p(e, n) ? `status-${e.toLowerCase()}` : "";
}
function _e(e, n) {
  const t = p(e, n);
  return t ? `severity-${t.severity}` : "";
}
function K(e, n = {}) {
  const t = p(e, n.domain);
  if (!t) return `<span class="status-chip status-chip--neutral" data-status="${o(e)}" data-tone="neutral">${o(R(e) || e)}</span>`;
  const { size: r = "default", showIcon: a = !0, showLabel: s = !0, extraClass: d = "" } = n, g = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5",
    default: ""
  }, b = a ? Z(t, r) : "", f = s ? `<span>${o(t.label)}</span>` : "";
  return `<span class="status-chip status-chip--${t.severity} ${g[r]} ${d}"
                title="${o(t.description || t.label)}"
                aria-label="${o(t.label)}"
                data-status="${o(e)}"
                data-tone="${t.severity}">
    ${b}${f}
  </span>`;
}
function Z(e, n = "default") {
  const t = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  if (e.iconType === "iconoir") {
    const r = n === "default" ? "text-xs" : "text-[10px]";
    return `<i class="iconoir-${e.icon} ${r}" aria-hidden="true"></i>`;
  }
  return e.iconType === "char" ? `<span class="${t[n]} inline-flex items-center justify-center" aria-hidden="true">${e.icon}</span>` : `<svg class="${t[n]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${e.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function ee(e, n = {}) {
  const t = E(e);
  if (!t) return `<span class="text-gray-500 text-xs">${o(e)}</span>`;
  const { size: r = "default", showIcon: a = !0, showFullMessage: s = !1, extraClass: d = "" } = n, g = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, b = a ? `<svg class="${r === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
      </svg>` : "", f = s ? t.message : t.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${g[r]} ${t.colorClass} ${d}"
                role="status"
                aria-label="${o(t.message)}"
                data-reason-code="${o(e)}">
    ${b}
    <span>${o(f)}</span>
  </span>`;
}
function we(e, n) {
  const t = E(e);
  if (!t) return "";
  const r = n || t.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${t.bgClass} ${t.textClass}"
                title="${o(r)}"
                aria-label="${o(t.shortMessage)}"
                data-reason-code="${o(e)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function Se(e = {}) {
  return (n) => typeof n != "string" || !n ? '<span class="text-gray-400">-</span>' : K(n, e);
}
function ve(e = {}) {
  return (n) => typeof n != "string" || !n ? "" : ee(n, e);
}
function Ae(e) {
  e.schema_version !== 1 && J.warn("[TranslationStatusVocabulary] Unknown schema version:", e.schema_version);
}
function Ce() {
  return `
    /* Status Vocabulary Styles */
    [data-status],
    [data-reason-code] {
      transition: opacity 0.15s ease;
    }

    [data-status]:hover,
    [data-reason-code]:hover {
      opacity: 0.9;
    }

    /* Severity-based animations */
    [data-status="overdue"],
    [data-status="rejected"],
    [data-status="error"],
    [data-status="failed"] {
      animation: pulse-subtle 2s ease-in-out infinite;
    }

    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
  `;
}
function ne(e) {
  return {
    textCode: null,
    message: e,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function te(e) {
  const n = String(e.confirmMessage || "Are you sure you want to delete this item?").trim() || "Are you sure you want to delete this item?", t = String(e.confirmTitle || "Confirm Delete").trim() || "Confirm Delete";
  if (e.notifier?.confirm) return e.notifier.confirm(n, {
    title: t,
    confirmText: "Delete",
    cancelText: "Cancel"
  });
  const r = globalThis.window;
  return r && typeof r.confirm == "function" ? r.confirm(n) : !0;
}
async function xe(e) {
  if (!await te(e)) return null;
  const n = await N(e.endpoint, {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  if (n.success)
    return await e.onSuccess?.(n), n;
  const t = String(e.fallbackMessage || "Delete failed").trim() || "Delete failed", r = n.error || ne(t), a = {
    ...r,
    message: $(r, t)
  };
  throw a.textCode && e.reconcileOnDomainFailure && await e.reconcileOnDomainFailure(a), await e.onError?.(a), O(a, t, !!e.onError);
}
export {
  L as A,
  we as C,
  q as D,
  k as E,
  ue as F,
  ge as I,
  le as L,
  I as M,
  ce as N,
  T as O,
  de as P,
  se as R,
  ee as S,
  Z as T,
  Ce as _,
  v as a,
  me as b,
  _ as c,
  be as d,
  ye as f,
  p as g,
  he as h,
  A as i,
  Y as j,
  G as k,
  ve as l,
  _e as m,
  h as n,
  w as o,
  E as p,
  m as r,
  S as s,
  xe as t,
  Se as u,
  pe as v,
  K as w,
  fe as x,
  Ae as y
};

//# sourceMappingURL=action-execution-BD_-_Uw1.js.map
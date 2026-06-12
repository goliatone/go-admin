var l = {
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
}, k = Object.fromEntries(Object.entries(l).map(([e, n]) => [e, n.tone])), b = {
  healthy: "success",
  ok: "success",
  warning: "warning",
  critical: "error",
  error: "error",
  info: "info",
  neutral: "neutral"
}, g = "help-circle";
function o(e) {
  return e?.toLowerCase().trim().replace(/-/g, "_") || "";
}
function c(e) {
  return l[o(e)] ?? null;
}
function d(e, n = "translation") {
  const r = o(e);
  return n === "alert" ? b[r] || "neutral" : l[r]?.tone || "neutral";
}
function p(e) {
  const n = c(e);
  return n ? n.label : w(e);
}
function w(e) {
  return o(e).split("_").filter(Boolean).map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(" ");
}
function h(e, n = "badge") {
  if (n === "badge") return `status-chip status-chip--${e}`;
  const r = {
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
  return r[e]?.[n] || r.neutral[n];
}
function m(e) {
  return c(e)?.icon || g;
}
function f(e, n) {
  return {
    status: e,
    tone: d(e),
    icon: m(e),
    label: n || p(e)
  };
}
function _(e, n = {}) {
  const r = f(e, n.label), a = n.showIcon !== !1, t = `${h(r.tone, "badge")}${n.extraClass ? ` ${n.extraClass}` : ""}`, s = a ? `<i class="iconoir-${r.icon} text-[10px]" aria-hidden="true"></i>` : "", u = n.count === void 0 || n.count === null || n.count === "" ? "" : `<span class="status-chip__count">${i(String(n.count))}</span>`;
  return `<span class="${t}" data-status="${i(e)}">${s}${i(r.label)}${u}</span>`;
}
function i(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export {
  h as a,
  d as i,
  c as n,
  w as o,
  p as r,
  _ as s,
  l as t
};

//# sourceMappingURL=status-vocabulary-Bdx_bn1-.js.map
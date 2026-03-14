function C(e) {
  return typeof e == "string" ? e.trim() : "";
}
function l(e) {
  return (typeof e == "string" ? e.trim() : "") || void 0;
}
function w(e) {
  if (!e || typeof e != "object" || Array.isArray(e))
    return null;
  const s = e, t = l(s.label), r = l(s.href), n = l(s.kind);
  return !t && !r && !n ? null : {
    ...t ? { label: t } : {},
    ...r ? { href: r } : {},
    ...n ? { kind: n } : {}
  };
}
function z(e) {
  if (!Array.isArray(e))
    return;
  const s = e.map((t) => l(t)).filter((t) => !!t);
  return s.length > 0 ? s : void 0;
}
function I(e) {
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
  ].some((s) => s in e);
}
function _(e, s = 0) {
  return !e || s > 2 ? "" : C(e.reason_code) || C(e.textCode) || C(e.text_code) || _(e.error ?? void 0, s + 1);
}
function A(e) {
  if (typeof e == "string")
    return e.trim().toUpperCase() || null;
  if (!e || typeof e != "object" || Array.isArray(e))
    return null;
  const t = _(e);
  return t ? t.toUpperCase() : null;
}
function M(e) {
  if (!e || typeof e != "object" || Array.isArray(e))
    return null;
  const s = e;
  if (!I(s))
    return null;
  const t = A({ reason_code: s.reason_code }), r = {
    enabled: typeof s.enabled == "boolean" ? s.enabled : !1
  }, n = l(s.reason), i = l(s.severity), c = l(s.kind), g = l(s.permission), b = s.metadata && typeof s.metadata == "object" && !Array.isArray(s.metadata) ? s.metadata : null, d = w(s.remediation), u = z(s.available_transitions);
  return n && (r.reason = n), t && (r.reason_code = t), i && (r.severity = i), c && (r.kind = c), g && (r.permission = g), b && (r.metadata = b), d && (r.remediation = d), u && (r.available_transitions = u), r;
}
function E(e) {
  if (!e || typeof e != "object" || Array.isArray(e))
    return {};
  const s = e, t = {};
  for (const [r, n] of Object.entries(s)) {
    const i = l(r), c = M(n);
    !i || !c || (t[i] = c);
  }
  return t;
}
function $(e, s) {
  const t = l(s);
  return t && E(e._action_state)[t] || null;
}
const a = {
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
}, x = {
  ready: {
    label: "Ready",
    shortLabel: "Ready",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    borderClass: "border-green-300",
    icon: "●",
    iconType: "char",
    severity: "success",
    description: "All required translations are complete"
  },
  missing_locales: {
    label: "Missing Locales",
    shortLabel: "Missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    borderClass: "border-amber-300",
    icon: "○",
    iconType: "char",
    severity: "warning",
    description: "Required locale translations are missing"
  },
  missing_fields: {
    label: "Incomplete Fields",
    shortLabel: "Incomplete",
    colorClass: "bg-yellow-100 text-yellow-700",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
    borderClass: "border-yellow-300",
    icon: "◐",
    iconType: "char",
    severity: "warning",
    description: "Some translations have missing required fields"
  },
  missing_locales_and_fields: {
    label: "Not Ready",
    shortLabel: "Not Ready",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    borderClass: "border-red-300",
    icon: "○",
    iconType: "char",
    severity: "error",
    description: "Missing translations and incomplete fields"
  }
}, f = {
  pending: {
    label: "Pending",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: a.clock,
    iconType: "svg",
    severity: "neutral",
    description: "Waiting to be assigned"
  },
  assigned: {
    label: "Assigned",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: a.user,
    iconType: "svg",
    severity: "info",
    description: "Assigned to a translator"
  },
  in_progress: {
    label: "In Progress",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: a.play,
    iconType: "svg",
    severity: "info",
    description: "Translation in progress"
  },
  review: {
    label: "In Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: a.document,
    iconType: "svg",
    severity: "info",
    description: "Pending review"
  },
  rejected: {
    label: "Rejected",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: a.error,
    iconType: "svg",
    severity: "error",
    description: "Translation rejected"
  },
  approved: {
    label: "Approved",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: a.check,
    iconType: "svg",
    severity: "success",
    description: "Translation approved"
  },
  published: {
    label: "Published",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: a.check,
    iconType: "svg",
    severity: "success",
    description: "Translation published"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: a.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Translation archived"
  }
}, m = {
  draft: {
    label: "Draft",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: a.document,
    iconType: "svg",
    severity: "neutral",
    description: "Draft content"
  },
  review: {
    label: "Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: a.document,
    iconType: "svg",
    severity: "info",
    description: "Content under review"
  },
  ready: {
    label: "Ready",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: a.check,
    iconType: "svg",
    severity: "success",
    description: "Content ready"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: a.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Content archived"
  }
}, v = {
  overdue: {
    label: "Overdue",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: a.warning,
    iconType: "svg",
    severity: "error",
    description: "Past due date"
  },
  due_soon: {
    label: "Due Soon",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: a.clock,
    iconType: "svg",
    severity: "warning",
    description: "Due within 24 hours"
  },
  on_track: {
    label: "On Track",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: a.check,
    iconType: "svg",
    severity: "success",
    description: "On schedule"
  },
  none: {
    label: "No Due Date",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: a.clock,
    iconType: "svg",
    severity: "neutral",
    description: "No due date set"
  }
}, h = {
  success: {
    label: "Success",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: a.check,
    iconType: "svg",
    severity: "success",
    description: "Import/export succeeded"
  },
  error: {
    label: "Error",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: a.error,
    iconType: "svg",
    severity: "error",
    description: "Import/export failed"
  },
  conflict: {
    label: "Conflict",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: a.warning,
    iconType: "svg",
    severity: "warning",
    description: "Conflicting changes detected"
  },
  skipped: {
    label: "Skipped",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: a.ban,
    iconType: "svg",
    severity: "neutral",
    description: "Row skipped"
  }
}, T = {
  running: {
    label: "Running",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: a.play,
    iconType: "svg",
    severity: "info",
    description: "Job in progress"
  },
  completed: {
    label: "Completed",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: a.check,
    iconType: "svg",
    severity: "success",
    description: "Job completed successfully"
  },
  failed: {
    label: "Failed",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: a.error,
    iconType: "svg",
    severity: "error",
    description: "Job failed"
  }
}, y = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: a.warning,
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
    icon: a.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: a.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: a.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: a.ban,
    severity: "info",
    actionable: !1
  },
  RESOURCE_IN_USE: {
    message: "This resource is currently in use",
    shortMessage: "Resource in use",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: a.warning,
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
    icon: a.warning,
    severity: "warning",
    actionable: !1
  },
  INVALID_SELECTION: {
    message: "The current selection is not valid for this action",
    shortMessage: "Invalid selection",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: a.info,
    severity: "info",
    actionable: !1
  },
  RATE_LIMITED: {
    message: "Too many requests. Please try again shortly",
    shortMessage: "Rate limited",
    colorClass: "bg-orange-100 text-orange-800",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    icon: a.clock,
    severity: "warning",
    actionable: !1
  },
  TEMPORARILY_UNAVAILABLE: {
    message: "This action is temporarily unavailable",
    shortMessage: "Temporarily unavailable",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: a.ban,
    severity: "info",
    actionable: !1
  }
};
function p(e, s) {
  const t = e.toLowerCase();
  if ((!s || s === "core") && t in x)
    return x[t];
  if (!s || s === "queue") {
    if (t in f)
      return f[t];
    if (t in m)
      return m[t];
    if (t in v)
      return v[t];
  }
  if (!s || s === "exchange") {
    if (t in h)
      return h[t];
    if (t in T)
      return T[t];
  }
  return null;
}
function S(e) {
  const s = A(e);
  return s && s in y ? y[s] : null;
}
function D(e) {
  const s = A(e);
  return s && s in y ? y[s] : null;
}
function N(e, s) {
  return p(e, s) !== null;
}
function O(e) {
  return S(e) !== null;
}
function j(e) {
  switch (e) {
    case "core":
      return Object.keys(x);
    case "queue":
      return [
        ...Object.keys(f),
        ...Object.keys(m),
        ...Object.keys(v)
      ];
    case "exchange":
      return [
        ...Object.keys(h),
        ...Object.keys(T)
      ];
    default:
      return [];
  }
}
function P() {
  return Object.keys(y);
}
function U(e, s) {
  return p(e, s) ? `status-${e.toLowerCase()}` : "";
}
function V(e, s) {
  const t = p(e, s);
  return t ? `severity-${t.severity}` : "";
}
function R(e, s = {}) {
  const t = p(e, s.domain);
  if (!t)
    return `<span class="inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">${o(e)}</span>`;
  const { size: r = "default", showIcon: n = !0, showLabel: i = !0, extraClass: c = "" } = s, g = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-xs"
  }, b = n ? k(t, r) : "", d = i ? `<span>${o(t.label)}</span>` : "";
  return `<span class="inline-flex items-center ${n && i ? "gap-1" : ""} rounded font-medium ${g[r]} ${t.colorClass} ${c}"
                title="${o(t.description || t.label)}"
                aria-label="${o(t.label)}"
                data-status="${o(e)}">
    ${b}${d}
  </span>`;
}
function k(e, s = "default") {
  const t = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  return e.iconType === "char" ? `<span class="${t[s]} inline-flex items-center justify-center" aria-hidden="true">${e.icon}</span>` : `<svg class="${t[s]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${e.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function L(e, s = {}) {
  const t = S(e);
  if (!t)
    return `<span class="text-gray-500 text-xs">${o(e)}</span>`;
  const { size: r = "default", showIcon: n = !0, showFullMessage: i = !1, extraClass: c = "" } = s, g = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, d = n ? `<svg class="${r === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
      </svg>` : "", u = i ? t.message : t.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${g[r]} ${t.colorClass} ${c}"
                role="status"
                aria-label="${o(t.message)}"
                data-reason-code="${o(e)}">
    ${d}
    <span>${o(u)}</span>
  </span>`;
}
function H(e, s) {
  const t = S(e);
  if (!t)
    return "";
  const r = s || t.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${t.bgClass} ${t.textClass}"
                title="${o(r)}"
                aria-label="${o(t.shortMessage)}"
                data-reason-code="${o(e)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${t.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function B(e = {}) {
  return (s) => typeof s != "string" || !s ? '<span class="text-gray-400">-</span>' : R(s, e);
}
function q(e = {}) {
  return (s) => typeof s != "string" || !s ? "" : L(s, e);
}
function F(e) {
  e.schema_version !== 1 && console.warn("[TranslationStatusVocabulary] Unknown schema version:", e.schema_version);
}
function Y() {
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
function o(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
export {
  x as C,
  y as D,
  h as E,
  f as Q,
  k as a,
  $ as b,
  D as c,
  L as d,
  U as e,
  M as f,
  p as g,
  E as h,
  m as i,
  v as j,
  T as k,
  S as l,
  N as m,
  A as n,
  O as o,
  j as p,
  P as q,
  R as r,
  V as s,
  H as t,
  B as u,
  q as v,
  F as w,
  Y as x
};
//# sourceMappingURL=translation-status-vocabulary-0I1VBkAK.js.map

function C(e) {
  return typeof e == "string" ? e.trim() : "";
}
function l(e) {
  return (typeof e == "string" ? e.trim() : "") || void 0;
}
function c(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function I(e) {
  if (!e || typeof e != "object" || Array.isArray(e))
    return null;
  const t = e, s = l(t.label), a = l(t.href), n = l(t.kind);
  return !s && !a && !n ? null : {
    ...s ? { label: s } : {},
    ...a ? { href: a } : {},
    ...n ? { kind: n } : {}
  };
}
function R(e) {
  if (!Array.isArray(e))
    return;
  const t = e.map((s) => l(s)).filter((s) => !!s);
  return t.length > 0 ? t : void 0;
}
function E(e) {
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
  ].some((t) => t in e);
}
function L(e) {
  if (typeof e != "number" || !Number.isFinite(e))
    return;
  const t = Math.trunc(e);
  return t > 0 ? t : void 0;
}
function k(e, t = 0) {
  return !e || t > 2 ? "" : C(e.reason_code) || C(e.textCode) || C(e.text_code) || k(e.error ?? void 0, t + 1);
}
function S(e) {
  if (typeof e == "string")
    return e.trim().toUpperCase() || null;
  if (!e || typeof e != "object" || Array.isArray(e))
    return null;
  const s = k(e);
  return s ? s.toUpperCase() : null;
}
function $(e) {
  if (!e || typeof e != "object" || Array.isArray(e))
    return null;
  const t = e;
  if (!E(t))
    return null;
  const s = S({ reason_code: t.reason_code }), a = {
    enabled: typeof t.enabled == "boolean" ? t.enabled : !1
  }, n = l(t.reason), i = l(t.severity), g = l(t.kind), u = l(t.permission), b = t.metadata && typeof t.metadata == "object" && !Array.isArray(t.metadata) ? t.metadata : null, d = I(t.remediation), y = R(t.available_transitions);
  return n && (a.reason = n), s && (a.reason_code = s), i && (a.severity = i), g && (a.kind = g), u && (a.permission = u), b && (a.metadata = b), d && (a.remediation = d), y && (a.available_transitions = y), a;
}
function T(e) {
  if (!c(e))
    return {};
  const t = e, s = {};
  for (const [a, n] of Object.entries(t)) {
    const i = l(a), g = $(n);
    !i || !g || (s[i] = g);
  }
  return s;
}
function w(e) {
  return T(e);
}
function D(e) {
  if (!c(e))
    return null;
  const t = e.selection_sensitive === !0, s = l(e.selection_state_endpoint), a = L(e.debounce_ms);
  if (!t && !s && a === void 0)
    return null;
  const n = {};
  return t && (n.selection_sensitive = !0), s && (n.selection_state_endpoint = s), a !== void 0 && (n.debounce_ms = a), n;
}
function M(e) {
  if (!c(e))
    return null;
  const t = T(e._action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    _action_state: t
  };
}
function N(e) {
  if (!c(e))
    return null;
  const t = w(e.bulk_action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    bulk_action_state: t
  };
}
function B(e) {
  if (!c(e))
    return null;
  const t = w(e.bulk_action_state);
  if (Object.keys(t).length === 0)
    return null;
  const s = {
    bulk_action_state: t
  };
  return c(e.selection) && (s.selection = e.selection), s;
}
function H(e) {
  if (!c(e))
    return null;
  const t = Array.isArray(e.data) ? e.data : Array.isArray(e.records) ? e.records : null, s = t && t.map((i) => M(i) ?? i), a = N(e.$meta), n = { ...e };
  if (s && (Array.isArray(e.data) && (n.data = s), Array.isArray(e.records) && (n.records = s)), a && (n.$meta = a), c(e.schema)) {
    const i = D(e.schema.bulk_action_state_config);
    i && (n.schema = {
      ...e.schema,
      bulk_action_state_config: i
    });
  }
  return n;
}
function U(e) {
  return c(e) ? c(e.data) ? {
    ...e,
    data: M(e.data)
  } : { ...e } : null;
}
function V(e, t) {
  const s = l(t);
  return s && T(e._action_state)[s] || null;
}
const r = {
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
}, m = {
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
}, x = {
  pending: {
    label: "Pending",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: r.clock,
    iconType: "svg",
    severity: "neutral",
    description: "Waiting to be assigned"
  },
  assigned: {
    label: "Assigned",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: r.user,
    iconType: "svg",
    severity: "info",
    description: "Assigned to a translator"
  },
  in_progress: {
    label: "In Progress",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: r.play,
    iconType: "svg",
    severity: "info",
    description: "Translation in progress"
  },
  review: {
    label: "In Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: r.document,
    iconType: "svg",
    severity: "info",
    description: "Pending review"
  },
  rejected: {
    label: "Rejected",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: r.error,
    iconType: "svg",
    severity: "error",
    description: "Translation rejected"
  },
  approved: {
    label: "Approved",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: r.check,
    iconType: "svg",
    severity: "success",
    description: "Translation approved"
  },
  published: {
    label: "Published",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: r.check,
    iconType: "svg",
    severity: "success",
    description: "Translation published"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: r.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Translation archived"
  }
}, v = {
  draft: {
    label: "Draft",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: r.document,
    iconType: "svg",
    severity: "neutral",
    description: "Draft content"
  },
  review: {
    label: "Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: r.document,
    iconType: "svg",
    severity: "info",
    description: "Content under review"
  },
  ready: {
    label: "Ready",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: r.check,
    iconType: "svg",
    severity: "success",
    description: "Content ready"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: r.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Content archived"
  }
}, h = {
  overdue: {
    label: "Overdue",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: r.warning,
    iconType: "svg",
    severity: "error",
    description: "Past due date"
  },
  due_soon: {
    label: "Due Soon",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: r.clock,
    iconType: "svg",
    severity: "warning",
    description: "Due within 24 hours"
  },
  on_track: {
    label: "On Track",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: r.check,
    iconType: "svg",
    severity: "success",
    description: "On schedule"
  },
  none: {
    label: "No Due Date",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: r.clock,
    iconType: "svg",
    severity: "neutral",
    description: "No due date set"
  }
}, A = {
  success: {
    label: "Success",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: r.check,
    iconType: "svg",
    severity: "success",
    description: "Import/export succeeded"
  },
  error: {
    label: "Error",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: r.error,
    iconType: "svg",
    severity: "error",
    description: "Import/export failed"
  },
  conflict: {
    label: "Conflict",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: r.warning,
    iconType: "svg",
    severity: "warning",
    description: "Conflicting changes detected"
  },
  skipped: {
    label: "Skipped",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: r.ban,
    iconType: "svg",
    severity: "neutral",
    description: "Row skipped"
  }
}, _ = {
  running: {
    label: "Running",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: r.play,
    iconType: "svg",
    severity: "info",
    description: "Job in progress"
  },
  completed: {
    label: "Completed",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: r.check,
    iconType: "svg",
    severity: "success",
    description: "Job completed successfully"
  },
  failed: {
    label: "Failed",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: r.error,
    iconType: "svg",
    severity: "error",
    description: "Job failed"
  }
}, f = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: r.warning,
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
    icon: r.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: r.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: r.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: r.ban,
    severity: "info",
    actionable: !1
  },
  RESOURCE_IN_USE: {
    message: "This resource is currently in use",
    shortMessage: "Resource in use",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: r.warning,
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
    icon: r.warning,
    severity: "warning",
    actionable: !1
  },
  INVALID_SELECTION: {
    message: "The current selection is not valid for this action",
    shortMessage: "Invalid selection",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: r.info,
    severity: "info",
    actionable: !1
  },
  RATE_LIMITED: {
    message: "Too many requests. Please try again shortly",
    shortMessage: "Rate limited",
    colorClass: "bg-orange-100 text-orange-800",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    icon: r.clock,
    severity: "warning",
    actionable: !1
  },
  TEMPORARILY_UNAVAILABLE: {
    message: "This action is temporarily unavailable",
    shortMessage: "Temporarily unavailable",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: r.ban,
    severity: "info",
    actionable: !1
  }
};
function p(e, t) {
  const s = e.toLowerCase();
  if ((!t || t === "core") && s in m)
    return m[s];
  if (!t || t === "queue") {
    if (s in x)
      return x[s];
    if (s in v)
      return v[s];
    if (s in h)
      return h[s];
  }
  if (!t || t === "exchange") {
    if (s in A)
      return A[s];
    if (s in _)
      return _[s];
  }
  return null;
}
function z(e) {
  const t = S(e);
  return t && t in f ? f[t] : null;
}
function F(e) {
  const t = S(e);
  return t && t in f ? f[t] : null;
}
function q(e, t) {
  return p(e, t) !== null;
}
function Y(e) {
  return z(e) !== null;
}
function G(e) {
  switch (e) {
    case "core":
      return Object.keys(m);
    case "queue":
      return [
        ...Object.keys(x),
        ...Object.keys(v),
        ...Object.keys(h)
      ];
    case "exchange":
      return [
        ...Object.keys(A),
        ...Object.keys(_)
      ];
    default:
      return [];
  }
}
function J() {
  return Object.keys(f);
}
function Q(e, t) {
  return p(e, t) ? `status-${e.toLowerCase()}` : "";
}
function X(e, t) {
  const s = p(e, t);
  return s ? `severity-${s.severity}` : "";
}
function O(e, t = {}) {
  const s = p(e, t.domain);
  if (!s)
    return `<span class="inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">${o(e)}</span>`;
  const { size: a = "default", showIcon: n = !0, showLabel: i = !0, extraClass: g = "" } = t, u = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-xs"
  }, b = n ? j(s, a) : "", d = i ? `<span>${o(s.label)}</span>` : "";
  return `<span class="inline-flex items-center ${n && i ? "gap-1" : ""} rounded font-medium ${u[a]} ${s.colorClass} ${g}"
                title="${o(s.description || s.label)}"
                aria-label="${o(s.label)}"
                data-status="${o(e)}">
    ${b}${d}
  </span>`;
}
function j(e, t = "default") {
  const s = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  return e.iconType === "char" ? `<span class="${s[t]} inline-flex items-center justify-center" aria-hidden="true">${e.icon}</span>` : `<svg class="${s[t]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${e.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function P(e, t = {}) {
  const s = z(e);
  if (!s)
    return `<span class="text-gray-500 text-xs">${o(e)}</span>`;
  const { size: a = "default", showIcon: n = !0, showFullMessage: i = !1, extraClass: g = "" } = t, u = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, d = n ? `<svg class="${a === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${s.icon}" clip-rule="evenodd"/>
      </svg>` : "", y = i ? s.message : s.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${u[a]} ${s.colorClass} ${g}"
                role="status"
                aria-label="${o(s.message)}"
                data-reason-code="${o(e)}">
    ${d}
    <span>${o(y)}</span>
  </span>`;
}
function W(e, t) {
  const s = z(e);
  if (!s)
    return "";
  const a = t || s.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${s.bgClass} ${s.textClass}"
                title="${o(a)}"
                aria-label="${o(s.shortMessage)}"
                data-reason-code="${o(e)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${s.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function K(e = {}) {
  return (t) => typeof t != "string" || !t ? '<span class="text-gray-400">-</span>' : O(t, e);
}
function Z(e = {}) {
  return (t) => typeof t != "string" || !t ? "" : P(t, e);
}
function ee(e) {
  e.schema_version !== 1 && console.warn("[TranslationStatusVocabulary] Unknown schema version:", e.schema_version);
}
function te() {
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
  W as A,
  K as B,
  m as C,
  f as D,
  A as E,
  Z as F,
  ee as G,
  te as H,
  x as Q,
  j as a,
  U as b,
  w as c,
  D as d,
  B as e,
  V as f,
  p as g,
  F as h,
  P as i,
  Q as j,
  S as k,
  $ as l,
  T as m,
  H as n,
  M as o,
  N as p,
  v as q,
  O as r,
  h as s,
  _ as t,
  z as u,
  q as v,
  Y as w,
  G as x,
  J as y,
  X as z
};
//# sourceMappingURL=translation-status-vocabulary-huaq_68y.js.map

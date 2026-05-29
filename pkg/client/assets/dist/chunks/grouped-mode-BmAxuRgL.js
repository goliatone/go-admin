import { escapeAttribute as Y, escapeHTML as g } from "../shared/html.js";
function v(e) {
  return typeof e == "string" ? e.trim() : "";
}
function f(e) {
  return (typeof e == "string" ? e.trim() : "") || void 0;
}
function y(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function X(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, s = f(t.label), r = f(t.href), n = f(t.kind);
  return !s && !r && !n ? null : {
    ...s ? { label: s } : {},
    ...r ? { href: r } : {},
    ...n ? { kind: n } : {}
  };
}
function J(e) {
  if (!Array.isArray(e)) return;
  const t = e.map((s) => f(s)).filter((s) => !!s);
  return t.length > 0 ? t : void 0;
}
function W(e) {
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
function K(e) {
  if (typeof e != "number" || !Number.isFinite(e)) return;
  const t = Math.trunc(e);
  return t > 0 ? t : void 0;
}
function L(e, t = 0) {
  return !e || t > 2 ? "" : v(e.reason_code) || v(e.textCode) || v(e.text_code) || L(e.error ?? void 0, t + 1);
}
function E(e) {
  if (typeof e == "string") return e.trim().toUpperCase() || null;
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = L(e);
  return t ? t.toUpperCase() : null;
}
function Q(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e;
  if (!W(t)) return null;
  const s = E({ reason_code: t.reason_code }), r = { enabled: typeof t.enabled == "boolean" ? t.enabled : !1 }, n = f(t.reason), a = f(t.severity), i = f(t.kind), o = f(t.permission), u = t.metadata && typeof t.metadata == "object" && !Array.isArray(t.metadata) ? t.metadata : null, c = X(t.remediation), d = J(t.available_transitions);
  return n && (r.reason = n), s && (r.reason_code = s), a && (r.severity = a), i && (r.kind = i), o && (r.permission = o), u && (r.metadata = u), c && (r.remediation = c), d && (r.available_transitions = d), r;
}
function M(e) {
  if (!y(e)) return {};
  const t = e, s = {};
  for (const [r, n] of Object.entries(t)) {
    const a = f(r), i = Q(n);
    !a || !i || (s[a] = i);
  }
  return s;
}
function j(e) {
  return M(e);
}
function Z(e) {
  if (!y(e)) return null;
  const t = e.selection_sensitive === !0, s = f(e.selection_state_endpoint), r = K(e.debounce_ms);
  if (!t && !s && r === void 0) return null;
  const n = {};
  return t && (n.selection_sensitive = !0), s && (n.selection_state_endpoint = s), r !== void 0 && (n.debounce_ms = r), n;
}
function N(e) {
  if (!y(e)) return null;
  const t = M(e._action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    _action_state: t
  };
}
function ee(e) {
  if (!y(e)) return null;
  const t = j(e.bulk_action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    bulk_action_state: t
  };
}
function me(e) {
  if (!y(e)) return null;
  const t = j(e.bulk_action_state);
  if (Object.keys(t).length === 0) return null;
  const s = { bulk_action_state: t };
  return y(e.selection) && (s.selection = e.selection), s;
}
function xe(e) {
  if (!y(e)) return null;
  const t = Array.isArray(e.data) ? e.data : Array.isArray(e.records) ? e.records : null, s = t && t.map((a) => N(a) ?? a), r = ee(e.$meta), n = { ...e };
  if (s && (Array.isArray(e.data) && (n.data = s), Array.isArray(e.records) && (n.records = s)), r && (n.$meta = r), y(e.schema)) {
    const a = Z(e.schema.bulk_action_state_config);
    a && (n.schema = {
      ...e.schema,
      bulk_action_state_config: a
    });
  }
  return n;
}
function Ce(e) {
  return y(e) ? y(e.data) ? {
    ...e,
    data: N(e.data)
  } : { ...e } : null;
}
function he(e, t) {
  const s = f(t);
  return s && M(e._action_state)[s] || null;
}
var l = {
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
}, _ = {
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
}, A = {
  pending: {
    label: "Pending",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: l.clock,
    iconType: "svg",
    severity: "neutral",
    description: "Waiting to be assigned"
  },
  assigned: {
    label: "Assigned",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: l.user,
    iconType: "svg",
    severity: "info",
    description: "Assigned to a translator"
  },
  in_progress: {
    label: "In Progress",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: l.play,
    iconType: "svg",
    severity: "info",
    description: "Translation in progress"
  },
  review: {
    label: "In Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: l.document,
    iconType: "svg",
    severity: "info",
    description: "Pending review"
  },
  rejected: {
    label: "Rejected",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: l.error,
    iconType: "svg",
    severity: "error",
    description: "Translation rejected"
  },
  approved: {
    label: "Approved",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: l.check,
    iconType: "svg",
    severity: "success",
    description: "Translation approved"
  },
  published: {
    label: "Published",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: l.check,
    iconType: "svg",
    severity: "success",
    description: "Translation published"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: l.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Translation archived"
  }
}, S = {
  draft: {
    label: "Draft",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: l.document,
    iconType: "svg",
    severity: "neutral",
    description: "Draft content"
  },
  review: {
    label: "Review",
    colorClass: "bg-purple-100 text-purple-700",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: l.document,
    iconType: "svg",
    severity: "info",
    description: "Content under review"
  },
  ready: {
    label: "Ready",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: l.check,
    iconType: "svg",
    severity: "success",
    description: "Content ready"
  },
  archived: {
    label: "Archived",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: l.archive,
    iconType: "svg",
    severity: "neutral",
    description: "Content archived"
  }
}, w = {
  overdue: {
    label: "Overdue",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: l.warning,
    iconType: "svg",
    severity: "error",
    description: "Past due date"
  },
  due_soon: {
    label: "Due Soon",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: l.clock,
    iconType: "svg",
    severity: "warning",
    description: "Due within 24 hours"
  },
  on_track: {
    label: "On Track",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: l.check,
    iconType: "svg",
    severity: "success",
    description: "On schedule"
  },
  none: {
    label: "No Due Date",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: l.clock,
    iconType: "svg",
    severity: "neutral",
    description: "No due date set"
  }
}, k = {
  success: {
    label: "Success",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: l.check,
    iconType: "svg",
    severity: "success",
    description: "Import/export succeeded"
  },
  error: {
    label: "Error",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: l.error,
    iconType: "svg",
    severity: "error",
    description: "Import/export failed"
  },
  conflict: {
    label: "Conflict",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    icon: l.warning,
    iconType: "svg",
    severity: "warning",
    description: "Conflicting changes detected"
  },
  skipped: {
    label: "Skipped",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: l.ban,
    iconType: "svg",
    severity: "neutral",
    description: "Row skipped"
  }
}, I = {
  running: {
    label: "Running",
    colorClass: "bg-blue-100 text-blue-700",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: l.play,
    iconType: "svg",
    severity: "info",
    description: "Job in progress"
  },
  completed: {
    label: "Completed",
    colorClass: "bg-green-100 text-green-700",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: l.check,
    iconType: "svg",
    severity: "success",
    description: "Job completed successfully"
  },
  failed: {
    label: "Failed",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: l.error,
    iconType: "svg",
    severity: "error",
    description: "Job failed"
  }
}, x = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: l.warning,
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
    icon: l.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: l.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: l.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: l.ban,
    severity: "info",
    actionable: !1
  },
  RESOURCE_IN_USE: {
    message: "This resource is currently in use",
    shortMessage: "Resource in use",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: l.warning,
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
    icon: l.warning,
    severity: "warning",
    actionable: !1
  },
  INVALID_SELECTION: {
    message: "The current selection is not valid for this action",
    shortMessage: "Invalid selection",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: l.info,
    severity: "info",
    actionable: !1
  },
  RATE_LIMITED: {
    message: "Too many requests. Please try again shortly",
    shortMessage: "Rate limited",
    colorClass: "bg-orange-100 text-orange-800",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    icon: l.clock,
    severity: "warning",
    actionable: !1
  },
  TEMPORARILY_UNAVAILABLE: {
    message: "This action is temporarily unavailable",
    shortMessage: "Temporarily unavailable",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: l.ban,
    severity: "info",
    actionable: !1
  }
};
function C(e, t) {
  const s = e.toLowerCase();
  if ((!t || t === "core") && s in _)
    return _[s];
  if (!t || t === "queue") {
    if (s in A) return A[s];
    if (s in S) return S[s];
    if (s in w) return w[s];
  }
  if (!t || t === "exchange") {
    if (s in k) return k[s];
    if (s in I) return I[s];
  }
  return null;
}
function R(e) {
  const t = E(e);
  return t && t in x ? x[t] : null;
}
function ve(e) {
  const t = E(e);
  return t && t in x ? x[t] : null;
}
function _e(e, t) {
  return C(e, t) !== null;
}
function Ae(e) {
  return R(e) !== null;
}
function Se(e) {
  switch (e) {
    case "core":
      return Object.keys(_);
    case "queue":
      return [
        ...Object.keys(A),
        ...Object.keys(S),
        ...Object.keys(w)
      ];
    case "exchange":
      return [...Object.keys(k), ...Object.keys(I)];
    default:
      return [];
  }
}
function we() {
  return Object.keys(x);
}
function ke(e, t) {
  return C(e, t) ? `status-${e.toLowerCase()}` : "";
}
function Ie(e, t) {
  const s = C(e, t);
  return s ? `severity-${s.severity}` : "";
}
function te(e, t = {}) {
  const s = C(e, t.domain);
  if (!s) return `<span class="inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">${g(e)}</span>`;
  const { size: r = "default", showIcon: n = !0, showLabel: a = !0, extraClass: i = "" } = t, o = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-xs"
  }, u = n ? se(s, r) : "", c = a ? `<span>${g(s.label)}</span>` : "";
  return `<span class="inline-flex items-center ${n && a ? "gap-1" : ""} rounded font-medium ${o[r]} ${s.colorClass} ${i}"
                title="${g(s.description || s.label)}"
                aria-label="${g(s.label)}"
                data-status="${g(e)}">
    ${u}${c}
  </span>`;
}
function se(e, t = "default") {
  const s = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  return e.iconType === "char" ? `<span class="${s[t]} inline-flex items-center justify-center" aria-hidden="true">${e.icon}</span>` : `<svg class="${s[t]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${e.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function re(e, t = {}) {
  const s = R(e);
  if (!s) return `<span class="text-gray-500 text-xs">${g(e)}</span>`;
  const { size: r = "default", showIcon: n = !0, showFullMessage: a = !1, extraClass: i = "" } = t, o = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, u = n ? `<svg class="${r === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${s.icon}" clip-rule="evenodd"/>
      </svg>` : "", c = a ? s.message : s.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${o[r]} ${s.colorClass} ${i}"
                role="status"
                aria-label="${g(s.message)}"
                data-reason-code="${g(e)}">
    ${u}
    <span>${g(c)}</span>
  </span>`;
}
function Te(e, t) {
  const s = R(e);
  if (!s) return "";
  const r = t || s.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${s.bgClass} ${s.textClass}"
                title="${g(r)}"
                aria-label="${g(s.shortMessage)}"
                data-reason-code="${g(e)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${s.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function Ee(e = {}) {
  return (t) => typeof t != "string" || !t ? '<span class="text-gray-400">-</span>' : te(t, e);
}
function Me(e = {}) {
  return (t) => typeof t != "string" || !t ? "" : re(t, e);
}
function Re(e) {
  e.schema_version !== 1 && console.warn("[TranslationStatusVocabulary] Unknown schema version:", e.schema_version);
}
function ze() {
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
function $e(e, t = {}) {
  const { groupByField: s = "family_id", defaultExpanded: r = !0, expandMode: n = "explicit", expandedGroups: a = /* @__PURE__ */ new Set() } = t, i = /* @__PURE__ */ new Map(), o = [];
  for (const c of e) {
    const d = ue(c, s);
    if (d) {
      const p = i.get(d);
      p ? p.push(c) : i.set(d, [c]);
    } else o.push(c);
  }
  const u = [];
  for (const [c, d] of i) {
    const p = G(d), b = B(c, n, a, r);
    u.push({
      groupId: c,
      records: d,
      summary: p,
      expanded: b,
      summaryFromBackend: !1
    });
  }
  return u.sort((c, d) => e.indexOf(c.records[0]) - e.indexOf(d.records[0])), {
    groups: u,
    ungrouped: o,
    totalGroups: u.length,
    totalRecords: e.length
  };
}
function ne(e) {
  if (e.length === 0) return !1;
  let t = !1;
  for (const s of e) {
    if (ae(s)) {
      t = !0;
      continue;
    }
    if (D(s)) {
      t = !0;
      continue;
    }
    return !1;
  }
  return t;
}
function Le(e, t = {}) {
  const { defaultExpanded: s = !0, expandMode: r = "explicit", expandedGroups: n = /* @__PURE__ */ new Set() } = t;
  if (!ne(e)) return null;
  const a = [], i = [];
  let o = 0;
  for (const u of e) {
    if (D(u)) {
      i.push({ ...u }), o += 1;
      continue;
    }
    const c = oe(u);
    if (!c) return null;
    const d = P(u), p = le(u, d), b = B(c, r, n, s);
    a.push({
      groupId: c,
      displayLabel: ce(u, d),
      records: d,
      summary: p,
      expanded: b,
      summaryFromBackend: ie(u)
    }), o += d.length;
  }
  return {
    groups: a,
    ungrouped: i,
    totalGroups: a.length,
    totalRecords: o
  };
}
function B(e, t, s, r) {
  return t === "all" ? !s.has(e) : t === "none" ? s.has(e) : s.size === 0 ? r : s.has(e);
}
function ae(e) {
  const t = e, s = typeof t.group_by == "string" ? t.group_by.trim().toLowerCase() : "", r = O(e);
  if (!(s === "family_id" || r === "group")) return !1;
  const n = P(e);
  return Array.isArray(n);
}
function D(e) {
  return O(e) === "ungrouped";
}
function O(e) {
  const t = e._group;
  if (!t || typeof t != "object" || Array.isArray(t)) return "";
  const s = t.row_type;
  return typeof s == "string" ? s.trim().toLowerCase() : "";
}
function oe(e) {
  const t = e.family_id;
  if (typeof t == "string" && t.trim()) return t.trim();
  const s = e._group;
  if (!s || typeof s != "object" || Array.isArray(s)) return null;
  const r = s.id;
  return typeof r == "string" && r.trim() ? r.trim() : null;
}
function P(e) {
  const t = e, s = Array.isArray(t.records) ? t.records : t.children;
  if (Array.isArray(s)) {
    const n = s.filter((a) => !!a && typeof a == "object" && !Array.isArray(a)).map((a) => ({ ...a }));
    if (n.length > 0) return n;
  }
  const r = t.parent;
  return r && typeof r == "object" && !Array.isArray(r) ? [{ ...r }] : [];
}
function ie(e) {
  const t = e.family_summary;
  return !!t && typeof t == "object" && !Array.isArray(t);
}
function le(e, t) {
  const s = e.family_summary;
  if (!s || typeof s != "object" || Array.isArray(s)) return G(t);
  const r = s, n = Array.isArray(r.available_locales) ? r.available_locales.filter(m) : [], a = Array.isArray(r.missing_locales) ? r.missing_locales.filter(m) : [], i = V(r.readiness_state) ? r.readiness_state : null, o = Math.max(t.length, typeof r.child_count == "number" ? Math.max(r.child_count, 0) : 0);
  return {
    totalItems: typeof r.total_items == "number" ? Math.max(r.total_items, 0) : o,
    availableLocales: n,
    missingLocales: a,
    readinessState: i,
    readyForPublish: typeof r.ready_for_publish == "boolean" ? r.ready_for_publish : null
  };
}
function ce(e, t) {
  const s = e.family_label;
  if (typeof s == "string" && s.trim()) return s.trim();
  const r = e.family_summary;
  if (r && typeof r == "object" && !Array.isArray(r)) {
    const o = r.group_label;
    if (typeof o == "string" && o.trim()) return o.trim();
  }
  const n = e._group;
  if (n && typeof n == "object" && !Array.isArray(n)) {
    const o = n.label;
    if (typeof o == "string" && o.trim()) return o.trim();
  }
  const a = [], i = e.parent;
  if (i && typeof i == "object" && !Array.isArray(i)) {
    const o = i;
    a.push(o.title, o.name, o.slug, o.path);
  }
  t.length > 0 && a.push(t[0].title, t[0].name, t[0].slug, t[0].path);
  for (const o of a) if (typeof o == "string" && o.trim()) return o.trim();
}
function ue(e, t) {
  const s = e[t];
  return typeof s == "string" && s.trim() ? s : null;
}
function G(e) {
  const t = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set();
  let r = !1, n = 0;
  for (const i of e) {
    const o = i.translation_readiness;
    if (o) {
      const c = o.available_locales, d = o.missing_required_locales, p = o.readiness_state;
      Array.isArray(c) && c.filter(m).forEach((b) => t.add(b)), Array.isArray(d) && d.filter(m).forEach((b) => s.add(b)), (p === "missing_fields" || p === "missing_locales_and_fields") && (r = !0), p === "ready" && n++;
    }
    const u = i.available_locales;
    Array.isArray(u) && u.filter(m).forEach((c) => t.add(c));
  }
  let a = null;
  if (e.length > 0) {
    const i = n === e.length, o = s.size > 0;
    i ? a = "ready" : o && r ? a = "missing_locales_and_fields" : o ? a = "missing_locales" : r && (a = "missing_fields");
  }
  return {
    totalItems: e.length,
    availableLocales: Array.from(t),
    missingLocales: Array.from(s),
    readinessState: a,
    readyForPublish: a === "ready"
  };
}
function m(e) {
  return typeof e == "string";
}
function je(e, t) {
  const s = e.groups.map((r) => {
    const n = t.get(r.groupId);
    return n ? {
      ...r,
      summary: {
        ...r.summary,
        ...n
      },
      summaryFromBackend: !0
    } : r;
  });
  return {
    ...e,
    groups: s
  };
}
function Ne(e) {
  const t = /* @__PURE__ */ new Map(), s = e.group_summaries;
  if (!s || typeof s != "object" || Array.isArray(s)) return t;
  for (const [r, n] of Object.entries(s)) if (n && typeof n == "object") {
    const a = n;
    t.set(r, {
      totalItems: typeof a.total_items == "number" ? a.total_items : void 0,
      availableLocales: Array.isArray(a.available_locales) ? a.available_locales.filter(m) : void 0,
      missingLocales: Array.isArray(a.missing_locales) ? a.missing_locales.filter(m) : void 0,
      readinessState: V(a.readiness_state) ? a.readiness_state : void 0,
      readyForPublish: typeof a.ready_for_publish == "boolean" ? a.ready_for_publish : void 0
    });
  }
  return t;
}
function V(e) {
  return e === "ready" || e === "missing_locales" || e === "missing_fields" || e === "missing_locales_and_fields";
}
var h = "datagrid-expand-state-";
function T(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const r = $(s);
    if (r && !t.includes(r)) {
      if (t.length >= z) break;
      t.push(r);
    }
  }
  return t;
}
function U(e) {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return Array.isArray(t) ? {
      version: 2,
      mode: "explicit",
      ids: T(t)
    } : !t || typeof t != "object" || Array.isArray(t) ? null : {
      version: 2,
      mode: F(t.mode, "explicit"),
      ids: T(t.ids)
    };
  } catch {
    return null;
  }
}
function Be(e) {
  try {
    const t = h + e, s = U(localStorage.getItem(t));
    if (s) return new Set(s.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function De(e) {
  try {
    const t = h + e, s = U(localStorage.getItem(t));
    if (s) return s.mode;
  } catch {
  }
  return "explicit";
}
function Oe(e) {
  try {
    const t = h + e;
    return localStorage.getItem(t) !== null;
  } catch {
    return !1;
  }
}
function Pe(e, t, s = "explicit") {
  try {
    const r = h + e, n = T(Array.from(t)), a = {
      version: 2,
      mode: F(s, "explicit"),
      ids: n
    };
    localStorage.setItem(r, JSON.stringify(a));
  } catch {
  }
}
function Ge(e, t) {
  const s = e.groups.map((r) => r.groupId === t ? {
    ...r,
    expanded: !r.expanded
  } : r);
  return {
    ...e,
    groups: s
  };
}
function Ve(e) {
  const t = e.groups.map((s) => ({
    ...s,
    expanded: !0
  }));
  return {
    ...e,
    groups: t
  };
}
function Ue(e) {
  const t = e.groups.map((s) => ({
    ...s,
    expanded: !1
  }));
  return {
    ...e,
    groups: t
  };
}
function He(e) {
  const t = /* @__PURE__ */ new Set();
  for (const s of e.groups) s.expanded && t.add(s.groupId);
  return t;
}
var H = "datagrid-view-mode-", z = 200, de = 256;
function F(e, t = "explicit") {
  return e === "all" || e === "none" || e === "explicit" ? e : t;
}
function Fe(e) {
  try {
    const t = H + e, s = localStorage.getItem(t);
    if (s && q(s)) return s;
  } catch {
  }
  return null;
}
function qe(e, t) {
  try {
    const s = H + e;
    localStorage.setItem(s, t);
  } catch {
  }
}
function q(e) {
  return e === "flat" || e === "grouped" || e === "matrix";
}
function Ye(e) {
  return e && q(e) ? e : null;
}
function Xe(e) {
  if (!(e instanceof Set) || e.size === 0) return "";
  const t = Array.from(new Set(Array.from(e).map((s) => $(s)).filter((s) => s !== null))).slice(0, z).sort();
  return t.length === 0 ? "" : t.map((s) => encodeURIComponent(s)).join(",");
}
function Je(e) {
  const t = /* @__PURE__ */ new Set();
  if (!e) return t;
  const s = e.split(",");
  for (const r of s) {
    if (t.size >= z) break;
    if (!r) continue;
    let n = "";
    try {
      n = decodeURIComponent(r);
    } catch {
      continue;
    }
    const a = $(n);
    a && t.add(a);
  }
  return t;
}
function $(e) {
  if (typeof e != "string") return null;
  let t = e.trim();
  if (!t) return null;
  if (t.includes("%")) try {
    const s = decodeURIComponent(t);
    typeof s == "string" && s.trim() && (t = s.trim());
  } catch {
  }
  return t.length > de ? null : t;
}
function ge(e, t = {}) {
  const { summary: s } = e, { size: r = "sm" } = t, n = r === "sm" ? "text-xs" : "text-sm", a = s.availableLocales.length, i = a + s.missingLocales.length;
  let o = "";
  if (s.readinessState) {
    const d = fe(s.readinessState);
    o = `
      <span class="${n} px-1.5 py-0.5 rounded ${d.bgClass} ${d.textClass}"
            title="${d.description}">
        ${d.icon} ${d.label}
      </span>
    `;
  }
  const u = i > 0 ? `<span class="${n} text-gray-500">${a}/${i} locales</span>` : "", c = `<span class="${n} text-gray-500">${s.totalItems} item${s.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${o}
      ${u}
      ${c}
    </div>
  `;
}
function fe(e) {
  switch (e) {
    case "ready":
      return {
        icon: "●",
        label: "Ready",
        bgClass: "bg-green-100",
        textClass: "text-green-700",
        description: "All translations complete"
      };
    case "missing_locales":
      return {
        icon: "○",
        label: "Missing",
        bgClass: "bg-amber-100",
        textClass: "text-amber-700",
        description: "Missing required locale translations"
      };
    case "missing_fields":
      return {
        icon: "◐",
        label: "Incomplete",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-700",
        description: "Has translations but missing required fields"
      };
    case "missing_locales_and_fields":
      return {
        icon: "⚠",
        label: "Not Ready",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        description: "Missing translations and required fields"
      };
    default:
      return {
        icon: "?",
        label: "Unknown",
        bgClass: "bg-gray-100",
        textClass: "text-gray-700",
        description: "Status unknown"
      };
  }
}
function pe(e) {
  if (typeof e.displayLabel == "string" && e.displayLabel.trim()) return e.displayLabel.trim();
  if (e.groupId.startsWith("ungrouped:")) return "Ungrouped Records";
  if (e.records.length > 0) {
    const t = e.records[0];
    for (const s of [
      "title",
      "name",
      "label",
      "subject"
    ]) {
      const r = t[s];
      if (typeof r == "string" && r.trim()) {
        const n = r.trim();
        return n.length > 60 ? n.slice(0, 57) + "..." : n;
      }
    }
  }
  return `Translation Group (${e.groupId.length > 8 ? e.groupId.slice(0, 8) + "..." : e.groupId})`;
}
function We(e, t, s = {}) {
  const { showExpandIcon: r = !0 } = s, n = r ? `<span class="expand-icon mr-2" aria-hidden="true">${e.expanded ? "▼" : "▶"}</span>` : "", a = ge(e), i = g(pe(e)), o = e.records.length, u = o > 1 ? `<span class="ml-2 text-xs text-gray-500">(${o} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${Y(e.groupId)}"
        data-expanded="${e.expanded}"
        role="row"
        aria-expanded="${e.expanded}"
        tabindex="0">
      <td colspan="${t + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${n}
            <span class="font-medium text-gray-700">${i}</span>
            ${u}
          </div>
          ${a}
        </div>
      </td>
    </tr>
  `;
}
function Ke(e) {
  return `
    <tr>
      <td colspan="${e + 2}" class="px-6 py-12 text-center">
        <div class="text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No translation groups</h3>
          <p class="mt-1 text-sm text-gray-500">No grouped translations found for this content type.</p>
        </div>
      </td>
    </tr>
  `;
}
function Qe(e) {
  return `
    <tr>
      <td colspan="${e + 2}" class="px-6 py-12 text-center">
        <div class="flex items-center justify-center">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2 text-gray-500">Loading groups...</span>
        </div>
      </td>
    </tr>
  `;
}
function Ze(e, t, s) {
  const r = s ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr>
      <td colspan="${e + 2}" class="px-6 py-12 text-center">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${g(t)}</p>
          ${r}
        </div>
      </td>
    </tr>
  `;
}
function ye(e = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < e;
}
function et(e, t = 768) {
  return ye(t) && e === "grouped" ? "flat" : e;
}
export {
  M as $,
  k as A,
  ke as B,
  Ze as C,
  _ as D,
  $e as E,
  Ee as F,
  Ae as G,
  ze as H,
  ve as I,
  Te as J,
  _e as K,
  we as L,
  w as M,
  A as N,
  x as O,
  Me as P,
  Q,
  R,
  Ke as S,
  Ge as T,
  Se as U,
  C as V,
  Re as W,
  se as X,
  te as Y,
  E as Z,
  Ye as _,
  Ne as a,
  Ce as at,
  We as b,
  Be as c,
  ne as d,
  ee as et,
  Oe as f,
  F as g,
  Le as h,
  Ve as i,
  me as it,
  S as j,
  I as k,
  Fe as l,
  je as m,
  Je as n,
  Z as nt,
  He as o,
  xe as ot,
  ye as p,
  re as q,
  Xe as r,
  j as rt,
  De as s,
  he as st,
  Ue as t,
  N as tt,
  et as u,
  Pe as v,
  Qe as w,
  ge as x,
  qe as y,
  Ie as z
};

//# sourceMappingURL=grouped-mode-BmAxuRgL.js.map
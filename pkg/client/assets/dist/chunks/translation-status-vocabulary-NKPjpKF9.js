import { createLogger as w } from "../shared/logger.js";
import { escapeHTML as o } from "../shared/html.js";
import { a as $, n as R, o as M } from "./status-vocabulary-BYdivV6D.js";
function y(e) {
  return typeof e == "string" ? e.trim() : "";
}
function c(e) {
  return (typeof e == "string" ? e.trim() : "") || void 0;
}
function u(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function D(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, s = c(t.label), n = c(t.href), r = c(t.kind);
  return !s && !n && !r ? null : {
    ...s ? { label: s } : {},
    ...n ? { href: n } : {},
    ...r ? { kind: r } : {}
  };
}
function N(e) {
  if (!Array.isArray(e)) return;
  const t = e.map((s) => c(s)).filter((s) => !!s);
  return t.length > 0 ? t : void 0;
}
function O(e) {
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
function j(e) {
  if (typeof e != "number" || !Number.isFinite(e)) return;
  const t = Math.trunc(e);
  return t > 0 ? t : void 0;
}
function E(e, t = 0) {
  return !e || t > 2 ? "" : y(e.reason_code) || y(e.textCode) || y(e.text_code) || E(e.error ?? void 0, t + 1);
}
function S(e) {
  if (typeof e == "string") return e.trim().toUpperCase() || null;
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = E(e);
  return t ? t.toUpperCase() : null;
}
function P(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e;
  if (!O(t)) return null;
  const s = S({ reason_code: t.reason_code }), n = { enabled: typeof t.enabled == "boolean" ? t.enabled : !1 }, r = c(t.reason), i = c(t.severity), d = c(t.kind), f = c(t.permission), g = t.metadata && typeof t.metadata == "object" && !Array.isArray(t.metadata) ? t.metadata : null, b = D(t.remediation), k = N(t.available_transitions);
  return r && (n.reason = r), s && (n.reason_code = s), i && (n.severity = i), d && (n.kind = d), f && (n.permission = f), g && (n.metadata = g), b && (n.remediation = b), k && (n.available_transitions = k), n;
}
function z(e) {
  if (!u(e)) return {};
  const t = e, s = {};
  for (const [n, r] of Object.entries(t)) {
    const i = c(n), d = P(r);
    !i || !d || (s[i] = d);
  }
  return s;
}
function L(e) {
  return z(e);
}
function B(e) {
  if (!u(e)) return null;
  const t = e.selection_sensitive === !0, s = c(e.selection_state_endpoint), n = j(e.debounce_ms);
  if (!t && !s && n === void 0) return null;
  const r = {};
  return t && (r.selection_sensitive = !0), s && (r.selection_state_endpoint = s), n !== void 0 && (r.debounce_ms = n), r;
}
function I(e) {
  if (!u(e)) return null;
  const t = z(e._action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    _action_state: t
  };
}
function U(e) {
  if (!u(e)) return null;
  const t = L(e.bulk_action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    bulk_action_state: t
  };
}
function K(e) {
  if (!u(e)) return null;
  const t = L(e.bulk_action_state);
  if (Object.keys(t).length === 0) return null;
  const s = { bulk_action_state: t };
  return u(e.selection) && (s.selection = e.selection), s;
}
function Z(e) {
  if (!u(e)) return null;
  const t = Array.isArray(e.data) ? e.data : Array.isArray(e.records) ? e.records : null, s = t && t.map((i) => I(i) ?? i), n = U(e.$meta), r = { ...e };
  if (s && (Array.isArray(e.data) && (r.data = s), Array.isArray(e.records) && (r.records = s)), n && (r.$meta = n), u(e.schema)) {
    const i = B(e.schema.bulk_action_state_config);
    i && (r.schema = {
      ...e.schema,
      bulk_action_state_config: i
    });
  }
  return r;
}
function ee(e) {
  return u(e) ? u(e.data) ? {
    ...e,
    data: I(e.data)
  } : { ...e } : null;
}
function te(e, t) {
  const s = c(t);
  return s && z(e._action_state)[s] || null;
}
var V = w("DataGrid"), l = {
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
}, H = {
  neutral: "bg-gray-100",
  info: "bg-sky-50",
  success: "bg-emerald-50",
  warning: "bg-amber-50",
  error: "bg-rose-50"
}, F = {
  neutral: "text-gray-700",
  info: "text-sky-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700"
}, Y = {
  neutral: "border-gray-200",
  info: "border-sky-200",
  success: "border-emerald-200",
  warning: "border-amber-200",
  error: "border-rose-200"
};
function a(e, t = {}) {
  const s = R(e), n = s?.tone ?? "neutral";
  return {
    label: s?.label ?? M(e),
    shortLabel: t.shortLabel,
    colorClass: $(n, "badge"),
    bgClass: H[n],
    textClass: F[n],
    borderClass: Y[n],
    icon: s?.icon ?? "help-circle",
    iconType: "iconoir",
    severity: n,
    description: t.description
  };
}
var h = {
  ready: a("ready", {
    shortLabel: "Ready",
    description: "All required translations are complete"
  }),
  missing_locales: a("missing_locales", {
    shortLabel: "Missing",
    description: "Required locale translations are missing"
  }),
  missing_fields: a("missing_fields", {
    shortLabel: "Incomplete",
    description: "Some translations have missing required fields"
  }),
  missing_locales_and_fields: a("missing_locales_and_fields", {
    shortLabel: "Not Ready",
    description: "Missing translations and incomplete fields"
  })
}, _ = {
  open: a("open", { description: "Available to be claimed" }),
  pending: a("pending", { description: "Waiting to be assigned" }),
  assigned: a("assigned", { description: "Assigned to a translator" }),
  in_progress: a("in_progress", { description: "Translation in progress" }),
  review: a("review", { description: "Pending review" }),
  rejected: a("rejected", { description: "Translation rejected" }),
  approved: a("approved", { description: "Translation approved" }),
  published: a("published", { description: "Translation published" }),
  archived: a("archived", { description: "Translation archived" })
}, C = {
  draft: a("draft", { description: "Draft content" }),
  review: a("review", { description: "Content under review" }),
  ready: a("ready", { description: "Content ready" }),
  archived: a("archived", { description: "Content archived" })
}, A = {
  overdue: a("overdue", { description: "Past due date" }),
  due_soon: a("due_soon", { description: "Due within 24 hours" }),
  on_track: a("on_track", { description: "On schedule" }),
  none: a("none", { description: "No due date set" })
}, x = {
  success: a("success", { description: "Import/export succeeded" }),
  error: a("error", { description: "Import/export failed" }),
  conflict: a("conflict", { description: "Conflicting changes detected" }),
  skipped: a("skipped", { description: "Row skipped" })
}, v = {
  running: a("running", { description: "Job in progress" }),
  completed: a("completed", { description: "Job completed successfully" }),
  failed: a("failed", { description: "Job failed" })
}, m = {
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
function p(e, t) {
  const s = e.toLowerCase();
  if ((!t || t === "core") && s in h)
    return h[s];
  if (!t || t === "queue") {
    if (s in _) return _[s];
    if (s in C) return C[s];
    if (s in A) return A[s];
  }
  if (!t || t === "exchange") {
    if (s in x) return x[s];
    if (s in v) return v[s];
  }
  return null;
}
function T(e) {
  const t = S(e);
  return t && t in m ? m[t] : null;
}
function se(e) {
  const t = S(e);
  return t && t in m ? m[t] : null;
}
function ne(e, t) {
  return p(e, t) !== null;
}
function ae(e) {
  return T(e) !== null;
}
function re(e) {
  switch (e) {
    case "core":
      return Object.keys(h);
    case "queue":
      return [
        ...Object.keys(_),
        ...Object.keys(C),
        ...Object.keys(A)
      ];
    case "exchange":
      return [...Object.keys(x), ...Object.keys(v)];
    default:
      return [];
  }
}
function ie() {
  return Object.keys(m);
}
function oe(e, t) {
  return p(e, t) ? `status-${e.toLowerCase()}` : "";
}
function ce(e, t) {
  const s = p(e, t);
  return s ? `severity-${s.severity}` : "";
}
function q(e, t = {}) {
  const s = p(e, t.domain);
  if (!s) return `<span class="status-chip status-chip--neutral" data-status="${o(e)}" data-tone="neutral">${o(M(e) || e)}</span>`;
  const { size: n = "default", showIcon: r = !0, showLabel: i = !0, extraClass: d = "" } = t, f = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5",
    default: ""
  }, g = r ? G(s, n) : "", b = i ? `<span>${o(s.label)}</span>` : "";
  return `<span class="status-chip status-chip--${s.severity} ${f[n]} ${d}"
                title="${o(s.description || s.label)}"
                aria-label="${o(s.label)}"
                data-status="${o(e)}"
                data-tone="${s.severity}">
    ${g}${b}
  </span>`;
}
function G(e, t = "default") {
  const s = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  if (e.iconType === "iconoir") {
    const n = t === "default" ? "text-xs" : "text-[10px]";
    return `<i class="iconoir-${e.icon} ${n}" aria-hidden="true"></i>`;
  }
  return e.iconType === "char" ? `<span class="${s[t]} inline-flex items-center justify-center" aria-hidden="true">${e.icon}</span>` : `<svg class="${s[t]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${e.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function J(e, t = {}) {
  const s = T(e);
  if (!s) return `<span class="text-gray-500 text-xs">${o(e)}</span>`;
  const { size: n = "default", showIcon: r = !0, showFullMessage: i = !1, extraClass: d = "" } = t, f = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, g = r ? `<svg class="${n === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${s.icon}" clip-rule="evenodd"/>
      </svg>` : "", b = i ? s.message : s.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${f[n]} ${s.colorClass} ${d}"
                role="status"
                aria-label="${o(s.message)}"
                data-reason-code="${o(e)}">
    ${g}
    <span>${o(b)}</span>
  </span>`;
}
function le(e, t) {
  const s = T(e);
  if (!s) return "";
  const n = t || s.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${s.bgClass} ${s.textClass}"
                title="${o(n)}"
                aria-label="${o(s.shortMessage)}"
                data-reason-code="${o(e)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${s.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function ue(e = {}) {
  return (t) => typeof t != "string" || !t ? '<span class="text-gray-400">-</span>' : q(t, e);
}
function de(e = {}) {
  return (t) => typeof t != "string" || !t ? "" : J(t, e);
}
function fe(e) {
  e.schema_version !== 1 && V.warn("[TranslationStatusVocabulary] Unknown schema version:", e.schema_version);
}
function ge() {
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
export {
  B as A,
  q as C,
  z as D,
  P as E,
  te as F,
  K as M,
  ee as N,
  U as O,
  Z as P,
  le as S,
  S as T,
  re as _,
  C as a,
  ne as b,
  de as c,
  ie as d,
  T as f,
  ge as g,
  p as h,
  x as i,
  L as j,
  I as k,
  ue as l,
  oe as m,
  m as n,
  A as o,
  ce as p,
  v as r,
  _ as s,
  h as t,
  se as u,
  fe as v,
  G as w,
  J as x,
  ae as y
};

//# sourceMappingURL=translation-status-vocabulary-NKPjpKF9.js.map
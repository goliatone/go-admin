import { escapeAttribute as J, escapeHTML as f } from "../shared/html.js";
import { a as W, n as K, o as j } from "./status-vocabulary-HmIBabRF.js";
function v(e) {
  return typeof e == "string" ? e.trim() : "";
}
function p(e) {
  return (typeof e == "string" ? e.trim() : "") || void 0;
}
function y(e) {
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function Q(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e, r = p(t.label), n = p(t.href), s = p(t.kind);
  return !r && !n && !s ? null : {
    ...r ? { label: r } : {},
    ...n ? { href: n } : {},
    ...s ? { kind: s } : {}
  };
}
function Z(e) {
  if (!Array.isArray(e)) return;
  const t = e.map((r) => p(r)).filter((r) => !!r);
  return t.length > 0 ? t : void 0;
}
function ee(e) {
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
function te(e) {
  if (typeof e != "number" || !Number.isFinite(e)) return;
  const t = Math.trunc(e);
  return t > 0 ? t : void 0;
}
function N(e, t = 0) {
  return !e || t > 2 ? "" : v(e.reason_code) || v(e.textCode) || v(e.text_code) || N(e.error ?? void 0, t + 1);
}
function z(e) {
  if (typeof e == "string") return e.trim().toUpperCase() || null;
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = N(e);
  return t ? t.toUpperCase() : null;
}
function re(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return null;
  const t = e;
  if (!ee(t)) return null;
  const r = z({ reason_code: t.reason_code }), n = { enabled: typeof t.enabled == "boolean" ? t.enabled : !1 }, s = p(t.reason), a = p(t.severity), o = p(t.kind), i = p(t.permission), u = t.metadata && typeof t.metadata == "object" && !Array.isArray(t.metadata) ? t.metadata : null, c = Q(t.remediation), d = Z(t.available_transitions);
  return s && (n.reason = s), r && (n.reason_code = r), a && (n.severity = a), o && (n.kind = o), i && (n.permission = i), u && (n.metadata = u), c && (n.remediation = c), d && (n.available_transitions = d), n;
}
function L(e) {
  if (!y(e)) return {};
  const t = e, r = {};
  for (const [n, s] of Object.entries(t)) {
    const a = p(n), o = re(s);
    !a || !o || (r[a] = o);
  }
  return r;
}
function B(e) {
  return L(e);
}
function ne(e) {
  if (!y(e)) return null;
  const t = e.selection_sensitive === !0, r = p(e.selection_state_endpoint), n = te(e.debounce_ms);
  if (!t && !r && n === void 0) return null;
  const s = {};
  return t && (s.selection_sensitive = !0), r && (s.selection_state_endpoint = r), n !== void 0 && (s.debounce_ms = n), s;
}
function O(e) {
  if (!y(e)) return null;
  const t = L(e._action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    _action_state: t
  };
}
function se(e) {
  if (!y(e)) return null;
  const t = B(e.bulk_action_state);
  return Object.keys(t).length === 0 ? { ...e } : {
    ...e,
    bulk_action_state: t
  };
}
function we(e) {
  if (!y(e)) return null;
  const t = B(e.bulk_action_state);
  if (Object.keys(t).length === 0) return null;
  const r = { bulk_action_state: t };
  return y(e.selection) && (r.selection = e.selection), r;
}
function ke(e) {
  if (!y(e)) return null;
  const t = Array.isArray(e.data) ? e.data : Array.isArray(e.records) ? e.records : null, r = t && t.map((a) => O(a) ?? a), n = se(e.$meta), s = { ...e };
  if (r && (Array.isArray(e.data) && (s.data = r), Array.isArray(e.records) && (s.records = r)), n && (s.$meta = n), y(e.schema)) {
    const a = ne(e.schema.bulk_action_state_config);
    a && (s.schema = {
      ...e.schema,
      bulk_action_state_config: a
    });
  }
  return s;
}
function Ee(e) {
  return y(e) ? y(e.data) ? {
    ...e,
    data: O(e.data)
  } : { ...e } : null;
}
function Ie(e, t) {
  const r = p(t);
  return r && L(e._action_state)[r] || null;
}
var g = {
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
}, ae = {
  neutral: "bg-gray-100",
  info: "bg-sky-50",
  success: "bg-emerald-50",
  warning: "bg-amber-50",
  error: "bg-rose-50"
}, ie = {
  neutral: "text-gray-700",
  info: "text-sky-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700"
}, oe = {
  neutral: "border-gray-200",
  info: "border-sky-200",
  success: "border-emerald-200",
  warning: "border-amber-200",
  error: "border-rose-200"
};
function l(e, t = {}) {
  const r = K(e), n = r?.tone ?? "neutral";
  return {
    label: r?.label ?? j(e),
    shortLabel: t.shortLabel,
    colorClass: W(n, "badge"),
    bgClass: ae[n],
    textClass: ie[n],
    borderClass: oe[n],
    icon: r?.icon ?? "help-circle",
    iconType: "iconoir",
    severity: n,
    description: t.description
  };
}
var S = {
  ready: l("ready", {
    shortLabel: "Ready",
    description: "All required translations are complete"
  }),
  missing_locales: l("missing_locales", {
    shortLabel: "Missing",
    description: "Required locale translations are missing"
  }),
  missing_fields: l("missing_fields", {
    shortLabel: "Incomplete",
    description: "Some translations have missing required fields"
  }),
  missing_locales_and_fields: l("missing_locales_and_fields", {
    shortLabel: "Not Ready",
    description: "Missing translations and incomplete fields"
  })
}, C = {
  open: l("open", { description: "Available to be claimed" }),
  pending: l("pending", { description: "Waiting to be assigned" }),
  assigned: l("assigned", { description: "Assigned to a translator" }),
  in_progress: l("in_progress", { description: "Translation in progress" }),
  review: l("review", { description: "Pending review" }),
  rejected: l("rejected", { description: "Translation rejected" }),
  approved: l("approved", { description: "Translation approved" }),
  published: l("published", { description: "Translation published" }),
  archived: l("archived", { description: "Translation archived" })
}, w = {
  draft: l("draft", { description: "Draft content" }),
  review: l("review", { description: "Content under review" }),
  ready: l("ready", { description: "Content ready" }),
  archived: l("archived", { description: "Content archived" })
}, k = {
  overdue: l("overdue", { description: "Past due date" }),
  due_soon: l("due_soon", { description: "Due within 24 hours" }),
  on_track: l("on_track", { description: "On schedule" }),
  none: l("none", { description: "No due date set" })
}, E = {
  success: l("success", { description: "Import/export succeeded" }),
  error: l("error", { description: "Import/export failed" }),
  conflict: l("conflict", { description: "Conflicting changes detected" }),
  skipped: l("skipped", { description: "Row skipped" })
}, I = {
  running: l("running", { description: "Job in progress" }),
  completed: l("completed", { description: "Job completed successfully" }),
  failed: l("failed", { description: "Job failed" })
}, x = {
  TRANSLATION_MISSING: {
    message: "Required translation is missing",
    shortMessage: "Translation missing",
    colorClass: "bg-amber-100 text-amber-700",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    icon: g.warning,
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
    icon: g.ban,
    severity: "info",
    actionable: !1
  },
  PERMISSION_DENIED: {
    message: "You do not have permission for this action",
    shortMessage: "No permission",
    colorClass: "bg-red-100 text-red-700",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    icon: g.lock,
    severity: "error",
    actionable: !1
  },
  MISSING_CONTEXT: {
    message: "Required context is missing",
    shortMessage: "Missing context",
    colorClass: "bg-gray-100 text-gray-600",
    bgClass: "bg-gray-50",
    textClass: "text-gray-600",
    icon: g.info,
    severity: "info",
    actionable: !1
  },
  FEATURE_DISABLED: {
    message: "This feature is currently disabled",
    shortMessage: "Feature disabled",
    colorClass: "bg-gray-100 text-gray-500",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
    icon: g.ban,
    severity: "info",
    actionable: !1
  },
  RESOURCE_IN_USE: {
    message: "This resource is currently in use",
    shortMessage: "Resource in use",
    colorClass: "bg-amber-100 text-amber-800",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    icon: g.warning,
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
    icon: g.warning,
    severity: "warning",
    actionable: !1
  },
  INVALID_SELECTION: {
    message: "The current selection is not valid for this action",
    shortMessage: "Invalid selection",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: g.info,
    severity: "info",
    actionable: !1
  },
  RATE_LIMITED: {
    message: "Too many requests. Please try again shortly",
    shortMessage: "Rate limited",
    colorClass: "bg-orange-100 text-orange-800",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    icon: g.clock,
    severity: "warning",
    actionable: !1
  },
  TEMPORARILY_UNAVAILABLE: {
    message: "This action is temporarily unavailable",
    shortMessage: "Temporarily unavailable",
    colorClass: "bg-gray-100 text-gray-700",
    bgClass: "bg-gray-50",
    textClass: "text-gray-700",
    icon: g.ban,
    severity: "info",
    actionable: !1
  }
};
function _(e, t) {
  const r = e.toLowerCase();
  if ((!t || t === "core") && r in S)
    return S[r];
  if (!t || t === "queue") {
    if (r in C) return C[r];
    if (r in w) return w[r];
    if (r in k) return k[r];
  }
  if (!t || t === "exchange") {
    if (r in E) return E[r];
    if (r in I) return I[r];
  }
  return null;
}
function $(e) {
  const t = z(e);
  return t && t in x ? x[t] : null;
}
function Me(e) {
  const t = z(e);
  return t && t in x ? x[t] : null;
}
function ze(e, t) {
  return _(e, t) !== null;
}
function Le(e) {
  return $(e) !== null;
}
function $e(e) {
  switch (e) {
    case "core":
      return Object.keys(S);
    case "queue":
      return [
        ...Object.keys(C),
        ...Object.keys(w),
        ...Object.keys(k)
      ];
    case "exchange":
      return [...Object.keys(E), ...Object.keys(I)];
    default:
      return [];
  }
}
function Re() {
  return Object.keys(x);
}
function Te(e, t) {
  return _(e, t) ? `status-${e.toLowerCase()}` : "";
}
function je(e, t) {
  const r = _(e, t);
  return r ? `severity-${r.severity}` : "";
}
function le(e, t = {}) {
  const r = _(e, t.domain);
  if (!r) return `<span class="status-chip status-chip--neutral">${f(j(e) || e)}</span>`;
  const { size: n = "default", showIcon: s = !0, showLabel: a = !0, extraClass: o = "" } = t, i = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5",
    default: ""
  }, u = s ? ce(r, n) : "", c = a ? `<span>${f(r.label)}</span>` : "";
  return `<span class="status-chip status-chip--${r.severity} ${i[n]} ${o}"
                title="${f(r.description || r.label)}"
                aria-label="${f(r.label)}"
                data-status="${f(e)}">
    ${u}${c}
  </span>`;
}
function ce(e, t = "default") {
  const r = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4"
  };
  if (e.iconType === "iconoir") {
    const n = t === "default" ? "text-xs" : "text-[10px]";
    return `<i class="iconoir-${e.icon} ${n}" aria-hidden="true"></i>`;
  }
  return e.iconType === "char" ? `<span class="${r[t]} inline-flex items-center justify-center" aria-hidden="true">${e.icon}</span>` : `<svg class="${r[t]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${e.icon}" clip-rule="evenodd"/>
  </svg>`;
}
function ue(e, t = {}) {
  const r = $(e);
  if (!r) return `<span class="text-gray-500 text-xs">${f(e)}</span>`;
  const { size: n = "default", showIcon: s = !0, showFullMessage: a = !1, extraClass: o = "" } = t, i = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-1 text-sm"
  }, u = s ? `<svg class="${n === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${r.icon}" clip-rule="evenodd"/>
      </svg>` : "", c = a ? r.message : r.shortMessage;
  return `<span class="inline-flex items-center gap-1.5 rounded ${i[n]} ${r.colorClass} ${o}"
                role="status"
                aria-label="${f(r.message)}"
                data-reason-code="${f(e)}">
    ${u}
    <span>${f(c)}</span>
  </span>`;
}
function Ne(e, t) {
  const r = $(e);
  if (!r) return "";
  const n = t || r.message;
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${r.bgClass} ${r.textClass}"
                title="${f(n)}"
                aria-label="${f(r.shortMessage)}"
                data-reason-code="${f(e)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${r.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}
function Be(e = {}) {
  return (t) => typeof t != "string" || !t ? '<span class="text-gray-400">-</span>' : le(t, e);
}
function Oe(e = {}) {
  return (t) => typeof t != "string" || !t ? "" : ue(t, e);
}
function De(e) {
  e.schema_version !== 1 && console.warn("[TranslationStatusVocabulary] Unknown schema version:", e.schema_version);
}
function Ge() {
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
function Pe(e, t = {}) {
  const { groupByField: r = "family_id", defaultExpanded: n = !0, expandMode: s = "explicit", expandedGroups: a = /* @__PURE__ */ new Set() } = t, o = /* @__PURE__ */ new Map(), i = [];
  for (const c of e) {
    const d = be(c, r);
    if (d) {
      const m = o.get(d);
      m ? m.push(c) : o.set(d, [c]);
    } else i.push(c);
  }
  const u = [];
  for (const [c, d] of o) {
    const m = U(d), b = D(c, s, a, n);
    u.push({
      groupId: c,
      records: d,
      summary: m,
      expanded: b,
      summaryFromBackend: !1
    });
  }
  return u.sort((c, d) => e.indexOf(c.records[0]) - e.indexOf(d.records[0])), {
    groups: u,
    ungrouped: i,
    totalGroups: u.length,
    totalRecords: e.length
  };
}
function de(e) {
  if (e.length === 0) return !1;
  let t = !1;
  for (const r of e) {
    if (fe(r)) {
      t = !0;
      continue;
    }
    if (G(r)) {
      t = !0;
      continue;
    }
    return !1;
  }
  return t;
}
function Ve(e, t = {}) {
  const { defaultExpanded: r = !0, expandMode: n = "explicit", expandedGroups: s = /* @__PURE__ */ new Set() } = t;
  if (!de(e)) return null;
  const a = [], o = [];
  let i = 0;
  for (const u of e) {
    if (G(u)) {
      o.push({ ...u }), i += 1;
      continue;
    }
    const c = pe(u);
    if (!c) return null;
    const d = V(u), m = ge(u, d), b = D(c, n, s, r);
    a.push({
      groupId: c,
      displayLabel: ye(u, d),
      records: d,
      summary: m,
      expanded: b,
      summaryFromBackend: me(u)
    }), i += d.length;
  }
  return {
    groups: a,
    ungrouped: o,
    totalGroups: a.length,
    totalRecords: i
  };
}
function D(e, t, r, n) {
  return t === "all" ? !r.has(e) : t === "none" ? r.has(e) : r.size === 0 ? n : r.has(e);
}
function fe(e) {
  const t = e, r = typeof t.group_by == "string" ? t.group_by.trim().toLowerCase() : "", n = P(e);
  if (!(r === "family_id" || n === "group")) return !1;
  const s = V(e);
  return Array.isArray(s);
}
function G(e) {
  return P(e) === "ungrouped";
}
function P(e) {
  const t = e._group;
  if (!t || typeof t != "object" || Array.isArray(t)) return "";
  const r = t.row_type;
  return typeof r == "string" ? r.trim().toLowerCase() : "";
}
function pe(e) {
  const t = e.family_id;
  if (typeof t == "string" && t.trim()) return t.trim();
  const r = e._group;
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  const n = r.id;
  return typeof n == "string" && n.trim() ? n.trim() : null;
}
function V(e) {
  const t = e, r = Array.isArray(t.records) ? t.records : t.children;
  if (Array.isArray(r)) {
    const s = r.filter((a) => !!a && typeof a == "object" && !Array.isArray(a)).map((a) => ({ ...a }));
    if (s.length > 0) return s;
  }
  const n = t.parent;
  return n && typeof n == "object" && !Array.isArray(n) ? [{ ...n }] : [];
}
function me(e) {
  const t = e.family_summary;
  return !!t && typeof t == "object" && !Array.isArray(t);
}
function ge(e, t) {
  const r = e.family_summary;
  if (!r || typeof r != "object" || Array.isArray(r)) return U(t);
  const n = r, s = Array.isArray(n.available_locales) ? n.available_locales.filter(h) : [], a = Array.isArray(n.missing_locales) ? n.missing_locales.filter(h) : [], o = H(n.readiness_state) ? n.readiness_state : null, i = Math.max(t.length, typeof n.child_count == "number" ? Math.max(n.child_count, 0) : 0);
  return {
    totalItems: typeof n.total_items == "number" ? Math.max(n.total_items, 0) : i,
    availableLocales: s,
    missingLocales: a,
    readinessState: o,
    readyForPublish: typeof n.ready_for_publish == "boolean" ? n.ready_for_publish : null
  };
}
function ye(e, t) {
  const r = e.family_label;
  if (typeof r == "string" && r.trim()) return r.trim();
  const n = e.family_summary;
  if (n && typeof n == "object" && !Array.isArray(n)) {
    const i = n.group_label;
    if (typeof i == "string" && i.trim()) return i.trim();
  }
  const s = e._group;
  if (s && typeof s == "object" && !Array.isArray(s)) {
    const i = s.label;
    if (typeof i == "string" && i.trim()) return i.trim();
  }
  const a = [], o = e.parent;
  if (o && typeof o == "object" && !Array.isArray(o)) {
    const i = o;
    a.push(i.title, i.name, i.slug, i.path);
  }
  t.length > 0 && a.push(t[0].title, t[0].name, t[0].slug, t[0].path);
  for (const i of a) if (typeof i == "string" && i.trim()) return i.trim();
}
function be(e, t) {
  const r = e[t];
  return typeof r == "string" && r.trim() ? r : null;
}
function U(e) {
  const t = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
  let n = !1, s = 0;
  for (const o of e) {
    const i = o.translation_readiness;
    if (i) {
      const c = i.available_locales, d = i.missing_required_locales, m = i.readiness_state;
      Array.isArray(c) && c.filter(h).forEach((b) => t.add(b)), Array.isArray(d) && d.filter(h).forEach((b) => r.add(b)), (m === "missing_fields" || m === "missing_locales_and_fields") && (n = !0), m === "ready" && s++;
    }
    const u = o.available_locales;
    Array.isArray(u) && u.filter(h).forEach((c) => t.add(c));
  }
  let a = null;
  if (e.length > 0) {
    const o = s === e.length, i = r.size > 0;
    o ? a = "ready" : i && n ? a = "missing_locales_and_fields" : i ? a = "missing_locales" : n && (a = "missing_fields");
  }
  return {
    totalItems: e.length,
    availableLocales: Array.from(t),
    missingLocales: Array.from(r),
    readinessState: a,
    readyForPublish: a === "ready"
  };
}
function h(e) {
  return typeof e == "string";
}
function Ue(e, t) {
  const r = e.groups.map((n) => {
    const s = t.get(n.groupId);
    return s ? {
      ...n,
      summary: {
        ...n.summary,
        ...s
      },
      summaryFromBackend: !0
    } : n;
  });
  return {
    ...e,
    groups: r
  };
}
function He(e) {
  const t = /* @__PURE__ */ new Map(), r = e.group_summaries;
  if (!r || typeof r != "object" || Array.isArray(r)) return t;
  for (const [n, s] of Object.entries(r)) if (s && typeof s == "object") {
    const a = s;
    t.set(n, {
      totalItems: typeof a.total_items == "number" ? a.total_items : void 0,
      availableLocales: Array.isArray(a.available_locales) ? a.available_locales.filter(h) : void 0,
      missingLocales: Array.isArray(a.missing_locales) ? a.missing_locales.filter(h) : void 0,
      readinessState: H(a.readiness_state) ? a.readiness_state : void 0,
      readyForPublish: typeof a.ready_for_publish == "boolean" ? a.ready_for_publish : void 0
    });
  }
  return t;
}
function H(e) {
  return e === "ready" || e === "missing_locales" || e === "missing_fields" || e === "missing_locales_and_fields";
}
var A = "datagrid-expand-state-";
function M(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const r of e) {
    const n = T(r);
    if (n && !t.includes(n)) {
      if (t.length >= R) break;
      t.push(n);
    }
  }
  return t;
}
function F(e) {
  if (!e) return null;
  try {
    const t = JSON.parse(e);
    return Array.isArray(t) ? {
      version: 2,
      mode: "explicit",
      ids: M(t)
    } : !t || typeof t != "object" || Array.isArray(t) ? null : {
      version: 2,
      mode: X(t.mode, "explicit"),
      ids: M(t.ids)
    };
  } catch {
    return null;
  }
}
function Fe(e) {
  try {
    const t = A + e, r = F(localStorage.getItem(t));
    if (r) return new Set(r.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function qe(e) {
  try {
    const t = A + e, r = F(localStorage.getItem(t));
    if (r) return r.mode;
  } catch {
  }
  return "explicit";
}
function Xe(e) {
  try {
    const t = A + e;
    return localStorage.getItem(t) !== null;
  } catch {
    return !1;
  }
}
function Ye(e, t, r = "explicit") {
  try {
    const n = A + e, s = M(Array.from(t)), a = {
      version: 2,
      mode: X(r, "explicit"),
      ids: s
    };
    localStorage.setItem(n, JSON.stringify(a));
  } catch {
  }
}
function Je(e, t) {
  const r = e.groups.map((n) => n.groupId === t ? {
    ...n,
    expanded: !n.expanded
  } : n);
  return {
    ...e,
    groups: r
  };
}
function We(e) {
  const t = e.groups.map((r) => ({
    ...r,
    expanded: !0
  }));
  return {
    ...e,
    groups: t
  };
}
function Ke(e) {
  const t = e.groups.map((r) => ({
    ...r,
    expanded: !1
  }));
  return {
    ...e,
    groups: t
  };
}
function Qe(e) {
  const t = /* @__PURE__ */ new Set();
  for (const r of e.groups) r.expanded && t.add(r.groupId);
  return t;
}
var q = "datagrid-view-mode-", R = 200, he = 256;
function X(e, t = "explicit") {
  return e === "all" || e === "none" || e === "explicit" ? e : t;
}
function Ze(e) {
  try {
    const t = q + e, r = localStorage.getItem(t);
    if (r && Y(r)) return r;
  } catch {
  }
  return null;
}
function et(e, t) {
  try {
    const r = q + e;
    localStorage.setItem(r, t);
  } catch {
  }
}
function Y(e) {
  return e === "flat" || e === "grouped" || e === "matrix" || e === "server_family";
}
function tt(e) {
  return e && Y(e) ? e : null;
}
function rt(e) {
  if (!(e instanceof Set) || e.size === 0) return "";
  const t = Array.from(new Set(Array.from(e).map((r) => T(r)).filter((r) => r !== null))).slice(0, R).sort();
  return t.length === 0 ? "" : t.map((r) => encodeURIComponent(r)).join(",");
}
function nt(e) {
  const t = /* @__PURE__ */ new Set();
  if (!e) return t;
  const r = e.split(",");
  for (const n of r) {
    if (t.size >= R) break;
    if (!n) continue;
    let s = "";
    try {
      s = decodeURIComponent(n);
    } catch {
      continue;
    }
    const a = T(s);
    a && t.add(a);
  }
  return t;
}
function T(e) {
  if (typeof e != "string") return null;
  let t = e.trim();
  if (!t) return null;
  if (t.includes("%")) try {
    const r = decodeURIComponent(t);
    typeof r == "string" && r.trim() && (t = r.trim());
  } catch {
  }
  return t.length > he ? null : t;
}
function xe(e, t = {}) {
  const { summary: r } = e, { size: n = "sm" } = t, s = n === "sm" ? "text-xs" : "text-sm", a = r.availableLocales.length, o = a + r.missingLocales.length;
  let i = "";
  if (r.readinessState) {
    const d = _e(r.readinessState);
    i = `
      <span class="${s} px-1.5 py-0.5 rounded ${d.bgClass} ${d.textClass}"
            title="${d.description}">
        ${d.icon} ${d.label}
      </span>
    `;
  }
  const u = o > 0 ? `<span class="${s} text-gray-500">${a}/${o} locales</span>` : "", c = `<span class="${s} text-gray-500">${r.totalItems} item${r.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${i}
      ${u}
      ${c}
    </div>
  `;
}
function _e(e) {
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
function Ae(e) {
  if (typeof e.displayLabel == "string" && e.displayLabel.trim()) return e.displayLabel.trim();
  if (e.groupId.startsWith("ungrouped:")) return "Ungrouped Records";
  if (e.records.length > 0) {
    const t = e.records[0];
    for (const r of [
      "title",
      "name",
      "label",
      "subject"
    ]) {
      const n = t[r];
      if (typeof n == "string" && n.trim()) {
        const s = n.trim();
        return s.length > 60 ? s.slice(0, 57) + "..." : s;
      }
    }
  }
  return `Translation Group (${e.groupId.length > 8 ? e.groupId.slice(0, 8) + "..." : e.groupId})`;
}
function st(e, t, r = {}) {
  const { showExpandIcon: n = !0 } = r, s = n ? `<span class="expand-icon mr-2" aria-hidden="true">${e.expanded ? "▼" : "▶"}</span>` : "", a = xe(e), o = f(Ae(e)), i = e.records.length, u = i > 1 ? `<span class="ml-2 text-xs text-gray-500">(${i} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${J(e.groupId)}"
        data-expanded="${e.expanded}"
        role="row"
        aria-expanded="${e.expanded}"
        tabindex="0">
      <td colspan="${t + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${s}
            <span class="font-medium text-gray-700">${o}</span>
            ${u}
          </div>
          ${a}
        </div>
      </td>
    </tr>
  `;
}
function at(e) {
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
function it(e) {
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
function ot(e, t, r) {
  const n = r ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr>
      <td colspan="${e + 2}" class="px-6 py-12 text-center">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${f(t)}</p>
          ${n}
        </div>
      </td>
    </tr>
  `;
}
function ve(e = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < e;
}
function lt(e, t = 768) {
  return ve(t) && e === "grouped" ? "flat" : e;
}
export {
  L as $,
  E as A,
  Te as B,
  ot as C,
  S as D,
  Pe as E,
  Be as F,
  Le as G,
  Ge as H,
  Me as I,
  Ne as J,
  ze as K,
  Re as L,
  k as M,
  C as N,
  x as O,
  Oe as P,
  re as Q,
  $ as R,
  at as S,
  Je as T,
  $e as U,
  _ as V,
  De as W,
  ce as X,
  le as Y,
  z as Z,
  tt as _,
  He as a,
  Ee as at,
  st as b,
  Fe as c,
  de as d,
  se as et,
  Xe as f,
  X as g,
  Ve as h,
  We as i,
  we as it,
  w as j,
  I as k,
  Ze as l,
  Ue as m,
  nt as n,
  ne as nt,
  Qe as o,
  ke as ot,
  ve as p,
  ue as q,
  rt as r,
  B as rt,
  qe as s,
  Ie as st,
  Ke as t,
  O as tt,
  lt as u,
  Ye as v,
  it as w,
  xe as x,
  et as y,
  je as z
};

//# sourceMappingURL=grouped-mode-nI4zGZjZ.js.map
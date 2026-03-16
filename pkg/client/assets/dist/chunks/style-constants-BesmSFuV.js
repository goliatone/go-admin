const M = "btn btn-primary", N = "btn btn-secondary", D = "btn btn-danger", h = "btn btn-primary btn-sm", B = "btn btn-secondary btn-sm", P = "btn btn-danger btn-sm", k = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", G = "text-3xl font-bold text-admin-dark", U = "text-xs font-semibold uppercase tracking-wider text-gray-500", Y = "text-sm text-gray-500 mt-1", $ = "bg-white border border-gray-200 rounded-xl", H = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", F = "text-lg font-semibold text-gray-900", X = "text-sm text-gray-500 mt-2", j = "rounded-xl border border-rose-200 bg-rose-50 p-6", q = "text-lg font-semibold text-rose-800", z = "text-sm text-rose-700 mt-2", K = "rounded-xl border border-gray-200 bg-white p-8 text-center", Q = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", V = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", E = "bg-[var(--translation-status-success-bg)] text-[var(--translation-status-success-text)] border-[var(--translation-status-success-border)]", f = "bg-[var(--translation-status-warning-bg)] text-[var(--translation-status-warning-text)] border-[var(--translation-status-warning-border)]", x = "bg-[var(--translation-status-error-bg)] text-[var(--translation-status-error-text)] border-[var(--translation-status-error-border)]", T = "bg-[var(--translation-status-info-bg)] text-[var(--translation-status-info-text)] border-[var(--translation-status-info-border)]", b = "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]", A = "bg-[var(--translation-status-purple-bg)] text-[var(--translation-status-purple-text)] border-[var(--translation-status-purple-border)]", m = {
  success: E,
  warning: f,
  error: x,
  info: T,
  neutral: b,
  purple: A
};
function n(t) {
  return m[t.toLowerCase()] ?? b;
}
const p = {
  // Success
  ready: "success",
  approved: "success",
  published: "success",
  completed: "success",
  on_track: "success",
  success: "success",
  // Warning
  pending: "warning",
  pending_review: "warning",
  due_soon: "warning",
  missing_fields: "warning",
  missing_field: "warning",
  conflict: "warning",
  changes_requested: "warning",
  // Error
  blocked: "error",
  rejected: "error",
  failed: "error",
  overdue: "error",
  missing_locale: "error",
  missing_locales: "error",
  missing_locales_and_fields: "error",
  error: "error",
  // Info
  in_progress: "info",
  assigned: "info",
  in_review: "info",
  review: "info",
  running: "info",
  // Neutral
  draft: "neutral",
  archived: "neutral",
  none: "neutral",
  not_required: "neutral",
  skipped: "neutral",
  inactive: "neutral"
};
function W(t) {
  const e = t.toLowerCase().replace(/-/g, "_"), r = p[e] ?? "neutral";
  return n(r);
}
const _ = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", R = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]", y = "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium", S = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
function s(t, e = "md") {
  return `${e === "sm" ? R : e === "lg" ? y : e === "count" ? S : _} ${n(t)}`;
}
const L = "rounded-xl border px-3 py-3 text-sm", C = "font-semibold", I = "text-xs", O = {
  event: "neutral",
  review: "warning",
  qa: "error",
  success: "success"
};
function J(t) {
  const e = O[t] ?? "neutral", r = n(e);
  return {
    container: `${L} ${r}`,
    title: `${C} text-gray-900`,
    badge: s(e, "sm"),
    time: `${I} text-gray-500`
  };
}
const g = "rounded-xl border px-3 py-3 text-sm bg-white", w = "rounded-xl border p-5";
function Z(t) {
  return t === "blocker" ? {
    container: `${g} ${n("error")} text-gray-900`,
    badge: s("error", "sm")
  } : {
    container: `${g} ${n("warning")} text-gray-900`,
    badge: s("warning", "sm")
  };
}
function tt(t) {
  return `${w} ${n(t ? "error" : "neutral")}`;
}
function et(t) {
  switch (t) {
    case "conflict":
      return s("error");
    case "saving":
      return s("warning");
    case "saved":
      return s("success");
    case "dirty":
      return s("neutral");
    case "idle":
    default:
      return s("neutral");
  }
}
function rt(t, e) {
  switch (t) {
    case "conflict":
      return "Conflict detected";
    case "saving":
      return "Autosaving draft…";
    case "saved":
      return e || "Draft saved automatically";
    case "dirty":
      return "Unsaved changes";
    case "idle":
    default:
      return "No pending changes";
  }
}
const st = `${_} ${n("info")}`, nt = "font-semibold", at = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", ot = "flex items-start justify-between gap-3", it = "text-sm font-semibold text-gray-900", ct = "text-xs text-gray-500 mt-1", lt = "mt-3 space-y-2", ut = "flex items-center justify-between text-sm", dt = "text-gray-500", gt = "font-medium text-gray-900", bt = "mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100", _t = "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", Et = "min-w-full border-separate border-spacing-0", ft = "sticky top-0 z-20 bg-white", xt = "sticky left-0 z-10 bg-white", Tt = "sticky left-0 z-30 bg-white", At = "border-b border-gray-200 px-3 py-3 align-top";
function mt(t, e) {
  const r = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', i = () => Array.from(t.querySelectorAll(r)), c = (a) => {
    if (a.key === "Escape") {
      a.preventDefault(), e?.();
      return;
    }
    if (a.key === "Tab") {
      const o = i();
      if (o.length === 0) return;
      const u = o[0], d = o[o.length - 1];
      a.shiftKey && document.activeElement === u ? (a.preventDefault(), d.focus()) : !a.shiftKey && document.activeElement === d && (a.preventDefault(), u.focus());
    }
  };
  t.addEventListener("keydown", c);
  const l = i();
  return l.length > 0 && l[0].focus(), () => {
    t.removeEventListener("keydown", c);
  };
}
function v(t) {
  const e = t.tagName.toLowerCase();
  return e === "input" || e === "select" || e === "textarea" || e === "button" ? !0 : e === "a" ? t.hasAttribute("href") : t.isContentEditable;
}
function pt(t) {
  t.querySelectorAll("[data-field-input]").forEach((r) => {
    if (v(r)) {
      r.removeAttribute("tabindex");
      return;
    }
    r.setAttribute("tabindex", "0");
  });
}
export {
  Tt as A,
  M as B,
  $ as C,
  xt as D,
  H as E,
  At as F,
  st as G,
  U as H,
  h as I,
  P as J,
  at as K,
  K as L,
  Q as M,
  ot as N,
  it as O,
  ct as P,
  lt as Q,
  ut as R,
  dt as S,
  gt as T,
  bt as U,
  G as a,
  F as b,
  X as c,
  j as d,
  q as e,
  z as f,
  W as g,
  N as h,
  V as i,
  k as j,
  n as k,
  Y as l,
  D as m,
  rt as n,
  et as o,
  tt as p,
  s as q,
  B as r,
  pt as s,
  mt as t,
  J as u,
  nt as v,
  Z as w,
  _t as x,
  Et as y,
  ft as z
};
//# sourceMappingURL=style-constants-BesmSFuV.js.map

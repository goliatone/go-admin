const D = "btn btn-primary", M = "btn btn-secondary", N = "btn btn-danger", h = "btn btn-primary btn-sm", B = "btn btn-secondary btn-sm", U = "btn btn-danger btn-sm", P = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", G = "rounded-xl", k = "text-gray-500", Y = "text-gray-900", $ = "text-admin-dark", X = "border-gray-200", F = "bg-white", H = "bg-gray-50", j = "text-3xl font-bold text-admin-dark", q = "text-xs font-semibold uppercase tracking-wider text-gray-500", z = "text-sm text-gray-500 mt-1", K = "bg-white border border-gray-200 rounded-xl", Q = "bg-white border border-gray-200 rounded-xl shadow-sm", V = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", W = "text-lg font-semibold text-gray-900", J = "text-sm text-gray-500 mt-2", Z = "rounded-xl border border-rose-200 bg-rose-50 p-6", tt = "text-lg font-semibold text-rose-800", et = "text-sm text-rose-700 mt-2", rt = "rounded-xl border border-gray-200 bg-white p-8 text-center", st = "w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white", nt = "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500", at = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", ot = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", _ = "bg-[var(--translation-status-success-bg)] text-[var(--translation-status-success-text)] border-[var(--translation-status-success-border)]", T = "bg-[var(--translation-status-warning-bg)] text-[var(--translation-status-warning-text)] border-[var(--translation-status-warning-border)]", x = "bg-[var(--translation-status-error-bg)] text-[var(--translation-status-error-text)] border-[var(--translation-status-error-border)]", f = "bg-[var(--translation-status-info-bg)] text-[var(--translation-status-info-text)] border-[var(--translation-status-info-border)]", b = "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]", A = "bg-[var(--translation-status-purple-bg)] text-[var(--translation-status-purple-text)] border-[var(--translation-status-purple-border)]", m = {
  success: _,
  warning: T,
  error: x,
  info: f,
  neutral: b,
  purple: A
};
function n(t) {
  return m[t.toLowerCase()] ?? b;
}
const R = {
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
function it(t) {
  const e = t.toLowerCase().replace(/-/g, "_"), r = R[e] ?? "neutral";
  return n(r);
}
const E = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", y = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]", p = "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium", S = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
function s(t, e = "md") {
  return `${e === "sm" ? y : e === "lg" ? p : e === "count" ? S : E} ${n(t)}`;
}
const L = "rounded-xl border px-3 py-3 text-sm", C = "font-semibold", w = "text-xs", O = {
  event: "neutral",
  review: "warning",
  qa: "error",
  success: "success"
};
function ct(t) {
  const e = O[t] ?? "neutral", r = n(e);
  return {
    container: `${L} ${r}`,
    title: `${C} text-gray-900`,
    badge: s(e, "sm"),
    time: `${w} text-gray-500`
  };
}
const g = "rounded-xl border px-3 py-3 text-sm bg-white", I = "rounded-xl border p-5";
function lt(t) {
  return t === "blocker" ? {
    container: `${g} ${n("error")} text-gray-900`,
    badge: s("error", "sm")
  } : {
    container: `${g} ${n("warning")} text-gray-900`,
    badge: s("warning", "sm")
  };
}
function ut(t) {
  return `${I} ${n(t ? "error" : "neutral")}`;
}
function dt(t) {
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
function gt(t, e) {
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
const bt = `${E} ${n("info")}`, Et = "font-semibold", _t = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", Tt = "flex items-start justify-between gap-3", xt = "text-sm font-semibold text-gray-900", ft = "text-xs text-gray-500 mt-1", At = "mt-3 space-y-2", mt = "flex items-center justify-between text-sm", Rt = "text-gray-500", yt = "font-medium text-gray-900", pt = "mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100", St = "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", Lt = "min-w-full border-separate border-spacing-0", Ct = "sticky top-0 z-20 bg-white", wt = "sticky left-0 z-10 bg-white", Ot = "sticky left-0 z-30 bg-white", It = "border-b border-gray-200 px-3 py-3 align-top";
function vt(t, e) {
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
function Dt(t) {
  t.querySelectorAll("[data-field-input]").forEach((r) => {
    if (v(r)) {
      r.removeAttribute("tabindex");
      return;
    }
    r.setAttribute("tabindex", "0");
  });
}
export {
  pt as $,
  lt as A,
  M as B,
  Q as C,
  St as D,
  V as E,
  Lt as F,
  bt as G,
  q as H,
  st as I,
  Ct as J,
  Ot as K,
  rt as L,
  at as M,
  wt as N,
  It as O,
  h as P,
  U as Q,
  G as R,
  _t as S,
  $ as T,
  Tt as U,
  xt as V,
  ft as W,
  At as X,
  mt as Y,
  Rt as Z,
  yt as _,
  z as a,
  F as a0,
  Y as a1,
  k as a2,
  X as b,
  H as c,
  K as d,
  nt as e,
  D as f,
  it as g,
  j as h,
  W as i,
  J as j,
  Z as k,
  tt as l,
  et as m,
  ot as n,
  P as o,
  n as p,
  N as q,
  gt as r,
  Dt as s,
  vt as t,
  dt as u,
  ut as v,
  s as w,
  B as x,
  ct as y,
  Et as z
};
//# sourceMappingURL=style-constants-i2xRoO1L.js.map

var D = "btn btn-primary", M = "btn btn-secondary", N = "btn btn-danger", h = "btn btn-primary btn-sm", B = "btn btn-secondary btn-sm", U = "btn btn-danger btn-sm", P = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", G = "rounded-xl", k = "text-gray-500", Y = "text-gray-900", $ = "text-admin-dark", X = "border-gray-200", H = "bg-white", F = "bg-gray-50", j = "text-3xl font-bold text-admin-dark", q = "text-xs font-semibold uppercase tracking-wider text-gray-500", K = "text-sm text-gray-500 mt-1", Q = "px-8 py-6 bg-white border-b border-gray-200", V = "flex flex-wrap items-center justify-between gap-4", W = "bg-white border border-gray-200 rounded-xl", z = "bg-white border border-gray-200 rounded-xl shadow-sm", J = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", Z = "text-lg font-semibold text-gray-900", rr = "text-sm text-gray-500 mt-2", er = "rounded-xl border border-rose-200 bg-rose-50 p-6", tr = "text-lg font-semibold text-rose-800", ar = "text-sm text-rose-700 mt-2", sr = "rounded-xl border border-gray-200 bg-white p-8 text-center", nr = "w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white", or = "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500", ir = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", lr = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", E = "bg-[var(--translation-status-success-bg)] text-[var(--translation-status-success-text)] border-[var(--translation-status-success-border)]", _ = "bg-[var(--translation-status-warning-bg)] text-[var(--translation-status-warning-text)] border-[var(--translation-status-warning-border)]", v = "bg-[var(--translation-status-error-bg)] text-[var(--translation-status-error-text)] border-[var(--translation-status-error-border)]", x = "bg-[var(--translation-status-info-bg)] text-[var(--translation-status-info-text)] border-[var(--translation-status-info-border)]", f = "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]", T = "bg-[var(--translation-status-purple-bg)] text-[var(--translation-status-purple-text)] border-[var(--translation-status-purple-border)]", A = {
  success: E,
  warning: _,
  error: v,
  info: x,
  neutral: f,
  purple: T
};
function a(r) {
  return A[r.toLowerCase()] ?? "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]";
}
var m = {
  ready: "success",
  approved: "success",
  published: "success",
  completed: "success",
  on_track: "success",
  success: "success",
  pending: "warning",
  pending_review: "warning",
  due_soon: "warning",
  missing_fields: "warning",
  missing_field: "warning",
  conflict: "warning",
  changes_requested: "warning",
  blocked: "error",
  rejected: "error",
  failed: "error",
  overdue: "error",
  missing_locale: "error",
  missing_locales: "error",
  missing_locales_and_fields: "error",
  error: "error",
  in_progress: "info",
  assigned: "info",
  in_review: "info",
  review: "info",
  running: "info",
  draft: "neutral",
  archived: "neutral",
  none: "neutral",
  not_required: "neutral",
  skipped: "neutral",
  inactive: "neutral"
};
function ur(r) {
  return a(m[r.toLowerCase().replace(/-/g, "_")] ?? "neutral");
}
var c = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", R = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]", y = "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium", p = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
function t(r, e = "md") {
  return `${e === "sm" ? R : e === "lg" ? y : e === "count" ? p : c} ${a(r)}`;
}
var L = "rounded-xl border px-3 py-3 text-sm", S = "font-semibold", w = "text-xs", C = {
  event: "neutral",
  review: "warning",
  qa: "error",
  success: "success"
};
function dr(r) {
  const e = C[r] ?? "neutral";
  return {
    container: `${L} ${a(e)}`,
    title: `${S} text-gray-900`,
    badge: t(e, "sm"),
    time: `${w} text-gray-500`
  };
}
var b = "rounded-xl border px-3 py-3 text-sm bg-white", O = "rounded-xl border p-5";
function br(r) {
  return r === "blocker" ? {
    container: `${b} ${a("error")} text-gray-900`,
    badge: t("error", "sm")
  } : {
    container: `${b} ${a("warning")} text-gray-900`,
    badge: t("warning", "sm")
  };
}
function cr(r) {
  return `${O} ${a(r ? "error" : "neutral")}`;
}
function gr(r) {
  switch (r) {
    case "conflict":
      return t("error");
    case "saving":
      return t("warning");
    case "saved":
      return t("success");
    case "dirty":
      return t("neutral");
    default:
      return t("neutral");
  }
}
function Er(r, e) {
  switch (r) {
    case "conflict":
      return "Conflict detected";
    case "saving":
      return "Autosaving draft…";
    case "saved":
      return e || "Draft saved automatically";
    case "dirty":
      return "Unsaved changes";
    default:
      return "No pending changes";
  }
}
var _r = `${c} ${a("info")}`, vr = "font-semibold", xr = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", fr = "flex items-start justify-between gap-3", Tr = "text-sm font-semibold text-gray-900", Ar = "text-xs text-gray-500 mt-1", mr = "mt-3 space-y-2", Rr = "flex items-center justify-between text-sm", yr = "text-gray-500", pr = "font-medium text-gray-900", Lr = "mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100", Sr = "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", wr = "min-w-full border-separate border-spacing-0", Cr = "sticky top-0 z-20 bg-white", Or = "sticky left-0 z-10 bg-white", Ir = "sticky left-0 z-30 bg-white", Dr = "border-b border-gray-200 px-3 py-3 align-top";
function Mr(r, e) {
  const g = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', o = () => Array.from(r.querySelectorAll(g)), i = (s) => {
    if (s.key === "Escape") {
      s.preventDefault(), e?.();
      return;
    }
    if (s.key === "Tab") {
      const n = o();
      if (n.length === 0) return;
      const u = n[0], d = n[n.length - 1];
      s.shiftKey && document.activeElement === u ? (s.preventDefault(), d.focus()) : !s.shiftKey && document.activeElement === d && (s.preventDefault(), u.focus());
    }
  };
  r.addEventListener("keydown", i);
  const l = o();
  return l.length > 0 && l[0].focus(), () => {
    r.removeEventListener("keydown", i);
  };
}
function I(r) {
  const e = r.tagName.toLowerCase();
  return e === "input" || e === "select" || e === "textarea" || e === "button" ? !0 : e === "a" ? r.hasAttribute("href") : r.isContentEditable;
}
function Nr(r) {
  r.querySelectorAll("[data-field-input]").forEach((e) => {
    if (I(e)) {
      e.removeAttribute("tabindex");
      return;
    }
    e.setAttribute("tabindex", "0");
  });
}
export {
  br as $,
  Ir as A,
  Rr as B,
  V as C,
  nr as D,
  or as E,
  xr as F,
  ir as G,
  Tr as H,
  Lr as I,
  k as J,
  G as K,
  mr as L,
  Cr as M,
  Or as N,
  sr as O,
  wr as P,
  t as Q,
  fr as R,
  K as S,
  j as T,
  pr as U,
  Ar as V,
  lr as W,
  gr as X,
  $ as Y,
  Er as Z,
  ar as _,
  U as a,
  Mr as at,
  vr as b,
  h as c,
  W as d,
  cr as et,
  z as f,
  er as g,
  Z as h,
  N as i,
  Nr as it,
  Sr as j,
  Dr as k,
  M as l,
  rr as m,
  H as n,
  ur as nt,
  P as o,
  J as p,
  Y as q,
  X as r,
  dr as rt,
  D as s,
  F as t,
  a as tt,
  B as u,
  tr as v,
  q as w,
  Q as x,
  _r as y,
  yr as z
};

//# sourceMappingURL=translation-shared-CQJ98SgC.js.map
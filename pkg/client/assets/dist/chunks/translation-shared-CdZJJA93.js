var w = "btn btn-primary", D = "btn btn-secondary", M = "btn btn-danger", h = "btn btn-primary btn-sm", B = "btn btn-secondary btn-sm", U = "btn btn-danger btn-sm", G = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", P = "rounded-xl", k = "text-gray-500", Y = "text-gray-900", H = "text-admin-dark", $ = "border-gray-200", F = "bg-white", X = "bg-gray-50", K = "text-3xl font-bold text-admin-dark", V = "text-xs font-semibold uppercase tracking-wider text-gray-500", W = "text-sm text-gray-500 mt-1", j = "bg-white border border-gray-200 rounded-xl", q = "bg-white border border-gray-200 rounded-xl shadow-sm", Q = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", z = "text-lg font-semibold text-gray-900", J = "text-sm text-gray-500 mt-2", Z = "rounded-xl border border-rose-200 bg-rose-50 p-6", rr = "text-lg font-semibold text-rose-800", er = "text-sm text-rose-700 mt-2", tr = "rounded-xl border border-gray-200 bg-white p-8 text-center", ar = "w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white", sr = "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500", nr = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", or = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", _ = "bg-[var(--translation-status-success-bg)] text-[var(--translation-status-success-text)] border-[var(--translation-status-success-border)]", E = "bg-[var(--translation-status-warning-bg)] text-[var(--translation-status-warning-text)] border-[var(--translation-status-warning-border)]", v = "bg-[var(--translation-status-error-bg)] text-[var(--translation-status-error-text)] border-[var(--translation-status-error-border)]", x = "bg-[var(--translation-status-info-bg)] text-[var(--translation-status-info-text)] border-[var(--translation-status-info-border)]", T = "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]", f = "bg-[var(--translation-status-purple-bg)] text-[var(--translation-status-purple-text)] border-[var(--translation-status-purple-border)]", A = {
  success: _,
  warning: E,
  error: v,
  info: x,
  neutral: T,
  purple: f
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
function ir(r) {
  return a(m[r.toLowerCase().replace(/-/g, "_")] ?? "neutral");
}
var g = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", R = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]", C = "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium", O = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
function t(r, e = "md") {
  return `${e === "sm" ? R : e === "lg" ? C : e === "count" ? O : g} ${a(r)}`;
}
var p = "rounded-xl border px-3 py-3 text-sm", y = "font-semibold", I = "text-xs", L = {
  event: "neutral",
  review: "warning",
  qa: "error",
  success: "success"
};
function lr(r) {
  const e = L[r] ?? "neutral";
  return {
    container: `${p} ${a(e)}`,
    title: `${y} text-gray-900`,
    badge: t(e, "sm"),
    time: `${I} text-gray-500`
  };
}
var c = "rounded-xl border px-3 py-3 text-sm bg-white", N = "rounded-xl border p-5";
function ur(r) {
  return r === "blocker" ? {
    container: `${c} ${a("error")} text-gray-900`,
    badge: t("error", "sm")
  } : {
    container: `${c} ${a("warning")} text-gray-900`,
    badge: t("warning", "sm")
  };
}
function dr(r) {
  return `${N} ${a(r ? "error" : "neutral")}`;
}
function cr(r) {
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
function gr(r, e) {
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
var br = `${g} ${a("info")}`, _r = "font-semibold", Er = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", vr = "flex items-start justify-between gap-3", xr = "text-sm font-semibold text-gray-900", Tr = "text-xs text-gray-500 mt-1", fr = "mt-3 space-y-2", Ar = "flex items-center justify-between text-sm", mr = "text-gray-500", Rr = "font-medium text-gray-900", Cr = "mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100", Or = "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", pr = "min-w-full border-separate border-spacing-0", yr = "sticky top-0 z-20 bg-white", Ir = "sticky left-0 z-10 bg-white", Lr = "sticky left-0 z-30 bg-white", Nr = "border-b border-gray-200 px-3 py-3 align-top";
function Sr(r, e) {
  const b = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', o = () => Array.from(r.querySelectorAll(b)), i = (s) => {
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
function S(r) {
  const e = r.tagName.toLowerCase();
  return e === "input" || e === "select" || e === "textarea" || e === "button" ? !0 : e === "a" ? r.hasAttribute("href") : r.isContentEditable;
}
function wr(r) {
  r.querySelectorAll("[data-field-input]").forEach((e) => {
    if (S(e)) {
      e.removeAttribute("tabindex");
      return;
    }
    e.setAttribute("tabindex", "0");
  });
}
var Dr = "iconoir:check", Mr = "iconoir:refresh-double", hr = "iconoir:copy", Br = "iconoir:nav-arrow-right", Ur = "iconoir:nav-arrow-down", Gr = "iconoir:warning-triangle", Pr = "iconoir:info-circle", kr = "iconoir:clock", Yr = "iconoir:prohibition", Hr = "iconoir:globe", $r = "iconoir:page", Fr = "iconoir:xmark";
export {
  Rr as $,
  rr as A,
  Lr as B,
  j as C,
  z as D,
  J as E,
  K as F,
  Er as G,
  yr as H,
  sr as I,
  vr as J,
  Cr as K,
  ar as L,
  _r as M,
  W as N,
  Z as O,
  V as P,
  xr as Q,
  tr as R,
  B as S,
  Q as T,
  Ir as U,
  Or as V,
  pr as W,
  Ar as X,
  mr as Y,
  Tr as Z,
  U as _,
  kr as a,
  H as at,
  h as b,
  $r as c,
  t as ct,
  Mr as d,
  a as dt,
  or as et,
  Gr as f,
  ir as ft,
  M as g,
  $ as h,
  Sr as ht,
  Br as i,
  k as it,
  br as j,
  er as k,
  Hr as l,
  ur as lt,
  F as m,
  wr as mt,
  Dr as n,
  P as nt,
  Fr as o,
  cr as ot,
  X as p,
  lr as pt,
  fr as q,
  Ur as r,
  Y as rt,
  hr as s,
  gr as st,
  Yr as t,
  nr as tt,
  Pr as u,
  dr as ut,
  G as v,
  q as w,
  D as x,
  w as y,
  Nr as z
};

//# sourceMappingURL=translation-shared-CdZJJA93.js.map
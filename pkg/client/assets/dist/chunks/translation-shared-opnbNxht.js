import { i as g, t as v } from "./status-vocabulary-Bdx_bn1-.js";
var M = "btn btn-primary", h = "btn btn-secondary", B = "btn btn-danger", U = "btn btn-primary btn-sm", G = "btn btn-secondary btn-sm", P = "btn btn-danger btn-sm", Y = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", H = "rounded-xl", $ = "text-gray-500", k = "text-gray-900", F = "border-gray-200", X = "bg-white", K = "bg-gray-50", j = "text-3xl font-bold text-admin-dark", W = "text-xs font-semibold uppercase tracking-wider text-gray-500", V = "text-sm text-gray-500 mt-1", Q = "bg-white border border-gray-200 rounded-xl", q = "bg-white border border-gray-200 rounded-xl shadow-sm", z = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", J = "text-lg font-semibold text-gray-900", Z = "text-sm text-gray-500 mt-2", tt = "rounded-xl border border-rose-200 bg-rose-50 p-6", rt = "text-lg font-semibold text-rose-800", et = "text-sm text-rose-700 mt-2", at = "rounded-xl border border-gray-200 bg-white p-8 text-center", st = "w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white", nt = "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500", ot = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", it = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", _ = "bg-[var(--translation-status-success-bg)] text-[var(--translation-status-success-text)] border-[var(--translation-status-success-border)]", T = "bg-[var(--translation-status-warning-bg)] text-[var(--translation-status-warning-text)] border-[var(--translation-status-warning-border)]", x = "bg-[var(--translation-status-error-bg)] text-[var(--translation-status-error-text)] border-[var(--translation-status-error-border)]", f = "bg-[var(--translation-status-info-bg)] text-[var(--translation-status-info-text)] border-[var(--translation-status-info-border)]", A = "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]", R = "bg-[var(--translation-status-purple-bg)] text-[var(--translation-status-purple-text)] border-[var(--translation-status-purple-border)]", O = {
  success: _,
  warning: T,
  error: x,
  info: f,
  neutral: A,
  purple: R
};
function a(t) {
  return O[t.toLowerCase()] ?? "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]";
}
function lt(t) {
  return a(g(t));
}
var c = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", m = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider", C = "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium", y = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
function e(t, r = "md") {
  return `${r === "sm" ? m : r === "lg" ? C : r === "count" ? y : c} ${a(t)}`;
}
var I = "rounded-xl border px-3 py-3 text-sm", p = "font-semibold", S = "text-xs", N = {
  event: "neutral",
  review: "warning",
  qa: "error",
  success: "success"
};
function ut(t) {
  const r = N[t] ?? "neutral";
  return {
    container: `${I} ${a(r)}`,
    title: `${p} text-gray-900`,
    badge: e(r, "sm"),
    time: `${S} text-gray-500`
  };
}
var b = "rounded-xl border px-3 py-3 text-sm bg-white", L = "rounded-xl border p-5";
function dt(t) {
  return t === "blocker" ? {
    container: `${b} ${a("error")} text-gray-900`,
    badge: e("error", "sm")
  } : {
    container: `${b} ${a("warning")} text-gray-900`,
    badge: e("warning", "sm")
  };
}
function bt(t) {
  return `${L} ${a(t ? "error" : "neutral")}`;
}
function ct(t) {
  switch (t) {
    case "conflict":
      return e("error");
    case "saving":
      return e("warning");
    case "saved":
      return e("success");
    case "dirty":
      return e("neutral");
    default:
      return e("neutral");
  }
}
function Et(t, r) {
  switch (t) {
    case "conflict":
      return "Conflict detected";
    case "saving":
      return "Autosaving draft…";
    case "saved":
      return r || "Draft saved automatically";
    case "dirty":
      return "Unsaved changes";
    default:
      return "No pending changes";
  }
}
var gt = `${c} ${a("info")}`, vt = "font-semibold", _t = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", Tt = "flex items-start justify-between gap-3", xt = "text-sm font-semibold text-gray-900", ft = "text-xs text-gray-500 mt-1", At = "mt-3 space-y-2", Rt = "flex items-center justify-between text-sm", Ot = "text-gray-500", mt = "font-medium text-gray-900", Ct = "mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100", yt = "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", It = "min-w-full border-separate border-spacing-0", pt = "sticky top-0 z-20 bg-white", St = "sticky left-0 z-10 bg-white", Nt = "sticky left-0 z-30 bg-white", Lt = "border-b border-gray-200 px-3 py-3 align-top";
function wt(t, r) {
  const E = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', o = () => Array.from(t.querySelectorAll(E)), i = (s) => {
    if (s.key === "Escape") {
      s.preventDefault(), r?.();
      return;
    }
    if (s.key === "Tab") {
      const n = o();
      if (n.length === 0) return;
      const u = n[0], d = n[n.length - 1];
      s.shiftKey && document.activeElement === u ? (s.preventDefault(), d.focus()) : !s.shiftKey && document.activeElement === d && (s.preventDefault(), u.focus());
    }
  };
  t.addEventListener("keydown", i);
  const l = o();
  return l.length > 0 && l[0].focus(), () => {
    t.removeEventListener("keydown", i);
  };
}
function w(t) {
  const r = t.tagName.toLowerCase();
  return r === "input" || r === "select" || r === "textarea" || r === "button" ? !0 : r === "a" ? t.hasAttribute("href") : t.isContentEditable;
}
function Dt(t) {
  t.querySelectorAll("[data-field-input]").forEach((r) => {
    if (w(r)) {
      r.removeAttribute("tabindex");
      return;
    }
    r.setAttribute("tabindex", "0");
  });
}
var Mt = "iconoir:check", ht = "iconoir:refresh-double", Bt = "iconoir:copy", Ut = "iconoir:nav-arrow-right", Gt = "iconoir:nav-arrow-down", Pt = "iconoir:warning-triangle", Yt = "iconoir:info-circle", Ht = "iconoir:clock", $t = "iconoir:prohibition", kt = "iconoir:globe", Ft = "iconoir:page", Xt = "iconoir:xmark", Kt = Object.fromEntries(Object.entries(v).map(([t, r]) => [t, `iconoir:${r.icon}`]));
export {
  mt as $,
  rt as A,
  Nt as B,
  Q as C,
  J as D,
  Z as E,
  j as F,
  _t as G,
  pt as H,
  nt as I,
  Tt as J,
  Ct as K,
  st as L,
  vt as M,
  V as N,
  tt as O,
  W as P,
  xt as Q,
  at as R,
  G as S,
  z as T,
  St as U,
  yt as V,
  It as W,
  Rt as X,
  Ot as Y,
  ft as Z,
  P as _,
  Ht as a,
  ct as at,
  U as b,
  Ft as c,
  dt as ct,
  ht as d,
  lt as dt,
  it as et,
  Pt as f,
  ut as ft,
  B as g,
  F as h,
  Ut as i,
  $ as it,
  gt as j,
  et as k,
  kt as l,
  bt as lt,
  X as m,
  wt as mt,
  Mt as n,
  H as nt,
  Xt as o,
  Et as ot,
  K as p,
  Dt as pt,
  At as q,
  Gt as r,
  k as rt,
  Bt as s,
  e as st,
  $t as t,
  ot as tt,
  Yt as u,
  a as ut,
  Y as v,
  q as w,
  h as x,
  M as y,
  Lt as z
};

//# sourceMappingURL=translation-shared-opnbNxht.js.map
import { i as _, t as x } from "./status-vocabulary-DrEqqUD1.js";
var B = "btn btn-primary", U = "btn btn-secondary", G = "btn btn-danger", P = "btn btn-primary btn-sm", H = "btn btn-secondary btn-sm", Y = "btn btn-danger btn-sm", k = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", $ = "rounded-xl", F = "text-gray-500", X = "text-gray-900", K = "border-gray-200", j = "bg-white", W = "bg-gray-50", V = "text-3xl font-bold text-admin-dark", Q = "text-xs font-semibold uppercase tracking-wider text-gray-500", q = "text-sm text-gray-500 mt-1", z = "bg-white border border-gray-200 rounded-xl", J = "bg-white border border-gray-200 rounded-xl shadow-sm", Z = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", tt = "text-lg font-semibold text-gray-900", rt = "text-sm text-gray-500 mt-2", et = "rounded-xl border border-rose-200 bg-rose-50 p-6", at = "text-lg font-semibold text-rose-800", st = "text-sm text-rose-700 mt-2", nt = "rounded-xl border border-gray-200 bg-white p-8 text-center", ot = "w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white", it = "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500", ut = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", lt = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", T = "bg-[var(--translation-status-success-bg)] text-[var(--translation-status-success-text)] border-[var(--translation-status-success-border)]", f = "bg-[var(--translation-status-warning-bg)] text-[var(--translation-status-warning-text)] border-[var(--translation-status-warning-border)]", A = "bg-[var(--translation-status-error-bg)] text-[var(--translation-status-error-text)] border-[var(--translation-status-error-border)]", R = "bg-[var(--translation-status-info-bg)] text-[var(--translation-status-info-text)] border-[var(--translation-status-info-border)]", O = "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]", m = "bg-[var(--translation-status-purple-bg)] text-[var(--translation-status-purple-text)] border-[var(--translation-status-purple-border)]", C = {
  success: T,
  warning: f,
  error: A,
  info: R,
  neutral: O,
  purple: m
};
function s(t) {
  return C[t.toLowerCase()] ?? "bg-[var(--translation-status-neutral-bg)] text-[var(--translation-status-neutral-text)] border-[var(--translation-status-neutral-border)]";
}
function dt(t) {
  return s(_(t));
}
var v = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", y = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider", I = "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium", p = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
function a(t, r = "md") {
  return `${r === "sm" ? y : r === "lg" ? I : r === "count" ? p : v} ${s(t)}`;
}
var S = "rounded-xl border px-3 py-3 text-sm", N = "font-semibold", L = "text-xs", w = {
  event: "neutral",
  review: "warning",
  qa: "error",
  success: "success"
};
function ct(t) {
  const r = w[t] ?? "neutral", n = s(r);
  return {
    container: `${S} ${n}`,
    title: `${N} text-gray-900`,
    badge: a(r, "sm"),
    time: `${L} text-gray-500`
  };
}
var E = "rounded-xl border px-3 py-3 text-sm bg-white", D = "rounded-xl border p-5";
function bt(t) {
  return t === "blocker" ? {
    container: `${E} ${s("error")} text-gray-900`,
    badge: a("error", "sm")
  } : {
    container: `${E} ${s("warning")} text-gray-900`,
    badge: a("warning", "sm")
  };
}
function Et(t) {
  return `${D} ${s(t ? "error" : "neutral")}`;
}
function vt(t) {
  switch (t) {
    case "conflict":
      return a("error");
    case "saving":
      return a("warning");
    case "saved":
      return a("success");
    case "dirty":
      return a("neutral");
    default:
      return a("neutral");
  }
}
function gt(t, r) {
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
var _t = `${v} ${s("info")}`, xt = "font-semibold", Tt = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", ft = "flex items-start justify-between gap-3", At = "text-sm font-semibold text-gray-900", Rt = "text-xs text-gray-500 mt-1", Ot = "mt-3 space-y-2", mt = "flex items-center justify-between text-sm", Ct = "text-gray-500", yt = "font-medium text-gray-900", It = "mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100", pt = "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", St = "min-w-full border-separate border-spacing-0", Nt = "sticky top-0 z-20 bg-white", Lt = "sticky left-0 z-10 bg-white", wt = "sticky left-0 z-30 bg-white", Dt = "border-b border-gray-200 px-3 py-3 align-top";
function Mt(t, r) {
  const n = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let i = !1;
  const g = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', u = () => Array.from(t.querySelectorAll(g)), l = (e) => {
    if (e.key === "Escape") {
      e.preventDefault(), r?.();
      return;
    }
    if (e.key === "Tab") {
      const o = u();
      if (o.length === 0) {
        e.preventDefault(), t.focus();
        return;
      }
      const c = o[0], b = o[o.length - 1];
      e.shiftKey && document.activeElement === c ? (e.preventDefault(), b.focus()) : !e.shiftKey && document.activeElement === b && (e.preventDefault(), c.focus());
    }
  };
  t.addEventListener("keydown", l);
  const d = u();
  return d.length > 0 ? d[0].focus() : (t.hasAttribute("tabindex") || (t.setAttribute("tabindex", "-1"), i = !0), t.focus()), () => {
    t.removeEventListener("keydown", l), i && t.removeAttribute("tabindex"), n?.isConnected && n.focus();
  };
}
function M(t) {
  const r = t.tagName.toLowerCase();
  return r === "input" || r === "select" || r === "textarea" || r === "button" ? !0 : r === "a" ? t.hasAttribute("href") : t.isContentEditable;
}
function ht(t) {
  t.querySelectorAll("[data-field-input]").forEach((r) => {
    if (M(r)) {
      r.removeAttribute("tabindex");
      return;
    }
    r.setAttribute("tabindex", "0");
  });
}
var Bt = "iconoir:check", Ut = "iconoir:refresh-double", Gt = "iconoir:copy", Pt = "iconoir:nav-arrow-right", Ht = "iconoir:nav-arrow-down", Yt = "iconoir:warning-triangle", kt = "iconoir:info-circle", $t = "iconoir:clock", Ft = "iconoir:prohibition", Xt = "iconoir:globe", Kt = "iconoir:page", jt = "iconoir:xmark", Wt = Object.fromEntries(Object.entries(x).map(([t, r]) => [t, `iconoir:${r.icon}`]));
export {
  yt as $,
  at as A,
  wt as B,
  z as C,
  tt as D,
  rt as E,
  V as F,
  Tt as G,
  Nt as H,
  it as I,
  ft as J,
  It as K,
  ot as L,
  xt as M,
  q as N,
  et as O,
  Q as P,
  At as Q,
  nt as R,
  H as S,
  Z as T,
  Lt as U,
  pt as V,
  St as W,
  mt as X,
  Ct as Y,
  Rt as Z,
  Y as _,
  $t as a,
  vt as at,
  P as b,
  Kt as c,
  bt as ct,
  Ut as d,
  dt,
  lt as et,
  Yt as f,
  ct as ft,
  G as g,
  K as h,
  Pt as i,
  F as it,
  _t as j,
  st as k,
  Xt as l,
  Et as lt,
  j as m,
  Mt as mt,
  Bt as n,
  $ as nt,
  jt as o,
  gt as ot,
  W as p,
  ht as pt,
  Ot as q,
  Ht as r,
  X as rt,
  Gt as s,
  a as st,
  Ft as t,
  ut as tt,
  kt as u,
  s as ut,
  k as v,
  J as w,
  U as x,
  B as y,
  Dt as z
};

//# sourceMappingURL=translation-shared-CAzSmGhq.js.map
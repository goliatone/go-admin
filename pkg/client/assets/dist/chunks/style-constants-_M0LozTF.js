const l = "btn btn-primary", E = "btn btn-secondary", u = "btn btn-danger", x = "btn btn-primary btn-sm", T = "btn btn-secondary btn-sm", _ = "btn btn-danger btn-sm", f = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", g = "text-3xl font-bold text-admin-dark", A = "text-xs font-semibold uppercase tracking-wider text-gray-500", R = "text-sm text-gray-500 mt-1", y = "bg-white border border-gray-200 rounded-xl", m = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", p = "text-lg font-semibold text-gray-900", L = "text-sm text-gray-500 mt-2", I = "rounded-xl border border-rose-200 bg-rose-50 p-6", D = "text-lg font-semibold text-rose-800", O = "text-sm text-rose-700 mt-2", M = "rounded-xl border border-gray-200 bg-white p-8 text-center", h = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", w = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", C = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", N = "flex items-start justify-between gap-3", B = "text-sm font-semibold text-gray-900", S = "text-xs text-gray-500 mt-1", k = "mt-3 space-y-2", Y = "flex items-center justify-between text-sm", X = "text-gray-500", v = "font-medium text-gray-900", H = "mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100", P = "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", G = "min-w-full border-separate border-spacing-0", j = "sticky top-0 z-20 bg-white", z = "sticky left-0 z-10 bg-white", F = "sticky left-0 z-30 bg-white", K = "border-b border-gray-200 px-3 py-3 align-top";
function q(t, e) {
  const r = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', o = () => Array.from(t.querySelectorAll(r)), a = (s) => {
    if (s.key === "Escape") {
      s.preventDefault(), e?.();
      return;
    }
    if (s.key === "Tab") {
      const n = o();
      if (n.length === 0) return;
      const i = n[0], b = n[n.length - 1];
      s.shiftKey && document.activeElement === i ? (s.preventDefault(), b.focus()) : !s.shiftKey && document.activeElement === b && (s.preventDefault(), i.focus());
    }
  };
  t.addEventListener("keydown", a);
  const c = o();
  return c.length > 0 && c[0].focus(), () => {
    t.removeEventListener("keydown", a);
  };
}
function d(t) {
  const e = t.tagName.toLowerCase();
  return e === "input" || e === "select" || e === "textarea" || e === "button" ? !0 : e === "a" ? t.hasAttribute("href") : t.isContentEditable;
}
function U(t) {
  t.querySelectorAll("[data-field-input]").forEach((r) => {
    if (d(r)) {
      r.removeAttribute("tabindex");
      return;
    }
    r.setAttribute("tabindex", "0");
  });
}
export {
  k as A,
  l as B,
  y as C,
  Y as D,
  m as E,
  X as F,
  v as G,
  A as H,
  H as I,
  M as L,
  h as M,
  g as a,
  p as b,
  L as c,
  I as d,
  D as e,
  O as f,
  E as g,
  w as h,
  f as i,
  R as j,
  u as k,
  T as l,
  P as m,
  G as n,
  j as o,
  F as p,
  z as q,
  K as r,
  U as s,
  q as t,
  x as u,
  _ as v,
  C as w,
  N as x,
  B as y,
  S as z
};
//# sourceMappingURL=style-constants-_M0LozTF.js.map

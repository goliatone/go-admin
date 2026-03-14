const A = "btn btn-primary", h = "btn btn-secondary", y = "btn btn-danger", R = "btn btn-primary btn-sm", L = "btn btn-secondary btn-sm", I = "btn btn-danger btn-sm", D = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", f = "text-gray-500", T = "text-admin-dark", M = "text-3xl font-bold text-admin-dark", B = "text-xs font-semibold uppercase tracking-wider text-gray-500", O = "text-sm text-gray-500 mt-1", w = "bg-white border border-gray-200 rounded-xl", C = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", N = "text-lg font-semibold text-gray-900", $ = "text-sm text-gray-500 mt-2", S = "rounded-xl border border-rose-200 bg-rose-50 p-6", k = "text-lg font-semibold text-rose-800", v = "text-sm text-rose-700 mt-2", H = "rounded-xl border border-gray-200 bg-white p-8 text-center", X = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", Y = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", F = "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", P = "flex items-start justify-between gap-3", j = "text-sm font-semibold text-gray-900", G = "text-xs text-gray-500 mt-1", q = "mt-3 space-y-2", z = "flex items-center justify-between text-sm", K = "text-gray-500", Q = "font-medium text-gray-900", U = "mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100", V = "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", W = "min-w-full border-separate border-spacing-0", J = "sticky top-0 z-20 bg-white", Z = "sticky left-0 z-10 bg-white", tt = "sticky left-0 z-30 bg-white", et = "border-b border-gray-200 px-3 py-3 align-top";
function rt(t, e) {
  const r = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', o = () => Array.from(t.querySelectorAll(r)), l = (n) => {
    if (n.key === "Escape") {
      n.preventDefault(), e?.();
      return;
    }
    if (n.key === "Tab") {
      const s = o();
      if (s.length === 0) return;
      const a = s[0], i = s[s.length - 1];
      n.shiftKey && document.activeElement === a ? (n.preventDefault(), i.focus()) : !n.shiftKey && document.activeElement === i && (n.preventDefault(), a.focus());
    }
  };
  t.addEventListener("keydown", l);
  const c = o();
  return c.length > 0 && c[0].focus(), () => {
    t.removeEventListener("keydown", l);
  };
}
function g(t) {
  const e = t.tagName.toLowerCase();
  return e === "input" || e === "select" || e === "textarea" || e === "button" ? !0 : e === "a" ? t.hasAttribute("href") : t.isContentEditable;
}
function nt(t) {
  t.querySelectorAll("[data-field-input]").forEach((r) => {
    if (g(r)) {
      r.removeAttribute("tabindex");
      return;
    }
    r.setAttribute("tabindex", "0");
  });
}
function m(t) {
  const e = document.createElement("div");
  return e.textContent = t, e.innerHTML;
}
function u(t) {
  return t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const p = `
<svg class="w-4 h-4 ${f} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
</svg>
`.trim();
function _(t, e) {
  const r = t.icon ? `<i class="${u(t.icon)} text-sm opacity-70"></i>` : "";
  return t.current || e || !t.href ? `
      <li class="flex items-center">
        <span
          class="flex items-center gap-1.5 text-sm font-medium ${T}"
          ${t.current ? 'aria-current="page"' : ""}
        >
          ${r}
          ${m(t.label)}
        </span>
      </li>
    `.trim() : `
    <li class="flex items-center">
      <a
        href="${u(t.href)}"
        class="flex items-center gap-1.5 text-sm font-medium ${f} hover:text-gray-700 transition-colors"
      >
        ${r}
        ${m(t.label)}
      </a>
    </li>
  `.trim();
}
function st(t, e = {}) {
  const {
    className: r = "",
    separator: o = p,
    showHome: l = !1,
    homeHref: c = "/admin",
    homeIcon: n = "iconoir-home"
  } = e;
  if (t.length === 0)
    return "";
  const s = l ? { label: "Home", href: c, icon: n } : null, a = s ? [s, ...t] : t, i = a.map((E, d) => {
    const x = d === a.length - 1, b = _(E, x);
    return d > 0 ? `
          <li class="flex items-center" aria-hidden="true">
            ${o}
          </li>
          ${b}
        `.trim() : b;
  }).join(`
`);
  return `
    <nav aria-label="Breadcrumb" class="translation-breadcrumb ${u(r)}">
      <ol class="flex items-center gap-2 flex-wrap">
        ${i}
      </ol>
    </nav>
  `.trim();
}
function at(t = "/admin") {
  return [{ label: "Translations", current: !0 }];
}
function ot(t = "/admin") {
  return [
    { label: "Translations", href: `${t}/translations` },
    { label: "Queue", current: !0 }
  ];
}
function lt(t, e = "/admin") {
  const r = t.length > 12 ? `${t.slice(0, 12)}...` : t;
  return [
    { label: "Translations", href: `${e}/translations` },
    { label: "Queue", href: `${e}/translations/queue` },
    { label: `Assignment ${r}`, current: !0 }
  ];
}
function ct(t, e = "/admin") {
  const r = t.length > 30 ? `${t.slice(0, 30)}...` : t;
  return [
    { label: "Translations", href: `${e}/translations` },
    { label: "Families", href: `${e}/translations/families` },
    { label: r, current: !0 }
  ];
}
function it(t = "/admin") {
  return [
    { label: "Translations", href: `${t}/translations` },
    { label: "Matrix", current: !0 }
  ];
}
export {
  I as A,
  A as B,
  w as C,
  F as D,
  C as E,
  P as F,
  j as G,
  B as H,
  G as I,
  q as J,
  z as K,
  H as L,
  X as M,
  K as N,
  Q as O,
  U as P,
  ot as Q,
  M as a,
  ct as b,
  N as c,
  $ as d,
  S as e,
  k as f,
  v as g,
  h,
  Y as i,
  D as j,
  at as k,
  O as l,
  y as m,
  lt as n,
  L as o,
  it as p,
  V as q,
  st as r,
  nt as s,
  rt as t,
  W as u,
  J as v,
  tt as w,
  Z as x,
  et as y,
  R as z
};
//# sourceMappingURL=breadcrumb-BXeageNv.js.map

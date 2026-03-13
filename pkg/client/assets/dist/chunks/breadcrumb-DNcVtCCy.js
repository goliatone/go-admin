const h = "btn btn-primary", y = "btn btn-secondary", A = "btn btn-danger", _ = "btn btn-primary btn-sm", R = "btn btn-secondary btn-sm", $ = "btn btn-danger btn-sm", S = "inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors", f = "text-gray-500", E = "text-admin-dark", D = "text-3xl font-bold text-admin-dark", B = "text-xs font-semibold uppercase tracking-wider text-gray-500", M = "text-sm text-gray-500 mt-1", N = "bg-white border border-gray-200 rounded-xl", w = "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center", L = "text-lg font-semibold text-gray-900", O = "text-sm text-gray-500 mt-2", k = "rounded-xl border border-rose-200 bg-rose-50 p-6", v = "text-lg font-semibold text-rose-800", H = "text-sm text-rose-700 mt-2", I = "rounded-xl border border-gray-200 bg-white p-8 text-center", C = "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4", Y = "w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl";
function P(e, t) {
  const r = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', a = () => Array.from(e.querySelectorAll(r)), o = (n) => {
    if (n.key === "Escape") {
      n.preventDefault(), t?.();
      return;
    }
    if (n.key === "Tab") {
      const s = a();
      if (s.length === 0) return;
      const l = s[0], i = s[s.length - 1];
      n.shiftKey && document.activeElement === l ? (n.preventDefault(), i.focus()) : !n.shiftKey && document.activeElement === i && (n.preventDefault(), l.focus());
    }
  };
  e.addEventListener("keydown", o);
  const c = a();
  return c.length > 0 && c[0].focus(), () => {
    e.removeEventListener("keydown", o);
  };
}
function F(e, t = 1) {
  e.querySelectorAll("[data-field-input]").forEach((a, o) => {
    a.setAttribute("tabindex", String(t + o));
  });
}
function m(e) {
  const t = document.createElement("div");
  return t.textContent = e, t.innerHTML;
}
function u(e) {
  return e.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const g = `
<svg class="w-4 h-4 ${f} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
</svg>
`.trim();
function p(e, t) {
  const r = e.icon ? `<i class="${u(e.icon)} text-sm opacity-70"></i>` : "";
  return e.current || t || !e.href ? `
      <li class="flex items-center">
        <span
          class="flex items-center gap-1.5 text-sm font-medium ${E}"
          ${e.current ? 'aria-current="page"' : ""}
        >
          ${r}
          ${m(e.label)}
        </span>
      </li>
    `.trim() : `
    <li class="flex items-center">
      <a
        href="${u(e.href)}"
        class="flex items-center gap-1.5 text-sm font-medium ${f} hover:text-gray-700 transition-colors"
      >
        ${r}
        ${m(e.label)}
      </a>
    </li>
  `.trim();
}
function j(e, t = {}) {
  const {
    className: r = "",
    separator: a = g,
    showHome: o = !1,
    homeHref: c = "/admin",
    homeIcon: n = "iconoir-home"
  } = t;
  if (e.length === 0)
    return "";
  const s = o ? { label: "Home", href: c, icon: n } : null, l = s ? [s, ...e] : e, i = l.map((T, d) => {
    const x = d === l.length - 1, b = p(T, x);
    return d > 0 ? `
          <li class="flex items-center" aria-hidden="true">
            ${a}
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
function q(e = "/admin") {
  return [{ label: "Translations", current: !0 }];
}
function G(e = "/admin") {
  return [
    { label: "Translations", href: `${e}/translations` },
    { label: "Queue", current: !0 }
  ];
}
function X(e, t = "/admin") {
  const r = e.length > 12 ? `${e.slice(0, 12)}...` : e;
  return [
    { label: "Translations", href: `${t}/translations` },
    { label: "Queue", href: `${t}/translations/queue` },
    { label: `Assignment ${r}`, current: !0 }
  ];
}
function K(e, t = "/admin") {
  const r = e.length > 30 ? `${e.slice(0, 30)}...` : e;
  return [
    { label: "Translations", href: `${t}/translations` },
    { label: "Families", href: `${t}/translations/families` },
    { label: r, current: !0 }
  ];
}
function Q(e = "/admin") {
  return [
    { label: "Translations", href: `${e}/translations` },
    { label: "Matrix", current: !0 }
  ];
}
export {
  h as B,
  N as C,
  w as E,
  B as H,
  I as L,
  C as M,
  D as a,
  K as b,
  L as c,
  O as d,
  k as e,
  v as f,
  H as g,
  y as h,
  Y as i,
  S as j,
  q as k,
  M as l,
  A as m,
  X as n,
  R as o,
  Q as p,
  _ as q,
  j as r,
  F as s,
  P as t,
  $ as u,
  G as v
};
//# sourceMappingURL=breadcrumb-DNcVtCCy.js.map

function s(t, n = document) {
  try {
    return n.querySelector(t);
  } catch {
    return null;
  }
}
function p(t, n = document) {
  try {
    return Array.from(n.querySelectorAll(t));
  } catch {
    return [];
  }
}
function g(t) {
  return document.getElementById(t);
}
function u(t, n, o) {
  const e = document.createElement(t);
  if (n)
    for (const [i, a] of Object.entries(n)) a !== void 0 && e.setAttribute(i, a);
  if (o) for (const i of o) typeof i == "string" ? e.appendChild(document.createTextNode(i)) : e.appendChild(i);
  return e;
}
function y(t, n, o, e) {
  return t.addEventListener(n, o, e), () => t.removeEventListener(n, o, e);
}
function v(t, n, o, e, i) {
  const a = (c) => {
    const r = c.target.closest(n);
    r && t.contains(r) && e.call(r, c, r);
  };
  return t.addEventListener(o, a, i), () => t.removeEventListener(o, a, i);
}
function L(t) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t, { once: !0 }) : t();
}
function d(t) {
  t && (t.classList.remove("hidden", "invisible"), t.style.display = "");
}
function f(t) {
  t && t.classList.add("hidden");
}
function m(t, n) {
  t && (n ?? t.classList.contains("hidden") ? d(t) : f(t));
}
function E(t, n, o) {
  t && (n ? (t.setAttribute("aria-busy", "true"), t.classList.add("opacity-50", "pointer-events-none"), (t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !0)) : (t.removeAttribute("aria-busy"), t.classList.remove("opacity-50", "pointer-events-none"), (t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !1)));
}
function l(t, n, o = document) {
  const e = s(`[data-esign-${t}]`, o);
  e && (e.textContent = String(n));
}
function b(t, n = document) {
  for (const [o, e] of Object.entries(t)) l(o, e, n);
}
function h(t = "[data-esign-page]", n = "data-esign-config") {
  const o = s(t);
  if (!o) return null;
  const e = o.getAttribute(n);
  if (e) try {
    return JSON.parse(e);
  } catch {
    console.warn("Failed to parse page config from attribute:", e);
  }
  const i = s('script[type="application/json"]', o);
  if (i?.textContent) try {
    return JSON.parse(i.textContent);
  } catch {
    console.warn("Failed to parse page config from script:", i.textContent);
  }
  return null;
}
function C(t, n = "polite") {
  const o = s(`[aria-live="${n}"]`) || (() => {
    const e = u("div", {
      "aria-live": n,
      "aria-atomic": "true",
      class: "sr-only"
    });
    return document.body.appendChild(e), e;
  })();
  o.textContent = "", requestAnimationFrame(() => {
    o.textContent = t;
  });
}
export {
  h as a,
  L as c,
  E as d,
  d as f,
  b as h,
  v as i,
  s as l,
  l as m,
  g as n,
  f as o,
  m as p,
  u as r,
  y as s,
  C as t,
  p as u
};

//# sourceMappingURL=dom-helpers-CDdChTSn.js.map
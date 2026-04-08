import { parseJSONValue as f, readJSONScriptValue as d, readJSONSelectorValue as u } from "../shared/json-parse.js";
function s(t, n = document) {
  try {
    return n.querySelector(t);
  } catch {
    return null;
  }
}
function E(t, n = document) {
  try {
    return Array.from(n.querySelectorAll(t));
  } catch {
    return [];
  }
}
function v(t) {
  return document.getElementById(t);
}
function l(t, n, e) {
  const o = document.createElement(t);
  if (n)
    for (const [r, i] of Object.entries(n)) i !== void 0 && o.setAttribute(r, i);
  if (e) for (const r of e) typeof r == "string" ? o.appendChild(document.createTextNode(r)) : o.appendChild(r);
  return o;
}
function b(t, n, e, o) {
  return t.addEventListener(n, e, o), () => t.removeEventListener(n, e, o);
}
function L(t, n, e, o, r) {
  const i = (c) => {
    const a = c.target.closest(n);
    a && t.contains(a) && o.call(a, c, a);
  };
  return t.addEventListener(e, i, r), () => t.removeEventListener(e, i, r);
}
function p(t) {
  t && (t.classList.remove("hidden", "invisible"), t.style.display = "");
}
function g(t) {
  t && t.classList.add("hidden");
}
function S(t, n) {
  t && (n ?? t.classList.contains("hidden") ? p(t) : g(t));
}
function C(t, n, e) {
  t && (n ? (t.setAttribute("aria-busy", "true"), t.classList.add("opacity-50", "pointer-events-none"), (t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !0)) : (t.removeAttribute("aria-busy"), t.classList.remove("opacity-50", "pointer-events-none"), (t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !1)));
}
function y(t, n, e = document) {
  const o = s(`[data-esign-${t}]`, e);
  o && (o.textContent = String(n));
}
function h(t, n = document) {
  for (const [e, o] of Object.entries(t)) y(e, o, n);
}
function x(t = "[data-esign-page]", n = "data-esign-config") {
  const e = s(t);
  if (!e) return null;
  const o = e.getAttribute(n);
  if (o) {
    const r = f(o, null, { onError: () => {
      console.warn("Failed to parse page config from attribute:", o);
    } });
    if (r) return r;
  }
  return u('script[type="application/json"]', null, {
    root: e,
    onError: () => {
      const r = s('script[type="application/json"]', e);
      r?.textContent && console.warn("Failed to parse page config from script:", r.textContent);
    }
  });
}
function A(t = "esign-page-config", n = "page config") {
  return d(t, null, { onError: (e) => {
    console.warn(`Failed to parse ${n}:`, e);
  } });
}
function T(t, n, e = document, o = t) {
  return u(`#${t}`, null, {
    root: e,
    onError: (r) => {
      console.warn(`Unable to parse ${o}`, r);
    }
  }) ?? n;
}
function O(t, n = "polite") {
  const e = s(`[aria-live="${n}"]`) || (() => {
    const o = l("div", {
      "aria-live": n,
      "aria-atomic": "true",
      class: "sr-only"
    });
    return document.body.appendChild(o), o;
  })();
  e.textContent = "", requestAnimationFrame(() => {
    e.textContent = t;
  });
}
export {
  T as a,
  g as c,
  E as d,
  C as f,
  h as g,
  y as h,
  L as i,
  b as l,
  S as m,
  v as n,
  x as o,
  p,
  l as r,
  A as s,
  O as t,
  s as u
};

//# sourceMappingURL=dom-helpers-PJrpTqcW.js.map
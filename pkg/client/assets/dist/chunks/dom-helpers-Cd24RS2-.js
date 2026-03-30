import { parseJSONValue as d, readJSONSelectorValue as u, readJSONScriptValue as f } from "../shared/json-parse.js";
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
function b(t) {
  return document.getElementById(t);
}
function l(t, n, e) {
  const o = document.createElement(t);
  if (n)
    for (const [r, a] of Object.entries(n))
      a !== void 0 && o.setAttribute(r, a);
  if (e)
    for (const r of e)
      typeof r == "string" ? o.appendChild(document.createTextNode(r)) : o.appendChild(r);
  return o;
}
function v(t, n, e, o) {
  return t.addEventListener(n, e, o), () => t.removeEventListener(n, e, o);
}
function h(t, n, e, o, r) {
  const a = (c) => {
    const i = c.target.closest(n);
    i && t.contains(i) && o.call(i, c, i);
  };
  return t.addEventListener(e, a, r), () => t.removeEventListener(e, a, r);
}
function p(t) {
  t && (t.classList.remove("hidden", "invisible"), t.style.display = "");
}
function g(t) {
  t && t.classList.add("hidden");
}
function L(t, n) {
  if (!t) return;
  n ?? t.classList.contains("hidden") ? p(t) : g(t);
}
function S(t, n, e) {
  t && (n ? (t.setAttribute("aria-busy", "true"), t.classList.add("opacity-50", "pointer-events-none"), (t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !0)) : (t.removeAttribute("aria-busy"), t.classList.remove("opacity-50", "pointer-events-none"), (t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !1)));
}
function y(t, n, e = document) {
  const o = s(`[data-esign-${t}]`, e);
  o && (o.textContent = String(n));
}
function C(t, n = document) {
  for (const [e, o] of Object.entries(t))
    y(e, o, n);
}
function x(t = "[data-esign-page]", n = "data-esign-config") {
  const e = s(t);
  if (!e) return null;
  const o = e.getAttribute(n);
  if (o) {
    const r = d(o, null, {
      onError: () => {
        console.warn("Failed to parse page config from attribute:", o);
      }
    });
    if (r)
      return r;
  }
  return u('script[type="application/json"]', null, {
    root: e,
    onError: () => {
      const r = s('script[type="application/json"]', e);
      r?.textContent && console.warn("Failed to parse page config from script:", r.textContent);
    }
  });
}
function w(t = "esign-page-config", n = "page config") {
  return f(t, null, {
    onError: (e) => {
      console.warn(`Failed to parse ${n}:`, e);
    }
  });
}
function A(t, n, e = document, o = t) {
  return u(`#${t}`, null, {
    root: e,
    onError: (a) => {
      console.warn(`Unable to parse ${o}`, a);
    }
  }) ?? n;
}
function T(t, n = "polite") {
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
  s as b,
  b as c,
  l as d,
  h as e,
  S as f,
  C as g,
  g as h,
  x as i,
  w as j,
  A as k,
  v as o,
  E as q,
  p as s,
  L as t,
  y as u
};
//# sourceMappingURL=dom-helpers-Cd24RS2-.js.map

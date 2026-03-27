function r(t, n = document) {
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
function u(t, n, e) {
  const o = document.createElement(t);
  if (n)
    for (const [i, a] of Object.entries(n))
      a !== void 0 && o.setAttribute(i, a);
  if (e)
    for (const i of e)
      typeof i == "string" ? o.appendChild(document.createTextNode(i)) : o.appendChild(i);
  return o;
}
function y(t, n, e, o) {
  return t.addEventListener(n, e, o), () => t.removeEventListener(n, e, o);
}
function h(t, n, e, o, i) {
  const a = (c) => {
    const s = c.target.closest(n);
    s && t.contains(s) && o.call(s, c, s);
  };
  return t.addEventListener(e, a, i), () => t.removeEventListener(e, a, i);
}
function d(t) {
  t && (t.classList.remove("hidden", "invisible"), t.style.display = "");
}
function f(t) {
  t && t.classList.add("hidden");
}
function v(t, n) {
  if (!t) return;
  n ?? t.classList.contains("hidden") ? d(t) : f(t);
}
function b(t, n, e) {
  t && (n ? (t.setAttribute("aria-busy", "true"), t.classList.add("opacity-50", "pointer-events-none"), (t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !0)) : (t.removeAttribute("aria-busy"), t.classList.remove("opacity-50", "pointer-events-none"), (t instanceof HTMLButtonElement || t instanceof HTMLInputElement) && (t.disabled = !1)));
}
function l(t, n, e = document) {
  const o = r(`[data-esign-${t}]`, e);
  o && (o.textContent = String(n));
}
function L(t, n = document) {
  for (const [e, o] of Object.entries(t))
    l(e, o, n);
}
function m(t = "[data-esign-page]", n = "data-esign-config") {
  const e = r(t);
  if (!e) return null;
  const o = e.getAttribute(n);
  if (o)
    try {
      return JSON.parse(o);
    } catch {
      console.warn("Failed to parse page config from attribute:", o);
    }
  const i = r(
    'script[type="application/json"]',
    e
  );
  if (i?.textContent)
    try {
      return JSON.parse(i.textContent);
    } catch {
      console.warn("Failed to parse page config from script:", i.textContent);
    }
  return null;
}
function E(t, n = "polite") {
  const e = r(`[aria-live="${n}"]`) || (() => {
    const o = u("div", {
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
  E as a,
  r as b,
  g as c,
  u as d,
  h as e,
  b as f,
  L as g,
  f as h,
  m as i,
  y as o,
  p as q,
  d as s,
  v as t,
  l as u
};
//# sourceMappingURL=dom-helpers-cltCUiC5.js.map

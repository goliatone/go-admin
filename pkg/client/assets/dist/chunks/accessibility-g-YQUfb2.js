function E(t) {
  const { container: e, selector: r, onSelect: i, onFocus: u, onEscape: p, wrap: d = !0, autoFocus: b = !1, keyHandlers: a = {} } = t;
  function c() {
    return Array.from(e.querySelectorAll(r));
  }
  function l(n) {
    const o = c();
    if (o.length === 0) return;
    let s = n;
    d ? s = (n % o.length + o.length) % o.length : s = Math.max(0, Math.min(n, o.length - 1)), o.forEach((g, h) => {
      g.setAttribute("tabindex", h === s ? "0" : "-1");
    });
    const f = o[s];
    f.focus(), u?.(f, s);
  }
  function m(n) {
    const o = c();
    if (o.length === 0) return;
    const s = n.target, f = o.indexOf(s);
    if (f !== -1) {
      if (a[n.key]) {
        a[n.key](n, s, f);
        return;
      }
      switch (n.key) {
        case "ArrowDown":
        case "ArrowRight":
          n.preventDefault(), l(f + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          n.preventDefault(), l(f - 1);
          break;
        case "Home":
          n.preventDefault(), l(0);
          break;
        case "End":
          n.preventDefault(), l(o.length - 1);
          break;
        case "Enter":
        case " ":
          n.preventDefault(), i?.(s, f);
          break;
        case "Escape":
          n.preventDefault(), p?.();
      }
    }
  }
  const y = c();
  return y.forEach((n, o) => {
    n.setAttribute("tabindex", o === 0 ? "0" : "-1"), n.hasAttribute("role") || n.setAttribute("role", "option");
  }), e.hasAttribute("role") || e.setAttribute("role", "listbox"), e.addEventListener("keydown", m), b && y.length > 0 && l(0), () => {
    e.removeEventListener("keydown", m);
  };
}
function x(t, e) {
  return E({
    container: t,
    selector: e,
    wrap: !0,
    onSelect: (r) => {
      r.click();
    }
  });
}
var v = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");
function w(t) {
  const { container: e, initialFocus: r, returnFocus: i, onEscape: u } = t, p = document.activeElement;
  function d() {
    return Array.from(e.querySelectorAll(v));
  }
  function b(a) {
    if (a.key === "Escape") {
      a.preventDefault(), u?.();
      return;
    }
    if (a.key !== "Tab") return;
    const c = d();
    if (c.length === 0) return;
    const l = c[0], m = c[c.length - 1];
    a.shiftKey ? document.activeElement === l && (a.preventDefault(), m.focus()) : document.activeElement === m && (a.preventDefault(), l.focus());
  }
  return (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (a) => (a(0), 0))(() => {
    r ? (typeof r == "string" ? e.querySelector(r) : r)?.focus() : d()[0]?.focus();
  }), e.addEventListener("keydown", b), e.hasAttribute("role") || e.setAttribute("role", "dialog"), e.setAttribute("aria-modal", "true"), () => {
    e.removeEventListener("keydown", b), e.removeAttribute("aria-modal"), (i || p)?.focus?.();
  };
}
function S(t) {
  const e = `services-live-region-${t}`;
  let r = document.getElementById(e);
  return r || (r = document.createElement("div"), r.id = e, r.setAttribute("aria-live", t), r.setAttribute("aria-atomic", "true"), r.setAttribute("role", "status"), r.className = "sr-only", Object.assign(r.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0"
  }), document.body.appendChild(r)), r;
}
function A(t, e = {}) {
  const { priority: r = "polite", clear: i = !0 } = e, u = S(r);
  i && (u.textContent = ""), setTimeout(() => {
    u.textContent = t;
  }, 100);
}
function D(t) {
  A(`Loading ${t}...`, { priority: "polite" });
}
function F(t) {
  A(t, { priority: "polite" });
}
function L(t) {
  A(`Error: ${t}`, { priority: "assertive" });
}
function I(t) {
  A(`Navigating to ${t}`, { priority: "polite" });
}
function C(t, e, r) {
  t.setAttribute("aria-expanded", String(r));
  const i = typeof e == "string" ? e : e.id;
  i && t.setAttribute("aria-controls", i);
}
function T(t, e) {
  t.setAttribute("aria-busy", String(e)), e ? t.setAttribute("aria-describedby", "loading-indicator") : t.removeAttribute("aria-describedby");
}
function $(t, e, r) {
  t.setAttribute("role", "status"), t.setAttribute("aria-label", `Status: ${r}`);
}
function q(t, e) {
  t.setAttribute("aria-sort", e), t.setAttribute("role", "columnheader");
}
function R(t, e, r = 100, i) {
  t.setAttribute("role", "progressbar"), t.setAttribute("aria-valuenow", String(e)), t.setAttribute("aria-valuemin", "0"), t.setAttribute("aria-valuemax", String(r)), i && t.setAttribute("aria-label", i);
}
function N(t, e = "Skip to main content") {
  const r = document.createElement("a");
  return r.href = `#${t}`, r.className = "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg", r.textContent = e, r;
}
function K(t, e = {}) {
  const { title: r, describedBy: i, onClose: u } = e;
  if (t.setAttribute("role", "dialog"), t.setAttribute("aria-modal", "true"), r) {
    const d = `dialog-title-${Date.now()}`, b = t.querySelector('h1, h2, h3, [role="heading"]');
    b && (b.id = d, t.setAttribute("aria-labelledby", d));
  }
  i && t.setAttribute("aria-describedby", i);
  const p = w({
    container: t,
    onEscape: u
  });
  return () => {
    p(), t.removeAttribute("aria-modal"), t.removeAttribute("aria-labelledby"), t.removeAttribute("aria-describedby");
  };
}
function k() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function M(t) {
  return k() ? 0 : t;
}
export {
  E as _,
  F as a,
  N as c,
  C as d,
  T as f,
  K as g,
  $ as h,
  I as i,
  M as l,
  q as m,
  L as n,
  A as o,
  R as p,
  D as r,
  w as s,
  v as t,
  k as u,
  x as v
};

//# sourceMappingURL=accessibility-g-YQUfb2.js.map
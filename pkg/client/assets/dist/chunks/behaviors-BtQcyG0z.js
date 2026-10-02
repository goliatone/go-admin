import { onReady as R } from "../shared/dom-ready.js";
import { a as h, c as D, i as k, n as C, o as w, r as I, s as B } from "./busy-D8dMtGI2.js";
var V = '[data-behavior~="navigation-busy"]', S = "[data-navigation-busy-trigger]", m = /* @__PURE__ */ new WeakMap(), d = /* @__PURE__ */ new WeakSet();
function N(t, e, n) {
  if (d.has(t)) return !0;
  const i = _(t.target, e);
  if (!i) return !1;
  const r = F(i, e);
  return !r || !P(i, t, n) ? !1 : g(r) ? (d.add(t), t.preventDefault(), !0) : (d.add(t), M(r, i), !0);
}
function U(t, e, n) {
  if (d.has(t)) return !0;
  const i = W(t.target, e);
  if (!i) return !1;
  const r = F(i, e);
  if (!r || t.defaultPrevented || i.matches("form[data-enhance-action]")) return !1;
  const o = z(t, i);
  return w(i, o) || !$(i, o) || !B(i, o) && typeof i.checkValidity == "function" && !i.checkValidity() ? !1 : g(r) ? (d.add(t), t.preventDefault(), !0) : (d.add(t), M(r, i, o), !0);
}
function g(t) {
  return !!t && (m.has(t) || t.dataset.navigationBusyActive === "true");
}
function x(t) {
  if (!t) return;
  const e = m.get(t);
  if (!e) {
    t.dataset.navigationBusyActive === "true" && delete t.dataset.navigationBusyActive;
    return;
  }
  e.rootBusy.reset(), e.formBusy?.reset(), v(t, "navigationBusyActive", e.active);
  for (const n of e.triggers)
    X(n.element, "aria-disabled", n.ariaDisabled), v(n.element, "navigationBusyTriggerActive", n.active);
  e.status && (e.status.element.hidden = e.status.hidden, e.status.labelTarget && (e.status.labelTarget.textContent = e.status.labelText)), m.delete(t);
}
function O(t = document) {
  const e = [];
  Q(t) && g(t) && e.push(t), t.querySelectorAll('[data-navigation-busy-active="true"]').forEach((n) => {
    e.push(n);
  });
  for (const n of Array.from(new Set(e))) x(n);
}
function M(t, e, n = null) {
  if (g(t)) return;
  const i = H(e) ? e : null, r = i && i !== t ? h(i, { submitter: n }) : null, o = h(t, i === t ? { submitter: n } : {
    controls: Array.from(t.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"]')),
    includeDescendantControls: !1
  }), l = q(t).map((s) => ({
    element: s,
    ariaDisabled: s.getAttribute("aria-disabled"),
    active: s.dataset.navigationBusyTriggerActive
  }));
  for (const s of l)
    s.element.setAttribute("aria-disabled", "true"), s.element === e && (s.element.dataset.navigationBusyTriggerActive = "true");
  const f = j(t), c = f?.querySelector("[data-navigation-busy-label-target]") ?? null, u = f ? {
    element: f,
    hidden: f.hidden,
    labelTarget: c,
    labelText: c?.textContent ?? null
  } : null;
  u && (u.labelTarget && (u.labelTarget.textContent = Y(t, e)), u.element.hidden = !1);
  const a = {
    root: t,
    active: t.dataset.navigationBusyActive,
    rootBusy: o,
    formBusy: r,
    triggers: l,
    status: u
  };
  t.dataset.navigationBusyActive = "true", m.set(t, a);
}
function _(t, e) {
  if (!J(t)) return null;
  const n = t.closest(`a[href]${S}`);
  return n && p(e, n) ? n : null;
}
function W(t, e) {
  return !H(t) || !t.matches("form[data-navigation-busy-trigger]") ? null : p(e, t) ? t : null;
}
function F(t, e) {
  const n = t.closest(V);
  return n && p(e, n) ? n : null;
}
function q(t) {
  const e = Array.from(t.querySelectorAll(S));
  return t.matches("[data-navigation-busy-trigger]") && e.unshift(t), e;
}
function P(t, e, n) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || t.hasAttribute("download") || t.hasAttribute("data-navigation-busy-skip") || D(t.ownerDocument, t.getAttribute("target"))) return !1;
  const i = t.getAttribute("href")?.trim() ?? "";
  if (!i || i.startsWith("#")) return !1;
  try {
    const r = n?.location?.href || t.ownerDocument.URL, o = new URL(i, r);
    if (o.protocol !== "http:" && o.protocol !== "https:") return !1;
    if (n?.location) {
      const l = new URL(n.location.href);
      if (o.origin === l.origin && o.pathname === l.pathname && o.search === l.search && (o.hash || l.hash)) return !1;
    }
  } catch {
    return !1;
  }
  return !0;
}
function $(t, e) {
  if (G(t, e) === "dialog") return !1;
  const n = K(t, e);
  return n !== null && (n.protocol === "http:" || n.protocol === "https:");
}
function G(t, e) {
  const n = e?.hasAttribute("formmethod") ? e.getAttribute("formmethod") : t.getAttribute("method"), i = String(n ?? "").trim().toLowerCase();
  return i === "post" || i === "dialog" ? i : "get";
}
function K(t, e) {
  const n = e?.hasAttribute("formaction") ? e.getAttribute("formaction") : t.getAttribute("action"), i = String(n ?? "").trim() || t.ownerDocument.URL;
  try {
    return new URL(i, t.ownerDocument.baseURI || t.ownerDocument.URL);
  } catch {
    return null;
  }
}
function Y(t, e) {
  return String(e.getAttribute("data-navigation-busy-label") || t.getAttribute("data-navigation-busy-label") || "Loading...").trim();
}
function j(t) {
  const e = t.getAttribute("data-navigation-busy-status-target")?.trim() ?? "";
  if (e) try {
    return t.ownerDocument.querySelector(e);
  } catch {
    return null;
  }
  return t.querySelector("[data-navigation-busy-status]");
}
function z(t, e) {
  const n = t.submitter;
  if (!n) return null;
  const i = e.ownerDocument.defaultView;
  return (i?.HTMLButtonElement && n instanceof i.HTMLButtonElement || i?.HTMLInputElement && n instanceof i.HTMLInputElement || typeof HTMLButtonElement < "u" && n instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && n instanceof HTMLInputElement) && n.form === e ? n : null;
}
function J(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.Element && t instanceof e.Element || typeof Element < "u" && t instanceof Element);
}
function Q(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLElement && t instanceof e.HTMLElement || typeof HTMLElement < "u" && t instanceof HTMLElement);
}
function H(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLFormElement && t instanceof e.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement);
}
function p(t, e) {
  return t === e || t.contains(e);
}
function X(t, e, n) {
  if (n === null) {
    t.removeAttribute(e);
    return;
  }
  t.setAttribute(e, n);
}
function v(t, e, n) {
  if (n === void 0) {
    delete t.dataset[e];
    return;
  }
  t.dataset[e] = n;
}
var Z = 'form[data-behavior~="submit-busy"], form[data-submit-loading-form]', L = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakSet();
function E(t = document, e = {}) {
  const n = L.get(t) ?? tt(t, e), i = et(n, e);
  return e.listenForFragments !== !1 && nt(n), i.controller;
}
function tt(t, e) {
  const n = rt(t), i = e.window ?? n.defaultView ?? window, r = (u) => {
    N(u, t, i);
  }, o = (u) => {
    if (U(u, t, i)) return;
    const a = at(u.target, n), s = a ? it(a, c.submitRules) : null;
    if (!a || !s || u.defaultPrevented || a.matches("form[data-enhance-action]") || T.has(u)) return;
    if (C(a)) {
      u.preventDefault();
      return;
    }
    const b = ot(u, a, n);
    !B(a, b) && typeof a.checkValidity == "function" && !a.checkValidity() || (T.add(u), h(a, {
      submitter: b,
      compatibilitySubmitLoading: s.compatibilitySubmitLoading || a.hasAttribute("data-submit-loading-form")
    }), w(a, b) && i?.setTimeout(() => {
      I(a);
    }, 0));
  }, l = () => {
    y(t);
  }, c = {
    root: t,
    doc: n,
    win: i,
    submitRules: [],
    fragmentListenerAttached: !1,
    handleClick: r,
    handleSubmit: o,
    handlePageShow: l,
    handleFragmentsApplied: (u) => {
      const a = u.detail;
      if (Array.isArray(a?.roots) && a.roots.length > 0) {
        a.roots.forEach((s) => A(c, s));
        return;
      }
      if (a?.root) {
        A(c, a.root);
        return;
      }
      c.submitRules.forEach((s) => {
        E(t, {
          submitBusySelector: s.selector,
          compatibilitySubmitLoading: s.compatibilitySubmitLoading,
          window: i ?? void 0,
          listenForFragments: !1
        });
      });
    }
  };
  return t.addEventListener("click", r), t.addEventListener("submit", o), i?.addEventListener("pageshow", l), L.set(t, c), c;
}
function et(t, e) {
  const n = e.submitBusySelector || Z, i = e.compatibilitySubmitLoading === !0, r = `${n}
${i ? "compat" : "standard"}`, o = t.submitRules.find((f) => f.key === r);
  if (o) return o;
  const l = {
    key: r,
    selector: n,
    compatibilitySubmitLoading: i,
    controller: {
      reset() {
        y(t.root);
      },
      destroy() {
        const f = t.submitRules.findIndex((c) => c.key === r);
        f >= 0 && t.submitRules.splice(f, 1), t.submitRules.length === 0 && (y(t.root), t.root.removeEventListener("click", t.handleClick), t.root.removeEventListener("submit", t.handleSubmit), t.win?.removeEventListener("pageshow", t.handlePageShow), t.doc.removeEventListener("go-admin:enhanced-fragments-applied", t.handleFragmentsApplied), L.delete(t.root));
      }
    }
  };
  return t.submitRules.push(l), l;
}
function nt(t) {
  t.fragmentListenerAttached || (t.doc.addEventListener("go-admin:enhanced-fragments-applied", t.handleFragmentsApplied), t.fragmentListenerAttached = !0);
}
function A(t, e) {
  t.submitRules.forEach((n) => {
    E(e, {
      submitBusySelector: n.selector,
      compatibilitySubmitLoading: n.compatibilitySubmitLoading,
      window: t.win ?? void 0,
      listenForFragments: !1
    });
  });
}
function it(t, e) {
  let n = null;
  for (const i of e)
    if (t.matches(i.selector)) {
      if (i.compatibilitySubmitLoading) return i;
      n = n ?? i;
    }
  return n;
}
function y(t = document) {
  O(t), k(t);
}
function lt(t = {}) {
  const e = t.root ?? document;
  let n = null;
  return R(() => {
    n = E(e, t);
  }), {
    reset() {
      n?.reset();
    },
    destroy() {
      n?.destroy();
    }
  };
}
function rt(t) {
  return t.nodeType === 9 ? t : t.ownerDocument || document;
}
function at(t, e) {
  const n = e.defaultView;
  return n?.HTMLFormElement && t instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement ? t : null;
}
function ot(t, e, n) {
  const i = t.submitter;
  if (!i) return null;
  const r = n.defaultView;
  return (r?.HTMLButtonElement && i instanceof r.HTMLButtonElement || r?.HTMLInputElement && i instanceof r.HTMLInputElement || typeof HTMLButtonElement < "u" && i instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && i instanceof HTMLInputElement) && i.form === e ? i : null;
}
export {
  S as a,
  O as c,
  V as i,
  E as n,
  g as o,
  y as r,
  x as s,
  lt as t
};

//# sourceMappingURL=behaviors-BtQcyG0z.js.map
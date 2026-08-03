import { onReady as G } from "../shared/dom-ready.js";
var d = "true", g = /* @__PURE__ */ new WeakMap();
function R(t) {
  return t ? g.has(t) || t.dataset.busy === "true" || t.dataset.submitLoadingActive === "true" || t.getAttribute("aria-busy") === "true" : !1;
}
function w(t, e = {}) {
  const n = g.get(t);
  if (n) return F(n);
  const i = {
    root: t,
    ariaBusy: t.getAttribute("aria-busy"),
    dataBusy: t.dataset.busy,
    dataLoading: t.dataset.loading,
    dataSubmitLoadingActive: t.dataset.submitLoadingActive,
    controls: [],
    labels: [],
    inputValues: [],
    spinners: [],
    generatedInputs: [],
    generatedSpinners: [],
    overrides: null
  };
  t.setAttribute("aria-busy", d), t.dataset.busy = d, (e.compatibilitySubmitLoading || t.hasAttribute("data-submit-loading-form")) && (t.dataset.loading = d, t.dataset.submitLoadingActive = d), y(t) && et(t, S(e.submitter), i);
  const a = j(t, e);
  for (const r of a)
    z(r, i), J(r, e, i);
  return g.set(t, i), F(i);
}
function v(t) {
  if (!t) return;
  const e = g.get(t);
  if (!e) {
    t.dataset.busy === "true" && (delete t.dataset.busy, t.removeAttribute("aria-busy")), (t.dataset.submitLoadingActive === "true" || t.dataset.loading === "true") && (delete t.dataset.loading, delete t.dataset.submitLoadingActive);
    return;
  }
  m(t, "aria-busy", e.ariaBusy), A(t, "busy", e.dataBusy), A(t, "loading", e.dataLoading), A(t, "submitLoadingActive", e.dataSubmitLoadingActive);
  for (const n of e.controls)
    n.control.disabled = n.disabled, m(n.control, "aria-label", n.ariaLabel);
  for (const n of e.labels) n.innerHTML !== void 0 ? n.element.innerHTML = n.innerHTML : n.element.textContent = n.textContent;
  for (const n of e.inputValues) n.input.value = n.value;
  for (const n of e.spinners) n.element.hidden = n.hidden;
  for (const n of e.generatedInputs) n.remove();
  for (const n of e.generatedSpinners) n.remove();
  e.overrides && y(t) && at(t, e.overrides), g.delete(t);
}
function W(t = document) {
  const e = P(t), n = [];
  I(t) && R(t) && n.push(t), t.querySelectorAll('[data-busy="true"], [data-submit-loading-active="true"], [aria-busy="true"]').forEach((i) => {
    I(i) && n.push(i);
  }), e.querySelectorAll('form[data-submit-loading-form][data-loading="true"]').forEach((i) => {
    (t.contains?.(i) || t === e) && n.push(i);
  });
  for (const i of Array.from(new Set(n))) v(i);
}
function N(t, e) {
  const n = S(e);
  return t.noValidate || n?.hasAttribute("formnovalidate") === !0 || n?.formNoValidate === !0;
}
function k(t, e) {
  return U(t.ownerDocument, nt(t, S(e)));
}
function U(t, e) {
  const n = it(t, e).toLowerCase();
  return n !== "" && n !== "_self";
}
function F(t) {
  return {
    root: t.root,
    reset() {
      v(t.root);
    }
  };
}
function P(t) {
  return t.nodeType === 9 ? t : t.ownerDocument || document;
}
function I(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLElement && t instanceof e.HTMLElement || typeof HTMLElement < "u" && t instanceof HTMLElement);
}
function y(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLFormElement && t instanceof e.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement);
}
function p(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLButtonElement && t instanceof e.HTMLButtonElement || e?.HTMLInputElement && t instanceof e.HTMLInputElement || e?.HTMLTextAreaElement && t instanceof e.HTMLTextAreaElement || e?.HTMLSelectElement && t instanceof e.HTMLSelectElement || typeof HTMLButtonElement < "u" && t instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && t instanceof HTMLInputElement || typeof HTMLTextAreaElement < "u" && t instanceof HTMLTextAreaElement || typeof HTMLSelectElement < "u" && t instanceof HTMLSelectElement);
}
function S(t) {
  if (!t) return null;
  const e = t.ownerDocument?.defaultView;
  return e?.HTMLButtonElement && t instanceof e.HTMLButtonElement || e?.HTMLInputElement && t instanceof e.HTMLInputElement || typeof HTMLButtonElement < "u" && t instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && t instanceof HTMLInputElement ? t : null;
}
function K(t) {
  const e = t.tagName.toLowerCase();
  if (e === "button") return !0;
  if (e !== "input") return !1;
  const n = (t.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "button" || n === "image";
}
function Y(t) {
  if (!t) return !1;
  const e = t.tagName.toLowerCase();
  if (e === "button") return (t.getAttribute("type") || "submit").trim().toLowerCase() === "submit";
  if (e !== "input") return !1;
  const n = (t.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "image";
}
function j(t, e) {
  const n = [];
  for (const i of e.controls ?? []) p(i) && !n.includes(i) && n.push(i);
  if (p(e.submitter) && !n.includes(e.submitter) && n.push(e.submitter), p(t) && !n.includes(t) && n.push(t), e.includeDescendantControls !== !1) {
    const i = y(t) ? 'button, input[type="submit"], input[type="button"], input[type="image"]' : 'button, input[type="submit"], input[type="button"], input[type="image"], select, textarea';
    t.querySelectorAll(i).forEach((a) => {
      (y(t) ? K(a) : p(a)) && !n.includes(a) && n.push(a);
    });
  }
  return n;
}
function z(t, e) {
  e.controls.push({
    control: t,
    disabled: t.disabled,
    ariaLabel: t.getAttribute("aria-label")
  });
}
function J(t, e, n) {
  const i = Q(t, e);
  if (i) {
    t.setAttribute("aria-label", i);
    const r = X(t);
    r ? (n.labels.push({
      element: r,
      textContent: r.textContent
    }), r.textContent = i) : t instanceof HTMLButtonElement ? (n.labels.push({
      element: t,
      textContent: t.textContent,
      innerHTML: t.innerHTML
    }), t.textContent = i) : t instanceof HTMLInputElement && (n.inputValues.push({
      input: t,
      value: t.value
    }), t.value = i);
  }
  const a = Z(t) || tt(t, e, n);
  a && (n.spinners.push({
    element: a,
    hidden: a.hidden
  }), a.hidden = !1), t.disabled = !0;
}
function Q(t, e) {
  return String(e.label || t.getAttribute("data-busy-label") || t.getAttribute("data-submit-loading-busy-label") || "").trim();
}
function X(t) {
  return t instanceof HTMLInputElement && t.tagName.toLowerCase() === "input" ? null : t.querySelector("[data-busy-label-target], [data-submit-loading-label]");
}
function Z(t) {
  return t instanceof HTMLInputElement && t.tagName.toLowerCase() === "input" ? null : t.querySelector("[data-busy-spinner], .submit-loading-spinner");
}
function tt(t, e, n) {
  if (!e.generateSpinner && !t.hasAttribute("data-busy-button") || t instanceof HTMLInputElement && t.tagName.toLowerCase() === "input") return null;
  const i = t.ownerDocument.createElement("span");
  return i.setAttribute("data-busy-spinner", ""), i.setAttribute("data-busy-generated-spinner", "true"), i.setAttribute("aria-hidden", "true"), i.className = "busy-spinner", t.insertBefore(i, t.firstChild), n.generatedSpinners.push(i), i;
}
function T(t, e, n, i, a = null) {
  const r = e.ownerDocument.createElement("input");
  return r.type = "hidden", r.name = n, r.value = i, r.dataset.busyGenerated = d, r.dataset.submitLoadingGenerated = d, a && a.parentNode === e ? a.after(r) : e.appendChild(r), t.generatedInputs.push(r), r;
}
function et(t, e, n) {
  if (!e || !Y(e) || e.disabled) return;
  const i = {
    action: t.getAttribute("action"),
    method: t.getAttribute("method"),
    enctype: t.getAttribute("enctype"),
    target: t.getAttribute("target"),
    noValidate: t.noValidate
  };
  let a = !1;
  for (const [s, c] of [
    ["formaction", "action"],
    ["formmethod", "method"],
    ["formenctype", "enctype"],
    ["formtarget", "target"]
  ]) e.hasAttribute(s) && (t.setAttribute(c, e.getAttribute(s) ?? ""), a = !0);
  (e.hasAttribute("formnovalidate") || e.formNoValidate) && (t.noValidate = !0, a = !0), a && (n.overrides = i);
  const r = e.getAttribute("name")?.trim();
  if (r) {
    if ((e.tagName.toLowerCase() === "input" ? (e.getAttribute("type") || "text").trim().toLowerCase() : "submit") === "image") {
      const s = T(n, t, `${r}.x`, "0", e);
      T(n, t, `${r}.y`, "0", s);
      return;
    }
    T(n, t, r, e.getAttribute("value") ?? "", e);
  }
}
function nt(t, e) {
  const n = e?.getAttribute("formtarget");
  return n ?? t.getAttribute("target") ?? "";
}
function it(t, e) {
  const n = String(e ?? "").trim();
  return n || (t.querySelector("base[target]")?.getAttribute("target")?.trim() ?? "");
}
function at(t, e) {
  m(t, "action", e.action), m(t, "method", e.method), m(t, "enctype", e.enctype), m(t, "target", e.target), t.noValidate = e.noValidate;
}
function m(t, e, n) {
  n === null ? t.removeAttribute(e) : t.setAttribute(e, n);
}
function A(t, e, n) {
  n === void 0 ? delete t.dataset[e] : t.dataset[e] = n;
}
var rt = '[data-behavior~="navigation-busy"]', q = "[data-navigation-busy-trigger]", L = /* @__PURE__ */ new WeakMap(), b = /* @__PURE__ */ new WeakSet();
function ut(t, e, n) {
  if (b.has(t)) return !0;
  const i = ct(t.target, e);
  if (!i) return !1;
  const a = $(i, e);
  return !a || !mt(i, t, n) ? !1 : h(a) ? (b.add(t), t.preventDefault(), !0) : (b.add(t), _(a, i), !0);
}
function st(t, e, n) {
  if (b.has(t)) return !0;
  const i = ft(t.target, e);
  if (!i) return !1;
  const a = $(i, e);
  if (!a || t.defaultPrevented || i.matches("form[data-enhance-action]")) return !1;
  const r = ht(t, i);
  return k(i, r) || !bt(i, r) || !N(i, r) && typeof i.checkValidity == "function" && !i.checkValidity() ? !1 : h(a) ? (b.add(t), t.preventDefault(), !0) : (b.add(t), _(a, i, r), !0);
}
function h(t) {
  return !!t && (L.has(t) || t.dataset.navigationBusyActive === "true");
}
function ot(t) {
  if (!t) return;
  const e = L.get(t);
  if (!e) {
    t.dataset.navigationBusyActive === "true" && delete t.dataset.navigationBusyActive;
    return;
  }
  e.rootBusy.reset(), e.formBusy?.reset(), V(t, "navigationBusyActive", e.active);
  for (const n of e.triggers)
    At(n.element, "aria-disabled", n.ariaDisabled), V(n.element, "navigationBusyTriggerActive", n.active);
  e.status && (e.status.element.hidden = e.status.hidden, e.status.labelTarget && (e.status.labelTarget.textContent = e.status.labelText)), L.delete(t);
}
function lt(t = document) {
  const e = [];
  Tt(t) && h(t) && e.push(t), t.querySelectorAll('[data-navigation-busy-active="true"]').forEach((n) => {
    e.push(n);
  });
  for (const n of Array.from(new Set(e))) ot(n);
}
function _(t, e, n = null) {
  if (h(t)) return;
  const i = O(e) ? e : null, a = i && i !== t ? w(i, { submitter: n }) : null, r = w(t, i === t ? { submitter: n } : {
    controls: Array.from(t.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"]')),
    includeDescendantControls: !1
  }), s = dt(t).map((l) => ({
    element: l,
    ariaDisabled: l.getAttribute("aria-disabled"),
    active: l.dataset.navigationBusyTriggerActive
  }));
  for (const l of s)
    l.element.setAttribute("aria-disabled", "true"), l.element === e && (l.element.dataset.navigationBusyTriggerActive = "true");
  const c = Lt(t), f = c?.querySelector("[data-navigation-busy-label-target]") ?? null, o = c ? {
    element: c,
    hidden: c.hidden,
    labelTarget: f,
    labelText: f?.textContent ?? null
  } : null;
  o && (o.labelTarget && (o.labelTarget.textContent = yt(t, e)), o.element.hidden = !1);
  const u = {
    root: t,
    active: t.dataset.navigationBusyActive,
    rootBusy: r,
    formBusy: a,
    triggers: s,
    status: o
  };
  t.dataset.navigationBusyActive = "true", L.set(t, u);
}
function ct(t, e) {
  if (!Et(t)) return null;
  const n = t.closest(`a[href]${q}`);
  return n && H(e, n) ? n : null;
}
function ft(t, e) {
  return !O(t) || !t.matches("form[data-navigation-busy-trigger]") ? null : H(e, t) ? t : null;
}
function $(t, e) {
  const n = t.closest(rt);
  return n && H(e, n) ? n : null;
}
function dt(t) {
  const e = Array.from(t.querySelectorAll(q));
  return t.matches("[data-navigation-busy-trigger]") && e.unshift(t), e;
}
function mt(t, e, n) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || t.hasAttribute("download") || t.hasAttribute("data-navigation-busy-skip") || U(t.ownerDocument, t.getAttribute("target"))) return !1;
  const i = t.getAttribute("href")?.trim() ?? "";
  if (!i || i.startsWith("#")) return !1;
  try {
    const a = n?.location?.href || t.ownerDocument.URL, r = new URL(i, a);
    if (r.protocol !== "http:" && r.protocol !== "https:") return !1;
    if (n?.location) {
      const s = new URL(n.location.href);
      if (r.origin === s.origin && r.pathname === s.pathname && r.search === s.search && (r.hash || s.hash)) return !1;
    }
  } catch {
    return !1;
  }
  return !0;
}
function bt(t, e) {
  if (gt(t, e) === "dialog") return !1;
  const n = pt(t, e);
  return n !== null && (n.protocol === "http:" || n.protocol === "https:");
}
function gt(t, e) {
  const n = e?.hasAttribute("formmethod") ? e.getAttribute("formmethod") : t.getAttribute("method"), i = String(n ?? "").trim().toLowerCase();
  return i === "post" || i === "dialog" ? i : "get";
}
function pt(t, e) {
  const n = e?.hasAttribute("formaction") ? e.getAttribute("formaction") : t.getAttribute("action"), i = String(n ?? "").trim() || t.ownerDocument.URL;
  try {
    return new URL(i, t.ownerDocument.baseURI || t.ownerDocument.URL);
  } catch {
    return null;
  }
}
function yt(t, e) {
  return String(e.getAttribute("data-navigation-busy-label") || t.getAttribute("data-navigation-busy-label") || "Loading...").trim();
}
function Lt(t) {
  const e = t.getAttribute("data-navigation-busy-status-target")?.trim() ?? "";
  if (e) try {
    return t.ownerDocument.querySelector(e);
  } catch {
    return null;
  }
  return t.querySelector("[data-navigation-busy-status]");
}
function ht(t, e) {
  const n = t.submitter;
  if (!n) return null;
  const i = e.ownerDocument.defaultView;
  return (i?.HTMLButtonElement && n instanceof i.HTMLButtonElement || i?.HTMLInputElement && n instanceof i.HTMLInputElement || typeof HTMLButtonElement < "u" && n instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && n instanceof HTMLInputElement) && n.form === e ? n : null;
}
function Et(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.Element && t instanceof e.Element || typeof Element < "u" && t instanceof Element);
}
function Tt(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLElement && t instanceof e.HTMLElement || typeof HTMLElement < "u" && t instanceof HTMLElement);
}
function O(t) {
  const e = t?.ownerDocument?.defaultView;
  return !!t && (e?.HTMLFormElement && t instanceof e.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement);
}
function H(t, e) {
  return t === e || t.contains(e);
}
function At(t, e, n) {
  if (n === null) {
    t.removeAttribute(e);
    return;
  }
  t.setAttribute(e, n);
}
function V(t, e, n) {
  if (n === void 0) {
    delete t.dataset[e];
    return;
  }
  t.dataset[e] = n;
}
var wt = 'form[data-behavior~="submit-busy"], form[data-submit-loading-form]', B = /* @__PURE__ */ new WeakMap(), x = /* @__PURE__ */ new WeakSet();
function C(t = document, e = {}) {
  const n = B.get(t) ?? Mt(t, e), i = vt(n, e);
  return e.listenForFragments !== !1 && St(n), i.controller;
}
function Mt(t, e) {
  const n = Bt(t), i = e.window ?? n.defaultView ?? window, a = (o) => {
    ut(o, t, i);
  }, r = (o) => {
    if (st(o, t, i)) return;
    const u = Ct(o.target, n), l = u ? Ht(u, f.submitRules) : null;
    if (!u || !l || o.defaultPrevented || u.matches("form[data-enhance-action]") || x.has(o)) return;
    if (R(u)) {
      o.preventDefault();
      return;
    }
    const E = Ft(o, u, n);
    !N(u, E) && typeof u.checkValidity == "function" && !u.checkValidity() || (x.add(o), w(u, {
      submitter: E,
      compatibilitySubmitLoading: l.compatibilitySubmitLoading || u.hasAttribute("data-submit-loading-form")
    }), k(u, E) && i?.setTimeout(() => {
      v(u);
    }, 0));
  }, s = () => {
    M(t);
  }, f = {
    root: t,
    doc: n,
    win: i,
    submitRules: [],
    fragmentListenerAttached: !1,
    handleClick: a,
    handleSubmit: r,
    handlePageShow: s,
    handleFragmentsApplied: (o) => {
      const u = o.detail;
      if (Array.isArray(u?.roots) && u.roots.length > 0) {
        u.roots.forEach((l) => D(f, l));
        return;
      }
      if (u?.root) {
        D(f, u.root);
        return;
      }
      f.submitRules.forEach((l) => {
        C(t, {
          submitBusySelector: l.selector,
          compatibilitySubmitLoading: l.compatibilitySubmitLoading,
          window: i ?? void 0,
          listenForFragments: !1
        });
      });
    }
  };
  return t.addEventListener("click", a), t.addEventListener("submit", r), i?.addEventListener("pageshow", s), B.set(t, f), f;
}
function vt(t, e) {
  const n = e.submitBusySelector || wt, i = e.compatibilitySubmitLoading === !0, a = `${n}
${i ? "compat" : "standard"}`, r = t.submitRules.find((c) => c.key === a);
  if (r) return r;
  const s = {
    key: a,
    selector: n,
    compatibilitySubmitLoading: i,
    controller: {
      reset() {
        M(t.root);
      },
      destroy() {
        const c = t.submitRules.findIndex((f) => f.key === a);
        c >= 0 && t.submitRules.splice(c, 1), t.submitRules.length === 0 && (M(t.root), t.root.removeEventListener("click", t.handleClick), t.root.removeEventListener("submit", t.handleSubmit), t.win?.removeEventListener("pageshow", t.handlePageShow), t.doc.removeEventListener("go-admin:enhanced-fragments-applied", t.handleFragmentsApplied), B.delete(t.root));
      }
    }
  };
  return t.submitRules.push(s), s;
}
function St(t) {
  t.fragmentListenerAttached || (t.doc.addEventListener("go-admin:enhanced-fragments-applied", t.handleFragmentsApplied), t.fragmentListenerAttached = !0);
}
function D(t, e) {
  t.submitRules.forEach((n) => {
    C(e, {
      submitBusySelector: n.selector,
      compatibilitySubmitLoading: n.compatibilitySubmitLoading,
      window: t.win ?? void 0,
      listenForFragments: !1
    });
  });
}
function Ht(t, e) {
  let n = null;
  for (const i of e)
    if (t.matches(i.selector)) {
      if (i.compatibilitySubmitLoading) return i;
      n = n ?? i;
    }
  return n;
}
function M(t = document) {
  lt(t), W(t);
}
function Vt(t = {}) {
  const e = t.root ?? document;
  let n = null;
  return G(() => {
    n = C(e, t);
  }), {
    reset() {
      n?.reset();
    },
    destroy() {
      n?.destroy();
    }
  };
}
function Bt(t) {
  return t.nodeType === 9 ? t : t.ownerDocument || document;
}
function Ct(t, e) {
  const n = e.defaultView;
  return n?.HTMLFormElement && t instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement ? t : null;
}
function Ft(t, e, n) {
  const i = t.submitter;
  if (!i) return null;
  const a = n.defaultView;
  return (a?.HTMLButtonElement && i instanceof a.HTMLButtonElement || a?.HTMLInputElement && i instanceof a.HTMLInputElement || typeof HTMLButtonElement < "u" && i instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && i instanceof HTMLInputElement) && i.form === e ? i : null;
}
export {
  q as a,
  lt as c,
  v as d,
  W as f,
  rt as i,
  d as l,
  C as n,
  h as o,
  w as p,
  M as r,
  ot as s,
  Vt as t,
  R as u
};

//# sourceMappingURL=behaviors-3r2n03MZ.js.map
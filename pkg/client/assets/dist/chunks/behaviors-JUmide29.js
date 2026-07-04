import { onReady as C } from "../shared/dom-ready.js";
var m = "true", f = /* @__PURE__ */ new WeakMap();
function B(e) {
  return e ? f.has(e) || e.dataset.busy === "true" || e.dataset.submitLoadingActive === "true" || e.getAttribute("aria-busy") === "true" : !1;
}
function F(e, t = {}) {
  const n = f.get(e);
  if (n) return M(n);
  const i = {
    root: e,
    ariaBusy: e.getAttribute("aria-busy"),
    dataBusy: e.dataset.busy,
    dataLoading: e.dataset.loading,
    dataSubmitLoadingActive: e.dataset.submitLoadingActive,
    controls: [],
    labels: [],
    inputValues: [],
    spinners: [],
    generatedInputs: [],
    generatedSpinners: [],
    overrides: null
  };
  e.setAttribute("aria-busy", m), e.dataset.busy = m, (t.compatibilitySubmitLoading || e.hasAttribute("data-submit-loading-form")) && (e.dataset.loading = m, e.dataset.submitLoadingActive = m), p(e) && W(e, E(t.submitter), i);
  const a = k(e, t);
  for (const u of a)
    _(u, i), q(u, t, i);
  return f.set(e, i), M(i);
}
function h(e) {
  if (!e) return;
  const t = f.get(e);
  if (!t) {
    e.dataset.busy === "true" && (delete e.dataset.busy, e.removeAttribute("aria-busy")), (e.dataset.submitLoadingActive === "true" || e.dataset.loading === "true") && (delete e.dataset.loading, delete e.dataset.submitLoadingActive);
    return;
  }
  c(e, "aria-busy", t.ariaBusy), y(e, "busy", t.dataBusy), y(e, "loading", t.dataLoading), y(e, "submitLoadingActive", t.dataSubmitLoadingActive);
  for (const n of t.controls)
    n.control.disabled = n.disabled, c(n.control, "aria-label", n.ariaLabel);
  for (const n of t.labels) n.innerHTML !== void 0 ? n.element.innerHTML = n.innerHTML : n.element.textContent = n.textContent;
  for (const n of t.inputValues) n.input.value = n.value;
  for (const n of t.spinners) n.element.hidden = n.hidden;
  for (const n of t.generatedInputs) n.remove();
  for (const n of t.generatedSpinners) n.remove();
  t.overrides && p(e) && Y(e, t.overrides), f.delete(e);
}
function x(e = document) {
  const t = R(e), n = [];
  H(e) && B(e) && n.push(e), e.querySelectorAll('[data-busy="true"], [data-submit-loading-active="true"], [aria-busy="true"]').forEach((i) => {
    H(i) && n.push(i);
  }), t.querySelectorAll('form[data-submit-loading-form][data-loading="true"]').forEach((i) => {
    (e.contains?.(i) || e === t) && n.push(i);
  });
  for (const i of Array.from(new Set(n))) h(i);
}
function I(e, t) {
  const n = E(t);
  return e.noValidate || n?.hasAttribute("formnovalidate") === !0 || n?.formNoValidate === !0;
}
function V(e, t) {
  const n = P(e, E(t)).trim().toLowerCase();
  return n !== "" && n !== "_self";
}
function M(e) {
  return {
    root: e.root,
    reset() {
      h(e.root);
    }
  };
}
function R(e) {
  return e.nodeType === 9 ? e : e.ownerDocument || document;
}
function H(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLElement && e instanceof t.HTMLElement || typeof HTMLElement < "u" && e instanceof HTMLElement);
}
function p(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLFormElement && e instanceof t.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement);
}
function b(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || t?.HTMLTextAreaElement && e instanceof t.HTMLTextAreaElement || t?.HTMLSelectElement && e instanceof t.HTMLSelectElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && e instanceof HTMLInputElement || typeof HTMLTextAreaElement < "u" && e instanceof HTMLTextAreaElement || typeof HTMLSelectElement < "u" && e instanceof HTMLSelectElement);
}
function E(e) {
  if (!e) return null;
  const t = e.ownerDocument?.defaultView;
  return t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && e instanceof HTMLInputElement ? e : null;
}
function D(e) {
  const t = e.tagName.toLowerCase();
  if (t === "button") return !0;
  if (t !== "input") return !1;
  const n = (e.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "button" || n === "image";
}
function N(e) {
  if (!e) return !1;
  const t = e.tagName.toLowerCase();
  if (t === "button") return (e.getAttribute("type") || "submit").trim().toLowerCase() === "submit";
  if (t !== "input") return !1;
  const n = (e.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "image";
}
function k(e, t) {
  const n = [];
  for (const a of t.controls ?? []) b(a) && !n.includes(a) && n.push(a);
  b(t.submitter) && !n.includes(t.submitter) && n.push(t.submitter), b(e) && !n.includes(e) && n.push(e);
  const i = p(e) ? 'button, input[type="submit"], input[type="button"], input[type="image"]' : 'button, input[type="submit"], input[type="button"], input[type="image"], select, textarea';
  return e.querySelectorAll(i).forEach((a) => {
    (p(e) ? D(a) : b(a)) && !n.includes(a) && n.push(a);
  }), n;
}
function _(e, t) {
  t.controls.push({
    control: e,
    disabled: e.disabled,
    ariaLabel: e.getAttribute("aria-label")
  });
}
function q(e, t, n) {
  const i = U(e, t);
  if (i) {
    e.setAttribute("aria-label", i);
    const u = $(e);
    u ? (n.labels.push({
      element: u,
      textContent: u.textContent
    }), u.textContent = i) : e instanceof HTMLButtonElement ? (n.labels.push({
      element: e,
      textContent: e.textContent,
      innerHTML: e.innerHTML
    }), e.textContent = i) : e instanceof HTMLInputElement && (n.inputValues.push({
      input: e,
      value: e.value
    }), e.value = i);
  }
  const a = G(e) || O(e, t, n);
  a && (n.spinners.push({
    element: a,
    hidden: a.hidden
  }), a.hidden = !1), e.disabled = !0;
}
function U(e, t) {
  return String(t.label || e.getAttribute("data-busy-label") || e.getAttribute("data-submit-loading-busy-label") || "").trim();
}
function $(e) {
  return e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input" ? null : e.querySelector("[data-busy-label-target], [data-submit-loading-label]");
}
function G(e) {
  return e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input" ? null : e.querySelector("[data-busy-spinner], .submit-loading-spinner");
}
function O(e, t, n) {
  if (!t.generateSpinner && !e.hasAttribute("data-busy-button") || e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input") return null;
  const i = e.ownerDocument.createElement("span");
  return i.setAttribute("data-busy-spinner", ""), i.setAttribute("data-busy-generated-spinner", "true"), i.setAttribute("aria-hidden", "true"), i.className = "busy-spinner", e.insertBefore(i, e.firstChild), n.generatedSpinners.push(i), i;
}
function L(e, t, n, i, a = null) {
  const u = t.ownerDocument.createElement("input");
  return u.type = "hidden", u.name = n, u.value = i, u.dataset.busyGenerated = m, u.dataset.submitLoadingGenerated = m, a && a.parentNode === t ? a.after(u) : t.appendChild(u), e.generatedInputs.push(u), u;
}
function W(e, t, n) {
  if (!t || !N(t) || t.disabled) return;
  const i = {
    action: e.getAttribute("action"),
    method: e.getAttribute("method"),
    enctype: e.getAttribute("enctype"),
    target: e.getAttribute("target"),
    noValidate: e.noValidate
  };
  let a = !1;
  for (const [d, s] of [
    ["formaction", "action"],
    ["formmethod", "method"],
    ["formenctype", "enctype"],
    ["formtarget", "target"]
  ]) t.hasAttribute(d) && (e.setAttribute(s, t.getAttribute(d) ?? ""), a = !0);
  (t.hasAttribute("formnovalidate") || t.formNoValidate) && (e.noValidate = !0, a = !0), a && (n.overrides = i);
  const u = t.getAttribute("name")?.trim();
  if (u) {
    if ((t.tagName.toLowerCase() === "input" ? (t.getAttribute("type") || "text").trim().toLowerCase() : "submit") === "image") {
      const d = L(n, e, `${u}.x`, "0", t);
      L(n, e, `${u}.y`, "0", d);
      return;
    }
    L(n, e, u, t.getAttribute("value") ?? "", t);
  }
}
function P(e, t) {
  const n = t?.getAttribute("formtarget");
  return n ?? e.getAttribute("target") ?? "";
}
function Y(e, t) {
  c(e, "action", t.action), c(e, "method", t.method), c(e, "enctype", t.enctype), c(e, "target", t.target), e.noValidate = t.noValidate;
}
function c(e, t, n) {
  n === null ? e.removeAttribute(t) : e.setAttribute(t, n);
}
function y(e, t, n) {
  n === void 0 ? delete e.dataset[t] : e.dataset[t] = n;
}
var j = 'form[data-behavior~="submit-busy"], form[data-submit-loading-form]', T = /* @__PURE__ */ new WeakMap(), S = /* @__PURE__ */ new WeakSet();
function A(e = document, t = {}) {
  const n = T.get(e) ?? z(e, t), i = J(n, t);
  return t.listenForFragments !== !1 && K(n), i.controller;
}
function z(e, t) {
  const n = X(e), i = t.window ?? n.defaultView ?? window, a = (o) => {
    const r = Z(o.target, n), l = r ? Q(r, s.submitRules) : null;
    if (!r || !l || o.defaultPrevented || r.matches("form[data-enhance-action]") || S.has(o)) return;
    if (B(r)) {
      o.preventDefault();
      return;
    }
    const g = ee(o, r, n);
    !I(r, g) && typeof r.checkValidity == "function" && !r.checkValidity() || (S.add(o), F(r, {
      submitter: g,
      compatibilitySubmitLoading: l.compatibilitySubmitLoading || r.hasAttribute("data-submit-loading-form")
    }), V(r, g) && i?.setTimeout(() => {
      h(r);
    }, 0));
  }, u = () => {
    v(e);
  }, s = {
    root: e,
    doc: n,
    win: i,
    submitRules: [],
    fragmentListenerAttached: !1,
    handleSubmit: a,
    handlePageShow: u,
    handleFragmentsApplied: (o) => {
      const r = o.detail;
      if (Array.isArray(r?.roots) && r.roots.length > 0) {
        r.roots.forEach((l) => w(s, l));
        return;
      }
      if (r?.root) {
        w(s, r.root);
        return;
      }
      s.submitRules.forEach((l) => {
        A(e, {
          submitBusySelector: l.selector,
          compatibilitySubmitLoading: l.compatibilitySubmitLoading,
          window: i ?? void 0,
          listenForFragments: !1
        });
      });
    }
  };
  return e.addEventListener("submit", a), i?.addEventListener("pageshow", u), T.set(e, s), s;
}
function J(e, t) {
  const n = t.submitBusySelector || j, i = t.compatibilitySubmitLoading === !0, a = `${n}
${i ? "compat" : "standard"}`, u = e.submitRules.find((s) => s.key === a);
  if (u) return u;
  const d = {
    key: a,
    selector: n,
    compatibilitySubmitLoading: i,
    controller: {
      reset() {
        v(e.root);
      },
      destroy() {
        const s = e.submitRules.findIndex((o) => o.key === a);
        s >= 0 && e.submitRules.splice(s, 1), e.submitRules.length === 0 && (e.root.removeEventListener("submit", e.handleSubmit), e.win?.removeEventListener("pageshow", e.handlePageShow), e.doc.removeEventListener("go-admin:enhanced-fragments-applied", e.handleFragmentsApplied), T.delete(e.root));
      }
    }
  };
  return e.submitRules.push(d), d;
}
function K(e) {
  e.fragmentListenerAttached || (e.doc.addEventListener("go-admin:enhanced-fragments-applied", e.handleFragmentsApplied), e.fragmentListenerAttached = !0);
}
function w(e, t) {
  e.submitRules.forEach((n) => {
    A(t, {
      submitBusySelector: n.selector,
      compatibilitySubmitLoading: n.compatibilitySubmitLoading,
      window: e.win ?? void 0,
      listenForFragments: !1
    });
  });
}
function Q(e, t) {
  let n = null;
  for (const i of t)
    if (e.matches(i.selector)) {
      if (i.compatibilitySubmitLoading) return i;
      n = n ?? i;
    }
  return n;
}
function v(e = document) {
  x(e);
}
function ne(e = {}) {
  const t = e.root ?? document;
  let n = null;
  return C(() => {
    n = A(t, e);
  }), {
    reset() {
      n?.reset();
    },
    destroy() {
      n?.destroy();
    }
  };
}
function X(e) {
  return e.nodeType === 9 ? e : e.ownerDocument || document;
}
function Z(e, t) {
  const n = t.defaultView;
  return n?.HTMLFormElement && e instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement ? e : null;
}
function ee(e, t, n) {
  const i = e.submitter;
  if (!i) return null;
  const a = n.defaultView;
  return (a?.HTMLButtonElement && i instanceof a.HTMLButtonElement || a?.HTMLInputElement && i instanceof a.HTMLInputElement || typeof HTMLButtonElement < "u" && i instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && i instanceof HTMLInputElement) && i.form === t ? i : null;
}
export {
  B as a,
  F as c,
  m as i,
  A as n,
  h as o,
  v as r,
  x as s,
  ne as t
};

//# sourceMappingURL=behaviors-JUmide29.js.map
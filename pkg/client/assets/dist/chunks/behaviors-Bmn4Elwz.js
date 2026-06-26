import { onReady as C } from "../shared/dom-ready.js";
var o = "true", m = /* @__PURE__ */ new WeakMap();
function v(e) {
  return e ? m.has(e) || e.dataset.busy === "true" || e.dataset.submitLoadingActive === "true" || e.getAttribute("aria-busy") === "true" : !1;
}
function V(e, t = {}) {
  const n = m.get(e);
  if (n) return H(n);
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
  e.setAttribute("aria-busy", o), e.dataset.busy = o, (t.compatibilitySubmitLoading || e.hasAttribute("data-submit-loading-form")) && (e.dataset.loading = o, e.dataset.submitLoadingActive = o), y(e) && P(e, h(t.submitter), i);
  const a = k(e, t);
  for (const u of a)
    q(u, i), U(u, t, i);
  return m.set(e, i), H(i);
}
function T(e) {
  if (!e) return;
  const t = m.get(e);
  if (!t) {
    e.dataset.busy === "true" && (delete e.dataset.busy, e.removeAttribute("aria-busy")), (e.dataset.submitLoadingActive === "true" || e.dataset.loading === "true") && (delete e.dataset.loading, delete e.dataset.submitLoadingActive);
    return;
  }
  l(e, "aria-busy", t.ariaBusy), E(e, "busy", t.dataBusy), E(e, "loading", t.dataLoading), E(e, "submitLoadingActive", t.dataSubmitLoadingActive);
  for (const n of t.controls)
    n.control.disabled = n.disabled, l(n.control, "aria-label", n.ariaLabel);
  for (const n of t.labels) n.element.textContent = n.textContent;
  for (const n of t.inputValues) n.input.value = n.value;
  for (const n of t.spinners) n.element.hidden = n.hidden;
  for (const n of t.generatedInputs) n.remove();
  for (const n of t.generatedSpinners) n.remove();
  t.overrides && y(e) && Y(e, t.overrides), m.delete(e);
}
function I(e = document) {
  const t = D(e), n = [];
  w(e) && v(e) && n.push(e), e.querySelectorAll('[data-busy="true"], [data-submit-loading-active="true"], [aria-busy="true"]').forEach((i) => {
    w(i) && n.push(i);
  }), t.querySelectorAll('form[data-submit-loading-form][data-loading="true"]').forEach((i) => {
    (e.contains?.(i) || e === t) && n.push(i);
  });
  for (const i of Array.from(new Set(n))) T(i);
}
function x(e, t) {
  const n = h(t);
  return e.noValidate || n?.hasAttribute("formnovalidate") === !0 || n?.formNoValidate === !0;
}
function F(e, t) {
  const n = R(e, h(t)).trim().toLowerCase();
  return n !== "" && n !== "_self";
}
function H(e) {
  return {
    root: e.root,
    reset() {
      T(e.root);
    }
  };
}
function D(e) {
  return e.nodeType === 9 ? e : e.ownerDocument || document;
}
function w(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLElement && e instanceof t.HTMLElement || typeof HTMLElement < "u" && e instanceof HTMLElement);
}
function y(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLFormElement && e instanceof t.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement);
}
function b(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || t?.HTMLTextAreaElement && e instanceof t.HTMLTextAreaElement || t?.HTMLSelectElement && e instanceof t.HTMLSelectElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && e instanceof HTMLInputElement || typeof HTMLTextAreaElement < "u" && e instanceof HTMLTextAreaElement || typeof HTMLSelectElement < "u" && e instanceof HTMLSelectElement);
}
function h(e) {
  if (!e) return null;
  const t = e.ownerDocument?.defaultView;
  return t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && e instanceof HTMLInputElement ? e : null;
}
function N(e) {
  const t = e.tagName.toLowerCase();
  if (t === "button") return !0;
  if (t !== "input") return !1;
  const n = (e.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "button" || n === "image";
}
function _(e) {
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
  const i = y(e) ? 'button, input[type="submit"], input[type="button"], input[type="image"]' : 'button, input[type="submit"], input[type="button"], input[type="image"], select, textarea';
  return e.querySelectorAll(i).forEach((a) => {
    (y(e) ? N(a) : b(a)) && !n.includes(a) && n.push(a);
  }), n;
}
function q(e, t) {
  t.controls.push({
    control: e,
    disabled: e.disabled,
    ariaLabel: e.getAttribute("aria-label")
  });
}
function U(e, t, n) {
  const i = G(e, t);
  if (i) {
    e.setAttribute("aria-label", i);
    const u = O(e);
    u ? (n.labels.push({
      element: u,
      textContent: u.textContent
    }), u.textContent = i) : e instanceof HTMLButtonElement ? (n.labels.push({
      element: e,
      textContent: e.textContent
    }), e.textContent = i) : e instanceof HTMLInputElement && (n.inputValues.push({
      input: e,
      value: e.value
    }), e.value = i);
  }
  const a = W(e) || $(e, t, n);
  a && (n.spinners.push({
    element: a,
    hidden: a.hidden
  }), a.hidden = !1), e.disabled = !0;
}
function G(e, t) {
  return String(t.label || e.getAttribute("data-busy-label") || e.getAttribute("data-submit-loading-busy-label") || "").trim();
}
function O(e) {
  return e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input" ? null : e.querySelector("[data-busy-label-target], [data-submit-loading-label]");
}
function W(e) {
  return e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input" ? null : e.querySelector("[data-busy-spinner], .submit-loading-spinner");
}
function $(e, t, n) {
  if (!t.generateSpinner && !e.hasAttribute("data-busy-button") || e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input") return null;
  const i = e.ownerDocument.createElement("span");
  return i.setAttribute("data-busy-spinner", ""), i.setAttribute("data-busy-generated-spinner", "true"), i.setAttribute("aria-hidden", "true"), i.className = "busy-spinner", e.insertBefore(i, e.firstChild), n.generatedSpinners.push(i), i;
}
function L(e, t, n, i, a = null) {
  const u = t.ownerDocument.createElement("input");
  return u.type = "hidden", u.name = n, u.value = i, u.dataset.busyGenerated = o, u.dataset.submitLoadingGenerated = o, a && a.parentNode === t ? a.after(u) : t.appendChild(u), e.generatedInputs.push(u), u;
}
function P(e, t, n) {
  if (!t || !_(t) || t.disabled) return;
  const i = {
    action: e.getAttribute("action"),
    method: e.getAttribute("method"),
    enctype: e.getAttribute("enctype"),
    target: e.getAttribute("target"),
    noValidate: e.noValidate
  };
  let a = !1;
  for (const [d, c] of [
    ["formaction", "action"],
    ["formmethod", "method"],
    ["formenctype", "enctype"],
    ["formtarget", "target"]
  ]) t.hasAttribute(d) && (e.setAttribute(c, t.getAttribute(d) ?? ""), a = !0);
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
function R(e, t) {
  const n = t?.getAttribute("formtarget");
  return n ?? e.getAttribute("target") ?? "";
}
function Y(e, t) {
  l(e, "action", t.action), l(e, "method", t.method), l(e, "enctype", t.enctype), l(e, "target", t.target), e.noValidate = t.noValidate;
}
function l(e, t, n) {
  n === null ? e.removeAttribute(t) : e.setAttribute(t, n);
}
function E(e, t, n) {
  n === void 0 ? delete e.dataset[t] : e.dataset[t] = n;
}
var j = 'form[data-behavior~="submit-busy"], form[data-submit-loading-form]', p = /* @__PURE__ */ new WeakMap(), S = /* @__PURE__ */ new WeakSet();
function g(e = document, t = {}) {
  const n = p.get(e);
  if (n) return n;
  const i = z(e), a = t.window ?? i.defaultView ?? window, u = t.submitBusySelector || j, d = (s) => {
    const r = J(s.target, i);
    if (!r || s.defaultPrevented || !r.matches(u) || S.has(s)) return;
    if (v(r)) {
      s.preventDefault();
      return;
    }
    const f = K(s, r, i);
    !x(r, f) && typeof r.checkValidity == "function" && !r.checkValidity() || (S.add(s), V(r, {
      submitter: f,
      compatibilitySubmitLoading: r.hasAttribute("data-submit-loading-form")
    }), F(r, f) && a?.setTimeout(() => {
      T(r);
    }, 0));
  }, c = () => {
    B(e);
  }, A = (s) => {
    const r = s.detail;
    if (Array.isArray(r?.roots) && r.roots.length > 0) {
      r.roots.forEach((f) => g(f, t));
      return;
    }
    if (r?.root) {
      g(r.root, t);
      return;
    }
    g(e, t);
  };
  e.addEventListener("submit", d), a?.addEventListener("pageshow", c), t.listenForFragments !== !1 && i.addEventListener("go-admin:enhanced-fragments-applied", A);
  const M = {
    reset() {
      B(e);
    },
    destroy() {
      e.removeEventListener("submit", d), a?.removeEventListener("pageshow", c), i.removeEventListener("go-admin:enhanced-fragments-applied", A), p.delete(e);
    }
  };
  return p.set(e, M), M;
}
function B(e = document) {
  I(e);
}
function X(e = {}) {
  const t = e.root ?? document;
  let n = p.get(t) ?? null;
  return C(() => {
    n = g(t, e);
  }), {
    reset() {
      n?.reset();
    },
    destroy() {
      n?.destroy();
    }
  };
}
function z(e) {
  return e.nodeType === 9 ? e : e.ownerDocument || document;
}
function J(e, t) {
  const n = t.defaultView;
  return n?.HTMLFormElement && e instanceof n.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement ? e : null;
}
function K(e, t, n) {
  const i = e.submitter;
  if (!i) return null;
  const a = n.defaultView;
  return (a?.HTMLButtonElement && i instanceof a.HTMLButtonElement || a?.HTMLInputElement && i instanceof a.HTMLInputElement || typeof HTMLButtonElement < "u" && i instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && i instanceof HTMLInputElement) && i.form === t ? i : null;
}
export {
  v as a,
  V as c,
  o as i,
  g as n,
  T as o,
  B as r,
  I as s,
  X as t
};

//# sourceMappingURL=behaviors-Bmn4Elwz.js.map
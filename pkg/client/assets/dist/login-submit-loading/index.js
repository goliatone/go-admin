import { onReady as p } from "../shared/dom-ready.js";
var g = "form[data-submit-loading-form]", c = "true", d = /* @__PURE__ */ new WeakMap(), m = /* @__PURE__ */ new WeakSet();
function A(t) {
  return t.nodeType === 9 ? t : t.ownerDocument || document;
}
function L(t, e, n) {
  const a = n.defaultView;
  return a?.HTMLFormElement && t instanceof a.HTMLFormElement && t.matches(e) || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement && t.matches(e) ? t : null;
}
function v(t) {
  const e = t.tagName.toLowerCase();
  if (e === "button") return !0;
  if (e !== "input") return !1;
  const n = (t.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "button" || n === "image";
}
function y(t) {
  if (!t) return !1;
  const e = t.tagName.toLowerCase();
  if (e === "button") return (t.getAttribute("type") || "submit").trim().toLowerCase() === "submit";
  if (e !== "input") return !1;
  const n = (t.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "image";
}
function h(t) {
  return Array.from(t.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"]')).filter(v);
}
function w(t, e, n) {
  const a = t.submitter;
  if (!a) return null;
  const i = n.defaultView;
  return (i?.HTMLButtonElement && a instanceof i.HTMLButtonElement || i?.HTMLInputElement && a instanceof i.HTMLInputElement || typeof HTMLButtonElement < "u" && a instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && a instanceof HTMLInputElement) && a.form === e ? a : null;
}
function E(t, e) {
  return t.noValidate || e?.hasAttribute("formnovalidate") === !0 || e?.formNoValidate === !0;
}
function l(t, e, n, a) {
  const i = e.ownerDocument.createElement("input");
  i.type = "hidden", i.name = n, i.value = a, i.dataset.submitLoadingGenerated = c, e.appendChild(i), t.generatedInputs.push(i);
}
function S(t, e, n) {
  if (!e || !y(e) || e.disabled) return;
  const a = {
    action: t.getAttribute("action"),
    method: t.getAttribute("method"),
    enctype: t.getAttribute("enctype"),
    target: t.getAttribute("target"),
    noValidate: t.noValidate
  };
  let i = !1;
  for (const [s, u] of [
    ["formaction", "action"],
    ["formmethod", "method"],
    ["formenctype", "enctype"],
    ["formtarget", "target"]
  ]) e.hasAttribute(s) && (t.setAttribute(u, e.getAttribute(s) ?? ""), i = !0);
  (e.hasAttribute("formnovalidate") || e.formNoValidate) && (t.noValidate = !0, i = !0), i && (n.overrides = a);
  const r = e.getAttribute("name")?.trim();
  if (r) {
    if ((e.tagName.toLowerCase() === "input" ? (e.getAttribute("type") || "text").trim().toLowerCase() : "submit") === "image") {
      l(n, t, `${r}.x`, "0"), l(n, t, `${r}.y`, "0");
      return;
    }
    l(n, t, r, e.getAttribute("value") ?? "");
  }
}
function T(t, e, n) {
  const a = h(t);
  e && !a.includes(e) && a.push(e);
  for (const i of a) {
    n.controls.push({
      control: i,
      disabled: i.disabled,
      ariaLabel: i.getAttribute("aria-label")
    });
    const r = i.dataset.submitLoadingBusyLabel?.trim();
    r && i.setAttribute("aria-label", r), i.disabled = !0;
  }
}
function M(t, e = null) {
  if (t.dataset.submitLoadingActive === "true") return;
  const n = {
    ariaBusy: t.getAttribute("aria-busy"),
    controls: [],
    generatedInputs: [],
    overrides: null
  };
  t.setAttribute("aria-busy", "true"), t.dataset.loading = c, t.dataset.submitLoadingActive = c, S(t, e, n), T(t, e, n), d.set(t, n);
}
function V(t) {
  const e = d.get(t);
  if (e) {
    e.ariaBusy === null ? t.removeAttribute("aria-busy") : t.setAttribute("aria-busy", e.ariaBusy);
    for (const n of e.controls)
      n.control.disabled = n.disabled, n.ariaLabel === null ? n.control.removeAttribute("aria-label") : n.control.setAttribute("aria-label", n.ariaLabel);
    for (const n of e.generatedInputs) n.remove();
    e.overrides && (e.overrides.action === null ? t.removeAttribute("action") : t.setAttribute("action", e.overrides.action), e.overrides.method === null ? t.removeAttribute("method") : t.setAttribute("method", e.overrides.method), e.overrides.enctype === null ? t.removeAttribute("enctype") : t.setAttribute("enctype", e.overrides.enctype), e.overrides.target === null ? t.removeAttribute("target") : t.setAttribute("target", e.overrides.target), t.noValidate = e.overrides.noValidate);
  } else (t.dataset.submitLoadingActive === "true" || t.dataset.loading === "true") && t.removeAttribute("aria-busy");
  delete t.dataset.loading, delete t.dataset.submitLoadingActive, d.delete(t);
}
function f(t = document, e = g) {
  t.querySelectorAll(e).forEach((n) => {
    (d.has(n) || n.dataset.submitLoadingActive === "true" || n.dataset.loading === "true") && V(n);
  });
}
function C(t = {}) {
  const e = t.root ?? document, n = t.formSelector || "form[data-submit-loading-form]", a = A(e), i = t.window ?? a.defaultView ?? window, r = (u) => {
    const o = L(u.target, n, a);
    if (!o || u.defaultPrevented || m.has(u)) return;
    if (o.dataset.submitLoadingActive === "true") {
      u.preventDefault();
      return;
    }
    const b = w(u, o, a);
    !E(o, b) && typeof o.checkValidity == "function" && !o.checkValidity() || (m.add(u), M(o, b));
  }, s = () => {
    f(e, n);
  };
  return e.addEventListener("submit", r), i?.addEventListener("pageshow", s), {
    reset() {
      f(e, n);
    },
    destroy() {
      e.removeEventListener("submit", r), i?.removeEventListener("pageshow", s);
    }
  };
}
function H(t = {}) {
  p(() => {
    C(t);
  });
}
export {
  c as SUBMIT_LOADING_ACTIVE_VALUE,
  g as SUBMIT_LOADING_FORM_SELECTOR,
  H as bootstrapSubmitLoadingForms,
  C as initSubmitLoadingForms,
  V as resetSubmitLoading,
  f as resetSubmitLoadingForms,
  M as setSubmitLoading
};

//# sourceMappingURL=index.js.map
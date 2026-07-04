import { onReady as r } from "../shared/dom-ready.js";
import { c as u, n as s, o as n } from "../chunks/behaviors-JUmide29.js";
var a = "form[data-submit-loading-form]", L = "true";
function g(t, o = null) {
  u(t, {
    submitter: o,
    compatibilitySubmitLoading: !0
  });
}
function y(t) {
  n(t);
}
function m(t = document, o = a) {
  d(t, o).forEach((e) => {
    (e.dataset.submitLoadingActive === "true" || e.dataset.loading === "true" || e.dataset.busy === "true" || e.getAttribute("aria-busy") === "true") && n(e);
  });
}
function c(t = {}) {
  const o = t.root ?? document, e = t.formSelector || "form[data-submit-loading-form]", i = s(o, {
    submitBusySelector: e,
    window: t.window,
    compatibilitySubmitLoading: !0
  });
  return {
    reset() {
      m(o, e);
    },
    destroy() {
      i.destroy();
    }
  };
}
function S(t = {}) {
  r(() => {
    c(t);
  });
}
function d(t, o) {
  const e = [];
  return f(t) && t.matches(o) && e.push(t), t.querySelectorAll(o).forEach((i) => {
    e.includes(i) || e.push(i);
  }), e;
}
function f(t) {
  const o = t.nodeType === 9 ? t.defaultView : t.ownerDocument?.defaultView;
  return o?.HTMLFormElement && t instanceof o.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement;
}
export {
  L as SUBMIT_LOADING_ACTIVE_VALUE,
  a as SUBMIT_LOADING_FORM_SELECTOR,
  S as bootstrapSubmitLoadingForms,
  c as initSubmitLoadingForms,
  y as resetSubmitLoading,
  m as resetSubmitLoadingForms,
  g as setSubmitLoading
};

//# sourceMappingURL=index.js.map
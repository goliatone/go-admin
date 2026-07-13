import { onReady as r } from "../shared/dom-ready.js";
import { d as o, n as u, p as s } from "../chunks/behaviors-3r2n03MZ.js";
var a = "form[data-submit-loading-form]", L = "true";
function g(t, i = null) {
  s(t, {
    submitter: i,
    compatibilitySubmitLoading: !0
  });
}
function y(t) {
  o(t);
}
function m(t = document, i = a) {
  c(t, i).forEach((e) => {
    (e.dataset.submitLoadingActive === "true" || e.dataset.loading === "true" || e.dataset.busy === "true" || e.getAttribute("aria-busy") === "true") && o(e);
  });
}
function d(t = {}) {
  const i = t.root ?? document, e = t.formSelector || "form[data-submit-loading-form]", n = u(i, {
    submitBusySelector: e,
    window: t.window,
    compatibilitySubmitLoading: !0
  });
  return {
    reset() {
      m(i, e);
    },
    destroy() {
      n.destroy();
    }
  };
}
function S(t = {}) {
  r(() => {
    d(t);
  });
}
function c(t, i) {
  const e = [];
  return f(t) && t.matches(i) && e.push(t), t.querySelectorAll(i).forEach((n) => {
    e.includes(n) || e.push(n);
  }), e;
}
function f(t) {
  const i = t.nodeType === 9 ? t.defaultView : t.ownerDocument?.defaultView;
  return i?.HTMLFormElement && t instanceof i.HTMLFormElement || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement;
}
export {
  L as SUBMIT_LOADING_ACTIVE_VALUE,
  a as SUBMIT_LOADING_FORM_SELECTOR,
  S as bootstrapSubmitLoadingForms,
  d as initSubmitLoadingForms,
  y as resetSubmitLoading,
  m as resetSubmitLoadingForms,
  g as setSubmitLoading
};

//# sourceMappingURL=index.js.map
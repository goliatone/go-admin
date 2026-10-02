import { onReady as r } from "../shared/dom-ready.js";
import { a as u, r as n } from "../chunks/busy-D8dMtGI2.js";
import { n as s } from "../chunks/behaviors-BtQcyG0z.js";
var a = "form[data-submit-loading-form]", g = "true";
function y(t, o = null) {
  u(t, {
    submitter: o,
    compatibilitySubmitLoading: !0
  });
}
function S(t) {
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
function E(t = {}) {
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
  g as SUBMIT_LOADING_ACTIVE_VALUE,
  a as SUBMIT_LOADING_FORM_SELECTOR,
  E as bootstrapSubmitLoadingForms,
  c as initSubmitLoadingForms,
  S as resetSubmitLoading,
  m as resetSubmitLoadingForms,
  y as setSubmitLoading
};

//# sourceMappingURL=index.js.map
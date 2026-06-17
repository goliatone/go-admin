import { onReady as p } from "../shared/dom-ready.js";
var A = "form[data-submit-loading-form]", b = "true", d = /* @__PURE__ */ new WeakMap(), m = /* @__PURE__ */ new WeakSet();
function L(t) {
  return t.nodeType === 9 ? t : t.ownerDocument || document;
}
function v(t, e, n) {
  const r = n.defaultView;
  return r?.HTMLFormElement && t instanceof r.HTMLFormElement && t.matches(e) || typeof HTMLFormElement < "u" && t instanceof HTMLFormElement && t.matches(e) ? t : null;
}
function y(t) {
  const e = t.tagName.toLowerCase();
  if (e === "button") return !0;
  if (e !== "input") return !1;
  const n = (t.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "button" || n === "image";
}
function h(t) {
  if (!t) return !1;
  const e = t.tagName.toLowerCase();
  if (e === "button") return (t.getAttribute("type") || "submit").trim().toLowerCase() === "submit";
  if (e !== "input") return !1;
  const n = (t.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "image";
}
function w(t) {
  return Array.from(t.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"]')).filter(y);
}
function S(t, e, n) {
  const r = t.submitter;
  if (!r) return null;
  const i = n.defaultView;
  return (i?.HTMLButtonElement && r instanceof i.HTMLButtonElement || i?.HTMLInputElement && r instanceof i.HTMLInputElement || typeof HTMLButtonElement < "u" && r instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && r instanceof HTMLInputElement) && r.form === e ? r : null;
}
function E(t, e) {
  return t.noValidate || e?.hasAttribute("formnovalidate") === !0 || e?.formNoValidate === !0;
}
function c(t, e, n, r, i = null) {
  const a = e.ownerDocument.createElement("input");
  return a.type = "hidden", a.name = n, a.value = r, a.dataset.submitLoadingGenerated = b, i && i.parentNode === e ? i.after(a) : e.appendChild(a), t.generatedInputs.push(a), a;
}
function T(t, e, n) {
  if (!e || !h(e) || e.disabled) return;
  const r = {
    action: t.getAttribute("action"),
    method: t.getAttribute("method"),
    enctype: t.getAttribute("enctype"),
    target: t.getAttribute("target"),
    noValidate: t.noValidate
  };
  let i = !1;
  for (const [s, o] of [
    ["formaction", "action"],
    ["formmethod", "method"],
    ["formenctype", "enctype"],
    ["formtarget", "target"]
  ]) e.hasAttribute(s) && (t.setAttribute(o, e.getAttribute(s) ?? ""), i = !0);
  (e.hasAttribute("formnovalidate") || e.formNoValidate) && (t.noValidate = !0, i = !0), i && (n.overrides = r);
  const a = e.getAttribute("name")?.trim();
  if (a) {
    if ((e.tagName.toLowerCase() === "input" ? (e.getAttribute("type") || "text").trim().toLowerCase() : "submit") === "image") {
      const s = c(n, t, `${a}.x`, "0", e);
      c(n, t, `${a}.y`, "0", s);
      return;
    }
    c(n, t, a, e.getAttribute("value") ?? "", e);
  }
}
function C(t, e) {
  const n = e?.getAttribute("formtarget");
  return n ?? t.getAttribute("target") ?? "";
}
function M(t, e) {
  const n = C(t, e).trim().toLowerCase();
  return n !== "" && n !== "_self";
}
function V(t, e, n) {
  const r = w(t);
  e && !r.includes(e) && r.push(e);
  for (const i of r) {
    n.controls.push({
      control: i,
      disabled: i.disabled,
      ariaLabel: i.getAttribute("aria-label")
    });
    const a = i.dataset.submitLoadingBusyLabel?.trim();
    a && i.setAttribute("aria-label", a), i.disabled = !0;
  }
}
function I(t, e = null) {
  if (t.dataset.submitLoadingActive === "true") return;
  const n = {
    ariaBusy: t.getAttribute("aria-busy"),
    controls: [],
    generatedInputs: [],
    overrides: null
  };
  t.setAttribute("aria-busy", "true"), t.dataset.loading = b, t.dataset.submitLoadingActive = b, T(t, e, n), V(t, e, n), d.set(t, n);
}
function g(t) {
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
function f(t = document, e = A) {
  t.querySelectorAll(e).forEach((n) => {
    (d.has(n) || n.dataset.submitLoadingActive === "true" || n.dataset.loading === "true") && g(n);
  });
}
function H(t = {}) {
  const e = t.root ?? document, n = t.formSelector || "form[data-submit-loading-form]", r = L(e), i = t.window ?? r.defaultView ?? window, a = (o) => {
    const u = v(o.target, n, r);
    if (!u || o.defaultPrevented || m.has(o)) return;
    if (u.dataset.submitLoadingActive === "true") {
      o.preventDefault();
      return;
    }
    const l = S(o, u, r);
    !E(u, l) && typeof u.checkValidity == "function" && !u.checkValidity() || (m.add(o), I(u, l), M(u, l) && i?.setTimeout(() => {
      g(u);
    }, 0));
  }, s = () => {
    f(e, n);
  };
  return e.addEventListener("submit", a), i?.addEventListener("pageshow", s), {
    reset() {
      f(e, n);
    },
    destroy() {
      e.removeEventListener("submit", a), i?.removeEventListener("pageshow", s);
    }
  };
}
function B(t = {}) {
  p(() => {
    H(t);
  });
}
export {
  b as SUBMIT_LOADING_ACTIVE_VALUE,
  A as SUBMIT_LOADING_FORM_SELECTOR,
  B as bootstrapSubmitLoadingForms,
  H as initSubmitLoadingForms,
  g as resetSubmitLoading,
  f as resetSubmitLoadingForms,
  I as setSubmitLoading
};

//# sourceMappingURL=index.js.map
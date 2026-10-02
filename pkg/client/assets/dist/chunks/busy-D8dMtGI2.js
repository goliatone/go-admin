var s = "true", l = /* @__PURE__ */ new WeakMap();
function A(e) {
  return e ? l.has(e) || e.dataset.busy === "true" || e.dataset.submitLoadingActive === "true" || e.getAttribute("aria-busy") === "true" : !1;
}
function F(e, t = {}) {
  const n = l.get(e);
  if (n) return p(n);
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
  e.setAttribute("aria-busy", s), e.dataset.busy = s, (t.compatibilitySubmitLoading || e.hasAttribute("data-submit-loading-form")) && (e.dataset.loading = s, e.dataset.submitLoadingActive = s), o(e) && V(e, c(t.submitter), i);
  const u = h(e, t), a = t.indicator === "submitter" ? c(t.submitter) : null;
  for (const r of u) {
    if (C(r, i), t.indicator === "submitter" && r !== a) {
      r.disabled = !0;
      continue;
    }
    w(r, t, i);
  }
  return l.set(e, i), p(i);
}
function y(e) {
  if (!e) return;
  const t = l.get(e);
  if (!t) {
    e.dataset.busy === "true" && (delete e.dataset.busy, e.removeAttribute("aria-busy")), (e.dataset.submitLoadingActive === "true" || e.dataset.loading === "true") && (delete e.dataset.loading, delete e.dataset.submitLoadingActive);
    return;
  }
  d(e, "aria-busy", t.ariaBusy), b(e, "busy", t.dataBusy), b(e, "loading", t.dataLoading), b(e, "submitLoadingActive", t.dataSubmitLoadingActive);
  for (const n of t.controls)
    n.control.disabled = n.disabled, d(n.control, "aria-label", n.ariaLabel);
  for (const n of t.labels) n.innerHTML !== void 0 ? n.element.innerHTML = n.innerHTML : n.element.textContent = n.textContent;
  for (const n of t.inputValues) n.input.value = n.value;
  for (const n of t.spinners) n.element.hidden = n.hidden;
  for (const n of t.generatedInputs) n.remove();
  for (const n of t.generatedSpinners) n.remove();
  t.overrides && o(e) && D(e, t.overrides), l.delete(e);
}
function q(e = document) {
  const t = E(e), n = [];
  g(e) && A(e) && n.push(e), e.querySelectorAll('[data-busy="true"], [data-submit-loading-active="true"], [aria-busy="true"]').forEach((i) => {
    g(i) && n.push(i);
  }), t.querySelectorAll('form[data-submit-loading-form][data-loading="true"]').forEach((i) => {
    (e.contains?.(i) || e === t) && n.push(i);
  });
  for (const i of Array.from(new Set(n))) y(i);
}
function G(e, t) {
  const n = c(t);
  return e.noValidate || n?.hasAttribute("formnovalidate") === !0 || n?.formNoValidate === !0;
}
function O(e, t) {
  return T(e.ownerDocument, I(e, c(t)));
}
function T(e, t) {
  const n = N(e, t).toLowerCase();
  return n !== "" && n !== "_self";
}
function p(e) {
  return {
    root: e.root,
    reset() {
      y(e.root);
    }
  };
}
function E(e) {
  return e.nodeType === 9 ? e : e.ownerDocument || document;
}
function g(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLElement && e instanceof t.HTMLElement || typeof HTMLElement < "u" && e instanceof HTMLElement);
}
function o(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLFormElement && e instanceof t.HTMLFormElement || typeof HTMLFormElement < "u" && e instanceof HTMLFormElement);
}
function f(e) {
  const t = e?.ownerDocument?.defaultView;
  return !!e && (t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || t?.HTMLTextAreaElement && e instanceof t.HTMLTextAreaElement || t?.HTMLSelectElement && e instanceof t.HTMLSelectElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && e instanceof HTMLInputElement || typeof HTMLTextAreaElement < "u" && e instanceof HTMLTextAreaElement || typeof HTMLSelectElement < "u" && e instanceof HTMLSelectElement);
}
function c(e) {
  if (!e) return null;
  const t = e.ownerDocument?.defaultView;
  return t?.HTMLButtonElement && e instanceof t.HTMLButtonElement || t?.HTMLInputElement && e instanceof t.HTMLInputElement || typeof HTMLButtonElement < "u" && e instanceof HTMLButtonElement || typeof HTMLInputElement < "u" && e instanceof HTMLInputElement ? e : null;
}
function M(e) {
  const t = e.tagName.toLowerCase();
  if (t === "button") return !0;
  if (t !== "input") return !1;
  const n = (e.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "button" || n === "image";
}
function H(e) {
  if (!e) return !1;
  const t = e.tagName.toLowerCase();
  if (t === "button") return (e.getAttribute("type") || "submit").trim().toLowerCase() === "submit";
  if (t !== "input") return !1;
  const n = (e.getAttribute("type") || "text").trim().toLowerCase();
  return n === "submit" || n === "image";
}
function h(e, t) {
  const n = [];
  for (const i of t.controls ?? []) f(i) && !n.includes(i) && n.push(i);
  if (f(t.submitter) && !n.includes(t.submitter) && n.push(t.submitter), f(e) && !n.includes(e) && n.push(e), t.includeDescendantControls !== !1) {
    const i = o(e) ? 'button, input[type="submit"], input[type="button"], input[type="image"]' : 'button, input[type="submit"], input[type="button"], input[type="image"], select, textarea';
    e.querySelectorAll(i).forEach((u) => {
      (o(e) ? M(u) : f(u)) && !n.includes(u) && n.push(u);
    });
  }
  return n;
}
function C(e, t) {
  t.controls.push({
    control: e,
    disabled: e.disabled,
    ariaLabel: e.getAttribute("aria-label")
  });
}
function w(e, t, n) {
  const i = S(e, t);
  if (i) {
    e.setAttribute("aria-label", i);
    const a = B(e);
    a ? (n.labels.push({
      element: a,
      textContent: a.textContent
    }), a.textContent = i) : e instanceof HTMLButtonElement ? (n.labels.push({
      element: e,
      textContent: e.textContent,
      innerHTML: e.innerHTML
    }), e.textContent = i) : e instanceof HTMLInputElement && (n.inputValues.push({
      input: e,
      value: e.value
    }), e.value = i);
  }
  const u = x(e) || v(e, t, n);
  u && (n.spinners.push({
    element: u,
    hidden: u.hidden
  }), u.hidden = !1), e.disabled = !0;
}
function S(e, t) {
  return String(t.label || e.getAttribute("data-busy-label") || e.getAttribute("data-submit-loading-busy-label") || "").trim();
}
function B(e) {
  return e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input" ? null : e.querySelector("[data-busy-label-target], [data-submit-loading-label]");
}
function x(e) {
  return e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input" ? null : e.querySelector("[data-busy-spinner], .submit-loading-spinner");
}
function v(e, t, n) {
  if (!t.generateSpinner && !e.hasAttribute("data-busy-button") || e instanceof HTMLInputElement && e.tagName.toLowerCase() === "input") return null;
  const i = e.ownerDocument.createElement("span");
  return i.setAttribute("data-busy-spinner", ""), i.setAttribute("data-busy-generated-spinner", "true"), i.setAttribute("aria-hidden", "true"), i.className = "busy-spinner", e.insertBefore(i, e.firstChild), n.generatedSpinners.push(i), i;
}
function m(e, t, n, i, u = null) {
  const a = t.ownerDocument.createElement("input");
  return a.type = "hidden", a.name = n, a.value = i, a.dataset.busyGenerated = s, a.dataset.submitLoadingGenerated = s, u && u.parentNode === t ? u.after(a) : t.appendChild(a), e.generatedInputs.push(a), a;
}
function V(e, t, n) {
  if (!t || !H(t) || t.disabled) return;
  const i = {
    action: e.getAttribute("action"),
    method: e.getAttribute("method"),
    enctype: e.getAttribute("enctype"),
    target: e.getAttribute("target"),
    noValidate: e.noValidate
  };
  let u = !1;
  for (const [r, L] of [
    ["formaction", "action"],
    ["formmethod", "method"],
    ["formenctype", "enctype"],
    ["formtarget", "target"]
  ]) t.hasAttribute(r) && (e.setAttribute(L, t.getAttribute(r) ?? ""), u = !0);
  (t.hasAttribute("formnovalidate") || t.formNoValidate) && (e.noValidate = !0, u = !0), u && (n.overrides = i);
  const a = t.getAttribute("name")?.trim();
  if (a) {
    if ((t.tagName.toLowerCase() === "input" ? (t.getAttribute("type") || "text").trim().toLowerCase() : "submit") === "image") {
      const r = m(n, e, `${a}.x`, "0", t);
      m(n, e, `${a}.y`, "0", r);
      return;
    }
    m(n, e, a, t.getAttribute("value") ?? "", t);
  }
}
function I(e, t) {
  const n = t?.getAttribute("formtarget");
  return n ?? e.getAttribute("target") ?? "";
}
function N(e, t) {
  const n = String(t ?? "").trim();
  return n || (e.querySelector("base[target]")?.getAttribute("target")?.trim() ?? "");
}
function D(e, t) {
  d(e, "action", t.action), d(e, "method", t.method), d(e, "enctype", t.enctype), d(e, "target", t.target), e.noValidate = t.noValidate;
}
function d(e, t, n) {
  n === null ? e.removeAttribute(t) : e.setAttribute(t, n);
}
function b(e, t, n) {
  n === void 0 ? delete e.dataset[t] : e.dataset[t] = n;
}
export {
  F as a,
  T as c,
  q as i,
  A as n,
  O as o,
  y as r,
  G as s,
  s as t
};

//# sourceMappingURL=busy-D8dMtGI2.js.map
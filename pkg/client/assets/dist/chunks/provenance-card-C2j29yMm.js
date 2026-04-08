import { d as u, l as g, t as i } from "./dom-helpers-PJrpTqcW.js";
var s = "[data-lineage-card]", E = "[data-evidence-toggle]", f = '[data-evidence-item="collapsed"]', d = "[data-evidence-container]";
function c(e) {
  const t = e.querySelector(E);
  if (!t) return;
  const n = e.querySelectorAll(f);
  if (n.length === 0) return;
  const a = t.textContent?.trim() || "", o = n.length;
  t._evidenceToggleCleanup = g(t, "click", () => {
    t.getAttribute("aria-expanded") === "true" ? (n.forEach((r) => {
      r.classList.add("hidden");
    }), t.setAttribute("aria-expanded", "false"), t.textContent = a, i(`Collapsed ${o} evidence items`)) : (n.forEach((r) => {
      r.classList.remove("hidden");
    }), t.setAttribute("aria-expanded", "true"), t.textContent = "Show fewer items", i(`Showing all ${o} additional evidence items`));
  });
}
function m() {
  u(d).forEach((e) => {
    e instanceof HTMLElement && c(e);
  });
}
var C = {
  enableEvidenceToggle: !0,
  enableFingerprintPolling: !1,
  fingerprintPollInterval: 5e3,
  root: null
};
function l(e = {}) {
  const t = {
    ...C,
    ...e
  };
  if (t.enableEvidenceToggle) {
    const n = t.root ?? (typeof document < "u" ? document : null);
    if (!n) return;
    n.querySelectorAll(d).forEach((a) => {
      a instanceof HTMLElement && c(a);
    });
  }
}
function p() {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => {
    l();
  }) : l();
}
function A() {
  return Array.from(document.querySelectorAll(s));
}
function S(e) {
  return e.closest(s);
}
function L(e) {
  return e.querySelector("[data-lineage-warnings]") !== null;
}
function T(e) {
  return e.querySelector("[data-lineage-empty-state]") !== null;
}
function h(e) {
  return e.getAttribute("data-lineage-status");
}
function _(e) {
  return e.getAttribute("data-lineage-kind");
}
export {
  s as a,
  S as c,
  T as d,
  L as f,
  l as h,
  E as i,
  A as l,
  c as m,
  f as n,
  p as o,
  m as p,
  d as r,
  h as s,
  C as t,
  _ as u
};

//# sourceMappingURL=provenance-card-C2j29yMm.js.map
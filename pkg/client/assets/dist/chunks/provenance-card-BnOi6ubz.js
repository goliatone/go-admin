import { q as E, o as g, a as r } from "./dom-helpers-cltCUiC5.js";
const c = "[data-lineage-card]", f = "[data-evidence-toggle]", C = '[data-evidence-item="collapsed"]', l = "[data-evidence-container]";
function d(e) {
  const t = e.querySelector(f);
  if (!t) return;
  const n = e.querySelectorAll(C);
  if (n.length === 0) return;
  const i = t.textContent?.trim() || "", a = n.length, u = g(t, "click", () => {
    t.getAttribute("aria-expanded") === "true" ? (n.forEach((o) => {
      o.classList.add("hidden");
    }), t.setAttribute("aria-expanded", "false"), t.textContent = i, r(`Collapsed ${a} evidence items`)) : (n.forEach((o) => {
      o.classList.remove("hidden");
    }), t.setAttribute("aria-expanded", "true"), t.textContent = "Show fewer items", r(`Showing all ${a} additional evidence items`));
  });
  t._evidenceToggleCleanup = u;
}
function A() {
  E(l).forEach((t) => {
    t instanceof HTMLElement && d(t);
  });
}
const m = {
  enableEvidenceToggle: !0,
  enableFingerprintPolling: !1,
  fingerprintPollInterval: 5e3,
  root: null
  // Lazily defaults to document in initProvenanceCards
};
function s(e = {}) {
  const t = { ...m, ...e };
  if (t.enableEvidenceToggle) {
    const n = t.root ?? (typeof document < "u" ? document : null);
    if (!n) return;
    n.querySelectorAll(l).forEach((a) => {
      a instanceof HTMLElement && d(a);
    });
  }
}
function S() {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => {
    s();
  }) : s();
}
function L() {
  return Array.from(document.querySelectorAll(c));
}
function T(e) {
  return e.closest(c);
}
function h(e) {
  return e.querySelector("[data-lineage-warnings]") !== null;
}
function _(e) {
  return e.querySelector("[data-lineage-empty-state]") !== null;
}
function y(e) {
  return e.getAttribute("data-lineage-status");
}
function O(e) {
  return e.getAttribute("data-lineage-kind");
}
export {
  m as D,
  f as E,
  c as P,
  A as a,
  S as b,
  d as c,
  T as d,
  _ as e,
  y as f,
  L as g,
  h,
  s as i,
  O as j,
  C as k,
  l
};
//# sourceMappingURL=provenance-card-BnOi6ubz.js.map

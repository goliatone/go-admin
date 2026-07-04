import { t as r } from "./dom-helpers-DCJA_7zh.js";
function c() {
  return window.toastManager ?? null;
}
function i(t, n) {
  t && (t.textContent = n), r(n);
}
function u(t, n, o) {
  const a = c()?.[n];
  if (typeof a == "function") {
    a(t);
    return;
  }
  if (!o?.alertFallback || typeof window.alert != "function") return;
  const e = n.charAt(0).toUpperCase() + n.slice(1);
  window.alert(`${e}: ${t}`);
}
export {
  u as n,
  i as t
};

//# sourceMappingURL=page-feedback-f1MJ2ewQ.js.map
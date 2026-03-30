import { a as r } from "./dom-helpers-Cd24RS2-.js";
function c() {
  return window.toastManager ?? null;
}
function f(n, a) {
  n && (n.textContent = a), r(a);
}
function u(n, a, o) {
  const t = c()?.[a];
  if (typeof t == "function") {
    t(n);
    return;
  }
  if (!o?.alertFallback || typeof window.alert != "function")
    return;
  const e = a.charAt(0).toUpperCase() + a.slice(1);
  window.alert(`${e}: ${n}`);
}
export {
  f as a,
  u as s
};
//# sourceMappingURL=page-feedback-GAI02g1h.js.map

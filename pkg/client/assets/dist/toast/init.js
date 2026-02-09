import { T as a } from "../chunks/toast-manager-DS2ghjI8.js";
import { e as s, g as i } from "../chunks/error-helpers-reYGXKKl.js";
function n(t) {
  const o = new a({ position: t || "top-right" });
  return window.toastManager = o, window.notify = {
    success: (r, e) => o.success(r, e),
    error: (r, e) => o.error(r, e),
    warning: (r, e) => o.warning(r, e),
    info: (r, e) => o.info(r, e),
    confirm: (r, e) => o.confirm(r, e)
  }, window.extractErrorMessage = s, window.getErrorMessage = i, o;
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => n()) : n();
export {
  a as ToastManager,
  s as extractErrorMessage,
  i as getErrorMessage,
  n as initGlobalToastManager
};
//# sourceMappingURL=init.js.map

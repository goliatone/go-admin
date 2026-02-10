import { T as a } from "../chunks/toast-manager-IS2Hhucs.js";
import { extractErrorMessage as i, getErrorMessage as s } from "./error-helpers.js";
function n(t) {
  const o = new a({ position: t || "top-right" });
  return window.toastManager = o, window.notify = {
    success: (r, e) => o.success(r, e),
    error: (r, e) => o.error(r, e),
    warning: (r, e) => o.warning(r, e),
    info: (r, e) => o.info(r, e),
    confirm: (r, e) => o.confirm(r, e)
  }, window.extractErrorMessage = i, window.getErrorMessage = s, o;
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => n()) : n();
export {
  a as ToastManager,
  i as extractErrorMessage,
  s as getErrorMessage,
  n as initGlobalToastManager
};
//# sourceMappingURL=init.js.map

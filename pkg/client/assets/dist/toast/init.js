import "../chunks/modal-Bj9YWM2D.js";
import { n as a } from "../chunks/toast-manager-CLcahrEa.js";
import { extractErrorMessage as i, getErrorMessage as s } from "./error-helpers.js";
function n(t) {
  const e = new a({ position: t || "top-right" });
  return window.toastManager = e, window.notify = {
    success: (r, o) => e.success(r, o),
    error: (r, o) => e.error(r, o),
    warning: (r, o) => e.warning(r, o),
    info: (r, o) => e.info(r, o),
    confirm: (r, o) => e.confirm(r, o)
  }, window.extractErrorMessage = i, window.getErrorMessage = s, e;
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => n()) : n();
export {
  a as ToastManager,
  i as extractErrorMessage,
  s as getErrorMessage,
  n as initGlobalToastManager
};

//# sourceMappingURL=init.js.map
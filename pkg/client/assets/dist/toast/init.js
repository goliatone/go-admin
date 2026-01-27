import { T as t, e as s, g as i } from "../chunks/error-helpers-D8_e3UnS.js";
function n(a) {
  const o = new t({ position: a || "top-right" });
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
  t as ToastManager,
  s as extractErrorMessage,
  i as getErrorMessage,
  n as initGlobalToastManager
};
//# sourceMappingURL=init.js.map

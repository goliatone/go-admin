import { q as e } from "../chunks/dom-helpers-Cd24RS2-.js";
import { onReady as o } from "../shared/dom-ready.js";
class i {
  constructor(t = {}) {
    this.config = t;
  }
  /**
   * Initialize the error page
   */
  init() {
    this.setupEventListeners();
  }
  /**
   * Setup event listeners using delegation
   */
  setupEventListeners() {
    e('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), e('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
      n.hasAttribute("data-action") || n.addEventListener("click", () => this.handleRetry());
    });
  }
  /**
   * Handle retry action
   */
  handleRetry() {
    window.location.reload();
  }
}
function l(r = {}) {
  const t = new i(r);
  return o(() => t.init()), t;
}
function d(r = {}) {
  const t = new i(r);
  o(() => t.init()), typeof window < "u" && (window.esignErrorController = t);
}
export {
  i as SignerErrorPageController,
  d as bootstrapSignerErrorPage,
  l as initSignerErrorPage
};
//# sourceMappingURL=signer-error.js.map

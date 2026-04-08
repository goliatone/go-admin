import { onReady as e } from "../shared/dom-ready.js";
import { d as n } from "./dom-helpers-PJrpTqcW.js";
var i = class {
  constructor(r = {}) {
    this.config = r;
  }
  init() {
    this.setupEventListeners();
  }
  setupEventListeners() {
    n('[data-action="retry"]').forEach((r) => {
      r.addEventListener("click", () => this.handleRetry());
    }), n('.retry-btn, [aria-label*="Try Again"]').forEach((r) => {
      r.hasAttribute("data-action") || r.addEventListener("click", () => this.handleRetry());
    });
  }
  handleRetry() {
    window.location.reload();
  }
};
function s(r = {}) {
  const t = new i(r);
  return e(() => t.init()), t;
}
function c(r = {}) {
  const t = new i(r);
  e(() => t.init()), typeof window < "u" && (window.esignErrorController = t);
}
export {
  c as n,
  s as r,
  i as t
};

//# sourceMappingURL=signer-error-9FTI5inz.js.map
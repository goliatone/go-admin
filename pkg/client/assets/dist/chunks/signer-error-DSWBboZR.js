import { c as e, u as n } from "./dom-helpers-CDdChTSn.js";
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
function a(r = {}) {
  const t = new i(r);
  return e(() => t.init()), t;
}
function s(r = {}) {
  const t = new i(r);
  e(() => t.init()), typeof window < "u" && (window.esignErrorController = t);
}
export {
  s as n,
  a as r,
  i as t
};

//# sourceMappingURL=signer-error-DSWBboZR.js.map
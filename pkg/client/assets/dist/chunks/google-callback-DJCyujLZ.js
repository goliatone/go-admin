import { c as d, f as i, l as a, o as c } from "./dom-helpers-CDdChTSn.js";
var l = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
}, u = class {
  constructor(e) {
    this.config = e, this.elements = {
      loadingState: a("#loading-state"),
      successState: a("#success-state"),
      errorState: a("#error-state"),
      errorMessage: a("#error-message"),
      errorDetail: a("#error-detail"),
      closeBtn: a("#close-btn")
    };
  }
  init() {
    this.setupEventListeners(), this.processCallback();
  }
  setupEventListeners() {
    const { closeBtn: e } = this.elements;
    e && e.addEventListener("click", () => this.handleClose());
  }
  processCallback() {
    const e = new URLSearchParams(window.location.search), t = e.get("code"), o = e.get("error"), s = e.get("error_description"), r = e.get("state"), n = this.parseOAuthState(r);
    n.account_id || (n.account_id = (e.get("account_id") || "").trim()), o ? this.handleError(o, s, n) : t ? this.handleSuccess(t, n) : this.handleError("unknown", "No authorization code was received from Google.", n);
  }
  parseOAuthState(e) {
    const t = {
      user_id: "",
      account_id: ""
    };
    if (!e) return t;
    try {
      const o = JSON.parse(e);
      if (o && typeof o == "object")
        return typeof o.user_id == "string" && (t.user_id = o.user_id.trim()), typeof o.account_id == "string" && (t.account_id = o.account_id.trim()), t;
    } catch {
    }
    return t.user_id = String(e || "").trim(), t;
  }
  showState(e) {
    const { loadingState: t, successState: o, errorState: s } = this.elements;
    switch (c(t), c(o), c(s), e) {
      case "loading":
        i(t);
        break;
      case "success":
        i(o);
        break;
      case "error":
        i(s);
        break;
    }
  }
  sendToOpener(e) {
    window.opener && !window.opener.closed && window.opener.postMessage(e, "*");
  }
  handleError(e, t, o) {
    this.showState("error");
    const { errorMessage: s, errorDetail: r, closeBtn: n } = this.elements;
    s && (s.textContent = l[e] || l.unknown), t && r && (r.textContent = t, i(r)), this.sendToOpener({
      type: "google_oauth_callback",
      error: e,
      error_description: t || void 0,
      account_id: o.account_id || void 0
    }), this.setupCloseButton(o);
  }
  handleSuccess(e, t) {
    this.showState("success"), this.sendToOpener({
      type: "google_oauth_callback",
      code: e,
      account_id: t.account_id || void 0
    }), setTimeout(() => {
      window.close();
    }, 2e3), this.setupCloseButton(t);
  }
  setupCloseButton(e) {
    const { closeBtn: t } = this.elements;
    !window.opener && t && (t.textContent = "Return to App");
  }
  handleClose() {
    if (window.opener) window.close();
    else {
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, o = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), r = s.get("state"), n = this.parseOAuthState(r).account_id || s.get("account_id");
      n && o.searchParams.set("account_id", n), window.location.href = o.toString();
    }
  }
};
function p(e) {
  const t = new u(e || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  });
  return d(() => t.init()), t;
}
function g(e) {
  const t = new u({
    basePath: e,
    apiBasePath: `${e}/api`
  });
  d(() => t.init());
}
export {
  g as n,
  p as r,
  u as t
};

//# sourceMappingURL=google-callback-DJCyujLZ.js.map
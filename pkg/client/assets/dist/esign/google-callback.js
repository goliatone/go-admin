import { b as i, h as l, s as c, f as h } from "../chunks/dom-helpers-CMRVXsMj.js";
const u = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class p {
  constructor(e) {
    this.config = e, this.elements = {
      loadingState: i("#loading-state"),
      successState: i("#success-state"),
      errorState: i("#error-state"),
      errorMessage: i("#error-message"),
      errorDetail: i("#error-detail"),
      closeBtn: i("#close-btn")
    };
  }
  /**
   * Initialize the callback page
   */
  init() {
    this.setupEventListeners(), this.processCallback();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const { closeBtn: e } = this.elements;
    e && e.addEventListener("click", () => this.handleClose());
  }
  /**
   * Process the OAuth callback parameters
   */
  processCallback() {
    const e = new URLSearchParams(window.location.search), t = e.get("code"), o = e.get("error"), s = e.get("error_description"), n = e.get("state"), a = this.parseOAuthState(n);
    a.account_id || (a.account_id = (e.get("account_id") || "").trim()), o ? this.handleError(o, s, a) : t ? this.handleSuccess(t, a) : this.handleError("unknown", "No authorization code was received from Google.", a);
  }
  /**
   * Parse OAuth state parameter
   */
  parseOAuthState(e) {
    const t = {
      user_id: "",
      account_id: ""
    };
    if (!e)
      return t;
    try {
      const o = JSON.parse(e);
      if (o && typeof o == "object")
        return typeof o.user_id == "string" && (t.user_id = o.user_id.trim()), typeof o.account_id == "string" && (t.account_id = o.account_id.trim()), t;
    } catch {
    }
    return t.user_id = String(e || "").trim(), t;
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, successState: o, errorState: s } = this.elements;
    switch (l(t), l(o), l(s), e) {
      case "loading":
        c(t);
        break;
      case "success":
        c(o);
        break;
      case "error":
        c(s);
        break;
    }
  }
  /**
   * Send message to opener window
   */
  sendToOpener(e) {
    window.opener && !window.opener.closed && window.opener.postMessage(e, "*");
  }
  /**
   * Handle OAuth error
   */
  handleError(e, t, o) {
    this.showState("error");
    const { errorMessage: s, errorDetail: n, closeBtn: a } = this.elements;
    s && (s.textContent = u[e] || u.unknown), t && n && (n.textContent = t, c(n)), this.sendToOpener({
      type: "google_oauth_callback",
      error: e,
      error_description: t || void 0,
      account_id: o.account_id || void 0
    }), this.setupCloseButton(o);
  }
  /**
   * Handle OAuth success
   */
  handleSuccess(e, t) {
    this.showState("success"), this.sendToOpener({
      type: "google_oauth_callback",
      code: e,
      account_id: t.account_id || void 0
    }), setTimeout(() => {
      window.close();
    }, 2e3), this.setupCloseButton(t);
  }
  /**
   * Setup close button behavior based on whether this is a popup
   */
  setupCloseButton(e) {
    const { closeBtn: t } = this.elements;
    !window.opener && t && (t.textContent = "Return to App");
  }
  /**
   * Handle close button click
   */
  handleClose() {
    if (window.opener)
      window.close();
    else {
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, o = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), n = s.get("state"), d = this.parseOAuthState(n).account_id || s.get("account_id");
      d && o.searchParams.set("account_id", d), window.location.href = o.toString();
    }
  }
}
function w(r) {
  const e = r || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new p(e);
  return h(() => t.init()), t;
}
function _(r) {
  const e = {
    basePath: r,
    apiBasePath: `${r}/api`
  }, t = new p(e);
  h(() => t.init());
}
export {
  p as GoogleCallbackController,
  _ as bootstrapGoogleCallback,
  w as initGoogleCallback
};
//# sourceMappingURL=google-callback.js.map

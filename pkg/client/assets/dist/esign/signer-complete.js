import { b as s, s as l, h as f, f as r } from "../chunks/dom-helpers-CMRVXsMj.js";
const h = 3 * 60 * 1e3, u = 10 * 60 * 1e3, g = 2e3, p = 15e3, m = 15e3, w = 6e4;
function A(e) {
  return String(e || "").trim().toLowerCase();
}
function S(e) {
  if (!e || typeof e != "object")
    return null;
  const t = {
    executed: String(e.executed_url || "").trim() || null,
    source: String(e.source_url || "").trim() || null,
    certificate: String(e.certificate_url || "").trim() || null
  };
  return !!(t.executed || t.source || t.certificate) ? t : null;
}
function E(e, t = !1) {
  const i = e && typeof e == "object" && e.contract && typeof e.contract == "object" ? e.contract : {}, o = e && typeof e == "object" && e.assets && typeof e.assets == "object" ? e.assets : {}, n = S(o), a = A(i.agreement_status) === "completed" || t, d = a && !!n?.executed && !!n?.certificate;
  return {
    artifacts: n,
    agreementCompleted: a,
    completionPackageReady: d
  };
}
function P(e, t) {
  const i = Math.max(1, Math.floor(e || 1));
  return t ? Math.min(
    Math.round(g * Math.pow(1.6, i - 1)),
    m
  ) : Math.min(
    Math.round(p * Math.pow(1.5, i - 1)),
    w
  );
}
function y(e) {
  return e ? h : u;
}
class c {
  constructor(t) {
    this.pollTimerId = null, this.pollStartedAt = null, this.destroyed = !1, this.state = {
      loaded: !1,
      loading: !1,
      hasArtifacts: !1,
      retryCount: 0,
      agreementCompleted: !1,
      completionPackageReady: !1,
      autoPolling: !1
    }, this.config = t;
  }
  /**
   * Initialize the completion page
   */
  async init() {
    this.setupEventListeners(), await this.loadArtifacts({ resetPollingWindow: !0 });
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const t = s("#retry-artifacts-btn");
    t && t.addEventListener("click", () => {
      this.loadArtifacts({ resetPollingWindow: !0 });
    }), typeof window < "u" && window.addEventListener("pagehide", () => this.destroy(), { once: !0 });
  }
  /**
   * Load artifacts from the assets endpoint
   */
  async loadArtifacts(t = {}) {
    if (!(this.destroyed || this.state.loading)) {
      t.resetPollingWindow && this.resetPollingWindow(), this.state.loading = !0, this.clearScheduledPoll(), this.state.hasArtifacts || this.showArtifactState("loading");
      try {
        const i = await fetch(
          `${this.config.apiBasePath}/assets/${this.config.token}`,
          {
            method: "GET",
            headers: { Accept: "application/json" }
          }
        );
        if (!i.ok)
          throw new Error("Failed to load artifacts");
        const o = await i.json(), n = E(
          o && typeof o == "object" ? o : null,
          this.config.agreementCompleted
        ), a = n.artifacts;
        this.state.agreementCompleted = n.agreementCompleted, this.state.completionPackageReady = n.completionPackageReady, this.state.hasArtifacts = !!a, a ? (this.displayArtifacts(a), this.showArtifactState("available")) : this.showArtifactState("processing"), this.schedulePollingIfNeeded(), this.state.loaded = !0;
      } catch (i) {
        console.error("Artifact load error:", i), this.state.hasArtifacts ? this.showArtifactState("available") : this.config.hasServerDownloadUrl ? this.showArtifactState("fallback") : this.showArtifactState("unavailable"), this.schedulePollingIfNeeded();
      } finally {
        this.state.loading = !1;
      }
    }
  }
  /**
   * Stop active polling and release pending timers.
   */
  destroy() {
    this.destroyed = !0, this.clearScheduledPoll();
  }
  /**
   * Show a specific artifact section and hide others
   */
  showArtifactState(t) {
    ["loading", "processing", "available", "unavailable", "fallback"].forEach((o) => {
      const n = s(`#artifacts-${o}`);
      n && (o === t ? l(n) : f(n));
    });
  }
  schedulePollingIfNeeded() {
    if (this.destroyed || !this.shouldContinuePolling()) {
      this.state.autoPolling = !1;
      return;
    }
    this.pollStartedAt == null && (this.pollStartedAt = Date.now()), this.state.retryCount += 1, this.state.autoPolling = !0;
    const t = P(
      this.state.retryCount,
      this.state.agreementCompleted
    );
    this.pollTimerId = window.setTimeout(() => {
      this.pollTimerId = null, this.loadArtifacts();
    }, t);
  }
  shouldContinuePolling() {
    const t = this.pollStartedAt ?? Date.now(), i = Date.now() - t, o = y(this.state.agreementCompleted);
    return i < o && !this.state.completionPackageReady;
  }
  clearScheduledPoll() {
    this.pollTimerId != null && (clearTimeout(this.pollTimerId), this.pollTimerId = null);
  }
  resetPollingWindow() {
    this.clearScheduledPoll(), this.pollStartedAt = Date.now(), this.state.retryCount = 0, this.state.autoPolling = !1;
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(t) {
    if (t.executed) {
      const i = s("#artifact-executed"), o = s("#artifact-executed-link");
      i && o && (o.href = new URL(t.executed, window.location.origin).toString(), l(i));
    }
    if (t.source) {
      const i = s("#artifact-source"), o = s("#artifact-source-link");
      i && o && (o.href = new URL(t.source, window.location.origin).toString(), l(i));
    }
    if (t.certificate) {
      const i = s("#artifact-certificate"), o = s("#artifact-certificate-link");
      i && o && (o.href = new URL(t.certificate, window.location.origin).toString(), l(i));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function _(e) {
  const t = new c(e);
  return r(() => t.init()), t;
}
function C(e) {
  const t = new c(e);
  r(() => t.init()), typeof window < "u" && (window.esignCompletionController = t, window.loadArtifacts = () => t.loadArtifacts());
}
export {
  c as SignerCompletePageController,
  C as bootstrapSignerCompletePage,
  P as getSignerCompletionPollDelayMs,
  _ as initSignerCompletePage,
  S as resolveSignerCompleteArtifacts,
  E as resolveSignerCompletePayloadState
};
//# sourceMappingURL=signer-complete.js.map

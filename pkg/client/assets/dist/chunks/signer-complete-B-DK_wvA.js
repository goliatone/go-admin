import { readHTTPError as c } from "../shared/transport/http-client.js";
import { onReady as s } from "../shared/dom-ready.js";
import { c as d, p as n, u as o } from "./dom-helpers-PJrpTqcW.js";
var f = 180 * 1e3, h = 600 * 1e3, u = 2e3, g = 15e3, p = 15e3, m = 6e4;
function w(t) {
  return String(t || "").trim().toLowerCase();
}
function A(t) {
  if (!t || typeof t != "object") return null;
  const e = {
    executed: String(t.executed_url || "").trim() || null,
    source: String(t.source_url || "").trim() || null,
    certificate: String(t.certificate_url || "").trim() || null
  };
  return e.executed || e.source || e.certificate ? e : null;
}
function S(t, e = !1) {
  const i = t && typeof t == "object" && t.contract && typeof t.contract == "object" ? t.contract : {}, a = A(t && typeof t == "object" && t.assets && typeof t.assets == "object" ? t.assets : {}), r = w(i.agreement_status) === "completed" || e;
  return {
    artifacts: a,
    agreementCompleted: r,
    completionPackageReady: r && !!a?.executed && !!a?.certificate
  };
}
function E(t, e) {
  const i = Math.max(1, Math.floor(t || 1));
  return e ? Math.min(Math.round(u * Math.pow(1.6, i - 1)), p) : Math.min(Math.round(g * Math.pow(1.5, i - 1)), m);
}
function P(t) {
  return t ? f : h;
}
var l = class {
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
  async init() {
    this.setupEventListeners(), await this.loadArtifacts({ resetPollingWindow: !0 });
  }
  setupEventListeners() {
    const t = o("#retry-artifacts-btn");
    t && t.addEventListener("click", () => {
      this.loadArtifacts({ resetPollingWindow: !0 });
    }), typeof window < "u" && window.addEventListener("pagehide", () => this.destroy(), { once: !0 });
  }
  async loadArtifacts(t = {}) {
    if (!(this.destroyed || this.state.loading)) {
      t.resetPollingWindow && this.resetPollingWindow(), this.state.loading = !0, this.clearScheduledPoll(), this.state.hasArtifacts || this.showArtifactState("loading");
      try {
        const e = await fetch(`${this.config.apiBasePath}/assets/${this.config.token}`, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!e.ok) throw new Error(await c(e, "Failed to load artifacts", { appendStatusToFallback: !1 }));
        const i = await e.json(), a = S(i && typeof i == "object" ? i : null, this.config.agreementCompleted), r = a.artifacts;
        this.state.agreementCompleted = a.agreementCompleted, this.state.completionPackageReady = a.completionPackageReady, this.state.hasArtifacts = !!r, r ? (this.displayArtifacts(r), this.showArtifactState("available")) : this.showArtifactState("processing"), this.schedulePollingIfNeeded(), this.state.loaded = !0;
      } catch (e) {
        console.error("Artifact load error:", e), this.state.hasArtifacts ? this.showArtifactState("available") : this.config.hasServerDownloadUrl ? this.showArtifactState("fallback") : this.showArtifactState("unavailable"), this.schedulePollingIfNeeded();
      } finally {
        this.state.loading = !1;
      }
    }
  }
  destroy() {
    this.destroyed = !0, this.clearScheduledPoll();
  }
  showArtifactState(t) {
    [
      "loading",
      "processing",
      "available",
      "unavailable",
      "fallback"
    ].forEach((e) => {
      const i = o(`#artifacts-${e}`);
      i && (e === t ? n(i) : d(i));
    });
  }
  schedulePollingIfNeeded() {
    if (this.destroyed || !this.shouldContinuePolling()) {
      this.state.autoPolling = !1;
      return;
    }
    this.pollStartedAt == null && (this.pollStartedAt = Date.now()), this.state.retryCount += 1, this.state.autoPolling = !0;
    const t = E(this.state.retryCount, this.state.agreementCompleted);
    this.pollTimerId = window.setTimeout(() => {
      this.pollTimerId = null, this.loadArtifacts();
    }, t);
  }
  shouldContinuePolling() {
    const t = this.pollStartedAt ?? Date.now();
    return Date.now() - t < P(this.state.agreementCompleted) && !this.state.completionPackageReady;
  }
  clearScheduledPoll() {
    this.pollTimerId != null && (clearTimeout(this.pollTimerId), this.pollTimerId = null);
  }
  resetPollingWindow() {
    this.clearScheduledPoll(), this.pollStartedAt = Date.now(), this.state.retryCount = 0, this.state.autoPolling = !1;
  }
  displayArtifacts(t) {
    if (t.executed) {
      const e = o("#artifact-executed"), i = o("#artifact-executed-link");
      e && i && (i.href = new URL(t.executed, window.location.origin).toString(), n(e));
    }
    if (t.source) {
      const e = o("#artifact-source"), i = o("#artifact-source-link");
      e && i && (i.href = new URL(t.source, window.location.origin).toString(), n(e));
    }
    if (t.certificate) {
      const e = o("#artifact-certificate"), i = o("#artifact-certificate-link");
      e && i && (i.href = new URL(t.certificate, window.location.origin).toString(), n(e));
    }
  }
  getState() {
    return { ...this.state };
  }
};
function M(t) {
  const e = new l(t);
  return s(() => e.init()), e;
}
function T(t) {
  const e = new l(t);
  s(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
export {
  A as a,
  M as i,
  T as n,
  S as o,
  E as r,
  l as t
};

//# sourceMappingURL=signer-complete-B-DK_wvA.js.map
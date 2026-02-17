class Ee {
  constructor(e) {
    this.basePath = e.basePath, this.apiBasePath = e.apiBasePath || `${e.basePath}/api`, this.defaultHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...e.defaultHeaders
    };
  }
  // Agreement endpoints
  async listAgreements(e) {
    const t = new URLSearchParams();
    return e?.page && t.set("page", String(e.page)), e?.per_page && t.set("per_page", String(e.per_page)), e?.status && t.set("status", e.status), e?.search && t.set("search", e.search), this.get(
      `/esign_agreements?${t.toString()}`
    );
  }
  async getAgreementStats() {
    const e = [];
    let t = 1;
    const n = 200, s = 25;
    for (; t <= s; ) {
      const d = await this.listAgreements({ page: t, per_page: n }), l = d.items || d.records || [];
      if (e.push(...l), l.length === 0 || e.length >= d.total)
        break;
      t += 1;
    }
    const a = {};
    for (const d of e) {
      const l = String(d?.status || "").trim().toLowerCase();
      l && (a[l] = (a[l] || 0) + 1);
    }
    const o = (a.sent || 0) + (a.in_progress || 0), c = o + (a.declined || 0);
    return {
      draft: a.draft || 0,
      sent: a.sent || 0,
      in_progress: a.in_progress || 0,
      completed: a.completed || 0,
      voided: a.voided || 0,
      declined: a.declined || 0,
      expired: a.expired || 0,
      pending: o,
      action_required: c
    };
  }
  // Document endpoints
  async listDocuments(e) {
    const t = new URLSearchParams();
    return e?.page && t.set("page", String(e.page)), e?.per_page && t.set("per_page", String(e.per_page)), e?.search && t.set("search", e.search), this.get(
      `/esign_documents?${t.toString()}`
    );
  }
  // Google integration endpoints
  async getGoogleIntegrationStatus() {
    return this.get("/v1/esign/integrations/google/status");
  }
  async startGoogleImport(e) {
    return this.post("/v1/esign/google-drive/imports", e);
  }
  async getGoogleImportStatus(e) {
    return this.get(`/v1/esign/google-drive/imports/${e}`);
  }
  // Draft persistence endpoints
  async listDrafts(e) {
    const t = new URLSearchParams();
    return e?.limit && t.set("limit", String(e.limit)), e?.cursor && t.set("cursor", e.cursor), this.get(`/v1/esign/drafts?${t.toString()}`);
  }
  async getDraft(e) {
    return this.get(`/v1/esign/drafts/${e}`);
  }
  async createDraft(e) {
    return this.post("/v1/esign/drafts", e);
  }
  async updateDraft(e, t) {
    return this.put(`/v1/esign/drafts/${e}`, t);
  }
  async deleteDraft(e) {
    return this.delete(`/v1/esign/drafts/${e}`);
  }
  async sendDraft(e, t) {
    return this.post(`/v1/esign/drafts/${e}/send`, t);
  }
  // Generic HTTP methods
  async get(e) {
    const t = await fetch(`${this.apiBasePath}${e}`, {
      method: "GET",
      headers: this.defaultHeaders
    });
    return this.handleResponse(t);
  }
  async post(e, t) {
    const n = await fetch(`${this.apiBasePath}${e}`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: t ? JSON.stringify(t) : void 0
    });
    return this.handleResponse(n);
  }
  async put(e, t) {
    const n = await fetch(`${this.apiBasePath}${e}`, {
      method: "PUT",
      headers: this.defaultHeaders,
      body: JSON.stringify(t)
    });
    return this.handleResponse(n);
  }
  async delete(e) {
    const t = await fetch(`${this.apiBasePath}${e}`, {
      method: "DELETE",
      headers: this.defaultHeaders
    });
    return this.handleResponse(t);
  }
  async handleResponse(e) {
    if (!e.ok) {
      let t;
      try {
        t = (await e.json()).error || {
          code: `HTTP_${e.status}`,
          message: e.statusText
        };
      } catch {
        t = {
          code: `HTTP_${e.status}`,
          message: e.statusText
        };
      }
      throw new Pe(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class Pe extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let q = null;
function dt() {
  if (!q)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return q;
}
function Ae(i) {
  q = i;
}
function Me(i) {
  const e = new Ee(i);
  return Ae(e), e;
}
function H(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ut(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function M(i, e) {
  if (!i) return "-";
  try {
    const t = i instanceof Date ? i : new Date(i);
    if (isNaN(t.getTime())) return "-";
    const n = {
      dateStyle: "short",
      timeStyle: "short"
    };
    return t.toLocaleString(void 0, e || n);
  } catch {
    return String(i);
  }
}
function ht(i, e) {
  if (!i) return "-";
  try {
    const t = i instanceof Date ? i : new Date(i);
    if (isNaN(t.getTime())) return "-";
    const n = {
      dateStyle: "medium"
    };
    return t.toLocaleDateString(void 0, e || n);
  } catch {
    return String(i);
  }
}
function pt(i, e) {
  if (!i) return "-";
  try {
    const t = i instanceof Date ? i : new Date(i);
    if (isNaN(t.getTime())) return "-";
    const n = {
      hour: "2-digit",
      minute: "2-digit"
    };
    return t.toLocaleTimeString(void 0, e || n);
  } catch {
    return String(i);
  }
}
function gt(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), s = Math.round(n / 1e3), a = Math.round(s / 60), o = Math.round(a / 60), c = Math.round(o / 24), d = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? d.format(c, "day") : Math.abs(o) >= 1 ? d.format(o, "hour") : Math.abs(a) >= 1 ? d.format(a, "minute") : d.format(s, "second");
  } catch {
    return String(i);
  }
}
function mt(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function Te(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function ft(i) {
  return i ? i.split("_").map((e) => Te(e)).join(" ") : "";
}
function vt(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const ke = {
  draft: {
    label: "Draft",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    dotClass: "bg-gray-400"
  },
  sent: {
    label: "Sent",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    dotClass: "bg-blue-400"
  },
  in_progress: {
    label: "In Progress",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    dotClass: "bg-amber-400"
  },
  completed: {
    label: "Completed",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    dotClass: "bg-green-500"
  },
  voided: {
    label: "Voided",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    dotClass: "bg-red-500"
  },
  declined: {
    label: "Declined",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    dotClass: "bg-red-500"
  },
  expired: {
    label: "Expired",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    dotClass: "bg-gray-400"
  }
};
function de(i) {
  const e = String(i || "").trim().toLowerCase();
  return ke[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function $e(i, e) {
  const t = de(i), n = e?.showDot ?? !1, s = e?.size ?? "sm", a = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, o = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${a[s]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${o}${t.label}</span>`;
}
function yt(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = $e(i, e), t.firstElementChild;
}
function wt(i, e, t) {
  const n = de(e), s = t?.size ?? "sm", a = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${a[s]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const d = i.querySelector(".rounded-full");
    if (d)
      d.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const l = document.createElement("span");
      l.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, l.setAttribute("aria-hidden", "true"), i.prepend(l);
    }
  }
  const c = i.childNodes[i.childNodes.length - 1];
  c && c.nodeType === Node.TEXT_NODE ? c.textContent = n.label : i.appendChild(document.createTextNode(n.label));
}
function r(i, e = document) {
  try {
    return e.querySelector(i);
  } catch {
    return null;
  }
}
function A(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function bt(i) {
  return document.getElementById(i);
}
function De(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [s, a] of Object.entries(e))
      a !== void 0 && n.setAttribute(s, a);
  if (t)
    for (const s of t)
      typeof s == "string" ? n.appendChild(document.createTextNode(s)) : n.appendChild(s);
  return n;
}
function xt(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function St(i, e, t, n, s) {
  const a = (o) => {
    const c = o.target.closest(e);
    c && i.contains(c) && n.call(c, o, c);
  };
  return i.addEventListener(t, a, s), () => i.removeEventListener(t, a, s);
}
function w(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function p(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function u(i) {
  i && i.classList.add("hidden");
}
function Ct(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? p(i) : u(i);
}
function It(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function B(i, e, t = document) {
  const n = r(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function Lt(i, e = document) {
  for (const [t, n] of Object.entries(i))
    B(t, n, e);
}
function Be(i = "[data-esign-page]", e = "data-esign-config") {
  const t = r(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const s = r(
    'script[type="application/json"]',
    t
  );
  if (s?.textContent)
    try {
      return JSON.parse(s.textContent);
    } catch {
      console.warn("Failed to parse page config from script:", s.textContent);
    }
  return null;
}
function C(i, e = "polite") {
  const t = r(`[aria-live="${e}"]`) || (() => {
    const n = De("div", {
      "aria-live": e,
      "aria-atomic": "true",
      class: "sr-only"
    });
    return document.body.appendChild(n), n;
  })();
  t.textContent = "", requestAnimationFrame(() => {
    t.textContent = i;
  });
}
async function Et(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: s = 6e4,
    maxAttempts: a = 30,
    onProgress: o,
    signal: c
  } = i, d = Date.now();
  let l = 0, h;
  for (; l < a; ) {
    if (c?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - d >= s)
      return {
        result: h,
        attempts: l,
        stopped: !1,
        timedOut: !0
      };
    if (l++, h = await e(), o && o(h, l), t(h))
      return {
        result: h,
        attempts: l,
        stopped: !0,
        timedOut: !1
      };
    await ue(n, c);
  }
  return {
    result: h,
    attempts: l,
    stopped: !1,
    timedOut: !1
  };
}
async function Pt(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: s = 3e4,
    exponentialBackoff: a = !0,
    shouldRetry: o = () => !0,
    onRetry: c,
    signal: d
  } = i;
  let l;
  for (let h = 1; h <= t; h++) {
    if (d?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (g) {
      if (l = g, h >= t || !o(g, h))
        throw g;
      const v = a ? Math.min(n * Math.pow(2, h - 1), s) : n;
      c && c(g, h, v), await ue(v, d);
    }
  }
  throw l;
}
function ue(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const s = setTimeout(t, i);
    if (e) {
      const a = () => {
        clearTimeout(s), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", a, { once: !0 });
    }
  });
}
function D(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function At(i, e) {
  let t = 0, n = null;
  return (...s) => {
    const a = Date.now();
    a - t >= e ? (t = a, i(...s)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...s);
      },
      e - (a - t)
    ));
  };
}
function Mt(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function Tt(i, e, t = "Operation timed out") {
  let n;
  const s = new Promise((a, o) => {
    n = setTimeout(() => {
      o(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, s]);
  } finally {
    clearTimeout(n);
  }
}
class Q {
  constructor(e) {
    this.config = e, this.client = Me({
      basePath: e.basePath,
      apiBasePath: e.apiBasePath
    });
  }
  /**
   * Initialize the landing page
   */
  async init() {
    try {
      await this.loadStats();
    } catch (e) {
      console.debug("Could not fetch agreement stats:", e);
    }
  }
  /**
   * Load and display agreement statistics
   */
  async loadStats() {
    const e = await this.client.getAgreementStats();
    B('count="draft"', e.draft), B('count="pending"', e.pending), B('count="completed"', e.completed), B('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function kt(i) {
  const e = i || Be(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new Q(e);
  return w(() => t.init()), t;
}
function $t(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new Q(t);
  w(() => n.init());
}
typeof document < "u" && w(() => {
  const i = document.querySelector(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (i) {
    const e = document.getElementById("esign-page-config"), t = i.getAttribute("data-esign-config"), n = (() => {
      if (e?.textContent)
        try {
          return JSON.parse(e.textContent);
        } catch (s) {
          console.warn("Failed to parse landing page config script:", s);
        }
      if (t)
        try {
          return JSON.parse(t);
        } catch (s) {
          console.warn("Failed to parse landing page config attribute:", s);
        }
      return null;
    })();
    if (n) {
      const s = String(n.basePath || n.base_path || "/admin"), a = String(
        n.apiBasePath || n.api_base_path || `${s}/api`
      );
      new Q({ basePath: s, apiBasePath: a }).init();
    }
  }
});
class he {
  constructor(e) {
    this.state = {
      loaded: !1,
      loading: !1,
      hasArtifacts: !1,
      retryCount: 0,
      maxRetries: 3
    }, this.config = e;
  }
  /**
   * Initialize the completion page
   */
  async init() {
    this.setupEventListeners(), await this.loadArtifacts();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const e = r("#retry-artifacts-btn");
    e && e.addEventListener("click", () => this.loadArtifacts());
  }
  /**
   * Load artifacts from the assets endpoint
   */
  async loadArtifacts() {
    if (!this.state.loading) {
      this.state.loading = !0, this.showArtifactState("loading");
      try {
        const e = await fetch(
          `${this.config.apiBasePath}/assets/${this.config.token}`,
          {
            method: "GET",
            headers: { Accept: "application/json" }
          }
        );
        if (!e.ok)
          throw new Error("Failed to load artifacts");
        const n = (await e.json())?.assets || {}, s = this.resolveArtifacts(n);
        s ? (this.state.hasArtifacts = !0, this.displayArtifacts(s), this.showArtifactState("available")) : this.config.agreementCompleted ? (this.showArtifactState("processing"), this.state.retryCount < this.state.maxRetries && (this.state.retryCount++, setTimeout(() => this.loadArtifacts(), 5e3))) : this.showArtifactState("processing"), this.state.loaded = !0;
      } catch (e) {
        console.error("Artifact load error:", e), this.config.hasServerDownloadUrl ? this.showArtifactState("fallback") : this.showArtifactState("unavailable");
      } finally {
        this.state.loading = !1;
      }
    }
  }
  /**
   * Resolve binary asset URLs from the assets response.
   * Never uses contract_url (which returns JSON).
   */
  resolveArtifacts(e) {
    const t = {
      executed: e.executed_url || null,
      source: e.source_url || null,
      certificate: e.certificate_url || null
    };
    return !!(t.executed || t.source || t.certificate) ? t : null;
  }
  /**
   * Show a specific artifact section and hide others
   */
  showArtifactState(e) {
    ["loading", "processing", "available", "unavailable", "fallback"].forEach((n) => {
      const s = r(`#artifacts-${n}`);
      s && (n === e ? p(s) : u(s));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = r("#artifact-executed"), n = r("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), p(t));
    }
    if (e.source) {
      const t = r("#artifact-source"), n = r("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), p(t));
    }
    if (e.certificate) {
      const t = r("#artifact-certificate"), n = r("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), p(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function Dt(i) {
  const e = new he(i);
  return w(() => e.init()), e;
}
function Bt(i) {
  const e = new he(i);
  w(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function _e(i = document) {
  A("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = H(t));
  });
}
function Fe(i = document) {
  A("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = M(t));
  });
}
function Re(i = document) {
  _e(i), Fe(i);
}
function He() {
  w(() => {
    Re();
  });
}
typeof document < "u" && He();
const se = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class pe {
  constructor(e) {
    this.config = e, this.elements = {
      loadingState: r("#loading-state"),
      successState: r("#success-state"),
      errorState: r("#error-state"),
      errorMessage: r("#error-message"),
      errorDetail: r("#error-detail"),
      closeBtn: r("#close-btn")
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), s = e.get("error_description"), a = e.get("state"), o = this.parseOAuthState(a);
    o.account_id || (o.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, s, o) : t ? this.handleSuccess(t, o) : this.handleError("unknown", "No authorization code was received from Google.", o);
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
      const n = JSON.parse(e);
      if (n && typeof n == "object")
        return typeof n.user_id == "string" && (t.user_id = n.user_id.trim()), typeof n.account_id == "string" && (t.account_id = n.account_id.trim()), t;
    } catch {
    }
    return t.user_id = String(e || "").trim(), t;
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, successState: n, errorState: s } = this.elements;
    switch (u(t), u(n), u(s), e) {
      case "loading":
        p(t);
        break;
      case "success":
        p(n);
        break;
      case "error":
        p(s);
        break;
    }
  }
  /**
   * Send message to opener window
   */
  sendToOpener(e) {
    window.opener && !window.opener.closed && window.opener.postMessage(e, window.location.origin);
  }
  /**
   * Handle OAuth error
   */
  handleError(e, t, n) {
    this.showState("error");
    const { errorMessage: s, errorDetail: a, closeBtn: o } = this.elements;
    s && (s.textContent = se[e] || se.unknown), t && a && (a.textContent = t, p(a)), this.sendToOpener({
      type: "google_oauth_callback",
      error: e,
      error_description: t || void 0,
      account_id: n.account_id || void 0
    }), this.setupCloseButton(n);
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), s = new URLSearchParams(window.location.search), a = s.get("state"), c = this.parseOAuthState(a).account_id || s.get("account_id");
      c && n.searchParams.set("account_id", c), window.location.href = n.toString();
    }
  }
}
function _t(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new pe(e);
  return w(() => t.init()), t;
}
function Ft(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new pe(e);
  w(() => t.init());
}
const U = "esign.google.account_id", Oe = {
  "https://www.googleapis.com/auth/drive.readonly": {
    label: "Drive (Read Only)",
    description: "View files in your Google Drive"
  },
  openid: {
    label: "OpenID",
    description: "Verify your Google identity for account linking"
  },
  "https://www.googleapis.com/auth/userinfo.email": {
    label: "Account Email",
    description: "Read your Google account email address"
  },
  "https://www.googleapis.com/auth/drive.file": {
    label: "Drive (App Files)",
    description: "Access files opened with this app"
  },
  "drive.readonly": {
    label: "Drive (Read Only)",
    description: "View files in your Google Drive"
  },
  "userinfo.email": {
    label: "Account Email",
    description: "Read your Google account email address"
  },
  "drive.file": {
    label: "Drive (App Files)",
    description: "Access files opened with this app"
  }
};
class ge {
  constructor(e) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      loadingState: r("#loading-state"),
      disconnectedState: r("#disconnected-state"),
      connectedState: r("#connected-state"),
      errorState: r("#error-state"),
      statusBadge: r("#status-badge"),
      announcements: r("#integration-announcements"),
      accountIdInput: r("#account-id-input"),
      connectBtn: r("#connect-btn"),
      disconnectBtn: r("#disconnect-btn"),
      refreshBtn: r("#refresh-status-btn"),
      retryBtn: r("#retry-btn"),
      reauthBtn: r("#reauth-btn"),
      oauthModal: r("#oauth-modal"),
      oauthCancelBtn: r("#oauth-cancel-btn"),
      disconnectModal: r("#disconnect-modal"),
      disconnectCancelBtn: r("#disconnect-cancel-btn"),
      disconnectConfirmBtn: r("#disconnect-confirm-btn"),
      connectedEmail: r("#connected-email"),
      connectedAccountId: r("#connected-account-id"),
      scopesList: r("#scopes-list"),
      expiryInfo: r("#expiry-info"),
      reauthWarning: r("#reauth-warning"),
      reauthReason: r("#reauth-reason"),
      errorMessage: r("#error-message"),
      degradedWarning: r("#degraded-warning"),
      degradedReason: r("#degraded-reason"),
      importDriveLink: r("#import-drive-link"),
      integrationSettingsLink: r("#integration-settings-link"),
      // Option A - Dropdown
      accountDropdown: r("#account-dropdown"),
      // Option B - Cards Grid
      accountsSection: r("#accounts-section"),
      accountsLoading: r("#accounts-loading"),
      accountsEmpty: r("#accounts-empty"),
      accountsGrid: r("#accounts-grid"),
      connectFirstBtn: r("#connect-first-btn")
    };
  }
  /**
   * Initialize the integration page
   */
  async init() {
    this.setupEventListeners(), this.updateAccountScopeUI(), await Promise.all([this.checkStatus(), this.loadAccounts()]);
  }
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    const {
      connectBtn: e,
      disconnectBtn: t,
      refreshBtn: n,
      retryBtn: s,
      reauthBtn: a,
      oauthCancelBtn: o,
      disconnectCancelBtn: c,
      disconnectConfirmBtn: d,
      accountIdInput: l,
      oauthModal: h,
      disconnectModal: g
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), a && a.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, g && p(g);
    }), c && c.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, g && u(g);
    }), d && d.addEventListener("click", () => this.disconnect()), o && o.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), s && s.addEventListener("click", () => this.checkStatus()), l && (l.addEventListener("change", () => {
      this.setCurrentAccountId(l.value, !0);
    }), l.addEventListener("keydown", (f) => {
      f.key === "Enter" && (f.preventDefault(), this.setCurrentAccountId(l.value, !0));
    }));
    const { accountDropdown: v, connectFirstBtn: m } = this.elements;
    v && v.addEventListener("change", () => {
      v.value === "__new__" ? (v.value = this.currentAccountId, this.startOAuthFlow("")) : this.setCurrentAccountId(v.value, !0);
    }), m && m.addEventListener("click", () => this.startOAuthFlow("")), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && (h && !h.classList.contains("hidden") && this.cancelOAuthFlow(), g && !g.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, u(g)));
    }), [h, g].forEach((f) => {
      f && f.addEventListener("click", (b) => {
        const y = b.target;
        (y === f || y.getAttribute("aria-hidden") === "true") && (u(f), f === h ? this.cancelOAuthFlow() : f === g && (this.pendingDisconnectAccountId = null));
      });
    });
  }
  /**
   * Resolve initial account ID from various sources
   */
  resolveInitialAccountId() {
    const e = new URLSearchParams(window.location.search), t = this.normalizeAccountId(e.get("account_id"));
    if (t)
      return t;
    const n = this.normalizeAccountId(this.config.googleAccountId);
    if (n)
      return n;
    try {
      return this.normalizeAccountId(
        window.localStorage.getItem(U)
      );
    } catch {
      return "";
    }
  }
  /**
   * Normalize account ID value
   */
  normalizeAccountId(e) {
    return (e || "").trim();
  }
  /**
   * Set current account ID and optionally refresh status
   */
  setCurrentAccountId(e, t = !1) {
    const n = this.normalizeAccountId(e);
    if (n === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }
    this.currentAccountId = n, this.updateAccountScopeUI(), t && this.checkStatus();
  }
  /**
   * Update UI elements related to account scope
   */
  updateAccountScopeUI() {
    const { accountIdInput: e, connectedAccountId: t, importDriveLink: n, integrationSettingsLink: s } = this.elements;
    e && (e.value = this.currentAccountId), t && (t.textContent = this.currentAccountId ? `Account ID: ${this.currentAccountId}` : "Account ID: default"), this.persistAccountId(), this.syncAccountIdInURL(), this.updateScopedLinks([n, s]), this.renderAccountDropdown(), this.renderAccountsGrid();
  }
  /**
   * Persist account ID to localStorage
   */
  persistAccountId() {
    try {
      this.currentAccountId ? window.localStorage.setItem(U, this.currentAccountId) : window.localStorage.removeItem(U);
    } catch {
    }
  }
  /**
   * Sync account ID to URL without navigation
   */
  syncAccountIdInURL() {
    const e = new URL(window.location.href);
    this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString());
  }
  /**
   * Update scoped links with current account ID
   */
  updateScopedLinks(e) {
    e.forEach((t) => {
      if (!t) return;
      const n = t.dataset.baseHref || t.getAttribute("href");
      n && t.setAttribute("href", this.applyAccountIdToPath(n));
    });
  }
  /**
   * Apply account ID to a path/URL
   */
  applyAccountIdToPath(e) {
    const t = new URL(e, window.location.origin);
    return this.currentAccountId ? t.searchParams.set("account_id", this.currentAccountId) : t.searchParams.delete("account_id"), `${t.pathname}${t.search}${t.hash}`;
  }
  /**
   * Build API URL with user/account scope
   */
  buildScopedAPIURL(e, t = this.currentAccountId) {
    const n = new URL(`${this.apiBase}${e}`, window.location.origin);
    return n.searchParams.set("user_id", this.config.userId || ""), t && n.searchParams.set("account_id", t), n.toString();
  }
  /**
   * Announce message to screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), C(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: s, errorState: a } = this.elements;
    switch (u(t), u(n), u(s), u(a), e) {
      case "loading":
        p(t);
        break;
      case "disconnected":
        p(n);
        break;
      case "connected":
        p(s);
        break;
      case "error":
        p(a);
        break;
    }
  }
  /**
   * Update status badge
   */
  updateStatusBadge(e, t = !1, n = !1) {
    const { statusBadge: s } = this.elements;
    if (s) {
      if (n) {
        s.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
          <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
          Degraded
        </span>
      `;
        return;
      }
      e ? t ? s.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
            Expiring Soon
          </span>
        ` : s.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <span class="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
            Connected
          </span>
        ` : s.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
          <span class="w-2 h-2 rounded-full bg-gray-400" aria-hidden="true"></span>
          Not Connected
        </span>
      `;
    }
  }
  /**
   * Check integration status from API
   */
  async checkStatus() {
    this.showState("loading");
    try {
      const e = await fetch(
        this.buildScopedAPIURL("/esign/integrations/google/status"),
        {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!e.ok) {
        if (e.status === 404) {
          this.showState("disconnected"), this.updateStatusBadge(!1), this.announce("Google Drive is not connected");
          return;
        }
        let a = `Failed to check status: ${e.status}`;
        try {
          const o = await e.json();
          o?.error?.message && (a = o.error.message);
        } catch {
        }
        throw new Error(a);
      }
      const t = await e.json(), n = this.normalizeIntegrationPayload(t.integration || {});
      !this.currentAccountId && n.account_id && (this.currentAccountId = n.account_id, this.updateAccountScopeUI());
      const s = n.degraded === !0;
      this.renderDegradedState(s, n.degraded_reason), n.connected ? (this.renderConnectedState(n), this.showState("connected"), this.updateStatusBadge(!0, n.needs_reauthorization, s), this.announce(
        s ? "Google Drive connected with degraded provider health" : "Google Drive is connected"
      )) : (this.showState("disconnected"), this.updateStatusBadge(!1, !1, s), this.announce(
        s ? "Google Drive integration is degraded" : "Google Drive is not connected"
      ));
    } catch (e) {
      console.error("Error checking status:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred while checking the integration status."), this.showState("error"), this.renderDegradedState(!1, ""), this.updateStatusBadge(!1), this.announce("Error checking Google Drive status");
    }
  }
  /**
   * Normalize integration payload from API (handles both camelCase and snake_case)
   */
  normalizeIntegrationPayload(e) {
    const t = (b, y) => {
      for (const x of b)
        if (Object.prototype.hasOwnProperty.call(e, x) && e[x] !== void 0 && e[x] !== null)
          return e[x];
      return y;
    }, n = t(["expires_at", "ExpiresAt"], ""), s = t(["scopes", "Scopes"], []), a = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), o = t(["connected", "Connected"], !1), c = t(["degraded", "Degraded"], !1), d = t(["degraded_reason", "DegradedReason"], ""), l = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), h = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), g = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let v = t(["is_expired", "IsExpired"], void 0), m = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof v != "boolean" || typeof m != "boolean") && n) {
      const b = new Date(n);
      if (!Number.isNaN(b.getTime())) {
        const y = b.getTime() - Date.now(), x = 5 * 60 * 1e3;
        v = y <= 0, m = y > 0 && y <= x;
      }
    }
    const f = typeof g == "boolean" ? g : (v === !0 || m === !0) && !h;
    return {
      connected: o,
      account_id: a,
      email: l,
      scopes: Array.isArray(s) ? s : [],
      expires_at: n,
      is_expired: v === !0,
      is_expiring_soon: m === !0,
      can_auto_refresh: h,
      needs_reauthorization: f,
      degraded: c,
      degraded_reason: d
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: s, expiryInfo: a, reauthWarning: o, reauthReason: c } = this.elements;
    t && (t.textContent = e.email || "Connected"), n && (n.textContent = e.account_id || this.currentAccountId ? `Account ID: ${e.account_id || this.currentAccountId}` : "Account ID: default"), this.renderScopes(e.scopes || []), this.renderExpiry(
      e.expires_at,
      e.is_expired,
      e.is_expiring_soon,
      e.can_auto_refresh,
      e.needs_reauthorization
    );
  }
  /**
   * Render scopes list
   */
  renderScopes(e) {
    const { scopesList: t } = this.elements;
    if (t) {
      if (!e || e.length === 0) {
        t.innerHTML = '<li class="text-sm text-gray-500">No specific scopes granted</li>';
        return;
      }
      t.innerHTML = e.map((n) => {
        const s = Oe[n] || { label: n, description: "" };
        return `
        <li class="flex items-start gap-2">
          <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div>
            <span class="text-sm font-medium text-gray-700">${this.escapeHtml(s.label)}</span>
            ${s.description ? `<p class="text-xs text-gray-500">${this.escapeHtml(s.description)}</p>` : ""}
          </div>
        </li>
      `;
      }).join("");
    }
  }
  /**
   * Render token expiry information
   */
  renderExpiry(e, t, n, s, a) {
    const { expiryInfo: o, reauthWarning: c, reauthReason: d } = this.elements;
    if (!o) return;
    if (o.classList.remove("text-red-600", "text-amber-600"), o.classList.add("text-gray-500"), !e) {
      o.textContent = "Access token status unknown", c && u(c);
      return;
    }
    const l = new Date(e), h = /* @__PURE__ */ new Date(), g = Math.max(
      1,
      Math.round((l.getTime() - h.getTime()) / (1e3 * 60))
    );
    t ? s ? (o.textContent = "Access token expired, but refresh is available and will be applied automatically.", o.classList.remove("text-gray-500"), o.classList.add("text-amber-600"), c && u(c)) : (o.textContent = "Access token has expired. Please re-authorize.", o.classList.remove("text-gray-500"), o.classList.add("text-red-600"), c && p(c), d && (d.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (o.classList.remove("text-gray-500"), o.classList.add("text-amber-600"), s ? (o.textContent = `Token expires in approximately ${g} minute${g !== 1 ? "s" : ""}. Refresh is available automatically.`, c && u(c)) : (o.textContent = `Token expires in approximately ${g} minute${g !== 1 ? "s" : ""}`, c && p(c), d && (d.textContent = `Your access token will expire in ${g} minute${g !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (o.textContent = `Token valid until ${l.toLocaleDateString()} ${l.toLocaleTimeString()}`, c && u(c)), !a && c && u(c);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: s } = this.elements;
    n && (e ? (p(n), s && (s.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : u(n));
  }
  // Account Management Methods
  /**
   * Load all connected Google accounts
   */
  async loadAccounts() {
    try {
      const e = this.buildScopedAPIURL("/esign/integrations/google/accounts"), t = await fetch(e, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!t.ok) {
        console.warn("Failed to load accounts:", t.status), this.accounts = [], this.renderAccountDropdown(), this.renderAccountsGrid();
        return;
      }
      const n = await t.json();
      this.accounts = n.accounts || [], this.currentAccountId && !this.accounts.some(
        (s) => this.normalizeAccountId(s.account_id) === this.currentAccountId
      ) && (this.currentAccountId = ""), this.updateAccountScopeUI();
    } catch (e) {
      console.error("Error loading accounts:", e), this.accounts = [], this.updateAccountScopeUI();
    }
  }
  /**
   * Render the account dropdown (Option A)
   */
  renderAccountDropdown() {
    const { accountDropdown: e } = this.elements;
    if (!e) return;
    e.innerHTML = "";
    const t = document.createElement("option");
    t.value = "", t.textContent = "Default Account", this.currentAccountId || (t.selected = !0), e.appendChild(t);
    const n = /* @__PURE__ */ new Set([""]);
    for (const a of this.accounts) {
      const o = this.normalizeAccountId(a.account_id);
      if (n.has(o))
        continue;
      n.add(o);
      const c = document.createElement("option");
      c.value = o;
      const d = a.email || o || "Default", l = a.status !== "connected" ? ` (${a.status})` : "";
      c.textContent = `${d}${l}`, o === this.currentAccountId && (c.selected = !0), e.appendChild(c);
    }
    const s = document.createElement("option");
    s.value = "__new__", s.textContent = "+ Connect New Account...", e.appendChild(s);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && u(e), this.accounts.length === 0) {
      t && p(t), n && u(n);
      return;
    }
    t && u(t), n && (p(n), n.innerHTML = this.accounts.map((s) => this.renderAccountCard(s)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
  }
  /**
   * Render a single account card
   */
  renderAccountCard(e) {
    const t = e.account_id === this.currentAccountId || e.is_default && !this.currentAccountId, n = {
      connected: "bg-green-50 border-green-200",
      expired: "bg-red-50 border-red-200",
      needs_reauth: "bg-amber-50 border-amber-200",
      degraded: "bg-gray-50 border-gray-200"
    }, s = {
      connected: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      needs_reauth: "bg-amber-100 text-amber-700",
      degraded: "bg-gray-100 text-gray-700"
    }, a = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, o = t ? "ring-2 ring-blue-500" : "", c = n[e.status] || "bg-white border-gray-200", d = s[e.status] || "bg-gray-100 text-gray-700", l = a[e.status] || e.status, h = e.account_id || "default", g = e.email || "No email";
    return `
      <div class="account-card ${c} ${o} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
        ${t ? '<span class="absolute top-2 right-2 text-xs font-medium text-blue-600">Active</span>' : ""}
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full ${e.status === "connected" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(g)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(h)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${d}">
              ${l}
            </span>
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          ${t ? "" : '<button type="button" class="select-account-btn flex-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Select</button>'}
          ${e.status === "needs_reauth" || e.status === "expired" ? '<button type="button" class="reauth-account-btn flex-1 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Re-auth</button>' : ""}
          <button type="button" class="disconnect-account-btn text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Disconnect</button>
        </div>
      </div>
    `;
  }
  /**
   * Render the "Connect New Account" card
   */
  renderConnectNewCard() {
    return `
      <div class="account-card-new border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors min-h-[140px]" id="connect-new-card">
        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
          <svg class="w-5 h-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-700">Connect New Account</p>
        <p class="text-xs text-gray-500 mt-1">Link another Google account</p>
      </div>
    `;
  }
  /**
   * Attach event listeners to account cards
   */
  attachCardEventListeners() {
    const { accountsGrid: e, disconnectModal: t } = this.elements;
    if (!e) return;
    e.querySelectorAll(".select-account-btn").forEach((s) => {
      s.addEventListener("click", (a) => {
        const c = a.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(c, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((s) => {
      s.addEventListener("click", (a) => {
        const c = a.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(c, !1), this.startOAuthFlow(c);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((s) => {
      s.addEventListener("click", (a) => {
        const c = a.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = c, t && p(t);
      });
    });
    const n = e.querySelector("#connect-new-card");
    n && n.addEventListener("click", () => this.startOAuthFlow(""));
  }
  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
  // OAuth Flow Methods
  /**
   * Start OAuth flow
   */
  async startOAuthFlow(e) {
    const { oauthModal: t, errorMessage: n } = this.elements;
    t && p(t);
    const s = this.resolveOAuthRedirectURI(), a = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = a;
    const o = this.buildGoogleOAuthUrl(s, a);
    if (!o) {
      t && u(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const c = 500, d = 600, l = (window.screen.width - c) / 2, h = (window.screen.height - d) / 2;
    if (this.oauthWindow = window.open(
      o,
      "google_oauth",
      `width=${c},height=${d},left=${l},top=${h},popup=yes`
    ), !this.oauthWindow) {
      t && u(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (g) => this.handleOAuthCallback(g), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && u(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
    }, 12e4);
  }
  /**
   * Resolve OAuth redirect URI
   */
  resolveOAuthRedirectURI() {
    return this.config.googleRedirectUri ? this.config.googleRedirectUri : `${window.location.origin}${this.config.basePath}/esign/integrations/google/callback`;
  }
  /**
   * Build OAuth state parameter
   */
  buildOAuthState(e) {
    const t = {
      user_id: this.config.userId || "",
      account_id: e || ""
    };
    return JSON.stringify(t);
  }
  /**
   * Build Google OAuth URL
   */
  buildGoogleOAuthUrl(e, t) {
    const n = this.config.googleClientId;
    if (!n)
      return null;
    const s = [
      "https://www.googleapis.com/auth/drive.readonly",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: n,
      redirect_uri: e,
      response_type: "code",
      scope: s,
      access_type: "offline",
      prompt: "consent",
      state: this.buildOAuthState(t)
    }).toString()}`;
  }
  /**
   * Handle OAuth callback message
   */
  async handleOAuthCallback(e) {
    if (e.origin !== window.location.origin) return;
    const t = e.data;
    if (t.type !== "google_oauth_callback") return;
    const { oauthModal: n } = this.elements;
    if (this.cleanupOAuthFlow(), n && u(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const s = this.resolveOAuthRedirectURI(), o = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        o !== this.currentAccountId && this.setCurrentAccountId(o, !1);
        const c = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", o),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: o || void 0,
              redirect_uri: s
            })
          }
        );
        if (!c.ok) {
          const d = await c.json();
          throw new Error(d.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (s) {
        console.error("Connect error:", s);
        const a = s instanceof Error ? s.message : "Unknown error";
        this.showToast(`Failed to connect: ${a}`, "error"), this.announce(`Failed to connect: ${a}`);
      } finally {
        this.pendingOAuthAccountId = null;
      }
      return;
    }
    this.pendingOAuthAccountId = null;
  }
  /**
   * Cancel OAuth flow
   */
  cancelOAuthFlow() {
    const { oauthModal: e } = this.elements;
    e && u(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
  }
  /**
   * Cleanup OAuth flow resources
   */
  cleanupOAuthFlow() {
    this.oauthTimeout && (clearTimeout(this.oauthTimeout), this.oauthTimeout = null), this.messageHandler && (window.removeEventListener("message", this.messageHandler), this.messageHandler = null);
  }
  /**
   * Close OAuth popup window
   */
  closeOAuthWindow() {
    if (this.oauthWindow) {
      try {
        this.oauthWindow.close();
      } catch {
      }
      this.oauthWindow = null;
    }
  }
  /**
   * Disconnect Google account
   */
  async disconnect() {
    const { disconnectModal: e } = this.elements;
    e && u(e);
    const t = this.pendingDisconnectAccountId ?? this.currentAccountId;
    try {
      const n = await fetch(
        this.buildScopedAPIURL("/esign/integrations/google/disconnect", t),
        {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!n.ok) {
        const s = await n.json();
        throw new Error(s.error?.message || "Failed to disconnect");
      }
      this.showToast("Google Drive disconnected", "success"), this.announce("Google Drive disconnected"), t === this.currentAccountId && this.setCurrentAccountId("", !1), await Promise.all([this.checkStatus(), this.loadAccounts()]);
    } catch (n) {
      console.error("Disconnect error:", n);
      const s = n instanceof Error ? n.message : "Unknown error";
      this.showToast(`Failed to disconnect: ${s}`, "error"), this.announce(`Failed to disconnect: ${s}`);
    } finally {
      this.pendingDisconnectAccountId = null;
    }
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function Rt(i) {
  const e = new ge(i);
  return w(() => e.init()), e;
}
function Ht(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new ge(e);
  w(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const N = "esign.google.account_id", ie = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, re = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class me {
  constructor(e) {
    this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.isListView = !0, this.isLoading = !1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      searchInput: r("#drive-search"),
      clearSearchBtn: r("#clear-search-btn"),
      fileList: r("#file-list"),
      loadingState: r("#loading-state"),
      breadcrumb: r("#breadcrumb"),
      listTitle: r("#list-title"),
      resultCount: r("#result-count"),
      pagination: r("#pagination"),
      loadMoreBtn: r("#load-more-btn"),
      refreshBtn: r("#refresh-btn"),
      announcements: r("#drive-announcements"),
      accountScopeHelp: r("#account-scope-help"),
      connectGoogleLink: r("#connect-google-link"),
      noSelection: r("#no-selection"),
      filePreview: r("#file-preview"),
      previewIcon: r("#preview-icon"),
      previewTitle: r("#preview-title"),
      previewType: r("#preview-type"),
      previewFileId: r("#preview-file-id"),
      previewOwner: r("#preview-owner"),
      previewLocation: r("#preview-location"),
      previewModified: r("#preview-modified"),
      importBtn: r("#import-btn"),
      openInGoogleBtn: r("#open-in-google-btn"),
      clearSelectionBtn: r("#clear-selection-btn"),
      importModal: r("#import-modal"),
      importForm: r("#import-form"),
      importGoogleFileId: r("#import-google-file-id"),
      importDocumentTitle: r("#import-document-title"),
      importAgreementTitle: r("#import-agreement-title"),
      importCancelBtn: r("#import-cancel-btn"),
      importConfirmBtn: r("#import-confirm-btn"),
      importSpinner: r("#import-spinner"),
      importBtnText: r("#import-btn-text"),
      viewListBtn: r("#view-list-btn"),
      viewGridBtn: r("#view-grid-btn")
    };
  }
  /**
   * Initialize the drive picker page
   */
  async init() {
    this.config.googleConnected && (this.setupEventListeners(), this.updateScopedUI(), await this.loadFiles());
  }
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    const {
      searchInput: e,
      clearSearchBtn: t,
      refreshBtn: n,
      loadMoreBtn: s,
      importBtn: a,
      clearSelectionBtn: o,
      importCancelBtn: c,
      importConfirmBtn: d,
      importForm: l,
      importModal: h,
      viewListBtn: g,
      viewGridBtn: v
    } = this.elements;
    if (e) {
      const f = D(() => this.handleSearch(), 300);
      e.addEventListener("input", f), e.addEventListener("keydown", (b) => {
        b.key === "Enter" && (b.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), s && s.addEventListener("click", () => this.loadMore()), a && a.addEventListener("click", () => this.showImportModal()), o && o.addEventListener("click", () => this.clearSelection()), c && c.addEventListener("click", () => this.hideImportModal()), d && l && l.addEventListener("submit", (f) => {
      f.preventDefault(), this.handleImport();
    }), h && h.addEventListener("click", (f) => {
      const b = f.target;
      (b === h || b.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), g && g.addEventListener("click", () => this.setViewMode("list")), v && v.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && h && !h.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: m } = this.elements;
    m && m.addEventListener("click", (f) => this.handleFileListClick(f));
  }
  /**
   * Resolve initial account ID from various sources
   */
  resolveInitialAccountId() {
    const e = new URLSearchParams(window.location.search), t = this.normalizeAccountId(e.get("account_id"));
    if (t) return t;
    const n = this.normalizeAccountId(this.config.googleAccountId);
    if (n) return n;
    try {
      return this.normalizeAccountId(
        window.localStorage.getItem(N)
      );
    } catch {
      return "";
    }
  }
  /**
   * Normalize account ID
   */
  normalizeAccountId(e) {
    return (e || "").trim();
  }
  /**
   * Update UI elements with account scope
   */
  updateScopedUI() {
    this.syncScopedURLState();
    const { accountScopeHelp: e, connectGoogleLink: t } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, p(e)) : u(e)), t) {
      const n = t.dataset.baseHref || t.getAttribute("href");
      n && t.setAttribute("href", this.applyAccountIdToPath(n));
    }
  }
  /**
   * Sync account ID to URL and localStorage
   */
  syncScopedURLState() {
    const e = new URL(window.location.href);
    this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString());
    try {
      this.currentAccountId ? window.localStorage.setItem(N, this.currentAccountId) : window.localStorage.removeItem(N);
    } catch {
    }
  }
  /**
   * Apply account ID to a path
   */
  applyAccountIdToPath(e) {
    const t = new URL(e, window.location.origin);
    return this.currentAccountId ? t.searchParams.set("account_id", this.currentAccountId) : t.searchParams.delete("account_id"), `${t.pathname}${t.search}${t.hash}`;
  }
  /**
   * Build scoped API URL
   */
  buildScopedAPIURL(e) {
    const t = new URL(`${this.apiBase}${e}`, window.location.origin);
    return t.searchParams.set("user_id", this.config.userId || ""), this.currentAccountId && t.searchParams.set("account_id", this.currentAccountId), t.toString();
  }
  /**
   * Normalize drive file from API response
   */
  normalizeDriveFile(e) {
    if (!e || typeof e != "object")
      return {
        id: "",
        name: "",
        mimeType: "",
        modifiedTime: "",
        webViewLink: "",
        parents: [],
        owners: []
      };
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), a = String(e.modifiedTime || e.ModifiedTime || "").trim(), o = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), d = String(e.ownerEmail || e.OwnerEmail || "").trim(), l = Array.isArray(e.parents) ? e.parents : c ? [c] : [], h = Array.isArray(e.owners) ? e.owners : d ? [{ emailAddress: d }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: a,
      webViewLink: o,
      parents: l,
      owners: h,
      size: e.size,
      iconLink: e.iconLink,
      thumbnailLink: e.thumbnailLink
    };
  }
  /**
   * Load files from current folder or search
   */
  async loadFiles(e = !1) {
    if (this.isLoading) return;
    this.isLoading = !0;
    const { loadingState: t, fileList: n } = this.elements;
    e || (this.currentFiles = [], this.nextPageToken = null, t && p(t));
    try {
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      let a;
      this.searchQuery ? a = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : a = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(s.id)}`
      ), this.nextPageToken && (a += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const o = await fetch(a, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!o.ok)
        throw new Error(`Failed to load files: ${o.status}`);
      const c = await o.json(), d = Array.isArray(c.files) ? c.files.map((l) => this.normalizeDriveFile(l)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...d] : this.currentFiles = d, this.nextPageToken = c.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), C(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (s) {
      console.error("Error loading files:", s), this.renderError(s instanceof Error ? s.message : "Failed to load files"), C("Error loading files");
    } finally {
      this.isLoading = !1, t && u(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && u(t), this.currentFiles.length === 0) {
      e.innerHTML = `
        <div class="p-8 text-center">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            ${this.searchQuery ? "No files found" : "This folder is empty"}
          </h3>
          <p class="text-sm text-gray-500">
            ${this.searchQuery ? "Try a different search term" : "No files in this folder"}
          </p>
        </div>
      `;
      return;
    }
    const n = this.currentFiles.map((s) => this.renderFileItem(s)).join("");
    e.innerHTML = n;
  }
  /**
   * Render a single file item
   */
  renderFileItem(e) {
    const t = e.mimeType === "application/vnd.google-apps.folder", n = re.includes(e.mimeType), s = this.selectedFile?.id === e.id, a = ie[e.mimeType] || ie.default, o = this.getFileIcon(a);
    return `
      <div
        class="file-item flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer ${s ? "bg-blue-50 border-l-2 border-blue-500" : ""}"
        data-file-id="${this.escapeHtml(e.id)}"
        data-is-folder="${t}"
        role="option"
        aria-selected="${s}"
        tabindex="0"
      >
        <div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
          ${o}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${M(e.modifiedTime)}
          </p>
        </div>
        ${n ? '<span class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">Importable</span>' : ""}
      </div>
    `;
  }
  /**
   * Get SVG icon for file type
   */
  getFileIcon(e) {
    const t = {
      folder: '<svg class="w-6 h-6 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      doc: '<svg class="w-6 h-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>',
      sheet: '<svg class="w-6 h-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/></svg>',
      slide: '<svg class="w-6 h-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>',
      pdf: '<svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>',
      file: '<svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>'
    };
    return t[e] || t.file;
  }
  /**
   * Handle file list clicks
   */
  handleFileListClick(e) {
    const n = e.target.closest(".file-item");
    if (!n) return;
    const s = n.dataset.fileId, a = n.dataset.isFolder === "true";
    s && (a ? this.navigateToFolder(s) : this.selectFile(s));
  }
  /**
   * Navigate into a folder
   */
  navigateToFolder(e) {
    const t = this.currentFiles.find((n) => n.id === e);
    t && (this.currentFolderPath.push({ id: t.id, name: t.name }), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles());
  }
  /**
   * Select a file
   */
  selectFile(e) {
    const t = this.currentFiles.find((n) => n.id === e);
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), C(`Selected: ${t.name}`));
  }
  /**
   * Clear file selection
   */
  clearSelection() {
    this.selectedFile = null, this.renderSelection(), this.renderFiles();
  }
  /**
   * Render selection panel
   */
  renderSelection() {
    const {
      noSelection: e,
      filePreview: t,
      previewIcon: n,
      previewTitle: s,
      previewType: a,
      previewFileId: o,
      previewOwner: c,
      previewModified: d,
      importBtn: l,
      openInGoogleBtn: h
    } = this.elements;
    if (!this.selectedFile) {
      e && p(e), t && u(t);
      return;
    }
    e && u(e), t && p(t);
    const g = this.selectedFile, v = re.includes(g.mimeType);
    s && (s.textContent = g.name), a && (a.textContent = this.getMimeTypeLabel(g.mimeType)), o && (o.textContent = g.id), c && g.owners.length > 0 && (c.textContent = g.owners[0].emailAddress || "-"), d && (d.textContent = M(g.modifiedTime)), l && (v ? (l.removeAttribute("disabled"), l.classList.remove("opacity-50", "cursor-not-allowed")) : (l.setAttribute("disabled", "true"), l.classList.add("opacity-50", "cursor-not-allowed"))), h && g.webViewLink && (h.href = g.webViewLink);
  }
  /**
   * Get human-readable mime type label
   */
  getMimeTypeLabel(e) {
    return {
      "application/vnd.google-apps.folder": "Folder",
      "application/vnd.google-apps.document": "Google Doc",
      "application/vnd.google-apps.spreadsheet": "Google Sheet",
      "application/vnd.google-apps.presentation": "Google Slides",
      "application/pdf": "PDF"
    }[e] || "File";
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e, listTitle: t } = this.elements;
    if (!e) return;
    if (this.searchQuery) {
      u(e), t && (t.textContent = "Search Results");
      return;
    }
    p(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const s = e.querySelector("ol");
    s && (s.innerHTML = this.currentFolderPath.map(
      (a, o) => `
        <li class="flex items-center">
          ${o > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(a.id)}"
            data-folder-index="${o}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(a.name)}
          </button>
        </li>
      `
    ).join(""), A(".breadcrumb-item", s).forEach((a) => {
      a.addEventListener("click", () => {
        const o = parseInt(a.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(o);
      });
    }));
  }
  /**
   * Navigate to breadcrumb item
   */
  navigateToBreadcrumb(e) {
    e < 0 || e >= this.currentFolderPath.length - 1 || (this.currentFolderPath = this.currentFolderPath.slice(0, e + 1), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles());
  }
  /**
   * Update result count display
   */
  updateResultCount() {
    const { resultCount: e } = this.elements;
    e && (this.currentFiles.length > 0 ? e.textContent = `(${this.currentFiles.length}${this.nextPageToken ? "+" : ""} files)` : e.textContent = "");
  }
  /**
   * Update pagination controls
   */
  updatePagination() {
    const { pagination: e, loadMoreBtn: t } = this.elements;
    e && (this.nextPageToken ? p(e) : u(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? p(t) : u(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && u(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
  }
  /**
   * Refresh file list
   */
  refresh() {
    this.clearSelection(), this.loadFiles();
  }
  /**
   * Load more files (pagination)
   */
  loadMore() {
    this.nextPageToken && this.loadFiles(!0);
  }
  /**
   * Set view mode
   */
  setViewMode(e) {
    const { viewListBtn: t, viewGridBtn: n } = this.elements;
    this.isListView = e === "list", t && t.setAttribute("aria-pressed", String(this.isListView)), n && n.setAttribute("aria-pressed", String(!this.isListView)), this.renderFiles();
  }
  /**
   * Show import modal
   */
  showImportModal() {
    if (!this.selectedFile) return;
    const { importModal: e, importGoogleFileId: t, importDocumentTitle: n, importAgreementTitle: s } = this.elements;
    if (t && (t.value = this.selectedFile.id), n) {
      const a = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = a;
    }
    s && (s.value = ""), e && p(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && u(e);
  }
  /**
   * Handle import form submission
   */
  async handleImport() {
    if (!this.selectedFile) return;
    const {
      importConfirmBtn: e,
      importSpinner: t,
      importBtnText: n,
      importDocumentTitle: s,
      importAgreementTitle: a
    } = this.elements, o = this.selectedFile.id, c = s?.value.trim() || this.selectedFile.name, d = a?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && p(t), n && (n.textContent = "Importing...");
    try {
      const l = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: o,
          document_title: c,
          agreement_title: d || void 0
        })
      });
      if (!l.ok) {
        const g = await l.json();
        throw new Error(g.error?.message || "Import failed");
      }
      const h = await l.json();
      this.showToast("Import started successfully", "success"), C("Import started"), this.hideImportModal(), h.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${h.document.id}` : h.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${h.agreement.id}`);
    } catch (l) {
      console.error("Import error:", l);
      const h = l instanceof Error ? l.message : "Import failed";
      this.showToast(h, "error"), C(`Error: ${h}`);
    } finally {
      e && e.removeAttribute("disabled"), t && u(t), n && (n.textContent = "Import");
    }
  }
  /**
   * Render error state
   */
  renderError(e) {
    const { fileList: t } = this.elements;
    t && (t.innerHTML = `
      <div class="p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Files</h3>
        <p class="text-sm text-gray-500 mb-4">${this.escapeHtml(e)}</p>
        <button type="button" class="btn btn-secondary" onclick="location.reload()">
          Try Again
        </button>
      </div>
    `);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
  /**
   * Escape HTML
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
function Ot(i) {
  const e = new me(i);
  return w(() => e.init()), e;
}
function jt(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new me(e);
  w(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class fe {
  constructor(e) {
    this.healthData = null, this.autoRefreshTimer = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.elements = {
      timeRange: r("#time-range"),
      providerFilter: r("#provider-filter"),
      refreshBtn: r("#refresh-btn"),
      healthScore: r("#health-score"),
      healthIndicator: r("#health-indicator"),
      healthTrend: r("#health-trend"),
      syncSuccessRate: r("#sync-success-rate"),
      syncSuccessCount: r("#sync-success-count"),
      syncFailedCount: r("#sync-failed-count"),
      syncSuccessBar: r("#sync-success-bar"),
      conflictCount: r("#conflict-count"),
      conflictPending: r("#conflict-pending"),
      conflictResolved: r("#conflict-resolved"),
      conflictTrend: r("#conflict-trend"),
      syncLag: r("#sync-lag"),
      lagStatus: r("#lag-status"),
      lastSync: r("#last-sync"),
      retryTotal: r("#retry-total"),
      retryRecovery: r("#retry-recovery"),
      retryAvg: r("#retry-avg"),
      retryList: r("#retry-list"),
      providerHealthTable: r("#provider-health-table"),
      alertsList: r("#alerts-list"),
      noAlerts: r("#no-alerts"),
      alertCount: r("#alert-count"),
      activityFeed: r("#activity-feed"),
      syncChartCanvas: r("#sync-chart-canvas"),
      conflictChartCanvas: r("#conflict-chart-canvas")
    };
  }
  /**
   * Initialize the health dashboard
   */
  async init() {
    this.setupEventListeners(), this.initCharts(), await this.loadHealthData();
    const e = this.config.autoRefreshInterval || 3e4;
    this.autoRefreshTimer = setInterval(() => this.loadHealthData(), e);
  }
  /**
   * Cleanup resources
   */
  destroy() {
    this.autoRefreshTimer && (clearInterval(this.autoRefreshTimer), this.autoRefreshTimer = null);
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const { refreshBtn: e, timeRange: t, providerFilter: n } = this.elements;
    e && e.addEventListener("click", () => this.loadHealthData()), t && t.addEventListener("change", () => this.loadHealthData()), n && n.addEventListener("change", () => this.loadHealthData());
  }
  /**
   * Initialize chart canvases
   */
  initCharts() {
    const { syncChartCanvas: e, conflictChartCanvas: t } = this.elements;
    e && (e.width = e.parentElement?.clientWidth || 400, e.height = 240), t && (t.width = t.parentElement?.clientWidth || 400, t.height = 240);
  }
  /**
   * Load health data from API
   */
  async loadHealthData() {
    const { timeRange: e, providerFilter: t } = this.elements, n = e?.value || "24h", s = t?.value || "";
    try {
      const a = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      a.searchParams.set("range", n), s && a.searchParams.set("provider", s);
      const o = await fetch(a.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!o.ok)
        this.healthData = this.generateMockHealthData(n, s);
      else {
        const c = await o.json();
        this.healthData = c;
      }
      this.renderHealthData(), C("Health data refreshed");
    } catch (a) {
      console.error("Failed to load health data:", a), this.healthData = this.generateMockHealthData(n, s), this.renderHealthData();
    }
  }
  /**
   * Generate mock health data for demonstration
   */
  generateMockHealthData(e, t) {
    const s = Math.min(e === "1h" ? 1 : e === "6h" ? 6 : e === "24h" ? 24 : e === "7d" ? 168 : 720, 24);
    return {
      healthScore: 98,
      healthTrend: 2,
      syncStats: {
        total: 300,
        succeeded: 289,
        failed: 11,
        running: 2,
        successRate: 96.5
      },
      conflictStats: {
        pending: 7,
        resolvedToday: 42,
        total: 49,
        trend: -3
      },
      lagStats: {
        averageMinutes: 12,
        status: "normal",
        lastSyncMinutesAgo: 3
      },
      retryStats: {
        total: 23,
        recoveryRate: 87,
        avgAttempts: 1.4,
        recent: [
          { provider: "salesforce", entity: "Contact", time: "5m ago", status: "recovered" },
          { provider: "hubspot", entity: "Deal", time: "12m ago", status: "recovered" },
          { provider: "bamboohr", entity: "Employee", time: "28m ago", status: "pending" }
        ]
      },
      providerHealth: (t ? [t] : ["salesforce", "hubspot", "bamboohr", "workday"]).map((o) => ({
        provider: o,
        status: o === "workday" ? "degraded" : "healthy",
        successRate: o === "workday" ? 89.2 : 97 + Math.random() * 3,
        lastSync: `${Math.floor(Math.random() * 30) + 1}m ago`,
        conflicts: Math.floor(Math.random() * 5),
        lagMinutes: Math.floor(Math.random() * 20) + 5
      })),
      alerts: [
        { severity: "warning", provider: "workday", message: "Elevated error rate detected", time: "15m ago" },
        { severity: "info", provider: "salesforce", message: "Rate limit approaching (80%)", time: "1h ago" }
      ],
      activityFeed: this.generateActivityFeed(20),
      chartData: {
        sync: this.generateTimeSeriesData(s, "sync"),
        conflicts: this.generateTimeSeriesData(s, "conflicts")
      }
    };
  }
  /**
   * Generate activity feed data
   */
  generateActivityFeed(e) {
    const t = [], n = ["sync_completed", "sync_failed", "conflict_created", "conflict_resolved", "mapping_published"], s = ["salesforce", "hubspot", "bamboohr", "workday"];
    for (let a = 0; a < e; a++) {
      const o = n[Math.floor(Math.random() * n.length)], c = s[Math.floor(Math.random() * s.length)];
      t.push({
        type: o,
        provider: c,
        message: this.getActivityMessage(o, c),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: o.includes("failed") || o.includes("created") ? "warning" : "success"
      });
    }
    return t;
  }
  /**
   * Get activity message
   */
  getActivityMessage(e, t) {
    return {
      sync_completed: `Sync completed for ${t} (42 records)`,
      sync_failed: `Sync failed for ${t}: Connection timeout`,
      conflict_created: `New conflict detected in ${t} binding`,
      conflict_resolved: `Conflict resolved for ${t} record`,
      mapping_published: `Mapping spec published for ${t}`
    }[e] || `Activity for ${t}`;
  }
  /**
   * Generate time series data
   */
  generateTimeSeriesData(e, t) {
    const n = [], s = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, a = /* @__PURE__ */ new Date();
    for (let o = e - 1; o >= 0; o--) {
      const c = new Date(a.getTime() - o * 36e5);
      n.push(
        c.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      ), t === "sync" ? (s.success.push(Math.floor(Math.random() * 15) + 10), s.failed.push(Math.floor(Math.random() * 3))) : (s.pending.push(Math.floor(Math.random() * 5)), s.resolved.push(Math.floor(Math.random() * 8) + 2));
    }
    return { labels: n, datasets: s };
  }
  /**
   * Render all health data
   */
  renderHealthData() {
    this.healthData && (this.renderHealthScore(), this.renderSyncStats(), this.renderConflictStats(), this.renderLagStats(), this.renderRetryActivity(), this.renderProviderHealth(), this.renderAlerts(), this.renderActivityFeed(), this.updateCharts());
  }
  /**
   * Render health score section
   */
  renderHealthScore() {
    if (!this.healthData) return;
    const { healthScore: e, healthIndicator: t, healthTrend: n } = this.elements, s = this.healthData;
    if (e && (e.textContent = `${s.healthScore}%`, s.healthScore >= 95 ? e.className = "text-3xl font-bold text-green-600" : s.healthScore >= 80 ? e.className = "text-3xl font-bold text-yellow-600" : e.className = "text-3xl font-bold text-red-600"), t && (s.healthScore >= 95 ? (t.className = "w-12 h-12 rounded-full bg-green-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>') : s.healthScore >= 80 ? (t.className = "w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>') : (t.className = "w-12 h-12 rounded-full bg-red-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>')), n) {
      const a = s.healthTrend >= 0 ? "+" : "";
      n.textContent = `${a}${s.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: s } = this.elements, a = this.healthData.syncStats;
    e && (e.textContent = `${a.successRate.toFixed(1)}%`), t && (t.textContent = `${a.succeeded} succeeded`), n && (n.textContent = `${a.failed} failed`), s && (s.style.width = `${a.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: s } = this.elements, a = this.healthData.conflictStats;
    if (e && (e.textContent = String(a.pending)), t && (t.textContent = `${a.pending} pending`), n && (n.textContent = `${a.resolvedToday} resolved today`), s) {
      const o = a.trend >= 0 ? "+" : "";
      s.textContent = `${o}${a.trend} from previous period`;
    }
  }
  /**
   * Render lag statistics
   */
  renderLagStats() {
    if (!this.healthData) return;
    const { syncLag: e, lagStatus: t, lastSync: n } = this.elements, s = this.healthData.lagStats;
    e && (e.textContent = `${s.averageMinutes}m`), t && (s.status === "normal" ? (t.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", t.textContent = "Normal") : s.status === "elevated" ? (t.className = "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full", t.textContent = "Elevated") : (t.className = "px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full", t.textContent = "Critical")), n && (n.textContent = `Last sync: ${s.lastSyncMinutesAgo} minutes ago`);
  }
  /**
   * Render retry activity
   */
  renderRetryActivity() {
    if (!this.healthData) return;
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: s } = this.elements, a = this.healthData.retryStats;
    e && (e.textContent = String(a.total)), t && (t.textContent = `${a.recoveryRate}%`), n && (n.textContent = a.avgAttempts.toFixed(1)), s && (s.innerHTML = a.recent.map(
      (o) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(o.provider)} / ${this.escapeHtml(o.entity)}</span>
            <span class="${o.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${this.escapeHtml(o.time)}</span>
          </div>
        `
    ).join(""));
  }
  /**
   * Render provider health table
   */
  renderProviderHealth() {
    if (!this.healthData) return;
    const { providerHealthTable: e } = this.elements;
    e && (e.innerHTML = this.healthData.providerHealth.map(
      (t) => `
        <tr class="border-b last:border-0">
          <td class="py-3 font-medium capitalize">${this.escapeHtml(t.provider)}</td>
          <td class="py-3">
            <span class="px-2 py-1 text-xs rounded-full ${t.status === "healthy" ? "bg-green-100 text-green-800" : t.status === "degraded" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}">
              ${t.status}
            </span>
          </td>
          <td class="py-3 ${t.successRate >= 95 ? "text-green-600" : t.successRate >= 80 ? "text-yellow-600" : "text-red-600"}">
            ${t.successRate.toFixed(1)}%
          </td>
          <td class="py-3 text-gray-600">${this.escapeHtml(t.lastSync)}</td>
          <td class="py-3">
            ${t.conflicts > 0 ? `<span class="text-orange-600">${t.conflicts}</span>` : '<span class="text-gray-400">0</span>'}
          </td>
          <td class="py-3 text-gray-600">${t.lagMinutes}m</td>
        </tr>
      `
    ).join(""));
  }
  /**
   * Render alerts
   */
  renderAlerts() {
    if (!this.healthData) return;
    const { alertsList: e, noAlerts: t, alertCount: n } = this.elements;
    this.healthData.alerts.length === 0 ? (e && e.classList.add("hidden"), t && t.classList.remove("hidden"), n && (n.textContent = "0 active", n.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full")) : (e && e.classList.remove("hidden"), t && t.classList.add("hidden"), n && (n.textContent = `${this.healthData.alerts.length} active`, n.className = "px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"), e && (e.innerHTML = this.healthData.alerts.map(
      (s) => `
            <div class="flex items-start gap-3 p-3 rounded-lg ${s.severity === "warning" ? "bg-yellow-50 border border-yellow-200" : s.severity === "error" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}">
              <div class="flex-shrink-0">
                ${this.getAlertIcon(s.severity)}
              </div>
              <div class="flex-1">
                <div class="flex justify-between">
                  <span class="font-medium capitalize">${this.escapeHtml(s.provider)}</span>
                  <span class="text-xs text-gray-500">${this.escapeHtml(s.time)}</span>
                </div>
                <p class="text-sm text-gray-700 mt-1">${this.escapeHtml(s.message)}</p>
              </div>
              <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 dismiss-alert-btn" aria-label="Dismiss alert">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `
    ).join(""), e.querySelectorAll(".dismiss-alert-btn").forEach((s) => {
      s.addEventListener("click", (a) => this.dismissAlert(a));
    })));
  }
  /**
   * Get alert icon SVG
   */
  getAlertIcon(e) {
    return e === "warning" ? '<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' : e === "error" ? '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  }
  /**
   * Dismiss an alert
   */
  dismissAlert(e) {
    const n = e.currentTarget.closest(".flex.items-start");
    n && n.remove();
    const { alertsList: s, noAlerts: a, alertCount: o } = this.elements, c = s?.querySelectorAll(":scope > div").length || 0;
    o && (o.textContent = `${c} active`, c === 0 && (o.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", s && s.classList.add("hidden"), a && a.classList.remove("hidden")));
  }
  /**
   * Render activity feed
   */
  renderActivityFeed() {
    if (!this.healthData) return;
    const { activityFeed: e } = this.elements;
    e && (e.innerHTML = this.healthData.activityFeed.map(
      (t) => `
        <div class="flex items-center gap-3 py-2 border-b last:border-0">
          <div class="w-2 h-2 rounded-full ${t.status === "success" ? "bg-green-500" : "bg-yellow-500"}"></div>
          <div class="flex-1 text-sm">
            <span class="text-gray-700">${this.escapeHtml(t.message)}</span>
          </div>
          <span class="text-xs text-gray-400">${this.escapeHtml(t.time)}</span>
        </div>
      `
    ).join(""));
  }
  /**
   * Update charts
   */
  updateCharts() {
    this.healthData && (this.renderBarChart(
      "sync-chart-canvas",
      this.healthData.chartData.sync,
      ["#22c55e", "#ef4444"],
      ["Success", "Failed"]
    ), this.renderBarChart(
      "conflict-chart-canvas",
      this.healthData.chartData.conflicts,
      ["#f97316", "#22c55e"],
      ["New", "Resolved"]
    ));
  }
  /**
   * Render a bar chart on canvas
   */
  renderBarChart(e, t, n, s) {
    const a = document.getElementById(e);
    if (!a) return;
    const o = a.getContext("2d");
    if (!o) return;
    const c = a.width, d = a.height, l = 40, h = c - l * 2, g = d - l * 2;
    o.clearRect(0, 0, c, d);
    const v = t.labels, m = Object.values(t.datasets), f = h / v.length / (m.length + 1), b = Math.max(...m.flat()) || 1;
    v.forEach((y, x) => {
      const S = l + x * h / v.length + f / 2;
      m.forEach((I, L) => {
        const E = I[x] / b * g, z = S + L * f, T = d - l - E;
        o.fillStyle = n[L] || "#6b7280", o.fillRect(z, T, f - 2, E);
      }), x % Math.ceil(v.length / 6) === 0 && (o.fillStyle = "#6b7280", o.font = "10px sans-serif", o.textAlign = "center", o.fillText(y, S + m.length * f / 2, d - l + 15));
    }), o.fillStyle = "#6b7280", o.font = "10px sans-serif", o.textAlign = "right";
    for (let y = 0; y <= 4; y++) {
      const x = d - l - y * g / 4, S = Math.round(b * y / 4);
      o.fillText(S.toString(), l - 5, x + 3);
    }
  }
  /**
   * Escape HTML
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
function zt(i) {
  const e = new fe(i);
  return w(() => e.init()), e;
}
function Ut(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    autoRefreshInterval: i.autoRefreshInterval || 3e4
  }, t = new fe(e);
  w(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class ve {
  constructor(e) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: r("#mappings-announcements"),
      loadingState: r("#loading-state"),
      emptyState: r("#empty-state"),
      errorState: r("#error-state"),
      mappingsList: r("#mappings-list"),
      mappingsTbody: r("#mappings-tbody"),
      searchInput: r("#search-mappings"),
      filterStatus: r("#filter-status"),
      filterProvider: r("#filter-provider"),
      refreshBtn: r("#refresh-btn"),
      retryBtn: r("#retry-btn"),
      errorMessage: r("#error-message"),
      createMappingBtn: r("#create-mapping-btn"),
      createMappingEmptyBtn: r("#create-mapping-empty-btn"),
      mappingModal: r("#mapping-modal"),
      mappingModalTitle: r("#mapping-modal-title"),
      closeModalBtn: r("#close-modal-btn"),
      cancelModalBtn: r("#cancel-modal-btn"),
      mappingForm: r("#mapping-form"),
      mappingIdInput: r("#mapping-id"),
      mappingVersionInput: r("#mapping-version"),
      mappingNameInput: r("#mapping-name"),
      mappingProviderInput: r("#mapping-provider"),
      schemaObjectTypeInput: r("#schema-object-type"),
      schemaVersionInput: r("#schema-version"),
      schemaFieldsContainer: r("#schema-fields-container"),
      addFieldBtn: r("#add-field-btn"),
      mappingRulesContainer: r("#mapping-rules-container"),
      addRuleBtn: r("#add-rule-btn"),
      validateBtn: r("#validate-btn"),
      saveBtn: r("#save-btn"),
      formValidationStatus: r("#form-validation-status"),
      mappingStatusBadge: r("#mapping-status-badge"),
      publishModal: r("#publish-modal"),
      publishMappingName: r("#publish-mapping-name"),
      publishMappingVersion: r("#publish-mapping-version"),
      publishCancelBtn: r("#publish-cancel-btn"),
      publishConfirmBtn: r("#publish-confirm-btn"),
      deleteModal: r("#delete-modal"),
      deleteCancelBtn: r("#delete-cancel-btn"),
      deleteConfirmBtn: r("#delete-confirm-btn"),
      previewModal: r("#preview-modal"),
      closePreviewBtn: r("#close-preview-btn"),
      previewMappingName: r("#preview-mapping-name"),
      previewMappingProvider: r("#preview-mapping-provider"),
      previewObjectType: r("#preview-object-type"),
      previewMappingStatus: r("#preview-mapping-status"),
      previewSourceInput: r("#preview-source-input"),
      sourceSyntaxError: r("#source-syntax-error"),
      loadSampleBtn: r("#load-sample-btn"),
      runPreviewBtn: r("#run-preview-btn"),
      clearPreviewBtn: r("#clear-preview-btn"),
      previewEmpty: r("#preview-empty"),
      previewLoading: r("#preview-loading"),
      previewError: r("#preview-error"),
      previewErrorMessage: r("#preview-error-message"),
      previewSuccess: r("#preview-success"),
      previewParticipants: r("#preview-participants"),
      participantsCount: r("#participants-count"),
      previewFields: r("#preview-fields"),
      fieldsCount: r("#fields-count"),
      previewMetadata: r("#preview-metadata"),
      previewRawJson: r("#preview-raw-json"),
      previewRulesTbody: r("#preview-rules-tbody")
    };
  }
  /**
   * Initialize the mappings page
   */
  async init() {
    this.setupEventListeners(), await this.loadMappings();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const {
      createMappingBtn: e,
      createMappingEmptyBtn: t,
      closeModalBtn: n,
      cancelModalBtn: s,
      refreshBtn: a,
      retryBtn: o,
      addFieldBtn: c,
      addRuleBtn: d,
      validateBtn: l,
      mappingForm: h,
      publishCancelBtn: g,
      publishConfirmBtn: v,
      deleteCancelBtn: m,
      deleteConfirmBtn: f,
      closePreviewBtn: b,
      loadSampleBtn: y,
      runPreviewBtn: x,
      clearPreviewBtn: S,
      previewSourceInput: I,
      searchInput: L,
      filterStatus: E,
      filterProvider: z,
      mappingModal: T,
      publishModal: _,
      deleteModal: F,
      previewModal: R
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), a?.addEventListener("click", () => this.loadMappings()), o?.addEventListener("click", () => this.loadMappings()), c?.addEventListener("click", () => this.addSchemaField()), d?.addEventListener("click", () => this.addMappingRule()), l?.addEventListener("click", () => this.validateMapping()), h?.addEventListener("submit", (P) => {
      P.preventDefault(), this.saveMapping();
    }), g?.addEventListener("click", () => this.closePublishModal()), v?.addEventListener("click", () => this.publishMapping()), m?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), b?.addEventListener("click", () => this.closePreviewModal()), y?.addEventListener("click", () => this.loadSamplePayload()), x?.addEventListener("click", () => this.runPreviewTransform()), S?.addEventListener("click", () => this.clearPreview()), I?.addEventListener("input", D(() => this.validateSourceJson(), 300)), L?.addEventListener("input", D(() => this.renderMappings(), 300)), E?.addEventListener("change", () => this.renderMappings()), z?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (P) => {
      P.key === "Escape" && (T && !T.classList.contains("hidden") && this.closeModal(), _ && !_.classList.contains("hidden") && this.closePublishModal(), F && !F.classList.contains("hidden") && this.closeDeleteModal(), R && !R.classList.contains("hidden") && this.closePreviewModal());
    }), [T, _, F, R].forEach((P) => {
      P?.addEventListener("click", (Le) => {
        const ne = Le.target;
        (ne === P || ne.getAttribute("aria-hidden") === "true") && (P === T ? this.closeModal() : P === _ ? this.closePublishModal() : P === F ? this.closeDeleteModal() : P === R && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), C(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, mappingsList: a } = this.elements;
    switch (u(t), u(n), u(s), u(a), e) {
      case "loading":
        p(t);
        break;
      case "empty":
        p(n);
        break;
      case "error":
        p(s);
        break;
      case "list":
        p(a);
        break;
    }
  }
  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e || "", t.innerHTML;
  }
  /**
   * Format date string
   */
  formatDate(e) {
    if (!e) return "-";
    try {
      const t = new Date(e);
      return t.toLocaleDateString() + " " + t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return e;
    }
  }
  /**
   * Get status badge HTML
   */
  getStatusBadge(e) {
    const t = {
      draft: { label: "Draft", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
      published: { label: "Published", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" }
    }, n = t[e] || t.draft;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${n.bg} ${n.text}">
      <span class="w-1.5 h-1.5 rounded-full ${n.dot}" aria-hidden="true"></span>
      ${n.label}
    </span>`;
  }
  /**
   * Load mappings from API
   */
  async loadMappings() {
    this.showState("loading");
    try {
      const e = await fetch(this.mappingsEndpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!e.ok) throw new Error(`HTTP ${e.status}`);
      const t = await e.json();
      this.mappings = t.mappings || [], this.populateProviderFilter(), this.renderMappings(), this.announce(`Loaded ${this.mappings.length} mappings`);
    } catch (e) {
      console.error("Error loading mappings:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred"), this.showState("error"), this.announce("Error loading mappings");
    }
  }
  /**
   * Populate provider filter dropdown
   */
  populateProviderFilter() {
    const { filterProvider: e } = this.elements;
    if (!e) return;
    const t = [...new Set(this.mappings.map((n) => n.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + t.map((n) => `<option value="${this.escapeHtml(n)}">${this.escapeHtml(n)}</option>`).join("");
  }
  /**
   * Render mappings list with filters applied
   */
  renderMappings() {
    const { mappingsTbody: e, searchInput: t, filterStatus: n, filterProvider: s } = this.elements;
    if (!e) return;
    const a = (t?.value || "").toLowerCase(), o = n?.value || "", c = s?.value || "", d = this.mappings.filter((l) => !(a && !l.name.toLowerCase().includes(a) && !l.provider.toLowerCase().includes(a) || o && l.status !== o || c && l.provider !== c));
    if (d.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = d.map(
      (l) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(l.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(l.compiled_hash ? l.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(l.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(l.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${l.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(l.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(l.id)}" aria-label="Preview ${this.escapeHtml(l.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(l.id)}" aria-label="Edit ${this.escapeHtml(l.name)}">
              Edit
            </button>
            ${l.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(l.id)}" aria-label="Publish ${this.escapeHtml(l.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(l.id)}" aria-label="Delete ${this.escapeHtml(l.name)}">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `
    ).join(""), this.showState("list"), this.attachRowListeners();
  }
  /**
   * Attach event listeners to table row buttons
   */
  attachRowListeners() {
    const { mappingsTbody: e } = this.elements;
    e && (e.querySelectorAll(".preview-mapping-btn").forEach((t) => {
      t.addEventListener("click", () => this.openPreviewModal(t.dataset.id || ""));
    }), e.querySelectorAll(".edit-mapping-btn").forEach((t) => {
      t.addEventListener("click", () => this.openEditModal(t.dataset.id || ""));
    }), e.querySelectorAll(".publish-mapping-btn").forEach((t) => {
      t.addEventListener("click", () => this.openPublishModal(t.dataset.id || ""));
    }), e.querySelectorAll(".delete-mapping-btn").forEach((t) => {
      t.addEventListener("click", () => this.openDeleteModal(t.dataset.id || ""));
    }));
  }
  // Form management methods
  /**
   * Create a schema field row element
   */
  createSchemaFieldRow(e = {}) {
    const t = document.createElement("div");
    return t.className = "flex items-center gap-2 p-2 bg-gray-50 rounded-lg schema-field-row", t.innerHTML = `
      <input type="text" placeholder="object" value="${this.escapeHtml(e.object || "")}" class="field-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="field" value="${this.escapeHtml(e.field || "")}" class="field-name flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <select class="field-type px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="string" ${e.type === "string" ? "selected" : ""}>string</option>
        <option value="number" ${e.type === "number" ? "selected" : ""}>number</option>
        <option value="boolean" ${e.type === "boolean" ? "selected" : ""}>boolean</option>
        <option value="date" ${e.type === "date" ? "selected" : ""}>date</option>
      </select>
      <label class="flex items-center gap-1 text-xs">
        <input type="checkbox" class="field-required" ${e.required ? "checked" : ""}> Req
      </label>
      <button type="button" class="remove-field-btn text-red-500 hover:text-red-600" aria-label="Remove field">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `, t.querySelector(".remove-field-btn")?.addEventListener("click", () => t.remove()), t;
  }
  /**
   * Create a mapping rule row element
   */
  createMappingRuleRow(e = {}) {
    const t = document.createElement("div");
    return t.className = "flex items-center gap-2 p-2 bg-gray-50 rounded-lg mapping-rule-row", t.innerHTML = `
      <input type="text" placeholder="source_object" value="${this.escapeHtml(e.source_object || "")}" class="rule-source-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="source_field" value="${this.escapeHtml(e.source_field || "")}" class="rule-source-field flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <span class="text-gray-400">→</span>
      <select class="rule-target-entity px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="participant" ${e.target_entity === "participant" ? "selected" : ""}>participant</option>
        <option value="agreement" ${e.target_entity === "agreement" ? "selected" : ""}>agreement</option>
        <option value="field_definition" ${e.target_entity === "field_definition" ? "selected" : ""}>field_definition</option>
        <option value="field_instance" ${e.target_entity === "field_instance" ? "selected" : ""}>field_instance</option>
      </select>
      <input type="text" placeholder="target_path" value="${this.escapeHtml(e.target_path || "")}" class="rule-target-path flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <button type="button" class="remove-rule-btn text-red-500 hover:text-red-600" aria-label="Remove rule">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `, t.querySelector(".remove-rule-btn")?.addEventListener("click", () => t.remove()), t;
  }
  /**
   * Add a new schema field row
   */
  addSchemaField(e) {
    const { schemaFieldsContainer: t } = this.elements;
    t && t.appendChild(this.createSchemaFieldRow(e));
  }
  /**
   * Add a new mapping rule row
   */
  addMappingRule(e) {
    const { mappingRulesContainer: t } = this.elements;
    t && t.appendChild(this.createMappingRuleRow(e));
  }
  /**
   * Collect form data into a mapping spec object
   */
  collectFormData() {
    const {
      mappingIdInput: e,
      mappingVersionInput: t,
      mappingNameInput: n,
      mappingProviderInput: s,
      schemaObjectTypeInput: a,
      schemaVersionInput: o,
      schemaFieldsContainer: c,
      mappingRulesContainer: d
    } = this.elements, l = [];
    c?.querySelectorAll(".schema-field-row").forEach((g) => {
      l.push({
        object: (g.querySelector(".field-object")?.value || "").trim(),
        field: (g.querySelector(".field-name")?.value || "").trim(),
        type: g.querySelector(".field-type")?.value || "string",
        required: g.querySelector(".field-required")?.checked || !1
      });
    });
    const h = [];
    return d?.querySelectorAll(".mapping-rule-row").forEach((g) => {
      h.push({
        source_object: (g.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (g.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: g.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (g.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: s?.value.trim() || "",
      external_schema: {
        object_type: a?.value.trim() || "",
        version: o?.value.trim() || void 0,
        fields: l
      },
      rules: h
    };
  }
  /**
   * Populate form with mapping data
   */
  populateForm(e) {
    const {
      mappingIdInput: t,
      mappingVersionInput: n,
      mappingNameInput: s,
      mappingProviderInput: a,
      schemaObjectTypeInput: o,
      schemaVersionInput: c,
      schemaFieldsContainer: d,
      mappingRulesContainer: l,
      mappingStatusBadge: h,
      formValidationStatus: g
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), s && (s.value = e.name || ""), a && (a.value = e.provider || "");
    const v = e.external_schema || { object_type: "", fields: [] };
    o && (o.value = v.object_type || ""), c && (c.value = v.version || ""), d && (d.innerHTML = "", (v.fields || []).forEach((m) => d.appendChild(this.createSchemaFieldRow(m)))), l && (l.innerHTML = "", (e.rules || []).forEach((m) => l.appendChild(this.createMappingRuleRow(m)))), e.status && h ? (h.innerHTML = this.getStatusBadge(e.status), h.classList.remove("hidden")) : h && h.classList.add("hidden"), u(g);
  }
  /**
   * Reset the form to initial state
   */
  resetForm() {
    const {
      mappingForm: e,
      mappingIdInput: t,
      mappingVersionInput: n,
      schemaFieldsContainer: s,
      mappingRulesContainer: a,
      mappingStatusBadge: o,
      formValidationStatus: c
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), s && (s.innerHTML = ""), a && (a.innerHTML = ""), o && o.classList.add("hidden"), u(c), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), p(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((o) => o.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: s, mappingNameInput: a } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), p(n), a?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    u(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((o) => o.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: s, publishMappingVersion: a } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), a && (a.textContent = `v${t.version || 1}`), p(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    u(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, p(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    u(this.elements.deleteModal), this.pendingDeleteId = null;
  }
  // CRUD operations
  /**
   * Validate mapping
   */
  async validateMapping() {
    const { validateBtn: e, formValidationStatus: t } = this.elements;
    if (!e) return;
    const n = this.collectFormData();
    e.setAttribute("disabled", "true"), e.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Validating...';
    try {
      const s = await fetch(this.mappingsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...n, validate_only: !0 })
      }), a = await s.json();
      if (s.ok && a.status === "ok")
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${this.escapeHtml((a.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation passed");
      else {
        const o = a.errors || [a.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${o.map((c) => `<li>${this.escapeHtml(c)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      p(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, p(t));
    } finally {
      e.removeAttribute("disabled"), e.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Validate';
    }
  }
  /**
   * Save mapping (create or update)
   */
  async saveMapping() {
    const { saveBtn: e } = this.elements;
    if (!e) return;
    const t = this.collectFormData();
    e.setAttribute("disabled", "true"), e.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Saving...';
    try {
      const n = !!t.id, s = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, o = await fetch(s, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!o.ok) {
        const c = await o.json();
        throw new Error(c.error?.message || `HTTP ${o.status}`);
      }
      this.showToast(n ? "Mapping updated" : "Mapping created", "success"), this.announce(n ? "Mapping updated" : "Mapping created"), this.closeModal(), await this.loadMappings();
    } catch (n) {
      console.error("Save error:", n);
      const s = n instanceof Error ? n.message : "Unknown error";
      this.showToast(`Failed to save: ${s}`, "error"), this.announce(`Failed to save: ${s}`);
    } finally {
      e.removeAttribute("disabled"), e.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Save Draft';
    }
  }
  /**
   * Publish mapping
   */
  async publishMapping() {
    if (!this.pendingPublishId) return;
    const e = this.mappings.find((n) => n.id === this.pendingPublishId);
    if (!e) return;
    const { publishConfirmBtn: t } = this.elements;
    if (t) {
      t.setAttribute("disabled", "true"), t.textContent = "Publishing...";
      try {
        const n = await fetch(`${this.mappingsEndpoint}/${this.pendingPublishId}/publish`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ expected_version: e.version })
        });
        if (!n.ok) {
          const s = await n.json();
          throw new Error(s.error?.message || `HTTP ${n.status}`);
        }
        this.showToast("Mapping published", "success"), this.announce("Mapping published"), this.closePublishModal(), await this.loadMappings();
      } catch (n) {
        console.error("Publish error:", n);
        const s = n instanceof Error ? n.message : "Unknown error";
        this.showToast(`Failed to publish: ${s}`, "error");
      } finally {
        t.removeAttribute("disabled"), t.textContent = "Publish";
      }
    }
  }
  /**
   * Delete mapping
   */
  async deleteMapping() {
    if (!this.pendingDeleteId) return;
    const { deleteConfirmBtn: e } = this.elements;
    if (e) {
      e.setAttribute("disabled", "true"), e.textContent = "Deleting...";
      try {
        const t = await fetch(`${this.mappingsEndpoint}/${this.pendingDeleteId}`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!t.ok) {
          const n = await t.json();
          throw new Error(n.error?.message || `HTTP ${t.status}`);
        }
        this.showToast("Mapping deleted", "success"), this.announce("Mapping deleted"), this.closeDeleteModal(), await this.loadMappings();
      } catch (t) {
        console.error("Delete error:", t);
        const n = t instanceof Error ? t.message : "Unknown error";
        this.showToast(`Failed to delete: ${n}`, "error");
      } finally {
        e.removeAttribute("disabled"), e.textContent = "Delete";
      }
    }
  }
  // Preview methods
  /**
   * Open preview modal
   */
  openPreviewModal(e) {
    const t = this.mappings.find((h) => h.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: s,
      previewMappingProvider: a,
      previewObjectType: o,
      previewMappingStatus: c,
      previewSourceInput: d,
      sourceSyntaxError: l
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), a && (a.textContent = t.provider), o && (o.textContent = t.external_schema?.object_type || "-"), c && (c.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), d && (d.value = ""), u(l), p(n), d?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    u(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: s, previewSuccess: a } = this.elements;
    switch (u(t), u(n), u(s), u(a), e) {
      case "empty":
        p(t);
        break;
      case "loading":
        p(n);
        break;
      case "error":
        p(s);
        break;
      case "success":
        p(a);
        break;
    }
  }
  /**
   * Render preview rules table
   */
  renderPreviewRules(e) {
    const { previewRulesTbody: t } = this.elements;
    if (t) {
      if (!e || e.length === 0) {
        t.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-sm text-gray-500">No mapping rules defined</td></tr>';
        return;
      }
      t.innerHTML = e.map(
        (n) => `
      <tr>
        <td class="px-3 py-2 font-mono text-xs">${this.escapeHtml(n.source_object ? n.source_object + "." : "")}${this.escapeHtml(n.source_field)}</td>
        <td class="px-3 py-2 text-center text-gray-400">→</td>
        <td class="px-3 py-2">
          <span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">${this.escapeHtml(n.target_entity)}</span>
        </td>
        <td class="px-3 py-2 font-mono text-xs">${this.escapeHtml(n.target_path)}</td>
        <td class="px-3 py-2" data-rule-source="${this.escapeHtml(n.source_field)}">
          <span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Pending</span>
        </td>
      </tr>
    `
      ).join("");
    }
  }
  /**
   * Load sample payload
   */
  loadSamplePayload() {
    if (!this.currentPreviewMapping) return;
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, s = n.object_type || "data", a = n.fields || [], o = {}, c = {};
    a.forEach((d) => {
      const l = d.field || "field";
      switch (d.type) {
        case "string":
          c[l] = l === "email" ? "john.doe@example.com" : l === "name" ? "John Doe" : `sample_${l}`;
          break;
        case "number":
          c[l] = 123;
          break;
        case "boolean":
          c[l] = !0;
          break;
        case "date":
          c[l] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          c[l] = `sample_${l}`;
      }
    }), o[s] = c, e && (e.value = JSON.stringify(o, null, 2)), u(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return u(t), null;
    try {
      const s = JSON.parse(n);
      return u(t), s;
    } catch (s) {
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, p(t)), null;
    }
  }
  /**
   * Run preview transform
   */
  async runPreviewTransform() {
    const { previewSourceInput: e, previewErrorMessage: t } = this.elements, n = this.validateSourceJson();
    if (!(n === null && e?.value.trim())) {
      if (!n) {
        this.showPreviewState("empty");
        return;
      }
      if (this.currentPreviewMapping) {
        this.showPreviewState("loading");
        try {
          const s = this.simulateTransform(n, this.currentPreviewMapping);
          this.renderPreviewResult(s), this.showPreviewState("success");
        } catch (s) {
          console.error("Transform error:", s), t && (t.textContent = s instanceof Error ? s.message : "Transform failed"), this.showPreviewState("error");
        }
      }
    }
  }
  /**
   * Simulate transform (client-side preview)
   */
  simulateTransform(e, t) {
    const n = t.rules || [], s = {
      participants: [],
      field_definitions: [],
      field_instances: [],
      agreement: {},
      matched_rules: []
    }, a = {}, o = {}, c = [];
    return n.forEach((d) => {
      const l = this.resolveSourceValue(e, d.source_object, d.source_field), h = l !== void 0;
      if (s.matched_rules.push({
        source: d.source_field,
        matched: h,
        value: l
      }), !!h)
        switch (d.target_entity) {
          case "participant":
            a[d.target_path] = l;
            break;
          case "agreement":
            o[d.target_path] = l;
            break;
          case "field_definition":
            c.push({ path: d.target_path, value: l });
            break;
        }
    }), Object.keys(a).length > 0 && s.participants.push({
      ...a,
      role: a.role || "signer",
      signing_stage: a.signing_stage || 1
    }), s.agreement = o, s.field_definitions = c, s;
  }
  /**
   * Resolve source value from payload
   */
  resolveSourceValue(e, t, n) {
    if (!(!e || !n)) {
      if (t && e[t])
        return e[t][n];
      for (const s of Object.keys(e))
        if (typeof e[s] == "object" && e[s] !== null) {
          const a = e[s];
          if (n in a)
            return a[n];
        }
      return e[n];
    }
  }
  /**
   * Render preview result
   */
  renderPreviewResult(e) {
    const {
      previewParticipants: t,
      participantsCount: n,
      previewFields: s,
      fieldsCount: a,
      previewMetadata: o,
      previewRawJson: c,
      previewRulesTbody: d
    } = this.elements, l = e.participants || [];
    n && (n.textContent = `(${l.length})`), t && (l.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = l.map(
      (m) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(m.name || m.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(m.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(m.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(m.role))}</span>
              <span class="text-xs text-gray-500">Stage ${m.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const h = e.field_definitions || [];
    a && (a.textContent = `(${h.length})`), s && (h.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = h.map(
      (m) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(m.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(m.value))}</span>
          </div>
        `
    ).join(""));
    const g = e.agreement || {}, v = Object.entries(g);
    o && (v.length === 0 ? o.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : o.innerHTML = v.map(
      ([m, f]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(m)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(f))}</span>
          </div>
        `
    ).join("")), c && (c.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((m) => {
      const f = d?.querySelector(`[data-rule-source="${this.escapeHtml(m.source)}"] span`);
      f && (m.matched ? (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", f.textContent = "Matched") : (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", f.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), u(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function Nt(i) {
  const e = new ve(i);
  return w(() => e.init()), e;
}
function Gt(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ve(e);
  w(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class ye {
  constructor(e) {
    this.conflicts = [], this.currentConflictId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`, this.elements = {
      announcements: r("#conflicts-announcements"),
      loadingState: r("#loading-state"),
      emptyState: r("#empty-state"),
      errorState: r("#error-state"),
      conflictsList: r("#conflicts-list"),
      errorMessage: r("#error-message"),
      refreshBtn: r("#refresh-btn"),
      retryBtn: r("#retry-btn"),
      filterStatus: r("#filter-status"),
      filterProvider: r("#filter-provider"),
      filterEntity: r("#filter-entity"),
      statPending: r("#stat-pending"),
      statResolved: r("#stat-resolved"),
      statIgnored: r("#stat-ignored"),
      conflictDetailModal: r("#conflict-detail-modal"),
      closeDetailBtn: r("#close-detail-btn"),
      detailReason: r("#detail-reason"),
      detailEntityType: r("#detail-entity-type"),
      detailStatusBadge: r("#detail-status-badge"),
      detailProvider: r("#detail-provider"),
      detailExternalId: r("#detail-external-id"),
      detailInternalId: r("#detail-internal-id"),
      detailBindingId: r("#detail-binding-id"),
      detailPayload: r("#detail-payload"),
      resolutionSection: r("#resolution-section"),
      detailResolvedAt: r("#detail-resolved-at"),
      detailResolvedBy: r("#detail-resolved-by"),
      detailResolution: r("#detail-resolution"),
      detailConflictId: r("#detail-conflict-id"),
      detailRunId: r("#detail-run-id"),
      detailCreatedAt: r("#detail-created-at"),
      detailVersion: r("#detail-version"),
      actionButtons: r("#action-buttons"),
      actionResolveBtn: r("#action-resolve-btn"),
      actionIgnoreBtn: r("#action-ignore-btn"),
      resolveModal: r("#resolve-modal"),
      resolveForm: r("#resolve-form"),
      cancelResolveBtn: r("#cancel-resolve-btn"),
      submitResolveBtn: r("#submit-resolve-btn"),
      resolutionAction: r("#resolution-action")
    };
  }
  /**
   * Initialize the conflicts page
   */
  async init() {
    this.setupEventListeners(), await this.loadConflicts();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const {
      refreshBtn: e,
      retryBtn: t,
      closeDetailBtn: n,
      filterStatus: s,
      filterProvider: a,
      filterEntity: o,
      actionResolveBtn: c,
      actionIgnoreBtn: d,
      cancelResolveBtn: l,
      resolveForm: h,
      conflictDetailModal: g,
      resolveModal: v
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), s?.addEventListener("change", () => this.loadConflicts()), a?.addEventListener("change", () => this.renderConflicts()), o?.addEventListener("change", () => this.renderConflicts()), c?.addEventListener("click", () => this.openResolveModal("resolved")), d?.addEventListener("click", () => this.openResolveModal("ignored")), l?.addEventListener("click", () => this.closeResolveModal()), h?.addEventListener("submit", (m) => this.submitResolution(m)), document.addEventListener("keydown", (m) => {
      m.key === "Escape" && (v && !v.classList.contains("hidden") ? this.closeResolveModal() : g && !g.classList.contains("hidden") && this.closeConflictDetail());
    }), [g, v].forEach((m) => {
      m?.addEventListener("click", (f) => {
        const b = f.target;
        (b === m || b.getAttribute("aria-hidden") === "true") && (m === g ? this.closeConflictDetail() : m === v && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), C(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, conflictsList: a } = this.elements;
    switch (u(t), u(n), u(s), u(a), e) {
      case "loading":
        p(t);
        break;
      case "empty":
        p(n);
        break;
      case "error":
        p(s);
        break;
      case "list":
        p(a);
        break;
    }
  }
  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e || "", t.innerHTML;
  }
  /**
   * Format date string
   */
  formatDate(e) {
    if (!e) return "-";
    try {
      const t = new Date(e);
      return t.toLocaleDateString() + " " + t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return e;
    }
  }
  /**
   * Get status badge HTML
   */
  getStatusBadge(e) {
    const t = {
      pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
      resolved: { label: "Resolved", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
      ignored: { label: "Ignored", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" }
    }, n = t[e] || t.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${n.bg} ${n.text}">
      <span class="w-1.5 h-1.5 rounded-full ${n.dot}" aria-hidden="true"></span>
      ${n.label}
    </span>`;
  }
  /**
   * Get entity badge HTML
   */
  getEntityBadge(e) {
    const n = {
      participant: { label: "Participant", bg: "bg-blue-100", text: "text-blue-700" },
      agreement: { label: "Agreement", bg: "bg-purple-100", text: "text-purple-700" },
      field_definition: { label: "Field Definition", bg: "bg-teal-100", text: "text-teal-700" }
    }[e] || { label: e, bg: "bg-gray-100", text: "text-gray-700" };
    return `<span class="px-2 py-0.5 rounded text-xs font-medium ${n.bg} ${n.text}">${n.label}</span>`;
  }
  /**
   * Load conflicts from API
   */
  async loadConflicts() {
    this.showState("loading");
    try {
      const { filterStatus: e } = this.elements, t = new URLSearchParams();
      e?.value && t.set("status", e.value);
      const n = await fetch(`${this.conflictsEndpoint}${t.toString() ? "?" + t : ""}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!n.ok) throw new Error(`HTTP ${n.status}`);
      const s = await n.json();
      this.conflicts = s.conflicts || [], this.populateProviderFilter(), this.updateStats(), this.renderConflicts(), this.announce(`Loaded ${this.conflicts.length} conflicts`);
    } catch (e) {
      console.error("Error loading conflicts:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred"), this.showState("error");
    }
  }
  /**
   * Populate provider filter dropdown
   */
  populateProviderFilter() {
    const { filterProvider: e } = this.elements;
    if (!e) return;
    const t = e.value, n = [...new Set(this.conflicts.map((s) => s.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + n.map(
      (s) => `<option value="${this.escapeHtml(s)}" ${s === t ? "selected" : ""}>${this.escapeHtml(s)}</option>`
    ).join("");
  }
  /**
   * Update stats display
   */
  updateStats() {
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, s = this.conflicts.filter((c) => c.status === "pending").length, a = this.conflicts.filter((c) => c.status === "resolved").length, o = this.conflicts.filter((c) => c.status === "ignored").length;
    e && (e.textContent = String(s)), t && (t.textContent = String(a)), n && (n.textContent = String(o));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: s } = this.elements;
    if (!e) return;
    const a = t?.value || "", o = n?.value || "", c = s?.value || "", d = this.conflicts.filter((l) => !(a && l.status !== a || o && l.provider !== o || c && l.entity_kind !== c));
    if (d.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = d.map(
      (l) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(l.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${l.status === "pending" ? "bg-amber-100" : l.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${l.status === "pending" ? "text-amber-600" : l.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(l.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(l.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(l.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((l.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(l.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(l.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((l) => {
      l.addEventListener("click", () => this.openConflictDetail(l.dataset.id || ""));
    });
  }
  /**
   * Open conflict detail modal
   */
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find((E) => E.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: s,
      detailEntityType: a,
      detailStatusBadge: o,
      detailProvider: c,
      detailExternalId: d,
      detailInternalId: l,
      detailBindingId: h,
      detailConflictId: g,
      detailRunId: v,
      detailCreatedAt: m,
      detailVersion: f,
      detailPayload: b,
      resolutionSection: y,
      actionButtons: x,
      detailResolvedAt: S,
      detailResolvedBy: I,
      detailResolution: L
    } = this.elements;
    if (s && (s.textContent = t.reason || "Data conflict"), a && (a.textContent = t.entity_kind || "-"), o && (o.innerHTML = this.getStatusBadge(t.status)), c && (c.textContent = t.provider || "-"), d && (d.textContent = t.external_id || "-"), l && (l.textContent = t.internal_id || "-"), h && (h.textContent = t.binding_id || "-"), g && (g.textContent = t.id), v && (v.textContent = t.run_id || "-"), m && (m.textContent = this.formatDate(t.created_at)), f && (f.textContent = String(t.version || 1)), b)
      try {
        const E = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        b.textContent = JSON.stringify(E, null, 2);
      } catch {
        b.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (p(y), u(x), S && (S.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), I && (I.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), L)
        try {
          const E = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          L.textContent = JSON.stringify(E, null, 2);
        } catch {
          L.textContent = t.resolution_json || "{}";
        }
    } else
      u(y), p(x);
    p(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    u(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: s } = this.elements;
    n?.reset(), s && (s.value = e), p(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    u(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const s = new FormData(t);
    let a = {};
    const o = s.get("resolution");
    if (o)
      try {
        a = JSON.parse(o);
      } catch {
        a = { raw: o };
      }
    const c = s.get("notes");
    c && (a.notes = c);
    const d = {
      status: s.get("status"),
      resolution: a
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const l = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(d)
      });
      if (!l.ok) {
        const h = await l.json();
        throw new Error(h.error?.message || `HTTP ${l.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (l) {
      console.error("Resolution error:", l);
      const h = l instanceof Error ? l.message : "Unknown error";
      this.showToast(`Failed: ${h}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit Resolution';
    }
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function Vt(i) {
  const e = new ye(i);
  return w(() => e.init()), e;
}
function qt(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new ye(e);
  w(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class we {
  constructor(e) {
    this.syncRuns = [], this.mappings = [], this.currentRunId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: r("#sync-announcements"),
      loadingState: r("#loading-state"),
      emptyState: r("#empty-state"),
      errorState: r("#error-state"),
      runsTimeline: r("#runs-timeline"),
      errorMessage: r("#error-message"),
      refreshBtn: r("#refresh-btn"),
      retryBtn: r("#retry-btn"),
      filterProvider: r("#filter-provider"),
      filterStatus: r("#filter-status"),
      filterDirection: r("#filter-direction"),
      statTotal: r("#stat-total"),
      statRunning: r("#stat-running"),
      statCompleted: r("#stat-completed"),
      statFailed: r("#stat-failed"),
      startSyncBtn: r("#start-sync-btn"),
      startSyncEmptyBtn: r("#start-sync-empty-btn"),
      startSyncModal: r("#start-sync-modal"),
      startSyncForm: r("#start-sync-form"),
      cancelSyncBtn: r("#cancel-sync-btn"),
      submitSyncBtn: r("#submit-sync-btn"),
      syncMappingSelect: r("#sync-mapping"),
      runDetailModal: r("#run-detail-modal"),
      closeDetailBtn: r("#close-detail-btn"),
      detailRunId: r("#detail-run-id"),
      detailProvider: r("#detail-provider"),
      detailDirection: r("#detail-direction"),
      detailStatus: r("#detail-status"),
      detailStarted: r("#detail-started"),
      detailCompleted: r("#detail-completed"),
      detailCursor: r("#detail-cursor"),
      detailAttempt: r("#detail-attempt"),
      detailErrorSection: r("#detail-error-section"),
      detailLastError: r("#detail-last-error"),
      detailCheckpoints: r("#detail-checkpoints"),
      actionResumeBtn: r("#action-resume-btn"),
      actionRetryBtn: r("#action-retry-btn"),
      actionCompleteBtn: r("#action-complete-btn"),
      actionFailBtn: r("#action-fail-btn"),
      actionDiagnosticsBtn: r("#action-diagnostics-btn")
    };
  }
  /**
   * Initialize the sync runs page
   */
  async init() {
    this.setupEventListeners(), await Promise.all([this.loadMappings(), this.loadSyncRuns()]);
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const {
      startSyncBtn: e,
      startSyncEmptyBtn: t,
      cancelSyncBtn: n,
      startSyncForm: s,
      refreshBtn: a,
      retryBtn: o,
      closeDetailBtn: c,
      filterProvider: d,
      filterStatus: l,
      filterDirection: h,
      actionResumeBtn: g,
      actionRetryBtn: v,
      actionCompleteBtn: m,
      actionFailBtn: f,
      actionDiagnosticsBtn: b,
      startSyncModal: y,
      runDetailModal: x
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), s?.addEventListener("submit", (S) => this.startSync(S)), a?.addEventListener("click", () => this.loadSyncRuns()), o?.addEventListener("click", () => this.loadSyncRuns()), c?.addEventListener("click", () => this.closeRunDetail()), d?.addEventListener("change", () => this.renderTimeline()), l?.addEventListener("change", () => this.renderTimeline()), h?.addEventListener("change", () => this.renderTimeline()), g?.addEventListener("click", () => this.runAction("resume")), v?.addEventListener("click", () => this.runAction("resume")), m?.addEventListener("click", () => this.runAction("complete")), f?.addEventListener("click", () => this.runAction("fail")), b?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (S) => {
      S.key === "Escape" && (y && !y.classList.contains("hidden") && this.closeStartSyncModal(), x && !x.classList.contains("hidden") && this.closeRunDetail());
    }), [y, x].forEach((S) => {
      S?.addEventListener("click", (I) => {
        const L = I.target;
        (L === S || L.getAttribute("aria-hidden") === "true") && (S === y ? this.closeStartSyncModal() : S === x && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), C(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: s, runsTimeline: a } = this.elements;
    switch (u(t), u(n), u(s), u(a), e) {
      case "loading":
        p(t);
        break;
      case "empty":
        p(n);
        break;
      case "error":
        p(s);
        break;
      case "list":
        p(a);
        break;
    }
  }
  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e || "", t.innerHTML;
  }
  /**
   * Format date string
   */
  formatDate(e) {
    if (!e) return "-";
    try {
      const t = new Date(e);
      return t.toLocaleDateString() + " " + t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return e;
    }
  }
  /**
   * Get status badge HTML
   */
  getStatusBadge(e) {
    const t = {
      pending: { label: "Pending", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
      running: {
        label: "Running",
        bg: "bg-blue-100",
        text: "text-blue-700",
        dot: "bg-blue-500",
        animate: !0
      },
      completed: { label: "Completed", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
      failed: { label: "Failed", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" }
    }, n = t[e] || t.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${n.bg} ${n.text}">
      <span class="w-1.5 h-1.5 rounded-full ${n.dot} ${n.animate ? "animate-pulse" : ""}" aria-hidden="true"></span>
      ${n.label}
    </span>`;
  }
  /**
   * Get direction badge HTML
   */
  getDirectionBadge(e) {
    return e === "inbound" ? '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">↓ Inbound</span>' : '<span class="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-medium">↑ Outbound</span>';
  }
  /**
   * Load mappings from API
   */
  async loadMappings() {
    try {
      const e = await fetch(this.mappingsEndpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (e.ok) {
        const t = await e.json();
        this.mappings = (t.mappings || []).filter((n) => n.status === "published"), this.populateMappingSelect();
      }
    } catch (e) {
      console.error("Error loading mappings:", e);
    }
  }
  /**
   * Populate mapping select dropdown
   */
  populateMappingSelect() {
    const { syncMappingSelect: e } = this.elements;
    e && (e.innerHTML = '<option value="">Select mapping...</option>' + this.mappings.map(
      (t) => `<option value="${this.escapeHtml(t.id)}">${this.escapeHtml(t.name)} (${this.escapeHtml(t.provider)})</option>`
    ).join(""));
  }
  /**
   * Load sync runs from API
   */
  async loadSyncRuns() {
    this.showState("loading");
    try {
      const { filterProvider: e } = this.elements, t = new URLSearchParams();
      e?.value && t.set("provider", e.value);
      const n = await fetch(
        `${this.syncRunsEndpoint}${t.toString() ? "?" + t : ""}`,
        {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!n.ok) throw new Error(`HTTP ${n.status}`);
      const s = await n.json();
      this.syncRuns = s.runs || [], this.populateProviderFilter(), this.updateStats(), this.renderTimeline(), this.announce(`Loaded ${this.syncRuns.length} sync runs`);
    } catch (e) {
      console.error("Error loading sync runs:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred"), this.showState("error");
    }
  }
  /**
   * Populate provider filter dropdown
   */
  populateProviderFilter() {
    const { filterProvider: e } = this.elements;
    if (!e) return;
    const t = e.value, n = [...new Set(this.syncRuns.map((s) => s.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + n.map(
      (s) => `<option value="${this.escapeHtml(s)}" ${s === t ? "selected" : ""}>${this.escapeHtml(s)}</option>`
    ).join("");
  }
  /**
   * Update stats display
   */
  updateStats() {
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: s } = this.elements, a = this.syncRuns.length, o = this.syncRuns.filter(
      (l) => l.status === "running" || l.status === "pending"
    ).length, c = this.syncRuns.filter((l) => l.status === "completed").length, d = this.syncRuns.filter((l) => l.status === "failed").length;
    e && (e.textContent = String(a)), t && (t.textContent = String(o)), n && (n.textContent = String(c)), s && (s.textContent = String(d));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const s = t?.value || "", a = n?.value || "", o = this.syncRuns.filter((c) => !(s && c.status !== s || a && c.direction !== a));
    if (o.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = o.map(
      (c) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${this.escapeHtml(c.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${c.status === "running" ? "bg-blue-100" : c.status === "completed" ? "bg-green-100" : c.status === "failed" ? "bg-red-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${c.status === "running" ? "text-blue-600 animate-spin" : c.status === "completed" ? "text-green-600" : c.status === "failed" ? "text-red-600" : "text-gray-400"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">${this.escapeHtml(c.provider)}</span>
                  ${this.getDirectionBadge(c.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${this.escapeHtml(c.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(c.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(c.started_at)}</p>
            </div>
          </div>

          ${c.cursor ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${this.escapeHtml(c.cursor)}</span></p>
            </div>
          ` : ""}

          ${c.last_error ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${this.escapeHtml(c.last_error)}</p>
            </div>
          ` : ""}
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".sync-run-card").forEach((c) => {
      c.addEventListener("click", () => this.openRunDetail(c.dataset.id || ""));
    });
  }
  /**
   * Open start sync modal
   */
  openStartSyncModal() {
    const { startSyncModal: e, startSyncForm: t } = this.elements;
    t?.reset(), p(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    u(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const s = new FormData(t), a = {
      provider: s.get("provider"),
      direction: s.get("direction"),
      mapping_spec_id: s.get("mapping_spec_id"),
      cursor: s.get("cursor") || void 0
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...';
    try {
      const o = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(a)
      });
      if (!o.ok) {
        const c = await o.json();
        throw new Error(c.error?.message || `HTTP ${o.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (o) {
      console.error("Start sync error:", o);
      const c = o instanceof Error ? o.message : "Unknown error";
      this.showToast(`Failed to start: ${c}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync';
    }
  }
  /**
   * Open run detail modal
   */
  async openRunDetail(e) {
    this.currentRunId = e;
    const t = this.syncRuns.find((I) => I.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: s,
      detailProvider: a,
      detailDirection: o,
      detailStatus: c,
      detailStarted: d,
      detailCompleted: l,
      detailCursor: h,
      detailAttempt: g,
      detailErrorSection: v,
      detailLastError: m,
      detailCheckpoints: f,
      actionResumeBtn: b,
      actionRetryBtn: y,
      actionCompleteBtn: x,
      actionFailBtn: S
    } = this.elements;
    s && (s.textContent = t.id), a && (a.textContent = t.provider), o && (o.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), c && (c.innerHTML = this.getStatusBadge(t.status)), d && (d.textContent = this.formatDate(t.started_at)), l && (l.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), h && (h.textContent = t.cursor || "-"), g && (g.textContent = String(t.attempt_count || 1)), t.last_error ? (m && (m.textContent = t.last_error), p(v)) : u(v), b && b.classList.toggle("hidden", t.status !== "running"), y && y.classList.toggle("hidden", t.status !== "failed"), x && x.classList.toggle("hidden", t.status !== "running"), S && S.classList.toggle("hidden", t.status !== "running"), f && (f.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), p(n);
    try {
      const I = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (I.ok) {
        const L = await I.json();
        this.renderCheckpoints(L.checkpoints || []);
      } else
        f && (f.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (I) {
      console.error("Error loading checkpoints:", I), f && (f.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
    }
  }
  /**
   * Render checkpoints
   */
  renderCheckpoints(e) {
    const { detailCheckpoints: t } = this.elements;
    if (t) {
      if (e.length === 0) {
        t.innerHTML = '<p class="text-sm text-gray-500">No checkpoints recorded</p>';
        return;
      }
      t.innerHTML = e.map(
        (n, s) => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
          ${s + 1}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-gray-900">${this.escapeHtml(n.checkpoint_key)}</span>
            <span class="text-xs text-gray-500">${this.formatDate(n.created_at)}</span>
          </div>
          <p class="text-xs text-gray-600 font-mono truncate">Cursor: ${this.escapeHtml(n.cursor)}</p>
        </div>
      </div>
    `
      ).join("");
    }
  }
  /**
   * Close run detail modal
   */
  closeRunDetail() {
    u(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: s, actionFailBtn: a } = this.elements, o = e === "resume" ? t : e === "complete" ? s : a, c = e === "resume" ? n : null;
    if (!o) return;
    o.setAttribute("disabled", "true"), c?.setAttribute("disabled", "true");
    const d = o.innerHTML;
    o.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const l = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, h = await fetch(l, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `${e}-${this.currentRunId}-${Date.now()}`
        },
        body: JSON.stringify(
          e === "fail" ? { last_error: "Manually marked as failed" } : {}
        )
      });
      if (!h.ok) {
        const g = await h.json();
        throw new Error(g.error?.message || `HTTP ${h.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (l) {
      console.error(`${e} error:`, l);
      const h = l instanceof Error ? l.message : "Unknown error";
      this.showToast(`Failed: ${h}`, "error");
    } finally {
      o.removeAttribute("disabled"), c?.removeAttribute("disabled"), o.innerHTML = d;
    }
  }
  /**
   * Open diagnostics for current run
   */
  async openDiagnostics() {
    if (this.currentRunId)
      try {
        const e = await fetch(
          `${this.apiBase}/esign/integrations/diagnostics?run_id=${this.currentRunId}`,
          {
            credentials: "same-origin",
            headers: { Accept: "application/json" }
          }
        );
        if (e.ok) {
          const t = await e.json();
          console.log("Diagnostics:", t), this.showToast("Diagnostics logged to console", "info");
        }
      } catch (e) {
        console.error("Diagnostics error:", e);
      }
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : t === "error" ? s.error(e) : t === "info" && s.info && s.info(e));
  }
}
function Wt(i) {
  const e = new we(i);
  return w(() => e.init()), e;
}
function Jt(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`
  }, t = new we(e);
  w(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const G = "esign.google.account_id", je = 25 * 1024 * 1024, ze = 2e3, ae = 60, W = "application/vnd.google-apps.document", J = "application/pdf", oe = "application/vnd.google-apps.folder", Ue = [W, J];
class K {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || je, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      // Upload panel
      form: r("#document-upload-form"),
      fileInput: r("#pdf_file"),
      uploadZone: r("#pdf-upload-zone"),
      placeholder: r("#upload-placeholder"),
      preview: r("#upload-preview"),
      fileName: r("#selected-file-name"),
      fileSize: r("#selected-file-size"),
      clearBtn: r("#clear-file-btn"),
      errorEl: r("#upload-error"),
      submitBtn: r("#submit-btn"),
      titleInput: r("#title"),
      sourceObjectKeyInput: r("#source_object_key"),
      // Source tabs
      sourceTabs: A(".source-tab"),
      sourcePanels: A(".source-panel"),
      announcements: r("#doc-announcements"),
      // Google Drive panel
      searchInput: r("#drive-search"),
      clearSearchBtn: r("#clear-search-btn"),
      fileList: r("#file-list"),
      loadingState: r("#loading-state"),
      breadcrumb: r("#breadcrumb"),
      listTitle: r("#list-title"),
      resultCount: r("#result-count"),
      pagination: r("#pagination"),
      loadMoreBtn: r("#load-more-btn"),
      refreshBtn: r("#refresh-btn"),
      accountScopeHelp: r("#account-scope-help"),
      connectGoogleLink: r("#connect-google-link"),
      // Selection panel
      noSelection: r("#no-selection"),
      filePreview: r("#file-preview"),
      previewIcon: r("#preview-icon"),
      previewTitle: r("#preview-title"),
      previewType: r("#preview-type"),
      importTypeInfo: r("#import-type-info"),
      importTypeLabel: r("#import-type-label"),
      importTypeDesc: r("#import-type-desc"),
      snapshotWarning: r("#snapshot-warning"),
      importDocumentTitle: r("#import-document-title"),
      importBtn: r("#import-btn"),
      importBtnText: r("#import-btn-text"),
      clearSelectionBtn: r("#clear-selection-btn"),
      // Import status
      importStatus: r("#import-status"),
      importStatusQueued: r("#import-status-queued"),
      importStatusSuccess: r("#import-status-success"),
      importStatusFailed: r("#import-status-failed"),
      importStatusMessage: r("#import-status-message"),
      importErrorMessage: r("#import-error-message"),
      importRetryBtn: r("#import-retry-btn"),
      importReconnectLink: r("#import-reconnect-link")
    };
  }
  /**
   * Initialize the document form page
   */
  async init() {
    this.setupEventListeners(), this.updateAccountScopeUI(), this.initializeSourceFromURL();
  }
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    this.setupSourceTabListeners(), this.setupUploadListeners(), this.config.googleEnabled && this.config.googleConnected && this.setupGoogleDriveListeners();
  }
  /**
   * Setup source tab switching listeners
   */
  setupSourceTabListeners() {
    this.elements.sourceTabs.forEach((e) => {
      e.addEventListener("click", () => {
        if (!e.disabled) {
          const t = e.dataset.source;
          this.switchSource(t);
        }
      });
    });
  }
  /**
   * Setup PDF upload listeners
   */
  setupUploadListeners() {
    const {
      form: e,
      fileInput: t,
      uploadZone: n,
      clearBtn: s,
      titleInput: a
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), s && s.addEventListener("click", (o) => {
      o.preventDefault(), o.stopPropagation(), this.clearFileSelection();
    }), a && a.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((o) => {
      n.addEventListener(o, (c) => {
        c.preventDefault(), c.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((o) => {
      n.addEventListener(o, (c) => {
        c.preventDefault(), c.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (o) => {
      const c = o.dataTransfer;
      c?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = c.files, this.handleFileSelect());
    }), n.addEventListener("keydown", (o) => {
      (o.key === "Enter" || o.key === " ") && (o.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (o) => this.handleFormSubmit(o));
  }
  /**
   * Setup Google Drive listeners
   */
  setupGoogleDriveListeners() {
    const {
      searchInput: e,
      clearSearchBtn: t,
      loadMoreBtn: n,
      refreshBtn: s,
      clearSelectionBtn: a,
      importBtn: o,
      importRetryBtn: c
    } = this.elements;
    if (e) {
      const d = D(() => this.handleSearch(), 300);
      e.addEventListener("input", d);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), a && a.addEventListener("click", () => this.clearFileSelection()), o && o.addEventListener("click", () => this.startImport()), c && c.addEventListener("click", () => {
      this.selectedFile ? this.startImport() : this.clearDriveSelection();
    });
  }
  // ============================================================
  // Account ID Management
  // ============================================================
  /**
   * Resolve initial account ID from query, template, or localStorage
   */
  resolveInitialAccountId() {
    const e = new URLSearchParams(window.location.search), t = this.normalizeAccountId(e.get("account_id"));
    if (t) return t;
    const n = this.normalizeAccountId(this.config.googleAccountId);
    if (n) return n;
    try {
      return this.normalizeAccountId(
        window.localStorage.getItem(G)
      );
    } catch {
      return "";
    }
  }
  /**
   * Normalize account ID
   */
  normalizeAccountId(e) {
    return (e || "").trim();
  }
  /**
   * Sync account ID to URL and localStorage
   */
  syncScopedAccountState() {
    const e = new URL(window.location.href);
    this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString());
    try {
      this.currentAccountId ? window.localStorage.setItem(G, this.currentAccountId) : window.localStorage.removeItem(G);
    } catch {
    }
  }
  /**
   * Apply account ID to a path
   */
  applyAccountIdToPath(e) {
    const t = new URL(e, window.location.origin);
    return this.currentAccountId ? t.searchParams.set("account_id", this.currentAccountId) : t.searchParams.delete("account_id"), `${t.pathname}${t.search}${t.hash}`;
  }
  /**
   * Update account scope UI elements
   */
  updateAccountScopeUI() {
    this.syncScopedAccountState();
    const { accountScopeHelp: e, connectGoogleLink: t } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, p(e)) : u(e)), t) {
      const n = t.dataset.baseHref || t.getAttribute("href");
      n && t.setAttribute("href", this.applyAccountIdToPath(n));
    }
  }
  /**
   * Build scoped API URL
   */
  buildScopedAPIURL(e) {
    const t = new URL(`${this.apiBase}${e}`, window.location.origin);
    return t.searchParams.set("user_id", this.config.userId || ""), this.currentAccountId && t.searchParams.set("account_id", this.currentAccountId), t;
  }
  // ============================================================
  // Source Tab Switching
  // ============================================================
  /**
   * Switch between upload and Google Drive source
   */
  switchSource(e) {
    this.currentSource = e, this.elements.sourceTabs.forEach((n) => {
      const s = n.dataset.source === e;
      n.setAttribute("aria-selected", String(s)), s ? (n.classList.add("border-blue-500", "text-blue-600"), n.classList.remove(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      )) : (n.classList.remove("border-blue-500", "text-blue-600"), n.classList.add(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      ));
    }), this.elements.sourcePanels.forEach((n) => {
      n.id.replace("panel-", "") === e ? p(n) : u(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), C(
      `Switched to ${e === "google" ? "Google Drive import" : "PDF upload"}`
    );
  }
  /**
   * Initialize source from URL parameters
   */
  initializeSourceFromURL() {
    const e = new URLSearchParams(window.location.search), t = e.get("source"), n = e.get("import_run_id");
    t === "google" && this.config.googleEnabled ? (this.switchSource("google"), n && this.config.googleConnected && (this.currentImportRunId = n, this.resumeImportPolling(n))) : this.switchSource("upload");
  }
  // ============================================================
  // PDF Upload
  // ============================================================
  /**
   * Handle file selection
   */
  handleFileSelect() {
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n } = this.elements, s = e?.files?.[0];
    if (s && this.validateFile(s)) {
      if (this.showPreview(s), n && (n.value = ""), t && !t.value.trim()) {
        const a = s.name.replace(/\.pdf$/i, "");
        t.value = a;
      }
    } else
      e && (e.value = ""), this.clearPreview(), n && (n.value = "");
    this.updateSubmitState();
  }
  /**
   * Validate uploaded file
   */
  validateFile(e) {
    return this.clearError(), e ? e.type !== "application/pdf" && !e.name.toLowerCase().endsWith(".pdf") ? (this.showError("Please select a PDF file."), !1) : e.size > this.maxFileSize ? (this.showError(
      `File is too large (${H(e.size)}). Maximum size is ${H(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: s, fileSize: a, uploadZone: o } = this.elements;
    s && (s.textContent = e.name), a && (a.textContent = H(e.size)), t && u(t), n && p(n), o && (o.classList.remove("border-gray-300"), o.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && p(e), t && u(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file selection
   */
  clearFileSelection() {
    const { fileInput: e, sourceObjectKeyInput: t } = this.elements;
    e && (e.value = ""), t && (t.value = ""), this.clearPreview(), this.clearError(), this.updateSubmitState();
  }
  /**
   * Show error message
   */
  showError(e) {
    const { errorEl: t } = this.elements;
    t && (t.textContent = e, p(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", u(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, s = e?.files && e.files.length > 0, a = t?.value.trim().length ?? !1, o = s && a;
    n && (n.disabled = !o, n.setAttribute("aria-disabled", String(!o)));
  }
  /**
   * Set submitting state
   */
  setSubmittingState(e) {
    const { submitBtn: t } = this.elements;
    t && (t.disabled = e, t.setAttribute("aria-disabled", String(e)), e ? t.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Uploading...
      ` : t.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        Upload Document
      `);
  }
  /**
   * Upload source PDF to API
   */
  async uploadSourcePDF(e) {
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), s = t.get("org_id"), a = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && a.searchParams.set("tenant_id", n), s && a.searchParams.set("org_id", s);
    const o = new FormData();
    o.append("file", e);
    const c = await fetch(a.toString(), {
      method: "POST",
      body: o,
      credentials: "same-origin"
    }), d = await c.json().catch(() => ({}));
    if (!c.ok) {
      const h = d?.error?.message || d?.message || "Upload failed. Please try again.";
      throw new Error(h);
    }
    const l = d?.object_key ? String(d.object_key).trim() : "";
    if (!l)
      throw new Error("Upload failed: missing source object key.");
    return l;
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: s } = this.elements, a = t?.files?.[0];
    if (!(!a || !this.validateFile(a))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const o = await this.uploadSourcePDF(a);
        s && (s.value = o), n?.submit();
      } catch (o) {
        const c = o instanceof Error ? o.message : "Upload failed. Please try again.";
        this.showError(c), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
      }
    }
  }
  // ============================================================
  // Google Drive Browser
  // ============================================================
  /**
   * Normalize drive file from API response
   */
  normalizeDriveFile(e) {
    if (!e || typeof e != "object")
      return {
        id: "",
        name: "",
        mimeType: "",
        modifiedTime: "",
        webViewLink: "",
        parents: [],
        owners: []
      };
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), a = String(e.modifiedTime || e.ModifiedTime || "").trim(), o = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), d = String(e.ownerEmail || e.OwnerEmail || "").trim(), l = Array.isArray(e.parents) ? e.parents : c ? [c] : [], h = Array.isArray(e.owners) ? e.owners : d ? [{ emailAddress: d }] : [];
    return {
      id: t,
      name: n,
      mimeType: s,
      modifiedTime: a,
      webViewLink: o,
      parents: l,
      owners: h
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === W;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === J;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === oe;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return Ue.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === W ? "Google Document" : t === J ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === oe ? "Folder" : "File";
  }
  /**
   * Get file icon HTML
   */
  getFileIcon(e) {
    const t = {
      doc: { bg: "bg-blue-100", text: "text-blue-600" },
      pdf: { bg: "bg-red-100", text: "text-red-600" },
      folder: { bg: "bg-gray-100", text: "text-gray-600" },
      default: { bg: "bg-gray-100", text: "text-gray-400" }
    };
    let n = "default";
    this.isFolder(e) ? n = "folder" : this.isGoogleDoc(e) ? n = "doc" : this.isPDF(e) && (n = "pdf");
    const s = t[n];
    return { html: {
      doc: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
      pdf: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>',
      folder: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      default: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>'
    }[n], ...s };
  }
  /**
   * Get import type info for display
   */
  getImportTypeInfo(e) {
    return this.isGoogleDoc(e) ? {
      label: "Google Doc → PDF Export",
      desc: "Will be exported as PDF snapshot",
      bgClass: "bg-blue-50 border-blue-100",
      textClass: "text-blue-700",
      showSnapshot: !0
    } : this.isPDF(e) ? {
      label: "Direct PDF Import",
      desc: "Will be imported as-is",
      bgClass: "bg-green-50 border-green-100",
      textClass: "text-green-700",
      showSnapshot: !1
    } : null;
  }
  /**
   * Load files from Google Drive
   */
  async loadFiles(e = {}) {
    const { folderId: t, query: n, pageToken: s, append: a } = e, { fileList: o } = this.elements;
    !a && o && (o.innerHTML = `
        <div class="p-8 text-center">
          <svg class="animate-spin h-8 w-8 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-500">Loading files...</p>
        </div>
      `);
    try {
      let c;
      n ? (c = this.buildScopedAPIURL("/esign/google-drive/search"), c.searchParams.set("q", n), c.searchParams.set("page_size", "20"), s && c.searchParams.set("page_token", s)) : (c = this.buildScopedAPIURL("/esign/google-drive/browse"), c.searchParams.set("page_size", "20"), t && t !== "root" && c.searchParams.set("folder_id", t), s && c.searchParams.set("page_token", s));
      const d = await fetch(c.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), l = await d.json();
      if (!d.ok)
        throw new Error(l.error?.message || "Failed to load files");
      const h = Array.isArray(l.files) ? l.files.map((f) => this.normalizeDriveFile(f)) : [];
      this.nextPageToken = l.next_page_token || null, a ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.renderFiles(a);
      const { resultCount: g, listTitle: v } = this.elements;
      n && g ? (g.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, v && (v.textContent = "Search Results")) : (g && (g.textContent = ""), v && (v.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: m } = this.elements;
      m && (this.nextPageToken ? p(m) : u(m)), C(`Loaded ${h.length} files`);
    } catch (c) {
      console.error("Error loading files:", c), o && (o.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${this.escapeHtml(c instanceof Error ? c.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), C(`Error: ${c instanceof Error ? c.message : "Unknown error"}`);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles(e = !1) {
    const { fileList: t } = this.elements;
    if (!t) return;
    if (this.currentFiles.length === 0) {
      t.innerHTML = `
        <div class="p-8 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="text-sm text-gray-500">No files found</p>
        </div>
      `;
      return;
    }
    const n = this.currentFiles.map((s, a) => {
      const o = this.getFileIcon(s), c = this.isImportable(s), d = this.isFolder(s), l = this.selectedFile && this.selectedFile.id === s.id, h = !c && !d;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${l ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${h ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${l}"
          data-file-index="${a}"
          ${h ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${o.bg} flex items-center justify-center flex-shrink-0 ${o.text}">
            ${o.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + M(s.modifiedTime) : ""}
              ${h ? " • Not importable" : ""}
            </p>
          </div>
          ${d ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((s) => {
      s.addEventListener("click", () => {
        const a = parseInt(s.dataset.fileIndex || "0", 10), o = this.currentFiles[a];
        this.isFolder(o) ? this.navigateToFolder(o) : this.isImportable(o) && this.selectFile(o);
      });
    });
  }
  /**
   * Navigate to folder
   */
  navigateToFolder(e) {
    this.currentFolderPath.push({ id: e.id, name: e.name }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: n } = this.elements;
    t && (t.value = ""), n && u(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      u(e);
      return;
    }
    p(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, s) => {
      const a = s === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${s > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${s}" class="breadcrumb-item ${a ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const s = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, s + 1), this.updateBreadcrumb();
        const a = this.currentFolderPath[this.currentFolderPath.length - 1];
        this.loadFiles({ folderId: a.id });
      });
    }));
  }
  /**
   * Select a file
   */
  selectFile(e) {
    this.selectedFile = e;
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: s } = this.elements;
    s && s.querySelectorAll(".file-item").forEach((y) => {
      const x = parseInt(y.dataset.fileIndex || "0", 10);
      this.currentFiles[x].id === e.id ? (y.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), y.setAttribute("aria-selected", "true")) : (y.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), y.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: a,
      filePreview: o,
      importStatus: c,
      previewIcon: d,
      previewTitle: l,
      previewType: h,
      importTypeInfo: g,
      importTypeLabel: v,
      importTypeDesc: m,
      snapshotWarning: f,
      importDocumentTitle: b
    } = this.elements;
    a && u(a), o && p(o), c && u(c), d && (d.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, d.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), l && (l.textContent = e.name || "Untitled"), h && (h.textContent = this.getFileTypeName(e.mimeType)), n && g && (g.className = `p-3 rounded-lg border ${n.bgClass}`, v && (v.textContent = n.label, v.className = `text-xs font-medium ${n.textClass}`), m && (m.textContent = n.desc, m.className = `text-xs mt-1 ${n.textClass}`), f && (n.showSnapshot ? p(f) : u(f))), b && (b.value = e.name || ""), C(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: s } = this.elements;
    e && p(e), t && u(t), n && u(n), s && s.querySelectorAll(".file-item").forEach((a) => {
      a.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), a.setAttribute("aria-selected", "false");
    });
  }
  /**
   * Handle search input
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    if (n)
      t && p(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && u(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && u(t), this.searchQuery = "";
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    this.loadFiles({ folderId: n.id });
  }
  /**
   * Load more files
   */
  loadMoreFiles() {
    if (this.nextPageToken) {
      const e = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({
        folderId: this.searchQuery ? void 0 : e.id,
        query: this.searchQuery || void 0,
        pageToken: this.nextPageToken,
        append: !0
      });
    }
  }
  /**
   * Refresh files
   */
  refreshFiles() {
    if (this.searchQuery)
      this.loadFiles({ query: this.searchQuery });
    else {
      const e = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: e.id });
    }
  }
  // ============================================================
  // Async Import with Polling
  // ============================================================
  /**
   * Show import status panel
   */
  showImportStatus(e) {
    const {
      noSelection: t,
      filePreview: n,
      importStatus: s,
      importStatusQueued: a,
      importStatusSuccess: o,
      importStatusFailed: c
    } = this.elements;
    switch (t && u(t), n && u(n), s && p(s), a && u(a), o && u(o), c && u(c), e) {
      case "queued":
      case "running":
        a && p(a);
        break;
      case "succeeded":
        o && p(o);
        break;
      case "failed":
        c && p(c);
        break;
    }
  }
  /**
   * Update import status message
   */
  updateImportStatusMessage(e) {
    const { importStatusMessage: t } = this.elements;
    t && (t.textContent = e);
  }
  /**
   * Show import error
   */
  showImportError(e, t) {
    this.showImportStatus("failed");
    const { importErrorMessage: n, importReconnectLink: s } = this.elements;
    if (n && (n.textContent = e), s)
      if (t === "GOOGLE_ACCESS_REVOKED" || t === "GOOGLE_SCOPE_VIOLATION") {
        const a = this.config.routes.integrations || "/admin/esign/integrations/google";
        s.href = this.applyAccountIdToPath(a), p(s);
      } else
        u(s);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: s } = this.elements;
    if (!this.selectedFile || !e) return;
    const a = e.value.trim();
    if (!a) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), s && u(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const o = new URL(window.location.href);
      o.searchParams.delete("import_run_id"), window.history.replaceState({}, "", o.toString());
      const c = await fetch(
        this.buildScopedAPIURL("/esign/google-drive/imports").toString(),
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            google_file_id: this.selectedFile.id,
            account_id: this.currentAccountId || void 0,
            document_title: a
          })
        }
      ), d = await c.json();
      if (!c.ok) {
        const h = d.error?.code || "";
        throw { message: d.error?.message || "Failed to start import", code: h };
      }
      this.currentImportRunId = d.import_run_id, this.pollAttempts = 0;
      const l = new URL(window.location.href);
      this.currentImportRunId && l.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", l.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (o) {
      console.error("Import error:", o);
      const c = o;
      this.showImportError(c.message || "Failed to start import", c.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), ze);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > ae) {
        this.showImportError(
          "Import is taking too long. Please check the documents list.",
          ""
        );
        return;
      }
      try {
        const e = this.buildScopedAPIURL(
          `/esign/google-drive/imports/${encodeURIComponent(this.currentImportRunId)}`
        ).toString(), t = await fetch(e, {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }), n = await t.json();
        if (!t.ok)
          throw new Error(n.error?.message || "Failed to check import status");
        switch (n.status) {
          case "queued":
            this.updateImportStatusMessage("Waiting in queue..."), this.startPolling();
            break;
          case "running":
            this.updateImportStatusMessage("Importing document..."), this.startPolling();
            break;
          case "succeeded":
            this.showImportStatus("succeeded"), C("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const a = n.error?.code || "", o = n.error?.message || "Import failed";
            this.showImportError(o, a), C("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < ae ? this.startPolling() : this.showImportError("Unable to check import status", "");
      }
    }
  }
  /**
   * Resume import polling from URL parameter
   */
  resumeImportPolling(e) {
    this.currentImportRunId = e, this.pollAttempts = 0, this.showImportStatus("queued"), this.updateImportStatusMessage("Resuming import status..."), this.pollImportStatus();
  }
  // ============================================================
  // Utility
  // ============================================================
  /**
   * Escape HTML
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
function Qt(i) {
  const e = new K(i);
  return w(() => e.init()), e;
}
function Kt(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    userId: i.userId,
    googleEnabled: i.googleEnabled !== !1,
    googleConnected: i.googleConnected !== !1,
    googleAccountId: i.googleAccountId,
    maxFileSize: i.maxFileSize,
    routes: i.routes
  }, t = new K(e);
  w(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Ne(i) {
  const e = String(i.basePath || i.base_path || "").trim(), t = i.routes && typeof i.routes == "object" ? i.routes : {}, n = i.features && typeof i.features == "object" ? i.features : {}, s = i.context && typeof i.context == "object" ? i.context : {}, a = String(t.index || "").trim();
  return !e && !a ? null : {
    basePath: e || "/admin",
    apiBasePath: String(i.apiBasePath || i.api_base_path || "").trim() || void 0,
    userId: String(i.userId || i.user_id || s.user_id || "").trim(),
    googleEnabled: !!(i.googleEnabled ?? n.google_enabled),
    googleConnected: !!(i.googleConnected ?? n.google_connected),
    googleAccountId: String(
      i.googleAccountId || i.google_account_id || s.google_account_id || ""
    ).trim(),
    maxFileSize: typeof i.maxFileSize == "number" ? i.maxFileSize : typeof i.max_file_size == "number" ? i.max_file_size : void 0,
    routes: {
      index: a,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && w(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = Ne(t);
        n && new K(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const ce = 1, V = "esign_wizard_state_v1", Ge = "esign_wizard_sync", Ve = 2e3, le = [1e3, 2e3, 5e3, 1e4, 3e4];
class qe {
  constructor() {
    this.listeners = [], this.broadcastChannel = null, this.state = this.loadFromSession() || this.createInitialState(), this.setupBroadcastChannel();
  }
  createInitialState() {
    return {
      wizardId: this.generateWizardId(),
      version: ce,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      currentStep: 1,
      document: { id: null, title: null, pageCount: null },
      details: { title: "", message: "" },
      participants: [],
      fieldDefinitions: [],
      fieldPlacements: [],
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !1
    };
  }
  generateWizardId() {
    return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  loadFromSession() {
    try {
      const e = sessionStorage.getItem(V);
      if (!e) return null;
      const t = JSON.parse(e);
      return t.version !== ce ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(t)) : t;
    } catch (e) {
      return console.warn("Failed to load wizard state from session:", e), null;
    }
  }
  migrateState(e) {
    return this.createInitialState();
  }
  saveToSession() {
    try {
      this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem(V, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Failed to save wizard state to session:", e);
    }
  }
  setupBroadcastChannel() {
    if (!(typeof BroadcastChannel > "u"))
      try {
        this.broadcastChannel = new BroadcastChannel(Ge), this.broadcastChannel.onmessage = (e) => {
          e.data?.type === "state_update" && e.data.wizardId === this.state.wizardId && this.handleExternalUpdate(e.data.state);
        };
      } catch (e) {
        console.debug("BroadcastChannel not available:", e);
      }
  }
  handleExternalUpdate(e) {
    e.updatedAt > this.state.updatedAt && (this.state = e, this.notifyListeners());
  }
  notifyListeners() {
    for (const e of this.listeners)
      e(this.state);
  }
  broadcastStateUpdate() {
    if (this.broadcastChannel)
      try {
        this.broadcastChannel.postMessage({
          type: "state_update",
          wizardId: this.state.wizardId,
          state: this.state
        });
      } catch (e) {
        console.debug("Failed to broadcast state update:", e);
      }
  }
  getState() {
    return this.state;
  }
  updateState(e) {
    this.state = { ...this.state, ...e, syncPending: !0 }, this.saveToSession(), this.broadcastStateUpdate(), this.notifyListeners();
  }
  updateDocument(e) {
    this.state.document = e, this.saveToSession(), this.broadcastStateUpdate(), this.notifyListeners();
  }
  updateDetails(e) {
    this.state.details = e, this.saveToSession(), this.broadcastStateUpdate(), this.notifyListeners();
  }
  updateParticipants(e) {
    this.state.participants = e, this.saveToSession(), this.broadcastStateUpdate(), this.notifyListeners();
  }
  updateFieldDefinitions(e) {
    this.state.fieldDefinitions = e, this.saveToSession(), this.broadcastStateUpdate(), this.notifyListeners();
  }
  updateFieldPlacements(e) {
    this.state.fieldPlacements = e, this.saveToSession(), this.broadcastStateUpdate(), this.notifyListeners();
  }
  setCurrentStep(e) {
    this.state.currentStep = e, this.saveToSession(), this.broadcastStateUpdate(), this.notifyListeners();
  }
  markSynced(e, t) {
    this.state.serverDraftId = e, this.state.serverRevision = t, this.state.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.syncPending = !1, this.saveToSession();
  }
  subscribe(e) {
    return this.listeners.push(e), () => {
      const t = this.listeners.indexOf(e);
      t !== -1 && this.listeners.splice(t, 1);
    };
  }
  reset() {
    this.state = this.createInitialState(), this.saveToSession(), this.notifyListeners();
  }
  clearSession() {
    try {
      sessionStorage.removeItem(V);
    } catch (e) {
      console.warn("Failed to clear wizard session:", e);
    }
    this.state = this.createInitialState(), this.notifyListeners();
  }
  hasSavedProgress() {
    const e = this.loadFromSession();
    return e !== null && e.currentStep > 1;
  }
  getSavedSummary() {
    const e = this.loadFromSession();
    return e ? {
      title: e.details.title || "Untitled Agreement",
      step: e.currentStep,
      updatedAt: e.updatedAt
    } : null;
  }
  destroy() {
    this.broadcastChannel && (this.broadcastChannel.close(), this.broadcastChannel = null), this.listeners = [];
  }
}
class We {
  constructor(e, t, n, s) {
    this.syncTimeout = null, this.retryCount = 0, this.isSyncing = !1, this.stateManager = e, this.apiBase = t, this.onStatusChange = n, this.onConflict = s;
  }
  scheduleSave() {
    this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => this.syncToServer(), Ve);
  }
  async syncToServer() {
    if (this.isSyncing) return;
    const e = this.stateManager.getState();
    if (e.syncPending) {
      this.isSyncing = !0, this.onStatusChange("syncing");
      try {
        const t = this.buildDraftPayload(e), n = e.serverDraftId ? "PUT" : "POST", s = e.serverDraftId ? `${this.apiBase}/esign/drafts/${e.serverDraftId}` : `${this.apiBase}/esign/drafts`, a = await fetch(s, {
          method: n,
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...e.serverDraftId ? { "If-Match": String(e.serverRevision) } : {}
          },
          body: JSON.stringify(t)
        });
        if (a.status === 409) {
          const c = await a.json();
          this.onStatusChange("conflict"), this.onConflict(e.updatedAt, c.server_updated_at || "", c.revision || 0);
          return;
        }
        if (!a.ok)
          throw new Error(`Sync failed: ${a.status}`);
        const o = await a.json();
        this.stateManager.markSynced(o.id || o.draft_id, o.revision || 1), this.retryCount = 0, this.onStatusChange("synced");
      } catch (t) {
        console.error("Server sync error:", t), this.onStatusChange("error"), this.scheduleRetry();
      } finally {
        this.isSyncing = !1;
      }
    }
  }
  scheduleRetry() {
    if (this.retryCount >= le.length) {
      console.warn("Max sync retries reached");
      return;
    }
    const e = le[this.retryCount];
    this.retryCount++, setTimeout(() => this.syncToServer(), e);
  }
  buildDraftPayload(e) {
    return {
      wizard_id: e.wizardId,
      current_step: e.currentStep,
      document_id: e.document.id,
      title: e.details.title,
      message: e.details.message,
      participants: e.participants,
      field_definitions: e.fieldDefinitions,
      field_placements: e.fieldPlacements
    };
  }
  async forceOverwrite() {
    this.stateManager.getState(), this.stateManager.updateState({ serverRevision: 0, syncPending: !0 }), await this.syncToServer();
  }
  async loadServerVersion() {
    const e = this.stateManager.getState();
    if (e.serverDraftId)
      try {
        const t = await fetch(`${this.apiBase}/esign/drafts/${e.serverDraftId}`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!t.ok)
          throw new Error(`Failed to load draft: ${t.status}`);
        const n = await t.json();
        this.stateManager.updateState({
          document: {
            id: n.document_id,
            title: n.document_title,
            pageCount: n.document_page_count
          },
          details: {
            title: n.title || "",
            message: n.message || ""
          },
          participants: n.participants || [],
          fieldDefinitions: n.field_definitions || [],
          fieldPlacements: n.field_placements || [],
          serverRevision: n.revision || 0,
          syncPending: !1
        }), this.onStatusChange("synced");
      } catch (t) {
        console.error("Failed to load server version:", t), this.onStatusChange("error");
      }
  }
  destroy() {
    this.syncTimeout && (clearTimeout(this.syncTimeout), this.syncTimeout = null);
  }
}
class Y {
  constructor(e) {
    this.currentStep = 1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.stateManager = new qe(), this.syncManager = new We(
      this.stateManager,
      this.apiBase,
      (t) => this.updateSyncStatusUI(t),
      (t, n, s) => this.showConflictDialog(t, n, s)
    ), this.elements = {
      // Navigation
      wizardSteps: A(".wizard-step"),
      prevBtn: r("#prev-btn"),
      nextBtn: r("#next-btn"),
      submitBtn: r("#submit-btn"),
      // Sync status
      syncStatusIndicator: r("#sync-status-indicator"),
      syncStatusIcon: r("#sync-status-icon"),
      syncStatusText: r("#sync-status-text"),
      syncRetryBtn: r("#sync-retry-btn"),
      // Step panels
      stepPanels: A(".step-panel"),
      // Resume dialog
      resumeDialogModal: r("#resume-dialog-modal"),
      resumeDraftTitle: r("#resume-draft-title"),
      resumeDraftStep: r("#resume-draft-step"),
      resumeDraftTime: r("#resume-draft-time"),
      resumeContinueBtn: r("#resume-continue-btn"),
      resumeNewBtn: r("#resume-new-btn"),
      resumeDiscardBtn: r("#resume-discard-btn"),
      // Conflict dialog
      conflictDialogModal: r("#conflict-dialog-modal"),
      conflictLocalTime: r("#conflict-local-time"),
      conflictServerTime: r("#conflict-server-time"),
      conflictServerRevision: r("#conflict-server-revision"),
      conflictReloadBtn: r("#conflict-reload-btn"),
      conflictForceBtn: r("#conflict-force-btn"),
      conflictDismissBtn: r("#conflict-dismiss-btn"),
      // Step 1
      documentSearch: r("#document-search"),
      documentList: r("#document-list"),
      selectedDocumentDisplay: r("#selected-document-display"),
      // Step 2
      titleInput: r("#agreement-title"),
      messageInput: r("#agreement-message"),
      // Step 3
      participantsList: r("#participants-list"),
      addParticipantBtn: r("#add-participant-btn"),
      // Step 4
      fieldDefinitionsList: r("#field-definitions-list"),
      addFieldBtn: r("#add-field-btn"),
      // Step 5
      pdfViewer: r("#pdf-viewer"),
      fieldPalette: r("#field-palette"),
      // Form
      form: r("#agreement-form"),
      announcements: r("#agreement-announcements")
    };
  }
  async init() {
    this.setupEventListeners(), this.checkForSavedProgress(), this.stateManager.subscribe(() => {
      this.syncManager.scheduleSave();
    });
    const e = this.stateManager.getState();
    e.currentStep > 1 && (this.currentStep = e.currentStep), this.updateWizardUI(), this.config.isEditMode && this.elements.syncStatusIndicator && u(this.elements.syncStatusIndicator);
  }
  setupEventListeners() {
    this.elements.prevBtn && this.elements.prevBtn.addEventListener("click", () => this.goToPreviousStep()), this.elements.nextBtn && this.elements.nextBtn.addEventListener("click", () => this.goToNextStep()), this.elements.wizardSteps.forEach((e, t) => {
      e.addEventListener("click", () => {
        this.canNavigateToStep(t + 1) && this.goToStep(t + 1);
      });
    }), this.elements.syncRetryBtn && this.elements.syncRetryBtn.addEventListener("click", () => {
      this.syncManager.syncToServer();
    }), this.elements.resumeContinueBtn && this.elements.resumeContinueBtn.addEventListener("click", () => {
      this.resumeSavedProgress();
    }), this.elements.resumeNewBtn && this.elements.resumeNewBtn.addEventListener("click", () => {
      this.stateManager.reset(), this.hideResumeDialog(), this.currentStep = 1, this.updateWizardUI();
    }), this.elements.resumeDiscardBtn && this.elements.resumeDiscardBtn.addEventListener("click", () => {
      this.stateManager.clearSession(), this.hideResumeDialog();
    }), this.elements.conflictReloadBtn && this.elements.conflictReloadBtn.addEventListener("click", async () => {
      await this.syncManager.loadServerVersion(), this.hideConflictDialog(), this.updateWizardUI();
    }), this.elements.conflictForceBtn && this.elements.conflictForceBtn.addEventListener("click", async () => {
      await this.syncManager.forceOverwrite(), this.hideConflictDialog();
    }), this.elements.conflictDismissBtn && this.elements.conflictDismissBtn.addEventListener("click", () => {
      this.hideConflictDialog();
    }), this.elements.titleInput && this.elements.titleInput.addEventListener(
      "input",
      D(() => this.handleDetailsChange(), 300)
    ), this.elements.messageInput && this.elements.messageInput.addEventListener(
      "input",
      D(() => this.handleDetailsChange(), 300)
    ), this.elements.form && this.elements.form.addEventListener("submit", (e) => this.handleFormSubmit(e));
  }
  checkForSavedProgress() {
    if (this.config.isEditMode) return;
    const e = this.stateManager.getSavedSummary();
    e && e.step > 1 && this.showResumeDialog(e);
  }
  showResumeDialog(e) {
    const { resumeDialogModal: t, resumeDraftTitle: n, resumeDraftStep: s, resumeDraftTime: a } = this.elements;
    n && (n.textContent = e.title), s && (s.textContent = String(e.step)), a && (a.textContent = M(e.updatedAt)), t && p(t);
  }
  hideResumeDialog() {
    this.elements.resumeDialogModal && u(this.elements.resumeDialogModal);
  }
  resumeSavedProgress() {
    const e = this.stateManager.getState();
    this.currentStep = e.currentStep, this.restoreStateToUI(), this.hideResumeDialog(), this.updateWizardUI();
  }
  restoreStateToUI() {
    const e = this.stateManager.getState();
    this.elements.titleInput && (this.elements.titleInput.value = e.details.title), this.elements.messageInput && (this.elements.messageInput.value = e.details.message);
  }
  showConflictDialog(e, t, n) {
    const { conflictDialogModal: s, conflictLocalTime: a, conflictServerTime: o, conflictServerRevision: c } = this.elements;
    a && (a.textContent = M(e)), o && (o.textContent = M(t)), c && (c.textContent = String(n)), s && p(s);
  }
  hideConflictDialog() {
    this.elements.conflictDialogModal && u(this.elements.conflictDialogModal);
  }
  updateSyncStatusUI(e) {
    const { syncStatusIndicator: t, syncStatusIcon: n, syncStatusText: s, syncRetryBtn: a } = this.elements;
    if (!(!t || !n || !s))
      switch (p(t), e) {
        case "syncing":
          n.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", s.textContent = "Saving...", a && u(a);
          break;
        case "synced":
          n.className = "w-2 h-2 rounded-full bg-green-500", s.textContent = "Saved", a && u(a);
          break;
        case "error":
          n.className = "w-2 h-2 rounded-full bg-red-500", s.textContent = "Save failed", a && p(a);
          break;
        case "conflict":
          n.className = "w-2 h-2 rounded-full bg-amber-500", s.textContent = "Conflict", a && u(a);
          break;
      }
  }
  handleDetailsChange() {
    const e = this.elements.titleInput?.value || "", t = this.elements.messageInput?.value || "";
    this.stateManager.updateDetails({ title: e, message: t });
  }
  canNavigateToStep(e) {
    return e < this.currentStep ? !0 : e <= this.currentStep + 1;
  }
  goToStep(e) {
    e < 1 || e > 6 || this.canNavigateToStep(e) && (this.currentStep = e, this.stateManager.setCurrentStep(e), this.updateWizardUI(), C(`Step ${e} of 6`));
  }
  goToNextStep() {
    this.currentStep < 6 && this.goToStep(this.currentStep + 1);
  }
  goToPreviousStep() {
    this.currentStep > 1 && this.goToStep(this.currentStep - 1);
  }
  updateWizardUI() {
    this.elements.wizardSteps.forEach((e, t) => {
      const n = t + 1, s = n === this.currentStep, a = n < this.currentStep;
      e.classList.toggle("active", s), e.classList.toggle("completed", a), e.setAttribute("aria-current", s ? "step" : "false");
    }), this.elements.stepPanels.forEach((e, t) => {
      t + 1 === this.currentStep ? p(e) : u(e);
    }), this.elements.prevBtn && (this.currentStep === 1 ? u(this.elements.prevBtn) : p(this.elements.prevBtn)), this.elements.nextBtn && (this.currentStep === 6 ? u(this.elements.nextBtn) : p(this.elements.nextBtn)), this.elements.submitBtn && (this.currentStep === 6 ? p(this.elements.submitBtn) : u(this.elements.submitBtn));
  }
  async handleFormSubmit(e) {
    e.preventDefault();
    const t = this.stateManager.getState();
    try {
      const n = await fetch(`${this.apiBase}/esign/agreements`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          document_id: t.document.id,
          title: t.details.title,
          message: t.details.message,
          participants: t.participants,
          field_definitions: t.fieldDefinitions,
          field_placements: t.fieldPlacements
        })
      });
      if (!n.ok) {
        const a = await n.json();
        throw new Error(a.error?.message || "Failed to create agreement");
      }
      const s = await n.json();
      this.stateManager.clearSession(), s.id ? window.location.href = `${this.config.routes.index}/${s.id}` : window.location.href = this.config.routes.index;
    } catch (n) {
      console.error("Agreement submission error:", n), C(`Error: ${n instanceof Error ? n.message : "Submission failed"}`);
    }
  }
  destroy() {
    this.stateManager.destroy(), this.syncManager.destroy();
  }
}
function Yt(i) {
  const e = new Y(i);
  return w(() => e.init()), e;
}
function Zt(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api/v1`,
    isEditMode: i.isEditMode || !1,
    createSuccess: i.createSuccess,
    agreementId: i.agreementId,
    routes: i.routes
  }, t = new Y(e);
  w(() => t.init()), typeof window < "u" && (window.esignAgreementFormController = t);
}
typeof document < "u" && w(() => {
  if (document.querySelector('[data-esign-page="agreement-form"]')) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(e.textContent || "{}");
        (t.basePath || t.routes?.index) && new Y({
          basePath: t.base_path || t.basePath || "",
          apiBasePath: t.api_base_path || t.apiBasePath,
          isEditMode: t.is_edit || t.isEditMode || !1,
          createSuccess: t.create_success || t.createSuccess,
          routes: t.routes || { index: "" }
        }).init();
      } catch (t) {
        console.warn("Failed to parse agreement form page config:", t);
      }
  }
});
class Je {
  constructor(e) {
    this.events = [], this.flushInterval = null, this.enabled = e.enabled, this.apiBasePath = e.apiBasePath, this.token = e.token, this.sessionId = this.generateSessionId(), this.enabled && (this.startAutoFlush(), this.setupBeforeUnload());
  }
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  track(e, t) {
    this.enabled && (this.events.push({
      type: e,
      timestamp: Date.now(),
      data: t
    }), this.events.length >= 50 && this.flush());
  }
  startAutoFlush() {
    this.flushInterval = setInterval(() => this.flush(), 3e4);
  }
  setupBeforeUnload() {
    window.addEventListener("beforeunload", () => {
      this.flush(!0);
    });
  }
  async flush(e = !1) {
    if (this.events.length === 0) return;
    const t = [...this.events];
    this.events = [];
    const n = {
      session_id: this.sessionId,
      events: t
    };
    try {
      e && navigator.sendBeacon ? navigator.sendBeacon(
        `${this.apiBasePath}/telemetry`,
        JSON.stringify(n)
      ) : await fetch(`${this.apiBasePath}/telemetry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(n)
      });
    } catch (s) {
      console.debug("Telemetry flush failed:", s), this.events = [...t, ...this.events];
    }
  }
  destroy() {
    this.flushInterval && (clearInterval(this.flushInterval), this.flushInterval = null), this.flush(!0);
  }
}
class Qe {
  constructor(e, t, n, s) {
    this.pdfDoc = null, this.currentPage = 1, this.scale = 1, this.minScale = 0.5, this.maxScale = 3, this.config = e, this.container = t, this.canvas = r("#pdf-canvas", t ?? void 0), this.pageIndicator = r("#page-indicator", t ?? void 0), this.onPageChange = n, this.onScaleChange = s;
  }
  async loadDocument() {
    if (!this.config.documentUrl) {
      console.error("No document URL provided");
      return;
    }
    try {
      console.debug("Loading PDF from:", this.config.documentUrl);
    } catch (e) {
      console.error("Failed to load PDF:", e);
    }
  }
  goToPage(e) {
    e < 1 || e > this.config.pageCount || (this.currentPage = e, this.renderCurrentPage(), this.onPageChange(e));
  }
  nextPage() {
    this.currentPage < this.config.pageCount && this.goToPage(this.currentPage + 1);
  }
  prevPage() {
    this.currentPage > 1 && this.goToPage(this.currentPage - 1);
  }
  zoomIn() {
    const e = Math.min(this.scale * 1.2, this.maxScale);
    this.setScale(e);
  }
  zoomOut() {
    const e = Math.max(this.scale / 1.2, this.minScale);
    this.setScale(e);
  }
  fitToWidth() {
    this.container && (this.container.clientWidth, this.setScale(1));
  }
  setScale(e) {
    this.scale = e, this.renderCurrentPage(), this.onScaleChange(e);
  }
  renderCurrentPage() {
    this.pageIndicator && (this.pageIndicator.textContent = `Page ${this.currentPage} of ${this.config.pageCount}`);
  }
  getCurrentPage() {
    return this.currentPage;
  }
  getScale() {
    return this.scale;
  }
  destroy() {
    this.pdfDoc = null;
  }
}
class Ke {
  constructor(e, t, n, s) {
    this.fields = /* @__PURE__ */ new Map(), this.currentFieldIndex = 0, this.config = e, this.overlayContainer = t, this.onFieldActivate = n, this.onFieldComplete = s;
    for (const a of e.fields)
      this.fields.set(a.id, a);
  }
  renderOverlays(e, t) {
    if (!this.overlayContainer) return;
    this.overlayContainer.querySelectorAll(
      `.field-overlay[data-page="${e}"]`
    ).forEach((a) => a.remove());
    const s = this.config.fields.filter((a) => a.page === e);
    for (const a of s) {
      const o = this.createFieldOverlay(a, t);
      this.overlayContainer.appendChild(o);
    }
  }
  createFieldOverlay(e, t) {
    const n = document.createElement("button");
    return n.className = `field-overlay field-overlay-${e.type} ${e.completed ? "completed" : ""}`, n.type = "button", n.dataset.fieldId = e.id, n.dataset.page = String(e.page), n.setAttribute("role", "button"), n.setAttribute(
      "aria-label",
      `${e.type} field${e.required ? " (required)" : ""}`
    ), n.style.left = `${e.x * t}px`, n.style.top = `${e.y * t}px`, n.style.width = `${e.width * t}px`, n.style.height = `${e.height * t}px`, n.addEventListener("click", () => {
      this.onFieldActivate(e);
    }), n;
  }
  getNextIncompleteField() {
    return this.config.fields.filter(
      (t) => !t.completed && t.recipientId === this.config.recipientId
    )[0] || null;
  }
  getAllFields() {
    return this.config.fields;
  }
  getFieldsForPage(e) {
    return this.config.fields.filter((t) => t.page === e);
  }
  getCompletionStatus() {
    const e = this.config.fields.filter(
      (n) => n.recipientId === this.config.recipientId
    ), t = e.filter((n) => n.required);
    return {
      completed: e.filter((n) => n.completed).length,
      total: e.length,
      required: t.length,
      requiredCompleted: t.filter((n) => n.completed).length
    };
  }
  markFieldComplete(e, t) {
    const n = this.fields.get(e);
    n && (n.value = t, n.completed = !0, this.onFieldComplete(n, t));
  }
  destroy() {
    this.overlayContainer && this.overlayContainer.querySelectorAll(".field-overlay").forEach((t) => t.remove());
  }
}
class be {
  constructor(e) {
    this.pdfViewer = null, this.fieldOverlay = null, this.config = e, this.telemetry = new Je({
      enabled: e.telemetryEnabled,
      apiBasePath: e.apiBasePath,
      token: e.token
    }), this.elements = {
      pdfContainer: r("#pdf-container"),
      overlayContainer: r("#field-overlays"),
      fieldList: r("#field-list"),
      progressBar: r("#progress-bar"),
      progressText: r("#progress-text"),
      consentModal: r("#consent-modal"),
      declineModal: r("#decline-modal"),
      signatureModal: r("#signature-modal"),
      submitBtn: r("#submit-btn"),
      declineBtn: r("#decline-btn"),
      prevPageBtn: r("#prev-page-btn"),
      nextPageBtn: r("#next-page-btn"),
      zoomInBtn: r("#zoom-in-btn"),
      zoomOutBtn: r("#zoom-out-btn"),
      announcements: r("#announcements")
    };
  }
  async init() {
    this.telemetry.track("page_load", {
      agreement_id: this.config.agreementId,
      recipient_id: this.config.recipientId
    }), this.pdfViewer = new Qe(
      this.config,
      this.elements.pdfContainer,
      (e) => this.handlePageChange(e),
      (e) => this.handleScaleChange(e)
    ), this.fieldOverlay = new Ke(
      this.config,
      this.elements.overlayContainer,
      (e) => this.handleFieldActivate(e),
      (e, t) => this.handleFieldComplete(e, t)
    ), this.setupEventListeners(), this.config.hasConsented ? (await this.pdfViewer.loadDocument(), this.updateProgress()) : this.showConsentModal();
  }
  setupEventListeners() {
    this.elements.prevPageBtn && this.elements.prevPageBtn.addEventListener("click", () => {
      this.pdfViewer?.prevPage();
    }), this.elements.nextPageBtn && this.elements.nextPageBtn.addEventListener("click", () => {
      this.pdfViewer?.nextPage();
    }), this.elements.zoomInBtn && this.elements.zoomInBtn.addEventListener("click", () => {
      this.pdfViewer?.zoomIn();
    }), this.elements.zoomOutBtn && this.elements.zoomOutBtn.addEventListener("click", () => {
      this.pdfViewer?.zoomOut();
    }), document.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }
  handleKeyDown(e) {
    e.key === "ArrowLeft" && !this.isInInputField(e.target) ? this.pdfViewer?.prevPage() : e.key === "ArrowRight" && !this.isInInputField(e.target) && this.pdfViewer?.nextPage(), e.key === "Escape" && this.hideAllModals();
  }
  isInInputField(e) {
    if (!e) return !1;
    const t = e;
    return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
  }
  handlePageChange(e) {
    this.telemetry.track("page_view", { page: e }), this.fieldOverlay && this.pdfViewer && this.fieldOverlay.renderOverlays(e, this.pdfViewer.getScale()), C(`Page ${e} of ${this.config.pageCount}`);
  }
  handleScaleChange(e) {
    this.fieldOverlay && this.pdfViewer && this.fieldOverlay.renderOverlays(
      this.pdfViewer.getCurrentPage(),
      e
    );
  }
  handleFieldActivate(e) {
    switch (this.telemetry.track("field_activate", {
      field_id: e.id,
      field_type: e.type
    }), e.type) {
      case "signature":
      case "initials":
        this.showSignatureModal(e);
        break;
      case "date":
        this.showDatePicker(e);
        break;
      case "text":
        this.showTextInput(e);
        break;
      case "checkbox":
        this.toggleCheckbox(e);
        break;
    }
  }
  handleFieldComplete(e, t) {
    this.telemetry.track("field_complete", {
      field_id: e.id,
      field_type: e.type
    }), this.updateProgress();
    const n = this.fieldOverlay?.getCompletionStatus();
    n && n.requiredCompleted === n.required && this.enableSubmit();
  }
  updateProgress() {
    const e = this.fieldOverlay?.getCompletionStatus();
    if (!e) return;
    const t = e.total > 0 ? Math.round(e.completed / e.total * 100) : 0;
    this.elements.progressBar && (this.elements.progressBar.style.width = `${t}%`), this.elements.progressText && (this.elements.progressText.textContent = `${e.completed} of ${e.total} fields completed`);
  }
  enableSubmit() {
    this.elements.submitBtn && (this.elements.submitBtn.removeAttribute("disabled"), this.elements.submitBtn.classList.remove("opacity-50", "cursor-not-allowed")), C("All required fields completed. You can now submit.");
  }
  showConsentModal() {
    this.elements.consentModal && p(this.elements.consentModal);
  }
  showSignatureModal(e) {
    this.elements.signatureModal && p(this.elements.signatureModal);
  }
  showDatePicker(e) {
  }
  showTextInput(e) {
  }
  toggleCheckbox(e) {
    const t = e.value === "true" ? "false" : "true";
    this.fieldOverlay?.markFieldComplete(e.id, t);
  }
  hideAllModals() {
    this.elements.consentModal && u(this.elements.consentModal), this.elements.declineModal && u(this.elements.declineModal), this.elements.signatureModal && u(this.elements.signatureModal);
  }
  destroy() {
    this.telemetry.destroy(), this.pdfViewer?.destroy(), this.fieldOverlay?.destroy();
  }
}
function Xt(i) {
  const e = new be(i);
  return w(() => e.init()), e;
}
function en(i) {
  const e = {
    token: i.token,
    apiBasePath: i.apiBasePath || "/api/v1/esign/signing",
    signerBasePath: i.signerBasePath || "/esign/sign",
    agreementId: i.agreementId,
    recipientId: i.recipientId,
    documentUrl: i.documentUrl,
    pageCount: i.pageCount || 1,
    hasConsented: i.hasConsented || !1,
    fields: i.fields || [],
    flowMode: i.flowMode || "unified",
    telemetryEnabled: i.telemetryEnabled !== !1,
    viewer: {
      coordinateSpace: i.viewer?.coordinateSpace || "pdf",
      contractVersion: i.viewer?.contractVersion || "1.0",
      unit: i.viewer?.unit || "pt",
      origin: i.viewer?.origin || "top-left",
      yAxisDirection: i.viewer?.yAxisDirection || "down",
      pages: i.viewer?.pages || []
    },
    signerState: i.signerState || "active",
    recipientStage: i.recipientStage || 1,
    activeStage: i.activeStage || 1,
    activeRecipientIds: i.activeRecipientIds || [],
    waitingForRecipientIds: i.waitingForRecipientIds || []
  }, t = new be(e);
  w(() => t.init()), typeof window < "u" && (window.esignSignerReviewController = t);
}
typeof document < "u" && w(() => {
  document.querySelector(
    '[data-esign-page="signer-review"], [data-esign-page="signer.review"]'
  ) && console.debug("Signer review page detected - module loaded");
});
class xe {
  constructor(e = {}) {
    this.config = e;
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
    A('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), A('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function tn(i = {}) {
  const e = new xe(i);
  return w(() => e.init()), e;
}
function nn(i = {}) {
  const e = new xe(i);
  w(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class Z {
  constructor(e) {
    this.pdfDoc = null, this.currentPage = 1, this.isLoading = !1, this.isLoaded = !1, this.scale = 1.5, this.config = e, this.elements = {
      loadBtn: r("#pdf-load-btn"),
      retryBtn: r("#pdf-retry-btn"),
      loading: r("#pdf-loading"),
      spinner: r("#pdf-spinner"),
      error: r("#pdf-error"),
      errorMessage: r("#pdf-error-message"),
      viewer: r("#pdf-viewer"),
      canvas: r("#pdf-canvas"),
      pagination: r("#pdf-pagination"),
      prevBtn: r("#pdf-prev-page"),
      nextBtn: r("#pdf-next-page"),
      currentPageEl: r("#pdf-current-page"),
      totalPagesEl: r("#pdf-total-pages"),
      status: r("#pdf-status")
    };
  }
  /**
   * Initialize the controller
   */
  init() {
    this.setupEventListeners();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const { loadBtn: e, retryBtn: t, prevBtn: n, nextBtn: s } = this.elements;
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), s && s.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (a) => {
      this.isLoaded && (a.key === "ArrowLeft" || a.key === "PageUp" ? this.goToPage(this.currentPage - 1) : (a.key === "ArrowRight" || a.key === "PageDown") && this.goToPage(this.currentPage + 1));
    });
  }
  /**
   * Load the PDF document
   */
  async loadPdf() {
    if (!this.isLoading) {
      this.isLoading = !0, this.showSpinner();
      try {
        if (typeof pdfjsLib > "u")
          throw new Error("PDF.js library not loaded");
        this.updateStatus("Loading PDF...");
        const e = pdfjsLib.getDocument(this.config.pdfUrl);
        this.pdfDoc = await e.promise;
        const t = this.pdfDoc.numPages;
        this.elements.totalPagesEl && (this.elements.totalPagesEl.textContent = String(t)), this.isLoaded = !0, this.showViewer(), await this.renderPage(1), this.updateStatus("");
      } catch (e) {
        console.error("Failed to load PDF:", e), this.showError(e instanceof Error ? e.message : "Failed to load document");
      } finally {
        this.isLoading = !1;
      }
    }
  }
  /**
   * Render a specific page
   */
  async renderPage(e) {
    if (!this.pdfDoc || !this.elements.canvas) return;
    const t = this.pdfDoc.numPages;
    if (!(e < 1 || e > t)) {
      this.currentPage = e, this.updateStatus(`Rendering page ${e}...`);
      try {
        const n = await this.pdfDoc.getPage(e), s = n.getViewport({ scale: this.scale }), a = this.elements.canvas, o = a.getContext("2d");
        if (!o)
          throw new Error("Failed to get canvas context");
        a.height = s.height, a.width = s.width, await n.render({
          canvasContext: o,
          viewport: s
        }).promise, this.updatePaginationState(), this.updateStatus("");
      } catch (n) {
        console.error("Failed to render page:", n), this.updateStatus("Failed to render page");
      }
    }
  }
  /**
   * Navigate to a specific page
   */
  goToPage(e) {
    if (!this.pdfDoc) return;
    const t = this.pdfDoc.numPages;
    e < 1 || e > t || this.renderPage(e);
  }
  /**
   * Update pagination button states
   */
  updatePaginationState() {
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: s } = this.elements, a = this.pdfDoc?.numPages || 1;
    s && s.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= a);
  }
  /**
   * Update status text
   */
  updateStatus(e) {
    this.elements.status && (this.elements.status.textContent = e);
  }
  /**
   * Show the loading spinner
   */
  showSpinner() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && u(e), t && p(t), n && u(n), s && u(s);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: s } = this.elements;
    e && u(e), t && u(t), n && u(n), s && p(s);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: s, errorMessage: a, viewer: o } = this.elements;
    t && u(t), n && u(n), s && p(s), o && u(o), a && (a.textContent = e);
  }
}
function sn(i) {
  const e = new Z(i);
  return e.init(), e;
}
function rn(i) {
  const e = {
    documentId: i.documentId,
    pdfUrl: i.pdfUrl,
    pageCount: i.pageCount || 1
  }, t = new Z(e);
  w(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && w(() => {
  const i = document.querySelector('[data-esign-page="document-detail"]');
  if (i instanceof HTMLElement) {
    const e = i.dataset.documentId || "", t = i.dataset.pdfUrl || "", n = parseInt(i.dataset.pageCount || "1", 10);
    e && t && new Z({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class an {
  constructor(e) {
    this.env = e;
  }
  buildQuery(e, t) {
    const n = { page: e, per_page: t };
    return this.env && (n.env = this.env), n;
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}
class on {
  constructor(e) {
    this.env = e;
  }
  buildQuery(e) {
    const t = {}, n = e ? e.trim() : "";
    return n && (t.search = n), this.env && (t.env = this.env), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}
function Ye(i) {
  switch ((i || "").toLowerCase()) {
    case "select":
    case "enum":
      return "select";
    case "number":
    case "integer":
      return "number";
    case "date":
    case "datetime":
    case "time":
      return "date";
    default:
      return "text";
  }
}
function Ze(i) {
  if (!Array.isArray(i)) return;
  const e = i.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", s = t.label ?? String(n);
    return { label: String(s), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function Xe(i, e) {
  if (!Array.isArray(i) || i.length === 0) return;
  const t = i.map((a) => String(a || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), s = e ? String(e).trim().toLowerCase() : "";
  return s && n.includes(s) ? [s, ...n.filter((a) => a !== s)] : n;
}
function cn(i) {
  return i.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function ln(i) {
  return i ? i.map((e) => ({
    name: e.name,
    label: e.label,
    type: Ye(e.type),
    options: Ze(e.options),
    operators: Xe(e.operators, e.default_operator)
  })) : [];
}
function dn(i) {
  if (!i) return "-";
  try {
    const e = new Date(i);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(i);
  }
}
function un(i) {
  if (!i || Number(i) <= 0) return "-";
  const e = parseInt(String(i), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function hn(i, e, t) {
  t && t.success(`${i} completed successfully`);
}
function pn(i, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([o, c]) => `${o}: ${c}`).join("; ") : "", s = e?.textCode ? `${e.textCode}: ` : "", a = e?.message || `${i} failed`;
    t.error(n ? `${s}${a}: ${n}` : `${s}${a}`);
  }
}
function gn(i, e) {
  const t = r(`#${i}`);
  t && t.addEventListener("click", async () => {
    t.disabled = !0, t.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      t.disabled = !1, t.classList.remove("opacity-50");
    }
  });
}
function mn(i, e) {
  const t = i.refresh.bind(i);
  return async function() {
    await t();
    const n = i.getSchema();
    n?.actions && e(n.actions);
  };
}
const fn = {
  searchInput: "#table-search",
  perPageSelect: "#table-per-page",
  filterRow: "[data-filter-column]",
  columnToggleBtn: "#column-toggle-btn",
  columnToggleMenu: "#column-toggle-menu",
  exportBtn: "#export-btn",
  exportMenu: "#export-menu",
  paginationContainer: "#table-pagination",
  tableInfoStart: "#table-info-start",
  tableInfoEnd: "#table-info-end",
  tableInfoTotal: "#table-info-total",
  selectAllCheckbox: "#table-checkbox-all",
  rowCheckboxes: ".table-checkbox",
  bulkActionsBar: "#bulk-actions-overlay",
  selectedCount: "#selected-count"
}, j = "application/vnd.google-apps.document", X = "application/vnd.google-apps.spreadsheet", ee = "application/vnd.google-apps.presentation", Se = "application/vnd.google-apps.folder", te = "application/pdf", et = [j, te], Ce = "esign.google.account_id";
function tt(i) {
  return i.mimeType === j;
}
function nt(i) {
  return i.mimeType === te;
}
function k(i) {
  return i.mimeType === Se;
}
function st(i) {
  return et.includes(i.mimeType);
}
function vn(i) {
  return i.mimeType === j || i.mimeType === X || i.mimeType === ee;
}
function it(i) {
  return {
    id: i.id || "",
    name: i.name || "Untitled",
    mimeType: i.mimeType || "application/octet-stream",
    size: typeof i.size == "string" ? parseInt(i.size, 10) || 0 : i.size || 0,
    modifiedTime: i.modifiedTime || (/* @__PURE__ */ new Date()).toISOString(),
    iconLink: i.iconLink,
    thumbnailLink: i.thumbnailLink,
    webViewLink: i.webViewLink,
    parents: i.parents
  };
}
function yn(i) {
  return i.map(it);
}
function Ie(i) {
  return {
    [j]: "Google Doc",
    [X]: "Google Sheet",
    [ee]: "Google Slides",
    [Se]: "Folder",
    [te]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[i] || "File";
}
function rt(i) {
  return k(i) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : tt(i) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : nt(i) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : i.mimeType === X ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : i.mimeType === ee ? {
    icon: "iconoir-presentation",
    bgClass: "bg-orange-100",
    textClass: "text-orange-600"
  } : i.mimeType.startsWith("image/") ? {
    icon: "iconoir-media-image",
    bgClass: "bg-purple-100",
    textClass: "text-purple-600"
  } : {
    icon: "iconoir-page",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600"
  };
}
function at(i) {
  return !i || i <= 0 ? "-" : i < 1024 ? `${i} B` : i < 1024 * 1024 ? `${(i / 1024).toFixed(1)} KB` : `${(i / (1024 * 1024)).toFixed(2)} MB`;
}
function ot(i) {
  if (!i) return "-";
  try {
    return new Date(i).toLocaleDateString();
  } catch {
    return i;
  }
}
function wn(i, e) {
  const t = i.get("account_id");
  if (t)
    return O(t);
  if (e)
    return O(e);
  const n = localStorage.getItem(Ce);
  return n ? O(n) : "";
}
function O(i) {
  if (!i) return "";
  const e = i.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function bn(i) {
  const e = O(i);
  e && localStorage.setItem(Ce, e);
}
function xn(i, e) {
  if (!e) return i;
  try {
    const t = new URL(i, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = i.includes("?") ? "&" : "?";
    return `${i}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function Sn(i, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(i) || (n.pathname = `${i}${e}`), t && n.searchParams.set("account_id", t), n;
}
function Cn(i) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  i && t !== i ? (e.searchParams.set("account_id", i), window.history.replaceState({}, "", e.toString())) : !i && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function $(i) {
  const e = document.createElement("div");
  return e.textContent = i, e.innerHTML;
}
function ct(i) {
  const e = rt(i);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function In(i, e) {
  if (i.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...i
  ];
  return t.map((n, s) => {
    const a = s === t.length - 1, o = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return a ? `${o}<span class="text-gray-900 font-medium">${$(n.name)}</span>` : `${o}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${$(n.name)}</button>`;
  }).join("");
}
function lt(i, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: s = !0 } = e, a = ct(i), o = k(i), c = st(i), d = o ? "cursor-pointer hover:bg-gray-50" : c ? "cursor-pointer hover:bg-blue-50" : "opacity-60", l = o ? `data-folder-id="${i.id}" data-folder-name="${$(i.name)}"` : c && t ? `data-file-id="${i.id}" data-file-name="${$(i.name)}" data-mime-type="${i.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${d} file-item"
      ${l}
      role="listitem"
      ${c ? 'tabindex="0"' : ""}
    >
      ${a}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${$(i.name)}</p>
        <p class="text-xs text-gray-500">
          ${Ie(i.mimeType)}
          ${n && i.size > 0 ? ` &middot; ${at(i.size)}` : ""}
          ${s && i.modifiedTime ? ` &middot; ${ot(i.modifiedTime)}` : ""}
        </p>
      </div>
      ${c && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function Ln(i, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return i.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${$(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...i].sort((a, o) => k(a) && !k(o) ? -1 : !k(a) && k(o) ? 1 : a.name.localeCompare(o.name)).map((a) => lt(a, { selectable: n })).join("")}
    </div>
  `;
}
function En(i) {
  return {
    id: i.id,
    name: i.name,
    mimeType: i.mimeType,
    typeName: Ie(i.mimeType)
  };
}
export {
  ke as AGREEMENT_STATUS_BADGES,
  Y as AgreementFormController,
  Z as DocumentDetailPreviewController,
  K as DocumentFormController,
  Ee as ESignAPIClient,
  Pe as ESignAPIError,
  Ce as GOOGLE_ACCOUNT_STORAGE_KEY,
  pe as GoogleCallbackController,
  me as GoogleDrivePickerController,
  ge as GoogleIntegrationController,
  et as IMPORTABLE_MIME_TYPES,
  ye as IntegrationConflictsController,
  fe as IntegrationHealthController,
  ve as IntegrationMappingsController,
  we as IntegrationSyncRunsController,
  Q as LandingPageController,
  j as MIME_GOOGLE_DOC,
  Se as MIME_GOOGLE_FOLDER,
  X as MIME_GOOGLE_SHEET,
  ee as MIME_GOOGLE_SLIDES,
  te as MIME_PDF,
  an as PanelPaginationBehavior,
  on as PanelSearchBehavior,
  fn as STANDARD_GRID_SELECTORS,
  he as SignerCompletePageController,
  xe as SignerErrorPageController,
  be as SignerReviewController,
  C as announce,
  xn as applyAccountIdToPath,
  Re as applyDetailFormatters,
  Zt as bootstrapAgreementForm,
  rn as bootstrapDocumentDetailPreview,
  Kt as bootstrapDocumentForm,
  Ft as bootstrapGoogleCallback,
  jt as bootstrapGoogleDrivePicker,
  Ht as bootstrapGoogleIntegration,
  qt as bootstrapIntegrationConflicts,
  Ut as bootstrapIntegrationHealth,
  Gt as bootstrapIntegrationMappings,
  Jt as bootstrapIntegrationSyncRuns,
  $t as bootstrapLandingPage,
  Bt as bootstrapSignerCompletePage,
  nn as bootstrapSignerErrorPage,
  en as bootstrapSignerReview,
  Sn as buildScopedApiUrl,
  bt as byId,
  Te as capitalize,
  Me as createESignClient,
  De as createElement,
  mn as createSchemaActionCachingRefresh,
  En as createSelectedFile,
  yt as createStatusBadgeElement,
  Mt as createTimeoutController,
  dn as dateTimeCellRenderer,
  D as debounce,
  pn as defaultActionErrorHandler,
  hn as defaultActionSuccessHandler,
  St as delegate,
  $ as escapeHtml,
  un as fileSizeCellRenderer,
  ht as formatDate,
  M as formatDateTime,
  ot as formatDriveDate,
  at as formatDriveFileSize,
  H as formatFileSize,
  ut as formatPageCount,
  mt as formatRecipientCount,
  gt as formatRelativeTime,
  _e as formatSizeElements,
  pt as formatTime,
  Fe as formatTimestampElements,
  de as getAgreementStatusBadge,
  dt as getESignClient,
  rt as getFileIconConfig,
  Ie as getFileTypeName,
  Be as getPageConfig,
  u as hide,
  Yt as initAgreementForm,
  He as initDetailFormatters,
  sn as initDocumentDetailPreview,
  Qt as initDocumentForm,
  _t as initGoogleCallback,
  Ot as initGoogleDrivePicker,
  Rt as initGoogleIntegration,
  Vt as initIntegrationConflicts,
  zt as initIntegrationHealth,
  Nt as initIntegrationMappings,
  Wt as initIntegrationSyncRuns,
  kt as initLandingPage,
  Dt as initSignerCompletePage,
  tn as initSignerErrorPage,
  Xt as initSignerReview,
  k as isFolder,
  tt as isGoogleDoc,
  vn as isGoogleWorkspaceFile,
  st as isImportable,
  nt as isPDF,
  O as normalizeAccountId,
  it as normalizeDriveFile,
  yn as normalizeDriveFiles,
  Xe as normalizeFilterOperators,
  Ze as normalizeFilterOptions,
  Ye as normalizeFilterType,
  xt as on,
  w as onReady,
  Et as poll,
  ln as prepareFilterFields,
  cn as prepareGridColumns,
  r as qs,
  A as qsa,
  In as renderBreadcrumb,
  ct as renderFileIcon,
  lt as renderFileItem,
  Ln as renderFileList,
  $e as renderStatusBadge,
  wn as resolveAccountId,
  Pt as retry,
  bn as saveAccountId,
  Ae as setESignClient,
  It as setLoading,
  gn as setupRefreshButton,
  p as show,
  ue as sleep,
  ft as snakeToTitle,
  Cn as syncAccountIdToUrl,
  At as throttle,
  Ct as toggle,
  vt as truncate,
  B as updateDataText,
  Lt as updateDataTexts,
  wt as updateStatusBadge,
  Tt as withTimeout
};
//# sourceMappingURL=index.js.map

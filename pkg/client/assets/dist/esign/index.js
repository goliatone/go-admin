class z {
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
    const n = 200, o = 25;
    for (; t <= o; ) {
      const d = await this.listAgreements({ page: t, per_page: n }), l = d.items || d.records || [];
      if (e.push(...l), l.length === 0 || e.length >= d.total)
        break;
      t += 1;
    }
    const s = {};
    for (const d of e) {
      const l = String(d?.status || "").trim().toLowerCase();
      l && (s[l] = (s[l] || 0) + 1);
    }
    const a = (s.sent || 0) + (s.in_progress || 0), c = a + (s.declined || 0);
    return {
      draft: s.draft || 0,
      sent: s.sent || 0,
      in_progress: s.in_progress || 0,
      completed: s.completed || 0,
      voided: s.voided || 0,
      declined: s.declined || 0,
      expired: s.expired || 0,
      pending: a,
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
      throw new H(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class H extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let L = null;
function te() {
  if (!L)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return L;
}
function U(i) {
  L = i;
}
function G(i) {
  const e = new z(i);
  return U(e), e;
}
function N(i) {
  if (i == null || i === "" || i === 0) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ne(i) {
  if (!i) return "-";
  const e = typeof i == "string" ? parseInt(i, 10) : i;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function T(i, e) {
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
function ie(i, e) {
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
function oe(i, e) {
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
function se(i) {
  if (!i) return "-";
  try {
    const e = i instanceof Date ? i : new Date(i);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), o = Math.round(n / 1e3), s = Math.round(o / 60), a = Math.round(s / 60), c = Math.round(a / 24), d = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? d.format(c, "day") : Math.abs(a) >= 1 ? d.format(a, "hour") : Math.abs(s) >= 1 ? d.format(s, "minute") : d.format(o, "second");
  } catch {
    return String(i);
  }
}
function re(i) {
  return i == null ? "0 recipients" : i === 1 ? "1 recipient" : `${i} recipients`;
}
function j(i) {
  return i ? i.charAt(0).toUpperCase() + i.slice(1) : "";
}
function ae(i) {
  return i ? i.split("_").map((e) => j(e)).join(" ") : "";
}
function ce(i, e) {
  return !i || i.length <= e ? i : `${i.slice(0, e - 3)}...`;
}
const V = {
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
function $(i) {
  const e = String(i || "").trim().toLowerCase();
  return V[e] || {
    label: i || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function q(i, e) {
  const t = $(i), n = e?.showDot ?? !1, o = e?.size ?? "sm", s = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, a = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${s[o]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${a}${t.label}</span>`;
}
function le(i, e) {
  const t = document.createElement("span");
  return t.innerHTML = q(i, e), t.firstElementChild;
}
function de(i, e, t) {
  const n = $(e), o = t?.size ?? "sm", s = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (i.className = "", i.className = `inline-flex items-center ${s[o]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
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
function E(i, e = document) {
  try {
    return Array.from(e.querySelectorAll(i));
  } catch {
    return [];
  }
}
function ue(i) {
  return document.getElementById(i);
}
function W(i, e, t) {
  const n = document.createElement(i);
  if (e)
    for (const [o, s] of Object.entries(e))
      s !== void 0 && n.setAttribute(o, s);
  if (t)
    for (const o of t)
      typeof o == "string" ? n.appendChild(document.createTextNode(o)) : n.appendChild(o);
  return n;
}
function he(i, e, t, n) {
  return i.addEventListener(e, t, n), () => i.removeEventListener(e, t, n);
}
function pe(i, e, t, n, o) {
  const s = (a) => {
    const c = a.target.closest(e);
    c && i.contains(c) && n.call(c, a, c);
  };
  return i.addEventListener(t, s, o), () => i.removeEventListener(t, s, o);
}
function w(i) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i, { once: !0 }) : i();
}
function g(i) {
  i && (i.classList.remove("hidden", "invisible"), i.style.display = "");
}
function p(i) {
  i && i.classList.add("hidden");
}
function ge(i, e) {
  if (!i) return;
  e ?? i.classList.contains("hidden") ? g(i) : p(i);
}
function fe(i, e, t) {
  i && (e ? (i.setAttribute("aria-busy", "true"), i.classList.add("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !0)) : (i.removeAttribute("aria-busy"), i.classList.remove("opacity-50", "pointer-events-none"), (i instanceof HTMLButtonElement || i instanceof HTMLInputElement) && (i.disabled = !1)));
}
function A(i, e, t = document) {
  const n = r(`[data-esign-${i}]`, t);
  n && (n.textContent = String(e));
}
function me(i, e = document) {
  for (const [t, n] of Object.entries(i))
    A(t, n, e);
}
function Q(i = "[data-esign-page]", e = "data-esign-config") {
  const t = r(i);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const o = r(
    'script[type="application/json"]',
    t
  );
  if (o?.textContent)
    try {
      return JSON.parse(o.textContent);
    } catch {
      console.warn("Failed to parse page config from script:", o.textContent);
    }
  return null;
}
function S(i, e = "polite") {
  const t = r(`[aria-live="${e}"]`) || (() => {
    const n = W("div", {
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
async function we(i) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: o = 6e4,
    maxAttempts: s = 30,
    onProgress: a,
    signal: c
  } = i, d = Date.now();
  let l = 0, u;
  for (; l < s; ) {
    if (c?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - d >= o)
      return {
        result: u,
        attempts: l,
        stopped: !1,
        timedOut: !0
      };
    if (l++, u = await e(), a && a(u, l), t(u))
      return {
        result: u,
        attempts: l,
        stopped: !0,
        timedOut: !1
      };
    await F(n, c);
  }
  return {
    result: u,
    attempts: l,
    stopped: !1,
    timedOut: !1
  };
}
async function ye(i) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: o = 3e4,
    exponentialBackoff: s = !0,
    shouldRetry: a = () => !0,
    onRetry: c,
    signal: d
  } = i;
  let l;
  for (let u = 1; u <= t; u++) {
    if (d?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (h) {
      if (l = h, u >= t || !a(h, u))
        throw h;
      const f = s ? Math.min(n * Math.pow(2, u - 1), o) : n;
      c && c(h, u, f), await F(f, d);
    }
  }
  throw l;
}
function F(i, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const o = setTimeout(t, i);
    if (e) {
      const s = () => {
        clearTimeout(o), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", s, { once: !0 });
    }
  });
}
function J(i, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      i(...n), t = null;
    }, e);
  };
}
function be(i, e) {
  let t = 0, n = null;
  return (...o) => {
    const s = Date.now();
    s - t >= e ? (t = s, i(...o)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, i(...o);
      },
      e - (s - t)
    ));
  };
}
function ve(i) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), i);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function Se(i, e, t = "Operation timed out") {
  let n;
  const o = new Promise((s, a) => {
    n = setTimeout(() => {
      a(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([i, o]);
  } finally {
    clearTimeout(n);
  }
}
class k {
  constructor(e) {
    this.config = e, this.client = G({
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
    A('count="draft"', e.draft), A('count="pending"', e.pending), A('count="completed"', e.completed), A('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function xe(i) {
  const e = i || Q('[data-esign-page="landing"]');
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new k(e);
  return w(() => t.init()), t;
}
function Ae(i, e) {
  const t = {
    basePath: i,
    apiBasePath: e || `${i}/api`
  }, n = new k(t);
  w(() => n.init());
}
typeof document < "u" && w(() => {
  const i = document.querySelector('[data-esign-page="landing"]');
  if (i) {
    const e = i.getAttribute("data-esign-config");
    if (e)
      try {
        const t = JSON.parse(e);
        new k(t).init();
      } catch (t) {
        console.warn("Failed to parse landing page config:", t);
      }
  }
});
class B {
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
    await this.loadArtifacts();
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
        const n = (await e.json())?.assets || {}, o = this.resolveArtifacts(n);
        o ? (this.state.hasArtifacts = !0, this.displayArtifacts(o), this.showArtifactState("available")) : this.config.agreementCompleted ? (this.showArtifactState("processing"), this.state.retryCount < this.state.maxRetries && (this.state.retryCount++, setTimeout(() => this.loadArtifacts(), 5e3))) : this.showArtifactState("processing"), this.state.loaded = !0;
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
      const o = r(`#artifacts-${n}`);
      o && (n === e ? g(o) : p(o));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = r("#artifact-executed"), n = r("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), g(t));
    }
    if (e.source) {
      const t = r("#artifact-source"), n = r("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), g(t));
    }
    if (e.certificate) {
      const t = r("#artifact-certificate"), n = r("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), g(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function Ie(i) {
  const e = new B(i);
  return w(() => e.init()), e;
}
function Ce(i) {
  const e = new B(i);
  w(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function Y(i = document) {
  E("[data-size-bytes]", i).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = N(t));
  });
}
function K(i = document) {
  E("[data-timestamp]", i).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = T(t));
  });
}
function X(i = document) {
  Y(i), K(i);
}
function Z() {
  w(() => {
    X();
  });
}
typeof document < "u" && Z();
const _ = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class R {
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), o = e.get("error_description"), s = e.get("state"), a = this.parseOAuthState(s);
    a.account_id || (a.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, o, a) : t ? this.handleSuccess(t, a) : this.handleError("unknown", "No authorization code was received from Google.", a);
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
    const { loadingState: t, successState: n, errorState: o } = this.elements;
    switch (p(t), p(n), p(o), e) {
      case "loading":
        g(t);
        break;
      case "success":
        g(n);
        break;
      case "error":
        g(o);
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
    const { errorMessage: o, errorDetail: s, closeBtn: a } = this.elements;
    o && (o.textContent = _[e] || _.unknown), t && s && (s.textContent = t, g(s)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), o = new URLSearchParams(window.location.search), s = o.get("state"), c = this.parseOAuthState(s).account_id || o.get("account_id");
      c && n.searchParams.set("account_id", c), window.location.href = n.toString();
    }
  }
}
function Le(i) {
  const e = i || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new R(e);
  return w(() => t.init()), t;
}
function Te(i) {
  const e = {
    basePath: i,
    apiBasePath: `${i}/api`
  }, t = new R(e);
  w(() => t.init());
}
const I = "esign.google.account_id", ee = {
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
class M {
  constructor(e) {
    this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = "", this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      integrationSettingsLink: r("#integration-settings-link")
    };
  }
  /**
   * Initialize the integration page
   */
  async init() {
    this.setupEventListeners(), this.updateAccountScopeUI(), await this.checkStatus();
  }
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    const {
      connectBtn: e,
      disconnectBtn: t,
      refreshBtn: n,
      retryBtn: o,
      reauthBtn: s,
      oauthCancelBtn: a,
      disconnectCancelBtn: c,
      disconnectConfirmBtn: d,
      accountIdInput: l,
      oauthModal: u,
      disconnectModal: h
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), s && s.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      h && g(h);
    }), c && c.addEventListener("click", () => {
      h && p(h);
    }), d && d.addEventListener("click", () => this.disconnect()), a && a.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), o && o.addEventListener("click", () => this.checkStatus()), l && (l.addEventListener("change", () => {
      this.setCurrentAccountId(l.value, !0);
    }), l.addEventListener("keydown", (f) => {
      f.key === "Enter" && (f.preventDefault(), this.setCurrentAccountId(l.value, !0));
    })), document.addEventListener("keydown", (f) => {
      f.key === "Escape" && (u && !u.classList.contains("hidden") && this.cancelOAuthFlow(), h && !h.classList.contains("hidden") && p(h));
    }), [u, h].forEach((f) => {
      f && f.addEventListener("click", (b) => {
        const m = b.target;
        (m === f || m.getAttribute("aria-hidden") === "true") && (p(f), f === u && this.cancelOAuthFlow());
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
        window.localStorage.getItem(I)
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
    const { accountIdInput: e, connectedAccountId: t, importDriveLink: n, integrationSettingsLink: o } = this.elements;
    e && (e.value = this.currentAccountId), t && (t.textContent = this.currentAccountId ? `Account ID: ${this.currentAccountId}` : "Account ID: default"), this.persistAccountId(), this.syncAccountIdInURL(), this.updateScopedLinks([n, o]);
  }
  /**
   * Persist account ID to localStorage
   */
  persistAccountId() {
    try {
      this.currentAccountId ? window.localStorage.setItem(I, this.currentAccountId) : window.localStorage.removeItem(I);
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
    t && (t.textContent = e), S(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: o, errorState: s } = this.elements;
    switch (p(t), p(n), p(o), p(s), e) {
      case "loading":
        g(t);
        break;
      case "disconnected":
        g(n);
        break;
      case "connected":
        g(o);
        break;
      case "error":
        g(s);
        break;
    }
  }
  /**
   * Update status badge
   */
  updateStatusBadge(e, t = !1, n = !1) {
    const { statusBadge: o } = this.elements;
    if (o) {
      if (n) {
        o.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
          <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
          Degraded
        </span>
      `;
        return;
      }
      e ? t ? o.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
            Expiring Soon
          </span>
        ` : o.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <span class="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
            Connected
          </span>
        ` : o.innerHTML = `
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
        let s = `Failed to check status: ${e.status}`;
        try {
          const a = await e.json();
          a?.error?.message && (s = a.error.message);
        } catch {
        }
        throw new Error(s);
      }
      const t = await e.json(), n = this.normalizeIntegrationPayload(t.integration || {});
      !this.currentAccountId && n.account_id && (this.currentAccountId = n.account_id, this.updateAccountScopeUI());
      const o = n.degraded === !0;
      this.renderDegradedState(o, n.degraded_reason), n.connected ? (this.renderConnectedState(n), this.showState("connected"), this.updateStatusBadge(!0, n.needs_reauthorization, o), this.announce(
        o ? "Google Drive connected with degraded provider health" : "Google Drive is connected"
      )) : (this.showState("disconnected"), this.updateStatusBadge(!1, !1, o), this.announce(
        o ? "Google Drive integration is degraded" : "Google Drive is not connected"
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
    const t = (y, x) => {
      for (const v of y)
        if (Object.prototype.hasOwnProperty.call(e, v) && e[v] !== void 0 && e[v] !== null)
          return e[v];
      return x;
    }, n = t(["expires_at", "ExpiresAt"], ""), o = t(["scopes", "Scopes"], []), s = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), a = t(["connected", "Connected"], !1), c = t(["degraded", "Degraded"], !1), d = t(["degraded_reason", "DegradedReason"], ""), l = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), u = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), h = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let f = t(["is_expired", "IsExpired"], void 0), b = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof f != "boolean" || typeof b != "boolean") && n) {
      const y = new Date(n);
      if (!Number.isNaN(y.getTime())) {
        const x = y.getTime() - Date.now(), v = 5 * 60 * 1e3;
        f = x <= 0, b = x > 0 && x <= v;
      }
    }
    const m = typeof h == "boolean" ? h : (f === !0 || b === !0) && !u;
    return {
      connected: a,
      account_id: s,
      email: l,
      scopes: Array.isArray(o) ? o : [],
      expires_at: n,
      is_expired: f === !0,
      is_expiring_soon: b === !0,
      can_auto_refresh: u,
      needs_reauthorization: m,
      degraded: c,
      degraded_reason: d
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: o, expiryInfo: s, reauthWarning: a, reauthReason: c } = this.elements;
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
        const o = ee[n] || { label: n, description: "" };
        return `
        <li class="flex items-start gap-2">
          <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div>
            <span class="text-sm font-medium text-gray-700">${this.escapeHtml(o.label)}</span>
            ${o.description ? `<p class="text-xs text-gray-500">${this.escapeHtml(o.description)}</p>` : ""}
          </div>
        </li>
      `;
      }).join("");
    }
  }
  /**
   * Render token expiry information
   */
  renderExpiry(e, t, n, o, s) {
    const { expiryInfo: a, reauthWarning: c, reauthReason: d } = this.elements;
    if (!a) return;
    if (a.classList.remove("text-red-600", "text-amber-600"), a.classList.add("text-gray-500"), !e) {
      a.textContent = "Access token status unknown", c && p(c);
      return;
    }
    const l = new Date(e), u = /* @__PURE__ */ new Date(), h = Math.max(
      1,
      Math.round((l.getTime() - u.getTime()) / (1e3 * 60))
    );
    t ? o ? (a.textContent = "Access token expired, but refresh is available and will be applied automatically.", a.classList.remove("text-gray-500"), a.classList.add("text-amber-600"), c && p(c)) : (a.textContent = "Access token has expired. Please re-authorize.", a.classList.remove("text-gray-500"), a.classList.add("text-red-600"), c && g(c), d && (d.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (a.classList.remove("text-gray-500"), a.classList.add("text-amber-600"), o ? (a.textContent = `Token expires in approximately ${h} minute${h !== 1 ? "s" : ""}. Refresh is available automatically.`, c && p(c)) : (a.textContent = `Token expires in approximately ${h} minute${h !== 1 ? "s" : ""}`, c && g(c), d && (d.textContent = `Your access token will expire in ${h} minute${h !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (a.textContent = `Token valid until ${l.toLocaleDateString()} ${l.toLocaleTimeString()}`, c && p(c)), !s && c && p(c);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: o } = this.elements;
    n && (e ? (g(n), o && (o.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : p(n));
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
  async startOAuthFlow() {
    const { oauthModal: e, errorMessage: t } = this.elements;
    e && g(e);
    const n = this.resolveOAuthRedirectURI();
    this.pendingOAuthAccountId = this.currentAccountId;
    const o = this.buildGoogleOAuthUrl(n, this.pendingOAuthAccountId);
    if (!o) {
      e && p(e), t && (t.textContent = "Google OAuth is not configured: missing client ID."), this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const s = 500, a = 600, c = (window.screen.width - s) / 2, d = (window.screen.height - a) / 2;
    if (this.oauthWindow = window.open(
      o,
      "google_oauth",
      `width=${s},height=${a},left=${c},top=${d},popup=yes`
    ), !this.oauthWindow) {
      e && p(e), this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (l) => this.handleOAuthCallback(l), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), e && p(e), this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    const o = [
      "https://www.googleapis.com/auth/drive.readonly",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: n,
      redirect_uri: e,
      response_type: "code",
      scope: o,
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
    if (this.cleanupOAuthFlow(), n && p(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`);
      return;
    }
    if (t.code)
      try {
        const o = this.resolveOAuthRedirectURI(), s = this.normalizeAccountId(t.account_id), a = s || this.pendingOAuthAccountId || this.currentAccountId;
        s && s !== this.currentAccountId && (this.currentAccountId = s, this.updateAccountScopeUI());
        const c = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", a),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: a || void 0,
              redirect_uri: o
            })
          }
        );
        if (!c.ok) {
          const d = await c.json();
          throw new Error(d.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await this.checkStatus();
      } catch (o) {
        console.error("Connect error:", o);
        const s = o instanceof Error ? o.message : "Unknown error";
        this.showToast(`Failed to connect: ${s}`, "error"), this.announce(`Failed to connect: ${s}`);
      }
  }
  /**
   * Cancel OAuth flow
   */
  cancelOAuthFlow() {
    const { oauthModal: e } = this.elements;
    e && p(e), this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && p(e);
    try {
      const t = await fetch(
        this.buildScopedAPIURL("/esign/integrations/google/disconnect"),
        {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!t.ok) {
        const n = await t.json();
        throw new Error(n.error?.message || "Failed to disconnect");
      }
      this.showToast("Google Drive disconnected", "success"), this.announce("Google Drive disconnected"), await this.checkStatus();
    } catch (t) {
      console.error("Disconnect error:", t);
      const n = t instanceof Error ? t.message : "Unknown error";
      this.showToast(`Failed to disconnect: ${n}`, "error"), this.announce(`Failed to disconnect: ${n}`);
    }
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const o = window.toastManager;
    o && (t === "success" ? o.success(e) : o.error(e));
  }
}
function Ee(i) {
  const e = new M(i);
  return w(() => e.init()), e;
}
function ke(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleRedirectUri: i.googleRedirectUri,
    googleClientId: i.googleClientId,
    googleEnabled: i.googleEnabled !== !1
  }, t = new M(e);
  w(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const C = "esign.google.account_id", P = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, D = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class O {
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
      loadMoreBtn: o,
      importBtn: s,
      clearSelectionBtn: a,
      importCancelBtn: c,
      importConfirmBtn: d,
      importForm: l,
      importModal: u,
      viewListBtn: h,
      viewGridBtn: f
    } = this.elements;
    if (e) {
      const m = J(() => this.handleSearch(), 300);
      e.addEventListener("input", m), e.addEventListener("keydown", (y) => {
        y.key === "Enter" && (y.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), o && o.addEventListener("click", () => this.loadMore()), s && s.addEventListener("click", () => this.showImportModal()), a && a.addEventListener("click", () => this.clearSelection()), c && c.addEventListener("click", () => this.hideImportModal()), d && l && l.addEventListener("submit", (m) => {
      m.preventDefault(), this.handleImport();
    }), u && u.addEventListener("click", (m) => {
      const y = m.target;
      (y === u || y.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), h && h.addEventListener("click", () => this.setViewMode("list")), f && f.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (m) => {
      m.key === "Escape" && u && !u.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: b } = this.elements;
    b && b.addEventListener("click", (m) => this.handleFileListClick(m));
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
        window.localStorage.getItem(C)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, g(e)) : p(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(C, this.currentAccountId) : window.localStorage.removeItem(C);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), o = String(e.mimeType || e.MimeType || "").trim(), s = String(e.modifiedTime || e.ModifiedTime || "").trim(), a = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), c = String(e.parentId || e.ParentID || "").trim(), d = String(e.ownerEmail || e.OwnerEmail || "").trim(), l = Array.isArray(e.parents) ? e.parents : c ? [c] : [], u = Array.isArray(e.owners) ? e.owners : d ? [{ emailAddress: d }] : [];
    return {
      id: t,
      name: n,
      mimeType: o,
      modifiedTime: s,
      webViewLink: a,
      parents: l,
      owners: u,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && g(t));
    try {
      const o = this.currentFolderPath[this.currentFolderPath.length - 1];
      let s;
      this.searchQuery ? s = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : s = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(o.id)}`
      ), this.nextPageToken && (s += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const a = await fetch(s, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!a.ok)
        throw new Error(`Failed to load files: ${a.status}`);
      const c = await a.json(), d = Array.isArray(c.files) ? c.files.map((l) => this.normalizeDriveFile(l)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...d] : this.currentFiles = d, this.nextPageToken = c.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), S(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (o) {
      console.error("Error loading files:", o), this.renderError(o instanceof Error ? o.message : "Failed to load files"), S("Error loading files");
    } finally {
      this.isLoading = !1, t && p(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && p(t), this.currentFiles.length === 0) {
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
    const n = this.currentFiles.map((o) => this.renderFileItem(o)).join("");
    e.innerHTML = n;
  }
  /**
   * Render a single file item
   */
  renderFileItem(e) {
    const t = e.mimeType === "application/vnd.google-apps.folder", n = D.includes(e.mimeType), o = this.selectedFile?.id === e.id, s = P[e.mimeType] || P.default, a = this.getFileIcon(s);
    return `
      <div
        class="file-item flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer ${o ? "bg-blue-50 border-l-2 border-blue-500" : ""}"
        data-file-id="${this.escapeHtml(e.id)}"
        data-is-folder="${t}"
        role="option"
        aria-selected="${o}"
        tabindex="0"
      >
        <div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
          ${a}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${T(e.modifiedTime)}
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
    const o = n.dataset.fileId, s = n.dataset.isFolder === "true";
    o && (s ? this.navigateToFolder(o) : this.selectFile(o));
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), S(`Selected: ${t.name}`));
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
      previewTitle: o,
      previewType: s,
      previewFileId: a,
      previewOwner: c,
      previewModified: d,
      importBtn: l,
      openInGoogleBtn: u
    } = this.elements;
    if (!this.selectedFile) {
      e && g(e), t && p(t);
      return;
    }
    e && p(e), t && g(t);
    const h = this.selectedFile, f = D.includes(h.mimeType);
    o && (o.textContent = h.name), s && (s.textContent = this.getMimeTypeLabel(h.mimeType)), a && (a.textContent = h.id), c && h.owners.length > 0 && (c.textContent = h.owners[0].emailAddress || "-"), d && (d.textContent = T(h.modifiedTime)), l && (f ? (l.removeAttribute("disabled"), l.classList.remove("opacity-50", "cursor-not-allowed")) : (l.setAttribute("disabled", "true"), l.classList.add("opacity-50", "cursor-not-allowed"))), u && h.webViewLink && (u.href = h.webViewLink);
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
      p(e), t && (t.textContent = "Search Results");
      return;
    }
    g(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const o = e.querySelector("ol");
    o && (o.innerHTML = this.currentFolderPath.map(
      (s, a) => `
        <li class="flex items-center">
          ${a > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(s.id)}"
            data-folder-index="${a}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(s.name)}
          </button>
        </li>
      `
    ).join(""), E(".breadcrumb-item", o).forEach((s) => {
      s.addEventListener("click", () => {
        const a = parseInt(s.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(a);
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
    e && (this.nextPageToken ? g(e) : p(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? g(t) : p(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && p(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    const { importModal: e, importGoogleFileId: t, importDocumentTitle: n, importAgreementTitle: o } = this.elements;
    if (t && (t.value = this.selectedFile.id), n) {
      const s = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = s;
    }
    o && (o.value = ""), e && g(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && p(e);
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
      importDocumentTitle: o,
      importAgreementTitle: s
    } = this.elements, a = this.selectedFile.id, c = o?.value.trim() || this.selectedFile.name, d = s?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && g(t), n && (n.textContent = "Importing...");
    try {
      const l = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: a,
          document_title: c,
          agreement_title: d || void 0
        })
      });
      if (!l.ok) {
        const h = await l.json();
        throw new Error(h.error?.message || "Import failed");
      }
      const u = await l.json();
      this.showToast("Import started successfully", "success"), S("Import started"), this.hideImportModal(), u.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${u.document.id}` : u.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${u.agreement.id}`);
    } catch (l) {
      console.error("Import error:", l);
      const u = l instanceof Error ? l.message : "Import failed";
      this.showToast(u, "error"), S(`Error: ${u}`);
    } finally {
      e && e.removeAttribute("disabled"), t && p(t), n && (n.textContent = "Import");
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
    const o = window.toastManager;
    o && (t === "success" ? o.success(e) : o.error(e));
  }
  /**
   * Escape HTML
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
function _e(i) {
  const e = new O(i);
  return w(() => e.init()), e;
}
function Pe(i) {
  const e = {
    basePath: i.basePath,
    apiBasePath: i.apiBasePath || `${i.basePath}/api`,
    userId: i.userId,
    googleAccountId: i.googleAccountId,
    googleConnected: i.googleConnected !== !1,
    pickerRoutes: i.pickerRoutes
  }, t = new O(e);
  w(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
export {
  V as AGREEMENT_STATUS_BADGES,
  z as ESignAPIClient,
  H as ESignAPIError,
  R as GoogleCallbackController,
  O as GoogleDrivePickerController,
  M as GoogleIntegrationController,
  k as LandingPageController,
  B as SignerCompletePageController,
  S as announce,
  X as applyDetailFormatters,
  Te as bootstrapGoogleCallback,
  Pe as bootstrapGoogleDrivePicker,
  ke as bootstrapGoogleIntegration,
  Ae as bootstrapLandingPage,
  Ce as bootstrapSignerCompletePage,
  ue as byId,
  j as capitalize,
  G as createESignClient,
  W as createElement,
  le as createStatusBadgeElement,
  ve as createTimeoutController,
  J as debounce,
  pe as delegate,
  ie as formatDate,
  T as formatDateTime,
  N as formatFileSize,
  ne as formatPageCount,
  re as formatRecipientCount,
  se as formatRelativeTime,
  Y as formatSizeElements,
  oe as formatTime,
  K as formatTimestampElements,
  $ as getAgreementStatusBadge,
  te as getESignClient,
  Q as getPageConfig,
  p as hide,
  Z as initDetailFormatters,
  Le as initGoogleCallback,
  _e as initGoogleDrivePicker,
  Ee as initGoogleIntegration,
  xe as initLandingPage,
  Ie as initSignerCompletePage,
  he as on,
  w as onReady,
  we as poll,
  r as qs,
  E as qsa,
  q as renderStatusBadge,
  ye as retry,
  U as setESignClient,
  fe as setLoading,
  g as show,
  F as sleep,
  ae as snakeToTitle,
  be as throttle,
  ge as toggle,
  ce as truncate,
  A as updateDataText,
  me as updateDataTexts,
  de as updateStatusBadge,
  Se as withTimeout
};
//# sourceMappingURL=index.js.map

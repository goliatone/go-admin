import { e as ae } from "../chunks/html-DyksyvcZ.js";
class tn {
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
      `/panels/esign_agreements?${t.toString()}`
    );
  }
  async getAgreementStats() {
    const e = [];
    let t = 1;
    const n = 200, i = 25;
    for (; t <= i; ) {
      const g = await this.listAgreements({ page: t, per_page: n }), h = g.items || g.records || [];
      if (e.push(...h), h.length === 0 || e.length >= g.total)
        break;
      t += 1;
    }
    const a = {};
    for (const g of e) {
      const h = String(g?.status || "").trim().toLowerCase();
      h && (a[h] = (a[h] || 0) + 1);
    }
    const l = (a.sent || 0) + (a.in_progress || 0), r = l + (a.declined || 0);
    return {
      draft: a.draft || 0,
      sent: a.sent || 0,
      in_progress: a.in_progress || 0,
      completed: a.completed || 0,
      voided: a.voided || 0,
      declined: a.declined || 0,
      expired: a.expired || 0,
      pending: l,
      action_required: r
    };
  }
  // Document endpoints
  async listDocuments(e) {
    const t = new URLSearchParams();
    return e?.page && t.set("page", String(e.page)), e?.per_page && t.set("per_page", String(e.per_page)), e?.search && t.set("search", e.search), this.get(
      `/panels/esign_documents?${t.toString()}`
    );
  }
  // Google integration endpoints
  async getGoogleIntegrationStatus() {
    return this.get("/esign/integrations/google/status");
  }
  async startGoogleImport(e) {
    return this.post("/esign/google-drive/imports", e);
  }
  async getGoogleImportStatus(e) {
    return this.get(`/esign/google-drive/imports/${e}`);
  }
  // Draft persistence endpoints
  async listDrafts(e) {
    const t = new URLSearchParams();
    return e?.limit && t.set("limit", String(e.limit)), e?.cursor && t.set("cursor", e.cursor), this.get(`/esign/drafts?${t.toString()}`);
  }
  async getDraft(e) {
    return this.get(`/esign/drafts/${e}`);
  }
  async createDraft(e) {
    return this.post("/esign/drafts", e);
  }
  async updateDraft(e, t) {
    return this.put(`/esign/drafts/${e}`, t);
  }
  async deleteDraft(e) {
    return this.delete(`/esign/drafts/${e}`);
  }
  async sendDraft(e, t) {
    return this.post(`/esign/drafts/${e}/send`, t);
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
      throw new nn(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class nn extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let Me = null;
function Wn() {
  if (!Me)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return Me;
}
function sn(s) {
  Me = s;
}
function rn(s) {
  const e = new tn(s);
  return sn(e), e;
}
function ge(s) {
  if (s == null || s === "" || s === 0) return "-";
  const e = typeof s == "string" ? parseInt(s, 10) : s;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Jn(s) {
  if (!s) return "-";
  const e = typeof s == "string" ? parseInt(s, 10) : s;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function X(s, e) {
  if (!s) return "-";
  try {
    const t = s instanceof Date ? s : new Date(s);
    if (isNaN(t.getTime())) return "-";
    const n = {
      dateStyle: "short",
      timeStyle: "short"
    };
    return t.toLocaleString(void 0, e || n);
  } catch {
    return String(s);
  }
}
function Kn(s, e) {
  if (!s) return "-";
  try {
    const t = s instanceof Date ? s : new Date(s);
    if (isNaN(t.getTime())) return "-";
    const n = {
      dateStyle: "medium"
    };
    return t.toLocaleDateString(void 0, e || n);
  } catch {
    return String(s);
  }
}
function Yn(s, e) {
  if (!s) return "-";
  try {
    const t = s instanceof Date ? s : new Date(s);
    if (isNaN(t.getTime())) return "-";
    const n = {
      hour: "2-digit",
      minute: "2-digit"
    };
    return t.toLocaleTimeString(void 0, e || n);
  } catch {
    return String(s);
  }
}
function Qn(s) {
  if (!s) return "-";
  try {
    const e = s instanceof Date ? s : new Date(s);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), i = Math.round(n / 1e3), a = Math.round(i / 60), l = Math.round(a / 60), r = Math.round(l / 24), g = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(r) >= 1 ? g.format(r, "day") : Math.abs(l) >= 1 ? g.format(l, "hour") : Math.abs(a) >= 1 ? g.format(a, "minute") : g.format(i, "second");
  } catch {
    return String(s);
  }
}
function Xn(s) {
  return s == null ? "0 recipients" : s === 1 ? "1 recipient" : `${s} recipients`;
}
function an(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
function Zn(s) {
  return s ? s.split("_").map((e) => an(e)).join(" ") : "";
}
function ei(s, e) {
  return !s || s.length <= e ? s : `${s.slice(0, e - 3)}...`;
}
const on = {
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
function rt(s) {
  const e = String(s || "").trim().toLowerCase();
  return on[e] || {
    label: s || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function cn(s, e) {
  const t = rt(s), n = e?.showDot ?? !1, i = e?.size ?? "sm", a = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, l = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${a[i]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${l}${t.label}</span>`;
}
function ti(s, e) {
  const t = document.createElement("span");
  return t.innerHTML = cn(s, e), t.firstElementChild;
}
function ni(s, e, t) {
  const n = rt(e), i = t?.size ?? "sm", a = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (s.className = "", s.className = `inline-flex items-center ${a[i]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const g = s.querySelector(".rounded-full");
    if (g)
      g.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const h = document.createElement("span");
      h.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, h.setAttribute("aria-hidden", "true"), s.prepend(h);
    }
  }
  const r = s.childNodes[s.childNodes.length - 1];
  r && r.nodeType === Node.TEXT_NODE ? r.textContent = n.label : s.appendChild(document.createTextNode(n.label));
}
function c(s, e = document) {
  try {
    return e.querySelector(s);
  } catch {
    return null;
  }
}
function W(s, e = document) {
  try {
    return Array.from(e.querySelectorAll(s));
  } catch {
    return [];
  }
}
function ii(s) {
  return document.getElementById(s);
}
function ln(s, e, t) {
  const n = document.createElement(s);
  if (e)
    for (const [i, a] of Object.entries(e))
      a !== void 0 && n.setAttribute(i, a);
  if (t)
    for (const i of t)
      typeof i == "string" ? n.appendChild(document.createTextNode(i)) : n.appendChild(i);
  return n;
}
function si(s, e, t, n) {
  return s.addEventListener(e, t, n), () => s.removeEventListener(e, t, n);
}
function ri(s, e, t, n, i) {
  const a = (l) => {
    const r = l.target.closest(e);
    r && s.contains(r) && n.call(r, l, r);
  };
  return s.addEventListener(t, a, i), () => s.removeEventListener(t, a, i);
}
function k(s) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", s, { once: !0 }) : s();
}
function x(s) {
  s && (s.classList.remove("hidden", "invisible"), s.style.display = "");
}
function f(s) {
  s && s.classList.add("hidden");
}
function ai(s, e) {
  if (!s) return;
  e ?? s.classList.contains("hidden") ? x(s) : f(s);
}
function oi(s, e, t) {
  s && (e ? (s.setAttribute("aria-busy", "true"), s.classList.add("opacity-50", "pointer-events-none"), (s instanceof HTMLButtonElement || s instanceof HTMLInputElement) && (s.disabled = !0)) : (s.removeAttribute("aria-busy"), s.classList.remove("opacity-50", "pointer-events-none"), (s instanceof HTMLButtonElement || s instanceof HTMLInputElement) && (s.disabled = !1)));
}
function oe(s, e, t = document) {
  const n = c(`[data-esign-${s}]`, t);
  n && (n.textContent = String(e));
}
function ci(s, e = document) {
  for (const [t, n] of Object.entries(s))
    oe(t, n, e);
}
function dn(s = "[data-esign-page]", e = "data-esign-config") {
  const t = c(s);
  if (!t) return null;
  const n = t.getAttribute(e);
  if (n)
    try {
      return JSON.parse(n);
    } catch {
      console.warn("Failed to parse page config from attribute:", n);
    }
  const i = c(
    'script[type="application/json"]',
    t
  );
  if (i?.textContent)
    try {
      return JSON.parse(i.textContent);
    } catch {
      console.warn("Failed to parse page config from script:", i.textContent);
    }
  return null;
}
function H(s, e = "polite") {
  const t = c(`[aria-live="${e}"]`) || (() => {
    const n = ln("div", {
      "aria-live": e,
      "aria-atomic": "true",
      class: "sr-only"
    });
    return document.body.appendChild(n), n;
  })();
  t.textContent = "", requestAnimationFrame(() => {
    t.textContent = s;
  });
}
async function li(s) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: i = 6e4,
    maxAttempts: a = 30,
    onProgress: l,
    signal: r
  } = s, g = Date.now();
  let h = 0, v;
  for (; h < a; ) {
    if (r?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - g >= i)
      return {
        result: v,
        attempts: h,
        stopped: !1,
        timedOut: !0
      };
    if (h++, v = await e(), l && l(v, h), t(v))
      return {
        result: v,
        attempts: h,
        stopped: !0,
        timedOut: !1
      };
    await at(n, r);
  }
  return {
    result: v,
    attempts: h,
    stopped: !1,
    timedOut: !1
  };
}
async function di(s) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: i = 3e4,
    exponentialBackoff: a = !0,
    shouldRetry: l = () => !0,
    onRetry: r,
    signal: g
  } = s;
  let h;
  for (let v = 1; v <= t; v++) {
    if (g?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (w) {
      if (h = w, v >= t || !l(w, v))
        throw w;
      const E = a ? Math.min(n * Math.pow(2, v - 1), i) : n;
      r && r(w, v, E), await at(E, g);
    }
  }
  throw h;
}
function at(s, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const i = setTimeout(t, s);
    if (e) {
      const a = () => {
        clearTimeout(i), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", a, { once: !0 });
    }
  });
}
function re(s, e) {
  let t = null;
  return (...n) => {
    t && clearTimeout(t), t = setTimeout(() => {
      s(...n), t = null;
    }, e);
  };
}
function ui(s, e) {
  let t = 0, n = null;
  return (...i) => {
    const a = Date.now();
    a - t >= e ? (t = a, s(...i)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, s(...i);
      },
      e - (a - t)
    ));
  };
}
function hi(s) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), s);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function pi(s, e, t = "Operation timed out") {
  let n;
  const i = new Promise((a, l) => {
    n = setTimeout(() => {
      l(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([s, i]);
  } finally {
    clearTimeout(n);
  }
}
class _e {
  constructor(e) {
    this.config = e, this.client = rn({
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
    oe('count="draft"', e.draft), oe('count="pending"', e.pending), oe('count="completed"', e.completed), oe('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function gi(s) {
  const e = s || dn(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new _e(e);
  return k(() => t.init()), t;
}
function mi(s, e) {
  const t = {
    basePath: s,
    apiBasePath: e || `${s}/api`
  }, n = new _e(t);
  k(() => n.init());
}
typeof document < "u" && k(() => {
  const s = document.querySelector(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (s) {
    const e = document.getElementById("esign-page-config"), t = s.getAttribute("data-esign-config"), n = (() => {
      if (e?.textContent)
        try {
          return JSON.parse(e.textContent);
        } catch (i) {
          console.warn("Failed to parse landing page config script:", i);
        }
      if (t)
        try {
          return JSON.parse(t);
        } catch (i) {
          console.warn("Failed to parse landing page config attribute:", i);
        }
      return null;
    })();
    if (n) {
      const i = String(n.basePath || n.base_path || "/admin"), a = String(
        n.apiBasePath || n.api_base_path || `${i}/api`
      );
      new _e({ basePath: i, apiBasePath: a }).init();
    }
  }
});
class ot {
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
    const e = c("#retry-artifacts-btn");
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
        const n = (await e.json())?.assets || {}, i = this.resolveArtifacts(n);
        i ? (this.state.hasArtifacts = !0, this.displayArtifacts(i), this.showArtifactState("available")) : this.config.agreementCompleted ? (this.showArtifactState("processing"), this.state.retryCount < this.state.maxRetries && (this.state.retryCount++, setTimeout(() => this.loadArtifacts(), 5e3))) : this.showArtifactState("processing"), this.state.loaded = !0;
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
      const i = c(`#artifacts-${n}`);
      i && (n === e ? x(i) : f(i));
    });
  }
  /**
   * Display available artifacts in the UI
   */
  displayArtifacts(e) {
    if (e.executed) {
      const t = c("#artifact-executed"), n = c("#artifact-executed-link");
      t && n && (n.href = new URL(e.executed, window.location.origin).toString(), x(t));
    }
    if (e.source) {
      const t = c("#artifact-source"), n = c("#artifact-source-link");
      t && n && (n.href = new URL(e.source, window.location.origin).toString(), x(t));
    }
    if (e.certificate) {
      const t = c("#artifact-certificate"), n = c("#artifact-certificate-link");
      t && n && (n.href = new URL(e.certificate, window.location.origin).toString(), x(t));
    }
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
}
function fi(s) {
  const e = new ot(s);
  return k(() => e.init()), e;
}
function vi(s) {
  const e = new ot(s);
  k(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function un(s = document) {
  W("[data-size-bytes]", s).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = ge(t));
  });
}
function hn(s = document) {
  W("[data-timestamp]", s).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = X(t));
  });
}
function pn(s = document) {
  un(s), hn(s);
}
function gn() {
  k(() => {
    pn();
  });
}
typeof document < "u" && gn();
const Qe = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class ct {
  constructor(e) {
    this.config = e, this.elements = {
      loadingState: c("#loading-state"),
      successState: c("#success-state"),
      errorState: c("#error-state"),
      errorMessage: c("#error-message"),
      errorDetail: c("#error-detail"),
      closeBtn: c("#close-btn")
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), i = e.get("error_description"), a = e.get("state"), l = this.parseOAuthState(a);
    l.account_id || (l.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, i, l) : t ? this.handleSuccess(t, l) : this.handleError("unknown", "No authorization code was received from Google.", l);
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
    const { loadingState: t, successState: n, errorState: i } = this.elements;
    switch (f(t), f(n), f(i), e) {
      case "loading":
        x(t);
        break;
      case "success":
        x(n);
        break;
      case "error":
        x(i);
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
  handleError(e, t, n) {
    this.showState("error");
    const { errorMessage: i, errorDetail: a, closeBtn: l } = this.elements;
    i && (i.textContent = Qe[e] || Qe.unknown), t && a && (a.textContent = t, x(a)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), i = new URLSearchParams(window.location.search), a = i.get("state"), r = this.parseOAuthState(a).account_id || i.get("account_id");
      r && n.searchParams.set("account_id", r), window.location.href = n.toString();
    }
  }
}
function wi(s) {
  const e = s || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new ct(e);
  return k(() => t.init()), t;
}
function yi(s) {
  const e = {
    basePath: s,
    apiBasePath: `${s}/api`
  }, t = new ct(e);
  k(() => t.init());
}
const Ee = "esign.google.account_id", mn = {
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
class lt {
  constructor(e) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      loadingState: c("#loading-state"),
      disconnectedState: c("#disconnected-state"),
      connectedState: c("#connected-state"),
      errorState: c("#error-state"),
      statusBadge: c("#status-badge"),
      announcements: c("#integration-announcements"),
      accountIdInput: c("#account-id-input"),
      connectBtn: c("#connect-btn"),
      disconnectBtn: c("#disconnect-btn"),
      refreshBtn: c("#refresh-status-btn"),
      retryBtn: c("#retry-btn"),
      reauthBtn: c("#reauth-btn"),
      oauthModal: c("#oauth-modal"),
      oauthCancelBtn: c("#oauth-cancel-btn"),
      disconnectModal: c("#disconnect-modal"),
      disconnectCancelBtn: c("#disconnect-cancel-btn"),
      disconnectConfirmBtn: c("#disconnect-confirm-btn"),
      connectedEmail: c("#connected-email"),
      connectedAccountId: c("#connected-account-id"),
      scopesList: c("#scopes-list"),
      expiryInfo: c("#expiry-info"),
      reauthWarning: c("#reauth-warning"),
      reauthReason: c("#reauth-reason"),
      errorMessage: c("#error-message"),
      degradedWarning: c("#degraded-warning"),
      degradedReason: c("#degraded-reason"),
      importDriveLink: c("#import-drive-link"),
      integrationSettingsLink: c("#integration-settings-link"),
      // Option A - Dropdown
      accountDropdown: c("#account-dropdown"),
      // Option B - Cards Grid
      accountsSection: c("#accounts-section"),
      accountsLoading: c("#accounts-loading"),
      accountsEmpty: c("#accounts-empty"),
      accountsGrid: c("#accounts-grid"),
      connectFirstBtn: c("#connect-first-btn")
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
      retryBtn: i,
      reauthBtn: a,
      oauthCancelBtn: l,
      disconnectCancelBtn: r,
      disconnectConfirmBtn: g,
      accountIdInput: h,
      oauthModal: v,
      disconnectModal: w
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), a && a.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, w && x(w);
    }), r && r.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, w && f(w);
    }), g && g.addEventListener("click", () => this.disconnect()), l && l.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), i && i.addEventListener("click", () => this.checkStatus()), h && (h.addEventListener("change", () => {
      this.setCurrentAccountId(h.value, !0);
    }), h.addEventListener("keydown", (C) => {
      C.key === "Enter" && (C.preventDefault(), this.setCurrentAccountId(h.value, !0));
    }));
    const { accountDropdown: E, connectFirstBtn: S } = this.elements;
    E && E.addEventListener("change", () => {
      E.value === "__new__" ? (E.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(E.value, !0);
    }), S && S.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (C) => {
      C.key === "Escape" && (v && !v.classList.contains("hidden") && this.cancelOAuthFlow(), w && !w.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, f(w)));
    }), [v, w].forEach((C) => {
      C && C.addEventListener("click", (P) => {
        const L = P.target;
        (L === C || L.getAttribute("aria-hidden") === "true") && (f(C), C === v ? this.cancelOAuthFlow() : C === w && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(Ee)
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
   * Resolve account ID for "connect new account" flow
   */
  resolveNewAccountId() {
    const { accountIdInput: e } = this.elements, t = this.normalizeAccountId(e?.value);
    return t ? this.accounts.some(
      (i) => this.normalizeAccountId(i.account_id) === t
    ) ? "" : t : "";
  }
  /**
   * Start OAuth flow using a new/manual account ID
   */
  startOAuthFlowForNewAccount() {
    const e = this.resolveNewAccountId();
    if (!e && this.accounts.length > 0) {
      this.showToast(
        "Enter a unique account ID (for example: work) before connecting another account.",
        "error"
      ), this.announce("Enter a unique account ID before connecting another account");
      const { accountIdInput: t } = this.elements;
      t && (t.focus(), t.select());
      return;
    }
    e !== this.currentAccountId && this.setCurrentAccountId(e, !1), this.startOAuthFlow(e);
  }
  /**
   * Update UI elements related to account scope
   */
  updateAccountScopeUI() {
    const { accountIdInput: e, connectedAccountId: t, importDriveLink: n, integrationSettingsLink: i } = this.elements;
    e && document.activeElement !== e && (e.value = this.currentAccountId), t && (t.textContent = this.currentAccountId ? `Account ID: ${this.currentAccountId}` : "Account ID: default"), this.persistAccountId(), this.syncAccountIdInURL(), this.updateScopedLinks([n, i]), this.renderAccountDropdown(), this.renderAccountsGrid();
  }
  /**
   * Persist account ID to localStorage
   */
  persistAccountId() {
    try {
      this.currentAccountId ? window.localStorage.setItem(Ee, this.currentAccountId) : window.localStorage.removeItem(Ee);
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
    t && (t.textContent = e), H(e);
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: i, errorState: a } = this.elements;
    switch (f(t), f(n), f(i), f(a), e) {
      case "loading":
        x(t);
        break;
      case "disconnected":
        x(n);
        break;
      case "connected":
        x(i);
        break;
      case "error":
        x(a);
        break;
    }
  }
  /**
   * Update status badge
   */
  updateStatusBadge(e, t = !1, n = !1) {
    const { statusBadge: i } = this.elements;
    if (i) {
      if (n) {
        i.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
          <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
          Degraded
        </span>
      `;
        return;
      }
      e ? t ? i.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
            Expiring Soon
          </span>
        ` : i.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <span class="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
            Connected
          </span>
        ` : i.innerHTML = `
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
          const l = await e.json();
          l?.error?.message && (a = l.error.message);
        } catch {
        }
        throw new Error(a);
      }
      const t = await e.json(), n = this.normalizeIntegrationPayload(t.integration || {});
      !this.currentAccountId && n.account_id && (this.currentAccountId = n.account_id, this.updateAccountScopeUI());
      const i = n.degraded === !0;
      this.renderDegradedState(i, n.degraded_reason), n.connected ? (this.renderConnectedState(n), this.showState("connected"), this.updateStatusBadge(!0, n.needs_reauthorization, i), this.announce(
        i ? "Google Drive connected with degraded provider health" : "Google Drive is connected"
      )) : (this.showState("disconnected"), this.updateStatusBadge(!1, !1, i), this.announce(
        i ? "Google Drive integration is degraded" : "Google Drive is not connected"
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
    const t = (P, L) => {
      for (const M of P)
        if (Object.prototype.hasOwnProperty.call(e, M) && e[M] !== void 0 && e[M] !== null)
          return e[M];
      return L;
    }, n = t(["expires_at", "ExpiresAt"], ""), i = t(["scopes", "Scopes"], []), a = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), l = t(["connected", "Connected"], !1), r = t(["degraded", "Degraded"], !1), g = t(["degraded_reason", "DegradedReason"], ""), h = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), v = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), w = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let E = t(["is_expired", "IsExpired"], void 0), S = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof E != "boolean" || typeof S != "boolean") && n) {
      const P = new Date(n);
      if (!Number.isNaN(P.getTime())) {
        const L = P.getTime() - Date.now(), M = 5 * 60 * 1e3;
        E = L <= 0, S = L > 0 && L <= M;
      }
    }
    const C = typeof w == "boolean" ? w : (E === !0 || S === !0) && !v;
    return {
      connected: l,
      account_id: a,
      email: h,
      scopes: Array.isArray(i) ? i : [],
      expires_at: n,
      is_expired: E === !0,
      is_expiring_soon: S === !0,
      can_auto_refresh: v,
      needs_reauthorization: C,
      degraded: r,
      degraded_reason: g
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: i, expiryInfo: a, reauthWarning: l, reauthReason: r } = this.elements;
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
        const i = mn[n] || { label: n, description: "" };
        return `
        <li class="flex items-start gap-2">
          <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div>
            <span class="text-sm font-medium text-gray-700">${this.escapeHtml(i.label)}</span>
            ${i.description ? `<p class="text-xs text-gray-500">${this.escapeHtml(i.description)}</p>` : ""}
          </div>
        </li>
      `;
      }).join("");
    }
  }
  /**
   * Render token expiry information
   */
  renderExpiry(e, t, n, i, a) {
    const { expiryInfo: l, reauthWarning: r, reauthReason: g } = this.elements;
    if (!l) return;
    if (l.classList.remove("text-red-600", "text-amber-600"), l.classList.add("text-gray-500"), !e) {
      l.textContent = "Access token status unknown", r && f(r);
      return;
    }
    const h = new Date(e), v = /* @__PURE__ */ new Date(), w = Math.max(
      1,
      Math.round((h.getTime() - v.getTime()) / (1e3 * 60))
    );
    t ? i ? (l.textContent = "Access token expired, but refresh is available and will be applied automatically.", l.classList.remove("text-gray-500"), l.classList.add("text-amber-600"), r && f(r)) : (l.textContent = "Access token has expired. Please re-authorize.", l.classList.remove("text-gray-500"), l.classList.add("text-red-600"), r && x(r), g && (g.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (l.classList.remove("text-gray-500"), l.classList.add("text-amber-600"), i ? (l.textContent = `Token expires in approximately ${w} minute${w !== 1 ? "s" : ""}. Refresh is available automatically.`, r && f(r)) : (l.textContent = `Token expires in approximately ${w} minute${w !== 1 ? "s" : ""}`, r && x(r), g && (g.textContent = `Your access token will expire in ${w} minute${w !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (l.textContent = `Token valid until ${h.toLocaleDateString()} ${h.toLocaleTimeString()}`, r && f(r)), !a && r && f(r);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: i } = this.elements;
    n && (e ? (x(n), i && (i.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : f(n));
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
      this.accounts = n.accounts || [], this.updateAccountScopeUI();
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
      const l = this.normalizeAccountId(a.account_id);
      if (n.has(l))
        continue;
      n.add(l);
      const r = document.createElement("option");
      r.value = l;
      const g = a.email || l || "Default", h = a.status !== "connected" ? ` (${a.status})` : "";
      r.textContent = `${g}${h}`, l === this.currentAccountId && (r.selected = !0), e.appendChild(r);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const a = document.createElement("option");
      a.value = this.currentAccountId, a.textContent = `${this.currentAccountId} (new)`, a.selected = !0, e.appendChild(a);
    }
    const i = document.createElement("option");
    i.value = "__new__", i.textContent = "+ Connect New Account...", e.appendChild(i);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && f(e), this.accounts.length === 0) {
      t && x(t), n && f(n);
      return;
    }
    t && f(t), n && (x(n), n.innerHTML = this.accounts.map((i) => this.renderAccountCard(i)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, i = {
      connected: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      needs_reauth: "bg-amber-100 text-amber-700",
      degraded: "bg-gray-100 text-gray-700"
    }, a = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, l = t ? "ring-2 ring-blue-500" : "", r = n[e.status] || "bg-white border-gray-200", g = i[e.status] || "bg-gray-100 text-gray-700", h = a[e.status] || e.status, v = e.account_id || "default", w = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${r} ${l} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(w)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(v)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${g}">
              ${h}
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
    e.querySelectorAll(".select-account-btn").forEach((i) => {
      i.addEventListener("click", (a) => {
        const r = a.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(r, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((i) => {
      i.addEventListener("click", (a) => {
        const r = a.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(r, !1), this.startOAuthFlow(r);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((i) => {
      i.addEventListener("click", (a) => {
        const r = a.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = r, t && x(t);
      });
    });
    const n = e.querySelector("#connect-new-card");
    n && n.addEventListener("click", () => this.startOAuthFlowForNewAccount());
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
    t && x(t);
    const i = this.resolveOAuthRedirectURI(), a = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = a;
    const l = this.buildGoogleOAuthUrl(i, a);
    if (!l) {
      t && f(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const r = 500, g = 600, h = (window.screen.width - r) / 2, v = (window.screen.height - g) / 2;
    if (this.oauthWindow = window.open(
      l,
      "google_oauth",
      `width=${r},height=${g},left=${h},top=${v},popup=yes`
    ), !this.oauthWindow) {
      t && f(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (w) => this.handleOAuthCallback(w), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && f(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
    }, 12e4);
  }
  /**
   * Resolve OAuth redirect URI
   */
  resolveOAuthRedirectURI() {
    return this.config.googleRedirectUri ? this.config.googleRedirectUri : `${window.location.origin}${this.config.basePath}/esign/integrations/google/callback`;
  }
  /**
   * Validate callback origin for popup postMessage events.
   * Allows exact origin match and localhost/loopback-equivalent origins.
   */
  isAllowedOAuthCallbackOrigin(e) {
    const t = this.normalizeOrigin(e);
    if (!t) return !1;
    const n = /* @__PURE__ */ new Set(), i = this.normalizeOrigin(window.location.origin);
    i && n.add(i);
    const a = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    a && n.add(a);
    for (const l of n)
      if (t === l || this.areEquivalentLoopbackOrigins(t, l))
        return !0;
    return !1;
  }
  normalizeOrigin(e) {
    try {
      return new URL(e).origin;
    } catch {
      return "";
    }
  }
  resolveOriginFromURL(e) {
    try {
      return new URL(e).origin;
    } catch {
      return "";
    }
  }
  areEquivalentLoopbackOrigins(e, t) {
    try {
      const n = new URL(e), i = new URL(t);
      return n.protocol !== i.protocol || n.port !== i.port ? !1 : this.isLoopbackHost(n.hostname) && this.isLoopbackHost(i.hostname);
    } catch {
      return !1;
    }
  }
  isLoopbackHost(e) {
    const t = e.trim().toLowerCase();
    return t === "localhost" || t === "127.0.0.1" || t === "::1";
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
    const i = [
      "https://www.googleapis.com/auth/drive.readonly",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: n,
      redirect_uri: e,
      response_type: "code",
      scope: i,
      access_type: "offline",
      prompt: "consent",
      state: this.buildOAuthState(t)
    }).toString()}`;
  }
  /**
   * Handle OAuth callback message
   */
  async handleOAuthCallback(e) {
    if (!this.isAllowedOAuthCallbackOrigin(e.origin)) return;
    const t = e.data;
    if (t.type !== "google_oauth_callback") return;
    const { oauthModal: n } = this.elements;
    if (this.cleanupOAuthFlow(), n && f(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const i = this.resolveOAuthRedirectURI(), l = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        l !== this.currentAccountId && this.setCurrentAccountId(l, !1);
        const r = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", l),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: l || void 0,
              redirect_uri: i
            })
          }
        );
        if (!r.ok) {
          const g = await r.json();
          throw new Error(g.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (i) {
        console.error("Connect error:", i);
        const a = i instanceof Error ? i.message : "Unknown error";
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
    e && f(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && f(e);
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
        const i = await n.json();
        throw new Error(i.error?.message || "Failed to disconnect");
      }
      this.showToast("Google Drive disconnected", "success"), this.announce("Google Drive disconnected"), t === this.currentAccountId && this.setCurrentAccountId("", !1), await Promise.all([this.checkStatus(), this.loadAccounts()]);
    } catch (n) {
      console.error("Disconnect error:", n);
      const i = n instanceof Error ? n.message : "Unknown error";
      this.showToast(`Failed to disconnect: ${i}`, "error"), this.announce(`Failed to disconnect: ${i}`);
    } finally {
      this.pendingDisconnectAccountId = null;
    }
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const i = window.toastManager;
    i && (t === "success" ? i.success(e) : i.error(e));
  }
}
function bi(s) {
  const e = new lt(s);
  return k(() => e.init()), e;
}
function xi(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    userId: s.userId,
    googleAccountId: s.googleAccountId,
    googleRedirectUri: s.googleRedirectUri,
    googleClientId: s.googleClientId,
    googleEnabled: s.googleEnabled !== !1
  }, t = new lt(e);
  k(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const Le = "esign.google.account_id", Xe = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, Ze = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class dt {
  constructor(e) {
    this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.isListView = !0, this.isLoading = !1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      searchInput: c("#drive-search"),
      clearSearchBtn: c("#clear-search-btn"),
      fileList: c("#file-list"),
      loadingState: c("#loading-state"),
      breadcrumb: c("#breadcrumb"),
      listTitle: c("#list-title"),
      resultCount: c("#result-count"),
      pagination: c("#pagination"),
      loadMoreBtn: c("#load-more-btn"),
      refreshBtn: c("#refresh-btn"),
      announcements: c("#drive-announcements"),
      accountScopeHelp: c("#account-scope-help"),
      connectGoogleLink: c("#connect-google-link"),
      noSelection: c("#no-selection"),
      filePreview: c("#file-preview"),
      previewIcon: c("#preview-icon"),
      previewTitle: c("#preview-title"),
      previewType: c("#preview-type"),
      previewFileId: c("#preview-file-id"),
      previewOwner: c("#preview-owner"),
      previewLocation: c("#preview-location"),
      previewModified: c("#preview-modified"),
      importBtn: c("#import-btn"),
      openInGoogleBtn: c("#open-in-google-btn"),
      clearSelectionBtn: c("#clear-selection-btn"),
      importModal: c("#import-modal"),
      importForm: c("#import-form"),
      importGoogleFileId: c("#import-google-file-id"),
      importDocumentTitle: c("#import-document-title"),
      importAgreementTitle: c("#import-agreement-title"),
      importCancelBtn: c("#import-cancel-btn"),
      importConfirmBtn: c("#import-confirm-btn"),
      importSpinner: c("#import-spinner"),
      importBtnText: c("#import-btn-text"),
      viewListBtn: c("#view-list-btn"),
      viewGridBtn: c("#view-grid-btn")
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
      loadMoreBtn: i,
      importBtn: a,
      clearSelectionBtn: l,
      importCancelBtn: r,
      importConfirmBtn: g,
      importForm: h,
      importModal: v,
      viewListBtn: w,
      viewGridBtn: E
    } = this.elements;
    if (e) {
      const C = re(() => this.handleSearch(), 300);
      e.addEventListener("input", C), e.addEventListener("keydown", (P) => {
        P.key === "Enter" && (P.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), i && i.addEventListener("click", () => this.loadMore()), a && a.addEventListener("click", () => this.showImportModal()), l && l.addEventListener("click", () => this.clearSelection()), r && r.addEventListener("click", () => this.hideImportModal()), g && h && h.addEventListener("submit", (C) => {
      C.preventDefault(), this.handleImport();
    }), v && v.addEventListener("click", (C) => {
      const P = C.target;
      (P === v || P.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), w && w.addEventListener("click", () => this.setViewMode("list")), E && E.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (C) => {
      C.key === "Escape" && v && !v.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: S } = this.elements;
    S && S.addEventListener("click", (C) => this.handleFileListClick(C));
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
        window.localStorage.getItem(Le)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, x(e)) : f(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(Le, this.currentAccountId) : window.localStorage.removeItem(Le);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), i = String(e.mimeType || e.MimeType || "").trim(), a = String(e.modifiedTime || e.ModifiedTime || "").trim(), l = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), g = String(e.ownerEmail || e.OwnerEmail || "").trim(), h = Array.isArray(e.parents) ? e.parents : r ? [r] : [], v = Array.isArray(e.owners) ? e.owners : g ? [{ emailAddress: g }] : [];
    return {
      id: t,
      name: n,
      mimeType: i,
      modifiedTime: a,
      webViewLink: l,
      parents: h,
      owners: v,
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
    e || (this.currentFiles = [], this.nextPageToken = null, t && x(t));
    try {
      const i = this.currentFolderPath[this.currentFolderPath.length - 1];
      let a;
      this.searchQuery ? a = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : a = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(i.id)}`
      ), this.nextPageToken && (a += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const l = await fetch(a, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!l.ok)
        throw new Error(`Failed to load files: ${l.status}`);
      const r = await l.json(), g = Array.isArray(r.files) ? r.files.map((h) => this.normalizeDriveFile(h)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...g] : this.currentFiles = g, this.nextPageToken = r.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), H(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (i) {
      console.error("Error loading files:", i), this.renderError(i instanceof Error ? i.message : "Failed to load files"), H("Error loading files");
    } finally {
      this.isLoading = !1, t && f(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && f(t), this.currentFiles.length === 0) {
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
    const n = this.currentFiles.map((i) => this.renderFileItem(i)).join("");
    e.innerHTML = n;
  }
  /**
   * Render a single file item
   */
  renderFileItem(e) {
    const t = e.mimeType === "application/vnd.google-apps.folder", n = Ze.includes(e.mimeType), i = this.selectedFile?.id === e.id, a = Xe[e.mimeType] || Xe.default, l = this.getFileIcon(a);
    return `
      <div
        class="file-item flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer ${i ? "bg-blue-50 border-l-2 border-blue-500" : ""}"
        data-file-id="${this.escapeHtml(e.id)}"
        data-is-folder="${t}"
        role="option"
        aria-selected="${i}"
        tabindex="0"
      >
        <div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
          ${l}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${X(e.modifiedTime)}
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
    const i = n.dataset.fileId, a = n.dataset.isFolder === "true";
    i && (a ? this.navigateToFolder(i) : this.selectFile(i));
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
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), H(`Selected: ${t.name}`));
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
      previewTitle: i,
      previewType: a,
      previewFileId: l,
      previewOwner: r,
      previewModified: g,
      importBtn: h,
      openInGoogleBtn: v
    } = this.elements;
    if (!this.selectedFile) {
      e && x(e), t && f(t);
      return;
    }
    e && f(e), t && x(t);
    const w = this.selectedFile, E = Ze.includes(w.mimeType);
    i && (i.textContent = w.name), a && (a.textContent = this.getMimeTypeLabel(w.mimeType)), l && (l.textContent = w.id), r && w.owners.length > 0 && (r.textContent = w.owners[0].emailAddress || "-"), g && (g.textContent = X(w.modifiedTime)), h && (E ? (h.removeAttribute("disabled"), h.classList.remove("opacity-50", "cursor-not-allowed")) : (h.setAttribute("disabled", "true"), h.classList.add("opacity-50", "cursor-not-allowed"))), v && w.webViewLink && (v.href = w.webViewLink);
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
      f(e), t && (t.textContent = "Search Results");
      return;
    }
    x(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const i = e.querySelector("ol");
    i && (i.innerHTML = this.currentFolderPath.map(
      (a, l) => `
        <li class="flex items-center">
          ${l > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(a.id)}"
            data-folder-index="${l}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(a.name)}
          </button>
        </li>
      `
    ).join(""), W(".breadcrumb-item", i).forEach((a) => {
      a.addEventListener("click", () => {
        const l = parseInt(a.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(l);
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
    e && (this.nextPageToken ? x(e) : f(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? x(t) : f(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && f(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
    const { importModal: e, importGoogleFileId: t, importDocumentTitle: n, importAgreementTitle: i } = this.elements;
    if (t && (t.value = this.selectedFile.id), n) {
      const a = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = a;
    }
    i && (i.value = ""), e && x(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && f(e);
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
      importDocumentTitle: i,
      importAgreementTitle: a
    } = this.elements, l = this.selectedFile.id, r = i?.value.trim() || this.selectedFile.name, g = a?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && x(t), n && (n.textContent = "Importing...");
    try {
      const h = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: l,
          document_title: r,
          agreement_title: g || void 0
        })
      });
      if (!h.ok) {
        const w = await h.json();
        throw new Error(w.error?.message || "Import failed");
      }
      const v = await h.json();
      this.showToast("Import started successfully", "success"), H("Import started"), this.hideImportModal(), v.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${v.document.id}` : v.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${v.agreement.id}`);
    } catch (h) {
      console.error("Import error:", h);
      const v = h instanceof Error ? h.message : "Import failed";
      this.showToast(v, "error"), H(`Error: ${v}`);
    } finally {
      e && e.removeAttribute("disabled"), t && f(t), n && (n.textContent = "Import");
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
    const i = window.toastManager;
    i && (t === "success" ? i.success(e) : i.error(e));
  }
  /**
   * Escape HTML
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
function Si(s) {
  const e = new dt(s);
  return k(() => e.init()), e;
}
function Ci(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    userId: s.userId,
    googleAccountId: s.googleAccountId,
    googleConnected: s.googleConnected !== !1,
    pickerRoutes: s.pickerRoutes
  }, t = new dt(e);
  k(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class ut {
  constructor(e) {
    this.healthData = null, this.autoRefreshTimer = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.elements = {
      timeRange: c("#time-range"),
      providerFilter: c("#provider-filter"),
      refreshBtn: c("#refresh-btn"),
      healthScore: c("#health-score"),
      healthIndicator: c("#health-indicator"),
      healthTrend: c("#health-trend"),
      syncSuccessRate: c("#sync-success-rate"),
      syncSuccessCount: c("#sync-success-count"),
      syncFailedCount: c("#sync-failed-count"),
      syncSuccessBar: c("#sync-success-bar"),
      conflictCount: c("#conflict-count"),
      conflictPending: c("#conflict-pending"),
      conflictResolved: c("#conflict-resolved"),
      conflictTrend: c("#conflict-trend"),
      syncLag: c("#sync-lag"),
      lagStatus: c("#lag-status"),
      lastSync: c("#last-sync"),
      retryTotal: c("#retry-total"),
      retryRecovery: c("#retry-recovery"),
      retryAvg: c("#retry-avg"),
      retryList: c("#retry-list"),
      providerHealthTable: c("#provider-health-table"),
      alertsList: c("#alerts-list"),
      noAlerts: c("#no-alerts"),
      alertCount: c("#alert-count"),
      activityFeed: c("#activity-feed"),
      syncChartCanvas: c("#sync-chart-canvas"),
      conflictChartCanvas: c("#conflict-chart-canvas")
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
    const { timeRange: e, providerFilter: t } = this.elements, n = e?.value || "24h", i = t?.value || "";
    try {
      const a = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      a.searchParams.set("range", n), i && a.searchParams.set("provider", i);
      const l = await fetch(a.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!l.ok)
        this.healthData = this.generateMockHealthData(n, i);
      else {
        const r = await l.json();
        this.healthData = r;
      }
      this.renderHealthData(), H("Health data refreshed");
    } catch (a) {
      console.error("Failed to load health data:", a), this.healthData = this.generateMockHealthData(n, i), this.renderHealthData();
    }
  }
  /**
   * Generate mock health data for demonstration
   */
  generateMockHealthData(e, t) {
    const i = Math.min(e === "1h" ? 1 : e === "6h" ? 6 : e === "24h" ? 24 : e === "7d" ? 168 : 720, 24);
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
      providerHealth: (t ? [t] : ["salesforce", "hubspot", "bamboohr", "workday"]).map((l) => ({
        provider: l,
        status: l === "workday" ? "degraded" : "healthy",
        successRate: l === "workday" ? 89.2 : 97 + Math.random() * 3,
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
        sync: this.generateTimeSeriesData(i, "sync"),
        conflicts: this.generateTimeSeriesData(i, "conflicts")
      }
    };
  }
  /**
   * Generate activity feed data
   */
  generateActivityFeed(e) {
    const t = [], n = ["sync_completed", "sync_failed", "conflict_created", "conflict_resolved", "mapping_published"], i = ["salesforce", "hubspot", "bamboohr", "workday"];
    for (let a = 0; a < e; a++) {
      const l = n[Math.floor(Math.random() * n.length)], r = i[Math.floor(Math.random() * i.length)];
      t.push({
        type: l,
        provider: r,
        message: this.getActivityMessage(l, r),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: l.includes("failed") || l.includes("created") ? "warning" : "success"
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
    const n = [], i = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, a = /* @__PURE__ */ new Date();
    for (let l = e - 1; l >= 0; l--) {
      const r = new Date(a.getTime() - l * 36e5);
      n.push(
        r.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      ), t === "sync" ? (i.success.push(Math.floor(Math.random() * 15) + 10), i.failed.push(Math.floor(Math.random() * 3))) : (i.pending.push(Math.floor(Math.random() * 5)), i.resolved.push(Math.floor(Math.random() * 8) + 2));
    }
    return { labels: n, datasets: i };
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
    const { healthScore: e, healthIndicator: t, healthTrend: n } = this.elements, i = this.healthData;
    if (e && (e.textContent = `${i.healthScore}%`, i.healthScore >= 95 ? e.className = "text-3xl font-bold text-green-600" : i.healthScore >= 80 ? e.className = "text-3xl font-bold text-yellow-600" : e.className = "text-3xl font-bold text-red-600"), t && (i.healthScore >= 95 ? (t.className = "w-12 h-12 rounded-full bg-green-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>') : i.healthScore >= 80 ? (t.className = "w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>') : (t.className = "w-12 h-12 rounded-full bg-red-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>')), n) {
      const a = i.healthTrend >= 0 ? "+" : "";
      n.textContent = `${a}${i.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: i } = this.elements, a = this.healthData.syncStats;
    e && (e.textContent = `${a.successRate.toFixed(1)}%`), t && (t.textContent = `${a.succeeded} succeeded`), n && (n.textContent = `${a.failed} failed`), i && (i.style.width = `${a.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: i } = this.elements, a = this.healthData.conflictStats;
    if (e && (e.textContent = String(a.pending)), t && (t.textContent = `${a.pending} pending`), n && (n.textContent = `${a.resolvedToday} resolved today`), i) {
      const l = a.trend >= 0 ? "+" : "";
      i.textContent = `${l}${a.trend} from previous period`;
    }
  }
  /**
   * Render lag statistics
   */
  renderLagStats() {
    if (!this.healthData) return;
    const { syncLag: e, lagStatus: t, lastSync: n } = this.elements, i = this.healthData.lagStats;
    e && (e.textContent = `${i.averageMinutes}m`), t && (i.status === "normal" ? (t.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", t.textContent = "Normal") : i.status === "elevated" ? (t.className = "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full", t.textContent = "Elevated") : (t.className = "px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full", t.textContent = "Critical")), n && (n.textContent = `Last sync: ${i.lastSyncMinutesAgo} minutes ago`);
  }
  /**
   * Render retry activity
   */
  renderRetryActivity() {
    if (!this.healthData) return;
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: i } = this.elements, a = this.healthData.retryStats;
    e && (e.textContent = String(a.total)), t && (t.textContent = `${a.recoveryRate}%`), n && (n.textContent = a.avgAttempts.toFixed(1)), i && (i.innerHTML = a.recent.map(
      (l) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(l.provider)} / ${this.escapeHtml(l.entity)}</span>
            <span class="${l.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${this.escapeHtml(l.time)}</span>
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
      (i) => `
            <div class="flex items-start gap-3 p-3 rounded-lg ${i.severity === "warning" ? "bg-yellow-50 border border-yellow-200" : i.severity === "error" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}">
              <div class="flex-shrink-0">
                ${this.getAlertIcon(i.severity)}
              </div>
              <div class="flex-1">
                <div class="flex justify-between">
                  <span class="font-medium capitalize">${this.escapeHtml(i.provider)}</span>
                  <span class="text-xs text-gray-500">${this.escapeHtml(i.time)}</span>
                </div>
                <p class="text-sm text-gray-700 mt-1">${this.escapeHtml(i.message)}</p>
              </div>
              <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 dismiss-alert-btn" aria-label="Dismiss alert">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `
    ).join(""), e.querySelectorAll(".dismiss-alert-btn").forEach((i) => {
      i.addEventListener("click", (a) => this.dismissAlert(a));
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
    const { alertsList: i, noAlerts: a, alertCount: l } = this.elements, r = i?.querySelectorAll(":scope > div").length || 0;
    l && (l.textContent = `${r} active`, r === 0 && (l.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", i && i.classList.add("hidden"), a && a.classList.remove("hidden")));
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
  renderBarChart(e, t, n, i) {
    const a = document.getElementById(e);
    if (!a) return;
    const l = a.getContext("2d");
    if (!l) return;
    const r = a.width, g = a.height, h = 40, v = r - h * 2, w = g - h * 2;
    l.clearRect(0, 0, r, g);
    const E = t.labels, S = Object.values(t.datasets), C = v / E.length / (S.length + 1), P = Math.max(...S.flat()) || 1;
    E.forEach((L, M) => {
      const $ = h + M * v / E.length + C / 2;
      S.forEach((_, j) => {
        const N = _[M] / P * w, Z = $ + j * C, V = g - h - N;
        l.fillStyle = n[j] || "#6b7280", l.fillRect(Z, V, C - 2, N);
      }), M % Math.ceil(E.length / 6) === 0 && (l.fillStyle = "#6b7280", l.font = "10px sans-serif", l.textAlign = "center", l.fillText(L, $ + S.length * C / 2, g - h + 15));
    }), l.fillStyle = "#6b7280", l.font = "10px sans-serif", l.textAlign = "right";
    for (let L = 0; L <= 4; L++) {
      const M = g - h - L * w / 4, $ = Math.round(P * L / 4);
      l.fillText($.toString(), h - 5, M + 3);
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
function Ii(s) {
  const e = new ut(s);
  return k(() => e.init()), e;
}
function Ei(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    autoRefreshInterval: s.autoRefreshInterval || 3e4
  }, t = new ut(e);
  k(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class ht {
  constructor(e) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: c("#mappings-announcements"),
      loadingState: c("#loading-state"),
      emptyState: c("#empty-state"),
      errorState: c("#error-state"),
      mappingsList: c("#mappings-list"),
      mappingsTbody: c("#mappings-tbody"),
      searchInput: c("#search-mappings"),
      filterStatus: c("#filter-status"),
      filterProvider: c("#filter-provider"),
      refreshBtn: c("#refresh-btn"),
      retryBtn: c("#retry-btn"),
      errorMessage: c("#error-message"),
      createMappingBtn: c("#create-mapping-btn"),
      createMappingEmptyBtn: c("#create-mapping-empty-btn"),
      mappingModal: c("#mapping-modal"),
      mappingModalTitle: c("#mapping-modal-title"),
      closeModalBtn: c("#close-modal-btn"),
      cancelModalBtn: c("#cancel-modal-btn"),
      mappingForm: c("#mapping-form"),
      mappingIdInput: c("#mapping-id"),
      mappingVersionInput: c("#mapping-version"),
      mappingNameInput: c("#mapping-name"),
      mappingProviderInput: c("#mapping-provider"),
      schemaObjectTypeInput: c("#schema-object-type"),
      schemaVersionInput: c("#schema-version"),
      schemaFieldsContainer: c("#schema-fields-container"),
      addFieldBtn: c("#add-field-btn"),
      mappingRulesContainer: c("#mapping-rules-container"),
      addRuleBtn: c("#add-rule-btn"),
      validateBtn: c("#validate-btn"),
      saveBtn: c("#save-btn"),
      formValidationStatus: c("#form-validation-status"),
      mappingStatusBadge: c("#mapping-status-badge"),
      publishModal: c("#publish-modal"),
      publishMappingName: c("#publish-mapping-name"),
      publishMappingVersion: c("#publish-mapping-version"),
      publishCancelBtn: c("#publish-cancel-btn"),
      publishConfirmBtn: c("#publish-confirm-btn"),
      deleteModal: c("#delete-modal"),
      deleteCancelBtn: c("#delete-cancel-btn"),
      deleteConfirmBtn: c("#delete-confirm-btn"),
      previewModal: c("#preview-modal"),
      closePreviewBtn: c("#close-preview-btn"),
      previewMappingName: c("#preview-mapping-name"),
      previewMappingProvider: c("#preview-mapping-provider"),
      previewObjectType: c("#preview-object-type"),
      previewMappingStatus: c("#preview-mapping-status"),
      previewSourceInput: c("#preview-source-input"),
      sourceSyntaxError: c("#source-syntax-error"),
      loadSampleBtn: c("#load-sample-btn"),
      runPreviewBtn: c("#run-preview-btn"),
      clearPreviewBtn: c("#clear-preview-btn"),
      previewEmpty: c("#preview-empty"),
      previewLoading: c("#preview-loading"),
      previewError: c("#preview-error"),
      previewErrorMessage: c("#preview-error-message"),
      previewSuccess: c("#preview-success"),
      previewParticipants: c("#preview-participants"),
      participantsCount: c("#participants-count"),
      previewFields: c("#preview-fields"),
      fieldsCount: c("#fields-count"),
      previewMetadata: c("#preview-metadata"),
      previewRawJson: c("#preview-raw-json"),
      previewRulesTbody: c("#preview-rules-tbody")
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
      cancelModalBtn: i,
      refreshBtn: a,
      retryBtn: l,
      addFieldBtn: r,
      addRuleBtn: g,
      validateBtn: h,
      mappingForm: v,
      publishCancelBtn: w,
      publishConfirmBtn: E,
      deleteCancelBtn: S,
      deleteConfirmBtn: C,
      closePreviewBtn: P,
      loadSampleBtn: L,
      runPreviewBtn: M,
      clearPreviewBtn: $,
      previewSourceInput: _,
      searchInput: j,
      filterStatus: N,
      filterProvider: Z,
      mappingModal: V,
      publishModal: J,
      deleteModal: ee,
      previewModal: te
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), i?.addEventListener("click", () => this.closeModal()), a?.addEventListener("click", () => this.loadMappings()), l?.addEventListener("click", () => this.loadMappings()), r?.addEventListener("click", () => this.addSchemaField()), g?.addEventListener("click", () => this.addMappingRule()), h?.addEventListener("click", () => this.validateMapping()), v?.addEventListener("submit", (O) => {
      O.preventDefault(), this.saveMapping();
    }), w?.addEventListener("click", () => this.closePublishModal()), E?.addEventListener("click", () => this.publishMapping()), S?.addEventListener("click", () => this.closeDeleteModal()), C?.addEventListener("click", () => this.deleteMapping()), P?.addEventListener("click", () => this.closePreviewModal()), L?.addEventListener("click", () => this.loadSamplePayload()), M?.addEventListener("click", () => this.runPreviewTransform()), $?.addEventListener("click", () => this.clearPreview()), _?.addEventListener("input", re(() => this.validateSourceJson(), 300)), j?.addEventListener("input", re(() => this.renderMappings(), 300)), N?.addEventListener("change", () => this.renderMappings()), Z?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (O) => {
      O.key === "Escape" && (V && !V.classList.contains("hidden") && this.closeModal(), J && !J.classList.contains("hidden") && this.closePublishModal(), ee && !ee.classList.contains("hidden") && this.closeDeleteModal(), te && !te.classList.contains("hidden") && this.closePreviewModal());
    }), [V, J, ee, te].forEach((O) => {
      O?.addEventListener("click", (ce) => {
        const le = ce.target;
        (le === O || le.getAttribute("aria-hidden") === "true") && (O === V ? this.closeModal() : O === J ? this.closePublishModal() : O === ee ? this.closeDeleteModal() : O === te && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), H(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: i, mappingsList: a } = this.elements;
    switch (f(t), f(n), f(i), f(a), e) {
      case "loading":
        x(t);
        break;
      case "empty":
        x(n);
        break;
      case "error":
        x(i);
        break;
      case "list":
        x(a);
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
    const { mappingsTbody: e, searchInput: t, filterStatus: n, filterProvider: i } = this.elements;
    if (!e) return;
    const a = (t?.value || "").toLowerCase(), l = n?.value || "", r = i?.value || "", g = this.mappings.filter((h) => !(a && !h.name.toLowerCase().includes(a) && !h.provider.toLowerCase().includes(a) || l && h.status !== l || r && h.provider !== r));
    if (g.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = g.map(
      (h) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(h.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(h.compiled_hash ? h.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(h.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(h.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${h.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(h.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(h.id)}" aria-label="Preview ${this.escapeHtml(h.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(h.id)}" aria-label="Edit ${this.escapeHtml(h.name)}">
              Edit
            </button>
            ${h.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(h.id)}" aria-label="Publish ${this.escapeHtml(h.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(h.id)}" aria-label="Delete ${this.escapeHtml(h.name)}">
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
      mappingProviderInput: i,
      schemaObjectTypeInput: a,
      schemaVersionInput: l,
      schemaFieldsContainer: r,
      mappingRulesContainer: g
    } = this.elements, h = [];
    r?.querySelectorAll(".schema-field-row").forEach((w) => {
      h.push({
        object: (w.querySelector(".field-object")?.value || "").trim(),
        field: (w.querySelector(".field-name")?.value || "").trim(),
        type: w.querySelector(".field-type")?.value || "string",
        required: w.querySelector(".field-required")?.checked || !1
      });
    });
    const v = [];
    return g?.querySelectorAll(".mapping-rule-row").forEach((w) => {
      v.push({
        source_object: (w.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (w.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: w.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (w.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: i?.value.trim() || "",
      external_schema: {
        object_type: a?.value.trim() || "",
        version: l?.value.trim() || void 0,
        fields: h
      },
      rules: v
    };
  }
  /**
   * Populate form with mapping data
   */
  populateForm(e) {
    const {
      mappingIdInput: t,
      mappingVersionInput: n,
      mappingNameInput: i,
      mappingProviderInput: a,
      schemaObjectTypeInput: l,
      schemaVersionInput: r,
      schemaFieldsContainer: g,
      mappingRulesContainer: h,
      mappingStatusBadge: v,
      formValidationStatus: w
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), i && (i.value = e.name || ""), a && (a.value = e.provider || "");
    const E = e.external_schema || { object_type: "", fields: [] };
    l && (l.value = E.object_type || ""), r && (r.value = E.version || ""), g && (g.innerHTML = "", (E.fields || []).forEach((S) => g.appendChild(this.createSchemaFieldRow(S)))), h && (h.innerHTML = "", (e.rules || []).forEach((S) => h.appendChild(this.createMappingRuleRow(S)))), e.status && v ? (v.innerHTML = this.getStatusBadge(e.status), v.classList.remove("hidden")) : v && v.classList.add("hidden"), f(w);
  }
  /**
   * Reset the form to initial state
   */
  resetForm() {
    const {
      mappingForm: e,
      mappingIdInput: t,
      mappingVersionInput: n,
      schemaFieldsContainer: i,
      mappingRulesContainer: a,
      mappingStatusBadge: l,
      formValidationStatus: r
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), i && (i.innerHTML = ""), a && (a.innerHTML = ""), l && l.classList.add("hidden"), f(r), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: n } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), x(e), n?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((l) => l.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: i, mappingNameInput: a } = this.elements;
    this.editingMappingId = e, i && (i.textContent = "Edit Mapping Specification"), this.populateForm(t), x(n), a?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    f(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((l) => l.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: i, publishMappingVersion: a } = this.elements;
    this.pendingPublishId = e, i && (i.textContent = t.name), a && (a.textContent = `v${t.version || 1}`), x(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    f(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, x(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    f(this.elements.deleteModal), this.pendingDeleteId = null;
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
      const i = await fetch(this.mappingsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...n, validate_only: !0 })
      }), a = await i.json();
      if (i.ok && a.status === "ok")
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
        const l = a.errors || [a.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${l.map((r) => `<li>${this.escapeHtml(r)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      x(t);
    } catch (i) {
      console.error("Validation error:", i), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(i instanceof Error ? i.message : "Unknown error")}</div>`, x(t));
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
      const n = !!t.id, i = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, l = await fetch(i, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!l.ok) {
        const r = await l.json();
        throw new Error(r.error?.message || `HTTP ${l.status}`);
      }
      this.showToast(n ? "Mapping updated" : "Mapping created", "success"), this.announce(n ? "Mapping updated" : "Mapping created"), this.closeModal(), await this.loadMappings();
    } catch (n) {
      console.error("Save error:", n);
      const i = n instanceof Error ? n.message : "Unknown error";
      this.showToast(`Failed to save: ${i}`, "error"), this.announce(`Failed to save: ${i}`);
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
          const i = await n.json();
          throw new Error(i.error?.message || `HTTP ${n.status}`);
        }
        this.showToast("Mapping published", "success"), this.announce("Mapping published"), this.closePublishModal(), await this.loadMappings();
      } catch (n) {
        console.error("Publish error:", n);
        const i = n instanceof Error ? n.message : "Unknown error";
        this.showToast(`Failed to publish: ${i}`, "error");
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
    const t = this.mappings.find((v) => v.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: i,
      previewMappingProvider: a,
      previewObjectType: l,
      previewMappingStatus: r,
      previewSourceInput: g,
      sourceSyntaxError: h
    } = this.elements;
    this.currentPreviewMapping = t, i && (i.textContent = t.name), a && (a.textContent = t.provider), l && (l.textContent = t.external_schema?.object_type || "-"), r && (r.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), g && (g.value = ""), f(h), x(n), g?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    f(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: i, previewSuccess: a } = this.elements;
    switch (f(t), f(n), f(i), f(a), e) {
      case "empty":
        x(t);
        break;
      case "loading":
        x(n);
        break;
      case "error":
        x(i);
        break;
      case "success":
        x(a);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, i = n.object_type || "data", a = n.fields || [], l = {}, r = {};
    a.forEach((g) => {
      const h = g.field || "field";
      switch (g.type) {
        case "string":
          r[h] = h === "email" ? "john.doe@example.com" : h === "name" ? "John Doe" : `sample_${h}`;
          break;
        case "number":
          r[h] = 123;
          break;
        case "boolean":
          r[h] = !0;
          break;
        case "date":
          r[h] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          r[h] = `sample_${h}`;
      }
    }), l[i] = r, e && (e.value = JSON.stringify(l, null, 2)), f(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return f(t), null;
    try {
      const i = JSON.parse(n);
      return f(t), i;
    } catch (i) {
      return t && (t.textContent = `JSON Syntax Error: ${i instanceof Error ? i.message : "Invalid JSON"}`, x(t)), null;
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
          const i = this.simulateTransform(n, this.currentPreviewMapping);
          this.renderPreviewResult(i), this.showPreviewState("success");
        } catch (i) {
          console.error("Transform error:", i), t && (t.textContent = i instanceof Error ? i.message : "Transform failed"), this.showPreviewState("error");
        }
      }
    }
  }
  /**
   * Simulate transform (client-side preview)
   */
  simulateTransform(e, t) {
    const n = t.rules || [], i = {
      participants: [],
      field_definitions: [],
      field_instances: [],
      agreement: {},
      matched_rules: []
    }, a = {}, l = {}, r = [];
    return n.forEach((g) => {
      const h = this.resolveSourceValue(e, g.source_object, g.source_field), v = h !== void 0;
      if (i.matched_rules.push({
        source: g.source_field,
        matched: v,
        value: h
      }), !!v)
        switch (g.target_entity) {
          case "participant":
            a[g.target_path] = h;
            break;
          case "agreement":
            l[g.target_path] = h;
            break;
          case "field_definition":
            r.push({ path: g.target_path, value: h });
            break;
        }
    }), Object.keys(a).length > 0 && i.participants.push({
      ...a,
      role: a.role || "signer",
      signing_stage: a.signing_stage || 1
    }), i.agreement = l, i.field_definitions = r, i;
  }
  /**
   * Resolve source value from payload
   */
  resolveSourceValue(e, t, n) {
    if (!(!e || !n)) {
      if (t && e[t])
        return e[t][n];
      for (const i of Object.keys(e))
        if (typeof e[i] == "object" && e[i] !== null) {
          const a = e[i];
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
      previewFields: i,
      fieldsCount: a,
      previewMetadata: l,
      previewRawJson: r,
      previewRulesTbody: g
    } = this.elements, h = e.participants || [];
    n && (n.textContent = `(${h.length})`), t && (h.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = h.map(
      (S) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(S.name || S.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(S.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(S.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(S.role))}</span>
              <span class="text-xs text-gray-500">Stage ${S.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const v = e.field_definitions || [];
    a && (a.textContent = `(${v.length})`), i && (v.length === 0 ? i.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : i.innerHTML = v.map(
      (S) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(S.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(S.value))}</span>
          </div>
        `
    ).join(""));
    const w = e.agreement || {}, E = Object.entries(w);
    l && (E.length === 0 ? l.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : l.innerHTML = E.map(
      ([S, C]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(S)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(C))}</span>
          </div>
        `
    ).join("")), r && (r.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((S) => {
      const C = g?.querySelector(`[data-rule-source="${this.escapeHtml(S.source)}"] span`);
      C && (S.matched ? (C.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", C.textContent = "Matched") : (C.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", C.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), f(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const i = window.toastManager;
    i && (t === "success" ? i.success(e) : i.error(e));
  }
}
function Li(s) {
  const e = new ht(s);
  return k(() => e.init()), e;
}
function Pi(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new ht(e);
  k(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class pt {
  constructor(e) {
    this.conflicts = [], this.currentConflictId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`, this.elements = {
      announcements: c("#conflicts-announcements"),
      loadingState: c("#loading-state"),
      emptyState: c("#empty-state"),
      errorState: c("#error-state"),
      conflictsList: c("#conflicts-list"),
      errorMessage: c("#error-message"),
      refreshBtn: c("#refresh-btn"),
      retryBtn: c("#retry-btn"),
      filterStatus: c("#filter-status"),
      filterProvider: c("#filter-provider"),
      filterEntity: c("#filter-entity"),
      statPending: c("#stat-pending"),
      statResolved: c("#stat-resolved"),
      statIgnored: c("#stat-ignored"),
      conflictDetailModal: c("#conflict-detail-modal"),
      closeDetailBtn: c("#close-detail-btn"),
      detailReason: c("#detail-reason"),
      detailEntityType: c("#detail-entity-type"),
      detailStatusBadge: c("#detail-status-badge"),
      detailProvider: c("#detail-provider"),
      detailExternalId: c("#detail-external-id"),
      detailInternalId: c("#detail-internal-id"),
      detailBindingId: c("#detail-binding-id"),
      detailPayload: c("#detail-payload"),
      resolutionSection: c("#resolution-section"),
      detailResolvedAt: c("#detail-resolved-at"),
      detailResolvedBy: c("#detail-resolved-by"),
      detailResolution: c("#detail-resolution"),
      detailConflictId: c("#detail-conflict-id"),
      detailRunId: c("#detail-run-id"),
      detailCreatedAt: c("#detail-created-at"),
      detailVersion: c("#detail-version"),
      actionButtons: c("#action-buttons"),
      actionResolveBtn: c("#action-resolve-btn"),
      actionIgnoreBtn: c("#action-ignore-btn"),
      resolveModal: c("#resolve-modal"),
      resolveForm: c("#resolve-form"),
      cancelResolveBtn: c("#cancel-resolve-btn"),
      submitResolveBtn: c("#submit-resolve-btn"),
      resolutionAction: c("#resolution-action")
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
      filterStatus: i,
      filterProvider: a,
      filterEntity: l,
      actionResolveBtn: r,
      actionIgnoreBtn: g,
      cancelResolveBtn: h,
      resolveForm: v,
      conflictDetailModal: w,
      resolveModal: E
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), i?.addEventListener("change", () => this.loadConflicts()), a?.addEventListener("change", () => this.renderConflicts()), l?.addEventListener("change", () => this.renderConflicts()), r?.addEventListener("click", () => this.openResolveModal("resolved")), g?.addEventListener("click", () => this.openResolveModal("ignored")), h?.addEventListener("click", () => this.closeResolveModal()), v?.addEventListener("submit", (S) => this.submitResolution(S)), document.addEventListener("keydown", (S) => {
      S.key === "Escape" && (E && !E.classList.contains("hidden") ? this.closeResolveModal() : w && !w.classList.contains("hidden") && this.closeConflictDetail());
    }), [w, E].forEach((S) => {
      S?.addEventListener("click", (C) => {
        const P = C.target;
        (P === S || P.getAttribute("aria-hidden") === "true") && (S === w ? this.closeConflictDetail() : S === E && this.closeResolveModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), H(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: i, conflictsList: a } = this.elements;
    switch (f(t), f(n), f(i), f(a), e) {
      case "loading":
        x(t);
        break;
      case "empty":
        x(n);
        break;
      case "error":
        x(i);
        break;
      case "list":
        x(a);
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
      const i = await n.json();
      this.conflicts = i.conflicts || [], this.populateProviderFilter(), this.updateStats(), this.renderConflicts(), this.announce(`Loaded ${this.conflicts.length} conflicts`);
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
    const t = e.value, n = [...new Set(this.conflicts.map((i) => i.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + n.map(
      (i) => `<option value="${this.escapeHtml(i)}" ${i === t ? "selected" : ""}>${this.escapeHtml(i)}</option>`
    ).join("");
  }
  /**
   * Update stats display
   */
  updateStats() {
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, i = this.conflicts.filter((r) => r.status === "pending").length, a = this.conflicts.filter((r) => r.status === "resolved").length, l = this.conflicts.filter((r) => r.status === "ignored").length;
    e && (e.textContent = String(i)), t && (t.textContent = String(a)), n && (n.textContent = String(l));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: i } = this.elements;
    if (!e) return;
    const a = t?.value || "", l = n?.value || "", r = i?.value || "", g = this.conflicts.filter((h) => !(a && h.status !== a || l && h.provider !== l || r && h.entity_kind !== r));
    if (g.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = g.map(
      (h) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(h.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${h.status === "pending" ? "bg-amber-100" : h.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${h.status === "pending" ? "text-amber-600" : h.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(h.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(h.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(h.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((h.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(h.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(h.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((h) => {
      h.addEventListener("click", () => this.openConflictDetail(h.dataset.id || ""));
    });
  }
  /**
   * Open conflict detail modal
   */
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find((N) => N.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: i,
      detailEntityType: a,
      detailStatusBadge: l,
      detailProvider: r,
      detailExternalId: g,
      detailInternalId: h,
      detailBindingId: v,
      detailConflictId: w,
      detailRunId: E,
      detailCreatedAt: S,
      detailVersion: C,
      detailPayload: P,
      resolutionSection: L,
      actionButtons: M,
      detailResolvedAt: $,
      detailResolvedBy: _,
      detailResolution: j
    } = this.elements;
    if (i && (i.textContent = t.reason || "Data conflict"), a && (a.textContent = t.entity_kind || "-"), l && (l.innerHTML = this.getStatusBadge(t.status)), r && (r.textContent = t.provider || "-"), g && (g.textContent = t.external_id || "-"), h && (h.textContent = t.internal_id || "-"), v && (v.textContent = t.binding_id || "-"), w && (w.textContent = t.id), E && (E.textContent = t.run_id || "-"), S && (S.textContent = this.formatDate(t.created_at)), C && (C.textContent = String(t.version || 1)), P)
      try {
        const N = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        P.textContent = JSON.stringify(N, null, 2);
      } catch {
        P.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (x(L), f(M), $ && ($.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), _ && (_.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), j)
        try {
          const N = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          j.textContent = JSON.stringify(N, null, 2);
        } catch {
          j.textContent = t.resolution_json || "{}";
        }
    } else
      f(L), x(M);
    x(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    f(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: i } = this.elements;
    n?.reset(), i && (i.value = e), x(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    f(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const i = new FormData(t);
    let a = {};
    const l = i.get("resolution");
    if (l)
      try {
        a = JSON.parse(l);
      } catch {
        a = { raw: l };
      }
    const r = i.get("notes");
    r && (a.notes = r);
    const g = {
      status: i.get("status"),
      resolution: a
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const h = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(g)
      });
      if (!h.ok) {
        const v = await h.json();
        throw new Error(v.error?.message || `HTTP ${h.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (h) {
      console.error("Resolution error:", h);
      const v = h instanceof Error ? h.message : "Unknown error";
      this.showToast(`Failed: ${v}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit Resolution';
    }
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const i = window.toastManager;
    i && (t === "success" ? i.success(e) : i.error(e));
  }
}
function Ai(s) {
  const e = new pt(s);
  return k(() => e.init()), e;
}
function ki(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new pt(e);
  k(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class gt {
  constructor(e) {
    this.syncRuns = [], this.mappings = [], this.currentRunId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: c("#sync-announcements"),
      loadingState: c("#loading-state"),
      emptyState: c("#empty-state"),
      errorState: c("#error-state"),
      runsTimeline: c("#runs-timeline"),
      errorMessage: c("#error-message"),
      refreshBtn: c("#refresh-btn"),
      retryBtn: c("#retry-btn"),
      filterProvider: c("#filter-provider"),
      filterStatus: c("#filter-status"),
      filterDirection: c("#filter-direction"),
      statTotal: c("#stat-total"),
      statRunning: c("#stat-running"),
      statCompleted: c("#stat-completed"),
      statFailed: c("#stat-failed"),
      startSyncBtn: c("#start-sync-btn"),
      startSyncEmptyBtn: c("#start-sync-empty-btn"),
      startSyncModal: c("#start-sync-modal"),
      startSyncForm: c("#start-sync-form"),
      cancelSyncBtn: c("#cancel-sync-btn"),
      submitSyncBtn: c("#submit-sync-btn"),
      syncMappingSelect: c("#sync-mapping"),
      runDetailModal: c("#run-detail-modal"),
      closeDetailBtn: c("#close-detail-btn"),
      detailRunId: c("#detail-run-id"),
      detailProvider: c("#detail-provider"),
      detailDirection: c("#detail-direction"),
      detailStatus: c("#detail-status"),
      detailStarted: c("#detail-started"),
      detailCompleted: c("#detail-completed"),
      detailCursor: c("#detail-cursor"),
      detailAttempt: c("#detail-attempt"),
      detailErrorSection: c("#detail-error-section"),
      detailLastError: c("#detail-last-error"),
      detailCheckpoints: c("#detail-checkpoints"),
      actionResumeBtn: c("#action-resume-btn"),
      actionRetryBtn: c("#action-retry-btn"),
      actionCompleteBtn: c("#action-complete-btn"),
      actionFailBtn: c("#action-fail-btn"),
      actionDiagnosticsBtn: c("#action-diagnostics-btn")
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
      startSyncForm: i,
      refreshBtn: a,
      retryBtn: l,
      closeDetailBtn: r,
      filterProvider: g,
      filterStatus: h,
      filterDirection: v,
      actionResumeBtn: w,
      actionRetryBtn: E,
      actionCompleteBtn: S,
      actionFailBtn: C,
      actionDiagnosticsBtn: P,
      startSyncModal: L,
      runDetailModal: M
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), i?.addEventListener("submit", ($) => this.startSync($)), a?.addEventListener("click", () => this.loadSyncRuns()), l?.addEventListener("click", () => this.loadSyncRuns()), r?.addEventListener("click", () => this.closeRunDetail()), g?.addEventListener("change", () => this.renderTimeline()), h?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("change", () => this.renderTimeline()), w?.addEventListener("click", () => this.runAction("resume")), E?.addEventListener("click", () => this.runAction("resume")), S?.addEventListener("click", () => this.runAction("complete")), C?.addEventListener("click", () => this.runAction("fail")), P?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", ($) => {
      $.key === "Escape" && (L && !L.classList.contains("hidden") && this.closeStartSyncModal(), M && !M.classList.contains("hidden") && this.closeRunDetail());
    }), [L, M].forEach(($) => {
      $?.addEventListener("click", (_) => {
        const j = _.target;
        (j === $ || j.getAttribute("aria-hidden") === "true") && ($ === L ? this.closeStartSyncModal() : $ === M && this.closeRunDetail());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), H(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: i, runsTimeline: a } = this.elements;
    switch (f(t), f(n), f(i), f(a), e) {
      case "loading":
        x(t);
        break;
      case "empty":
        x(n);
        break;
      case "error":
        x(i);
        break;
      case "list":
        x(a);
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
      const i = await n.json();
      this.syncRuns = i.runs || [], this.populateProviderFilter(), this.updateStats(), this.renderTimeline(), this.announce(`Loaded ${this.syncRuns.length} sync runs`);
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
    const t = e.value, n = [...new Set(this.syncRuns.map((i) => i.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + n.map(
      (i) => `<option value="${this.escapeHtml(i)}" ${i === t ? "selected" : ""}>${this.escapeHtml(i)}</option>`
    ).join("");
  }
  /**
   * Update stats display
   */
  updateStats() {
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: i } = this.elements, a = this.syncRuns.length, l = this.syncRuns.filter(
      (h) => h.status === "running" || h.status === "pending"
    ).length, r = this.syncRuns.filter((h) => h.status === "completed").length, g = this.syncRuns.filter((h) => h.status === "failed").length;
    e && (e.textContent = String(a)), t && (t.textContent = String(l)), n && (n.textContent = String(r)), i && (i.textContent = String(g));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const i = t?.value || "", a = n?.value || "", l = this.syncRuns.filter((r) => !(i && r.status !== i || a && r.direction !== a));
    if (l.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = l.map(
      (r) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${this.escapeHtml(r.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${r.status === "running" ? "bg-blue-100" : r.status === "completed" ? "bg-green-100" : r.status === "failed" ? "bg-red-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${r.status === "running" ? "text-blue-600 animate-spin" : r.status === "completed" ? "text-green-600" : r.status === "failed" ? "text-red-600" : "text-gray-400"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">${this.escapeHtml(r.provider)}</span>
                  ${this.getDirectionBadge(r.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${this.escapeHtml(r.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(r.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(r.started_at)}</p>
            </div>
          </div>

          ${r.cursor ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${this.escapeHtml(r.cursor)}</span></p>
            </div>
          ` : ""}

          ${r.last_error ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${this.escapeHtml(r.last_error)}</p>
            </div>
          ` : ""}
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".sync-run-card").forEach((r) => {
      r.addEventListener("click", () => this.openRunDetail(r.dataset.id || ""));
    });
  }
  /**
   * Open start sync modal
   */
  openStartSyncModal() {
    const { startSyncModal: e, startSyncForm: t } = this.elements;
    t?.reset(), x(e), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    f(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const i = new FormData(t), a = {
      provider: i.get("provider"),
      direction: i.get("direction"),
      mapping_spec_id: i.get("mapping_spec_id"),
      cursor: i.get("cursor") || void 0
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...';
    try {
      const l = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(a)
      });
      if (!l.ok) {
        const r = await l.json();
        throw new Error(r.error?.message || `HTTP ${l.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (l) {
      console.error("Start sync error:", l);
      const r = l instanceof Error ? l.message : "Unknown error";
      this.showToast(`Failed to start: ${r}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync';
    }
  }
  /**
   * Open run detail modal
   */
  async openRunDetail(e) {
    this.currentRunId = e;
    const t = this.syncRuns.find((_) => _.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: i,
      detailProvider: a,
      detailDirection: l,
      detailStatus: r,
      detailStarted: g,
      detailCompleted: h,
      detailCursor: v,
      detailAttempt: w,
      detailErrorSection: E,
      detailLastError: S,
      detailCheckpoints: C,
      actionResumeBtn: P,
      actionRetryBtn: L,
      actionCompleteBtn: M,
      actionFailBtn: $
    } = this.elements;
    i && (i.textContent = t.id), a && (a.textContent = t.provider), l && (l.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), r && (r.innerHTML = this.getStatusBadge(t.status)), g && (g.textContent = this.formatDate(t.started_at)), h && (h.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), v && (v.textContent = t.cursor || "-"), w && (w.textContent = String(t.attempt_count || 1)), t.last_error ? (S && (S.textContent = t.last_error), x(E)) : f(E), P && P.classList.toggle("hidden", t.status !== "running"), L && L.classList.toggle("hidden", t.status !== "failed"), M && M.classList.toggle("hidden", t.status !== "running"), $ && $.classList.toggle("hidden", t.status !== "running"), C && (C.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), x(n);
    try {
      const _ = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (_.ok) {
        const j = await _.json();
        this.renderCheckpoints(j.checkpoints || []);
      } else
        C && (C.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (_) {
      console.error("Error loading checkpoints:", _), C && (C.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
        (n, i) => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
          ${i + 1}
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
    f(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: i, actionFailBtn: a } = this.elements, l = e === "resume" ? t : e === "complete" ? i : a, r = e === "resume" ? n : null;
    if (!l) return;
    l.setAttribute("disabled", "true"), r?.setAttribute("disabled", "true");
    const g = l.innerHTML;
    l.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const h = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, v = await fetch(h, {
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
      if (!v.ok) {
        const w = await v.json();
        throw new Error(w.error?.message || `HTTP ${v.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (h) {
      console.error(`${e} error:`, h);
      const v = h instanceof Error ? h.message : "Unknown error";
      this.showToast(`Failed: ${v}`, "error");
    } finally {
      l.removeAttribute("disabled"), r?.removeAttribute("disabled"), l.innerHTML = g;
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
    const i = window.toastManager;
    i && (t === "success" ? i.success(e) : t === "error" ? i.error(e) : t === "info" && i.info && i.info(e));
  }
}
function Ti(s) {
  const e = new gt(s);
  return k(() => e.init()), e;
}
function Mi(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new gt(e);
  k(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const Pe = "esign.google.account_id", fn = 25 * 1024 * 1024, vn = 2e3, et = 60, De = "application/vnd.google-apps.document", $e = "application/pdf", tt = "application/vnd.google-apps.folder", wn = [De, $e];
class Fe {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || fn, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      // Upload panel
      form: c("#document-upload-form"),
      fileInput: c("#pdf_file"),
      uploadZone: c("#pdf-upload-zone"),
      placeholder: c("#upload-placeholder"),
      preview: c("#upload-preview"),
      fileName: c("#selected-file-name"),
      fileSize: c("#selected-file-size"),
      clearBtn: c("#clear-file-btn"),
      errorEl: c("#upload-error"),
      submitBtn: c("#submit-btn"),
      titleInput: c("#title"),
      sourceObjectKeyInput: c("#source_object_key"),
      // Source tabs
      sourceTabs: W(".source-tab"),
      sourcePanels: W(".source-panel"),
      announcements: c("#doc-announcements"),
      // Google Drive panel
      searchInput: c("#drive-search"),
      clearSearchBtn: c("#clear-search-btn"),
      fileList: c("#file-list"),
      loadingState: c("#loading-state"),
      breadcrumb: c("#breadcrumb"),
      listTitle: c("#list-title"),
      resultCount: c("#result-count"),
      pagination: c("#pagination"),
      loadMoreBtn: c("#load-more-btn"),
      refreshBtn: c("#refresh-btn"),
      driveAccountDropdown: c("#drive-account-dropdown"),
      accountScopeHelp: c("#account-scope-help"),
      connectGoogleLink: c("#connect-google-link"),
      // Selection panel
      noSelection: c("#no-selection"),
      filePreview: c("#file-preview"),
      previewIcon: c("#preview-icon"),
      previewTitle: c("#preview-title"),
      previewType: c("#preview-type"),
      importTypeInfo: c("#import-type-info"),
      importTypeLabel: c("#import-type-label"),
      importTypeDesc: c("#import-type-desc"),
      snapshotWarning: c("#snapshot-warning"),
      importDocumentTitle: c("#import-document-title"),
      importBtn: c("#import-btn"),
      importBtnText: c("#import-btn-text"),
      clearSelectionBtn: c("#clear-selection-btn"),
      // Import status
      importStatus: c("#import-status"),
      importStatusQueued: c("#import-status-queued"),
      importStatusSuccess: c("#import-status-success"),
      importStatusFailed: c("#import-status-failed"),
      importStatusMessage: c("#import-status-message"),
      importErrorMessage: c("#import-error-message"),
      importRetryBtn: c("#import-retry-btn"),
      importReconnectLink: c("#import-reconnect-link")
    };
  }
  /**
   * Initialize the document form page
   */
  async init() {
    this.setupEventListeners(), this.updateAccountScopeUI(), this.config.googleEnabled && this.config.googleConnected && await this.loadConnectedAccounts(), this.initializeSourceFromURL();
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
      clearBtn: i,
      titleInput: a
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), i && i.addEventListener("click", (l) => {
      l.preventDefault(), l.stopPropagation(), this.clearFileSelection();
    }), a && a.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((l) => {
      n.addEventListener(l, (r) => {
        r.preventDefault(), r.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((l) => {
      n.addEventListener(l, (r) => {
        r.preventDefault(), r.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (l) => {
      const r = l.dataTransfer;
      r?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = r.files, this.handleFileSelect());
    }), n.addEventListener("keydown", (l) => {
      (l.key === "Enter" || l.key === " ") && (l.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (l) => this.handleFormSubmit(l));
  }
  /**
   * Setup Google Drive listeners
   */
  setupGoogleDriveListeners() {
    const {
      searchInput: e,
      clearSearchBtn: t,
      loadMoreBtn: n,
      refreshBtn: i,
      clearSelectionBtn: a,
      importBtn: l,
      importRetryBtn: r,
      driveAccountDropdown: g
    } = this.elements;
    if (e) {
      const h = re(() => this.handleSearch(), 300);
      e.addEventListener("input", h);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), i && i.addEventListener("click", () => this.refreshFiles()), g && g.addEventListener("change", () => {
      this.setCurrentAccountId(g.value, this.currentSource === "google");
    }), a && a.addEventListener("click", () => this.clearFileSelection()), l && l.addEventListener("click", () => this.startImport()), r && r.addEventListener("click", () => {
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
        window.localStorage.getItem(Pe)
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
   * Set current account ID and optionally refresh Drive files
   */
  setCurrentAccountId(e, t = !1) {
    const n = this.normalizeAccountId(e);
    if (n === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }
    if (this.currentAccountId = n, this.updateAccountScopeUI(), t && this.config.googleEnabled && this.config.googleConnected) {
      this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.searchQuery = "";
      const { searchInput: i, clearSearchBtn: a } = this.elements;
      i && (i.value = ""), a && f(a), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
    }
  }
  /**
   * Load connected accounts for account selector
   */
  async loadConnectedAccounts() {
    const { driveAccountDropdown: e } = this.elements;
    if (e)
      try {
        const t = new URL(`${this.apiBase}/esign/integrations/google/accounts`, window.location.origin);
        t.searchParams.set("user_id", this.config.userId || "");
        const n = await fetch(t.toString(), {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!n.ok) {
          this.connectedAccounts = [], this.renderConnectedAccountsDropdown();
          return;
        }
        const i = await n.json();
        this.connectedAccounts = Array.isArray(i.accounts) ? i.accounts : [], this.renderConnectedAccountsDropdown();
      } catch {
        this.connectedAccounts = [], this.renderConnectedAccountsDropdown();
      }
  }
  /**
   * Render account selector options
   */
  renderConnectedAccountsDropdown() {
    const { driveAccountDropdown: e } = this.elements;
    if (!e)
      return;
    e.innerHTML = "";
    const t = document.createElement("option");
    t.value = "", t.textContent = "Default account", this.currentAccountId || (t.selected = !0), e.appendChild(t);
    const n = /* @__PURE__ */ new Set([""]);
    for (const i of this.connectedAccounts) {
      const a = this.normalizeAccountId(i?.account_id);
      if (n.has(a))
        continue;
      n.add(a);
      const l = document.createElement("option");
      l.value = a;
      const r = String(i?.email || "").trim(), g = String(i?.status || "").trim(), h = r || a || "Default account";
      l.textContent = g && g !== "connected" ? `${h} (${g})` : h, a === this.currentAccountId && (l.selected = !0), e.appendChild(l);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const i = document.createElement("option");
      i.value = this.currentAccountId, i.textContent = `${this.currentAccountId} (custom)`, i.selected = !0, e.appendChild(i);
    }
  }
  /**
   * Sync account ID to URL and localStorage
   */
  syncScopedAccountState() {
    const e = new URL(window.location.href);
    this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString());
    try {
      this.currentAccountId ? window.localStorage.setItem(Pe, this.currentAccountId) : window.localStorage.removeItem(Pe);
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
    const { accountScopeHelp: e, connectGoogleLink: t, driveAccountDropdown: n } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, x(e)) : f(e)), t) {
      const i = t.dataset.baseHref || t.getAttribute("href");
      i && t.setAttribute("href", this.applyAccountIdToPath(i));
    }
    n && (Array.from(n.options).some(
      (a) => this.normalizeAccountId(a.value) === this.currentAccountId
    ) || this.renderConnectedAccountsDropdown(), n.value !== this.currentAccountId && (n.value = this.currentAccountId));
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
      const i = n.dataset.source === e;
      n.setAttribute("aria-selected", String(i)), i ? (n.classList.add("border-blue-500", "text-blue-600"), n.classList.remove(
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
      n.id.replace("panel-", "") === e ? x(n) : f(n);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), H(
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
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: n } = this.elements, i = e?.files?.[0];
    if (i && this.validateFile(i)) {
      if (this.showPreview(i), n && (n.value = ""), t && !t.value.trim()) {
        const a = i.name.replace(/\.pdf$/i, "");
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
      `File is too large (${ge(e.size)}). Maximum size is ${ge(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: i, fileSize: a, uploadZone: l } = this.elements;
    i && (i.textContent = e.name), a && (a.textContent = ge(e.size)), t && f(t), n && x(n), l && (l.classList.remove("border-gray-300"), l.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && x(e), t && f(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    t && (t.textContent = e, x(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", f(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, i = e?.files && e.files.length > 0, a = t?.value.trim().length ?? !1, l = i && a;
    n && (n.disabled = !l, n.setAttribute("aria-disabled", String(!l)));
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), i = t.get("org_id"), a = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && a.searchParams.set("tenant_id", n), i && a.searchParams.set("org_id", i);
    const l = new FormData();
    l.append("file", e);
    const r = await fetch(a.toString(), {
      method: "POST",
      body: l,
      credentials: "same-origin"
    }), g = await r.json().catch(() => ({}));
    if (!r.ok) {
      const v = g?.error?.message || g?.message || "Upload failed. Please try again.";
      throw new Error(v);
    }
    const h = g?.object_key ? String(g.object_key).trim() : "";
    if (!h)
      throw new Error("Upload failed: missing source object key.");
    return h;
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: i } = this.elements, a = t?.files?.[0];
    if (!(!a || !this.validateFile(a))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const l = await this.uploadSourcePDF(a);
        i && (i.value = l), n?.submit();
      } catch (l) {
        const r = l instanceof Error ? l.message : "Upload failed. Please try again.";
        this.showError(r), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), i = String(e.mimeType || e.MimeType || "").trim(), a = String(e.modifiedTime || e.ModifiedTime || "").trim(), l = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), r = String(e.parentId || e.ParentID || "").trim(), g = String(e.ownerEmail || e.OwnerEmail || "").trim(), h = Array.isArray(e.parents) ? e.parents : r ? [r] : [], v = Array.isArray(e.owners) ? e.owners : g ? [{ emailAddress: g }] : [];
    return {
      id: t,
      name: n,
      mimeType: i,
      modifiedTime: a,
      webViewLink: l,
      parents: h,
      owners: v
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === De;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === $e;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === tt;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return wn.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === De ? "Google Document" : t === $e ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === tt ? "Folder" : "File";
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
    const i = t[n];
    return { html: {
      doc: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
      pdf: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>',
      folder: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      default: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>'
    }[n], ...i };
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
    const { folderId: t, query: n, pageToken: i, append: a } = e, { fileList: l } = this.elements;
    !a && l && (l.innerHTML = `
        <div class="p-8 text-center">
          <svg class="animate-spin h-8 w-8 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-500">Loading files...</p>
        </div>
      `);
    try {
      let r;
      n ? (r = this.buildScopedAPIURL("/esign/google-drive/search"), r.searchParams.set("q", n), r.searchParams.set("page_size", "20"), i && r.searchParams.set("page_token", i)) : (r = this.buildScopedAPIURL("/esign/google-drive/browse"), r.searchParams.set("page_size", "20"), t && t !== "root" && r.searchParams.set("folder_id", t), i && r.searchParams.set("page_token", i));
      const g = await fetch(r.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), h = await g.json();
      if (!g.ok)
        throw new Error(h.error?.message || "Failed to load files");
      const v = Array.isArray(h.files) ? h.files.map((C) => this.normalizeDriveFile(C)) : [];
      this.nextPageToken = h.next_page_token || null, a ? this.currentFiles = [...this.currentFiles, ...v] : this.currentFiles = v, this.renderFiles(a);
      const { resultCount: w, listTitle: E } = this.elements;
      n && w ? (w.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, E && (E.textContent = "Search Results")) : (w && (w.textContent = ""), E && (E.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: S } = this.elements;
      S && (this.nextPageToken ? x(S) : f(S)), H(`Loaded ${v.length} files`);
    } catch (r) {
      console.error("Error loading files:", r), l && (l.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${this.escapeHtml(r instanceof Error ? r.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), H(`Error: ${r instanceof Error ? r.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((i, a) => {
      const l = this.getFileIcon(i), r = this.isImportable(i), g = this.isFolder(i), h = this.selectedFile && this.selectedFile.id === i.id, v = !r && !g;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${h ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${v ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${h}"
          data-file-index="${a}"
          ${v ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${l.bg} flex items-center justify-center flex-shrink-0 ${l.text}">
            ${l.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(i.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(i.mimeType)}
              ${i.modifiedTime ? " • " + X(i.modifiedTime) : ""}
              ${v ? " • Not importable" : ""}
            </p>
          </div>
          ${g ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((i) => {
      i.addEventListener("click", () => {
        const a = parseInt(i.dataset.fileIndex || "0", 10), l = this.currentFiles[a];
        this.isFolder(l) ? this.navigateToFolder(l) : this.isImportable(l) && this.selectFile(l);
      });
    });
  }
  /**
   * Navigate to folder
   */
  navigateToFolder(e) {
    this.currentFolderPath.push({ id: e.id, name: e.name }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: n } = this.elements;
    t && (t.value = ""), n && f(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      f(e);
      return;
    }
    x(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, i) => {
      const a = i === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${i > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${i}" class="breadcrumb-item ${a ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const i = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, i + 1), this.updateBreadcrumb();
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
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: i } = this.elements;
    i && i.querySelectorAll(".file-item").forEach((L) => {
      const M = parseInt(L.dataset.fileIndex || "0", 10);
      this.currentFiles[M].id === e.id ? (L.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), L.setAttribute("aria-selected", "true")) : (L.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), L.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: a,
      filePreview: l,
      importStatus: r,
      previewIcon: g,
      previewTitle: h,
      previewType: v,
      importTypeInfo: w,
      importTypeLabel: E,
      importTypeDesc: S,
      snapshotWarning: C,
      importDocumentTitle: P
    } = this.elements;
    a && f(a), l && x(l), r && f(r), g && (g.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, g.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), h && (h.textContent = e.name || "Untitled"), v && (v.textContent = this.getFileTypeName(e.mimeType)), n && w && (w.className = `p-3 rounded-lg border ${n.bgClass}`, E && (E.textContent = n.label, E.className = `text-xs font-medium ${n.textClass}`), S && (S.textContent = n.desc, S.className = `text-xs mt-1 ${n.textClass}`), C && (n.showSnapshot ? x(C) : f(C))), P && (P.value = e.name || ""), H(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: i } = this.elements;
    e && x(e), t && f(t), n && f(n), i && i.querySelectorAll(".file-item").forEach((a) => {
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
      t && x(t), this.searchQuery = n, this.loadFiles({ query: n });
    else {
      t && f(t), this.searchQuery = "";
      const i = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: i.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && f(t), this.searchQuery = "";
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
      importStatus: i,
      importStatusQueued: a,
      importStatusSuccess: l,
      importStatusFailed: r
    } = this.elements;
    switch (t && f(t), n && f(n), i && x(i), a && f(a), l && f(l), r && f(r), e) {
      case "queued":
      case "running":
        a && x(a);
        break;
      case "succeeded":
        l && x(l);
        break;
      case "failed":
        r && x(r);
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
    const { importErrorMessage: n, importReconnectLink: i } = this.elements;
    if (n && (n.textContent = e), i)
      if (t === "GOOGLE_ACCESS_REVOKED" || t === "GOOGLE_SCOPE_VIOLATION") {
        const a = this.config.routes.integrations || "/admin/esign/integrations/google";
        i.href = this.applyAccountIdToPath(a), x(i);
      } else
        f(i);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: i } = this.elements;
    if (!this.selectedFile || !e) return;
    const a = e.value.trim();
    if (!a) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), i && f(i), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const l = new URL(window.location.href);
      l.searchParams.delete("import_run_id"), window.history.replaceState({}, "", l.toString());
      const r = await fetch(
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
      ), g = await r.json();
      if (!r.ok) {
        const v = g.error?.code || "";
        throw { message: g.error?.message || "Failed to start import", code: v };
      }
      this.currentImportRunId = g.import_run_id, this.pollAttempts = 0;
      const h = new URL(window.location.href);
      this.currentImportRunId && h.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", h.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (l) {
      console.error("Import error:", l);
      const r = l;
      this.showImportError(r.message || "Failed to start import", r.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), vn);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > et) {
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
            this.showImportStatus("succeeded"), H("Import complete"), setTimeout(() => {
              n.agreement?.id && this.config.routes.agreements ? window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(n.agreement.id)}` : n.document?.id ? window.location.href = `${this.config.routes.index}/${encodeURIComponent(n.document.id)}` : window.location.href = this.config.routes.index;
            }, 1500);
            break;
          case "failed": {
            const a = n.error?.code || "", l = n.error?.message || "Import failed";
            this.showImportError(l, a), H("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < et ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function Di(s) {
  const e = new Fe(s);
  return k(() => e.init()), e;
}
function $i(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api/v1`,
    userId: s.userId,
    googleEnabled: s.googleEnabled !== !1,
    googleConnected: s.googleConnected !== !1,
    googleAccountId: s.googleAccountId,
    maxFileSize: s.maxFileSize,
    routes: s.routes
  }, t = new Fe(e);
  k(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function yn(s) {
  const e = String(s.basePath || s.base_path || "").trim(), t = s.routes && typeof s.routes == "object" ? s.routes : {}, n = s.features && typeof s.features == "object" ? s.features : {}, i = s.context && typeof s.context == "object" ? s.context : {}, a = String(t.index || "").trim();
  return !e && !a ? null : {
    basePath: e || "/admin",
    apiBasePath: String(s.apiBasePath || s.api_base_path || "").trim() || void 0,
    userId: String(s.userId || s.user_id || i.user_id || "").trim(),
    googleEnabled: !!(s.googleEnabled ?? n.google_enabled),
    googleConnected: !!(s.googleConnected ?? n.google_connected),
    googleAccountId: String(
      s.googleAccountId || s.google_account_id || i.google_account_id || ""
    ).trim(),
    maxFileSize: typeof s.maxFileSize == "number" ? s.maxFileSize : typeof s.max_file_size == "number" ? s.max_file_size : void 0,
    routes: {
      index: a,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && k(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = yn(t);
        n && new Fe(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const nt = 1, Ae = "esign_wizard_state_v1", bn = "esign_wizard_sync", xn = 2e3, it = [1e3, 2e3, 5e3, 1e4, 3e4];
class Sn {
  constructor() {
    this.listeners = [], this.broadcastChannel = null, this.state = this.loadFromSession() || this.createInitialState(), this.setupBroadcastChannel();
  }
  createInitialState() {
    return {
      wizardId: this.generateWizardId(),
      version: nt,
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
      const e = sessionStorage.getItem(Ae);
      if (!e) return null;
      const t = JSON.parse(e);
      return t.version !== nt ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(t)) : t;
    } catch (e) {
      return console.warn("Failed to load wizard state from session:", e), null;
    }
  }
  migrateState(e) {
    return this.createInitialState();
  }
  saveToSession() {
    try {
      this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem(Ae, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Failed to save wizard state to session:", e);
    }
  }
  setupBroadcastChannel() {
    if (!(typeof BroadcastChannel > "u"))
      try {
        this.broadcastChannel = new BroadcastChannel(bn), this.broadcastChannel.onmessage = (e) => {
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
      sessionStorage.removeItem(Ae);
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
class Cn {
  constructor(e, t, n, i) {
    this.syncTimeout = null, this.retryCount = 0, this.isSyncing = !1, this.stateManager = e, this.apiBase = t, this.onStatusChange = n, this.onConflict = i;
  }
  scheduleSave() {
    this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => this.syncToServer(), xn);
  }
  async syncToServer() {
    if (this.isSyncing) return;
    const e = this.stateManager.getState();
    if (e.syncPending) {
      this.isSyncing = !0, this.onStatusChange("syncing");
      try {
        const t = this.buildDraftPayload(e), n = e.serverDraftId ? "PUT" : "POST", i = e.serverDraftId ? `${this.apiBase}/esign/drafts/${e.serverDraftId}` : `${this.apiBase}/esign/drafts`, a = await fetch(i, {
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
          const r = await a.json();
          this.onStatusChange("conflict"), this.onConflict(e.updatedAt, r.server_updated_at || "", r.revision || 0);
          return;
        }
        if (!a.ok)
          throw new Error(`Sync failed: ${a.status}`);
        const l = await a.json();
        this.stateManager.markSynced(l.id || l.draft_id, l.revision || 1), this.retryCount = 0, this.onStatusChange("synced");
      } catch (t) {
        console.error("Server sync error:", t), this.onStatusChange("error"), this.scheduleRetry();
      } finally {
        this.isSyncing = !1;
      }
    }
  }
  scheduleRetry() {
    if (this.retryCount >= it.length) {
      console.warn("Max sync retries reached");
      return;
    }
    const e = it[this.retryCount];
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
class Re {
  constructor(e) {
    this.currentStep = 1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.stateManager = new Sn(), this.syncManager = new Cn(
      this.stateManager,
      this.apiBase,
      (t) => this.updateSyncStatusUI(t),
      (t, n, i) => this.showConflictDialog(t, n, i)
    ), this.elements = {
      // Navigation
      wizardSteps: W(".wizard-step"),
      prevBtn: c("#prev-btn"),
      nextBtn: c("#next-btn"),
      submitBtn: c("#submit-btn"),
      // Sync status
      syncStatusIndicator: c("#sync-status-indicator"),
      syncStatusIcon: c("#sync-status-icon"),
      syncStatusText: c("#sync-status-text"),
      syncRetryBtn: c("#sync-retry-btn"),
      // Step panels
      stepPanels: W(".step-panel"),
      // Resume dialog
      resumeDialogModal: c("#resume-dialog-modal"),
      resumeDraftTitle: c("#resume-draft-title"),
      resumeDraftStep: c("#resume-draft-step"),
      resumeDraftTime: c("#resume-draft-time"),
      resumeContinueBtn: c("#resume-continue-btn"),
      resumeNewBtn: c("#resume-new-btn"),
      resumeDiscardBtn: c("#resume-discard-btn"),
      // Conflict dialog
      conflictDialogModal: c("#conflict-dialog-modal"),
      conflictLocalTime: c("#conflict-local-time"),
      conflictServerTime: c("#conflict-server-time"),
      conflictServerRevision: c("#conflict-server-revision"),
      conflictReloadBtn: c("#conflict-reload-btn"),
      conflictForceBtn: c("#conflict-force-btn"),
      conflictDismissBtn: c("#conflict-dismiss-btn"),
      // Step 1
      documentSearch: c("#document-search"),
      documentList: c("#document-list"),
      selectedDocumentDisplay: c("#selected-document-display"),
      // Step 2
      titleInput: c("#agreement-title"),
      messageInput: c("#agreement-message"),
      // Step 3
      participantsList: c("#participants-list"),
      addParticipantBtn: c("#add-participant-btn"),
      // Step 4
      fieldDefinitionsList: c("#field-definitions-list"),
      addFieldBtn: c("#add-field-btn"),
      // Step 5
      pdfViewer: c("#pdf-viewer"),
      fieldPalette: c("#field-palette"),
      // Form
      form: c("#agreement-form"),
      announcements: c("#agreement-announcements")
    };
  }
  async init() {
    this.setupEventListeners(), this.checkForSavedProgress(), this.stateManager.subscribe(() => {
      this.syncManager.scheduleSave();
    });
    const e = this.stateManager.getState();
    e.currentStep > 1 && (this.currentStep = e.currentStep), this.updateWizardUI(), this.config.isEditMode && this.elements.syncStatusIndicator && f(this.elements.syncStatusIndicator);
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
      re(() => this.handleDetailsChange(), 300)
    ), this.elements.messageInput && this.elements.messageInput.addEventListener(
      "input",
      re(() => this.handleDetailsChange(), 300)
    ), this.elements.form && this.elements.form.addEventListener("submit", (e) => this.handleFormSubmit(e));
  }
  checkForSavedProgress() {
    if (this.config.isEditMode) return;
    const e = this.stateManager.getSavedSummary();
    e && e.step > 1 && this.showResumeDialog(e);
  }
  showResumeDialog(e) {
    const { resumeDialogModal: t, resumeDraftTitle: n, resumeDraftStep: i, resumeDraftTime: a } = this.elements;
    n && (n.textContent = e.title), i && (i.textContent = String(e.step)), a && (a.textContent = X(e.updatedAt)), t && x(t);
  }
  hideResumeDialog() {
    this.elements.resumeDialogModal && f(this.elements.resumeDialogModal);
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
    const { conflictDialogModal: i, conflictLocalTime: a, conflictServerTime: l, conflictServerRevision: r } = this.elements;
    a && (a.textContent = X(e)), l && (l.textContent = X(t)), r && (r.textContent = String(n)), i && x(i);
  }
  hideConflictDialog() {
    this.elements.conflictDialogModal && f(this.elements.conflictDialogModal);
  }
  updateSyncStatusUI(e) {
    const { syncStatusIndicator: t, syncStatusIcon: n, syncStatusText: i, syncRetryBtn: a } = this.elements;
    if (!(!t || !n || !i))
      switch (x(t), e) {
        case "syncing":
          n.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", i.textContent = "Saving...", a && f(a);
          break;
        case "synced":
          n.className = "w-2 h-2 rounded-full bg-green-500", i.textContent = "Saved", a && f(a);
          break;
        case "error":
          n.className = "w-2 h-2 rounded-full bg-red-500", i.textContent = "Save failed", a && x(a);
          break;
        case "conflict":
          n.className = "w-2 h-2 rounded-full bg-amber-500", i.textContent = "Conflict", a && f(a);
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
    e < 1 || e > 6 || this.canNavigateToStep(e) && (this.currentStep = e, this.stateManager.setCurrentStep(e), this.updateWizardUI(), H(`Step ${e} of 6`));
  }
  goToNextStep() {
    this.currentStep < 6 && this.goToStep(this.currentStep + 1);
  }
  goToPreviousStep() {
    this.currentStep > 1 && this.goToStep(this.currentStep - 1);
  }
  updateWizardUI() {
    this.elements.wizardSteps.forEach((e, t) => {
      const n = t + 1, i = n === this.currentStep, a = n < this.currentStep;
      e.classList.toggle("active", i), e.classList.toggle("completed", a), e.setAttribute("aria-current", i ? "step" : "false");
    }), this.elements.stepPanels.forEach((e, t) => {
      t + 1 === this.currentStep ? x(e) : f(e);
    }), this.elements.prevBtn && (this.currentStep === 1 ? f(this.elements.prevBtn) : x(this.elements.prevBtn)), this.elements.nextBtn && (this.currentStep === 6 ? f(this.elements.nextBtn) : x(this.elements.nextBtn)), this.elements.submitBtn && (this.currentStep === 6 ? x(this.elements.submitBtn) : f(this.elements.submitBtn));
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
      const i = await n.json();
      this.stateManager.clearSession(), i.id ? window.location.href = `${this.config.routes.index}/${i.id}` : window.location.href = this.config.routes.index;
    } catch (n) {
      console.error("Agreement submission error:", n), H(`Error: ${n instanceof Error ? n.message : "Submission failed"}`);
    }
  }
  destroy() {
    this.stateManager.destroy(), this.syncManager.destroy();
  }
}
function Bi(s) {
  const e = new Re(s);
  return k(() => e.init()), e;
}
function _i(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api/v1`,
    isEditMode: s.isEditMode || !1,
    createSuccess: s.createSuccess,
    agreementId: s.agreementId,
    routes: s.routes
  }, t = new Re(e);
  k(() => t.init()), typeof window < "u" && (window.esignAgreementFormController = t);
}
typeof document < "u" && k(() => {
  if (document.querySelector('[data-esign-page="agreement-form"]')) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(e.textContent || "{}");
        (t.basePath || t.routes?.index) && new Re({
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
const In = "esign.signer.profile.v1", st = "esign.signer.profile.outbox.v1", Be = 90;
class En {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : Be;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${In}:${e}`;
  }
  async load(e) {
    try {
      const t = window.localStorage.getItem(this.storageKey(e));
      if (!t) return null;
      const n = JSON.parse(t);
      return !n || n.schemaVersion !== 1 ? (window.localStorage.removeItem(this.storageKey(e)), null) : typeof n.expiresAt == "number" && Date.now() > n.expiresAt ? (window.localStorage.removeItem(this.storageKey(e)), null) : n;
    } catch {
      return null;
    }
  }
  async save(e, t) {
    const n = Date.now(), a = {
      ...await this.load(e) || {
        schemaVersion: 1,
        key: e,
        fullName: "",
        initials: "",
        typedSignature: "",
        drawnSignatureDataUrl: "",
        drawnInitialsDataUrl: "",
        remember: !0,
        updatedAt: n,
        expiresAt: n + this.ttlMs
      },
      ...t,
      schemaVersion: 1,
      key: e,
      updatedAt: n,
      expiresAt: n + this.ttlMs
    };
    try {
      window.localStorage.setItem(this.storageKey(e), JSON.stringify(a));
    } catch {
    }
    return a;
  }
  async clear(e) {
    try {
      window.localStorage.removeItem(this.storageKey(e));
    } catch {
    }
  }
}
class Ln {
  constructor(e, t) {
    this.endpointBasePath = e.replace(/\/$/, ""), this.token = t;
  }
  endpoint(e) {
    const t = encodeURIComponent(this.token), n = encodeURIComponent(e);
    return `${this.endpointBasePath}/profile/${t}?key=${n}`;
  }
  async load(e) {
    const t = await fetch(this.endpoint(e), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!t.ok) return null;
    const n = await t.json();
    return !n || typeof n != "object" ? null : n.profile || null;
  }
  async save(e, t) {
    const n = await fetch(this.endpoint(e), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ patch: t })
    });
    if (!n.ok)
      throw new Error("remote profile sync failed");
    return (await n.json()).profile;
  }
  async clear(e) {
    const t = await fetch(this.endpoint(e), {
      method: "DELETE",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!t.ok && t.status !== 404)
      throw new Error("remote profile clear failed");
  }
}
class ke {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(st);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [i, a] of Object.entries(t)) {
        if (!a || typeof a != "object")
          continue;
        const l = a;
        if (l.op === "clear") {
          n[i] = {
            op: "clear",
            updatedAt: Number(l.updatedAt) || Date.now()
          };
          continue;
        }
        const r = l.op === "patch" ? l.patch : l;
        n[i] = {
          op: "patch",
          patch: r && typeof r == "object" ? r : {},
          updatedAt: Number(l.updatedAt) || Date.now()
        };
      }
      return n;
    } catch {
      return {};
    }
  }
  outboxSave(e) {
    try {
      window.localStorage.setItem(st, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), i = n[e], a = i?.op === "patch" ? i.patch || {} : {};
    n[e] = {
      op: "patch",
      patch: { ...a, ...t, updatedAt: Date.now() },
      updatedAt: Date.now()
    }, this.outboxSave(n);
  }
  queueClear(e) {
    const t = this.outboxLoad();
    t[e] = { op: "clear", updatedAt: Date.now() }, this.outboxSave(t);
  }
  getOutboxEntry(e) {
    return this.outboxLoad()[e] || null;
  }
  removeOutboxEntry(e) {
    const t = this.outboxLoad();
    t[e] && (delete t[e], this.outboxSave(t));
  }
  async flushOutboxForKey(e) {
    if (!this.remoteStore) return;
    const t = this.outboxLoad(), n = t[e];
    if (n)
      try {
        n.op === "clear" ? await this.remoteStore.clear(e) : await this.remoteStore.save(e, n.patch || {}), delete t[e], this.outboxSave(t);
      } catch {
      }
  }
  pickLatest(e, t) {
    return e && t ? (t.updatedAt || 0) >= (e.updatedAt || 0) ? t : e : t || e;
  }
  async load(e) {
    if (this.mode === "remote_only")
      return !this.remoteStore || this.getOutboxEntry(e) && (await this.flushOutboxForKey(e), this.getOutboxEntry(e)?.op === "clear") ? null : this.remoteStore.load(e);
    if (this.mode === "hybrid" && this.remoteStore) {
      if (this.getOutboxEntry(e)?.op === "clear")
        return await this.flushOutboxForKey(e), this.localStore.load(e);
      const [n, i] = await Promise.all([
        this.localStore.load(e),
        this.remoteStore.load(e).catch(() => null)
      ]), a = this.pickLatest(n, i);
      return a && await this.localStore.save(e, a), await this.flushOutboxForKey(e), a;
    }
    return this.localStore.load(e);
  }
  async save(e, t) {
    if (this.mode === "remote_only") {
      if (!this.remoteStore)
        throw new Error("remote profile store not configured");
      const i = await this.remoteStore.save(e, t);
      return this.removeOutboxEntry(e), i;
    }
    const n = await this.localStore.save(e, t);
    if (this.mode === "hybrid" && this.remoteStore)
      try {
        const i = await this.remoteStore.save(e, t);
        return await this.localStore.save(e, i), this.removeOutboxEntry(e), i;
      } catch {
        this.queuePatch(e, t);
      }
    return n;
  }
  async clear(e) {
    if (await this.localStore.clear(e), this.remoteStore)
      try {
        await this.remoteStore.clear(e);
      } catch {
        throw this.queueClear(e), new Error("remote profile clear failed");
      }
    this.removeOutboxEntry(e);
  }
}
function Pn(s) {
  const e = s.profile?.mode || "local_only";
  return {
    token: String(s.token || "").trim(),
    apiBasePath: String(s.apiBasePath || "/api/v1/esign/signing").trim(),
    signerBasePath: String(s.signerBasePath || "/esign/sign").trim(),
    agreementId: String(s.agreementId || "").trim(),
    recipientId: String(s.recipientId || "").trim(),
    recipientEmail: String(s.recipientEmail || "").trim(),
    recipientName: String(s.recipientName || "").trim(),
    documentUrl: String(s.documentUrl || "").trim(),
    pageCount: Number(s.pageCount || 1) || 1,
    hasConsented: !!s.hasConsented,
    fields: Array.isArray(s.fields) ? s.fields : [],
    flowMode: s.flowMode || "unified",
    telemetryEnabled: s.telemetryEnabled !== !1,
    viewer: {
      coordinateSpace: s.viewer?.coordinateSpace || "pdf",
      contractVersion: String(s.viewer?.contractVersion || "1.0"),
      unit: s.viewer?.unit || "pt",
      origin: s.viewer?.origin || "top-left",
      yAxisDirection: s.viewer?.yAxisDirection || "down",
      pages: Array.isArray(s.viewer?.pages) ? s.viewer?.pages : []
    },
    signerState: s.signerState || "active",
    recipientStage: Number(s.recipientStage || 1) || 1,
    activeStage: Number(s.activeStage || 1) || 1,
    activeRecipientIds: Array.isArray(s.activeRecipientIds) ? s.activeRecipientIds : [],
    waitingForRecipientIds: Array.isArray(s.waitingForRecipientIds) ? s.waitingForRecipientIds : [],
    profile: {
      mode: e,
      rememberByDefault: s.profile?.rememberByDefault !== !1,
      ttlDays: Number(s.profile?.ttlDays || Be) || Be,
      persistDrawnSignature: !!s.profile?.persistDrawnSignature,
      endpointBasePath: String(s.profile?.endpointBasePath || String(s.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function An(s) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = s.recipientEmail ? s.recipientEmail.trim().toLowerCase() : s.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function Te(s) {
  const e = String(s || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function mt(s) {
  const e = String(s || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function G(s) {
  const e = String(s || "").trim();
  return mt(e) ? "" : e;
}
function kn(s) {
  const e = new En(s.profile.ttlDays), t = new Ln(s.profile.endpointBasePath, s.token);
  return s.profile.mode === "local_only" ? new ke("local_only", e, null) : s.profile.mode === "remote_only" ? new ke("remote_only", e, t) : new ke("hybrid", e, t);
}
function Tn() {
  const s = window;
  s.pdfjsLib && s.pdfjsLib.GlobalWorkerOptions && (s.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function Mn(s) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Pn(s), i = An(n), a = kn(n);
  Tn();
  const l = {
    events: [],
    sessionId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    startTime: Date.now(),
    metrics: {
      viewerLoadTime: null,
      fieldSaveLatencies: [],
      signatureAttachLatencies: [],
      errorsEncountered: [],
      pagesViewed: /* @__PURE__ */ new Set(),
      fieldsCompleted: 0,
      consentTime: null,
      submitTime: null
    },
    /**
     * Track a telemetry event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    track(o, d = {}) {
      if (!n.telemetryEnabled) return;
      const u = {
        event: o,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...d
      };
      this.events.push(u), this.isCriticalEvent(o) && this.flush();
    },
    /**
     * Check if event is critical and should be sent immediately
     * @param {string} eventName - Event name
     * @returns {boolean}
     */
    isCriticalEvent(o) {
      return [
        "viewer_load_failed",
        "submit_success",
        "submit_failed",
        "viewer_critical_error",
        "consent_declined"
      ].includes(o);
    },
    /**
     * Track viewer load completion
     * @param {boolean} success - Whether load succeeded
     * @param {number} duration - Load duration in ms
     * @param {string} error - Error message if failed
     */
    trackViewerLoad(o, d, u = null) {
      this.metrics.viewerLoadTime = d, this.track(o ? "viewer_load_success" : "viewer_load_failed", {
        duration: d,
        error: u,
        pageCount: n.pageCount
      });
    },
    /**
     * Track field save operation
     * @param {string} fieldId - Field ID
     * @param {string} fieldType - Field type
     * @param {boolean} success - Whether save succeeded
     * @param {number} latency - Operation latency in ms
     * @param {string} error - Error message if failed
     */
    trackFieldSave(o, d, u, p, m = null) {
      this.metrics.fieldSaveLatencies.push(p), u ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: o, error: m }), this.track(u ? "field_save_success" : "field_save_failed", {
        fieldId: o,
        fieldType: d,
        latency: p,
        error: m
      });
    },
    /**
     * Track signature attachment
     * @param {string} fieldId - Field ID
     * @param {string} signatureType - 'typed' or 'drawn'
     * @param {boolean} success - Whether attach succeeded
     * @param {number} latency - Operation latency in ms
     * @param {string} error - Error message if failed
     */
    trackSignatureAttach(o, d, u, p, m = null) {
      this.metrics.signatureAttachLatencies.push(p), this.track(u ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: o,
        signatureType: d,
        latency: p,
        error: m
      });
    },
    /**
     * Track consent action
     * @param {boolean} accepted - Whether consent was accepted
     */
    trackConsent(o) {
      this.metrics.consentTime = Date.now() - this.startTime, this.track(o ? "consent_accepted" : "consent_declined", {
        timeToConsent: this.metrics.consentTime
      });
    },
    /**
     * Track submission
     * @param {boolean} success - Whether submit succeeded
     * @param {string} error - Error message if failed
     */
    trackSubmit(o, d = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(o ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: r.fieldState.size,
        error: d
      });
    },
    /**
     * Track page navigation
     * @param {number} pageNum - Page number viewed
     */
    trackPageView(o) {
      this.metrics.pagesViewed.has(o) || (this.metrics.pagesViewed.add(o), this.track("page_viewed", {
        pageNum: o,
        totalPagesViewed: this.metrics.pagesViewed.size
      }));
    },
    /**
     * Track viewer critical error
     * @param {string} reason - Reason for error
     */
    trackViewerCriticalError(o) {
      this.track("viewer_critical_error", {
        reason: o,
        timeBeforeError: Date.now() - this.startTime,
        pagesViewed: this.metrics.pagesViewed.size,
        fieldsCompleted: this.metrics.fieldsCompleted
      });
    },
    /**
     * Track degraded mode
     * @param {string} degradationType - Type of degradation
     * @param {Object} details - Additional details
     */
    trackDegradedMode(o, d = {}) {
      this.track("degraded_mode", {
        degradationType: o,
        ...d
      });
    },
    /**
     * Get session summary for debugging
     * @returns {Object}
     */
    getSessionSummary() {
      return {
        sessionId: this.sessionId,
        duration: Date.now() - this.startTime,
        flowMode: n.flowMode,
        viewerLoadTime: this.metrics.viewerLoadTime,
        avgFieldSaveLatency: this.calculateAverage(this.metrics.fieldSaveLatencies),
        avgSignatureAttachLatency: this.calculateAverage(this.metrics.signatureAttachLatencies),
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: r.fieldState?.size || 0,
        pagesViewed: this.metrics.pagesViewed.size,
        errorsCount: this.metrics.errorsEncountered.length,
        consentTime: this.metrics.consentTime,
        submitTime: this.metrics.submitTime
      };
    },
    /**
     * Calculate average of array
     * @param {number[]} arr - Array of numbers
     * @returns {number}
     */
    calculateAverage(o) {
      return o.length ? Math.round(o.reduce((d, u) => d + u, 0) / o.length) : 0;
    },
    /**
     * Flush events to backend
     */
    async flush() {
      if (!n.telemetryEnabled || this.events.length === 0) return;
      const o = [...this.events];
      this.events = [];
      try {
        if (navigator.sendBeacon) {
          const d = JSON.stringify({
            events: o,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(`${n.apiBasePath}/telemetry/${n.token}`, d);
        } else
          await fetch(`${n.apiBasePath}/telemetry/${n.token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              events: o,
              summary: this.getSessionSummary()
            }),
            keepalive: !0
          });
      } catch (d) {
        this.events = [...o, ...this.events], console.warn("Telemetry flush failed:", d);
      }
    }
  };
  window.addEventListener("beforeunload", () => {
    l.track("session_end", l.getSessionSummary()), l.flush();
  }), setInterval(() => l.flush(), 3e4);
  const r = {
    currentPage: 1,
    zoomLevel: 1,
    pdfDoc: null,
    pageRendering: !1,
    pageNumPending: null,
    fieldState: /* @__PURE__ */ new Map(),
    activeFieldId: null,
    hasConsented: n.hasConsented,
    signatureCanvases: /* @__PURE__ */ new Map(),
    pendingSaves: /* @__PURE__ */ new Set(),
    // Performance state
    renderedPages: /* @__PURE__ */ new Map(),
    // Map of page number to rendered canvas
    pageRenderQueue: [],
    maxCachedPages: 5,
    // Limit memory usage
    isLowMemory: !1,
    lastRenderTime: 0,
    renderDebounceMs: 100,
    profileKey: i,
    profileData: null,
    profileRemember: n.profile.rememberByDefault
  }, g = {
    /**
     * Device pixel ratio for high-DPI displays
     */
    dpr: window.devicePixelRatio || 1,
    /**
     * Cached page dimensions from PDF.js render
     */
    pageViewports: /* @__PURE__ */ new Map(),
    /**
     * Get page metadata from viewer config or field data
     */
    getPageMetadata(o) {
      const d = n.viewer.pages?.find((p) => p.page === o);
      if (d)
        return {
          width: d.width,
          height: d.height,
          rotation: d.rotation || 0
        };
      const u = this.pageViewports.get(o);
      return u ? {
        width: u.width,
        height: u.height,
        rotation: u.rotation || 0
      } : { width: 612, height: 792, rotation: 0 };
    },
    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(o, d) {
      this.pageViewports.set(o, {
        width: d.width,
        height: d.height,
        rotation: d.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(o, d) {
      const u = o.page, p = this.getPageMetadata(u), m = d.offsetWidth, b = d.offsetHeight, y = o.pageWidth || p.width, I = o.pageHeight || p.height, A = m / y, F = b / I;
      let D = o.posX || 0, R = o.posY || 0;
      n.viewer.origin === "bottom-left" && (R = I - R - (o.height || 30));
      const z = D * A, U = R * F, T = (o.width || 150) * A, B = (o.height || 30) * F;
      return {
        left: z,
        top: U,
        width: T,
        height: B,
        // Store original values for debugging
        _debug: {
          sourceX: D,
          sourceY: R,
          sourceWidth: o.width,
          sourceHeight: o.height,
          pageWidth: y,
          pageHeight: I,
          scaleX: A,
          scaleY: F,
          zoom: r.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(o, d) {
      const u = this.pageToScreen(o, d);
      return {
        left: `${Math.round(u.left)}px`,
        top: `${Math.round(u.top)}px`,
        width: `${Math.round(u.width)}px`,
        height: `${Math.round(u.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    }
  }, h = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(o, d, u, p) {
      const m = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: o,
            sha256: d,
            content_type: u,
            size_bytes: p
          })
        }
      );
      if (!m.ok) {
        let I = null;
        try {
          I = await m.json();
        } catch {
          I = null;
        }
        throw new Error(I?.error?.message || "Failed to get upload contract");
      }
      const b = await m.json(), y = b?.contract || b;
      if (!y || typeof y != "object" || !y.upload_url)
        throw new Error("Invalid upload contract response");
      return y;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(o, d) {
      const u = new URL(o.upload_url, window.location.origin);
      o.upload_token && u.searchParams.set("upload_token", String(o.upload_token)), o.object_key && u.searchParams.set("object_key", String(o.object_key));
      const p = {
        "Content-Type": o.content_type || "image/png"
      };
      o.headers && Object.entries(o.headers).forEach(([b, y]) => {
        const I = String(b).toLowerCase();
        I === "x-esign-upload-token" || I === "x-esign-upload-key" || (p[b] = String(y));
      });
      const m = await fetch(u.toString(), {
        method: o.method || "PUT",
        headers: p,
        body: d,
        credentials: "omit"
      });
      if (!m.ok)
        throw new Error(`Upload failed: ${m.status} ${m.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(o) {
      const [d, u] = o.split(","), p = d.match(/data:([^;]+)/), m = p ? p[1] : "image/png", b = atob(u), y = new Uint8Array(b.length);
      for (let I = 0; I < b.length; I++)
        y[I] = b.charCodeAt(I);
      return new Blob([y], { type: m });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(o, d) {
      const u = this.dataUrlToBlob(d), p = u.size, m = u.type || "image/png", b = await v(u), y = await this.requestUploadBootstrap(
        o,
        b,
        m,
        p
      );
      return await this.uploadToSignedUrl(y, u), {
        uploadToken: y.upload_token,
        objectKey: y.object_key,
        sha256: y.sha256,
        contentType: y.content_type
      };
    }
  };
  async function v(o) {
    if (window.crypto && window.crypto.subtle) {
      const d = await o.arrayBuffer(), u = await window.crypto.subtle.digest("SHA-256", d);
      return Array.from(new Uint8Array(u)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function w() {
    document.addEventListener("click", (o) => {
      const d = o.target;
      if (!(d instanceof Element)) return;
      const u = d.closest("[data-esign-action]");
      if (!u) return;
      switch (u.getAttribute("data-esign-action")) {
        case "prev-page":
          Ct();
          break;
        case "next-page":
          It();
          break;
        case "zoom-out":
          Pt();
          break;
        case "zoom-in":
          Lt();
          break;
        case "fit-width":
          At();
          break;
        case "download-document":
          Wt();
          break;
        case "show-consent-modal":
          We();
          break;
        case "activate-field": {
          const m = u.getAttribute("data-field-id");
          m && pe(m);
          break;
        }
        case "submit-signature":
          Nt();
          break;
        case "show-decline-modal":
          qt();
          break;
        case "close-field-editor":
          ye();
          break;
        case "save-field-editor":
          Ft();
          break;
        case "hide-consent-modal":
          Se();
          break;
        case "accept-consent":
          Ut();
          break;
        case "hide-decline-modal":
          Je();
          break;
        case "confirm-decline":
          Vt();
          break;
        case "retry-load-pdf":
          de();
          break;
        case "signature-tab": {
          const m = u.getAttribute("data-tab") || "type", b = u.getAttribute("data-field-id");
          b && qe(m, b);
          break;
        }
        case "clear-signature-canvas": {
          const m = u.getAttribute("data-field-id");
          m && _t(m);
          break;
        }
        case "clear-signer-profile":
          V().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          K.togglePanel();
          break;
        case "debug-copy-session":
          K.copySessionInfo();
          break;
        case "debug-clear-cache":
          K.clearCache();
          break;
        case "debug-show-telemetry":
          K.showTelemetry();
          break;
        case "debug-reload-viewer":
          K.reloadViewer();
          break;
      }
    });
  }
  k(async () => {
    w(), r.isLowMemory = te(), P(), await M(), L(), ee(), Ge(), xe(), await de(), ue(), document.addEventListener("visibilitychange", E), "memory" in navigator && C(), K.init();
  });
  function E() {
    document.hidden && S();
  }
  function S() {
    const o = r.isLowMemory ? 1 : 2;
    for (; r.renderedPages.size > o; ) {
      let d = null, u = 1 / 0;
      if (r.renderedPages.forEach((p, m) => {
        m !== r.currentPage && p.timestamp < u && (d = m, u = p.timestamp);
      }), d !== null)
        r.renderedPages.delete(d);
      else
        break;
    }
  }
  function C() {
    setInterval(() => {
      if (navigator.memory) {
        const o = navigator.memory.usedJSHeapSize, d = navigator.memory.totalJSHeapSize;
        o / d > 0.8 && (r.isLowMemory = !0, S());
      }
    }, 3e4);
  }
  function P() {
    const o = document.getElementById("stage-state-banner"), d = document.getElementById("stage-state-icon"), u = document.getElementById("stage-state-title"), p = document.getElementById("stage-state-message"), m = document.getElementById("stage-state-meta");
    if (!o || !d || !u || !p || !m) return;
    const b = n.signerState || "active", y = n.recipientStage || 1, I = n.activeStage || 1, A = n.activeRecipientIds || [], F = n.waitingForRecipientIds || [];
    let D = {
      hidden: !1,
      bgClass: "bg-green-50",
      borderClass: "border-green-200",
      iconClass: "iconoir-check-circle text-green-600",
      titleClass: "text-green-900",
      messageClass: "text-green-800",
      title: "It's your turn to sign",
      message: "Please complete and sign the document below.",
      badges: []
    };
    switch (b) {
      case "waiting":
        D = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: y > I ? `You are in signing stage ${y}. Stage ${I} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, F.length > 0 && D.badges.push({
          icon: "iconoir-group",
          text: `${F.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        D = {
          hidden: !1,
          bgClass: "bg-amber-50",
          borderClass: "border-amber-200",
          iconClass: "iconoir-warning-triangle text-amber-600",
          titleClass: "text-amber-900",
          messageClass: "text-amber-800",
          title: "Signing Not Available",
          message: "This agreement cannot be signed at this time. It may have been completed, voided, or is awaiting action from another party.",
          badges: [
            { icon: "iconoir-lock", text: "Access restricted", variant: "amber" }
          ]
        };
        break;
      case "completed":
        D = {
          hidden: !1,
          bgClass: "bg-green-50",
          borderClass: "border-green-200",
          iconClass: "iconoir-check-circle text-green-600",
          titleClass: "text-green-900",
          messageClass: "text-green-800",
          title: "Signing Complete",
          message: "You have already completed signing this document.",
          badges: [
            { icon: "iconoir-check", text: "Signed", variant: "green" }
          ]
        };
        break;
      case "active":
      default:
        A.length > 1 ? (D.message = `You and ${A.length - 1} other signer(s) can sign now.`, D.badges = [
          { icon: "iconoir-users", text: `Stage ${I} active`, variant: "green" }
        ]) : y > 1 ? D.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${y}`, variant: "green" }
        ] : D.hidden = !0;
        break;
    }
    if (D.hidden) {
      o.classList.add("hidden");
      return;
    }
    o.classList.remove("hidden"), o.className = `mb-4 rounded-lg border p-4 ${D.bgClass} ${D.borderClass}`, d.className = `${D.iconClass} mt-0.5`, u.className = `text-sm font-semibold ${D.titleClass}`, u.textContent = D.title, p.className = `text-xs ${D.messageClass} mt-1`, p.textContent = D.message, m.innerHTML = "", D.badges.forEach((R) => {
      const z = document.createElement("span"), U = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      z.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${U[R.variant] || U.blue}`, z.innerHTML = `<i class="${R.icon} mr-1"></i>${R.text}`, m.appendChild(z);
    });
  }
  function L() {
    n.fields.forEach((o) => {
      let d = null, u = !1;
      if (o.type === "checkbox")
        d = o.value_bool || !1, u = d;
      else if (o.type === "date_signed")
        d = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], u = !0;
      else {
        const p = String(o.value_text || "");
        d = p || $(o), u = !!p;
      }
      r.fieldState.set(o.id, {
        id: o.id,
        type: o.type,
        page: o.page || 1,
        required: o.required,
        value: d,
        completed: u,
        hasError: !1,
        lastError: null,
        // Geometry metadata (will be populated from backend in Phase 18.BE.3)
        posX: o.pos_x || 0,
        posY: o.pos_y || 0,
        width: o.width || 150,
        height: o.height || 30
      });
    });
  }
  async function M() {
    try {
      const o = await a.load(r.profileKey);
      o && (r.profileData = o, r.profileRemember = o.remember !== !1);
    } catch {
    }
  }
  function $(o) {
    const d = r.profileData;
    if (!d) return "";
    const u = String(o?.type || "").trim();
    return u === "name" ? G(d.fullName || "") : u === "initials" ? G(d.initials || "") || Te(d.fullName || n.recipientName || "") : u === "signature" ? G(d.typedSignature || "") : "";
  }
  function _(o) {
    return !n.profile.persistDrawnSignature || !r.profileData ? "" : o?.type === "initials" && String(r.profileData.drawnInitialsDataUrl || "").trim() || String(r.profileData.drawnSignatureDataUrl || "").trim();
  }
  function j(o) {
    const d = G(o?.value || "");
    return d || (r.profileData ? o?.type === "initials" ? G(r.profileData.initials || "") || Te(r.profileData.fullName || n.recipientName || "") : o?.type === "signature" ? G(r.profileData.typedSignature || "") : "" : "");
  }
  function N(o) {
    const d = String(o?.value || "").trim();
    return mt(d) ? !0 : j(o) ? !1 : !!_(o);
  }
  function Z() {
    const o = document.getElementById("remember-profile-input");
    return o instanceof HTMLInputElement ? !!o.checked : r.profileRemember;
  }
  async function V(o = !1) {
    let d = null;
    try {
      await a.clear(r.profileKey);
    } catch (u) {
      d = u;
    } finally {
      r.profileData = null, r.profileRemember = n.profile.rememberByDefault;
    }
    if (d) {
      if (!o && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !o)
        throw d;
      return;
    }
    !o && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function J(o, d = {}) {
    const u = Z();
    if (r.profileRemember = u, !u) {
      await V(!0);
      return;
    }
    if (!o) return;
    const p = {
      remember: !0
    }, m = String(o.type || "");
    if (m === "name" && typeof o.value == "string") {
      const b = G(o.value);
      b && (p.fullName = b, (r.profileData?.initials || "").trim() || (p.initials = Te(b)));
    }
    if (m === "initials") {
      if (d.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof d.signatureDataUrl == "string")
        p.drawnInitialsDataUrl = d.signatureDataUrl;
      else if (typeof o.value == "string") {
        const b = G(o.value);
        b && (p.initials = b);
      }
    }
    if (m === "signature") {
      if (d.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof d.signatureDataUrl == "string")
        p.drawnSignatureDataUrl = d.signatureDataUrl;
      else if (typeof o.value == "string") {
        const b = G(o.value);
        b && (p.typedSignature = b);
      }
    }
    if (!(Object.keys(p).length === 1 && p.remember === !0))
      try {
        const b = await a.save(r.profileKey, p);
        r.profileData = b;
      } catch {
      }
  }
  function ee() {
    const o = document.getElementById("consent-checkbox"), d = document.getElementById("consent-accept-btn");
    o && d && o.addEventListener("change", function() {
      d.disabled = !this.checked;
    });
  }
  function te() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function O() {
    const o = r.isLowMemory ? 3 : r.maxCachedPages;
    if (r.renderedPages.size <= o) return;
    const d = [];
    for (r.renderedPages.forEach((u, p) => {
      const m = Math.abs(p - r.currentPage);
      d.push({ pageNum: p, distance: m });
    }), d.sort((u, p) => p.distance - u.distance); r.renderedPages.size > o && d.length > 0; ) {
      const u = d.shift();
      u && u.pageNum !== r.currentPage && r.renderedPages.delete(u.pageNum);
    }
  }
  function ce(o) {
    if (r.isLowMemory) return;
    const d = [];
    o > 1 && d.push(o - 1), o < n.pageCount && d.push(o + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      d.forEach(async (u) => {
        !r.renderedPages.has(u) && !r.pageRendering && await le(u);
      });
    }, { timeout: 2e3 });
  }
  async function le(o) {
    if (!(!r.pdfDoc || r.renderedPages.has(o)))
      try {
        const d = await r.pdfDoc.getPage(o), u = r.zoomLevel, p = d.getViewport({ scale: u * window.devicePixelRatio }), m = document.createElement("canvas"), b = m.getContext("2d");
        m.width = p.width, m.height = p.height;
        const y = {
          canvasContext: b,
          viewport: p
        };
        await d.render(y).promise, r.renderedPages.set(o, {
          canvas: m,
          scale: u,
          timestamp: Date.now()
        }), O();
      } catch (d) {
        console.warn("Preload failed for page", o, d);
      }
  }
  function xt() {
    const o = window.devicePixelRatio || 1;
    return r.isLowMemory ? Math.min(o, 1.5) : Math.min(o, 2);
  }
  async function de() {
    const o = document.getElementById("pdf-loading"), d = Date.now();
    try {
      const u = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!u.ok)
        throw new Error("Failed to load document");
      const m = (await u.json()).assets || {}, b = m.source_url || m.executed_url || m.certificate_url || n.documentUrl;
      if (!b)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const y = pdfjsLib.getDocument(b);
      r.pdfDoc = await y.promise, n.pageCount = r.pdfDoc.numPages, document.getElementById("page-count").textContent = r.pdfDoc.numPages, await ve(1), he(), l.trackViewerLoad(!0, Date.now() - d), l.trackPageView(1);
    } catch (u) {
      console.error("PDF load error:", u), l.trackViewerLoad(!1, Date.now() - d, u.message), o && (o.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Gt();
    }
  }
  async function ve(o) {
    if (!r.pdfDoc) return;
    const d = r.renderedPages.get(o);
    if (d && d.scale === r.zoomLevel) {
      St(d), r.currentPage = o, document.getElementById("current-page").textContent = o, ue(), ce(o);
      return;
    }
    r.pageRendering = !0;
    try {
      const u = await r.pdfDoc.getPage(o), p = r.zoomLevel, m = xt(), b = u.getViewport({ scale: p * m }), y = u.getViewport({ scale: 1 });
      g.setPageViewport(o, {
        width: y.width,
        height: y.height,
        rotation: y.rotation || 0
      });
      const I = document.getElementById("pdf-page-1");
      I.innerHTML = "";
      const A = document.createElement("canvas"), F = A.getContext("2d");
      A.height = b.height, A.width = b.width, A.style.width = `${b.width / m}px`, A.style.height = `${b.height / m}px`, I.appendChild(A);
      const D = document.getElementById("pdf-container");
      D.style.width = `${b.width / m}px`;
      const R = {
        canvasContext: F,
        viewport: b
      };
      await u.render(R).promise, r.renderedPages.set(o, {
        canvas: A.cloneNode(!0),
        scale: p,
        timestamp: Date.now(),
        displayWidth: b.width / m,
        displayHeight: b.height / m
      }), r.renderedPages.get(o).canvas.getContext("2d").drawImage(A, 0, 0), O(), r.currentPage = o, document.getElementById("current-page").textContent = o, ue(), l.trackPageView(o), ce(o);
    } catch (u) {
      console.error("Page render error:", u);
    } finally {
      if (r.pageRendering = !1, r.pageNumPending !== null) {
        const u = r.pageNumPending;
        r.pageNumPending = null, await ve(u);
      }
    }
  }
  function St(o, d) {
    const u = document.getElementById("pdf-page-1");
    u.innerHTML = "";
    const p = document.createElement("canvas");
    p.width = o.canvas.width, p.height = o.canvas.height, p.style.width = `${o.displayWidth}px`, p.style.height = `${o.displayHeight}px`, p.getContext("2d").drawImage(o.canvas, 0, 0), u.appendChild(p);
    const b = document.getElementById("pdf-container");
    b.style.width = `${o.displayWidth}px`;
  }
  function ne(o) {
    r.pageRendering ? r.pageNumPending = o : ve(o);
  }
  function ue() {
    const o = document.getElementById("field-overlays");
    o.innerHTML = "", o.style.pointerEvents = "auto";
    const d = document.getElementById("pdf-container");
    r.fieldState.forEach((u, p) => {
      if (u.page !== r.currentPage) return;
      const m = document.createElement("div");
      if (m.className = "field-overlay", m.dataset.fieldId = p, u.required && m.classList.add("required"), u.completed && m.classList.add("completed"), r.activeFieldId === p && m.classList.add("active"), u.posX != null && u.posY != null && u.width != null && u.height != null) {
        const I = g.getOverlayStyles(u, d);
        m.style.left = I.left, m.style.top = I.top, m.style.width = I.width, m.style.height = I.height, m.style.transform = I.transform, K.enabled && (m.dataset.debugCoords = JSON.stringify(
          g.pageToScreen(u, d)._debug
        ));
      } else {
        const I = Array.from(r.fieldState.keys()).indexOf(p);
        m.style.left = "10px", m.style.top = `${100 + I * 50}px`, m.style.width = "150px", m.style.height = "30px";
      }
      const y = document.createElement("span");
      y.className = "field-overlay-label", y.textContent = Ue(u.type), m.appendChild(y), m.setAttribute("tabindex", "0"), m.setAttribute("role", "button"), m.setAttribute("aria-label", `${Ue(u.type)} field${u.required ? ", required" : ""}${u.completed ? ", completed" : ""}`), m.addEventListener("click", () => pe(p)), m.addEventListener("keydown", (I) => {
        (I.key === "Enter" || I.key === " ") && (I.preventDefault(), pe(p));
      }), o.appendChild(m);
    });
  }
  function Ue(o) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[o] || o;
  }
  function Ct() {
    r.currentPage <= 1 || (ne(r.currentPage - 1), he());
  }
  function It() {
    r.currentPage >= n.pageCount || (ne(r.currentPage + 1), he());
  }
  function Et(o) {
    o < 1 || o > n.pageCount || (ne(o), he());
  }
  function he() {
    document.getElementById("prev-page-btn").disabled = r.currentPage <= 1, document.getElementById("next-page-btn").disabled = r.currentPage >= n.pageCount;
  }
  function Lt() {
    r.zoomLevel = Math.min(r.zoomLevel + 0.25, 3), we(), ne(r.currentPage);
  }
  function Pt() {
    r.zoomLevel = Math.max(r.zoomLevel - 0.25, 0.5), we(), ne(r.currentPage);
  }
  function At() {
    const d = document.getElementById("viewer-content").offsetWidth - 32, u = 612;
    r.zoomLevel = d / u, we(), ne(r.currentPage);
  }
  function we() {
    document.getElementById("zoom-level").textContent = `${Math.round(r.zoomLevel * 100)}%`;
  }
  function pe(o) {
    if (!r.hasConsented && n.fields.some((u) => u.id === o && u.type !== "date_signed")) {
      We();
      return;
    }
    r.activeFieldId = o;
    const d = r.fieldState.get(o);
    document.querySelectorAll(".field-list-item").forEach((u) => u.classList.remove("active")), document.querySelector(`.field-list-item[data-field-id="${o}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((u) => u.classList.remove("active")), document.querySelector(`.field-overlay[data-field-id="${o}"]`)?.classList.add("active"), d.page !== r.currentPage && Et(d.page), d.type !== "date_signed" && kt(o);
  }
  function kt(o) {
    const d = r.fieldState.get(o);
    if (!d) return;
    const u = document.getElementById("field-editor-overlay"), p = document.getElementById("field-editor-content"), m = document.getElementById("field-editor-title");
    m.textContent = Ne(d.type), p.innerHTML = Tt(d), (d.type === "signature" || d.type === "initials") && Dt(o), u.classList.add("active"), u.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Ce(u.querySelector(".field-editor")), q(`Editing ${Ne(d.type)}. Press Escape to cancel.`), setTimeout(() => {
      const b = p.querySelector("input, textarea");
      b && b.focus();
    }, 100);
  }
  function Ne(o) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[o] || "Edit Field";
  }
  function Tt(o) {
    const d = Mt(o.type), u = ae(String(o?.id || "")), p = ae(String(o?.type || ""));
    if (o.type === "signature" || o.type === "initials") {
      const m = o.type === "initials" ? "initials" : "signature", b = o.type === "signature" || o.type === "initials", y = ae(j(o));
      return `
        <div class="space-y-4">
          ${b ? `
          <!-- Type/Draw tabs -->
          <div class="flex border-b border-gray-200" role="tablist">
            <button type="button" class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600" data-tab="type" data-esign-action="signature-tab" data-field-id="${u}">
              Type
            </button>
            <button type="button" class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700" data-tab="draw" data-esign-action="signature-tab" data-field-id="${u}">
              Draw
            </button>
          </div>
          ` : ""}

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${m}"
              value="${y}"
              data-field-id="${u}"
            />
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${m} will appear as your ${p}</p>
          </div>

          ${b ? `
          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel hidden">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${u}"></canvas>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${u}" class="absolute bottom-2 right-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <i class="iconoir-refresh"></i> Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${m} using mouse or touch</p>
          </div>
          ` : ""}

          ${d}
        </div>
      `;
    }
    if (o.type === "name")
      return `
        <input
          type="text"
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full legal name"
          value="${ae(String(o.value || ""))}"
          data-field-id="${u}"
        />
        ${d}
      `;
    if (o.type === "text") {
      const m = ae(String(o.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${u}"
        >${m}</textarea>
      `;
    }
    return o.type === "checkbox" ? `
        <label class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            id="field-checkbox-input"
            class="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${o.value ? "checked" : ""}
            data-field-id="${o.id}"
          />
          <span class="text-gray-700">I agree to the terms and conditions</span>
        </label>
      ` : '<p class="text-gray-500">Unsupported field type</p>';
  }
  function Mt(o) {
    return o === "name" || o === "initials" || o === "signature" ? `
      <div class="pt-3 border-t border-gray-100 space-y-2">
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            id="remember-profile-input"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${r.profileRemember ? "checked" : ""}
          />
          Remember this on this device
        </label>
        <button
          type="button"
          data-esign-action="clear-signer-profile"
          class="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2"
        >
          Clear saved signer profile
        </button>
      </div>
    ` : "";
  }
  function qe(o, d) {
    document.querySelectorAll(".sig-editor-tab").forEach((p) => {
      p.classList.remove("border-blue-600", "text-blue-600"), p.classList.add("border-transparent", "text-gray-500");
    });
    const u = document.querySelector(`.sig-editor-tab[data-tab="${o}"]`);
    u?.classList.add("border-blue-600", "text-blue-600"), u?.classList.remove("border-transparent", "text-gray-500"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", o !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", o !== "draw"), o === "draw" && u && requestAnimationFrame(() => $t(d));
  }
  function Dt(o) {
    const d = r.fieldState.get(o);
    d && N(d) && qe("draw", o);
  }
  function $t(o) {
    const d = document.getElementById("sig-draw-canvas");
    if (!d || r.signatureCanvases.has(o)) return;
    const u = d.closest(".signature-canvas-container"), p = d.getContext("2d"), m = d.getBoundingClientRect(), b = window.devicePixelRatio || 1;
    d.width = m.width * b, d.height = m.height * b, p.scale(b, b), p.lineCap = "round", p.lineJoin = "round", p.lineWidth = 2.5, p.strokeStyle = "#1f2937";
    let y = !1, I = 0, A = 0, F = [];
    const D = (T) => {
      const B = d.getBoundingClientRect();
      let Y, Q;
      return T.touches && T.touches.length > 0 ? (Y = T.touches[0].clientX, Q = T.touches[0].clientY) : T.changedTouches && T.changedTouches.length > 0 ? (Y = T.changedTouches[0].clientX, Q = T.changedTouches[0].clientY) : (Y = T.clientX, Q = T.clientY), {
        x: Y - B.left,
        y: Q - B.top,
        timestamp: Date.now()
      };
    }, R = (T) => {
      y = !0;
      const B = D(T);
      I = B.x, A = B.y, F = [{ x: B.x, y: B.y, t: B.timestamp }], u && u.classList.add("drawing");
    }, z = (T) => {
      if (!y) return;
      const B = D(T);
      F.push({ x: B.x, y: B.y, t: B.timestamp });
      const Y = B.x - I, Q = B.y - A, Kt = B.timestamp - (F[F.length - 2]?.t || B.timestamp), Yt = Math.sqrt(Y * Y + Q * Q) / Math.max(Kt, 1), Qt = 2.5, Xt = 1.5, Zt = 4, en = Math.min(Yt / 5, 1);
      p.lineWidth = Math.max(Xt, Math.min(Zt, Qt - en * 1.5)), p.beginPath(), p.moveTo(I, A), p.lineTo(B.x, B.y), p.stroke(), I = B.x, A = B.y;
    }, U = () => {
      y = !1, F = [], u && u.classList.remove("drawing");
    };
    d.addEventListener("mousedown", R), d.addEventListener("mousemove", z), d.addEventListener("mouseup", U), d.addEventListener("mouseout", U), d.addEventListener("touchstart", (T) => {
      T.preventDefault(), T.stopPropagation(), R(T);
    }, { passive: !1 }), d.addEventListener("touchmove", (T) => {
      T.preventDefault(), T.stopPropagation(), z(T);
    }, { passive: !1 }), d.addEventListener("touchend", (T) => {
      T.preventDefault(), U();
    }, { passive: !1 }), d.addEventListener("touchcancel", U), d.addEventListener("gesturestart", (T) => T.preventDefault()), d.addEventListener("gesturechange", (T) => T.preventDefault()), d.addEventListener("gestureend", (T) => T.preventDefault()), r.signatureCanvases.set(o, { canvas: d, ctx: p, dpr: b }), Bt(o);
  }
  function Bt(o) {
    const d = r.signatureCanvases.get(o), u = r.fieldState.get(o);
    if (!d || !u) return;
    const p = _(u);
    if (!p) return;
    const { canvas: m, ctx: b } = d, y = new Image();
    y.onload = () => {
      const I = m.clientWidth || m.width / (window.devicePixelRatio || 1), A = m.clientHeight || m.height / (window.devicePixelRatio || 1);
      if (I <= 0 || A <= 0) return;
      b.clearRect(0, 0, I, A);
      const F = Math.min(I / y.width, A / y.height), D = y.width * F, R = y.height * F, z = (I - D) / 2, U = (A - R) / 2;
      b.drawImage(y, z, U, D, R);
    }, y.onerror = () => {
    }, y.src = p;
  }
  function _t(o) {
    const d = r.signatureCanvases.get(o);
    if (d) {
      const { canvas: u, ctx: p } = d;
      p.clearRect(0, 0, u.width, u.height);
    }
  }
  function ye() {
    const o = document.getElementById("field-editor-overlay"), d = o.querySelector(".field-editor");
    if (Ie(d), o.classList.remove("active"), o.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", r.activeFieldId) {
      const u = document.querySelector(`.field-list-item[data-field-id="${r.activeFieldId}"]`);
      requestAnimationFrame(() => {
        u?.focus();
      });
    }
    r.activeFieldId = null, r.signatureCanvases.clear(), q("Field editor closed.");
  }
  async function Ft() {
    const o = r.activeFieldId;
    if (!o) return;
    const d = r.fieldState.get(o);
    if (!d) return;
    const u = document.getElementById("field-editor-save");
    u.disabled = !0, u.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      r.profileRemember = Z();
      let p = !1;
      if (d.type === "signature" || d.type === "initials")
        p = await Rt(o);
      else if (d.type === "checkbox") {
        const m = document.getElementById("field-checkbox-input");
        p = await be(o, null, m?.checked || !1);
      } else {
        const b = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!b && d.required)
          throw new Error("This field is required");
        p = await be(o, b, null);
      }
      if (p) {
        ye(), Ge(), xe(), Ke(), ue(), Ot(o), zt();
        const m = Ye();
        m.allRequiredComplete ? q("Field saved. All required fields complete. Ready to submit.") : q(`Field saved. ${m.remainingRequired} required field${m.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (p) {
      window.toastManager && window.toastManager.error(p.message), q(`Error saving field: ${p.message}`, "assertive");
    } finally {
      u.disabled = !1, u.innerHTML = "Apply";
    }
  }
  async function Rt(o) {
    const d = r.fieldState.get(o), u = document.getElementById("sig-type-input"), p = document.getElementById("sig-editor-draw");
    if ((d?.type === "signature" || d?.type === "initials") && p && !p.classList.contains("hidden")) {
      const y = r.signatureCanvases.get(o);
      if (!y) return !1;
      const { canvas: I, ctx: A } = y;
      if (!A.getImageData(0, 0, I.width, I.height).data.some((z, U) => U % 4 === 3 && z > 0))
        throw new Error(d?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const R = I.toDataURL("image/png");
      return await Ve(o, { type: "drawn", dataUrl: R }, d?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const y = u?.value?.trim();
      if (!y)
        throw new Error(d?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return d.type === "initials" ? await be(o, y, null) : await Ve(o, { type: "typed", text: y }, y);
    }
  }
  async function be(o, d, u) {
    r.pendingSaves.add(o);
    const p = Date.now(), m = r.fieldState.get(o);
    try {
      const b = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: o,
          value_text: d,
          value_bool: u
        })
      });
      if (!b.ok) {
        const I = await b.json();
        throw new Error(I.error?.message || "Failed to save field");
      }
      const y = r.fieldState.get(o);
      return y && (y.value = d ?? u, y.completed = !0, y.hasError = !1), await J(y), window.toastManager && window.toastManager.success("Field saved"), l.trackFieldSave(o, y?.type, !0, Date.now() - p), !0;
    } catch (b) {
      const y = r.fieldState.get(o);
      throw y && (y.hasError = !0, y.lastError = b.message), l.trackFieldSave(o, m?.type, !1, Date.now() - p, b.message), b;
    } finally {
      r.pendingSaves.delete(o);
    }
  }
  async function Ve(o, d, u) {
    r.pendingSaves.add(o);
    const p = Date.now(), m = d?.type || "typed";
    try {
      let b;
      if (m === "drawn") {
        const A = await h.uploadDrawnSignature(
          o,
          d.dataUrl
        );
        b = {
          field_instance_id: o,
          type: "drawn",
          value_text: u,
          object_key: A.objectKey,
          sha256: A.sha256,
          upload_token: A.uploadToken
        };
      } else
        b = await Ht(o, u);
      const y = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b)
      });
      if (!y.ok) {
        const A = await y.json();
        throw new Error(A.error?.message || "Failed to save signature");
      }
      const I = r.fieldState.get(o);
      return I && (I.value = u, I.completed = !0, I.hasError = !1), await J(I, {
        signatureType: m,
        signatureDataUrl: d?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), l.trackSignatureAttach(o, m, !0, Date.now() - p), !0;
    } catch (b) {
      const y = r.fieldState.get(o);
      throw y && (y.hasError = !0, y.lastError = b.message), l.trackSignatureAttach(o, m, !1, Date.now() - p, b.message), b;
    } finally {
      r.pendingSaves.delete(o);
    }
  }
  async function Ht(o, d) {
    const u = `${d}|${o}`, p = await jt(u), m = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${o}-${Date.now()}.txt`;
    return {
      field_instance_id: o,
      type: "typed",
      value_text: d,
      object_key: m,
      sha256: p
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function jt(o) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const d = new TextEncoder().encode(o), u = await window.crypto.subtle.digest("SHA-256", d);
      return Array.from(new Uint8Array(u)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Ge() {
    let o = 0;
    r.fieldState.forEach((I) => {
      I.required, I.completed && o++;
    });
    const d = r.fieldState.size, u = d > 0 ? o / d * 100 : 0;
    document.getElementById("completed-count").textContent = o, document.getElementById("total-count").textContent = d;
    const p = document.getElementById("progress-ring-circle"), m = 97.4, b = m - u / 100 * m;
    p.style.strokeDashoffset = b, document.getElementById("mobile-progress").style.width = `${u}%`;
    const y = d - o;
    document.getElementById("fields-status").textContent = y > 0 ? `${y} remaining` : "All complete";
  }
  function xe() {
    const o = document.getElementById("submit-btn"), d = document.getElementById("incomplete-warning"), u = document.getElementById("incomplete-message");
    let p = [], m = !1;
    r.fieldState.forEach((y, I) => {
      y.required && !y.completed && p.push(y), y.hasError && (m = !0);
    });
    const b = r.hasConsented && p.length === 0 && !m && r.pendingSaves.size === 0;
    o.disabled = !b, r.hasConsented ? m ? (d.classList.remove("hidden"), u.textContent = "Some fields failed to save. Please retry.") : p.length > 0 ? (d.classList.remove("hidden"), u.textContent = `Complete ${p.length} required field${p.length > 1 ? "s" : ""}`) : d.classList.add("hidden") : (d.classList.remove("hidden"), u.textContent = "Please accept the consent agreement");
  }
  function Ot(o) {
    const d = r.fieldState.get(o), u = document.querySelector(`.field-list-item[data-field-id="${o}"]`);
    if (!(!u || !d)) {
      if (d.completed) {
        u.classList.add("completed"), u.classList.remove("error");
        const p = u.querySelector(".w-8");
        p.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), p.classList.add("bg-green-100", "text-green-600"), p.innerHTML = '<i class="iconoir-check"></i>';
      } else if (d.hasError) {
        u.classList.remove("completed"), u.classList.add("error");
        const p = u.querySelector(".w-8");
        p.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), p.classList.add("bg-red-100", "text-red-600"), p.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function zt() {
    for (const [o, d] of r.fieldState)
      if (d.required && !d.completed) {
        document.querySelector(`.field-list-item[data-field-id="${o}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
    document.getElementById("panel-content").scrollTo({ top: document.getElementById("panel-content").scrollHeight, behavior: "smooth" });
  }
  function We() {
    const o = document.getElementById("consent-modal");
    o.classList.add("active"), o.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Ce(o.querySelector(".field-editor")), q("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Se() {
    const o = document.getElementById("consent-modal"), d = o.querySelector(".field-editor");
    Ie(d), o.classList.remove("active"), o.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", q("Consent dialog closed.");
  }
  async function Ut() {
    const o = document.getElementById("consent-accept-btn");
    o.disabled = !0, o.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const d = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!d.ok) {
        const u = await d.json();
        throw new Error(u.error?.message || "Failed to accept consent");
      }
      r.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Se(), xe(), Ke(), l.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), q("Consent accepted. You can now complete the fields and submit.");
    } catch (d) {
      window.toastManager && window.toastManager.error(d.message), q(`Error: ${d.message}`, "assertive");
    } finally {
      o.disabled = !1, o.innerHTML = "Accept & Continue";
    }
  }
  async function Nt() {
    const o = document.getElementById("submit-btn");
    o.disabled = !0, o.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const d = `submit-${n.recipientId}-${Date.now()}`, u = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": d }
      });
      if (!u.ok) {
        const p = await u.json();
        throw new Error(p.error?.message || "Failed to submit");
      }
      l.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (d) {
      l.trackSubmit(!1, d.message), window.toastManager && window.toastManager.error(d.message), o.disabled = !1, o.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature';
    }
  }
  function qt() {
    const o = document.getElementById("decline-modal");
    o.classList.add("active"), o.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Ce(o.querySelector(".field-editor")), q("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Je() {
    const o = document.getElementById("decline-modal"), d = o.querySelector(".field-editor");
    Ie(d), o.classList.remove("active"), o.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", q("Decline dialog closed.");
  }
  async function Vt() {
    const o = document.getElementById("decline-reason").value;
    try {
      const d = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: o })
      });
      if (!d.ok) {
        const u = await d.json();
        throw new Error(u.error?.message || "Failed to decline");
      }
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (d) {
      window.toastManager && window.toastManager.error(d.message);
    }
  }
  function Gt() {
    l.trackDegradedMode("viewer_load_failure"), l.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Wt() {
    try {
      const o = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!o.ok) throw new Error("Document unavailable");
      const u = (await o.json()).assets || {}, p = u.source_url || u.executed_url || u.certificate_url;
      if (p)
        window.open(p, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (o) {
      window.toastManager && window.toastManager.error(o.message || "Unable to download document");
    }
  }
  const K = {
    enabled: localStorage.getItem("esign_debug") === "true" || new URLSearchParams(window.location.search).has("debug"),
    panel: null,
    /**
     * Initialize debug mode if enabled
     */
    init() {
      this.enabled && (this.createDebugPanel(), this.bindConsoleHelpers(), this.logSessionInfo(), console.info("%c[E-Sign Debug] Debug mode enabled. Access window.esignDebug for helpers.", "color: #3b82f6; font-weight: bold"));
    },
    /**
     * Create floating debug panel
     */
    createDebugPanel() {
      this.panel = document.createElement("div"), this.panel.id = "esign-debug-panel", this.panel.innerHTML = `
        <style>
          #esign-debug-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            max-height: 400px;
            background: #1f2937;
            color: #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            font-family: monospace;
            font-size: 11px;
            z-index: 9999;
            overflow: hidden;
          }
          #esign-debug-panel.collapsed {
            width: 44px;
            height: 44px;
            border-radius: 22px;
          }
          #esign-debug-panel.collapsed .debug-content {
            display: none;
          }
          #esign-debug-panel .debug-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #111827;
            cursor: pointer;
          }
          #esign-debug-panel.collapsed .debug-header {
            justify-content: center;
            padding: 10px;
          }
          #esign-debug-panel .debug-content {
            padding: 12px;
            max-height: 340px;
            overflow-y: auto;
          }
          #esign-debug-panel .debug-section {
            margin-bottom: 12px;
          }
          #esign-debug-panel .debug-label {
            color: #9ca3af;
            margin-bottom: 4px;
          }
          #esign-debug-panel .debug-value {
            color: #10b981;
          }
          #esign-debug-panel .debug-value.warning {
            color: #f59e0b;
          }
          #esign-debug-panel .debug-value.error {
            color: #ef4444;
          }
          #esign-debug-panel .debug-btn {
            padding: 4px 8px;
            background: #374151;
            border: none;
            border-radius: 4px;
            color: #e5e7eb;
            cursor: pointer;
            font-size: 10px;
          }
          #esign-debug-panel .debug-btn:hover {
            background: #4b5563;
          }
        </style>
        <div class="debug-header" data-esign-action="debug-toggle-panel">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">🔧</span>
            <span class="debug-title">Debug Panel</span>
          </span>
          <span class="debug-toggle">−</span>
        </div>
        <div class="debug-content">
          <div class="debug-section">
            <div class="debug-label">Flow Mode</div>
            <div class="debug-value" id="debug-flow-mode">${n.flowMode}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Session</div>
            <div class="debug-value" id="debug-session-id">${l.sessionId}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Consent</div>
            <div class="debug-value" id="debug-consent">${r.hasConsented ? "✓ Accepted" : "✗ Pending"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Fields</div>
            <div class="debug-value" id="debug-fields">0/${r.fieldState?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Memory Mode</div>
            <div class="debug-value" id="debug-memory">${r.isLowMemory ? "⚠ Low Memory" : "Normal"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Cached Pages</div>
            <div class="debug-value" id="debug-cached">${r.renderedPages?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Actions</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="debug-btn" data-esign-action="debug-copy-session">Copy Info</button>
              <button type="button" class="debug-btn" data-esign-action="debug-clear-cache">Clear Cache</button>
              <button type="button" class="debug-btn" data-esign-action="debug-show-telemetry">View Telemetry</button>
              <button type="button" class="debug-btn" data-esign-action="debug-reload-viewer">Reload Viewer</button>
            </div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Errors</div>
            <div class="debug-value" id="debug-errors" style="color: inherit;">None</div>
          </div>
        </div>
      `, document.body.appendChild(this.panel), setInterval(() => this.updatePanel(), 1e3);
    },
    /**
     * Toggle debug panel collapsed state
     */
    togglePanel() {
      if (!this.panel) return;
      this.panel.classList.toggle("collapsed");
      const o = this.panel.querySelector(".debug-toggle"), d = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (o.textContent = "+", d.style.display = "none") : (o.textContent = "−", d.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const o = r.fieldState;
      let d = 0;
      o?.forEach((p) => {
        p.completed && d++;
      }), document.getElementById("debug-consent").textContent = r.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${r.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${d}/${o?.size || 0}`, document.getElementById("debug-cached").textContent = r.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = r.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${r.isLowMemory ? "warning" : ""}`;
      const u = l.metrics.errorsEncountered;
      document.getElementById("debug-errors").textContent = u.length > 0 ? `${u.length} error(s)` : "None", document.getElementById("debug-errors").className = `debug-value ${u.length > 0 ? "error" : ""}`;
    },
    /**
     * Bind console helper functions
     */
    bindConsoleHelpers() {
      window.esignDebug = {
        getState: () => ({
          config: n,
          state: {
            currentPage: r.currentPage,
            zoomLevel: r.zoomLevel,
            hasConsented: r.hasConsented,
            activeFieldId: r.activeFieldId,
            isLowMemory: r.isLowMemory,
            cachedPages: r.renderedPages?.size || 0
          },
          fields: Array.from(r.fieldState?.entries() || []).map(([o, d]) => ({
            id: o,
            type: d.type,
            completed: d.completed,
            hasError: d.hasError
          })),
          telemetry: l.getSessionSummary(),
          errors: l.metrics.errorsEncountered
        }),
        getEvents: () => l.events,
        forceError: (o) => {
          l.track("debug_forced_error", { message: o }), console.error("[E-Sign Debug] Forced error:", o);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), de();
        },
        setLowMemory: (o) => {
          r.isLowMemory = o, O(), console.log(`[E-Sign Debug] Low memory mode: ${o}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", l.sessionId), console.log("Fields:", r.fieldState?.size || 0), console.log("Low Memory:", r.isLowMemory), console.groupEnd();
    },
    /**
     * Copy session info to clipboard
     */
    async copySessionInfo() {
      const o = JSON.stringify(window.esignDebug.getState(), null, 2);
      try {
        await navigator.clipboard.writeText(o), alert("Session info copied to clipboard");
      } catch {
        console.log("Session Info:", o), alert("Check console for session info");
      }
    },
    /**
     * Reload the PDF viewer
     */
    reloadViewer() {
      console.log("[E-Sign Debug] Reloading PDF viewer..."), de(), this.updatePanel();
    },
    /**
     * Clear page cache
     */
    clearCache() {
      r.renderedPages?.clear(), console.log("[E-Sign Debug] Page cache cleared"), this.updatePanel();
    },
    /**
     * Show telemetry events
     */
    showTelemetry() {
      console.table(l.events), console.log("Session Summary:", l.getSessionSummary());
    }
  };
  function q(o, d = "polite") {
    const u = d === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    u && (u.textContent = "", requestAnimationFrame(() => {
      u.textContent = o;
    }));
  }
  function Ce(o) {
    const u = o.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), p = u[0], m = u[u.length - 1];
    o.dataset.previousFocus || (o.dataset.previousFocus = document.activeElement?.id || "");
    function b(y) {
      y.key === "Tab" && (y.shiftKey ? document.activeElement === p && (y.preventDefault(), m?.focus()) : document.activeElement === m && (y.preventDefault(), p?.focus()));
    }
    o.addEventListener("keydown", b), o._focusTrapHandler = b, requestAnimationFrame(() => {
      p?.focus();
    });
  }
  function Ie(o) {
    o._focusTrapHandler && (o.removeEventListener("keydown", o._focusTrapHandler), delete o._focusTrapHandler);
    const d = o.dataset.previousFocus;
    if (d) {
      const u = document.getElementById(d);
      requestAnimationFrame(() => {
        u?.focus();
      }), delete o.dataset.previousFocus;
    }
  }
  function Ke() {
    const o = Ye(), d = document.getElementById("submit-status");
    d && (o.allRequiredComplete && r.hasConsented ? d.textContent = "All required fields complete. You can now submit." : r.hasConsented ? d.textContent = `Complete ${o.remainingRequired} more required field${o.remainingRequired > 1 ? "s" : ""} to enable submission.` : d.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function Ye() {
    let o = 0, d = 0, u = 0;
    return r.fieldState.forEach((p) => {
      p.required && d++, p.completed && o++, p.required && !p.completed && u++;
    }), {
      completed: o,
      required: d,
      remainingRequired: u,
      total: r.fieldState.size,
      allRequiredComplete: u === 0
    };
  }
  function Jt(o, d = 1) {
    const u = Array.from(r.fieldState.keys()), p = u.indexOf(o);
    if (p === -1) return null;
    const m = p + d;
    return m >= 0 && m < u.length ? u[m] : null;
  }
  document.addEventListener("keydown", function(o) {
    if (o.key === "Escape" && (ye(), Se(), Je()), o.target.classList.contains("field-list-item")) {
      if (o.key === "ArrowDown" || o.key === "ArrowUp") {
        o.preventDefault();
        const d = o.target.dataset.fieldId, u = o.key === "ArrowDown" ? 1 : -1, p = Jt(d, u);
        p && document.querySelector(`.field-list-item[data-field-id="${p}"]`)?.focus();
      }
      if (o.key === "Enter" || o.key === " ") {
        o.preventDefault();
        const d = o.target.dataset.fieldId;
        d && pe(d);
      }
    }
    o.key === "Tab" && !o.target.closest(".field-editor-overlay") && !o.target.closest("#consent-modal") && o.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(o) {
    o.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class ft {
  constructor(e) {
    this.config = e;
  }
  init() {
    Mn(this.config);
  }
  destroy() {
  }
}
function Fi(s) {
  const e = new ft(s);
  return k(() => e.init()), e;
}
function Dn() {
  const s = document.getElementById("esign-signer-review-config");
  if (!s) return null;
  try {
    const e = JSON.parse(s.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && k(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = Dn();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new ft(e);
  t.init(), window.esignSignerReviewController = t;
});
class vt {
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
    W('[data-action="retry"]').forEach((n) => {
      n.addEventListener("click", () => this.handleRetry());
    }), W('.retry-btn, [aria-label*="Try Again"]').forEach((n) => {
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
function Ri(s = {}) {
  const e = new vt(s);
  return k(() => e.init()), e;
}
function Hi(s = {}) {
  const e = new vt(s);
  k(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class He {
  constructor(e) {
    this.pdfDoc = null, this.currentPage = 1, this.isLoading = !1, this.isLoaded = !1, this.scale = 1.5, this.config = e, this.elements = {
      loadBtn: c("#pdf-load-btn"),
      retryBtn: c("#pdf-retry-btn"),
      loading: c("#pdf-loading"),
      spinner: c("#pdf-spinner"),
      error: c("#pdf-error"),
      errorMessage: c("#pdf-error-message"),
      viewer: c("#pdf-viewer"),
      canvas: c("#pdf-canvas"),
      pagination: c("#pdf-pagination"),
      prevBtn: c("#pdf-prev-page"),
      nextBtn: c("#pdf-next-page"),
      currentPageEl: c("#pdf-current-page"),
      totalPagesEl: c("#pdf-total-pages"),
      status: c("#pdf-status")
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
    const { loadBtn: e, retryBtn: t, prevBtn: n, nextBtn: i } = this.elements;
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), i && i.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (a) => {
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
        const n = await this.pdfDoc.getPage(e), i = n.getViewport({ scale: this.scale }), a = this.elements.canvas, l = a.getContext("2d");
        if (!l)
          throw new Error("Failed to get canvas context");
        a.height = i.height, a.width = i.width, await n.render({
          canvasContext: l,
          viewport: i
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: i } = this.elements, a = this.pdfDoc?.numPages || 1;
    i && i.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= a);
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
    const { loading: e, spinner: t, error: n, viewer: i } = this.elements;
    e && f(e), t && x(t), n && f(n), i && f(i);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: i } = this.elements;
    e && f(e), t && f(t), n && f(n), i && x(i);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: i, errorMessage: a, viewer: l } = this.elements;
    t && f(t), n && f(n), i && x(i), l && f(l), a && (a.textContent = e);
  }
}
function ji(s) {
  const e = new He(s);
  return e.init(), e;
}
function Oi(s) {
  const e = {
    documentId: s.documentId,
    pdfUrl: s.pdfUrl,
    pageCount: s.pageCount || 1
  }, t = new He(e);
  k(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && k(() => {
  const s = document.querySelector('[data-esign-page="document-detail"]');
  if (s instanceof HTMLElement) {
    const e = s.dataset.documentId || "", t = s.dataset.pdfUrl || "", n = parseInt(s.dataset.pageCount || "1", 10);
    e && t && new He({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class zi {
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
class Ui {
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
function $n(s) {
  switch ((s || "").toLowerCase()) {
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
function Bn(s) {
  if (!Array.isArray(s)) return;
  const e = s.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", i = t.label ?? String(n);
    return { label: String(i), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function _n(s, e) {
  if (!Array.isArray(s) || s.length === 0) return;
  const t = s.map((a) => String(a || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), i = e ? String(e).trim().toLowerCase() : "";
  return i && n.includes(i) ? [i, ...n.filter((a) => a !== i)] : n;
}
function Ni(s) {
  return s.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function qi(s) {
  return s ? s.map((e) => ({
    name: e.name,
    label: e.label,
    type: $n(e.type),
    options: Bn(e.options),
    operators: _n(e.operators, e.default_operator)
  })) : [];
}
function Vi(s) {
  if (!s) return "-";
  try {
    const e = new Date(s);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(s);
  }
}
function Gi(s) {
  if (!s || Number(s) <= 0) return "-";
  const e = parseInt(String(s), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Wi(s, e, t) {
  t && t.success(`${s} completed successfully`);
}
function Ji(s, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([l, r]) => `${l}: ${r}`).join("; ") : "", i = e?.textCode ? `${e.textCode}: ` : "", a = e?.message || `${s} failed`;
    t.error(n ? `${i}${a}: ${n}` : `${i}${a}`);
  }
}
function Ki(s, e) {
  const t = c(`#${s}`);
  t && t.addEventListener("click", async () => {
    t.disabled = !0, t.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      t.disabled = !1, t.classList.remove("opacity-50");
    }
  });
}
function Yi(s, e) {
  const t = s.refresh.bind(s);
  return async function() {
    await t();
    const n = s.getSchema();
    n?.actions && e(n.actions);
  };
}
const Qi = {
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
}, fe = "application/vnd.google-apps.document", je = "application/vnd.google-apps.spreadsheet", Oe = "application/vnd.google-apps.presentation", wt = "application/vnd.google-apps.folder", ze = "application/pdf", Fn = [fe, ze], yt = "esign.google.account_id";
function Rn(s) {
  return s.mimeType === fe;
}
function Hn(s) {
  return s.mimeType === ze;
}
function ie(s) {
  return s.mimeType === wt;
}
function jn(s) {
  return Fn.includes(s.mimeType);
}
function Xi(s) {
  return s.mimeType === fe || s.mimeType === je || s.mimeType === Oe;
}
function On(s) {
  return {
    id: s.id || "",
    name: s.name || "Untitled",
    mimeType: s.mimeType || "application/octet-stream",
    size: typeof s.size == "string" ? parseInt(s.size, 10) || 0 : s.size || 0,
    modifiedTime: s.modifiedTime || (/* @__PURE__ */ new Date()).toISOString(),
    iconLink: s.iconLink,
    thumbnailLink: s.thumbnailLink,
    webViewLink: s.webViewLink,
    parents: s.parents
  };
}
function Zi(s) {
  return s.map(On);
}
function bt(s) {
  return {
    [fe]: "Google Doc",
    [je]: "Google Sheet",
    [Oe]: "Google Slides",
    [wt]: "Folder",
    [ze]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[s] || "File";
}
function zn(s) {
  return ie(s) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Rn(s) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : Hn(s) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : s.mimeType === je ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : s.mimeType === Oe ? {
    icon: "iconoir-presentation",
    bgClass: "bg-orange-100",
    textClass: "text-orange-600"
  } : s.mimeType.startsWith("image/") ? {
    icon: "iconoir-media-image",
    bgClass: "bg-purple-100",
    textClass: "text-purple-600"
  } : {
    icon: "iconoir-page",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600"
  };
}
function Un(s) {
  return !s || s <= 0 ? "-" : s < 1024 ? `${s} B` : s < 1024 * 1024 ? `${(s / 1024).toFixed(1)} KB` : `${(s / (1024 * 1024)).toFixed(2)} MB`;
}
function Nn(s) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}
function es(s, e) {
  const t = s.get("account_id");
  if (t)
    return me(t);
  if (e)
    return me(e);
  const n = localStorage.getItem(yt);
  return n ? me(n) : "";
}
function me(s) {
  if (!s) return "";
  const e = s.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function ts(s) {
  const e = me(s);
  e && localStorage.setItem(yt, e);
}
function ns(s, e) {
  if (!e) return s;
  try {
    const t = new URL(s, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = s.includes("?") ? "&" : "?";
    return `${s}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function is(s, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(s) || (n.pathname = `${s}${e}`), t && n.searchParams.set("account_id", t), n;
}
function ss(s) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  s && t !== s ? (e.searchParams.set("account_id", s), window.history.replaceState({}, "", e.toString())) : !s && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function se(s) {
  const e = document.createElement("div");
  return e.textContent = s, e.innerHTML;
}
function qn(s) {
  const e = zn(s);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function rs(s, e) {
  if (s.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...s
  ];
  return t.map((n, i) => {
    const a = i === t.length - 1, l = i > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return a ? `${l}<span class="text-gray-900 font-medium">${se(n.name)}</span>` : `${l}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${se(n.name)}</button>`;
  }).join("");
}
function Vn(s, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: i = !0 } = e, a = qn(s), l = ie(s), r = jn(s), g = l ? "cursor-pointer hover:bg-gray-50" : r ? "cursor-pointer hover:bg-blue-50" : "opacity-60", h = l ? `data-folder-id="${s.id}" data-folder-name="${se(s.name)}"` : r && t ? `data-file-id="${s.id}" data-file-name="${se(s.name)}" data-mime-type="${s.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${g} file-item"
      ${h}
      role="listitem"
      ${r ? 'tabindex="0"' : ""}
    >
      ${a}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${se(s.name)}</p>
        <p class="text-xs text-gray-500">
          ${bt(s.mimeType)}
          ${n && s.size > 0 ? ` &middot; ${Un(s.size)}` : ""}
          ${i && s.modifiedTime ? ` &middot; ${Nn(s.modifiedTime)}` : ""}
        </p>
      </div>
      ${r && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function as(s, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return s.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${se(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...s].sort((a, l) => ie(a) && !ie(l) ? -1 : !ie(a) && ie(l) ? 1 : a.name.localeCompare(l.name)).map((a) => Vn(a, { selectable: n })).join("")}
    </div>
  `;
}
function os(s) {
  return {
    id: s.id,
    name: s.name,
    mimeType: s.mimeType,
    typeName: bt(s.mimeType)
  };
}
export {
  on as AGREEMENT_STATUS_BADGES,
  Re as AgreementFormController,
  He as DocumentDetailPreviewController,
  Fe as DocumentFormController,
  tn as ESignAPIClient,
  nn as ESignAPIError,
  yt as GOOGLE_ACCOUNT_STORAGE_KEY,
  ct as GoogleCallbackController,
  dt as GoogleDrivePickerController,
  lt as GoogleIntegrationController,
  Fn as IMPORTABLE_MIME_TYPES,
  pt as IntegrationConflictsController,
  ut as IntegrationHealthController,
  ht as IntegrationMappingsController,
  gt as IntegrationSyncRunsController,
  _e as LandingPageController,
  fe as MIME_GOOGLE_DOC,
  wt as MIME_GOOGLE_FOLDER,
  je as MIME_GOOGLE_SHEET,
  Oe as MIME_GOOGLE_SLIDES,
  ze as MIME_PDF,
  zi as PanelPaginationBehavior,
  Ui as PanelSearchBehavior,
  Qi as STANDARD_GRID_SELECTORS,
  ot as SignerCompletePageController,
  vt as SignerErrorPageController,
  ft as SignerReviewController,
  H as announce,
  ns as applyAccountIdToPath,
  pn as applyDetailFormatters,
  _i as bootstrapAgreementForm,
  Oi as bootstrapDocumentDetailPreview,
  $i as bootstrapDocumentForm,
  yi as bootstrapGoogleCallback,
  Ci as bootstrapGoogleDrivePicker,
  xi as bootstrapGoogleIntegration,
  ki as bootstrapIntegrationConflicts,
  Ei as bootstrapIntegrationHealth,
  Pi as bootstrapIntegrationMappings,
  Mi as bootstrapIntegrationSyncRuns,
  mi as bootstrapLandingPage,
  vi as bootstrapSignerCompletePage,
  Hi as bootstrapSignerErrorPage,
  Mn as bootstrapSignerReview,
  is as buildScopedApiUrl,
  ii as byId,
  an as capitalize,
  rn as createESignClient,
  ln as createElement,
  Yi as createSchemaActionCachingRefresh,
  os as createSelectedFile,
  ti as createStatusBadgeElement,
  hi as createTimeoutController,
  Vi as dateTimeCellRenderer,
  re as debounce,
  Ji as defaultActionErrorHandler,
  Wi as defaultActionSuccessHandler,
  ri as delegate,
  se as escapeHtml,
  Gi as fileSizeCellRenderer,
  Kn as formatDate,
  X as formatDateTime,
  Nn as formatDriveDate,
  Un as formatDriveFileSize,
  ge as formatFileSize,
  Jn as formatPageCount,
  Xn as formatRecipientCount,
  Qn as formatRelativeTime,
  un as formatSizeElements,
  Yn as formatTime,
  hn as formatTimestampElements,
  rt as getAgreementStatusBadge,
  Wn as getESignClient,
  zn as getFileIconConfig,
  bt as getFileTypeName,
  dn as getPageConfig,
  f as hide,
  Bi as initAgreementForm,
  gn as initDetailFormatters,
  ji as initDocumentDetailPreview,
  Di as initDocumentForm,
  wi as initGoogleCallback,
  Si as initGoogleDrivePicker,
  bi as initGoogleIntegration,
  Ai as initIntegrationConflicts,
  Ii as initIntegrationHealth,
  Li as initIntegrationMappings,
  Ti as initIntegrationSyncRuns,
  gi as initLandingPage,
  fi as initSignerCompletePage,
  Ri as initSignerErrorPage,
  Fi as initSignerReview,
  ie as isFolder,
  Rn as isGoogleDoc,
  Xi as isGoogleWorkspaceFile,
  jn as isImportable,
  Hn as isPDF,
  me as normalizeAccountId,
  On as normalizeDriveFile,
  Zi as normalizeDriveFiles,
  _n as normalizeFilterOperators,
  Bn as normalizeFilterOptions,
  $n as normalizeFilterType,
  si as on,
  k as onReady,
  li as poll,
  qi as prepareFilterFields,
  Ni as prepareGridColumns,
  c as qs,
  W as qsa,
  rs as renderBreadcrumb,
  qn as renderFileIcon,
  Vn as renderFileItem,
  as as renderFileList,
  cn as renderStatusBadge,
  es as resolveAccountId,
  di as retry,
  ts as saveAccountId,
  sn as setESignClient,
  oi as setLoading,
  Ki as setupRefreshButton,
  x as show,
  at as sleep,
  Zn as snakeToTitle,
  ss as syncAccountIdToUrl,
  ui as throttle,
  ai as toggle,
  ei as truncate,
  oe as updateDataText,
  ci as updateDataTexts,
  ni as updateStatusBadge,
  pi as withTimeout
};
//# sourceMappingURL=index.js.map

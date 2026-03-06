import { e as V } from "../chunks/html-DyksyvcZ.js";
class Ln {
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
      const f = await this.listAgreements({ page: t, per_page: n }), g = f.items || f.records || [];
      if (e.push(...g), g.length === 0 || e.length >= f.total)
        break;
      t += 1;
    }
    const o = {};
    for (const f of e) {
      const g = String(f?.status || "").trim().toLowerCase();
      g && (o[g] = (o[g] || 0) + 1);
    }
    const d = (o.sent || 0) + (o.in_progress || 0), a = d + (o.declined || 0);
    return {
      draft: o.draft || 0,
      sent: o.sent || 0,
      in_progress: o.in_progress || 0,
      completed: o.completed || 0,
      voided: o.voided || 0,
      declined: o.declined || 0,
      expired: o.expired || 0,
      pending: d,
      action_required: a
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
      throw new An(t.code, t.message, t.details);
    }
    if (e.status !== 204)
      return e.json();
  }
}
class An extends Error {
  constructor(e, t, n) {
    super(t), this.code = e, this.details = n, this.name = "ESignAPIError";
  }
}
let Fe = null;
function wi() {
  if (!Fe)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return Fe;
}
function kn(s) {
  Fe = s;
}
function Pn(s) {
  const e = new Ln(s);
  return kn(e), e;
}
function fe(s) {
  if (s == null || s === "" || s === 0) return "-";
  const e = typeof s == "string" ? parseInt(s, 10) : s;
  return !Number.isFinite(e) || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function yi(s) {
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
function bi(s, e) {
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
function xi(s, e) {
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
function Si(s) {
  if (!s) return "-";
  try {
    const e = s instanceof Date ? s : new Date(s);
    if (isNaN(e.getTime())) return "-";
    const t = /* @__PURE__ */ new Date(), n = e.getTime() - t.getTime(), i = Math.round(n / 1e3), o = Math.round(i / 60), d = Math.round(o / 60), a = Math.round(d / 24), f = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(a) >= 1 ? f.format(a, "day") : Math.abs(d) >= 1 ? f.format(d, "hour") : Math.abs(o) >= 1 ? f.format(o, "minute") : f.format(i, "second");
  } catch {
    return String(s);
  }
}
function Ci(s) {
  return s == null ? "0 recipients" : s === 1 ? "1 recipient" : `${s} recipients`;
}
function Tn(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
function Ei(s) {
  return s ? s.split("_").map((e) => Tn(e)).join(" ") : "";
}
function Ii(s, e) {
  return !s || s.length <= e ? s : `${s.slice(0, e - 3)}...`;
}
const Mn = {
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
function xt(s) {
  const e = String(s || "").trim().toLowerCase();
  return Mn[e] || {
    label: s || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function Dn(s, e) {
  const t = xt(s), n = e?.showDot ?? !1, i = e?.size ?? "sm", o = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, d = n ? `<span class="w-2 h-2 rounded-full ${t.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${o[i]} rounded-full font-medium ${t.bgClass} ${t.textClass}">${d}${t.label}</span>`;
}
function Li(s, e) {
  const t = document.createElement("span");
  return t.innerHTML = Dn(s, e), t.firstElementChild;
}
function Ai(s, e, t) {
  const n = xt(e), i = t?.size ?? "sm", o = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (s.className = "", s.className = `inline-flex items-center ${o[i]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, t?.showDot ?? !1) {
    const f = s.querySelector(".rounded-full");
    if (f)
      f.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const g = document.createElement("span");
      g.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, g.setAttribute("aria-hidden", "true"), s.prepend(g);
    }
  }
  const a = s.childNodes[s.childNodes.length - 1];
  a && a.nodeType === Node.TEXT_NODE ? a.textContent = n.label : s.appendChild(document.createTextNode(n.label));
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
function ki(s) {
  return document.getElementById(s);
}
function $n(s, e, t) {
  const n = document.createElement(s);
  if (e)
    for (const [i, o] of Object.entries(e))
      o !== void 0 && n.setAttribute(i, o);
  if (t)
    for (const i of t)
      typeof i == "string" ? n.appendChild(document.createTextNode(i)) : n.appendChild(i);
  return n;
}
function Pi(s, e, t, n) {
  return s.addEventListener(e, t, n), () => s.removeEventListener(e, t, n);
}
function Ti(s, e, t, n, i) {
  const o = (d) => {
    const a = d.target.closest(e);
    a && s.contains(a) && n.call(a, d, a);
  };
  return s.addEventListener(t, o, i), () => s.removeEventListener(t, o, i);
}
function M(s) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", s, { once: !0 }) : s();
}
function x(s) {
  s && (s.classList.remove("hidden", "invisible"), s.style.display = "");
}
function w(s) {
  s && s.classList.add("hidden");
}
function Mi(s, e) {
  if (!s) return;
  e ?? s.classList.contains("hidden") ? x(s) : w(s);
}
function Di(s, e, t) {
  s && (e ? (s.setAttribute("aria-busy", "true"), s.classList.add("opacity-50", "pointer-events-none"), (s instanceof HTMLButtonElement || s instanceof HTMLInputElement) && (s.disabled = !0)) : (s.removeAttribute("aria-busy"), s.classList.remove("opacity-50", "pointer-events-none"), (s instanceof HTMLButtonElement || s instanceof HTMLInputElement) && (s.disabled = !1)));
}
function ce(s, e, t = document) {
  const n = c(`[data-esign-${s}]`, t);
  n && (n.textContent = String(e));
}
function $i(s, e = document) {
  for (const [t, n] of Object.entries(s))
    ce(t, n, e);
}
function Bn(s = "[data-esign-page]", e = "data-esign-config") {
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
    const n = $n("div", {
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
async function Bi(s) {
  const {
    fn: e,
    until: t,
    interval: n = 2e3,
    timeout: i = 6e4,
    maxAttempts: o = 30,
    onProgress: d,
    signal: a
  } = s, f = Date.now();
  let g = 0, y;
  for (; g < o; ) {
    if (a?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - f >= i)
      return {
        result: y,
        attempts: g,
        stopped: !1,
        timedOut: !0
      };
    if (g++, y = await e(), d && d(y, g), t(y))
      return {
        result: y,
        attempts: g,
        stopped: !0,
        timedOut: !1
      };
    await St(n, a);
  }
  return {
    result: y,
    attempts: g,
    stopped: !1,
    timedOut: !1
  };
}
async function _i(s) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: n = 1e3,
    maxDelay: i = 3e4,
    exponentialBackoff: o = !0,
    shouldRetry: d = () => !0,
    onRetry: a,
    signal: f
  } = s;
  let g;
  for (let y = 1; y <= t; y++) {
    if (f?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (b) {
      if (g = b, y >= t || !d(b, y))
        throw b;
      const I = o ? Math.min(n * Math.pow(2, y - 1), i) : n;
      a && a(b, y, I), await St(I, f);
    }
  }
  throw g;
}
function St(s, e) {
  return new Promise((t, n) => {
    if (e?.aborted) {
      n(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const i = setTimeout(t, s);
    if (e) {
      const o = () => {
        clearTimeout(i), n(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", o, { once: !0 });
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
function Fi(s, e) {
  let t = 0, n = null;
  return (...i) => {
    const o = Date.now();
    o - t >= e ? (t = o, s(...i)) : n || (n = setTimeout(
      () => {
        t = Date.now(), n = null, s(...i);
      },
      e - (o - t)
    ));
  };
}
function Ri(s) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), s);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function Hi(s, e, t = "Operation timed out") {
  let n;
  const i = new Promise((o, d) => {
    n = setTimeout(() => {
      d(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([s, i]);
  } finally {
    clearTimeout(n);
  }
}
class Oe {
  constructor(e) {
    this.config = e, this.client = Pn({
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
    ce('count="draft"', e.draft), ce('count="pending"', e.pending), ce('count="completed"', e.completed), ce('count="action_required"', e.action_required), this.updateStatElement("draft", e.draft), this.updateStatElement("pending", e.pending), this.updateStatElement("completed", e.completed), this.updateStatElement("action_required", e.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(e, t) {
    const n = document.querySelector(`[data-esign-count="${e}"]`);
    n && (n.textContent = String(t));
  }
}
function ji(s) {
  const e = s || Bn(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!e)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const t = new Oe(e);
  return M(() => t.init()), t;
}
function Oi(s, e) {
  const t = {
    basePath: s,
    apiBasePath: e || `${s}/api`
  }, n = new Oe(t);
  M(() => n.init());
}
typeof document < "u" && M(() => {
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
      const i = String(n.basePath || n.base_path || "/admin"), o = String(
        n.apiBasePath || n.api_base_path || `${i}/api`
      );
      new Oe({ basePath: i, apiBasePath: o }).init();
    }
  }
});
class Ct {
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
      i && (n === e ? x(i) : w(i));
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
function zi(s) {
  const e = new Ct(s);
  return M(() => e.init()), e;
}
function Ui(s) {
  const e = new Ct(s);
  M(() => e.init()), typeof window < "u" && (window.esignCompletionController = e, window.loadArtifacts = () => e.loadArtifacts());
}
function _n(s = document) {
  W("[data-size-bytes]", s).forEach((e) => {
    const t = e.getAttribute("data-size-bytes");
    t && (e.textContent = fe(t));
  });
}
function Fn(s = document) {
  W("[data-timestamp]", s).forEach((e) => {
    const t = e.getAttribute("data-timestamp");
    t && (e.textContent = X(t));
  });
}
function Rn(s = document) {
  _n(s), Fn(s);
}
function Hn() {
  M(() => {
    Rn();
  });
}
typeof document < "u" && Hn();
const pt = {
  access_denied: "You denied access to your Google account.",
  invalid_request: "The authorization request was invalid.",
  unauthorized_client: "This application is not authorized.",
  unsupported_response_type: "The response type is not supported.",
  invalid_scope: "The requested scope is invalid.",
  server_error: "Google encountered a server error.",
  temporarily_unavailable: "Google is temporarily unavailable. Please try again.",
  unknown: "Authorization failed."
};
class Et {
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
    const e = new URLSearchParams(window.location.search), t = e.get("code"), n = e.get("error"), i = e.get("error_description"), o = e.get("state"), d = this.parseOAuthState(o);
    d.account_id || (d.account_id = (e.get("account_id") || "").trim()), n ? this.handleError(n, i, d) : t ? this.handleSuccess(t, d) : this.handleError("unknown", "No authorization code was received from Google.", d);
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
    switch (w(t), w(n), w(i), e) {
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
    const { errorMessage: i, errorDetail: o, closeBtn: d } = this.elements;
    i && (i.textContent = pt[e] || pt.unknown), t && o && (o.textContent = t, x(o)), this.sendToOpener({
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
      const e = this.config.basePath || "/admin", t = this.config.fallbackRedirectPath || `${e}/esign/integrations/google`, n = new URL(t, window.location.origin), i = new URLSearchParams(window.location.search), o = i.get("state"), a = this.parseOAuthState(o).account_id || i.get("account_id");
      a && n.searchParams.set("account_id", a), window.location.href = n.toString();
    }
  }
}
function Ni(s) {
  const e = s || {
    basePath: "/admin",
    apiBasePath: "/admin/api"
  }, t = new Et(e);
  return M(() => t.init()), t;
}
function qi(s) {
  const e = {
    basePath: s,
    apiBasePath: `${s}/api`
  }, t = new Et(e);
  M(() => t.init());
}
const Te = "esign.google.account_id", jn = {
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
class It {
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
      reauthBtn: o,
      oauthCancelBtn: d,
      disconnectCancelBtn: a,
      disconnectConfirmBtn: f,
      accountIdInput: g,
      oauthModal: y,
      disconnectModal: b
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), o && o.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, b && x(b);
    }), a && a.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, b && w(b);
    }), f && f.addEventListener("click", () => this.disconnect()), d && d.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), i && i.addEventListener("click", () => this.checkStatus()), g && (g.addEventListener("change", () => {
      this.setCurrentAccountId(g.value, !0);
    }), g.addEventListener("keydown", (E) => {
      E.key === "Enter" && (E.preventDefault(), this.setCurrentAccountId(g.value, !0));
    }));
    const { accountDropdown: I, connectFirstBtn: C } = this.elements;
    I && I.addEventListener("change", () => {
      I.value === "__new__" ? (I.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(I.value, !0);
    }), C && C.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (E) => {
      E.key === "Escape" && (y && !y.classList.contains("hidden") && this.cancelOAuthFlow(), b && !b.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, w(b)));
    }), [y, b].forEach((E) => {
      E && E.addEventListener("click", (T) => {
        const P = T.target;
        (P === E || P.getAttribute("aria-hidden") === "true") && (w(E), E === y ? this.cancelOAuthFlow() : E === b && (this.pendingDisconnectAccountId = null));
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
        window.localStorage.getItem(Te)
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
      this.currentAccountId ? window.localStorage.setItem(Te, this.currentAccountId) : window.localStorage.removeItem(Te);
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
    const { loadingState: t, disconnectedState: n, connectedState: i, errorState: o } = this.elements;
    switch (w(t), w(n), w(i), w(o), e) {
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
        x(o);
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
        let o = `Failed to check status: ${e.status}`;
        try {
          const d = await e.json();
          d?.error?.message && (o = d.error.message);
        } catch {
        }
        throw new Error(o);
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
    const t = (T, P) => {
      for (const $ of T)
        if (Object.prototype.hasOwnProperty.call(e, $) && e[$] !== void 0 && e[$] !== null)
          return e[$];
      return P;
    }, n = t(["expires_at", "ExpiresAt"], ""), i = t(["scopes", "Scopes"], []), o = this.normalizeAccountId(
      t(["account_id", "AccountID"], "")
    ), d = t(["connected", "Connected"], !1), a = t(["degraded", "Degraded"], !1), f = t(["degraded_reason", "DegradedReason"], ""), g = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), y = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), b = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let I = t(["is_expired", "IsExpired"], void 0), C = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof I != "boolean" || typeof C != "boolean") && n) {
      const T = new Date(n);
      if (!Number.isNaN(T.getTime())) {
        const P = T.getTime() - Date.now(), $ = 5 * 60 * 1e3;
        I = P <= 0, C = P > 0 && P <= $;
      }
    }
    const E = typeof b == "boolean" ? b : (I === !0 || C === !0) && !y;
    return {
      connected: d,
      account_id: o,
      email: g,
      scopes: Array.isArray(i) ? i : [],
      expires_at: n,
      is_expired: I === !0,
      is_expiring_soon: C === !0,
      can_auto_refresh: y,
      needs_reauthorization: E,
      degraded: a,
      degraded_reason: f
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: i, expiryInfo: o, reauthWarning: d, reauthReason: a } = this.elements;
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
        const i = jn[n] || { label: n, description: "" };
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
  renderExpiry(e, t, n, i, o) {
    const { expiryInfo: d, reauthWarning: a, reauthReason: f } = this.elements;
    if (!d) return;
    if (d.classList.remove("text-red-600", "text-amber-600"), d.classList.add("text-gray-500"), !e) {
      d.textContent = "Access token status unknown", a && w(a);
      return;
    }
    const g = new Date(e), y = /* @__PURE__ */ new Date(), b = Math.max(
      1,
      Math.round((g.getTime() - y.getTime()) / (1e3 * 60))
    );
    t ? i ? (d.textContent = "Access token expired, but refresh is available and will be applied automatically.", d.classList.remove("text-gray-500"), d.classList.add("text-amber-600"), a && w(a)) : (d.textContent = "Access token has expired. Please re-authorize.", d.classList.remove("text-gray-500"), d.classList.add("text-red-600"), a && x(a), f && (f.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (d.classList.remove("text-gray-500"), d.classList.add("text-amber-600"), i ? (d.textContent = `Token expires in approximately ${b} minute${b !== 1 ? "s" : ""}. Refresh is available automatically.`, a && w(a)) : (d.textContent = `Token expires in approximately ${b} minute${b !== 1 ? "s" : ""}`, a && x(a), f && (f.textContent = `Your access token will expire in ${b} minute${b !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (d.textContent = `Token valid until ${g.toLocaleDateString()} ${g.toLocaleTimeString()}`, a && w(a)), !o && a && w(a);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: i } = this.elements;
    n && (e ? (x(n), i && (i.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : w(n));
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
    for (const o of this.accounts) {
      const d = this.normalizeAccountId(o.account_id);
      if (n.has(d))
        continue;
      n.add(d);
      const a = document.createElement("option");
      a.value = d;
      const f = o.email || d || "Default", g = o.status !== "connected" ? ` (${o.status})` : "";
      a.textContent = `${f}${g}`, d === this.currentAccountId && (a.selected = !0), e.appendChild(a);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const o = document.createElement("option");
      o.value = this.currentAccountId, o.textContent = `${this.currentAccountId} (new)`, o.selected = !0, e.appendChild(o);
    }
    const i = document.createElement("option");
    i.value = "__new__", i.textContent = "+ Connect New Account...", e.appendChild(i);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && w(e), this.accounts.length === 0) {
      t && x(t), n && w(n);
      return;
    }
    t && w(t), n && (x(n), n.innerHTML = this.accounts.map((i) => this.renderAccountCard(i)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
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
    }, o = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, d = t ? "ring-2 ring-blue-500" : "", a = n[e.status] || "bg-white border-gray-200", f = i[e.status] || "bg-gray-100 text-gray-700", g = o[e.status] || e.status, y = e.account_id || "default", b = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${a} ${d} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(e.account_id)}">
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
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(b)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(y)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${f}">
              ${g}
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
      i.addEventListener("click", (o) => {
        const a = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((i) => {
      i.addEventListener("click", (o) => {
        const a = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(a, !1), this.startOAuthFlow(a);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((i) => {
      i.addEventListener("click", (o) => {
        const a = o.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = a, t && x(t);
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
    const i = this.resolveOAuthRedirectURI(), o = e !== void 0 ? this.normalizeAccountId(e) : this.currentAccountId;
    this.pendingOAuthAccountId = o;
    const d = this.buildGoogleOAuthUrl(i, o);
    if (!d) {
      t && w(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const a = 500, f = 600, g = (window.screen.width - a) / 2, y = (window.screen.height - f) / 2;
    if (this.oauthWindow = window.open(
      d,
      "google_oauth",
      `width=${a},height=${f},left=${g},top=${y},popup=yes`
    ), !this.oauthWindow) {
      t && w(t), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (b) => this.handleOAuthCallback(b), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && w(t), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
    const o = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    o && n.add(o);
    for (const d of n)
      if (t === d || this.areEquivalentLoopbackOrigins(t, d))
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
    if (this.cleanupOAuthFlow(), n && w(n), this.closeOAuthWindow(), t.error) {
      this.showToast(`OAuth failed: ${t.error}`, "error"), this.announce(`OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const i = this.resolveOAuthRedirectURI(), d = (typeof t.account_id == "string" ? this.normalizeAccountId(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        d !== this.currentAccountId && this.setCurrentAccountId(d, !1);
        const a = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", d),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: d || void 0,
              redirect_uri: i
            })
          }
        );
        if (!a.ok) {
          const f = await a.json();
          throw new Error(f.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (i) {
        console.error("Connect error:", i);
        const o = i instanceof Error ? i.message : "Unknown error";
        this.showToast(`Failed to connect: ${o}`, "error"), this.announce(`Failed to connect: ${o}`);
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
    e && w(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    e && w(e);
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
function Vi(s) {
  const e = new It(s);
  return M(() => e.init()), e;
}
function Gi(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    userId: s.userId,
    googleAccountId: s.googleAccountId,
    googleRedirectUri: s.googleRedirectUri,
    googleClientId: s.googleClientId,
    googleEnabled: s.googleEnabled !== !1
  }, t = new It(e);
  M(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
const Me = "esign.google.account_id", ht = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, gt = [
  "application/vnd.google-apps.document",
  "application/pdf"
];
class Lt {
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
      importBtn: o,
      clearSelectionBtn: d,
      importCancelBtn: a,
      importConfirmBtn: f,
      importForm: g,
      importModal: y,
      viewListBtn: b,
      viewGridBtn: I
    } = this.elements;
    if (e) {
      const E = re(() => this.handleSearch(), 300);
      e.addEventListener("input", E), e.addEventListener("keydown", (T) => {
        T.key === "Enter" && (T.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.refresh()), i && i.addEventListener("click", () => this.loadMore()), o && o.addEventListener("click", () => this.showImportModal()), d && d.addEventListener("click", () => this.clearSelection()), a && a.addEventListener("click", () => this.hideImportModal()), f && g && g.addEventListener("submit", (E) => {
      E.preventDefault(), this.handleImport();
    }), y && y.addEventListener("click", (E) => {
      const T = E.target;
      (T === y || T.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), b && b.addEventListener("click", () => this.setViewMode("list")), I && I.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (E) => {
      E.key === "Escape" && y && !y.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: C } = this.elements;
    C && C.addEventListener("click", (E) => this.handleFileListClick(E));
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
        window.localStorage.getItem(Me)
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, x(e)) : w(e)), t) {
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
      this.currentAccountId ? window.localStorage.setItem(Me, this.currentAccountId) : window.localStorage.removeItem(Me);
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), i = String(e.mimeType || e.MimeType || "").trim(), o = String(e.modifiedTime || e.ModifiedTime || "").trim(), d = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), f = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : a ? [a] : [], y = Array.isArray(e.owners) ? e.owners : f ? [{ emailAddress: f }] : [];
    return {
      id: t,
      name: n,
      mimeType: i,
      modifiedTime: o,
      webViewLink: d,
      parents: g,
      owners: y,
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
      let o;
      this.searchQuery ? o = this.buildScopedAPIURL(
        `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
      ) : o = this.buildScopedAPIURL(
        `/esign/integrations/google/files?folder_id=${encodeURIComponent(i.id)}`
      ), this.nextPageToken && (o += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const d = await fetch(o, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!d.ok)
        throw new Error(`Failed to load files: ${d.status}`);
      const a = await d.json(), f = Array.isArray(a.files) ? a.files.map((g) => this.normalizeDriveFile(g)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...f] : this.currentFiles = f, this.nextPageToken = a.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), H(
        this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`
      );
    } catch (i) {
      console.error("Error loading files:", i), this.renderError(i instanceof Error ? i.message : "Failed to load files"), H("Error loading files");
    } finally {
      this.isLoading = !1, t && w(t);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (!e) return;
    if (t && w(t), this.currentFiles.length === 0) {
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
    const t = e.mimeType === "application/vnd.google-apps.folder", n = gt.includes(e.mimeType), i = this.selectedFile?.id === e.id, o = ht[e.mimeType] || ht.default, d = this.getFileIcon(o);
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
          ${d}
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
    const i = n.dataset.fileId, o = n.dataset.isFolder === "true";
    i && (o ? this.navigateToFolder(i) : this.selectFile(i));
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
      previewType: o,
      previewFileId: d,
      previewOwner: a,
      previewModified: f,
      importBtn: g,
      openInGoogleBtn: y
    } = this.elements;
    if (!this.selectedFile) {
      e && x(e), t && w(t);
      return;
    }
    e && w(e), t && x(t);
    const b = this.selectedFile, I = gt.includes(b.mimeType);
    i && (i.textContent = b.name), o && (o.textContent = this.getMimeTypeLabel(b.mimeType)), d && (d.textContent = b.id), a && b.owners.length > 0 && (a.textContent = b.owners[0].emailAddress || "-"), f && (f.textContent = X(b.modifiedTime)), g && (I ? (g.removeAttribute("disabled"), g.classList.remove("opacity-50", "cursor-not-allowed")) : (g.setAttribute("disabled", "true"), g.classList.add("opacity-50", "cursor-not-allowed"))), y && b.webViewLink && (y.href = b.webViewLink);
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
      w(e), t && (t.textContent = "Search Results");
      return;
    }
    x(e);
    const n = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = n.name);
    const i = e.querySelector("ol");
    i && (i.innerHTML = this.currentFolderPath.map(
      (o, d) => `
        <li class="flex items-center">
          ${d > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(o.id)}"
            data-folder-index="${d}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(o.name)}
          </button>
        </li>
      `
    ).join(""), W(".breadcrumb-item", i).forEach((o) => {
      o.addEventListener("click", () => {
        const d = parseInt(o.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(d);
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
    e && (this.nextPageToken ? x(e) : w(e));
  }
  /**
   * Handle search
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const n = e.value.trim();
    this.searchQuery = n, t && (n ? x(t) : w(t)), this.clearSelection(), this.loadFiles();
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && w(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
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
      const o = this.selectedFile.name.replace(/\.[^/.]+$/, "");
      n.value = o;
    }
    i && (i.value = ""), e && x(e);
  }
  /**
   * Hide import modal
   */
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && w(e);
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
      importAgreementTitle: o
    } = this.elements, d = this.selectedFile.id, a = i?.value.trim() || this.selectedFile.name, f = o?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && x(t), n && (n.textContent = "Importing...");
    try {
      const g = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: d,
          document_title: a,
          agreement_title: f || void 0
        })
      });
      if (!g.ok) {
        const b = await g.json();
        throw new Error(b.error?.message || "Import failed");
      }
      const y = await g.json();
      this.showToast("Import started successfully", "success"), H("Import started"), this.hideImportModal(), y.document?.id && this.config.pickerRoutes?.documents ? window.location.href = `${this.config.pickerRoutes.documents}/${y.document.id}` : y.agreement?.id && this.config.pickerRoutes?.agreements && (window.location.href = `${this.config.pickerRoutes.agreements}/${y.agreement.id}`);
    } catch (g) {
      console.error("Import error:", g);
      const y = g instanceof Error ? g.message : "Import failed";
      this.showToast(y, "error"), H(`Error: ${y}`);
    } finally {
      e && e.removeAttribute("disabled"), t && w(t), n && (n.textContent = "Import");
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
function Wi(s) {
  const e = new Lt(s);
  return M(() => e.init()), e;
}
function Ji(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    userId: s.userId,
    googleAccountId: s.googleAccountId,
    googleConnected: s.googleConnected !== !1,
    pickerRoutes: s.pickerRoutes
  }, t = new Lt(e);
  M(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
class At {
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
      const o = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      o.searchParams.set("range", n), i && o.searchParams.set("provider", i);
      const d = await fetch(o.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!d.ok)
        this.healthData = this.generateMockHealthData(n, i);
      else {
        const a = await d.json();
        this.healthData = a;
      }
      this.renderHealthData(), H("Health data refreshed");
    } catch (o) {
      console.error("Failed to load health data:", o), this.healthData = this.generateMockHealthData(n, i), this.renderHealthData();
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
      providerHealth: (t ? [t] : ["salesforce", "hubspot", "bamboohr", "workday"]).map((d) => ({
        provider: d,
        status: d === "workday" ? "degraded" : "healthy",
        successRate: d === "workday" ? 89.2 : 97 + Math.random() * 3,
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
    for (let o = 0; o < e; o++) {
      const d = n[Math.floor(Math.random() * n.length)], a = i[Math.floor(Math.random() * i.length)];
      t.push({
        type: d,
        provider: a,
        message: this.getActivityMessage(d, a),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: d.includes("failed") || d.includes("created") ? "warning" : "success"
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
    const n = [], i = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, o = /* @__PURE__ */ new Date();
    for (let d = e - 1; d >= 0; d--) {
      const a = new Date(o.getTime() - d * 36e5);
      n.push(
        a.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
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
      const o = i.healthTrend >= 0 ? "+" : "";
      n.textContent = `${o}${i.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: n, syncSuccessBar: i } = this.elements, o = this.healthData.syncStats;
    e && (e.textContent = `${o.successRate.toFixed(1)}%`), t && (t.textContent = `${o.succeeded} succeeded`), n && (n.textContent = `${o.failed} failed`), i && (i.style.width = `${o.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: n, conflictTrend: i } = this.elements, o = this.healthData.conflictStats;
    if (e && (e.textContent = String(o.pending)), t && (t.textContent = `${o.pending} pending`), n && (n.textContent = `${o.resolvedToday} resolved today`), i) {
      const d = o.trend >= 0 ? "+" : "";
      i.textContent = `${d}${o.trend} from previous period`;
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
    const { retryTotal: e, retryRecovery: t, retryAvg: n, retryList: i } = this.elements, o = this.healthData.retryStats;
    e && (e.textContent = String(o.total)), t && (t.textContent = `${o.recoveryRate}%`), n && (n.textContent = o.avgAttempts.toFixed(1)), i && (i.innerHTML = o.recent.map(
      (d) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(d.provider)} / ${this.escapeHtml(d.entity)}</span>
            <span class="${d.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${this.escapeHtml(d.time)}</span>
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
      i.addEventListener("click", (o) => this.dismissAlert(o));
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
    const { alertsList: i, noAlerts: o, alertCount: d } = this.elements, a = i?.querySelectorAll(":scope > div").length || 0;
    d && (d.textContent = `${a} active`, a === 0 && (d.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", i && i.classList.add("hidden"), o && o.classList.remove("hidden")));
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
    const o = document.getElementById(e);
    if (!o) return;
    const d = o.getContext("2d");
    if (!d) return;
    const a = o.width, f = o.height, g = 40, y = a - g * 2, b = f - g * 2;
    d.clearRect(0, 0, a, f);
    const I = t.labels, C = Object.values(t.datasets), E = y / I.length / (C.length + 1), T = Math.max(...C.flat()) || 1;
    I.forEach((P, $) => {
      const B = g + $ * y / I.length + E / 2;
      C.forEach((F, O) => {
        const U = F[$] / T * b, ae = B + O * E, J = f - g - U;
        d.fillStyle = n[O] || "#6b7280", d.fillRect(ae, J, E - 2, U);
      }), $ % Math.ceil(I.length / 6) === 0 && (d.fillStyle = "#6b7280", d.font = "10px sans-serif", d.textAlign = "center", d.fillText(P, B + C.length * E / 2, f - g + 15));
    }), d.fillStyle = "#6b7280", d.font = "10px sans-serif", d.textAlign = "right";
    for (let P = 0; P <= 4; P++) {
      const $ = f - g - P * b / 4, B = Math.round(T * P / 4);
      d.fillText(B.toString(), g - 5, $ + 3);
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
function Yi(s) {
  const e = new At(s);
  return M(() => e.init()), e;
}
function Ki(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`,
    autoRefreshInterval: s.autoRefreshInterval || 3e4
  }, t = new At(e);
  M(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
class kt {
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
      refreshBtn: o,
      retryBtn: d,
      addFieldBtn: a,
      addRuleBtn: f,
      validateBtn: g,
      mappingForm: y,
      publishCancelBtn: b,
      publishConfirmBtn: I,
      deleteCancelBtn: C,
      deleteConfirmBtn: E,
      closePreviewBtn: T,
      loadSampleBtn: P,
      runPreviewBtn: $,
      clearPreviewBtn: B,
      previewSourceInput: F,
      searchInput: O,
      filterStatus: U,
      filterProvider: ae,
      mappingModal: J,
      publishModal: Z,
      deleteModal: ee,
      previewModal: te
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), n?.addEventListener("click", () => this.closeModal()), i?.addEventListener("click", () => this.closeModal()), o?.addEventListener("click", () => this.loadMappings()), d?.addEventListener("click", () => this.loadMappings()), a?.addEventListener("click", () => this.addSchemaField()), f?.addEventListener("click", () => this.addMappingRule()), g?.addEventListener("click", () => this.validateMapping()), y?.addEventListener("submit", (z) => {
      z.preventDefault(), this.saveMapping();
    }), b?.addEventListener("click", () => this.closePublishModal()), I?.addEventListener("click", () => this.publishMapping()), C?.addEventListener("click", () => this.closeDeleteModal()), E?.addEventListener("click", () => this.deleteMapping()), T?.addEventListener("click", () => this.closePreviewModal()), P?.addEventListener("click", () => this.loadSamplePayload()), $?.addEventListener("click", () => this.runPreviewTransform()), B?.addEventListener("click", () => this.clearPreview()), F?.addEventListener("input", re(() => this.validateSourceJson(), 300)), O?.addEventListener("input", re(() => this.renderMappings(), 300)), U?.addEventListener("change", () => this.renderMappings()), ae?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (z) => {
      z.key === "Escape" && (J && !J.classList.contains("hidden") && this.closeModal(), Z && !Z.classList.contains("hidden") && this.closePublishModal(), ee && !ee.classList.contains("hidden") && this.closeDeleteModal(), te && !te.classList.contains("hidden") && this.closePreviewModal());
    }), [J, Z, ee, te].forEach((z) => {
      z?.addEventListener("click", (ye) => {
        const le = ye.target;
        (le === z || le.getAttribute("aria-hidden") === "true") && (z === J ? this.closeModal() : z === Z ? this.closePublishModal() : z === ee ? this.closeDeleteModal() : z === te && this.closePreviewModal());
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
    const { loadingState: t, emptyState: n, errorState: i, mappingsList: o } = this.elements;
    switch (w(t), w(n), w(i), w(o), e) {
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
        x(o);
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
    const o = (t?.value || "").toLowerCase(), d = n?.value || "", a = i?.value || "", f = this.mappings.filter((g) => !(o && !g.name.toLowerCase().includes(o) && !g.provider.toLowerCase().includes(o) || d && g.status !== d || a && g.provider !== a));
    if (f.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = f.map(
      (g) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(g.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(g.compiled_hash ? g.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(g.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(g.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${g.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(g.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(g.id)}" aria-label="Preview ${this.escapeHtml(g.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(g.id)}" aria-label="Edit ${this.escapeHtml(g.name)}">
              Edit
            </button>
            ${g.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(g.id)}" aria-label="Publish ${this.escapeHtml(g.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(g.id)}" aria-label="Delete ${this.escapeHtml(g.name)}">
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
      schemaObjectTypeInput: o,
      schemaVersionInput: d,
      schemaFieldsContainer: a,
      mappingRulesContainer: f
    } = this.elements, g = [];
    a?.querySelectorAll(".schema-field-row").forEach((b) => {
      g.push({
        object: (b.querySelector(".field-object")?.value || "").trim(),
        field: (b.querySelector(".field-name")?.value || "").trim(),
        type: b.querySelector(".field-type")?.value || "string",
        required: b.querySelector(".field-required")?.checked || !1
      });
    });
    const y = [];
    return f?.querySelectorAll(".mapping-rule-row").forEach((b) => {
      y.push({
        source_object: (b.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (b.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: b.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (b.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: n?.value.trim() || "",
      provider: i?.value.trim() || "",
      external_schema: {
        object_type: o?.value.trim() || "",
        version: d?.value.trim() || void 0,
        fields: g
      },
      rules: y
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
      mappingProviderInput: o,
      schemaObjectTypeInput: d,
      schemaVersionInput: a,
      schemaFieldsContainer: f,
      mappingRulesContainer: g,
      mappingStatusBadge: y,
      formValidationStatus: b
    } = this.elements;
    t && (t.value = e.id || ""), n && (n.value = String(e.version || 0)), i && (i.value = e.name || ""), o && (o.value = e.provider || "");
    const I = e.external_schema || { object_type: "", fields: [] };
    d && (d.value = I.object_type || ""), a && (a.value = I.version || ""), f && (f.innerHTML = "", (I.fields || []).forEach((C) => f.appendChild(this.createSchemaFieldRow(C)))), g && (g.innerHTML = "", (e.rules || []).forEach((C) => g.appendChild(this.createMappingRuleRow(C)))), e.status && y ? (y.innerHTML = this.getStatusBadge(e.status), y.classList.remove("hidden")) : y && y.classList.add("hidden"), w(b);
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
      mappingRulesContainer: o,
      mappingStatusBadge: d,
      formValidationStatus: a
    } = this.elements;
    e?.reset(), t && (t.value = ""), n && (n.value = "0"), i && (i.innerHTML = ""), o && (o.innerHTML = ""), d && d.classList.add("hidden"), w(a), this.editingMappingId = null;
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
    const t = this.mappings.find((d) => d.id === e);
    if (!t) return;
    const { mappingModal: n, mappingModalTitle: i, mappingNameInput: o } = this.elements;
    this.editingMappingId = e, i && (i.textContent = "Edit Mapping Specification"), this.populateForm(t), x(n), o?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    w(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((d) => d.id === e);
    if (!t) return;
    const { publishModal: n, publishMappingName: i, publishMappingVersion: o } = this.elements;
    this.pendingPublishId = e, i && (i.textContent = t.name), o && (o.textContent = `v${t.version || 1}`), x(n);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    w(this.elements.publishModal), this.pendingPublishId = null;
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
    w(this.elements.deleteModal), this.pendingDeleteId = null;
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
      }), o = await i.json();
      if (i.ok && o.status === "ok")
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${this.escapeHtml((o.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation passed");
      else {
        const d = o.errors || [o.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${d.map((a) => `<li>${this.escapeHtml(a)}</li>`).join("")}</ul>
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
      const n = !!t.id, i = n ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, d = await fetch(i, {
        method: n ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!d.ok) {
        const a = await d.json();
        throw new Error(a.error?.message || `HTTP ${d.status}`);
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
    const t = this.mappings.find((y) => y.id === e);
    if (!t) return;
    const {
      previewModal: n,
      previewMappingName: i,
      previewMappingProvider: o,
      previewObjectType: d,
      previewMappingStatus: a,
      previewSourceInput: f,
      sourceSyntaxError: g
    } = this.elements;
    this.currentPreviewMapping = t, i && (i.textContent = t.name), o && (o.textContent = t.provider), d && (d.textContent = t.external_schema?.object_type || "-"), a && (a.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), f && (f.value = ""), w(g), x(n), f?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    w(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: n, previewError: i, previewSuccess: o } = this.elements;
    switch (w(t), w(n), w(i), w(o), e) {
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
        x(o);
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, i = n.object_type || "data", o = n.fields || [], d = {}, a = {};
    o.forEach((f) => {
      const g = f.field || "field";
      switch (f.type) {
        case "string":
          a[g] = g === "email" ? "john.doe@example.com" : g === "name" ? "John Doe" : `sample_${g}`;
          break;
        case "number":
          a[g] = 123;
          break;
        case "boolean":
          a[g] = !0;
          break;
        case "date":
          a[g] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          a[g] = `sample_${g}`;
      }
    }), d[i] = a, e && (e.value = JSON.stringify(d, null, 2)), w(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, n = e?.value.trim() || "";
    if (!n)
      return w(t), null;
    try {
      const i = JSON.parse(n);
      return w(t), i;
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
    }, o = {}, d = {}, a = [];
    return n.forEach((f) => {
      const g = this.resolveSourceValue(e, f.source_object, f.source_field), y = g !== void 0;
      if (i.matched_rules.push({
        source: f.source_field,
        matched: y,
        value: g
      }), !!y)
        switch (f.target_entity) {
          case "participant":
            o[f.target_path] = g;
            break;
          case "agreement":
            d[f.target_path] = g;
            break;
          case "field_definition":
            a.push({ path: f.target_path, value: g });
            break;
        }
    }), Object.keys(o).length > 0 && i.participants.push({
      ...o,
      role: o.role || "signer",
      signing_stage: o.signing_stage || 1
    }), i.agreement = d, i.field_definitions = a, i;
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
          const o = e[i];
          if (n in o)
            return o[n];
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
      fieldsCount: o,
      previewMetadata: d,
      previewRawJson: a,
      previewRulesTbody: f
    } = this.elements, g = e.participants || [];
    n && (n.textContent = `(${g.length})`), t && (g.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = g.map(
      (C) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(C.name || C.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(C.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(C.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(C.role))}</span>
              <span class="text-xs text-gray-500">Stage ${C.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const y = e.field_definitions || [];
    o && (o.textContent = `(${y.length})`), i && (y.length === 0 ? i.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : i.innerHTML = y.map(
      (C) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(C.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(C.value))}</span>
          </div>
        `
    ).join(""));
    const b = e.agreement || {}, I = Object.entries(b);
    d && (I.length === 0 ? d.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : d.innerHTML = I.map(
      ([C, E]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(C)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(E))}</span>
          </div>
        `
    ).join("")), a && (a.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((C) => {
      const E = f?.querySelector(`[data-rule-source="${this.escapeHtml(C.source)}"] span`);
      E && (C.matched ? (E.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", E.textContent = "Matched") : (E.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", E.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), w(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const i = window.toastManager;
    i && (t === "success" ? i.success(e) : i.error(e));
  }
}
function Qi(s) {
  const e = new kt(s);
  return M(() => e.init()), e;
}
function Xi(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new kt(e);
  M(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
class Pt {
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
      filterProvider: o,
      filterEntity: d,
      actionResolveBtn: a,
      actionIgnoreBtn: f,
      cancelResolveBtn: g,
      resolveForm: y,
      conflictDetailModal: b,
      resolveModal: I
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), i?.addEventListener("change", () => this.loadConflicts()), o?.addEventListener("change", () => this.renderConflicts()), d?.addEventListener("change", () => this.renderConflicts()), a?.addEventListener("click", () => this.openResolveModal("resolved")), f?.addEventListener("click", () => this.openResolveModal("ignored")), g?.addEventListener("click", () => this.closeResolveModal()), y?.addEventListener("submit", (C) => this.submitResolution(C)), document.addEventListener("keydown", (C) => {
      C.key === "Escape" && (I && !I.classList.contains("hidden") ? this.closeResolveModal() : b && !b.classList.contains("hidden") && this.closeConflictDetail());
    }), [b, I].forEach((C) => {
      C?.addEventListener("click", (E) => {
        const T = E.target;
        (T === C || T.getAttribute("aria-hidden") === "true") && (C === b ? this.closeConflictDetail() : C === I && this.closeResolveModal());
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
    const { loadingState: t, emptyState: n, errorState: i, conflictsList: o } = this.elements;
    switch (w(t), w(n), w(i), w(o), e) {
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
        x(o);
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
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, i = this.conflicts.filter((a) => a.status === "pending").length, o = this.conflicts.filter((a) => a.status === "resolved").length, d = this.conflicts.filter((a) => a.status === "ignored").length;
    e && (e.textContent = String(i)), t && (t.textContent = String(o)), n && (n.textContent = String(d));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: i } = this.elements;
    if (!e) return;
    const o = t?.value || "", d = n?.value || "", a = i?.value || "", f = this.conflicts.filter((g) => !(o && g.status !== o || d && g.provider !== d || a && g.entity_kind !== a));
    if (f.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = f.map(
      (g) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(g.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${g.status === "pending" ? "bg-amber-100" : g.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${g.status === "pending" ? "text-amber-600" : g.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(g.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(g.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(g.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((g.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(g.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(g.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((g) => {
      g.addEventListener("click", () => this.openConflictDetail(g.dataset.id || ""));
    });
  }
  /**
   * Open conflict detail modal
   */
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find((U) => U.id === e);
    if (!t) return;
    const {
      conflictDetailModal: n,
      detailReason: i,
      detailEntityType: o,
      detailStatusBadge: d,
      detailProvider: a,
      detailExternalId: f,
      detailInternalId: g,
      detailBindingId: y,
      detailConflictId: b,
      detailRunId: I,
      detailCreatedAt: C,
      detailVersion: E,
      detailPayload: T,
      resolutionSection: P,
      actionButtons: $,
      detailResolvedAt: B,
      detailResolvedBy: F,
      detailResolution: O
    } = this.elements;
    if (i && (i.textContent = t.reason || "Data conflict"), o && (o.textContent = t.entity_kind || "-"), d && (d.innerHTML = this.getStatusBadge(t.status)), a && (a.textContent = t.provider || "-"), f && (f.textContent = t.external_id || "-"), g && (g.textContent = t.internal_id || "-"), y && (y.textContent = t.binding_id || "-"), b && (b.textContent = t.id), I && (I.textContent = t.run_id || "-"), C && (C.textContent = this.formatDate(t.created_at)), E && (E.textContent = String(t.version || 1)), T)
      try {
        const U = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        T.textContent = JSON.stringify(U, null, 2);
      } catch {
        T.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (x(P), w($), B && (B.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), F && (F.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), O)
        try {
          const U = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          O.textContent = JSON.stringify(U, null, 2);
        } catch {
          O.textContent = t.resolution_json || "{}";
        }
    } else
      w(P), x($);
    x(n);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    w(this.elements.conflictDetailModal), this.currentConflictId = null;
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
    w(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const i = new FormData(t);
    let o = {};
    const d = i.get("resolution");
    if (d)
      try {
        o = JSON.parse(d);
      } catch {
        o = { raw: d };
      }
    const a = i.get("notes");
    a && (o.notes = a);
    const f = {
      status: i.get("status"),
      resolution: o
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const g = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(f)
      });
      if (!g.ok) {
        const y = await g.json();
        throw new Error(y.error?.message || `HTTP ${g.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (g) {
      console.error("Resolution error:", g);
      const y = g instanceof Error ? g.message : "Unknown error";
      this.showToast(`Failed: ${y}`, "error");
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
function Zi(s) {
  const e = new Pt(s);
  return M(() => e.init()), e;
}
function es(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new Pt(e);
  M(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
class Tt {
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
      refreshBtn: o,
      retryBtn: d,
      closeDetailBtn: a,
      filterProvider: f,
      filterStatus: g,
      filterDirection: y,
      actionResumeBtn: b,
      actionRetryBtn: I,
      actionCompleteBtn: C,
      actionFailBtn: E,
      actionDiagnosticsBtn: T,
      startSyncModal: P,
      runDetailModal: $
    } = this.elements;
    e?.addEventListener("click", () => this.openStartSyncModal()), t?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), i?.addEventListener("submit", (B) => this.startSync(B)), o?.addEventListener("click", () => this.loadSyncRuns()), d?.addEventListener("click", () => this.loadSyncRuns()), a?.addEventListener("click", () => this.closeRunDetail()), f?.addEventListener("change", () => this.renderTimeline()), g?.addEventListener("change", () => this.renderTimeline()), y?.addEventListener("change", () => this.renderTimeline()), b?.addEventListener("click", () => this.runAction("resume")), I?.addEventListener("click", () => this.runAction("resume")), C?.addEventListener("click", () => this.runAction("complete")), E?.addEventListener("click", () => this.runAction("fail")), T?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (B) => {
      B.key === "Escape" && (P && !P.classList.contains("hidden") && this.closeStartSyncModal(), $ && !$.classList.contains("hidden") && this.closeRunDetail());
    }), [P, $].forEach((B) => {
      B?.addEventListener("click", (F) => {
        const O = F.target;
        (O === B || O.getAttribute("aria-hidden") === "true") && (B === P ? this.closeStartSyncModal() : B === $ && this.closeRunDetail());
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
    const { loadingState: t, emptyState: n, errorState: i, runsTimeline: o } = this.elements;
    switch (w(t), w(n), w(i), w(o), e) {
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
        x(o);
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
    const { statTotal: e, statRunning: t, statCompleted: n, statFailed: i } = this.elements, o = this.syncRuns.length, d = this.syncRuns.filter(
      (g) => g.status === "running" || g.status === "pending"
    ).length, a = this.syncRuns.filter((g) => g.status === "completed").length, f = this.syncRuns.filter((g) => g.status === "failed").length;
    e && (e.textContent = String(o)), t && (t.textContent = String(d)), n && (n.textContent = String(a)), i && (i.textContent = String(f));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: e, filterStatus: t, filterDirection: n } = this.elements;
    if (!e) return;
    const i = t?.value || "", o = n?.value || "", d = this.syncRuns.filter((a) => !(i && a.status !== i || o && a.direction !== o));
    if (d.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = d.map(
      (a) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${this.escapeHtml(a.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${a.status === "running" ? "bg-blue-100" : a.status === "completed" ? "bg-green-100" : a.status === "failed" ? "bg-red-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${a.status === "running" ? "text-blue-600 animate-spin" : a.status === "completed" ? "text-green-600" : a.status === "failed" ? "text-red-600" : "text-gray-400"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">${this.escapeHtml(a.provider)}</span>
                  ${this.getDirectionBadge(a.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${this.escapeHtml(a.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(a.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(a.started_at)}</p>
            </div>
          </div>

          ${a.cursor ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${this.escapeHtml(a.cursor)}</span></p>
            </div>
          ` : ""}

          ${a.last_error ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${this.escapeHtml(a.last_error)}</p>
            </div>
          ` : ""}
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".sync-run-card").forEach((a) => {
      a.addEventListener("click", () => this.openRunDetail(a.dataset.id || ""));
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
    w(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(e) {
    e.preventDefault();
    const { startSyncForm: t, submitSyncBtn: n } = this.elements;
    if (!t || !n) return;
    const i = new FormData(t), o = {
      provider: i.get("provider"),
      direction: i.get("direction"),
      mapping_spec_id: i.get("mapping_spec_id"),
      cursor: i.get("cursor") || void 0
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...';
    try {
      const d = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(o)
      });
      if (!d.ok) {
        const a = await d.json();
        throw new Error(a.error?.message || `HTTP ${d.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (d) {
      console.error("Start sync error:", d);
      const a = d instanceof Error ? d.message : "Unknown error";
      this.showToast(`Failed to start: ${a}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync';
    }
  }
  /**
   * Open run detail modal
   */
  async openRunDetail(e) {
    this.currentRunId = e;
    const t = this.syncRuns.find((F) => F.id === e);
    if (!t) return;
    const {
      runDetailModal: n,
      detailRunId: i,
      detailProvider: o,
      detailDirection: d,
      detailStatus: a,
      detailStarted: f,
      detailCompleted: g,
      detailCursor: y,
      detailAttempt: b,
      detailErrorSection: I,
      detailLastError: C,
      detailCheckpoints: E,
      actionResumeBtn: T,
      actionRetryBtn: P,
      actionCompleteBtn: $,
      actionFailBtn: B
    } = this.elements;
    i && (i.textContent = t.id), o && (o.textContent = t.provider), d && (d.textContent = t.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), a && (a.innerHTML = this.getStatusBadge(t.status)), f && (f.textContent = this.formatDate(t.started_at)), g && (g.textContent = t.completed_at ? this.formatDate(t.completed_at) : "-"), y && (y.textContent = t.cursor || "-"), b && (b.textContent = String(t.attempt_count || 1)), t.last_error ? (C && (C.textContent = t.last_error), x(I)) : w(I), T && T.classList.toggle("hidden", t.status !== "running"), P && P.classList.toggle("hidden", t.status !== "failed"), $ && $.classList.toggle("hidden", t.status !== "running"), B && B.classList.toggle("hidden", t.status !== "running"), E && (E.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), x(n);
    try {
      const F = await fetch(`${this.syncRunsEndpoint}/${e}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (F.ok) {
        const O = await F.json();
        this.renderCheckpoints(O.checkpoints || []);
      } else
        E && (E.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (F) {
      console.error("Error loading checkpoints:", F), E && (E.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
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
    w(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(e) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: t, actionRetryBtn: n, actionCompleteBtn: i, actionFailBtn: o } = this.elements, d = e === "resume" ? t : e === "complete" ? i : o, a = e === "resume" ? n : null;
    if (!d) return;
    d.setAttribute("disabled", "true"), a?.setAttribute("disabled", "true");
    const f = d.innerHTML;
    d.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const g = `${this.syncRunsEndpoint}/${this.currentRunId}/${e}`, y = await fetch(g, {
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
      if (!y.ok) {
        const b = await y.json();
        throw new Error(b.error?.message || `HTTP ${y.status}`);
      }
      this.showToast(`Sync run ${e} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (g) {
      console.error(`${e} error:`, g);
      const y = g instanceof Error ? g.message : "Unknown error";
      this.showToast(`Failed: ${y}`, "error");
    } finally {
      d.removeAttribute("disabled"), a?.removeAttribute("disabled"), d.innerHTML = f;
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
function ts(s) {
  const e = new Tt(s);
  return M(() => e.init()), e;
}
function ns(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api`
  }, t = new Tt(e);
  M(() => t.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = t);
}
const De = "esign.google.account_id", On = 25 * 1024 * 1024, zn = 2e3, mt = 60, Re = "application/vnd.google-apps.document", He = "application/pdf", ft = "application/vnd.google-apps.folder", Un = [Re, He];
class ze {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || On, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      titleInput: o
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), i && i.addEventListener("click", (d) => {
      d.preventDefault(), d.stopPropagation(), this.clearFileSelection();
    }), o && o.addEventListener("input", () => this.updateSubmitState()), n && (["dragenter", "dragover"].forEach((d) => {
      n.addEventListener(d, (a) => {
        a.preventDefault(), a.stopPropagation(), n.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((d) => {
      n.addEventListener(d, (a) => {
        a.preventDefault(), a.stopPropagation(), n.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), n.addEventListener("drop", (d) => {
      const a = d.dataTransfer;
      a?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = a.files, this.handleFileSelect());
    }), n.addEventListener("keydown", (d) => {
      (d.key === "Enter" || d.key === " ") && (d.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (d) => this.handleFormSubmit(d));
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
      clearSelectionBtn: o,
      importBtn: d,
      importRetryBtn: a,
      driveAccountDropdown: f
    } = this.elements;
    if (e) {
      const g = re(() => this.handleSearch(), 300);
      e.addEventListener("input", g);
    }
    t && t.addEventListener("click", () => this.clearSearch()), n && n.addEventListener("click", () => this.loadMoreFiles()), i && i.addEventListener("click", () => this.refreshFiles()), f && f.addEventListener("change", () => {
      this.setCurrentAccountId(f.value, this.currentSource === "google");
    }), o && o.addEventListener("click", () => this.clearFileSelection()), d && d.addEventListener("click", () => this.startImport()), a && a.addEventListener("click", () => {
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
        window.localStorage.getItem(De)
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
      const { searchInput: i, clearSearchBtn: o } = this.elements;
      i && (i.value = ""), o && w(o), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
      const o = this.normalizeAccountId(i?.account_id);
      if (n.has(o))
        continue;
      n.add(o);
      const d = document.createElement("option");
      d.value = o;
      const a = String(i?.email || "").trim(), f = String(i?.status || "").trim(), g = a || o || "Default account";
      d.textContent = f && f !== "connected" ? `${g} (${f})` : g, o === this.currentAccountId && (d.selected = !0), e.appendChild(d);
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
      this.currentAccountId ? window.localStorage.setItem(De, this.currentAccountId) : window.localStorage.removeItem(De);
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
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, x(e)) : w(e)), t) {
      const i = t.dataset.baseHref || t.getAttribute("href");
      i && t.setAttribute("href", this.applyAccountIdToPath(i));
    }
    n && (Array.from(n.options).some(
      (o) => this.normalizeAccountId(o.value) === this.currentAccountId
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
      n.id.replace("panel-", "") === e ? x(n) : w(n);
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
        const o = i.name.replace(/\.pdf$/i, "");
        t.value = o;
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
      `File is too large (${fe(e.size)}). Maximum size is ${fe(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: n, fileName: i, fileSize: o, uploadZone: d } = this.elements;
    i && (i.textContent = e.name), o && (o.textContent = fe(e.size)), t && w(t), n && x(n), d && (d.classList.remove("border-gray-300"), d.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: n } = this.elements;
    e && x(e), t && w(t), n && (n.classList.add("border-gray-300"), n.classList.remove("border-green-400", "bg-green-50"));
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
    e && (e.textContent = "", w(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: n } = this.elements, i = e?.files && e.files.length > 0, o = t?.value.trim().length ?? !1, d = i && o;
    n && (n.disabled = !d, n.setAttribute("aria-disabled", String(!d)));
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
    const t = new URLSearchParams(window.location.search), n = t.get("tenant_id"), i = t.get("org_id"), o = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    n && o.searchParams.set("tenant_id", n), i && o.searchParams.set("org_id", i);
    const d = new FormData();
    d.append("file", e);
    const a = await fetch(o.toString(), {
      method: "POST",
      body: d,
      credentials: "same-origin"
    }), f = await a.json().catch(() => ({}));
    if (!a.ok) {
      const y = f?.error?.message || f?.message || "Upload failed. Please try again.";
      throw new Error(y);
    }
    const g = f?.object_key ? String(f.object_key).trim() : "";
    if (!g)
      throw new Error("Upload failed: missing source object key.");
    return g;
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: n, sourceObjectKeyInput: i } = this.elements, o = t?.files?.[0];
    if (!(!o || !this.validateFile(o))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const d = await this.uploadSourcePDF(o);
        i && (i.value = d), n?.submit();
      } catch (d) {
        const a = d instanceof Error ? d.message : "Upload failed. Please try again.";
        this.showError(a), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
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
    const t = String(e.id || e.ID || "").trim(), n = String(e.name || e.Name || "").trim(), i = String(e.mimeType || e.MimeType || "").trim(), o = String(e.modifiedTime || e.ModifiedTime || "").trim(), d = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), a = String(e.parentId || e.ParentID || "").trim(), f = String(e.ownerEmail || e.OwnerEmail || "").trim(), g = Array.isArray(e.parents) ? e.parents : a ? [a] : [], y = Array.isArray(e.owners) ? e.owners : f ? [{ emailAddress: f }] : [];
    return {
      id: t,
      name: n,
      mimeType: i,
      modifiedTime: o,
      webViewLink: d,
      parents: g,
      owners: y
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === Re;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === He;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === ft;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return Un.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === Re ? "Google Document" : t === He ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === ft ? "Folder" : "File";
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
    const { folderId: t, query: n, pageToken: i, append: o } = e, { fileList: d } = this.elements;
    !o && d && (d.innerHTML = `
        <div class="p-8 text-center">
          <svg class="animate-spin h-8 w-8 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-500">Loading files...</p>
        </div>
      `);
    try {
      let a;
      n ? (a = this.buildScopedAPIURL("/esign/google-drive/search"), a.searchParams.set("q", n), a.searchParams.set("page_size", "20"), i && a.searchParams.set("page_token", i)) : (a = this.buildScopedAPIURL("/esign/google-drive/browse"), a.searchParams.set("page_size", "20"), t && t !== "root" && a.searchParams.set("folder_id", t), i && a.searchParams.set("page_token", i));
      const f = await fetch(a.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), g = await f.json();
      if (!f.ok)
        throw new Error(g.error?.message || "Failed to load files");
      const y = Array.isArray(g.files) ? g.files.map((E) => this.normalizeDriveFile(E)) : [];
      this.nextPageToken = g.next_page_token || null, o ? this.currentFiles = [...this.currentFiles, ...y] : this.currentFiles = y, this.renderFiles(o);
      const { resultCount: b, listTitle: I } = this.elements;
      n && b ? (b.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, I && (I.textContent = "Search Results")) : (b && (b.textContent = ""), I && (I.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: C } = this.elements;
      C && (this.nextPageToken ? x(C) : w(C)), H(`Loaded ${y.length} files`);
    } catch (a) {
      console.error("Error loading files:", a), d && (d.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${this.escapeHtml(a instanceof Error ? a.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), H(`Error: ${a instanceof Error ? a.message : "Unknown error"}`);
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
    const n = this.currentFiles.map((i, o) => {
      const d = this.getFileIcon(i), a = this.isImportable(i), f = this.isFolder(i), g = this.selectedFile && this.selectedFile.id === i.id, y = !a && !f;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${g ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${y ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${g}"
          data-file-index="${o}"
          ${y ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${d.bg} flex items-center justify-center flex-shrink-0 ${d.text}">
            ${d.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(i.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(i.mimeType)}
              ${i.modifiedTime ? " • " + X(i.modifiedTime) : ""}
              ${y ? " • Not importable" : ""}
            </p>
          </div>
          ${f ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", n) : t.innerHTML = n, t.querySelectorAll(".file-item").forEach((i) => {
      i.addEventListener("click", () => {
        const o = parseInt(i.dataset.fileIndex || "0", 10), d = this.currentFiles[o];
        this.isFolder(d) ? this.navigateToFolder(d) : this.isImportable(d) && this.selectFile(d);
      });
    });
  }
  /**
   * Navigate to folder
   */
  navigateToFolder(e) {
    this.currentFolderPath.push({ id: e.id, name: e.name }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: n } = this.elements;
    t && (t.value = ""), n && w(n), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      w(e);
      return;
    }
    x(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((n, i) => {
      const o = i === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${i > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${i}" class="breadcrumb-item ${o ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(n.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((n) => {
      n.addEventListener("click", () => {
        const i = parseInt(n.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, i + 1), this.updateBreadcrumb();
        const o = this.currentFolderPath[this.currentFolderPath.length - 1];
        this.loadFiles({ folderId: o.id });
      });
    }));
  }
  /**
   * Select a file
   */
  selectFile(e) {
    this.selectedFile = e;
    const t = this.getFileIcon(e), n = this.getImportTypeInfo(e), { fileList: i } = this.elements;
    i && i.querySelectorAll(".file-item").forEach((P) => {
      const $ = parseInt(P.dataset.fileIndex || "0", 10);
      this.currentFiles[$].id === e.id ? (P.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), P.setAttribute("aria-selected", "true")) : (P.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), P.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: o,
      filePreview: d,
      importStatus: a,
      previewIcon: f,
      previewTitle: g,
      previewType: y,
      importTypeInfo: b,
      importTypeLabel: I,
      importTypeDesc: C,
      snapshotWarning: E,
      importDocumentTitle: T
    } = this.elements;
    o && w(o), d && x(d), a && w(a), f && (f.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, f.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), g && (g.textContent = e.name || "Untitled"), y && (y.textContent = this.getFileTypeName(e.mimeType)), n && b && (b.className = `p-3 rounded-lg border ${n.bgClass}`, I && (I.textContent = n.label, I.className = `text-xs font-medium ${n.textClass}`), C && (C.textContent = n.desc, C.className = `text-xs mt-1 ${n.textClass}`), E && (n.showSnapshot ? x(E) : w(E))), T && (T.value = e.name || ""), H(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: n, fileList: i } = this.elements;
    e && x(e), t && w(t), n && w(n), i && i.querySelectorAll(".file-item").forEach((o) => {
      o.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), o.setAttribute("aria-selected", "false");
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
      t && w(t), this.searchQuery = "";
      const i = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: i.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && w(t), this.searchQuery = "";
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
      importStatusQueued: o,
      importStatusSuccess: d,
      importStatusFailed: a
    } = this.elements;
    switch (t && w(t), n && w(n), i && x(i), o && w(o), d && w(d), a && w(a), e) {
      case "queued":
      case "running":
        o && x(o);
        break;
      case "succeeded":
        d && x(d);
        break;
      case "failed":
        a && x(a);
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
        const o = this.config.routes.integrations || "/admin/esign/integrations/google";
        i.href = this.applyAccountIdToPath(o), x(i);
      } else
        w(i);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: n, importReconnectLink: i } = this.elements;
    if (!this.selectedFile || !e) return;
    const o = e.value.trim();
    if (!o) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), n && (n.textContent = "Starting..."), i && w(i), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const d = new URL(window.location.href);
      d.searchParams.delete("import_run_id"), window.history.replaceState({}, "", d.toString());
      const a = await fetch(
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
            document_title: o
          })
        }
      ), f = await a.json();
      if (!a.ok) {
        const y = f.error?.code || "";
        throw { message: f.error?.message || "Failed to start import", code: y };
      }
      this.currentImportRunId = f.import_run_id, this.pollAttempts = 0;
      const g = new URL(window.location.href);
      this.currentImportRunId && g.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", g.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (d) {
      console.error("Import error:", d);
      const a = d;
      this.showImportError(a.message || "Failed to start import", a.code || ""), t && (t.disabled = !1), n && (n.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), zn);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > mt) {
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
            const o = n.error?.code || "", d = n.error?.message || "Import failed";
            this.showImportError(d, o), H("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < mt ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function is(s) {
  const e = new ze(s);
  return M(() => e.init()), e;
}
function ss(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api/v1`,
    userId: s.userId,
    googleEnabled: s.googleEnabled !== !1,
    googleConnected: s.googleConnected !== !1,
    googleAccountId: s.googleAccountId,
    maxFileSize: s.maxFileSize,
    routes: s.routes
  }, t = new ze(e);
  M(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Nn(s) {
  const e = String(s.basePath || s.base_path || "").trim(), t = s.routes && typeof s.routes == "object" ? s.routes : {}, n = s.features && typeof s.features == "object" ? s.features : {}, i = s.context && typeof s.context == "object" ? s.context : {}, o = String(t.index || "").trim();
  return !e && !o ? null : {
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
      index: o,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && M(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), n = Nn(t);
        n && new ze(n).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
const vt = 1, $e = "esign_wizard_state_v1", qn = "esign_wizard_sync", Vn = 2e3, wt = [1e3, 2e3, 5e3, 1e4, 3e4];
class Gn {
  constructor() {
    this.listeners = [], this.broadcastChannel = null, this.state = this.loadFromSession() || this.createInitialState(), this.setupBroadcastChannel();
  }
  createInitialState() {
    return {
      wizardId: this.generateWizardId(),
      version: vt,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      currentStep: 1,
      document: { id: null, title: null, pageCount: null },
      details: { title: "", message: "" },
      participants: [],
      fieldDefinitions: [],
      fieldPlacements: [],
      fieldRules: [],
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
      const e = sessionStorage.getItem($e);
      if (!e) return null;
      const t = JSON.parse(e);
      return t.version !== vt ? (console.warn("Wizard state version mismatch, migrating..."), this.migrateState(t)) : (Array.isArray(t.fieldRules) || (t.fieldRules = []), t);
    } catch (e) {
      return console.warn("Failed to load wizard state from session:", e), null;
    }
  }
  migrateState(e) {
    return this.createInitialState();
  }
  saveToSession() {
    try {
      this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), sessionStorage.setItem($e, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Failed to save wizard state to session:", e);
    }
  }
  setupBroadcastChannel() {
    if (!(typeof BroadcastChannel > "u"))
      try {
        this.broadcastChannel = new BroadcastChannel(qn), this.broadcastChannel.onmessage = (e) => {
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
  updateFieldRules(e) {
    this.state.fieldRules = e, this.saveToSession(), this.broadcastStateUpdate(), this.notifyListeners();
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
      sessionStorage.removeItem($e);
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
class Wn {
  constructor(e, t, n, i) {
    this.syncTimeout = null, this.retryCount = 0, this.isSyncing = !1, this.stateManager = e, this.apiBase = t, this.onStatusChange = n, this.onConflict = i;
  }
  scheduleSave() {
    this.syncTimeout && clearTimeout(this.syncTimeout), this.syncTimeout = setTimeout(() => this.syncToServer(), Vn);
  }
  async syncToServer() {
    if (this.isSyncing) return;
    const e = this.stateManager.getState();
    if (e.syncPending) {
      this.isSyncing = !0, this.onStatusChange("syncing");
      try {
        const t = this.buildDraftPayload(e), n = e.serverDraftId ? "PUT" : "POST", i = e.serverDraftId ? `${this.apiBase}/esign/drafts/${e.serverDraftId}` : `${this.apiBase}/esign/drafts`, o = await fetch(i, {
          method: n,
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...e.serverDraftId ? { "If-Match": String(e.serverRevision) } : {}
          },
          body: JSON.stringify(t)
        });
        if (o.status === 409) {
          const a = await o.json();
          this.onStatusChange("conflict"), this.onConflict(e.updatedAt, a.server_updated_at || "", a.revision || 0);
          return;
        }
        if (!o.ok)
          throw new Error(`Sync failed: ${o.status}`);
        const d = await o.json();
        this.stateManager.markSynced(d.id || d.draft_id, d.revision || 1), this.retryCount = 0, this.onStatusChange("synced");
      } catch (t) {
        console.error("Server sync error:", t), this.onStatusChange("error"), this.scheduleRetry();
      } finally {
        this.isSyncing = !1;
      }
    }
  }
  scheduleRetry() {
    if (this.retryCount >= wt.length) {
      console.warn("Max sync retries reached");
      return;
    }
    const e = wt[this.retryCount];
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
      field_placements: e.fieldPlacements,
      field_rules: e.fieldRules
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
          fieldRules: n.field_rules || [],
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
class Ue {
  constructor(e) {
    this.currentStep = 1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.stateManager = new Gn(), this.syncManager = new Wn(
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
    e.currentStep > 1 && (this.currentStep = e.currentStep), this.updateWizardUI(), this.config.isEditMode && this.elements.syncStatusIndicator && w(this.elements.syncStatusIndicator);
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
    const { resumeDialogModal: t, resumeDraftTitle: n, resumeDraftStep: i, resumeDraftTime: o } = this.elements;
    n && (n.textContent = e.title), i && (i.textContent = String(e.step)), o && (o.textContent = X(e.updatedAt)), t && x(t);
  }
  hideResumeDialog() {
    this.elements.resumeDialogModal && w(this.elements.resumeDialogModal);
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
    const { conflictDialogModal: i, conflictLocalTime: o, conflictServerTime: d, conflictServerRevision: a } = this.elements;
    o && (o.textContent = X(e)), d && (d.textContent = X(t)), a && (a.textContent = String(n)), i && x(i);
  }
  hideConflictDialog() {
    this.elements.conflictDialogModal && w(this.elements.conflictDialogModal);
  }
  updateSyncStatusUI(e) {
    const { syncStatusIndicator: t, syncStatusIcon: n, syncStatusText: i, syncRetryBtn: o } = this.elements;
    if (!(!t || !n || !i))
      switch (x(t), e) {
        case "syncing":
          n.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", i.textContent = "Saving...", o && w(o);
          break;
        case "synced":
          n.className = "w-2 h-2 rounded-full bg-green-500", i.textContent = "Saved", o && w(o);
          break;
        case "error":
          n.className = "w-2 h-2 rounded-full bg-red-500", i.textContent = "Save failed", o && x(o);
          break;
        case "conflict":
          n.className = "w-2 h-2 rounded-full bg-amber-500", i.textContent = "Conflict", o && w(o);
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
      const n = t + 1, i = n === this.currentStep, o = n < this.currentStep;
      e.classList.toggle("active", i), e.classList.toggle("completed", o), e.setAttribute("aria-current", i ? "step" : "false");
    }), this.elements.stepPanels.forEach((e, t) => {
      t + 1 === this.currentStep ? x(e) : w(e);
    }), this.elements.prevBtn && (this.currentStep === 1 ? w(this.elements.prevBtn) : x(this.elements.prevBtn)), this.elements.nextBtn && (this.currentStep === 6 ? w(this.elements.nextBtn) : x(this.elements.nextBtn)), this.elements.submitBtn && (this.currentStep === 6 ? x(this.elements.submitBtn) : w(this.elements.submitBtn));
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
          field_placements: t.fieldPlacements,
          field_rules: t.fieldRules
        })
      });
      if (!n.ok) {
        const o = await n.json();
        throw new Error(o.error?.message || "Failed to create agreement");
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
function rs(s) {
  const e = new Ue(s);
  return M(() => e.init()), e;
}
function as(s) {
  const e = {
    basePath: s.basePath,
    apiBasePath: s.apiBasePath || `${s.basePath}/api/v1`,
    isEditMode: s.isEditMode || !1,
    createSuccess: s.createSuccess,
    agreementId: s.agreementId,
    routes: s.routes
  }, t = new Ue(e);
  M(() => t.init()), typeof window < "u" && (window.esignAgreementFormController = t);
}
typeof document < "u" && M(() => {
  if (document.querySelector('[data-esign-page="agreement-form"]')) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(e.textContent || "{}");
        (t.basePath || t.routes?.index) && new Ue({
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
const Jn = "esign.signer.profile.v1", yt = "esign.signer.profile.outbox.v1", je = 90, bt = 500 * 1024;
class Yn {
  constructor(e) {
    const t = Number.isFinite(e) && e > 0 ? e : je;
    this.ttlMs = t * 24 * 60 * 60 * 1e3;
  }
  storageKey(e) {
    return `${Jn}:${e}`;
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
    const n = Date.now(), o = {
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
      window.localStorage.setItem(this.storageKey(e), JSON.stringify(o));
    } catch {
    }
    return o;
  }
  async clear(e) {
    try {
      window.localStorage.removeItem(this.storageKey(e));
    } catch {
    }
  }
}
class Kn {
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
class Be {
  constructor(e, t, n) {
    this.mode = e, this.localStore = t, this.remoteStore = n;
  }
  outboxLoad() {
    try {
      const e = window.localStorage.getItem(yt);
      if (!e) return {};
      const t = JSON.parse(e);
      if (!t || typeof t != "object")
        return {};
      const n = {};
      for (const [i, o] of Object.entries(t)) {
        if (!o || typeof o != "object")
          continue;
        const d = o;
        if (d.op === "clear") {
          n[i] = {
            op: "clear",
            updatedAt: Number(d.updatedAt) || Date.now()
          };
          continue;
        }
        const a = d.op === "patch" ? d.patch : d;
        n[i] = {
          op: "patch",
          patch: a && typeof a == "object" ? a : {},
          updatedAt: Number(d.updatedAt) || Date.now()
        };
      }
      return n;
    } catch {
      return {};
    }
  }
  outboxSave(e) {
    try {
      window.localStorage.setItem(yt, JSON.stringify(e));
    } catch {
    }
  }
  queuePatch(e, t) {
    const n = this.outboxLoad(), i = n[e], o = i?.op === "patch" ? i.patch || {} : {};
    n[e] = {
      op: "patch",
      patch: { ...o, ...t, updatedAt: Date.now() },
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
      ]), o = this.pickLatest(n, i);
      return o && await this.localStore.save(e, o), await this.flushOutboxForKey(e), o;
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
function Qn(s) {
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
      ttlDays: Number(s.profile?.ttlDays || je) || je,
      persistDrawnSignature: !!s.profile?.persistDrawnSignature,
      endpointBasePath: String(s.profile?.endpointBasePath || String(s.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Xn(s) {
  const e = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", t = s.recipientEmail ? s.recipientEmail.trim().toLowerCase() : s.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${e}:${t}`);
}
function _e(s) {
  const e = String(s || "").trim().split(/\s+/).filter(Boolean);
  return e.length === 0 ? "" : e.slice(0, 3).map((t) => t[0].toUpperCase()).join("");
}
function Zn(s) {
  const e = String(s || "").trim().toLowerCase();
  return e === "[drawn]" || e === "[drawn initials]";
}
function G(s) {
  const e = String(s || "").trim();
  return Zn(e) ? "" : e;
}
function ei(s) {
  const e = new Yn(s.profile.ttlDays), t = new Kn(s.profile.endpointBasePath, s.token);
  return s.profile.mode === "local_only" ? new Be("local_only", e, null) : s.profile.mode === "remote_only" ? new Be("remote_only", e, t) : new Be("hybrid", e, t);
}
function ti() {
  const s = window;
  s.pdfjsLib && s.pdfjsLib.GlobalWorkerOptions && (s.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
}
function ni(s) {
  const e = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!e) return;
  const t = e;
  if (t.dataset.esignBootstrapped === "true")
    return;
  t.dataset.esignBootstrapped = "true";
  const n = Qn(s), i = Xn(n), o = ei(n);
  ti();
  const d = {
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
    track(r, l = {}) {
      if (!n.telemetryEnabled) return;
      const u = {
        event: r,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: n.flowMode,
        agreementId: n.agreementId,
        ...l
      };
      this.events.push(u), this.isCriticalEvent(r) && this.flush();
    },
    /**
     * Check if event is critical and should be sent immediately
     * @param {string} eventName - Event name
     * @returns {boolean}
     */
    isCriticalEvent(r) {
      return [
        "viewer_load_failed",
        "submit_success",
        "submit_failed",
        "viewer_critical_error",
        "consent_declined"
      ].includes(r);
    },
    /**
     * Track viewer load completion
     * @param {boolean} success - Whether load succeeded
     * @param {number} duration - Load duration in ms
     * @param {string} error - Error message if failed
     */
    trackViewerLoad(r, l, u = null) {
      this.metrics.viewerLoadTime = l, this.track(r ? "viewer_load_success" : "viewer_load_failed", {
        duration: l,
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
    trackFieldSave(r, l, u, p, h = null) {
      this.metrics.fieldSaveLatencies.push(p), u ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: r, error: h }), this.track(u ? "field_save_success" : "field_save_failed", {
        fieldId: r,
        fieldType: l,
        latency: p,
        error: h
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
    trackSignatureAttach(r, l, u, p, h = null) {
      this.metrics.signatureAttachLatencies.push(p), this.track(u ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: r,
        signatureType: l,
        latency: p,
        error: h
      });
    },
    /**
     * Track consent action
     * @param {boolean} accepted - Whether consent was accepted
     */
    trackConsent(r) {
      this.metrics.consentTime = Date.now() - this.startTime, this.track(r ? "consent_accepted" : "consent_declined", {
        timeToConsent: this.metrics.consentTime
      });
    },
    /**
     * Track submission
     * @param {boolean} success - Whether submit succeeded
     * @param {string} error - Error message if failed
     */
    trackSubmit(r, l = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(r ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: a.fieldState.size,
        error: l
      });
    },
    /**
     * Track page navigation
     * @param {number} pageNum - Page number viewed
     */
    trackPageView(r) {
      this.metrics.pagesViewed.has(r) || (this.metrics.pagesViewed.add(r), this.track("page_viewed", {
        pageNum: r,
        totalPagesViewed: this.metrics.pagesViewed.size
      }));
    },
    /**
     * Track viewer critical error
     * @param {string} reason - Reason for error
     */
    trackViewerCriticalError(r) {
      this.track("viewer_critical_error", {
        reason: r,
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
    trackDegradedMode(r, l = {}) {
      this.track("degraded_mode", {
        degradationType: r,
        ...l
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
        totalFields: a.fieldState?.size || 0,
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
    calculateAverage(r) {
      return r.length ? Math.round(r.reduce((l, u) => l + u, 0) / r.length) : 0;
    },
    /**
     * Flush events to backend
     */
    async flush() {
      if (!n.telemetryEnabled || this.events.length === 0) return;
      const r = [...this.events];
      this.events = [];
      try {
        if (navigator.sendBeacon) {
          const l = JSON.stringify({
            events: r,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(`${n.apiBasePath}/telemetry/${n.token}`, l);
        } else
          await fetch(`${n.apiBasePath}/telemetry/${n.token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              events: r,
              summary: this.getSessionSummary()
            }),
            keepalive: !0
          });
      } catch (l) {
        this.events = [...r, ...this.events], console.warn("Telemetry flush failed:", l);
      }
    }
  };
  window.addEventListener("beforeunload", () => {
    d.track("session_end", d.getSessionSummary()), d.flush();
  }), setInterval(() => d.flush(), 3e4);
  const a = {
    currentPage: 1,
    zoomLevel: 1,
    pdfDoc: null,
    pageRendering: !1,
    pageNumPending: null,
    fieldState: /* @__PURE__ */ new Map(),
    activeFieldId: null,
    hasConsented: n.hasConsented,
    signatureCanvases: /* @__PURE__ */ new Map(),
    signatureTabByField: /* @__PURE__ */ new Map(),
    savedSignaturesByType: /* @__PURE__ */ new Map(),
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
    profileRemember: n.profile.rememberByDefault,
    guidedTargetFieldId: null
  }, f = {
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
    getPageMetadata(r) {
      const l = n.viewer.pages?.find((p) => p.page === r);
      if (l)
        return {
          width: l.width,
          height: l.height,
          rotation: l.rotation || 0
        };
      const u = this.pageViewports.get(r);
      return u ? {
        width: u.width,
        height: u.height,
        rotation: u.rotation || 0
      } : { width: 612, height: 792, rotation: 0 };
    },
    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(r, l) {
      this.pageViewports.set(r, {
        width: l.width,
        height: l.height,
        rotation: l.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(r, l) {
      const u = r.page, p = this.getPageMetadata(u), h = l.offsetWidth, m = l.offsetHeight, v = r.pageWidth || p.width, S = r.pageHeight || p.height, L = h / v, D = m / S;
      let k = r.posX || 0, R = r.posY || 0;
      n.viewer.origin === "bottom-left" && (R = S - R - (r.height || 30));
      const N = k * L, q = R * D, A = (r.width || 150) * L, _ = (r.height || 30) * D;
      return {
        left: N,
        top: q,
        width: A,
        height: _,
        // Store original values for debugging
        _debug: {
          sourceX: k,
          sourceY: R,
          sourceWidth: r.width,
          sourceHeight: r.height,
          pageWidth: v,
          pageHeight: S,
          scaleX: L,
          scaleY: D,
          zoom: a.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(r, l) {
      const u = this.pageToScreen(r, l);
      return {
        left: `${Math.round(u.left)}px`,
        top: `${Math.round(u.top)}px`,
        width: `${Math.round(u.width)}px`,
        height: `${Math.round(u.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    }
  }, g = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(r, l, u, p) {
      const h = await fetch(
        `${n.apiBasePath}/signature-upload/${n.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: r,
            sha256: l,
            content_type: u,
            size_bytes: p
          })
        }
      );
      if (!h.ok) {
        let S = null;
        try {
          S = await h.json();
        } catch {
          S = null;
        }
        throw new Error(S?.error?.message || "Failed to get upload contract");
      }
      const m = await h.json(), v = m?.contract || m;
      if (!v || typeof v != "object" || !v.upload_url)
        throw new Error("Invalid upload contract response");
      return v;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(r, l) {
      const u = new URL(r.upload_url, window.location.origin);
      r.upload_token && u.searchParams.set("upload_token", String(r.upload_token)), r.object_key && u.searchParams.set("object_key", String(r.object_key));
      const p = {
        "Content-Type": r.content_type || "image/png"
      };
      r.headers && Object.entries(r.headers).forEach(([m, v]) => {
        const S = String(m).toLowerCase();
        S === "x-esign-upload-token" || S === "x-esign-upload-key" || (p[m] = String(v));
      });
      const h = await fetch(u.toString(), {
        method: r.method || "PUT",
        headers: p,
        body: l,
        credentials: "omit"
      });
      if (!h.ok)
        throw new Error(`Upload failed: ${h.status} ${h.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(r) {
      const [l, u] = r.split(","), p = l.match(/data:([^;]+)/), h = p ? p[1] : "image/png", m = atob(u), v = new Uint8Array(m.length);
      for (let S = 0; S < m.length; S++)
        v[S] = m.charCodeAt(S);
      return new Blob([v], { type: h });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(r, l) {
      const u = this.dataUrlToBlob(l), p = u.size, h = "image/png", m = await Z(u), v = await this.requestUploadBootstrap(
        r,
        m,
        h,
        p
      );
      return await this.uploadToSignedUrl(v, u), {
        uploadToken: v.upload_token,
        objectKey: v.object_key,
        sha256: v.sha256,
        contentType: v.content_type
      };
    }
  }, y = {
    endpoint(r, l = "") {
      const u = encodeURIComponent(r), p = l ? `/${encodeURIComponent(l)}` : "";
      return `${n.apiBasePath}/signatures/${u}${p}`;
    },
    async list(r) {
      const l = new URL(this.endpoint(n.token), window.location.origin);
      l.searchParams.set("type", r);
      const u = await fetch(l.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!u.ok) {
        const h = await u.json().catch(() => ({}));
        throw new Error(h?.error?.message || "Failed to load saved signatures");
      }
      const p = await u.json();
      return Array.isArray(p?.signatures) ? p.signatures : [];
    },
    async save(r, l, u = "") {
      const p = await fetch(this.endpoint(n.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: r,
          label: u,
          data_url: l
        })
      });
      if (!p.ok) {
        const m = await p.json().catch(() => ({})), v = new Error(m?.error?.message || "Failed to save signature");
        throw v.code = m?.error?.code || "", v;
      }
      return (await p.json())?.signature || null;
    },
    async delete(r) {
      const l = await fetch(this.endpoint(n.token, r), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!l.ok) {
        const u = await l.json().catch(() => ({}));
        throw new Error(u?.error?.message || "Failed to delete signature");
      }
    }
  };
  function b(r) {
    const l = a.fieldState.get(r);
    return l && l.type === "initials" ? "initials" : "signature";
  }
  function I(r) {
    return a.savedSignaturesByType.get(r) || [];
  }
  async function C(r, l = !1) {
    const u = b(r);
    if (!l && a.savedSignaturesByType.has(u)) {
      E(r);
      return;
    }
    const p = await y.list(u);
    a.savedSignaturesByType.set(u, p), E(r);
  }
  function E(r) {
    const l = b(r), u = I(l), p = document.getElementById("sig-saved-list");
    if (p) {
      if (!u.length) {
        p.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      p.innerHTML = u.map((h) => {
        const m = V(String(h?.thumbnail_data_url || h?.data_url || "")), v = V(String(h?.label || "Saved signature")), S = V(String(h?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${m}" alt="${v}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${v}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${V(r)}" data-signature-id="${S}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${V(r)}" data-signature-id="${S}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function T(r) {
    const l = a.signatureCanvases.get(r), u = b(r);
    if (!l || !it(r))
      throw new Error(`Please add your ${u === "initials" ? "initials" : "signature"} first`);
    const p = l.canvas.toDataURL("image/png"), h = await y.save(u, p, u === "initials" ? "Initials" : "Signature");
    if (!h)
      throw new Error("Failed to save signature");
    const m = I(u);
    m.unshift(h), a.savedSignaturesByType.set(u, m), E(r), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function P(r, l) {
    const u = b(r), h = I(u).find((v) => String(v?.id || "") === String(l));
    if (!h) return;
    requestAnimationFrame(() => me(r)), await F(r);
    const m = String(h.data_url || h.thumbnail_data_url || "").trim();
    m && (await Ce(r, m, { clearStrokes: !0 }), ge("draw", r), j("Saved signature selected."));
  }
  async function $(r, l) {
    const u = b(r);
    await y.delete(l);
    const p = I(u).filter((h) => String(h?.id || "") !== String(l));
    a.savedSignaturesByType.set(u, p), E(r);
  }
  function B(r) {
    const l = String(r?.code || "").trim(), u = String(r?.message || "Unable to update saved signatures"), p = l === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : u;
    window.toastManager && window.toastManager.error(p), j(p, "assertive");
  }
  async function F(r, l = 8) {
    for (let u = 0; u < l; u++) {
      if (a.signatureCanvases.has(r)) return !0;
      await new Promise((p) => setTimeout(p, 40)), me(r);
    }
    return !1;
  }
  async function O(r, l) {
    const u = String(l?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(u))
      throw new Error("Only PNG and JPEG images are supported");
    if (l.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => me(r)), await F(r);
    const p = a.signatureCanvases.get(r);
    if (!p)
      throw new Error("Signature canvas is not ready");
    const h = await U(l), m = u === "image/png" ? h : await J(h, p.drawWidth, p.drawHeight);
    if (ae(m) > bt)
      throw new Error(`Image exceeds ${Math.round(bt / 1024)}KB limit after conversion`);
    await Ce(r, m, { clearStrokes: !0 });
    const S = document.getElementById("sig-upload-preview-wrap"), L = document.getElementById("sig-upload-preview");
    S && S.classList.remove("hidden"), L && L.setAttribute("src", m), j("Signature image uploaded. You can now insert it.");
  }
  function U(r) {
    return new Promise((l, u) => {
      const p = new FileReader();
      p.onload = () => l(String(p.result || "")), p.onerror = () => u(new Error("Unable to read image file")), p.readAsDataURL(r);
    });
  }
  function ae(r) {
    const l = String(r || "").split(",");
    if (l.length < 2) return 0;
    const u = l[1] || "", p = (u.match(/=+$/) || [""])[0].length;
    return Math.floor(u.length * 3 / 4) - p;
  }
  async function J(r, l, u) {
    return await new Promise((p, h) => {
      const m = new Image();
      m.onload = () => {
        const v = document.createElement("canvas"), S = Math.max(1, Math.round(Number(l) || 600)), L = Math.max(1, Math.round(Number(u) || 160));
        v.width = S, v.height = L;
        const D = v.getContext("2d");
        if (!D) {
          h(new Error("Unable to process image"));
          return;
        }
        D.clearRect(0, 0, S, L);
        const k = Math.min(S / m.width, L / m.height), R = m.width * k, N = m.height * k, q = (S - R) / 2, A = (L - N) / 2;
        D.drawImage(m, q, A, R, N), p(v.toDataURL("image/png"));
      }, m.onerror = () => h(new Error("Unable to decode image file")), m.src = r;
    });
  }
  async function Z(r) {
    if (window.crypto && window.crypto.subtle) {
      const l = await r.arrayBuffer(), u = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(u)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function ee() {
    document.addEventListener("click", (r) => {
      const l = r.target;
      if (!(l instanceof Element)) return;
      const u = l.closest("[data-esign-action]");
      if (!u) return;
      switch (u.getAttribute("data-esign-action")) {
        case "prev-page":
          Gt();
          break;
        case "next-page":
          Wt();
          break;
        case "zoom-out":
          Yt();
          break;
        case "zoom-in":
          Jt();
          break;
        case "fit-width":
          Kt();
          break;
        case "download-document":
          wn();
          break;
        case "show-consent-modal":
          ot();
          break;
        case "activate-field": {
          const h = u.getAttribute("data-field-id");
          h && he(h);
          break;
        }
        case "submit-signature":
          gn();
          break;
        case "show-decline-modal":
          mn();
          break;
        case "close-field-editor":
          Ee();
          break;
        case "save-field-editor":
          an();
          break;
        case "hide-consent-modal":
          Ae();
          break;
        case "accept-consent":
          hn();
          break;
        case "hide-decline-modal":
          ct();
          break;
        case "confirm-decline":
          fn();
          break;
        case "retry-load-pdf":
          de();
          break;
        case "signature-tab": {
          const h = u.getAttribute("data-tab") || "draw", m = u.getAttribute("data-field-id");
          m && ge(h, m);
          break;
        }
        case "clear-signature-canvas": {
          const h = u.getAttribute("data-field-id");
          h && rn(h);
          break;
        }
        case "undo-signature-canvas": {
          const h = u.getAttribute("data-field-id");
          h && nn(h);
          break;
        }
        case "redo-signature-canvas": {
          const h = u.getAttribute("data-field-id");
          h && sn(h);
          break;
        }
        case "save-current-signature-library": {
          const h = u.getAttribute("data-field-id");
          h && T(h).catch(B);
          break;
        }
        case "select-saved-signature": {
          const h = u.getAttribute("data-field-id"), m = u.getAttribute("data-signature-id");
          h && m && P(h, m).catch(B);
          break;
        }
        case "delete-saved-signature": {
          const h = u.getAttribute("data-field-id"), m = u.getAttribute("data-signature-id");
          h && m && $(h, m).catch(B);
          break;
        }
        case "clear-signer-profile":
          Je().catch(() => {
          });
          break;
        case "debug-toggle-panel":
          Y.togglePanel();
          break;
        case "debug-copy-session":
          Y.copySessionInfo();
          break;
        case "debug-clear-cache":
          Y.clearCache();
          break;
        case "debug-show-telemetry":
          Y.showTelemetry();
          break;
        case "debug-reload-viewer":
          Y.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (r) => {
      const l = r.target;
      if (!(l instanceof HTMLInputElement) || !l.matches("#sig-upload-input")) return;
      const u = l.getAttribute("data-field-id"), p = l.files?.[0];
      !u || !p || O(u, p).catch((h) => {
        window.toastManager && window.toastManager.error(h?.message || "Unable to process uploaded image");
      });
    });
  }
  M(async () => {
    ee(), a.isLowMemory = Ut(), le(), await Rt(), Ft(), zt(), rt(), Le(), await de(), ue(), document.addEventListener("visibilitychange", te), "memory" in navigator && ye(), Y.init();
  });
  function te() {
    document.hidden && z();
  }
  function z() {
    const r = a.isLowMemory ? 1 : 2;
    for (; a.renderedPages.size > r; ) {
      let l = null, u = 1 / 0;
      if (a.renderedPages.forEach((p, h) => {
        h !== a.currentPage && p.timestamp < u && (l = h, u = p.timestamp);
      }), l !== null)
        a.renderedPages.delete(l);
      else
        break;
    }
  }
  function ye() {
    setInterval(() => {
      if (navigator.memory) {
        const r = navigator.memory.usedJSHeapSize, l = navigator.memory.totalJSHeapSize;
        r / l > 0.8 && (a.isLowMemory = !0, z());
      }
    }, 3e4);
  }
  function le() {
    const r = document.getElementById("stage-state-banner"), l = document.getElementById("stage-state-icon"), u = document.getElementById("stage-state-title"), p = document.getElementById("stage-state-message"), h = document.getElementById("stage-state-meta");
    if (!r || !l || !u || !p || !h) return;
    const m = n.signerState || "active", v = n.recipientStage || 1, S = n.activeStage || 1, L = n.activeRecipientIds || [], D = n.waitingForRecipientIds || [];
    let k = {
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
    switch (m) {
      case "waiting":
        k = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: v > S ? `You are in signing stage ${v}. Stage ${S} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
        }, D.length > 0 && k.badges.push({
          icon: "iconoir-group",
          text: `${D.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        k = {
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
        k = {
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
        L.length > 1 ? (k.message = `You and ${L.length - 1} other signer(s) can sign now.`, k.badges = [
          { icon: "iconoir-users", text: `Stage ${S} active`, variant: "green" }
        ]) : v > 1 ? k.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${v}`, variant: "green" }
        ] : k.hidden = !0;
        break;
    }
    if (k.hidden) {
      r.classList.add("hidden");
      return;
    }
    r.classList.remove("hidden"), r.className = `mb-4 rounded-lg border p-4 ${k.bgClass} ${k.borderClass}`, l.className = `${k.iconClass} mt-0.5`, u.className = `text-sm font-semibold ${k.titleClass}`, u.textContent = k.title, p.className = `text-xs ${k.messageClass} mt-1`, p.textContent = k.message, h.innerHTML = "", k.badges.forEach((R) => {
      const N = document.createElement("span"), q = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      N.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${q[R.variant] || q.blue}`, N.innerHTML = `<i class="${R.icon} mr-1"></i>${R.text}`, h.appendChild(N);
    });
  }
  function Ft() {
    n.fields.forEach((r) => {
      let l = null, u = !1;
      if (r.type === "checkbox")
        l = r.value_bool || !1, u = l;
      else if (r.type === "date_signed")
        l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], u = !0;
      else {
        const p = String(r.value_text || "");
        l = p || Ht(r), u = !!p;
      }
      a.fieldState.set(r.id, {
        id: r.id,
        type: r.type,
        page: r.page || 1,
        required: r.required,
        value: l,
        completed: u,
        hasError: !1,
        lastError: null,
        // Geometry metadata (will be populated from backend in Phase 18.BE.3)
        posX: r.pos_x || 0,
        posY: r.pos_y || 0,
        width: r.width || 150,
        height: r.height || 30,
        tabIndex: Number(r.tab_index || 0) || 0
      });
    });
  }
  async function Rt() {
    try {
      const r = await o.load(a.profileKey);
      r && (a.profileData = r, a.profileRemember = r.remember !== !1);
    } catch {
    }
  }
  function Ht(r) {
    const l = a.profileData;
    if (!l) return "";
    const u = String(r?.type || "").trim();
    return u === "name" ? G(l.fullName || "") : u === "initials" ? G(l.initials || "") || _e(l.fullName || n.recipientName || "") : u === "signature" ? G(l.typedSignature || "") : "";
  }
  function jt(r) {
    return !n.profile.persistDrawnSignature || !a.profileData ? "" : r?.type === "initials" && String(a.profileData.drawnInitialsDataUrl || "").trim() || String(a.profileData.drawnSignatureDataUrl || "").trim();
  }
  function Ot(r) {
    const l = G(r?.value || "");
    return l || (a.profileData ? r?.type === "initials" ? G(a.profileData.initials || "") || _e(a.profileData.fullName || n.recipientName || "") : r?.type === "signature" ? G(a.profileData.typedSignature || "") : "" : "");
  }
  function We() {
    const r = document.getElementById("remember-profile-input");
    return r instanceof HTMLInputElement ? !!r.checked : a.profileRemember;
  }
  async function Je(r = !1) {
    let l = null;
    try {
      await o.clear(a.profileKey);
    } catch (u) {
      l = u;
    } finally {
      a.profileData = null, a.profileRemember = n.profile.rememberByDefault;
    }
    if (l) {
      if (!r && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !r)
        throw l;
      return;
    }
    !r && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function Ye(r, l = {}) {
    const u = We();
    if (a.profileRemember = u, !u) {
      await Je(!0);
      return;
    }
    if (!r) return;
    const p = {
      remember: !0
    }, h = String(r.type || "");
    if (h === "name" && typeof r.value == "string") {
      const m = G(r.value);
      m && (p.fullName = m, (a.profileData?.initials || "").trim() || (p.initials = _e(m)));
    }
    if (h === "initials") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnInitialsDataUrl = l.signatureDataUrl;
      else if (typeof r.value == "string") {
        const m = G(r.value);
        m && (p.initials = m);
      }
    }
    if (h === "signature") {
      if (l.signatureType === "drawn" && n.profile.persistDrawnSignature && typeof l.signatureDataUrl == "string")
        p.drawnSignatureDataUrl = l.signatureDataUrl;
      else if (typeof r.value == "string") {
        const m = G(r.value);
        m && (p.typedSignature = m);
      }
    }
    if (!(Object.keys(p).length === 1 && p.remember === !0))
      try {
        const m = await o.save(a.profileKey, p);
        a.profileData = m;
      } catch {
      }
  }
  function zt() {
    const r = document.getElementById("consent-checkbox"), l = document.getElementById("consent-accept-btn");
    r && l && r.addEventListener("change", function() {
      l.disabled = !this.checked;
    });
  }
  function Ut() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function be() {
    const r = a.isLowMemory ? 3 : a.maxCachedPages;
    if (a.renderedPages.size <= r) return;
    const l = [];
    for (a.renderedPages.forEach((u, p) => {
      const h = Math.abs(p - a.currentPage);
      l.push({ pageNum: p, distance: h });
    }), l.sort((u, p) => p.distance - u.distance); a.renderedPages.size > r && l.length > 0; ) {
      const u = l.shift();
      u && u.pageNum !== a.currentPage && a.renderedPages.delete(u.pageNum);
    }
  }
  function Ke(r) {
    if (a.isLowMemory) return;
    const l = [];
    r > 1 && l.push(r - 1), r < n.pageCount && l.push(r + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      l.forEach(async (u) => {
        !a.renderedPages.has(u) && !a.pageRendering && await Nt(u);
      });
    }, { timeout: 2e3 });
  }
  async function Nt(r) {
    if (!(!a.pdfDoc || a.renderedPages.has(r)))
      try {
        const l = await a.pdfDoc.getPage(r), u = a.zoomLevel, p = l.getViewport({ scale: u * window.devicePixelRatio }), h = document.createElement("canvas"), m = h.getContext("2d");
        h.width = p.width, h.height = p.height;
        const v = {
          canvasContext: m,
          viewport: p
        };
        await l.render(v).promise, a.renderedPages.set(r, {
          canvas: h,
          scale: u,
          timestamp: Date.now()
        }), be();
      } catch (l) {
        console.warn("Preload failed for page", r, l);
      }
  }
  function qt() {
    const r = window.devicePixelRatio || 1;
    return a.isLowMemory ? Math.min(r, 1.5) : Math.min(r, 2);
  }
  async function de() {
    const r = document.getElementById("pdf-loading"), l = Date.now();
    try {
      const u = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!u.ok)
        throw new Error("Failed to load document");
      const h = (await u.json()).assets || {}, m = h.source_url || h.executed_url || h.certificate_url || n.documentUrl;
      if (!m)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const v = pdfjsLib.getDocument(m);
      a.pdfDoc = await v.promise, n.pageCount = a.pdfDoc.numPages, document.getElementById("page-count").textContent = a.pdfDoc.numPages, await xe(1), pe(), d.trackViewerLoad(!0, Date.now() - l), d.trackPageView(1);
    } catch (u) {
      console.error("PDF load error:", u), d.trackViewerLoad(!1, Date.now() - l, u.message), r && (r.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), vn();
    }
  }
  async function xe(r) {
    if (!a.pdfDoc) return;
    const l = a.renderedPages.get(r);
    if (l && l.scale === a.zoomLevel) {
      Vt(l), a.currentPage = r, document.getElementById("current-page").textContent = r, ue(), Ke(r);
      return;
    }
    a.pageRendering = !0;
    try {
      const u = await a.pdfDoc.getPage(r), p = a.zoomLevel, h = qt(), m = u.getViewport({ scale: p * h }), v = u.getViewport({ scale: 1 });
      f.setPageViewport(r, {
        width: v.width,
        height: v.height,
        rotation: v.rotation || 0
      });
      const S = document.getElementById("pdf-page-1");
      S.innerHTML = "";
      const L = document.createElement("canvas"), D = L.getContext("2d");
      L.height = m.height, L.width = m.width, L.style.width = `${m.width / h}px`, L.style.height = `${m.height / h}px`, S.appendChild(L);
      const k = document.getElementById("pdf-container");
      k.style.width = `${m.width / h}px`;
      const R = {
        canvasContext: D,
        viewport: m
      };
      await u.render(R).promise, a.renderedPages.set(r, {
        canvas: L.cloneNode(!0),
        scale: p,
        timestamp: Date.now(),
        displayWidth: m.width / h,
        displayHeight: m.height / h
      }), a.renderedPages.get(r).canvas.getContext("2d").drawImage(L, 0, 0), be(), a.currentPage = r, document.getElementById("current-page").textContent = r, ue(), d.trackPageView(r), Ke(r);
    } catch (u) {
      console.error("Page render error:", u);
    } finally {
      if (a.pageRendering = !1, a.pageNumPending !== null) {
        const u = a.pageNumPending;
        a.pageNumPending = null, await xe(u);
      }
    }
  }
  function Vt(r, l) {
    const u = document.getElementById("pdf-page-1");
    u.innerHTML = "";
    const p = document.createElement("canvas");
    p.width = r.canvas.width, p.height = r.canvas.height, p.style.width = `${r.displayWidth}px`, p.style.height = `${r.displayHeight}px`, p.getContext("2d").drawImage(r.canvas, 0, 0), u.appendChild(p);
    const m = document.getElementById("pdf-container");
    m.style.width = `${r.displayWidth}px`;
  }
  function ne(r) {
    a.pageRendering ? a.pageNumPending = r : xe(r);
  }
  function ue() {
    const r = document.getElementById("field-overlays");
    r.innerHTML = "", r.style.pointerEvents = "auto";
    const l = document.getElementById("pdf-container");
    a.fieldState.forEach((u, p) => {
      if (u.page !== a.currentPage) return;
      const h = document.createElement("div");
      if (h.className = "field-overlay", h.dataset.fieldId = p, u.required && h.classList.add("required"), u.completed && h.classList.add("completed"), a.activeFieldId === p && h.classList.add("active"), u.posX != null && u.posY != null && u.width != null && u.height != null) {
        const S = f.getOverlayStyles(u, l);
        h.style.left = S.left, h.style.top = S.top, h.style.width = S.width, h.style.height = S.height, h.style.transform = S.transform, Y.enabled && (h.dataset.debugCoords = JSON.stringify(
          f.pageToScreen(u, l)._debug
        ));
      } else {
        const S = Array.from(a.fieldState.keys()).indexOf(p);
        h.style.left = "10px", h.style.top = `${100 + S * 50}px`, h.style.width = "150px", h.style.height = "30px";
      }
      const v = document.createElement("span");
      v.className = "field-overlay-label", v.textContent = Qe(u.type), h.appendChild(v), h.setAttribute("tabindex", "0"), h.setAttribute("role", "button"), h.setAttribute("aria-label", `${Qe(u.type)} field${u.required ? ", required" : ""}${u.completed ? ", completed" : ""}`), h.addEventListener("click", () => he(p)), h.addEventListener("keydown", (S) => {
        (S.key === "Enter" || S.key === " ") && (S.preventDefault(), he(p));
      }), r.appendChild(h);
    });
  }
  function Qe(r) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[r] || r;
  }
  function Gt() {
    a.currentPage <= 1 || (ne(a.currentPage - 1), pe());
  }
  function Wt() {
    a.currentPage >= n.pageCount || (ne(a.currentPage + 1), pe());
  }
  function Xe(r) {
    r < 1 || r > n.pageCount || (ne(r), pe());
  }
  function pe() {
    document.getElementById("prev-page-btn").disabled = a.currentPage <= 1, document.getElementById("next-page-btn").disabled = a.currentPage >= n.pageCount;
  }
  function Jt() {
    a.zoomLevel = Math.min(a.zoomLevel + 0.25, 3), Se(), ne(a.currentPage);
  }
  function Yt() {
    a.zoomLevel = Math.max(a.zoomLevel - 0.25, 0.5), Se(), ne(a.currentPage);
  }
  function Kt() {
    const l = document.getElementById("viewer-content").offsetWidth - 32, u = 612;
    a.zoomLevel = l / u, Se(), ne(a.currentPage);
  }
  function Se() {
    document.getElementById("zoom-level").textContent = `${Math.round(a.zoomLevel * 100)}%`;
  }
  function he(r) {
    if (!a.hasConsented && n.fields.some((l) => l.id === r && l.type !== "date_signed")) {
      ot();
      return;
    }
    Ze(r, { openEditor: !0 });
  }
  function Ze(r, l = { openEditor: !0 }) {
    const u = a.fieldState.get(r);
    if (u) {
      if (l.openEditor && (a.activeFieldId = r), document.querySelectorAll(".field-list-item").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((p) => p.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("active"), u.page !== a.currentPage && Xe(u.page), !l.openEditor) {
        et(r);
        return;
      }
      u.type !== "date_signed" && Qt(r);
    }
  }
  function et(r) {
    document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function Qt(r) {
    const l = a.fieldState.get(r);
    if (!l) return;
    const u = document.getElementById("field-editor-overlay"), p = document.getElementById("field-editor-content"), h = document.getElementById("field-editor-title"), m = document.getElementById("field-editor-legal-disclaimer");
    h.textContent = tt(l.type), p.innerHTML = Xt(l), m?.classList.toggle("hidden", !(l.type === "signature" || l.type === "initials")), (l.type === "signature" || l.type === "initials") && en(r), u.classList.add("active"), u.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", ke(u.querySelector(".field-editor")), j(`Editing ${tt(l.type)}. Press Escape to cancel.`), setTimeout(() => {
      const v = p.querySelector("input, textarea");
      v ? v.focus() : p.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100);
  }
  function tt(r) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[r] || "Edit Field";
  }
  function Xt(r) {
    const l = Zt(r.type), u = V(String(r?.id || "")), p = V(String(r?.type || ""));
    if (r.type === "signature" || r.type === "initials") {
      const h = r.type === "initials" ? "initials" : "signature", m = V(Ot(r)), v = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], S = nt(r.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${v.map((L) => `
            <button
              type="button"
              id="sig-tab-${L.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${S === L.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${L.id}"
              data-esign-action="signature-tab"
              data-field-id="${u}"
              role="tab"
              aria-selected="${S === L.id ? "true" : "false"}"
              aria-controls="sig-editor-${L.id}"
              tabindex="${S === L.id ? "0" : "-1"}"
            >
              ${L.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${S === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${h}"
              value="${m}"
              data-field-id="${u}"
            />
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${h} will appear as your ${p}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${S === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${u}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${u}" class="btn btn-secondary text-xs justify-center">
                Undo
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${u}" class="btn btn-secondary text-xs justify-center">
                Redo
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${u}" class="btn btn-secondary text-xs justify-center">
                Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${h} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${S === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="sig-upload-input">Upload signature image (PNG or JPEG)</label>
            <input
              type="file"
              id="sig-upload-input"
              accept="image/png,image/jpeg"
              data-field-id="${u}"
              data-esign-action="upload-signature-file"
              class="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
            />
            <div id="sig-upload-preview-wrap" class="mt-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hidden">
              <img id="sig-upload-preview" alt="Upload preview" class="max-h-24 mx-auto object-contain" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Image will be converted to PNG and centered in the signature area.</p>
          </div>

          <!-- Saved panel -->
          <div id="sig-editor-saved" class="sig-editor-panel ${S === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${h}s</p>
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${u}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <div id="sig-saved-list" class="space-y-2">
              <p class="text-xs text-gray-500">Loading saved signatures...</p>
            </div>
          </div>

          ${l}
        </div>
      `;
    }
    if (r.type === "name")
      return `
        <input
          type="text"
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full legal name"
          value="${V(String(r.value || ""))}"
          data-field-id="${u}"
        />
        ${l}
      `;
    if (r.type === "text") {
      const h = V(String(r.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${u}"
        >${h}</textarea>
      `;
    }
    return r.type === "checkbox" ? `
        <label class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            id="field-checkbox-input"
            class="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${r.value ? "checked" : ""}
            data-field-id="${r.id}"
          />
          <span class="text-gray-700">I agree to the terms and conditions</span>
        </label>
      ` : '<p class="text-gray-500">Unsupported field type</p>';
  }
  function Zt(r) {
    return r === "name" || r === "initials" || r === "signature" ? `
      <div class="pt-3 border-t border-gray-100 space-y-2">
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            id="remember-profile-input"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${a.profileRemember ? "checked" : ""}
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
  function nt(r) {
    const l = String(a.signatureTabByField.get(r) || "").trim();
    return l === "draw" || l === "type" || l === "upload" || l === "saved" ? l : "draw";
  }
  function ge(r, l) {
    const u = ["draw", "type", "upload", "saved"].includes(r) ? r : "draw";
    a.signatureTabByField.set(l, u), document.querySelectorAll(".sig-editor-tab").forEach((h) => {
      h.classList.remove("border-blue-600", "text-blue-600"), h.classList.add("border-transparent", "text-gray-500"), h.setAttribute("aria-selected", "false"), h.setAttribute("tabindex", "-1");
    });
    const p = document.querySelector(`.sig-editor-tab[data-tab="${u}"]`);
    p?.classList.add("border-blue-600", "text-blue-600"), p?.classList.remove("border-transparent", "text-gray-500"), p?.setAttribute("aria-selected", "true"), p?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", u !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", u !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", u !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", u !== "saved"), (u === "draw" || u === "upload" || u === "saved") && p && requestAnimationFrame(() => me(l)), u === "saved" && C(l).catch(B);
  }
  function en(r) {
    a.signatureTabByField.set(r, "draw"), ge("draw", r);
  }
  function me(r) {
    const l = document.getElementById("sig-draw-canvas");
    if (!l || a.signatureCanvases.has(r)) return;
    const u = l.closest(".signature-canvas-container"), p = l.getContext("2d");
    if (!p) return;
    const h = l.getBoundingClientRect();
    if (!h.width || !h.height) return;
    const m = window.devicePixelRatio || 1;
    l.width = h.width * m, l.height = h.height * m, p.scale(m, m), p.lineCap = "round", p.lineJoin = "round", p.strokeStyle = "#1f2937", p.lineWidth = 2.5;
    let v = !1, S = 0, L = 0, D = [];
    const k = (A) => {
      const _ = l.getBoundingClientRect();
      let K, Q;
      return A.touches && A.touches.length > 0 ? (K = A.touches[0].clientX, Q = A.touches[0].clientY) : A.changedTouches && A.changedTouches.length > 0 ? (K = A.changedTouches[0].clientX, Q = A.changedTouches[0].clientY) : (K = A.clientX, Q = A.clientY), {
        x: K - _.left,
        y: Q - _.top,
        timestamp: Date.now()
      };
    }, R = (A) => {
      v = !0;
      const _ = k(A);
      S = _.x, L = _.y, D = [{ x: _.x, y: _.y, t: _.timestamp, width: 2.5 }], u && u.classList.add("drawing");
    }, N = (A) => {
      if (!v) return;
      const _ = k(A);
      D.push({ x: _.x, y: _.y, t: _.timestamp, width: 2.5 });
      const K = _.x - S, Q = _.y - L, bn = _.timestamp - (D[D.length - 2]?.t || _.timestamp), xn = Math.sqrt(K * K + Q * Q) / Math.max(bn, 1), Sn = 2.5, Cn = 1.5, En = 4, In = Math.min(xn / 5, 1), ut = Math.max(Cn, Math.min(En, Sn - In * 1.5));
      D[D.length - 1].width = ut, p.lineWidth = ut, p.beginPath(), p.moveTo(S, L), p.lineTo(_.x, _.y), p.stroke(), S = _.x, L = _.y;
    }, q = () => {
      if (v = !1, D.length > 1) {
        const A = a.signatureCanvases.get(r);
        A && (A.strokes.push(D.map((_) => ({ ..._ }))), A.redoStack = []);
      }
      D = [], u && u.classList.remove("drawing");
    };
    l.addEventListener("mousedown", R), l.addEventListener("mousemove", N), l.addEventListener("mouseup", q), l.addEventListener("mouseout", q), l.addEventListener("touchstart", (A) => {
      A.preventDefault(), A.stopPropagation(), R(A);
    }, { passive: !1 }), l.addEventListener("touchmove", (A) => {
      A.preventDefault(), A.stopPropagation(), N(A);
    }, { passive: !1 }), l.addEventListener("touchend", (A) => {
      A.preventDefault(), q();
    }, { passive: !1 }), l.addEventListener("touchcancel", q), l.addEventListener("gesturestart", (A) => A.preventDefault()), l.addEventListener("gesturechange", (A) => A.preventDefault()), l.addEventListener("gestureend", (A) => A.preventDefault()), a.signatureCanvases.set(r, {
      canvas: l,
      ctx: p,
      dpr: m,
      drawWidth: h.width,
      drawHeight: h.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), tn(r);
  }
  function tn(r) {
    const l = a.signatureCanvases.get(r), u = a.fieldState.get(r);
    if (!l || !u) return;
    const p = jt(u);
    p && Ce(r, p, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function Ce(r, l, u = { clearStrokes: !1 }) {
    const p = a.signatureCanvases.get(r);
    if (!p) return !1;
    const h = String(l || "").trim();
    if (!h)
      return p.baseImageDataUrl = "", p.baseImage = null, u.clearStrokes && (p.strokes = [], p.redoStack = []), oe(r), !0;
    const { drawWidth: m, drawHeight: v } = p, S = new Image();
    return await new Promise((L) => {
      S.onload = () => {
        u.clearStrokes && (p.strokes = [], p.redoStack = []), p.baseImage = S, p.baseImageDataUrl = h, m > 0 && v > 0 && oe(r), L(!0);
      }, S.onerror = () => L(!1), S.src = h;
    });
  }
  function oe(r) {
    const l = a.signatureCanvases.get(r);
    if (!l) return;
    const { ctx: u, drawWidth: p, drawHeight: h, baseImage: m, strokes: v } = l;
    if (u.clearRect(0, 0, p, h), m) {
      const S = Math.min(p / m.width, h / m.height), L = m.width * S, D = m.height * S, k = (p - L) / 2, R = (h - D) / 2;
      u.drawImage(m, k, R, L, D);
    }
    for (const S of v)
      for (let L = 1; L < S.length; L++) {
        const D = S[L - 1], k = S[L];
        u.lineWidth = Number(k.width || 2.5) || 2.5, u.beginPath(), u.moveTo(D.x, D.y), u.lineTo(k.x, k.y), u.stroke();
      }
  }
  function nn(r) {
    const l = a.signatureCanvases.get(r);
    if (!l || l.strokes.length === 0) return;
    const u = l.strokes.pop();
    u && l.redoStack.push(u), oe(r);
  }
  function sn(r) {
    const l = a.signatureCanvases.get(r);
    if (!l || l.redoStack.length === 0) return;
    const u = l.redoStack.pop();
    u && l.strokes.push(u), oe(r);
  }
  function it(r) {
    const l = a.signatureCanvases.get(r);
    if (!l) return !1;
    if ((l.baseImageDataUrl || "").trim() || l.strokes.length > 0) return !0;
    const { canvas: u, ctx: p } = l;
    return p.getImageData(0, 0, u.width, u.height).data.some((m, v) => v % 4 === 3 && m > 0);
  }
  function rn(r) {
    const l = a.signatureCanvases.get(r);
    l && (l.strokes = [], l.redoStack = [], l.baseImage = null, l.baseImageDataUrl = "", oe(r));
    const u = document.getElementById("sig-upload-preview-wrap"), p = document.getElementById("sig-upload-preview");
    u && u.classList.add("hidden"), p && p.removeAttribute("src");
  }
  function Ee() {
    const r = document.getElementById("field-editor-overlay"), l = r.querySelector(".field-editor");
    if (Pe(l), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", a.activeFieldId) {
      const u = document.querySelector(`.field-list-item[data-field-id="${a.activeFieldId}"]`);
      requestAnimationFrame(() => {
        u?.focus();
      });
    }
    a.activeFieldId = null, a.signatureCanvases.clear(), j("Field editor closed.");
  }
  async function an() {
    const r = a.activeFieldId;
    if (!r) return;
    const l = a.fieldState.get(r);
    if (!l) return;
    const u = document.getElementById("field-editor-save");
    u.disabled = !0, u.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      a.profileRemember = We();
      let p = !1;
      if (l.type === "signature" || l.type === "initials")
        p = await on(r);
      else if (l.type === "checkbox") {
        const h = document.getElementById("field-checkbox-input");
        p = await Ie(r, null, h?.checked || !1);
      } else {
        const m = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!m && l.required)
          throw new Error("This field is required");
        p = await Ie(r, m, null);
      }
      if (p) {
        Ee(), rt(), Le(), lt(), ue(), dn(r), pn(r);
        const h = dt();
        h.allRequiredComplete ? j("Field saved. All required fields complete. Ready to submit.") : j(`Field saved. ${h.remainingRequired} required field${h.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (p) {
      window.toastManager && window.toastManager.error(p.message), j(`Error saving field: ${p.message}`, "assertive");
    } finally {
      u.disabled = !1, u.innerHTML = "Insert";
    }
  }
  async function on(r) {
    const l = a.fieldState.get(r), u = document.getElementById("sig-type-input"), p = nt(r);
    if (p === "draw" || p === "upload" || p === "saved") {
      const m = a.signatureCanvases.get(r);
      if (!m) return !1;
      if (!it(r))
        throw new Error(l?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const v = m.canvas.toDataURL("image/png");
      return await st(r, { type: "drawn", dataUrl: v }, l?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const m = u?.value?.trim();
      if (!m)
        throw new Error(l?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return l.type === "initials" ? await Ie(r, m, null) : await st(r, { type: "typed", text: m }, m);
    }
  }
  async function Ie(r, l, u) {
    a.pendingSaves.add(r);
    const p = Date.now(), h = a.fieldState.get(r);
    try {
      const m = await fetch(`${n.apiBasePath}/field-values/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: r,
          value_text: l,
          value_bool: u
        })
      });
      if (!m.ok) {
        const S = await m.json();
        throw new Error(S.error?.message || "Failed to save field");
      }
      const v = a.fieldState.get(r);
      return v && (v.value = l ?? u, v.completed = !0, v.hasError = !1), await Ye(v), window.toastManager && window.toastManager.success("Field saved"), d.trackFieldSave(r, v?.type, !0, Date.now() - p), !0;
    } catch (m) {
      const v = a.fieldState.get(r);
      throw v && (v.hasError = !0, v.lastError = m.message), d.trackFieldSave(r, h?.type, !1, Date.now() - p, m.message), m;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function st(r, l, u) {
    a.pendingSaves.add(r);
    const p = Date.now(), h = l?.type || "typed";
    try {
      let m;
      if (h === "drawn") {
        const L = await g.uploadDrawnSignature(
          r,
          l.dataUrl
        );
        m = {
          field_instance_id: r,
          type: "drawn",
          value_text: u,
          object_key: L.objectKey,
          sha256: L.sha256,
          upload_token: L.uploadToken
        };
      } else
        m = await cn(r, u);
      const v = await fetch(`${n.apiBasePath}/field-values/signature/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m)
      });
      if (!v.ok) {
        const L = await v.json();
        throw new Error(L.error?.message || "Failed to save signature");
      }
      const S = a.fieldState.get(r);
      return S && (S.value = u, S.completed = !0, S.hasError = !1), await Ye(S, {
        signatureType: h,
        signatureDataUrl: l?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), d.trackSignatureAttach(r, h, !0, Date.now() - p), !0;
    } catch (m) {
      const v = a.fieldState.get(r);
      throw v && (v.hasError = !0, v.lastError = m.message), d.trackSignatureAttach(r, h, !1, Date.now() - p, m.message), m;
    } finally {
      a.pendingSaves.delete(r);
    }
  }
  async function cn(r, l) {
    const u = `${l}|${r}`, p = await ln(u), h = `tenant/bootstrap/org/bootstrap/agreements/${n.agreementId}/signatures/${n.recipientId}/${r}-${Date.now()}.txt`;
    return {
      field_instance_id: r,
      type: "typed",
      value_text: l,
      object_key: h,
      sha256: p
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function ln(r) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const l = new TextEncoder().encode(r), u = await window.crypto.subtle.digest("SHA-256", l);
      return Array.from(new Uint8Array(u)).map((p) => p.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function rt() {
    let r = 0;
    a.fieldState.forEach((S) => {
      S.required, S.completed && r++;
    });
    const l = a.fieldState.size, u = l > 0 ? r / l * 100 : 0;
    document.getElementById("completed-count").textContent = r, document.getElementById("total-count").textContent = l;
    const p = document.getElementById("progress-ring-circle"), h = 97.4, m = h - u / 100 * h;
    p.style.strokeDashoffset = m, document.getElementById("mobile-progress").style.width = `${u}%`;
    const v = l - r;
    document.getElementById("fields-status").textContent = v > 0 ? `${v} remaining` : "All complete";
  }
  function Le() {
    const r = document.getElementById("submit-btn"), l = document.getElementById("incomplete-warning"), u = document.getElementById("incomplete-message");
    let p = [], h = !1;
    a.fieldState.forEach((v, S) => {
      v.required && !v.completed && p.push(v), v.hasError && (h = !0);
    });
    const m = a.hasConsented && p.length === 0 && !h && a.pendingSaves.size === 0;
    r.disabled = !m, a.hasConsented ? h ? (l.classList.remove("hidden"), u.textContent = "Some fields failed to save. Please retry.") : p.length > 0 ? (l.classList.remove("hidden"), u.textContent = `Complete ${p.length} required field${p.length > 1 ? "s" : ""}`) : l.classList.add("hidden") : (l.classList.remove("hidden"), u.textContent = "Please accept the consent agreement");
  }
  function dn(r) {
    const l = a.fieldState.get(r), u = document.querySelector(`.field-list-item[data-field-id="${r}"]`);
    if (!(!u || !l)) {
      if (l.completed) {
        u.classList.add("completed"), u.classList.remove("error");
        const p = u.querySelector(".w-8");
        p.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), p.classList.add("bg-green-100", "text-green-600"), p.innerHTML = '<i class="iconoir-check"></i>';
      } else if (l.hasError) {
        u.classList.remove("completed"), u.classList.add("error");
        const p = u.querySelector(".w-8");
        p.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), p.classList.add("bg-red-100", "text-red-600"), p.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function un() {
    const r = Array.from(a.fieldState.values()).filter((l) => l.required);
    return r.sort((l, u) => {
      const p = Number(l.page || 0), h = Number(u.page || 0);
      if (p !== h) return p - h;
      const m = Number(l.tabIndex || 0), v = Number(u.tabIndex || 0);
      if (m > 0 && v > 0 && m !== v) return m - v;
      if (m > 0 != v > 0) return m > 0 ? -1 : 1;
      const S = Number(l.posY || 0), L = Number(u.posY || 0);
      if (S !== L) return S - L;
      const D = Number(l.posX || 0), k = Number(u.posX || 0);
      return D !== k ? D - k : String(l.id || "").localeCompare(String(u.id || ""));
    }), r;
  }
  function at(r) {
    a.guidedTargetFieldId = r, document.querySelectorAll(".field-list-item").forEach((l) => l.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((l) => l.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${r}"]`)?.classList.add("guided-next-target");
  }
  function pn(r) {
    const l = un(), u = l.filter((v) => !v.completed);
    if (u.length === 0) {
      d.track("guided_next_none_remaining", { fromFieldId: r });
      const v = document.getElementById("submit-btn");
      v?.scrollIntoView({ behavior: "smooth", block: "nearest" }), v?.focus(), j("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const p = l.findIndex((v) => String(v.id) === String(r));
    let h = null;
    if (p >= 0) {
      for (let v = p + 1; v < l.length; v++)
        if (!l[v].completed) {
          h = l[v];
          break;
        }
    }
    if (h || (h = u[0]), !h) return;
    d.track("guided_next_started", { fromFieldId: r, toFieldId: h.id });
    const m = Number(h.page || 1);
    m !== a.currentPage && Xe(m), Ze(h.id, { openEditor: !1 }), at(h.id), setTimeout(() => {
      at(h.id), et(h.id), d.track("guided_next_completed", { toFieldId: h.id, page: h.page }), j(`Next required field highlighted on page ${h.page}.`);
    }, 120);
  }
  function ot() {
    const r = document.getElementById("consent-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", ke(r.querySelector(".field-editor")), j("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function Ae() {
    const r = document.getElementById("consent-modal"), l = r.querySelector(".field-editor");
    Pe(l), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", j("Consent dialog closed.");
  }
  async function hn() {
    const r = document.getElementById("consent-accept-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const l = await fetch(`${n.apiBasePath}/consent/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!l.ok) {
        const u = await l.json();
        throw new Error(u.error?.message || "Failed to accept consent");
      }
      a.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), Ae(), Le(), lt(), d.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), j("Consent accepted. You can now complete the fields and submit.");
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message), j(`Error: ${l.message}`, "assertive");
    } finally {
      r.disabled = !1, r.innerHTML = "Accept & Continue";
    }
  }
  async function gn() {
    const r = document.getElementById("submit-btn");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const l = `submit-${n.recipientId}-${Date.now()}`, u = await fetch(`${n.apiBasePath}/submit/${n.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": l }
      });
      if (!u.ok) {
        const p = await u.json();
        throw new Error(p.error?.message || "Failed to submit");
      }
      d.trackSubmit(!0), window.location.href = `${n.signerBasePath}/${n.token}/complete`;
    } catch (l) {
      d.trackSubmit(!1, l.message), window.toastManager && window.toastManager.error(l.message), r.disabled = !1, r.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature';
    }
  }
  function mn() {
    const r = document.getElementById("decline-modal");
    r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", ke(r.querySelector(".field-editor")), j("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function ct() {
    const r = document.getElementById("decline-modal"), l = r.querySelector(".field-editor");
    Pe(l), r.classList.remove("active"), r.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", j("Decline dialog closed.");
  }
  async function fn() {
    const r = document.getElementById("decline-reason").value;
    try {
      const l = await fetch(`${n.apiBasePath}/decline/${n.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r })
      });
      if (!l.ok) {
        const u = await l.json();
        throw new Error(u.error?.message || "Failed to decline");
      }
      window.location.href = `${n.signerBasePath}/${n.token}/declined`;
    } catch (l) {
      window.toastManager && window.toastManager.error(l.message);
    }
  }
  function vn() {
    d.trackDegradedMode("viewer_load_failure"), d.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function wn() {
    try {
      const r = await fetch(`${n.apiBasePath}/assets/${n.token}`);
      if (!r.ok) throw new Error("Document unavailable");
      const u = (await r.json()).assets || {}, p = u.source_url || u.executed_url || u.certificate_url;
      if (p)
        window.open(p, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (r) {
      window.toastManager && window.toastManager.error(r.message || "Unable to download document");
    }
  }
  const Y = {
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
            <div class="debug-value" id="debug-session-id">${d.sessionId}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Consent</div>
            <div class="debug-value" id="debug-consent">${a.hasConsented ? "✓ Accepted" : "✗ Pending"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Fields</div>
            <div class="debug-value" id="debug-fields">0/${a.fieldState?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Memory Mode</div>
            <div class="debug-value" id="debug-memory">${a.isLowMemory ? "⚠ Low Memory" : "Normal"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Cached Pages</div>
            <div class="debug-value" id="debug-cached">${a.renderedPages?.size || 0}</div>
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
      const r = this.panel.querySelector(".debug-toggle"), l = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (r.textContent = "+", l.style.display = "none") : (r.textContent = "−", l.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const r = a.fieldState;
      let l = 0;
      r?.forEach((p) => {
        p.completed && l++;
      }), document.getElementById("debug-consent").textContent = a.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${a.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${l}/${r?.size || 0}`, document.getElementById("debug-cached").textContent = a.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = a.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${a.isLowMemory ? "warning" : ""}`;
      const u = d.metrics.errorsEncountered;
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
            currentPage: a.currentPage,
            zoomLevel: a.zoomLevel,
            hasConsented: a.hasConsented,
            activeFieldId: a.activeFieldId,
            isLowMemory: a.isLowMemory,
            cachedPages: a.renderedPages?.size || 0
          },
          fields: Array.from(a.fieldState?.entries() || []).map(([r, l]) => ({
            id: r,
            type: l.type,
            completed: l.completed,
            hasError: l.hasError
          })),
          telemetry: d.getSessionSummary(),
          errors: d.metrics.errorsEncountered
        }),
        getEvents: () => d.events,
        forceError: (r) => {
          d.track("debug_forced_error", { message: r }), console.error("[E-Sign Debug] Forced error:", r);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), de();
        },
        setLowMemory: (r) => {
          a.isLowMemory = r, be(), console.log(`[E-Sign Debug] Low memory mode: ${r}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", n.flowMode), console.log("Agreement ID:", n.agreementId), console.log("Token:", n.token), console.log("Session ID:", d.sessionId), console.log("Fields:", a.fieldState?.size || 0), console.log("Low Memory:", a.isLowMemory), console.groupEnd();
    },
    /**
     * Copy session info to clipboard
     */
    async copySessionInfo() {
      const r = JSON.stringify(window.esignDebug.getState(), null, 2);
      try {
        await navigator.clipboard.writeText(r), alert("Session info copied to clipboard");
      } catch {
        console.log("Session Info:", r), alert("Check console for session info");
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
      a.renderedPages?.clear(), console.log("[E-Sign Debug] Page cache cleared"), this.updatePanel();
    },
    /**
     * Show telemetry events
     */
    showTelemetry() {
      console.table(d.events), console.log("Session Summary:", d.getSessionSummary());
    }
  };
  function j(r, l = "polite") {
    const u = l === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    u && (u.textContent = "", requestAnimationFrame(() => {
      u.textContent = r;
    }));
  }
  function ke(r) {
    const u = r.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), p = u[0], h = u[u.length - 1];
    r.dataset.previousFocus || (r.dataset.previousFocus = document.activeElement?.id || "");
    function m(v) {
      v.key === "Tab" && (v.shiftKey ? document.activeElement === p && (v.preventDefault(), h?.focus()) : document.activeElement === h && (v.preventDefault(), p?.focus()));
    }
    r.addEventListener("keydown", m), r._focusTrapHandler = m, requestAnimationFrame(() => {
      p?.focus();
    });
  }
  function Pe(r) {
    r._focusTrapHandler && (r.removeEventListener("keydown", r._focusTrapHandler), delete r._focusTrapHandler);
    const l = r.dataset.previousFocus;
    if (l) {
      const u = document.getElementById(l);
      requestAnimationFrame(() => {
        u?.focus();
      }), delete r.dataset.previousFocus;
    }
  }
  function lt() {
    const r = dt(), l = document.getElementById("submit-status");
    l && (r.allRequiredComplete && a.hasConsented ? l.textContent = "All required fields complete. You can now submit." : a.hasConsented ? l.textContent = `Complete ${r.remainingRequired} more required field${r.remainingRequired > 1 ? "s" : ""} to enable submission.` : l.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function dt() {
    let r = 0, l = 0, u = 0;
    return a.fieldState.forEach((p) => {
      p.required && l++, p.completed && r++, p.required && !p.completed && u++;
    }), {
      completed: r,
      required: l,
      remainingRequired: u,
      total: a.fieldState.size,
      allRequiredComplete: u === 0
    };
  }
  function yn(r, l = 1) {
    const u = Array.from(a.fieldState.keys()), p = u.indexOf(r);
    if (p === -1) return null;
    const h = p + l;
    return h >= 0 && h < u.length ? u[h] : null;
  }
  document.addEventListener("keydown", function(r) {
    if (r.key === "Escape" && (Ee(), Ae(), ct()), r.target instanceof HTMLElement && r.target.classList.contains("sig-editor-tab")) {
      const l = Array.from(document.querySelectorAll(".sig-editor-tab")), u = l.indexOf(r.target);
      if (u !== -1) {
        let p = u;
        if (r.key === "ArrowRight" && (p = (u + 1) % l.length), r.key === "ArrowLeft" && (p = (u - 1 + l.length) % l.length), r.key === "Home" && (p = 0), r.key === "End" && (p = l.length - 1), p !== u) {
          r.preventDefault();
          const h = l[p], m = h.getAttribute("data-tab") || "draw", v = h.getAttribute("data-field-id");
          v && ge(m, v), h.focus();
          return;
        }
      }
    }
    if (r.target instanceof HTMLElement && r.target.classList.contains("field-list-item")) {
      if (r.key === "ArrowDown" || r.key === "ArrowUp") {
        r.preventDefault();
        const l = r.target.dataset.fieldId, u = r.key === "ArrowDown" ? 1 : -1, p = yn(l, u);
        p && document.querySelector(`.field-list-item[data-field-id="${p}"]`)?.focus();
      }
      if (r.key === "Enter" || r.key === " ") {
        r.preventDefault();
        const l = r.target.dataset.fieldId;
        l && he(l);
      }
    }
    r.key === "Tab" && !r.target.closest(".field-editor-overlay") && !r.target.closest("#consent-modal") && r.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(r) {
    r.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
class Mt {
  constructor(e) {
    this.config = e;
  }
  init() {
    ni(this.config);
  }
  destroy() {
  }
}
function os(s) {
  const e = new Mt(s);
  return M(() => e.init()), e;
}
function ii() {
  const s = document.getElementById("esign-signer-review-config");
  if (!s) return null;
  try {
    const e = JSON.parse(s.textContent || "{}");
    return e && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
typeof document < "u" && M(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const e = ii();
  if (!e) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const t = new Mt(e);
  t.init(), window.esignSignerReviewController = t;
});
class Dt {
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
function cs(s = {}) {
  const e = new Dt(s);
  return M(() => e.init()), e;
}
function ls(s = {}) {
  const e = new Dt(s);
  M(() => e.init()), typeof window < "u" && (window.esignErrorController = e);
}
class Ne {
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
    e && e.addEventListener("click", () => this.loadPdf()), t && t.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), i && i.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (o) => {
      this.isLoaded && (o.key === "ArrowLeft" || o.key === "PageUp" ? this.goToPage(this.currentPage - 1) : (o.key === "ArrowRight" || o.key === "PageDown") && this.goToPage(this.currentPage + 1));
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
        const n = await this.pdfDoc.getPage(e), i = n.getViewport({ scale: this.scale }), o = this.elements.canvas, d = o.getContext("2d");
        if (!d)
          throw new Error("Failed to get canvas context");
        o.height = i.height, o.width = i.width, await n.render({
          canvasContext: d,
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
    const { prevBtn: e, nextBtn: t, currentPageEl: n, pagination: i } = this.elements, o = this.pdfDoc?.numPages || 1;
    i && i.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), e && (e.disabled = this.currentPage <= 1), t && (t.disabled = this.currentPage >= o);
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
    e && w(e), t && x(t), n && w(n), i && w(i);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: e, spinner: t, error: n, viewer: i } = this.elements;
    e && w(e), t && w(t), n && w(n), i && x(i);
  }
  /**
   * Show error state
   */
  showError(e) {
    const { loading: t, spinner: n, error: i, errorMessage: o, viewer: d } = this.elements;
    t && w(t), n && w(n), i && x(i), d && w(d), o && (o.textContent = e);
  }
}
function ds(s) {
  const e = new Ne(s);
  return e.init(), e;
}
function us(s) {
  const e = {
    documentId: s.documentId,
    pdfUrl: s.pdfUrl,
    pageCount: s.pageCount || 1
  }, t = new Ne(e);
  M(() => t.init()), typeof window < "u" && (window.esignDocumentDetailController = t);
}
typeof document < "u" && M(() => {
  const s = document.querySelector('[data-esign-page="document-detail"]');
  if (s instanceof HTMLElement) {
    const e = s.dataset.documentId || "", t = s.dataset.pdfUrl || "", n = parseInt(s.dataset.pageCount || "1", 10);
    e && t && new Ne({
      documentId: e,
      pdfUrl: t,
      pageCount: n
    }).init();
  }
});
class ps {
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
class hs {
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
function si(s) {
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
function ri(s) {
  if (!Array.isArray(s)) return;
  const e = s.map((t) => {
    if (!t) return null;
    const n = t.value ?? "", i = t.label ?? String(n);
    return { label: String(i), value: String(n) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function ai(s, e) {
  if (!Array.isArray(s) || s.length === 0) return;
  const t = s.map((o) => String(o || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const n = Array.from(new Set(t)), i = e ? String(e).trim().toLowerCase() : "";
  return i && n.includes(i) ? [i, ...n.filter((o) => o !== i)] : n;
}
function gs(s) {
  return s.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function ms(s) {
  return s ? s.map((e) => ({
    name: e.name,
    label: e.label,
    type: si(e.type),
    options: ri(e.options),
    operators: ai(e.operators, e.default_operator)
  })) : [];
}
function fs(s) {
  if (!s) return "-";
  try {
    const e = new Date(s);
    return e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(s);
  }
}
function vs(s) {
  if (!s || Number(s) <= 0) return "-";
  const e = parseInt(String(s), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function ws(s, e, t) {
  t && t.success(`${s} completed successfully`);
}
function ys(s, e, t) {
  if (t) {
    const n = e?.fields ? Object.entries(e.fields).map(([d, a]) => `${d}: ${a}`).join("; ") : "", i = e?.textCode ? `${e.textCode}: ` : "", o = e?.message || `${s} failed`;
    t.error(n ? `${i}${o}: ${n}` : `${i}${o}`);
  }
}
function bs(s, e) {
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
function xs(s, e) {
  const t = s.refresh.bind(s);
  return async function() {
    await t();
    const n = s.getSchema();
    n?.actions && e(n.actions);
  };
}
const Ss = {
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
}, we = "application/vnd.google-apps.document", qe = "application/vnd.google-apps.spreadsheet", Ve = "application/vnd.google-apps.presentation", $t = "application/vnd.google-apps.folder", Ge = "application/pdf", oi = [we, Ge], Bt = "esign.google.account_id";
function ci(s) {
  return s.mimeType === we;
}
function li(s) {
  return s.mimeType === Ge;
}
function ie(s) {
  return s.mimeType === $t;
}
function di(s) {
  return oi.includes(s.mimeType);
}
function Cs(s) {
  return s.mimeType === we || s.mimeType === qe || s.mimeType === Ve;
}
function ui(s) {
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
function Es(s) {
  return s.map(ui);
}
function _t(s) {
  return {
    [we]: "Google Doc",
    [qe]: "Google Sheet",
    [Ve]: "Google Slides",
    [$t]: "Folder",
    [Ge]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[s] || "File";
}
function pi(s) {
  return ie(s) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : ci(s) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : li(s) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : s.mimeType === qe ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : s.mimeType === Ve ? {
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
function hi(s) {
  return !s || s <= 0 ? "-" : s < 1024 ? `${s} B` : s < 1024 * 1024 ? `${(s / 1024).toFixed(1)} KB` : `${(s / (1024 * 1024)).toFixed(2)} MB`;
}
function gi(s) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}
function Is(s, e) {
  const t = s.get("account_id");
  if (t)
    return ve(t);
  if (e)
    return ve(e);
  const n = localStorage.getItem(Bt);
  return n ? ve(n) : "";
}
function ve(s) {
  if (!s) return "";
  const e = s.trim();
  return e === "null" || e === "undefined" || e === "0" ? "" : e;
}
function Ls(s) {
  const e = ve(s);
  e && localStorage.setItem(Bt, e);
}
function As(s, e) {
  if (!e) return s;
  try {
    const t = new URL(s, window.location.origin);
    return t.searchParams.set("account_id", e), t.pathname + t.search;
  } catch {
    const t = s.includes("?") ? "&" : "?";
    return `${s}${t}account_id=${encodeURIComponent(e)}`;
  }
}
function ks(s, e, t) {
  const n = new URL(e, window.location.origin);
  return n.pathname.startsWith(s) || (n.pathname = `${s}${e}`), t && n.searchParams.set("account_id", t), n;
}
function Ps(s) {
  const e = new URL(window.location.href), t = e.searchParams.get("account_id");
  s && t !== s ? (e.searchParams.set("account_id", s), window.history.replaceState({}, "", e.toString())) : !s && t && (e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString()));
}
function se(s) {
  const e = document.createElement("div");
  return e.textContent = s, e.innerHTML;
}
function mi(s) {
  const e = pi(s);
  return `
    <div class="w-10 h-10 ${e.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${e.icon} ${e.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function Ts(s, e) {
  if (s.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const t = [
    { id: "", name: "My Drive" },
    ...s
  ];
  return t.map((n, i) => {
    const o = i === t.length - 1, d = i > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return o ? `${d}<span class="text-gray-900 font-medium">${se(n.name)}</span>` : `${d}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${se(n.name)}</button>`;
  }).join("");
}
function fi(s, e = {}) {
  const { selectable: t = !0, showSize: n = !0, showDate: i = !0 } = e, o = mi(s), d = ie(s), a = di(s), f = d ? "cursor-pointer hover:bg-gray-50" : a ? "cursor-pointer hover:bg-blue-50" : "opacity-60", g = d ? `data-folder-id="${s.id}" data-folder-name="${se(s.name)}"` : a && t ? `data-file-id="${s.id}" data-file-name="${se(s.name)}" data-mime-type="${s.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${f} file-item"
      ${g}
      role="listitem"
      ${a ? 'tabindex="0"' : ""}
    >
      ${o}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${se(s.name)}</p>
        <p class="text-xs text-gray-500">
          ${_t(s.mimeType)}
          ${n && s.size > 0 ? ` &middot; ${hi(s.size)}` : ""}
          ${i && s.modifiedTime ? ` &middot; ${gi(s.modifiedTime)}` : ""}
        </p>
      </div>
      ${a && t ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function Ms(s, e = {}) {
  const { emptyMessage: t = "No files found", selectable: n = !0 } = e;
  return s.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${se(t)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...s].sort((o, d) => ie(o) && !ie(d) ? -1 : !ie(o) && ie(d) ? 1 : o.name.localeCompare(d.name)).map((o) => fi(o, { selectable: n })).join("")}
    </div>
  `;
}
function Ds(s) {
  return {
    id: s.id,
    name: s.name,
    mimeType: s.mimeType,
    typeName: _t(s.mimeType)
  };
}
export {
  Mn as AGREEMENT_STATUS_BADGES,
  Ue as AgreementFormController,
  Ne as DocumentDetailPreviewController,
  ze as DocumentFormController,
  Ln as ESignAPIClient,
  An as ESignAPIError,
  Bt as GOOGLE_ACCOUNT_STORAGE_KEY,
  Et as GoogleCallbackController,
  Lt as GoogleDrivePickerController,
  It as GoogleIntegrationController,
  oi as IMPORTABLE_MIME_TYPES,
  Pt as IntegrationConflictsController,
  At as IntegrationHealthController,
  kt as IntegrationMappingsController,
  Tt as IntegrationSyncRunsController,
  Oe as LandingPageController,
  we as MIME_GOOGLE_DOC,
  $t as MIME_GOOGLE_FOLDER,
  qe as MIME_GOOGLE_SHEET,
  Ve as MIME_GOOGLE_SLIDES,
  Ge as MIME_PDF,
  ps as PanelPaginationBehavior,
  hs as PanelSearchBehavior,
  Ss as STANDARD_GRID_SELECTORS,
  Ct as SignerCompletePageController,
  Dt as SignerErrorPageController,
  Mt as SignerReviewController,
  H as announce,
  As as applyAccountIdToPath,
  Rn as applyDetailFormatters,
  as as bootstrapAgreementForm,
  us as bootstrapDocumentDetailPreview,
  ss as bootstrapDocumentForm,
  qi as bootstrapGoogleCallback,
  Ji as bootstrapGoogleDrivePicker,
  Gi as bootstrapGoogleIntegration,
  es as bootstrapIntegrationConflicts,
  Ki as bootstrapIntegrationHealth,
  Xi as bootstrapIntegrationMappings,
  ns as bootstrapIntegrationSyncRuns,
  Oi as bootstrapLandingPage,
  Ui as bootstrapSignerCompletePage,
  ls as bootstrapSignerErrorPage,
  ni as bootstrapSignerReview,
  ks as buildScopedApiUrl,
  ki as byId,
  Tn as capitalize,
  Pn as createESignClient,
  $n as createElement,
  xs as createSchemaActionCachingRefresh,
  Ds as createSelectedFile,
  Li as createStatusBadgeElement,
  Ri as createTimeoutController,
  fs as dateTimeCellRenderer,
  re as debounce,
  ys as defaultActionErrorHandler,
  ws as defaultActionSuccessHandler,
  Ti as delegate,
  se as escapeHtml,
  vs as fileSizeCellRenderer,
  bi as formatDate,
  X as formatDateTime,
  gi as formatDriveDate,
  hi as formatDriveFileSize,
  fe as formatFileSize,
  yi as formatPageCount,
  Ci as formatRecipientCount,
  Si as formatRelativeTime,
  _n as formatSizeElements,
  xi as formatTime,
  Fn as formatTimestampElements,
  xt as getAgreementStatusBadge,
  wi as getESignClient,
  pi as getFileIconConfig,
  _t as getFileTypeName,
  Bn as getPageConfig,
  w as hide,
  rs as initAgreementForm,
  Hn as initDetailFormatters,
  ds as initDocumentDetailPreview,
  is as initDocumentForm,
  Ni as initGoogleCallback,
  Wi as initGoogleDrivePicker,
  Vi as initGoogleIntegration,
  Zi as initIntegrationConflicts,
  Yi as initIntegrationHealth,
  Qi as initIntegrationMappings,
  ts as initIntegrationSyncRuns,
  ji as initLandingPage,
  zi as initSignerCompletePage,
  cs as initSignerErrorPage,
  os as initSignerReview,
  ie as isFolder,
  ci as isGoogleDoc,
  Cs as isGoogleWorkspaceFile,
  di as isImportable,
  li as isPDF,
  ve as normalizeAccountId,
  ui as normalizeDriveFile,
  Es as normalizeDriveFiles,
  ai as normalizeFilterOperators,
  ri as normalizeFilterOptions,
  si as normalizeFilterType,
  Pi as on,
  M as onReady,
  Bi as poll,
  ms as prepareFilterFields,
  gs as prepareGridColumns,
  c as qs,
  W as qsa,
  Ts as renderBreadcrumb,
  mi as renderFileIcon,
  fi as renderFileItem,
  Ms as renderFileList,
  Dn as renderStatusBadge,
  Is as resolveAccountId,
  _i as retry,
  Ls as saveAccountId,
  kn as setESignClient,
  Di as setLoading,
  bs as setupRefreshButton,
  x as show,
  St as sleep,
  Ei as snakeToTitle,
  Ps as syncAccountIdToUrl,
  Fi as throttle,
  Mi as toggle,
  Ii as truncate,
  ce as updateDataText,
  $i as updateDataTexts,
  Ai as updateStatusBadge,
  Hi as withTimeout
};
//# sourceMappingURL=index.js.map
